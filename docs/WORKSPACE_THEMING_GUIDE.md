# Workspace Theming Developer Guide

## Overview

The Workspace Theming System allows each workspace to have its own brand identity with custom colors that propagate throughout the entire platform. This guide covers how to use workspace theming in your components.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Using the BrandThemeContext](#using-the-brandthemecontext)
3. [CSS Variables Reference](#css-variables-reference)
4. [Component Theming Patterns](#component-theming-patterns)
5. [Color Utilities](#color-utilities)
6. [Advanced Features](#advanced-features)
7. [Best Practices](#best-practices)
8. [Testing](#testing)

---

## Quick Start

### Basic Usage

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function MyComponent() {
  const { colors, isLoading } = useBrandTheme()

  if (isLoading) {
    return <div>Loading theme...</div>
  }

  return (
    <div style={{ backgroundColor: colors.primary }}>
      This div uses the workspace primary color
    </div>
  )
}
```

### Using CSS Variables

```typescript
// Preferred method - uses CSS variables that automatically update
function MyButton() {
  return (
    <button className="bg-primary text-primary-foreground hover:bg-primary/90">
      Themed Button
    </button>
  )
}
```

---

## Using the BrandThemeContext

### Available Properties

```typescript
interface BrandThemeContextValue {
  colors: ExtractedColors          // Current workspace colors
  isLoading: boolean                // Whether colors are being loaded
  updateBrandColors: (colors: Partial<ExtractedColors>) => void  // Update colors
  resetToDefault: () => void        // Reset to default monochrome
}

interface ExtractedColors {
  primary: string                   // Main brand color (hex)
  secondary: string                 // Secondary color (hex)
  accent: string                    // Accent color (hex)
  text: string                      // Recommended text color (hex)
  background: string                // Background tint (hex)
  personality?: BrandPersonality    // AI-detected personality
}

interface BrandPersonality {
  vibrancy: 'vibrant' | 'balanced' | 'muted'
  temperature: 'warm' | 'neutral' | 'cool'
  formality: 'professional' | 'casual' | 'creative'
}
```

### Examples

#### 1. Basic Component with Theme

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function DashboardHeader() {
  const { colors } = useBrandTheme()

  return (
    <header style={{ borderBottom: `2px solid ${colors.primary}` }}>
      <h1 className="text-slate-900">Dashboard</h1>
    </header>
  )
}
```

#### 2. Conditional Styling Based on Personality

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function BrandedCard({ children }) {
  const { colors } = useBrandTheme()
  const personality = colors.personality

  const borderRadius = personality?.formality === 'creative' ? '1.5rem' : '0.5rem'
  const shadow = personality?.vibrancy === 'vibrant'
    ? '0 4px 12px rgba(0,0,0,0.15)'
    : '0 2px 8px rgba(0,0,0,0.08)'

  return (
    <div
      className="p-6"
      style={{
        borderRadius,
        boxShadow: shadow,
        borderLeft: `4px solid ${colors.primary}`
      }}
    >
      {children}
    </div>
  )
}
```

#### 3. Dynamic Gradients

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { generateBrandGradient } from '@/lib/utils/color-extractor'

function HeroSection() {
  const { colors } = useBrandTheme()
  const gradient = generateBrandGradient(colors)

  return (
    <section style={{ background: gradient }} className="p-12 text-white">
      <h1>Welcome to Your Workspace</h1>
    </section>
  )
}
```

---

## CSS Variables Reference

### Workspace Brand Variables

```css
/* Primary Color */
--brand-primary          /* #3b82f6 (example) */
--brand-primary-rgb      /* 59 130 246 */
--brand-primary-hover    /* 10% lighter */
--brand-primary-active   /* 10% darker */

/* Secondary Color */
--brand-secondary        /* #60a5fa (example) */
--brand-secondary-rgb    /* 96 165 250 */
--brand-secondary-hover  /* 10% lighter */

/* Accent Color */
--brand-accent           /* #8b5cf6 (example) */
--brand-accent-rgb       /* 139 92 246 */
--brand-accent-hover     /* 10% lighter */

/* Gradient */
--brand-gradient         /* linear-gradient(135deg, primary, secondary) */
```

### Tailwind Integration

The workspace colors are automatically mapped to Tailwind's theme system:

```css
--primary               /* Same as --brand-primary-rgb */
--ring                  /* Focus rings use primary color */
--accent                /* Same as --brand-secondary-rgb */
--chart-1, --chart-2    /* Chart colors use brand palette */
```

### Usage Examples

```html
<!-- Using Tailwind classes -->
<button class="bg-primary text-primary-foreground">Primary Button</button>
<div class="border-primary/20 hover:border-primary/40">Themed Border</div>

<!-- Using CSS variables directly -->
<div style="background: var(--brand-gradient)">Gradient Background</div>
<div style="color: var(--brand-primary)">Primary Text</div>

<!-- Using arbitrary values -->
<div class="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
  Custom Themed Element
</div>
```

---

## Component Theming Patterns

### 1. Status Colors with Workspace Theme

```typescript
import { getRockStatusColorsThemed } from '@/lib/utils/status-colors'
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function RockStatusBadge({ status }: { status: RockStatus }) {
  const { colors } = useBrandTheme()
  const statusColors = getRockStatusColorsThemed(status, colors.primary)

  return (
    <span className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} px-2 py-1 rounded`}>
      {status}
    </span>
  )
}
```

### 2. Skeleton Loaders

```typescript
import { Skeleton } from '@/components/ui/skeleton'

// Skeleton automatically uses workspace theme
function LoadingCard() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
```

### 3. Progress Bars

```typescript
import { Progress } from '@/components/ui/progress'

// Progress automatically uses workspace theme
function TaskProgress({ value }: { value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>Progress</span>
        <span>{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  )
}
```

### 4. Buttons and Badges

```typescript
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function ThemedActions() {
  return (
    <div className="flex gap-2">
      {/* Primary button uses workspace theme */}
      <Button variant="default">Primary Action</Button>

      {/* Outline button uses workspace theme */}
      <Button variant="outline">Secondary Action</Button>

      {/* Badge uses workspace theme */}
      <Badge variant="default">On Track</Badge>
    </div>
  )
}
```

---

## Color Utilities

### Available Functions

```typescript
import {
  lighten,
  darken,
  adjustOpacity,
  getContrastTextColor,
  generateColorVariants,
  generateBrandGradient,
  analyzeColorQuality,
  extractColorsFromImage,
  generateColorPresets,
} from '@/lib/utils/color-extractor'
```

### Examples

#### Lighten/Darken Colors

```typescript
import { lighten, darken } from '@/lib/utils/color-helpers'

const hoverColor = lighten('#3b82f6', 10)      // 10% lighter
const activeColor = darken('#3b82f6', 10)      // 10% darker
```

#### Opacity Adjustment

```typescript
import { adjustOpacity } from '@/lib/utils/color-helpers'

const transparentBg = adjustOpacity('#3b82f6', 0.1)  // 10% opacity
// Result: rgba(59, 130, 246, 0.1)
```

#### Contrast-Safe Text Color

```typescript
import { getContrastTextColor } from '@/lib/utils/color-helpers'

const bgColor = '#3b82f6'
const textColor = getContrastTextColor(bgColor)  // Returns '#ffffff' or '#1e293b'
```

#### Generate Color Variants

```typescript
import { generateColorVariants } from '@/lib/utils/color-helpers'

const variants = generateColorVariants('#3b82f6')
// Returns: {
//   base: '#3b82f6',
//   light: lighter version,
//   lighter: even lighter,
//   lightest: very light,
//   dark: darker version,
//   darker: even darker,
//   darkest: very dark,
//   hover: hover state,
//   active: active state,
//   disabled: disabled state,
//   text: contrast text color
// }
```

#### Brand Gradients

```typescript
import { generateBrandGradient } from '@/lib/utils/color-extractor'

const gradient1 = generateBrandGradient(colors)           // Default 135deg
const gradient2 = generateBrandGradient(colors, 180)      // Top to bottom
const gradient3 = generateBrandGradient(colors, 90)       // Left to right
```

#### Extract Colors from Logo

```typescript
import { extractColorsFromImage } from '@/lib/utils/color-extractor'

const handleLogoUpload = async (logoUrl: string) => {
  const extracted = await extractColorsFromImage(logoUrl)

  console.log(extracted.primary)      // Main brand color
  console.log(extracted.personality)  // AI-detected personality
}
```

---

## Advanced Features

### 1. Real-Time Theme Preview

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { useState } from 'react'

function ThemePreview() {
  const { colors, updateBrandColors } = useBrandTheme()
  const [previewColor, setPreviewColor] = useState(colors.primary)

  const handleColorChange = (newColor: string) => {
    setPreviewColor(newColor)
    // Debounced update to avoid performance issues
    updateBrandColors({ primary: newColor })
  }

  return (
    <div>
      <input
        type="color"
        value={previewColor}
        onChange={(e) => handleColorChange(e.target.value)}
      />
      <div
        className="preview-box"
        style={{ backgroundColor: previewColor }}
      >
        Preview
      </div>
    </div>
  )
}
```

### 2. Quality Validation

```typescript
import { analyzeColorQuality } from '@/lib/utils/color-extractor'

function ColorQualityCheck({ colors }: { colors: ExtractedColors }) {
  const quality = analyzeColorQuality(colors)

  return (
    <div>
      <div>Overall Quality: {quality.overall}</div>
      {quality.issues.length > 0 && (
        <ul>
          {quality.issues.map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
      )}
      {quality.suggestions.length > 0 && (
        <ul>
          {quality.suggestions.map((suggestion, i) => (
            <li key={i}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

### 3. Preset Themes

```typescript
import { generateColorPresets } from '@/lib/utils/color-extractor'
import { hexToHsl } from '@/lib/utils/color-extractor'

function PresetSelector({ baseColor }: { baseColor: string }) {
  const hsl = hexToHsl(baseColor)
  const presets = generateColorPresets(hsl)

  return (
    <div className="grid grid-cols-4 gap-3">
      <PresetOption colors={presets.original} label="Original" />
      <PresetOption colors={presets.vibrant} label="Vibrant" />
      <PresetOption colors={presets.muted} label="Muted" />
      <PresetOption colors={presets.professional} label="Professional" />
    </div>
  )
}
```

---

## Best Practices

### ✅ DO

1. **Use CSS Variables** for most theming needs
   ```typescript
   <div className="bg-primary text-primary-foreground">Good</div>
   ```

2. **Preserve Semantic Colors** for critical states
   ```typescript
   // Errors should always be red, warnings amber
   <div className="bg-red-50 text-red-700">Error</div>
   ```

3. **Check Contrast** for accessibility
   ```typescript
   import { meetsWCAG_AA } from '@/lib/utils/color-helpers'

   if (!meetsWCAG_AA(textColor, bgColor)) {
     // Adjust colors for better contrast
   }
   ```

4. **Cache Color Calculations**
   ```typescript
   const variants = useMemo(
     () => generateColorVariants(colors.primary),
     [colors.primary]
   )
   ```

### ❌ DON'T

1. **Don't Hardcode Brand Colors**
   ```typescript
   // Bad
   <div style={{ backgroundColor: '#3b82f6' }}>Bad</div>

   // Good
   <div className="bg-primary">Good</div>
   ```

2. **Don't Use Workspace Colors for Destructive Actions**
   ```typescript
   // Bad - delete button with workspace color
   <Button variant="default">Delete</Button>

   // Good - use semantic destructive variant
   <Button variant="destructive">Delete</Button>
   ```

3. **Don't Bypass the Theme Context**
   ```typescript
   // Bad
   const color = workspace.primaryColor

   // Good
   const { colors } = useBrandTheme()
   const color = colors.primary
   ```

---

## Testing

### Testing Components with Workspace Theme

```typescript
import { render } from '@testing-library/react'
import { BrandThemeProvider } from '@/lib/contexts/brand-theme-context'

function renderWithTheme(component: React.ReactElement) {
  return render(
    <BrandThemeProvider>
      {component}
    </BrandThemeProvider>
  )
}

test('component uses workspace theme', () => {
  const { container } = renderWithTheme(<MyComponent />)
  // Test theme application
})
```

### Testing with Different Colors

```typescript
import { extractColorsFromImage, analyzeColorQuality } from '@/lib/utils/color-extractor'

describe('Extreme Color Testing', () => {
  test('very light colors', async () => {
    const colors = {
      primary: '#f0f0f0',
      secondary: '#f5f5f5',
      accent: '#fafafa',
      text: '#1e293b',
      background: '#ffffff',
    }

    const quality = analyzeColorQuality(colors)
    expect(quality.overall).not.toBe('needs-improvement')
  })

  test('very dark colors', async () => {
    const colors = {
      primary: '#1a1a1a',
      secondary: '#2a2a2a',
      accent: '#3a3a3a',
      text: '#ffffff',
      background: '#0a0a0a',
    }

    const quality = analyzeColorQuality(colors)
    expect(quality.overall).not.toBe('needs-improvement')
  })
})
```

---

## Migration Checklist

If you're updating an existing component to use workspace theming:

- [ ] Replace hardcoded color values with CSS variables
- [ ] Use `useBrandTheme()` hook where dynamic colors are needed
- [ ] Ensure semantic colors (red, amber, green) are preserved
- [ ] Test with multiple workspace themes
- [ ] Verify WCAG AA contrast compliance
- [ ] Add loading states if needed
- [ ] Update component documentation

---

## Support

For questions or issues:
- Check the [Workspace Theming Summary](/WORKSPACE_THEMING_SUMMARY.md)
- Review [Implementation Progress](/WORKSPACE_THEMING_PROGRESS.md)
- See working examples in `/components/ui/`
