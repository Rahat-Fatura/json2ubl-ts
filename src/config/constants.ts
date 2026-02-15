import { InvoiceProfileId, InvoiceTypeCode } from '../types/enums';

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
  [InvoiceProfileId.IHRACAT]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU, InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  [InvoiceProfileId.YOLCUBERABERFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU, InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
  [InvoiceProfileId.OZELFATURA]: new Set([
    InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE,
    InvoiceTypeCode.ISTISNA, InvoiceTypeCode.OZELMATRAH, InvoiceTypeCode.IHRACKAYITLI,
    InvoiceTypeCode.SGK, InvoiceTypeCode.KOMISYONCU, InvoiceTypeCode.KONAKLAMAVERGISI,
  ]),
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

// ============================================================
// §6 KOD LİSTELERİ
// ============================================================

/** Vergi tipi kodları */
export const TAX_TYPE_CODES = new Set([
  '0003', '0015', '0061', '0071', '0073', '0074', '0075', '0076', '0077',
  '1047', '1048', '4080', '4081', '9015', '9021', '9077',
  '8001', '8002', '8004', '8005', '8006', '8007', '8008',
  '9040', '0011', '4071', '4171', '0021', '0022', '9944', '0059',
]);

/** Tevkifat vergi tipi kodları */
export const WITHHOLDING_TAX_TYPE_CODES = new Set([
  '601', '602', '603', '604', '605', '606', '607', '608', '609',
  '610', '611', '612', '613', '614', '615', '616', '617', '618',
  '619', '620', '621', '622', '623', '624', '625', '626', '627',
  '801', '802', '803', '804', '805', '806', '807', '808', '809',
  '810', '811', '812', '813', '814', '815', '816', '817', '818',
  '819', '820', '821', '822', '823', '824', '825',
]);

/** Tevkifat vergi kodu+yüzde kombinasyonları (ör: 60130 = TaxTypeCode 601, Percent 30) */
export const WITHHOLDING_TAX_TYPE_WITH_PERCENT = new Set([
  '60120', '60130', '60140', '60150', '60160', '60170', '60190',
  '60230', '60250', '60290',
  '60350', '60370', '60390',
  '60450', '60470', '60490',
  '60550', '60570', '60590',
  '60650', '60690',
  '60730', '60750', '60790',
  '60850', '60870', '60890',
  '60950', '60970', '60990',
  '61050', '61070', '61090',
  '61150', '61170', '61190',
  '61250', '61270', '61290',
  '61350', '61370', '61390',
  '61450', '61470', '61490',
  '61550', '61570', '61590',
  '61650', '61670', '61690',
  '61750', '61770', '61790',
  '61850', '61870', '61890',
  '61950', '61970', '61990',
  '62050', '62070', '62090',
  '62150', '62170', '62190',
  '62250', '62270', '62290',
  '62350', '62370', '62390',
  '62450', '62470', '62490',
  '62550', '62570', '62590',
  '62650', '62670', '62690',
  '62750', '62770', '62790',
  '801100',
  '802100',
  '803100',
  '804100',
  '805100',
  '806100',
  '807100',
  '808100',
  '809100',
  '810100',
  '811100',
  '812100',
  '813100',
  '814100',
  '815100',
  '816100',
  '817100',
  '818100',
  '819100',
  '820100',
  '821100',
  '822100',
  '823100',
  '824100',
  '825100',
]);

/** İstisna vergi muafiyet sebebi kodları */
export const ISTISNA_TAX_EXEMPTION_REASON_CODES = new Set([
  '001',
  '101', '102', '103', '104', '105', '106', '107', '108',
  '201', '202', '203', '204', '205', '206', '207', '208', '209',
  '210', '211', '212', '213', '214', '215', '216', '217', '218', '219',
  '220', '221', '222', '223', '224', '225', '226', '227', '228', '229',
  '230', '231', '232', '233', '234', '235', '236', '237', '238', '239',
  '240', '241', '242', '243', '244', '245', '246', '247', '248', '249', '250',
  '301', '302', '303', '304', '305', '306', '307', '308', '309',
  '310', '311', '312', '313', '314', '315', '316', '317', '318', '319',
  '320', '321', '322', '323', '324', '325', '326', '327', '328', '329',
  '330', '331', '332', '333', '334', '335', '336', '337', '338', '339',
  '340', '341', '342', '343', '344', '350',
  '501',
]);

/** Özel matrah vergi muafiyet sebebi kodları */
export const OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES = new Set([
  '801', '802', '803', '804', '805', '806', '807', '808', '809', '810', '811', '812',
]);

/** İhraç kayıtlı vergi muafiyet sebebi kodları */
export const IHRAC_EXEMPTION_REASON_CODES = new Set([
  '701', '702', '703', '704',
]);

/** Para birimi kodları (ISO 4217) — en sık kullanılanlar */
export const CURRENCY_CODES = new Set([
  'TRY', 'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK',
  'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'RUB', 'CNY', 'INR',
  'BRL', 'MXN', 'ZAR', 'KRW', 'SGD', 'HKD', 'NZD', 'THB', 'MYR', 'IDR',
  'PHP', 'TWD', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'EGP', 'ILS',
  'JOD', 'LBP', 'TND', 'MAD', 'DZD', 'LYD', 'SDG', 'IRR', 'IQD', 'SYP',
  'PKR', 'AFN', 'AZN', 'GEL', 'KZT', 'UZS', 'TMT', 'KGS', 'TJS', 'AMD',
  'BAM', 'MKD', 'RSD', 'ALL', 'MDL', 'UAH', 'BYN', 'ISK',
  'TRL',
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

/** Ek ürün kimlik schemeID değerleri */
export const ADDITIONAL_ITEM_ID_SCHEME_IDS = new Set([
  'TELEFON', 'TABLET_PC', 'BILGISAYAR', 'KUNYENO',
  'ILAC', 'TIBBICIHAZ', 'DIGER', 'ETIKETNO',
]);

/** Ödeme yöntemi kodları */
export const PAYMENT_MEANS_CODES = new Set([
  '1', '2', '3', '4', '5', '10', '20', '30', '31', '42', '48', '49', '50', '51', '60', '61', '62', '97', 'ZZZ',
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
