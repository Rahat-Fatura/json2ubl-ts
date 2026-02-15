/**
 * Vergi tanım konfigürasyonu — DB Tax tablosundan embed edilmiştir.
 *
 * baseStat + baseCalculate mantığı:
 *   baseStat=true,  baseCalculate=true  → KDV matrahını ARTTIRIR (matrah artırıcı)
 *   baseStat=true,  baseCalculate=false → KDV matrahından DÜŞER (matrah azaltıcı)
 *   baseStat=false, baseCalculate=false → Negatif etki (toplam vergiden düşer)
 */

export interface TaxDefinition {
  code: string;
  name: string;
  shortName: string;
  baseStat: boolean;
  baseCalculate: boolean;
}

export const TAX_DEFINITIONS: ReadonlyArray<TaxDefinition> = [
  { code: '0003', name: 'Gelir Vergisi Stopajı', shortName: 'Gelir Vergisi Stopajı', baseStat: false, baseCalculate: false },
  { code: '0011', name: 'Kurumlar Vergisi Stopajı', shortName: 'Kurumlar Vergisi Stopajı', baseStat: false, baseCalculate: false },
  { code: '0059', name: 'Konaklama Vergisi', shortName: 'Konaklama Vergisi', baseStat: true, baseCalculate: false },
  { code: '0061', name: 'Kaynak Kullanımı Destekleme Fonu Kesintisi', shortName: 'KKDF', baseStat: true, baseCalculate: true },
  { code: '0071', name: 'Petrol ve Doğalgaz ÖTV [1. Liste]', shortName: 'ÖTV 1. Liste', baseStat: true, baseCalculate: true },
  { code: '0073', name: 'Kolalı Gazoz, Alkollü İçecek ve Tütün ÖTV [3. Liste]', shortName: 'ÖTV 3. Liste', baseStat: true, baseCalculate: true },
  { code: '0074', name: 'Dayanıklı Tüketim ve Diğer Mallar ÖTV [4. Liste]', shortName: 'ÖTV 4. Liste', baseStat: true, baseCalculate: true },
  { code: '0075', name: 'Alkollü İçecekler ÖTV [3A Liste]', shortName: 'ÖTV 3A Liste', baseStat: true, baseCalculate: true },
  { code: '0076', name: 'Tütün Mamülleri ÖTV [3B Liste]', shortName: 'ÖTV 3B Liste', baseStat: true, baseCalculate: true },
  { code: '0077', name: 'Kolalı Gazozlar ÖTV [3C Liste]', shortName: 'ÖTV 3C Liste', baseStat: true, baseCalculate: true },
  { code: '1047', name: 'Damga Vergisi', shortName: 'Damga Vergisi', baseStat: true, baseCalculate: false },
  { code: '1048', name: '5035 Sayılı Kanuna Göre Damga Vergisi', shortName: 'Damga Vergisi 5035', baseStat: true, baseCalculate: false },
  { code: '4071', name: 'Elektrik ve Havagazı Tüketim Vergisi', shortName: 'Elektrik Tüketim V.', baseStat: true, baseCalculate: true },
  { code: '4080', name: 'Özel İletişim Vergisi', shortName: 'ÖİV', baseStat: true, baseCalculate: false },
  { code: '4081', name: '5035 Sayılı Kanuna Göre Özel İletişim Vergisi', shortName: 'ÖİV 5035', baseStat: true, baseCalculate: false },
  { code: '8001', name: 'Borsa Tescil Ücreti', shortName: 'Borsa Tescil', baseStat: true, baseCalculate: false },
  { code: '8002', name: 'Enerji Fonu', shortName: 'Enerji Fonu', baseStat: true, baseCalculate: true },
  { code: '8004', name: 'TRT Payı', shortName: 'TRT Payı', baseStat: true, baseCalculate: true },
  { code: '8005', name: 'Elektrik Tüketim Vergisi', shortName: 'Elektrik Tüketim V.', baseStat: true, baseCalculate: true },
  { code: '8006', name: 'Telsiz Kullanım Ücreti', shortName: 'Telsiz Kullanım', baseStat: true, baseCalculate: false },
  { code: '8007', name: 'Telsiz Ruhsat Ücreti', shortName: 'Telsiz Ruhsat', baseStat: true, baseCalculate: false },
  { code: '8008', name: 'Çevre Temizlik Vergisi', shortName: 'Çevre Temizlik V.', baseStat: true, baseCalculate: false },
  { code: '9021', name: '4961 Banka Sigorta Muameleleri Vergisi', shortName: 'BSMV', baseStat: true, baseCalculate: false },
  { code: '9040', name: 'Mera Fonu', shortName: 'Mera Fonu', baseStat: false, baseCalculate: false },
  { code: '9077', name: 'Motorlu Taşıt ÖTV [2. Liste]', shortName: 'ÖTV 2. Liste', baseStat: true, baseCalculate: true },
] as const;

/** KDV vergi kodu sabiti */
export const KDV_TAX_CODE = '0015';
export const KDV_TAX_NAME = 'KDV';

/** Vergi kodu → TaxDefinition hızlı lookup map */
export const TAX_MAP: ReadonlyMap<string, TaxDefinition> = new Map(
  TAX_DEFINITIONS.map(t => [t.code, t]),
);

/** Vergi kodunun geçerli olup olmadığını kontrol eder */
export function isValidTaxCode(code: string): boolean {
  return code === KDV_TAX_CODE || TAX_MAP.has(code);
}

/** Vergi tanımını getirir */
export function getTaxDefinition(code: string): TaxDefinition | undefined {
  return TAX_MAP.get(code);
}
