/**
 * DespatchSession — EventEmitter tabanlı reaktif e-İrsaliye oturumu.
 *
 * Frontend'de canlı veri girişi sırasında:
 * - Path tabanlı alan güncelleme (`update`) + composite temizleme (`unset`)
 * - Satır ekleme/güncelleme/silme
 * - Tip/profil değişiminde UI state derivation
 * - Validasyon uyarıları ve XML üretimi
 *
 * Kullanım:
 * ```typescript
 * import { DespatchSession, DespatchSessionPaths } from 'json2ubl-ts';
 *
 * const session = new DespatchSession();
 *
 * // Event dinleme
 * session.on('ui-state-changed', (state) => updateFormFields(state));
 * session.on('warnings', (warnings) => showWarnings(warnings));
 *
 * // Veri güncelleme
 * session.update(DespatchSessionPaths.senderTaxNumber, '1234567890');
 * session.update(DespatchSessionPaths.type, 'SEVK');   // düz string — enum GEREKMEZ
 * session.addLine({ name: 'Ürün', quantity: 10, unitCode: 'C62' });
 * const xml = session.buildXml();
 * ```
 *
 * ── 🔴 FATURA OTURUMUNUN YAPISAL AYNASI ────────────────────────────────────
 * `InvoiceSession` ile aynı iskelet: aynı kapı sırası, aynı olay adları, aynı
 * olay SIRASI, aynı `update`/`unset`/satır-CRUD/`validate`/`buildXml` yüzeyi.
 * Birini tanıyan diğerini tanır.
 *
 * ── İRSALİYEDE OLMAYAN TAŞINMAZ ────────────────────────────────────────────
 * `calculate()`, hesaplama motoru, mükellefiyet (`liability`), `isExport`,
 * istisna/tevkifat, öneri motoru, B-78 parametreleri ve profil↔tip uzlaşma
 * matrisi BURADA YOKTUR. Gerekçe: irsaliyede tutar/vergi yoktur, alıcının
 * mükellefiyeti profil seçmez ve tip kümesi profilden bağımsızdır
 * (bkz. `despatch-rules.ts` başı). Faturada var diye boş bir karşılık taşımak
 * olmayan bir kuralı varmış gibi göstermek olurdu.
 */

import { EventEmitter } from 'events';
import type {
  SimpleDespatchInput,
  SimpleDespatchLineInput,
} from './simple-despatch-types';
import type { SimplePartyIdentification } from './simple-types';
import type { DespatchUIState, DespatchFieldVisibility } from './despatch-rules';
import { deriveDespatchUIState, DEFAULT_DESPATCH_PROFILE, DEFAULT_DESPATCH_TYPE } from './despatch-rules';
import type { ValidationWarning } from '../session/validation-warning';
import type { DespatchInput } from '../types/despatch-input';
import { mapSimpleToDespatchInput } from './simple-despatch-mapper';
import { DespatchBuilder } from '../builders/despatch-builder';
import type { DespatchSessionUpdateOverloads } from './despatch-session-paths.generated';
import {
  DESPATCH_KNOWN_PATH_TEMPLATES,
  DESPATCH_READ_ONLY_PATHS,
} from './despatch-session-paths.generated';
import { applyPathUpdate, readPath, deepEqual } from './session-path-utils';
import { runPathGates, diffVisibility } from '../session';
import type { SessionPathErrorCode, SessionPathErrorPayload } from '../session';
import type { ValidationError } from '../errors/ubl-build-error';
import { validateDespatch } from '../validators/despatch-validators';

// ─── Session Event Tipleri ───────────────────────────────────────────────────

/**
 * Path tabanlı güncelleme reddedildiğinde yayılan yapısal hata kodu.
 *
 * 🔴 İrsaliyede ÇEKİRDEK 4 KATMANDAN BAŞKASI YOKTUR. Fatura kendi kod kümesini
 * (`PROFILE_EXPORT_MISMATCH`, `LIABILITY_LOCKED_BY_EXPORT` …) bu birliğe EKLER;
 * irsaliyede eklenecek kısıt olmadığı için union çekirdeğin kendisidir.
 * Desen `src/session/path-error.ts` başında tanımlıdır.
 */
export type DespatchPathErrorCode = SessionPathErrorCode;

/** Yol hatası yükü — çekirdek sözleşmenin aynısı. */
export type DespatchPathErrorPayload = SessionPathErrorPayload<DespatchPathErrorCode>;

/** Granüler alan değişikliği yükü (fatura `FieldChangedPayload` muadili). */
export interface DespatchFieldChangedPayload {
  path: string;
  /** Uygulanan değer */
  value: unknown;
  previousValue: unknown;
}

export interface DespatchFieldActivatedPayload {
  path: string;
  reason: string;
}

export interface DespatchFieldDeactivatedPayload {
  path: string;
  reason: string;
}

export interface DespatchLineFieldChangedPayload {
  lineIndex: number;
  path: string;
  field: string;
  value: unknown;
  previousValue: unknown;
}

export interface DespatchSessionEvents {
  /** UI state değiştiğinde tetiklenir */
  'ui-state-changed': DespatchUIState;
  /** İrsaliye tipi değiştiğinde (SEVK ↔ MATBUDAN) */
  'type-changed': { type: string; previousType: string };
  /** Profil değiştiğinde (TEMELIRSALIYE / HKSIRSALIYE / IDISIRSALIYE) */
  'profile-changed': { profile: string; previousProfile: string };
  /** Satır eklendiğinde */
  'line-added': { index: number; line: SimpleDespatchLineInput };
  /** Satır güncellendiğinde */
  'line-updated': { index: number; line: SimpleDespatchLineInput };
  /** Satır silindiğinde */
  'line-removed': { index: number };
  /** Validasyon uyarıları değiştiğinde */
  'warnings': ValidationWarning[];
  /** Herhangi bir veri değişikliğinde (debounce için) */
  'changed': SimpleDespatchInput;
  /**
   * Beklenmeyen runtime exception.
   * NOT: Path reddi için 'path-error' kullanılır.
   */
  'error': Error;
  /** Path tabanlı güncelleme reddedildi — 4 katmanlı kapı sonrası */
  'path-error': DespatchPathErrorPayload;
  /** Doğrulayıcı boru hattının ham çıktısı (path + code akışı) */
  'validation-error': ValidationError[];
  /** Her başarılı `update()` sonrası ilk yayılan olay */
  'field-changed': DespatchFieldChangedPayload;
  /** Görünürlük bayrağı false → true geçişi */
  'field-activated': DespatchFieldActivatedPayload;
  /** Görünürlük bayrağı true → false geçişi */
  'field-deactivated': DespatchFieldDeactivatedPayload;
  /** `lines[i].X` yollarında ek olarak yayılır */
  'line-field-changed': DespatchLineFieldChangedPayload;
}

export type DespatchSessionEventName = keyof DespatchSessionEvents;

/**
 * `DespatchSession.unset(scope)` ile temizlenebilir composite alanlar.
 *
 * Yalnız OPSİYONEL composite'ler kapsanır. `type`, `profile`, `sender`,
 * `customer`, `shipment`, `lines` zorunludur — `unset()` kabul etmez (fatura
 * `UnsetScope` ile aynı ölçüt).
 */
export type DespatchUnsetScope =
  | 'notes'
  | 'orderReferences'
  | 'additionalDocuments'
  | 'despatchContactName'
  | 'buyerCustomer'
  | 'sellerSupplier'
  | 'originator';

/**
 * `removeIdentification` / `setIdentifications` API'lerinde taraf seçici.
 * Fatura `IdentificationParty` muadili; irsaliyenin taraf kümesi daha geniştir.
 */
export type DespatchIdentificationParty =
  | 'sender'
  | 'customer'
  | 'buyerCustomer'
  | 'sellerSupplier'
  | 'originator';

// ─── Session Sınıfı ─────────────────────────────────────────────────────────

/** `DespatchSession` oluşturma seçenekleri */
export interface DespatchSessionOptions {
  /** Başlangıç irsaliye verileri */
  initialInput?: Partial<SimpleDespatchInput>;
}

/**
 * Üretilen path overload'larını class'a enjekte eder (declaration merging).
 * Fatura tarafındaki `InvoiceSession extends InvoiceSessionUpdateOverloads` ile
 * birebir aynı mekanizma — gerekçesi için üretilen dosyanın başlığına bakınız.
 */
export interface DespatchSession extends DespatchSessionUpdateOverloads {}

export class DespatchSession extends EventEmitter {
  private _input: SimpleDespatchInput;
  private _uiState: DespatchUIState;

  constructor(options?: DespatchSessionOptions) {
    super();

    /* Boş başlangıç girdisi. Fatura yapıcısıyla aynı disiplin: zorunlu alanlar
     * BOŞ DEĞERLE mount edilir ki `update('sender.name', …)` ilk çağrıda
     * çalışsın; tip/profil belgelenmiş varsayılana düşer. */
    this._input = {
      sender: options?.initialInput?.sender ?? emptyParty(),
      customer: options?.initialInput?.customer ?? emptyParty(),
      shipment: options?.initialInput?.shipment ?? emptyShipment(),
      lines: options?.initialInput?.lines ?? [],
      ...options?.initialInput,
      type: options?.initialInput?.type ?? DEFAULT_DESPATCH_TYPE,
      profile: options?.initialInput?.profile ?? DEFAULT_DESPATCH_PROFILE,
    };

    /* 🔴 YAPICIDAN SANAL METOT ÇAĞRILMAZ.
     *
     * Türev sınıf alan başlatıcıları `super()` DÖNMEDEN çalışmaz; yapıcıdan
     * çağrılan bir örnek metodu türev sınıfta ezilmişse HENÜZ KURULMAMIŞ
     * alanların üstünde koşar. `InvoiceSession` yapıcısı `this.updateUIState()`
     * ve `this._computeValidation()` çağırır — bugün tek parça olduğu için
     * patlamıyor, ama tüketici tarafında elle yamanması gereken bir kusur.
     *
     * İrsaliyede baştan doğru kuruluyor: ilk anlık görüntü MODÜL DÜZEYİNDE SAF
     * fonksiyonlarla hesaplanır (`deriveDespatchUIState` + `computeValidation`).
     * `this` üzerinden HİÇBİR metot çağrılmaz.
     *
     * Fatura yapıcısının davranışı KORUNUR: ne olay yayılır (henüz dinleyici
     * yok) ne de belge üretilir — yalnız türetilmiş anlık görüntü kurulur. */
    const derived = deriveDespatchUIState(
      this._input.type ?? DEFAULT_DESPATCH_TYPE,
      this._input.profile ?? DEFAULT_DESPATCH_PROFILE,
    );
    this._uiState = { ...derived, warnings: computeValidation(this._input).warnings };
  }

  // ─── Getter'lar ─────────────────────────────────────────────────────────

  /** Mevcut irsaliye girişi */
  get input(): Readonly<SimpleDespatchInput> {
    return this._input;
  }

  /** Mevcut UI state */
  get uiState(): DespatchUIState {
    return this._uiState;
  }

  /** Mevcut alan görünürlükleri */
  get fields(): DespatchFieldVisibility {
    return this._uiState.fields;
  }

  /** Mevcut validasyon uyarıları */
  get warnings(): ValidationWarning[] {
    return this._uiState.warnings;
  }

  // ─── Path-Based Update API ──────────────────────────────────────────────

  /**
   * Path tabanlı reaktif güncelleme.
   *
   * ```ts
   * session.update(DespatchSessionPaths.type, 'MATBUDAN');
   * session.update(DespatchSessionPaths.lineQuantity(0), 12);
   * ```
   *
   * Yol doğrulaması 4 ORTAK katman (`src/session/path-gates.ts`):
   *   1. Sözdizimi   → `path-error` { code: 'INVALID_PATH' }
   *   2. Salt-okuma  → `path-error` { code: 'READ_ONLY_PATH' }  (irsaliyede küme BOŞ)
   *   3. Bilinen yol → `path-error` { code: 'UNKNOWN_PATH' }
   *   4. Dizi sınırı → `path-error` { code: 'INDEX_OUT_OF_BOUNDS' }
   * Faturadaki kısıt katmanı (profil/mükellefiyet çakışması) BURADA YOKTUR.
   *
   * Diff: önceki değer yeniyle derin-eşitse hiçbir olay yayılmaz (no-op).
   *
   * Tüm public overload'lar `DespatchSessionUpdateOverloads` arayüzündedir;
   * burada yalnız uygulama imzası durur (fatura ile aynı çözüm — TS 5.7+
   * `keyof` template literal dağılım kusuru).
   */
  update(path: string, value: unknown): void {
    const gate = runPathGates(path, value, {
      knownPathTemplates: DESPATCH_KNOWN_PATH_TEMPLATES,
      readOnlyPaths: DESPATCH_READ_ONLY_PATHS,
      root: this._input,
    });
    if (!gate.ok) {
      this.emit('path-error', gate.error);
      return;
    }
    const tokens = gate.tokens;

    // Diff — değişiklik yoksa no-op
    const previousValue = readPath(this._input, tokens);
    if (deepEqual(previousValue, value)) return;

    this._input = applyPathUpdate(this._input, tokens, value);

    /* Olay SIRASI bir sözleşmedir (portalın store köprüsüne kadar uzanır):
     *   field-changed → line-field-changed → field-activated/deactivated
     *   → ui-state-changed → changed → validation-error → warnings
     * Fatura oturumuyla BİREBİR aynı. */
    this.emit('field-changed', { path, value, previousValue });

    const lineIndex = parseLineIndex(path);
    if (lineIndex !== null) {
      this.emit('line-field-changed', {
        lineIndex: lineIndex.index,
        path,
        field: lineIndex.field,
        value,
        previousValue,
      });
    }

    /* Tip/profil türetilmiş görünürlüğü değiştirir; kendi olayları
     * `ui-state-changed`ten SONRA yayılır (faturada `_updateType` de böyle). */
    const typeChanged = path === 'type';
    const profileChanged = path === 'profile';

    this.updateUIState();

    if (typeChanged) {
      this.emit('type-changed', {
        type: value as string,
        previousType: (previousValue as string | undefined) ?? DEFAULT_DESPATCH_TYPE,
      });
    }
    if (profileChanged) {
      this.emit('profile-changed', {
        profile: value as string,
        previousProfile: (previousValue as string | undefined) ?? DEFAULT_DESPATCH_PROFILE,
      });
    }

    this.onChanged();
  }

  // ─── Composite scope reset ──────────────────────────────────────────────

  /**
   * Opsiyonel composite alanı tamamen temizler (`_input[scope] = undefined`).
   *
   * `update('despatchContactName', '')` boş-string temizliğiyle karıştırılmamalıdır:
   *   - boş string → XML'de boş eleman / tip ihlali doğurabilir
   *   - `unset(scope)` → alan tümüyle kaldırılır, XML'de hiç görünmez
   *
   * Önceki değer `undefined` ise no-op. Fatura `unset()` davranışının aynısı.
   */
  unset(scope: DespatchUnsetScope): void {
    const previousValue = this._input[scope];
    if (previousValue === undefined) return;

    const next = { ...this._input };
    delete (next as Record<string, unknown>)[scope];
    this._input = next;

    this.emit('field-changed', { path: scope, value: undefined, previousValue });
    this.updateUIState();
    this.onChanged();
  }

  // ─── Satır Yönetimi ─────────────────────────────────────────────────────

  /** Yeni satır ekler */
  addLine(line: SimpleDespatchLineInput): void {
    const lines = [...this._input.lines, line];
    this._input = { ...this._input, lines };
    this.emit('line-added', { index: lines.length - 1, line });
    this.onChanged();
  }

  /** Mevcut satırı günceller */
  updateLine(index: number, updates: Partial<SimpleDespatchLineInput>): void {
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
  setLines(lines: SimpleDespatchLineInput[]): void {
    this._input = { ...this._input, lines };
    this.onChanged();
  }

  // ─── Taraf kimlikleri (dizi splice/replace) ─────────────────────────────

  /**
   * Taraf kimlikleri dizisinde belirli indeksi siler.
   *
   * Path tabanlı `update()` dizide indeks KAYDIRAMAZ; IDIS `SEVKIYATNO`
   * ekle-sil akışında kritiktir (şematron boş `schemeID` taşıyan `cbc:ID`
   * bırakılmasını reddeder). Fatura `removeIdentification` ile aynı davranış:
   * son eleman silinince alan `undefined` yapılır, XML'de hiç görünmez.
   */
  removeIdentification(party: DespatchIdentificationParty, index: number): void {
    const arr = this._input[party]?.identifications;
    if (!arr || index < 0 || index >= arr.length) return;
    const next = arr.length === 1 ? undefined : arr.filter((_, i) => i !== index);
    this._setIdentificationsInternal(party, next);
  }

  /** Taraf kimlikleri dizisini tamamen değiştirir (boş dizi → `undefined`). */
  setIdentifications(
    party: DespatchIdentificationParty,
    identifications: SimplePartyIdentification[] | undefined,
  ): void {
    const next = (!identifications || identifications.length === 0)
      ? undefined
      : identifications;
    this._setIdentificationsInternal(party, next);
  }

  private _setIdentificationsInternal(
    party: DespatchIdentificationParty,
    next: SimplePartyIdentification[] | undefined,
  ): void {
    const partyObj = this._input[party];
    if (!partyObj) return;   // taraf mount edilmemiş

    const previousValue = partyObj.identifications;
    if (deepEqual(previousValue, next)) return;

    const updatedParty: Record<string, unknown> = { ...partyObj };
    if (next === undefined) {
      delete updatedParty.identifications;
    } else {
      updatedParty.identifications = next;
    }
    this._input = { ...this._input, [party]: updatedParty } as SimpleDespatchInput;

    this.emit('field-changed', {
      path: `${party}.identifications`,
      value: next,
      previousValue,
    });
    this.updateUIState();
    this.onChanged();
  }

  // ─── Dönüşüm / Üretim ───────────────────────────────────────────────────

  /**
   * Ham `DespatchInput`'a dönüştürür (XML üretmek ya da doğrulamak için).
   *
   * ⚠️ Faturadaki `toInvoiceInput()` referans-eşitlik CACHE'i taşır çünkü orada
   * dönüşüm hesaplama motorunu çalıştırır (pahalı + UUID determinizmi). İrsaliye
   * dönüşümü doğrudan eşlemedir; cache eklemek ölçülmemiş bir karmaşıklık olurdu.
   * Tek yan etkisi `uuid` üretimidir ve o da `_input.uuid` doluysa hiç koşmaz.
   */
  toDespatchInput(): DespatchInput {
    return mapSimpleToDespatchInput(this._input);
  }

  /** XML üretir. */
  buildXml(options?: { validationLevel?: 'none' | 'basic' | 'strict' }): string {
    const builder = new DespatchBuilder({
      prettyPrint: true,
      validationLevel: options?.validationLevel ?? 'none',
    });
    return builder.build(this.toDespatchInput());
  }

  // ─── Doğrulama ──────────────────────────────────────────────────────────

  /**
   * Doğrulama uyarılarını güncel state'e göre hesaplar ve yayar.
   *
   * Fatura `validate()` ile aynı sıra: önce ham `validation-error` akışı, sonra
   * köprülenmiş `warnings`. (Faturadaki öneri motorunun irsaliyede karşılığı yok.)
   */
  validate(): ValidationWarning[] {
    const { warnings, errors } = computeValidation(this._input);
    this._uiState = { ...this._uiState, warnings };

    this.emit('validation-error', errors);
    this.emit('warnings', warnings);
    return warnings;
  }

  // ─── Private ───────────────────────────────────────────────────────────

  private updateUIState(): void {
    const type = this._input.type ?? DEFAULT_DESPATCH_TYPE;
    const profile = this._input.profile ?? DEFAULT_DESPATCH_PROFILE;
    const previousFields = this._uiState.fields;

    const newUIState = deriveDespatchUIState(type, profile);
    /* Uyarılar türetim çıktısı DEĞİLDİR, anlık görüntüden TAŞINIR — taşınmazsa
     * her `updateUIState()` uyarıları siler ve `validate()` çağrılana kadar
     * uiState eksik kalırdı (faturada yaşanan asimetrinin ta kendisi). */
    newUIState.warnings = this._uiState.warnings;

    this._emitFieldVisibilityDiff(previousFields, newUIState.fields);

    this._uiState = newUIState;
    this.emit('ui-state-changed', this._uiState);
  }

  /**
   * Belge düzeyi görünürlük farkını olaya çevirir.
   *
   * Fark hesabı ORTAK (`src/session/visibility-diff.ts`); emit burada kalır çünkü
   * gerekçe cümlesi (`derived from type=…`) İRSALİYE bilgisidir ve olay sırası
   * bu dosyanın sözleşmesidir. Fatura `_emitFieldVisibilityDiff` ile simetrik.
   */
  private _emitFieldVisibilityDiff(
    prev: DespatchFieldVisibility,
    next: DespatchFieldVisibility,
  ): void {
    const reason = `derived from type=${this._input.type}, profile=${this._input.profile}`;
    for (const { key, activated } of diffVisibility(prev, next)) {
      this.emit(activated ? 'field-activated' : 'field-deactivated', {
        path: `fields.${key}`,
        reason,
      });
    }
  }

  private onChanged(): void {
    this.emit('changed', this._input);
    this.validate();
  }
}

// ─── Modül düzeyi saf yardımcılar ────────────────────────────────────────────
//
// 🔴 Bunlar BİLEREK `this` taşımaz: yapıcı bunları çağırır ve yapıcıdan örnek
// metodu çağırmak türev sınıflarda kurulmamış alanların üstünde koşar.

/**
 * Doğrulama boru hattının SAF çekirdeği — state yazmaz, olay yayınlamaz.
 *
 * `validate()` ile yapıcı bunu ORTAK kullanır (fatura `_computeValidation` ile
 * aynı gerekçe: yapıcı da `uiState.warnings`'i doldurmak zorunda ama orada olay
 * yayınlamak yanlış olurdu — henüz dinleyici yok).
 *
 * Tek doğrulayıcı `validateDespatch`'tir: irsaliyenin TÜM normatif kapıları
 * (plaka zorunluluğu, şoför/taşıyıcı, MATBUDAN ek belgesi, KUNYENO/ETIKETNO,
 * fiili sevk ≥ düzenleme, numara biçimi, teslimat adresi) orada yaşar. İkinci bir
 * "simple katmanı doğrulayıcısı" YAZILMADI: faturada o ayrım hesaplama motorunun
 * girdiye dokunmasından doğar, irsaliyede eşleme birebir olduğu için ham katmanda
 * doğrulamak AYNI şeydir ve iki kopya kural riski taşımaz.
 */
function computeValidation(
  input: SimpleDespatchInput,
): { warnings: ValidationWarning[]; errors: ValidationError[] } {
  let errors: ValidationError[];
  try {
    errors = validateDespatch(mapSimpleToDespatchInput(input));
  } catch (err) {
    // Eşleyici beklenmedik bir girdide patlarsa bunu doğrulama hatası olarak
    // ele al — fatura `_computeValidation` de mapper istisnasını böyle yutar.
    errors = [{
      code: 'MAPPING_ERROR',
      message: err instanceof Error ? err.message : String(err),
      path: 'shipment',
    }];
  }

  const warnings: ValidationWarning[] = errors.map(e => ({
    field: e.path ?? 'unknown',
    message: e.message,
    severity: 'error' as const,
    code: e.code,
  }));

  return { warnings, errors };
}

/** `lines[3].quantity` → { index: 3, field: 'quantity' }; değilse `null`. */
function parseLineIndex(path: string): { index: number; field: string } | null {
  const match = /^lines\[(\d+)\]\.(.+)$/.exec(path);
  if (!match) return null;
  return { index: parseInt(match[1], 10), field: match[2] };
}

/** Boş taraf iskeleti — yapıcının zorunlu alanları mount etmesi için. */
function emptyParty(): SimpleDespatchInput['sender'] {
  return { taxNumber: '', name: '', address: '', district: '', city: '' };
}

/**
 * Boş sevkiyat iskeleti.
 *
 * `actualDespatchDatetime` BOŞ STRING'dir, "şimdi" DEĞİL: oturum kullanıcının
 * girmediği bir zamanı uydurmaz, doğrulayıcı eksikliği bildirir. Eşleyicideki
 * "verilmezse şimdi" dalı XML üretim anına aittir, form durumuna değil.
 */
function emptyShipment(): SimpleDespatchInput['shipment'] {
  return {
    actualDespatchDatetime: '',
    deliveryAddress: { address: '', district: '', city: '', zipCode: '' },
  };
}
