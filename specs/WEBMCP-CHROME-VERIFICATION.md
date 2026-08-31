# WebMCP browser deployment verification

The showcase is a controlled fixture. It has no checkout, payment, order placement, inventory reservation, live TheCustomHub connection, or production membership verification.

## Before a deployment is described as Chrome-ready

- Serve `/webmcp-showcase` over HTTPS.
- Confirm the response includes `Origin-Agent-Cluster: ?1` and no `document.domain` assignment or incompatible `Permissions-Policy` is introduced by the deployment layer.
- Supply a Chrome WebMCP origin-trial token through the deployment configuration when Chrome requires one. This repository intentionally contains no token.
- For local Chrome experimentation, use the current browser experimental WebMCP flag; do not treat flag availability as tool-registration proof.

## Browser evidence checklist

- In the ChatGPT/Codex in-app browser, confirm all three base tools actually register, invoke the Fresh Corner approval and decline paths, observe `toolchange`, and check the page’s browser-observed parity count when `getTools()` exists.
- In Chrome with an approved origin trial, repeat the same discovery, toolchange, cancellation, shopper approval, and storefront-isolation checks.
- In Chrome with the local experimental flag, repeat the flow as local-only evidence.
- Inspect console and network errors. Fresh Corner must return only grocery fixture facts; TheCustomHub must return only its controlled quote fixture and `fixedPrice: null`.

No public HTTPS Chrome verification has been performed by this repository change.
