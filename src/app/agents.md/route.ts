/**
 * GET /agents.md
 *
 * Machine-onboarding file for AI shopping agents (SWP-4, EVIDENCE-PLAN E2).
 * Plaintext/markdown, curl-able, no auth. This is the front door for an agent
 * that has never seen RetailAgentOS before: what to fetch, how to negotiate,
 * how to parse a reason, and what's real today vs. planned.
 *
 * Next.js 16 route-handler conventions (verified against
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md):
 *   - "Non-UI Responses" example in that doc serves `app/rss.xml/route.ts` by
 *     naming the route segment folder literally after the file agents expect
 *     to curl, returning a plain `Response` with a `Content-Type` header. The
 *     same pattern applies here: a folder literally named `agents.md` with a
 *     `route.ts` inside serves `GET /agents.md`.
 *   - A `route.ts` cannot share a segment with a `page.tsx` — N/A here, there
 *     is no `agents.md/page.tsx`.
 *   - Route Handlers are not cached by default (dynamic unless a GET opts in
 *     via `export const dynamic = 'force-static'`). This content is a static
 *     string with no request-time data, so we opt into `force-static` — it's
 *     safe to prerender/cache since nothing here varies per-request.
 */

// Static content, no per-request data — safe (and cheap) to prerender/cache.
export const dynamic = 'force-static';

const AGENTS_MD = `# agents.md — RetailAgentOS onboarding for AI shopping agents

This file is for machines. If you are an AI agent (shopping assistant, browser
agent, MCP client) landing on a RetailAgentOS-backed storefront, start here.

RetailAgentOS is a reasoning layer merchants run alongside UCP (Universal
Commerce Protocol). UCP gives you the transport and catalog rails; RetailAgentOS
makes the merchant's *rules* — eligibility, pricing, inventory, trust — machine
readable, so you get a structured reason instead of a dead end.

## Current delivery surfaces — what is live and what is not

| Surface | Status | What an agent can rely on |
|---|---|---|
| UCP manifest, specs, engine, adapters, and projections | Live before the WebMCP challenge | Canonical merchant rules and their derived UCP-facing representations. |
| Packaged \`@retailagentos/engine\` | Live before the WebMCP challenge | Deterministic commerce decisions outside the browser. |
| External/client adapter seam | Live before the WebMCP challenge | A documented integration boundary over the same engine. |
| Native browser WebMCP showcase | Live challenge delivery | Browser-local tool registration and controlled shopping actions at \`/webmcp-showcase\`. |
| Controlled showcase HTTP routes | Live challenge delivery | Server-bound fixture data for the showcase only. |
| Generalized remote/server MCP | Not shipped | Designed architecture; no hosted remote MCP server is available. |
| Production multi-tenant API | Not shipped | No production authentication, persistence, rate limiting, or tenant platform. |
| Checkout, payment, or order placement | Not exposed | Cart preparation and quote-only fixtures stop before commerce execution. |

## Before WebMCP Challenge

RetailAgentOS already shipped a UCP manifest endpoint (\`/.well-known/ucp\`),
a reference evaluation engine (\`@retailagentos/engine\`, this repo's
\`src/lib/rules\`), external/client adapter seams, and projections derived from
the same merchant and policy objects. The architecture also documented a thin
generalized remote/server MCP adapter over that engine. That design was not a
hosted remote MCP service.

## WebMCP Challenge extension — Aug 30–31 2026

Native browser WebMCP is now shipped as a controlled showcase at
\`/webmcp-showcase\`. The delivery is evidenced by commits
[\`92753e5\`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/92753e5),
[\`d094e12\`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/d094e12),
and [\`e464bb8\`](https://github.com/rikbanerjee/ucp-extension-agentos/commit/e464bb8).
When the browser supports it, the page uses the \`document.modelContext\`
lifecycle to register the canonical tool descriptors; deterministic replay is
clearly labelled when that API is unavailable.

Browser agents should discover the registered tools, call
\`get_storefront_capabilities\` first, then use phase tools as they are
dynamically registered for the active controlled fixture. There is no checkout
tool. TheCustomHub is a controlled, quote-only fixture, not a live merchant
integration.

---

## 1. Start here: GET /.well-known/ucp

Every RetailAgentOS-backed merchant publishes a manifest at
\`/.well-known/ucp\`. Fetch it before doing anything else — it tells you what
the merchant actually supports.

\`\`\`
GET /.well-known/ucp
\`\`\`

Real response, unedited, for the wholesale archetype in this repo's reference
implementation (\`GET /.well-known/ucp?merchant=m_wholesale_002\` — "Atlas
Wholesale," a B2B/bulk-priced store):

\`\`\`json
{
  "protocol": "1.0",
  "tier": 2,
  "capabilities": [
    { "id": "ext.trust", "namespace": "com.os.retailagent.shopping.trust", "version": "1.0.0", "required": true, "tier": 0 },
    { "id": "ext.pricing_context", "namespace": "com.os.retailagent.shopping.pricing_context", "version": "1.2.0", "required": true, "tier": 0 },
    { "id": "ext.visibility", "namespace": "com.os.retailagent.shopping.visibility", "version": "1.1.0", "required": true, "tier": 0 },
    { "id": "ext.eligibility", "namespace": "com.os.retailagent.shopping.eligibility", "version": "1.1.0", "required": true, "tier": 1 },
    { "id": "ext.inventory", "namespace": "com.os.retailagent.shopping.inventory", "version": "1.0.0", "required": true, "tier": 1 },
    { "id": "ext.member_pricing", "namespace": "com.os.retailagent.shopping.member_pricing", "version": "1.0.0", "required": false, "tier": 2 },
    { "id": "ext.bulk_pricing", "namespace": "com.os.retailagent.shopping.bulk_pricing", "version": "1.3.0", "required": false, "tier": 2 },
    { "id": "ext.pricing", "namespace": "com.os.retailagent.shopping.pricing", "version": "1.0.0", "required": true, "tier": 0 },
    { "id": "ext.quote", "namespace": "com.os.retailagent.shopping.quote", "version": "1.0.0", "required": false, "tier": 2 }
  ],
  "keys": [
    { "keyId": "k1", "validFrom": 1700000000000, "validTo": 1988150400000 },
    { "keyId": "k2", "validFrom": 1750000000000, "validTo": null }
  ]
}
\`\`\`

(Each capability entry also carries \`name\`/\`description\` fields, trimmed
above for brevity — fetch the endpoint yourself for the full object.)

---

## 2. Negotiate on capabilities[], never on tier

\`tier\` (0–4) is a **headline maturity summary** — advisory, for humans. It is
**not** the negotiation key. The authoritative surface is \`capabilities[]\`,
each entry keyed by \`namespace@version\` (e.g.
\`com.os.retailagent.shopping.bulk_pricing@1.3.0\`).

Rules:

- **Check for the specific namespace you need**, not the tier number. A Tier-2
  merchant may list an individual Tier-3 capability without raising its
  headline tier; a merchant's headline tier can also outrun its actual
  \`capabilities[]\` — always trust the list, never the number.
- **No capability = not supported, full stop**, regardless of what the tier
  number implies. Do not assume a namespace exists because a "higher" tier
  usually implies it.
- **Degrade gracefully for an absent capability.** If
  \`com.os.retailagent.shopping.member_pricing\` isn't listed, don't ask for or
  assume member pricing — fall back to base pricing and say so to the buyer.
  If \`com.os.retailagent.shopping.bulk_pricing\` isn't listed, don't attempt
  quantity-break negotiation.
- **Version skew** — a namespace is semver'd independently. Minor/patch bumps
  are additive-only (new optional fields, new reason codes); treat an
  unrecognized field or reason code as informational, not an error (see §4).

Full ladder and negotiation semantics: \`specs/0000-foundations.md\` §5–§6.

---

## 3. The BuyerContext you send

Evaluation is scoped to a \`BuyerContext\` — buyer-side facts only (merchant
capabilities live in the manifest, not here):

\`\`\`jsonc
{
  "customerType": "guest | member | wholesale | b2b",
  "loyaltyTier": "guest | silver | gold",
  "membershipTier": "none | gold | reseller_plus | distributor",
  "marketRegion": "US | CA | NY | HI | ...",
  "fulfillmentMode": "shipping | pickup | local_delivery",
  "accountLinked": false,
  "taxExempt": false,
  "resaleCertificateOnFile": false,
  "trust": {
    "mode": "asserted | signed",
    "issuer": "https://id.example.test",
    "keyId": "k1",
    "signature": "base64…"
  }
}
\`\`\`

**Any field you omit defaults to the most-restrictive interpretation** — an
unknown \`customerType\` is treated as \`guest\`, an unknown region is treated as
restricted. This is deliberate (RAOS-0000 §4.3, §7.2): it's how the system
stays fail-degraded instead of fail-open.

Full shape: \`specs/0000-foundations.md\` §4.

---

## 4. Trust honesty — read this before you trust anything

\`trust.mode\` tells you how much to believe the claims above:

- **\`signed\`** — claims arrived in a signed buyer-context token; the merchant
  verified the signature, not your say-so.
- **\`asserted\`** — claims are agent-asserted, no signature. **This is the only
  mode this reference implementation currently produces.** An asserted claim
  that would *grant* privilege (member pricing, tax exemption, a loyalty tier)
  is **not trusted for transaction-gating** — it falls back to guest /
  most-restrictive. Asserted claims may still be used for discovery
  convenience (e.g. "you said you're in CA, here's what's visible there").

Every computed result also carries a provenance envelope:

\`\`\`json
{
  "issuer": "https://api.wholesale-b.test",
  "keyId": "k1",
  "signature": "sim:e9c8082d",
  "trustMode": "asserted",
  "computedAt": 100000,
  "ttlSeconds": 300
}
\`\`\`

**The crypto is simulated.** \`signature\` values like \`"sim:e9c8082d"\` are not
real signatures — key rotation, clock-skew, and real signing are a later spec
(RAOS-0008), not shipped. Every evaluated result in this reference
implementation carries a plain \`TRUST_SIMULATED\` reason so you never have to
infer this:

\`\`\`json
{
  "code": "TRUST_SIMULATED",
  "message": "Envelope produced with simulated crypto (SIMULATED — not cryptographically verified).",
  "severity": "INFO",
  "blocking": false,
  "source": "com.os.retailagent.shopping.trust"
}
\`\`\`

Do not report a purchase, a price, or an eligibility decision from this
reference implementation as cryptographically verified. It isn't yet.

---

## 5. Parsing a ReasonEntry

Every pipeline stage (visibility, eligibility, pricing, cart validation,
availability, trust) emits the **same** reason shape — parse one vocabulary,
not one per stage:

\`\`\`jsonc
{
  "code": "WHOLESALE_ONLY",          // stable, namespaced, additive-only
  "message": "This product requires a wholesale account.",  // prose, never the contract
  "severity": "BLOCK",               // BLOCK | CONDITION | INFO
  "requirements": [                  // resolution path, if any
    { "type": "customer_type", "value": "wholesale" }
  ],
  "source": "com.os.retailagent.shopping.eligibility"  // owning namespace
}
\`\`\`

Severity → status derivation (RAOS-0000 §8.1):

- **\`BLOCK\`** + no resolvable \`requirements[]\` → the item is **BLOCKED**. Stop
  and explain; don't retry.
- **\`BLOCK\`** or **\`CONDITION\`** + a resolvable \`requirements[]\` path →
  **CONDITIONAL**. Surface the resolution path to the buyer instead of
  dead-ending ("add a resale certificate to unlock this price").
- **\`INFO\`** → advisory only. Never gates a transaction.

**Unknown reason code?** Treat an unrecognized *blocking* code as \`BLOCK\`
(most-restrictive, fail-degraded — RAOS-0000 §7.3). Never crash, and never
silently treat an unknown code as safe to ignore. An unrecognized non-blocking
code is safe to log and skip.

Full registry semantics: \`specs/0000-foundations.md\` §8.

---

## 6. A worked example, verbatim from the test suite

This is not invented — it's copied from this repo's golden fixture suite
(\`src/lib/rules/__tests__/__fixtures__/golden.json\`), the same fixtures the
328 automated tests assert against. Archetype: **Atlas Wholesale**
(\`m_wholesale_002\`, the B2B/bulk-priced merchant from §1), variant
\`v_w_001_1\`, context: a **member** customer, no B2B account standing
(\`membershipTier: none\`), region \`CA\`, shipping, quantity 1.

The merchant requires a wholesale account for this SKU, and separately
enforces a minimum order quantity — both fire, both are \`BLOCK\` severity, both
carry a resolution path:

\`\`\`json
{
  "variantId": "v_w_001_1",
  "eligibility": {
    "status": "CONDITIONAL",
    "reasons": [
      {
        "code": "WHOLESALE_ONLY",
        "message": "This product requires a wholesale account.",
        "severity": "BLOCK",
        "requirements": [{ "type": "customer_type", "value": "wholesale" }],
        "source": "com.os.retailagent.shopping.eligibility"
      }
    ]
  },
  "price": {
    "unitPrice": 400,
    "currency": "USD",
    "priceSource": "base",
    "reasons": [
      {
        "code": "BELOW_MOQ",
        "message": "Minimum order quantity is 10.",
        "severity": "BLOCK",
        "requirements": [{ "type": "moq", "value": 10 }],
        "source": "com.os.retailagent.shopping.bulk_pricing"
      },
      {
        "code": "QUANTITY_INCREMENT_MISMATCH",
        "message": "Quantity must be in increments of 5.",
        "severity": "BLOCK",
        "requirements": [{ "type": "quantity_increment", "value": 5 }],
        "source": "com.os.retailagent.shopping.bulk_pricing"
      }
    ]
  },
  "cartValidation": {
    "valid": false,
    "cartTotal": 400,
    "messages": [
      "This product requires a wholesale account.",
      "Minimum order quantity is 10.",
      "Quantity must be in increments of 5."
    ]
  },
  "envelope": {
    "issuer": "https://api.wholesale-b.test",
    "keyId": "k1",
    "signature": "sim:e9c8082d",
    "trustMode": "asserted",
    "computedAt": 100000,
    "ttlSeconds": 300
  },
  "trustReasons": [
    {
      "code": "TRUST_SIMULATED",
      "message": "Envelope produced with simulated crypto (SIMULATED — not cryptographically verified).",
      "severity": "INFO",
      "source": "com.os.retailagent.shopping.trust"
    }
  ]
}
\`\`\`

Read this as an agent would: eligibility is \`CONDITIONAL\`, not a hard dead end
— \`requirements\` tells you exactly what would resolve it (\`customer_type:
wholesale\`). Cart validation is \`false\` at quantity 1 for a second,
independent reason (below MOQ) — even if the buyer *were* a wholesale account,
this specific cart still fails until quantity reaches 10 in increments of 5.
Both reasons are surfaced, not just the first one encountered. Neither reason
is invented for this file — traceable to \`golden.json\`, entry label
\`v_w_001_1|member|none|CA|shipping|noCert|noExempt|qty:1\`.

---

## 7. Where the rest of the contract lives

- \`/specs\` — the open spec suite (RAOS-0000 through RAOS-0014). Start with
  \`specs/0000-foundations.md\` — it's the meta-spec every other spec imports:
  \`BuyerContext\`, the conformance ladder, the manifest, \`ReasonEntry\`,
  degradation rules.
- **Namespace root:** every RetailAgentOS capability lives under
  \`com.os.retailagent.shopping.*\` (e.g. \`.eligibility\`, \`.bulk_pricing\`,
  \`.trust\`). Namespace + version is your negotiation key (§2).
- \`/demo\` — a runnable Playground exercising the reference engine end-to-end
  against the same fixtures referenced above.
- \`/evidence\` — the public scorecard: what's built, what's tested, what's not
  claimed yet.
- This repo, \`src/lib/rules\` — the reference evaluation engine
  (\`@retailagentos/engine\`) that produced the example in §6. Deterministic,
  no model in the decision loop: same \`(BuyerContext, manifest, catalog)\` in,
  identical output out, every time.

If you're a person instead of an agent, \`/adopt\` and \`/specs\` are the
human-readable versions of the same material.

---

## 8. Current limits

Native browser WebMCP is shipped for the controlled showcase. A generalized
remote MCP server and production evaluate transport are still designed, not
shipped. Real cryptographic signing, production authentication, persistence,
multi-tenancy, payment, checkout, and order placement are not available here.
`;

export function GET() {
  return new Response(AGENTS_MD, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
}
