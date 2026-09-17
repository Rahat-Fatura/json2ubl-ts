/**
 * `SimpleProducerReceiptInput` → `ProducerReceiptInput` eşlemesi.
 *
 * ── 🔑 ORTAK OLAN ORTAK, OLMAYAN AYRI ──────────────────────────────────────
 * İskonto ve satır tutarı aritmetiği ORTAK `calculateLineBase`tan gelir; damga
 * ayrıştırma, kur ve gönderim-şekli referansı ORTAK `ubltr/mapping/
 * earsiv-mapping`ten; taraf eşlemesi ORTAK `mapSimpleParty`dan.
 *
 * ── 🔴 NİYE `calculateLine` (TAM MOTOR) KULLANILMIYOR ──────────────────────
 * Fatura/e-SMM hesap motoru vergi düzlemini KDV etrafında kurar: `baseStat` /
 * `baseCalculate` bayrakları KDV MATRAHINI değiştirir ve motor her satıra
 * KOŞULSUZ bir `0015` alt toplamı ekler. e-MM'de KDV YOKTUR (müstahsil KDV
 * mükellefi değildir) ve 27/27 prod belgede `0015` HİÇ geçmez — motoru olduğu
 * gibi çağırmak belgeye sahada bulunmayan bir eleman sokardı.
 *
 * Dahası semantik TERS: `8001` (Borsa Tescil Ücreti) fatura sözlüğünde
 * `baseStat: true` ile "KDV matrahını azaltan" bir kalemdir ve kendi tutarı
 * ödenecek tutara EKLENİR; e-MM'de ise ödenecek tutardan DÜŞER (ölçüldü:
 * `TIA = TEA − Σ TaxSubtotal.TaxAmount`, 8001 dâhil). Aynı kod, iki belgede iki
 * ayrı anlam — motoru zorlamak bu farkı GİZLERDİ.
 *
 * Bu yüzden ortaklaşan parça tam olarak `calculateLineBase`tir: iskonto
 * aritmetiği tek yerde, vergi semantiği belgeye ait olduğu yerde. e-MM'in
 * kesinti aritmetiği ise tek satırdır ve prod'da BİREBİR ölçülmüştür:
 * `tutar = lineExtensionAmount × oran / 100`, her kod için, `TaxableAmount`
 * daima `LineExtensionAmount`.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SimpleProducerReceiptInput,
  SimpleProducerReceiptLineInput,
} from './simple-input';
import type {
  ProducerReceiptInput,
  ProducerReceiptLineInput,
  ProducerReceiptTaxSubtotalInput,
  ProducerReceiptTaxTotalInput,
  ProducerReceiptTaxTypeCode,
} from './input';
import {
  INCOME_TAX_WITHHOLDING_CODE,
  EXCHANGE_REGISTRATION_FEE_CODE,
  SOCIAL_SECURITY_PREMIUM_CODE,
} from './input';
import { producerReceiptTotals } from './totals';
import type { ProducerReceiptTotals } from './totals';
import { ProducerReceiptProfileId, ProducerReceiptTypeCode } from '../../types/enums';
import type { AllowanceChargeInput, ItemInput } from '../../types/common';
import type { CalculatedAllowance } from '../../calculator/line-calculator';
import { calculateLineBase } from '../../calculator/line-calculator';
import { configManager } from '../../calculator/config-manager';
import { DEFAULT_CURRENCY_CODE } from '../../calculator/currency-config';
import { mapSimpleParty } from '../../utils/party-mapper';
import { isNonEmpty } from '../../utils/formatters';
import {
  SEND_METHOD_DOCUMENT_TYPE_CODE,
  buildPricingExchangeRate,
  buildSendMethodReference,
  splitIssueStamp,
} from '../../ubltr/mapping/earsiv-mapping';

/**
 * Gönderim şekli referansının `DocumentTypeCode`u.
 * Gövde ORTAK katmandadır; buradan yeniden dışa açılıyor (e-SMM ile aynı desen).
 */
export { SEND_METHOD_DOCUMENT_TYPE_CODE };

/** Tek bir kesinti alt toplamının hesaplanmış hâli. */
export interface CalculatedDeduction {
  code: ProducerReceiptTaxTypeCode;
  name: string;
  percent: number;
  /** ÖLÇÜLDÜ: daima `lineExtensionAmount` (27 prod belge, her kod için). */
  taxable: number;
  /** POZİTİF tutar — işaret toplam zincirinde çözülür. */
  amount: number;
}

/** Tek satırın hesaplanmış hâli. */
export interface CalculatedProducerReceiptLine {
  /** 1'den başlayan satır numarası. */
  id: number;
  /** Çözülmüş GİB birim kodu. */
  unitCode: string;
  allowanceObject: CalculatedAllowance;
  lineExtensionAmount: number;
  deductions: CalculatedDeduction[];
  /** Σ kesinti — satır düzeyi `cac:TaxTotal/cbc:TaxAmount`. */
  deductionTotal: number;
}

/** Eşlemenin ara ürünü — oturum/builder katmanı toplamları da görebilsin diye açık. */
export interface CalculatedProducerReceipt {
  lines: CalculatedProducerReceiptLine[];
  totals: ProducerReceiptTotals;
}

/** Basit girdiyi HESAPLAR — XML üretmez, eşleme yapmaz. */
export function calculateProducerReceipt(
  simple: SimpleProducerReceiptInput,
): CalculatedProducerReceipt {
  const lines = (simple.lines ?? []).map((line, i) => calculateReceiptLine(line, i, simple));

  let grossAmount = 0;
  let deductionTotal = 0;
  let allowanceTotal = 0;

  for (const line of lines) {
    grossAmount += line.lineExtensionAmount;
    deductionTotal += line.deductionTotal;
    allowanceTotal += line.allowanceObject.amount;
  }

  return {
    lines,
    totals: producerReceiptTotals({ grossAmount, deductionTotal, allowanceTotal }),
  };
}

/** Basit girdiyi hesaplar ve ham `ProducerReceiptInput`a çevirir. */
export function mapSimpleToProducerReceiptInput(
  simple: SimpleProducerReceiptInput,
  precomputed?: CalculatedProducerReceipt,
): ProducerReceiptInput {
  const calc = precomputed ?? calculateProducerReceipt(simple);
  const currencyCode = simple.currencyCode ?? DEFAULT_CURRENCY_CODE;

  const { issueDate, issueTime } = splitIssueStamp(simple.datetime);

  const result: ProducerReceiptInput = {
    id: simple.documentNumber ?? '',
    uuid: simple.uuid ?? uuidv4(),
    profileId: ProducerReceiptProfileId.EARSIVBELGE,
    receiptTypeCode: ProducerReceiptTypeCode.MUSTAHSILMAKBUZ,
    issueDate,
    issueTime,
    currencyCode,
    /* 🔴 ROL TERSLEMESİ — TEK YER. Belgeyi düzenleyen tüccar UBL'de `Supplier`
     * yuvasına, malı satan müstahsil `Customer` yuvasına gider. Gerekçe ve prod
     * ölçümü `input.ts` başlığındadır; kütüphanede başka hiçbir yer bu eşlemeyi
     * yeniden kurmaz. */
    issuer: mapSimpleParty(simple.issuer),
    producer: mapSimpleParty(simple.producer),
    /* Teslim tarihi verilmezse düzenleme tarihine düşülür — 27/27 prod belgede
     * ikisi eşit. Eşitlik DAYATILMIYOR, yalnız VARSAYILIYOR: çağıran farklı bir
     * tarih verirse aynen yazılır. */
    actualDeliveryDate: isNonEmpty(simple.deliveryDate) ? simple.deliveryDate : issueDate,
    taxTotal: buildDocumentTaxTotal(calc),
    legalMonetaryTotal: {
      lineExtensionAmount: calc.totals.lineExtensionAmount,
      taxExclusiveAmount: calc.totals.taxExclusiveAmount,
      taxInclusiveAmount: calc.totals.taxInclusiveAmount,
      allowanceTotalAmount: calc.totals.allowanceTotalAmount,
      payableAmount: calc.totals.payableAmount,
    },
    lines: (simple.lines ?? []).map((line, i) => buildLine(line, calc.lines[i])),
  };

  if (simple.notes?.length) result.notes = [...simple.notes];

  const exchangeRate = buildPricingExchangeRate(currencyCode, simple.exchangeRate);
  if (exchangeRate) result.exchangeRate = exchangeRate;

  const sendMethodRef = buildSendMethodReference(simple.sendMethod, issueDate);
  if (sendMethodRef) result.additionalDocuments = [sendMethodRef];

  return result;
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/**
 * Kesinti kodunun Türkçe etiketi.
 *
 * `0003` ve `8001` GİB'in kendi kod listesinden gelir (`TAX_DEFINITIONS`) —
 * etiket UYDURULMAZ, sözlükten okunur. `SGK_PRIM` o sözlükte YOKTUR ve
 * bilerek EKLENMEDİ: `TAX_DEFINITIONS` GİB'in kod listesinin karşılığıdır ve
 * oraya kaynaksız bir kod koymak sözlüğün otoritesini bozardı. Etiket bu yüzden
 * burada, PROD'DA ÖLÇÜLEN hâliyle duruyor.
 */
function deductionName(code: ProducerReceiptTaxTypeCode): string {
  const known = configManager.getTax(code);
  if (known) return known.name;
  // 🔴 KAYNAKSIZ — 25/27 prod belgede bu etiketle ölçüldü. Bkz. `input.ts`.
  return 'SGK Prim Kesintisi';
}

/**
 * Bir kalemin kesinti oranlarını çözer — kalem oranı belge oranını EZER.
 *
 * Sıra SABİTTİR (`0003` → `8001` → `SGK_PRIM`) ve prod'daki alt toplam
 * sırasıyla aynıdır. Sıra bir tercih değil: `cac:TaxSubtotal` tekrarlı bir
 * elemandır ve sekans bekçisi tekrarı serbest bıraksa da, deterministik sıra
 * golden dosyalarının kararlılığı için şarttır.
 */
function resolveRates(
  line: SimpleProducerReceiptLineInput,
  simple: SimpleProducerReceiptInput,
): Array<{ code: ProducerReceiptTaxTypeCode; percent: number }> {
  const pairs: Array<[ProducerReceiptTaxTypeCode, number | undefined]> = [
    [INCOME_TAX_WITHHOLDING_CODE, line.incomeTaxWithholdingPercent ?? simple.incomeTaxWithholdingPercent],
    [EXCHANGE_REGISTRATION_FEE_CODE, line.exchangeRegistrationFeePercent ?? simple.exchangeRegistrationFeePercent],
    [SOCIAL_SECURITY_PREMIUM_CODE, line.socialSecurityPremiumPercent ?? simple.socialSecurityPremiumPercent],
  ];
  /* 🔴 EŞİK `> 0` DEĞİL, "SAYI MI". Oran AÇIKÇA `0` verilirse tutarı sıfır olan
   * bir alt toplam YAZILIR — prod deseni tam olarak budur (25/27 belgede `8001`
   * ve `SGK_PRIM` `Percent=0.00` / `TaxAmount=0.00` ile emit ediliyor) ve
   * "kesinti uygulanmadı" ile "kesinti kalemi hiç yok" farklı beyanlardır.
   * Stopaj oranı Cumhurbaşkanı kararıyla sıfıra indirilebilir (GVK 94); o hâli
   * "stopaj yok" diye yazmak belgeyi eksik beyan etmek olurdu. Alan HİÇ
   * verilmezse (`undefined`) alt toplam da yazılmaz. */
  return pairs
    .filter((p): p is [ProducerReceiptTaxTypeCode, number] =>
      typeof p[1] === 'number' && Number.isFinite(p[1]) && p[1] >= 0)
    .map(([code, percent]) => ({ code, percent }));
}

/** Tek satır: ortak taban + e-MM kesintileri. */
function calculateReceiptLine(
  line: SimpleProducerReceiptLineInput,
  index: number,
  simple: SimpleProducerReceiptInput,
): CalculatedProducerReceiptLine {
  const { allowanceObject, lineExtensionAmount } = calculateLineBase(line);

  const deductions = resolveRates(line, simple).map(({ code, percent }) => ({
    code,
    name: deductionName(code),
    percent,
    // ÖLÇÜLDÜ: matrah DAİMA satır tutarı (her kod için, 25/25 prod belge).
    taxable: lineExtensionAmount,
    amount: lineExtensionAmount * (percent / 100),
  }));

  return {
    id: index + 1,
    /* 🔴 BİRİM ADI → GİB KODU, EŞLEME ANINDA. İrsaliye dersi: çözümleme
     * koşmadığı için `unitCode="Adet"` ham hâliyle GİB'e gidip
     * `GeneralUnitCodeCheck`i patlatıyordu. CANLI ÖLÇÜLDÜ: aynı assert
     * `CreditNote` kökünde de koşuyor. */
    unitCode: configManager.resolveUnitCode(line.unitCode ?? 'Adet'),
    allowanceObject,
    lineExtensionAmount,
    deductions,
    deductionTotal: deductions.reduce((sum, d) => sum + d.amount, 0),
  };
}

/** Hesaplanan satır → `cac:TaxTotal`. */
function buildLineTaxTotal(calculated: CalculatedProducerReceiptLine): ProducerReceiptTaxTotalInput {
  return {
    taxAmount: calculated.deductionTotal,
    taxSubtotals: calculated.deductions.map(toSubtotal),
  };
}

/**
 * Belge seviyesi `cac:TaxTotal` — kalemleri `kod + oran` ikilisine göre gruplar
 * (fatura toplayıcısıyla AYNI kural).
 */
function buildDocumentTaxTotal(calc: CalculatedProducerReceipt): ProducerReceiptTaxTotalInput {
  const grouped: ProducerReceiptTaxSubtotalInput[] = [];

  for (const line of calc.lines) {
    for (const d of line.deductions) {
      const existing = grouped.find(g => g.taxTypeCode === d.code && g.percent === d.percent);
      if (existing) {
        existing.taxableAmount += d.taxable;
        existing.taxAmount += d.amount;
        continue;
      }
      grouped.push(toSubtotal(d));
    }
  }

  return { taxAmount: calc.totals.taxTotalAmount, taxSubtotals: grouped };
}

function toSubtotal(d: CalculatedDeduction): ProducerReceiptTaxSubtotalInput {
  return {
    taxableAmount: d.taxable,
    taxAmount: d.amount,
    percent: d.percent,
    taxTypeCode: d.code,
    taxTypeName: d.name,
  };
}

function buildLine(
  line: SimpleProducerReceiptLineInput,
  calculated: CalculatedProducerReceiptLine,
): ProducerReceiptLineInput {
  const item: ItemInput = { name: line.name };
  if (isNonEmpty(line.description)) item.description = line.description;

  const result: ProducerReceiptLineInput = {
    id: String(calculated.id),
    creditedQuantity: line.quantity,
    unitCode: calculated.unitCode,
    lineExtensionAmount: calculated.lineExtensionAmount,
    taxTotal: buildLineTaxTotal(calculated),
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
