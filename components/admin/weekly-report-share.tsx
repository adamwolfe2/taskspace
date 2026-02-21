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
  Lock,
  KeyRound,
} from "lucide-react"
import { format, addDays, subDays, nextThursday, previousThursday, isThursday } from "date-fns"
import type { Organization } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface WeeklyReportShareProps {
  organization: Organization
}

function getThursdayForWeek(date: Date): Date {
  if (isThursday(date)) {
    return date
  }
  const day = date.getDay()
  if (day > 4 || day === 0) {
    return previousThursday(date)
  } else {
    return nextThursday(date)
  }
}

export function WeeklyReportShare({ organization }: WeeklyReportShareProps) {
  const { toast } = useToast()
  const [selectedThursday, setSelectedThursday] = useState(() => getThursdayForWeek(new Date()))
  const [copied, setCopied] = useState(false)
  const [token, setToken] = useState<string | null>(
    (organization.settings as { publicEodToken?: string } | null)?.publicEodToken || null
  )
  const [isGenerating, setIsGenerating] = useState(false)

  const dateString = format(selectedThursday, "yyyy-MM-dd")

  const weekStart = subDays(selectedThursday, 6)
  const weekRangeDisplay = `${format(weekStart, "MMM d")} - ${format(selectedThursday, "MMM d, yyyy")}`

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const publicUrl = token
    ? `${origin}/public/eod/${organization.slug}/week/${dateString}?token=${token}`
    : `${origin}/public/eod/${organization.slug}/week/${dateString}`

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: "Failed to copy", description: "Could not copy link to clipboard", variant: "destructive" })
    }
  }, [publicUrl, toast])

  const handleGenerateToken = useCallback(async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/organizations/public-eod-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "generate" }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || "Failed")
      setToken(data.data.publicEodToken)
      toast({ title: "Access token generated", description: "Your public weekly EOD link is now active." })
    } catch {
      toast({ title: "Failed to generate token", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }, [toast])

  const goToPreviousWeek = () => setSelectedThursday(prev => subDays(prev, 7))
  const goToNextWeek = () => setSelectedThursday(prev => addDays(prev, 7))
  const goToCurrentWeek = () => setSelectedThursday(getThursdayForWeek(new Date()))

  const isCurrentWeek = format(selectedThursday, "yyyy-MM-dd") === format(getThursdayForWeek(new Date()), "yyyy-MM-dd")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              Weekly Report Share Link
            </CardTitle>
            <CardDescription>
              Share a consolidated weekly EOD report with stakeholders (Friday - Thursday)
            </CardDescription>
          </div>
          {token && (
            <Button variant="outline" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Preview
              </a>
            </Button>
          )}
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
        <div className="flex items-center gap-4 py-3 px-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">
              Week ending <strong>Thursday, {format(selectedThursday, "MMMM d")}</strong>
            </span>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
            7-day summary
          </Badge>
        </div>

        {/* Shareable URL */}
        <div className="space-y-2">
          <Label className="text-sm text-slate-600">
            Shareable Link (no login required)
          </Label>
          {!token ? (
            <div className="flex flex-col gap-2 border border-slate-200 rounded-lg p-4 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-600">
                <Lock className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Public access is not yet enabled. Generate a token to create a shareable link.</span>
              </div>
              <Button
                onClick={handleGenerateToken}
                disabled={isGenerating}
                size="sm"
                className="gap-2 w-fit"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {isGenerating ? "Generating…" : "Generate Access Token"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="weekly-share-url"
                  value={publicUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button onClick={copyToClipboard} variant="secondary">
                  {copied ? (
                    <><Check className="h-4 w-4 mr-2 text-green-500" />Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" />Copy</>
                  )}
                </Button>
              </div>
              <button
                onClick={handleGenerateToken}
                disabled={isGenerating}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {isGenerating ? "Regenerating…" : "Regenerate token (invalidates old link)"}
              </button>
            </div>
          )}
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
