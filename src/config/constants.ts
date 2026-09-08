import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';
import { KDV_TAX_CODE } from '../calculator/tax-config';
import { type WithholdingTaxDefinition } from '../calculator/withholding-config';
import { PACKAGING_TYPE_CODE_DEFINITIONS } from '../calculator/package-type-code-config';
import { configManager } from '../calculator/config-manager';
import { derivedSet } from './derived-config';

// ============================================================
// §4 PROFİL × TİP ÇAPRAZ MATRİSİ
// ============================================================

/**
 * Her profil için ÜRETİMDE SUNULAN InvoiceTypeCode'lar.
 *
 * 🔴 Bu matris bir SEÇİM listesidir — "GİB'in tanıdığı tipler" listesi DEĞİL.
 * `getAllowedTypesForProfile` (tip seçici), `resolveTypeForProfile` (profil
 * değişince tip düşürme) ve `validateCrossMatrix` (üretim kapısı) hep buradan
 * beslenir. Bir tipin burada OLMAMASI, o tipin okuma/ayrıştırma yolundan
 * kaldırıldığı anlamına GELMEZ.
 *
 * ── `TEVKIFATIADE` / `YTBTEVKIFATIADE`: üretimde SUNULMAZ, gelen belgede TANINIR
 * İkisi de her profilden ÇIKARILDI. Gerekçe (ölçülmüş, varsayım değil):
 *   1. Şematronda AYIRT EDİCİ kuralları YOK. Onları anan üç kural
 *      (`IADEInvioceCheck` Common:361-362, `YatirimTesvikKDVCheck` Common:495-496,
 *      `YatirimTesvikLineKDVCheck` Common:499-501) hep `IADE`/`YTBIADE` ile aynı
 *      VEYA-grubuna koyar — yani "tevkifatlı iade" ayrı bir davranış üretmez.
 *   2. `WITHHOLDING_ALLOWED_TYPES`'ta DEĞİLLER (aşağıya bak): tevkifat toplamı
 *      TAŞIYAMAZLAR. Tevkifat taşıyamayan bir "tevkifat iadesi" tipi, `IADE`nin
 *      adı farklı bir kopyasından ibarettir; kullanıcıya iki isim sunmak,
 *      birinin GİB'de reddedileceği izlenimini gizler.
 * 🔴 ENUM'DAN VE OKUMA YOLUNDAN ÇIKARILMADILAR: `InvoiceTypeCode.TEVKIFATIADE`
 * ve `.YTBTEVKIFATIADE` duruyor; `IADE_GROUP` (invoice-rules.ts), `isIade`
 * türetmeleri, `billingReference` zorunluluğu, `IADE_GROUP_TYPES` ve
 * `KDV_ZERO_EXEMPTION_EXCLUDED_TYPES` aynen korundu. BAŞKA bir entegratörden
 * bu tiplerle GELEN fatura okunabilir/gösterilebilir kalmalı — yalnız BİZ
 * üretirken sunmuyoruz.
 */
export const PROFILE_TYPE_MATRIX: Record<InvoiceProfileId, ReadonlySet<InvoiceTypeCode>> = {
  [InvoiceProfileId.TEMELFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH,
    InvoiceTypeCode.IHRACKAYITLI, InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU,
    InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  [InvoiceProfileId.TICARIFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU, InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  [InvoiceProfileId.IHRACAT]: new Set([InvoiceTypeCode.ISTISNA]),
  [InvoiceProfileId.YOLCUBERABERFATURA]: new Set([InvoiceTypeCode.ISTISNA]),
  [InvoiceProfileId.OZELFATURA]: new Set([InvoiceTypeCode.ISTISNA]),
  [InvoiceProfileId.KAMU]: new Set([
    // Sprint 9: IADE, Schematron 20260701 `IADEInvioceCheck` ile KAMU profiline eklendi.
    InvoiceTypeCode.SATIS, InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH,
    InvoiceTypeCode.IHRACKAYITLI, InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU,
    InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  /**
   * HKS (Hal Kayıt Sistemi) — GİB tip KISITI KOYMUYOR, ama İKİ DÜZLEM VAR.
   *
   * ── Şematron gerçeği
   * `ProfileID`/`InvoiceTypeCode` çiftini yalnız şu profiller için kısıtlıyor:
   * ENERJI (↔SARJ/SARJANLIK), ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS, artı
   * `TEKNOLOJIDESTEK`→EARSIVFATURA ve `IADE` tipi için profil listesi. HKS bu
   * kuralların HİÇBİRİNDE geçmiyor — GİB'in HKS için TEK belge şartı
   * `HKSInvioceCheck` (Common:357-359): her kalemde 19 karakterli KUNYENO.
   *
   * ── 🔑 İKİ DÜZLEM (bu matrisin buradaki asıl bilgisi)
   * Şematron kısıtlamasa da hal faturası İKİ AYRI DÜZLEMDE kesilir ve tip adı
   * düzleme göre DEĞİŞİR — GİB'in referans XSLT'si kapıyı böyle açar:
   *   • e-Fatura düzlemi : `ProfileID=HKS`          + tip `SATIS` / `KOMISYONCU`
   *   • e-Arşiv düzlemi  : `ProfileID=EARSIVFATURA` + tip `HKSSATIS` / `HKSKOMISYONCU`
   * `HKSSATIS`/`HKSKOMISYONCU` bu yüzden buradan ÇIKARILDI ve EARSIVFATURA
   * kümesine TAŞINDI (orada hiç yoklardı — e-Arşiv HKS düzlemi erişilemezdi).
   * Beşi de canlı şematrondan 0 ihlalle geçti (paket 20260701, gerçek bir HKS
   * faturası üzerinde profil/tip değiştirilerek):
   *   HKS+SATIS ✓  HKS+KOMISYONCU ✓  HKS+TEVKIFAT ✓
   *   EARSIVFATURA+HKSSATIS ✓  EARSIVFATURA+HKSKOMISYONCU ✓
   *
   * `KOMISYONCU` buraya YENİ girdi: e-Fatura düzleminde komisyoncu faturası
   * hiç kesilemiyordu (gerçek bir boşluktu, GİB kısıtı değil).
   *
   * 🔴 IADE BİLEREK YOK: şematron `InvoiceTypeCodeCheck` ile reddediyor —
   * "Fatura tipi IADE iken profil sadece TEMELFATURA, EARSIVFATURA,
   * ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS veya KAMU olabilir". Ölçüldü, reddedildi.
   * `TEVKIFATIADE` de yok — gerekçesi matrisin başındaki blokta.
   *
   * 🔑 SIRA KRİTİK: `resolveTypeForProfile` boş girdide `allowed[0]`'ı seçer,
   * yani BU KÜMENİN İLK ELEMANI HKS'in varsayılan tipidir. Eskiden `HKSSATIS`
   * idi; artık `SATIS`. Sıra değiştirilirse varsayılan sessizce kayar —
   * `SATIS` başta kalmalı.
   */
  [InvoiceProfileId.HKS]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.ISTISNA,
    InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.KOMISYONCU,
  ]),
  [InvoiceProfileId.ENERJI]: new Set([
    InvoiceTypeCode.SARJ, InvoiceTypeCode.SARJANLIK,
  ]),
  [InvoiceProfileId.ILAC_TIBBICIHAZ]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.IADE, InvoiceTypeCode.IHRACKAYITLI,
  ]),
  [InvoiceProfileId.YATIRIMTESVIK]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE,
    InvoiceTypeCode.TEVKIFAT,
  ]),
  [InvoiceProfileId.IDIS]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE,
    InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.IHRACKAYITLI,
  ]),
  /*
   * ⚠️ SIRA: `SATIS` ilk eleman olarak KALMALI — e-Arşiv'in varsayılan tipidir
   * (`resolveTypeForProfile` → `allowed[0]`). HKS düzlemi tipleri SONA eklendi.
   */
  [InvoiceProfileId.EARSIVFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH,
    InvoiceTypeCode.IHRACKAYITLI, InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU,
    InvoiceTypeCode.KONAKLAMAVERGISI, InvoiceTypeCode.TEKNOLOJIDESTEK,
    InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBISTISNA,
    InvoiceTypeCode.YTBTEVKIFAT,
    // HKS'in e-Arşiv düzlemi — bkz. HKS bloğundaki "İKİ DÜZLEM" notu.
    InvoiceTypeCode.HKSSATIS, InvoiceTypeCode.HKSKOMISYONCU,
  ]),
};

// ============================================================
// §2 TİP-BAZLI GRUPLAR
// ============================================================

/**
 * İade grubu: BillingReference zorunlu.
 *
 * ⚠️ `TEVKIFATIADE`/`YTBTEVKIFATIADE` burada BİLEREK DURUYOR: bu bir DAVRANIŞ
 * kümesidir, seçim listesi değil. İkisi `PROFILE_TYPE_MATRIX`'ten çıkarıldı
 * (üretimde sunulmaz) ama GELEN belgede tanınır — o belgenin `BillingReference`
 * zorunluluğu da tanınmalı, yoksa okuma yolu sessizce eksik doğrular.
 */
export const IADE_GROUP_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFATIADE,
  InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBTEVKIFATIADE,
]);

/** Tevkifat grubu: WithholdingTaxTotal beklenir */
export const TEVKIFAT_GROUP_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.YTBTEVKIFAT,
]);

/** WithholdingTaxTotal kullanılabilir tipler */
/**
 * `cac:WithholdingTaxTotal` taşıyabilen fatura tipleri — ŞEMATRONUN BİREBİR LİSTESİ.
 *
 * Kaynak: `UBL-TR_Common_Schematron.xml` · `GeneralWithholdingTaxTotalCheck`
 *   "cac:WithholdingTaxTotal elamanı varken fatura tipi TEVKIFAT, YTBTEVKIFAT,
 *    IADE, YTBIADE, SGK, SARJ ve SARJANLIK olabilir."
 *
 * 🔴 Eskiden burada 9 tip vardı: `TEVKIFATIADE` ve `YTBTEVKIFATIADE` FAZLADANDI.
 * Canlı doğrulandı (paket 20260701): `TEVKIFATIADE` + `WithholdingTaxTotal`
 * → `GeneralWithholdingTaxTotalCheck` reddi. Yani kütüphane, GİB'in kabul
 * etmeyeceği bir kombinasyona izin veriyordu.
 *
 * Sahadaki doğru yapı: TEVKİFATLI İADE = tip `IADE` + kalemlerde tevkifat kodu.
 * `IADE` bu listede zaten var; eksik olan, seçicinin ona açılmasıydı (bkz.
 * `deriveFieldVisibility`, eski B-79 kararı).
 */
export const WITHHOLDING_ALLOWED_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.YTBTEVKIFAT,
  InvoiceTypeCode.IADE, InvoiceTypeCode.YTBIADE,
  InvoiceTypeCode.SGK, InvoiceTypeCode.SARJ, InvoiceTypeCode.SARJANLIK,
]);

/** İstisna grubu: TaxExemptionReasonCode zorunlu */
export const ISTISNA_GROUP_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.ISTISNA, InvoiceTypeCode.YTBISTISNA,
]);

/** KDV 0 muafiyet sebebi gerekmeyenler */
export const KDV_ZERO_EXEMPTION_EXCLUDED_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.IADE, InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.SGK,
  InvoiceTypeCode.IHRACKAYITLI, InvoiceTypeCode.KONAKLAMAVERGISI, InvoiceTypeCode.YTBIADE,
]);

/** YTB (Yatırım Teşvik e-Arşiv) grubu */
export const YTB_GROUP_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBISTISNA,
  InvoiceTypeCode.YTBTEVKIFAT, InvoiceTypeCode.YTBTEVKIFATIADE,
]);

/**
 * Yatırım Teşvik validator — İADE tipleri (B-08).
 * Schematron YatirimTesvikKDVCheck (satır 483-485) + YatirimTesvikLineKDVCheck (487-490):
 * "IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE tipleri HARİÇ — diğer tiplerde KDV > 0 zorunlu"
 */
export const YATIRIM_TESVIK_IADE_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFATIADE,
  InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBTEVKIFATIADE,
]);

/**
 * Yatırım Teşvik validator — EARSIVFATURA profilinde scope içine giren YTB tipleri (B-08).
 * Schematron `$YatirimTesvikEArsivInvoiceTypeCodeList` değişkenine karşılık gelir.
 */
export const YATIRIM_TESVIK_EARSIV_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBTEVKIFAT, InvoiceTypeCode.YTBISTISNA,
]);

/**
 * Schematron `$YatirimTesvikEArsivInvoiceTypeCodeList` — **5 tipin tamamı** (Sprint 9).
 *
 * `YATIRIM_TESVIK_EARSIV_TYPES` (yukarıda, 3 tip) ile KARIŞTIRMA. O sabit B-08 KDV
 * kontrolüne ait ve IADE türevlerini `YATIRIM_TESVIK_IADE_TYPES` erken-return'ü ile
 * ayrıca elediği için kısaltılmış haldedir. `TaxExemptionReasonCodeCheck` böyle bir
 * eleme yapmaz — Schematron değişkeninin tamamına ihtiyaç duyar.
 *
 * @see YATIRIM_TESVIK_ONLY_EXEMPTION_CODES
 */
export const YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBISTISNA,
  InvoiceTypeCode.YTBTEVKIFAT, InvoiceTypeCode.YTBTEVKIFATIADE,
]);

/**
 * Yalnız Yatırım Teşvik kapsamında geçerli istisna kodları — Schematron
 * `$YatirimTesvikTaxExemptionReasonCodeType` (Schematron 20260701, Sprint 9).
 *
 * 308 ve 339, 20260701 paketinde genel `$TaxExemptionReasonCodeType` listesinden
 * ÇIKARILDI ve bu ayrı değişkene alındı. Artık yalnız
 * `ProfileID='YATIRIMTESVIK'` **veya**
 * `InvoiceTypeCode ∈ YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES` olduğunda geçerli.
 *
 * **Bilgi katmanı şerhi:** UBL-TR Kod Listeleri v1.43 metni ile Schematron ayrışıyor;
 * GİB kapıda Schematron çalıştırdığı için **Schematron esas alınmıştır**.
 */
export const YATIRIM_TESVIK_ONLY_EXEMPTION_CODES = new Set<string>(['308', '339']);

// ============================================================
// §6 KOD LİSTELERİ
// ============================================================

/**
 * Tevkifat kodu+yüzde kombinasyonları — WithholdingTaxTypeWithPercent (UBL-TR Codelist v1.42 §4.9).
 * Format: `${code}${percent padded to 2 digits}` (8xx tam tevkifat → `${code}100`).
 * 650 dinamik kodu için 65000-65099 tüm aralık üretilir (kullanıcı 0-99 arası percent seçebilir).
 */
function deriveWithholdingCombos(defs: ReadonlyArray<WithholdingTaxDefinition>): Set<string> {
  const combos = new Set<string>();
  for (const def of defs) {
    if (def.dynamicPercent) {
      for (let p = 0; p < 100; p++) {
        combos.add(`${def.code}${String(p).padStart(2, '0')}`);
      }
    } else if (def.percent === 100) {
      combos.add(`${def.code}100`);
    } else {
      combos.add(`${def.code}${String(def.percent).padStart(2, '0')}`);
    }
  }
  return combos;
}

/**
 * Vergi tipi kodları — **CANLI** `configManager` türevi (M7 + 4.1.0 enjeksiyon dikişi).
 *
 * Varsayılanda `tax-config.ts`'teki `TAX_DEFINITIONS`'tan türer (`configManager`
 * kendisi bu statikle tohumlanır). `configManager.updateTaxes()` / `initialize()`
 * çağrıldığında bu `Set` **yerinde** tazelenir — nesne kimliği korunur.
 * KDV (`0015`) her zaman içeridedir; `configManager.isValidTaxCode()` ile birebir
 * aynı kabul kümesidir.
 *
 * @see ./derived-config.ts — yaklaşım gerekçesi ve geriye uyumluluk tablosu
 */
export const TAX_TYPE_CODES = derivedSet<string>(() => [
  KDV_TAX_CODE,
  ...configManager.taxes.map(t => t.code),
]);

/** Tevkifat vergi tipi kodları — **CANLI** `configManager` türevi. 650 dahil. */
export const WITHHOLDING_TAX_TYPE_CODES = derivedSet<string>(() =>
  configManager.withholdingTaxes.map(w => w.code),
);

/** Tevkifat vergi kodu+yüzde kombinasyonları — **CANLI** türev. B-04 regenerate. */
export const WITHHOLDING_TAX_TYPE_WITH_PERCENT = derivedSet<string>(() =>
  deriveWithholdingCombos(configManager.withholdingTaxes),
);

/** İstisna vergi muafiyet sebebi kodları — **CANLI** `configManager` türevi. */
export const ISTISNA_TAX_EXEMPTION_REASON_CODES = derivedSet<string>(() =>
  configManager.exemptions.filter(e => e.documentType === 'ISTISNA').map(e => e.code),
);

/** Özel matrah vergi muafiyet sebebi kodları — **CANLI** `configManager` türevi. */
export const OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES = derivedSet<string>(() =>
  configManager.exemptions.filter(e => e.documentType === 'OZELMATRAH').map(e => e.code),
);

/** İhraç kayıtlı vergi muafiyet sebebi kodları — **CANLI** `configManager` türevi. */
export const IHRAC_EXEMPTION_REASON_CODES = derivedSet<string>(() =>
  configManager.exemptions.filter(e => e.documentType === 'IHRACKAYITLI').map(e => e.code),
);

/**
 * 555 (Demirbaş KDV / Bedelsiz Demirbaş İstisnası) — ayrı set.
 * `BuilderOptions.allowReducedKdvRate` flag ile gate edilir (M4).
 * ISTISNA whitelist'ine dahil değil.
 */
export const DEMIRBAS_KDV_EXEMPTION_CODES = new Set<string>(['555']);

/**
 * 351 (KDV İstisna Olmayan Diğer) non-ISTISNA kodu — ayrı set.
 * Cross-check matrisi M5 (Sprint 5) ile netleşecek.
 */
export const NON_ISTISNA_REASON_CODES = new Set<string>(['351']);

/** Birim kodları — **CANLI** `configManager` türevi (M7, yeni). */
export const UNIT_CODES = derivedSet<string>(() => configManager.units.map(u => u.code));

/**
 * Paket/Kap cins kodları — package-type-code-config türev (M7, yeni).
 *
 * **CANLI DEĞİL** (bilinçli): `configManager` paket cinsi listesi için bir
 * override yüzeyi sunmuyor (`ConfigInitOptions`'ta `packagingTypes` alanı yok).
 * O yüzden enjekte edilecek bir kaynak da yok. `configManager`'a bu liste
 * eklenirse burası da `derivedSet` yapılmalıdır.
 */
export const PACKAGING_TYPE_CODES = new Set<string>(
  PACKAGING_TYPE_CODE_DEFINITIONS.map(p => p.code),
);

/**
 * Para birimi taban whitelist'i (ISO 4217) — `CURRENCY_CODES`'un DEĞİŞMEZ çekirdeği.
 *
 * B-28 uygulandı: TRL (eski Türk Lirası) çıkarıldı.
 */
const CURRENCY_CODE_BASELINE: ReadonlyArray<string> = [
  'TRY', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK',
  'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'CNY', 'INR',
  'BRL', 'MXN', 'ZAR', 'KRW', 'SGD', 'HKD', 'NZD', 'THB', 'MYR', 'IDR',
  'PHP', 'TWD', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'ILS',
  'JOD', 'LBP', 'TND', 'MAD', 'DZD', 'LYD', 'SDG', 'IRR', 'IQD', 'SYP',
  'PKR', 'AFN', 'AZN', 'GEL', 'KZT', 'UZS', 'TMT', 'KGS', 'TJS', 'AMD',
  'BAM', 'MKD', 'RSD', 'ALL', 'MDL', 'UAH', 'BYN', 'ISK',
];

/**
 * Para birimi kodları (ISO 4217) — taban liste **∪** `configManager.currencies`.
 *
 * **M7 NOT (güncellendi):** `currency-config.ts` 30 tanım içerirken bu whitelist 68
 * kod kabul ediyor. İkisini eşitlemek (config'i 68'e çıkarmak ya da whitelist'i
 * 30'a indirmek) kırıcı olurdu. Onun yerine **BİRLEŞİM** alınır:
 *
 * - Taban liste hiç daralmaz → mevcut davranış birebir korunur
 *   (varsayılanda `CURRENCY_DEFINITIONS ⊂ CURRENCY_CODE_BASELINE`, yani
 *   varsayılan küme 68 kodda sabit kalır).
 * - `configManager.updateCurrencies()` ile enjekte edilen YENİ kodlar
 *   doğrulayıcı tarafından da kabul edilir (enjeksiyon dikişi kapanır).
 *
 * Merkezî katalog whitelist'i **daraltmak** isterse `configManager` bunu yapamaz;
 * daraltma kırıcı olacağı için bilinçli olarak kapsam dışı bırakıldı.
 */
export const CURRENCY_CODES = derivedSet<string>(() => [
  ...CURRENCY_CODE_BASELINE,
  ...configManager.currencies.map(c => c.code),
]);

/** INCOTERMS teslimat koşulları kodları */
export const DELIVERY_TERM_CODES = new Set([
  'CFR', 'CIF', 'CIP', 'CPT', 'DAF', 'DDP', 'DDU', 'DEQ', 'DES',
  'EXW', 'FAS', 'FCA', 'FOB', 'DAP', 'DPU',
]);

/** Taşıma modu kodları */
export const TRANSPORT_MODE_CODES = new Set([
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
]);

/** Yatırım Teşvik harcama tipi kodları */
export const YTB_ITEM_CLASSIFICATION_CODES = new Set([
  '01', '02', '03', '04',
]);

/**
 * Taraf kimlik schemeID literal union (Sprint 8m.1 / v2.2.5 — Library Öneri #7).
 *
 * UBL TR-Identifier şema kodları (B-69, `PartyIdentification.schemeID`).
 * Tüketicilerin (Mimsoft form akışı, UI label/option map'leri) `Record<PartyIdentificationSchemeId, string>`
 * narrow map kurması için public re-export edilir. Library evrimleşirse (yeni scheme
 * eklenirse) tüketici tarafında TS hatası ile drift yakalanır.
 *
 * **VKN ve TCKN hariç tutuldu** — bunlar `party.taxNumber` alanında ayrı yönetilir
 * (`SimplePartyInput.taxNumber`); `PartyIdentification.schemeID` UI akışında
 * "ek tanımlayıcı" rolünde kullanılır. Runtime `PARTY_IDENTIFICATION_SCHEME_IDS`
 * seti bu iki kodu **dahil eder** (despatch validator'ları için gerekli).
 */
export type PartyIdentificationSchemeId =
  | 'HIZMETNO'
  | 'MUSTERINO'
  | 'TESISATNO'
  | 'TELEFONNO'
  | 'DISTRIBUTORNO'
  | 'TICARETSICILNO'
  | 'TAPDKNO'
  | 'BAYINO'
  | 'ABONENO'
  | 'SAYACNO'
  | 'EPDKNO'
  | 'SUBENO'
  | 'PASAPORTNO'
  | 'ARACIKURUMETIKET'
  | 'ARACIKURUMVKN'
  | 'CIFTCINO'
  | 'IMALATCINO'
  | 'DOSYANO'
  | 'HASTANO'
  | 'MERSISNO'
  | 'URETICINO'
  | 'GTB_REFNO'
  | 'GTB_GCB_TESCILNO'
  | 'GTB_FIILI_IHRACAT_TARIHI'
  | 'ARACKIMLIKNO'
  | 'PLAKA'
  | 'SEVKIYATNO';

/**
 * Taraf kimlik schemeID değerleri (runtime set).
 *
 * `PartyIdentificationSchemeId` (UI narrow tip, 27 entry) ile **VKN + TCKN ek**
 * (validator runtime için zorunlu). Despatch validator'ları (`despatch-validators.ts`)
 * bu seti `set.has(schemeId)` ile kullanır; tip parametresi `string` kalır
 * (runtime'da TCKN/VKN'yi de yakalaması için).
 */
export const PARTY_IDENTIFICATION_SCHEME_IDS = new Set<string>([
  'TCKN', 'VKN', 'HIZMETNO', 'MUSTERINO', 'TESISATNO', 'TELEFONNO',
  'DISTRIBUTORNO', 'TICARETSICILNO', 'TAPDKNO', 'BAYINO', 'ABONENO',
  'SAYACNO', 'EPDKNO', 'SUBENO', 'PASAPORTNO', 'ARACIKURUMETIKET',
  'ARACIKURUMVKN', 'CIFTCINO', 'IMALATCINO', 'DOSYANO', 'HASTANO',
  'MERSISNO', 'URETICINO', 'GTB_REFNO', 'GTB_GCB_TESCILNO',
  'GTB_FIILI_IHRACAT_TARIHI', 'ARACKIMLIKNO', 'PLAKA', 'SEVKIYATNO',
]);

/** Ek ürün kimlik schemeID değerleri. B-88 uygulandı: BILGISAYAR çıkarıldı. */
export const ADDITIONAL_ITEM_ID_SCHEME_IDS = new Set([
  'TELEFON', 'TABLET_PC', 'KUNYENO',
  'ILAC', 'TIBBICIHAZ', 'DIGER', 'ETIKETNO',
]);

/**
 * Ödeme şekli kodları (`cbc:PaymentMeansCode`) — GİB'in KABUL ETTİĞİ TAM KÜME.
 *
 * Kaynak: şematron `$PaymentMeansCodeTypeList` (`schematrons/UBL-TR_Codelist.xml:58`),
 * UN/EDIFACT 4461 tablosunun GİB tarafından DARALTILMIŞ hâli — 75 kod:
 * `1-53`, `60-67`, `70`, `74-78`, `91-97`, `ZZZ`. (Ara kodlar — 54-59, 68-69,
 * 71-73, 79-90, 98-99 — listede YOKTUR; aralık yazıp genişletmek GİB'in
 * reddedeceği kodları geçerli saymak olurdu, bu yüzden liste ELLE yazılıdır.)
 *
 * 🔑 **Bu küme GERÇEKTEN DAYATILIYOR.** "Kod listesinde tanımlı" ile "şematron
 * dayatıyor" ayrı şeylerdir (bkz. `AdditionalItemIdentificationIDType` — tanımlı
 * ama hiçbir `sch:assert` okumuyor). Burada dayatma ölçüldü:
 *   • kural: `PaymentMeansCodeCheck` (`UBL-TR_Common_Schematron.xml:407-409`)
 *   • bağlam: `inv:Invoice/cac:PaymentMeans/cbc:PaymentMeansCode`
 *     (`UBL-TR_Main_Schematron.xml:292-294`)
 * Yani listede olmayan bir kod GİB kapısından DÖNER.
 *
 * 🔴 4.5.3 — ESKİ HÂLİ 20 KODLUK BİR TAHMİNDİ ve HİÇBİR TÜKETİCİSİ YOKTU (ölü
 * sabit). "Geniş whitelist" diye anılıyordu ama şematronun kabul ettiği 75 kodun
 * yalnız 20'sini içeriyordu; `30` (Havale) gibi meşru kodlar dışarıda kalmıştı.
 * Artık şematron kümesinin TEK tanımıdır ve `isValidPaymentMeansCode` onu okur.
 *
 * ⚠️ Paket dışına AÇILMAZ. 4.5.1'in dışa açma ölçütü "(a) genel bir bayrak alanı
 * bu kümeyi istiyor, (b) başka genel erişimci YOK" idi; burada (b) sağlanmıyor —
 * `isValidPaymentMeansCode` zaten genel erişimcidir. Tüketici kümeyi kopyalamak
 * yerine yüklemi çağırır.
 */
export const PAYMENT_MEANS_CODES = new Set<string>([
  // 1-53 — kesintisiz
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
  '41', '42', '43', '44', '45', '46', '47', '48', '49', '50',
  '51', '52', '53',
  // 60-67
  '60', '61', '62', '63', '64', '65', '66', '67',
  // 70 · 74-78
  '70', '74', '75', '76', '77', '78',
  // 91-97
  '91', '92', '93', '94', '95', '96', '97',
  // karşılığı olmayan/diğer
  'ZZZ',
]);

/**
 * Plaka schemeID değerleri — Schematron `$LicensePlateIDSchemeIDType`.
 *
 * Sprint 9 (Schematron 20260701): 2 → 6 değer. Yabancı plakalar için ayrı
 * `YABANCI*` varyantları eklendi.
 */
export const LICENSE_PLATE_SCHEME_IDS = new Set([
  'PLAKA', 'DORSE', 'DORSEPLAKA',
  'YABANCIPLAKA', 'YABANCIDORSE', 'YABANCIDORSEPLAKA',
]);

/** Yabancı plaka schemeID'leri — TR format kontrolünden muaf, ayrı regex'e tabi */
export const FOREIGN_LICENSE_PLATE_SCHEME_IDS = new Set([
  'YABANCIPLAKA', 'YABANCIDORSE', 'YABANCIDORSEPLAKA',
]);

/** Muhasebe maliyet kodları */
export const ACCOUNTING_COST_CODES = new Set([
  'SAGLIK_ECZ', 'SAGLIK_HAS', 'SAGLIK_OPT', 'SAGLIK_MED',
  'ABONELIK', 'MAL_HIZMET', 'DIGER',
]);

// ============================================================
// FORMAT REGEXLERİ
// ============================================================

/** Fatura ID formatı: 3 harf/rakam + 20XX + 9 rakam */
export const INVOICE_ID_REGEX = /^[A-Z0-9]{3}20[0-9]{2}[0-9]{9}$/;

/** UUID formatı */
export const UUID_REGEX = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/;

/** Tarih formatı: YYYY-MM-DD */
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Saat formatı: HH:mm:ss — XML'e YAZILAN biçim (XSD `xs:time` bunu ister). */
export const TIME_REGEX = /^\d{2}:\d{2}:\d{2}$/;

/**
 * Saat GİRDİ formatı: `HH:mm` veya `HH:mm:ss` (opsiyonel saniye kesri + saat dilimi).
 *
 * Neden ayrı bir desen: portalın saat girişi (`<input type="time">`) varsayılan olarak
 * `HH:mm` üretir — saniyesiz. Kullanıcıyı ":00" yazmaya zorlamak yerine girdiyi kabul
 * edip serileştirmede `normalizeTime` ile saniyeyi tamamlıyoruz. Yani DOĞRULAMA bu
 * gevşek deseni, XML'e YAZMA ise `TIME_REGEX` biçimini kullanır.
 */
export const TIME_INPUT_REGEX =
  /^(\d|[01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

/** Decimal format: max 15 önce, max 2 sonra */
export const DECIMAL_REGEX = /^-?\d{1,15}(\.\d{1,2})?$/;

/** Döviz kuru decimal: max 15 önce, max 6 sonra */
export const EXCHANGE_RATE_REGEX = /^\d{1,15}(\.\d{1,6})?$/;

/** Türkiye IBAN formatı */
export const TR_IBAN_REGEX = /^TR\d{7}[A-Z0-9]{17}$/;

/** TCKN formatı: 11 hane numeric (Skill §7.1) */
export const TCKN_REGEX = /^\d{11}$/;

/** VKN formatı: 10 hane numeric */
export const VKN_REGEX = /^\d{10}$/;

/**
 * TR plaka formatı — Schematron `LicensePlateIDSchemeIDCheck` (20260701, Sprint 9).
 *
 * `^(0[1-9]|[1-7][0-9]|8[01])[A-Z]+[0-9]+$` — il kodu 01-81, ardından en az bir
 * büyük harf ve en az bir rakam. `PLAKA`, `DORSE`, `DORSEPLAKA` schemeID'lerine uygulanır.
 *
 * NOT: Enerji/Şarj faturalarındaki müşteri PLAKA kimliği bu regex'e **tabi değildir**
 * — orada Schematron `^[A-Z0-9_-]+$` kullanıyor (`ENERJI_PLATE_REGEX`).
 */
export const TR_LICENSE_PLATE_REGEX = /^(0[1-9]|[1-7][0-9]|8[01])[A-Z]+[0-9]+$/;

/**
 * Yabancı plaka formatı — Schematron `LicensePlateIDSchemeIDCheck` (20260701, Sprint 9).
 *
 * `YABANCIPLAKA`, `YABANCIDORSE`, `YABANCIDORSEPLAKA` schemeID'lerine uygulanır.
 */
export const FOREIGN_LICENSE_PLATE_REGEX = /^[A-Z0-9_-]+$/;

/**
 * SEVKIYATNO formatı: `SE-0000000` **veya** `ES-0000000`.
 *
 * Sprint 9 (Schematron 20260701, History.txt md.7 ve 9): `IdisSevkiyatNoCheck` ve
 * `DespatchIdisSevkiyatNoCheck` artık `ES-` prefix'ini de kabul ediyor. Gevşetme —
 * geriye dönük uyumlu.
 */
export const SEVKIYAT_NO_REGEX = /^(SE|ES)-\d{7}$/;

// ─── Enerji / Şarj (Sprint 9, Schematron 20260701) ──────────────────────────

/**
 * Enerji/Şarj müşteri plaka formatı — `EnerjiPartyIdentificationPlakaCheck`.
 *
 * ⚠️ `TR_LICENSE_PLATE_REGEX`'ten FARKLI: burada il kodu (01-81) kuralı YOKTUR.
 * İki regex bilinçli olarak ayrı tutulmuştur; Schematron da ayrı tanımlar.
 */
export const ENERJI_PLATE_REGEX = /^[A-Z0-9_-]+$/;

/** Enerji/Şarj müşteri plaka azami uzunluğu — Schematron `string-length(...) <= 50` */
export const ENERJI_PLATE_MAX_LENGTH = 50;

/** Enerji/Şarj InvoicePeriod asgari tarihi — Schematron `xs:date('2005-01-01+04:00')` */
export const ENERJI_PERIOD_MIN_DATE = '2005-01-01';

/** ESU rapor referansının schemeID değeri — `EnerjiESURaporIDCheck` */
export const ESU_RAPOR_ID_SCHEME_ID = 'ESURaporID';

/** ESU rapor IssueDate formatı — Schematron `^20\d{2}-\d{2}-\d{2}$` (20xx zorunlu) */
export const ESU_RAPOR_ISSUE_DATE_REGEX = /^20\d{2}-\d{2}-\d{2}$/;

/** ETIKETNO formatı: 2 harf + 7 rakam */
export const ETIKET_NO_REGEX = /^[A-Z]{2}\d{7}$/;

/** Posta kodu formatı: TR */
export const POSTAL_ZONE_REGEX = /^((0[1-9])|([1-7][0-9])|(8[0-1]))\d{3}$/;

/** TaxTypeCode 4171 kullanılabilir tipler */
export const TAX_4171_ALLOWED_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.IADE,
  InvoiceTypeCode.SGK, InvoiceTypeCode.YTBIADE,
]);
