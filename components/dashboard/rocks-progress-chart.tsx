"use client"

import { Target, Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import type { Rock } from "@/lib/types"

interface RocksProgressChartProps {
  rocks: Rock[]
}

export function RocksProgressChart({ rocks }: RocksProgressChartProps) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [open, setOpen] = useState(false)

  // Aggregate rocks by quarter
  const chartData = rocks.filter((rock) => rock.quarter).reduce((acc, rock) => {
    const existing = acc.find((item) => item.quarter === rock.quarter)
    if (existing) {
      existing.count += 1
      existing.totalProgress += rock.progress
    } else {
      acc.push({
        quarter: rock.quarter!,
        count: 1,
        totalProgress: rock.progress,
      })
    }
    return acc
  }, [] as { quarter: string; count: number; totalProgress: number }[])

  // Calculate average progress
  const chartDataWithAverage = chartData.map((item) => ({
    ...item,
    averageProgress: Math.round(item.totalProgress / item.count),
  }))

  const formatDateRange = (date: Date | undefined) => {
    if (!date) return "All Quarters"
    const month = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    return month
  }

  return (
    <div className="relative rounded-xl border border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">
            Rocks Progress Over Time
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
          <div className="h-3 w-3 rounded-full bg-slate-900" />
          <span className="text-xs font-medium text-muted-foreground">
            Average Progress
          </span>
        </div>
      </div>

      {chartDataWithAverage.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartDataWithAverage}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="quarter"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey="averageProgress" radius={[8, 8, 0, 0]}>
              {chartDataWithAverage.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.averageProgress >= 70 ? "#10b981" : entry.averageProgress >= 40 ? "#f59e0b" : "#94a3b8"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-60 flex items-center justify-center text-muted-foreground">
          <p>No rock data available</p>
        </div>
      )}
    </div>
  )
}
