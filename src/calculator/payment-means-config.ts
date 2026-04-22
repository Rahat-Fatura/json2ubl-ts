/**
 * Ödeme Şekli Kodu (PaymentMeansCode) konfigürasyonu.
 *
 * Sık kullanılan 7 kod (UN/EDIFACT 4461 tablosundan seçilmiş) + Türkçe isim.
 * UI dropdown için öncelikli liste. Tam UN/EDIFACT setine talep durumunda genişletilebilir.
 */

export interface PaymentMeansDefinition {
  code: string;
  name: string;
}

export const PAYMENT_MEANS_DEFINITIONS: ReadonlyArray<PaymentMeansDefinition> = [
  { code: '1', name: 'Ödeme Tipi Muhtelif' },
  { code: '10', name: 'Nakit' },
  { code: '20', name: 'Çek' },
  { code: '23', name: 'Banka Çeki' },
  { code: '42', name: 'Havale/EFT' },
  { code: '48', name: 'Kredi Kartı/Banka Kartı' },
  { code: 'ZZZ', name: 'Diğer' },
] as const;

/** Ödeme şekli kodu → PaymentMeansDefinition lookup map */
export const PAYMENT_MEANS_MAP: ReadonlyMap<string, PaymentMeansDefinition> = new Map(
  PAYMENT_MEANS_DEFINITIONS.map(p => [p.code, p]),
);

/** Ödeme şekli kodunun geçerli olup olmadığını kontrol eder. */
export function isValidPaymentMeansCode(code: string): boolean {
  return PAYMENT_MEANS_MAP.has(code);
}

/** Ödeme şekli tanımını getirir */
export function getPaymentMeansDefinition(code: string): PaymentMeansDefinition | undefined {
  return PAYMENT_MEANS_MAP.get(code);
}
