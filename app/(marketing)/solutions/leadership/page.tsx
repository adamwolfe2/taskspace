"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, CheckCircle, Eye, Zap, Target, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

export default function LeadershipPage() {
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
                  <Target className="mr-2 h-3 w-3" />
                  FOR LEADERSHIP
                </Badge>

                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl md:text-6xl">
                    Run Multiple Teams From One Dashboard
                  </h1>
                  <p className="text-lg text-gray-600 md:text-xl max-w-3xl mx-auto">
                    Get unified visibility across all teams, AI-powered insights on what's working,
                    and strategic alignment from quarterly rocks down to daily execution.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
                    <Link href="/register">
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
                    <span>Cross-team visibility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>AI-powered insights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Strategic alignment</span>
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
                  See everything, miss nothing
                </h2>
                <p className="text-lg text-gray-600">
                  As your company grows, staying on top of every team becomes impossible.
                  Taskspace gives you the visibility you need without drowning in status meetings.
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
                  Built for leadership teams
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Everything you need to lead with clarity and confidence
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
                  <Eye className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Unified Cross-Team Visibility
                </h3>
                <p className="text-gray-600">
                  See every team's rocks, scorecards, and to-dos in one place. No more jumping
                  between tools or waiting for weekly reports. Know exactly where each department
                  stands on their quarterly goals at a glance.
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
                  <Zap className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  AI-Powered Insights
                </h3>
                <p className="text-gray-600">
                  Get intelligent summaries of what's working and what needs attention. AI analyzes
                  patterns across teams, highlights risks before they become problems, and surfaces
                  opportunities you might have missed.
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
                  Strategic Alignment at Every Level
                </h3>
                <p className="text-gray-600">
                  Ensure every team's quarterly rocks connect to company vision. See how daily
                  tasks ladder up to strategic priorities. No more wondering if teams are rowing
                  in the same direction.
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
                  <TrendingUp className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Save Hours Every Week
                </h3>
                <p className="text-gray-600">
                  Replace endless status meetings with instant visibility. Spend less time asking
                  "what's the status?" and more time on strategic decisions. Most leaders save
                  5-10 hours per week on meetings alone.
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
                Lead with clarity and confidence
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Start your free trial today. No credit card required.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
                  <Link href="/register">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-gray-300">
                  <Link href="/features">Explore All Features</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-gray-500">
                Join leadership teams running on EOS with Taskspace
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
