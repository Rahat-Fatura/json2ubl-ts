/**
 * InvoiceSession — EventEmitter tabanlı reaktif fatura oturumu.
 *
 * Frontend'de canlı veri girişi sırasında:
 * - Her değişiklikte otomatik hesaplama
 * - Tip/profil değişiminde UI state derivation
 * - Satır ekleme/güncelleme/silme
 * - Validasyon uyarıları
 *
 * Kullanım:
 * ```typescript
 * import { InvoiceSession } from 'json2ubl-ts';
 *
 * const session = new InvoiceSession();
 *
 * // Event dinleme
 * session.on('calculated', (result) => updateUI(result));
 * session.on('ui-state-changed', (state) => updateFormFields(state));
 * session.on('type-changed', ({ type, profile }) => console.log(`Yeni: ${type}/${profile}`));
 * session.on('warnings', (warnings) => showWarnings(warnings));
 *
 * // Veri güncelleme
 * session.setSender({ taxNumber: '1234567890', name: 'Firma', ... });
 * session.setCustomer({ taxNumber: '9876543210', name: 'Müşteri', ... });
 * session.addLine({ name: 'Ürün', quantity: 10, price: 100, kdvPercent: 20 });
 * session.setType('TEVKIFAT');
 * session.updateLine(0, { withholdingTaxCode: '601' });
 * ```
 */

import { EventEmitter } from 'events';
import type { SimpleInvoiceInput, SimplePartyInput, SimpleLineInput, SimpleBillingReferenceInput, SimplePaymentMeansInput, SimpleOzelMatrahInput, SimpleSgkInput, SimpleBuyerCustomerInput, SimplePeriodInput } from './simple-types';
import type { CalculatedDocument } from './document-calculator';
import { calculateDocument } from './document-calculator';
import type { InvoiceUIState, ValidationWarning, FieldVisibility, CustomerLiability } from './invoice-rules';
import { deriveUIState, resolveProfileForType, resolveTypeForProfile, validateInvoiceState, getAvailableExemptions, getAllowedProfilesForType, getAllowedTypesForProfile } from './invoice-rules';
import type { InvoiceInput } from '../types/invoice-input';
import { mapSimpleToInvoiceInput } from './simple-invoice-mapper';
import { SimpleInvoiceBuilder } from './simple-invoice-builder';

// ─── Session Event Tipleri ───────────────────────────────────────────────────

export interface SessionEvents {
  /** Her hesaplama sonrasında tetiklenir */
  'calculated': CalculatedDocument;
  /** UI state değiştiğinde tetiklenir */
  'ui-state-changed': InvoiceUIState;
  /** Fatura tipi değiştiğinde tetiklenir */
  'type-changed': { type: string; profile: string; previousType: string; previousProfile: string };
  /** Profil değiştiğinde tetiklenir */
  'profile-changed': { profile: string; type: string; previousProfile: string; previousType: string };
  /** Satır eklendiğinde */
  'line-added': { index: number; line: SimpleLineInput };
  /** Satır güncellendiğinde */
  'line-updated': { index: number; line: SimpleLineInput };
  /** Satır silindiğinde */
  'line-removed': { index: number };
  /** Validasyon uyarıları değiştiğinde */
  'warnings': ValidationWarning[];
  /** Herhangi bir veri değişikliğinde (debounce için) */
  'changed': SimpleInvoiceInput;
  /** Liability değiştiğinde */
  'liability-changed': { liability: CustomerLiability | undefined; previousLiability: CustomerLiability | undefined };
  /** Hata oluştuğunda */
  'error': Error;
}

export type SessionEventName = keyof SessionEvents;

// ─── Session Sınıfı ─────────────────────────────────────────────────────────

/** InvoiceSession oluşturma seçenekleri */
export interface InvoiceSessionOptions {
  /** Otomatik hesaplama (varsayılan: true) */
  autoCalculate?: boolean;
  /** Başlangıç fatura verileri */
  initialInput?: Partial<SimpleInvoiceInput>;
  /**
   * Alıcının e-belge mükellefiyet durumu.
   * - `einvoice` → EARSIVFATURA ve IHRACAT hariç tüm profiller
   * - `earchive` → sadece EARSIVFATURA profili
   */
  liability?: CustomerLiability;
  /**
   * İhracat fatura session'ı.
   * Sadece başlangıçta `true` verilebilir.
   * `true` ise profil IHRACAT olarak sabitlenir ve değiştirilemez.
   * Runtime'da setProfile('IHRACAT') ile geçiş yapILAMAZ.
   */
  isExport?: boolean;
}

export class InvoiceSession extends EventEmitter {
  private _input: SimpleInvoiceInput;
  private _calculation: CalculatedDocument | null = null;
  private _uiState: InvoiceUIState;
  private _autoCalculate: boolean;
  private _liability?: CustomerLiability;
  private readonly _isExport: boolean;

  constructor(options?: InvoiceSessionOptions) {
    super();
    this._autoCalculate = options?.autoCalculate ?? true;
    this._liability = options?.liability;
    this._isExport = options?.isExport ?? false;

    // M10: İhracat session'ı ise profil IHRACAT + tip ISTISNA zorlanır (M2 identity)
    const initialProfile = this._isExport
      ? 'IHRACAT'
      : options?.initialInput?.profile;

    const initialType = this._isExport
      ? 'ISTISNA'
      : options?.initialInput?.type;

    // Boş başlangıç input'u
    this._input = {
      sender: options?.initialInput?.sender ?? { taxNumber: '', name: '', address: '', district: '', city: '' },
      customer: options?.initialInput?.customer ?? { taxNumber: '', name: '', address: '', district: '', city: '' },
      lines: options?.initialInput?.lines ?? [],
      ...options?.initialInput,
      profile: initialProfile,
      type: initialType,
    };

    // Liability'ye göre varsayılan profili belirle
    const effectiveProfile = this._input.profile
      ?? (this._liability === 'earchive' ? 'EARSIVFATURA' : 'TICARIFATURA');
    const effectiveType = this._input.type ?? 'SATIS';
    this._input.profile = effectiveProfile;
    this._input.type = effectiveType;

    this._uiState = deriveUIState(
      effectiveType,
      effectiveProfile,
      this._input.currencyCode,
      this._liability,
      this._isExport,
    );
  }

  // ─── Getter'lar ─────────────────────────────────────────────────────────

  /** Mevcut fatura girişi */
  get input(): Readonly<SimpleInvoiceInput> {
    return this._input;
  }

  /** Son hesaplama sonucu */
  get calculation(): CalculatedDocument | null {
    return this._calculation;
  }

  /** Mevcut UI state */
  get uiState(): InvoiceUIState {
    return this._uiState;
  }

  /** Mevcut alan görünürlükleri */
  get fields(): FieldVisibility {
    return this._uiState.fields;
  }

  /** Mevcut validasyon uyarıları */
  get warnings(): ValidationWarning[] {
    return this._uiState.warnings;
  }

  /** Alıcı mükellefiyet durumu */
  get liability(): CustomerLiability | undefined {
    return this._liability;
  }

  /** İhracat session'ı mı? (sadece constructor'da belirlenir) */
  get isExport(): boolean {
    return this._isExport;
  }

  /**
   * Alıcı mükellefiyet durumunu değiştirir.
   * Profil/tip uyumsuzsa otomatik olarak uyumlu değere geçer.
   *
   * Örn: liability='earchive' yapılırsa ve mevcut profil TICARIFATURA ise
   * → profil otomatik EARSIVFATURA olur.
   */
  setLiability(liability: CustomerLiability | undefined): void {
    // M10: isExport=true session'larında liability değişmez, profil IHRACAT kalır.
    if (this._isExport) return;

    const previousLiability = this._liability;
    this._liability = liability;

    if (previousLiability === liability) return;

    const currentProfile = this._input.profile ?? 'TICARIFATURA';
    const currentType = this._input.type ?? 'SATIS';

    // Mevcut profil yeni liability ile uyumlu mu kontrol et
    const allowedProfiles = getAllowedProfilesForType(currentType, liability, this._isExport);

    if (!allowedProfiles.includes(currentProfile)) {
      // Uyumsuz — uyumlu profile geç
      const newProfile = resolveProfileForType(undefined, currentType, liability, this._isExport);
      const newType = resolveTypeForProfile(currentType, newProfile, liability);
      this._input = { ...this._input, profile: newProfile, type: newType };
    }

    this.updateUIState();
    this.emit('liability-changed', { liability, previousLiability });
    this.onChanged();
  }

  // ─── Taraf Yönetimi ─────────────────────────────────────────────────────

  /** Gönderici bilgisini günceller */
  setSender(sender: SimplePartyInput): void {
    this._input = { ...this._input, sender };
    this.onChanged();
  }

  /** Alıcı bilgisini günceller */
  setCustomer(customer: SimplePartyInput): void {
    this._input = { ...this._input, customer };
    this.onChanged();
  }

  /** Alıcı kurum bilgisini günceller (IHRACAT / KAMU / YOLCUBERABERFATURA) */
  setBuyerCustomer(buyer: SimpleBuyerCustomerInput | undefined): void {
    this._input = { ...this._input, buyerCustomer: buyer };
    this.onChanged();
  }

  // ─── Tip ve Profil Yönetimi ─────────────────────────────────────────────

  /**
   * Fatura tipini değiştirir.
   * Profil uyumsuzsa otomatik olarak uyumlu profile geçer.
   * Örnek: Ticari → IADE seçilirse → profil otomatik TEMELFATURA olur.
   */
  setType(type: string): void {
    const previousType = this._input.type ?? 'SATIS';
    const previousProfile = this._input.profile ?? 'TICARIFATURA';

    // İhracat session'ında profil değişmez, tip IHRACAT profiline uyumlu olmalı
    const newProfile = this._isExport
      ? 'IHRACAT'
      : resolveProfileForType(this._input.profile, type, this._liability, false);
    this._input = { ...this._input, type, profile: newProfile };

    this.updateUIState();

    this.emit('type-changed', {
      type,
      profile: newProfile,
      previousType,
      previousProfile,
    });

    this.onChanged();
  }

  /**
   * Fatura profilini değiştirir.
   * Tip uyumsuzsa otomatik olarak uyumlu tipe geçer.
   */
  setProfile(profile: string): void {
    // İhracat session'ında profil değiştirilemez
    if (this._isExport) {
      this.emit('error', new Error('İhracat session\'larında profil değiştirilemez. Profil IHRACAT olarak sabitlenmiştir.'));
      return;
    }

    // IHRACAT profiline geçiş session üzerinden yapılamaz
    if (profile === 'IHRACAT') {
      this.emit('error', new Error('IHRACAT profiline geçiş yapmak için yeni bir InvoiceSession({ isExport: true }) oluşturun.'));
      return;
    }

    // Liability kısıtı: earchive sadece EARSIVFATURA, einvoice EARSIVFATURA hariç
    if (this._liability === 'earchive' && profile !== 'EARSIVFATURA') {
      this.emit('error', new Error('e-Arşiv mükelleflerinde sadece EARSIVFATURA profili kullanılabilir.'));
      return;
    }
    if (this._liability === 'einvoice' && profile === 'EARSIVFATURA') {
      this.emit('error', new Error('e-Fatura mükelleflerinde EARSIVFATURA profili kullanılamaz.'));
      return;
    }

    const previousProfile = this._input.profile ?? 'TICARIFATURA';
    const previousType = this._input.type ?? 'SATIS';

    const newType = resolveTypeForProfile(this._input.type, profile, this._liability);
    this._input = { ...this._input, profile, type: newType };

    this.updateUIState();

    this.emit('profile-changed', {
      profile,
      type: newType,
      previousProfile,
      previousType,
    });

    this.onChanged();
  }

  // ─── Satır Yönetimi ─────────────────────────────────────────────────────

  /** Yeni satır ekler */
  addLine(line: SimpleLineInput): void {
    const lines = [...this._input.lines, line];
    this._input = { ...this._input, lines };
    this.emit('line-added', { index: lines.length - 1, line });
    this.onChanged();
  }

  /** Mevcut satırı günceller */
  updateLine(index: number, updates: Partial<SimpleLineInput>): void {
    if (index < 0 || index >= this._input.lines.length) return;

    const lines = [...this._input.lines];
    lines[index] = { ...lines[index], ...updates };
    this._input = { ...this._input, lines };
    this.emit('line-updated', { index, line: lines[index] });
    this.onChanged();
  }

  /** Satır siler */
  removeLine(index: number): void {
    if (index < 0 || index >= this._input.lines.length) return;

    const lines = this._input.lines.filter((_, i) => i !== index);
    this._input = { ...this._input, lines };
    this.emit('line-removed', { index });
    this.onChanged();
  }

  /** Tüm satırları değiştirir */
  setLines(lines: SimpleLineInput[]): void {
    this._input = { ...this._input, lines };
    this.onChanged();
  }

  // ─── Para Birimi ────────────────────────────────────────────────────────

  /** Para birimini değiştirir */
  setCurrency(code: string, exchangeRate?: number): void {
    this._input = { ...this._input, currencyCode: code, exchangeRate };
    this.updateUIState();
    this.onChanged();
  }

  // ─── Referanslar ────────────────────────────────────────────────────────

  /** İade fatura referansını ayarlar */
  setBillingReference(ref: SimpleBillingReferenceInput | undefined): void {
    this._input = { ...this._input, billingReference: ref };
    this.onChanged();
  }

  /** Ödeme bilgisini ayarlar */
  setPaymentMeans(pm: SimplePaymentMeansInput | undefined): void {
    this._input = { ...this._input, paymentMeans: pm };
    this.onChanged();
  }

  // ─── Özel Alanlar ──────────────────────────────────────────────────────

  /** KDV istisna kodunu ayarlar */
  setKdvExemptionCode(code: string | undefined): void {
    this._input = { ...this._input, kdvExemptionCode: code };
    this.onChanged();
  }

  /** Özel matrah bilgisini ayarlar */
  setOzelMatrah(om: SimpleOzelMatrahInput | undefined): void {
    this._input = { ...this._input, ozelMatrah: om };
    this.onChanged();
  }

  /** SGK bilgisini ayarlar */
  setSgkInfo(sgk: SimpleSgkInput | undefined): void {
    this._input = { ...this._input, sgk };
    this.onChanged();
  }

  /** Fatura dönemini ayarlar */
  setInvoicePeriod(period: SimplePeriodInput | undefined): void {
    this._input = { ...this._input, invoicePeriod: period };
    this.onChanged();
  }

  /** Notları ayarlar */
  setNotes(notes: string[]): void {
    this._input = { ...this._input, notes };
    this.onChanged();
  }

  /** Fatura numarasını ayarlar */
  setId(id: string): void {
    this._input = { ...this._input, id };
  }

  /** Tarih/saati ayarlar */
  setDatetime(datetime: string): void {
    this._input = { ...this._input, datetime };
  }

  // ─── Toplu Güncelleme ──────────────────────────────────────────────────

  /**
   * Input'un tamamını değiştirir.
   * Import/restore senaryoları için.
   */
  setInput(input: SimpleInvoiceInput): void {
    this._input = { ...input };
    this.updateUIState();
    this.onChanged();
  }

  /**
   * Input'un kısmi alanlarını günceller.
   */
  patchInput(patch: Partial<SimpleInvoiceInput>): void {
    this._input = { ...this._input, ...patch };
    if (patch.type || patch.profile || patch.currencyCode) {
      this.updateUIState();
    }
    this.onChanged();
  }

  // ─── Hesaplama ─────────────────────────────────────────────────────────

  /**
   * Manuel hesaplama tetikler.
   * autoCalculate=false ise kullanışlıdır.
   */
  calculate(): CalculatedDocument | null {
    if (this._input.lines.length === 0) {
      this._calculation = null;
      return null;
    }

    try {
      this._calculation = calculateDocument(this._input);
      this.emit('calculated', this._calculation);

      // Hesaplama sonrası tip/profil güncellemesi
      if (!this._input.type && this._calculation.type !== (this._input.type ?? 'SATIS')) {
        this.updateUIState();
      }

      return this._calculation;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Tam InvoiceInput'a dönüştürür (XML üretmek için).
   */
  toInvoiceInput(): InvoiceInput {
    return mapSimpleToInvoiceInput(this._input);
  }

  /**
   * XML üretir.
   */
  buildXml(options?: { validationLevel?: 'none' | 'basic' | 'strict' }): string {
    const builder = new SimpleInvoiceBuilder({
      validationLevel: options?.validationLevel ?? 'none',
    });
    return builder.build(this._input).xml;
  }

  // ─── Sorgulama Yardımcıları ────────────────────────────────────────────

  /**
   * Belirli bir tip için izin verilen profilleri döndürür.
   * UI'da profil dropdown'ını doldurmak için.
   */
  getAllowedProfiles(type?: string): string[] {
    return getAllowedProfilesForType(
      type ?? this._input.type ?? 'SATIS',
      this._liability,
      this._isExport,
    );
  }

  /**
   * Belirli bir profil için izin verilen tipleri döndürür.
   * UI'da tip dropdown'ını doldurmak için.
   */
  getAllowedTypes(profile?: string): string[] {
    return getAllowedTypesForProfile(
      profile ?? this._input.profile ?? 'TICARIFATURA',
      this._liability,
    );
  }

  /**
   * Mevcut tipe uygun istisna kodlarını döndürür.
   */
  getAvailableExemptions(): ReturnType<typeof getAvailableExemptions> {
    return getAvailableExemptions(this._input.type ?? 'SATIS');
  }

  /**
   * Validasyon uyarılarını güncel state'e göre hesaplar.
   */
  validate(): ValidationWarning[] {
    const warnings = validateInvoiceState({
      type: this._input.type ?? this._calculation?.type ?? 'SATIS',
      profile: this._input.profile ?? this._calculation?.profile ?? 'TICARIFATURA',
      currencyCode: this._input.currencyCode,
      exchangeRate: this._input.exchangeRate,
      billingReferenceId: this._input.billingReference?.id,
      hasPaymentMeans: !!this._input.paymentMeans,
      paymentMeansCode: this._input.paymentMeans?.meansCode,
      paymentAccountNumber: this._input.paymentMeans?.accountNumber,
      kdvExemptionCode: this._input.kdvExemptionCode,
      hasWithholdingLines: this._input.lines.some(l => !!l.withholdingTaxCode),
      hasBuyerCustomer: !!this._input.buyerCustomer,
      ytbNo: this._input.ytbNo,
      hasSevkiyatNo: !!this._input.sender?.identifications?.some(id => id.schemeId === 'SEVKIYATNO'),
    });

    this._uiState = { ...this._uiState, warnings };
    this.emit('warnings', warnings);
    return warnings;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private updateUIState(): void {
    const type = this._input.type ?? this._calculation?.type ?? 'SATIS';
    const profile = this._input.profile ?? this._calculation?.profile ?? 'TICARIFATURA';
    this._uiState = deriveUIState(type, profile, this._input.currencyCode, this._liability, this._isExport);
    this.emit('ui-state-changed', this._uiState);
  }

  private onChanged(): void {
    this.emit('changed', this._input);

    if (this._autoCalculate && this._input.lines.length > 0) {
      this.calculate();
    }

    this.validate();
  }
}
