"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckIcon } from "@heroicons/react/24/outline"
import { formatPrice, calculateYearlySavings, type PlanConfig } from "@/lib/billing/plans"
import { STRIPE_PAYMENT_LINKS } from "@/lib/integrations/stripe-config"

interface PricingCardsProps {
  plans: PlanConfig[]
}

export function PricingCards({ plans }: PricingCardsProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly")

  return (
    <div>
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              billingCycle === "monthly"
                ? "bg-white shadow-sm text-black"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
              billingCycle === "yearly"
                ? "bg-white shadow-sm text-black"
                : "text-gray-600 hover:text-black"
            }`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3 items-start">
        {plans.map((plan) => {
          const isPopular = plan.popular
          const isFree = plan.id === "free"
          const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-8 ${
                isPopular
                  ? "bg-black text-white ring-2 ring-black shadow-2xl lg:scale-105 lg:z-10 lg:p-10"
                  : "bg-white text-black ring-1 ring-gray-200"
              }`}
            >
              {plan.badge && isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="rounded-full bg-white text-black px-4 py-1.5 text-xs font-bold uppercase tracking-wide shadow-lg border border-gray-200">
                    Most Popular
                  </div>
                </div>
              )}

              {plan.badge && !isPopular && (
                <div className="mb-4 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {plan.badge}
                </div>
              )}

              <h3
                className={`text-2xl font-bold ${
                  isPopular ? "text-white" : "text-black"
                }`}
              >
                {plan.name}
              </h3>

              <p
                className={`mt-3 text-sm leading-6 ${
                  isPopular ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {plan.description}
              </p>

              <p className="mt-6 flex items-baseline gap-x-1">
                <span
                  className={`text-3xl sm:text-5xl font-bold tracking-tight ${
                    isPopular ? "text-white" : "text-black"
                  }`}
                >
                  {billingCycle === "yearly"
                    ? formatPrice(price / 12)
                    : formatPrice(price)}
                </span>
                <span
                  className={`text-sm font-semibold leading-6 ${
                    isPopular ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  /user/month
                </span>
              </p>

              <p
                className={`mt-1 text-xs ${
                  isPopular ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {isFree
                  ? "Free forever, no credit card needed"
                  : billingCycle === "yearly"
                  ? "14-day free trial · Billed annually"
                  : "14-day free trial · Billed monthly"}
              </p>

              {billingCycle === "yearly" && calculateYearlySavings(plan) > 0 && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    isPopular ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Save {formatPrice(calculateYearlySavings(plan))}/user/year
                  vs monthly
                </p>
              )}

              <Link
                href={
                  isFree
                    ? "/app?page=register"
                    : (STRIPE_PAYMENT_LINKS[plan.id]?.[billingCycle] || "/app?page=register")
                }
                className={`mt-8 block w-full rounded-lg px-4 py-3.5 text-center text-sm font-semibold shadow-sm transition-colors ${
                  isPopular
                    ? "bg-white text-black hover:bg-gray-100"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                {plan.cta}
              </Link>

              <ul
                role="list"
                className={`mt-8 space-y-3 text-sm leading-6 ${
                  isPopular ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <li className="flex gap-x-3">
                  <CheckIcon
                    className={`h-6 w-5 flex-none ${
                      isPopular ? "text-white" : "text-black"
                    }`}
                  />
                  <span>
                    <strong
                      className={`font-semibold ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    >
                      {plan.limits.maxUsers === null
                        ? "Unlimited"
                        : plan.limits.maxUsers}
                    </strong>{" "}
                    users
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon
                    className={`h-6 w-5 flex-none ${
                      isPopular ? "text-white" : "text-black"
                    }`}
                  />
                  <span>
                    <strong
                      className={`font-semibold ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    >
                      {plan.limits.maxWorkspaces === null
                        ? "Unlimited"
                        : plan.limits.maxWorkspaces}
                    </strong>{" "}
                    workspace{plan.limits.maxWorkspaces !== 1 ? "s" : ""}
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon
                    className={`h-6 w-5 flex-none ${
                      isPopular ? "text-white" : "text-black"
                    }`}
                  />
                  <span>
                    <strong
                      className={`font-semibold ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    >
                      {plan.features.unlimitedAI
                        ? "Unlimited"
                        : plan.limits.aiCreditsPerUser}
                    </strong>{" "}
                    AI credits/user
                  </span>
                </li>
                <li className="flex gap-x-3">
                  <CheckIcon
                    className={`h-6 w-5 flex-none ${
                      isPopular ? "text-white" : "text-black"
                    }`}
                  />
                  <span>{plan.features.responseTime} support</span>
                </li>
                {plan.features.asanaSync && (
                  <li className="flex gap-x-3">
                    <CheckIcon
                      className={`h-6 w-5 flex-none ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    />
                    <span>Asana & Google Calendar sync</span>
                  </li>
                )}
                {plan.features.customBranding && (
                  <li className="flex gap-x-3">
                    <CheckIcon
                      className={`h-6 w-5 flex-none ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    />
                    <span>Custom branding & API access</span>
                  </li>
                )}
                {plan.features.ssoAuth && (
                  <li className="flex gap-x-3">
                    <CheckIcon
                      className={`h-6 w-5 flex-none ${
                        isPopular ? "text-white" : "text-black"
                      }`}
                    />
                    <span>SSO/SAML & dedicated support</span>
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
