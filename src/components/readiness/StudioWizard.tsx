'use client';

import { useMemo, useState, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { StudioSession } from '@/lib/readiness';
import { DEFAULT_RULE_DEFAULTS, validateStoreProfile, validateRuleDefaults } from '@/lib/readiness';
import type { ReadinessAudience, ImportResult } from '@/lib/readiness';
import { SAMPLE_CATALOG_ROWS, SAMPLE_STORE_DOMAIN, SAMPLE_STORE_NAME } from '@/lib/readiness/sampleCatalog';
import Step1AddCatalog from './steps/Step1AddCatalog';
import Step2ReviewCatalog from './steps/Step2ReviewCatalog';
import Step3StoreDetails from './steps/Step3StoreDetails';
import Step4StoreRules from './steps/Step4StoreRules';
import Step5ProductExceptions from './steps/Step5ProductExceptions';
import Step6PreviewDecision from './steps/Step6PreviewDecision';
import Step7Results from './steps/Step7Results';

export interface StepProps {
  session: StudioSession;
  updateSession: (patch: Partial<StudioSession>) => void;
  goToStep: (index: number) => void;
  audience?: ReadinessAudience;
}

const STEP_LABELS = [
  'Add catalog',
  'Review catalog',
  'Store details',
  'Store rules',
  'Exceptions',
  'Preview',
  'Results',
];

function initialSession(): StudioSession {
  return {
    importResult: null,
    storeProfile: null,
    ruleDefaults: DEFAULT_RULE_DEFAULTS,
    overrides: [],
    scenario: null,
  };
}

export function createSampleSession(): StudioSession {
  const importResult: ImportResult = {
    source: 'sample', rows: SAMPLE_CATALOG_ROWS, blocking: [], warnings: [], unparsedRowCount: 0,
  };
  return {
    importResult,
    storeProfile: {
      storeName: SAMPLE_STORE_NAME, storeDomain: SAMPLE_STORE_DOMAIN, currency: 'USD', timezone: 'America/New_York',
      regions: ['US'], fulfillmentModes: ['shipping', 'pickup', 'local_delivery'],
    },
    ruleDefaults: DEFAULT_RULE_DEFAULTS,
    overrides: [],
    scenario: {
      productVariantKey: `${SAMPLE_CATALOG_ROWS[0].productId}::${SAMPLE_CATALOG_ROWS[0].variantId}`,
      customerType: 'guest', marketRegion: 'US', quantity: 1, fulfillmentMode: 'shipping',
      orderDate: '2026-08-19', orderTime: '12:00',
    },
  };
}

function canContinue(step: number, session: StudioSession): boolean {
  switch (step) {
    case 0:
      return session.importResult !== null && session.importResult.rows.length > 0;
    case 1:
      return session.importResult !== null && session.importResult.blocking.length === 0;
    case 2:
      return validateStoreProfile(session.storeProfile).length === 0;
    case 3:
      return validateRuleDefaults(session.ruleDefaults).length === 0;
    default:
      return true;
  }
}

export default function StudioWizard({ audience = 'direct', loadSample = false }: { audience?: ReadinessAudience; loadSample?: boolean }) {
  const [step, setStep] = useState(loadSample ? 6 : 0);
  const [session, setSession] = useState<StudioSession>(() => loadSample ? createSampleSession() : initialSession());
  const [confirmReset, setConfirmReset] = useState(false);

  const updateSession = useCallback((patch: Partial<StudioSession>) => {
    setSession((prev) => ({ ...prev, ...patch }));
  }, []);

  const goToStep = useCallback((index: number) => {
    setStep(Math.max(0, Math.min(STEP_LABELS.length - 1, index)));
  }, []);

  const stepReady = useMemo(() => canContinue(step, session), [step, session]);

  const StepComponent = [
    Step1AddCatalog,
    Step2ReviewCatalog,
    Step3StoreDetails,
    Step4StoreRules,
    Step5ProductExceptions,
    Step6PreviewDecision,
    Step7Results,
  ][step];

  function handleStartOver() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setSession(initialSession());
    setStep(0);
    setConfirmReset(false);
  }

  return (
    <div id="wizard" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 scroll-mt-20">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 mb-8" aria-label="Readiness Studio steps">
        {STEP_LABELS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'upcoming';
          return (
            <li key={label} className="flex items-center">
              <button
                type="button"
                onClick={() => (i <= step || canContinue(step, session)) && i <= step + 1 && goToStep(i)}
                disabled={i > step}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold min-h-[32px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                  state === 'current'
                    ? 'bg-slate-900 text-white'
                    : state === 'done'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-400 cursor-default'
                }`}
              >
                {state === 'done' ? <CheckCircle2 size={14} aria-hidden="true" /> : <span aria-hidden="true">{i + 1}</span>}
                {label}
              </button>
              {i < STEP_LABELS.length - 1 && <span className="mx-1 h-px w-4 bg-slate-200" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div aria-live="polite" className="sr-only">
        Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
      </div>

      <StepComponent session={session} updateSession={updateSession} goToStep={goToStep} audience={audience} />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              className="min-h-[44px] rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartOver}
            className="min-h-[44px] rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            {confirmReset ? 'Click again to confirm — this clears everything' : 'Start over'}
          </button>
          {step < STEP_LABELS.length - 1 && (
            <button
              type="button"
              onClick={() => goToStep(step + 1)}
              disabled={!stepReady}
              className="min-h-[44px] rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
