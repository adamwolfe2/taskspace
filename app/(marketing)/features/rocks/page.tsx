"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Target,
  TrendingUp,
  Calendar,
  Users,
  Zap,
  BarChart3,
  Star,
  X,
  Flag,
  Award,
  Rocket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"

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

export default function RocksPage() {
  return (
    <>
      <MegaMenu />
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

              <motion.h1 variants={fadeInUp} className="text-6xl font-bold text-slate-900 leading-[1.1]">
                Quarterly rocks that{" "}
                <span className="text-slate-400">actually get done</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
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
                <div className="text-sm font-medium text-slate-600">10,000+ teams using Rocks</div>
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

      {/* Social Proof */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-slate-500 mb-8 uppercase tracking-wider">
            TRUSTED BY EOS IMPLEMENTERS WORLDWIDE
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

      {/* Stats Section */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Teams complete 2.5x more rocks with Taskspace
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "94%", label: "Rock completion rate" },
              { value: "2.5x", label: "Faster execution vs spreadsheets" },
              { value: "100%", label: "Team visibility into priorities" },
              { value: "0", label: "Rocks forgotten or abandoned" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold text-black mb-2">
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
              EOS implementers love our rock tracking
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "We finally hit all our quarterly rocks for the first time. The visibility is a game changer.",
                author: "Emily Watson",
                role: "CEO, GrowthLabs",
              },
              {
                quote: "Rock tracking went from a painful spreadsheet to something the team actually uses daily.",
                author: "Michael Rodriguez",
                role: "Integrator, TechCorp",
              },
              {
                quote: "The AI alerts saved us when a critical rock was falling behind. We course-corrected in time.",
                author: "Sarah Chen",
                role: "Visionary, StartupXYZ",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/90 mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600" />
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
      <section className="py-20 lg:py-32 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Rocket className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-bold text-white mb-6">
            Start hitting your rocks every quarter
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of EOS teams executing flawlessly
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

    </div>
    <MarketingFooter />
    </>
  )
}
