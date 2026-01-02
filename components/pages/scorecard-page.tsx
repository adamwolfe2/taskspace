"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScorecardTable } from "@/components/scorecard/scorecard-table"
import { Target, HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ScorecardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Scorecard</h1>
          <p className="text-slate-600 mt-1">
            Track weekly metrics and goals across the team (EOS-style)
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-2 rounded-full hover:bg-slate-100">
                <HelpCircle className="h-5 w-5 text-slate-500" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm">
              <p className="font-semibold mb-1">About Weekly Scorecard</p>
              <ul className="text-xs space-y-1">
                <li><span className="inline-block w-3 h-3 rounded bg-green-100 mr-1"></span> Green = Met or exceeded goal</li>
                <li><span className="inline-block w-3 h-3 rounded bg-red-100 mr-1"></span> Red = Below goal</li>
                <li><span className="text-slate-400">-</span> = No data for that week</li>
              </ul>
              <p className="text-xs mt-2 text-slate-500">
                Metrics are automatically aggregated from daily EOD reports.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Scorecard Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-purple-600" />
            Team Metrics
          </CardTitle>
          <CardDescription>
            Last 8 weeks of weekly metric performance. Weeks end on Friday.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScorecardTable />
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-slate-900 mb-2">How it works</h3>
              <p className="text-sm text-slate-600">
                Each team member has one weekly measurable metric. Daily values are entered during EOD submission and automatically aggregated weekly.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Setting up metrics</h3>
              <p className="text-sm text-slate-600">
                Go to Team Management to configure a metric name and weekly goal for each team member who should be tracked.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Best practices</h3>
              <p className="text-sm text-slate-600">
                Choose metrics that are easily countable, within the team member's control, and directly tied to their core responsibilities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
