/**
 * UBL-TR kök ad alanları — TEK kaynaktan türetilir.
 *
 * Belge kökleri arasındaki tek gerçek fark hedef ad alanı (`default`) ve
 * `xsi:schemaLocation`tır; ikisi de kökün ADINDAN mekanik olarak türer:
 *   default        = urn:…:xsd:<Kök>-2
 *   schemaLocation = <default> UBL-<Kök>-2.1.xsd
 * Geri kalan altı bildirim (cac/cbc/ext/ds/xades/xsi) her kökte AYNIDIR.
 *
 * 🔑 Anahtar SIRASI tele yansır: `rootOpenTag` bildirimleri `Object.entries`
 * sırasında yazar. Sıra `default → cac → cbc → ext → ds → xades → xsi →
 * schemaLocation` olarak sabittir; buradaki ekleme sırası değişirse üretilen
 * XML'in kök etiketi de bayt düzeyinde değişir.
 */

/** Kütüphanenin ürettiği UBL kök elemanları. */
export type UblRootName = 'Invoice' | 'DespatchAdvice' | 'CreditNote';

/** Kökten BAĞIMSIZ ad alanı bildirimleri (her belge türünde birebir aynı). */
const SHARED_NAMESPACES = {
  cac: 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  cbc: 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  ext: 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  ds: 'http://www.w3.org/2000/09/xmldsig#',
  xades: 'http://uri.etsi.org/01903/v1.3.2#',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
} as const;

/**
 * Verilen UBL kökü için tam ad alanı haritası.
 *
 * Jenerik `R` sayesinde dönen tip literal kalır — `INVOICE_NAMESPACES.default`
 * hâlâ `'urn:…:Invoice-2'` literal tipidir, geniş `string` değil.
 */
export function namespacesFor<R extends UblRootName>(root: R) {
  const targetNamespace = `urn:oasis:names:specification:ubl:schema:xsd:${root}-2` as const;
  return {
    default: targetNamespace,
    ...SHARED_NAMESPACES,
    schemaLocation: `${targetNamespace} UBL-${root}-2.1.xsd`,
  } as const;
}

/** UBL-TR Invoice namespace'leri */
export const INVOICE_NAMESPACES = namespacesFor('Invoice');

/** UBL-TR DespatchAdvice namespace'leri */
export const DESPATCH_NAMESPACES = namespacesFor('DespatchAdvice');

/**
 * UBL-TR CreditNote namespace'leri — e-MM (Müstahsil Makbuzu) kökü.
 *
 * Kök adı dışında fatura/irsaliye ile TEK fark yoktur; bildirimler `namespacesFor`
 * tarafından kök adından mekanik olarak türer. 27/27 prod e-MM belgesinin kök
 * etiketi bu haritayla birebir örtüşür (ölçüldü) — `ccts`, `qdt`, `ubltr`, `udt`
 * bildirimleri prod'da FAZLADAN duruyor ama hiçbir eleman onları kullanmıyor,
 * bu yüzden kopyalanmadı (fatura tarafında da kopyalanmamıştı).
 */
export const CREDIT_NOTE_NAMESPACES = namespacesFor('CreditNote');

/** Sabit UBL-TR değerleri */
export const UBL_CONSTANTS = {
  ublVersionId: '2.1',
  customizationId: 'TR1.2',
  copyIndicator: 'false',
} as const;
