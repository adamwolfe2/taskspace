"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Target,
  BarChart3,
  TrendingUp,
  Calendar,
  Brain,
  Star,
  Award,
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

export default function LeadershipSolutionPage() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
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
                  <Award className="w-4 h-4 mr-1" />
                  FOR LEADERSHIP TEAMS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-6xl font-bold text-slate-900 leading-[1.1]">
                Close the strategy-execution{" "}
                <span className="text-slate-400">gap</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
                Get your leadership team, departments, and entire company running smoothly with
                the industry's best EOS execution platform. Built for Visionaries, Integrators,
                and Leadership Teams.
              </motion.p>

              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">REPLACES:</span>
                  <div className="flex gap-2">
                    {["Monday", "Asana", "Slack", "Notion"].map((tool) => (
                      <Badge key={tool} variant="outline" className="border-slate-300 text-slate-600">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start gap-4 pt-4">
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
              </motion.div>
            </motion.div>

            {/* Right - Layered Product Demo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Multiple overlapping screenshots showing different features */}
              <div className="relative">
                {/* Back layer - Scorecard */}
                <div className="absolute top-8 -right-4 w-[85%] bg-white rounded-xl shadow-xl border border-slate-200 p-4 rotate-3 opacity-80">
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg" />
                </div>

                {/* Middle layer - Rocks */}
                <div className="absolute top-4 right-0 w-[85%] bg-white rounded-xl shadow-xl border border-slate-200 p-4 -rotate-2 opacity-90">
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg" />
                </div>

                {/* Front layer - Dashboard */}
                <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">Leadership Dashboard</h3>
                      <Badge className="bg-gray-600 text-white border-0">All Systems Go</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-3xl font-bold text-black">94%</div>
                        <div className="text-xs text-slate-600 mt-1">Rocks On Track</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-3xl font-bold text-black">8/8</div>
                        <div className="text-xs text-slate-600 mt-1">EODs Today</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">Q1 Revenue Rock</span>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">85%</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">Product Launch</span>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">72%</Badge>
                      </div>
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
            TRUSTED BY LEADERSHIP TEAMS WORLDWIDE
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale">
            {["Amazon", "NVIDIA", "Spotify", "Harvard"].map((logo) => (
              <div key={logo} className="text-2xl font-bold text-slate-900">{logo}</div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="py-20 lg:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-black text-white mb-6">
              <Brain className="w-4 h-4 mr-1" />
              AI AGENTS FOR LEADERSHIP
            </Badge>
            <h2 className="text-5xl font-bold text-white mb-4">
              Your key workflows, powered by AI Agents
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Goal Reminder Agent",
                description: "Automatically reminds team members of quarterly rock deadlines and milestones",
                color: "from-gray-400 to-gray-600",
              },
              {
                name: "Alignment Agent",
                description: "Detects when department goals drift from company vision and alerts leadership",
                color: "from-gray-400 to-gray-600",
              },
              {
                name: "Key Results Agent",
                description: "Tracks KPIs across all departments and flags metrics trending off-target",
                color: "from-gray-400 to-gray-600",
              },
              {
                name: "Status Update Agent",
                description: "Compiles weekly leadership summaries from all EODs and rock progress",
                color: "from-gray-400 to-gray-600",
              },
            ].map((agent, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
              >
                <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4", agent.color)}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{agent.name}</h3>
                <p className="text-sm text-white/70">{agent.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/app?page=register">
              <Button className="bg-black hover:bg-gray-900 text-white rounded-full px-8">
                Explore AI Agents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature: Vision/Traction Alignment */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Target className="w-4 h-4 mr-1" />
                VISION/TRACTION
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Turn quarterly plans into daily wins
              </h2>

              <p className="text-xl text-slate-600">
                Connect your V/TO (Vision/Traction Organizer) to daily execution. Every team member
                sees how their work ladders up to company vision.
              </p>

              <ul className="space-y-4">
                {[
                  "Digital V/TO accessible to entire company",
                  "Automatic alignment between vision and daily tasks",
                  "Rock tracking tied to 1-Year and 3-Year plans",
                  "Core Values embedded in every process",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="text-center pb-4 border-b border-slate-200">
                    <h3 className="text-2xl font-bold text-slate-900">Vision/Traction Organizer</h3>
                    <p className="text-sm text-slate-600 mt-1">Q1 2026</p>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-semibold text-black uppercase mb-1">Core Focus</div>
                      <div className="text-sm font-medium text-slate-900">Help companies run on EOS</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-semibold text-black uppercase mb-1">10-Year Target</div>
                      <div className="text-sm font-medium text-slate-900">10,000 companies on Taskspace</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs font-semibold text-black uppercase mb-1">1-Year Plan</div>
                      <div className="text-sm font-medium text-slate-900">1,000 paying customers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Scorecard */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Weekly Scorecard</h3>
                <div className="space-y-3">
                  {[
                    { metric: "Revenue", target: "$100k", actual: "$105k", status: "up" },
                    { metric: "New Customers", target: "10", actual: "12", status: "up" },
                    { metric: "Customer Churn", target: "<2%", actual: "1.5%", status: "up" },
                    { metric: "NPS Score", target: "45", actual: "48", status: "up" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 text-sm">{row.metric}</div>
                        <div className="text-xs text-slate-500">Target: {row.target}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{row.actual}</div>
                        <TrendingUp className="w-4 h-4 text-black inline-block" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <BarChart3 className="w-4 h-4 mr-1" />
                SCORECARD
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Track the pulse of your business weekly
              </h2>

              <p className="text-xl text-slate-600">
                Define your measurables. Track them weekly. Identify trends before they become problems.
                Built for Level 10 meetings.
              </p>

              <ul className="space-y-4">
                {[
                  "Custom metrics for every department",
                  "Automatic data collection from EODs",
                  "Trend analysis and alerts",
                  "Integration with Level 10 meeting agenda",
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

      {/* Feature: Level 10 Meetings */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Calendar className="w-4 h-4 mr-1" />
                LEVEL 10 MEETINGS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Run the most productive leadership meetings
              </h2>

              <p className="text-xl text-slate-600">
                Perfect Level 10 agendas, pre-populated with scorecard data, rock updates, and issues.
                90 minutes, same day, same time, every week.
              </p>

              <ul className="space-y-4">
                {[
                  "Automated agenda with all meeting components",
                  "Scorecard review with trend highlights",
                  "Rock progress updates",
                  "IDS process for issue solving",
                  "Meeting notes and action items captured",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Level 10 Agenda</h3>
                    <Badge className="bg-gray-100 text-gray-700">90 min</Badge>
                  </div>
                  <div className="space-y-3">
                    {[
                      { section: "Segue", time: "5 min", status: "done" },
                      { section: "Scorecard", time: "5 min", status: "done" },
                      { section: "Rock Review", time: "5 min", status: "current" },
                      { section: "Customer/Employee", time: "5 min", status: "upcoming" },
                      { section: "To-Do List", time: "5 min", status: "upcoming" },
                      { section: "IDS", time: "60 min", status: "upcoming" },
                      { section: "Conclude", time: "5 min", status: "upcoming" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          item.status === "done" && "bg-gray-50 border border-gray-200",
                          item.status === "current" && "bg-gray-50 border border-gray-200",
                          item.status === "upcoming" && "bg-slate-50 border border-slate-200"
                        )}
                      >
                        <span className="text-sm font-medium text-slate-900">{item.section}</span>
                        <span className="text-xs text-slate-500">{item.time}</span>
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
              Leadership teams execute 3x faster with Taskspace
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "3x", label: "Faster strategy execution" },
              { value: "95%", label: "Leadership team alignment" },
              { value: "20hrs", label: "Saved per week on meetings" },
              { value: "100%", label: "Visibility into company health" },
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
              Trusted by Visionaries and Integrators
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Finally, a tool that makes EOS actually work instead of living in spreadsheets. Game changer for our leadership team.",
                author: "Emily Watson",
                role: "Visionary & CEO",
              },
              {
                quote: "We went from chaotic quarterly planning to perfect execution. The AI agents are like having an assistant for every rock.",
                author: "Michael Rodriguez",
                role: "Integrator",
              },
              {
                quote: "Level 10 meetings are actually productive now. Everything is pre-populated and we focus on solving real issues.",
                author: "Sarah Chen",
                role: "Leadership Team",
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
          <Award className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-bold text-white mb-6">
            Transform your leadership team today
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of companies running on EOS with Taskspace
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
    </PageTransition>
  )
}
