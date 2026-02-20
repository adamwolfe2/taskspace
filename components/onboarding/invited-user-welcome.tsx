"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useApp } from "@/lib/contexts/app-context"
import { api } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowRight,
  CheckCircle,
  FileText,
  Target,
  Users,
  ListTodo,
  Globe,
  Briefcase,
  Sparkles,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STEPS = [
  { id: 1, name: "Welcome" },
  { id: 2, name: "Your Profile" },
  { id: 3, name: "Quick Tour" },
]

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Toronto", label: "Eastern (Toronto)" },
  { value: "America/Vancouver", label: "Pacific (Vancouver)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
]

const FEATURE_CARDS = [
  {
    icon: FileText,
    title: "Daily EOD Reports",
    description: "Submit your end-of-day updates to keep your team in sync on what you accomplished and what's next.",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    iconBg: "bg-blue-100",
  },
  {
    icon: Target,
    title: "Rocks",
    description: "Track your quarterly goals (Rocks) and milestones. Stay focused on the priorities that matter most.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    iconBg: "bg-emerald-100",
  },
  {
    icon: Users,
    title: "Meetings",
    description: "Join Level 10 meetings with your team. Structured agendas, scorecard reviews, and IDS sessions.",
    color: "bg-purple-50 text-purple-600 border-purple-200",
    iconBg: "bg-purple-100",
  },
  {
    icon: ListTodo,
    title: "Tasks",
    description: "Manage your to-dos, track assignments, and link tasks to your quarterly Rocks for full visibility.",
    color: "bg-amber-50 text-amber-600 border-amber-200",
    iconBg: "bg-amber-100",
  },
]

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "America/New_York"
  }
}

export function InvitedUserWelcome() {
  const { currentUser, currentOrganization, setCurrentPage, setCurrentUser } = useApp()
  const [currentStep, setCurrentStep] = useState(1)

  // Profile fields
  const [jobTitle, setJobTitle] = useState(currentUser?.jobTitle || "")
  const [timezone, setTimezone] = useState(() => {
    return currentUser?.timezone || detectTimezone()
  })
  const [isSaving, setIsSaving] = useState(false)

  const orgName = currentOrganization?.name || "your organization"
  const userName = currentUser?.name?.split(" ")[0] || "there"
  const orgLogo = currentOrganization?.logoUrl
  const orgColor = currentOrganization?.primaryColor

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return

    setIsSaving(true)
    try {
      await api.members.update(currentUser.id, {
        jobTitle: jobTitle || undefined,
        timezone: timezone || undefined,
      })

      // Update local state
      setCurrentUser({
        ...currentUser,
        jobTitle: jobTitle || undefined,
        timezone: timezone || undefined,
      })

      handleNext()
    } catch {
      // Still proceed even if save fails - user can update later
      handleNext()
    } finally {
      setIsSaving(false)
    }
  }

  const handleGoToDashboard = () => {
    setCurrentPage("dashboard")
  }

  const handleSkipToDashboard = () => {
    setCurrentPage("dashboard")
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl">
        {/* Step indicator */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-sm font-medium text-slate-500 mb-1">
            Step {currentStep} of {STEPS.length}
          </p>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-700">
            {STEPS[currentStep - 1].name}
          </h1>
        </div>

        {/* Progress bar */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300",
                        isActive && "bg-blue-600 text-white shadow-md shadow-blue-200",
                        isCompleted && "bg-emerald-500 text-white",
                        !isActive && !isCompleted && "bg-slate-200 text-slate-400"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <span className="text-sm font-semibold">{step.id}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1 hidden sm:block font-medium",
                        isActive && "text-blue-600",
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
              {/* Step 1: Welcome */}
              {currentStep === 1 && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Org branding */}
                  <div className="text-center">
                    {orgLogo ? (
                      <div className="flex justify-center mb-4">
                        <img
                          src={orgLogo}
                          alt={orgName}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex justify-center mb-4">
                        <div
                          className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                          style={{ backgroundColor: orgColor || "#3b82f6" }}
                        >
                          {orgName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}

                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                      Welcome to {orgName}!
                    </h2>
                    <p className="text-slate-600 text-base sm:text-lg mb-1">
                      Hey {userName}, glad to have you on board.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 sm:p-5 border border-slate-200">
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                      Your team uses <span className="font-semibold">Taskspace</span> to track goals, submit daily progress updates, and run structured meetings. It's built on the EOS (Entrepreneurial Operating System) framework to keep everyone aligned and accountable.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                      <Target className="w-6 h-6 text-blue-600 mx-auto mb-1.5" />
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Set Goals</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <FileText className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Daily Updates</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <Users className="w-6 h-6 text-purple-600 mx-auto mb-1.5" />
                      <p className="text-xs sm:text-sm font-medium text-slate-700">Team Sync</p>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      onClick={handleSkipToDashboard}
                      className="text-slate-500 order-2 sm:order-1"
                    >
                      Skip to dashboard
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2 order-1 sm:order-2"
                    >
                      Let's get started
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Complete Your Profile */}
              {currentStep === 2 && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      Complete Your Profile
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                      Help your team get to know you. These details are optional and can be changed anytime in settings.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {/* Avatar placeholder */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                        <User className="w-7 h-7 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{currentUser?.name}</p>
                        <p className="text-xs text-slate-500">{currentUser?.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          You can add a profile photo later in Settings
                        </p>
                      </div>
                    </div>

                    {/* Job title */}
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-500" />
                        Job Title
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </Label>
                      <Input
                        id="jobTitle"
                        placeholder="e.g., Product Manager, Senior Engineer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="text-base"
                      />
                    </div>

                    {/* Timezone */}
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-500" />
                        Timezone
                      </Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Auto-detected from your browser. Used for reminders and scheduling.
                      </p>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentStep(1)}
                      className="text-slate-500 order-2 sm:order-1"
                    >
                      Back
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2">
                      <Button
                        variant="ghost"
                        onClick={handleNext}
                        className="text-slate-500"
                      >
                        Skip
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                      >
                        {isSaving ? "Saving..." : "Continue"}
                        {!isSaving && <ArrowRight className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Quick Tour */}
              {currentStep === 3 && (
                <motion.div
                  key="tour"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
                      Here's what you can do
                    </h2>
                    <p className="text-slate-600 text-sm sm:text-base">
                      A quick look at the tools you'll use every day with your team.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:gap-4">
                    {FEATURE_CARDS.map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.08 }}
                        className={cn(
                          "flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border",
                          feature.color
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            feature.iconBg
                          )}
                        >
                          <feature.icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                            {feature.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Navigation */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentStep(2)}
                      className="text-slate-500 order-2 sm:order-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleGoToDashboard}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 order-1 sm:order-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Go to Dashboard
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Bottom helper text */}
        <p className="text-center text-xs text-slate-400 mt-4">
          You can always update your profile and preferences in Settings.{" "}
          <a href="mailto:team@trytaskspace.com" className="underline hover:text-slate-600">
            Need help?
          </a>
        </p>
      </div>
    </div>
  )
}
