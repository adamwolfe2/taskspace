"use client"

import { motion } from "framer-motion"
import { Mail, MessageSquare, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

export default function ContactPage() {
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
                Contact
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-5xl font-bold text-black mb-6"
            >
              Get in touch
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-600"
            >
              We're here to help. Reach out to our team.
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
              className="bg-white rounded-xl border border-gray-200 p-8 text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Sales</h3>
              <p className="text-gray-600 mb-4">Questions about pricing or plans</p>
              <Button variant="outline" className="border-gray-200 text-black">
                Contact Sales
              </Button>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8 text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Support</h3>
              <p className="text-gray-600 mb-4">Get help with your account</p>
              <Button variant="outline" className="border-gray-200 text-black">
                Get Support
              </Button>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 p-8 text-center"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Call Us</h3>
              <p className="text-gray-600 mb-4">Speak with our team directly</p>
              <Button variant="outline" className="border-gray-200 text-black">
                Schedule Call
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
    </PageTransition>
  )
}
