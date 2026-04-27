import type { SuggestionRule } from '../suggestion-types';

/**
 * Sprint 8i / AR-10 Faz 2 — SUGGESTION_RULES manifest.
 *
 * Sprint 8i.1: skeleton, boş manifest. Kurallar sonraki commit'lerde eklenir:
 * - 8i.2: KDV grubu (7 kural) — kdv-suggestions.ts
 * - 8i.3: Tevkifat grubu (5 kural) — withholding-suggestions.ts
 * - 8i.4: IHRACKAYITLI grubu (3 kural) — ihrackayitli-suggestions.ts
 * - 8i.5: YATIRIMTESVIK grubu (4 kural) — yatirim-tesvik-suggestions.ts
 * - 8i.6: Delivery (3) + Misc (3) — delivery-suggestions.ts, misc-suggestions.ts
 *
 * Toplam Faz 2 kapsam: 24 kural (Plan'da 25; Kural 4 transition state için Sprint 8j'ye ertelendi).
 *
 * Sıralama (T-6 domain bazlı, runSuggestionEngine sırası):
 *   KDV → Tevkifat → IHRACKAYITLI → YATIRIMTESVIK → Delivery → Misc
 */
export const SUGGESTION_RULES: readonly SuggestionRule[] = [];
