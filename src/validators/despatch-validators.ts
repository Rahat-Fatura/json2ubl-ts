import type { ValidationError } from '../errors/ubl-build-error';
import type { DespatchInput, CarrierPartyInput } from '../types/despatch-input';
import { DespatchProfileId, DespatchTypeCode } from '../types/enums';
import {
  INVOICE_ID_REGEX, UUID_REGEX, DATE_REGEX, TIME_REGEX,
  POSTAL_ZONE_REGEX, SEVKIYAT_NO_REGEX, ETIKET_NO_REGEX,
  LICENSE_PLATE_SCHEME_IDS, TCKN_REGEX, VKN_REGEX,
  PARTY_IDENTIFICATION_SCHEME_IDS,
} from '../config/constants';
import { validateParty } from './common-validators';
import { missingField, invalidFormat, invalidValue, profileRequirement } from './validation-result';
import { isNonEmpty } from '../utils/formatters';

/**
 * §5 DespatchAdvice validasyonu — tüm irsaliye kuralları
 */
export function validateDespatch(input: DespatchInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // §5.1 Zorunlu alanlar
  if (!isNonEmpty(input.id)) {
    errors.push(missingField('id', 'İrsaliye numarası zorunludur'));
  } else if (!INVOICE_ID_REGEX.test(input.id)) {
    errors.push(invalidFormat('id', '^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$', input.id));
  }

  if (!isNonEmpty(input.uuid)) {
    errors.push(missingField('uuid', 'UUID zorunludur'));
  } else if (!UUID_REGEX.test(input.uuid)) {
    errors.push(invalidFormat('uuid', 'UUID formatı', input.uuid));
  }

  // O3 — ProfileID whitelist (Schematron ProfileIDTypeDespatchAdvice)
  if (!isNonEmpty(input.profileId)) {
    errors.push(missingField('profileId', 'ProfileID zorunludur'));
  } else if (!Object.values(DespatchProfileId).includes(input.profileId as DespatchProfileId)) {
    errors.push(invalidFormat('profileId',
      Object.values(DespatchProfileId).join('|'), input.profileId));
  }

  // O3 — DespatchAdviceTypeCode whitelist (Schematron DespatchAdviceTypeCodeCheck)
  if (!isNonEmpty(input.despatchTypeCode)) {
    errors.push(missingField('despatchTypeCode', 'DespatchAdviceTypeCode zorunludur'));
  } else if (!Object.values(DespatchTypeCode).includes(input.despatchTypeCode as DespatchTypeCode)) {
    errors.push(invalidFormat('despatchTypeCode',
      Object.values(DespatchTypeCode).join('|'), input.despatchTypeCode));
  }

  if (!isNonEmpty(input.issueDate)) {
    errors.push(missingField('issueDate', 'Düzenleme tarihi zorunludur'));
  } else if (!DATE_REGEX.test(input.issueDate)) {
    errors.push(invalidFormat('issueDate', 'YYYY-MM-DD', input.issueDate));
  }

  // B-18: issueTime XSD zorunlu (M6 parent-child — parent Despatch zorunlu ⇒ issueTime zorunlu)
  if (!isNonEmpty(input.issueTime)) {
    errors.push(missingField('issueTime', 'Düzenleme saati (cbc:IssueTime) zorunludur (B-18)'));
  } else if (!TIME_REGEX.test(input.issueTime)) {
    errors.push(invalidFormat('issueTime', 'HH:mm:ss', input.issueTime));
  }

  // Party validasyonu
  errors.push(...validateParty(input.supplier, 'supplier'));
  errors.push(...validateParty(input.customer, 'customer'));

  // Shipment zorunlu alanlar
  if (!input.shipment) {
    errors.push(missingField('shipment', 'Sevkiyat bilgileri zorunludur'));
  } else {
    const s = input.shipment;

    if (!isNonEmpty(s.actualDespatchDate)) {
      errors.push(missingField('shipment.actualDespatchDate', 'Sevk tarihi zorunludur'));
    } else if (!DATE_REGEX.test(s.actualDespatchDate)) {
      errors.push(invalidFormat('shipment.actualDespatchDate', 'YYYY-MM-DD', s.actualDespatchDate));
    }

    if (!isNonEmpty(s.actualDespatchTime)) {
      errors.push(missingField('shipment.actualDespatchTime', 'Sevk saati zorunludur'));
    } else if (!TIME_REGEX.test(s.actualDespatchTime)) {
      errors.push(invalidFormat('shipment.actualDespatchTime', 'HH:mm:ss', s.actualDespatchTime));
    }

    // DeliveryAddress zorunlu
    if (!s.deliveryAddress) {
      errors.push(missingField('shipment.deliveryAddress', 'Teslimat adresi zorunludur'));
    } else {
      if (!isNonEmpty(s.deliveryAddress.citySubdivisionName)) {
        errors.push(missingField('shipment.deliveryAddress.citySubdivisionName', 'İlçe zorunludur'));
      }
      if (!isNonEmpty(s.deliveryAddress.cityName)) {
        errors.push(missingField('shipment.deliveryAddress.cityName', 'İl zorunludur'));
      }
      if (!isNonEmpty(s.deliveryAddress.country)) {
        errors.push(missingField('shipment.deliveryAddress.country', 'Ülke zorunludur'));
      }
      if (!isNonEmpty(s.deliveryAddress.postalZone)) {
        errors.push(missingField('shipment.deliveryAddress.postalZone', 'Posta kodu zorunludur'));
      } else if (!POSTAL_ZONE_REGEX.test(s.deliveryAddress.postalZone)) {
        errors.push(invalidFormat('shipment.deliveryAddress.postalZone',
          'TR posta kodu formatı', s.deliveryAddress.postalZone));
      }
    }

    // DriverPersons veya CarrierParty (en az biri zorunlu — AR-2: array)
    const hasDriver = (s.driverPersons?.length ?? 0) > 0;
    if (!hasDriver && !s.carrierParty) {
      errors.push(missingField('shipment.driverPersons/carrierParty',
        'Sürücü veya taşıyıcı firma bilgilerinden en az biri zorunludur'));
    }

    s.driverPersons?.forEach((dp, i) => {
      if (!isNonEmpty(dp.firstName)) {
        errors.push(missingField(`shipment.driverPersons[${i}].firstName`, 'Sürücü adı zorunludur'));
      }
      if (!isNonEmpty(dp.familyName)) {
        errors.push(missingField(`shipment.driverPersons[${i}].familyName`, 'Sürücü soyadı zorunludur'));
      }
      if (!isNonEmpty(dp.nationalityId)) {
        errors.push(missingField(`shipment.driverPersons[${i}].nationalityId`, 'Sürücü TCKN (nationalityId) zorunludur'));
      } else if (!TCKN_REGEX.test(dp.nationalityId)) {
        // B-104: Skill §7.1 — NationalityID = TCKN (11-hane numeric), 'TR' ISO kodu reddedilir
        errors.push(invalidFormat(`shipment.driverPersons[${i}].nationalityId`,
          '11-hane TCKN', dp.nationalityId));
      }
    });

    // Plaka schemeID kontrolü
    s.licensePlates?.forEach((lp, i) => {
      if (!LICENSE_PLATE_SCHEME_IDS.has(lp.schemeId)) {
        errors.push(invalidFormat(`shipment.licensePlates[${i}].schemeId`,
          'PLAKA veya DORSE', lp.schemeId));
      }
    });

    // B-85: CarrierParty VKN/TCKN format + schemeID whitelist (CommonSchematron:505-509)
    if (s.carrierParty) {
      errors.push(...validateCarrierParty(s.carrierParty, 'shipment.carrierParty'));
    }
  }

  // §5.2 DespatchLine zorunlu alanlar
  if (!input.lines || input.lines.length === 0) {
    errors.push(missingField('lines', 'En az bir DespatchLine zorunludur'));
  } else {
    input.lines.forEach((line, i) => {
      // O4 — DespatchLineId numeric (Schematron DespatchLineIdCheck: string(number()) != 'NaN')
      if (!isNonEmpty(line.id)) {
        errors.push(missingField(`lines[${i}].id`, 'Satır ID zorunludur'));
      } else if (!/^\d+$/.test(line.id)) {
        errors.push(invalidFormat(`lines[${i}].id`, 'Numerik (örn: 1, 2, 3)', line.id));
      }
      if (!isNonEmpty(line.unitCode)) {
        errors.push(missingField(`lines[${i}].unitCode`, 'Birim kodu zorunludur'));
      }
      if (!line.item || !isNonEmpty(line.item.name)) {
        errors.push(missingField(`lines[${i}].item.name`, 'Ürün adı zorunludur'));
      }
    });
  }

  // §5.3 MATBUDAN ek kuralları
  if (input.despatchTypeCode === DespatchTypeCode.MATBUDAN) {
    if (!input.additionalDocuments || input.additionalDocuments.length === 0) {
      errors.push(missingField('additionalDocuments',
        'MATBUDAN tipinde AdditionalDocumentReference zorunludur'));
    } else {
      // O7 — MATBUDAN cross-check (Schematron DespatchAdviceTypeCodeCheck):
      // En az bir AdditionalDocumentReference.documentType='MATBU' olmalı
      const hasMatbu = input.additionalDocuments.some(d => d.documentType === 'MATBU');
      if (!hasMatbu) {
        errors.push(profileRequirement('MATBUDAN', 'additionalDocuments.documentType',
          "MATBUDAN tipinde en az bir AdditionalDocumentReference DocumentType='MATBU' olmalıdır"));
      }
      // B-66: Her MATBUDAN referansında ID + IssueDate dolu olmalı (CommonSchematron:703)
      input.additionalDocuments.forEach((d, i) => {
        if (!isNonEmpty(d.id)) {
          errors.push(missingField(`additionalDocuments[${i}].id`,
            'MATBUDAN AdditionalDocumentReference için ID zorunludur (B-66)'));
        }
        if (!isNonEmpty(d.issueDate)) {
          errors.push(missingField(`additionalDocuments[${i}].issueDate`,
            'MATBUDAN AdditionalDocumentReference için IssueDate zorunludur (B-66)'));
        } else if (!DATE_REGEX.test(d.issueDate)) {
          errors.push(invalidFormat(`additionalDocuments[${i}].issueDate`,
            'YYYY-MM-DD', d.issueDate));
        }
      });
    }
  }

  // §5.5 HKSIRSALIYE profil kuralları
  if (input.profileId === DespatchProfileId.HKSIRSALIYE) {
    input.lines?.forEach((line, i) => {
      const kunyeNo = line.item?.additionalItemIdentifications?.find(a => a.schemeId === 'KUNYENO');
      if (!kunyeNo || !isNonEmpty(kunyeNo.value)) {
        errors.push(profileRequirement('HKSIRSALIYE', `lines[${i}].item.additionalItemIdentifications`,
          'HKSIRSALIYE profilinde her satırda KUNYENO zorunludur'));
      } else if (kunyeNo.value.length !== 19) {
        errors.push(profileRequirement('HKSIRSALIYE', `lines[${i}].item.additionalItemIdentifications.KUNYENO`,
          `KUNYENO 19 karakter olmalıdır (gelen: ${kunyeNo.value.length})`));
      }
    });
  }

  // §5.6 IDISIRSALIYE profil kuralları
  if (input.profileId === DespatchProfileId.IDISIRSALIYE) {
    const sevkiyatNo = input.supplier?.additionalIdentifiers?.find(a => a.schemeId === 'SEVKIYATNO');
    if (!sevkiyatNo || !isNonEmpty(sevkiyatNo.value)) {
      errors.push(profileRequirement('IDISIRSALIYE', 'supplier.additionalIdentifiers.SEVKIYATNO',
        'IDISIRSALIYE profilinde satıcıda SEVKIYATNO zorunludur'));
    } else if (!SEVKIYAT_NO_REGEX.test(sevkiyatNo.value)) {
      errors.push(invalidFormat('supplier.additionalIdentifiers.SEVKIYATNO',
        'SE-0000000 formatı', sevkiyatNo.value));
    }

    input.lines?.forEach((line, i) => {
      const etiketNo = line.item?.additionalItemIdentifications?.find(a => a.schemeId === 'ETIKETNO');
      if (!etiketNo || !isNonEmpty(etiketNo.value)) {
        errors.push(profileRequirement('IDISIRSALIYE', `lines[${i}].item.additionalItemIdentifications.ETIKETNO`,
          'IDISIRSALIYE profilinde her satırda ETIKETNO zorunludur'));
      } else if (!ETIKET_NO_REGEX.test(etiketNo.value)) {
        errors.push(invalidFormat(`lines[${i}].item.additionalItemIdentifications.ETIKETNO`,
          '2 harf + 7 rakam (9 karakter)', etiketNo.value));
      }
    });
  }

  return errors;
}

/**
 * B-85: CarrierParty VKN/TCKN format + additionalIdentifiers schemeID whitelist.
 * Schematron CommonSchematron:505-509.
 * Downstream: B-69 (PARTY_IDENTIFICATION_SCHEME_IDS aynı set kullanılır).
 */
export function validateCarrierParty(cp: CarrierPartyInput | undefined | null, path: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!cp) return errors;

  if (!isNonEmpty(cp.vknTckn)) {
    errors.push(missingField(`${path}.vknTckn`, 'Taşıyıcı firma VKN veya TCKN zorunludur'));
  } else if (cp.taxIdType === 'VKN' && !VKN_REGEX.test(cp.vknTckn)) {
    errors.push(invalidFormat(`${path}.vknTckn`, 'VKN 10 hane (numeric)', cp.vknTckn));
  } else if (cp.taxIdType === 'TCKN' && !TCKN_REGEX.test(cp.vknTckn)) {
    errors.push(invalidFormat(`${path}.vknTckn`, 'TCKN 11 hane (numeric)', cp.vknTckn));
  }

  cp.additionalIdentifiers?.forEach((id, i) => {
    if (!PARTY_IDENTIFICATION_SCHEME_IDS.has(id.schemeId)) {
      errors.push(invalidValue(`${path}.additionalIdentifiers[${i}].schemeId`,
        'PARTY_IDENTIFICATION_SCHEME_IDS listesinden', id.schemeId));
    }
  });

  return errors;
}
