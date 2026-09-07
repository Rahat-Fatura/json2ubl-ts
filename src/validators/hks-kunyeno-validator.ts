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
 * ── 🔴 ŞEMATRON SATIR-BAZLI DEĞİL, SAYIM-BAZLI (bilinçli olarak ONDAN KATIYIZ)
 * Kuralın asıl testi şudur:
 *   count(… cbc:ID[@schemeID='KUNYENO' and string-length(…)=19]) = count(cac:InvoiceLine)
 * Yani belge GENELİNDEKİ geçerli künye SAYISI ile SATIR SAYISI eşitse geçer.
 * Bu bir sayım deliğidir: 1. satırda İKİ künye + 2. satırda HİÇ künye olan belge
 * 2 = 2 verir ve şematrondan GEÇER — oysa 2. satır künyesizdir. Canlı sonda
 * doğrulandı (xslt-service :8081, paket 20260701): böyle bir belge 0 ihlalle
 * yeşil döndü.
 *
 * Bu doğrulayıcı şematronun deliğini KAPATIR: SATIR BAŞINA TAM BİR künye arar.
 *   0 künye  → hata (şematron da yakalar)
 *   2+ künye → hata (şematron YAKALAMAZ; hal kaydında bir kalem = bir künye)
 * Katı olmak GİB'e ters düşmez — şematronu geçen her belge kümesinin ALT
 * kümesini üretiriz; tersi (gevşek olmak) GİB'de reddedilecek belge üretirdi.
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
    /* `find` DEĞİL `filter`: şematronun sayım deliğini kapatmak için satırdaki
     * TÜM künyeleri görmemiz gerekiyor (bkz. dosya başlığı). Boş/whitespace
     * değerler künye SAYILMAZ — şematron da `normalize-space` uzunluğuna bakar,
     * yani boş bir cbc:ID onun sayımına girmez. */
    const kunyeNos = (line.additionalItemIdentifications ?? []).filter(
      a => a.schemeId === KUNYENO_SCHEME_ID && (a.value?.trim() ?? '') !== '',
    );

    if (kunyeNos.length === 0) {
      errors.push(profileRequirement(InvoiceProfileId.HKS,
        `lines[${i}].additionalItemIdentifications`,
        `HKS profilinde her satırda KUNYENO zorunludur (satır ${i + 1}: ${line.name})`));
      return;
    }

    if (kunyeNos.length > 1) {
      /* Hal kaydında bir kalem = bir künye. Birden fazlası şematronun SAYIM
       * eşitliğini başka bir satırın eksiğiyle "dengeleyebilir" ve belge yeşil
       * görünürken künyesiz satır taşır. */
      errors.push(profileRequirement(InvoiceProfileId.HKS,
        `lines[${i}].additionalItemIdentifications`,
        `HKS profilinde her satırda YALNIZ BİR KUNYENO bulunmalıdır `
        + `(satır ${i + 1}: ${line.name} — gelen: ${kunyeNos.length} adet)`));
      return;
    }

    // Şematron `normalize-space` ile ölçüyor → baş/son boşluk uzunluğa sayılmaz
    const value = kunyeNos[0].value.trim();

    if (value.length !== KUNYENO_LENGTH) {
      errors.push(profileRequirement(InvoiceProfileId.HKS,
        `lines[${i}].additionalItemIdentifications.KUNYENO`,
        `KUNYENO ${KUNYENO_LENGTH} karakter olmalıdır `
        + `(satır ${i + 1}: ${line.name} — gelen: ${value.length})`));
    }
  });

  return errors;
}
