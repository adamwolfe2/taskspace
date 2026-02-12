"use client"

import { ReactNode } from "react"
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, LockKeyhole, LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  icon?: LucideIcon | ReactNode
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ErrorState({
  icon: IconProp,
  title = "Something went wrong",
  message = "Please try again later",
  onRetry,
  retryLabel = "Try Again",
  className,
  size = "md",
}: ErrorStateProps) {
  const sizeStyles = {
    sm: {
      container: "py-6 px-4",
      icon: "h-6 w-6",
      iconWrapper: "h-10 w-10",
      title: "text-sm font-medium",
      message: "text-xs",
    },
    md: {
      container: "py-10 px-6",
      icon: "h-8 w-8",
      iconWrapper: "h-14 w-14",
      title: "text-base font-semibold",
      message: "text-sm",
    },
    lg: {
      container: "py-16 px-8",
      icon: "h-10 w-10",
      iconWrapper: "h-20 w-20",
      title: "text-lg font-semibold",
      message: "text-base",
    },
  }

  const styles = sizeStyles[size]

  // Detect if icon is a component type (function or forwardRef object) vs a rendered ReactNode
  const IconComponent = IconProp && (typeof IconProp === "function" || (typeof IconProp === "object" && IconProp !== null && "render" in IconProp))
    ? (IconProp as React.ElementType)
    : null

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        styles.container,
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-red-50 flex items-center justify-center mb-4",
          styles.iconWrapper
        )}
      >
        {IconComponent ? (
          <IconComponent className={cn("text-red-500", styles.icon)} />
        ) : (
          (IconProp as React.ReactNode) || <AlertCircle className={cn("text-red-500", styles.icon)} />
        )}
      </div>
      <h3 className={cn("text-gray-900 mb-1", styles.title)}>{title}</h3>
      {message && (
        <p className={cn("text-gray-500 max-w-sm mb-4", styles.message)}>
          {message}
        </p>
      )}
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size={size === "sm" ? "sm" : "default"}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

// Pre-configured error states for common scenarios
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={WifiOff}
      title="Connection lost"
      message="Please check your internet connection and try again."
      onRetry={onRetry}
      retryLabel="Reconnect"
    />
  )
}

export function ServerErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      icon={ServerCrash}
      title="Server error"
      message="We're experiencing technical difficulties. Please try again in a moment."
      onRetry={onRetry}
    />
  )
}

export function NotFoundErrorState({ onGoBack }: { onGoBack?: () => void }) {
  return (
    <ErrorState
      icon={AlertCircle}
      title="Not found"
      message="The page or resource you're looking for doesn't exist."
      onRetry={onGoBack}
      retryLabel="Go Back"
    />
  )
}

export function UnauthorizedErrorState({ onLogin }: { onLogin?: () => void }) {
  return (
    <ErrorState
      icon={LockKeyhole}
      title="Access denied"
      message="You don't have permission to view this content."
      onRetry={onLogin}
      retryLabel="Sign In"
    />
  )
}

export function LoadingErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Failed to load"
      message="We couldn't load the data. Please try again."
      onRetry={onRetry}
    />
  )
}
