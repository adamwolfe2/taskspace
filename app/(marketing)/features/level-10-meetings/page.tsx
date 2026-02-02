"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Calendar,
  Clock,
  Users,
  Target,
  Zap,
  ListChecks,
  Star,
  X,
  CheckSquare,
  AlertCircle,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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

export default function Level10MeetingsPage() {
  const [currentSection, setCurrentSection] = useState(2) // Rock Review

  const sections = [
    { name: "Segue", time: 5, status: "done" },
    { name: "Scorecard", time: 5, status: "done" },
    { name: "Rock Review", time: 5, status: "current" },
    { name: "Customer/Employee Headlines", time: 5, status: "upcoming" },
    { name: "To-Do List", time: 5, status: "upcoming" },
    { name: "IDS", time: 60, status: "upcoming" },
    { name: "Conclude", time: 5, status: "upcoming" },
  ]

  return (
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
                <Badge className="bg-purple-50 text-purple-600 border-purple-200 mb-4">
                  <Calendar className="w-4 h-4 mr-1" />
                  LEVEL 10 MEETINGS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-6xl font-bold text-slate-900 leading-[1.1]">
                The most productive{" "}
                <span className="text-slate-400">90 minutes</span> of your week
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
                Perfect Level 10 agendas, pre-populated with scorecard data, rock updates, and issues.
                Same day, same time, same agenda. 90 minutes that solve real problems.
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
                <div className="text-sm font-medium text-slate-600">50,000+ meetings run</div>
              </motion.div>
            </motion.div>

            {/* Right - Interactive Meeting Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Leadership Team Level 10</h3>
                      <p className="text-xs text-slate-500">Every Monday @ 10:00 AM</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700">90 min</Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all"
                      style={{ width: "35%" }}
                    />
                  </div>

                  {/* Meeting Agenda */}
                  <div className="space-y-2">
                    {sections.map((section, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSection(i)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg transition-all text-left",
                          section.status === "done" && "bg-emerald-50 border border-emerald-200",
                          section.status === "current" && "bg-purple-50 border border-purple-300 shadow-sm",
                          section.status === "upcoming" && "bg-slate-50 border border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {section.status === "done" ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : section.status === "current" ? (
                            <Clock className="w-5 h-5 text-purple-600 animate-pulse" />
                          ) : (
                            <div className="w-5 h-5 rounded border-2 border-slate-300" />
                          )}
                          <span className={cn(
                            "text-sm font-semibold",
                            section.status === "current" ? "text-purple-900" : "text-slate-900"
                          )}>
                            {section.name}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{section.time} min</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Time Elapsed:</span>
                      <span className="font-bold text-slate-900">30 / 90 minutes</span>
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
            TRUSTED BY EOS IMPLEMENTERS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale">
            {["Amazon", "NVIDIA", "Spotify", "Harvard"].map((logo) => (
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
                Most leadership meetings <span className="text-red-600">waste time</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "60% of meeting time spent on updates, not solving issues",
                  "Agenda changes every week—no consistency",
                  "Scorecard and rock data manually gathered",
                  "No structure for solving problems (IDS)",
                  "Meetings run long or skip critical sections",
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
                Structured meetings that <span className="text-emerald-600">solve problems</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Perfect 7-section Level 10 agenda every time",
                  "Scorecard and rocks auto-populated from live data",
                  "60 minutes dedicated to IDS (solving real issues)",
                  "Meeting timer keeps every section on track",
                  "Automatic notes and action items captured",
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

      {/* Feature Deep Dive 1 - Auto-Populated Agenda */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-purple-50 text-purple-600 border-purple-200">
                <Zap className="w-4 h-4 mr-1" />
                AUTO-POPULATED
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Agenda ready before you sit down
              </h2>

              <p className="text-xl text-slate-600">
                No more scrambling to update spreadsheets before the meeting. Your scorecard, rocks,
                and to-dos are already populated from live data.
              </p>

              <ul className="space-y-4">
                {[
                  { icon: Target, text: "Rock progress automatically updated from EODs" },
                  { icon: ListChecks, text: "Scorecard metrics pulled from latest data" },
                  { icon: CheckSquare, text: "To-do list shows status of last week's action items" },
                  { icon: AlertCircle, text: "Issues list pre-populated from team submissions" },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-purple-600" />
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
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">Scorecard Review</h3>
                    <Badge className="bg-purple-100 text-purple-700">5 min</Badge>
                  </div>
                  <div className="space-y-2">
                    {[
                      { metric: "Revenue", value: "$112k", status: "up" },
                      { metric: "New Customers", value: "13", status: "up" },
                      { metric: "Churn Rate", value: "2.5%", status: "down" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "p-3 rounded-lg flex items-center justify-between",
                          item.status === "up" ? "bg-emerald-50" : "bg-red-50"
                        )}
                      >
                        <span className="text-sm font-medium text-slate-900">{item.metric}</span>
                        <span className={cn(
                          "text-sm font-bold",
                          item.status === "up" ? "text-emerald-600" : "text-red-600"
                        )}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-2">Rock Review</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-emerald-50 rounded">
                        <span className="text-xs text-slate-900">Product Launch</span>
                        <span className="text-xs font-bold text-emerald-600">85%</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-emerald-50 rounded">
                        <span className="text-xs text-slate-900">Revenue Growth</span>
                        <span className="text-xs font-bold text-emerald-600">72%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 2 - IDS Process */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">IDS - Identify, Discuss, Solve</h3>
                  <Badge className="bg-orange-100 text-orange-700">60 min</Badge>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900">High churn rate (2 weeks)</span>
                      <Badge className="bg-red-100 text-red-700 text-xs">Priority 1</Badge>
                    </div>
                    <div className="text-xs text-slate-600 mb-3">
                      Owner: Sarah Chen • Added from Scorecard Review
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-orange-900">I</span>
                        </div>
                        <p className="text-xs text-slate-700">Product onboarding too complex</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-orange-900">D</span>
                        </div>
                        <p className="text-xs text-slate-700">Team discussed simplifying flow</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded bg-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-emerald-900">S</span>
                        </div>
                        <p className="text-xs text-slate-700">Ship new onboarding by Friday</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">Hiring velocity slow</span>
                      <Badge variant="outline" className="text-xs">Priority 2</Badge>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">Marketing budget planning</span>
                      <Badge variant="outline" className="text-xs">Priority 3</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-orange-50 text-orange-600 border-orange-200">
                <Zap className="w-4 h-4 mr-1" />
                IDS PROCESS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                60 minutes to solve your biggest problems
              </h2>

              <p className="text-xl text-slate-600">
                The IDS process (Identify, Discuss, Solve) is where real work happens. Structured
                problem-solving that moves issues from blockers to action items.
              </p>

              <ul className="space-y-4">
                {[
                  "Prioritized issues list from entire team",
                  "Guided IDS framework for each issue",
                  "Track progress from Identify → Discuss → Solve",
                  "Automatic to-dos created from solutions",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 3 - Meeting Timer */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-blue-50 text-blue-600 border-blue-200">
                <Clock className="w-4 h-4 mr-1" />
                MEETING TIMER
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Stay on track, every single week
              </h2>

              <p className="text-xl text-slate-600">
                Built-in timer keeps every section on schedule. Visual and audio alerts ensure you
                finish in exactly 90 minutes—not 2 hours.
              </p>

              <ul className="space-y-4">
                {[
                  "Automatic timers for each agenda section",
                  "Visual progress bar shows time remaining",
                  "Gentle alerts when time is running low",
                  "Option to extend critical sections",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/app?page=register">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                  Start better meetings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-slate-900 mb-2">35:42</div>
                    <p className="text-sm text-slate-600">Time Remaining</p>
                  </div>

                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"
                      style={{ width: "60%" }}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">Current: IDS</span>
                        <span className="text-xs text-slate-600">35 min left</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Next: Conclude</span>
                        <span className="text-xs text-slate-500">5 min</span>
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
              Teams solve 5x more issues with structured Level 10s
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "90 min", label: "Perfect meeting length every time" },
              { value: "5x", label: "More issues solved vs ad-hoc meetings" },
              { value: "60%", label: "Of time spent on IDS, not updates" },
              { value: "100%", label: "Attendance rate (same time, same day)" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
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
              Leadership teams finally look forward to meetings
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Our Level 10s went from painful status updates to strategic problem-solving sessions. We actually solve things now.",
                author: "Emily Watson",
                role: "Integrator, GrowthLabs",
              },
              {
                quote: "The timer is a game changer. We used to run 2+ hours. Now we finish in exactly 90 minutes every single week.",
                author: "Michael Rodriguez",
                role: "CEO, TechCorp",
              },
              {
                quote: "Having the scorecard and rocks pre-populated saves us 20 minutes. We jump straight into solving real issues.",
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
                <p className="text-white/90 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-600" />
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
      <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Calendar className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-bold text-white mb-6">
            Run better Level 10s starting today
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of teams solving real problems every week
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
