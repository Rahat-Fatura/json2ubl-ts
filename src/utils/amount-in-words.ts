/**
 * "Yazıyla tutar" notu (`YAZIYLA:#...#`) — v3.0.0.
 *
 * ## Biçim — SAHADAN ÖLÇÜLDÜ
 * ```
 * YAZIYLA:#<TAMSAYI YAZIYLA> <BÜYÜK BİRİM> <KESİR YAZIYLA> <KÜÇÜK BİRİM>#
 * YAZIYLA:#ÜÇ BİN İKİ YÜZ KIRK ÜÇ TÜRK LIRASI ELLİ ALTI KURUŞ#
 * YAZIYLA:#ALTI YÜZ ALTMIŞ BİN TÜRK LIRASI#                    (kuruş sıfır)
 * ```
 * Biçim uydurulmadı: 88 gerçek fatura notu bayt düzeyinde incelenerek
 * çıkarıldı. Sabitler: `YAZIYLA:#` öneki (88/88), `#` soneki (88/88), tam sayı
 * ve kesir İKİSİ DE YAZIYLA, kuruş sıfırsa kesir kısmı HİÇ yazılmaz.
 *
 * ## 🔴 Sahada İKİ ÜRETİCİ var — hangisini uyguladığımız ve NEDEN
 * Büyük birim ile kesir arasındaki ayırıcı sahada tek tip DEĞİL:
 *
 * | Üretici | Kuruş varken | Kuruş sıfırken | Kayıt |
 * |---|---|---|---|
 * | **A** | `TÜRK LIRASI\n ELLİ ALTI KURUŞ#` | `TÜRK LIRASI\n#` | 66 |
 * | **B** | `TÜRK LIRASI ELLİ ALTI KURUŞ#` | `TÜRK LIRASI#` | 22 |
 *
 * Aynı tutarın (`25576,03`) her iki biçimde de kayıtlı olması iki AYRI üretici
 * olduğunun kanıtıdır — tek üreticinin tutarsızlığı değil.
 *
 * **B uygulandı.** Gerekçe: (a) `cbc:Note` içine gömülü ham satır sonu
 * kırılgandır — XSLT/HTML görüntüleyicide zaten boşluğa çöker, ama XML'i bayt
 * bazlı karşılaştıran herkesi görünmez bir karakterle uğraştırır; (b) tek
 * satırlık biçim sahada ATTESTE ve talep edilen biçimdir; (c) A biçimine
 * geçmek gerekirse `MAJOR_MINOR_SEPARATOR` tek satırlık bir değişikliktir.
 *
 * 🔴 Kuruş sıfırken kapanış `#`inden ÖNCE BOŞLUK YOKTUR. 88 kaydın
 * **hiçbirinde** `LIRASI #` (boşluk + `#`) geçmiyor; 38 kayıtta geçen
 * `LIRASI\n#` bir SATIR SONUdur, boşluk değil. Boşluk bırakmak sahadaki hiçbir
 * üreticiyle eşleşmeyen ÜÇÜNCÜ bir varyant üretirdi.
 *
 * ## Kaynak
 * `LegalMonetaryTotal/PayableAmount` — belgede yazan dip toplam. Not,
 * `cbc:PayableAmount`ın yazdığı string'in AYNI yuvarlamasından
 * (`formatDecimal(x, 2)`) türetilir; not ile XML'deki tutar asla ayrışamaz.
 *
 * ## Kararlar
 * - **Kesir YAZIYLA:** `,56` → `ELLİ ALTI KURUŞ`, `,05` → `BEŞ KURUŞ`,
 *   `,15` → `ON BEŞ KURUŞ`. Kesir de saf sayı okuma modülünden geçer.
 * - **Kuruş sıfırsa** kesir kısmı HİÇ yazılmaz (sahadan ölçüldü).
 * - **Sıfır tutar:** `YAZIYLA:#SIFIR TÜRK LIRASI#`. Not koşulsuz eklendiği için
 *   atlanmaz; `SIFIR` doğru Türkçe okunuştur ve kuruş da sıfır olduğu için
 *   kesir kısmı yukarıdaki kuralla düşer.
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

/** Not öneki — `YAZIYLA:#` (sahada 88/88). */
export const AMOUNT_IN_WORDS_PREFIX = 'YAZIYLA:#';

/** Not soneki — `#` (sahada 88/88). */
export const AMOUNT_IN_WORDS_SUFFIX = '#';

/**
 * Büyük birim ile kesir kısmı arasındaki ayırıcı.
 *
 * Sahadaki B üreticisi tek boşluk kullanır; A üreticisi `'\n '` kullanır
 * (bkz. dosya başı). A biçimine geçmek gerekirse YALNIZ burası değişir.
 */
const MAJOR_MINOR_SEPARATOR = ' ';

/**
 * Tüketicinin elle yazdığı "yazıyla tutar" notlarını tanıyan desen.
 *
 * v3.0.0'da kütüphane bu notun TEK kaynağıdır: serializer, `notes` içinde bu
 * desene uyan girdileri atar ve yerine hesapladığı notu ilk sıraya koyar.
 * Aksi halde belgede birbiriyle çelişen iki "yazıyla" notu bulunabilirdi.
 *
 * Hem kütüphane biçimini (`YAZIYLA:#...#`) hem de sahada/eski kodda görülen
 * `#YAZIYLA:...#` ve `YAZIYLA: ...` varyantlarını yakalar. `YAZ[Iı]YLA`
 * alternasyonu gerekli: JS'in `i` bayrağı `I` ile noktasız `ı`yı eşleştirmez.
 */
export const AMOUNT_IN_WORDS_NOTE_PATTERN = /^\s*#?\s*YAZ[Iı]YLA\s*:/i;

/** Verilen notun "yazıyla tutar" notu olup olmadığını söyler. */
export function isAmountInWordsNote(note: string): boolean {
  return AMOUNT_IN_WORDS_NOTE_PATTERN.test(note);
}

/**
 * Ödenecek tutardan `YAZIYLA:#...#` notunu üretir.
 *
 * @param amount `LegalMonetaryTotal/PayableAmount`
 * @param currencyCode Belge para birimi (`DocumentCurrencyCode`)
 * @returns Not metni; tutar okunamıyorsa `null`
 *
 * @example
 * formatAmountInWordsNote(3243.56, 'TRY')
 * // 'YAZIYLA:#ÜÇ BİN İKİ YÜZ KIRK ÜÇ TÜRK LIRASI ELLİ ALTI KURUŞ#'
 * formatAmountInWordsNote(660000, 'TRY')
 * // 'YAZIYLA:#ALTI YÜZ ALTMIŞ BİN TÜRK LIRASI#'
 * formatAmountInWordsNote(0, 'TRY')
 * // 'YAZIYLA:#SIFIR TÜRK LIRASI#'
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
  const fractionValue = Number(fractionDigits);

  const units = getAmountInWordsUnits(currencyCode);
  const integerWords = numberToTurkishWords(integerValue);

  // Yuvarlama sonrası sıfırlanan negatifler EKSİ almaz (-0,001 → "SIFIR ...").
  const isZero = integerValue === 0 && fractionValue === 0;
  const sign = negative && !isZero ? `${TURKISH_MINUS_WORD} ` : '';

  // Kuruş SIFIRSA kesir kısmı hiç yazılmaz — ayırıcı da yazılmaz (sahadan
  // ölçüldü: kapanış `#`inden önce boşluk YOK).
  const minorPart =
    fractionValue === 0
      ? ''
      : `${MAJOR_MINOR_SEPARATOR}${numberToTurkishWords(fractionValue)} ${units.minor}`;

  return (
    AMOUNT_IN_WORDS_PREFIX +
    `${sign}${integerWords} ${units.major}${minorPart}` +
    AMOUNT_IN_WORDS_SUFFIX
  );
}
