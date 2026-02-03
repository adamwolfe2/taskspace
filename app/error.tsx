"use client"

/**
 * Root-level error boundary
 * Catches errors from the entire application
 */

import { ErrorFallback } from "@/components/error-boundary"
import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error tracking service (e.g., Sentry)
    console.error("Root error boundary caught:", error)
    // TODO: Send to error tracking service
    // Sentry.captureException(error)
  }, [error])

  return <ErrorFallback error={error} reset={reset} />
}
