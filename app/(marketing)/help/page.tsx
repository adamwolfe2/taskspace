"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FileText, MessageSquare, Video } from "lucide-react"

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

export default function HelpPage() {
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
              className="text-xl text-gray-600"
            >
              Find answers, documentation, and support resources.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-6"
          >
            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Documentation</h3>
              <p className="text-gray-600">
                Complete guides and API references for developers.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Video Tutorials</h3>
              <p className="text-gray-600">
                Step-by-step video guides to get started quickly.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Community Forum</h3>
              <p className="text-gray-600">
                Connect with other users and share best practices.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">FAQ</h3>
              <p className="text-gray-600">
                Quick answers to commonly asked questions.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
