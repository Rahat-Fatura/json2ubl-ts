/**
 * "Yazıyla tutar" notu (`#YAZIYLA:...#`) — v3.0.0.
 *
 * ## Biçim
 * ```
 * #YAZIYLA:<TAMSAYI YAZIYLA> <BÜYÜK BİRİM> <KURUŞ HANESİ RAKAMLA> <KÜÇÜK BİRİM>#
 * #YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#
 * ```
 * Tam sayı kısmı YAZIYLA, kesir kısmı RAKAMLA (Türkiye'de yaygın pratik).
 *
 * ## Kaynak
 * `LegalMonetaryTotal/PayableAmount` — belgede yazan dip toplam. Not,
 * `cbc:PayableAmount`ın yazdığı string'in AYNI yuvarlamasından
 * (`formatDecimal(x, 2)`) türetilir; böylece not ile XML'deki tutar asla
 * birbirinden ayrışamaz.
 *
 * ## Kararlar
 * - **Kesir hanesi:** her zaman İKİ HANE, sıfır dolgulu — `,05` → `05 KURUŞ`.
 * - **Kuruş sıfırsa:** kesir kısmı YİNE yazılır — `182,00` → `... LİRA 00 KURUŞ`.
 *   Gerekçe: sabit ve makine-okunur biçim; "kuruş yok mu, sıfır mı" belirsizliği kalmaz.
 * - **Sıfır tutar:** `#YAZIYLA:SIFIR LİRA 00 KURUŞ#`. Not koşulsuz eklendiği
 *   için atlanmaz; `SIFIR` doğru Türkçe okunuştur.
 * - **Negatif tutar:** UBL-TR'de `PayableAmount` negatif olmamalıdır (iade
 *   belgeleri pozitif tutar + farklı tip koduyla düzenlenir). Yine de savunmacı
 *   davranılır: işaret sessizce yutulmaz, `EKSİ` öneki yazılır. Yuvarlama
 *   sonrası sıfırlanan negatifler (`-0,001` → `0,00`) `EKSİ` ALMAZ.
 * - **Bilinmeyen para birimi:** bkz. `config/amount-in-words-config.ts`.
 * - **Okunamayan tutar:** sonlu olmayan veya güvenli tam sayı aralığı dışındaki
 *   tutarlarda `null` döner ve not HİÇ yazılmaz. Gerekçe: kozmetik bir not
 *   yüzünden serializer'ın patlaması ve geçerli bir belgenin üretilememesi
 *   kabul edilemez.
 */

import { formatDecimal } from './formatters';
import { numberToTurkishWords, TURKISH_MINUS_WORD } from './turkish-number-words';
import { getAmountInWordsUnits } from '../config/amount-in-words-config';

/** Not öneki — `#YAZIYLA:` */
export const AMOUNT_IN_WORDS_PREFIX = '#YAZIYLA:';

/** Not soneki — `#` */
export const AMOUNT_IN_WORDS_SUFFIX = '#';

/**
 * Tüketicinin elle yazdığı "yazıyla tutar" notlarını tanıyan desen.
 *
 * v3.0.0'da kütüphane bu notun TEK kaynağıdır: serializer, `notes` içinde bu
 * desene uyan girdileri atar ve yerine hesapladığı notu ilk sıraya koyar.
 * Aksi halde belgede birbiriyle çelişen iki "yazıyla" notu bulunabilirdi.
 *
 * Hem kütüphane biçimini (`#YAZIYLA:...#`) hem sahada görülen GİB/Mimsoft
 * varyantını (`YAZIYLA:#...#`, `YAZIYLA: ...`) yakalar. `YAZ[Iı]YLA` alternasyonu
 * gerekli: JS'in `i` bayrağı `I` ile noktasız `ı`yı eşleştirmez.
 */
export const AMOUNT_IN_WORDS_NOTE_PATTERN = /^\s*#?\s*YAZ[Iı]YLA\s*:/i;

/** Verilen notun "yazıyla tutar" notu olup olmadığını söyler. */
export function isAmountInWordsNote(note: string): boolean {
  return AMOUNT_IN_WORDS_NOTE_PATTERN.test(note);
}

/**
 * Ödenecek tutardan `#YAZIYLA:...#` notunu üretir.
 *
 * @param amount `LegalMonetaryTotal/PayableAmount`
 * @param currencyCode Belge para birimi (`DocumentCurrencyCode`)
 * @returns Not metni; tutar okunamıyorsa `null`
 *
 * @example
 * formatAmountInWordsNote(182.2, 'TRY')  // '#YAZIYLA:YÜZ SEKSEN İKİ LİRA 20 KURUŞ#'
 * formatAmountInWordsNote(0, 'TRY')      // '#YAZIYLA:SIFIR LİRA 00 KURUŞ#'
 * formatAmountInWordsNote(5.05, 'USD')   // '#YAZIYLA:BEŞ DOLAR 05 SENT#'
 */
export function formatAmountInWordsNote(
  amount: number | undefined | null,
  currencyCode: string | undefined | null,
): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;

  // cbc:PayableAmount ile BİREBİR aynı yuvarlama.
  const fixed = formatDecimal(amount, 2);
  const negative = fixed.startsWith('-');
  const [integerDigits = '0', fractionDigits = '00'] = (
    negative ? fixed.slice(1) : fixed
  ).split('.');

  const integerValue = Number(integerDigits);
  if (!Number.isSafeInteger(integerValue)) return null;

  const units = getAmountInWordsUnits(currencyCode);
  const integerWords = numberToTurkishWords(integerValue);

  // Yuvarlama sonrası sıfırlanan negatifler EKSİ almaz (-0,001 → "SIFIR ...").
  const isZero = integerValue === 0 && Number(fractionDigits) === 0;
  const sign = negative && !isZero ? `${TURKISH_MINUS_WORD} ` : '';

  return (
    AMOUNT_IN_WORDS_PREFIX +
    `${sign}${integerWords} ${units.major} ${fractionDigits} ${units.minor}` +
    AMOUNT_IN_WORDS_SUFFIX
  );
}
