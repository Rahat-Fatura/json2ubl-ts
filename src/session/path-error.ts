/**
 * Oturum yol-hatası sözleşmesi — BELGE TİPİNDEN BAĞIMSIZ çekirdek.
 *
 * Her oturum (`InvoiceSession`, `DespatchSession`, gelecek tipler) `update()`
 * çağrısını aynı 4 katmandan geçirir; bu dosya o katmanların ORTAK hata dilidir.
 * Belge tipine özel kısıtlar (fatura: ihracat kilidi, mükellefiyet uyuşmazlığı)
 * kendi kod kümelerini bu birliğe EKLER — çekirdeğe sızmaz.
 *
 * Desen (fatura örnek alınmıştır, yeni tipler AYNISINI yapar):
 *   export type PathErrorCode = SessionPathErrorCode | 'PROFILE_EXPORT_MISMATCH' | …
 */

/** 4 ortak katmanın hata kodları. Belge tipine özel kod BURAYA EKLENMEZ. */
export type SessionPathErrorCode =
  | 'INVALID_PATH' /** Katman 1: parser sözdizimi hatası */
  | 'READ_ONLY_PATH' /** Katman 2: yapıcıda kilitlenmiş yol */
  | 'UNKNOWN_PATH' /** Katman 3: üretilmiş yol haritasında yok */
  | 'INDEX_OUT_OF_BOUNDS'; /** Katman 4: dizi sınırı aşıldı */

/**
 * Yol hatası yükü.
 *
 * 🔴 `requestedValue` OPSİYONEL ve bu bilinçlidir: 1-3. katmanlar çağıranın
 * gönderdiği değeri taşır, 4. katman (dizi sınırı) TAŞIMAZ — hata değerde değil
 * yolun kendisindedir. Bu asimetri fatura davranışında canlıdır ve korunmalıdır.
 */
export interface SessionPathErrorPayload<TCode extends string = SessionPathErrorCode> {
  code: TCode;
  path: string;
  reason: string;
  /** İhlal eden değer — yalnız değere bağlı katmanlarda dolar. */
  requestedValue?: unknown;
}
