# CSS Variables Reference

Complete reference for all workspace theming CSS variables available in the platform.

---

## Workspace Brand Variables

### Primary Color System

```css
--brand-primary: #3b82f6;
```
- **Type**: Hex color
- **Usage**: Main workspace brand color
- **Example**: Button backgrounds, primary actions, brand accents

```css
--brand-primary-rgb: 59 130 246;
```
- **Type**: RGB values (space-separated)
- **Usage**: For opacity adjustments in Tailwind
- **Example**: `bg-[rgb(var(--brand-primary-rgb)/0.1)]`

```css
--brand-primary-hover: #5b9ff8;
```
- **Type**: Hex color
- **Usage**: Hover state for primary elements (10% lighter)
- **Example**: Button hover states

```css
--brand-primary-active: #2563eb;
```
- **Type**: Hex color
- **Usage**: Active/pressed state (10% darker)
- **Example**: Button active states

```css
--brand-primary-foreground: #ffffff;
```
- **Type**: Hex color
- **Usage**: Text color on primary background
- **Auto-calculated**: Based on primary color contrast
- **Example**: Button text color

---

### Secondary Color System

```css
--brand-secondary: #60a5fa;
```
- **Type**: Hex color
- **Usage**: Secondary brand color
- **Example**: Secondary buttons, badges, accents

```css
--brand-secondary-rgb: 96 165 250;
```
- **Type**: RGB values (space-separated)
- **Usage**: For opacity adjustments
- **Example**: `bg-[rgb(var(--brand-secondary-rgb)/0.2)]`

```css
--brand-secondary-hover: #7bb6fb;
```
- **Type**: Hex color
- **Usage**: Hover state for secondary elements

---

### Accent Color System

```css
--brand-accent: #8b5cf6;
```
- **Type**: Hex color
- **Usage**: Accent brand color
- **Example**: Highlights, call-to-actions, special elements

```css
--brand-accent-rgb: 139 92 246;
```
- **Type**: RGB values (space-separated)
- **Usage**: For opacity adjustments

```css
--brand-accent-hover: #a475f7;
```
- **Type**: Hex color
- **Usage**: Hover state for accent elements

---

### Gradients

```css
--brand-gradient: linear-gradient(135deg, #3b82f6, #60a5fa);
```
- **Type**: CSS gradient
- **Usage**: Hero sections, cards, backgrounds
- **Auto-generated**: From primary → secondary colors
- **Example**: `background: var(--brand-gradient)`

---

### HSL Values (for CSS custom properties)

```css
--brand-primary-hsl: 217 91% 60%;
```
- **Type**: HSL values (space-separated)
- **Usage**: For HSL-based color manipulation
- **Example**: `hsl(var(--brand-primary-hsl) / 0.5)`

```css
--brand-secondary-hsl: 213 93% 68%;
```
- **Type**: HSL values (space-separated)

```css
--brand-accent-hsl: 258 90% 66%;
```
- **Type**: HSL values (space-separated)

```css
--brand-background-hsl: 214 100% 97%;
```
- **Type**: HSL values (space-separated)
- **Usage**: Light background tint of brand color

---

## Tailwind Theme Integration

These Tailwind theme variables are automatically updated with workspace colors:

### Primary/Ring (Focus States)

```css
--primary: 59 130 246;
```
- **Maps to**: `--brand-primary-rgb`
- **Tailwind classes**: `bg-primary`, `text-primary`, `border-primary`

```css
--ring: 59 130 246;
```
- **Maps to**: `--brand-primary-rgb`
- **Tailwind classes**: `ring-primary`, `focus:ring-primary`

---

### Accent

```css
--accent: 96 165 250;
```
- **Maps to**: `--brand-secondary-rgb`
- **Tailwind classes**: `bg-accent`, `text-accent`, `hover:bg-accent`

---

### Sidebar (if using shadcn/ui sidebar)

```css
--sidebar-primary: 59 130 246;
```
- **Maps to**: `--brand-primary-rgb`

```css
--sidebar-ring: 59 130 246;
```
- **Maps to**: `--brand-primary-rgb`

```css
--sidebar-accent: 96 165 250;
```
- **Maps to**: `--brand-secondary-rgb`

---

### Charts

```css
--chart-1: 59 130 246;
```
- **Maps to**: `--brand-primary-rgb`
- **Usage**: Primary chart series

```css
--chart-2: 96 165 250;
```
- **Maps to**: `--brand-secondary-rgb`
- **Usage**: Secondary chart series

```css
--chart-5: 139 92 246;
```
- **Maps to**: `--brand-accent-rgb`
- **Usage**: Fifth chart series

---

## Usage Examples

### 1. Using Brand Colors in Tailwind

```html
<!-- Primary color -->
<button class="bg-primary text-primary-foreground">
  Primary Button
</button>

<!-- With opacity -->
<div class="bg-primary/10 border border-primary/20">
  Light background with border
</div>

<!-- Hover states -->
<div class="hover:bg-primary/5 hover:border-primary/30">
  Subtle hover effect
</div>
```

### 2. Using CSS Variables Directly

```html
<!-- Background gradient -->
<div style="background: var(--brand-gradient)">
  Gradient background
</div>

<!-- Custom opacity -->
<div style="background-color: rgb(var(--brand-primary-rgb) / 0.15)">
  15% opacity primary
</div>

<!-- Hover with CSS -->
<button style="
  background: var(--brand-primary);
  color: var(--brand-primary-foreground);
">
  <style>
    button:hover {
      background: var(--brand-primary-hover);
    }
  </style>
  Hover Button
</button>
```

### 3. Using Arbitrary Values in Tailwind

```html
<!-- Using brand variable with arbitrary value -->
<div class="bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]">
  Direct variable usage
</div>

<!-- Hover state with arbitrary value -->
<button class="
  bg-[var(--brand-primary)]
  hover:bg-[var(--brand-primary-hover)]
  active:bg-[var(--brand-primary-active)]
">
  Themed Button
</button>

<!-- Gradient with arbitrary value -->
<div class="bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-accent))]">
  Custom gradient
</div>
```

### 4. Dynamic Theming in JavaScript

```typescript
// Get CSS variable value
const primaryColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--brand-primary')
  .trim()

// Set CSS variable value
document.documentElement.style.setProperty(
  '--brand-primary',
  '#3b82f6'
)

// Use with styled-components or emotion
const StyledButton = styled.button`
  background: var(--brand-primary);
  color: var(--brand-primary-foreground);

  &:hover {
    background: var(--brand-primary-hover);
  }

  &:active {
    background: var(--brand-primary-active);
  }
`
```

---

## Color Fallback Chain

When a workspace doesn't have custom colors set:

1. **Workspace colors** → If set, use these (highest priority)
2. **Organization colors** → If workspace colors not set, use organization's
3. **Default monochrome** → Black/white/gray theme (fallback)

Example:
```typescript
// In BrandThemeContext
const primaryColor =
  currentWorkspace?.primaryColor ||      // 1. Workspace
  currentOrganization?.primaryColor ||   // 2. Organization
  '#3b82f6'                             // 3. Default blue
```

---

## Semantic Colors (Not Themed)

These colors maintain their semantic meaning across all workspaces:

### Destructive/Error

```css
--destructive: /* Red color */
```
- **Always red**: Regardless of workspace theme
- **Usage**: Error messages, delete buttons, critical warnings

### Success

- **Always green**: Status indicators for success
- **Usage**: Success messages, completed states

### Warning

- **Always amber/yellow**: Warning states
- **Usage**: Warning messages, at-risk statuses

### Info

- **Always blue**: Informational states
- **Usage**: Info messages, neutral states

---

## Accessibility Considerations

All workspace colors are automatically validated for WCAG AA compliance:

- **Text contrast**: Minimum 4.5:1 ratio
- **Auto-adjustment**: Poor contrast colors are refined
- **Foreground calculation**: Text color auto-selected (white or dark)

```typescript
import { meetsWCAG_AA, getContrastTextColor } from '@/lib/utils/color-helpers'

// Check if colors meet WCAG AA
if (meetsWCAG_AA(textColor, bgColor)) {
  // Safe to use
}

// Get appropriate text color for background
const textColor = getContrastTextColor(bgColor)
// Returns '#ffffff' or '#1e293b' based on luminance
```

---

## Browser Support

- **Modern browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **CSS Custom Properties**: 96%+ global support
- **Fallbacks**: Default colors applied if CSS variables not supported

---

## Performance Notes

1. **Caching**: Color calculations are cached to prevent redundant computation
2. **Debouncing**: CSS variable updates are debounced (50ms) for smooth performance
3. **Transitions**: Theme changes animate smoothly (300ms ease-out)
4. **Memoization**: Color variants are memoized to prevent re-renders

---

## Testing CSS Variables

### In Browser DevTools

```javascript
// Get current value
getComputedStyle(document.documentElement).getPropertyValue('--brand-primary')

// Set new value
document.documentElement.style.setProperty('--brand-primary', '#ff0000')

// Remove custom property
document.documentElement.style.removeProperty('--brand-primary')
```

### In Jest/Testing Library

```typescript
import { render } from '@testing-library/react'

test('applies brand color', () => {
  const { container } = render(<MyComponent />)

  // Check computed style
  const element = container.querySelector('.branded-element')
  const styles = window.getComputedStyle(element!)
  const bgColor = styles.getPropertyValue('background-color')

  expect(bgColor).toBe('rgb(59, 130, 246)') // Example
})
```

---

## Additional Resources

- [Workspace Theming Guide](/docs/WORKSPACE_THEMING_GUIDE.md)
- [Implementation Progress](/WORKSPACE_THEMING_PROGRESS.md)
- [Color Extraction Utilities](/lib/utils/color-extractor.ts)
- [Color Helper Functions](/lib/utils/color-helpers.ts)
