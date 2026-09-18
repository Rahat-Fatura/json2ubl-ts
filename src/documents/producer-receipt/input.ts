/**
 * e-MM (Müstahsil Makbuzu) HAM girdi sözleşmesi — KATMAN 3.
 *
 * ── 🔴 TARAF ROLLERİ TERSİNE DÖNER — BU BELGENİN EN KOLAY YANLIŞ ANLAŞILANI ──
 * Müstahsil makbuzunu **satıcı DEĞİL, ALICI düzenler**. Defterde kayıtlı olmayan
 * çiftçiden (müstahsil) mal alan tüccar/şirket, satıcının kesemediği belgeyi
 * kendi keser (VUK 235). Yani:
 *
 *   | Gerçek rol          | UBL yeri                    | Bu arayüzdeki ad |
 *   |---------------------|-----------------------------|------------------|
 *   | Belgeyi DÜZENLEYEN  | `cac:AccountingSupplierParty` | `issuer`        |
 *   | Malı SATAN müstahsil| `cac:AccountingCustomerParty` | `producer`      |
 *
 * ⚠️ Ekonomik sezgi TERSİNİ söyler: malı satan taraf "supplier" olmalıymış gibi
 * gelir. Prod ÖLÇÜLDÜ ve sezgi YANLIŞ çıktı: 27/27 belgede `Customer` tarafı
 * `cac:Person` + TCKN taşıyor (= müstahsil, gerçek kişi) ve `Supplier` tarafı
 * `cac:PartyName` + VKN/MERSİSNO taşıyor (= tüccar, tüzel kişi).
 *
 * 🔑 Alanlar bu yüzden `supplier`/`customer` DEĞİL `issuer`/`producer` adını
 * taşır. Tüketici "hangi tarafı nereye yazacağım" sorusunu TAHMİN ETMEK zorunda
 * kalmamalıdır; eşleme `mapper.ts`te tek satırdır ve bir daha akıl yürütülmez.
 * (e-SMM'de aynı soru yoktur: orada belgeyi düzenleyen ZATEN satıcıdır.)
 *
 * ── GÖVDE FORMATI GİB TARAFINDAN DAYATILMAZ ────────────────────────────────
 * e-SMM'de olduğu gibi e-MM belge GÖVDESİ için de yayınlanmış kılavuz/XSD/
 * şematron YOKTUR; normatif olan e-Arşiv RAPOR katmanıdır. Fark şu: e-MM'de
 * sahada YERLEŞİK bir gövde var ve biz onu ölçtük. 27/27 prod belge
 * `CreditNote` kökü + `EARSIVBELGE` + `MUSTAHSILMAKBUZ` + `TR1.2` + UBL 2.1
 * taşıyor. Varsayılanı uydurmuyoruz, SAHADAN OKUYORUZ.
 *
 * ── VERGİ DÜZLEMİ: HEPSİ KESİNTİ ───────────────────────────────────────────
 * e-MM'de `cac:TaxTotal` altındaki her alt toplam müstahsile ödenecek tutardan
 * DÜŞER. KDV YOKTUR — müstahsil KDV mükellefi değildir. Bu, faturanın vergi
 * semantiğinin TAM TERSİDİR ve toplam zincirinin şeklini belirler (`totals.ts`).
 *
 * | Kod        | Anlam                    | Kaynak                          |
 * |------------|--------------------------|---------------------------------|
 * | `0003`     | Gelir vergisi stopajı    | GİB kod listesi · GVK 94/11     |
 * | `9040`     | Mera Fonu                | GİB kod listesi · Karekod §2.5  |
 * | `8001`     | Borsa tescil ücreti      | GİB kod listesi · Karekod §2.5  |
 * | `SGK_PRIM` | SGK prim kesintisi       | 🔴 KAYNAKSIZ — bkz. aşağıda     |
 *
 * 🔑 TABLONUN SIRASI GİB'İN KENDİ SAYIMIDIR — alfabetik ya da keyfi DEĞİL.
 * Karekod Standardı Kılavuzu V1.2 §2.5 e-MM karekodunun alanlarını tam bu
 * sırayla sayar: `gvstopaj` → `merafonu` → `borsatescilucreti` →
 * `sgkprimkesintisi`, ve DÖRDÜNÜ DE `TaxTotal/TaxSubTotal/TaxAmount`a bağlar.
 * Emit sırası (`mapper.ts::resolveRates`) o sayıma hizalıdır.
 * ⚠️ Kaynak KASIM 2023 tarihlidir. GİB kesinti kümesini genişletirse bu tablo
 * eskir; küme ve sıra o kılavuz yeniden okunarak tazelenmelidir.
 *
 * 🔴 `SGK_PRIM` GİB'in `UBL-TR_Codelist.xml`'inde YOKTUR. Kümede olmasının tek
 * dayanağı ÖLÇÜMDÜR: 25/27 prod belgede geçiyor ve CANLI şematron onu REDDETMİYOR
 * (2026-09-17 ölçümü: `CreditNote` kökünde `TaxTypeCode` üzerinde kod-listesi
 * assert'i HİÇ koşmuyor — uydurma bir kod bile geçiyor). Uydurma değil, ölçülmüş;
 * ama normatif de değil — bu yüzden tek yerde ve işaretli duruyor.
 */

import type { ProducerReceiptProfileId, ProducerReceiptTypeCode } from '../../types/enums';
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
 * e-MM'de kullanılabilen kesinti kodlarının KAPALI kümesi.
 *
 * 🔴 Daraltma TİP DÜZEYİNDEDİR ve burada AYRICA GEREKLİDİR: canlı şematron
 * `CreditNote` kökünde `TaxTypeCode`u DENETLEMİYOR (ölçüldü). Doğrulayıcı
 * tutmadığı için tutacak olan biziz; kapalı küme burada bir kolaylık değil,
 * TEK kapıdır.
 */
export const PRODUCER_RECEIPT_TAX_TYPE_CODES = ['0003', '9040', '8001', 'SGK_PRIM'] as const;

/** e-MM kesinti kodu — `PRODUCER_RECEIPT_TAX_TYPE_CODES` üyesi. */
export type ProducerReceiptTaxTypeCode = (typeof PRODUCER_RECEIPT_TAX_TYPE_CODES)[number];

/** Gelir vergisi stopajı (zirai kazanç, GVK 94/11) — belgenin VARLIK SEBEBİ. */
export const INCOME_TAX_WITHHOLDING_CODE = '0003';
/**
 * Mera Fonu — 4342 sayılı Mera Kanunu kesintisi.
 *
 * GİB kod listesinde VARDIR (`UBL-TR_Codelist.xml`, "Mera Fonu") ve Karekod
 * Standardı Kılavuzu V1.2 §2.5 onu e-MM karekodunun DÖRT kesintisinden biri
 * olarak adıyla sayar (`merafonu`). Yani `SGK_PRIM`in aksine KAYNAKLIDIR —
 * ölçüme değil, yayınlanmış listeye dayanır.
 */
export const PASTURE_FUND_CODE = '9040';
/** Borsa tescil ücreti — ticaret borsasına tescil kesintisi. */
export const EXCHANGE_REGISTRATION_FEE_CODE = '8001';
/** SGK prim kesintisi — 🔴 GİB kod listesinde YOK, prod ölçümü (bkz. dosya başlığı). */
export const SOCIAL_SECURITY_PREMIUM_CODE = 'SGK_PRIM';

/**
 * e-MM kesinti alt toplamı.
 *
 * Yapısal olarak `TaxSubtotalInput` ile uyumludur (string literal union,
 * `string`e atanabilir), bu yüzden ortak `serializeTaxTotal` doğrudan kullanılır.
 *
 * ⚠️ `taxExemptionReason*` alanları YOKTUR: istisna KDV'ye özgü bir kavramdır ve
 * e-MM'de KDV yoktur. Şematron `TaxExemptionReasonCheck` de `CreditNote`
 * kökünde koşmuyor (ölçüldü) — yani alan taşımak hem anlamsız hem karşılıksız
 * olurdu.
 */
export interface ProducerReceiptTaxSubtotalInput {
  /** Matrah — ölçüldü: 25/25 belgede `cbc:LineExtensionAmount`a EŞİT. */
  taxableAmount: number;
  /** Kesinti tutarı — POZİTİF yazılır; işaret toplam zincirinde çözülür. */
  taxAmount: number;
  percent?: number;
  taxTypeCode: ProducerReceiptTaxTypeCode;
  taxTypeName?: string;
}

/** e-MM kesinti toplamı — TEK `cac:TaxTotal`, N alt toplam. */
export interface ProducerReceiptTaxTotalInput {
  taxAmount: number;
  taxSubtotals: ProducerReceiptTaxSubtotalInput[];
}

/** e-MM kalemi — `cac:CreditNoteLine`. */
export interface ProducerReceiptLineInput {
  /** Satır numarası (numerik dizgi). */
  id: string;
  /** Satır notları — `cbc:Note`. */
  notes?: string[];
  /**
   * Miktar — `cbc:CreditedQuantity`.
   *
   * 🔴 Faturadaki `InvoicedQuantity` DEĞİL: `CreditNoteLineType` o elemanı hiç
   * tanımaz. Alan adı tele giden elemanın adını taşır ki "ad ≠ gerçek" sapması
   * doğmasın.
   */
  creditedQuantity: number;
  /** Birim kodu (UnitCodeList) — şematron kod-listesi assert'i CreditNote'ta DA koşar. */
  unitCode: string;
  /** Satır tutarı (indirim sonrası) — `cbc:LineExtensionAmount`. */
  lineExtensionAmount: number;
  /** Satır kesinti toplamı. */
  taxTotal: ProducerReceiptTaxTotalInput;
  /** Ürün bilgileri. */
  item: ItemInput;
  /** Birim fiyat. */
  price: PriceInput;
  /** Satır indirimleri/ek yükleri. */
  allowanceCharges?: AllowanceChargeInput[];
}

/**
 * e-MM ham girdisi.
 *
 * ⚠️ `PaymentMeans` BİLEREK YOKTUR: 27 gerçek prod belgenin **0**'ında geçmiyor
 * (e-SMM'deki ölçümle aynı sonuç).
 */
export interface ProducerReceiptInput {
  /** Belge numarası: `^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$` — 27/27 prod belgede bu biçim. */
  id: string;
  /** ETTN — UUID v4 biçimi. */
  uuid: string;
  /** Profil — tek değer (`EARSIVBELGE`). */
  profileId: ProducerReceiptProfileId;
  /** Belge tipi — tek değer (`MUSTAHSILMAKBUZ`). */
  receiptTypeCode: ProducerReceiptTypeCode;
  /** Düzenleme tarihi: `YYYY-MM-DD`. */
  issueDate: string;
  /**
   * Düzenleme saati: `HH:mm:ss` — **ZORUNLU**.
   *
   * 27/27 prod belge taşır. Gerekçe e-SMM ile aynı ailedendir: makbuz teslim
   * anında düzenlenir ve saat belgenin kendisine aittir.
   */
  issueTime: string;
  /** Para birimi kodu (CurrencyCodeList). */
  currencyCode: string;
  /** Belge notları. */
  notes?: string[];
  /**
   * Teslim tarihi — `cac:Delivery/cbc:ActualDeliveryDate`.
   *
   * 🔴 e-SMM'DE OLMAYAN, e-MM'DE 27/27 OLAN eleman. Makbuz bir MAL TESLİMİNİ
   * belgeler; teslimin tarihi belgenin kendisine aittir. Prod'da 27/27 belgede
   * `cbc:IssueDate` ile AYNI (ölçüldü) — ama eşitlik DAYATILMAZ: geriye dönük
   * düzenlenen bir makbuzda teslim tarihi düzenleme tarihinden eski olabilir.
   * Verilmezse `cac:Delivery` bloğu hiç yazılmaz.
   */
  actualDeliveryDate?: string;
  /**
   * Döviz kuru — `cac:PricingExchangeRate`. TRY dışı belgede ZORUNLU.
   * CANLI ÖLÇÜLDÜ: `CurrencyCodeCheck` `CreditNote` kökünde de patlıyor.
   */
  exchangeRate?: ExchangeRateInput;
  /**
   * Belgeyi DÜZENLEYEN — tüccar/alıcı. `cac:AccountingSupplierParty`.
   * (Rol terslemesi için dosya başlığındaki tabloya bakın.)
   */
  issuer: PartyInput;
  /**
   * MÜSTAHSİL — malı satan çiftçi. `cac:AccountingCustomerParty`.
   * Prod'da 27/27 gerçek kişi (TCKN → `cac:Person`), ama tip bunu DAYATMAZ:
   * müstahsil bir ortaklık ya da tüzel kişi de olabilir.
   */
  producer: PartyInput;
  /**
   * Ek belge referansları. Prod'da `DocumentTypeCode=EXT_SEND_METHOD` ile
   * gönderim şekli taşınır; rapor eşlemesi bunu okur.
   */
  additionalDocuments?: AdditionalDocumentInput[];
  /** Belge seviyesi kesinti toplamı — TEK eleman. */
  taxTotal: ProducerReceiptTaxTotalInput;
  /** Parasal toplamlar. */
  legalMonetaryTotal: MonetaryTotalInput;
  /** Kalemler — en az bir tane. */
  lines: ProducerReceiptLineInput[];
}
