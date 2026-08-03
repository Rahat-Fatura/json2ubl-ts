/**
 * "Yazıyla tutar" notundaki para birimi adları (v3.0.0).
 *
 * `calculator/currency-config.ts`teki `CURRENCY_DEFINITIONS` tablosu ayrı bir
 * amaca (DB'den embed edilmiş kur listesi) hizmet eder; oradaki `unit` alanı
 * çoğu kod için BOŞ ve `subunit` değerleri karışık dilde/çoğuldur
 * (`Cents`, `Pence`, `Øre`). Not metni Türkçe ve BÜYÜK HARF olmak zorunda
 * olduğundan burada **ayrı ve genişletilebilir** bir tablo tutulur.
 */

/** Bir para biriminin yazıyla gösterimdeki büyük/küçük birim adları. */
export interface AmountInWordsUnits {
  /** Büyük birim — ör. `LİRA` */
  major: string;
  /** Küçük birim (1/100) — ör. `KURUŞ` */
  minor: string;
}

/**
 * Para birimi kodu → yazıyla birim adları.
 *
 * Genişletilebilir: yeni bir kur için tek satır eklemek yeterlidir. Kasıtlı
 * olarak dar tutulmuştur — uydurma birim adı yazmaktansa (bkz.
 * `DEFAULT_MINOR_UNIT`) ISO koduna düşmek tercih edilir.
 */
export const AMOUNT_IN_WORDS_UNITS: Readonly<Record<string, AmountInWordsUnits>> = {
  TRY: { major: 'LİRA', minor: 'KURUŞ' },
  USD: { major: 'DOLAR', minor: 'SENT' },
  EUR: { major: 'EURO', minor: 'SENT' },
  GBP: { major: 'STERLİN', minor: 'PENİ' },
};

/**
 * Tablo dışı kodlarda kullanılan küçük birim adı.
 *
 * Gerekçe: kesir hanesi zaten RAKAMLA yazıldığı için küçük birim adı sayısal
 * bilgi taşımaz; Türkçe bir notta 1/100 alt biriminin genel karşılığı
 * "kuruş"tur. Uydurma bir ad ("SANTİM", "CENT") yazmaktansa bu tercih edilir.
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
