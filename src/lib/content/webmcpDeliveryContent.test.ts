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
    // Uncommitted as of Sep 2, 2026 — no evidence commit is claimed, and no SHA is invented.
    expect(latest.evidence).toBeUndefined();
    expect(latest.next).toMatch(/uncommitted as of Sep 2, 2026/);

    // The prior correctness-gap-closure pass stays in the log, just no longer marked current.
    const correctnessGap = buildLog.find((entry) => entry.id === 'webmcp-correctness-gap-closure-2026');
    expect(correctnessGap).toMatchObject({ current: false, date: 'Sep 1, 2026' });
    expect(correctnessGap?.evidence?.map(({ label }) => label)).toEqual(['5b1603e']);
    // The prior native-handoff-hardening pass stays in the log, just no longer marked current — both
    // it and the correctness-gap pass remain uncommitted/pending (see their own narrative/next fields).
    expect(buildLog.find((entry) => entry.id === 'webmcp-native-handoff-hardening-2026')).toMatchObject({ current: false, date: 'Sep 1, 2026' });
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
