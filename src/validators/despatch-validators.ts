import type { ValidationError } from '../errors/ubl-build-error';
import type { DespatchInput, CarrierPartyInput } from '../types/despatch-input';
import { DespatchProfileId, DespatchTypeCode } from '../types/enums';
import {
  DATE_REGEX, TIME_REGEX,
  POSTAL_ZONE_REGEX, SEVKIYAT_NO_REGEX, ETIKET_NO_REGEX,
  LICENSE_PLATE_SCHEME_IDS, TCKN_REGEX, VKN_REGEX,
  PARTY_IDENTIFICATION_SCHEME_IDS,
  FOREIGN_LICENSE_PLATE_SCHEME_IDS,
  TR_LICENSE_PLATE_REGEX, FOREIGN_LICENSE_PLATE_REGEX,
} from '../config/constants';
import { validateParty } from './common-validators';
import { missingField, invalidFormat, invalidValue, profileRequirement } from './validation-result';
import { isNonEmpty } from '../utils/formatters';
import { runFieldBindings } from './rules/field-rule';
import { despatchHeaderBindings } from './rules/header-bindings';

/**
 * Doğrulamanın koştuğu AŞAMA.
 *
 * 🔴 NEDEN VAR: belge numarası (`cbc:ID`) belgenin KENDİSİNDEN gelmez — gönderim
 * anında seri/numara motoru (mimkit) verir. Form hâlâ düzenlenirken numara BOŞ
 * OLMALIDIR; o aşamada "numara zorunludur" demek kullanıcıya kapatamayacağı bir
 * hata göstermektir.
 *
 * Fatura katmanı bu ayrımı MODÜL DÜZEYİNDE yapıyor: `InvoiceSession` yalnız
 * `validators/simple-*` ailesini koşar ve o ailede numara kuralı HİÇ YOKTUR;
 * numara kuralı ham `validateCommon`dadır ve yalnız `InvoiceBuilder.build`
 * yolundan geçer. İrsaliyede tek doğrulayıcı modülü olduğu için aynı ayrım
 * burada AŞAMA parametresiyle yapılır — davranış faturayla aynıdır.
 *
 *   • `'document'` (VARSAYILAN) — bitmiş belge. `DespatchBuilder.build` bunu
 *     kullanır; numara ZORUNLUDUR. Eski davranış birebir korunur.
 *   • `'session'` — düzenlenmekte olan form. `DespatchSession` bunu kullanır;
 *     numaranın YOKLUĞU hata değildir, ama VARSA biçimi yine denetlenir
 *     (kullanıcı elle yanlış numara yazdıysa söylenmeli).
 */
export type DespatchValidationStage = 'document' | 'session';

export interface DespatchValidateOptions {
  /** Varsayılan `'document'` — çağrı şekli değişmeyen her çağıran eski davranışı alır. */
  stage?: DespatchValidationStage;
}

/**
 * §5 DespatchAdvice validasyonu — tüm irsaliye kuralları
 */
export function validateDespatch(
  input: DespatchInput,
  opts?: DespatchValidateOptions,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const stage = opts?.stage ?? 'document';

  /* §5.1 Künye — yüklemler ORTAK (`rules/common-field-rules.ts`), bağlama
   * tablosu irsaliyeye ait (`rules/header-bindings.ts`).
   *
   * 🔴 S3 SIKILAŞMASI: `issueDate` aralığı (B-65) bu tabloya İLK KEZ bağlandı.
   * GİB'in ORTAK kuralı olduğu hâlde irsaliye onu hiç almıyordu. */
  errors.push(...runFieldBindings(despatchHeaderBindings(stage), input));

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

    errors.push(...validateDespatchChronology(input));

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

    // Plaka schemeID + format kontrolü — LicensePlateIDSchemeIDCheck (Sprint 9)
    s.licensePlates?.forEach((lp, i) => {
      if (!LICENSE_PLATE_SCHEME_IDS.has(lp.schemeId)) {
        errors.push(invalidFormat(`shipment.licensePlates[${i}].schemeId`,
          Array.from(LICENSE_PLATE_SCHEME_IDS).join('|'), lp.schemeId));
        return; // schemeID geçersizse hangi format regex'i uygulanacağı belirsiz
      }

      const plate = lp.plateNumber?.trim() ?? '';
      const isForeign = FOREIGN_LICENSE_PLATE_SCHEME_IDS.has(lp.schemeId);
      const regex = isForeign ? FOREIGN_LICENSE_PLATE_REGEX : TR_LICENSE_PLATE_REGEX;

      if (!regex.test(plate)) {
        errors.push(invalidFormat(`shipment.licensePlates[${i}].plateNumber`,
          isForeign
            ? 'Yabancı plaka formatı (^[A-Z0-9_-]+$)'
            : 'TR plaka formatı (il kodu 01-81 + büyük harf + rakam)',
          lp.plateNumber));
      }
    });

    // LicensePlateIDCheck (Sprint 9, Schematron 20260701) — irsaliyede plaka ZORUNLU
    const hasUsablePlate = s.licensePlates?.some(
      lp => LICENSE_PLATE_SCHEME_IDS.has(lp.schemeId) && isNonEmpty(lp.plateNumber?.trim()),
    ) ?? false;
    if (!hasUsablePlate) {
      errors.push({
        code: 'DESPATCH_LICENSE_PLATE_REQUIRED',
        message: 'İrsaliyede en az bir plaka bilgisi (shipment.licensePlates) zorunludur',
        path: 'shipment.licensePlates',
        expected: 'geçerli schemeID ve boş olmayan plaka numarası ile en az 1 kayıt',
        actual: `${s.licensePlates?.length ?? 0} kayıt`,
      });
    }

    /* NOT: Burada bir zamanlar "2+ plaka → hata" kapısı vardı (S3). Kaldırıldı:
     * çoklu araç artık GERÇEKTEN destekleniyor — her plaka kendi
     * `cac:ShipmentStage`ine yazılıyor (`buildVehicleStages`). XSD'nin 1..1
     * kısıtı artık bir doğrulama kuralıyla değil, `ShipmentStageModel`in TEKİL
     * `licensePlate` alanıyla korunuyor: geçersiz şekil ARTIK TEMSİL EDİLEMİYOR.
     * Plakaların schemeID + format denetimi (yukarıda) her plaka için koşmaya
     * devam eder — şematron da `LicensePlateIDSchemeIDCheck` ile aynısını
     * aşama başına yapar (`UBL-TR_Main_Schematron.xml:515`). */

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
        'SE-0000000 veya ES-0000000 formatı', sevkiyatNo.value));
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
 * Fiili sevk anı ≥ düzenleme anı — e-İrsaliye Uygulama Kılavuzu V1.2 §10.
 *
 * Kılavuzun sözü: «Fiili sevk tarihi/zamanı düzenleme zamanı ile aynı olabileceği
 * gibi, daha ileriki bir tarih/zaman olabilir. Bununla birlikte fiili sevk zamanı,
 * bu kılavuzda açıklanan istisnai haller dışında, düzenleme zamanından ÖNCEKİ bir
 * tarih/zaman OLAMAZ.» İleri tarih SERBEST, geri tarih YASAK.
 *
 * 🔴 İSTİSNA: MATBUDAN. Matbu (kâğıt) irsaliyeden dönüştürülen belge, kâğıt
 * belgenin GEÇMİŞTE gerçekleşmiş sevkini kayda geçirir; e-belge sonradan
 * düzenlenir. Kılavuzun "istisnai haller" dediği yer tam olarak burasıdır ve
 * `examples/35-irsaliye-matbudan` bu durumu canlı taşır (sevk 04-20, düzenleme 04-23).
 *
 * ⚠️ Şematronda KARŞILIĞI YOKTUR — `DespatchDateCheck` yalnız doluluk ve biçim
 * bakar. Kural kılavuz düzeyindedir; GİB'in XML kapısından geçen bir belge yine de
 * VUK açısından hatalı olabilir. Bu yüzden kapı BİZDE.
 *
 * Karşılaştırma yalnız İKİ TARAF DA GEÇERLİ BİÇİMDEYKEN yapılır: biçim hatası
 * zaten kendi hatasını üretti, üstüne ikinci (ve yanıltıcı) bir hata eklenmez.
 */
function validateDespatchChronology(input: DespatchInput): ValidationError[] {
  if (input.despatchTypeCode === DespatchTypeCode.MATBUDAN) return [];

  const s = input.shipment;
  if (!s) return [];

  if (!DATE_REGEX.test(input.issueDate ?? '')) return [];
  if (!DATE_REGEX.test(s.actualDespatchDate ?? '')) return [];

  /* Saatler biçimsiz/eksikse tarih karşılaştırması yine de anlamlıdır: aynı günde
   * saat bilinmiyorsa "geri tarihli" diyemeyiz, farklı günde ise zaten tarih karar
   * verir. Bu yüzden saat yalnız AYNI GÜN dalında kullanılır. */
  const issueTime = TIME_REGEX.test(input.issueTime ?? '') ? input.issueTime : undefined;
  const despatchTime = TIME_REGEX.test(s.actualDespatchTime ?? '') ? s.actualDespatchTime : undefined;

  const isBackdated = s.actualDespatchDate < input.issueDate
    || (s.actualDespatchDate === input.issueDate
      && issueTime !== undefined
      && despatchTime !== undefined
      && despatchTime < issueTime);

  if (!isBackdated) return [];

  return [{
    code: 'DESPATCH_ACTUAL_BEFORE_ISSUE',
    message: 'Fiili sevk zamanı, irsaliyenin düzenleme zamanından önce olamaz '
      + '(e-İrsaliye Uygulama Kılavuzu §10). İleri tarih serbesttir; geriye dönük '
      + 'sevk yalnızca MATBUDAN dönüşümünde mümkündür.',
    path: 'shipment.actualDespatchDate',
    expected: `>= ${input.issueDate}${issueTime ? ` ${issueTime}` : ''}`,
    actual: `${s.actualDespatchDate}${despatchTime ? ` ${despatchTime}` : ''}`,
  }];
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
