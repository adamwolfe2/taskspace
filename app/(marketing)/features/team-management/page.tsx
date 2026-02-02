"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  Users,
  Zap,
  Shield,
  UserPlus,
  Settings,
  ChevronRight,
  ChevronDown,
  Mail,
  MoreHorizontal,
  Building2,
  Crown,
  CheckCircle,
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

// Interactive Team Demo
function InteractiveTeamDemo() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>("engineering")
  const [expandedTeams, setExpandedTeams] = useState<string[]>(["engineering"])

  const teams = {
    engineering: {
      name: "Engineering",
      lead: "Sarah Chen",
      members: [
        { name: "Alex Johnson", role: "Senior Engineer", avatar: "AJ", status: "online" },
        { name: "Mike Park", role: "Engineer", avatar: "MP", status: "online" },
        { name: "Emily Davis", role: "Engineer", avatar: "ED", status: "away" },
        { name: "Chris Wong", role: "Junior Engineer", avatar: "CW", status: "online" },
      ],
    },
    product: {
      name: "Product",
      lead: "Michael Rodriguez",
      members: [
        { name: "Lisa Chen", role: "Product Manager", avatar: "LC", status: "online" },
        { name: "David Kim", role: "Designer", avatar: "DK", status: "offline" },
      ],
    },
    marketing: {
      name: "Marketing",
      lead: "Jessica Taylor",
      members: [
        { name: "Ryan Smith", role: "Marketing Lead", avatar: "RS", status: "online" },
        { name: "Anna Lee", role: "Content Writer", avatar: "AL", status: "online" },
      ],
    },
  }

  const toggleTeam = (teamId: string) => {
    if (expandedTeams.includes(teamId)) {
      setExpandedTeams(expandedTeams.filter((t) => t !== teamId))
    } else {
      setExpandedTeams([...expandedTeams, teamId])
    }
    setSelectedTeam(teamId)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
      {/* Demo Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Team Management</h3>
              <p className="text-sm text-slate-500">3 teams · 10 members</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-5">
        {/* Team List */}
        <div className="md:col-span-2 border-r border-slate-100 p-4">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search teams..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>
          <div className="space-y-1">
            {Object.entries(teams).map(([teamId, team]) => (
              <div key={teamId}>
                <button
                  onClick={() => toggleTeam(teamId)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                    selectedTeam === teamId
                      ? "bg-blue-50 text-blue-600"
                      : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      !expandedTeams.includes(teamId) && "-rotate-90"
                    )}
                  />
                  <Building2 className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="font-medium">{team.name}</div>
                    <div className="text-xs text-slate-500">
                      {team.members.length} members
                    </div>
                  </div>
                </button>
                <AnimatePresence>
                  {expandedTeams.includes(teamId) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 space-y-1 overflow-hidden"
                    >
                      {team.members.map((member) => (
                        <div
                          key={member.name}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                        >
                          <div className="relative">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-medium text-slate-600">
                              {member.avatar}
                            </div>
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                                member.status === "online"
                                  ? "bg-emerald-500"
                                  : member.status === "away"
                                  ? "bg-amber-500"
                                  : "bg-slate-300"
                              )}
                            />
                          </div>
                          <span>{member.name}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Team Details */}
        <div className="md:col-span-3 p-6">
          {selectedTeam && teams[selectedTeam as keyof typeof teams] && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-xl font-semibold text-slate-900">
                    {teams[selectedTeam as keyof typeof teams].name}
                  </h4>
                  <p className="text-sm text-slate-500">
                    Led by {teams[selectedTeam as keyof typeof teams].lead}
                  </p>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-3">
                {teams[selectedTeam as keyof typeof teams].members.map(
                  (member, index) => (
                    <div
                      key={member.name}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
                          {member.avatar}
                        </div>
                        <div
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-50",
                            member.status === "online"
                              ? "bg-emerald-500"
                              : member.status === "away"
                              ? "bg-amber-500"
                              : "bg-slate-300"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {member.name}
                          </span>
                          {index === 0 && (
                            <Crown className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="text-sm text-slate-500">{member.role}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white rounded-lg transition-colors">
                          <Mail className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="p-2 hover:bg-white rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                <UserPlus className="w-5 h-5" />
                Add Team Member
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { MegaMenu } from "@/components/marketing/mega-menu"
import { MarketingFooter } from "@/components/marketing/footer"

const features = [
  {
    icon: Building2,
    title: "Hierarchical Teams",
    description:
      "Create nested team structures that mirror your organization. Support for departments, squads, and project teams.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "Fine-grained permissions let you control who can see and do what. Create custom roles for your unique needs.",
  },
  {
    icon: UserPlus,
    title: "Easy Onboarding",
    description:
      "Invite team members via email or link. New users get a guided setup experience to hit the ground running.",
  },
  {
    icon: Settings,
    title: "Team Settings",
    description:
      "Configure notification preferences, report templates, and meeting schedules for each team independently.",
  },
]

const permissions = [
  { role: "Admin", view: true, edit: true, manage: true, billing: true },
  { role: "Manager", view: true, edit: true, manage: true, billing: false },
  { role: "Member", view: true, edit: true, manage: false, billing: false },
  { role: "Viewer", view: true, edit: false, manage: false, billing: false },
]

export default function TeamManagementPage() {
  return (
    <>
      <MegaMenu />
      <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-6"
              >
                <Users className="w-4 h-4" />
                Team Management
              </motion.div>
              <motion.h1
                variants={fadeInUp}
                className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6"
              >
                Build & Manage{" "}
                <span className="text-gradient-primary">Your Dream Team</span>
              </motion.h1>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-600 mb-8 leading-relaxed"
              >
                Powerful team structures with role-based permissions. Scale from a
                small squad to an enterprise organization without friction.
              </motion.p>
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap gap-4"
              >
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
                >
                  Try It Free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 px-6 py-3 text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors font-medium"
                >
                  Watch Demo
                </Link>
              </motion.div>
            </motion.div>

            {/* Interactive Demo */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl opacity-10 blur-2xl" />
                <div className="relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1.5 bg-slate-900 text-white text-sm font-medium rounded-full flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Interactive Demo - Try it!
                    </div>
                  </div>
                  <InteractiveTeamDemo />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
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
              Built for Modern Teams
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 max-w-2xl mx-auto"
            >
              Everything you need to organize and manage your team effectively
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 gap-8"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="bg-slate-50 rounded-2xl p-8 hover:bg-slate-100 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Permissions Table */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Role-Based Permissions
              </h2>
              <p className="text-lg text-slate-600">
                Control access with predefined roles or create custom ones
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-6 font-semibold text-slate-900">
                      Role
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-900">
                      View Reports
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-900">
                      Edit Content
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-900">
                      Manage Team
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-900">
                      Billing
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr
                      key={perm.role}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="py-4 px-6 font-medium text-slate-900">
                        {perm.role}
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle
                          className={cn(
                            "w-5 h-5 mx-auto",
                            perm.view ? "text-emerald-500" : "text-slate-200"
                          )}
                        />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle
                          className={cn(
                            "w-5 h-5 mx-auto",
                            perm.edit ? "text-emerald-500" : "text-slate-200"
                          )}
                        />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle
                          className={cn(
                            "w-5 h-5 mx-auto",
                            perm.manage ? "text-emerald-500" : "text-slate-200"
                          )}
                        />
                      </td>
                      <td className="text-center py-4 px-6">
                        <CheckCircle
                          className={cn(
                            "w-5 h-5 mx-auto",
                            perm.billing ? "text-emerald-500" : "text-slate-200"
                          )}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
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
              Ready to Build Your Team?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 mb-8"
            >
              Start organizing your team today with Align.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-8 py-4 text-slate-700 font-medium hover:text-slate-900 transition-colors"
              >
                Explore All Features
                <ChevronRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
    <MarketingFooter />
    </>
  )
}
