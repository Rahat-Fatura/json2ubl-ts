/**
 * KDV Tevkifat kodu konfigürasyonu — DB WithholdingTax tablosundan embed edilmiştir.
 *
 * Tevkifat hesaplama: withholdingAmount = kdvAmount × (percent / 100)
 * 6xx kodlar: Kısmi tevkifat (çeşitli oranlar)
 * 8xx kodlar: Tam tevkifat (%100)
 */

export interface WithholdingTaxDefinition {
  code: string;
  name: string;
  percent: number;
}

export const WITHHOLDING_TAX_DEFINITIONS: ReadonlyArray<WithholdingTaxDefinition> = [
  { code: '601', name: 'Yapım İşleri ile Mühendislik-Mimarlık ve Etüt-Proje Hizmetleri', percent: 40 },
  { code: '602', name: 'Etüt, Plan-Proje, Danışmanlık, Denetim ve Benzeri Hizmetler', percent: 90 },
  { code: '603', name: 'Makine, Teçhizat, Demirbaş ve Taşıtlara Ait Tadil, Bakım ve Onarım Hizmetleri', percent: 70 },
  { code: '604', name: 'Yemek Servis Hizmeti', percent: 50 },
  { code: '605', name: 'Organizasyon Hizmeti', percent: 50 },
  { code: '606', name: 'İşgücü Temin Hizmetleri', percent: 90 },
  { code: '607', name: 'Özel Güvenlik Hizmeti', percent: 90 },
  { code: '608', name: 'Yapı Denetim Hizmetleri', percent: 90 },
  { code: '609', name: 'Fason Tekstil ve Konfeksiyon İşleri, Çanta ve Ayakkabı Dikim İşleri', percent: 70 },
  { code: '610', name: 'Turistik Mağazalara Verilen Müşteri Bulma/Götürme Hizmetleri', percent: 90 },
  { code: '611', name: 'Spor Kulüplerinin Yayın, Reklâm ve İsim Hakkı Gelirleri', percent: 90 },
  { code: '612', name: 'Temizlik Hizmeti', percent: 90 },
  { code: '613', name: 'Çevre ve Bahçe Bakım Hizmetleri', percent: 90 },
  { code: '614', name: 'Servis Taşımacılığı Hizmeti', percent: 50 },
  { code: '615', name: 'Her Türlü Baskı ve Basım Hizmetleri', percent: 70 },
  { code: '616', name: '5018 Sayılı Kanuna Ekli Cetvellerdeki İdare, Kurum ve Kuruluşlara Yapılan Diğer Hizmetler', percent: 50 },
  { code: '617', name: 'Hurda Metalden Elde Edilen Külçe Teslimleri', percent: 70 },
  { code: '618', name: 'Hurda Metalden Elde Edilenler Dışındaki Bakır, Çinko, Demir-Çelik, Alüminyum ve Kurşun Külçe Teslimleri', percent: 70 },
  { code: '619', name: 'Bakır, Çinko ve Alüminyum Ürünlerinin Teslimi', percent: 70 },
  { code: '620', name: 'İstisnadan Vazgeçenlerin Hurda ve Atık Teslimi', percent: 70 },
  { code: '621', name: 'Metal, Plastik, Lastik, Kauçuk, Kâğıt ve Cam Hurda ve Atıklardan Elde Edilen Hammadde Teslimi', percent: 90 },
  { code: '622', name: 'Pamuk, Tiftik, Yün ve Yapağı ile Ham Post ve Deri Teslimleri', percent: 90 },
  { code: '623', name: 'Ağaç ve Orman Ürünleri Teslimi', percent: 50 },
  { code: '624', name: 'Yük Taşımacılığı Hizmeti', percent: 20 },
  { code: '625', name: 'Ticari Reklam Hizmetleri', percent: 30 },
  { code: '626', name: 'Diğer Teslimler', percent: 20 },
  { code: '627', name: 'Demir-Çelik Ürünlerinin Teslimi', percent: 50 },
  { code: '801', name: 'Yapım İşleri ile Mühendislik-Mimarlık ve Etüt-Proje Hizmetleri (Tam)', percent: 100 },
  { code: '802', name: 'Etüt, Plan-Proje, Danışmanlık, Denetim ve Benzeri Hizmetler (Tam)', percent: 100 },
  { code: '803', name: 'Makine, Teçhizat, Demirbaş ve Taşıtlara Ait Tadil, Bakım ve Onarım Hizmetleri (Tam)', percent: 100 },
  { code: '804', name: 'Yemek Servis Hizmeti (Tam)', percent: 100 },
  { code: '805', name: 'Organizasyon Hizmeti (Tam)', percent: 100 },
  { code: '806', name: 'İşgücü Temin Hizmetleri (Tam)', percent: 100 },
  { code: '807', name: 'Özel Güvenlik Hizmeti (Tam)', percent: 100 },
  { code: '808', name: 'Yapı Denetim Hizmetleri (Tam)', percent: 100 },
  { code: '809', name: 'Fason Tekstil ve Konfeksiyon İşleri (Tam)', percent: 100 },
  { code: '810', name: 'Turistik Mağazalara Verilen Müşteri Bulma/Götürme Hizmetleri (Tam)', percent: 100 },
  { code: '811', name: 'Spor Kulüplerinin Yayın, Reklâm ve İsim Hakkı Gelirleri (Tam)', percent: 100 },
  { code: '812', name: 'Temizlik Hizmeti (Tam)', percent: 100 },
  { code: '813', name: 'Çevre ve Bahçe Bakım Hizmetleri (Tam)', percent: 100 },
  { code: '814', name: 'Servis Taşımacılığı Hizmeti (Tam)', percent: 100 },
  { code: '815', name: 'Her Türlü Baskı ve Basım Hizmetleri (Tam)', percent: 100 },
  { code: '816', name: 'Hurda Metalden Elde Edilen Külçe Teslimleri (Tam)', percent: 100 },
  { code: '817', name: 'Hurda Metalden Elde Edilenler Dışındaki Bakır, Çinko, Demir-Çelik, Alüminyum ve Kurşun Külçe Teslimi (Tam)', percent: 100 },
  { code: '818', name: 'Bakır, Çinko, Alüminyum ve Kurşun Ürünlerinin Teslimi (Tam)', percent: 100 },
  { code: '819', name: 'İstisnadan Vazgeçenlerin Hurda ve Atık Teslimi (Tam)', percent: 100 },
  { code: '820', name: 'Metal, Plastik, Lastik, Kauçuk, Kâğıt ve Cam Hurda ve Atıklardan Elde Edilen Hammadde Teslimi (Tam)', percent: 100 },
  { code: '821', name: 'Pamuk, Tiftik, Yün ve Yapağı ile Ham Post ve Deri Teslimleri (Tam)', percent: 100 },
  { code: '822', name: 'Ağaç ve Orman Ürünleri Teslimi (Tam)', percent: 100 },
  { code: '823', name: 'Yük Taşımacılığı Hizmeti (Tam)', percent: 100 },
  { code: '824', name: 'Ticari Reklam Hizmetleri (Tam)', percent: 100 },
  { code: '825', name: 'Demir-Çelik Ürünlerinin Teslimi (Tam)', percent: 100 },
] as const;

/** Tevkifat kodu → WithholdingTaxDefinition hızlı lookup map */
export const WITHHOLDING_TAX_MAP: ReadonlyMap<string, WithholdingTaxDefinition> = new Map(
  WITHHOLDING_TAX_DEFINITIONS.map(t => [t.code, t]),
);

/** Tevkifat kodunun geçerli olup olmadığını kontrol eder */
export function isValidWithholdingTaxCode(code: string): boolean {
  return WITHHOLDING_TAX_MAP.has(code);
}

/** Tevkifat tanımını getirir */
export function getWithholdingTaxDefinition(code: string): WithholdingTaxDefinition | undefined {
  return WITHHOLDING_TAX_MAP.get(code);
}
