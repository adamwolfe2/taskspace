"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function DemoScorecard() {
  const [selectedWeek, setSelectedWeek] = useState(2)

  const metrics = [
    {
      metric: "Revenue",
      goal: "100k",
      week1: "92k",
      week2: "105k",
      week3: "98k",
      week4: "110k",
    },
    {
      metric: "New Leads",
      goal: "50",
      week1: "48",
      week2: "52",
      week3: "45",
      week4: "58",
    },
    {
      metric: "Customer Satisfaction",
      goal: "4.5",
      week1: "4.6",
      week2: "4.7",
      week3: "4.4",
      week4: "4.8",
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Weekly Scorecard</h3>
          <p className="text-sm text-slate-500">Track your key metrics every week</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700">
          <TrendingUp className="w-3 h-3 mr-1" />
          On Target
        </Badge>
      </div>

      {/* Week Selector */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((week) => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              selectedWeek === week
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Week {week}
          </button>
        ))}
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        {metrics.map((row) => {
          const weekValue = row[`week${selectedWeek}` as keyof typeof row] as string
          const isOnTarget =
            (row.metric === "Revenue" && parseInt(weekValue.replace("k", "")) >= 100) ||
            (row.metric === "New Leads" && parseInt(weekValue) >= 50) ||
            (row.metric === "Customer Satisfaction" && parseFloat(weekValue) >= 4.5)

          return (
            <div
              key={row.metric}
              className={cn(
                "p-4 rounded-lg border-2 transition-all",
                isOnTarget
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-orange-50 border-orange-200"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900 mb-1">{row.metric}</div>
                  <div className="text-xs text-slate-500">Goal: {row.goal}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{weekValue}</div>
                  </div>
                  {isOnTarget ? (
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-orange-600" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedWeek === 3 && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-orange-900">
            <span className="font-medium">Alert:</span> Customer Satisfaction below target this week
          </div>
        </div>
      )}
    </div>
  )
}
