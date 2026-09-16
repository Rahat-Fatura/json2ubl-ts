import type { TaxTotalInput, TaxSubtotalInput, WithholdingTaxTotalInput, WithholdingTaxSubtotalInput } from '../types/common';
import {
  cbcOptionalTag,
  cbcOptionalAmountTag,
  cbcRequiredTag,
  joinLines,
} from '../utils/xml-helpers';
import { formatDecimal, formatDecimalRange } from '../utils/formatters';
import {
  TAX_TOTAL_SEQ,
  TAX_SUBTOTAL_SEQ,
  TAX_CATEGORY_SEQ,
  TAX_SCHEME_SEQ,
  emitInOrder,
} from './xsd-sequence';

/** TaxTotal → XML fragment. Sequence: TAX_TOTAL_SEQ (TaxAmount → TaxSubtotal). */
export function serializeTaxTotal(tt: TaxTotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(TAX_TOTAL_SEQ, {
    TaxAmount: () => `${i2}${cbcOptionalAmountTag('TaxAmount', tt.taxAmount, currencyCode)}`,
    TaxSubtotal: () => joinLines(tt.taxSubtotals.map(ts => serializeTaxSubtotal(ts, currencyCode, i2))),
  });
  return joinLines([`${indent}<cac:TaxTotal>`, ...inner, `${indent}</cac:TaxTotal>`]);
}

/**
 * TaxSubtotal → XML fragment.
 * B-09 fix: TaxExemptionReasonCode/Reason artık TaxCategory altında (TaxSubtotal altında DEĞİL).
 * Sequence: TAX_SUBTOTAL_SEQ.
 */
export function serializeTaxSubtotal(ts: TaxSubtotalInput, currencyCode: string, indent: string = ''): string {
  const inner = emitInOrder(TAX_SUBTOTAL_SEQ, {
    TaxableAmount: () => cbcOptionalAmountTag('TaxableAmount', ts.taxableAmount, currencyCode),
    TaxAmount: () => cbcOptionalAmountTag('TaxAmount', ts.taxAmount, currencyCode),
    CalculationSequenceNumeric: () =>
      ts.calculationSequenceNumeric !== undefined
        ? cbcOptionalTag('CalculationSequenceNumeric', String(ts.calculationSequenceNumeric))
        : '',
    // KDV (ve diğer hesaplanan vergi) oranı SABİT 2 basamakta BIRAKILDI.
    // Gerekçe: şematronda `TaxTotal/.../cbc:Percent` için HİÇBİR kural yok —
    // `decimalCheck` bu bağlama uygulanmaz (yalnız 6 parasal bağlam), tek
    // Percent kuralı tevkifata özgü `WithholdingTaxTotalCheck`'tir. Yani
    // "18.00" biçimi geçerlidir. Tevkifattaki ondalıksız yazım bir ÜSLUP
    // tercihi değil, kod-listesi eşleşme ZORUNLULUĞUDUR (bkz. aşağıda
    // `serializeWithholdingSubtotal`) — iki alan bu yüzden bilerek farklı
    // biçimlenir; burayı değiştirmek hiçbir uyum sorununu çözmez, yalnızca
    // yerleşik çıktıyı kırardı.
    Percent: () =>
      ts.percent !== undefined ? cbcOptionalTag('Percent', formatDecimal(ts.percent, 2)) : '',
    TaxCategory: () => serializeTaxCategory(ts, indent + '  '),
  });

  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxSubtotal>`, body, `${indent}</cac:TaxSubtotal>`].filter(Boolean).join('\n');
}

/**
 * TaxCategory → XML fragment.
 * B-09 fix: TaxExemptionReasonCode/Reason burada (TaxSubtotal altından taşındı).
 * Sequence: TAX_CATEGORY_SEQ.
 */
function serializeTaxCategory(ts: TaxSubtotalInput, indent: string): string {
  const inner = emitInOrder(TAX_CATEGORY_SEQ, {
    TaxExemptionReasonCode: () => cbcOptionalTag('TaxExemptionReasonCode', ts.taxExemptionReasonCode),
    TaxExemptionReason: () => cbcOptionalTag('TaxExemptionReason', ts.taxExemptionReason),
    TaxScheme: () => serializeTaxScheme(ts.taxTypeCode, ts.taxTypeName, indent + '  '),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxCategory>`, body, `${indent}</cac:TaxCategory>`].filter(Boolean).join('\n');
}

/** TaxScheme → XML fragment. Sequence: TAX_SCHEME_SEQ. TaxTypeCode zorunlu. */
function serializeTaxScheme(taxTypeCode: string, taxTypeName: string | undefined, indent: string): string {
  const inner = emitInOrder(TAX_SCHEME_SEQ, {
    Name: () => cbcOptionalTag('Name', taxTypeName),
    TaxTypeCode: () => cbcRequiredTag('TaxTypeCode', taxTypeCode, 'TaxScheme'),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxScheme>`, body, `${indent}</cac:TaxScheme>`].filter(Boolean).join('\n');
}

/** WithholdingTaxTotal → XML fragment (UBL-TR). Sequence: TAX_TOTAL_SEQ (aynı `TaxTotalType`). */
export function serializeWithholdingTaxTotal(wtt: WithholdingTaxTotalInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(TAX_TOTAL_SEQ, {
    TaxAmount: () => `${i2}${cbcOptionalAmountTag('TaxAmount', wtt.taxAmount, currencyCode)}`,
    TaxSubtotal: () =>
      joinLines(wtt.taxSubtotals.map(ts => serializeWithholdingSubtotal(ts, currencyCode, i2))),
  });
  return joinLines([`${indent}<cac:WithholdingTaxTotal>`, ...inner, `${indent}</cac:WithholdingTaxTotal>`]);
}

/**
 * WithholdingTaxSubtotal → XML fragment.
 *
 * 🔴 4.1.0 — `cbc:Percent` ONDALIKSIZ yazılır (eskiden `formatDecimal(p, 2)`
 * ile "90.00" üretiliyordu ve belge GİB kapısında REDDEDİLİYORDU).
 *
 * Kural (`UBL-TR_Common_Schematron.xml:312`, `WithholdingTaxTotalCheck`):
 *   contains($WithholdingTaxTypeWithPercent,
 *            concat(',', cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode, cbc:Percent, ','))
 *
 * Yani kod ile oran BİTİŞİK olarak tek bir anahtara çevrilip kod listesinde
 * aranıyor. Liste (`UBL-TR_Codelist.xml:17`) tamamen ondalıksızdır:
 *   ,60130,60140,60290,...,60690,...,801100,802100,...
 * `606` + `90` → `,60690,` ✅   ·   `606` + `90.00` → `,60690.00,` ❌
 *
 * Canlı kanıt (şematron paketi 20260701):
 *   "Uyumsuz vergi tipi yüzdesi: '606' vergi tipinin yüzdesi '90.00' olamaz"
 *
 * Listedeki oranların tamamı tam sayı olduğundan min=0 seçildi; float
 * artefaktına karşı önce 6 basamağa sabitlenip fazlalık sıfırlar kırpılır.
 */
function serializeWithholdingSubtotal(ts: WithholdingTaxSubtotalInput, currencyCode: string, indent: string): string {
  const inner = emitInOrder(TAX_SUBTOTAL_SEQ, {
    TaxableAmount: () => cbcOptionalAmountTag('TaxableAmount', ts.taxableAmount, currencyCode),
    TaxAmount: () => cbcOptionalAmountTag('TaxAmount', ts.taxAmount, currencyCode),
    Percent: () => cbcOptionalTag('Percent', formatDecimalRange(ts.percent, 0, 6)),
    TaxCategory: () => {
      const cat = emitInOrder(TAX_CATEGORY_SEQ, {
        TaxScheme: () => serializeTaxScheme(ts.taxTypeCode, ts.taxTypeName, indent + '    '),
      });
      const body = joinLines(cat.map(s => indent + '    ' + s));
      return [`${indent}  <cac:TaxCategory>`, body, `${indent}  </cac:TaxCategory>`].filter(Boolean).join('\n');
    },
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:TaxSubtotal>`, body, `${indent}</cac:TaxSubtotal>`].filter(Boolean).join('\n');
}

