# RetailAgentOS — Verification Needed

**Purpose:** every claim across `specs/WIKI.md`, `specs/wiki/**`, `specs/reference-implementation/**`,
`POSITIONING.md`, and `PUNCH-LIST.md` that is either (a) independently confirmed in this pass,
with the exact evidence, or (b) still asserted-but-unverified, with the exact command to check
it. Read this before trusting a status label anywhere else in the docs — and read it **instead
of** re-deriving these facts from the source tree by hand.

**Verified as of:** 2026-07-04, this session, `aarch64` sandbox, Node v22.22.3.

---

## 1. Confirmed by actually running things (not just reading code)

### 1.1 Test suite — ✅ VERIFIED, numbers corrected

```
npx vitest run
Test Files  13 passed (13)
     Tests  328 passed (328)
  Duration  2.14s
```

**This corrects two stale numbers found elsewhere in the docs:**
- `POSITIONING.md` (original, 2026-06-10) said "~130 test cases, 96% line coverage" — the test
  *count* is stale (real count is 328), and the coverage % was **not** re-verified this pass
  (see §2.1 below — the coverage command itself didn't complete in this sandbox).
- `specs/reference-implementation/thecustomhub/03-implementation-plan.md` (Track A, acceptance
  criterion for A1) says "**293 tests still pass**" as the no-behavior-change proof for the
  engine extraction. Real current count is 328. This isn't necessarily wrong — it may simply
  predate later test additions (trace, projections, region allowlist) — but the number should
  be re-pinned before anyone cites it, and Track B's own acceptance check should re-count at
  the point the extraction is actually verified, not rely on this figure.

### 1.2 TypeScript — 🔴 NOT clean, contradicts a written Definition-of-Done

`MASTER-BUILD-PLAN.md` §8 and §9 both assert "`npm run build` passes (TypeScript clean)" as a
program-level and per-WP acceptance bar. Running the type-checker directly:

```
npx tsc --noEmit
src/lib/extensions/__tests__/pipeline.test.ts(121,11): error TS2741: Property 'severity' is
  missing in type '{ code: string; message: string; blocking: false; source: string; }' but
  required in type 'ReasonEntry'.
src/lib/extensions/__tests__/pipeline.test.ts(293,46): error TS7006: Parameter 'r' implicitly
  has an 'any' type.
```

Both errors are in a **test file**, not production rule/extension code, and `vitest` still runs
that test file successfully (ts-check is separate from ts-transpile — Vitest's transform layer
doesn't type-check). So this is not evidence the *engine* is broken. It is evidence that the
"TypeScript clean" claim is currently false as stated, and that `npm run build` may or may not
actually fail on it depending on whether Next.js's build-time type-check includes test files
under `tsconfig.json`'s `**/*.ts` include pattern (it wasn't possible to confirm — see §2.2).
**Action:** add the missing `severity` field to the fixture at line 121 and an explicit type
for `r` at line 293; re-run `tsc --noEmit` to confirm zero errors; then re-run `npm run build`
for real.

### 1.3 ESLint — 🟡 19 errors, 33 warnings; two are in engine code, not just UI

```
npx eslint .
✖ 52 problems (19 errors, 33 warnings)
```

17 of the 19 errors are in UI/page components (`src/app/demo/page.tsx`,
`src/app/guided/page.tsx`, `src/components/AgentDemoStrip.tsx`,
`src/components/layout/NavBar.tsx`, `src/app/sandbox/**`) — React-hooks and
`no-explicit-any` issues. `CHANGES.md` already documents "pre-existing lint errors — left
untouched (pre-date this session)," so these are known and accepted, not new.

**The two worth flagging specifically:** `src/lib/extensions/registry.ts:91` has two
`@typescript-eslint/no-explicit-any` errors — this file is inside the reference-implementation
engine surface (`packages/engine` re-exports from it), and `PROJECT_CONTEXT.md`'s stated
engineering principle is "strong typing." This is a small, concrete, fixable gap between the
stated principle and the code, worth a one-line mention in `specs/reference-implementation/engine.md`
rather than silently ignoring it.

### 1.4 Line coverage % — 🔴 UNVERIFIED (could not complete in this sandbox)

`npx vitest run --coverage` timed out in this environment. The "96% line coverage" figure
quoted in `POSITIONING.md` and `HOMEPAGE-COPY.md` was **not** re-confirmed this pass — it is
carried forward from the original 2026-06-10 assessment, unchanged, and should be treated as
stale until someone runs the coverage command successfully (locally, or in an environment
without this sandbox's native-module + timeout constraints) and reports the real number.

### 1.5 `npm run build` (the real Next.js production build) — 🔴 INCONCLUSIVE

Attempting `npm run build` in this sandbox failed with `EPERM: operation not permitted, unlink
'.next/BUILD_ID'` — a filesystem-permission artifact of this specific sandbox mount (the `.next`
directory couldn't even be removed with `rm -rf` afterward — every file inside it refused
`unlink`). **This is not evidence the build is broken** — it's evidence this sandbox couldn't
run the check. Someone needs to run `npm run build` in a normal local environment and report
pass/fail, especially given §1.2's `tsc` finding above.

---

## 2. Claims still resting on the original 2026-06-10 pass (not re-run this session)

- **Golden fixture coverage** — `MASTER-BUILD-PLAN.md` WP-00 requires a `reasonCodeCoverage`
  helper asserting every registered reason code appears in at least one fixture. Tests pass
  (§1.1), which is consistent with this being true, but it wasn't independently re-derived
  (i.e., nobody this pass cross-checked the helper's registry argument against the *current*
  full reason-code list across all seven built specs).
- **`@retailagentos/engine` tarball actually installs and runs externally** — `packages/engine/dist/`
  and the `.tgz` exist on disk (confirmed by directory listing), and `package.json`'s
  `exports` map looks correct, but nobody in this session actually ran `npm install
  ./packages/engine/retailagentos-engine-0.1.0.tgz` in a throwaway project and called
  `evaluateOffer`. That's the actual acceptance bar in
  `specs/reference-implementation/thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md` B0 — "the import
  above runs in this repo's toolchain" — and it hasn't been executed against a *different*
  toolchain, which is the entire point of packaging it.
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

---

## 5. How to use this file

- If you are a human: run the commands in §1 yourself in a real (non-sandboxed) environment
  before publishing any of the numbers in `POSITIONING.md` externally.
- If you are a reviewing agent building a strategy from the MD files alone: treat every ✅ in
  `specs/WIKI.md` / `specs/wiki/*.md` as "built and tested" (§1.1 backs this), but treat
  coverage %, build-pass, and the three undocumented surfaces in §3 as open questions your
  strategy must explicitly call out — not facts to assume.
