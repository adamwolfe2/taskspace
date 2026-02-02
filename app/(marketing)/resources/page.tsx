"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FileText, Video } from "lucide-react"

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

export default function ResourcesPage() {
  return (
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
                Resources
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold text-black mb-6"
            >
              Learn and grow
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-600"
            >
              Resources to help you get the most out of Align.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Blog</h3>
              <p className="text-gray-600">
                Articles, guides, and best practices.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Documentation</h3>
              <p className="text-gray-600">
                Technical guides and API references.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Webinars</h3>
              <p className="text-gray-600">
                Live workshops and product demos.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
