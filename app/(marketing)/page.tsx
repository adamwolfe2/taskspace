"use client"

import { motion, useInView } from "framer-motion"
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
  Zap,
  FileText,
  MessageSquare,
  CheckSquare,
  Building2,
  LineChart,
  ListTodo,
  Layers,
  Eye,
  Shuffle,
} from "lucide-react"
import Image from "next/image"
import { InteractiveFeaturesShowcase } from "@/components/marketing/interactive-features-showcase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { integrations, agentUseCases } from "@/lib/integrations-data"

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0,  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

// Hero Section with Interactive Demo
function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="pt-12 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-medium text-black leading-[1.1] mb-6"
          >
            Run All Your Teams.
            <br />
            <span className="text-gray-400">In True Parallel.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl sm:text-2xl text-gray-700 font-medium max-w-4xl mx-auto mb-4 text-center"
          >
            The operating system for ADHD founders.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto mb-10 text-center"
          >
            Taskspace gives your teams the structure and accountability they need — AI handles the organizing, so your brain can stay on what&apos;s next.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4"
          >
            <Link href="/app?page=register">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 px-8 h-12 text-base">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="px-8 h-12 text-base">
                Try demo
              </Button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm text-gray-500 mb-12"
          >
            AI-Workspace Setup in Under Two Minutes.
          </motion.p>
        </div>

        <motion.div
          id="demo"
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <InteractiveFeaturesShowcase />
        </motion.div>
      </div>
    </section>
  )
}

// How It Works - 3 Step Section
function HowItWorksSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const steps = [
    {
      step: "1",
      title: "Lock in 3 priorities per quarter",
      description:
        "Quarterly rocks force every team to pick the 3 things that actually matter. Not 47. Not a wishlist. Three. Everything else waits.",
      icon: Target,
    },
    {
      step: "2",
      title: "Team brain dumps. AI organizes.",
      description:
        "Your team pastes what they worked on. AI turns it into a structured EOD report in seconds — tasks sorted by goal, blockers flagged, tomorrow's priorities set.",
      icon: BarChart3,
    },
    {
      step: "3",
      title: "One dashboard. Every team.",
      description:
        "See the status of every team, every company, in one place — without chasing anyone. Run L10 meetings with agendas that build themselves from real data.",
      icon: LineChart,
    },
  ]

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 mb-4">
              Simple 3-Step Process
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl font-bold text-black mb-4"
          >
            How it works
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl text-gray-600 max-w-2xl mx-auto"
          >
            Minimal friction. Maximum visibility. Built for brains that are already managing too much.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8 lg:gap-12"
        >
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              variants={fadeInUp}
              className="relative text-center"
            >
              {/* Connector line between steps (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-gray-200" />
              )}

              <div className="relative z-10 mx-auto w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5" />
              </div>

              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-black mb-4">
                {item.step}
              </div>

              <h3 className="text-xl font-bold text-black mb-3">{item.title}</h3>
              <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <Link href="/app?page=register">
            <Button size="lg" className="bg-black text-white hover:bg-gray-900 px-8 h-12">
              Start running EOS today
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// Core Features Section - Showcase ALL Features
function CoreFeaturesSection() {
  const coreFeatures = [
    {
      icon: FileText,
      title: "EOD Reports",
      description: "AI-powered end-of-day reports that organize task dumps into structured updates. Track progress, identify blockers, and plan tomorrow's priorities.",
      features: ["AI task organization", "Blocker tracking", "Daily summaries", "Team visibility"],
      href: "/features/eod-reports"
    },
    {
      icon: Target,
      title: "Quarterly Rocks",
      description: "Set and track 90-day goals with milestone-based progress tracking. Keep your team aligned on what matters most each quarter.",
      features: ["90-day goal tracking", "Milestone management", "Progress visualization", "Team alignment"],
      href: "/features/rocks"
    },
    {
      icon: BarChart3,
      title: "Scorecard",
      description: "Weekly measurables dashboard with trend analysis. Track the key metrics that drive your business forward.",
      features: ["Weekly metrics", "Trend analysis", "Custom KPIs", "Automated reporting"],
      href: "/features/scorecard"
    },
    {
      icon: Calendar,
      title: "Level 10 Meetings",
      description: "Run productive 90-minute leadership meetings with structured agendas. Follow the proven EOS meeting format.",
      features: ["Meeting templates", "Agenda management", "Action item tracking", "Meeting history"],
      href: "/features/level-10-meetings"
    },
    {
      icon: Zap,
      title: "IDS Process",
      description: "Identify, Discuss, and Solve issues systematically. Track problems through resolution with structured problem-solving.",
      features: ["Issue identification", "Discussion tracking", "Solution management", "Resolution history"],
      href: "/features/ids-process"
    },
    {
      icon: Building2,
      title: "Accountability Chart",
      description: "Visualize your organization structure with clear roles and responsibilities. Build a culture of accountability.",
      features: ["Org chart builder", "Role definitions", "Responsibility tracking", "Team hierarchy"],
      href: "/features/accountability-chart"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Manage team members, assign roles, and track individual contributions. Build high-performing teams.",
      features: ["Team member profiles", "Role assignments", "Performance tracking", "Manager oversight"],
      href: "/features/team-management"
    },
    {
      icon: Brain,
      title: "AI Agents",
      description: "Intelligent AI assistants that automate routine tasks, analyze data, and provide insights to save time.",
      features: ["Task automation", "Data analysis", "Smart suggestions", "24/7 assistance"],
      href: "/features/ai-agents"
    },
    {
      icon: LineChart,
      title: "Analytics & Insights",
      description: "Real-time dashboards showing team performance, submission rates, and progress trends. Make data-driven decisions.",
      features: ["Real-time dashboards", "Performance metrics", "Custom reports", "Trend analysis"],
      href: "/features/analytics"
    },
    {
      icon: CheckSquare,
      title: "Vision/Traction Organizer",
      description: "Document your company vision and ensure everyone is aligned on core values, focus, and goals.",
      features: ["Vision documentation", "Core values", "10-year target", "3-year picture"],
      href: "/features/vto"
    },
    {
      icon: ListTodo,
      title: "To-Do List & Tasks",
      description: "Kanban-style task management integrated with your rocks and meetings. Track action items to completion.",
      features: ["Kanban boards", "Task assignments", "Due dates", "Priority management"],
      href: "/features/tasks"
    },
    {
      icon: MessageSquare,
      title: "Team Communication",
      description: "Built-in commenting and feedback on reports. Keep all team communication in context.",
      features: ["Inline comments", "@mentions", "Notifications", "Discussion threads"],
      href: "/features/communication"
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div variants={fadeInUp}>
            <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
              Complete EOS Platform
            </Badge>
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-4xl sm:text-5xl font-bold text-black mb-4"
          >
            Everything you need to run on EOS
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-xl text-gray-600 max-w-3xl mx-auto"
          >
            All the tools from the Entrepreneurial Operating System in one integrated platform
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {coreFeatures.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">{feature.title}</h3>
              <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
              <ul className="space-y-2 mb-6">
                {feature.features.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-black flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={feature.href} className="text-sm font-medium text-black hover:text-gray-700 flex items-center gap-1">
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}


// Integrations Section - HyperFX Style
function IntegrationsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-xs font-medium mb-6">
            <span>80+ Integrations</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Integrates with your entire stack
          </h2>
          <p className="text-lg text-gray-600">
            From ad platforms to analytics, and the tools that drive your daily operations.
          </p>
        </motion.div>

        {/* Compact Integration Logos Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="mb-12"
        >
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3">
            {integrations.slice(0, 48).map((integration, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="aspect-square rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:shadow-md hover:scale-105 transition-all group relative"
                title={integration.name}
              >
                <div className="relative w-8 h-8 flex items-center justify-center">
                  <Image
                    src={integration.logo}
                    alt={integration.name}
                    width={32}
                    height={32}
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        // SECURITY: XSS safe - use textContent instead of innerHTML
                        const initials = integration.name.substring(0, 2).toUpperCase()
                        const div = document.createElement('div')
                        div.className = 'text-xs font-semibold text-gray-600'
                        div.textContent = initials // XSS safe - no HTML interpretation
                        parent.appendChild(div)
                      }
                    }}
                  />
                </div>
                {/* Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                  {integration.name}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Link href="/integrations" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black transition-colors">
            View all integrations <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// Agents for Everything Section - HyperFX Style
function AgentsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={fadeInUp}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 text-xs font-medium mb-6">
            <Brain className="w-3.5 h-3.5" />
            <span>AI Agents</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Agents for everything
          </h2>
          <p className="text-lg text-gray-600">
            Start with ready-to-use agents for any type of work imaginable.
          </p>
        </motion.div>

        {/* Use Cases Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {/* Marketing */}
          <motion.div variants={fadeInUp} className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-black mb-6">Marketing</h3>
            <div className="space-y-4">
              {agentUseCases.marketing.map((useCase, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 flex-shrink-0 relative">
                    <Image
                      src={useCase.logo}
                      alt={useCase.title}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-1">{useCase.title}</div>
                    <div className="text-xs text-gray-600">{useCase.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Operations */}
          <motion.div variants={fadeInUp} className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-black mb-6">Operations</h3>
            <div className="space-y-4">
              {agentUseCases.operations.map((useCase, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 flex-shrink-0 relative">
                    <Image
                      src={useCase.logo}
                      alt={useCase.title}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-1">{useCase.title}</div>
                    <div className="text-xs text-gray-600">{useCase.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Sales */}
          <motion.div variants={fadeInUp} className="bg-white rounded-2xl border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-black mb-6">Sales</h3>
            <div className="space-y-4">
              {agentUseCases.sales.map((useCase, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 flex-shrink-0 relative">
                    <Image
                      src={useCase.logo}
                      alt={useCase.title}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-1">{useCase.title}</div>
                    <div className="text-xs text-gray-600">{useCase.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <Link href="/app?page=register">
            <Button size="lg" className="bg-black text-white hover:bg-gray-900">
              Start building with AI agents
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

// ADHD Founders Section
function ADHDFoundersSection() {
  const painPoints = [
    {
      icon: Shuffle,
      problem: "I forget what my team did the moment I switch to the next project.",
      solution: "EOD brain dumps take 90 seconds. AI turns them into structured reports — sorted by goal, blockers flagged, priorities set. You never have to chase anyone for an update.",
    },
    {
      icon: Layers,
      problem: "I've started 40 productivity systems. Finished none.",
      solution: "Start with one feature. EOD reports, rocks, or just a shared dashboard. Add more only when you're ready. Turn off everything you'll never use.",
    },
    {
      icon: Eye,
      problem: "Out of sight, out of mind — and my whole team knows it.",
      solution: "Daily reports keep every team visible without you having to ask. Escalations surface automatically. You stay informed without being in every meeting.",
    },
    {
      icon: Target,
      problem: "47 priorities is actually 0 priorities.",
      solution: "Quarterly rocks force each team to pick 3 things that matter. Not a wishlist. Not a backlog. Three. Everything else waits until next quarter.",
    },
  ]

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-200 bg-white text-slate-500 text-sm mb-6">
            Designed for ADHD Founders
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            You&apos;re wired to run multiple things at once.
            <br />
            <span className="text-slate-400">Most tools punish you for it.</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Taskspace is built around how ADHD founders actually operate — not how productivity gurus think you should.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {painPoints.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 bg-white p-8 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <item.icon className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm italic mb-3">
                    &ldquo;{item.problem}&rdquo;
                  </p>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {item.solution}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Start With What You Need Section
function StartSimpleSection() {
  const paths = [
    {
      label: "Just me",
      title: "Personal accountability",
      description: "You work better with structure but hate rigid systems. Start with EOD reports and quarterly rocks — your own brain dump + 90-day focus, nothing else.",
      features: ["Daily EOD brain dump", "Quarterly rocks", "AI task organizer", "Streak tracking"],
      cta: "Start solo",
    },
    {
      label: "My team",
      title: "One team, full visibility",
      description: "Stop chasing people for updates. Your team submits daily reports, you see everything in one dashboard — who's on track, who's blocked, what needs your attention.",
      features: ["Team EOD reports", "Shared rocks board", "Task assignments", "Escalation alerts"],
      cta: "Manage a team",
      highlight: true,
    },
    {
      label: "Multiple companies",
      title: "Parallel operation",
      description: "You're running 2, 3, 5 companies. Context switching is your entire job. Taskspace gives each entity its own workspace — with one login and one overview dashboard.",
      features: ["Multiple workspaces", "Cross-team dashboard", "Per-company branding", "Unified reporting"],
      cta: "Run multiple companies",
    },
  ]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 mb-4">
            Use only what you need
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Start simple. Scale when you&apos;re ready.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Every feature is optional. Turn on what works for you, ignore the rest. You&apos;re not locked into anyone else&apos;s productivity system.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {paths.map((path, i) => (
            <div
              key={i}
              className={`relative rounded-2xl border-2 p-8 ${
                path.highlight
                  ? "border-slate-900 bg-slate-50 text-slate-900 shadow-lg"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              {path.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-white text-black text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full border border-gray-200">
                    Most common
                  </span>
                </div>
              )}
              <div className={`inline-block text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full mb-4 ${
                path.highlight ? "bg-slate-100 text-slate-500" : "bg-gray-100 text-gray-500"
              }`}>
                {path.label}
              </div>
              <h3 className={`text-xl font-bold mb-3 ${path.highlight ? "text-slate-900" : "text-black"}`}>
                {path.title}
              </h3>
              <p className={`text-sm mb-6 leading-relaxed ${path.highlight ? "text-slate-500" : "text-gray-600"}`}>
                {path.description}
              </p>
              <div className="space-y-2.5 mb-8">
                {path.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 ${path.highlight ? "text-slate-900" : "text-black"}`} />
                    <span className={path.highlight ? "text-slate-600" : "text-gray-700"}>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/app?page=register">
                <button className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors ${
                  path.highlight
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}>
                  {path.cta} <ArrowRight className="inline w-4 h-4 ml-1" />
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


// Final CTA
function CTASection() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black mb-6">
          Ready to stop losing the thread?
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Start with one feature. Add more when you&apos;re ready. Your team stays accountable whether or not you&apos;re watching.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/app?page=register">
            <Button size="lg" className="bg-black text-white hover:bg-gray-900 text-base px-8 h-12">
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/demo">
            <Button size="lg" variant="outline" className="border-gray-300 text-black hover:bg-gray-100 text-base px-8 h-12">
              Try demo
            </Button>
          </Link>
        </div>
        <p className="text-gray-500 mt-6 text-sm">Free forever plan · 14-day free trial on paid plans · Cancel anytime</p>
      </div>
    </section>
  )
}

// Main Page Component
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <ADHDFoundersSection />
      <StartSimpleSection />
      <CoreFeaturesSection />
      <AgentsSection />
      <IntegrationsSection />
      <CTASection />
    </>
  )
}
