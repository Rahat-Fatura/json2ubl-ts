import type { ValidationError } from '../errors/ubl-build-error';
import type { InvoiceInput } from '../types/invoice-input';
import type {
  PartyInput,
  AddressInput,
  PaymentMeansInput,
  DocumentReferenceInput,
  OrderReferenceInput,
} from '../types/common';
import {
  INVOICE_ID_REGEX, UUID_REGEX, DATE_REGEX, TIME_REGEX,
  CURRENCY_CODES, TAX_TYPE_CODES,
  EXCHANGE_RATE_REGEX, PARTY_IDENTIFICATION_SCHEME_IDS,
} from '../config/constants';
import {
  TAXFREE_SPECIAL_VKN, TAXFREE_ALLOWED_PROFILES,
  SGK_SPECIAL_VKN, SGK_ALLOWED_TYPES,
} from '../config/special-vkn-config';
import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';
import { missingField, invalidFormat, invalidValue } from './validation-result';
import { isNonEmpty } from '../utils/formatters';

/** B-65: IssueDate aralık alt sınırı (Schematron e-Fatura başlangıcı) */
const ISSUE_DATE_MIN = '2005-01-01';

/**
 * §1 Ortak zorunluluk validasyonu — tüm faturalar için geçerli kurallar
 */
export function validateCommon(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // §1.2 Zorunlu dinamik alanlar
  if (!isNonEmpty(input.id)) {
    errors.push(missingField('id', 'Fatura numarası (cbc:ID) zorunludur'));
  } else if (!INVOICE_ID_REGEX.test(input.id)) {
    errors.push(invalidFormat('id', '^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$', input.id));
  }

  if (!isNonEmpty(input.uuid)) {
    errors.push(missingField('uuid', 'UUID (cbc:UUID) zorunludur'));
  } else if (!UUID_REGEX.test(input.uuid)) {
    errors.push(invalidFormat('uuid', 'UUID formatı (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)', input.uuid));
  }

  if (!isNonEmpty(input.profileId)) {
    errors.push(missingField('profileId', 'ProfileID (cbc:ProfileID) zorunludur'));
  } else if (!Object.values(InvoiceProfileId).includes(input.profileId as InvoiceProfileId)) {
    // B-68: ProfileID whitelist runtime (CommonSchematron:147)
    errors.push(invalidFormat('profileId',
      Object.values(InvoiceProfileId).join('|'), input.profileId));
  }

  if (!isNonEmpty(input.invoiceTypeCode)) {
    errors.push(missingField('invoiceTypeCode', 'InvoiceTypeCode (cbc:InvoiceTypeCode) zorunludur'));
  }

  if (!isNonEmpty(input.issueDate)) {
    errors.push(missingField('issueDate', 'Düzenleme tarihi (cbc:IssueDate) zorunludur'));
  } else if (!DATE_REGEX.test(input.issueDate)) {
    errors.push(invalidFormat('issueDate', 'YYYY-MM-DD', input.issueDate));
  } else {
    // B-65: IssueDate aralık kontrolü (CommonSchematron:169-170)
    const today = new Date().toISOString().slice(0, 10);
    if (input.issueDate < ISSUE_DATE_MIN || input.issueDate > today) {
      errors.push(invalidValue('issueDate',
        `${ISSUE_DATE_MIN} ≤ tarih ≤ ${today}`, input.issueDate));
    }
  }

  if (input.issueTime && !TIME_REGEX.test(input.issueTime)) {
    errors.push(invalidFormat('issueTime', 'HH:mm:ss', input.issueTime));
  }

  // §1.3 Para birimi
  if (!isNonEmpty(input.currencyCode)) {
    errors.push(missingField('currencyCode', 'Para birimi kodu (cbc:DocumentCurrencyCode) zorunludur'));
  } else if (!CURRENCY_CODES.has(input.currencyCode)) {
    errors.push(invalidValue('currencyCode', 'CurrencyCodeList değeri', input.currencyCode));
  }

  if (input.currencyCode && input.currencyCode !== 'TRY' && !input.exchangeRate) {
    errors.push(missingField('exchangeRate', 'Dövizli faturalarda PricingExchangeRate zorunludur'));
  }

  // B-64: ExchangeRate.calculationRate format kontrolü (CommonSchematron:190)
  if (input.exchangeRate) {
    const rate = input.exchangeRate.calculationRate;
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      errors.push(invalidFormat('exchangeRate.calculationRate',
        'pozitif ondalık sayı', String(rate)));
    } else if (!EXCHANGE_RATE_REGEX.test(String(rate))) {
      errors.push(invalidFormat('exchangeRate.calculationRate',
        '15 tam basamak + max 6 ondalık', String(rate)));
    }
  }

  // §1.5 Party validasyonu
  errors.push(...validateParty(input.supplier, 'supplier'));
  errors.push(...validateParty(input.customer, 'customer'));

  // B-62/B-63: Özel VKN cross-check (TaxFreeInvoice + SGK)
  errors.push(...validateSpecialVKN(input));

  // §1.6 Signature
  if (input.signatureInfo) {
    const sigLen = input.signatureInfo.id?.length;
    if (!isNonEmpty(input.signatureInfo.id)) {
      errors.push(missingField('signatureInfo.id', 'Signature ID zorunludur'));
    } else if (sigLen !== 10 && sigLen !== 11) {
      errors.push(invalidFormat('signatureInfo.id', '10 (VKN) veya 11 (TCKN) hane', String(sigLen)));
    }
  }

  // §1.7 Vergi toplamları
  if (!input.taxTotals || input.taxTotals.length === 0) {
    errors.push(missingField('taxTotals', 'En az bir TaxTotal zorunludur'));
  } else {
    input.taxTotals.forEach((tt, i) => {
      if (!tt.taxSubtotals || tt.taxSubtotals.length === 0) {
        errors.push(missingField(`taxTotals[${i}].taxSubtotals`, 'En az bir TaxSubtotal zorunludur'));
      }
      tt.taxSubtotals?.forEach((ts, j) => {
        if (!isNonEmpty(ts.taxTypeCode)) {
          errors.push(missingField(`taxTotals[${i}].taxSubtotals[${j}].taxTypeCode`, 'TaxTypeCode zorunludur'));
        } else if (!TAX_TYPE_CODES.has(ts.taxTypeCode)) {
          errors.push(invalidValue(`taxTotals[${i}].taxSubtotals[${j}].taxTypeCode`, 'TaxType listesinden', ts.taxTypeCode));
        }
      });
    });
  }

  // §1.8 Satırlar
  if (!input.lines || input.lines.length === 0) {
    errors.push(missingField('lines', 'En az bir InvoiceLine zorunludur'));
  } else {
    input.lines.forEach((line, i) => {
      if (!isNonEmpty(line.id)) {
        errors.push(missingField(`lines[${i}].id`, 'Satır ID zorunludur'));
      }
      if (!isNonEmpty(line.unitCode)) {
        errors.push(missingField(`lines[${i}].unitCode`, 'Birim kodu (unitCode) zorunludur'));
      }
      if (!line.item || !isNonEmpty(line.item.name)) {
        errors.push(missingField(`lines[${i}].item.name`, 'Ürün adı (cac:Item/cbc:Name) zorunlu ve boş olamaz'));
      }
    });
  }

  // LegalMonetaryTotal
  if (!input.legalMonetaryTotal) {
    errors.push(missingField('legalMonetaryTotal', 'LegalMonetaryTotal zorunludur'));
  }

  // §M6 Parent-Child Conditional (Sprint 3 — B-32/33/35/70)
  if (input.orderReference) {
    errors.push(...validateOrderReference(input.orderReference, 'orderReference'));
  }
  input.despatchReferences?.forEach((ref, i) => {
    errors.push(...validateDocumentReference(ref, `despatchReferences[${i}]`));
  });
  input.receiptReferences?.forEach((ref, i) => {
    errors.push(...validateDocumentReference(ref, `receiptReferences[${i}]`));
  });
  input.billingReferences?.forEach((br, i) => {
    errors.push(...validateDocumentReference(br.invoiceDocumentReference, `billingReferences[${i}].invoiceDocumentReference`));
  });
  input.paymentMeans?.forEach((pm, i) => {
    errors.push(...validatePaymentMeans(pm, `paymentMeans[${i}]`));
  });
  if (input.delivery?.deliveryAddress) {
    errors.push(...validateAddress(input.delivery.deliveryAddress, 'delivery.deliveryAddress'));
  }
  input.lines?.forEach((line, i) => {
    if (line.delivery?.deliveryAddress) {
      errors.push(...validateAddress(line.delivery.deliveryAddress, `lines[${i}].delivery.deliveryAddress`));
    }
  });

  return errors;
}

/**
 * §1.5 Party validasyonu — VKN/TCKN kuralları
 */
export function validateParty(party: PartyInput | undefined | null, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!party) {
    errors.push(missingField(path, `${path} taraf bilgisi zorunludur`));
    return errors;
  }

  if (!isNonEmpty(party.vknTckn)) {
    errors.push(missingField(`${path}.vknTckn`, 'VKN veya TCKN zorunludur'));
    return errors;
  }

  if (party.taxIdType === 'VKN') {
    if (party.vknTckn.length !== 10) {
      errors.push(invalidFormat(`${path}.vknTckn`, 'VKN 10 hane olmalı', String(party.vknTckn.length)));
    }
    if (!isNonEmpty(party.name)) {
      errors.push(missingField(`${path}.name`, 'VKN sahibi için PartyName zorunludur'));
    }
  } else if (party.taxIdType === 'TCKN') {
    if (party.vknTckn.length !== 11) {
      errors.push(invalidFormat(`${path}.vknTckn`, 'TCKN 11 hane olmalı', String(party.vknTckn.length)));
    }
    if (!isNonEmpty(party.firstName)) {
      errors.push(missingField(`${path}.firstName`, 'TCKN sahibi için Person/FirstName zorunludur'));
    }
    if (!isNonEmpty(party.familyName)) {
      errors.push(missingField(`${path}.familyName`, 'TCKN sahibi için Person/FamilyName zorunludur'));
    }
  } else {
    errors.push(invalidValue(`${path}.taxIdType`, 'VKN veya TCKN', party.taxIdType));
  }

  // §M6 / B-34: Party verildiyse PostalAddress alanları zorunlu (cityName + citySubdivisionName)
  errors.push(...validatePartyAddressFields(party, path));

  // B-69: additionalIdentifiers schemeID whitelist (CommonSchematron:250-251)
  party.additionalIdentifiers?.forEach((id, i) => {
    if (!PARTY_IDENTIFICATION_SCHEME_IDS.has(id.schemeId)) {
      errors.push(invalidValue(`${path}.additionalIdentifiers[${i}].schemeId`,
        'PARTY_IDENTIFICATION_SCHEME_IDS listesinden', id.schemeId));
    }
  });

  return errors;
}

/**
 * B-62 + B-63 — Schematron özel VKN cross-check.
 * 1460415308 (TaxFreeInvoice) varsa profil YOLCU/IHRACAT/OZELFATURA/KAMU.
 * 7750409379 (SGK) varsa tip SGK veya TEVKIFAT.
 */
export function validateSpecialVKN(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const partyVkns = [input.supplier?.vknTckn, input.customer?.vknTckn]
    .filter((v): v is string => isNonEmpty(v));

  if (partyVkns.includes(TAXFREE_SPECIAL_VKN)) {
    if (!TAXFREE_ALLOWED_PROFILES.has(input.profileId as InvoiceProfileId)) {
      errors.push(invalidValue('profileId',
        `${TAXFREE_SPECIAL_VKN} VKN için YOLCUBERABERFATURA/IHRACAT/OZELFATURA/KAMU profili zorunludur (B-62)`,
        input.profileId));
    }
  }

  if (partyVkns.includes(SGK_SPECIAL_VKN)) {
    if (!SGK_ALLOWED_TYPES.has(input.invoiceTypeCode as InvoiceTypeCode)) {
      errors.push(invalidValue('invoiceTypeCode',
        `${SGK_SPECIAL_VKN} VKN için SGK veya TEVKIFAT tipi zorunludur (B-63)`,
        input.invoiceTypeCode));
    }
  }

  return errors;
}

/**
 * M6 / B-34 — Party verildiyse PostalAddress alanları (cityName, citySubdivisionName) zorunlu.
 * PartyInput düz adres alanlarına sahip; XSD PostalAddress parent zorunlu olduğundan
 * child alanları da runtime'da enforce edilir.
 */
export function validatePartyAddressFields(party: PartyInput, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isNonEmpty(party.cityName)) {
    errors.push(missingField(`${path}.cityName`, 'Party için PostalAddress/CityName zorunludur (B-34)'));
  }
  if (!isNonEmpty(party.citySubdivisionName)) {
    errors.push(missingField(`${path}.citySubdivisionName`, 'Party için PostalAddress/CitySubdivisionName zorunludur (B-34)'));
  }
  return errors;
}

/**
 * M6 / B-35 — Address verildiyse cityName + citySubdivisionName zorunlu.
 * Parent opsiyonel; ancak verildiyse her iki şehir alanı dolu olmalı.
 */
export function validateAddress(addr: AddressInput | undefined | null, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!addr) return errors;
  if (!isNonEmpty(addr.cityName)) {
    errors.push(missingField(`${path}.cityName`, 'Adres için CityName zorunludur (B-35)'));
  }
  if (!isNonEmpty(addr.citySubdivisionName)) {
    errors.push(missingField(`${path}.citySubdivisionName`, 'Adres için CitySubdivisionName zorunludur (B-35)'));
  }
  return errors;
}

/**
 * M6 / B-70 — PaymentMeans verildiyse paymentMeansCode zorunlu.
 */
export function validatePaymentMeans(pm: PaymentMeansInput | undefined | null, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!pm) return errors;
  if (!isNonEmpty(pm.paymentMeansCode)) {
    errors.push(missingField(`${path}.paymentMeansCode`, 'PaymentMeans için PaymentMeansCode zorunludur (B-70)'));
  }
  return errors;
}

/**
 * M6 / B-32 — DocumentReference verildiyse issueDate zorunlu.
 */
export function validateDocumentReference(ref: DocumentReferenceInput | undefined | null, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ref) return errors;
  if (!isNonEmpty(ref.id)) {
    errors.push(missingField(`${path}.id`, 'DocumentReference için ID zorunludur'));
  }
  if (!isNonEmpty(ref.issueDate)) {
    errors.push(missingField(`${path}.issueDate`, 'DocumentReference için IssueDate zorunludur (B-32)'));
  } else if (!DATE_REGEX.test(ref.issueDate)) {
    errors.push(invalidFormat(`${path}.issueDate`, 'YYYY-MM-DD', ref.issueDate));
  }
  return errors;
}

/**
 * M6 / B-33 — OrderReference verildiyse issueDate zorunlu.
 */
export function validateOrderReference(ref: OrderReferenceInput | undefined | null, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ref) return errors;
  if (!isNonEmpty(ref.id)) {
    errors.push(missingField(`${path}.id`, 'OrderReference için ID zorunludur'));
  }
  if (!isNonEmpty(ref.issueDate)) {
    errors.push(missingField(`${path}.issueDate`, 'OrderReference için IssueDate zorunludur (B-33)'));
  } else if (!DATE_REGEX.test(ref.issueDate)) {
    errors.push(invalidFormat(`${path}.issueDate`, 'YYYY-MM-DD', ref.issueDate));
  }
  return errors;
}
