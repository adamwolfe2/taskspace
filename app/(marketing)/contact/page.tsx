"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Zap,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Clock,
  Send,
  CheckCircle,
  Building2,
  Users,
  HelpCircle,
} from "lucide-react"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const contactReasons = [
  { id: "sales", label: "Sales Inquiry", icon: Building2 },
  { id: "support", label: "Customer Support", icon: HelpCircle },
  { id: "partnership", label: "Partnership", icon: Users },
  { id: "other", label: "Other", icon: MessageSquare },
]

export default function ContactPage() {
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    company: "",
    reason: "sales",
    message: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-red-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-6"
            >
              <Zap className="w-4 h-4" />
              Get in Touch
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
            >
              We&apos;d Love to{" "}
              <span className="text-gradient-primary">Hear From You</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-600 leading-relaxed"
            >
              Have questions about AIMS? Want to schedule a demo? Our team is here
              to help.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-16">
            {/* Contact Form */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="lg:col-span-3"
            >
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 rounded-2xl p-12 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    Message Sent!
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Thank you for reaching out. Our team will get back to you within
                    24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false)
                      setFormState({
                        name: "",
                        email: "",
                        company: "",
                        reason: "sales",
                        message: "",
                      })
                    }}
                    className="text-red-600 font-medium hover:text-red-700"
                  >
                    Send another message
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  variants={fadeInUp}
                  onSubmit={handleSubmit}
                  className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm"
                >
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Send Us a Message
                  </h2>

                  {/* Contact Reason */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      What can we help you with?
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {contactReasons.map((reason) => (
                        <button
                          key={reason.id}
                          type="button"
                          onClick={() =>
                            setFormState({ ...formState, reason: reason.id })
                          }
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            formState.reason === reason.id
                              ? "border-red-500 bg-red-50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <reason.icon
                            className={`w-5 h-5 ${
                              formState.reason === reason.id
                                ? "text-red-600"
                                : "text-slate-400"
                            }`}
                          />
                          <span
                            className={`text-sm font-medium ${
                              formState.reason === reason.id
                                ? "text-red-600"
                                : "text-slate-600"
                            }`}
                          >
                            {reason.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formState.name}
                        onChange={(e) =>
                          setFormState({ ...formState, name: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-slate-700 mb-2"
                      >
                        Work Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formState.email}
                        onChange={(e) =>
                          setFormState({ ...formState, email: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  {/* Company */}
                  <div className="mb-6">
                    <label
                      htmlFor="company"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company"
                      value={formState.company}
                      onChange={(e) =>
                        setFormState({ ...formState, company: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
                      placeholder="Acme Inc."
                    />
                  </div>

                  {/* Message */}
                  <div className="mb-6">
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-slate-700 mb-2"
                    >
                      Message *
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={formState.message}
                      onChange={(e) =>
                        setFormState({ ...formState, message: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
                      placeholder="Tell us how we can help..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="lg:col-span-2 space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  Other Ways to Reach Us
                </h2>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                      <p className="text-slate-600">hello@aims.io</p>
                      <p className="text-slate-600">support@aims.io</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Phone</h3>
                      <p className="text-slate-600">+1 (555) 123-4567</p>
                      <p className="text-sm text-slate-500">Mon-Fri 9am-6pm ET</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">Office</h3>
                      <p className="text-slate-600">
                        123 Innovation Way
                        <br />
                        San Francisco, CA 94105
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        Response Time
                      </h3>
                      <p className="text-slate-600">
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Links */}
              <motion.div
                variants={fadeInUp}
                className="bg-slate-50 rounded-2xl p-6"
              >
                <h3 className="font-semibold text-slate-900 mb-4">Quick Links</h3>
                <ul className="space-y-3">
                  {[
                    { label: "Help Center", href: "/help" },
                    { label: "Documentation", href: "/docs" },
                    { label: "API Reference", href: "/api-docs" },
                    { label: "System Status", href: "/status" },
                  ].map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-slate-600 hover:text-red-600 transition-colors"
                      >
                        {link.label} →
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Enterprise CTA */}
              <motion.div
                variants={fadeInUp}
                className="bg-slate-900 rounded-2xl p-6 text-white"
              >
                <Building2 className="w-10 h-10 text-red-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Enterprise Sales</h3>
                <p className="text-slate-300 mb-4">
                  Looking for a custom solution? Our enterprise team is ready to
                  help.
                </p>
                <a
                  href="/contact?type=enterprise"
                  className="inline-flex items-center gap-2 text-red-400 font-medium hover:text-red-300 transition-colors"
                >
                  Schedule a call →
                </a>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold text-slate-900 mb-4"
            >
              Frequently Asked Questions
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-lg text-slate-600">
              Quick answers to common questions
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-6"
          >
            {[
              {
                q: "How quickly can I get started?",
                a: "You can sign up and start using AIMS in under 5 minutes. No credit card required for the free trial.",
              },
              {
                q: "Do you offer demos?",
                a: "Yes! We offer personalized demos for teams of all sizes. Just fill out the contact form or email sales@aims.io.",
              },
              {
                q: "What kind of support do you offer?",
                a: "We offer email support for all plans, priority support for Pro, and dedicated account managers for Enterprise.",
              },
              {
                q: "Can I migrate from another tool?",
                a: "Absolutely. Our team can help you migrate your data from other tools. Contact us for assistance.",
              },
            ].map((faq) => (
              <motion.div
                key={faq.q}
                variants={fadeInUp}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-100"
              >
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
