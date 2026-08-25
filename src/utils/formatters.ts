/**
 * Sayıyı SABİT ondalık basamaklı string'e çevirir (varsayılan 2).
 *
 * ⚠️ PARASAL alanların (`*Amount`) tek biçimleyicisi budur ve 2 basamakta
 * KALMALIDIR: `UBL-TR_Common_Schematron.xml:229` `decimalCheck` kuralı
 * `^...(\.[0-9]{1,2})?$` regex'i ile noktadan sonra en fazla 2 hane şart koşar.
 * Kural 6 bağlama uygulanır (`UBL-TR_Main_Schematron.xml`):
 * `LegalMonetaryTotal`'ın 5 alanı + `Invoice/TaxTotal/TaxAmount`.
 */
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Sayıyı EN AZ `minDecimals`, EN FAZLA `maxDecimals` ondalık basamakla yazar;
 * `minDecimals` sınırının üstündeki gereksiz sondaki sıfırlar atılır.
 *
 * Neden: `formatDecimal` sabit basamak yazdığı için hassasiyeti SESSİZCE
 * kırpıyordu (ör. `0,125 kg` → `"0.13"`, `%15 iskonto` → `"0.1"`). Şematron
 * bu alanların hiçbirine format kuralı koymaz (bkz. `formatDecimal` notu:
 * `decimalCheck` yalnız 6 parasal bağlama uygulanır), dolayısıyla basamak
 * artırmak serbesttir. `minDecimals` mevcut çıktı biçimini korumak içindir:
 * `1` miktarı `min=2` ile yine `"1.00"` üretir, geriye uyumluluk bozulmaz.
 *
 * @example
 * formatDecimalRange(1, 2, 6)      // "1.00"    (mevcut davranışla aynı)
 * formatDecimalRange(0.125, 2, 6)  // "0.125"   (eskiden "0.13" idi)
 * formatDecimalRange(0.15, 1, 4)   // "0.15"    (eskiden "0.1" idi)
 * formatDecimalRange(90, 0, 6)     // "90"      (eskiden "90.00" idi)
 */
export function formatDecimalRange(
  value: number,
  minDecimals: number = 0,
  maxDecimals: number = 6,
): string {
  const min = Math.max(0, minDecimals);
  const max = Math.max(min, maxDecimals);

  // toFixed ÖNCE uygulanır: float artefaktlarını (ör. 90.00000000000001)
  // temizler, ardından fazlalık sıfırlar kırpılır.
  const fixed = value.toFixed(max);
  if (min === max || !fixed.includes('.')) return fixed;

  const [intPart, fracRaw] = fixed.split('.');
  let frac = fracRaw;
  while (frac.length > min && frac.endsWith('0')) {
    frac = frac.slice(0, -1);
  }
  return frac.length > 0 ? `${intPart}.${frac}` : intPart;
}

/** Tarih objesini YYYY-MM-DD formatına çevirir */
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') return date;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** XML özel karakterlerini escape eder */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** String'in boş olup olmadığını kontrol eder */
export function isNonEmpty(value: string | undefined | null): value is string {
  return value !== undefined && value !== null && value.trim().length > 0;
}

/** String'in belirtilen uzunlukta olup olmadığını kontrol eder */
export function hasLength(value: string | undefined | null, length: number): boolean {
  return isNonEmpty(value) && value.length === length;
}

/** String'in tamamen numerik olup olmadığını kontrol eder */
export function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}
