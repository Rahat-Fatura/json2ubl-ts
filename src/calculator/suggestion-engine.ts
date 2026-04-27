import type { SimpleInvoiceInput } from './simple-types';
import type { InvoiceUIState } from './invoice-rules';
import type { Suggestion } from './suggestion-types';
import { SUGGESTION_RULES } from './suggestion-rules';

/**
 * Sprint 8i / AR-10 Faz 2 — SuggestionEngine giriş noktası (pure function).
 *
 * Tasarım kararı T-2: Engine pure, diff session-stateful.
 * - runSuggestionEngine: full liste döner (state yok, side-effect yok)
 * - InvoiceSession._lastSuggestions: önceki tick (diff için)
 * - diffSuggestions: added/changed/removed primary key bazlı
 *
 * Tasarım kararı T-7: Engine her çağrıda full eval (incremental yok).
 * Performance bütçesi: ≤5ms (24 kural × 100 satır ≈ 2400 evaluation).
 * 8i.8 benchmark threshold enforce.
 *
 * Sıralama: KDV → Tevkifat → IHRACKAYITLI → YATIRIMTESVIK → Delivery → Misc
 * (SUGGESTION_RULES manifest'inde domain bazlı sıralı, T-6).
 */
export function runSuggestionEngine(
  input: SimpleInvoiceInput,
  ui: InvoiceUIState,
): Suggestion[] {
  const all: Suggestion[] = [];
  for (const rule of SUGGESTION_RULES) {
    if (!rule.applies(input, ui)) continue;
    all.push(...rule.produce(input, ui));
  }
  return all;
}

/**
 * Diff primary key — '{ruleId}::{path}' (T-2).
 *
 * Aynı kural aynı path için tek suggestion var sayılır. Aynı kural çoklu
 * satır için suggestion üretebilir (her satır ayrı path → ayrı key).
 */
function suggestionKey(s: Suggestion): string {
  return `${s.ruleId}::${s.path}`;
}

/**
 * Suggestion eşitliği — primary key zaten eşit varsayılır; value/reason/severity
 * farkı diff'e dahil. Object reference karşılaştırma YAPILMAZ (R3 mitigation).
 */
function suggestionsEqual(a: Suggestion, b: Suggestion): boolean {
  return a.value === b.value && a.reason === b.reason && a.severity === b.severity;
}

export interface SuggestionDiff {
  /** Yeni suggestion'lar — önceki listede yoktu. */
  added: Suggestion[];
  /** Değişmiş suggestion'lar — primary key var, value/reason/severity farklı. */
  changed: Suggestion[];
  /** Kaldırılan suggestion'lar — önceki listede vardı, şimdi yok. T-4: emit edilmez. */
  removed: Suggestion[];
}

/**
 * Suggestion diff hesabı — primary key (`ruleId+path`) bazlı (T-2).
 *
 * Karar T-4: removed array hesaplanır ama emit edilmez. UI sonraki suggestion
 * event'inde yokluğu fark eder. Gelecekte suggestionResolved opsiyonel
 * eklenirse helper hazır (geri uyumlu).
 */
export function diffSuggestions(prev: Suggestion[], next: Suggestion[]): SuggestionDiff {
  const prevByKey = new Map<string, Suggestion>();
  for (const s of prev) prevByKey.set(suggestionKey(s), s);

  const nextByKey = new Map<string, Suggestion>();
  for (const s of next) nextByKey.set(suggestionKey(s), s);

  const added: Suggestion[] = [];
  const changed: Suggestion[] = [];
  const removed: Suggestion[] = [];

  for (const [key, s] of nextByKey) {
    const old = prevByKey.get(key);
    if (!old) {
      added.push(s);
    } else if (!suggestionsEqual(old, s)) {
      changed.push(s);
    }
  }

  for (const [key, s] of prevByKey) {
    if (!nextByKey.has(key)) {
      removed.push(s);
    }
  }

  return { added, changed, removed };
}
