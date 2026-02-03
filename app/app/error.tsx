"use client"

/**
 * Authenticated app error boundary
 * Catches errors from authenticated application pages
 */

import { ErrorFallback } from "@/components/error-boundary"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorFallback error={error} reset={reset} />
}
