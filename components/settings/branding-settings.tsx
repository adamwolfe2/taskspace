"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Palette, Loader2, Check, X, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrandTheme } from "@/lib/contexts/brand-theme-context"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useToast } from "@/hooks/use-toast"
import {
  extractColorsFromImage,
  ExtractedColors,
  generateColorPalette,
  hexToHsl,
  defaultBrandColors,
} from "@/lib/utils/color-extractor"

export function BrandingSettings() {
  const { currentWorkspace, refresh: refreshWorkspaces } = useWorkspaces()
  const { colors, updateBrandColors } = useBrandTheme()
  const { toast } = useToast()

  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExtractingColors, setIsExtractingColors] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(
    currentWorkspace?.logoUrl || null
  )
  const [pendingColors, setPendingColors] = useState<ExtractedColors>(colors)
  const [hasChanges, setHasChanges] = useState(false)

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, SVG)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      // Upload file
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "logo")

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      if (!data.success || !data.data?.url) {
        throw new Error(data.error || "Upload failed")
      }

      const logoUrl = data.data.url
      setLogoPreview(logoUrl)
      setHasChanges(true)

      // Extract colors from logo
      setIsExtractingColors(true)
      try {
        const extractedColors = await extractColorsFromImage(logoUrl)
        setPendingColors(extractedColors)
        toast({
          title: "Logo uploaded",
          description: "We've automatically generated colors from your logo",
        })
      } catch {
        // Keep existing colors
      } finally {
        setIsExtractingColors(false)
      }
    } catch {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleColorChange = (colorKey: keyof ExtractedColors, value: string) => {
    setHasChanges(true)

    if (colorKey === "primary") {
      // Regenerate palette from new primary color
      try {
        const hsl = hexToHsl(value)
        const palette = generateColorPalette(hsl)
        setPendingColors(palette)
      } catch {
        setPendingColors((prev) => ({ ...prev, [colorKey]: value }))
      }
    } else {
      setPendingColors((prev) => ({ ...prev, [colorKey]: value }))
    }
  }

  const handleSave = async () => {
    if (!currentWorkspace) {
      toast({
        title: "No workspace selected",
        description: "Please select a workspace to update branding",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Update workspace branding via API
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          logoUrl: logoPreview,
          primaryColor: pendingColors.primary,
          secondaryColor: pendingColors.secondary,
          accentColor: pendingColors.accent,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to update workspace")
      }

      updateBrandColors(pendingColors)
      await refreshWorkspaces()

      toast({
        title: "Branding updated",
        description: "Your workspace branding has been saved",
      })
      setHasChanges(false)
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save branding settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setPendingColors(defaultBrandColors)
    setLogoPreview(null)
    setHasChanges(true)
  }

  const handleDiscard = () => {
    setPendingColors(colors)
    setLogoPreview(currentWorkspace?.logoUrl || null)
    setHasChanges(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Workspace Branding
        </CardTitle>
        <CardDescription>
          Customize your workspace with your logo and brand colors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Upload */}
        <div className="space-y-4">
          <Label>Logo</Label>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl p-4 transition-colors w-32 h-32 flex items-center justify-center",
                "hover:border-slate-400 hover:bg-slate-50 cursor-pointer",
                logoPreview ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
              )}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              ) : logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Logo preview"
                  width={96}
                  height={96}
                  className="max-h-24 max-w-24 object-contain"
                  unoptimized
                />
              ) : (
                <div className="text-center">
                  <Upload className="h-8 w-8 mx-auto text-slate-400" />
                  <span className="text-xs text-slate-500 mt-1 block">Upload</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-600">
                Upload your company logo. PNG, JPG, or SVG up to 5MB.
              </p>
              {logoPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLogoPreview(null)
                    setHasChanges(true)
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Color Extracting Status */}
        {isExtractingColors && (
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Extracting colors from your logo...
          </div>
        )}

        {/* Theme Preview */}
        <div className="space-y-4">
          <Label>Theme Preview</Label>
          <div
            className="rounded-xl border overflow-hidden shadow-sm"
            style={{ backgroundColor: pendingColors.background }}
          >
            {/* Mock Header */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: pendingColors.primary }}
            >
              <div className="flex items-center gap-2">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Logo" width={20} height={20} className="h-5 w-auto" unoptimized />
                ) : (
                  <div className="h-5 w-5 rounded bg-white/20" />
                )}
                <span className="font-medium text-white text-sm">
                  {currentWorkspace?.name || "Your Workspace"}
                </span>
              </div>
            </div>
            {/* Mock Content */}
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <button
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                  style={{ backgroundColor: pendingColors.primary }}
                >
                  Primary Button
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{
                    borderColor: pendingColors.primary,
                    color: pendingColors.primary,
                  }}
                >
                  Secondary
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                  style={{ backgroundColor: pendingColors.accent }}
                >
                  Accent
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="primary-color"
                value={pendingColors.primary}
                onChange={(e) => handleColorChange("primary", e.target.value)}
                className="h-10 w-12 rounded cursor-pointer border border-slate-200"
              />
              <Input
                value={pendingColors.primary}
                onChange={(e) => handleColorChange("primary", e.target.value)}
                placeholder="#3b82f6"
                className="font-mono text-sm flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="secondary-color"
                value={pendingColors.secondary}
                onChange={(e) => handleColorChange("secondary", e.target.value)}
                className="h-10 w-12 rounded cursor-pointer border border-slate-200"
              />
              <Input
                value={pendingColors.secondary}
                onChange={(e) => handleColorChange("secondary", e.target.value)}
                placeholder="#60a5fa"
                className="font-mono text-sm flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="accent-color"
                value={pendingColors.accent}
                onChange={(e) => handleColorChange("accent", e.target.value)}
                className="h-10 w-12 rounded cursor-pointer border border-slate-200"
              />
              <Input
                value={pendingColors.accent}
                onChange={(e) => handleColorChange("accent", e.target.value)}
                placeholder="#8b5cf6"
                className="font-mono text-sm flex-1"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} size="sm">
            Reset to Default
          </Button>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="ghost" onClick={handleDiscard} size="sm">
                Discard Changes
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              size="sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
