"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Send, Check, Target, X, Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const DEMO_TEXT = `- Updated the marketing landing page with new testimonials
- Had product sync with engineering team
- Reviewed Q1 analytics dashboard mockups
- Set up new automation for lead routing
- Blocked on: waiting for design feedback

Tomorrow: finalize newsletter, launch new feature`

const DEMO_ROCKS = [
  { id: "1", title: "Improve Marketing Conversion Rate" },
  { id: "2", title: "Launch New Product Features" },
  { id: "3", title: "Build Engineering Team" },
]

interface ParsedTask {
  id: string
  text: string
  rockId: string | null
  rockTitle: string | null
}

export function DemoEODForm() {
  const [step, setStep] = useState<"input" | "preview" | "success">("input")
  const [textInput, setTextInput] = useState("")
  const [tasks, setTasks] = useState<ParsedTask[]>([])
  const [challenges, setChallenges] = useState("")
  const [priorities, setPriorities] = useState<ParsedTask[]>([])

  const handleParse = () => {
    // Simulate AI parsing
    setTasks([
      { id: "1", text: "Updated the marketing landing page with new testimonials", rockId: "1", rockTitle: "Improve Marketing Conversion Rate" },
      { id: "2", text: "Had product sync with engineering team", rockId: "3", rockTitle: "Build Engineering Team" },
      { id: "3", text: "Reviewed Q1 analytics dashboard mockups", rockId: "2", rockTitle: "Launch New Product Features" },
      { id: "4", text: "Set up new automation for lead routing", rockId: "1", rockTitle: "Improve Marketing Conversion Rate" },
    ])
    setChallenges("Waiting for design feedback on analytics dashboard")
    setPriorities([
      { id: "p1", text: "Finalize newsletter content", rockId: "1", rockTitle: "Improve Marketing Conversion Rate" },
      { id: "p2", text: "Launch new feature announcement", rockId: "2", rockTitle: "Launch New Product Features" },
    ])
    setStep("preview")
  }

  const handleSubmit = () => {
    setStep("success")
    setTimeout(() => {
      setStep("input")
      setTextInput("")
      setTasks([])
      setChallenges("")
      setPriorities([])
    }, 3000)
  }

  const handleReset = () => {
    setStep("input")
    setTextInput("")
  }

  const handleLoadDemo = () => {
    setTextInput(DEMO_TEXT)
  }

  // Group tasks by rock
  const tasksByRock = tasks.reduce((acc, task) => {
    const key = task.rockId || "general"
    if (!acc[key]) {
      acc[key] = {
        rockTitle: task.rockTitle || "General Tasks",
        tasks: [],
      }
    }
    acc[key].tasks.push(task)
    return acc
  }, {} as Record<string, { rockTitle: string; tasks: ParsedTask[] }>)

  return (
    <div className="w-full max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-slate-900">AI EOD Report Generator</h3>
                  <p className="text-sm text-slate-600">Paste your daily tasks and let AI organize them by rocks</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Paste Your Daily Tasks</label>
                <Textarea
                  placeholder="Paste everything you accomplished today..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={10}
                  className="font-mono text-sm resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleParse}
                  disabled={!textInput.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse & Organize Tasks
                </Button>
                {!textInput && (
                  <Button
                    onClick={handleLoadDemo}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Load Demo
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {step === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-slate-900">Review Your EOD Report</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <X className="h-4 w-4 mr-1" />
                  Start Over
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800">
                  AI organized {tasks.length} tasks across {Object.keys(tasksByRock).length} rocks
                </p>
              </div>

              {/* Tasks by Rock */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">
                    Tasks ({tasks.length})
                  </label>
                </div>

                {Object.entries(tasksByRock).map(([key, group]) => (
                  <Card key={key} className="border-slate-200">
                    <CardHeader className="py-3 px-4 bg-slate-50">
                      <div className="flex items-center gap-2">
                        {key !== "general" && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            Rock
                          </Badge>
                        )}
                        <CardTitle className="text-sm font-medium">{group.rockTitle}</CardTitle>
                        <Badge variant="secondary" className="ml-auto">{group.tasks.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                      {group.tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                          <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{task.text}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Challenges */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Challenges</label>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
                  {challenges}
                </div>
              </div>

              {/* Tomorrow's Priorities */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tomorrow's Priorities</label>
                <div className="space-y-2">
                  {priorities.map((priority, idx) => (
                    <div key={priority.id} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                      <span className="text-sm font-semibold text-blue-600 flex-shrink-0">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-sm text-slate-700">{priority.text}</p>
                        {priority.rockTitle && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <Target className="h-3 w-3" />
                            {priority.rockTitle}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit EOD Report
              </Button>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-xl shadow-xl border border-emerald-200 overflow-hidden"
          >
            <div className="p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="h-8 w-8 text-emerald-600" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">EOD Report Submitted!</h3>
              <p className="text-slate-600">Your progress has been recorded and your team has been notified</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
