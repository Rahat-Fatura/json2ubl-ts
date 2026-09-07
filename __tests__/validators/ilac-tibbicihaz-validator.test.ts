/**
 * ilac-tibbicihaz-validator — Schematron
 * `IlacTibbiCihazAdditionalItemIdentificationCheck` testleri.
 *
 * GİB'in ILAC_TIBBICIHAZ profili için kalem kısıtı: her satırda ILAC,
 * TIBBICIHAZ veya DIGER şemalı, BOŞ OLMAYAN bir AdditionalItemIdentification.
 * Bu kural kütüphanede YALNIZ InvoiceInput katmanında ve YALNIZ
 * `validationLevel='strict'` altında vardı; InvoiceSession/UI akışı kimliksiz
 * ILAC_TIBBICIHAZ faturasını sessizce üretiyordu (portalda hiçbir uyarı
 * çıkmıyor, belge GİB şematronunda reddediliyordu).
 *
 * Canlı ölçüm (xslt-service :8081, paket 20260701, `type=efatura`):
 * kimliksiz belge → 1 ihlal; kimlikli belge → 0 ihlal.
 */

import { describe, it, expect } from 'vitest';
import { validateIlacTibbiCihazItemId } from '../../src/validators/ilac-tibbicihaz-validator';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

/** GİB kılavuzu V1.2 §2.1.2 birebir ilaç örneği */
const ILAC_KAREKOD = '(GTIN)8680222690047(BN)0714450(SN)9546433(XD)210909';

/** GİB kılavuzu V1.2 §2.1.2 birebir tıbbi cihaz örneği (SNO'suz — parti-only) */
const CIHAZ_KAREKOD = '(UNO)86930123456789(LNO)X9812354(URT)180225';

function line(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return { name: 'Parasetamol', quantity: 20, price: 45, unitCode: 'Adet', kdvPercent: 10, ...overrides };
}

function baseInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'TEST',
    uuid: 'e1a2b3c4-0000-4000-8000-000000000001',
    datetime: '2026-04-24T10:00:00',
    profile: 'ILAC_TIBBICIHAZ',
    type: 'SATIS',
    currencyCode: 'TRY',
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    lines: [line({ additionalItemIdentifications: [{ schemeId: 'ILAC', value: ILAC_KAREKOD }] })],
    ...overrides,
  };
}

describe('ilac-tibbicihaz-validator — IlacTibbiCihazAdditionalItemIdentificationCheck', () => {
  describe('Kimlik varlığı', () => {
    it('ILAC_TIBBICIHAZ + kalemde hiç kimlik yok → PROFILE_REQUIREMENT', () => {
      const errs = validateIlacTibbiCihazItemId(baseInput({ lines: [line()] }));
      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe('PROFILE_REQUIREMENT');
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications');
      expect(errs[0].message).toContain('ILAC, TIBBICIHAZ veya DIGER');
    });

    it('boş dizi → kimlik yok sayılır', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({ lines: [line({ additionalItemIdentifications: [] })] }),
      );
      expect(errs).toHaveLength(1);
    });

    it('değer yalnız boşluktan ibaret → şematronun normalize-space davranışı: kimlik SAYILMAZ', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({ lines: [line({ additionalItemIdentifications: [{ schemeId: 'ILAC', value: '   ' }] })] }),
      );
      expect(errs).toHaveLength(1);
    });

    it('geçerli ILAC karekodu → hata yok', () => {
      expect(validateIlacTibbiCihazItemId(baseInput())).toHaveLength(0);
    });

    it('geçerli TIBBICIHAZ karekodu → hata yok', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({
          lines: [line({ additionalItemIdentifications: [{ schemeId: 'TIBBICIHAZ', value: CIHAZ_KAREKOD }] })],
        }),
      );
      expect(errs).toHaveLength(0);
    });

    it('DIGER + GİB dolgu değeri 1111111111 → hata yok (İTS/ÜTS dışı kalem)', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({
          lines: [line({ name: 'Kargo bedeli', additionalItemIdentifications: [{ schemeId: 'DIGER', value: '1111111111' }] })],
        }),
      );
      expect(errs).toHaveLength(0);
    });
  });

  describe('Geçersiz şemalar kimlik SAYILMAZ', () => {
    it('ETIKETNO (İDİS şeması) ILAC_TIBBICIHAZ profilinde kimlik yerine GEÇMEZ', () => {
      // Canlı sonda doğrulandı: schemeID=ETIKETNO ile belge 1 ihlal döndü.
      const errs = validateIlacTibbiCihazItemId(
        baseInput({
          lines: [line({ additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'CV0152457' }] })],
        }),
      );
      expect(errs).toHaveLength(1);
    });

    it('KUNYENO (HKS şeması) kimlik yerine GEÇMEZ', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({
          lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'KUN-2026-042-DOM001' }] })],
        }),
      );
      expect(errs).toHaveLength(1);
    });

    it('geçersiz şema + geçerli şema birlikte → geçerli olan yeter', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({
          lines: [line({
            additionalItemIdentifications: [
              { schemeId: 'TELEFON', value: '123456789012345' },
              { schemeId: 'ILAC', value: ILAC_KAREKOD },
            ],
          })],
        }),
      );
      expect(errs).toHaveLength(0);
    });
  });

  describe('Çoklu kimliğe İZİN VAR (şematronla birebir)', () => {
    it('aynı satırda iki ILAC karekodu → hata yok (her kutu kendi karekodunu taşır)', () => {
      // HKS'in aksine bu kuralda "yalnız bir tane" kısıtı YOKTUR; canlı sonda
      // 2 × ILAC + 1 × DIGER içeren belge 0 ihlalle yeşil döndü.
      const errs = validateIlacTibbiCihazItemId(
        baseInput({
          lines: [line({
            additionalItemIdentifications: [
              { schemeId: 'ILAC', value: ILAC_KAREKOD },
              { schemeId: 'ILAC', value: '(GTIN)8680222690047(BN)1663475(SN)2567355(XD)211112' },
            ],
          })],
        }),
      );
      expect(errs).toHaveLength(0);
    });

    it('değer BİÇİMİ denetlenmez — düz GTIN de serbest metin de geçer', () => {
      // Şematron yalnız boş olmamaya bakar; biçim dayatmak GİB'in KABUL ETTİĞİ
      // belgeleri reddetmek olurdu (canlı sonda üçü de yeşil döndü).
      for (const value of ['8699999999999', 'DG-MTX-962', ILAC_KAREKOD]) {
        const errs = validateIlacTibbiCihazItemId(
          baseInput({ lines: [line({ additionalItemIdentifications: [{ schemeId: 'DIGER', value }] })] }),
        );
        expect(errs, `değer: ${value}`).toHaveLength(0);
      }
    });
  });

  describe('Kapsam (yalnız ILAC_TIBBICIHAZ profili)', () => {
    it('TEMELFATURA profilinde kural çalışmaz', () => {
      const errs = validateIlacTibbiCihazItemId(baseInput({ profile: 'TEMELFATURA', lines: [line()] }));
      expect(errs).toHaveLength(0);
    });

    it('IDIS profilinde kural çalışmaz (ETIKETNO ayrı kuraldır)', () => {
      const errs = validateIlacTibbiCihazItemId(baseInput({ profile: 'IDIS', lines: [line()] }));
      expect(errs).toHaveLength(0);
    });

    it('profile tanımsız → kural çalışmaz', () => {
      const errs = validateIlacTibbiCihazItemId(baseInput({ profile: undefined, lines: [line()] }));
      expect(errs).toHaveLength(0);
    });
  });

  describe('Çok kalemli belge', () => {
    it('yalnız kimliksiz satırlar raporlanır, indeksler doğrudur', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({
          lines: [
            line({ additionalItemIdentifications: [{ schemeId: 'ILAC', value: ILAC_KAREKOD }] }),
            line({ name: 'Kimliksiz kalem' }),
            line({ additionalItemIdentifications: [{ schemeId: 'DIGER', value: '1111111111' }] }),
            line({ name: 'Boş değerli kalem', additionalItemIdentifications: [{ schemeId: 'ILAC', value: '' }] }),
          ],
        }),
      );
      expect(errs.map(e => e.path)).toEqual([
        'lines[1].additionalItemIdentifications',
        'lines[3].additionalItemIdentifications',
      ]);
    });

    it('mesaj satır numarasını ve kalem adını taşır', () => {
      const errs = validateIlacTibbiCihazItemId(
        baseInput({ lines: [line(), line({ name: 'Kimliksiz kalem' })] }),
      );
      expect(errs[1].message).toContain('satır 2');
      expect(errs[1].message).toContain('Kimliksiz kalem');
    });
  });
});

describe('ilac-tibbicihaz-validator — InvoiceSession köprüsü', () => {
  function ilacSession(lines: SimpleLineInput[]): InvoiceSession {
    return new InvoiceSession({ initialInput: baseInput({ lines }) });
  }

  it('kimlik eksik → session.validate() error döner (önceden SESSİZDİ)', () => {
    const warnings = ilacSession([line()]).validate();
    const ilac = warnings.filter(w => w.message.includes('ILAC, TIBBICIHAZ veya DIGER'));
    expect(ilac).toHaveLength(1);
    expect(ilac[0].severity).toBe('error');
    expect(ilac[0].code).toBe('PROFILE_REQUIREMENT');
  });

  it('hata yolu portalın satır-eşleme desenine uyar (lines[i]. öneki)', () => {
    // Portal `useLineErrorFields` bu yoldan satır indeksini çıkarıp kalem
    // detayını KENDİLİĞİNDEN açar; ilk yol parçası ızgara sütunu OLMAMALIDIR.
    const warnings = ilacSession([line()]).validate();
    const ilac = warnings.find(w => w.message.includes('ILAC, TIBBICIHAZ veya DIGER'));
    expect(ilac?.field).toBe('lines[0].additionalItemIdentifications');
  });

  it('geçerli karekod → uyarı yok', () => {
    const warnings = ilacSession([
      line({ additionalItemIdentifications: [{ schemeId: 'ILAC', value: ILAC_KAREKOD }] }),
    ]).validate();
    expect(warnings.filter(w => w.message.includes('ILAC, TIBBICIHAZ veya DIGER'))).toHaveLength(0);
  });
});
