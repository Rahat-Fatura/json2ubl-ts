/**
 * `SelfEmployedVoucherSession` — EventEmitter tabanlı reaktif e-SMM oturumu.
 *
 * ```ts
 * const session = new SelfEmployedVoucherSession();
 * session.on('warnings', w => showWarnings(w));
 * session.update(SelfEmployedVoucherSessionPaths.supplierTaxNumber, '1234567890');
 * session.addLine({ name: 'Danışmanlık', quantity: 1, price: 10_000, kdvPercent: 20 });
 * const xml = session.buildXml();
 * ```
 *
 * ── FATURA/İRSALİYE OTURUMLARININ YAPISAL AYNASI ───────────────────────────
 * Aynı kapı sırası (`src/session/path-gates.ts`, 4 katman), aynı olay adları,
 * aynı olay SIRASI, aynı `update`/`unset`/satır-CRUD/`validate`/`buildXml`
 * yüzeyi. Birini tanıyan diğerini tanır.
 *
 * ── e-SMM'DE OLMAYAN TAŞINMAZ ──────────────────────────────────────────────
 * `ui-state-changed`, `type-changed`, `profile-changed`, görünürlük türetimi ve
 * profil↔tip uzlaşma matrisi BURADA YOKTUR. Gerekçe ölçülebilir: e-SMM'de profil
 * (`EARSIVBELGE`) ve tip (`SERBESTMESLEKMAKBUZU`) TEK DEĞERLİDİR — seçilecek bir
 * şey olmadığı için türetilecek görünürlük de yoktur. Faturada var diye boş bir
 * karşılık taşımak, olmayan bir kararı varmış gibi göstermek olurdu (irsaliyenin
 * `calculate()`/`liability` taşımaması ile aynı disiplin).
 *
 * Buna karşılık `calculate()` BURADA VARDIR (irsaliyede yoktur): makbuzun tutarı
 * ve vergi zinciri vardır, form düzenlenirken canlı toplam göstermek gerekir.
 */

import { EventEmitter } from 'events';
import type {
  SimpleSelfEmployedVoucherInput,
  SimpleSelfEmployedVoucherLineInput,
} from './simple-input';
import type { SelfEmployedVoucherInput } from './input';
import type { CalculatedSelfEmployedVoucher } from './mapper';
import { calculateSelfEmployedVoucher, mapSimpleToSelfEmployedVoucherInput } from './mapper';
import { validateSelfEmployedVoucher } from './rules';
import { SelfEmployedVoucherBuilder } from './builder';
import type { SelfEmployedVoucherSessionUpdateOverloads } from './session-paths.generated';
import {
  SELF_EMPLOYED_VOUCHER_KNOWN_PATH_TEMPLATES,
  SELF_EMPLOYED_VOUCHER_READ_ONLY_PATHS,
} from './session-paths.generated';
import type { SimplePartyIdentification } from '../../calculator/simple-types';
import { applyPathUpdate, readPath, deepEqual } from '../../calculator/session-path-utils';
import { runPathGates } from '../../session';
import type {
  SessionPathErrorCode,
  SessionPathErrorPayload,
  ValidationWarning,
} from '../../session';
import type { ValidationError } from '../../errors/ubl-build-error';

// ─── Olay sözleşmesi ────────────────────────────────────────────────────────

/**
 * Yol hatası kodları — ÇEKİRDEĞİN KENDİSİ.
 *
 * Fatura kendi kısıt kodlarını (`PROFILE_EXPORT_MISMATCH` …) bu birliğe EKLER;
 * e-SMM'de eklenecek kısıt olmadığı için union çekirdekle aynıdır (irsaliyeyle
 * aynı durum). Desen: `src/session/path-error.ts`.
 */
export type SelfEmployedVoucherPathErrorCode = SessionPathErrorCode;

/** Yol hatası yükü — çekirdek sözleşmenin aynısı. */
export type SelfEmployedVoucherPathErrorPayload =
  SessionPathErrorPayload<SelfEmployedVoucherPathErrorCode>;

export interface SelfEmployedVoucherFieldChangedPayload {
  path: string;
  value: unknown;
  previousValue: unknown;
}

export interface SelfEmployedVoucherLineFieldChangedPayload {
  lineIndex: number;
  path: string;
  field: string;
  value: unknown;
  previousValue: unknown;
}

export interface SelfEmployedVoucherSessionEvents {
  /** Satır eklendi. */
  'line-added': { index: number; line: SimpleSelfEmployedVoucherLineInput };
  /** Satır güncellendi. */
  'line-updated': { index: number; line: SimpleSelfEmployedVoucherLineInput };
  /** Satır silindi. */
  'line-removed': { index: number };
  /** Doğrulama uyarıları değişti. */
  'warnings': ValidationWarning[];
  /** Herhangi bir veri değişikliği (debounce için). */
  'changed': SimpleSelfEmployedVoucherInput;
  /** Toplam zinciri yeniden hesaplandı. */
  'calculated': CalculatedSelfEmployedVoucher;
  /** Beklenmeyen çalışma-zamanı istisnası (yol reddi için `path-error` kullanılır). */
  'error': Error;
  /** Yol tabanlı güncelleme reddedildi — 4 katmanlı kapı sonrası. */
  'path-error': SelfEmployedVoucherPathErrorPayload;
  /** Doğrulayıcı boru hattının ham çıktısı. */
  'validation-error': ValidationError[];
  /** Her başarılı `update()` sonrası ilk yayılan olay. */
  'field-changed': SelfEmployedVoucherFieldChangedPayload;
  /** `lines[i].X` yollarında ek olarak yayılır. */
  'line-field-changed': SelfEmployedVoucherLineFieldChangedPayload;
}

export type SelfEmployedVoucherSessionEventName = keyof SelfEmployedVoucherSessionEvents;

/**
 * `unset(scope)` ile temizlenebilir OPSİYONEL alanlar.
 *
 * Zorunlu alanlar (`supplier`, `customer`, `lines`) kapsam DIŞIDIR — fatura ve
 * irsaliye `UnsetScope` ölçütüyle aynı.
 */
export type SelfEmployedVoucherUnsetScope =
  | 'notes'
  | 'documentNumber'
  | 'exchangeRate'
  | 'sendMethod'
  | 'incomeTaxWithholdingPercent'
  | 'vatWithholdingPercent'
  | 'kdvExemptionCode'
  | 'kdvExemptionReason';

/** `removeIdentification` / `setIdentifications` taraf seçicisi. */
export type SelfEmployedVoucherIdentificationParty = 'supplier' | 'customer';

export interface SelfEmployedVoucherSessionOptions {
  initialInput?: Partial<SimpleSelfEmployedVoucherInput>;
}

/** Üretilen yol overload'larını sınıfa enjekte eder (declaration merging). */
export interface SelfEmployedVoucherSession extends SelfEmployedVoucherSessionUpdateOverloads {}

export class SelfEmployedVoucherSession extends EventEmitter {
  private _input: SimpleSelfEmployedVoucherInput;
  private _warnings: ValidationWarning[];

  constructor(options?: SelfEmployedVoucherSessionOptions) {
    super();

    /* Zorunlu alanlar BOŞ DEĞERLE mount edilir ki `update('supplier.name', …)`
     * ilk çağrıda çalışsın (fatura/irsaliye yapıcısıyla aynı disiplin). */
    this._input = {
      supplier: options?.initialInput?.supplier ?? emptyParty(),
      customer: options?.initialInput?.customer ?? emptyParty(),
      lines: options?.initialInput?.lines ?? [],
      ...options?.initialInput,
    };

    /* 🔴 YAPICIDAN SANAL METOT ÇAĞRILMAZ — ilk anlık görüntü MODÜL DÜZEYİNDE
     * SAF fonksiyonla hesaplanır. Gerekçe `DespatchSession` yapıcısındadır. */
    this._warnings = computeValidation(this._input).warnings;
  }

  // ─── Getter'lar ───────────────────────────────────────────────────────────

  /** Mevcut makbuz girdisi. */
  get input(): Readonly<SimpleSelfEmployedVoucherInput> {
    return this._input;
  }

  /** Mevcut doğrulama uyarıları. */
  get warnings(): ValidationWarning[] {
    return this._warnings;
  }

  // ─── Yol tabanlı güncelleme ──────────────────────────────────────────────

  /**
   * Yol tabanlı reaktif güncelleme.
   *
   * Kapılar 4 ORTAK katman (`src/session/path-gates.ts`):
   *   1. Sözdizimi → `INVALID_PATH` · 2. Salt-okuma → `READ_ONLY_PATH` (küme BOŞ)
   *   3. Bilinen yol → `UNKNOWN_PATH` · 4. Dizi sınırı → `INDEX_OUT_OF_BOUNDS`
   *
   * Olay SIRASI bir sözleşmedir:
   *   `field-changed` → `line-field-changed` → `changed` → `calculated`
   *   → `validation-error` → `warnings`
   */
  update(path: string, value: unknown): void {
    const gate = runPathGates(path, value, {
      knownPathTemplates: SELF_EMPLOYED_VOUCHER_KNOWN_PATH_TEMPLATES,
      readOnlyPaths: SELF_EMPLOYED_VOUCHER_READ_ONLY_PATHS,
      root: this._input,
    });
    if (!gate.ok) {
      this.emit('path-error', gate.error);
      return;
    }

    const previousValue = readPath(this._input, gate.tokens);
    if (deepEqual(previousValue, value)) return; // no-op

    this._input = applyPathUpdate(this._input, gate.tokens, value);

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

    this.onChanged();
  }

  /**
   * Opsiyonel alanı tamamen kaldırır (`_input[scope] = undefined`).
   *
   * `update('notes', [])` ile karıştırılmamalıdır: `unset` alanı XML'den TÜMÜYLE
   * düşürür. Önceki değer `undefined` ise no-op.
   */
  unset(scope: SelfEmployedVoucherUnsetScope): void {
    const previousValue = this._input[scope];
    if (previousValue === undefined) return;

    const next = { ...this._input };
    delete (next as Record<string, unknown>)[scope];
    this._input = next;

    this.emit('field-changed', { path: scope, value: undefined, previousValue });
    this.onChanged();
  }

  // ─── Satır yönetimi ──────────────────────────────────────────────────────

  addLine(line: SimpleSelfEmployedVoucherLineInput): void {
    const lines = [...this._input.lines, line];
    this._input = { ...this._input, lines };
    this.emit('line-added', { index: lines.length - 1, line });
    this.onChanged();
  }

  updateLine(index: number, updates: Partial<SimpleSelfEmployedVoucherLineInput>): void {
    if (index < 0 || index >= this._input.lines.length) return;
    const lines = [...this._input.lines];
    lines[index] = { ...lines[index], ...updates };
    this._input = { ...this._input, lines };
    this.emit('line-updated', { index, line: lines[index] });
    this.onChanged();
  }

  removeLine(index: number): void {
    if (index < 0 || index >= this._input.lines.length) return;
    const lines = this._input.lines.filter((_, i) => i !== index);
    this._input = { ...this._input, lines };
    this.emit('line-removed', { index });
    this.onChanged();
  }

  setLines(lines: SimpleSelfEmployedVoucherLineInput[]): void {
    this._input = { ...this._input, lines };
    this.onChanged();
  }

  // ─── Taraf kimlikleri ────────────────────────────────────────────────────

  /**
   * Taraf kimlikleri dizisinden bir indeksi siler.
   *
   * Yol tabanlı `update()` dizide indeks KAYDIRAMAZ. Son eleman silinince alan
   * `undefined` yapılır — şematron boş `schemeID` taşıyan `cbc:ID`yi reddeder.
   */
  removeIdentification(party: SelfEmployedVoucherIdentificationParty, index: number): void {
    const arr = this._input[party]?.identifications;
    if (!arr || index < 0 || index >= arr.length) return;
    const next = arr.length === 1 ? undefined : arr.filter((_, i) => i !== index);
    this._setIdentificationsInternal(party, next);
  }

  /** Taraf kimlikleri dizisini tümüyle değiştirir (boş dizi → `undefined`). */
  setIdentifications(
    party: SelfEmployedVoucherIdentificationParty,
    identifications: SimplePartyIdentification[] | undefined,
  ): void {
    const next = !identifications || identifications.length === 0 ? undefined : identifications;
    this._setIdentificationsInternal(party, next);
  }

  private _setIdentificationsInternal(
    party: SelfEmployedVoucherIdentificationParty,
    next: SimplePartyIdentification[] | undefined,
  ): void {
    const partyObj = this._input[party];
    if (!partyObj) return;

    const previousValue = partyObj.identifications;
    if (deepEqual(previousValue, next)) return;

    const updatedParty: Record<string, unknown> = { ...partyObj };
    if (next === undefined) delete updatedParty.identifications;
    else updatedParty.identifications = next;

    this._input = { ...this._input, [party]: updatedParty } as SimpleSelfEmployedVoucherInput;

    this.emit('field-changed', {
      path: `${party}.identifications`,
      value: next,
      previousValue,
    });
    this.onChanged();
  }

  // ─── Dönüşüm / hesap / üretim ────────────────────────────────────────────

  /** Toplam zincirini hesaplar (XML üretmez). */
  calculate(): CalculatedSelfEmployedVoucher {
    return calculateSelfEmployedVoucher(this._input);
  }

  /** Ham `SelfEmployedVoucherInput`a çevirir. */
  toVoucherInput(): SelfEmployedVoucherInput {
    return mapSimpleToSelfEmployedVoucherInput(this._input);
  }

  /** XML üretir. */
  buildXml(options?: { validationLevel?: 'none' | 'basic' | 'strict' }): string {
    const builder = new SelfEmployedVoucherBuilder({
      prettyPrint: true,
      validationLevel: options?.validationLevel ?? 'none',
    });
    return builder.build(this.toVoucherInput());
  }

  // ─── Doğrulama ───────────────────────────────────────────────────────────

  /** Uyarıları güncel duruma göre hesaplar ve yayar (ham akış → köprülenmiş uyarı). */
  validate(): ValidationWarning[] {
    const { warnings, errors } = computeValidation(this._input);
    this._warnings = warnings;
    this.emit('validation-error', errors);
    this.emit('warnings', warnings);
    return warnings;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private onChanged(): void {
    this.emit('changed', this._input);
    try {
      this.emit('calculated', calculateSelfEmployedVoucher(this._input));
    } catch (err) {
      // Hesap motoru beklenmedik girdide patlarsa oturum ÇÖKMEZ; doğrulama
      // aşağıda aynı hatayı kullanıcı diline çevirir.
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
    this.validate();
  }
}

// ─── Modül düzeyi saf yardımcılar ───────────────────────────────────────────
//
// 🔴 `this` TAŞIMAZ: yapıcı bunları çağırır ve yapıcıdan örnek metodu çağırmak
// türev sınıflarda kurulmamış alanların üstünde koşar.

/**
 * Doğrulama boru hattının SAF çekirdeği — durum yazmaz, olay yaymaz.
 *
 * 🔴 `stage: 'session'` — form DÜZENLENİRKEN belge numarası BOŞ olmalıdır;
 * numarayı gönderim anında seri motoru verir. Bitmiş belge yolu
 * (`SelfEmployedVoucherBuilder.build`) varsayılan `'document'` aşamasında kalır
 * ve numarayı ZORUNLU tutmaya devam eder.
 */
function computeValidation(
  input: SimpleSelfEmployedVoucherInput,
): { warnings: ValidationWarning[]; errors: ValidationError[] } {
  let errors: ValidationError[];
  try {
    errors = validateSelfEmployedVoucher(mapSimpleToSelfEmployedVoucherInput(input), {
      stage: 'session',
    });
  } catch (err) {
    errors = [{
      code: 'MAPPING_ERROR',
      message: err instanceof Error ? err.message : String(err),
      path: 'lines',
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

/** `lines[3].quantity` → `{ index: 3, field: 'quantity' }`; değilse `null`. */
function parseLineIndex(path: string): { index: number; field: string } | null {
  const match = /^lines\[(\d+)\]\.(.+)$/.exec(path);
  if (!match) return null;
  return { index: parseInt(match[1], 10), field: match[2] };
}

/** Boş taraf iskeleti — yapıcının zorunlu alanları mount etmesi için. */
function emptyParty(): SimpleSelfEmployedVoucherInput['supplier'] {
  return { taxNumber: '', name: '', address: '', district: '', city: '' };
}
