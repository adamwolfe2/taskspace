"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type MenuType = "platform" | "integrations" | "templates" | "resources" | null

export function MegaMenu() {
  const [activeMenu, setActiveMenu] = useState<MenuType>(null)

  return (
    <nav className="relative bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black" />
            <span className="text-xl font-bold text-black">hyper</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("platform")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black transition-colors py-2">
                Platform
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  activeMenu === "platform" && "rotate-180"
                )} />
              </button>
            </div>

            <Link href="/integrations" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Integrations
            </Link>

            <Link href="/templates" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Templates
            </Link>

            <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-black transition-colors">
              Pricing
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("resources")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-black transition-colors py-2">
                Resources
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  activeMenu === "resources" && "rotate-180"
                )} />
              </button>
            </div>
          </div>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/app">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-black hover:bg-gray-100">
                Log in
              </Button>
            </Link>
            <Link href="/app?page=register">
              <Button size="sm" className="bg-black text-white hover:bg-gray-900">
                Try for free
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
            className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg"
            onMouseEnter={() => setActiveMenu(activeMenu)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Platform Menu */}
              {activeMenu === "platform" && (
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      FEATURES
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/features"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Chat</div>
                        <div className="text-sm text-gray-600">Instant actions on demand</div>
                      </Link>
                      <Link
                        href="/features"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Agents</div>
                        <div className="text-sm text-gray-600">Autonomous AI that works 24/7</div>
                      </Link>
                      <Link
                        href="/features"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Workflows</div>
                        <div className="text-sm text-gray-600">Build automations with logic</div>
                      </Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      USE CASES
                    </h3>
                    <div className="space-y-2">
                      <Link
                        href="/solutions"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Marketing</div>
                        <div className="text-sm text-gray-600">AI-powered marketing automation and insights</div>
                      </Link>
                      <Link
                        href="/solutions"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Enterprise</div>
                        <div className="text-sm text-gray-600">Enterprise-grade AI solutions for your business</div>
                      </Link>
                      <Link
                        href="/customers"
                        className="block p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="font-medium text-black mb-1">Case Studies</div>
                        <div className="text-sm text-gray-600">Real results from businesses using Hyper AI</div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Resources Menu */}
              {activeMenu === "resources" && (
                <div className="grid grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      Quick Links
                    </h3>
                    <div className="space-y-2">
                      <Link href="/" className="block text-sm text-gray-700 hover:text-black py-1">Home</Link>
                      <Link href="/app" className="block text-sm text-gray-700 hover:text-black py-1">Log in</Link>
                      <Link href="/app?page=register" className="block text-sm text-gray-700 hover:text-black py-1">Sign up</Link>
                      <Link href="/contact" className="block text-sm text-gray-700 hover:text-black py-1">Contact</Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      Product
                    </h3>
                    <div className="space-y-2">
                      <Link href="/features" className="block text-sm text-gray-700 hover:text-black py-1">Features</Link>
                      <Link href="/integrations" className="block text-sm text-gray-700 hover:text-black py-1">Integrations</Link>
                      <Link href="/pricing" className="block text-sm text-gray-700 hover:text-black py-1">Pricing</Link>
                      <Link href="/templates" className="block text-sm text-gray-700 hover:text-black py-1">Templates</Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      Resources
                    </h3>
                    <div className="space-y-2">
                      <Link href="/resources" className="block text-sm text-gray-700 hover:text-black py-1">Blog</Link>
                      <Link href="/help" className="block text-sm text-gray-700 hover:text-black py-1">Documentation</Link>
                      <Link href="/help" className="block text-sm text-gray-700 hover:text-black py-1">FAQ</Link>
                      <Link href="/about" className="block text-sm text-gray-700 hover:text-black py-1">Company</Link>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-black uppercase tracking-wider mb-4">
                      Contact
                    </h3>
                    <div className="space-y-2">
                      <Link href="/contact" className="block text-sm text-gray-700 hover:text-black py-1">Sales</Link>
                      <Link href="/contact" className="block text-sm text-gray-700 hover:text-black py-1">Support</Link>
                      <Link href="#" className="block text-sm text-gray-700 hover:text-black py-1">X (Twitter)</Link>
                      <Link href="#" className="block text-sm text-gray-700 hover:text-black py-1">LinkedIn</Link>
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
