"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle,
  Users,
  Target,
  Building2,
  Star,
  X,
  UserCircle,
  Crown,
  Shield,
  Briefcase,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { MegaMenu } from "@/components/marketing/mega-menu"

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

export default function AccountabilityChartPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>('ceo')

  const roles = {
    ceo: {
      title: "CEO / Visionary",
      responsibilities: ["Vision", "Major Relationships", "Culture", "Strategy"],
      icon: Crown,
      color: "from-purple-400 to-purple-600"
    },
    integrator: {
      title: "Integrator",
      responsibilities: ["Day-to-day Operations", "Leadership Team", "Execute Vision", "P&L Accountability"],
      icon: Shield,
      color: "from-blue-400 to-blue-600"
    },
    sales: {
      title: "Head of Sales",
      responsibilities: ["Revenue", "Customer Acquisition", "Sales Team", "Quota Management"],
      icon: TrendingUp,
      color: "from-emerald-400 to-emerald-600"
    },
    marketing: {
      title: "Head of Marketing",
      responsibilities: ["Brand", "Lead Generation", "Marketing Team", "Content Strategy"],
      icon: Briefcase,
      color: "from-orange-400 to-orange-600"
    },
  }

  return (
    <div className="min-h-screen bg-white">
      <MegaMenu />

      {/* Hero Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="bg-blue-50 text-blue-600 border-blue-200 mb-4">
                  <Building2 className="w-4 h-4 mr-1" />
                  ACCOUNTABILITY CHART
                </Badge>
              </motion.div>

              <motion.h1 variants={fadeInUp} className="text-6xl font-bold text-slate-900 leading-[1.1]">
                Right person, right seat,{" "}
                <span className="text-slate-400">clear responsibilities</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="text-xl text-slate-600 leading-relaxed">
                Replace the traditional org chart with an Accountability Chart that defines crystal-clear
                roles, responsibilities, and seat expectations for every position.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-start gap-4">
                <Link href="/app?page=register">
                  <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-8 h-14 text-base font-semibold">
                    Get started. It's FREE!
                  </Button>
                </Link>
                <div className="text-sm text-slate-500">
                  Free forever.
                  <br />
                  No credit card.
                </div>
              </motion.div>

              <motion.div variants={fadeInUp} className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-slate-600">4.9/5 on G2</span>
                </div>
                <div className="text-sm text-slate-400">|</div>
                <div className="text-sm font-medium text-slate-600">10,000+ orgs aligned</div>
              </motion.div>
            </motion.div>

            {/* Right - Interactive Org Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">Accountability Chart</h3>

                  {/* CEO Level */}
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={() => setSelectedRole('ceo')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all",
                        selectedRole === 'ceo'
                          ? "border-purple-300 bg-purple-50 shadow-lg"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center",
                          roles.ceo.color
                        )}>
                          <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-sm font-semibold text-slate-900">CEO</div>
                      </div>
                    </button>
                  </div>

                  {/* Vertical Line */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-8 bg-slate-300" />
                  </div>

                  {/* Integrator Level */}
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={() => setSelectedRole('integrator')}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all",
                        selectedRole === 'integrator'
                          ? "border-blue-300 bg-blue-50 shadow-lg"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                          "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center",
                          roles.integrator.color
                        )}>
                          <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-sm font-semibold text-slate-900">Integrator</div>
                      </div>
                    </button>
                  </div>

                  {/* Vertical Line */}
                  <div className="flex justify-center">
                    <div className="w-0.5 h-8 bg-slate-300" />
                  </div>

                  {/* Department Heads */}
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(roles).slice(2).map(([key, role]) => {
                      const Icon = role.icon
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedRole(key)}
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all",
                            selectedRole === key
                              ? "border-emerald-300 bg-emerald-50 shadow-lg"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          )}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className={cn(
                              "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center",
                              role.color
                            )}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-xs font-semibold text-slate-900 text-center">
                              {role.title.replace('Head of ', '')}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Selected Role Details */}
                  {selectedRole && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div className="text-sm font-semibold text-slate-900 mb-3">
                        {roles[selectedRole as keyof typeof roles].title} - Key Responsibilities:
                      </div>
                      <ul className="space-y-2">
                        {roles[selectedRole as keyof typeof roles].responsibilities.map((resp, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                            <CheckCircle className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            {resp}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-semibold text-slate-500 mb-8 uppercase tracking-wider">
            TRUSTED BY EOS COMPANIES
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale">
            {["Amazon", "NVIDIA", "Spotify", "Harvard"].map((logo) => (
              <div key={logo} className="text-2xl font-bold text-slate-900">{logo}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* The Old Way */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 mb-4">
                  The Problem
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                Traditional org charts <span className="text-red-600">don't define accountability</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Job titles say nothing about actual responsibilities",
                  "Unclear who's accountable for what",
                  "Overlapping roles create confusion and conflict",
                  "New hires don't understand expectations",
                  "Performance reviews lack clear criteria",
                ].map((problem, i) => (
                  <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{problem}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* The Align Way */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="space-y-6"
            >
              <motion.div variants={fadeInUp}>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 mb-4">
                  The Solution
                </Badge>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-4xl font-bold text-slate-900">
                Crystal-clear <span className="text-emerald-600">seats and roles</span>
              </motion.h2>

              <motion.div variants={staggerContainer} className="space-y-4">
                {[
                  "Every seat has 5 clear roles/responsibilities",
                  "Everyone knows exactly what they own",
                  "Right people in right seats assessment",
                  "Built-in people analyzer tool",
                  "Accountability linked to rocks and metrics",
                ].map((solution, i) => (
                  <motion.div key={i} variants={fadeInUp} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{solution}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 1 - Seat Definition */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-blue-50 text-blue-600 border-blue-200">
                <UserCircle className="w-4 h-4 mr-1" />
                SEAT DEFINITION
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Define every seat with 5 key roles
              </h2>

              <p className="text-xl text-slate-600">
                Each seat on your Accountability Chart has exactly 5 roles—the major areas of
                responsibility that define success in that position.
              </p>

              <ul className="space-y-4">
                {[
                  { icon: Target, text: "5 roles per seat (not more, not less)" },
                  { icon: Users, text: "Clear reporting structure" },
                  { icon: CheckCircle, text: "Quarterly rocks tied to seats" },
                  { icon: TrendingUp, text: "Metrics/scorecard tied to seat owners" },
                ].map((item, i) => {
                  const Icon = item.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 pt-2">
                        <span className="text-slate-700">{item.text}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
                <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">Head of Sales</div>
                      <div className="text-xs text-slate-500">Reports to: Integrator</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-700 uppercase mb-3">5 Key Roles:</div>
                    {[
                      "Revenue",
                      "Customer Acquisition",
                      "Sales Team Leadership",
                      "Pipeline Management",
                      "Quota Attainment"
                    ].map((role, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{role}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-xs text-slate-600 mb-2">Person in Seat:</div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                      <div>
                        <div className="font-semibold text-slate-900">Michael Rodriguez</div>
                        <div className="text-xs text-slate-500">GWC: ✓✓✓ (Right Person, Right Seat)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 2 - People Analyzer */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">People Analyzer - Sarah Chen</h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-700 uppercase mb-3">Core Values Assessment:</div>
                    <div className="space-y-2">
                      {[
                        { value: "Humble", rating: "+" },
                        { value: "Hungry", rating: "+" },
                        { value: "Smart", rating: "+/-" },
                        { value: "Accountable", rating: "+" },
                        { value: "Results-Driven", rating: "+" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium text-slate-900">{item.value}</span>
                          <Badge className={cn(
                            item.rating === "+" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
                          )}>
                            {item.rating}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <div className="text-xs font-semibold text-slate-700 uppercase mb-3">GWC Assessment:</div>
                    <div className="space-y-2">
                      {[
                        { label: "Gets It", value: true },
                        { label: "Wants It", value: true },
                        { label: "Capacity", value: true },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm font-medium text-slate-900">{item.label}</span>
                          {item.value ? (
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <X className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <Badge className="bg-emerald-100 text-emerald-700 w-full justify-center py-2">
                      ✓ Right Person, Right Seat
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <Badge className="bg-purple-50 text-purple-600 border-purple-200">
                <Users className="w-4 h-4 mr-1" />
                PEOPLE ANALYZER
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Right people in right seats
              </h2>

              <p className="text-xl text-slate-600">
                The People Analyzer helps you assess every team member against your core values and
                the GWC framework (Gets it, Wants it, Capacity to do it).
              </p>

              <ul className="space-y-4">
                {[
                  "Rate team members on each core value (+, +/-, -)",
                  "GWC assessment for each seat",
                  "Identify who's thriving vs. struggling",
                  "Make objective hiring and seating decisions",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive 3 - Organizational Clarity */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200">
                <Building2 className="w-4 h-4 mr-1" />
                ORG CLARITY
              </Badge>

              <h2 className="text-4xl font-bold text-slate-900">
                Everyone knows who does what
              </h2>

              <p className="text-xl text-slate-600">
                Your Accountability Chart is visible to the entire organization. No more confusion
                about who owns what or who reports to whom.
              </p>

              <ul className="space-y-4">
                {[
                  "Company-wide visibility into structure",
                  "Clear reporting relationships",
                  "Easy onboarding for new hires",
                  "Quarterly updates as org evolves",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">{benefit}</span>
                  </li>
                ))}
              </ul>

              <Link href="/app?page=register">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6">
                  Build your chart
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-2xl p-8 border border-emerald-100">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-slate-900 mb-4">Company Structure</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-slate-900">Visionary</span>
                        </div>
                        <span className="text-xs text-slate-600">Emily Watson</span>
                      </div>
                    </div>

                    <div className="pl-6 space-y-2">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-slate-900">Integrator</span>
                          </div>
                          <span className="text-xs text-slate-600">Michael R.</span>
                        </div>
                      </div>

                      <div className="pl-6 space-y-2">
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-900">Sales</span>
                            <span className="text-xs text-slate-500">Sarah C.</span>
                          </div>
                        </div>
                        <div className="p-2 bg-orange-50 rounded border border-orange-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-900">Marketing</span>
                            <span className="text-xs text-slate-500">David L.</span>
                          </div>
                        </div>
                        <div className="p-2 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-900">Operations</span>
                            <span className="text-xs text-slate-500">Alex M.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Clear accountability drives 40% better execution
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { value: "40%", label: "Better execution vs. unclear roles" },
              { value: "90%", label: "Employee clarity on expectations" },
              { value: "50%", label: "Faster onboarding time" },
              { value: "100%", label: "Visibility into who owns what" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Teams love the clarity
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "The Accountability Chart transformed our organization. Everyone finally knows who's responsible for what.",
                author: "Emily Watson",
                role: "CEO, GrowthLabs",
              },
              {
                quote: "Using the People Analyzer helped us realize we had two people in the wrong seats. Made the changes, and execution improved immediately.",
                author: "Michael Rodriguez",
                role: "Integrator, TechCorp",
              },
              {
                quote: "New hires love it. They can see the whole org structure and understand exactly what success looks like in their role.",
                author: "Sarah Chen",
                role: "Head of HR, StartupXYZ",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-white/90 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600" />
                  <div>
                    <div className="font-semibold text-white">{testimonial.author}</div>
                    <div className="text-sm text-white/60">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Building2 className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-5xl font-bold text-white mb-6">
            Build crystal-clear accountability today
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of companies with right people in right seats
          </p>
          <Link href="/app?page=register">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-8 h-14 text-base font-semibold">
              Get started FREE
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-white/80 mt-4 text-sm">Free forever. No credit card required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div>© 2026 Align. All rights reserved.</div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
