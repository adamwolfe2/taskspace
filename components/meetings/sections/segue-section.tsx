"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, Sparkles, ChevronRight } from "lucide-react"
import type { MeetingSection } from "@/lib/db/meetings"

interface Attendee {
  id: string
  name: string
  email?: string
}

interface SegueSectionProps {
  section: MeetingSection
  attendees: Attendee[]
  onComplete: (data: Record<string, unknown>) => void
  isActive: boolean
}

export function SegueSection({
  section,
  attendees,
  onComplete,
  isActive,
}: SegueSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [shares, setShares] = useState<Record<string, string>>(
    (section.data?.shares as Record<string, string>) || {}
  )

  const currentAttendee = attendees[currentIndex]
  const isLastPerson = currentIndex === attendees.length - 1

  const handleShare = (value: string) => {
    if (!currentAttendee) return
    setShares((prev) => ({
      ...prev,
      [currentAttendee.id]: value,
    }))
  }

  const handleNext = () => {
    if (isLastPerson) {
      onComplete({ shares })
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isActive && section.completed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Segue</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Completed
            </Badge>
          </div>
          <CardDescription>Personal & professional good news shared</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            {Object.keys(shares).length} team members shared their wins
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isActive) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg text-slate-500">Segue</CardTitle>
          </div>
          <CardDescription>Personal & professional good news</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            <CardTitle className="text-lg">Segue</CardTitle>
          </div>
          <Badge variant="secondary">
            {currentIndex + 1} of {attendees.length}
          </Badge>
        </div>
        <CardDescription>
          Share one personal and one professional good news or win from the past week
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Person */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {currentAttendee ? getInitials(currentAttendee.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{currentAttendee?.name || "Unknown"}</div>
            <div className="text-sm text-slate-500">Your turn to share</div>
          </div>
          <Sparkles className="h-5 w-5 text-amber-500 ml-auto" />
        </div>

        {/* Share Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Share your good news... (optional to capture notes)"
            value={shares[currentAttendee?.id] || ""}
            onChange={(e) => handleShare(e.target.value)}
            rows={3}
          />
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-1.5">
          {attendees.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full transition-colors ${
                idx < currentIndex
                  ? "bg-emerald-500"
                  : idx === currentIndex
                    ? "bg-primary"
                    : "bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button onClick={handleNext} className="w-full">
          {isLastPerson ? "Complete Segue" : "Next Person"}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}
