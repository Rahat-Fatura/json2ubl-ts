/**
 * e-SMM TOPLAM ZİNCİRİ — konvansiyonun TEK YERİ.
 *
 * ```
 *   Brüt Ücret          LineExtensionAmount
 * − Gelir V. Stopajı    TaxSubtotal[0003]
 * = Net Ücret           TÜRETİLMİŞ — UBL karşılığı YOK
 * + Hesaplanan KDV      TaxSubtotal[0015]
 * − KDV Tevkifatı       TaxSubtotal[9015]
 * = Tahsil Edilen       PayableAmount
 * ```
 *
 * ── 🔴 `TaxInclusiveAmount` KONVANSİYONU — KAYNAKSIZ, TEK YERDE ────────────
 * UBL-TR'nin parasal formülü şudur:
 *
 *     TaxInclusive = TaxExclusive + Σ(TaxTotal.TaxAmount)
 *     Payable      = TaxInclusive − Σ(WithholdingTaxTotal.TaxAmount)
 *
 * e-SMM'de `0003` ve `9015` de `cac:TaxTotal` düzlemindedir (`9015`'in
 * `WithholdingTaxTotal`da yazılması YASAK). Formül harfiyen uygulanırsa
 * 10.000 brüt / %20 stopaj / %20 KDV'li bir belgede `TaxInclusiveAmount`
 * **14.000** çıkar — stopaj ve tevkifat da "vergi dahil tutara" eklenmiş olur.
 * Bizim konvansiyonumuz **12.000** der: vergi dahil tutar = brüt + hesaplanan
 * KDV; stopaj ve tevkifat yalnız `PayableAmount`ı etkiler.
 *
 * ⚠️ **BU KONVANSİYONUN GİB METNİ YOKTUR.** e-SMM gövdesi için yayınlanmış
 * kılavuz/XSD/şematron olmadığından çözüm normatif bir kaynaktan gelmiyor;
 * anlamsal okumadan geliyor ("vergi dahil tutar" = bedel + üzerine hesaplanan
 * KDV). Elimizdeki **12 prod belgenin HİÇBİRİ bu dalı test etmiyor** — hepsi
 * stopajsız (tek vergi `0015`), 12/12 alıcı TCKN'li, yani GVK 94 tevkifat
 * yükümlüsü değil.
 *
 * 🔑 KARAR KULLANICIYA AİT; buradaki iş onu GÖRÜNÜR ve TEK NOKTADAN
 * DEĞİŞTİRİLEBİLİR kılmaktır. **STOPAJLI GERÇEK BİR PROD ÖRNEĞİ bu soruyu tek
 * başına kapatır.** Örnek geldiğinde değişecek tek şey
 * `SELF_EMPLOYED_VOUCHER_TAX_INCLUSIVE_CONVENTION` ve `selfEmployedVoucherTotals` gövdesidir; başka
 * hiçbir dosya bu kararı bilmez. Konvansiyon ayrıca teste çivilidir
 * (`__tests__/self-employed-voucher/totals.test.ts`).
 */

/**
 * Yürürlükteki `TaxInclusiveAmount` konvansiyonunun ADI.
 *
 *  • `'gross-plus-vat'` (YÜRÜRLÜKTE) — `TIA = brüt + hesaplanan KDV`.
 *    Stopaj ve KDV tevkifatı `TaxInclusiveAmount`a GİRMEZ.
 *  • `'ubltr-formula'` — `TIA = TaxExclusive + Σ TaxTotal.TaxAmount`
 *    (UBL-TR formülünün harfi harfine uygulanması). Stopajlı prod örneği
 *    bunu doğrularsa geçiş TEK SATIRLIKTIR.
 */
export type SelfEmployedVoucherTaxInclusiveConvention = 'gross-plus-vat' | 'ubltr-formula';

/**
 * 🔴 KAYNAKSIZ KARAR — GİB metni YOK, stopajlı prod örneği BEKLENİYOR.
 * Gerekçenin tamamı dosya başlığındadır. Değiştirmeden önce oradaki notu okuyun.
 */
export const SELF_EMPLOYED_VOUCHER_TAX_INCLUSIVE_CONVENTION: SelfEmployedVoucherTaxInclusiveConvention = 'gross-plus-vat';

/** Zincirin ham bileşenleri — hepsi POZİTİF tutar olarak verilir. */
export interface SelfEmployedVoucherAmountChain {
  /** Σ brüt ücret (indirim SONRASI) — `cbc:LineExtensionAmount`. */
  grossFee: number;
  /** Σ `TaxSubtotal[0003]` — gelir vergisi stopajı. */
  incomeTaxWithholding: number;
  /** Σ `TaxSubtotal[0015]` — hesaplanan KDV. */
  calculatedVat: number;
  /** Σ `TaxSubtotal[9015]` — KDV tevkifatı. */
  vatWithholding: number;
  /** Σ satır indirimi — `cbc:AllowanceTotalAmount`. */
  allowanceTotal: number;
}

/** Zincirin çözülmüş hâli — `LegalMonetaryTotal` + türetilmiş net ücret. */
export interface SelfEmployedVoucherTotals {
  lineExtensionAmount: number;
  taxExclusiveAmount: number;
  /** 🔴 Konvansiyona göre hesaplanır — bkz. `SELF_EMPLOYED_VOUCHER_TAX_INCLUSIVE_CONVENTION`. */
  taxInclusiveAmount: number;
  allowanceTotalAmount: number;
  payableAmount: number;
  /**
   * **Net Ücret** — brüt − stopaj. UBL'de KARŞILIĞI YOKTUR, XML'e YAZILMAZ;
   * makbuzun GÖRÜNTÜSÜNE aittir ve orayı `tpl-forge` çizer. Türetimi yine de
   * burada durur ki tüketici kendi formülünü uydurmasın — tek doğru formül
   * budur, kullanan taraf onu buradan okur.
   */
  netFee: number;
  /** `cac:TaxTotal/cbc:TaxAmount` — alt toplamların TOPLAMI (UBL-TR yapısal kuralı). */
  taxTotalAmount: number;
}

/** Zinciri çözer. Yuvarlama YAPMAZ — biçimlendirme serileştiricinin işidir. */
export function selfEmployedVoucherTotals(
  chain: SelfEmployedVoucherAmountChain,
): SelfEmployedVoucherTotals {
  const { grossFee, incomeTaxWithholding, calculatedVat, vatWithholding, allowanceTotal } = chain;

  /* `cac:TaxTotal/cbc:TaxAmount` konvansiyon DIŞIDIR: UBL'de bir `TaxTotal`ın
   * `TaxAmount`ı alt toplamlarının toplamıdır ve bu yapısal bir kuraldır, tercih
   * değil. Üç kod da pozitif yazılır (işaret `PayableAmount`ta çözülür). */
  const taxTotalAmount = incomeTaxWithholding + calculatedVat + vatWithholding;

  const taxInclusiveAmount =
    SELF_EMPLOYED_VOUCHER_TAX_INCLUSIVE_CONVENTION === 'gross-plus-vat'
      ? grossFee + calculatedVat
      : grossFee + taxTotalAmount;

  return {
    lineExtensionAmount: grossFee,
    // Belge seviyesi `AllowanceCharge` üretilmez → TaxExclusive ≡ LineExtension.
    taxExclusiveAmount: grossFee,
    taxInclusiveAmount,
    allowanceTotalAmount: allowanceTotal,
    // Tahsil edilen: brüt − stopaj + KDV − KDV tevkifatı. Konvansiyondan BAĞIMSIZ.
    payableAmount: grossFee - incomeTaxWithholding + calculatedVat - vatWithholding,
    netFee: grossFee - incomeTaxWithholding,
    taxTotalAmount,
  };
}
