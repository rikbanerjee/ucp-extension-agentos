# RetailAgentOS — Planned Changes

Based on the full platform brief. This file tracks what will change, file by file, before any code is touched.

---

## Guiding principle

Every change either (a) helps a small merchant understand the value faster, or (b) gives a technical evaluator a credible architecture story. Nothing gets added that doesn't serve one of those two audiences.

---

## Change 1 — Homepage (`src/app/page.tsx`)

**What exists now:**
- Pain-first hero: "AI shopping agents are already active. Most small merchants are invisible to them."
- Three merchant cards with before/after panels
- How it works (3 steps)
- UCP mental model code block
- Dark CTA → Guided Demo + Vision

**What changes:**
- Hero headline strengthened to match brief direction: "Make your store visible to AI shopping agents"
- Add a fourth CTA block: "Get Visible to Agents" → routes to the new `/for-merchants` page
- Merchant archetype cards: translate extension features into merchant-benefit language
  - eligibility → "show the right products to the right buyers"
  - pricing context → "show the right price before checkout"
  - fulfillment constraints → "stop dead-end checkout paths before they happen"
- The three steps reworded: Declare rules → Agents understand → Correct outcomes (already close, just tighten the language)
- Add a services teaser row at the bottom (Store Visibility Audit / Blueprint / Custom Demo) with link to `/for-merchants`

**Files touched:** `src/app/page.tsx`

---

## Change 2 — New page: For Merchants (`src/app/for-merchants/page.tsx`)

**What exists now:** Nothing — this page does not exist.

**What gets built:**
This is the main merchant conversion page. It follows the funnel in the brief:

1. **Problem recognition block** — "Agents may skip or misunderstand your store"
2. **Education block** — how merchant rules affect visibility and commerce outcomes (plain language, no extension namespace jargon)
3. **Proof block** — link to the relevant Guided Demo chapter by merchant type (boutique / wholesale / grocery picker)
4. **Services block** — five service cards:
   - Store Visibility Audit
   - RetailAgentOS Readiness Blueprint
   - Custom Merchant Demo
   - Platform Integration Advisory
   - Managed Pilot
   Each card: name, one-line description, what's included (3–4 bullets), "Get in touch" CTA
5. **Conversion CTA** — email / contact prompt (static for now, no form submission logic)

**Files created:** `src/app/for-merchants/page.tsx`

---

## Change 3 — Navigation (`src/components/layout/NavBar.tsx`)

**What exists now:**
- Links: Overview / Merchant Profile / Playground / Guided Demo / Architecture / RetailAgentOS
- Business/Technical toggle on the right

**What changes:**
- Add "For Merchants" link between Overview and Merchant Profile
- Consider making it visually distinct (subtle accent color or badge) to signal it is the merchant entry point
- No other nav changes — the toggle stays, the rest of the links stay

**Files touched:** `src/components/layout/NavBar.tsx`

---

## Change 4 — Architecture page (`src/app/architecture/page.tsx`)

**What exists now:**
- Opens directly with the 3-layer model (Core UCP → Vendor Extensions → Computed Semantics)
- Extension namespace reference table
- Agentic commerce gap table
- Pure builder/technical framing throughout

**What changes:**
- Add a merchant-facing summary block at the very top (Business mode: shown; Technical mode: collapsed or hidden)
  - "Your store rules → Agent understanding → Correct actions and outcomes"
  - Three plain-language cards mapping each layer to a merchant benefit
- Add Layer 4 to the architecture model: **RetailAgentOS orchestration layer**
  - Covers: agent reasoning, action safety, merchant workflows, lead/handoff capture, guided merchant setup
  - Marked as "Coming" since it is not yet built
- Bottom section: connect to services / next steps with a link to `/for-merchants`
- Extension namespace table: add a "Merchant benefit" column alongside the existing technical columns
- Technical content (layer model, gap table, namespace table) stays intact — just reordered so merchant summary comes first

**Files touched:** `src/app/architecture/page.tsx`

---

## Change 5 — Vision / RetailAgentOS page (`src/app/vision/page.tsx`)

**What exists now (after last session):**
- Business mode: merchant pain, how it works, merchant value stories, platform capability direction
- Technical mode: learning journey, Phase 1 proofs, three-merchants thesis, roadmap with TODO markers

**What changes:**
- Business mode: update platform direction section from 4 generic capability cards → 6-phase platform roadmap using the new framing:
  - Phase 1: Merchant Semantics Foundation (done ✓)
  - Phase 2: Merchant Setup and Guided Onboarding (planned)
  - Phase 3: Agent Actions and Assisted Commerce (planned)
  - Phase 4: Commerce Stack Integration (planned)
  - Phase 5: Platform Intelligence and Merchant Outcomes (planned)
  - Phase 6: Upstream Standards Contribution (future)
- Business mode: add working positioning statement as a pull quote: "RetailAgentOS is a small-merchant AI commerce platform built on top of UCP..."
- Business mode CTA: add "For Merchants" as a primary CTA alongside Guided Demo
- Technical mode roadmap: align phase names/framing with the updated platform roadmap above (currently uses old phase names)
- No structural changes to how Business/Technical toggle works

**Files touched:** `src/app/vision/page.tsx`

---

## Change 6 — Merchant Profile page (`src/app/profile/page.tsx`)

**What exists now:** (need to read — not inspected yet)

**What changes:**
- Add a page-top descriptor: "Your published store contract for agents"
- Business mode: lead with what the profile does for the merchant (agents can find you, understand your rules, quote correctly)
- Technical mode: existing profile/extension JSON view stays

**Files touched:** `src/app/profile/page.tsx`  
**Dependency:** Read the current file first before writing the plan detail.

---

## Change 7 — Playground page (`src/app/demo/page.tsx`)

**What exists now:**
- Scenario presets bar (5 presets)
- Left: context form with product list
- Right: Decision Card (business) or JSON inspector (technical)
- Dismissable hint banner

**What changes:**
- Page subtitle / descriptor: "How agents interpret your store in context"
- Business mode: add a one-line framing above the scenario picker — "Pick a merchant type to see how context changes what an agent can do"
- No structural or logic changes — just messaging positioning

**Files touched:** `src/app/demo/page.tsx`

---

## Change 8 — Guided Demo page (`src/app/guided/page.tsx`)

**What exists now:**
- 3-chapter navigation (Sara's Boutique, B&T Wholesale, Fresh Corner Market)
- Left: context badge + product list
- Right: Decision Card or JSON payload
- Insight + RetailAgentOS outcome panels

**What changes:**
- Page entry framing: "See how this would work for your type of business"
- After Chapter 3 completion: stronger CTA → `/for-merchants` ("This is how it would work for your store. Ready to find out?")
- Outcome panels: link or prompt toward the audit/services path for merchants who finish the demo

**Files touched:** `src/app/guided/page.tsx`

---

## What does NOT change

- All mock data (`src/lib/mock/`) — no changes
- All rules logic (`src/lib/rules/`) — no changes
- All types (`src/lib/types/`) — no changes
- `DecisionCard`, `JsonViewer`, `Panel`, `Badge` components — no changes
- `ViewContext` — no changes
- `src/app/home/page.tsx` — kept as-is for reference
- Pre-existing lint errors — left untouched (pre-date this session)

---

## Build order

| # | Change | Why first |
|---|--------|-----------|
| 1 | `/for-merchants` page | New page, no dependencies, highest brief priority |
| 2 | Navigation (add For Merchants link) | Depends on the page existing |
| 3 | Homepage (messaging + services teaser) | References `/for-merchants` |
| 4 | Architecture page (merchant summary + Layer 4) | Self-contained |
| 5 | Vision page (roadmap reframe) | Self-contained |
| 6 | Guided Demo (CTA to for-merchants) | References `/for-merchants` |
| 7 | Playground (messaging only) | Smallest change, last |
| 8 | Merchant Profile (descriptor + business mode) | After reading current state |

---

## Open questions (do not build until answered)

1. **Contact / conversion CTA on `/for-merchants`**: Static "email us" link for now, or a simple form? If a form, does it need to actually submit anywhere?
2. **Merchant Profile page**: Need to read the current file to confirm what's there before planning the change.
3. **"For Merchants" nav label**: The brief also suggested "Get Visible to Agents" as an alternative. Which label do you prefer?
