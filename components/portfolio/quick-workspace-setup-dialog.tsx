"use client"

import { useState } from "react"
import { useApp } from "@/lib/contexts/app-context"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2, Plus, X, ChevronRight, ChevronLeft,
  Sparkles, Globe, Users, ClipboardList, Zap,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRock {
  title: string
  description: string
  milestones: string[]
  suggestedQuarter?: string
}

interface ParsedTask {
  title: string
  priority: "low" | "medium" | "high"
  dueDate?: string
  rockTitle?: string
}

interface InviteRow {
  email: string
  role: "admin" | "member"
}

interface PortfolioOrg {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  role: string
  memberCount: number
  eodsToday: number
  activeTasks: number
  openEscalations: number
  plan: string
  eodRate7Day: number
  eodRateTrend: "up" | "down" | "stable"
  completedTasksThisWeek: number
  riskLevel: "healthy" | "warning" | "critical"
  avgRockProgress: number
  rockHealth: { onTrack: number; atRisk: number; blocked: number; completed: number }
}

interface QuickWorkspaceSetupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (org: PortfolioOrg) => void
}

// ─── Step labels ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Branding", icon: Globe },
  { label: "Rocks & Tasks", icon: ClipboardList },
  { label: "Team", icon: Users },
  { label: "Review", icon: Zap },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickWorkspaceSetupDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickWorkspaceSetupDialogProps) {
  const { refreshSession } = useApp()
  const [step, setStep] = useState(0)

  // Step 1 — Branding
  const [name, setName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [primaryColor, setPrimaryColor] = useState("")
  const [secondaryColor, setSecondaryColor] = useState("")
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)

  // Step 2 — Rocks & Tasks
  const [rawText, setRawText] = useState("")
  const [parsedRocks, setParsedRocks] = useState<ParsedRock[]>([])
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  // Step 3 — Team
  const [invites, setInvites] = useState<InviteRow[]>([])

  // Step 4 — Publishing
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function reset() {
    setStep(0)
    setName("")
    setWebsiteUrl("")
    setLogoUrl("")
    setPrimaryColor("")
    setSecondaryColor("")
    setScrapeError(null)
    setRawText("")
    setParsedRocks([])
    setParsedTasks([])
    setParseError(null)
    setInvites([])
    setPublishError(null)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
  }

  // ── Step 1: Scrape ────────────────────────────────────────────────────────────

  async function handleScrape() {
    if (!websiteUrl.trim()) return
    setIsScraping(true)
    setScrapeError(null)
    try {
      const res = await fetch("/api/firecrawl/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      })
      const json = await res.json()
      if (json.success && json.data?.brand) {
        const { brand } = json.data
        if (brand.logoUrl && !logoUrl) setLogoUrl(brand.logoUrl)
        if (brand.colors?.primary && !primaryColor) setPrimaryColor(brand.colors.primary)
        if (brand.colors?.secondary && !secondaryColor) setSecondaryColor(brand.colors.secondary)
      } else {
        setScrapeError(json.error || "Could not extract brand data — you can fill in manually.")
      }
    } catch {
      setScrapeError("Scrape failed — fill in manually below.")
    } finally {
      setIsScraping(false)
    }
  }

  // ── Step 2: Parse ─────────────────────────────────────────────────────────────

  async function handleParse() {
    if (!rawText.trim()) return
    setIsParsing(true)
    setParseError(null)
    try {
      const res = await fetch("/api/rocks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ text: rawText.trim() }),
      })
      const json = await res.json()
      if (json.success && json.data) {
        setParsedRocks(json.data.rocks ?? [])
        setParsedTasks(json.data.tasks ?? [])
      } else {
        setParseError(json.error || "Could not parse rocks.")
      }
    } catch {
      setParseError("Parse failed. Please try again.")
    } finally {
      setIsParsing(false)
    }
  }

  function removeRock(index: number) {
    setParsedRocks((prev) => prev.filter((_, i) => i !== index))
  }

  function removeMilestone(rockIndex: number, milestoneIndex: number) {
    setParsedRocks((prev) =>
      prev.map((r, i) =>
        i === rockIndex
          ? { ...r, milestones: r.milestones.filter((_, mi) => mi !== milestoneIndex) }
          : r
      )
    )
  }

  // ── Step 3: Team ──────────────────────────────────────────────────────────────

  function addInvite() {
    setInvites((prev) => [...prev, { email: "", role: "member" }])
  }

  function updateInvite(index: number, field: keyof InviteRow, value: string) {
    setInvites((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  function removeInvite(index: number) {
    setInvites((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Step 4: Publish ────────────────────────────────────────────────────────────

  async function handlePublish() {
    setIsPublishing(true)
    setPublishError(null)
    try {
      const validInvites = invites.filter((i) => i.email.trim())
      const res = await fetch("/api/super-admin/quick-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          orgName: name.trim(),
          logoUrl: logoUrl.trim() || null,
          primaryColor: primaryColor.trim() || null,
          secondaryColor: secondaryColor.trim() || null,
          rocks: parsedRocks.map((r) => ({
            title: r.title,
            description: r.description,
            milestones: r.milestones,
            quarter: r.suggestedQuarter,
          })),
          tasks: parsedTasks,
          invites: validInvites,
        }),
      })
      const json = await res.json()
      if (json.success && json.data?.newOrg) {
        onSuccess(json.data.newOrg)
        // Switch session to the new org and navigate to its dashboard
        const switchRes = await fetch("/api/user/switch-organization", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ organizationId: json.data.orgId }),
        })
        const switchJson = await switchRes.json()
        if (switchJson.success) {
          await refreshSession()
          window.location.reload()
        } else {
          // Org was created — just close and let user switch manually
          handleOpenChange(false)
        }
      } else {
        setPublishError(json.error || "Failed to create workspace.")
      }
    } catch {
      setPublishError("An unexpected error occurred.")
    } finally {
      setIsPublishing(false)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────────

  const canGoNext = step === 0 ? name.trim().length >= 2 : true
  const validInvitesCount = invites.filter((i) => i.email.trim()).length

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Workspace Setup
          </DialogTitle>
          <DialogDescription>
            Provision a new client workspace in one pass.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2 min-h-0">
          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-6">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active = i === step
              const done = i < step
              return (
                <div key={s.label} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (i < step || (i > step && canGoNext)) setStep(i)
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      active
                        ? "bg-slate-900 text-white"
                        : done
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                        : "text-slate-400 cursor-default"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {s.label}
                  </button>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-slate-300 mx-0.5" />
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Step 1: Branding ── */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qs-name">
                  Client / Org Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="qs-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qs-website">Website URL (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="qs-website"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://acme.com"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleScrape}
                    disabled={!websiteUrl.trim() || isScraping}
                  >
                    {isScraping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    <span className="ml-1">Scrape Brand</span>
                  </Button>
                </div>
                {scrapeError && (
                  <p className="text-xs text-amber-600">{scrapeError}</p>
                )}
              </div>

              {/* Brand preview */}
              {(logoUrl || primaryColor) && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  {primaryColor && (
                    <div
                      className="h-8 w-8 rounded-full border border-slate-200 flex-shrink-0"
                      style={{ backgroundColor: primaryColor }}
                      title={primaryColor}
                    />
                  )}
                  {secondaryColor && (
                    <div
                      className="h-8 w-8 rounded-full border border-slate-200 flex-shrink-0"
                      style={{ backgroundColor: secondaryColor }}
                      title={secondaryColor}
                    />
                  )}
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-8 max-w-[120px] object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  )}
                </div>
              )}

              {/* Manual overrides */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="qs-logo" className="text-xs">Logo URL</Label>
                  <Input
                    id="qs-logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qs-color" className="text-xs">Primary Color</Label>
                  <div className="flex gap-1">
                    <Input
                      id="qs-color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#2563EB"
                      className="text-sm flex-1"
                    />
                    {primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) && (
                      <div
                        className="h-9 w-9 rounded border border-slate-200 flex-shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Rocks & Tasks ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qs-rocks-text">Paste rock descriptions</Label>
                <Textarea
                  id="qs-rocks-text"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`e.g.\n- Launch new product line by Q3\n  - Complete market research\n  - Finalize pricing strategy\n- Hire 3 engineers`}
                  rows={5}
                  className="resize-none font-mono text-sm max-h-48 overflow-y-auto"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleParse}
                  disabled={!rawText.trim() || isParsing}
                >
                  {isParsing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Parse with AI
                </Button>
                {parseError && <p className="text-xs text-red-600">{parseError}</p>}
              </div>

              {parsedRocks.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {parsedRocks.map((rock, ri) => (
                    <div key={ri} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{rock.title}</p>
                        <button
                          type="button"
                          onClick={() => removeRock(ri)}
                          className="text-slate-400 hover:text-red-500 flex-shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {rock.milestones.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rock.milestones.map((m, mi) => (
                            <Badge
                              key={mi}
                              variant="secondary"
                              className="text-xs flex items-center gap-1 pr-1"
                            >
                              {m}
                              <button
                                type="button"
                                onClick={() => removeMilestone(ri, mi)}
                                className="ml-0.5 hover:text-red-500"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {parsedRocks.length === 0 && !rawText && (
                <p className="text-xs text-slate-400 italic">
                  Skip this step if you want to add rocks later from within the workspace.
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Team ── */}
          {step === 2 && (
            <div className="space-y-3">
              {invites.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  No invitations yet — skip this step to add team members later.
                </p>
              )}

              {invites.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={row.email}
                    onChange={(e) => updateInvite(i, "email", e.target.value)}
                    placeholder="name@company.com"
                    type="email"
                    className="flex-1 text-sm"
                  />
                  <Select
                    value={row.role}
                    onValueChange={(v) => updateInvite(i, "role", v as "admin" | "member")}
                  >
                    <SelectTrigger className="w-28 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeInvite(i)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInvite}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
            </div>
          )}

          {/* ── Step 4: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Ready to publish</h3>

              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-slate-500">Organization</span>
                  <span className="font-medium">{name.trim() || "—"}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-slate-500">Branding</span>
                  <div className="flex items-center gap-2">
                    {primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) && (
                      <div
                        className="h-4 w-4 rounded-full border border-slate-200"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt="logo"
                        className="h-4 max-w-[60px] object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-slate-500">Rocks</span>
                  <Badge variant="secondary">{parsedRocks.length}</Badge>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-slate-500">Tasks (from milestones)</span>
                  <Badge variant="secondary">
                    {parsedTasks.length + parsedRocks.reduce((s, r) => s + r.milestones.length, 0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-slate-500">Invitations</span>
                  <Badge variant="secondary">{validInvitesCount}</Badge>
                </div>
              </div>

              {publishError && (
                <p className="text-sm text-red-600">{publishError}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                disabled={isPublishing}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step < STEPS.length - 1 && (
              <>
                {step > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Skip
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canGoNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}

            {step === STEPS.length - 1 && (
              <Button
                type="button"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing || name.trim().length < 2}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up workspace…
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Publish
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
