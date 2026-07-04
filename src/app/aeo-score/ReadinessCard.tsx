'use client';

/**
 * ReadinessCard — the shareable, one-page verdict for the AI-readiness check.
 *
 * This is the primary result surface (the "front door" per SITE-PLAN SWP-6):
 * level badge, score, the top 3 things holding the store back in plain
 * language, and the retailer CTA. It renders as a single self-contained
 * visual block — no interaction is required to see the verdict, so it can be
 * screenshotted directly.
 *
 * Claim discipline: this card describes THE SCANNED STORE's readiness. It
 * never states that RetailAgentOS is installed on the store — blockers are
 * always framed as "what would change this score."
 */

import { useState } from 'react';
import Link from 'next/link';
import type { AeoResult } from '@/lib/aeo/types';
import { assessReadiness, LEVEL_4_NOTE } from './levelMapping';
import styles from './page.module.css';

const PILOT_EMAIL = 'rikbanerjee007@gmail.com';

interface ReadinessCardProps {
  result: AeoResult;
}

function levelBadgeClass(levelId: number): string {
  if (levelId >= 3) return styles.levelBadgeLevel3;
  if (levelId === 2) return styles.levelBadgeLevel2;
  if (levelId === 1) return styles.levelBadgeLevel1;
  return styles.levelBadgeLevel0;
}

export default function ReadinessCard({ result }: ReadinessCardProps) {
  const assessment = assessReadiness(result);
  const { level, score, topBlockers } = assessment;
  const [openDetail, setOpenDetail] = useState<number | null>(null);

  const mailtoHref = `mailto:${PILOT_EMAIL}?subject=${encodeURIComponent(
    `AI-readiness pilot — ${result.siteName || result.url}`
  )}&body=${encodeURIComponent(
    `Hi — I ran the AI-readiness check on ${result.url} and landed at ${level.badge} (${level.name}), score ${score}/100. I'd like to talk about a pilot.`
  )}`;

  return (
    <section className={`${styles.panel} ${styles.readinessCard}`} aria-label="AI-readiness result">
      <div className={styles.readinessHeader}>
        <div className={`${styles.levelBadge} ${levelBadgeClass(level.id)}`}>
          <span className={styles.levelBadgeTag}>{level.badge}</span>
          <span className={styles.levelBadgeName}>{level.name}</span>
        </div>
        <div className={styles.readinessScoreBlock}>
          <span className={styles.readinessScoreValue}>{score}</span>
          <span className={styles.readinessScoreLabel}>AI-readiness score</span>
        </div>
      </div>

      <p className={styles.readinessVerdict}>
        Your store is at <strong>{level.badge} — {level.name}</strong>. {level.description}
      </p>
      <p className={styles.readinessScannedUrl}>scanned: {result.url}</p>

      {topBlockers.length > 0 ? (
        <div className={styles.blockersBlock}>
          <h4 className={styles.blockersHeading}>Top {topBlockers.length} things holding you back</h4>
          <ol className={styles.blockersList}>
            {topBlockers.map((blocker, i) => (
              <li key={i} className={styles.blockerItem}>
                <div className={styles.blockerPlain}>{blocker.plain}</div>
                <button
                  type="button"
                  className={styles.technicalDetailToggle}
                  onClick={() => setOpenDetail((cur) => (cur === i ? null : i))}
                  aria-expanded={openDetail === i}
                >
                  {openDetail === i ? 'Hide technical detail' : 'Technical detail'}
                </button>
                {openDetail === i && (
                  <div className={styles.technicalDetailBody}>
                    <strong>{blocker.name}:</strong> {blocker.technical}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className={styles.blockersNone}>
          No major gaps found — this store clears every check this tool runs.
        </p>
      )}

      {level.id < 4 && (
        <p className={styles.level4Note}>{LEVEL_4_NOTE}</p>
      )}

      <div className={styles.readinessCtaRow}>
        <a className={`${styles.btn} ${styles.btnPrimary}`} href={mailtoHref}>
          Get a pilot
        </a>
        <Link className={`${styles.btn} ${styles.btnSecondary}`} href="/adopt">
          See how it works
        </Link>
      </div>
    </section>
  );
}
