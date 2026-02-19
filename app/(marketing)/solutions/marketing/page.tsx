"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, CheckCircle, Megaphone, Target, Users, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

export default function MarketingPage() {
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
                  <Megaphone className="mr-2 h-3 w-3" />
                  FOR MARKETING TEAMS
                </Badge>

                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl md:text-6xl">
                    Align Marketing Execution With Strategy
                  </h1>
                  <p className="text-lg text-gray-600 md:text-xl max-w-3xl mx-auto">
                    Track campaigns and deliverables, coordinate across functions,
                    measure outcomes with scorecards, and align execution to quarterly goals.
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
                    <span>Campaign tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Cross-team coordination</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Measurable outcomes</span>
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
                  From strategy to execution, seamlessly
                </h2>
                <p className="text-lg text-gray-600">
                  Stop losing campaigns in the chaos. Taskspace connects your marketing strategy
                  to daily execution, so nothing falls through the cracks.
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
                  Built for marketing execution
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Everything you need to ship campaigns on time and on strategy
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
                  <Target className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Project-Level Tracking
                </h3>
                <p className="text-gray-600">
                  Track every campaign as a rock with clear deliverables, owners, and deadlines.
                  See exactly what's launching this quarter and what's at risk. No more spreadsheets
                  or lost Slack threads about campaign status.
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
                  <Users className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Cross-Functional Coordination
                </h3>
                <p className="text-gray-600">
                  Marketing doesn't happen in isolation. Track dependencies with sales, product,
                  and design teams. Assign to-dos across departments and see everything in one
                  place during weekly Level 10 meetings.
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
                  Measurable Outcomes via Scorecards
                </h3>
                <p className="text-gray-600">
                  Track the metrics that matter: website traffic, MQLs, conversion rates, content
                  output. Weekly scorecard updates keep the team accountable to results, not just
                  activities. Red/yellow/green status makes performance obvious.
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
                  <CheckCircle className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Sprint and Rock Planning
                </h3>
                <p className="text-gray-600">
                  Plan your quarter with 3-5 major marketing rocks. Break them into weekly to-dos.
                  Connect daily execution back to strategic goals. Never lose sight of why you're
                  running a campaign or what success looks like.
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
                Ship campaigns that move the needle
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
                Join marketing teams running on EOS with Taskspace
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
