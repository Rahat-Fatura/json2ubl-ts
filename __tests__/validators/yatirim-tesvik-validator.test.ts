import { describe, it, expect } from 'vitest';
import {
  isYatirimTesvikScope,
  validateYatirimTesvikKdvDocument,
  validateYatirimTesvikKdvLine,
} from '../../src/validators/yatirim-tesvik-validator';
import { InvoiceTypeCode, InvoiceProfileId } from '../../src/types/enums';
import type { InvoiceInput, InvoiceLineInput } from '../../src/types/invoice-input';

/**
 * Sprint 5.5 (B-08) — YatirimTesvikKDVCheck + LineKDVCheck testleri.
 *
 * Schematron referans:
 * - Satır 483-485: Belge seviyesi KDV 0015 tüm subtotals amount>0 AND percent>0
 * - Satır 487-490: Satır seviyesi + Harcama Tipi 03/04 özel kural
 */

// ============================================================
// Fixture helpers
// ============================================================

function makeLine(opts: {
  kdvAmount?: number;
  kdvPercent?: number;
  harcamaTipi?: string;
}): InvoiceLineInput {
  return {
    id: '1',
    invoicedQuantity: 1,
    unitCode: 'C62',
    lineExtensionAmount: 100,
    taxTotal: {
      taxAmount: opts.kdvAmount ?? 18,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: opts.kdvAmount ?? 18,
        percent: opts.kdvPercent ?? 18,
        taxTypeCode: '0015',
      }],
    },
    item: {
      name: 'Test',
      commodityClassification: opts.harcamaTipi
        ? { itemClassificationCode: opts.harcamaTipi }
        : undefined,
    } as any,
    price: { priceAmount: 100 } as any,
  };
}

function makeInput(
  profile: InvoiceProfileId,
  type: InvoiceTypeCode,
  opts: {
    docKdvAmount?: number;
    docKdvPercent?: number;
    lines?: InvoiceLineInput[];
  } = {},
): InvoiceInput {
  return {
    id: 'ABC202500000001',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: profile,
    invoiceTypeCode: type,
    issueDate: '2026-01-01',
    currencyCode: 'TRY',
    supplier: {} as any,
    customer: {} as any,
    taxTotals: [{
      taxAmount: opts.docKdvAmount ?? 18,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: opts.docKdvAmount ?? 18,
        percent: opts.docKdvPercent ?? 18,
        taxTypeCode: '0015',
      }],
    }],
    legalMonetaryTotal: {} as any,
    lines: opts.lines ?? [makeLine({})],
  };
}

// ============================================================
// isYatirimTesvikScope
// ============================================================

describe('isYatirimTesvikScope', () => {
  it('YATIRIMTESVIK + SATIS → scope içinde', () => {
    expect(isYatirimTesvikScope(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS)).toBe(true);
  });

  it('YATIRIMTESVIK + IADE → kapsam dışı (İADE tipleri hariç)', () => {
    expect(isYatirimTesvikScope(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.IADE)).toBe(false);
  });

  it('YATIRIMTESVIK + TEVKIFATIADE → kapsam dışı', () => {
    expect(isYatirimTesvikScope(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.TEVKIFATIADE)).toBe(false);
  });

  it('EARSIVFATURA + YTBSATIS → scope içinde', () => {
    expect(isYatirimTesvikScope(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.YTBSATIS)).toBe(true);
  });

  it('EARSIVFATURA + YTBIADE → kapsam dışı (İADE hariç)', () => {
    expect(isYatirimTesvikScope(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.YTBIADE)).toBe(false);
  });

  it('EARSIVFATURA + SATIS (YTB dışı) → kapsam dışı', () => {
    expect(isYatirimTesvikScope(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.SATIS)).toBe(false);
  });

  it('TEMELFATURA + SATIS → kapsam dışı (YATIRIMTESVIK değil)', () => {
    expect(isYatirimTesvikScope(InvoiceProfileId.TEMELFATURA, InvoiceTypeCode.SATIS)).toBe(false);
  });
});

// ============================================================
// validateYatirimTesvikKdvDocument
// ============================================================

describe('validateYatirimTesvikKdvDocument', () => {
  it('YATIRIMTESVIK + SATIS + doc KDV>0 → 0 hata', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      docKdvAmount: 18, docKdvPercent: 18,
    });
    expect(validateYatirimTesvikKdvDocument(input)).toEqual([]);
  });

  it('YATIRIMTESVIK + SATIS + doc KDV=0 → YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      docKdvAmount: 0, docKdvPercent: 18,
    });
    const errors = validateYatirimTesvikKdvDocument(input);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT');
  });

  it('YATIRIMTESVIK + SATIS + doc percent=0 → YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      docKdvAmount: 18, docKdvPercent: 0,
    });
    const errors = validateYatirimTesvikKdvDocument(input);
    expect(errors[0]?.code).toBe('YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT');
  });

  it('YATIRIMTESVIK + IADE → kapsam dışı, 0 hata (KDV=0 olsa bile)', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.IADE, {
      docKdvAmount: 0, docKdvPercent: 0,
    });
    expect(validateYatirimTesvikKdvDocument(input)).toEqual([]);
  });

  it('EARSIVFATURA + YTBSATIS + doc KDV>0 → 0 hata', () => {
    const input = makeInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.YTBSATIS, {
      docKdvAmount: 18, docKdvPercent: 18,
    });
    expect(validateYatirimTesvikKdvDocument(input)).toEqual([]);
  });

  it('EARSIVFATURA + YTBIADE → kapsam dışı (KDV=0 olsa bile)', () => {
    const input = makeInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.YTBIADE, {
      docKdvAmount: 0,
    });
    expect(validateYatirimTesvikKdvDocument(input)).toEqual([]);
  });

  it('EARSIVFATURA + SATIS (YTB dışı) → kapsam dışı', () => {
    const input = makeInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.SATIS, {
      docKdvAmount: 0,
    });
    expect(validateYatirimTesvikKdvDocument(input)).toEqual([]);
  });
});

// ============================================================
// validateYatirimTesvikKdvLine
// ============================================================

describe('validateYatirimTesvikKdvLine', () => {
  it('YATIRIMTESVIK + SATIS + satır KDV>0 → 0 hata', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      lines: [makeLine({ kdvAmount: 18, kdvPercent: 18 })],
    });
    expect(validateYatirimTesvikKdvLine(input)).toEqual([]);
  });

  it('YATIRIMTESVIK + SATIS + satır KDV=0 → YATIRIMTESVIK_KDV_REQUIRED_LINE', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      lines: [makeLine({ kdvAmount: 0, kdvPercent: 18 })],
    });
    const errors = validateYatirimTesvikKdvLine(input);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('YATIRIMTESVIK_KDV_REQUIRED_LINE');
    expect(errors[0].path).toBe('lines[0].taxTotal');
  });

  it('Harcama Tipi 03 + satır KDV=0 → YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED (+ LINE)', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      lines: [makeLine({ kdvAmount: 0, kdvPercent: 0, harcamaTipi: '03' })],
    });
    const codes = validateYatirimTesvikKdvLine(input).map(e => e.code);
    expect(codes).toContain('YATIRIMTESVIK_KDV_REQUIRED_LINE');
    expect(codes).toContain('YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED');
  });

  it('Harcama Tipi 04 + satır KDV=0 → YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      lines: [makeLine({ kdvAmount: 0, kdvPercent: 0, harcamaTipi: '04' })],
    });
    const codes = validateYatirimTesvikKdvLine(input).map(e => e.code);
    expect(codes).toContain('YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED');
  });

  it('Harcama Tipi 01 (03/04 dışı) + satır KDV=0 → sadece LINE hatası (Harcama Tipi ek kural yok)', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      lines: [makeLine({ kdvAmount: 0, kdvPercent: 0, harcamaTipi: '01' })],
    });
    const codes = validateYatirimTesvikKdvLine(input).map(e => e.code);
    expect(codes).toContain('YATIRIMTESVIK_KDV_REQUIRED_LINE');
    expect(codes).not.toContain('YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED');
  });

  it('Harcama Tipi 03 + satır KDV>0 (percent=0 ama amount>0) → sadece LINE hatası (Harcama 03 amount>0 yeter)', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      lines: [makeLine({ kdvAmount: 18, kdvPercent: 0, harcamaTipi: '03' })],
    });
    const codes = validateYatirimTesvikKdvLine(input).map(e => e.code);
    // LINE kuralı: percent>0 zorunlu → hata
    expect(codes).toContain('YATIRIMTESVIK_KDV_REQUIRED_LINE');
    // Harcama Tipi 03: amount>0 yeter → hata YOK
    expect(codes).not.toContain('YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED');
  });

  it('YATIRIMTESVIK + IADE → kapsam dışı, 0 hata', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.IADE, {
      lines: [makeLine({ kdvAmount: 0, kdvPercent: 0 })],
    });
    expect(validateYatirimTesvikKdvLine(input)).toEqual([]);
  });

  it('EARSIVFATURA + YTBSATIS + satır KDV=0 → YATIRIMTESVIK_KDV_REQUIRED_LINE', () => {
    const input = makeInput(InvoiceProfileId.EARSIVFATURA, InvoiceTypeCode.YTBSATIS, {
      lines: [makeLine({ kdvAmount: 0, kdvPercent: 18 })],
    });
    expect(validateYatirimTesvikKdvLine(input).map(e => e.code)).toContain(
      'YATIRIMTESVIK_KDV_REQUIRED_LINE',
    );
  });

  it('Birden fazla satır → her satır için ayrı hata', () => {
    const input = makeInput(InvoiceProfileId.YATIRIMTESVIK, InvoiceTypeCode.SATIS, {
      lines: [
        makeLine({ kdvAmount: 0, kdvPercent: 0 }),
        makeLine({ kdvAmount: 18, kdvPercent: 18 }), // OK
        makeLine({ kdvAmount: 0, kdvPercent: 18 }),
      ],
    });
    const errors = validateYatirimTesvikKdvLine(input);
    expect(errors.length).toBe(2);
    expect(errors[0].path).toBe('lines[0].taxTotal');
    expect(errors[1].path).toBe('lines[2].taxTotal');
  });
});
