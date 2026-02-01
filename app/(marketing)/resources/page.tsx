"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  Search,
  BookOpen,
  Video,
  FileText,
  Headphones,
  Download,
  ExternalLink,
  Clock,
  TrendingUp,
  Users,
  Target,
  Sparkles,
  PlayCircle,
  CheckCircle,
  Star,
  MessageSquare
} from "lucide-react"
import { useState } from "react"

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

export default function ResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const categories = [
    { id: "all", label: "All Resources", icon: BookOpen },
    { id: "guides", label: "Guides", icon: FileText },
    { id: "videos", label: "Videos", icon: Video },
    { id: "webinars", label: "Webinars", icon: Headphones },
    { id: "templates", label: "Templates", icon: Download }
  ]

  const featuredResources = [
    {
      title: "The Complete Guide to EOS",
      description: "Learn how to implement the Entrepreneurial Operating System from scratch",
      type: "guide",
      duration: "45 min read",
      image: "📘",
      color: "from-blue-500 to-cyan-500",
      popular: true
    },
    {
      title: "Level 10 Meeting Mastery",
      description: "How to run the most productive 90 minutes of your week",
      type: "video",
      duration: "23 min",
      image: "🎥",
      color: "from-purple-500 to-pink-500",
      popular: true
    },
    {
      title: "Rock Setting Workshop",
      description: "Set quarterly rocks that actually get done",
      type: "webinar",
      duration: "60 min",
      image: "🎯",
      color: "from-orange-500 to-red-500",
      popular: false
    }
  ]

  const resources = [
    {
      category: "guides",
      title: "Getting Started with Align",
      description: "Everything you need to know to get your team up and running",
      type: "Guide",
      duration: "15 min read",
      icon: BookOpen,
      color: "blue"
    },
    {
      category: "guides",
      title: "Building Your Accountability Chart",
      description: "Step-by-step guide to defining roles and responsibilities",
      type: "Guide",
      duration: "20 min read",
      icon: BookOpen,
      color: "blue"
    },
    {
      category: "guides",
      title: "Scorecard Metrics That Matter",
      description: "How to choose the right KPIs for your business",
      type: "Guide",
      duration: "18 min read",
      icon: BookOpen,
      color: "blue"
    },
    {
      category: "videos",
      title: "Platform Walkthrough",
      description: "Complete tour of Align's features and capabilities",
      type: "Video",
      duration: "12 min",
      icon: Video,
      color: "purple"
    },
    {
      category: "videos",
      title: "IDS Process in Action",
      description: "See how high-performing teams solve issues",
      type: "Video",
      duration: "8 min",
      icon: Video,
      color: "purple"
    },
    {
      category: "videos",
      title: "AI Features Deep Dive",
      description: "Discover how AI agents automate your workflows",
      type: "Video",
      duration: "15 min",
      icon: Video,
      color: "purple"
    },
    {
      category: "webinars",
      title: "Quarterly Planning Workshop",
      description: "Plan your next 90 days with confidence",
      type: "Webinar",
      duration: "60 min",
      icon: Headphones,
      color: "orange"
    },
    {
      category: "webinars",
      title: "Scaling with EOS",
      description: "How fast-growing companies use EOS to maintain clarity",
      type: "Webinar",
      duration: "45 min",
      icon: Headphones,
      color: "orange"
    },
    {
      category: "templates",
      title: "Vision/Traction Organizer",
      description: "The 2-page strategic plan template",
      type: "Template",
      duration: "Download",
      icon: Download,
      color: "emerald"
    },
    {
      category: "templates",
      title: "Level 10 Meeting Agenda",
      description: "Ready-to-use meeting agenda template",
      type: "Template",
      duration: "Download",
      icon: Download,
      color: "emerald"
    },
    {
      category: "templates",
      title: "Quarterly Rocks Worksheet",
      description: "Plan and track your 90-day priorities",
      type: "Template",
      duration: "Download",
      icon: Download,
      color: "emerald"
    },
    {
      category: "templates",
      title: "Scorecard Builder",
      description: "Create your weekly measurables in minutes",
      type: "Template",
      duration: "Download",
      icon: Download,
      color: "emerald"
    }
  ]

  const filteredResources = selectedCategory === "all"
    ? resources
    : resources.filter(r => r.category === selectedCategory)

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
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              <BookOpen className="w-3 h-3 mr-1" />
              Learning Center
            </Badge>

            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-tight">
              Master EOS with
              <br />
              <span className="text-slate-400">expert resources</span>
            </h1>

            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Guides, videos, webinars, and templates to help you implement EOS and get the most out of Align.
            </p>

            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search resources..."
                className="pl-12 h-14 text-base"
              />
            </div>

            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">100% free resources</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">Expert-created content</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">Updated weekly</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Resources */}
      <section className="py-20 border-y border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 mb-4">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Start here
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl">
              Our most popular resources to help you get started with EOS
            </p>
          </div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid lg:grid-cols-3 gap-8"
          >
            {featuredResources.map((resource, index) => (
              <motion.div
                key={resource.title}
                variants={fadeInUp}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <div className={cn(
                  "h-48 bg-gradient-to-br flex items-center justify-center text-7xl",
                  resource.color
                )}>
                  {resource.image}
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-slate-100 text-slate-700 text-xs">
                      {resource.type}
                    </Badge>
                    {resource.popular && (
                      <Badge className="bg-purple-100 text-purple-700 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {resource.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      {resource.duration}
                    </div>
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3 mb-12">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all",
                    selectedCategory === category.id
                      ? "bg-slate-900 border-slate-900 text-white shadow-lg"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-md"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </button>
              )
            })}
          </div>

          {/* Resource Grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredResources.map((resource, index) => {
              const Icon = resource.icon
              return (
                <motion.div
                  key={resource.title}
                  variants={fadeInUp}
                  className="group bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                      resource.color === "blue" && "bg-blue-100",
                      resource.color === "purple" && "bg-purple-100",
                      resource.color === "orange" && "bg-orange-100",
                      resource.color === "emerald" && "bg-emerald-100"
                    )}>
                      <Icon className={cn(
                        "w-6 h-6",
                        resource.color === "blue" && "text-blue-600",
                        resource.color === "purple" && "text-purple-600",
                        resource.color === "orange" && "text-orange-600",
                        resource.color === "emerald" && "text-emerald-600"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-slate-100 text-slate-700 text-xs">
                          {resource.type}
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {resource.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">
                        {resource.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        {resource.duration}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* EOS Academy CTA */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Coming Soon
              </Badge>

              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">
                Introducing
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Align Academy
                </span>
              </h2>

              <p className="text-xl text-slate-600 leading-relaxed">
                Structured courses, live workshops, and certification programs to help you become an EOS expert.
              </p>

              <div className="space-y-4">
                {[
                  "Self-paced courses on every EOS tool",
                  "Live workshops with expert facilitators",
                  "Certification programs for implementers",
                  "Community forum with 10,000+ members"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white mt-6">
                Join Waitlist
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 gap-6"
            >
              {[
                { icon: Video, label: "50+ Courses", color: "from-blue-400 to-blue-600" },
                { icon: Users, label: "Live Workshops", color: "from-purple-400 to-purple-600" },
                { icon: Target, label: "Certification", color: "from-orange-400 to-orange-600" },
                { icon: MessageSquare, label: "Community", color: "from-emerald-400 to-emerald-600" }
              ].map((item, index) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.label}
                    className="bg-white rounded-2xl p-8 border border-slate-200 text-center"
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4",
                      item.color
                    )}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="font-semibold text-slate-900">{item.label}</div>
                  </div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Need help?
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our support team is here to help you succeed
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
              {
                icon: BookOpen,
                title: "Documentation",
                description: "Complete guides and API reference",
                cta: "Browse Docs",
                color: "blue"
              },
              {
                icon: MessageSquare,
                title: "Live Chat",
                description: "Chat with our support team",
                cta: "Start Chat",
                color: "purple"
              },
              {
                icon: Headphones,
                title: "Onboarding Call",
                description: "Get personalized setup help",
                cta: "Schedule Call",
                color: "emerald"
              }
            ].map((support, index) => {
              const Icon = support.icon
              return (
                <motion.div
                  key={support.title}
                  variants={fadeInUp}
                  className="group bg-white rounded-2xl p-8 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 text-center"
                >
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4",
                    support.color === "blue" && "bg-blue-100",
                    support.color === "purple" && "bg-purple-100",
                    support.color === "emerald" && "bg-emerald-100"
                  )}>
                    <Icon className={cn(
                      "w-8 h-8",
                      support.color === "blue" && "text-blue-600",
                      support.color === "purple" && "text-purple-600",
                      support.color === "emerald" && "text-emerald-600"
                    )} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{support.title}</h3>
                  <p className="text-slate-600 mb-6">{support.description}</p>
                  <Button variant="outline" className="w-full group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all">
                    {support.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </motion.div>
              )
            })}
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
              Ready to get started?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Join 10,000+ teams running on EOS with Align. Free forever for up to 10 users.
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
