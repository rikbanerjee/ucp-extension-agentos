import type { Variant } from '@retailagentos/engine';
import { mockMerchants } from '@/lib/mock/merchants';
import { mockProducts } from '@/lib/mock/catalog';
import { ShowcaseGateway } from './gateway';

const merchant = mockMerchants[0];
const catalog: Variant[] = mockProducts.filter((product) => product.merchantId === merchant.merchantId).flatMap((product) => product.variants);
catalog.push({ id: 'v_customhub_quote_001', sku: 'CUSTOM-ROBOTICS-TEE', title: 'Custom Robotics Team Shirt', basePrice: 0, currency: 'USD', callForPrice: true });
const demoCartStore = new Map();
export function createShowcaseGateway(now: number) { return new ShowcaseGateway({ merchant, variants: catalog, now }, demoCartStore); }
