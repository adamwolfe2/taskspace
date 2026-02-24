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
  { title: "Launch Horizon XR 2.0 SDK",       owner: "A. Wolfe",     progress: 67, status: "on-track" as const },
  { title: "Reduce app crash rate < 0.1%",    owner: "S. Chen",      progress: 82, status: "on-track" as const },
  { title: "Redesign Settings — iOS 20",      owner: "M. Williams",  progress: 31, status: "at-risk"  as const },
  { title: "Ship Horizon AI Phase 3",         owner: "E. Rodriguez", progress: 55, status: "on-track" as const },
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
    a: "Marcus Williams is 15% behind on 'Redesign Settings — iOS 20' (expected 46%, currently 31%). Two blockers flagged in his last 3 EODs. Recommend addressing in today's L10.",
  },
  {
    q: "Which company had the most blocked tasks this week?",
    a: "Horizon Labs — 4 blockers across 3 team members, primarily in Engineering. No blockers at Meridian or Apex this week.",
  },
  {
    q: "How is the team tracking against Q1 goals?",
    a: "3 of 4 rocks are on track. Average progress is 59% with 6 weeks remaining. The Settings redesign (Marcus) is the only at-risk item — intervention needed now.",
  },
]

const STATS = [
  { n: "15h",  label: "per week lost chasing status updates — across every company you run" },
  { n: "83%",  label: "of quarterly rocks silently die — because no one's watching daily" },
  { n: "4.2",  label: "disconnected tools per company — each one creating a new blind spot" },
  { n: "$18K", label: "wasted per manager per year just keeping everyone aligned" },
]

const PROBLEMS = [
  {
    title: "You're the bottleneck",
    body: "Your teams can't move without you because only you can see the full picture. You're not a CEO anymore — you're a dispatcher.",
  },
  {
    title: "Rocks get set and forgotten",
    body: "Set on day one. Forgotten by week three. Discovered dead at the quarterly review — when it's already too late to recover.",
  },
  {
    title: "No unified view exists",
    body: "Three Trello boards. Four spreadsheets. Two Notion docs. No one tool shows you everything — so you see nothing clearly.",
  },
]

const PROCESS = [
  { n: "01", title: "Set Your Rocks",       body: "Define 90-day priorities across every team and company. Assign owners. The system tracks them daily from here." },
  { n: "02", title: "Daily EOD Reports",    body: "Team does a 2-minute brain dump. AI reads it, buckets it by rock, flags blockers, and builds your morning briefing." },
  { n: "03", title: "Weekly Scorecard",     body: "Metrics tracked automatically every week. Red flags surface at week 2 — not week 10 when it's too late." },
  { n: "04", title: "Level 10 Meetings",   body: "Your L10 agenda builds itself from real data. Walk in knowing exactly what to IDS — no prep required." },
]

const DIFFS = [
  {
    title: "Get 15 hours back every week",
    body: "No more status meetings. No more Slack chases. Every morning: a clean briefing on every team, every company. Done in 90 seconds.",
  },
  {
    title: "Rocks stop falling",
    body: "Daily EODs feed your rocks dashboard automatically. At-risk signals fire at week 2 — while there's still time to fix it.",
  },
  {
    title: "Scale without adding headcount",
    body: "Most founders hire an ops manager per company. Taskspace replaces that need — full visibility across all entities without a $100K+ salary each.",
  },
  {
    title: "Teams actually adopt it",
    body: "2-minute AI-assisted EODs. Teams say it helps THEM stay organized — not just you. That's why adoption actually sticks.",
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
          <Label>For multi-company founders running on EOS</Label>
          <h1
            className="font-serif font-normal text-black leading-[1.05] mb-6"
            style={{ fontSize: "clamp(36px, 4.5vw, 64px)" }}
          >
            Stop drowning<br />in status updates.
          </h1>
          <p className="font-mono text-[15px] text-black/55 leading-relaxed mb-8 max-w-sm">
            Get real-time visibility into every team, every company, every day —
            without the Slack messages, status meetings, and spreadsheet chaos.
          </p>
          <div className="border-t border-black/10 pt-4">
            <p className="font-mono text-[11px] text-black/40 uppercase tracking-[0.15em]">
              trytaskspace.com · live in 2 minutes · no credit card
            </p>
          </div>
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
        <Label>The cost of the chaos</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.05] mb-4"
          style={{ fontSize: "clamp(32px, 4vw, 56px)" }}
        >
          Every founder we talk to<br />says the same thing.
        </h2>
        <p className="font-serif italic text-black/35 mb-10" style={{ fontSize: "clamp(16px, 2vw, 22px)" }}>
          "I have no idea what's actually getting done."
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-black">
        {STATS.map((s, i) => (
          <div
            key={i}
            className="p-6 sm:p-8 transition-all duration-200 hover:bg-white cursor-default"
            style={{
              borderRight: i < STATS.length - 1 ? "1px solid black" : undefined,
              borderTop: "2px solid black",
            }}
          >
            <div
              className="font-serif font-normal text-black mb-3"
              style={{ fontSize: "clamp(36px, 3.5vw, 52px)" }}
            >
              {s.n}
            </div>
            <div className="font-mono text-[13px] text-black/55 leading-relaxed">{s.label}</div>
          </div>
        ))}
      </div>
    </Slide>
  )
}

function S3() {
  return (
    <Slide>
      <div className="max-w-2xl mb-12">
        <Label>Why this keeps happening</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.05] mb-3"
          style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
        >
          You started multiple companies<br />because you're a builder.
        </h2>
        <p className="font-serif font-normal text-black/25" style={{ fontSize: "clamp(22px, 2.5vw, 36px)" }}>
          Not a babysitter.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-black">
        {PROBLEMS.map((p, i) => (
          <div
            key={i}
            className="p-8 transition-all duration-200 hover:bg-white"
            style={{ borderRight: i < PROBLEMS.length - 1 ? "1px solid black" : undefined }}
          >
            <div className="font-mono text-[11px] font-bold text-black/20 mb-4 tracking-widest">
              0{i + 1}
            </div>
            <div className="font-mono text-[13px] font-medium text-black mb-3 uppercase tracking-wide">
              {p.title}
            </div>
            <div className="font-mono text-[13px] text-black/55 leading-relaxed">{p.body}</div>
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
          className="font-serif font-normal text-black leading-[1.05] mb-3"
          style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
        >
          Four phases.<br />One system.
        </h2>
        <p className="font-mono text-[13px] text-black/35">Set once. Runs daily. Surfaces everything that matters.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 border border-black">
        {PROCESS.map((step, i) => (
          <div
            key={i}
            className="p-7 transition-all duration-200 hover:bg-white"
            style={{ borderRight: i < PROCESS.length - 1 ? "1px solid black" : undefined }}
          >
            <div className="font-mono text-[11px] font-bold text-black/20 mb-4 tracking-widest">
              {step.n}
            </div>
            <div className="font-mono text-[13px] font-medium text-black mb-3">{step.title}</div>
            <div className="font-mono text-[13px] text-black/55 leading-relaxed">{step.body}</div>
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
          <div className="space-y-7">
            {[
              { step: "01", title: "Team submits raw EOD", body: "No forms, no templates. Your team pastes whatever they did. Messy is fine — AI handles the rest." },
              { step: "02", title: "AI organizes & parses",   body: "AI reads the dump, maps every task to a rock, flags blockers, and scores team sentiment." },
              { step: "03", title: "Insights surfaced instantly", body: "You see a clean morning briefing — not 14 Slack messages. Every team. Every company. 90 seconds." },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 border-l-2 border-black/15 pl-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-black/30 mb-1">{item.step}</div>
                  <div className="font-mono text-[13px] font-semibold text-black mb-2">{item.title}</div>
                  <div className="font-mono text-[13px] text-black/55 leading-relaxed">{item.body}</div>
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
          <p className="font-mono text-[14px] text-black/55 leading-relaxed mb-6 max-w-sm">
            90-day goals broken into milestones, tracked daily, with automated
            risk signals before they become surprises that blow up your L10.
          </p>
          <div className="space-y-3">
            {[
              "See % complete on every rock, every day — not just at quarter-end",
              "Red flags appear at week 2, when you can still course-correct",
              "Every rock has one owner. No hiding. No excuses.",
              "See all rocks across all companies in one scroll",
            ].map((feat) => (
              <div key={feat} className="flex items-start gap-3">
                <span className="font-mono text-[13px] text-black/40 mt-0.5">→</span>
                <span className="font-mono text-[13px] text-black/65">{feat}</span>
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
          <Label>AI Intelligence</Label>
          <h2
            className="font-serif font-normal text-black leading-[1.05] mb-6"
            style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
          >
            Stop digging through<br />reports. Just ask.
          </h2>
          <p className="font-mono text-[14px] text-black/55 leading-relaxed mb-6 max-w-sm">
            Every EOD, every rock, every scorecard — the AI has read all of it.
            Ask about blockers, team health, or who's falling behind. Get a straight answer in seconds.
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
        <Label>What you actually get</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.05]"
          style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
        >
          Four outcomes founders<br />feel within the first week.
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 border border-black">
        {DIFFS.map((d, i) => {
          const isBottom = i >= 2
          const isRight  = i % 2 === 0
          return (
            <div
              key={i}
              className="p-9 transition-all duration-200 hover:bg-white"
              style={{
                borderBottom: !isBottom ? "1px solid black" : undefined,
                borderRight:  isRight   ? "1px solid black" : undefined,
              }}
            >
              <div className="font-mono text-[15px] font-semibold text-black mb-3">{d.title}</div>
              <div className="font-mono text-[13px] text-black/55 leading-relaxed">{d.body}</div>
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
      <div className="min-h-[70vh] flex flex-col justify-center">
        <Label>The choice in front of you</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.04] mb-12"
          style={{ fontSize: "clamp(36px, 5vw, 68px)" }}
        >
          Stop managing.<br />Start scaling.
        </h2>

        {/* Two paths */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border border-black mb-10">
          {/* Path A — the hard way */}
          <div className="p-8 border-b sm:border-b-0 sm:border-r border-black">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/35 mb-5">Without Taskspace</div>
            <div className="space-y-3">
              {[
                "Juggling spreadsheets, Slack threads, and Notion docs forever",
                "Playing phone tag with team leads. Every. Week.",
                "Being the single point of failure across every company you run",
                "Never actually knowing what's getting done",
                "Finding out rocks are dead at week 10 — not week 2",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-black/25 mt-0.5 flex-shrink-0">✕</span>
                  <span className="font-mono text-[13px] text-black/55 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Path B — Taskspace */}
          <div className="p-8 bg-black">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-5">With Taskspace</div>
            <div className="space-y-3">
              {[
                "Every morning: a full briefing on every team, every company",
                "15+ hours per week back. Status meetings: gone.",
                "At-risk rocks surface at week 2 — while you can still save the quarter",
                "Teams fully onboarded in one L10 meeting",
                "Full portfolio clarity. Day 3. Every time.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-white/50 mt-0.5 flex-shrink-0">→</span>
                  <span className="font-mono text-[13px] text-white/85 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
          <div>
            <div className="border border-black px-8 py-4 bg-black inline-block mb-2 transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer">
              <span className="font-mono text-[11px] text-white uppercase tracking-widest">Start Free — No Credit Card</span>
            </div>
            <p className="font-mono text-[10px] text-black/30 uppercase tracking-widest">
              trytaskspace.com · Live in under two minutes
            </p>
          </div>
          <div className="hidden sm:block border-l-[3px] border-black pl-6">
            <div className="font-serif font-normal text-black leading-snug mb-1" style={{ fontSize: "clamp(16px, 1.8vw, 20px)", maxWidth: "310px" }}>
              "Let's get your most chaotic company set up right now — before this call ends."
            </div>
            <div className="font-mono text-[10px] text-black/35 uppercase tracking-widest">— Your Taskspace onboarding call</div>
          </div>
        </div>

        {/* Pricing strip */}
        <div className="grid grid-cols-3 border border-black mt-8 max-w-lg">
          {[
            { plan: "Free",     price: "$0",  note: "Up to 3 users · 1 workspace",  featured: false },
            { plan: "Team",     price: "$9",  note: "Per user/mo · 3 workspaces",   featured: true  },
            { plan: "Business", price: "$19", note: "Per user/mo · Unlimited",      featured: false },
          ].map((tier, i) => (
            <div
              key={tier.plan}
              className="py-5 px-4 relative"
              style={{
                borderRight:     i < 2 ? "1px solid black" : undefined,
                backgroundColor: tier.featured ? "rgba(0,0,0,0.05)" : "transparent",
              }}
            >
              {tier.featured && (
                <div className="font-mono text-[8px] uppercase tracking-widest text-black/50 mb-1">★ Most Popular</div>
              )}
              <div className="font-mono text-[9px] uppercase tracking-widest mb-1 text-black/35">{tier.plan}</div>
              <div className="font-serif font-normal text-black mb-0.5" style={{ fontSize: "clamp(18px, 2vw, 26px)" }}>{tier.price}</div>
              <div className="font-mono text-[9px] text-black/30 leading-relaxed">{tier.note}</div>
            </div>
          ))}
        </div>
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
        <span className="font-mono text-[13px] text-black/35">
          {String(slide + 1).padStart(2, "0")}&thinsp;/&thinsp;{String(TOTAL_SLIDES).padStart(2, "0")}
        </span>
      </div>

      {/* Prev arrow */}
      {slide > 0 && (
        <button
          onClick={() => goTo(slide - 1)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 border-2 border-black bg-white/95 flex items-center justify-center hover:bg-white transition-colors hidden sm:flex shadow-sm"
          aria-label="Previous slide"
        >
          <span className="font-mono text-base leading-none">←</span>
        </button>
      )}

      {/* Next arrow */}
      {slide < TOTAL_SLIDES - 1 && (
        <button
          onClick={() => goTo(slide + 1)}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 border-2 border-black bg-white/95 flex items-center justify-center hover:bg-white transition-colors hidden sm:flex shadow-sm"
          aria-label="Next slide"
        >
          <span className="font-mono text-base leading-none">→</span>
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
              width: i === slide ? "22px" : "8px",
              height: "8px",
              backgroundColor: i === slide ? "black" : "rgba(0,0,0,0.2)",
              borderRadius: "4px",
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
