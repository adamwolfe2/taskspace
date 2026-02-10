# De-branding Changes: AIMS → Align

**Date**: January 30, 2026
**Product Name**: Align (temporary, easily rebrandable)
**Status**: SAFE - No database changes, only code updates

---

## Files to Update

### 1. App Metadata (SEO, Browser Tabs)
**File**: `app/layout.tsx`
**Changes**:
- Change title from "AIMS - Team Accountability" → "Align - Team Productivity Platform"
- Update description to be generic
- Update Open Graph metadata
- Update Twitter card metadata
- Change metadataBase URL

**Your AIMS workspace impact**: NONE - You'll still see "AIMS" in your dashboard header

---

### 2. Config File (Centralized branding)
**File**: `lib/config.ts`
**Add**:
```typescript
export const PRODUCT_CONFIG = {
  name: "Align",
  tagline: "Team Productivity Platform",
  domain: "align.app", // Update when you buy domain
  supportEmail: "support@align.app", // Update later
  description: "Transform how your team tracks progress and achieves goals",
}
```

**Why**: Single source of truth for rebranding later

---

### 3. Email Templates
**Files**:
- `lib/email/templates/invitation.tsx`
- `lib/email/templates/welcome.tsx`
- `lib/email/templates/eod-reminder.tsx`
- Other email templates

**Changes**:
- "AIMS Dashboard" → Use `{{organizationName}}` variable
- Fallback to "Align" if org name unavailable
- Footer links updated

**Your AIMS workspace impact**: Your emails will say "AIMS" (from your org name)

---

### 4. Marketing Pages
**Files**: `app/(marketing)/*.tsx`
**Changes**:
- Verify no hardcoded "AIMS" references
- Use "Align" as product name
- Update meta descriptions
- Update headlines if needed

**Your AIMS workspace impact**: NONE - These are public pages

---

### 5. MCP Server
**Files**:
- `mcp-server/package.json`
- `mcp-server/README.md`
- `mcp-server/src/index.ts`

**Changes**:
- Rename from "aims-mcp-server" → "align-mcp-server"
- Update descriptions to be generic
- Keep functionality identical

**Your AIMS workspace impact**: You'll need to update Claude Desktop config (I'll provide new config)

---

### 6. Documentation
**Files**:
- `README.md`
- `.env.example`
- `package.json`

**Changes**:
- Update project name
- Remove AIMS-specific deployment instructions
- Generic setup instructions

---

### 7. Seed Data (Legacy)
**File**: `lib/initial-data.ts`
**Changes**:
- Update comments (this is unused legacy data)
- Update example email domains

**Your AIMS workspace impact**: NONE - This is legacy code not used

---

## What Will NOT Change

❌ Database - No migrations, no data updates
❌ Your organization record (name: "AIMS" stays in DB)
❌ Your team members
❌ Your rocks, tasks, EOD reports
❌ Your Asana integration
❌ Any workspace data

---

## What You'll See After Changes

### When You Log In:
1. Browser tab: "Dashboard | Align" (generic product name)
2. Header logo area: "AIMS" logo + name (from your org DB record)
3. Sidebar: "AIMS" branding (from your org settings)
4. Everything else: Exactly as it is now

### When New User Signs Up:
1. Browser tab: "Dashboard | Align"
2. Header: Their org name (e.g., "Acme Corp")
3. Sidebar: Their org branding
4. Completely separate from your data

---

## Rebranding Later (When You Choose Final Name)

**Easy 3-step process:**
1. Update `lib/config.ts` → Change `PRODUCT_CONFIG.name`
2. Update `app/layout.tsx` → Change metadata
3. Deploy → Done!

All references will use the config, so one change updates everywhere.

---

## Testing Plan

1. Start local dev server
2. Log into your AIMS workspace
3. Verify:
   - ✅ You see "AIMS" in header
   - ✅ All 5 team members visible
   - ✅ All rocks, tasks, EOD reports intact
   - ✅ Dashboard stats unchanged (385/408, 11 rocks, 18 streak)
   - ✅ Asana sync still working
4. Create test organization to verify new signups work
5. Check marketing pages show "Align"

---

## Rollback Plan (If Anything Goes Wrong)

```bash
# Rollback is instant
git revert HEAD
git push
```

Since we're only changing code (no DB), rollback is immediate and safe.

---

## Estimated Time

- Planning: ✅ Done
- Implementation: 45-60 minutes
- Testing: 15-20 minutes
- **Total**: ~90 minutes

---

## Ready to Proceed

✅ Safe (no database changes)
✅ Reversible (git revert)
✅ Your AIMS workspace untouched
✅ Easy to rebrand later
✅ Generic "Align" name for now

**Next**: I'll start making these changes and show you progress.
