"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  getInitials,
  getAvatarColor,
  parseRocks,
  calculateRockProgress,
} from "@/lib/org-chart/utils"
import type { OrgChartEmployee } from "@/lib/org-chart/types"
import {
  Mail,
  Building2,
  Users,
  Target,
  Edit2,
  Save,
  X,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EmployeeModalProps {
  employee: OrgChartEmployee | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onProgressChange: (
    employeeName: string,
    rockIndex: number,
    bulletIndex: number,
    completed: boolean
  ) => void
  progressData: Map<string, boolean>
  allEmployees?: OrgChartEmployee[]
  onEmployeeClick?: (employee: OrgChartEmployee) => void
  isAdmin?: boolean
}

export function EmployeeModal({
  employee,
  open,
  onOpenChange,
  onProgressChange,
  progressData,
  allEmployees = [],
  onEmployeeClick,
  isAdmin = false,
}: EmployeeModalProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [rocksText, setRocksText] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (employee) {
      setRocksText(employee.rocks || "")
    }
  }, [employee])

  if (!employee) return null

  const avatarColor = getAvatarColor(employee.fullName)
  const initials = getInitials(employee.fullName)
  const rocks = parseRocks(employee.rocks)

  // Find supervisor
  const supervisor = employee.supervisor
    ? allEmployees.find(
        (e) =>
          e.fullName.toLowerCase() === employee.supervisor?.toLowerCase()
      )
    : null

  // Find direct reports
  const directReports = allEmployees.filter(
    (e) => e.supervisor?.toLowerCase() === employee.fullName.toLowerCase()
  )

  // Calculate progress for this employee
  const employeeProgressMap = new Map<string, boolean>()
  progressData.forEach((completed, key) => {
    const prefix = `${employee.fullName}-`
    if (key.startsWith(prefix)) {
      const rest = key.slice(prefix.length)
      employeeProgressMap.set(rest, completed)
    }
  })
  const progress = calculateRockProgress(rocks, employeeProgressMap)

  const handleSaveRocks = async () => {
    if (!employee) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/org-chart/employees/${employee.id}/rocks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ rocks: rocksText }),
      })

      if (!response.ok) {
        throw new Error("Failed to save rocks")
      }

      toast({
        title: "Rocks updated",
        description: "Changes saved to Airtable",
      })
      setIsEditing(false)
      // Update local state by triggering a refresh
      window.location.reload()
    } catch {
      toast({
        title: "Error",
        description: "Failed to save rocks. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulletToggle = (rockIndex: number, bulletIndex: number, currentValue: boolean) => {
    onProgressChange(employee.fullName, rockIndex, bulletIndex, !currentValue)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            {/* Header */}
            <DialogHeader className="mb-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold flex-shrink-0",
                    avatarColor.bg,
                    avatarColor.text
                  )}
                >
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    {employee.fullName}
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-1">{employee.jobTitle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {employee.department}
                    </Badge>
                    {rocks.length > 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          progress >= 80
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : progress >= 50
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        <Target className="h-3 w-3 mr-1" />
                        {progress}% Complete
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Contact & Info */}
            {employee.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                <Mail className="h-4 w-4 text-slate-400" />
                <a href={`mailto:${employee.email}`} className="hover:underline">
                  {employee.email}
                </a>
              </div>
            )}

            {/* Job Description */}
            {employee.notes && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-700 mb-2">
                  Responsibilities
                </h4>
                <p className="text-sm text-slate-600">{employee.notes}</p>
              </div>
            )}

            {/* Extra Info */}
            {employee.extraInfo && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-700 mb-2">
                  Additional Information
                </h4>
                <p className="text-sm text-slate-600">{employee.extraInfo}</p>
              </div>
            )}

            <Separator className="my-6" />

            {/* Reporting Structure */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Reporting Structure
              </h4>
              <div className="space-y-2">
                {/* Supervisor */}
                {supervisor ? (
                  <button
                    onClick={() => onEmployeeClick?.(supervisor)}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors"
                    aria-label={`View supervisor: ${supervisor.fullName}`}
                  >
                    <span className="text-slate-400">Reports to:</span>
                    <span className="font-medium">{supervisor.fullName}</span>
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                ) : employee.supervisor ? (
                  <p className="text-sm text-slate-500">
                    Reports to: {employee.supervisor}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Top of organization
                  </p>
                )}

                {/* Direct Reports */}
                {directReports.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-slate-400 mb-2">
                      {directReports.length} Direct Report
                      {directReports.length !== 1 ? "s" : ""}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {directReports.map((report) => (
                        <button
                          key={report.id}
                          onClick={() => onEmployeeClick?.(report)}
                          className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          aria-label={`View direct report: ${report.fullName}`}
                        >
                          {report.fullName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Rocks Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Quarterly Rocks
                </h4>
                {isAdmin && !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit Rocks
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Textarea
                    value={rocksText}
                    onChange={(e) => setRocksText(e.target.value)}
                    placeholder="Rock 1: Title&#10;* Task 1&#10;* Task 2&#10;&#10;Rock 2: Another Title&#10;* Task 1"
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        setRocksText(employee.rocks || "")
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveRocks}
                      disabled={isSaving}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : rocks.length > 0 ? (
                <div className="space-y-4">
                  {rocks.map((rock, rockIdx) => (
                    <div
                      key={rockIdx}
                      className="bg-slate-50 rounded-lg p-4"
                    >
                      <h5 className="font-medium text-slate-900 mb-2">
                        {rock.title}
                      </h5>
                      {rock.bullets.length > 0 && (
                        <div className="space-y-2">
                          {rock.bullets.map((bullet, bulletIdx) => {
                            const key = `${rockIdx}-${bulletIdx}`
                            const isCompleted = employeeProgressMap.get(key) || false
                            return (
                              <div
                                key={bulletIdx}
                                className="flex items-start gap-3"
                              >
                                <Checkbox
                                  checked={isCompleted}
                                  onCheckedChange={() =>
                                    handleBulletToggle(rockIdx, bulletIdx, isCompleted)
                                  }
                                  className="mt-0.5"
                                />
                                <span
                                  className={cn(
                                    "text-sm",
                                    isCompleted
                                      ? "text-slate-400 line-through"
                                      : "text-slate-600"
                                  )}
                                >
                                  {bullet}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  No rocks defined yet
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
