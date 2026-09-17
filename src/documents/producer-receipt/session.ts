/**
 * `ProducerReceiptSession` — EventEmitter tabanlı reaktif e-MM oturumu.
 *
 * ```ts
 * const session = new ProducerReceiptSession();
 * session.on('warnings', w => showWarnings(w));
 * session.update(ProducerReceiptSessionPaths.issuerTaxNumber, '1234567890');
 * session.update(ProducerReceiptSessionPaths.producerTaxNumber, '11111111110');
 * session.addLine({ name: 'Domates', quantity: 1000, price: 10, incomeTaxWithholdingPercent: 2 });
 * const xml = session.buildXml();
 * ```
 *
 * ── 🔑 GÖVDE ORTAK ─────────────────────────────────────────────────────────
 * Yol kapıları, olay sırası, satır CRUD'u, `unset`, taraf kimlikleri ve
 * doğrulama boru hattının TAMAMI `session/document-session.ts`tedir — e-SMM
 * oturumuyla AYNI gövde, tek kopya. Bu dosya adaptörü verir, `update()`
 * overload'larını enjekte eder ve e-MM'e özgü dönüş tipleriyle iki metot açar.
 *
 * ── TARAF ADLARI ───────────────────────────────────────────────────────────
 * `setIdentifications('issuer', …)` / `'producer'` — ortak gövdenin
 * `'supplier'`/`'customer'` seçicisi e-MM'de YANILTICI olurdu. Oturum
 * yüzeyindeki ad ROLÜ söyler; UBL yuvasına çeviri `mapper.ts`te tek satırdır.
 */

import type {
  SimpleProducerReceiptInput,
  SimpleProducerReceiptLineInput,
} from './simple-input';
import type { ProducerReceiptInput } from './input';
import type { CalculatedProducerReceipt } from './mapper';
import { calculateProducerReceipt, mapSimpleToProducerReceiptInput } from './mapper';
import { validateProducerReceipt } from './rules';
import { ProducerReceiptBuilder } from './builder';
import type { ProducerReceiptSessionUpdateOverloads } from './session-paths.generated';
import {
  PRODUCER_RECEIPT_KNOWN_PATH_TEMPLATES,
  PRODUCER_RECEIPT_READ_ONLY_PATHS,
} from './session-paths.generated';
import type {
  DocumentSessionAdapter,
  DocumentFieldChangedPayload,
  DocumentLineFieldChangedPayload,
} from '../../session/document-session';
import { DocumentSession, emptySessionParty } from '../../session/document-session';
import type { ValidationError } from '../../errors/ubl-build-error';
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
 * e-MM'de eklenecek kısıt olmadığı için union çekirdekle aynıdır — profil ve tip
 * TEK DEĞERLİ olduğu için kilitlenecek bir eksen yok.
 */
export type ProducerReceiptPathErrorCode = SessionPathErrorCode;

/** Yol hatası yükü — çekirdek sözleşmenin aynısı. */
export type ProducerReceiptPathErrorPayload =
  SessionPathErrorPayload<ProducerReceiptPathErrorCode>;

/** Alan değişimi yükü — ortak sözleşmenin adlandırılmış hâli. */
export interface ProducerReceiptFieldChangedPayload extends DocumentFieldChangedPayload {}

/** Kalem alanı değişimi yükü — ortak sözleşmenin adlandırılmış hâli. */
export interface ProducerReceiptLineFieldChangedPayload extends DocumentLineFieldChangedPayload {}

export interface ProducerReceiptSessionEvents {
  /** Satır eklendi. */
  'line-added': { index: number; line: SimpleProducerReceiptLineInput };
  /** Satır güncellendi. */
  'line-updated': { index: number; line: SimpleProducerReceiptLineInput };
  /** Satır silindi. */
  'line-removed': { index: number };
  /** Doğrulama uyarıları değişti. */
  'warnings': ValidationWarning[];
  /** Herhangi bir veri değişikliği (debounce için). */
  'changed': SimpleProducerReceiptInput;
  /** Toplam zinciri yeniden hesaplandı. */
  'calculated': CalculatedProducerReceipt;
  /** Beklenmeyen çalışma-zamanı istisnası (yol reddi için `path-error` kullanılır). */
  'error': Error;
  /** Yol tabanlı güncelleme reddedildi — 4 katmanlı kapı sonrası. */
  'path-error': ProducerReceiptPathErrorPayload;
  /** Doğrulayıcı boru hattının ham çıktısı. */
  'validation-error': ValidationError[];
  /** Her başarılı `update()` sonrası ilk yayılan olay. */
  'field-changed': ProducerReceiptFieldChangedPayload;
  /** `lines[i].X` yollarında ek olarak yayılır. */
  'line-field-changed': ProducerReceiptLineFieldChangedPayload;
}

export type ProducerReceiptSessionEventName = keyof ProducerReceiptSessionEvents;

/**
 * `unset(scope)` ile temizlenebilir OPSİYONEL alanlar.
 *
 * Zorunlu alanlar (`issuer`, `producer`, `lines`) kapsam DIŞIDIR.
 */
export type ProducerReceiptUnsetScope =
  | 'notes'
  | 'documentNumber'
  | 'deliveryDate'
  | 'exchangeRate'
  | 'sendMethod'
  | 'incomeTaxWithholdingPercent'
  | 'exchangeRegistrationFeePercent'
  | 'socialSecurityPremiumPercent';

/**
 * `removeIdentification` / `setIdentifications` taraf seçicisi.
 *
 * 🔴 `'supplier'`/`'customer'` DEĞİL: e-MM'de o adlar rolü TERS gösterir.
 * Belgeyi düzenleyen `issuer`, malı satan müstahsil `producer`dır.
 */
export type ProducerReceiptIdentificationParty = 'issuer' | 'producer';

export interface ProducerReceiptSessionOptions {
  initialInput?: Partial<SimpleProducerReceiptInput>;
}

/**
 * e-MM adaptörü — ortak oturum gövdesinin belge türünü TANIDIĞI tek nokta.
 * Modül düzeyindedir ve SAF'tır: örnek başına yeniden kurulmaz, durum tutmaz.
 */
const PRODUCER_RECEIPT_ADAPTER: DocumentSessionAdapter<
  SimpleProducerReceiptInput,
  CalculatedProducerReceipt,
  ProducerReceiptInput,
  ProducerReceiptIdentificationParty
> = {
  emptyInput: () => ({
    issuer: emptySessionParty(),
    producer: emptySessionParty(),
    lines: [],
  }),
  /* 🔴 `['supplier', 'customer']` DEĞİL. e-MM girdisi rolün GERÇEK adını taşır;
   * UBL yuvasına çeviri yalnız `mapper.ts`te, tek satırda yapılır. */
  partyFields: ['issuer', 'producer'],
  calculate: calculateProducerReceipt,
  toRawInput: mapSimpleToProducerReceiptInput,
  validateSession: raw => validateProducerReceipt(raw, { stage: 'session' }),
  buildXml: (raw, validationLevel) =>
    new ProducerReceiptBuilder({ prettyPrint: true, validationLevel }).build(raw),
  knownPathTemplates: PRODUCER_RECEIPT_KNOWN_PATH_TEMPLATES,
  readOnlyPaths: PRODUCER_RECEIPT_READ_ONLY_PATHS,
};

/** Üretilen yol overload'larını sınıfa enjekte eder (declaration merging). */
export interface ProducerReceiptSession extends ProducerReceiptSessionUpdateOverloads {}

export class ProducerReceiptSession extends DocumentSession<
  SimpleProducerReceiptInput,
  SimpleProducerReceiptLineInput,
  CalculatedProducerReceipt,
  ProducerReceiptInput,
  ProducerReceiptUnsetScope,
  ProducerReceiptIdentificationParty
> {
  constructor(options?: ProducerReceiptSessionOptions) {
    super(PRODUCER_RECEIPT_ADAPTER, options?.initialInput);
  }

  /**
   * 🔴 TypeScript'in dayattığı tekrar (e-SMM ile aynı): declaration-merging
   * MİRAS ALINAN `update` ile dar overload'ları birleştirmeyi reddeder (TS2320);
   * üye SINIFIN KENDİSİNDE bildirilmiş olmalıdır. Gövde yine ortak.
   */
  update(path: string, value: unknown): void {
    super.update(path, value);
  }

  /** Toplam zincirini hesaplar (XML üretmez). */
  calculate(): CalculatedProducerReceipt {
    return this.calculateInternal();
  }

  /** Ham `ProducerReceiptInput`a çevirir. */
  toReceiptInput(): ProducerReceiptInput {
    return this.toRawInputInternal();
  }

}
