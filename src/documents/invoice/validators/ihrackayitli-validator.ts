/**
 * B-07 — IHRACKAYITLI + 702 senaryosu validator.
 *
 * ## Normatif Kaynak
 * - UBL-TR Common Schematron rule satır 322 (`TaxExemptionReasonCodeCheck`):
 *   ```xml
 *   <sch:assert test="not(InvoiceTypeCode = 'IHRACKAYITLI' and TaxExemptionReasonCode = '702') or
 *     (count(InvoiceLine/Delivery/Shipment[
 *       GoodsItem/RequiredCustomsID[string-length=12] and
 *       TransportHandlingUnit/CustomsDeclaration/IssuerParty/PartyIdentification/ID[@schemeID='ALICIDIBSATIRKOD' and string-length=11]
 *     ]) = count(InvoiceLine))">
 *     IHRACKAYITLI fatura tipinde 702 Muafiyet sebebi için GTİP ve Alıcı Satır Kodu bilgisi girilmelidir
 *   </sch:assert>
 *   ```
 * - UBL-TR Common Schematron rule satır 451: `IhracKayitliPartyIdentificationIDType`
 *   whitelist = `SATICIDIBSATIRKOD | ALICIDIBSATIRKOD`.
 *
 * ## Tetikleyici — tek kapsam (5.2.0)
 * `isIhracKayitli702Scope(invoiceTypeCode, özet kodları, istisna satır kodları)`:
 * tip `IHRACKAYITLI` **ve** (belge düzeyi `taxTotals[].taxSubtotals[]` içinde
 * `taxExemptionReasonCode === '702'` **veya** KDV'den istisna bir satır alt
 * toplamında 702). Şematronun tetiği birinci ayaktır (kural bağlamı belge
 * düzeyi `TaxTotal/TaxSubtotal/TaxCategory`); kütüphanenin kurduğu belgede
 * ikinci ayak özetten bir şey eklemez.
 *
 * 5.1.0'a kadar SATIR alt toplamlarına bakılıyordu. Eşleyici belge özetini
 * yalnız belge koduyla yazdığı için iki yönde de ayrışıyordu:
 *   • belge kodu 702, iki 701 satırı → satırlarda 702 yok, doğrulayıcı susuyor;
 *     özet 702 olduğu için GİB reddediyordu (GTİP'siz satır);
 *   • karışık 702 + 701 → özet 701, GİB kuralı tetiklenmiyordu; doğrulayıcı her
 *     satırda GTİP istiyordu (GİB'den katı).
 * 5.2.0'da özet satırların istisna kodlarına göre gruplanır
 * (`resolveSummaryExemptionCode`); satır bayrakları ve oturum aynı cevabı özet
 * kurulmadan önce verir (`isIhracKayitli702Invoice`).
 *
 * ## Kontroller (her satır için)
 * 1. `line.delivery.shipment.goodsItems[].requiredCustomsId.length === 12` (GTİP)
 * 2. `line.delivery.shipment.transportHandlingUnits[].customsDeclarations[].issuerParty
 *    .partyIdentifications[]` içinde en az bir girdi:
 *    `schemeID === 'ALICIDIBSATIRKOD'` **AND** `id.length === 11`
 * 3. Tüm CustomsDeclaration PartyIdentification schemeID'leri whitelist'te.
 *
 * **NOT:** 702 geçerli IHRACKAYITLI kodu (701/702/703/704 hepsi geçerli); bu validator
 * sadece 702 kullanılırsa ek CustomsDeclaration kontrolünü ekler — 702 zorunluluğu yok.
 */

import { InvoiceTypeCode } from '../../../types/enums';
import type { InvoiceInput } from '../../../types/invoice-input';
import type { ValidationError } from '../../../errors/ubl-build-error';
import { isNonEmpty } from '../../../utils/formatters';
import { isValidGtip, describeGtipDefect, GTIP_DIGIT_COUNT } from '../../../utils/gtip';
import { isIhracKayitli702Scope } from '../../../ubltr/vocabulary/schematron-scopes';

/** IHRACKAYITLI CustomsDeclaration PartyIdentification schemeID whitelist (Schematron satır 451) */
const IHRAC_KAYITLI_SCHEME_IDS: ReadonlySet<string> = new Set([
  'SATICIDIBSATIRKOD',
  'ALICIDIBSATIRKOD',
]);

export function validateIhrackayitli702(input: InvoiceInput): ValidationError[] {
  if (input.invoiceTypeCode !== InvoiceTypeCode.IHRACKAYITLI) return [];

  const summaryCodes = (input.taxTotals ?? []).flatMap(tt =>
    tt.taxSubtotals.map(ts => ts.taxExemptionReasonCode),
  );
  /* KDV'den istisna satır alt toplamları: oran 0 (ya da yazılmamış) veya
   * vazgeçilen KDV (`CalculationSequenceNumeric=-1`). KDV'li satırın kodu
   * kapsamı açmaz — o kod belge özetine de taşınmaz (`resolveSummaryExemptionCode`). */
  const exemptLineCodes = input.lines.flatMap(line =>
    line.taxTotal.taxSubtotals
      .filter(ts => (ts.percent ?? 0) === 0 || ts.calculationSequenceNumeric === -1)
      .map(ts => ts.taxExemptionReasonCode),
  );
  if (!isIhracKayitli702Scope(input.invoiceTypeCode, summaryCodes, exemptLineCodes)) return [];

  const errors: ValidationError[] = [];

  input.lines.forEach((line, idx) => {
    const pathPrefix = `lines[${idx}]`;

    /* 1. GTİP kontrolü (RequiredCustomsID 12 hane).
     *
     * Ölçüm `utils/gtip`'e devredildi. Eski `requiredCustomsId.length === 12`
     * HAM karakter sayıyordu ve iki yönde de yanlıştı:
     *   • `'8471.30.0000.00'` (15 karakter) REDDEDİLİYORDU — oysa değer 12
     *     haneyi taşıyor, yalnız noktalı yazılmış; serileştirici artık
     *     noktasız bastığı için belge GİB'e GEÇERLİ gidiyor.
     *   • `' 847130000000 '` (14 karakter) REDDEDİLİYORDU — oysa şematron
     *     `normalize-space` ile boşluğu kırpıp 12 sayar, yani GİB KABUL
     *     ediyordu; kütüphane GİB'den katı davranıyordu.
     *
     * Normalizasyon tolere edici, doğrulama katı: `isValidGtip` normalize
     * edilmiş değerin TAM 12 RAKAM olmasını şart koşar. */
    const goodsItems = line.delivery?.shipment?.goodsItems ?? [];
    const hasGtip12 = goodsItems.some(gi => isValidGtip(gi.requiredCustomsId));
    if (!hasGtip12) {
      const firstGtip = goodsItems.find(gi => isNonEmpty(gi.requiredCustomsId))?.requiredCustomsId;
      errors.push({
        code: 'IHRACKAYITLI_702_REQUIRES_GTIP',
        message: 'IHRACKAYITLI + 702 için her satırda 12 haneli GTİP (RequiredCustomsID) zorunlu',
        path: `${pathPrefix}.delivery.shipment.goodsItems[].requiredCustomsId`,
        expected: `${GTIP_DIGIT_COUNT} hane GTİP (noktasız)`,
        actual: goodsItems.length === 0
          ? 'goodsItems boş'
          : (describeGtipDefect(firstGtip) ?? `${GTIP_DIGIT_COUNT} hane değil`),
      });
    }

    // 2. ALICIDIBSATIRKOD kontrolü (PartyIdentification 11 hane + schemeID)
    const thus = line.delivery?.shipment?.transportHandlingUnits ?? [];
    const hasAlici11 = thus.some(thu =>
      thu.customsDeclarations?.some(cd =>
        cd.issuerParty?.partyIdentifications?.some(
          pi => pi.schemeID === 'ALICIDIBSATIRKOD' && pi.id.length === 11,
        ),
      ),
    );
    if (!hasAlici11) {
      errors.push({
        code: 'IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD',
        message: 'IHRACKAYITLI + 702 için her satırda 11 haneli ALICIDIBSATIRKOD zorunlu',
        path: `${pathPrefix}.delivery.shipment.transportHandlingUnits[].customsDeclarations[].issuerParty.partyIdentifications[]`,
        expected: '11 hane ALICIDIBSATIRKOD',
        actual: 'eksik veya yanlış uzunluk',
      });
    }

    // 3. schemeID whitelist kontrolü (Schematron satır 451)
    thus.forEach((thu, thuIdx) => {
      thu.customsDeclarations?.forEach((cd, cdIdx) => {
        cd.issuerParty?.partyIdentifications?.forEach((pi, piIdx) => {
          if (!IHRAC_KAYITLI_SCHEME_IDS.has(pi.schemeID)) {
            errors.push({
              code: 'IHRACKAYITLI_INVALID_SCHEME_ID',
              message: 'Geçersiz IHRACKAYITLI schemeID — SATICIDIBSATIRKOD veya ALICIDIBSATIRKOD olmalı',
              path: `${pathPrefix}.delivery.shipment.transportHandlingUnits[${thuIdx}].customsDeclarations[${cdIdx}].issuerParty.partyIdentifications[${piIdx}].schemeID`,
              expected: 'SATICIDIBSATIRKOD|ALICIDIBSATIRKOD',
              actual: pi.schemeID,
            });
          }
        });
      });
    });
  });

  return errors;
}
