/**
 * OTURUM ÇEKİRDEĞİ — belge tipinden bağımsız ortak katman.
 *
 * `InvoiceSession`, `DespatchSession` ve gelecek belge oturumları bu katmanı
 * AYNI şekilde kullanır. Kural: buradaki her şey SAF'tır — emit etmez, durum
 * tutmaz, belge tipi bilmez. Tipe özel veri (üretilmiş yol kümeleri, görünürlük
 * haritası) parametre olarak GELİR, import edilmez.
 *
 * Dışarıdan bakan biri bir oturumu tanıdığında diğerlerini de tanımalıdır;
 * bu dosyanın varlık sebebi o tutarlılıktır.
 */
export type { SessionPathErrorCode, SessionPathErrorPayload } from './path-error';
export type { PathTokens, PathGateContext, PathGateResult } from './path-gates';
export { runPathGates, checkIndexBounds } from './path-gates';
export type { VisibilityTransition } from './visibility-diff';
export { diffVisibility } from './visibility-diff';
export type { ValidationWarning } from './validation-warning';
