/**
 * e-MM TOPLAM ZİNCİRİ — ÖLÇÜLMÜŞ, uydurulmamış.
 *
 * ```
 *   Brüt Bedel          LineExtensionAmount  ( = TaxExclusiveAmount)
 * − Gelir V. Stopajı    TaxSubtotal[0003]
 * − Borsa Tescil Ücr.   TaxSubtotal[8001]
 * − SGK Prim Kesintisi  TaxSubtotal[SGK_PRIM]
 * = Ödenecek Tutar      TaxInclusiveAmount  ≡  PayableAmount
 * ```
 *
 * ── 🔴 e-SMM'DEN EN BÜYÜK AYRILIK: `TaxInclusiveAmount` ÇIKARILIR ──────────
 * e-SMM'de `TaxInclusiveAmount` konvansiyonu KAYNAKSIZDIR ve kütüphane onu bir
 * SABİTLE görünür kılmak zorunda kalmıştı: orada vergi EKLENİR (brüt + KDV) ve
 * hangi okumanın doğru olduğunu ayırt eden prod örneği YOKTU.
 *
 * e-MM'de durum TERSİ ve NET: burada vergi diye bir "ekleme" yoktur; `TaxTotal`
 * altındaki her alt toplam müstahsile ödenecek tutardan DÜŞER. Müstahsil KDV
 * mükellefi değildir, dolayısıyla `0015` hiç geçmez (27/27 prod belgede yok).
 *
 * 🔑 KONVANSİYON SABİTİ BU DOSYADA YOKTUR VE OLMAMALIDIR — çünkü karar değil
 * ÖLÇÜM var. 27 gerçek prod belgenin 25'inde (kalan 2'si belge seviyesi
 * indirim/ek yük taşıyan ayrı bir üreticiye ait) şu ÜÇ eşitlik birden tutuyor:
 *
 *     TaxExclusiveAmount  ==  LineExtensionAmount
 *     TaxInclusiveAmount  ==  TaxExclusiveAmount − Σ TaxSubtotal.TaxAmount
 *     PayableAmount       ==  TaxInclusiveAmount
 *     TaxTotal.TaxAmount  ==  Σ TaxSubtotal.TaxAmount
 *
 * UBL-TR'nin genel formülü (`TIA = TEA + Σ TaxTotal.TaxAmount`) e-MM'de
 * HARFİYEN UYGULANMAZ ve bu bir tercih değil, sahanın ölçülmüş hâlidir.
 * Uygulansaydı 10.000 brüt / %2 stopajlı bir makbuzda `TaxInclusiveAmount`
 * 10.200 çıkardı — müstahsile ödenen 9.800 iken.
 */

/** Zincirin ham bileşenleri — kesintiler POZİTİF tutar olarak verilir. */
export interface ProducerReceiptAmountChain {
  /** Σ brüt bedel (indirim SONRASI) — `cbc:LineExtensionAmount`. */
  grossAmount: number;
  /**
   * Σ kesinti — `0003` + `8001` + `SGK_PRIM` alt toplamlarının tamamı.
   *
   * Tek alanda toplanır çünkü zincir açısından üçü de AYNI şeyi yapar: ödenecek
   * tutarı düşürür. Kod bazında ayrıştırma `cac:TaxSubtotal` düzlemine aittir,
   * toplam zincirine değil — orada ayrıştırmak, kesinti kodu eklendiğinde
   * zinciri değiştirmeyi gerektirirdi.
   */
  deductionTotal: number;
  /** Σ satır indirimi — `cbc:AllowanceTotalAmount`. */
  allowanceTotal: number;
}

/** Zincirin çözülmüş hâli — `LegalMonetaryTotal` + türetilmiş ödenecek tutar. */
export interface ProducerReceiptTotals {
  lineExtensionAmount: number;
  taxExclusiveAmount: number;
  /** 🔴 Brüt − Σ kesinti. ÖLÇÜLDÜ (25/25 prod belge), konvansiyon DEĞİL. */
  taxInclusiveAmount: number;
  allowanceTotalAmount: number;
  /** Müstahsile ÖDENECEK tutar. Prod'da `TaxInclusiveAmount`a EŞİT (ölçüldü). */
  payableAmount: number;
  /** `cac:TaxTotal/cbc:TaxAmount` — alt toplamların TOPLAMI (UBL-TR yapısal kuralı). */
  taxTotalAmount: number;
}

/** Zinciri çözer. Yuvarlama YAPMAZ — biçimlendirme serileştiricinin işidir. */
export function producerReceiptTotals(
  chain: ProducerReceiptAmountChain,
): ProducerReceiptTotals {
  const { grossAmount, deductionTotal, allowanceTotal } = chain;

  /* Ödenecek tutar zincirin TEK türevidir; `TaxInclusiveAmount` ile `PayableAmount`
   * prod'da AYNI sayıdır ve burada da aynı ifadeden gelir — iki ayrı hesap
   * yazmak, birinde yapılan düzeltmenin diğerine geçmemesi demek olurdu. */
  const netPayable = grossAmount - deductionTotal;

  return {
    lineExtensionAmount: grossAmount,
    // Belge seviyesi `AllowanceCharge` üretilmez → TaxExclusive ≡ LineExtension.
    taxExclusiveAmount: grossAmount,
    taxInclusiveAmount: netPayable,
    allowanceTotalAmount: allowanceTotal,
    payableAmount: netPayable,
    taxTotalAmount: deductionTotal,
  };
}
