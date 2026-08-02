# Runbook — closing Q2 (TheCustomHub pilot)

**Created:** 2026-08-01, after the Track B audit. **Status:** ⬜ not started.

Sequential operating plan across **two repos**, with **every agent prompt embedded inline** so
the right one gets sent at the right time. Track 1 = `thecustomhub`. Track 2 = the kit (this
repo). They start **in parallel today** and converge at Checkpoint B.

Source of truth for findings: [`04-pilot-evidence.md`](./04-pilot-evidence.md) §7–§8.
Verification method: [`VERIFY-TRACK-B.md`](./VERIFY-TRACK-B.md).

**Prompt index — send in this order, never out of it:**

| # | Repo | Purpose | Blocked by |
|---|---|---|---|
| [P1](#prompt-1) | thecustomhub | Stop the live price bug; commit the audit | — |
| [P2](#prompt-2) | kit | Fix the manifest; open the region-policy fork | — |
| [P3](#prompt-3) | kit | Implement the fork decision; ship engine 0.2.0 | Checkpoint A |
| [P4](#prompt-4) | thecustomhub | One redeploy; verify in production | Checkpoint B |
| [P5](#prompt-5) | kit | Write up the pilot; close Q2 | Phase 4 gate |

> **Why parallel is safe.** P1 touches the adapter, docs, and the JSON-LD surface. P2 touches
> `src/lib/types/core.ts`, `projections/manifest.ts`, `rules/eligibility.ts`. No overlap. And
> once the engine enforces the allowlist, the pilot's manual pre-check becomes *redundant*, not
> conflicting — both emit `REGION_RESTRICTED`, so there's no window where they disagree.

---

## Phase 1 · Track 1 — thecustomhub, unblocked work

**What this does:** stops production from quoting agents the wrong prices, gets the audit into
version control, and documents the deployed MCP server. **Deliberately excludes the redeploy** —
step 3 ships only the JSON-LD surface. Redeploying `raos-mcp` now would promote the price bug
from "stale catalog" to "current catalog with wrong prices."

**Why it's first:** finding #5 is live and wrong right now. Everything else can wait; this can't.

<a id="prompt-1"></a>
### PROMPT 1 → thecustomhub agent

```
Act on the findings from the 2026-08-01 Track B audit you produced. The full triage lives in
the RetailAgentOS kit repo at
specs/reference-implementation/thecustomhub/04-pilot-evidence.md §7–§8.

CONTEXT — two of the six blockers are NOT yours to fix.
Findings #2 (region gating outside the engine) and #3 (buildManifest drops endpoints /
servesRegions) are defects in @retailagentos/engine. They are logged upstream as spec Open
Questions OQ-2 and OQ-1 and are being fixed in the kit right now, in parallel with this work.
Do not patch either one locally. Do not add a workaround. Do not special-case engine behavior
in this repo — that violates the boundary rule and is what produced the drift in the first
place.

This task is steps 1-5 only. Steps 6-10 (tarball reinstall, pre-check removal, Cloud Run
redeploy, production acceptance) are a SEPARATE later task that depends on the kit shipping
engine 0.2.0. Do not start them. Do not redeploy raos-mcp.

1. Commit the audit bundle.
   docs/retailagentos/audit-2026-08-01/ is currently untracked. Untracked evidence is how the
   stale-deploy drift went unnoticed for 17 commits. Commit VERDICT.md and all 7 evidence/
   files as-is. Do not edit them to look better — the audit's value is that it is unflattering.
   The commit message should say it is an audit finding 6 blockers, not a status update.

2. Fix finding #5 — the live price bug. P0, wrong in production right now.
   The adapter maps basePrice: variant.compareAtPrice ?? variant.price, so live product JSON-LD
   advertises the pre-discount price as the Offer price. Agents are being quoted prices higher
   than the real ones.
   - basePrice must be variant.price. compareAtPrice is the promo baseline / "was $X" reference
     and belongs in the applied-offer path, not the Offer price.
   - Grep for any other use of compareAtPrice that may have inherited the same confusion.
   - Report how many products are affected and by how much.

3. Deploy ONLY the JSON-LD surface.
   The wrong prices are live; fixing them should not wait on the kit. Deploy whatever
   prerender / Cloud Function serves product JSON-LD. HOLD the raos-mcp Cloud Run redeploy.
   Re-curl a product URL after deploying and paste the corrected Offer price as proof.

4. Fix finding #4 — the inconsistent headline number.
   docs/retailagentos/evidence/after.md says 7/10 in prose while its own table implies 8/10.
   Restate to the audit's re-score: 0/10 before, 7/10 after, with tasks #3 and #10 excluded as
   B6 scope and the exclusion stated explicitly. Make the table and the prose agree. Add a line
   noting the number was corrected by the 2026-08-01 audit.

5. Document raos-mcp in CLAUDE.md.
   CLAUDE.md currently documents only the unrelated mcp-server/ (inventory). Add a section for
   the deployed raos-mcp Cloud Run service: what it is, its URL, its region, how it differs
   from mcp-server/, and the Claude Desktop config shape needed to connect. State explicitly
   that its catalog is baked in at deploy time and must be redeployed whenever products.json
   changes — that is the exact failure this audit found.

DO NOT
- Do not build B6 (custom/bulk intent capture). It does not gate Q2. Do not mark any SKU
  callForPrice: true.
- Do not fix the empty sameAs in the Organization JSON-LD. Unrelated to RAOS, tracked
  separately.
- Do not touch or enrich JSON-LD beyond the #5 price fix. A prior pass enriched it during a
  status check, which is how evidence went stale mid-audit.
- Do not re-run or regenerate the before/after evidence to make it match. #4 is a restatement
  of the existing number, not a new measurement.
- Do not push without showing me the diff first.

REPORT BACK with: the diff for #2, the corrected live Offer price curl, the affected-product
count, and confirmation that the raos-mcp redeploy has NOT been done.
```

**Gate out of Phase 1:** a fresh `curl` of a product URL showing the corrected `Offer` price.
If prices are still wrong, stop — nothing downstream matters.

---

## Phase 2 · Track 2 — kit, OQ-1 and the fork write-up

**What this does:** fixes the manifest projection so a RAOS manifest is actually usable by an
agent (OQ-1), and makes the agent write up the region-policy design fork **without implementing
it** (OQ-2).

**Why the split:** OQ-1 has one correct answer and can just be built. OQ-2 contains a genuine
fork between two of the project's own standing rules — the resolution sets default behavior for
every future adopter, so it's your call, not the agent's.

<a id="prompt-2"></a>
### PROMPT 2 → kit agent

```
Fix the two kit defects surfaced by the 2026-08-01 TheCustomHub Track B audit. They are logged
as OQ-1 and OQ-2 in specs/reference-implementation/thecustomhub/04-pilot-evidence.md §8, and
queued as Q2b in specs/BUILD-PLAN.md. Both block closing Q2.

Read first: AGENTS.md, specs/0000-foundations.md §4–§9, specs/BUILD-PLAN.md §2 (the
non-negotiable rules), and 04-pilot-evidence.md §7–§8. This is Next.js 16 — check
node_modules/next/dist/docs/ before touching any route.

Standing rules that apply to both: determinism (no Date.now / Math.random / fetch inside
src/lib/rules|extensions|trace — grep your diff); most-restrictive default on unknown or
missing context; additive-only reason codes; npm test green and npm run build passing.

--------------------------------------------------------------------
OQ-1 (P0) — RAOS-0000: the manifest projection is lossy. IMPLEMENT THIS.
--------------------------------------------------------------------
Today UcpManifest (src/lib/types/core.ts:37) carries only protocol, tier, capabilities[],
keys?. MerchantProfile.endpoints exists but buildManifest() is a pass-through
(return profile.manifest) that drops it. servesRegions exists on neither type — yet
specs/reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md §B2 instructs merchants
to set it on merchantProfile().

Consequence, proved live against thecustomhub.com/.well-known/ucp: an agent reading a
conformant RAOS manifest cannot locate the catalog, cart, or checkout endpoint, and cannot tell
which regions the merchant serves. Tier 0 — "an agent can find and correctly read my catalog" —
is not achievable as currently specified. This is the headline conformance claim of the suite.

Fix, as one coherent change:
- Add endpoints and servesRegions to the manifest surface. Decide deliberately whether they
  belong on UcpManifest itself or are composed at the discovery handler, and write the rationale
  into the RAOS-0000 changelog. Whichever you choose, buildManifest(profile) must be sufficient
  on its own — a caller holding only its return value must be able to serve a complete
  /.well-known/ucp response. That is the entire architectural point of the projection existing.
- Add servesRegions: string[] to MerchantProfile.
- Update buildManifest in src/lib/projections/manifest.ts, and correct its doc comment — it
  currently describes itself as "a deliberate pass-through," which is the defect.
- Update the projections snapshot test and any fixture profiles.
- Update the app's own /.well-known/ucp route so the reference implementation serves the
  corrected shape.
- Correct the B3 acceptance line in TRACK-B-FOR-THECUSTOMHUB.md.

--------------------------------------------------------------------
OQ-2 (P1) — RAOS-0001: fold allowlist semantics into the engine. DO NOT IMPLEMENT YET.
--------------------------------------------------------------------
regionAllowlist.ts documents by design that "adapters call checkServesRegion themselves," with
the canonical fold into RAOS-0001 deferred and TheCustomHub named as the forcing case. The pilot
has now forced it. The audit proved by direct engine call that evaluateOffer in isolation does
NOT block a GB buyer — region gating exists only because the pilot's raos-mcp-server/server.js
pre-checks manually.

Consequence: a BLOCK-severity safety rule lives outside the single decision implementation. Any
merchant who forgets the pre-check ships a store that sells into unserved regions, and the
failure is silent. TRACK-B's own B2 acceptance line asserts behavior the engine does not have.

The intended fix (for context — do not write it yet): fold allowlist evaluation into
calculateEligibility alongside the existing restrictedRegions blocklist path, reusing the
existing REGION_RESTRICTED code; keep checkServesRegion exported for cheap short-circuiting but
stop it being the ONLY enforcement point; add fixtures asserted against evaluateOffer rather
than checkServesRegion in isolation.

DISCUSS BEFORE IMPLEMENTING — the servesRegions-absent fork

What should calculateEligibility do when servesRegions is absent from a profile?

Do not implement your first instinct. Write up the fork, then stop and wait for me.

Note that BUILD-PLAN.md §2.3's "most-restrictive default on unknown/missing/untrusted *context*"
is scoped to BuyerContext. Whether a merchant's own unset config field falls under that rule is
itself part of what we're deciding. Don't treat it as settled.

Cover at minimum:
  - Blocking all regions when undeclared (literal most-restrictive reading)
  - Not enforcing when undeclared, blocklist path unchanged (backwards compatible)
  - Distinguishing undeclared (undefined) from declared-empty ([]), with undeclared handled as
    a loud-but-non-blocking state — e.g. a new INFO-severity REGION_POLICY_UNDECLARED plus a
    Tier 1 conformance requirement to declare it

For each: what breaks in the existing 328 tests and golden fixtures, what a merchant who forgets
to declare actually ships, whether it satisfies the additive-only reason-code rule, and how it
interacts with OQ-1 once servesRegions is visible on the manifest.

Then give me your recommendation and the reasoning. I have a working position and I want to test
it against yours, so argue for what you actually think is right — if you disagree with the third
option, say so and say why. Agreement you don't hold is worthless to me here.

Also give me your read on this sub-question: if we go with an undeclared-state reason code,
should it be emitted per-evaluation (visible where decisions happen, but adds trace noise on
every call) or once at manifest-build / profile-validation time (cleaner, easier to ignore)?
You have the reasonCodeCoverage helper and the trace format in front of you; I don't.

--------------------------------------------------------------------
DO NOT
--------------------------------------------------------------------
- Do not touch trust.ts / the simulated crypto seam. That is Q3, a separate task.
- Do not start any other spec WP. Q6+ is blocked while Q2 is open.
- Do not do site or positioning work. That is SITE-PLAN.md, a different queue — mixing them is
  how the last ten commits went to homepage copy while the pilot sat broken.
- Do not renumber or rename specs.
- Do not bump the engine version or rebuild the tarball yet. That happens after OQ-2 lands.
- Do not push. Report the diff first.

REPORT BACK with: the OQ-1 diff, local /.well-known/ucp output showing endpoints and
servesRegions, full test/tsc/build output, and the OQ-2 fork write-up with your recommendation.
```

**Gate out of Phase 2:** local `/.well-known/ucp` returns `endpoints` and `servesRegions`. Tests
green, `tsc` clean, `build` passing.

---

## ⛳ CHECKPOINT A — your decision (blocks Track 2 only)

The fork recommendation lands. **You decide.** Track 1 keeps moving regardless.

Test the recommendation against these; don't accept an answer that dodges them:

- Does it treat §2.3's "most-restrictive default" as covering a merchant's own unset config
  field? That scoping is arguable, not settled — an agent that assumes otherwise hasn't done
  the work.
- Does it distinguish **undeclared** (`undefined`) from **declared-empty** (`[]`)? Collapsing
  those is the most common wrong answer.
- Does it target **silence** or **permissiveness**? The audit's actual defect was that a
  merchant who forgot the pre-check shipped a worldwide-selling store and *nothing said so*.
- How many of the 328 tests break? A large fraction means it violates the additive-only rule.
- Does it compose with OQ-1 — once `servesRegions` is on the manifest, does an agent see the
  undeclared state at discovery time?

**My position, for you to test theirs against:** three states. Non-empty = enforced.
`[]` = declared-empty, honored literally, block all. `undefined` = undeclared → don't block,
emit INFO-severity `REGION_POLICY_UNDECLARED`, and make declaring it a **Tier 1 conformance
requirement**. This targets silence rather than permissiveness, is additive so nothing breaks,
and uses the conformance ladder you already built as the enforcement mechanism.

Record the resolution in `specs/0001-eligibility.md` either way. A fork this load-bearing
should not be discoverable only from a git diff.

---

## Phase 3 · Track 2 — kit, OQ-2 and release

**What this does:** implements whatever you decided at Checkpoint A, then cuts engine 0.2.0 so
Track 1 can unblock.

<a id="prompt-3"></a>
### PROMPT 3 → kit agent (same session as Prompt 2)

```
Decision on the servesRegions-absent fork: <PASTE YOUR DECISION AND ONE-LINE RATIONALE HERE>.

Implement OQ-2 on that basis, then cut the release.

1. Fold allowlist evaluation into calculateEligibility (src/lib/rules/eligibility.ts) alongside
   the existing restrictedRegions blocklist path, reading servesRegions from the merchant
   profile per the decision above.
2. Reuse the existing REGION_RESTRICTED reason code. Do not add a new blocking code. (If the
   decision calls for an undeclared-state code, that one is INFO severity and additive.)
3. Keep checkServesRegion exported for cheap pre-check short-circuiting. It must stop being the
   ONLY enforcement point; it may remain AN enforcement point.
4. Add fixtures: guest/US eligible, guest/CA eligible, guest/GB REGION_RESTRICTED — asserted
   against evaluateOffer, NOT against checkServesRegion in isolation. Isolation testing is
   exactly what let this defect hide for a month.
5. Correct the B2 acceptance line in TRACK-B-FOR-THECUSTOMHUB.md so it matches real behavior.
6. Record the fork resolution as an Open Question entry in specs/0001-eligibility.md, including
   the option not taken and why.

THEN cut the release:
7. Bump @retailagentos/engine to 0.2.0 — behavior change (evaluateOffer now blocks unserved
   regions) plus manifest shape change. Rebuild: npm run build -w @retailagentos/engine.
8. Golden fixtures regenerate ONLY with a reviewed diff. Show me the diff and explain every
   changed line BEFORE regenerating. Do not regenerate and then explain.
9. Update VERIFICATION-NEEDED.md §1 with actual re-run output (test count, tsc, build). It is
   the only authoritative status source — no other file may claim what it does not.
10. Mark OQ-1 and OQ-2 resolved in 04-pilot-evidence.md §8; move Q2b to §1 of BUILD-PLAN.md.

VERIFY BEFORE REPORTING: a direct engine call — no pre-check, no server wrapper — where
evaluateOffer alone returns REGION_RESTRICTED for a GB buyer. Paste it.

REPORT BACK with: that direct-call output, the golden fixture diff, full test/tsc/build output,
and the new tarball filename. Do not push.
```

**Gate out of Phase 3:** `evaluateOffer` alone blocks GB, demonstrated by direct call.

---

## ⛳ CHECKPOINT B — tarball handoff

Hand `retailagentos-engine-0.2.0.tgz` to Track 1. Convergence point; Track 1 unblocks here.

---

## Phase 4 · Track 1 — thecustomhub, the single redeploy

**What this does:** consumes engine 0.2.0, removes the now-redundant manual pre-check, and
redeploys **once** with both repos' fixes in the same deploy. Then proves the deployed service
works — which has never been done; all prior acceptance was on `localhost:8080`.

**Why one deploy:** deploying before Phase 1 landed would have shipped the price bug into the
current catalog. Deploying between Phase 1 and Checkpoint B would burn a deploy and still leave
the manifest broken.

<a id="prompt-4"></a>
### PROMPT 4 → thecustomhub agent

```
The kit has shipped @retailagentos/engine 0.2.0, resolving OQ-1 (manifest now carries endpoints
and servesRegions) and OQ-2 (the engine now enforces the region allowlist itself). Steps 6-10
from the earlier task are now unblocked. Run them in order.

6. Install @retailagentos/engine@0.2.0 from the new tarball. Pin the exact version in
   package.json. Confirm the import smoke test still passes:
   typeof evaluateOffer, typeof buildManifest → "function function".

7. Remove the manual region pre-check from raos-mcp-server/server.js.
   VERIFY BY DIRECT ENGINE CALL — not through the server, not through the pre-check — that
   evaluateOffer alone now returns REGION_RESTRICTED for a GB buyer. Paste the DecisionRecord.
   If it does not, STOP and report. Do not restore the pre-check as a workaround; that would
   re-hide the defect.

8. Confirm /.well-known/ucp now returns endpoints and servesRegions. If your handler
   hand-assembles the manifest rather than calling buildManifest(adapter.merchantProfile()),
   fix that now — a hand-written manifest silently drifts from the catalog.

9. Redeploy raos-mcp to Cloud Run. ONE deploy, both sides fixed.
   Record the new revision ID and deploy timestamp.

10. Re-run B5 acceptance against the DEPLOYED service. localhost output does not count for any
    of these.
    a. MCP EQUIVALENCE — HARD GATE. Call the deployed evaluateOffer and the in-process
       evaluateOffer from the package with identical inputs INCLUDING the same injected now.
       Results must deep-equal. Paste both and state pass/fail. This has never been run.
    b. find_product("Tryout") returns the product — proves the stale catalog is gone.
    c. Finding #6: a US-shopper positive transcript, verbatim. Current evidence is CA-only and
       the done-for-pilot bar requires both. Full path: finds product → quotes → Stripe
       completes. State whether Stripe was live or test mode.
    d. Negative case still declines with a reason (out-of-region or out-of-stock), not a failed
       checkout. Verbatim.

Then update your evidence bundle in place with the production results, replacing the localhost
captures. Keep the localhost ones in a clearly-labeled superseded/ subfolder — do not delete
them; the fact that acceptance was originally localhost-only is part of the audit record.

DO NOT
- Do not build B6. Still out of scope for Q2.
- Do not redeploy more than once. If you need a second deploy, tell me why first.
- Do not edit the before/after numbers. Phase 1 already restated them.
- Do not push without showing me the diff.

REPORT BACK with: the direct-call GB DecisionRecord, the new revision ID, the equivalence
pass/fail with both outputs, the Tryout result, and both new transcripts.
```

**Gate out of Phase 4:** all four of 10a–10d captured verbatim against production.

---

## Phase 5 — close Q2

**What this does:** moves the evidence into the kit repo, writes the public pilot write-up, and
propagates status to the five files that carry it. Q2 is not closed by a deploy — it's closed by
the evidence landing where the project's status is authoritative.

<a id="prompt-5"></a>
### PROMPT 5 → kit agent

```
TheCustomHub Track B is complete and verified against production. Close Q2.

Source material: the thecustomhub repo's docs/retailagentos/audit-2026-08-01/ bundle, updated
with production results in Phase 4. I will paste or mount it.

1. Copy the evidence bundle into specs/reference-implementation/thecustomhub/evidence/ using
   EXACTLY the filenames listed in 04-pilot-evidence.md §3: task-set.md, results-before.md,
   results-after.md, transcript-positive.md, transcript-negative.md, live-endpoints.md,
   mcp-equivalence.md. If any cannot be produced, create it containing a one-line statement of
   why — an empty-with-reason file is useful; a missing file is indistinguishable from an
   oversight.

2. Write specs/reference-implementation/thecustomhub/05-pilot-results.md:
   - What shipped, B0 through B5.
   - The headline number: 0/10 before, 7/10 after, with the #3/#10 B6 exclusion stated.
   - Links to every artifact in evidence/.
   - An honest section on what did not work. INCLUDE THE AUDIT — six findings, two of them
     defects in our own protocol (OQ-1, OQ-2), found only because someone tried to actually use
     the spec. Do not sand this down. A pilot write-up that finds its own bugs is more credible
     than a clean number, and the fact that nine more draft specs would not have surfaced these
     is the strongest argument this project has for pilots over specification volume.

3. Tick every box in 04-pilot-evidence.md §2, §3, and §4. Set the file's Status line to CLOSED
   with the date.

4. Propagate — all five, per §5. One home per fact:
   - VERIFICATION-NEEDED.md §1: the pilot checks as ACTUALLY RUN, with commands and raw output.
   - VERIFICATION-NEEDED.md §2: resolve the "MCP equivalence — not applicable yet" note and the
     unverified "Track A is done" claim.
   - specs/reference-implementation/README.md § Status: replace "Track B ... is the pending
     work" with the result.
   - specs/BUILD-PLAN.md: move Q2 from §3 to §1. Advance specs 0000, 0001, 0002, 0005, 0007,
     0008 to S4 · Proven on the §5 maturity ladder — but ONLY those actually exercised by the
     pilot. Do not advance a spec the pilot did not touch.
   - specs/README.md: catalog status rows, if any changed.

5. Report which specs you advanced to S4 and your evidence for each. If a spec was not
   exercised by the pilot, say so and leave it at S1.

DO NOT
- Do not publish or draft any external claim yet. That is a separate decision.
- Do not start Q3, Q4, or Q5 in this task.
- Do not overstate. If something is partly verified, VERIFICATION-NEEDED.md says partly.
```

**Q2 is closed when `04-pilot-evidence.md` has no open boxes.** Not before.

---

## Phase 6 — what Q2 unlocks

Do not start any of these while Q2 is open. No prompts here yet — scope them when you get here.

- **Q3 · Real crypto** `(S)` — swap `simulatedSign` (djb2) for HMAC-SHA256 behind the locked
  `trust.ts` interface; flip `trustMode` to `'signed'`. Small task, disproportionate
  credibility return: price-lock is your most defensible claim and reviewers discount it today
  because the signature literally reads `sim:`.
- **Q5 · Upstream filing** `(M)` — file RAOS-0001 and RAOS-0007 as UCP extension proposals with
  pilot evidence attached. Per UCP's CONTRIBUTING, proven adoption is the admission ticket.
  **Attach the audit, not just the 7/10.**
- **Q4 · RAOS-0011** — tax & restricted goods.

---

## Standing hazards, both repos

- **No spec WP (Q6+) starts while Q2 is open.** The last ~10 commits before this audit went to
  homepage copy and founder story while the pilot sat broken and undeployed. That drift is the
  actual failure vector — not spec count.
- **Site work is a different queue** (`SITE-PLAN.md`). Never mix it into a Q2 task.
- **No merchant-side patching of kit defects.** Gaps go upstream as Open Questions. This audit
  exists because that rule works.
- **No "a real agent completed a real purchase" claim** until Phase 5 closes
  (`EVIDENCE-PLAN.md` §5 claim discipline).
- **`raos-mcp` bakes its catalog in at deploy time.** Every `products.json` change needs a
  redeploy. This caused 17 commits of silent drift and will recur — worth a CI check that fails
  when `products.json` changes without a corresponding deploy.
