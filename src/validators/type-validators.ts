import type { ValidationError } from '../errors/ubl-build-error';
import type { InvoiceInput } from '../types/invoice-input';
import { InvoiceTypeCode } from '../types/enums';
import {
  IADE_GROUP_TYPES, TEVKIFAT_GROUP_TYPES, ISTISNA_GROUP_TYPES,
  KDV_ZERO_EXEMPTION_EXCLUDED_TYPES, WITHHOLDING_TAX_TYPE_CODES,
  WITHHOLDING_TAX_TYPE_WITH_PERCENT, WITHHOLDING_ALLOWED_TYPES,
  ISTISNA_TAX_EXEMPTION_REASON_CODES, OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES,
  IHRAC_EXEMPTION_REASON_CODES, TAX_4171_ALLOWED_TYPES,
} from '../config/constants';
import { WITHHOLDING_TAX_MAP } from '../calculator/withholding-config';
import { missingField, invalidValue, typeRequirement } from './validation-result';
import { isNonEmpty } from '../utils/formatters';

/**
 * §2 Tip-bazlı validasyon — InvoiceTypeCode'a göre ek kurallar
 */
export function validateByType(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const typeCode = input.invoiceTypeCode;

  // §2.1 İade grubu: BillingReference zorunlu
  if (IADE_GROUP_TYPES.has(typeCode)) {
    errors.push(...validateIadeGroup(input));
  }

  // §2.2 Tevkifat grubu: WithholdingTaxTotal
  if (TEVKIFAT_GROUP_TYPES.has(typeCode)) {
    errors.push(...validateTevkifatGroup(input));
  }

  // B-30: WithholdingTaxTotal ters yön — izinli tipler dışında kullanılamaz (CommonSchematron:289)
  if (input.withholdingTaxTotals && input.withholdingTaxTotals.length > 0) {
    if (!WITHHOLDING_ALLOWED_TYPES.has(typeCode)) {
      errors.push(invalidValue('withholdingTaxTotals',
        'WithholdingTaxTotal sadece TEVKIFAT/TEVKIFATIADE/YTBTEVKIFAT/YTBTEVKIFATIADE/IADE/YTBIADE/SGK/SARJ/SARJANLIK tiplerinde kullanılabilir',
        typeCode));
    }
  }

  // §2.3 İstisna grubu
  if (ISTISNA_GROUP_TYPES.has(typeCode)) {
    errors.push(...validateIstisnaGroup(input));
  }

  // §2.4 Özel Matrah
  if (typeCode === InvoiceTypeCode.OZELMATRAH) {
    errors.push(...validateOzelMatrah(input));
  }

  // §2.5 İhraç Kayıtlı
  if (typeCode === InvoiceTypeCode.IHRACKAYITLI) {
    errors.push(...validateIhracKayitli(input));
  }

  // §2.7 Teknoloji Destek
  if (typeCode === InvoiceTypeCode.TEKNOLOJIDESTEK) {
    errors.push(...validateTeknolojiDestek(input));
  }

  // §1.7 KDV 0 kuralı (tip-bazlı muafiyet kontrolü)
  if (!KDV_ZERO_EXEMPTION_EXCLUDED_TYPES.has(typeCode)) {
    errors.push(...validateKdvZeroExemption(input));
  }

  // TaxTypeCode 4171 kontrolü
  errors.push(...validateTax4171(input));

  return errors;
}

/** §2.1 İade grubu: BillingReference zorunlu */
function validateIadeGroup(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const tc = input.invoiceTypeCode;

  if (!input.billingReferences || input.billingReferences.length === 0) {
    errors.push(typeRequirement(tc, 'billingReferences',
      'İade tipi faturalarda BillingReference/InvoiceDocumentReference zorunludur'));
    return errors;
  }

  input.billingReferences.forEach((br, i) => {
    const ref = br.invoiceDocumentReference;
    if (!ref) {
      errors.push(missingField(`billingReferences[${i}].invoiceDocumentReference`,
        'InvoiceDocumentReference zorunludur'));
      return;
    }
    if (!isNonEmpty(ref.id)) {
      errors.push(missingField(`billingReferences[${i}].invoiceDocumentReference.id`,
        'Referans fatura ID zorunludur'));
    } else if (ref.id.length !== 16) {
      errors.push(typeRequirement(tc, `billingReferences[${i}].invoiceDocumentReference.id`,
        `Referans fatura ID 16 karakter olmalıdır (gelen: ${ref.id.length})`));
    }

    // B-31: IADE grubunda InvoiceDocumentReference.documentTypeCode='IADE' zorunlu (CommonSchematron:358)
    if (!isNonEmpty(ref.documentTypeCode)) {
      errors.push(typeRequirement(tc, `billingReferences[${i}].invoiceDocumentReference.documentTypeCode`,
        "IADE grubunda DocumentTypeCode zorunludur (değer: 'IADE')"));
    } else if (ref.documentTypeCode !== 'IADE') {
      errors.push(typeRequirement(tc, `billingReferences[${i}].invoiceDocumentReference.documentTypeCode`,
        `IADE grubunda DocumentTypeCode 'IADE' olmalıdır (gelen: ${ref.documentTypeCode})`));
    }
  });

  return errors;
}

/** §2.2 Tevkifat grubu: WithholdingTaxTotal validasyonu */
function validateTevkifatGroup(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const tc = input.invoiceTypeCode;

  if (!input.withholdingTaxTotals || input.withholdingTaxTotals.length === 0) {
    errors.push(typeRequirement(tc, 'withholdingTaxTotals',
      'Tevkifat tipi faturalarda WithholdingTaxTotal zorunludur'));
    return errors;
  }

  input.withholdingTaxTotals.forEach((wtt, i) => {
    wtt.taxSubtotals?.forEach((ts, j) => {
      const path = `withholdingTaxTotals[${i}].taxSubtotals[${j}]`;

      if (!isNonEmpty(ts.taxTypeCode)) {
        errors.push(missingField(`${path}.taxTypeCode`, 'Tevkifat vergi kodu zorunludur'));
      } else if (!WITHHOLDING_TAX_TYPE_CODES.has(ts.taxTypeCode)) {
        errors.push(invalidValue(`${path}.taxTypeCode`,
          'WithholdingTaxType listesinden (601-627, 801-825)', ts.taxTypeCode));
      }

      if (ts.percent === undefined || ts.percent === null) {
        errors.push(missingField(`${path}.percent`, 'Tevkifat yüzdesi zorunludur'));
      }

      // Kod+yüzde kombinasyonu kontrolü
      if (isNonEmpty(ts.taxTypeCode) && ts.percent !== undefined && ts.percent !== null) {
        const whDef = WITHHOLDING_TAX_MAP.get(ts.taxTypeCode);
        if (whDef?.dynamicPercent) {
          // M3 — 650 gibi dinamik oran: combo whitelist yerine aralık kontrolü
          if (ts.percent < 0 || ts.percent > 100) {
            errors.push(invalidValue(`${path}.percent`,
              `${ts.taxTypeCode} kodu için 0-100 arası yüzde`, String(ts.percent)));
          }
        } else {
          // Sabit oranlı tevkifat: WithholdingTaxTypeWithPercent Set'te aranır
          const combo = `${ts.taxTypeCode}${String(ts.percent).padStart(2, '0')}`;
          if (!WITHHOLDING_TAX_TYPE_WITH_PERCENT.has(combo)) {
            errors.push(invalidValue(`${path}`,
              'WithholdingTaxTypeWithPercent listesinden geçerli kombinasyon', combo));
          }
        }
      }
    });
  });

  return errors;
}

/** §2.3 İstisna grubu: TaxExemptionReasonCode kontrolü */
function validateIstisnaGroup(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const tc = input.invoiceTypeCode;

  const allSubtotals = input.taxTotals?.flatMap(tt => tt.taxSubtotals || []) || [];
  const kdvSubtotals = allSubtotals.filter(ts => ts.taxTypeCode === '0015');

  kdvSubtotals.forEach((ts, i) => {
    if (!isNonEmpty(ts.taxExemptionReasonCode)) {
      errors.push(typeRequirement(tc, `taxTotals.taxSubtotals[${i}].taxExemptionReasonCode`,
        'İstisna faturalarında TaxExemptionReasonCode zorunludur'));
    } else if (!ISTISNA_TAX_EXEMPTION_REASON_CODES.has(ts.taxExemptionReasonCode)) {
      errors.push(invalidValue(`taxTotals.taxSubtotals[${i}].taxExemptionReasonCode`,
        'istisnaTaxExemptionReasonCodeType listesinden', ts.taxExemptionReasonCode));
    }

    if (!isNonEmpty(ts.taxExemptionReason)) {
      errors.push(typeRequirement(tc, `taxTotals.taxSubtotals[${i}].taxExemptionReason`,
        'İstisna faturalarında TaxExemptionReason zorunludur'));
    }
  });

  return errors;
}

/** §2.4 Özel Matrah */
function validateOzelMatrah(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const allSubtotals = input.taxTotals?.flatMap(tt => tt.taxSubtotals || []) || [];
  const kdvSubtotals = allSubtotals.filter(ts => ts.taxTypeCode === '0015');

  kdvSubtotals.forEach((ts, i) => {
    // Sprint 8f.2 (Bug #2): taxExemptionReasonCode varlığı zorunlu (ISTISNA grubu pattern'i eşleniği).
    // Önceden sadece whitelist kontrolü vardı — kod hiç verilmezse sessiz geçiyordu.
    if (!isNonEmpty(ts.taxExemptionReasonCode)) {
      errors.push(typeRequirement(InvoiceTypeCode.OZELMATRAH,
        `taxTotals.taxSubtotals[${i}].taxExemptionReasonCode`,
        'OZELMATRAH faturalarında TaxExemptionReasonCode zorunludur (801-812 aralığı)'));
      return;
    }
    if (!OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES.has(ts.taxExemptionReasonCode)) {
      errors.push(invalidValue(`taxTotals.taxSubtotals[${i}].taxExemptionReasonCode`,
        'ozelMatrahTaxExemptionReasonCodeType listesinden (801-812)', ts.taxExemptionReasonCode));
    }
  });

  return errors;
}

/** §2.5 İhraç Kayıtlı */
function validateIhracKayitli(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const allSubtotals = input.taxTotals?.flatMap(tt => tt.taxSubtotals || []) || [];
  const kdvSubtotals = allSubtotals.filter(ts => ts.taxTypeCode === '0015');

  // B-NEW-06 (Sprint 8c.6): IHRACKAYITLI faturada 701-704 kodlarından biri zorunlu
  const hasIhracKod = kdvSubtotals.some(ts =>
    isNonEmpty(ts.taxExemptionReasonCode) && IHRAC_EXEMPTION_REASON_CODES.has(ts.taxExemptionReasonCode),
  );
  if (!hasIhracKod) {
    errors.push(typeRequirement(InvoiceTypeCode.IHRACKAYITLI,
      'taxTotals.taxSubtotals.taxExemptionReasonCode',
      'IHRACKAYITLI faturasında 701-704 istisna kodlarından biri zorunludur'));
  }

  // Mevcut: kod verilmişse 701-704 whitelist kontrolü
  kdvSubtotals.forEach((ts, i) => {
    if (isNonEmpty(ts.taxExemptionReasonCode) &&
        !IHRAC_EXEMPTION_REASON_CODES.has(ts.taxExemptionReasonCode)) {
      errors.push(invalidValue(`taxTotals.taxSubtotals[${i}].taxExemptionReasonCode`,
        'ihracExemptionReasonCodeType listesinden (701-704)', ts.taxExemptionReasonCode));
    }
  });

  return errors;
}

/** §2.7 Teknoloji Destek */
function validateTeknolojiDestek(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // Alıcı TCKN olmalı
  if (input.customer?.taxIdType !== 'TCKN') {
    errors.push(typeRequirement(InvoiceTypeCode.TEKNOLOJIDESTEK, 'customer.taxIdType',
      'TEKNOLOJIDESTEK faturasında alıcı TCKN olmalıdır'));
  }

  // Her satırda TELEFON veya TABLET_PC
  input.lines?.forEach((line, i) => {
    const hasRequired = line.item?.additionalItemIdentifications?.some(
      aid => aid.schemeId === 'TELEFON' || aid.schemeId === 'TABLET_PC'
    );
    if (!hasRequired) {
      errors.push(typeRequirement(InvoiceTypeCode.TEKNOLOJIDESTEK, `lines[${i}].item.additionalItemIdentifications`,
        'TEKNOLOJIDESTEK faturasında her satırda TELEFON veya TABLET_PC AdditionalItemIdentification zorunludur'));
    }
  });

  return errors;
}

/** §1.7 KDV 0 kuralı: TaxAmount=0 + TaxTypeCode=0015 → TaxExemptionReason zorunlu */
function validateKdvZeroExemption(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const allSubtotals = input.taxTotals?.flatMap(tt => tt.taxSubtotals || []) || [];

  allSubtotals.forEach((ts, i) => {
    if (ts.taxTypeCode === '0015' && ts.taxAmount === 0 && !isNonEmpty(ts.taxExemptionReason)) {
      errors.push(typeRequirement(input.invoiceTypeCode, `taxTotals.taxSubtotals[${i}].taxExemptionReason`,
        'KDV tutarı 0 ise TaxExemptionReason zorunludur'));
    }
  });

  return errors;
}

/** TaxTypeCode 4171 kontrolü */
function validateTax4171(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const allSubtotals = input.taxTotals?.flatMap(tt => tt.taxSubtotals || []) || [];

  allSubtotals.forEach((ts, i) => {
    if (ts.taxTypeCode === '4171' && !TAX_4171_ALLOWED_TYPES.has(input.invoiceTypeCode)) {
      errors.push(invalidValue(`taxTotals.taxSubtotals[${i}].taxTypeCode`,
        'TaxTypeCode 4171 sadece TEVKIFAT, IADE, SGK, YTBIADE tiplerinde kullanılabilir',
        `${ts.taxTypeCode} (tip: ${input.invoiceTypeCode})`));
    }
  });

  return errors;
}
