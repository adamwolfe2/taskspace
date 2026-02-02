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
  LineChart,
  ListTodo,
  Sparkles,
  Shield,
} from "lucide-react"
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

// Navigation
function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black" />
            <span className="text-xl font-bold text-black">Taskspace</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Pricing
            </Link>
            <Link href="/customers" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Customers
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/app">
              <Button variant="ghost" size="sm" className="text-black hover:bg-gray-100">
                Log in
              </Button>
            </Link>
            <Link href="/app?page=register">
              <Button size="sm" className="bg-black text-white hover:bg-gray-900">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
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

// All Features Section
function AllFeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: "EOD Reports",
      description: "AI-powered end-of-day reports that organize task dumps into structured updates.",
    },
    {
      icon: Target,
      title: "Rocks",
      description: "Set and track 90-day goals with milestone-based progress tracking.",
    },
    {
      icon: BarChart3,
      title: "Scorecard",
      description: "Weekly measurables dashboard with trend analysis and KPI tracking.",
    },
    {
      icon: Zap,
      title: "IDS Process",
      description: "Identify, Discuss, and Solve issues systematically with structured problem-solving.",
    },
    {
      icon: Calendar,
      title: "Level 10",
      description: "Run productive 90-minute leadership meetings with structured agendas.",
    },
    {
      icon: Users,
      title: "People",
      description: "Team member profiles, role assignments, and performance tracking.",
    },
    {
      icon: Building2,
      title: "VTO",
      description: "Vision/Traction Organizer for documenting company vision and alignment.",
    },
    {
      icon: LineChart,
      title: "Analytics",
      description: "Real-time dashboards showing team performance and progress trends.",
    },
    {
      icon: MessageSquare,
      title: "Meetings",
      description: "Structured meeting templates and agendas for all EOS meetings.",
    },
    {
      icon: Building2,
      title: "Accountability",
      description: "Accountability Chart for visualizing organization structure and roles.",
    },
    {
      icon: Brain,
      title: "EOS AI",
      description: "AI agents that automate routine tasks and provide intelligent insights.",
    },
    {
      icon: ListTodo,
      title: "Dashboard",
      description: "Unified dashboard for all your EOS tools and team visibility.",
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            All apps, AI Agents, and humans in Taskspace.
          </h2>
          <p className="text-xl text-gray-600">
            15+ products to replace fragmented software & maximize EOS execution.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-lg font-bold text-black mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/features">
            <Button className="bg-black text-white hover:bg-gray-900">
              Explore all features
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

// Stats Section
function StatsSection() {
  const stats = [
    { value: "60%", label: "of work is lost in context" },
    { value: "96%", label: "of companies fail in AI value & adoption" },
    { value: "2.5 hrs", label: "daily wasted searching & stitching context" },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-6">
            60% of work is lost in context – and AI is lost without it.
          </h2>
          <p className="text-xl text-gray-600">
            Work Sprawl is killing context and destroying productivity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-5xl font-bold text-black mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// CTA Section
function CTASection() {
  return (
    <section className="py-32 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-5xl sm:text-6xl font-bold text-black mb-6">
          GET 400% MORE DONE • RUN ON EOS
        </h2>
        <p className="text-xl text-gray-600 mb-10">
          Join thousands of companies using Taskspace to implement EOS
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
      <Navigation />
      <HeroSection />
      <AllFeaturesSection />
      <StatsSection />
      <CTASection />
    </div>
  )
}
