"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, ArrowRight, ShieldCheck, ArrowLeft, Check, TrendingDown } from "lucide-react"
import { getErrorMessage } from "@/lib/utils"

// ─── DEMO DATA ───────────────────────────────────────────────────────────────

const DEMO_EOD_MEMBERS = [
  { name: "Sarah Chen",      initials: "SC", role: "Eng. Manager",    tasks: 4, kind: "submitted" as const },
  { name: "Marcus Williams", initials: "MW", role: "Design Director", tasks: 3, kind: "submitted" as const },
  { name: "Priya Patel",     initials: "PP", role: "Program Manager", tasks: 2, kind: "submitted" as const },
  { name: "Elena Rodriguez", initials: "ER", role: "Data Science",    tasks: 0, kind: "typing"    as const },
  { name: "James O'Brien",   initials: "JO", role: "QA Lead",         tasks: 0, kind: "pending"   as const },
]

const DEMO_EOD_INSIGHTS = [
  "1 blocker flagged — needs escalation",
  "Rock #1 on track at 75% complete",
  "Team velocity 91 pts vs. target 85 ↑",
]

const DEMO_ROCKS = [
  { title: "Launch XR 2.0 SDK",        owner: "S. Chen",      progress: 75, atRisk: false },
  { title: "Reduce crash rate < 0.1%", owner: "M. Williams",  progress: 40, atRisk: true  },
  { title: "Ship AI Phase 3",           owner: "E. Rodriguez", progress: 85, atRisk: false },
  { title: "Q1 Security Audit",         owner: "J. O'Brien",   progress: 90, atRisk: false },
]

const DEMO_AI_QA = [
  {
    q: "Who is behind on their rocks?",
    a: "Marcus is 15% behind on the crash-rate rock. He flagged a testing environment issue in Tuesday's EOD — needs unblocking before Friday.",
  },
  {
    q: "What blockers came up today?",
    a: "One blocker: build times up 30% after the Xcode update. Sarah flagged it — needs a fix before the sprint demo tomorrow.",
  },
]

const DEMO_SCORECARD = [
  { metric: "App Crash Rate",   value: "0.08%",   target: "< 0.1%",  good: true  },
  { metric: "Sprint Velocity",  value: "91 pts",  target: "85 pts",  good: true  },
  { metric: "Code Review SLA",  value: "22 hrs",  target: "< 24 hrs",good: true  },
  { metric: "Test Coverage",    value: "87%",     target: "> 90%",   good: false },
]

// ─── MINI DEMO WIDGETS ────────────────────────────────────────────────────────

function MiniChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
        </div>
        <span className="text-[11px] text-slate-400 font-medium ml-1">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function EODDemoWidget({ runKey }: { runKey: number }) {
  const [visibleCount, setVisibleCount]       = useState(0)
  const [phase, setPhase]                     = useState<"collecting" | "parsing" | "insights">("collecting")
  const [visibleInsights, setVisibleInsights] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clear  = () => timers.current.forEach(clearTimeout)

  useEffect(() => {
    clear()
    setVisibleCount(0)
    setVisibleInsights(0)
    setPhase("collecting")
    const t: ReturnType<typeof setTimeout>[] = []
    DEMO_EOD_MEMBERS.forEach((_, i) => {
      t.push(setTimeout(() => setVisibleCount(i + 1), 400 + i * 420))
    })
    const afterMembers = 400 + DEMO_EOD_MEMBERS.length * 420
    t.push(setTimeout(() => setPhase("parsing"), afterMembers + 300))
    DEMO_EOD_INSIGHTS.forEach((_, i) => {
      t.push(setTimeout(() => {
        setPhase("insights")
        setVisibleInsights(i + 1)
      }, afterMembers + 1400 + i * 600))
    })
    timers.current = t
    return clear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  const submitted = DEMO_EOD_MEMBERS.filter(m => m.kind === "submitted").length

  return (
    <MiniChrome title="EOD Reports — Horizon Labs · Today">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Submissions</span>
        <span className="text-[10px] text-slate-500">{Math.min(visibleCount, submitted)} / {DEMO_EOD_MEMBERS.length}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-black rounded-full transition-all duration-500"
          style={{ width: `${Math.min(visibleCount, submitted) / DEMO_EOD_MEMBERS.length * 100}%` }}
        />
      </div>
      <div className="space-y-2">
        {DEMO_EOD_MEMBERS.map((m, i) => (
          <div
            key={m.name}
            className="flex items-center gap-2.5 transition-all duration-300"
            style={{ opacity: i < visibleCount ? 1 : 0, transform: i < visibleCount ? "translateY(0)" : "translateY(4px)" }}
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-semibold text-slate-600">{m.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-800 truncate">{m.name}</span>
                <span className="text-[9px] ml-2 flex-shrink-0" style={{
                  color: m.kind === "submitted" ? "#16a34a" : m.kind === "typing" ? "#94a3b8" : "#cbd5e1"
                }}>
                  {m.kind === "submitted" ? <><span>{m.tasks} tasks</span><Check className="inline h-2.5 w-2.5 ml-0.5" /></> : m.kind === "typing" ? "typing…" : "pending"}
                </span>
              </div>
              <div className="text-[9px] text-slate-400">{m.role}</div>
            </div>
          </div>
        ))}
      </div>
      {phase !== "collecting" && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded bg-black flex items-center justify-center">
              <span className="text-[7px] text-white font-bold">AI</span>
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">
              {phase === "parsing" ? "Analyzing…" : "Insights ready"}
            </span>
            {phase === "parsing" && <span className="inline-block w-0.5 h-3 bg-slate-400 animate-pulse" />}
          </div>
          <div className="space-y-1">
            {DEMO_EOD_INSIGHTS.slice(0, visibleInsights).map((insight, i) => (
              <div key={i} className="flex gap-1.5 text-[10px] text-slate-600">
                <span className="text-slate-300 flex-shrink-0">→</span>
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}
    </MiniChrome>
  )
}

function RocksDemoWidget({ runKey }: { runKey: number }) {
  const [visible, setVisible]       = useState(0)
  const [progress, setProgress]     = useState<number[]>(DEMO_ROCKS.map(() => 0))
  const [highlighted, setHighlit]   = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clear  = () => timers.current.forEach(clearTimeout)

  useEffect(() => {
    clear()
    setVisible(0)
    setProgress(DEMO_ROCKS.map(() => 0))
    setHighlit(null)
    const t: ReturnType<typeof setTimeout>[] = []
    DEMO_ROCKS.forEach((_, i) => t.push(setTimeout(() => setVisible(i + 1), 300 + i * 320)))
    const afterEnter = 300 + DEMO_ROCKS.length * 320
    t.push(setTimeout(() => setProgress(DEMO_ROCKS.map(r => r.progress)), afterEnter + 200))
    DEMO_ROCKS.forEach((_, i) => t.push(setTimeout(() => setHighlit(i), afterEnter + 900 + i * 900)))
    timers.current = t
    return clear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  return (
    <MiniChrome title="Quarterly Rocks — Q1 2026">
      <div className="space-y-3">
        {DEMO_ROCKS.map((rock, i) => (
          <div
            key={rock.title}
            className="p-2 -mx-2 rounded-lg transition-all duration-300"
            style={{
              opacity:         i < visible ? 1 : 0,
              transform:       i < visible ? "translateY(0)" : "translateY(6px)",
              backgroundColor: highlighted === i ? "rgba(0,0,0,0.03)" : "transparent",
            }}
          >
            <div className="flex items-center justify-between mb-1.5 gap-2">
              <span className="text-[11px] font-medium text-slate-800 leading-tight">{rock.title}</span>
              <span
                className="text-[9px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: rock.atRisk ? "#fff1f2" : "#f0fdf4",
                  color:      rock.atRisk ? "#e11d48" : "#16a34a",
                }}
              >
                {rock.atRisk ? "at risk" : "on track"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width:           `${progress[i]}%`,
                    backgroundColor: rock.atRisk ? "#f43f5e" : "#000",
                  }}
                />
              </div>
              <span className="text-[9px] text-slate-400 w-7 text-right">{progress[i]}%</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">{rock.owner}</div>
          </div>
        ))}
      </div>
    </MiniChrome>
  )
}

function AIDemoWidget({ runKey }: { runKey: number }) {
  const [pairIdx, setPairIdx] = useState(0)
  const [typed, setTyped]     = useState("")
  const [aiPhase, setAIPhase] = useState<"question" | "typing" | "done">("question")
  const timers  = useRef<ReturnType<typeof setTimeout>[]>([])
  const ticker  = useRef<ReturnType<typeof setInterval> | null>(null)
  const clearAll = () => {
    timers.current.forEach(clearTimeout)
    if (ticker.current) clearInterval(ticker.current)
  }

  const runPair = useCallback((idx: number) => {
    clearAll()
    const safeIdx = idx % DEMO_AI_QA.length
    setPairIdx(safeIdx)
    setTyped("")
    setAIPhase("question")
    const answer = DEMO_AI_QA[safeIdx].a
    let charIdx  = 0
    const t: ReturnType<typeof setTimeout>[] = []
    t.push(setTimeout(() => {
      setAIPhase("typing")
      ticker.current = setInterval(() => {
        charIdx++
        setTyped(answer.slice(0, charIdx))
        if (charIdx >= answer.length) {
          if (ticker.current) clearInterval(ticker.current)
          setAIPhase("done")
        }
      }, 22)
    }, 800))
    const duration = answer.length * 22 + 800 + 2500
    t.push(setTimeout(() => runPair(safeIdx + 1), duration))
    timers.current = t
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    runPair(0)
    return clearAll
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  return (
    <MiniChrome title="AI Brain Dump — Manager View">
      <div className="space-y-3 min-h-[160px]">
        {DEMO_AI_QA.slice(0, pairIdx).map((qa, i) => (
          <div key={i} className="opacity-30 space-y-1.5">
            <div className="flex gap-2">
              <span className="text-[9px] text-slate-400 uppercase font-medium mt-0.5 flex-shrink-0">You</span>
              <span className="text-[10px] text-slate-500">{qa.q}</span>
            </div>
            <div className="flex gap-2">
              <div className="w-4 h-4 rounded bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[7px] text-white font-bold">TS</span>
              </div>
              <span className="text-[10px] text-slate-500 leading-relaxed">{qa.a}</span>
            </div>
          </div>
        ))}
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="text-[9px] text-slate-400 uppercase font-medium mt-0.5 flex-shrink-0">You</span>
            <span className="text-[11px] text-slate-800 font-medium">{DEMO_AI_QA[pairIdx].q}</span>
          </div>
          <div className="flex gap-2">
            <div className="w-4 h-4 rounded bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[7px] text-white font-bold">TS</span>
            </div>
            {aiPhase === "question"
              ? <span className="text-[10px] text-slate-400 animate-pulse">thinking…</span>
              : <span className="text-[10px] text-slate-700 leading-relaxed">
                  {typed}
                  {aiPhase === "typing" && <span className="inline-block w-0.5 h-3 bg-slate-700 align-middle ml-0.5 animate-pulse" />}
                </span>
            }
          </div>
        </div>
      </div>
    </MiniChrome>
  )
}

function ScorecardDemoWidget({ runKey }: { runKey: number }) {
  const [visible, setVisible] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const clear  = () => timers.current.forEach(clearTimeout)

  useEffect(() => {
    clear()
    setVisible(0)
    const t: ReturnType<typeof setTimeout>[] = []
    DEMO_SCORECARD.forEach((_, i) => t.push(setTimeout(() => setVisible(i + 1), 400 + i * 300)))
    timers.current = t
    return clear
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey])

  return (
    <MiniChrome title="Weekly Scorecard — Jan 13, 2026">
      <div>
        <div className="grid grid-cols-4 pb-2 mb-1 border-b border-slate-100">
          {["Metric", "Value", "Target", "Status"].map(h => (
            <span key={h} className="text-[9px] uppercase tracking-widest text-slate-400 font-medium">{h}</span>
          ))}
        </div>
        {DEMO_SCORECARD.map((row, i) => (
          <div
            key={row.metric}
            className="grid grid-cols-4 py-2 border-b border-slate-50 transition-all duration-300"
            style={{ opacity: i < visible ? 1 : 0, transform: i < visible ? "translateX(0)" : "translateX(-6px)" }}
          >
            <span className="text-[10px] text-slate-700">{row.metric}</span>
            <span className="text-[10px] font-semibold text-slate-900">{row.value}</span>
            <span className="text-[10px] text-slate-400">{row.target}</span>
            <span className="text-[9px] font-medium" style={{ color: row.good ? "#16a34a" : "#e11d48" }}>
              {row.good ? <><Check className="inline h-2.5 w-2.5 mr-0.5" />good</> : <><TrendingDown className="inline h-2.5 w-2.5 mr-0.5" />below</>}
            </span>
          </div>
        ))}
      </div>
    </MiniChrome>
  )
}

// ─── ROTATING DEMO PANEL ─────────────────────────────────────────────────────

const DEMO_TABS = [
  {
    id:    "eod",
    label: "Daily EOD Reports",
    sub:   "Your team submits brief updates. AI organizes tasks, flags blockers, and surfaces insights — automatically.",
  },
  {
    id:    "rocks",
    label: "Quarterly Rocks",
    sub:   "90-day goals with milestone tracking. At-risk flags appear before the quarter slips away.",
  },
  {
    id:    "ai",
    label: "AI Manager Intelligence",
    sub:   "Ask anything about your team. The AI has read every EOD, every rock update, every metric.",
  },
  {
    id:    "scorecard",
    label: "Weekly Scorecard",
    sub:   "Key metrics tracked automatically. Trend lines and goal tracking in one clean dashboard.",
  },
]

const DEMO_INTERVAL_MS = 9000

function RotatingDemoPanel() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible]     = useState(true)
  const [runKey, setRunKey]       = useState(0)

  // Auto-advance every DEMO_INTERVAL_MS
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setActiveIdx(i => (i + 1) % DEMO_TABS.length)
        setRunKey(k => k + 1)
        setVisible(true)
      }, 280)
    }, DEMO_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const goTo = (idx: number) => {
    if (idx === activeIdx) return
    setVisible(false)
    setTimeout(() => {
      setActiveIdx(idx)
      setRunKey(k => k + 1)
      setVisible(true)
    }, 200)
  }

  const tab = DEMO_TABS[activeIdx]

  return (
    <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-slate-50 p-10 relative overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div
        className="relative z-10 w-full max-w-md transition-all duration-280"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
      >
        {/* Feature label + description */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-black" />
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400">{tab.label}</span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-sm">{tab.sub}</p>
        </div>

        {/* Demo widget */}
        {tab.id === "eod"       && <EODDemoWidget       runKey={runKey} />}
        {tab.id === "rocks"     && <RocksDemoWidget     runKey={runKey} />}
        {tab.id === "ai"        && <AIDemoWidget        runKey={runKey} />}
        {tab.id === "scorecard" && <ScorecardDemoWidget runKey={runKey} />}

        {/* Dot nav */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {DEMO_TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goTo(i)}
              className="transition-all duration-200"
              style={{
                width:           i === activeIdx ? "20px" : "6px",
                height:          "6px",
                borderRadius:    "3px",
                backgroundColor: i === activeIdx ? "black" : "rgba(0,0,0,0.18)",
              }}
              aria-label={t.label}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const { login, verify2FA, setCurrentPage, error, clearError, isLoading, enterDemoMode } = useApp()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [localError, setLocalError] = useState("")

  // 2FA state
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState("")
  const totpInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus TOTP input when 2FA step appears
  useEffect(() => {
    if (pendingUserId) {
      totpInputRef.current?.focus()
    }
  }, [pendingUserId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")
    clearError()

    if (!email || !password) {
      setLocalError("Please enter your email and password")
      return
    }

    try {
      const result = await login(email, password)
      if (result?.pendingTwoFactor && result.userId) {
        setPendingUserId(result.userId)
      }
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err, "Login failed"))
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError("")
    clearError()

    if (!totpCode || !pendingUserId) {
      setLocalError("Please enter your verification code")
      return
    }

    try {
      await verify2FA(pendingUserId, totpCode)
    } catch (err: unknown) {
      setLocalError(getErrorMessage(err, "Verification failed"))
      setTotpCode("")
    }
  }

  const handleBack = () => {
    setPendingUserId(null)
    setTotpCode("")
    setLocalError("")
    clearError()
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-2">
            <Image
              src="/taskspace-logo.png"
              alt="Taskspace"
              width={64}
              height={64}
              className="w-16 h-16"
            />
            <h1 className="text-3xl font-bold text-black tracking-tight">Taskspace</h1>
          </div>

          {/* Welcome Text */}
          <div className="text-center space-y-2">
            {pendingUserId ? (
              <>
                <div className="flex justify-center">
                  <div className="rounded-full bg-black/5 p-3">
                    <ShieldCheck className="h-6 w-6 text-black" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-black">Two-factor authentication</h2>
                <p className="text-slate-500">Enter the 6-digit code from your authenticator app, or use a backup code</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold text-black">Welcome back</h2>
                <p className="text-slate-500">Sign in to your account to continue</p>
              </>
            )}
          </div>

          {/* Error Alert */}
          {displayError && (
            <div className="p-4 bg-black text-white rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{displayError}</p>
            </div>
          )}

          {pendingUserId ? (
            /* 2FA Code Entry */
            <form onSubmit={handle2FASubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="totp-code" className="text-sm font-medium text-black">
                  Verification code
                </Label>
                <Input
                  ref={totpInputRef}
                  id="totp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={8}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/[^a-fA-F0-9]/g, ""))}
                  disabled={isLoading}
                  className="h-11 bg-white border-slate-200 focus:border-black focus:ring-black text-black placeholder:text-slate-400 text-center text-lg tracking-widest font-mono"
                />
                <p className="text-xs text-slate-400">Enter 6-digit TOTP code or 8-character backup code</p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-black hover:bg-slate-800 text-white font-medium transition-colors"
                disabled={isLoading || totpCode.length < 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-500 hover:text-black"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </form>
          ) : (
            /* Standard Login Form */
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-black">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      autoComplete="email"
                      className="h-11 bg-white border-slate-200 focus:border-black focus:ring-black text-black placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-medium text-black">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => setCurrentPage("forgot-password")}
                        className="text-sm text-slate-600 hover:text-black transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="h-11 bg-white border-slate-200 focus:border-black focus:ring-black text-black placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-black hover:bg-slate-800 text-white font-medium transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or</span>
                </div>
              </div>

              {/* Demo Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-slate-200 hover:bg-slate-50 text-black font-medium"
                onClick={enterDemoMode}
                disabled={isLoading}
              >
                View Demo
              </Button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-slate-600">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setCurrentPage("register")}
                  className="text-black font-semibold hover:underline"
                >
                  Create account
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      <RotatingDemoPanel />
    </div>
  )
}
