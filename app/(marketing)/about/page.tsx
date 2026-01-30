"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  ArrowRight,
  Zap,
  Target,
  Heart,
  Users,
  Globe,
  Award,
  Lightbulb,
  Shield,
  TrendingUp,
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

const values = [
  {
    icon: Target,
    title: "Accountability First",
    description:
      "We believe that accountability is the foundation of high-performing teams. Everything we build supports this core principle.",
  },
  {
    icon: Heart,
    title: "Customer Obsessed",
    description:
      "Our customers' success is our success. We listen, learn, and continuously improve based on real feedback.",
  },
  {
    icon: Lightbulb,
    title: "Innovation Driven",
    description:
      "We push boundaries with AI and modern technology to make team management effortless and effective.",
  },
  {
    icon: Shield,
    title: "Trust & Transparency",
    description:
      "We earn trust through transparency in our product, pricing, and how we handle your data.",
  },
]

const team = [
  {
    name: "Alex Thompson",
    role: "CEO & Co-Founder",
    bio: "Former VP of Engineering at TechCorp. 15+ years building enterprise software.",
    avatar: "AT",
  },
  {
    name: "Sarah Chen",
    role: "CTO & Co-Founder",
    bio: "Ex-Google engineer. Passionate about AI/ML and building products that scale.",
    avatar: "SC",
  },
  {
    name: "Michael Rodriguez",
    role: "VP of Product",
    bio: "Product leader with experience at Slack and Notion. Focus on user experience.",
    avatar: "MR",
  },
  {
    name: "Emily Watson",
    role: "VP of Customer Success",
    bio: "Built CS teams from 0 to 100. Dedicated to helping customers achieve their goals.",
    avatar: "EW",
  },
  {
    name: "David Park",
    role: "Head of Engineering",
    bio: "Full-stack engineer with a passion for clean code and scalable systems.",
    avatar: "DP",
  },
  {
    name: "Lisa Martinez",
    role: "Head of Design",
    bio: "Design leader focused on creating intuitive, beautiful enterprise products.",
    avatar: "LM",
  },
]

const milestones = [
  { year: "2021", title: "Founded", description: "Align was born from a simple idea: make team accountability effortless." },
  { year: "2022", title: "First 100 Teams", description: "Rapid growth as teams discovered the power of AI-assisted EOD reports." },
  { year: "2023", title: "Series A", description: "Raised $15M to accelerate product development and global expansion." },
  { year: "2024", title: "500+ Teams", description: "Trusted by teams worldwide, from startups to Fortune 500 companies." },
  { year: "2025", title: "AI Revolution", description: "Launched next-gen AI features that transform how teams work together." },
]

const stats = [
  { value: "500+", label: "Teams worldwide" },
  { value: "50K+", label: "Daily reports" },
  { value: "98%", label: "Customer satisfaction" },
  { value: "15", label: "Countries served" },
]

export default function AboutPage() {
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
              Our Story
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
            >
              Building the Future of{" "}
              <span className="text-gradient-primary">Team Accountability</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-600 leading-relaxed"
            >
              We&apos;re on a mission to help teams achieve more by making
              accountability simple, transparent, and even enjoyable.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid lg:grid-cols-2 gap-16 items-center"
          >
            <div>
              <motion.h2
                variants={fadeInUp}
                className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6"
              >
                Our Mission
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-600 mb-6 leading-relaxed"
              >
                Align was founded on a simple observation: the best teams are built
                on accountability, but most tools make accountability feel like a
                burden rather than a superpower.
              </motion.p>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-600 mb-6 leading-relaxed"
              >
                We set out to change that. By combining the best practices from EOS
                (Entrepreneurial Operating System) with cutting-edge AI, we&apos;ve
                created a platform that makes daily check-ins effortless, goal
                tracking intuitive, and team alignment automatic.
              </motion.p>
              <motion.p
                variants={fadeInUp}
                className="text-lg text-slate-600 leading-relaxed"
              >
                Today, Align powers hundreds of teams around the world, from
                fast-growing startups to established enterprises. But we&apos;re
                just getting started.
              </motion.p>
            </div>
            <motion.div variants={fadeInUp} className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl opacity-10 blur-2xl" />
              <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200/50 p-8">
                <div className="grid grid-cols-2 gap-6">
                  {stats.map((stat) => (
                    <div key={stat.label} className="text-center p-4">
                      <div className="text-3xl sm:text-4xl font-bold text-red-600 mb-2">
                        {stat.value}
                      </div>
                      <div className="text-slate-600">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Our Values
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                The principles that guide everything we do
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {values.map((value) => (
                <motion.div
                  key={value.title}
                  variants={fadeInUp}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
                >
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-slate-600">{value.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Our Journey
              </h2>
              <p className="text-lg text-slate-600">
                Key milestones in the Align story
              </p>
            </motion.div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200 hidden md:block" />

              <div className="space-y-8">
                {milestones.map((milestone, index) => (
                  <motion.div
                    key={milestone.year}
                    variants={fadeInUp}
                    className="relative flex gap-8"
                  >
                    {/* Year marker */}
                    <div className="hidden md:flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-red-50 border-4 border-white shadow-lg flex items-center justify-center z-10">
                        <span className="text-sm font-bold text-red-600">
                          {milestone.year}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-slate-50 rounded-xl p-6">
                      <div className="md:hidden text-sm font-bold text-red-600 mb-2">
                        {milestone.year}
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-slate-600">{milestone.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-4">
                <Users className="w-4 h-4" />
                Leadership Team
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                Meet the Team
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Passionate people building the future of team accountability
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {team.map((member) => (
                <motion.div
                  key={member.name}
                  variants={fadeInUp}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xl font-semibold">
                      {member.avatar}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {member.name}
                      </h3>
                      <p className="text-red-600 font-medium">{member.role}</p>
                    </div>
                  </div>
                  <p className="text-slate-600">{member.bio}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Awards Section */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeInUp} className="mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-4">
                <Award className="w-4 h-4" />
                Recognition
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Awards & Recognition
              </h2>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-8"
            >
              {[
                { title: "Best SaaS Startup", year: "2024" },
                { title: "Top 50 Remote Tools", year: "2024" },
                { title: "G2 Leader", year: "2024" },
                { title: "Product Hunt #1", year: "2023" },
              ].map((award) => (
                <motion.div
                  key={award.title}
                  variants={fadeInUp}
                  className="p-6 bg-slate-50 rounded-xl"
                >
                  <Award className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                  <div className="font-semibold text-slate-900">{award.title}</div>
                  <div className="text-sm text-slate-500">{award.year}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-red-500 to-red-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold text-white mb-4"
            >
              Join Our Growing Team
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-red-100 mb-8"
            >
              We&apos;re always looking for talented people who share our passion
              for building great products.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/careers"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-red-600 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                View Open Positions
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-colors"
              >
                Contact Us
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
