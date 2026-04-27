import type { SimpleInvoiceInput } from './simple-types';
import type { InvoiceUIState } from './invoice-rules';

/**
 * Sprint 8i / AR-10 Faz 2 — Suggestion (advisory öneri).
 *
 * Validator vs Suggestion dikhotomi (master plan §3.3, tasarım §4.5):
 * - Validator: blocking, severity error/warning, ValidationError emit
 * - Suggestion: advisory, severity recommended/optional, Suggestion emit
 *
 * Aynı path için ikisi paralel emit edilebilir; UI iki kanalı yan yana sunar.
 *
 * T-1: severity 2-seviyeli (recommended | optional). Granüler ayrım reddedildi.
 * T-3: ruleId namespace formatı '{domain}/{slug}' (örn. 'kdv/zero-suggest-351').
 * T-5: displayLabel/displayValue opsiyonel (UI rendering hint).
 */
export interface Suggestion {
  /** SessionPaths.X formatında path. Örn: 'lines[0].kdvExemptionCode'. */
  path: string;

  /** Önerilen değer. Path'in beklediği tipte. undefined = "kullanıcının girmesi gereken alan" işareti. */
  value: unknown;

  /** UI tooltip için Türkçe açıklama. Örn: '351 KDV istisna kodu uygundur.'. */
  reason: string;

  /** Severity: recommended (sistem hatırlatma) | optional (ipucu/heuristic). */
  severity: 'recommended' | 'optional';

  /** Namespace'li ruleId. Format: '{domain}/{slug}'. Örn: 'kdv/zero-suggest-351'. */
  ruleId: string;

  /** UI rendering için label opsiyonel. Örn: '351 — KDV İstisna'. */
  displayLabel?: string;

  /** UI rendering için human-readable value. Örn: '351'. */
  displayValue?: string;
}

/**
 * Suggestion kuralı — deklaratif tanım (T-6 domain bazlı dosya organizasyonu).
 *
 * applies(): kuralın bu input + ui state için aktif olup olmadığı (boolean pre-filter).
 * produce(): kuralın suggestion(lar) üretmesi (0..N suggestion array, applies()=true ise çağrılır).
 *
 * Bir kural birden fazla suggestion üretebilir (örn. tüm satırlarda kdv=0 ise her satır ayrı suggestion).
 * Boş array = kural pas (state'i şu an aktif değil).
 */
export interface SuggestionRule {
  /** Namespace'li ruleId. Örn: 'kdv/zero-suggest-351'. */
  id: string;

  /** Kural bu state için aktif mi? Hızlı pre-filter (pure, side-effect yok). */
  applies: (input: SimpleInvoiceInput, ui: InvoiceUIState) => boolean;

  /** Suggestion(lar) üret. applies()=true ise çağrılır. */
  produce: (input: SimpleInvoiceInput, ui: InvoiceUIState) => Suggestion[];
}
