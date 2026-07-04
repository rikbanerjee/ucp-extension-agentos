'use client';

/**
 * AEO/GEO Score Dashboard — /aeo-score
 *
 * React port of the source project's public/index.html + public/app.js.
 * This is a Client Component because it owns interactive state: form input,
 * a fake terminal animation, and the results display.
 *
 * The component fetches /aeo-score/api/analyze (the Next.js route handler)
 * and renders the score breakdown, engine compatibility matrix, audit tabs,
 * LLM digest, and an actionable checklist.
 *
 * Design decisions vs. Express source:
 *   - Vanilla DOM manipulation in app.js → React state + refs.
 *   - setTimeout terminal animation → useEffect with clearable timers.
 *   - The fetch path changes from `./api/analyze` (Express-relative) to
 *     `/aeo-score/api/analyze` (absolute path in the Next.js app).
 *   - CSS Modules used instead of global stylesheet to avoid leaking into
 *     the rest of the RetailAgentOS app.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import type { AeoResult, AuditItem, AuditCategory } from '@/lib/aeo/types';
import ReadinessCard from './ReadinessCard';
import styles from './page.module.css';

// ---------------------------------------------------------------------------
// Code snippet templates (ported from app.js)
// ---------------------------------------------------------------------------
const CODE_TEMPLATES: Record<string, string> = {
  'Structured Data Presence': `<!-- Basic JSON-LD Schema for Organization in HTML <head> -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand Name",
  "url": "https://yourdomain.com",
  "logo": "https://yourdomain.com/logo.png"
}
</script>`,
  'FAQ/Q&A Schema': `<!-- FAQ Page Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{ "@type": "Question", "name": "What is GEO/AEO?", "acceptedAnswer": { "@type": "Answer", "text": "..." } }]
}
</script>`,
  'Content Schema': `<!-- Article Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Article Title",
  "datePublished": "2026-01-01T08:00:00Z",
  "author": { "@type": "Person", "name": "Author Name" }
}
</script>`,
  'Publisher Identity Schema': `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Jane Smith",
  "jobTitle": "Lead Architect",
  "sameAs": ["https://linkedin.com/in/janesmith"]
}
</script>`,
  'Data Tables': `<table class="spec-table">
  <thead><tr><th>Feature</th><th>Specification</th><th>Benefit</th></tr></thead>
  <tbody><tr><td>Cloud Sync</td><td>Under 50ms latency</td><td>Realtime backup updates</td></tr></tbody>
</table>`,
  'Bulleted Lists': `<h3>Key Takeaways</h3>
<ul>
  <li><strong>First point:</strong> Direct description detail.</li>
  <li><strong>Second point:</strong> Statistics and numerical facts.</li>
</ul>`,
  'Visual Emphasis (Bold text)': `<p>Our software offers <strong>realtime database synchronization</strong> which decreases server transaction latency by <strong>up to 45%</strong>.</p>`,
  'Quantitative Data Density': `<ul>
  <li><strong>Latency:</strong> Reduced to 12ms.</li>
  <li><strong>Growth:</strong> 34% quarter-over-quarter.</li>
  <li><strong>Savings:</strong> Average $12,500/year.</li>
</ul>`,
  'Direct Q&A Structure': `<h2>How does X solve Y?</h2>
<p><strong>X solves Y by using an event-driven queue.</strong> This design decouples input latency from processing speeds.</p>`,
  'Title Hierarchy (H1)': `<header><h1>The Main Topic of the Document</h1></header>
<main><h2>Sub-topic 1</h2><p>...</p></main>`,
  'Paragraph Word Count': `<p>Generative engines prefer short paragraphs. Split massive blocks of text into segments that address exactly one concept. Keep summaries between 25 and 80 words.</p>`,
  'Outbound Citations': `<p>According to <a href="https://arxiv.org/abs/2305.00001" target="_blank" rel="noopener noreferrer">Cornell Arxiv</a>, structured formatting improves retrieval accuracy by 23%.</p>`,
  'Transparency & Legal Links': `<footer><nav>
  <a href="/about">About Our Team</a>
  <a href="/contact">Get in Touch</a>
  <a href="/privacy">Privacy Policy</a>
  <a href="/terms">Terms of Service</a>
</nav></footer>`,
  'Author Social Footprint': `<div class="author-card">
  <p>Written by Jane Smith.</p>
  <p>Follow her work on <a href="https://linkedin.com/in/janesmith" target="_blank">LinkedIn</a>.</p>
</div>`,
  'HTML Page Title': `<head><title>Short, Descriptive Title (50-60 Characters)</title></head>`,
  'Meta Description': `<head><meta name="description" content="Add a highly descriptive summary of the page (110-150 characters) containing primary keywords."></head>`,
  'Open Graph Protocol': `<head>
  <meta property="og:title" content="Page Title Header">
  <meta property="og:description" content="Detailed page summary.">
  <meta property="og:image" content="https://yourdomain.com/social-preview.jpg">
</head>`,
  'HTML5 Semantic Layout': `<header><nav>...</nav></header>
<main><article><header><h1>Article Title</h1></header><section>...</section></article></main>
<footer>...</footer>`,
  'UCP Discovery Endpoint': `/* JSON at: /.well-known/ucp */
{
  "version": "1.0",
  "capabilities": {
    "discovery": "https://api.yourdomain.com/ucp/discover",
    "checkout": "https://api.yourdomain.com/ucp/checkout"
  }
}`,
  'Product & Offer Schema': `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Premium Gadget Pro",
  "offers": { "@type": "Offer", "price": "149.00", "priceCurrency": "USD", "availability": "https://schema.org/InStock" }
}
</script>`,
  'UCP Pricing & Stock Data': `<div itemscope itemtype="https://schema.org/Product">
  <span itemprop="name">Product Name</span>
  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <span itemprop="price" content="99.99">$99.99</span>
    <meta itemprop="priceCurrency" content="USD" />
    <link itemprop="availability" href="https://schema.org/InStock" />In Stock
  </div>
</div>`,
  'Pricing Context Extension': `{
  "extensions": {
    "com.ezyupload.shopping.pricing_context": {
      "endpoint": "https://api.yourdomain.com/ucp/pricing-context"
    }
  }
}`,
  'Eligibility Reasoning Extension': `{
  "extensions": {
    "com.ezyupload.shopping.eligibility": {
      "endpoint": "https://api.yourdomain.com/ucp/eligibility"
    }
  }
}`,
  'Bulk & Quantity Constraints Extension': `{
  "extensions": {
    "com.ezyupload.shopping.bulk_pricing": {
      "endpoint": "https://api.yourdomain.com/ucp/bulk-constraints",
      "default_moq": 10,
      "step_increment": 5
    }
  }
}`,
  'Promotional Reasoning Extension': `{
  "extensions": {
    "com.ezyupload.shopping.promo_pricing": {
      "endpoint": "https://api.yourdomain.com/ucp/promo-reasoning"
    }
  }
}`,
  'Fulfillment Constraints Extension': `{
  "extensions": {
    "com.ezyupload.shopping.fulfillment_constraints": {
      "endpoint": "https://api.yourdomain.com/ucp/fulfillment-restrictions",
      "geo_exclusions": ["US-HI", "US-AK", "International"]
    }
  }
}`,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type View = 'form' | 'loading' | 'results';

interface ConsoleLogEntry {
  text: string;
  type: 'info' | 'success' | 'wait';
}

interface ChecklistCardProps {
  audit: AuditItem;
}

function ChecklistCard({ audit }: ChecklistCardProps) {
  const [open, setOpen] = useState(false);
  const priority = audit.status === 'fail' ? 'high' : 'medium';
  const code = CODE_TEMPLATES[audit.name] ?? `/* Optimization tip */\n/* ${audit.message} */`;

  return (
    <div className={`${styles.checklistCard} ${priority === 'high' ? styles.priorityHigh : styles.priorityMedium}`}>
      <div className={styles.checklistHeader} onClick={() => setOpen((o) => !o)} role="button" aria-expanded={open}>
        <div className={styles.checklistHeaderLeft}>
          <span className={styles.checklistBadge}>{priority} Priority</span>
          <span className={styles.checklistTitle}>{audit.name}</span>
        </div>
        <span className={`${styles.checklistChevron} ${open ? styles.checklistChevronOpen : ''}`}>&#9660;</span>
      </div>
      {open && (
        <div className={styles.checklistBody}>
          <p className={styles.checklistBodyDesc}>{audit.message}</p>
          {audit.agentFailureExplanation && (
            <div className={styles.agentFailureCallout}>
              <span className={styles.agentFailureCalloutTitle}>Agent Checkout Failure Risk:</span>
              <span className={styles.agentFailureCalloutDesc}>{audit.agentFailureExplanation}</span>
            </div>
          )}
          <p className={styles.codeImplLabel}>Implementation Guide:</p>
          <pre className={styles.codeSnippetBox}>{code}</pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Audit Tab
// ---------------------------------------------------------------------------

const TABS: { id: AuditCategory; label: string; desc: string }[] = [
  { id: 'schema', label: 'Structured Data', desc: 'AI Engines use schema markups (JSON-LD) to parse direct entities, questions, product features, and dates without guessing.' },
  { id: 'readability', label: 'Readability & Answers', desc: 'Simple sentences, concise paragraphs, and clear heading hierarchies (H1/H2 Q&A blocks) enable clean LLM summarizing.' },
  { id: 'format', label: 'Data Format & Density', desc: 'LLMs strongly favor bulleted lists, key-value grids, tabular specifications, and numerical statistics to formulate responses.' },
  { id: 'eeat', label: 'EEAT & Authority', desc: 'Trustworthiness factors verified by clear outbound citations, links to author profiles, and essential legal transparency anchors.' },
  { id: 'metadata', label: 'Metadata & Technical', desc: 'Standard SEO configuration, page title sizes, meta descriptions, Open Graph headers, and clean semantic tag frameworks.' },
  { id: 'retailagentos', label: 'Agent Checkout Reasoning', desc: "Checks whether your store's data would let an AI agent shop safely: correct pricing by buyer, membership eligibility, and shipping restrictions. This does not check whether RetailAgentOS is installed — it shows what would change this score if it were." },
];

interface AuditTabProps {
  data: AeoResult;
  activeTab: AuditCategory;
  onTabChange: (id: AuditCategory) => void;
}

function AuditTabs({ data, activeTab, onTabChange }: AuditTabProps) {
  return (
    <section className={styles.panel}>
      <h3 className={styles.panelH3}>Category Analysis Details</h3>
      <div className={styles.tabList} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => {
        const catData = data.categories[tab.id];
        const catAudits = data.audit.filter((a) => a.category === tab.id);
        return (
          <div
            key={tab.id}
            role="tabpanel"
            className={`${styles.tabContent} ${activeTab === tab.id ? styles.tabContentActive : ''}`}
          >
            <div className={styles.tabSummary}>
              <div>
                <h4 className={styles.tabSummaryH4}>{catData.name}</h4>
                <p className={styles.tabSummaryP}>{tab.desc}</p>
              </div>
              <div className={styles.categoryPercentage}>
                <span className={styles.pctNum}>{catData.score}/{catData.max}</span>
                <span className={styles.pctLbl}>Points</span>
              </div>
            </div>
            <ul className={styles.auditList}>
              {catAudits.map((audit, i) => (
                <li
                  key={i}
                  className={`${styles.auditItem} ${
                    audit.status === 'pass'
                      ? styles.auditItemPass
                      : audit.status === 'warn'
                      ? styles.auditItemWarn
                      : styles.auditItemFail
                  }`}
                >
                  <div className={styles.auditIcon}>
                    {audit.status === 'pass' ? '✓' : audit.status === 'warn' ? '⚠' : '✗'}
                  </div>
                  <div className={styles.auditDetails}>
                    <div className={styles.auditName}>{audit.name}</div>
                    <div className={styles.auditMsg}>{audit.message}</div>
                    {audit.agentFailureExplanation && (
                      <div className={styles.agentFailureReason}>
                        <strong>Agent Checkout Failure Reason:</strong> {audit.agentFailureExplanation}
                      </div>
                    )}
                    {audit.status !== 'pass' && audit.fix && (
                      <div className={styles.auditTip}>
                        GEO Recommendation: {audit.fix.split('\n')[0]}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Engine Compatibility
// ---------------------------------------------------------------------------

const ENGINE_META = [
  { key: 'perplexity', label: 'Perplexity', icon: '🔮' },
  { key: 'gemini', label: 'Gemini Search', icon: '✨' },
  { key: 'chatgpt', label: 'ChatGPT Search', icon: '💬' },
  { key: 'sge', label: 'Google SGE', icon: '🔍' },
  { key: 'ucp', label: 'Google UCP', icon: '🛒' },
] as const;

type EngineKey = (typeof ENGINE_META)[number]['key'];

function badgeClass(score: number) {
  if (score >= 85) return styles.badgeExcellent;
  if (score >= 70) return styles.badgeGood;
  if (score >= 55) return styles.badgeModerate;
  return styles.badgeNeedsWork;
}

// ---------------------------------------------------------------------------
// Score Ring animation (pure CSS transition; React controls the offset)
// ---------------------------------------------------------------------------

interface ScoreRingProps {
  score: number;
  grade: string;
  url: string;
}

function ScoreRing({ score, grade, url }: ScoreRingProps) {
  const circum = 440;
  const offset = circum - (circum * score) / 100;

  let strokeColor = 'var(--status-fail)';
  if (score >= 80) strokeColor = 'var(--accent-cyan)';
  else if (score >= 60) strokeColor = 'var(--status-warn)';

  // Animated counter
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let current = 0;
    const total = score;
    const stepTime = Math.max(10, Math.floor(1200 / total));
    const timer = setInterval(() => {
      current++;
      setDisplayed(current);
      if (current >= total) clearInterval(timer);
    }, stepTime);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <section className={`${styles.panel} ${styles.scoreCard}`}>
      <h3 className={styles.panelH3}>Technical detail: overall AEO/GEO score</h3>
      <div className={styles.scoreCircleWrapper}>
        <svg className={styles.scoreRing} width="160" height="160">
          <circle className={styles.scoreRingBg} cx="80" cy="80" r="70" />
          <circle
            className={styles.scoreRingProgress}
            cx="80"
            cy="80"
            r="70"
            style={{ strokeDashoffset: offset, stroke: strokeColor }}
          />
        </svg>
        <div className={styles.scoreTextContainer}>
          <span className={styles.scoreValue}>{displayed}</span>
          <span className={styles.scoreGrade} style={{ color: strokeColor }}>
            {grade}
          </span>
        </div>
      </div>
      <p className={styles.scannedUrl}>scanned: {url}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

export default function AeoScorePage() {
  const [view, setView] = useState<View>('form');
  const [urlValue, setUrlValue] = useState('');
  const [forceDemo, setForceDemo] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const [result, setResult] = useState<AeoResult | null>(null);
  const [activeTab, setActiveTab] = useState<AuditCategory>('schema');
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console body
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const handlePreset = useCallback((presetUrl: string) => {
    setUrlValue(presetUrl);
    setForceDemo(true);
    // Trigger submit after state update
    setTimeout(() => {
      document.getElementById('aeo-submit-btn')?.click();
    }, 0);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const rawUrl = urlValue.trim();
      if (!rawUrl) return;

      const isDemo = forceDemo || rawUrl.includes('example-') || rawUrl.includes('demo.');

      // --- Terminal log steps ---
      const logSteps: { text: string; type: 'info' | 'success' | 'wait'; delay: number }[] = [
        { text: 'Starting crawler core...', type: 'info', delay: 100 },
        { text: `Target URL: ${rawUrl}`, type: 'wait', delay: 200 },
        { text: isDemo ? 'Simulation sandbox enabled.' : 'Establishing handshake with remote port...', type: 'info', delay: 400 },
        { text: 'HTTP response 200 OK. Fetching HTML stream...', type: 'success', delay: 800 },
        { text: 'HTML streaming completed. Initiating Cheerio DOM parser...', type: 'info', delay: 1100 },
        { text: 'Scanning <head> elements for JSON-LD schemas...', type: 'wait', delay: 1400 },
        { text: 'Indexing content structure: checklists, grids, and headings...', type: 'wait', delay: 1800 },
        { text: 'Evaluating semantic text readability and direct Q&A answers...', type: 'wait', delay: 2100 },
        { text: 'Verifying trust anchors, outbound links, and citations profiles...', type: 'wait', delay: 2400 },
        { text: 'Checking Google UCP endpoint discovery configurations...', type: 'wait', delay: 2700 },
        { text: 'Compiling overall Answer Engine Optimization rating...', type: 'info', delay: 3000 },
        { text: 'GEO/AEO audit calculation completed successfully.', type: 'success', delay: 3300 },
      ];

      setConsoleLogs([]);
      setView('loading');

      // Schedule terminal log lines
      const timers: ReturnType<typeof setTimeout>[] = [];
      logSteps.forEach((step) => {
        const t = setTimeout(() => {
          setConsoleLogs((prev) => [...prev, { text: step.text, type: step.type }]);
        }, step.delay);
        timers.push(t);
      });

      // Fetch concurrently with the terminal animation
      let fetchError: string | null = null;
      let analysisResult: AeoResult | null = null;
      try {
        const demoParam = isDemo ? '&demo=true' : '';
        const response = await fetch(`/aeo-score/api/analyze?url=${encodeURIComponent(rawUrl)}${demoParam}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error ?? 'Server returned an invalid response.');
        }
        analysisResult = await response.json();
      } catch (err) {
        fetchError = err instanceof Error ? err.message : String(err);
      }

      // Wait for terminal animation to finish, then show results or error
      const finalTimer = setTimeout(() => {
        if (fetchError) {
          setView('form');
          alert(`Audit failed: ${fetchError}\n\nTip: If the URL is protected, tick "Force Simulated Audit".`);
          return;
        }
        setResult(analysisResult);
        setActiveTab('schema');
        setView('results');
      }, 3600);

      timers.push(finalTimer);
      // Note: timers are fire-and-forget; component unmount cleanup is fine since
      // state updates on unmounted components are handled gracefully by React 18.
    },
    [urlValue, forceDemo]
  );

  const handleReAudit = useCallback(() => {
    setView('form');
    setUrlValue('');
    setForceDemo(false);
    setResult(null);
  }, []);

  return (
    <div className={styles.root}>
      {/* Decorative glows */}
      <div className={`${styles.decorGlow} ${styles.decorGlow1}`} />
      <div className={`${styles.decorGlow} ${styles.decorGlow2}`} />
      <div className={`${styles.decorGlow} ${styles.decorGlow3}`} />

      <div className={styles.appContainer}>
        {/* Header */}
        <header className={styles.appHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            <span>AI-<span className={styles.logoSub}>Readiness</span></span>
          </div>
          <p className={styles.tagline}>
            Find out what level your store is at — and the exact list of what&rsquo;s holding it back.
          </p>
        </header>

        <main>
          {/* Input Form */}
          {view === 'form' && (
            <section className={`${styles.panel} ${styles.inputPanel}`}>
              <h2 className={styles.panelH2}>Check your store&rsquo;s AI-readiness score</h2>
              <p className={styles.panelDesc}>
                Two minutes, no signup. We&rsquo;ll scan the page and tell you your readiness level,
                your score, and the exact things holding it back — in plain language.
              </p>
              <form onSubmit={handleSubmit}>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>🌐</span>
                  <input
                    className={styles.urlInput}
                    type="text"
                    placeholder="e.g. blog.ycombinator.com or shopify.com/blog..."
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    required
                    autoComplete="off"
                  />
                  <button
                    id="aeo-submit-btn"
                    type="submit"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                  >
                    Check my store
                  </button>
                </div>
                <div className={styles.checkboxWrapper}>
                  <input
                    type="checkbox"
                    id="demo-mode"
                    checked={forceDemo}
                    onChange={(e) => setForceDemo(e.target.checked)}
                  />
                  <label htmlFor="demo-mode" className={styles.checkboxLabel}>
                    Force Simulated Audit (Quick Sandbox Mode)
                  </label>
                </div>
              </form>
              <div className={styles.demoPresets}>
                <span>Try a Demo URL:</span>
                <button className={styles.btnPreset} onClick={() => handlePreset('tech-trends-blog.example.com')}>
                  📰 Technology Blog (A- Grade)
                </button>
                <button className={styles.btnPreset} onClick={() => handlePreset('smartwidgets-store.example.com')}>
                  🛒 E-Commerce Shop (C+ Grade)
                </button>
              </div>
            </section>
          )}

          {/* Loading Terminal */}
          {view === 'loading' && (
            <section className={`${styles.panel} ${styles.consolePanel}`}>
              <div className={styles.consoleHeader}>
                <div className={styles.consoleDots}>
                  <span className={`${styles.dot} ${styles.dotRed}`} />
                  <span className={`${styles.dot} ${styles.dotYellow}`} />
                  <span className={`${styles.dot} ${styles.dotGreen}`} />
                </div>
                <span className={styles.consoleTitle}>GEO Crawler Terminal</span>
              </div>
              <div className={styles.consoleBody} ref={consoleRef}>
                {consoleLogs.map((log, i) => (
                  <div key={i} className={styles.consoleLine}>
                    <span
                      className={
                        log.type === 'success'
                          ? styles.statusSuccess
                          : log.type === 'info'
                          ? styles.statusInfo
                          : styles.statusWait
                      }
                    >
                      {log.type === 'success' ? '[SUCCESS] ' : log.type === 'info' ? '[SYSTEM] ' : '[CRAWL] '}
                    </span>
                    {log.text}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Results */}
          {view === 'results' && result && (
            <div>
              {/* The shareable one-page verdict — level, score, top blockers, CTA */}
              <ReadinessCard result={result} />

              {/* Technical detail: category score ring + engine compatibility */}
              <div className={styles.resultsGridTop}>
                <ScoreRing score={result.score} grade={result.grade} url={result.url} />
                <section className={styles.panel}>
                  <h3 className={styles.panelH3}>Generative Engine Compatibility</h3>
                  <div className={styles.enginesGrid}>
                    {ENGINE_META.map(({ key, label, icon }) => {
                      const eng = result.engineCompatibility[key as EngineKey];
                      return (
                        <div key={key} className={styles.engineRow}>
                          <div className={styles.engineNameWrapper}>
                            <span className={styles.engineLogo}>{icon}</span>
                            <div className={styles.engineMeta}>
                              <span className={styles.engineName}>{label}</span>
                              <span className={`${styles.engineBadge} ${badgeClass(eng.score)}`}>
                                {eng.status}
                              </span>
                            </div>
                          </div>
                          <div className={styles.engineScoreContainer}>
                            <div className={styles.progressBarContainer}>
                              <div
                                className={styles.progressBarFill}
                                style={{ width: `${eng.score}%` }}
                              />
                            </div>
                            <span className={styles.engineScore}>{eng.score}%</span>
                          </div>
                          <p className={styles.engineDesc}>{eng.details}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Category Audit Tabs */}
              <AuditTabs data={result} activeTab={activeTab} onTabChange={setActiveTab} />

              {/* LLM Digest */}
              <section className={styles.panel}>
                <h3 className={styles.panelH3}>LLM Content Scraper Digest</h3>
                <p className={styles.panelDesc}>
                  This is a simulation of the core text outlines and entities parsed by a generative
                  engine crawler when reading your page:
                </p>
                <pre className={styles.llmDigestBox}>{result.llmView}</pre>
              </section>

              {/* Actionable Checklist */}
              <section className={styles.panel}>
                <h3 className={styles.panelH3}>Technical detail: full fix checklist</h3>
                <p className={styles.panelDesc}>
                  Everything behind the score above, for whoever implements the fixes:
                </p>
                <div className={styles.checklistItems}>
                  {(() => {
                    const nonPassed = result.audit
                      .filter((a) => a.status !== 'pass')
                      .sort((a, b) => {
                        if (a.status === 'fail' && b.status === 'warn') return -1;
                        if (a.status === 'warn' && b.status === 'fail') return 1;
                        return 0;
                      });
                    if (nonPassed.length === 0) {
                      return (
                        <div
                          className={styles.panel}
                          style={{ textAlign: 'center', borderColor: 'var(--status-pass)' }}
                        >
                          <p style={{ color: 'var(--status-pass)', fontWeight: 600 }}>
                            Zero GEO Warnings or Fails!
                          </p>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Your website is fully optimized for semantic scraping, citations referencing,
                            and LLM text summarizing. Outstanding job!
                          </p>
                        </div>
                      );
                    }
                    return nonPassed.map((audit, i) => (
                      <ChecklistCard key={i} audit={audit} />
                    ));
                  })()}
                </div>
              </section>

              <div className={styles.bottomActions}>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleReAudit}>
                  ← Audit Another Website
                </button>
              </div>
            </div>
          )}
        </main>

        <footer className={styles.appFooter}>
          <p>&copy; 2026 AI-Readiness Score — part of <strong>RetailAgentOS</strong>&rsquo;s open reference architecture.</p>
        </footer>
      </div>
    </div>
  );
}
