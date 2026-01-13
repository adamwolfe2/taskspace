"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Building2,
  Upload,
  Palette,
  Users,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  extractColorsFromImage,
  ExtractedColors,
  defaultBrandColors,
  generateColorPalette,
  hexToHsl,
} from "@/lib/utils/color-extractor"
import { useToast } from "@/hooks/use-toast"

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => Promise<void>
  initialData?: Partial<OnboardingData>
}

export interface OnboardingData {
  organizationName: string
  logoUrl: string | null
  logoFile: File | null
  brandColors: ExtractedColors
  inviteEmails: string[]
  timezone: string
}

const STEPS = [
  { id: "organization", title: "Name Your Workspace", icon: Building2 },
  { id: "branding", title: "Upload Your Logo", icon: Upload },
  { id: "theme", title: "Customize Theme", icon: Palette },
  { id: "team", title: "Invite Team", icon: Users },
  { id: "complete", title: "All Set!", icon: Check },
]

export function OnboardingWizard({ onComplete, initialData }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    organizationName: initialData?.organizationName || "",
    logoUrl: initialData?.logoUrl || null,
    logoFile: initialData?.logoFile || null,
    brandColors: initialData?.brandColors || defaultBrandColors,
    inviteEmails: initialData?.inviteEmails || [],
    timezone: initialData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [emailInput, setEmailInput] = useState("")
  const [isExtractingColors, setIsExtractingColors] = useState(false)
  const { toast } = useToast()

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

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

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file)
    updateData({ logoUrl: objectUrl, logoFile: file })

    // Extract colors from logo
    setIsExtractingColors(true)
    try {
      const colors = await extractColorsFromImage(objectUrl)
      updateData({ brandColors: colors })
      toast({
        title: "Colors extracted!",
        description: "We've automatically generated a theme from your logo",
      })
    } catch (error) {
      console.error("Failed to extract colors:", error)
      // Keep default colors if extraction fails
    } finally {
      setIsExtractingColors(false)
    }
  }

  const handleColorChange = (colorKey: keyof ExtractedColors, value: string) => {
    const newColors = { ...data.brandColors, [colorKey]: value }

    // If primary changes, regenerate the palette
    if (colorKey === "primary") {
      try {
        const hsl = hexToHsl(value)
        const palette = generateColorPalette(hsl)
        updateData({ brandColors: palette })
      } catch (error) {
        updateData({ brandColors: newColors })
      }
    } else {
      updateData({ brandColors: newColors })
    }
  }

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase()
    if (!email) return

    // Basic email validation
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    if (data.inviteEmails.includes(email)) {
      toast({
        title: "Email already added",
        description: "This email is already in your invite list",
        variant: "destructive",
      })
      return
    }

    updateData({ inviteEmails: [...data.inviteEmails, email] })
    setEmailInput("")
  }

  const removeEmail = (email: string) => {
    updateData({ inviteEmails: data.inviteEmails.filter((e) => e !== email) })
  }

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case "organization":
        return data.organizationName.trim().length >= 2
      case "branding":
        return true // Logo is optional
      case "theme":
        return true // Can use defaults
      case "team":
        return true // Invites are optional
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (currentStep === STEPS.length - 2) {
      // Last step before complete - submit
      setIsSubmitting(true)
      try {
        await onComplete(data)
        setCurrentStep(currentStep + 1)
      } catch (error) {
        toast({
          title: "Setup failed",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        })
      } finally {
        setIsSubmitting(false)
      }
    } else if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    const step = STEPS[currentStep]

    switch (step.id) {
      case "organization":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Name Your Workspace</h2>
              <p className="text-slate-600">
                This is your team's home in AIMS. Choose a name that represents your organization.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-name">Workspace Name</Label>
              <Input
                id="org-name"
                placeholder="Acme Inc."
                value={data.organizationName}
                onChange={(e) => updateData({ organizationName: e.target.value })}
                className="text-lg h-12"
                autoFocus
              />
              <p className="text-sm text-slate-500">
                You can always change this later in settings.
              </p>
            </div>
          </div>
        )

      case "branding":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Upload Your Logo</h2>
              <p className="text-slate-600">
                We'll automatically create a custom color theme from your brand.
              </p>
            </div>
            <div className="space-y-4">
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 transition-colors",
                  "hover:border-slate-400 hover:bg-slate-50",
                  data.logoUrl ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-4">
                  {data.logoUrl ? (
                    <>
                      <div className="relative">
                        <img
                          src={data.logoUrl}
                          alt="Logo preview"
                          className="h-24 w-auto object-contain rounded-lg"
                        />
                        {isExtractingColors && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-emerald-600 font-medium">
                        Logo uploaded! Click to change.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-slate-100 rounded-full">
                        <Upload className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">
                          Drop your logo here, or click to browse
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          PNG, JPG, or SVG up to 5MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-500 text-center">
                Skip this step if you don't have a logo ready. You can add it later.
              </p>
            </div>
          </div>
        )

      case "theme":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Your Brand Theme</h2>
              <p className="text-slate-600">
                {data.logoUrl
                  ? "We've generated these colors from your logo. Feel free to adjust."
                  : "Choose a primary color for your workspace."}
              </p>
            </div>

            {/* Theme Preview */}
            <div
              className="rounded-xl border overflow-hidden shadow-lg"
              style={{ backgroundColor: data.brandColors.background }}
            >
              {/* Mock Header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: data.brandColors.primary }}
              >
                <div className="flex items-center gap-2">
                  {data.logoUrl ? (
                    <img src={data.logoUrl} alt="Logo" className="h-6 w-auto" />
                  ) : (
                    <div className="h-6 w-6 rounded bg-white/20" />
                  )}
                  <span className="font-semibold text-white text-sm">
                    {data.organizationName || "Your Workspace"}
                  </span>
                </div>
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-white/40" />
                  <div className="h-2 w-2 rounded-full bg-white/40" />
                  <div className="h-2 w-2 rounded-full bg-white/40" />
                </div>
              </div>
              {/* Mock Content */}
              <div className="p-4 space-y-3">
                <div className="flex gap-3">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: data.brandColors.primary + "20" }}
                  >
                    <Sparkles
                      className="h-6 w-6"
                      style={{ color: data.brandColors.primary }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                    <div className="h-2 w-24 bg-slate-100 rounded mt-2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                    style={{ backgroundColor: data.brandColors.primary }}
                  >
                    Primary
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                    style={{
                      borderColor: data.brandColors.primary,
                      color: data.brandColors.primary,
                    }}
                  >
                    Secondary
                  </button>
                </div>
              </div>
            </div>

            {/* Color Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primary-color"
                    value={data.brandColors.primary}
                    onChange={(e) => handleColorChange("primary", e.target.value)}
                    className="h-10 w-14 rounded cursor-pointer border border-slate-200"
                  />
                  <Input
                    value={data.brandColors.primary}
                    onChange={(e) => handleColorChange("primary", e.target.value)}
                    placeholder="#3b82f6"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-color">Accent Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondary-color"
                    value={data.brandColors.accent}
                    onChange={(e) => handleColorChange("accent", e.target.value)}
                    className="h-10 w-14 rounded cursor-pointer border border-slate-200"
                  />
                  <Input
                    value={data.brandColors.accent}
                    onChange={(e) => handleColorChange("accent", e.target.value)}
                    placeholder="#8b5cf6"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "team":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Invite Your Team</h2>
              <p className="text-slate-600">
                Add team members now or skip this step and invite them later.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                  className="flex-1"
                />
                <Button onClick={addEmail} variant="outline">
                  Add
                </Button>
              </div>

              {data.inviteEmails.length > 0 ? (
                <div className="space-y-2">
                  <Label>Invitations ({data.inviteEmails.length})</Label>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {data.inviteEmails.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <span className="text-sm text-slate-700">{email}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => removeEmail(email)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No invitations added yet</p>
                </div>
              )}
            </div>
          </div>
        )

      case "complete":
        return (
          <div className="text-center space-y-6 py-8">
            <div
              className="inline-flex items-center justify-center h-20 w-20 rounded-full"
              style={{ backgroundColor: data.brandColors.primary + "20" }}
            >
              <Check
                className="h-10 w-10"
                style={{ color: data.brandColors.primary }}
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">You're All Set!</h2>
              <p className="text-slate-600">
                Welcome to <span className="font-semibold">{data.organizationName}</span>.
                Your workspace is ready to go.
              </p>
            </div>
            {data.inviteEmails.length > 0 && (
              <p className="text-sm text-slate-500">
                {data.inviteEmails.length} invitation(s) will be sent shortly.
              </p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-full transition-colors",
                    index < currentStep
                      ? "bg-emerald-500 text-white"
                      : index === currentStep
                      ? "text-white"
                      : "bg-slate-200 text-slate-400"
                  )}
                  style={
                    index === currentStep
                      ? { backgroundColor: data.brandColors.primary }
                      : undefined
                  }
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
              )
            })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {currentStep < STEPS.length - 1 && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="gap-2"
                style={
                  canProceed()
                    ? { backgroundColor: data.brandColors.primary }
                    : undefined
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : currentStep === STEPS.length - 2 ? (
                  <>
                    Complete Setup
                    <Check className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Skip link for optional steps */}
          {(STEPS[currentStep].id === "branding" || STEPS[currentStep].id === "team") && (
            <div className="text-center mt-4">
              <button
                onClick={handleNext}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Skip this step
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
