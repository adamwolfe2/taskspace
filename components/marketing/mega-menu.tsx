"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  Sparkles,
  Target,
  BarChart3,
  Calendar,
  Zap,
  Building2,
  Users,
  Brain,
  DollarSign,
  Megaphone,
  Briefcase,
  Award,
  BookOpen,
  Video,
  FileText,
  Headphones,
  MessageSquare,
  Star,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type MenuType = "eos-ai" | "product" | "solutions" | "learn" | null

export function MegaMenu() {
  const [activeMenu, setActiveMenu] = useState<MenuType>(null)

  return (
    <nav className="relative bg-white border-b border-slate-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg" />
            <span className="text-xl font-bold text-slate-900">Align</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* EOS AI Menu */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("eos-ai")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-2">
                EOS AI
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform stroke-[1.5]",
                  activeMenu === "eos-ai" && "rotate-180"
                )} />
              </button>
            </div>

            {/* Product Menu */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("product")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-2">
                Product
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform stroke-[1.5]",
                  activeMenu === "product" && "rotate-180"
                )} />
              </button>
            </div>

            {/* Solutions Menu */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("solutions")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-2">
                Solutions
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform stroke-[1.5]",
                  activeMenu === "solutions" && "rotate-180"
                )} />
              </button>
            </div>

            {/* Learn Menu */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("learn")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors py-2">
                Learn
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform stroke-[1.5]",
                  activeMenu === "learn" && "rotate-180"
                )} />
              </button>
            </div>

            <Link href="/pricing" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/app">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Login
              </Button>
            </Link>
            <Link href="/app?page=register">
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full">
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Mega Menu Dropdowns */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 left-0 right-0 bg-white border-b border-slate-200 shadow-lg"
            onMouseEnter={() => setActiveMenu(activeMenu)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* EOS AI Menu */}
              {activeMenu === "eos-ai" && (
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      AI Platform
                    </h3>
                    <div className="space-y-3">
                      <Link
                        href="/features/eod-reports"
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                          <Brain className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 mb-1">EOD Agent</div>
                          <div className="text-xs text-slate-600">Auto-organize daily task dumps into structured reports</div>
                        </div>
                      </Link>
                      <Link
                        href="/features/rocks"
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                          <Target className="w-5 h-5 text-slate-900" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 mb-1">Rock Agent</div>
                          <div className="text-xs text-slate-600">Predict risks and track quarterly goal progress</div>
                        </div>
                      </Link>
                      <Link
                        href="/features/scorecard"
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                          <BarChart3 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 mb-1">Scorecard Agent</div>
                          <div className="text-xs text-slate-600">Detect metric trends and alert on issues</div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      AI Features
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-slate-700">Smart Task Categorization</span>
                      </div>
                      <div className="flex items-center gap-2 p-3">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-slate-700">Blocker Detection</span>
                      </div>
                      <div className="flex items-center gap-2 p-3">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-slate-700">Progress Forecasting</span>
                      </div>
                      <div className="flex items-center gap-2 p-3">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-slate-700">Trend Analysis</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                    <Badge className="bg-purple-600 text-white mb-3">
                      <Sparkles className="w-3 h-3 mr-1" />
                      New
                    </Badge>
                    <h3 className="font-bold text-slate-900 mb-2">AI Super Agents</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Delegate entire workflows to AI agents that work 24/7
                    </p>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                      Learn More
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Product Menu */}
              {activeMenu === "product" && (
                <div className="grid grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      Core Features
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/features/eod-reports"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-700">EOD Reports</span>
                      </Link>
                      <Link
                        href="/features/rocks"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Target className="w-4 h-4 text-slate-900" />
                        <span className="text-sm text-slate-700">Quarterly Rocks</span>
                      </Link>
                      <Link
                        href="/features/scorecard"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">Scorecard</span>
                      </Link>
                      <Link
                        href="/features/level-10-meetings"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-700">Level 10 Meetings</span>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      EOS Tools
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/features/ids-process"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Zap className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-slate-700">IDS Process</span>
                      </Link>
                      <Link
                        href="/features/accountability-chart"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">Accountability Chart</span>
                      </Link>
                      <Link
                        href="#"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-700">Vision/Traction Organizer</span>
                      </Link>
                      <Link
                        href="#"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-700">People Analyzer</span>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      Collaboration
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">Team Chat</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-700">Team Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-700">Shared Calendars</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <FileText className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-slate-700">Meeting Notes</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      Integrations
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 p-2">
                        <div className="w-4 h-4 bg-slate-200 rounded" />
                        <span className="text-sm text-slate-700">Slack</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <div className="w-4 h-4 bg-slate-200 rounded" />
                        <span className="text-sm text-slate-700">Google Calendar</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <div className="w-4 h-4 bg-slate-200 rounded" />
                        <span className="text-sm text-slate-700">Microsoft Teams</span>
                      </div>
                    </div>
                    <Link href="#">
                      <Button size="sm" variant="outline" className="w-full">
                        View All Integrations
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Solutions Menu */}
              {activeMenu === "solutions" && (
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      By Team
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/solutions/leadership"
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                          <Award className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 mb-1">Leadership</div>
                          <div className="text-xs text-slate-600">Close the strategy-execution gap</div>
                        </div>
                      </Link>
                      <Link
                        href="/solutions/sales"
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 mb-1">Sales</div>
                          <div className="text-xs text-slate-600">Hit quota every quarter</div>
                        </div>
                      </Link>
                      <Link
                        href="/solutions/marketing"
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0 group-hover:bg-pink-200 transition-colors">
                          <Megaphone className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 mb-1">Marketing</div>
                          <div className="text-xs text-slate-600">Execute campaigns flawlessly</div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      More Teams
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">Operations</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-700">Human Resources</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Target className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-slate-700">Product & Engineering</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-700">IT</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                    <Star className="w-8 h-8 text-yellow-500 mb-3" />
                    <h3 className="font-bold text-slate-900 mb-2">Success Stories</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      See how teams like yours execute 3x faster with Align
                    </p>
                    <Button size="sm" variant="outline">
                      Read Case Studies
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Learn Menu */}
              {activeMenu === "learn" && (
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      Learn
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">EOS University</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Video className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-700">Video Tutorials</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-700">Documentation</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-slate-700">Webinars</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">
                      Support
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2">
                        <Headphones className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-slate-700">24/7 Support</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-slate-700">Community Forum</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-slate-700">Help Center</span>
                      </div>
                      <div className="flex items-center gap-2 p-2">
                        <Users className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-slate-700">Contact Us</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                    <Video className="w-8 h-8 text-blue-600 mb-3" />
                    <h3 className="font-bold text-slate-900 mb-2">Product Demo</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      See Align in action with a live walkthrough
                    </p>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                      Watch Demo
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
