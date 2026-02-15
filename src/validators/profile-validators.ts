import type { ValidationError } from '../errors/ubl-build-error';
import type { InvoiceInput } from '../types/invoice-input';
import { InvoiceProfileId } from '../types/enums';
import {
  TR_IBAN_REGEX, SEVKIYAT_NO_REGEX, ETIKET_NO_REGEX,
  DELIVERY_TERM_CODES, TRANSPORT_MODE_CODES, YTB_ITEM_CLASSIFICATION_CODES,
  YTB_GROUP_TYPES,
} from '../config/constants';
import { missingField, profileRequirement, invalidFormat } from './validation-result';
import { isNonEmpty, isNumeric, hasLength } from '../utils/formatters';

/**
 * §3 Profil-bazlı validasyon — ProfileID'ye göre ek kurallar
 */
export function validateByProfile(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const profile = input.profileId;

  switch (profile) {
    case InvoiceProfileId.IHRACAT:
      errors.push(...validateIhracat(input));
      break;
    case InvoiceProfileId.YOLCUBERABERFATURA:
      errors.push(...validateYolcuBeraber(input));
      break;
    case InvoiceProfileId.KAMU:
      errors.push(...validateKamu(input));
      break;
    case InvoiceProfileId.HKS:
      errors.push(...validateHks(input));
      break;
    case InvoiceProfileId.ILAC_TIBBICIHAZ:
      errors.push(...validateIlacTibbiCihaz(input));
      break;
    case InvoiceProfileId.YATIRIMTESVIK:
      errors.push(...validateYatirimTesvik(input));
      break;
    case InvoiceProfileId.IDIS:
      errors.push(...validateIdis(input));
      break;
    case InvoiceProfileId.EARSIVFATURA:
      errors.push(...validateEarsiv(input));
      break;
  }

  return errors;
}

/** §3.3 IHRACAT profili */
function validateIhracat(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = InvoiceProfileId.IHRACAT;

  // BuyerCustomerParty zorunlu (PARTYTYPE=EXPORT)
  if (!input.buyerCustomer) {
    errors.push(profileRequirement(p, 'buyerCustomer', 'IHRACAT profilinde BuyerCustomerParty zorunludur'));
  } else {
    if (input.buyerCustomer.partyType !== 'EXPORT') {
      errors.push(profileRequirement(p, 'buyerCustomer.partyType', 'IHRACAT profilinde partyType EXPORT olmalıdır'));
    }
    if (!isNonEmpty(input.buyerCustomer.party?.registrationName)) {
      errors.push(profileRequirement(p, 'buyerCustomer.party.registrationName',
        'IHRACAT profilinde BuyerCustomerParty RegistrationName zorunludur'));
    }
  }

  // Supplier PartyTaxScheme Name zorunlu
  if (!isNonEmpty(input.supplier?.taxOffice)) {
    errors.push(profileRequirement(p, 'supplier.taxOffice',
      'IHRACAT profilinde satıcı vergi dairesi adı zorunludur'));
  }

  // Her satırda: DeliveryTerms, DeliveryAddress, TransportModeCode, RequiredCustomsID
  input.lines?.forEach((line, i) => {
    const del = line.delivery;
    if (!del) {
      errors.push(profileRequirement(p, `lines[${i}].delivery`,
        'IHRACAT profilinde her satırda Delivery zorunludur'));
      return;
    }

    // DeliveryTerms (INCOTERMS)
    if (!del.deliveryTerms || !isNonEmpty(del.deliveryTerms.id)) {
      errors.push(profileRequirement(p, `lines[${i}].delivery.deliveryTerms.id`,
        'IHRACAT: DeliveryTerms (INCOTERMS) zorunludur'));
    } else if (!DELIVERY_TERM_CODES.has(del.deliveryTerms.id)) {
      errors.push(profileRequirement(p, `lines[${i}].delivery.deliveryTerms.id`,
        `Geçersiz INCOTERMS kodu: ${del.deliveryTerms.id}`));
    }

    // TransportModeCode
    if (del.shipment?.transportModeCode !== undefined) {
      if (!TRANSPORT_MODE_CODES.has(del.shipment.transportModeCode)) {
        errors.push(profileRequirement(p, `lines[${i}].delivery.shipment.transportModeCode`,
          `Geçersiz taşıma modu: ${del.shipment.transportModeCode}`));
      }
    }

    // RequiredCustomsID (GTİP)
    const goodsItems = del.shipment?.goodsItems;
    if (!goodsItems || goodsItems.length === 0 || !isNonEmpty(goodsItems[0]?.requiredCustomsId)) {
      errors.push(profileRequirement(p, `lines[${i}].delivery.shipment.goodsItems[0].requiredCustomsId`,
        'IHRACAT: RequiredCustomsID (GTİP) zorunludur'));
    }
  });

  return errors;
}

/** §3.4 YOLCUBERABERFATURA profili */
function validateYolcuBeraber(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = InvoiceProfileId.YOLCUBERABERFATURA;

  // BuyerCustomerParty zorunlu (PARTYTYPE=TAXFREE)
  if (!input.buyerCustomer) {
    errors.push(profileRequirement(p, 'buyerCustomer', 'YOLCUBERABERFATURA profilinde BuyerCustomerParty zorunludur'));
  } else {
    if (input.buyerCustomer.partyType !== 'TAXFREE') {
      errors.push(profileRequirement(p, 'buyerCustomer.partyType', 'YOLCUBERABERFATURA profilinde partyType TAXFREE olmalıdır'));
    }
    const party = input.buyerCustomer.party;
    if (!isNonEmpty(party?.nationalityId)) {
      errors.push(profileRequirement(p, 'buyerCustomer.party.nationalityId', 'NationalityID zorunludur'));
    }
    if (!isNonEmpty(party?.passportId)) {
      errors.push(profileRequirement(p, 'buyerCustomer.party.passportId', 'Pasaport numarası zorunludur'));
    }
  }

  // TaxRepresentativeParty zorunlu
  if (!input.taxRepresentativeParty) {
    errors.push(profileRequirement(p, 'taxRepresentativeParty', 'YOLCUBERABERFATURA profilinde TaxRepresentativeParty zorunludur'));
  } else {
    const trp = input.taxRepresentativeParty;
    if (!isNonEmpty(trp.intermediaryVknTckn)) {
      errors.push(profileRequirement(p, 'taxRepresentativeParty.intermediaryVknTckn', 'ARACIKURUMVKN zorunludur'));
    } else {
      const len = trp.intermediaryVknTckn.length;
      if (len !== 10 && len !== 11) {
        errors.push(invalidFormat('taxRepresentativeParty.intermediaryVknTckn', '10 veya 11 hane', String(len)));
      }
    }
    if (!isNonEmpty(trp.intermediaryLabel)) {
      errors.push(profileRequirement(p, 'taxRepresentativeParty.intermediaryLabel', 'ARACIKURUMETIKET zorunludur'));
    }
  }

  return errors;
}

/** §3.6 KAMU profili */
function validateKamu(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = InvoiceProfileId.KAMU;

  if (!input.paymentMeans || input.paymentMeans.length === 0) {
    errors.push(profileRequirement(p, 'paymentMeans', 'KAMU profilinde PaymentMeans zorunludur'));
    return errors;
  }

  input.paymentMeans.forEach((pm, i) => {
    const iban = pm.payeeFinancialAccount?.id;
    if (!isNonEmpty(iban)) {
      errors.push(profileRequirement(p, `paymentMeans[${i}].payeeFinancialAccount.id`, 'IBAN zorunludur'));
    } else if (!TR_IBAN_REGEX.test(iban)) {
      errors.push(invalidFormat(`paymentMeans[${i}].payeeFinancialAccount.id`,
        'TR IBAN formatı: ^TR\\d{7}[A-Z0-9]{17}$', iban));
    }
  });

  return errors;
}

/** §3.7 HKS profili */
function validateHks(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = InvoiceProfileId.HKS;

  input.lines?.forEach((line, i) => {
    const kunyeNo = line.item?.additionalItemIdentifications?.find(a => a.schemeId === 'KUNYENO');
    if (!kunyeNo || !isNonEmpty(kunyeNo.value)) {
      errors.push(profileRequirement(p, `lines[${i}].item.additionalItemIdentifications`,
        'HKS profilinde her satırda KUNYENO zorunludur'));
    } else if (kunyeNo.value.length !== 19) {
      errors.push(profileRequirement(p, `lines[${i}].item.additionalItemIdentifications.KUNYENO`,
        `KUNYENO 19 karakter olmalıdır (gelen: ${kunyeNo.value.length})`));
    }
  });

  return errors;
}

/** §3.9 ILAC_TIBBICIHAZ profili */
function validateIlacTibbiCihaz(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = InvoiceProfileId.ILAC_TIBBICIHAZ;
  const validSchemes = new Set(['ILAC', 'TIBBICIHAZ', 'DIGER']);

  input.lines?.forEach((line, i) => {
    const hasValidId = line.item?.additionalItemIdentifications?.some(
      a => validSchemes.has(a.schemeId) && isNonEmpty(a.value)
    );
    if (!hasValidId) {
      errors.push(profileRequirement(p, `lines[${i}].item.additionalItemIdentifications`,
        'ILAC_TIBBICIHAZ profilinde her satırda ILAC, TIBBICIHAZ veya DIGER AdditionalItemIdentification zorunludur'));
    }
  });

  return errors;
}

/** §3.10 YATIRIMTESVIK profili */
function validateYatirimTesvik(input: InvoiceInput): ValidationError[] {
  return validateYatirimTesvikRules(input, InvoiceProfileId.YATIRIMTESVIK);
}

/** YATIRIMTESVIK kuralları — hem profil hem EARSIV+YTB tipi için ortak */
export function validateYatirimTesvikRules(input: InvoiceInput, source: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // ContractDocumentReference zorunlu (YTBNO, 6 haneli numerik)
  if (!input.contractReference) {
    errors.push(profileRequirement(source, 'contractReference',
      'Yatırım Teşvik profilinde ContractDocumentReference zorunludur'));
  } else {
    const id = input.contractReference.id;
    if (!isNonEmpty(id)) {
      errors.push(missingField('contractReference.id', 'YTBNO zorunludur'));
    } else if (!hasLength(id, 6) || !isNumeric(id)) {
      errors.push(invalidFormat('contractReference.id', '6 haneli numerik YTBNO', id));
    }
  }

  // Her satırda ItemClassificationCode zorunlu
  input.lines?.forEach((line, i) => {
    const code = line.item?.commodityClassification?.itemClassificationCode;
    if (!isNonEmpty(code)) {
      errors.push(profileRequirement(source, `lines[${i}].item.commodityClassification.itemClassificationCode`,
        'Yatırım Teşvik profilinde ItemClassificationCode zorunludur'));
    } else if (!YTB_ITEM_CLASSIFICATION_CODES.has(code)) {
      errors.push(profileRequirement(source, `lines[${i}].item.commodityClassification.itemClassificationCode`,
        `Geçersiz ItemClassificationCode: ${code}. Geçerli değerler: 01, 02, 03, 04`));
    }

    // Kod 01 (Makine/Teçhizat): ModelName, ProductTraceID, SerialID zorunlu
    if (code === '01') {
      if (!isNonEmpty(line.item?.modelName)) {
        errors.push(profileRequirement(source, `lines[${i}].item.modelName`,
          'Kod 01 (Makine/Teçhizat) için ModelName zorunludur'));
      }
      const instances = line.item?.itemInstances;
      if (!instances || instances.length === 0) {
        errors.push(profileRequirement(source, `lines[${i}].item.itemInstances`,
          'Kod 01 (Makine/Teçhizat) için ItemInstance zorunludur'));
      } else {
        instances.forEach((inst, j) => {
          if (!isNonEmpty(inst.productTraceId)) {
            errors.push(profileRequirement(source, `lines[${i}].item.itemInstances[${j}].productTraceId`,
              'Kod 01 için ProductTraceID zorunludur'));
          }
          if (!isNonEmpty(inst.serialId)) {
            errors.push(profileRequirement(source, `lines[${i}].item.itemInstances[${j}].serialId`,
              'Kod 01 için SerialID zorunludur'));
          }
        });
      }
    }
  });

  return errors;
}

/** §3.11 IDIS profili */
function validateIdis(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const p = InvoiceProfileId.IDIS;

  // Supplier SEVKIYATNO zorunlu
  const sevkiyatNo = input.supplier?.additionalIdentifiers?.find(a => a.schemeId === 'SEVKIYATNO');
  if (!sevkiyatNo || !isNonEmpty(sevkiyatNo.value)) {
    errors.push(profileRequirement(p, 'supplier.additionalIdentifiers.SEVKIYATNO',
      'IDIS profilinde satıcıda SEVKIYATNO zorunludur'));
  } else if (!SEVKIYAT_NO_REGEX.test(sevkiyatNo.value)) {
    errors.push(invalidFormat('supplier.additionalIdentifiers.SEVKIYATNO',
      'SE-0000000 formatı (10 karakter)', sevkiyatNo.value));
  }

  // Her satırda ETIKETNO zorunlu
  input.lines?.forEach((line, i) => {
    const etiketNo = line.item?.additionalItemIdentifications?.find(a => a.schemeId === 'ETIKETNO');
    if (!etiketNo || !isNonEmpty(etiketNo.value)) {
      errors.push(profileRequirement(p, `lines[${i}].item.additionalItemIdentifications.ETIKETNO`,
        'IDIS profilinde her satırda ETIKETNO zorunludur'));
    } else if (!ETIKET_NO_REGEX.test(etiketNo.value)) {
      errors.push(invalidFormat(`lines[${i}].item.additionalItemIdentifications.ETIKETNO`,
        '2 harf + 7 rakam (9 karakter)', etiketNo.value));
    }
  });

  return errors;
}

/** §3.12 EARSIVFATURA profili — YTB tipleri için YATIRIMTESVIK kuralları */
function validateEarsiv(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // YTB tipleri kullanılıyorsa YATIRIMTESVIK kuralları uygulanır
  if (YTB_GROUP_TYPES.has(input.invoiceTypeCode)) {
    errors.push(...validateYatirimTesvikRules(input, `EARSIV+${input.invoiceTypeCode}`));
  }

  return errors;
}
