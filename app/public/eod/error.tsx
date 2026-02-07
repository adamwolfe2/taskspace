"use client"

/**
 * Public EOD pages error boundary
 * Catches errors from public EOD report pages
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
