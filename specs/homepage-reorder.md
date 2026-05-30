# Homepage Reorder — Cold-Traffic, Education-First

**Goal:** Restructure the homepage so a *cold* visitor understands the problem
before being asked to convert or navigate. The conversion block (primary CTA +
"pick your path" rail) currently sits too high — it interrupts the problem
narrative. Move it to the bottom where self-selection is earned.

**Scope:** `src/app/page.tsx` only. `src/components/AgentDemoStrip.tsx` is
**not edited** — only wrapped with an `id` in `page.tsx`. No new packages.
Smooth scroll via Tailwind utility classes (no JS).

---

## Section order: current → target

| # | Current | Target |
|---|---------|--------|
| 1 | Hero + primary CTA + path rail | Hero + **one CTA** (scroll-to-demo) |
| 2 | BEFORE card | BEFORE card *(unchanged)* |
| 3 | Demo strip | Demo strip *(+ `id="demo"`)* |
| 4 | Three merchants | **Breadth connector line** *(NEW — see below)* |
| 5 | How it works | Three merchants *(unchanged)* |
| 6 | Where RAOS fits | How it works *(unchanged)* |
| 7 | Founder | Where RAOS fits *(unchanged)* |
| 8 | Final CTA | Founder *(unchanged)* |
| 9 | — | **Merged closing** = primary CTA + path rail |

---

## Change-by-change

### 1. Hero CTA → lead into the page (not a conversion ask)
- Replace the existing `<Link href="/for-merchants">Make my store visible to AI →</Link>`
  with a same-page anchor (plain `<a>`, not Next `Link`):
  - `<a href="#demo" className="[same dark pill classes as before]">Show me what AI sees →</a>`
- **Remove from the hero:** the `or, pick your path` divider AND both story-rail
  blocks (the `sm:grid` desktop version and the `sm:hidden` mobile-stacked version).
  They move to the merged closing (step 9).
- Hero ends right after this single CTA.

### 2. Enable smooth scroll
- Outer container `<div className="h-full overflow-y-auto">` → add `scroll-smooth`.
- The anchor scrolls the nearest scrollable ancestor (this container) — works
  with no JavaScript.

### 3. Demo strip gets the scroll target
- Wrap in `page.tsx`:
  ```tsx
  <div id="demo" className="scroll-mt-6">
    <AgentDemoStrip />
  </div>
  ```
- `scroll-mt-6` prevents it from landing flush against the top edge after the jump.

### 4. Breadth connector — ⚠️ CRITICAL, DO NOT SKIP
**Why it matters:** the BEFORE card and demo are boutique-discovery only
(Father's Day t-shirt → Sara / TheCustomHub). That undersells the thesis. A cold
reader's first impression becomes "this is just for tiny gift shops." This
connector signals the problem is broader and hands off into the three-merchant
section (which proves it: wholesale mispricing, retail fulfillment).

- Place a short centered block **between the demo strip (step 3) and the
  three-merchant section (step 5).**
- Proposed copy:
  - **Lead (bold, dark):** `Discovery is just the start.`
  - **Subline (muted):** `Wholesalers get mispriced. Retailers get fulfillment wrong. Same blind spot — different cost.`
- Keep it visually light (no card) so it reads as a narrative bridge, not a new
  section. Suggested: `max-w-xl mx-auto text-center mt-16` with a bold
  `text-lg`/`text-xl` lead and `text-sm text-gray-500` subline.

### 5. Merged closing (replaces the old final CTA section)
This is the old hero conversion block, moved to where it belongs for cold traffic.
- Heading (proposed): `You've seen the problem. Pick your path.`
- **Primary dark CTA:** `Make my store visible to AI →` → `/for-merchants`
  (the real conversion, now earned by the page above it).
- Divider: `or, pick your path`
- The 3-card rail — reuse the **exact markup removed from the hero**:
  - Merchant → `/guided` — "Watch how Sara's Boutique got found by AI" → "See the guided story →"
  - Builder → `/demo` — "Try a live agent query on a real merchant profile" → "Open the playground →"
  - Following → `/buildlog` — "See what shipped this week and what's next" → "Read the build log →"
- **Delete** the old slate-900 `See RetailAgentOS in action` section (absorbed
  here — avoids asking the same person to choose twice).

---

## Removals checklist
- [ ] Hero: `or, pick your path` divider
- [ ] Hero: desktop story-rail grid block
- [ ] Hero: mobile story-rail stacked block
- [ ] Old final CTA section (slate-900 "See RetailAgentOS in action" card)

## Verification
- [ ] Check for now-unused `lucide-react` imports (`Store`, `ArrowRight`,
      `Sparkles`, `Zap`) and trim the import line accordingly.
- [ ] `npx tsc --noEmit` passes clean.
- [ ] Manual: hero CTA smooth-scrolls to the demo strip; closing rail links resolve.

## Copy defaults (confirm or override before coding)
- Hero subtext (**locked**): **"AI agents are already shopping. Most stores get skipped or misread."**
  - Replaces the current subtext "AI agents are already shopping. Most stores are invisible to them."
  - Keep the headline above it ("Your next customer is asking an AI to find them the perfect store. Will it find yours?") **unchanged**.
  - Rationale: "skipped" = invisibility (boutique discovery); "misread" = mispricing/wrong fulfillment (wholesale/retail). This umbrella phrasing sets up the breadth connector (#4) as a payoff, not a topic shift. Do **not** narrow it back to "invisible / can't be seen" — that re-locks the problem to discovery only.
- Hero CTA button: **"Show me what AI sees →"**
- Connector lead: **"Discovery is just the start."**
- Connector subline: **"Wholesalers get mispriced. Retailers get fulfillment wrong. Same blind spot — different cost."**
- Closing heading: **"You've seen the problem. Pick your path."**

## Constraints
- Next.js / TypeScript / Tailwind only. No new packages.
- Do not edit `AgentDemoStrip.tsx`. Do not touch nav, footer, or other pages.
- Preserve all existing copy/colors except the explicit changes above.
