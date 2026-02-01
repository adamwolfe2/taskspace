"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Target,
  Users,
  Calendar,
  BarChart3,
  Zap,
  TrendingUp,
  Clock,
  Brain,
  Rocket,
  Shield,
  Play,
  Star,
  X,
  Check,
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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
}

// Top Navigation
function Navigation() {
  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-gradient-to-r from-pink-500 to-orange-500 text-white text-center py-3 text-sm font-medium">
        Introducing EOS AI Agents – Automate your entire EOS process →
      </div>

      {/* Main Navigation */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 bg-white border-b border-slate-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg" />
              <span className="text-xl font-bold text-slate-900">Align</span>
            </div>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center gap-8">
              <button className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                EOS AI ▼
              </button>
              <button className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                Product ▼
              </button>
              <button className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                Solutions ▼
              </button>
              <button className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                Learn ▼
              </button>
              <Link href="#pricing" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                Pricing
              </Link>
            </div>

            {/* Right CTAs */}
            <div className="flex items-center gap-3">
              <Link href="/app">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                  Login
                </Button>
              </Link>
              <Link href="/app?page=register">
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>
    </>
  )
}

// Hero Section
function HeroSection() {
  const [selectedFeature, setSelectedFeature] = useState("EOD Reports")

  const features = [
    "EOD Reports",
    "Rocks",
    "Accountability Chart",
    "Level 10 Meetings",
    "Scorecard",
    "IDS Process",
    "Vision/Traction",
  ]

  return (
    <section className="relative py-20 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Announcement Pills */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="rounded-full px-4 py-1.5 border-slate-300 text-slate-700 font-medium">
                Introducing EOS AI 4.0 →
              </Badge>
              <Badge variant="outline" className="rounded-full px-4 py-1.5 border-slate-300 text-slate-700 font-medium">
                AI Super Agents →
              </Badge>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-6xl lg:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6">
                Software that
                <br />
                <span className="text-slate-400">replaces all software</span>
              </h1>
            </div>

            {/* Value Props */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-slate-900 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">Save money.</span>
                  <span className="text-slate-600"> All Apps, AI, EOD Reports, Rocks + 20 more</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-slate-900 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">Save time.</span>
                  <span className="text-slate-600"> All humans working together with perfect context</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-slate-900 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900">Create infinite productivity.</span>
                  <span className="text-slate-600"> AI Agents & EOS Workflows</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Link href="/app?page=register">
                <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-8 h-14 text-base font-semibold">
                  Get started. It's FREE!
                </Button>
              </Link>
              <p className="text-sm text-slate-500">
                Free forever.
                <br />
                No credit card.
              </p>
            </div>

            {/* Feature Tabs */}
            <div className="pt-6">
              <p className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">
                GET 400% MORE DONE • RUN ON EOS
              </p>
              <div className="flex flex-wrap gap-2">
                {features.map((feature) => (
                  <button
                    key={feature}
                    onClick={() => setSelectedFeature(feature)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all",
                      selectedFeature === feature
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 text-slate-700 hover:border-slate-400"
                    )}
                  >
                    {selectedFeature === feature && <Check className="inline-block w-4 h-4 mr-1" />}
                    {feature}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Product Demo */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-slate-500 text-center">
                    app.getalign.io
                  </div>
                </div>
              </div>

              {/* Product UI */}
              <div className="flex h-[500px]">
                {/* Sidebar */}
                <div className="w-16 bg-slate-900 flex flex-col items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600" />
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="w-10 h-10 rounded-lg hover:bg-white/5 flex items-center justify-center">
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="w-10 h-10 rounded-lg hover:bg-white/5 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="w-10 h-10 rounded-lg hover:bg-white/5 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-slate-50 p-6 overflow-auto">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Marketing</h3>
                        <p className="text-sm text-slate-500">Q1 2026 Rocks</p>
                      </div>
                      <Badge className="bg-emerald-500 text-white">On Track</Badge>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-2">
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <Badge className="bg-emerald-500 text-white text-xs">DONE</Badge>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">Social campaign</p>
                          </div>
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white" />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <Badge className="bg-blue-500 text-white text-xs">IN PROGRESS</Badge>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">Website assets</p>
                            <p className="text-sm text-slate-500">2 subtasks</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-white" />
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <Badge variant="outline" className="text-xs">TODO</Badge>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">Q2 Planning</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Social Proof Bar
function SocialProofBar() {
  const logos = ["Amazon", "NVIDIA", "Wayfair", "Verizon", "Spotify", "Harvard"]

  return (
    <section className="py-12 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-slate-500 mb-8 uppercase tracking-wider">
          TRUSTED BY THE BEST
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale">
          {logos.map((logo) => (
            <div key={logo} className="text-2xl font-bold text-slate-900">
              {logo}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Problem Statement Section
function ProblemSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-4">
            60% of work is lost in context – and AI is lost without it.
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Work Sprawl is killing context and destroying productivity.
          </p>
        </div>

        {/* Problem Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            className="bg-white rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <X className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Context Switching</h3>
            <p className="text-slate-600">
              Digital fatigue reduces employee performance by{" "}
              <span className="font-bold text-slate-900">up to 32%</span>
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <X className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Context Missing</h3>
            <p className="text-slate-600">
              <span className="font-bold text-slate-900">96% of companies</span> fail in AI value & adoption
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Context Stitching</h3>
            <p className="text-slate-600">
              <span className="font-bold text-slate-900">2.5 hours daily</span> wasted searching & stitching context
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// All Apps Grid Section
function AllAppsSection() {
  const smallFeatures = [
    { name: "EOD Reports", icon: BarChart3 },
    { name: "Rocks", icon: Target },
    { name: "Scorecard", icon: TrendingUp },
    { name: "IDS Process", icon: Zap },
    { name: "Level 10", icon: Calendar },
    { name: "People", icon: Users },
    { name: "V/TO", icon: Rocket },
    { name: "Analytics", icon: BarChart3 },
  ]

  const largeFeatures = [
    { name: "Accountability", color: "from-blue-500 to-blue-600" },
    { name: "EOS AI", color: "from-purple-500 to-purple-600" },
    { name: "Meetings", color: "from-emerald-500 to-emerald-600" },
    { name: "Dashboard", color: "from-orange-500 to-orange-600" },
  ]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-4">
            All apps, AI Agents, and humans in Align.
          </h2>
          <p className="text-xl text-slate-600">
            15+ products to replace fragmented software & maximize EOS execution.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-6 gap-4">
          {/* Small features */}
          {smallFeatures.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.button
                key={feature.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="aspect-square bg-slate-50 hover:bg-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all hover:shadow-lg border border-slate-200"
              >
                <Icon className="w-6 h-6 text-slate-600" />
                <span className="text-xs font-medium text-slate-900">{feature.name}</span>
              </motion.button>
            )
          })}

          {/* Large features */}
          {largeFeatures.map((feature, i) => (
            <motion.button
              key={feature.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (smallFeatures.length + i) * 0.05 }}
              className={cn(
                "col-span-2 row-span-2 rounded-2xl p-8 flex flex-col items-center justify-center transition-all hover:shadow-2xl text-white bg-gradient-to-br",
                feature.color
              )}
            >
              <span className="text-2xl font-bold">{feature.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  )
}

// ROI Stats Section
function ROISection() {
  const stats = [
    { label: "ROI", value: "384%", description: "Align delivered 384% ROI over three years" },
    { label: "TIME SAVED", value: "20hrs", description: "Organizations save 20 hours per week with EOS AI" },
    { label: "FASTER EXECUTION", value: "2.5x", description: "Teams execute rocks 2.5x faster with Align" },
    { label: "PAYBACK", value: "<6 mo", description: "Customers reached payback in under six months" },
  ]

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-slate-900 mb-4">
            It's like adding 15 full-time employees
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            According to third party research, Align saves the average company over 30k hours per year,
            and delivers industry-leading ROI.
          </p>
          <Link href="/app?page=register">
            <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-8">
              Get started
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-8 text-center"
            >
              <p className="text-sm font-semibold text-purple-600 mb-3 uppercase tracking-wider">{stat.label}</p>
              <p className="text-5xl font-bold text-slate-900 mb-4">{stat.value}</p>
              <p className="text-slate-600">{stat.description}</p>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          *from 2025 The Total Economic Impact™ of Align report from Forrester Group.
        </p>
      </div>
    </section>
  )
}

// Testimonials Section
function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Align is serving us so we can execute on EOS flawlessly. Game changer for our leadership team.",
      author: "Sarah Chen",
      role: "Integrator",
      company: "TechCorp",
    },
    {
      quote: "The AI EOD parsing is magic. My team actually enjoys submitting updates instead of dreading check-ins.",
      author: "Michael Rodriguez",
      role: "Visionary",
      company: "StartupXYZ",
    },
    {
      quote: "We hit our quarterly rocks 2.5x faster after adopting Align. The accountability is unmatched.",
      author: "Emily Watson",
      role: "CEO",
      company: "GrowthLabs",
    },
  ]

  return (
    <section className="py-24 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="bg-white/10 text-white border-white/20 mb-4">
            <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
            Loved by Teams
          </Badge>
          <h2 className="text-5xl font-bold text-white mb-4">
            Loved by 10,000+ teams, backed by 100+ awards
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scaleIn}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-white/90 mb-6 leading-relaxed">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-white/60">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Enterprise Section
function EnterpriseSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-slate-900 mb-4">Enterprise-grade everything</h2>
          <p className="text-xl text-slate-600">
            Out of the box security & AI that's even more private than ChatGPT¹
          </p>
        </div>

        <div className="flex items-center justify-center gap-12">
          <div className="space-y-4 text-center">
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">99.99% uptime</Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">24/7 support</Badge>
          </div>

          <div className="flex items-center gap-8 opacity-60 grayscale">
            <div className="text-center">
              <p className="text-sm font-semibold">SOC 2 TYPE II</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">ISO 27001</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">GDPR</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">HIPAA</p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-8">
          1. Our agreements ensure zero data training & retention on all third-party model providers
        </p>
      </div>
    </section>
  )
}

// Final CTA Section
function FinalCTASection() {
  return (
    <section className="relative py-24 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl mx-auto mb-8" />
          </motion.div>

          <motion.h2 variants={fadeInUp} className="text-5xl lg:text-6xl font-bold text-white mb-6">
            Save 6-7 days every week.
          </motion.h2>

          <motion.div variants={fadeInUp}>
            <Link href="/app?page=register">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-8 h-14 text-base font-semibold">
                Get started FREE
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
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
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg" />
              <span className="text-xl font-bold">Align</span>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Transform your EOS execution with AI-powered accountability.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">EOS AI</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  EOD Agent
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Rock Agent
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Scorecard Agent
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  EOD Reports
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Rocks
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Scorecard
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Level 10 Meetings
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Customers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Help</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  24/7 Support
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Get a Demo
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Community
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div>© 2026 Align. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Security
            </a>
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
      <Navigation />
      <HeroSection />
      <SocialProofBar />
      <ProblemSection />
      <AllAppsSection />
      <ROISection />
      <TestimonialsSection />
      <EnterpriseSection />
      <FinalCTASection />
      <Footer />
    </>
  )
}
