"use client"

import { useState, useEffect } from "react"
import { TeamAnalyticsCharts } from "@/components/ai/team-analytics-charts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api/client"
import { BarChart3, Calendar, RefreshCw, Loader2 } from "lucide-react"
import type { TeamMember, EODReport, Rock, EODInsight, AssignedTask } from "@/lib/types"

interface AnalyticsPageProps {
  teamMembers: TeamMember[]
  eodReports: EODReport[]
  rocks: Rock[]
  assignedTasks?: AssignedTask[]
}

export function AnalyticsPage({ teamMembers, eodReports, rocks, assignedTasks = [] }: AnalyticsPageProps) {
  const [insights, setInsights] = useState<EODInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState<"7" | "14" | "30">("14")

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true)
      try {
        const data = await api.ai.getInsights(parseInt(selectedRange))
        setInsights(data)
      } catch (err) {
        console.error("Failed to fetch insights:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchInsights()
  }, [selectedRange])

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const data = await api.ai.getInsights(parseInt(selectedRange))
      setInsights(data)
    } catch (err) {
      console.error("Failed to refresh:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header with responsive layout */}
      <div className="flex flex-col gap-4">
        {/* Title and subtitle */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Team Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Insights and metrics from your team's performance
            </p>
          </div>
        </div>

        {/* Controls: Time range tabs and refresh button */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <Tabs value={selectedRange} onValueChange={(v) => setSelectedRange(v as typeof selectedRange)}>
            <TabsList className="bg-gray-100/80">
              <TabsTrigger value="7" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">7 days</span>
                <span className="sm:hidden">7d</span>
              </TabsTrigger>
              <TabsTrigger value="14" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">14 days</span>
                <span className="sm:hidden">14d</span>
              </TabsTrigger>
              <TabsTrigger value="30" className="gap-1.5 text-xs sm:text-sm whitespace-nowrap">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">30 days</span>
                <span className="sm:hidden">30d</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex-shrink-0 h-9 w-9"
            aria-label="Refresh analytics"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isLoading && insights.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <TeamAnalyticsCharts
          eodReports={eodReports}
          insights={insights}
          rocks={rocks}
          teamMembers={teamMembers}
          days={parseInt(selectedRange)}
          assignedTasks={assignedTasks}
        />
      )}
    </div>
  )
}
