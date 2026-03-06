"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Target,
  TrendingUp,
  Calendar,
  BarChart3,
  X,
  Flag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

export default function RocksPage() {
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
                  <Target className="w-4 h-4 mr-1" />
                  QUARTERLY ROCKS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1]">
                Quarterly rocks that{" "}
                <span className="text-slate-400">actually get done</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-base sm:text-xl text-slate-600 leading-relaxed">
                Set 3-7 quarterly priorities. Track progress with visual indicators, milestones, and
                automatic status updates based on daily activity. Built for the EOS methodology.
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
                    <h3 className="text-lg font-bold text-slate-900">Q1 2026 Rocks</h3>
                    <Badge className="bg-gray-100 text-gray-700 border-0">On Track</Badge>
                  </div>

                  {/* Rock Cards */}
                  <div className="space-y-3">
                    {[
                      { title: "Launch new product line", progress: 85, status: "on-track", color: "gray" },
                      { title: "Grow revenue by 25%", progress: 62, status: "on-track", color: "gray" },
                      { title: "Hire 10 new team members", progress: 45, status: "at-risk", color: "gray" },
                    ].map((rock, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-slate-600" />
                            <span className="font-semibold text-slate-900">{rock.title}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900">{rock.progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-gray-600 rounded-full transition-all"
                            style={{ width: `${rock.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Due: Mar 31, 2026</span>
                          <span className="font-medium text-gray-700">
                            {rock.status === "on-track" ? "On Track" : "At Risk"}
                          </span>
                        </div>
                      </div>
                    ))}
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
                Most quarterly goals <span className="text-black font-bold">never get done</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Goals set in spreadsheets and forgotten",
                  "No connection between daily work and quarterly priorities",
                  "Progress tracking is manual and time-consuming",
                  "Teams don't know if they're on or off track",
                  "Rock reviews happen too late to course-correct",
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
                Execute with <span className="text-black font-bold">perfect clarity</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Visual rock tracking that everyone can see",
                  "Daily EODs automatically update rock progress",
                  "AI identifies when rocks are at risk",
                  "Milestones keep teams focused on next steps",
                  "Real-time dashboards for leadership visibility",
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

      {/* Feature Deep Dive 1 - Visual Tracking */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Target className="w-4 h-4 mr-1" />
                VISUAL PROGRESS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                See exactly where you stand
              </h2>

              <p className="text-xl text-slate-600">
                Every rock shows real-time progress with visual indicators, completion percentages,
                and status alerts. No more guessing if you're on track.
              </p>

              <ul className="space-y-4">
                {[
                  { icon: BarChart3, text: "Interactive progress bars update in real-time" },
                  { icon: Flag, text: "Milestones break rocks into achievable steps" },
                  { icon: TrendingUp, text: "Trend indicators show if you're accelerating" },
                  { icon: Calendar, text: "Time tracking shows days remaining" },
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
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                  <div className="space-y-4">
                    {[
                      { label: "Product Launch", progress: 85, milestones: "3/4 complete" },
                      { label: "Revenue Growth", progress: 62, milestones: "2/3 complete" },
                      { label: "Team Hiring", progress: 45, milestones: "1/2 complete" },
                    ].map((rock, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">{rock.label}</span>
                          <span className="text-sm font-bold text-slate-900">{rock.progress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-600 rounded-full transition-all"
                            style={{ width: `${rock.progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500">{rock.milestones}</div>
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
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Ready to execute on your quarterly priorities?
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Set your rocks, track progress, and hit your goals every quarter. Free forever. 14-day free trial on paid plans.
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
