"use client"

/**
 * Authenticated pages error boundary
 * Catches errors from authenticated route group pages (e.g., settings)
 */

import { ErrorFallback } from "@/components/error-boundary"
import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return <ErrorFallback error={error} reset={reset} />
}
