import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/agents.md/route';
import { SCORECARD_SECTIONS } from '@/app/evidence/scorecard-data';
import { buildLog } from './buildlog';
import { VERIFICATION_SNAPSHOT } from './verificationSnapshot';

describe('WebMCP delivery documentation', () => {
  it('makes the shipped browser surface and unshipped remote transport explicit to agents', async () => {
    const agentsMd = await GET().text();
    const retiredTransportPhrase = ['no', 'live', 'MCP', 'transport'].join(' ');

    expect(agentsMd).toContain('document.modelContext');
    expect(agentsMd).toContain('/webmcp-showcase');
    expect(agentsMd).toMatch(/native browser WebMCP/i);
    expect(agentsMd).toContain('remote MCP server');
    expect(agentsMd).toContain('Aug 30–31 2026');
    expect(agentsMd).toContain('92753e5');
    expect(agentsMd).toContain('d094e12');
    expect(agentsMd).toContain('e464bb8');
    expect(agentsMd).not.toContain(retiredTransportPhrase);
  });

  it('puts the latest (judge-navigation/identity) entry first and exposes each evidence link', () => {
    const latest = buildLog[0];

    expect(latest).toMatchObject({
      id: 'webmcp-judge-navigation-identity-2026',
      current: true,
      date: 'Sep 2, 2026',
    });
    // 4790f74 is the feature commit; b0550a8 is documentation/evidence provenance, not a product change.
    expect(latest.evidence?.map(({ label }) => label)).toEqual(['4790f74', 'b0550a8']);
    // The video is published, the production site is live, and the deployed-origin native
    // acceptance walkthrough has been run — so nothing here may describe any of those as
    // outstanding. The remaining work is the Devpost submission and the freeze.
    expect(latest.next).toMatch(/deployed-origin acceptance walkthrough was run/);
    expect(latest.next).toContain('https://youtu.be/aIScR90pSb0');
    expect(latest.next).toMatch(/Devpost/);
    expect(latest.next).not.toMatch(/uncommitted/);
    expect(latest.next).not.toMatch(/record and publish/i);
    expect(latest.next).not.toMatch(/has not been run|not claimed as passed/i);
    // The native run is attributed to the maintainer, never asserted as self-verified: a browser
    // run outside this repository cannot be reproduced from it.
    expect(latest.next).toMatch(/by the maintainer/);

    // The prior correctness-gap-closure pass stays in the log, just no longer marked current. Its
    // implementation is committed on main as 12f8ba0 (together with the native-handoff pass below);
    // 0b0b71a is the follow-on showcase hardening. Neither is pending any longer.
    const correctnessGap = buildLog.find((entry) => entry.id === 'webmcp-correctness-gap-closure-2026');
    expect(correctnessGap).toMatchObject({ current: false, date: 'Sep 1, 2026' });
    expect(correctnessGap?.evidence?.map(({ label }) => label)).toEqual(['12f8ba0', '0b0b71a']);
    expect(correctnessGap?.next).not.toMatch(/uncommitted/);
    // The prior native-handoff-hardening pass stays in the log, just no longer marked current. Its
    // own implementation commit on main is 12f8ba0, not the earlier submission-hardening 5b1603e.
    const nativeHandoff = buildLog.find((entry) => entry.id === 'webmcp-native-handoff-hardening-2026');
    expect(nativeHandoff).toMatchObject({ current: false, date: 'Sep 1, 2026' });
    expect(nativeHandoff?.evidence?.map(({ label }) => label)).toEqual(['12f8ba0']);
    expect(nativeHandoff?.next).not.toMatch(/uncommitted/);
    // The prior submission-hardening pass stays in the log, just no longer marked current — its own
    // work is committed as 5b1603e (see its evidence entry / narrative), not "pending".
    expect(buildLog.find((entry) => entry.id === 'webmcp-submission-hardening-2026')).toMatchObject({ current: false, date: 'Sep 1, 2026' });
    expect(buildLog.find((entry) => entry.id === 'week-7')?.current).toBe(false);
    // The original challenge-window entry stays in the log, just no longer marked current.
    expect(buildLog.find((entry) => entry.id === 'webmcp-challenge-2026')).toMatchObject({ current: false, date: 'Aug 30–31, 2026' });
  });

  it('keeps browser WebMCP and a generalized remote MCP server as separate evidence rows', () => {
    const transport = SCORECARD_SECTIONS.find((section) => section.id === 'trust');
    const browserLayer = transport?.rows.find((row) => row.id === 'g1');
    const remoteServer = transport?.rows.find((row) => row.id === 'g2');

    expect(browserLayer).toMatchObject({ status: 'built', requirement: 'Native WebMCP browser delivery layer' });
    expect(remoteServer).toMatchObject({ status: 'designed', requirement: 'Generalized remote MCP server' });
    expect(remoteServer?.note).toContain('no hosted remote server');
  });

  it('does not reintroduce ambiguous public transport copy', () => {
    const retiredTransportPhrase = ['no', 'live', 'MCP', 'transport'].join(' ');
    const retiredServerClaim = ['"Live', 'MCP', 'server"'].join(' ');
    const publicFiles = [
      'src/app/agents.md/route.ts',
      'src/app/developers/page.tsx',
      'src/app/evidence/scorecard-data.ts',
      'src/lib/content/verificationSnapshot.ts',
      'src/app/buildlog/page.tsx',
    ];
    const publicCopy = publicFiles
      .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(publicCopy).not.toMatch(new RegExp(retiredTransportPhrase, 'i'));
    expect(publicCopy).not.toContain(retiredServerClaim);
    expect(VERIFICATION_SNAPSHOT.knownLimitations[0]).toContain('generalized remote MCP server');
  });
});
