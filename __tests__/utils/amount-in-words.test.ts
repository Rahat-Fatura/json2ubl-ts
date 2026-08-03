/**
 * v3.0.0 — `#YAZIYLA:...#` not biçimlendirme testleri.
 *
 * Biçim kararlarının (kesir hanesi, sıfır tutar, negatif, bilinmeyen kur)
 * her biri ayrı test olarak kilitlenmiştir.
 */

import { describe, it, expect } from 'vitest';
import {
  formatAmountInWordsNote,
  isAmountInWordsNote,
  AMOUNT_IN_WORDS_PREFIX,
  AMOUNT_IN_WORDS_SUFFIX,
} from '../../src/utils/amount-in-words';
import {
  getAmountInWordsUnits,
  AMOUNT_IN_WORDS_UNITS,
  DEFAULT_MINOR_UNIT,
} from '../../src/config/amount-in-words-config';
import { formatDecimal } from '../../src/utils/formatters';

describe('formatAmountInWordsNote — kullanıcının referans örneği', () => {
  it('182,20 TRY → #YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#', () => {
    expect(formatAmountInWordsNote(182.2, 'TRY')).toBe(
      '#YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#',
    );
  });

  it('not # ile başlar ve # ile biter', () => {
    const note = formatAmountInWordsNote(1, 'TRY')!;
    expect(note.startsWith(AMOUNT_IN_WORDS_PREFIX)).toBe(true);
    expect(note.endsWith(AMOUNT_IN_WORDS_SUFFIX)).toBe(true);
  });

  it('tam sayı YAZIYLA, kesir RAKAMLA yazılır', () => {
    expect(formatAmountInWordsNote(1234.56, 'TRY')).toBe(
      '#YAZIYLA:BİN İKİ YÜZ OTUZ DÖRT LİRA 56 KURUŞ#',
    );
  });
});

describe('formatAmountInWordsNote — KARAR: kesir her zaman İKİ HANE, sıfır dolgulu', () => {
  it('182,05 → "05 KURUŞ" (❌ "5 KURUŞ")', () => {
    expect(formatAmountInWordsNote(182.05, 'TRY')).toBe(
      '#YAZIYLA:YÜZ SEKSEN İKİ LİRA 05 KURUŞ#',
    );
  });

  it('0,01 → "01 KURUŞ"', () => {
    expect(formatAmountInWordsNote(0.01, 'TRY')).toBe('#YAZIYLA:SIFIR LİRA 01 KURUŞ#');
  });

  it('kesir kelimeye çevrilmez — rakam olarak kalır', () => {
    expect(formatAmountInWordsNote(1.2, 'TRY')).toBe('#YAZIYLA:BİR LİRA 20 KURUŞ#');
    expect(formatAmountInWordsNote(1.2, 'TRY')).not.toContain('YİRMİ KURUŞ');
  });
});

describe('formatAmountInWordsNote — KARAR: kuruş sıfır olsa da kesir kısmı YAZILIR', () => {
  it('182,00 → "... LİRA 00 KURUŞ" (kesir atlanmaz)', () => {
    expect(formatAmountInWordsNote(182, 'TRY')).toBe(
      '#YAZIYLA:YÜZ SEKSEN İKİ LİRA 00 KURUŞ#',
    );
  });

  it('14550,00 → gerçek Mimsoft tutarı, sabit biçimle', () => {
    expect(formatAmountInWordsNote(14550, 'TRY')).toBe(
      '#YAZIYLA:ON DÖRT BİN BEŞ YÜZ ELLİ LİRA 00 KURUŞ#',
    );
  });
});

describe('formatAmountInWordsNote — KARAR: sıfır tutar SIFIR olarak okunur', () => {
  it('0,00 → #YAZIYLA:SIFIR LİRA 00 KURUŞ#', () => {
    expect(formatAmountInWordsNote(0, 'TRY')).toBe('#YAZIYLA:SIFIR LİRA 00 KURUŞ#');
  });

  it('sıfır tutarda not yine de üretilir (koşulsuz)', () => {
    expect(formatAmountInWordsNote(0, 'TRY')).not.toBeNull();
  });

  it('-0 → EKSİ almaz', () => {
    expect(formatAmountInWordsNote(-0, 'TRY')).toBe('#YAZIYLA:SIFIR LİRA 00 KURUŞ#');
  });
});

describe('formatAmountInWordsNote — KARAR: negatif tutar EKSİ öneki alır', () => {
  it('-182,20 → #YAZIYLA:EKSİ YÜZ SEKSEN İKİ LİRA 20 KURUŞ#', () => {
    expect(formatAmountInWordsNote(-182.2, 'TRY')).toBe(
      '#YAZIYLA:EKSİ YÜZ SEKSEN İKİ LİRA 20 KURUŞ#',
    );
  });

  it('işaret sessizce yutulmaz', () => {
    expect(formatAmountInWordsNote(-1, 'TRY')).toContain('EKSİ');
  });

  it('yuvarlama sonrası sıfırlanan negatif EKSİ ALMAZ (-0,001 → SIFIR)', () => {
    expect(formatAmountInWordsNote(-0.001, 'TRY')).toBe('#YAZIYLA:SIFIR LİRA 00 KURUŞ#');
  });
});

describe('formatAmountInWordsNote — para birimine göre birim adları', () => {
  it('TRY → LİRA / KURUŞ', () => {
    expect(formatAmountInWordsNote(2.5, 'TRY')).toBe('#YAZIYLA:İKİ LİRA 50 KURUŞ#');
  });

  it('USD → DOLAR / SENT', () => {
    expect(formatAmountInWordsNote(2.5, 'USD')).toBe('#YAZIYLA:İKİ DOLAR 50 SENT#');
  });

  it('EUR → EURO / SENT', () => {
    expect(formatAmountInWordsNote(2.5, 'EUR')).toBe('#YAZIYLA:İKİ EURO 50 SENT#');
  });

  it('GBP → STERLİN / PENİ', () => {
    expect(formatAmountInWordsNote(2.5, 'GBP')).toBe('#YAZIYLA:İKİ STERLİN 50 PENİ#');
  });

  it('küçük harf kod da tanınır', () => {
    expect(formatAmountInWordsNote(2.5, 'try')).toBe('#YAZIYLA:İKİ LİRA 50 KURUŞ#');
  });
});

describe('formatAmountInWordsNote — KARAR: bilinmeyen kur kodu olduğu gibi kullanılır', () => {
  it('CHF → büyük birim ISO kodu, küçük birim KURUŞ', () => {
    expect(formatAmountInWordsNote(2.5, 'CHF')).toBe('#YAZIYLA:İKİ CHF 50 KURUŞ#');
  });

  it('bilinmeyen kodda uydurma birim adı YAZILMAZ', () => {
    const note = formatAmountInWordsNote(2.5, 'JPY')!;
    expect(note).toContain('JPY');
    expect(note).not.toContain('YEN');
  });

  it('getAmountInWordsUnits bilinmeyen kodda { major: kod, minor: KURUŞ } döner', () => {
    expect(getAmountInWordsUnits('NOK')).toEqual({ major: 'NOK', minor: DEFAULT_MINOR_UNIT });
  });

  it('boş/eksik kodda TRY varsayılır', () => {
    expect(getAmountInWordsUnits('')).toEqual(AMOUNT_IN_WORDS_UNITS.TRY);
    expect(getAmountInWordsUnits(undefined)).toEqual(AMOUNT_IN_WORDS_UNITS.TRY);
    expect(formatAmountInWordsNote(1, undefined)).toBe('#YAZIYLA:BİR LİRA 00 KURUŞ#');
  });

  it('tablo genişletilebilir — 4 seed kod tanımlı', () => {
    expect(Object.keys(AMOUNT_IN_WORDS_UNITS).sort()).toEqual(['EUR', 'GBP', 'TRY', 'USD']);
  });
});

describe('formatAmountInWordsNote — cbc:PayableAmount ile yuvarlama tutarlılığı', () => {
  const cases = [0, 0.005, 0.015, 1.005, 2.675, 182.2, 1234.565, 99999.994, 1e6 + 0.335];

  for (const amount of cases) {
    it(`${amount} → nottaki rakamlar formatDecimal(amount, 2) ile birebir aynı`, () => {
      const printed = formatDecimal(amount, 2); // XML'e yazılan string
      const [intPart, fracPart] = printed.split('.');
      const note = formatAmountInWordsNote(amount, 'TRY')!;
      expect(note).toContain(` ${fracPart} KURUŞ#`);
      // tam sayı kısmı da aynı değerden türetilmiş olmalı
      expect(note.startsWith('#YAZIYLA:')).toBe(true);
      expect(Number(intPart)).toBeGreaterThanOrEqual(0);
    });
  }

  it('yuvarlama YUKARI çıkınca tam sayı da takip eder (1,999 → İKİ LİRA 00 KURUŞ)', () => {
    expect(formatDecimal(1.999, 2)).toBe('2.00');
    expect(formatAmountInWordsNote(1.999, 'TRY')).toBe('#YAZIYLA:İKİ LİRA 00 KURUŞ#');
  });

  it('999,995 → BİN LİRA 00 KURUŞ (basamak taşması notta da doğru)', () => {
    expect(formatDecimal(999.995, 2)).toBe('1000.00');
    expect(formatAmountInWordsNote(999.995, 'TRY')).toBe('#YAZIYLA:BİN LİRA 00 KURUŞ#');
  });
});

describe('formatAmountInWordsNote — okunamayan tutarlarda null (serializer patlamaz)', () => {
  it('undefined / null → null', () => {
    expect(formatAmountInWordsNote(undefined, 'TRY')).toBeNull();
    expect(formatAmountInWordsNote(null, 'TRY')).toBeNull();
  });

  it('NaN / Infinity → null', () => {
    expect(formatAmountInWordsNote(NaN, 'TRY')).toBeNull();
    expect(formatAmountInWordsNote(Infinity, 'TRY')).toBeNull();
    expect(formatAmountInWordsNote(-Infinity, 'TRY')).toBeNull();
  });

  it('güvenli tam sayı aralığı dışı → null (throw ETMEZ)', () => {
    expect(() => formatAmountInWordsNote(1e21, 'TRY')).not.toThrow();
    expect(formatAmountInWordsNote(1e21, 'TRY')).toBeNull();
  });

  it('güvenli aralığın en üstü hâlâ okunur', () => {
    expect(formatAmountInWordsNote(1_000_000_000_000, 'TRY')).toBe(
      '#YAZIYLA:BİR TRİLYON LİRA 00 KURUŞ#',
    );
  });
});

describe('isAmountInWordsNote — elle yazılmış yazıyla-notlarını tanır', () => {
  it('kütüphane biçimini tanır', () => {
    expect(isAmountInWordsNote('#YAZIYLA:BİR LİRA 00 KURUŞ#')).toBe(true);
  });

  it('GİB/Mimsoft varyantını tanır (YAZIYLA:#...#)', () => {
    expect(isAmountInWordsNote('YAZIYLA:#BİR TÜRK LIRASI\n YİRMİ KURUŞ#')).toBe(true);
  });

  it('boşluklu elle yazımı tanır (YAZIYLA: ...)', () => {
    expect(isAmountInWordsNote('YAZIYLA: ON DÖRT BİN BEŞ YÜZ ELLİ TÜRK LİRASI')).toBe(true);
  });

  it('noktasız ı ile küçük harf yazımı tanır', () => {
    expect(isAmountInWordsNote('yazıyla: bir lira')).toBe(true);
    expect(isAmountInWordsNote('yaziyla: bir lira')).toBe(true);
  });

  it('alakasız notu TANIMAZ', () => {
    expect(isAmountInWordsNote('Sicil No: 0606 İşletme Merkezi: ankr')).toBe(false);
    expect(isAmountInWordsNote('İF NO:709')).toBe(false);
    expect(isAmountInWordsNote('Tutar yazıyla belirtilmiştir')).toBe(false);
  });
});
