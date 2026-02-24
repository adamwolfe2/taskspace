"use client"

import { useState, useEffect, useRef, useCallback } from "react"

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const COMPANY_DEMO = "Horizon Labs"
const DATE_DEMO = "Wed, Jan 15 · Q1 2026"

const EOD_MEMBERS = [
  { name: "Adam Wolfe",       initials: "AW", role: "VP Product Eng.",    tasks: 3, kind: "submitted" as const },
  { name: "Sarah Chen",       initials: "SC", role: "Eng. Manager",       tasks: 4, kind: "submitted" as const },
  { name: "Marcus Williams",  initials: "MW", role: "Design Director",    tasks: 3, kind: "submitted" as const },
  { name: "Priya Patel",      initials: "PP", role: "Program Manager",    tasks: 2, kind: "submitted" as const },
  { name: "Elena Rodriguez",  initials: "ER", role: "Data Science Lead",  tasks: 0, kind: "typing"    as const },
  { name: "James O'Brien",    initials: "JO", role: "QA Lead",            tasks: 0, kind: "pending"   as const },
]

const EOD_INSIGHTS = [
  "2 blockers flagged across the team",
  "Rock #1 (XR SDK) on track — 75% complete",
  "Crash rate improved 40% this sprint",
  "Team velocity 91 pts vs. target 85 ↑",
]

const ROCKS = [
  { title: "Launch Horizon XR 2.0 SDK",       owner: "A. Wolfe",     progress: 75, status: "on-track" as const },
  { title: "Reduce app crash rate < 0.1%",    owner: "S. Chen",      progress: 60, status: "on-track" as const },
  { title: "Redesign Settings — iOS 20",      owner: "M. Williams",  progress: 40, status: "at-risk"  as const },
  { title: "Ship Horizon AI Phase 3",         owner: "E. Rodriguez", progress: 85, status: "on-track" as const },
  { title: "Complete Q1 security audit",      owner: "J. O'Brien",   progress: 90, status: "on-track" as const },
]

const SCORECARD = [
  { metric: "App Crash Rate",        value: "0.08%",   target: "< 0.1%",  good: true  },
  { metric: "Sprint Velocity",       value: "91 pts",  target: "85 pts",  good: true  },
  { metric: "Code Review SLA",       value: "22 hrs",  target: "< 24 hrs",good: true  },
  { metric: "Test Coverage",         value: "87%",     target: "> 90%",   good: false },
  { metric: "CSAT Score",            value: "4.6 / 5", target: "4.5 / 5", good: true  },
]

const AI_QA = [
  {
    q: "Who is behind on their rocks this week?",
    a: "Marcus Williams is 15% behind on the Settings redesign. He cited Figma access delays in Wednesday's EOD — needs escalation before the sprint ends.",
  },
  {
    q: "What blockers came up in today's reports?",
    a: "Two blockers: build times up 30% after the Xcode update (Sarah Chen), and GPU cluster at 94% capacity blocking Elena's ML training run.",
  },
  {
    q: "How is the team tracking against Q1 goals?",
    a: "4 of 5 rocks are on track. Average team progress is 70% with 5 weeks remaining. The security audit (James) is furthest ahead at 90%.",
  },
]

const STATS = [
  { n: "68%",  label: "of multi-company founders cite visibility as their #1 bottleneck" },
  { n: "4.5h", label: "lost per manager per week chasing status updates" },
  { n: "73%",  label: "of EOS teams abandon the system within 12 months" },
  { n: "$18K", label: "annual per-manager cost of manual reporting overhead" },
]

const PROBLEMS = [
  {
    title: "Fragmented tools",
    body: "Rocks in Notion, EODs in Slack, scorecards in Sheets, meetings in Docs. Nothing talks to anything else — and nothing is ever current.",
  },
  {
    title: "No real-time visibility",
    body: "By the time you know a rock is at risk, it's too late to course-correct. Status updates are stale before they're read.",
  },
  {
    title: "Manual everything",
    body: "Managers spend hours synthesizing EODs, building scorecards, prepping L10 agendas. That's operational overhead — not leadership.",
  },
]

const PROCESS = [
  { n: "01", title: "Set Your Rocks",       body: "Define 90-day priorities across every team. Break goals into milestones. Assign owners with clear accountability." },
  { n: "02", title: "Daily EOD Reports",    body: "Team submits brief end-of-day reports. AI parses them, organizes tasks, and surfaces blockers automatically." },
  { n: "03", title: "Weekly Scorecard",     body: "Key metrics tracked automatically. Trend lines surface problems early — before they become rocks falling." },
  { n: "04", title: "Level 10 Meetings",   body: "Data-driven agendas pre-filled from your rocks and scorecard. IDS issues tracked to resolution in-meeting." },
]

const DIFFS = [
  {
    title: "Built for EOS. Not bolted on.",
    body: "Rocks, L10 meetings, IDS, VTO, Scorecard — every piece of the EOS framework ships natively. No workarounds, no missing pieces.",
  },
  {
    title: "AI that understands operations",
    body: "Not a chatbot. Our AI reads raw EOD dumps, flags at-risk rocks, and surfaces the blockers you need to act on — without prompting.",
  },
  {
    title: "Multi-company from day one",
    body: "One login, unlimited workspaces. Run Acme Corp, Beta Ventures, and Gamma Labs each with full isolation and separate dashboards.",
  },
  {
    title: "Under two minutes to live",
    body: "Paste your website — AI detects your brand. Invite your team. Set your rocks. EOS-ready before your next standup.",
  },
]

const TOTAL_SLIDES = 9

// ─── TYPES ───────────────────────────────────────────────────────────────────

type EODPhase   = "collecting" | "parsing" | "insights"
type RocksPhase = "entering" | "filling" | "cycling"
type AIPhase    = "question" | "typing" | "done"

// ─── SHARED ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/40 mb-3">
      {children}
    </div>
  )
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#F3F3EF", paddingTop: "56px", paddingBottom: "56px" }}
    >
      <div
        className="w-full"
        style={{ maxWidth: "1100px", padding: "0 clamp(16px, 4vw, 60px)" }}
      >
        {children}
      </div>
    </div>
  )
}

function DemoChrome({
  title,
  subtitle,
  children,
  dotsCount,
  activeDot,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  dotsCount?: number
  activeDot?: number
}) {
  return (
    <div className="border border-black bg-white shadow-[4px_4px_0_0_rgba(0,0,0,1)] hidden sm:block">
      <div className="border-b border-black px-4 py-2.5 flex items-center justify-between bg-black">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/30" />
          <span className="font-mono text-[10px] text-white/70 uppercase tracking-widest">{title}</span>
        </div>
        {subtitle && <span className="font-mono text-[10px] text-white/40">{subtitle}</span>}
      </div>
      <div className="p-4">{children}</div>
      {dotsCount !== undefined && (
        <div className="border-t border-black/10 py-2 flex justify-center gap-1.5">
          {Array.from({ length: dotsCount }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: i === activeDot ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.15)" }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DEMO 1: EOD REPORT + AI PARSING ─────────────────────────────────────────

function EODDemo() {
  const [visibleCount, setVisibleCount]     = useState(0)
  const [phase, setPhase]                   = useState<EODPhase>("collecting")
  const [visibleInsights, setVisibleInsights] = useState(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clear = () => timers.current.forEach(clearTimeout)

  const run = useCallback(() => {
    clear()
    setVisibleCount(0)
    setVisibleInsights(0)
    setPhase("collecting")
    const t: ReturnType<typeof setTimeout>[] = []

    EOD_MEMBERS.forEach((_, i) => {
      t.push(setTimeout(() => setVisibleCount(i + 1), 500 + i * 480))
    })

    const afterMembers = 500 + EOD_MEMBERS.length * 480
    t.push(setTimeout(() => setPhase("parsing"), afterMembers + 400))

    EOD_INSIGHTS.forEach((_, i) => {
      t.push(setTimeout(() => {
        setPhase("insights")
        setVisibleInsights(i + 1)
      }, afterMembers + 1600 + i * 650))
    })

    const total = afterMembers + 1600 + EOD_INSIGHTS.length * 650 + 3200
    t.push(setTimeout(run, total))
    timers.current = t
  }, [])

  useEffect(() => { run(); return clear }, [run])

  const submitted = EOD_MEMBERS.filter((m) => m.kind === "submitted").length
  const dotIdx = phase === "collecting" ? 0 : phase === "parsing" ? 1 : 2

  return (
    <DemoChrome title={`EOD Reports — ${COMPANY_DEMO}`} subtitle={DATE_DEMO} dotsCount={3} activeDot={dotIdx}>
      {/* Submission bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-black/40 uppercase tracking-widest">Submissions</span>
        <span className="font-mono text-[10px] text-black/60">
          {Math.min(visibleCount, submitted)} / {EOD_MEMBERS.length} submitted
        </span>
      </div>
      <div className="h-1.5 border border-black/10 bg-black/5 mb-4 overflow-hidden">
        <div
          className="h-full bg-black transition-all duration-500"
          style={{ width: `${Math.min(visibleCount, submitted) / EOD_MEMBERS.length * 100}%` }}
        />
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {EOD_MEMBERS.map((m, i) => {
          const visible = i < visibleCount
          return (
            <div
              key={m.name}
              className="flex items-center gap-3 transition-all duration-300"
              style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(4px)" }}
            >
              <div className="w-7 h-7 border border-black bg-black/5 flex items-center justify-center flex-shrink-0">
                <span className="font-mono text-[9px] font-bold">{m.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium truncate">{m.name}</span>
                  <span
                    className="font-mono text-[9px] uppercase tracking-wider ml-2"
                    style={{
                      color: m.kind === "submitted"
                        ? "rgba(0,0,0,0.7)"
                        : m.kind === "typing"
                        ? "rgba(0,0,0,0.4)"
                        : "rgba(0,0,0,0.2)",
                    }}
                  >
                    {m.kind === "submitted" ? `${m.tasks} tasks ✓` : m.kind === "typing" ? "typing…" : "pending"}
                  </span>
                </div>
                <div className="font-mono text-[9px] text-black/35">{m.role}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* AI section */}
      {phase !== "collecting" && (
        <div className="mt-4 pt-4 border-t border-black/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-[7px] text-white font-bold">AI</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-black/40">
              {phase === "parsing" ? "Analyzing reports…" : "Insights ready"}
            </span>
            {phase === "parsing" && (
              <span className="inline-block w-0.5 h-3 bg-black animate-pulse" />
            )}
          </div>
          <div className="space-y-1.5">
            {EOD_INSIGHTS.slice(0, visibleInsights).map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-2"
                style={{ animation: "tsiFadeIn 0.3s ease both" }}
              >
                <span className="font-mono text-[9px] text-black/30 mt-0.5">→</span>
                <span className="font-mono text-[10px] text-black/70">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DemoChrome>
  )
}

// ─── DEMO 2: ROCKS DASHBOARD ─────────────────────────────────────────────────

function RocksDemo() {
  const [visible, setVisible]         = useState(0)
  const [progress, setProgress]       = useState<number[]>(ROCKS.map(() => 0))
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clear = () => timers.current.forEach(clearTimeout)

  const run = useCallback(() => {
    clear()
    setVisible(0)
    setProgress(ROCKS.map(() => 0))
    setHighlighted(null)
    const t: ReturnType<typeof setTimeout>[] = []

    ROCKS.forEach((_, i) => {
      t.push(setTimeout(() => setVisible(i + 1), 300 + i * 340))
    })

    const afterEnter = 300 + ROCKS.length * 340
    t.push(setTimeout(() => setProgress(ROCKS.map((r) => r.progress)), afterEnter + 300))

    const cycleStart = afterEnter + 1100
    ROCKS.forEach((_, i) => {
      t.push(setTimeout(() => setHighlighted(i), cycleStart + i * 950))
    })

    const total = cycleStart + ROCKS.length * 950 + 1500
    t.push(setTimeout(run, total))
    timers.current = t
  }, [])

  useEffect(() => { run(); return clear }, [run])

  return (
    <DemoChrome
      title="Quarterly Rocks — Q1 2026"
      subtitle={COMPANY_DEMO}
      dotsCount={ROCKS.length}
      activeDot={highlighted ?? 0}
    >
      <div className="space-y-3">
        {ROCKS.map((rock, i) => {
          const isVisible    = i < visible
          const isHighlit    = highlighted === i
          const isAtRisk     = rock.status === "at-risk"
          return (
            <div
              key={rock.title}
              className="p-2 -mx-2 transition-all duration-300"
              style={{
                opacity:          isVisible ? 1 : 0,
                transform:        isVisible ? "translateY(0)" : "translateY(6px)",
                backgroundColor:  isHighlit ? "rgba(0,0,0,0.035)" : "transparent",
              }}
            >
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="font-mono text-[11px] font-medium text-black/85 leading-tight">{rock.title}</span>
                <span
                  className="font-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 flex-shrink-0"
                  style={{
                    borderColor: isAtRisk ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
                    color:       isAtRisk ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)",
                    background:  isAtRisk ? "rgba(0,0,0,0.06)" : "transparent",
                  }}
                >
                  {isAtRisk ? "at risk" : "on track"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 border border-black/10 bg-black/5 overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-700"
                    style={{ width: `${progress[i]}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-black/40 w-7 text-right">{progress[i]}%</span>
              </div>
              <div className="font-mono text-[9px] text-black/30 mt-1">{rock.owner}</div>
            </div>
          )
        })}
      </div>
    </DemoChrome>
  )
}

// ─── DEMO 3: AI MANAGER CHAT ──────────────────────────────────────────────────

function AIDemo() {
  const [pairIdx, setPairIdx]       = useState(0)
  const [typed, setTyped]           = useState("")
  const [aiPhase, setAIPhase]       = useState<AIPhase>("question")
  const timers                       = useRef<ReturnType<typeof setTimeout>[]>([])
  const ticker                       = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAll = () => {
    timers.current.forEach(clearTimeout)
    if (ticker.current) clearInterval(ticker.current)
  }

  const runPair = useCallback((idx: number) => {
    clearAll()
    const safeIdx = idx % AI_QA.length
    setPairIdx(safeIdx)
    setTyped("")
    setAIPhase("question")
    const answer = AI_QA[safeIdx].a
    let charIdx = 0
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
      }, 20)
    }, 900))

    const duration = answer.length * 20 + 900 + 2800
    t.push(setTimeout(() => runPair(safeIdx + 1), duration))
    timers.current = t
  }, [])

  useEffect(() => { runPair(0); return clearAll }, [runPair])

  return (
    <DemoChrome title="AI Brain Dump — Manager View" subtitle={COMPANY_DEMO} dotsCount={AI_QA.length} activeDot={pairIdx}>
      <div className="space-y-4 min-h-[210px]">
        {/* Previous pairs grayed */}
        {AI_QA.slice(0, pairIdx).map((qa, i) => (
          <div key={i} className="opacity-25 space-y-2">
            <div className="flex gap-2">
              <span className="font-mono text-[9px] text-black/50 uppercase flex-shrink-0 mt-0.5">You</span>
              <span className="font-mono text-[10px] text-black/60">{qa.q}</span>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="font-mono text-[7px] text-white font-bold">TS</span>
              </div>
              <span className="font-mono text-[10px] text-black/60 leading-relaxed">{qa.a}</span>
            </div>
          </div>
        ))}

        {/* Current pair */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="font-mono text-[9px] text-black/50 uppercase flex-shrink-0 mt-0.5">You</span>
            <span className="font-mono text-[11px] text-black">{AI_QA[pairIdx].q}</span>
          </div>
          <div className="flex gap-2" style={{ animation: "tsiFadeIn 0.25s ease both" }}>
            <div className="w-5 h-5 bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="font-mono text-[7px] text-white font-bold">TS</span>
            </div>
            {aiPhase === "question" ? (
              <span className="font-mono text-[10px] text-black/30 animate-pulse">thinking…</span>
            ) : (
              <span className="font-mono text-[10px] text-black/75 leading-relaxed">
                {typed}
                {aiPhase === "typing" && (
                  <span className="inline-block w-0.5 h-3 bg-black align-middle ml-0.5 animate-pulse" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </DemoChrome>
  )
}

// ─── DEMO 4: SCORECARD ───────────────────────────────────────────────────────

function ScorecardDemo() {
  const [visible, setVisible]     = useState(0)
  const [highlighted, setHighlit] = useState<number | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clear = () => timers.current.forEach(clearTimeout)

  const run = useCallback(() => {
    clear()
    setVisible(0)
    setHighlit(null)
    const t: ReturnType<typeof setTimeout>[] = []

    SCORECARD.forEach((_, i) => {
      t.push(setTimeout(() => setVisible(i + 1), 400 + i * 320))
    })

    const afterEnter = 400 + SCORECARD.length * 320 + 400
    SCORECARD.forEach((_, i) => {
      t.push(setTimeout(() => setHighlit(i), afterEnter + i * 850))
    })
    t.push(setTimeout(run, afterEnter + SCORECARD.length * 850 + 1500))
    timers.current = t
  }, [])

  useEffect(() => { run(); return clear }, [run])

  return (
    <DemoChrome title="Weekly Scorecard — Jan 13, 2026" subtitle={COMPANY_DEMO} dotsCount={SCORECARD.length} activeDot={highlighted ?? 0}>
      <div>
        <div className="grid grid-cols-4 border-b border-black/10 pb-2 mb-2">
          {["Metric", "Value", "Target", "Status"].map((h) => (
            <span key={h} className="font-mono text-[9px] uppercase tracking-widest text-black/30">{h}</span>
          ))}
        </div>
        <div className="space-y-0">
          {SCORECARD.map((row, i) => {
            const isVis  = i < visible
            const isHit  = highlighted === i
            return (
              <div
                key={row.metric}
                className="grid grid-cols-4 py-2 border-b border-black/5 transition-all duration-300"
                style={{
                  opacity:         isVis ? 1 : 0,
                  transform:       isVis ? "translateX(0)" : "translateX(-8px)",
                  backgroundColor: isHit ? "rgba(0,0,0,0.035)" : "transparent",
                }}
              >
                <span className="font-mono text-[10px] text-black/75">{row.metric}</span>
                <span className="font-mono text-[10px] font-medium">{row.value}</span>
                <span className="font-mono text-[10px] text-black/40">{row.target}</span>
                <span
                  className="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: row.good ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)" }}
                >
                  {row.good ? "✓ good" : "↓ below"}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </DemoChrome>
  )
}

// ─── SLIDE COMPONENTS ────────────────────────────────────────────────────────

function S1() {
  return (
    <Slide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16 items-center">
        <div>
          <Label>AI operational infrastructure</Label>
          <h1
            className="font-serif font-normal text-black leading-[1.05] mb-6"
            style={{ fontSize: "clamp(36px, 4.5vw, 64px)" }}
          >
            Run all your teams<br />in true parallel.
          </h1>
          <p className="font-mono text-xs text-black/55 leading-relaxed mb-8 max-w-sm">
            TaskSpace automates EOD reports, cadence metrics, and keeps every team
            accountable — across every company you run on EOS.
          </p>
          <p className="font-mono text-[10px] text-black/30 uppercase tracking-widest">
            trytaskspace.com · AI workspace setup in under two minutes
          </p>
        </div>
        <EODDemo />
      </div>
    </Slide>
  )
}

function S2() {
  return (
    <Slide>
      <div className="max-w-2xl">
        <Label>The problem</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.05] mb-12"
          style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
        >
          Multi-company operations<br />are broken by default.
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-black">
        {STATS.map((s, i) => (
          <div
            key={i}
            className="p-6 sm:p-8"
            style={{ borderRight: i < STATS.length - 1 ? "1px solid black" : undefined }}
          >
            <div
              className="font-serif font-normal text-black mb-3"
              style={{ fontSize: "clamp(28px, 3vw, 44px)" }}
            >
              {s.n}
            </div>
            <div className="font-mono text-[10px] text-black/50 leading-relaxed">{s.label}</div>
          </div>
        ))}
      </div>
    </Slide>
  )
}

function S3() {
  return (
    <Slide>
      <div className="max-w-xl mb-12">
        <Label>Why it happens</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.05]"
          style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
        >
          Three structural problems<br />every EOS team faces.
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-black">
        {PROBLEMS.map((p, i) => (
          <div
            key={i}
            className="p-8"
            style={{ borderRight: i < PROBLEMS.length - 1 ? "1px solid black" : undefined }}
          >
            <div
              className="font-serif font-normal text-black/20 mb-4"
              style={{ fontSize: "clamp(28px, 3vw, 44px)" }}
            >
              0{i + 1}
            </div>
            <div className="font-mono text-[11px] font-medium text-black mb-3 uppercase tracking-wide">
              {p.title}
            </div>
            <div className="font-mono text-[10px] text-black/50 leading-relaxed">{p.body}</div>
          </div>
        ))}
      </div>
    </Slide>
  )
}

function S4() {
  return (
    <Slide>
      <div className="max-w-xl mb-12">
        <Label>How it works</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.05]"
          style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
        >
          Four phases.<br />One system.
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 border border-black">
        {PROCESS.map((step, i) => (
          <div
            key={i}
            className="p-7"
            style={{ borderRight: i < PROCESS.length - 1 ? "1px solid black" : undefined }}
          >
            <div
              className="font-serif font-normal text-black/15 mb-5"
              style={{ fontSize: "clamp(32px, 3.5vw, 48px)" }}
            >
              {step.n}
            </div>
            <div className="font-mono text-[11px] font-medium text-black mb-3">{step.title}</div>
            <div className="font-mono text-[10px] text-black/50 leading-relaxed">{step.body}</div>
          </div>
        ))}
      </div>
    </Slide>
  )
}

function S5() {
  return (
    <Slide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16 items-center">
        <div>
          <Label>Under the hood</Label>
          <h2
            className="font-serif font-normal text-black leading-[1.05] mb-6"
            style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
          >
            AI that reads your<br />team so you don't have to.
          </h2>
          <div className="space-y-5">
            {[
              { step: "01", title: "Team submits raw EOD", body: "No forms, no templates. Just a brain dump of what they did." },
              { step: "02", title: "AI organizes & parses", body: "Tasks bucketed by rock, blockers flagged, tone scored." },
              { step: "03", title: "Insights surfaced instantly", body: "Manager sees a clean dashboard — not 14 Slack messages to decode." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 border-l-2 border-black/10 pl-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-black/30 mb-1">{item.step}</div>
                  <div className="font-mono text-[11px] font-medium text-black mb-1">{item.title}</div>
                  <div className="font-mono text-[10px] text-black/50 leading-relaxed">{item.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <EODDemo />
      </div>
    </Slide>
  )
}

function S6() {
  return (
    <Slide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16 items-center">
        <div>
          <Label>Quarterly rocks</Label>
          <h2
            className="font-serif font-normal text-black leading-[1.05] mb-6"
            style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
          >
            Every rock. Every team.<br />One dashboard.
          </h2>
          <p className="font-mono text-xs text-black/55 leading-relaxed mb-6 max-w-sm">
            90-day goals broken into milestones, tracked daily, with automated
            risk signals before they become surprises in your L10.
          </p>
          <div className="space-y-3">
            {[
              "Milestone-based progress tracking",
              "At-risk flags before the quarter ends",
              "Owner accountability with audit trail",
              "Cross-company view for portfolio founders",
            ].map((feat) => (
              <div key={feat} className="flex items-start gap-3">
                <span className="font-mono text-[10px] text-black/30 mt-0.5">—</span>
                <span className="font-mono text-[10px] text-black/60">{feat}</span>
              </div>
            ))}
          </div>
        </div>
        <RocksDemo />
      </div>
    </Slide>
  )
}

function S7() {
  return (
    <Slide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16 items-center">
        <div>
          <Label>Manager intelligence</Label>
          <h2
            className="font-serif font-normal text-black leading-[1.05] mb-6"
            style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
          >
            Ask anything.<br />Get real answers.
          </h2>
          <p className="font-mono text-xs text-black/55 leading-relaxed mb-6 max-w-sm">
            The AI has read every EOD, every rock update, every scorecard entry.
            Ask it about blockers, progress gaps, or team health — in plain language.
          </p>
          <div className="border border-black p-5 bg-white">
            <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-3">Weekly scorecard — real data</div>
            <ScorecardDemo />
          </div>
        </div>
        <AIDemo />
      </div>
    </Slide>
  )
}

function S8() {
  return (
    <Slide>
      <div className="max-w-xl mb-12">
        <Label>Why TaskSpace</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.05]"
          style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
        >
          Four reasons teams<br />don't go back.
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 border border-black">
        {DIFFS.map((d, i) => {
          const isBottom = i >= 2
          const isRight  = i % 2 === 0
          return (
            <div
              key={i}
              className="p-8"
              style={{
                borderBottom: !isBottom ? "1px solid black" : undefined,
                borderRight:  isRight   ? "1px solid black" : undefined,
              }}
            >
              <div className="font-mono text-[11px] font-medium text-black mb-3">{d.title}</div>
              <div className="font-mono text-[10px] text-black/50 leading-relaxed">{d.body}</div>
            </div>
          )
        })}
      </div>
    </Slide>
  )
}

function S9() {
  return (
    <Slide>
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
        <Label>Let's get you set up</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.04] mb-6 max-w-3xl"
          style={{ fontSize: "clamp(36px, 5vw, 72px)" }}
        >
          Your whole team running on EOS — right now, while we're here.
        </h2>
        <p className="font-mono text-xs text-black/50 leading-relaxed mb-10 max-w-lg">
          We'll have your workspace live in the next two minutes. Invite your team,
          set your first rocks, and you're running on EOS before this call ends.
        </p>

        {/* Live setup CTA */}
        <div className="border border-black px-10 py-4 bg-black mb-3">
          <span className="font-mono text-[11px] text-white uppercase tracking-widest">trytaskspace.com — Start Free</span>
        </div>
        <p className="font-mono text-[10px] text-black/30 uppercase tracking-widest mb-14">
          No credit card required · Live in under two minutes
        </p>

        {/* Pricing grid */}
        <div className="grid grid-cols-3 border border-black w-full max-w-xl">
          {[
            { plan: "Free",     price: "$0",  note: "Up to 3 users · 1 workspace",  featured: false },
            { plan: "Team",     price: "$9",  note: "Per user/mo · 3 workspaces",   featured: true  },
            { plan: "Business", price: "$19", note: "Per user/mo · Unlimited",      featured: false },
          ].map((tier, i) => (
            <div
              key={tier.plan}
              className="py-6 px-5"
              style={{
                borderRight:     i < 2 ? "1px solid black" : undefined,
                backgroundColor: tier.featured ? "black" : "transparent",
              }}
            >
              <div
                className="font-mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: tier.featured ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}
              >
                {tier.plan}
              </div>
              <div
                className="font-serif font-normal mb-1"
                style={{ fontSize: "clamp(22px, 2.5vw, 32px)", color: tier.featured ? "white" : "black" }}
              >
                {tier.price}
              </div>
              <div
                className="font-mono text-[9px] leading-relaxed"
                style={{ color: tier.featured ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)" }}
              >
                {tier.note}
              </div>
            </div>
          ))}
        </div>

        <p className="font-mono text-[10px] text-black/25 mt-6 uppercase tracking-widest">
          14-day free trial on paid plans · Cancel anytime · SSO/SAML on Business
        </p>
      </div>
    </Slide>
  )
}

// ─── DECK SHELL ──────────────────────────────────────────────────────────────

const SLIDES_LIST = [S1, S2, S3, S4, S5, S6, S7, S8, S9]

export default function DeckPage() {
  const [slide, setSlide] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const busy = useRef(false)

  const goTo = useCallback((idx: number) => {
    if (busy.current || idx < 0 || idx >= TOTAL_SLIDES) return
    busy.current = true
    setSlide(idx)
    setAnimKey((k) => k + 1)
    setTimeout(() => { busy.current = false }, 280)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goTo(slide + 1) }
      if (e.key === "ArrowLeft")                    { e.preventDefault(); goTo(slide - 1) }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [slide, goTo])

  const SlideComponent = SLIDES_LIST[slide]

  return (
    <div className="relative" style={{ backgroundColor: "#F3F3EF" }}>
      {/* Keyframe animations */}
      <style>{`
        @keyframes tsiFadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes tsiSlideEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-black/10 z-50">
        <div
          className="h-full bg-black transition-all duration-300"
          style={{ width: `${((slide + 1) / TOTAL_SLIDES) * 100}%` }}
        />
      </div>

      {/* Logo — top left */}
      <div className="fixed top-3.5 left-5 z-50 flex items-center gap-2">
        <div className="w-6 h-6 bg-black flex items-center justify-center">
          <span className="font-mono text-[8px] text-white font-bold">TS</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45 hidden sm:block">TaskSpace</span>
      </div>

      {/* Slide counter — top right */}
      <div className="fixed top-4 right-5 z-50">
        <span className="font-mono text-[10px] text-black/30">
          {String(slide + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(TOTAL_SLIDES).padStart(2, "0")}
        </span>
      </div>

      {/* Prev arrow */}
      {slide > 0 && (
        <button
          onClick={() => goTo(slide - 1)}
          className="fixed left-3 top-1/2 -translate-y-1/2 z-50 w-9 h-9 border border-black bg-white/90 flex items-center justify-center hover:bg-white transition-colors hidden sm:flex"
          aria-label="Previous slide"
        >
          <span className="font-mono text-sm leading-none">←</span>
        </button>
      )}

      {/* Next arrow */}
      {slide < TOTAL_SLIDES - 1 && (
        <button
          onClick={() => goTo(slide + 1)}
          className="fixed right-3 top-1/2 -translate-y-1/2 z-50 w-9 h-9 border border-black bg-white/90 flex items-center justify-center hover:bg-white transition-colors hidden sm:flex"
          aria-label="Next slide"
        >
          <span className="font-mono text-sm leading-none">→</span>
        </button>
      )}

      {/* Dot nav — bottom center */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
        {SLIDES_LIST.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="transition-all duration-200"
            style={{
              width: i === slide ? "20px" : "6px",
              height: "6px",
              backgroundColor: i === slide ? "black" : "rgba(0,0,0,0.2)",
              borderRadius: "3px",
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div key={animKey} style={{ animation: "tsiSlideEnter 240ms ease both" }}>
        <SlideComponent />
      </div>
    </div>
  )
}
