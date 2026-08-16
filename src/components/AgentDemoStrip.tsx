'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Pause, Play } from 'lucide-react'

const QUERY = "Find me a personalized T-shirt for Father's Day gifting under $50, ships to California"

const SCAN_SEQUENCE = [
  { name: "The Sportswear Brand", match: false, label: "not AI-visible" },
  { name: "The Luxury Brand", match: false, label: "not AI-visible" },
  { name: "BigBoxRetail.com", match: false, label: "not AI-visible" },
  { name: "TheCustomHub",    match: true,  label: "AI-visible · match" },
  { name: "Sara's Boutique", match: true,  label: "AI-visible · match" },
]

type Phase = 0 | 1 | 2

const PHASE_LABELS = ['1. Query', '2. Scanning', '3. Result']
const PHASE_ANNOUNCEMENTS = [
  `Step 1 of 3. Buyer asks: "${QUERY}"`,
  'Step 2 of 3. Scanning merchant profiles for a match.',
  'Step 3 of 3. Match found — TheCustomHub is AI-visible, ships to California, personalized, and under $50.',
]

// Respects the user's OS-level reduced-motion preference. When true, the
// component skips the timed auto-advancing animation entirely and instead
// renders every state at once so the before/after story is still conveyed
// without motion. Uses useSyncExternalStore (rather than state-in-effect)
// since matchMedia is exactly the kind of external browser API it exists to
// subscribe to, and it reads correctly on both server and client.
const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(reducedMotionQuery)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}
function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches
}
function getReducedMotionServerSnapshot() {
  return false
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot)
}

interface AgentDemoStripProps {
  /** Overrides the trailing ghost CTA label. Defaults to the aeo-score check-my-store copy. */
  ctaLabel?: string
  /** Overrides the trailing ghost CTA destination. Defaults to /aeo-score. */
  ctaHref?: string
  /** Set false to hide the internal CTA — used when a host page (e.g. a guided-demo scene) supplies its own completion action so the two don't compete. */
  showCta?: boolean
  /** Tightens outer spacing for use inside another component's card/scene container instead of as a standalone page section. */
  embedded?: boolean
  /** Called once each time the strip reaches its result phase (including immediately, under reduced motion). */
  onComplete?: () => void
}

export default function AgentDemoStrip({
  ctaLabel = 'Check what AI sees in my store',
  ctaHref = '/aeo-score',
  showCta = true,
  embedded = false,
  onComplete,
}: AgentDemoStripProps = {}) {
  const prefersReducedMotion = usePrefersReducedMotion()

  const [phase, setPhase]       = useState<Phase>(0)
  const [chars, setChars]       = useState(0)
  const [scanStep, setScanStep] = useState(-1)
  const [paused, setPaused]     = useState(false)
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Auto-advancing animation — skipped entirely under reduced motion, and
  // pauseable so users who want to read a state at their own pace can stop
  // the cycle rather than race the timer.
  useEffect(() => {
    if (prefersReducedMotion || paused) return

    // Note: chars/scanStep resets happen inside timer callbacks (below),
    // never synchronously at the top of the effect body — each phase's
    // starting values are established by the *previous* phase's transition
    // callback (or by the initial useState values, for the very first run).
    if (phase === 0) {
      let i = 0
      let transitionTimer: ReturnType<typeof setTimeout>
      const iv = setInterval(() => {
        i++
        setChars(i)
        if (i >= QUERY.length) {
          clearInterval(iv)
          transitionTimer = setTimeout(() => {
            setScanStep(0)
            setPhase(1)
          }, 900)
        }
      }, 45)
      return () => {
        clearInterval(iv)
        clearTimeout(transitionTimer)
      }
    }

    if (phase === 1) {
      const STEP_MS = 700
      const timers: ReturnType<typeof setTimeout>[] = []
      SCAN_SEQUENCE.forEach((_, i) => {
        if (i > 0) timers.push(setTimeout(() => setScanStep(i), i * STEP_MS))
      })
      timers.push(setTimeout(() => setPhase(2), SCAN_SEQUENCE.length * STEP_MS + 1400))
      return () => timers.forEach(clearTimeout)
    }

    if (phase === 2) {
      const t = setTimeout(() => {
        setChars(0)
        setScanStep(-1)
        setPhase(0)
      }, 4500)
      return () => clearTimeout(t)
    }
  }, [phase, paused, prefersReducedMotion])

  // Announce phase changes to screen reader users via a polite live region.
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = PHASE_ANNOUNCEMENTS[phase]
    }
  }, [phase])

  // Notify the host once the result phase is reached — including immediately
  // under reduced motion, where the full story renders statically at once.
  useEffect(() => {
    if (!prefersReducedMotion && phase === 2) onComplete?.()
  }, [phase, prefersReducedMotion, onComplete])
  useEffect(() => {
    if (prefersReducedMotion) onComplete?.()
  }, [prefersReducedMotion, onComplete])

  // Manually jump to a phase (via the step tabs). This also pauses autoplay
  // so a deliberate click never gets immediately overridden by the timer.
  function goToPhase(target: Phase) {
    setPaused(true)
    setPhase(target)
    if (target === 0) {
      setChars(QUERY.length)
      setScanStep(-1)
    } else if (target === 1) {
      setScanStep(SCAN_SEQUENCE.length - 1)
    } else {
      setChars(QUERY.length)
      setScanStep(SCAN_SEQUENCE.length - 1)
    }
  }

  const showStatic = prefersReducedMotion
  const currentItem = SCAN_SEQUENCE[scanStep]
  const scanHeader = currentItem?.match
    ? `match found → ${currentItem.name}`
    : 'scanning merchant profiles…'

  return (
    <div className={embedded ? 'w-full' : 'mt-0 max-w-2xl mx-auto'}>

      {/* Screen-reader-only narration of state changes */}
      <div ref={liveRegionRef} className="sr-only" role="status" aria-live="polite" />

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">

        {/* Step indicators */}
        <div className="flex border-b border-slate-800" role="tablist" aria-label="Demo steps">
          {PHASE_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={showStatic ? undefined : phase === i}
              aria-controls="agent-demo-panel"
              onClick={() => !showStatic && goToPhase(i as Phase)}
              className={`flex-1 px-2 py-3 text-xs font-semibold text-center transition-colors border-b-2 ${
                !showStatic && phase === i
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-slate-600 border-transparent hover:text-slate-400'
              } ${showStatic ? 'cursor-default' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Play / pause control — hidden under reduced motion since there is
            nothing playing to pause. */}
        {!showStatic && (
          <div className="flex justify-end px-3 pt-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
              aria-label={paused ? 'Resume demo animation' : 'Pause demo animation'}
            >
              {paused ? <Play className="w-3 h-3" aria-hidden="true" /> : <Pause className="w-3 h-3" aria-hidden="true" />}
              {paused ? 'Play' : 'Pause'}
            </button>
          </div>
        )}

        {/* Content area */}
        <div id="agent-demo-panel" className="p-5 min-h-[130px] flex items-center">

          {showStatic ? (
            /* Reduced-motion: render the full before/after story at once,
               with no timed transitions. */
            <div className="w-full space-y-5">
              <div>
                <div className="text-xs text-slate-500 mb-2 font-mono">buyer query</div>
                <p className="font-mono text-sm text-emerald-300 leading-relaxed break-words">
                  &ldquo;{QUERY}&rdquo;
                </p>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2 font-mono">merchant profiles scanned</div>
                <div className="flex flex-wrap gap-2">
                  {SCAN_SEQUENCE.map(({ name, match, label }) => (
                    <div
                      key={name}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                        match
                          ? 'border-emerald-400 bg-emerald-900 text-emerald-200'
                          : 'border-slate-700 bg-slate-800/30 text-slate-500'
                      }`}
                    >
                      <div>{match ? `✓ ${name}` : name}</div>
                      <div className={`mt-0.5 text-[10px] ${match ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-2 font-mono">match found</div>
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
            </div>
          ) : (
            <>
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
            </>
          )}

        </div>
      </div>

      {/* Subtext */}
      <p className="mt-4 text-sm text-slate-500 text-center leading-relaxed">
        This is what AI-visible commerce looks like. Most stores are invisible to this query today.
      </p>

      {/* Ghost CTA — points to the readiness diagnostic so a visitor can
          immediately check their own store. Hidden when a host page (e.g. a
          guided-demo scene) supplies its own completion action instead. */}
      {showCta && (
        <div className="text-center mt-3">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:text-slate-900 transition-colors"
          >
            {ctaLabel} &rarr;
          </Link>
        </div>
      )}

    </div>
  )
}
