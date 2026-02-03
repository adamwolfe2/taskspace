"use client"

/**
 * Error Boundary Component
 *
 * Catches React errors and displays a fallback UI instead of crashing the entire app.
 * Includes options to retry (reset) or report the error.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * Or with custom fallback:
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <CustomErrorUI error={error} onRetry={reset} />
 *   )}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ReactNode } from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo)
    }

    // Call optional error handler (e.g., send to Sentry)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError)
      }

      // Default error UI
      return <DefaultErrorFallback error={this.state.error} reset={this.resetError} />
    }

    return this.props.children
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const isDevelopment = process.env.NODE_ENV === "development"

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-2xl w-full">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold mb-2">Something went wrong</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>An unexpected error occurred. We've been notified and are working to fix it.</p>
            {isDevelopment && (
              <div className="mt-4 p-3 bg-slate-900 rounded-md">
                <p className="text-xs font-mono text-red-400 mb-1">Error: {error.message}</p>
                {error.stack && (
                  <pre className="text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex gap-3">
          <Button onClick={reset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        </div>

        {!isDevelopment && (
          <p className="mt-4 text-sm text-slate-600">
            If this problem persists, please contact support with error code:{" "}
            <code className="bg-slate-200 px-2 py-1 rounded text-xs">{Date.now()}</code>
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Compact error fallback for use in smaller UI sections
 */
export function CompactErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm">{error.message || "Something went wrong"}</span>
        <Button size="sm" variant="outline" onClick={reset} className="ml-2">
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Hook version for Next.js App Router error.tsx files
 *
 * Usage in error.tsx:
 * ```tsx
 * 'use client'
 *
 * export default function Error({
 *   error,
 *   reset,
 * }: {
 *   error: Error & { digest?: string }
 *   reset: () => void
 * }) {
 *   return <ErrorFallback error={error} reset={reset} />
 * }
 * ```
 */
export function ErrorFallback({
  error,
  reset,
  compact = false,
}: {
  error: Error
  reset: () => void
  compact?: boolean
}) {
  if (compact) {
    return <CompactErrorFallback error={error} reset={reset} />
  }

  return <DefaultErrorFallback error={error} reset={reset} />
}

/**
 * Async error boundary for Next.js 13+ Server Components
 *
 * Create this as error.tsx in your route folder:
 * ```tsx
 * 'use client'
 *
 * import { ErrorFallback } from '@/components/error-boundary'
 *
 * export default function Error({
 *   error,
 *   reset,
 * }: {
 *   error: Error & { digest?: string }
 *   reset: () => void
 * }) {
 *   return <ErrorFallback error={error} reset={reset} />
 * }
 * ```
 */

export default ErrorBoundary
