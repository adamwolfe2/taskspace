"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select"
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Rock, RockDependency } from "@/lib/types"
import { Plus, X, ArrowRight, Link2, Unlink, AlertTriangle, Target } from "lucide-react"

interface RockDependenciesProps {
 rock: Rock
 allRocks: Rock[]
 dependencies: RockDependency[]
 onAddDependency: (dependsOnRockId: string, type: "blocks" | "soft_dependency") => Promise<void>
 onRemoveDependency: (dependencyId: string) => Promise<void>
 disabled?: boolean
 className?: string
}

export function RockDependencies({
 rock,
 allRocks,
 dependencies,
 onAddDependency,
 onRemoveDependency,
 disabled = false,
 className,
}: RockDependenciesProps) {
 const [isAdding, setIsAdding] = useState(false)
 const [selectedRockId, setSelectedRockId] = useState<string>("")
 const [dependencyType, setDependencyType] = useState<"blocks" | "soft_dependency">("blocks")
 const [isSubmitting, setIsSubmitting] = useState(false)

 // Filter out the current rock and already-linked rocks
 const linkedRockIds = new Set(dependencies.map((d) => d.dependsOnRockId))
 const availableRocks = allRocks.filter(
 (r) => r.id !== rock.id && !linkedRockIds.has(r.id)
 )

 // Check for circular dependencies
 const wouldCreateCircular = useMemo(() => {
 if (!selectedRockId) return false

 // Simple check: see if the selected rock depends on the current rock
 const checkCircular = (checkRockId: string, visited: Set<string> = new Set()): boolean => {
 if (visited.has(checkRockId)) return false
 visited.add(checkRockId)

 // Find dependencies of this rock
 const rockDeps = dependencies.filter((d) => d.rockId === checkRockId)
 for (const dep of rockDeps) {
 if (dep.dependsOnRockId === rock.id) return true
 if (checkCircular(dep.dependsOnRockId, visited)) return true
 }
 return false
 }

 return checkCircular(selectedRockId)
 }, [selectedRockId, dependencies, rock.id])

 const handleAdd = async () => {
 if (!selectedRockId || isSubmitting || wouldCreateCircular) return

 setIsSubmitting(true)
 try {
 await onAddDependency(selectedRockId, dependencyType)
 setSelectedRockId("")
 setIsAdding(false)
 } catch (error) {
 console.error("Failed to add dependency:", error)
 } finally {
 setIsSubmitting(false)
 }
 }

 const handleRemove = async (dependencyId: string) => {
 try {
 await onRemoveDependency(dependencyId)
 } catch (error) {
 console.error("Failed to remove dependency:", error)
 }
 }

 const getRockStatusColor = (status: Rock["status"]) => {
 switch (status) {
 case "on-track":
 return "bg-emerald-100 text-emerald-700  "
 case "at-risk":
 return "bg-amber-100 text-amber-700  "
 case "blocked":
 return "bg-red-100 text-red-700  "
 case "completed":
 return "bg-slate-100 text-slate-700  "
 default:
 return "bg-slate-100 text-slate-700"
 }
 }

 return (
 <div className={cn("space-y-4", className)}>
 <div className="flex items-center justify-between">
 <h4 className="text-sm font-medium text-slate-700  flex items-center gap-2">
 <Link2 className="h-4 w-4" />
 Dependencies
 </h4>
 {!disabled && availableRocks.length > 0 && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setIsAdding(!isAdding)}
 className="h-7 text-xs"
 >
 <Plus className="h-3.5 w-3.5 mr-1" />
 Add
 </Button>
 )}
 </div>

 {/* Existing Dependencies */}
 {dependencies.length > 0 ? (
 <div className="space-y-2">
 {dependencies.map((dep) => {
 const dependsOnRock = allRocks.find((r) => r.id === dep.dependsOnRockId)
 if (!dependsOnRock) return null

 return (
 <div
 key={dep.id}
 className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 "
 >
 <div className="flex-1 flex items-center gap-2 min-w-0">
 <Target className="h-4 w-4 text-slate-400 shrink-0" />
 <span className="truncate text-sm text-slate-700 ">
 {dependsOnRock.title}
 </span>
 <Badge
 variant="outline"
 className={cn("shrink-0 text-xs", getRockStatusColor(dependsOnRock.status))}
 >
 {dependsOnRock.status.replace("-", "")}
 </Badge>
 <Badge
 variant="secondary"
 className="shrink-0 text-xs"
 >
 {dep.dependencyType === "blocks" ? "Blocking" : "Related"}
 </Badge>
 </div>
 {!disabled && (
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 variant="ghost"
 size="icon"
 className="h-7 w-7 text-slate-400 hover:text-red-500"
 onClick={() => handleRemove(dep.id)}
 >
 <Unlink className="h-3.5 w-3.5" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>Remove dependency</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 )}
 </div>
 )
 })}
 </div>
 ) : (
 !isAdding && (
 <p className="text-sm text-slate-500  italic">
 No dependencies
 </p>
 )
 )}

 {/* Add Dependency Form */}
 {isAdding && (
 <div className="space-y-3 p-3 border rounded-lg bg-slate-50 ">
 <div className="flex items-center gap-2 text-sm text-slate-600 ">
 <span>This rock depends on</span>
 <ArrowRight className="h-4 w-4" />
 </div>

 <Select value={selectedRockId} onValueChange={setSelectedRockId}>
 <SelectTrigger className="bg-white ">
 <SelectValue placeholder="Select a rock..." />
 </SelectTrigger>
 <SelectContent>
 {availableRocks.map((r) => (
 <SelectItem key={r.id} value={r.id}>
 <div className="flex items-center gap-2">
 <span>{r.title}</span>
 <Badge
 variant="outline"
 className={cn("text-xs", getRockStatusColor(r.status))}
 >
 {r.progress}%
 </Badge>
 </div>
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Select
 value={dependencyType}
 onValueChange={(v) => setDependencyType(v as "blocks" | "soft_dependency")}
 >
 <SelectTrigger className="bg-white ">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="blocks">
 <div className="flex items-center gap-2">
 <span>Blocking</span>
 <span className="text-xs text-slate-500">- Must complete first</span>
 </div>
 </SelectItem>
 <SelectItem value="soft_dependency">
 <div className="flex items-center gap-2">
 <span>Related</span>
 <span className="text-xs text-slate-500">- Soft dependency</span>
 </div>
 </SelectItem>
 </SelectContent>
 </Select>

 {wouldCreateCircular && (
 <div className="flex items-center gap-2 text-sm text-amber-600 ">
 <AlertTriangle className="h-4 w-4" />
 This would create a circular dependency
 </div>
 )}

 <div className="flex items-center gap-2">
 <Button
 size="sm"
 onClick={handleAdd}
 disabled={!selectedRockId || isSubmitting || wouldCreateCircular}
 >
 {isSubmitting ? "Adding..." : "Add Dependency"}
 </Button>
 <Button
 size="sm"
 variant="outline"
 onClick={() => {
 setIsAdding(false)
 setSelectedRockId("")
 }}
 >
 Cancel
 </Button>
 </div>
 </div>
 )}

 {availableRocks.length === 0 && !isAdding && dependencies.length > 0 && (
 <p className="text-xs text-slate-500 ">
 All rocks are already linked
 </p>
 )}
 </div>
 )
}

// Compact display of dependencies for cards
export function RockDependencyBadges({
 dependencies,
 allRocks,
 className,
}: {
 dependencies: RockDependency[]
 allRocks: Rock[]
 className?: string
}) {
 if (dependencies.length === 0) return null

 const blockingDeps = dependencies.filter((d) => d.dependencyType === "blocks")
 const softDeps = dependencies.filter((d) => d.dependencyType === "soft_dependency")

 return (
 <TooltipProvider>
 <div className={cn("flex items-center gap-1.5", className)}>
 {blockingDeps.length > 0 && (
 <Tooltip>
 <TooltipTrigger asChild>
 <Badge
 variant="outline"
 className="text-xs bg-red-50 text-red-700 border-red-200   "
 >
 <Link2 className="h-3 w-3 mr-1" />
 {blockingDeps.length} blocking
 </Badge>
 </TooltipTrigger>
 <TooltipContent>
 <div className="text-xs space-y-1">
 <p className="font-medium">Blocked by:</p>
 {blockingDeps.map((dep) => {
 const rock = allRocks.find((r) => r.id === dep.dependsOnRockId)
 return rock ? <p key={dep.id}>• {rock.title}</p> : null
 })}
 </div>
 </TooltipContent>
 </Tooltip>
 )}
 {softDeps.length > 0 && (
 <Tooltip>
 <TooltipTrigger asChild>
 <Badge
 variant="outline"
 className="text-xs bg-slate-50 text-slate-600  "
 >
 <Link2 className="h-3 w-3 mr-1" />
 {softDeps.length} related
 </Badge>
 </TooltipTrigger>
 <TooltipContent>
 <div className="text-xs space-y-1">
 <p className="font-medium">Related to:</p>
 {softDeps.map((dep) => {
 const rock = allRocks.find((r) => r.id === dep.dependsOnRockId)
 return rock ? <p key={dep.id}>• {rock.title}</p> : null
 })}
 </div>
 </TooltipContent>
 </Tooltip>
 )}
 </div>
 </TooltipProvider>
 )
}
