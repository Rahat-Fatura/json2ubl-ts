/**
 * e-SMM TOPLAM ZİNCİRİ — TEK YOL, anahtar YOK.
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
 * ── `TaxInclusiveAmount` — KULLANICI KARARI (2026-09-17) ───────────────────
 * Karar: *"stopajı aynı faturadaki gibi uygulayacaksın; tutar orada nasıl
 * hesaplanıyorsa o şekilde hesaplanacak."* Dayanağı kullanıcının ÜRETİM
 * şablonunun kendi çıktısıdır (2.000 TL hizmet · %20 KDV · %40 KDV tevkifatı):
 *
 *     Mal Hizmet Toplam Tutarı      2.000,00
 *     Hesaplanan KDV %20              400,00
 *     Hesaplanan KDV Tevkifat (%40)   160,00
 *     Vergiler Dahil Toplam Tutar   2.400,00   = 2.000 + 400   → tevkifat GİRMEZ
 *     Ödenecek Tutar                2.240,00   = 2.400 − 160   → tevkifat DÜŞER
 *
 * Yani `TIA = brüt + hesaplanan KDV`; kesintiler yalnız `PayableAmount`ı
 * etkiler. Bu, fatura düzleminin tevkifatı `cac:WithholdingTaxTotal`da taşıyan
 * dalıyla BİREBİR aynı şekildir ve ölçülmüştür (bkz. eşitlik testi).
 * UBL-TR formülünün harfi harfine okunuşu (`TIA = TaxExclusive + Σ TaxTotal`)
 * aynı belgede 2.560 derdi — üretim çıktısı onu DIŞLIYOR, bu yüzden o dal
 * koddan tamamen kaldırıldı (eskiden `'ubltr-formula'` anahtarıydı).
 *
 * ── ⚠️ HÂLÂ AÇIK OLAN TEK EKSEN: `0003` GELİR VERGİSİ STOPAJI ──────────────
 * Üretim çıktısında **stopaj satırı YOKTUR**; kapanan eksen `9015`tir. Fatura
 * düzleminde `0003` `cac:TaxTotal`a NEGATİF girer, yani orada `TIA`yı da
 * düşürür (ölçüldü: 10.000 brüt / %20 KDV / %20 stopaj → fatura `TIA` 10.000,
 * e-SMM `TIA` 12.000). İki düzlemde de **`PayableAmount` AYNI** çıkar; ayrışan
 * yalnız `TIA`dır. Bu fark teste çivilidir — birileri "tutarsızlık" sanıp
 * sessizce düzeltmesin diye. Stopajlı bir üretim çıktısı geldiğinde kapanacak
 * TEK yer `selfEmployedVoucherTotals` gövdesidir.
 *
 * ── e-MM İLE FARK: ÇELİŞKİ DEĞİL ──────────────────────────────────────────
 * `producer-receipt/totals.ts`te `TIA = brüt − kesinti` ölçülmüştür (25/25 prod
 * belge) ve DOĞRUDUR: e-MM'de müstahsil KDV mükellefi olmadığı için ÇIKIŞ KDV'Sİ
 * YOKTUR, dolayısıyla "eklenecek" bir vergi de yoktur. İki belgenin ORTAK yanı
 * `PayableAmount`ın kesinti düşülerek bulunmasıdır; ayrıştıkları yer yalnız
 * KDV'nin var olup olmamasıdır. Biri diğerine bakıp DÜZELTİLMEMELİDİR.
 */

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
  /** `brüt + hesaplanan KDV`. Kesintiler GİRMEZ — gerekçe dosya başlığındadır. */
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

  return {
    lineExtensionAmount: grossFee,
    // Belge seviyesi `AllowanceCharge` üretilmez → TaxExclusive ≡ LineExtension.
    taxExclusiveAmount: grossFee,
    // Vergiler dahil tutar: brüt + hesaplanan KDV. Kesintiler BURAYA GİRMEZ.
    taxInclusiveAmount: grossFee + calculatedVat,
    allowanceTotalAmount: allowanceTotal,
    // Tahsil edilen: brüt − stopaj + KDV − KDV tevkifatı.
    payableAmount: grossFee - incomeTaxWithholding + calculatedVat - vatWithholding,
    netFee: grossFee - incomeTaxWithholding,
    taxTotalAmount,
  };
}
