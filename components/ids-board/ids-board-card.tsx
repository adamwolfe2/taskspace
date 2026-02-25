"use client"

import type { IdsBoardItem } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { GripVertical, AlertCircle, Target, Lightbulb, User, Clock } from "lucide-react"
import { differenceInDays, parseISO } from "date-fns"

interface IdsBoardCardProps {
  item: IdsBoardItem
  isDragging?: boolean
  onClick?: () => void
}

const itemTypeConfig = {
  issue: { label: "Issue", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  rock: { label: "Rock", icon: Target, color: "text-purple-500", bg: "bg-purple-50" },
  custom: { label: "Custom", icon: Lightbulb, color: "text-blue-500", bg: "bg-blue-50" },
}

export function IdsBoardCard({ item, isDragging, onClick }: IdsBoardCardProps) {
  const typeConfig = itemTypeConfig[item.itemType]
  const TypeIcon = typeConfig.icon

  return (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md",
        isDragging && "opacity-50 shadow-lg scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <TypeIcon className={cn("h-3.5 w-3.5 flex-shrink-0", typeConfig.color)} />
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeConfig.bg)}>
                {typeConfig.label}
              </Badge>
            </div>
            <p className="text-sm font-medium leading-snug truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 mt-2">
              {(item.assignedToName || item.createdByName) ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {item.assignedToName || item.createdByName}
                  </span>
                </div>
              ) : <span />}
              {item.createdAt && (() => {
                const days = differenceInDays(new Date(), parseISO(item.createdAt))
                if (days === 0) return null
                const isOld = days >= 7
                return (
                  <div className={cn("flex items-center gap-0.5 text-xs flex-shrink-0", isOld ? "text-amber-600 font-medium" : "text-muted-foreground")}>
                    {isOld && <Clock className="h-3 w-3" />}
                    <span>{days}d</span>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
