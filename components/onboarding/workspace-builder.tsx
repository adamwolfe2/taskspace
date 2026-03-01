"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import {
  Sparkles,
  ClipboardCopy,
  ChevronRight,
  Loader2,
  Check,
  Users,
  Building2,
  FolderOpen,
  Target,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react"
import type { WorkspaceBuilderPayload } from "@/lib/ai/claude-client"

type Step = "input" | "preview" | "building" | "done"
type InputMode = "ai" | "json"

interface BuildResult {
  created: { members: number; clients: number; projects: number; rocks: number; tasks: number }
  skipped: { members: number; tasks: number }
  invitesSent: number
  errors: string[]
}

// The prompt users copy into their own AI
const COPY_PROMPT = `You are helping set up a workspace in TaskSpace, a team management platform.

I'll describe my organization below. Parse it and return ONLY valid JSON in this exact structure (omit keys where you have no data):

{
  "members": [{ "name": "Full Name", "email": "email@company.com", "role": "member|admin", "department": "Sales", "jobTitle": "Account Executive" }],
  "clients": [{ "name": "Acme Corp", "industry": "Technology", "website": "https://acme.com", "notes": "Key account..." }],
  "projects": [{ "name": "Q1 Launch", "description": "...", "clientName": "Acme Corp", "status": "active" }],
  "rocks": [{ "title": "Increase MRR by 20%", "description": "...", "ownerEmail": "jane@co.com", "quarter": "Q1 2025", "dueDate": "2025-03-31", "milestones": ["Close 5 deals", "Launch referral program"] }],
  "tasks": [{ "title": "Send proposal to Acme", "description": "...", "assigneeEmail": "john@co.com", "priority": "high", "dueDate": "2025-01-31", "rockTitle": "Increase MRR by 20%" }]
}

Rules:
- dueDate must be YYYY-MM-DD format (e.g. 2025-03-31)
- quarter must be "Q1 2025" format
- role: use "admin" only for managers/directors/VPs/C-suite
- priority: "low", "normal", "high", or "urgent"
- rockTitle in tasks must exactly match a title in the rocks array
- Only include real people and real items — no placeholders

Here is my organization information:

[PASTE YOUR DOCS, ORG CHART, GOALS, TEAM INFO HERE]`

interface CountCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  items?: Array<{ name?: string; title?: string; email?: string }>
}

function CountCard({ icon: Icon, label, count, items }: CountCardProps) {
  if (count === 0) return null
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="ml-auto text-sm font-semibold text-slate-900">{count}</span>
      </div>
      {items && items.length > 0 && (
        <ul className="space-y-0.5">
          {items.slice(0, 3).map((item, i) => (
            <li key={i} className="text-xs text-slate-500 truncate">
              · {item.title || item.name || item.email}
            </li>
          ))}
          {items.length > 3 && (
            <li className="text-xs text-slate-400">+ {items.length - 3} more</li>
          )}
        </ul>
      )}
    </div>
  )
}

interface WorkspaceBuilderProps {
  onClose: () => void
}

export function WorkspaceBuilder({ onClose }: WorkspaceBuilderProps) {
  const { currentWorkspace } = useWorkspaces()
  const { setCurrentPage } = useApp()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>("input")
  const [inputMode, setInputMode] = useState<InputMode>("ai")
  const [textInput, setTextInput] = useState("")
  const [jsonInput, setJsonInput] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [payload, setPayload] = useState<WorkspaceBuilderPayload | null>(null)
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null)
  const [copied, setCopied] = useState(false)

  const workspaceId = currentWorkspace?.id

  // ── Step 1A: AI parse ────────────────────────────────────────────────────
  const handleAIParse = useCallback(async () => {
    if (!textInput.trim() || textInput.trim().length < 20) {
      toast({ title: "Too short", description: "Paste more content to parse.", variant: "destructive" })
      return
    }
    setIsParsing(true)
    try {
      const res = await fetch("/api/ai/parse-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ text: textInput.trim() }),
      })
      const data = await res.json().catch(() => ({ success: false, error: "Server error" }))
      if (!data.success) throw new Error(data.error || "Parse failed")
      setPayload(data.data)
      setStep("preview")
    } catch (err) {
      toast({
        title: "Parse failed",
        description: err instanceof Error ? err.message : "Could not parse your text. Try again.",
        variant: "destructive",
      })
    } finally {
      setIsParsing(false)
    }
  }, [textInput, toast])

  // ── Step 1B: JSON paste ──────────────────────────────────────────────────
  const handleJSONParse = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonInput.trim()) as WorkspaceBuilderPayload
      setPayload(parsed)
      setStep("preview")
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Could not parse the JSON. Make sure your AI returned valid JSON.",
        variant: "destructive",
      })
    }
  }, [jsonInput, toast])

  // ── Copy prompt to clipboard ─────────────────────────────────────────────
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(COPY_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
      toast({ title: "Prompt copied!", description: "Paste it into Claude, ChatGPT, or any AI." })
    } catch {
      toast({ title: "Copy failed", description: "Please copy the prompt manually.", variant: "destructive" })
    }
  }, [toast])

  // ── Step 3: Build ────────────────────────────────────────────────────────
  const handleBuild = useCallback(async () => {
    if (!payload || !workspaceId) return
    setStep("building")
    try {
      const res = await fetch("/api/onboarding/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ workspaceId, payload }),
      })
      const data = await res.json().catch(() => ({ success: false, error: "Server error" }))
      if (!data.success) throw new Error(data.error || "Build failed")
      setBuildResult(data.data)
      setStep("done")
    } catch (err) {
      toast({
        title: "Build failed",
        description: err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      })
      setStep("preview")
    }
  }, [payload, workspaceId, toast])

  const totalItems = payload
    ? (payload.members?.length || 0) +
      (payload.clients?.length || 0) +
      (payload.projects?.length || 0) +
      (payload.rocks?.length || 0) +
      (payload.tasks?.length || 0)
    : 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-md border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-700" />
            <h2 className="text-base font-semibold text-slate-900">Workspace Builder</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {(["input", "preview", "building", "done"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                s === step
                  ? "bg-slate-900"
                  : i < ["input", "preview", "building", "done"].indexOf(step)
                  ? "bg-slate-400"
                  : "bg-slate-100"
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── INPUT ─────────────────────────────────────────────────────── */}
          {step === "input" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Set up your workspace</h3>
                <p className="text-sm text-slate-500">
                  Paste your org docs, goals, team roster, or client list — AI will extract everything and populate your workspace automatically.
                </p>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setInputMode("ai")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    inputMode === "ai"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  AI Parse (paste your docs)
                </button>
                <button
                  onClick={() => setInputMode("json")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    inputMode === "json"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Use your own AI (copy prompt)
                </button>
              </div>

              {inputMode === "ai" ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder={`Paste anything here:\n\n• Org chart or team roster\n• Quarterly goals / rocks / OKRs\n• Project list\n• Client names\n• Meeting notes\n• Strategy docs\n\nThe more you share, the better the setup.`}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="min-h-[220px] text-sm resize-none font-mono"
                  />
                  <p className="text-xs text-slate-400">
                    Uses Claude AI to extract members, rocks, tasks, clients, and projects.
                    AI credits will be consumed.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                    <p className="text-sm text-slate-700 font-medium">How it works:</p>
                    <ol className="space-y-1.5 text-sm text-slate-600 list-decimal list-inside">
                      <li>Copy the prompt below to your clipboard</li>
                      <li>Paste it into Claude, ChatGPT, Gemini, or any AI</li>
                      <li>Add your own docs/info where indicated</li>
                      <li>Copy the JSON output and paste it back here</li>
                    </ol>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPrompt}
                      className="gap-2 w-full"
                    >
                      {copied ? (
                        <><Check className="h-3.5 w-3.5 text-green-600" /> Copied!</>
                      ) : (
                        <><ClipboardCopy className="h-3.5 w-3.5" /> Copy Prompt to Clipboard</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    placeholder='Paste the JSON from your AI here...&#10;&#10;{"members": [...], "rocks": [...], "tasks": [...]}'
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    className="min-h-[160px] text-xs font-mono resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── PREVIEW ───────────────────────────────────────────────────── */}
          {step === "preview" && payload && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Ready to create {totalItems} items
                </h3>
                <p className="text-sm text-slate-500">
                  Review what will be added to your workspace. Click Build to proceed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <CountCard
                  icon={Users}
                  label="Members"
                  count={payload.members?.length || 0}
                  items={payload.members}
                />
                <CountCard
                  icon={Building2}
                  label="Clients"
                  count={payload.clients?.length || 0}
                  items={payload.clients}
                />
                <CountCard
                  icon={FolderOpen}
                  label="Projects"
                  count={payload.projects?.length || 0}
                  items={payload.projects}
                />
                <CountCard
                  icon={Target}
                  label="Rocks"
                  count={payload.rocks?.length || 0}
                  items={payload.rocks}
                />
                <CountCard
                  icon={ClipboardList}
                  label="Tasks"
                  count={payload.tasks?.length || 0}
                  items={payload.tasks}
                />
              </div>

              {totalItems === 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  No items were found. Go back and try with more detailed text.
                </div>
              )}

              {(payload.members?.some(m => !(m as { email?: string }).email)) && (
                <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Some members are missing email addresses and won&apos;t be created.
                    Add them manually from <strong>Team Management</strong> after building.
                  </span>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Existing team members with matching emails will be skipped. This cannot be undone.
              </p>
            </div>
          )}

          {/* ── BUILDING ──────────────────────────────────────────────────── */}
          {step === "building" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-slate-400 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-medium text-slate-900">Building your workspace…</p>
                <p className="text-xs text-slate-500 mt-1">
                  Creating members, clients, projects, rocks, and tasks
                </p>
              </div>
            </div>
          )}

          {/* ── DONE ──────────────────────────────────────────────────────── */}
          {step === "done" && buildResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Workspace ready!</h3>
                  <p className="text-xs text-slate-500">Your workspace has been populated.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ["Members", buildResult.created.members, Users],
                    ["Clients", buildResult.created.clients, Building2],
                    ["Projects", buildResult.created.projects, FolderOpen],
                    ["Rocks", buildResult.created.rocks, Target],
                    ["Tasks", buildResult.created.tasks, ClipboardList],
                  ] as const
                ).map(([label, count, Icon]) =>
                  count > 0 ? (
                    <div
                      key={label}
                      className="flex items-center gap-2 border border-slate-200 rounded-lg p-2.5"
                    >
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{label}</span>
                      <span className="ml-auto font-semibold text-slate-900">{count}</span>
                    </div>
                  ) : null
                )}
              </div>

              {buildResult.invitesSent > 0 && (
                <p className="text-sm text-slate-600">
                  · {buildResult.invitesSent} invite email{buildResult.invitesSent === 1 ? "" : "s"} sent
                </p>
              )}

              {(buildResult.skipped.members > 0 || buildResult.errors.length > 0) && (
                <div className="text-xs text-slate-500 space-y-1">
                  {buildResult.skipped.members > 0 && (
                    <p>· {buildResult.skipped.members} member(s) skipped (already in org)</p>
                  )}
                  {buildResult.errors.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-amber-600">· {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {step === "input" && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={inputMode === "ai" ? handleAIParse : handleJSONParse}
                disabled={isParsing || (inputMode === "ai" ? !textInput.trim() : !jsonInput.trim())}
                className="gap-2"
              >
                {isParsing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Parsing…</>
                ) : (
                  <>Next <ChevronRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep("input")}>
                <><ArrowLeft className="h-4 w-4 mr-1" />Back</>
              </Button>
              <Button
                size="sm"
                onClick={handleBuild}
                disabled={totalItems === 0}
                className="gap-2"
              >
                Build Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          {step === "done" && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onClose()
                  setCurrentPage("rocks")
                }}
                className="gap-2"
              >
                Go to Rocks <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
