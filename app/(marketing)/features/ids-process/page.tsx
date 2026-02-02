"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Zap,
  MessageSquare,
  Lightbulb,
  CheckSquare,
  Star,
  X,
  AlertCircle,
  Users,
  Target,
  Brain,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MegaMenu } from "@/components/marketing/mega-menu"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export default function IDSProcessPage() {
  const [activeStep, setActiveStep] = useState<'identify' | 'discuss' | 'solve'>('identify')

  return (
    <div className="min-h-screen bg-white">
      <MegaMenu />

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
                <Badge className="bg-orange-50 text-orange-600 border-orange-200 mb-4">
                  <Zap className="w-4 h-4 mr-1" />
                  IDS PROCESS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-6xl font-bold text-slate-900 leading-[1.1]">
                Solve problems in{" "}
                <span className="text-slate-400">10 minutes</span>, not 10 meetings
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
                The IDS Process (Identify, Discuss, Solve) is the structured framework that turns
                vague issues into actionable solutions. Stop talking in circles. Start solving.
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
                  No credit card.
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-slate-600">4.9/5 on G2</span>
                </div>
                <div className="text-sm text-slate-400">|</div>
                <div className="text-sm font-medium text-slate-600">100,000+ issues solved</div>
              </motion.div>
            </motion.div>

            {/* Right - Interactive IDS Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">IDS in Action</h3>
                    <Badge className="bg-orange-100 text-orange-700">Live Example</Badge>
                  </div>

                  {/* Step Selector */}
                  <div className="flex gap-2 mb-4">
                    {[
                      { key: 'identify', label: 'Identify', icon: AlertCircle },
                      { key: 'discuss', label: 'Discuss', icon: MessageSquare },
                      { key: 'solve', label: 'Solve', icon: CheckSquare },
                    ].map((step) => {
                      const Icon = step.icon
                      return (
                        <button
                          key={step.key}
                          onClick={() => setActiveStep(step.key as any)}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all",
                            activeStep === step.key
                              ? "bg-orange-100 text-orange-900 border-2 border-orange-300"
                              : "bg-slate-50 text-slate-600 border-2 border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{step.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Issue Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-slate-900">Customer churn rate too high</span>
                    </div>
                    <div className="text-xs text-slate-500 mb-3">
                      Owner: Sarah Chen • Priority: High • From: Scorecard Review
                    </div>

                    {/* Dynamic Content Based on Step */}
                    {activeStep === 'identify' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                          <div className="text-xs font-semibold text-orange-900 uppercase mb-1">Root Cause</div>
                          <p className="text-sm text-slate-700">Onboarding process is too complex and confusing</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="text-xs font-semibold text-blue-900 uppercase mb-1">Impact</div>
                          <p className="text-sm text-slate-700">Lost $120k MRR in Q1, trending worse</p>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 'discuss' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-start gap-2 p-2 bg-white rounded">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-slate-900">Michael</p>
                            <p className="text-xs text-slate-600">We need to simplify the first-time setup flow</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-white rounded">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-slate-900">Sarah</p>
                            <p className="text-xs text-slate-600">Agreed. Plus add video tutorials for each step</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-white rounded">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-slate-900">Emily</p>
                            <p className="text-xs text-slate-600">Can we launch the redesign in 2 weeks?</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 'solve' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                            <div className="text-xs font-semibold text-emerald-900 uppercase">Solution</div>
                          </div>
                          <p className="text-sm text-slate-700 mb-3">Redesign onboarding flow with video tutorials</p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-white rounded text-xs">
                              <span className="text-slate-700">Design new flow (Michael)</span>
                              <span className="text-slate-500">Due: Feb 1</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white rounded text-xs">
                              <span className="text-slate-700">Record tutorials (Sarah)</span>
                              <span className="text-slate-500">Due: Feb 5</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white rounded text-xs">
                              <span className="text-slate-700">Ship to production (Emily)</span>
                              <span className="text-slate-500">Due: Feb 10</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Status:</span>
                      <Badge className={cn(
                        activeStep === 'identify' && "bg-orange-100 text-orange-700",
                        activeStep === 'discuss' && "bg-blue-100 text-blue-700",
                        activeStep === 'solve' && "bg-emerald-100 text-emerald-700"
                      )}>
                        {activeStep === 'identify' && 'Identifying Root Cause'}
                        {activeStep === 'discuss' && 'Team Discussion'}
                        {activeStep === 'solve' && 'Solved - Action Items Created'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-slate-500 mb-8 uppercase tracking-wider">
            TRUSTED BY PROBLEM-SOLVING TEAMS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale">
            {["Amazon", "NVIDIA", "Spotify", "Verizon"].map((logo) => (
              <div key={logo} className="text-2xl font-bold text-slate-900">{logo}</div>
            ))}
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
                <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 mb-4">
                  The Problem
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                Most teams <span className="text-red-600">talk in circles</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Meetings discuss symptoms, not root causes",
                  "Same issues resurface week after week",
                  "No framework for structured problem-solving",
                  "Solutions unclear, ownership ambiguous",
                  "Action items forgotten after the meeting",
                ].map((problem, i) => (
                  <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{problem}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* The Align Way */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 mb-4">
                  The Solution
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                A proven process that <span className="text-emerald-600">actually solves things</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Structured 3-step framework: Identify, Discuss, Solve",
                  "Dig to root cause before jumping to solutions",
                  "Track each issue through the IDS lifecycle",
                  "Clear owners and deadlines for every solution",
                  "Auto-create to-dos from solved issues",
                ].map((solution, i) => (
                  <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{solution}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 1 - Identify Step */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-orange-50 text-orange-600 border-orange-200">
                <AlertCircle className="w-4 h-4 mr-1" />
                IDENTIFY
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Get to the root cause, not symptoms
              </h2>

              <p className="text-xl text-slate-600">
                The Identify step forces teams to dig deeper. What's the real problem? Not "sales are
                down" but "we're targeting the wrong customer segment."
              </p>

              <ul className="space-y-4">
                {[
                  { icon: Target, text: "Guided questions to uncover root causes" },
                  { icon: Users, text: "Team collaboration on problem definition" },
                  { icon: AlertCircle, text: "AI suggestions based on similar past issues" },
                  { icon: TrendingUp, text: "Link issues to affected rocks and metrics" },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-orange-600" />
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
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border border-orange-100">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    <h3 className="font-bold text-slate-900">Identify Root Cause</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase block mb-2">
                        What's the real problem?
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm resize-none"
                        rows={3}
                        placeholder="Dig deeper than the surface symptom..."
                        defaultValue="Our onboarding process is too complex - new customers get confused and abandon setup"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase block mb-2">
                        Who does this affect?
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["New Customers", "Support Team", "Sales Team"].map((tag) => (
                          <Badge key={tag} variant="outline" className="bg-slate-50">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 uppercase block mb-2">
                        Impact on rocks/metrics
                      </label>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-xs text-slate-700">
                          <span className="font-semibold text-red-600">Churn Rate:</span> 2.5% (above 2% target)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 2 - Discuss Step */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Team Discussion</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900">Michael R.</span>
                        <span className="text-xs text-slate-500">2 min ago</span>
                      </div>
                      <p className="text-sm text-slate-700">
                        We need to reduce the setup from 10 steps to 3-4 max. Most customers don't need
                        all those features on day one.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="ghost" className="h-6 text-xs">
                          👍 3
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-900">Sarah C.</span>
                        <span className="text-xs text-slate-500">1 min ago</span>
                      </div>
                      <p className="text-sm text-slate-700">
                        Agreed. Plus we should add contextual help and video tutorials for each step.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="ghost" className="h-6 text-xs">
                          👍 5
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs font-semibold text-blue-900 uppercase mb-1">Consensus</div>
                    <p className="text-sm text-slate-700">
                      Simplify onboarding to 3-4 steps with embedded video tutorials
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-blue-50 text-blue-600 border-blue-200">
                <MessageSquare className="w-4 h-4 mr-1" />
                DISCUSS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Collaborative brainstorming, structured
              </h2>

              <p className="text-xl text-slate-600">
                The Discuss step brings the team together to explore solutions. Not a free-for-all—
                a focused conversation on the identified root cause.
              </p>

              <ul className="space-y-4">
                {[
                  "Threaded discussion tied to the issue",
                  "Emoji reactions to surface consensus",
                  "AI summary of key discussion points",
                  "Timer to keep discussion focused (10 min max)",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 3 - Solve Step */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">
                <CheckSquare className="w-4 h-4 mr-1" />
                SOLVE
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Turn decisions into action items
              </h2>

              <p className="text-xl text-slate-600">
                The Solve step converts discussion consensus into concrete action items with owners
                and deadlines. No more "we'll figure it out later."
              </p>

              <ul className="space-y-4">
                {[
                  "Auto-create to-dos from solution",
                  "Assign clear owners to each action item",
                  "Set realistic deadlines",
                  "Link action items to next week's Level 10 agenda",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/app?page=register">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6">
                  Start solving with IDS
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl p-8 border border-emerald-100">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-900">Solution & Action Items</h3>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="text-xs font-semibold text-emerald-900 uppercase mb-2">Agreed Solution</div>
                    <p className="text-sm text-slate-700 font-medium mb-4">
                      Redesign onboarding to 3-4 steps with embedded video tutorials
                    </p>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 uppercase mb-2">Action Items:</div>
                      <div className="p-3 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900">Design simplified flow</span>
                          <Badge variant="outline" className="text-xs">To Do</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Owner: Michael R.</span>
                          <span>Due: Feb 1</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900">Record tutorial videos</span>
                          <Badge variant="outline" className="text-xs">To Do</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Owner: Sarah C.</span>
                          <span>Due: Feb 5</span>
                        </div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900">Deploy to production</span>
                          <Badge variant="outline" className="text-xs">To Do</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Owner: Emily W.</span>
                          <span>Due: Feb 10</span>
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

      {/* Stats Section */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Teams solve 5x more issues with IDS
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "10 min", label: "Average time to solve an issue" },
              { value: "5x", label: "More issues solved vs ad-hoc meetings" },
              { value: "94%", label: "Of issues stay solved (don't recur)" },
              { value: "100%", label: "Action item completion rate" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Teams finally solve problems instead of just talking about them
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "IDS changed everything. We used to spend 30 minutes debating, now we solve in 10 minutes with clear action items.",
                author: "Michael Rodriguez",
                role: "Integrator, TechCorp",
              },
              {
                quote: "The structured framework keeps us from going in circles. Identify, Discuss, Solve - it just works.",
                author: "Sarah Chen",
                role: "CEO, StartupXYZ",
              },
              {
                quote: "Our Level 10 meetings are actually productive now. We solve real problems instead of just talking about symptoms.",
                author: "Emily Watson",
                role: "VP Operations, GrowthLabs",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/90 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-600" />
                  <div>
                    <div className="font-semibold text-white">{testimonial.author}</div>
                    <div className="text-sm text-white/60">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-orange-600 via-red-600 to-pink-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Zap className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-bold text-white mb-6">
            Start solving problems in minutes, not meetings
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of teams using IDS to solve real problems
          </p>
          <Link href="/app?page=register">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-8 h-14 text-base font-semibold">
              Get started FREE
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-white/80 mt-4 text-sm">Free forever. No credit card required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div>© 2026 Align. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
