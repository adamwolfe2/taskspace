"use client"

import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  CheckCircle,
  BarChart3,
  Users,
  Target,
  Calendar,
  Brain,
  Shield,
  Zap,
  Clock,
  TrendingUp,
  MessageSquare,
  Play,
  Star,
  Building2,
  ChevronRight,
  Sparkles,
  Rocket,
  Award,
  Globe,
  Lock,
  Linkedin,
  Twitter,
  Github,
  Mail,
  Check,
  X,
  AlertCircle,
} from "lucide-react"
import { DemoEODForm } from "@/components/marketing/demo-eod-form"
import { DemoKanban } from "@/components/marketing/demo-kanban"
import { DemoRocks } from "@/components/marketing/demo-rocks"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
}

// Hero Section - Narrative-driven with embedded preview
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="relative pt-32 pb-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-red-50/30 to-white" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span>Trusted by 500+ high-performing teams</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6"
          >
            Build a Culture of
            <br />
            <span className="bg-gradient-to-r from-red-500 via-red-600 to-orange-500 bg-clip-text text-transparent">
              Daily Accountability
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Align transforms how teams track progress with AI-powered EOD reports,
            visual goal tracking, and intelligent insights. No more status meetings.
            Just results.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25 text-base px-8 h-12">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="border-slate-200 hover:bg-slate-50 text-base px-8 h-12">
                <Play className="mr-2 h-5 w-5" />
                See It In Action
              </Button>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-600"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white"
                  />
                ))}
              </div>
              <span className="font-medium">500+ teams</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1 font-medium">4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="font-medium">SOC 2 Certified</span>
            </div>
          </motion.div>
        </div>

        {/* Product Screenshot - Embedded Demo */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative max-w-6xl mx-auto"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-red-500/20 to-transparent blur-3xl" />

            {/* Browser Frame */}
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-slate-500 text-center font-medium">
                    app.getalign.io/dashboard
                  </div>
                </div>
              </div>

              {/* Actual Product Screenshot */}
              <div className="bg-gradient-to-br from-slate-50 to-white p-8">
                <div className="grid grid-cols-12 gap-6">
                  {/* Sidebar */}
                  <div className="col-span-2 space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg" />
                    {[
                      { active: true, color: "bg-red-50 border-red-200" },
                      { active: false, color: "bg-slate-50" },
                      { active: false, color: "bg-slate-50" },
                      { active: false, color: "bg-slate-50" },
                      { active: false, color: "bg-slate-50" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-10 rounded-lg border transition-all",
                          item.color
                        )}
                      />
                    ))}
                  </div>

                  {/* Main Content */}
                  <div className="col-span-10 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { icon: Target, value: "94%", label: "On Track", color: "from-red-500 to-red-600" },
                        { icon: CheckCircle, value: "28", label: "Completed", color: "from-emerald-500 to-emerald-600" },
                        { icon: TrendingUp, value: "12", label: "In Progress", color: "from-blue-500 to-blue-600" },
                        { icon: Users, value: "8", label: "Team Size", color: "from-purple-500 to-purple-600" },
                      ].map((stat, i) => {
                        const Icon = stat.icon
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"
                          >
                            <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br mb-3 flex items-center justify-center", stat.color)}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-3 gap-6">
                      {/* EOD Reports */}
                      <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-slate-900">Recent EOD Reports</h3>
                          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">Live</Badge>
                        </div>
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -20 }}
                              animate={isInView ? { opacity: 1, x: 0 } : {}}
                              transition={{ delay: 0.6 + i * 0.1 }}
                              className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300" />
                              <div className="flex-1 min-w-0">
                                <div className="h-3 bg-slate-300 rounded w-3/4 mb-2" />
                                <div className="h-2 bg-slate-200 rounded w-1/2" />
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Done
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Rock Progress */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-semibold text-slate-900 mb-4">Rock Progress</h3>
                        <div className="space-y-4">
                          {[85, 62, 45].map((progress, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={isInView ? { opacity: 1, scale: 1 } : {}}
                              transition={{ delay: 0.8 + i * 0.1 }}
                              className="space-y-2"
                            >
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Q1 Goal {i + 1}</span>
                                <span className="font-semibold text-slate-900">{progress}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={isInView ? { width: `${progress}%` } : {}}
                                  transition={{ duration: 1, delay: 0.8 + i * 0.1 }}
                                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                                />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Logo Cloud
function LogoSection() {
  const logos = [
    { name: "Asana", icon: "/integrations/asana.svg" },
    { name: "Slack", icon: "/integrations/slack.svg" },
    { name: "Google", icon: "/integrations/google-calendar.svg" },
    { name: "Stripe", icon: "/integrations/stripe.svg" },
  ]

  return (
    <section className="py-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-500 mb-8">
          INTEGRATES WITH YOUR EXISTING TOOLS
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12">
          {logos.map((logo) => (
            <div key={logo.name} className="flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
              <Image
                src={logo.icon}
                alt={logo.name}
                width={120}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Problem-Solution Split Section
function ProblemSolutionSection() {
  return (
    <section className="py-20 lg:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Problem */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50">
                The Problem
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
              Status meetings waste
              <br />
              <span className="text-red-600">20+ hours per week</span>
            </motion.h2>
            <motion.div variants={staggerContainer} className="space-y-4">
              {[
                "Team members don't know what others are working on",
                "Managers lack visibility into progress and blockers",
                "Goals drift without daily accountability check-ins",
                "Context switching between Slack, email, and meetings kills productivity",
              ].map((problem, i) => (
                <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">{problem}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Solution */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                The Solution
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
              Replace meetings with
              <br />
              <span className="text-emerald-600">async accountability</span>
            </motion.h2>
            <motion.div variants={staggerContainer} className="space-y-4">
              {[
                "AI organizes daily task dumps into structured EOD reports",
                "Real-time dashboard shows team progress and blockers",
                "Quarterly rocks keep everyone aligned on what matters",
                "One platform for EODs, tasks, goals, and team visibility",
              ].map((solution, i) => (
                <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-600">{solution}</span>
                </motion.div>
              ))}
            </motion.div>
            <motion.div variants={fadeInUp} className="pt-4">
              <Link href="/register">
                <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700">
                  See How It Works
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// Stats Section
function StatsSection() {
  const stats = [
    { value: "94%", label: "Increase in team accountability", icon: TrendingUp },
    { value: "20hrs", label: "Saved per week on status meetings", icon: Clock },
    { value: "2.5x", label: "Faster quarterly goal completion", icon: Rocket },
    { value: "500+", label: "High-performing teams using Align", icon: Users },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                className="text-center space-y-3"
              >
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto">
                  <Icon className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-slate-600 text-sm">{stat.label}</div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

// Feature Cards
function FeaturesSection() {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered EOD Reports",
      description: "Paste your daily task dump. AI instantly organizes it by your quarterly rocks, identifies blockers, and creates a structured report.",
      color: "from-purple-500 to-purple-600",
      badge: "Most Popular",
    },
    {
      icon: Target,
      title: "Quarterly Rocks (Goals)",
      description: "Set 3-7 quarterly goals. Track progress with visual indicators, milestones, and automatic status updates based on daily activity.",
      color: "from-red-500 to-red-600",
      badge: "Core Feature",
    },
    {
      icon: BarChart3,
      title: "Real-Time Team Dashboard",
      description: "See exactly what your team is working on, who's blocked, and progress toward goals - all in one unified dashboard.",
      color: "from-blue-500 to-blue-600",
      badge: "Managers Love This",
    },
    {
      icon: CheckCircle,
      title: "Kanban Task Management",
      description: "Drag-and-drop tasks across columns. Link tasks to rocks. Set priorities. See dependencies. All synced in real-time.",
      color: "from-emerald-500 to-emerald-600",
    },
    {
      icon: Users,
      title: "Manager Insights",
      description: "Get AI-generated insights on team velocity, at-risk goals, and who needs support - delivered weekly to your inbox.",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: Zap,
      title: "Integrations That Matter",
      description: "Sync with Slack for notifications, Google Calendar for deadlines, Asana for tasks. No manual data entry required.",
      color: "from-cyan-500 to-cyan-600",
    },
  ]

  return (
    <section id="features" className="py-20 lg:py-32 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="bg-red-50 text-red-600 border-red-200 mb-4">
              Features
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Everything you need for
            <br />
            team accountability
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-slate-600 max-w-2xl mx-auto">
            Replace spreadsheets, status meetings, and Slack chaos with one platform
            designed for daily progress tracking.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                variants={scaleIn}
                className="group relative bg-white rounded-2xl border border-slate-200 p-8 hover:shadow-xl hover:border-slate-300 transition-all duration-300"
              >
                {feature.badge && (
                  <div className="absolute -top-3 left-8">
                    <Badge className="bg-red-600 text-white border-0 shadow-lg">
                      {feature.badge}
                    </Badge>
                  </div>
                )}
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-5 group-hover:scale-110 transition-transform", feature.color)}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Product Demos
function ProductDemoSection() {
  return (
    <section id="product" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-32">
        {/* EOD Demo */}
        <div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-purple-50 text-purple-600 border-purple-200 mb-4">
                <Sparkles className="w-4 h-4 mr-1" />
                AI-Powered
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Submit EOD Reports in 10 Seconds
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-slate-600 max-w-3xl mx-auto">
              Just paste your daily task dump. Our AI automatically organizes tasks by your quarterly rocks,
              identifies blockers, and creates a professional report. Try it below:
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <DemoEODForm />
          </motion.div>
        </div>

        {/* Kanban Demo */}
        <div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-blue-50 text-blue-600 border-blue-200 mb-4">
                <Target className="w-4 h-4 mr-1" />
                Task Management
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Visual Kanban Boards
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-slate-600 max-w-3xl mx-auto">
              Drag tasks between columns. See priority, deadlines, and rock alignment at a glance.
              Everything syncs in real-time across your team.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <DemoKanban />
          </motion.div>
        </div>

        {/* Rocks Demo */}
        <div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 mb-4">
                <Target className="w-4 h-4 mr-1" />
                Goal Tracking
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Quarterly Rocks That Actually Get Done
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-slate-600 max-w-3xl mx-auto">
              Set 3-7 quarterly goals. Track progress with interactive sliders, manage milestones,
              and see real-time status indicators. Try dragging the progress bars:
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <DemoRocks />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// Social Proof - Testimonials
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Align replaced our daily standups. We save 2 hours per day and have better visibility than ever.",
      author: "Sarah Chen",
      role: "VP of Engineering",
      company: "TechCorp",
      avatar: "/avatars/1.jpg",
      rating: 5,
    },
    {
      quote: "The AI EOD parsing is magic. My team actually enjoys submitting updates now instead of dreading status meetings.",
      author: "Michael Rodriguez",
      role: "Head of Product",
      company: "StartupXYZ",
      avatar: "/avatars/2.jpg",
      rating: 5,
    },
    {
      quote: "We hit our quarterly goals 2.5x faster after adopting Align. The rock tracking keeps everyone accountable.",
      author: "Emily Watson",
      role: "CEO",
      company: "GrowthLabs",
      avatar: "/avatars/3.jpg",
      rating: 5,
    },
  ]

  return (
    <section id="customers" className="py-20 lg:py-32 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="bg-white/10 text-white border-white/20 mb-4">
              <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
              Loved by Teams
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Join 500+ teams building
            <br />
            better accountability habits
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              variants={scaleIn}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-white/90 mb-6 leading-relaxed">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-white/60">{testimonial.role}, {testimonial.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Pricing
function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      description: "Perfect for small teams getting started",
      features: [
        "Up to 10 team members",
        "Unlimited EOD reports",
        "Unlimited rocks & tasks",
        "Basic analytics",
        "Email support",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Professional",
      price: "$99",
      description: "For growing teams that need more",
      features: [
        "Up to 50 team members",
        "Everything in Starter",
        "Advanced analytics & insights",
        "Priority support",
        "Custom integrations",
        "API access",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      features: [
        "Unlimited team members",
        "Everything in Professional",
        "Dedicated account manager",
        "Custom onboarding",
        "SLA guarantee",
        "Advanced security",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ]

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="bg-red-50 text-red-600 border-red-200 mb-4">
              Pricing
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Simple, transparent pricing
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-slate-600 max-w-2xl mx-auto">
            14-day free trial. No credit card required. Cancel anytime.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={scaleIn}
              className={cn(
                "relative rounded-2xl border p-8",
                plan.popular
                  ? "border-red-500 shadow-2xl shadow-red-500/20 bg-white scale-105"
                  : "border-slate-200 bg-white"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-red-600 text-white border-0 shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-slate-900 mb-2">{plan.price}</div>
                {plan.price !== "Custom" && <div className="text-slate-600">per month</div>}
                <p className="text-sm text-slate-500 mt-2">{plan.description}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={cn(
                  "w-full",
                  plan.popular
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                    : "border-slate-200"
                )}
                variant={plan.popular ? "default" : "outline"}
                size="lg"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// FAQ
function FAQSection() {
  const faqs = [
    {
      question: "How is Align different from Slack or Asana?",
      answer: "Align is purpose-built for daily accountability. While Slack is for chat and Asana for task management, Align combines EOD reporting, goal tracking, and team visibility in one unified workflow. We integrate with both tools instead of replacing them.",
    },
    {
      question: "How does the AI parsing work?",
      answer: "Just paste your daily task dump (bullets, notes, whatever format). Our AI identifies tasks, links them to your quarterly rocks, extracts blockers and priorities, and structures everything into a professional EOD report. It takes 10 seconds.",
    },
    {
      question: "Can we customize it for our workspace?",
      answer: "Absolutely. Every workspace gets custom branding (colors, logo), custom rock naming (OKRs, goals, initiatives), custom metrics, and configurable workflows. We built it to adapt to how your team works.",
    },
    {
      question: "What happens during the free trial?",
      answer: "Full access to all features for 14 days. No credit card required. Invite your team, submit EODs, track rocks. If you love it, upgrade. If not, no hard feelings.",
    },
    {
      question: "How do you handle data security?",
      answer: "SOC 2 Type II certified. All data encrypted at rest and in transit. Role-based access controls. Annual penetration testing. Your data stays yours - we never train AI on customer data.",
    },
    {
      question: "Do you offer implementation support?",
      answer: "Professional and Enterprise plans include onboarding calls. We'll help you set up rocks, invite your team, configure integrations, and train your managers. Most teams are fully onboarded in under a week.",
    },
  ]

  return (
    <section className="py-20 lg:py-32 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="bg-red-50 text-red-600 border-red-200 mb-4">
              FAQ
            </Badge>
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Frequently asked questions
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="space-y-6"
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-3">{faq.question}</h3>
              <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Final CTA
function CTASection() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-red-500 via-red-600 to-orange-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <Badge className="bg-white/10 border-white/20 text-white">
              <Shield className="w-4 h-4 mr-1" />
              14-day free trial · No credit card required
            </Badge>
          </motion.div>

          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to transform your
            <br />
            team's accountability?
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-xl text-white/90 max-w-2xl mx-auto mb-10">
            Join 500+ teams using Align to replace status meetings with async accountability.
            Start your free trial today.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-white text-red-600 hover:bg-slate-50 shadow-xl text-base px-8 h-12">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 text-base px-8 h-12">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </Link>
          </motion.div>

          <motion.div variants={fadeInUp} className="mt-12 flex items-center justify-center gap-8 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Free 14-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Cancel anytime</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// Footer
function Footer() {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg" />
              <span className="text-xl font-bold">Align</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Transform your team's daily accountability with AI-powered progress tracking.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#customers" className="hover:text-white transition-colors">Customers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div>© 2026 Align. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Main Page Component
export default function HomePage() {
  return (
    <>
      <MegaMenu />
      <HeroSection />
      <LogoSection />
      <ProblemSolutionSection />
      <StatsSection />
      <FeaturesSection />
      <ProductDemoSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </>
  )
}
