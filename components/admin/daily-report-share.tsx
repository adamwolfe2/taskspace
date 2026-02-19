"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { format, addDays, subDays, parseISO } from "date-fns"
import type { Organization, EODReport, TeamMember } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface DailyReportShareProps {
  organization: Organization
  eodReports: EODReport[]
  teamMembers: TeamMember[]
}

export function DailyReportShare({
  organization,
  eodReports,
  teamMembers,
}: DailyReportShareProps) {
  const { toast } = useToast()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [copied, setCopied] = useState(false)

  const dateString = format(selectedDate, "yyyy-MM-dd")
  const displayDate = format(selectedDate, "EEEE, MMMM d, yyyy")

  // Build the public URL
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/public/eod/${organization.slug}/${dateString}`
    : `/public/eod/${organization.slug}/${dateString}`

  // Get reports for selected date - only from current team members
  const teamMemberIds = new Set(teamMembers.map(m => m.id))
  const dateReports = eodReports.filter(r => r.date === dateString && teamMemberIds.has(r.userId))
  const activeMembers = teamMembers.filter(m => m.status === "active")
  const submissionRate = activeMembers.length > 0
    ? Math.round((dateReports.length / activeMembers.length) * 100)
    : 0

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({ title: "Failed to copy", description: "Could not copy link to clipboard", variant: "destructive" })
    }
  }, [publicUrl, toast])

  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1))
  }

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1))
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              Daily Report Share Link
            </CardTitle>
            <CardDescription>
              Share a live view of today's EOD reports with stakeholders
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Preview
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousDay} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[200px] justify-center">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium">{displayDate}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextDay} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={goToToday}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Go to Today
            </Button>
          )}
        </div>

        {/* Submission Stats */}
        <div className="flex items-center gap-4 py-3 px-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600">
              <strong>{dateReports.length}</strong> of <strong>{activeMembers.length}</strong> submitted
            </span>
          </div>
          <Badge variant={submissionRate === 100 ? "default" : submissionRate >= 50 ? "secondary" : "destructive"}>
            {submissionRate}% complete
          </Badge>
        </div>

        {/* Shareable URL */}
        <div className="space-y-2">
          <Label htmlFor="share-url" className="text-sm text-slate-600">
            Shareable Link (no login required)
          </Label>
          <div className="flex gap-2">
            <Input
              id="share-url"
              value={publicUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyToClipboard} variant="secondary">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>This link provides a public, read-only view of the team's EOD reports for the selected date.</p>
          <p>The page auto-refreshes every 30 seconds to show new submissions in real-time.</p>
        </div>

        {/* Submitted Members */}
        {dateReports.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-slate-500 mb-2">Submitted today:</p>
            <div className="flex flex-wrap gap-2">
              {dateReports.map(report => {
                const member = teamMembers.find(m => m.userId === report.userId)
                return (
                  <Badge key={report.id} variant="outline" className="text-xs">
                    {member?.name || "Unknown"}
                    {report.needsEscalation && (
                      <span className="ml-1 text-red-500">!</span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Pending Members */}
        {activeMembers.length > dateReports.length && (
          <div className="pt-2 border-t">
            <p className="text-sm text-slate-500 mb-2">Pending:</p>
            <div className="flex flex-wrap gap-2">
              {activeMembers
                .filter(m => !dateReports.some(r => r.userId === m.id))
                .map(member => (
                  <Badge key={member.id} variant="secondary" className="text-xs opacity-60">
                    {member.name}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
