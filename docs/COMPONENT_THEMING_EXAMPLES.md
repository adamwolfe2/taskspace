# Component Theming Examples

Real-world examples of how to theme components with workspace branding.

---

## Table of Contents

1. [Basic Components](#basic-components)
2. [Status Indicators](#status-indicators)
3. [Data Visualization](#data-visualization)
4. [Forms & Inputs](#forms--inputs)
5. [Navigation](#navigation)
6. [Cards & Containers](#cards--containers)
7. [Loading States](#loading-states)
8. [Complex Components](#complex-components)

---

## Basic Components

### Buttons

```typescript
import { Button } from '@/components/ui/button'

// Primary button - uses workspace theme automatically
<Button variant="default">
  Save Changes
</Button>

// Outline button - uses workspace theme for border/text
<Button variant="outline">
  Cancel
</Button>

// Ghost button - subtle workspace theme
<Button variant="ghost">
  Learn More
</Button>

// Custom themed button
function CustomButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="
      bg-primary text-primary-foreground
      hover:bg-primary/90
      active:bg-primary/80
      px-4 py-2 rounded-lg
      transition-colors duration-200
    ">
      {children}
    </button>
  )
}
```

### Badges

```typescript
import { Badge } from '@/components/ui/badge'

// Default badge - uses workspace primary
<Badge variant="default">Active</Badge>

// Outline badge - workspace themed border
<Badge variant="outline">Draft</Badge>

// Custom status badge
function StatusBadge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <Badge
      variant={status === 'active' ? 'default' : 'outline'}
      className={status === 'active' ? '' : 'opacity-60'}
    >
      {status}
    </Badge>
  )
}
```

---

## Status Indicators

### Rock Status Badge

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { getRockStatusColorsThemed } from '@/lib/utils/status-colors'

function RockStatusBadge({ status }: { status: RockStatus }) {
  const { colors } = useBrandTheme()
  const statusColors = getRockStatusColorsThemed(status, colors.primary)

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
      ${statusColors.bg} ${statusColors.text} ${statusColors.border} border
    `}>
      <span className={`w-2 h-2 rounded-full ${statusColors.dot}`} />
      {status}
    </div>
  )
}
```

### Task Progress Indicator

```typescript
import { Progress } from '@/components/ui/progress'
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function TaskProgressIndicator({ completed, total }: { completed: number; total: number }) {
  const { colors } = useBrandTheme()
  const percentage = (completed / total) * 100

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Tasks Completed</span>
        <span className="font-medium">{completed}/{total}</span>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="text-xs text-muted-foreground text-center">
        {percentage.toFixed(0)}% Complete
      </div>
    </div>
  )
}
```

### Priority Indicator

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { getPriorityColorsThemed } from '@/lib/utils/status-colors'
import { Flag } from 'lucide-react'

function PriorityIndicator({ priority }: { priority: PriorityLevel }) {
  const { colors } = useBrandTheme()
  const priorityColors = getPriorityColorsThemed(priority, colors.primary)

  const priorityLabels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    normal: 'Normal',
    low: 'Low',
  }

  return (
    <div className={`
      inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium
      ${priorityColors.bg} ${priorityColors.text}
    `}>
      <Flag className="w-3 h-3" />
      {priorityLabels[priority]}
    </div>
  )
}
```

---

## Data Visualization

### Simple Chart with Theme

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function ThemedBarChart({ data }: { data: any[] }) {
  const { colors } = useBrandTheme()

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip />
        <Bar dataKey="value" fill={colors.primary} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### Metric Card

```typescript
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function MetricCard({ title, value, change, trend }: {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
}) {
  const { colors } = useBrandTheme()
  const isPositive = trend === 'up'

  return (
    <div className="p-6 bg-white rounded-lg border shadow-sm">
      <div className="text-sm text-muted-foreground mb-1">{title}</div>
      <div className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
        {value}
      </div>
      <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{change}</span>
      </div>
    </div>
  )
}
```

---

## Forms & Inputs

### Themed Form Input

```typescript
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ThemedFormInput({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input {...props} />
      {/* Input automatically uses workspace theme for focus states */}
    </div>
  )
}
```

### Custom Color Picker

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { useState } from 'react'

function BrandColorPicker({ value, onChange }: {
  value: string
  onChange: (color: string) => void
}) {
  const { colors } = useBrandTheme()
  const [isOpen, setIsOpen] = useState(false)

  const quickColors = [
    colors.primary,
    colors.secondary,
    colors.accent,
    '#ef4444',
    '#f59e0b',
    '#10b981',
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 rounded-lg border-2 flex items-center gap-3 hover:border-primary/50 transition-colors"
      >
        <div
          className="w-8 h-8 rounded border shadow-sm"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono text-sm">{value}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 p-3 bg-white rounded-lg border shadow-lg z-10">
          <div className="text-xs text-muted-foreground mb-2">Quick Colors</div>
          <div className="grid grid-cols-6 gap-2">
            {quickColors.map((color) => (
              <button
                key={color}
                onClick={() => {
                  onChange(color)
                  setIsOpen(false)
                }}
                className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                style={{
                  backgroundColor: color,
                  borderColor: value === color ? colors.primary : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Navigation

### Themed Sidebar Item

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { LucideIcon } from 'lucide-react'

function SidebarItem({ icon: Icon, label, isActive, onClick }: {
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
}) {
  const { colors } = useBrandTheme()

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
        transition-all duration-200
        ${isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'hover:bg-accent/50 text-slate-700'
        }
      `}
      style={isActive ? {
        backgroundColor: `${colors.primary}15`,
        color: colors.primary,
      } : undefined}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  )
}
```

### Breadcrumbs

```typescript
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-primary font-medium' : 'text-muted-foreground'}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        )
      })}
    </nav>
  )
}
```

---

## Cards & Containers

### Branded Card

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function BrandedCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useBrandTheme()

  return (
    <Card className="overflow-hidden">
      <div className="h-2" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }} />
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
```

### Feature Highlight Card

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { LucideIcon } from 'lucide-react'

function FeatureCard({ icon: Icon, title, description }: {
  icon: LucideIcon
  title: string
  description: string
}) {
  const { colors } = useBrandTheme()

  return (
    <div className="group p-6 rounded-xl border-2 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: `${colors.primary}15` }}
      >
        <Icon className="w-6 h-6" style={{ color: colors.primary }} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
```

---

## Loading States

### Themed Skeleton Loader

```typescript
import { Skeleton } from '@/components/ui/skeleton'

// Skeleton automatically uses workspace theme
function LoadingCard() {
  return (
    <div className="p-6 border rounded-lg space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}
```

### Branded Spinner

```typescript
import { Loader2 } from 'lucide-react'
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'

function BrandedSpinner({ size = 24 }: { size?: number }) {
  const { colors } = useBrandTheme()

  return (
    <Loader2
      className="animate-spin"
      size={size}
      style={{ color: colors.primary }}
    />
  )
}
```

---

## Complex Components

### Dashboard Stats Grid

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { TrendingUp, Users, Target, CheckCircle } from 'lucide-react'

function DashboardStatsGrid({ stats }: {
  stats: {
    activeUsers: number
    completedRocks: number
    onTrackPercentage: number
    totalTasks: number
  }
}) {
  const { colors } = useBrandTheme()

  const statCards = [
    {
      icon: Users,
      label: 'Active Users',
      value: stats.activeUsers,
      color: colors.primary,
    },
    {
      icon: Target,
      label: 'Completed Rocks',
      value: stats.completedRocks,
      color: colors.secondary,
    },
    {
      icon: TrendingUp,
      label: 'On Track',
      value: `${stats.onTrackPercentage}%`,
      color: colors.accent,
    },
    {
      icon: CheckCircle,
      label: 'Total Tasks',
      value: stats.totalTasks,
      color: colors.primary,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        )
      })}
    </div>
  )
}
```

### Rock Card with Theme

```typescript
import { useBrandTheme } from '@/lib/contexts/brand-theme-context'
import { getRockStatusColorsThemed } from '@/lib/utils/status-colors'
import { Progress } from '@/components/ui/progress'
import { Target } from 'lucide-react'

function RockCard({ rock }: {
  rock: {
    title: string
    description: string
    status: RockStatus
    progress: number
    owner: string
  }
}) {
  const { colors } = useBrandTheme()
  const statusColors = getRockStatusColorsThemed(rock.status, colors.primary)

  return (
    <div className="p-6 bg-white rounded-xl border-2 hover:border-primary/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
            style={{ backgroundColor: `${colors.primary}15` }}
          >
            <Target className="w-5 h-5" style={{ color: colors.primary }} />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">{rock.title}</h3>
            <p className="text-sm text-muted-foreground">{rock.description}</p>
          </div>
        </div>
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${statusColors.bg} ${statusColors.text}
        `}>
          {rock.status}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{rock.progress}%</span>
        </div>
        <Progress value={rock.progress} />
      </div>

      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Owner</span>
        <span className="text-sm font-medium">{rock.owner}</span>
      </div>
    </div>
  )
}
```

---

## Tips for Custom Components

1. **Always use useBrandTheme() for dynamic colors**
2. **Prefer CSS variables for static theming**
3. **Maintain semantic colors for errors/warnings/success**
4. **Test with multiple workspace themes**
5. **Ensure WCAG AA contrast compliance**
6. **Use transitions for smooth theme changes**
7. **Cache expensive color calculations**
8. **Provide loading states during theme changes**

---

For more examples, see:
- `/components/ui/` - Base UI components
- [Developer Guide](/docs/WORKSPACE_THEMING_GUIDE.md)
- [CSS Variables Reference](/docs/CSS_VARIABLES_REFERENCE.md)
