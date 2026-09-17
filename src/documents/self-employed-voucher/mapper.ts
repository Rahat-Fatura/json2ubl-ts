/**
 * `SimpleSelfEmployedVoucherInput` → `SelfEmployedVoucherInput` eşlemesi.
 *
 * ── 🔑 HESAP MOTORU YENİDEN YAZILMAZ ───────────────────────────────────────
 * Satır hesabı ORTAK `calculateLine`dan gelir. Stopaj (`0003`) ve KDV tevkifatı
 * (`9015`) oranları `SimpleLineInput.taxes[]` üzerinden motora verilir; motor
 * `0003`ü brüt ücret, `9015`i **hesaplanan KDV** üzerinden hesaplar
 * (`TaxDefinition.baseIsCalculatedVat`). Yani e-SMM'in vergi aritmetiği ayrı bir
 * kopya DEĞİL, faturayla AYNI motordur — 9015 düzeltmesi iki belgeye de aynı
 * anda uygulanır.
 *
 * Toplam zinciri ve `TaxInclusiveAmount` konvansiyonu `totals.ts`tedir; burada
 * TEKRARLANMAZ (konvansiyon tek noktadan değişebilmeli).
 *
 * ── TARAF / KALEM EŞLEMESİ DE ORTAK ────────────────────────────────────────
 * `mapSimpleParty` fatura ve irsaliyeyle PAYLAŞILIR: posta kodu uydurmama ve
 * VKN→`name` / TCKN→`Person` dersleri tip başına kopyalanmaz.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SimpleSelfEmployedVoucherInput,
  SimpleSelfEmployedVoucherLineInput,
} from './simple-input';
import type {
  SelfEmployedVoucherInput,
  SelfEmployedVoucherLineInput,
  SelfEmployedVoucherTaxSubtotalInput,
  SelfEmployedVoucherTaxTotalInput,
} from './input';
import { INCOME_TAX_WITHHOLDING_CODE, VAT_CODE, VAT_WITHHOLDING_CODE } from './input';
import { selfEmployedVoucherTotals } from './totals';
import type { SelfEmployedVoucherTotals } from './totals';
import { SelfEmployedVoucherProfileId, SelfEmployedVoucherTypeCode } from '../../types/enums';
import type {
  AdditionalDocumentInput,
  AllowanceChargeInput,
  ExchangeRateInput,
  ItemInput,
} from '../../types/common';
import type { SimpleLineInput } from '../../calculator/simple-types';
import type { CalculatedLine } from '../../calculator/line-calculator';
import { calculateLine } from '../../calculator/line-calculator';
import { configManager } from '../../calculator/config-manager';
import { DEFAULT_CURRENCY_CODE } from '../../calculator/currency-config';
import { mapSimpleParty } from '../../utils/party-mapper';
import { isNonEmpty, normalizeTime } from '../../utils/formatters';

/** Gönderim şekli referansının `DocumentTypeCode`u — eski sistemle ORTAK anahtar. */
export const SEND_METHOD_DOCUMENT_TYPE_CODE = 'EXT_SEND_METHOD';

/** Eşlemenin ara ürünü — oturum/builder katmanı toplamları da görebilsin diye açık. */
export interface CalculatedSelfEmployedVoucher {
  /** Satır başına hesap sonucu (ORTAK motordan). */
  lines: CalculatedLine[];
  /** Çözülmüş toplam zinciri (`totals.ts` konvansiyonuyla). */
  totals: SelfEmployedVoucherTotals;
}

/** Basit girdiyi HESAPLAR — XML üretmez, eşleme yapmaz. */
export function calculateSelfEmployedVoucher(
  simple: SimpleSelfEmployedVoucherInput,
): CalculatedSelfEmployedVoucher {
  const currencyCode = simple.currencyCode ?? DEFAULT_CURRENCY_CODE;
  const lines = (simple.lines ?? []).map((line, i) =>
    calculateLine(toEngineLine(line, simple), i, currencyCode),
  );

  let grossFee = 0;
  let incomeTaxWithholding = 0;
  let calculatedVat = 0;
  let vatWithholding = 0;
  let allowanceTotal = 0;

  for (const line of lines) {
    grossFee += line.lineExtensionAmount;
    allowanceTotal += line.allowanceObject.amount;
    for (const ts of line.taxes.taxSubtotals) {
      if (ts.code === INCOME_TAX_WITHHOLDING_CODE) incomeTaxWithholding += ts.amount;
      else if (ts.code === VAT_CODE) calculatedVat += ts.amount;
      else if (ts.code === VAT_WITHHOLDING_CODE) vatWithholding += ts.amount;
    }
  }

  return {
    lines,
    totals: selfEmployedVoucherTotals({
      grossFee,
      incomeTaxWithholding,
      calculatedVat,
      vatWithholding,
      allowanceTotal,
    }),
  };
}

/** Basit girdiyi hesaplar ve ham `SelfEmployedVoucherInput`a çevirir. */
export function mapSimpleToSelfEmployedVoucherInput(
  simple: SimpleSelfEmployedVoucherInput,
  precomputed?: CalculatedSelfEmployedVoucher,
): SelfEmployedVoucherInput {
  const calc = precomputed ?? calculateSelfEmployedVoucher(simple);
  const currencyCode = simple.currencyCode ?? DEFAULT_CURRENCY_CODE;

  const now = new Date().toISOString();
  const stamp = isNonEmpty(simple.datetime) ? simple.datetime : now;
  const issueDate = stamp.substring(0, 10);
  /* Saat e-SMM'de ZORUNLU (509 VUK GT IV.4.3-c). `datetime` yalnız tarih
   * taşıyorsa "şimdi"nin saati alınır — makbuz tahsilat anında düzenlenir. */
  const rawTime = stamp.length > 10 ? stamp.substring(11, 19) : now.substring(11, 19);
  // `normalizeTime` yalnız null/undefined girdide `undefined` döner; kaynak
  // burada daima dolu bir dizgidir, yine de sözleşme dışına çıkmamak için yedekli.
  const issueTime = normalizeTime(rawTime) ?? rawTime;

  const result: SelfEmployedVoucherInput = {
    id: simple.documentNumber ?? '',
    uuid: simple.uuid ?? uuidv4(),
    profileId: SelfEmployedVoucherProfileId.EARSIVBELGE,
    voucherTypeCode: SelfEmployedVoucherTypeCode.SERBESTMESLEKMAKBUZU,
    issueDate,
    issueTime,
    currencyCode,
    supplier: mapSimpleParty(simple.supplier),
    customer: mapSimpleParty(simple.customer),
    taxTotal: buildDocumentTaxTotal(simple, calc),
    legalMonetaryTotal: {
      lineExtensionAmount: calc.totals.lineExtensionAmount,
      taxExclusiveAmount: calc.totals.taxExclusiveAmount,
      taxInclusiveAmount: calc.totals.taxInclusiveAmount,
      allowanceTotalAmount: calc.totals.allowanceTotalAmount,
      payableAmount: calc.totals.payableAmount,
    },
    lines: (simple.lines ?? []).map((line, i) => buildLine(line, calc.lines[i], simple)),
  };

  if (simple.notes?.length) result.notes = [...simple.notes];

  const exchangeRate = buildExchangeRate(simple, currencyCode);
  if (exchangeRate) result.exchangeRate = exchangeRate;

  const sendMethodRef = buildSendMethodReference(simple, issueDate);
  if (sendMethodRef) result.additionalDocuments = [sendMethodRef];

  return result;
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/**
 * e-SMM kalemini ORTAK hesap motorunun girdisine çevirir.
 *
 * Stopaj ve KDV tevkifatı `taxes[]` üzerinden verilir — `withholdingTaxCode`
 * DEĞİL: o yol `cac:WithholdingTaxTotal` üretir ve e-SMM'de o düzlem YASAKTIR.
 * Sıra (`0003` önce) önemsizdir: motor `9015`i KDV'den sonraya kendisi erteler.
 */
function toEngineLine(
  line: SimpleSelfEmployedVoucherLineInput,
  simple: SimpleSelfEmployedVoucherInput,
): SimpleLineInput {
  const taxes: NonNullable<SimpleLineInput['taxes']> = [];

  const incomeTaxPercent = line.incomeTaxWithholdingPercent ?? simple.incomeTaxWithholdingPercent;
  if (typeof incomeTaxPercent === 'number' && incomeTaxPercent > 0) {
    taxes.push({ code: INCOME_TAX_WITHHOLDING_CODE, percent: incomeTaxPercent });
  }

  const vatWithholdingPercent = line.vatWithholdingPercent ?? simple.vatWithholdingPercent;
  if (typeof vatWithholdingPercent === 'number' && vatWithholdingPercent > 0) {
    taxes.push({ code: VAT_WITHHOLDING_CODE, percent: vatWithholdingPercent });
  }

  return {
    name: line.name,
    quantity: line.quantity,
    price: line.price,
    unitCode: line.unitCode,
    kdvPercent: line.kdvPercent,
    allowancePercent: line.allowancePercent,
    taxes: taxes.length > 0 ? taxes : undefined,
    description: line.description,
    note: line.note,
  };
}

/** KDV istisnası — kalem önceliklidir, metin koddan çözülebilir. */
function resolveExemption(
  line: SimpleSelfEmployedVoucherLineInput,
  simple: SimpleSelfEmployedVoucherInput,
): { code?: string; reason?: string } {
  const code = line.kdvExemptionCode ?? simple.kdvExemptionCode;
  const explicitReason = line.kdvExemptionReason ?? simple.kdvExemptionReason;
  const reason = isNonEmpty(explicitReason)
    ? explicitReason
    : code
      ? configManager.getExemption(code)?.name
      : undefined;
  return { code, reason };
}

/** Hesaplanan satır → `cac:TaxTotal` (kod kümesi TİP tarafından daraltılmış). */
function buildLineTaxTotal(
  calculated: CalculatedLine,
  exemption: { code?: string; reason?: string },
): SelfEmployedVoucherTaxTotalInput {
  const taxSubtotals = calculated.taxes.taxSubtotals.map((ts): SelfEmployedVoucherTaxSubtotalInput => {
    const subtotal: SelfEmployedVoucherTaxSubtotalInput = {
      taxableAmount: ts.taxable,
      taxAmount: ts.amount,
      percent: ts.percent,
      // Motor yalnız {0003, 0015, 9015} üretebilir: `toEngineLine` başka kod koymaz.
      taxTypeCode: ts.code as SelfEmployedVoucherTaxSubtotalInput['taxTypeCode'],
      taxTypeName: ts.name,
    };
    // Şematron `TaxExemptionReasonCheck`: 0015 + TaxAmount=0 → METİN zorunlu.
    if (ts.code === VAT_CODE && ts.amount === 0) {
      subtotal.taxExemptionReasonCode = exemption.code;
      subtotal.taxExemptionReason = exemption.reason;
    }
    return subtotal;
  });

  return { taxAmount: calculated.taxes.taxTotal, taxSubtotals };
}

/**
 * Belge seviyesi `cac:TaxTotal` — kalemleri `kod + oran` ikilisine göre gruplar
 * (fatura toplayıcısıyla AYNI kural).
 */
function buildDocumentTaxTotal(
  simple: SimpleSelfEmployedVoucherInput,
  calc: CalculatedSelfEmployedVoucher,
): SelfEmployedVoucherTaxTotalInput {
  const grouped: SelfEmployedVoucherTaxSubtotalInput[] = [];

  calc.lines.forEach((calculated, i) => {
    const exemption = resolveExemption(simple.lines[i], simple);
    for (const ts of calculated.taxes.taxSubtotals) {
      const existing = grouped.find(g => g.taxTypeCode === ts.code && g.percent === ts.percent);
      if (existing) {
        existing.taxableAmount += ts.taxable;
        existing.taxAmount += ts.amount;
        continue;
      }
      const subtotal: SelfEmployedVoucherTaxSubtotalInput = {
        taxableAmount: ts.taxable,
        taxAmount: ts.amount,
        percent: ts.percent,
        taxTypeCode: ts.code as SelfEmployedVoucherTaxSubtotalInput['taxTypeCode'],
        taxTypeName: ts.name,
      };
      if (ts.code === VAT_CODE && ts.amount === 0) {
        subtotal.taxExemptionReasonCode = exemption.code;
        subtotal.taxExemptionReason = exemption.reason;
      }
      grouped.push(subtotal);
    }
  });

  return { taxAmount: calc.totals.taxTotalAmount, taxSubtotals: grouped };
}

function buildLine(
  line: SimpleSelfEmployedVoucherLineInput,
  calculated: CalculatedLine,
  simple: SimpleSelfEmployedVoucherInput,
): SelfEmployedVoucherLineInput {
  const item: ItemInput = { name: line.name };
  if (isNonEmpty(line.description)) item.description = line.description;

  const result: SelfEmployedVoucherLineInput = {
    id: String(calculated.id),
    invoicedQuantity: line.quantity,
    unitCode: calculated.unitCode,
    lineExtensionAmount: calculated.lineExtensionAmount,
    taxTotal: buildLineTaxTotal(calculated, resolveExemption(line, simple)),
    item,
    price: { priceAmount: line.price },
  };

  if (isNonEmpty(line.note)) result.notes = [line.note];

  if (calculated.allowanceObject.amount > 0) {
    const allowance: AllowanceChargeInput = {
      chargeIndicator: false,
      multiplierFactorNumeric: calculated.allowanceObject.percent / 100,
      amount: calculated.allowanceObject.amount,
      baseAmount: calculated.allowanceObject.base,
    };
    result.allowanceCharges = [allowance];
  }

  return result;
}

function buildExchangeRate(
  simple: SimpleSelfEmployedVoucherInput,
  currencyCode: string,
): ExchangeRateInput | undefined {
  if (currencyCode === DEFAULT_CURRENCY_CODE) return undefined;
  if (typeof simple.exchangeRate !== 'number') return undefined;
  return {
    sourceCurrencyCode: currencyCode,
    targetCurrencyCode: DEFAULT_CURRENCY_CODE,
    calculationRate: simple.exchangeRate,
  };
}

/**
 * Gönderim şekli referansı.
 *
 * `cbc:ID` olarak gönderim şeklinin kendisi yazılır (prod deseni); rapor
 * eşlemesi `DocumentTypeCode=EXT_SEND_METHOD` taşıyan referansı arayıp
 * `gonderimSekli` alanını doldurur. `cbc:IssueDate` XSD'de 1..1 olduğundan
 * belgenin tarihine düşülür.
 */
function buildSendMethodReference(
  simple: SimpleSelfEmployedVoucherInput,
  issueDate: string,
): AdditionalDocumentInput | undefined {
  if (!isNonEmpty(simple.sendMethod)) return undefined;
  return {
    id: simple.sendMethod,
    issueDate,
    documentTypeCode: SEND_METHOD_DOCUMENT_TYPE_CODE,
  };
}
