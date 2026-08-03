/**
 * v3.0.0 — Türkçe sayı okuma (saf modül) testleri.
 *
 * Türkçenin sayı okuma tuzaklarının HER BİRİ ayrı test olarak kilitlenmiştir.
 */

import { describe, it, expect } from 'vitest';
import {
  numberToTurkishWords,
  TURKISH_ZERO_WORD,
  MAX_READABLE_INTEGER,
} from '../../src/utils/turkish-number-words';

describe('numberToTurkishWords — birler ve onlar', () => {
  it('0 → SIFIR', () => {
    expect(numberToTurkishWords(0)).toBe('SIFIR');
    expect(TURKISH_ZERO_WORD).toBe('SIFIR');
  });

  it('1–9 birler basamağı', () => {
    const expected = [
      'BİR', 'İKİ', 'ÜÇ', 'DÖRT', 'BEŞ', 'ALTI', 'YEDİ', 'SEKİZ', 'DOKUZ',
    ];
    expected.forEach((word, i) => {
      expect(numberToTurkishWords(i + 1)).toBe(word);
    });
  });

  it('10–90 onlar basamağı (ON, YİRMİ, OTUZ, KIRK, ELLİ, ALTMIŞ, YETMİŞ, SEKSEN, DOKSAN)', () => {
    const expected = [
      'ON', 'YİRMİ', 'OTUZ', 'KIRK', 'ELLİ', 'ALTMIŞ', 'YETMİŞ', 'SEKSEN', 'DOKSAN',
    ];
    expected.forEach((word, i) => {
      expect(numberToTurkishWords((i + 1) * 10)).toBe(word);
    });
  });

  it('11 → ON BİR, 99 → DOKSAN DOKUZ', () => {
    expect(numberToTurkishWords(11)).toBe('ON BİR');
    expect(numberToTurkishWords(99)).toBe('DOKSAN DOKUZ');
  });
});

describe('numberToTurkishWords — TUZAK: 100 "BİR YÜZ" DEĞİL "YÜZ"', () => {
  it('100 → YÜZ (❌ BİR YÜZ)', () => {
    expect(numberToTurkishWords(100)).toBe('YÜZ');
    expect(numberToTurkishWords(100)).not.toContain('BİR YÜZ');
  });

  it('200 → İKİ YÜZ (yüzler > 1 iken çarpan YAZILIR)', () => {
    expect(numberToTurkishWords(200)).toBe('İKİ YÜZ');
    expect(numberToTurkishWords(900)).toBe('DOKUZ YÜZ');
  });
});

describe('numberToTurkishWords — TUZAK: 101 → YÜZ BİR', () => {
  it('101 → YÜZ BİR', () => {
    expect(numberToTurkishWords(101)).toBe('YÜZ BİR');
  });

  it('110 → YÜZ ON, 111 → YÜZ ON BİR', () => {
    expect(numberToTurkishWords(110)).toBe('YÜZ ON');
    expect(numberToTurkishWords(111)).toBe('YÜZ ON BİR');
  });

  it('182 → YÜZ SEKSEN İKİ (kullanıcının örneği)', () => {
    expect(numberToTurkishWords(182)).toBe('YÜZ SEKSEN İKİ');
  });
});

describe('numberToTurkishWords — TUZAK: 1000 "BİR BİN" DEĞİL "BİN"', () => {
  it('1000 → BİN (❌ BİR BİN)', () => {
    expect(numberToTurkishWords(1000)).toBe('BİN');
    expect(numberToTurkishWords(1000)).not.toContain('BİR BİN');
  });

  it('2000 → İKİ BİN (bin çarpanı > 1 iken YAZILIR)', () => {
    expect(numberToTurkishWords(2000)).toBe('İKİ BİN');
  });
});

describe('numberToTurkishWords — TUZAK: 1.000.000 "BİR MİLYON" (BİN\'den FARKLI)', () => {
  it('1000000 → BİR MİLYON — BİR burada YAZILIR', () => {
    expect(numberToTurkishWords(1_000_000)).toBe('BİR MİLYON');
  });

  it('1000000000 → BİR MİLYAR', () => {
    expect(numberToTurkishWords(1_000_000_000)).toBe('BİR MİLYAR');
  });

  it('1000000000000 → BİR TRİLYON', () => {
    expect(numberToTurkishWords(1_000_000_000_000)).toBe('BİR TRİLYON');
  });

  it('1000000000000000 → BİR KATRİLYON', () => {
    expect(numberToTurkishWords(1_000_000_000_000_000)).toBe('BİR KATRİLYON');
  });

  it('"BİN" istisnası SADECE bin grubuna aittir — 1.001.000 → BİR MİLYON BİN', () => {
    expect(numberToTurkishWords(1_001_000)).toBe('BİR MİLYON BİN');
  });
});

describe('numberToTurkishWords — TUZAK: 1001 → BİN BİR', () => {
  it('1001 → BİN BİR', () => {
    expect(numberToTurkishWords(1001)).toBe('BİN BİR');
  });
});

describe('numberToTurkishWords — TUZAK: 1100 → BİN YÜZ', () => {
  it('1100 → BİN YÜZ', () => {
    expect(numberToTurkishWords(1100)).toBe('BİN YÜZ');
  });

  it('1101 → BİN YÜZ BİR', () => {
    expect(numberToTurkishWords(1101)).toBe('BİN YÜZ BİR');
  });
});

describe('numberToTurkishWords — TUZAK: 11000 → ON BİR BİN', () => {
  it('11000 → ON BİR BİN', () => {
    expect(numberToTurkishWords(11_000)).toBe('ON BİR BİN');
  });

  it('21000 → YİRMİ BİR BİN', () => {
    expect(numberToTurkishWords(21_000)).toBe('YİRMİ BİR BİN');
  });

  it('100000 → YÜZ BİN (❌ BİR YÜZ BİN)', () => {
    expect(numberToTurkishWords(100_000)).toBe('YÜZ BİN');
  });
});

describe('numberToTurkishWords — TUZAK: sıfırlı gruplar atlanır', () => {
  it('1000001 → BİR MİLYON BİR (ortadaki bin grubu okunmaz)', () => {
    expect(numberToTurkishWords(1_000_001)).toBe('BİR MİLYON BİR');
  });

  it('1000000000 içindeki tüm ara gruplar atlanır', () => {
    expect(numberToTurkishWords(1_000_000_000)).toBe('BİR MİLYAR');
  });

  it('1020003 → BİR MİLYON YİRMİ BİN ÜÇ', () => {
    expect(numberToTurkishWords(1_020_003)).toBe('BİR MİLYON YİRMİ BİN ÜÇ');
  });
});

describe('numberToTurkishWords — basamak adları: BİN, MİLYON, MİLYAR, TRİLYON', () => {
  it('123456789 → tam okunuş', () => {
    expect(numberToTurkishWords(123_456_789)).toBe(
      'YÜZ YİRMİ ÜÇ MİLYON DÖRT YÜZ ELLİ ALTI BİN YEDİ YÜZ SEKSEN DOKUZ',
    );
  });

  it('999999999999 → DOKUZ YÜZ DOKSAN DOKUZ MİLYAR ... (TRİLYON sınırı altı)', () => {
    expect(numberToTurkishWords(999_999_999_999)).toBe(
      'DOKUZ YÜZ DOKSAN DOKUZ MİLYAR DOKUZ YÜZ DOKSAN DOKUZ MİLYON ' +
        'DOKUZ YÜZ DOKSAN DOKUZ BİN DOKUZ YÜZ DOKSAN DOKUZ',
    );
  });

  it('gerçek Mimsoft faturasındaki tutarlar (regresyon çıpası)', () => {
    // __tests__/fixtures/mimsoft-real-invoices/*.xml içindeki YAZIYLA notları
    expect(numberToTurkishWords(14_550)).toBe('ON DÖRT BİN BEŞ YÜZ ELLİ');
    expect(numberToTurkishWords(13_200)).toBe('ON ÜÇ BİN İKİ YÜZ');
    expect(numberToTurkishWords(17_220)).toBe('ON YEDİ BİN İKİ YÜZ YİRMİ');
  });
});

describe('numberToTurkishWords — sınır ve hata halleri', () => {
  it('MAX_READABLE_INTEGER okunabilir (KATRİLYON kapsıyor)', () => {
    expect(MAX_READABLE_INTEGER).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => numberToTurkishWords(MAX_READABLE_INTEGER)).not.toThrow();
    expect(numberToTurkishWords(MAX_READABLE_INTEGER)).toContain('KATRİLYON');
  });

  it('negatif değer RangeError fırlatır (işaret bu modülün işi değil)', () => {
    expect(() => numberToTurkishWords(-1)).toThrow(RangeError);
  });

  it('ondalıklı değer RangeError fırlatır', () => {
    expect(() => numberToTurkishWords(1.5)).toThrow(RangeError);
  });

  it('NaN / Infinity RangeError fırlatır', () => {
    expect(() => numberToTurkishWords(NaN)).toThrow(RangeError);
    expect(() => numberToTurkishWords(Infinity)).toThrow(RangeError);
  });

  it('güvenli tam sayı aralığı dışı RangeError fırlatır', () => {
    expect(() => numberToTurkishWords(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
  });
});

describe('numberToTurkishWords — Türkçe büyük harf doğruluğu', () => {
  it('noktalı İ ve noktasız I doğru yazılmıştır (toUpperCase tuzağı)', () => {
    // "BİR" noktalı İ ile; "KIRK"/"ALTMIŞ" noktasız I ile
    expect(numberToTurkishWords(1)).toBe('BİR');
    expect(numberToTurkishWords(40)).toBe('KIRK');
    expect(numberToTurkishWords(60)).toBe('ALTMIŞ');
    expect(numberToTurkishWords(2)).toBe('İKİ');
  });

  it('SIFIR noktasız I ile yazılır', () => {
    expect(numberToTurkishWords(0)).toBe('SIFIR');
    expect(numberToTurkishWords(0)).not.toBe('SİFİR');
  });
});
