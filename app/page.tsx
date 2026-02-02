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
  Building2,
  Sparkles,
  Shield,
  ListTodo,
} from "lucide-react"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"
import { DemoEODForm } from "@/components/marketing/demo-eod-form"
import { DemoRocks } from "@/components/marketing/demo-rocks"
import { DemoScorecard } from "@/components/marketing/demo-scorecard"
import { DemoLevel10 } from "@/components/marketing/demo-level10"
import { DemoIDS } from "@/components/marketing/demo-ids"
import { DemoAccountabilityChart } from "@/components/marketing/demo-accountability-chart"
import { DemoVTO } from "@/components/marketing/demo-vto"
import { DemoKanban } from "@/components/marketing/demo-kanban"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
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
    <section className="relative pt-24 pb-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm mb-6"
          >
            <Sparkles className="w-4 h-4" />
            <span>EOS Management Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-black leading-[1.1] mb-6"
          >
            Software that replaces all software
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-10"
          >
            All the tools you need to run your business on EOS. AI Agents + EOS Workflows to get 400% more done.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link href="/app?page=register">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 px-8 h-12">
                Get started. It's FREE!
              </Button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-600"
          >
            Free forever. No credit card.
          </motion.p>
        </div>

        {/* Feature Badges */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="flex flex-wrap items-center justify-center gap-4 mb-16"
        >
          {[
            "EOD Reports",
            "Rocks",
            "Accountability Chart",
            "Level 10 Meetings",
            "Scorecard",
            "IDS Process",
            "Vision/Traction",
          ].map((feature, i) => (
            <motion.div
              key={feature}
              variants={fadeInUp}
              className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700"
            >
              ✓ {feature}
            </motion.div>
          ))}
        </motion.div>

        {/* Trusted By */}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
            TRUSTED BY THE BEST
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50">
            {["Amazon", "NVIDIA", "Wayfair", "Verizon", "Spotify", "Harvard"].map((company) => (
              <div key={company} className="text-xl font-bold text-gray-400">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Interactive Demo Section - EOD Reports
function EODReportDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <FileText className="w-4 h-4 mr-1" />
            EOD Reports
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            AI-powered end-of-day reports
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Paste your daily task dump. AI instantly organizes it by your rocks, identifies blockers, and creates a structured report.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoEODForm />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Demo Section - Rocks
function RocksDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <Target className="w-4 h-4 mr-1" />
            Quarterly Rocks
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            90-day goals that actually get done
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Set 3-7 quarterly goals. Track progress with interactive sliders, manage milestones, and see real-time status.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoRocks />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Demo Section - Scorecard
function ScorecardDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <BarChart3 className="w-4 h-4 mr-1" />
            Scorecard
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Track weekly measurables
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Monitor key metrics week-over-week with trend analysis and real-time updates.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoScorecard />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Demo Section - Level 10
function Level10Demo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <Calendar className="w-4 h-4 mr-1" />
            Level 10 Meetings
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Run productive leadership meetings
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Structured 90-minute meeting agendas with segues, scorecards, rocks review, and IDS.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoLevel10 />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Demo Section - IDS
function IDSDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <Zap className="w-4 h-4 mr-1" />
            IDS Process
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Identify, Discuss, Solve issues
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Track problems through resolution with structured problem-solving methodology.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoIDS />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Demo Section - Accountability Chart
function AccountabilityChartDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <Building2 className="w-4 h-4 mr-1" />
            Accountability Chart
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Visualize your organization
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Build org charts with clear roles and responsibilities. Create a culture of accountability.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoAccountabilityChart />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Demo Section - VTO
function VTODemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <Sparkles className="w-4 h-4 mr-1" />
            Vision/Traction Organizer
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Document your company vision
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Align everyone on core values, focus, and long-term goals with the V/TO framework.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoVTO />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// Interactive Demo Section - Kanban
function KanbanDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            <ListTodo className="w-4 h-4 mr-1" />
            Task Management
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Kanban boards for your tasks
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Drag-and-drop task management linked to your rocks. Track action items to completion.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12"
        >
          <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="bg-white p-8">
              <DemoKanban />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection() {
  return (
    <section className="py-32 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl sm:text-6xl font-bold text-black mb-6">
          Ready to run your business on EOS?
        </h2>
        <p className="text-xl text-gray-600 mb-10">
          Join thousands of companies using Taskspace to implement the Entrepreneurial Operating System
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/app?page=register">
            <Button size="lg" className="bg-black text-white hover:bg-gray-900 px-8 h-12">
              Get started. It's FREE!
            </Button>
          </Link>
        </div>
        <p className="text-gray-600 mt-6 text-sm">Free forever. No credit card.</p>
      </div>
    </section>
  )
}

// Main Page
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MegaMenu />
      <main>
        <HeroSection />
        <EODReportDemo />
        <RocksDemo />
        <ScorecardDemo />
        <Level10Demo />
        <IDSDemo />
        <AccountabilityChartDemo />
        <VTODemo />
        <KanbanDemo />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  )
}
