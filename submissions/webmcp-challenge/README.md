# RetailAgentOS WebMCP Challenge submission package

This package turns the current RetailAgentOS WebMCP work into a judge-ready story, demo, and compliance checklist for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/) on [Devpost](https://webmcp.devpost.com/).

## The submission in one sentence

RetailAgentOS turns a retailer-owned website into a safe, agent-operable storefront: an AI agent can search products, check the retailer's actual selling rules, prepare a visible cart, and request a custom quote without guessing a price or taking checkout away from the shopper.

## Deadline

Submit by **September 3, 2026 at 1:00 p.m. Pacific / 4:00 p.m. Eastern**. Do not plan to upload at the deadline; target a final Devpost draft and public video by September 2.

## Honest readiness status — August 30, 2026

The concept, deterministic commerce engine, four-tool WebMCP SDK, local gateway, API routes, and interactive storefront showcase exist in the working tree. The submission itself is **not ready to send yet**.

| Gate | Current evidence | Status |
|---|---|---|
| Non-trivial WebMCP implementation | `@retailagentos/webmcp` defines and registers four tools | In progress |
| Native tools on showcase page | Page detects `document.modelContext`, but does not call the SDK registration lifecycle | **Blocking** |
| Agent-driven visible UI update | SDK has storefront bridge callbacks; showcase has not wired them to page state | **Blocking** |
| Working live URL | No judge-accessible URL is recorded in this repository | **Blocking** |
| Public source repository | Configured GitHub URL returned 404 to an unauthenticated request on August 30 | **Blocking** |
| Root open-source license | No root `LICENSE` file found | **Blocking** |
| Under-three-minute public YouTube demo | Script and runbook are prepared; recording is not | **Blocking** |
| Existing-versus-new evidence | WebMCP changes are visible locally but currently uncommitted | **Blocking** |
| Paste-ready submission narrative | Included in this package | Ready after links are filled |

Do not describe the current button-driven fallback as a native WebMCP invocation. It is useful for ordinary browsers, but the challenge demo must show an agent discovering and invoking the registered tools.

## Recommended submission identity

- **Name:** RetailAgentOS WebMCP Agent Storefront
- **Tagline:** Let shopping agents use a retailer's real catalog and selling rules—without guessing or taking control from the shopper.
- **Navigation label (site-wide):** WebMCP Live Demo
- **Canonical route:** `/webmcp-showcase` (compatibility route: `/agent-ready-storefront`)
- **Route chrome:** both routes render focused challenge chrome — RetailAgentOS identity, an "OpenAI WebMCP Challenge" badge, and Run Demo / How It Works / Developer Evidence / GitHub / Back to RetailAgentOS — plus a compact challenge footer. Every other route keeps the normal RetailAgentOS platform navigation and footer.
- **Primary audience:** Independent and mid-market retailers with owned storefronts.
- **Demonstrated merchant:** A clearly labelled TheCustomHub-style local fixture, not a claimed live TheCustomHub integration.
- **Core proof:** One positive purchase-preparation path, one policy block, and one call-for-price quote path.

## Package map

1. [`DEVPOST-SUBMISSION.md`](./DEVPOST-SUBMISSION.md) — paste-ready title, tagline, description, implementation story, and link placeholders.
2. [`IMPLEMENTATION-GATES.md`](./IMPLEMENTATION-GATES.md) — exact work required before this can be submitted truthfully.
3. [`DEMO-RUNBOOK.md`](./DEMO-RUNBOOK.md) — test prompts, expected calls, expected UI behavior, and failure policy.
4. [`VIDEO-SCRIPT.md`](./VIDEO-SCRIPT.md) — a timed 2:50 narration and shot list.
5. [`JUDGING-MAP.md`](./JUDGING-MAP.md) — evidence mapped to all four equally weighted criteria.
6. [`TECHNICAL-EVIDENCE.md`](./TECHNICAL-EVIDENCE.md) — architecture, tool inventory, safety model, code evidence, and honest limitations.
7. [`SUBMISSION-CHECKLIST.md`](./SUBMISSION-CHECKLIST.md) — rules, assets, testing, ownership, and final form checks.

## Final assembly order

1. Wire and verify native WebMCP registration on the showcase route.
2. Make an explicit open-source license choice and add it at repository root.
3. Commit the post-August-25 WebMCP work with a clear history and create a public repository.
4. Deploy the exact commit and keep it available through the judging period.
5. Run the three demo scenarios in ChatGPT's in-app browser and Chrome with WebMCP enabled.
6. Record the 2:50 video from a clean session, add captions, and publish it on YouTube.
7. Add the real URLs and commit SHA to the Devpost copy.
8. Save a Devpost draft, test every link in a signed-out browser, then submit.

## Source-of-truth warning

The official rules govern. Re-check the [challenge rules](https://webmcp.devpost.com/rules) immediately before submission, especially eligibility, ownership, third-party materials, public-repository licensing, and judge access.
