/**
 * e-MM XML ŞEKLİ — `CreditNote` kökü, `CREDIT_NOTE_SEQ` sırası.
 *
 * ── 🔑 GÖVDE YAZILMAZ, BİLEŞENLERDEN KURULUR ───────────────────────────────
 * Bu dosyada tek bir `<cac:…>` gövdesi ELLE üretilmez. Taraf, kalem, kesinti,
 * parasal toplam, teslim, ek belge ve kur bloklarının tamamı `ubl/components/*`
 * bileşenlerinden gelir. Kök farkı (`Invoice` → `CreditNote`) bu bileşenlerin
 * HİÇBİRİNİ değiştirmez; değişen yalnız kök sekansı ve satır üreticisidir.
 *
 * Sıra elle kurulmaz: `emitInOrder(CREDIT_NOTE_SEQ, …)`. Tablo GİB paketindeki
 * `UBL-CreditNote-2.1.xsd`den ÜRETİLİR. 27 prod belgenin eleman sırası bu
 * tabloyla birebir örtüşür (ölçüldü) ve sekans bekçisi bu çıktıyı da tarar.
 *
 * ── e-SMM ŞEKLİNDEN ÜÇ SAPMA ───────────────────────────────────────────────
 *  1. `cbc:CreditNoteTypeCode` (`InvoiceTypeCode` değil) — kök tipin elemanı.
 *  2. `cac:Delivery` VARDIR — 27/27 prod belge taşır, içinde yalnız
 *     `cbc:ActualDeliveryDate`. e-SMM'de bu blok hiç yoktur (hizmet teslimi
 *     tarihlenmiyor).
 *  3. Kalemler `cac:CreditNoteLine` — `cbc:CreditedQuantity` + `cac:TaxTotal`
 *     `cac:AllowanceCharge`'dan ÖNCE.
 *
 * ── SEQ'te OLUP BURADA OLMAYANLAR ──────────────────────────────────────────
 * `CreditNoteType` GİB tarafından DARALTILMAMIŞTIR, bu yüzden tabloda emit
 * etmediğimiz onlarca slot var (`PayeeParty`, `DiscrepancyResponse`,
 * `StatementDocumentReference`, `PaymentMeans`, `BillingReference` …).
 * `emitInOrder` doldurulmayan slotu sessizce atlar.
 *
 * `cac:Signature` de BİLEREK emit edilmez: kütüphane İMZASIZ belge üretir,
 * imzayı entegratör/imzalayıcı ekler. `CreditNoteType`ta `Signature` 0..n
 * olduğu için imzasız e-MM XSD'den TEMİZ geçer (ölçüldü) — faturanın aksine.
 */

import type { ProducerReceiptInput } from './input';
import { CREDIT_NOTE_NAMESPACES, UBL_CONSTANTS } from '../../ubl/namespaces';
import {
  cbcOptionalTag,
  cbcRequiredTag,
  joinLines,
  xmlDeclaration,
  rootOpenTag,
  ublExtensionsSkeleton,
} from '../../ubl/primitives/xml-helpers';
import {
  serializeAccountingSupplierParty,
  serializeAccountingCustomerParty,
} from '../../ubl/components/party';
import { serializeTaxTotal } from '../../ubl/components/tax-total';
import { serializeAdditionalDocument } from '../../ubl/components/document-reference';
import { serializeCreditNoteLine } from '../../ubl/components/line';
import { serializeDelivery } from '../../ubl/components/delivery';
import { serializeLegalMonetaryTotal, serializeExchangeRate } from '../../ubl/components/monetary';
import { normalizeTime } from '../../utils/formatters';
import { CREDIT_NOTE_SEQ, emitInOrder } from '../../ubl/sequences/xsd-sequence';

/**
 * `ProducerReceiptInput` → tam UBL XML dizgisi.
 *
 * @param includeUblExtensions Boş `ext:UBLExtensions` iskeleti emit edilsin mi.
 *
 *   🔴 VARSAYILAN `false` VE BU SEFER ANLAMLI. CANLI ÖLÇÜLDÜ (2026-09-17):
 *   iskelet emit edilirse XSD "ExtensionContent elementinin içeriği eksik" der
 *   — imzalayıcı doldurana kadar belge şema-GEÇERSİZDİR. İskelet HİÇ emit
 *   edilmezse e-MM belgesi XSD'den de şematrondan da TERTEMİZ geçer
 *   (`CreditNoteType`ta `ext:UBLExtensions` 0..1'dir). İmzayı kendi atan
 *   tüketici `true` verir ve o tek hatayı bilerek üstlenir.
 */
export function serializeProducerReceipt(
  input: ProducerReceiptInput,
  prettyPrint: boolean = true,
  includeUblExtensions: boolean = false,
): string {
  const ind = prettyPrint ? '  ' : '';
  const cc = input.currencyCode;

  const body = emitInOrder(CREDIT_NOTE_SEQ, {
    UBLExtensions: () => (includeUblExtensions ? ublExtensionsSkeleton(ind) : ''),

    UBLVersionID: () => `${ind}${cbcOptionalTag('UBLVersionID', UBL_CONSTANTS.ublVersionId)}`,

    /* `TR1.2` — ORTAK sabitten gelir, e-MM için ayrıca seçilmedi.
     * ÖLÇÜM (2026-09-17, canlı şematron): kural METNİ "cbc:CustomizationID
     * elemanı değeri 'TR1.2' veya 'TR1.2.1' olmalıdır" diyor — İKİSİ DE
     * geçerli, ikisi de aynı yeşili veriyor. 27/27 prod belge `TR1.2` taşıdığı
     * için sapma sebebi YOK; `TR1.2.1`e geçiş bir gün gerekirse tek satırlıktır
     * ve `UBL_CONSTANTS`ta yapılır (üç belge türü birlikte taşınır). */
    CustomizationID: () => `${ind}${cbcOptionalTag('CustomizationID', UBL_CONSTANTS.customizationId)}`,

    ProfileID: () => `${ind}${cbcOptionalTag('ProfileID', input.profileId)}`,
    ID: () => `${ind}${cbcOptionalTag('ID', input.id)}`,
    CopyIndicator: () => `${ind}${cbcOptionalTag('CopyIndicator', UBL_CONSTANTS.copyIndicator)}`,
    UUID: () => `${ind}${cbcOptionalTag('UUID', input.uuid)}`,
    IssueDate: () => `${ind}${cbcRequiredTag('IssueDate', input.issueDate, 'ProducerReceipt')}`,

    /* Saat 27/27 prod belgede var. `HH:mm` gelirse saniye tamamlanır (`xs:time`). */
    IssueTime: () =>
      `${ind}${cbcRequiredTag('IssueTime', normalizeTime(input.issueTime), 'ProducerReceipt')}`,

    CreditNoteTypeCode: () => `${ind}${cbcOptionalTag('CreditNoteTypeCode', input.receiptTypeCode)}`,

    /* Not: faturadaki KOŞULSUZ "yazıyla tutar" notu burada YOKTUR — o davranış
     * fatura sözleşmesine aittir. Prod e-MM'lerde serbest metinli bir not var
     * ama içeriği üreticiye göre değişiyor; kütüphane teamül UYDURMAZ. */
    Note: () => joinLines((input.notes ?? []).map(note => `${ind}${cbcOptionalTag('Note', note)}`)),

    DocumentCurrencyCode: () => `${ind}${cbcOptionalTag('DocumentCurrencyCode', cc)}`,

    LineCountNumeric: () => `${ind}${cbcOptionalTag('LineCountNumeric', String(input.lines.length))}`,

    // IssueDate yedeği: `DocumentReferenceType/cbc:IssueDate` XSD'de 1..1'dir.
    AdditionalDocumentReference: () =>
      joinLines(
        (input.additionalDocuments ?? []).map(doc =>
          serializeAdditionalDocument(doc, ind, input.issueDate),
        ),
      ),

    /* 🔴 ROL TERSLEMESİ TEK SATIRDA ÇÖZÜLÜR — bir daha akıl yürütülmez:
     * belgeyi DÜZENLEYEN (tüccar) `Supplier`, MÜSTAHSİL `Customer` tarafındadır.
     * Gerekçe ve prod ölçümü `input.ts` başlığındadır. */
    AccountingSupplierParty: () => serializeAccountingSupplierParty(input.issuer, ind),
    AccountingCustomerParty: () => serializeAccountingCustomerParty(input.producer, ind),

    /* 27/27 prod belge yalnız `cbc:ActualDeliveryDate` taşır — ortak
     * `serializeDelivery` doldurulmayan slotu zaten atlar, daraltılmış ikinci
     * bir teslim üreticisi YAZILMADI. */
    Delivery: () =>
      input.actualDeliveryDate
        ? serializeDelivery({ actualDeliveryDate: input.actualDeliveryDate }, ind)
        : '',

    /* Dövizli e-MM: `CurrencyCodeCheck` TRY dışı belgede
     * `cac:PricingExchangeRate/cbc:CalculationRate`i ZORUNLU kılar (CANLI
     * ÖLÇÜLDÜ: assert `CreditNote` kökünde de patlıyor). */
    PricingExchangeRate: () =>
      input.exchangeRate ? serializeExchangeRate(input.exchangeRate, ind) : '',

    TaxTotal: () => serializeTaxTotal(input.taxTotal, cc, ind),

    LegalMonetaryTotal: () => serializeLegalMonetaryTotal(input.legalMonetaryTotal, cc, ind),

    CreditNoteLine: () =>
      joinLines(
        input.lines.map(line =>
          serializeCreditNoteLine(
            {
              id: line.id,
              notes: line.notes,
              creditedQuantity: line.creditedQuantity,
              unitCode: line.unitCode,
              lineExtensionAmount: line.lineExtensionAmount,
              taxTotal: line.taxTotal,
              item: line.item,
              price: line.price,
              allowanceCharges: line.allowanceCharges,
            },
            cc,
            ind,
          ),
        ),
      ),
  });

  return joinLines([
    xmlDeclaration(),
    rootOpenTag('CreditNote', CREDIT_NOTE_NAMESPACES),
    ...body,
    '</CreditNote>',
  ]);
}
