import { describe, it, expect } from 'vitest';
import { validateByType } from '../../src/validators/type-validators';
import { validateByProfile } from '../../src/validators/profile-validators';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

function createSatisInput(overrides?: Partial<InvoiceInput>): InvoiceInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: InvoiceTypeCode.SATIS,
    issueDate: '2024-01-15',
    currencyCode: 'TRY',
    supplier: { vknTckn: '1234567890', taxIdType: 'VKN', name: 'Test',
      cityName: 'İstanbul', citySubdivisionName: 'Kadıköy', country: 'Türkiye' },
    customer: { vknTckn: '12345678901', taxIdType: 'TCKN', firstName: 'A', familyName: 'B',
      cityName: 'Ankara', citySubdivisionName: 'Çankaya', country: 'Türkiye' },
    taxTotals: [{ taxAmount: 18, taxSubtotals: [{
      taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015',
    }] }],
    legalMonetaryTotal: { lineExtensionAmount: 100, taxExclusiveAmount: 100,
      taxInclusiveAmount: 118, payableAmount: 118 },
    lines: [{ id: '1', invoicedQuantity: 1, unitCode: 'C62', lineExtensionAmount: 100,
      taxTotal: { taxAmount: 18, taxSubtotals: [{
        taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015',
      }] },
      item: { name: 'X' }, price: { priceAmount: 100 } }],
    ...overrides,
  };
}

describe('type-validators — B-30 WithholdingTaxTotal ters yön', () => {
  it('B-30: SATIS tipinde WithholdingTaxTotal verilirse reddedilir', () => {
    const input = createSatisInput({
      withholdingTaxTotals: [{
        taxAmount: 10,
        taxSubtotals: [{
          taxableAmount: 100, taxAmount: 10, percent: 10, taxTypeCode: '601',
        }],
      }],
    });
    const errors = validateByType(input);
    expect(errors.some(e => e.code === 'INVALID_VALUE' && e.path === 'withholdingTaxTotals')).toBe(true);
  });

  it('B-30: SGK tipinde WithholdingTaxTotal kabul edilir', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.SGK,
      withholdingTaxTotals: [{
        taxAmount: 10,
        taxSubtotals: [{
          taxableAmount: 100, taxAmount: 10, percent: 10, taxTypeCode: '601',
        }],
      }],
    });
    const errors = validateByType(input);
    expect(errors.filter(e => e.path === 'withholdingTaxTotals')).toHaveLength(0);
  });

  // Sprint 8f.1 (Bug #1): TEVKIFATIADE + YTBTEVKIFATIADE tevkifatlı iade semantiği — stopaj zorunlu
  it('B-30: TEVKIFATIADE tipinde WithholdingTaxTotal kabul edilir (Bug #1 fix)', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.TEVKIFATIADE,
      withholdingTaxTotals: [{
        taxAmount: 10,
        taxSubtotals: [{
          taxableAmount: 100, taxAmount: 10, percent: 10, taxTypeCode: '601',
        }],
      }],
    });
    const errors = validateByType(input);
    expect(errors.filter(e => e.path === 'withholdingTaxTotals')).toHaveLength(0);
  });

  it('B-30: YTBTEVKIFATIADE tipinde WithholdingTaxTotal kabul edilir (Bug #1 fix)', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.YTBTEVKIFATIADE,
      withholdingTaxTotals: [{
        taxAmount: 10,
        taxSubtotals: [{
          taxableAmount: 100, taxAmount: 10, percent: 10, taxTypeCode: '601',
        }],
      }],
    });
    const errors = validateByType(input);
    expect(errors.filter(e => e.path === 'withholdingTaxTotals')).toHaveLength(0);
  });

  it('B-30 regresyon: SATIS tipinde WithholdingTaxTotal HALA reddedilir (Bug #1 fix sonrası)', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.SATIS,
      withholdingTaxTotals: [{
        taxAmount: 10,
        taxSubtotals: [{
          taxableAmount: 100, taxAmount: 10, percent: 10, taxTypeCode: '601',
        }],
      }],
    });
    const errors = validateByType(input);
    const wh = errors.find(e => e.code === 'INVALID_VALUE' && e.path === 'withholdingTaxTotals');
    expect(wh).toBeDefined();
    expect(wh!.expected).toContain('TEVKIFATIADE');
    expect(wh!.expected).toContain('YTBTEVKIFATIADE');
  });
});

describe('type-validators — B-31 IADE DocumentTypeCode zorunluluğu', () => {
  it('B-31: IADE + billingReference documentTypeCode yok → reddedilir', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.IADE,
      billingReferences: [{
        invoiceDocumentReference: {
          id: 'REF2024000000001',
          issueDate: '2024-01-01',
          // documentTypeCode yok
        },
      }],
    });
    const errors = validateByType(input);
    expect(errors.some(e => e.path?.endsWith('documentTypeCode'))).toBe(true);
  });

  it('B-31: IADE + documentTypeCode="DIGER" → reddedilir', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.IADE,
      billingReferences: [{
        invoiceDocumentReference: {
          id: 'REF2024000000001',
          issueDate: '2024-01-01',
          documentTypeCode: 'DIGER',
        },
      }],
    });
    const errors = validateByType(input);
    expect(errors.some(e => e.path?.endsWith('documentTypeCode'))).toBe(true);
  });

  it('B-31: IADE + documentTypeCode="IADE" kabul edilir', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.IADE,
      billingReferences: [{
        invoiceDocumentReference: {
          id: 'REF2024000000001',
          issueDate: '2024-01-01',
          documentTypeCode: 'IADE',
        },
      }],
    });
    const errors = validateByType(input);
    expect(errors.filter(e => e.path?.endsWith('documentTypeCode'))).toHaveLength(0);
  });
});

// Sprint 8f.2 (Bug #2): OZELMATRAH tipinde taxExemptionReasonCode zorunluluğu.
describe('type-validators — OZELMATRAH taxExemptionReasonCode zorunluluğu (Bug #2 fix)', () => {
  it('Bug #2: OZELMATRAH + taxExemptionReasonCode eksik → TYPE_REQUIREMENT atar', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.OZELMATRAH,
      taxTotals: [{ taxAmount: 0, taxSubtotals: [{
        taxableAmount: 100, taxAmount: 0, percent: 0, taxTypeCode: '0015',
        // taxExemptionReasonCode yok
      }] }],
    });
    const errors = validateByType(input);
    const err = errors.find(e => e.code === 'TYPE_REQUIREMENT' &&
      e.path === 'taxTotals.taxSubtotals[0].taxExemptionReasonCode');
    expect(err).toBeDefined();
    expect(err!.message).toContain('OZELMATRAH');
    expect(err!.message).toContain('801-812');
  });

  it('Bug #2 regresyon: OZELMATRAH + taxExemptionReasonCode=801 kabul edilir', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.OZELMATRAH,
      taxTotals: [{ taxAmount: 0, taxSubtotals: [{
        taxableAmount: 100, taxAmount: 0, percent: 0, taxTypeCode: '0015',
        taxExemptionReasonCode: '801',
        taxExemptionReason: 'Özel matrah',
      }] }],
    });
    const errors = validateByType(input);
    expect(errors.filter(e =>
      e.path === 'taxTotals.taxSubtotals[0].taxExemptionReasonCode')).toHaveLength(0);
  });

  it('Bug #2 regresyon: OZELMATRAH + taxExemptionReasonCode=999 INVALID_VALUE atar (whitelist)', () => {
    const input = createSatisInput({
      invoiceTypeCode: InvoiceTypeCode.OZELMATRAH,
      taxTotals: [{ taxAmount: 0, taxSubtotals: [{
        taxableAmount: 100, taxAmount: 0, percent: 0, taxTypeCode: '0015',
        taxExemptionReasonCode: '999',
        taxExemptionReason: 'Geçersiz',
      }] }],
    });
    const errors = validateByType(input);
    const err = errors.find(e => e.code === 'INVALID_VALUE' &&
      e.path === 'taxTotals.taxSubtotals[0].taxExemptionReasonCode');
    expect(err).toBeDefined();
    expect(err!.actual).toBe('999');
  });
});

describe('profile-validators — B-29 IHRACAT satır amount zorunluluğu', () => {
  function createIhracatBase(): InvoiceInput {
    return createSatisInput({
      profileId: InvoiceProfileId.IHRACAT,
      invoiceTypeCode: InvoiceTypeCode.ISTISNA,
      buyerCustomer: {
        partyType: 'EXPORT',
        party: {
          vknTckn: '0987654321', taxIdType: 'VKN',
          name: 'Yabancı Alıcı', registrationName: 'Foreign Buyer Ltd',
          cityName: 'New York', citySubdivisionName: 'Manhattan', country: 'ABD',
        },
      },
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Test',
        taxOffice: 'Büyük Mükellefler',
        cityName: 'İstanbul', citySubdivisionName: 'Kadıköy', country: 'Türkiye',
      },
    });
  }

  it('B-29: IHRACAT satır priceAmount=0 → reddedilir', () => {
    const input = createIhracatBase();
    input.lines[0].price = { priceAmount: 0 };
    input.lines[0].lineExtensionAmount = 100;
    const errors = validateByProfile(input);
    expect(errors.some(e => e.path === 'lines[0].price.priceAmount')).toBe(true);
  });

  it('B-29: IHRACAT satır lineExtensionAmount=0 → reddedilir', () => {
    const input = createIhracatBase();
    input.lines[0].lineExtensionAmount = 0;
    const errors = validateByProfile(input);
    expect(errors.some(e => e.path === 'lines[0].lineExtensionAmount')).toBe(true);
  });
});
