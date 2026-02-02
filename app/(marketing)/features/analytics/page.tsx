"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Zap,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  Target,
  Download,
  Filter,
  ChevronRight,
  Calendar,
} from "lucide-react"
import { cn } from "@/lib/utils"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

// Interactive Analytics Demo
function InteractiveAnalyticsDemo() {
  const [timeRange, setTimeRange] = useState("7d")
  const [selectedMetric, setSelectedMetric] = useState("submission")

  const metrics = [
    {
      id: "submission",
      label: "Submission Rate",
      value: "94%",
      change: "+5%",
      trend: "up",
      color: "emerald",
    },
    {
      id: "rocks",
      label: "Rocks On Track",
      value: "78%",
      change: "+12%",
      trend: "up",
      color: "blue",
    },
    {
      id: "blockers",
      label: "Open Blockers",
      value: "3",
      change: "-2",
      trend: "down",
      color: "amber",
    },
    {
      id: "sentiment",
      label: "Team Sentiment",
      value: "8.4",
      change: "+0.3",
      trend: "up",
      color: "purple",
    },
  ]

  const chartData = [
    { day: "Mon", value: 85 },
    { day: "Tue", value: 92 },
    { day: "Wed", value: 88 },
    { day: "Thu", value: 95 },
    { day: "Fri", value: 91 },
    { day: "Sat", value: 100 },
    { day: "Sun", value: 94 },
  ]

  const teamPerformance = [
    { name: "Engineering", rate: 96, members: 8, color: "bg-gray-500" },
    { name: "Product", rate: 92, members: 4, color: "bg-gray-500" },
    { name: "Marketing", rate: 88, members: 5, color: "bg-gray-500" },
    { name: "Sales", rate: 85, members: 6, color: "bg-amber-500" },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Analytics Dashboard</h3>
              <p className="text-sm text-slate-500">Real-time team insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white rounded-lg text-sm font-medium transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Time Range Selector */}
        <div className="flex items-center gap-2 mb-6">
          {["24h", "7d", "30d", "90d"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                timeRange === range
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {metrics.map((metric) => (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={cn(
                "text-left p-4 rounded-xl border-2 transition-all",
                selectedMetric === metric.id
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-100 hover:border-slate-200"
              )}
            >
              <div className="text-sm text-slate-500 mb-1">{metric.label}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {metric.value}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium flex items-center gap-0.5",
                    metric.trend === "up" ? "text-black" : "text-black"
                  )}
                >
                  {metric.trend === "up" ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {metric.change}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-slate-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-slate-900">Submission Rate Trend</h4>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              Last 7 days
            </div>
          </div>
          <div className="h-40 flex items-end gap-2">
            {chartData.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${d.value}%` }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="w-full bg-gray-600 rounded-t-lg relative group"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.value}%
                  </div>
                </motion.div>
                <span className="text-xs text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Performance */}
        <div>
          <h4 className="font-medium text-slate-900 mb-3">Team Performance</h4>
          <div className="space-y-3">
            {teamPerformance.map((team) => (
              <div key={team.name} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-slate-700">
                  {team.name}
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${team.rate}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn("h-full rounded-full", team.color)}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium text-slate-900">
                  {team.rate}%
                </div>
                <div className="w-20 text-right text-xs text-slate-500">
                  {team.members} members
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"
import { PageTransition } from "@/components/marketing/page-transition"

const features = [
  {
    icon: TrendingUp,
    title: "Real-Time Dashboards",
    description:
      "Monitor team performance in real-time with live updating dashboards that surface the metrics that matter most.",
  },
  {
    icon: Users,
    title: "Team Comparisons",
    description:
      "Compare performance across teams to identify top performers and teams that may need additional support.",
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description:
      "Track progress toward quarterly rocks and OKRs with visual progress indicators and milestone tracking.",
  },
  {
    icon: Download,
    title: "Custom Reports",
    description:
      "Generate custom reports and export data in multiple formats for stakeholder presentations.",
  },
]

const insights = [
  {
    type: "success",
    title: "Engineering team hit 96% submission rate",
    description: "Best performing team this quarter",
  },
  {
    type: "warning",
    title: "3 blockers unresolved for >48 hours",
    description: "Consider escalating to leadership",
  },
  {
    type: "info",
    title: "Q4 rocks 78% on track",
    description: "2 rocks at risk of missing deadline",
  },
]

export default function AnalyticsPage() {
  return (
    <>
      <MegaMenu />
      <PageTransition>
      <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-gray-200 text-black text-sm font-medium mb-6"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics & Insights
              </motion.div>
              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6"
              >
                Data-Driven{" "}
                <span className="text-gradient-primary">Team Performance</span>
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-600 mb-8 leading-relaxed"
              >
                Gain deep visibility into team performance with powerful analytics
                dashboards, trend analysis, and actionable insights.
              </motion.p>
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
                >
                  Try It Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3 text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors font-medium"
                >
                  Watch Demo
                </Link>
              </motion.div>
            </motion.div>

            {/* Interactive Demo */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl opacity-10 blur-2xl" />
                <div className="relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-full flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Interactive Demo - Try it!
                    </div>
                  </div>
                  <InteractiveAnalyticsDemo />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
            >
              Insights That Drive Results
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              Transform raw data into actionable intelligence for your team
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-8"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="bg-slate-50 rounded-2xl p-8 hover:bg-slate-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI Insights Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-500/10 border border-purple-500/20 text-gray-400 text-sm font-medium mb-6"
              >
                <Zap className="w-4 h-4" />
                AI-Powered Insights
              </motion.div>
              <motion.h2
                variants={fadeInUp}
                className="text-3xl sm:text-4xl font-bold text-white mb-6"
              >
                Let AI Surface What Matters
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-300 mb-8"
              >
                Our AI analyzes your team&apos;s data to surface important insights,
                patterns, and recommendations you might otherwise miss.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-4">
                {[
                  "Automatic trend detection and alerts",
                  "Performance pattern recognition",
                  "Blocker prediction and early warnings",
                  "Team health scoring and recommendations",
                ].map((item) => (
                  <motion.li
                    key={item}
                    variants={fadeInUp}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-slate-200">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-xl border",
                    insight.type === "success"
                      ? "bg-gray-500/10 border-emerald-500/20"
                      : insight.type === "warning"
                      ? "bg-amber-500/10 border-amber-500/20"
                      : "bg-gray-500/10 border-blue-500/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        insight.type === "success"
                          ? "bg-gray-500/20"
                          : insight.type === "warning"
                          ? "bg-amber-500/20"
                          : "bg-gray-500/20"
                      )}
                    >
                      {insight.type === "success" ? (
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                      ) : insight.type === "warning" ? (
                        <TrendingDown className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Target className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-white">{insight.title}</div>
                      <div className="text-sm text-slate-400">
                        {insight.description}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
            >
              Ready to Unlock Team Insights?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 mb-8"
            >
              Start making data-driven decisions today.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gray-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-8 py-4 text-slate-700 font-medium hover:text-slate-900 transition-colors"
              >
                Explore All Features
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
      </PageTransition>
    <MarketingFooter />
    </>
  )
}
