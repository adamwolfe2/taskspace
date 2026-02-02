"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"
import { InteractiveFeaturesShowcase } from "@/components/marketing/interactive-features-showcase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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

// Interactive Features Showcase Section
function FeaturesShowcaseSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section ref={ref} className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
            All Features
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Try it yourself. Click through all features.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore every tool Taskspace offers with interactive demos. Switch between features to see exactly how each one works.
          </p>
        </div>

        <motion.div
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
        <FeaturesShowcaseSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </div>
  )
}
