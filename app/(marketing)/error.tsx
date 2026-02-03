"use client"

/**
 * Marketing pages error boundary
 * Catches errors from marketing/public pages
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
