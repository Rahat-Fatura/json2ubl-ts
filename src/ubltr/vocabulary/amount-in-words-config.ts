/**
 * "Yazıyla tutar" notundaki para birimi adları (v3.0.0).
 *
 * ## ÖLÇÜLDÜ / SEÇİLDİ ayrımı
 * Bu tablodaki her ad ya SAHADAN ÖLÇÜLDÜ ya da makul biçimde SEÇİLDİ. Ayrım
 * depoda önemlidir: ölçülen adlar sahadaki üreticiyle **bayt düzeyinde**
 * eşleşir ve Türkçe yazım kuralına aykırı olsalar bile DÜZELTİLMEZ; seçilen
 * adlar ise doğru Türkçe yazımla yazılır ve saha kanıtı çıkarsa değiştirilebilir.
 *
 * 🔴 `TÜRK LIRASI`, `AMERIKAN DOLARI` **noktasız `I`** (U+0049) ile yazılmıştır.
 * Türkçe yazım kuralına göre `LİRASI` / `AMERİKAN` doğru olurdu; saha standardı
 * böyle DEĞİL. 88 gerçek fatura notunda 86 kez `TÜRK LIRASI` geçiyor ve
 * **hiçbirinde** noktalı `İ` yok. Amaç alanı birebir eşlemektir — bu bilinçli
 * bir "yanlış yazım", düzeltmeyin.
 *
 * `calculator/currency-config.ts`teki `CURRENCY_DEFINITIONS` ayrı bir amaca
 * (DB'den embed edilmiş kur listesi) hizmet eder; oradaki `unit` alanı çoğu kod
 * için BOŞ ve `subunit` değerleri karışık dilde/çoğuldur (`Cents`, `Pence`,
 * `Øre`). Not Türkçe ve BÜYÜK HARF olmak zorunda olduğundan ayrı tablo tutulur.
 */

/** Bir para biriminin yazıyla gösterimdeki büyük/küçük birim adları. */
export interface AmountInWordsUnits {
  /** Büyük birim — ör. `TÜRK LIRASI` */
  major: string;
  /** Küçük birim (1/100) — ör. `KURUŞ` */
  minor: string;
}

/**
 * Para birimi kodu → yazıyla birim adları. Tek satırla genişletilebilir.
 *
 * | Kod | Büyük birim | Küçük birim |
 * |---|---|---|
 * | `TRY` | ÖLÇÜLDÜ (86 kayıt) | ÖLÇÜLDÜ (33 kayıt) |
 * | `USD` | ÖLÇÜLDÜ (1 kayıt) | seçildi — saha kanıtı yok |
 * | `EUR` | ÖLÇÜLDÜ (1 kayıt) | seçildi — saha kanıtı yok |
 * | `GBP` | seçildi — saha kanıtı yok | seçildi — saha kanıtı yok |
 */
export const AMOUNT_IN_WORDS_UNITS: Readonly<Record<string, AmountInWordsUnits>> = {
  // ÖLÇÜLDÜ: 86 gerçek fatura notu, tamamı noktasız I ile `TÜRK LIRASI`.
  // Küçük birim 33 kayıtta `KURUŞ` (Ş = U+015E).
  TRY: { major: 'TÜRK LIRASI', minor: 'KURUŞ' },
  // ÖLÇÜLDÜ (büyük birim): `YAZIYLA:#ON BİN AMERIKAN DOLARI#` — AMERIKAN ve
  // DOLARI noktasız I ile. Küçük birim SEÇİLDİ: kayıt kuruşsuz, kanıt yok.
  USD: { major: 'AMERIKAN DOLARI', minor: 'SENT' },
  // ÖLÇÜLDÜ (büyük birim): `YAZIYLA:#ÜÇ BİN SEKİZ YÜZ ON AVRO#` — `EURO` DEĞİL
  // `AVRO`. Küçük birim SEÇİLDİ.
  EUR: { major: 'AVRO', minor: 'SENT' },
  // SEÇİLDİ (ikisi de): saha kanıtı yok. Seçilen adlar doğru Türkçe yazımla
  // yazılır (noktalı İ) — ölçülenlerden farklı olarak burada saha taklidi yok.
  GBP: { major: 'İNGİLİZ STERLİNİ', minor: 'PENİ' },
};

/**
 * Tablo dışı kodlarda kullanılan küçük birim adı.
 *
 * Gerekçe: Türkçe bir notta 1/100 alt biriminin genel karşılığı "kuruş"tur;
 * uydurma bir ad ("SANTİM", "CENT") yazmaktansa bu tercih edilir.
 */
export const DEFAULT_MINOR_UNIT = 'KURUŞ';

/** Para birimi kodu boş/eksik geldiğinde varsayılan kod. */
export const DEFAULT_CURRENCY_CODE_FOR_WORDS = 'TRY';

/**
 * Verilen para birimi kodu için yazıyla birim adlarını döner.
 *
 * Bilinmeyen kodda:
 * - büyük birim = ISO kodunun kendisi (ör. `CHF`) — asla uydurulmaz, belgede
 *   yazan kodun aynısıdır
 * - küçük birim = {@link DEFAULT_MINOR_UNIT}
 *
 * Kod boş/eksikse {@link DEFAULT_CURRENCY_CODE_FOR_WORDS} varsayılır.
 */
export function getAmountInWordsUnits(currencyCode: string | undefined | null): AmountInWordsUnits {
  const code = (currencyCode ?? '').trim().toUpperCase();
  if (code === '') {
    return AMOUNT_IN_WORDS_UNITS[DEFAULT_CURRENCY_CODE_FOR_WORDS]!;
  }
  const known = AMOUNT_IN_WORDS_UNITS[code];
  if (known) return known;
  return { major: code, minor: DEFAULT_MINOR_UNIT };
}
