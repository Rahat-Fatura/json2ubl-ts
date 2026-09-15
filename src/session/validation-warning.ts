/**
 * Oturum uyarı sözleşmesi — BELGE TİPİNDEN BAĞIMSIZ.
 *
 * Her oturum (`InvoiceSession`, `DespatchSession`, gelecek tipler) `warnings`
 * olayını AYNI şekille yayar ve doğrulayıcı boru hattının `ValidationError`
 * çıktısını AYNI köprüyle (`severity: 'error'`) bu şekle çevirir. Şekil tip
 * başına kopyalanırsa iki yapısal ikiz doğar ve tüketici (portal) hangisini
 * beklediğini tipten okuyamaz.
 *
 * Fatura tarafı geriye uyum için bu tipi `invoice-rules.ts` üzerinden de dışa
 * verir; TEK TANIM burasıdır.
 */

/** Tek bir kullanıcı-yüzlü doğrulama uyarısı. */
export interface ValidationWarning {
  /** Uyarının bağlı olduğu alan yolu (`ValidationError.path` ile aynı dil). */
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  /** Doğrulayıcı boru hattından köprülenen `ValidationError.code`. */
  code?: string;
}
