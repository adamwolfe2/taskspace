"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
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
} from "lucide-react"

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
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
}

// Hero Section
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-red-50/30" />
        <motion.div
          style={{ y }}
          className="absolute top-20 left-10 w-72 h-72 bg-red-100/50 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-red-200/30 rounded-full blur-3xl"
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-8"
          >
            <Zap className="w-4 h-4" />
            <span>AI-Powered Team Accountability</span>
            <ChevronRight className="w-4 h-4" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 leading-tight tracking-tight mb-6"
          >
            Transform Your Team&apos;s
            <br />
            <span className="text-gradient-primary">Daily Accountability</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            AIMS helps teams track progress, achieve quarterly goals, and maintain
            accountability with AI-powered end-of-day reports and intelligent insights.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </Link>
            </motion.div>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white"
                  />
                ))}
              </div>
              <span>500+ teams trust AIMS</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1">4.9/5 rating</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 relative"
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Browser Frame */}
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-slate-400 text-center">
                    app.aims.io/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard Preview */}
              <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 p-8">
                <div className="h-full grid grid-cols-12 gap-4">
                  {/* Sidebar */}
                  <div className="col-span-2 bg-white rounded-xl shadow-sm p-4 space-y-4">
                    <div className="w-8 h-8 rounded-lg bg-red-500" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-8 rounded-lg ${i === 1 ? "bg-red-50" : "bg-slate-50"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {/* Main Content */}
                  <div className="col-span-10 space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { color: "bg-red-500", value: "94%" },
                        { color: "bg-emerald-500", value: "28" },
                        { color: "bg-blue-500", value: "12" },
                        { color: "bg-amber-500", value: "3" },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm p-4">
                          <div className={`w-8 h-8 rounded-lg ${stat.color} mb-2`} />
                          <div className="text-2xl font-bold text-slate-900">
                            {stat.value}
                          </div>
                          <div className="h-2 w-20 bg-slate-100 rounded mt-2" />
                        </div>
                      ))}
                    </div>
                    {/* Content Area */}
                    <div className="grid grid-cols-3 gap-4 flex-1">
                      <div className="col-span-2 bg-white rounded-xl shadow-sm p-4">
                        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="w-10 h-10 rounded-full bg-slate-200" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 w-3/4 bg-slate-200 rounded" />
                                <div className="h-2 w-1/2 bg-slate-100 rounded" />
                              </div>
                              <div className="w-16 h-6 bg-emerald-100 rounded-full" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm p-4">
                        <div className="h-4 w-24 bg-slate-200 rounded mb-4" />
                        <div className="space-y-2">
                          {[60, 80, 45, 90, 70].map((w, i) => (
                            <div key={i} className="space-y-1">
                              <div className="h-2 w-full bg-slate-100 rounded" />
                              <div
                                className="h-2 bg-red-200 rounded"
                                style={{ width: `${w}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="absolute -left-8 top-1/4 bg-white rounded-xl shadow-lg p-4 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    EOD Submitted
                  </div>
                  <div className="text-xs text-slate-500">Just now</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="absolute -right-8 top-1/3 bg-white rounded-xl shadow-lg p-4 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    +23% Productivity
                  </div>
                  <div className="text-xs text-slate-500">This week</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="absolute -bottom-4 left-1/4 bg-white rounded-xl shadow-lg p-4 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    AI Insight Ready
                  </div>
                  <div className="text-xs text-slate-500">3 suggestions</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

// Logos Section
function LogosSection() {
  const logos = [
    "Acme Corp",
    "Globex",
    "Initech",
    "Umbrella",
    "Hooli",
    "Pied Piper",
  ]

  return (
    <section className="py-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-500 mb-8">
          TRUSTED BY LEADING COMPANIES WORLDWIDE
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {logos.map((logo) => (
            <motion.div
              key={logo}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center gap-2 text-slate-400"
            >
              <Building2 className="w-6 h-6" />
              <span className="text-lg font-semibold">{logo}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: CheckCircle,
      title: "AI-Powered EOD Reports",
      description:
        "Generate intelligent end-of-day reports with AI assistance. Track accomplishments, blockers, and tomorrow's priorities effortlessly.",
      color: "red",
      href: "/features/eod-reports",
    },
    {
      icon: Users,
      title: "Team Management",
      description:
        "Organize teams with hierarchical structures, manage roles and permissions, and keep everyone aligned on objectives.",
      color: "blue",
      href: "/features/team-management",
    },
    {
      icon: Target,
      title: "Rocks & Quarterly Goals",
      description:
        "Set and track quarterly objectives with milestone tracking. Keep your team focused on what matters most.",
      color: "emerald",
      href: "/features/rocks",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description:
        "Gain deep visibility into team performance with real-time dashboards, trends, and actionable metrics.",
      color: "purple",
      href: "/features/analytics",
    },
    {
      icon: Calendar,
      title: "Integrated Calendar",
      description:
        "Sync deadlines, milestones, and team events. Never miss an important date or deadline again.",
      color: "amber",
      href: "/features/calendar",
    },
    {
      icon: Brain,
      title: "AI Suggestions",
      description:
        "Get intelligent recommendations for task prioritization, resource allocation, and team optimization.",
      color: "pink",
      href: "/features/ai",
    },
  ]

  const colorClasses = {
    red: { bg: "bg-red-50", icon: "text-red-600", hover: "group-hover:bg-red-100" },
    blue: { bg: "bg-blue-50", icon: "text-blue-600", hover: "group-hover:bg-blue-100" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", hover: "group-hover:bg-emerald-100" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", hover: "group-hover:bg-purple-100" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600", hover: "group-hover:bg-amber-100" },
    pink: { bg: "bg-pink-50", icon: "text-pink-600", hover: "group-hover:bg-pink-100" },
  }

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-4"
          >
            <Zap className="w-4 h-4" />
            Powerful Features
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4"
          >
            Everything You Need to
            <br />
            <span className="text-gradient-primary">Manage Your Team</span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            A comprehensive platform designed to streamline accountability, enhance
            communication, and drive results across your organization.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => {
            const colors = colorClasses[feature.color as keyof typeof colorClasses]
            return (
              <motion.div key={feature.title} variants={fadeInUp}>
                <Link
                  href={feature.href}
                  className="group block h-full bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all duration-300"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.hover} flex items-center justify-center mb-4 transition-colors`}
                  >
                    <feature.icon className={`w-6 h-6 ${colors.icon}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Learn more
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

// How It Works Section
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Set Up Your Team",
      description:
        "Create your organization, invite team members, and configure roles and permissions in minutes.",
      icon: Users,
    },
    {
      number: "02",
      title: "Define Your Rocks",
      description:
        "Set quarterly objectives and break them down into actionable milestones for your team.",
      icon: Target,
    },
    {
      number: "03",
      title: "Track Daily Progress",
      description:
        "Team members submit end-of-day reports with AI assistance, keeping everyone accountable.",
      icon: CheckCircle,
    },
    {
      number: "04",
      title: "Analyze & Improve",
      description:
        "Use powerful analytics to identify trends, celebrate wins, and address blockers quickly.",
      icon: BarChart3,
    },
  ]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-4"
          >
            <Clock className="w-4 h-4" />
            Simple Process
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4"
          >
            Get Started in Minutes
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-slate-600 max-w-2xl mx-auto"
          >
            AIMS makes it easy to transform how your team tracks progress and
            achieves goals.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={fadeInUp}
              className="relative text-center"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-red-200 to-red-100" />
              )}

              <div className="relative">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center mb-6">
                  <step.icon className="w-10 h-10 text-red-600" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-600 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                  {step.number.replace("0", "")}
                </div>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "AIMS has transformed how our team communicates. The AI-powered EOD reports save us hours every week and keep everyone aligned.",
      author: "Sarah Chen",
      role: "VP of Engineering",
      company: "TechCorp",
      avatar: "SC",
    },
    {
      quote:
        "The quarterly rocks feature is a game-changer. We've seen a 40% improvement in goal completion since adopting AIMS.",
      author: "Michael Rodriguez",
      role: "COO",
      company: "GrowthCo",
      avatar: "MR",
    },
    {
      quote:
        "Finally, a tool that makes daily standups and accountability feel effortless. Our remote team has never been more connected.",
      author: "Emily Watson",
      role: "Director of Operations",
      company: "RemoteFirst",
      avatar: "EW",
    },
  ]

  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-4"
          >
            <MessageSquare className="w-4 h-4" />
            Testimonials
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
          >
            Loved by Teams Everywhere
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-slate-400 max-w-2xl mx-auto"
          >
            See what leaders are saying about how AIMS has transformed their team
            operations.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.author}
              variants={fadeInUp}
              className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50"
            >
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                &quot;{testimonial.quote}&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-slate-400">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Stats Section
function StatsSection() {
  const stats = [
    { value: "94%", label: "Increase in accountability" },
    { value: "2.5x", label: "Faster goal completion" },
    { value: "500+", label: "Teams using AIMS" },
    { value: "4.9/5", label: "Average satisfaction" },
  ]

  return (
    <section className="py-20 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={scaleIn}
              className="text-center"
            >
              <div className="text-4xl sm:text-5xl font-bold text-red-600 mb-2">
                {stat.value}
              </div>
              <div className="text-slate-600">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-red-500 to-red-600 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium mb-6"
          >
            <Shield className="w-4 h-4" />
            14-day free trial, no credit card required
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6"
          >
            Ready to Transform Your
            <br />
            Team&apos;s Accountability?
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-red-100 max-w-2xl mx-auto mb-10"
          >
            Join hundreds of teams already using AIMS to track progress, achieve
            goals, and build a culture of accountability.
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-red-600 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all"
              >
                Talk to Sales
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// Main Page Component
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LogosSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}
