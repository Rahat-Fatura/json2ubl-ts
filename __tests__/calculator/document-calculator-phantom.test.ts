/**
 * Document-calculator M12 Phantom KDV post-marking testleri — Sprint 8d.2.
 *
 * YATIRIMTESVIK+ISTISNA ve EARSIV+YTBISTISNA kombinasyonlarında satırların
 * phantomKdv flag'i ve KDV subtotal'ındaki calculationSequenceNumeric=-1
 * doğru mu? LegalMonetaryTotal (taxInclusive/payable) ve belge taxTotal
 * phantom KDV'yi hariç tutuyor mu?
 */

import { describe, it, expect } from 'vitest';
import { calculateDocument } from '../../src/calculator/document-calculator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const baseSender = {
  tckn_vkn: '1234567890',
  title: 'Test Satıcı A.Ş.',
  address: { countryName: 'Türkiye', city: 'İstanbul', citySubdivisionName: 'Kadıköy' },
};

const baseCustomer = {
  tckn_vkn: '11111111111',
  firstName: 'Ali',
  lastName: 'Veli',
  address: { countryName: 'Türkiye', city: 'İstanbul', citySubdivisionName: 'Üsküdar' },
};

describe('document-calculator — M12 Phantom KDV post-marking', () => {
  describe('YATIRIMTESVIK+ISTISNA (e-Fatura)', () => {
    const yatirimTesvikIstisna: SimpleInvoiceInput = {
      id: 'EXA2026000000901',
      uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      profile: 'YATIRIMTESVIK',
      type: 'ISTISNA',
      ytbNo: '123456',
      ytbIssueDate: '2025-01-01',
      kdvExemptionCode: '308',
      sender: baseSender,
      customer: baseCustomer,
      lines: [
        {
          name: 'Sanayi Tipi Kompresör',
          quantity: 15,
          price: 100,
          kdvPercent: 20,
          kdvExemptionCode: '308',
          itemClassificationCode: '01',
          productTraceId: 'KOMP-2026-0001',
          serialId: 'SN-2026-MAKINA-000001',
          brandName: 'Mark',
          modelName: 'M-100',
        },
      ],
    };

    it('tüm satırlar phantomKdv=true işaretlenir', () => {
      const calc = calculateDocument(yatirimTesvikIstisna);
      expect(calc.calculatedLines).toHaveLength(1);
      expect(calc.calculatedLines[0].phantomKdv).toBe(true);
    });

    it('KDV subtotal calculationSequenceNumeric=-1', () => {
      const calc = calculateDocument(yatirimTesvikIstisna);
      const kdv = calc.calculatedLines[0].taxes.taxSubtotals.find(ts => ts.code === '0015');
      expect(kdv?.calculationSequenceNumeric).toBe(-1);
    });

    it('LegalMonetaryTotal.taxInclusiveAmount phantom KDV hariç (=lineExtensionAmount)', () => {
      const calc = calculateDocument(yatirimTesvikIstisna);
      expect(calc.monetary.lineExtensionAmount).toBe(1500);
      expect(calc.monetary.taxInclusiveAmount).toBe(1500);
    });

    it('LegalMonetaryTotal.payableAmount phantom KDV hariç', () => {
      const calc = calculateDocument(yatirimTesvikIstisna);
      expect(calc.monetary.payableAmount).toBe(1500);
    });

    it('taxes.taxTotal (belge toplam KDV) phantom hariç = 0', () => {
      const calc = calculateDocument(yatirimTesvikIstisna);
      expect(calc.taxes.taxTotal).toBe(0);
    });

    it('belge-level taxSubtotals phantom değerleri taşır (§2.1.4 stili XML için)', () => {
      const calc = calculateDocument(yatirimTesvikIstisna);
      const kdv = calc.taxes.taxSubtotals.find(ts => ts.code === '0015');
      expect(kdv).toBeDefined();
      expect(kdv?.taxable).toBe(1500);
      expect(kdv?.amount).toBe(300);
      expect(kdv?.percent).toBe(20);
      expect(kdv?.calculationSequenceNumeric).toBe(-1);
    });

    it('type=ISTISNA, profile=YATIRIMTESVIK korunur', () => {
      const calc = calculateDocument(yatirimTesvikIstisna);
      expect(calc.type).toBe('ISTISNA');
      expect(calc.profile).toBe('YATIRIMTESVIK');
    });
  });

  describe('EARSIVFATURA+YTBISTISNA (e-Arşiv)', () => {
    const earsivYtbIstisna: SimpleInvoiceInput = {
      id: 'EXA2026000000902',
      uuid: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      profile: 'EARSIVFATURA',
      type: 'YTBISTISNA',
      ytbNo: '654321',
      ytbIssueDate: '2025-02-01',
      kdvExemptionCode: '339',
      sender: baseSender,
      customer: baseCustomer,
      eArchiveInfo: { sendType: 'ELEKTRONIK' },
      lines: [
        {
          name: 'İnşaat İşçiliği',
          quantity: 1,
          price: 1500,
          kdvPercent: 20,
          kdvExemptionCode: '339',
          itemClassificationCode: '02',
        },
      ],
    };

    it('tüm satırlar phantomKdv=true', () => {
      const calc = calculateDocument(earsivYtbIstisna);
      expect(calc.calculatedLines[0].phantomKdv).toBe(true);
    });

    it('KDV subtotal calculationSequenceNumeric=-1', () => {
      const calc = calculateDocument(earsivYtbIstisna);
      const kdv = calc.calculatedLines[0].taxes.taxSubtotals.find(ts => ts.code === '0015');
      expect(kdv?.calculationSequenceNumeric).toBe(-1);
    });

    it('taxInclusive = payable = lineExtension = 1500 (KDV hariç)', () => {
      const calc = calculateDocument(earsivYtbIstisna);
      expect(calc.monetary.lineExtensionAmount).toBe(1500);
      expect(calc.monetary.taxInclusiveAmount).toBe(1500);
      expect(calc.monetary.payableAmount).toBe(1500);
      expect(calc.taxes.taxTotal).toBe(0);
    });

    it('belge-level taxSubtotal KDV=300, Percent=20, CalcSeqNum=-1', () => {
      const calc = calculateDocument(earsivYtbIstisna);
      const kdv = calc.taxes.taxSubtotals.find(ts => ts.code === '0015');
      expect(kdv?.amount).toBe(300);
      expect(kdv?.percent).toBe(20);
      expect(kdv?.calculationSequenceNumeric).toBe(-1);
    });
  });

  describe('Regression: phantom olmayan YATIRIMTESVIK kombinasyonları', () => {
    it('YATIRIMTESVIK+SATIS → phantom yok, KDV dip toplama girer', () => {
      const calc = calculateDocument({
        id: 'EXA2026000000903',
        issueDate: '2026-04-24',
        issueTime: '10:00:00',
        profile: 'YATIRIMTESVIK',
        type: 'SATIS',
        ytbNo: '123456',
        ytbIssueDate: '2025-01-01',
        sender: baseSender,
        customer: baseCustomer,
        lines: [
          {
            name: 'Makine',
            quantity: 1,
            price: 1000,
            kdvPercent: 20,
            itemClassificationCode: '01',
            productTraceId: 'PT-1',
            serialId: 'SN-1',
            brandName: 'Mark',
            modelName: 'M-1',
          },
        ],
      });
      expect(calc.calculatedLines[0].phantomKdv).toBe(false);
      expect(calc.monetary.taxInclusiveAmount).toBe(1200);
      expect(calc.monetary.payableAmount).toBe(1200);
      expect(calc.taxes.taxTotal).toBe(200);
      const kdv = calc.calculatedLines[0].taxes.taxSubtotals.find(ts => ts.code === '0015');
      expect(kdv?.calculationSequenceNumeric).toBeUndefined();
    });

    it('YATIRIMTESVIK+IADE → phantom yok', () => {
      const calc = calculateDocument({
        id: 'EXA2026000000904',
        issueDate: '2026-04-24',
        issueTime: '10:00:00',
        profile: 'YATIRIMTESVIK',
        type: 'IADE',
        ytbNo: '123456',
        ytbIssueDate: '2025-01-01',
        sender: baseSender,
        customer: baseCustomer,
        billingReferenceId: 'EXA2026000000001',
        billingReferenceIssueDate: '2026-01-01',
        lines: [
          {
            name: 'İade Makine',
            quantity: 1,
            price: 500,
            kdvPercent: 20,
            itemClassificationCode: '01',
            productTraceId: 'PT-2',
            serialId: 'SN-2',
            brandName: 'Mark',
            modelName: 'M-2',
          },
        ],
      });
      expect(calc.calculatedLines[0].phantomKdv).toBe(false);
      expect(calc.taxes.taxTotal).toBe(100);
    });

    it('EARSIVFATURA+YTBSATIS → phantom yok', () => {
      const calc = calculateDocument({
        id: 'EXA2026000000905',
        issueDate: '2026-04-24',
        issueTime: '10:00:00',
        profile: 'EARSIVFATURA',
        type: 'YTBSATIS',
        ytbNo: '123456',
        ytbIssueDate: '2025-01-01',
        sender: baseSender,
        customer: baseCustomer,
        eArchiveInfo: { sendType: 'ELEKTRONIK' },
        lines: [
          {
            name: 'Makine',
            quantity: 1,
            price: 1000,
            kdvPercent: 20,
            itemClassificationCode: '01',
            productTraceId: 'PT-3',
            serialId: 'SN-3',
            brandName: 'Mark',
            modelName: 'M-3',
          },
        ],
      });
      expect(calc.calculatedLines[0].phantomKdv).toBe(false);
      expect(calc.taxes.taxTotal).toBe(200);
    });

    it('TEMELFATURA+ISTISNA (kdvPercent=0, normal istisna) → phantom yok', () => {
      const calc = calculateDocument({
        id: 'EXA2026000000906',
        issueDate: '2026-04-24',
        issueTime: '10:00:00',
        profile: 'TEMELFATURA',
        type: 'ISTISNA',
        kdvExemptionCode: '350',
        sender: baseSender,
        customer: baseCustomer,
        lines: [
          {
            name: 'İstisna Hizmet',
            quantity: 1,
            price: 1000,
            kdvPercent: 0,
          },
        ],
      });
      expect(calc.calculatedLines[0].phantomKdv).toBe(false);
      expect(calc.monetary.taxInclusiveAmount).toBe(1000);
      expect(calc.taxes.taxTotal).toBe(0);
      const kdv = calc.calculatedLines[0].taxes.taxSubtotals.find(ts => ts.code === '0015');
      expect(kdv?.calculationSequenceNumeric).toBeUndefined();
    });
  });
});
