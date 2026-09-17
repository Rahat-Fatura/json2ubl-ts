/**
 * e-SMM doğrulama kapıları.
 *
 * ── NE BURADA, NE ORTAK KATMANDA ───────────────────────────────────────────
 * Künye yüklemleri (`documentIdRule`, `uuidRule`, `issueDateRangeRule` …)
 * `ubltr/rules/global`ta yaşar ve buraya BAĞLANIR (`bindings.ts`). Taraf
 * kuralları `ubltr/rules/shared/common-validators`tan gelir. Bu dosyada yalnız
 * **e-SMM'e ÖZGÜ** kurallar durur; ortak bir kural buraya yazılırsa diğer belge
 * türleri onu alamaz — `issue-date-range`in irsaliyeyi yıllarca atlamasının
 * sebebi tam olarak buydu.
 *
 * ── ORTAK KAPILAR BURADA GÖVDE TUTMAZ ──────────────────────────────────────
 * Para birimi/kur (`validateDocumentCurrency`) ve kalem kimliği
 * (`validateLineIdentity`) e-MM ile BİREBİR aynıydı; ikisi de
 * `ubltr/rules/shared/` altına indi. Burada kalan tek belge-özgü kapı VERGİ
 * DÜZLEMİDİR — kod kümesi (`{0003, 0015, 9015}`) e-SMM'e aittir ve ortak
 * katmana çıksaydı diğer belgelere SIZARDI.
 *
 * ── YANLIŞLIKLA REDDETMEME DİSİPLİNİ ───────────────────────────────────────
 * Aşağıdaki "kurallar" BİLEREK YOKTUR; üçü de ölçülüp dayanaksız bulundu:
 *  • `PaymentMeans` zorunluluğu — 12 gerçek prod belgenin **0**'ında var.
 *  • "0003 yalnız belge düzeyinde olur" — dayanaksız; satır düzlemi açıktır.
 *  • "7 gün içinde düzenlenir" — VUK 236/237 tahsilat ANINDA düzenlenmeyi söyler,
 *    7 gün kuralı e-SMM'de YOKTUR (fatura kuralının yanlış taşınması olurdu).
 * Ayrıca satıcı `cac:Person`a KİLİTLENMEZ: adi/kollektif ortaklık ve noter
 * VKN'li olabilir.
 */

import type { ValidationError } from '../../errors/ubl-build-error';
import type {
  SelfEmployedVoucherInput,
  SelfEmployedVoucherTaxTotalInput,
} from './input';
import {
  SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES,
  VAT_CODE,
  VAT_WITHHOLDING_CODE,
} from './input';
import type { SelfEmployedVoucherValidationStage } from './bindings';
import { selfEmployedVoucherHeaderBindings } from './bindings';
import { runFieldBindings } from '../../ubltr/rules/field-rule';
import { validateParty } from '../../ubltr/rules/shared/common-validators';
import { validateDocumentCurrency } from '../../ubltr/rules/shared/currency-rules';
import { validateLineIdentity } from '../../ubltr/rules/shared/line-rules';
import { missingField, invalidValue } from '../../ubltr/rules/validation-result';
import { isNonEmpty } from '../../utils/formatters';

export interface SelfEmployedVoucherValidateOptions {
  /** Varsayılan `'document'` — çağrı şekli değişmeyen her çağıran eski davranışı alır. */
  stage?: SelfEmployedVoucherValidationStage;
}

/** e-SMM doğrulaması — tüm kapılar. */
export function validateSelfEmployedVoucher(
  input: SelfEmployedVoucherInput,
  opts?: SelfEmployedVoucherValidateOptions,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const stage = opts?.stage ?? 'document';

  // §1 Künye — yüklemler ORTAK, bağlama tablosu e-SMM'e ait.
  errors.push(...runFieldBindings(selfEmployedVoucherHeaderBindings(stage), input));

  // §2 Taraflar — ortak `validateParty` (VKN/TCKN + adres + schemeID whitelist).
  errors.push(...validateParty(input.supplier, 'supplier'));
  errors.push(...validateParty(input.customer, 'customer'));

  /* §3 Para birimi + kur — ORTAK kapı (`CurrencyCodeCheck`). Gövde
   * `ubltr/rules/shared/currency-rules.ts`tedir; e-MM ile PAYLAŞILIR. */
  errors.push(...validateDocumentCurrency(input));

  // §4 Vergi düzlemi (belge + satır).
  errors.push(...validateTaxTotal(input.taxTotal, 'taxTotal'));

  // §5 Kalemler.
  if (!input.lines || input.lines.length === 0) {
    errors.push(missingField('lines', 'En az bir makbuz kalemi zorunludur'));
  } else {
    input.lines.forEach((line, i) => {
      const at = `lines[${i}]`;
      // Kimlik üçlüsü (numerik ID · birim kodu · ad) ORTAK — bkz. `line-rules.ts`.
      errors.push(...validateLineIdentity(line, at, 'Hizmet adı'));
      // Vergi düzlemi e-SMM'e ÖZGÜ — ortak katmana ÇIKMAZ (kod kümesi belgeye ait).
      errors.push(...validateTaxTotal(line.taxTotal, `${at}.taxTotal`));
    });
  }

  return errors;
}

/**
 * Vergi düzlemi kapısı.
 *
 * 1. **Kod kümesi** — `{0003, 0015, 9015}`. Tip düzeyinde zaten daraltıldı;
 *    bu kapı JS çağıranı (tip denetimi olmayan tüketici) için VAR.
 * 2. **İstisna** — şematron `TaxExemptionReasonCheck`: `TaxAmount = 0` ve
 *    `TaxTypeCode = '0015'` ise `cac:TaxCategory/cbc:TaxExemptionReason` DOLU
 *    olmalıdır. ⚠️ Kural METNİ (`Reason`) ister, kodu değil — kod tek başına
 *    belgeyi geçirmez. Üretimde kullanılan kod `351`'dir.
 * 3. **9015 ⇒ 0015** — KDV'si olmayan bir belgede KDV tevkifatı anlamsızdır;
 *    9015'in matrahı hesaplanan KDV'dir (bkz. `TaxDefinition.baseIsCalculatedVat`).
 */
function validateTaxTotal(
  taxTotal: SelfEmployedVoucherTaxTotalInput | undefined,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!taxTotal) {
    errors.push(missingField(path, 'Vergi toplamı (cac:TaxTotal) zorunludur'));
    return errors;
  }
  if (!taxTotal.taxSubtotals || taxTotal.taxSubtotals.length === 0) {
    errors.push(missingField(`${path}.taxSubtotals`, 'En az bir cac:TaxSubtotal zorunludur'));
    return errors;
  }

  let hasVat = false;
  let hasVatWithholding = false;

  taxTotal.taxSubtotals.forEach((ts, i) => {
    const at = `${path}.taxSubtotals[${i}]`;

    if (!SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES.includes(ts.taxTypeCode)) {
      errors.push(
        invalidValue(
          `${at}.taxTypeCode`,
          SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES.join('|'),
          String(ts.taxTypeCode),
        ),
      );
      return;
    }

    if (ts.taxTypeCode === VAT_CODE) {
      hasVat = true;
      if (ts.taxAmount === 0 && !isNonEmpty(ts.taxExemptionReason)) {
        errors.push({
          code: 'TAX_EXEMPTION_REASON_REQUIRED',
          message:
            'Vergi tutarı 0 olan 0015 (KDV) alt toplamında cbc:TaxExemptionReason zorunludur '
            + '(şematron TaxExemptionReasonCheck). Yalnız kod yetmez — açıklama METNİ dolu olmalıdır.',
          path: `${at}.taxExemptionReason`,
          expected: 'boş olmayan istisna açıklaması',
          actual: ts.taxExemptionReason ?? '(yok)',
        });
      }
    }

    if (ts.taxTypeCode === VAT_WITHHOLDING_CODE) hasVatWithholding = true;
  });

  if (hasVatWithholding && !hasVat) {
    errors.push(
      invalidValue(
        `${path}.taxSubtotals`,
        `${VAT_WITHHOLDING_CODE} ile birlikte ${VAT_CODE} alt toplamı`,
        `yalnız ${VAT_WITHHOLDING_CODE}`,
      ),
    );
  }

  return errors;
}
