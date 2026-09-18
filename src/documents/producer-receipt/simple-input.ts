/**
 * Basitleştirilmiş e-MM giriş tipleri.
 *
 * Çağıran yalnız iş verisini verir; hesaplama, tip/profil, VKN/TCKN ayrımı ve
 * UBL dönüşümü kütüphanede kalır — `SimpleInvoiceInput` ile aynı sözleşme.
 *
 * ── 🔴 TARAF ADLARI ROLÜ SÖYLER ────────────────────────────────────────────
 * `supplier`/`customer` DEĞİL, `issuer`/`producer`. Müstahsil makbuzunu ALICI
 * düzenler; `supplier` demek, tüketiciyi "malı satan taraf burası mı?" diye
 * düşünmeye zorlardı ve cevabı HAYIR olurdu (UBL'de `Supplier` yuvası belgeyi
 * DÜZENLEYENE ait — 27/27 prod belgede ölçüldü). Ad yüzeyi bu tahmini ortadan
 * kaldırır. Eşlemenin tamamı `mapper.ts`te iki satırdır.
 *
 * ── TARAF TİPİ ORTAK ───────────────────────────────────────────────────────
 * `SimplePartyInput` fatura/irsaliye/e-SMM ile PAYLAŞILIR. Kopyalanmadı: taraf
 * ŞEKLİ belgeye göre değişmiyor, yalnız ROLÜ değişiyor — ve rol, alanın ADINDA
 * yaşar, tipinde değil.
 *
 * ── PROFİL/TİP GİRDİDE YOK ─────────────────────────────────────────────────
 * e-MM'de profil ve tip TEK değerlidir (`EARSIVBELGE` / `MUSTAHSILMAKBUZ`);
 * seçilecek bir şey olmadığı için girdi yüzeyinde alan AÇILMAZ.
 */

import type { SimplePartyInput } from '../../calculator/simple-types';
import type { EArchiveSendMethod } from '../../ubltr/mapping/earsiv-mapping';

/**
 * Gönderim şekli — `AdditionalDocumentReference/cbc:DocumentTypeCode=EXT_SEND_METHOD`.
 * Gövde ORTAK (`ubltr/mapping/earsiv-mapping`); e-SMM ile aynı anahtar.
 */
export type ProducerReceiptSendMethod = EArchiveSendMethod;

/** e-MM kalemi (basit). */
export interface SimpleProducerReceiptLineInput {
  /** Ürün adı — zorunlu. */
  name: string;
  /** Miktar — zorunlu. */
  quantity: number;
  /** Birim fiyat — zorunlu. */
  price: number;
  /**
   * Birim kodu (Türkçe ad ya da UBL kodu: "Kilogram" / "KGM") — varsayılan "Adet".
   *
   * ⚠️ Zirai ürünlerde birim genellikle KİLOGRAMDIR; varsayılan "Adet" bilinçli
   * olarak fatura ile AYNI bırakıldı (ortak `resolveUnitCode` yolu), çünkü e-MM
   * meyve-sebze dışında canlı hayvan, süt ve kozalak gibi kalemler de taşır ve
   * kütüphane ürün türünden birim TAHMİN ETMEZ.
   */
  unitCode?: string;
  /**
   * Gelir vergisi stopajı oranı (%) — `TaxSubtotal[0003]`.
   *
   * 🔴 ORAN SABİT DEĞİLDİR, KULLANICIDAN ALINIR. GVK 94/11 oranı ürün türüne
   * (ve borsada tescil edilip edilmediğine) göre değişir; prod'da hem %2 hem %4
   * ölçüldü ve Cumhurbaşkanı oranı değiştirebilir. Verilmezse belge
   * seviyesindeki değer, o da yoksa stopaj HİÇ yazılmaz.
   */
  incomeTaxWithholdingPercent?: number;
  /**
   * Mera Fonu oranı (%) — `TaxSubtotal[9040]`.
   *
   * 4342 sayılı Mera Kanunu kesintisi. Karekod Standardı Kılavuzu V1.2 §2.5
   * bunu e-MM'in DÖRT kesintisinden biri olarak adıyla sayar (`merafonu`) ve
   * kod GİB kod listesinde VARDIR — `SGK_PRIM`in aksine kaynaklıdır.
   * Verilmezse belge seviyesindeki değer, o da yoksa alt toplam YAZILMAZ.
   */
  pastureFundPercent?: number;
  /** Borsa tescil ücreti oranı (%) — `TaxSubtotal[8001]`. */
  exchangeRegistrationFeePercent?: number;
  /**
   * SGK prim kesintisi oranı (%) — `TaxSubtotal[SGK_PRIM]`.
   * 🔴 Kod GİB listesinde YOK (prod ölçümü) — bkz. `input.ts` başlığı.
   */
  socialSecurityPremiumPercent?: number;
  /** İskonto oranı (%). */
  allowancePercent?: number;
  /** Ürün açıklaması — `cac:Item/cbc:Description`. */
  description?: string;
  /** Satır notu — `cac:CreditNoteLine/cbc:Note`. */
  note?: string;
}

/** e-MM belgesi (basit). */
export interface SimpleProducerReceiptInput {
  /**
   * Makbuz numarası — `^[A-Z0-9]{3}20\d{2}\d{9}$`.
   * Oturum aşamasında BOŞ olabilir; numarayı gönderim anında seri motoru verir.
   */
  documentNumber?: string;
  /** ETTN — verilmezse üretilir. */
  uuid?: string;
  /**
   * Düzenleme tarihi+saati: `YYYY-MM-DDTHH:mm:ss`.
   * Saat 27/27 prod belgede vardır — verilmezse "şimdi" alınır.
   */
  datetime?: string;
  /**
   * Teslim tarihi — `YYYY-MM-DD`. Verilmezse DÜZENLEME TARİHİ kullanılır
   * (27/27 prod belgede ikisi eşit). Eşitlik DAYATILMAZ: geriye dönük
   * düzenlenen makbuzda teslim tarihi daha eski olabilir.
   */
  deliveryDate?: string;
  /** Para birimi — varsayılan `TRY`. */
  currencyCode?: string;
  /** Kur — TRY dışı belgede ZORUNLU (şematron `CurrencyCodeCheck`, 6 ondalık). */
  exchangeRate?: number;
  /** Belgeyi DÜZENLEYEN — tüccar/alıcı (`cac:AccountingSupplierParty`). */
  issuer: SimplePartyInput;
  /** MÜSTAHSİL — malı satan çiftçi (`cac:AccountingCustomerParty`). */
  producer: SimplePartyInput;
  /** Kalemler. */
  lines: SimpleProducerReceiptLineInput[];
  /** Belge notları. */
  notes?: string[];
  /** Belge seviyesi gelir vergisi stopajı oranı (%) — kalem oranı önceliklidir. */
  incomeTaxWithholdingPercent?: number;
  /** Belge seviyesi Mera Fonu oranı (%) — kalem oranı önceliklidir. */
  pastureFundPercent?: number;
  /** Belge seviyesi borsa tescil ücreti oranı (%) — kalem oranı önceliklidir. */
  exchangeRegistrationFeePercent?: number;
  /** Belge seviyesi SGK prim kesintisi oranı (%) — kalem oranı önceliklidir. */
  socialSecurityPremiumPercent?: number;
  /**
   * Gönderim şekli — rapor eşlemesinde `gonderimSekli` alanını besler.
   * Verilirse `DocumentTypeCode=EXT_SEND_METHOD` taşıyan bir
   * `cac:AdditionalDocumentReference` yazılır (prod deseni).
   */
  sendMethod?: ProducerReceiptSendMethod;
}
