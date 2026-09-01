'use client';

import { CircleAlert } from 'lucide-react';
import { FARM_EGGS_PRICE, FARM_EGGS_TITLE, SOURDOUGH_PRICE, SOURDOUGH_TITLE } from '@/lib/showcase/productDisplay';

type Scenario = 'fresh' | 'custom';

interface ScenarioSelectorProps {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
}

export function ScenarioSelector({ scenario, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <ScenarioCard
        active={scenario === 'fresh'}
        title="Fresh Corner Market"
        description="Repair-and-approve mission · Build a valid dinner cart when inventory can't be trusted."
        onClick={() => onSelect('fresh')}
      />
      <ScenarioCard
        active={scenario === 'custom'}
        title="TheCustomHub"
        description="Controlled quote workflow · Send customization and delivery requirements for merchant review without inventing a price."
        onClick={() => onSelect('custom')}
      />
    </div>
  );
}

function ScenarioCard({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border p-3 text-left transition-colors ${active ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <b className="text-slate-900">{title}</b>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </button>
  );
}

export function ScenarioProducts({ scenario }: { scenario: Scenario }) {
  if (scenario === 'fresh') {
    return (
      <>
        <Product title={FARM_EGGS_TITLE} detail="inventory is stale" price={`$${FARM_EGGS_PRICE.toFixed(2)}`} warning />
        <Product title={SOURDOUGH_TITLE} detail="delivery-ready" price={`$${SOURDOUGH_PRICE.toFixed(2)}`} />
      </>
    );
  }
  return <Product title="Custom Robotics Team Shirt" detail="25 shirts · mixed adult sizes · personalized" price="Merchant quote required" warning />;
}

function Product({ title, detail, price, warning }: { title: string; detail: string; price: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <span>
        <b className="flex items-center gap-1 text-slate-900">
          {warning && <CircleAlert size={15} className="text-amber-700" aria-hidden="true" />}
          {title}
        </b>
        <small className="block text-slate-600">{detail}</small>
      </span>
      <b className="text-sm text-slate-900">{price}</b>
    </div>
  );
}
