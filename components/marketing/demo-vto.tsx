"use client"

import { Target, Users, TrendingUp, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function DemoVTO() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Vision/Traction Organizer</h3>
        <p className="text-sm text-slate-500">2-page strategic plan</p>
      </div>

      <div className="grid gap-4">
        {/* Core Values */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-purple-900">Core Values</span>
          </div>
          <div className="space-y-1">
            {["Do the right thing", "Embrace change", "Be transparent", "Seek knowledge"].map((value, i) => (
              <div key={i} className="text-sm text-slate-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                {value}
              </div>
            ))}
          </div>
        </div>

        {/* 10-Year Target */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-blue-900">10-Year Target</span>
          </div>
          <div className="text-sm text-slate-700">
            $50M revenue, 500 customers, market leader in EOS software
          </div>
        </div>

        {/* 3-Year Picture */}
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-emerald-900">3-Year Picture</span>
          </div>
          <div className="space-y-1">
            {[
              "$15M ARR with 35% margins",
              "200+ enterprise customers",
              "50 team members, fully remote",
              "Category leader in EOS tools"
            ].map((item, i) => (
              <div key={i} className="text-sm text-slate-700 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* 1-Year Plan */}
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-orange-900">1-Year Plan</span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1">Revenue Goal</div>
              <div className="text-sm text-slate-900 font-semibold">$5M ARR</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium mb-1">Key Initiatives</div>
              <div className="space-y-1">
                {[
                  "Launch AI Super Agents",
                  "Expand sales team to 10",
                  "Ship mobile app"
                ].map((item, i) => (
                  <div key={i} className="text-sm text-slate-700 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quarterly Rocks */}
        <div className="p-4 bg-slate-50 border-2 border-slate-300 rounded-lg">
          <div className="text-sm font-semibold text-slate-900 mb-2">Q1 2024 Rocks</div>
          <div className="space-y-2">
            {[
              { rock: "Launch product V2", progress: 85, status: "On Track" },
              { rock: "Close $500k in new deals", progress: 62, status: "On Track" },
              { rock: "Hire 3 engineers", progress: 33, status: "At Risk" }
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{item.rock}</span>
                  <Badge className={item.status === "On Track" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>
                    {item.progress}%
                  </Badge>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
