import type { InvoiceInput } from "../../types/invoice-input";
import { INVOICE_NAMESPACES, UBL_CONSTANTS } from "../../ubl/namespaces";
import {
    cbcOptionalTag,
    joinLines,
    xmlDeclaration,
    rootOpenTag,
    ublExtensionsSkeleton,
} from "../../ubl/primitives/xml-helpers";
import {
    serializeAccountingSupplierParty,
    serializeAccountingCustomerParty,
    serializeBuyerCustomerParty,
    serializeTaxRepresentativeParty,
} from "../../ubl/components/party";
import {
    serializeTaxTotal,
    serializeWithholdingTaxTotal,
} from "../../ubl/components/tax-total";
import {
    serializeBillingReference,
    serializeOrderReference,
    serializeContractReference,
    serializeDocumentReference,
    serializeAdditionalDocument,
} from "../../ubl/components/document-reference";
import { serializeDelivery } from "../../ubl/components/delivery";
import { serializeInvoiceLine } from "../../ubl/components/line";
import {
    serializeLegalMonetaryTotal,
    serializeExchangeRate,
    serializePaymentMeans,
} from "../../ubl/components/monetary";
import { serializeAllowanceCharge, serializePeriod } from "../../ubl/components/allowance-charge";
import {
    formatAmountInWordsNote,
    isAmountInWordsNote,
} from "../../utils/amount-in-words";
import { normalizeTime } from "../../utils/formatters";
import { INVOICE_SEQ, emitInOrder } from "../../ubl/sequences/xsd-sequence";

/**
 * Invoice JSON → tam UBL-TR XML string (§1.10 sırasında)
 *
 * 🔑 Eleman SIRASI `INVOICE_SEQ`ten gelir — elle `push` edilmez. Tablo, GİB'in
 * `maindoc/UBL-Invoice-2.1.xsd` `InvoiceType` sequence'ının aynısıdır; sıra
 * artık kod ile truth-source arasında GERÇEK bir bağdır. Yeni bir eleman
 * eklemek için önce tabloda slotu bulunmalıdır; tabloda olmayan bir alan
 * sessizce yazılamaz.
 *
 * @param includeUblExtensions 4.1.0 — boş `ext:UBLExtensions` iskeleti emit
 *   edilsin mi (varsayılan `false`, geriye uyumlu). Ayrıntı için
 *   `BuilderOptions.includeUblExtensions`.
 */
export function serializeInvoice(
    input: InvoiceInput,
    prettyPrint: boolean = true,
    includeUblExtensions: boolean = false,
): string {
    const ind = prettyPrint ? "  " : "";
    const cc = input.currencyCode;

    const body = emitInOrder(INVOICE_SEQ, {
        // UBLExtensions — INVOICE_SEQ'in İLK slotu. Opsiyonel bayrak (4.1.0):
        // imzayı kendi atan tüketiciler için boş iskelet; kapalıyken hiç yazılmaz.
        UBLExtensions: () => (includeUblExtensions ? ublExtensionsSkeleton(ind) : ""),

        UBLVersionID: () =>
            `${ind}${cbcOptionalTag("UBLVersionID", UBL_CONSTANTS.ublVersionId)}`,
        CustomizationID: () =>
            `${ind}${cbcOptionalTag("CustomizationID", UBL_CONSTANTS.customizationId)}`,
        ProfileID: () => `${ind}${cbcOptionalTag("ProfileID", input.profileId)}`,
        ID: () => `${ind}${cbcOptionalTag("ID", input.id)}`,
        CopyIndicator: () =>
            `${ind}${cbcOptionalTag("CopyIndicator", UBL_CONSTANTS.copyIndicator)}`,
        UUID: () => `${ind}${cbcOptionalTag("UUID", input.uuid)}`,
        IssueDate: () => `${ind}${cbcOptionalTag("IssueDate", input.issueDate)}`,

        // IssueTime (opsiyonel) — `HH:mm` gelirse saniye tamamlanır (XSD `xs:time`)
        IssueTime: () =>
            input.issueTime
                ? `${ind}${cbcOptionalTag("IssueTime", normalizeTime(input.issueTime))}`
                : "",

        InvoiceTypeCode: () =>
            `${ind}${cbcOptionalTag("InvoiceTypeCode", input.invoiceTypeCode)}`,

        /* Note (çoklu)
         *
         * v3.0.0 — KOŞULSUZ "yazıyla tutar" notu: PayableAmount'tan türetilen
         * `#YAZIYLA:...#` notu HER faturaya, notların İLKİ olarak eklenir.
         * Tüketicinin elle yazdığı yazıyla-notları atılır (çelişen iki not olmasın);
         * diğer notlar sırasını koruyarak arkadan gelir. */
        Note: () => {
            const notes: string[] = [];
            const amountInWordsNote = formatAmountInWordsNote(
                input.legalMonetaryTotal?.payableAmount,
                cc,
            );
            if (amountInWordsNote) {
                notes.push(`${ind}${cbcOptionalTag("Note", amountInWordsNote)}`);
            }
            for (const note of input.notes ?? []) {
                if (isAmountInWordsNote(note)) continue;
                notes.push(`${ind}${cbcOptionalTag("Note", note)}`);
            }
            return joinLines(notes);
        },

        DocumentCurrencyCode: () =>
            `${ind}${cbcOptionalTag("DocumentCurrencyCode", cc)}`,
        TaxCurrencyCode: () =>
            `${ind}${cbcOptionalTag("TaxCurrencyCode", input.taxCurrencyCode)}`,
        PricingCurrencyCode: () =>
            `${ind}${cbcOptionalTag("PricingCurrencyCode", input.pricingCurrencyCode)}`,
        // PaymentCurrencyCode — B-74 (XSD:23, cbc:PaymentCurrencyCode)
        PaymentCurrencyCode: () =>
            `${ind}${cbcOptionalTag("PaymentCurrencyCode", input.paymentCurrencyCode)}`,

        // AccountingCost (opsiyonel — SGK faturaları için)
        AccountingCost: () =>
            `${ind}${cbcOptionalTag("AccountingCost", input.accountingCost)}`,

        LineCountNumeric: () =>
            `${ind}${cbcOptionalTag("LineCountNumeric", String(input.lines.length))}`,

        // InvoicePeriod (opsiyonel)
        InvoicePeriod: () =>
            input.invoicePeriod ? serializePeriod(input.invoicePeriod, ind) : "",

        // OrderReference (opsiyonel)
        OrderReference: () =>
            input.orderReference ? serializeOrderReference(input.orderReference, ind) : "",

        // BillingReference (opsiyonel — IADE grubu için zorunlu)
        BillingReference: () =>
            joinLines(
                (input.billingReferences ?? []).map(br => serializeBillingReference(br, ind)),
            ),

        // DespatchDocumentReference (opsiyonel)
        DespatchDocumentReference: () =>
            joinLines(
                (input.despatchReferences ?? []).map(ref =>
                    serializeDocumentReference(ref, "DespatchDocumentReference", ind),
                ),
            ),

        // ReceiptDocumentReference (opsiyonel)
        ReceiptDocumentReference: () =>
            joinLines(
                (input.receiptReferences ?? []).map(ref =>
                    serializeDocumentReference(ref, "ReceiptDocumentReference", ind),
                ),
            ),

        // OriginatorDocumentReference — B-39 (XSD:32, cac:OriginatorDocumentReference 0..n)
        OriginatorDocumentReference: () =>
            joinLines(
                (input.originatorDocumentReferences ?? []).map(ref =>
                    serializeDocumentReference(ref, "OriginatorDocumentReference", ind),
                ),
            ),

        // ContractDocumentReference (opsiyonel — YATIRIMTESVIK için zorunlu)
        // Referans tarihi verilmediyse faturanın tarihine düşülür (XSD IssueDate 1..1).
        ContractDocumentReference: () =>
            input.contractReference
                ? serializeContractReference(input.contractReference, ind, input.issueDate)
                : "",

        // AdditionalDocumentReference (opsiyonel) — aynı IssueDate yedeği
        AdditionalDocumentReference: () =>
            joinLines(
                (input.additionalDocuments ?? []).map(doc =>
                    serializeAdditionalDocument(doc, ind, input.issueDate),
                ),
            ),

        // Signature — business logic tarafından eklenir, serializer üretmez

        AccountingSupplierParty: () =>
            serializeAccountingSupplierParty(input.supplier, ind),
        AccountingCustomerParty: () =>
            serializeAccountingCustomerParty(input.customer, ind),

        // BuyerCustomerParty (opsiyonel — IHRACAT/YOLCU)
        BuyerCustomerParty: () =>
            input.buyerCustomer ? serializeBuyerCustomerParty(input.buyerCustomer, ind) : "",

        // TaxRepresentativeParty (opsiyonel — YOLCU)
        TaxRepresentativeParty: () =>
            input.taxRepresentativeParty
                ? serializeTaxRepresentativeParty(input.taxRepresentativeParty, ind)
                : "",

        // Delivery (opsiyonel — IHRACAT)
        Delivery: () => (input.delivery ? serializeDelivery(input.delivery, ind) : ""),

        // PaymentMeans (opsiyonel — KAMU)
        PaymentMeans: () =>
            joinLines((input.paymentMeans ?? []).map(pm => serializePaymentMeans(pm, ind))),

        // PaymentTerms (opsiyonel)
        PaymentTerms: () => {
            const pt = input.paymentTerms;
            if (!pt) return "";
            const lines: string[] = [`${ind}<cac:PaymentTerms>`];
            if (pt.note) {
                lines.push(`${ind}  ${cbcOptionalTag("Note", pt.note)}`);
            }
            if (pt.penaltySurchargePercent !== undefined) {
                lines.push(
                    `${ind}  ${cbcOptionalTag("PenaltySurchargePercent", String(pt.penaltySurchargePercent))}`,
                );
            }
            if (pt.amount !== undefined) {
                lines.push(`${ind}  ${cbcOptionalTag("Amount", String(pt.amount))}`);
            }
            lines.push(`${ind}</cac:PaymentTerms>`);
            return joinLines(lines);
        },

        // AllowanceCharge (opsiyonel) — B-11 fix: ExchangeRate ÖNCESİNE taşındı
        AllowanceCharge: () =>
            joinLines(
                (input.allowanceCharges ?? []).map(ac => serializeAllowanceCharge(ac, cc, ind)),
            ),

        // ExchangeRate (dövizli faturalarda) — B-11 fix: AllowanceCharge SONRASI
        // B-71: TaxExchangeRate (XSD:45) — PricingExchangeRate'ten önce emit
        TaxExchangeRate: () =>
            input.taxExchangeRate
                ? serializeExchangeRate(input.taxExchangeRate, ind, "TaxExchangeRate")
                : "",
        PricingExchangeRate: () =>
            input.exchangeRate ? serializeExchangeRate(input.exchangeRate, ind) : "",

        // TaxTotal (zorunlu)
        TaxTotal: () => joinLines(input.taxTotals.map(tt => serializeTaxTotal(tt, cc, ind))),

        // WithholdingTaxTotal (opsiyonel — TEVKIFAT/SGK/SARJ)
        WithholdingTaxTotal: () =>
            joinLines(
                (input.withholdingTaxTotals ?? []).map(wtt =>
                    serializeWithholdingTaxTotal(wtt, cc, ind),
                ),
            ),

        // LegalMonetaryTotal (zorunlu)
        LegalMonetaryTotal: () =>
            serializeLegalMonetaryTotal(input.legalMonetaryTotal, cc, ind),

        // InvoiceLine (zorunlu, çoklu)
        InvoiceLine: () => joinLines(input.lines.map(line => serializeInvoiceLine(line, cc, ind))),
    });

    return joinLines([
        xmlDeclaration(),
        rootOpenTag("Invoice", INVOICE_NAMESPACES),
        ...body,
        "</Invoice>",
    ]);
}
