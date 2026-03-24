"use client"

import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from "react"
import dynamic from "next/dynamic"

// react-grid-layout references `Element` at module level which breaks SSR.
// Use next/dynamic with ssr:false so the JS only loads on the client.
interface RGLLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  static?: boolean
}

type GridLayoutProps = {
  className?: string
  layout: RGLLayout[]
  cols: number
  rowHeight: number
  width: number
  compactType?: "vertical" | "horizontal" | null
  onLayoutChange?: (layout: RGLLayout[]) => void
  onDragStart?: () => void
  onResizeStart?: () => void
  isDraggable?: boolean
  isResizable?: boolean
  draggableHandle?: string
  margin?: [number, number]
  containerPadding?: [number, number]
  children?: React.ReactNode
}

const GridLayout = dynamic(
  () => import("react-grid-layout"),
  { ssr: false }
) as unknown as React.ComponentType<GridLayoutProps>

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
 Settings2,
 Move,
 X,
 Plus,
 LayoutGrid,
 Target,
 CheckSquare,
 Calendar,
 Sparkles,
 BarChart3,
 Clock,
 GripVertical,
 Save,
 RotateCcw,
 Activity,
 TrendingUp,
 FileEdit,
 Hand,
 ClipboardCheck,
 Heart,
 Sun,
} from "lucide-react"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"
// Grid CSS is loaded globally via app/globals.css for reliability with dynamic imports

// Bump this whenever DEFAULT_LAYOUT or rowHeight changes.
// Stale localStorage with a different version is discarded on load.
const LAYOUT_VERSION = 8

export interface DashboardWidget {
 id: string
 type: "welcome" | "eod_status" | "action_hub" | "rocks" | "tasks" | "stats" | "productivity" | "eod_calendar" | "eod_submission" | "focus" | "activity" | "focus_of_day" | "smart_suggestions" | "weekly_brief" | "team_health"
 title: string
 enabled: boolean
 minW?: number
 minH?: number
 maxW?: number
 maxH?: number
}

// Define LayoutItem with explicit properties to avoid type conflicts with react-grid-layout
export interface LayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  maxW?: number
  minH?: number
  maxH?: number
  static?: boolean
  isDraggable?: boolean
  isResizable?: boolean
}

interface CustomizableLayoutProps {
 widgets: DashboardWidget[]
 layout: LayoutItem[]
 onLayoutChange: (layout: LayoutItem[]) => void
 onWidgetToggle: (widgetId: string, enabled: boolean) => void
 onSave: () => void
 onReset: () => void
 isEditing: boolean
 setIsEditing: (editing: boolean) => void
 renderWidget: (widget: DashboardWidget) => React.ReactNode
 className?: string
}

// Default widget configurations
// Heights use rowHeight=40px grid units. Pixel height ≈ h*40 + (h-1)*16 margin.
export const DEFAULT_WIDGETS: DashboardWidget[] = [
 { id: "welcome", type: "welcome", title: "Welcome & Quick Actions", enabled: true, minW: 2, minH: 2, maxH: 5 },
 { id: "eod_status", type: "eod_status", title: "EOD Status", enabled: true, minW: 2, minH: 2, maxH: 3 },
 { id: "action_hub", type: "action_hub", title: "Action Hub", enabled: true, minW: 2, minH: 4, maxH: 10 },
 { id: "rocks", type: "rocks", title: "My Rocks", enabled: true, minW: 2, minH: 5, maxH: 16 },
 { id: "tasks", type: "tasks", title: "Assigned Tasks", enabled: true, minW: 2, minH: 5, maxH: 16 },
 { id: "stats", type: "stats", title: "Stats Overview", enabled: true, minW: 2, minH: 3, maxH: 6 },
 { id: "productivity", type: "productivity", title: "Productivity", enabled: true, minW: 2, minH: 3, maxH: 6 },
 { id: "eod_calendar", type: "eod_calendar", title: "Weekly EOD Calendar", enabled: true, minW: 2, minH: 5, maxH: 12 },
 { id: "eod_submission", type: "eod_submission", title: "EOD Submission", enabled: true, minW: 2, minH: 6, maxH: 16 },
 { id: "focus", type: "focus", title: "Focus Timer", enabled: true, minW: 1, minH: 5, maxH: 10 },
 { id: "activity", type: "activity", title: "Activity Feed", enabled: true, minW: 2, minH: 4, maxH: 10 },
 { id: "focus_of_day", type: "focus_of_day", title: "Focus of the Day", enabled: false, minW: 2, minH: 4, maxH: 10 },
 { id: "smart_suggestions", type: "smart_suggestions", title: "Smart Suggestions", enabled: false, minW: 2, minH: 5, maxH: 14 },
 { id: "weekly_brief", type: "weekly_brief", title: "Week Preview", enabled: true, minW: 2, minH: 4, maxH: 10 },
 { id: "team_health", type: "team_health", title: "Team Health", enabled: false, minW: 1, minH: 5, maxH: 10 },
]

// Default bento layout — 4 columns, rowHeight=40px
// Row height formula: h*40 + (h-1)*16 = (h*56)-16 pixels
export const DEFAULT_LAYOUT: LayoutItem[] = [
 { i: "welcome",        x: 0, y: 0,  w: 4, h: 3  }, // ~152px — header bar (full width)
 { i: "stats",          x: 0, y: 3,  w: 4, h: 4  }, // ~208px — stat cards (full width)
 { i: "rocks",          x: 0, y: 7,  w: 2, h: 12 }, // ~672px — left column
 { i: "tasks",          x: 2, y: 7,  w: 2, h: 12 }, // ~672px — right column
 { i: "action_hub",     x: 0, y: 19, w: 4, h: 5  }, // ~264px — skinny bar (full width)
 { i: "productivity",   x: 0, y: 24, w: 4, h: 3  }, // ~152px — skinny bar (full width)
 { i: "eod_calendar",   x: 0, y: 27, w: 2, h: 9  }, // ~488px — left column
 { i: "activity",       x: 2, y: 27, w: 2, h: 9  }, // ~488px — right column
 { i: "eod_submission", x: 0, y: 36, w: 4, h: 10 }, // ~544px — full width
 { i: "eod_status",     x: 0, y: 46, w: 4, h: 2  }, // ~96px  — below fold (optional)
 { i: "focus",          x: 0, y: 48, w: 2, h: 7  }, // ~376px — below fold (optional)
 { i: "weekly_brief",   x: 2, y: 48, w: 2, h: 7  }, // ~376px — below fold (match focus height)
]

function getWidgetIcon(type: DashboardWidget["type"]) {
 switch (type) {
  case "welcome": return Hand
  case "eod_status": return ClipboardCheck
  case "action_hub": return Sparkles
  case "rocks": return Target
  case "tasks": return CheckSquare
  case "stats": return BarChart3
  case "productivity": return TrendingUp
  case "eod_calendar": return Calendar
  case "eod_submission": return FileEdit
  case "focus": return Clock
  case "activity": return Activity
  case "focus_of_day": return Target
  case "smart_suggestions": return Sparkles
  case "weekly_brief": return Sun
  case "team_health": return Heart
  default: return LayoutGrid
 }
}

function getWidgetDescription(type: DashboardWidget["type"]) {
 switch (type) {
  case "welcome": return "Welcome header and quick action buttons"
  case "eod_status": return "EOD submission status for today"
  case "action_hub": return "AI-powered task and rock suggestions"
  case "rocks": return "Your quarterly goals and progress"
  case "tasks": return "Assigned tasks with filtering and actions"
  case "stats": return "Overview of tasks, rocks, and activity"
  case "productivity": return "Streaks, achievements, and weekly reviews"
  case "eod_calendar": return "Weekly EOD submission calendar"
  case "eod_submission": return "AI and manual EOD report submission"
  case "focus": return "Pomodoro timer for deep work sessions"
  case "activity": return "Recent activity feed"
  case "focus_of_day": return "Today's top priorities — overdue tasks and rock deadlines"
  case "smart_suggestions": return "Smart recommendations based on your tasks, rocks, and patterns"
  case "weekly_brief": return "Monday morning AI preview of your week ahead"
  case "team_health": return "Weekly team health pulse score and trends"
  default: return ""
 }
}

export function CustomizableLayout({
 widgets,
 layout,
 onLayoutChange,
 onWidgetToggle,
 onSave,
 onReset,
 isEditing,
 setIsEditing,
 renderWidget,
 className,
}: CustomizableLayoutProps) {
 const [showSettings, setShowSettings] = useState(false)
 const containerRef = useRef<HTMLDivElement>(null)
 const [containerWidth, setContainerWidth] = useState(0)
 // Ref so the ResizeObserver callback can read editing state without stale closure.
 // Kept in sync with the isEditing prop DURING RENDER (not in an effect) so the
 // guard is always current before any browser callbacks (ResizeObserver) can fire.
 const isEditingRef = useRef(false)
 isEditingRef.current = isEditing
 const themedColors = useThemedIconColors()

 // Measure container width for react-grid-layout.
 // Skip updates while editing: when RGL switches to absolute positioning the
 // container loses its block-flow width, triggering the observer with a smaller
 // value → widgets shrink → container shrinks further (feedback loop).
 useEffect(() => {
  const el = containerRef.current
  if (!el) return
  const observer = new ResizeObserver((entries) => {
   if (isEditingRef.current) return // frozen while editing
   for (const entry of entries) {
    setContainerWidth(entry.contentRect.width)
   }
  })
  observer.observe(el)
  setContainerWidth(el.clientWidth)
  return () => observer.disconnect()
 }, [])

 // Snapshot the real DOM width the moment we enter edit mode.
 // useLayoutEffect fires synchronously after DOM mutations but BEFORE the browser
 // paints and BEFORE ResizeObserver callbacks run, so containerWidth is correct
 // before RGL ever sees it and the ResizeObserver guard (isEditingRef) is already set.
 useLayoutEffect(() => {
  if (isEditing && containerRef.current) {
   userInteractedRef.current = false
   setContainerWidth(containerRef.current.clientWidth)
  }
 }, [isEditing])

 // Filter to only enabled widgets
 const enabledWidgets = widgets.filter((w) => w.enabled)

 // Merge min/max constraints from widget definitions into layout items
 // so react-grid-layout respects them and doesn't collapse widths
 const enabledLayout = useMemo(() => {
  const widgetMap = new Map(widgets.map((w) => [w.id, w]))
  return layout
   .filter((l) => enabledWidgets.some((w) => w.id === l.i))
   .map((l) => {
    const widget = widgetMap.get(l.i)
    if (!widget) return l
    return {
     ...l,
     minW: widget.minW ?? l.minW,
     minH: widget.minH ?? l.minH,
     maxW: widget.maxW ?? l.maxW,
     maxH: widget.maxH ?? l.maxH,
    }
   })
 }, [layout, widgets, enabledWidgets])

 // Sort widgets by layout position (y then x) for CSS Grid flow order
 const sortedWidgets = useMemo(() => {
  const layoutMap = new Map(enabledLayout.map((l) => [l.i, l]))
  return [...enabledWidgets].sort((a, b) => {
   const la = layoutMap.get(a.id)
   const lb = layoutMap.get(b.id)
   if (!la || !lb) return 0
   if (la.y !== lb.y) return la.y - lb.y
   return la.x - lb.x
  })
 }, [enabledWidgets, enabledLayout])

 // Track user-initiated interactions (drag/resize) vs automatic compaction
 const userInteractedRef = useRef(false)

 const handleDragStart = useCallback(() => {
  userInteractedRef.current = true
 }, [])

 const handleResizeStart = useCallback(() => {
  userInteractedRef.current = true
 }, [])

 const handleLayoutChange = useCallback((newLayout: RGLLayout[]) => {
  if (!isEditing) return
  // Only update layout state when user has actually dragged or resized.
  // This prevents react-grid-layout's initial compaction from collapsing widths.
  if (!userInteractedRef.current) return
  userInteractedRef.current = false
  onLayoutChange(newLayout as unknown as LayoutItem[])
 }, [isEditing, onLayoutChange])

 const handleSave = () => {
  onSave()
  setIsEditing(false)
 }

 return (
  <div ref={containerRef} className={cn("relative", className)}>
   {/* Edit Mode Controls */}
   <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
     {isEditing && (
      <Badge
       variant="outline"
       style={{
        backgroundColor: themedColors.primaryAlpha10,
        color: themedColors.primary,
        borderColor: themedColors.primaryAlpha20,
       }}
      >
       <Move className="h-3 w-3 mr-1" />
       Editing Layout
      </Badge>
     )}
    </div>

    <div className="flex items-center gap-2">
     {isEditing ? (
      <>
       <Button variant="outline" size="sm" onClick={onReset}>
        <RotateCcw className="h-4 w-4 mr-1" />
        Reset
       </Button>
       <Button size="sm" onClick={handleSave}>
        <Save className="h-4 w-4 mr-1" />
        Save Layout
       </Button>
       <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} aria-label="Exit edit mode">
        <X className="h-4 w-4" />
       </Button>
      </>
     ) : (
      <>
       <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogTrigger asChild>
         <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-1" />
          Widgets
         </Button>
        </DialogTrigger>
        <WidgetSettingsDialog
         widgets={widgets}
         onToggle={onWidgetToggle}
        />
       </Dialog>
       <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
        <LayoutGrid className="h-4 w-4 mr-1" />
        Customize
       </Button>
      </>
     )}
    </div>
   </div>

   {isEditing ? (
    /* ── Edit Mode: react-grid-layout for drag-and-drop ── */
    containerWidth > 0 ? (
     <GridLayout
      className="layout"
      layout={enabledLayout as unknown as RGLLayout[]}
      cols={4}
      rowHeight={40}
      width={containerWidth}
      compactType="vertical"
      onLayoutChange={handleLayoutChange}
      onDragStart={handleDragStart}
      onResizeStart={handleResizeStart}
      isDraggable
      isResizable
      draggableHandle=".widget-drag-handle"
      margin={[16, 16]}
      containerPadding={[0, 0]}
     >
      {enabledWidgets.map((widget) => (
       <div
        key={widget.id}
        className="bg-white rounded-lg border shadow-sm overflow-hidden"
        style={{
         outline: `2px solid ${themedColors.primaryAlpha20}`,
         outlineOffset: "-1px",
        }}
       >
        <div
         className="widget-drag-handle flex items-center justify-between px-3 py-1.5 border-b cursor-move"
         style={{ backgroundColor: themedColors.primaryAlpha10 }}
        >
         <div className="flex items-center gap-2 text-sm" style={{ color: themedColors.primary }}>
          <GripVertical className="h-4 w-4" />
          {widget.title}
         </div>
         <div className="flex items-center gap-1">
          <Button
           variant="ghost"
           size="icon"
           className="h-6 w-6"
           onClick={() => onWidgetToggle(widget.id, false)}
           aria-label="Remove widget"
          >
           <X className="h-3.5 w-3.5" />
          </Button>
         </div>
        </div>
        <div className="h-full overflow-hidden">
         {renderWidget(widget)}
        </div>
       </div>
      ))}
     </GridLayout>
    ) : null
   ) : (
    /* ── Default Mode: Native CSS Grid — fixed 4 cols on lg+, stacked on mobile ── */
    <>
     {/* Mobile: simple stacked layout (hidden on lg+) */}
     <div className="block lg:hidden">
      <SimpleDashboardLayout widgets={sortedWidgets} renderWidget={renderWidget} />
     </div>
     {/* Desktop: 4-column CSS grid matching RGL edit mode (hidden below lg) */}
     <div
      className="hidden lg:grid grid-cols-4 gap-4"
      style={{ gridAutoRows: '40px' }}
     >
     {sortedWidgets.map((widget) => {
      const item = enabledLayout.find((l) => l.i === widget.id)
      const content = renderWidget(widget)
      if (!content) return null
      return (
       <div
        key={widget.id}
        className="bg-white rounded-lg border shadow-sm overflow-hidden min-h-0"
        style={{
         gridColumn: `span ${item?.w || 4}`,
         gridRow: `span ${item?.h || 3}`,
        }}
       >
        <div className="h-full overflow-y-auto">
         {content}
        </div>
       </div>
      )
     })}
    </div>
    </>
   )}

   {/* Empty state when no widgets */}
   {enabledWidgets.length === 0 && (
    <Card className="border-dashed">
     <CardContent className="flex flex-col items-center justify-center py-12">
      <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-base font-semibold text-foreground mb-1">Customize your dashboard</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
       Add widgets to see your tasks, rocks, EOD reports, and more at a glance.
       You can rearrange and resize them anytime.
      </p>
      <Button variant="outline" onClick={() => setShowSettings(true)}>
       <Plus className="h-4 w-4 mr-1" />
       Add Widgets
      </Button>
     </CardContent>
    </Card>
   )}
  </div>
 )
}

// Widget settings dialog
function WidgetSettingsDialog({
 widgets,
 onToggle,
}: {
 widgets: DashboardWidget[]
 onToggle: (widgetId: string, enabled: boolean) => void
}) {
 const themedColors = useThemedIconColors()

 return (
  <DialogContent className="sm:max-w-[500px]">
   <DialogHeader>
    <DialogTitle>Dashboard Widgets</DialogTitle>
    <DialogDescription>
     Choose which widgets to show on your dashboard
    </DialogDescription>
   </DialogHeader>

   <div className="space-y-4 py-4">
    {widgets.map((widget) => {
     const Icon = getWidgetIcon(widget.type)
     return (
      <div
       key={widget.id}
       className={cn(
        "flex items-start gap-4 p-3 rounded-lg border transition-colors",
        !widget.enabled && "hover:bg-muted/50"
       )}
       style={widget.enabled ? {
        backgroundColor: themedColors.primaryAlpha10,
        borderColor: themedColors.primaryAlpha20,
       } : undefined}
      >
       <div
        className={cn("p-2 rounded-lg", !widget.enabled && "bg-muted")}
        style={widget.enabled ? { backgroundColor: themedColors.primaryAlpha20 } : undefined}
       >
        <Icon
         className={cn("h-5 w-5", !widget.enabled && "text-muted-foreground")}
         style={widget.enabled ? { color: themedColors.primary } : undefined}
        />
       </div>
       <div className="flex-1 min-w-0">
        <Label
         htmlFor={`widget-${widget.id}`}
         className="font-medium cursor-pointer"
        >
         {widget.title}
        </Label>
        <p className="text-sm text-muted-foreground">
         {getWidgetDescription(widget.type)}
        </p>
       </div>
       <Switch
        id={`widget-${widget.id}`}
        checked={widget.enabled}
        onCheckedChange={(checked) => onToggle(widget.id, checked)}
       />
      </div>
     )
    })}
   </div>
  </DialogContent>
 )
}

// Simplified non-grid layout for smaller screens
export function SimpleDashboardLayout({
 widgets,
 renderWidget,
 className,
}: {
 widgets: DashboardWidget[]
 renderWidget: (widget: DashboardWidget) => React.ReactNode
 className?: string
}) {
 const enabledWidgets = widgets.filter((w) => w.enabled)

 return (
  <div className={cn("space-y-6", className)}>
   {enabledWidgets.map((widget) => {
    const content = renderWidget(widget)
    if (!content) return null
    return (
     <div key={widget.id}>
      {content}
     </div>
    )
   })}
  </div>
 )
}

// Map widget types to the feature key they require (if any)
const WIDGET_FEATURE_MAP: Record<string, string> = {
 rocks: "core.rocks",
 tasks: "core.tasks",
 eod_status: "core.eodReports",
 eod_calendar: "core.eodReports",
 eod_submission: "core.eodReports",
 focus: "productivity.focusBlocks",
 productivity: "productivity.streakTracking",
}

// Hook for managing dashboard layout state with localStorage persistence
export function useDashboardLayout(
 initialWidgets: DashboardWidget[] = DEFAULT_WIDGETS,
 initialLayout: LayoutItem[] = DEFAULT_LAYOUT,
 workspaceId?: string | null,
 enabledFeatures?: string[]
) {
 const storageKey = workspaceId ? `dashboard-layout-${workspaceId}` : null

 // Load saved data from localStorage (if version matches)
 const savedData = useMemo(() => {
  if (!storageKey || typeof window === "undefined") return null
  try {
   const raw = localStorage.getItem(storageKey)
   if (!raw) return null
   const parsed = JSON.parse(raw)
   // Discard stale data when layout version changes (e.g. rowHeight or grid schema change)
   if (parsed.version !== LAYOUT_VERSION) {
    localStorage.removeItem(storageKey)
    return null
   }
   return parsed
  } catch {
   return null
  }
 }, [storageKey])

 // State always holds ALL widgets (not filtered by features).
 // Feature filtering happens at display time via useMemo.
 const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
  if (savedData?.widgets && Array.isArray(savedData.widgets)) {
   // Merge saved enabled/disabled with current defaults (handles new widget types)
   const savedMap = new Map<string, DashboardWidget>(savedData.widgets.map((w: DashboardWidget) => [w.id, w]))
   return initialWidgets.map((def) => {
    const savedWidget = savedMap.get(def.id)
    return savedWidget ? { ...def, enabled: savedWidget.enabled } : def
   })
  }
  return initialWidgets
 })

 const [layout, setLayout] = useState<LayoutItem[]>(() => {
  if (savedData?.layout && Array.isArray(savedData.layout)) {
   return savedData.layout
  }
  return initialLayout
 })

 const [isEditing, setIsEditing] = useState(false)

 // Filter widgets by workspace features at display time (non-destructive)
 const visibleWidgets = useMemo(() => {
  if (!enabledFeatures || enabledFeatures.length === 0) return widgets
  return widgets.filter((w) => {
   const requiredFeature = WIDGET_FEATURE_MAP[w.type]
   if (!requiredFeature) return true // no feature gate
   return enabledFeatures.includes(requiredFeature)
  })
 }, [widgets, enabledFeatures])

 const handleWidgetToggle = useCallback((widgetId: string, enabled: boolean) => {
  setWidgets((prev) =>
   prev.map((w) => (w.id === widgetId ? { ...w, enabled } : w))
  )

  // Add layout entry if enabling a widget that has no position yet
  if (enabled) {
   const widgetDef = initialWidgets.find((w) => w.id === widgetId)
   if (widgetDef) {
    setLayout((prevLayout) => {
     if (prevLayout.some((l) => l.i === widgetId)) return prevLayout
     const maxY = Math.max(...prevLayout.map((l) => l.y + l.h), 0)
     return [
      ...prevLayout,
      {
       i: widgetId,
       x: 0,
       y: maxY,
       w: initialLayout.find((l) => l.i === widgetId)?.w || widgetDef.minW || 2,
       h: initialLayout.find((l) => l.i === widgetId)?.h || widgetDef.minH || 2,
      },
     ]
    })
   }
  }
 }, [initialWidgets, initialLayout])

 const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
  setLayout(newLayout)
 }, [])

 const handleSave = useCallback(() => {
  if (storageKey && typeof window !== "undefined") {
   localStorage.setItem(storageKey, JSON.stringify({ version: LAYOUT_VERSION, widgets, layout }))
  }
 }, [storageKey, widgets, layout])

 const handleReset = useCallback(() => {
  setWidgets(initialWidgets)
  setLayout(initialLayout)
  if (storageKey && typeof window !== "undefined") {
   localStorage.removeItem(storageKey)
  }
 }, [initialWidgets, initialLayout, storageKey])

 return {
  widgets: visibleWidgets,
  layout,
  isEditing,
  setIsEditing,
  handleWidgetToggle,
  handleLayoutChange,
  handleSave,
  handleReset,
 }
}
