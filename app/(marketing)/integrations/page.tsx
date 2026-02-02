"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle } from "lucide-react"
import Link from "next/link"

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

export default function IntegrationsPage() {
  return (
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
                80+ Integrations
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold text-black mb-6"
            >
              Integrates with your entire stack
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-600 max-w-3xl mx-auto"
            >
              From ad platforms to analytics, and the tools that drive your daily operations.
            </motion.p>
          </motion.div>

          {/* Integration Icons Grid */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mb-16"
          >
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-4">
              {[...Array(60)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:shadow-md transition-shadow"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/contact" className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-black">
                Request an integration <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Feature Grid */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-6"
          >
            <motion.div variants={fadeInUp} className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">AI agents</h3>
              <p className="text-sm text-gray-600">Autonomous AI that works 24/7</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">Workflow automations</h3>
              <p className="text-sm text-gray-600">Build automations with logic</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">Connects to your data</h3>
              <p className="text-sm text-gray-600">Access all your business data</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="bg-gray-50 rounded-xl p-6">
              <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-semibold text-black mb-2">Enterprise-grade security</h3>
              <p className="text-sm text-gray-600">SOC 2 compliant and secure</p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
