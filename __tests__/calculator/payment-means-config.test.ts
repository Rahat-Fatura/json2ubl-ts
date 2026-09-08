import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  PAYMENT_MEANS_DEFINITIONS,
  PAYMENT_MEANS_MAP,
  isValidPaymentMeansCode,
  getPaymentMeansDefinition,
} from '../../src/calculator/payment-means-config';
import { PAYMENT_MEANS_CODES } from '../../src/config/constants';

/**
 * Şematronun `$PaymentMeansCodeTypeList` değişkenini paketteki XML'den OKUR.
 *
 * 🔑 Beklenen kümeyi teste elle kopyalamak, doğrulamak istediğimiz hatanın
 * (elle kopyalanan küme eskir) tekrarı olurdu. Şematron paketi güncellendiğinde
 * bu test kümeyi yeniden okur ve sabit uymuyorsa KIRILIR.
 *
 * ⚠️ `value ="` — GİB XML'inde bazı `sch:let` satırlarında `value` ile `=`
 * arasında BOŞLUK var (`UnitCodeList` böyle). Regex bunu tolere eder.
 */
function schematronPaymentMeansCodes(): string[] {
  const xml = readFileSync(
    resolve(__dirname, '../../schematrons/UBL-TR_Codelist.xml'),
    'utf8',
  );
  const match = /name="PaymentMeansCodeTypeList"\s+value\s*=\s*"'([^']*)'"/.exec(xml);
  if (!match) throw new Error('$PaymentMeansCodeTypeList şematronda bulunamadı');
  return match[1].split(',').filter(Boolean);
}

describe('payment-means-config (D2)', () => {
  describe('B-90 — 7 sık kod tanımlı (UI dropdown)', () => {
    it('7 kod içerir', () => {
      expect(PAYMENT_MEANS_DEFINITIONS).toHaveLength(7);
    });

    const expected: Array<[string, string]> = [
      ['1', 'Ödeme Tipi Muhtelif'],
      ['10', 'Nakit'],
      ['20', 'Çek'],
      ['23', 'Banka Çeki'],
      ['42', 'Havale/EFT'],
      ['48', 'Kredi Kartı/Banka Kartı'],
      ['ZZZ', 'Diğer'],
    ];
    for (const [code, name] of expected) {
      it(`${code} → "${name}"`, () => {
        expect(PAYMENT_MEANS_MAP.get(code)?.name).toBe(name);
      });
    }
  });

  describe('helper fonksiyonları', () => {
    it('isValidPaymentMeansCode(42) true', () => {
      expect(isValidPaymentMeansCode('42')).toBe(true);
    });

    it('isValidPaymentMeansCode(XYZ) false', () => {
      expect(isValidPaymentMeansCode('XYZ')).toBe(false);
    });

    it('getPaymentMeansDefinition(ZZZ) Diğer', () => {
      expect(getPaymentMeansDefinition('ZZZ')?.name).toBe('Diğer');
    });
  });

  describe('PAYMENT_MEANS_CODES — şematron kümesi (4.5.3)', () => {
    it('şematronun $PaymentMeansCodeTypeList kümesinin AYNISI', () => {
      expect([...PAYMENT_MEANS_CODES].sort()).toEqual(
        schematronPaymentMeansCodes().sort(),
      );
    });

    it('75 kod: 1-53, 60-67, 70, 74-78, 91-97, ZZZ', () => {
      expect(PAYMENT_MEANS_CODES.size).toBe(75);
    });

    it('ARA KODLAR listede YOK — aralık genişletilmemiş', () => {
      /* 54-59, 68-69, 71-73, 79-90, 98-99 şematronda YOKTUR; "1-99 arası"
       * diye genellemek GİB'in reddedeceği kodları geçerli saymak olurdu. */
      for (const disarida of ['54', '59', '68', '69', '71', '73', '79', '90', '98', '99', '0']) {
        expect(PAYMENT_MEANS_CODES.has(disarida)).toBe(false);
      }
    });

    it('adlandırılmış 7 önerinin HEPSİ kümenin içinde', () => {
      for (const def of PAYMENT_MEANS_DEFINITIONS) {
        expect(PAYMENT_MEANS_CODES.has(def.code)).toBe(true);
      }
    });
  });

  describe('KAPALI liste DEĞİL — öneri ≠ geçerlilik', () => {
    /* 🔴 4.5.3 ÖNCESİNDEKİ KUSURUN TESTİ: yüklem 7'lik öneri listesine bakıyordu,
     * bu yüzden GİB'in kabul ettiği 68 kod "geçersiz" görünüyordu. Ekranı 7'ye
     * kilitlememenin gerekçesi de budur. */
    const adsizAmaGecerli = ['30', '31', '49', '50', '51', '60', '70', '97'];

    it('adı olmayan geçerli kodlar TRUE döner', () => {
      for (const code of adsizAmaGecerli) {
        expect(isValidPaymentMeansCode(code)).toBe(true);
      }
    });

    it('adı olmayan geçerli kodlar öneri listesinde YOK', () => {
      const oneriler = PAYMENT_MEANS_DEFINITIONS.map((d) => d.code);
      for (const code of adsizAmaGecerli) {
        expect(oneriler).not.toContain(code);
      }
    });

    it('adsız kodun adı UYDURULMAZ — getPaymentMeansDefinition undefined', () => {
      expect(getPaymentMeansDefinition('30')).toBeUndefined();
    });

    it('küme önerilerden GENİŞ', () => {
      expect(PAYMENT_MEANS_CODES.size).toBeGreaterThan(PAYMENT_MEANS_DEFINITIONS.length);
    });
  });
});
