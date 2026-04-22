/**
 * Dinamik konfigürasyon yöneticisi.
 *
 * Statik embed edilmiş veriler varsayılan olarak yüklenir.
 * Uygulama başlatılırken DB'den güncel verilerle override edilebilir.
 * Çalışma zamanında (restart olmadan) güncelleme yapılabilir.
 *
 * Kullanım:
 * ```typescript
 * import { configManager } from 'json2ubl-ts';
 *
 * // 1. Başlangıçta DB verisiyle initialize
 * configManager.initialize({
 *   taxes: dbTaxes,
 *   withholdingTaxes: dbWithholdings,
 *   exemptions: dbExemptions,
 * });
 *
 * // 2. Runtime'da güncelleme (DB trigger sonrası)
 * configManager.updateTaxes(newTaxes);
 * configManager.updateWithholdingTaxes(newWithholdings);
 * ```
 */

import { EventEmitter } from 'events';
import type { TaxDefinition } from './tax-config';
import type { WithholdingTaxDefinition } from './withholding-config';
import type { ExemptionDefinition } from './exemption-config';
import type { UnitDefinition } from './unit-config';
import type { CurrencyDefinition } from './currency-config';
import { TAX_DEFINITIONS, KDV_TAX_CODE } from './tax-config';
import { WITHHOLDING_TAX_DEFINITIONS } from './withholding-config';
import { EXEMPTION_DEFINITIONS } from './exemption-config';
import { UNIT_DEFINITIONS } from './unit-config';
import { CURRENCY_DEFINITIONS } from './currency-config';

// ─── Config Event Tipleri ────────────────────────────────────────────────────

export interface ConfigEvents {
  'config:initialized': void;
  'config:taxes-updated': TaxDefinition[];
  'config:withholding-updated': WithholdingTaxDefinition[];
  'config:exemptions-updated': ExemptionDefinition[];
  'config:units-updated': UnitDefinition[];
  'config:currencies-updated': CurrencyDefinition[];
  'config:all-updated': void;
}

export type ConfigEventName = keyof ConfigEvents;

// ─── Initialize Options ──────────────────────────────────────────────────────

export interface ConfigInitOptions {
  /** Vergi tanımları — verilmezse statik embed kullanılır */
  taxes?: TaxDefinition[];
  /** Tevkifat tanımları */
  withholdingTaxes?: WithholdingTaxDefinition[];
  /** İstisna/muafiyet tanımları */
  exemptions?: ExemptionDefinition[];
  /** Birim tanımları */
  units?: UnitDefinition[];
  /** Para birimi tanımları */
  currencies?: CurrencyDefinition[];
}

// ─── ConfigManager Sınıfı ────────────────────────────────────────────────────

export class ConfigManager extends EventEmitter {
  private _taxes: TaxDefinition[];
  private _taxMap: Map<string, TaxDefinition>;

  private _withholdingTaxes: WithholdingTaxDefinition[];
  private _withholdingTaxMap: Map<string, WithholdingTaxDefinition>;

  private _exemptions: ExemptionDefinition[];
  private _exemptionMap: Map<string, ExemptionDefinition>;

  private _units: UnitDefinition[];
  private _unitCodeMap: Map<string, UnitDefinition>;
  private _unitNameMap: Map<string, UnitDefinition>;

  private _currencies: CurrencyDefinition[];
  private _currencyMap: Map<string, CurrencyDefinition>;

  private _initialized = false;
  private _version = 0;

  constructor() {
    super();
    // Statik embed'lerle varsayılan yükleme
    this._taxes = [...TAX_DEFINITIONS];
    this._taxMap = this.buildTaxMap(this._taxes);

    this._withholdingTaxes = [...WITHHOLDING_TAX_DEFINITIONS];
    this._withholdingTaxMap = this.buildWithholdingMap(this._withholdingTaxes);

    this._exemptions = [...EXEMPTION_DEFINITIONS];
    this._exemptionMap = this.buildExemptionMap(this._exemptions);

    this._units = [...UNIT_DEFINITIONS];
    const unitMaps = this.buildUnitMaps(this._units);
    this._unitCodeMap = unitMaps.codeMap;
    this._unitNameMap = unitMaps.nameMap;

    this._currencies = [...CURRENCY_DEFINITIONS];
    this._currencyMap = this.buildCurrencyMap(this._currencies);
  }

  // ─── Initialization ──────────────────────────────────────────────────────

  /**
   * DB'den gelen güncel verilerle tüm config'leri toplu override eder.
   * Uygulama başlatılırken bir kez çağrılır.
   */
  initialize(options: ConfigInitOptions): void {
    if (options.taxes) this.setTaxes(options.taxes);
    if (options.withholdingTaxes) this.setWithholdingTaxes(options.withholdingTaxes);
    if (options.exemptions) this.setExemptions(options.exemptions);
    if (options.units) this.setUnits(options.units);
    if (options.currencies) this.setCurrencies(options.currencies);
    this._initialized = true;
    this._version++;
    this.emit('config:initialized');
    this.emit('config:all-updated');
  }

  /** Config'in DB verisiyle initialize edilip edilmediği */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /** Config versiyonu — her güncelleme artırır */
  get version(): number {
    return this._version;
  }

  // ─── Runtime Update Metodları ─────────────────────────────────────────

  /** Vergi tanımlarını günceller (restart gerekmez) */
  updateTaxes(taxes: TaxDefinition[]): void {
    this.setTaxes(taxes);
    this._version++;
    this.emit('config:taxes-updated', taxes);
    this.emit('config:all-updated');
  }

  /** Tevkifat tanımlarını günceller */
  updateWithholdingTaxes(withholdingTaxes: WithholdingTaxDefinition[]): void {
    this.setWithholdingTaxes(withholdingTaxes);
    this._version++;
    this.emit('config:withholding-updated', withholdingTaxes);
    this.emit('config:all-updated');
  }

  /** İstisna tanımlarını günceller */
  updateExemptions(exemptions: ExemptionDefinition[]): void {
    this.setExemptions(exemptions);
    this._version++;
    this.emit('config:exemptions-updated', exemptions);
    this.emit('config:all-updated');
  }

  /** Birim tanımlarını günceller */
  updateUnits(units: UnitDefinition[]): void {
    this.setUnits(units);
    this._version++;
    this.emit('config:units-updated', units);
    this.emit('config:all-updated');
  }

  /** Para birimi tanımlarını günceller */
  updateCurrencies(currencies: CurrencyDefinition[]): void {
    this.setCurrencies(currencies);
    this._version++;
    this.emit('config:currencies-updated', currencies);
    this.emit('config:all-updated');
  }

  /** Tüm config'leri toplu günceller */
  updateAll(options: ConfigInitOptions): void {
    if (options.taxes) this.setTaxes(options.taxes);
    if (options.withholdingTaxes) this.setWithholdingTaxes(options.withholdingTaxes);
    if (options.exemptions) this.setExemptions(options.exemptions);
    if (options.units) this.setUnits(options.units);
    if (options.currencies) this.setCurrencies(options.currencies);
    this._version++;
    this.emit('config:all-updated');
  }

  /** Tüm config'leri fabrika (statik embed) değerlerine sıfırlar */
  reset(): void {
    this._taxes = [...TAX_DEFINITIONS];
    this._taxMap = this.buildTaxMap(this._taxes);
    this._withholdingTaxes = [...WITHHOLDING_TAX_DEFINITIONS];
    this._withholdingTaxMap = this.buildWithholdingMap(this._withholdingTaxes);
    this._exemptions = [...EXEMPTION_DEFINITIONS];
    this._exemptionMap = this.buildExemptionMap(this._exemptions);
    this._units = [...UNIT_DEFINITIONS];
    const unitMaps = this.buildUnitMaps(this._units);
    this._unitCodeMap = unitMaps.codeMap;
    this._unitNameMap = unitMaps.nameMap;
    this._currencies = [...CURRENCY_DEFINITIONS];
    this._currencyMap = this.buildCurrencyMap(this._currencies);
    this._initialized = false;
    this._version++;
    this.emit('config:all-updated');
  }

  // ─── Okuma (Getter) Metodları ─────────────────────────────────────────

  // -- Vergiler --

  getTax(code: string): TaxDefinition | undefined {
    return this._taxMap.get(code);
  }

  isValidTaxCode(code: string): boolean {
    return code === KDV_TAX_CODE || this._taxMap.has(code);
  }

  get taxes(): ReadonlyArray<TaxDefinition> {
    return this._taxes;
  }

  get taxMap(): ReadonlyMap<string, TaxDefinition> {
    return this._taxMap;
  }

  // -- Tevkifat --

  getWithholdingTax(code: string): WithholdingTaxDefinition | undefined {
    return this._withholdingTaxMap.get(code);
  }

  isValidWithholdingTaxCode(code: string): boolean {
    return this._withholdingTaxMap.has(code);
  }

  get withholdingTaxes(): ReadonlyArray<WithholdingTaxDefinition> {
    return this._withholdingTaxes;
  }

  get withholdingTaxMap(): ReadonlyMap<string, WithholdingTaxDefinition> {
    return this._withholdingTaxMap;
  }

  // -- İstisnalar --

  getExemption(code: string): ExemptionDefinition | undefined {
    return this._exemptionMap.get(code);
  }

  isValidExemptionCode(code: string): boolean {
    return this._exemptionMap.has(code);
  }

  getExemptionsByDocumentType(documentType: string): ExemptionDefinition[] {
    return this._exemptions.filter(e => e.documentType === documentType);
  }

  get exemptions(): ReadonlyArray<ExemptionDefinition> {
    return this._exemptions;
  }

  get exemptionMap(): ReadonlyMap<string, ExemptionDefinition> {
    return this._exemptionMap;
  }

  // -- Birimler --

  getUnitByCode(code: string): UnitDefinition | undefined {
    return this._unitCodeMap.get(code);
  }

  getUnitByName(name: string): UnitDefinition | undefined {
    return this._unitNameMap.get(name);
  }

  /**
   * Türkçe isim veya UBL kodunu UBL koduna çözümler.
   * Bulamazsa girdiyi aynen döndürür.
   */
  resolveUnitCode(input: string): string {
    if (this._unitCodeMap.has(input)) return input;
    // B-43: unit-config.ts ile tutarlı — name lookup lowercase normalize
    const byName = this._unitNameMap.get(input.toLowerCase());
    if (byName) return byName.code;
    return input;
  }

  isValidUnitCode(code: string): boolean {
    return this._unitCodeMap.has(code);
  }

  get units(): ReadonlyArray<UnitDefinition> {
    return this._units;
  }

  // -- Para Birimleri --

  getCurrency(code: string): CurrencyDefinition | undefined {
    return this._currencyMap.get(code);
  }

  isValidCurrencyCode(code: string): boolean {
    return this._currencyMap.has(code);
  }

  get currencies(): ReadonlyArray<CurrencyDefinition> {
    return this._currencies;
  }

  // ─── Snapshot: Tüm config'in anlık kopyası ────────────────────────────

  /**
   * Tüm config verilerinin anlık kopyasını döndürür.
   * Frontend'e göndermek veya cache'e almak için kullanışlı.
   */
  snapshot(): ConfigInitOptions & { version: number } {
    return {
      version: this._version,
      taxes: [...this._taxes],
      withholdingTaxes: [...this._withholdingTaxes],
      exemptions: [...this._exemptions],
      units: [...this._units],
      currencies: [...this._currencies],
    };
  }

  // ─── Private Set & Map Builder'lar ────────────────────────────────────

  private setTaxes(taxes: TaxDefinition[]): void {
    this._taxes = [...taxes];
    this._taxMap = this.buildTaxMap(this._taxes);
  }

  private setWithholdingTaxes(wt: WithholdingTaxDefinition[]): void {
    this._withholdingTaxes = [...wt];
    this._withholdingTaxMap = this.buildWithholdingMap(this._withholdingTaxes);
  }

  private setExemptions(ex: ExemptionDefinition[]): void {
    this._exemptions = [...ex];
    this._exemptionMap = this.buildExemptionMap(this._exemptions);
  }

  private setUnits(units: UnitDefinition[]): void {
    this._units = [...units];
    const maps = this.buildUnitMaps(this._units);
    this._unitCodeMap = maps.codeMap;
    this._unitNameMap = maps.nameMap;
  }

  private setCurrencies(currencies: CurrencyDefinition[]): void {
    this._currencies = [...currencies];
    this._currencyMap = this.buildCurrencyMap(this._currencies);
  }

  private buildTaxMap(taxes: TaxDefinition[]): Map<string, TaxDefinition> {
    return new Map(taxes.map(t => [t.code, t]));
  }

  private buildWithholdingMap(wt: WithholdingTaxDefinition[]): Map<string, WithholdingTaxDefinition> {
    return new Map(wt.map(t => [t.code, t]));
  }

  private buildExemptionMap(ex: ExemptionDefinition[]): Map<string, ExemptionDefinition> {
    return new Map(ex.map(e => [e.code, e]));
  }

  private buildUnitMaps(units: UnitDefinition[]): { codeMap: Map<string, UnitDefinition>; nameMap: Map<string, UnitDefinition> } {
    const codeMap = new Map(units.map(u => [u.code, u]));
    // B-43: unit-config.ts ile tutarlı — name key lowercase
    const nameMap = new Map(units.map(u => [u.name.toLowerCase(), u]));
    return { codeMap, nameMap };
  }

  private buildCurrencyMap(currencies: CurrencyDefinition[]): Map<string, CurrencyDefinition> {
    return new Map(currencies.map(c => [c.code, c]));
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

/** Global config manager instance — tüm SDK bu instance'ı kullanır */
export const configManager = new ConfigManager();
