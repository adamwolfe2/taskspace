"use client"

import { useState, useCallback } from "react"
import ReactGridLayout, { Layout } from "react-grid-layout"

// Cast to any to avoid type definition mismatches with react-grid-layout v2.x
const GridLayout = ReactGridLayout as unknown as React.ComponentType<{
  className?: string
  layout: Layout[]
  cols: number
  rowHeight: number
  width: number
  onLayoutChange?: (layout: Layout[]) => void
  isDraggable?: boolean
  isResizable?: boolean
  draggableHandle?: string
  margin?: [number, number]
  containerPadding?: [number, number]
  children?: React.ReactNode
}>
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
 Trophy,
 Sparkles,
 BarChart3,
 Clock,
 GripVertical,
 Save,
 RotateCcw,
} from "lucide-react"
import "react-grid-layout/css/styles.css"

interface DashboardWidget {
 id: string
 type: "stats" | "rocks" | "tasks" | "eod_calendar" | "focus" | "achievements" | "quick_actions" | "suggestions" | "time_tracking"
 title: string
 enabled: boolean
 minW?: number
 minH?: number
 maxW?: number
 maxH?: number
}

// Define LayoutItem with explicit properties to avoid type conflicts with react-grid-layout
interface LayoutItem {
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
 onSave: () => Promise<void>
 onReset: () => void
 isEditing: boolean
 setIsEditing: (editing: boolean) => void
 renderWidget: (widget: DashboardWidget) => React.ReactNode
 className?: string
}

// Default widget configurations
export const DEFAULT_WIDGETS: DashboardWidget[] = [
 { id: "stats", type: "stats", title: "Stats Overview", enabled: true, minW: 2, minH: 1, maxH: 2 },
 { id: "rocks", type: "rocks", title: "My Rocks", enabled: true, minW: 2, minH: 2, maxH: 4 },
 { id: "tasks", type: "tasks", title: "Tasks", enabled: true, minW: 2, minH: 2, maxH: 6 },
 { id: "eod_calendar", type: "eod_calendar", title: "EOD Calendar", enabled: true, minW: 2, minH: 1, maxH: 3 },
 { id: "focus", type: "focus", title: "Focus Timer", enabled: true, minW: 1, minH: 1, maxH: 2 },
 { id: "achievements", type: "achievements", title: "Achievements", enabled: false, minW: 1, minH: 1, maxH: 2 },
 { id: "quick_actions", type: "quick_actions", title: "Quick Actions", enabled: true, minW: 2, minH: 1, maxH: 1 },
 { id: "suggestions", type: "suggestions", title: "AI Suggestions", enabled: true, minW: 1, minH: 2, maxH: 4 },
 { id: "time_tracking", type: "time_tracking", title: "Time Tracking", enabled: false, minW: 1, minH: 2, maxH: 3 },
]

// Default layout
export const DEFAULT_LAYOUT: LayoutItem[] = [
 { i: "quick_actions", x: 0, y: 0, w: 4, h: 1 },
 { i: "stats", x: 0, y: 1, w: 4, h: 1 },
 { i: "eod_calendar", x: 0, y: 2, w: 4, h: 2 },
 { i: "suggestions", x: 0, y: 4, w: 2, h: 3 },
 { i: "focus", x: 2, y: 4, w: 2, h: 2 },
 { i: "rocks", x: 0, y: 7, w: 2, h: 3 },
 { i: "tasks", x: 2, y: 6, w: 2, h: 4 },
]

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
 const [isSaving, setIsSaving] = useState(false)
 const [showSettings, setShowSettings] = useState(false)

 // Filter to only enabled widgets
 const enabledWidgets = widgets.filter((w) => w.enabled)
 const enabledLayout = layout.filter((l) =>
 enabledWidgets.some((w) => w.id === l.i)
 )

 const handleLayoutChange = useCallback((newLayout: Layout[]) => {
 if (isEditing) {
 onLayoutChange(newLayout as unknown as LayoutItem[])
 }
 }, [isEditing, onLayoutChange])

 const handleSave = async () => {
 setIsSaving(true)
 try {
 await onSave()
 setIsEditing(false)
 } catch (error) {
 console.error("Failed to save layout:", error)
 } finally {
 setIsSaving(false)
 }
 }

 const getWidgetIcon = (type: DashboardWidget["type"]) => {
 switch (type) {
 case "stats": return BarChart3
 case "rocks": return Target
 case "tasks": return CheckSquare
 case "eod_calendar": return Calendar
 case "focus": return Clock
 case "achievements": return Trophy
 case "quick_actions": return Sparkles
 case "suggestions": return Sparkles
 case "time_tracking": return Clock
 default: return LayoutGrid
 }
 }

 return (
 <div className={cn("relative", className)}>
 {/* Edit Mode Controls */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 {isEditing && (
 <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
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
 <Button size="sm" onClick={handleSave} disabled={isSaving}>
 <Save className="h-4 w-4 mr-1" />
 {isSaving ? "Saving..." : "Save Layout"}
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
 layout={enabledLayout as unknown as Layout[]}
 cols={4}
 rowHeight={100}
 width={1200}
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
 "bg-white  rounded-lg border shadow-sm overflow-hidden",
 isEditing && "ring-2 ring-blue-200 "
 )}
 >
 {isEditing && (
 <div className="widget-drag-handle flex items-center justify-between px-3 py-1.5 bg-slate-50  border-b cursor-move">
 <div className="flex items-center gap-2 text-sm text-slate-600 ">
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
 <LayoutGrid className="h-12 w-12 text-slate-300 mb-4" />
 <p className="text-slate-500 mb-4">No widgets enabled</p>
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
 const getWidgetIcon = (type: DashboardWidget["type"]) => {
 switch (type) {
 case "stats": return BarChart3
 case "rocks": return Target
 case "tasks": return CheckSquare
 case "eod_calendar": return Calendar
 case "focus": return Clock
 case "achievements": return Trophy
 case "quick_actions": return Sparkles
 case "suggestions": return Sparkles
 case "time_tracking": return Clock
 default: return LayoutGrid
 }
 }

 const getWidgetDescription = (type: DashboardWidget["type"]) => {
 switch (type) {
 case "stats": return "Overview of your tasks, rocks, and activity"
 case "rocks": return "Your quarterly goals and progress"
 case "tasks": return "Task list with filtering and quick actions"
 case "eod_calendar": return "Weekly EOD submission calendar"
 case "focus": return "Pomodoro timer for deep work sessions"
 case "achievements": return "Gamification badges and points"
 case "quick_actions": return "Quick access buttons for common actions"
 case "suggestions": return "AI-powered task recommendations"
 case "time_tracking": return "Track time spent on tasks"
 default: return ""
 }
 }

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
 widget.enabled
 ? "bg-blue-50  border-blue-200 "
 : "hover:bg-slate-50 "
 )}
 >
 <div className={cn(
 "p-2 rounded-lg",
 widget.enabled
 ? "bg-blue-100 "
 : "bg-slate-100 "
 )}>
 <Icon className={cn(
 "h-5 w-5",
 widget.enabled ? "text-blue-600" : "text-slate-500"
 )} />
 </div>
 <div className="flex-1 min-w-0">
 <Label
 htmlFor={`widget-${widget.id}`}
 className="font-medium cursor-pointer"
 >
 {widget.title}
 </Label>
 <p className="text-sm text-slate-500 ">
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

// Hook for managing dashboard layout state
export function useDashboardLayout(
 initialWidgets: DashboardWidget[] = DEFAULT_WIDGETS,
 initialLayout: LayoutItem[] = DEFAULT_LAYOUT
) {
 const [widgets, setWidgets] = useState(initialWidgets)
 const [layout, setLayout] = useState(initialLayout)
 const [isEditing, setIsEditing] = useState(false)

 const handleWidgetToggle = useCallback((widgetId: string, enabled: boolean) => {
 setWidgets((prev) =>
 prev.map((w) => (w.id === widgetId ? { ...w, enabled } : w))
 )

 // Add to layout if enabling
 if (enabled) {
 const widget = widgets.find((w) => w.id === widgetId)
 if (widget && !layout.some((l) => l.i === widgetId)) {
 // Find the lowest y position to add new widget
 const maxY = Math.max(...layout.map((l) => l.y + l.h), 0)
 setLayout((prev) => [
 ...prev,
 {
 i: widgetId,
 x: 0,
 y: maxY,
 w: widget.minW || 2,
 h: widget.minH || 2,
 },
 ])
 }
 }
 }, [widgets, layout])

 const handleLayoutChange = useCallback((newLayout: Layout[]) => {
 setLayout(newLayout as unknown as LayoutItem[])
 }, [])

 const handleReset = useCallback(() => {
 setWidgets(DEFAULT_WIDGETS)
 setLayout(DEFAULT_LAYOUT)
 }, [])

 return {
 widgets,
 layout,
 isEditing,
 setIsEditing,
 handleWidgetToggle,
 handleLayoutChange,
 handleReset,
 }
}
