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
          <div className="h-full w-1/4 bg-gradient-to-r from-gray-700 to-gray-900 transition-all duration-500" />
        </div>
      </div>

      {/* Agenda Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.name}
            className={cn(
              "p-4 rounded-lg border-2 transition-all",
              section.status === "done" && "bg-gray-50 border-gray-300",
              section.status === "current" && "bg-gray-100 border-gray-400 shadow-md",
              section.status === "upcoming" && "bg-slate-50 border-slate-200"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {section.status === "done" && (
                  <CheckCircle className="w-5 h-5 text-gray-700" />
                )}
                {section.status === "current" && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-700 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-gray-700 animate-pulse" />
                  </div>
                )}
                {section.status === "upcoming" && (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    section.status === "current" ? "text-gray-900" : "text-slate-900"
                  )}
                >
                  {section.name}
                </span>
              </div>
              <span className="text-sm text-slate-500">{section.time}</span>
            </div>

            {section.status === "current" && (
              <div className="mt-3 pt-3 border-t border-gray-300">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-gray-700" />
                    <span className="text-slate-700">Q1 Product Launch - On Track (85%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-gray-700" />
                    <span className="text-slate-700">Revenue Target - On Track (92%)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    <span className="text-slate-700">Team Hiring - Needs Discussion (45%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded-lg">
        <div className="text-sm text-gray-900">
          <span className="font-medium">Next up:</span> Customer/Employee Headlines in 5 minutes
        </div>
      </div>
    </div>
  )
}
