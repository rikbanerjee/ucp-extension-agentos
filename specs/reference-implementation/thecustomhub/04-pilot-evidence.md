# TheCustomHub Pilot — Evidence Intake & Completion Checklist

**Created:** 2026-08-01. **Status:** ⬜ OPEN — audited 2026-08-01, **Q2 not closeable**. See §7.

**Purpose:** Track B's engineering happens in the **thecustomhub** repo. This file is the
*intake point* in the kit repo — the single place where the artifacts proving Track B landed
must arrive. Until every ⬜ below is filled, `specs/BUILD-PLAN.md` Q2 stays open and no
"a real agent completed a real purchase" claim may be published anywhere
(claim-discipline rule, `../../../EVIDENCE-PLAN.md` §5).

**Why this file exists:** as of 2026-08-01 there was no defined landing place for pilot
evidence, which made "is the pilot done?" unanswerable from this repo. Now it's answerable:
if this file still has open boxes, it isn't done.

---

## 0. Two naming bugs, resolved here

Prior docs used **"B6" for two different things**. Canonical from now on:

| Label | Meaning | Where defined |
|---|---|---|
| **B6-feature** | Custom / bulk intent capture (the `callForPrice` → quote-request flow) | `TRACK-B-FOR-THECUSTOMHUB.md` § B6 |
| **B7-evidence** | Before/after failure-rate metric + verbatim transcripts | `../README.md` § Done-for-pilot, `../../../PUNCH-LIST.md` P0.1 |

And the two docs disagreed on the completion bar. **Canonical bar (this file wins):**

- **Pilot complete (Q2 closes)** = B0–B5 shipped **+ B7-evidence captured**.
- **B6-feature is a follow-on**, tracked separately. It is the differentiator and it is
  strongly wanted, but it does not gate Q2. Ship it as a second write-up.

---

## 1. ⚠️ Do this before anything else — the baseline is perishable

The headline number requires measuring the **unmodified** store. Once B1–B5 are deployed to
production, the "before" state is unrecoverable except from git history.

- ⬜ **Confirm baseline is still capturable.** If Track B changes are already live on
  thecustomhub, stand up a staging deploy from the last pre-RAOS commit and measure against
  that. Record the commit SHA here: `__________`
- ⬜ If the baseline is genuinely unrecoverable, say so explicitly in §4 rather than quietly
  publishing an "after" number with no "before." A one-sided number is not a benchmark.

---

## 2. Engineering steps — status from the merchant repo

Fill in per step. "Evidence" means something checkable, not an assertion.

| Step | What | Status | Evidence to paste/link |
|---|---|---|---|
| B0 | `@retailagentos/engine` installed from tarball | ⬜ | pinned version in thecustomhub `package.json`; output of the `typeof evaluateOffer` check |
| B1 | `products.json` extended (`callForPrice`, `leadTimeDays`, `shipsTo`); null variant rows stripped | ⬜ | before/after variant counts |
| B2 | `CustomHubAdapter` implemented | ⬜ | `listVariants()` count; the guest-in-CA eligible / guest-in-GB `REGION_RESTRICTED` test output |
| B3 | `/.well-known/ucp` served live | ⬜ | `curl https://thecustomhub.com/.well-known/ucp` raw response |
| B4 | schema.org `Product`/`Offer` JSON-LD served without running the SPA | ⬜ | `curl` of a product URL + structured-data validator result |
| B5 | Cloud Run MCP server live (`evaluateOffer`, `issueQuote`, Stripe handoff) | ⬜ | endpoint URL + Claude Desktop connection config |
| B6-feature | Custom/bulk intent capture *(follow-on — does not gate Q2)* | ⬜ | structured quote-request artifact |

**Engine version pinned in the pilot:** `__________`
(If it drifted from `packages/engine` v0.1.0, note why — the tarball must be rebuilt and
reinstalled whenever kit source changes.)

---

## 3. B7-evidence — the artifacts that must land in *this* repo

These are the deliverables that turn the pilot from a working demo into a citable benchmark.
Raw files go in `./evidence/`; the narrative write-up goes in `./05-pilot-results.md`.

- ⬜ **The agent task set** — the exact list of N tasks, written down *before* running either
  pass. Save as `./evidence/task-set.md`.
- ⬜ **Before results** — pass/fail per task against the unmodified store, with the failure
  mode for each (dead-end cart / wrong quote / silent no-match).
  Save as `./evidence/results-before.md`.
- ⬜ **After results** — identical task set, post-Track-B. Save as `./evidence/results-after.md`.
- ⬜ **Positive transcript, verbatim** — Claude Desktop connects → finds a product shipping to
  Canada under $X → quotes → completes Stripe checkout. Not a summary; the actual transcript.
  Save as `./evidence/transcript-positive.md`.
- ⬜ **Negative transcript, verbatim** — an out-of-region or out-of-stock item is **declined
  with a reason**, not a failed checkout. Save as `./evidence/transcript-negative.md`.
- ⬜ **US *and* CA shopper both covered** across the transcripts (the done-for-pilot definition
  requires both, not just one).

**Headline number, once both passes are in:** agents completed `___/N` on the unmodified
store; `___/N` with the reasoning layer.

---

## 4. Write-up

- ⬜ `./05-pilot-results.md` created — what shipped, the headline number, links to every
  artifact in `./evidence/`, and an honest section on what didn't work.
- ⬜ **Spec gaps raised, not silently patched.** Per the boundary rule in `../README.md`: if
  the integration exposed a gap in a spec (as the region allowlist did in
  `02-spine-design.md` §4), file it as an Open Question on the spec itself and link it here.
  Gaps found: `__________`

---

## 5. Propagation — files to update once §1–§4 are complete

Do not mark Q2 done until all five land. One home per fact.

- ⬜ `../../../VERIFICATION-NEEDED.md` §1 — add the pilot checks as *actually run*, with
  commands and raw output. This is the only place status is authoritative.
- ⬜ `../../../VERIFICATION-NEEDED.md` §2 — resolve the two open pilot items: the
  "MCP equivalence — not applicable yet" note, and the unverified "Track A is done" claim
  (re-check A1–A4 line by line while you're in there).
- ⬜ `../README.md` § Status — replace *"Track B … is the pending work"* with the result.
- ⬜ `../../BUILD-PLAN.md` — move Q2 from §3 to §1; advance the affected specs to **S4 · Proven**
  on the §5 maturity ladder.
- ⬜ `../../README.md` — the catalog's per-spec status rows, if the pilot changes any.

---

## 7. Audit result — 2026-08-01

Run per [`VERIFY-TRACK-B.md`](./VERIFY-TRACK-B.md) in the thecustomhub repo. Full report and a
7-file evidence bundle live at `docs/retailagentos/audit-2026-08-01/` in that repo, pending
copy into `./evidence/`.

**Verdict: Q2 CLOSEABLE = no.** Headline number **0/10 before → 7/10 after** (audit re-score;
tasks #3 and #10 correctly excluded as B6 scope). B0–B4 substantively landed. B5 is live but
**never verified end-to-end against production**.

The audit's most important finding is not on its own list: **two of the six blockers are
defects in the kit, not in the merchant integration.** They are logged as spec Open Questions
in §8 per the boundary rule in [`../README.md`](../README.md), not patched merchant-side.

| # | Finding | Owner | Sev |
|---|---|---|---|
| 5 | Live product JSON-LD advertises `compareAtPrice` as the `Offer` price (adapter: `basePrice: variant.compareAtPrice ?? variant.price`) — agents are being quoted pre-discount prices **in production right now** | thecustomhub | **P0** |
| 1 | Deployed `raos-mcp` has one revision (2026-07-07), never redeployed; baked-in catalog is 17 commits stale. Proved live: `find_product("Tryout")` returns `[]` for a product present since 2026-07-11 | thecustomhub | **P0** |
| 3 | `buildManifest()` drops `endpoints`; `servesRegions` is not on `MerchantProfile` at all → **Tier 0 "Discoverable" claim is broken** | **kit** | **P0** |
| 2 | Region gating lives only in `raos-mcp-server/server.js`, not the engine → TRACK-B's B2 acceptance line is wrong, and a blocking safety rule sits outside the single decision implementation | **kit** | P1 |
| 4 | `after.md` headline internally inconsistent (prose 7/10, table implies 8/10); was never self-consistent | thecustomhub | P1 |
| 6 | Positive purchase-path evidence covers a **CA shopper only**; no US positive transcript exists. The done-for-pilot bar requires both | thecustomhub | P1 |

**Fix order — #5 before #1.** Redeploying first (#1) promotes the price bug from "stale catalog"
to "current catalog serving wrong prices." Ship the adapter fix, then redeploy once.

**Remaining to close Q2:** #1, #5, #6 land; #4 restated to the audit's 7/10; then re-run the B5
acceptance against the **deployed** service, including the MCP equivalence check. #2 and #3 are
kit work and should land before the redeploy so the manifest is fixed in the same pass.

**B6 (custom/bulk intent capture) remains out of scope for Q2** and is confirmed not started —
no product sets `callForPrice: true`. Note commit `92586c7` ("B6 post-integration evidence") is
misnamed: it documents B0–B5 before/after state, not B6.

---

## 8. Spec Open Questions raised by this pilot

Per the boundary rule: gaps found during integration are raised on the spec, never special-cased
in the merchant repo. Both are now **RESOLVED (2026-08-01)** — landed in the kit, no longer
blocking Q2b. (Q2 itself remains open pending Phase 1/4 merchant-side work — see
`RUNBOOK-CLOSE-Q2.md`.)

### OQ-1 · RAOS-0000 — the manifest projection is lossy `(P0)` — ✅ RESOLVED 2026-08-01
`UcpManifest` (`src/lib/types/core.ts:37`) carries only `protocol`, `tier`, `capabilities[]`,
`keys?`. `MerchantProfile.endpoints` exists but `buildManifest()` is a pass-through
(`return profile.manifest`) and discards it. `servesRegions` exists on **neither** type, yet
`TRACK-B-FOR-THECUSTOMHUB.md` §B2 instructs the merchant to set it on `merchantProfile()`.

*Consequence:* an agent reading a conformant RAOS manifest cannot locate the catalog, cart, or
checkout endpoint, and cannot tell which regions the merchant serves. Tier 0 "an agent can find
and correctly read my catalog" is not actually achievable as specified.

*Question to resolve:* does `endpoints` belong on `UcpManifest` (and `buildManifest` project it),
or does the discovery response compose profile + manifest at the handler? Decide, then fix the
type, the projection, the snapshot test, and the TRACK-B brief together.

**Resolution (2026-08-01):** `endpoints` and `servesRegions` were added to `UcpManifest` itself,
composed by `buildManifest()` (no longer a pass-through) from `MerchantProfile.endpoints` /
`servesRegions`. `buildManifest(profile)` is now sufficient on its own to serve a complete
`/.well-known/ucp` response. Rationale recorded in `specs/0000-foundations.md` §13 Changelog.
Snapshot test, TRACK-B §B3 acceptance line, and the app's own route all updated. Verified live:
local `/.well-known/ucp` now returns `endpoints` for every archetype and `servesRegions` when
declared.

### OQ-2 · RAOS-0001 — allowlist semantics are still deferred `(P1)` — ✅ RESOLVED 2026-08-01
`regionAllowlist.ts` documents by design that "adapters call `checkServesRegion` themselves,"
with the canonical fold into RAOS-0001 deferred and TheCustomHub named as the forcing case.
The pilot has now forced it: region gating exists only because `raos-mcp-server/server.js`
pre-checks manually, so `evaluateOffer` in isolation does **not** block a GB buyer.

*Consequence:* a `BLOCK`-severity safety rule lives outside the one decision implementation.
Any merchant who forgets the pre-check ships a store that will sell into unserved regions —
and the failure is silent.

*Question to resolve:* fold allowlist semantics into `calculateEligibility` (alongside the
existing `restrictedRegions` blocklist path) so `evaluateOffer` is self-sufficient, and correct
the B2 acceptance line. Keep `checkServesRegion` exported for pre-check short-circuiting, but
it must stop being the *only* enforcement point.

**Resolution (2026-08-01):** folded into `evaluateOffer` (`src/lib/extensions/pipeline.ts`) as a
merchant-level short-circuit — NOT into `calculateEligibility`, since `servesRegions` is a
merchant-level invariant, not a per-variant rule (see `specs/0001-eligibility.md` §9.6 for the
full fork write-up and rationale). `MerchantProfile.servesRegions` is now a **required** field;
the runtime three-state handling (populated / `[]` / `undefined`) remains the backstop for
JS/JSON callers types can't reach, surfaced via the new `REGION_POLICY_UNDECLARED` (`INFO`)
reason attached once at manifest-build time. `checkServesRegion` stays exported as a valid
pre-check, no longer the only enforcement point. Verified by direct engine call — no pre-check,
no server wrapper — `evaluateOffer` alone returns `REGION_RESTRICTED` for a GB buyer against a
`servesRegions: ['US','CA']` merchant. B2 acceptance line corrected in
`TRACK-B-FOR-THECUSTOMHUB.md`. New fixtures (`guest/US` eligible, `guest/CA` eligible,
`guest/GB` blocked, plus `[]`/`undefined` edge cases) assert against `evaluateOffer` directly,
per the audit's own point that isolation testing is what let this hide for a month.

---

## 6. What "complete" unlocks

Closing Q2 is the gate for most of the remaining plan:

- **Q5 upstream contribution** — the pilot's failure-rate evidence is the admission ticket for
  filing RAOS-0001 and RAOS-0007 as UCP extension proposals. Without it there's nothing to file.
- **Q8 platform adapter** — one proven integration is the template for the Shopify app.
- **Q10 generalized remote MCP server** — generalizes the remote/server transport this pilot builds first.

Everything above the S3 line on the maturity ladder is downstream of this one file being full.
