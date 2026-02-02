"use client"

import { Crown, Users, DollarSign, Megaphone, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

export function DemoAccountabilityChart() {
  const [selectedRole, setSelectedRole] = useState<string>("ceo")

  const roles = {
    ceo: {
      title: "CEO / Visionary",
      person: "Sarah Johnson",
      color: "from-gray-700 to-gray-900",
      icon: Crown,
      responsibilities: ["Vision", "Major Relationships", "Culture", "Strategy", "Big Decisions"]
    },
    integrator: {
      title: "Integrator",
      person: "Michael Chen",
      color: "from-gray-600 to-gray-800",
      icon: Settings,
      responsibilities: ["P&L", "Leadership Team", "Integration", "Accountability", "Results"]
    },
    sales: {
      title: "Sales",
      person: "Alex Rivera",
      color: "from-gray-500 to-gray-700",
      icon: DollarSign,
      responsibilities: ["Revenue", "Pipeline", "Customer Acquisition", "Sales Team", "Targets"]
    },
    marketing: {
      title: "Marketing",
      person: "Jamie Park",
      color: "from-gray-400 to-gray-600",
      icon: Megaphone,
      responsibilities: ["Brand", "Lead Generation", "Content", "Campaigns", "Awareness"]
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Accountability Chart</h3>
        <p className="text-sm text-slate-500">Right person, right seat</p>
      </div>

      {/* Org Chart Visual */}
      <div className="space-y-4 mb-6">
        {/* CEO */}
        <div className="flex justify-center">
          <button
            onClick={() => setSelectedRole("ceo")}
            className={cn(
              "relative p-4 rounded-xl border-2 bg-white transition-all min-w-[200px]",
              selectedRole === "ceo"
                ? "border-gray-400 shadow-lg ring-4 ring-gray-200"
                : "border-slate-200 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", roles.ceo.color)}>
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-900 text-sm">{roles.ceo.title}</div>
                <div className="text-xs text-slate-500">{roles.ceo.person}</div>
              </div>
            </div>
          </button>
        </div>

        {/* Integrator */}
        <div className="flex justify-center">
          <button
            onClick={() => setSelectedRole("integrator")}
            className={cn(
              "relative p-4 rounded-xl border-2 bg-white transition-all min-w-[200px]",
              selectedRole === "integrator"
                ? "border-gray-400 shadow-lg ring-4 ring-gray-200"
                : "border-slate-200 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", roles.integrator.color)}>
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-900 text-sm">{roles.integrator.title}</div>
                <div className="text-xs text-slate-500">{roles.integrator.person}</div>
              </div>
            </div>
          </button>
        </div>

        {/* Department Heads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {["sales", "marketing"].map((key) => {
            const role = roles[key as keyof typeof roles]
            const Icon = role.icon
            return (
              <button
                key={key}
                onClick={() => setSelectedRole(key)}
                className={cn(
                  "p-4 rounded-xl border-2 bg-white transition-all",
                  selectedRole === key
                    ? "border-gray-400 shadow-lg ring-4 ring-gray-200"
                    : "border-slate-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center", role.color)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 text-sm">{role.title}</div>
                    <div className="text-xs text-slate-500">{role.person}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Role Details */}
      {selectedRole && (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-sm font-semibold text-slate-900 mb-3">
            {roles[selectedRole as keyof typeof roles].title} - 5 Key Responsibilities:
          </div>
          <div className="space-y-2">
            {roles[selectedRole as keyof typeof roles].responsibilities.map((resp, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                <div className="w-5 h-5 rounded bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                  {i + 1}
                </div>
                <span>{resp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
