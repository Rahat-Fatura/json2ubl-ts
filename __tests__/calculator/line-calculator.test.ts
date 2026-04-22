import { describe, it, expect } from 'vitest';
import { calculateLine, calculateAllLines } from '../../src/calculator/line-calculator';
import type { SimpleLineInput } from '../../src/calculator/simple-types';

describe('line-calculator', () => {
  const baseLine: SimpleLineInput = {
    name: 'Test Ürün',
    quantity: 10,
    price: 100,
    kdvPercent: 20,
  };

  describe('calculateLine — temel hesaplama', () => {
    it('basit satır hesaplaması doğru çalışmalı', () => {
      const result = calculateLine(baseLine, 0, 'TRY');

      expect(result.id).toBe(1);
      expect(result.unitCode).toBe('C62');
      expect(result.currencyCode).toBe('TRY');
      expect(result.type).toBe('SATIS');
      expect(result.lineExtensionAmount).toBe(1000);
      // KDV: 1000 * 20% = 200
      expect(result.taxes.taxSubtotals).toHaveLength(1);
      expect(result.taxes.taxSubtotals[0].code).toBe('0015');
      expect(result.taxes.taxSubtotals[0].amount).toBe(200);
      expect(result.taxes.taxTotal).toBe(200);
      expect(result.taxInclusiveForMonetary).toBe(1200);
      expect(result.payableAmountForMonetary).toBe(1200);
    });

    it('iskonto hesaplaması doğru çalışmalı', () => {
      const line: SimpleLineInput = { ...baseLine, allowancePercent: 10 };
      const result = calculateLine(line, 0, 'TRY');

      // 10 * 100 = 1000, iskonto: 1000 * 10% = 100
      expect(result.allowanceObject.percent).toBe(10);
      expect(result.allowanceObject.base).toBe(1000);
      expect(result.allowanceObject.amount).toBe(100);
      expect(result.lineExtensionAmount).toBe(900);
      // KDV: 900 * 20% = 180
      expect(result.taxes.taxSubtotals[0].amount).toBe(180);
      expect(result.taxInclusiveForMonetary).toBe(1080);
      expect(result.payableAmountForMonetary).toBe(1080);
    });

    it('KDV %0 satır tipi ISTISNA olmalı', () => {
      const line: SimpleLineInput = { ...baseLine, kdvPercent: 0 };
      const result = calculateLine(line, 0, 'TRY');

      expect(result.type).toBe('ISTISNA');
      expect(result.taxes.taxSubtotals[0].amount).toBe(0);
    });

    it('birim kodu Türkçe isimle çözümlenmeli', () => {
      const line: SimpleLineInput = { ...baseLine, unitCode: 'Kilogram' };
      const result = calculateLine(line, 0, 'TRY');
      expect(result.unitCode).toBe('KGM');
    });

    it('birim kodu UBL koduyla doğrudan geçmeli', () => {
      const line: SimpleLineInput = { ...baseLine, unitCode: 'LTR' };
      const result = calculateLine(line, 0, 'TRY');
      expect(result.unitCode).toBe('LTR');
    });

    it('varsayılan birim kodu Adet (C62) olmalı', () => {
      const result = calculateLine(baseLine, 0, 'TRY');
      expect(result.unitCode).toBe('C62');
    });
  });

  describe('calculateLine — ÖTV matrah artırıcı', () => {
    it('ÖTV 1. Liste (0071) KDV matrahını arttırmalı', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        taxes: [{ code: '0071', percent: 25 }],
      };
      const result = calculateLine(line, 0, 'TRY');

      // lineExtensionAmount = 1000
      // ÖTV = 1000 * 25% = 250
      // KDV matrahı = 1000 + 250 = 1250 (baseStat=true, baseCalculate=true)
      // KDV = 1250 * 20% = 250
      const otvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0071');
      const kdvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0015');

      expect(otvSubtotal).toBeDefined();
      expect(otvSubtotal!.amount).toBe(250);
      expect(otvSubtotal!.taxable).toBe(1000);

      expect(kdvSubtotal).toBeDefined();
      expect(kdvSubtotal!.taxable).toBe(1250);
      expect(kdvSubtotal!.amount).toBe(250);

      // taxTotal = 250 (ÖTV) + 250 (KDV) = 500
      expect(result.taxes.taxTotal).toBe(500);
      // taxInclusiveForMonetary = 1000 + 250 + 250 = 1500
      expect(result.taxInclusiveForMonetary).toBe(1500);
    });

    it('ÖTV 4. Liste (0074) KDV matrahını arttırmalı', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        taxes: [{ code: '0074', percent: 50 }],
      };
      const result = calculateLine(line, 0, 'TRY');

      // ÖTV = 1000 * 50% = 500
      // KDV matrahı = 1000 + 500 = 1500
      // KDV = 1500 * 20% = 300
      const kdvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0015');
      expect(kdvSubtotal!.taxable).toBe(1500);
      expect(kdvSubtotal!.amount).toBe(300);
    });
  });

  describe('calculateLine — matrah azaltıcı vergi', () => {
    it('Damga Vergisi (1047) KDV matrahından düşmeli', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        taxes: [{ code: '1047', percent: 5 }],
      };
      const result = calculateLine(line, 0, 'TRY');

      // Damga V. = 1000 * 5% = 50
      // KDV matrahı = 1000 - 50 = 950 (baseStat=true, baseCalculate=false)
      // KDV = 950 * 20% = 190
      const kdvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0015');
      expect(kdvSubtotal!.taxable).toBe(950);
      expect(kdvSubtotal!.amount).toBe(190);
    });

    it('Konaklama Vergisi (0059) KDV matrahından düşmeli', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        taxes: [{ code: '0059', percent: 2 }],
      };
      const result = calculateLine(line, 0, 'TRY');

      // Konaklama V. = 1000 * 2% = 20
      // KDV matrahı = 1000 - 20 = 980
      const kdvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0015');
      expect(kdvSubtotal!.taxable).toBe(980);
    });
  });

  describe('calculateLine — negatif etkili vergi', () => {
    it('Gelir Vergisi Stopajı (0003) negatif taxForCalculate olmalı', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        taxes: [{ code: '0003', percent: 10 }],
      };
      const result = calculateLine(line, 0, 'TRY');

      // GV Stopajı = 1000 * 10% = 100, taxForCalculate = -100
      const gvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0003');
      expect(gvSubtotal!.amount).toBe(100);
      expect(gvSubtotal!.taxForCalculate).toBe(-100);

      // KDV matrahı etkilenmemeli (baseStat=false)
      const kdvSubtotal = result.taxes.taxSubtotals.find(t => t.code === '0015');
      expect(kdvSubtotal!.taxable).toBe(1000);

      // taxInclusiveForMonetary = 1000 + (-100) + 200 = 1100
      expect(result.taxInclusiveForMonetary).toBe(1100);
    });
  });

  describe('calculateLine — tevkifat', () => {
    it('tevkifat hesaplaması doğru çalışmalı', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '602',
      };
      const result = calculateLine(line, 0, 'TRY');

      expect(result.type).toBe('TEVKIFAT');
      // KDV = 1000 * 20% = 200
      // Tevkifat = 200 * 90% = 180 (kod 602 = %90)
      expect(result.withholdingObject.taxTotal).toBe(180);
      expect(result.withholdingObject.taxSubtotals).toHaveLength(1);
      expect(result.withholdingObject.taxSubtotals[0].percent).toBe(90);
      expect(result.withholdingObject.taxSubtotals[0].taxable).toBe(200);
      // payable = 1200 - 180 = 1020
      expect(result.payableAmountForMonetary).toBe(1020);
    });

    it('tam tevkifat (%100) hesaplaması', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '801',
      };
      const result = calculateLine(line, 0, 'TRY');

      // Tevkifat = 200 * 100% = 200
      expect(result.withholdingObject.taxTotal).toBe(200);
      // payable = 1200 - 200 = 1000
      expect(result.payableAmountForMonetary).toBe(1000);
    });
  });

  describe('calculateLine — M3 650 dinamik tevkifat', () => {
    it('650 + percent=25 → tutar kdv × 0.25', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '650',
        withholdingTaxPercent: 25,
      };
      const result = calculateLine(line, 0, 'TRY');
      // KDV = 1000 * 20% = 200 → tevkifat = 200 * 25% = 50
      expect(result.withholdingObject.taxTotal).toBe(50);
      expect(result.withholdingObject.taxSubtotals[0].percent).toBe(25);
    });

    it('650 + percent=0 geçerli sınır (taxAmount=0)', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '650',
        withholdingTaxPercent: 0,
      };
      const result = calculateLine(line, 0, 'TRY');
      expect(result.withholdingObject.taxTotal).toBe(0);
    });

    it('650 + percent yoksa throw', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '650',
      };
      expect(() => calculateLine(line, 0, 'TRY')).toThrow(/withholdingTaxPercent.*zorunlu/);
    });

    it('650 + percent=150 aralık dışı throw', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '650',
        withholdingTaxPercent: 150,
      };
      expect(() => calculateLine(line, 0, 'TRY')).toThrow(/0-100 aralığında/);
    });

    it('sabit kod 601 + withholdingTaxPercent verilirse throw (karışıklık)', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '601',
        withholdingTaxPercent: 50,
      };
      expect(() => calculateLine(line, 0, 'TRY')).toThrow(/sadece 650 kodu için/);
    });
  });

  describe('calculateLine — ÖTV + iskonto + tevkifat kombine', () => {
    it('tüm hesaplamalar birlikte doğru çalışmalı', () => {
      const line: SimpleLineInput = {
        name: 'Kombine Test',
        quantity: 5,
        price: 200,
        kdvPercent: 18,
        allowancePercent: 10,
        taxes: [{ code: '0074', percent: 20 }],
        withholdingTaxCode: '601',
      };
      const result = calculateLine(line, 0, 'TRY');

      // gross = 5 * 200 = 1000
      // iskonto = 1000 * 10% = 100
      // lineExtensionAmount = 900
      expect(result.allowanceObject.base).toBe(1000);
      expect(result.lineExtensionAmount).toBe(900);

      // ÖTV = 900 * 20% = 180
      // KDV matrahı = 900 + 180 = 1080 (matrah artırıcı)
      // KDV = 1080 * 18% = 194.4
      const kdv = result.taxes.taxSubtotals.find(t => t.code === '0015');
      expect(kdv!.taxable).toBe(1080);
      expect(kdv!.amount).toBeCloseTo(194.4);

      // Tevkifat = 194.4 * 40% = 77.76 (kod 601 = %40)
      expect(result.withholdingObject.taxTotal).toBeCloseTo(77.76);

      // taxInclusive = 900 + 180 + 194.4 = 1274.4
      expect(result.taxInclusiveForMonetary).toBeCloseTo(1274.4);
      // payable = 1274.4 - 77.76 = 1196.64
      expect(result.payableAmountForMonetary).toBeCloseTo(1196.64);
    });
  });

  describe('calculateLine — hata durumları', () => {
    it('geçersiz vergi kodu hata fırlatmalı', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        taxes: [{ code: '9999', percent: 10 }],
      };
      expect(() => calculateLine(line, 0, 'TRY')).toThrow('Geçersiz vergi kodu: 9999');
    });

    it('geçersiz tevkifat kodu hata fırlatmalı', () => {
      const line: SimpleLineInput = {
        ...baseLine,
        withholdingTaxCode: '999',
      };
      expect(() => calculateLine(line, 0, 'TRY')).toThrow('Geçersiz tevkifat kodu: 999');
    });
  });

  describe('calculateAllLines', () => {
    it('birden fazla satırı doğru hesaplamalı', () => {
      const lines: SimpleLineInput[] = [
        { name: 'Ürün A', quantity: 2, price: 100, kdvPercent: 20 },
        { name: 'Ürün B', quantity: 3, price: 50, kdvPercent: 10 },
      ];
      const results = calculateAllLines(lines, 'TRY');

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
      expect(results[0].lineExtensionAmount).toBe(200);
      expect(results[1].lineExtensionAmount).toBe(150);
    });
  });
});
