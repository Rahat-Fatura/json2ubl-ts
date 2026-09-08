import { describe, it, expect } from 'vitest';
import {
  deriveLineFieldVisibility,
  deriveTypeProfileFlags,
} from '../../src/calculator/line-field-visibility';
import { deriveFieldVisibility, deriveUIState, validateInvoiceState } from '../../src/calculator/invoice-rules';
import { YATIRIM_TESVIK_SUGGESTIONS } from '../../src/calculator/suggestion-rules/yatirim-tesvik-suggestions';
import { KDV_SUGGESTIONS } from '../../src/calculator/suggestion-rules/kdv-suggestions';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import {
  isYatirimTesvikScope,
  isYatirimTesvikKdvScope,
  isYatirimTesvikIstisnaScope,
} from '../../src/config/schematron-scopes';
import type { SimpleLineInput } from '../../src/calculator/simple-types';

/**
 * 4.5.2 — YATIRIM TEŞVİK: e-ARŞİV DÜZLEMİ GÖRÜNÜRLÜĞÜ.
 *
 * ## Kusur
 * Kullanıcı bildirimi: «e-Arşiv YTB tipli belgelerde yatırım teşvik için gerekli
 * alanların HİÇBİRİ açılmıyor.» Doğrulayıcı iki düzlemi de kapsıyordu
 * (`profile-requirement-validator`), görünürlük ise yalnız `profile ===
 * 'YATIRIMTESVIK'` diyordu → kullanıcı "zorunludur" hatasını görüyor ama
 * dolduracak alanı bulamıyordu.
 *
 * ## Kilitlenen sözleşme
 * Şematron kuralları (`YatirimTesvikContractDocumentReferenceIDCheck`,
 * `...CommodityClassificationCheck`, `...ItemClassificationCodeCheck`,
 * `...ItemInstanceCheck`, `...KDVCheck`, `...LineKDVCheck`) kapsamlarını
 *
 *   ProfileID='YATIRIMTESVIK'  VEYA
 *   (ProfileID='EARSIVFATURA' VE InvoiceTypeCode ∈ $YatirimTesvikEArsivInvoiceTypeCodeList)
 *
 * diye yazar. Dolayısıyla e-Arşiv düzlemindeki HER YTB tipi, e-Fatura
 * düzlemindeki muadiliyle AYNI bayrakları üretmek zorundadır.
 *
 * CANLI ŞEMATRON (xslt-service :8081, `unnumbered-invoice`, 2026-09-08):
 * YATIRIMTESVIK+SATIS ile EARSIVFATURA+YTBSATIS boş hâlde AYNI 3 ihlali,
 * YATIRIMTESVIK+ISTISNA ile EARSIVFATURA+YTBISTISNA boş hâlde AYNI 6 ihlali
 * verdi; alanlar dolunca ikisi de 0 ihlale indi. EARSIVFATURA+SATIS'ta ise
 * hiçbir YTB kuralı tetiklenmedi.
 */

/** e-Arşiv YTB tipi ↔ e-Fatura muadili. */
const DUZLEM_ESLESMESI: ReadonlyArray<readonly [earsivTip: string, efaturaTip: string]> = [
  ['YTBSATIS', 'SATIS'],
  ['YTBIADE', 'IADE'],
  ['YTBISTISNA', 'ISTISNA'],
  ['YTBTEVKIFAT', 'TEVKIFAT'],
  /* ⚠️ `YTBTEVKIFATIADE` ÜRETİM seçim listesinde YOK ama şematron kod listesinde
   * VAR: gelen/kayıtlı belge bu tiple açılabilir, görünürlük onu da kapsamalı. */
  ['YTBTEVKIFATIADE', 'TEVKIFATIADE'],
];

function kalem(over: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return {
    name: 'Teşvikli makine',
    quantity: 1,
    price: 1000,
    unitCode: 'Adet',
    kdvPercent: 20,
    ...over,
  } as SimpleLineInput;
}

describe('4.5.2 — YTB kapsam yüklemi TEK KAYNAK (config/schematron-scopes)', () => {
  it('temel kapsam iki düzlemi de alır', () => {
    expect(isYatirimTesvikScope('YATIRIMTESVIK', 'SATIS')).toBe(true);
    for (const [earsivTip] of DUZLEM_ESLESMESI) {
      expect(isYatirimTesvikScope('EARSIVFATURA', earsivTip), earsivTip).toBe(true);
    }
  });

  it('YTB dışı e-Arşiv tipi kapsam DIŞI', () => {
    expect(isYatirimTesvikScope('EARSIVFATURA', 'SATIS')).toBe(false);
    expect(isYatirimTesvikScope('TICARIFATURA', 'SATIS')).toBe(false);
  });

  it('KDV kapsamı İADE ailesini eler (YatirimTesvikKDVCheck metni)', () => {
    expect(isYatirimTesvikKdvScope('EARSIVFATURA', 'YTBSATIS')).toBe(true);
    expect(isYatirimTesvikKdvScope('EARSIVFATURA', 'YTBIADE')).toBe(false);
    expect(isYatirimTesvikKdvScope('EARSIVFATURA', 'YTBTEVKIFATIADE')).toBe(false);
    expect(isYatirimTesvikKdvScope('YATIRIMTESVIK', 'IADE')).toBe(false);
  });

  it('ISTISNA kapsamı DAR eşleşmedir — temel kapsamın alt kümesi değil', () => {
    expect(isYatirimTesvikIstisnaScope('YATIRIMTESVIK', 'ISTISNA')).toBe(true);
    expect(isYatirimTesvikIstisnaScope('EARSIVFATURA', 'YTBISTISNA')).toBe(true);
    // temel kapsamda VAR, dar kapsamda YOK:
    expect(isYatirimTesvikIstisnaScope('EARSIVFATURA', 'YTBSATIS')).toBe(false);
    // çapraz eşleşme YASAK (profil e-Fatura, tip e-Arşiv):
    expect(isYatirimTesvikIstisnaScope('YATIRIMTESVIK', 'YTBISTISNA')).toBe(false);
  });
});

describe('4.5.2 — kalem görünürlüğü: e-Arşiv düzlemi e-Fatura düzlemiyle AYNI', () => {
  for (const [earsivTip, efaturaTip] of DUZLEM_ESLESMESI) {
    it(`EARSIVFATURA+${earsivTip} ≡ YATIRIMTESVIK+${efaturaTip} (harcama tipi 01)`, () => {
      const satir = kalem({ itemClassificationCode: '01' });
      const earsiv = deriveLineFieldVisibility(satir, { type: earsivTip, profile: 'EARSIVFATURA' }, 0);
      const efatura = deriveLineFieldVisibility(satir, { type: efaturaTip, profile: 'YATIRIMTESVIK' }, 0);
      expect(earsiv).toEqual(efatura);

      // ve gerçekten AÇIK olmalılar — "ikisi de kapalı" da eşitliği sağlardı.
      expect(earsiv.showItemClassificationCode).toBe(true);
      expect(earsiv.showProductTraceId).toBe(true);
      expect(earsiv.showSerialId).toBe(true);
    });

    it(`EARSIVFATURA+${earsivTip}: harcama tipi 01 DIŞI kalemde makine alanları KAPALI`, () => {
      const satir = kalem({ itemClassificationCode: '02' });
      const v = deriveLineFieldVisibility(satir, { type: earsivTip, profile: 'EARSIVFATURA' }, 0);
      expect(v.showItemClassificationCode).toBe(true);   // harcama tipi seçici hep açık
      expect(v.showProductTraceId).toBe(false);          // makine üçlüsü yalnız 01'de
      expect(v.showSerialId).toBe(false);
    });

    it(`EARSIVFATURA+${earsivTip}: isYatirimTesvik bayrağı açık`, () => {
      expect(deriveTypeProfileFlags(earsivTip, 'EARSIVFATURA').isYatirimTesvik).toBe(true);
    });
  }

  it('e-Arşiv SATIS (YTB DIŞI) → YTB alanlarının hiçbiri açılmaz', () => {
    const v = deriveLineFieldVisibility(
      kalem({ itemClassificationCode: '01' }),
      { type: 'SATIS', profile: 'EARSIVFATURA' },
      0,
    );
    expect(v.showItemClassificationCode).toBe(false);
    expect(v.showProductTraceId).toBe(false);
    expect(v.showSerialId).toBe(false);
    expect(deriveTypeProfileFlags('SATIS', 'EARSIVFATURA').isYatirimTesvik).toBe(false);
  });
});

describe('4.5.2 — belge görünürlüğü: e-Arşiv düzlemi e-Fatura düzlemiyle AYNI', () => {
  for (const [earsivTip, efaturaTip] of DUZLEM_ESLESMESI) {
    it(`EARSIVFATURA+${earsivTip} → showYatirimTesvikNo + showCommodityClassification açık`, () => {
      const earsiv = deriveFieldVisibility(earsivTip, 'EARSIVFATURA');
      const efatura = deriveFieldVisibility(efaturaTip, 'YATIRIMTESVIK');

      expect(earsiv.showYatirimTesvikNo).toBe(true);
      expect(earsiv.showCommodityClassification).toBe(true);
      // YTB'ye bağlı iki alan iki düzlemde de aynı; e-Arşiv'e özgü alanlar
      // (showEArchiveInfo/showOnlineSale) doğal olarak FARKLI, onları kıyaslamayız.
      expect(earsiv.showYatirimTesvikNo).toBe(efatura.showYatirimTesvikNo);
      expect(earsiv.showCommodityClassification).toBe(efatura.showCommodityClassification);
    });
  }

  it('e-Arşiv SATIS (YTB DIŞI) → YTB belge alanları kapalı', () => {
    const v = deriveFieldVisibility('SATIS', 'EARSIVFATURA');
    expect(v.showYatirimTesvikNo).toBe(false);
    expect(v.showCommodityClassification).toBe(false);
  });
});

describe('4.5.2 — ytbNo zorunluluğu e-Arşiv düzleminde de geçerli', () => {
  for (const [earsivTip] of DUZLEM_ESLESMESI) {
    it(`EARSIVFATURA+${earsivTip} + ytbNo yok → hata`, () => {
      const w = validateInvoiceState({ type: earsivTip, profile: 'EARSIVFATURA' });
      expect(w.some(x => x.field === 'ytbNo')).toBe(true);
    });

    it(`EARSIVFATURA+${earsivTip} + 6 haneli ytbNo → hata yok`, () => {
      const w = validateInvoiceState({ type: earsivTip, profile: 'EARSIVFATURA', ytbNo: '123456' });
      expect(w.some(x => x.field === 'ytbNo')).toBe(false);
    });

    it(`EARSIVFATURA+${earsivTip} + 5 haneli ytbNo → biçim hatası`, () => {
      const w = validateInvoiceState({ type: earsivTip, profile: 'EARSIVFATURA', ytbNo: '12345' });
      expect(w.some(x => x.field === 'ytbNo' && x.message.includes('6 haneli'))).toBe(true);
    });
  }

  it('e-Arşiv SATIS (YTB DIŞI) → ytbNo istenmez', () => {
    const w = validateInvoiceState({ type: 'SATIS', profile: 'EARSIVFATURA' });
    expect(w.some(x => x.field === 'ytbNo')).toBe(false);
  });
});

describe('4.5.2 — ytbAllKdvPositive (B-78.2) kapsamı', () => {
  it('EARSIVFATURA+YTBSATIS + KDV pozitif değil → hata', () => {
    const w = validateInvoiceState({
      type: 'YTBSATIS', profile: 'EARSIVFATURA', ytbNo: '123456', ytbAllKdvPositive: false,
    });
    expect(w.some(x => x.field === 'taxTotals')).toBe(true);
  });

  /* Şematron `YatirimTesvikKDVCheck` kendi metninde IADE/TEVKIFATIADE/YTBIADE/
   * YTBTEVKIFATIADE tiplerini HARİÇ tutar — iade belgesinde KDV'nin pozitif
   * olması beklenmez. Eski kod yalnız profile baktığı için YATIRIMTESVIK+IADE'de
   * YANLIŞ-POZİTİF hata üretiyordu. */
  it('İADE ailesinde KDV kuralı tetiklenmez (iki düzlemde de)', () => {
    for (const [tip, profil] of [['YTBIADE', 'EARSIVFATURA'], ['IADE', 'YATIRIMTESVIK']] as const) {
      const w = validateInvoiceState({
        type: tip, profile: profil, ytbNo: '123456', ytbAllKdvPositive: false,
      });
      expect(w.some(x => x.field === 'taxTotals'), `${profil}+${tip}`).toBe(false);
    }
  });

  it('oturum türetimi de e-Arşiv düzlemini kapsar (deriveB78Params)', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        profile: 'EARSIVFATURA',
        type: 'YTBSATIS',
        ytbNo: '123456',
        lines: [kalem({ itemClassificationCode: '01', kdvPercent: 0 })],
      },
    });
    const warnings = session.validate();
    expect(warnings.some(w => w.field === 'taxTotals')).toBe(true);
  });
});

describe('4.5.2 — YTB önerileri e-Arşiv düzleminde de üretilir', () => {
  /* Alan zorunluysa yardımı da orada olmalı: e-Arşiv YTB'de harcama tipi
   * varsayılanı, makine alanı hatırlatmaları ve 308/339 önerileri HİÇ
   * üretilmiyordu (aynı kapsam kusuru, öneri motoru kopyası). */
  const ui = deriveUIState('YTBSATIS', 'EARSIVFATURA');

  it('harcama tipi / makine alanı önerileri EARSIVFATURA+YTBSATIS için tetiklenir', () => {
    const input = {
      type: 'YTBSATIS', profile: 'EARSIVFATURA', currencyCode: 'TRY',
      lines: [kalem({ name: 'CNC Tezgahı' })],
    } as never;
    const bosItemClass = YATIRIM_TESVIK_SUGGESTIONS.find(r => r.id === 'yatirim-tesvik/itemclass-default')!;
    expect(bosItemClass.applies(input, ui)).toBe(true);

    const makineli = {
      type: 'YTBSATIS', profile: 'EARSIVFATURA', currencyCode: 'TRY',
      lines: [kalem({ name: 'CNC Tezgahı', itemClassificationCode: '01' })],
    } as never;
    for (const id of ['yatirim-tesvik/makine-traceid-required', 'yatirim-tesvik/makine-serialid-required']) {
      const rule = YATIRIM_TESVIK_SUGGESTIONS.find(r => r.id === id)!;
      expect(rule.applies(makineli, ui), id).toBe(true);
    }
  });

  it('YTB dışı e-Arşiv tipinde öneri üretilmez', () => {
    const input = {
      type: 'SATIS', profile: 'EARSIVFATURA', currencyCode: 'TRY',
      lines: [kalem({ name: 'CNC Tezgahı' })],
    } as never;
    const rule = YATIRIM_TESVIK_SUGGESTIONS.find(r => r.id === 'yatirim-tesvik/itemclass-default')!;
    expect(rule.applies(input, ui)).toBe(false);
  });

  it('308 önerisi EARSIVFATURA+YTBISTISNA için tetiklenir (dar eşleşme)', () => {
    const istisnaUi = deriveUIState('YTBISTISNA', 'EARSIVFATURA');
    const rule = KDV_SUGGESTIONS.find(r => r.id === 'kdv/ytb-istisna-suggest-308')!;
    const input = {
      type: 'YTBISTISNA', profile: 'EARSIVFATURA', currencyCode: 'TRY',
      lines: [kalem({ kdvPercent: 0, itemClassificationCode: '01' })],
    } as never;
    expect(rule.applies(input, istisnaUi)).toBe(true);

    // YTBSATIS dar kapsamda DEĞİL → öneri yok
    const satis = {
      type: 'YTBSATIS', profile: 'EARSIVFATURA', currencyCode: 'TRY',
      lines: [kalem({ kdvPercent: 0, itemClassificationCode: '01' })],
    } as never;
    expect(rule.applies(satis, ui)).toBe(false);
  });
});
