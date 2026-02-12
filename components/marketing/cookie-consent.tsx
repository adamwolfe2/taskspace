"use client"

import { useState, useEffect } from "react"
import Script from "next/script"

const CONSENT_KEY = "cookie-consent"

export function CookieConsent() {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored)
    } else {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted")
    setConsent("accepted")
    setVisible(false)
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined")
    setConsent("declined")
    setVisible(false)
  }

  return (
    <>
      {consent === "accepted" && (
        <Script
          src="https://cdn.v3.identitypxl.app/pixels/30857139-b1a3-4308-b3f5-9691ae67accf/p.js"
          strategy="afterInteractive"
        />
      )}

      {visible && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-xl bg-white p-4 shadow-lg border border-slate-200 animate-fade-in-up">
          <p className="text-sm text-slate-700 mb-3">
            We use cookies to understand how visitors interact with our site. You can accept or decline tracking cookies.
          </p>
          <div className="flex gap-2">
            <button
              onClick={accept}
              className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={decline}
              className="flex-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  )
}
