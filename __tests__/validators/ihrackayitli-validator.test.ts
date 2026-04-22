import { describe, it, expect } from 'vitest';
import { validateIhrackayitli702 } from '../../src/validators/ihrackayitli-validator';
import { serializeLineDelivery } from '../../src/serializers/delivery-serializer';
import { InvoiceTypeCode, InvoiceProfileId } from '../../src/types/enums';
import type { InvoiceInput, InvoiceLineInput } from '../../src/types/invoice-input';
import type { LineDeliveryInput } from '../../src/types/common';

/**
 * Sprint 5.3 (B-07 + B-14) — IHRACKAYITLI + 702 senaryosu validator ve serializer testleri.
 *
 * Schematron referans:
 * - Rule satır 322: GTİP (12) + ALICIDIBSATIRKOD (11) zorunlu
 * - Rule satır 451: schemeID whitelist SATICIDIBSATIRKOD | ALICIDIBSATIRKOD
 */

// ============================================================
// Fixture helpers
// ============================================================

function makeLineDelivery(opts: {
  gtip?: string;
  alicidibsatirkod?: string;
  alicidibLength?: number;
  schemeId?: string;
  withCustomsDecl?: boolean;
}): LineDeliveryInput {
  return {
    shipment: {
      goodsItems: opts.gtip ? [{ requiredCustomsId: opts.gtip }] : [],
      transportHandlingUnits: opts.withCustomsDecl !== false
        ? [{
            customsDeclarations: [{
              id: 'DECL-001',
              issuerParty: {
                partyIdentifications: opts.alicidibsatirkod
                  ? [{
                      id: opts.alicidibsatirkod,
                      schemeID: opts.schemeId ?? 'ALICIDIBSATIRKOD',
                    }]
                  : [],
              },
            }],
          }]
        : [],
    },
  };
}

function makeLine(overrides?: Partial<InvoiceLineInput> & { exemptionCode?: string; delivery?: LineDeliveryInput }): InvoiceLineInput {
  const { exemptionCode, delivery, ...rest } = overrides ?? {};
  return {
    id: '1',
    invoicedQuantity: 1,
    unitCode: 'C62',
    lineExtensionAmount: 100,
    taxTotal: {
      taxAmount: 0,
      taxSubtotals: [{
        taxableAmount: 100,
        taxAmount: 0,
        taxTypeCode: '0015',
        taxExemptionReasonCode: exemptionCode,
      }],
    },
    item: { name: 'Test' } as any,
    price: { priceAmount: 100 } as any,
    delivery,
    ...rest,
  };
}

function makeInput(type: InvoiceTypeCode, lines: InvoiceLineInput[]): InvoiceInput {
  return {
    id: 'ABC202500000001',
    uuid: '11111111-2222-3333-4444-555555555555',
    profileId: InvoiceProfileId.TEMELFATURA,
    invoiceTypeCode: type,
    issueDate: '2026-01-01',
    currencyCode: 'TRY',
    supplier: {} as any,
    customer: {} as any,
    taxTotals: [],
    legalMonetaryTotal: {} as any,
    lines,
  };
}

// ============================================================
// validateIhrackayitli702 — B-07
// ============================================================

describe('validateIhrackayitli702 — kabul durumları', () => {
  it('IHRACKAYITLI + 702 + GTİP(12) + ALICIDIBSATIRKOD(11) → 0 hata', () => {
    const line = makeLine({
      exemptionCode: '702',
      delivery: makeLineDelivery({
        gtip: '123456789012',
        alicidibsatirkod: '12345678901',
      }),
    });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    expect(errors).toEqual([]);
  });

  it('IHRACKAYITLI + 701 → validator trigger olmaz (702 değil, 0 hata)', () => {
    const line = makeLine({ exemptionCode: '701' });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    expect(errors).toEqual([]);
  });

  it('SATIS + 702 → validator trigger olmaz (IHRACKAYITLI değil, 0 hata)', () => {
    const line = makeLine({ exemptionCode: '702' });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.SATIS, [line]));
    expect(errors).toEqual([]);
  });
});

describe('validateIhrackayitli702 — GTİP hataları', () => {
  it('IHRACKAYITLI + 702 + GTİP yok → IHRACKAYITLI_702_REQUIRES_GTIP', () => {
    const line = makeLine({
      exemptionCode: '702',
      delivery: makeLineDelivery({ alicidibsatirkod: '12345678901' }),
    });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    const codes = errors.map(e => e.code);
    expect(codes).toContain('IHRACKAYITLI_702_REQUIRES_GTIP');
  });

  it('IHRACKAYITLI + 702 + GTİP 11 hane → IHRACKAYITLI_702_REQUIRES_GTIP (yanlış uzunluk)', () => {
    const line = makeLine({
      exemptionCode: '702',
      delivery: makeLineDelivery({ gtip: '12345678901', alicidibsatirkod: '12345678901' }),
    });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    const codes = errors.map(e => e.code);
    expect(codes).toContain('IHRACKAYITLI_702_REQUIRES_GTIP');
  });
});

describe('validateIhrackayitli702 — ALICIDIBSATIRKOD hataları', () => {
  it('IHRACKAYITLI + 702 + ALICIDIBSATIRKOD yok → IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD', () => {
    const line = makeLine({
      exemptionCode: '702',
      delivery: makeLineDelivery({ gtip: '123456789012' }),
    });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    const codes = errors.map(e => e.code);
    expect(codes).toContain('IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD');
  });

  it('IHRACKAYITLI + 702 + ALICIDIBSATIRKOD 10 hane → IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD', () => {
    const line = makeLine({
      exemptionCode: '702',
      delivery: makeLineDelivery({
        gtip: '123456789012',
        alicidibsatirkod: '1234567890',
      }),
    });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    const codes = errors.map(e => e.code);
    expect(codes).toContain('IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD');
  });
});

describe('validateIhrackayitli702 — schemeID whitelist (Schematron satır 451)', () => {
  it('schemeID=XXX → IHRACKAYITLI_INVALID_SCHEME_ID', () => {
    const line = makeLine({
      exemptionCode: '702',
      delivery: makeLineDelivery({
        gtip: '123456789012',
        alicidibsatirkod: '12345678901',
        schemeId: 'XXX',
      }),
    });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    const codes = errors.map(e => e.code);
    expect(codes).toContain('IHRACKAYITLI_INVALID_SCHEME_ID');
  });

  it('schemeID=SATICIDIBSATIRKOD → whitelist (schemeID hatası yok)', () => {
    const line = makeLine({
      exemptionCode: '702',
      delivery: makeLineDelivery({
        gtip: '123456789012',
        alicidibsatirkod: '12345678901',
        schemeId: 'SATICIDIBSATIRKOD',
      }),
    });
    const errors = validateIhrackayitli702(makeInput(InvoiceTypeCode.IHRACKAYITLI, [line]));
    const schemeErrors = errors.filter(e => e.code === 'IHRACKAYITLI_INVALID_SCHEME_ID');
    expect(schemeErrors).toEqual([]);
    // Not: ALICIDIBSATIRKOD 11 hane eksik olduğu için IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD olur
    expect(errors.some(e => e.code === 'IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD')).toBe(true);
  });
});

// ============================================================
// Serializer smoke — B-14 CustomsDeclaration XML emit
// ============================================================

describe('serializeLineDelivery — CustomsDeclaration emit', () => {
  it('CustomsDeclaration XML doğru iç yapıda emit edilir (XSD sequence)', () => {
    const delivery: LineDeliveryInput = {
      shipment: {
        goodsItems: [{ requiredCustomsId: '123456789012' }],
        transportHandlingUnits: [{
          customsDeclarations: [{
            id: 'GCB-2026-001',
            issuerParty: {
              partyIdentifications: [{
                id: '12345678901',
                schemeID: 'ALICIDIBSATIRKOD',
              }],
            },
          }],
        }],
      },
    };
    const xml = serializeLineDelivery(delivery);
    expect(xml).toContain('<cac:CustomsDeclaration>');
    expect(xml).toContain('<cbc:ID>GCB-2026-001</cbc:ID>');
    expect(xml).toContain('<cac:IssuerParty>');
    expect(xml).toContain('<cac:PartyIdentification>');
    expect(xml).toContain('schemeID="ALICIDIBSATIRKOD"');
    expect(xml).toContain('>12345678901<');
    // RequiredCustomsID de emit edilmeli (mevcut davranış korunur)
    expect(xml).toContain('<cbc:RequiredCustomsID>123456789012</cbc:RequiredCustomsID>');
  });

  it('customsDeclarations verilmezse TransportHandlingUnit içinde CustomsDeclaration yok', () => {
    const delivery: LineDeliveryInput = {
      shipment: {
        transportHandlingUnits: [{
          actualPackages: [{ packagingTypeCode: 'PK', quantity: 1 }],
        }],
      },
    };
    const xml = serializeLineDelivery(delivery);
    expect(xml).toContain('<cac:ActualPackage>');
    expect(xml).not.toContain('<cac:CustomsDeclaration>');
  });
});
