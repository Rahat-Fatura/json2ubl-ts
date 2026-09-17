/**
 * e-SMM XML ŞEKLİ — `Invoice` kökü, `INVOICE_SEQ` sırası.
 *
 * ── 🔑 GÖVDE YAZILMAZ, BİLEŞENLERDEN KURULUR ───────────────────────────────
 * Bu dosyada tek bir `<cac:…>` gövdesi ELLE üretilmez. Taraf, kalem, vergi,
 * parasal toplam, ek belge ve kur bloklarının tamamı `ubl/components/*`
 * bileşenlerinden gelir. Bu deponun en pahalı dersi burada uygulanıyor: elle
 * yazılmış ikinci bir `CarrierParty` üreticisi canlı GİB kapısında **dört ayrı
 * kusur** üretmişti (taşıyıcı/birim/dorse/sıra) — hepsi faturadan SAPMAYDI.
 *
 * Sıra da elle kurulmaz: `emitInOrder(INVOICE_SEQ, …)`. e-SMM `Invoice` köklü
 * olduğu için GİB'in `UBL-Invoice-2.1.xsd` sekansı AYNEN geçerlidir ve sekans
 * bekçisi (`__tests__/serializers/sequence-order-guard.test.ts`) bu çıktıyı da
 * tarar. 12 prod belgenin eleman sırası bu tabloyla birebir örtüşür.
 *
 * ── SEQ'te OLUP BURADA OLMAYANLAR ──────────────────────────────────────────
 * `WithholdingTaxTotal` slotu BİLEREK doldurulmaz — girdi tipinde karşılığı
 * yoktur (bkz. `input.ts`, tip güvencesi). `Signature`, `Delivery`,
 * `PaymentMeans`, `BillingReference` ve iade/sipariş referansları da e-SMM
 * sözleşmesinin dışındadır; `emitInOrder` doldurulmayan slotu sessizce atlar.
 */

import type { SelfEmployedVoucherInput } from './input';
import { INVOICE_NAMESPACES, UBL_CONSTANTS } from '../../ubl/namespaces';
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
import { serializeInvoiceLine } from '../../ubl/components/line';
import { serializeLegalMonetaryTotal, serializeExchangeRate } from '../../ubl/components/monetary';
import { normalizeTime } from '../../utils/formatters';
import { INVOICE_SEQ, emitInOrder } from '../../ubl/sequences/xsd-sequence';

/**
 * `SelfEmployedVoucherInput` → tam UBL XML dizgisi.
 *
 * @param includeUblExtensions Boş `ext:UBLExtensions` iskeleti emit edilsin mi.
 *   `UBL-Invoice-2.1.xsd` kök sekansı `ext:UBLExtensions` ile başlar; imzayı
 *   kendi atan tüketici için gereklidir. Varsayılan `false` (fatura ile aynı).
 */
export function serializeSelfEmployedVoucher(
  input: SelfEmployedVoucherInput,
  prettyPrint: boolean = true,
  includeUblExtensions: boolean = false,
): string {
  const ind = prettyPrint ? '  ' : '';
  const cc = input.currencyCode;

  const body = emitInOrder(INVOICE_SEQ, {
    UBLExtensions: () => (includeUblExtensions ? ublExtensionsSkeleton(ind) : ''),

    UBLVersionID: () => `${ind}${cbcOptionalTag('UBLVersionID', UBL_CONSTANTS.ublVersionId)}`,
    CustomizationID: () => `${ind}${cbcOptionalTag('CustomizationID', UBL_CONSTANTS.customizationId)}`,
    ProfileID: () => `${ind}${cbcOptionalTag('ProfileID', input.profileId)}`,
    ID: () => `${ind}${cbcOptionalTag('ID', input.id)}`,
    CopyIndicator: () => `${ind}${cbcOptionalTag('CopyIndicator', UBL_CONSTANTS.copyIndicator)}`,
    UUID: () => `${ind}${cbcOptionalTag('UUID', input.uuid)}`,
    IssueDate: () => `${ind}${cbcRequiredTag('IssueDate', input.issueDate, 'SelfEmployedVoucher')}`,

    /* 🔴 `cbc:IssueTime` e-SMM'de ZORUNLU (faturada opsiyoneldir): 509 sıra no.lu
     * VUK Genel Tebliği IV.4.3-c belge üzerinde saat-dakika ister ve 12/12 prod
     * belge taşır. `HH:mm` gelirse saniye tamamlanır (`xs:time`). */
    IssueTime: () =>
      `${ind}${cbcRequiredTag('IssueTime', normalizeTime(input.issueTime), 'SelfEmployedVoucher')}`,

    InvoiceTypeCode: () => `${ind}${cbcOptionalTag('InvoiceTypeCode', input.voucherTypeCode)}`,

    /* Not: faturadaki KOŞULSUZ "yazıyla tutar" notu burada YOKTUR. O davranış
     * fatura sözleşmesine aittir (`serializeInvoice`); e-SMM prod belgelerinde
     * böyle bir not bulunmuyor ve kütüphane olmayan bir teamülü uydurmaz. */
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

    AccountingSupplierParty: () => serializeAccountingSupplierParty(input.supplier, ind),
    AccountingCustomerParty: () => serializeAccountingCustomerParty(input.customer, ind),

    /* Dövizli e-SMM: `CurrencyCodeCheck` TRY dışı belgede
     * `cac:PricingExchangeRate/cbc:CalculationRate`i ZORUNLU kılar (6 ondalık). */
    PricingExchangeRate: () =>
      input.exchangeRate ? serializeExchangeRate(input.exchangeRate, ind) : '',

    TaxTotal: () => serializeTaxTotal(input.taxTotal, cc, ind),

    // WithholdingTaxTotal — e-SMM'de YAPISAL OLARAK YOK (bkz. dosya başlığı).

    LegalMonetaryTotal: () => serializeLegalMonetaryTotal(input.legalMonetaryTotal, cc, ind),

    InvoiceLine: () =>
      joinLines(
        input.lines.map(line =>
          serializeInvoiceLine(
            {
              id: line.id,
              notes: line.notes,
              invoicedQuantity: line.invoicedQuantity,
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
    rootOpenTag('Invoice', INVOICE_NAMESPACES),
    ...body,
    '</Invoice>',
  ]);
}
