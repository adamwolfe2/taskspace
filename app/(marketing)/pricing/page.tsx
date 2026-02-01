"use client"

import { motion } from "framer-motion"
import { useState } from "react"
import Link from "next/link"
import {
  CheckCircle,
  ArrowRight,
  Users,
  Zap,
  Shield,
  Crown,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

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

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  const plans = [
    {
      name: "Free Forever",
      price: "$0",
      description: "Perfect for trying EOS methodology",
      features: [
        "Up to 5 team members",
        "Unlimited EOD reports",
        "3 Rocks per quarter",
        "Basic scorecard",
        "Level 10 meeting template",
        "Community support",
      ],
      cta: "Get Started",
      popular: false,
      color: "slate",
    },
    {
      name: "Unlimited",
      price: billingCycle === "monthly" ? "$7" : "$5",
      priceSubtext: "per user/month",
      description: "For teams committed to EOS",
      features: [
        "Everything in Free +",
        "Unlimited team members",
        "Unlimited Rocks",
        "Advanced scorecard with custom metrics",
        "IDS process tracking",
        "V/TO (Vision/Traction Organizer)",
        "Accountability Chart",
        "Email support",
        "Data export",
      ],
      cta: "Get started",
      popular: false,
      color: "blue",
    },
    {
      name: "Business",
      price: billingCycle === "monthly" ? "$12" : "$9",
      priceSubtext: "per user/month",
      description: "For scaling EOS organizations",
      features: [
        "Everything in Unlimited +",
        "EOS AI Agents (EOD, Rock, Scorecard)",
        "Advanced analytics & insights",
        "Custom integrations (Slack, Calendar)",
        "Google SSO",
        "Unlimited dashboards",
        "API access",
        "Priority support",
        "Quarterly business reviews",
      ],
      cta: "Get started",
      popular: true,
      color: "purple",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      features: [
        "Everything in Business +",
        "White label branding",
        "Dedicated account manager",
        "Custom onboarding & training",
        "Advanced security (SAML SSO)",
        "SLA guarantee",
        "Custom integrations",
        "Dedicated infrastructure",
        "24/7 phone support",
      ],
      cta: "Get a Demo",
      popular: false,
      color: "gradient",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg" />
              <span className="text-xl font-bold text-slate-900">Align</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/app">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/app?page=register">
                <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <h1 className="text-6xl font-bold text-slate-900 mb-4">
                The best work solution,
                <br />
                for the best price.
              </h1>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={cn(
                  "text-lg font-medium transition-colors",
                  billingCycle === "monthly" ? "text-slate-900" : "text-slate-400"
                )}
              >
                Monthly
              </button>
              <div className="relative">
                <button
                  onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                  className={cn(
                    "w-14 h-8 rounded-full transition-colors",
                    billingCycle === "yearly" ? "bg-slate-900" : "bg-slate-300"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-1 w-6 h-6 bg-white rounded-full transition-transform",
                      billingCycle === "yearly" ? "translate-x-7" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={cn(
                  "text-lg font-medium transition-colors",
                  billingCycle === "yearly" ? "text-slate-900" : "text-slate-400"
                )}
              >
                Yearly
              </button>
              {billingCycle === "yearly" && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Save up to 30%
                </Badge>
              )}
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="border-slate-300">
                <Shield className="w-4 h-4 mr-1" />
                100% Money-back Guarantee
              </Badge>
            </motion.div>
          </motion.div>

          {/* Pricing Cards */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"
          >
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={cn(
                  "relative rounded-2xl border p-8 bg-white flex flex-col",
                  plan.popular
                    ? "border-purple-500 shadow-2xl shadow-purple-500/20 scale-105"
                    : "border-slate-200"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white border-0 shadow-lg">
                      <Crown className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    {plan.priceSubtext && (
                      <span className="text-slate-600 ml-2">{plan.priceSubtext}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/app?page=register" className="w-full">
                  <Button
                    className={cn(
                      "w-full rounded-full",
                      plan.popular
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-slate-300 hover:bg-slate-50"
                    )}
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Compare plans and features
            </h2>
            <p className="text-xl text-slate-600">
              Everything you need to run on EOS, at every stage
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold text-slate-900">Features</th>
                  <th className="py-4 px-6 font-semibold text-slate-900">Free</th>
                  <th className="py-4 px-6 font-semibold text-slate-900">Unlimited</th>
                  <th className="py-4 px-6 font-semibold text-purple-600 bg-purple-50">Business</th>
                  <th className="py-4 px-6 font-semibold text-slate-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[
                  { feature: "Team members", free: "5", unlimited: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
                  { feature: "EOD Reports", free: "✓", unlimited: "✓", business: "✓ + AI", enterprise: "✓ + AI" },
                  { feature: "Quarterly Rocks", free: "3", unlimited: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
                  { feature: "Scorecard", free: "Basic", unlimited: "Advanced", business: "Advanced + AI", enterprise: "Custom" },
                  { feature: "Level 10 Meetings", free: "✓", unlimited: "✓", business: "✓", enterprise: "✓" },
                  { feature: "IDS Process", free: "—", unlimited: "✓", business: "✓", enterprise: "✓" },
                  { feature: "Accountability Chart", free: "—", unlimited: "✓", business: "✓", enterprise: "✓" },
                  { feature: "Vision/Traction Organizer", free: "—", unlimited: "✓", business: "✓", enterprise: "✓" },
                  { feature: "AI Agents", free: "—", unlimited: "—", business: "✓", enterprise: "✓" },
                  { feature: "API Access", free: "—", unlimited: "—", business: "✓", enterprise: "✓" },
                  { feature: "SSO", free: "—", unlimited: "—", business: "Google", enterprise: "SAML" },
                  { feature: "Support", free: "Community", unlimited: "Email", business: "Priority", enterprise: "24/7 Phone" },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6 font-medium text-slate-900">{row.feature}</td>
                    <td className="py-4 px-6 text-center text-slate-600">{row.free}</td>
                    <td className="py-4 px-6 text-center text-slate-600">{row.unlimited}</td>
                    <td className="py-4 px-6 text-center font-semibold text-purple-600 bg-purple-50">{row.business}</td>
                    <td className="py-4 px-6 text-center text-slate-600">{row.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                question: "What happens after my free trial?",
                answer: "The Free Forever plan never expires. You can use it indefinitely with up to 5 team members. Upgrade anytime to unlock unlimited users and advanced features.",
              },
              {
                question: "Can I change plans later?",
                answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.",
              },
              {
                question: "What's included in EOS AI Agents?",
                answer: "AI Agents automatically organize your EOD reports, track Rock progress, update your scorecard, and prepare Level 10 meetings. They learn your team's patterns and save hours of manual work every week.",
              },
              {
                question: "Do you offer discounts for annual billing?",
                answer: "Yes! Annual billing saves you up to 30% compared to monthly pricing. Plus you lock in your rate for the year.",
              },
              {
                question: "Is my data secure?",
                answer: "Yes. We're SOC 2 Type II certified with enterprise-grade encryption. Your data is backed up daily and never used to train AI models.",
              },
              {
                question: "Can I get a custom plan?",
                answer: "Enterprise customers can work with our team to create a custom plan with dedicated infrastructure, advanced security, and tailored features. Contact sales to discuss your needs.",
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-slate-50 rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-3">{faq.question}</h3>
                <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl mx-auto mb-8" />
          <h2 className="text-5xl font-bold text-white mb-6">
            Start running on EOS today
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of teams executing flawlessly with Align
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
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
