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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
    href: "/features/eod-reports",
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
    href: "/features/team-management",
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
    href: "/features/rocks",
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
    href: "/features/analytics",
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
    description: "Tailor Taskspace to your workflow with extensive customization options.",
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

export default function FeaturesPage() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div variants={fadeInUp}>
              <Badge className="bg-white text-gray-600 border-gray-200 mb-6">
                Powerful Features
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black mb-6"
            >
              Everything Your Team Needs to Succeed
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-gray-600 leading-relaxed"
            >
              Taskspace provides a comprehensive suite of tools designed to enhance
              accountability, streamline communication, and drive results across
              your organization.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {mainFeatures.map((feature, index) => {
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
                    <motion.div variants={fadeInUp}>
                      <Badge className="bg-white text-gray-600 border-gray-200 mb-4">
                        Core Feature
                      </Badge>
                    </motion.div>
                    <motion.h2
                      variants={fadeInUp}
                      className="text-3xl sm:text-4xl font-bold text-black mb-4"
                    >
                      {feature.title}
                    </motion.h2>
                    <motion.p
                      variants={fadeInUp}
                      className="text-lg text-gray-600 mb-6 leading-relaxed"
                    >
                      {feature.description}
                    </motion.p>
                    <motion.ul variants={fadeInUp} className="space-y-3 mb-8">
                      {feature.features.map((item) => (
                        <li key={item} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-black" />
                          <span className="text-gray-700">{item}</span>
                        </li>
                      ))}
                    </motion.ul>
                    <motion.div variants={fadeInUp}>
                      <Link href={feature.href}>
                        <Button className="bg-black text-white hover:bg-gray-900">
                          Explore {feature.title.split(" ")[0]}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </motion.div>
                  </div>

                  {/* Image/Preview */}
                  <motion.div variants={fadeInUp} className="flex-1 w-full">
                    <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                      <div className="aspect-[4/3] bg-gray-50 p-6">
                        {/* Placeholder for feature preview */}
                        <div className="h-full rounded-xl bg-white shadow-sm border border-gray-200 p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center">
                              <feature.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="h-3 w-24 bg-gray-200 rounded" />
                              <div className="h-2 w-16 bg-gray-100 rounded mt-1.5" />
                            </div>
                          </div>
                          <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-gray-200" />
                                <div className="flex-1">
                                  <div className="h-2.5 w-3/4 bg-gray-200 rounded" />
                                  <div className="h-2 w-1/2 bg-gray-100 rounded mt-1.5" />
                                </div>
                              </div>
                            ))}
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
      <section className="py-20 lg:py-32 bg-white">
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
              className="text-3xl sm:text-4xl font-bold text-black mb-4"
            >
              And So Much More
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-gray-600 max-w-2xl mx-auto"
            >
              Taskspace is packed with features designed to make your team more
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
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-lg font-semibold text-black mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-black mb-4"
            >
              Ready to See Taskspace in Action?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-gray-600 mb-8"
            >
              Start your free trial today and experience the difference Taskspace can
              make for your team.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/app?page=register">
                <Button size="lg" className="bg-black text-white hover:bg-gray-900">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-gray-200 hover:bg-white text-black">
                  Schedule Demo
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
