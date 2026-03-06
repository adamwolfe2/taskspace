"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

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

export default function AboutPage() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-white pt-20">
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
                Company
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-3xl sm:text-5xl font-bold text-black mb-6"
            >
              About Taskspace
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-base sm:text-xl text-gray-600 leading-relaxed"
            >
              The all-in-one EOS management platform for multi-company founders
              and leadership teams running on the Entrepreneurial Operating System.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="prose prose-lg max-w-none"
          >
            <motion.div variants={fadeInUp} className="space-y-6 text-gray-600">
              <p>
                Taskspace is built for teams running on EOS (the Entrepreneurial Operating System).
                We provide a unified platform that brings together AI-powered EOD reports, quarterly
                rocks tracking, scorecards, Level 10 meetings, the IDS process, and accountability
                charts -- all in one place.
              </p>
              <p>
                Our mission is to help multi-company founders and leadership teams run all their
                organizations in true parallel. With AI-assisted workflows and real-time dashboards,
                Taskspace eliminates the friction of managing multiple teams across multiple companies.
              </p>
              <p>
                Whether you are a Visionary, an Integrator, or a department head, Taskspace gives
                you the tools to execute on the EOS framework with clarity, accountability, and speed.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
    </PageTransition>
  )
}
