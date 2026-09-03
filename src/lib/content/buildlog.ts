export interface BuildLogEntry {
  id: string;
  week: string;
  date: string;
  current?: boolean;
  title: string;
  shipped: string;
  narrative: string;
  /** Optional: id of a diagram component to render between narrative and bullets. See buildlog/page.tsx's DIAGRAMS map. */
  diagramId?: string;
  bullets: string[];
  proves: string;
  next?: string;
  evidence?: Array<{
    label: string;
    href: string;
    description?: string;
  }>;
}

export const buildLog: BuildLogEntry[] = [
  {
    id: 'webmcp-judge-navigation-identity-2026',
    week: 'Challenge-period work · Official window: Aug 25–Sep 3, 2026',
    date: 'Sep 2, 2026',
    current: true,
    title: 'Focused challenge navigation, page identity, and persistent demo discoverability',
    shipped: 'Route-specific challenge chrome on the WebMCP Live Demo, a business-first page identity, a compact challenge footer, canonical metadata shared with the compatibility route, judge anchors with accessible focus, a global WebMCP Live Demo link, and optional video-link configuration',
    narrative:
      'A judge landing on the demo met the whole company website: a five-dropdown Product / Solutions / Developers / Evidence / About header and a four-column corporate footer whose loudest message was UCP. The page\'s own identity was a single eyebrow line, its only in-page anchor was unreferenced by any navigation, and there was no compact business comparison a retail executive could read in under a minute. A judge who browsed anywhere else had no visible route back — the demo was buried in the Developers dropdown as "WebMCP implementation". None of the WebMCP behavior was wrong; the framing was. AppShell.tsx, already the single place route shape is decided, now also selects the chrome: the canonical /webmcp-showcase and compatibility /agent-ready-storefront routes get a focused challenge header and compact footer, every other route keeps the normal platform navigation and footer, and because exactly one header and one footer component is chosen the two systems can never both render. There is no route group, no nested layout, and no second showcase component — both routes still render the one storefront-client instance, so nothing in the WebMCP registration lifecycle moved. The page now leads with the OpenAI WebMCP Challenge eyebrow, the "RetailAgentOS WebMCP Agent Storefront" product label, and the outcome headline, followed by a compact action group whose primary CTA only scrolls to the mission launcher — it never starts native WebMCP or guided replay. A new "Why the storefront becomes meaningfully better with WebMCP" section sits between the live mission and Developer Evidence. Along the way one real layout bug surfaced: body is a fixed-height column flex container, so AppShell\'s wrapper was being shrunk back to one viewport while its content overflowed, and that capped wrapper was the sticky header\'s containing block — the header stopped sticking about one viewport down the page until the wrapper was allowed to grow to its content height.',
    bullets: [
      'src/components/layout/AppShell.tsx swaps NavBar/Footer for a new ShowcaseHeader/ShowcaseFooter on /webmcp-showcase and /agent-ready-storefront only — one header and one footer per route, so the company and challenge navigation systems are never both present, and every other route is unchanged.',
      'The focused header carries RetailAgentOS identity, a text-only "OpenAI WebMCP Challenge" badge (no endorsement claim, no OpenAI mark), and Run Demo / How It Works / Developer Evidence / GitHub / Back to RetailAgentOS, collapsing to one accessible menu button at the same lg breakpoint NavBar uses — with aria-expanded, Escape-to-close, close-on-selection, and no horizontal overflow at 320px.',
      'Judge anchors #webmcp-mission (renamed from mission-launcher rather than duplicated), #why-webmcp, and #developer-evidence are focusable, aria-labelledby-named, and scroll-margin-offset for the sticky header; navigation is plain fragment navigation with no timers, no scripted scrolling, and nothing conflated with WebMCP invocation telemetry. Smooth scrolling is scoped to the showcase routes and disabled under prefers-reduced-motion.',
      'Both routes share one metadata object — title "RetailAgentOS WebMCP Agent Storefront | OpenAI WebMCP Challenge", the canonical description, canonical URL https://www.retailagentos.com/webmcp-showcase, and the repository\'s existing verified og-image — so the compatibility route can never present a competing canonical or a divergent title.',
      'The Developers navigation item is renamed "WebMCP implementation" → "WebMCP Live Demo" and a compact WebMCP Live Demo pill sits beside (never instead of) the "See it work" CTA; measured at the lg breakpoint the desktop bar is 930px of content in 960px of available width — no wrap, no overflow.',
      'The optional demo video is read once from NEXT_PUBLIC_WEBMCP_VIDEO_URL through a validating helper: anything that is not an absolute https URL yields null and the "Watch video" button is simply absent — never a placeholder, a # link, or an unactionable "coming soon".',
    ],
    proves:
      'A challenge judge can identify, run, understand, and leave the WebMCP demo without meeting the whole company information architecture — and can always find it again from any other page — while the broader RetailAgentOS platform navigation, the business-first story, and every native and guided WebMCP behavior stay exactly as they were.',
    next:
      'The production site is live at https://www.retailagentos.com/webmcp-showcase, the public WebMCP demo video is published at https://youtu.be/aIScR90pSb0 (2:56, inside the challenge three-minute limit), and NEXT_PUBLIC_WEBMCP_VIDEO_URL is configured in the production deployment — the Watch video action renders on the live page. The deployed-origin acceptance walkthrough was run by the maintainer in ChatGPT\'s in-app browser on Sep 2, 2026 against build 5257759 and completed as designed; it is recorded on that report, since a browser run outside this repository cannot be reproduced from it. What remains is the Devpost submission itself, then freezing the repository, the production application, the video, and the submission.',
    evidence: [
      { label: '4790f74', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/4790f74', description: 'Focused challenge navigation and page identity (merged to main).' },
      { label: 'b0550a8', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/b0550a8', description: 'Documentation provenance recording 4790f74 as this pass\'s evidence commit — not a product change.' },
    ],
  },
  {
    id: 'webmcp-correctness-gap-closure-2026',
    week: 'Challenge-period work · Official window: Aug 25–Sep 3, 2026',
    date: 'Sep 1, 2026',
    current: false,
    title: 'Server-side cart-idempotency, dispose-during-cleanup, and recoverable fallback failure',
    shipped: 'A second, decision-scoped server-side idempotency layer for cart preparation, dispose() that always aborts every controller (even a still-pending superseded one), a replaced stale-cleanup test against a real REPAIRABLE→ELIGIBLE→REPAIRABLE transition, and an explicit, never-automatic retry path for a failed guided-fallback cart preparation',
    narrative:
      'The prior native-handoff-hardening pass\'s own report flagged four items as incomplete: its cross-agent recovery lock was client-side single-flight only, not a true server-side idempotency/conflict boundary; its "stale cleanup" test drove a same-state no-op transition that never actually exercised cleanup; dispose-during-pending-cleanup was uncovered; and a failed fallback attempt had no recovery path. This pass closes all four without changing the successful registration-before-return architecture. ShowcaseGateway.prepareCart (src/lib/showcase/gateway.ts) now has a second idempotency layer, cartsByDecision, keyed by storefrontId+storefrontSessionId+eligible decisionId with a stored canonical line fingerprint — independent of the caller-supplied idempotency key, which stays a first, unchanged layer. A native call and a guided-fallback replay racing to prepare a cart for the identical decision and lines, each minting its own idempotency key, now converge on the exact same stored cart reference (before this pass they would have produced two different cart references, since the reference was derived from the caller\'s own key). packages/webmcp/src/index.ts now routes every phase-generation cleanup — the normal deferred tick, dispose(), and a new proactive same-name-collision path — through one function, performCleanup(), which always aborts its controller first, unconditionally, before any telemetry/state-mutation suppression; dispose() now also aborts any generation still pending its deferred tick and clears tool-generation bookkeeping. The proactive path is itself a real fix: a rapid REPAIRABLE → approved apply_plan_repair → ELIGIBLE → immediate re-evaluate back to REPAIRABLE (before the first transition\'s cleanup tick fires) would otherwise attempt to register a tool name a real strict WebMCP host still considers registered; the replaced test proves this against a fake registry that throws on a duplicate name. Finally, storefront-client.tsx now tracks cart-preparation state (idle/invoking/failed/prepared) distinct from mere invocation attribution, so a failed or cancelled attempt that produced no cart releases the single-flight lock and shows a truthful, bounded error with an explicit "Retry guided cart preparation" button — never retried automatically — instead of permanently disabling the recovery button after one failure.',
    bullets: [
      'src/lib/showcase/gateway.ts: ShowcaseGateway.prepareCart gains a second idempotency layer, cartsByDecision (keyed by storefrontId+storefrontSessionId+decisionId, storing a canonical order-independent line fingerprint and the resulting CartResponse), alongside the unchanged pre-existing caller-idempotency-key cache — native and guided-fallback preparation for the same decision+lines now converge on one cart; no checkout/order/payment behavior changes.',
      'packages/webmcp/src/index.ts: every superseded phase generation is tracked in pendingCleanups and torn down through one performCleanup() function that always aborts its controller unconditionally first — called from the normal deferred setTimeout(0) tick, from dispose() (for every still-pending generation, even mid-cleanup), and proactively/synchronously from activatePhase() right before registering a tool name that collides with a still-pending stale generation.',
      'packages/webmcp/src/index.test.ts: the old repairable→repairable no-op "stale cleanup" test (which never actually exercised cleanup) is replaced with a real REPAIRABLE → approved apply_plan_repair → ELIGIBLE → immediate re-evaluate back to REPAIRABLE transition against a fake ModelContext that throws on a duplicate tool-name registration, plus a new dispose-immediately-after-registration test asserting the fake native registry becomes completely empty.',
      'src/app/agent-ready-storefront/storefront-client.tsx and ShopperApprovalCard.tsx: a new cartPreparationState (idle/invoking/failed/prepared), distinct from invocation attribution, releases the single-flight lock and shows a truthful, bounded "Cart preparation failed" banner with an explicit "Retry guided cart preparation" button on a failed/cancelled attempt with no cart — verified end to end with a stubbed first-call network failure followed by a successful explicit retry.',
    ],
    proves:
      'Cart preparation is idempotent and conflict-safe at the trusted server boundary (not just a client-side lock), every WebMCP registration controller is guaranteed aborted even when dispose races a pending cleanup tick, the registration-before-return handoff cannot present a real host with a duplicate tool-name registration during a rapid re-transition, and a shopper is never left staring at a permanently broken recovery button after one transient failure.',
    next:
      'Independent verification of the idempotency-convergence and fallback-retry UX against a real Codex Browser or ChatGPT in-app browser session remains outstanding — this pass verified them at the unit/integration-test level only.',
    evidence: [
      { label: '12f8ba0', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/12f8ba0', description: 'The commit on main that carries this pass — server-side cart idempotency, unconditional registration-controller cleanup, and the explicit cart-preparation retry path — alongside the native-handoff-hardening pass below.' },
      { label: '0b0b71a', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/0b0b71a', description: 'The follow-on WebMCP challenge showcase hardening on main: bounded catalog search ranking, the named $30 breakfast mission, and submission-document consolidation.' },
    ],
  },
  {
    id: 'webmcp-native-handoff-hardening-2026',
    week: 'Challenge-period work · Official window: Aug 25–Sep 3, 2026',
    date: 'Sep 1, 2026',
    current: false,
    title: 'Deterministic post-approval native handoff, cross-agent recovery, and two build fixes',
    shipped: 'Registration-before-return in the WebMCP SDK, an enriched apply_plan_repair continuation contract, corrected approval-card chronology, an explicit cross-agent recovery state, a fixed platform-contracts declaration build, and a tablet nav-overflow fix',
    narrative:
      'A cross-agent run (a ChatGPT browser agent, distinct from the Codex Browser run that completed the native flow) stopped right after the shopper clicked Approve, with prepare_validated_cart never invoked even though RetailAgentOS had already reached an eligible decision. The root cause was a registration race in packages/webmcp/src/index.ts: apply_plan_repair\'s successful result was returned to the calling browser agent via a deferred (setTimeout(0)) state transition, so prepare_validated_cart\'s registerTool() call — and the browser\'s own tool-change notification for it — could still be outstanding at the moment the agent received the repair result. Some agent hosts rediscover a newly registered tool on their own; this one apparently did not continue automatically. This pass restructures phase activation so every next-phase tool is registered and awaited *before* the triggering tool\'s execute() call returns, while only the previous phase\'s cleanup (including the currently-executing tool\'s own registration) is deferred — using per-tool generation tokens so a late cleanup can never remove a same-named tool a newer transition already re-registered. Native and guided (registration.invoke()) execution still call the identical descriptor/gateway handlers, and the source: \'native\'/\'replay\' telemetry attribution is unchanged. apply_plan_repair\'s result now also carries a concise top-level continuation (decisionId, lines, allowedNextActions, nextAction) alongside the preserved nested decision/repair objects. The approval card\'s sequence is reordered to the true chronology (approval → capability registration → prepare_validated_cart invocation → RetailAgentOS validation), and a new explicit, truthfully-labelled recovery path appears if ~5s pass after registration with no invocation: a copyable continuation prompt, and a "Guided fallback · Same RetailAgentOS handler · External browser agent paused" button that only a shopper click can trigger, tagged source: \'replay\' like every other guided call. Separately, packages/platform-contracts\'s tsup build was silently inheriting the root tsconfig\'s incremental: true and failing its declaration build; it now builds from its own tsconfig.build.json. The desktop nav in src/components/layout/NavBar.tsx switched its breakpoint from md (768px) to lg so a 768px tablet viewport gets the hamburger drawer instead of a too-narrow desktop nav row.',
    bullets: [
      'packages/webmcp/src/index.ts: next-phase tool registrations are fully awaited before an executing phase tool\'s execute() call returns (activatePhase); only the superseded phase\'s cleanup is deferred to a following tick, and per-tool generation tokens (toolGeneration) stop a late cleanup from ever removing a newer same-named registration.',
      'apply_plan_repair\'s successful result now includes a top-level continuation contract — status, code: REPAIR_APPLIED, decisionId, allowedNextActions: [\'prepare_validated_cart\'], nextAction, and cartCreated/checkoutAvailable/checkoutStarted/orderPlaced: false — alongside the preserved nested decision/repair/lines fields.',
      'ShopperApprovalCard\'s completed sequence is reordered to the true chronology — human approval, then "WebMCP capability: Cart preparation registered", then the "prepare_validated_cart invocation" step (native/guided/waiting), then "RetailAgentOS validation" — and the third step is never marked done by the approval click itself.',
      'A new cross-agent recovery state appears only after the capability is genuinely registered, no invocation or cart exists, and ~5s have elapsed: a "waiting" message, then a "paused" message with a copyable continuation prompt and an explicit-click-only "Guided fallback · Same RetailAgentOS handler · External browser agent paused" button (source: \'replay\'), single-flight guarded against a native agent resuming at the same moment.',
      'A native registration-timing test (packages/webmcp/src/index.test.ts) drives apply_plan_repair through approval with prepare_validated_cart\'s registration held pending via a controllable fake ModelContext, and asserts apply_plan_repair does not resolve until that registration settles, and that prepare_validated_cart is immediately invocable afterward with no settleRegistry() call — plus generation-token, registration-failure, decline, reset-during-approval, and guided-parity coverage.',
      'packages/platform-contracts/tsup.config.ts now builds against its own tsconfig.build.json (incremental: false, composite: false) instead of silently inheriting the root Next.js tsconfig, fixing a previously-failing standalone declaration build.',
      'src/components/layout/NavBar.tsx keeps the hamburger/drawer navigation active through tablet widths and switches to the full desktop nav + CTA only at the lg breakpoint, fixing overflow around a 768px viewport with no two simultaneously visible navigation systems.',
    ],
    proves:
      'A registration-before-return handoff, verified by a controllable-timing unit test, makes the native post-approval journey deterministic for any compliant browser agent — without weakening RetailAgentOS policy enforcement, the human approval gate, or native/guided attribution truthfulness, and while fixing two unrelated build/layout defects surfaced during the same pass.',
    next:
      'At the time of this pass, independent verification against a real Codex Browser or ChatGPT in-app browser session (only claude-in-chrome-based testing was available in this environment) and acceptance against the deployed origin both remained outstanding. Both have since been satisfied: the maintainer completed the full journey in ChatGPT\'s in-app browser against the deployed origin on Sep 2, 2026. See specs/WEBMCP-PLATFORM-BUILD.md for exact status.',
    evidence: [
      { label: '12f8ba0', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/12f8ba0', description: 'Deterministic native WebMCP approval-to-cart handoff (merged to main).' },
    ],
  },
  {
    id: 'webmcp-submission-hardening-2026',
    week: 'Challenge-period work · Official window: Aug 25–Sep 3, 2026',
    date: 'Sep 1, 2026',
    current: false,
    title: 'Submission-hardening pass: grouped telemetry, a real approval sequence, and a truthful decision summary',
    shipped: 'Mission Control grouping, completed-approval sequence, cart-state-aware decision copy, canonical Farm Eggs fixture, unit×line-total display, and a 320px layout fix',
    narrative:
      'A code review of the Aug 30–31 challenge work and the following judge-facing/cart-revision passes found a batch of correctness and polish gaps: Mission Control could show duplicate identical rows for a single registration wave, the shopper-approval card vanished the instant it was clicked instead of showing a completed state, the Decision Summary kept showing stale "ready to prepare" copy after a cart already existed, the shared mock catalog\'s split product/variant titles caused Farm Eggs to mislabel its quantity unit as generic "each," the revised cart showed a bare total with no unit price once quantity was 2, and the footer overflowed horizontally at a 320px viewport. This pass fixed all of them without touching engine decision logic, verified end-to-end against a real document.modelContext in Chrome (not feature detection), and added or extended tests for every fix.',
    bullets: [
      'Mission Control groups consecutive raw registered/unregistered events from the same registration wave into one business-readable row ("WebMCP exposed 3 planning capabilities") while Developer Evidence still renders every raw event unmodified.',
      'The shopper-approval card now shows a completed "Approved by shopper" state, then a real telemetry-driven "Cart preparation unlocked" step, then correctly attributed native/guided invocation — never a UI click relabeled as a WebMCP invocation.',
      'Decision Summary now shows CART_PREPARED/CART_REVISED copy straight from the gateway response once a cart exists, instead of the underlying plan decision\'s now-stale ELIGIBLE "ready to prepare" text.',
      'Farm Eggs has one canonical, self-contained title ("Farm Eggs, dozen") and a correct "1 dozen" quantity unit, sourced from the showcase fixture through an explicit per-variant map instead of a fragile title-substring heuristic.',
      'The revised cart shows unit price × quantity = line total (e.g. "$8.50 × 2 = $17.00") whenever a line quantity is greater than 1.',
      'Fixed a 320px horizontal-overflow bug in the site footer (an un-wrapped developer-links row).',
      'Verified live against a real native document.modelContext in Chrome: the full Fresh Corner approve → CART_PREPARED → CART_REVISED journey, with Mission Control grouping and Decision Summary copy confirmed correct throughout.',
    ],
    // Evidence below lists the commits this pass builds on. This pass's own changes are committed
    // as 5b1603e on main (see specs/WEBMCP-PLATFORM-BUILD.md's "Current submission status").
    proves:
      'A truthfulness- and UX-focused review pass can close real correctness and polish gaps in a shipped WebMCP surface without touching the deterministic engine or reintroducing any of the native/guided or approval-attribution invariants the earlier passes established.',
    next:
      'Independent Chrome/origin-trial QA on the deployed origin, a generalized remote MCP server, production authentication/persistence/rate limits/multi-tenancy, and real cryptography remain separate work.',
    evidence: [
      { label: '92753e5', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/92753e5', description: 'Initial browser adapter, descriptors, package, and gateway.' },
      { label: 'd094e12', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/d094e12', description: 'Canonical route and purchase-plan showcase documentation.' },
      { label: 'e464bb8', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/e464bb8', description: 'Showcase hardening and lifecycle evidence.' },
      { label: 'd9a5eb5', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/d9a5eb5', description: 'Judge-facing WebMCP showcase UX and truthfulness fixes.' },
      { label: '0228160', href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/0228160', description: 'Optional revise_validated_cart cart-revision extension.' },
    ],
  },
  {
    id: 'webmcp-challenge-2026',
    week: 'Challenge-period work · Official window: Aug 25–Sep 3, 2026',
    date: 'Aug 30–31, 2026',
    current: false,
    title: 'RetailAgentOS becomes operable through native browser tools',
    shipped: 'Native browser WebMCP showcase + canonical seven-tool catalog',
    narrative:
      'The UCP manifest, deterministic engine, external/client adapters, and projections were already in place before this challenge work began. On Aug 30, I added the browser-local WebMCP delivery layer: a controlled storefront showcase that registers the same canonical descriptors it can replay, while keeping commerce decisions in the engine. The Aug 31 hardening pass made the registration lifecycle and proof surfaces more explicit, then rebuilt the judge-facing activation experience so a first-time visitor can watch the mission without opening DevTools, fixed a telemetry bug where a guided-mission call could be mislabeled native purely because a browser supported document.modelContext, and fixed TheCustomHub so a requested delivery date reaches merchant-review quote status instead of an incorrect delivery-window dead end. This is not a claim that a generalized remote MCP server is live.',
    bullets: [
      'Native browser WebMCP registration is available at /webmcp-showcase through document.modelContext when supported, with a clearly labelled deterministic replay fallback.',
      'One seven-tool descriptor catalog drives native registration and replay; phase tools register dynamically and registrations abort on reset, scenario change, and unmount.',
      'A judge-facing Mission Control timeline translates real registration/invocation/decision telemetry into plain retail language, with technical detail progressively disclosed — no hard-coded success sequence.',
      'Guided replay is explicit per invocation (never inferred from browser capability): a guided call is always labelled replay, even when a native model context is present, so the two paths can never be mislabeled as each other.',
      'TheCustomHub with a delivery request within 15 days now reaches QUOTE_REQUIRED with the request carried forward as merchant confirmation required, instead of incorrectly blocking on an unsupported delivery window.',
      'Fresh Corner and TheCustomHub are controlled fixtures. TheCustomHub is quote-only; checkout, payment, order placement, authentication, and marketplace control are not exposed.',
      'The generalized remote/server MCP design remains a separate, unshipped architecture.',
    ],
    proves:
      'A browser agent can discover and invoke controlled local shopping actions without duplicating policy logic in React or presenting a fixture as a production merchant integration.',
    next:
      'Independent Chrome/origin-trial QA, stronger judge-facing evidence, a generalized remote MCP server, production authentication/persistence/rate limits/multi-tenancy, and real cryptography remain separate work.',
    evidence: [
      {
        label: '92753e5',
        href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/92753e5',
        description: 'Initial browser adapter, descriptors, package, and gateway.',
      },
      {
        label: 'd094e12',
        href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/d094e12',
        description: 'Canonical route and purchase-plan showcase documentation.',
      },
      {
        label: 'e464bb8',
        href: 'https://github.com/rikbanerjee/ucp-extension-agentos/commit/e464bb8',
        description: 'Showcase hardening and lifecycle evidence.',
      },
    ],
  },
  {
    id: 'week-7',
    week: 'Week 7',
    date: 'August 2026',
    current: false,
    title: 'The manifest said one thing, the engine did another',
    shipped: 'Manifest projection fixed + region allowlist folded into the engine',
    narrative:
      "TheCustomHub pilot audit found the failure mode I was most worried about: not a missing feature, but two true things quietly disagreeing. buildManifest() was a bare pass-through — it never copied a merchant's endpoints or servesRegions into the document an agent actually reads, so an agent had no reliable way to find checkout or know which regions were served. Worse, evaluateOffer() — the shared engine every integration is supposed to call — never enforced the region allowlist at all. It only worked because one pilot partner had bolted a manual pre-check onto their own server, outside the engine. Any other integration got silent, unenforced region gating. For an agent placing an order unattended, that's not a rough edge — it's the difference between a merchant's declared rules and what the merchant actually does.",
    diagramId: 'manifest-engine-fix',
    bullets: [
      "buildManifest() now composes endpoints + servesRegions into the manifest instead of passing profile.manifest through untouched — the /.well-known/ucp document is complete by construction",
      'servesRegions is now a required field on MerchantProfile — TypeScript refuses to compile a merchant profile that forgot to declare where it ships',
      'Region allowlist enforced as a short-circuit inside evaluateOffer() itself — every caller of the shared engine gets region enforcement, not just the one partner who remembered to pre-check',
      "Undeclared servesRegions (JS/JSON callers only, past the TypeScript gate) isn't silently permissive — a one-time REGION_POLICY_UNDECLARED (INFO) reason surfaces on the manifest, and Tier 1 conformance now requires the field",
      '348 tests passing (+20) — engine bumped to 0.2.0 as a breaking change: required field, manifest shape, and evaluateOffer behavior all changed',
    ],
    proves:
      "Declaration and enforcement have to be the same code path, or they drift — a rule that's merely documented and separately re-implemented per integration will eventually diverge, not from malice but because \"remembered to pre-check\" doesn't scale past one partner.",
    next: 'The engine and specs are real, tested, and now closing the gaps a real pilot surfaces rather than the gaps I imagined in advance. Next: the remaining Track B closeout items, then the same discipline applied to the generalized remote/server MCP and crypto signing seams already flagged as simulated.',
  },
  {
    id: 'week-6',
    week: 'Week 6',
    date: 'June 2026',
    title: 'One front door, one story',
    shipped: 'Guided demo rebuilt + reference cookbook live',
    narrative:
      "At some point you have to face the gap between what you've built and what someone new can absorb in sixty seconds. The engine was real, the specs were live, the playground was rich — and still I was watching people bounce. The problem wasn't the work; it was the entry point. So I stopped adding and started cutting, rebuilding the guided experience around a single question: what happens to a real shopper in a world where the agent knows the rules upfront, versus one where it doesn't? That contrast, told as one story, turned out to be the thing that lands.",
    bullets: [
      "Guided demo rebuilt around one shopper, two worlds — agent hits a dead end at checkout vs. agent that's told the rules upfront and can unlock the path",
      'Three follow-on scenes: right price upfront (promo surfaced before cart), can-it-ship-here (region block surfaced early), and will-the-quote-hold (price honored at checkout)',
      'Audience fork at the end — retailers and builders each land somewhere that speaks to them',
      'Nav entry simplified to "See it (90s)" — the primary front door is now unambiguous',
      'Stale secondary landing page retired; one canonical entry into the guided experience',
      'Reference cookbook live at /sandbox/reference — each spec\'s minimal implementation runs against the real engine, copy-pasteable, and guaranteed to stay in sync with the rules',
    ],
    proves:
      'A tool people can\'t enter in thirty seconds isn\'t ready yet, no matter how much is working underneath it.',
    next: 'The engine and the specs are real. The remaining seam is that crypto signing and the generalized remote/server MCP are still running behind simulated or designed interfaces. The next honest step is making those real — a hosted server that agents can actually query, and signatures that a third party can verify.',
  },
  {
    id: 'week-5',
    week: 'Week 5',
    date: 'June 2026',
    title: 'The specs become executable',
    shipped: 'Deterministic pipeline + Decision Trace + provenance envelope',
    narrative:
      "Publishing specs is easy. The harder question is whether the rules in the spec and the rules the engine actually runs are the same thing — and whether you can prove it. I spent this week collapsing that gap: building a staged reasoning pipeline (visibility, then eligibility, then price, then fulfillment, then quote) that runs exactly what the specs describe, backed by a test suite so the same inputs always produce the same answer. The output isn't just a decision anymore. It's a decision with a provenance tag — who issued it, when, how fresh the underlying data is — and a three-audience explanation: plain language for the shopper, action steps for the merchant, raw detail for the developer.",
    bullets: [
      'Staged reasoning pipeline: visibility → eligibility → pricing → fulfillment → quote, in that order, deterministic',
      'Full test coverage — the same inputs always produce the same outputs, no surprises at integration time',
      'Provenance envelope on every answer: issuer, timestamp, per-stage TTL, and a staleness flag agents can act on',
      'Price-lock quote: the price an agent sees is the price honored at checkout, with a configurable lock window',
      'Three-audience Decision Trace — one decision, explained three ways: plain language (shopper), operational (merchant), structured detail (developer)',
      'Crypto signing and the generalized remote/server MCP are behind designed interfaces — but still simulated or unshipped, not production keys or transport. The seam is clearly marked.',
    ],
    proves:
      'A spec that isn\'t testable is just a wish. The moment the same inputs always produce the same answer, you have something buildable.',
  },
  {
    id: 'week-4',
    week: 'Week 4',
    date: 'May 2026',
    title: 'The specs go live',
    shipped: 'Seven open specs published as versioned, linkable pages',
    narrative:
      "The drafts had been sitting in the repo for a while — close enough to share, not quite right to ship. I kept finding reasons to wait: one more example, one more edge case, one more pass on the reason codes. Eventually I realized the waiting was the problem. Specs that only exist in a private folder can't attract the disagreement they need to get better. So I pushed them live, open questions and all: Foundations, Eligibility and Visibility, Contextual Pricing, Inventory and Availability, Quote Integrity, Trust and Provenance, and a Decision Trace spec. Each one has a reason-code vocabulary, worked examples across all three merchant archetypes, and the open questions I genuinely don't have answers to.",
    bullets: [
      'Seven specs published as first-class, linkable pages — each versioned and permalinkable',
      'Spec index page at /specs with status labels (draft, review, stable)',
      'Reason-code registries: machine-readable short codes for every visibility, eligibility, pricing, and fulfillment outcome',
      'Worked examples for all three merchant archetypes (boutique, wholesaler, grocer) in each spec',
      'Open questions surfaced inline — I\'m not pretending these are settled',
      'Decision Trace spec: the three-audience format defined before it was implemented',
    ],
    proves:
      'Drafts that live only in a private repo can\'t be challenged. Pushing with open questions is more honest — and more useful — than waiting for a version that feels finished.',
    next: 'Week 5 — making the specs executable: the reasoning pipeline runs what the specs describe, and a test suite proves it.',
  },
  {
    id: 'week-3',
    week: 'Week 3',
    date: 'May 2026',
    title: 'Build in public layer',
    shipped: 'Build Log + audience layer',
    narrative:
      "I hit the point where the next decisions — what the specs should say, who configures this layer — aren't ones I can answer alone, or honestly want to. So I stopped polishing toward a launch and started showing the work as it happens, open question and all.",
    bullets: [
      '/buildlog page — chronological record of what ships each week',
      'Homepage updated with building-in-public signal and ecosystem framing',
      '"Where RetailAgentOS fits" — stacked visual showing UCP rails → gap → reasoning layer',
      'Global footer with Follow the Build, three audience doors, and founder identity',
      'Agent-Readiness diagnostic added to /for-merchants — shareable rubric for leaders',
      'Plain-language "Why" line on Playground decisions — makes the gap visible in real time',
    ],
    proves:
      'The right way to grow this audience is through transparent iteration and visible reasoning, not polished launches.',
    next: 'Week 4 — the Specs page: publishing the first open spec (Eligibility & Visibility Semantics) on-site — versioned, with a reason-code registry and open questions for comment. The drafts already live in /specs in the repo; next is making them a first-class, linkable surface. The Agent Reasoning Console (Phase 2) follows.',
  },
  {
    id: 'week-2',
    week: 'Week 2',
    date: 'May 2026',
    title: 'Dual-narrative site redesign',
    shipped: 'Business/Technical toggle',
    narrative:
      "Showing the early build to people, I kept watching the same split: merchants wanted to know what it did for their store, builders wanted to know how it worked. Trying to serve both in one voice served neither, so I gave the site two lenses instead of watering down one.",
    bullets: [
      'Business / Technical toggle across all pages — two audiences, one platform',
      'Business mode leads with merchant value and implementation direction',
      'Technical mode preserves the learning journey and spec framing',
      '"Get Visible to Agents" merchant page with five service tiers (Audit → Managed Pilot)',
      'RetailAgentOS vision page with dual narrative and six-phase roadmap',
    ],
    proves:
      'The same platform story works for both merchants and builders — they just need different lenses.',
    next: 'Build-in-public layer: make the site a living artifact, not a finished product.',
  },
  {
    id: 'week-1',
    week: 'Week 1',
    date: 'May 2026',
    title: 'Core UCP extension demo',
    shipped: 'UCP merchant profile + context simulator',
    narrative:
      "I wanted to know if one idea would actually hold: that the same protocol foundation could carry three completely different merchants — a boutique, a wholesaler, a grocer — without bending. So I built the smallest thing that could prove or break it, with the rules and the machine payloads visible side by side.",
    bullets: [
      'Merchant profile viewer with UCP capabilities and vendor-scoped extension declarations',
      'Three merchant archetypes: Sara\'s Boutique (discovery), B&T Wholesale (qualification), Fresh Corner Market (contextual offers)',
      'Context simulator — customer type, region, fulfillment mode, quantity controls',
      'Context-driven visibility, eligibility, pricing, bulk semantics, fulfillment constraints',
      'Dual human + machine payloads in the Playground inspector',
    ],
    proves:
      'The same UCP foundation can express radically different merchant behaviors based on context — and those differences are machine-readable.',
  },
];
