"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText,
  Target,
  BarChart3,
  Users,
  AlertCircle,
  Sitemap,
  Lightbulb,
  KanbanSquare
} from "lucide-react"
import { DemoEODForm } from "./demo-eod-form"
import { DemoRocks } from "./demo-rocks"
import { DemoScorecard } from "./demo-scorecard"
import { DemoLevel10 } from "./demo-level10"
import { DemoIDS } from "./demo-ids"
import { DemoAccountabilityChart } from "./demo-accountability-chart"
import { DemoVTO } from "./demo-vto"
import { DemoKanban } from "./demo-kanban"

type FeatureTab = {
  id: string
  label: string
  icon: React.ReactNode
  component: React.ReactNode
}

const features: FeatureTab[] = [
  {
    id: "eod",
    label: "EOD Reports",
    icon: <FileText className="w-4 h-4" />,
    component: <DemoEODForm />
  },
  {
    id: "rocks",
    label: "Quarterly Rocks",
    icon: <Target className="w-4 h-4" />,
    component: <DemoRocks />
  },
  {
    id: "scorecard",
    label: "Scorecard",
    icon: <BarChart3 className="w-4 h-4" />,
    component: <DemoScorecard />
  },
  {
    id: "level10",
    label: "Level 10 Meetings",
    icon: <Users className="w-4 h-4" />,
    component: <DemoLevel10 />
  },
  {
    id: "ids",
    label: "IDS Process",
    icon: <AlertCircle className="w-4 h-4" />,
    component: <DemoIDS />
  },
  {
    id: "accountability",
    label: "Accountability Chart",
    icon: <Sitemap className="w-4 h-4" />,
    component: <DemoAccountabilityChart />
  },
  {
    id: "vto",
    label: "Vision/Traction Organizer",
    icon: <Lightbulb className="w-4 h-4" />,
    component: <DemoVTO />
  },
  {
    id: "kanban",
    label: "Kanban Board",
    icon: <KanbanSquare className="w-4 h-4" />,
    component: <DemoKanban />
  }
]

export function InteractiveFeaturesShowcase() {
  const [activeTab, setActiveTab] = useState(features[0].id)

  const activeFeature = features.find(f => f.id === activeTab)

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => setActiveTab(feature.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap
              ${activeTab === feature.id
                ? 'bg-black text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }
            `}
          >
            {feature.icon}
            {feature.label}
          </button>
        ))}
      </div>

      {/* Demo Container with Sage Green Background */}
      <div className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12">
        <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Browser Chrome */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="text-xs text-gray-500 font-medium">
                {activeFeature?.label}
              </div>
            </div>
          </div>

          {/* Interactive Demo Content */}
          <div className="bg-white p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeFeature?.component}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
