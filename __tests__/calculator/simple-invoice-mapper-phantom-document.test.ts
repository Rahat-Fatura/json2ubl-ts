/**
 * Sprint 8d.4 — Mapper belge-level phantom KDV §2.1.4 stili testleri.
 *
 * Invoice/cac:TaxTotal (belge-seviyesi):
 *   - Dış TaxAmount=0 (phantom KDV dip'e girmez)
 *   - Iç TaxSubtotal: TaxAmount=300, Percent=20, CalcSeqNum=-1, exemption code dolu
 *
 * LegalMonetaryTotal:
 *   - LineExtensionAmount = TaxExclusiveAmount = TaxInclusiveAmount = PayableAmount
 *     (hepsi 1500 — KDV dahil değil)
 */

import { describe, it, expect } from 'vitest';
import { mapSimpleToInvoiceInput } from '../../src/calculator/simple-invoice-mapper';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const sender = {
  taxNumber: '1234567890',
  name: 'Sınır Tanımaz Makine Tic. A.Ş.',
  taxOffice: 'Üsküdar',
  address: 'Barbaros Bulvarı No:123 Kat:5',
  district: 'Üsküdar',
  city: 'İstanbul',
  zipCode: '34664',
};

const customer = {
  taxNumber: '9876543210',
  name: 'Teşvikli Üretici Ltd. Şti.',
  taxOffice: 'Kadıköy',
  address: 'Organize Sanayi Bölgesi No:12',
  district: 'Tuzla',
  city: 'İstanbul',
  zipCode: '34956',
};

describe('simple-invoice-mapper — M12 belge-level phantom KDV (§2.1.4)', () => {
  const yatirimTesvikIstisna: SimpleInvoiceInput = {
    id: 'EXA2026000000901',
    uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    datetime: '2026-04-24T10:00:00',
    profile: 'YATIRIMTESVIK',
    type: 'ISTISNA',
    currencyCode: 'TRY',
    ytbNo: '123456',
    ytbIssueDate: '2025-01-01',
    kdvExemptionCode: '308',
    sender,
    customer,
    lines: [
      {
        name: 'Sanayi Tipi Kompresör',
        quantity: 15,
        price: 100,
        unitCode: 'Adet',
        kdvPercent: 20,
        kdvExemptionCode: '308',
        itemClassificationCode: '01',
        productTraceId: 'KOMP-2026-0001',
        serialId: 'SN-2026-MAKINA-000001',
        brand: 'Mark',
        model: 'M-100',
      },
    ],
  };

  it('Belge-level Invoice/TaxTotal/TaxAmount = 0 (parent — phantom hariç)', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const documentTaxTotal = inv.taxTotals?.[0];
    expect(documentTaxTotal?.taxAmount).toBe(0);
  });

  it('Belge-level TaxSubtotal TaxableAmount=1500', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.taxTotals?.[0]?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015');
    expect(kdv?.taxableAmount).toBe(1500);
  });

  it('Belge-level TaxSubtotal TaxAmount=300 (phantom değer — §2.1.4 iç subtotal)', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.taxTotals?.[0]?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015');
    expect(kdv?.taxAmount).toBe(300);
  });

  it('Belge-level TaxSubtotal Percent=20 (alıcının tabi olacağı oran)', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.taxTotals?.[0]?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015');
    expect(kdv?.percent).toBe(20);
  });

  it('Belge-level TaxSubtotal CalculationSequenceNumeric=-1', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.taxTotals?.[0]?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015');
    expect(kdv?.calculationSequenceNumeric).toBe(-1);
  });

  it('Belge-level TaxSubtotal exemption code 308 dolu', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.taxTotals?.[0]?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015');
    expect(kdv?.taxExemptionReasonCode).toBe('308');
    expect(kdv?.taxExemptionReason).toBeTruthy();
  });

  it('LegalMonetaryTotal phantom hariç: lineExt = taxExclusive = taxInclusive = payable = 1500', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    expect(inv.legalMonetaryTotal?.lineExtensionAmount).toBe(1500);
    expect(inv.legalMonetaryTotal?.taxExclusiveAmount).toBe(1500);
    expect(inv.legalMonetaryTotal?.taxInclusiveAmount).toBe(1500);
    expect(inv.legalMonetaryTotal?.payableAmount).toBe(1500);
  });

  it('EARSIV+YTBISTISNA İnşaat (339): belge-level §2.1.4', () => {
    const inv = mapSimpleToInvoiceInput({
      id: 'EXA2026000000902',
      uuid: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA',
      type: 'YTBISTISNA',
      currencyCode: 'TRY',
      ytbNo: '654321',
      ytbIssueDate: '2025-02-01',
      kdvExemptionCode: '339',
      sender,
      customer,
      eArchiveInfo: { sendType: 'ELEKTRONIK' },
      lines: [
        {
          name: 'İnşaat İşçiliği',
          quantity: 1,
          price: 1500,
          unitCode: 'Adet',
          kdvPercent: 18,
          kdvExemptionCode: '339',
          itemClassificationCode: '02',
        },
      ],
    });
    expect(inv.taxTotals?.[0]?.taxAmount).toBe(0);
    const kdv = inv.taxTotals?.[0]?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015');
    expect(kdv?.taxableAmount).toBe(1500);
    expect(kdv?.taxAmount).toBe(270);
    expect(kdv?.percent).toBe(18);
    expect(kdv?.calculationSequenceNumeric).toBe(-1);
    expect(kdv?.taxExemptionReasonCode).toBe('339');
    expect(inv.legalMonetaryTotal?.payableAmount).toBe(1500);
    expect(inv.legalMonetaryTotal?.taxInclusiveAmount).toBe(1500);
  });

  it('Regression: YATIRIMTESVIK+SATIS belge-level TaxTotal phantom yok', () => {
    const inv = mapSimpleToInvoiceInput({
      id: 'EXA2026000000903',
      uuid: 'cccccccc-dddd-eeee-ffff-000000000000',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK',
      type: 'SATIS',
      currencyCode: 'TRY',
      ytbNo: '123456',
      ytbIssueDate: '2025-01-01',
      sender,
      customer,
      lines: [
        {
          name: 'Makine',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
          itemClassificationCode: '01',
          productTraceId: 'PT-1',
          serialId: 'SN-1',
          brand: 'Mark',
          model: 'M-1',
        },
      ],
    });
    expect(inv.taxTotals?.[0]?.taxAmount).toBe(200);
    const kdv = inv.taxTotals?.[0]?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015');
    expect(kdv?.taxAmount).toBe(200);
    expect(kdv?.calculationSequenceNumeric).toBeUndefined();
    expect(inv.legalMonetaryTotal?.taxInclusiveAmount).toBe(1200);
    expect(inv.legalMonetaryTotal?.payableAmount).toBe(1200);
  });
});
