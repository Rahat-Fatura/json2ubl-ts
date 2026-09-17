/**
 * Para birimi + kur kapısı — ŞEMATRON `CurrencyCodeCheck`in TEK uygulaması.
 *
 * ── NİYE ORTAK ─────────────────────────────────────────────────────────────
 * Kural GİB'in ORTAK (`Common_Schematron`) kuralıdır: "Para birimi TRY olmayan
 * belgelerde kur bilgisi zorunludur." Belge türüne göre DEĞİŞMEZ — e-SMM'de de
 * e-MM'de de aynı metin, aynı eşik, aynı 6 ondalık sınırı. CANLI ÖLÇÜLDÜ
 * (2026-09-17, :8081): `CreditNote` kökünde de birebir aynı assert patlıyor
 * (`konum: /*[local-name()='CreditNote']`), yani kural köke bağlı değil.
 *
 * Bu dosya var olmasaydı e-MM katmanı e-SMM'in `validateCurrency` gövdesini
 * kopyalayacaktı. `issue-date-range`in irsaliyeyi yıllarca atlamasının sebebi
 * tam olarak bu kopyalama refleksiydi: ortak bir kuralın iki kopyası, birinde
 * yapılan düzeltmenin diğerine GEÇMEMESİ demektir.
 *
 * ── NE BURAYA GİRMEZ ───────────────────────────────────────────────────────
 * Belgeye ÖZGÜ kur kararları (kurun hangi alandan okunacağı, hangi belge
 * türünde kurun opsiyonel sayılacağı) çağıranda kalır; burası yalnız "TRY
 * değilse kur ZORUNLU ve şu biçimde" der.
 */

import type { ExchangeRateInput } from '../../../types/common';
import type { ValidationError } from '../../../errors/ubl-build-error';
import { missingField, invalidFormat, invalidValue } from '../validation-result';
import { CURRENCY_CODES } from '../../vocabulary/constants';
import { isNonEmpty } from '../../../utils/formatters';

/** Kur bilgisinin ZORUNLU olmadığı tek para birimi. */
export const NATIONAL_CURRENCY_CODE = 'TRY';

/** `CurrencyCodeCheck` — kur en fazla 6 ondalık taşıyabilir. */
export const EXCHANGE_RATE_MAX_DECIMALS = 6;

/** Doğrulanacak belgenin kur ekseni — belge tipinden BAĞIMSIZ iki alan. */
export interface CurrencyBearingDocument {
  /** `cbc:DocumentCurrencyCode`. */
  currencyCode: string;
  /** `cac:PricingExchangeRate` — TRY dışı belgede ZORUNLU. */
  exchangeRate?: ExchangeRateInput;
}

/**
 * Para birimi + kur doğrulaması.
 *
 * @param doc Kur ekseni taşıyan belge (e-SMM / e-MM / gelecek türler).
 * @param currencyPath Hata yolunda kullanılacak alan adı — çağıranın girdi
 *   şekli farklı isimlendirebilir; hata mesajı tüketicinin gördüğü yolu
 *   göstermelidir, kütüphanenin iç adını değil.
 */
export function validateDocumentCurrency(
  doc: CurrencyBearingDocument,
  currencyPath: string = 'currencyCode',
  exchangeRatePath: string = 'exchangeRate',
): ValidationError[] {
  const errors: ValidationError[] = [];
  const code = doc.currencyCode;

  if (!isNonEmpty(code)) {
    errors.push(missingField(currencyPath, 'Para birimi (cbc:DocumentCurrencyCode) zorunludur'));
    return errors;
  }
  if (!CURRENCY_CODES.has(code)) {
    errors.push(invalidValue(currencyPath, 'CurrencyCodeList üyesi', code));
  }

  if (code === NATIONAL_CURRENCY_CODE) return errors;

  // TRY dışı → kur ZORUNLU (`CurrencyCodeCheck`).
  const rate = doc.exchangeRate;
  if (!rate || typeof rate.calculationRate !== 'number' || !Number.isFinite(rate.calculationRate)) {
    errors.push(
      missingField(
        `${exchangeRatePath}.calculationRate`,
        `Para birimi ${code} (TRY değil) — cac:PricingExchangeRate/cbc:CalculationRate zorunludur`,
      ),
    );
    return errors;
  }

  if (rate.calculationRate <= 0) {
    errors.push(
      invalidValue(`${exchangeRatePath}.calculationRate`, '> 0', String(rate.calculationRate)),
    );
  }
  if (decimalPlaces(rate.calculationRate) > EXCHANGE_RATE_MAX_DECIMALS) {
    errors.push(
      invalidFormat(
        `${exchangeRatePath}.calculationRate`,
        `en fazla ${EXCHANGE_RATE_MAX_DECIMALS} ondalık basamak`,
        String(rate.calculationRate),
      ),
    );
  }
  if (isNonEmpty(rate.sourceCurrencyCode) && rate.sourceCurrencyCode !== code) {
    errors.push(invalidValue(`${exchangeRatePath}.sourceCurrencyCode`, code, rate.sourceCurrencyCode));
  }
  if (isNonEmpty(rate.targetCurrencyCode) && rate.targetCurrencyCode !== NATIONAL_CURRENCY_CODE) {
    errors.push(
      invalidValue(
        `${exchangeRatePath}.targetCurrencyCode`,
        NATIONAL_CURRENCY_CODE,
        rate.targetCurrencyCode,
      ),
    );
  }

  return errors;
}

/** Ondalık basamak sayısı — float artefaktına karşı 12 basamakta sabitlenir. */
export function decimalPlaces(value: number): number {
  const text = value.toFixed(12).replace(/0+$/, '');
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}
