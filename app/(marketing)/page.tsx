"use client"

import { motion, useInView, AnimatePresence } from "framer-motion"
import { useRef, useState } from "react"
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
  Sparkles,
  Building2,
  LineChart,
  ListTodo,
  Plug,
} from "lucide-react"
import Image from "next/image"
import { DemoEODForm } from "@/components/marketing/demo-eod-form"
import { DemoRocks } from "@/components/marketing/demo-rocks"
import { DemoScorecard } from "@/components/marketing/demo-scorecard"
import { DemoLevel10 } from "@/components/marketing/demo-level10"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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

// Hero Section
function HeroSection() {
  return (
    <section className="relative pt-24 pb-12 overflow-hidden bg-white">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-12">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span>EOS Management Platform</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-black leading-[1.1] mb-6"
          >
            Run your business on EOS with Taskspace
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-10"
          >
            The all-in-one platform for implementing the Entrepreneurial Operating System.
            Manage teams, track rocks, run Level 10 meetings, and drive accountability.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/app?page=register">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 text-base px-8 h-12">
                Start for free
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-gray-200 hover:bg-gray-50 text-black text-base px-8 h-12">
                Book a demo
              </Button>
            </Link>
          </motion.div>

          {/* Feature Checkmarks */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>AI-powered tools</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Full EOS toolkit</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Team collaboration</span>
            </div>
          </div>
        </div>
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
      href: "/features/analytics"
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
      href: "/features"
    },
    {
      icon: ListTodo,
      title: "To-Do List & Tasks",
      description: "Kanban-style task management integrated with your rocks and meetings. Track action items to completion.",
      features: ["Kanban boards", "Task assignments", "Due dates", "Priority management"],
      href: "/features"
    },
    {
      icon: MessageSquare,
      title: "Team Communication",
      description: "Built-in commenting and feedback on reports. Keep all team communication in context.",
      features: ["Inline comments", "@mentions", "Notifications", "Discussion threads"],
      href: "/features"
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

// Feature Demo Section
function FeatureDemoSection() {
  const [selectedFeature, setSelectedFeature] = useState("rocks")
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const features = [
    { id: "rocks", label: "Rocks", component: DemoRocks },
    { id: "eod", label: "EOD Reports", component: DemoEODForm },
    { id: "scorecard", label: "Scorecard", component: DemoScorecard },
    { id: "level10", label: "Level 10", component: DemoLevel10 },
  ]

  const SelectedComponent = features.find(f => f.id === selectedFeature)?.component || DemoRocks

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            Interactive Demo
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            See Taskspace in action
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Try our core features with interactive demos
          </p>
        </div>

        {/* Feature Tabs - 2 rows on mobile, single row on desktop */}
        <div className="flex items-center justify-center border-b border-gray-200 mb-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-8 w-full max-w-3xl sm:flex sm:flex-row sm:w-auto">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature.id)}
                className={cn(
                  "px-3 py-4 text-sm font-medium transition-colors relative whitespace-nowrap text-center",
                  selectedFeature === feature.id
                    ? "text-black"
                    : "text-gray-600 hover:text-black"
                )}
              >
                <span className="block">{feature.label}</span>
                {selectedFeature === feature.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Demo - Sage Green Background */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12">
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                </div>
              </div>

              <div className="bg-white p-8 min-h-[500px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedFeature}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SelectedComponent />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
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
                        const initials = integration.name.substring(0, 2).toUpperCase()
                        parent.innerHTML = `<div class="text-xs font-semibold text-gray-600">${initials}</div>`
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
                  <span className="text-xl flex-shrink-0">{useCase.icon}</span>
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
                  <span className="text-xl flex-shrink-0">{useCase.icon}</span>
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
                  <span className="text-xl flex-shrink-0">{useCase.icon}</span>
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

// Use Cases Section
function UseCasesSection() {
  const useCases = [
    {
      title: "Leadership Teams",
      description: "Run effective L10 meetings, track leadership scorecard, and align on vision.",
      features: ["Level 10 meetings", "Leadership scorecard", "VTO alignment", "Quarterly rock reviews"]
    },
    {
      title: "Department Heads",
      description: "Manage team rocks, track departmental metrics, and solve issues with IDS.",
      features: ["Department rocks", "Team scorecards", "IDS process", "Accountability tracking"]
    },
    {
      title: "Entire Organization",
      description: "Cascade goals, maintain accountability, and drive execution company-wide.",
      features: ["Company-wide rocks", "Org-wide metrics", "Team collaboration", "Full visibility"]
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            Built for Teams
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            EOS for every level of your organization
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {useCases.map((useCase, i) => (
            <div
              key={i}
              className="relative bg-white rounded-2xl border-2 border-gray-200 p-8 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-xl font-bold text-black mb-2">
                {useCase.title}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {useCase.description}
              </p>
              <div className="space-y-3">
                {useCase.features.map((feature, j) => (
                  <div key={j} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-black flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Stats/Social Proof
function StatsSection() {
  const stats = [
    { value: "5,000+", label: "Teams running on EOS" },
    { value: "50,000+", label: "Rocks tracked quarterly" },
    { value: "20+", label: "Hours saved per week" },
    { value: "98%", label: "Team satisfaction" },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i}>
              <div className="text-5xl font-bold text-black mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
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
        <h2 className="text-5xl sm:text-6xl font-bold text-black mb-6">
          Ready to run your business on EOS?
        </h2>
        <p className="text-xl text-gray-600 mb-10">
          Join thousands of companies using Taskspace to implement the Entrepreneurial Operating System
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/app?page=register">
            <Button size="lg" className="bg-black text-white hover:bg-gray-900 text-base px-8 h-12">
              Start for free
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="border-gray-200 hover:bg-white text-black text-base px-8 h-12">
              View pricing
            </Button>
          </Link>
        </div>
        <p className="text-gray-600 mt-6 text-sm">Free forever plan • No credit card required</p>
      </div>
    </section>
  )
}

// Main Page Component
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CoreFeaturesSection />
      <FeatureDemoSection />
      <AgentsSection />
      <IntegrationsSection />
      <UseCasesSection />
      <StatsSection />
      <CTASection />
    </>
  )
}
