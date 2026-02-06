"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, CheckCircle, ListTodo, Clock, Users, Target, X, CheckSquare, Calendar, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/marketing/page-transition"

export default function TasksPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-20 md:py-32">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              {/* Left Column - Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
              >
                <Badge variant="outline" className="border-black text-black">
                  <ListTodo className="mr-2 h-3 w-3" />
                  TO-DO LIST & TASKS
                </Badge>

                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl md:text-6xl">
                    Every action item, tracked to completion
                  </h1>
                  <p className="text-lg text-gray-600 md:text-xl">
                    Turn meeting action items into trackable to-dos. Automatic assignment,
                    EOS-standard 7-day due dates, and seamless integration with your quarterly rocks.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
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

                <div className="flex items-center gap-8 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>7-day default due dates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-black" />
                    <span>Auto-generated from meetings</span>
                  </div>
                </div>
              </motion.div>

              {/* Right Column - Product Mockup */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="relative mx-auto w-full max-w-2xl">
                  {/* Task List UI Mockup */}
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
                    {/* Header */}
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-black">To-Do List</h3>
                        <Badge variant="outline" className="border-gray-300 text-gray-700">
                          12 active
                        </Badge>
                      </div>
                    </div>

                    {/* Task Items */}
                    <div className="divide-y divide-gray-100">
                      {/* Task 1 - In Progress */}
                      <div className="group px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <CheckSquare className="mt-1 h-5 w-5 text-gray-400" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium text-black">Update Q1 marketing strategy deck</p>
                                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Sarah Chen
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Due in 3 days
                                  </span>
                                  <Badge variant="outline" className="border-gray-300 text-xs">
                                    In Progress
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Link2 className="h-3 w-3" />
                              <span>Linked to: Increase Market Share rock</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Task 2 - Not Started */}
                      <div className="group px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <CheckSquare className="mt-1 h-5 w-5 text-gray-400" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium text-black">Schedule client follow-up calls</p>
                                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Mike Johnson
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Due in 5 days
                                  </span>
                                  <Badge variant="outline" className="border-gray-300 text-xs">
                                    Not Started
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Task 3 - Complete */}
                      <div className="group px-6 py-4 hover:bg-gray-50 transition-colors opacity-60">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="mt-1 h-5 w-5 text-black" />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium text-black line-through">Review vendor contracts</p>
                                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Alex Rivera
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Completed
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Task 4 - Overdue */}
                      <div className="group px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <CheckSquare className="mt-1 h-5 w-5 text-gray-600" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium text-black">Submit budget proposal</p>
                                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Emily Davis
                                  </span>
                                  <span className="flex items-center gap-1 text-gray-700 font-medium">
                                    <Clock className="h-3 w-3" />
                                    Overdue 2 days
                                  </span>
                                  <Badge variant="outline" className="border-gray-400 text-xs">
                                    In Progress
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Link2 className="h-3 w-3" />
                              <span>Linked to: Financial Efficiency rock</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-gray-100 blur-3xl" />
                  <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-gray-100 blur-3xl" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
                  Action items that actually get done
                </h2>
                <p className="text-lg text-gray-600">
                  Most action items from meetings never get completed. They're scribbled in notebooks,
                  lost in emails, or forgotten by the next meeting. Taskspace automatically converts
                  every meeting action item into a trackable to-do with clear ownership and deadlines.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="mt-12 grid gap-8 sm:grid-cols-2"
              >
                {/* Problem Card */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-left">
                  <div className="mb-4 inline-flex rounded-full bg-white p-3">
                    <X className="h-6 w-6 text-gray-600" />
                  </div>
                  <h3 className="mb-2 font-semibold text-black">Before Taskspace</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Action items lost between meetings</li>
                    <li>• No clear ownership or due dates</li>
                    <li>• Manual tracking in spreadsheets</li>
                    <li>• Disconnected from quarterly goals</li>
                    <li>• Status updates require chasing people</li>
                  </ul>
                </div>

                {/* Solution Card */}
                <div className="rounded-lg border border-black bg-black p-6 text-left">
                  <div className="mb-4 inline-flex rounded-full bg-white p-3">
                    <CheckCircle className="h-6 w-6 text-black" />
                  </div>
                  <h3 className="mb-2 font-semibold text-white">With Taskspace</h3>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Auto-generated from meeting notes</li>
                    <li>• Clear assignee and 7-day default due dates</li>
                    <li>• Linked to quarterly rocks</li>
                    <li>• Real-time status tracking</li>
                    <li>• Visible accountability across team</li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Deep Dive */}
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
                  Built for EOS accountability
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Every feature designed to keep your team aligned and on track
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
                  <ListTodo className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Automatic creation from meetings
                </h3>
                <p className="text-gray-600">
                  Every action item discussed in your Level 10 meetings automatically becomes a to-do.
                  No manual data entry, no items falling through the cracks. Just seamless accountability
                  from discussion to completion.
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
                  <Clock className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  EOS-standard 7-day deadlines
                </h3>
                <p className="text-gray-600">
                  Following EOS best practices, every to-do gets a 7-day default due date. Keep your team
                  moving fast with clear expectations and automatic deadline tracking. Overdue items are
                  highlighted for immediate attention.
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
                  <Users className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Clear ownership and assignments
                </h3>
                <p className="text-gray-600">
                  Every to-do has a single owner. No confusion about who's responsible. Team members can
                  see their complete task list across all meetings and priorities, with status updates
                  visible to the entire team.
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
                  <Link2 className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Linked to quarterly rocks
                </h3>
                <p className="text-gray-600">
                  Connect to-dos directly to your quarterly rocks. See how daily action items contribute
                  to 90-day goals. Track progress from weekly execution to quarterly achievements, keeping
                  your entire team aligned on what matters most.
                </p>
              </motion.div>

              {/* Feature 5 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="inline-flex rounded-lg bg-white p-3 shadow-sm">
                  <Target className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Status tracking at a glance
                </h3>
                <p className="text-gray-600">
                  Three simple statuses: Not Started, In Progress, Complete. No complex workflows or
                  confusing states. Everyone knows exactly where things stand. Perfect for quick updates
                  during your Level 10 meetings.
                </p>
              </motion.div>

              {/* Feature 6 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="inline-flex rounded-lg bg-white p-3 shadow-sm">
                  <CheckSquare className="h-6 w-6 text-black" />
                </div>
                <h3 className="text-xl font-semibold text-black">
                  Complete task history
                </h3>
                <p className="text-gray-600">
                  Never lose track of completed work. Full history of all to-dos, who completed them,
                  and when. Perfect for quarterly reviews, performance discussions, and seeing how far
                  your team has come.
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
                Turn every action item into results
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
                Join teams already running on EOS with Taskspace
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
