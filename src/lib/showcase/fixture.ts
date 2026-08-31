import type { Variant } from '@retailagentos/engine';
import { mockMerchants } from '@/lib/mock/merchants';
import { mockProducts } from '@/lib/mock/catalog';
import { ShowcaseGateway } from './gateway';

// Fresh Corner is the hero showcase merchant.  TheCustomHub is deliberately a
// separate, controlled quote fixture below; this page never reaches a live
// merchant system.
const merchant = mockMerchants.find((candidate) => candidate.merchantId === 'm_grocery_003')!;
const catalog: Variant[] = mockProducts.filter((product) => product.merchantId === merchant.merchantId).flatMap((product) => product.variants);
catalog.push({ id: 'v_customhub_quote_001', sku: 'CUSTOM-ROBOTICS-TEE', title: 'Custom Robotics Team Shirt', basePrice: 0, currency: 'USD', callForPrice: true });
const demoCartStore = new Map();
export function createShowcaseGateway(now: number) { return new ShowcaseGateway({ merchant, variants: catalog, now }, demoCartStore); }
