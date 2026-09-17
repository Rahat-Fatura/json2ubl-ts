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
import {
  missingField,
  invalidFormat,
  invalidValue,
} from '../../ubltr/rules/validation-result';
import { CURRENCY_CODES } from '../../ubltr/vocabulary/constants';
import { isNonEmpty } from '../../utils/formatters';

/** Kur bilgisinin ZORUNLU olmadığı tek para birimi. */
const NATIONAL_CURRENCY_CODE = 'TRY';

/** `CurrencyCodeCheck` — kur en fazla 6 ondalık taşıyabilir. */
const EXCHANGE_RATE_MAX_DECIMALS = 6;

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

  // §3 Para birimi + kur.
  errors.push(...validateCurrency(input));

  // §4 Vergi düzlemi (belge + satır).
  errors.push(...validateTaxTotal(input.taxTotal, 'taxTotal'));

  // §5 Kalemler.
  if (!input.lines || input.lines.length === 0) {
    errors.push(missingField('lines', 'En az bir makbuz kalemi zorunludur'));
  } else {
    input.lines.forEach((line, i) => {
      const at = `lines[${i}]`;
      if (!isNonEmpty(line.id)) {
        errors.push(missingField(`${at}.id`, 'Satır ID zorunludur'));
      } else if (!/^\d+$/.test(line.id)) {
        errors.push(invalidFormat(`${at}.id`, 'Numerik (örn: 1, 2, 3)', line.id));
      }
      if (!isNonEmpty(line.unitCode)) {
        errors.push(missingField(`${at}.unitCode`, 'Birim kodu zorunludur'));
      }
      if (!line.item || !isNonEmpty(line.item.name)) {
        errors.push(missingField(`${at}.item.name`, 'Hizmet adı zorunludur'));
      }
      errors.push(...validateTaxTotal(line.taxTotal, `${at}.taxTotal`));
    });
  }

  return errors;
}

/**
 * Para birimi + kur — şematron `CurrencyCodeCheck`.
 *
 * Dövizli e-SMM bir kenar durum DEĞİL, normatif olarak öngörülmüş bir hâldir:
 * e-Arşiv rapor şemasında `dovizKuru` V1.12'den beri ZORUNLU bir alandır.
 */
function validateCurrency(input: SelfEmployedVoucherInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const code = input.currencyCode;

  if (!isNonEmpty(code)) {
    errors.push(missingField('currencyCode', 'Para birimi (cbc:DocumentCurrencyCode) zorunludur'));
    return errors;
  }
  if (!CURRENCY_CODES.has(code)) {
    errors.push(invalidValue('currencyCode', 'CurrencyCodeList üyesi', code));
  }

  if (code === NATIONAL_CURRENCY_CODE) return errors;

  // TRY dışı → kur ZORUNLU (`CurrencyCodeCheck`: "Para birimi TRY olmayan
  // belgelerde kur bilgisi zorunludur").
  const rate = input.exchangeRate;
  if (!rate || typeof rate.calculationRate !== 'number' || !Number.isFinite(rate.calculationRate)) {
    errors.push(
      missingField(
        'exchangeRate.calculationRate',
        `Para birimi ${code} (TRY değil) — cac:PricingExchangeRate/cbc:CalculationRate zorunludur`,
      ),
    );
    return errors;
  }

  if (rate.calculationRate <= 0) {
    errors.push(invalidValue('exchangeRate.calculationRate', '> 0', String(rate.calculationRate)));
  }
  if (decimalPlaces(rate.calculationRate) > EXCHANGE_RATE_MAX_DECIMALS) {
    errors.push(
      invalidFormat(
        'exchangeRate.calculationRate',
        `en fazla ${EXCHANGE_RATE_MAX_DECIMALS} ondalık basamak`,
        String(rate.calculationRate),
      ),
    );
  }
  if (isNonEmpty(rate.sourceCurrencyCode) && rate.sourceCurrencyCode !== code) {
    errors.push(
      invalidValue('exchangeRate.sourceCurrencyCode', code, rate.sourceCurrencyCode),
    );
  }
  if (isNonEmpty(rate.targetCurrencyCode) && rate.targetCurrencyCode !== NATIONAL_CURRENCY_CODE) {
    errors.push(
      invalidValue('exchangeRate.targetCurrencyCode', NATIONAL_CURRENCY_CODE, rate.targetCurrencyCode),
    );
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

/** Ondalık basamak sayısı — float artefaktına karşı 12 basamakta sabitlenir. */
function decimalPlaces(value: number): number {
  const text = value.toFixed(12).replace(/0+$/, '');
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}
