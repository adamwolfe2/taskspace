# Workspace-Specific Theming Implementation Plan

## Executive Summary
Transform Taskspace into a multi-workspace platform where each workspace has its own brand identity (colors, logo) that dynamically themes the entire UI. Default is monochrome (black/white/gray), but workspace branding applies custom colors to buttons, gradients, highlights, skeleton loaders, hover states, and all interactive elements.

## Current State Analysis

### ✅ What's Already Built
- **Database Schema**: Workspace branding fields exist (`logo_url`, `primary_color`, `secondary_color`, `accent_color`, `favicon_url`)
- **Color Extraction**: AI-powered logo color extraction implemented (`/lib/utils/color-extractor.ts`)
- **CSS Variable System**: Dynamic theming infrastructure in place (`globals.css`)
- **Brand Context**: `BrandThemeContext` exists for runtime theme application
- **Branding UI**: Settings page for logo upload and color selection
- **API Endpoints**: PATCH `/api/workspaces/[id]` accepts branding updates

### ❌ Critical Gaps
1. **BrandThemeContext reads from Organization, NOT Workspace** - ignores workspace colors
2. **Hardcoded status colors** - `/lib/utils/status-colors.ts` uses fixed Tailwind classes
3. **No workspace-specific CSS injection** - theme doesn't persist across navigation
4. **Inconsistent color sources** - some components read workspace, some read organization
5. **Missing secondary/accent mapping** - only primary color mapped to CSS variables
6. **Hardcoded UI elements** - role badges, plan colors, focus outlines use fixed colors

---

## Multi-Phase Implementation Plan

### **PHASE 1: Foundation - Workspace Theme Provider** ⏰ 2-3 hours
**Goal**: Connect BrandThemeContext to workspace colors and ensure proper lifecycle management.

#### Tasks:
1. ✅ **Refactor BrandThemeContext**
   - Read colors from `currentWorkspace` instead of `currentOrganization`
   - Fall back to organization colors if workspace has none
   - Update on workspace switch (listen to `useWorkspaceStore` changes)
   - File: `/lib/contexts/brand-theme-context.tsx`

2. ✅ **Add workspace color to Zustand store**
   - Ensure `currentWorkspace` includes branding fields
   - File: `/lib/hooks/use-workspace.ts`

3. ✅ **Update CSS variable injection**
   - Map all 3 colors (primary, secondary, accent) to CSS variables
   - Apply to `:root` dynamically
   - Generate hover/focus variants (+10% lightness)
   - File: `/lib/contexts/brand-theme-context.tsx`

#### Success Criteria:
- Switching workspaces changes theme colors instantly
- CSS variables update in real-time
- Default monochrome when no workspace colors set

---

### **PHASE 2: Dynamic Color System** ⏰ 3-4 hours
**Goal**: Replace all hardcoded colors with workspace-aware dynamic colors.

#### Tasks:
1. ✅ **Create dynamic status color generator**
   - File: `/lib/utils/dynamic-status-colors.ts`
   - Function: `getStatusColors(baseColor: string, type: string)`
   - Generates text/bg/border classes using workspace primary color
   - Returns Tailwind-compatible class strings

2. ✅ **Refactor status-colors.ts**
   - Add `useBrandTheme()` hook integration
   - Make color functions reactive to workspace theme
   - Maintain fallback to default colors

3. ✅ **Create color utility functions**
   - `lighten(color, percent)` - for hover states
   - `darken(color, percent)` - for active states
   - `adjustOpacity(color, alpha)` - for backgrounds
   - `generateGradient(color1, color2)` - for cards/buttons
   - File: `/lib/utils/color-helpers.ts`

#### Success Criteria:
- All status badges use workspace primary color
- No hardcoded color classes remain in status components
- Colors automatically adjust on workspace switch

---

### **PHASE 3: Component Theming** ⏰ 4-5 hours
**Goal**: Update all UI components to use workspace theme colors.

#### Components to Update:
1. **Buttons** (`/components/ui/button.tsx`)
   - Primary variant: Use `--brand-primary`
   - Hover: Use `--brand-primary-hover`
   - Focus ring: Use `--brand-primary`

2. **Cards** (`/components/ui/card.tsx`)
   - Border highlight: Use `--brand-accent`
   - Hover state: Use `--brand-primary` with opacity

3. **Badges** (`/components/ui/badge.tsx`)
   - Default variant: Use `--brand-primary`
   - Outline variant: Use `--brand-primary` border

4. **Progress/Skeleton**
   - Skeleton shimmer: Use `--brand-primary` with low opacity
   - Progress bar: Use `--brand-primary` fill

5. **Focus States** (`globals.css`)
   - Replace hardcoded `#dc2626` red with `var(--brand-primary)`
   - Update `:focus-visible` styles

6. **Workspace-specific components**:
   - Workspace switcher badges
   - Organization switcher colors
   - Role badges (owner/admin/member)
   - Plan tier badges

#### Success Criteria:
- All interactive elements use workspace colors
- Hover/focus states consistent across platform
- Skeleton loaders match brand color

---

### **PHASE 4: Advanced Color Features** ⏰ 2-3 hours
**Goal**: Implement intelligent color generation and contrast handling.

#### Tasks:
1. ✅ **Enhance color extraction**
   - Extract 5-color palette (primary, secondary, accent, light, dark)
   - Analyze logo for brand personality (vibrant vs muted)
   - Auto-generate complementary colors
   - File: `/lib/utils/color-extractor.ts`

2. ✅ **Add contrast checking**
   - Ensure text readability (WCAG AA compliance)
   - Auto-adjust text color (white/black) based on background
   - Function: `getContrastTextColor(bgColor)`

3. ✅ **Create gradient generator**
   - Generate 3-stop gradients from brand colors
   - Used for hero sections, cards, CTAs
   - Function: `generateBrandGradient()`

#### Success Criteria:
- Logo upload automatically generates full color palette
- All text meets WCAG contrast requirements
- Gradients look professional and brand-aligned

---

### **PHASE 5: Workspace Setup UX** ⏰ 3-4 hours
**Goal**: Make workspace branding setup seamless and delightful.

#### Tasks:
1. ✅ **Enhance onboarding wizard**
   - Step 2: Logo upload with live preview
   - Auto-extract colors from logo
   - Show theme preview across components
   - File: `/components/onboarding/onboarding-wizard.tsx`

2. ✅ **Improve branding settings page**
   - Real-time theme preview
   - Color picker with presets
   - "Extract from logo" button
   - Reset to default option
   - File: `/components/settings/branding-settings.tsx`

3. ✅ **Add preset brand themes**
   - Professional presets (e.g., "Modern Blue", "Startup Orange", "Corporate Navy")
   - One-click apply
   - Preview before applying

#### Success Criteria:
- New users can set up branding in under 60 seconds
- Logo upload instantly themes the entire platform
- Preview shows real components with applied theme

---

### **PHASE 6: Performance & Polish** ⏰ 2 hours
**Goal**: Optimize theme switching and add finishing touches.

#### Tasks:
1. ✅ **Optimize CSS variable injection**
   - Debounce theme updates
   - Cache color calculations
   - Minimize re-renders

2. ✅ **Add theme transition animations**
   - Smooth color transitions (300ms ease-out)
   - Prevent flash of unstyled content

3. ✅ **Update globals.css**
   - Remove all hardcoded color values
   - Replace with CSS variables
   - Add dark mode variants for workspace colors

4. ✅ **Testing**
   - Test with extreme colors (very light, very dark)
   - Test contrast in all components
   - Test workspace switching performance

#### Success Criteria:
- Theme switches feel smooth and instant
- No color flashing or layout shifts
- Works with any color input

---

### **PHASE 7: Documentation & Migration** ⏰ 1-2 hours
**Goal**: Document the system and migrate existing workspaces.

#### Tasks:
1. ✅ **Create developer documentation**
   - How to use workspace theme in components
   - CSS variable reference
   - Color utility function guide

2. ✅ **Migration script**
   - Copy organization colors to default workspace
   - Generate missing colors for existing workspaces
   - File: `/scripts/migrate-workspace-colors.ts`

3. ✅ **Update API documentation**
   - Document branding endpoints
   - Color format validation rules

#### Success Criteria:
- Developers can easily theme new components
- Existing users see no disruption
- All workspaces have valid color schemes

---

## Implementation Timeline

| Phase | Time | Dependencies | Risk |
|-------|------|--------------|------|
| 1. Foundation | 2-3h | None | Low |
| 2. Dynamic Colors | 3-4h | Phase 1 | Low |
| 3. Component Theming | 4-5h | Phase 2 | Medium |
| 4. Advanced Features | 2-3h | Phase 2 | Low |
| 5. Setup UX | 3-4h | Phase 1, 2 | Low |
| 6. Performance | 2h | All above | Medium |
| 7. Documentation | 1-2h | All above | Low |
| **TOTAL** | **17-23h** | - | - |

---

## Technical Architecture

### CSS Variable Structure
```css
:root {
  /* Brand Colors - Workspace Specific */
  --brand-primary: <workspace.primaryColor>;
  --brand-primary-rgb: <r, g, b>;
  --brand-primary-hover: <lightened 10%>;
  --brand-primary-active: <darkened 10%>;

  --brand-secondary: <workspace.secondaryColor>;
  --brand-secondary-rgb: <r, g, b>;

  --brand-accent: <workspace.accentColor>;
  --brand-accent-rgb: <r, g, b>;

  /* Derived Colors */
  --brand-text: <auto-contrast white/black>;
  --brand-background: <primary with 5% opacity>;

  /* Gradients */
  --brand-gradient: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));

  /* Mapped to Tailwind System */
  --primary: var(--brand-primary-rgb);
  --ring: var(--brand-primary-rgb);
  --chart-1: var(--brand-primary-rgb);
}
```

### Component Usage Pattern
```tsx
// Before (hardcoded)
<div className="bg-blue-500 hover:bg-blue-600">

// After (workspace themed)
<div className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
// or
<div className="bg-primary hover:bg-primary/90">
```

### Theme Context Usage
```tsx
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function MyComponent() {
  const { colors, isLoading } = useBrandTheme()

  return (
    <div style={{
      backgroundColor: colors.primary,
      color: colors.text
    }}>
      Themed content
    </div>
  )
}
```

---

## File Changes Summary

### New Files
- `/lib/utils/dynamic-status-colors.ts` - Dynamic color generation
- `/lib/utils/color-helpers.ts` - Color manipulation utilities
- `/scripts/migrate-workspace-colors.ts` - Migration script

### Modified Files
- `/lib/contexts/brand-theme-context.tsx` - Read from workspace
- `/lib/utils/status-colors.ts` - Make dynamic
- `/lib/utils/color-extractor.ts` - Enhanced extraction
- `/styles/globals.css` - Remove hardcoded colors
- `/components/ui/button.tsx` - Use brand variables
- `/components/ui/card.tsx` - Use brand variables
- `/components/ui/badge.tsx` - Use brand variables
- `/components/settings/branding-settings.tsx` - Improved UX
- `/components/onboarding/onboarding-wizard.tsx` - Enhanced step 2
- `/components/workspace/workspace-switcher.tsx` - Theme-aware
- `/components/workspace/organization-switcher.tsx` - Theme-aware

---

## Testing Checklist

- [ ] Upload logo and verify auto-color extraction
- [ ] Switch between workspaces and verify theme changes
- [ ] Test with very light colors (ensure text contrast)
- [ ] Test with very dark colors (ensure text contrast)
- [ ] Test with grayscale logo (should use default monochrome)
- [ ] Verify skeleton loaders use brand color
- [ ] Verify hover states use brand color
- [ ] Verify focus rings use brand color
- [ ] Test role badges with different themes
- [ ] Test status indicators with different themes
- [ ] Test charts with brand colors
- [ ] Test onboarding wizard theme preview
- [ ] Test branding settings real-time preview
- [ ] Verify default workspace uses monochrome
- [ ] Test workspace without colors (should be monochrome)

---

## Success Metrics

1. **Setup Time**: New workspace branding setup < 60 seconds
2. **Theme Switch Speed**: < 100ms to apply new theme
3. **Color Extraction Accuracy**: 90%+ users satisfied with auto-extracted colors
4. **Accessibility**: 100% WCAG AA compliance for text contrast
5. **User Satisfaction**: "Looks like my brand" feedback > 85%

---

## Next Steps After Implementation

1. **A/B Test**: Monochrome vs auto-branded onboarding flow
2. **Analytics**: Track which color extraction features users prefer
3. **Advanced Features**: Dark mode variants of workspace colors
4. **Enterprise**: White-label subdomains with workspace branding
5. **Marketing**: Showcase workspace theming as key differentiator
