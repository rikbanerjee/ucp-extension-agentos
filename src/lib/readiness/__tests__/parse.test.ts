import { describe, it, expect } from 'vitest';
import { parseGenericCsv, parseShopifyCsv } from '../parseCsv';
import { parseGenericJson } from '../parseJson';
import { MAX_VARIANTS } from '../normalize';

describe('parseGenericCsv', () => {
  it('auto-maps common column names', () => {
    const csv = 'Product Title,Price,SKU,Category\nCandle,24.00,SKU-1,Home\nMug,12.50,SKU-2,Kitchen\n';
    const result = parseGenericCsv(csv);
    expect(result.blocking).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].title).toBe('Candle');
    expect(result.rows[0].price).toBe(24);
    expect(result.rows[0].category).toBe('Home');
  });

  it('handles quoted cells with embedded commas and newlines', () => {
    const csv = 'title,price,description\n"Gift, Boxed",19.99,"Line one\nLine two"\n';
    const result = parseGenericCsv(csv);
    expect(result.blocking).toHaveLength(0);
    expect(result.rows[0].title).toBe('Gift, Boxed');
    expect(result.rows[0].description).toContain('Line one');
  });

  it('flags missing required fields as blocking', () => {
    const csv = 'title,price\n,19.99\nCandle,\n';
    const result = parseGenericCsv(csv);
    expect(result.blocking.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it('flags negative and malformed prices', () => {
    const csv = 'title,price\nA,-5\nB,abc\n';
    const result = parseGenericCsv(csv);
    expect(result.blocking.length).toBe(2);
  });

  it('flags duplicate SKUs and variant IDs', () => {
    const csv = 'title,price,sku,variant_id\nA,10,SKU-1,V1\nB,20,SKU-1,V1\n';
    const result = parseGenericCsv(csv);
    expect(result.blocking.some((f) => f.title.includes('Duplicate'))).toBe(true);
  });

  it('generates deterministic IDs when missing, and reports it', () => {
    const csv = 'title,price\nUnique Widget,10\n';
    const r1 = parseGenericCsv(csv);
    const r2 = parseGenericCsv(csv);
    expect(r1.rows[0].productId).toBe(r2.rows[0].productId);
    expect(r1.rows[0].generatedIds).toBe(true);
    expect(r1.warnings.some((w) => w.id.includes('generated-ids'))).toBe(true);
  });

  it('treats an empty file as blocking', () => {
    const result = parseGenericCsv('');
    expect(result.blocking).toHaveLength(1);
  });

  it('enforces the row/variant limit conceptually via MAX_VARIANTS constant', () => {
    expect(MAX_VARIANTS).toBe(10_000);
  });
});

describe('parseShopifyCsv', () => {
  it('groups multiple variant rows under one product', () => {
    const csv =
      'Handle,Title,Body (HTML),Type,Tags,Image Src,Option1 Value,Option2 Value,Variant SKU,Variant Price,Variant Inventory Qty\n' +
      'tee,Classic Tee,A soft tee,Apparel,cotton,,Black,M,TEE-BLK-M,25.00,10\n' +
      'tee,,,,,,White,L,TEE-WHT-L,25.00,5\n';
    const result = parseShopifyCsv(csv, 'USD');
    expect(result.blocking).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].productId).toBe('tee');
    expect(result.rows[1].productId).toBe('tee');
    expect(result.rows[0].currency).toBe('USD');
  });

  it('uses the selected store currency when the export has no currency column', () => {
    const csv = 'Handle,Title,Variant SKU,Variant Price\np,Product,SKU-1,10.00\n';
    const result = parseShopifyCsv(csv, 'CAD');
    expect(result.rows[0].currency).toBe('CAD');
  });

  it('rejects a file with no Handle column', () => {
    const csv = 'title,price\nA,10\n';
    const result = parseShopifyCsv(csv, 'USD');
    expect(result.blocking).toHaveLength(1);
  });
});

describe('parseGenericJson', () => {
  it('accepts a bare array', () => {
    const json = JSON.stringify([{ title: 'A', price: 10 }, { title: 'B', price: 20 }]);
    const result = parseGenericJson(json);
    expect(result.rows).toHaveLength(2);
  });

  it('accepts a { products: [...] } object', () => {
    const json = JSON.stringify({ products: [{ title: 'A', price: 10 }] });
    const result = parseGenericJson(json);
    expect(result.rows).toHaveLength(1);
  });

  it('flags malformed JSON', () => {
    const result = parseGenericJson('{not json');
    expect(result.blocking).toHaveLength(1);
  });

  it('flags an empty array', () => {
    const result = parseGenericJson('[]');
    expect(result.blocking).toHaveLength(1);
  });
});
