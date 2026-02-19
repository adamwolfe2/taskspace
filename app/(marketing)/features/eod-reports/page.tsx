"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  BarChart3,
  Brain,
  Zap,
  Target,
  TrendingUp,
  X,
  Sparkles,
  Users,
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

export default function EODReportsPage() {
  return (
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
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI-POWERED EOD REPORTS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1]">
                An EOD reporting system that{" "}
                <span className="text-slate-400">saves time</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed">
                Just paste your daily task dump. Our AI instantly organizes it by your quarterly rocks,
                identifies blockers, and creates a professional End-of-Day report in seconds.
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

            {/* Right - Product Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Product UI Mockup */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Submit EOD Report</h3>
                    <Badge className="bg-white text-gray-600 border-gray-200">
                      <Brain className="w-3 h-3 mr-1" />
                      AI Powered
                    </Badge>
                  </div>

                  {/* Input Area */}
                  <div className="bg-slate-50 rounded-xl p-4 border-2 border-dashed border-slate-300">
                    <p className="text-sm text-slate-500 mb-3">Paste your daily task dump...</p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>• Finished product roadmap Q1</p>
                      <p>• Met with sales team about pricing</p>
                      <p>• Fixed bug in dashboard</p>
                      <p>• Blocked on API access from IT</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 text-black">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span className="text-sm font-medium">AI Processing...</span>
                    </div>
                  </div>

                  {/* Output */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-black" />
                        <span className="text-xs font-semibold text-slate-900 uppercase">Rock: Product Launch</span>
                      </div>
                      <p className="text-sm text-slate-600">✓ Finished product roadmap Q1</p>
                      <p className="text-sm text-slate-600">✓ Met with sales team about pricing</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-black" />
                        <span className="text-xs font-semibold text-slate-900 uppercase">Rock: Platform Stability</span>
                      </div>
                      <p className="text-sm text-slate-600">✓ Fixed bug in dashboard</p>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-700 uppercase">🚧 Blockers</span>
                      </div>
                      <p className="text-sm text-slate-600">• Blocked on API access from IT</p>
                    </div>
                  </div>

                  <Button className="w-full bg-black hover:bg-gray-900 text-white rounded-xl">
                    Submit Report
                  </Button>
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
                  You deserve better than this
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                EOD reports shouldn't take <span className="text-black font-bold">30 minutes</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Manually writing updates in Slack or email",
                  "Forgetting what you accomplished today",
                  "Struggling to align tasks with quarterly goals",
                  "Blockers get buried and overlooked",
                  "Managers have no visibility into team progress",
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
                  You deserve the best
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                Submit EODs in <span className="text-black font-bold">10 seconds</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Paste your task dump. AI organizes it instantly",
                  "Automatically categorized by your quarterly rocks",
                  "Blockers highlighted and flagged to managers",
                  "Progress tracked against goals in real-time",
                  "Team dashboard updated automatically",
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

      {/* Feature Deep Dive 1 - AI Processing */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Brain className="w-4 h-4 mr-1" />
                AI INTELLIGENCE
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                AI that understands your work context
              </h2>

              <p className="text-xl text-slate-600">
                Our AI learns your quarterly rocks, recognizes your work patterns, and automatically
                categorizes every task you submit.
              </p>

              <ul className="space-y-4">
                {[
                  { icon: Target, text: "Automatically maps tasks to quarterly rocks" },
                  { icon: Zap, text: "Identifies blockers and urgency levels" },
                  { icon: TrendingUp, text: "Tracks progress toward rock completion" },
                  { icon: Users, text: "Highlights cross-team dependencies" },
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">AI Analysis</span>
                    <Badge className="bg-black text-white border-0">Processing</Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" />
                      <span className="text-sm text-slate-600">Detecting rock associations...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" style={{ animationDelay: "0.2s" }} />
                      <span className="text-sm text-slate-600">Identifying blockers...</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-600 animate-pulse" style={{ animationDelay: "0.4s" }} />
                      <span className="text-sm text-slate-600">Calculating progress metrics...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 2 - Team Visibility */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Team Dashboard</h3>
                  <div className="space-y-3">
                    {[
                      { name: "Sarah Chen", status: "On track", color: "emerald", tasks: 5 },
                      { name: "Michael R.", status: "Blocked", color: "red", tasks: 3 },
                      { name: "Emily Watson", status: "On track", color: "emerald", tasks: 7 },
                    ].map((member, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-sm text-slate-500">{member.tasks} tasks completed today</p>
                        </div>
                        <Badge className={cn(
                          "border-0",
                          member.color === "emerald" ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700"
                        )}>
                          {member.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <BarChart3 className="w-4 h-4 mr-1" />
                TEAM VISIBILITY
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Give managers real-time visibility
              </h2>

              <p className="text-xl text-slate-600">
                Every EOD report automatically updates your team dashboard. Managers see progress,
                blockers, and trends without asking for status updates.
              </p>

              <ul className="space-y-4">
                {[
                  "See what everyone accomplished today",
                  "Identify blockers before they become problems",
                  "Track rock progress across the entire team",
                  "Spot trends in productivity and morale",
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

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ready to streamline your daily reporting?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Start submitting AI-powered EOD reports in seconds. Free forever. 14-day free trial on paid plans.
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
  )
}
