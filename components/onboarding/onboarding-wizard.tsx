"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Palette,
  Users,
  Target,
  CheckCircle,
  ArrowRight,
  Upload,
  Sparkles,
  Mail,
  Plus,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Organization } from "@/lib/types"

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData) => Promise<void>
  currentUser: { email: string; name: string }
}

export interface OnboardingData {
  organization: {
    name: string
    slug: string
    description?: string
  }
  workspace: {
    name: string
    primaryColor: string
    secondaryColor: string
    accentColor: string
    logoUrl?: string
  }
  teamInvites: Array<{
    email: string
    role: "admin" | "manager" | "member"
    name?: string
  }>
  rocks: Array<{
    title: string
    description: string
  }>
}

const PRESET_THEMES = [
  {
    name: "Ruby Red",
    primary: "#dc2626",
    secondary: "#991b1b",
    accent: "#f87171",
  },
  {
    name: "Ocean Blue",
    primary: "#2563eb",
    secondary: "#1e40af",
    accent: "#60a5fa",
  },
  {
    name: "Forest Green",
    primary: "#059669",
    secondary: "#047857",
    accent: "#34d399",
  },
  {
    name: "Royal Purple",
    primary: "#7c3aed",
    secondary: "#6d28d9",
    accent: "#a78bfa",
  },
  {
    name: "Sunset Orange",
    primary: "#ea580c",
    secondary: "#c2410c",
    accent: "#fb923c",
  },
  {
    name: "Midnight",
    primary: "#0f172a",
    secondary: "#1e293b",
    accent: "#475569",
  },
]

const STEPS = [
  { id: 1, name: "Organization", icon: Building2 },
  { id: 2, name: "Branding", icon: Palette },
  { id: 3, name: "Team", icon: Users },
  { id: 4, name: "Goals", icon: Target },
  { id: 5, name: "Launch", icon: Sparkles },
]

export function OnboardingWizard({ onComplete, currentUser }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [orgDescription, setOrgDescription] = useState("")

  const [workspaceName, setWorkspaceName] = useState("")
  const [primaryColor, setPrimaryColor] = useState(PRESET_THEMES[0].primary)
  const [secondaryColor, setSecondaryColor] = useState(PRESET_THEMES[0].secondary)
  const [accentColor, setAccentColor] = useState(PRESET_THEMES[0].accent)
  const [logoUrl, setLogoUrl] = useState("")

  const [teamInvites, setTeamInvites] = useState<Array<{ email: string; role: "admin" | "manager" | "member"; name?: string }>>([])
  const [newInviteEmail, setNewInviteEmail] = useState("")

  const [rocks, setRocks] = useState<Array<{ title: string; description: string }>>([])
  const [newRockTitle, setNewRockTitle] = useState("")
  const [newRockDescription, setNewRockDescription] = useState("")

  // Auto-generate slug from org name
  const handleOrgNameChange = (name: string) => {
    setOrgName(name)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    setOrgSlug(slug)
    if (!workspaceName) {
      setWorkspaceName(name)
    }
  }

  const applyTheme = (theme: typeof PRESET_THEMES[0]) => {
    setPrimaryColor(theme.primary)
    setSecondaryColor(theme.secondary)
    setAccentColor(theme.accent)
  }

  const addTeamInvite = () => {
    if (newInviteEmail.trim() && !teamInvites.find(i => i.email === newInviteEmail)) {
      setTeamInvites([...teamInvites, { email: newInviteEmail, role: "member" }])
      setNewInviteEmail("")
    }
  }

  const removeTeamInvite = (email: string) => {
    setTeamInvites(teamInvites.filter(i => i.email !== email))
  }

  const addRock = () => {
    if (newRockTitle.trim()) {
      setRocks([...rocks, { title: newRockTitle, description: newRockDescription }])
      setNewRockTitle("")
      setNewRockDescription("")
    }
  }

  const removeRock = (index: number) => {
    setRocks(rocks.filter((_, i) => i !== index))
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      await onComplete({
        organization: {
          name: orgName,
          slug: orgSlug,
          description: orgDescription || undefined,
        },
        workspace: {
          name: workspaceName || orgName,
          primaryColor,
          secondaryColor,
          accentColor,
          logoUrl: logoUrl || undefined,
        },
        teamInvites,
        rocks,
      })
    } catch (error) {
      console.error("Onboarding error:", error)
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return orgName.trim().length > 0 && orgSlug.trim().length > 0
      case 2:
        return workspaceName.trim().length > 0
      case 3:
      case 4:
        return true // These steps are optional
      case 5:
        return true
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all",
                        isActive && "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg scale-110",
                        isCompleted && "bg-emerald-500 text-white",
                        !isActive && !isCompleted && "bg-slate-200 text-slate-400"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isActive && "text-red-600",
                        isCompleted && "text-emerald-600",
                        !isActive && !isCompleted && "text-slate-400"
                      )}
                    >
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-1 flex-1 mx-2 rounded transition-all",
                        isCompleted ? "bg-emerald-500" : "bg-slate-200"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content Card */}
        <Card className="border-slate-200 shadow-xl">
          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Organization */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      Welcome to Align! 👋
                    </h2>
                    <p className="text-slate-600">
                      Let's start by setting up your organization. This is the top-level entity
                      that will contain your workspaces and teams.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        placeholder="e.g., Acme Inc, TechStartup, Marketing Team"
                        value={orgName}
                        onChange={(e) => handleOrgNameChange(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="orgSlug">URL Slug *</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-slate-500">app.getalign.io/</span>
                        <Input
                          id="orgSlug"
                          placeholder="acme-inc"
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        This will be your unique URL. Only lowercase letters, numbers, and hyphens.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="orgDescription">Description (Optional)</Label>
                      <Textarea
                        id="orgDescription"
                        placeholder="Brief description of your organization..."
                        value={orgDescription}
                        onChange={(e) => setOrgDescription(e.target.value)}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Branding */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      Customize Your Workspace 🎨
                    </h2>
                    <p className="text-slate-600">
                      Make it yours! Choose colors and upload your logo to match your brand.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="workspaceName">Workspace Name *</Label>
                      <Input
                        id="workspaceName"
                        placeholder="Default Workspace"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    {/* Theme Presets */}
                    <div>
                      <Label>Quick Themes</Label>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {PRESET_THEMES.map((theme) => (
                          <button
                            key={theme.name}
                            onClick={() => applyTheme(theme)}
                            className="p-4 border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-all text-left group"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: theme.primary }}
                              />
                              <div
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: theme.accent }}
                              />
                            </div>
                            <div className="text-sm font-medium text-slate-900 group-hover:text-red-600 transition-colors">
                              {theme.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Colors */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="primaryColor">Primary Color</Label>
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
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
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
                        <Label htmlFor="accentColor">Accent Color</Label>
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

                    {/* Logo Upload */}
                    <div>
                      <Label>Logo (Optional)</Label>
                      <div className="mt-2 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-slate-300 transition-all cursor-pointer">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          PNG, JPG or SVG (max 2MB)
                        </p>
                      </div>
                    </div>

                    {/* Preview */}
                    <div>
                      <Label>Preview</Label>
                      <div
                        className="mt-2 p-6 rounded-lg border-2 border-slate-200"
                        style={{ backgroundColor: `${primaryColor}10` }}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className="w-12 h-12 rounded-lg"
                            style={{ backgroundColor: primaryColor }}
                          />
                          <div>
                            <h3 className="font-semibold text-slate-900">{workspaceName || "Your Workspace"}</h3>
                            <p className="text-sm text-slate-600">Dashboard Preview</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div
                            className="h-20 rounded-lg"
                            style={{ backgroundColor: primaryColor }}
                          />
                          <div
                            className="h-20 rounded-lg"
                            style={{ backgroundColor: secondaryColor }}
                          />
                          <div
                            className="h-20 rounded-lg"
                            style={{ backgroundColor: accentColor }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Team */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      Invite Your Team 👥
                    </h2>
                    <p className="text-slate-600">
                      Add team members who will use this workspace. They'll receive an email invitation.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="colleague@company.com"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addTeamInvite()}
                        className="flex-1"
                      />
                      <Button onClick={addTeamInvite} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    {teamInvites.length > 0 && (
                      <div className="space-y-2">
                        <Label>Team Members ({teamInvites.length})</Label>
                        {teamInvites.map((invite) => (
                          <div
                            key={invite.email}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center">
                                <Mail className="w-5 h-5 text-slate-600" />
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{invite.email}</div>
                                <div className="text-xs text-slate-500">Will receive invitation email</div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTeamInvite(invite.email)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {teamInvites.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No team members added yet</p>
                        <p className="text-sm text-slate-400 mt-1">You can always invite people later</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Goals */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      Set Quarterly Goals 🎯
                    </h2>
                    <p className="text-slate-600">
                      What are your top 3-7 priorities this quarter? We call them "Rocks" - big goals that matter most.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Input
                        placeholder="e.g., Launch new product feature"
                        value={newRockTitle}
                        onChange={(e) => setNewRockTitle(e.target.value)}
                      />
                      <Textarea
                        placeholder="Brief description of this goal..."
                        value={newRockDescription}
                        onChange={(e) => setNewRockDescription(e.target.value)}
                        rows={2}
                      />
                      <Button onClick={addRock} variant="outline" className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Quarterly Rock
                      </Button>
                    </div>

                    {rocks.length > 0 && (
                      <div className="space-y-3">
                        <Label>Your Q1 2026 Rocks ({rocks.length})</Label>
                        {rocks.map((rock, index) => (
                          <div
                            key={index}
                            className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Target className="w-4 h-4 text-emerald-600" />
                                  <h4 className="font-semibold text-slate-900">{rock.title}</h4>
                                </div>
                                {rock.description && (
                                  <p className="text-sm text-slate-600 mt-1">{rock.description}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRock(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {rocks.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                        <Target className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No rocks added yet</p>
                        <p className="text-sm text-slate-400 mt-1">
                          Add 3-7 quarterly goals to get started
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 5: Launch */}
              {currentStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center space-y-6 py-8"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">
                      You're All Set! 🎉
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                      Your workspace is ready. Let's launch and start building daily accountability.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-6 max-w-md mx-auto">
                    <h3 className="font-semibold text-slate-900 mb-4">What happens next:</h3>
                    <div className="space-y-3 text-left">
                      {[
                        "We'll create your organization and workspace",
                        `${teamInvites.length > 0 ? `Send ${teamInvites.length} team invitation${teamInvites.length > 1 ? "s" : ""}` : "You can invite team members later"}`,
                        `${rocks.length > 0 ? `Create ${rocks.length} quarterly rock${rocks.length > 1 ? "s" : ""}` : "You can add rocks anytime"}`,
                        "Take you to your personalized dashboard",
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-600">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                Back
              </Button>

              <div className="flex gap-3">
                {currentStep < STEPS.length ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
                  >
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700"
                  >
                    {isSubmitting ? "Launching..." : "Launch Workspace"}
                    <Sparkles className="ml-2 w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
