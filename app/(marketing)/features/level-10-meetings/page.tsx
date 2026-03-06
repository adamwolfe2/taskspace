"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Calendar,
  Clock,
  Target,
  ListChecks,
  X,
  CheckSquare,
  AlertCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PageTransition } from "@/components/marketing/page-transition"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0,  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export default function Level10MeetingsPage() {
  const [, setCurrentSection] = useState(2)
  const sections = [
    { name: "Segue", time: 5, status: "done" },
    { name: "Scorecard", time: 5, status: "done" },
    { name: "Rock Review", time: 5, status: "current" },
    { name: "Customer/Employee Headlines", time: 5, status: "upcoming" },
    { name: "To-Do List", time: 5, status: "upcoming" },
    { name: "IDS", time: 60, status: "upcoming" },
    { name: "Conclude", time: 5, status: "upcoming" },
  ]

  return (
    <>
      <PageTransition>
      <div className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
                  <Calendar className="w-4 h-4 mr-1" />
                  LEVEL 10 MEETINGS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1]">
                The most productive{" "}
                <span className="text-slate-400">90 minutes</span> of your week
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-base sm:text-xl text-slate-600 leading-relaxed">
                Perfect Level 10 agendas, pre-populated with scorecard data, rock updates, and issues.
                Same day, same time, same agenda. 90 minutes that solve real problems.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start gap-4">
                <Link href="/app?page=register">
                  <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-8 h-14 text-base font-semibold">
                    Get started. It's FREE!
                  </Button>
                </Link>
                <div className="text-sm text-slate-500">
                  Free forever.
                  <br />
                  14-day free trial.
                </div>
              </motion.div>

            </motion.div>

            {/* Right - Interactive Meeting Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Leadership Team Level 10</h3>
                      <p className="text-xs text-slate-500">Every Monday @ 10:00 AM</p>
                    </div>
                    <Badge className="bg-white text-gray-600 border-gray-200">90 min</Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-600 rounded-full transition-all"
                      style={{ width: "35%" }}
                    />
                  </div>

                  {/* Meeting Agenda */}
                  <div className="space-y-2">
                    {sections.map((section, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSection(i)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
                          section.status === "done" && "bg-gray-50 border border-gray-200",
                          section.status === "current" && "bg-slate-50 border border-gray-300 shadow-sm",
                          section.status === "upcoming" && "bg-slate-50 border border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {section.status === "done" ? (
                            <CheckSquare className="w-5 h-5 text-black font-bold" />
                          ) : section.status === "current" ? (
                            <Clock className="w-5 h-5 text-black animate-pulse" />
                          ) : (
                            <div className="w-5 h-5 rounded border-2 border-slate-300" />
                          )}
                          <span className={cn(
                            "text-sm font-semibold",
                            section.status === "current" ? "text-slate-900" : "text-slate-900"
                          )}>
                            {section.name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{section.time} min</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Time Elapsed:</span>
                      <span className="font-bold text-slate-900">30 / 90 minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Problem/Solution */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* The Old Way */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="outline" className="border-gray-200 text-gray-600 bg-white mb-4">
                  The Problem
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                Most leadership meetings <span className="text-black font-bold">waste time</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "60% of meeting time spent on updates, not solving issues",
                  "Agenda changes every week—no consistency",
                  "Scorecard and rock data manually gathered",
                  "No structure for solving problems (IDS)",
                  "Meetings run long or skip critical sections",
                ].map((problem, i) => (
                  <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{problem}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* The Taskspace Way */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
                  The Solution
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                Structured meetings that <span className="text-black font-bold">solve problems</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Perfect 7-section Level 10 agenda every time",
                  "Scorecard and rocks auto-populated from live data",
                  "60 minutes dedicated to IDS (solving real issues)",
                  "Meeting timer keeps every section on track",
                  "Automatic notes and action items captured",
                ].map((solution, i) => (
                  <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{solution}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 1 - Auto-Populated Agenda */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Zap className="w-4 h-4 mr-1" />
                AUTO-POPULATED
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Agenda ready before you sit down
              </h2>

              <p className="text-xl text-slate-600">
                No more scrambling to update spreadsheets before the meeting. Your scorecard, rocks,
                and to-dos are already populated from live data.
              </p>

              <ul className="space-y-4">
                {[
                  { icon: Target, text: "Rock progress automatically updated from EODs" },
                  { icon: ListChecks, text: "Scorecard metrics pulled from latest data" },
                  { icon: CheckSquare, text: "To-do list shows status of last week's action items" },
                  { icon: AlertCircle, text: "Issues list pre-populated from team submissions" },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-black" />
                      </div>
                      <div className="flex-1 pt-2">
                        <span className="text-slate-700">{item.text}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">Scorecard Review</h3>
                    <Badge className="bg-white text-gray-600 border-gray-200">5 min</Badge>
                  </div>
                  <div className="space-y-2">
                    {[
                      { metric: "Revenue", value: "$112k", status: "up" },
                      { metric: "New Customers", value: "13", status: "up" },
                      { metric: "Churn Rate", value: "2.5%", status: "down" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-3 rounded-lg flex items-center justify-between",
                          item.status === "up" ? "bg-emerald-50" : "bg-red-50"
                        )}
                      >
                        <span className="text-sm font-medium text-slate-900">{item.metric}</span>
                        <span className={cn(
                          "text-sm font-bold",
                          item.status === "up" ? "text-black font-bold" : "text-black font-bold"
                        )}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-2">Rock Review</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-slate-900">Product Launch</span>
                        <span className="text-xs font-bold text-black font-bold">85%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-xs text-slate-900">Revenue Growth</span>
                        <span className="text-xs font-bold text-black font-bold">72%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 2 - IDS Process */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">IDS - Identify, Discuss, Solve</h3>
                  <Badge className="bg-gray-100 text-gray-700">60 min</Badge>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900">High churn rate (2 weeks)</span>
                      <Badge className="bg-gray-100 text-gray-700 text-xs">Priority 1</Badge>
                    </div>
                    <div className="text-xs text-slate-600 mb-3">
                      Owner: Sarah Chen • Added from Scorecard Review
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-orange-900">I</span>
                        </div>
                        <p className="text-xs text-slate-700">Product onboarding too complex</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-orange-900">D</span>
                        </div>
                        <p className="text-xs text-slate-700">Team discussed simplifying flow</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-emerald-900">S</span>
                        </div>
                        <p className="text-xs text-slate-700">Ship new onboarding by Friday</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">Hiring velocity slow</span>
                      <Badge variant="outline" className="text-xs">Priority 2</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">Marketing budget planning</span>
                      <Badge variant="outline" className="text-xs">Priority 3</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Zap className="w-4 h-4 mr-1" />
                IDS PROCESS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                60 minutes to solve your biggest problems
              </h2>

              <p className="text-xl text-slate-600">
                The IDS process (Identify, Discuss, Solve) is where real work happens. Structured
                problem-solving that moves issues from blockers to action items.
              </p>

              <ul className="space-y-4">
                {[
                  "Prioritized issues list from entire team",
                  "Guided IDS framework for each issue",
                  "Track progress from Identify → Discuss → Solve",
                  "Automatic to-dos created from solutions",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 3 - Meeting Timer */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Clock className="w-4 h-4 mr-1" />
                MEETING TIMER
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Stay on track, every single week
              </h2>

              <p className="text-xl text-slate-600">
                Built-in timer keeps every section on schedule. Visual and audio alerts ensure you
                finish in exactly 90 minutes—not 2 hours.
              </p>

              <ul className="space-y-4">
                {[
                  "Automatic timers for each agenda section",
                  "Visual progress bar shows time remaining",
                  "Gentle alerts when time is running low",
                  "Option to extend critical sections",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/app?page=register">
                <Button className="bg-black hover:bg-gray-900 text-white rounded-full px-6">
                  Start better meetings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-slate-900 mb-2">35:42</div>
                    <p className="text-sm text-slate-600">Time Remaining</p>
                  </div>

                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
                    <div
                      className="h-full bg-gray-600 rounded-full"
                      style={{ width: "60%" }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">Current: IDS</span>
                        <span className="text-xs text-slate-600">35 min left</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Next: Conclude</span>
                        <span className="text-xs text-slate-500">5 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ready to run better meetings?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Start running structured Level 10 meetings that solve real problems. Free forever. 14-day free trial on paid plans.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/app?page=register">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 rounded-full px-8">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="border-gray-200 hover:bg-white text-black rounded-full px-8">
                Explore all features
              </Button>
            </Link>
          </div>
        </div>
      </section>

    </div>
    </PageTransition>
    </>
  )
}
