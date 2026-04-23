import { describe, it, expect } from 'vitest';
import { validateYatirimTesvikRules } from '../../src/validators/profile-validators';
import { validateInvoiceState } from '../../src/calculator/invoice-rules';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

function createYtbIstisnaInput(calcSeq?: number): InvoiceInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: InvoiceProfileId.YATIRIMTESVIK,
    invoiceTypeCode: InvoiceTypeCode.ISTISNA,
    issueDate: '2024-01-15',
    currencyCode: 'TRY',
    supplier: { vknTckn: '1234567890', taxIdType: 'VKN', name: 'Test',
      cityName: 'İstanbul', citySubdivisionName: 'Kadıköy', country: 'Türkiye' },
    customer: { vknTckn: '12345678901', taxIdType: 'TCKN', firstName: 'A', familyName: 'B',
      cityName: 'Ankara', citySubdivisionName: 'Çankaya', country: 'Türkiye' },
    contractReference: { id: '123456', schemeId: 'YTBNO', issueDate: '2024-01-01' },
    taxTotals: [{ taxAmount: 0, taxSubtotals: [{
      taxableAmount: 100, taxAmount: 0, percent: 0, taxTypeCode: '0015',
      taxExemptionReasonCode: '308', taxExemptionReason: 'YTB Makina İstisna',
    }] }],
    legalMonetaryTotal: { lineExtensionAmount: 100, taxExclusiveAmount: 100,
      taxInclusiveAmount: 100, payableAmount: 100 },
    lines: [{
      id: '1', invoicedQuantity: 1, unitCode: 'C62', lineExtensionAmount: 100,
      taxTotal: { taxAmount: 0, taxSubtotals: [{
        taxableAmount: 100, taxAmount: 0, percent: 0, taxTypeCode: '0015',
        taxExemptionReasonCode: '308',
        ...(calcSeq !== undefined ? { calculationSequenceNumeric: calcSeq } : {}),
      }] },
      item: {
        name: 'Makine', modelName: 'M1',
        commodityClassification: { itemClassificationCode: '01' },
        itemInstances: [{ productTraceId: 'PT1', serialId: 'S1' }],
      },
      price: { priceAmount: 100 },
    }],
  };
}

describe('profile-validators — B-67 YTB ISTISNA CalculationSequenceNumeric=-1', () => {
  it('B-67: calculationSequenceNumeric=-1 eksik → reddedilir', () => {
    const input = createYtbIstisnaInput(undefined);
    const errors = validateYatirimTesvikRules(input, InvoiceProfileId.YATIRIMTESVIK);
    expect(errors.some(e => e.path?.endsWith('calculationSequenceNumeric'))).toBe(true);
  });

  it('B-67: calculationSequenceNumeric=0 → reddedilir', () => {
    const input = createYtbIstisnaInput(0);
    const errors = validateYatirimTesvikRules(input, InvoiceProfileId.YATIRIMTESVIK);
    expect(errors.some(e => e.path?.endsWith('calculationSequenceNumeric'))).toBe(true);
  });

  it('B-67: calculationSequenceNumeric=-1 kabul edilir', () => {
    const input = createYtbIstisnaInput(-1);
    const errors = validateYatirimTesvikRules(input, InvoiceProfileId.YATIRIMTESVIK);
    expect(errors.filter(e => e.path?.endsWith('calculationSequenceNumeric'))).toHaveLength(0);
  });
});

describe('invoice-rules — B-78 validateInvoiceState Schematron paraleli uyarılar', () => {
  const baseState = { type: 'SATIS', profile: 'TICARIFATURA' };

  it('B-78.1: 555 kodu + allowReducedKdvRate=false → hata', () => {
    const warnings = validateInvoiceState({
      ...baseState, kdvExemptionCode: '555', allowReducedKdvRate: false,
    });
    expect(warnings.some(w => w.field === 'kdvExemptionCode' && w.message.includes('555'))).toBe(true);
  });

  it('B-78.1: 555 kodu + allowReducedKdvRate=true → uyarı yok', () => {
    const warnings = validateInvoiceState({
      ...baseState, kdvExemptionCode: '555', allowReducedKdvRate: true,
    });
    expect(warnings.filter(w => w.message.includes('555'))).toHaveLength(0);
  });

  it('B-78.2: YATIRIMTESVIK + ytbAllKdvPositive=false → hata', () => {
    const warnings = validateInvoiceState({
      type: 'SATIS', profile: 'YATIRIMTESVIK',
      ytbNo: '123456', hasBuyerCustomer: true,
      ytbAllKdvPositive: false,
    });
    expect(warnings.some(w => w.field === 'taxTotals' && w.message.includes('YATIRIMTESVIK'))).toBe(true);
  });

  it('B-78.3: IHRACKAYITLI+702 + hasGtip=false → GTİP hatası', () => {
    const warnings = validateInvoiceState({
      type: 'IHRACKAYITLI', profile: 'TEMELFATURA',
      kdvExemptionCode: '702', hasGtip: false, hasAliciDibKod: true,
    });
    expect(warnings.some(w => w.message.includes('GTİP'))).toBe(true);
  });

  it('B-78.3: IHRACKAYITLI+702 + hasAliciDibKod=false → ALICIDIBSATIRKOD hatası', () => {
    const warnings = validateInvoiceState({
      type: 'IHRACKAYITLI', profile: 'TEMELFATURA',
      kdvExemptionCode: '702', hasGtip: true, hasAliciDibKod: false,
    });
    expect(warnings.some(w => w.message.includes('ALICIDIBSATIRKOD'))).toBe(true);
  });

  it('B-78.4: has4171Code=true + SATIS tipi → hata', () => {
    const warnings = validateInvoiceState({
      ...baseState, has4171Code: true,
    });
    expect(warnings.some(w => w.field === 'taxTotals.taxTypeCode' && w.message.includes('4171'))).toBe(true);
  });

  it('B-78.4: has4171Code=true + TEVKIFAT tipi → uyarı yok (izinli)', () => {
    const warnings = validateInvoiceState({
      type: 'TEVKIFAT', profile: 'TICARIFATURA',
      has4171Code: true,
    });
    expect(warnings.filter(w => w.message.includes('4171'))).toHaveLength(0);
  });

  it('B-78.5: IHRACAT + ihracatPartyComplete=false → hata', () => {
    const warnings = validateInvoiceState({
      type: 'ISTISNA', profile: 'IHRACAT',
      hasBuyerCustomer: true,
      ihracatPartyComplete: false,
    });
    expect(warnings.some(w => w.field === 'supplier' && w.message.includes('IHRACAT'))).toBe(true);
  });

  it('B-78.5: YOLCU + yolcuBuyerComplete=false → hata', () => {
    const warnings = validateInvoiceState({
      type: 'ISTISNA', profile: 'YOLCUBERABERFATURA',
      hasBuyerCustomer: true,
      yolcuBuyerComplete: false,
    });
    expect(warnings.some(w => w.field === 'buyerCustomer.party'
      && w.message.includes('YOLCUBERABERFATURA'))).toBe(true);
  });
});
