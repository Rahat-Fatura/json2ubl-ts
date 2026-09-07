/**
 * ILAC_TIBBICIHAZ profili kalem kimliği kontrolü — simple-input katmanı.
 *
 * GİB'in ilaç / tıbbi cihaz profili için kalem düzeyindeki kısıtı şudur:
 *
 *   `ProfileID='ILAC_TIBBICIHAZ'` iken HER `cac:InvoiceLine`, `schemeID`
 *   değeri `ILAC`, `TIBBICIHAZ` veya `DIGER` olan ve BOŞ OLMAYAN bir
 *   `cac:Item/cac:AdditionalItemIdentification/cbc:ID` taşımalıdır.
 *
 * @see schematrons/UBL-TR_Common_Schematron.xml:454-456
 *      — `IlacTibbiCihazAdditionalItemIdentificationCheck`
 * @see schematrons/UBL-TR_Main_Schematron.xml:237
 *      — kural `inv:Invoice/cac:InvoiceLine` bağlamına bağlanır
 *
 * ── KAPSAM: ŞEMATRONLA BİREBİR, DAHA KATI DEĞİL ────────────────────────────
 * HKS künye kuralının aksine bu kural SAYIM-BAZLI DEĞİL, gerçekten SATIR
 * BAZLIDIR (`count(...) > 0` bağlamı tek bir satırdır). Dolayısıyla HKS'te
 * kapatmak zorunda kaldığımız "sayım deliği" burada YOKTUR ve fazladan katılık
 * eklemeye gerek yoktur.
 *
 * Bilinçli olarak UYGULANMAYAN iki katılık:
 *   1. ÇOKLU kimliğe izin verilir. Bir kalem birden çok kutu/karekod taşıyabilir;
 *      canlı sonda (xslt-service :8081, paket 20260701) aynı satırda 2 × ILAC +
 *      1 × DIGER içeren belge 0 ihlalle yeşil döndü.
 *   2. DEĞER BİÇİMİ denetlenmez. Şematron yalnız `normalize-space()` uzunluğuna
 *      bakar; hiçbir uzunluk/desen şartı yoktur. Canlı sonda GTIN-13, tam GS1
 *      karekod dizgisi ve serbest metin ("DG-MTX-962") üçü de yeşil döndü.
 *      Biçim dayatmak GİB'in KABUL ETTİĞİ belgeleri reddetmek olurdu — özellikle
 *      `DIGER` şeması tanımı gereği serbest metindir.
 *
 * ── NEDEN YENİ BİR DOSYA ───────────────────────────────────────────────────
 * Bu kuralın `InvoiceInput` katmanı eşleniği `profile-validators.ts`
 * (`validateIlacTibbiCihaz`) içinde zaten var; ancak o YALNIZ
 * `validationLevel='strict'` altında çalışıyor. InvoiceSession/UI akışı kuralı
 * hiç görmüyordu — kimliksiz ILAC_TIBBICIHAZ faturası portalda sessizce
 * üretilip GİB şematronunda reddediliyordu. Mesajlar bilinçli olarak
 * `validateIlacTibbiCihaz` ile aynı sözcüklerle kurulur; iki katman aynı
 * ihlali aynı dille anlatsın.
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
import { InvoiceProfileId } from '../types/enums';
import { profileRequirement } from './validation-result';

/**
 * Şematronun kabul ettiği `schemeID` kümesi — bu üçü DIŞINDAKİ hiçbir şema
 * kuralı karşılamaz. Canlı sonda `ETIKETNO` (İDİS'in şeması) ILAC_TIBBICIHAZ
 * profilinde ihlal ürettiği doğrulandı; iki profil KARIŞTIRILMAMALIDIR.
 */
export const ILAC_ITEM_ID_SCHEME_IDS = ['ILAC', 'TIBBICIHAZ', 'DIGER'] as const;

export function validateIlacTibbiCihazItemId(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.profile !== InvoiceProfileId.ILAC_TIBBICIHAZ) {
    return errors;
  }

  const validSchemes = new Set<string>(ILAC_ITEM_ID_SCHEME_IDS);

  input.lines.forEach((line, i) => {
    /* Şematron `string-length(normalize-space())` ile ölçüyor: yalnız boşluktan
     * ibaret bir cbc:ID onun sayımına GİRMEZ. `trim()` bunu birebir taklit eder. */
    const hasValidId = (line.additionalItemIdentifications ?? []).some(
      a => validSchemes.has(a.schemeId) && (a.value?.trim() ?? '') !== '',
    );

    if (!hasValidId) {
      errors.push(profileRequirement(InvoiceProfileId.ILAC_TIBBICIHAZ,
        `lines[${i}].additionalItemIdentifications`,
        `ILAC_TIBBICIHAZ profilinde her satırda ILAC, TIBBICIHAZ veya DIGER `
        + `AdditionalItemIdentification zorunludur (satır ${i + 1}: ${line.name})`));
    }
  });

  return errors;
}
