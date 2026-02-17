"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, CheckCircle, TrendingUp, Target, Users, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

export default function SalesPage() {
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
                  <TrendingUp className="mr-2 h-3 w-3" />
                  FOR SALES TEAMS
                </Badge>

                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl md:text-6xl">
                    Keep Your Sales Team Accountable
                  </h1>
                  <p className="text-lg text-gray-600 md:text-xl max-w-3xl mx-auto">
                    Track daily activities with EODs, measure what matters with scorecards,
                    and drive consistent pipeline growth with quarterly rock goals.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
                    <Link href="/app?page=register">
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
                    <span>Daily EOD tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Sales metrics scorecards</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Pipeline visibility</span>
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
                  Accountability that drives revenue
                </h2>
                <p className="text-lg text-gray-600">
                  Stop wondering if your sales team is hitting their daily activities.
                  Taskspace makes accountability visible, measurable, and consistent.
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
                  Built for sales accountability
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Everything you need to keep your team on track and hitting quota
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
                  Daily Activity Tracking via EODs
                </h3>
                <p className="text-gray-600">
                  Every rep logs their end-of-day wins, challenges, and tomorrow's priorities.
                  See exactly who's putting in the work. No more guessing if calls are being made
                  or deals are being worked.
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
                  <BarChart3 className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Sales Metrics Scorecards
                </h3>
                <p className="text-gray-600">
                  Track the numbers that matter: calls made, demos booked, pipeline value,
                  close rate. Weekly updates keep everyone aligned on where they stand versus
                  target. Red/yellow/green indicators make performance crystal clear.
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
                  <Target className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Quarterly Rock Goals
                </h3>
                <p className="text-gray-600">
                  Set 90-day goals for new accounts, revenue targets, or territory expansion.
                  Track progress weekly in Level 10 meetings. Connect daily activities and metrics
                  directly to quarterly objectives.
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
                  Team Performance Visibility
                </h3>
                <p className="text-gray-600">
                  See your entire team's performance at a glance. Identify top performers to
                  celebrate and struggling reps who need coaching. Foster healthy competition
                  with transparent metrics everyone can see.
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
                Build a consistent, accountable sales machine
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Start your free trial today. No credit card required.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
                  <Link href="/app?page=register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-gray-300">
                  <Link href="/features">Explore All Features</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                Join sales teams running on EOS with Taskspace
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
