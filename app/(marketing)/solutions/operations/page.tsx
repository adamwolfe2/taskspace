"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, CheckCircle, Settings, BarChart3, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

export default function OperationsPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-20 md:py-32">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <Badge variant="outline" className="border-black text-black">
                  <Settings className="mr-2 h-3 w-3" />
                  FOR OPERATIONS TEAMS
                </Badge>

                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl md:text-6xl">
                    Streamline Operations Across Every Team
                  </h1>
                  <p className="text-lg text-gray-600 md:text-xl max-w-3xl mx-auto">
                    Drive process accountability, track daily operations with EODs,
                    monitor efficiency metrics, and coordinate seamlessly across departments.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
                    <Link href="/pricing">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-gray-300">
                    <Link href="/features">View All Features</Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Process accountability</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Daily operations reports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Team coordination</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
                  Operations that run like clockwork
                </h2>
                <p className="text-lg text-gray-600">
                  Stop firefighting. Taskspace gives you the visibility and accountability
                  to turn chaos into consistent, efficient operations.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-gray-200 bg-gray-50 py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
                  Built for operational excellence
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Everything you need to keep the business running smoothly
                </p>
              </motion.div>
            </div>

            <div className="grid gap-12 md:grid-cols-2 lg:gap-16">
              {/* Feature 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="inline-flex rounded-lg bg-white p-3 shadow-sm">
                  <CheckCircle className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Process Accountability
                </h3>
                <p className="text-gray-600">
                  Track recurring processes and one-time initiatives as rocks and to-dos.
                  Ensure SOPs are followed, handoffs happen smoothly, and nothing gets lost
                  between departments. Every process has an owner and a deadline.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="inline-flex rounded-lg bg-white p-3 shadow-sm">
                  <Settings className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Daily Operations Reports
                </h3>
                <p className="text-gray-600">
                  End-of-day reports capture what got done, what's blocked, and what's next.
                  See operational velocity across teams. Identify bottlenecks before they become
                  problems. Keep everyone aligned on daily priorities.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="inline-flex rounded-lg bg-white p-3 shadow-sm">
                  <BarChart3 className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Efficiency Metrics Dashboards
                </h3>
                <p className="text-gray-600">
                  Track the KPIs that matter: cycle time, error rates, customer response time,
                  delivery performance. Weekly scorecard updates show trends at a glance.
                  Red/yellow/green indicators make it obvious where to focus improvement efforts.
                </p>
              </motion.div>

              {/* Feature 4 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="inline-flex rounded-lg bg-white p-3 shadow-sm">
                  <Users className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Cross-Team Coordination
                </h3>
                <p className="text-gray-600">
                  Operations touches every department. Coordinate with sales, marketing, product,
                  and support seamlessly. Track dependencies, assign cross-functional to-dos, and
                  keep everyone in sync through weekly Level 10 meetings.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-gray-200 bg-white py-20 md:py-32">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="mx-auto max-w-3xl text-center"
            >
              <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
                Build operations that scale
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Start your 14-day free trial today.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
                  <Link href="/pricing">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-gray-300">
                  <Link href="/features">Explore All Features</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                Join operations teams running on EOS with Taskspace
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
