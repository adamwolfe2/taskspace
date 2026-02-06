"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  Menu,
  X,
  FileText,
  Target,
  BarChart2,
  Calendar,
  AlertCircle,
  Network,
  Users,
  TrendingUp,
  Grid,
  Plug
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type MenuType = "features" | "solutions" | null

export function MegaMenu() {
  const [activeMenu, setActiveMenu] = useState<MenuType>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [mobileMenuOpen])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [mobileMenuOpen])

  return (
    <nav className="relative bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/taskspace-logo.png"
              alt="Taskspace Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-black">Taskspace</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("features")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black transition-colors py-2">
                Features
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  activeMenu === "features" && "rotate-180"
                )} />
              </button>
            </div>

            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("solutions")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black transition-colors py-2">
                Solutions
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  activeMenu === "solutions" && "rotate-180"
                )} />
              </button>
            </div>

            <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/app" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-black hover:bg-gray-100">
                Log in
              </Button>
            </Link>
            <Link href="/app?page=register" className="hidden sm:block">
              <Button size="sm" className="bg-black text-white hover:bg-gray-900 px-5 font-semibold shadow-sm">
                Get started free
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-700 hover:text-black transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <Image
                      src="/taskspace-logo.png"
                      alt="Taskspace Logo"
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain"
                    />
                    <span className="text-xl font-bold text-black">Taskspace</span>
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-gray-700 hover:text-black transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Mobile Navigation Links */}
                <div className="space-y-6">
                  {/* Features Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Features
                    </h3>
                    <div className="space-y-1">
                      <Link
                        href="/features/eod-reports"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <FileText className="w-4 h-4" />
                        EOD Reports
                      </Link>
                      <Link
                        href="/features/rocks"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Target className="w-4 h-4" />
                        Quarterly Rocks
                      </Link>
                      <Link
                        href="/features/scorecard"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <BarChart2 className="w-4 h-4" />
                        Scorecard
                      </Link>
                      <Link
                        href="/features/level-10-meetings"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Calendar className="w-4 h-4" />
                        Level 10 Meetings
                      </Link>
                      <Link
                        href="/features/ids-process"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <AlertCircle className="w-4 h-4" />
                        IDS Process
                      </Link>
                      <Link
                        href="/features/accountability-chart"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Network className="w-4 h-4" />
                        Accountability Chart
                      </Link>
                      <Link
                        href="/features/team-management"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Users className="w-4 h-4" />
                        Team Management
                      </Link>
                      <Link
                        href="/features/analytics"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Analytics
                      </Link>
                      <Link
                        href="/features"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Grid className="w-4 h-4" />
                        All Features
                      </Link>
                    </div>
                  </div>

                  {/* Solutions Section */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Solutions
                    </h3>
                    <div className="space-y-1">
                      <Link
                        href="/solutions/leadership"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Leadership Teams
                      </Link>
                      <Link
                        href="/solutions/sales"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sales Teams
                      </Link>
                      <Link
                        href="/solutions/marketing"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Marketing Teams
                      </Link>
                      <Link
                        href="/solutions/operations"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Operations Teams
                      </Link>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Company
                    </h3>
                    <div className="space-y-1">
                      <Link
                        href="/pricing"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Pricing
                      </Link>
                      <Link
                        href="/about"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        About
                      </Link>
                      <Link
                        href="/contact"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Contact
                      </Link>
                      <Link
                        href="/help"
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-black transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Help Center
                      </Link>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="pt-6 border-t border-gray-200 space-y-3">
                    <Link href="/app" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full border-gray-300 text-black hover:bg-gray-50">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/app?page=register" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button className="w-full bg-black text-white hover:bg-gray-900 font-semibold">
                        Get started free
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mega Menu Dropdowns */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg"
            onMouseEnter={() => setActiveMenu(activeMenu)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Features Menu */}
              {activeMenu === "features" && (
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      CORE EOS TOOLS
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/features/eod-reports"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <FileText className="w-4 h-4" />
                          EOD Reports
                        </div>
                        <div className="text-sm text-gray-600">AI-powered daily updates</div>
                      </Link>
                      <Link
                        href="/features/rocks"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <Target className="w-4 h-4" />
                          Quarterly Rocks
                        </div>
                        <div className="text-sm text-gray-600">90-day goal tracking</div>
                      </Link>
                      <Link
                        href="/features/scorecard"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <BarChart2 className="w-4 h-4" />
                          Scorecard
                        </div>
                        <div className="text-sm text-gray-600">Weekly measurables</div>
                      </Link>
                      <Link
                        href="/features/level-10-meetings"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <Calendar className="w-4 h-4" />
                          Level 10 Meetings
                        </div>
                        <div className="text-sm text-gray-600">Structured meeting agendas</div>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      MORE TOOLS
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/features/ids-process"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <AlertCircle className="w-4 h-4" />
                          IDS Process
                        </div>
                        <div className="text-sm text-gray-600">Issue resolution tracking</div>
                      </Link>
                      <Link
                        href="/features/accountability-chart"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <Network className="w-4 h-4" />
                          Accountability Chart
                        </div>
                        <div className="text-sm text-gray-600">Organization structure</div>
                      </Link>
                      <Link
                        href="/features/team-management"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <Users className="w-4 h-4" />
                          Team Management
                        </div>
                        <div className="text-sm text-gray-600">Manage your teams</div>
                      </Link>
                      <Link
                        href="/features/analytics"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <TrendingUp className="w-4 h-4" />
                          Analytics & Insights
                        </div>
                        <div className="text-sm text-gray-600">Performance dashboards</div>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      OVERVIEW
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/features"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <Grid className="w-4 h-4" />
                          All Features
                        </div>
                        <div className="text-sm text-gray-600">See everything Taskspace offers</div>
                      </Link>
                      <Link
                        href="/integrations"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 font-medium text-black mb-1">
                          <Plug className="w-4 h-4" />
                          Integrations
                        </div>
                        <div className="text-sm text-gray-600">Connect your tools</div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Solutions Menu */}
              {activeMenu === "solutions" && (
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      BY TEAM
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/solutions/leadership"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Leadership Teams</div>
                        <div className="text-sm text-gray-600">Run effective L10 meetings</div>
                      </Link>
                      <Link
                        href="/solutions/sales"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Sales Teams</div>
                        <div className="text-sm text-gray-600">Track sales rocks and metrics</div>
                      </Link>
                      <Link
                        href="/solutions/marketing"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Marketing Teams</div>
                        <div className="text-sm text-gray-600">Campaign tracking and analytics</div>
                      </Link>
                      <Link
                        href="/solutions/operations"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Operations Teams</div>
                        <div className="text-sm text-gray-600">Process management and KPIs</div>
                      </Link>
                    </div>
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
