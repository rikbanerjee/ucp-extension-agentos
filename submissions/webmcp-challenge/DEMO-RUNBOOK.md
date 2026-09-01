# Judge and recording demo runbook

## Public test target

- Live URL: `[PUBLIC HTTPS URL]/agent-ready-storefront`
- Tested commit: `[FULL COMMIT SHA]`
- Browser A: ChatGPT desktop in-app browser
- Browser B: Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and browser restarted
- Authentication: none, or `[JUDGE CREDENTIAL IN DEVPOST PRIVATE FIELD]`

## Preflight

Run this from a clean browser session before recording and again after deploying any change.

1. Open the live route directly.
2. Confirm the page says native WebMCP is active and lists four actually registered tools.
3. Confirm the agent can discover `search_products`, `evaluate_offer`, `prepare_cart`, and `request_quote`.
4. Confirm the page starts with no selected product, cart, stale reason, or previous quote.
5. Confirm the event timeline is empty.
6. Run all three cases below in order.
7. Refresh and repeat to catch duplicate registration or idempotency-state problems.
8. Repeat in the second supported browser.
9. Test the public repository and YouTube links from a signed-out browser.

## Scenario 1 — eligible product and visible cart

### Prompt

> On this site, find a personalized Father's Day shirt under $50 that can ship to California. Check whether the offer is valid for a US shopper, explain the result, and prepare a cart with one shirt for me to review. Do not proceed to checkout.

### Expected WebMCP calls

1. `search_products`
2. `evaluate_offer`
3. `prepare_cart`

### Expected observable result

- The page visibly selects the product.
- The decision is eligible and includes a clear next action.
- A one-line cart appears in the page.
- The agent explicitly says checkout has not occurred.
- The event timeline shows actual tool calls, not a scripted animation.

### Pass condition

The agent completes the task without DOM clicking or guessing an offer rule, and the visible UI agrees with the structured tool result.

## Scenario 2 — policy-aware refusal

### Prompt

> Check whether that same product can be sold to a shopper in Great Britain. If it is restricted, explain the retailer's reason and do not create or modify a cart.

### Expected WebMCP calls

1. `evaluate_offer`

The agent may call `search_products` first if it no longer retains the selected identifier. It must not call `prepare_cart` after a blocking result.

### Expected observable result

- The decision displays `REGION_RESTRICTED`.
- The explanation is useful to the shopper without exposing irrelevant internal trace detail.
- No cart is created or changed.

### Pass condition

The refusal is an intentional commerce decision, not a failed click or generic server error.

## Scenario 3 — custom quote without a fabricated price

### Prompt

> I need 25 custom shirts for a robotics team. Submit a quote request with that requirement. Tell me whether a fixed price was created, and do not claim that an order has been placed.

### Expected WebMCP calls

1. `request_quote`

### Expected observable result

- A quote request reference appears.
- Result code is `QUOTE_REQUESTED`.
- `fixedPrice` is `null`.
- The next action says merchant review is required.
- Neither the page nor the agent claims checkout or order completion.

### Pass condition

The agent preserves the merchant's call-for-price workflow.

## Failure policy

Do not record or submit the fallback button simulation as proof of WebMCP. If native discovery or invocation fails:

1. capture the exact browser/app version;
2. inspect the registration error and Permissions Policy;
3. verify that the deployed page loaded the intended commit;
4. refresh into a clean session;
5. repeat in the second supported browser;
6. fix and redeploy before recording.

The fallback simulation may remain in the product as graceful degradation, but label it separately in the video if it is shown at all.

## Judge-facing testing instructions

Paste this concise version into Devpost if it provides a testing-instructions field:

> Open the live `/agent-ready-storefront` URL in ChatGPT's in-app browser or Chrome 149+ with WebMCP testing enabled. Confirm the page lists four registered tools. First ask the agent to find a personalized Father's Day shirt for California and prepare a cart for review without checkout. Then ask it to check the same item for Great Britain; it should return `REGION_RESTRICTED` and create no cart. Finally ask for a quote for 25 custom robotics-team shirts; it should return `QUOTE_REQUESTED` with `fixedPrice: null`. No login is required. Tested commit: `[SHA]`.
