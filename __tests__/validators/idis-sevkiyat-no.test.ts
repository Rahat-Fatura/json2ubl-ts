import { describe, it, expect } from 'vitest';
import { SEVKIYAT_NO_REGEX } from '../../src/config/constants';
import { validateByProfile } from '../../src/validators/profile-validators';
import { validateDespatch } from '../../src/validators/despatch-validators';
import { InvoiceProfileId, InvoiceTypeCode, DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';
import type { DespatchInput } from '../../src/types/despatch-input';

/**
 * Sprint 9 — İDİS sevkiyat numarası SE-/ES- (Schematron 20260701).
 *
 * History.txt md.7 (IdisSevkiyatNoCheck) ve md.9 (DespatchIdisSevkiyatNoCheck):
 * "Sevkiyat Numarası değeri SE-0000000 veya ES-0000000 formatında girilmelidir."
 *
 * Gevşetme — geriye dönük uyumlu, mevcut SE- değerleri etkilenmiyor.
 */

// ============================================================
// Regex
// ============================================================

describe('Sprint 9 — SEVKIYAT_NO_REGEX SE-/ES- kabul ediyor', () => {
  const valid = ['SE-0000000', 'ES-0000000', 'SE-1234567', 'ES-9999999'];
  const invalid = [
    'SE-000000',   // 6 hane
    'SE-00000000', // 8 hane
    'XX-0000000',  // yanlış prefix
    'se-0000000',  // küçük harf
    'ES0000000',   // tire yok
    'SE-ABCDEFG',  // rakam değil
    '',
  ];

  for (const v of valid) {
    it(`${v} geçerli`, () => expect(SEVKIYAT_NO_REGEX.test(v)).toBe(true));
  }
  for (const v of invalid) {
    it(`${JSON.stringify(v)} geçersiz`, () => expect(SEVKIYAT_NO_REGEX.test(v)).toBe(false));
  }
});

// ============================================================
// IDIS faturası — IdisSevkiyatNoCheck
// ============================================================

function makeIdisInvoice(sevkiyatNo: string): InvoiceInput {
  return {
    id: 'ABC202600000001',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: InvoiceProfileId.IDIS,
    invoiceTypeCode: InvoiceTypeCode.SATIS,
    issueDate: '2026-01-01',
    currencyCode: 'TRY',
    supplier: { additionalIdentifiers: [{ schemeId: 'SEVKIYATNO', value: sevkiyatNo }] } as any,
    customer: {} as any,
    taxTotals: [],
    lines: [{
      id: '1',
      item: {
        name: 'X',
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'AB1234567' }],
      },
    }] as any,
  } as any;
}

describe('Sprint 9 — IDIS faturasında ES- prefix kabul ediliyor', () => {
  const sevkiyatErrors = (no: string) =>
    validateByProfile(makeIdisInvoice(no))
      .filter(e => e.path === 'supplier.additionalIdentifiers.SEVKIYATNO');

  it('SE-0000080 kabul (geriye dönük uyum)', () => {
    expect(sevkiyatErrors('SE-0000080')).toEqual([]);
  });

  it('ES-0000080 kabul (Sprint 9 yeni)', () => {
    expect(sevkiyatErrors('ES-0000080')).toEqual([]);
  });

  it('XX-0000080 reddedilir', () => {
    expect(sevkiyatErrors('XX-0000080')).toHaveLength(1);
  });
});

// ============================================================
// IDISIRSALIYE — DespatchIdisSevkiyatNoCheck
// ============================================================

function makeIdisDespatch(sevkiyatNo: string): DespatchInput {
  return {
    id: 'ABC2026000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: DespatchProfileId.IDISIRSALIYE,
    despatchTypeCode: DespatchTypeCode.SEVK,
    issueDate: '2026-01-15',
    issueTime: '10:30:00',
    supplier: {
      vknTckn: '1234567890', taxIdType: 'VKN', name: 'Sender',
      cityName: 'İstanbul', citySubdivisionName: 'Kadıköy', country: 'Türkiye',
      additionalIdentifiers: [{ schemeId: 'SEVKIYATNO', value: sevkiyatNo }],
    },
    customer: {
      vknTckn: '0987654321', taxIdType: 'VKN', name: 'Receiver',
      cityName: 'Ankara', citySubdivisionName: 'Çankaya', country: 'Türkiye',
    },
    shipment: {
      actualDespatchDate: '2026-01-15',
      actualDespatchTime: '14:00:00',
      deliveryAddress: {
        citySubdivisionName: 'Çankaya', cityName: 'Ankara',
        postalZone: '06100', country: 'Türkiye',
      },
      driverPersons: [{ firstName: 'M', familyName: 'K', nationalityId: '12345678901' }],
      licensePlates: [{ plateNumber: '34IDS001', schemeId: 'PLAKA' }],
    },
    lines: [{
      id: '1', deliveredQuantity: 10, unitCode: 'C62',
      item: {
        name: 'X',
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'AB1234567' }],
      },
    }],
  } as any;
}

describe('Sprint 9 — IDISIRSALIYE\'de ES- prefix kabul ediliyor', () => {
  const sevkiyatErrors = (no: string) =>
    validateDespatch(makeIdisDespatch(no))
      .filter(e => e.path === 'supplier.additionalIdentifiers.SEVKIYATNO');

  it('SE-0000971 kabul (geriye dönük uyum)', () => {
    expect(sevkiyatErrors('SE-0000971')).toEqual([]);
  });

  it('ES-0000971 kabul (Sprint 9 yeni)', () => {
    expect(sevkiyatErrors('ES-0000971')).toEqual([]);
  });

  it('SE-971 reddedilir (hane sayısı)', () => {
    expect(sevkiyatErrors('SE-971')).toHaveLength(1);
  });
});
