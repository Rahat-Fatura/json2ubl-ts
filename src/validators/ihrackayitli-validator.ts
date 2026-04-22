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
 * ## Tetikleyici
 * `invoiceTypeCode === 'IHRACKAYITLI'` **AND** en az bir satır taxSubtotal'da
 * `taxExemptionReasonCode === '702'`.
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

import { InvoiceTypeCode } from '../types/enums';
import type { InvoiceInput } from '../types/invoice-input';
import type { ValidationError } from '../errors/ubl-build-error';

/** IHRACKAYITLI CustomsDeclaration PartyIdentification schemeID whitelist (Schematron satır 451) */
const IHRAC_KAYITLI_SCHEME_IDS: ReadonlySet<string> = new Set([
  'SATICIDIBSATIRKOD',
  'ALICIDIBSATIRKOD',
]);

export function validateIhrackayitli702(input: InvoiceInput): ValidationError[] {
  if (input.invoiceTypeCode !== InvoiceTypeCode.IHRACKAYITLI) return [];

  const has702 = input.lines.some(line =>
    line.taxTotal.taxSubtotals.some(ts => ts.taxExemptionReasonCode === '702'),
  );
  if (!has702) return [];

  const errors: ValidationError[] = [];

  input.lines.forEach((line, idx) => {
    const pathPrefix = `lines[${idx}]`;

    // 1. GTİP kontrolü (RequiredCustomsID 12 hane)
    const goodsItems = line.delivery?.shipment?.goodsItems ?? [];
    const hasGtip12 = goodsItems.some(
      gi => gi.requiredCustomsId && gi.requiredCustomsId.length === 12,
    );
    if (!hasGtip12) {
      errors.push({
        code: 'IHRACKAYITLI_702_REQUIRES_GTIP',
        message: 'IHRACKAYITLI + 702 için her satırda 12 haneli GTİP (RequiredCustomsID) zorunlu',
        path: `${pathPrefix}.delivery.shipment.goodsItems[].requiredCustomsId`,
        expected: '12 hane GTİP',
        actual: goodsItems.length === 0 ? 'goodsItems boş' : '12 hane değil',
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
