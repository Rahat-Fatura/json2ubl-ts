/**
 * hks-kunyeno-validator — Schematron `HKSInvioceCheck` testleri.
 *
 * GİB'in HKS profili için tek belge kısıtı: her kalemde 19 karakterli KUNYENO.
 * 4.1.2'ye kadar kütüphanede bu kural YALNIZ InvoiceInput katmanında ve YALNIZ
 * `validationLevel='strict'` altında vardı; InvoiceSession/UI akışı
 * KUNYENO'suz HKS faturasını sessizce üretiyordu.
 */

import { describe, it, expect } from 'vitest';
import { validateHksKunyeNo } from '../../src/documents/invoice/validators/hks-kunyeno-validator';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SimpleInvoiceBuilder } from '../../src';
import { isHksKunyeNoScope } from '../../src/ubltr/vocabulary/schematron-scopes';
import { isHksChargePlane } from '../../src/ubltr/vocabulary/hks-charge-codes';
import earsivHksSatis from '../../examples-matrix/valid/earsivfatura/earsivfatura-hkssatis-baseline/input';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

/** 19 karakterlik geçerli künye numarası */
const VALID_KUNYENO = 'KUN-2026-042-DOM001';

function line(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return { name: 'Domates', quantity: 100, price: 10, unitCode: 'Adet', kdvPercent: 1, ...overrides };
}

function baseInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'TEST',
    uuid: 'e1a2b3c4-0000-4000-8000-000000000001',
    datetime: '2026-04-24T10:00:00',
    profile: 'HKS',
    // 4.4.0: HKS'in e-FATURA düzleminde tip SATIS'tir (HKSSATIS e-Arşiv düzlemi).
    type: 'SATIS',
    currencyCode: 'TRY',
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: VALID_KUNYENO }] })],
    ...overrides,
  };
}

describe('hks-kunyeno-validator — HKSInvioceCheck', () => {
  describe('KUNYENO varlığı', () => {
    it('HKS + kalemde KUNYENO yok → PROFILE_REQUIREMENT', () => {
      const errs = validateHksKunyeNo(baseInput({ lines: [line()] }));
      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe('PROFILE_REQUIREMENT');
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications');
      expect(errs[0].message).toContain('KUNYENO');
    });

    it('HKS + KUNYENO boş string → hata (dolu sanılmasın)', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: '   ' }] })],
      }));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications');
    });

    it('HKS + başka schemeId (ETIKETNO) var ama KUNYENO yok → hata', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'AB1234567' }] })],
      }));
      expect(errs).toHaveLength(1);
    });

    it('HKS + 19 karakterli KUNYENO → hata yok', () => {
      expect(validateHksKunyeNo(baseInput())).toHaveLength(0);
    });
  });

  describe('KUNYENO uzunluğu (tam 19)', () => {
    it('18 karakter → hata', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'K'.repeat(18) }] })],
      }));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications.KUNYENO');
      expect(errs[0].message).toContain('19');
    });

    it('20 karakter → hata', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'K'.repeat(20) }] })],
      }));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications.KUNYENO');
    });

    it('baş/son boşluk uzunluğa sayılmaz (normalize-space)', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: `  ${VALID_KUNYENO}  ` }] })],
      }));
      expect(errs).toHaveLength(0);
    });
  });

  /**
   * 4.4.0 — SATIR BAŞINA TAM BİR KÜNYE.
   *
   * Şematron `HKSInvioceCheck` satır-bazlı DEĞİL, SAYIM-bazlıdır:
   *   count(geçerli KUNYENO) = count(cac:InvoiceLine)
   * Yani 1. satırda iki künye + 2. satırda hiç → 2 = 2 → ŞEMATRON GEÇER, oysa
   * 2. satır künyesizdir. Canlı sonda doğrulandı (xslt-service :8081): böyle bir
   * belge 0 ihlalle yeşil döndü. Bu doğrulayıcı deliği kapatır.
   */
  describe('Satır başına TAM BİR künye (şematronun sayım deliği)', () => {
    it('bir satırda İKİ KUNYENO → hata (şematron bunu YAKALAMAZ)', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({
          additionalItemIdentifications: [
            { schemeId: 'KUNYENO', value: VALID_KUNYENO },
            { schemeId: 'KUNYENO', value: 'KUN-2026-042-DOM002' },
          ],
        })],
      }));
      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe('PROFILE_REQUIREMENT');
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications');
      expect(errs[0].message).toContain('YALNIZ BİR');
      // Kaç adet geldiğini söylemeli — kullanıcı hangi satırı düzelteceğini bilsin
      expect(errs[0].message).toContain('2 adet');
      expect(errs[0].message).toContain('satır 1');
    });

    /* Sayım deliğinin tam senaryosu: belge genelinde 2 künye / 2 satır (şematron
     * geçer) ama künyelerin ikisi de 1. satırda. İKİ hata bekleriz: 1. satır
     * "yalnız bir", 2. satır "zorunludur". */
    it('1. satırda iki, 2. satırda hiç → İKİ hata (şematron sayımı tutuyor olsa da)', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [
          line({
            name: 'Domates',
            additionalItemIdentifications: [
              { schemeId: 'KUNYENO', value: VALID_KUNYENO },
              { schemeId: 'KUNYENO', value: 'KUN-2026-042-DOM002' },
            ],
          }),
          line({ name: 'Biber' }),
        ],
      }));
      expect(errs).toHaveLength(2);
      expect(errs[0].message).toContain('YALNIZ BİR');
      expect(errs[1].message).toContain('zorunludur');
      expect(errs[1].message).toContain('Biber');
    });

    it('boş değerli ikinci KUNYENO sayılmaz → hata yok', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({
          additionalItemIdentifications: [
            { schemeId: 'KUNYENO', value: VALID_KUNYENO },
            { schemeId: 'KUNYENO', value: '  ' },
          ],
        })],
      }));
      expect(errs).toHaveLength(0);
    });

    it('KUNYENO + başka schemeId birlikte → hata yok', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({
          additionalItemIdentifications: [
            { schemeId: 'KUNYENO', value: VALID_KUNYENO },
            { schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Ahmet Yılmaz' },
            { schemeId: 'MALSAHIBIVKNTCKN', value: '12345678901' },
          ],
        })],
      }));
      expect(errs).toHaveLength(0);
    });
  });

  /**
   * KAPSAM — `isHksKunyeNoScope`, yani GİB `general.xslt`'sindeki künye
   * kolonunun kapısı (`:960`, `:2901`, `:3092`):
   *
   *   ProfileID='HKS'  VEYA  (EARSIVFATURA VE tip ∈ {HKSSATIS, HKSKOMISYONCU})
   *
   * 🔴 e-Arşiv dalı 2026-09-22'de EKLENDİ. Öncesinde kapı yalnız
   * `profile === 'HKS'` idi ve e-Arşiv ikizinde künye boş/5 haneli geçiyordu;
   * şematron da orada susuyor (`Common:358` yalnız `ProfileID='HKS'` der).
   */
  describe('Kapsam — iki düzlem', () => {
    it('TEMELFATURA + KUNYENO yok → hata yok', () => {
      const errs = validateHksKunyeNo(baseInput({ profile: 'TEMELFATURA', type: 'SATIS', lines: [line()] }));
      expect(errs).toHaveLength(0);
    });

    it('profil verilmemiş → hata yok', () => {
      const errs = validateHksKunyeNo(baseInput({ profile: undefined, type: undefined, lines: [line()] }));
      expect(errs).toHaveLength(0);
    });

    it('HKSIRSALIYE (irsaliye profili) bu validator kapsamında değil', () => {
      const errs = validateHksKunyeNo(baseInput({ profile: 'HKSIRSALIYE', lines: [line()] }));
      expect(errs).toHaveLength(0);
    });

    it.each([
      ['HKS + SATIS', 'HKS', 'SATIS'],
      ['HKS + KOMISYONCU', 'HKS', 'KOMISYONCU'],
      ['HKS + TEVKIFAT', 'HKS', 'TEVKIFAT'],
      ['EARSIVFATURA + HKSSATIS', 'EARSIVFATURA', 'HKSSATIS'],
      ['EARSIVFATURA + HKSKOMISYONCU', 'EARSIVFATURA', 'HKSKOMISYONCU'],
    ])('%s → KAPSAMDA (künyesiz belge HATA verir)', (_label, profile, type) => {
      const errs = validateHksKunyeNo(baseInput({ profile, type, lines: [line()] }));
      expect(errs).toHaveLength(1);
      expect(errs[0].message).toContain('KUNYENO');
    });

    it.each([
      ['EARSIVFATURA + SATIS', 'EARSIVFATURA', 'SATIS'],
      ['EARSIVFATURA + IADE', 'EARSIVFATURA', 'IADE'],
      ['TICARIFATURA + KOMISYONCU', 'TICARIFATURA', 'KOMISYONCU'],
    ])('%s → KAPSAM DIŞI', (_label, profile, type) => {
      expect(validateHksKunyeNo(baseInput({ profile, type, lines: [line()] }))).toHaveLength(0);
    });

    it('profil BOŞ + HKSKOMISYONCU → kapsamda (emniyet ağı; tip yalnız e-Arşivde yaşar)', () => {
      const errs = validateHksKunyeNo(baseInput({ profile: '', type: 'HKSKOMISYONCU', lines: [line()] }));
      expect(errs).toHaveLength(1);
    });

    /* 🔴 Yüklem seçiminin KANITI: masraf düzlemi yüklemi burada kullanılsaydı
     * `HKS+SATIS` ve `EARSIVFATURA+HKSSATIS` künye kapısını sessizce
     * kaybederdi — masraf düzlemi YALNIZ komisyoncu ikizini açar. */
    it('künye kümesi masraf düzleminden GENİŞ — isHksChargePlane yanlış yüklem olurdu', () => {
      expect(isHksKunyeNoScope('HKS', 'SATIS')).toBe(true);
      expect(isHksChargePlane('HKS', 'SATIS')).toBe(false);
      expect(isHksKunyeNoScope('EARSIVFATURA', 'HKSSATIS')).toBe(true);
      expect(isHksChargePlane('EARSIVFATURA', 'HKSSATIS')).toBe(false);
      // Komisyoncu ikizinde iki yüklem de açıktır
      expect(isHksKunyeNoScope('HKS', 'KOMISYONCU')).toBe(true);
      expect(isHksChargePlane('HKS', 'KOMISYONCU')).toBe(true);
    });
  });

  describe('Çok kalemli belge — hangi kalem olduğu bildirilmeli', () => {
    it('2. ve 4. kalem eksik → yalnız o iki kalem raporlanır', () => {
      const withKunye = line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: VALID_KUNYENO }] });
      const errs = validateHksKunyeNo(baseInput({
        lines: [withKunye, line({ name: 'Biber' }), withKunye, line({ name: 'Salatalık' })],
      }));
      expect(errs).toHaveLength(2);
      expect(errs.map(e => e.path)).toEqual([
        'lines[1].additionalItemIdentifications',
        'lines[3].additionalItemIdentifications',
      ]);
      // Mesaj kullanıcıya hangi kalem olduğunu söylemeli
      expect(errs[0].message).toContain('Biber');
      expect(errs[1].message).toContain('Salatalık');
    });
  });
});

describe('InvoiceSession köprüsü — HKS KUNYENO validate() pipeline\'ında', () => {
  function hksSession(lines: SimpleLineInput[]): InvoiceSession {
    return new InvoiceSession({ initialInput: baseInput({ lines }) });
  }

  it('KUNYENO eksik → session.validate() error döner (4.1.2\'de SESSİZDİ)', () => {
    const warnings = hksSession([line()]).validate();
    const kunye = warnings.filter(w => w.message.includes('KUNYENO'));
    expect(kunye).toHaveLength(1);
    expect(kunye[0].severity).toBe('error');
    expect(kunye[0].code).toBe('PROFILE_REQUIREMENT');
  });

  it('19 karakterli KUNYENO → KUNYENO uyarısı yok', () => {
    const warnings = hksSession([
      line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: VALID_KUNYENO }] }),
    ]).validate();
    expect(warnings.filter(w => w.message.includes('KUNYENO'))).toHaveLength(0);
  });
});

/* ════════════ e-Arşiv düzlemi — GERÇEK belge üzerinde MUTASYON ════════════
 *
 * Kapsam açığının (§3.3 / K10-a) kanıtı: sentetik girdi değil, matristeki
 * GERÇEK `EARSIVFATURA+HKSSATIS` belgesi bozulur ve kapının kırmızıya döndüğü
 * ölçülür. Mutasyon yardımcısı hedefini bulamazsa FIRLATIR — yanlış eksene
 * çarpan bir mutasyon "sahte yeşil" verirdi. */
describe('e-Arşiv ikizi — gerçek belge mutasyonu (K10-a açığı)', () => {
  function mutateEarsiv(
    change: (ids: Array<{ schemeId: string; value: string }>) => Array<{ schemeId: string; value: string }>,
  ): SimpleInvoiceInput {
    const clone = structuredClone(earsivHksSatis) as SimpleInvoiceInput;
    const ids = clone.lines[0]?.additionalItemIdentifications as
      | Array<{ schemeId: string; value: string }>
      | undefined;
    if (!ids) throw new Error('MUTASYON HEDEFİ YOK: lines[0].additionalItemIdentifications');
    if (!ids.some(a => a.schemeId === 'KUNYENO')) {
      throw new Error('MUTASYON HEDEFİ BULUNAMADI: KUNYENO (fixture değişmiş olabilir)');
    }
    clone.lines[0].additionalItemIdentifications = change(ids);
    return clone;
  }

  it('sağlam fixture → hata yok (mutasyonun tabanı gerçekten temiz)', () => {
    expect(earsivHksSatis.profile).toBe('EARSIVFATURA');
    expect(earsivHksSatis.type).toBe('HKSSATIS');
    expect(validateHksKunyeNo(earsivHksSatis as SimpleInvoiceInput)).toHaveLength(0);
  });

  it('KÜNYE SÖKÜLDÜ → HATA (eski kapı burada SESSİZDİ)', () => {
    const errs = validateHksKunyeNo(mutateEarsiv(ids => ids.filter(a => a.schemeId !== 'KUNYENO')));
    expect(errs).toHaveLength(1);
    expect(errs[0].code).toBe('PROFILE_REQUIREMENT');
    expect(errs[0].message).toContain('KUNYENO');
    // Etiket e-Arşiv düzlemini söylemeli — `[HKS]` yanıltıcı olurdu
    expect(errs[0].message).toContain('[EARSIV+HKSSATIS]');
  });

  it('KÜNYE 5 HANEYE kısaltıldı → HATA (görevin tarif ettiği tam senaryo)', () => {
    const errs = validateHksKunyeNo(mutateEarsiv(ids =>
      ids.map(a => (a.schemeId === 'KUNYENO' ? { ...a, value: 'KUN12' } : a)),
    ));
    expect(errs).toHaveLength(1);
    expect(errs[0].path).toBe('lines[0].additionalItemIdentifications.KUNYENO');
    expect(errs[0].message).toContain('19');
  });

  it('İKİNCİ künye eklendi → HATA (şematronun sayım deliği, e-Arşiv düzleminde de kapalı)', () => {
    const errs = validateHksKunyeNo(mutateEarsiv(ids =>
      [...ids, { schemeId: 'KUNYENO', value: 'KUN-2026-MTX66-KAB2' }],
    ));
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toContain('YALNIZ BİR');
  });

  it('🔴 strict kurulum FIRLATIR — InvoiceInput katmanı da e-Arşiv dalını görüyor', () => {
    const broken = mutateEarsiv(ids => ids.filter(a => a.schemeId !== 'KUNYENO'));
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(broken))
      .toThrow(/KUNYENO/);
  });

  it('sağlam fixture strict kurulumdan GEÇER', () => {
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' })
      .build(structuredClone(earsivHksSatis) as SimpleInvoiceInput)).not.toThrow();
  });

  it('mutasyon yardımcısı hedefini bulamazsa FIRLATIR', () => {
    expect(() => mutateEarsiv(() => {
      throw new Error('MUTASYON HEDEFİ BULUNAMADI: sınama');
    })).toThrow(/MUTASYON HEDEFİ BULUNAMADI/);
  });
});
