"use client"

import { motion, useInView, AnimatePresence } from "framer-motion"
import { useRef, useState } from "react"
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
  Zap,
  Clock,
  TrendingUp,
} from "lucide-react"
import { DemoEODForm } from "@/components/marketing/demo-eod-form"
import { DemoRocks } from "@/components/marketing/demo-rocks"
import { DemoScorecard } from "@/components/marketing/demo-scorecard"
import { DemoLevel10 } from "@/components/marketing/demo-level10"
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
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [selectedFeature, setSelectedFeature] = useState("automate")

  const features = [
    { id: "automate", label: "Automate" },
    { id: "create", label: "Create" },
    { id: "agents", label: "Agents" },
    { id: "workflows", label: "Workflows" },
  ]

  return (
    <section ref={ref} className="relative pt-24 pb-12 overflow-hidden bg-white">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-12">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm mb-6"
          >
            <span>Platform</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-black leading-[1.1] mb-6"
          >
            Everything you need to build your AI workforce — from integrations to enterprise-grade security.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-10"
          >
            Align is the all-in-one AI platform with agents that connect to your
            tools and partner with humans to drive smarter, faster outcomes.
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
              <span>All AI models</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Image and video generation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Data privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Built-in tools</span>
            </div>
          </div>
        </div>

        {/* Integration Icons Grid */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-4">
            {[...Array(45)].map((_, i) => (
              <div key={i} className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:shadow-md transition-shadow">
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/integrations" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-black">
              View all integrations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Feature Tabs */}
        <div className="flex items-center justify-center border-b border-gray-200 mb-0">
          <div className="inline-flex items-center gap-8">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature.id)}
                className={cn(
                  "px-1 py-4 text-sm font-medium transition-colors relative",
                  selectedFeature === feature.id
                    ? "text-black"
                    : "text-gray-600 hover:text-black"
                )}
              >
                {feature.label}
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
          {/* Sage green container */}
          <div className="bg-[#8b9a7f] rounded-2xl p-8 sm:p-12">
            {/* Browser Frame */}
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                  <div className="w-3 h-3 rounded-full bg-gray-300" />
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-1 rounded-md bg-white border border-gray-200">
                    <span className="text-xs text-gray-500">Chat</span>
                  </div>
                </div>
              </div>

              {/* Demo Content */}
              <div className="bg-white p-8 min-h-[500px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedFeature}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-2xl mx-auto"
                  >
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-black mb-2">
                        {selectedFeature === "automate" && "Automate anything with AI"}
                        {selectedFeature === "create" && "Create workflows that work"}
                        {selectedFeature === "agents" && "AI agents that never sleep"}
                        {selectedFeature === "workflows" && "Build complex automations"}
                      </h3>
                      <p className="text-gray-600">
                        {selectedFeature === "automate" && "Analyze performance month-over-month across all channels. Surface the key numbers, insights, and recommended actions. Email the report to my team."}
                        {selectedFeature === "create" && "Speak workflows into existence with a prompt."}
                        {selectedFeature === "agents" && "Give them instructions, knowledge bases, and assign them tasks."}
                        {selectedFeature === "workflows" && "Connect multiple steps, add conditional logic, and orchestrate your automations."}
                      </p>
                    </div>
                    {selectedFeature === "automate" && <DemoRocks />}
                    {selectedFeature === "create" && <DemoEODForm />}
                    {selectedFeature === "agents" && <DemoScorecard />}
                    {selectedFeature === "workflows" && <DemoLevel10 />}
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

// Use Cases Section
function UseCasesSection() {
  const useCases = [
    {
      title: "Sales",
      description: "Find prospects and automate personalized outreach. Enrich contacts, manage pipelines, and close deals.",
      tasks: [
        "Define ICP and find prospects",
        "Create personalized email sequences",
        "Enrich CRM with latest data",
        "Prepare for sales calls",
        "Track outreach performance"
      ]
    },
    {
      title: "Content Pipelines",
      description: "Create content at scale for any channel. Automate production, distribution, and performance optimization.",
      tasks: [
        "Track content performance",
        "Draft email responses",
        "Build website and find leads",
        "Research and build outreach plan",
        "Generate marketing reports"
      ]
    },
    {
      title: "Analytics",
      description: "Transform data into actionable dashboards with reporting.",
      tasks: [
        "Review traffic and conversions",
        "Generate revenue forecasts",
        "Generate marketing analytics",
        "Analyze Meta, Google Ads data",
        "Track campaign metrics"
      ]
    }
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            Use Cases
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Agents for everything
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mb-8">
            Start with ready-to-use templates or create custom agents for any type of work imaginable.
          </p>
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
              <div className="space-y-3 mb-6">
                {useCase.tasks.map((task, j) => (
                  <div key={j} className="flex items-start gap-3 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 bg-gray-400 rounded-full" />
                      </div>
                      <span>{task}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/templates" className="text-sm font-medium text-black hover:text-gray-700 flex items-center gap-1">
                View {useCase.title} Templates <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Stats Section
function StatsSection() {
  const caseStudies = [
    {
      value: "97%",
      label: "Time savings on reporting",
      description: "Marketing team automated cross-platform reporting from GA4, Meta, Google Ads, and TikTok—and accelerated time to create, setup, and launch campaigns by 30x."
    },
    {
      value: "10 hrs",
      label: "Saved per employee weekly",
      description: "Enterprise sales team automated follow-up emails, calendar syncing to Salesforce, and meeting briefs. Saved 10 hours per employee weekly."
    },
    {
      value: "45%",
      label: "Revenue growth",
      description: "Local business with no prior ad experience automated Meta and Google ad campaigns. Attributed 45% revenue increase in 3 months."
    }
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            Case Studies
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            The results speak for themselves
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mb-6">
            Businesses of all sizes are using Align to automate workflows across marketing,
            sales, and operations—saving thousands of hours and driving measurable growth.
          </p>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-900 text-sm font-medium">
            All Customer Stories
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {caseStudies.map((study, i) => (
            <div key={i} className="bg-white rounded-xl p-8 border border-gray-200">
              <div className="text-5xl font-bold text-black mb-2">
                {study.value}
              </div>
              <div className="text-sm font-medium text-black mb-4">
                {study.label}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {study.description}
              </p>
              <button className="mt-6 text-sm font-medium text-black hover:text-gray-700 flex items-center gap-1">
                Read the Full Story <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Integrations Section
function IntegrationsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            80+ Integrations
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-6 max-w-5xl mx-auto">
            Integrates with your entire marketing stack,{" "}
            <span className="text-gray-500">from ad platforms to analytics, and the tools that drive your daily operations.</span>
          </h2>
        </div>

        {/* Integration Icons */}
        <div className="mb-12">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-14 gap-4 mb-4">
            {[...Array(28)].map((_, i) => (
              <div key={i} className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:shadow-md transition-shadow">
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/integrations" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-black">
              View all integrations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">AI agents</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">Workflow automations</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">Connects to your data</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">80+ integrations</h3>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid md:grid-cols-4 gap-6 mt-6">
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">Built-in SEO & SERP data</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">Image & video generation</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">Enterprise-grade security</h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-black" />
            </div>
            <h3 className="font-semibold text-black mb-2">Human-in-the-loop</h3>
          </div>
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
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.h2 variants={fadeInUp} className="text-5xl sm:text-6xl font-bold text-black mb-6">
            Everyone's talking about AI.
            <br />
            Give your team the tool to use it.
          </motion.h2>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link href="/app?page=register">
              <Button size="lg" className="bg-black text-white hover:bg-gray-900 text-base px-8 h-12">
                Start for free
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-gray-200 hover:bg-white text-black text-base px-8 h-12">
                Talk to sales
              </Button>
            </Link>
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
      <UseCasesSection />
      <StatsSection />
      <IntegrationsSection />
      <CTASection />
    </>
  )
}
