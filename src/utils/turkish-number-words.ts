/**
 * Türkçe sayı okuma — SAF modül.
 *
 * Hiçbir para birimi / UBL / fatura bilgisi bilmez: tek işi negatif olmayan bir
 * tam sayıyı Türkçe okunuşuna çevirmektir. Para birimi ve `#YAZIYLA:...#` not
 * biçimi `utils/amount-in-words.ts` sorumluluğundadır.
 *
 * ## Türkçenin tuzakları (v3.0.0'da testle kilitlendi)
 * - `1` → `BİR` ama `100` → `YÜZ` (❌ `BİR YÜZ`), `1000` → `BİN` (❌ `BİR BİN`)
 * - `1.000.000` → `BİR MİLYON` — `BİN`den farklı olarak `BİR` YAZILIR
 * - `101` → `YÜZ BİR` · `1001` → `BİN BİR` · `1100` → `BİN YÜZ` · `11000` → `ON BİR BİN`
 * - Sıfır → `SIFIR` (tek başına; grup içinde hiç yazılmaz: `1000` → `BİN`)
 *
 * Tüm çıktı BÜYÜK HARFtir ve Türkçe karakterler literal olarak yazılmıştır
 * (`toUpperCase()` kullanılmaz — JS'in `i → I` dönüşümü Türkçede `i → İ` olmalı).
 */

/** Sıfırın Türkçe okunuşu. */
export const TURKISH_ZERO_WORD = 'SIFIR';

/** Negatif işaret öneki (bkz. `formatAmountInWordsNote`). */
export const TURKISH_MINUS_WORD = 'EKSİ';

/** 1–9 birler basamağı. `0` boş — grup içinde okunmaz. */
const UNITS: readonly string[] = [
  '',
  'BİR',
  'İKİ',
  'ÜÇ',
  'DÖRT',
  'BEŞ',
  'ALTI',
  'YEDİ',
  'SEKİZ',
  'DOKUZ',
];

/** 10–90 onlar basamağı. */
const TENS: readonly string[] = [
  '',
  'ON',
  'YİRMİ',
  'OTUZ',
  'KIRK',
  'ELLİ',
  'ALTMIŞ',
  'YETMİŞ',
  'SEKSEN',
  'DOKSAN',
];

/**
 * Basamak (grup) adları — index = 3'lü grup sırası.
 * `KATRİLYON` (10^15) `Number.MAX_SAFE_INTEGER` (≈9.007×10^15) üstünü kapsar,
 * yani güvenli tam sayı aralığındaki her değer okunabilir.
 */
const SCALES: readonly string[] = ['', 'BİN', 'MİLYON', 'MİLYAR', 'TRİLYON', 'KATRİLYON'];

/** `BİN` grubunun index'i — "BİR BİN" istisnası için. */
const THOUSAND_SCALE_INDEX = 1;

/** Bu modülün okuyabildiği en büyük tam sayı. */
export const MAX_READABLE_INTEGER = Number.MAX_SAFE_INTEGER;

/**
 * 0–999 arası bir grubu kelimelere böler.
 * `100` → `['YÜZ']` (❌ `['BİR','YÜZ']`), `200` → `['İKİ','YÜZ']`.
 */
function threeDigitGroupToWords(group: number): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(group / 100);
  const tens = Math.floor((group % 100) / 10);
  const units = group % 10;

  if (hundreds === 1) {
    // 100 → "YÜZ", asla "BİR YÜZ"
    words.push('YÜZ');
  } else if (hundreds > 1) {
    words.push(UNITS[hundreds]!, 'YÜZ');
  }
  if (tens > 0) words.push(TENS[tens]!);
  if (units > 0) words.push(UNITS[units]!);

  return words;
}

/**
 * Negatif olmayan bir tam sayının Türkçe okunuşunu döner.
 *
 * @param value Negatif olmayan, `Number.isSafeInteger` koşulunu sağlayan sayı
 * @throws {RangeError} Sonlu olmayan, tam sayı olmayan, negatif veya güvenli
 *   tam sayı aralığı dışındaki değerlerde
 *
 * @example
 * numberToTurkishWords(182)     // 'YÜZ SEKSEN İKİ'
 * numberToTurkishWords(1000)    // 'BİN'
 * numberToTurkishWords(1000000) // 'BİR MİLYON'
 */
export function numberToTurkishWords(value: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`numberToTurkishWords: sonlu bir sayı bekleniyordu, alınan: ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`numberToTurkishWords: tam sayı bekleniyordu, alınan: ${value}`);
  }
  if (value < 0) {
    throw new RangeError(
      `numberToTurkishWords: negatif olmayan sayı bekleniyordu, alınan: ${value}`,
    );
  }
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `numberToTurkishWords: değer güvenli tam sayı aralığının dışında (> ${MAX_READABLE_INTEGER}): ${value}`,
    );
  }

  if (value === 0) return TURKISH_ZERO_WORD;

  // Rakam string'i üzerinden 3'lü gruplama — float aritmetiğinden kaçınır.
  const digits = String(value);
  const groups: number[] = [];
  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(Number(digits.slice(Math.max(0, end - 3), end)));
  }

  const words: string[] = [];
  const lastScaleIndex = groups.length - 1;

  groups.forEach((group, i) => {
    if (group === 0) return; // 0'lı grup hiç okunmaz: 1000 → "BİN"
    const scaleIndex = lastScaleIndex - i;

    // "BİN" istisnası: 1000 → "BİN", asla "BİR BİN".
    // MİLYON ve üstünde bu istisna YOKTUR: 1.000.000 → "BİR MİLYON".
    if (scaleIndex === THOUSAND_SCALE_INDEX && group === 1) {
      words.push(SCALES[THOUSAND_SCALE_INDEX]!);
      return;
    }

    words.push(...threeDigitGroupToWords(group));
    if (scaleIndex > 0) words.push(SCALES[scaleIndex]!);
  });

  return words.join(' ');
}
