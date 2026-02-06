"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  FileText,
  Target,
  BarChart3,
  Calendar,
  AlertCircle,
  Network,
  Mail,
} from "lucide-react"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const helpTopics = [
  {
    icon: FileText,
    title: "EOD Reports",
    description: "Learn how to submit daily reports, use AI organization, and track blockers.",
    href: "/features/eod-reports",
  },
  {
    icon: Target,
    title: "Quarterly Rocks",
    description: "Set up 90-day goals, track milestones, and monitor progress across teams.",
    href: "/features/rocks",
  },
  {
    icon: BarChart3,
    title: "Scorecard & Metrics",
    description: "Define measurables, set targets, and track weekly trends for your team.",
    href: "/features/scorecard",
  },
  {
    icon: Calendar,
    title: "Level 10 Meetings",
    description: "Run structured 90-minute meetings with auto-populated agendas.",
    href: "/features/level-10-meetings",
  },
  {
    icon: AlertCircle,
    title: "IDS Process",
    description: "Identify, Discuss, and Solve issues with the structured EOS framework.",
    href: "/features/ids-process",
  },
  {
    icon: Network,
    title: "Accountability Chart",
    description: "Build your org structure with clear seats, roles, and responsibilities.",
    href: "/features/accountability-chart",
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Hero */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-white text-gray-600 border-gray-200 mb-6">
                Help & Resources
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold text-black mb-6"
            >
              How can we help?
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-600 mb-10"
            >
              Get started with Taskspace and explore our EOS tools. Each feature page includes
              interactive demos and detailed walkthroughs.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Help Topics Grid */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
          >
            {helpTopics.map((topic) => (
              <motion.div key={topic.title} variants={fadeInUp}>
                <Link
                  href={topic.href}
                  className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-gray-300 transition-all h-full"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                    <topic.icon className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="text-lg font-semibold text-black mb-2">{topic.title}</h3>
                  <p className="text-sm text-gray-600">{topic.description}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Contact CTA */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center bg-gray-50 rounded-2xl p-12 border border-gray-200"
          >
            <motion.div variants={fadeInUp}>
              <Mail className="w-8 h-8 text-black mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-black mb-3">Still need help?</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Our team is here to help you get the most out of Taskspace.
                Reach out and we will get back to you promptly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/contact">
                  <Button className="bg-black text-white hover:bg-gray-900 px-6">
                    Contact Support
                  </Button>
                </Link>
                <Link href="/app?page=register">
                  <Button variant="outline" className="border-gray-300 text-black hover:bg-gray-100 px-6">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
