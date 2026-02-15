/**
 * Birim kodu konfigürasyonu — DB Unit tablosundan embed edilmiştir.
 *
 * Kullanıcı Türkçe isim (ör: "Adet") veya doğrudan UBL kodu (ör: "C62") verebilir.
 * resolveUnitCode() fonksiyonu her iki durumu da handle eder.
 */

export interface UnitDefinition {
  code: string;
  name: string;
}

export const UNIT_DEFINITIONS: ReadonlyArray<UnitDefinition> = [
  { code: 'C62', name: 'Adet' },
  { code: 'KGM', name: 'Kilogram' },
  { code: 'DPC', name: 'Düzine' },
  { code: 'MTK', name: 'Metre Kare' },
  { code: 'MTR', name: 'Metre' },
  { code: 'PR', name: 'Çift' },
  { code: 'LTR', name: 'Litre' },
  { code: 'D40', name: 'Bin Litre' },
  { code: 'R9', name: 'Bin Metre Küp' },
  { code: 'D30', name: 'Brüt Kalori Değeri' },
  { code: 'GRM', name: 'Gram' },
  { code: 'GT', name: 'Gross Ton' },
  { code: 'NCL', name: 'Hücre Adedi' },
  { code: 'KPH', name: 'Kg Potasyum Oksid' },
  { code: 'B32', name: 'Kg-Metre Kare' },
  { code: 'KOH', name: 'Kilogram Potasyum Hidroksit' },
  { code: 'K20', name: 'Kilogram Potasyum Oksit' },
  { code: 'K62', name: 'Kilogram-Adet' },
  { code: 'KH6', name: 'Kilogram-Baş' },
  { code: 'KPR', name: 'Kilogram-Çift' },
  { code: 'KWT', name: 'Kilowatt' },
  { code: 'KWH', name: 'Kilowatt Saat' },
  { code: 'MTQ', name: 'Metre Küp' },
  { code: 'LPA', name: 'Saf Alkol Litresi' },
  { code: 'SET', name: 'Set' },
  { code: 'CCT', name: 'Ton Başına Taşıma Kapasitesi' },
  { code: 'CPR', name: 'Adet-Çift' },
  { code: 'AFF', name: 'Afif Birim Fiyatı' },
  { code: 'HUR', name: 'Saat' },
  { code: 'T3', name: 'Bin Adet' },
  { code: 'AYR', name: 'Altın Ayarı' },
  { code: 'AKQ', name: 'Atv Birim Fiyatı' },
  { code: 'KNI', name: 'Azotun Kilogram' },
  { code: 'BAS', name: 'Baş' },
  { code: 'TWH', name: 'Bin Kilowatt Saat' },
  { code: 'KFO', name: 'Difosfor Pentaoksit Kilogramı' },
  { code: 'GFI', name: 'Fıssıle İzotop Gramı' },
  { code: 'GMS', name: 'Gümüş' },
  { code: 'KHO', name: 'Hidrojen Peroksit Kilogramı' },
  { code: 'K58', name: 'Kurutulmuş Net Ağırlık Kilogramı' },
  { code: 'OMV', name: 'Otv Maktu Vergi' },
  { code: 'OTB', name: 'Otv Birim Fiyatı' },
  { code: 'KMA', name: 'Metil Aminlerin Kilogramı' },
  { code: 'KSH', name: 'Sodyum Hidroksit Kilogramı' },
  { code: 'KUR', name: 'Uranyum Kilogramı' },
  { code: 'H62', name: 'Yüz Adet' },
  { code: 'KSD', name: '%90 Kuru Üzüm Kilogramı' },
  { code: 'DAY', name: 'Gün' },
  { code: 'MON', name: 'Ay' },
  { code: 'ANN', name: 'Yıl' },
  { code: 'D61', name: 'Dakika' },
  { code: 'D62', name: 'Saniye' },
  { code: 'PA', name: 'Paket' },
  { code: 'BX', name: 'Kutu' },
  { code: 'MGM', name: 'Miligram' },
  { code: '26', name: 'Ton' },
  { code: 'NT', name: 'Net Ton' },
  { code: 'MMT', name: 'Milimetre' },
  { code: 'CMT', name: 'Santimetre' },
  { code: 'CMQ', name: 'Santimetre Küp' },
  { code: 'CLT', name: 'Santilitre' },
  { code: 'KJO', name: 'Kilojoule' },
  { code: 'MMQ', name: 'Milimetre Küp' },
  { code: 'CMK', name: 'Santimetre Kare' },
  { code: 'MLT', name: 'Mililitre' },
  { code: 'KTM', name: 'Kilometre' },
  { code: 'CTM', name: 'Karat' },
  { code: 'RO', name: 'Rulo' },
  { code: 'BJ', name: 'Kova' },
  { code: 'YRD', name: 'Yarda' },
  { code: 'TN', name: 'Teneke' },
  { code: 'DR', name: 'Davul' },
  { code: 'GRO', name: 'Groza' },
  { code: 'EV', name: 'Zarf' },
  { code: 'DMK', name: 'Desimetre Kare' },
] as const;

/** Birim kodu → UnitDefinition lookup map */
const UNIT_BY_CODE: ReadonlyMap<string, UnitDefinition> = new Map(
  UNIT_DEFINITIONS.map(u => [u.code, u]),
);

/** Birim Türkçe ismi (lowercase) → UnitDefinition lookup map */
const UNIT_BY_NAME: ReadonlyMap<string, UnitDefinition> = new Map(
  UNIT_DEFINITIONS.map(u => [u.name.toLowerCase(), u]),
);

/**
 * Kullanıcının verdiği birim değerini UBL koduna çözümler.
 * Önce kod olarak arar, bulamazsa Türkçe isim olarak arar.
 * Hiçbirinde bulunamazsa girdiyi olduğu gibi döner.
 */
export function resolveUnitCode(input: string): string {
  if (UNIT_BY_CODE.has(input)) return input;
  const byName = UNIT_BY_NAME.get(input.toLowerCase());
  if (byName) return byName.code;
  return input;
}

/** Birim kodunun geçerli olup olmadığını kontrol eder */
export function isValidUnitCode(code: string): boolean {
  return UNIT_BY_CODE.has(code);
}
