"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Search,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronRight,
  Zap,
  Users,
  CheckCircle,
  Target,
  BarChart3,
  Settings,
  CreditCard,
  Shield,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  {
    id: "getting-started",
    icon: Zap,
    title: "Getting Started",
    description: "New to Align? Start here.",
    articles: [
      "Creating your organization",
      "Inviting team members",
      "Setting up your first team",
      "Your first EOD report",
    ],
  },
  {
    id: "eod-reports",
    icon: CheckCircle,
    title: "EOD Reports",
    description: "Master daily reporting.",
    articles: [
      "Writing effective reports",
      "Using AI suggestions",
      "Escalating blockers",
      "Report templates",
    ],
  },
  {
    id: "team-management",
    icon: Users,
    title: "Team Management",
    description: "Organize your teams.",
    articles: [
      "Creating teams",
      "Managing members",
      "Role permissions",
      "Team settings",
    ],
  },
  {
    id: "rocks-goals",
    icon: Target,
    title: "Rocks & Goals",
    description: "Track quarterly objectives.",
    articles: [
      "Creating rocks",
      "Milestone tracking",
      "Progress updates",
      "Quarterly planning",
    ],
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics",
    description: "Understand your data.",
    articles: [
      "Dashboard overview",
      "Team metrics",
      "Exporting reports",
      "Custom dashboards",
    ],
  },
  {
    id: "account",
    icon: Settings,
    title: "Account & Settings",
    description: "Manage your account.",
    articles: [
      "Profile settings",
      "Notification preferences",
      "Password & security",
      "Data export",
    ],
  },
  {
    id: "billing",
    icon: CreditCard,
    title: "Billing & Plans",
    description: "Subscriptions and payments.",
    articles: [
      "Understanding plans",
      "Upgrading/downgrading",
      "Payment methods",
      "Invoices & receipts",
    ],
  },
  {
    id: "security",
    icon: Shield,
    title: "Security & Privacy",
    description: "Keep your data safe.",
    articles: [
      "SSO setup",
      "Two-factor authentication",
      "Data retention",
      "GDPR compliance",
    ],
  },
]

const popularArticles = [
  { title: "How to write an effective EOD report", views: "2.4k views" },
  { title: "Setting up SSO for your organization", views: "1.8k views" },
  { title: "Understanding role permissions", views: "1.5k views" },
  { title: "Creating and tracking quarterly rocks", views: "1.3k views" },
  { title: "Using AI suggestions effectively", views: "1.2k views" },
]

const faqs = [
  {
    question: "How do I reset my password?",
    answer:
      "Click 'Forgot Password' on the login page and enter your email address. You'll receive a password reset link within a few minutes. Check your spam folder if you don't see it.",
  },
  {
    question: "Can I change my organization name?",
    answer:
      "Yes, organization admins can change the organization name in Settings > Organization > General. This change will be reflected across all team members' accounts immediately.",
  },
  {
    question: "How do I export my data?",
    answer:
      "Go to Settings > Data > Export. You can export your EOD reports, rocks, and analytics data in CSV or JSON format. Enterprise customers have access to additional export options.",
  },
  {
    question: "What happens when I downgrade my plan?",
    answer:
      "When you downgrade, you'll retain access to your current features until the end of your billing period. After that, features exclusive to higher plans will be disabled, but your data remains intact.",
  },
  {
    question: "How do I add a new team member?",
    answer:
      "Go to Team > Members > Invite. Enter the team member's email address and select their role. They'll receive an invitation email to join your organization.",
  },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-red-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-6"
            >
              <HelpCircle className="w-4 h-4" />
              Help Center
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
            >
              How Can We{" "}
              <span className="text-gradient-primary">Help You?</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-600 mb-8"
            >
              Search our knowledge base or browse by category.
            </motion.p>

            {/* Search Bar */}
            <motion.div variants={fadeInUp} className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for help articles..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl shadow-sm text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
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
              Browse by Category
            </motion.h2>

            <motion.div
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {categories.map((category) => (
                <motion.div
                  key={category.id}
                  variants={fadeInUp}
                  className="bg-slate-50 rounded-xl p-6 hover:bg-slate-100 transition-colors group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4 group-hover:bg-red-200 transition-colors">
                    <category.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-red-600 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.articles.slice(0, 3).map((article) => (
                      <li key={article}>
                        <Link
                          href={`/help/${category.id}/${article.toLowerCase().replace(/\s+/g, "-")}`}
                          className="text-sm text-slate-600 hover:text-red-600 transition-colors flex items-center gap-1"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {article}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/help/${category.id}`}
                    className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-red-600 hover:gap-2 transition-all"
                  >
                    View all
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Popular Articles & FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Popular Articles */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.div
                variants={fadeInUp}
                className="flex items-center justify-between mb-6"
              >
                <h2 className="text-2xl font-bold text-slate-900">
                  Popular Articles
                </h2>
                <Link
                  href="/help/articles"
                  className="text-red-600 font-medium hover:text-red-700 flex items-center gap-1"
                >
                  View All
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.div variants={staggerContainer} className="space-y-3">
                {popularArticles.map((article, index) => (
                  <motion.div
                    key={article.title}
                    variants={fadeInUp}
                    className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-sm font-medium text-red-600">
                          {index + 1}
                        </span>
                        <span className="font-medium text-slate-900">
                          {article.title}
                        </span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {article.views}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* FAQ */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2
                variants={fadeInUp}
                className="text-2xl font-bold text-slate-900 mb-6"
              >
                Frequently Asked Questions
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-3">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={faq.question}
                    variants={fadeInUp}
                    className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setOpenFaq(openFaq === index ? null : index)
                      }
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="font-medium text-slate-900">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-5 h-5 text-slate-400 transition-transform",
                          openFaq === index && "rotate-180"
                        )}
                      />
                    </button>
                    {openFaq === index && (
                      <div className="px-4 pb-4 text-slate-600">{faq.answer}</div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Still Need Help?
              </h2>
              <p className="text-lg text-slate-600">
                Our support team is here for you.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-8"
            >
              <motion.div
                variants={fadeInUp}
                className="text-center p-6 bg-slate-50 rounded-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Documentation
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Detailed guides and API documentation.
                </p>
                <Link
                  href="/docs"
                  className="text-red-600 font-medium hover:text-red-700"
                >
                  Browse Docs →
                </Link>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="text-center p-6 bg-slate-50 rounded-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Live Chat</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Chat with our support team in real-time.
                </p>
                <button className="text-red-600 font-medium hover:text-red-700">
                  Start Chat →
                </button>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="text-center p-6 bg-slate-50 rounded-xl"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Email Us</h3>
                <p className="text-sm text-slate-600 mb-4">
                  We typically respond within 24 hours.
                </p>
                <Link
                  href="/contact"
                  className="text-red-600 font-medium hover:text-red-700"
                >
                  Contact Support →
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
