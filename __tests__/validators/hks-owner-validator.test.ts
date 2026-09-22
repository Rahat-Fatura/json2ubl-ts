/**
 * hks-owner-validator — HKS mal sahibi (`MALSAHIBI*`) alanları.
 *
 * 🔴 K9 (2026-09-22) ile şiddet DEĞİŞTİ: satış ikizinde (`HKS+SATIS`,
 * `EARSIVFATURA+HKSSATIS`) alanlar UYARI değil HATA'dır ve belge kurulumunu
 * KIRAR. Diğer HKS tiplerinde tutarlılık uyarısı olduğu gibi kalır.
 *
 * Bu dosya İKİ ŞEYİ birden ölçer:
 *   1. Kapsam — hangi profil×tip çiftinde hangi şiddet koşar.
 *   2. MUTASYON — sağlam bir belgeden tek bir alan sökülünce kapı GERÇEKTEN
 *      kırmızıya dönüyor mu. Mutasyon yardımcıları hedeflerini bulamazsa
 *      FIRLATIR: yanlış eksene çarpan bir mutasyon "sahte yeşil" verirdi.
 */

import { describe, it, expect } from 'vitest';
import {
  validateHksOwnerFields,
  validateHksOwnerRequired,
} from '../../src/documents/invoice/validators/hks-owner-validator';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SimpleInvoiceBuilder } from '../../src';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

const VALID_KUNYENO = 'KUN-2026-042-DOM001';
const OWNER_NAME = 'MALSAHIBIADSOYADUNVAN';
const OWNER_TAX = 'MALSAHIBIVKNTCKN';

function line(ids: Array<{ schemeId: string; value: string }>): SimpleLineInput {
  return {
    name: 'Domates', quantity: 100, price: 10, unitCode: 'KGM', kdvPercent: 10,
    additionalItemIdentifications: ids,
  };
}

/** Künye HER ZAMAN dolu — burada ölçülen mal sahibi alanları, künye değil. */
function ownerLine(owner: Array<{ schemeId: string; value: string }>): SimpleLineInput {
  return line([{ schemeId: 'KUNYENO', value: VALID_KUNYENO }, ...owner]);
}

/** GİB'in `HKS-Ornek1.xml`indeki gibi TAM üçlü taşıyan satır. */
function completeLine(): SimpleLineInput {
  return ownerLine([
    { schemeId: OWNER_NAME, value: 'Ahmet Yılmaz' },
    { schemeId: OWNER_TAX, value: '12345678901' },
  ]);
}

function baseInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'MTX2026000000063',
    uuid: 'e1a2b3c4-0000-4000-8000-000000000001',
    datetime: '2026-04-24T10:00:00',
    profile: 'HKS',
    type: 'SATIS',
    currencyCode: 'TRY',
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    lines: [completeLine()],
    ...overrides,
  };
}

/* ───────────────────────── Mutasyon yardımcıları ─────────────────────────
 * 🔴 Hedefini bulamazsa FIRLATIRLAR. Bir mutasyon testi yanlış eksene çarpıp
 * "sahte yeşil" verdiğinde kimse fark etmez; fırlatma o sessizliği kapatır. */

function mutateIdentifications(
  input: SimpleInvoiceInput,
  lineIndex: number,
  change: (ids: Array<{ schemeId: string; value: string }>) => Array<{ schemeId: string; value: string }>,
): SimpleInvoiceInput {
  const clone = structuredClone(input) as SimpleInvoiceInput;
  const target = clone.lines[lineIndex];
  if (!target) throw new Error(`MUTASYON HEDEFİ YOK: lines[${lineIndex}]`);
  const ids = target.additionalItemIdentifications;
  if (!ids) throw new Error(`MUTASYON HEDEFİ YOK: lines[${lineIndex}].additionalItemIdentifications`);
  target.additionalItemIdentifications = change(ids as Array<{ schemeId: string; value: string }>);
  return clone;
}

/** Belirli bir şemayı SÖKER; o şema satırda yoksa fırlatır. */
function withoutScheme(input: SimpleInvoiceInput, lineIndex: number, schemeId: string): SimpleInvoiceInput {
  return mutateIdentifications(input, lineIndex, (ids) => {
    const next = ids.filter(a => a.schemeId !== schemeId);
    if (next.length === ids.length) throw new Error(`MUTASYON HEDEFİ BULUNAMADI: ${schemeId}`);
    return next;
  });
}

/** Belirli bir şemanın DEĞERİNİ değiştirir; o şema satırda yoksa fırlatır. */
function withSchemeValue(
  input: SimpleInvoiceInput, lineIndex: number, schemeId: string, value: string,
): SimpleInvoiceInput {
  let hit = 0;
  const out = mutateIdentifications(input, lineIndex, (ids) =>
    ids.map(a => (a.schemeId === schemeId ? (hit++, { ...a, value }) : a)),
  );
  if (hit === 0) throw new Error(`MUTASYON HEDEFİ BULUNAMADI: ${schemeId}`);
  return out;
}

/* ═════════════════════════════ ZORUNLULUK ═══════════════════════════════ */

describe('validateHksOwnerRequired — K9 zorunluluğu (HATA)', () => {
  it('tam üçlü → hata yok', () => {
    expect(validateHksOwnerRequired(baseInput())).toHaveLength(0);
  });

  describe('MUTASYON — sağlam belgeden tek alan sökülür', () => {
    it('mal sahibi adı SÖKÜLDÜ → HATA', () => {
      const errs = validateHksOwnerRequired(withoutScheme(baseInput(), 0, OWNER_NAME));
      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe('PROFILE_REQUIREMENT');
      expect(errs[0].path).toBe(`lines[0].additionalItemIdentifications.${OWNER_NAME}`);
      expect(errs[0].message).toContain(OWNER_NAME);
      expect(errs[0].message).toContain('zorunludur');
    });

    it('mal sahibi VKN/TCKN SÖKÜLDÜ → HATA', () => {
      const errs = validateHksOwnerRequired(withoutScheme(baseInput(), 0, OWNER_TAX));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe(`lines[0].additionalItemIdentifications.${OWNER_TAX}`);
      expect(errs[0].message).toContain(OWNER_TAX);
    });

    it('İKİSİ de söküldü → İKİ HATA (eski davranış burada SESSİZDİ)', () => {
      let input = withoutScheme(baseInput(), 0, OWNER_NAME);
      input = withoutScheme(input, 0, OWNER_TAX);
      const errs = validateHksOwnerRequired(input);
      expect(errs).toHaveLength(2);
    });

    it('mal sahibi adı BOŞLUĞA çevrildi → HATA (normalize-space taklidi)', () => {
      const errs = validateHksOwnerRequired(withSchemeValue(baseInput(), 0, OWNER_NAME, '   '));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toContain(OWNER_NAME);
    });

    it.each([
      ['9 hane', '123456789'],
      ['12 hane', '123456789012'],
      ['harf içeren', '1234567A90'],
    ])('VKN/TCKN %s → HATA', (_label, value) => {
      const errs = validateHksOwnerRequired(withSchemeValue(baseInput(), 0, OWNER_TAX, value));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe(`lines[0].additionalItemIdentifications.${OWNER_TAX}`);
      expect(errs[0].message).toContain('10 (VKN) veya 11 (TCKN)');
    });

    it.each([['10 hane VKN', '1234567890'], ['11 hane TCKN', '12345678901']])(
      'VKN/TCKN %s → hata yok', (_label, value) => {
        expect(validateHksOwnerRequired(withSchemeValue(baseInput(), 0, OWNER_TAX, value))).toHaveLength(0);
      },
    );

    it('🔴 mutasyon yardımcısı hedefini bulamazsa FIRLATIR (sahte yeşil kapısı)', () => {
      expect(() => withoutScheme(baseInput(), 0, 'YOK_BOYLE_BIR_SEMA')).toThrow(/MUTASYON HEDEFİ BULUNAMADI/);
      expect(() => withSchemeValue(baseInput(), 9, OWNER_TAX, 'x')).toThrow(/MUTASYON HEDEFİ YOK/);
    });
  });

  describe('Kapsam — GİB general.xslt mal sahibi kolonlarının kapısı', () => {
    const stripped = () => [withoutScheme(baseInput(), 0, OWNER_NAME).lines[0]];

    it('HKS + SATIS → ZORUNLU', () => {
      expect(validateHksOwnerRequired(baseInput({ lines: stripped() }))).toHaveLength(1);
    });

    it('EARSIVFATURA + HKSSATIS → ZORUNLU (e-Arşiv ikizi)', () => {
      const input = baseInput({ profile: 'EARSIVFATURA', type: 'HKSSATIS', lines: stripped() });
      expect(validateHksOwnerRequired(input)).toHaveLength(1);
    });

    it.each([
      ['HKS + KOMISYONCU', 'HKS', 'KOMISYONCU'],
      ['EARSIVFATURA + HKSKOMISYONCU', 'EARSIVFATURA', 'HKSKOMISYONCU'],
      ['HKS + TEVKIFAT', 'HKS', 'TEVKIFAT'],
      ['HKS + ISTISNA', 'HKS', 'ISTISNA'],
      ['EARSIVFATURA + SATIS (HKS değil)', 'EARSIVFATURA', 'SATIS'],
      ['TEMELFATURA + SATIS', 'TEMELFATURA', 'SATIS'],
    ])('%s → ZORUNLU DEĞİL', (_label, profile, type) => {
      expect(validateHksOwnerRequired(baseInput({ profile, type, lines: stripped() }))).toHaveLength(0);
    });
  });

  describe('Çok kalemli belge', () => {
    it('yalnız kusurlu satır raporlanır ve satır numarası verilir', () => {
      const input = baseInput({ lines: [completeLine(), completeLine()] });
      const mutated = withoutScheme(input, 1, OWNER_TAX);
      const errs = validateHksOwnerRequired(mutated);
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toContain('lines[1]');
      expect(errs[0].message).toContain('Satır 2');
    });
  });
});

/* ═════════════════════════════ TUTARLILIK ═══════════════════════════════ */

describe('validateHksOwnerFields — tutarlılık UYARISI', () => {
  /** Zorunluluk kapsamı DIŞINDA bir HKS tipi. */
  const outOfRequiredScope = (lines: SimpleLineInput[]) =>
    baseInput({ type: 'TEVKIFAT', lines });

  it('ikisi de yok → uyarı yok (bu kapsamda alanlar zorunlu DEĞİL)', () => {
    expect(validateHksOwnerFields(outOfRequiredScope([ownerLine([])]))).toHaveLength(0);
  });

  it('yalnız ad var → UYARI', () => {
    const warns = validateHksOwnerFields(outOfRequiredScope([
      ownerLine([{ schemeId: OWNER_NAME, value: 'Ahmet Yılmaz' }]),
    ]));
    expect(warns).toHaveLength(1);
    expect(warns[0].severity).toBe('warning');
    expect(warns[0].message).toContain(OWNER_TAX);
    /* 🔑 Yaprak KÜTÜPHANEDEN gelir: eksik olan alan hangisiyse yol onu gösterir.
     * Portal bunu künt yoldan kendi türetiyordu ve o köprü satırdaki KÜNYE
     * uyarısını da yakalayıp mal sahibi alanına yönlendirebiliyordu. */
    expect(warns[0].field).toBe(`lines[0].additionalItemIdentifications.${OWNER_TAX}`);
  });

  it('yalnız VKN/TCKN var → UYARI', () => {
    const warns = validateHksOwnerFields(outOfRequiredScope([
      ownerLine([{ schemeId: OWNER_TAX, value: '12345678901' }]),
    ]));
    expect(warns).toHaveLength(1);
    expect(warns[0].severity).toBe('warning');
    expect(warns[0].message).toContain(OWNER_NAME);
    expect(warns[0].field).toBe(`lines[0].additionalItemIdentifications.${OWNER_NAME}`);
  });

  it('bozuk hane → UYARI', () => {
    const warns = validateHksOwnerFields(outOfRequiredScope([
      ownerLine([
        { schemeId: OWNER_NAME, value: 'Yılmaz Tarım Ltd.' },
        { schemeId: OWNER_TAX, value: '123456789' },
      ]),
    ]));
    expect(warns).toHaveLength(1);
    expect(warns[0].field).toBe(`lines[0].additionalItemIdentifications.${OWNER_TAX}`);
  });

  it('🔑 ZORUNLULUK kapsamında SUSAR — aynı ihlal iki dille söylenmez', () => {
    const halfFilled = [ownerLine([{ schemeId: OWNER_NAME, value: 'Ahmet Yılmaz' }])];
    // HKS+SATIS: burada kural HATA olarak koşar
    expect(validateHksOwnerFields(baseInput({ lines: halfFilled }))).toHaveLength(0);
    expect(validateHksOwnerRequired(baseInput({ lines: halfFilled }))).toHaveLength(1);
  });

  it.each([
    ['HKS + KOMISYONCU', 'HKS', 'KOMISYONCU'],
    ['EARSIVFATURA + HKSKOMISYONCU', 'EARSIVFATURA', 'HKSKOMISYONCU'],
    ['TEMELFATURA + SATIS', 'TEMELFATURA', 'SATIS'],
  ])('%s → KAPSAM DIŞI', (_label, profile, type) => {
    const input = baseInput({
      profile, type,
      lines: [ownerLine([{ schemeId: OWNER_NAME, value: 'Ahmet Yılmaz' }])],
    });
    expect(validateHksOwnerFields(input)).toHaveLength(0);
  });
});

/* ══════════════════════ KAPI GERÇEKTEN KAPANIYOR MU ═════════════════════ */

describe('Kapı ölçümü — hata belgeyi GERÇEKTEN kırıyor', () => {
  it('InvoiceSession.validate() severity=error yayar (portalın gönderim kapısı bunu sayar)', () => {
    const session = new InvoiceSession({
      initialInput: withoutScheme(baseInput(), 0, OWNER_TAX),
    });
    const owner = session.validate().filter(w => w.message.includes('mal sahibi'));
    expect(owner).toHaveLength(1);
    expect(owner[0].severity).toBe('error');
    expect(owner[0].code).toBe('PROFILE_REQUIREMENT');
  });

  it('tam üçlüde severity=error YOK', () => {
    const session = new InvoiceSession({ initialInput: baseInput() });
    expect(session.validate().filter(w => w.message.includes('mal sahibi'))).toHaveLength(0);
  });

  it('🔴 strict kurulum FIRLATIR — eski davranışta kurulum geçiyordu', () => {
    const broken = withoutScheme(baseInput(), 0, OWNER_NAME);
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(broken))
      .toThrow(/MALSAHIBIADSOYADUNVAN/);
  });

  it('tam üçlüde strict kurulum GEÇER', () => {
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(baseInput()))
      .not.toThrow();
  });

  it('basic kurulum kırılmaz — mevcut tüketiciler etkilenmez', () => {
    const broken = withoutScheme(baseInput(), 0, OWNER_NAME);
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'basic' }).build(broken))
      .not.toThrow();
  });

  it('HKS + KOMISYONCU strict kurulum GEÇER — kapı komisyoncuda açılmaz', () => {
    const komisyoncu = baseInput({ type: 'KOMISYONCU', lines: [ownerLine([])] });
    expect(() => new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(komisyoncu))
      .not.toThrow();
  });
});
