"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Users,
  Copy,
  RefreshCw,
  Slack,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { EODReport, TeamMember, StandupMemberReport } from "@/lib/types"
import { format, subDays, parseISO, isYesterday, isToday } from "date-fns"

interface StandupGeneratorProps {
  eodReports: EODReport[]
  teamMembers: TeamMember[]
  onShareToSlack?: (content: string) => Promise<void>
  onShareViaEmail?: (content: string, recipients: string[]) => Promise<void>
  className?: string
}

export function StandupGenerator({
  eodReports,
  teamMembers,
  onShareToSlack,
  onShareViaEmail: _onShareViaEmail,
  className,
}: StandupGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [standupContent, setStandupContent] = useState("")
  const [outputFormat, setOutputFormat] = useState<"text" | "slack" | "markdown">("slack")

  const today = new Date()
  const yesterday = subDays(today, 1)

  // Generate standup from EOD reports
  const generateStandup = useMemo(() => {
    const memberReports: StandupMemberReport[] = []

    teamMembers.forEach((member) => {
      // Get yesterday's EOD
      const yesterdayReport = eodReports.find((r) => {
        const reportDate = parseISO(r.date)
        return r.userId === member.id && isYesterday(reportDate)
      })

      // Get today's EOD (if exists)
      const todayReport = eodReports.find((r) => {
        const reportDate = parseISO(r.date)
        return r.userId === member.id && isToday(reportDate)
      })

      const yesterday: string[] = yesterdayReport?.tasks?.map((t) => t.text) || []
      const todayPriorities: string[] =
        yesterdayReport?.tomorrowPriorities?.map((p) => p.text) ||
        todayReport?.tasks?.map((t) => t.text) ||
        []
      const blockers: string[] = []

      if (yesterdayReport?.needsEscalation && yesterdayReport.escalationNote) {
        blockers.push(yesterdayReport.escalationNote)
      }
      if (yesterdayReport?.challenges) {
        blockers.push(yesterdayReport.challenges)
      }

      if (yesterday.length > 0 || todayPriorities.length > 0 || blockers.length > 0) {
        memberReports.push({
          memberId: member.id,
          memberName: member.name,
          yesterday,
          today: todayPriorities,
          blockers,
        })
      }
    })

    return memberReports
  }, [eodReports, teamMembers])

  // Format standup content
  const formatStandup = (reports: StandupMemberReport[], format: "text" | "slack" | "markdown") => {
    const dateStr = `${formatDate(yesterday)} - ${formatDate(today)}`
    let content = ""

    if (format === "slack") {
      content = `:sunrise: *Daily Standup* - ${dateStr}\n\n`
      reports.forEach((report) => {
        content += `*${report.memberName}*\n`
        if (report.yesterday.length > 0) {
          content += `_Yesterday:_\n${report.yesterday.map((t) => `• ${t}`).join("\n")}\n`
        }
        if (report.today.length > 0) {
          content += `_Today:_\n${report.today.map((t) => `• ${t}`).join("\n")}\n`
        }
        if (report.blockers.length > 0) {
          content += `:warning: _Blockers:_\n${report.blockers.map((b) => `• ${b}`).join("\n")}\n`
        }
        content += "\n"
      })
    } else if (format === "markdown") {
      content = `# Daily Standup - ${dateStr}\n\n`
      reports.forEach((report) => {
        content += `## ${report.memberName}\n\n`
        if (report.yesterday.length > 0) {
          content += `**Yesterday:**\n${report.yesterday.map((t) => `- ${t}`).join("\n")}\n\n`
        }
        if (report.today.length > 0) {
          content += `**Today:**\n${report.today.map((t) => `- ${t}`).join("\n")}\n\n`
        }
        if (report.blockers.length > 0) {
          content += `**Blockers:**\n${report.blockers.map((b) => `- ⚠️ ${b}`).join("\n")}\n\n`
        }
      })
    } else {
      content = `Daily Standup - ${dateStr}\n${"=".repeat(40)}\n\n`
      reports.forEach((report) => {
        content += `${report.memberName}\n${"-".repeat(20)}\n`
        if (report.yesterday.length > 0) {
          content += `Yesterday:\n${report.yesterday.map((t) => `  • ${t}`).join("\n")}\n`
        }
        if (report.today.length > 0) {
          content += `Today:\n${report.today.map((t) => `  • ${t}`).join("\n")}\n`
        }
        if (report.blockers.length > 0) {
          content += `Blockers:\n${report.blockers.map((b) => `  ⚠ ${b}`).join("\n")}\n`
        }
        content += "\n"
      })
    }

    return content
  }

  const formatDate = (date: Date) => format(date, "MMM d")

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      const content = formatStandup(generateStandup, outputFormat)
      setStandupContent(content)
      setIsGenerating(false)
    }, 500)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(standupContent)
  }

  const handleShareSlack = async () => {
    if (!onShareToSlack) return
    setIsSharing(true)
    try {
      await onShareToSlack(standupContent)
    } finally {
      setIsSharing(false)
    }
  }

  // Stats
  const stats = useMemo(() => {
    const reportingMembers = generateStandup.length
    const totalMembers = teamMembers.length
    const totalBlockers = generateStandup.reduce((sum, r) => sum + r.blockers.length, 0)
    return { reportingMembers, totalMembers, totalBlockers }
  }, [generateStandup, teamMembers])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Standup Generator
        </CardTitle>
        <CardDescription>
          Generate team standup from yesterday's EOD reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>
              {stats.reportingMembers}/{stats.totalMembers} reported
            </span>
          </div>
          {stats.totalBlockers > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{stats.totalBlockers} blockers</span>
            </div>
          )}
        </div>

        {/* Format Selection */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Format:</span>
          <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slack">
                <div className="flex items-center gap-2">
                  <Slack className="h-4 w-4" />
                  Slack
                </div>
              </SelectItem>
              <SelectItem value="markdown">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Markdown
                </div>
              </SelectItem>
              <SelectItem value="text">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Plain Text
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={isGenerating} className="ml-auto">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Generate</span>
          </Button>
        </div>

        {/* Preview */}
        {standupContent && (
          <>
            <div className="relative">
              <Textarea
                value={standupContent}
                onChange={(e) => setStandupContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Generated standup will appear here..."
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {/* Share Options */}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              {onShareToSlack && (
                <Button
                  variant="outline"
                  onClick={handleShareSlack}
                  disabled={isSharing}
                  className="gap-2"
                >
                  {isSharing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Slack className="h-4 w-4" />
                  )}
                  Share to Slack
                </Button>
              )}
            </div>
          </>
        )}

        {/* Members Preview */}
        {!standupContent && generateStandup.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Team members with EOD reports:</p>
            <div className="flex flex-wrap gap-2">
              {generateStandup.map((report) => (
                <Badge
                  key={report.memberId}
                  variant="secondary"
                  className={cn(
                    report.blockers.length > 0 && "border-amber-300 bg-amber-50"
                  )}
                >
                  {report.memberName}
                  {report.blockers.length > 0 && (
                    <AlertTriangle className="h-3 w-3 ml-1 text-amber-500" />
                  )}
                </Badge>
              ))}
            </div>
            {teamMembers.length > generateStandup.length && (
              <p className="text-xs text-slate-400">
                {teamMembers.length - generateStandup.length} members haven't submitted EOD
              </p>
            )}
          </div>
        )}

        {generateStandup.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No EOD reports from yesterday</p>
            <p className="text-sm">Check back after your team submits their reports</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
