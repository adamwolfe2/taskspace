"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { BarChart3, TrendingUp, Users, AlertTriangle } from "lucide-react"
import type { EODReport, EODInsight, Rock, TeamMember } from "@/lib/types"

interface TeamAnalyticsChartsProps {
  eodReports: EODReport[]
  insights: EODInsight[]
  rocks: Rock[]
  teamMembers: TeamMember[]
  days?: number
}

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#6b7280",
  negative: "#ef4444",
  stressed: "#f59e0b",
}

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export function TeamAnalyticsCharts({
  eodReports,
  insights,
  rocks,
  teamMembers,
  days = 14,
}: TeamAnalyticsChartsProps) {
  // Calculate date range
  const dateRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    return { start, end }
  }, [days])

  // Filter reports to date range
  const filteredReports = useMemo(() => {
    return eodReports.filter(r => {
      const date = new Date(r.date)
      return date >= dateRange.start && date <= dateRange.end
    })
  }, [eodReports, dateRange])

  // EOD Submission Trend Data
  const submissionTrendData = useMemo(() => {
    const activeMembers = teamMembers.filter(m => m.status === "active" && m.role === "member")
    const memberCount = Math.max(activeMembers.length, 1)
    const dateMap = new Map<string, number>()

    // Initialize all dates with 0
    for (let d = new Date(dateRange.start); d <= dateRange.end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      dateMap.set(dateStr, 0)
    }

    // Count submissions per day
    filteredReports.forEach(report => {
      const current = dateMap.get(report.date) || 0
      dateMap.set(report.date, current + 1)
    })

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        submissions: count,
        rate: Math.round((count / memberCount) * 100),
      }))
  }, [filteredReports, teamMembers, dateRange])

  // Sentiment Distribution Data
  const sentimentData = useMemo(() => {
    const sentimentCounts = {
      positive: 0,
      neutral: 0,
      negative: 0,
      stressed: 0,
    }

    insights.forEach(insight => {
      if (insight.sentiment in sentimentCounts) {
        sentimentCounts[insight.sentiment as keyof typeof sentimentCounts]++
      }
    })

    return Object.entries(sentimentCounts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: SENTIMENT_COLORS[name as keyof typeof SENTIMENT_COLORS],
      }))
  }, [insights])

  // Rock Progress by Team Member
  const rockProgressData = useMemo(() => {
    const memberMap = new Map(teamMembers.map(m => [m.id, m]))

    const memberProgress: Record<string, { name: string; avgProgress: number; count: number }> = {}

    rocks.forEach(rock => {
      const member = memberMap.get(rock.userId)
      if (!member) return

      if (!memberProgress[rock.userId]) {
        memberProgress[rock.userId] = { name: member.name, avgProgress: 0, count: 0 }
      }

      memberProgress[rock.userId].avgProgress += rock.progress
      memberProgress[rock.userId].count++
    })

    return Object.values(memberProgress)
      .map(m => ({
        name: m.name.split(" ")[0], // First name only
        progress: Math.round(m.avgProgress / m.count),
      }))
      .sort((a, b) => b.progress - a.progress)
  }, [rocks, teamMembers])

  // Escalation and Blocker Trend
  const escalationTrendData = useMemo(() => {
    const dateMap = new Map<string, { escalations: number; blockers: number }>()

    // Initialize dates
    for (let d = new Date(dateRange.start); d <= dateRange.end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      dateMap.set(dateStr, { escalations: 0, blockers: 0 })
    }

    // Count escalations
    filteredReports.forEach(report => {
      if (report.needsEscalation) {
        const current = dateMap.get(report.date)
        if (current) {
          current.escalations++
        }
      }
    })

    // Count blockers from insights
    insights.forEach(insight => {
      const report = eodReports.find(r => r.id === insight.eodReportId)
      if (report && insight.blockers && insight.blockers.length > 0) {
        const current = dateMap.get(report.date)
        if (current) {
          current.blockers += insight.blockers.length
        }
      }
    })

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        ...data,
      }))
  }, [filteredReports, insights, eodReports, dateRange])

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalReports = filteredReports.length
    const escalationCount = filteredReports.filter(r => r.needsEscalation).length
    const avgSentiment = insights.length > 0
      ? Math.round(insights.reduce((sum, i) => sum + i.sentimentScore, 0) / insights.length)
      : 0
    const blockerCount = insights.reduce((sum, i) => sum + (i.blockers?.length || 0), 0)

    return { totalReports, escalationCount, avgSentiment, blockerCount }
  }, [filteredReports, insights])

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summaryStats.totalReports}</div>
            <p className="text-xs text-muted-foreground">EOD Reports ({days} days)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{summaryStats.avgSentiment}</div>
            <p className="text-xs text-muted-foreground">Avg Sentiment Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{summaryStats.escalationCount}</div>
            <p className="text-xs text-muted-foreground">Escalations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{summaryStats.blockerCount}</div>
            <p className="text-xs text-muted-foreground">Blockers Reported</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              EOD Submission Rate
            </CardTitle>
            <CardDescription>Daily submission rate over {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={submissionTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Submission Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sentiment Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Team Sentiment
            </CardTitle>
            <CardDescription>Distribution of team mood from AI analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No sentiment data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rock Progress by Member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Rock Progress by Team Member
            </CardTitle>
            <CardDescription>Average rock completion percentage</CardDescription>
          </CardHeader>
          <CardContent>
            {rockProgressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={rockProgressData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value}%`, "Progress"]}
                  />
                  <Bar dataKey="progress" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {rockProgressData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.progress >= 70 ? "#22c55e" : entry.progress >= 40 ? "#f59e0b" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No rock data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escalation and Blocker Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Escalations & Blockers
            </CardTitle>
            <CardDescription>Issues requiring attention over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={escalationTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="escalations" fill="#f59e0b" name="Escalations" radius={[4, 4, 0, 0]} />
                <Bar dataKey="blockers" fill="#ef4444" name="Blockers" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
