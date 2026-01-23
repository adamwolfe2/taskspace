"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Brain,
  Clock,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Send,
  Plus,
  X,
  ThumbsUp,
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

// Interactive Demo Component
function InteractiveEODDemo() {
  const [accomplishments, setAccomplishments] = useState([
    { id: 1, text: "Completed user authentication module", aiGenerated: false },
    { id: 2, text: "Fixed 3 critical bugs in payment flow", aiGenerated: false },
  ])
  const [blockers, setBlockers] = useState([
    { id: 1, text: "Waiting for API documentation from vendor", escalated: false },
  ])
  const [priorities, setPriorities] = useState([
    { id: 1, text: "Start integration testing", aiGenerated: false },
    { id: 2, text: "Review PR #245", aiGenerated: true },
  ])
  const [newAccomplishment, setNewAccomplishment] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)

  const handleAiSuggest = async () => {
    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsGenerating(false)
    setShowAiSuggestion(true)
  }

  const acceptAiSuggestion = () => {
    setAccomplishments([
      ...accomplishments,
      {
        id: Date.now(),
        text: "Optimized database queries reducing load time by 40%",
        aiGenerated: true,
      },
    ])
    setShowAiSuggestion(false)
  }

  const addAccomplishment = () => {
    if (newAccomplishment.trim()) {
      setAccomplishments([
        ...accomplishments,
        { id: Date.now(), text: newAccomplishment, aiGenerated: false },
      ])
      setNewAccomplishment("")
    }
  }

  const escalateBlocker = (id: number) => {
    setBlockers(
      blockers.map((b) => (b.id === id ? { ...b, escalated: true } : b))
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">End of Day Report</h3>
              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              Draft
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Accomplishments Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Today&apos;s Accomplishments
            </h4>
            <button
              onClick={handleAiSuggest}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI Suggest
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {accomplishments.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg group"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="flex-1 text-slate-700">{item.text}</span>
                {item.aiGenerated && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-xs font-medium">
                    AI
                  </span>
                )}
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </motion.div>
            ))}

            {/* AI Suggestion */}
            <AnimatePresence>
              {showAiSuggestion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-2 border-dashed border-purple-200 rounded-lg p-3 bg-purple-50/50"
                >
                  <div className="flex items-center gap-2 text-purple-600 text-sm font-medium mb-2">
                    <Brain className="w-4 h-4" />
                    AI Suggestion
                  </div>
                  <p className="text-slate-700 mb-3">
                    Optimized database queries reducing load time by 40%
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={acceptAiSuggestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => setShowAiSuggestion(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add New */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newAccomplishment}
                onChange={(e) => setNewAccomplishment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAccomplishment()}
                placeholder="Add an accomplishment..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
              />
              <button
                onClick={addAccomplishment}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Blockers Section */}
        <div>
          <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Blockers
          </h4>
          <div className="space-y-2">
            {blockers.map((blocker) => (
              <div
                key={blocker.id}
                className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100"
              >
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="flex-1 text-slate-700">{blocker.text}</span>
                {blocker.escalated ? (
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium">
                    Escalated
                  </span>
                ) : (
                  <button
                    onClick={() => escalateBlocker(blocker.id)}
                    className="px-3 py-1 text-sm font-medium text-amber-600 hover:bg-amber-100 rounded transition-colors"
                  >
                    Escalate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tomorrow's Priorities */}
        <div>
          <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            Tomorrow&apos;s Priorities
          </h4>
          <div className="space-y-2">
            {priorities.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
              >
                <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                  {index + 1}
                </span>
                <span className="flex-1 text-slate-700">{item.text}</span>
                {item.aiGenerated && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-xs font-medium">
                    AI
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all">
          <Send className="w-5 h-5" />
          Submit EOD Report
        </button>
      </div>
    </div>
  )
}

const features = [
  {
    icon: Brain,
    title: "AI-Powered Suggestions",
    description:
      "Let AI help you write better reports. Our system learns from your work patterns and suggests accomplishments you might have missed.",
  },
  {
    icon: AlertTriangle,
    title: "Blocker Escalation",
    description:
      "Stuck on something? Escalate blockers directly to your manager with one click. Never let issues go unnoticed.",
  },
  {
    icon: Clock,
    title: "Smart Reminders",
    description:
      "Customizable reminders ensure your team never forgets to submit their EOD. Set your preferred time and channel.",
  },
  {
    icon: Calendar,
    title: "Priority Planning",
    description:
      "Plan tomorrow today. Set your priorities and start each day focused on what matters most.",
  },
]

const benefits = [
  "Save 15+ minutes per day on reporting",
  "Increase team visibility and transparency",
  "Catch blockers before they become problems",
  "Build a searchable history of accomplishments",
  "Improve manager-report relationships",
  "Enable better async communication",
]

export default function EODReportsPage() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-red-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-6"
              >
                <CheckCircle className="w-4 h-4" />
                EOD Reports
              </motion.div>
              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6"
              >
                AI-Powered Daily{" "}
                <span className="text-gradient-primary">Accountability</span>
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-600 mb-8 leading-relaxed"
              >
                Transform how your team reports daily progress. Our AI-assisted
                end-of-day reports make accountability effortless, not a chore.
              </motion.p>
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
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
                <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl opacity-10 blur-2xl" />
                <div className="relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-full flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Interactive Demo - Try it!
                    </div>
                  </div>
                  <InteractiveEODDemo />
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
              Powerful Features
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              Everything you need to make daily reporting a breeze
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
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-red-600" />
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

      {/* Benefits Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2
                variants={fadeInUp}
                className="text-3xl sm:text-4xl font-bold text-white mb-6"
              >
                Why Teams Love EOD Reports
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-300 mb-8"
              >
                Join hundreds of teams who have transformed their daily
                accountability with AIMS.
              </motion.p>
              <motion.ul variants={staggerContainer} className="space-y-4">
                {benefits.map((benefit) => (
                  <motion.li
                    key={benefit}
                    variants={fadeInUp}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-slate-200">{benefit}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50"
            >
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-white mb-2">94%</div>
                <p className="text-slate-400">
                  of teams report improved accountability
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "15min", label: "Saved per day" },
                  { value: "3x", label: "Better visibility" },
                  { value: "87%", label: "Blocker resolution" },
                  { value: "2.5x", label: "Goal completion" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-slate-800 rounded-xl p-4 text-center"
                  >
                    <div className="text-2xl font-bold text-red-400">
                      {stat.value}
                    </div>
                    <div className="text-sm text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
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
              Ready to Transform Your Daily Standups?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 mb-8"
            >
              Start your free trial today. No credit card required.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
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
  )
}
