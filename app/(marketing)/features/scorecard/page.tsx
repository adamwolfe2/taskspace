"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  X,
  AlertCircle,
  Target,
  Brain,
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

export default function ScorecardPage() {
  const [selectedWeek, setSelectedWeek] = useState(2)

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
                  <BarChart3 className="w-4 h-4 mr-1" />
                  WEEKLY SCORECARD
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1]">
                Track the pulse of your{" "}
                <span className="text-slate-400">business weekly</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-base sm:text-xl text-slate-600 leading-relaxed">
                Define 5-15 measurables that matter. Track them weekly. Identify trends before they
                become problems. Built for Level 10 meetings and EOS scorecards.
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

            {/* Right - Interactive Scorecard Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Weekly Scorecard</h3>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((week) => (
                        <button
                          key={week}
                          onClick={() => setSelectedWeek(week)}
                          className={cn(
                            "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                            selectedWeek === week
                              ? "bg-black text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          W{week}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scorecard Metrics */}
                  <div className="space-y-3">
                    {[
                      { metric: "Revenue", target: "$100k", week1: "$95k", week2: "$105k", week3: "$108k", week4: "$112k", owner: "Sales" },
                      { metric: "New Customers", target: "10", week1: "8", week2: "12", week3: "11", week4: "13", owner: "Marketing" },
                      { metric: "Customer Churn", target: "<2%", week1: "2.5%", week2: "1.5%", week3: "1.8%", week4: "1.2%", owner: "Success" },
                      { metric: "NPS Score", target: "45", week1: "42", week2: "48", week3: "47", week4: "49", owner: "Product" },
                    ].map((row, i) => {
                      const weekValue = row[`week${selectedWeek}` as keyof typeof row] as string
                      const isOnTarget =
                        (row.metric === "Revenue" && parseInt(weekValue.replace(/\D/g, "")) >= 100) ||
                        (row.metric === "New Customers" && parseInt(weekValue) >= 10) ||
                        (row.metric === "Customer Churn" && parseFloat(weekValue) < 2) ||
                        (row.metric === "NPS Score" && parseInt(weekValue) >= 45)

                      return (
                        <div
                          key={i}
                          className={cn(
                            "p-4 rounded-xl border transition-all",
                            isOnTarget ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 text-sm">{row.metric}</div>
                              <div className="text-xs text-slate-500">Target: {row.target} • Owner: {row.owner}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-slate-900">{weekValue}</div>
                              {isOnTarget ? (
                                <TrendingUp className="w-4 h-4 text-black inline-block" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-black inline-block" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Overall Health:</span>
                      <Badge className="bg-gray-100 text-gray-700">3/4 On Target</Badge>
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
                Spreadsheet scorecards <span className="text-black font-bold">don't work</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Manual data entry every week wastes hours",
                  "Numbers buried in spreadsheets no one looks at",
                  "Trends spotted too late to take action",
                  "Disconnected from rocks and daily work",
                  "Leaders fly blind between quarterly reviews",
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
                Live scorecards that <span className="text-black font-bold">drive action</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Auto-populated from EOD reports and integrations",
                  "Real-time visibility for entire leadership team",
                  "AI detects negative trends and alerts owners",
                  "Integrated into Level 10 meeting agendas",
                  "Clear owners and targets for every metric",
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

      {/* Feature Deep Dive 1 - Custom Metrics */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Target className="w-4 h-4 mr-1" />
                CUSTOM METRICS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Track what matters to your business
              </h2>

              <p className="text-xl text-slate-600">
                Every business is different. Define your own measurables—from revenue and customer
                acquisition to product quality and team happiness.
              </p>

              <ul className="space-y-4">
                {[
                  { icon: BarChart3, text: "Unlimited custom metrics per department" },
                  { icon: Users, text: "Assign clear owners to every measurable" },
                  { icon: Target, text: "Set weekly, monthly, or quarterly targets" },
                  { icon: Calendar, text: "Historical tracking to spot long-term trends" },
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
                  <h3 className="font-bold text-slate-900 mb-4">Add Custom Metric</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase">Metric Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Monthly Recurring Revenue"
                        className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg text-sm"
                        defaultValue="Customer Satisfaction Score"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase">Target</label>
                      <input
                        type="text"
                        placeholder="e.g., 95%"
                        className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg text-sm"
                        defaultValue="≥ 90%"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase">Owner</label>
                      <select className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">
                        <option>Sarah Chen - Customer Success</option>
                        <option>Michael Rodriguez - Product</option>
                        <option>Emily Watson - Sales</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase">Frequency</label>
                      <select className="w-full mt-1 px-4 py-2 border border-slate-200 rounded-lg text-sm">
                        <option>Weekly</option>
                        <option>Monthly</option>
                        <option>Quarterly</option>
                      </select>
                    </div>
                  </div>
                  <Button className="w-full bg-black hover:bg-gray-900 text-white rounded-lg mt-4">
                    Add Metric
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 2 - AI Trend Detection */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Trend Alerts</h3>
                  <Badge className="bg-white text-gray-600 border-gray-200">
                    <Brain className="w-3 h-3 mr-1" />
                    AI Powered
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-sm mb-1">Declining Trend Detected</p>
                        <p className="text-xs text-slate-600 mb-2">
                          "Customer Churn" has been above target for 2 consecutive weeks
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs bg-black hover:bg-gray-900 text-white">
                            Escalate to IDS
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            View History
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <TrendingDown className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-sm mb-1">Velocity Slowdown</p>
                        <p className="text-xs text-slate-600">
                          "New Leads" trending 15% below last month's average
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 text-sm mb-1">Positive Momentum</p>
                        <p className="text-xs text-slate-600">
                          "NPS Score" exceeding target for 4 weeks straight
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Brain className="w-4 h-4 mr-1" />
                AI INSIGHTS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Spot problems before they become crises
              </h2>

              <p className="text-xl text-slate-600">
                Our AI analyzes your scorecard data to detect negative trends, velocity changes,
                and patterns that need attention. Get alerts when metrics go off track.
              </p>

              <ul className="space-y-4">
                {[
                  "Automatic trend detection across all metrics",
                  "Smart alerts sent to metric owners",
                  "Predictive forecasting for key measurables",
                  "One-click escalation to IDS issues list",
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

      {/* Feature Deep Dive 3 - Level 10 Integration */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Calendar className="w-4 h-4 mr-1" />
                LEVEL 10 INTEGRATION
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Built for your weekly Level 10 meetings
              </h2>

              <p className="text-xl text-slate-600">
                Your scorecard automatically populates the Scorecard Review section of your Level 10
                agenda. Spend 5 minutes reviewing trends, not 20 minutes updating spreadsheets.
              </p>

              <ul className="space-y-4">
                {[
                  "Auto-populated in Level 10 agenda",
                  "Highlight off-track metrics for discussion",
                  "Historical comparison with previous weeks",
                  "One-click to add scorecard issues to IDS",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/app?page=register">
                <Button className="bg-black hover:bg-gray-900 text-white rounded-full px-6">
                  Start tracking metrics
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Level 10 - Scorecard Review</h3>
                  <div className="space-y-3">
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-3">
                      5 Minutes • Week of Jan 27
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">Revenue</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-black">$112k</span>
                          <TrendingUp className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">Churn Rate</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-black">2.5%</span>
                          <AlertCircle className="w-4 h-4 text-black" />
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs">
                        Add to IDS
                      </Button>
                    </div>

                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">NPS Score</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-black">49</span>
                          <TrendingUp className="w-4 h-4 text-black" />
                        </div>
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
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ready to track the metrics that matter?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Start building your weekly scorecard today. Free forever. 14-day free trial on paid plans.
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
