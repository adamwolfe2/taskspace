"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Check,
  X,
  ArrowRight,
  Zap,
  Building2,
  Users,
  HelpCircle,
  ChevronDown,
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

const plans = [
  {
    name: "Starter",
    description: "Perfect for small teams getting started with accountability",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      { name: "Up to 5 team members", included: true },
      { name: "Basic EOD reports", included: true },
      { name: "3 active rocks per user", included: true },
      { name: "Basic analytics", included: true },
      { name: "Email support", included: true },
      { name: "AI report suggestions", included: false },
      { name: "Custom templates", included: false },
      { name: "Manager dashboards", included: false },
      { name: "API access", included: false },
      { name: "SSO/SAML", included: false },
    ],
    cta: "Get Started Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing teams that need advanced accountability tools",
    monthlyPrice: 12,
    annualPrice: 10,
    features: [
      { name: "Up to 50 team members", included: true },
      { name: "AI-powered EOD reports", included: true },
      { name: "Unlimited rocks", included: true },
      { name: "Advanced analytics", included: true },
      { name: "Priority email support", included: true },
      { name: "AI report suggestions", included: true },
      { name: "Custom templates", included: true },
      { name: "Manager dashboards", included: true },
      { name: "API access", included: false },
      { name: "SSO/SAML", included: false },
    ],
    cta: "Start Free Trial",
    href: "/register?plan=professional",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For organizations requiring advanced security and support",
    monthlyPrice: null,
    annualPrice: null,
    features: [
      { name: "Unlimited team members", included: true },
      { name: "AI-powered EOD reports", included: true },
      { name: "Unlimited rocks", included: true },
      { name: "Custom analytics & reporting", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "AI report suggestions", included: true },
      { name: "Custom templates", included: true },
      { name: "Manager dashboards", included: true },
      { name: "Full API access", included: true },
      { name: "SSO/SAML & SCIM", included: true },
    ],
    cta: "Contact Sales",
    href: "/contact?type=enterprise",
    popular: false,
  },
]

const faqs = [
  {
    question: "How does the free trial work?",
    answer:
      "You can try any paid plan free for 14 days. No credit card required. At the end of your trial, you can choose to subscribe or continue with our free Starter plan.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be prorated for the remainder of your billing period. When downgrading, changes take effect at the next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express, Discover) and can invoice annually for Enterprise customers.",
  },
  {
    question: "Is there a discount for nonprofits or education?",
    answer:
      "Yes! We offer 50% off for verified nonprofits and educational institutions. Contact our sales team to learn more.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your data remains accessible for 30 days after cancellation. You can export all your data at any time. After 30 days, data is permanently deleted per our privacy policy.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "We offer a full refund within the first 14 days of a paid subscription if you're not satisfied. After that, we don't provide refunds for partial months.",
  },
]

const comparisonFeatures = [
  { category: "Team Management", features: [
    { name: "Team members", starter: "5", professional: "50", enterprise: "Unlimited" },
    { name: "Teams/departments", starter: "1", professional: "10", enterprise: "Unlimited" },
    { name: "Role-based permissions", starter: true, professional: true, enterprise: true },
    { name: "Custom roles", starter: false, professional: true, enterprise: true },
  ]},
  { category: "EOD Reports", features: [
    { name: "Daily reports", starter: true, professional: true, enterprise: true },
    { name: "AI suggestions", starter: false, professional: true, enterprise: true },
    { name: "Custom templates", starter: false, professional: true, enterprise: true },
    { name: "Blocker escalation", starter: true, professional: true, enterprise: true },
  ]},
  { category: "Rocks & Goals", features: [
    { name: "Active rocks per user", starter: "3", professional: "Unlimited", enterprise: "Unlimited" },
    { name: "Milestone tracking", starter: true, professional: true, enterprise: true },
    { name: "Goal alignment", starter: false, professional: true, enterprise: true },
    { name: "OKR support", starter: false, professional: true, enterprise: true },
  ]},
  { category: "Analytics", features: [
    { name: "Basic dashboards", starter: true, professional: true, enterprise: true },
    { name: "Team analytics", starter: false, professional: true, enterprise: true },
    { name: "Custom reports", starter: false, professional: true, enterprise: true },
    { name: "Data export", starter: false, professional: true, enterprise: true },
  ]},
  { category: "Support & Security", features: [
    { name: "Email support", starter: true, professional: true, enterprise: true },
    { name: "Priority support", starter: false, professional: true, enterprise: true },
    { name: "Phone support", starter: false, professional: false, enterprise: true },
    { name: "SSO/SAML", starter: false, professional: false, enterprise: true },
    { name: "Audit logs", starter: false, professional: false, enterprise: true },
    { name: "SLA guarantee", starter: false, professional: false, enterprise: true },
  ]},
]

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
              Simple, Transparent Pricing
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6"
            >
              Plans That Scale With{" "}
              <span className="text-gradient-primary">Your Team</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8"
            >
              Start free and upgrade as you grow. All plans include a 14-day free
              trial with no credit card required.
            </motion.p>

            {/* Billing Toggle */}
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-4 p-1.5 bg-slate-100 rounded-xl"
            >
              <button
                onClick={() => setIsAnnual(false)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                  !isAnnual
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                  isAnnual
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                Annual
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Save 17%
                </span>
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                className={cn(
                  "relative rounded-2xl p-8 transition-all",
                  plan.popular
                    ? "bg-slate-900 text-white shadow-2xl scale-105 z-10"
                    : "bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="px-4 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-full shadow-lg">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3
                    className={cn(
                      "text-xl font-semibold mb-2",
                      plan.popular ? "text-white" : "text-slate-900"
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={cn(
                      "text-sm",
                      plan.popular ? "text-slate-300" : "text-slate-600"
                    )}
                  >
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  {plan.monthlyPrice !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span
                        className={cn(
                          "text-4xl font-bold",
                          plan.popular ? "text-white" : "text-slate-900"
                        )}
                      >
                        ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span
                        className={cn(
                          "text-sm",
                          plan.popular ? "text-slate-300" : "text-slate-600"
                        )}
                      >
                        /user/month
                      </span>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "text-4xl font-bold",
                        plan.popular ? "text-white" : "text-slate-900"
                      )}
                    >
                      Custom
                    </div>
                  )}
                  {plan.monthlyPrice !== null && isAnnual && (
                    <p
                      className={cn(
                        "text-sm mt-1",
                        plan.popular ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      Billed annually
                    </p>
                  )}
                </div>

                <Link
                  href={plan.href}
                  className={cn(
                    "block w-full py-3 text-center font-semibold rounded-xl transition-all mb-8",
                    plan.popular
                      ? "bg-white text-slate-900 hover:bg-slate-100"
                      : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg hover:shadow-red-500/25"
                  )}
                >
                  {plan.cta}
                </Link>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check
                          className={cn(
                            "w-5 h-5",
                            plan.popular ? "text-emerald-400" : "text-emerald-600"
                          )}
                        />
                      ) : (
                        <X
                          className={cn(
                            "w-5 h-5",
                            plan.popular ? "text-slate-500" : "text-slate-300"
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          "text-sm",
                          feature.included
                            ? plan.popular
                              ? "text-slate-200"
                              : "text-slate-700"
                            : plan.popular
                            ? "text-slate-500"
                            : "text-slate-400"
                        )}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Enterprise Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
          >
            <div className="grid md:grid-cols-2 gap-8 p-8 lg:p-12">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      Enterprise
                    </h2>
                    <p className="text-slate-600">For large organizations</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-6">
                  Need a custom solution for your organization? Our Enterprise plan
                  includes advanced security features, dedicated support, and
                  flexible deployment options.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Custom contract & SLA",
                    "Dedicated account manager",
                    "SSO/SAML & SCIM provisioning",
                    "Advanced audit logs",
                    "Custom integrations",
                    "On-premise deployment option",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact?type=enterprise"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Contact Sales
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="flex items-center justify-center bg-slate-50 rounded-xl p-8">
                <div className="text-center">
                  <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    Trusted by 500+ teams
                  </p>
                  <p className="text-slate-500">
                    Including Fortune 500 companies
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Compare Plans
              </h2>
              <p className="text-lg text-slate-600">
                See all features side-by-side
              </p>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="overflow-x-auto rounded-xl border border-slate-200"
            >
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-6 font-semibold text-slate-900">
                      Features
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-900">
                      Starter
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-900 bg-red-50">
                      Professional
                    </th>
                    <th className="text-center py-4 px-6 font-semibold text-slate-900">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((category) => (
                    <>
                      <tr key={category.category} className="bg-slate-50/50">
                        <td
                          colSpan={4}
                          className="py-3 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wide"
                        >
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr
                          key={feature.name}
                          className="border-b border-slate-100 hover:bg-slate-50/50"
                        >
                          <td className="py-3 px-6 text-slate-700">
                            {feature.name}
                          </td>
                          <td className="text-center py-3 px-6">
                            {typeof feature.starter === "boolean" ? (
                              feature.starter ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-slate-700">
                                {feature.starter}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-3 px-6 bg-red-50/30">
                            {typeof feature.professional === "boolean" ? (
                              feature.professional ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-slate-700">
                                {feature.professional}
                              </span>
                            )}
                          </td>
                          <td className="text-center py-3 px-6">
                            {typeof feature.enterprise === "boolean" ? (
                              feature.enterprise ? (
                                <Check className="w-5 h-5 text-emerald-600 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-slate-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-slate-700">
                                {feature.enterprise}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-100 text-red-600 text-sm font-medium mb-4">
                <HelpCircle className="w-4 h-4" />
                FAQ
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-slate-600">
                Have questions? We&apos;ve got answers.
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={faq.question}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-slate-400 transition-transform",
                        openFaq === index && "rotate-180"
                      )}
                    />
                  </button>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-6 text-slate-600"
                    >
                      {faq.answer}
                    </motion.div>
                  )}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
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
              Still Have Questions?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-600 mb-8"
            >
              Our team is here to help you find the perfect plan for your
              organization.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-shadow"
              >
                Contact Sales
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
