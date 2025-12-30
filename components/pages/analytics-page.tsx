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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-slate-600" />
            </div>
            Team Analytics
          </h1>
          <p className="text-slate-500 mt-1">
            Insights and metrics from your team's performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={selectedRange} onValueChange={(v) => setSelectedRange(v as typeof selectedRange)}>
            <TabsList>
              <TabsTrigger value="7" className="gap-1">
                <Calendar className="h-3 w-3" />
                7 days
              </TabsTrigger>
              <TabsTrigger value="14" className="gap-1">
                <Calendar className="h-3 w-3" />
                14 days
              </TabsTrigger>
              <TabsTrigger value="30" className="gap-1">
                <Calendar className="h-3 w-3" />
                30 days
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
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
