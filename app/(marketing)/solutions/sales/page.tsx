"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Target,
  Users,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  Brain,
  Zap,
  Star,
  X,
  BarChart3,
  Calendar,
  Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PageTransition } from "@/components/marketing/page-transition"

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

export default function SalesSolutionPage() {
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
                  <DollarSign className="w-4 h-4 mr-1" />
                  FOR SALES TEAMS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-6xl font-bold text-slate-900 leading-[1.1]">
                Hit quota every{" "}
                <span className="text-slate-400">quarter</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
                Get your sales team executing with crystal-clear visibility into pipeline, activity,
                and quarterly revenue rocks. Built for high-performing sales organizations.
              </motion.p>

              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">REPLACES:</span>
                  <div className="flex gap-2">
                    {["Spreadsheets", "Salesforce Reports", "Slack", "Email"].map((tool) => (
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
              <div className="relative">
                {/* Back layer */}
                <div className="absolute top-8 -right-4 w-[85%] bg-white rounded-xl shadow-xl border border-slate-200 p-4 rotate-3 opacity-80">
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg" />
                </div>

                {/* Middle layer */}
                <div className="absolute top-4 right-0 w-[85%] bg-white rounded-xl shadow-xl border border-slate-200 p-4 -rotate-2 opacity-90">
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg" />
                </div>

                {/* Front layer */}
                <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">Sales Dashboard</h3>
                      <Badge className="bg-gray-600 text-white border-0">On Track</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-3xl font-bold text-black">$847k</div>
                        <div className="text-xs text-slate-600 mt-1">Q1 Revenue</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-3xl font-bold text-black">94%</div>
                        <div className="text-xs text-slate-600 mt-1">To Quota</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">Enterprise Deals</span>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">$450k</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">Mid-Market</span>
                        <Badge className="bg-gray-100 text-gray-700 text-xs">$397k</Badge>
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
            TRUSTED BY HIGH-PERFORMING SALES TEAMS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale">
            {["Amazon", "Spotify", "Verizon", "Wayfair"].map((logo) => (
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
              AI AGENTS FOR SALES
            </Badge>
            <h2 className="text-5xl font-bold text-white mb-4">
              Your sales workflows, automated by AI
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Pipeline Agent",
                description: "Tracks deal velocity, flags stalled opportunities, and predicts close dates based on activity",
                color: "from-gray-400 to-gray-600",
              },
              {
                name: "Activity Agent",
                description: "Monitors daily activities (calls, emails, meetings) and alerts reps falling behind targets",
                color: "from-gray-400 to-gray-600",
              },
              {
                name: "Quota Agent",
                description: "Forecasts quarterly revenue, identifies gaps to quota, and suggests deal prioritization",
                color: "from-gray-400 to-gray-600",
              },
              {
                name: "Follow-up Agent",
                description: "Reminds reps of pending follow-ups, unanswered emails, and missed touchpoints",
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

      {/* Feature: Revenue Rocks */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <Target className="w-4 h-4 mr-1" />
                REVENUE ROCKS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Taskspace every deal to quarterly revenue goals
              </h2>

              <p className="text-xl text-slate-600">
                Set quarterly revenue rocks. Every closed deal automatically updates rock progress.
                Sales teams see exactly how they're tracking to quota in real-time.
              </p>

              <ul className="space-y-4">
                {[
                  "Quarterly revenue rocks tied to individual quotas",
                  "Automatic progress updates from closed deals",
                  "Pipeline visibility mapped to rock targets",
                  "Early warning when quota is at risk",
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
                  <h3 className="font-bold text-slate-900 mb-4">Q1 2026 Revenue Rocks</h3>
                  <div className="space-y-4">
                    {[
                      { name: "Enterprise Team Quota", target: "$500k", current: "$450k", progress: 90 },
                      { name: "Mid-Market Quota", target: "$400k", current: "$360k", progress: 90 },
                      { name: "SMB Team Quota", target: "$200k", current: "$150k", progress: 75 },
                    ].map((rock, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">{rock.name}</span>
                          <span className="text-xs text-slate-600">{rock.current} / {rock.target}</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              rock.progress >= 80 ? "bg-gray-600" : "bg-gray-600"
                            )}
                            style={{ width: `${rock.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{rock.progress}% to goal</span>
                          <Badge className={cn(
                            "text-xs",
                            rock.progress >= 80 ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-700"
                          )}>
                            {rock.progress >= 80 ? "On Track" : "At Risk"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Activity Tracking */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Daily Sales Scorecard</h3>
                <div className="space-y-3">
                  {[
                    { metric: "Calls Made", target: "50", actual: "52", status: "up" },
                    { metric: "Emails Sent", target: "100", actual: "110", status: "up" },
                    { metric: "Meetings Booked", target: "10", actual: "8", status: "down" },
                    { metric: "Demos Completed", target: "5", actual: "6", status: "up" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 text-sm">{row.metric}</div>
                        <div className="text-xs text-slate-500">Target: {row.target}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{row.actual}</div>
                        {row.status === "up" ? (
                          <TrendingUp className="w-4 h-4 text-black inline-block" />
                        ) : (
                          <span className="text-xs text-black">Below target</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <BarChart3 className="w-4 h-4 mr-1" />
                ACTIVITY TRACKING
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Daily activity metrics that drive results
              </h2>

              <p className="text-xl text-slate-600">
                Track calls, emails, meetings, and demos. AI automatically logs activities from EODs
                and integrations, giving managers real-time visibility.
              </p>

              <ul className="space-y-4">
                {[
                  "Auto-track activities from EOD submissions",
                  "Integration with email and calendar",
                  "Daily and weekly activity scorecards",
                  "Benchmarking across the sales team",
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

      {/* Feature: Pipeline Visibility */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-white text-gray-600 border-gray-200">
                <TrendingUp className="w-4 h-4 mr-1" />
                PIPELINE INSIGHTS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                AI-powered pipeline forecasting
              </h2>

              <p className="text-xl text-slate-600">
                Get accurate close date predictions, deal velocity analysis, and early warnings on
                stalled opportunities. Know which deals need attention.
              </p>

              <ul className="space-y-4">
                {[
                  "Predictive close date forecasting",
                  "Stalled deal alerts and recommendations",
                  "Win/loss pattern analysis",
                  "Weekly pipeline health summaries",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/app?page=register">
                <Button className="bg-black hover:bg-gray-900 text-white rounded-full px-6">
                  Start tracking pipeline
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Pipeline Forecast</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-900">Acme Corp - Enterprise</span>
                        <Badge className="bg-black text-white text-xs">$150k</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Predicted close: Feb 15</span>
                        <span className="text-black font-medium">85% confident</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-900">TechStart Inc</span>
                        <Badge className="bg-black text-white text-xs">$75k</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Stalled 14 days</span>
                        <Button size="sm" className="h-6 text-xs bg-black hover:bg-gray-900 text-white">
                          Follow up
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-900">Global Systems</span>
                        <Badge className="bg-black text-white text-xs">$200k</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">In negotiation</span>
                        <span className="text-black font-medium">Moving fast</span>
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
              Sales teams hit quota 35% more often with Taskspace
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "35%", label: "Higher quota attainment" },
              { value: "15hrs", label: "Saved per week on reporting" },
              { value: "2.5x", label: "Faster deal velocity" },
              { value: "100%", label: "Pipeline visibility" },
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
              Sales leaders love Taskspace
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Our team hit 110% of quota last quarter. The AI pipeline forecasting helped us prioritize the right deals at the right time.",
                author: "Michael Rodriguez",
                role: "VP of Sales, TechCorp",
              },
              {
                quote: "We went from manual activity tracking in spreadsheets to automated scorecards. Saved our managers 15 hours per week.",
                author: "Sarah Chen",
                role: "Sales Director, StartupXYZ",
              },
              {
                quote: "The revenue rocks keep everyone aligned. Every rep knows exactly how they're tracking to quarterly quota in real-time.",
                author: "Emily Watson",
                role: "CRO, GrowthLabs",
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
            Start hitting quota consistently
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of sales teams winning with Taskspace
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
            <div>© 2026 Taskspace. All rights reserved.</div>
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
    </PageTransition>
  )
}
