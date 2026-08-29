'use client';

/**
 * /guided/platform — "Late-night pizza. Three stores. One checkout the
 * platform can trust." NYC quick-commerce guided demo.
 *
 * Replaces the prior Hawaii/shipping-region PlatformTrack. Reuses the
 * shared guided-demo shell architecture (GuidedDemoShell/GuidedProgress/
 * NextBestAction/DemoRequest) rather than duplicating shell logic. See
 * src/lib/demo/platformQuickCommerceScenario.ts for the scenario data and
 * exactly what is real-engine-evaluated vs. demo data.
 */

import { Clock3, MapPin } from 'lucide-react';
import { GuidedDemoShell, type GuidedNav } from '@/components/guided/GuidedDemoShell';
import { NextBestAction } from '@/components/guided/NextBestAction';
import { CandidateMerchantCard } from './CandidateMerchantCard';
import { MerchantComparison } from './MerchantComparison';
import { PlatformSignalPanel } from './PlatformSignalPanel';
import { CustomerResult } from './CustomerResult';
import { CheckoutSummary } from './CheckoutSummary';
import {
  SHOPPER_REQUEST_TEXT,
  PLATFORM_INTERPRETED_INTENT,
  SCENARIO_TIME_LABEL,
  DISCOVERY_LISTINGS,
  QUICK_COMMERCE_CANDIDATES,
  MIDNIGHT_CRUST_CANDIDATE,
  BIGBOX_CANDIDATE,
  CORNER_SLICE_CANDIDATE,
  formatUsd,
} from '@/lib/demo/platformQuickCommerceScenario';

const QUICK_COMMERCE_MAILTO =
  'mailto:rikbanerjee007@gmail.com?subject=' +
  encodeURIComponent('RetailAgentOS — quick-commerce platform pilot') +
  '&body=' +
  encodeURIComponent(
    [
      'Platform:',
      'Primary market:',
      'Merchant types:',
      'Time-sensitive customer promise:',
      'Current source of operating-hour data:',
      'Current source of preparation-time data:',
      'Current source of delivery ETA:',
      'Most common late checkout failure:',
    ].join('\n'),
  );

function Eyebrow({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'emerald' | 'amber' }) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : tone === 'amber'
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-slate-100 border-slate-200 text-slate-600';
  return (
    <div className={`inline-block rounded-full border text-xs font-semibold uppercase tracking-widest px-3 py-1 ${cls}`}>
      {children}
    </div>
  );
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm min-h-[44px]"
      >
        {children}
      </button>
    </div>
  );
}

function ReferenceDisclosure() {
  return (
    <p className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
      Reference scenario using mock merchant and platform data
    </p>
  );
}

export function PlatformGuidedDemo() {
  const scenes = [
    // Scene 1 — the customer need
    {
      stepLabel: 'Request',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
          <Eyebrow>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="w-3.5 h-3.5" aria-hidden="true" />
              {SCENARIO_TIME_LABEL}
            </span>
          </Eyebrow>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            The customer wants pizza before midnight.
          </h1>
          <blockquote className="text-lg text-slate-700 leading-relaxed max-w-xl mx-auto italic">
            &ldquo;{SHOPPER_REQUEST_TEXT}&rdquo;
          </blockquote>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
            In quick commerce, &ldquo;available&rdquo; is not enough. The store must remain open, accept the order,
            prepare it, and hand it to the delivery network in time.
          </p>
          <PrimaryButton onClick={nav.onNext}>Find available options →</PrimaryButton>
        </div>
      ),
    },

    // Scene 2 — candidate discovery
    {
      stepLabel: 'Candidates',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <Eyebrow>Candidate discovery</Eyebrow>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">Three stores match the search.</h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              This is what conventional listing data shows — distance, rating, a menu match, a displayed price.
              Which one can actually fulfil the promise?
            </p>
          </div>
          <div className="space-y-3">
            {DISCOVERY_LISTINGS.map(listing => (
              <CandidateMerchantCard key={listing.merchantId} listing={listing} />
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center px-2">
            Rating and distance alone don&rsquo;t prove feasibility.
          </p>
          <PrimaryButton onClick={nav.onNext}>Check what each store can support →</PrimaryButton>
        </div>
      ),
    },

    // Scene 3 — merchant truth
    {
      stepLabel: 'Merchant truth',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <Eyebrow>Merchant truth</Eyebrow>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">
              Three data sources, normalized into one comparison.
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              An RAOS-enabled merchant, an existing platform-native feed, and an unverified listing — evaluated the
              same way.
            </p>
          </div>
          <ReferenceDisclosure />
          <MerchantComparison candidates={QUICK_COMMERCE_CANDIDATES} />
          <PrimaryButton onClick={nav.onNext}>Add the platform delivery signals →</PrimaryButton>
        </div>
      ),
    },

    // Scene 4 — platform decision
    {
      stepLabel: 'Platform decision',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <Eyebrow>Platform decision</Eyebrow>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">
              RetailAgentOS explains what the merchant can support. The platform decides what to show.
            </h2>
          </div>
          <ReferenceDisclosure />
          <PlatformSignalPanel candidates={QUICK_COMMERCE_CANDIDATES} intent={PLATFORM_INTERPRETED_INTENT} />
          <p className="text-xs text-slate-400 text-center px-2 max-w-lg mx-auto">
            RetailAgentOS does not rank these stores. Ranking, courier dispatch, route calculation, delivery ETA,
            fees, presentation and checkout all remain platform-owned.
          </p>
          <PrimaryButton onClick={nav.onNext}>Show the customer result →</PrimaryButton>
        </div>
      ),
    },

    // Scene 5 — customer result
    {
      stepLabel: 'Result',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <Eyebrow tone="emerald">Customer result</Eyebrow>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">One local pizzeria, one chain — both trustworthy.</h2>
          </div>
          <CustomerResult recommended={MIDNIGHT_CRUST_CANDIDATE} alternative={BIGBOX_CANDIDATE} unverified={CORNER_SLICE_CANDIDATE} />
          <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
            A local merchant can compete alongside a large chain when the platform can understand and verify what it
            supports.
          </p>
          <PrimaryButton onClick={nav.onNext}>Build the checkout →</PrimaryButton>
        </div>
      ),
    },

    // Scene 6 — checkout
    {
      stepLabel: 'Checkout',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <Eyebrow>Checkout</Eyebrow>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">A cart the platform can trust.</h2>
          </div>
          <CheckoutSummary />
          <p className="text-xs text-slate-400 text-center px-2 max-w-lg mx-auto">
            RetailAgentOS does not calculate tax, tip, delivery fee, courier assignment, route, payment or final
            order submission — those remain platform-owned.
          </p>
          <PrimaryButton onClick={nav.onNext}>See what this means for a platform →</PrimaryButton>
        </div>
      ),
    },

    // Scene 7 — platform value
    {
      stepLabel: 'Value',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <Eyebrow>Platform value</Eyebrow>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">
              A better customer result — and a fairer chance for local merchants.
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              RetailAgentOS gives local merchants a standard way to express the facts a platform needs. The platform
              evaluates those facts alongside its existing chain integrations and shows only options it can
              confidently fulfil.
            </p>
          </div>
          <ul className="max-w-md mx-auto space-y-2.5 text-sm text-slate-700">
            {[
              'Fewer late checkout failures',
              'More trustworthy delivery promises',
              'Clear explanations for excluded options',
              'Less merchant-specific exception logic',
              'Local merchants can participate without bespoke platform integrations',
            ].map(point => (
              <li key={point} className="flex items-start gap-2.5">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
          <PrimaryButton onClick={nav.onNext}>See the next step →</PrimaryButton>
        </div>
      ),
    },

    // Scene 8 — next best action
    {
      stepLabel: 'Next step',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <NextBestAction
            heading="Test one merchant rule that creates failed carts today."
            body="Bring one pricing, eligibility, inventory or fulfilment rule. We’ll show the merchant inputs, the decision returned to the platform and the explanation an agent receives."
            primaryLabel="Discuss a merchant-rule pilot"
            primaryHref={QUICK_COMMERCE_MAILTO}
            secondaryLabel="Run the late-night pizza scenario"
            secondaryHref="/guided/platform"
            tertiaryLabel="Try another demo"
            tertiaryHref="/see-it-work"
            onReplay={nav.onRestart}
          />
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
            Reference scenario — budget {formatUsd(PLATFORM_INTERPRETED_INTENT.maxItemPriceCents)}, {PLATFORM_INTERPRETED_INTENT.customerArea}
          </div>
        </div>
      ),
    },
  ];

  return <GuidedDemoShell trackLabel="Commerce & Fulfilment Platforms" duration="2 minutes" scenes={scenes} />;
}
