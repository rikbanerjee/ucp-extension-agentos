# Implementation gates

## Current status

- Native `document.modelContext` registration, dynamic registrations, AbortSignal cleanup, native/replay parity, and per-invocation source attribution are shipped.
- Three planning tools are initially registered; the seven canonical Phase 1 descriptors are exposed only as the engine permits. `revise_validated_cart` is optional and post-cart only.
- Fresh Corner is the $30 named Farm Eggs breakfast repair journey: stale stock, explicit approval, $15.99 review cart, optional $24.49 revision, no checkout.
- TheCustomHub is an authorized controlled quote fixture with `fixedPrice: null`; no live merchant backend, cart, order, payment, or checkout is claimed.
- All of the above is committed on `main`; none of the WebMCP delivery is sitting uncommitted in a working tree.
- The application is deployed at https://www.retailagentos.com/webmcp-showcase, the repository is public under Apache-2.0, and the final WebMCP demo video is published publicly at https://youtu.be/aIScR90pSb0 (2:56, manually verified as under the three-minute limit).
- `NEXT_PUBLIC_WEBMCP_VIDEO_URL` is set in the production deployment; the live page renders the "Watch video" action. Video configuration is no longer an open gate.
- The one gate still open is the final production-native acceptance walkthrough on the deployed origin. It is the owner's next step, not a missing implementation, and it must not be recorded as passed until it actually is.
- Generalized remote/server MCP remains designed, not shipped.

The recording gate is a genuine native browser run of the current `/webmcp-showcase` route. Guided replay remains a labelled fallback and is not native proof.
