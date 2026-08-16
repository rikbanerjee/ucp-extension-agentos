# RetailAgentOS — Wiki (start here)

This is the plain-language front door to the project — for humans and for coding agents
picking up work. The RFC files in `specs/00NN-*.md` remain the authoritative, detailed
specs (reason codes, algorithms, worked examples). This page and `specs/wiki/*.md` exist
because the RFCs are dense; **this is the map, not the territory.**

The four documents this map routes to (one job each, no overlap):

| Job | Document |
|---|---|
| Integrate a real store (the reference architecture) | [`ADOPTION-GUIDE.md`](./ADOPTION-GUIDE.md) |
| The spec catalog, by tier, with status | [`README.md`](./README.md) |
| Build the next thing (execution queue for coding agents) | [`BUILD-PLAN.md`](./BUILD-PLAN.md) |
| What's verified real vs. asserted | [`../VERIFICATION-NEEDED.md`](../VERIFICATION-NEEDED.md) |

---

## 1. The one thing to understand first: where UCP ends and RAOS begins

**UCP (Universal Commerce Protocol)** gives commerce its *rails*: how an agent discovers a
merchant, reads a catalog, builds a cart, and hands off to checkout. UCP does not know
*why* a decision was made — it doesn't carry a merchant's reasoning about who may buy what,
at what price, under what conditions.

That reasoning today lives deep in a merchant's backend and only fires at checkout —
after an agent has already recommended, priced, and cart-built something that then fails.
**RetailAgentOS (RAOS) is the reasoning layer that sits on top of UCP**, moving that
reasoning from checkout-time to catalog-time, as machine-readable contracts with attached
reasons.

| | Core UCP | RetailAgentOS extensions |
|---|---|---|
| Owns | discovery, catalog shape, cart, checkout handoff | *why* a product is visible, buyable, priced, in stock, quoted, trusted |
| Namespace | UCP core fields | `com.os.retailagent.shopping.*` |
| Shape | `/.well-known/ucp` profile, endpoints, capability list | one evaluator per concern, registered into a fixed pipeline |
| Analogy | the road and the traffic laws | the store manager's judgment about this specific customer |

Every spec in this project answers exactly one merchant-reasoning question. If a spec
doesn't map to a question an agent needs answered *before* checkout, it doesn't belong here.

---

## 2. The five-stage pipeline (how every spec fits together)

Every extension is a pure, deterministic evaluator registered into one of five fixed
stages. An agent's request runs through all five in order; each stage can only make things
*more* restrictive, never reorder itself:

```
VISIBILITY  →  ELIGIBILITY  →  FEASIBILITY  →  PRICE  →  FULFILLMENT  →  QUOTE
(can they    (can they buy    (what do   (can it get      (is the price
 see it?)     it, and why     they pay,   to them?)         locked?)
              not?)           and why?)
```

Full architecture detail: [`ARCH-UCP-EXTENSION-MCP.md`](./ARCH-UCP-EXTENSION-MCP.md).
The short version: **one pipeline, one source of truth.** The Playground, the spec pages,
and any future MCP tool all call the same evaluators — nothing re-implements a decision.

---

## 3. Conformance tiers — how much of this a merchant needs

Not every merchant needs every spec on day one. The conformance ladder describes
*merchant implementation maturity*, and it is intentionally cumulative — a one-person
boutique can stop at Tier 1 and already be agent-safe.

| Tier | Name | The merchant can say... | Who this is for |
|---|---|---|---|
| 0 | Discoverable | "An agent can find and correctly read my catalog." | Any store |
| 1 | Qualified | "No dead-end carts — only eligible, in-stock items surface." | Boutique |
| 2 | Priced | "The right price per buyer, and it's honored at checkout." | Wholesale |
| 3 | Member-aware | "I support member/loyalty-aware pricing and earn preview." | Grocery |
| 4 | Assisted | "Full commerce — fulfillment, handoff, intent, returns." | Grocery chain |

A merchant's buyer-facing loyalty tier (gold/silver/guest) is a **separate, unrelated
concept** — a claim about a specific shopper, owned by RAOS-0009. Don't confuse the two.
The tier-by-tier adoption path (what to implement at each rung) lives in
[`ADOPTION-GUIDE.md`](./ADOPTION-GUIDE.md); the per-tier spec catalog lives in
[`README.md`](./README.md).

---

## 4. Built vs. planned

The authoritative per-spec status table is [`README.md`](./README.md) (kept current as
work lands); the verified-vs-asserted line is [`../VERIFICATION-NEEDED.md`](../VERIFICATION-NEEDED.md).
Summary as of 2026-07-04:

- **Built, tested, wired into the Playground:** 0000 (foundations), 0001 (eligibility),
  0002 (contextual pricing), 0003 (fulfillment feasibility — added 2026-08-12, promoted
  Tier 4 → Tier 1), 0005 (inventory), 0007 (quote integrity), 0008 (trust/
  provenance), 0013 pt 1 (three-audience decision trace). Each has a plain-language page
  under [`wiki/`](./wiki/).
- **Planned, each with a problem statement + task list** under
  [`wiki/pending/`](./wiki/pending/): 0004, 0006, 0009, 0010, 0011, 0012, 0013 pt 2,
  0014, 0015. Build order: [`BUILD-PLAN.md`](./BUILD-PLAN.md).
- **Explicitly V2:** multi-currency/i18n, cross-merchant cart (`TODO.md`).

---

## 5. Where the reference implementation lives

Everything above is a *spec* — a description of a contract. The working code that proves
each spec is real lives in `src/lib/` (rules + extensions + types) and is packaged for
external reuse as `@retailagentos/engine`. A concrete pilot applying that engine to a real
merchant (TheCustomHub) lives alongside it. Both are documented in one place:
[`reference-implementation/README.md`](./reference-implementation/README.md).

Three app surfaces worth knowing about beyond the Playground (`/demo`):

- **`src/app/sandbox/reference/`** — the per-spec **cookbook**: one runnable recipe file per
  built spec (`recipes/0000-foundations.ts` … `recipes/0013-trace.ts`). The best
  example-driven way to learn a spec's API.
- **`src/app/aeo-score/`** — the agent-readiness score/audit tool (EVIDENCE-PLAN E7).
- **`src/app/sandbox/retail-agent-os/`** — a "Story-mode" simulated agent chat. ⚠️ This is a
  *narrative* demo: its `agent-brain.ts` does **not** call the real pipeline and uses its own
  mock logic. Never cite it as pipeline behavior, and don't extend it with decision logic —
  if it needs real decisions, wire it to `evaluateOffer`.

---

## 6. How to use this wiki if you're picking up work

1. Read this file (you just did).
2. If you're touching a **built** spec: read its `wiki/00NN-*.md` page for intent, then the
   RFC (`specs/00NN-*.md`) for the exact contract, then the code it links to.
3. If you're building a **pending** spec: check [`BUILD-PLAN.md`](./BUILD-PLAN.md) for
   whether it's actually next, then read its `wiki/pending/00NN-*.md` brief.
4. If you're wiring up a real merchant: read [`ADOPTION-GUIDE.md`](./ADOPTION-GUIDE.md),
   not the specs.
5. Never invent a new "core" concept inside a spec wiki page — if something feels like it
   should live in every spec, it belongs in RAOS-0000, not repeated ad hoc.
6. Before trusting or publishing any status number, check
   [`../VERIFICATION-NEEDED.md`](../VERIFICATION-NEEDED.md) — it is the only place status
   facts live; every other doc points here.
