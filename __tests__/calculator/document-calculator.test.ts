import { describe, it, expect } from 'vitest';
import { calculateDocument } from '../../src/calculator/document-calculator';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const baseSender = {
  taxNumber: '1234567890',
  name: 'Test Firma AŞ',
  taxOffice: 'Test VD',
  address: 'Test Adres',
  district: 'Test İlçe',
  city: 'İstanbul',
};

const baseCustomer = {
  taxNumber: '9876543210',
  name: 'Müşteri Firma AŞ',
  taxOffice: 'Müşteri VD',
  address: 'Müşteri Adres',
  district: 'Müşteri İlçe',
  city: 'Ankara',
};

function makeInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    sender: baseSender,
    customer: baseCustomer,
    lines: [
      { name: 'Ürün A', quantity: 10, price: 100, kdvPercent: 20 },
    ],
    ...overrides,
  };
}

describe('document-calculator', () => {
  describe('temel hesaplama', () => {
    it('tek satırlı basit fatura doğru hesaplanmalı', () => {
      const result = calculateDocument(makeInput());

      expect(result.uuid).toBeDefined();
      expect(result.currencyCode).toBe('TRY');
      expect(result.type).toBe('SATIS');
      expect(result.profile).toBe('TICARIFATURA');

      // Monetary: 10 * 100 = 1000
      expect(result.monetary.lineExtensionAmount).toBe(1000);
      expect(result.monetary.taxExclusiveAmount).toBe(1000);
      // KDV: 1000 * 20% = 200
      expect(result.monetary.taxInclusiveAmount).toBe(1200);
      expect(result.monetary.payableAmount).toBe(1200);
      expect(result.monetary.allowanceTotalAmount).toBe(0);

      // Tax
      expect(result.taxes.taxTotal).toBe(200);
      expect(result.taxes.taxSubtotals).toHaveLength(1);
      expect(result.taxes.taxSubtotals[0].code).toBe('0015');

      // Tevkifat yok
      expect(result.withholding).toBeNull();
      expect(result.allowance).toBeNull();
    });

    it('çoklu satır toplamları doğru hesaplanmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Ürün A', quantity: 5, price: 200, kdvPercent: 20 },
          { name: 'Ürün B', quantity: 10, price: 50, kdvPercent: 10 },
        ],
      }));

      // A: 5*200=1000, KDV=200
      // B: 10*50=500, KDV=50
      expect(result.monetary.lineExtensionAmount).toBe(1500);
      expect(result.monetary.taxExclusiveAmount).toBe(1500);
      expect(result.monetary.taxInclusiveAmount).toBe(1750);
      expect(result.monetary.payableAmount).toBe(1750);

      // İki farklı KDV oranı
      expect(result.taxes.taxSubtotals).toHaveLength(2);
      expect(result.taxes.taxTotal).toBe(250);
    });

    it('aynı KDV oranlı satırlar gruplandırılmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Ürün A', quantity: 2, price: 100, kdvPercent: 18 },
          { name: 'Ürün B', quantity: 3, price: 100, kdvPercent: 18 },
        ],
      }));

      // Tek KDV subtotal (ikisi de %18)
      expect(result.taxes.taxSubtotals).toHaveLength(1);
      expect(result.taxes.taxSubtotals[0].percent).toBe(18);
      // (200 + 300) * 18% = 90
      expect(result.taxes.taxSubtotals[0].amount).toBe(90);
      expect(result.taxes.taxSubtotals[0].taxable).toBe(500);
    });
  });

  describe('iskonto', () => {
    it('iskontolu faturada allowance hesaplanmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Ürün', quantity: 10, price: 100, kdvPercent: 20, allowancePercent: 15 },
        ],
      }));

      // gross=1000, iskonto=150, lineExtension=850
      expect(result.monetary.lineExtensionAmount).toBe(1000);
      expect(result.monetary.taxExclusiveAmount).toBe(850);
      expect(result.monetary.allowanceTotalAmount).toBe(150);
      expect(result.allowance).not.toBeNull();
      expect(result.allowance!.amount).toBe(150);
    });
  });

  describe('tip tespiti', () => {
    it('tevkifatlı satır varsa tip TEVKIFAT olmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Hizmet', quantity: 1, price: 5000, kdvPercent: 20, withholdingTaxCode: '602' },
        ],
      }));

      expect(result.type).toBe('TEVKIFAT');
      expect(result.withholding).not.toBeNull();
      expect(result.withholding!.taxSubtotals[0].percent).toBe(90);
    });

    it('KDV %0 satır varsa tip ISTISNA olmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'İstisna Ürün', quantity: 1, price: 1000, kdvPercent: 0 },
        ],
      }));

      expect(result.type).toBe('ISTISNA');
    });

    it('kullanıcı IADE tipi belirlediğinde override çalışmalı', () => {
      const result = calculateDocument(makeInput({
        type: 'IADE',
        billingReference: { id: 'ABC2025000000001', issueDate: '2025-01-01' },
        lines: [
          { name: 'İade Ürün', quantity: 1, price: 500, kdvPercent: 20 },
        ],
      }));

      expect(result.type).toBe('IADE');
    });

    it('istisna kodu verildiğinde IHRACKAYITLI tespit edilmeli', () => {
      const result = calculateDocument(makeInput({
        kdvExemptionCode: '701',
        lines: [
          { name: 'İhraç Ürün', quantity: 1, price: 1000, kdvPercent: 0 },
        ],
      }));

      expect(result.type).toBe('IHRACKAYITLI');
    });

    it('SATIS + ISTISNA karışık satırlarda tip SATIS olmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Normal', quantity: 1, price: 100, kdvPercent: 20 },
          { name: 'İstisna', quantity: 1, price: 100, kdvPercent: 0 },
        ],
      }));

      expect(result.type).toBe('SATIS');
    });
  });

  describe('profil tespiti', () => {
    it('varsayılan profil TICARIFATURA olmalı', () => {
      const result = calculateDocument(makeInput());
      expect(result.profile).toBe('TICARIFATURA');
    });

    it('eArchiveInfo varsa profil EARSIVFATURA olmalı', () => {
      const result = calculateDocument(makeInput({
        eArchiveInfo: { sendType: 'ELEKTRONIK' },
      }));
      expect(result.profile).toBe('EARSIVFATURA');
    });

    it('onlineSale varsa profil EARSIVFATURA olmalı', () => {
      const result = calculateDocument(makeInput({
        onlineSale: {
          isOnlineSale: true,
          storeUrl: 'https://test.com',
          paymentMethod: 'KREDIKARTI',
          paymentDate: '2025-01-15',
        },
      }));
      expect(result.profile).toBe('EARSIVFATURA');
    });

    it('buyerCustomer varsa profil IHRACAT olmalı', () => {
      const result = calculateDocument(makeInput({
        buyerCustomer: {
          name: 'Foreign Co',
          taxNumber: '1234567890',
          address: 'Street',
          city: 'London',
          district: 'Westminster',
          country: 'United Kingdom',
        },
      }));
      expect(result.profile).toBe('IHRACAT');
    });

    it('IADE tipi için profil TEMELFATURA olmalı', () => {
      const result = calculateDocument(makeInput({ type: 'IADE' }));
      expect(result.profile).toBe('TEMELFATURA');
    });

    it('kullanıcı profil belirlediğinde override çalışmalı', () => {
      const result = calculateDocument(makeInput({ profile: 'KAMU' }));
      expect(result.profile).toBe('KAMU');
    });
  });

  describe('istisna kodu eşleştirme', () => {
    it('TEVKIFAT tipi için varsayılan istisna 351 olmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, withholdingTaxCode: '606' },
        ],
      }));

      expect(result.taxExemptionReason.kdv).toBe('351');
    });

    it('ISTISNA tipi için kullanıcı kodu kullanılmalı', () => {
      const result = calculateDocument(makeInput({
        kdvExemptionCode: '301',
        lines: [
          { name: 'İhracat Hizmet', quantity: 1, price: 1000, kdvPercent: 0 },
        ],
      }));

      expect(result.taxExemptionReason.kdv).toBe('301');
      expect(result.taxExemptionReason.kdvName).toContain('Mal İhracatı');
    });

    it('ISTISNA tipi için varsayılan istisna 350 olmalı', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'İstisna Ürün', quantity: 1, price: 1000, kdvPercent: 0 },
        ],
      }));

      expect(result.type).toBe('ISTISNA');
      expect(result.taxExemptionReason.kdv).toBe('350');
    });
  });

  describe('döviz', () => {
    it('dövizli fatura exchangeRate döndürmeli', () => {
      const result = calculateDocument(makeInput({
        currencyCode: 'USD',
        exchangeRate: 32.50,
      }));

      expect(result.currencyCode).toBe('USD');
      expect(result.exchangeRate).toBe(32.50);
    });

    it('TRY fatura exchangeRate null olmalı', () => {
      const result = calculateDocument(makeInput());
      expect(result.exchangeRate).toBeNull();
    });
  });

  describe('özel matrah', () => {
    it('OZELMATRAH ek subtotal eklenmeli', () => {
      const result = calculateDocument(makeInput({
        type: 'OZELMATRAH',
        kdvExemptionCode: '805',
        ozelMatrah: { percent: 20, taxable: 5000, amount: 1000 },
        lines: [
          { name: 'Altın Ziynet', quantity: 1, price: 10000, kdvPercent: 0 },
        ],
      }));

      expect(result.type).toBe('OZELMATRAH');
      // İlk subtotal özel matrah olmalı
      expect(result.taxes.taxSubtotals[0].taxable).toBe(5000);
      expect(result.taxes.taxSubtotals[0].amount).toBe(1000);
    });
  });

  describe('uuid', () => {
    it('uuid verilmezse otomatik üretilmeli', () => {
      const result = calculateDocument(makeInput());
      expect(result.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('uuid verilirse kullanılmalı', () => {
      const result = calculateDocument(makeInput({
        uuid: 'custom-uuid-1234',
      }));
      expect(result.uuid).toBe('custom-uuid-1234');
    });
  });
});
