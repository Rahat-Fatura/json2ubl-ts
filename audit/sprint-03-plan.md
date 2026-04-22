# Sprint 3 — XSD Sequence + Parent-Child Conditional Required (M6)

## Context

Sprint 3, v3 planına göre 18 bulguyu (`B-09..B-14, B-18, B-20, B-32..B-35, B-70, B-94, B-96, B-97, B-99`) kapatır. Üç ana eksende ilerler:

1. **XSD sequence ihlalleri** (B-09..B-14, B-18, B-20, B-96) — 8 KRİTİK bulgu; serializer'larda element yazım sırası XSD'ye uyumsuz.
2. **M6 Parent-Child Conditional Required** (B-32..B-35, B-70) — parent opsiyonel, parent verilirse child zorunlu (TS tip + runtime validator + required cbc utility).
3. **AR-1 cbcTag agresif split** (B-97) — `cbcTag` → `cbcRequiredTag` (empty → throw) + `cbcOptionalTag` (empty → silent); eski `cbcTag` kaldırılır.

Temizlik: B-94 (examples/output regenerate), B-96 (yorum numaralandırması), B-99 (ShipmentStage tekleştirme).

Bu sprint sonunda: serializer çıktısı XSD-valid, zorunlu alanlar TS+runtime+serializer üç katmanlı enforce edilir, eski "silent empty" davranışı tamamen kalkar.

## Mevcut Durum

### `src/utils/xml-helpers.ts`
`cbcTag(localName, value)` — null/undefined/boş string → **silent empty string döner** (`xml-helpers.ts:34-39`). Aynı davranış `cbcAmountTag`, `cbcQuantityTag`, `cacTag`'de. Zorunlu alan kontrolü yok. **B-97'nin kökü.**

### Serializer dosyaları (9)
Hepsinde XSD sıra hard-coded + yorum numaralandırması; runtime sequence validation yok.

| Dosya | İhlal | Satır |
|---|---|---|
| `tax-serializer.ts` | B-09: TaxExemptionReasonCode/Reason yanlış parent (TaxSubtotal altında, TaxCategory altında olmalı) | 39-44 |
| `line-serializer.ts` | B-10: InvoiceLine.Delivery AllowanceCharge'tan SONRA (önce olmalı); B-13: Item.Description Name'den SONRA (önce olmalı) | 10-39, 43-45 |
| `invoice-serializer.ts` | B-11: Root ExchangeRate AllowanceCharge'tan ÖNCE (sonra olmalı); B-96: yorum numaralandırması XSD-uyumsuz | 222-232 |
| `common-serializer.ts` | B-12: AllowanceCharge.Reason en sonda (ChargeIndicator'dan hemen sonra olmalı) | 6-23 |
| `despatch-serializer.ts` | B-14: Delivery içinde `Despatch→DeliveryAddress→CarrierParty` (XSD: `DeliveryAddress→CarrierParty→Despatch`); B-20: DriverPerson.Title NationalityID'den sonra | 138-165, 124-134 |
| `party-serializer.ts` | B-20: Person.MiddleName FamilyName'den sonra (XSD: FirstName→FamilyName→Title→MiddleName→NameSuffix→NationalityID); B-34: PostalAddress emit'i `hasAddress` flag'a bağlı | 71-73, 93-115 |
| `delivery-serializer.ts` | B-35: Address CityName/CitySubdivisionName kontrolsüz; B-99: ShipmentStage çift emit riski | 66-67, 100-114 |
| `reference-serializer.ts` | B-32: DocumentReference.IssueDate `isNonEmpty` ile atlanıyor; B-33: OrderReference.IssueDate aynı pattern | 18-20, 37-39, 71-73, 94-96 |
| `monetary-serializer.ts` | B-70: PaymentMeans.PaymentMeansCode opsiyonel yazım | 55-57 |

### Type Sistemi (`src/types/common.ts`, `despatch-input.ts`)

| Tip | Alan | Şu an | XSD zorunlu mu |
|---|---|---|---|
| `DocumentReferenceInput` | `issueDate?: string` | opsiyonel | Evet (B-32) |
| `OrderReferenceInput` | `issueDate?: string` | opsiyonel | Evet (B-33) |
| `PaymentMeansInput` | `paymentMeansCode?: string` | opsiyonel | Evet (B-70, parent PaymentMeans opsiyonel) |
| `AddressInput` | `cityName?`, `citySubdivisionName?` | opsiyonel | Evet (B-35, parent Address opsiyonel) |
| `PartyInput` | `cityName?`, `citySubdivisionName?`, diğer adres alanları | opsiyonel, **düz** (PostalAddress sub-type yok) | PostalAddress parent zorunlu (B-34) |
| `DespatchInput` | `issueTime?: string` | opsiyonel | Evet (B-18 — parent Despatch zorunlu) |

**Not:** `PartyInput` içinde adres alanları düz tanımlı (streetName, cityName, ..., country) — XSD'deki `PostalAddress` nested type olarak ayrıştırılmamış. M6 uygulamak için mimari karar gerek (Soru #3).

### Test ve CI
- 278 test yeşil. Serializer sequence assertion test'i **yok**.
- `xmllint` veya CI workflow **yok** (`.github/workflows/` dizini yok).
- `examples/output/*/output.xml` stale (Signature+UBLExtensions içeriyor, 30 fatura, 0 irsaliye — B-94).

### Uncommitted dosyalar
`git status` output'una göre `package.json`, `src/serializers/despatch-serializer.ts`, `src/serializers/invoice-serializer.ts` Sprint 1/2'den kalan modified. Sprint 1 log'unda "Sprint 8'e devir" deniyor, ancak Sprint 3'te bu iki serializer zaten değişecek — önce ayrı commit'te temizlik, sonra Sprint 3 commit'i (Soru #6).

## Hedef Durum

### `xml-helpers.ts` yeni API
```ts
cbcRequiredTag(localName, value, ctx?)       // empty → throw MissingRequiredFieldError
cbcOptionalTag(localName, value)              // empty → '' (eski cbcTag davranışı)
cbcRequiredAmountTag(localName, amt, ccy)    // empty → throw
cbcOptionalAmountTag(localName, amt, ccy)    // empty → ''
cbcRequiredQuantityTag(localName, qty, unit) // empty → throw
cbcOptionalQuantityTag(localName, qty, unit) // empty → ''
// cbcTag, cbcAmountTag, cbcQuantityTag → KALDIRILDI
// cacTag → KORUNUR, tek davranış: içerik boş ise skip (boş container yazma).
// Container'ın required/optional olması çağıran tarafın sorumluluğu; required cac için
// runtime validator enforce eder (cac level parent-child check). AR-1 disiplini sadece cbc'de.
```

Hata sınıfı: `class MissingRequiredFieldError extends Error` — field name + parent context taşır.

### `src/serializers/xsd-sequence.ts` — YENİ (karar: merkezi tablo)

Her UBL tipi için field-order array + `emitInOrder` helper:

```ts
// Her UBL tipinin XSD sıra array'i
export const INVOICE_SEQ = [
  'UBLExtensions', 'UBLVersionID', 'CustomizationID', 'ProfileID',
  'ID', 'CopyIndicator', 'UUID', 'IssueDate', 'IssueTime',
  'InvoiceTypeCode', 'Note', 'DocumentCurrencyCode', 'TaxCurrencyCode',
  'PricingCurrencyCode', 'PaymentCurrencyCode', 'LineCountNumeric',
  'InvoicePeriod', 'OrderReference', 'BillingReference',
  'DespatchDocumentReference', 'ReceiptDocumentReference',
  'OriginatorDocumentReference', 'ContractDocumentReference',
  'AdditionalDocumentReference', 'Signature',
  'AccountingSupplierParty', 'AccountingCustomerParty',
  'BuyerCustomerParty', 'SellerSupplierParty', 'TaxRepresentativeParty',
  'Delivery', 'PaymentMeans', 'PaymentTerms',
  'AllowanceCharge', 'TaxExchangeRate', 'PricingExchangeRate',
  'PaymentExchangeRate', 'PaymentAlternativeExchangeRate',
  'TaxTotal', 'WithholdingTaxTotal', 'LegalMonetaryTotal',
  'InvoiceLine',
] as const;

export const TAX_CATEGORY_SEQ = ['Name', 'TaxExemptionReasonCode', 'TaxExemptionReason', 'TaxScheme'] as const;
export const TAX_SUBTOTAL_SEQ = ['TaxableAmount', 'TaxAmount', 'CalculationSequenceNumeric', 'Percent', 'TaxCategory'] as const;
export const ALLOWANCE_CHARGE_SEQ = ['ChargeIndicator', 'AllowanceChargeReasonCode', 'Reason', 'MultiplierFactorNumeric', 'Amount', 'BaseAmount'] as const;
export const PERSON_SEQ = ['FirstName', 'FamilyName', 'Title', 'MiddleName', 'NameSuffix', 'NationalityID', 'IdentityDocumentReference'] as const;
export const INVOICE_LINE_SEQ = [
  'ID', 'Note', 'InvoicedQuantity', 'LineExtensionAmount',
  'OrderLineReference', 'Delivery', 'AllowanceCharge',
  'TaxTotal', 'WithholdingTaxTotal', 'Item', 'Price',
] as const;
export const ITEM_SEQ = ['Description', 'PackQuantity', 'PackSizeNumeric', 'Name', 'BrandName', 'ModelName', 'BuyersItemIdentification', 'SellersItemIdentification', 'ManufacturersItemIdentification', 'StandardItemIdentification', 'AdditionalItemIdentification', 'CommodityClassification', 'ItemInstance'] as const;
export const DELIVERY_SEQ = ['ID', 'Quantity', 'MinimumQuantity', 'MaximumQuantity', 'ActualDeliveryDate', 'ActualDeliveryTime', 'LatestDeliveryDate', 'LatestDeliveryTime', 'ReleaseID', 'TrackingID', 'DeliveryAddress', 'CarrierParty', 'Despatch', 'DeliveryTerms', 'Shipment'] as const;
export const ADDRESS_SEQ = ['ID', 'Postbox', 'Floor', 'Room', 'StreetName', 'AdditionalStreetName', 'BlockName', 'BuildingName', 'BuildingNumber', 'InhouseMail', 'Department', 'MarkAttention', 'MarkCare', 'PlotIdentification', 'CitySubdivisionName', 'CityName', 'PostalZone', 'CountrySubentity', 'CountrySubentityCode', 'Region', 'District', 'TimezoneOffset', 'AddressLine', 'Country'] as const;
export const PAYMENT_MEANS_SEQ = ['ID', 'PaymentMeansCode', 'PaymentDueDate', 'PaymentChannelCode', 'InstructionID', 'InstructionNote', 'PaymentID', 'CardAccount', 'PayerFinancialAccount', 'PayeeFinancialAccount', 'CreditAccount', 'PaymentMandate', 'TradeFinancing'] as const;
export const DOCUMENT_REFERENCE_SEQ = ['ID', 'CopyIndicator', 'UUID', 'IssueDate', 'IssueTime', 'DocumentTypeCode', 'DocumentType', 'DocumentDescription', 'Attachment', 'ValidityPeriod', 'IssuerParty', 'ResultOfVerification'] as const;
export const ORDER_REFERENCE_SEQ = ['ID', 'SalesOrderID', 'CopyIndicator', 'UUID', 'IssueDate', 'IssueTime', 'CustomerReference', 'OrderTypeCode', 'DocumentReference'] as const;

// Serializer'ın kullandığı helper — verilen tip için field emitterları sırayla joinLines eder
export function emitInOrder<K extends string>(
  seq: readonly K[],
  emitters: Partial<Record<K, () => string>>,
): string[] {
  return seq
    .map(field => emitters[field]?.() ?? '')
    .filter(s => s !== '');
}
```

Serializer callsite örneği (B-09 sonrası):
```ts
// tax-serializer.ts
function serializeTaxCategory(cat: TaxSubtotalInput, currency: string): string {
  return cacTag('TaxCategory', joinLines(emitInOrder(TAX_CATEGORY_SEQ, {
    Name: () => cbcOptionalTag('Name', cat.taxTypeName),
    TaxExemptionReasonCode: () => cbcOptionalTag('TaxExemptionReasonCode', cat.taxExemptionReasonCode),
    TaxExemptionReason: () => cbcOptionalTag('TaxExemptionReason', cat.taxExemptionReason),
    TaxScheme: () => cacTag('TaxScheme', serializeTaxScheme(cat)),
  })));
}
```

**Kararın etkisi:** Tüm 9 serializer'ın emit fonksiyonları bu pattern'e çevrilir. Yanlışlıkla element atlansa bile `emitInOrder` array üzerinden gider — sıra kaymaz. Conditional elementler (isExport branşı vb.) emit fonksiyonunun içinde kontrol edilir, field slotu her zaman seq'te yer alır, değer yoksa `''` döner.

### Type Sistemi — M6 Parent-Child Conditional

| Tip | Değişim |
|---|---|
| `DocumentReferenceInput` | `issueDate: string` (required) |
| `OrderReferenceInput` | `issueDate: string` (required) |
| `PaymentMeansInput` | `paymentMeansCode: string` (required) |
| `AddressInput` | `cityName: string`, `citySubdivisionName: string` (required) |
| `PartyInput` | Düz adres alanları kalır (karar onaylı); runtime validator cityName+citySubdivisionName zorunlu tutar |
| `DespatchInput` | `issueTime: string` (required) |

### Serializer sequence — hedef XSD sıra

- **TaxSubtotal:** `TaxableAmount → TaxAmount → CalculationSequenceNumeric → Percent → cac:TaxCategory → [TaxScheme]`  
  `TaxCategory:` içine `TaxExemptionReasonCode`, `TaxExemptionReason`, `TaxScheme` yerleşir (B-09).
- **InvoiceLine:** `ID → Note → InvoicedQuantity → LineExtensionAmount → ... → OrderLineReference → Delivery → AllowanceCharge → TaxTotal → WithholdingTaxTotal → Item → Price` (B-10: Delivery, AllowanceCharge'tan önce).
- **Item:** `Description → PackQuantity → ... → Name → ...` (B-13).
- **Invoice root:** `AllowanceCharge (36) → ExchangeRate×4 (37-40) → TaxTotal (41)` (B-11).
- **AllowanceCharge:** `ChargeIndicator → ChargeReasonCode → Reason → ...` (B-12: Reason ChargeIndicator hemen sonrasında).
- **DespatchAdvice Delivery:** `DeliveryAddress → CarrierParty → Despatch → ...` (B-14).
- **Person:** `FirstName → FamilyName → Title → MiddleName → NameSuffix → NationalityID → ...` (B-20).
- **Invoice yorum numaraları:** XSD satır numaralarına hizalanmış, tutarlı (B-96).

### cbcTag split sonrası serializer örneği

```ts
// tax-serializer.ts (B-09 sonrası)
function serializeTaxCategory(cat: TaxSubtotalInput, currency: string): string {
  return cacTag('TaxCategory', joinLines([
    cbcOptionalTag('Name', cat.taxTypeName),
    cbcOptionalTag('TaxExemptionReasonCode', cat.taxExemptionReasonCode),
    cbcOptionalTag('TaxExemptionReason', cat.taxExemptionReason),
    cacTag('TaxScheme', cbcRequiredTag('Name', cat.taxTypeName || kdvName) + cbcRequiredTag('TaxTypeCode', cat.taxTypeCode)),
  ]));
}
// cbc:TaxExemptionReasonCode/Reason TaxSubtotal altından TaxCategory'ye taşındı
```

## Adım Adım İmplementasyon

**Sıralama:** foundation → serializer → test. İlk gün type-check yeşil olana kadar diğer adımlar beklesin (v3 zaman riski mitigasyonu).

### Day 0 — Pre-step (Sprint 3 başlamadan önce, <1 saat)

- **Uncommitted cleanup:** `package.json` + `despatch-serializer.ts` + `invoice-serializer.ts` modified dosyaları inceleyip ayrı `chore: consolidate sprint 1-2 leftover serializer tweaks` commit'i at. Sprint 3 temiz base'ten başlasın.
- **AR-7/AR-8 grep audit (10dk):**
  - `grep -rn "kdvExemptionCode" src/types/` — InvoiceLineInput'ta var mı?
  - `grep -rn "outstandingQuantity\|oversupplyQuantity\|outstandingReason" src/types/` — DespatchInput'ta var mı?
  - Varsa: Sprint 3 tip düzenlemesi sırasında sil, implementation-log'a not.
  - Yoksa: log'a "no-op" notu, Sprint 4/6 için flag koy.
- **`simple-invoice-mapper.ts` cascade tespiti (15dk, KESİN):**
  - Komut: `grep -n "issueDate\|issueTime\|paymentMeansCode\|cityName\|citySubdivisionName" src/calculator/simple-invoice-mapper.ts`
  - Ayrıca `grep -n "DocumentReference\|OrderReference\|PaymentMeans\|Address" src/calculator/simple-invoice-mapper.ts` mapper'ın hangi tipleri ürettiğini göster.
  - **Senaryo 1 — Pass-through:** Mapper input'tan bu alanları alıp direkt geçiriyor → `SimpleInvoiceInput` (veya `SimpleLineInput`) tipi de cascade'e dahil edilecek, Day 1 Type sistem adımında güncellenir.
  - **Senaryo 2 — Default value:** Mapper boş alanları otomatik dolduruyor (örn. `issueDate = new Date().toISOString()`) → mapper kodu güncellenir, required field hiçbir zaman boş kalmaz. SimpleInvoiceInput değişmeyebilir.
  - **Senaryo 3 — Mapper alan bilmez:** SimpleInvoiceInput bu alanları içermiyor → Sprint 3 kapsamı SimpleInvoiceInput genişlemesi + mapper'a eklemeleri kapsar. Bu durumda Sprint 3 süresi riske girer, Day 0'da raporla.
  - Tespit sonucunu Day 1 adımlarına yansıt; hangi senaryonun seçildiğini implementation-log'a yaz.

### Day 1 — Foundation

1. **`xml-helpers.ts` split (AR-1):**
   - `MissingRequiredFieldError` class tanımla (`fieldName`, `parentContext` alanları).
   - `cbcRequiredTag`, `cbcOptionalTag`, `cbcRequiredAmountTag`, `cbcOptionalAmountTag`, `cbcRequiredQuantityTag`, `cbcOptionalQuantityTag` ekle.
   - Eski `cbcTag`/`cbcAmountTag`/`cbcQuantityTag` **kaldır**.
   - `ublExtensionsPlaceholder` (B-95 dead code) — Sprint 8'e bırak, şimdi dokunma.
2. **`src/serializers/xsd-sequence.ts` yeni dosya (karar: merkezi tablo):**
   - 10+ UBL tipi için field-order array (INVOICE_SEQ, TAX_CATEGORY_SEQ, TAX_SUBTOTAL_SEQ, ALLOWANCE_CHARGE_SEQ, PERSON_SEQ, INVOICE_LINE_SEQ, ITEM_SEQ, DELIVERY_SEQ, ADDRESS_SEQ, PAYMENT_MEANS_SEQ, DOCUMENT_REFERENCE_SEQ, ORDER_REFERENCE_SEQ).
   - `emitInOrder<K>(seq, emitters)` helper — field emitter map'ini verilen sırada yürütür.
   - XSD satır numaraları dosyanın yorumlarında referansla.
3. **Type sistem M6:**
   - `common.ts`: `DocumentReferenceInput.issueDate: string`, `OrderReferenceInput.issueDate: string`, `PaymentMeansInput.paymentMeansCode: string`, `AddressInput.cityName: string`, `AddressInput.citySubdivisionName: string`.
   - `despatch-input.ts`: `DespatchInput.issueTime: string`.
   - `PartyInput` **düz adres alanları olarak kalır** — runtime validator enforce eder (karar onaylı).
4. **Type-check pass:** `yarn tsc --noEmit` yeşil olmalı. İlk etapta 9 serializer + validator + builder + mapper dosyaları kırılacak. Her birine geçip eski `cbcTag` çağrılarını split API'ye çevir **ama sequence düzenini şimdi değiştirme** — yalnızca API uyumu. Sequence refactor Day 2.
5. **Runtime validator genişleme (M6):**
   - `src/validators/` altında parent-child conditional kontrol:
     - `AddressInput` verildi ama `cityName`/`citySubdivisionName` boş → hata (B-35)
     - `PartyInput` verildi ama adres alanları eksik → hata (B-34)
     - `PaymentMeansInput` verildi ama `paymentMeansCode` boş → hata (B-70)
   - Hata mesajları `"Parent '<parent>' requires '<child>' when provided"` formatı; `MissingRequiredFieldError` kullan.

### Day 2 — Serializer Sequence Refactor (xsd-sequence.ts pattern)

Her serializer emit fonksiyonu `emitInOrder(SEQ, { field: () => ... })` pattern'ine çevrilir. Conditional field'lar emitter içinde kontrol edilir, slot seq'te her zaman yer alır.

6. **`tax-serializer.ts` (B-09):** TaxSubtotal ve TaxCategory emit fonksiyonları `TAX_SUBTOTAL_SEQ`/`TAX_CATEGORY_SEQ` kullansın. TaxExemptionReasonCode/Reason artık `TaxCategory` emitter'ı içinde — TaxSubtotal'dan kaldır.
7. **`line-serializer.ts`:**
   - B-10: InvoiceLine emit'i `INVOICE_LINE_SEQ` ile — Delivery AllowanceCharge öncesi slot'ta.
   - B-13: Item emit'i `ITEM_SEQ` ile — Description, Name öncesi.
8. **`invoice-serializer.ts`:**
   - B-11: Root emit'i `INVOICE_SEQ` ile — ExchangeRate×4 AllowanceCharge sonrası TaxTotal öncesi.
   - B-96: Yorum numaralandırmasını XSD satır numaralarıyla hizala; seq referansı dosya başında `xsd-sequence.ts` yorum notuna bağla.
9. **`common-serializer.ts` (B-12):** AllowanceCharge emit'i `ALLOWANCE_CHARGE_SEQ` ile — Reason ChargeIndicator hemen sonrası.
10. **`despatch-serializer.ts`:**
    - B-14: Delivery emit'i `DELIVERY_SEQ` ile — DeliveryAddress → CarrierParty → Despatch sırası.
    - B-20: DriverPerson emit'i `PERSON_SEQ` ile — Title MiddleName öncesi.
    - B-18: `issueTime` artık required — `cbcRequiredTag` kullan.
11. **`party-serializer.ts`:**
    - B-20: Person emit'i `PERSON_SEQ` ile.
    - B-34: PostalAddress artık zorunlu emit (parent Party verildiyse); `hasAddress` flag semantiği kaldır, `cbcRequiredTag` ile `cityName`/`citySubdivisionName` enforce.
12. **`delivery-serializer.ts`:**
    - Address emit'i `ADDRESS_SEQ` ile (CityName/CitySubdivisionName slot'ları).
    - B-35: `cityName`/`citySubdivisionName` `cbcRequiredTag`.
    - B-99: ShipmentStage emit'inde çift çıktı koruması — tek conditional.
13. **`reference-serializer.ts`:**
    - DocumentReference emit'i `DOCUMENT_REFERENCE_SEQ` ile (B-32: issueDate slot).
    - OrderReference emit'i `ORDER_REFERENCE_SEQ` ile (B-33: issueDate slot).
    - `issueDate` için `cbcRequiredTag`.
14. **`monetary-serializer.ts`:**
    - PaymentMeans emit'i `PAYMENT_MEANS_SEQ` ile.
    - B-70: `paymentMeansCode` için `cbcRequiredTag`.

### Day 3 — Test + Finalization

15. **Unit test:**
    - `xml-helpers.test.ts` genişlet (6 test): `cbcRequiredTag` boş → `MissingRequiredFieldError` throw; `cbcOptionalTag` boş → ''; Amount/Quantity paralel senaryolar.
    - `xsd-sequence.test.ts` (yeni, ~5 test): `emitInOrder` — field atlama, field olmayan key, emit sırası, conditional emitter `''` dönerse skip, çok-elemanlı seq.
    - `serializers/sequence.test.ts` (yeni, 9 test): Her kritik serializer için DOM parse → element sırası doğrula (B-09 TaxCategory parent, B-10 InvoiceLine Delivery, B-11 Invoice ExchangeRate, B-12 AllowanceCharge Reason, B-13 Item Description, B-14 Despatch Delivery, B-20 Person MiddleName, B-32 DocumentReference IssueDate, B-70 PaymentMeans Code).
    - `validators/parent-child.test.ts` (yeni, 8 test): Her conditional için 2 senaryo (parent yok → no-op; parent var + child eksik → hata). Senaryolar: Address+cityName, Address+citySubdivisionName, DocumentReference+issueDate, OrderReference+issueDate, PaymentMeans+paymentMeansCode, Despatch+issueTime, Party+address, Person+firstName/familyName.
    - `cacTag` davranış test (~2-3 test): içerik boş → ''; içerik dolu → tam container; çift çağrı senaryosu.
    - `MissingRequiredFieldError` test (~2 test): mesaj formatı (`fieldName`, `parentContext`); instanceof kontrolü.
    - Mevcut builder/integration testlerinde required alan verme — gerekli fixture güncellemeleri.
    - **Hedef toplam yeni test:** ~32-33. Sprint 3 sonu: 278 → ~310 test.
16. **Type-level sanity:** `yarn tsc --noEmit` clean.
17. **AR-1 post-verification grep (zorunlu, R3):**
    - Known-required cbc field listesi ile grep: `ID`, `IssueDate`, `IssueTime`, `InvoiceTypeCode`, `DocumentCurrencyCode`, `ProfileID`, `CustomizationID`, `UBLVersionID`, `PartyName` (Party verildiyse), `CityName`, `CitySubdivisionName`, `CountryName`, `PaymentMeansCode` (PaymentMeans verildiyse), `TaxAmount`, `TaxableAmount`, `TaxTypeCode` (TaxScheme içinde), `ChargeIndicator`, `Amount` (AllowanceCharge verildiyse), `FirstName`/`FamilyName` (Person verildiyse).
    - Script:
      ```bash
      for field in ID IssueDate IssueTime InvoiceTypeCode DocumentCurrencyCode ProfileID CustomizationID UBLVersionID CityName CitySubdivisionName PaymentMeansCode TaxAmount TaxableAmount ChargeIndicator FirstName FamilyName; do
        matches=$(grep -rn "cbcOptionalTag('$field'" src/serializers/)
        [ -n "$matches" ] && echo "WARN: $field should be cbcRequiredTag:" && echo "$matches"
      done
      ```
    - Warn → düzelt (optional → required). Warn yoksa AR-1 split başarılı.
    - Bazı "required" field'lar conditional (örn. `PaymentMeansCode` sadece PaymentMeans verildiyse) — bu senaryolarda `cbcRequiredTag` doğru, parent-check emit path'inde olmalı.
18. **Implementation log:** `audit/sprint-03-implementation-log.md` — bulgu→dosya:satır→test tablosu + mimari karar + Day 0 cascade senaryosu + post-verification grep sonucu + komit hash.
19. **Final gate:** `yarn test` + `yarn tsc --noEmit` + `yarn build` clean.

**Kapsam dışı Day 3:** examples/output regenerate (B-94) — Sprint 8 doküman temizliğine ertelendi (karar). xmllint CI kurulumu — v3 dev-bağlam kuralı gereği kurulmayacak.

## Type Sistem Değişiklikleri

**Ana kaynak:** `src/types/common.ts`, `src/types/despatch-input.ts`.

| Interface | Alan | Önce | Sonra | Bulgu |
|---|---|---|---|---|
| `DocumentReferenceInput` | `issueDate` | `string?` | `string` | B-32 |
| `OrderReferenceInput` | `issueDate` | `string?` | `string` | B-33 |
| `PaymentMeansInput` | `paymentMeansCode` | `string?` | `string` | B-70 |
| `AddressInput` | `cityName` | `string?` | `string` | B-35 |
| `AddressInput` | `citySubdivisionName` | `string?` | `string` | B-35 |
| `DespatchInput` | `issueTime` | `string?` | `string` | B-18 |
| `PartyInput` | (adres alanları) | düz, opsiyonel | **düz, opsiyonel (değişmez)** + runtime validator enforce | B-34 |

**Kural:** Parent opsiyonel kalır (örn. `PaymentMeansInput` kullanımı `paymentMeans?: PaymentMeansInput`). Parent verildiyse child required — TS tip sistemi + runtime validator iki katmanlı enforce.

**AR-1 cbcTag split etkisi:** Serializer callsites'lerde her çağrı required/optional'a göre ayrıştırılır. Tahmini ~150 çağrı yeri (9 serializer × ~15-20 cbcTag çağrısı). Yanlış ayrıştırma güvenliği: TS tip derlemesi + unit test.

## Cross-Reference

### Değişecek dosyalar (17)

**Foundation:**
- `src/utils/xml-helpers.ts`
- `src/types/common.ts`
- `src/types/despatch-input.ts`

**Serializer (9):**
- `src/serializers/tax-serializer.ts`
- `src/serializers/line-serializer.ts`
- `src/serializers/invoice-serializer.ts`
- `src/serializers/common-serializer.ts`
- `src/serializers/despatch-serializer.ts`
- `src/serializers/party-serializer.ts`
- `src/serializers/delivery-serializer.ts`
- `src/serializers/reference-serializer.ts`
- `src/serializers/monetary-serializer.ts`

**Validator (bir-iki dosya):**
- `src/validators/common-validators.ts` veya benzeri (parent-child conditional runtime check)
- `src/validators/despatch-validators.ts` (issueTime)

**Builder/mapper (potansiyel):**
- `src/builders/invoice-builder.ts`, `despatch-builder.ts`
- `src/calculator/simple-invoice-mapper.ts` (required alan supply'ı değişirse)

### Grep hedefleri (Sprint 3 öncesi)

```bash
grep -rn "cbcTag(" src/               # ~150 callsite
grep -rn "cbcAmountTag(" src/         # tüm çağrılar rename edilecek
grep -rn "cbcQuantityTag(" src/
grep -rn "\.issueDate" src/ __tests__/
grep -rn "\.issueTime" src/ __tests__/
grep -rn "\.paymentMeansCode" src/ __tests__/
grep -rn "\.cityName\|\.citySubdivisionName" src/ __tests__/
```

### Mevcut test fixture'ları
`__tests__/` altındaki builder ve integration testleri — zorunlu alanları vermeyen fixture'lar update. Sprint 2'de 278 test var; Sprint 3 sonu ~300+ hedef.

## Test Stratejisi

| Test dosyası | Yeni/Genişleme | Test sayısı | Kapsam |
|---|---|---|---|
| `__tests__/utils/xml-helpers.test.ts` | Genişleme | ~6 | `cbcRequiredTag`/`cbcOptionalTag` boş→throw/empty; Amount ve Quantity paralel senaryolar; `cacTag` boş→''; `cacTag` dolu→tam container. |
| `__tests__/utils/xsd-sequence.test.ts` | Yeni | ~5 | `emitInOrder` — field atlama, field olmayan key, emit sırası, conditional emitter '' dönerse skip, çok-elemanlı seq. |
| `__tests__/utils/errors.test.ts` | Yeni | ~2 | `MissingRequiredFieldError` mesaj formatı, `fieldName`/`parentContext` alanları, `instanceof` kontrolü. |
| `__tests__/serializers/sequence.test.ts` | Yeni | 9 | Her kritik fix için DOM parse + element sırası (B-09, B-10, B-11, B-12, B-13, B-14, B-20, B-32, B-70). |
| `__tests__/validators/parent-child.test.ts` | Yeni | ~8 | Her conditional için 2 senaryo (parent yok no-op + parent var child eksik hata). Address+cityName, Address+citySubdivisionName, DocumentReference+issueDate, OrderReference+issueDate, PaymentMeans+paymentMeansCode, Despatch+issueTime, Party+address, Person+firstName/familyName. |
| **Toplam yeni** | — | **~30-33** | Sprint 3 sonu 278 → ~310 test hedef. |

- **Integration test update:** Builder fixture'ları zorunlu alanları sağlasın; eski opsiyonel fixture'lar TS derleme hatası verecek.
- **xmllint CI kurulmayacak** (karar onaylı) — lokal manuel doğrulama opsiyonel: `xmllint --schema UBL-Invoice-2.1.xsd examples/output/*/output.xml`.
- **AR-1 post-verification grep** (Day 3 Step 17) — required field'ların cbcOptionalTag'de kalmamasını doğrular, testin yakalayamadığı sessiz boşlukları yakalar.

## Risk ve Edge Case

### İş riski (kütüphanenin yanlış çalışma olasılığı)

| Risk | Mitigasyon |
|---|---|
| `cbcTag` split — her callsite doğru ayrıştırılmazsa zorunlu/opsiyonel karışır | TS derleme + unit test + sequence assertion test |
| M6 type sistemi — existing fixture'lar zorunlu alan vermez, runtime'da throw | Day 1'de fixture audit + güncelleme |
| Parent-child conditional runtime — parent olmayan path'te child kontrol tetiklenmesi | Her validator'da `if (parent) validate(child)` pattern |
| Sequence refactor — yorumlarla XSD numarası kayması | B-96 ile yorum numaralandırması XSD-uyumlu hale getirilir |
| `PartyInput` düz adres + runtime enforce — validator atlama riski | Her Party kullanım noktasında validator açık, unit test ile cover |

### Zaman riski (3 gün tahmin tutma)

| Risk | Mitigasyon |
|---|---|
| Day 1 type-check sarmalı — 150+ callsite derleme zinciri | Day 1 bitiminde tsc yeşil olmak zorunlu; değilse Sprint 4'ten 1 gün ödünç (v3 kuralı) |
| Sequence test'leri DOM parse yazımı zaman alır | İlk sequence test şablon yazılır, kalan 8 kopyala-değiştir |
| `xsd-sequence.ts` yazımı — 10+ seq array + her serializer emit refactor'u uzun sürer | Day 1 içinde seq dosyası + 1-2 serializer; Day 2 kalan 7 serializer paralel |

### Edge case'ler

- **Farklı conditional sequence yolları:** Invoice root'ta `if (isExport) Delivery` gibi coğrafi branşma var. Sequence tabanı aynı, bazı opsiyonel elementler conditional. Hardcoded sıra her branş için tutarlı olmalı.
- **Despatch Shipment nested sequence:** Shipment > ShipmentStage > Delivery > ... zincirinde her seviye ayrı XSD tipi. B-14 yalnız Delivery seviyesini düzeltir; alt seviyeler audit gerekebilir.
- **TaxScheme inline vs nested:** TaxCategory > TaxScheme pattern mevcut koddan korunur mu — grep doğrulaması.

## Kapsam Dışı (TODO)

- **xmllint CI** — v3 dev-bağlam kuralı, Sprint 3 kapsam dışı (karar onaylı). Unit test + DOM-parse sequence assertion yeterli.
- **examples/output regenerate (B-94)** — Sprint 8 doküman temizliğine ertelendi (karar onaylı). Sprint 3 sonunda fixture'lar değişecek ama regenerate script çalıştırma Sprint 8'de.
- **B-95 `ublExtensionsPlaceholder` dead code silme** — Sprint 8 doküman temizliği kapsamında.
- **B-39 OriginatorDocumentReference ekleme** — Sprint 6 despatch extensions kapsamında, B-32 downstream.
- **AR-7/AR-8 tip temizliği** — Day 0 grep audit'inde varsa Sprint 3 içinde temizlenecek (karar onaylı), yoksa Sprint 4/6'ya not.
- **Stale uncommitted dosyalar** — Day 0'da ayrı `chore:` commit ile konsolide (karar onaylı).

## Çıktı Listesi

### Yeni dosyalar
- `audit/sprint-03-plan.md` — onay sonrası bu planın kopyası
- `audit/sprint-03-implementation-log.md` — implementasyon sonu
- **`src/serializers/xsd-sequence.ts`** — merkezi field-order tablosu + `emitInOrder` helper
- `__tests__/utils/xsd-sequence.test.ts` — `emitInOrder` unit test
- `__tests__/utils/errors.test.ts` — `MissingRequiredFieldError` test
- `__tests__/serializers/sequence.test.ts` — 9 serializer sequence assertion
- `__tests__/validators/parent-child.test.ts` — 8 parent-child senaryo

### Değişen dosyalar
- `src/utils/xml-helpers.ts` (cbcTag split + MissingRequiredFieldError)
- `src/types/common.ts` (4 interface'te required alan)
- `src/types/despatch-input.ts` (issueTime required)
- 9 serializer dosyası (sequence refactor + cbcRequired/Optional split)
- 2-3 validator dosyası (parent-child runtime)
- Muhtemelen `src/calculator/simple-invoice-mapper.ts` (required alan supply)
- `__tests__/utils/xml-helpers.test.ts` (varsa genişleme, yoksa yeni)
- Muhtemelen `__tests__/builders/*.test.ts` (fixture update)
- `examples/output/*/output.xml` (B-94 — opsiyonel regenerate)

### Silinen
- Eski `cbcTag`, `cbcAmountTag`, `cbcQuantityTag` fonksiyonları (AR-1)

## Alınan Kararlar

Plan hazırlığı sırasında kullanıcı netleştirmesi yapıldı; şu kararlar plan'a işlendi:

| Konu | Karar |
|---|---|
| **XSD sequence mimarisi** | `src/serializers/xsd-sequence.ts` merkezi tablo + `emitInOrder` helper. Her serializer tabloyu referans alarak emit eder. |
| **`PartyInput` adres alanları** | Düz alanlar kalır (breaking tip değişikliği yok). Runtime validator cityName+citySubdivisionName zorunlu tutar. |
| **`cbcRequiredTag` hata sınıfı** | Custom `MissingRequiredFieldError extends Error` (`fieldName`, `parentContext` alanları). Test assertion kolaylığı için. |
| **`cacTag` disiplini** | AR-1 sadece cbc'de. `cacTag` korunur, içerik boşsa skip. Required cac container (ör. PostalAddress) enforce'u runtime validator'da. |
| **Test sayısı hedefi** | ~32-33 yeni test, 278 → ~310 toplam. Parent-child her conditional için 2 senaryo (parent yok + parent var child eksik). |
| **xmllint CI** | Kurulmayacak. v3 dev-bağlam kuralı. Unit test + DOM-parse yeterli. |
| **examples/output regenerate** | Sprint 8 doküman temizliğine ertelendi. Sprint 3 sonu fixture'lar değişse de regenerate script Sprint 8'de koşulacak. |
| **Uncommitted dosyalar** | Day 0 pre-step: `chore:` commit ile konsolide. Sprint 3 temiz base'ten başlar. |
| **AR-7/AR-8 audit** | Day 0 grep audit — varsa Sprint 3 tip düzenlemesiyle birlikte temizlenir; yoksa log'a not. |

## Tahmini Süre

| Adım | Süre |
|---|---|
| Day 1: `xml-helpers.ts` split + type sistem M6 + runtime validator + tsc yeşil | 1 gün |
| Day 2: 9 serializer sequence refactor + cbcRequired/Optional entegrasyonu | 1 gün |
| Day 3: Test yazımı (xml-helpers + sequence + parent-child) + examples regenerate + implementation-log | 0.5-1 gün |
| **Toplam** | **2.5-3 gün** |

v3 plan tahmini: 3 gün (±1 zaman riski payı). Uyumlu.

**Zaman riski olursa:** Sprint 4'ten 1 gün ödünç. Day 1 type-check takılırsa diğer adımlar bekleyecek (v3 kuralı).
