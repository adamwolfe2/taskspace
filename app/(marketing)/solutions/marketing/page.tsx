"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Target,
  Users,
  TrendingUp,
  Megaphone,
  Calendar,
  Brain,
  Zap,
  Star,
  X,
  BarChart3,
  Sparkles,
  Rocket,
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

export default function MarketingSolutionPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-pink-50 to-white">
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
                <Badge className="bg-pink-50 text-pink-600 border-pink-200 mb-4">
                  <Megaphone className="w-4 h-4 mr-1" />
                  FOR MARKETING TEAMS
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-6xl font-bold text-slate-900 leading-[1.1]">
                Execute campaigns with{" "}
                <span className="text-slate-400">perfect clarity</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
                Get your marketing team aligned on quarterly campaigns, content calendars, and brand
                goals. Track progress from strategy to execution with real-time visibility.
              </motion.p>

              <motion.div variants={fadeInUp} className="space-y-4">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">REPLACES:</span>
                  <div className="flex gap-2">
                    {["Monday", "Asana", "Google Sheets", "Slack"].map((tool) => (
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
                  <div className="h-32 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg" />
                </div>

                {/* Middle layer */}
                <div className="absolute top-4 right-0 w-[85%] bg-white rounded-xl shadow-xl border border-slate-200 p-4 -rotate-2 opacity-90">
                  <div className="h-32 bg-gradient-to-br from-orange-50 to-pink-50 rounded-lg" />
                </div>

                {/* Front layer */}
                <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">Q1 Campaign Rocks</h3>
                      <Badge className="bg-pink-500 text-white border-0">On Track</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
                        <div className="text-3xl font-bold text-pink-600">12k</div>
                        <div className="text-xs text-slate-600 mt-1">New Leads</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="text-3xl font-bold text-purple-600">450k</div>
                        <div className="text-xs text-slate-600 mt-1">Social Reach</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">Product Launch Campaign</span>
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">85%</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-900">Content Marketing</span>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">72%</Badge>
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
            TRUSTED BY HIGH-PERFORMING MARKETING TEAMS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale">
            {["Amazon", "Spotify", "NVIDIA", "Wayfair"].map((logo) => (
              <div key={logo} className="text-2xl font-bold text-slate-900">{logo}</div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="py-20 lg:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="bg-pink-600 text-white mb-6">
              <Brain className="w-4 h-4 mr-1" />
              AI AGENTS FOR MARKETING
            </Badge>
            <h2 className="text-5xl font-bold text-white mb-4">
              Your marketing workflows, powered by AI
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Campaign Agent",
                description: "Auto-tracks campaign milestones, alerts when deliverables are behind schedule, suggests next steps",
                color: "from-pink-400 to-pink-600",
              },
              {
                name: "Content Agent",
                description: "Monitors content calendar, flags missing assets, ensures brand consistency across channels",
                color: "from-purple-400 to-purple-600",
              },
              {
                name: "Brand Agent",
                description: "Checks all marketing materials for brand guideline compliance and tone consistency",
                color: "from-orange-400 to-orange-600",
              },
              {
                name: "Performance Agent",
                description: "Analyzes campaign metrics, identifies underperforming channels, recommends optimizations",
                color: "from-blue-400 to-blue-600",
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
              <Button className="bg-pink-600 hover:bg-pink-700 text-white rounded-full px-8">
                Explore AI Agents
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature: Campaign Rocks */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-pink-50 text-pink-600 border-pink-200">
                <Target className="w-4 h-4 mr-1" />
                CAMPAIGN ROCKS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Quarterly campaigns that actually launch
              </h2>

              <p className="text-xl text-slate-600">
                Set 3-5 major campaign rocks per quarter. Track creative assets, launch milestones,
                and performance metrics all in one place.
              </p>

              <ul className="space-y-4">
                {[
                  "Quarterly campaign rocks with clear deliverables",
                  "Content calendar integrated with rocks",
                  "Creative asset tracking and approvals",
                  "Launch checklists and go-live gates",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-8 border border-pink-100">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <h3 className="font-bold text-slate-900 mb-4">Q1 2026 Marketing Rocks</h3>
                  <div className="space-y-4">
                    {[
                      { name: "Product Launch Campaign", progress: 85, status: "on-track" },
                      { name: "Content Marketing Scale", progress: 70, status: "on-track" },
                      { name: "Brand Refresh Rollout", progress: 45, status: "at-risk" },
                    ].map((rock, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900">{rock.name}</span>
                          <span className="text-xs text-slate-600">{rock.progress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              rock.status === "on-track" ? "bg-gradient-to-r from-pink-500 to-purple-600" : "bg-gradient-to-r from-orange-500 to-orange-600"
                            )}
                            style={{ width: `${rock.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">12 tasks</Badge>
                            <Badge variant="outline" className="text-xs">3 assets</Badge>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            rock.status === "on-track" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {rock.status === "on-track" ? "On Track" : "At Risk"}
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

      {/* Feature: Content Calendar */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">February Content Calendar</h3>
                <div className="space-y-3">
                  {[
                    { date: "Feb 1", content: "Blog: Product Launch Guide", status: "published", channel: "Blog" },
                    { date: "Feb 5", content: "Social: Launch Teaser Video", status: "scheduled", channel: "Social" },
                    { date: "Feb 10", content: "Email: Early Access Campaign", status: "draft", channel: "Email" },
                    { date: "Feb 15", content: "Webinar: Product Deep Dive", status: "planned", channel: "Webinar" },
                  ].map((item, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-900">{item.content}</span>
                        <Badge className={cn(
                          "text-xs",
                          item.status === "published" && "bg-emerald-100 text-emerald-700",
                          item.status === "scheduled" && "bg-blue-100 text-blue-700",
                          item.status === "draft" && "bg-orange-100 text-orange-700",
                          item.status === "planned" && "bg-slate-100 text-slate-700"
                        )}>
                          {item.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{item.date}</span>
                        <span>{item.channel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-purple-50 text-purple-600 border-purple-200">
                <Calendar className="w-4 h-4 mr-1" />
                CONTENT CALENDAR
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Never miss a content deadline
              </h2>

              <p className="text-xl text-slate-600">
                Plan your content calendar tied to campaign rocks. Track blog posts, social media,
                emails, and events—all connected to quarterly goals.
              </p>

              <ul className="space-y-4">
                {[
                  "Multi-channel content planning (blog, social, email)",
                  "Content status tracking (planned, draft, scheduled, published)",
                  "Auto-reminders for upcoming deadlines",
                  "Integration with campaign rocks and metrics",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature: Campaign Analytics */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-blue-50 text-blue-600 border-blue-200">
                <BarChart3 className="w-4 h-4 mr-1" />
                CAMPAIGN ANALYTICS
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Real-time performance visibility
              </h2>

              <p className="text-xl text-slate-600">
                Track leads, conversions, reach, and engagement. AI identifies underperforming
                campaigns and suggests optimizations.
              </p>

              <ul className="space-y-4">
                {[
                  "Lead generation and conversion tracking",
                  "Channel performance analysis",
                  "Budget allocation recommendations",
                  "Weekly marketing scorecard",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/app?page=register">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                  Start tracking campaigns
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Campaign Performance</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-600">12.5k</div>
                        <div className="text-xs text-slate-600 mt-1">Leads Generated</div>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                          <span className="text-xs text-emerald-600 font-medium">+23%</span>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">3.2%</div>
                        <div className="text-xs text-slate-600 mt-1">Conversion Rate</div>
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-blue-600 font-medium">+0.8%</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-700 uppercase">Channel Performance:</div>
                      {[
                        { channel: "Email", leads: "5.2k", performance: 85 },
                        { channel: "Social", leads: "4.1k", performance: 68 },
                        { channel: "Paid Ads", leads: "3.2k", performance: 92 },
                      ].map((ch, i) => (
                        <div key={i} className="p-2 bg-slate-50 rounded">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-slate-900">{ch.channel}</span>
                            <span className="text-slate-600">{ch.leads} leads</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                              style={{ width: `${ch.performance}%` }}
                            />
                          </div>
                        </div>
                      ))}
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
              Marketing teams execute 2.8x faster with Align
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "2.8x", label: "Faster campaign execution" },
              { value: "90%", label: "On-time content delivery" },
              { value: "35%", label: "More leads generated" },
              { value: "100%", label: "Team alignment on goals" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
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
              Marketing leaders love Align
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "We finally hit all our campaign launch dates. The content calendar integration with rocks keeps everyone on track.",
                author: "Sarah Chen",
                role: "VP Marketing, TechCorp",
              },
              {
                quote: "The AI Campaign Agent saved our Q1 launch. It flagged missing assets 2 weeks before go-live, giving us time to fix.",
                author: "Michael Rodriguez",
                role: "Head of Marketing, StartupXYZ",
              },
              {
                quote: "Our lead gen increased 35% after we started tracking campaigns as rocks. The accountability is unmatched.",
                author: "Emily Watson",
                role: "CMO, GrowthLabs",
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-600" />
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
      <section className="py-20 lg:py-32 bg-gradient-to-br from-pink-600 via-purple-600 to-blue-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Rocket className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-bold text-white mb-6">
            Launch better campaigns today
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of marketing teams executing flawlessly
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
