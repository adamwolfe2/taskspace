"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  BarChart3,
  Users,
  Target,
  Calendar,
  Brain,
  Shield,
  Zap,
  MessageSquare,
  Bell,
  FileText,
  Clock,
  TrendingUp,
  Settings,
  Lock,
  Globe,
  Smartphone,
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

const mainFeatures = [
  {
    icon: CheckCircle,
    title: "AI-Powered EOD Reports",
    description:
      "Transform how your team reports daily progress with intelligent, AI-assisted end-of-day reports that save time and improve clarity.",
    features: [
      "AI-generated report suggestions",
      "Customizable report templates",
      "Blocker tracking and escalation",
      "Tomorrow's priorities planning",
    ],
    color: "red",
    href: "/features/eod-reports",
    image: "/features/eod-preview.png",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Build and manage your organization with powerful team structures, roles, and permissions that scale with your company.",
    features: [
      "Hierarchical team structures",
      "Role-based permissions",
      "Team member profiles",
      "Manager oversight tools",
    ],
    color: "blue",
    href: "/features/team-management",
    image: "/features/team-preview.png",
  },
  {
    icon: Target,
    title: "Rocks & Goals",
    description:
      "Set quarterly objectives and track progress with milestone-based goal tracking inspired by the EOS methodology.",
    features: [
      "Quarterly rock planning",
      "Milestone tracking",
      "Progress visualization",
      "Goal alignment across teams",
    ],
    color: "emerald",
    href: "/features/rocks",
    image: "/features/rocks-preview.png",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Make data-driven decisions with powerful analytics dashboards that give you visibility into team performance.",
    features: [
      "Real-time dashboards",
      "Trend analysis",
      "Submission rate tracking",
      "Custom report exports",
    ],
    color: "purple",
    href: "/features/analytics",
    image: "/features/analytics-preview.png",
  },
]

const additionalFeatures = [
  {
    icon: Calendar,
    title: "Integrated Calendar",
    description: "Sync deadlines, milestones, and team events in one unified calendar view.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Never miss a deadline with intelligent reminders and customizable alerts.",
  },
  {
    icon: Brain,
    title: "AI Suggestions",
    description: "Get intelligent recommendations for task prioritization and team optimization.",
  },
  {
    icon: MessageSquare,
    title: "Team Communication",
    description: "Built-in commenting and feedback on reports for better collaboration.",
  },
  {
    icon: FileText,
    title: "Report Templates",
    description: "Create custom templates to standardize reporting across your organization.",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Track time spent on rocks and tasks for better project estimation.",
  },
  {
    icon: TrendingUp,
    title: "Performance Metrics",
    description: "Measure individual and team performance with actionable metrics.",
  },
  {
    icon: Settings,
    title: "Customization",
    description: "Tailor Align to your workflow with extensive customization options.",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description: "SOC 2 compliant with SSO, audit logs, and advanced security controls.",
  },
  {
    icon: Globe,
    title: "Global Teams",
    description: "Support for multiple timezones and languages for distributed teams.",
  },
  {
    icon: Smartphone,
    title: "Mobile Access",
    description: "Stay connected on the go with our responsive mobile experience.",
  },
  {
    icon: Shield,
    title: "Data Privacy",
    description: "Your data is encrypted at rest and in transit with GDPR compliance.",
  },
]

const colorClasses = {
  red: { bg: "bg-red-50", icon: "text-red-600", border: "border-red-100", gradient: "from-red-500 to-red-600" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600", border: "border-blue-100", gradient: "from-blue-500 to-blue-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", border: "border-emerald-100", gradient: "from-emerald-500 to-emerald-600" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", border: "border-purple-100", gradient: "from-purple-500 to-purple-600" },
}

export default function FeaturesPage() {
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
              Powerful Features
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
            >
              Everything Your Team Needs to{" "}
              <span className="text-gradient-primary">Succeed</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-600 leading-relaxed"
            >
              Align provides a comprehensive suite of tools designed to enhance
              accountability, streamline communication, and drive results across
              your organization.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {mainFeatures.map((feature, index) => {
              const colors = colorClasses[feature.color as keyof typeof colorClasses]
              const isReversed = index % 2 === 1

              return (
                <motion.div
                  key={feature.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={staggerContainer}
                  className={`flex flex-col ${isReversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20`}
                >
                  {/* Content */}
                  <div className="flex-1">
                    <motion.div
                      variants={fadeInUp}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg} ${colors.border} border mb-4`}
                    >
                      <feature.icon className={`w-4 h-4 ${colors.icon}`} />
                      <span className={`text-sm font-medium ${colors.icon}`}>
                        Core Feature
                      </span>
                    </motion.div>
                    <motion.h2
                      variants={fadeInUp}
                      className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
                    >
                      {feature.title}
                    </motion.h2>
                    <motion.p
                      variants={fadeInUp}
                      className="text-lg text-slate-600 mb-6 leading-relaxed"
                    >
                      {feature.description}
                    </motion.p>
                    <motion.ul variants={fadeInUp} className="space-y-3 mb-8">
                      {feature.features.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full ${colors.bg} flex items-center justify-center`}>
                            <CheckCircle className={`w-3 h-3 ${colors.icon}`} />
                          </div>
                          <span className="text-slate-700">{item}</span>
                        </li>
                      ))}
                    </motion.ul>
                    <motion.div variants={fadeInUp}>
                      <Link
                        href={feature.href}
                        className={`inline-flex items-center gap-2 px-6 py-3 text-white bg-gradient-to-r ${colors.gradient} rounded-xl shadow-lg hover:shadow-xl transition-shadow font-medium`}
                      >
                        Explore {feature.title.split(" ")[0]}
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </motion.div>
                  </div>

                  {/* Image/Preview */}
                  <motion.div variants={fadeInUp} className="flex-1 w-full">
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} rounded-3xl opacity-10 blur-2xl`} />
                      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
                        <div className="aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                          {/* Placeholder for feature preview */}
                          <div className="h-full rounded-xl bg-white shadow-sm border border-slate-100 p-4">
                            <div className="flex items-center gap-3 mb-4">
                              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                                <feature.icon className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="h-3 w-24 bg-slate-200 rounded" />
                                <div className="h-2 w-16 bg-slate-100 rounded mt-1.5" />
                              </div>
                            </div>
                            <div className="space-y-3">
                              {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                  <div className="w-8 h-8 rounded-full bg-slate-200" />
                                  <div className="flex-1">
                                    <div className="h-2.5 w-3/4 bg-slate-200 rounded" />
                                    <div className="h-2 w-1/2 bg-slate-100 rounded mt-1.5" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="py-20 lg:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
            >
              And So Much More
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              Align is packed with features designed to make your team more
              productive and accountable.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {additionalFeatures.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
            >
              Ready to See Align in Action?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 mb-8"
            >
              Start your free trial today and experience the difference Align can
              make for your team.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-shadow"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
              >
                Schedule Demo
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
