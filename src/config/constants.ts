import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';
import { TAX_DEFINITIONS, KDV_TAX_CODE } from '../calculator/tax-config';
import { WITHHOLDING_TAX_DEFINITIONS, type WithholdingTaxDefinition } from '../calculator/withholding-config';
import { EXEMPTION_DEFINITIONS } from '../calculator/exemption-config';
import { UNIT_DEFINITIONS } from '../calculator/unit-config';
import { PACKAGING_TYPE_CODE_DEFINITIONS } from '../calculator/package-type-code-config';

// ============================================================
// §4 PROFİL × TİP ÇAPRAZ MATRİSİ
// ============================================================

/** Her profil için izin verilen InvoiceTypeCode'lar */
export const PROFILE_TYPE_MATRIX: Record<InvoiceProfileId, ReadonlySet<InvoiceTypeCode>> = {
  [InvoiceProfileId.TEMELFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.TEVKIFATIADE, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH,
    InvoiceTypeCode.IHRACKAYITLI, InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU,
    InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  [InvoiceProfileId.TICARIFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU, InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  [InvoiceProfileId.IHRACAT]: new Set([InvoiceTypeCode.ISTISNA]),
  [InvoiceProfileId.YOLCUBERABERFATURA]: new Set([InvoiceTypeCode.ISTISNA]),
  [InvoiceProfileId.OZELFATURA]: new Set([InvoiceTypeCode.ISTISNA]),
  [InvoiceProfileId.KAMU]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU, InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  [InvoiceProfileId.HKS]: new Set([
    InvoiceTypeCode.HKSSATIS, InvoiceTypeCode.HKSKOMISYONCU,
  ]),
  [InvoiceProfileId.ENERJI]: new Set([
    InvoiceTypeCode.SARJ, InvoiceTypeCode.SARJANLIK,
  ]),
  [InvoiceProfileId.ILAC_TIBBICIHAZ]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.TEVKIFATIADE, InvoiceTypeCode.IADE, InvoiceTypeCode.IHRACKAYITLI,
  ]),
  [InvoiceProfileId.YATIRIMTESVIK]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE,
    InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE,
  ]),
  [InvoiceProfileId.IDIS]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE,
    InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE, InvoiceTypeCode.IHRACKAYITLI,
  ]),
  [InvoiceProfileId.EARSIVFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFAT,
    InvoiceTypeCode.TEVKIFATIADE, InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH,
    InvoiceTypeCode.IHRACKAYITLI, InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU,
    InvoiceTypeCode.KONAKLAMAVERGISI, InvoiceTypeCode.TEKNOLOJIDESTEK,
    InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBISTISNA,
    InvoiceTypeCode.YTBTEVKIFAT, InvoiceTypeCode.YTBTEVKIFATIADE,
  ]),
};

// ============================================================
// §2 TİP-BAZLI GRUPLAR
// ============================================================

/** İade grubu: BillingReference zorunlu */
export const IADE_GROUP_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFATIADE,
  InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBTEVKIFATIADE,
]);

/** Tevkifat grubu: WithholdingTaxTotal beklenir */
export const TEVKIFAT_GROUP_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.YTBTEVKIFAT,
]);

/** WithholdingTaxTotal kullanılabilir tipler */
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

/** Vergi tipi kodları — tax-config türev (M7). KDV ayrı literal. */
export const TAX_TYPE_CODES = new Set<string>([
  KDV_TAX_CODE,
  ...TAX_DEFINITIONS.map(t => t.code),
]);

/** Tevkifat vergi tipi kodları — withholding-config türev (M7). 650 dahil. */
export const WITHHOLDING_TAX_TYPE_CODES = new Set<string>(
  WITHHOLDING_TAX_DEFINITIONS.map(w => w.code),
);

/** Tevkifat vergi kodu+yüzde kombinasyonları — config türev (M7 helper). B-04 regenerate. */
export const WITHHOLDING_TAX_TYPE_WITH_PERCENT = deriveWithholdingCombos(WITHHOLDING_TAX_DEFINITIONS);

/** İstisna vergi muafiyet sebebi kodları — exemption-config türev (M7). */
export const ISTISNA_TAX_EXEMPTION_REASON_CODES = new Set<string>(
  EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'ISTISNA').map(e => e.code),
);

/** Özel matrah vergi muafiyet sebebi kodları — exemption-config türev (M7). */
export const OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES = new Set<string>(
  EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'OZELMATRAH').map(e => e.code),
);

/** İhraç kayıtlı vergi muafiyet sebebi kodları — exemption-config türev (M7). */
export const IHRAC_EXEMPTION_REASON_CODES = new Set<string>(
  EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'IHRACKAYITLI').map(e => e.code),
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

/** Birim kodları — unit-config türev (M7, yeni). */
export const UNIT_CODES = new Set<string>(UNIT_DEFINITIONS.map(u => u.code));

/** Paket/Kap cins kodları — package-type-code-config türev (M7, yeni). */
export const PACKAGING_TYPE_CODES = new Set<string>(
  PACKAGING_TYPE_CODE_DEFINITIONS.map(p => p.code),
);

/**
 * Para birimi kodları (ISO 4217).
 *
 * **M7 NOT:** Currency için M7 türetme uygulanmadı; `currency-config.ts` 30 tanım içerir ama
 * validator whitelist bu setteki geniş listeyi kabul eder. Tam M7 için ya config 69 koda
 * genişletilmeli ya constants 30'a küçültülmeli (breaking). Sprint 8 aday.
 *
 * B-28 uygulandı: TRL (eski Türk Lirası) çıkarıldı.
 */
export const CURRENCY_CODES = new Set([
  'TRY', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK',
  'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'CNY', 'INR',
  'BRL', 'MXN', 'ZAR', 'KRW', 'SGD', 'HKD', 'NZD', 'THB', 'MYR', 'IDR',
  'PHP', 'TWD', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'ILS',
  'JOD', 'LBP', 'TND', 'MAD', 'DZD', 'LYD', 'SDG', 'IRR', 'IQD', 'SYP',
  'PKR', 'AFN', 'AZN', 'GEL', 'KZT', 'UZS', 'TMT', 'KGS', 'TJS', 'AMD',
  'BAM', 'MKD', 'RSD', 'ALL', 'MDL', 'UAH', 'BYN', 'ISK',
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

/** Taraf kimlik schemeID değerleri */
export const PARTY_IDENTIFICATION_SCHEME_IDS = new Set([
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
 * Ödeme yöntemi kodları — UN/EDIFACT 4461 (geniş whitelist).
 *
 * **M7 NOT:** Payment Means için M7 türetme uygulanmadı; `payment-means-config.ts` sadece
 * sık kullanılan 7 kodu Türkçe isimle içerir (UI dropdown). Validator whitelist bu geniş
 * setin tamamını kabul eder (kullanıcı talep halinde tüm UN/EDIFACT desteği — açık soru #9 cevabı).
 */
export const PAYMENT_MEANS_CODES = new Set([
  '1', '2', '3', '4', '5', '10', '20', '23', '30', '31', '42', '48', '49', '50', '51', '60', '61', '62', '97', 'ZZZ',
]);

/** Plaka schemeID değerleri */
export const LICENSE_PLATE_SCHEME_IDS = new Set(['PLAKA', 'DORSE']);

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

/** Saat formatı: HH:mm:ss */
export const TIME_REGEX = /^\d{2}:\d{2}:\d{2}$/;

/** Decimal format: max 15 önce, max 2 sonra */
export const DECIMAL_REGEX = /^-?\d{1,15}(\.\d{1,2})?$/;

/** Döviz kuru decimal: max 15 önce, max 6 sonra */
export const EXCHANGE_RATE_REGEX = /^\d{1,15}(\.\d{1,6})?$/;

/** Türkiye IBAN formatı */
export const TR_IBAN_REGEX = /^TR\d{7}[A-Z0-9]{17}$/;

/** SEVKIYATNO formatı: SE-0000000 */
export const SEVKIYAT_NO_REGEX = /^SE-\d{7}$/;

/** ETIKETNO formatı: 2 harf + 7 rakam */
export const ETIKET_NO_REGEX = /^[A-Z]{2}\d{7}$/;

/** Posta kodu formatı: TR */
export const POSTAL_ZONE_REGEX = /^((0[1-9])|([1-7][0-9])|(8[0-1]))\d{3}$/;

/** TaxTypeCode 4171 kullanılabilir tipler */
export const TAX_4171_ALLOWED_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.IADE,
  InvoiceTypeCode.SGK, InvoiceTypeCode.YTBIADE,
]);
