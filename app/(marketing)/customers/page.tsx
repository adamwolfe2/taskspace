"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  Star,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  Award,
  BarChart3,
  Clock,
  DollarSign,
  Sparkles,
  Quote,
  Building,
  PlayCircle
} from "lucide-react"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function CustomersPage() {
  const stats = [
    { value: "10,000+", label: "Companies using Align" },
    { value: "384%", label: "Average ROI over 3 years" },
    { value: "95%", label: "Customer satisfaction" },
    { value: "20hrs", label: "Saved per week per team" }
  ]

  const caseStudies = [
    {
      company: "TechFlow Manufacturing",
      industry: "Manufacturing",
      size: "150 employees",
      logo: "🏭",
      color: "from-blue-500 to-cyan-500",
      quote: "Align transformed how we run our business. We grew 300% in 2 years while maintaining complete clarity and alignment across all departments.",
      author: "Sarah Johnson",
      role: "CEO",
      metrics: [
        { label: "Revenue Growth", value: "300%", icon: TrendingUp },
        { label: "Time Saved", value: "25 hrs/week", icon: Clock },
        { label: "Employee Satisfaction", value: "+45%", icon: Users }
      ],
      challenges: [
        "Leadership team misaligned on priorities",
        "Status meetings consuming 30+ hours per week",
        "No visibility into what teams were working on",
        "Quarterly goals consistently missed"
      ],
      solutions: [
        "Implemented weekly Level 10 meetings with full team",
        "Set clear rocks tied to annual vision",
        "Real-time scorecard visible to entire company",
        "IDS process resolved issues in days instead of months"
      ],
      results: "Within 6 months, TechFlow reduced meeting time by 80%, hit 95% of quarterly rocks, and saw employee engagement scores jump 45%. They've since tripled revenue while maintaining team clarity."
    },
    {
      company: "Precision Parts Co",
      industry: "Operations",
      size: "85 employees",
      logo: "⚙️",
      color: "from-emerald-500 to-teal-500",
      quote: "The operations metrics dashboard gave us visibility we never had. We reduced errors by 42% and improved delivery times by 60%.",
      author: "Michael Chen",
      role: "VP of Operations",
      metrics: [
        { label: "Error Reduction", value: "42%", icon: Target },
        { label: "Faster Delivery", value: "60%", icon: TrendingUp },
        { label: "Cost Savings", value: "$450k/year", icon: DollarSign }
      ],
      challenges: [
        "Process documentation scattered across 12 systems",
        "Quality issues discovered too late",
        "No standardization across teams",
        "Manual reporting taking 20+ hours per week"
      ],
      solutions: [
        "Centralized all SOPs in Align's process library",
        "Automated scorecard with real-time quality metrics",
        "AI agents detecting patterns and predicting issues",
        "Standardized workflows across all departments"
      ],
      results: "Precision Parts reduced process errors by 42%, cut manual reporting time to zero, and saved $450k annually in operational costs. On-time delivery improved from 85% to 97%."
    },
    {
      company: "GrowthLabs Marketing",
      industry: "Marketing Agency",
      size: "45 employees",
      logo: "🚀",
      color: "from-purple-500 to-pink-500",
      quote: "We went from chaos to clarity overnight. Campaign tracking, client reporting, and team alignment all in one place.",
      author: "Lisa Martinez",
      role: "Founder & CEO",
      metrics: [
        { label: "Client Retention", value: "92%", icon: Award },
        { label: "Team Productivity", value: "+65%", icon: BarChart3 },
        { label: "Revenue per Employee", value: "+85%", icon: DollarSign }
      ],
      challenges: [
        "Client campaigns tracked in spreadsheets",
        "Team members unclear on priorities",
        "Manual client reporting taking days",
        "Revenue unpredictable quarter to quarter"
      ],
      solutions: [
        "Campaign rocks tied to revenue targets",
        "Automated client scorecards and reports",
        "Weekly Level 10 meetings for accountability",
        "Clear accountability chart with defined roles"
      ],
      results: "GrowthLabs doubled their client base while reducing team size, improved client retention to 92%, and made revenue completely predictable with rock-based planning."
    }
  ]

  const testimonials = [
    {
      quote: "Before Align, our leadership meetings were 4 hours of status updates. Now they're 90 minutes of solving real problems.",
      author: "David Park",
      role: "CEO",
      company: "CloudScale Technologies",
      rating: 5
    },
    {
      quote: "The AI agents are like having a COO watching everything 24/7. We catch issues before they become problems.",
      author: "Jennifer Wu",
      role: "Integrator",
      company: "BuildRight Construction",
      rating: 5
    },
    {
      quote: "ROI was obvious after month one. We saved more in meeting time than the annual cost of the platform.",
      author: "Robert Taylor",
      role: "CFO",
      company: "FinTech Solutions",
      rating: 5
    },
    {
      quote: "Finally, a tool that actually enforces EOS instead of just being another place to track tasks.",
      author: "Amanda Foster",
      role: "VP Operations",
      company: "LogisticsHub",
      rating: 5
    },
    {
      quote: "Our team actually looks forward to Level 10 meetings now. That alone is worth the investment.",
      author: "Chris Johnson",
      role: "CEO",
      company: "MediaFlow",
      rating: 5
    },
    {
      quote: "We implemented Align company-wide in 2 weeks. The setup was shockingly simple for such a powerful platform.",
      author: "Maria Santos",
      role: "Director of Operations",
      company: "RetailEdge",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="text-xl font-bold text-slate-900">Align</div>
              <div className="hidden md:flex items-center gap-6">
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Product</a>
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Solutions</a>
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Learn</a>
                <a href="#" className="text-sm text-slate-600 hover:text-slate-900">Pricing</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">Log in</Button>
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800">
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto space-y-8">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <Award className="w-3 h-3 mr-1" />
              Customer Stories
            </Badge>

            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-tight">
              Real companies,
              <br />
              <span className="text-slate-400">real results</span>
            </h1>

            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              See how scaling companies use Align to achieve clarity, alignment, and measurable growth with EOS.
            </p>

            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full bg-slate-200 border-2 border-white" />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600">Rated 4.9/5 by 10,000+ teams</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div key={index} variants={fadeInUp} className="text-center">
                <div className="text-5xl font-bold text-slate-900 mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Case Studies */}
      {caseStudies.map((study, index) => (
        <section
          key={study.company}
          className={cn(
            "py-20 lg:py-32",
            index % 2 === 0 ? "bg-white" : "bg-slate-50"
          )}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={cn(
                  "w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl",
                  study.color
                )}>
                  {study.logo}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900">{study.company}</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className="bg-slate-100 text-slate-700">{study.industry}</Badge>
                    <span className="text-sm text-slate-500">{study.size}</span>
                  </div>
                </div>
              </div>

              <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200">
                <Quote className="absolute top-6 left-6 w-12 h-12 text-slate-300" />
                <blockquote className="relative z-10 pl-12">
                  <p className="text-2xl text-slate-900 leading-relaxed mb-6">
                    "{study.quote}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-300" />
                    <div>
                      <div className="font-semibold text-slate-900">{study.author}</div>
                      <div className="text-sm text-slate-600">{study.role}</div>
                    </div>
                  </div>
                </blockquote>
              </div>
            </motion.div>

            {/* Metrics */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-6 mb-16"
            >
              {study.metrics.map((metric, idx) => {
                const Icon = metric.icon
                return (
                  <motion.div
                    key={idx}
                    variants={fadeInUp}
                    className="bg-white rounded-2xl p-8 border border-slate-200 text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div className="text-4xl font-bold text-slate-900 mb-2">
                      {metric.value}
                    </div>
                    <div className="text-slate-600">{metric.label}</div>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Challenges & Solutions */}
            <div className="grid lg:grid-cols-2 gap-12 mb-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Target className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">The Challenges</h3>
                </div>
                <div className="space-y-3">
                  {study.challenges.map((challenge, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-red-600" />
                      </div>
                      <p className="text-slate-700">{challenge}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">The Solution</h3>
                </div>
                <div className="space-y-3">
                  {study.solutions.map((solution, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <p className="text-slate-700">{solution}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Results */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-200"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                <h3 className="text-2xl font-bold text-slate-900">The Results</h3>
              </div>
              <p className="text-lg text-slate-700 leading-relaxed">
                {study.results}
              </p>
            </motion.div>
          </div>
        </section>
      ))}

      {/* Testimonials Grid */}
      <section className="py-20 lg:py-32 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeInUp} className="text-4xl lg:text-5xl font-bold text-white mb-6">
              What our customers
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                are saying
              </span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-sm text-slate-400">{testimonial.role}</div>
                  <div className="text-sm text-slate-500">{testimonial.company}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Video Testimonials CTA */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              See Align in action
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Watch real customers share their experiences
            </p>
          </div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              { company: "TechFlow", duration: "3:42", views: "12k" },
              { company: "BuildRight", duration: "4:15", views: "8k" },
              { company: "GrowthLabs", duration: "5:20", views: "15k" }
            ].map((video, index) => (
              <motion.div
                key={video.company}
                variants={fadeInUp}
                className="group relative bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl aspect-video cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/40 transition-all flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center transition-all">
                    <PlayCircle className="w-8 h-8 text-slate-900" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                    <div className="font-semibold text-slate-900 mb-1">{video.company}</div>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{video.duration}</span>
                      <span>{video.views} views</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-5xl lg:text-6xl font-bold text-white">
              Ready to be our next success story?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join 10,000+ companies achieving clarity and growth with Align. Start free today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 h-14 px-8 text-lg">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 h-14 px-8 text-lg">
                Schedule Demo
              </Button>
            </div>
            <p className="text-white/80 text-sm">
              No credit card required • Free forever • 2 minute setup
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="text-xl font-bold text-white mb-4">Align</div>
              <p className="text-slate-400 text-sm mb-4">
                The all-in-one EOS platform for scaling companies.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-3">
                {["Features", "Pricing", "Security", "Roadmap"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-3">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-3">
                {["Docs", "API", "Support", "Status"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © 2024 Align. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-slate-400 hover:text-white text-sm">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">Terms</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
