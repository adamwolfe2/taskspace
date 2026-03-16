"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { DemoEODForm } from "@/components/marketing/demo-eod-form"
import { DemoRocks } from "@/components/marketing/demo-rocks"
import { DemoScorecard } from "@/components/marketing/demo-scorecard"

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const COMPANY_DEMO = "Horizon Labs"

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

type AIPhase = "question" | "typing" | "done"

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

// ─── DEMO: AI MANAGER CHAT ────────────────────────────────────────────────────

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
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-3xl mx-auto hidden sm:block">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">AI Command Center</h3>
          <p className="text-sm text-slate-500">{COMPANY_DEMO} · Ask anything</p>
        </div>
        <div className="flex gap-1.5 items-center">
          {AI_QA.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === pairIdx ? "20px" : "8px",
                height: "8px",
                backgroundColor: i === pairIdx ? "#1e293b" : "#cbd5e1",
              }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-4 min-h-[210px]">
        {/* Previous pairs grayed */}
        {AI_QA.slice(0, pairIdx).map((qa, i) => (
          <div key={i} className="opacity-25 space-y-2">
            <div className="flex gap-2">
              <span className="font-mono text-[9px] text-slate-500 uppercase flex-shrink-0 mt-0.5">You</span>
              <span className="font-mono text-[10px] text-slate-600">{qa.q}</span>
            </div>
            <div className="flex gap-2">
              <div className="w-5 h-5 bg-slate-900 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="font-mono text-[7px] text-white font-bold">TS</span>
              </div>
              <span className="font-mono text-[10px] text-slate-600 leading-relaxed">{qa.a}</span>
            </div>
          </div>
        ))}

        {/* Current pair */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="font-mono text-[9px] text-slate-500 uppercase flex-shrink-0 mt-0.5">You</span>
            <span className="font-mono text-[11px] text-slate-900">{AI_QA[pairIdx].q}</span>
          </div>
          <div className="flex gap-2" style={{ animation: "tsiFadeIn 0.25s ease both" }}>
            <div className="w-5 h-5 bg-slate-900 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="font-mono text-[7px] text-white font-bold">TS</span>
            </div>
            {aiPhase === "question" ? (
              <span className="font-mono text-[10px] text-slate-400 animate-pulse">thinking…</span>
            ) : (
              <span className="font-mono text-[10px] text-slate-700 leading-relaxed">
                {typed}
                {aiPhase === "typing" && (
                  <span className="inline-block w-0.5 h-3 bg-slate-700 align-middle ml-0.5 animate-pulse" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
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
        <DemoEODForm />
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
        <DemoEODForm />
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
        <DemoRocks compact />
      </div>
    </Slide>
  )
}

function S7() {
  return (
    <Slide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-16 items-start">
        <div>
          <Label>AI Intelligence</Label>
          <h2
            className="font-serif font-normal text-black leading-[1.05] mb-6"
            style={{ fontSize: "clamp(30px, 3.5vw, 50px)" }}
          >
            Stop digging through<br />reports. Just ask.
          </h2>
          <p className="font-mono text-[14px] text-black/55 leading-relaxed mb-8 max-w-sm">
            Every EOD, every rock, every scorecard — the AI has read all of it.
            Ask about blockers, team health, or who's falling behind. Get a straight answer in seconds.
          </p>
          <DemoScorecard />
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
      <div className="flex flex-col justify-center">
        <Label>The choice in front of you</Label>
        <h2
          className="font-serif font-normal text-black leading-[1.04] mb-10"
          style={{ fontSize: "clamp(32px, 4.5vw, 58px)" }}
        >
          Stop managing.<br />Start scaling.
        </h2>

        {/* Two paths */}
        <div className="grid grid-cols-1 sm:grid-cols-2 border border-black mb-10">
          {/* Path A — the hard way */}
          <div className="p-7 border-b sm:border-b-0 sm:border-r border-black">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/35 mb-4">Without Taskspace</div>
            <div className="space-y-2.5">
              {[
                "Juggling spreadsheets, Slack threads, and Notion docs forever",
                "Playing phone tag with team leads. Every. Week.",
                "Being the single point of failure across every company you run",
                "Never actually knowing what's getting done",
                "Finding out rocks are dead at week 10 — not week 2",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-black/25 mt-0.5 flex-shrink-0">✕</span>
                  <span className="font-mono text-[12px] text-black/55 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Path B — Taskspace */}
          <div className="p-7 bg-black">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 mb-4">With Taskspace</div>
            <div className="space-y-2.5">
              {[
                "Every morning: a full briefing on every team, every company",
                "15+ hours per week back. Status meetings: gone.",
                "At-risk rocks surface at week 2 — while you can still save the quarter",
                "Teams fully onboarded in one L10 meeting",
                "Full portfolio clarity. Day 3. Every time.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-white/50 mt-0.5 flex-shrink-0">→</span>
                  <span className="font-mono text-[12px] text-white/85 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA + Pricing — side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
          {/* Left: CTA + quote */}
          <div>
            <div className="border border-black px-8 py-4 bg-black inline-block mb-3 transition-transform duration-200 hover:scale-[1.02] hover:shadow-lg cursor-pointer">
              <span className="font-mono text-[11px] text-white uppercase tracking-widest">Start Free — No Credit Card</span>
            </div>
            <p className="font-mono text-[10px] text-black/30 uppercase tracking-widest mb-6">
              trytaskspace.com · Live in under two minutes
            </p>
            <div className="border-l-[3px] border-black pl-5">
              <div className="font-serif font-normal text-black leading-snug mb-1" style={{ fontSize: "clamp(14px, 1.5vw, 18px)", maxWidth: "310px" }}>
                "Let's get your most chaotic company set up right now — before this call ends."
              </div>
              <div className="font-mono text-[10px] text-black/35 uppercase tracking-widest">— Your Taskspace onboarding call</div>
            </div>
          </div>

          {/* Right: Pricing strip — stacked vertically */}
          <div className="border border-black">
            {[
              { plan: "Free",     price: "$0",  note: "Up to 3 users · 1 workspace",  featured: false },
              { plan: "Team",     price: "$9",  note: "Per user/mo · 3 workspaces",   featured: true  },
              { plan: "Business", price: "$19", note: "Per user/mo · Unlimited",      featured: false },
            ].map((tier, i) => (
              <div
                key={tier.plan}
                className="flex items-center justify-between py-4 px-5"
                style={{
                  borderBottom: i < 2 ? "1px solid black" : undefined,
                  backgroundColor: tier.featured ? "rgba(0,0,0,0.05)" : "transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  {tier.featured && (
                    <span className="font-mono text-[8px] uppercase tracking-widest text-black/50">★</span>
                  )}
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-black/40">{tier.plan}</div>
                    <div className="font-mono text-[9px] text-black/30 leading-relaxed">{tier.note}</div>
                  </div>
                </div>
                <div className="font-serif font-normal text-black" style={{ fontSize: "clamp(18px, 2vw, 26px)" }}>{tier.price}</div>
              </div>
            ))}
          </div>
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
      <div className="fixed top-3 left-5 z-50 flex items-center gap-2.5">
        <svg width="28" height="28" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="180" height="180" rx="37" fill="black" />
          <g style={{ transform: "scale(95%)", transformOrigin: "center" }}>
            <path fill="white" d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z" />
            <path fill="white" d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z" />
          </g>
        </svg>
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
