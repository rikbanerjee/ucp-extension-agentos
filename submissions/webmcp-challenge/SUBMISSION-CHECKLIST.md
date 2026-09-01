# Final submission and compliance checklist

This is an operational checklist, not legal advice. The [official rules](https://webmcp.devpost.com/rules) are authoritative.

## Submission freeze (internal — do not put this on any shopper-facing page)

- [ ] After the September 3, 2026, 1:00 PM Pacific deadline, treat the submitted repository state, the deployed live app, and the Devpost entry as frozen for the duration of judging.
- [ ] Do not push further commits to the branch/tag referenced by the Devpost entry, redeploy the live URL, or edit the Devpost listing once judging has started, unless the challenge organizers explicitly request a fix.
- [ ] If a genuine post-deadline fix is unavoidable, document what changed and why in the build log rather than silently editing history.

## Eligibility and ownership

- [ ] Entrant is an eligible adult in an eligible jurisdiction.
- [ ] If entering as a team or organization, an authorized representative is named.
- [ ] No entrant/team member/judge relationship creates an excluded conflict under the rules.
- [ ] The entrant owns the submission and has permission for every included asset, dependency, logo, screenshot, voice, and data fixture.
- [ ] Third-party software and data are used under compatible terms.
- [ ] No secrets, private merchant information, personal data, or unauthorized trademarks appear in the repository or video.

## Existing-project requirement

- [ ] Top-level README clearly states RetailAgentOS existed before the challenge.
- [ ] README lists exactly what WebMCP functionality was added from August 25 through September 3, 2026.
- [ ] Public commit history dates and distinguishes the extension.
- [ ] Devpost description links a compare view or challenge commit list.
- [ ] Video focuses on the new WebMCP work, because pre-existing work is not the evaluated portion.

## Working project

- [ ] Public HTTPS live URL opens in ChatGPT's in-app browser.
- [ ] Live URL also works in Chrome 149+ with WebMCP testing enabled.
- [ ] Four tools are actually registered and agent-discoverable.
- [ ] Positive, restricted-region, and quote paths match the video and description.
- [ ] Visible UI state agrees with tool results.
- [ ] Checkout requires shopper confirmation.
- [ ] No local-only service, unpublished package, or developer credential is required.
- [ ] If login is required, working credentials are supplied in the private submission field.
- [ ] Project remains free and available through the end of judging on September 21, 2026.

## Public repository

- [ ] Repository is public on GitHub, GitLab, or Bitbucket.
- [ ] Signed-out/private-window check returns the repository page, not 404.
- [ ] Root `LICENSE` exists and the host detects/displays it.
- [ ] Repository contains all source, assets, and setup instructions.
- [ ] README has a prominent WebMCP Challenge section.
- [ ] README links the live route, demo video, tested commit, and runbook.
- [ ] README includes a concise `document.modelContext.registerTool(...)` example.
- [ ] Clean clone can install, test, build, and run from documented commands.
- [ ] No generated output, local temp files, or secrets are accidentally committed.

## Video

- [ ] Runtime is below 3:00; target 2:50–2:55.
- [ ] Video clearly shows the working product and native WebMCP invocation.
- [ ] Audio explains what was built and how WebMCP is used.
- [ ] Tool names, reason codes, and visible UI changes are legible.
- [ ] Positive flow, policy block, and quote path are shown.
- [ ] No copyrighted music or unlicensed third-party material.
- [ ] Captions reviewed for product name, `WebMCP`, and reason-code accuracy.
- [ ] Uploaded to YouTube and publicly visible.
- [ ] Signed-out playback and link embedding work.

## Devpost form

- [ ] Project name and tagline match this package.
- [ ] Description answers all four required questions: fit, better UX, human-agent collaboration, and implementation.
- [ ] Description is updated with real URLs and no bracketed placeholders.
- [ ] Live app URL points directly to the challenge route.
- [ ] Repository URL is public.
- [ ] YouTube URL is public and under three minutes.
- [ ] Testing instructions contain the three exact prompts and tested commit SHA.
- [ ] Team members and representative are accurate.
- [ ] Technologies/tags include WebMCP, TypeScript, Next.js, and React.
- [ ] Gallery cover and screenshots have clear captions.
- [ ] Every link tested from a signed-out browser.
- [ ] Draft saved at least one day before deadline.
- [ ] Final rules re-read immediately before submission.

## Final go/no-go

Submit only if all of these are true:

- [ ] A judge can discover and invoke the tools on the public route.
- [ ] The public repository has a detected open-source license.
- [ ] The video proves the same behavior the live build performs.
- [ ] Challenge-period WebMCP work is evident in public history.
- [ ] Claims distinguish fixture, pilot, and production truth.

If any item is false, save the Devpost draft but do not make the final submission until it is corrected.
