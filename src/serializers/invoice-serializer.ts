import type { InvoiceInput } from '../types/invoice-input';
import { INVOICE_NAMESPACES, UBL_CONSTANTS } from '../config/namespaces';
import { cbcTag, joinLines, xmlDeclaration, invoiceOpenTag, ublExtensionsPlaceholder } from '../utils/xml-helpers';
import {
  serializeAccountingSupplierParty, serializeAccountingCustomerParty,
  serializeBuyerCustomerParty, serializeTaxRepresentativeParty,
} from './party-serializer';
import { serializeTaxTotal, serializeWithholdingTaxTotal } from './tax-serializer';
import {
  serializeBillingReference, serializeOrderReference, serializeContractReference,
  serializeDocumentReference, serializeAdditionalDocument,
} from './reference-serializer';
import { serializeDelivery } from './delivery-serializer';
import { serializeInvoiceLine } from './line-serializer';
import { serializeLegalMonetaryTotal, serializeExchangeRate, serializePaymentMeans } from './monetary-serializer';
import { serializeAllowanceCharge, serializePeriod } from './common-serializer';

/**
 * Invoice JSON → tam UBL-TR XML string (§1.10 sırasında)
 */
export function serializeInvoice(input: InvoiceInput, prettyPrint: boolean = true): string {
  const ind = prettyPrint ? '  ' : '';
  const cc = input.currencyCode;
  const parts: string[] = [];

  // XML Declaration
  parts.push(xmlDeclaration());

  // Invoice açılış tag'i
  parts.push(invoiceOpenTag(INVOICE_NAMESPACES));

  // 1. UBLExtensions (boş placeholder)
  parts.push(indent(ublExtensionsPlaceholder(), ind));

  // 2-3. UBLVersionID, CustomizationID
  parts.push(`${ind}${cbcTag('UBLVersionID', UBL_CONSTANTS.ublVersionId)}`);
  parts.push(`${ind}${cbcTag('CustomizationID', UBL_CONSTANTS.customizationId)}`);

  // 4. ProfileID
  parts.push(`${ind}${cbcTag('ProfileID', input.profileId)}`);

  // 5. ID
  parts.push(`${ind}${cbcTag('ID', input.id)}`);

  // 6. CopyIndicator
  parts.push(`${ind}${cbcTag('CopyIndicator', UBL_CONSTANTS.copyIndicator)}`);

  // 7. UUID
  parts.push(`${ind}${cbcTag('UUID', input.uuid)}`);

  // 8. IssueDate
  parts.push(`${ind}${cbcTag('IssueDate', input.issueDate)}`);

  // 9. IssueTime (opsiyonel)
  if (input.issueTime) {
    parts.push(`${ind}${cbcTag('IssueTime', input.issueTime)}`);
  }

  // 10. InvoiceTypeCode
  parts.push(`${ind}${cbcTag('InvoiceTypeCode', input.invoiceTypeCode)}`);

  // 11. Note (opsiyonel, çoklu)
  if (input.notes) {
    for (const note of input.notes) {
      parts.push(`${ind}${cbcTag('Note', note)}`);
    }
  }

  // 12. DocumentCurrencyCode
  parts.push(`${ind}${cbcTag('DocumentCurrencyCode', cc)}`);

  // 13. TaxCurrencyCode (opsiyonel)
  if (input.taxCurrencyCode) {
    parts.push(`${ind}${cbcTag('TaxCurrencyCode', input.taxCurrencyCode)}`);
  }

  // 14. PricingCurrencyCode (opsiyonel)
  if (input.pricingCurrencyCode) {
    parts.push(`${ind}${cbcTag('PricingCurrencyCode', input.pricingCurrencyCode)}`);
  }

  // 15. AccountingCost (opsiyonel — SGK faturaları için)
  if (input.accountingCost) {
    parts.push(`${ind}${cbcTag('AccountingCost', input.accountingCost)}`);
  }

  // 16. LineCountNumeric
  parts.push(`${ind}${cbcTag('LineCountNumeric', String(input.lines.length))}`);

  // 17. InvoicePeriod (opsiyonel)
  if (input.invoicePeriod) {
    parts.push(serializePeriod(input.invoicePeriod, ind));
  }

  // 17. OrderReference (opsiyonel)
  if (input.orderReference) {
    parts.push(serializeOrderReference(input.orderReference, ind));
  }

  // 18. BillingReference (opsiyonel — IADE grubu için zorunlu)
  if (input.billingReferences) {
    for (const br of input.billingReferences) {
      parts.push(serializeBillingReference(br, ind));
    }
  }

  // 19. DespatchDocumentReference (opsiyonel)
  if (input.despatchReferences) {
    for (const ref of input.despatchReferences) {
      parts.push(serializeDocumentReference(ref, 'DespatchDocumentReference', ind));
    }
  }

  // 20. ReceiptDocumentReference (opsiyonel)
  if (input.receiptReferences) {
    for (const ref of input.receiptReferences) {
      parts.push(serializeDocumentReference(ref, 'ReceiptDocumentReference', ind));
    }
  }

  // 21. ContractDocumentReference (opsiyonel — YATIRIMTESVIK için zorunlu)
  if (input.contractReference) {
    parts.push(serializeContractReference(input.contractReference, ind));
  }

  // 22. AdditionalDocumentReference (opsiyonel)
  if (input.additionalDocuments) {
    for (const doc of input.additionalDocuments) {
      parts.push(serializeAdditionalDocument(doc, ind));
    }
  }

  // 23. Signature — business logic tarafından eklenir, serializer üretmez

  // 24. AccountingSupplierParty
  parts.push(serializeAccountingSupplierParty(input.supplier, ind));

  // 25. AccountingCustomerParty
  parts.push(serializeAccountingCustomerParty(input.customer, ind));

  // 26. BuyerCustomerParty (opsiyonel — IHRACAT/YOLCU)
  if (input.buyerCustomer) {
    parts.push(serializeBuyerCustomerParty(input.buyerCustomer, ind));
  }

  // 28. TaxRepresentativeParty (opsiyonel — YOLCU)
  if (input.taxRepresentativeParty) {
    parts.push(serializeTaxRepresentativeParty(input.taxRepresentativeParty, ind));
  }

  // 29. Delivery (opsiyonel — IHRACAT)
  if (input.delivery) {
    parts.push(serializeDelivery(input.delivery, ind));
  }

  // 30. PaymentMeans (opsiyonel — KAMU)
  if (input.paymentMeans) {
    for (const pm of input.paymentMeans) {
      parts.push(serializePaymentMeans(pm, ind));
    }
  }

  // 31. PaymentTerms (opsiyonel)
  if (input.paymentTerms) {
    parts.push(`${ind}<cac:PaymentTerms>`);
    if (input.paymentTerms.note) {
      parts.push(`${ind}  ${cbcTag('Note', input.paymentTerms.note)}`);
    }
    if (input.paymentTerms.penaltySurchargePercent !== undefined) {
      parts.push(`${ind}  ${cbcTag('PenaltySurchargePercent', String(input.paymentTerms.penaltySurchargePercent))}`);
    }
    if (input.paymentTerms.amount !== undefined) {
      parts.push(`${ind}  ${cbcTag('Amount', String(input.paymentTerms.amount))}`);
    }
    parts.push(`${ind}</cac:PaymentTerms>`);
  }

  // PricingExchangeRate (dövizli faturalarda)
  if (input.exchangeRate) {
    parts.push(serializeExchangeRate(input.exchangeRate, ind));
  }

  // 32. AllowanceCharge (opsiyonel)
  if (input.allowanceCharges) {
    for (const ac of input.allowanceCharges) {
      parts.push(serializeAllowanceCharge(ac, cc, ind));
    }
  }

  // 33. TaxTotal (zorunlu)
  for (const tt of input.taxTotals) {
    parts.push(serializeTaxTotal(tt, cc, ind));
  }

  // 34. WithholdingTaxTotal (opsiyonel — TEVKIFAT/SGK/SARJ)
  if (input.withholdingTaxTotals) {
    for (const wtt of input.withholdingTaxTotals) {
      parts.push(serializeWithholdingTaxTotal(wtt, cc, ind));
    }
  }

  // 35. LegalMonetaryTotal (zorunlu)
  parts.push(serializeLegalMonetaryTotal(input.legalMonetaryTotal, cc, ind));

  // 36. InvoiceLine (zorunlu, çoklu)
  for (const line of input.lines) {
    parts.push(serializeInvoiceLine(line, cc, ind));
  }

  // Kapanış
  parts.push('</Invoice>');

  return joinLines(parts);
}

/** İndent yardımcı fonksiyon */
function indent(xml: string, indentStr: string): string {
  return xml.split('\n').map(line => indentStr + line).join('\n');
}
