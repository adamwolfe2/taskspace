# TaskSpace Design System Blueprint

> **Purpose**: Everything you need to fork the TaskSpace platform UI for a new project.
> Copy `globals.css`, install the deps, run `npx shadcn@latest init`, and you're running.

---

## 1. Stack & Dependencies

```bash
# Core
next@^16          # App Router, server components
react@19          # Concurrent features
typescript@^5     # Strict mode

# Styling
tailwindcss@^4    # v4 (CSS-first config, no tailwind.config.ts)
tw-animate-css    # Animation utilities
clsx@^2           # Conditional class names
tailwind-merge@^3 # Dedup conflicting Tailwind classes
class-variance-authority@^0.7  # Component variant patterns (cva)

# UI Components
@radix-ui/*       # Primitives (dialog, dropdown, popover, tabs, etc.)
cmdk@1            # Command palette (Cmd+K)
lucide-react@^0.454  # Icon library (1000+ icons)
next-themes@^0.4  # Light/dark mode toggle
recharts@2        # Charts and data viz

# Utilities
date-fns@4        # Date formatting/manipulation
zod@^3            # Schema validation
@sentry/nextjs@^10  # Error monitoring
```

### Install Command

```bash
npx create-next-app@latest my-app --typescript --tailwind --app --src-dir=false
cd my-app
npx shadcn@latest init    # Select "New York" style, slate base
npm i clsx tailwind-merge class-variance-authority
npm i lucide-react cmdk next-themes date-fns recharts zod
npm i @sentry/nextjs
```

---

## 2. Color System

The design is **monochromatic** (black/white/gray) with a single **sage green accent** (`#8b9a7f`). Semantic colors use Tailwind's built-in palette (red, amber, blue, green, purple) sparingly and contextually.

### CSS Variables (`:root`)

```css
:root {
  /* Core palette */
  --background: 255 255 255;        /* #ffffff - Pure white */
  --foreground: 0 0 0;              /* #000000 - Pure black */
  --card: 255 255 255;
  --card-foreground: 0 0 0;
  --popover: 255 255 255;
  --popover-foreground: 0 0 0;

  /* Primary - Black */
  --primary: 0 0 0;
  --primary-foreground: 255 255 255;

  /* Secondary - Light grays */
  --secondary: 245 245 245;         /* #f5f5f5 */
  --secondary-foreground: 107 114 128;

  /* Muted */
  --muted: 250 250 250;             /* #fafafa */
  --muted-foreground: 115 115 115;

  /* Accent - Sage green */
  --accent: 139 154 127;            /* #8b9a7f */
  --accent-foreground: 255 255 255;

  /* Semantic */
  --destructive: 0 0 0;
  --success: 139 154 127;           /* Sage green */
  --warning: 0 0 0;
  --border: 229 231 235;            /* Gray-200 */
  --input: 229 231 235;
  --ring: 0 0 0;

  /* Charts */
  --chart-1: 0 0 0;                 /* Black */
  --chart-2: 107 114 128;           /* Gray-500 */
  --chart-3: 156 163 175;           /* Gray-400 */
  --chart-4: 209 213 219;           /* Gray-300 */
  --chart-5: 139 154 127;           /* Sage green */

  /* Radius */
  --radius: 0.75rem;                /* 12px base, cards use rounded-2xl */
}
```

### How Semantic Colors Are Used

TaskSpace does NOT map statuses to the design system variables. Instead, it uses Tailwind's color palette directly in component code:

| Context | Color | Tailwind Class |
|---------|-------|----------------|
| Success / On-track | Green | `text-green-600`, `bg-green-50` |
| Warning / At-risk | Amber | `text-amber-600`, `bg-amber-50` |
| Error / Blocked | Red | `text-red-600`, `bg-red-50` |
| Info / Due | Blue | `text-blue-600`, `bg-blue-50` |
| AI / Insights | Purple | `text-purple-600`, `bg-purple-50` |
| Neutral | Slate | `text-slate-600`, `bg-slate-50` |
| Accent | Sage green | `#8b9a7f`, `rgb(139 154 127)` |

---

## 3. Typography

### Fonts

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "SF Mono", Monaco, "Cascadia Code", monospace;
```

Font features enabled: `"cv02", "cv03", "cv04", "cv11"` (Inter stylistic alternates).

### Heading Scale

| Element | Classes | Usage |
|---------|---------|-------|
| Page title | `text-xl sm:text-2xl font-bold text-slate-900` | Main page headings |
| Section title | `text-base font-semibold text-slate-900` | Card headers, section labels |
| Card subtitle | `text-sm font-medium text-slate-700` | Secondary headings |
| Body text | `text-sm text-slate-600` | Descriptions, content |
| Caption | `text-xs text-slate-500` | Timestamps, metadata |
| Tiny label | `text-[10px] font-medium` | Badge text, role indicators |

All headings use `tracking-tight font-semibold` and `text-wrap: balance` by default.

### Text Patterns

```tsx
// Page header
<h1 className="text-xl sm:text-2xl font-bold text-slate-900">Page Title</h1>
<p className="text-sm sm:text-base text-slate-500 mt-1">Subtitle description</p>

// Card header
<CardTitle className="text-base flex items-center gap-2">
  <Icon className="h-5 w-5 text-purple-600" />
  Section Name
</CardTitle>

// Stat value
<p className="text-2xl font-bold text-slate-900">42</p>
<span className="text-xs font-medium text-slate-500">Label</span>
```

---

## 4. Spacing & Layout

### App Shell Layout

```
+--------------------------------------------------+
| Header (h-14 sm:h-16, sticky, bg-white/95)       |
+----------+---------------------------------------+
| Sidebar  | Main Content                          |
| (w-64)   | (p-4 md:p-6, max-w-6xl mx-auto)     |
| hidden   |                                       |
| on mobile|                                       |
+----------+---------------------------------------+
| Mobile Nav (fixed bottom, md:hidden)              |
+--------------------------------------------------+
```

```tsx
// Shell structure
<div className="min-h-screen bg-background">
  <Header onMenuClick={() => setSidebarOpen(true)} />
  <div className="flex">
    <aside className="hidden md:block w-64 border-r border-border min-h-[calc(100vh-4rem)] bg-card">
      <SidebarNav />
    </aside>
    <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 min-w-0">
      <div className="max-w-6xl mx-auto">
        {children}
      </div>
    </main>
  </div>
  <MobileNav />
</div>
```

### Spacing Pattern

- Page sections: `space-y-4 sm:space-y-6`
- Card padding: `p-5` (stat cards), `p-4 sm:p-6` (content cards)
- Card gaps: `gap-4 sm:gap-6`
- Icon + text: `gap-2`
- Stacked items: `space-y-2` or `space-y-3`

### Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | < 640px | Mobile layout, single column |
| `sm:` | 640px | Larger text, wider padding |
| `md:` | 768px | Sidebar visible, desktop padding |
| `lg:` | 1024px | Two-column grids |

### Grid Patterns

```tsx
// Stats row: 2 cols mobile, 4 cols desktop
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

// Content grid: 1 col mobile, 2 cols desktop (conditional)
<div className={`grid grid-cols-1 ${hasBoth ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>

// Bento grid for cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## 5. Component Library

### shadcn/ui Components (61 files)

All in `components/ui/`. Installed via `npx shadcn@latest add <name>`.

**Layout**: `card`, `separator`, `aspect-ratio`, `resizable`, `scroll-area`, `sidebar`
**Form**: `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `toggle`, `toggle-group`, `slider`, `calendar`, `form`, `label`, `field`, `input-otp`, `input-group`
**Data Display**: `table`, `badge`, `progress`, `skeleton`, `avatar`, `chart`, `empty`
**Feedback**: `alert`, `toast`, `toaster`, `sonner`, `spinner`
**Overlay**: `dialog`, `drawer`, `dropdown-menu`, `context-menu`, `popover`, `hover-card`, `sheet`, `alert-dialog`, `tooltip`, `command`
**Navigation**: `breadcrumb`, `menubar`, `navigation-menu`, `pagination`, `tabs`
**Misc**: `accordion`, `carousel`, `collapsible`, `button-group`, `page-header`, `kbd`, `item`, `file-tray`, `integration-logo`
**Hooks**: `use-mobile`, `use-toast`

### Utility Function (`lib/utils.ts`)

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Used everywhere for conditional + merged class names:
```tsx
<div className={cn(
  "flex items-center gap-3 p-3 rounded-lg border",
  isActive && "bg-blue-50 border-blue-200",
  className
)}>
```

---

## 6. Shadow System

Four tiers, all using layered shadows for depth:

```css
/* Level 1: Resting card */
.shadow-card {
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.03),
    0 1px 2px rgb(0 0 0 / 0.04),
    0 2px 4px rgb(0 0 0 / 0.04);
}

/* Level 2: Hovered card */
.shadow-card-hover {
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.03),
    0 4px 8px rgb(0 0 0 / 0.06),
    0 8px 16px rgb(0 0 0 / 0.04);
}

/* Level 3: Elevated (modals, dropdowns) */
.shadow-elevated {
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.02),
    0 1px 2px rgb(0 0 0 / 0.03),
    0 4px 8px rgb(0 0 0 / 0.04),
    0 12px 24px rgb(0 0 0 / 0.06);
}

/* Level 4: Glow (active buttons) */
.shadow-glow-primary {
  box-shadow:
    0 0 0 1px rgb(220 38 38 / 0.1),
    0 2px 4px rgb(220 38 38 / 0.1),
    0 4px 12px rgb(220 38 38 / 0.15);
}
```

---

## 7. Animation System

### Keyframe Animations

| Class | Effect | Duration | Easing |
|-------|--------|----------|--------|
| `animate-fade-in-up` | Fade in + slide up 10px | 0.4s | ease-out |
| `animate-fade-in-scale` | Fade in + scale from 0.96 | 0.3s | ease-out |
| `animate-slide-in-right` | Slide in from right 20px | 0.4s | ease-out |
| `animate-slide-up` | Slide up from 100% | 0.4s | ease-out |
| `animate-scale-in` | Scale from 0.9 | 0.2s | ease-out |
| `animate-pulse-soft` | Gentle opacity pulse | 2s | infinite |
| `animate-bounce-subtle` | Tiny bounce (3px) | 0.5s | ease-in-out |
| `animate-glow-pulse` | Box-shadow pulse | 2s | infinite |
| `animate-check` | SVG checkmark draw | 0.3s | ease-out |

### Stagger Pattern

Apply to list items for cascading entrance:

```tsx
{items.map((item, index) => (
  <div
    className="animate-fade-in-up opacity-0"
    style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
  >
    {item}
  </div>
))}
```

Predefined stagger classes: `.stagger-1` through `.stagger-8` (0.05s increments).

### Hover Effects

```css
.hover-lift:hover { transform: translateY(-2px); }
.hover-scale:hover { transform: scale(1.02); }
.press-effect:active { transform: scale(0.98); }
.card-interactive:hover { shadow-card-hover + translateY(-2px); }
```

### Transitions

```css
.transition-smooth { @apply transition-all duration-200 ease-out; }
.transition-premium { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
```

---

## 8. Card Patterns

### Stat Card

```tsx
<div className="stat-card">
  <div className="flex items-center gap-2 text-slate-500 mb-1">
    <Icon className="h-4 w-4" />
    <span className="text-xs font-medium">Label</span>
  </div>
  <p className="text-2xl font-bold text-slate-900">42</p>
</div>
```

### Section Card

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base flex items-center gap-2">
      <Icon className="h-5 w-5 text-purple-600" />
      Section Name
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    {/* Content */}
  </CardContent>
</Card>
```

### Premium Card Variants

```css
.card-premium    /* Rounded-2xl, subtle shadow, hover lift */
.card-accent     /* Top black border accent line */
.card-glass      /* Backdrop blur, 80% white opacity */
.card-accent-left         /* Left border 4px black */
.card-accent-left-success /* Left border sage green */
```

### ErrorBoundary Wrapping Pattern

Every dashboard section is wrapped:

```tsx
{featureEnabled && (
  <ErrorBoundary title="Section unavailable">
    <SectionComponent {...props} />
  </ErrorBoundary>
)}
```

---

## 9. Status & Badge Patterns

### Role Badges

```tsx
// Owner
<Badge className="bg-amber-100 text-amber-700 border-0 font-medium text-[10px] px-1.5 py-0.5">Owner</Badge>

// Admin
<Badge className="bg-blue-100 text-blue-700 border-0 font-medium text-[10px] px-1.5 py-0.5">Admin</Badge>
```

### Status Badges

```tsx
// Priority badges
<Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">critical</Badge>
<Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">high</Badge>
<Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">medium</Badge>
<Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300">low</Badge>
```

### Status Colors Pattern

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Critical/Blocked | `bg-red-50` | `text-red-600` | `border-red-200` |
| Warning/At-risk | `bg-amber-50` | `text-amber-600` | `border-amber-200` |
| Info/In-progress | `bg-blue-50` | `text-blue-600` | `border-blue-200` |
| Success/On-track | `bg-green-50` | `text-green-600` | `border-green-200` |
| AI/Insight | `bg-purple-50` | `text-purple-600` | `border-purple-200` |
| Neutral | `bg-slate-50` | `text-slate-600` | `border-slate-200` |

---

## 10. Navigation Patterns

### Sidebar Nav Item

```tsx
<button
  className={cn(
    "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
    isActive
      ? "bg-slate-100 text-slate-900"
      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
  )}
>
  <Icon className={cn("h-[18px] w-[18px]", isActive ? "text-slate-900" : "text-slate-400")} />
  <span>{label}</span>
</button>
```

Active state includes a left accent bar via CSS:
```css
.nav-item-active::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 3px; height: 20px;
  background: #000000;
  border-radius: 0 2px 2px 0;
}
```

### Header

```tsx
<header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
  <div className="flex items-center justify-between h-14 sm:h-16 px-2 sm:px-4 md:px-6">
    {/* Left: Hamburger (mobile) + Org/Workspace switchers */}
    {/* Right: Search + Notifications + User avatar dropdown */}
  </div>
</header>
```

### Mobile Bottom Nav

Fixed bottom bar with 4 primary items + "More" sheet:

```tsx
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
  <div className="flex items-center justify-around h-16">
    {/* 4 icons: Home, Tasks, Calendar, Rocks */}
    {/* "More" button opens Sheet with remaining nav items */}
  </div>
</nav>
```

---

## 11. Icon Pattern

All icons from `lucide-react`. Standard sizes:

| Context | Size | Example |
|---------|------|---------|
| Nav items | `h-[18px] w-[18px]` | Sidebar icons |
| Card headers | `h-5 w-5` | Section title icons |
| Inline with text | `h-4 w-4` | Badge icons, stat labels |
| Small indicators | `h-3 w-3` or `h-3.5 w-3.5` | Nested badge icons |
| Hero / empty state | `h-8 w-8` to `h-12 w-12` | Empty state illustrations |
| Mobile FAB | `h-6 w-6` | Floating action button |

Color pattern: icons are `text-slate-400` when inactive, context-colored when active (e.g., `text-purple-600` for AI, `text-red-600` for errors).

---

## 12. Loading States

### Skeleton Pattern

```tsx
// Text skeleton
<div className="skeleton-text w-3/4" />

// Avatar skeleton
<div className="skeleton-avatar" />

// Custom skeleton
<div className="skeleton h-24 w-full" />
```

All use the shimmer animation (gradient slide).

### Spinner

```tsx
import { Loader2 } from "lucide-react"
<Loader2 className="h-8 w-8 animate-spin text-primary" />
```

---

## 13. Scrollbar

Custom webkit scrollbar globally:

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
* { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
```

---

## 14. Focus States

Premium focus ring:

```css
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgb(var(--background)), 0 0 0 4px rgb(var(--primary) / 0.4);
}
```

Two-ring pattern: white inner ring for separation, black outer ring for visibility.

---

## 15. Feature Gating Pattern

Every optional feature is gated using workspace feature toggles:

```tsx
const { isFeatureEnabled } = useWorkspaceFeatures()
const hasTasksFeature = isFeatureEnabled("core.tasks")
const hasRocksFeature = isFeatureEnabled("core.rocks")

// In JSX:
{hasTasksFeature && (
  <ErrorBoundary title="Tasks unavailable">
    <TasksSection {...props} />
  </ErrorBoundary>
)}
```

Sidebar nav items auto-filter based on `requiredFeature` field.

---

## 16. Dashboard Composition Order

The dashboard renders sections top to bottom:

1. `NoWorkspaceAlert` — warning if no workspace selected
2. `KeyboardShortcutsDialog` — `?` key opens
3. Header — welcome message + `QuickActionsBar`
4. `StatsCards` — 4-column stat grid (gated: tasks OR rocks)
5. `ProductivityBar` — streaks, achievements, weekly review
6. `SmartSuggestions` — AI-powered overdue/due/blocked insights
7. `WeeklyEODCalendar` — calendar with hover preview
8. `FocusOfTheDay` — AI-suggested priorities
9. `FocusTimer` — Pomodoro / deep work timer
10. Rocks + Tasks grid — side-by-side on desktop
11. EOD Submission — tabbed AI vs Manual entry
12. `ActivityFeed` — recent activity

Every section: feature-gated, ErrorBoundary-wrapped, responsive.

---

## 17. Quick Start: Fork the UI

### Step 1: Copy these files

```
app/globals.css              # Entire design system
lib/utils.ts                 # cn() helper
components/ui/*              # All 61 shadcn components
components/theme-provider.tsx # next-themes wrapper
components/shared/error-boundary.tsx
```

### Step 2: Install dependencies

```bash
npm i clsx tailwind-merge class-variance-authority
npm i @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover
npm i @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-select
npm i lucide-react cmdk next-themes
npm i tw-animate-css
```

### Step 3: Set up Tailwind v4

No `tailwind.config.ts` needed. The CSS-first approach:

```css
/* app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";

/* ... all the :root variables and @layer rules from this project */
```

### Step 4: Set up the app shell

```tsx
// app/layout.tsx
import "./globals.css"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
```

### Step 5: Build your pages

Use the patterns above. Every page follows:

```tsx
<div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
  {/* Page header */}
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Title</h1>
      <p className="text-sm text-slate-500 mt-1">Description</p>
    </div>
    <div className="flex items-center gap-2">
      {/* Action buttons */}
    </div>
  </div>

  {/* Content sections */}
  <ErrorBoundary title="Section unavailable">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Section
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* ... */}
      </CardContent>
    </Card>
  </ErrorBoundary>
</div>
```

---

## Summary

| Aspect | Choice |
|--------|--------|
| Color philosophy | Monochromatic black/white + sage green accent |
| Component library | shadcn/ui (Radix + Tailwind) |
| Icons | lucide-react |
| Typography | Inter font, `tracking-tight`, `text-wrap: balance` |
| Radius | `0.75rem` base, cards use `rounded-2xl` |
| Shadows | 4-tier layered system, no default `shadow-md` |
| Animations | CSS keyframes, 0.3-0.4s, `cubic-bezier(0.4, 0, 0.2, 1)` |
| Layout | Sidebar (w-64) + Header (h-16) + Mobile bottom nav |
| Spacing | `p-5` cards, `gap-4 sm:gap-6` sections |
| Responsive | Mobile-first, sidebar appears at `md:` |
| State colors | Tailwind palette directly (red/amber/blue/green/purple/slate) |
