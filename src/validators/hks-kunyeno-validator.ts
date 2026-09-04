/**
 * HKS profili KUNYENO kontrolü — simple-input katmanı.
 *
 * GİB'in HKS (Hal Kayıt Sistemi) profili için TEK belge kısıtı şudur:
 *
 *   `ProfileID='HKS'` iken HER `cac:InvoiceLine` elemanı, `schemeID='KUNYENO'`
 *   olan ve tam 19 karakter uzunluğunda bir `cac:Item/
 *   cac:AdditionalItemIdentification/cbc:ID` taşımalıdır.
 *
 * @see schematrons/UBL-TR_Common_Schematron.xml — HKSInvioceCheck
 *
 * Bu kuralın InvoiceInput katmanı eşleniği `profile-validators.ts`
 * (`validateHks`) içinde zaten var; ancak o YALNIZ `validationLevel='strict'`
 * altında çalışıyor. InvoiceSession/UI akışı kuralı 4.1.2'ye kadar hiç
 * görmüyordu — KUNYENO'suz HKS faturası sessizce üretilip GİB'de reddediliyordu.
 * Mesajlar bilinçli olarak `validateHks` ile aynı sözcüklerle kurulur; iki
 * katman aynı ihlali aynı dille anlatsın.
 */

import type { SimpleInvoiceInput } from '../calculator/simple-types';
import type { ValidationError } from '../errors/ubl-build-error';
import { InvoiceProfileId } from '../types/enums';
import { profileRequirement } from './validation-result';

/** Şematron `string-length(...) = 19` — uzunluk şartı kimliğin kendisi kadar bağlayıcı */
const KUNYENO_LENGTH = 19;

/** `schemeID` değeri — UBL-TR kod listesi `AdditionalItemIdentificationIDType` */
const KUNYENO_SCHEME_ID = 'KUNYENO';

export function validateHksKunyeNo(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.profile !== InvoiceProfileId.HKS) {
    return errors;
  }

  input.lines.forEach((line, i) => {
    const kunyeNo = line.additionalItemIdentifications?.find(
      a => a.schemeId === KUNYENO_SCHEME_ID,
    );

    // Şematron `normalize-space` ile ölçüyor → baş/son boşluk uzunluğa sayılmaz
    const value = kunyeNo?.value?.trim() ?? '';

    if (value === '') {
      errors.push(profileRequirement(InvoiceProfileId.HKS,
        `lines[${i}].additionalItemIdentifications`,
        `HKS profilinde her satırda KUNYENO zorunludur (satır ${i + 1}: ${line.name})`));
    } else if (value.length !== KUNYENO_LENGTH) {
      errors.push(profileRequirement(InvoiceProfileId.HKS,
        `lines[${i}].additionalItemIdentifications.KUNYENO`,
        `KUNYENO ${KUNYENO_LENGTH} karakter olmalıdır `
        + `(satır ${i + 1}: ${line.name} — gelen: ${value.length})`));
    }
  });

  return errors;
}
