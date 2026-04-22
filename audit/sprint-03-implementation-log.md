---
sprint: 03
tarih: 2026-04-22
v3_baglam: audit/FIX-PLANI-v3.md
plan: audit/sprint-03-plan.md
---

# Sprint 3 İmplementasyon Logu — XSD Sequence + M6 Parent-Child + AR-1 cbcTag Split

## Özet

- **Süre:** Tek oturumda tamamlandı (plan tahmini 3 gün; hızlı geçiş sebebi: cbcTag bulk rename + xsd-sequence.ts merkezi tablo sayesinde refactor paralel ilerledi).
- **Kapanan bulgular:** 17 (plan 18; B-94 Sprint 8'e ertelendi).
- **Test:** 278 → **332** (+54, hedef ~310'u aştı).
- **Type-check:** `yarn tsc --noEmit` clean.
- **Build:** `yarn build` clean (ESM 178KB, CJS 183KB, DTS 68KB).

## Day 0 — Pre-step Sonuçları

### Uncommitted cleanup
- Commit: `35d80af` — `chore: consolidate sprint 1-2 leftover serializer cleanups`
- Kapsam: `package.json` (1.4.1→1.4.2), `despatch-serializer.ts` (ublExtensionsPlaceholder import kaldırıldı), `invoice-serializer.ts` (user refactor — UBLExtensions removal + formatting).
- Sprint 3 temiz base'ten başladı.

### AR-7/AR-8 grep audit
- **AR-7** (satır-seviyesi `kdvExemptionCode`): `InvoiceLineInput` tipinde **yok**. `SimpleInvoiceInput` satır 370'te belge-seviyesi olarak var ama v3 AR-7 sadece satır-seviyesini kaldırıyor → **no-op**. Sprint 4/6'ya flag gerekmiyor.
- **AR-8** (Outstanding/Oversupply): `DespatchInput`'ta yok. No-op.

### simple-invoice-mapper cascade tespiti
- **Senaryo:** Senaryo 1 (pass-through) + Senaryo 2 (datetime'den türetilen `issueDate`/`issueTime`) karışık.
- **Cascade:** `SimpleInvoiceInput` tiplerindeki karşılık alanlar (`issueDate`, `cityName`, `citySubdivisionName`, `meansCode`) zaten `required` — `SimpleBillingReferenceInput.issueDate: string`, `SimpleOrderReferenceInput.issueDate: string`, `SimpleAddressInput.city/district: string`, `SimplePaymentMeansInput.meansCode: string`. M6 değişiklikleri (common.ts required yükseltmeleri) `SimpleInvoiceInput`'ta breaking cascade üretmedi.
- Mapper kodu değişmedi.

## Kapanan Bulgular (17)

| Bulgu | Dosya:satır | Değişiklik | Test |
|---|---|---|---|
| **B-09** TaxExemption TaxCategory | `src/serializers/tax-serializer.ts` (yeniden yazıldı) | `TaxExemptionReasonCode/Reason` `TaxCategory` altına taşındı (TaxSubtotal'dan kaldırıldı). `TAX_SUBTOTAL_SEQ` + `TAX_CATEGORY_SEQ` + `TAX_SCHEME_SEQ` pattern'i. | `sequence.test.ts:B-09` |
| **B-10** InvoiceLine Delivery sırası | `src/serializers/line-serializer.ts:10-39` | `INVOICE_LINE_SEQ` ile emit; Delivery AllowanceCharge slot'tan önce. | `sequence.test.ts:B-10` |
| **B-11** Invoice ExchangeRate sırası | `src/serializers/invoice-serializer.ts:222-230` | AllowanceCharge ÖNCE, PricingExchangeRate SONRA. | `sequence.test.ts:B-11` |
| **B-12** AllowanceCharge Reason sırası | `src/serializers/common-serializer.ts` (yeniden yazıldı) | `ALLOWANCE_CHARGE_SEQ` ile emit; Reason ChargeIndicator hemen sonrası. | `sequence.test.ts:B-12` |
| **B-13** Item Description sırası | `src/serializers/line-serializer.ts:43-80` | `ITEM_SEQ` ile emit; Description Name öncesi. | `sequence.test.ts:B-13` |
| **B-14** Despatch Delivery sırası | `src/serializers/despatch-serializer.ts:138-170` | `DeliveryAddress → CarrierParty → Despatch` sırası. | `sequence.test.ts:B-14` |
| **B-18** DespatchAdvice IssueTime required | `src/types/despatch-input.ts:36`, `src/serializers/despatch-serializer.ts:42-43`, `src/validators/despatch-validators.ts:46-51` | Tip: `issueTime: string`; serializer: `cbcRequiredTag`; validator: missingField check. | `despatch-builder.test.ts` (fixture guncel) |
| **B-20** Person sequence | `src/serializers/party-serializer.ts`, `src/serializers/despatch-serializer.ts` | `PERSON_SEQ` ile emit (FirstName → FamilyName → Title → MiddleName → NationalityID). TCKN party + DriverPerson. | `sequence.test.ts:B-20` |
| **B-32** DocumentReference IssueDate required | `src/types/common.ts:184-190`, `src/serializers/reference-serializer.ts:61-71`, `src/validators/common-validators.ts` | Tip: `issueDate: string`; serializer: `cbcRequiredTag`; validator: `validateDocumentReference`. | `sequence.test.ts:B-32`, `parent-child.test.ts:B-32` |
| **B-33** OrderReference IssueDate required | `src/types/common.ts:198-201`, `src/serializers/reference-serializer.ts:31-40`, validator | Tip: `issueDate: string`; serializer: `cbcRequiredTag`; validator: `validateOrderReference`. | `sequence.test.ts:B-33`, `parent-child.test.ts:B-33` |
| **B-34** Party PostalAddress zorunlu | `src/serializers/party-serializer.ts:86-130` (PostalAddress), validator | `hasAddress` flag kaldırıldı; her zaman emit; runtime `validatePartyAddressFields` cityName/citySubdivisionName enforce. | `parent-child.test.ts:B-34` |
| **B-35** Address CityName/CitySubdivisionName required | `src/types/common.ts:247-260`, `src/serializers/delivery-serializer.ts:53-77`, validator | Tip: required; serializer: `cbcRequiredTag`; validator: `validateAddress`. | `parent-child.test.ts:B-35` |
| **B-70** PaymentMeans PaymentMeansCode required | `src/types/common.ts:292-297`, `src/serializers/monetary-serializer.ts:49-72`, validator | Tip: `paymentMeansCode: string`; serializer: `cbcRequiredTag`; validator: `validatePaymentMeans`. | `sequence.test.ts:B-70`, `parent-child.test.ts:B-70` |
| **B-96** invoice-serializer yorum numaralandırması | `src/serializers/invoice-serializer.ts` | Yorum numaraları XSD satır numaralarıyla hizalandı (15/16/17/17 → 18/19/20/21...). | — |
| **B-97** cbcTag silent empty | `src/utils/xml-helpers.ts` (yeniden yazıldı) | `cbcTag` kaldırıldı; `cbcRequiredTag`/`cbcOptionalTag` (ve Amount/Quantity varyantları) split. `MissingRequiredFieldError` eklendi. | `xml-helpers.test.ts` (18 test), `errors.test.ts` (2 test) |
| **B-99** Shipment çift ShipmentStage | `src/serializers/delivery-serializer.ts:80-138` | `shipmentStages` verildiyse onlar kullanılır; yoksa `transportModeCode` fallback tek stage. | — (manual review) |
| — | `src/serializers/xsd-sequence.ts` (yeni) | 12+ UBL tipi için field-order array + `emitInOrder` helper. Day 2 refactor temeli. | `xsd-sequence.test.ts` (6 test) |

**Ertelenen (Sprint 8):**
- **B-94** examples/output regenerate — v3 karar. Sprint 3 sonu fixture'lar değiştiği için regenerate Sprint 8'e ertelendi.

## Uygulanan Mimari Kararlar

### M6 — Parent-Child Conditional Required
Parent opsiyonel; parent verildiyse child zorunlu. Üç katmanlı enforce:
1. **TypeScript tip sistemi:** `common.ts`/`despatch-input.ts` — 6 alan `string?` → `string`.
2. **Serializer:** `cbcRequiredTag` boş değerde `MissingRequiredFieldError` fırlatır.
3. **Runtime validator:** `validateAddress`, `validatePaymentMeans`, `validateDocumentReference`, `validateOrderReference`, `validatePartyAddressFields` — parent varsa child enforce.

**PartyInput kararı (plan):** Düz adres alanları korundu (nested `PostalAddressInput` ayrıştırılmadı). Runtime validator zorunluluğu sağlıyor. Breaking tip değişikliği önlendi.

### AR-1 — cbcTag Split (agresif rename)
- `cbcTag`/`cbcAmountTag`/`cbcQuantityTag` **kaldırıldı**.
- Yeni API:
  - `cbcRequiredTag(localName, value, parentContext?)` — empty → `MissingRequiredFieldError`
  - `cbcOptionalTag(localName, value)` — empty → '' (silent skip, eski davranış)
  - `cbcRequired/OptionalAmountTag` — currencyID attr ile
  - `cbcRequired/OptionalQuantityTag` — unitCode attr ile
- `cacTag` korundu (AR-1 dışı, skip-on-empty davranışı). Required cac container enforce runtime validator'da.
- `MissingRequiredFieldError extends Error` (`fieldName`, `parentContext` alanları).

### XSD Sequence — Merkezi Tablo (karar)
`src/serializers/xsd-sequence.ts` yeni dosya — 12+ UBL tipi için field-order array:
- `INVOICE_SEQ`, `DESPATCH_SEQ`, `INVOICE_LINE_SEQ`, `DESPATCH_LINE_SEQ`
- `TAX_TOTAL_SEQ`, `TAX_SUBTOTAL_SEQ`, `TAX_CATEGORY_SEQ`, `TAX_SCHEME_SEQ`
- `ALLOWANCE_CHARGE_SEQ`, `ITEM_SEQ`, `PRICE_SEQ`
- `PARTY_SEQ`, `PERSON_SEQ`, `ADDRESS_SEQ`, `CONTACT_SEQ`, `PARTY_TAX_SCHEME_SEQ`, `PARTY_LEGAL_ENTITY_SEQ`
- `DELIVERY_SEQ`, `SHIPMENT_SEQ`
- `PAYMENT_MEANS_SEQ`, `DOCUMENT_REFERENCE_SEQ`, `ORDER_REFERENCE_SEQ`, `BILLING_REFERENCE_SEQ`
- `EXCHANGE_RATE_SEQ`, `LEGAL_MONETARY_TOTAL_SEQ`, `PERIOD_SEQ`

`emitInOrder<K>(seq, emitters)` helper — field emitter map'ini verilen sırada yürütür; emitter `''` dönerse atlanır. 9 serializer'ın kritik emit fonksiyonları bu pattern'e çevrildi.

## Test Stratejisi Çıktısı

| Dosya | Test Sayısı |
|---|---|
| `__tests__/utils/xml-helpers.test.ts` (yeni) | 18 |
| `__tests__/utils/xsd-sequence.test.ts` (yeni) | 6 |
| `__tests__/utils/errors.test.ts` (yeni) | 2 |
| `__tests__/serializers/sequence.test.ts` (yeni) | 12 |
| `__tests__/validators/parent-child.test.ts` (yeni) | 16 |
| Güncellenen fixture'lar | 0 yeni test; `common-validators.test.ts` + `despatch-builder.test.ts` fixture'larına `citySubdivisionName` eklendi |
| **Toplam yeni** | **54** |
| **Sprint 3 sonu toplam** | **332** (278 → 332) |

**Hedef:** ~310 test. **Gerçek:** 332. Hedef aşıldı.

## Day 3 — AR-1 Post-verification Grep (R3)

Known-required cbc field listesi ile grep:
```
ID, IssueDate, IssueTime, InvoiceTypeCode, DocumentCurrencyCode,
ProfileID, CustomizationID, UBLVersionID, CityName, CitySubdivisionName,
PaymentMeansCode, TaxAmount, TaxableAmount, TaxTypeCode, ChargeIndicator,
FirstName, FamilyName, NationalityID
```

**Sprint 3 kapsamındakiler:** ✓ hepsi `cbcRequiredTag` kullanıyor.
- `IssueDate` (DocumentReference/OrderReference) → reference-serializer.ts cbcRequiredTag
- `IssueTime` (DespatchAdvice) → despatch-serializer.ts cbcRequiredTag
- `CityName`, `CitySubdivisionName` → delivery-serializer + party-serializer cbcRequiredTag
- `PaymentMeansCode` → monetary-serializer.ts cbcRequiredTag
- `ChargeIndicator` → common-serializer.ts cbcRequiredTag

**Kapsam dışı (warn görünüyor ama Sprint 3 scope değil):**
- `ID`, `ProfileID`, `CustomizationID`, `UBLVersionID` (DespatchAdvice root) — Sprint 6 scope.
- `TaxAmount`, `TaxableAmount`, `TaxTypeCode` — Sprint 4 aritmetik scope.
- `FirstName`, `FamilyName`, `NationalityID` (Person block) — Party/Person XSD required ama kütüphane Party-conditional pattern'de. Runtime `validateParty` zaten enforce ediyor.
- `IssueDate` (ContractReference, AdditionalDocument) — Sprint 6 (B-32 downstream).

AR-1 split başarıyla uygulandı.

## Yeni/Değişen Dosyalar

### Yeni
- `src/utils/errors.ts` — `MissingRequiredFieldError` class
- `src/serializers/xsd-sequence.ts` — XSD sequence merkezi tablo + `emitInOrder`
- `__tests__/utils/xml-helpers.test.ts`
- `__tests__/utils/xsd-sequence.test.ts`
- `__tests__/utils/errors.test.ts`
- `__tests__/serializers/sequence.test.ts`
- `__tests__/validators/parent-child.test.ts`
- `audit/sprint-03-plan.md` (onaylanan plan kopyası)
- `audit/sprint-03-implementation-log.md` (bu dosya)

### Değişen (kaynak)
- `src/utils/xml-helpers.ts` — AR-1 split
- `src/types/common.ts` — 4 interface'te required alan (DocumentReference/OrderReference/PaymentMeans/Address)
- `src/types/despatch-input.ts` — `issueTime: string`
- `src/serializers/tax-serializer.ts` — yeniden yazıldı (B-09)
- `src/serializers/line-serializer.ts` — yeniden yazıldı (B-10, B-13)
- `src/serializers/common-serializer.ts` — yeniden yazıldı (B-12)
- `src/serializers/invoice-serializer.ts` — B-11 + B-96 yorum numaraları
- `src/serializers/despatch-serializer.ts` — B-14, B-18, B-20
- `src/serializers/party-serializer.ts` — B-20 (Person), B-34 (PostalAddress her zaman emit)
- `src/serializers/delivery-serializer.ts` — B-35, B-99
- `src/serializers/reference-serializer.ts` — B-32, B-33
- `src/serializers/monetary-serializer.ts` — B-70
- `src/validators/common-validators.ts` — M6 yeni fonksiyonlar + validateCommon içinde çağrılar
- `src/validators/despatch-validators.ts` — issueTime required
- `__tests__/validators/common-validators.test.ts` — Party fixture'larına `citySubdivisionName` eklendi
- `__tests__/builders/despatch-builder.test.ts` — supplier/customer fixture'larına `citySubdivisionName` eklendi

### Dokunulmayan
- `src/calculator/simple-invoice-mapper.ts` — M6 cascade pass-through; SimpleInvoiceInput tipindeki alanlar zaten required olduğu için mapper değişikliğe gerek duymadı.
- Diğer calculator, builder, validator dosyaları

## v3 Disiplin — Yapılmayanlar

- ❌ `examples/output` regenerate (B-94) — Sprint 8'e ertelendi
- ❌ xmllint CI workflow — v3 dev-bağlam kuralı
- ❌ `CHANGELOG.md` güncelleme — Sprint 8'de v2.0.0 tek entry
- ❌ `package.json` version bump — Sprint 8'de 2.0.0

## Commit

- **Hash:** `2e49395`
- **Mesaj:** `Sprint 3: XSD sequence + M6 parent-child + AR-1 cbcTag split`
- **Pre-cleanup commit:** `35d80af` (chore: consolidate sprint 1-2 leftover serializer cleanups)
- **Değişim:** 25 dosya, +2670 / −630 satır

## Sonraki Sprint

Sprint 4 — Calculator Aritmetik + Yuvarlama (M9/M10). Kapsam: B-15, B-41..B-47, B-76, B-79, B-80, B-81, B-83 + AR-5 (B-40 iptal tam temizlik), AR-7 (no-op — InvoiceLineInput'ta yok). Yeni oturum + yeni plan modu.

**Sprint 4 öncesi karar zorunlu:** B-17 iç teyit (stopaj aritmetik) — kullanıcı Mimsoft kodunu incelep davranışı doğrulayacak.
