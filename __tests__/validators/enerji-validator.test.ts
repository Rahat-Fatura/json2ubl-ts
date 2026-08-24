import { describe, it, expect } from 'vitest';
import {
  validateEnerjiInvoicePeriod,
  validateEnerjiEsuRaporId,
  validateEnerjiCustomerPlaka,
  validateEnerjiItemInstanceSerialId,
  validateEnerji,
} from '../../src/validators/enerji-validator';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput, InvoiceLineInput } from '../../src/types/invoice-input';

/**
 * Sprint 9 — Enerji/Şarj 4 yeni Schematron kuralı (20260701, History.txt md.1-4).
 *
 * | Kural                              | Kapsam           |
 * |------------------------------------|------------------|
 * | EnerjiInvoicePeriodCheck           | SARJ + SARJANLIK |
 * | EnerjiESURaporIDCheck              | yalnız SARJ      |
 * | EnerjiPartyIdentificationPlakaCheck| SARJ + SARJANLIK |
 * | EnerjiItemInstanceSerialIDCheck    | yalnız SARJANLIK |
 */

const GUID = 'a1b2c3d4-e5f6-4789-8abc-def012345678';

function makeLine(serialId?: string): InvoiceLineInput {
  return {
    id: '1',
    invoicedQuantity: 45,
    unitCode: 'KWH',
    lineExtensionAmount: 360,
    taxTotal: {
      taxAmount: 72,
      taxSubtotals: [{ taxableAmount: 360, taxAmount: 72, percent: 20, taxTypeCode: '0015' }],
    },
    item: {
      name: 'EV DC Hızlı Şarj 45 kWh',
      itemInstances: serialId ? [{ serialId }] : undefined,
    },
    price: { priceAmount: 8 },
  } as any;
}

function makeInput(
  type: InvoiceTypeCode,
  opts: {
    period?: { startDate?: string; startTime?: string; endDate?: string; endTime?: string };
    esuRaporId?: { id?: string; schemeId?: string; issueDate?: string };
    plaka?: string | string[];
    lineSerialIds?: Array<string | undefined>;
    profile?: InvoiceProfileId;
  } = {},
): InvoiceInput {
  const plates = opts.plaka === undefined
    ? ['34ABC123']
    : Array.isArray(opts.plaka) ? opts.plaka : [opts.plaka];

  return {
    id: 'MTX202600000065',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: opts.profile ?? InvoiceProfileId.ENERJI,
    invoiceTypeCode: type,
    issueDate: '2026-04-24',
    currencyCode: 'TRY',
    supplier: {} as any,
    customer: {
      additionalIdentifiers: plates.map(value => ({ schemeId: 'PLAKA', value })),
    } as any,
    taxTotals: [],
    invoicePeriod: opts.period ?? {
      startDate: '2026-04-01', startTime: '00:00:00',
      endDate: '2026-04-30', endTime: '23:59:59',
    },
    additionalDocuments: opts.esuRaporId === undefined
      ? [{ id: GUID, schemeId: 'ESURaporID', issueDate: '2026-04-30' }]
      : [{
          id: opts.esuRaporId.id ?? GUID,
          schemeId: opts.esuRaporId.schemeId,
          issueDate: opts.esuRaporId.issueDate,
        }],
    lines: (opts.lineSerialIds ?? ['SN-001']).map(makeLine),
  } as any;
}

// ============================================================
// EnerjiInvoicePeriodCheck
// ============================================================

describe('EnerjiInvoicePeriodCheck — SARJ + SARJANLIK', () => {
  for (const type of [InvoiceTypeCode.SARJ, InvoiceTypeCode.SARJANLIK]) {
    it(`${type}: dört alan dolu → kabul`, () => {
      expect(validateEnerjiInvoicePeriod(makeInput(type))).toEqual([]);
    });

    it(`${type}: InvoicePeriod hiç yok → ret`, () => {
      const input = makeInput(type);
      delete (input as any).invoicePeriod;
      const errors = validateEnerjiInvoicePeriod(input);
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('ENERJI_INVOICE_PERIOD_REQUIRED');
    });

    for (const missing of ['startDate', 'startTime', 'endDate', 'endTime'] as const) {
      it(`${type}: ${missing} eksik → ret`, () => {
        const period: any = {
          startDate: '2026-04-01', startTime: '00:00:00',
          endDate: '2026-04-30', endTime: '23:59:59',
        };
        delete period[missing];
        const errors = validateEnerjiInvoicePeriod(makeInput(type, { period }));
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe(`invoicePeriod.${missing}`);
      });
    }
  }

  it('tarih 2005-01-01 öncesi → ret', () => {
    const errors = validateEnerjiInvoicePeriod(makeInput(InvoiceTypeCode.SARJ, {
      period: {
        startDate: '2004-12-31', startTime: '00:00:00',
        endDate: '2026-04-30', endTime: '23:59:59',
      },
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('invoicePeriod.startDate');
  });

  it('2005-01-01 tam sınır → kabul', () => {
    expect(validateEnerjiInvoicePeriod(makeInput(InvoiceTypeCode.SARJ, {
      period: {
        startDate: '2005-01-01', startTime: '00:00:00',
        endDate: '2005-01-01', endTime: '23:59:59',
      },
    }))).toEqual([]);
  });

  it('geçersiz saat formatı → ret', () => {
    const errors = validateEnerjiInvoicePeriod(makeInput(InvoiceTypeCode.SARJ, {
      period: {
        startDate: '2026-04-01', startTime: '24:00',
        endDate: '2026-04-30', endTime: '23:59:59',
      },
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('invoicePeriod.startTime');
  });

  it('SATIS tipinde kural çalışmıyor', () => {
    const input = makeInput(InvoiceTypeCode.SATIS, { profile: InvoiceProfileId.TICARIFATURA });
    delete (input as any).invoicePeriod;
    expect(validateEnerjiInvoicePeriod(input)).toEqual([]);
  });
});

// ============================================================
// EnerjiESURaporIDCheck — yalnız SARJ
// ============================================================

describe('EnerjiESURaporIDCheck — yalnız SARJ', () => {
  it('SARJ: geçerli GUID + IssueDate → kabul', () => {
    expect(validateEnerjiEsuRaporId(makeInput(InvoiceTypeCode.SARJ))).toEqual([]);
  });

  it('SARJ: AdditionalDocumentReference hiç yok → ret', () => {
    const input = makeInput(InvoiceTypeCode.SARJ);
    delete (input as any).additionalDocuments;
    const errors = validateEnerjiEsuRaporId(input);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('ENERJI_ESU_RAPOR_ID_REQUIRED');
  });

  it('SARJ: schemeID ESURaporID değil → ret', () => {
    const errors = validateEnerjiEsuRaporId(makeInput(InvoiceTypeCode.SARJ, {
      esuRaporId: { schemeId: 'DIGER', issueDate: '2026-04-30' },
    }));
    expect(errors).toHaveLength(1);
  });

  it('SARJ: ID GUID formatında değil → ret', () => {
    const errors = validateEnerjiEsuRaporId(makeInput(InvoiceTypeCode.SARJ, {
      esuRaporId: { id: 'RAPOR-001', schemeId: 'ESURaporID', issueDate: '2026-04-30' },
    }));
    expect(errors).toHaveLength(1);
  });

  it('SARJ: IssueDate yok → ret', () => {
    const errors = validateEnerjiEsuRaporId(makeInput(InvoiceTypeCode.SARJ, {
      esuRaporId: { schemeId: 'ESURaporID' },
    }));
    expect(errors).toHaveLength(1);
  });

  it('SARJ: IssueDate 20xx dışı → ret (Schematron ^20\\d{2}-\\d{2}-\\d{2}$)', () => {
    const errors = validateEnerjiEsuRaporId(makeInput(InvoiceTypeCode.SARJ, {
      esuRaporId: { schemeId: 'ESURaporID', issueDate: '1999-04-30' },
    }));
    expect(errors).toHaveLength(1);
  });

  it('SARJ: birden fazla ESURaporID → kabul (1..n)', () => {
    const input = makeInput(InvoiceTypeCode.SARJ);
    (input as any).additionalDocuments.push({
      id: 'b2c3d4e5-f6a7-4890-9bcd-ef0123456789',
      schemeId: 'ESURaporID',
      issueDate: '2026-04-29',
    });
    expect(validateEnerjiEsuRaporId(input)).toEqual([]);
  });

  it('SARJANLIK: kural çalışmıyor (yalnız SARJ)', () => {
    const input = makeInput(InvoiceTypeCode.SARJANLIK);
    delete (input as any).additionalDocuments;
    expect(validateEnerjiEsuRaporId(input)).toEqual([]);
  });
});

// ============================================================
// EnerjiPartyIdentificationPlakaCheck
// ============================================================

describe('EnerjiPartyIdentificationPlakaCheck — SARJ + SARJANLIK', () => {
  for (const type of [InvoiceTypeCode.SARJ, InvoiceTypeCode.SARJANLIK]) {
    it(`${type}: tam 1 PLAKA → kabul`, () => {
      expect(validateEnerjiCustomerPlaka(makeInput(type))).toEqual([]);
    });

    it(`${type}: PLAKA yok → ret`, () => {
      const errors = validateEnerjiCustomerPlaka(makeInput(type, { plaka: [] }));
      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe('ENERJI_CUSTOMER_PLAKA_REQUIRED');
    });

    it(`${type}: 2 PLAKA → ret (Schematron count() = 1)`, () => {
      const errors = validateEnerjiCustomerPlaka(makeInput(type, {
        plaka: ['34ABC123', '34XYZ456'],
      }));
      expect(errors).toHaveLength(1);
    });
  }

  it('Enerji plaka regex TR regex\'inden farklı: ^[A-Z0-9_-]+$ kabul ediyor', () => {
    // TR irsaliye regex'i bunu reddederdi (il kodu kuralı yok burada)
    expect(validateEnerjiCustomerPlaka(makeInput(InvoiceTypeCode.SARJ, {
      plaka: 'ABC_123-XY',
    }))).toEqual([]);
  });

  it('küçük harf plaka → ret', () => {
    const errors = validateEnerjiCustomerPlaka(makeInput(InvoiceTypeCode.SARJ, {
      plaka: '34abc123',
    }));
    expect(errors).toHaveLength(1);
  });

  it('50 karakterden uzun plaka → ret', () => {
    const errors = validateEnerjiCustomerPlaka(makeInput(InvoiceTypeCode.SARJ, {
      plaka: 'A'.repeat(51),
    }));
    expect(errors).toHaveLength(1);
  });

  it('tam 50 karakter → kabul', () => {
    expect(validateEnerjiCustomerPlaka(makeInput(InvoiceTypeCode.SARJ, {
      plaka: 'A'.repeat(50),
    }))).toEqual([]);
  });
});

// ============================================================
// EnerjiItemInstanceSerialIDCheck — yalnız SARJANLIK
// ============================================================

describe('EnerjiItemInstanceSerialIDCheck — yalnız SARJANLIK', () => {
  it('SARJANLIK: her satırda SerialID → kabul', () => {
    expect(validateEnerjiItemInstanceSerialId(makeInput(InvoiceTypeCode.SARJANLIK, {
      lineSerialIds: ['SN-001', 'SN-002'],
    }))).toEqual([]);
  });

  it('SARJANLIK: bir satırda SerialID yok → o satır için ret', () => {
    const errors = validateEnerjiItemInstanceSerialId(makeInput(InvoiceTypeCode.SARJANLIK, {
      lineSerialIds: ['SN-001', undefined],
    }));
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('lines[1].item.itemInstances');
  });

  it('SARJANLIK: hiçbir satırda SerialID yok → her satır için ayrı hata', () => {
    const errors = validateEnerjiItemInstanceSerialId(makeInput(InvoiceTypeCode.SARJANLIK, {
      lineSerialIds: [undefined, undefined, undefined],
    }));
    expect(errors).toHaveLength(3);
  });

  it('SARJANLIK: SerialID boşluk → ret', () => {
    const errors = validateEnerjiItemInstanceSerialId(makeInput(InvoiceTypeCode.SARJANLIK, {
      lineSerialIds: ['   '],
    }));
    expect(errors).toHaveLength(1);
  });

  it('SARJ: kural çalışmıyor (yalnız SARJANLIK)', () => {
    expect(validateEnerjiItemInstanceSerialId(makeInput(InvoiceTypeCode.SARJ, {
      lineSerialIds: [undefined],
    }))).toEqual([]);
  });
});

// ============================================================
// Toplu giriş
// ============================================================

describe('validateEnerji — toplu', () => {
  it('geçerli SARJ → hata yok', () => {
    expect(validateEnerji(makeInput(InvoiceTypeCode.SARJ))).toEqual([]);
  });

  it('geçerli SARJANLIK → hata yok', () => {
    expect(validateEnerji(makeInput(InvoiceTypeCode.SARJANLIK))).toEqual([]);
  });

  it('SARJ dışı tipler hiç hata üretmiyor', () => {
    const input = makeInput(InvoiceTypeCode.SATIS, { profile: InvoiceProfileId.TICARIFATURA });
    delete (input as any).invoicePeriod;
    delete (input as any).additionalDocuments;
    (input as any).customer.additionalIdentifiers = [];
    expect(validateEnerji(input)).toEqual([]);
  });

  it('tamamen boş SARJ → 3 kural birden tetikleniyor', () => {
    const input = makeInput(InvoiceTypeCode.SARJ, { plaka: [], lineSerialIds: [undefined] });
    delete (input as any).invoicePeriod;
    delete (input as any).additionalDocuments;
    const codes = validateEnerji(input).map(e => e.code).sort();
    expect(codes).toEqual([
      'ENERJI_CUSTOMER_PLAKA_REQUIRED',
      'ENERJI_ESU_RAPOR_ID_REQUIRED',
      'ENERJI_INVOICE_PERIOD_REQUIRED',
    ]);
  });
});
