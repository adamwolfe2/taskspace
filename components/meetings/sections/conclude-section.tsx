"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
  Flag,
  Star,
  CheckCircle2,
  ListChecks,
  MessageSquare,
  Users,
} from "lucide-react"
import type { MeetingSection, MeetingTodo } from "@/lib/db/meetings"

interface ConcludeSectionProps {
  section: MeetingSection
  todos: MeetingTodo[]
  onComplete: (data: { rating: number; feedback: string }) => void
  isActive: boolean
  meetingDuration?: number
}

export function ConcludeSection({
  section,
  todos,
  onComplete,
  isActive,
  meetingDuration,
}: ConcludeSectionProps) {
  const [rating, setRating] = useState<number>(
    (section.data?.rating as number) || 8
  )
  const [feedback, setFeedback] = useState<string>(
    (section.data?.feedback as string) || ""
  )

  const handleComplete = () => {
    onComplete({ rating, feedback })
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "—"
    const hrs = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins} minutes`
  }

  const getRatingLabel = (value: number) => {
    if (value >= 9) return "Excellent"
    if (value >= 7) return "Good"
    if (value >= 5) return "Average"
    if (value >= 3) return "Needs Improvement"
    return "Poor"
  }

  const getRatingColor = (value: number) => {
    if (value >= 9) return "text-emerald-600"
    if (value >= 7) return "text-blue-600"
    if (value >= 5) return "text-amber-600"
    return "text-red-600"
  }

  if (!isActive && section.completed) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-lg">Conclude</CardTitle>
            </div>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
              Meeting Complete
            </Badge>
          </div>
          <CardDescription>Meeting concluded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" />
              Rating: {section.data?.rating || "—"}/10
            </div>
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
            <Flag className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg text-slate-500">Conclude</CardTitle>
          </div>
          <CardDescription>Recap and rate meeting</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-emerald-500" />
          <CardTitle className="text-lg">Conclude</CardTitle>
        </div>
        <CardDescription>
          Recap action items, cascade messages, and rate the meeting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meeting Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <ListChecks className="h-4 w-4" />
              <span className="text-sm font-medium">To-Dos Created</span>
            </div>
            <div className="text-2xl font-bold">{todos.length}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <div className="text-2xl font-bold">{formatDuration(meetingDuration)}</div>
          </div>
        </div>

        {/* To-Do Recap */}
        {todos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Action Items to Cascade
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 p-2 bg-blue-50 rounded text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span className="flex-1 truncate">{todo.title}</span>
                  {todo.assigneeName && (
                    <Badge variant="outline" className="text-xs">
                      {todo.assigneeName}
                    </Badge>
                  )}
                  {todo.dueDate && (
                    <span className="text-xs text-slate-500">{todo.dueDate}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Rate This Meeting
            </h4>
            <div className={`text-2xl font-bold ${getRatingColor(rating)}`}>
              {rating}/10
            </div>
          </div>
          <Slider
            value={[rating]}
            onValueChange={(v) => setRating(v[0])}
            min={1}
            max={10}
            step={1}
            className="py-4"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Poor</span>
            <span className={`font-medium ${getRatingColor(rating)}`}>
              {getRatingLabel(rating)}
            </span>
            <span>Excellent</span>
          </div>
        </div>

        {/* Feedback */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Meeting Feedback (optional)
          </h4>
          <Textarea
            placeholder="What went well? What could be improved?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
          />
        </div>

        {/* Conclude Button */}
        <Button onClick={handleComplete} className="w-full" size="lg">
          <Flag className="h-4 w-4 mr-2" />
          End Meeting
        </Button>
      </CardContent>
    </Card>
  )
}
