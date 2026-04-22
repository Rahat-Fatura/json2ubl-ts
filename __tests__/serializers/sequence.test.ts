import { describe, it, expect } from 'vitest';
import { serializeTaxSubtotal } from '../../src/serializers/tax-serializer';
import { serializeInvoiceLine } from '../../src/serializers/line-serializer';
import { serializeAllowanceCharge } from '../../src/serializers/common-serializer';
import { serializeParty } from '../../src/serializers/party-serializer';
import { serializeBillingReference, serializeOrderReference } from '../../src/serializers/reference-serializer';
import { serializePaymentMeans } from '../../src/serializers/monetary-serializer';
import { serializeDespatch } from '../../src/serializers/despatch-serializer';
import { InvoiceBuilder } from '../../src/builders/invoice-builder';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import type { TaxSubtotalInput, AllowanceChargeInput, PartyInput, PaymentMeansInput } from '../../src/types/common';
import type { InvoiceLineInput, InvoiceInput } from '../../src/types/invoice-input';
import type { DespatchInput } from '../../src/types/despatch-input';
import { MissingRequiredFieldError } from '../../src/utils/errors';

/**
 * Sprint 3 XSD sequence assertion testleri.
 * Her fix için bir test. XML indexOf ile element sırasını doğrular.
 */

// ─── B-09: TaxExemptionReasonCode TaxCategory altında ────────────────────
describe('B-09 — TaxExemptionReasonCode/Reason TaxCategory altında', () => {
  it('TaxExemptionReasonCode, cac:TaxCategory içinde emit edilir (TaxSubtotal altında DEĞİL)', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 0,
      percent: 0,
      taxTypeCode: '0015',
      taxExemptionReasonCode: '301',
      taxExemptionReason: 'İhracat',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    const catStart = xml.indexOf('<cac:TaxCategory>');
    const catEnd = xml.indexOf('</cac:TaxCategory>');
    const reasonCodeIdx = xml.indexOf('<cbc:TaxExemptionReasonCode>');

    expect(catStart).toBeGreaterThan(-1);
    expect(reasonCodeIdx).toBeGreaterThan(catStart);
    expect(reasonCodeIdx).toBeLessThan(catEnd);
  });
});

// ─── B-10: InvoiceLine Delivery AllowanceCharge ÖNCESİ ───────────────────
describe('B-10 — InvoiceLine.Delivery, AllowanceCharge öncesi', () => {
  it('Delivery, AllowanceCharge ÖNCE yazılır', () => {
    const line: InvoiceLineInput = {
      id: '1',
      invoicedQuantity: 10,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: { taxAmount: 18, taxSubtotals: [{ taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015' }] },
      item: { name: 'Test' },
      price: { priceAmount: 10 },
      allowanceCharges: [{ chargeIndicator: false, amount: 5, reason: 'İskonto' }],
      delivery: { deliveryAddress: { cityName: 'Ankara', citySubdivisionName: 'Çankaya' } },
    };
    const xml = serializeInvoiceLine(line, 'TRY');
    const deliveryIdx = xml.indexOf('<cac:Delivery>');
    const allowanceIdx = xml.indexOf('<cac:AllowanceCharge>');
    expect(deliveryIdx).toBeGreaterThan(-1);
    expect(allowanceIdx).toBeGreaterThan(-1);
    expect(deliveryIdx).toBeLessThan(allowanceIdx);
  });
});

// ─── B-11: Invoice ExchangeRate AllowanceCharge SONRASI ──────────────────
describe('B-11 — Invoice kökünde ExchangeRate, AllowanceCharge sonrası', () => {
  it('PricingExchangeRate, AllowanceCharge SONRA yazılır', () => {
    const input: InvoiceInput = {
      id: 'ABC2024000000001',
      uuid: '12345678-1234-1234-1234-123456789012',
      profileId: 'TICARIFATURA' as InvoiceInput['profileId'],
      invoiceTypeCode: 'SATIS' as InvoiceInput['invoiceTypeCode'],
      issueDate: '2024-01-15',
      currencyCode: 'USD',
      exchangeRate: { sourceCurrencyCode: 'USD', targetCurrencyCode: 'TRY', calculationRate: 30 },
      supplier: { vknTckn: '1234567890', taxIdType: 'VKN', name: 'Test', cityName: 'Ankara', citySubdivisionName: 'Çankaya' },
      customer: { vknTckn: '0987654321', taxIdType: 'VKN', name: 'Müşteri', cityName: 'İstanbul', citySubdivisionName: 'Kadıköy' },
      taxTotals: [{ taxAmount: 18, taxSubtotals: [{ taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015' }] }],
      legalMonetaryTotal: { lineExtensionAmount: 100, taxExclusiveAmount: 100, taxInclusiveAmount: 118, payableAmount: 118 },
      lines: [{
        id: '1', invoicedQuantity: 1, unitCode: 'C62', lineExtensionAmount: 100,
        taxTotal: { taxAmount: 18, taxSubtotals: [{ taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015' }] },
        item: { name: 'Test' }, price: { priceAmount: 100 },
      }],
      allowanceCharges: [{ chargeIndicator: false, amount: 10, reason: 'İskonto' }],
    };
    const xml = new InvoiceBuilder({ validationLevel: 'none' }).build(input);
    // Root seviyesi AllowanceCharge (PayableAmount'tan önce, PricingExchangeRate'ten önce beklenir)
    const acIdx = xml.indexOf('<cac:AllowanceCharge>');
    const erIdx = xml.indexOf('<cac:PricingExchangeRate>');
    expect(acIdx).toBeGreaterThan(-1);
    expect(erIdx).toBeGreaterThan(-1);
    expect(acIdx).toBeLessThan(erIdx);
  });
});

// ─── B-12: AllowanceCharge Reason ChargeIndicator hemen sonrası ──────────
describe('B-12 — AllowanceCharge.Reason, ChargeIndicator hemen sonrası', () => {
  it('Reason, ChargeIndicator sonrasında, Amount öncesindedir', () => {
    const ac: AllowanceChargeInput = {
      chargeIndicator: false,
      amount: 10,
      reason: 'İskonto',
      multiplierFactorNumeric: 5,
    };
    const xml = serializeAllowanceCharge(ac, 'TRY');
    const chargeIdx = xml.indexOf('<cbc:ChargeIndicator>');
    const reasonIdx = xml.indexOf('<cbc:AllowanceChargeReason>');
    const amountIdx = xml.indexOf('<cbc:Amount');

    expect(chargeIdx).toBeGreaterThan(-1);
    expect(reasonIdx).toBeGreaterThan(chargeIdx);
    expect(reasonIdx).toBeLessThan(amountIdx);
  });
});

// ─── B-13: Item Description Name öncesi ──────────────────────────────────
describe('B-13 — Item.Description, Name öncesi', () => {
  it('Description, Name ÖNCE yazılır', () => {
    const line: InvoiceLineInput = {
      id: '1',
      invoicedQuantity: 1,
      unitCode: 'C62',
      lineExtensionAmount: 100,
      taxTotal: { taxAmount: 18, taxSubtotals: [{ taxableAmount: 100, taxAmount: 18, percent: 18, taxTypeCode: '0015' }] },
      item: { name: 'Ürün', description: 'Açıklama' },
      price: { priceAmount: 100 },
    };
    const xml = serializeInvoiceLine(line, 'TRY');
    const descIdx = xml.indexOf('<cbc:Description>');
    const nameIdx = xml.indexOf('<cbc:Name>');
    expect(descIdx).toBeGreaterThan(-1);
    expect(nameIdx).toBeGreaterThan(-1);
    expect(descIdx).toBeLessThan(nameIdx);
  });
});

// ─── B-14: Despatch Delivery DeliveryAddress→CarrierParty→Despatch ───────
describe('B-14 — Despatch Delivery sequence (DeliveryAddress → CarrierParty → Despatch)', () => {
  it('DeliveryAddress, CarrierParty, Despatch sırasıyla yazılır', () => {
    const input: DespatchInput = {
      id: 'ABC2024000000001',
      uuid: '12345678-1234-1234-1234-123456789012',
      profileId: DespatchProfileId.TEMELIRSALIYE,
      despatchTypeCode: DespatchTypeCode.SEVK,
      issueDate: '2024-01-15',
      issueTime: '10:30:00',
      supplier: { vknTckn: '1234567890', taxIdType: 'VKN', name: 'G', cityName: 'A', citySubdivisionName: 'C' },
      customer: { vknTckn: '0987654321', taxIdType: 'VKN', name: 'A', cityName: 'I', citySubdivisionName: 'K' },
      shipment: {
        actualDespatchDate: '2024-01-16',
        actualDespatchTime: '08:00:00',
        deliveryAddress: { cityName: 'Ankara', citySubdivisionName: 'Çankaya' },
        carrierParty: { vknTckn: '1111111111', taxIdType: 'VKN', name: 'Taşıyıcı' },
      },
      lines: [{ id: '1', deliveredQuantity: 1, unitCode: 'C62', item: { name: 'Ürün' } }],
    };
    const xml = serializeDespatch(input);
    const daIdx = xml.indexOf('<cac:DeliveryAddress>');
    const cpIdx = xml.indexOf('<cac:CarrierParty>');
    const dIdx = xml.indexOf('<cac:Despatch>');
    expect(daIdx).toBeGreaterThan(-1);
    expect(cpIdx).toBeGreaterThan(-1);
    expect(dIdx).toBeGreaterThan(-1);
    expect(daIdx).toBeLessThan(cpIdx);
    expect(cpIdx).toBeLessThan(dIdx);
  });
});

// ─── B-20: Person/DriverPerson sequence ──────────────────────────────────
describe('B-20 — Person sequence: FirstName → FamilyName → (Title) → MiddleName → NationalityID', () => {
  it('TCKN party: MiddleName FamilyName SONRASINDA (FirstName ve Title arasında değil)', () => {
    const party: PartyInput = {
      vknTckn: '12345678901',
      taxIdType: 'TCKN',
      firstName: 'Ali',
      middleName: 'Veli',
      familyName: 'Yılmaz',
      nationalityId: 'TR',
      cityName: 'Ankara',
      citySubdivisionName: 'Çankaya',
    };
    const xml = serializeParty(party);
    const firstIdx = xml.indexOf('<cbc:FirstName>');
    const familyIdx = xml.indexOf('<cbc:FamilyName>');
    const middleIdx = xml.indexOf('<cbc:MiddleName>');
    const natIdx = xml.indexOf('<cbc:NationalityID>');

    expect(firstIdx).toBeLessThan(familyIdx);
    expect(familyIdx).toBeLessThan(middleIdx);
    expect(middleIdx).toBeLessThan(natIdx);
  });
});

// ─── B-32: DocumentReference IssueDate required ──────────────────────────
describe('B-32 — DocumentReference.IssueDate required', () => {
  it('BillingReference issueDate dolu → XML üretir', () => {
    const xml = serializeBillingReference({
      invoiceDocumentReference: { id: 'ABC2023000000001', issueDate: '2023-12-01', documentTypeCode: 'IADE' },
    });
    expect(xml).toContain('<cbc:IssueDate>2023-12-01</cbc:IssueDate>');
  });

  it('BillingReference issueDate boş → MissingRequiredFieldError', () => {
    expect(() =>
      serializeBillingReference({
        invoiceDocumentReference: { id: 'ABC2023000000001', issueDate: '' as string, documentTypeCode: 'IADE' },
      }),
    ).toThrow(MissingRequiredFieldError);
  });
});

// ─── B-33/B-70: OrderReference + PaymentMeans required ───────────────────
describe('B-33 / B-70 — OrderReference.IssueDate + PaymentMeans.PaymentMeansCode required', () => {
  it('OrderReference issueDate boş → hata', () => {
    expect(() => serializeOrderReference({ id: 'ORD-1', issueDate: '' as string })).toThrow(MissingRequiredFieldError);
  });

  it('PaymentMeans paymentMeansCode boş → hata', () => {
    const pm = { paymentMeansCode: '' as string } as PaymentMeansInput;
    expect(() => serializePaymentMeans(pm)).toThrow(MissingRequiredFieldError);
  });

  it('PaymentMeans paymentMeansCode dolu → XML üretir', () => {
    const pm: PaymentMeansInput = { paymentMeansCode: '42' };
    const xml = serializePaymentMeans(pm);
    expect(xml).toContain('<cbc:PaymentMeansCode>42</cbc:PaymentMeansCode>');
  });
});
