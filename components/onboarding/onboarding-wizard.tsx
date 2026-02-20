"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Users,
  Target,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Mail,
  Plus,
  X,
  Loader2,
  SkipForward,
  Globe,
  Palette,
  Building2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface OnboardingWizardProps {
  onComplete: (data: OnboardingData, reportProgress?: (step: number, label: string) => void) => Promise<void>
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
    faviconUrl?: string
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

interface ScrapedBrand {
  companyName: string | null
  description: string | null
  logoUrl: string | null
  faviconUrl: string | null
  colors: {
    primary: string | null
    secondary: string | null
    accent: string | null
  }
  tagline: string | null
}

const STORAGE_KEY = "taskspace_onboarding_state"
const STORAGE_VERSION = 1

interface PersistedOnboardingState {
  version: number
  currentStep: number
  websiteUrl: string
  hasScraped: boolean
  scrapedBrand: ScrapedBrand | null
  orgName: string
  orgSlug: string
  orgDescription: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  logoUrl: string
  faviconUrl: string
  teamInvites: Array<{ email: string; role: "admin" | "manager" | "member"; name?: string }>
  rocks: Array<{ title: string; description: string }>
}

const STEPS = [
  { id: 1, name: "Website", subtitle: "Auto-detect your brand", optional: true },
  { id: 2, name: "Organization", subtitle: "Name and colors", optional: false },
  { id: 3, name: "Team", subtitle: "Invite your people", optional: true },
  { id: 4, name: "Goals", subtitle: "Set quarterly priorities", optional: true },
]

function loadPersistedState(): PersistedOnboardingState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved) as PersistedOnboardingState
    if (parsed.version !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const SETUP_STEPS = [
  { label: "Creating organization", icon: Building2 },
  { label: "Setting up workspace", icon: Palette },
  { label: "Configuring features", icon: Sparkles },
  { label: "Sending invitations", icon: Mail },
  { label: "Creating goals", icon: Target },
  { label: "Finishing up", icon: CheckCircle },
]

export function OnboardingWizard({ onComplete, currentUser }: OnboardingWizardProps) {
  // Load persisted state once on mount
  const [savedState] = useState(() => loadPersistedState())
  const hasRestoredRef = useRef(false)

  const [currentStep, setCurrentStep] = useState(() => savedState?.currentStep ?? 1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [setupProgress, setSetupProgress] = useState(0) // 0-based index into SETUP_STEPS
  const [setupSlow, setSetupSlow] = useState(false) // Shows "taking longer" message after timeout

  // Step 1: Website scrape
  const [websiteUrl, setWebsiteUrl] = useState(() => savedState?.websiteUrl ?? "")
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState("")
  const [scrapedBrand, setScrapedBrand] = useState<ScrapedBrand | null>(() => savedState?.scrapedBrand ?? null)
  const [hasScraped, setHasScraped] = useState(() => savedState?.hasScraped ?? false)

  // Step 2: Organization (auto-populated from scrape)
  const [orgName, setOrgName] = useState(() => savedState?.orgName ?? "")
  const [orgSlug, setOrgSlug] = useState(() => savedState?.orgSlug ?? "")
  const [orgDescription, setOrgDescription] = useState(() => savedState?.orgDescription ?? "")

  // Brand colors (auto-populated from scrape)
  const [primaryColor, setPrimaryColor] = useState(() => savedState?.primaryColor ?? "#3b82f6")
  const [secondaryColor, setSecondaryColor] = useState(() => savedState?.secondaryColor ?? "#60a5fa")
  const [accentColor, setAccentColor] = useState(() => savedState?.accentColor ?? "#8b5cf6")
  const [logoUrl, setLogoUrl] = useState(() => savedState?.logoUrl ?? "")
  const [faviconUrl, setFaviconUrl] = useState(() => savedState?.faviconUrl ?? "")

  // Step 3: Team invites
  const [teamInvites, setTeamInvites] = useState<Array<{ email: string; role: "admin" | "manager" | "member"; name?: string }>>(() => savedState?.teamInvites ?? [])
  const [newInviteEmail, setNewInviteEmail] = useState("")
  const [emailError, setEmailError] = useState("")

  // Step 4: First rock/goal
  const [rocks, setRocks] = useState<Array<{ title: string; description: string }>>(() => savedState?.rocks ?? [])
  const [newRockTitle, setNewRockTitle] = useState("")
  const [newRockDescription, setNewRockDescription] = useState("")

  // Persist state to localStorage on changes
  useEffect(() => {
    // Skip the very first render if we just restored from localStorage
    // to avoid an unnecessary write-back of the same data
    if (!hasRestoredRef.current && savedState) {
      hasRestoredRef.current = true
      return
    }
    hasRestoredRef.current = true

    try {
      const state: PersistedOnboardingState = {
        version: STORAGE_VERSION,
        currentStep,
        websiteUrl,
        hasScraped,
        scrapedBrand,
        orgName,
        orgSlug,
        orgDescription,
        primaryColor,
        secondaryColor,
        accentColor,
        logoUrl,
        faviconUrl,
        teamInvites,
        rocks,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [
    currentStep,
    websiteUrl,
    hasScraped,
    scrapedBrand,
    orgName,
    orgSlug,
    orgDescription,
    primaryColor,
    secondaryColor,
    accentColor,
    logoUrl,
    faviconUrl,
    teamInvites,
    rocks,
  ])

  // Auto-generate slug from org name
  const handleOrgNameChange = (name: string) => {
    setOrgName(name)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    setOrgSlug(slug)
  }

  // Website scraping
  const handleScrapeWebsite = useCallback(async () => {
    let url = websiteUrl.trim()
    if (!url) return

    // Add https:// if not present
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`
      setWebsiteUrl(url)
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      setScrapeError("Please enter a valid website URL")
      return
    }

    setIsScraping(true)
    setScrapeError("")

    try {
      const response = await fetch("/api/firecrawl/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setScrapeError(data.error || "Failed to analyze website. You can skip this step and set up manually.")
        setIsScraping(false)
        return
      }

      if (!data.data?.brand) {
        setScrapeError("Could not extract brand details from this website. You can set up manually.")
        setIsScraping(false)
        return
      }

      const brand: ScrapedBrand = data.data.brand
      setScrapedBrand(brand)
      setHasScraped(true)

      // Auto-populate fields from scraped data
      if (brand.companyName && !orgName) {
        handleOrgNameChange(brand.companyName)
      }
      if (brand.description && !orgDescription) {
        setOrgDescription(brand.description)
      }
      if (brand.logoUrl) {
        setLogoUrl(brand.logoUrl)
      }
      if (brand.faviconUrl) {
        setFaviconUrl(brand.faviconUrl)
      }
      if (brand.colors.primary) {
        setPrimaryColor(brand.colors.primary)
      }
      if (brand.colors.secondary) {
        setSecondaryColor(brand.colors.secondary)
      }
      if (brand.colors.accent) {
        setAccentColor(brand.colors.accent)
      }
    } catch {
      setScrapeError("Could not connect to website. You can skip this step and set up manually.")
    } finally {
      setIsScraping(false)
    }
  }, [websiteUrl, orgName, orgDescription])

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const addTeamInvite = () => {
    const email = newInviteEmail.trim().toLowerCase()
    setEmailError("")

    if (!email) return

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    if (email === currentUser.email.toLowerCase()) {
      setEmailError("You cannot invite yourself")
      return
    }

    if (teamInvites.find(i => i.email === email)) {
      setEmailError("This email has already been added")
      return
    }

    setTeamInvites([...teamInvites, { email, role: "member" }])
    setNewInviteEmail("")
    setEmailError("")
  }

  const removeTeamInvite = (email: string) => {
    setTeamInvites(teamInvites.filter(i => i.email !== email))
  }

  const addRock = () => {
    if (newRockTitle.trim()) {
      setRocks([...rocks, { title: newRockTitle.trim(), description: newRockDescription.trim() }])
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

  const handleSkip = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const [submitError, setSubmitError] = useState<string | null>(null)

  // Progress callback that updates local state for the overlay
  const reportProgress = useCallback((step: number, _label: string) => {
    setSetupProgress(step)
    setSetupSlow(false) // Reset slow indicator on progress
  }, [])

  // Show "taking longer" message if setup stalls for 20 seconds
  useEffect(() => {
    if (!isSubmitting) {
      setSetupSlow(false)
      return
    }
    const timer = setTimeout(() => setSetupSlow(true), 20000)
    return () => clearTimeout(timer)
  }, [isSubmitting, setupProgress])

  const handleComplete = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSetupProgress(0)
    setSetupSlow(false)
    try {
      await onComplete({
        organization: {
          name: orgName,
          slug: orgSlug,
          description: orgDescription || undefined,
        },
        workspace: {
          name: orgName,
          primaryColor,
          secondaryColor,
          accentColor,
          logoUrl: logoUrl || undefined,
          faviconUrl: faviconUrl || undefined,
        },
        teamInvites,
        rocks,
      }, reportProgress)
      // Clear persisted onboarding state on successful completion
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // Ignore storage errors
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Setup failed. Please try again.")
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true // Website step is always skippable
      case 2:
        return orgName.trim().length >= 2 && orgSlug.trim().length >= 2
      case 3:
      case 4:
        return true
      default:
        return false
    }
  }

  const isOptionalStep = STEPS[currentStep - 1]?.optional ?? false
  const isLastStep = currentStep === STEPS.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4 sm:p-6">
      {/* Submission progress overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-sm mx-4 space-y-6">
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">Setting up your workspace</p>
              <p className="text-sm text-slate-500 mt-1">
                {setupSlow ? "Taking a bit longer than expected — hang tight..." : "This usually takes about 10 seconds"}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.min(((setupProgress + 1) / SETUP_STEPS.length) * 100, 100)}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            {/* Step list */}
            <div className="space-y-2">
              {SETUP_STEPS.map((step, index) => {
                const StepIcon = step.icon
                const isActive = index === setupProgress
                const isDone = index < setupProgress
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                      isActive && "bg-slate-50",
                      isDone && "opacity-60",
                      !isActive && !isDone && "opacity-30"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                      isDone && "bg-emerald-100 text-emerald-600",
                      isActive && "bg-black text-white",
                      !isActive && !isDone && "bg-slate-100 text-slate-400"
                    )}>
                      {isDone ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <StepIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-sm transition-all duration-300",
                      isActive && "text-slate-900 font-medium",
                      isDone && "text-slate-600",
                      !isActive && !isDone && "text-slate-400"
                    )}>
                      {step.label}{isDone ? "" : isActive ? "..." : ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <img
            src="/taskspace-logo.png"
            alt="Taskspace"
            className="h-14 sm:h-16 w-auto"
          />
        </div>

        {/* Header with step indicator text */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-sm font-medium text-slate-500 mb-1">
            Step {currentStep} of {STEPS.length} &middot; About 3 minutes total
          </p>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-700">
            {STEPS[currentStep - 1].name}
          </h1>
        </div>

        {/* Progress bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300",
                        isActive && "bg-black text-white shadow-md",
                        isCompleted && "bg-emerald-500 text-white",
                        !isActive && !isCompleted && "bg-slate-200 text-slate-400"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : step.id === 1 ? (
                        <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : step.id === 2 ? (
                        <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : step.id === 3 ? (
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1 hidden sm:block font-medium whitespace-nowrap",
                        isActive && "text-black",
                        isCompleted && "text-emerald-600",
                        !isActive && !isCompleted && "text-slate-400"
                      )}
                    >
                      {step.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] hidden lg:block whitespace-nowrap",
                        isActive && "text-slate-500",
                        isCompleted && "text-emerald-500",
                        !isActive && !isCompleted && "text-slate-300"
                      )}
                    >
                      {step.subtitle}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-1 sm:mx-2 rounded transition-all duration-300",
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
        <Card className="border-slate-200 shadow-lg">
          <div className="p-5 sm:p-8">
            <AnimatePresence mode="wait">
              {/* Step 1: Website URL */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      Welcome, {currentUser.name?.split(" ")[0] || "there"}!
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                      Drop in your company website and we'll automatically set up your workspace with your brand colors, logo, and details.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="websiteUrl">Company Website</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            id="websiteUrl"
                            type="url"
                            placeholder="www.yourcompany.com"
                            value={websiteUrl}
                            onChange={(e) => {
                              setWebsiteUrl(e.target.value)
                              setScrapeError("")
                            }}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleScrapeWebsite())}
                            className="pl-10 text-base"
                            autoFocus
                            disabled={isScraping}
                          />
                        </div>
                        <Button
                          onClick={handleScrapeWebsite}
                          disabled={isScraping || !websiteUrl.trim()}
                          className="bg-black hover:bg-gray-800 text-white shrink-0"
                        >
                          {isScraping ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
                              <span className="hidden sm:inline">Analyzing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Analyze</span>
                            </>
                          )}
                        </Button>
                      </div>
                      {scrapeError && (
                        <div className="flex items-start gap-2 text-sm text-amber-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>{scrapeError}</span>
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        We'll extract your logo, colors, and company info to personalize your workspace.
                      </p>
                    </div>

                    {/* Scrape Results Preview */}
                    {hasScraped && scrapedBrand && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-4"
                      >
                        <div className="flex items-center gap-2 text-emerald-700">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium text-sm">Brand detected!</span>
                        </div>

                        <div className="space-y-3">
                          {/* Logo + Company Name */}
                          <div className="flex items-center gap-3">
                            {scrapedBrand.logoUrl && (
                              <img
                                src={scrapedBrand.logoUrl}
                                alt="Logo"
                                className="w-10 h-10 object-contain rounded border border-slate-200 bg-white p-1"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none"
                                }}
                              />
                            )}
                            <div>
                              {scrapedBrand.companyName && (
                                <p className="font-semibold text-slate-900">{scrapedBrand.companyName}</p>
                              )}
                              {scrapedBrand.tagline && (
                                <p className="text-xs text-slate-600 line-clamp-1">{scrapedBrand.tagline}</p>
                              )}
                            </div>
                          </div>

                          {/* Colors */}
                          {(scrapedBrand.colors.primary || scrapedBrand.colors.secondary || scrapedBrand.colors.accent) && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1.5">Brand Colors</p>
                              <div className="flex items-center gap-2">
                                {scrapedBrand.colors.primary && (
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className="w-8 h-8 rounded-lg shadow-sm border border-slate-200"
                                      style={{ backgroundColor: scrapedBrand.colors.primary }}
                                    />
                                    <span className="text-xs font-mono text-slate-500">{scrapedBrand.colors.primary}</span>
                                  </div>
                                )}
                                {scrapedBrand.colors.secondary && (
                                  <div
                                    className="w-8 h-8 rounded-lg shadow-sm border border-slate-200"
                                    style={{ backgroundColor: scrapedBrand.colors.secondary }}
                                  />
                                )}
                                {scrapedBrand.colors.accent && (
                                  <div
                                    className="w-8 h-8 rounded-lg shadow-sm border border-slate-200"
                                    style={{ backgroundColor: scrapedBrand.colors.accent }}
                                  />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Description preview */}
                          {scrapedBrand.description && (
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Description</p>
                              <p className="text-xs text-slate-700 line-clamp-2">{scrapedBrand.description}</p>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-emerald-600">
                          These details will be used to set up your workspace. You can adjust everything in the next step.
                        </p>
                      </motion.div>
                    )}

                    {/* Loading state */}
                    {isScraping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-6 bg-slate-50 border border-slate-200 rounded-lg text-center"
                      >
                        <Loader2 className="w-8 h-8 text-slate-400 mx-auto mb-3 animate-spin" role="status" aria-label="Analyzing website" />
                        <p className="text-sm text-slate-600 font-medium">Analyzing your website...</p>
                        <p className="text-xs text-slate-500 mt-1">Extracting logo, colors, and brand details</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Organization */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      {hasScraped ? "Confirm your details" : "Set up your organization"}
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                      {hasScraped
                        ? "We filled in what we found. Review and adjust anything that needs tweaking."
                        : "Your organization is the shared home for your team's goals, tasks, and daily accountability."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="orgName"
                        placeholder="e.g., Acme Inc, Marketing Team, TechCo"
                        value={orgName}
                        onChange={(e) => handleOrgNameChange(e.target.value)}
                        autoFocus={!hasScraped}
                        className="text-base"
                      />
                      <p className="text-xs text-slate-500">
                        Your company or team name. You can always change this later in settings.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgSlug">URL Slug <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 whitespace-nowrap hidden sm:block">app.trytaskspace.com/</span>
                        <Input
                          id="orgSlug"
                          placeholder="acme-inc"
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        <span className="sm:hidden">Your unique URL: app.trytaskspace.com/{orgSlug || "..."}</span>
                        <span className="hidden sm:inline">Only lowercase letters, numbers, and hyphens allowed.</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="orgDescription">
                        Description <span className="text-slate-400 font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        id="orgDescription"
                        placeholder="What does your organization do? This helps us personalize your experience."
                        value={orgDescription}
                        onChange={(e) => setOrgDescription(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    {/* Brand Colors Section */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-slate-500" />
                        <Label>Brand Colors</Label>
                      </div>

                      {/* Logo preview */}
                      {logoUrl && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <img
                            src={logoUrl}
                            alt="Your logo"
                            className="w-10 h-10 object-contain rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none"
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500">Logo detected</p>
                            <p className="text-xs text-slate-400 truncate">{logoUrl}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLogoUrl("")}
                            className="text-slate-400 hover:text-red-500 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-slate-500">Primary</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                            />
                            <Input
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="flex-1 font-mono text-xs h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Secondary</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                            />
                            <Input
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="flex-1 font-mono text-xs h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">Accent</Label>
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="color"
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="w-10 h-10 rounded border border-slate-200 cursor-pointer"
                            />
                            <Input
                              value={accentColor}
                              onChange={(e) => setAccentColor(e.target.value)}
                              className="flex-1 font-mono text-xs h-8"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Mini preview */}
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="px-3 py-1.5 rounded text-white text-xs font-medium"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Primary
                        </div>
                        <div
                          className="px-3 py-1.5 rounded text-white text-xs font-medium"
                          style={{ backgroundColor: secondaryColor }}
                        >
                          Secondary
                        </div>
                        <div
                          className="px-3 py-1.5 rounded text-white text-xs font-medium"
                          style={{ backgroundColor: accentColor }}
                        >
                          Accent
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Team Invites */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      Bring your team along
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                      Collaboration is at the heart of what we do. Invite your team members so you can
                      set goals together, track progress, and build daily accountability as a group.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email Address</Label>
                      <div className="flex gap-2">
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="colleague@company.com"
                          value={newInviteEmail}
                          onChange={(e) => {
                            setNewInviteEmail(e.target.value)
                            setEmailError("")
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTeamInvite())}
                          className="flex-1"
                        />
                        <Button onClick={addTeamInvite} variant="outline" className="shrink-0">
                          <Plus className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Add</span>
                        </Button>
                      </div>
                      {emailError && (
                        <p className="text-xs text-red-600">{emailError}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        They will receive an email invitation to join. You can also invite people later from settings.
                      </p>
                    </div>

                    {teamInvites.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Pending Invitations ({teamInvites.length})</Label>
                        <div className="space-y-2 max-h-[240px] overflow-y-auto">
                          {teamInvites.map((invite) => (
                            <div
                              key={invite.email}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Mail className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm text-slate-900 truncate">{invite.email}</p>
                                  <p className="text-xs text-slate-500">Will be added as a member</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTeamInvite(invite.email)}
                                className="text-slate-400 hover:text-red-600 flex-shrink-0 ml-2"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {teamInvites.length === 0 && (
                      <div className="text-center py-8 sm:py-10 border-2 border-dashed border-slate-200 rounded-lg">
                        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No team members added yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          You can always invite people later from Settings
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: First Rock/Goal */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      What are you working toward?
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                      We call big quarterly priorities "Rocks" -- the 3 to 7 things that matter most
                      this quarter. Add one now to hit the ground running, or skip this and add them later.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="rockTitle">Goal Title</Label>
                        <Input
                          id="rockTitle"
                          placeholder="e.g., Launch new product feature, Increase MRR by 20%"
                          value={newRockTitle}
                          onChange={(e) => setNewRockTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && newRockTitle.trim() && (e.preventDefault(), addRock())}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rockDesc">
                          Description <span className="text-slate-400 font-normal">(optional)</span>
                        </Label>
                        <Textarea
                          id="rockDesc"
                          placeholder="What does success look like for this goal?"
                          value={newRockDescription}
                          onChange={(e) => setNewRockDescription(e.target.value)}
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                      <Button
                        onClick={addRock}
                        variant="outline"
                        className="w-full"
                        disabled={!newRockTitle.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Rock
                      </Button>
                    </div>

                    {rocks.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Your Rocks ({rocks.length})</Label>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {rocks.map((rock, index) => (
                            <div
                              key={index}
                              className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    <h4 className="font-medium text-sm text-slate-900 truncate">{rock.title}</h4>
                                  </div>
                                  {rock.description && (
                                    <p className="text-xs text-slate-600 mt-1 ml-6 line-clamp-2">{rock.description}</p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRock(index)}
                                  className="text-slate-400 hover:text-red-600 flex-shrink-0"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rocks.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                        <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No goals added yet</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Add your top priorities or skip for now
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Error */}
            {submitError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-700 font-medium">Setup failed</p>
                    <p className="text-xs text-red-600 mt-0.5">{submitError}</p>
                  </div>
                  <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 text-red-700 border-red-200 hover:bg-red-100"
                  onClick={() => {
                    setSubmitError(null)
                    handleComplete()
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-slate-200">
              {/* Back button */}
              <div>
                {currentStep > 1 ? (
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="w-full sm:w-auto gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}
              </div>

              {/* Forward buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Skip button for optional steps */}
                {isOptionalStep && !isLastStep && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isScraping}
                    className="w-full sm:w-auto gap-2 text-slate-500 order-2 sm:order-1"
                  >
                    <SkipForward className="w-4 h-4" />
                    {currentStep === 1 ? "Skip, I'll set up manually" : "Skip for now"}
                  </Button>
                )}

                {/* Main action button */}
                {!isLastStep ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed() || isScraping}
                    className="w-full sm:w-auto bg-black hover:bg-gray-800 text-white gap-2 order-1 sm:order-2"
                  >
                    {currentStep === 1 && hasScraped ? "Use these details" : "Continue"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                    {isOptionalStep && (
                      <Button
                        variant="ghost"
                        onClick={handleComplete}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto gap-2 text-slate-500"
                      >
                        <SkipForward className="w-4 h-4" />
                        Skip and launch
                      </Button>
                    )}
                    <Button
                      onClick={handleComplete}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating workspace...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Launch Workspace
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Bottom helper text */}
        <p className="text-center text-xs text-slate-400 mt-4">
          Everything here can be changed later in Settings. Need help?{" "}
          <a href="mailto:team@trytaskspace.com" className="underline hover:text-slate-600">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
