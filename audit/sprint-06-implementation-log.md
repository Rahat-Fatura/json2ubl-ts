---
sprint: 6
baslik: Despatch Extensions + Party/Address Common
tarih: 2026-04-23
plan: audit/sprint-06-plan.md
toplam_commit: 8 (Sprint 6.1 … 6.8)
test_durumu: 554/554 yeşil (34 dosya, Sprint 5 sonundan +51 test)
---

# Sprint 6 İmplementasyon Günlüğü

Sprint 6 planı (`audit/sprint-06-plan.md`) 8 mantıksal alt commit halinde uygulandı.
Ana tema: **Despatch Advice (e-İrsaliye) kapsam genişlemesi + Party/Address ortak
refactor + Invoice metadata eksikleri** — 15 FIX-PLANI-v3 bulgusu (B-19, B-36..B-39,
B-48, B-49, B-51, B-52, B-53, B-71..B-74, B-98, B-100) + 3 mimari karar (M8 teyit,
AR-2 agresif rename, AR-8 iptal) + denetim 06'dan 3 ek bulgu (O3, O4, O7 Schematron
whitelist/regex validator iyileştirmeleri).

Tüm commit'lerde `yarn test` yeşil; `yarn tsc --noEmit` temiz. Sprint 1–5 davranışı
korundu (503 mevcut test geçmeye devam etti, 51 yeni test eklendi).

## Netleştirme Soruları (Sprint 6 başı — AskUserQuestion)

Plan Modu aşamasında 4 soru soruldu; kullanıcı tümünde "Recommended" önerisini seçti:

1. **Kapsam:** Hepsi Sprint 6 (FIX-PLANI-v3 15 bulgu ataması) — Fatura/ortak bulgular da dahil
2. **AR-2 cardinality:** Opsiyonel 0..n (`driverPersons?: DriverPersonInput[]`)
3. **B-49 DORSEPLAKA API:** İki bağımsız opsiyonel alan (licensePlates + transportHandlingUnits)
4. **Denetim 06 O3/O4/O7:** Hepsi Sprint 6'ya dahil (O5/O6 Sprint 8'e ertelendi)

İç teyit gerektiren Mimsoft askıları (#25a-d) kullanıcı tarafından cevaplanmıştı:
- #25a (B-19 DespatchContact): opsiyonel + uyarı ✅
- #25b (B-49 DORSE path): ikisi de (fallback hierarchy) ✅
- #25c (B-52 LineCountNumeric): otomatik emit ✅
- #25d (B-48 3 party): üçü de opsiyonel ✅
- #25e (B-50 Outstanding/Oversupply): yapmıyoruz → AR-8 ile iptal ✅

## Commit Özeti

| # | Commit | Hash | Test | Kapsam |
|---|---|---|---|---|
| 6.1 | Plan + M8/B-38 teyit + AR-8 temizlik | `ae7077d` | 503 | `audit/sprint-06-plan.md` (572 satır) + log iskelet |
| 6.2 | AR-2 driverPersons[] array migration (B-51) | `d183ecf` | 507 (+4) | Type rename + serializer loop + validator cardinality |
| 6.3 | B-48 3 party + B-19 DespatchContact/Name | `5f55f77` | 512 (+5) | DespatchContact/Name + BuyerCustomer/Seller/Originator opsiyonel |
| 6.4 | B-49 TransportHandlingUnit + B-72 shipmentId + B-73 ValueAmount | `d73193f` | 519 (+7) | Canonical DORSEPLAKA path + Shipment override + GoodsItem |
| 6.5 | B-52 LineCountNumeric + B-53 OrderReference array | `ea68fa7` | 523 (+4) | Otomatik LineCount + çoklu OrderReference |
| 6.6 | Denetim 06 O3/O4/O7 Despatch validator | `8f60aa2` | 533 (+10) | Whitelist runtime + lineId numeric + MATBUDAN cross-check |
| 6.7 | B-36/B-37 Party + B-98/B-100 Address | `f9b67f9` | 548 (+15) | BuyerCustomer PostalAddress/TaxScheme/Contact + TaxRep + Address |
| 6.8 | B-39/B-71/B-74 Invoice + log + devir | (bu commit) | 554 (+6) | Invoice OriginatorDoc/TaxExchangeRate/PaymentCurrencyCode + log |

Kümülatif test: Sprint 5 sonu 503 → Sprint 6 sonu **554** (+51 test, +5 dosya).

---

## No-Op Teyitleri

Plan Modu aşamasında Denetim 06'da "açık" olarak raporlanan ancak Sprint 3'te çözülmüş
olduğu tespit edilen bulgular + FIX-PLANI-v3'te "yapılacak" gibi görünen ancak zaten
uygulanmış durumlar:

### M8 / B-38 — CustomizationID `TR1.2` tek sabit ✅ (Zaten uygulanmış)
- `src/config/namespaces.ts:28` → `customizationId: 'TR1.2'` doğru değer
- `despatch-serializer.ts:26` + `invoice-serializer.ts:58` aynı sabiti kullanıyor
- **Sonuç:** Sprint 3-4 civarı uygulanmış; top-level `UBL_CUSTOMIZATION_ID` rename yapılmadı (obj yapısı korunur).

### AR-8 / B-50 — Outstanding/Oversupply/OutstandingReason ✅ (Zaten yok)
- `grep -rn "outstanding\|oversupply" src/types/` → hiç bulunmadı
- **Sonuç:** Silinecek alan yok, no-op.

### K1 / B-18 — Despatch IssueTime zorunlu ✅ (Sprint 3)
- `despatch-input.ts:26` zorunlu tip + `despatch-serializer.ts:44` cbcRequiredTag

### K3 / B-14 — Despatch Delivery sequence ✅ (Sprint 3)
- `despatch-serializer.ts:137-164` doğru sıra (DeliveryAddress → CarrierParty → Despatch)

### K4 / B-20 — DriverPerson PERSON_SEQ ✅ (Sprint 3)
- `despatch-serializer.ts:122-133` emitInOrder(PERSON_SEQ, ...) kullanıyor

---

## Kapsanan Bulgular — Detay

### Sprint 6.1 (ae7077d) — Plan + Teyitler

- `audit/sprint-06-plan.md` (572 satır) Plan Modu'dan kopyalandı.
- M8, AR-8, K1/K3/K4 no-op teyitleri log'a düşüldü.

### Sprint 6.2 (d183ecf) — AR-2 / B-51 `driverPersons[]`

**AR-2 agresif rename:** `driverPerson?: DriverPersonInput` → `driverPersons?: DriverPersonInput[]`.
Fallback yok.

- `src/types/despatch-input.ts:56` tip güncellemesi
- `src/serializers/despatch-serializer.ts:122-133` for loop her iterasyonda PERSON_SEQ
- `src/validators/despatch-validators.ts:96-113` cardinality kuralı:
  `driverPersons?.length > 0 ∨ carrierParty`
- Field path indexli: `shipment.driverPersons[i].<field>`

**Yeni testler (4):**
- 2 DriverPerson emit kombinasyonu
- CarrierParty-only senaryosu
- Boş array sürücü yok sayılır
- Indexli validation error path

### Sprint 6.3 (5f55f77) — B-48 3 party + B-19 DespatchContact

**B-19 — "Teslim Eden" (UBL-TR §5.4):**
- `DespatchInput.despatchContactName?: string`
- Serializer: DespatchSupplierParty içinde `cac:DespatchContact/cbc:Name`

**B-48 — 3 opsiyonel party (XSD:26-28):**
- `buyerCustomer?`, `sellerSupplier?`, `originator?: PartyInput`
- XSD sırası: DespatchSupplier → DeliveryCustomer → Buyer → Seller → Originator → Shipment

**Runtime zorunluluk kuralı eklenmedi** (kullanıcı direktifi): XSD hepsini 0..1 tanımlıyor;
mevcut deliveryCustomer zorunluluğu yeterli.

**Yeni testler (5):** DespatchContact emit/no-emit + 3 party tek/hepsi + XSD sırası

### Sprint 6.4 (d73193f) — B-49 TransportHandlingUnit + B-72 + B-73

**B-49 — Canonical DORSEPLAKA path:**
- `DespatchShipmentInput.transportHandlingUnits?: DespatchTransportHandlingUnitInput[]`
- Yeni tip `DespatchTransportHandlingUnitInput { transportEquipmentId, schemeId? }`
  (common.ts'teki IHRACAT `TransportHandlingUnitInput` ile çakışma çözüldü)
- Shipment bloğunda Delivery sonrası `<cac:TransportHandlingUnit>/<cac:TransportEquipment>/<cbc:ID schemeID="DORSEPLAKA">`
- Mevcut `licensePlates` (TransportMeans/RoadTransport/LicensePlateID codelist path) ile
  yan yana kullanılabilir — iki bağımsız opsiyonel alan

**B-72 — Shipment/cbc:ID override:**
- `shipmentId?: string` opsiyonel; default `'1'` backward compat

**B-73 — GoodsItem/cbc:ValueAmount:**
- `goodsItem?.valueAmount?: { value, currencyId? }` (default TRY)
- XSD sequence: ValueAmount(1689) < RequiredCustomsID(1696)

**Yeni testler (7):** shipmentId override/default, ValueAmount TRY+currency, THU emit+XSD sıra+schemeId override

### Sprint 6.5 (ea68fa7) — B-52 LineCountNumeric + B-53 OrderReference

**B-52 — Otomatik LineCountNumeric:**
- `input.lines.length` serializer'da otomatik emit (input alanı YOK)
- XSD sırası: Note(19) → LineCountNumeric(20) → OrderReference(21)

**B-53 — Çoklu OrderReference (XSD 0..n):**
- `DespatchInput.orderReference?` → `orderReferences?: OrderReferenceInput[]`

**Invoice orderReference ön-grep (kullanıcı direktifi):**
- `src/types/invoice-input.ts:87` Invoice OrderReference tekil (XSD 0..1)
- Invoice'da rename yapılmadı — tutarlılık değil, doğruluk önceliği

**Yeni testler (4):** LineCountNumeric=length, XSD sırası, 2 OrderReference emit, undefined→no emit

### Sprint 6.6 (8f60aa2) — Denetim 06 O3/O4/O7

**O3 — Whitelist runtime:**
- `profileId`, `despatchTypeCode` için `Object.values(enum).includes()` runtime check

**O4 — DespatchLineId numeric:**
- `lines[i].id` için `/^\d+$/` regex (Schematron `string(number()) != 'NaN'`)

**O7 — MATBUDAN cross-check:**
- `additionalDocuments` içinde en az bir `documentType === 'MATBU'` olmalı

**Yeni testler (10):** profil/tip invalid, numerik/non-numeric ID, MATBUDAN+MATBU kabul/eksik red

Sprint 8'e ertelenen: O5 (CarrierParty validateParty), O6 (PartyId schemeID runtime).

### Sprint 6.7 (f9b67f9) — B-36/B-37 Party + B-98/B-100 Address

**B-36 — BuyerCustomerParty alt alanlar:**
- PostalAddress, PartyTaxScheme, Contact emit yolu eklendi

**B-37 — TaxRepresentativeParty PartyName + PostalAddress:**
- `TaxRepresentativeInput.name?`, `postalAddress?: AddressInput`
- Serializer yeni emit

**B-98 — Address alt alanları:**
- `AddressInput` + `PartyInput` flat ekleme: `blockName?`, `district?`, `postbox?`
- ADDRESS_SEQ'te zaten tanımlı, sadece emit eklendi

**B-100 — Country IdentificationCode:**
- `countryCode?: string` (ISO 3166-1 alpha-2)
- `serializeCountry` helper: IdentificationCode + Name XSD sırasıyla
- `country?: string` korundu — structural change yok, examples migration gereksiz

**Yeni testler (15):** 8 address-extensions (BlockName/District/Postbox/countryCode) + 7 party-extensions (BuyerCustomer B-36 + TaxRep B-37)

### Sprint 6.8 (bu commit) — B-39/B-71/B-74 Invoice + log + devir

**B-74 — PaymentCurrencyCode (XSD:23):**
- `InvoiceInput.paymentCurrencyCode?: string`
- Serializer: PricingCurrencyCode sonrası emit

**B-71 — TaxExchangeRate (XSD:45):**
- `InvoiceInput.taxExchangeRate?: ExchangeRateInput`
- `serializeExchangeRate` parametreli hale getirildi (default `PricingExchangeRate`)
- Invoice'da TaxExchangeRate PricingExchangeRate'ten önce emit

**B-39 — OriginatorDocumentReference (XSD:32, 0..n):**
- `InvoiceInput.originatorDocumentReferences?: DocumentReferenceInput[]`
- Serializer: ReceiptDocumentReference sonrası emit

**Yeni testler (6):** PaymentCurrencyCode emit+XSD sıra, TaxExchangeRate+PricingRate birlikte/tek, OriginatorDocRef çoklu emit.

---

## Mimari Kararlar

### M8 — CustomizationID Tek Sabit ✅ (teyit)
`UBL_CONSTANTS.customizationId = 'TR1.2'` hem Invoice hem Despatch için. Zaten böyleydi.

### AR-2 — `driverPerson` → `driverPersons[]` ✅ (Sprint 6.2)
Fallback yok, agresif rename. Cardinality 0..n opsiyonel.

### AR-8 — Outstanding/Oversupply ✅ (no-op)
Tipte zaten yoktu, silinecek alan yok.

---

## Sprint 7 / Sprint 8 Devir Listesi

### Sprint 7 — Test Güncellemeleri (1-2 gün)
- **B-T01 .. B-T10** — Sprint 6 snapshot/expectation hizalaması (AR-2 migration vb.)
- **B-T04** — Stopaj test (B-17 iç teyidine göre)
- **B-87** — Sprint 6 test coverage gap'leri
- K1/K3/K4 regression test (XSD sequence assertion) — denetim 06 raporunun
  güncellendiği doğrulansın

### Sprint 8 — Final Polish + Release
- **B-94** — `examples/output/` regenerate (Sprint 6 sonrası tüm örnekler güncel değil)
- **O5** — CarrierParty validateParty helper (Sprint 6'da O3/O4/O7 ile birlikte ele alınmadı)
- **O6** — PartyIdentification schemeID whitelist runtime
- **B-29, B-30, B-31** — Invoice satır validator genişlemesi (Sprint 5 deviri)
- **B-62..B-69** — Kontrol yapısı + error mapping refactor
- **B-78** — TEVKIFATIADE custom tip
- **B-83** — KAMU partyType mapping
- **B-84, B-85, B-86** — Tax schema + açık kodlar
- **B-91** — Satır KDV matematik doğrulama
- **B-104** — Error message consistency
- Mimsoft production fixture regresyon testi

---

## Test Dosya Dağılımı (Sprint 6 Sonu)

**Yeni dosyalar (5):**
- `__tests__/builders/despatch-extensions.test.ts` (Sprint 6.3-6.5) — 16 test
- `__tests__/validators/despatch-validators-o3o4o7.test.ts` (Sprint 6.6) — 10 test
- `__tests__/serializers/address-extensions.test.ts` (Sprint 6.7) — 8 test
- `__tests__/serializers/party-extensions.test.ts` (Sprint 6.7) — 7 test
- `__tests__/builders/invoice-extensions.test.ts` (Sprint 6.8) — 6 test

**Mevcut dosya migration:**
- `__tests__/builders/despatch-builder.test.ts` — Sprint 6.2'de AR-2 rename
  + çoklu DriverPerson test eklendi (4 yeni test)

Toplam yeni test: **51** (Sprint 5 sonu 503 → Sprint 6 sonu 554).

---

## Disiplin Notları

- **N1 (placeholder yasak):** Tüm yeni alanlar gerçek isim (DespatchTransportHandlingUnitInput, paymentCurrencyCode, taxExchangeRate vb.)
- **M7 pattern:** Config/enum tek source (enums.ts whitelist runtime)
- **xsd-sequence.ts pattern:** ADDRESS_SEQ korundu, PERSON_SEQ DriverPerson'da loop'ta kullanıldı
- **Alt-commit granülaritesi:** 8 atomik commit, her biri 1-2 saat
- **Structured ValidationError:** path + code + message + expected/actual
- **Breaking-change:** v3 dev bağlamda endişe yok — public API genişletildi, geri uyumlu

---

## Kullanıcı Direktifleri (Sprint 6 — 2026-04-23)

Bu sprint sırasında kullanıcı 3 özel direktif verdi (feedback memory'ye kaydedildi):

1. **Plan `audit/sprint-06-plan.md`'ye kopyalanır** (Sprint pattern'i — Sprint 6.1'de yapıldı)
2. **Invoice orderReference ön-grep** (Sprint 6.5): Invoice XSD tekil → rename yapılmadı
3. **country migration**: Structural change yok (flat ekleme) → `examples/` migration gereksiz
4. **B-48 runtime zorunluluk kuralı eklenmedi**: XSD opsiyonel alanlara keyfi "en az bir" eklenmez

---

## Sprint 6 Kapanış

Plan ve kullanıcı direktifleri tamamen uygulandı. FIX-PLANI-v3 §271-293 Sprint 6 kapsamı
(15 bulgu + 3 mimari karar) + Denetim 06 O3/O4/O7 ekleri dahil 18 bulgu çözüldü.

Test durumu: **554/554 yeşil** (34 dosya). TypeScript strict check temiz.
Regresyon yok — Sprint 1–5 davranışı korundu.
