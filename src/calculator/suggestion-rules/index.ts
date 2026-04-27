import type { SuggestionRule } from '../suggestion-types';
import { KDV_SUGGESTIONS } from './kdv-suggestions';
import { WITHHOLDING_SUGGESTIONS } from './withholding-suggestions';
import { IHRACKAYITLI_SUGGESTIONS } from './ihrackayitli-suggestions';
import { YATIRIM_TESVIK_SUGGESTIONS } from './yatirim-tesvik-suggestions';

/**
 * Sprint 8i / AR-10 Faz 2 — SUGGESTION_RULES manifest.
 *
 * Sıralama (T-6 domain bazlı, runSuggestionEngine sırası):
 *   KDV → Tevkifat → IHRACKAYITLI → YATIRIMTESVIK → Delivery → Misc
 *
 * Mevcut: KDV grubu (7 kural). Devamı:
 * - 8i.3: Tevkifat (5) — withholding-suggestions.ts
 * - 8i.4: IHRACKAYITLI (3) — ihrackayitli-suggestions.ts
 * - 8i.5: YATIRIMTESVIK (4) — yatirim-tesvik-suggestions.ts
 * - 8i.6: Delivery (3) + Misc (3) — delivery-suggestions.ts, misc-suggestions.ts
 *
 * Toplam Faz 2 kapsam: 24 kural (Plan'da 25; Kural 4 transition state için Sprint 8j'ye ertelendi).
 */
export const SUGGESTION_RULES: readonly SuggestionRule[] = [
  ...KDV_SUGGESTIONS,
  ...WITHHOLDING_SUGGESTIONS,
  ...IHRACKAYITLI_SUGGESTIONS,
  ...YATIRIM_TESVIK_SUGGESTIONS,
];
