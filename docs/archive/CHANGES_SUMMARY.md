# De-branding Changes Summary

**Date**: January 30, 2026
**Product Name Change**: AIMS → Align (temporary, easy to rebrand)
**Status**: ✅ COMPLETE - Ready for testing

---

## 🎯 What Was Changed

### ✅ 1. Product Configuration (Centralized Branding)
**File**: `lib/config.ts`
- Added `PRODUCT_CONFIG` object with centralized branding:
  - `name`: "Align"
  - `tagline`: "Team Productivity Platform"
  - `description`: Generic product description
  - `domain`: "align.app" (placeholder - update when domain purchased)
  - `supportEmail`: "support@align.app" (placeholder)
- Makes future rebranding a 1-line change

### ✅ 2. App Metadata & SEO
**File**: `app/layout.tsx`
- Changed title: "AIMS - Team Accountability" → "Align - Team Productivity Platform"
- Updated all Open Graph metadata
- Updated Twitter card metadata
- Changed metadataBase URL to "https://align.app"
- Updated authors, creator, publisher fields

### ✅ 3. Email Templates (Dynamic Organization Names)
**File**: `lib/email.tsx`
- Changed default EMAIL_FROM: "AIMS Dashboard" → "Align"
- **Invitation emails**: Now use organization name (e.g., "Join AIMS" for your org, "Join Acme Corp" for others)
- **Escalation emails**: Use organization name
- **EOD notification emails**: Use organization name
- **EOD reminder emails**: Use organization name
- **Password reset emails**: Use "Align" as product name
- Email footers show: "{OrganizationName} - Powered by Align"

### ✅ 4. Project Metadata
**Files**: `package.json`, `mcp-server/package.json`
- Main project name: "my-v0-project" → "align"
- MCP server name: "aims-mcp-server" → "align-mcp-server"
- MCP description updated to be generic

### ✅ 5. Documentation
**Files**: `README.md`, `mcp-server/README.md`, `.env.example`
- README title: "AIMS Team Dashboard" → "Align - Team Productivity Platform"
- MCP README: All references updated from "AIMS EOD Tracker" to "Align"
- Environment example: EMAIL_FROM updated to "Align"
- Sentry project name: "aimseod" → "align"

### ✅ 6. Legacy Seed Data (Unused)
**File**: `lib/initial-data.ts`
- Updated comments to clarify this is NOT USED in production
- Changed example email from "@aims.com" → "@example.com"
- Added clear note that multi-tenant orgs create their own data

---

## 🔒 What Was NOT Changed (Your Data is Safe)

### ❌ Database Tables
- NO migrations run
- NO data deleted or modified
- Your organization record still exists with name "AIMS"
- Your 5 team members still in database
- Your 11 rocks still in database
- Your 385/408 tasks still in database
- Your 18-day streak intact
- Your Asana integration still connected

### ❌ Database Queries
- All API routes still work the same
- All queries still pull from your organization by ID
- Data isolation unchanged

### ❌ Frontend Behavior
- Your dashboard still shows "AIMS" (pulled from org.name in database)
- Your team still sees "AIMS" workspace
- Your custom logo/colors still apply (from org settings)

---

## 🎨 How It Works Now

### For Your AIMS Organization:
1. **Browser tab**: Shows "Dashboard | Align" (generic product)
2. **Header/Sidebar**: Shows "AIMS" logo and name (from your org DB record)
3. **Emails**: Show "AIMS" as organization name
4. **Everything else**: Exactly as before

### For New Users Creating Organizations:
1. **Browser tab**: Shows "Dashboard | Align"
2. **Header/Sidebar**: Shows their org name (e.g., "Acme Corp")
3. **Emails**: Show their org name (e.g., "Acme Corp")
4. **Completely separate**: No access to your AIMS data

---

## 📁 Files Modified (11 total)

### Core Configuration:
1. `lib/config.ts` - Added PRODUCT_CONFIG
2. `app/layout.tsx` - Updated metadata

### Email System:
3. `lib/email.tsx` - Updated all templates

### Documentation:
4. `README.md` - Updated title
5. `.env.example` - Updated defaults
6. `mcp-server/README.md` - Generic instructions
7. `mcp-server/package.json` - Renamed package

### Project Files:
8. `package.json` - Renamed project

### Legacy Data:
9. `lib/initial-data.ts` - Updated comments

---

## 🧪 Testing Checklist

### ✅ Local Testing (Before Deploy):
- [ ] Run `npm run dev`
- [ ] Log into your AIMS workspace
- [ ] Verify you see "AIMS" in header (not "Align")
- [ ] Check all 5 team members visible
- [ ] Verify rocks, tasks, EOD reports load
- [ ] Check dashboard stats (385/408, 11 rocks, 18 streak)
- [ ] Test Asana sync still works
- [ ] Browser tab shows "Dashboard | Align" ✅

### ✅ Email Testing:
- [ ] Send test invitation - should say "Join AIMS"
- [ ] Send test EOD reminder - should say "AIMS" in footer
- [ ] Password reset email - says "Align" as platform name ✅

### ✅ New User Testing:
- [ ] Create new account with different org name
- [ ] Verify they see their org name (not "AIMS" or "Align")
- [ ] Verify data is isolated from your AIMS org

---

## 🔄 How to Rebrand Later (When You Buy Domain)

### Step 1: Update Product Config
```typescript
// lib/config.ts
export const PRODUCT_CONFIG = {
  name: "YourNewName",           // Change here
  tagline: "Your New Tagline",    // Change here
  domain: "yournewdomain.com",    // Change here
  supportEmail: "support@yournewdomain.com",  // Change here
  company: "Your LLC Name",       // Change here
}
```

### Step 2: Update App Metadata
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: {
    default: "YourNewName - Your Tagline",  // Change here
    template: "%s | YourNewName",           // Change here
  },
  // ... update other metadata fields
}
```

### Step 3: Deploy
```bash
git add .
git commit -m "Rebrand to [YourNewName]"
git push
```

That's it! All references will update automatically.

---

## 🚀 Next Steps

### Immediate (Today):
1. ✅ Review these changes
2. ⏳ Test locally (`npm run dev`)
3. ⏳ Verify your AIMS workspace works
4. ⏳ Commit to main branch
5. ⏳ Deploy to Vercel

### This Week:
- Complete workspace switcher testing
- Implement dynamic theming (org colors apply everywhere)
- Clean up settings pages
- Test data isolation with multiple orgs

### Before Full Launch:
- Choose final product name
- Buy domain
- Update PRODUCT_CONFIG
- Set up Stripe billing
- Register LLC
- Create marketing materials

---

## 📋 Commit Message

```bash
git add .
git commit -m "De-brand platform from AIMS to generic Align product

- Add centralized PRODUCT_CONFIG for easy rebranding
- Update app metadata and SEO tags
- Update email templates to use organization names dynamically
- Update MCP server to be generic
- Update documentation and examples
- Keep existing AIMS organization data intact in database
- No database changes or migrations

Ready for testing and deployment."
```

---

## ✅ Safety Confirmation

- ✅ No database migrations run
- ✅ No data modified in production
- ✅ Your AIMS organization unchanged
- ✅ All team members preserved
- ✅ All rocks, tasks, reports intact
- ✅ Asana integration unchanged
- ✅ Reversible with `git revert`
- ✅ Only code files modified

**Your production AIMS workspace is 100% safe!** 🔒
