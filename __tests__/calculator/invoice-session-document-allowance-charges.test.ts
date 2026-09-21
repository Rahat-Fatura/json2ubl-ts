/**
 * BELGE DÜZEYİ MASRAF DÖRTLÜSÜ — `InvoiceSession` ekle/güncelle/sil/topluca-kur.
 *
 * ## Niye bu dosya var
 *
 * `documentAllowanceCharges` yüzeyi (`update(SessionPaths.documentAllowanceCharge…)`)
 * geçen turda kuruldu ama diziye eleman EKLEME/SİLME yolu yoktu: `update()`
 * YALNIZ var olan indeksi yazar. Portal turu diziyi `initialInput`tan kurmak
 * zorunda kalırdı — yani kullanıcı ekranda masraf kalemi ekleyemezdi.
 *
 * ## 🔴 Burada ölçülen İKİ ayrı şey var
 *
 * 1. **Dörtlünün kendisi** — sıra, no-op, `ChargeTotalAmount`a yansıma.
 * 2. **Kapıların atlatılamadığı** — geçen turun HKS doğrulayıcısı
 *    (`validateHksCharges`) `initialInput` yolunda ölçülmüştü. Yeni EKLEME
 *    yolu ikinci bir kapıdır ve aynı denetime bağlı olmak ZORUNDA. Bu düzlemde
 *    şematron SIFIR kural taşır; kapı atlanırsa belge GİB'e gider, KABUL
 *    EDİLİR ve hata ancak mal sahibine yanlış tutar ödendiğinde görünür.
 */

import { describe, it, expect, vi } from 'vitest';
import { InvoiceSession } from '../../src';
import { HKS_CHARGE_CODES } from '../../src/ubltr/vocabulary/hks-charge-codes';
import type {
  SimpleInvoiceInput,
  SimpleDocumentAllowanceChargeInput,
} from '../../src/calculator/simple-types';

const SENDER = {
  taxNumber: '1234567890',
  name: 'Matrix Komisyoncu Hal',
  taxOffice: 'Beşiktaş',
  address: 'Levent Mah. No:42',
  district: 'Beşiktaş',
  city: 'İstanbul',
};

const CUSTOMER = {
  taxNumber: '9876543210',
  name: 'Matrix Test Alıcı Ltd.',
  taxOffice: 'Kadıköy',
  address: 'Bağdat Cad. No:100',
  district: 'Kadıköy',
  city: 'İstanbul',
};

/** Künye 19 hane olmak ZORUNDA (şematron `HKSInvioceCheck`). */
const KUNYENO = 'KUN-2026-MTXTS-BIB1';

/** HKS komisyoncu düzlemi — masraf kapısının AÇIK olduğu tek yer. */
function hksInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'MTX2026000000999',
    uuid: 'a1000999-0001-4000-8001-000000000999',
    datetime: '2026-04-24T10:00:00',
    profile: 'HKS',
    type: 'KOMISYONCU',
    currencyCode: 'TRY',
    sender: { ...SENDER },
    customer: { ...CUSTOMER },
    lines: [{
      name: 'Biber — Komisyon satış',
      quantity: 200,
      price: 15, // LineExtension = 3000
      unitCode: 'KGM',
      kdvPercent: 10,
      additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: KUNYENO }],
    }],
    ...overrides,
  };
}

function hksSession(overrides: Partial<SimpleInvoiceInput> = {}): InvoiceSession {
  return new InvoiceSession({ initialInput: hksInput(overrides) });
}

const charge = (
  reason: string,
  extra: Partial<SimpleDocumentAllowanceChargeInput> = {},
): SimpleDocumentAllowanceChargeInput => ({ reason, chargeIndicator: false, ...extra });

/** Oturumun masraf dizisini kısa yoldan okur. */
const reasonsOf = (s: InvoiceSession): (string | undefined)[] =>
  (s.input.documentAllowanceCharges ?? []).map(c => c.reason);

// ─── Dörtlü ────────────────────────────────────────────────────────────────

describe('Masraf dörtlüsü — ekle', () => {
  it('alan HİÇ kurulmamışken bile ilk kalem eklenir', () => {
    const session = hksSession();
    expect(session.input.documentAllowanceCharges).toBeUndefined();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    expect(session.input.documentAllowanceCharges).toEqual([
      { reason: 'HKSKOMISYON', chargeIndicator: false, amount: 240 },
    ]);
  });

  it('olay `lines` desenini izler — `{ index, documentAllowanceCharge }`', () => {
    const session = hksSession();
    const seen: unknown[] = [];
    session.on('document-allowance-charge-added', p => seen.push(p));
    const item = charge('HKSNAVLUN', { amount: 150 });
    session.addDocumentAllowanceCharge(item);
    expect(seen).toEqual([{ index: 0, documentAllowanceCharge: item }]);
  });

  it('ekleme her zaman SONA yazar', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 1 }));
    session.addDocumentAllowanceCharge(charge('HKSNAVLUN', { amount: 2 }));
    session.addDocumentAllowanceCharge(charge('HKSRUSUM', { amount: 3 }));
    expect(reasonsOf(session)).toEqual(['HKSKOMISYON', 'HKSNAVLUN', 'HKSRUSUM']);
  });

  it('`changed` zinciri tetiklenir', () => {
    const session = hksSession();
    const spy = vi.fn();
    session.on('changed', spy);
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 10 }));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('Masraf dörtlüsü — güncelle', () => {
  it('kısmi güncelleme BİRLEŞTİRİR, diğer alanları korur', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { percent: 8, amount: 240 }));
    session.updateDocumentAllowanceCharge(0, { amount: 300 });
    expect(session.input.documentAllowanceCharges?.[0]).toEqual({
      reason: 'HKSKOMISYON', chargeIndicator: false, percent: 8, amount: 300,
    });
  });

  it('olay BİRLEŞTİRİLMİŞ kalemi taşır', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    const seen: unknown[] = [];
    session.on('document-allowance-charge-updated', p => seen.push(p));
    session.updateDocumentAllowanceCharge(0, { amount: 250 });
    expect(seen).toEqual([{
      index: 0,
      documentAllowanceCharge: { reason: 'HKSKOMISYON', chargeIndicator: false, amount: 250 },
    }]);
  });

  it.each([-1, 1, 99])('🔴 geçersiz indeks %s SESSİZCE yok sayılır (`updateLine` deseni)', idx => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    const before = session.input.documentAllowanceCharges;
    const spy = vi.fn();
    session.on('changed', spy);
    session.on('document-allowance-charge-updated', spy);
    session.updateDocumentAllowanceCharge(idx, { amount: 999 });
    expect(spy).not.toHaveBeenCalled();
    expect(session.input.documentAllowanceCharges).toBe(before);
  });

  it('alan hiç kurulmamışken güncelleme no-op', () => {
    const session = hksSession();
    const spy = vi.fn();
    session.on('changed', spy);
    session.updateDocumentAllowanceCharge(0, { amount: 1 });
    expect(spy).not.toHaveBeenCalled();
    expect(session.input.documentAllowanceCharges).toBeUndefined();
  });
});

describe('Masraf dörtlüsü — sil', () => {
  it('olay YALNIZ `{ index }` taşır', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    const seen: unknown[] = [];
    session.on('document-allowance-charge-removed', p => seen.push(p));
    session.removeDocumentAllowanceCharge(0);
    expect(seen).toEqual([{ index: 0 }]);
    expect(session.input.documentAllowanceCharges).toEqual([]);
  });

  it.each([-1, 1, 99])('🔴 geçersiz indeks %s SESSİZCE yok sayılır', idx => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    const before = session.input.documentAllowanceCharges;
    const spy = vi.fn();
    session.on('changed', spy);
    session.removeDocumentAllowanceCharge(idx);
    expect(spy).not.toHaveBeenCalled();
    expect(session.input.documentAllowanceCharges).toBe(before);
  });
});

describe('Masraf dörtlüsü — topluca kur', () => {
  it('diziyi tümüyle değiştirir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 1 }));
    session.setDocumentAllowanceCharges([
      charge('HKSNAVLUN', { amount: 2 }),
      charge('HKSRUSUM', { amount: 3 }),
    ]);
    expect(reasonsOf(session)).toEqual(['HKSNAVLUN', 'HKSRUSUM']);
  });

  it('OLAY YAYMAZ ama `changed` tetikler (`setLines` deseni)', () => {
    const session = hksSession();
    const itemEvents: string[] = [];
    for (const e of [
      'document-allowance-charge-added',
      'document-allowance-charge-updated',
      'document-allowance-charge-removed',
    ]) {
      session.on(e, () => itemEvents.push(e));
    }
    let changed = 0;
    session.on('changed', () => { changed += 1; });
    session.setDocumentAllowanceCharges([charge('HKSKOMISYON', { amount: 5 })]);
    expect(itemEvents).toEqual([]);
    expect(changed).toBe(1);
  });

  it('boş dizi ile temizlenir ve `ChargeTotalAmount` XML\'den DÜŞER', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    expect(session.buildXml()).toContain('<cbc:ChargeTotalAmount');
    session.setDocumentAllowanceCharges([]);
    expect(session.buildXml()).not.toContain('<cbc:ChargeTotalAmount');
  });
});

// ─── 🔴 SIRA ANLAMLIDIR ────────────────────────────────────────────────────

describe('🔴 SIRA korunur — GİB `for-each` BELGE sırasını izler', () => {
  it('silme kaydırır, yeniden SIRALAMAZ', () => {
    const session = hksSession();
    for (const code of ['HKSKOMISYON', 'HKSNAVLUN', 'HKSRUSUM', 'HKSDIGERMASRAFLAR']) {
      session.addDocumentAllowanceCharge(charge(code, { amount: 10 }));
    }
    session.removeDocumentAllowanceCharge(1);
    expect(reasonsOf(session)).toEqual(['HKSKOMISYON', 'HKSRUSUM', 'HKSDIGERMASRAFLAR']);
  });

  it('XML sırası girdi sırasını BİREBİR izler — 18 kod', () => {
    const session = hksSession();
    for (const code of HKS_CHARGE_CODES) {
      session.addDocumentAllowanceCharge(charge(code, { amount: 10 }));
    }
    const xml = session.buildXml({ validationLevel: 'strict' });
    const reasons = [...xml.matchAll(/<cbc:AllowanceChargeReason>([^<]+)<\/cbc:AllowanceChargeReason>/g)]
      .map(m => m[1]);
    expect(reasons).toEqual([...HKS_CHARGE_CODES]);
  });

  it('🔴 "Masraflar:" başlığını taşıyan `HKSKOMISYON` silinirse BAŞLIK KAYBOLUR', () => {
    /* GİB'in `general.xslt`inde tablo başlığı `HKSKOMISYON` dalına gömülüdür:
     * komisyon kalemi yoksa başlık HİÇ çıkmaz. Dörtlü bunu gizlemez —
     * çağıranın gördüğü şey gerçeğin kendisidir. */
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 10 }));
    session.addDocumentAllowanceCharge(charge('HKSNAVLUN', { amount: 20 }));
    session.removeDocumentAllowanceCharge(0);
    expect(reasonsOf(session)).toEqual(['HKSNAVLUN']);
    expect(reasonsOf(session)).not.toContain('HKSKOMISYON');
  });

  it('ortadan silip sona ekleme SIRAYI DEĞİŞTİRİR — ve bu görünür olmalıdır', () => {
    const session = hksSession();
    for (const code of ['HKSKOMISYON', 'HKSNAVLUN', 'HKSRUSUM']) {
      session.addDocumentAllowanceCharge(charge(code, { amount: 10 }));
    }
    session.removeDocumentAllowanceCharge(1);
    session.addDocumentAllowanceCharge(charge('HKSNAVLUN', { amount: 10 }));
    expect(reasonsOf(session)).toEqual(['HKSKOMISYON', 'HKSRUSUM', 'HKSNAVLUN']);
  });
});

// ─── Toplam zincirine yansıma ──────────────────────────────────────────────

describe('Eklenen kalem `ChargeTotalAmount`a YANSIR', () => {
  it('ekleme toplamı büyütür, silme geri alır', () => {
    const session = hksSession();
    /* Kalem YOKKEN alan hiç KURULMAZ (`undefined`) — sıfır değil. Bu bilinçli:
     * `ChargeTotalAmount` yalnız kalem varsa XML'e yazılır. */
    expect(session.calculate().monetary.chargeTotalAmount).toBeUndefined();

    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    expect(session.calculate().monetary.chargeTotalAmount).toBeCloseTo(240, 2);

    session.addDocumentAllowanceCharge(charge('HKSNAVLUN', { amount: 150 }));
    expect(session.calculate().monetary.chargeTotalAmount).toBeCloseTo(390, 2);

    session.removeDocumentAllowanceCharge(0);
    expect(session.calculate().monetary.chargeTotalAmount).toBeCloseTo(150, 2);
  });

  it('🔴 TERS İŞARET korunur — toplam ödenecekten DÜŞÜLÜR', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { percent: 8 }));      // 3000 × %8 = 240
    session.addDocumentAllowanceCharge(charge('HKSNAVLUN', { amount: 150 }));
    session.addDocumentAllowanceCharge(charge('HKSTICBORSASI', { percent: 0.15 })); // 4,50

    const calc = session.calculate();
    expect(calc.monetary.taxInclusiveAmount).toBeCloseTo(3300, 2);
    expect(calc.monetary.chargeTotalAmount).toBeCloseTo(394.5, 2);
    expect(calc.monetary.payableAmount).toBeCloseTo(2905.5, 2);
    expect(calc.monetary.payableAmount).not.toBeCloseTo(3694.5, 2);
  });

  it('`calculated` olayı güncel toplamı taşır', () => {
    const session = hksSession();
    const totals: number[] = [];
    session.on('calculated', c => totals.push(c.monetary.chargeTotalAmount));
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    session.addDocumentAllowanceCharge(charge('HKSNAVLUN', { amount: 60 }));
    expect(totals).toEqual([240, 300]);
  });

  it('güncelleme toplamı yeniden hesaplar', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    session.updateDocumentAllowanceCharge(0, { amount: 100 });
    expect(session.calculate().monetary.chargeTotalAmount).toBeCloseTo(100, 2);
  });

  it('XML de güncel toplamı gösterir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 180 }));
    const xml = session.buildXml({ validationLevel: 'strict' });
    expect(xml).toContain('<cbc:ChargeTotalAmount currencyID="TRY">180.00</cbc:ChargeTotalAmount>');
    // 3300 − 180 = 3120
    expect(xml).toContain('<cbc:PayableAmount currencyID="TRY">3120.00</cbc:PayableAmount>');
  });
});

// ─── 🔴 KAPILAR ATLATILAMAZ ────────────────────────────────────────────────

/** Verilen alan için `severity:'error'` uyarısı var mı? */
function errorAt(session: InvoiceSession, field: string) {
  return session.validate().find(w => w.field === field && w.severity === 'error');
}

describe('🔴 Ekleme yolu geçen turun KAPILARINI atlatmaz', () => {
  it('kapalı küme dışı sebep — EKLEME yolunda da reddedilir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('KANTAR', { amount: 10 }));
    expect(errorAt(session, 'documentAllowanceCharges[0].reason')).toBeDefined();
  });

  it('`chargeIndicator=true` — EKLEME yolunda da reddedilir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge({ reason: 'HKSKOMISYON', chargeIndicator: true, amount: 10 });
    expect(errorAt(session, 'documentAllowanceCharges[0].chargeIndicator')).toBeDefined();
  });

  it('`chargeIndicator=true`ya GÜNCELLEME de reddedilir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 10 }));
    expect(errorAt(session, 'documentAllowanceCharges[0].chargeIndicator')).toBeUndefined();
    session.updateDocumentAllowanceCharge(0, { chargeIndicator: true });
    expect(errorAt(session, 'documentAllowanceCharges[0].chargeIndicator')).toBeDefined();
  });

  it('topluca-kur yolu da reddedilir', () => {
    const session = hksSession();
    session.setDocumentAllowanceCharges([
      charge('HKSKOMISYON', { amount: 10 }),
      charge('UYDURMA', { amount: 10 }),
    ]);
    expect(errorAt(session, 'documentAllowanceCharges[1].reason')).toBeDefined();
  });

  it('sebepsiz kalem reddedilir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge({ chargeIndicator: false, amount: 10 });
    expect(errorAt(session, 'documentAllowanceCharges[0].reason')).toBeDefined();
  });

  it('negatif tutar reddedilir — toplamı ters çevirirdi', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: -10 }));
    expect(errorAt(session, 'documentAllowanceCharges[0].amount')).toBeDefined();
  });

  it('🔴 DÜZLEM DIŞI kaçak kod — 18 kodun HEPSİ ekleme yolunda reddedilir', () => {
    for (const code of HKS_CHARGE_CODES) {
      // TICARIFATURA + SATIS: masraf düzlemi DEĞİL.
      const session = new InvoiceSession({
        initialInput: hksInput({ profile: 'TICARIFATURA', type: 'SATIS' }),
      });
      session.addDocumentAllowanceCharge(charge(code, { amount: 10 }));
      expect(
        errorAt(session, 'documentAllowanceCharges[0].reason'),
        `${code} düzlem dışında geçti`,
      ).toBeDefined();
    }
  });

  it('düzlem dışında SERBEST metin sebep hâlâ serbesttir', () => {
    const session = new InvoiceSession({
      initialInput: hksInput({ profile: 'TICARIFATURA', type: 'SATIS' }),
    });
    session.addDocumentAllowanceCharge(charge('Erken ödeme indirimi', { amount: 10 }));
    expect(errorAt(session, 'documentAllowanceCharges[0].reason')).toBeUndefined();
  });

  it.each(['9944', '8001'])(
    '🔴 ÇİFT SAYIM: %s satır vergisi masraf düzleminde reddedilir — masraf EKLENMESE DE',
    code => {
      const session = hksSession();
      session.updateLine(0, { taxes: [{ code, percent: 1 }] });
      expect(errorAt(session, 'lines[0].taxes[0].code')).toBeDefined();
    },
  );

  it.each(['9944', '8001'])(
    '🔴 ÇİFT SAYIM: %s satır vergisi + masraf ikizi BİRLİKTE de reddedilir',
    code => {
      const session = hksSession();
      session.addDocumentAllowanceCharge(
        charge(code === '9944' ? 'HKSRUSUM' : 'HKSTICBORSASI', { amount: 10 }),
      );
      session.updateLine(0, { taxes: [{ code, percent: 1 }] });
      expect(errorAt(session, 'lines[0].taxes[0].code')).toBeDefined();
    },
  );

  it('🔴 `buildXml` kapısı da bağlı — geçersiz kalem eklenince ÜRETİM DURUR', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('KANTAR', { amount: 10 }));
    expect(() => session.buildXml({ validationLevel: 'basic' })).toThrow();
    expect(() => session.buildXml({ validationLevel: 'strict' })).toThrow();
  });

  it('geçerli blok her iki yolda da TEMİZ geçer', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { percent: 8 }));
    expect(session.validate().filter(w => w.severity === 'error')).toEqual([]);
    expect(() => session.buildXml({ validationLevel: 'strict' })).not.toThrow();
  });
});

// ─── Yüzey ─────────────────────────────────────────────────────────────────

describe('Yüzey — yol tabanlı `update()` ile dörtlü AYNI diziyi görür', () => {
  it('ekle → `update(SessionPaths…)` → oku zinciri tutarlı', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 240 }));
    session.update('documentAllowanceCharges[0].amount', 300);
    expect(session.input.documentAllowanceCharges?.[0].amount).toBe(300);
    expect(session.calculate().monetary.chargeTotalAmount).toBeCloseTo(300, 2);
  });

  /* ── ÖLÇÜLDÜ: `update()` dizi YARATABİLİR, ama EKSİK yaratır ────────────
   *
   * `checkIndexBounds` iki bilinçli gevşeme taşır (path-gates.ts §Katman 4):
   * üst dizi tanımsız + `index === 0`, ve `index === length` (sona ekleme).
   * Yani `update('documentAllowanceCharges[0].amount', 100)` REDDEDİLMEZ —
   * `applyPathUpdate` diziyi kendisi yaratır. Bu `lines` için de aynen
   * böyledir, yani dörtlüden GELMEYEN bir davranıştır.
   *
   * 🔴 Ama yarattığı şey EKSİKTİR: `{ amount: 100 }` — ne `reason` ne
   * `chargeIndicator`. Dörtlü bu yüzden vardır: TAM kalem yazar. Ve kapı
   * eksik kalemi yakalar, yani gevşeme bir KAÇIŞ YOLU DEĞİLDİR. */
  it('🔴 `update()` ile yaratılan EKSİK kalemi kapı YAKALAR', () => {
    const session = hksSession();
    const errors: unknown[] = [];
    session.on('path-error', e => errors.push(e));
    session.update('documentAllowanceCharges[0].amount', 100);

    // Gevşeme gereği reddedilmez ve dizi yaratılır…
    expect(errors).toEqual([]);
    expect(session.input.documentAllowanceCharges).toEqual([{ amount: 100 }]);
    // …ama kalem sebepsizdir ve HKS kapısı belgeyi geçirmez.
    expect(errorAt(session, 'documentAllowanceCharges[0].reason')).toBeDefined();
    expect(() => session.buildXml({ validationLevel: 'basic' })).toThrow();
  });

  it('🔴 `update()` SEYREK dizi açamaz — `> length` reddedilir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 10 }));
    const errors: Array<{ code?: string }> = [];
    session.on('path-error', e => errors.push(e as { code?: string }));
    session.update('documentAllowanceCharges[5].amount', 100);
    expect(errors.map(e => e.code)).toEqual(['INDEX_OUT_OF_BOUNDS']);
    expect(session.input.documentAllowanceCharges).toHaveLength(1);
  });

  it('silme sonrası kaydırılan indeks `update()` ile yazılabilir', () => {
    const session = hksSession();
    session.addDocumentAllowanceCharge(charge('HKSKOMISYON', { amount: 10 }));
    session.addDocumentAllowanceCharge(charge('HKSNAVLUN', { amount: 20 }));
    session.removeDocumentAllowanceCharge(0);
    session.update('documentAllowanceCharges[0].amount', 99);
    expect(session.input.documentAllowanceCharges).toEqual([
      { reason: 'HKSNAVLUN', chargeIndicator: false, amount: 99 },
    ]);
  });
});
