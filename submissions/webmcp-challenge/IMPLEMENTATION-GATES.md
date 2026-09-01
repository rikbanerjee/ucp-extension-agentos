# Implementation gates before submission

These are ordered by submission risk, not architectural elegance. All P0 items must be complete before recording the demo.

## P0 — make the WebMCP demo real

### 1. Register the tools from the showcase page

The current `storefront-client.tsx` only checks whether `document.modelContext` exists. It must instantiate `createRetailAgentWebMcp(...)` inside a client lifecycle, call `register()`, store the actual `registeredTools`, and call `dispose()` on cleanup.

Acceptance criteria:

- In a WebMCP-enabled browser, all four enabled tools are discoverable.
- “Tools registered” is based on the returned registration, not feature detection.
- Navigation/unmount aborts registrations and remounting does not create duplicate-name failures.
- An unsupported browser reports “WebMCP unavailable; interactive simulation available,” not “tools registered.”
- Registration failures are visible and actionable.

### 2. Bind a real browser gateway

Create a fetch-backed `RetailAgentGateway` that maps the SDK calls to the existing `/api/showcase/*` routes and forwards the WebMCP abort signal.

Acceptance criteria:

- All non-2xx responses become structured tool failures.
- Buyer context is sent consistently.
- No callback directly imports or reimplements commerce rules.
- Each offer evaluation reaches `evaluateOffer` through the application gateway exactly once.

### 3. Bind visible storefront actions

Implement the SDK's `StorefrontBridge` against page state.

Acceptance criteria:

- `evaluate_offer` can visibly select or focus the evaluated product.
- `prepare_cart` renders a cart the shopper can inspect.
- notifications show the returned reason code and next action.
- agent calls and manual demo controls use the same page state and business gateway.
- `openCheckout` is not exposed as an autonomous tool; checkout requires a user gesture.

### 4. Verify the actual WebMCP contract

Test the current implementation against the current draft API and challenge environment, not a polyfill-only assumption.

Acceptance criteria:

- Uses `document.modelContext`, not deprecated `navigator.modelContext`.
- Uses `registerTool(tool, { signal })`; aborting the signal unregisters it.
- Tool names, descriptions, input schemas, execute functions, annotations, and returned values are accepted by both target test environments.
- The repository README contains a short, visible `document.modelContext.registerTool(...)` example and points to the production abstraction.

### 5. Add WebMCP integration tests

Unit tests for the package exist, but the challenge needs proof of page-level wiring.

Required tests:

- supported page registers four tools;
- unsupported page remains functional;
- unmount aborts registration;
- positive agent tool sequence updates product and cart UI;
- restricted-region evaluation produces no cart;
- quote request returns `fixedPrice: null`;
- duplicate idempotency keys return the same prepared cart;
- route errors do not leave misleading success state.

## P0 — meet the rules

### 6. Choose and add an open-source license

There is no root license. The owner must choose the license; do not let an agent make this legal/product decision implicitly. After choosing, add `LICENSE` at repository root and ensure GitHub detects it in the repository header/About area.

### 7. Create a public challenge repository

The configured origin was not publicly accessible in an unauthenticated check. The final public repository must contain all source, assets, setup instructions, and the root license.

Recommended approach:

- preserve the existing project history;
- commit challenge work in clearly dated, focused commits;
- add a `WebMCP Challenge` section to the top-level README;
- link the live demo, video, challenge package, and exact tested commit;
- verify the repository from a signed-out/private browser.

### 8. Prove meaningful extension during the challenge period

The project predates August 25, 2026. The rules say only work added during the submission period is evaluated and require clear evidence of the extension.

Create or preserve commits for:

1. platform boundary and WebMCP SDK;
2. deterministic showcase gateway and API routes;
3. native storefront registration and visible UI bridge;
4. integration tests and submission documentation;
5. deployment/readiness fixes.

Add a compare link or a table of commit SHAs to the Devpost description. Do not rely only on file modification times.

### 9. Deploy a public HTTPS build

The live URL must open directly at `/agent-ready-storefront` without local setup. If authentication is used, add reliable judge credentials to the private Devpost field.

Acceptance criteria:

- exact tested commit is deployed;
- no secrets are exposed in client code;
- HTTPS and WebMCP are available on the top-level document;
- no Permissions-Policy header disables `tools`;
- API routes work on the hosting provider;
- cold start and repeated runs are reliable;
- the site remains free and accessible through September 21, 2026.

## P1 — make the judging experience obvious

### 10. Add a challenge-specific demo panel

Above the fold, show:

- one plain-language sentence explaining the outcome;
- native WebMCP status;
- the exact four registered tools;
- three copyable agent prompts;
- a visible event timeline populated by actual tool callbacks;
- an explicit “checkout requires shopper confirmation” label.

### 11. Add a technical disclosure panel

Progressively disclose:

- `document.modelContext` registration;
- tool schemas and annotations;
- engine decision and reason codes;
- the distinction between owned storefront and Etsy handoff mode;
- experimental status and current non-production limitations.

### 12. Add challenge metadata and sharing assets

- Page metadata and Open Graph title/description/image.
- 16:9 cover image with readable title at thumbnail size.
- Three screenshots matching the positive, blocked, and quote paths.
- Alt text for every image.

## P2 — useful after submission, not required for the challenge proof

- Live TheCustomHub repository integration.
- Etsy OAuth and catalog synchronization.
- Production multi-tenancy, authentication, rate limiting, persistence, and payments.
- Merchant analytics and zero-code connector onboarding.

Do not let P2 work delay the P0 native WebMCP proof.
