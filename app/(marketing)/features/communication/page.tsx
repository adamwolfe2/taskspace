"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, CheckCircle, MessageSquare, Bell, Mail, Share2, X, FileText, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

export default function CommunicationPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-gray-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,0,0,0.02),transparent_50%)]" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Column - Content */}
              <div>
                <Badge variant="outline" className="mb-6 border-gray-300 text-gray-900">
                  TEAM COMMUNICATION
                </Badge>

                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Keep your team in sync, every day
                </h1>

                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Replace chaotic status updates with structured end-of-day reports.
                  Get real-time notifications, manager feedback, and weekly digests—all
                  in one place.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <Link href="/pricing">
                    <Button size="lg" className="bg-black hover:bg-gray-800 text-white">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="border-gray-300 text-gray-900 hover:bg-gray-50">
                      View Pricing
                    </Button>
                  </Link>
                </div>

                <div className="flex items-center gap-8 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-gray-900" />
                    <span>Free forever plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-gray-900" />
                    <span>14-day free trial</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Product Mockup */}
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="relative"
                >
                  {/* EOD Report Mockup */}
                  <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-semibold">
                            TM
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">Team Member</div>
                            <div className="text-sm text-gray-500">Product Manager</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-gray-300 text-gray-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Today
                        </Badge>
                      </div>
                    </div>

                    {/* EOD Content */}
                    <div className="p-6 space-y-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-gray-900" />
                          <h3 className="font-semibold text-gray-900">Completed Today</h3>
                        </div>
                        <ul className="space-y-2 ml-7">
                          <li className="text-gray-700">Finalized Q1 product roadmap</li>
                          <li className="text-gray-700">Reviewed user feedback from beta</li>
                          <li className="text-gray-700">Sprint planning for next week</li>
                        </ul>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-5 w-5 text-gray-900" />
                          <h3 className="font-semibold text-gray-900">Planned for Tomorrow</h3>
                        </div>
                        <ul className="space-y-2 ml-7">
                          <li className="text-gray-700">Client demo preparation</li>
                          <li className="text-gray-700">Team standup at 10am</li>
                        </ul>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <X className="h-5 w-5 text-gray-900" />
                          <h3 className="font-semibold text-gray-900">Blockers</h3>
                        </div>
                        <div className="ml-7">
                          <p className="text-gray-700">Waiting on design assets from team</p>
                        </div>
                      </div>
                    </div>

                    {/* Manager Feedback */}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">Manager Feedback</div>
                          <p className="text-sm text-gray-600">
                            Great progress on the roadmap! Let&apos;s sync on the design blockers tomorrow.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notification Badge Overlay */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="absolute -left-4 top-1/4 bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
                  >
                    <Bell className="h-5 w-5 text-gray-900" />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">EOD Reminder</div>
                      <div className="text-xs text-gray-500">Submit your report</div>
                    </div>
                  </motion.div>

                  {/* Share Badge Overlay */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="absolute -right-4 bottom-1/4 bg-white rounded-lg shadow-xl border border-gray-200 px-4 py-3 flex items-center gap-3"
                  >
                    <Share2 className="h-5 w-5 text-gray-900" />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Shared with</div>
                      <div className="text-xs text-gray-500">5 stakeholders</div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="py-24 bg-gray-50 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-16">
              {/* Problem */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  The Problem
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-gray-900 mt-2" />
                    <p className="text-gray-700">
                      Status updates scattered across Slack, email, and meetings
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-gray-900 mt-2" />
                    <p className="text-gray-700">
                      Managers spend hours chasing down what their team accomplished
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-gray-900 mt-2" />
                    <p className="text-gray-700">
                      Important updates buried in message threads or forgotten
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-gray-900 mt-2" />
                    <p className="text-gray-700">
                      Stakeholders left in the dark about team progress
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  The Solution
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-gray-900 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Structured daily reports</strong> that capture what matters most
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-gray-900 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Automated reminders</strong> via Slack and email to keep everyone consistent
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-gray-900 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Manager feedback</strong> directly on reports for continuous improvement
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-gray-900 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-700">
                      <strong>Public shareable links</strong> to keep stakeholders informed effortlessly
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Deep Dive */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Everything you need for team communication
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                From daily check-ins to weekly digests, Taskspace keeps your entire
                team aligned and accountable.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-gray-50 rounded-xl p-8 border border-gray-200"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Daily EOD Reports
                </h3>
                <p className="text-gray-600">
                  Structured end-of-day reports capture completed work, tomorrow&apos;s plans,
                  and any blockers in a consistent format everyone can follow.
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-gray-50 rounded-xl p-8 border border-gray-200"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center mb-6">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Slack Integration
                </h3>
                <p className="text-gray-600">
                  Automatic reminders and notifications delivered right to your team&apos;s
                  Slack workspace. Never miss an important update or deadline.
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gray-50 rounded-xl p-8 border border-gray-200"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center mb-6">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Email Notifications
                </h3>
                <p className="text-gray-600">
                  Stay informed with smart email notifications for critical updates,
                  manager feedback, and team activity summaries.
                </p>
              </motion.div>

              {/* Feature 4 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-50 rounded-xl p-8 border border-gray-200"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center mb-6">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Manager Feedback
                </h3>
                <p className="text-gray-600">
                  Managers can comment directly on reports to provide guidance,
                  recognition, and support right where it&apos;s needed.
                </p>
              </motion.div>

              {/* Feature 5 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gray-50 rounded-xl p-8 border border-gray-200"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center mb-6">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Public Share Links
                </h3>
                <p className="text-gray-600">
                  Generate secure, shareable links to EOD reports so stakeholders
                  and clients can stay informed without needing a login.
                </p>
              </motion.div>

              {/* Feature 6 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-gray-50 rounded-xl p-8 border border-gray-200"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Weekly Digests
                </h3>
                <p className="text-gray-600">
                  Automatic weekly summaries delivered to your inbox with team
                  highlights, completed work, and key insights at a glance.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to transform your team communication?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join hundreds of teams using Taskspace to stay aligned, accountable,
              and moving forward every single day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="bg-white hover:bg-gray-100 text-gray-900">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Talk to Sales
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-6">
              Free forever plan • 14-day free trial on paid plans • Cancel anytime
            </p>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
