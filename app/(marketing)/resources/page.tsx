"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  FileText,
  Video,
  Download,
  ExternalLink,
  Zap,
  Clock,
  Users,
  Target,
  CheckCircle,
  BarChart3,
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

const categories = [
  { id: "all", label: "All Resources" },
  { id: "guides", label: "Guides" },
  { id: "videos", label: "Videos" },
  { id: "templates", label: "Templates" },
  { id: "case-studies", label: "Case Studies" },
]

const featuredResources = [
  {
    type: "guide",
    title: "The Ultimate Guide to Team Accountability",
    description:
      "Learn the proven strategies top teams use to build a culture of accountability and achieve their goals.",
    image: "/resources/accountability-guide.jpg",
    readTime: "15 min read",
    icon: BookOpen,
    href: "/resources/accountability-guide",
    featured: true,
  },
  {
    type: "video",
    title: "Getting Started with AIMS",
    description:
      "A comprehensive walkthrough of setting up your organization and inviting your first team members.",
    image: "/resources/getting-started.jpg",
    readTime: "8 min watch",
    icon: Video,
    href: "/resources/getting-started-video",
    featured: true,
  },
]

const resources = [
  {
    type: "guide",
    title: "How to Write Effective EOD Reports",
    description: "Best practices for writing end-of-day reports that drive accountability.",
    readTime: "8 min read",
    icon: FileText,
    category: "guides",
  },
  {
    type: "template",
    title: "Quarterly Rock Planning Template",
    description: "A ready-to-use template for planning and tracking quarterly objectives.",
    readTime: "Download",
    icon: Download,
    category: "templates",
  },
  {
    type: "video",
    title: "Mastering Team Analytics",
    description: "Deep dive into using analytics to improve team performance.",
    readTime: "12 min watch",
    icon: Video,
    category: "videos",
  },
  {
    type: "case-study",
    title: "How TechCorp Increased Productivity by 40%",
    description: "Learn how a 200-person engineering team transformed their accountability.",
    readTime: "10 min read",
    icon: BarChart3,
    category: "case-studies",
  },
  {
    type: "guide",
    title: "Setting Up Teams for Success",
    description: "Best practices for organizing your team structure in AIMS.",
    readTime: "6 min read",
    icon: Users,
    category: "guides",
  },
  {
    type: "template",
    title: "Weekly Team Meeting Agenda",
    description: "Structure your team meetings for maximum effectiveness.",
    readTime: "Download",
    icon: Download,
    category: "templates",
  },
  {
    type: "guide",
    title: "Blocker Management Best Practices",
    description: "How to identify, escalate, and resolve blockers quickly.",
    readTime: "7 min read",
    icon: Target,
    category: "guides",
  },
  {
    type: "video",
    title: "Advanced Reporting Features",
    description: "Unlock the full potential of AIMS reporting capabilities.",
    readTime: "15 min watch",
    icon: Video,
    category: "videos",
  },
  {
    type: "case-study",
    title: "RemoteFirst's Journey to 98% Submission Rate",
    description: "How a fully remote company achieved near-perfect accountability.",
    readTime: "8 min read",
    icon: CheckCircle,
    category: "case-studies",
  },
]

const webinars = [
  {
    title: "Building High-Performance Teams with AIMS",
    date: "February 15, 2026",
    time: "2:00 PM ET",
    speaker: "Sarah Chen, CTO",
    registered: 234,
  },
  {
    title: "Q1 Planning: Setting Rocks That Stick",
    date: "February 22, 2026",
    time: "1:00 PM ET",
    speaker: "Michael Rodriguez, VP Product",
    registered: 189,
  },
]

export default function ResourcesPage() {
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
              <BookOpen className="w-4 h-4" />
              Resources
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
            >
              Learn, Grow,{" "}
              <span className="text-gradient-primary">Succeed</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-600 leading-relaxed"
            >
              Guides, templates, videos, and case studies to help you get the
              most out of AIMS and build a world-class team.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Featured Resources */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-2xl font-bold text-slate-900 mb-8"
            >
              Featured Resources
            </motion.h2>

            <div className="grid md:grid-cols-2 gap-8">
              {featuredResources.map((resource) => (
                <motion.div
                  key={resource.title}
                  variants={fadeInUp}
                  className="group relative bg-slate-50 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center">
                    <resource.icon className="w-16 h-16 text-red-300" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-sm text-red-600 font-medium mb-2">
                      <resource.icon className="w-4 h-4" />
                      {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
                      {resource.title}
                    </h3>
                    <p className="text-slate-600 mb-4">{resource.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Clock className="w-4 h-4" />
                        {resource.readTime}
                      </span>
                      <Link
                        href={resource.href}
                        className="flex items-center gap-1 text-red-600 font-medium hover:gap-2 transition-all"
                      >
                        Read More
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* All Resources */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
            >
              <h2 className="text-2xl font-bold text-slate-900">All Resources</h2>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {resources.map((resource) => (
                <motion.div
                  key={resource.title}
                  variants={fadeInUp}
                  className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all group"
                >
                  <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                    <resource.icon className="w-4 h-4" />
                    <span>
                      {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>{resource.readTime}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-slate-600 text-sm">{resource.description}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={fadeInUp} className="text-center mt-12">
              <button className="inline-flex items-center gap-2 px-6 py-3 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors">
                Load More Resources
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Upcoming Webinars */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeInUp}
              className="flex items-center justify-between mb-8"
            >
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-sm font-medium mb-2">
                  <Zap className="w-4 h-4" />
                  Live Events
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Upcoming Webinars
                </h2>
              </div>
              <Link
                href="/webinars"
                className="text-red-600 font-medium hover:text-red-700 flex items-center gap-1"
              >
                View All
                <ExternalLink className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid md:grid-cols-2 gap-6"
            >
              {webinars.map((webinar) => (
                <motion.div
                  key={webinar.title}
                  variants={fadeInUp}
                  className="bg-slate-50 rounded-xl p-6 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {webinar.title}
                      </h3>
                      <p className="text-sm text-slate-500">{webinar.speaker}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {webinar.date}
                      </div>
                      <div className="text-sm text-slate-500">{webinar.time}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {webinar.registered} registered
                    </span>
                    <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                      Register Now
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl font-bold text-white mb-4"
            >
              Stay Updated
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-300 mb-8"
            >
              Get the latest guides, tips, and best practices delivered to your
              inbox.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
            >
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition-shadow">
                Subscribe
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
