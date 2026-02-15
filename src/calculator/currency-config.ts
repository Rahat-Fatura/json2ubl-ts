/**
 * Para birimi konfigürasyonu — DB Currency tablosundan embed edilmiştir.
 * unit/subunit: Yazıyla gösterim için kullanılır (ör: "Lira", "Kuruş")
 */

export interface CurrencyDefinition {
  code: string;
  name: string;
  unit: string;
  subunit: string;
}

export const CURRENCY_DEFINITIONS: ReadonlyArray<CurrencyDefinition> = [
  { code: 'TRY', name: 'Türk Lirası', unit: 'Lira', subunit: 'Kuruş' },
  { code: 'USD', name: 'Amerikan Doları', unit: 'Dolar', subunit: 'Cents' },
  { code: 'EUR', name: 'Avro', unit: 'Avro', subunit: 'Cents' },
  { code: 'GBP', name: 'İngiliz Sterlini', unit: '', subunit: 'Pence' },
  { code: 'CHF', name: 'İsviçre Frangı', unit: '', subunit: 'Rappen' },
  { code: 'AED', name: 'BAE Dirhemi', unit: '', subunit: 'Fils' },
  { code: 'SAR', name: 'Suudi Riyali', unit: '', subunit: 'Halalah' },
  { code: 'QAR', name: 'Katar Riyali', unit: '', subunit: 'Dirham' },
  { code: 'KWD', name: 'Kuveyt Dinarı', unit: '', subunit: 'Fils' },
  { code: 'OMR', name: 'Umman Riyali', unit: '', subunit: 'Baisa' },
  { code: 'CNY', name: 'Yuan Renminbi', unit: '', subunit: 'Fen' },
  { code: 'JPY', name: 'Yen', unit: '', subunit: 'Sen' },
  { code: 'CAD', name: 'Kanada Doları', unit: '', subunit: 'Cents' },
  { code: 'AUD', name: 'Avustralya Doları', unit: '', subunit: 'Cent' },
  { code: 'SEK', name: 'İsveç Kronu', unit: '', subunit: 'Öre' },
  { code: 'NOK', name: 'Norveç Kronu', unit: '', subunit: 'Øre' },
  { code: 'DKK', name: 'Danimarka Kronu', unit: '', subunit: 'Øre' },
  { code: 'PLN', name: 'Zloti', unit: '', subunit: 'Grosz' },
  { code: 'RON', name: 'Romen Leyi', unit: '', subunit: 'Ban' },
  { code: 'RUB', name: 'Rus Rublesi', unit: '', subunit: 'Kopek' },
  { code: 'INR', name: 'Hint Rupisi', unit: '', subunit: 'Paisa' },
  { code: 'SGD', name: 'Singapur Doları', unit: '', subunit: 'Cents' },
  { code: 'HKD', name: 'Hong Kong Doları', unit: '', subunit: 'Cents' },
  { code: 'NZD', name: 'Yeni Zellanda Doları', unit: '', subunit: 'Cents' },
  { code: 'ZAR', name: 'Güney Afrika Parası', unit: '', subunit: 'Cents' },
  { code: 'KRW', name: 'Won', unit: '', subunit: 'Jeon' },
  { code: 'IQD', name: 'Irak Dinarı', unit: '', subunit: 'Fils' },
  { code: 'EGP', name: 'Mısır Poundu', unit: '', subunit: 'Piastre' },
  { code: 'BGN', name: 'Bulgar Levası', unit: '', subunit: 'Stotinka' },
  { code: 'KZT', name: 'Tenge', unit: '', subunit: 'Tïın' },
] as const;

/** Para birimi kodu → CurrencyDefinition hızlı lookup map */
export const CURRENCY_MAP: ReadonlyMap<string, CurrencyDefinition> = new Map(
  CURRENCY_DEFINITIONS.map(c => [c.code, c]),
);

/** Varsayılan para birimi */
export const DEFAULT_CURRENCY_CODE = 'TRY';

/** Para birimi kodunun geçerli olup olmadığını kontrol eder */
export function isValidCurrencyCode(code: string): boolean {
  return CURRENCY_MAP.has(code);
}

/** Para birimi tanımını getirir */
export function getCurrencyDefinition(code: string): CurrencyDefinition | undefined {
  return CURRENCY_MAP.get(code);
}
