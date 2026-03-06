"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { integrations } from "@/lib/integrations-data"

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
              className="text-3xl sm:text-5xl font-bold text-black mb-6"
            >
              Integrates with your entire stack
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto"
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
              {integrations.map((integration, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:shadow-md hover:scale-105 transition-all group relative"
                  title={integration.name}
                >
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <Image
                      src={integration.logo}
                      alt={integration.name}
                      width={40}
                      height={40}
                      className="object-contain"
                      onError={(e) => {
                        // SECURITY: Fallback to initials if image fails to load (XSS safe)
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          const initials = integration.name.substring(0, 2).toUpperCase()
                          const div = document.createElement('div')
                          div.className = 'text-xs font-semibold text-gray-600'
                          div.textContent = initials // XSS safe - no HTML interpretation
                          parent.appendChild(div)
                        }
                      }}
                    />
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-10">
                    {integration.name}
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-12">
              <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black transition-colors">
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
