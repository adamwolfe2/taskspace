"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  TrendingUp,
} from "lucide-react"

interface DemoRock {
  id: string
  title: string
  description: string
  progress: number
  status: "on-track" | "at-risk" | "blocked" | "completed"
  dueDate: string
  milestones: { id: string; text: string; completed: boolean }[]
}

const DEMO_ROCKS: DemoRock[] = [
  {
    id: "1",
    title: "Improve Marketing Conversion Rate to 15%",
    description: "Optimize landing pages, improve messaging, and implement A/B testing across all marketing funnels",
    progress: 65,
    status: "on-track",
    dueDate: "Mar 31, 2026",
    milestones: [
      { id: "m1", text: "Complete landing page redesign", completed: true },
      { id: "m2", text: "Set up A/B testing infrastructure", completed: true },
      { id: "m3", text: "Implement new email nurture sequence", completed: false },
      { id: "m4", text: "Launch retargeting campaigns", completed: false },
    ],
  },
  {
    id: "2",
    title: "Launch 3 New Product Features",
    description: "Ship AI assistant, advanced analytics dashboard, and mobile app to drive user engagement",
    progress: 45,
    status: "at-risk",
    dueDate: "Mar 31, 2026",
    milestones: [
      { id: "m5", text: "Complete AI assistant beta", completed: true },
      { id: "m6", text: "Design analytics dashboard", completed: true },
      { id: "m7", text: "Develop mobile app MVP", completed: false },
      { id: "m8", text: "User testing and feedback", completed: false },
    ],
  },
  {
    id: "3",
    title: "Build Engineering Team to 10 People",
    description: "Hire senior engineers and build a world-class engineering culture",
    progress: 30,
    status: "on-track",
    dueDate: "Mar 31, 2026",
    milestones: [
      { id: "m9", text: "Hire engineering manager", completed: true },
      { id: "m10", text: "Hire 3 senior engineers", completed: false },
      { id: "m11", text: "Establish hiring process", completed: true },
      { id: "m12", text: "Create onboarding program", completed: false },
    ],
  },
]

const statusConfigs = {
  "on-track": {
    icon: CheckCircle2,
    label: "On Track",
    bgColor: "bg-gray-100",
    textColor: "text-gray-900",
    iconColor: "text-gray-700",
    progressColor: "bg-gray-700",
  },
  "at-risk": {
    icon: Clock,
    label: "At Risk",
    bgColor: "bg-gray-100",
    textColor: "text-gray-700",
    iconColor: "text-gray-600",
    progressColor: "bg-gray-600",
  },
  "blocked": {
    icon: AlertCircle,
    label: "Blocked",
    bgColor: "bg-gray-200",
    textColor: "text-gray-900",
    iconColor: "text-gray-800",
    progressColor: "bg-gray-800",
  },
  "completed": {
    icon: CheckCircle2,
    label: "Completed",
    bgColor: "bg-slate-100",
    textColor: "text-slate-700",
    iconColor: "text-slate-500",
    progressColor: "bg-slate-500",
  },
}

export function DemoRocks() {
  const [rocks, setRocks] = useState(DEMO_ROCKS)
  const [hoveredRock, setHoveredRock] = useState<string | null>(null)

  const handleProgressChange = (rockId: string, newProgress: number) => {
    setRocks(rocks.map(rock =>
      rock.id === rockId ? { ...rock, progress: newProgress } : rock
    ))
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">3</p>
              <p className="text-sm text-slate-600">Active Rocks</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">47%</p>
              <p className="text-sm text-slate-600">Avg Progress</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">6/12</p>
              <p className="text-sm text-slate-600">Milestones Done</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Rocks List */}
      <div className="space-y-4">
        {rocks.map((rock, index) => {
          const statusConfig = statusConfigs[rock.status]
          const StatusIcon = statusConfig.icon
          const completedMilestones = rock.milestones.filter(m => m.completed).length

          return (
            <motion.div
              key={rock.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onMouseEnter={() => setHoveredRock(rock.id)}
              onMouseLeave={() => setHoveredRock(null)}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIcon className={`h-5 w-5 ${statusConfig.iconColor} flex-shrink-0`} />
                    <h4 className="font-semibold text-slate-900">{rock.title}</h4>
                  </div>
                  <p className="text-sm text-slate-600">{rock.description}</p>
                </div>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.textColor} flex-shrink-0`}>
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-medium">Progress</span>
                  <span className="font-bold text-slate-900">{rock.progress}%</span>
                </div>
                <div className="relative">
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${statusConfig.progressColor} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${rock.progress}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rock.progress}
                    onChange={(e) => handleProgressChange(rock.id, Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                {hoveredRock === rock.id && (
                  <p className="text-xs text-slate-500 italic">Drag the progress bar to update</p>
                )}
              </div>

              {/* Milestones */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-medium">Milestones</span>
                  <span className="font-semibold">
                    {completedMilestones}/{rock.milestones.length}
                  </span>
                </div>
                {rock.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={milestone.completed}
                      className="h-4 w-4"
                      disabled
                    />
                    <span
                      className={`text-sm ${
                        milestone.completed
                          ? "line-through text-slate-400"
                          : "text-slate-700"
                      }`}
                    >
                      {milestone.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">Due: {rock.dueDate}</span>
                <span className="text-xs font-medium text-blue-600">Q1 2026</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
