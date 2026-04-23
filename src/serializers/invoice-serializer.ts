import type { InvoiceInput } from "../types/invoice-input";
import { INVOICE_NAMESPACES, UBL_CONSTANTS } from "../config/namespaces";
import {
    cbcOptionalTag,
    joinLines,
    xmlDeclaration,
    invoiceOpenTag,
} from "../utils/xml-helpers";
import {
    serializeAccountingSupplierParty,
    serializeAccountingCustomerParty,
    serializeBuyerCustomerParty,
    serializeTaxRepresentativeParty,
} from "./party-serializer";
import {
    serializeTaxTotal,
    serializeWithholdingTaxTotal,
} from "./tax-serializer";
import {
    serializeBillingReference,
    serializeOrderReference,
    serializeContractReference,
    serializeDocumentReference,
    serializeAdditionalDocument,
} from "./reference-serializer";
import { serializeDelivery } from "./delivery-serializer";
import { serializeInvoiceLine } from "./line-serializer";
import {
    serializeLegalMonetaryTotal,
    serializeExchangeRate,
    serializePaymentMeans,
} from "./monetary-serializer";
import { serializeAllowanceCharge, serializePeriod } from "./common-serializer";

/**
 * Invoice JSON → tam UBL-TR XML string (§1.10 sırasında)
 */
export function serializeInvoice(
    input: InvoiceInput,
    prettyPrint: boolean = true,
): string {
    const ind = prettyPrint ? "  " : "";
    const cc = input.currencyCode;
    const parts: string[] = [];

    // XML Declaration
    parts.push(xmlDeclaration());

    // Invoice açılış tag'i
    parts.push(invoiceOpenTag(INVOICE_NAMESPACES));

    // UBLVersionID, CustomizationID
    parts.push(`${ind}${cbcOptionalTag("UBLVersionID", UBL_CONSTANTS.ublVersionId)}`);
    parts.push(
        `${ind}${cbcOptionalTag("CustomizationID", UBL_CONSTANTS.customizationId)}`,
    );

    // 4. ProfileID
    parts.push(`${ind}${cbcOptionalTag("ProfileID", input.profileId)}`);

    // 5. ID
    parts.push(`${ind}${cbcOptionalTag("ID", input.id)}`);

    // 6. CopyIndicator
    parts.push(`${ind}${cbcOptionalTag("CopyIndicator", UBL_CONSTANTS.copyIndicator)}`);

    // 7. UUID
    parts.push(`${ind}${cbcOptionalTag("UUID", input.uuid)}`);

    // 8. IssueDate
    parts.push(`${ind}${cbcOptionalTag("IssueDate", input.issueDate)}`);

    // 9. IssueTime (opsiyonel)
    if (input.issueTime) {
        parts.push(`${ind}${cbcOptionalTag("IssueTime", input.issueTime)}`);
    }

    // 10. InvoiceTypeCode
    parts.push(`${ind}${cbcOptionalTag("InvoiceTypeCode", input.invoiceTypeCode)}`);

    // 11. Note (opsiyonel, çoklu)
    if (input.notes) {
        for (const note of input.notes) {
            parts.push(`${ind}${cbcOptionalTag("Note", note)}`);
        }
    }

    // 12. DocumentCurrencyCode
    parts.push(`${ind}${cbcOptionalTag("DocumentCurrencyCode", cc)}`);

    // 13. TaxCurrencyCode (opsiyonel)
    if (input.taxCurrencyCode) {
        parts.push(`${ind}${cbcOptionalTag("TaxCurrencyCode", input.taxCurrencyCode)}`);
    }

    // 14. PricingCurrencyCode (opsiyonel)
    if (input.pricingCurrencyCode) {
        parts.push(
            `${ind}${cbcOptionalTag("PricingCurrencyCode", input.pricingCurrencyCode)}`,
        );
    }

    // 15. PaymentCurrencyCode — B-74 (XSD:23, cbc:PaymentCurrencyCode)
    if (input.paymentCurrencyCode) {
        parts.push(
            `${ind}${cbcOptionalTag("PaymentCurrencyCode", input.paymentCurrencyCode)}`,
        );
    }

    // 18. AccountingCost (opsiyonel — SGK faturaları için)
    if (input.accountingCost) {
        parts.push(`${ind}${cbcOptionalTag("AccountingCost", input.accountingCost)}`);
    }

    // 19. LineCountNumeric
    parts.push(
        `${ind}${cbcOptionalTag("LineCountNumeric", String(input.lines.length))}`,
    );

    // 20. InvoicePeriod (opsiyonel)
    if (input.invoicePeriod) {
        parts.push(serializePeriod(input.invoicePeriod, ind));
    }

    // 21. OrderReference (opsiyonel)
    if (input.orderReference) {
        parts.push(serializeOrderReference(input.orderReference, ind));
    }

    // 22. BillingReference (opsiyonel — IADE grubu için zorunlu)
    if (input.billingReferences) {
        for (const br of input.billingReferences) {
            parts.push(serializeBillingReference(br, ind));
        }
    }

    // 23. DespatchDocumentReference (opsiyonel)
    if (input.despatchReferences) {
        for (const ref of input.despatchReferences) {
            parts.push(
                serializeDocumentReference(
                    ref,
                    "DespatchDocumentReference",
                    ind,
                ),
            );
        }
    }

    // 24. ReceiptDocumentReference (opsiyonel)
    if (input.receiptReferences) {
        for (const ref of input.receiptReferences) {
            parts.push(
                serializeDocumentReference(
                    ref,
                    "ReceiptDocumentReference",
                    ind,
                ),
            );
        }
    }

    // 25. OriginatorDocumentReference — B-39 (XSD:32, cac:OriginatorDocumentReference 0..n)
    if (input.originatorDocumentReferences) {
        for (const ref of input.originatorDocumentReferences) {
            parts.push(
                serializeDocumentReference(
                    ref,
                    "OriginatorDocumentReference",
                    ind,
                ),
            );
        }
    }

    // 26. ContractDocumentReference (opsiyonel — YATIRIMTESVIK için zorunlu)
    if (input.contractReference) {
        parts.push(serializeContractReference(input.contractReference, ind));
    }

    // 27. AdditionalDocumentReference (opsiyonel)
    if (input.additionalDocuments) {
        for (const doc of input.additionalDocuments) {
            parts.push(serializeAdditionalDocument(doc, ind));
        }
    }

    // 29. Signature — business logic tarafından eklenir, serializer üretmez

    // 30. AccountingSupplierParty
    parts.push(serializeAccountingSupplierParty(input.supplier, ind));

    // 31. AccountingCustomerParty
    parts.push(serializeAccountingCustomerParty(input.customer, ind));

    // 33. BuyerCustomerParty (opsiyonel — IHRACAT/YOLCU)
    if (input.buyerCustomer) {
        parts.push(serializeBuyerCustomerParty(input.buyerCustomer, ind));
    }

    // 35. TaxRepresentativeParty (opsiyonel — YOLCU)
    if (input.taxRepresentativeParty) {
        parts.push(
            serializeTaxRepresentativeParty(input.taxRepresentativeParty, ind),
        );
    }

    // 36. Delivery (opsiyonel — IHRACAT)
    if (input.delivery) {
        parts.push(serializeDelivery(input.delivery, ind));
    }

    // 38. PaymentMeans (opsiyonel — KAMU)
    if (input.paymentMeans) {
        for (const pm of input.paymentMeans) {
            parts.push(serializePaymentMeans(pm, ind));
        }
    }

    // 39. PaymentTerms (opsiyonel)
    if (input.paymentTerms) {
        parts.push(`${ind}<cac:PaymentTerms>`);
        if (input.paymentTerms.note) {
            parts.push(`${ind}  ${cbcOptionalTag("Note", input.paymentTerms.note)}`);
        }
        if (input.paymentTerms.penaltySurchargePercent !== undefined) {
            parts.push(
                `${ind}  ${cbcOptionalTag("PenaltySurchargePercent", String(input.paymentTerms.penaltySurchargePercent))}`,
            );
        }
        if (input.paymentTerms.amount !== undefined) {
            parts.push(
                `${ind}  ${cbcOptionalTag("Amount", String(input.paymentTerms.amount))}`,
            );
        }
        parts.push(`${ind}</cac:PaymentTerms>`);
    }

    // 41. AllowanceCharge (opsiyonel) — B-11 fix: ExchangeRate ÖNCESİNE taşındı
    if (input.allowanceCharges) {
        for (const ac of input.allowanceCharges) {
            parts.push(serializeAllowanceCharge(ac, cc, ind));
        }
    }

    // 42-45. ExchangeRate (dövizli faturalarda) — B-11 fix: AllowanceCharge SONRASI
    // UBL-Invoice-2.1.xsd:45-48 (TaxExchangeRate/PricingExchangeRate/...)
    // B-71: TaxExchangeRate (XSD:45) — PricingExchangeRate'ten önce emit
    if (input.taxExchangeRate) {
        parts.push(serializeExchangeRate(input.taxExchangeRate, ind, 'TaxExchangeRate'));
    }
    if (input.exchangeRate) {
        parts.push(serializeExchangeRate(input.exchangeRate, ind));
    }

    // 46. TaxTotal (zorunlu)
    for (const tt of input.taxTotals) {
        parts.push(serializeTaxTotal(tt, cc, ind));
    }

    // 47. WithholdingTaxTotal (opsiyonel — TEVKIFAT/SGK/SARJ)
    if (input.withholdingTaxTotals) {
        for (const wtt of input.withholdingTaxTotals) {
            parts.push(serializeWithholdingTaxTotal(wtt, cc, ind));
        }
    }

    // 48. LegalMonetaryTotal (zorunlu)
    parts.push(serializeLegalMonetaryTotal(input.legalMonetaryTotal, cc, ind));

    // 49. InvoiceLine (zorunlu, çoklu)
    for (const line of input.lines) {
        parts.push(serializeInvoiceLine(line, cc, ind));
    }

    // Kapanış
    parts.push("</Invoice>");

    return joinLines(parts);
}

/** İndent yardımcı fonksiyon */
// function indent(xml: string, indentStr: string): string {
//     return xml
//         .split("\n")
//         .map((line) => indentStr + line)
//         .join("\n");
// }
