/**
 * İHRAÇ KAYITLI 702 etkin kapsamı — `SimpleInvoiceInput` katmanı (5.2.0).
 *
 * Tanım `ubltr/vocabulary/schematron-scopes.ts`te yaşar (`isIhracKayitli702Scope`):
 * tip İHRAÇ KAYITLI ve belge vergi özetinde 702. Bu katmanda özet henüz
 * kurulmamıştır; her kalemin özete taşıyacağı kod, eşleyicinin vergi özetini
 * gruplarken kullandığı AYNI fonksiyonla hesaplanır (`resolveSummaryExemptionCode`):
 *
 *   • KDV'den istisna kalem (oran 0) kendi kodunu taşır, kodu yoksa belge kodunu;
 *   • KDV'li kalem belge kodunu taşır;
 *   • kalemin 701–704 dışı kendi kodu (301, 350 …) özete taşınmaz, kalem belge
 *     koduna katılır — belge kodu 702 ise kapsam bu kalemden de açılır.
 *
 * Sonuç: kapsam açık ⇔ üretilecek XML'in vergi özetinde 702 var ⇔ GİB
 * `TaxExemptionReasonCodeCheck` bütün satırlarda GTİP + ALICIDIBSATIRKOD ister.
 * Satır bayrakları (`deriveLineFieldVisibility`), oturum doğrulaması
 * (`validateInvoiceState` B-78.3), öneri kuralları ve katı kurulum
 * (`validateIhrackayitli702`) aynı cevabı verir.
 *
 * Kullanım örnekleri (İHRAÇ KAYITLI):
 *
 * | Belge kodu | Satır kodları | Özet       | Kapsam |
 * |---|---|---|---|
 * | 702        | kodsuz, kodsuz | 702        | açık   |
 * | —          | 702, 701       | 702 + 701  | açık   |
 * | 701        | 702, 701       | 702 + 701  | açık   |
 * | 702        | 701, 701       | 701        | KAPALI — belge kodu hiçbir satıra uygulanmıyor |
 *
 * Son satır bilinçlidir: belge kodu, kendi kodu olmayan satırların varsayılanıdır.
 * Bütün satırlar kendi koduyla 702 dışını seçtiyse 702 XML'e hiç yazılmaz,
 * GİB'in 702 kuralı da çalışmaz. Kapsamı açmak katı kurulumu GİB'den katı yapardı.
 *
 * ⚠️ Tip verilmezse kapsam kapalıdır. Oturum tipi her zaman doldurur; hesap
 * motorunun tipi istisna kodundan tahmin etmesi (`resolveInvoiceType`) bu
 * yükleme taşınmadı — öbür satır bayrakları da tipi tahmin etmez.
 */

import { isIhracKayitli702Scope, resolveSummaryExemptionCode } from '../ubltr/vocabulary/schematron-scopes';

/** Kapsamın okuduğu en dar girdi — portal formu ve oturum ikisi de karşılar. */
export interface IhracKayitli702ScopeInput {
  type?: string | null;
  kdvExemptionCode?: string | null;
  lines?: ReadonlyArray<{ kdvExemptionCode?: string | null; kdvPercent: number }> | null;
}

/** Kalemlerin belge vergi özetine taşıyacağı istisna kodları, satır sırasıyla. */
export function ihracKayitli702SummaryCodes(input: IhracKayitli702ScopeInput): Array<string | undefined> {
  return (input.lines ?? []).map(line =>
    resolveSummaryExemptionCode(line, input.kdvExemptionCode, { invoiceType: input.type }));
}

/**
 * Belge İHRAÇ KAYITLI 702 etkin kapsamında mı?
 *
 * `true` iken bütün satırlarda GTİP (12 hane), ALICI DİB satır kodu (11 hane)
 * zorunludur; SATICI DİB satır kodu kutusu açılır ama zorunlu değildir.
 */
export function isIhracKayitli702Invoice(input: IhracKayitli702ScopeInput): boolean {
  if (input.type !== 'IHRACKAYITLI') return false;
  return isIhracKayitli702Scope(input.type, ihracKayitli702SummaryCodes(input));
}
