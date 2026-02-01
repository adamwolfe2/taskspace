"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  CheckCircle,
  Brain,
  Target,
  TrendingUp,
  Users,
  Settings,
  FileText,
  BarChart3,
  Zap,
  Shield,
  Clock,
  AlertCircle,
  Star,
  ChevronRight,
  Wrench,
  Package,
  Gauge,
  ClipboardCheck,
} from "lucide-react"
import { useState } from "react"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function OperationsPage() {
  const [selectedMetric, setSelectedMetric] = useState<string>("delivery")

  const metrics = {
    delivery: {
      name: "On-Time Delivery",
      target: "95%",
      current: "92%",
      trend: "up",
      status: "warning"
    },
    quality: {
      name: "Quality Score",
      target: "98%",
      current: "99%",
      trend: "up",
      status: "success"
    },
    efficiency: {
      name: "Process Efficiency",
      target: "85%",
      current: "88%",
      trend: "up",
      status: "success"
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="text-xl font-bold text-slate-900">Align</div>
              <div className="hidden md:flex items-center gap-6">
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Product</a>
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Solutions</a>
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Learn</a>
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Pricing</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">Log in</Button>
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800">
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <motion.div {...fadeInUp} className="space-y-8">
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                <Settings className="w-3 h-3 mr-1" />
                Operations
              </Badge>

              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                  Run flawless operations
                  <br />
                  <span className="text-slate-400">with precision and clarity</span>
                </h1>

                <p className="text-xl text-slate-600 leading-relaxed">
                  Document processes, track operational metrics, and optimize resource allocation. Give your operations team the tools to execute flawlessly every single day.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-slate-900 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Standardize processes.</span>
                      <span className="text-slate-600"> Document and track SOPs, checklists, and workflows in one place.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-slate-900 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">Track what matters.</span>
                      <span className="text-slate-600"> Real-time operational metrics tied directly to your scorecard.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-slate-900 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">AI-powered insights.</span>
                      <span className="text-slate-600"> Detect bottlenecks, predict issues, and optimize workflows automatically.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-8">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8">
                  Watch Demo
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white" />
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span className="ml-2 text-sm text-slate-600">Loved by 10,000+ operations teams</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Layered Screenshots */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative">
                {/* Back card */}
                <div className="absolute top-8 -right-4 w-[85%] h-[400px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl shadow-xl rotate-3 opacity-80" />

                {/* Middle card */}
                <div className="absolute top-4 right-0 w-[85%] h-[400px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-xl -rotate-2 opacity-90" />

                {/* Front card - Operational Metrics */}
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Operational Metrics</h3>
                        <p className="text-sm text-slate-500">Week of Feb 1-7</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        98% on target
                      </Badge>
                    </div>

                    {/* Metric Selector */}
                    <div className="flex gap-2">
                      {(["delivery", "quality", "efficiency"] as const).map((key) => (
                        <button
                          key={key}
                          onClick={() => setSelectedMetric(key)}
                          className={cn(
                            "flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                            selectedMetric === key
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {metrics[key].name}
                        </button>
                      ))}
                    </div>

                    {/* Selected Metric Display */}
                    <div className={cn(
                      "p-6 rounded-xl",
                      metrics[selectedMetric as keyof typeof metrics].status === "success"
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-orange-50 border border-orange-200"
                    )}>
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="text-sm text-slate-600 mb-1">Current</div>
                          <div className="text-3xl font-bold text-slate-900">
                            {metrics[selectedMetric as keyof typeof metrics].current}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-600 mb-1">Target</div>
                          <div className="text-2xl font-semibold text-slate-700">
                            {metrics[selectedMetric as keyof typeof metrics].target}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {metrics[selectedMetric as keyof typeof metrics].status === "success" ? (
                          <>
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">Above target - great work!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-orange-700">Below target - needs attention</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Process List */}
                    <div className="space-y-2">
                      {[
                        { name: "Order Fulfillment", status: "on-track", completion: 95 },
                        { name: "Quality Checks", status: "on-track", completion: 100 },
                        { name: "Inventory Management", status: "at-risk", completion: 78 }
                      ].map((process) => (
                        <div key={process.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            process.status === "on-track" ? "bg-emerald-500" : "bg-orange-500"
                          )} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-900">{process.name}</div>
                            <div className="text-xs text-slate-500">{process.completion}% complete</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500 mb-8">
            TRUSTED BY OPERATIONS LEADERS AT
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-40">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-slate-300 rounded" />
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-4">
                <Brain className="w-3 h-3 mr-1" />
                AI-Powered Operations
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              AI agents that optimize
              <br />
              <span className="text-slate-400">every operational process</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-slate-600 max-w-3xl mx-auto">
              Four specialized AI agents monitor your operations 24/7, detecting bottlenecks, predicting issues, and recommending optimizations before problems arise.
            </motion.p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                name: "Process Agent",
                description: "Monitors SOPs and workflows, alerts when deviations occur, suggests process improvements",
                icon: Settings,
                color: "from-blue-400 to-blue-600",
                stats: "Reduced errors by 42%"
              },
              {
                name: "Resource Agent",
                description: "Tracks capacity and utilization, predicts bottlenecks, optimizes allocation",
                icon: Users,
                color: "from-emerald-400 to-emerald-600",
                stats: "15% efficiency gain"
              },
              {
                name: "Quality Agent",
                description: "Analyzes quality metrics, flags trends early, recommends corrective actions",
                icon: Shield,
                color: "from-purple-400 to-purple-600",
                stats: "99.2% quality score"
              },
              {
                name: "Efficiency Agent",
                description: "Identifies waste and delays, suggests automation opportunities, tracks improvements",
                icon: Zap,
                color: "from-orange-400 to-orange-600",
                stats: "23hrs saved per week"
              }
            ].map((agent, index) => (
              <motion.div
                key={agent.name}
                variants={fadeInUp}
                className="group relative bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300"
              >
                <div className="space-y-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                    agent.color
                  )}>
                    <agent.icon className="w-7 h-7 text-white" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{agent.name}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">
                      {agent.description}
                    </p>
                    <Badge className="bg-slate-100 text-slate-700 text-xs">
                      {agent.stats}
                    </Badge>
                  </div>

                  <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      Learn more
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Animated border gradient on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="bg-red-100 text-red-700 border-red-200 mb-4">
                <AlertCircle className="w-3 h-3 mr-1" />
                The Problem
              </Badge>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Operations teams are drowning in chaos
              </h2>
              <div className="space-y-4">
                {[
                  "Processes documented in 12 different places (or not at all)",
                  "No visibility into what's actually happening day-to-day",
                  "Issues discovered too late to prevent major problems",
                  "Everyone executing differently with no standardization",
                  "Metrics tracked in spreadsheets that no one looks at"
                ].map((problem, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-slate-700">{problem}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-4">
                <CheckCircle className="w-3 h-3 mr-1" />
                The Solution
              </Badge>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                One platform for flawless execution
              </h2>
              <div className="space-y-4">
                {[
                  "All processes, SOPs, and checklists in one searchable system",
                  "Real-time operational metrics visible to the entire team",
                  "AI detects patterns and predicts issues before they escalate",
                  "Standardized workflows ensure consistency across the board",
                  "Scorecard integration ties daily work to company goals"
                ].map((solution, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-slate-700">{solution}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive 1: Process Documentation */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Badge className="bg-blue-100 text-blue-700">
                <FileText className="w-3 h-3 mr-1" />
                Process Documentation
              </Badge>

              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">
                Document processes
                <br />
                <span className="text-slate-400">everyone actually follows</span>
              </h2>

              <p className="text-xl text-slate-600 leading-relaxed">
                Create living SOPs with checklists, templates, and workflows. Track completion in real-time and ensure every team member executes consistently.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    icon: ClipboardCheck,
                    title: "Interactive Checklists",
                    description: "Step-by-step processes with required approvals and sign-offs"
                  },
                  {
                    icon: FileText,
                    title: "SOP Library",
                    description: "Searchable knowledge base with version history and updates"
                  },
                  {
                    icon: BarChart3,
                    title: "Completion Tracking",
                    description: "See who's following processes and where breakdowns occur"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                      <p className="text-slate-600 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="bg-slate-900 hover:bg-slate-800 mt-6">
                Explore Process Docs
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Order Fulfillment SOP</h3>
                  <Badge className="bg-blue-100 text-blue-700">v2.1</Badge>
                </div>

                <div className="space-y-3">
                  {[
                    { step: "1. Verify order details", status: "complete", user: "Sarah M." },
                    { step: "2. Check inventory availability", status: "complete", user: "Mike R." },
                    { step: "3. Pick items from warehouse", status: "in-progress", user: "James K." },
                    { step: "4. Quality inspection", status: "pending", user: "" },
                    { step: "5. Package and label", status: "pending", user: "" },
                    { step: "6. Schedule shipment", status: "pending", user: "" }
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        item.status === "complete" && "bg-emerald-50 border-emerald-200",
                        item.status === "in-progress" && "bg-blue-50 border-blue-200",
                        item.status === "pending" && "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                        item.status === "complete" && "bg-emerald-500",
                        item.status === "in-progress" && "bg-blue-500",
                        item.status === "pending" && "bg-slate-300"
                      )}>
                        {item.status === "complete" && <CheckCircle className="w-4 h-4 text-white" />}
                        {item.status === "in-progress" && <Clock className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-900">{item.step}</div>
                        {item.user && (
                          <div className="text-xs text-slate-500">Completed by {item.user}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Overall Progress</span>
                    <span className="font-semibold text-slate-900">50% complete</span>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-gradient-to-r from-blue-500 to-cyan-500" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive 2: Resource Management */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 order-2 lg:order-1"
            >
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-slate-900">Team Capacity</h3>

                {[
                  { team: "Warehouse", capacity: 85, available: 15, color: "emerald" },
                  { team: "Quality Assurance", capacity: 92, available: 8, color: "orange" },
                  { team: "Shipping", capacity: 78, available: 22, color: "emerald" },
                  { team: "Customer Service", capacity: 95, available: 5, color: "red" }
                ].map((dept) => (
                  <div key={dept.team} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{dept.team}</span>
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "text-xs",
                          dept.color === "emerald" && "bg-emerald-100 text-emerald-700",
                          dept.color === "orange" && "bg-orange-100 text-orange-700",
                          dept.color === "red" && "bg-red-100 text-red-700"
                        )}>
                          {dept.available}% available
                        </Badge>
                        <span className="text-sm text-slate-600">{dept.capacity}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full",
                          dept.color === "emerald" && "bg-gradient-to-r from-emerald-500 to-emerald-600",
                          dept.color === "orange" && "bg-gradient-to-r from-orange-500 to-orange-600",
                          dept.color === "red" && "bg-gradient-to-r from-red-500 to-red-600"
                        )}
                        style={{ width: `${dept.capacity}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-orange-900 mb-1">Capacity Alert</div>
                      <div className="text-orange-700">Customer Service team at 95% capacity. Consider reallocating resources or hiring.</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">32</div>
                    <div className="text-xs text-slate-500">Team Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">87%</div>
                    <div className="text-xs text-slate-500">Avg Utilization</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">+12%</div>
                    <div className="text-xs text-slate-500">Efficiency</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 order-1 lg:order-2"
            >
              <Badge className="bg-emerald-100 text-emerald-700">
                <Users className="w-3 h-3 mr-1" />
                Resource Management
              </Badge>

              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">
                Optimize every
                <br />
                <span className="text-slate-400">resource and person</span>
              </h2>

              <p className="text-xl text-slate-600 leading-relaxed">
                See real-time capacity across teams, predict bottlenecks before they happen, and optimize allocation to keep operations running smoothly.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    icon: Gauge,
                    title: "Capacity Planning",
                    description: "Real-time view of team utilization and availability"
                  },
                  {
                    icon: AlertCircle,
                    title: "Bottleneck Detection",
                    description: "AI predicts capacity issues and suggests reallocation"
                  },
                  {
                    icon: TrendingUp,
                    title: "Efficiency Tracking",
                    description: "Monitor productivity trends and identify improvements"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                      <p className="text-slate-600 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="bg-slate-900 hover:bg-slate-800 mt-6">
                Manage Resources
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive 3: Operational Metrics */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Badge className="bg-purple-100 text-purple-700">
                <BarChart3 className="w-3 h-3 mr-1" />
                Operational Metrics
              </Badge>

              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">
                Track metrics that
                <br />
                <span className="text-slate-400">actually drive results</span>
              </h2>

              <p className="text-xl text-slate-600 leading-relaxed">
                Connect daily operational metrics directly to your company scorecard. See trends, get AI-powered alerts, and keep your team aligned on what matters most.
              </p>

              <div className="space-y-4 pt-4">
                {[
                  {
                    icon: Target,
                    title: "Scorecard Integration",
                    description: "Metrics flow automatically into your weekly Level 10 meetings"
                  },
                  {
                    icon: Brain,
                    title: "Trend Analysis",
                    description: "AI detects patterns and predicts when you'll miss targets"
                  },
                  {
                    icon: Zap,
                    title: "Real-Time Alerts",
                    description: "Get notified the moment a metric goes off track"
                  }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                      <p className="text-slate-600 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="bg-slate-900 hover:bg-slate-800 mt-6">
                View Metrics
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">This Week's Metrics</h3>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    5/6 on track
                  </Badge>
                </div>

                {[
                  { metric: "On-Time Delivery", target: "95%", current: "97%", status: "success" },
                  { metric: "Quality Score", target: "98%", current: "99%", status: "success" },
                  { metric: "Cycle Time", target: "< 2 days", current: "1.8 days", status: "success" },
                  { metric: "Inventory Accuracy", target: "99%", current: "98.5%", status: "warning" },
                  { metric: "Customer Satisfaction", target: "4.8/5", current: "4.9/5", status: "success" },
                  { metric: "Cost per Unit", target: "< $45", current: "$42", status: "success" }
                ].map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border",
                      item.status === "success" && "bg-emerald-50 border-emerald-200",
                      item.status === "warning" && "bg-orange-50 border-orange-200"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-900">{item.metric}</span>
                      {item.status === "success" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Target: {item.target}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.current}</span>
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Brain className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-medium text-blue-900 mb-1">AI Insight</div>
                      <div className="text-blue-700">Inventory Accuracy trending down. Review receiving process before next week.</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Operations teams love
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                measurable results
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-8"
          >
            {[
              { value: "42%", label: "Reduction in process errors" },
              { value: "23hrs", label: "Saved per week per team" },
              { value: "99.2%", label: "Average quality score" },
              { value: "15%", label: "Efficiency improvement" }
            ].map((stat, index) => (
              <motion.div key={index} variants={fadeInUp} className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                quote: "We reduced process errors by 42% in the first quarter. The AI catches issues before they become problems.",
                author: "Michael Rodriguez",
                role: "VP of Operations",
                company: "TechFlow Manufacturing"
              },
              {
                quote: "Finally, operations metrics that people actually look at. Everything flows into our scorecard automatically.",
                author: "Lisa Chang",
                role: "Director of Operations",
                company: "Precision Parts Co"
              },
              {
                quote: "The SOP library saved us. New team members are productive in days instead of weeks.",
                author: "David Okonkwo",
                role: "Operations Manager",
                company: "LogisticsHub"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-slate-800 rounded-2xl p-8 border border-slate-700"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-slate-400">{testimonial.role}</div>
                  <div className="text-sm text-slate-500">{testimonial.company}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-5xl lg:text-6xl font-bold text-white">
              Ready for flawless operations?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join 10,000+ operations teams running more efficiently with Align. Free forever for up to 10 users.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 h-14 px-8 text-lg">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 h-14 px-8 text-lg">
                Schedule Demo
              </Button>
            </div>
            <p className="text-white/80 text-sm">
              No credit card required • Free forever • 2 minute setup
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="text-xl font-bold text-white mb-4">Align</div>
              <p className="text-slate-400 text-sm mb-4">
                The all-in-one EOS platform for scaling companies.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-3">
                {["Features", "Pricing", "Security", "Roadmap"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-3">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-3">
                {["Docs", "API", "Support", "Status"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © 2024 Align. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-400 hover:text-white text-sm">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">Terms</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
