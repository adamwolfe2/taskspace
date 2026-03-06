"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import * as Sentry from "@sentry/nextjs"
import { AlertTriangle, RefreshCw, Home, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logger, logError } from "@/lib/logger"

interface Props {
 children: ReactNode
 fallback?: ReactNode
 onError?: (error: Error, errorInfo: ErrorInfo) => void
 showRetry?: boolean
 title?: string
 description?: string
}

interface State {
 hasError: boolean
 error: Error | null
 errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
 public state: State = {
 hasError: false,
 error: null,
 errorInfo: null,
 }

 public static getDerivedStateFromError(error: Error): Partial<State> {
 return { hasError: true, error }
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 // Log error with full context for debugging
 const errorContext = {
   componentStack: errorInfo.componentStack,
   errorName: error.name,
   errorMessage: error.message,
   url: typeof window !== "undefined" ? window.location.href : "unknown",
   userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
   timestamp: new Date().toISOString(),
 }

 logError(logger, "ErrorBoundary caught an error", error, errorContext)

 Sentry.captureException(error, {
   contexts: {
     react: {
       componentStack: errorInfo.componentStack,
     },
   },
 })

 // Also log to console for development visibility
 if (process.env.NODE_ENV === "development") {
   console.error(
     "[ErrorBoundary] Caught error:",
     "\n  Name:", error.name,
     "\n  Message:", error.message,
     "\n  Component Stack:", errorInfo.componentStack,
     "\n  URL:", typeof window !== "undefined" ? window.location.href : "unknown"
   )
 }

 this.setState({ errorInfo })
 this.props.onError?.(error, errorInfo)
 }

 private handleRetry = () => {
 this.setState({ hasError: false, error: null, errorInfo: null })
 }

 private handleGoHome = () => {
 if (typeof window !== "undefined") {
   window.location.href = "/app"
 }
 }

 private handleReportIssue = () => {
 if (!this.state.error) return

 const subject = encodeURIComponent(`Bug Report: ${this.state.error.name}`)
 const body = encodeURIComponent(
   `I encountered an error while using the application.\n\n` +
   `Error: ${this.state.error.message}\n` +
   `Page: ${typeof window !== "undefined" ? window.location.href : "unknown"}\n` +
   `Time: ${new Date().toISOString()}\n\n` +
   `Steps to reproduce:\n1. \n2. \n3. \n\n` +
   `What I expected to happen:\n\n` +
   `What actually happened:\n`
 )

 // Open mailto link for bug reporting
 window.open(`mailto:team@trytaskspace.com?subject=${subject}&body=${body}`, "_blank")
 }

 public render() {
 if (this.state.hasError) {
 if (this.props.fallback) {
 return this.props.fallback
 }

 return (
 <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-lg border border-red-200">
 <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
 <h3 className="text-lg font-semibold text-red-800 mb-1">
 {this.props.title || "Something went wrong"}
 </h3>
 <p className="text-sm text-red-600 text-center mb-4 max-w-md">
 {this.props.description || "An unexpected error occurred. You can try again, go back to the home page, or report this issue if it persists."}
 </p>

 {/* Recovery actions */}
 <div className="flex flex-wrap gap-2 justify-center">
 {this.props.showRetry !== false && (
 <Button
 variant="outline"
 size="sm"
 onClick={this.handleRetry}
 className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
 >
 <RefreshCw className="h-4 w-4" />
 Try Again
 </Button>
 )}
 <Button
 variant="outline"
 size="sm"
 onClick={this.handleGoHome}
 className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
 >
 <Home className="h-4 w-4" />
 Go to Dashboard
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={this.handleReportIssue}
 className="gap-2 border-red-300 text-red-700 hover:bg-red-100"
 >
 <MessageSquare className="h-4 w-4" />
 Report this Issue
 </Button>
 </div>

 {/* Additional help text */}
 <p className="text-xs text-red-400 mt-4 text-center">
 If the problem persists after retrying, try refreshing the page or clearing your browser cache.
 </p>

 {process.env.NODE_ENV === "development" && this.state.error && (
 <details className="mt-4 text-xs text-red-600 max-w-full overflow-auto">
 <summary className="cursor-pointer font-medium">Error Details (Development Only)</summary>
 <pre className="mt-2 p-2 bg-red-100 rounded text-left whitespace-pre-wrap">
 {this.state.error.name}: {this.state.error.message}
 {"\n\n"}
 {this.state.error.stack}
 {this.state.errorInfo?.componentStack && (
   <>
     {"\n\nComponent Stack:"}
     {this.state.errorInfo.componentStack}
   </>
 )}
 </pre>
 </details>
 )}
 </div>
 )
 }

 return this.props.children
 }
}

// Hook version for functional components
export function withErrorBoundary<P extends object>(
 WrappedComponent: React.ComponentType<P>,
 errorBoundaryProps?: Omit<Props, "children">
) {
 return function WithErrorBoundary(props: P) {
 return (
 <ErrorBoundary {...errorBoundaryProps}>
 <WrappedComponent {...props} />
 </ErrorBoundary>
 )
 }
}

// Compact error boundary for smaller sections
export function CompactErrorBoundary({ children, section }: { children: ReactNode; section?: string }) {
 return (
 <ErrorBoundary
 title={`Error loading ${section || "section"}`}
 description="This section couldn't be loaded. Please try refreshing."
 showRetry
 >
 {children}
 </ErrorBoundary>
 )
}
