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
      // B-15: LegalMonetaryTotal.LineExtensionAmount artık iskonto SONRASI (UBL-TR normatif)
      expect(result.monetary.lineExtensionAmount).toBe(850);
      expect(result.monetary.taxExclusiveAmount).toBe(850);
      expect(result.monetary.allowanceTotalAmount).toBe(150);
      expect(result.allowance).not.toBeNull();
      expect(result.allowance!.amount).toBe(150);
    });

    it('B-15: Σ line.lineExtensionAmount === monetary.lineExtensionAmount (çoğul iskontolu satır)', () => {
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Ürün A', quantity: 2, price: 500, kdvPercent: 20, allowancePercent: 10 }, // 1000 - 100 = 900
          { name: 'Ürün B', quantity: 1, price: 2000, kdvPercent: 20 },                      // 2000 (iskontosuz)
          { name: 'Ürün C', quantity: 5, price: 100, kdvPercent: 20, allowancePercent: 20 }, //  500 - 100 = 400
        ],
      }));

      const sumLineExtension = result.calculatedLines.reduce(
        (sum, l) => sum + l.lineExtensionAmount,
        0,
      );
      expect(result.monetary.lineExtensionAmount).toBe(sumLineExtension);
      expect(result.monetary.lineExtensionAmount).toBe(900 + 2000 + 400);
      expect(result.monetary.taxExclusiveAmount).toBe(result.monetary.lineExtensionAmount);
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

    it('B-41: kullanıcı type="TEVKIFATIADE" verirse tevkifat satırı TEVKIFATIADE override edebilmeli', () => {
      const result = calculateDocument(makeInput({
        type: 'TEVKIFATIADE',
        billingReference: { id: 'ABC2025000000001', issueDate: '2025-01-01' },
        lines: [
          { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, withholdingTaxCode: '602' },
        ],
      }));
      // Önceki davranış: typesArray.TEVKIFAT mutlak öncelikli → 'TEVKIFAT'
      // B-41 sonrası: input.type override önceliklidir → 'TEVKIFATIADE'
      expect(result.type).toBe('TEVKIFATIADE');
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

    it('B-76: buyerCustomer + ISTISNA satır → profil IHRACAT (M2 identity)', () => {
      const result = calculateDocument(makeInput({
        // Sprint 4'te Sprint 1 defensive `type: 'ISTISNA'` kaldırıldı.
        // B-76 sonrası IHRACAT yalnız ISTISNA context'inde türetilir;
        // ISTISNA satır (kdvPercent=0) otomatik 'ISTISNA' tipi doğurur.
        lines: [{ name: 'İhraç Ürün', quantity: 1, price: 1000, kdvPercent: 0 }],
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
      expect(result.type).toBe('ISTISNA');
    });

    it('B-76: buyerCustomer + SATIS satır → profil IHRACAT DEĞİL (tek başına zorlama yok)', () => {
      const result = calculateDocument(makeInput({
        lines: [{ name: 'Normal Ürün', quantity: 1, price: 1000, kdvPercent: 20 }],
        buyerCustomer: {
          name: 'Foreign Co',
          taxNumber: '1234567890',
          address: 'Street',
          city: 'London',
          district: 'Westminster',
          country: 'United Kingdom',
        },
      }));
      // SATIS context'te buyerCustomer tek başına IHRACAT zorlamaz; default profil geçerli
      expect(result.profile).not.toBe('IHRACAT');
    });

    it('IADE tipi için profil TEMELFATURA olmalı', () => {
      const result = calculateDocument(makeInput({ type: 'IADE' }));
      expect(result.profile).toBe('TEMELFATURA');
    });

    it('kullanıcı profil belirlediğinde override çalışmalı', () => {
      const result = calculateDocument(makeInput({ profile: 'KAMU' }));
      expect(result.profile).toBe('KAMU');
    });

    // B-T06: Özel profil coverage (Sprint 7.2) — SGK bir InvoiceTypeCode,
    // profile değil (PROFILE_TYPE_MATRIX satır 13 src/config/constants.ts).
    it('B-T06: YATIRIMTESVIK profili override çalışmalı', () => {
      const result = calculateDocument(makeInput({ profile: 'YATIRIMTESVIK' }));
      expect(result.profile).toBe('YATIRIMTESVIK');
      expect(result.type).toBe('SATIS');
    });

    it('B-T06: ILAC_TIBBICIHAZ profili override çalışmalı', () => {
      const result = calculateDocument(makeInput({ profile: 'ILAC_TIBBICIHAZ' }));
      expect(result.profile).toBe('ILAC_TIBBICIHAZ');
      expect(result.type).toBe('SATIS');
    });

    it('B-T06: IDIS profili override çalışmalı', () => {
      const result = calculateDocument(makeInput({ profile: 'IDIS' }));
      expect(result.profile).toBe('IDIS');
      expect(result.type).toBe('SATIS');
    });

    it('B-T06: HKS profili HKSSATIS tipi ile override çalışmalı', () => {
      const result = calculateDocument(makeInput({
        profile: 'HKS',
        type: 'HKSSATIS',
      }));
      expect(result.profile).toBe('HKS');
      expect(result.type).toBe('HKSSATIS');
    });

    it('B-T06: ENERJI profili SARJ tipi ile override çalışmalı', () => {
      const result = calculateDocument(makeInput({
        profile: 'ENERJI',
        type: 'SARJ',
      }));
      expect(result.profile).toBe('ENERJI');
      expect(result.type).toBe('SARJ');
    });

    it('B-T06: OZELFATURA profili ISTISNA zorunlu (M2)', () => {
      // OZELFATURA PROFILE_TYPE_MATRIX'te yalnız ISTISNA kabul eder (M2 kararı).
      const result = calculateDocument(makeInput({
        profile: 'OZELFATURA',
        type: 'ISTISNA',
        lines: [{ name: 'İhraç Ürün', quantity: 1, price: 1000, kdvPercent: 0 }],
      }));
      expect(result.profile).toBe('OZELFATURA');
      expect(result.type).toBe('ISTISNA');
    });

    // Paket H (Sprint 8a.9) — oportunistik coverage
    it('Paket H: SGK tipi + default profil TEMELFATURA', () => {
      // PROFILE_TYPE_MATRIX: SGK sadece TEMELFATURA'da izinli (satır 17, constants.ts).
      const result = calculateDocument(makeInput({ type: 'SGK' }));
      expect(result.type).toBe('SGK');
      expect(result.profile).toBe('TEMELFATURA');
    });

    it('Paket H: YOLCUBERABERFATURA profili ISTISNA tipi ile override (M2)', () => {
      const result = calculateDocument(makeInput({
        profile: 'YOLCUBERABERFATURA',
        type: 'ISTISNA',
        lines: [{ name: 'Yolcu Ürün', quantity: 1, price: 500, kdvPercent: 0 }],
      }));
      expect(result.profile).toBe('YOLCUBERABERFATURA');
      expect(result.type).toBe('ISTISNA');
    });
  });

  describe('istisna kodu eşleştirme', () => {
    it('TEVKIFAT tipi için kullanıcı kod vermediyse kdv null (B-NEW-11, Sprint 8c.1)', () => {
      // Önceki davranış: DEFAULT_EXEMPTIONS.satis = '351' otomatik atanıyordu.
      // Yeni davranış: kullanıcı input.kdvExemptionCode vermediyse null kalır.
      const result = calculateDocument(makeInput({
        lines: [
          { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 20, withholdingTaxCode: '606' },
        ],
      }));

      expect(result.taxExemptionReason.kdv).toBeNull();
    });

    it('TEVKIFAT tipi için kullanıcı kdvExemptionCode verirse kod XML\'e taşınır', () => {
      const result = calculateDocument(makeInput({
        kdvExemptionCode: '351',
        lines: [
          { name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 0, withholdingTaxCode: '606' },
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
