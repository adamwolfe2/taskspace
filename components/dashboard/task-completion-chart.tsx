"use client"

import { CheckCircle2, Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { AssignedTask } from "@/lib/types"
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO } from "date-fns"

interface TaskCompletionChartProps {
  tasks: AssignedTask[]
}

export function TaskCompletionChart({ tasks }: TaskCompletionChartProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [open, setOpen] = useState(false)

  // Get current week
  const weekStart = startOfWeek(date || new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(date || new Date(), { weekStartsOn: 1 })
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Create chart data for each day of the week
  const chartData = daysInWeek.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd")
    const completedOnDay = tasks.filter(
      (task) =>
        task.status === "completed" &&
        task.completedAt &&
        format(parseISO(task.completedAt), "yyyy-MM-dd") === dayStr
    ).length

    return {
      day: format(day, "EEE"),
      completed: completedOnDay,
    }
  })

  const formatDateRange = (date: Date | undefined) => {
    if (!date) return "This Week"
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    return `${format(start, "MMM d")} - ${format(end, "MMM d")}`
  }

  return (
    <div className="relative rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Task Completion This Week
          </h2>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2 text-xs"
            >
              <CalendarIcon className="h-4 w-4" />
              {formatDateRange(date)}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(selectedDate) => {
                setDate(selectedDate)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="mb-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-muted-foreground">
            Completed Tasks
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#completedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
