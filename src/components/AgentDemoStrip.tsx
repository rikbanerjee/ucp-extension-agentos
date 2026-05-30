'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const QUERY = "Find me a personalized T-shirt for Father's Day gifting under $50, ships to California"

const SCAN_SEQUENCE = [
  { name: "The Sportswear Brand", match: false, label: "not AI-visible" },
  { name: "The Luxury Brand", match: false, label: "not AI-visible" },
  { name: "BigBoxRetail.com", match: false, label: "not AI-visible" },
  { name: "TheCustomHub",    match: true,  label: "AI-visible · match" },
  { name: "Sara's Boutique", match: true,  label: "AI-visible · match" },
]

type Phase = 0 | 1 | 2

export default function AgentDemoStrip() {
  const [phase, setPhase]       = useState<Phase>(0)
  const [chars, setChars]       = useState(0)
  const [scanStep, setScanStep] = useState(-1)

  useEffect(() => {
    if (phase === 0) {
      setChars(0)
      setScanStep(-1)
      let i = 0
      let transitionTimer: ReturnType<typeof setTimeout>
      const iv = setInterval(() => {
        i++
        setChars(i)
        if (i >= QUERY.length) {
          clearInterval(iv)
          transitionTimer = setTimeout(() => setPhase(1), 900)
        }
      }, 45)
      return () => {
        clearInterval(iv)
        clearTimeout(transitionTimer)
      }
    }

    if (phase === 1) {
      setScanStep(0)
      const STEP_MS = 700
      const timers: ReturnType<typeof setTimeout>[] = []
      SCAN_SEQUENCE.forEach((_, i) => {
        if (i > 0) timers.push(setTimeout(() => setScanStep(i), i * STEP_MS))
      })
      timers.push(setTimeout(() => setPhase(2), SCAN_SEQUENCE.length * STEP_MS + 1400))
      return () => timers.forEach(clearTimeout)
    }

    if (phase === 2) {
      const t = setTimeout(() => setPhase(0), 4500)
      return () => clearTimeout(t)
    }
  }, [phase])

  const PHASE_LABELS = ['1. Query', '2. Scanning', '3. Result']

  const currentItem = SCAN_SEQUENCE[scanStep]
  const scanHeader = currentItem?.match
    ? `match found → ${currentItem.name}`
    : 'scanning merchant profiles…'

  return (
    <div className="mt-0 max-w-2xl mx-auto">

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">

        {/* Step indicators */}
        <div className="flex border-b border-slate-800">
          {PHASE_LABELS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 px-2 py-3 text-xs font-semibold text-center transition-colors border-b-2 ${
                phase === i
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-slate-600 border-transparent'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div className="p-5 min-h-[130px] flex items-center">

          {/* Phase 0 — typewriter query */}
          {phase === 0 && (
            <div className="w-full">
              <div className="text-xs text-slate-500 mb-3 font-mono">buyer query</div>
              <p className="font-mono text-sm text-emerald-300 leading-relaxed break-words">
                &ldquo;{QUERY.slice(0, chars)}
                <span className="inline-block w-[2px] h-[1em] bg-emerald-400 ml-px animate-pulse align-text-bottom" />
                &rdquo;
              </p>
            </div>
          )}

          {/* Phase 1 — sequential merchant scan */}
          {phase === 1 && (
            <div className="w-full">
              <div className="text-xs text-slate-500 mb-4 font-mono">{scanHeader}</div>
              <div className="flex flex-wrap gap-2">
                {SCAN_SEQUENCE.map(({ name, match, label }, i) => {
                  const isActive    = i === scanStep
                  const isPastMatch = i < scanStep && match
                  const isRejected  = i < scanStep && !match
                  const isMatched   = isActive && match

                  return (
                    <div
                      key={name}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-300 ${
                        isMatched || isPastMatch
                          ? 'border-emerald-400 bg-emerald-900 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                          : isActive
                          ? 'border-emerald-500 bg-emerald-950 text-emerald-300 animate-pulse'
                          : isRejected
                          ? 'border-slate-700 bg-slate-800/30 text-slate-700 opacity-40'
                          : 'border-slate-800 bg-slate-800/40 text-slate-600'
                      }`}
                    >
                      <div>{isMatched || isPastMatch ? `✓ ${name}` : name}</div>
                      <div className={`mt-0.5 text-[10px] ${isMatched || isPastMatch ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Phase 2 — result card */}
          {phase === 2 && (
            <div className="w-full">
              <div className="text-xs text-slate-500 mb-4 font-mono">match found</div>
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-4 py-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-sm font-bold text-white">TheCustomHub</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    AI-visible
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    Ships to CA
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    Personalized
                  </span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    Under $50
                  </span>
                </div>
                <p className="text-xs text-slate-400">Custom apparel &middot; Father&apos;s Day ready &middot; Ships in 3 days</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Subtext */}
      <p className="mt-4 text-sm text-slate-500 text-center leading-relaxed">
        This is what AI-visible commerce looks like. Most stores are invisible to this query today.
      </p>

      {/* Ghost CTA */}
      <div className="text-center mt-3">
        <Link
          href="/for-merchants"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:text-slate-900 transition-colors"
        >
          Make my store visible &rarr;
        </Link>
      </div>

    </div>
  )
}
