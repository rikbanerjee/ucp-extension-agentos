import { CHECKOUT_SUMMARY, formatUsd } from '@/lib/demo/platformQuickCommerceScenario';

const ROWS: { label: string; value: string }[] = [
  { label: 'Merchant', value: CHECKOUT_SUMMARY.merchantName },
  { label: 'Item', value: CHECKOUT_SUMMARY.itemName },
  { label: 'Item price', value: formatUsd(CHECKOUT_SUMMARY.itemPriceCents) },
  { label: 'Delivery', value: CHECKOUT_SUMMARY.fulfillmentModeLabel },
  { label: 'Estimated arrival', value: CHECKOUT_SUMMARY.estimatedArrivalLabel },
  { label: 'Store accepting until', value: CHECKOUT_SUMMARY.acceptingUntilLabel },
  { label: 'Price valid until', value: CHECKOUT_SUMMARY.priceValidUntilLabel },
  { label: 'Merchant data', value: CHECKOUT_SUMMARY.merchantDataLabel },
  { label: 'Platform delivery data', value: CHECKOUT_SUMMARY.platformDataLabel },
];

/**
 * Scene 6 — a concise checkout summary. Deliberately does NOT show tax,
 * tip, delivery fee, courier assignment, route, payment or final order
 * submission — those are platform-owned and out of RAOS's scope (see
 * "Responsibility boundary" in specs/0003-fulfillment.md).
 */
export function CheckoutSummary() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <dl className="divide-y divide-slate-100">
          {ROWS.map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3 py-2.5">
              <dt className="text-sm text-slate-500">{row.label}</dt>
              <dd className="text-sm font-semibold text-slate-900 text-right">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-center text-sm font-semibold text-slate-700 tracking-wide">
        Right product. Right price. A cart that works.
      </p>
    </div>
  );
}
