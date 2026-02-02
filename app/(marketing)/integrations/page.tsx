"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  Search,
  Zap,
  CheckCircle,
  Star,
  TrendingUp,
  Users,
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  BarChart3,
  Database,
  Cloud,
  Lock,
  Sparkles,
  ChevronRight
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

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  const categories = [
    { id: "all", label: "All Integrations", count: 50 },
    { id: "communication", label: "Communication", count: 12 },
    { id: "productivity", label: "Productivity", count: 15 },
    { id: "crm", label: "CRM & Sales", count: 8 },
    { id: "marketing", label: "Marketing", count: 7 },
    { id: "development", label: "Development", count: 8 }
  ]

  const integrations = [
    {
      name: "Slack",
      category: "communication",
      description: "Get notifications, create tasks, and update rocks directly from Slack",
      icon: MessageSquare,
      color: "from-purple-400 to-purple-600",
      popular: true,
      featured: true
    },
    {
      name: "Google Workspace",
      category: "productivity",
      description: "Sync calendar events, emails, and documents seamlessly",
      icon: Mail,
      color: "from-blue-400 to-blue-600",
      popular: true,
      featured: true
    },
    {
      name: "Microsoft Teams",
      category: "communication",
      description: "Connect your teams with real-time updates and collaboration",
      icon: Users,
      color: "from-indigo-400 to-indigo-600",
      popular: true,
      featured: false
    },
    {
      name: "Salesforce",
      category: "crm",
      description: "Sync opportunities, accounts, and pipeline data automatically",
      icon: Database,
      color: "from-cyan-400 to-cyan-600",
      popular: true,
      featured: true
    },
    {
      name: "HubSpot",
      category: "crm",
      description: "Connect marketing and sales data to your rocks and scorecard",
      icon: TrendingUp,
      color: "from-orange-400 to-orange-600",
      popular: true,
      featured: false
    },
    {
      name: "Zoom",
      category: "communication",
      description: "Start Level 10 meetings directly with one-click Zoom integration",
      icon: Calendar,
      color: "from-blue-500 to-blue-700",
      popular: false,
      featured: false
    },
    {
      name: "Google Analytics",
      category: "marketing",
      description: "Pull website metrics directly into your marketing scorecard",
      icon: BarChart3,
      color: "from-emerald-400 to-emerald-600",
      popular: false,
      featured: false
    },
    {
      name: "GitHub",
      category: "development",
      description: "Track development progress and link commits to rocks",
      icon: FileText,
      color: "from-slate-600 to-slate-800",
      popular: false,
      featured: false
    },
    {
      name: "Zapier",
      category: "productivity",
      description: "Connect 5,000+ apps with custom workflows and automations",
      icon: Zap,
      color: "from-orange-500 to-red-500",
      popular: true,
      featured: true
    },
    {
      name: "AWS",
      category: "development",
      description: "Monitor infrastructure metrics and deployment status",
      icon: Cloud,
      color: "from-yellow-500 to-orange-500",
      popular: false,
      featured: false
    },
    {
      name: "Okta",
      category: "productivity",
      description: "Enterprise SSO and identity management for secure access",
      icon: Lock,
      color: "from-blue-600 to-indigo-600",
      popular: false,
      featured: false
    },
    {
      name: "Jira",
      category: "development",
      description: "Sync sprints, issues, and project status with engineering rocks",
      icon: CheckCircle,
      color: "from-blue-500 to-blue-700",
      popular: false,
      featured: false
    }
  ]

  const filteredIntegrations = integrations.filter(integration => {
    const matchesCategory = selectedCategory === "all" || integration.category === selectedCategory
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredIntegrations = integrations.filter(i => i.featured)

  return (
    <div className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto space-y-8">
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
              <Zap className="w-3 h-3 mr-1" />
              50+ Integrations
            </Badge>

            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 leading-tight">
              Connect everything
              <br />
              <span className="text-slate-400">in one powerful platform</span>
            </h1>

            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Align integrates with all the tools your team already uses. Sync data automatically, eliminate manual updates, and get a single source of truth.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-8">
                Browse All Integrations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8">
                Request Integration
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">2-minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">No code required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-slate-600">Bi-directional sync</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Integrations */}
      <section className="py-20 border-y border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-4">
              <Star className="w-3 h-3 mr-1" />
              Most Popular
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Featured integrations
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              The integrations our customers use most to power their workflows
            </p>
          </div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {featuredIntegrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                variants={fadeInUp}
                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <div className="space-y-4">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                    integration.color
                  )}>
                    <integration.icon className="w-8 h-8 text-white" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{integration.name}</h3>
                      {integration.popular && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">Popular</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {integration.description}
                    </p>
                  </div>

                  <div className="pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                      View integration
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* All Integrations */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              All integrations
            </h2>
            <p className="text-lg text-slate-600">
              Connect Align with the tools your team uses every day
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    selectedCategory === category.id
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  {category.label}
                  <span className="ml-2 opacity-60">({category.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Integration Grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredIntegrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                variants={fadeInUp}
                className="group bg-white rounded-xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
                    integration.color
                  )}>
                    <integration.icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-slate-900 truncate">
                        {integration.name}
                      </h3>
                      {integration.popular && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs flex-shrink-0">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {integration.description}
                    </p>

                    <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                        Connect
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No integrations found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your search or filters</p>
              <Button variant="outline" onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
              }}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* API Section */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Badge className="bg-indigo-100 text-indigo-700">
                <Sparkles className="w-3 h-3 mr-1" />
                Developer API
              </Badge>

              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900">
                Build custom
                <br />
                <span className="text-slate-400">integrations with our API</span>
              </h2>

              <p className="text-xl text-slate-600 leading-relaxed">
                Don't see your tool? Use our robust REST API to build custom integrations and automate any workflow.
              </p>

              <div className="space-y-4">
                {[
                  "Complete REST API with webhooks",
                  "Real-time data sync and updates",
                  "Comprehensive documentation and SDKs",
                  "Dedicated developer support"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button className="bg-slate-900 hover:bg-slate-800">
                  View API Docs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline">
                  Get API Key
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-slate-900 rounded-2xl p-8 border border-slate-800"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>

                <pre className="text-sm text-emerald-400 overflow-x-auto">
{`// Initialize the Align API
const align = new AlignAPI({
  apiKey: 'your-api-key'
});

// Create a new rock
const rock = await align.rocks.create({
  title: 'Launch new product',
  owner: 'sarah@company.com',
  dueDate: '2024-12-31',
  priority: 1
});

// Update scorecard metrics
await align.scorecard.update({
  metric: 'Revenue',
  value: 125000,
  week: '2024-W23'
});

console.log('✓ Rock created successfully');`}
                </pre>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-8"
          >
            {[
              { value: "50+", label: "Native integrations" },
              { value: "5,000+", label: "Apps via Zapier" },
              { value: "99.9%", label: "API uptime" },
              { value: "< 2min", label: "Average setup time" }
            ].map((stat, index) => (
              <motion.div key={index} variants={fadeInUp} className="text-center">
                <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Request Integration CTA */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-5xl lg:text-6xl font-bold text-white">
              Need a specific integration?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              We're constantly adding new integrations. Let us know which tool you'd like to see next.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 h-14 px-8 text-lg">
                Request Integration
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 h-14 px-8 text-lg">
                Browse All
              </Button>
            </div>
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
