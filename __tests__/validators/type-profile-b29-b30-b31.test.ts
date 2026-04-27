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

  // Sprint 8g.2 (B-NEW-v2-05) — SimpleInvoiceBuilder mapper davranış testleri.
  // Önceki davranış: mapper IADE grubu için 'IADE' literal'ını silent override
  // ediyor; kullanıcı 'DIGER' verse de 'IADE' yazılıyordu. Yeni davranış:
  // kullanıcı verdiği değer korunur, validator B-31 yakalar.
  describe('Sprint 8g.2 — SimpleInvoiceBuilder mapper IADE doctype passthrough', () => {
    function simpleInput(billingDoctype?: string): any {
      return {
        id: 'AUD2026000000005',
        uuid: 'a1d2026a-0005-4000-8001-000000000005',
        datetime: '2026-04-27T10:00:00',
        profile: 'TEMELFATURA', type: 'IADE', currencyCode: 'TRY',
        billingReference: {
          id: 'AUD2026000000001',
          issueDate: '2026-04-24',
          ...(billingDoctype !== undefined ? { documentTypeCode: billingDoctype } : {}),
        },
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y',
          address: 'A', district: 'B', city: 'C' },
        customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y',
          address: 'A', district: 'B', city: 'C' },
        lines: [{ name: 'İade', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
      };
    }

    it('IADE + kullanıcı documentTypeCode="DIGER" → TYPE_REQUIREMENT (artık silent override yok)', async () => {
      const { SimpleInvoiceBuilder } = await import('../../src/calculator/simple-invoice-builder');
      const { UblBuildError } = await import('../../src/errors/ubl-build-error');
      const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
      try {
        builder.build(simpleInput('DIGER'));
        throw new Error('Beklenmedik success — DIGER kabul edildi');
      } catch (e) {
        expect(e).toBeInstanceOf(UblBuildError);
        const errs = (e as InstanceType<typeof UblBuildError>).errors;
        const err = errs.find(x => x.path?.endsWith('documentTypeCode'));
        expect(err?.code).toBe('TYPE_REQUIREMENT');
        expect(err?.message).toContain('IADE');
      }
    });

    it('IADE + kullanıcı documentTypeCode="IADE" → pas', async () => {
      const { SimpleInvoiceBuilder } = await import('../../src/calculator/simple-invoice-builder');
      const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
      const result = builder.build(simpleInput('IADE'));
      expect(result.xml).toContain('<cbc:DocumentTypeCode>IADE</cbc:DocumentTypeCode>');
    });

    it('IADE + documentTypeCode hiç verilmezse → silent default "IADE" (mevcut compat)', async () => {
      const { SimpleInvoiceBuilder } = await import('../../src/calculator/simple-invoice-builder');
      const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
      const result = builder.build(simpleInput(undefined));
      // Backward compat: kullanıcı vermezse mapper IADE atar
      expect(result.xml).toContain('<cbc:DocumentTypeCode>IADE</cbc:DocumentTypeCode>');
    });
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

// Sprint 8f.3 (Bug #3): YATIRIMTESVIK profilinde YTBNO eksikse semantik net hata
describe('profile-validators — YATIRIMTESVIK_REQUIRES_YTBNO (Bug #3 fix)', () => {
  function createYatirimTesvikBase(): InvoiceInput {
    return createSatisInput({
      profileId: InvoiceProfileId.YATIRIMTESVIK,
      invoiceTypeCode: InvoiceTypeCode.SATIS,
      contractReference: { id: '123456', schemeId: 'YTBNO' },
      lines: [{
        id: '1', invoicedQuantity: 1, unitCode: 'C62', lineExtensionAmount: 100,
        taxTotal: { taxAmount: 18, taxSubtotals: [{
          taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015',
        }] },
        item: {
          name: 'X',
          commodityClassification: { itemClassificationCode: '03' },
        },
        price: { priceAmount: 100 },
      }],
    });
  }

  it('Bug #3: YATIRIMTESVIK + contractReference undefined → YATIRIMTESVIK_REQUIRES_YTBNO', () => {
    const input = createYatirimTesvikBase();
    delete (input as any).contractReference;
    const errors = validateByProfile(input);
    const err = errors.find(e => e.code === 'YATIRIMTESVIK_REQUIRES_YTBNO');
    expect(err).toBeDefined();
    expect(err!.path).toBe('contractReference');
    expect(err!.message).toContain('YTBNO');
  });

  it('Bug #3: YATIRIMTESVIK + contractReference.id boş → YATIRIMTESVIK_REQUIRES_YTBNO', () => {
    const input = createYatirimTesvikBase();
    input.contractReference = { id: '', schemeId: 'YTBNO' };
    const errors = validateByProfile(input);
    const err = errors.find(e => e.code === 'YATIRIMTESVIK_REQUIRES_YTBNO');
    expect(err).toBeDefined();
    expect(err!.path).toBe('contractReference.id');
  });

  it('Bug #3: EARSIVFATURA + YTBSATIS + contractReference undefined → YATIRIMTESVIK_REQUIRES_YTBNO (shared path)', () => {
    const input = createYatirimTesvikBase();
    input.profileId = InvoiceProfileId.EARSIVFATURA;
    input.invoiceTypeCode = InvoiceTypeCode.YTBSATIS;
    delete (input as any).contractReference;
    const errors = validateByProfile(input);
    const err = errors.find(e => e.code === 'YATIRIMTESVIK_REQUIRES_YTBNO');
    expect(err).toBeDefined();
  });

  it('Bug #3 regresyon: invalidFormat kuralı korunur (5 haneli YTBNO)', () => {
    const input = createYatirimTesvikBase();
    input.contractReference = { id: '12345', schemeId: 'YTBNO' };
    const errors = validateByProfile(input);
    expect(errors.some(e => e.code === 'INVALID_FORMAT' &&
      e.path === 'contractReference.id')).toBe(true);
  });
});
