/**
 * SimpleInvoiceInput → InvoiceInput dönüşüm katmanı.
 *
 * Hesaplanmış değerleri alır ve mevcut InvoiceBuilder'ın beklediği
 * InvoiceInput formatına dönüştürür.
 */

import type { SimpleInvoiceInput, SimplePartyInput } from './simple-types';
import type { CalculatedDocument } from './document-calculator';
import type { CalculatedLine } from './line-calculator';
import { calculateDocument } from './document-calculator';
import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';
import { EXEMPTION_MAP } from './exemption-config';
import type { TaxIdType } from '../types/enums';
import type { InvoiceInput, InvoiceLineInput } from '../types/invoice-input';
import type {
  PartyInput,
  TaxTotalInput,
  TaxSubtotalInput,
  WithholdingTaxTotalInput,
  WithholdingTaxSubtotalInput,
  MonetaryTotalInput,
  AllowanceChargeInput,
  BillingReferenceInput,
  OrderReferenceInput,
  ContractReferenceInput,
  AdditionalDocumentInput,
  PaymentMeansInput,
  PeriodInput,
  ExchangeRateInput,
  BuyerCustomerInput,
  ItemInput,
  AdditionalItemIdInput,
} from '../types/common';

// ─── Ana Dönüşüm Fonksiyonu ────────────────────────────────────────────────────

/**
 * SimpleInvoiceInput'u hesaplar ve InvoiceInput'a dönüştürür.
 * Bu fonksiyon tek adımda tüm iş akışını yürütür:
 * 1. Hesaplama motoru çalıştırılır
 * 2. Sonuçlar InvoiceInput formatına map'lenir
 */
export function mapSimpleToInvoiceInput(simple: SimpleInvoiceInput): InvoiceInput {
  const calculated = calculateDocument(simple);
  return buildInvoiceInput(simple, calculated);
}

// ─── InvoiceInput Oluşturma ─────────────────────────────────────────────────────

function buildInvoiceInput(
  simple: SimpleInvoiceInput,
  calc: CalculatedDocument,
): InvoiceInput {
  const issueDate = simple.datetime
    ? simple.datetime.substring(0, 10)
    : new Date().toISOString().substring(0, 10);

  const issueTime = simple.datetime && simple.datetime.length > 10
    ? simple.datetime.substring(11, 19)
    : new Date().toISOString().substring(11, 19);

  const profileId = calc.profile as InvoiceProfileId;
  const invoiceTypeCode = calc.type as InvoiceTypeCode;

  const result: InvoiceInput = {
    // Zorunlu alanlar
    id: simple.id ?? '',
    uuid: calc.uuid,
    profileId,
    invoiceTypeCode,
    issueDate,
    currencyCode: calc.currencyCode,
    supplier: mapParty(simple.sender),
    customer: mapParty(simple.customer),
    taxTotals: buildTaxTotals(calc, simple),
    legalMonetaryTotal: buildMonetaryTotal(calc),
    lines: buildLines(simple, calc),

    // Opsiyonel alanlar
    issueTime,
    notes: simple.notes,
  };

  // Döviz kuru
  if (calc.exchangeRate) {
    result.exchangeRate = buildExchangeRate(calc);
  }

  // Tevkifat
  if (calc.withholding) {
    result.withholdingTaxTotals = buildWithholdingTaxTotals(calc);
  }

  // İndirim
  if (calc.allowance) {
    result.allowanceCharges = [{
      chargeIndicator: false,
      amount: calc.allowance.amount,
    }];
  }

  // Fatura referansı
  if (simple.billingReference) {
    result.billingReferences = [buildBillingReference(simple, calc)];
  }

  // Sipariş referansı
  if (simple.orderReference) {
    result.orderReference = buildOrderReference(simple);
  }

  // İrsaliye referansları
  if (simple.despatchReferences?.length) {
    result.despatchReferences = simple.despatchReferences.map(d => ({
      id: d.id,
      issueDate: d.issueDate,
    }));
  }

  // Ek doküman referansları (XSLT dahil)
  const additionalDocs = buildAdditionalDocuments(simple, calc);
  if (additionalDocs.length > 0) {
    result.additionalDocuments = additionalDocs;
  }

  // Ödeme bilgisi
  if (simple.paymentMeans) {
    result.paymentMeans = [buildPaymentMeans(simple)];
  }

  // BuyerCustomerParty (IHRACAT / KAMU / YOLCUBERABERFATURA)
  if (simple.buyerCustomer) {
    result.buyerCustomer = buildBuyerCustomer(simple, calc.profile);
  }

  // ContractDocumentReference (YATIRIMTESVIK — YTBNO)
  if (simple.ytbNo) {
    result.contractReference = buildContractReference(simple);
  }

  // Fatura dönemi
  if (simple.invoicePeriod) {
    result.invoicePeriod = buildPeriod(simple);
  }

  // SGK
  if (simple.sgk) {
    result.accountingCost = simple.sgk.type;

  }

  return result;
}

// ─── Party Dönüşümü ─────────────────────────────────────────────────────────────

function mapParty(party: SimplePartyInput): PartyInput {
  const taxIdType: TaxIdType = party.taxNumber.length === 11 ? 'TCKN' : 'VKN';
  const result: PartyInput = {
    vknTckn: party.taxNumber,
    taxIdType,
    streetName: party.address,
    citySubdivisionName: party.district,
    cityName: party.city,
    postalZone: party.zipCode ?? '00000',
    country: party.country ?? 'Türkiye',
    taxOffice: party.taxOffice,
    telephone: party.phone,
    email: party.email,
    websiteUri: party.website,
  };

  // VKN → name, TCKN → firstName/familyName
  if (taxIdType === 'VKN') {
    result.name = party.name;
  } else {
    const nameParts = party.name.trim().split(/\s+/);
    if (nameParts.length > 1) {
      result.firstName = nameParts.slice(0, nameParts.length - 1).join(' ');
      result.familyName = nameParts[nameParts.length - 1];
    } else {
      result.firstName = party.name;
      result.familyName = '.';
    }
  }

  // Ek tanımlayıcılar
  if (party.identifications?.length) {
    result.additionalIdentifiers = party.identifications.map(id => ({
      schemeId: id.schemeId,
      value: id.value,
    }));
  }

  return result;
}

// ─── Vergi Toplamları ───────────────────────────────────────────────────────────

function buildTaxTotals(
  calc: CalculatedDocument,
  simple: SimpleInvoiceInput,
): TaxTotalInput[] {
  const taxSubtotals: TaxSubtotalInput[] = calc.taxes.taxSubtotals.map(ts => {
    const subtotal: TaxSubtotalInput = {
      taxableAmount: ts.taxable,
      taxAmount: ts.amount,
      percent: ts.percent,
      taxTypeCode: ts.code,
      taxTypeName: ts.name,
    };

    // İstisna kodu ekle
    if (shouldAddExemption(ts, calc, simple)) {
      subtotal.taxExemptionReasonCode = calc.taxExemptionReason.kdv ?? undefined;
      subtotal.taxExemptionReason = calc.taxExemptionReason.kdvName ?? undefined;
    }

    return subtotal;
  });

  return [{
    taxAmount: calc.taxes.taxTotal,
    taxSubtotals,
  }];
}

/**
 * İstisna kodu eklenip eklenmeyeceğini belirler.
 * calculate-service/shared.builder.mixin.js → sharedTaxBuilder mantığı.
 */
function shouldAddExemption(
  ts: { code: string; amount: number },
  calc: CalculatedDocument,
  simple: SimpleInvoiceInput,
): boolean {
  const type = calc.type;
  // Schematron TaxExemptionReasonCheck: KDV amount=0 ise exemption gerekli
  // ANCAK IADE, YTBIADE, IHRACKAYITLI, OZELMATRAH, SGK, KONAKLAMAVERGISI tipleri hariç
  const exemptTypes = ['IADE', 'YTBIADE', 'IHRACKAYITLI', 'OZELMATRAH', 'SGK', 'KONAKLAMAVERGISI'];
  if (ts.code === '0015' && ts.amount === 0 && !exemptTypes.includes(type)) return true;
  if (type === 'IHRACKAYITLI') return true;
  if (type === 'OZELMATRAH' && simple.ozelMatrah) return true;
  return false;
}

// ─── Tevkifat ───────────────────────────────────────────────────────────────────

function buildWithholdingTaxTotals(calc: CalculatedDocument): WithholdingTaxTotalInput[] {
  if (!calc.withholding) return [];

  const subtotals: WithholdingTaxSubtotalInput[] = calc.withholding.taxSubtotals.map(ws => ({
    taxableAmount: ws.taxable,
    taxAmount: ws.amount,
    percent: ws.percent,
    taxTypeCode: ws.code,
    taxTypeName: ws.name,
  }));

  return [{
    taxAmount: calc.withholding.taxTotal,
    taxSubtotals: subtotals,
  }];
}

// ─── Monetary ───────────────────────────────────────────────────────────────────

function buildMonetaryTotal(calc: CalculatedDocument): MonetaryTotalInput {
  return {
    lineExtensionAmount: calc.monetary.lineExtensionAmount,
    taxExclusiveAmount: calc.monetary.taxExclusiveAmount,
    taxInclusiveAmount: calc.monetary.taxInclusiveAmount,
    allowanceTotalAmount: calc.monetary.allowanceTotalAmount,
    payableAmount: calc.monetary.payableAmount,
  };
}

// ─── Döviz Kuru ─────────────────────────────────────────────────────────────────

function buildExchangeRate(calc: CalculatedDocument): ExchangeRateInput {
  return {
    sourceCurrencyCode: calc.currencyCode,
    targetCurrencyCode: 'TRY',
    calculationRate: calc.exchangeRate!,
  };
}

// ─── Fatura Satırları ───────────────────────────────────────────────────────────

function buildLines(
  simple: SimpleInvoiceInput,
  calc: CalculatedDocument,
): InvoiceLineInput[] {
  return simple.lines.map((line, index) => {
    const cl = calc.calculatedLines[index];
    return buildSingleLine(line, cl, calc);
  });
}

function buildSingleLine(
  line: SimpleInvoiceInput['lines'][number],
  cl: CalculatedLine,
  calc: CalculatedDocument,
): InvoiceLineInput {
  // Satır vergi subtotalleri
  const taxSubtotals: TaxSubtotalInput[] = cl.taxes.taxSubtotals.map(ts => {
    const subtotal: TaxSubtotalInput = {
      taxableAmount: ts.taxable,
      taxAmount: ts.amount,
      percent: ts.percent,
      taxTypeCode: ts.code,
      taxTypeName: ts.name,
    };

    if (ts.amount === 0 && ts.code === '0015' && calc.taxExemptionReason.kdv) {
      subtotal.taxExemptionReasonCode = calc.taxExemptionReason.kdv;
      subtotal.taxExemptionReason = calc.taxExemptionReason.kdvName ?? undefined;
    }

    return subtotal;
  });

  const taxTotal: TaxTotalInput = {
    taxAmount: cl.taxes.taxTotal,
    taxSubtotals,
  };

  // Ürün bilgileri
  const item: ItemInput = {
    name: line.name,
    description: line.description,
    modelName: line.model,
  };

  // Ek ürün tanımlayıcıları (TEKNOLOJIDESTEK IMEI, IDIS ETIKETNO vb.)
  if (line.additionalItemIdentifications?.length) {
    item.additionalItemIdentifications = line.additionalItemIdentifications.map(
      (aid): AdditionalItemIdInput => ({
        schemeId: aid.schemeId,
        value: aid.value,
      }),
    );
  }

  // CommodityClassification (YATIRIMTESVIK — Harcama tipi)
  if (line.itemClassificationCode) {
    item.commodityClassification = {
      itemClassificationCode: line.itemClassificationCode,
    };
  }

  // ItemInstance (YATIRIMTESVIK — Kod 01 Makine bilgileri)
  if (line.productTraceId || line.serialId) {
    item.itemInstances = [{
      productTraceId: line.productTraceId,
      serialId: line.serialId,
    }];
  }

  const result: InvoiceLineInput = {
    id: String(cl.id),
    invoicedQuantity: line.quantity,
    unitCode: cl.unitCode,
    lineExtensionAmount: cl.lineExtensionAmount,
    taxTotal,
    item,
    price: { priceAmount: line.price },
  };

  // Satır iskontosu
  if (cl.allowanceObject.amount > 0) {
    const allowance: AllowanceChargeInput = {
      chargeIndicator: false,
      multiplierFactorNumeric: cl.allowanceObject.percent / 100,
      amount: cl.allowanceObject.amount,
      baseAmount: cl.allowanceObject.base,
    };
    result.allowanceCharges = [allowance];
  }

  // Satır seviyesi tevkifat
  if (cl.withholdingObject.taxSubtotals.length > 0) {
    result.withholdingTaxTotal = {
      taxAmount: cl.withholdingObject.taxTotal,
      taxSubtotals: cl.withholdingObject.taxSubtotals.map(ws => ({
        taxableAmount: ws.taxable,
        taxAmount: ws.amount,
        percent: ws.percent,
        taxTypeCode: ws.code,
        taxTypeName: ws.name,
      })),
    };
  }

  // Satır seviyesi teslimat (ihracat)
  if (line.delivery) {
    result.delivery = {
      deliveryAddress: {
        streetName: line.delivery.deliveryAddress.address,
        citySubdivisionName: line.delivery.deliveryAddress.district,
        cityName: line.delivery.deliveryAddress.city,
        postalZone: line.delivery.deliveryAddress.zipCode,
        country: line.delivery.deliveryAddress.country ?? 'Türkiye',
      },
      deliveryTerms: line.delivery.deliveryTermCode
        ? { id: line.delivery.deliveryTermCode }
        : undefined,
      shipment: line.delivery.gtipNo || line.delivery.transportModeCode
        ? {
          goodsItems: line.delivery.gtipNo
            ? [{ requiredCustomsId: line.delivery.gtipNo }]
            : undefined,
          shipmentStages: line.delivery.transportModeCode
            ? [{ transportModeCode: line.delivery.transportModeCode }]
            : undefined,
          transportHandlingUnits: line.delivery.packageTypeCode
            ? [{
              actualPackages: [{
                packagingTypeCode: line.delivery.packageTypeCode,
                quantity: line.delivery.packageQuantity,
              }],
            }]
            : undefined,
        }
        : undefined,
    };
  }

  return result;
}

// ─── Referanslar ────────────────────────────────────────────────────────────────

function buildBillingReference(simple: SimpleInvoiceInput, calc: CalculatedDocument): BillingReferenceInput {
  const isIadeGroup = ['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'].includes(calc.type);

  // Schematron IADEInvioceCheck: IADE grubu tiplerinde DocumentTypeCode='IADE' zorunlu
  // Diğer tiplerde kullanıcının seçtiği değer geçerli
  const documentTypeCode = isIadeGroup
    ? 'IADE'
    : simple.billingReference!.documentTypeCode;

  return {
    invoiceDocumentReference: {
      id: simple.billingReference!.id,
      issueDate: simple.billingReference!.issueDate,
      documentTypeCode,
    },
  };
}

function buildOrderReference(simple: SimpleInvoiceInput): OrderReferenceInput {
  return {
    id: simple.orderReference!.id,
    issueDate: simple.orderReference!.issueDate,
  };
}

// ─── Ek Dokümanlar ──────────────────────────────────────────────────────────────

function buildAdditionalDocuments(
  simple: SimpleInvoiceInput,
  calc: CalculatedDocument,
): AdditionalDocumentInput[] {
  const docs: AdditionalDocumentInput[] = [];

  // XSLT şablon
  if (simple.xsltTemplate) {
    docs.push({
      id: calc.uuid,
      issueDate: simple.datetime?.substring(0, 10),
      attachment: {
        embeddedBinaryObject: {
          content: simple.xsltTemplate,
          mimeCode: 'application/xslt+xml',
          encodingCode: 'Base64',
          characterSetCode: 'UTF-8',
          filename: `${calc.uuid}.xslt`,
        },
      },
    });
  }

  // e-Arşiv gönderim tipi
  if (simple.eArchiveInfo && simple.eArchiveInfo.sendType !== 'KAGIT') {
    docs.push({
      id: simple.eArchiveInfo.sendType,
      issueDate: simple.datetime?.substring(0, 10),
      documentTypeCode: 'EXT_SEND_METHOD',
    });
  }

  // Online satış referansları
  if (simple.onlineSale?.isOnlineSale) {
    const issueDate = simple.datetime?.substring(0, 10);
    docs.push(
      { id: '.', issueDate, documentTypeCode: 'EXT_IS_ONLINE_SALE' },
      { id: simple.onlineSale.storeUrl, issueDate, documentTypeCode: 'EXT_ONLINE_STORE_URL' },
      { id: simple.onlineSale.paymentMethod, issueDate, documentTypeCode: 'EXT_PAYMENT_METHOD' },
      { id: simple.onlineSale.paymentDate, issueDate, documentTypeCode: 'EXT_PAYMENT_DATE' },
    );
  }

  // SGK referansları
  if (simple.sgk) {
    const issueDate = simple.datetime?.substring(0, 10);
    docs.push(
      { id: '.', issueDate, documentTypeCode: 'DOSYA_NO', documentType: simple.sgk.documentNo, documentDescription: 'Döküm No' },
      { id: '.', issueDate, documentTypeCode: 'MUKELLEF_ADI', documentType: simple.sgk.companyName, documentDescription: `${EXEMPTION_MAP.get(simple.sgk.type)?.name ?? simple.sgk.type} Adı` },
      { id: '.', issueDate, documentTypeCode: 'MUKELLEF_KODU', documentType: simple.sgk.companyCode, documentDescription: `${EXEMPTION_MAP.get(simple.sgk.type)?.name ?? simple.sgk.type} Sicil Numarası` },
    );
  }

  // Kullanıcı ek dokümanları
  if (simple.additionalDocuments?.length) {
    for (const doc of simple.additionalDocuments) {
      const mapped: AdditionalDocumentInput = {
        id: doc.id,
        issueDate: doc.issueDate,
        documentTypeCode: doc.documentTypeCode,
        documentType: doc.documentType,
        documentDescription: doc.documentDescription,
      };
      if (doc.attachment) {
        mapped.attachment = {
          embeddedBinaryObject: {
            content: doc.attachment.data,
            mimeCode: doc.attachment.mimeCode,
            encodingCode: doc.attachment.encodingCode ?? 'Base64',
            characterSetCode: doc.attachment.characterSetCode ?? 'UTF-8',
            filename: doc.attachment.filename,
          },
        };
      }
      docs.push(mapped);
    }
  }

  return docs;
}

// ─── Ödeme ──────────────────────────────────────────────────────────────────────

function buildPaymentMeans(simple: SimpleInvoiceInput): PaymentMeansInput {
  const pm = simple.paymentMeans!;
  return {
    paymentMeansCode: pm.meansCode,
    paymentDueDate: pm.dueDate,
    paymentChannelCode: pm.channelCode,
    payeeFinancialAccount: pm.accountNumber
      ? {
        id: pm.accountNumber,
        paymentNote: pm.paymentNote,
      }
      : undefined,
  };
}

// ─── BuyerCustomerParty ─────────────────────────────────────────────────────────

function resolveBuyerPartyType(profile: string): 'EXPORT' | 'TAXFREE' | undefined {
  if (profile === 'IHRACAT') return 'EXPORT';
  if (profile === 'YOLCUBERABERFATURA') return 'TAXFREE';
  return undefined;
}

function buildBuyerCustomer(simple: SimpleInvoiceInput, profile: string): BuyerCustomerInput {
  const bc = simple.buyerCustomer!;
  const partyType = resolveBuyerPartyType(profile);
  const result: BuyerCustomerInput = {
    party: {
      vknTckn: bc.taxNumber,
      taxIdType: bc.taxNumber.length === 11 ? 'TCKN' : 'VKN',
      name: bc.name,
      streetName: bc.address,
      citySubdivisionName: bc.district,
      cityName: bc.city,
      postalZone: bc.zipCode,
      country: bc.country,
      telephone: bc.phone,
      email: bc.email,
      registrationName: bc.name,
    },
  };
  if (partyType) {
    result.partyType = partyType;
  }
  return result;
}

// ─── Sözleşme Referansı (YATIRIMTESVIK) ──────────────────────────────────────────

function buildContractReference(simple: SimpleInvoiceInput): ContractReferenceInput {
  return {
    id: simple.ytbNo!,
    schemeId: 'YTBNO',
    issueDate: simple.ytbIssueDate,
  };
}

// ─── Dönem ──────────────────────────────────────────────────────────────────────

function buildPeriod(simple: SimpleInvoiceInput): PeriodInput {
  return {
    startDate: simple.invoicePeriod!.startDate,
    endDate: simple.invoicePeriod!.endDate,
  };
}
