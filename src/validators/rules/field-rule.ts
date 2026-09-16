/**
 * S3 — KURAL SÖZLEŞMESİ: yüklem ⟂ bağlama ⟂ sözlük.
 *
 * ## Nereden geldi
 *
 * GİB'in kendi şematronu kuralı ÜÇE bölüyor ve biz o ayrımı devralıyoruz
 * (ölçüldü, paket 20260701):
 *
 * ```
 * UBL-TR_Common_Schematron  → 132 soyut kural · 283 assert ·   0 context   = NE denetlenecek
 * UBL-TR_Main_Schematron    →   9 pattern     ·   0 assert · 122 context   = NEREDE denetlenecek
 *                              (209 `extends` — yani kural bir kez yazılır, N yere bağlanır)
 * ```
 *
 * Bizde bu ayrım YOKTU ve bedeli ölçülmüştü: `ISSUE_DATE_MIN` aralık kontrolü
 * GİB'in ORTAK kuralı (`Common_Schematron:169-170`) olmasına rağmen yalnız
 * `common-validators.ts` içinde, yani FATURA tipine bağlı bir fonksiyonun
 * gövdesinde yaşıyordu. Sonuç: **e-İrsaliye bu ortak kuralı hiç almıyordu.**
 * Kural doğru katmanda dursaydı bağlama tablosuna bir satır eklemek yeterliydi.
 *
 * ## Üç eksen
 *
 *   • **Yüklem** (`FieldRule`) — belge türünü BİLMEZ. Yalnız bir DEĞER alır ve
 *     ihlal varsa hata üretir. `common-field-rules.ts` içinde yaşar.
 *   • **Bağlama** (`FieldBinding`) — kuralın hangi belgede hangi alana
 *     bağlandığı. Kod değil **VERİ**dir: `header-bindings.ts` tabloları.
 *   • **Sözlük** — eksiklik mesajı ve `expected` metni. Belgeye göre DEĞİŞİR
 *     ("Fatura numarası zorunludur" ↔ "İrsaliye numarası zorunludur"), bu yüzden
 *     yüklemde değil bağlama satırında durur.
 *
 * ## Zincir anlamı
 *
 * Bir alanın yüklemleri SIRAYLA koşar ve **ilk ihlalde durur**. Bu, eski
 * `else if` merdiveninin birebir davranışıdır ve kasıtlıdır: biçimi bozuk bir
 * tarihe ayrıca "aralık dışı" demek kullanıcıyı yanıltır.
 */

import type { ValidationError } from '../../errors/ubl-build-error';
import { missingField } from '../validation-result';
import { isNonEmpty } from '../../utils/formatters';

/**
 * Yüklemin çalışma bağlamı — SÖZLÜK buradan gelir.
 *
 * Yüklem `path`i kendisi ÜRETMEZ, bağlamadan alır: aynı kural faturada `id`,
 * irsaliyede `id`, iade referansında `billingReferences[0].invoiceDocumentReference.id`
 * yoluna bağlanabilsin diye.
 */
export interface FieldRuleContext {
  /** Hatanın yazılacağı girdi yolu. */
  readonly path: string;
  /**
   * Biçim hatasında `expected` alanına yazılacak metin. Verilmezse yüklem kendi
   * varsayılanını kullanır. Belgeden belgeye değişen SÖZLÜK farkı buradan girer.
   */
  readonly expected?: string;
}

/**
 * Saf yüklem. Değerin DOLU olduğu garanti edilerek çağrılır — doluluk ayrı bir
 * eksendir (`FieldBinding.presence`) ve motorda ele alınır.
 */
export type FieldRule = (value: string, ctx: FieldRuleContext) => ValidationError[];

/** Alanın belgede zorunlu mu opsiyonel mi olduğu. */
export type FieldPresence = 'required' | 'optional';

/**
 * BAĞLAMA satırı — bir yüklem demetinin bir belgedeki bir alana bağlanması.
 *
 * `S` belgenin girdi tipidir (`InvoiceInput`, `DespatchInput`, …). Tablo bu
 * yüzden belge başına yazılır; yüklemler ortak kalır.
 */
export interface FieldBinding<S> {
  /** Hata yolu — girdideki alan yolu (`id`, `issueDate`, …). */
  readonly path: string;
  /** Değeri belgeden çeken saf seçici. */
  readonly select: (subject: S) => string | undefined;
  /** Alan zorunlu mu? `optional` iken boş değer hata DEĞİLDİR. */
  readonly presence: FieldPresence;
  /**
   * `presence: 'required'` iken boş değerde yazılacak mesaj (SÖZLÜK).
   * Verilmezse `missingField` varsayılan metnini kullanır.
   */
  readonly missingMessage?: string;
  /** Değer doluyken sırayla koşacak yüklemler; İLK ihlalde durulur. */
  readonly rules: readonly FieldRule[];
  /** Biçim hatası `expected` metnini ezen SÖZLÜK girdisi. */
  readonly expected?: string;
}

/** Tek bağlamayı koşar — doluluk + yüklem zinciri. */
export function runFieldBinding<S>(binding: FieldBinding<S>, subject: S): ValidationError[] {
  const value = binding.select(subject);

  if (!isNonEmpty(value)) {
    return binding.presence === 'required'
      ? [missingField(binding.path, binding.missingMessage)]
      : [];
  }

  const ctx: FieldRuleContext = { path: binding.path, expected: binding.expected };
  for (const rule of binding.rules) {
    const errors = rule(value, ctx);
    // İlk ihlalde dur — eski `else if` merdiveninin birebir davranışı.
    if (errors.length > 0) return errors;
  }
  return [];
}

/** Bağlama tablosunu TABLO SIRASIYLA koşar. */
export function runFieldBindings<S>(
  bindings: readonly FieldBinding<S>[],
  subject: S,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const binding of bindings) {
    errors.push(...runFieldBinding(binding, subject));
  }
  return errors;
}
