# RetailAgentOS WebMCP Challenge submission package

This package turns the current RetailAgentOS WebMCP work into a judge-ready story, demo, and compliance checklist for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/) on [Devpost](https://webmcp.devpost.com/).

## The submission in one sentence

RetailAgentOS turns a retailer-owned website into a safe, agent-operable storefront: an AI agent can search products, check the retailer's actual selling rules, prepare a visible cart, and request a custom quote without guessing a price or taking checkout away from the shopper.

## Deadline

Submit by **September 3, 2026 at 1:00 p.m. Pacific / 4:00 p.m. Eastern**. Do not plan to upload at the deadline; target a final Devpost draft and public video by September 2.

## Readiness status — September 2, 2026

The WebMCP delivery is committed on `main`, the application is deployed, the repository is public
under Apache-2.0, and the demo video is published. What remains is the owner's final production
acceptance run and the Devpost form itself.

| Gate | Current evidence | Status |
|---|---|---|
| Non-trivial WebMCP implementation | Seven canonical Phase 1 descriptors plus the optional post-cart `revise_validated_cart` extension, with dynamic capability registration driven by the deterministic engine | **Ready** |
| Native tools on showcase page | `document.modelContext` registration lifecycle is connected on `/webmcp-showcase` (`AbortSignal`-owned, cleaned up on reset/scenario switch/unmount), and the deployed origin was walked through natively in ChatGPT's in-app browser on September 2, 2026 | **Ready** |
| Agent-driven visible UI update | Native and guided calls use the same descriptors and gateway handlers; cart and quote results update the visible storefront | **Ready** |
| Working live URL | https://www.retailagentos.com/webmcp-showcase | **Ready** |
| Public source repository | https://github.com/rikbanerjee/ucp-extension-agentos | **Ready** |
| Root open-source license | Apache-2.0 root `LICENSE` | **Ready** |
| Under-three-minute public YouTube demo | Published at https://youtu.be/aIScR90pSb0 — 2:56, manually verified on YouTube against the "less than three minutes" limit | **Ready** |
| Existing-versus-new evidence | Dated challenge-period commits (`92753e5` → `4790f74`) distinguish pre-existing UCP/engine work from the WebMCP additions | **Ready** |
| Paste-ready submission narrative | Included in this package with final public links | **Ready** |
| Final production-native acceptance | Run by the maintainer on September 2, 2026 in ChatGPT's in-app browser against the deployed origin (build `5257759`); reported working as designed | **Passed** |
| Devpost form submission | The only step left before the September 3, 1:00 p.m. PDT deadline | **Pending** |

Do not describe the guided button-driven fallback as a native WebMCP invocation. It is useful for ordinary browsers, but the challenge demo must show an agent discovering and invoking the registered tools.

## Recommended submission identity

- **Name:** RetailAgentOS WebMCP Agent Storefront
- **Tagline:** Merchant policy becomes a live WebMCP boundary: agents invoke only the next action a retailer can safely honor. *(111 characters — Devpost caps the tagline per hackathon and this challenge does not publish its cap, so it is kept under 120. Fallback under 100: "WebMCP exposes only the next safe action; the merchant's engine decides what that action is." Canonical copy lives in [`DEVPOST-SUBMISSION.md`](./DEVPOST-SUBMISSION.md).)*
- **Navigation label (site-wide):** WebMCP Live Demo
- **Canonical route:** `/webmcp-showcase` (compatibility route: `/agent-ready-storefront`)
- **Route chrome:** both routes render focused challenge chrome — RetailAgentOS identity, an "OpenAI WebMCP Challenge" badge, and Run Demo / How It Works / Developer Evidence / GitHub / Back to RetailAgentOS — plus a compact challenge footer. Every other route keeps the normal RetailAgentOS platform navigation and footer.
- **Primary audience:** Independent and mid-market retailers with owned storefronts.
- **Demonstrated merchant:** A clearly labelled TheCustomHub-style local fixture, not a claimed live TheCustomHub integration.
- **Core proof:** One positive purchase-preparation path, one policy block, and one call-for-price quote path.

## Package map

1. [`DEVPOST-SUBMISSION.md`](./DEVPOST-SUBMISSION.md) — paste-ready title, tagline, description, implementation story, and final public links.
2. [`IMPLEMENTATION-GATES.md`](./IMPLEMENTATION-GATES.md) — the gates this submission must satisfy to be described truthfully, and their current state.
3. [`DEMO-RUNBOOK.md`](./DEMO-RUNBOOK.md) — test prompts, expected calls, expected UI behavior, and failure policy.
4. [`VIDEO-SCRIPT.md`](./VIDEO-SCRIPT.md) — a timed 2:50 narration and shot list.
5. [`JUDGING-MAP.md`](./JUDGING-MAP.md) — evidence mapped to all four equally weighted criteria.
6. [`TECHNICAL-EVIDENCE.md`](./TECHNICAL-EVIDENCE.md) — architecture, tool inventory, safety model, code evidence, and honest limitations.
7. [`SUBMISSION-CHECKLIST.md`](./SUBMISSION-CHECKLIST.md) — rules, assets, testing, ownership, and final form checks.
8. [`assets/webmcp-thumbnail.png`](./assets/webmcp-thumbnail.png) — the Devpost project thumbnail, 2400×1600 (exactly 3:2, as Devpost recommends). Purpose-built for this submission because the site's `public/og-image.png` is 1.91:1 and leads with UCP rather than WebMCP. [`assets/webmcp-thumbnail.html`](./assets/webmcp-thumbnail.html) is its source; re-render with `chrome --headless --force-device-scale-factor=2 --screenshot --window-size=1200,800`. The badge is text-only ("Built for the OpenAI WebMCP Challenge") and uses no OpenAI mark, claiming no endorsement.

## Final assembly order

Completed:

1. ✅ Native WebMCP registration is wired on the showcase route.
2. ✅ Apache-2.0 license added at repository root.
3. ✅ The post-August-25 WebMCP work is committed with a clear, dated history in a public repository.
4. ✅ The application is deployed at https://www.retailagentos.com/webmcp-showcase.
5. ✅ The demo video is published at https://youtu.be/aIScR90pSb0 (2:56, under the three-minute limit).
6. ✅ `NEXT_PUBLIC_WEBMCP_VIDEO_URL` is configured in production; the live page renders the "Watch
   video" action.

7. ✅ The final production-native acceptance walkthrough was run against the deployed origin in
   ChatGPT's in-app browser on September 2, 2026.

Remaining actions:

1. Complete and submit the Devpost form, testing every link in a signed-out browser.
2. Freeze the repository, the production application, the video, and the Devpost submission.

## Source-of-truth warning

The official rules govern. Re-check the [challenge rules](https://webmcp.devpost.com/rules) immediately before submission, especially eligibility, ownership, third-party materials, public-repository licensing, and judge access.
