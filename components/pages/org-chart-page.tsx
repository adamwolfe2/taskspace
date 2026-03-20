"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import * as Sentry from "@sentry/nextjs"
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch"
import useSWR from "swr"
import { OrgChart } from "@/components/org-chart/org-chart"
import { OrgChartUploadWizard } from "@/components/org-chart/org-chart-upload-wizard"
import { EmployeeModal } from "@/components/org-chart/employee-modal"
import { ChatInterface } from "@/components/org-chart/chat-interface"
import { ZoomControls } from "@/components/org-chart/zoom-controls"
import { StatusIndicator } from "@/components/org-chart/status-indicator"
import { buildOrgTree } from "@/lib/org-chart/utils"
import type { OrgChartEmployee } from "@/lib/org-chart/types"
import { Loader2, RefreshCw, Users, ArrowRightLeft, Upload, ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useApp } from "@/lib/contexts/app-context"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useToast } from "@/hooks/use-toast"
import { CONFIG } from "@/lib/config"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { DEMO_ORG_CHART, DEMO_READONLY_MESSAGE } from "@/lib/demo-data"

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
})

function mapDemoOrgChart(): OrgChartEmployee[] {
  const nameById = new Map(DEMO_ORG_CHART.map((e) => [e.id, e.name]))
  return DEMO_ORG_CHART.map((e) => {
    const nameParts = e.name.split(" ")
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(" ")
    const rocks = e.seats
      .map((seat, i) => {
        const bullets = seat.bullets.map((b) => `* ${b}`).join("\n")
        return `Rock ${i + 1}: ${seat.name}\n${bullets}`
      })
      .join("\n")
    return {
      id: e.id,
      firstName,
      lastName,
      fullName: e.name,
      supervisor: e.managerId ? nameById.get(e.managerId) || null : null,
      department: e.department,
      jobTitle: e.title,
      notes: "",
      rocks,
    }
  })
}

export function OrgChartPage() {
  const { currentUser, isDemoMode } = useApp()
  const { currentWorkspace } = useWorkspaces()
  const { toast } = useToast()
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  const [selectedEmployee, setSelectedEmployee] = useState<OrgChartEmployee | null>(null)
  const [highlightedEmployee, setHighlightedEmployee] = useState<string | null>(null)
  const [progressData, setProgressData] = useState<Map<string, boolean>>(new Map())
  const [isSyncing, setIsSyncing] = useState(false)
  const [showUploadWizard, setShowUploadWizard] = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null)

  // Fetch employees for current workspace
  const {
    data: employeeData,
    error: employeeError,
    isLoading: employeesLoading,
    mutate: refreshEmployees,
  } = useSWR<{ success: boolean; employees: OrgChartEmployee[] }>(
    !isDemoMode && currentWorkspace ? `/api/org-chart/employees?workspaceId=${currentWorkspace.id}` : null,
    fetcher,
    { refreshInterval: CONFIG.polling.fast }
  )

  // Fetch progress data
  const { data: progressResponse, mutate: refreshProgress } = useSWR(
    !isDemoMode ? "/api/org-chart/progress" : null,
    fetcher,
    { refreshInterval: CONFIG.polling.realtime }
  )

  // Update progress map when data changes
  useEffect(() => {
    if (progressResponse?.success && progressResponse.progress) {
      const newMap = new Map<string, boolean>()
      progressResponse.progress.forEach((p: { employeeName: string; rockIndex: number; bulletIndex: number; completed: boolean }) => {
        const key = `${p.employeeName}-${p.rockIndex}-${p.bulletIndex}`
        newMap.set(key, p.completed)
      })
      setProgressData(newMap)
    }
  }, [progressResponse])

  const employees = isDemoMode ? mapDemoOrgChart() : (employeeData?.employees || [])
  const orgTree = buildOrgTree(employees)

  // Show upload wizard if no employees and user is admin
  if (!isDemoMode && isAdmin && employees.length === 0 && !employeesLoading && !showUploadWizard) {
    return (
      <div className="p-4 md:p-6">
        <OrgChartUploadWizard
          onUploadComplete={() => {
            setShowUploadWizard(false)
            refreshEmployees()
          }}
        />
      </div>
    )
  }

  // Show upload wizard modal if triggered
  if (showUploadWizard) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <Button variant="outline" onClick={() => setShowUploadWizard(false)}>
            <><ArrowLeft className="h-4 w-4 mr-1" />Back to Org Chart</>
          </Button>
        </div>
        <OrgChartUploadWizard
          onUploadComplete={() => {
            setShowUploadWizard(false)
            refreshEmployees()
          }}
        />
      </div>
    )
  }

  // Handle zoom to employee
  const handleZoomToEmployee = useCallback(
    (employeeName: string) => {
      const card = cardRefs.current.get(employeeName.toLowerCase())
      if (card && transformRef.current) {
        // Get card position
        const rect = card.getBoundingClientRect()
        const container = card.closest(".transform-wrapper")
        if (container) {
          const containerRect = container.getBoundingClientRect()

          // Calculate center position
          const centerX = containerRect.width / 2
          const centerY = containerRect.height / 2
          const cardCenterX = rect.left - containerRect.left + rect.width / 2
          const cardCenterY = rect.top - containerRect.top + rect.height / 2

          // Zoom and center
          transformRef.current.setTransform(
            centerX - cardCenterX,
            centerY - cardCenterY,
            1,
            300 // Animation duration
          )
        }

        // Highlight the employee briefly
        setHighlightedEmployee(employeeName)
        setTimeout(() => setHighlightedEmployee(null), 3000)
      }
    },
    []
  )

  // Handle progress change
  const handleProgressChange = async (
    employeeName: string,
    rockIndex: number,
    bulletIndex: number,
    completed: boolean
  ) => {
    if (isDemoMode) {
      toast({ title: "Demo mode", description: DEMO_READONLY_MESSAGE })
      return
    }
    // Optimistic update
    const key = `${employeeName}-${rockIndex}-${bulletIndex}`
    setProgressData((prev) => {
      const newMap = new Map(prev)
      newMap.set(key, completed)
      return newMap
    })

    // Save to server
    try {
      await fetch("/api/org-chart/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          employeeName,
          rockIndex,
          bulletIndex,
          completed,
          updatedBy: currentUser?.name,
        }),
      })
      // Refresh progress data
      refreshProgress()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      })
      Sentry.captureException(error)
      // Revert on error
      setProgressData((prev) => {
        const newMap = new Map(prev)
        newMap.set(key, !completed)
        return newMap
      })
    }
  }

  // Handle employee click from modal
  const handleEmployeeClickFromModal = (employee: OrgChartEmployee) => {
    setSelectedEmployee(null)
    setTimeout(() => {
      handleZoomToEmployee(employee.fullName)
      setSelectedEmployee(employee)
    }, 300)
  }

  // Sync rocks from workspace to org chart
  const handleSyncRocks = async () => {
    if (isDemoMode) {
      toast({ title: "Demo mode", description: DEMO_READONLY_MESSAGE })
      return
    }
    if (!currentWorkspace) return
    setIsSyncing(true)
    try {
      const response = await fetch("/api/org-chart/sync-rocks", {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast({
          title: "Rocks synced",
          description: `Synced ${data.results.synced.length} employees. ${data.results.notFound.length} not found in org chart.`,
        })
        // Refresh employees to show updated rocks
        refreshEmployees()
      } else {
        toast({
          title: "Sync failed",
          description: data.error || "Failed to sync rocks",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Sync failed",
        description: "Failed to sync rocks from workspace",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="space-y-6 w-full max-w-2xl px-8">
          <Skeleton className="h-7 w-56 mx-auto" />
          <div className="flex justify-center">
            <div className="space-y-4 w-full">
              <Skeleton className="h-16 w-40 mx-auto rounded-lg" />
              <div className="flex justify-center gap-8">
                <Skeleton className="h-14 w-36 rounded-lg" />
                <Skeleton className="h-14 w-36 rounded-lg" />
              </div>
              <div className="flex justify-center gap-6">
                <Skeleton className="h-12 w-28 rounded-lg" />
                <Skeleton className="h-12 w-28 rounded-lg" />
                <Skeleton className="h-12 w-28 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isDemoMode && (employeeError || !employeeData?.success)) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Users className="h-12 w-12 text-slate-300" />
          <h2 className="text-xl font-semibold text-slate-700">
            Failed to load organization chart
          </h2>
          <p className="text-slate-500 max-w-md">
            There was a problem loading the employee data. Please try again.
          </p>
          <Button onClick={() => refreshEmployees()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="relative h-[calc(100vh-8rem)] -m-4 md:-m-6">
      {/* Header bar */}
      <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg">
            Organization Chart
          </h1>
          <StatusIndicator />
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadWizard(true)}
                className="bg-white/80 backdrop-blur"
                title="Upload or update org chart"
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload Org Chart
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncRocks}
                disabled={isSyncing}
                className="bg-white/80 backdrop-blur"
                title="Sync rocks from workspace members to org chart"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4 mr-1" />
                )}
                Sync Rocks
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshEmployees()}
            className="bg-white/80 backdrop-blur"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Zoomable canvas */}
      <TransformWrapper
        ref={transformRef}
        initialScale={0.5}
        minScale={0.2}
        maxScale={2}
        limitToBounds={false}
        centerOnInit={true}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperStyle={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              }}
              contentStyle={{
                width: "100%",
                height: "100%",
              }}
              wrapperClass="transform-wrapper"
            >
              <div className="flex items-center justify-center min-h-full min-w-full py-24">
                <OrgChart
                  root={orgTree}
                  onEmployeeClick={setSelectedEmployee}
                  highlightedEmployee={highlightedEmployee}
                  progressData={progressData}
                  cardRefs={cardRefs}
                />
              </div>
            </TransformComponent>

            <ZoomControls
              onZoomIn={() => zoomIn()}
              onZoomOut={() => zoomOut()}
              onReset={() => resetTransform()}
            />
          </>
        )}
      </TransformWrapper>

      {/* Chat interface */}
      <ChatInterface
        employees={employees}
        onMentionClick={handleZoomToEmployee}
      />

      {/* Employee modal */}
      <EmployeeModal
        employee={selectedEmployee}
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
        onProgressChange={handleProgressChange}
        progressData={progressData}
        allEmployees={employees}
        onEmployeeClick={handleEmployeeClickFromModal}
        isAdmin={isAdmin}
      />
    </div>
    </ErrorBoundary>
  )
}
