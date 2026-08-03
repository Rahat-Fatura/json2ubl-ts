/**
 * v3.0.0 — `YAZIYLA:#...#` not biçimlendirme testleri.
 *
 * Biçim SAHADAN ÖLÇÜLDÜ (88 gerçek fatura notu). Kararların her biri —
 * kesir yazıyla, kuruş sıfırken kesirin düşmesi, sıfır tutar, negatif,
 * bilinmeyen kur — ayrı test olarak kilitlenmiştir.
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

describe('SAHA KANITI — gerçek faturalardaki notu BİREBİR üretir', () => {
  /**
   * Bu üç kayıt kullanıcının indirdiği gerçek faturalardan alındı. Alanı
   * eşlediğimizin kanıtıdır; biçim değişirse ilk burası kırılır.
   */
  it('3243,56 → YAZIYLA:#ÜÇ BİN İKİ YÜZ KIRK ÜÇ TÜRK LIRASI ELLİ ALTI KURUŞ#', () => {
    expect(formatAmountInWordsNote(3243.56, 'TRY')).toBe(
      'YAZIYLA:#ÜÇ BİN İKİ YÜZ KIRK ÜÇ TÜRK LIRASI ELLİ ALTI KURUŞ#',
    );
  });

  it('41813,35 → YAZIYLA:#KIRK BİR BİN SEKİZ YÜZ ON ÜÇ TÜRK LIRASI OTUZ BEŞ KURUŞ#', () => {
    expect(formatAmountInWordsNote(41813.35, 'TRY')).toBe(
      'YAZIYLA:#KIRK BİR BİN SEKİZ YÜZ ON ÜÇ TÜRK LIRASI OTUZ BEŞ KURUŞ#',
    );
  });

  it('660000,00 → YAZIYLA:#ALTI YÜZ ALTMIŞ BİN TÜRK LIRASI# (kuruş kısmı YOK)', () => {
    expect(formatAmountInWordsNote(660000, 'TRY')).toBe(
      'YAZIYLA:#ALTI YÜZ ALTMIŞ BİN TÜRK LIRASI#',
    );
  });

  it('sahadaki diğer kayıtlar (rastgele seçilmiş 6 kayıt)', () => {
    const cases: Array<[number, string, string]> = [
      [6495.86, 'TRY', 'YAZIYLA:#ALTI BİN DÖRT YÜZ DOKSAN BEŞ TÜRK LIRASI SEKSEN ALTI KURUŞ#'],
      [3063.3, 'TRY', 'YAZIYLA:#ÜÇ BİN ALTMIŞ ÜÇ TÜRK LIRASI OTUZ KURUŞ#'],
      [5001.02, 'TRY', 'YAZIYLA:#BEŞ BİN BİR TÜRK LIRASI İKİ KURUŞ#'],
      [25576.03, 'TRY', 'YAZIYLA:#YİRMİ BEŞ BİN BEŞ YÜZ YETMİŞ ALTI TÜRK LIRASI ÜÇ KURUŞ#'],
      [74820, 'TRY', 'YAZIYLA:#YETMİŞ DÖRT BİN SEKİZ YÜZ YİRMİ TÜRK LIRASI#'],
      [
        1358381.7,
        'TRY',
        'YAZIYLA:#BİR MİLYON ÜÇ YÜZ ELLİ SEKİZ BİN ÜÇ YÜZ SEKSEN BİR TÜRK LIRASI YETMİŞ KURUŞ#',
      ],
    ];
    for (const [amount, currency, expected] of cases) {
      expect(formatAmountInWordsNote(amount, currency)).toBe(expected);
    }
  });

  it('YABANCI PARA — sahadan ölçülen iki kayıt', () => {
    // 3810,00 EUR → "AVRO" (EURO DEĞİL) · 10000,00 USD → "AMERIKAN DOLARI"
    expect(formatAmountInWordsNote(3810, 'EUR')).toBe(
      'YAZIYLA:#ÜÇ BİN SEKİZ YÜZ ON AVRO#',
    );
    expect(formatAmountInWordsNote(10000, 'USD')).toBe(
      'YAZIYLA:#ON BİN AMERIKAN DOLARI#',
    );
  });
});

describe('biçim iskeleti — YAZIYLA:#...# (sahada 88/88)', () => {
  it('önek YAZIYLA:# — # iki noktadan SONRA', () => {
    expect(AMOUNT_IN_WORDS_PREFIX).toBe('YAZIYLA:#');
    expect(formatAmountInWordsNote(1, 'TRY')!.startsWith('YAZIYLA:#')).toBe(true);
  });

  it('sonek #', () => {
    expect(AMOUNT_IN_WORDS_SUFFIX).toBe('#');
    expect(formatAmountInWordsNote(1, 'TRY')!.endsWith('#')).toBe(true);
  });

  it('not TEK SATIRDIR — içinde satır sonu YOK', () => {
    expect(formatAmountInWordsNote(3243.56, 'TRY')).not.toMatch(/[\r\n]/);
    expect(formatAmountInWordsNote(660000, 'TRY')).not.toMatch(/[\r\n]/);
  });

  it('🔴 kuruş sıfırken kapanış #inden ÖNCE BOŞLUK YOKTUR', () => {
    // Sahadaki 88 kaydın HİÇBİRİNDE "LIRASI #" (boşluk + #) geçmiyor.
    // 38 kayıttaki "LIRASI\n#" bir SATIR SONUdur, boşluk değil.
    const note = formatAmountInWordsNote(660000, 'TRY')!;
    expect(note).not.toContain(' #');
    expect(note.endsWith('LIRASI#')).toBe(true);
  });
});

describe('KARAR: kesir de YAZIYLA yazılır (rakamla DEĞİL)', () => {
  it(',56 → ELLİ ALTI KURUŞ', () => {
    expect(formatAmountInWordsNote(1.56, 'TRY')).toBe(
      'YAZIYLA:#BİR TÜRK LIRASI ELLİ ALTI KURUŞ#',
    );
  });

  it(',05 → BEŞ KURUŞ (baştaki sıfır okunmaz)', () => {
    expect(formatAmountInWordsNote(1.05, 'TRY')).toBe('YAZIYLA:#BİR TÜRK LIRASI BEŞ KURUŞ#');
  });

  it(',15 → ON BEŞ KURUŞ', () => {
    expect(formatAmountInWordsNote(1.15, 'TRY')).toBe(
      'YAZIYLA:#BİR TÜRK LIRASI ON BEŞ KURUŞ#',
    );
  });

  it(',01 → BİR KURUŞ · ,99 → DOKSAN DOKUZ KURUŞ', () => {
    expect(formatAmountInWordsNote(1.01, 'TRY')).toBe('YAZIYLA:#BİR TÜRK LIRASI BİR KURUŞ#');
    expect(formatAmountInWordsNote(1.99, 'TRY')).toBe(
      'YAZIYLA:#BİR TÜRK LIRASI DOKSAN DOKUZ KURUŞ#',
    );
  });

  it(',10 → ON KURUŞ · ,20 → YİRMİ KURUŞ (yuvarlak onluklar)', () => {
    expect(formatAmountInWordsNote(1.1, 'TRY')).toBe('YAZIYLA:#BİR TÜRK LIRASI ON KURUŞ#');
    expect(formatAmountInWordsNote(1.2, 'TRY')).toBe('YAZIYLA:#BİR TÜRK LIRASI YİRMİ KURUŞ#');
  });

  it('kesirde RAKAM kalmaz — 1..99 arası tüm kuruşlar yazıyla', () => {
    for (let k = 1; k <= 99; k++) {
      const note = formatAmountInWordsNote(1 + k / 100, 'TRY')!;
      expect(note, `kuruş=${k}`).not.toMatch(/\d/);
    }
  });
});

describe('KARAR: kuruş SIFIRSA kesir kısmı HİÇ yazılmaz', () => {
  it(',00 → kuruş kısmı yok', () => {
    expect(formatAmountInWordsNote(182, 'TRY')).toBe('YAZIYLA:#YÜZ SEKSEN İKİ TÜRK LIRASI#');
  });

  it('"SIFIR KURUŞ" ASLA yazılmaz', () => {
    expect(formatAmountInWordsNote(182, 'TRY')).not.toContain('SIFIR KURUŞ');
    expect(formatAmountInWordsNote(0, 'TRY')).not.toContain('SIFIR KURUŞ');
  });

  it('kuruş sıfırken "KURUŞ" kelimesi hiç geçmez', () => {
    expect(formatAmountInWordsNote(74820, 'TRY')).not.toContain('KURUŞ');
  });
});

describe('KARAR: sıfır tutar', () => {
  it('0,00 → YAZIYLA:#SIFIR TÜRK LIRASI#', () => {
    expect(formatAmountInWordsNote(0, 'TRY')).toBe('YAZIYLA:#SIFIR TÜRK LIRASI#');
  });

  it('sıfır tutarda not yine de üretilir (koşulsuz)', () => {
    expect(formatAmountInWordsNote(0, 'TRY')).not.toBeNull();
  });

  it('-0 → EKSİ almaz', () => {
    expect(formatAmountInWordsNote(-0, 'TRY')).toBe('YAZIYLA:#SIFIR TÜRK LIRASI#');
  });

  it('0,56 → SIFIR TÜRK LIRASI ELLİ ALTI KURUŞ (bir liradan küçük)', () => {
    expect(formatAmountInWordsNote(0.56, 'TRY')).toBe(
      'YAZIYLA:#SIFIR TÜRK LIRASI ELLİ ALTI KURUŞ#',
    );
  });
});

describe('KARAR: negatif tutar EKSİ öneki alır', () => {
  it('-3243,56 → EKSİ öneki', () => {
    expect(formatAmountInWordsNote(-3243.56, 'TRY')).toBe(
      'YAZIYLA:#EKSİ ÜÇ BİN İKİ YÜZ KIRK ÜÇ TÜRK LIRASI ELLİ ALTI KURUŞ#',
    );
  });

  it('işaret sessizce yutulmaz', () => {
    expect(formatAmountInWordsNote(-1, 'TRY')).toContain('EKSİ');
  });

  it('yuvarlama sonrası sıfırlanan negatif EKSİ ALMAZ (-0,001 → SIFIR)', () => {
    expect(formatAmountInWordsNote(-0.001, 'TRY')).toBe('YAZIYLA:#SIFIR TÜRK LIRASI#');
  });
});

describe('para birimine göre birim adları', () => {
  it('TRY → TÜRK LIRASI / KURUŞ (ÖLÇÜLDÜ)', () => {
    expect(formatAmountInWordsNote(2.5, 'TRY')).toBe(
      'YAZIYLA:#İKİ TÜRK LIRASI ELLİ KURUŞ#',
    );
  });

  it('🔴 TÜRK LIRASI noktasız I ile yazılır (saha standardı — düzeltilmez)', () => {
    const note = formatAmountInWordsNote(1, 'TRY')!;
    expect(note).toContain('TÜRK LIRASI');
    expect(note).not.toContain('TÜRK LİRASI');
    // Bayt düzeyi: LIRASI'daki iki I da U+0049 (noktasız), U+0130 (İ) DEĞİL
    expect([...'LIRASI'].map(c => c.codePointAt(0))).toEqual([
      0x4c, 0x49, 0x52, 0x41, 0x53, 0x49,
    ]);
    expect(note).toContain('LIRASI');
  });

  it('USD → AMERIKAN DOLARI / SENT', () => {
    expect(formatAmountInWordsNote(2.5, 'USD')).toBe(
      'YAZIYLA:#İKİ AMERIKAN DOLARI ELLİ SENT#',
    );
  });

  it('🔴 AMERIKAN DOLARI da noktasız I ile (ÖLÇÜLDÜ)', () => {
    const note = formatAmountInWordsNote(1, 'USD')!;
    expect(note).toContain('AMERIKAN DOLARI');
    expect(note).not.toContain('AMERİKAN');
  });

  it('EUR → AVRO / SENT (EURO DEĞİL — ÖLÇÜLDÜ)', () => {
    expect(formatAmountInWordsNote(2.5, 'EUR')).toBe('YAZIYLA:#İKİ AVRO ELLİ SENT#');
    expect(formatAmountInWordsNote(2.5, 'EUR')).not.toContain('EURO');
  });

  it('GBP → İNGİLİZ STERLİNİ / PENİ (SEÇİLDİ — saha kanıtı yok)', () => {
    expect(formatAmountInWordsNote(2.5, 'GBP')).toBe(
      'YAZIYLA:#İKİ İNGİLİZ STERLİNİ ELLİ PENİ#',
    );
  });

  it('küçük harf kod da tanınır', () => {
    expect(formatAmountInWordsNote(2.5, 'try')).toBe(
      'YAZIYLA:#İKİ TÜRK LIRASI ELLİ KURUŞ#',
    );
  });
});

describe('KARAR: bilinmeyen kur kodu olduğu gibi kullanılır', () => {
  it('CHF → büyük birim ISO kodu, küçük birim KURUŞ', () => {
    expect(formatAmountInWordsNote(2.5, 'CHF')).toBe('YAZIYLA:#İKİ CHF ELLİ KURUŞ#');
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
    expect(formatAmountInWordsNote(1, undefined)).toBe('YAZIYLA:#BİR TÜRK LIRASI#');
  });

  it('tablo genişletilebilir — 4 seed kod tanımlı', () => {
    expect(Object.keys(AMOUNT_IN_WORDS_UNITS).sort()).toEqual(['EUR', 'GBP', 'TRY', 'USD']);
  });
});

describe('cbc:PayableAmount ile yuvarlama tutarlılığı', () => {
  it('yuvarlama YUKARI çıkınca tam sayı da takip eder (1,999 → İKİ TÜRK LIRASI)', () => {
    expect(formatDecimal(1.999, 2)).toBe('2.00');
    expect(formatAmountInWordsNote(1.999, 'TRY')).toBe('YAZIYLA:#İKİ TÜRK LIRASI#');
  });

  it('999,995 → BİN TÜRK LIRASI (basamak taşması notta da doğru)', () => {
    expect(formatDecimal(999.995, 2)).toBe('1000.00');
    expect(formatAmountInWordsNote(999.995, 'TRY')).toBe('YAZIYLA:#BİN TÜRK LIRASI#');
  });

  it('yuvarlanan kesir nota da yuvarlanmış GİRER (1,006 → BİR KURUŞ)', () => {
    expect(formatDecimal(1.006, 2)).toBe('1.01');
    expect(formatAmountInWordsNote(1.006, 'TRY')).toBe('YAZIYLA:#BİR TÜRK LIRASI BİR KURUŞ#');
  });

  it('nottaki kuruş, XML\'e yazılan kesir hanesiyle AYNI değerdir', () => {
    const cases = [0, 0.005, 0.015, 1.005, 2.675, 182.2, 1234.565, 99999.994];
    for (const amount of cases) {
      const printed = formatDecimal(amount, 2);
      const frac = Number(printed.split('.')[1]);
      const note = formatAmountInWordsNote(amount, 'TRY')!;
      if (frac === 0) expect(note, printed).not.toContain('KURUŞ');
      else expect(note, printed).toContain('KURUŞ');
    }
  });
});

describe('okunamayan tutarlarda null (serializer patlamaz)', () => {
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
      'YAZIYLA:#BİR TRİLYON TÜRK LIRASI#',
    );
  });
});

describe('isAmountInWordsNote — elle yazılmış yazıyla-notlarını tanır', () => {
  it('kütüphane biçimini tanır', () => {
    expect(isAmountInWordsNote('YAZIYLA:#BİR TÜRK LIRASI#')).toBe(true);
  });

  it('v3.0.0 öncesi taslak biçimi (#YAZIYLA:...#) de tanır', () => {
    expect(isAmountInWordsNote('#YAZIYLA:BİR LİRA 00 KURUŞ#')).toBe(true);
  });

  it('sahadaki A üreticisinin satır sonlu biçimini tanır', () => {
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
