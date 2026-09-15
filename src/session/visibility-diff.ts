/**
 * Alan görünürlüğü farkı — BELGE TİPİNDEN BAĞIMSIZ.
 *
 * Her oturum türetilmiş görünürlük haritasını (`Record<string, boolean>`) yeniden
 * hesaplar ve DEĞİŞENLERİ olay olarak yayar. Haritanın İÇERİĞİ tipe özeldir
 * (faturada tevkifat/istisna bayrakları, irsaliyede taşıyıcı/dorse), ama
 * "önceki ile yenisini karşılaştır, geçişleri bildir" mekanizması ortaktır.
 *
 * ── 🔴 SAF: EMIT ETMEZ ──────────────────────────────────────────────────────
 * Geçiş listesi döner; olayı çağıran yayar. Gerekçe `path-gates.ts` ile aynı:
 * olay sırası bir sözleşmedir ve buraya gömülürse sessizce kayar.
 */

/** Tek bir görünürlük geçişi. */
export interface VisibilityTransition {
  /** Değişen alanın anahtarı (çağıran bunu `fields.<key>` gibi önekler). */
  key: string;
  /** `true` = görünür oldu, `false` = gizlendi. */
  activated: boolean;
}

/**
 * İki görünürlük haritasını karşılaştırır.
 *
 * 🔴 YALNIZ `next`in anahtarları taranır — canlı davranış budur. `prev`de olup
 * `next`te olmayan anahtar geçiş SAYILMAZ: harita her turda aynı şekilde türediği
 * için böyle bir anahtar pratikte doğmaz, ama tarama tabanını `next` tutmak
 * "türetilmiş olan otoritedir" kuralını kodda görünür kılar.
 */
export function diffVisibility<T extends object>(
  previous: Readonly<T>,
  next: Readonly<T>,
): VisibilityTransition[] {
  const transitions: VisibilityTransition[] = [];
  const prev = previous as Record<string, unknown>;
  const curr = next as Record<string, unknown>;
  for (const key of Object.keys(curr)) {
    const wasVisible = Boolean(prev[key]);
    const isVisible = Boolean(curr[key]);
    if (!wasVisible && isVisible) transitions.push({ key, activated: true });
    else if (wasVisible && !isVisible) transitions.push({ key, activated: false });
  }
  return transitions;
}
