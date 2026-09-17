/**
 * e-SMM (Serbest Meslek Makbuzu) HAM girdi sözleşmesi — KATMAN 3.
 *
 * ── 🔴 GÖVDE FORMATI GİB TARAFINDAN DAYATILMAZ ─────────────────────────────
 * e-SMM belge GÖVDESİ için yayınlanmış bir kılavuz / XSD / şematron YOKTUR ve
 * bu bir kanıt boşluğu DEĞİL, bilinen bir gerçektir: her entegratör kendi
 * yapısını kurar. Normatif olan yalnız **e-Arşiv RAPOR katmanıdır**
 * (`EArsiv.xsd` → `serbestMeslekMakbuz`).
 *
 * Bu kütüphane UBL **`Invoice`** kökünü + `ProfileID=EARSIVBELGE` +
 * `InvoiceTypeCode=SERBESTMESLEKMAKBUZU` yapısını BİLEREK seçer. Serbestlik
 * "kural yok" demek değil, **"varsayılanı biz seçiyoruz"** demektir; varsayılanı
 * UBL-TR ortak kuralları yapmak serbestliği riskten kolaylığa çevirir. Katmanlı
 * mimarinin sınandığı yer tam burası: `ubl/` bileşenleri ve `ubltr/` yüklemleri
 * bu belgeye BEDAVA devrolur, gövde yeniden yazılmaz.
 *
 * ── VERGİ DÜZLEMİ: ÜÇ KOD, TEK YER ─────────────────────────────────────────
 * | Kavram              | Kod    | Nerede                              |
 * |---------------------|--------|-------------------------------------|
 * | Gelir vergisi stopajı | `0003` | `cac:TaxTotal/cac:TaxSubtotal`     |
 * | KDV                   | `0015` | aynı                               |
 * | KDV tevkifatı         | `9015` | aynı                               |
 * | KDV tevkifatı         | —      | `cac:WithholdingTaxTotal` → YASAK  |
 *
 * GİB'in kendi forum cevabı: *«e-SMM belgesinde e-Arşiv Faturadan farklı olarak
 * 9015 kodu kullanılmaktadır.»*
 *
 * 🔑 YASAK BİR DOĞRULAMA KURALI DEĞİL, **TİP GÜVENCESİDİR**: bu arayüzde
 * `withholdingTaxTotals` alanı YOKTUR, dolayısıyla `cac:WithholdingTaxTotal`
 * taşıyan bir e-SMM TEMSİL EDİLEMEZ. (Çoklu plaka dersi: geçersiz şekli
 * doğrulamayla kovalamak yerine kurulamaz kılmak.)
 *
 * Stopaj ORANI **sabit değildir, kullanıcıdan alınır** (GVK 94; Cumhurbaşkanı
 * sıfıra kadar indirebilir, noterler istisnadır). Kütüphane oran DAYATMAZ.
 */

import type { SelfEmployedVoucherProfileId, SelfEmployedVoucherTypeCode } from '../../types/enums';
import type {
  PartyInput,
  ItemInput,
  PriceInput,
  MonetaryTotalInput,
  AllowanceChargeInput,
  AdditionalDocumentInput,
  ExchangeRateInput,
} from '../../types/common';

/**
 * e-SMM'de kullanılabilen vergi kodlarının KAPALI kümesi.
 *
 * 🔴 Daraltma TİP DÜZEYİNDEDİR: fatura tarafı `taxTypeCode: string` taşır ve 33
 * değerlik `vergiKodEnum`a açıktır; e-SMM üçe kapalıdır. Kapalı küme burada
 * MEŞRUDUR çünkü gövde sözleşmesinin sahibi biziz — fatura tarafında aynı
 * daraltmayı yapmak GİB'in tanıdığı kodları reddetmek olurdu.
 */
export const SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES = ['0003', '0015', '9015'] as const;

/** e-SMM vergi kodu — `SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES` üyesi. */
export type SelfEmployedVoucherTaxTypeCode =
  (typeof SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES)[number];

/** Gelir vergisi stopajı — `cac:TaxTotal` düzleminde. */
export const INCOME_TAX_WITHHOLDING_CODE = '0003';
/** KDV. */
export const VAT_CODE = '0015';
/** KDV tevkifatı — e-SMM'de `cac:TaxTotal` düzleminde (e-Faturadan FARKLI). */
export const VAT_WITHHOLDING_CODE = '9015';

/**
 * e-SMM vergi alt toplamı — `TaxSubtotalInput`ın kod ekseninde DARALTILMIŞ hâli.
 *
 * Yapısal olarak `TaxSubtotalInput` ile uyumludur (string literal union, `string`e
 * atanabilir), bu yüzden ortak `serializeTaxTotal` bileşeni doğrudan kullanılır.
 */
export interface SelfEmployedVoucherTaxSubtotalInput {
  taxableAmount: number;
  taxAmount: number;
  percent?: number;
  taxTypeCode: SelfEmployedVoucherTaxTypeCode;
  taxTypeName?: string;
  /**
   * KDV istisnası — KDV oranı 0 iken ZORUNLU (şematron `TaxExemptionReasonCheck`).
   * Üretimde kullanılan kod **351**'dir (prod ölçümü; `350` değil).
   */
  taxExemptionReasonCode?: string;
  taxExemptionReason?: string;
}

/** e-SMM vergi toplamı — TEK `cac:TaxTotal`, N alt toplam. */
export interface SelfEmployedVoucherTaxTotalInput {
  taxAmount: number;
  taxSubtotals: SelfEmployedVoucherTaxSubtotalInput[];
}

/** e-SMM kalemi — `cac:InvoiceLine`. */
export interface SelfEmployedVoucherLineInput {
  /** Satır numarası (numerik dizgi). */
  id: string;
  /** Satır notları — `cbc:Note`. */
  notes?: string[];
  /** Miktar — `cbc:InvoicedQuantity`. */
  invoicedQuantity: number;
  /** Birim kodu (UnitCodeList). */
  unitCode: string;
  /** Brüt ücret (indirim sonrası) — `cbc:LineExtensionAmount`. */
  lineExtensionAmount: number;
  /** Satır vergi toplamı. */
  taxTotal: SelfEmployedVoucherTaxTotalInput;
  /** Hizmet bilgileri. */
  item: ItemInput;
  /** Birim fiyat. */
  price: PriceInput;
  /** Satır indirimleri/ek yükleri. */
  allowanceCharges?: AllowanceChargeInput[];
}

/**
 * e-SMM ham girdisi.
 *
 * ⚠️ `PaymentMeans` BİLEREK YOKTUR: 12 gerçek prod belgenin **0**'ında geçmiyor.
 * ("5/5 örnekte var" ölçümü sentetik dosyalarımıza aitti — yanlış bir
 * zorunluluk kuralına dönüşmeden düzeltildi.)
 */
export interface SelfEmployedVoucherInput {
  /** Belge numarası: `^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$` */
  id: string;
  /** ETTN — UUID v4 biçimi. */
  uuid: string;
  /** Profil — tek değer (`EARSIVBELGE`). */
  profileId: SelfEmployedVoucherProfileId;
  /** Belge tipi — tek değer (`SERBESTMESLEKMAKBUZU`). */
  voucherTypeCode: SelfEmployedVoucherTypeCode;
  /** Düzenleme tarihi: `YYYY-MM-DD`. */
  issueDate: string;
  /**
   * Düzenleme saati: `HH:mm:ss` — **ZORUNLU**.
   *
   * Faturada `cbc:IssueTime` opsiyoneldir; e-SMM'de 509 sıra no.lu VUK Genel
   * Tebliği IV.4.3-c belge üzerinde saat-dakika bilgisini şart koşar ve 12/12
   * prod belge bunu taşır.
   */
  issueTime: string;
  /** Para birimi kodu (CurrencyCodeList). */
  currencyCode: string;
  /** Belge notları. */
  notes?: string[];
  /**
   * Döviz kuru — `cac:PricingExchangeRate`. TRY dışı belgede ZORUNLU
   * (şematron `CurrencyCodeCheck`, 6 ondalık). e-Arşiv raporunda `dovizKuru`
   * alanı V1.12'den beri zorunludur; dövizli e-SMM normatif olarak öngörülmüştür.
   */
  exchangeRate?: ExchangeRateInput;
  /** Serbest meslek erbabı (düzenleyen). */
  supplier: PartyInput;
  /** Hizmeti alan. */
  customer: PartyInput;
  /**
   * Ek belge referansları. Prod'da `DocumentTypeCode=EXT_SEND_METHOD` ile
   * gönderim şekli (`ELEKTRONIK` / `KAGIT`) taşınır; rapor eşlemesi bunu okur.
   */
  additionalDocuments?: AdditionalDocumentInput[];
  /** Belge seviyesi vergi toplamı — TEK eleman. */
  taxTotal: SelfEmployedVoucherTaxTotalInput;
  /** Parasal toplamlar. */
  legalMonetaryTotal: MonetaryTotalInput;
  /** Kalemler — en az bir tane. */
  lines: SelfEmployedVoucherLineInput[];
}
