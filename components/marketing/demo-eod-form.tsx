"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Send, Check, Target, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const DEMO_TEXT = `- Updated the marketing landing page with new testimonials
- Had product sync with engineering team
- Reviewed Q1 analytics dashboard mockups
- Set up new automation for lead routing
- Blocked on: waiting for design feedback

Tomorrow: finalize newsletter, launch new feature`

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
    <div className="w-full max-w-3xl mx-auto min-w-0">
      <AnimatePresence mode="wait">
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-gray-900 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base">AI EOD Report Generator</h3>
                  <p className="text-xs sm:text-sm text-slate-600 truncate">Paste your daily tasks and let AI organize them by rocks</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
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

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  onClick={handleParse}
                  disabled={!textInput.trim()}
                  className="flex-1 bg-gray-900 hover:bg-black text-white text-sm sm:text-base"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span className="truncate">Parse & Organize Tasks</span>
                </Button>
                {!textInput && (
                  <Button
                    onClick={handleLoadDemo}
                    variant="outline"
                    className="border-gray-300 text-gray-900 hover:bg-gray-100 text-sm sm:text-base whitespace-nowrap"
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
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-gray-900 flex-shrink-0" />
                  <h3 className="font-semibold text-slate-900 text-sm sm:text-base truncate">Review Your EOD Report</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} className="flex-shrink-0">
                  <X className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Start Over</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[600px] overflow-y-auto">
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-2 sm:p-3">
                <p className="text-xs sm:text-sm font-medium text-gray-900">
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
                          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
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
                          <Check className="h-4 w-4 text-gray-700 mt-0.5 flex-shrink-0" />
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
                <div className="p-3 bg-gray-100 border border-gray-300 rounded text-sm text-gray-900">
                  {challenges}
                </div>
              </div>

              {/* Tomorrow's Priorities */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Tomorrow's Priorities</label>
                <div className="space-y-2">
                  {priorities.map((priority, idx) => (
                    <div key={priority.id} className="flex items-start gap-2 p-2 bg-gray-100 rounded">
                      <span className="text-sm font-semibold text-gray-800 flex-shrink-0">{idx + 1}.</span>
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
            className="bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden"
          >
            <div className="p-6 sm:p-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="h-8 w-8 text-gray-800" />
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
