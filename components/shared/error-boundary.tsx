"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

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
}

export class ErrorBoundary extends Component<Props, State> {
 public state: State = {
 hasError: false,
 error: null,
 }

 public static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error }
 }

 public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
 console.error("ErrorBoundary caught an error:", error, errorInfo)
 this.props.onError?.(error, errorInfo)
 }

 private handleRetry = () => {
 this.setState({ hasError: false, error: null })
 }

 public render() {
 if (this.state.hasError) {
 if (this.props.fallback) {
 return this.props.fallback
 }

 return (
 <div className="flex flex-col items-center justify-center p-6 bg-red-50  rounded-lg border border-red-200 ">
 <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
 <h3 className="text-lg font-semibold text-red-800  mb-1">
 {this.props.title || "Something went wrong"}
 </h3>
 <p className="text-sm text-red-600  text-center mb-4">
 {this.props.description || "An error occurred while rendering this section."}
 </p>
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
 {process.env.NODE_ENV === "development" && this.state.error && (
 <details className="mt-4 text-xs text-red-600  max-w-full overflow-auto">
 <summary className="cursor-pointer">Error Details</summary>
 <pre className="mt-2 p-2 bg-red-100  rounded text-left whitespace-pre-wrap">
 {this.state.error.toString()}
 {"\n"}
 {this.state.error.stack}
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
