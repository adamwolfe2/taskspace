"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Palette,
  Upload,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  Zap,
  RefreshCw,
  Globe,
} from "lucide-react"
import { useWorkspaces, useUpdateWorkspace } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  extractColorsFromImage,
  generateColorPresets,
  analyzeColorQuality,
  hexToHsl,
  type ExtractedColors,
  type BrandPersonality,
} from "@/lib/utils/color-extractor"

interface ColorPreset {
  name: string
  description: string
  colors: ExtractedColors
}

const INDUSTRY_PRESETS: ColorPreset[] = [
  {
    name: "Tech Blue",
    description: "Modern, professional, innovative",
    colors: {
      primary: "#3b82f6",
      secondary: "#60a5fa",
      accent: "#8b5cf6",
      text: "#1e293b",
      background: "#f8fafc",
      personality: { vibrancy: "vibrant", temperature: "cool", formality: "professional" },
    },
  },
  {
    name: "Startup Orange",
    description: "Energetic, bold, creative",
    colors: {
      primary: "#f97316",
      secondary: "#fb923c",
      accent: "#fbbf24",
      text: "#1e293b",
      background: "#fffbeb",
      personality: { vibrancy: "vibrant", temperature: "warm", formality: "creative" },
    },
  },
  {
    name: "Finance Green",
    description: "Trustworthy, stable, growth-focused",
    colors: {
      primary: "#059669",
      secondary: "#34d399",
      accent: "#10b981",
      text: "#1e293b",
      background: "#f0fdf4",
      personality: { vibrancy: "balanced", temperature: "cool", formality: "professional" },
    },
  },
  {
    name: "Creative Purple",
    description: "Innovative, unique, inspiring",
    colors: {
      primary: "#7c3aed",
      secondary: "#a78bfa",
      accent: "#c084fc",
      text: "#1e293b",
      background: "#faf5ff",
      personality: { vibrancy: "vibrant", temperature: "cool", formality: "creative" },
    },
  },
  {
    name: "Enterprise Gray",
    description: "Professional, sophisticated, timeless",
    colors: {
      primary: "#475569",
      secondary: "#64748b",
      accent: "#94a3b8",
      text: "#1e293b",
      background: "#f8fafc",
      personality: { vibrancy: "muted", temperature: "neutral", formality: "professional" },
    },
  },
]

export function WorkspaceBrandingSettings() {
  const { currentOrganization } = useApp()
  const { currentWorkspace, refresh } = useWorkspaces()
  const { updateWorkspace } = useUpdateWorkspace()
  const { toast } = useToast()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Color state - inherit from organization as defaults
  const [primaryColor, setPrimaryColor] = useState(
    currentWorkspace?.primaryColor || currentOrganization?.primaryColor || "#3b82f6"
  )
  const [secondaryColor, setSecondaryColor] = useState(
    currentWorkspace?.secondaryColor || currentOrganization?.secondaryColor || "#60a5fa"
  )
  const [accentColor, setAccentColor] = useState(
    currentWorkspace?.accentColor || currentOrganization?.accentColor || "#8b5cf6"
  )

  // Logo upload
  const [logoUrl, setLogoUrl] = useState(currentWorkspace?.logoUrl || "")
  const [logoFile, setLogoFile] = useState<File | null>(null)

  // Color analysis
  const [personality, setPersonality] = useState<BrandPersonality | null>(null)
  const [quality, setQuality] = useState<ReturnType<typeof analyzeColorQuality> | null>(null)

  // Website scrape (Firecrawl)
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isScraping, setIsScraping] = useState(false)

  // Preview mode
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<ColorPreset | null>(null)

  // Update local state when workspace or organization changes
  useEffect(() => {
    if (currentWorkspace) {
      setPrimaryColor(
        currentWorkspace.primaryColor || currentOrganization?.primaryColor || "#3b82f6"
      )
      setSecondaryColor(
        currentWorkspace.secondaryColor || currentOrganization?.secondaryColor || "#60a5fa"
      )
      setAccentColor(
        currentWorkspace.accentColor || currentOrganization?.accentColor || "#8b5cf6"
      )
      setLogoUrl(currentWorkspace.logoUrl || "")
    }
  }, [currentWorkspace, currentOrganization])

  // Analyze colors whenever they change
  useEffect(() => {
    const colors: ExtractedColors = {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      text: "#1e293b",
      background: "#f8fafc",
    }

    const hsl = hexToHsl(primaryColor)
    const analysis = analyzeColorQuality(colors)
    setQuality(analysis)
  }, [primaryColor, secondaryColor, accentColor])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      if (!data.success || !data.data?.url) {
        throw new Error(data.error || "Upload failed")
      }

      const uploadedLogoUrl = data.data.url
      setLogoUrl(uploadedLogoUrl)
      setLogoFile(file)

      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully",
      })
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleExtractFromLogo = async () => {
    if (!logoFile && !logoUrl) {
      toast({
        title: "No logo found",
        description: "Please upload a logo first",
        variant: "destructive",
      })
      return
    }

    setIsExtracting(true)
    try {
      // Create object URL from file if available
      const imageUrl = logoFile ? URL.createObjectURL(logoFile) : logoUrl

      const extracted = await extractColorsFromImage(imageUrl)

      setPrimaryColor(extracted.primary)
      setSecondaryColor(extracted.secondary)
      setAccentColor(extracted.accent)
      setPersonality(extracted.personality || null)

      toast({
        title: "Colors extracted!",
        description: "Brand colors have been extracted from your logo",
      })

      // Show before/after comparison
      setShowBeforeAfter(true)
      setTimeout(() => setShowBeforeAfter(false), 5000)
    } catch (error) {
      toast({
        title: "Extraction failed",
        description: "Could not extract colors from the logo",
        variant: "destructive",
      })
    } finally {
      setIsExtracting(false)
    }
  }

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter your company website URL",
        variant: "destructive",
      })
      return
    }

    // Normalize URL
    let url = websiteUrl.trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url
    }

    setIsScraping(true)
    try {
      const response = await fetch("/api/firecrawl/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to scrape website")
      }

      const data = await response.json()
      const brand = data.data?.brand

      if (!brand) {
        throw new Error("No brand data could be extracted from this website")
      }

      // Apply extracted colors
      if (brand.colors?.primary) setPrimaryColor(brand.colors.primary)
      if (brand.colors?.secondary) setSecondaryColor(brand.colors.secondary)
      if (brand.colors?.accent) setAccentColor(brand.colors.accent)

      // Apply logo if found
      if (brand.logo) setLogoUrl(brand.logo)

      toast({
        title: "Brand data extracted!",
        description: "Colors and logo have been populated from your website",
      })

      setShowBeforeAfter(true)
      setTimeout(() => setShowBeforeAfter(false), 5000)
    } catch (error) {
      toast({
        title: "Scrape failed",
        description: error instanceof Error ? error.message : "Could not analyze website",
        variant: "destructive",
      })
    } finally {
      setIsScraping(false)
    }
  }

  const handleApplyPreset = (preset: ColorPreset) => {
    setPrimaryColor(preset.colors.primary)
    setSecondaryColor(preset.colors.secondary)
    setAccentColor(preset.colors.accent)
    setPersonality(preset.colors.personality || null)
    setSelectedPreset(preset)

    toast({
      title: "Preset applied",
      description: `${preset.name} theme has been applied`,
    })
  }

  const handleGenerateVariants = () => {
    const hsl = hexToHsl(primaryColor)
    const presets = generateColorPresets(hsl)

    // Show dialog with variants (simplified here - would be a modal in production)
    toast({
      title: "Variants generated",
      description: "Choose from vibrant, muted, or professional variants",
    })
  }

  const handleSave = async () => {
    if (!currentWorkspace) return

    setIsSaving(true)
    try {
      await updateWorkspace(currentWorkspace.id, {
        primaryColor,
        secondaryColor,
        accentColor,
        logoUrl: logoUrl || undefined,
      })

      toast({
        title: "Branding updated",
        description: "Your workspace branding has been saved",
      })

      setIsEditing(false)
      await refresh()
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setPrimaryColor(currentWorkspace?.primaryColor || "#3b82f6")
    setSecondaryColor(currentWorkspace?.secondaryColor || "#60a5fa")
    setAccentColor(currentWorkspace?.accentColor || "#8b5cf6")
    setLogoUrl(currentWorkspace?.logoUrl || "")
    setLogoFile(null)
    setIsEditing(false)
    setShowBeforeAfter(false)
    setSelectedPreset(null)
  }

  const getQualityBadge = () => {
    if (!quality) return null

    const variants = {
      excellent: { label: "Excellent", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      good: { label: "Good", className: "bg-blue-100 text-blue-700 border-blue-200" },
      fair: { label: "Fair", className: "bg-amber-100 text-amber-700 border-amber-200" },
      "needs-improvement": { label: "Needs Work", className: "bg-red-100 text-red-700 border-red-200" },
    }

    const variant = variants[quality.overall]

    return (
      <Badge variant="outline" className={cn("text-xs", variant.className)}>
        {variant.label}
      </Badge>
    )
  }

  const getPersonalityDisplay = () => {
    if (!personality) return null

    return (
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          {personality.vibrancy}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {personality.temperature === "warm" ? "🔥" : personality.temperature === "cool" ? "❄️" : "⚖️"}
          {" "}{personality.temperature}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {personality.formality}
        </Badge>
      </div>
    )
  }

  if (!currentWorkspace) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Workspace Branding
              </CardTitle>
              <CardDescription>
                Customize your workspace with your brand colors and logo
              </CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Palette className="h-4 w-4 mr-2" />
                Edit Branding
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {/* Website Scrape (Firecrawl) */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Auto-detect from Website</Label>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Enter your company website to automatically extract brand colors, logo, and favicon
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    disabled={isScraping}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleScrapeWebsite()
                      }
                    }}
                  />
                  <Button
                    onClick={handleScrapeWebsite}
                    disabled={isScraping || !websiteUrl.trim()}
                    variant="outline"
                  >
                    {isScraping ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <Label>Logo</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <div
                  className="mt-2 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Uploading...
                      </p>
                    </>
                  ) : logoUrl ? (
                    <>
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-16 h-16 mx-auto mb-2 object-contain"
                      />
                      <p className="text-sm text-muted-foreground">
                        Click to change logo
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG or SVG (max 5MB)
                      </p>
                    </>
                  )}
                </div>

                {(logoFile || logoUrl) && (
                  <div className="mt-3">
                    <Button
                      onClick={handleExtractFromLogo}
                      disabled={isExtracting}
                      variant="outline"
                      className="w-full"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting colors...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Extract Colors from Logo
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Presets */}
              <div>
                <Label>Industry Presets</Label>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {INDUSTRY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset)}
                      className={cn(
                        "p-3 border-2 rounded-lg hover:border-primary transition-all text-left group",
                        selectedPreset?.name === preset.name ? "border-primary" : "border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: preset.colors.primary }}
                        />
                        <div
                          className="w-5 h-5 rounded-full"
                          style={{ backgroundColor: preset.colors.accent }}
                        />
                      </div>
                      <div className="text-sm font-medium text-slate-900 group-hover:text-primary transition-colors">
                        {preset.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {preset.description.split(",")[0]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Custom Colors</Label>
                  <Button onClick={handleGenerateVariants} variant="ghost" size="sm">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Generate Variants
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="primaryColor" className="text-xs">
                      Primary Color
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        id="primaryColor"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-12 rounded border border-slate-200 cursor-pointer"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondaryColor" className="text-xs">
                      Secondary Color
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        id="secondaryColor"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-12 h-12 rounded border border-slate-200 cursor-pointer"
                      />
                      <Input
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="accentColor" className="text-xs">
                      Accent Color
                    </Label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        id="accentColor"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-12 rounded border border-slate-200 cursor-pointer"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Quality Analysis */}
              {quality && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Color Quality Analysis</span>
                    </div>
                    {getQualityBadge()}
                  </div>

                  {personality && (
                    <div className="mb-3">
                      <Label className="text-xs text-muted-foreground mb-2">Brand Personality</Label>
                      {getPersonalityDisplay()}
                    </div>
                  )}

                  {quality.issues.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Issues</Label>
                      {quality.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {quality.suggestions.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <Label className="text-xs text-muted-foreground">Suggestions</Label>
                      {quality.suggestions.map((suggestion, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-blue-700">
                          <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Live Preview */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <Label>Live Preview</Label>
                </div>
                <div
                  className="p-6 rounded-lg border-2"
                  style={{ backgroundColor: `${primaryColor}08` }}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className="w-12 h-12 rounded-lg shadow-md"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {currentWorkspace.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">Workspace Dashboard</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div
                      className="h-20 rounded-lg shadow-sm"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div
                      className="h-20 rounded-lg shadow-sm"
                      style={{ backgroundColor: secondaryColor }}
                    />
                    <div
                      className="h-20 rounded-lg shadow-sm"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <div
                      className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-4 py-2 rounded-lg border-2 text-sm font-medium"
                      style={{
                        borderColor: primaryColor,
                        color: primaryColor,
                      }}
                    >
                      Outline Button
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Save Branding
                    </>
                  )}
                </Button>
                <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Branding Display */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2">Current Colors</Label>
                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <div
                      className="w-16 h-16 rounded-lg shadow-md mb-2"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <div className="text-xs text-center font-mono text-muted-foreground">
                      Primary
                    </div>
                  </div>
                  <div>
                    <div
                      className="w-16 h-16 rounded-lg shadow-md mb-2"
                      style={{ backgroundColor: secondaryColor }}
                    />
                    <div className="text-xs text-center font-mono text-muted-foreground">
                      Secondary
                    </div>
                  </div>
                  <div>
                    <div
                      className="w-16 h-16 rounded-lg shadow-md mb-2"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="text-xs text-center font-mono text-muted-foreground">
                      Accent
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
