"use client"

import { CheckCircle, Clock, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export function DemoLevel10() {
  const sections = [
    { name: "Segue", time: "5 min", status: "done" },
    { name: "Scorecard", time: "5 min", status: "done" },
    { name: "Rock Review", time: "5 min", status: "current" },
    { name: "Customer/Employee Headlines", time: "5 min", status: "upcoming" },
    { name: "To-Do List", time: "5 min", status: "upcoming" },
    { name: "IDS", time: "60 min", status: "upcoming" },
    { name: "Conclude", time: "5 min", status: "upcoming" },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Level 10 Meeting</h3>
          <p className="text-sm text-slate-500">90 minutes of productivity</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600">20 / 90 min</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-1/4 bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500" />
        </div>
      </div>

      {/* Agenda Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.name}
            className={cn(
              "p-4 rounded-lg border-2 transition-all",
              section.status === "done" && "bg-emerald-50 border-emerald-200",
              section.status === "current" && "bg-purple-50 border-purple-300 shadow-md",
              section.status === "upcoming" && "bg-slate-50 border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {section.status === "done" && (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                {section.status === "current" && (
                  <div className="w-5 h-5 rounded-full border-2 border-purple-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  </div>
                )}
                {section.status === "upcoming" && (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    section.status === "current" ? "text-purple-900" : "text-slate-900"
                  )}
                >
                  {section.name}
                </span>
              </div>
              <span className="text-sm text-slate-500">{section.time}</span>
            </div>

            {section.status === "current" && (
              <div className="mt-3 pt-3 border-t border-purple-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700">Q1 Product Launch - On Track (85%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700">Revenue Target - On Track (92%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                    <span className="text-slate-700">Team Hiring - Needs Discussion (45%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-900">
          <span className="font-medium">Next up:</span> Customer/Employee Headlines in 5 minutes
        </div>
      </div>
    </div>
  )
}
