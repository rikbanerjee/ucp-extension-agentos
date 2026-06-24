/**
 * AEO/GEO Analyzer — server-side scraping and scoring logic.
 *
 * All network I/O (axios fetches) and cheerio DOM parsing live here.
 * This module is ONLY imported by the route handler in
 * src/app/aeo-score/api/analyze/route.ts — it must never be imported
 * by the RAOS engine (src/lib/rules/*, src/lib/extensions/*, src/lib/types/*).
 *
 * Ported faithfully from the Express source project's server.js.
 * Changes from source:
 *   - Converted JS → TypeScript with explicit types.
 *   - Replaced CommonJS require() with ES module imports.
 *   - auditRetailAgentOS extracted to ./widgetAudit.ts.
 *   - No Date.now() or random values — scoring is deterministic for a given
 *     HTML snapshot.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { auditRetailAgentOS } from './widgetAudit';
import type { AeoResult, AuditItem } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Browser-like User-Agent used for all outbound HTTP requests. */
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Demo / Mock data generators
// ---------------------------------------------------------------------------

/**
 * Returns a canned analysis result for demo/sandbox mode.
 * Varies based on whether the hostname looks like a store or blog.
 */
export function generateDemoData(url: string): AeoResult {
  let siteName = 'Demo Site';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    siteName = parsed.hostname;
  } catch {
    siteName = url;
  }

  const isStore =
    siteName.includes('store') || siteName.includes('shop') || siteName.includes('product');

  if (isStore) {
    return {
      url,
      siteName,
      score: 64,
      grade: 'C+',
      categories: {
        schema: { score: 12, max: 20, name: 'Schema & Structured Data' },
        format: { score: 15, max: 20, name: 'Format & Data Density' },
        readability: { score: 10, max: 20, name: 'Readability & Direct Answers' },
        eeat: { score: 14, max: 20, name: 'EEAT & Authority' },
        metadata: { score: 13, max: 20, name: 'Technical & Metadata' },
        retailagentos: { score: 12, max: 20, name: 'RetailAgentOS Reasoning' },
      },
      audit: [
        { category: 'schema', status: 'pass', name: 'Product Schema', message: 'Product schema JSON-LD found.', fix: null },
        {
          category: 'schema',
          status: 'fail',
          name: 'FAQ Schema',
          message: 'No FAQPage schema found. Search engines like Gemini rely on FAQ schemas for direct answers.',
          fix: 'Add structured JSON-LD FAQ schema.',
        },
        { category: 'format', status: 'pass', name: 'Tables and Specifications', message: 'Found product specification tables which help LLMs extract structured features.', fix: null },
        { category: 'format', status: 'pass', name: 'Bullet Lists', message: 'Found lists highlighting key product benefits.', fix: null },
        {
          category: 'readability',
          status: 'warn',
          name: 'Sentence and Paragraph Length',
          message: 'Some product descriptions use long sentences. Keep sentences under 15 words for easy LLM summary extraction.',
          fix: 'Simplify your copy. Break up paragraphs into smaller bulleted points.',
        },
        {
          category: 'readability',
          status: 'fail',
          name: 'Direct Q&A Structure',
          message: 'No direct heading-to-answer structures found.',
          fix: 'Use H3 headings for customer questions and start the immediate paragraph with a direct, single-sentence answer.',
        },
        { category: 'eeat', status: 'pass', name: 'Trust Pages', message: 'Found links to About Us, Contact, and Return Policy.', fix: null },
        {
          category: 'eeat',
          status: 'warn',
          name: 'External Citations',
          message: 'Zero outbound links to authority reviews or source comparisons.',
          fix: 'Link to reputable third-party review sites or industry standard organizations.',
        },
        { category: 'metadata', status: 'pass', name: 'Open Graph Data', message: 'Open Graph (OG) tags are fully implemented.', fix: null },
        {
          category: 'retailagentos',
          status: 'pass',
          name: 'Pricing Context Extension',
          message: 'Found active com.ezyupload.shopping.pricing_context extension context.',
          fix: null,
        },
        {
          category: 'retailagentos',
          status: 'pass',
          name: 'Eligibility Reasoning Extension',
          message: 'Found active com.ezyupload.shopping.eligibility namespace in UCP profile.',
          fix: null,
        },
        {
          category: 'retailagentos',
          status: 'pass',
          name: 'Bulk & Quantity Constraints Extension',
          message: 'Found active com.ezyupload.shopping.bulk_pricing namespace.',
          fix: null,
        },
        {
          category: 'retailagentos',
          status: 'fail',
          name: 'Promotional Reasoning Extension',
          message: 'Missing namespaced com.ezyupload.shopping.promo_pricing extension rules.',
          agentFailureExplanation:
            'AI shopping agents will fail to apply active promotions during cart formulation, making your products look less competitive.',
          fix: 'Define com.ezyupload.shopping.promo_pricing discount endpoints to let agents dynamically apply promotional rules.',
        },
        {
          category: 'retailagentos',
          status: 'fail',
          name: 'Fulfillment Constraints Extension',
          message: 'Missing namespaced com.ezyupload.shopping.fulfillment_constraints extension rules.',
          agentFailureExplanation:
            'AI shopping agents will attempt to ship bulky, hazardous, or perishable items to Hawaii, Alaska, or outside your shipping zones.',
          fix: 'Implement com.ezyupload.shopping.fulfillment_constraints rules in your UCP config.',
        },
      ],
      engineCompatibility: {
        perplexity: { score: 60, status: 'Moderate', details: 'Perplexity values citations and real-time reviews. Add external review links.' },
        gemini: { score: 72, status: 'Good', details: 'Gemini thrives on structured tables and product schemas. Add FAQ schemas.' },
        chatgpt: { score: 62, status: 'Moderate', details: 'ChatGPT parses deep context. Paragraph sizes need simplification.' },
        sge: { score: 65, status: 'Moderate', details: 'Google SGE matches product metadata well, but requires clearer QA formatting.' },
        ucp: { score: 85, status: 'Excellent', details: 'UCP checkout endpoints are discovered and Product schema is fully compliant.' },
      },
      llmView: `### Scraped Content Digest (Product Page Mode)
* **Product Name**: Premium Smart Widget Pro
* **Target Audience**: Tech professionals looking for workflow automation.
* **Pricing**: [Not found in structured text]
* **Primary Features**: Cloud synchronization, high-speed task worker, modular architecture.
* **Extraction Confidence**: 65% - *Warning: High text density caused parser confusion on specifications.*`,
    };
  }

  // Default / Blog style
  return {
    url,
    siteName,
    score: 84,
    grade: 'A-',
    categories: {
      schema: { score: 17, max: 20, name: 'Schema & Structured Data' },
      format: { score: 14, max: 20, name: 'Format & Data Density' },
      readability: { score: 18, max: 20, name: 'Readability & Direct Answers' },
      eeat: { score: 15, max: 20, name: 'EEAT & Authority' },
      metadata: { score: 20, max: 20, name: 'Technical & Metadata' },
      retailagentos: { score: 0, max: 20, name: 'RetailAgentOS Reasoning' },
    },
    audit: [
      { category: 'schema', status: 'pass', name: 'Article Schema', message: 'Article JSON-LD schema found.', fix: null },
      { category: 'schema', status: 'pass', name: 'FAQ Schema', message: 'FAQPage schema found with 3 questions.', fix: null },
      {
        category: 'format',
        status: 'warn',
        name: 'Tables and Specifications',
        message: 'No tables found. AI engines love tabular lists for side-by-side comparison features.',
        fix: 'Convert your main feature comparison paragraph into a semantic <table>.',
      },
      { category: 'format', status: 'pass', name: 'Bullet Lists', message: 'Good usage of bullet points for summarization.', fix: null },
      { category: 'readability', status: 'pass', name: 'Direct Answers', message: 'Found 4 headers containing direct questions followed by 1-2 sentence answers.', fix: null },
      { category: 'readability', status: 'pass', name: 'Readability Level', message: 'Flesch readability score is ideal (simple, conversational language).', fix: null },
      { category: 'eeat', status: 'pass', name: 'Author Profiles', message: 'Found author biography links and LinkedIn profile URLs.', fix: null },
      {
        category: 'eeat',
        status: 'warn',
        name: 'External Citations',
        message: 'Outbound links present, but they point mostly to social channels rather than academic/industry reference sources.',
        fix: 'Add outbound links to authoritative resources (Wikipedia, official docs, stats providers) to back up your claims.',
      },
      { category: 'metadata', status: 'pass', name: 'SEO & Metadata', message: 'Title, description, and Open Graph headers are fully optimized.', fix: null },
      {
        category: 'retailagentos',
        status: 'fail',
        name: 'Pricing Context Extension',
        message: 'Missing com.ezyupload.shopping.pricing_context extension context.',
        agentFailureExplanation:
          'AI shopping agents will default to general list prices rather than B2B, wholesale, or membership-tier rates.',
        fix: 'Add the com.ezyupload.shopping.pricing_context endpoint to your UCP extensions block.',
      },
      {
        category: 'retailagentos',
        status: 'fail',
        name: 'Eligibility Reasoning Extension',
        message: 'Missing namespaced com.ezyupload.shopping.eligibility extension rules.',
        agentFailureExplanation:
          'AI shopping agents will fail by recommending products restricted to specific accounts to guest buyers.',
        fix: 'Add the com.ezyupload.shopping.eligibility endpoint.',
      },
      {
        category: 'retailagentos',
        status: 'fail',
        name: 'Bulk & Quantity Constraints Extension',
        message: 'Missing namespaced com.ezyupload.shopping.bulk_pricing extension rules.',
        agentFailureExplanation:
          'AI shopping agents will construct carts with quantities below your MOQ or incorrect step increments.',
        fix: 'Expose com.ezyupload.shopping.bulk_pricing rules in your UCP extensions.',
      },
      {
        category: 'retailagentos',
        status: 'fail',
        name: 'Promotional Reasoning Extension',
        message: 'Missing namespaced com.ezyupload.shopping.promo_pricing extension rules.',
        agentFailureExplanation:
          'AI shopping agents will fail to apply active promotions during cart formulation.',
        fix: 'Define com.ezyupload.shopping.promo_pricing discount endpoints.',
      },
      {
        category: 'retailagentos',
        status: 'fail',
        name: 'Fulfillment Constraints Extension',
        message: 'Missing namespaced com.ezyupload.shopping.fulfillment_constraints extension rules.',
        agentFailureExplanation:
          'AI shopping agents will attempt to ship to restricted zones, causing shipping blocks late at checkout.',
        fix: 'Implement com.ezyupload.shopping.fulfillment_constraints rules in your UCP config.',
      },
    ],
    engineCompatibility: {
      perplexity: { score: 85, status: 'Excellent', details: 'Excellent source structure. Cite high-authority resources to score higher.' },
      gemini: { score: 88, status: 'Excellent', details: 'Gemini indexes the FAQ schema and Q&A blocks perfectly.' },
      chatgpt: { score: 80, status: 'Good', details: 'Very clean parsing. Needs more external backlinks to boost OpenAI index authority.' },
      sge: { score: 83, status: 'Excellent', details: 'SGE matches the semantic header structure well.' },
      ucp: { score: 30, status: 'Needs Work', details: 'Universal Commerce Protocol is designed for transactional e-commerce sites. No Product schema or checkout endpoints found.' },
    },
    llmView: `### Scraped Content Digest (Article Mode)
* **Title**: The Future of Generative AI in Local Web Development
* **Author**: Jane Doe (Technical Lead)
* **Main Premise**: Explores how offline-first developer workflows are changing under LLM guidance.
* **Key Takeaway 1**: Local compilers and agent systems reduce cloud roundtrip latency.
* **Key Takeaway 2**: Context-window size is secondary to prompt precision.
* **Extraction Confidence**: 92% - *Success: Very clear semantic layout allows for clean summary extraction.*`,
  };
}

/**
 * Returns a canned result indicating the target site blocked the crawler.
 */
export function generateBlockedData(url: string, statusCode: string | number): AeoResult {
  let siteName = 'Protected Website';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    siteName = parsed.hostname;
  } catch {
    siteName = url;
  }

  return {
    url,
    siteName,
    score: 35,
    grade: 'D-',
    isBlocked: true,
    categories: {
      schema: { score: 0, max: 20, name: 'Schema & Structured Data' },
      format: { score: 0, max: 20, name: 'Format & Data Density' },
      readability: { score: 0, max: 20, name: 'Readability & Direct Answers' },
      eeat: { score: 15, max: 20, name: 'EEAT & Authority' },
      metadata: { score: 20, max: 20, name: 'Technical & Metadata' },
      retailagentos: { score: 0, max: 20, name: 'RetailAgentOS Reasoning' },
    },
    audit: [
      {
        category: 'metadata',
        status: 'fail',
        name: 'Scraper / Bot Blocked',
        message: `The server returned HTTP status code ${statusCode} (Access Denied/Forbidden). Strict firewall controls (like Cloudflare, Akamai, or AWS WAF) are blocking automated requests.`,
        fix: 'Configure CDN/WAF rules to whitelist user-agents for generative engines. Ensure agents like "PerplexityBot", "OAI-SearchBot", and "Google-Extended" are allowed to parse content.',
      },
      {
        category: 'schema',
        status: 'fail',
        name: 'Structured Data Presence',
        message: 'Could not audit schema markup. Request blocked by host firewall.',
        fix: 'Ensure structured data is server-rendered so that when bots are whitelisted, schemas are readable instantly.',
      },
      {
        category: 'format',
        status: 'fail',
        name: 'Lists & Grids Scannability',
        message: 'Could not scan paragraph densities or tables due to request blocking.',
        fix: 'Structure content cleanly in HTML so whitelisted search agents find comparison tables and bullet points.',
      },
      {
        category: 'readability',
        status: 'fail',
        name: 'Direct Answers (Q&A)',
        message: 'Unable to analyze text readability or direct query definitions due to blocking.',
        fix: 'Place short summaries in paragraph form following clear questions (H2/H3).',
      },
      {
        category: 'retailagentos',
        status: 'fail',
        name: 'RetailAgentOS Constraints',
        message: 'Could not fetch /.well-known/ucp discovery profile due to scraper blocking.',
        fix: 'Ensure your CDN/WAF does not block automated queries to your UCP discovery endpoints.',
      },
    ],
    engineCompatibility: {
      perplexity: { score: 25, status: 'Needs Work', details: 'Perplexity uses real-time fetching. If PerplexityBot is blocked, you will not be cited.' },
      gemini: { score: 40, status: 'Needs Work', details: 'Google-Extended crawler blocks will prevent Bard/Gemini indexing.' },
      chatgpt: { score: 30, status: 'Needs Work', details: 'ChatGPT Search uses OAI-SearchBot. Ensure this bot is whitelisted in robots.txt and WAF settings.' },
      sge: { score: 45, status: 'Needs Work', details: 'Strict WAF overrides will still block real-time AI snippets.' },
      ucp: { score: 20, status: 'Needs Work', details: 'Agentic commerce checkout flows are blocked by firewall rules.' },
    },
    llmView: `### Scraped Content Digest (Scraper Blocked)
* **Resolved Domain**: ${siteName}
* **HTTP Error**: ${statusCode} Forbidden / Access Denied
* **Extraction Confidence**: 0%
* **Warning**: The target website returned a block status. Large Language Models (LLMs) and real-time Answer Engines are unable to crawl this site automatically. Make sure your robots.txt allows search agent crawlers.`,
  };
}

// ---------------------------------------------------------------------------
// UCP discovery check
// ---------------------------------------------------------------------------

interface UcpCheckResult {
  exists: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | null;
}

/**
 * Probes /.well-known/ucp on the target host.
 * Returns { exists: false } silently on any error (timeouts, 404s, etc.).
 *
 * This is the most on-brand check in the whole scorer: it ties directly
 * into the RAOS manifest spec (RAOS-0000 §6). Preserve this logic faithfully.
 */
async function checkUcpDiscovery(url: string): Promise<UcpCheckResult> {
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname;
    // Skip synthetic / example URLs — they will never resolve.
    if (host.includes('example.com') || host.includes('example.org') || host.startsWith('demo.')) {
      return { exists: false, data: null };
    }
    const ucpUrl = `https://${host}/.well-known/ucp`;
    const response = await axios.get(ucpUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'application/json',
      },
      timeout: 3000,
      validateStatus: (status) => status === 200,
    });
    if (response.data && typeof response.data === 'object') {
      return { exists: true, data: response.data };
    }
  } catch {
    // Fail silently — absence of UCP is a scored signal, not an error.
  }
  return { exists: false, data: null };
}

// ---------------------------------------------------------------------------
// Main analyzer
// ---------------------------------------------------------------------------

/**
 * Fetches the target URL, parses HTML with cheerio, and returns a full
 * AeoResult. Throws on unrecoverable fetch errors (non-block failures).
 *
 * Note: for 403/401/503/999 responses, returns generateBlockedData()
 * rather than throwing, so the dashboard can render a meaningful blocked view.
 */
export async function performAnalysis(targetUrl: string): Promise<AeoResult> {
  let resolvedUrl = targetUrl;
  if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://')) {
    resolvedUrl = 'https://' + resolvedUrl;
  }

  // --- Fetch the target page ---
  let html = '';
  try {
    const response = await axios.get<string>(resolvedUrl, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
      maxRedirects: 5,
    });
    html = response.data as string;
    // Track redirect destination if available
    const responseUrl = (response.request as { res?: { responseUrl?: string } })?.res?.responseUrl;
    if (responseUrl) {
      resolvedUrl = responseUrl;
    }
  } catch (err) {
    const axiosErr = err as { response?: { status?: number }; message?: string };
    const status = axiosErr.response?.status;
    if (status === 403 || status === 401 || status === 503 || status === 999) {
      return generateBlockedData(targetUrl, status);
    }
    throw new Error(
      `Could not fetch the URL: ${axiosErr.message ?? String(err)}. Please verify the URL or try another website, or use the Demo/Simulated audit.`
    );
  }

  // --- Soft-block detection (WAF pages that return 200 OK) ---
  const $ = cheerio.load(html);
  const htmlLower = html.toLowerCase();
  const titleText = $('title').text().toLowerCase();

  const isAwsWaf = htmlLower.includes('awswafintegration') || htmlLower.includes('aws-waf');
  const isCloudflare =
    htmlLower.includes('cf-challenge') ||
    htmlLower.includes('cloudflare-challenge') ||
    titleText.includes('cloudflare') ||
    htmlLower.includes('cf-browser-verification');
  const isCaptcha =
    htmlLower.includes('captcha') || htmlLower.includes('hcaptcha') || htmlLower.includes('recaptcha');
  const isGenericChallenge =
    htmlLower.includes('javascript is required') ||
    htmlLower.includes('enable javascript') ||
    htmlLower.includes('ddos-guard') ||
    htmlLower.includes('sucuri') ||
    titleText.includes('just a moment');

  if (isAwsWaf || isCloudflare || isCaptcha || isGenericChallenge) {
    return generateBlockedData(targetUrl, '200 (WAF Challenge)');
  }

  // --- UCP discovery (the RAOS-specific check) ---
  const ucpCheck = await checkUcpDiscovery(resolvedUrl);

  // --- Site name ---
  let siteName = 'Unknown Website';
  try {
    siteName = new URL(resolvedUrl).hostname;
  } catch { /* ignore */ }

  // -----------------------------------------------------------------------
  // 1. Schema & Structured Data
  // -----------------------------------------------------------------------
  let schemaScore = 0;
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const hasMicrodata = $('[itemscope], [itemprop]').length > 0;

  const foundSchemaTypes: string[] = [];
  let hasUcpProductSchema = false;
  let hasUcpOfferSchema = false;
  let hasPrice = false;
  let hasAvailability = false;

  jsonLdScripts.each((_, el) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const checkType = (obj: any) => {
        if (!obj || typeof obj !== 'object') return;
        if (obj['@type']) {
          const types: string[] = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
          types.forEach((t) => {
            if (typeof t === 'string') {
              foundSchemaTypes.push(t);
              const tl = t.toLowerCase();
              if (tl.includes('product')) hasUcpProductSchema = true;
              if (tl.includes('offer')) hasUcpOfferSchema = true;
            }
          });
        }
        if (obj.price !== undefined || obj.lowPrice !== undefined) hasPrice = true;
        if (obj.availability !== undefined || obj.priceCurrency !== undefined) hasAvailability = true;
        if (obj['@graph'] && Array.isArray(obj['@graph'])) {
          obj['@graph'].forEach(checkType);
        } else {
          for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') checkType(obj[key]);
          }
        }
      };

      const parsed = JSON.parse($(el).text().trim());
      if (Array.isArray(parsed)) parsed.forEach(checkType);
      else checkType(parsed);
    } catch { /* invalid JSON */ }
  });

  const uniqueSchemas = [...new Set(foundSchemaTypes)];
  const schemaAudits: AuditItem[] = [];

  if (jsonLdScripts.length > 0 || hasMicrodata) {
    schemaScore += 8;
    schemaAudits.push({ category: 'schema', status: 'pass', name: 'Structured Data Presence', message: `Found ${jsonLdScripts.length} JSON-LD schemas and/or Microdata items on the page.`, fix: null });
  } else {
    schemaAudits.push({ category: 'schema', status: 'fail', name: 'Structured Data Presence', message: 'No JSON-LD scripts or Microdata attributes detected. Structured data is vital for LLMs to build search snippets.', fix: 'Embed JSON-LD schemas like Article, Organization, or Product directly in the HTML document.' });
  }

  const hasFAQ = uniqueSchemas.some((t) => t.toLowerCase().includes('faqpage') || t.toLowerCase().includes('qapage'));
  const hasArticle = uniqueSchemas.some((t) => t.toLowerCase().includes('article') || t.toLowerCase().includes('blogposting') || t.toLowerCase().includes('newsarticle'));
  const hasOrgOrPerson = uniqueSchemas.some((t) => t.toLowerCase().includes('organization') || t.toLowerCase().includes('person') || t.toLowerCase().includes('brand'));
  const hasProduct = uniqueSchemas.some((t) => t.toLowerCase().includes('product') || t.toLowerCase().includes('recipe') || t.toLowerCase().includes('course') || t.toLowerCase().includes('howto'));

  if (hasFAQ) {
    schemaScore += 6;
    schemaAudits.push({ category: 'schema', status: 'pass', name: 'Q&A / FAQ Schema', message: 'FAQPage/QAPage schema detected. Direct questions can be indexed directly by answer engines.', fix: null });
  } else {
    schemaAudits.push({ category: 'schema', status: 'fail', name: 'FAQ/Q&A Schema', message: 'No FAQPage or QAPage schema found. LLMs utilize FAQ structures to return concise question-and-answer snippets.', fix: 'Use schema.org FAQPage JSON-LD syntax to outline your top common questions and direct answers.' });
  }

  if (hasArticle) {
    schemaScore += 3;
    schemaAudits.push({ category: 'schema', status: 'pass', name: 'Content Schema', message: 'Article / BlogPost schema found. Helps engines process authors, publishing dates, and main text fields.', fix: null });
  } else {
    schemaAudits.push({ category: 'schema', status: 'warn', name: 'Content Schema', message: 'No Article or BlogPost schema found.', fix: 'If this is an article or blog post, add Article or BlogPosting JSON-LD to supply publish date and editor details.' });
  }

  if (hasOrgOrPerson) {
    schemaScore += 3;
    schemaAudits.push({ category: 'schema', status: 'pass', name: 'Publisher Identity Schema', message: 'Organization / Person schema found. Essential for LLM validation of publishing authority.', fix: null });
  } else {
    schemaAudits.push({ category: 'schema', status: 'warn', name: 'Publisher Identity Schema', message: 'No Organization or Person schema found.', fix: 'Add Organization or Person schema to define corporate or personal brand entities.' });
  }

  if (hasProduct) schemaScore += 2;
  schemaScore = Math.min(20, schemaScore);

  // -----------------------------------------------------------------------
  // 2. Format & Data Density
  // -----------------------------------------------------------------------
  let formatScore = 0;
  const formatAudits: AuditItem[] = [];

  const tables = $('table');
  const lists = $('ul, ol');
  const bolds = $('strong, b');

  if (tables.length > 0) {
    formatScore += 6;
    formatAudits.push({ category: 'format', status: 'pass', name: 'Data Tables', message: `Found ${tables.length} tables. Tables enable LLMs to compile structured comparisons and metrics.`, fix: null });
  } else {
    formatAudits.push({ category: 'format', status: 'warn', name: 'Data Tables', message: 'No HTML tables found. Tabular data is preferred by engines like Gemini for layout and quick side-by-side spec comparisons.', fix: 'Re-format comparison paragraphs or lists of item dimensions and pricing into standard <table> grids.' });
  }

  let listItemsCount = 0;
  lists.each((_, el) => { listItemsCount += $(el).find('li').length; });

  if (lists.length > 2 && listItemsCount > 8) {
    formatScore += 6;
    formatAudits.push({ category: 'format', status: 'pass', name: 'Bulleted Lists', message: `Found ${lists.length} lists containing ${listItemsCount} items, providing high scannability.`, fix: null });
  } else if (lists.length > 0) {
    formatScore += 3;
    formatAudits.push({ category: 'format', status: 'warn', name: 'Bulleted Lists', message: 'Minimal lists detected. Bullet points make it easier for LLM decoders to parse summaries.', fix: 'Break up wall-of-text sections into bulleted key takeaway lists.' });
  } else {
    formatAudits.push({ category: 'format', status: 'fail', name: 'Bulleted Lists', message: 'No unordered or ordered lists found. Wall-of-text layout is difficult for summary extractions.', fix: 'Extract features or key steps into bulleted list items.' });
  }

  if (bolds.length > 5) {
    formatScore += 4;
    formatAudits.push({ category: 'format', status: 'pass', name: 'Visual Emphasis (Bold text)', message: `Found ${bolds.length} bolded phrases to emphasize key takeaways.`, fix: null });
  } else {
    formatAudits.push({ category: 'format', status: 'warn', name: 'Visual Emphasis (Bold text)', message: 'Scant usage of bold markup (<strong> or <b>). Bold text guides NLP entity weightings.', fix: 'Bold key nouns, numbers, and core answers to help LLM scrapers prioritize context.' });
  }

  const pageText = $('body').text();
  const digitRegex = /\b\d+(?:[\.,]\d+)*(?:\s*%|\s*USD|\$|\s*€|k|m|b)?\b/gi;
  const numbersFound = pageText.match(digitRegex) ?? [];
  const statRatio = numbersFound.length / Math.max(1, pageText.split(/\s+/).length);

  if (numbersFound.length > 8 && statRatio > 0.015) {
    formatScore += 4;
    formatAudits.push({ category: 'format', status: 'pass', name: 'Quantitative Data Density', message: `Found ${numbersFound.length} numerical stats/data points. High statistical density increases AI engine quotation likelihood.`, fix: null });
  } else {
    formatAudits.push({ category: 'format', status: 'warn', name: 'Quantitative Data Density', message: 'Low density of numerical data or stats. AI agents prioritize articles backed by quantitative figures.', fix: 'Include specific numbers, metrics, prices, and statistics (e.g. "30% boost", "$4.2M profit") to enhance trust.' });
  }
  formatScore = Math.min(20, formatScore);

  // -----------------------------------------------------------------------
  // 3. Readability & Direct Answers
  // -----------------------------------------------------------------------
  let readabilityScore = 0;
  const readAudits: AuditItem[] = [];

  let qaCount = 0;
  $('h1, h2, h3, h4, h5, h6, p strong').each((_, el) => {
    const text = $(el).text().trim();
    const isQuestion =
      text.endsWith('?') ||
      (/\b(what|how|why|who|where|when|which|is|are|can|do|does)\b/i.test(text) && text.split(/\s+/).length > 3);
    if (isQuestion && text.length < 120) {
      const nextEl = $(el).next();
      if (nextEl.length > 0 && nextEl[0].tagName === 'p') qaCount++;
    }
  });

  if (qaCount >= 3) {
    readabilityScore += 10;
    readAudits.push({ category: 'readability', status: 'pass', name: 'Direct Q&A Structure', message: `Detected ${qaCount} headers structured as clear questions followed by descriptive answer paragraphs.`, fix: null });
  } else if (qaCount > 0) {
    readabilityScore += 5;
    readAudits.push({ category: 'readability', status: 'warn', name: 'Direct Q&A Structure', message: `Detected only ${qaCount} clear question-and-answer pairs.`, fix: 'Structure your headers (H2/H3) as user search queries, and answer them directly in the first sentence of the following paragraph.' });
  } else {
    readAudits.push({ category: 'readability', status: 'fail', name: 'Direct Q&A Structure', message: 'No clear question-and-answer structures detected in heading transitions.', fix: 'Implement FAQ-style sections where typical user queries are explicitly stated in headings and immediately answered in plain English.' });
  }

  const h1s = $('h1');
  if (h1s.length === 1) {
    readabilityScore += 4;
    readAudits.push({ category: 'readability', status: 'pass', name: 'Title Hierarchy (H1)', message: 'Exactly one H1 found on the page, avoiding search engine confusion.', fix: null });
  } else if (h1s.length > 1) {
    readabilityScore += 2;
    readAudits.push({ category: 'readability', status: 'warn', name: 'Title Hierarchy (H1)', message: `Found ${h1s.length} H1 headings. Multiple H1 tags distort theme hierarchy for crawlers.`, fix: 'Ensure only the main title uses H1, and demote secondary titles to H2.' });
  } else {
    readAudits.push({ category: 'readability', status: 'fail', name: 'Title Hierarchy (H1)', message: 'No H1 headings found.', fix: 'Create a clear, descriptive H1 heading at the top of your content.' });
  }

  const h2h3s = $('h2, h3');
  if (h2h3s.length > 2) readabilityScore += 2;

  let totalParagraphWords = 0;
  let paragraphCount = 0;
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) {
      paragraphCount++;
      totalParagraphWords += text.split(/\s+/).length;
    }
  });

  const avgParagraphWords = paragraphCount > 0 ? totalParagraphWords / paragraphCount : 0;
  if (paragraphCount > 0) {
    if (avgParagraphWords >= 25 && avgParagraphWords <= 80) {
      readabilityScore += 4;
      readAudits.push({ category: 'readability', status: 'pass', name: 'Paragraph Word Count', message: `Average paragraph length is ${Math.round(avgParagraphWords)} words. Highly digestible for AI agents.`, fix: null });
    } else if (avgParagraphWords > 80 && avgParagraphWords <= 130) {
      readabilityScore += 2;
      readAudits.push({ category: 'readability', status: 'warn', name: 'Paragraph Word Count', message: `Average paragraph length is slightly long (${Math.round(avgParagraphWords)} words).`, fix: 'Keep paragraph sizes below 80 words. Break long summaries into separate sections.' });
    } else {
      readAudits.push({ category: 'readability', status: 'fail', name: 'Paragraph Word Count', message: `Paragraphs are extremely long (average ${Math.round(avgParagraphWords)} words) or too sparse.`, fix: 'Split dense blocks into separate short, cohesive paragraphs (2-3 sentences max).' });
    }
  } else {
    readAudits.push({ category: 'readability', status: 'fail', name: 'Paragraph Word Count', message: 'No standard body text paragraphs (<p>) detected.', fix: 'Ensure main text resides in semantic paragraph elements.' });
  }
  readabilityScore = Math.min(20, readabilityScore);

  // -----------------------------------------------------------------------
  // 4. EEAT & Citations
  // -----------------------------------------------------------------------
  let eeatScore = 0;
  const eeatAudits: AuditItem[] = [];

  const links = $('a[href]');
  const outboundDomains: string[] = [];
  links.each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        const urlObj = new URL(href);
        const host = urlObj.hostname;
        if (!host.includes(siteName) && !siteName.includes(host)) {
          outboundDomains.push(host);
        }
      } catch { /* ignore */ }
    }
  });
  const uniqueOutboundDomains = [...new Set(outboundDomains)];

  if (uniqueOutboundDomains.length >= 3) {
    eeatScore += 8;
    eeatAudits.push({ category: 'eeat', status: 'pass', name: 'Outbound Citations', message: `Found references citing ${uniqueOutboundDomains.length} unique external domains. Validates claims for AI crawlers.`, fix: null });
  } else if (uniqueOutboundDomains.length > 0) {
    eeatScore += 4;
    eeatAudits.push({ category: 'eeat', status: 'warn', name: 'Outbound Citations', message: `Found only ${uniqueOutboundDomains.length} outbound domain citation. Citations are crucial for Perplexity sourcing.`, fix: 'Back up factual claims by linking directly to primary sources, research reports, or high-authority websites.' });
  } else {
    eeatAudits.push({ category: 'eeat', status: 'fail', name: 'Outbound Citations', message: 'Zero outbound links found. Unreferenced copy is flagged as lower authority by LLM engines.', fix: 'Include outbound anchor text linking to academic papers, official standards, or primary reporting sites.' });
  }

  const trustLinksFound: string[] = [];
  links.each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = ($(el).attr('href') ?? '').toLowerCase();
    if (text.includes('about') || href.includes('about')) trustLinksFound.push('About Page');
    if (text.includes('contact') || href.includes('contact') || text.includes('support')) trustLinksFound.push('Contact Page');
    if (text.includes('privacy') || href.includes('privacy')) trustLinksFound.push('Privacy Policy');
    if (text.includes('terms') || href.includes('terms')) trustLinksFound.push('Terms of Service');
  });
  const uniqueTrustLinks = [...new Set(trustLinksFound)];

  if (uniqueTrustLinks.length >= 3) {
    eeatScore += 6;
    eeatAudits.push({ category: 'eeat', status: 'pass', name: 'Transparency & Legal Links', message: `Found trust/legal references: ${uniqueTrustLinks.join(', ')}. Establishes business/publisher legitimacy.`, fix: null });
  } else if (uniqueTrustLinks.length > 0) {
    eeatScore += 3;
    eeatAudits.push({ category: 'eeat', status: 'warn', name: 'Transparency & Legal Links', message: `Missing some basic trust links. Only detected: ${uniqueTrustLinks.join(', ')}.`, fix: 'Add links to essential transparency pages (About, Contact, Privacy, Terms) in your site footer.' });
  } else {
    eeatAudits.push({ category: 'eeat', status: 'fail', name: 'Transparency & Legal Links', message: 'No trust, contact, or legal links detected.', fix: 'Publish detailed "About Us" and "Contact" pages, linking to them sitewide.' });
  }

  const socialDomains = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'github.com', 'youtube.com'];
  const foundSocials: string[] = [];
  links.each((_, el) => {
    const href = ($(el).attr('href') ?? '').toLowerCase();
    socialDomains.forEach((domain) => {
      if (href.includes(domain)) foundSocials.push(domain.split('.')[0]);
    });
  });
  const uniqueSocials = [...new Set(foundSocials)];

  if (uniqueSocials.length > 0) {
    eeatScore += 6;
    eeatAudits.push({ category: 'eeat', status: 'pass', name: 'Author Social Footprint', message: `Connected to social profiles: ${uniqueSocials.join(', ')}. Validates author identities.`, fix: null });
  } else {
    eeatAudits.push({ category: 'eeat', status: 'warn', name: 'Author Social Footprint', message: 'No links to external social profiles or author platforms (LinkedIn, Twitter/X, GitHub) found.', fix: 'Link author names to their professional LinkedIn or Twitter profiles to establish authoritativeness.' });
  }
  eeatScore = Math.min(20, eeatScore);

  // -----------------------------------------------------------------------
  // 5. Technical & Metadata
  // -----------------------------------------------------------------------
  let metadataScore = 0;
  const metaAudits: AuditItem[] = [];

  const title = $('title').first().text().trim();
  if (title) {
    if (title.length >= 30 && title.length <= 65) {
      metadataScore += 5;
      metaAudits.push({ category: 'metadata', status: 'pass', name: 'HTML Page Title', message: `Page title exists and is optimally sized (${title.length} characters): "${title}".`, fix: null });
    } else {
      metadataScore += 3;
      metaAudits.push({ category: 'metadata', status: 'warn', name: 'HTML Page Title', message: `Title exists but size is non-optimal (${title.length} chars). Title: "${title}".`, fix: 'Optimize your <title> tag to be between 30 and 65 characters.' });
    }
  } else {
    metaAudits.push({ category: 'metadata', status: 'fail', name: 'HTML Page Title', message: 'No HTML <title> tag found on the page.', fix: 'Add a clear <title> in the HTML <head>.' });
  }

  const metaDesc =
    $('meta[name="description"]').attr('content') ??
    $('meta[property="og:description"]').attr('content');
  if (metaDesc) {
    const descLen = metaDesc.trim().length;
    if (descLen >= 100 && descLen <= 160) {
      metadataScore += 5;
      metaAudits.push({ category: 'metadata', status: 'pass', name: 'Meta Description', message: `Meta description exists and is optimally sized (${descLen} characters).`, fix: null });
    } else {
      metadataScore += 3;
      metaAudits.push({ category: 'metadata', status: 'warn', name: 'Meta Description', message: `Meta description exists but length is non-optimal (${descLen} chars).`, fix: 'Target meta description sizes between 100 and 160 characters for complete snippets.' });
    }
  } else {
    metaAudits.push({ category: 'metadata', status: 'fail', name: 'Meta Description', message: 'No meta description or Open Graph description tag found.', fix: 'Add a <meta name="description" content="..."> tag to summarize the page.' });
  }

  const ogTitle = $('meta[property="og:title"]').attr('content');
  const ogImage = $('meta[property="og:image"]').attr('content');
  if (ogTitle || ogImage) {
    metadataScore += 5;
    metaAudits.push({ category: 'metadata', status: 'pass', name: 'Open Graph Protocol', message: 'Open Graph properties exist (aids social context and LLM scraping wrappers).', fix: null });
  } else {
    metaAudits.push({ category: 'metadata', status: 'warn', name: 'Open Graph Protocol', message: 'No Open Graph tags found.', fix: 'Implement Facebook Open Graph tags (og:title, og:type, og:image) for rich metadata presentation.' });
  }

  const semanticTags = $('header, nav, main, footer, article, section, aside');
  const uniqueSemantics: string[] = [];
  semanticTags.each((_, el) => { uniqueSemantics.push(el.tagName); });
  const uniqueSemanticSet = [...new Set(uniqueSemantics)];

  if (uniqueSemanticSet.length >= 4) {
    metadataScore += 5;
    metaAudits.push({ category: 'metadata', status: 'pass', name: 'HTML5 Semantic Layout', message: `Strong layout formatting. Used ${uniqueSemanticSet.length} semantic structures (<${uniqueSemanticSet.join('>, <')}>).`, fix: null });
  } else if (uniqueSemanticSet.length > 0) {
    metadataScore += 3;
    metaAudits.push({ category: 'metadata', status: 'warn', name: 'HTML5 Semantic Layout', message: `Minimal HTML5 semantic layout wrapper tags (found only: <${uniqueSemanticSet.join('>, <')}>).`, fix: 'Wrap page components inside semantic structural elements like <header>, <main>, <article>, and <footer>.' });
  } else {
    metaAudits.push({ category: 'metadata', status: 'fail', name: 'HTML5 Semantic Layout', message: 'No HTML5 semantic structural tags found. Heavy reliance on <div> layers.', fix: 'Convert div structural elements into semantic landmarks (header, nav, main, footer).' });
  }
  metadataScore = Math.min(20, metadataScore);

  // -----------------------------------------------------------------------
  // 6. RetailAgentOS Reasoning
  // -----------------------------------------------------------------------
  const reasoningAudit = auditRetailAgentOS(ucpCheck.data ?? {}, html);
  const retailagentosScore = reasoningAudit.score;

  // -----------------------------------------------------------------------
  // Final Score & Grade
  // -----------------------------------------------------------------------
  const totalRaw = schemaScore + formatScore + readabilityScore + eeatScore + metadataScore + retailagentosScore;
  const finalScore = Math.round((totalRaw / 120) * 100);

  let grade = 'F';
  if (finalScore >= 95) grade = 'A+';
  else if (finalScore >= 90) grade = 'A';
  else if (finalScore >= 85) grade = 'A-';
  else if (finalScore >= 80) grade = 'B+';
  else if (finalScore >= 75) grade = 'B';
  else if (finalScore >= 70) grade = 'B-';
  else if (finalScore >= 65) grade = 'C+';
  else if (finalScore >= 60) grade = 'C';
  else if (finalScore >= 55) grade = 'C-';
  else if (finalScore >= 50) grade = 'D+';
  else if (finalScore >= 45) grade = 'D';
  else if (finalScore >= 40) grade = 'D-';

  // -----------------------------------------------------------------------
  // Engine compatibility matrix
  // -----------------------------------------------------------------------
  const perplexityScore = Math.max(30, Math.min(100, Math.round(eeatScore * 3.5 + metadataScore * 1.5)));
  const geminiScore = Math.max(30, Math.min(100, Math.round(schemaScore * 2.0 + formatScore * 1.5 + readabilityScore * 1.5)));
  const chatgptScore = Math.max(30, Math.min(100, Math.round(readabilityScore * 2.5 + eeatScore * 1.5 + schemaScore * 1.0)));
  const sgeScore = Math.max(30, Math.min(100, Math.round(metadataScore * 2.0 + schemaScore * 2.0 + formatScore * 1.0)));

  let ucpScore = 30;
  const ucpAudits: AuditItem[] = [];

  if (ucpCheck.exists) {
    ucpScore = 60;
    ucpAudits.push({ category: 'schema', status: 'pass', name: 'UCP Discovery Endpoint', message: 'Found active Google Universal Commerce Protocol discovery config at /.well-known/ucp.', fix: null });
  } else {
    ucpAudits.push({ category: 'schema', status: 'fail', name: 'UCP Discovery Endpoint', message: 'No UCP endpoint detected at /.well-known/ucp. Generative commerce agents cannot automatically transact checkout flows.', fix: 'Create a JSON file at /.well-known/ucp containing your API capabilities endpoints (cart, checkout, status).' });
  }

  if (hasUcpProductSchema && hasUcpOfferSchema) {
    ucpScore += 25;
    ucpAudits.push({ category: 'schema', status: 'pass', name: 'Product & Offer Schema', message: 'Product and Offer structured schemas exist on the page.', fix: null });
  } else {
    ucpAudits.push({ category: 'schema', status: 'fail', name: 'Product & Offer Schema', message: 'Missing standard Product or Offer schema required for agentic shopping indexing.', fix: 'Ensure your e-commerce platform outputs standard Schema.org Product and Offer markup.' });
  }

  if (hasPrice && hasAvailability) {
    ucpScore += 15;
    ucpAudits.push({ category: 'schema', status: 'pass', name: 'UCP Pricing & Stock Data', message: 'Found explicit product price, currency, and stock availability parameters inside schemas.', fix: null });
  } else {
    ucpAudits.push({ category: 'schema', status: 'fail', name: 'UCP Pricing & Stock Data', message: 'Missing key product specifications (price or availability) inside schemas.', fix: 'Add price, priceCurrency, and availability tags inside your structured product Offers data.' });
  }

  ucpScore = Math.max(30, Math.min(100, ucpScore));

  const getStatus = (s: number): 'Excellent' | 'Good' | 'Moderate' | 'Needs Work' =>
    s >= 85 ? 'Excellent' : s >= 70 ? 'Good' : s >= 55 ? 'Moderate' : 'Needs Work';

  // -----------------------------------------------------------------------
  // LLM Digest
  // -----------------------------------------------------------------------
  const keySentences: string[] = [];
  $('h1, h2, h3').slice(0, 4).each((_, el) => {
    keySentences.push(`Heading: ${$(el).text().trim()}`);
  });
  if (tables.length > 0) {
    keySentences.push(`Found Table: Specifications/Data structure parsed (${tables.first().find('tr').length} rows)`);
  }
  if (uniqueSchemas.length > 0) {
    keySentences.push(`Structured Schemas Detected: ${uniqueSchemas.slice(0, 3).join(', ')}`);
  }

  const bodyTextTrim = pageText.replace(/\s+/g, ' ').trim();
  const llmView = `### Scraped Content Digest (AI Scraper View)
* **Resolved Domain**: ${siteName}
* **Extracted Outline**:
${keySentences.map((s) => `  - ${s}`).join('\n')}
* **Text Sample**: "${bodyTextTrim.substring(0, 200)}..."
* **Extraction Confidence**: ${Math.round(finalScore * 0.9 + 10)}% - ${
    finalScore >= 80
      ? 'Highly parseable document.'
      : 'Ambiguous structure. Text wall density makes entity mapping unstable.'
  }`;

  return {
    url: targetUrl,
    siteName,
    score: finalScore,
    grade,
    categories: {
      schema: { score: schemaScore, max: 20, name: 'Schema & Structured Data' },
      format: { score: formatScore, max: 20, name: 'Format & Data Density' },
      readability: { score: readabilityScore, max: 20, name: 'Readability & Direct Answers' },
      eeat: { score: eeatScore, max: 20, name: 'EEAT & Authority' },
      metadata: { score: metadataScore, max: 20, name: 'Technical & Metadata' },
      retailagentos: { score: retailagentosScore, max: 20, name: 'RetailAgentOS Reasoning' },
    },
    audit: [...schemaAudits, ...formatAudits, ...readAudits, ...eeatAudits, ...metaAudits, ...ucpAudits, ...reasoningAudit.audits],
    engineCompatibility: {
      perplexity: { score: perplexityScore, status: getStatus(perplexityScore), details: perplexityScore >= 80 ? 'Excellent citation structure.' : 'Increase outbound reference links and primary source anchors to improve citation scoring.' },
      gemini: { score: geminiScore, status: getStatus(geminiScore), details: geminiScore >= 80 ? 'Excellent structure and schemas.' : 'Inject JSON-LD schemas and tabular comparison data grids.' },
      chatgpt: { score: chatgptScore, status: getStatus(chatgptScore), details: chatgptScore >= 80 ? 'Great readability index.' : 'Break down complex paragraphs and link writer profiles to author pages.' },
      sge: { score: sgeScore, status: getStatus(sgeScore), details: sgeScore >= 80 ? 'Complete meta indexing tags.' : 'Audit heading structures and add meta descriptions to optimize snippets.' },
      ucp: { score: ucpScore, status: getStatus(ucpScore), details: ucpScore >= 80 ? 'UCP checkout endpoints and product schemas are fully aligned.' : 'Expose the /.well-known/ucp endpoint and ensure complete Offer schemas (pricing, stock) are present.' },
    },
    llmView,
  };
}
