# Reference Implementation

This section is **proof, not policy**. Everything under `specs/00NN-*.md` and `specs/wiki/`
defines *what* a spec requires. Everything in this folder shows *that it's actually
buildable* — real code, and one real merchant applying it. If you're trying to understand
what a spec means, go read the wiki page or the RFC; come here only once you want to see it
running.

## Two things live here

### 1. [`engine.md`](./engine.md) — the reusable kit

`@retailagentos/engine` is the packaged, installable version of `src/lib/rules/` +
`src/lib/extensions/` + `src/lib/types/`. It is the single reference implementation every
built spec (0000, 0001, 0002, 0005, 0007, 0008, 0013 part 1) points to. Any merchant
integration — TheCustomHub or a future one — depends on this package, not on the app's
internal source.

### 2. [`thecustomhub/`](./thecustomhub/) — one real merchant, applying the kit

TheCustomHub is a free pilot merchant (made-to-order apparel, Firebase-hosted) consuming
`@retailagentos/engine` to become agent-readable and agent-transactable end to end. Its
docs are the **concrete worked example** of what "implement RAOS-0001/0002/0005/0007/0008"
actually looks like against a real, messy, pre-existing catalog — not a clean mock.

Read in this order if you're new to it:
1. [`thecustomhub/01-discovery.md`](./thecustomhub/01-discovery.md) — what their stack and
   catalog actually look like, as found.
2. [`thecustomhub/02-spine-design.md`](./thecustomhub/02-spine-design.md) — the adapter
   pattern and field-mapping design.
3. [`thecustomhub/03-implementation-plan.md`](./thecustomhub/03-implementation-plan.md) —
   the two-track (kit vs. merchant repo) execution plan.
4. [`thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md`](./thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md) —
   the standalone, self-contained brief meant to be copied into the merchant's own repo.

## The boundary rule

**A spec's definition never lives here, and this folder never redefines a spec.** If
something in TheCustomHub's integration exposes a real gap in a spec (for example: RAOS-0001
models regions as a blocklist, but TheCustomHub needed an allowlist — see
`thecustomhub/02-spine-design.md` §4), the fix is to raise it as an Open Question on the spec
itself, not to quietly special-case it here. This folder documents what was *actually done*
to ship, including any such workarounds — it doesn't get to silently change what the spec
says.

## Status

**See [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) before trusting any status
below as fully confirmed** — it distinguishes what was actually re-run (tests: 328/328 passing,
2026-07-04) from what's still carried forward unverified (coverage %, `npm run build`, whether
the packaged tarball installs cleanly in an external project).

- **Engine extraction:** done — `packages/engine` builds a portable `dist/` (ESM + CJS +
  types), pinned at `0.1.0`.
- **TheCustomHub pilot:** kit-side work (Track A) is done; merchant-side wiring (Track B —
  adapter, manifest route, schema.org markup, generalized remote MCP server) is the pending work. See
  `PUNCH-LIST.md` at the project root, item 1.

## Done-for-pilot definition (the bar, not just the build)

Track B's acceptance criteria (B0–B5, in `thecustomhub/TRACK-B-FOR-THECUSTOMHUB.md`) prove the
pilot *works*. Shipping it as evidence — not just as a working demo — requires two more things,
carried over from `EVIDENCE-PLAN.md` E5 so they don't get lost as a marketing afterthought:

1. **A before/after failure-rate metric.** Before wiring in the kit, run the same set of agent
   tasks against TheCustomHub's raw, unmodified store and record how many fail (dead-end cart,
   wrong quote, silent no-match). After Track B ships, run the identical task set again. The
   headline number is literally "agents completed 0/N tasks on the unmodified store; N-1/N with
   the reasoning layer" — without this number, the pilot is an anecdote; with it, it's a
   benchmark. Capture the task list and both result sets alongside the pilot write-up in this
   folder once it exists.
2. **A verbatim acceptance transcript**, not just a acceptance checkbox. The positive case:
   Claude Desktop connects → finds a product that ships to Canada under $X → quotes → completes
   Stripe checkout. The negative case: an out-of-region or out-of-stock item is **declined with
   a reason**, not a failed checkout. Both transcripts, captured verbatim, are the evidence
   artifact — a claim of "it works" without the transcript is exactly the kind of adjective this
   project's whole positioning is built to avoid.

Neither of these blocks Track B's engineering work — they're an instrumentation + write-up step
that rides on top of it. See `PUNCH-LIST.md` item 1 for where this sits in sequence.
