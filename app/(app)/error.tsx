"use client"

/**
 * App pages error boundary
 * Catches errors from app route group pages (e.g., editor)
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
