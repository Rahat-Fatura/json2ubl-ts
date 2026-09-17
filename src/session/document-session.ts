/**
 * `DocumentSession` — reaktif belge oturumlarının ORTAK GÖVDESİ.
 *
 * ── NİYE VAR ───────────────────────────────────────────────────────────────
 * e-SMM oturumu 400 satırdı ve e-MM oturumu onun yapısal İKİZİ olacaktı: aynı
 * 4 katmanlı kapı sırası, aynı olay adları, aynı olay SIRASI, aynı
 * `update`/`unset`/satır-CRUD/`setIdentifications`/`validate`/`buildXml` yüzeyi.
 * Kopyalansaydı iki gövde ilk düzeltmede AYRIŞIRDI — ve ayrışma sessiz olurdu,
 * çünkü iki ayrı test dosyası iki ayrı gövdeyi ayrı ayrı yeşil gösterir.
 *
 * Bu sınıf o gövdenin TEK kopyasıdır. Belge türüne ait olan her şey
 * `DocumentSessionAdapter` üzerinden GELİR; sınıf hiçbir belge türünü import
 * etmez (bu yüzden `session/` katmanında durur, `documents/` altında değil).
 *
 * ── ALT SINIFIN İŞİ ────────────────────────────────────────────────────────
 * Alt sınıf üç şey yapar, fazlası değil:
 *   1. adaptörü verir (hesap/eşleme/doğrulama/üretim + üretilmiş yol kümeleri),
 *   2. `update()` overload'larını declaration-merging ile enjekte eder,
 *   3. belgeye ÖZGÜ olanı ekler (e-SMM/e-MM'de `calculate()` vardır; irsaliyede
 *      olmazdı — makbuzun tutarı vardır, irsaliyenin yoktur).
 *
 * ── OLAY SÖZLEŞMESİ (DEĞİŞMEZ) ─────────────────────────────────────────────
 * Her başarılı `update()` sonrası olaylar ŞU SIRAYLA yayılır:
 *   `field-changed` → `line-field-changed` → `changed` → `calculated`
 *   → `validation-error` → `warnings`
 * Sıra bir sözleşmedir: tüketici `calculated`ı gördüğünde `changed`ın çoktan
 * yayıldığını varsayar.
 *
 * ── 🔴 YAPICIDAN SANAL METOT ÇAĞRILMAZ ─────────────────────────────────────
 * İlk uyarı anlık görüntüsü modül düzeyinde SAF `computeValidation` ile alınır.
 * Yapıcıdan bir örnek metodu çağrılsaydı, türev sınıfın HENÜZ KURULMAMIŞ
 * alanlarının üstünde koşardı (`DespatchSession` yapıcısında ölçülmüş kusur).
 */

import { EventEmitter } from 'events';
import type { ValidationError } from '../errors/ubl-build-error';
import type { SimplePartyIdentification, SimplePartyInput } from '../calculator/simple-types';
import { applyPathUpdate, readPath, deepEqual } from '../calculator/session-path-utils';
import { runPathGates } from './path-gates';
import type { ValidationWarning } from './validation-warning';

/** Oturumun üzerinde çalıştığı girdinin ZORUNLU ekseni — iki taraf + kalemler. */
export interface DocumentSessionInputShape<TLine> {
  supplier: SimplePartyInput;
  customer: SimplePartyInput;
  lines: TLine[];
}

/** `removeIdentification` / `setIdentifications` taraf seçicisi. */
export type DocumentSessionParty = 'supplier' | 'customer';

/** `buildXml` seçenekleri — üç belge türünde de aynı. */
export interface DocumentSessionBuildOptions {
  validationLevel?: 'none' | 'basic' | 'strict';
}

/**
 * Belge türüne ÖZGÜ olan her şey — oturum gövdesine parametre olarak GELİR.
 *
 * Adaptör SAF'tır: durum tutmaz, olay yaymaz. Oturumun tek "bildiği" belge
 * bilgisi budur; bu yüzden yeni bir belge türü oturum gövdesine DOKUNMADAN
 * eklenebilir.
 */
export interface DocumentSessionAdapter<TInput, TCalc, TRaw> {
  /** Zorunlu alanların BOŞ DEĞERLE mount edilmiş hâli (yapıcı iskeleti). */
  emptyInput(): TInput;
  /** Toplam zincirini çözer — XML üretmez. */
  calculate(input: TInput): TCalc;
  /** Basit girdiyi ham UBL girdisine çevirir. */
  toRawInput(input: TInput): TRaw;
  /**
   * Ham girdiyi `'session'` aşamasında doğrular.
   *
   * 🔴 AŞAMA `'session'`: form DÜZENLENİRKEN belge numarası BOŞ olmalıdır;
   * numarayı gönderim anında seri motoru verir. Bitmiş belge yolu (builder)
   * varsayılan `'document'` aşamasında kalır ve numarayı ZORUNLU tutar.
   */
  validateSession(raw: TRaw): ValidationError[];
  /** Ham girdiden XML üretir. */
  buildXml(raw: TRaw, validationLevel: 'none' | 'basic' | 'strict'): string;
  /** Üretilmiş bilinen-yol kümesi (`*_KNOWN_PATH_TEMPLATES`). */
  knownPathTemplates: ReadonlySet<string>;
  /** Yapıcıda kilitlenmiş yollar (`*_READ_ONLY_PATHS`). */
  readOnlyPaths: ReadonlySet<string>;
}

export interface DocumentFieldChangedPayload {
  path: string;
  value: unknown;
  previousValue: unknown;
}

export interface DocumentLineFieldChangedPayload {
  lineIndex: number;
  path: string;
  field: string;
  value: unknown;
  previousValue: unknown;
}

/**
 * Ortak oturum gövdesi.
 *
 * @typeParam TInput  Basit girdi (`Simple*Input`) — oturumun KONUŞTUĞU dil.
 * @typeParam TLine   Basit kalem (`Simple*LineInput`).
 * @typeParam TCalc   Hesap sonucu (`Calculated*`).
 * @typeParam TRaw    Ham UBL girdisi (`*Input`).
 * @typeParam TScope  `unset()` ile temizlenebilir OPSİYONEL alan adları.
 */
export abstract class DocumentSession<
  TInput extends DocumentSessionInputShape<TLine>,
  TLine,
  TCalc,
  TRaw,
  TScope extends string,
> extends EventEmitter {
  private readonly adapter: DocumentSessionAdapter<TInput, TCalc, TRaw>;
  private _input: TInput;
  private _warnings: ValidationWarning[];

  protected constructor(
    adapter: DocumentSessionAdapter<TInput, TCalc, TRaw>,
    initialInput?: Partial<TInput>,
  ) {
    super();
    this.adapter = adapter;

    /* Zorunlu alanlar BOŞ DEĞERLE mount edilir ki `update('supplier.name', …)`
     * ilk çağrıda çalışsın. */
    const empty = adapter.emptyInput();
    this._input = {
      ...empty,
      ...initialInput,
      supplier: initialInput?.supplier ?? empty.supplier,
      customer: initialInput?.customer ?? empty.customer,
      lines: initialInput?.lines ?? empty.lines,
    } as TInput;

    this._warnings = computeValidation(adapter, this._input).warnings;
  }

  // ─── Getter'lar ───────────────────────────────────────────────────────────

  /** Mevcut belge girdisi. */
  get input(): Readonly<TInput> {
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
   *   1. Sözdizimi → `INVALID_PATH` · 2. Salt-okuma → `READ_ONLY_PATH`
   *   3. Bilinen yol → `UNKNOWN_PATH` · 4. Dizi sınırı → `INDEX_OUT_OF_BOUNDS`
   */
  update(path: string, value: unknown): void {
    const gate = runPathGates(path, value, {
      knownPathTemplates: this.adapter.knownPathTemplates,
      readOnlyPaths: this.adapter.readOnlyPaths,
      root: this._input,
    });
    if (!gate.ok) {
      this.emit('path-error', gate.error);
      return;
    }

    const previousValue = readPath(this._input, gate.tokens);
    if (deepEqual(previousValue, value)) return; // no-op

    this._input = applyPathUpdate(this._input, gate.tokens, value) as TInput;

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
  unset(scope: TScope): void {
    const previousValue = (this._input as Record<string, unknown>)[scope];
    if (previousValue === undefined) return;

    const next = { ...this._input };
    delete (next as Record<string, unknown>)[scope];
    this._input = next;

    this.emit('field-changed', { path: scope, value: undefined, previousValue });
    this.onChanged();
  }

  // ─── Satır yönetimi ──────────────────────────────────────────────────────

  addLine(line: TLine): void {
    const lines = [...this._input.lines, line];
    this._input = { ...this._input, lines };
    this.emit('line-added', { index: lines.length - 1, line });
    this.onChanged();
  }

  updateLine(index: number, updates: Partial<TLine>): void {
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

  setLines(lines: TLine[]): void {
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
  removeIdentification(party: DocumentSessionParty, index: number): void {
    const arr = this._input[party]?.identifications;
    if (!arr || index < 0 || index >= arr.length) return;
    const next = arr.length === 1 ? undefined : arr.filter((_, i) => i !== index);
    this.setIdentificationsInternal(party, next);
  }

  /** Taraf kimlikleri dizisini tümüyle değiştirir (boş dizi → `undefined`). */
  setIdentifications(
    party: DocumentSessionParty,
    identifications: SimplePartyIdentification[] | undefined,
  ): void {
    const next = !identifications || identifications.length === 0 ? undefined : identifications;
    this.setIdentificationsInternal(party, next);
  }

  private setIdentificationsInternal(
    party: DocumentSessionParty,
    next: SimplePartyIdentification[] | undefined,
  ): void {
    const partyObj = this._input[party];
    if (!partyObj) return;

    const previousValue = partyObj.identifications;
    if (deepEqual(previousValue, next)) return;

    const updatedParty: Record<string, unknown> = { ...partyObj };
    if (next === undefined) delete updatedParty.identifications;
    else updatedParty.identifications = next;

    this._input = { ...this._input, [party]: updatedParty } as TInput;

    this.emit('field-changed', {
      path: `${party}.identifications`,
      value: next,
      previousValue,
    });
    this.onChanged();
  }

  // ─── Dönüşüm / hesap / üretim ────────────────────────────────────────────

  /**
   * Toplam zincirini hesaplar (XML üretmez).
   *
   * `protected`: belgeye özgü DÖNÜŞ TİPİYLE dışa açmak alt sınıfın işidir
   * (`calculate(): CalculatedProducerReceipt`). Ortak gövde jenerik `TCalc`
   * döndürür; tüketici yüzeyinde jenerik bir ad görünmemelidir.
   */
  protected calculateInternal(): TCalc {
    return this.adapter.calculate(this._input);
  }

  /** Ham UBL girdisine çevirir — alt sınıf kendi adıyla dışa açar. */
  protected toRawInputInternal(): TRaw {
    return this.adapter.toRawInput(this._input);
  }

  /** XML üretir. */
  buildXml(options?: DocumentSessionBuildOptions): string {
    return this.adapter.buildXml(
      this.adapter.toRawInput(this._input),
      options?.validationLevel ?? 'none',
    );
  }

  // ─── Doğrulama ───────────────────────────────────────────────────────────

  /** Uyarıları güncel duruma göre hesaplar ve yayar (ham akış → köprülenmiş uyarı). */
  validate(): ValidationWarning[] {
    const { warnings, errors } = computeValidation(this.adapter, this._input);
    this._warnings = warnings;
    this.emit('validation-error', errors);
    this.emit('warnings', warnings);
    return warnings;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private onChanged(): void {
    this.emit('changed', this._input);
    try {
      this.emit('calculated', this.adapter.calculate(this._input));
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

/** Doğrulama boru hattının SAF çekirdeği — durum yazmaz, olay yaymaz. */
function computeValidation<TInput, TCalc, TRaw>(
  adapter: DocumentSessionAdapter<TInput, TCalc, TRaw>,
  input: TInput,
): { warnings: ValidationWarning[]; errors: ValidationError[] } {
  let errors: ValidationError[];
  try {
    errors = adapter.validateSession(adapter.toRawInput(input));
  } catch (err) {
    errors = [
      {
        code: 'MAPPING_ERROR',
        message: err instanceof Error ? err.message : String(err),
        path: 'lines',
      },
    ];
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
export function emptySessionParty(): SimplePartyInput {
  return { taxNumber: '', name: '', address: '', district: '', city: '' };
}
