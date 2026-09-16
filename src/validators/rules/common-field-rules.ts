/**
 * S3 — YÜKLEM katmanı: **NE denetlenecek**.
 *
 * GİB'in `UBL-TR_Common_Schematron`'unun karşılığı: 0 context, yalnız assert.
 * Buradaki hiçbir fonksiyon `InvoiceInput`/`DespatchInput` GÖRMEZ, belge türü
 * BİLMEZ, alan adı BİLMEZ. Yalnız bir dizgi alır ve ihlal varsa hata üretir.
 *
 * 🔴 KURAL: bu dosyaya belge-türü sızarsa (`if (profileId === …)`, `input.lines`,
 * …) ayrım bozulmuştur. Belgeye özgü koşul BAĞLAMA tablosuna (`header-bindings.ts`)
 * veya belgenin kendi doğrulayıcısına gider.
 */

import { DOCUMENT_ID_REGEX, UUID_REGEX, DATE_REGEX, TIME_REGEX } from '../../config/constants';
import { invalidFormat, invalidValue } from '../validation-result';
import type { FieldRule } from './field-rule';

/**
 * B-65 — `IssueDate` aralığının ALT sınırı: e-Fatura uygulamasının başlangıcı.
 * Kaynak: `UBL-TR_Common_Schematron:169-170` (`TimeCheck`).
 */
export const ISSUE_DATE_MIN = '2005-01-01';

/**
 * 🔴 "BUGÜN" TÜRKİYE SAATİYLE HESAPLANIR — UTC ile DEĞİL.
 *
 * Schematron `TimeCheck` (`Common_Schematron:169`) düzenlenme tarihinin
 * GELECEKTE olamayacağını söyler. "Gelecek" GİB'in takvimine göredir ve GİB
 * Türkiye saatiyle çalışır.
 *
 * ⛔️ ESKİ HÂL BİR HATAYDI: `new Date().toISOString().slice(0, 10)` UTC gününü
 * verir. Türkiye UTC+3 olduğu için her gece 00:00–03:00 (TR) arasında UTC hâlâ
 * BİR ÖNCEKİ gündedir; o üç saatte düzenlenen ve tarihi DOĞRU olan her Türk
 * belgesi "gelecek tarihli" diye REDDEDİLİYORDU. Yani kütüphane her gün üç saat
 * boyunca belge üretemiyordu.
 *
 * Türkiye 2016'dan beri yaz saati uygulamıyor: sabit UTC+3. Sabit ofset
 * aritmetiği bu yüzden güvenlidir ve `Intl`e (ICU verisi olmayan derlemelerde
 * sessizce UTC'ye düşer) bağımlı değildir.
 */
const TURKEY_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Türkiye takvimine göre bugün (`YYYY-MM-DD`). */
export function turkeyToday(): string {
  return new Date(Date.now() + TURKEY_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * GİB belge numarası biçimi — 3 hane seri + `20XX` + 9 hane sıra.
 * Fatura, irsaliye ve iade referansı AYNI kuralı paylaşır (bkz. `DOCUMENT_ID_REGEX`).
 */
export const documentIdRule: FieldRule = (value, ctx) =>
  DOCUMENT_ID_REGEX.test(value)
    ? []
    : [invalidFormat(ctx.path, ctx.expected ?? DOCUMENT_ID_REGEX.source, value)];

/** ETTN biçimi — `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. */
export const uuidRule: FieldRule = (value, ctx) =>
  UUID_REGEX.test(value)
    ? []
    : [invalidFormat(ctx.path, ctx.expected ?? 'UUID formatı (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)', value)];

/** `xs:date` biçimi — XML'e yazılan hâl. */
export const dateFormatRule: FieldRule = (value, ctx) =>
  DATE_REGEX.test(value) ? [] : [invalidFormat(ctx.path, ctx.expected ?? 'YYYY-MM-DD', value)];

/** `xs:time` biçimi — XML'e yazılan hâl (saniye ZORUNLU). */
export const timeFormatRule: FieldRule = (value, ctx) =>
  TIME_REGEX.test(value) ? [] : [invalidFormat(ctx.path, ctx.expected ?? 'HH:mm:ss', value)];

/**
 * Kapalı liste yüklemi — "değer şu kümede olmalı".
 *
 * Yüklem ORTAK, KÜME belgeye özgüdür (fatura `InvoiceProfileId`, irsaliye
 * `DespatchProfileId`): bu yüzden küme bir ÜRETEÇ parametresi olarak bağlama
 * satırından gelir, yüklemin içine gömülmez.
 * Kaynak: `Common_Schematron:147` (`ProfileIDCheck`) ve türevleri.
 */
export function enumValueRule(allowed: readonly string[]): FieldRule {
  const expectedDefault = allowed.join('|');
  return (value, ctx) =>
    allowed.includes(value) ? [] : [invalidFormat(ctx.path, ctx.expected ?? expectedDefault, value)];
}

/**
 * B-65 — düzenleme tarihi aralığı: `2005-01-01 ≤ tarih ≤ bugün(TR)`.
 *
 * 🔴 BU GİB'İN **ORTAK** KURALIDIR (`Common_Schematron:169-170`), fatura kuralı
 * DEĞİL. S3 öncesinde `common-validators.ts` gövdesinde gömülü olduğu için
 * yalnız faturaya uygulanıyordu; irsaliye geriye/ileriye dönük her tarihi
 * sessizce geçiriyordu. Artık bağlama tablosuna yazılarak N belgeye bağlanır.
 *
 * ⚠️ Biçim denetimi ÖNKOŞULDUR: zincirde `dateFormatRule`den SONRA gelmelidir,
 * aksi halde `15-01-2024` gibi bir dizgi üzerinde dizgi karşılaştırması anlamsız
 * bir "aralık dışı" hatası üretir.
 */
export const issueDateRangeRule: FieldRule = (value, ctx) => {
  const today = turkeyToday();
  if (value < ISSUE_DATE_MIN || value > today) {
    return [invalidValue(ctx.path, `${ISSUE_DATE_MIN} ≤ tarih ≤ ${today}`, value)];
  }
  return [];
};
