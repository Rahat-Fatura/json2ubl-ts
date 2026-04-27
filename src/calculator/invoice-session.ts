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
import type { SimpleInvoiceInput, SimpleLineInput } from './simple-types';
import type { CalculatedDocument } from './document-calculator';
import { calculateDocument } from './document-calculator';
import type { InvoiceUIState, ValidationWarning, FieldVisibility, CustomerLiability } from './invoice-rules';
import { deriveUIState, resolveProfileForType, resolveTypeForProfile, validateInvoiceState, getAvailableExemptions, getAllowedProfilesForType, getAllowedTypesForProfile } from './invoice-rules';
import type { InvoiceInput } from '../types/invoice-input';
import { mapSimpleToInvoiceInput } from './simple-invoice-mapper';
import { SimpleInvoiceBuilder } from './simple-invoice-builder';
import type { SessionPathMap } from './session-paths.generated';
import { KNOWN_PATH_TEMPLATES, READ_ONLY_PATHS } from './session-paths.generated';
import { parsePath, applyPathUpdate, readPath, deepEqual, tokensToTemplate, PathParseError } from './session-path-utils';
import { deriveLineFieldVisibility } from './line-field-visibility';
import type { ValidationError } from '../errors/ubl-build-error';
import { validateSimpleLineRanges } from '../validators/simple-line-range-validator';
import { validateManualExemption } from '../validators/manual-exemption-validator';
import { validatePhantomKdv } from '../validators/phantom-kdv-validator';
import { validateSgkInput } from '../validators/sgk-input-validator';
import { validateCrossMatrix } from '../validators/cross-validators';

// ─── Session Event Tipleri ───────────────────────────────────────────────────

/**
 * Path-based update reddedildiğinde emit edilen structured hata kodu (D-Seçenek B).
 *
 * 3 katmanlı hata hierarchy:
 *   - 'error': Unexpected runtime exception (calculate throw, vb.)
 *   - 'path-error': update() çağrısı reddedildi (path validation + constraint)
 *   - 'validation-error': Business validation (validator pipeline raw stream, 8h.7)
 */
export type PathErrorCode =
  | 'INVALID_PATH'                  // §1.4 Katman 1: parser syntax error
  | 'READ_ONLY_PATH'                // §1.4 Katman 2: 'isExport' constructor-locked
  | 'UNKNOWN_PATH'                  // §1.4 Katman 3: SessionPaths map'inde yok
  | 'INDEX_OUT_OF_BOUNDS'           // §1.4 Katman 4: lines[5] but length=3
  | 'PROFILE_EXPORT_MISMATCH'       // 8h.3: isExport=true ile çakışan profile (constraint)
  | 'PROFILE_LIABILITY_MISMATCH'    // 8h.3: liability ile çakışan profile (constraint)
  | 'LIABILITY_LOCKED_BY_EXPORT';   // M10: isExport=true session'da liability değiştirme

export interface PathErrorPayload {
  code: PathErrorCode;
  path: string;
  reason: string;
  /** İhlal eden value (constraint check'te dolar) */
  requestedValue?: unknown;
}

/**
 * Field-level event payload'ları (Sprint 8h.4 / AR-10).
 *
 * `fieldChanged` D-12 force davranışı: isExport=true session'da update(type, 'SATIS')
 * çağrısında applied value 'ISTISNA' olur (force). requestedValue='SATIS' + forcedReason='isExport=true'
 * payload'a eklenir; UI "kullanıcı seçimi engellendi" mesajı gösterebilir.
 */
export interface FieldChangedPayload {
  path: string;
  /** Applied value (auto-resolve / force sonrası gerçek değer) */
  value: unknown;
  previousValue: unknown;
  /** Kullanıcının istediği değer (D-12: force durumunda value'dan farklı olabilir) */
  requestedValue?: unknown;
  /** Auto-force sebebi (örn. 'isExport=true', 'liability auto-resolve') */
  forcedReason?: string;
}

export interface FieldActivatedPayload {
  path: string;
  reason: string;
}

export interface FieldDeactivatedPayload {
  path: string;
  reason: string;
}

export interface LineFieldChangedPayload {
  lineIndex: number;
  path: string;
  field: string;
  value: unknown;
  previousValue: unknown;
}

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
  /**
   * Beklenmeyen runtime exception (calculate throw, vb.).
   * NOT: Path-related rejection (READ_ONLY_PATH vb.) için 'path-error' event'i kullan.
   */
  'error': Error;
  /**
   * Path-based update reddedildi (D-Seçenek B / Sprint 8h.2).
   * 4 katmanlı path validation + constraint check sonrası emit edilir.
   * update() çağrısı no-op döner; state mutate edilmez.
   */
  'path-error': PathErrorPayload;
  /**
   * Validator pipeline raw stream (Sprint 8h.7 / AR-10).
   * 5 validator (line-range, manual-exemption, phantom-kdv, sgk-input, cross-matrix)
   * her validate() çağrısında deterministik çalışır; sonuç ValidationError[] formatında emit.
   * 'warnings' event birleşik (rules + bridged) ValidationWarning[] yayar; 'validation-error'
   * raw path+code stream sağlar (UI'da detaylı debug için).
   */
  'validation-error': ValidationError[];
  /**
   * Granüler field değişikliği (Sprint 8h.4 / AR-10).
   * Her başarılı update() sonrası ilk emit edilen event (sıra adımı 5).
   * D-12 force durumunda da emit edilir (state değişmemiş olsa bile, requestedValue/forcedReason ile).
   */
  'field-changed': FieldChangedPayload;
  /**
   * UI visibility flag false → true geçişi (Sprint 8h.4 / AR-10).
   * deriveFieldVisibility diff sonucunda emit edilir.
   */
  'field-activated': FieldActivatedPayload;
  /**
   * UI visibility flag true → false geçişi (Sprint 8h.4 / AR-10).
   */
  'field-deactivated': FieldDeactivatedPayload;
  /**
   * Line-level field değişikliği (Sprint 8h.4 / AR-10).
   * lines[i].X path'lerinde emit edilir; doc-level update'lerde emit edilmez.
   * NOT: addLine/removeLine değil — sadece update(SessionPaths.lineX(i), …) ve updateLine.
   */
  'line-field-changed': LineFieldChangedPayload;
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
  /**
   * 555 Demirbaş KDV oranı kullanımına izin (M4 / B-78.1).
   * `BuilderOptions.allowReducedKdvRate` ile aynı semantik — Mimsoft form opt-in.
   * False (varsayılan) ise validateInvoiceState 555 kdvExemptionCode'u reddeder.
   */
  allowReducedKdvRate?: boolean;
}

export class InvoiceSession extends EventEmitter {
  private _input: SimpleInvoiceInput;
  private _calculation: CalculatedDocument | null = null;
  private _uiState: InvoiceUIState;
  private _autoCalculate: boolean;
  private _liability?: CustomerLiability;
  private readonly _isExport: boolean;
  private readonly _allowReducedKdvRate: boolean;
  /** Sprint 8h.7 / D-3: toInvoiceInput() reference equality cache. */
  private _invoiceInputCache?: { input: SimpleInvoiceInput; result: InvoiceInput };

  constructor(options?: InvoiceSessionOptions) {
    super();
    this._autoCalculate = options?.autoCalculate ?? true;
    this._liability = options?.liability;
    this._isExport = options?.isExport ?? false;
    this._allowReducedKdvRate = options?.allowReducedKdvRate ?? false;

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

    // Sprint 8h.5: Initial lineFields senkron
    this._uiState.lineFields = this._input.lines.map((line, idx) =>
      deriveLineFieldVisibility(line, this._input, idx)
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

  // ─── Path-Based Update API (Sprint 8h.2 / AR-10) ──────────────────────

  /**
   * Path-based reactive update (AR-10 ana giriş noktası).
   *
   * Generic tip türetimi (D-7 / D-8) ile compile-time tip kontrolü:
   * ```ts
   * session.update(SessionPaths.type, 'TEVKIFAT');               // string OK
   * session.update(SessionPaths.lineKdvPercent(0), 18);          // number OK
   * session.update(SessionPaths.lineKdvPercent(0), 'foo');       // ❌ compile-time error
   * ```
   *
   * Path validation 4 katman + constraint check (§1.4):
   *   1. Syntax  → `path-error` { code: 'INVALID_PATH' }
   *   2. Read-only (isExport) → `path-error` { code: 'READ_ONLY_PATH' }
   *   3. Unknown path (SessionPaths map'inde yok) → `path-error` { code: 'UNKNOWN_PATH' }
   *   4. Index bounds (lines[5] ama length=3) → `path-error` { code: 'INDEX_OUT_OF_BOUNDS' }
   *   constraint: liability isExport=true ise → `path-error` { code: 'LIABILITY_LOCKED_BY_EXPORT' }
   *   (PROFILE_*_MISMATCH constraint'i Sprint 8h.3'te eklenir, eski setter mantığı taşınırken.)
   *
   * Diff detection: previousValue === newValue (deep) ise event yayılmaz, no-op.
   *
   * Field-level events (`fieldChanged`/`fieldActivated`/`fieldDeactivated`/`lineFieldChanged`)
   * Sprint 8h.4'te eklenir. Bu commit'te update() mevcut `onChanged` zincirini tetikler:
   * `changed` → `calculate` (autoCalculate) → `validate` → `warnings`.
   */
  update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P]): void {
    // Katman 1: Syntax parsing
    let tokens;
    try {
      tokens = parsePath(path);
    } catch (err) {
      if (err instanceof PathParseError) {
        this.emit('path-error', {
          code: 'INVALID_PATH',
          path,
          reason: err.message,
          requestedValue: value,
        });
        return;
      }
      throw err;
    }

    // Katman 2: Read-only path
    if (READ_ONLY_PATHS.has(path)) {
      this.emit('path-error', {
        code: 'READ_ONLY_PATH',
        path,
        reason: `'${path}' is constructor-only and immutable`,
        requestedValue: value,
      });
      return;
    }

    // Katman 3: SessionPaths map'inde mi?
    const template = tokensToTemplate(tokens);
    if (!KNOWN_PATH_TEMPLATES.has(template)) {
      this.emit('path-error', {
        code: 'UNKNOWN_PATH',
        path,
        reason: `path not in SessionPaths map (template: ${template})`,
        requestedValue: value,
      });
      return;
    }

    // Katman 4: Index bounds (lines[i] ama length<i+1)
    const indexErr = this._checkIndexBounds(tokens, path);
    if (indexErr) {
      this.emit('path-error', indexErr);
      return;
    }

    // Constraint: liability path + isExport=true (M10 kontratı)
    if (path === 'liability' && this._isExport) {
      this.emit('path-error', {
        code: 'LIABILITY_LOCKED_BY_EXPORT',
        path,
        reason: 'isExport=true session ignores liability changes',
        requestedValue: value,
      });
      return;
    }

    // Constraint: profile path (PROFILE_EXPORT_MISMATCH, PROFILE_LIABILITY_MISMATCH)
    if (path === 'profile') {
      const profileErr = this._checkProfileConstraint(value as string);
      if (profileErr) {
        this.emit('path-error', { ...profileErr, requestedValue: value });
        return;
      }
    }

    // Diff detection — değişiklik yoksa no-op
    const previousValue = this._readSessionValue(tokens, path);
    if (deepEqual(previousValue, value)) return;

    // Auto-resolve özel-durumlar (eski setLiability/setType/setProfile mantığı taşınır):
    if (path === 'liability') {
      return this._updateLiability(value as CustomerLiability | undefined, previousValue as CustomerLiability | undefined);
    }
    if (path === 'type') {
      return this._updateType(value as string, previousValue as string | undefined);
    }
    if (path === 'profile') {
      return this._updateProfile(value as string, previousValue as string | undefined);
    }

    // Standart input mutation (path-targeted clone)
    this._input = applyPathUpdate(this._input, tokens, value);

    // Sprint 8h.4: field-level event emit (sıra: granüler önce).
    this.emit('field-changed', {
      path,
      value,
      previousValue,
    });

    // Sprint 8h.4: line-level path için lineFieldChanged ek emit.
    // Sprint 8h.5: lineFields[i] re-derive (line content değişimi visibility'i etkileyebilir).
    if (path.startsWith('lines[')) {
      const lineIdxMatch = path.match(/^lines\[(\d+)\]\.(.+)$/);
      if (lineIdxMatch) {
        const lineIndex = parseInt(lineIdxMatch[1], 10);
        const fieldName = lineIdxMatch[2];
        this.emit('line-field-changed', {
          lineIndex,
          path,
          field: fieldName,
          value,
          previousValue,
        });
        // 8h.5: re-derive lineFields[lineIndex]
        const newLineFields = [...this._uiState.lineFields];
        newLineFields[lineIndex] = deriveLineFieldVisibility(
          this._input.lines[lineIndex],
          this._input,
          lineIndex,
        );
        this._uiState.lineFields = newLineFields;
      }
    }

    // Sprint 8h.8: updateUIState her başarılı update sonrası tetiklenir.
    // Doc-level FieldVisibility (type/profile/currency/liability) değişmemiş olsa
    // bile UI state snapshot (warnings güncel) tüketici tarafından consume edilebilmeli.
    // _updateType/_updateProfile/_updateLiability zaten kendi içinde çağırıyor;
    // bu branch genel mutation için (sender/customer/paymentMeans/lines vb.).
    this.updateUIState();

    this.onChanged();
  }

  // ─── Auto-resolve helper'ları (Sprint 8h.3) ─────────────────────────────

  /**
   * Liability auto-resolve. Eski setLiability mantığı (satır 223-248) update()'e taşındı.
   * Profil mevcut liability ile uyumsuzsa otomatik uyumlu profile geçer.
   */
  private _updateLiability(
    liability: CustomerLiability | undefined,
    previousLiability: CustomerLiability | undefined,
  ): void {
    this._liability = liability;

    const currentProfile = this._input.profile ?? 'TICARIFATURA';
    const currentType = this._input.type ?? 'SATIS';

    const allowedProfiles = getAllowedProfilesForType(currentType, liability, this._isExport);
    if (!allowedProfiles.includes(currentProfile)) {
      const newProfile = resolveProfileForType(undefined, currentType, liability, this._isExport);
      const newType = resolveTypeForProfile(currentType, newProfile, liability);
      this._input = { ...this._input, profile: newProfile, type: newType };
    }

    // Sprint 8h.4: granüler fieldChanged + snapshot
    this.emit('field-changed', {
      path: 'liability',
      value: liability,
      previousValue: previousLiability,
    });
    this.updateUIState();
    this.emit('liability-changed', { liability, previousLiability });
    this.onChanged();
  }

  /**
   * Type auto-resolve. Eski setType mantığı (satır 438-458) update()'e taşındı.
   * isExport=true ise type otomatik ISTISNA'ya force (M10 / D-12 basic).
   * Profile uyumsuzsa otomatik uyumlu profile geçer.
   * NOT: D-12 forcedReason field-level event payload Sprint 8h.4'te eklenir.
   */
  private _updateType(type: string, previousType: string | undefined): void {
    const previousProfile = this._input.profile ?? 'TICARIFATURA';

    // isExport=true → type force ISTISNA (M10 identity, D-12)
    const effectiveType = this._isExport ? 'ISTISNA' : type;
    const isForced = effectiveType !== type;

    // D-12: state değişmedi (force ya da identity) → snapshot event YOK.
    // Force durumunda fieldChanged emit (forcedReason ile, UI bildirim için).
    if (effectiveType === (previousType ?? 'SATIS')) {
      if (isForced) {
        this.emit('field-changed', {
          path: 'type',
          value: effectiveType,
          previousValue: previousType,
          requestedValue: type,
          forcedReason: 'isExport=true (M10 identity: type forced to ISTISNA)',
        });
      }
      return;
    }

    const newProfile = this._isExport
      ? 'IHRACAT'
      : resolveProfileForType(this._input.profile, effectiveType, this._liability, false);

    this._input = { ...this._input, type: effectiveType, profile: newProfile };

    // Sprint 8h.4: granüler fieldChanged (force durumunda forcedReason ile)
    this.emit('field-changed', {
      path: 'type',
      value: effectiveType,
      previousValue: previousType,
      ...(isForced && {
        requestedValue: type,
        forcedReason: 'isExport=true (M10 identity: type forced to ISTISNA)',
      }),
    });

    this.updateUIState();
    this.emit('type-changed', {
      type: effectiveType,
      profile: newProfile,
      previousType: previousType ?? 'SATIS',
      previousProfile,
    });
    this.onChanged();
  }

  /**
   * Profile auto-resolve. Eski setProfile mantığı (satır 464-503) update()'e taşındı.
   * Constraint check (PROFILE_*_MISMATCH) update() içinde Katman 4 sonrası yapılır.
   * Tip uyumsuzsa otomatik uyumlu tipe geçer.
   */
  private _updateProfile(profile: string, previousProfile: string | undefined): void {
    const previousType = this._input.type ?? 'SATIS';
    const newType = resolveTypeForProfile(this._input.type, profile, this._liability);
    this._input = { ...this._input, profile, type: newType };

    // Sprint 8h.4: granüler fieldChanged + snapshot
    this.emit('field-changed', {
      path: 'profile',
      value: profile,
      previousValue: previousProfile,
    });

    this.updateUIState();
    this.emit('profile-changed', {
      profile,
      type: newType,
      previousProfile: previousProfile ?? 'TICARIFATURA',
      previousType,
    });
    this.onChanged();
  }

  /**
   * Profile constraint check. PROFILE_EXPORT_MISMATCH ve PROFILE_LIABILITY_MISMATCH.
   * update() içinde Katman 4 sonrası, diff öncesi çağrılır.
   */
  private _checkProfileConstraint(profile: string): Omit<PathErrorPayload, 'requestedValue'> | null {
    if (this._isExport) {
      return {
        code: 'PROFILE_EXPORT_MISMATCH',
        path: 'profile',
        reason: 'isExport=true session profile is locked to IHRACAT',
      };
    }
    if (profile === 'IHRACAT') {
      return {
        code: 'PROFILE_EXPORT_MISMATCH',
        path: 'profile',
        reason: 'IHRACAT profile cannot be set via update(); use new InvoiceSession({ isExport: true })',
      };
    }
    if (this._liability === 'earchive' && profile !== 'EARSIVFATURA') {
      return {
        code: 'PROFILE_LIABILITY_MISMATCH',
        path: 'profile',
        reason: `liability='earchive' requires profile='EARSIVFATURA' (got '${profile}')`,
      };
    }
    if (this._liability === 'einvoice' && profile === 'EARSIVFATURA') {
      return {
        code: 'PROFILE_LIABILITY_MISMATCH',
        path: 'profile',
        reason: "liability='einvoice' forbids profile='EARSIVFATURA'",
      };
    }
    return null;
  }

  /**
   * Path validation Katman 4: index bounds.
   *
   * Array CRUD (addLine/updateLine/setLines) path-based değil; index ile yeni
   * element create EDİLMEZ. `taxes[0]` ile sparse array oluşturma engellenir:
   * parent array undefined ise implicit length=0 → INDEX_OUT_OF_BOUNDS.
   */
  private _checkIndexBounds(
    tokens: ReturnType<typeof parsePath>,
    path: string,
  ): PathErrorPayload | null {
    let current: any = this._input;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.kind === 'index') {
        // Parent array undefined/null → length=0 implicit, index 0+ reddedilir
        if (current === undefined || current === null) {
          return {
            code: 'INDEX_OUT_OF_BOUNDS',
            path,
            reason: `parent array is undefined (implicit length=0), cannot access index ${token.value}`,
          };
        }
        if (!Array.isArray(current)) return null;   // type mismatch, Katman 3 atmalıydı
        if (token.value >= current.length) {
          return {
            code: 'INDEX_OUT_OF_BOUNDS',
            path,
            reason: `index ${token.value} but length=${current.length}`,
          };
        }
      }
      current = token.kind === 'index' ? current[token.value] : (current ?? {})[token.value];
    }
    return null;
  }

  /** SessionPaths value oku (liability özel-durum: _liability private field). */
  private _readSessionValue(
    tokens: ReturnType<typeof parsePath>,
    path: string,
  ): unknown {
    if (path === 'liability') return this._liability;
    return readPath(this._input, tokens);
  }

  // ─── Satır Yönetimi ─────────────────────────────────────────────────────

  /** Yeni satır ekler */
  addLine(line: SimpleLineInput): void {
    const lines = [...this._input.lines, line];
    this._input = { ...this._input, lines };
    // Sprint 8h.5: lineFields senkron — yeni satır için derive
    const newIdx = lines.length - 1;
    this._uiState.lineFields = [
      ...this._uiState.lineFields,
      deriveLineFieldVisibility(line, this._input, newIdx),
    ];
    this.emit('line-added', { index: newIdx, line });
    this.onChanged();
  }

  /** Mevcut satırı günceller */
  updateLine(index: number, updates: Partial<SimpleLineInput>): void {
    if (index < 0 || index >= this._input.lines.length) return;

    const lines = [...this._input.lines];
    lines[index] = { ...lines[index], ...updates };
    this._input = { ...this._input, lines };
    // Sprint 8h.5: lineFields[i] re-derive
    const newLineFields = [...this._uiState.lineFields];
    newLineFields[index] = deriveLineFieldVisibility(lines[index], this._input, index);
    this._uiState.lineFields = newLineFields;
    this.emit('line-updated', { index, line: lines[index] });
    this.onChanged();
  }

  /** Satır siler */
  removeLine(index: number): void {
    if (index < 0 || index >= this._input.lines.length) return;

    const lines = this._input.lines.filter((_, i) => i !== index);
    this._input = { ...this._input, lines };
    // Sprint 8h.5: lineFields aynı index'te splice
    this._uiState.lineFields = this._uiState.lineFields.filter((_, i) => i !== index);
    this.emit('line-removed', { index });
    this.onChanged();
  }

  /** Tüm satırları değiştirir */
  setLines(lines: SimpleLineInput[]): void {
    this._input = { ...this._input, lines };
    // Sprint 8h.5: lineFields tamamen yeniden derive
    this._uiState.lineFields = lines.map((line, idx) =>
      deriveLineFieldVisibility(line, this._input, idx)
    );
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
   * Sprint 8h.7 / D-3: reference equality cache. _input değişmediği sürece mapper atlanır.
   */
  toInvoiceInput(): InvoiceInput {
    return this._getCachedInvoiceInput();
  }

  /**
   * Cache'li InvoiceInput erişimi (D-3 deterministic + reference equality).
   * Cache invalidation otomatik: _input her başarılı update sonrası yeni reference.
   * Diff check (§1.3) no-op'ta cache invalide olmaz.
   */
  private _getCachedInvoiceInput(): InvoiceInput {
    if (this._invoiceInputCache?.input === this._input) {
      return this._invoiceInputCache.result;
    }
    const result = mapSimpleToInvoiceInput(this._input);
    this._invoiceInputCache = { input: this._input, result };
    return result;
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
   * Sprint 8h.6: B-78 parametreleri (allowReducedKdvRate, ytbAllKdvPositive, hasGtip,
   * hasAliciDibKod, has4171Code, ihracatPartyComplete, yolcuBuyerComplete) artık
   * deriveB78Params() üzerinden otomatik geçiriliyor (önceden eksikti).
   */
  validate(): ValidationWarning[] {
    const b78Params = this.deriveB78Params();

    // Rules-based check (mevcut + B-78 parametreleri ile, Sprint 8h.6)
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
      ...b78Params,
    });

    // Sprint 8h.7: 5 validator pipeline (D-3 deterministic)
    const errors: ValidationError[] = [];

    // 4 simple-input validator (pure, throw atmaz)
    errors.push(...validateSimpleLineRanges(this._input));
    errors.push(...validateManualExemption(this._input));
    errors.push(...validatePhantomKdv(this._input));
    errors.push(...validateSgkInput(this._input));

    // validateCrossMatrix InvoiceInput ister; cache'li mapper (D-3).
    // Mapper içinde calculator throw edebilir (örn. 650 percent eksik) — bunu
    // validation hatası olarak ele al (error event uncaught olmasın).
    try {
      errors.push(...validateCrossMatrix(this._getCachedInvoiceInput()));
    } catch (err) {
      errors.push({
        code: 'CALCULATION_ERROR',
        message: err instanceof Error ? err.message : String(err),
        path: 'lines',
      });
    }

    // Sprint 8h.7: ValidationError → ValidationWarning köprü
    const bridged: ValidationWarning[] = errors.map(e => ({
      field: e.path ?? 'unknown',
      message: e.message,
      severity: 'error' as const,
      code: e.code,
    }));

    const all = [...warnings, ...bridged];
    this._uiState = { ...this._uiState, warnings: all };

    this.emit('validation-error', errors);
    this.emit('warnings', all);
    return all;
  }

  /**
   * B-78 paraleli kural parametre türetimi (Sprint 8h.6 / AR-10).
   *
   * Mevcut session 8h öncesi bu parametreleri geçirmiyordu (validateInvoiceState
   * §2.5 envanterinde belirlendi). Şimdi otomatik türetilir:
   *  - allowReducedKdvRate: opt-in flag (constructor option, M4 / B-78.1)
   *  - ytbAllKdvPositive: YATIRIMTESVIK + tüm satırlarda KDV>0 (B-78.2)
   *  - hasGtip / hasAliciDibKod: tüm satırlarda delivery alanları (B-78.3)
   *  - has4171Code: en az bir satırda taxes[].code='4171' (B-78.4)
   *  - ihracatPartyComplete: sender.name + taxOffice (B-78.5)
   *  - yolcuBuyerComplete: buyerCustomer.nationalityId + passportId (B-78.5)
   */
  private deriveB78Params(): {
    allowReducedKdvRate: boolean;
    ytbAllKdvPositive: boolean;
    hasGtip: boolean;
    hasAliciDibKod: boolean;
    has4171Code: boolean;
    ihracatPartyComplete: boolean;
    yolcuBuyerComplete: boolean;
  } {
    const lines = this._input.lines;
    const linesPresent = lines.length > 0;

    return {
      allowReducedKdvRate: this._allowReducedKdvRate,

      ytbAllKdvPositive: this._input.profile === 'YATIRIMTESVIK'
        ? (linesPresent && lines.every(l => l.kdvPercent > 0))
        : true,   // diğer profillerde irrelevant, true → rule trigger olmasın

      hasGtip: linesPresent && lines.every(l => !!l.delivery?.gtipNo),

      hasAliciDibKod: linesPresent && lines.every(l => !!l.delivery?.alicidibsatirkod),

      has4171Code: lines.some(l => l.taxes?.some(t => t.code === '4171') ?? false),

      ihracatPartyComplete: !!this._input.sender?.name?.trim()
        && !!this._input.sender?.taxOffice?.trim(),

      yolcuBuyerComplete: !!this._input.buyerCustomer?.nationalityId?.trim()
        && !!this._input.buyerCustomer?.passportId?.trim(),
    };
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private updateUIState(): void {
    const type = this._input.type ?? this._calculation?.type ?? 'SATIS';
    const profile = this._input.profile ?? this._calculation?.profile ?? 'TICARIFATURA';
    const previousFields = this._uiState.fields;
    const newUIState = deriveUIState(type, profile, this._input.currencyCode, this._liability, this._isExport);

    // Sprint 8h.5: doc-level değişim → tüm lineFields re-derive
    newUIState.lineFields = this._input.lines.map((line, idx) =>
      deriveLineFieldVisibility(line, this._input, idx)
    );

    // Sprint 8h.4: doc-level FieldVisibility diff → field-activated/field-deactivated
    this._emitFieldVisibilityDiff(previousFields, newUIState.fields);

    this._uiState = newUIState;
    this.emit('ui-state-changed', this._uiState);
  }

  /** Doc-level FieldVisibility diff emit (field-activated / field-deactivated). */
  private _emitFieldVisibilityDiff(prev: FieldVisibility, next: FieldVisibility): void {
    const keys = Object.keys(next) as (keyof FieldVisibility)[];
    for (const key of keys) {
      const wasVisible = prev[key];
      const isVisible = next[key];
      if (!wasVisible && isVisible) {
        this.emit('field-activated', {
          path: `fields.${key}`,
          reason: `derived from type=${this._input.type}, profile=${this._input.profile}`,
        });
      } else if (wasVisible && !isVisible) {
        this.emit('field-deactivated', {
          path: `fields.${key}`,
          reason: `derived from type=${this._input.type}, profile=${this._input.profile}`,
        });
      }
    }
  }

  private onChanged(): void {
    this.emit('changed', this._input);

    if (this._autoCalculate && this._input.lines.length > 0) {
      this.calculate();
    }

    this.validate();
  }
}
