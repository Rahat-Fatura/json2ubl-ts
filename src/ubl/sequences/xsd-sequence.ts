/**
 * UBL sekans tabloları + `emitInOrder` — serializer'ların tek sıra otoritesi.
 *
 * ── TABLOLAR NEREDEN GELİYOR ──────────────────────────────────────────────
 * Tablolar artık ELLE yazılmaz: `scripts/generate-sequences.ts` onları GİB
 * UBL-TR XSD'sinden (`schemas/ubl-tr/`) üretir ve `xsd-sequence.generated.ts`
 * dosyasına yazar. `npm run verify:sequences` üretilen dosyanın kaynaktan
 * sapmadığını denetler (koşum: `npm test` + `prebuild`).
 *
 * Bu dosya yalnız iki şey yapar:
 *   1. Üretilen tabloları tek kapıdan yeniden dışa açar (çağıranlar
 *      `./xsd-sequence` yazmaya devam eder, üretilen dosyayı bilmez).
 *   2. `emitInOrder` yardımcısını barındırır.
 *
 * ── TABLOLAR TAŞIYICIDIR ──────────────────────────────────────────────────
 * Emit sırasını tablo belirler, serializer'daki yazım sırası DEĞİL. Bir alanı
 * öne/arkaya almak için tabloya değil XSD'ye bakılır; tablo XSD'nin kopyasıdır.
 * Tablo yalnız POZİSYON söyler — zorunlu/opsiyonel ayrımı emitter tarafındadır
 * (`cbcRequiredTag` / `cbcOptionalTag`).
 *
 * `__tests__/serializers/sequence-order-guard.test.ts` bu sözleşmenin bekçisidir:
 * üretilen XML'deki çocuk eleman sırasının ilgili tablonun ALT-DİZİSİ olduğunu
 * doğrular. `emitInOrder` yerine elle `parts.push()` yazılırsa test kırmızı olur.
 *
 * Kullanım:
 * ```ts
 * const parts = emitInOrder(TAX_CATEGORY_SEQ, {
 *   Name: () => cbcOptionalTag('Name', cat.taxTypeName),
 *   TaxExemptionReasonCode: () => cbcOptionalTag('TaxExemptionReasonCode', cat.code),
 *   TaxExemptionReason: () => cbcOptionalTag('TaxExemptionReason', cat.reason),
 *   TaxScheme: () => cacTag('TaxScheme', serializeTaxScheme(cat)),
 * });
 * return cacTag('TaxCategory', joinLines(parts));
 * ```
 */

export {
  // Kökler
  INVOICE_SEQ,
  DESPATCH_SEQ,
  CREDIT_NOTE_SEQ,
  // Satırlar
  INVOICE_LINE_SEQ,
  DESPATCH_LINE_SEQ,
  CREDIT_NOTE_LINE_SEQ,
  // Vergi
  TAX_TOTAL_SEQ,
  TAX_SUBTOTAL_SEQ,
  TAX_CATEGORY_SEQ,
  TAX_SCHEME_SEQ,
  // Tutar / iskonto
  ALLOWANCE_CHARGE_SEQ,
  LEGAL_MONETARY_TOTAL_SEQ,
  EXCHANGE_RATE_SEQ,
  PAYMENT_MEANS_SEQ,
  // Kalem
  ITEM_SEQ,
  PRICE_SEQ,
  ITEM_IDENTIFICATION_SEQ,
  COMMODITY_CLASSIFICATION_SEQ,
  ITEM_INSTANCE_SEQ,
  ORDER_LINE_REFERENCE_SEQ,
  FINANCIAL_ACCOUNT_SEQ,
  // Taraf
  PARTY_SEQ,
  SUPPLIER_PARTY_SEQ,
  CUSTOMER_PARTY_SEQ,
  PARTY_NAME_SEQ,
  PARTY_IDENTIFICATION_SEQ,
  SIGNATURE_SEQ,
  PERSON_SEQ,
  CONTACT_SEQ,
  PARTY_TAX_SCHEME_SEQ,
  PARTY_LEGAL_ENTITY_SEQ,
  ADDRESS_SEQ,
  COUNTRY_SEQ,
  // Teslimat / sevkiyat
  DELIVERY_SEQ,
  DELIVERY_DESPATCH_SEQ,
  DELIVERY_TERMS_SEQ,
  SHIPMENT_SEQ,
  GOODS_ITEM_SEQ,
  SHIPMENT_STAGE_SEQ,
  TRANSPORT_MEANS_SEQ,
  ROAD_TRANSPORT_SEQ,
  TRANSPORT_EQUIPMENT_SEQ,
  TRANSPORT_HANDLING_UNIT_SEQ,
  PACKAGE_SEQ,
  CUSTOMS_DECLARATION_SEQ,
  // Referanslar / dönem
  DOCUMENT_REFERENCE_SEQ,
  ORDER_REFERENCE_SEQ,
  BILLING_REFERENCE_SEQ,
  PERIOD_SEQ,
  // Bekçi testinin eşleme haritaları
  ELEMENT_COMPLEX_TYPE,
  SEQUENCE_BY_COMPLEX_TYPE,
} from './xsd-sequence.generated';

// ─── Generic helper ───────────────────────────────────────────────────────

/**
 * Field emitter map'ini verilen XSD sırasında yürütür.
 *
 * - `seq` içinde olan her field için `emitters[field]` varsa çağırılır.
 * - Emitter yoksa veya `''` dönerse atlanır (filter).
 * - Emitter `throw` ederse hata yukarı propagate olur (M6 required enforce).
 *
 * `emitters` anahtarları `seq` elemanlarıyla sınırlıdır: tabloda OLMAYAN bir
 * alana emitter yazılırsa TypeScript derleme anında reddeder. Tablolar XSD'den
 * üretildiği için bu aynı zamanda "UBL-TR'de bulunmayan elemanı emit etme"
 * kapısıdır.
 *
 * @returns Sıralı, boş-olmayan XML string array'i. Çağıran tarafta `joinLines` ile birleştir.
 */
export function emitInOrder<K extends string>(
  seq: readonly K[],
  emitters: Partial<Record<K, () => string>>,
): string[] {
  const out: string[] = [];
  for (const field of seq) {
    const fn = emitters[field];
    if (!fn) continue;
    const s = fn();
    if (s !== '' && s !== undefined && s !== null) {
      out.push(s);
    }
  }
  return out;
}
