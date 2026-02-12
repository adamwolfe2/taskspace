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

export default function PrivacyPage() {
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
                  Legal
                </Badge>
              </motion.div>
              <motion.h1
                variants={fadeInUp}
                className="text-5xl font-bold text-black mb-6"
              >
                Privacy Policy
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="text-sm text-gray-400"
              >
                Last updated: February 12, 2025
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
                  Privacy Policy coming soon. For questions, contact{" "}
                  <a
                    href="mailto:team@collectivecapital.com"
                    className="text-black underline hover:text-gray-700 transition-colors"
                  >
                    team@collectivecapital.com
                  </a>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
