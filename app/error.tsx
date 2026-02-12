"use client"

/**
 * Root-level error boundary
 * Catches errors from the entire application
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
