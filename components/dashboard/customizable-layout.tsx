"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"
import "react-grid-layout/css/styles.css"

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
  onLayoutChange?: (layout: RGLLayout[]) => void
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
} from "lucide-react"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"
import "react-grid-layout/css/styles.css"

export interface DashboardWidget {
 id: string
 type: "welcome" | "eod_status" | "action_hub" | "rocks" | "tasks" | "stats" | "productivity" | "eod_calendar" | "eod_submission" | "focus" | "activity"
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
export const DEFAULT_WIDGETS: DashboardWidget[] = [
 { id: "welcome", type: "welcome", title: "Welcome & Quick Actions", enabled: true, minW: 2, minH: 1, maxH: 2 },
 { id: "eod_status", type: "eod_status", title: "EOD Status", enabled: true, minW: 2, minH: 1, maxH: 1 },
 { id: "action_hub", type: "action_hub", title: "Action Hub", enabled: true, minW: 2, minH: 2, maxH: 4 },
 { id: "rocks", type: "rocks", title: "My Rocks", enabled: true, minW: 2, minH: 2, maxH: 6 },
 { id: "tasks", type: "tasks", title: "Assigned Tasks", enabled: true, minW: 2, minH: 2, maxH: 6 },
 { id: "stats", type: "stats", title: "Stats Overview", enabled: true, minW: 2, minH: 1, maxH: 2 },
 { id: "productivity", type: "productivity", title: "Productivity", enabled: true, minW: 2, minH: 1, maxH: 2 },
 { id: "eod_calendar", type: "eod_calendar", title: "Weekly EOD Calendar", enabled: true, minW: 2, minH: 2, maxH: 4 },
 { id: "eod_submission", type: "eod_submission", title: "EOD Submission", enabled: true, minW: 2, minH: 3, maxH: 6 },
 { id: "focus", type: "focus", title: "Focus Timer", enabled: true, minW: 1, minH: 2, maxH: 4 },
 { id: "activity", type: "activity", title: "Activity Feed", enabled: true, minW: 2, minH: 2, maxH: 4 },
]

// Default layout — 4-column grid
export const DEFAULT_LAYOUT: LayoutItem[] = [
 { i: "welcome", x: 0, y: 0, w: 4, h: 1 },
 { i: "eod_status", x: 0, y: 1, w: 4, h: 1 },
 { i: "action_hub", x: 0, y: 2, w: 4, h: 2 },
 { i: "rocks", x: 0, y: 4, w: 2, h: 3 },
 { i: "tasks", x: 2, y: 4, w: 2, h: 3 },
 { i: "stats", x: 0, y: 7, w: 4, h: 1 },
 { i: "productivity", x: 0, y: 8, w: 4, h: 1 },
 { i: "eod_calendar", x: 0, y: 9, w: 2, h: 3 },
 { i: "eod_submission", x: 2, y: 9, w: 2, h: 3 },
 { i: "focus", x: 0, y: 12, w: 2, h: 2 },
 { i: "activity", x: 2, y: 12, w: 2, h: 2 },
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
 const [containerWidth, setContainerWidth] = useState(1200)
 const themedColors = useThemedIconColors()

 // Measure container width with ResizeObserver
 useEffect(() => {
  const el = containerRef.current
  if (!el) return

  const observer = new ResizeObserver((entries) => {
   for (const entry of entries) {
    setContainerWidth(entry.contentRect.width)
   }
  })
  observer.observe(el)
  // Set initial width
  setContainerWidth(el.clientWidth || 1200)
  return () => observer.disconnect()
 }, [])

 // Filter to only enabled widgets
 const enabledWidgets = widgets.filter((w) => w.enabled)
 const enabledLayout = layout.filter((l) =>
  enabledWidgets.some((w) => w.id === l.i)
 )

 const handleLayoutChange = useCallback((newLayout: RGLLayout[]) => {
  if (isEditing) {
   onLayoutChange(newLayout as unknown as LayoutItem[])
  }
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
       <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
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

   {/* Grid Layout */}
   <GridLayout
    className="layout"
    layout={enabledLayout as unknown as RGLLayout[]}
    cols={4}
    rowHeight={100}
    width={containerWidth}
    onLayoutChange={handleLayoutChange}
    isDraggable={isEditing}
    isResizable={isEditing}
    draggableHandle=".widget-drag-handle"
    margin={[16, 16]}
    containerPadding={[0, 0]}
   >
    {enabledWidgets.map((widget) => (
     <div
      key={widget.id}
      className={cn(
       "bg-white rounded-lg border shadow-sm overflow-hidden",
      )}
      style={isEditing ? {
       outline: `2px solid ${themedColors.primaryAlpha20}`,
       outlineOffset: "-1px",
      } : undefined}
     >
      {isEditing && (
       <div
        className="widget-drag-handle flex items-center justify-between px-3 py-1.5 border-b cursor-move"
        style={{
         backgroundColor: themedColors.primaryAlpha10,
        }}
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
         >
          <X className="h-3.5 w-3.5" />
         </Button>
        </div>
       </div>
      )}
      <div className={cn(
       "h-full overflow-auto",
       isEditing ? "pointer-events-none opacity-75" : ""
      )}>
       {renderWidget(widget)}
      </div>
     </div>
    ))}
   </GridLayout>

   {/* Empty state when no widgets */}
   {enabledWidgets.length === 0 && (
    <Card className="border-dashed">
     <CardContent className="flex flex-col items-center justify-center py-12">
      <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground mb-4">No widgets enabled</p>
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
   {enabledWidgets.map((widget) => (
    <div key={widget.id}>
     {renderWidget(widget)}
    </div>
   ))}
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

 // State always holds ALL widgets (not filtered by features).
 // Feature filtering happens at display time via useMemo.
 const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
  if (storageKey && typeof window !== "undefined") {
   try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
     const parsed = JSON.parse(saved)
     if (parsed.widgets && Array.isArray(parsed.widgets)) {
      // Merge saved enabled/disabled with current defaults (handles new widget types)
      const savedMap = new Map<string, DashboardWidget>(parsed.widgets.map((w: DashboardWidget) => [w.id, w]))
      return initialWidgets.map((def) => {
       const savedWidget = savedMap.get(def.id)
       return savedWidget ? { ...def, enabled: savedWidget.enabled } : def
      })
     }
    }
   } catch {
    // Invalid saved data, use defaults
   }
  }
  return initialWidgets
 })

 const [layout, setLayout] = useState<LayoutItem[]>(() => {
  if (storageKey && typeof window !== "undefined") {
   try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
     const parsed = JSON.parse(saved)
     if (parsed.layout && Array.isArray(parsed.layout)) {
      return parsed.layout
     }
    }
   } catch {
    // Invalid saved data, use defaults
   }
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
       w: widgetDef.minW || 2,
       h: widgetDef.minH || 2,
      },
     ]
    })
   }
  }
 }, [initialWidgets])

 const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
  setLayout(newLayout)
 }, [])

 const handleSave = useCallback(() => {
  if (storageKey && typeof window !== "undefined") {
   localStorage.setItem(storageKey, JSON.stringify({ widgets, layout }))
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
