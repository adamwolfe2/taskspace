"use client"

import { AlertCircle, MessageSquare, CheckSquare, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function DemoIDS() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">IDS Process</h3>
          <p className="text-sm text-slate-500">Identify, Discuss, Solve</p>
        </div>
        <Badge className="bg-gray-100 text-gray-700">In Progress</Badge>
      </div>

      {/* IDS Steps */}
      <div className="space-y-4">
        {/* Identify */}
        <div className="p-4 bg-gray-100 border-2 border-gray-400 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900">1. Identify</span>
          </div>
          <div className="text-sm text-slate-700 font-medium mb-2">
            Issue: Marketing campaign not hitting lead targets
          </div>
          <div className="text-xs text-slate-600">
            Root cause: Landing page conversion rate dropped from 12% to 6%
          </div>
        </div>

        {/* Discuss */}
        <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900">2. Discuss</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-900 flex-shrink-0">
                SM
              </div>
              <div className="text-sm text-slate-700">
                "I think the new design is confusing - too many form fields"
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                JK
              </div>
              <div className="text-sm text-slate-700">
                "Analytics show people dropping off at the phone number field"
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs font-medium text-white flex-shrink-0">
                AR
              </div>
              <div className="text-sm text-slate-700">
                "Let's make phone optional and simplify to just name + email"
              </div>
            </div>
          </div>
        </div>

        {/* Solve */}
        <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900">3. Solve</span>
          </div>
          <div className="text-sm font-medium text-slate-900 mb-3">
            Solution: Simplify landing page form
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <div className="w-2 h-2 rounded-full bg-gray-700" />
              <span>Remove phone field, make it optional</span>
              <Badge className="ml-auto bg-slate-100 text-slate-700 text-xs">Sarah M.</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <div className="w-2 h-2 rounded-full bg-gray-700" />
              <span>A/B test with current version</span>
              <Badge className="ml-auto bg-slate-100 text-slate-700 text-xs">James K.</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <div className="w-2 h-2 rounded-full bg-gray-700" />
              <span>Deploy by end of week</span>
              <Badge className="ml-auto bg-slate-100 text-slate-700 text-xs">Alex R.</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <Users className="w-4 h-4" />
        <span>3 people involved • Solved in 15 minutes</span>
      </div>
    </div>
  )
}
