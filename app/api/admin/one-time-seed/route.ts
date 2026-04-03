/**
 * One-time seed endpoint:
 * 1. Set Sheenam's rocks (MedPro SEO Lead Gen, SEO/AEO Playbook) to 100% completed
 * 2. Backfill weekly_metric_entries for week ending 2026-04-03
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import crypto from "crypto"

function verifyAdmin(request: NextRequest): boolean {
  const secret = process.env.ADMIN_OPS_SECRET
  if (!secret) return false
  const provided = request.headers.get("x-admin-secret") || ""
  const trimmed = secret.trim()
  if (provided.length !== trimmed.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(trimmed))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const results: { step: string; status: string; rowCount?: number; error?: string }[] = []

  // 1. Update Sheenam's rocks to 100% completed
  try {
    const { rowCount } = await sql`
      UPDATE rocks
      SET progress = 100, status = 'completed', updated_at = NOW()
      WHERE (title ILIKE '%MedPro SEO Lead Gen%' OR title ILIKE '%SEO/AEO Playbook%')
        AND status != 'completed'
    `
    results.push({ step: "sheenam_rocks_completed", status: "ok", rowCount: rowCount ?? 0 })
  } catch (err) {
    results.push({ step: "sheenam_rocks_completed", status: "error", error: err instanceof Error ? err.message : String(err) })
  }

  // 2. Backfill weekly_metric_entries for week ending 2026-04-03
  try {
    const { rowCount } = await sql`
      INSERT INTO weekly_metric_entries (id, team_member_id, metric_id, week_ending, actual_value, created_at, updated_at)
      SELECT
        'wme_' || gen_random_uuid()::text,
        om.id,
        tmm.id,
        '2026-04-03'::date,
        CASE
          WHEN COALESCE(NULLIF(om.name,''), u.name) ILIKE 'Adam Wolfe%'   THEN 4
          WHEN COALESCE(NULLIF(om.name,''), u.name) ILIKE 'Sheenam%'       THEN 6
          WHEN COALESCE(NULLIF(om.name,''), u.name) ILIKE 'Ahmad Bukhari%' THEN 4
          WHEN COALESCE(NULLIF(om.name,''), u.name) ILIKE 'Ivan Naqvi%'    THEN 2
          WHEN COALESCE(NULLIF(om.name,''), u.name) ILIKE 'Saad Ahmad%'    THEN 399
          ELSE 0
        END,
        NOW(),
        NOW()
      FROM organization_members om
      JOIN team_member_metrics tmm ON tmm.team_member_id = om.id AND tmm.is_active = true
      LEFT JOIN users u ON u.id = om.user_id
      WHERE COALESCE(NULLIF(om.name,''), u.name) ILIKE ANY(ARRAY[
        'Adam Wolfe%','Sheenam%','Ahmad Bukhari%','Ivan Naqvi%','Saad Ahmad%'
      ])
      ON CONFLICT (team_member_id, week_ending)
      DO UPDATE SET actual_value = EXCLUDED.actual_value, updated_at = NOW()
    `
    results.push({ step: "backfill_weekly_metric_entries", status: "ok", rowCount: rowCount ?? 0 })
  } catch (err) {
    results.push({ step: "backfill_weekly_metric_entries", status: "error", error: err instanceof Error ? err.message : String(err) })
  }

  const allOk = results.every(r => r.status === "ok")
  return NextResponse.json({ success: allOk, results }, { status: allOk ? 200 : 207 })
}
