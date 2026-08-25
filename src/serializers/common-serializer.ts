import { cbcOptionalTag, cbcOptionalAmountTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import type { AllowanceChargeInput, PeriodInput } from '../types/common';
import { formatDecimalRange } from '../utils/formatters';
import { ALLOWANCE_CHARGE_SEQ, PERIOD_SEQ, emitInOrder } from './xsd-sequence';

/**
 * AllowanceCharge → XML fragment.
 * Sequence: ALLOWANCE_CHARGE_SEQ. B-12 fix: Reason, ChargeIndicator hemen SONRASI.
 */
export function serializeAllowanceCharge(ac: AllowanceChargeInput, currencyCode: string, indent: string = ''): string {
  const inner = emitInOrder(ALLOWANCE_CHARGE_SEQ, {
    ChargeIndicator: () => cbcRequiredTag('ChargeIndicator', ac.chargeIndicator ? 'true' : 'false', 'AllowanceCharge'),
    AllowanceChargeReason: () => cbcOptionalTag('AllowanceChargeReason', ac.reason),
    // 🔴 4.1.0 — İSKONTO ORANI hassasiyeti düzeltildi.
    //
    // Eskiden `formatDecimal(x, 1)` idi; SABİT 1 basamak oranı sessizce
    // bozuyordu ve `Amount`/`BaseAmount` doğru kaldığı için belge KENDİ
    // İÇİNDE tutarsızlaşıyordu (oran × taban ≠ tutar):
    //   %15   → 0.15  → "0.1"   ·  %12,5 → 0.125 → "0.1"
    //   %5    → 0.05  → "0.1"   ·  %1    → 0.01  → "0.0"
    //   %3    → 0.03  → "0.0"
    //
    // Şematronda `cbc:MultiplierFactorNumeric` HİÇ geçmez (iki dosyada da
    // sıfır eşleşme) → format serbest. max=4 ile %0,01'e kadar iskonto
    // ifade edilebilir; min=1 mevcut tek-basamaklı çıktıyı korur
    // (0.1 → "0.1"), fazlalık sıfır yazılmaz (0.15 → "0.15").
    MultiplierFactorNumeric: () =>
      ac.multiplierFactorNumeric !== undefined
        ? cbcOptionalTag('MultiplierFactorNumeric', formatDecimalRange(ac.multiplierFactorNumeric, 1, 4))
        : '',
    Amount: () => cbcOptionalAmountTag('Amount', ac.amount, currencyCode),
    BaseAmount: () =>
      ac.baseAmount !== undefined ? cbcOptionalAmountTag('BaseAmount', ac.baseAmount, currencyCode) : '',
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:AllowanceCharge>`, body, `${indent}</cac:AllowanceCharge>`].join('\n');
}

/** InvoicePeriod → XML fragment. Sequence: PERIOD_SEQ. */
export function serializePeriod(period: PeriodInput, indent: string = ''): string {
  const inner = emitInOrder(PERIOD_SEQ, {
    StartDate: () => cbcOptionalTag('StartDate', period.startDate),
    StartTime: () => cbcOptionalTag('StartTime', period.startTime),
    EndDate: () => cbcOptionalTag('EndDate', period.endDate),
    EndTime: () => cbcOptionalTag('EndTime', period.endTime),
    Description: () => cbcOptionalTag('Description', period.description),
  });
  if (inner.length === 0) return '';
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:InvoicePeriod>`, body, `${indent}</cac:InvoicePeriod>`].join('\n');
}
