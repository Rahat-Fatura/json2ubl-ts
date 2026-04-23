# Sprint 6 İmplementasyon Planı — Despatch Extensions + Party/Address Common

**Tarih:** 2026-04-23
**Tahmini Süre:** 3 gün (FIX-PLANI-v3 §271)
**Önceki Sprint:** Sprint 5 — Validator Kapsamı + TaxExemption Cross-Check (TAMAMLANDI 2026-04-22, commit `8b9537e`)
**Sonraki Sprint:** Sprint 7 — Test Güncellemeleri (1-2 gün)

---

## Context

Sprint 6, FIX-PLANI-v3 §271-293'e göre **Despatch Extensions** başlığı altında planlandı. Ancak kapsam sadece Despatch değil — FIX-PLANI-v3 atamasında Fatura/ortak 8 bulgu (B-36, B-37, B-38, B-39, B-71, B-74, B-98, B-100) de aynı sprint'e dahil. Bu bulgular Party/Address serializer'larını ve Invoice metadata emit yollarını etkiliyor.

**Problem:** Sprint 5 sonrasında Despatch cephesinde hâlâ açık olan **10 bulgu** (B-19, B-48, B-49, B-51, B-52, B-53, B-71 Despatch kısmı, B-72, B-73) ve Fatura/ortak cephede **8 bulgu** (B-36, B-37, B-38 teyit, B-39, B-71 Invoice kısmı, B-74, B-98, B-100) mevcut. UBL-TR §5.4 "Teslim Eden" kişi adı (DespatchContact/Name), XSD Despatch'te üç party tipi (BuyerCustomer/Seller/Originator 0..1 each), canonical DORSEPLAKA path, çoklu DriverPerson/OrderReference cardinality ihlali hâlâ emit edilemiyor ya da yanlış. Mimsoft/GİB üretim gönderiminde bazı senaryoları desteklememek v2.0.0 release kalitesi için yetersiz.

**Amaç:** FIX-PLANI-v3 Sprint 6 kapsamında listelenen 15 bulguyu + 3 mimari karar (M8, AR-2, AR-8) + denetim 06'dan çıkan seçili whitelist/validation iyileştirmelerini (O3, O4, O7) v3 disiplininde (breaking-change endişesiz) çözmek. Sprint sonunda her irsaliye/fatura senaryosu XSD+Schematron uyumlu XML üretebilmeli; public input API'si temiz (tekil-fallback yok, obsolete alan yok) olmalı.

**Sprint 6 doğası:**
- Ortak serializer genişletmesi (`party-serializer.ts`, `delivery-serializer.ts`) hem Fatura hem Despatch üzerinde etki eder — B-36/B-37/B-98/B-100 tek patch'le iki tarafı kapsar.
- Despatch-spesifik (B-19/B-48/B-49/B-51/B-52/B-53/B-72/B-73) ayrı dosyalarda izole kalır.
- Invoice-spesifik (B-39 OriginatorDocumentReference, B-71 TaxExchangeRate, B-74 PaymentCurrencyCode) ayrı alt commit'te tutulur.

---

## Netleştirme Soruları (KAPANDI — kullanıcı onayladı 2026-04-23)

AskUserQuestion ile 4 karar alındı:

**S1 — Kapsam: Hepsi Sprint 6 (FIX-PLANI-v3 ataması)** ✅
- 15 bulgu tek sprint'te: Despatch (B-19/48/49/51/52/53/72/73) + Party/Address common (B-36/37/98/100) + Invoice metadata (B-38/39/71/74)
- 8 alt commit, ~2-3 gün

**S2 — AR-2 cardinality: Opsiyonel 0..n** ✅
- `driverPersons?: DriverPersonInput[]` opsiyonel array
- Mevcut tekil `driverPerson?` semantiği korunur; CarrierParty-only senaryo bozulmaz
- Validator kuralı: `driverPersons?.length > 0 ∨ carrierParty`

**S3 — B-49 DORSEPLAKA API: İki bağımsız opsiyonel alan** ✅
- Mevcut `licensePlates?` korunur
- Yeni `transportHandlingUnits?: TransportHandlingUnitInput[]` eklenir
- Kullanıcı birini veya ikisini verebilir (Açık Soru #25b fallback hierarchy ile uyumlu)

**S4 — Denetim 06 O3/O4/O7: Hepsi Sprint 6'ya dahil** ✅
- **O3:** `DespatchProfileId`/`DespatchTypeCode` runtime whitelist
- **O4:** `DespatchLineInput.id` numeric regex
- **O7:** MATBUDAN → `DocumentType='MATBU'` cross-check
- O5 (CarrierParty validateParty), O6 (PartyId schemeID whitelist runtime) Sprint 8'e ertelendi

---

### Diğer Tespitler (AskUserQuestion kapsamı dışı, plan içine öneri olarak girdi)

**M8 sabit adlandırma (öneri uygulanacak):**
- Mevcut `UBL_CONSTANTS.customizationId = 'TR1.2'` yapısı korunur.
- FIX-PLANI-v3 §282'deki `UBL_CUSTOMIZATION_ID` top-level rename yapılmaz — gereksiz refactor.

**B-38 no-op teyidi (kod doğrulama):**
- `namespaces.ts:28` zaten `'TR1.2'`. Sprint 6.1 alt commit'te teyit + log.

**K1/K3/K4 (Denetim 06 eski durum) no-op teyidi:**
- K1 = B-18: `issueTime: string` zorunlu ✅ (Sprint 3'te uygulanmış — `despatch-input.ts:26` + `despatch-serializer.ts:44`)
- K3 = B-14: Delivery sırası DeliveryAddress → CarrierParty → Despatch ✅ (`despatch-serializer.ts:137-164`)
- K4 = B-20: PERSON_SEQ (FirstName, FamilyName, Title, NationalityID) ✅ (`despatch-serializer.ts:122-133`)
- Sprint 6.1'de log'a teyit notu; regression test Sprint 7'de eklenecek.

---

## 1. Mevcut Durum

### 1.1 Sprint 5 Kapanış Özeti
- Commit zinciri: `2448eb6` → `df4e6a0` → `fc16d37` → `8c63d6f` → `8b9537e`
- Kapsam: B-06, B-07, B-08, M5, Açık Soru #14 (CustomsDeclaration)
- Test artışı: 375 → 503 test (29 yeni dosya, +128 test)
- Devir: B-29/30/31, B-62..B-69, B-78, B-83, B-84/85/86, B-91, B-104 → Sprint 8

### 1.2 Sprint 6 Kapsamındaki Dosyalar

**Input Tipleri:**
- `src/types/despatch-input.ts` — 107 satır (DespatchInput, DespatchShipmentInput, DriverPersonInput, CarrierPartyInput, LicensePlateInput, DespatchLineInput, DespatchItemInput)
- `src/types/common.ts` — PartyInput, AddressInput, OrderReferenceInput, AdditionalDocumentInput
- `src/types/invoice-input.ts` — InvoiceInput (B-39, B-71, B-74 için genişletilecek)

**Serializer'lar:**
- `src/serializers/despatch-serializer.ts` — 172 satır (root + shipment)
- `src/serializers/party-serializer.ts` — (B-36, B-37 için genişletilecek)
- `src/serializers/delivery-serializer.ts` — serializeAddress (B-98, B-100 için genişletilecek)
- `src/serializers/reference-serializer.ts` — serializeOrderReference, serializeAdditionalDocument (B-39 için)
- `src/serializers/invoice-serializer.ts` — (B-39, B-71, B-74 emit yolu)
- `src/serializers/xsd-sequence.ts` — DESPATCH_SEQ, PERSON_SEQ, PARTY_SEQ (gerekirse revize)

**Validator'lar:**
- `src/validators/despatch-validators.ts` — 186 satır (O3/O4/O7 için genişletilecek)
- `src/validators/validate-base-document.ts` (varsa Despatch için extend)

**Config:**
- `src/config/namespaces.ts` — UBL_CONSTANTS.customizationId (B-38 teyit)

**Testler:**
- `__tests__/builders/despatch-builder.test.ts` — 16 test (yeni senaryo testleri eklenecek)
- `__tests__/serializers/despatch-serializer.test.ts` (varsa)
- `__tests__/validators/despatch-validators.test.ts` (varsa)
- Yeni: `__tests__/builders/despatch-extensions.test.ts` (B-19, B-48, B-49, B-51, B-52, B-53 kombinatorik)

### 1.3 Mevcut API Yüzeyi (Değişecek Noktalar)

```ts
// despatch-input.ts MEVCUT
interface DespatchInput {
  // ...
  orderReference?: OrderReferenceInput;     // B-53: array olacak
  // B-48: buyerCustomer/seller/originator YOK → eklenecek
  // B-52: lineCountNumeric otomatik hesaplanacak (emit only)
}

interface DespatchShipmentInput {
  // ...
  driverPerson?: DriverPersonInput;          // AR-2: driverPersons[] array olacak
  licensePlates?: LicensePlateInput[];        // B-49: transportHandlingUnits[] YENİ alan
  // B-72/B-73: shipmentId, goodsItem?.valueAmount YENİ alan
}

// PartyInput (common.ts) — B-36, B-37 için alt party PostalAddress/PartyTaxScheme/Contact
// AddressInput — B-98 BlockName/District/Postbox, B-100 Country/IdentificationCode
```

---

## 2. Hedef Durum

### 2.1 Genişletilmiş DespatchInput
```ts
interface DespatchInput {
  // ... mevcut zorunlu alanlar (değişmez)
  
  // B-53: çoklu OrderReference
  orderReferences?: OrderReferenceInput[];
  
  // B-48: üç party tipi (Açık Soru #25d cevabı — üçü de opsiyonel)
  buyerCustomer?: PartyInput;
  sellerSupplier?: PartyInput;
  originator?: PartyInput;
  
  // B-19: DespatchSupplierParty/DespatchContact/Name (Açık Soru #25a cevabı — opsiyonel)
  despatchContactName?: string;   // "Teslim Eden" kişi adı
  
  // B-52: LineCountNumeric — input.lines.length'ten otomatik emit (alan input'ta yok)
}

interface DespatchShipmentInput {
  // ... mevcut zorunlu alanlar
  
  // AR-2: çoklu driver (0..n, tekil kalkar)
  driverPersons?: DriverPersonInput[];
  
  // B-49: DORSEPLAKA canonical path (Seçenek A — bağımsız alan)
  transportHandlingUnits?: TransportHandlingUnitInput[];
  
  // B-72: Shipment ID override (hard-code "1" kalkar)
  shipmentId?: string;
  
  // B-73: GoodsItem.ValueAmount
  goodsItem?: {
    valueAmount?: { value: number; currencyId: string };
  };
}

// YENİ tip
interface TransportHandlingUnitInput {
  transportEquipmentId: string;      // cbc:ID (canonical DORSEPLAKA path)
  schemeId: 'DORSEPLAKA' | string;   // default DORSEPLAKA
}
```

### 2.2 Genişletilmiş Party/Address (common.ts)
```ts
interface PartyInput {
  // ... mevcut alanlar
  
  // B-36, B-37: alt party PostalAddress + PartyTaxScheme + Contact
  // (Mevcut PartyInput'a bu alanlar zaten varsa, no-op)
}

interface AddressInput {
  // ... mevcut alanlar
  
  // B-98
  blockName?: string;
  district?: string;
  postbox?: string;
  
  // B-100
  country?: {
    identificationCode?: string;   // ISO 3166-1 alpha-2
    name?: string;                  // Mevcut `country` string alanı burada yer alacak
  };
}
```

### 2.3 Genişletilmiş InvoiceInput (B-39, B-71, B-74)
```ts
interface InvoiceInput {
  // ... mevcut alanlar
  
  // B-39: OriginatorDocumentReference (komisyoncu/özel referans)
  originatorDocumentReferences?: DocumentReferenceInput[];
  
  // B-71: döviz kuru
  taxExchangeRate?: {
    sourceCurrencyCode: string;
    targetCurrencyCode: string;
    calculationRate: number;
    date?: string;
  };
  
  // B-74: ödeme dövizi
  paymentCurrencyCode?: string;
}
```

### 2.4 Validator Kapsaması
- **Despatch:** O3 (ProfileId/TypeCode whitelist runtime), O4 (lineId numeric regex), O7 (MATBUDAN + DocumentType='MATBU')
- Yeni alanlar için format kontrol: transportEquipmentId non-empty, despatchContactName length, orderReferences[i].id non-empty

---

## 3. Cross-Check / Normatif Kaynak Haritası

### 3.1 Schematron/XSD Referansları

| Bulgu | Normatif Kaynak | Rule/Element | Detay |
|-------|-----------------|--------------|-------|
| **B-19** | UBL-TR skill `e-irsaliye-ubl-tr-v1.2.md §5.4`, PDF v0.4 §2.3.16; canonical `Irsaliye-Ornek1.xml:111-113` | `cac:DespatchSupplierParty/cac:DespatchContact/cbc:Name` | "Teslim Eden" kişi adı yazılır |
| **B-48** | `UBL-DespatchAdvice-2.1.xsd:26-28`; skill `senaryo-temel-irsaliye-v0.3.md §4.3`; canonical `Irsaliye-Ornek3.xml` | `BuyerCustomerParty(0..1)`, `SellerSupplierParty(0..1)`, `OriginatorCustomerParty(0..1)` | Üç party XSD opsiyonel |
| **B-49** | `UBL-CommonAggregateComponents-2.1.xsd:2637,3106-3127`; skill §7; canonical `Irsaliye-Ornek1.xml:195-202` | `cac:Shipment/cac:TransportHandlingUnit/cac:TransportEquipment/cbc:ID[@schemeID="DORSEPLAKA"]` | Canonical path |
| **B-51** | `UBL-CommonAggregateComponents-2.1.xsd:2239` ShipmentStage; canonical `Irsaliye-Ornek1.xml` 2 DriverPerson | `cac:ShipmentStage/cac:DriverPerson` maxOccurs="unbounded" | Çoklu sürücü |
| **B-52** | `UBL-DespatchAdvice-2.1.xsd:20` | `cbc:LineCountNumeric(0..1)` | Otomatik `input.lines.length` |
| **B-53** | `UBL-DespatchAdvice-2.1.xsd:21` | `cac:OrderReference(0..n)` | Çoklu sipariş |
| **B-72** | Kullanıcı override | `cac:Shipment/cbc:ID` | Hard-code "1" kalkar |
| **B-73** | `UBL-CommonAggregateComponents-2.1.xsd` ShipmentType GoodsItem | `cac:GoodsItem/cbc:ValueAmount currencyID="TRY"` | Input alanı |
| **B-36** | `UBL-CommonAggregateComponents-2.1.xsd` PartyType | `cac:PostalAddress`, `cac:PartyTaxScheme`, `cac:Contact` | BuyerCustomerParty alt Party |
| **B-37** | Aynı XSD | PostalAddress, PartyName | TaxRepresentativeParty (Fatura) |
| **B-38** | Skill + D04 Açık Soru #23 | `cbc:CustomizationID='TR1.2'` | M8 tek sabit (kod doğrulama) |
| **B-39** | `UBL-Invoice-2.1.xsd` | `cac:OriginatorDocumentReference(0..n)` | Komisyoncu referansı |
| **B-71** | `UBL-Invoice-2.1.xsd` | `cac:TaxExchangeRate` | Döviz kuru |
| **B-74** | `UBL-Invoice-2.1.xsd` | `cbc:PaymentCurrencyCode` | Ödeme dövizi |
| **B-98** | `UBL-CommonBasicComponents-2.1.xsd` AddressType | `cbc:BlockName`, `cbc:District`, `cbc:Postbox` | Adres alt alanlar |
| **B-100** | `UBL-CommonAggregateComponents-2.1.xsd` CountryType | `cac:Country/cbc:IdentificationCode` + `cbc:Name` | ISO ülke kodu |
| **O3** | `UBL-TR_Codelist.xml:7,11` | `DespatchAdviceTypeCodeCheck`, `ProfileIDTypeDespatchAdvice` | Runtime whitelist |
| **O4** | `UBL-TR_Common_Schematron.xml:717-719` | `DespatchLineIdCheck` | `string(number()) != 'NaN'` |
| **O7** | `UBL-TR_Common_Schematron.xml:702-703` | `DespatchAdviceTypeCodeCheck` MATBUDAN branch | DocumentType='MATBU' |

### 3.2 No-Op Teyitler (Denetim 06 eski durum)
- **K1 = B-18**: `issueTime: string` zorunlu + `cbcRequiredTag` ✅ `despatch-input.ts:26` + `despatch-serializer.ts:44`
- **K3 = B-14**: Delivery sıra DeliveryAddress → CarrierParty → Despatch ✅ `despatch-serializer.ts:137-164`
- **K4 = B-20**: PERSON_SEQ (FirstName, FamilyName, Title, NationalityID) ✅ `despatch-serializer.ts:122-133`

---

## 4. Mimari Kararlar — Alt Görevler

### 4.1 M8 — CustomizationID Tek Sabit (B-38 teyit)
**Karar:** `UBL_CONSTANTS.customizationId = 'TR1.2'` — hem Invoice hem Despatch için aynı. Ayrı sabit eklenmez, rename yapılmaz.
**Eylem:**
- `namespaces.ts:28` değerinin `'TR1.2'` olduğunu doğrula (zaten böyle).
- Invoice ve Despatch serializer'larında CustomizationID emit yolunun bu sabiti kullandığını doğrula.
- Log: "B-38 M8 zaten uygulanmış; kod doğrulaması yapıldı."

### 4.2 AR-2 — `driverPerson` → `driverPersons[]` (B-51)
**Karar:** Agresif rename — fallback yok, tekil alan silinir. `driverPersons?: DriverPersonInput[]` opsiyonel array (0..n).
**Eylem:**
- `despatch-input.ts:56`: `driverPerson?: DriverPersonInput` → `driverPersons?: DriverPersonInput[]`
- `despatch-serializer.ts:123`: `if (s.driverPerson)` → `for (const dp of s.driverPersons ?? [])` loop
- `despatch-validators.ts`: "driverPerson ∨ carrierParty min 1" kuralını `driverPersons?.length > 0 ∨ carrierParty` olarak güncelle
- Test: mevcut `driverPerson` kullanımları `driverPersons: [{...}]` olarak migrate

### 4.3 AR-8 — Outstanding/Oversupply Temizliği (B-50 iptal)
**Karar:** `DespatchLineInput`'ta `outstandingQuantity`, `oversupplyQuantity`, `outstandingReason` alanları **varsa** silinsin.
**Eylem:**
- `despatch-input.ts:90-99` DespatchLineInput tip grep — bu alanlar yoksa no-op, varsa sil
- Log: "AR-8 Outstanding alanları tipte yoktu, no-op"
- Kullanıcı cevabı Açık Soru #25e: "işlem yapmayalım eklemeye gerek yok"

### 4.4 B-49 DORSEPLAKA Seçenek A (Öneri)
**Karar:** Mevcut `licensePlates?` alanı korunur; yeni `transportHandlingUnits?: TransportHandlingUnitInput[]` eklenir. İki path bağımsız emit edilir (kullanıcı ihtiyacına göre birini veya ikisini doldurur).
**Eylem:**
- `despatch-input.ts`: Yeni tip `TransportHandlingUnitInput { transportEquipmentId: string; schemeId?: string }`
- `despatch-input.ts:60`: Ekle `transportHandlingUnits?: TransportHandlingUnitInput[]`
- `despatch-serializer.ts`: Shipment bloğuna `<cac:TransportHandlingUnit>` emit yolu (ShipmentStage **dışında**, Shipment direkt child)
- XSD sequence: `ShipmentType` → `GoodsItem → ShipmentStage → Delivery → TransportHandlingUnit`; doğru konum doğrulanacak

### 4.5 B-52 Otomatik LineCountNumeric (Açık Soru #25c)
**Karar:** Input alanı yok; `input.lines.length` otomatik emit.
**Eylem:** `despatch-serializer.ts` → IssueTime ile DespatchAdviceTypeCode arasına `<cbc:LineCountNumeric>` (XSD satır 20 konumu: DespatchAdviceTypeCode'dan **önce**, XSD sırasını tekrar kontrol et).

---

## 5. Adım Adım İmplementasyon (Alt-Commit Granülaritesi)

Sprint 5 pattern'i: 6-8 alt commit, her commit belirli bulgu kümesi. Commit başlıkları `Sprint 6.X:` prefix'iyle.

### 5.1 — Plan + M8 teyit + AR-8 temizlik + no-op log (≈30 dk)
- Bu plan dosyasını `audit/sprint-06-plan.md` altına **kopyala** (Sprint pattern'i; kullanıcı direktifi 2026-04-23)
- `namespaces.ts` B-38 M8 kod doğrulama (zaten TR1.2 — log'a not)
- `despatch-input.ts` AR-8 Outstanding/Oversupply alan grep (yok → no-op)
- Commit: `Sprint 6.1: Plan + M8/B-38 teyit + AR-8 temizlik`

### 5.2 — AR-2 `driverPersons[]` migration (≈1.5 saat)
- `despatch-input.ts:56` tip değişimi
- `despatch-serializer.ts:123-133` loop'a dönüşüm, PERSON_SEQ her iterasyonda
- `despatch-validators.ts` kural güncellemesi
- Test migration: mevcut `driverPerson: {...}` → `driverPersons: [{...}]` tüm test dosyalarında
- Yeni test: 2 DriverPerson emit + validator "en az biri" kuralı
- Commit: `Sprint 6.2: AR-2 driverPersons[] array migration (B-51)`

### 5.3 — B-48 Despatch 3 party tipi + B-19 DespatchContact (≈2 saat)
- `despatch-input.ts`: `buyerCustomer?`, `sellerSupplier?`, `originator?`, `despatchContactName?` alanları
- `despatch-serializer.ts`: 
  - 15. DespatchSupplierParty bloğuna DespatchContact/Name emit (B-19)
  - 16. DeliveryCustomerParty sonrası BuyerCustomer, Seller, Originator emit (B-48)
  - XSD DESPATCH_SEQ konum: BuyerCustomer → SellerSupplier → Originator sırası
- Validator: yeni alanlar için format kontrol (PartyInput existing validator'lardan geçer)
- **Runtime zorunluluk kuralı EKLENMEZ** (kullanıcı direktifi 2026-04-23): XSD hepsini 0..1 opsiyonel tanımlıyor; Mimsoft iş akışında tipik olarak sadece `deliveryCustomer` kullanılır (zaten zorunlu, mevcut). Yeni 3 party özel senaryolar için — "en az bir party" gibi runtime kontrol eklenmez.
- Test: Despatch örneği 3 party + DespatchContact ile emit (snapshot-light)
- Commit: `Sprint 6.3: B-48 Despatch 3 party tipi + B-19 DespatchContact/Name`

### 5.4 — B-49 TransportHandlingUnit + B-72 shipmentId + B-73 GoodsItem/ValueAmount (≈2 saat)
- `despatch-input.ts`: `TransportHandlingUnitInput` yeni tip; `transportHandlingUnits?`, `shipmentId?`, `goodsItem?.valueAmount?` alanları
- `despatch-serializer.ts`:
  - `lines.push(\`${i2}${cbcOptionalTag('ID', '1')}\`)` → `input.shipment.shipmentId ?? ''` (B-72)
  - `<cac:GoodsItem>` bloğu: `valueAmount` varsa `<cbc:ValueAmount currencyID="TRY">` emit (B-73)
  - `<cac:TransportHandlingUnit>` emit yolu, Shipment bloğunda doğru sequence konumunda (B-49)
- Test: Canonical `Irsaliye-Ornek1.xml` DORSEPLAKA path kombinasyonu
- Commit: `Sprint 6.4: B-49 TransportHandlingUnit + B-72 shipmentId + B-73 GoodsItem ValueAmount`

### 5.5 — B-52 LineCountNumeric + B-53 OrderReference array (≈1 saat)
- **Ön-grep (kullanıcı direktifi 2026-04-23):** `grep -rn "orderReference" src/types/invoice-input.ts` — Invoice'da da varsa tutarlılık için aynı rename uygulanır (Sprint 6.5 kapsamına eklenir); yoksa Invoice'da dokunulmaz. Karar log'a düşülür.
- `despatch-serializer.ts`:
  - 11. Note sonrası `<cbc:LineCountNumeric>${input.lines.length}</...>` emit (B-52)
  - 12. OrderReference loop: `for (const ref of input.orderReferences ?? []) { serializeOrderReference(ref, ind) }` (B-53)
- `despatch-input.ts`: `orderReference?` → `orderReferences?: OrderReferenceInput[]` (AR-2 benzeri agresif rename)
- Test: LineCountNumeric her irsaliyede emit edilsin; 2 OrderReference kombinasyonu
- Commit: `Sprint 6.5: B-52 LineCountNumeric + B-53 OrderReference array`

### 5.6 — O3/O4/O7 Despatch validator iyileştirmeleri (≈1.5 saat)
- `despatch-validators.ts`:
  - **O3:** `DespatchProfileId`, `DespatchTypeCode` runtime `includes()` kontrolü (enum değerleri `enums.ts`'ten)
  - **O4:** `DespatchLineInput.id` numeric regex `/^\d+$/` (Schematron `string(number()) != 'NaN'` karşılığı)
  - **O7:** MATBUDAN → AdditionalDocumentReference'da `DocumentType === 'MATBU'` cross-check
- Test: her üç kural için happy path + violation path
- Commit: `Sprint 6.6: Denetim 06 O3/O4/O7 Despatch validator iyileştirmeleri`

### 5.7 — B-36/B-37 Party genişletme + B-98/B-100 Address (≈2 saat)
**Not:** B-36, B-37 `PartyInput` ve alt party tipleri için PostalAddress+PartyTaxScheme+Contact zaten mevcutsa (Sprint 3 M6 parent-child conditional sonrası), no-op teyidi. Var olmayan alt alanlar eklenir.
- `common.ts` AddressInput: `blockName?`, `district?`, `postbox?`, `country?: { identificationCode?; name? }` (B-98, B-100)
- **`country` migration (kullanıcı direktifi 2026-04-23):** Eski `country?: string` yapısı `country?: { identificationCode?; name? }` structural change'e dönüşüyor. Alt commit başında:
  - `grep -rn "country" src/` + kod içi kullanımları migrate et
  - `grep -rn "country:" examples/` — `examples/` klasöründe string kullanımı varsa obj yapısına çevir (TypeScript compile yeşil kalmalı)
  - `examples/output/` XML regenerate **bu sprint'te yapılmaz** (B-94 Sprint 8'e ertelendi); yalnızca TypeScript kaynağı migrate edilir
- `delivery-serializer.ts` serializeAddress: yeni alanlar XSD sırasında emit
- `party-serializer.ts` / alt party emit: BuyerCustomerParty, TaxRepresentativeParty (Fatura) için PostalAddress/PartyTaxScheme/Contact eksik kısımları tamamla
- Test: Address tam doldurulmuş snapshot + alt party minimum + maximum
- Commit: `Sprint 6.7: B-36/B-37 Party + B-98/B-100 Address genişletme`

### 5.8 — B-39/B-71/B-74 Invoice extension + implementation-log + Sprint 7 devir (≈2 saat)
- `invoice-input.ts`: `originatorDocumentReferences?`, `taxExchangeRate?`, `paymentCurrencyCode?`
- `invoice-serializer.ts`: XSD sequence'te uygun konumlara emit yolları
- Test: Invoice örneği her üç alan dolu + boş varyasyonları
- `audit/sprint-06-implementation-log.md` yaz:
  - Kapsanan 15 bulgu + 3 mimari karar + 3 denetim 06 ek (O3, O4, O7)
  - No-op teyitler (B-38, K1, K3, K4, AR-8)
  - Sprint 7 devir listesi (O5, O6; gerekirse B-94 examples regenerate Sprint 8'e)
  - Test sayısı güncelleme
- Commit: `Sprint 6.8: B-39/B-71/B-74 Invoice + implementation-log + Sprint 7 devir`

---

## 6. Cross-Reference (Grep Hedefleri)

Sprint 6'da güncelleme/tam inceleme gereken kod referansları:

```bash
# AR-2 driverPerson → driverPersons migration
grep -rn "driverPerson" src/ __tests__/ examples/

# B-38 M8 CustomizationID teyit
grep -rn "customizationId\|TR1.2\|CUSTOMIZATION" src/

# AR-8 Outstanding/Oversupply grep
grep -rn "outstanding\|oversupply" src/types/

# B-53 OrderReference migration
grep -rn "orderReference" src/ __tests__/

# B-19 DespatchContact
grep -rn "DespatchContact" src/ .claude/skills/

# B-49 TransportHandlingUnit canonical path
grep -rn "TransportHandlingUnit\|DORSEPLAKA" src/ .claude/skills/

# B-36/B-37 Party subparty
grep -rn "BuyerCustomerParty\|TaxRepresentativeParty\|DeliveryCustomerParty" src/serializers/

# PartyInput, AddressInput tip grep
grep -rn "interface PartyInput\|interface AddressInput" src/types/

# Example fixtures affected (B-94 Sprint 8'e ertelendi, sadece check)
find examples/ -name "*.ts" -o -name "*.xml" | head -20
```

---

## 7. Test Stratejisi

### 7.1 Yeni Test Dosyaları
- `__tests__/builders/despatch-extensions.test.ts` — B-19, B-48, B-49, B-51, B-52, B-53 kombinatorik
- `__tests__/validators/despatch-validators-o3o4o7.test.ts` — O3, O4, O7 whitelist/regex/cross-check
- `__tests__/serializers/address-extensions.test.ts` — B-98, B-100 Address yeni alanlar
- `__tests__/builders/invoice-extensions.test.ts` — B-39, B-71, B-74 Invoice yeni alanlar

### 7.2 Mevcut Test Migration
- `__tests__/builders/despatch-builder.test.ts`: tüm `driverPerson: {...}` → `driverPersons: [{...}]` rename
- Mevcut 16 test sayısı korunur, migration sonrası yeşil
- Snapshot testleri: Despatch çıktısı artık LineCountNumeric içerdiği için snapshot güncellenmeli (B-T01 Sprint 7'de hizalanacak)

### 7.3 Test Tipi Stratejisi (Sprint 5 pattern'i devam)
- **Kombinatorik test:** B-48 (8 kombinasyon: buyerCustomer var/yok × sellerSupplier var/yok × originator var/yok)
- **Snapshot-light:** B-19, B-49, B-52 için string includes kontrolleri
- **Schematron rule based:** O3 (enum whitelist), O4 (numeric regex), O7 (MATBUDAN+MATBU cross)
- **Negative test:** her yeni validator kural için happy + violation path

### 7.4 Beklenen Test Sayısı
- Sprint 5 sonu: 503 test
- Sprint 6 sonu hedef: 560-580 test (+60-80, tahminen)

### 7.5 `yarn test` Yeşil Disiplini
- Her alt commit öncesi `yarn test` çalıştır
- Her alt commit sonrası `yarn test` yeşil olmalı
- TypeScript strict check aktif kalır

---

## 8. Risk ve Edge Case

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| AR-2 `driverPerson` rename tüm test dosyalarında kullanımı grep'lenmediği için test failure | Orta | Orta | Alt commit 6.2'de tam grep + ripgrep migration, her dosya teker |
| B-48 Despatch DESPATCH_SEQ XSD konum hatası (Buyer/Seller/Originator sırası) | Orta | Yüksek | XSD Docling referansı + canonical örnek karşılaştırma |
| B-49 TransportHandlingUnit XSD konumu Shipment içinde yanlış kardinalite | Düşük | Yüksek | `UBL-CommonAggregateComponents-2.1.xsd` ShipmentType sequence incele |
| B-36/B-37 Party alt alanlar zaten eklenmiş olabilir (Sprint 3/4 M6) — duplicate iş | Yüksek | Düşük | Alt commit 6.7 başlarken tip kontrol, varsa no-op |
| B-98 `country?` string → `country?.name` structural change — Address consumer kod etkilenir | Orta | Orta | `country` string'i obj içine migrate + consumer grep |
| B-53 `orderReference` → `orderReferences` rename consumer kod etkiler | Orta | Orta | grep migration, alt commit 6.5'te tek koordineli change |
| B-39/B-71/B-74 Invoice XSD sequence konum hatası | Orta | Yüksek | Invoice XSD sequence (M6 pattern) konum kontrol |
| Sprint 7 test hizalamasının Sprint 6'ya dönmesi gerekebilir | Düşük | Orta | Sprint 6 kapanışta snapshot güncel, Sprint 7 sadece formal |

### 8.1 Edge Case Listesi
- Boş `driverPersons: []` — validator "en az biri" hatası bekler (mevcut kuralla uyumlu)
- `transportHandlingUnits: []` (boş array) — serializer hiçbir `<cac:TransportHandlingUnit>` emit etmez
- `orderReferences: []` — aynı şekilde boş emit
- `buyerCustomer` + `deliveryCustomer` çakışması — XSD iki ayrı eleman, çakışma yok. **Runtime "en az bir party zorunlu" kuralı eklenmez** (kullanıcı direktifi); `deliveryCustomer` zorunluluğu zaten mevcut, o yeterli.
- `country?: {identificationCode, name}` kısmi doldurma — sadece name veya sadece code
- Address'te `country` eski string olarak geçirilirse — type error; migration gerekli (Sprint 6.7 `examples/` ön-grep)

---

## 9. Kapsam Dışı (Sprint 7/8'e Devir)

### 9.1 Sprint 7 Kapsamına (Test Güncellemeleri, 1-2 gün)
- **B-T01 .. B-T10** — Sprint 6 sonunda snapshot/expectation değişiklikleri hizalaması
- **B-T04** (stopaj test) — B-17 iç teyidine göre güncelle veya koru
- **B-87** — Sprint 6 test coverage gap'leri (gerekirse)

### 9.2 Sprint 8 Kapsamına (Final Polish + Release)
- **B-94** — `examples/output` regenerate (Sprint 6 sonrası tüm örnek dosyalar güncel değil)
- **O5** — CarrierParty VKN/TCKN validateParty helper refactor (Sprint 6'da O3/O4/O7 ile karıştırmayalım)
- **O6** — PartyIdentification schemeID whitelist runtime (Set zaten var, sadece runtime use yok)
- **B-29, B-30, B-31** — Invoice satır validator genişlemesi
- **B-62..B-69** — Kontrol yapısı + error mapping refactor
- **B-78** — TEVKIFATIADE custom tip
- **B-83** — KAMU partyType mapping
- **B-84, B-85, B-86** — Tax schema + açık kodlar
- **B-91** — Satır KDV matematik doğrulama
- **B-104** — Error message consistency
- Mimsoft production fixture regresyon

### 9.3 İç Teyit Bekleyen (Sprint 6 Başında Kapanacak)
- ✅ **B-19** (DespatchContact) — Açık Soru #25a cevabı geldi: opsiyonel + uyarı
- ✅ **B-49** (DORSEPLAKA path) — Açık Soru #25b cevabı geldi: ikisi de (Seçenek A)
- ⚠️ Kullanıcıdan AR-2 cardinality + Seçenek A/B tercihi + O3/O4/O7 dahil teyidi (bu plan AskUserQuestion ile sorulacak)

---

## 10. Çıktı Listesi

### 10.1 Güncellenecek Dosyalar (tahmini 15-20)
- `src/types/despatch-input.ts` — AR-2 + B-48 + B-49 + B-52 + B-53 + B-72 + B-73
- `src/types/common.ts` — B-98 + B-100 (AddressInput)
- `src/types/invoice-input.ts` — B-39 + B-71 + B-74
- `src/serializers/despatch-serializer.ts` — tüm Despatch bulguları
- `src/serializers/party-serializer.ts` — B-36, B-37, B-19
- `src/serializers/delivery-serializer.ts` — B-98, B-100
- `src/serializers/invoice-serializer.ts` — B-39, B-71, B-74
- `src/serializers/reference-serializer.ts` — B-39 OriginatorDocumentReference
- `src/serializers/xsd-sequence.ts` — gerekirse DESPATCH_SEQ revize
- `src/validators/despatch-validators.ts` — O3 + O4 + O7
- `src/config/namespaces.ts` — (B-38 teyit, kod değişikliği yok)
- `__tests__/builders/despatch-builder.test.ts` — AR-2 migration + yeni test case'ler
- `audit/sprint-06-implementation-log.md` — yeni dosya

### 10.2 Yeni Dosyalar (tahmini 4)
- `__tests__/builders/despatch-extensions.test.ts`
- `__tests__/validators/despatch-validators-o3o4o7.test.ts`
- `__tests__/serializers/address-extensions.test.ts`
- `__tests__/builders/invoice-extensions.test.ts`

### 10.3 Yeni Tipler
- `TransportHandlingUnitInput` (despatch-input.ts)
- `DocumentReferenceInput` (eğer yoksa, reference-serializer'daki tip)
- `TaxExchangeRateInput` (invoice-input.ts veya common.ts)

### 10.4 Commit Listesi (8 commit)
1. Sprint 6.1: Plan + M8/B-38 teyit + AR-8 temizlik
2. Sprint 6.2: AR-2 driverPersons[] array migration (B-51)
3. Sprint 6.3: B-48 Despatch 3 party tipi + B-19 DespatchContact/Name
4. Sprint 6.4: B-49 TransportHandlingUnit + B-72 shipmentId + B-73 GoodsItem ValueAmount
5. Sprint 6.5: B-52 LineCountNumeric + B-53 OrderReference array
6. Sprint 6.6: Denetim 06 O3/O4/O7 Despatch validator iyileştirmeleri
7. Sprint 6.7: B-36/B-37 Party + B-98/B-100 Address genişletme
8. Sprint 6.8: B-39/B-71/B-74 Invoice + implementation-log + Sprint 7 devir

---

## 11. Tahmini Süre

| Alt Commit | Tahmini Süre | Açıklama |
|------------|--------------|----------|
| 6.1 | 30 dk | Plan + teyit + grep |
| 6.2 | 1.5 saat | AR-2 migration (grep, rename, test) |
| 6.3 | 2 saat | 3 party + DespatchContact + test |
| 6.4 | 2 saat | TransportHandlingUnit + ShipmentID + GoodsItem |
| 6.5 | 1 saat | LineCountNumeric + OrderReference |
| 6.6 | 1.5 saat | O3 + O4 + O7 validator |
| 6.7 | 2 saat | Party + Address genişletme |
| 6.8 | 2 saat | Invoice + log + devir |
| **TOPLAM** | **~12.5 saat** | **2 gün odaklı çalışma, buffer ile 3 gün** |

FIX-PLANI-v3 tahmin: 3 gün. Plan uyumlu.

---

## Disiplin Notları (Sprint 1-5 Devam)

- **N1:** Placeholder yasak — gerçek isim veya TODO (commit yorumlarında uygulanacak)
- **M7 pattern:** Config data source, türev (namespaces, enum değerleri)
- **Matrix/Map pattern:** Sprint 1/5 devam (profil-tip kombinasyonları — TAX_EXEMPTION_MATRIX örneği)
- **xsd-sequence.ts pattern:** Sprint 3 (PERSON_SEQ, DESPATCH_SEQ vs.)
- **Alt-commit granülaritesi:** Sprint 4/5 (atomik scope, 1-2 saat boyutunda commit)
- **Structured ValidationError:** Sprint 5 (field path + rule ID + message + value)
- **Breaking-change:** v3 dev bağlamda endişe yok (tüketici edocument-service paketle günceller)

---

## Sprint 6 Başlangıç Kontrol Listesi

- [x] FIX-PLANI-v3 Sprint 6 kapsamı okundu (§271-293)
- [x] Denetim 06 Despatch raporu incelendi (905 satır)
- [x] Sprint 5 implementation-log devir listesi kontrol (B-29..B-104 Sprint 8, Mimsoft Sprint 8)
- [x] Açık Sorular #25a-d cevapları uygulama hazır
- [x] B-19, B-49 Mimsoft iç teyidi Açık Sorular ile kapatıldı
- [x] AskUserQuestion ile 4 netleştirme sorusu onayı (S1/S2/S3/S4 — hepsi Recommended)
- [ ] Plan onayı (ExitPlanMode)

---
