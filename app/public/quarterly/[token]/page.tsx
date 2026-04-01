"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import {
  Building2,
  Loader2,
  AlertTriangle,
  Target,
  CheckCircle2,
  TrendingUp,
  Users,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
} from "lucide-react"
import type { QuarterlyReport, QuarterlyMemberReport } from "@/lib/types"

interface PublicQuarterlyData {
  report: QuarterlyReport
  organization: { name: string; logoUrl?: string; accentColor?: string }
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function MemberCard({ member, accentColor }: { member: QuarterlyMemberReport; accentColor?: string }) {
  const [expanded, setExpanded] = useState(false)
  const accent = accentColor || "#64748b"

  const completionPct = member.stats.rockCompletionRate
  const submissionPct = member.stats.submissionRate

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 cursor-pointer flex items-center justify-between"
        style={{ background: `linear-gradient(to right, ${accent}08, transparent)` }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
          >
            {(member.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{member.name || "Unknown"}</h3>
              {member.role !== "member" && (
                <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full capitalize">{member.role}</span>
              )}
            </div>
            <p className="text-sm text-slate-500">{member.jobTitle || member.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500">
            <span title="EOD submission rate">
              <span className="font-semibold text-slate-800">{submissionPct}%</span> EOD rate
            </span>
            <span title="Rock completion rate">
              <span className="font-semibold text-slate-800">{completionPct}%</span> rocks
            </span>
            <span title="Tasks completed">
              <span className="font-semibold text-slate-800">{member.stats.totalTasksCompleted}</span> tasks
            </span>
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-6 pb-6 pt-4 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{member.stats.eodReportsSubmitted}</p>
              <p className="text-xs text-slate-500 mt-0.5">EOD Reports</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{member.stats.totalTasksCompleted}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tasks Done</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{member.stats.rocksCompleted}/{member.stats.rocksAssigned}</p>
              <p className="text-xs text-slate-500 mt-0.5">Rocks</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-slate-900">{member.stats.avgDailyTasks}</p>
              <p className="text-xs text-slate-500 mt-0.5">Avg Tasks/Day</p>
            </div>
          </div>

          {/* Rock progress */}
          {member.rocks.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <Target className="h-4 w-4" style={{ color: accent }} />
                Quarterly Rocks
              </h4>
              <div className="space-y-2">
                {member.rocks.map((rock, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm text-slate-800">{rock.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${rock.progress}%`, backgroundColor: accent }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{rock.progress}%</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                        rock.status === "completed" ? "bg-green-100 text-green-700" :
                        rock.status === "on-track" ? "bg-blue-100 text-blue-700" :
                        rock.status === "at-risk" ? "bg-amber-100 text-amber-700" :
                        rock.status === "blocked" ? "bg-red-100 text-red-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {rock.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {member.aiSummary && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-slate-700">AI Performance Summary</span>
              </div>
              <div className="p-4 space-y-4">
                {member.aiSummary.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Strengths</p>
                    <ul className="space-y-1">
                      {member.aiSummary.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {member.aiSummary.growthAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Growth Areas</p>
                    <ul className="space-y-1">
                      {member.aiSummary.growthAreas.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <TrendingUp className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {member.aiSummary.overallAssessment && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Overall Assessment</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{member.aiSummary.overallAssessment}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Escalations warning */}
          {member.stats.totalEscalations > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{member.stats.totalEscalations} escalation{member.stats.totalEscalations > 1 ? "s" : ""} flagged this quarter</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PublicQuarterlyReportPage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<PublicQuarterlyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/public/quarterly/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setData(json.data)
        } else {
          setError(json.error || "Report not found")
        }
      })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">Loading quarterly report...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Report Not Found</h1>
          <p className="text-slate-500">{error || "This report is not available."}</p>
        </div>
      </div>
    )
  }

  const { report, organization } = data
  const accent = organization.accentColor || "#64748b"
  const stats = report.data.teamStats

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {organization.logoUrl ? (
              <Image
                src={organization.logoUrl}
                alt={organization.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
                unoptimized
              />
            ) : (
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: accent }}>
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="font-semibold text-slate-900">{organization.name}</h1>
              <p className="text-sm text-slate-500">Quarterly Performance Report</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            <span>{report.quarter}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 space-y-8">
        {/* Hero */}
        <div className="text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-sm font-medium"
            style={{ backgroundColor: `${accent}15`, color: accent }}
          >
            <BarChart2 className="h-4 w-4" />
            {report.quarter} — {report.data.period.start} to {report.data.period.end}
          </div>
          <h2 className="text-3xl font-bold text-slate-900">{report.title}</h2>
          <p className="text-slate-500 mt-2">{report.data.summary}</p>
        </div>

        {/* Team stats */}
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
            <Users className="h-5 w-5 text-slate-400" />
            Team Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Team Members" value={stats.totalMembers} />
            <StatCard label="EOD Reports" value={stats.totalEodReports} sub={`${stats.avgSubmissionRate}% avg rate`} />
            <StatCard label="Tasks Completed" value={stats.totalTasksCompleted} />
            <StatCard
              label="Rocks Completed"
              value={`${stats.completedRocks}/${stats.totalRocks}`}
              sub={`${stats.rockCompletionRate}% completion rate`}
            />
          </div>
        </div>

        {/* Individual reports */}
        {report.data.members.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 mb-4">
              <Users className="h-5 w-5 text-slate-400" />
              Individual Performance ({report.data.members.length} members)
            </h3>
            <div className="space-y-3">
              {report.data.members.map((member, i) => (
                <MemberCard key={i} member={member} accentColor={accent} />
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
          <p className="text-center text-sm text-slate-400">
            Generated by Taskspace &bull; {new Date(report.data.generatedAt).toLocaleDateString()}
          </p>
        </div>
      </footer>
    </div>
  )
}
