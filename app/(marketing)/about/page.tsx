"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
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
              className="text-5xl font-bold text-black mb-6"
            >
              About Taskspace
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-600 leading-relaxed"
            >
              Intelligent AI agents for Enterprise and Entrepreneurs.
              We're building the future of work automation.
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
                Taskspace is the all-in-one AI platform with agents that connect to your
                tools and partner with humans to drive smarter, faster outcomes.
              </p>
              <p>
                Our mission is to empower teams with AI agents that automate workflows,
                integrate with existing tools, and enable businesses to focus on what matters most.
              </p>
              <p>
                From marketing automation to sales pipeline management, our platform provides
                enterprise-grade security and reliability that scales with your organization.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
    </PageTransition>
  )
}
