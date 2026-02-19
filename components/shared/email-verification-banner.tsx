"use client"

import { useState } from "react"
import { Mail, X, Loader2 } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"

export function EmailVerificationBanner() {
  const { emailVerified, isDemoMode } = useApp()
  const [dismissed, setDismissed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  // Don't show if verified, dismissed, or in demo mode
  if (emailVerified || dismissed || isDemoMode) return null

  const handleResend = async () => {
    setResending(true)
    setResendMessage(null)

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      })
      const data = await res.json()

      if (data.success) {
        setResendMessage("Verification email sent! Check your inbox.")
      } else {
        setResendMessage(data.error || "Failed to send. Try again later.")
      }
    } catch {
      setResendMessage("Failed to send. Try again later.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <Mail className="h-4 w-4 flex-shrink-0" />
        <span>
          {resendMessage || (
            <>
              Please verify your email address.{" "}
              <button
                onClick={handleResend}
                disabled={resending}
                className="font-semibold underline hover:no-underline disabled:opacity-50"
              >
                {resending ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Resend verification email"
                )}
              </button>
            </>
          )}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-800 p-1"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
