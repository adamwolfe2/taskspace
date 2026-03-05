"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Zap, TrendingUp, AlertTriangle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface UsageMeterProps {
  showCard?: boolean
  compact?: boolean
  onUpgradeClick?: () => void
}

interface UsageData {
  credits: {
    used: number
    limit: number
    remaining: number
    hasCredits: boolean
  }
  stats: {
    totalCredits: number
    totalTokens: number
    queryCount: number
    byAction: Record<string, number>
  }
  period: {
    start: string
    end: string
  }
}

export function UsageMeter({ showCard = true, compact = false, onUpgradeClick }: UsageMeterProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch("/api/billing/usage")
        const data = await response.json()

        if (data.success && data.data) {
          setUsage(data.data)
        } else {
          setError(data.error || "Failed to load usage")
        }
      } catch {
        setError("Failed to load usage data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [])

  if (isLoading) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Loading" />
          <span className="text-sm">Loading...</span>
        </div>
      )
    }
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" role="status" aria-label="Loading" />
        </CardContent>
      </Card>
    )
  }

  if (error || !usage) {
    if (compact) {
      return <span className="text-sm text-red-500">{error}</span>
    }
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-500">
          {error || "Failed to load usage"}
        </CardContent>
      </Card>
    )
  }

  const { credits, stats } = usage
  const isUnlimited = credits.limit === -1
  const usagePercent = isUnlimited ? 0 : Math.round((credits.used / credits.limit) * 100)
  const isLow = !isUnlimited && credits.remaining < credits.limit * 0.2
  const isExhausted = !isUnlimited && credits.remaining === 0

  // Compact inline version
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className={cn(
            "h-4 w-4",
            isExhausted ? "text-red-500" : isLow ? "text-amber-500" : "text-primary"
          )} />
          <span className="text-sm font-medium">
            {isUnlimited ? (
              <span className="text-primary">Unlimited</span>
            ) : (
              <>
                <span className={cn(
                  isExhausted && "text-red-600",
                  isLow && "text-amber-600"
                )}>
                  {credits.remaining.toLocaleString()}
                </span>
                <span className="text-slate-500"> / {credits.limit.toLocaleString()}</span>
              </>
            )}
          </span>
        </div>
        {!isUnlimited && (
          <Progress
            value={usagePercent}
            className={cn(
              "w-24 h-1.5",
              isExhausted && "[&>div]:bg-red-500",
              isLow && !isExhausted && "[&>div]:bg-amber-500"
            )}
          />
        )}
      </div>
    )
  }

  // Full card version
  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className={cn(
            "h-5 w-5",
            isExhausted ? "text-red-500" : isLow ? "text-amber-500" : "text-primary"
          )} />
          <span className="font-medium">AI Credits</span>
          {isUnlimited && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3 mr-1" />
              Unlimited
            </Badge>
          )}
        </div>
        {!isUnlimited && (
          <span className={cn(
            "text-sm font-medium",
            isExhausted && "text-red-600",
            isLow && !isExhausted && "text-amber-600"
          )}>
            {credits.remaining.toLocaleString()} remaining
          </span>
        )}
      </div>

      {!isUnlimited && (
        <>
          <Progress
            value={usagePercent}
            className={cn(
              "h-2 mb-2",
              isExhausted && "[&>div]:bg-red-500",
              isLow && !isExhausted && "[&>div]:bg-amber-500"
            )}
          />
          <div className="flex justify-between text-xs text-slate-500 mb-4">
            <span>{credits.used.toLocaleString()} used</span>
            <span>{credits.limit.toLocaleString()} total</span>
          </div>
        </>
      )}

      {/* Warning messages */}
      {isExhausted && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Credits exhausted</p>
            <p className="text-sm text-red-600">
              Upgrade your plan to continue using AI features.
            </p>
          </div>
        </div>
      )}

      {isLow && !isExhausted && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Running low on credits</p>
            <p className="text-sm text-amber-600">
              You have {usagePercent}% of your monthly credits remaining.
            </p>
          </div>
        </div>
      )}

      {/* Stats section */}
      {stats.queryCount > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-3">
            <TrendingUp className="h-4 w-4" />
            <span>This month</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold">{stats.queryCount.toLocaleString()}</p>
              <p className="text-xs text-slate-500">AI queries</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{(stats.totalTokens / 1000).toFixed(1)}k</p>
              <p className="text-xs text-slate-500">Tokens processed</p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {(isLow || isExhausted) && onUpgradeClick && (
        <Button
          onClick={onUpgradeClick}
          className={cn(
            "w-full mt-4",
            isExhausted ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
          )}
        >
          Upgrade Plan
        </Button>
      )}
    </>
  )

  if (!showCard) {
    return <div className="space-y-2">{content}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Usage</CardTitle>
        <CardDescription>
          {new Date(usage.period.start).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}

/**
 * Inline usage indicator for headers/navbars
 */
export function UsageIndicator({ onClick }: { onClick?: () => void }) {
  const [usage, setUsage] = useState<UsageData | null>(null)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch("/api/billing/usage")
        const data = await response.json()
        if (data.success && data.data) {
          setUsage(data.data)
        }
      } catch {
        // Silently fail for indicator
      }
    }
    fetchUsage()
  }, [])

  if (!usage) return null

  const { credits } = usage
  const isUnlimited = credits.limit === -1
  const isLow = !isUnlimited && credits.remaining < credits.limit * 0.2
  const isExhausted = !isUnlimited && credits.remaining === 0

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors",
        isExhausted && "bg-red-100 text-red-700 hover:bg-red-200",
        isLow && !isExhausted && "bg-amber-100 text-amber-700 hover:bg-amber-200",
        !isLow && !isExhausted && "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      <Zap className="h-3.5 w-3.5" />
      {isUnlimited ? (
        <span>Unlimited</span>
      ) : (
        <span>{credits.remaining.toLocaleString()}</span>
      )}
    </button>
  )
}
