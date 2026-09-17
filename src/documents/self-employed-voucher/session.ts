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
 * ── 🔑 GÖVDE ORTAK ─────────────────────────────────────────────────────────
 * Yol kapıları, olay sırası, satır CRUD'u, `unset`, taraf kimlikleri ve
 * doğrulama boru hattının TAMAMI `session/document-session.ts`tedir. Bu dosya
 * yalnız üç şey yapar: adaptörü verir, `update()` overload'larını enjekte eder
 * ve e-SMM'e özgü DÖNÜŞ TİPLERİYLE `calculate()` / `toVoucherInput()` açar.
 *
 * Gövde kopyalansaydı e-MM oturumuyla ilk düzeltmede AYRIŞIRDI ve ayrışma
 * SESSİZ olurdu — iki ayrı test dosyası iki ayrı gövdeyi ayrı ayrı yeşil
 * gösterir.
 *
 * ── e-SMM'DE OLMAYAN TAŞINMAZ ──────────────────────────────────────────────
 * `ui-state-changed`, `type-changed`, `profile-changed`, görünürlük türetimi ve
 * profil↔tip uzlaşma matrisi BURADA YOKTUR. Gerekçe ölçülebilir: e-SMM'de profil
 * (`EARSIVBELGE`) ve tip (`SERBESTMESLEKMAKBUZU`) TEK DEĞERLİDİR — seçilecek bir
 * şey olmadığı için türetilecek görünürlük de yoktur.
 *
 * Buna karşılık `calculate()` BURADA VARDIR (irsaliyede yoktur): makbuzun tutarı
 * ve vergi zinciri vardır, form düzenlenirken canlı toplam göstermek gerekir.
 */

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
import type {
  DocumentSessionAdapter,
  DocumentFieldChangedPayload,
  DocumentLineFieldChangedPayload,
} from '../../session/document-session';
import { DocumentSession, emptySessionParty } from '../../session/document-session';
import type {
  SessionPathErrorCode,
  SessionPathErrorPayload,
  ValidationWarning,
} from '../../session';

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

/**
 * Alan değişimi yükü — ortak sözleşmenin adlandırılmış hâli.
 *
 * `type X = Y` yerine BOŞ ARAYÜZ MİRASI kullanılıyor: cephe bekçisi bir adın
 * `InterfaceDeclaration`dan `TypeAliasDeclaration`a dönmesini de FARK kabul
 * eder ve haklıdır — tüketici tarafında `interface X extends …` ile genişletme
 * hakkı sessizce kaybolurdu. Gövde yine TEK yerdedir.
 */
export interface SelfEmployedVoucherFieldChangedPayload extends DocumentFieldChangedPayload {}

/** Kalem alanı değişimi yükü — ortak sözleşmenin adlandırılmış hâli. */
export interface SelfEmployedVoucherLineFieldChangedPayload
  extends DocumentLineFieldChangedPayload {}

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
  'validation-error': import('../../errors/ubl-build-error').ValidationError[];
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

/**
 * e-SMM adaptörü — ortak oturum gövdesinin belge türünü TANIDIĞI tek nokta.
 *
 * Modül düzeyindedir ve SAF'tır: örnek başına yeniden kurulmaz, durum tutmaz.
 */
const SELF_EMPLOYED_VOUCHER_ADAPTER: DocumentSessionAdapter<
  SimpleSelfEmployedVoucherInput,
  CalculatedSelfEmployedVoucher,
  SelfEmployedVoucherInput
> = {
  emptyInput: () => ({
    supplier: emptySessionParty(),
    customer: emptySessionParty(),
    lines: [],
  }),
  calculate: calculateSelfEmployedVoucher,
  toRawInput: mapSimpleToSelfEmployedVoucherInput,
  validateSession: raw => validateSelfEmployedVoucher(raw, { stage: 'session' }),
  buildXml: (raw, validationLevel) =>
    new SelfEmployedVoucherBuilder({ prettyPrint: true, validationLevel }).build(raw),
  knownPathTemplates: SELF_EMPLOYED_VOUCHER_KNOWN_PATH_TEMPLATES,
  readOnlyPaths: SELF_EMPLOYED_VOUCHER_READ_ONLY_PATHS,
};

/** Üretilen yol overload'larını sınıfa enjekte eder (declaration merging). */
export interface SelfEmployedVoucherSession extends SelfEmployedVoucherSessionUpdateOverloads {}

export class SelfEmployedVoucherSession extends DocumentSession<
  SimpleSelfEmployedVoucherInput,
  SimpleSelfEmployedVoucherLineInput,
  CalculatedSelfEmployedVoucher,
  SelfEmployedVoucherInput,
  SelfEmployedVoucherUnsetScope
> {
  constructor(options?: SelfEmployedVoucherSessionOptions) {
    super(SELF_EMPLOYED_VOUCHER_ADAPTER, options?.initialInput);
  }

  /**
   * 🔴 BU ÜÇ SATIR KALAN TEK TEKRAR — ve TypeScript'in dayattığı bir tekrardır,
   * bir tasarım tercihi değil.
   *
   * `SelfEmployedVoucherSessionUpdateOverloads` bu sınıfa declaration-merging
   * ile enjekte edilir. TS, MİRAS ALINAN bir `update` ile arayüzün getirdiği
   * dar overload'ları birleştirmeyi reddeder (TS2320: "cannot simultaneously
   * extend"); üye SINIFIN KENDİSİNDE bildirilmiş olmalıdır. Gövde yine ortak:
   * tek işi `super`e devretmek.
   */
  update(path: string, value: unknown): void {
    super.update(path, value);
  }

  /** Toplam zincirini hesaplar (XML üretmez). */
  calculate(): CalculatedSelfEmployedVoucher {
    return this.calculateInternal();
  }

  /** Ham `SelfEmployedVoucherInput`a çevirir. */
  toVoucherInput(): SelfEmployedVoucherInput {
    return this.toRawInputInternal();
  }
}
