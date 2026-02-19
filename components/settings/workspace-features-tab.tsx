/**
 * Workspace Features Tab
 *
 * Admin UI for configuring workspace feature toggles
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Loader2,
  Save,
  RotateCcw,
  Search,
  Layers,
  Zap,
  Link,
  Sparkles,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useToast } from "@/hooks/use-toast"
import { FeatureToggle } from "./feature-toggle"
import {
  WORKSPACE_FEATURE_METADATA,
  FEATURE_CATEGORIES,
  type WorkspaceFeatureToggles,
  type WorkspaceFeatureKey,
  type WorkspaceFeatureConfig,
} from "@/lib/types/workspace-features"

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  core: Layers,
  productivity: Zap,
  integrations: Link,
  advanced: Sparkles,
  admin: Settings,
}

interface FeatureConfigResponse {
  features: WorkspaceFeatureToggles
  config: WorkspaceFeatureConfig
}

export function WorkspaceFeaturesTab() {
  const { currentWorkspace, isAdmin, refresh } = useWorkspaces()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [originalFeatures, setOriginalFeatures] = useState<WorkspaceFeatureToggles | null>(null)
  const [currentFeatures, setCurrentFeatures] = useState<WorkspaceFeatureToggles | null>(null)
  const [featureConfig, setFeatureConfig] = useState<WorkspaceFeatureConfig | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Load features
  useEffect(() => {
    if (!currentWorkspace) return

    const loadFeatures = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/workspaces/${currentWorkspace.id}/features`)
        const data = await response.json()

        if (data.success) {
          setOriginalFeatures(data.data.features)
          setCurrentFeatures(data.data.features)
          setFeatureConfig(data.data.config)
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to load workspace features",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load workspace features",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadFeatures()
  }, [currentWorkspace, toast])

  // Check for changes
  useEffect(() => {
    if (!originalFeatures || !currentFeatures) {
      setHasChanges(false)
      return
    }

    const changed = JSON.stringify(originalFeatures) !== JSON.stringify(currentFeatures)
    setHasChanges(changed)
  }, [originalFeatures, currentFeatures])

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No workspace selected</p>
        </CardContent>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Admin access required</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 space-y-4">
          {/* Title */}
          <Skeleton className="h-6 w-40" />
          {/* Toggle-shaped skeletons */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!currentFeatures || !featureConfig) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Failed to load features</p>
        </CardContent>
      </Card>
    )
  }

  const handleToggleFeature = (feature: WorkspaceFeatureKey, enabled: boolean) => {
    if (!currentFeatures) return

    const [category, name] = feature.split(".") as [keyof WorkspaceFeatureToggles, string]
    const updatedFeatures = {
      ...currentFeatures,
      [category]: {
        ...currentFeatures[category],
        [name]: enabled,
      },
    }

    setCurrentFeatures(updatedFeatures)
    setErrors([])
  }

  const handleSave = async () => {
    if (!currentWorkspace || !currentFeatures) return

    try {
      setIsSaving(true)
      setErrors([])
      setWarnings([])

      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/features`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ features: currentFeatures }),
      })

      const data = await response.json()

      if (data.success) {
        setOriginalFeatures(data.data.features)
        setCurrentFeatures(data.data.features)
        setFeatureConfig(data.data.config)
        setHasChanges(false)

        if (data.meta?.warnings) {
          setWarnings(data.meta.warnings)
        }

        toast({
          title: "Success",
          description: "Workspace features updated successfully",
        })

        // Refresh workspace data
        refresh()
      } else {
        if (data.data?.errors) {
          setErrors(data.data.errors)
        }
        toast({
          title: "Error",
          description: data.error || "Failed to update workspace features",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workspace features",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (originalFeatures) {
      setCurrentFeatures(originalFeatures)
      setHasChanges(false)
      setErrors([])
      setWarnings([])
      setShowResetDialog(false)
    }
  }

  const handleEnableAll = () => {
    if (!currentFeatures) return

    const allEnabled: WorkspaceFeatureToggles = {
      core: Object.fromEntries(Object.keys(currentFeatures.core).map((k) => [k, true])) as WorkspaceFeatureToggles["core"],
      productivity: Object.fromEntries(Object.keys(currentFeatures.productivity).map((k) => [k, true])) as WorkspaceFeatureToggles["productivity"],
      integrations: Object.fromEntries(Object.keys(currentFeatures.integrations).map((k) => [k, true])) as WorkspaceFeatureToggles["integrations"],
      advanced: Object.fromEntries(Object.keys(currentFeatures.advanced).map((k) => [k, true])) as WorkspaceFeatureToggles["advanced"],
      admin: Object.fromEntries(Object.keys(currentFeatures.admin).map((k) => [k, true])) as WorkspaceFeatureToggles["admin"],
    }

    setCurrentFeatures(allEnabled)
  }

  // Filter features by search query
  const filteredFeatures = Object.entries(WORKSPACE_FEATURE_METADATA).filter(([key, metadata]) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      metadata.name.toLowerCase().includes(query) ||
      metadata.description.toLowerCase().includes(query) ||
      key.toLowerCase().includes(query)
    )
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle>Workspace Features</CardTitle>
          </div>
          <CardDescription>
            Control which features are available in this workspace. Disabled features will be hidden from navigation, the dashboard, and the API. Changes take effect immediately after saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unsaved changes banner */}
          {hasChanges && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 flex-1">
                You have unsaved changes. Save to apply your feature configuration.
              </p>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i} className="text-sm">
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, i) => (
                    <li key={i} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Search and Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEnableAll}
              disabled={isSaving}
            >
              Enable All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              disabled={!hasChanges || isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      {Object.entries(FEATURE_CATEGORIES).map(([categoryKey, categoryInfo]) => {
        const CategoryIcon = CATEGORY_ICONS[categoryKey]
        const categoryFeatures = filteredFeatures.filter(([_, metadata]) => metadata.category === categoryKey)

        if (categoryFeatures.length === 0) return null

        return (
          <Card key={categoryKey}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{categoryInfo.name}</CardTitle>
              </div>
              <CardDescription>{categoryInfo.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryFeatures.map(([featureKey, metadata]) => {
                const config = featureConfig[featureKey as WorkspaceFeatureKey]
                const [category, name] = featureKey.split(".")
                const enabled =
                  (currentFeatures[category as keyof WorkspaceFeatureToggles] as Record<string, boolean>)?.[name] ??
                  true

                return (
                  <FeatureToggle
                    key={featureKey}
                    name={metadata.name}
                    description={metadata.description}
                    icon={metadata.icon}
                    enabled={enabled}
                    disabled={!!config?.reason && !enabled}
                    reason={config?.reason}
                    impact={metadata.impact}
                    onChange={(newEnabled) => handleToggleFeature(featureKey as WorkspaceFeatureKey, newEnabled)}
                  />
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard all unsaved changes and restore the original feature configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
