/**
 * Sprint 8d.3 — Mapper satır-level phantom KDV §2.1.4 stili testleri.
 *
 * YATIRIMTESVIK+ISTISNA ve EARSIV+YTBISTISNA satırlarında
 * InvoiceLine/cac:TaxTotal:
 *   - Dış TaxAmount=0 (§2.1.4 "Vazgeçilen KDV dip'e girmez")
 *   - Iç TaxSubtotal: TaxAmount=300, Percent=20, CalcSeqNum=-1, exemption code dolu
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

describe('simple-invoice-mapper — M12 satır-level phantom KDV (§2.1.4)', () => {
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

  it('InvoiceLine/TaxTotal/TaxAmount = 0 (phantom dip\'e girmez)', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    expect(inv.lines[0].taxTotal?.taxAmount).toBe(0);
  });

  it('InvoiceLine/TaxSubtotal/TaxAmount = 300 (gerçek phantom değer)', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.lines[0].taxTotal?.taxSubtotals?.find(
      ts => ts.taxTypeCode === '0015',
    );
    expect(kdv?.taxAmount).toBe(300);
  });

  it('InvoiceLine/TaxSubtotal/Percent = 20 (§2.1.4 stili — alıcının tabi olacağı oran)', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.lines[0].taxTotal?.taxSubtotals?.find(
      ts => ts.taxTypeCode === '0015',
    );
    expect(kdv?.percent).toBe(20);
  });

  it('InvoiceLine/TaxSubtotal/CalculationSequenceNumeric = -1', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.lines[0].taxTotal?.taxSubtotals?.find(
      ts => ts.taxTypeCode === '0015',
    );
    expect(kdv?.calculationSequenceNumeric).toBe(-1);
  });

  it('InvoiceLine/TaxSubtotal/TaxCategory — exemption code 308 dolu', () => {
    const inv = mapSimpleToInvoiceInput(yatirimTesvikIstisna);
    const kdv = inv.lines[0].taxTotal?.taxSubtotals?.find(
      ts => ts.taxTypeCode === '0015',
    );
    expect(kdv?.taxExemptionReasonCode).toBe('308');
    // Mevcut config (exemption-config.ts:62): 308 → "13/e Limanlara Bağlantı..."
    // Not: GİB YATIRIMTESVIK PDF §4'te 308 "13/d Teşvikli Yatırım Malları" olarak
    // tanımlanmış; config kod listesi v1.42 ile eşleşiyor. Phantom davranışı kod
    // tanımından bağımsız çalışır, exemption name config'den geldiği gibi kullanılır.
    expect(kdv?.taxExemptionReason).toBeTruthy();
    expect(kdv?.taxExemptionReason?.length).toBeGreaterThan(0);
  });

  it('EARSIV+YTBISTISNA / İnşaat (339) aynı §2.1.4 stili', () => {
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
    const kdv = inv.lines[0].taxTotal?.taxSubtotals?.find(
      ts => ts.taxTypeCode === '0015',
    );
    expect(kdv?.taxAmount).toBe(270);
    expect(kdv?.percent).toBe(18);
    expect(kdv?.calculationSequenceNumeric).toBe(-1);
    expect(kdv?.taxExemptionReasonCode).toBe('339');
    expect(inv.lines[0].taxTotal?.taxAmount).toBe(0);
  });

  it('Regression: YATIRIMTESVIK+SATIS satır-level CalcSeqNum undefined, TaxAmount dolu', () => {
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
    const kdv = inv.lines[0].taxTotal?.taxSubtotals?.find(
      ts => ts.taxTypeCode === '0015',
    );
    expect(kdv?.calculationSequenceNumeric).toBeUndefined();
    expect(kdv?.taxAmount).toBe(200);
    expect(inv.lines[0].taxTotal?.taxAmount).toBe(200);
  });

  it('Regression: TEMELFATURA+ISTISNA (kdvPercent=0) satır CalcSeqNum undefined', () => {
    const inv = mapSimpleToInvoiceInput({
      id: 'EXA2026000000904',
      uuid: 'dddddddd-eeee-ffff-0000-111111111111',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'ISTISNA',
      currencyCode: 'TRY',
      kdvExemptionCode: '350',
      sender,
      customer,
      lines: [
        {
          name: 'İstisna Hizmet',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 0,
          kdvExemptionCode: '350',
        },
      ],
    });
    const kdv = inv.lines[0].taxTotal?.taxSubtotals?.find(
      ts => ts.taxTypeCode === '0015',
    );
    expect(kdv?.calculationSequenceNumeric).toBeUndefined();
    expect(kdv?.taxAmount).toBe(0);
    // Normal ISTISNA (amount=0 + kod var): exemption code hâlâ yazılır
    expect(kdv?.taxExemptionReasonCode).toBe('350');
  });
});
