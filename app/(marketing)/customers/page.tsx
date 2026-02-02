"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"
import { PageTransition } from "@/components/marketing/page-transition"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0,  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export default function CustomersPage() {
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
    <PageTransition>
    <div className="min-h-screen bg-white pt-20">
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-white text-gray-600 border-gray-200 mb-6">
                Case Studies
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold text-black mb-6"
            >
              The results speak for themselves
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-600 max-w-3xl mx-auto"
            >
              Businesses of all sizes are using Taskspace to automate workflows across marketing,
              sales, and operations—saving thousands of hours and driving measurable growth.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {caseStudies.map((study, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="bg-white rounded-xl p-8 border border-gray-200"
              >
                <div className="text-5xl font-bold text-black mb-2">
                  {study.value}
                </div>
                <div className="text-sm font-medium text-black mb-4">
                  {study.label}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {study.description}
                </p>
                <button className="text-sm font-medium text-black hover:text-gray-700 flex items-center gap-1">
                  Read the Full Story <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
    </PageTransition>
  )
}
