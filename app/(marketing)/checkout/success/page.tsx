"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircleIcon, ArrowRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline"

type ClaimStatus = "loading" | "claimed" | "pending_auth" | "already_claimed" | "error"

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="bg-white min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-lg w-full text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-6 animate-pulse">
            <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-black mb-3">Setting up your account...</h1>
          <p className="text-gray-600">Verifying your payment and activating your subscription.</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [status, setStatus] = useState<ClaimStatus>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setStatus("pending_auth")
      return
    }

    async function claimSubscription() {
      try {
        const response = await fetch("/api/billing/claim-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        })

        const result = await response.json()

        if (response.status === 401) {
          // Not authenticated — they need to sign up / log in first
          setStatus("pending_auth")
          return
        }

        if (result.success) {
          setStatus(result.data?.alreadyLinked ? "already_claimed" : "claimed")
        } else {
          setErrorMessage(result.error || "Something went wrong")
          setStatus("error")
        }
      } catch {
        setErrorMessage("Unable to verify your subscription. Please try again.")
        setStatus("error")
      }
    }

    claimSubscription()
  }, [sessionId])

  return (
    <div className="bg-white min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-6 animate-pulse">
              <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-black animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-3">
              Setting up your account...
            </h1>
            <p className="text-gray-600">
              Verifying your payment and activating your subscription.
            </p>
          </>
        )}

        {status === "claimed" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-3">
              You're all set!
            </h1>
            <p className="text-gray-600 mb-2">
              Your subscription is active and your 14-day free trial has started.
              You won't be charged until day 15.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              You can manage your subscription and payment method anytime from Settings.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Go to Dashboard <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        )}

        {status === "already_claimed" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-3">
              Subscription already active
            </h1>
            <p className="text-gray-600 mb-8">
              Your subscription is already linked to your account. You're good to go!
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
            >
              Go to Dashboard <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </>
        )}

        {status === "pending_auth" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-3">
              Payment received!
            </h1>
            <p className="text-gray-600 mb-2">
              Your 14-day free trial has been activated. Now create your account
              to start using Taskspace.
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Your subscription will automatically be linked to your account using
              the email address you provided at checkout.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={sessionId ? `/app?page=register&checkout_session=${sessionId}` : "/app?page=register"}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Create Account <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href={sessionId ? `/app?checkout_session=${sessionId}` : "/app"}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-black hover:bg-gray-50 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-black mb-3">
              We're working on it
            </h1>
            <p className="text-gray-600 mb-2">
              {errorMessage || "We couldn't verify your subscription right now."}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Don't worry — your payment was received. Your subscription will be
              linked to your account automatically, or you can contact support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Go to Dashboard <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-black hover:bg-gray-50 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
