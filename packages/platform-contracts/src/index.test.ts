import { describe, expect, it } from 'vitest';
import { supports, validateTenant } from './index';
describe('platform contracts', () => { it('validates a tenant boundary', () => { expect(validateTenant({ id: 't1', name: 'Demo', mode: 'owned', status: 'active' })).toBe(true); expect(validateTenant({ id: 't1', mode: 'unsafe' })).toBe(false); }); it('reads connector capabilities without I/O', () => { expect(supports({ capabilities: { oauth: true, catalogSync: true, inventorySync: false, orderSync: false, webhooks: false, checkoutHandoff: true } }, 'checkoutHandoff')).toBe(true); }); });
