# Verification Brief — Track B readiness audit (run in the **thecustomhub** repo)

**Hand this file to a coding agent working in the thecustomhub repo.** It is self-contained.
Its output feeds `04-pilot-evidence.md` in the RetailAgentOS kit repo, which is the only place
Track B completion is tracked.

---

## Your role

You are auditing, **not building**. A prior status report claimed B0–B5 are done. Your job is
to determine whether that is true *by running things*, and to produce a bundle of artifacts
that can be copied into the kit repo as evidence.

### Rules — read before starting

1. **Docs and commit messages are not evidence.** A prior report already flagged that commit
   `92586c7` ("B6 post-integration evidence") is misleadingly named and contains no B6 code.
   Assume every doc in `docs/retailagentos/` may be equally stale. Verify against running
   systems and current source only.
2. **Every ✅ requires a command and its raw output.** If you cannot produce output, the answer
   is `UNVERIFIED` — never `probably done`, never inferred from a filename.
3. **Change nothing.** No fixes, no enrichment, no refactors, no "while I was in there."
   A prior pass enriched the JSON-LD *during* a status check; that is exactly the drift this
   audit exists to catch. If you find a bug, write it down and move on.
4. **`UNVERIFIED` is a good answer.** Reporting a real gap is more valuable than a green table.
   Do not soften findings.
5. **Never read, log, or paste secrets** — `.env`, Firebase service-account keys, Stripe secret
   keys. Redact any that appear in output.

---

## Section A · Re-verify B0–B5 against running systems

For each, run the command and paste **raw, unedited** output.

### A0 · Engine install & version drift
- Print the pinned `@retailagentos/engine` version from `package.json` and the resolved version
  in `node_modules/@retailagentos/engine/package.json`. Do they match?
- Run the import smoke test: `typeof evaluateOffer, typeof buildManifest` → expect
  `"function function"`.
- **Drift check:** is the installed engine `0.1.0`? If the kit's source has changed since, the
  pilot may be running stale logic. Report the version regardless.
- **Fork check:** grep the repo for any local reimplementation of engine logic — eligibility,
  pricing, inventory, quote, or trust rules written in this repo rather than called from the
  package. Report any hit with file and line. There must be exactly **one** decision
  implementation and it must live in the package.

### A1 · Product model
- Count products and variants in `products.json`.
- **Null-padding rows:** count variants that are null-only / padding shaped. Expected: **0**.
  Give the count.
- Confirm `callForPrice`, `leadTimeDays`, `shipsTo` exist on the schema. Report how many
  products actually set each (a field that exists but is never populated is not "done" — say so).

### A2 · CustomHubAdapter — run the acceptance test, don't read it
This is the acceptance line from TRACK-B and it was **not** confirmed in the prior report:
- `listVariants()` returns N normalized variants → give N.
- Run `evaluateOffer` over **every** variant. Report: how many ran without throwing, and the
  full error for any that threw.
- **A guest in `CA` is eligible.** Paste the `DecisionRecord`.
- **A guest in `GB` gets `REGION_RESTRICTED`.** Paste the `DecisionRecord`.
- Confirm region codes are upper-cased before `checkServesRegion` (the helper is
  case-sensitive by contract). Show the normalization site, or report its absence.

### A3 · `/.well-known/ucp` — live
- `curl -sS https://thecustomhub.com/.well-known/ucp` → paste the full response.
- **Generated vs hand-written:** confirm the handler returns `buildManifest(adapter.merchantProfile())`
  and is not a static/hand-authored JSON blob. Show the handler source. A hand-written manifest
  silently drifts from the catalog and does not count as B3.
- Confirm the response lists `tier`, `capabilities[]`, endpoints, and `servesRegions: ['US','CA']`.

### A4 · Product JSON-LD — live, without the SPA
- `curl -sS` a real product URL. Paste the JSON-LD block.
- Confirm it is present in the **raw HTML response** — i.e. served by prerender/Cloud Function,
  not injected by client-side JS. State explicitly how you determined this.
- Run it through a structured-data validator; paste the result.
- Confirm `Offer` includes US/CA `shippingDetails`.
- Note: JSON-LD was modified on 2026-08-01 (image/brand/description/return policy added). If the
  captured evidence predates that change, the evidence is stale — flag it.

### A5 · Cloud Run MCP server — **against production, not localhost**
This is the largest known gap. Prior acceptance transcripts were captured against
`localhost:8080`. A local run does not prove the deployed service works.

- `gcloud run services list` → paste. Give the `raos-mcp` service URL, region, revision, and
  deploy timestamp.
- **Which commit is deployed?** Compare the running revision's image/source against repo `HEAD`.
  If the deployed code is behind `HEAD`, say by how many commits. Local transcripts prove nothing
  about a stale deployment.
- Hit the **deployed** endpoint directly (not localhost): confirm the catalog resource lists
  variants, and that the `evaluateOffer` and `issueQuote` tools respond. Paste request/response.
- **MCP equivalence test:** call the deployed `evaluateOffer` and the direct in-process
  `evaluateOffer` from the package with **identical inputs including the same injected `now`**.
  The results must **deep-equal**. Paste both and state pass/fail. This is a hard gate.
- Confirm `now` is injected at the server boundary and that no `Date.now()` / `Math.random()` /
  `fetch()` is called *inside* engine evaluation. (The server may read the clock; the engine
  may not.) Show the injection site.

---

## Section B · Audit the B7-evidence quality

`docs/retailagentos/evidence/` reportedly contains `before.md`, `after.md`, `transcripts.md`.
Existence is not sufficient. Audit them:

- **Was the "before" pass run against a genuinely unmodified store?** Identify the commit SHA or
  deployment the baseline was measured against, and confirm it predates B1–B5. If the baseline
  was measured after any Track B code shipped, the number is invalid — say so plainly.
- **Same task set, both passes?** Give N for before and N for after. If they differ, the
  comparison is broken.
- **Was the task set written down before the runs**, or reconstructed afterward? Check git
  history ordering of the evidence files.
- **Per-task failure modes recorded** in the before pass (dead-end cart / wrong quote / silent
  no-match), not just a total?
- **Are transcripts verbatim** — actual agent output — or paraphrased summaries? Quote enough
  to make this determinable.
- **Negative case present?** An out-of-region or out-of-stock item must be **declined with a
  reason**, not a failed checkout. Paste it.
- **Both US and CA shoppers covered?** The done-for-pilot bar requires both.
- **Stripe:** did a real checkout actually complete, or was it stubbed/test-mode-only? State
  which, with evidence. Do not paste keys or full session objects — the session ID and status
  suffice.
- Compute the headline number as it currently stands: `___/N` before, `___/N` after. Note that
  tasks #3 and #10 (bulk/custom quote) are known-unaddressed — confirm whether they are counted
  in the denominator, and how that changes the number.

---

## Section C · Spec-gap and boundary-rule check

The kit repo's boundary rule: if the integration exposed a gap in a RAOS spec, it must be raised
as an Open Question on the spec — **not silently special-cased in the merchant repo.**

- List every place the pilot works around, overrides, or special-cases engine behavior.
- For each, state whether it was raised upstream as an Open Question, or handled locally and
  never reported.

---

## Section D · Documentation gaps

- `CLAUDE.md` reportedly documents only the unrelated `mcp-server/` (inventory) and never
  mentions the deployed `raos-mcp` Cloud Run service. Confirm, and list exactly what a future
  agent would need to connect to it: URL, auth, Claude Desktop config shape.
- Confirm whether `raos-mcp` is discoverable by any external agent, or only by someone who
  already knows the URL.

---

## Section E · Output

Produce **two** things.

### 1. A verdict report — this exact structure

For every check above: `✅ VERIFIED` (command + output shown) · `❌ FAILED` (with output) ·
`⚠️ UNVERIFIED` (with the reason it couldn't be run).

End with:

```
Q2 CLOSEABLE: yes / no
Blocking items: <list>
Headline number: ___/N before, ___/N after
Production MCP verified end-to-end: yes / no
```

**The bar:** Q2 closes on **B0–B5 + B7-evidence**. B6 (custom/bulk intent capture) is a
follow-on and does **not** gate Q2 — do not let its absence drive the verdict either way.
But B5 acceptance measured only on localhost does **not** satisfy B5.

### 2. An evidence bundle to copy into the kit repo

Assemble a folder with these files, using exactly these names — they are the intake targets in
the kit repo's `specs/reference-implementation/thecustomhub/evidence/`:

| File | Contents |
|---|---|
| `task-set.md` | The N tasks, verbatim |
| `results-before.md` | Per-task pass/fail + failure mode, unmodified store |
| `results-after.md` | Per-task pass/fail, post-Track-B |
| `transcript-positive.md` | Verbatim: finds CA-shipping product under $X → quotes → Stripe completes |
| `transcript-negative.md` | Verbatim: declined with a reason |
| `live-endpoints.md` | Raw `curl` of `/.well-known/ucp`, a product URL's JSON-LD, validator result, Cloud Run service listing |
| `mcp-equivalence.md` | Deployed vs in-process `evaluateOffer` outputs, same `now`, deep-equal pass/fail |

If a file cannot be produced, create it anyway containing a one-line statement of **why**.
An empty-with-reason file is useful; a missing file is indistinguishable from an oversight.

---

## Do not

- Do not build B6, mark SKUs `callForPrice`, or design the intent-capture tool.
- Do not fix the empty `sameAs`, update `CLAUDE.md`, or touch JSON-LD.
- Do not re-run or regenerate the before/after evidence to make it match. If it's invalid,
  the finding is that it's invalid.
- Do not push. Report first.
