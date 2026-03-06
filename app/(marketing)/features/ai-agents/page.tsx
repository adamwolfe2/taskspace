"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Brain,
  Sparkles,
  BarChart3,
  Users,
  Target,
  X,
  Zap,
  FileText,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export default function AiAgentsPage() {
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
                    <Brain className="w-4 h-4 mr-1" />
                    AI AGENTS
                  </Badge>
                </motion.div>

                <motion.h1 variants={fadeInUp} className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1]">
                  AI that works{" "}
                  <span className="text-slate-400">alongside your team</span>
                </motion.h1>

                <motion.p variants={fadeInUp} className="text-base sm:text-xl text-slate-600 leading-relaxed">
                  Automated analysis that surfaces insights, identifies blockers, and highlights what
                  needs attention. Let AI handle the data work so you can focus on leading.
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
                  {/* Product UI Mockup - AI Insight Card */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">AI Insights</h3>
                    </div>

                    {/* AI Insight Cards */}
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">EOD Theme Detected</h4>
                            <p className="text-sm text-slate-600">
                              3 team members mentioned "API delays" as a blocker. Consider addressing this in your next standup.
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 ml-11">Analyzed 12 reports • Just now</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                            <BarChart3 className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">Scorecard Alert</h4>
                            <p className="text-sm text-slate-600">
                              "Customer NPS" has declined 3 weeks in a row. Current: 7.2 (target: 8.5)
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 ml-11">Weekly trend analysis • 2h ago</div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">Team Spotlight</h4>
                            <p className="text-sm text-slate-600">
                              Sarah completed 8 high-priority tasks this week. Rock progress: +22%.
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 ml-11">Manager dashboard • 1d ago</div>
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
                  Drowning in data, <span className="text-black font-bold">starving for insights</span>
                </motion.h2>

                <motion.div variants={staggerContainer} className="space-y-4">
                  {[
                    "Manually reading through dozens of EOD reports every week",
                    "No visibility into patterns until it's too late",
                    "Spending hours compiling meeting agendas from scattered data",
                    "Missing early warning signs in team performance",
                    "Can't spot who needs help or who's excelling without digging",
                  ].map((problem, i) => (
                    <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                      <X className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
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
                  AI does the analysis <span className="text-black font-bold">automatically</span>
                </motion.h2>

                <motion.div variants={staggerContainer} className="space-y-4">
                  {[
                    "AI reads every EOD report and extracts key themes",
                    "Automatic pattern detection across metrics and reports",
                    "Meeting agendas generated with prioritized discussion topics",
                    "Proactive alerts when trends shift or problems emerge",
                    "Team health dashboard showing exactly who needs attention",
                  ].map((solution, i) => (
                    <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{solution}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature Deep Dive - AI Agents */}
        <section className="py-20 lg:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
                <Sparkles className="w-4 h-4 mr-1" />
                AI AGENTS
              </Badge>
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Five specialized agents working for your team
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Each agent focuses on a specific area, continuously analyzing your data and surfacing what matters most.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: FileText,
                  title: "EOD Report Analyzer",
                  description:
                    "Reads daily end-of-day reports, extracts key themes, identifies blockers, and summarizes progress across the team.",
                  color: "black",
                },
                {
                  icon: MessageSquare,
                  title: "Meeting Prep Agent",
                  description:
                    "Before Level 10 meetings, it compiles scorecard data, rock progress, open to-dos, and generates a prioritized agenda.",
                  color: "black",
                },
                {
                  icon: BarChart3,
                  title: "Scorecard Insights",
                  description:
                    "Analyzes weekly KPI trends, detects patterns (declining metrics, consistently missed targets), and surfaces alerts.",
                  color: "black",
                },
                {
                  icon: Target,
                  title: "Task Prioritizer",
                  description:
                    "Suggests task priority based on rock alignment, due dates, and team workload to help you focus on what matters.",
                  color: "black",
                },
                {
                  icon: Users,
                  title: "Manager Dashboard AI",
                  description:
                    "Aggregates team member data and highlights who needs attention, who's excelling, and where coaching is needed.",
                  color: "black",
                },
                {
                  icon: Zap,
                  title: "Always Learning",
                  description:
                    "All agents improve over time, learning from your team's patterns and adapting to your unique workflow and priorities.",
                  color: "black",
                },
              ].map((agent, i) => {
                const Icon = agent.icon
                return (
                  <motion.div
                    key={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{agent.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{agent.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 lg:py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge className="bg-white text-gray-600 border-gray-200">
                  <Brain className="w-4 h-4 mr-1" />
                  HOW IT WORKS
                </Badge>

                <h2 className="text-4xl font-bold text-slate-900">
                  Insights appear automatically
                </h2>

                <p className="text-xl text-slate-600">
                  AI agents run in the background, analyzing your team's data 24/7. When they find
                  something important, you get a notification with actionable insights.
                </p>

                <ul className="space-y-4">
                  {[
                    { icon: Sparkles, text: "AI analyzes EODs, metrics, and activity in real-time" },
                    { icon: Brain, text: "Pattern recognition identifies trends before they become problems" },
                    { icon: Zap, text: "Smart notifications only surface what's truly important" },
                    { icon: CheckCircle, text: "Actionable insights with context and recommendations" },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-white" />
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
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center animate-pulse">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900">AI Agent Activity</span>
                    </div>

                    <div className="space-y-3">
                      {[
                        { agent: "EOD Analyzer", status: "Analyzing 8 new reports", time: "Just now" },
                        { agent: "Scorecard Insights", status: "Detected trend shift", time: "5m ago" },
                        { agent: "Meeting Prep", status: "Agenda ready for review", time: "1h ago" },
                        { agent: "Task Prioritizer", status: "Updated 12 priorities", time: "2h ago" },
                      ].map((activity, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-black"></div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{activity.agent}</div>
                            <div className="text-slate-600">{activity.status}</div>
                          </div>
                          <div className="text-slate-500 text-xs">{activity.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Ready to let AI handle the analysis?
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Get automated insights, pattern detection, and smart recommendations. Free forever. 14-day free trial on paid plans.
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
