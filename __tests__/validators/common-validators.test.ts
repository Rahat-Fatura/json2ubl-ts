import { describe, it, expect } from 'vitest';
import { validateCommon, validateParty } from '../../src/validators/common-validators';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';
import type { PartyInput } from '../../src/types/common';

/** Minimal geçerli fatura verisi */
function createValidInput(overrides?: Partial<InvoiceInput>): InvoiceInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: InvoiceTypeCode.SATIS,
    issueDate: '2024-01-15',
    currencyCode: 'TRY',
    supplier: createValidVknParty(),
    customer: createValidTcknParty(),
    taxTotals: [{
      taxAmount: 18,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: 18,
        percent: 18,
        taxTypeCode: '0015',
        taxTypeName: 'KDV',
      }],
    }],
    legalMonetaryTotal: {
      lineExtensionAmount: 100,
      taxExclusiveAmount: 100,
      taxInclusiveAmount: 118,
      payableAmount: 118,
    },
    lines: [{
      id: '1',
      invoicedQuantity: 1,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: {
        taxAmount: 18,
        taxSubtotals: [{
          taxableAmount: 100,
          taxAmount: 18,
          percent: 18,
          taxTypeCode: '0015',
        }],
      },
      item: { name: 'Test Ürün' },
      price: { priceAmount: 100 },
    }],
    ...overrides,
  };
}

function createValidVknParty(): PartyInput {
  return {
    vknTckn: '1234567890',
    taxIdType: 'VKN',
    name: 'Test Firma A.Ş.',
    cityName: 'İstanbul',
    country: 'Türkiye',
  };
}

function createValidTcknParty(): PartyInput {
  return {
    vknTckn: '12345678901',
    taxIdType: 'TCKN',
    firstName: 'Ahmet',
    familyName: 'Yılmaz',
    cityName: 'Ankara',
    country: 'Türkiye',
  };
}

describe('§1 Ortak Validasyon (validateCommon)', () => {
  it('geçerli fatura verisinde hata döndürmez', () => {
    const errors = validateCommon(createValidInput());
    expect(errors).toHaveLength(0);
  });

  describe('§1.2 Zorunlu alanlar', () => {
    it('eksik id için hata verir', () => {
      const errors = validateCommon(createValidInput({ id: '' }));
      expect(errors.some(e => e.code === 'MISSING_FIELD' && e.path === 'id')).toBe(true);
    });

    it('geçersiz id formatı için hata verir', () => {
      const errors = validateCommon(createValidInput({ id: 'INVALID' }));
      expect(errors.some(e => e.code === 'INVALID_FORMAT' && e.path === 'id')).toBe(true);
    });

    it('eksik uuid için hata verir', () => {
      const errors = validateCommon(createValidInput({ uuid: '' }));
      expect(errors.some(e => e.code === 'MISSING_FIELD' && e.path === 'uuid')).toBe(true);
    });

    it('geçersiz uuid formatı için hata verir', () => {
      const errors = validateCommon(createValidInput({ uuid: 'not-a-uuid' }));
      expect(errors.some(e => e.code === 'INVALID_FORMAT' && e.path === 'uuid')).toBe(true);
    });

    it('eksik issueDate için hata verir', () => {
      const errors = validateCommon(createValidInput({ issueDate: '' }));
      expect(errors.some(e => e.code === 'MISSING_FIELD' && e.path === 'issueDate')).toBe(true);
    });

    it('geçersiz tarih formatı için hata verir', () => {
      const errors = validateCommon(createValidInput({ issueDate: '15-01-2024' }));
      expect(errors.some(e => e.code === 'INVALID_FORMAT' && e.path === 'issueDate')).toBe(true);
    });

    it('geçersiz saat formatı için hata verir', () => {
      const errors = validateCommon(createValidInput({ issueTime: '25:00' }));
      expect(errors.some(e => e.code === 'INVALID_FORMAT' && e.path === 'issueTime')).toBe(true);
    });

    it('geçerli saat formatında hata vermez', () => {
      const errors = validateCommon(createValidInput({ issueTime: '14:30:00' }));
      expect(errors.filter(e => e.path === 'issueTime')).toHaveLength(0);
    });
  });

  describe('§1.3 Para birimi', () => {
    it('geçersiz para birimi kodu için hata verir', () => {
      const errors = validateCommon(createValidInput({ currencyCode: 'XYZ' }));
      expect(errors.some(e => e.code === 'INVALID_VALUE' && e.path === 'currencyCode')).toBe(true);
    });

    it('dövizli faturada exchangeRate yoksa hata verir', () => {
      const errors = validateCommon(createValidInput({ currencyCode: 'USD', exchangeRate: undefined }));
      expect(errors.some(e => e.path === 'exchangeRate')).toBe(true);
    });

    it('TRY faturada exchangeRate gerekmez', () => {
      const errors = validateCommon(createValidInput({ currencyCode: 'TRY' }));
      expect(errors.filter(e => e.path === 'exchangeRate')).toHaveLength(0);
    });
  });

  describe('§1.7 Vergi', () => {
    it('boş taxTotals için hata verir', () => {
      const errors = validateCommon(createValidInput({ taxTotals: [] }));
      expect(errors.some(e => e.path === 'taxTotals')).toBe(true);
    });

    it('geçersiz taxTypeCode için hata verir', () => {
      const input = createValidInput();
      input.taxTotals[0].taxSubtotals[0].taxTypeCode = '9999';
      const errors = validateCommon(input);
      expect(errors.some(e => e.code === 'INVALID_VALUE' && e.path?.includes('taxTypeCode'))).toBe(true);
    });
  });

  describe('§1.8 Satırlar', () => {
    it('boş lines için hata verir', () => {
      const errors = validateCommon(createValidInput({ lines: [] }));
      expect(errors.some(e => e.path === 'lines')).toBe(true);
    });

    it('ürün adı boş ise hata verir', () => {
      const input = createValidInput();
      input.lines[0].item.name = '';
      const errors = validateCommon(input);
      expect(errors.some(e => e.path === 'lines[0].item.name')).toBe(true);
    });
  });
});

describe('§1.5 Party Validasyonu (validateParty)', () => {
  it('geçerli VKN parti için hata döndürmez', () => {
    expect(validateParty(createValidVknParty(), 'supplier')).toHaveLength(0);
  });

  it('geçerli TCKN parti için hata döndürmez', () => {
    expect(validateParty(createValidTcknParty(), 'customer')).toHaveLength(0);
  });

  it('eksik parti için hata verir', () => {
    const errors = validateParty(undefined, 'supplier');
    expect(errors.some(e => e.code === 'MISSING_FIELD')).toBe(true);
  });

  it('VKN 10 hane değilse hata verir', () => {
    const party = createValidVknParty();
    party.vknTckn = '123';
    const errors = validateParty(party, 'supplier');
    expect(errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('TCKN 11 hane değilse hata verir', () => {
    const party = createValidTcknParty();
    party.vknTckn = '123';
    const errors = validateParty(party, 'customer');
    expect(errors.some(e => e.code === 'INVALID_FORMAT')).toBe(true);
  });

  it('VKN ise name yoksa hata verir', () => {
    const party = createValidVknParty();
    party.name = '';
    const errors = validateParty(party, 'supplier');
    expect(errors.some(e => e.code === 'MISSING_FIELD' && e.path?.includes('name'))).toBe(true);
  });

  it('TCKN ise firstName yoksa hata verir', () => {
    const party = createValidTcknParty();
    party.firstName = '';
    const errors = validateParty(party, 'customer');
    expect(errors.some(e => e.path?.includes('firstName'))).toBe(true);
  });

  it('TCKN ise familyName yoksa hata verir', () => {
    const party = createValidTcknParty();
    party.familyName = '';
    const errors = validateParty(party, 'customer');
    expect(errors.some(e => e.path?.includes('familyName'))).toBe(true);
  });
});
