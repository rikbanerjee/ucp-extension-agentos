# `@retailagentos/engine` — the reusable kit

**Location:** [`packages/engine`](../../packages/engine)
**Version:** 0.1.0 · pinned, not yet published to a public registry
**Consumes:** `src/lib/rules/`, `src/lib/extensions/`, `src/lib/types/`, `src/lib/trace/`,
`src/lib/projections/`, `src/lib/adapters/` — this package has no logic of its own; it is a
re-export boundary over the app's source.

## What it is

The engine is every built spec's pure, deterministic evaluation logic, packaged so a
*different* codebase (a real merchant's app, not this demo) can install and call it directly
— ESM + CJS + type declarations, zero runtime dependencies, no source exposed.

```ts
import { evaluateOffer, buildManifest } from '@retailagentos/engine';
```

Importing it self-registers every evaluator (visibility, eligibility, pricing, inventory,
quote). A consumer never touches a registry — they call the public API below.

## Public API surface (the only supported surface)

| Function | What it does | Backing spec |
|---|---|---|
| `evaluateOffer({ merchant, variant, quantity, context, now })` | Runs the full five-stage pipeline, returns a `DecisionRecord` | 0000–0008 |
| `issueQuote(record, now)` / `validateQuote(token, ctx, now)` | Quote lifecycle | 0007 |
| `buildDecisionTrace(record)` + `renderBuyerTrace` / `renderMerchantTrace` / `renderDeveloperTrace` | The three-audience trace | 0013 (part 1) |
| `checkServesRegion(servesRegions, marketRegion)` | Region allowlist helper (adapter-level today; see the open question below) | extends 0001 |
| `buildManifest(profile)` | The `/.well-known/ucp` manifest | 0000 |
| `toSchemaOrgProduct(variant)` / `toProductFeed(variants)` | Derived agent-facing surfaces (JSON-LD, product feed) | 0000/0004-adjacent |

## The two contracts every consumer implements

```ts
interface MerchantCatalogAdapter<TSource> {
  merchantProfile(): MerchantProfile;       // tier + capabilities[] + endpoints + keys
  toVariants(source: TSource): Variant[];   // one merchant product -> 1+ RAOS variants
  listVariants(): Variant[];                // whole normalized catalog
}

interface BuyerContextResolver {
  resolve(input: { region?: string; fulfillmentMode?: string }): PartialBuyerContext;
}
```

Everything else the kit exposes (manifest, schema.org, feed, quote lifecycle, trace) is
*derived* from these two — a merchant implements the adapter once, and every downstream
surface follows without redoing the reasoning.

## The one invariant that must never break

No `Date.now()`, `Math.random()`, or `fetch()` anywhere in the code this package re-exports.
`now` is always an argument, never read from the system clock inside the engine. This is what
makes `evaluateOffer` produce byte-identical output for a Playground call, an MCP tool call,
and a merchant's own server call, given the same inputs — one source of truth, three surfaces.

## Rebuild / update flow

Whenever `src/lib/**` changes, rebuild and reinstall the tarball in any consuming repo:

```bash
npm run build -w @retailagentos/engine   # regenerates packages/engine/dist + the .tgz
```

A consumer pins the version in their own `package.json`; nothing auto-updates.

## Verification status (2026-07-04)

See [`../../VERIFICATION-NEEDED.md`](../../VERIFICATION-NEEDED.md) for full detail. Summary
relevant to this package specifically:

- `src/lib/extensions/registry.ts:91` has two `@typescript-eslint/no-explicit-any` errors —
  small, fixable, worth closing before this package sees wider external use given the
  determinism/strong-typing story it's sold on.
- The tarball (`packages/engine/retailagentos-engine-0.1.0.tgz`) exists on disk and
  `packages/engine/dist/` is populated, but nobody has actually run `npm install ./that-tarball`
  in a separate throwaway project and called `evaluateOffer` this pass — the "install
  externally and it just works" claim is unverified, not confirmed.
- `npx tsc --noEmit` at the repo root currently reports 2 errors (both in a test file, not in
  anything this package re-exports) — see the root doc for detail.

## Known open item

`checkServesRegion` exists because RAOS-0001 models regions as a **blocklist**
(`restrictedRegions[]`), but TheCustomHub's real need was an **allowlist**
("we ship to exactly these two countries"). The engine currently patches this at the
adapter level rather than in the spec itself — see
[`thecustomhub/02-spine-design.md`](./thecustomhub/02-spine-design.md) §4 for the reasoning.
This should become a proper addition to `specs/0001-eligibility.md` (an Open Question, not a
silent adapter workaround) — flagged here so it doesn't get lost.
