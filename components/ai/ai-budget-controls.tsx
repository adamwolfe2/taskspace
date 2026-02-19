"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Coins,
  Loader2,
  Settings2,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { AIBudgetSettings } from "@/lib/types"

interface AIBudgetControlsProps {
  organizationId: string
}

interface CreditUsage {
  creditsUsed: number
  creditsLimit: number
  remainingCredits: number
  resetDate?: string
}

export function AIBudgetControls({ organizationId }: AIBudgetControlsProps) {
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [creditUsage, setCreditUsage] = useState<CreditUsage | null>(null)
  const [settings, setSettings] = useState<AIBudgetSettings>({
    id: "",
    organizationId,
    monthlyBudgetCredits: 1000,
    warningThresholdPercent: 80,
    autoApproveEnabled: false,
    autoApproveMinConfidence: 0.9,
    autoApproveTypes: [],
    pauseOnBudgetExceeded: true,
    createdAt: "",
    updatedAt: "",
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch current usage and settings
  useEffect(() => {
    async function fetchData() {
      try {
        const [usageRes, settingsRes] = await Promise.all([
          fetch("/api/billing/ai-usage"),
          fetch("/api/ai/budget-settings"),
        ])

        const usageData = await usageRes.json()
        const settingsData = await settingsRes.json()

        if (usageData.success && usageData.data) {
          setCreditUsage(usageData.data)
        }

        if (settingsData.success && settingsData.data) {
          setSettings(settingsData.data)
        }
      } catch (error) {
        // Error fetching budget data
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate usage percentage
  const usagePercent = creditUsage
    ? Math.round((creditUsage.creditsUsed / creditUsage.creditsLimit) * 100)
    : 0

  const isWarning = usagePercent >= settings.warningThresholdPercent
  const isCritical = usagePercent >= 95

  // Update setting
  const updateSetting = <K extends keyof AIBudgetSettings>(
    key: K,
    value: AIBudgetSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/ai/budget-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Settings saved",
          description: "AI budget settings have been updated",
        })
        setHasChanges(false)
      } else {
        throw new Error(data.error || "Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" role="status" aria-label="Loading" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Credit Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            AI Credits Usage
          </CardTitle>
          <CardDescription>
            Monitor your organization's AI credit consumption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {creditUsage && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{creditUsage.creditsUsed}</span>
                  <span className="text-muted-foreground">
                    / {creditUsage.creditsLimit} credits
                  </span>
                </div>
                <Badge
                  variant={isCritical ? "destructive" : isWarning ? "warning" : "secondary"}
                  className="gap-1"
                >
                  {isCritical ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <TrendingUp className="h-3 w-3" />
                  )}
                  {usagePercent}% used
                </Badge>
              </div>

              <Progress
                value={usagePercent}
                className={cn(
                  "h-3",
                  isCritical && "[&>div]:bg-destructive",
                  isWarning && !isCritical && "[&>div]:bg-warning"
                )}
              />

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{creditUsage.remainingCredits} credits remaining</span>
                {creditUsage.resetDate && (
                  <span>
                    Resets {new Date(creditUsage.resetDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {isCritical && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Credit limit almost reached</p>
                    <p className="text-muted-foreground">
                      Consider upgrading your plan or adjusting your AI usage settings.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Budget Settings Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Budget Controls
            </CardTitle>
            <CardDescription>
              Configure AI suggestion generation and approval settings
            </CardDescription>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="warningThreshold">Warning Threshold</Label>
              <span className="text-sm text-muted-foreground">
                {settings.warningThresholdPercent}%
              </span>
            </div>
            <Input
              id="warningThreshold"
              type="range"
              min="50"
              max="95"
              step="5"
              value={settings.warningThresholdPercent}
              onChange={(e) =>
                updateSetting("warningThresholdPercent", parseInt(e.target.value))
              }
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              Show a warning when usage reaches this percentage of your credit limit
            </p>
          </div>

          {/* Pause on budget exceeded */}
          <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="pauseOnExceeded" className="text-base">
                Pause suggestions when budget exceeded
              </Label>
              <p className="text-sm text-muted-foreground">
                Stop generating AI suggestions when you hit your credit limit
              </p>
            </div>
            <Switch
              id="pauseOnExceeded"
              checked={settings.pauseOnBudgetExceeded}
              onCheckedChange={(checked) => updateSetting("pauseOnBudgetExceeded", checked)}
            />
          </div>

          {/* Auto-approve settings */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="autoApprove" className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Auto-approve high confidence suggestions
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically apply suggestions above a confidence threshold
                </p>
              </div>
              <Switch
                id="autoApprove"
                checked={settings.autoApproveEnabled}
                onCheckedChange={(checked) => updateSetting("autoApproveEnabled", checked)}
              />
            </div>

            {settings.autoApproveEnabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="minConfidence">Minimum Confidence</Label>
                  <Select
                    value={String(settings.autoApproveMinConfidence)}
                    onValueChange={(v) =>
                      updateSetting("autoApproveMinConfidence", parseFloat(v))
                    }
                  >
                    <SelectTrigger id="minConfidence" className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.95">95% (Very High)</SelectItem>
                      <SelectItem value="0.9">90% (High)</SelectItem>
                      <SelectItem value="0.85">85% (Moderate)</SelectItem>
                      <SelectItem value="0.8">80% (Standard)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Auto-approve suggestion types</Label>
                  <div className="flex flex-wrap gap-2">
                    {["rock_update", "task", "follow_up"].map((type) => (
                      <Button
                        key={type}
                        variant={
                          settings.autoApproveTypes.includes(type) ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => {
                          const current = settings.autoApproveTypes
                          if (current.includes(type)) {
                            updateSetting(
                              "autoApproveTypes",
                              current.filter((t) => t !== type)
                            )
                          } else {
                            updateSetting("autoApproveTypes", [...current, type])
                          }
                        }}
                      >
                        {type.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Blockers and alerts always require manual review
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <Info className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Auto-approved suggestions will deduct credits automatically. Monitor your usage carefully.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
