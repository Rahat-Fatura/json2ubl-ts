/**
 * Ödeme Şekli Kodu (`cbc:PaymentMeansCode`) konfigürasyonu.
 *
 * ── İKİ AYRI ŞEY, KARIŞTIRILMASIN ───────────────────────────────────────────
 *
 *  1. **GEÇERLİ KOD KÜMESİ** — `PAYMENT_MEANS_CODES` (`config/constants.ts`),
 *     şematronun `$PaymentMeansCodeTypeList` değişkeninden birebir: 75 kod.
 *     "Bu kod GİB kapısından geçer mi" sorusunun cevabı ORASIDIR.
 *  2. **ADLANDIRILMIŞ ÖNERİLER** — aşağıdaki `PAYMENT_MEANS_DEFINITIONS`,
 *     yalnız 7 kod. Türkçe adı OLAN kodlar bunlardır; liste bir ERGONOMİ
 *     yüzeyidir, geçerlilik sınırı DEĞİLDİR.
 *
 * 🔴 4.5.3 öncesinde ikisi tek şey sanılıyordu: `isValidPaymentMeansCode` 7'lik
 * öneri listesine bakıyordu ve adı "geçerli mi" diye vaat ettiği hâlde GİB'in
 * kabul ettiği 68 kodu GEÇERSİZ sayıyordu. Kütüphanede hiçbir doğrulayıcı onu
 * çağırmadığı için fatura kesmeyi engellemiyordu ama tüketicisi (portal) seçim
 * listesini 7 koda kilitlemişti — "Kredi" gibi meşru bir kod SEÇİLEMİYORDU.
 * Yüklem artık şematron kümesini okur.
 */

import { PAYMENT_MEANS_CODES } from '../config/constants';

export interface PaymentMeansDefinition {
  code: string;
  name: string;
}

/**
 * Türkçe adı OLAN ödeme şekilleri — ÖNERİ listesi, KAPALI LİSTE DEĞİL.
 *
 * GİB'in UBL-TR kod listesi kılavuzu bu yedisini Türkçe adlandırır; şematronun
 * kabul ettiği kalan 68 kodun Türkçe karşılığı YOKTUR. Eksik adları uydurmak
 * yerine liste olduğu gibi bırakıldı: ekranda adlandırılmışlar öneri olarak
 * sunulur, kalan geçerli kodlar serbest girilir ve kendi koduyla görünür.
 * (Aynı asimetri kap cinsinde de var: ~400 geçerli kod, 27 adlandırılmış —
 * bkz. `package-type-code-config.ts`.)
 *
 * ⚠️ Buraya kod EKLEMEK geçerliliği genişletmez; geçerlilik
 * `PAYMENT_MEANS_CODES` kümesindedir. Eklenen kodun o kümede de olması ŞARTTIR
 * (test bunu kilitler) ve Türkçe adı GİB kılavuzundan gelmelidir.
 */
export const PAYMENT_MEANS_DEFINITIONS: ReadonlyArray<PaymentMeansDefinition> = [
  { code: '1', name: 'Ödeme Tipi Muhtelif' },
  { code: '10', name: 'Nakit' },
  { code: '20', name: 'Çek' },
  { code: '23', name: 'Banka Çeki' },
  { code: '42', name: 'Havale/EFT' },
  { code: '48', name: 'Kredi Kartı/Banka Kartı' },
  { code: 'ZZZ', name: 'Diğer' },
] as const;

/** Ödeme şekli kodu → adlandırılmış öneri lookup map (7 kod). */
export const PAYMENT_MEANS_MAP: ReadonlyMap<string, PaymentMeansDefinition> = new Map(
  PAYMENT_MEANS_DEFINITIONS.map(p => [p.code, p]),
);

/**
 * Kod GİB'in kabul ettiği kümede mi? — ŞEMATRON gerçeği (75 kod).
 *
 * 🔑 `PAYMENT_MEANS_MAP`'e (7 öneri) BAKMAZ. Yüklemin adı "geçerli mi" diye
 * soruyor; cevabı da GİB'in kabul ettiği küme vermeli, ekranın rahatlık listesi
 * değil. Adı olmayan geçerli bir kod (ör. `30`) burada `true` döner.
 */
export function isValidPaymentMeansCode(code: string): boolean {
  return PAYMENT_MEANS_CODES.has(code);
}

/**
 * Kodun Türkçe adını getirir — YALNIZ adlandırılmış 7 kod için.
 *
 * Geçerli ama adsız bir kodda `undefined` döner; çağıran o durumda kodun
 * kendisini göstermelidir (ad UYDURULMAZ). "Geçerli mi" sorusu bu fonksiyonla
 * DEĞİL, `isValidPaymentMeansCode` ile sorulur.
 */
export function getPaymentMeansDefinition(code: string): PaymentMeansDefinition | undefined {
  return PAYMENT_MEANS_MAP.get(code);
}
