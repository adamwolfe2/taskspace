"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCircle, Check, Loader2 } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
  { value: "Europe/London", label: "GMT / London" },
  { value: "Europe/Berlin", label: "CET / Berlin" },
  { value: "Asia/Tokyo", label: "JST / Tokyo" },
  { value: "Asia/Shanghai", label: "CST / Shanghai" },
  { value: "Australia/Sydney", label: "AEST / Sydney" },
]

export function ProfileCompletionCard() {
  const { currentUser, refreshSession } = useApp()
  const { toast } = useToast()
  const [jobTitle, setJobTitle] = useState("")
  const [timezone, setTimezone] = useState("")
  const [saving, setSaving] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Don't show if profile is already complete or card was completed this session
  if (!currentUser || completed) return null
  if (currentUser.jobTitle && currentUser.timezone) return null

  const handleSave = async () => {
    if (!jobTitle.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          memberId: currentUser.id,
          jobTitle: jobTitle.trim(),
          timezone: timezone || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCompleted(true)
        refreshSession()
        toast({ title: "Profile updated", description: "Welcome to TaskSpace!" })
      }
    } catch {
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200 bg-slate-50/50">
      <CardContent className="pt-5 pb-4 px-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Complete your profile</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Help your team know who you are — takes 10 seconds.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!currentUser.jobTitle && (
            <div>
              <Label htmlFor="profile-job-title" className="text-xs text-slate-600">
                Job Title
              </Label>
              <Input
                id="profile-job-title"
                placeholder="e.g. Product Manager"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          {!currentUser.timezone && (
            <div>
              <Label htmlFor="profile-timezone" className="text-xs text-slate-600">
                Timezone
              </Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="profile-timezone" className="mt-1">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !jobTitle.trim()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
