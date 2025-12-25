"use client"

import { useState } from "react"
import type { Rock } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/date-utils"
import { AlertCircle, CheckCircle2, Clock } from "lucide-react"

interface MyRocksSectionProps {
  rocks: Rock[]
  onUpdateProgress: (rockId: string, progress: number) => void
}

export function MyRocksSection({ rocks, onUpdateProgress }: MyRocksSectionProps) {
  const [draggedRock, setDraggedRock] = useState<string | null>(null)

  const getStatusIcon = (status: Rock["status"]) => {
    switch (status) {
      case "on-track":
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case "at-risk":
        return <Clock className="h-4 w-4 text-warning" />
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-primary" />
    }
  }

  const getStatusBadge = (status: Rock["status"]) => {
    const variants = {
      "on-track": "default",
      "at-risk": "secondary",
      blocked: "destructive",
      completed: "outline",
    }
    return (
      <Badge variant={variants[status] as any} className="text-xs">
        {status.replace("-", " ").toUpperCase()}
      </Badge>
    )
  }

  const handleSliderChange = (rockId: string, value: number) => {
    setDraggedRock(rockId)
    onUpdateProgress(rockId, value)
  }

  const handleSliderRelease = () => {
    setDraggedRock(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          My Rocks
          <span className="text-sm font-normal text-muted-foreground">({rocks.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rocks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No rocks assigned yet</p>
        ) : (
          <div className="space-y-4">
            {rocks.map((rock) => (
              <div key={rock.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      {getStatusIcon(rock.status)}
                      {rock.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{rock.description}</p>
                  </div>
                  {getStatusBadge(rock.status)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-semibold text-primary">{rock.progress}%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={rock.progress}
                      onChange={(e) => handleSliderChange(rock.id, Number(e.target.value))}
                      onMouseUp={handleSliderRelease}
                      onTouchEnd={handleSliderRelease}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        background: `linear-gradient(to right, #2563EB 0%, #2563EB ${rock.progress}%, #E5E7EB ${rock.progress}%, #E5E7EB 100%)`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Due: {formatDate(rock.dueDate)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
