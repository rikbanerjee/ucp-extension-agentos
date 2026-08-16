# RetailAgentOS — Verification Needed

**Purpose:** every claim across `specs/WIKI.md`, `specs/wiki/**`, `specs/reference-implementation/**`,
`POSITIONING.md`, and `PUNCH-LIST.md` that is either (a) independently confirmed in this pass,
with the exact evidence, or (b) still asserted-but-unverified, with the exact command to check
it. Read this before trusting a status label anywhere else in the docs — and read it **instead
of** re-deriving these facts from the source tree by hand.

**Verified as of:** 2026-07-04, this session, `aarch64` sandbox, Node v22.22.3.

**2026-08-12 refresh (RAOS-0003 · Fulfillment Feasibility, promoted Tier 4 → Tier 1):** new spec
built end-to-end — types, pure reference impl (`src/lib/rules/fulfillment.ts`), a new
`FEASIBILITY` pipeline stage, Playground wiring, spec page, and mock catalog/merchant data. Six
new reason codes; `MerchantProfile.timezone` is now required (same shape of breaking change as
`servesRegions` in 0.2.0) and `BuyerContext.needByDate?` is new. RAOS-0001's
`FULFILLMENT_UNAVAILABLE` is deprecated (no dual-emit, superseded by
`FULFILLMENT_MODE_UNAVAILABLE`) and `REGION_RESTRICTED` is narrowed (variant-level region blocks
now emit the distinct `REGION_NOT_SERVED`) — full write-up in `specs/0001-eligibility.md` §11
v2.0.0 and `specs/0003-fulfillment.md` §11. Engine bumped 0.2.0 → 0.3.0
(`packages/engine/CHANGELOG.md`). §1.1 and §1.2 below are updated in place; the marketing/
build failure in §2 is unchanged (confirmed still pre-existing, not introduced by this pass —
see §1.2's note).

**2026-08-01 refresh (Q2b — OQ-1/OQ-2 kit defects, `specs/BUILD-PLAN.md` §1):** the two kit
defects the Track B pilot audit surfaced (lossy manifest projection; region allowlist
unenforced by `evaluateOffer`) are fixed. `MerchantProfile.servesRegions` is now required — a
breaking change — so the engine was bumped to 0.2.0 and re-tarballed/re-smoke-tested. §1.1,
§1.2, §1.5, and §1.6 below are updated in place with this session's actual re-run output; the
2026-07-04 numbers are preserved as struck-through context. §2 gets a new entry for the
pre-existing, out-of-scope `marketing/` build failure (found, not fixed, this pass).

**2026-07-04 refresh (Q1 hygiene batch, `specs/BUILD-PLAN.md` §3):** the two `tsc` errors and
two `registry.ts` lint errors flagged in the original §1.2/§1.3 below have been fixed
(type-level only; no runtime/golden-fixture changes). All five §1 checks were re-run for real
in this pass, including coverage and the build, which the original pass could not complete.
Results below are updated in place; the original findings are preserved as struck-through
context where useful.

---

## 1. Confirmed by actually running things (not just reading code)

### 1.1 Test suite — ✅ VERIFIED for `src/` · 1 known, documented failure in out-of-scope `marketing/`

**2026-08-12 (RAOS-0003, engine 0.3.0):**
```
npm test   # vitest run --coverage (repo default — includes gitignored marketing/)
Test Files  1 failed | 14 passed (15)
     Tests  1 failed | 361 passed (362)
  Duration  1.70s

npx vitest run --exclude "marketing/**"   # scoped to src/ — this WP's actual scope
Test Files  14 passed (14)
     Tests  352 passed (352)
```
352/352 in `src/` (up from 348 on 2026-08-01, which was itself scoped to `src/` — same
comparison basis). New: `src/lib/rules/__tests__/fulfillment.test.ts` (20 tests — one per
RAOS-0003 reason code, an absent-`needByDate`-never-blocks case, two graceful-degradation
cases, a multi-reason accumulation case, and the ELIGIBILITY-precedence-over-FEASIBILITY case
via `evaluateOffer`). `behaviors.test.ts` net -6 tests: its old
`FULFILLMENT_UNAVAILABLE`/`REGION_RESTRICTED`-for-fulfillmentConstraints describe blocks (10
tests documenting the now-removed pinned dead-path bug) replaced with 3 tests documenting the
migration to RAOS-0003 (a net reduction — those tests moved their real assertions to
`fulfillment.test.ts` rather than duplicating them). `golden.test.ts` gains 2 tests (RAOS-0003
coverage, RAOS-0003 dead-path resolution) and loses none. Golden fixtures regenerated
(`UPDATE_GOLDEN=1`): 1,122 entries (up from 1,034), covering four new mock catalog products
(hazmat/oversize on Wholesale B, lead-time/cutoff on Grocery C) plus the RAOS-0003
`feasibility`/`feasibilityReasons` fields added to every entry.

**The 1 marketing/ failure is a real, DOCUMENTED consequence of this pass's breaking change**,
not a flake: `marketing/partners/parallel/demo/scenario.test.ts` asserts a variant-level
region-restricted item emits `REGION_RESTRICTED` via `evaluateOffer`. Per this WP's migration,
that emission now correctly comes from RAOS-0003's `REGION_NOT_SERVED` instead (see
`specs/0001-eligibility.md` §11 v2.0.0 — `REGION_RESTRICTED` is narrowed to the merchant-level
`servesRegions` gate only). `marketing/` is gitignored (`.gitignore:41`) and explicitly
out-of-scope per this WP's brief ("do not fix it, do not let it block you") — flagged here as a
downstream-consumer heads-up, not fixed in this pass.

<details><summary>2026-08-01 result (superseded)</summary>

```
npm test   # vitest run --coverage
Test Files  14 passed (14)
     Tests  348 passed (348)
  Duration  1.72s
```

348/348, up from 328 (2026-07-04): +14 tests in `src/lib/extensions/__tests__/pipeline.test.ts`
(the RAOS-0001 OQ-2 region-allowlist describe block — guest/US, guest/CA eligible; guest/GB,
declared-`[]`, and undeclared-backstop cases, all asserted against `evaluateOffer` directly per
the audit's own point that isolation testing hid the original defect) + 6 in
`src/lib/projections/__tests__/projections.test.ts` (the RAOS-0000 OQ-1 manifest-composition
tests). Zero golden fixture changes — `golden.test.ts` calls `calculateEligibility` and friends
directly, never `evaluateOffer`/`buildManifest`, so neither the allowlist short-circuit nor the
manifest-build reason code touches it; confirmed by the "every fixture entry matches the
committed golden exactly" test passing unchanged.

<details><summary>2026-07-04 result (superseded)</summary>

```
npx vitest run
Test Files  13 passed (13)
     Tests  328 passed (328)
  Duration  502ms
```

Unchanged from the prior pass (328/328). The two stale historical counts noted before
("~130 test cases" in the original `POSITIONING.md`, "293 tests" in
`specs/reference-implementation/thecustomhub/03-implementation-plan.md`) are still stale
relative to this real count; not re-touched in this pass beyond confirming 328 still holds.

</details>

### 1.2 TypeScript — ✅ clean for `src/` (repo-wide `tsc` has a pre-existing, unrelated `marketing/` failure — see §2)

**2026-08-12 (RAOS-0003, engine 0.3.0):**
```
npx tsc --noEmit -p .
(zero output for everything under src/ and packages/engine/)
marketing/partners/parallel/demo/ingest.ts(245,22): error TS2741 — pre-existing, see §2
```
Same pre-existing `ingest.ts:245` error as 2026-08-01 (identical file/line/message — the
`ReasonEntry.blocking` fixture-literal gap, untouched by this pass). `npm run build`'s
repo-wide type-check step (not scoped to `src/`) surfaces the same error and fails there too —
expected and unchanged from 2026-08-01's documented state (§1.5). `marketing/`'s SECOND
pre-existing error (`scenario.test.ts:43`, an unrelated `MembershipTier` literal typo) is masked
this pass by a NEW, real, DOCUMENTED `scenario.test.ts` test failure at runtime (not a type
error — see §1.1) caused by this WP's `REGION_RESTRICTED` narrowing; both are the same
out-of-scope file.

<details><summary>2026-08-01 result (superseded)</summary>

```
npx tsc --noEmit -p .
(zero output for everything under src/ and packages/engine/)
marketing/partners/parallel/demo/ingest.ts(245,22): error TS2741 — pre-existing, see §2
marketing/partners/parallel/demo/scenario.test.ts(43,3): error TS2322 — pre-existing, see §2
```
Confirmed pre-existing (not introduced this pass) via `git stash -u && npx tsc --noEmit -p .` —
identical errors on the unmodified branch. `marketing/` is gitignored
(`.gitignore:41`) and out of scope for this task. Full detail in §2.

</details>

<details><summary>2026-07-04 result (superseded — repo had no marketing/ tsc errors at that time)</summary>

```
npx tsc --noEmit
(zero output, exit 0)
```

Both errors from the prior pass are fixed:
- `src/lib/extensions/__tests__/pipeline.test.ts:122` — the `TEST_OK` fixture in
  `makeFakeSuccessEvaluator` was missing `severity`. Added `severity: 'INFO'` (consistent with
  `blocking: false`, since `blocking` is `@deprecated` and derives as `severity !== 'INFO'`).
- `src/lib/extensions/__tests__/pipeline.test.ts:293` — `record!.reasons.find(r => ...)` had an
  implicit-`any` `r`. Added `import type { ReasonEntry } from '@/lib/types/reasons'` and typed
  the callback param as `(r: ReasonEntry) => ...`.

Both fixes are type-level only (a fixture literal gaining a field, a callback param gaining a
type annotation) — no evaluator logic, golden fixtures, or runtime behavior changed. `tsc
--noEmit` now exits clean with zero errors.

</details>

### 1.3 ESLint — ✅ `src/lib` now zero errors (repo-wide UI errors unchanged/accepted)

```
npx eslint src/lib
✖ 15 problems (0 errors, 15 warnings)
```

The two `@typescript-eslint/no-explicit-any` errors previously at `src/lib/extensions/
registry.ts:91` are fixed: `manifestSubset()`'s local `result: UcpExtension<any, any>[]` became
`UcpExtension<unknown, unknown>[]`. This is a pure narrowing of an internal local variable's
type from `any` to `unknown` (still a heterogeneous list — `unknown` is the correct
"don't know statically, don't allow silent misuse" type here); the function's declared return
type, the registry's internal `Map<string, UcpExtension<any, any>>`, and all other
already-`eslint-disable`d `any` usages in this file (lines 21, 36, 51, 53, 89) were left
untouched per the task's engine-API-surface-stability constraint. Runtime behavior (which
extensions get returned, in what order) is unchanged — confirmed by `npx vitest run` staying at
328/328 after the fix.

The remaining 15 findings in `src/lib` are pre-existing `@typescript-eslint/no-unused-vars`
**warnings** (not errors) on intentionally-unused destructured params/imports (e.g. `_variant`,
`_htmlContent`) — zero errors, so the stated bar ("zero eslint errors in src/lib") is met.
Repo-wide UI lint errors (`src/app/**`, `src/components/**`) were **not** touched — out of
scope for this batch and still the known/accepted 17 errors from the original pass.

### 1.4 Line coverage % — ✅ VERIFIED (real number, not the stale "96%")

```
npx vitest run --coverage
Statements   : 92.8%  ( 413/445 )
Branches     : 89.18% ( 297/333 )
Functions    : 82.25% ( 51/62 )
Lines        : 93.8%  ( 394/420 )
```

**Important scope caveat:** `vitest.config.ts`'s `coverage.include` is `['src/lib/rules/**']`
only — it does **not** cover `src/lib/extensions/**`, `src/lib/trace/**`, `src/lib/types/**`,
or `src/lib/aeo/**`. So "93.8% line coverage" is the real, freshly-measured number **for
`src/lib/rules` specifically**, not all of `src/lib`. The "96% line coverage" figure in
`POSITIONING.md` / `HOMEPAGE-COPY.md` should be replaced with **93.8%** (lines) — it does not
match either the old or new number, and is superseded. The under-covered files, for anyone
picking this up: `pricingValidation.ts` (51.85% stmts, lines 88–112 uncovered),
`pricing.ts` (line 339, 454, 463–479 uncovered), `quote.ts` (lines 188, 351, 412 uncovered).
The coverage command completed without timing out in this pass (contrary to the prior
sandbox's timeout) — no environment changes were made to achieve this; it may simply be
sandbox-to-sandbox variance.

### 1.5 `npm run build` (the real Next.js production build) — ❌ RED as of 2026-08-01, pre-existing and unrelated to Q2b (see §2)

**2026-08-01 (Q2b, engine 0.2.0):** `npm run build` currently fails — but on a `marketing/`
TypeScript error that predates this session's changes (confirmed via `git stash -u`; see §2 for
full detail and the exact commands run). All `src/`-side work for Q2b is independently verified
via `npx tsc --noEmit -p .` (§1.2, clean outside `marketing/`) and `npm test` (§1.1, 348/348).
Not fixed in this pass per instruction — `marketing/` is a different, out-of-scope queue.

<details><summary>2026-07-04 result (superseded — repo had no marketing/ tsc errors at that time, so the build was genuinely green)</summary>

```
npm run build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 2.5s
  Running TypeScript ...
  Finished TypeScript in 4.6s ...
✓ Generating static pages using 7 workers (24/24) in 486ms
```

24 routes generated successfully (mix of static `○` and dynamic `ƒ`, including
`/.well-known/ucp` and `/aeo-score/api/analyze`). No `EPERM` filesystem error this pass — the
prior sandbox's `EPERM: operation not permitted, unlink '.next/BUILD_ID'` was, as noted at the
time, a mount-permission artifact of that specific sandbox rather than a compile failure; this
run in a clean `.next` state confirms the build itself is sound now that `tsc` is clean too.

</details>

### 1.6 `@retailagentos/engine` tarball — ✅ VERIFIED, installs and runs externally

**2026-08-01 (Q2b): rebuilt and re-tarballed for the 0.2.0 breaking change** (required
`servesRegions` field, manifest shape, `evaluateOffer` region-blocking behavior):
```
npm run build -w @retailagentos/engine   # tsup: ESM + CJS + .d.ts, all succeeded
cd packages/engine && npm pack           # regenerated retailagentos-engine-0.2.0.tgz (78.6 kB)
```

Then, in a throwaway project outside this repo
(`/private/tmp/.../scratchpad/engine-smoke-02`, `"type": "module"`, no other dependencies):
```
npm install <repo>/packages/engine/retailagentos-engine-0.2.0.tgz
node smoke.mjs
→ ESM smoke: function function
→ manifest.endpoints present: true
→ manifest.servesRegions: [ 'US', 'CA' ]
→ GB blocked: true          # evaluateOffer alone, no pre-check, no server wrapper
node smoke.cjs
→ CJS smoke: function function
```

This is the strongest form of the "direct engine call" verification requested for OQ-2: not an
in-repo `tsx` script against source, but the actual packaged tarball, installed fresh in an
isolated project with no access to this repo's source tree, proving `evaluateOffer` alone
blocks an unserved region and `buildManifest` alone carries `endpoints`/`servesRegions`.

<details><summary>2026-07-04 result (superseded — engine 0.1.0)</summary>

```
npm run build -w @retailagentos/engine   # tsup: ESM + CJS + .d.ts, all succeeded
cd packages/engine && npm pack           # regenerated retailagentos-engine-0.1.0.tgz (73.4 kB)
```

Then, in a throwaway project outside this repo (`/private/tmp/.../scratchpad/engine-smoke`,
`"type": "module"`, no other dependencies):
```
npm install <repo>/packages/engine/retailagentos-engine-0.1.0.tgz
node smoke.mjs   # import { evaluateOffer, buildManifest } from '@retailagentos/engine'
→ ESM smoke test PASSED: evaluateOffer and buildManifest are both functions.
node smoke.cjs   # const { evaluateOffer, buildManifest } = require('@retailagentos/engine')
→ CJS smoke test PASSED: evaluateOffer and buildManifest are both functions.
```

Both the ESM and CJS entry points resolve and export working functions in a genuinely separate
Node project/toolchain (not this repo's `tsconfig`/`vitest` environment) — this closes the gap
flagged in the prior pass's §2 ("nobody in this session actually ran `npm install
./packages/engine/....tgz` ... and called `evaluateOffer`").

</details>

---

## 2. Claims still resting on the original 2026-06-10 pass (not re-run this session)

- **`npm run build` is RED — known, tracked, NOT fixed this pass (2026-08-01).** Repo-wide
  `npm run build` fails Next.js's TypeScript pass on
  `marketing/partners/parallel/demo/ingest.ts:245` (`ReasonEntry.blocking` missing) and
  `marketing/partners/parallel/demo/scenario.test.ts:43` (`MembershipTier` mismatch, `'wholesale'`
  not a valid value). Both are inside `marketing/`, which is gitignored (`.gitignore:41`,
  "LinkedIn planning only, not part of the app") and out of scope for Q2b (site/positioning work
  is a different queue, `SITE-PLAN.md`). **Confirmed pre-existing, not introduced by this
  session's changes:**
  ```
  git stash -u && npm run build
  → same two errors, on the unmodified branch, before any Q2b change
  git stash pop
  ```
  `BUILD-PLAN.md` §2.5 requires a green build as a task gate; a permanently-red repo-wide build
  stops being a signal and starts being cover for real breakage introduced elsewhere. This entry
  exists so the next session doesn't have to re-derive "is this new?" from scratch, and so a
  genuinely new `src/`-side build break doesn't get silently absorbed into "oh, build's red
  anyway." **Not fixed here** — the instruction for this task was to log it, not touch
  `marketing/`. Whoever picks up `marketing/` next should either fix these two type errors or
  formally exclude `marketing/` from the root `tsconfig.json`/Next build's typecheck scope so a
  gitignored, admittedly-out-of-scope directory can't fail the one gate the whole repo builds on.
- **Golden fixture coverage** — `MASTER-BUILD-PLAN.md` WP-00 requires a `reasonCodeCoverage`
  helper asserting every registered reason code appears in at least one fixture. Tests pass
  (§1.1), which is consistent with this being true, but it wasn't independently re-derived
  (i.e., nobody this pass cross-checked the helper's registry argument against the *current*
  full reason-code list across all seven built specs).
- ~~**`@retailagentos/engine` tarball actually installs and runs externally**~~ — **RESOLVED
  2026-07-04, see §1.6.** Rebuilt, repacked, and installed into a throwaway external project;
  both `evaluateOffer` and `buildManifest` resolve and run via ESM `import` and CJS `require`.
- **TheCustomHub Track A "done" claim** — `TRACK-B-FOR-THECUSTOMHUB.md` states "Track A (the
  kit) is done." This is true insofar as `packages/engine` exists and builds, but nobody
  re-verified every Track A acceptance line item (A1–A4 in `03-implementation-plan.md`)
  individually this pass — e.g., A3's region-allowlist unit test (`US`/`CA` pass, `GB` →
  `REGION_RESTRICTED`) is presumed covered by `regionAllowlist.test.ts` (8 tests, passing per
  §1.1) but wasn't opened and read line-by-line to confirm it tests exactly that case.
- **MCP equivalence (WP-19 / EVIDENCE-PLAN E6)** — not applicable yet; there is no MCP server
  in this repo to test. Flagging only so it isn't silently assumed done later.

---

## 3. A real documentation gap found while checking file structure (not a claim — an omission)

While checking `src/app/` for anything the spec wiki doesn't cover, three app surfaces turned
up that **`specs/WIKI.md` and `specs/wiki/**` currently say nothing about**:

1. **`src/app/sandbox/reference/`** — a "cookbook": per-spec runnable recipes
   (`recipes/0000-foundations.ts` through `recipes/0013-trace.ts`), a fixtures file, and its own
   page/components. This is very likely the "cookbook" mentioned in the git log
   (`977d77d Ship v1 spec suite, executable engine, cookbook, and Story-mode demo`) and looks
   like it should be the single best onboarding surface for understanding each built spec by
   example — but it isn't linked from `specs/WIKI.md` at all.
2. **`src/app/sandbox/retail-agent-os/`** — an `agent-brain.ts` + `AgentChatUI.tsx` +
   `AgentBrainLogs.tsx` simulated shopping-agent conversation ("Story-mode demo" per the same
   commit). **Checked this pass (partially):** `agent-brain.ts`'s `evaluateProductRequest()`
   does **not** import `evaluateOffer` or anything from `@/lib/**` — it has its own
   `SandboxProduct` type (not the canonical `Variant`) and its own logic, and it uses
   `Math.random()` for mock latency values. It does **not** violate the letter of the
   determinism invariant (that rule is explicitly scoped to `src/lib/rules|extensions`, and
   this file lives outside both), but it means **there are now two separate decision-narrating
   implementations in this repo**: the real deterministic pipeline, and this parallel
   "Story-mode" simulator with its own logic and its own randomness. That is precisely the
   kind of drift `ARCH-UCP-EXTENSION-MCP.md` §2's "one source of truth" principle exists to
   prevent, even if it's confined to a clearly-separate `/sandbox` route. **Not fully assessed:**
   whether this is intentionally a narrative-only demo (fine, if clearly labeled as such
   somewhere a visitor can see) or is being presented anywhere as equivalent to the real
   pipeline's output (a problem, if so) — a reviewing agent should open `page.tsx` in this
   folder and check what it tells the visitor about itself.
3. **`src/app/aeo-score/`** — almost certainly the "AEO/agent-readiness score tool" from the git
   log (`f819f9f Add AEO/agent-readiness score tool + TheCustomHub case-study design`) and the
   likely implementation of `EVIDENCE-PLAN.md`'s E7 audit tool. Not referenced anywhere in the
   spec wiki either.

**None of these were read in depth this pass** — effort was spent on the spec/wiki/reference-
implementation reorg specifically, and these three surfaces are adjacent to it, not part of it.
But a reviewing agent building "what's left / what's right / what's too complex" strategy
absolutely needs to open and assess these three before concluding the wiki's built-vs-pending
map is the whole picture. **This is the single most important item in this file.**

---

## 4. Corrections already made in this session (for the record, not re-checking needed)

- `case-studies/thecustomhub/README.md` claimed to be gitignored; it was actually git-tracked.
  Corrected in place (now `specs/reference-implementation/thecustomhub/README.md`) rather than
  silently left contradictory.
- `POSITIONING.md`'s scorecard had one row (e3, promo stacking) marked 🟡 "partial" when the
  actual state is 📐 "fully designed, zero code" — corrected downward, not just upward, since
  overstating an unbuilt differentiator is the worse credibility risk.
- **2026-07-04:** the two `tsc --noEmit` errors (§1.2) and two `registry.ts` lint errors (§1.3)
  were fixed (type-level only), `npx vitest run --coverage` and `npm run build` were run to
  completion for the first time (§1.4, §1.5), and the engine tarball was verified to install
  and run in an external throwaway project (§1.6). See `specs/BUILD-PLAN.md` §3 task Q1.

---

## 5. How to use this file

- If you are a human: run the commands in §1 yourself in a real (non-sandboxed) environment
  before publishing any of the numbers in `POSITIONING.md` externally. As of 2026-07-04, §1.1
  through §1.6 have all been run to completion in at least one environment (this session's) —
  but re-verify before quoting numbers publicly, since sandbox-to-sandbox variance was observed
  (§1.4's coverage command timed out in one sandbox and completed in another with no code
  changes in between).
- If you are a reviewing agent building a strategy from the MD files alone: treat every ✅ in
  `specs/WIKI.md` / `specs/wiki/*.md` as "built and tested" (§1.1 backs this). §1.2–§1.6 are now
  ✅ as of 2026-07-04 with real numbers attached — cite the numbers in this file, not the
  "96% coverage" / "TypeScript clean" claims still sitting unchanged in `POSITIONING.md` /
  `HOMEPAGE-COPY.md` / `MASTER-BUILD-PLAN.md` until someone updates those source docs to match.
  The three undocumented surfaces in §3 remain open questions your strategy must explicitly
  call out — not facts to assume.
