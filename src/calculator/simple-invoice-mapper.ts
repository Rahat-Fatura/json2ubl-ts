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
  TaxRepresentativeInput,
  ItemInput,
  AdditionalItemIdInput,
  DeliveryInput,
} from '../types/common';
import { isNonEmpty } from '../utils/formatters';
import { canBuildCarrierParty } from '../validators/online-sale-validator';

// ─── Ana Dönüşüm Fonksiyonu ────────────────────────────────────────────────────

/**
 * SimpleInvoiceInput'u hesaplar ve InvoiceInput'a dönüştürür.
 * Bu fonksiyon tek adımda tüm iş akışını yürütür:
 * 1. Hesaplama motoru çalıştırılır
 * 2. Sonuçlar InvoiceInput formatına map'lenir
 */
export function mapSimpleToInvoiceInput(
  simple: SimpleInvoiceInput,
  precomputed?: CalculatedDocument,
): InvoiceInput {
  // B-80: precomputed verilirse yeniden calculateDocument çağırma (UUID determinizmi + performans)
  const calculated = precomputed ?? calculateDocument(simple);
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

  // TaxRepresentativeParty (YOLCUBERABERFATURA aracı kurum — B-NEW-13 / Sprint 8c.4)
  if (simple.taxRepresentativeParty) {
    result.taxRepresentativeParty = buildTaxRepresentative(simple.taxRepresentativeParty);
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

  // B-101: Online satış gönderi bilgisi → cac:Delivery (ActualDeliveryDate + CarrierParty).
  // Önceki davranış: onlineSale.carrierName / carrierTaxNumber / deliveryDate tipte
  // tanımlıydı ama mapper'da hiç okunmuyordu → XML'e SESSİZCE düşmüyordu.
  const onlineSaleDelivery = buildOnlineSaleDelivery(simple);
  if (onlineSaleDelivery) {
    result.delivery = onlineSaleDelivery;
  }

  return result;
}

/**
 * Online satış kargo/teslim bilgisini `cac:Delivery`'ye eşler (B-101).
 *
 * Yerleşim kaynağı — GİB UBL-TR `DeliveryType` (ubltr-1.2.1 pakedi,
 * `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd`):
 *   `cbc:ActualDeliveryDate` ← deliveryDate
 *   `cac:CarrierParty`       ← carrierName + carrierTaxNumber + adres
 * Bu ikisi e-Arşiv raporundaki `internetSatisBilgi/gonderiBilgileri/gonderimTarihi`
 * ve `.../gonderiTasiyan` (kisiType) alanlarını besler.
 *
 * CarrierParty ancak ŞEMA-GEÇERLİ olabiliyorsa emit edilir: UBL-TR `PartyType`'ta
 * `cac:PartyIdentification` ve `cac:PostalAddress` zorunludur, adresin içinde de
 * CityName + CitySubdivisionName zorunludur (B-35). Eksik kombinasyon 'strict'
 * seviyede `validateOnlineSaleShipment` ile hata olarak raporlanır; 'basic'te
 * sessizce atlanır (geriye dönük uyum).
 */
function buildOnlineSaleDelivery(simple: SimpleInvoiceInput): DeliveryInput | undefined {
  const os = simple.onlineSale;
  if (!os) return undefined;

  const delivery: DeliveryInput = {};

  if (isNonEmpty(os.deliveryDate)) {
    delivery.actualDeliveryDate = os.deliveryDate;
  }

  if (canBuildCarrierParty(os)) {
    const taxNumber = os.carrierTaxNumber!.trim();
    const isTckn = taxNumber.length === 11;

    const carrierParty: PartyInput = {
      vknTckn: taxNumber,
      taxIdType: isTckn ? 'TCKN' : 'VKN',
      citySubdivisionName: os.carrierDistrict,
      cityName: os.carrierCity,
      country: os.carrierCountry ?? 'Türkiye',
    };

    if (isNonEmpty(os.carrierAddress)) {
      carrierParty.streetName = os.carrierAddress;
    }

    // Unvan her hâlükârda PartyName'e yazılır (ham değer kaybolmasın).
    if (isNonEmpty(os.carrierName)) {
      carrierParty.name = os.carrierName;

      // Gerçek kişi taşıyıcı (TCKN): rapor `gercekKisi/adiSoyadi` bekler; UBL tarafında
      // cac:Person/FirstName+FamilyName gerekir. Son kelime soyad kabul edilir.
      if (isTckn) {
        const parts = os.carrierName.trim().split(/\s+/);
        if (parts.length > 1) {
          carrierParty.familyName = parts[parts.length - 1];
          carrierParty.firstName = parts.slice(0, -1).join(' ');
        } else {
          carrierParty.firstName = parts[0];
        }
      }
    }

    delivery.carrierParty = carrierParty;
  }

  return delivery.actualDeliveryDate || delivery.carrierParty ? delivery : undefined;
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
    // 🔴 POSTA KODU UYDURULMAZ. Eskiden bilinmeyen posta kodu `'00000'` ile dolduruluyordu;
    // `00000` geçerli bir Türk posta kodu DEĞİLDİR, yani belgeye GERÇEK OLMAYAN bir veri
    // yazılıyordu. VUK 227/3 belgede yer alan bilgilerin gerçeği yansıtmasını arar.
    // `cbc:PostalZone` UBL'de seçimlidir (`AddressType`, minOccurs=0) ve serializer zaten
    // `cbcOptionalTag` kullanıyor — bilinmiyorsa ELEMAN HİÇ YAZILMAZ, sıfırlarla değil.
    postalZone: party.zipCode,
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

    // M12 phantom KDV: CalculationSequenceNumeric=-1 propagate edilir
    if (ts.calculationSequenceNumeric !== undefined) {
      subtotal.calculationSequenceNumeric = ts.calculationSequenceNumeric;
    }

    // İstisna kodu ekle — phantom subtotal'da (CalcSeqNum=-1) her zaman yazılır (§2.1.4)
    const isPhantomSub = ts.calculationSequenceNumeric === -1;
    if (shouldAddExemption(ts, calc, simple) || isPhantomSub) {
      subtotal.taxExemptionReasonCode = calc.taxExemptionReason.kdv ?? undefined;
      subtotal.taxExemptionReason = calc.taxExemptionReason.kdvName ?? undefined;
    }

    return subtotal;
  });

  // calc.taxes.taxTotal phantom satırların KDV'si hariç (document-calculator 8d.2
  // post-marking ile zaten doğru değeri tutar). Phantom kombinasyonda 0.
  return [{
    taxAmount: calc.taxes.taxTotal,
    taxSubtotals,
  }];
}

/**
 * İstisna kodu eklenip eklenmeyeceğini belirler.
 * calculate-service/shared.builder.mixin.js → sharedTaxBuilder mantığı.
 *
 * Sprint 8c.1 / B-NEW-11: TEVKIFAT + 351 özel case (B-81) kaldırıldı —
 * calculator artık 351 otomatik üretmediği için gereksizleşti.
 *
 * Sprint 8c.1 / 555: "KDV Oran Kontrolüne Tabi Olmayan Satışlar" kodu KDV>0
 * kalemde de XML'e yazılır (alıcının yetkisi dışı KDV oranında kesim senaryosu).
 */
function shouldAddExemption(
  ts: { code: string; amount: number },
  calc: CalculatedDocument,
  simple: SimpleInvoiceInput,
): boolean {
  if (ts.code !== '0015') return false;
  const type = calc.type;

  // IHRACKAYITLI: calculator default 701 her zaman yazılır
  if (type === 'IHRACKAYITLI') return true;
  // OZELMATRAH + ozelMatrah: kendi kodu (801-812) yazılır
  if (type === 'OZELMATRAH' && simple.ozelMatrah) return true;
  // 555 özel: kullanıcı explicit verdiyse KDV oranından bağımsız yazılır
  if (calc.taxExemptionReason.kdv === '555') return true;

  // Schematron TaxExemptionReasonCheck: KDV amount=0 ise exemption gerekli
  // ANCAK IADE, YTBIADE, IHRACKAYITLI, OZELMATRAH, SGK, KONAKLAMAVERGISI tipleri hariç
  const exemptTypes = ['IADE', 'YTBIADE', 'IHRACKAYITLI', 'OZELMATRAH', 'SGK', 'KONAKLAMAVERGISI'];
  if (ts.amount === 0 && !exemptTypes.includes(type)) return true;

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
  // Satır bazı istisna kodu belge seviyesine tercih edilir (B-NEW-11 / M11).
  const lineExemptionCode = line.kdvExemptionCode ?? calc.taxExemptionReason.kdv;
  const lineExemptionName = line.kdvExemptionCode
    ? EXEMPTION_MAP.get(line.kdvExemptionCode)?.name
    : calc.taxExemptionReason.kdvName ?? undefined;

  // Satır vergi subtotalleri
  const taxSubtotals: TaxSubtotalInput[] = cl.taxes.taxSubtotals.map(ts => {
    const subtotal: TaxSubtotalInput = {
      taxableAmount: ts.taxable,
      taxAmount: ts.amount,
      percent: ts.percent,
      taxTypeCode: ts.code,
      taxTypeName: ts.name,
    };

    // M12 phantom KDV: CalculationSequenceNumeric=-1 propagate edilir
    if (ts.calculationSequenceNumeric !== undefined) {
      subtotal.calculationSequenceNumeric = ts.calculationSequenceNumeric;
    }

    // İstisna kodu: klasik KDV=0 istisna satırı VEYA phantom KDV satırı (§2.1.4 stili)
    const isPhantomKdvSub = ts.code === '0015' && cl.phantomKdv;
    const isZeroKdvExemption = ts.amount === 0 && ts.code === '0015' && !!lineExemptionCode;
    if ((isPhantomKdvSub || isZeroKdvExemption) && lineExemptionCode) {
      subtotal.taxExemptionReasonCode = lineExemptionCode;
      subtotal.taxExemptionReason = lineExemptionName;
    }

    return subtotal;
  });

  // M12: phantom satırda dış TaxTotal/TaxAmount=0 (PDF §2.1.4 "Vazgeçilen KDV Tutarı").
  // Dip toplamlara girmediği için 0; iç TaxSubtotal phantom değerleri taşır.
  const taxTotal: TaxTotalInput = {
    taxAmount: cl.phantomKdv ? 0 : cl.taxes.taxTotal,
    taxSubtotals,
  };

  // Ürün bilgileri.
  //
  // B-102: brand / buyerCode / sellerCode / manufacturerCode / origin alanları
  // `SimpleLineInput`'ta v1'den beri tanımlıydı ama mapper bunları HİÇ okumuyordu —
  // B-101'deki kargo alanlarıyla aynı sınıf hata (tipte var, XML'de yok).
  // Yerleşim GİB UBL-TR 1.2.1 `ItemType`'tan doğrulandı:
  //   brand            → cbc:BrandName
  //   buyerCode        → cac:BuyersItemIdentification/cbc:ID
  //   sellerCode       → cac:SellersItemIdentification/cbc:ID
  //   manufacturerCode → cac:ManufacturersItemIdentification/cbc:ID
  //   origin           → cac:OriginCountry/cbc:Name  (CountryType'ta Name minOccurs=1)
  const item: ItemInput = {
    name: line.name,
    description: line.description,
    modelName: line.model,
  };

  if (isNonEmpty(line.brand)) item.brandName = line.brand;
  if (isNonEmpty(line.buyerCode)) item.buyersItemIdentification = line.buyerCode;
  if (isNonEmpty(line.sellerCode)) item.sellersItemIdentification = line.sellerCode;
  if (isNonEmpty(line.manufacturerCode)) item.manufacturersItemIdentification = line.manufacturerCode;
  if (isNonEmpty(line.origin)) item.originCountryName = line.origin;

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

  // B-102: satır notu → cbc:Note (InvoiceLineType'ta ID ile InvoicedQuantity ARASINDA).
  // `line.note` da tipte tanımlıydı ama mapper okumuyordu.
  if (isNonEmpty(line.note)) {
    result.notes = [line.note!];
  }

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

  // Satır seviyesi teslimat (ihracat, IHRACKAYITLI+702)
  if (line.delivery) {
    const del = line.delivery;
    // transportHandlingUnits: paket bilgisi ve/veya alicidibsatirkod
    // (B-07 IHRACKAYITLI+702 gümrük beyannamesi) için tek element oluştur.
    //
    // B-102 iki düzeltme:
    //  1. `packageId` tipte tanımlıydı ama mapper HİÇ okumuyordu →
    //     `cac:ActualPackage/cbc:ID` (GİB PackageType'ta ilk eleman).
    //  2. `packageQuantity` okunuyordu ama ActualPackage YALNIZ `packageTypeCode`
    //     verilmişse üretiliyordu; tek başına miktar (veya ID) verildiğinde
    //     KOŞULLU olarak düşüyordu. Artık üç alandan herhangi biri paketi doğurur.
    const hasPackage =
      isNonEmpty(del.packageId) || isNonEmpty(del.packageTypeCode) || del.packageQuantity !== undefined;
    const thuNeeded = hasPackage || del.alicidibsatirkod;
    const transportHandlingUnits = thuNeeded ? [{
      actualPackages: hasPackage
        ? [{
          id: del.packageId,
          packagingTypeCode: del.packageTypeCode,
          quantity: del.packageQuantity,
        }]
        : undefined,
      customsDeclarations: del.alicidibsatirkod
        ? [{
          issuerParty: {
            partyIdentifications: [{
              id: del.alicidibsatirkod,
              schemeID: 'ALICIDIBSATIRKOD',
            }],
          },
        }]
        : undefined,
    }] : undefined;

    const shipmentNeeded = del.gtipNo || del.transportModeCode || thuNeeded;

    result.delivery = {
      deliveryAddress: {
        streetName: del.deliveryAddress.address,
        citySubdivisionName: del.deliveryAddress.district,
        cityName: del.deliveryAddress.city,
        postalZone: del.deliveryAddress.zipCode,
        country: del.deliveryAddress.country ?? 'Türkiye',
      },
      deliveryTerms: del.deliveryTermCode
        ? { id: del.deliveryTermCode }
        : undefined,
      shipment: shipmentNeeded
        ? {
          goodsItems: del.gtipNo
            ? [{ requiredCustomsId: del.gtipNo }]
            : undefined,
          shipmentStages: del.transportModeCode
            ? [{ transportModeCode: del.transportModeCode }]
            : undefined,
          transportHandlingUnits,
        }
        : undefined,
    };
  }

  return result;
}

// ─── Referanslar ────────────────────────────────────────────────────────────────

function buildBillingReference(simple: SimpleInvoiceInput, calc: CalculatedDocument): BillingReferenceInput {
  const isIadeGroup = ['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'].includes(calc.type);

  // Schematron IADEInvioceCheck: IADE grubu tiplerinde DocumentTypeCode='IADE' zorunlu.
  //
  // Sprint 8g.2 (B-NEW-v2-05): Önceki davranış — kullanıcı yanlış kod verirse de
  // mapper zorla 'IADE' atıyordu (silent override). Berkay kararıyla değiştirildi:
  // - Kullanıcı değer verdiyse, MAPPER OLDUĞU GİBİ TAŞIR (validator B-31 yakalar).
  // - Kullanıcı vermediyse + IADE grubu, default 'IADE' (mevcut compat davranış).
  const userValue = simple.billingReference!.documentTypeCode;
  const documentTypeCode = userValue !== undefined
    ? userValue
    : (isIadeGroup ? 'IADE' : undefined);

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
  // B-83: identifications → party.additionalIdentifiers eşlemesi (KAMU + IHRACAT vb.)
  if (bc.identifications && bc.identifications.length > 0) {
    result.party.additionalIdentifiers = bc.identifications.map(id => ({
      schemeId: id.schemeId,
      value: id.value,
    }));
  }
  // B-NEW-13 (Sprint 8c.4): YOLCUBERABERFATURA — nationalityId + passportId
  if (bc.nationalityId) {
    result.party.nationalityId = bc.nationalityId;
  }
  if (bc.passportId) {
    result.party.passportId = bc.passportId;
  }
  if (partyType) {
    result.partyType = partyType;
  }
  return result;
}

// ─── TaxRepresentativeParty (YOLCUBERABERFATURA) ────────────────────────────────

function buildTaxRepresentative(
  trp: NonNullable<SimpleInvoiceInput['taxRepresentativeParty']>,
): TaxRepresentativeInput {
  return {
    intermediaryVknTckn: trp.vknTckn,
    intermediaryLabel: trp.label,
    name: trp.name,
  };
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
