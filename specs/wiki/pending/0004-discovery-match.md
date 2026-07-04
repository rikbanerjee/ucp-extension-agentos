# RAOS-0004 · Discovery, Catalog Semantics & Match — Wiki & Pending Work

**Status:** Not started · planned · Tier 0 · Plane 1
**Full context:** `PROGRAM-PLAN.md` §6 (RAOS-0004 brief) · `MASTER-BUILD-PLAN.md` WP-17
**Depends on:** RAOS-0000 (Foundations, built) — otherwise independent of the pricing chain

## The one-sentence problem

A small boutique has no SEO budget and no marketplace presence — an agent asked for "a
thoughtful gift for a new parent" has no machine-readable way to match that intent to her
catalog, no matter how good the products are.

## Why UCP doesn't solve this

UCP's catalog is a listing, not a matching engine. It carries titles and categories, not
intent tags, substitution relationships, or bundle composition rules.

## Minimal core (build this first)

Merchant-declared **keywords + category + a handful of intent tags** per product
(`discoverabilityProfile`). That's the entire mechanism for the smallest merchant — no
bundles, no substitution graph yet. This alone is Sara's Boutique's real gap, and the
cheapest possible fix for it.

## Layering up (build later)

- Substitution/alternates: "out of this, suggest that" (binds RAOS-0005 out-of-stock and
  RAOS-0010 discontinuation).
- Bundle/kit schema: component-level eligibility and availability roll-up — is the bundle
  still buyable if one component isn't?
- Attribute normalization (size/color/material) so agents can match across merchants.
- The explicit **discoverable ≠ recommendable** distinction: an item can be findable (shows
  up in search) but flagged as not-recommended (e.g. a clearance rack item a merchant
  doesn't want an agent pushing).

## Pending tasks

- [ ] Write `specs/0004-discovery-match.md`.
- [ ] Define `discoverabilityProfile` type + substitution/bundle types.
- [ ] Implement as a VISIBILITY-stage adjacency — discovery *ranks*, it must never override
      RAOS-0001 visibility.
- [ ] Mock data: boutique archetype is the intended showcase ("personalized gift for dad"
      intent-tag match, a findable-not-recommended sale rack item, an invalid monogram
      option combination).
- [ ] Reason codes: `SUBSTITUTE_AVAILABLE`, `BUNDLE_COMPONENT_BLOCKED`,
      `BUNDLE_COMPONENT_OOS`, `INVALID_OPTION_COMBINATION`, `FINDABLE_NOT_RECOMMENDED`.

## Open questions

- How much ranking signal can a merchant expose without leaking margin data to a competitor
  scraping via an agent? Needs a decision before the "relevance/ranking signals" field is
  designed.
- Multi-language matching (query in a language the catalog isn't in) — design the hook here,
  do not implement (that's RAOS-0015/i18n territory, out of v1 scope).
