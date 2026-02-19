"use client"

import { useState, useCallback } from "react"
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
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react"
import { format, addDays, subDays, nextThursday, previousThursday, isThursday } from "date-fns"
import type { Organization } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface WeeklyReportShareProps {
  organization: Organization
}

function getThursdayForWeek(date: Date): Date {
  // If it's already Thursday, return this Thursday
  // Otherwise get the Thursday of the current week (looking forward)
  if (isThursday(date)) {
    return date
  }
  // Get the most recent Thursday (including today if Thursday)
  const day = date.getDay()
  // Thursday is day 4
  // If we're past Thursday (Fri=5, Sat=6, Sun=0), get next Thursday's date as "this week's end"
  // If we're before Thursday (Mon=1, Tue=2, Wed=3), get the upcoming Thursday
  if (day > 4 || day === 0) {
    // We're past Thursday, show this past Thursday as current week
    return previousThursday(date)
  } else {
    // We're before Thursday, show upcoming Thursday
    return nextThursday(date)
  }
}

export function WeeklyReportShare({ organization }: WeeklyReportShareProps) {
  const { toast } = useToast()
  const [selectedThursday, setSelectedThursday] = useState(() => getThursdayForWeek(new Date()))
  const [copied, setCopied] = useState(false)

  const dateString = format(selectedThursday, "yyyy-MM-dd")

  // Calculate week range (Friday to Thursday)
  const weekStart = subDays(selectedThursday, 6)
  const weekRangeDisplay = `${format(weekStart, "MMM d")} - ${format(selectedThursday, "MMM d, yyyy")}`

  // Build the public URL
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/public/eod/${organization.slug}/week/${dateString}`
    : `/public/eod/${organization.slug}/week/${dateString}`

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Failed to copy", description: "Could not copy link to clipboard", variant: "destructive" })
    }
  }, [publicUrl, toast])

  const goToPreviousWeek = () => {
    setSelectedThursday(prev => subDays(prev, 7))
  }

  const goToNextWeek = () => {
    setSelectedThursday(prev => addDays(prev, 7))
  }

  const goToCurrentWeek = () => {
    setSelectedThursday(getThursdayForWeek(new Date()))
  }

  const isCurrentWeek = format(selectedThursday, "yyyy-MM-dd") === format(getThursdayForWeek(new Date()), "yyyy-MM-dd")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              Weekly Report Share Link
            </CardTitle>
            <CardDescription>
              Share a consolidated weekly EOD report with stakeholders (Friday - Thursday)
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
        {/* Week Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-[220px] justify-center">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium">{weekRangeDisplay}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNextWeek} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isCurrentWeek && (
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
              Current Week
            </Button>
          )}
        </div>

        {/* Week Info */}
        <div className="flex items-center gap-4 py-3 px-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-slate-600">
              Week ending <strong>Thursday, {format(selectedThursday, "MMMM d")}</strong>
            </span>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            7-day summary
          </Badge>
        </div>

        {/* Shareable URL */}
        <div className="space-y-2">
          <Label htmlFor="weekly-share-url" className="text-sm text-slate-600">
            Shareable Link (no login required)
          </Label>
          <div className="flex gap-2">
            <Input
              id="weekly-share-url"
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
          <p>This link provides a public, read-only view of the team's consolidated weekly EOD reports.</p>
          <p>Includes all tasks, challenges, and escalations from Friday through Thursday.</p>
        </div>
      </CardContent>
    </Card>
  )
}
