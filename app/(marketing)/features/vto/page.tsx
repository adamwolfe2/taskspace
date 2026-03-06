"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Eye,
  Target,
  Compass,
  Flag,
  X,
  FileText,
  Layers,
  CheckSquare,
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

export default function VtoPage() {
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
                    <Eye className="w-4 h-4 mr-1" />
                    VISION/TRACTION ORGANIZER
                  </Badge>
                </motion.div>

                <motion.h1 variants={fadeInUp} className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1]">
                  Your company vision,{" "}
                  <span className="text-slate-400">one living document</span>
                </motion.h1>

                <motion.p variants={fadeInUp} className="text-base sm:text-xl text-slate-600 leading-relaxed">
                  Align your entire team around core values, 10-year targets, and quarterly priorities.
                  The V/TO keeps everyone rowing in the same direction, all the time.
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
                      <h3 className="text-lg font-bold text-slate-900">V/TO - Your Company</h3>
                      <Badge className="bg-gray-100 text-gray-700 border-0">Complete</Badge>
                    </div>

                    {/* V/TO Sections */}
                    <div className="space-y-3">
                      {[
                        { icon: CheckCircle, label: "Core Values", detail: "5 values defined" },
                        { icon: Target, label: "Core Focus", detail: "Purpose & niche" },
                        { icon: Flag, label: "10-Year Target", detail: "$50M ARR" },
                        { icon: Compass, label: "Marketing Strategy", detail: "SMB SaaS market" },
                        { icon: Eye, label: "3-Year Picture", detail: "2029 vision" },
                        { icon: Layers, label: "1-Year Plan", detail: "5 goals, $2M budget" },
                        { icon: CheckSquare, label: "Rocks", detail: "Q1 2026 priorities" },
                        { icon: FileText, label: "Issues List", detail: "12 open issues" },
                      ].map((section, i) => {
                        const Icon = section.icon
                        return (
                          <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                                  <Icon className="w-4 h-4 text-slate-700" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-sm">{section.label}</div>
                                  <div className="text-xs text-slate-500">{section.detail}</div>
                                </div>
                              </div>
                              <CheckCircle className="w-5 h-5 text-gray-600" />
                            </div>
                          </div>
                        )
                      })}
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
                  Most companies <span className="text-black font-bold">lack alignment</span>
                </motion.h2>

                <motion.div variants={staggerContainer} className="space-y-4">
                  {[
                    "Vision documents buried in Google Docs",
                    "Leadership knows the plan, but teams don't",
                    "Core values exist but aren't reinforced",
                    "Strategic plans disconnected from daily work",
                    "Quarterly planning starts from scratch every 90 days",
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
                  Build a <span className="text-black font-bold">company everyone understands</span>
                </motion.h2>

                <motion.div variants={staggerContainer} className="space-y-4">
                  {[
                    "Living V/TO document accessible to the entire team",
                    "Vision cascades into quarterly rocks automatically",
                    "Core values reinforced in daily workflows",
                    "One source of truth for strategic direction",
                    "Progress tracked against 1-year and 3-year goals",
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

        {/* Feature Deep Dive - V/TO Components */}
        <section className="py-20 lg:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge className="bg-white text-gray-600 border-gray-200">
                  <Layers className="w-4 h-4 mr-1" />
                  COMPLETE V/TO FRAMEWORK
                </Badge>

                <h2 className="text-4xl font-bold text-slate-900">
                  All 8 sections of the V/TO, perfectly organized
                </h2>

                <p className="text-xl text-slate-600">
                  Every component of the EOS Vision/Traction Organizer in one collaborative workspace.
                  From 10-year targets down to quarterly rocks, everything connects.
                </p>

                <ul className="space-y-4">
                  {[
                    { icon: CheckCircle, text: "Core Values & Core Focus define who you are" },
                    { icon: Flag, text: "10-Year Target sets your long-term destination" },
                    { icon: Compass, text: "Marketing Strategy clarifies your go-to-market" },
                    { icon: Eye, text: "3-Year Picture paints a vivid future state" },
                    { icon: Layers, text: "1-Year Plan breaks down annual goals & budget" },
                    { icon: Target, text: "Quarterly Rocks drive 90-day execution" },
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
                    <div className="space-y-3">
                      <div className="pb-3 border-b border-slate-200">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Core Focus</h4>
                        <p className="text-sm text-slate-900 font-medium">Purpose: Help businesses grow profitably</p>
                        <p className="text-sm text-slate-600">Niche: SMB SaaS companies</p>
                      </div>

                      <div className="pb-3 border-b border-slate-200">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">10-Year Target</h4>
                        <p className="text-sm text-slate-900 font-medium">$50M ARR, 10,000 customers</p>
                      </div>

                      <div className="pb-3 border-b border-slate-200">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">3-Year Picture</h4>
                        <p className="text-sm text-slate-900 font-medium">2029: $10M ARR, 2,000 customers</p>
                        <p className="text-sm text-slate-600">Team of 50, profitable</p>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">1-Year Plan (2026)</h4>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-gray-600" />
                            <p className="text-sm text-slate-900">$2M revenue</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-gray-600" />
                            <p className="text-sm text-slate-900">500 active customers</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-gray-600" />
                            <p className="text-sm text-slate-900">Launch 2 new products</p>
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

        {/* Feature Deep Dive 2 - Cascade Effect */}
        <section className="py-20 lg:py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative">
                <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
                  <div className="space-y-6">
                    {/* Vision Cascade */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Flag className="w-5 h-5 text-slate-700" />
                        </div>
                        <div>
                          <div className="text-xs text-slate-500">10-Year Target</div>
                          <div className="text-sm font-semibold text-slate-900">$50M ARR</div>
                        </div>
                      </div>
                      <div className="ml-5 border-l-2 border-gray-200 pl-5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                            <Eye className="w-4 h-4 text-slate-700" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-500">3-Year Picture</div>
                            <div className="text-sm font-semibold text-slate-900">$10M ARR</div>
                          </div>
                        </div>
                        <div className="ml-4 border-l-2 border-gray-200 pl-5 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-slate-700" />
                            </div>
                            <div>
                              <div className="text-xs text-slate-500">1-Year Plan</div>
                              <div className="text-sm font-semibold text-slate-900">$2M ARR</div>
                            </div>
                          </div>
                          <div className="ml-4 border-l-2 border-gray-200 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                                <Target className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <div className="text-xs text-slate-500">Q1 Rocks</div>
                                <div className="text-sm font-semibold text-slate-900">Launch new product</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 lg:order-2 space-y-6">
                <Badge className="bg-white text-gray-600 border-gray-200">
                  <Target className="w-4 h-4 mr-1" />
                  VISION CASCADE
                </Badge>

                <h2 className="text-4xl font-bold text-slate-900">
                  Long-term vision flows into quarterly execution
                </h2>

                <p className="text-xl text-slate-600">
                  Your V/TO isn't just a planning document—it's a living system that connects big-picture
                  strategy to this quarter's priorities. Every rock ties back to annual goals and long-term targets.
                </p>

                <ul className="space-y-4">
                  {[
                    { icon: Flag, text: "Start with your 10-year BHAG and work backwards" },
                    { icon: Eye, text: "3-year picture makes the vision tangible" },
                    { icon: Layers, text: "Annual plan breaks it into achievable milestones" },
                    { icon: Target, text: "Quarterly rocks drive progress every 90 days" },
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
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Ready to align your entire team around one vision?
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Build your V/TO, cascade it into quarterly rocks, and watch your company execute with perfect clarity.
              Free forever. 14-day free trial on paid plans.
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
