/**
 * Paket/Kap Cins Kodu (PackagingTypeCode) konfigürasyonu — UBL-TR v1.42 §4.13.
 *
 * 27 sık kullanılan kod + Türkçe isim. UI dropdown ve whitelist validasyonu için.
 * Kapsam dışı kodlar için UNECE/CEFACT Paket/Kap listesi referans alınabilir.
 */

export interface PackagingTypeCodeDefinition {
  code: string;
  name: string;
}

export const PACKAGING_TYPE_CODE_DEFINITIONS: ReadonlyArray<PackagingTypeCodeDefinition> = [
  { code: 'BA', name: 'Varil' },
  { code: 'BE', name: 'Bohça' },
  { code: 'BG', name: 'Torba' },
  { code: 'BH', name: 'Demet' },
  { code: 'BI', name: 'Çöp kutusu' },
  { code: 'BJ', name: 'Kova' },
  { code: 'BK', name: 'Sepet' },
  { code: 'BX', name: 'Kutu' },
  { code: 'CB', name: 'Bira kasası' },
  { code: 'CH', name: 'Sandık' },
  { code: 'CI', name: 'Teneke kutu' },
  { code: 'CK', name: 'Fıçı' },
  { code: 'CN', name: 'Konteyner' },
  { code: 'CR', name: 'Kasa' },
  { code: 'DK', name: 'Karton kasa' },
  { code: 'DR', name: 'Bidon' },
  { code: 'EC', name: 'Plastik torba' },
  { code: 'FC', name: 'Meyve kasası' },
  { code: 'JR', name: 'Kavanoz' },
  { code: 'LV', name: 'Liftvan' },
  { code: 'NE', name: 'Ambalajsız' },
  { code: 'SA', name: 'Çuval' },
  { code: 'SU', name: 'Bavul' },
  { code: 'TN', name: 'Teneke' },
  { code: 'VG', name: 'Dökme gaz' },
  { code: 'VL', name: 'Dökme sıvı' },
  { code: 'VO', name: 'Dökme katı' },
] as const;

/** Paket kodu → PackagingTypeCodeDefinition lookup map */
export const PACKAGING_TYPE_CODE_MAP: ReadonlyMap<string, PackagingTypeCodeDefinition> = new Map(
  PACKAGING_TYPE_CODE_DEFINITIONS.map(p => [p.code, p]),
);

/** Paket kodunun geçerli olup olmadığını kontrol eder (27 sık kod). */
export function isValidPackagingTypeCode(code: string): boolean {
  return PACKAGING_TYPE_CODE_MAP.has(code);
}

/** Paket tanımını getirir */
export function getPackagingTypeCodeDefinition(code: string): PackagingTypeCodeDefinition | undefined {
  return PACKAGING_TYPE_CODE_MAP.get(code);
}
