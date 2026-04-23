import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Paket G (Sprint 8a.8) — Mimsoft üretim fixture regresyon suite.
 *
 * 6 yeni fixture (f12-f17) Mimsoft'tan gerçek faturalar; her biri farklı
 * profil/tip senaryosunu temsil eder. Bu testler fixture XML'lerinin
 * YAPISAL ve MONETARY invariant'larını doğrular. Builder regresyonu
 * burada değil — fixture'lar ÜRETİM snapshot'ı olarak korunur.
 *
 * Senaryolar (Agent 3 raporundan):
 * - f12: IHRACKAYITLI + 702 muafiyet + CustomsDeclaration GTİP/AlıcıDİB
 * - f13: YATIRIMTESVIK + SATIS + ItemClassificationCode=01 (Makina)
 * - f14: YATIRIMTESVIK + SATIS + ItemClassificationCode=02 (İnşaat)
 * - f15: SATIS + 351 KDV istisna (KDV=0)
 * - f16: SGK + AccountingCost + AdditionalDocumentReference (MUKELLEF_*)
 * - f17: KAMU + TR IBAN + BuyerCustomer kurum VKN
 */

const FIXTURE_DIR = join(__dirname, '..', 'fixtures', 'mimsoft-real-invoices');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf-8');
}

function extract(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<cbc:${tag}[^>]*>([^<]+)</cbc:${tag}>`);
  return re.exec(xml)?.[1];
}

function extractAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<cbc:${tag}[^>]*>([^<]+)</cbc:${tag}>`, 'g');
  return Array.from(xml.matchAll(re)).map(m => m[1]);
}

// ─── F12: IHRACKAYITLI + 702 ──────────────────────────────────────────────
describe('Mimsoft F12 — IHRACKAYITLI + 702 (ihracat kayıtlı DİİB)', () => {
  const xml = loadFixture('f12-ihrackayitli-702.xml');

  it('F12: ProfileID=TEMELFATURA, InvoiceTypeCode=IHRACKAYITLI', () => {
    expect(extract(xml, 'ProfileID')).toBe('TEMELFATURA');
    expect(extract(xml, 'InvoiceTypeCode')).toBe('IHRACKAYITLI');
  });

  it('F12: TaxExemptionReasonCode=702 + RequiredCustomsID (12-hane GTİP) + ALICIDIBSATIRKOD (11-hane)', () => {
    expect(extractAll(xml, 'TaxExemptionReasonCode')).toContain('702');
    expect(extract(xml, 'RequiredCustomsID')).toMatch(/^\d{12}$/);
    expect(xml).toMatch(/schemeID="ALICIDIBSATIRKOD"[^>]*>\d{11}</);
  });

  it('F12: TaxAmount=0 (muafiyet) + TaxInclusive=PayableAmount=100', () => {
    expect(extract(xml, 'PayableAmount')).toBe('100');
    expect(extract(xml, 'TaxInclusiveAmount')).toBe('100');
  });
});

// ─── F13: YATIRIMTESVIK + Makina ItemClassificationCode=01 ───────────────
describe('Mimsoft F13 — YATIRIMTESVIK + SATIS + Makina (Harcama Tipi 01)', () => {
  const xml = loadFixture('f13-yatirimtesvik-satis-makina.xml');

  it('F13: ProfileID=YATIRIMTESVIK, TypeCode=SATIS, YTBNO=123123', () => {
    expect(extract(xml, 'ProfileID')).toBe('YATIRIMTESVIK');
    expect(extract(xml, 'InvoiceTypeCode')).toBe('SATIS');
    expect(xml).toMatch(/schemeID="YTBNO"[^>]*>123123</);
  });

  it('F13: ItemClassificationCode=01 (Makina/Teçhizat)', () => {
    const codes = extractAll(xml, 'ItemClassificationCode');
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every(c => c === '01')).toBe(true);
  });

  it('F13: PayableAmount=560 (çoklu KDV oranı: 500 + 20 + 40)', () => {
    expect(extract(xml, 'PayableAmount')).toBe('560');
    expect(extract(xml, 'TaxInclusiveAmount')).toBe('560');
  });
});

// ─── F14: YATIRIMTESVIK + İnşaat ItemClassificationCode=02 ───────────────
describe('Mimsoft F14 — YATIRIMTESVIK + SATIS + İnşaat (Harcama Tipi 02)', () => {
  const xml = loadFixture('f14-yatirimtesvik-satis-insaat.xml');

  it('F14: ProfileID=YATIRIMTESVIK + ItemClassificationCode=02', () => {
    expect(extract(xml, 'ProfileID')).toBe('YATIRIMTESVIK');
    const codes = extractAll(xml, 'ItemClassificationCode');
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every(c => c === '02')).toBe(true);
  });

  it('F14: PayableAmount=560 (inşaat senaryosu, makina ile aynı tutar)', () => {
    expect(extract(xml, 'PayableAmount')).toBe('560');
  });
});

// ─── F15: SATIS + 351 KDV istisna ─────────────────────────────────────────
describe('Mimsoft F15 — SATIS + 351 (KDV İstisna Olmayan Diğer)', () => {
  const xml = loadFixture('f15-satis-351.xml');

  it('F15: ProfileID=TEMELFATURA, TypeCode=SATIS', () => {
    expect(extract(xml, 'ProfileID')).toBe('TEMELFATURA');
    expect(extract(xml, 'InvoiceTypeCode')).toBe('SATIS');
  });

  it('F15: TaxExemptionReasonCode=351 + TaxInclusive=PayableAmount=100 (KDV=0)', () => {
    expect(extractAll(xml, 'TaxExemptionReasonCode')).toContain('351');
    expect(extract(xml, 'PayableAmount')).toBe('100');
    expect(extract(xml, 'TaxInclusiveAmount')).toBe('100');
  });
});

// ─── F16: SGK + AccountingCost + AdditionalDocumentReference ─────────────
describe('Mimsoft F16 — SGK (Sosyal Güvenlik Kurumu)', () => {
  const xml = loadFixture('f16-sgk.xml');

  it('F16: TypeCode=SGK + AccountingCost=SAGLIK_ECZ', () => {
    expect(extract(xml, 'InvoiceTypeCode')).toBe('SGK');
    expect(extract(xml, 'AccountingCost')).toBe('SAGLIK_ECZ');
  });

  it('F16: 3 AdditionalDocumentReference (MUKELLEF_KODU + MUKELLEF_ADI + DOSYA_NO)', () => {
    const docTypes = extractAll(xml, 'DocumentTypeCode');
    expect(docTypes).toContain('MUKELLEF_KODU');
    expect(docTypes).toContain('MUKELLEF_ADI');
    expect(docTypes).toContain('DOSYA_NO');
  });

  it('F16: PayableAmount=120 (100 + 20 KDV)', () => {
    expect(extract(xml, 'PayableAmount')).toBe('120');
  });
});

// ─── F17: KAMU + TR IBAN + BuyerCustomer kurum ─────────────────────────
describe('Mimsoft F17 — KAMU (Kamu Alıcı Kurum)', () => {
  const xml = loadFixture('f17-kamu.xml');

  it('F17: ProfileID=KAMU + TypeCode=SATIS', () => {
    expect(extract(xml, 'ProfileID')).toBe('KAMU');
    expect(extract(xml, 'InvoiceTypeCode')).toBe('SATIS');
  });

  it('F17: PaymentMeans TR IBAN + BuyerCustomer kurum VKN', () => {
    // TR IBAN: TR ile başlar + 24 karakter
    expect(xml).toMatch(/TR\d{7}[A-Z0-9]{17}/);
    // BuyerCustomer VKN (KARAYOLLARI GENEL MÜDÜRLÜĞÜ = 5230531548)
    const vkns = extractAll(xml, 'ID').filter(v => /^\d{10}$/.test(v));
    expect(vkns).toContain('5230531548');
  });

  it('F17: PayableAmount=17220.00 (14350 + 2870 KDV)', () => {
    expect(extract(xml, 'PayableAmount')).toBe('17220.00');
    expect(extract(xml, 'TaxInclusiveAmount')).toBe('17220.00');
  });
});
