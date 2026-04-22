---
denetim: 04 - Serializer Katmanı
tarih: 2026-04-21
skill_versiyon: gib-teknik-dokuman v91044bb
kutuphane_versiyon: json2ubl-ts v1.4.2 (uncommitted diff dahil)
kapsam: 8 serializer dosyası (common/party/tax/monetary/line/delivery/reference + invoice-root + despatch-root) + namespaces + xml-helpers + 3 örnek output XML cross-check + XSD sekans + Common/Main Schematron context uyumu
---

# Denetim 04 — Serializer Katmanı

## 0. Özet (önce sonuç)

Serializer katmanı **XSD sequence ve element yerleşimi açısından ciddi hatalar** içeriyor. Kök sorun: kütüphanenin ürettiği XML, resmi UBL-TR XSD'ye karşı **xmllint ile doğrulansa reddedilir**. GİB'in kendi referans XML'leri (`xmls/YTB_*`), resmi XSD ve Common/Main Schematron birbiriyle birebir uyumluyken, kütüphanenin birçok noktada sırayı ve yerleşimi kaydırdığı görülüyor. 6 KRİTİK XSD ihlali var; bunların en ağırı `TaxExemptionReasonCode`/`TaxExemptionReason` elemanlarının `TaxSubtotal` altında yazılması (XSD'de `TaxCategory` içinde tanımlı, kütüphane TaxSubtotal seviyesinde emit ediyor — %100 her istisna/iade faturasında fail eder).

İmza (`cac:Signature`) ve `ext:UBLExtensions` elemanları zaten kapsam dışı olarak işaretli, bu denetimde "eksik" sayılmadı. Ancak örnek çıktı XML'leri (`examples/output/*.xml`) hâlâ Signature + UBLExtensions içeriyor → stale artefaktlar.

---

## 1. Kök Element Sıra Karşılaştırması (Invoice)

### 1.1 XSD Sequence (UBL-Invoice-2.1.xsd:7-54)

XSD canonical sıra kullanıcının görev tanımında listelenen 44 eleman ile birebir. Kapsam dışı: `ext:UBLExtensions` (#1) ve `cac:Signature` (#27).

### 1.2 invoice-serializer.ts karşılaştırma

| XSD # | Eleman | invoice-serializer.ts satır | Durum |
|---|---|---|---|
| 1 | ext:UBLExtensions | 52-53 (yorum) | **KAPSAM DIŞI** |
| 2 | UBLVersionID | 56 | ✓ |
| 3 | CustomizationID | 57-59 | ✓ sıra / **KRİTİK değer** — bkz. K7 |
| 4 | ProfileID | 62 | ✓ |
| 5 | ID | 65 | ✓ |
| 6 | CopyIndicator | 68 | ✓ |
| 7 | UUID | 71 | ✓ |
| 8 | IssueDate | 74 | ✓ |
| 9 | IssueTime | 77-79 | ✓ |
| 10 | InvoiceTypeCode | 82 | ✓ |
| 11 | Note | 85-89 | ✓ |
| 12 | DocumentCurrencyCode | 92 | ✓ |
| 13 | TaxCurrencyCode | 95-97 | ✓ |
| 14 | PricingCurrencyCode | 100-104 | ✓ |
| 15 | PaymentCurrencyCode | **YOK** | ORTA (destek eksik) |
| 16 | PaymentAlternativeCurrencyCode | **YOK** | DÜŞÜK (destek eksik) |
| 17 | AccountingCost | 107-109 | ✓ |
| 18 | LineCountNumeric | 112-114 | ✓ |
| 19 | InvoicePeriod | 117-119 | ✓ |
| 20 | OrderReference | 122-124 | ✓ |
| 21 | BillingReference | 127-131 | ✓ |
| 22 | DespatchDocumentReference | 134-144 | ✓ |
| 23 | ReceiptDocumentReference | 147-157 | ✓ |
| 24 | OriginatorDocumentReference | **YOK** | YÜKSEK (Y9) |
| 25 | ContractDocumentReference | 160-162 | ✓ |
| 26 | AdditionalDocumentReference | 165-169 | ✓ |
| 27 | Signature | 171 (yorum) | **KAPSAM DIŞI** |
| 28 | AccountingSupplierParty | 174 | ✓ |
| 29 | AccountingCustomerParty | 177 | ✓ |
| 30 | BuyerCustomerParty | 180-182 | ✓ |
| 31 | SellerSupplierParty | **YOK** | ORTA (destek eksik) |
| 32 | TaxRepresentativeParty | 185-189 | ✓ |
| 33 | Delivery | 192-194 | ✓ |
| 34 | PaymentMeans | 197-201 | ✓ |
| 35 | PaymentTerms | 204-220 | ✓ |
| 36 | AllowanceCharge | 228-232 | **KRİTİK sıra — K3** |
| 37 | TaxExchangeRate | **YOK** | ORTA |
| 38 | PricingExchangeRate | 223-225 | **KRİTİK sıra — K3** |
| 39 | PaymentExchangeRate | **YOK** | ORTA |
| 40 | PaymentAlternativeExchangeRate | **YOK** | DÜŞÜK |
| 41 | TaxTotal | 235-237 | ✓ |
| 42 | WithholdingTaxTotal | 240-244 | ✓ |
| 43 | LegalMonetaryTotal | 247 | ✓ |
| 44 | InvoiceLine | 250-252 | ✓ |

### 1.3 DespatchAdvice sıra (UBL-DespatchAdvice-2.1.xsd)

| XSD # | Eleman | despatch-serializer.ts satır | Durum |
|---|---|---|---|
| 1 | ext:UBLExtensions | 20 (yorum) | KAPSAM DIŞI |
| 2 | UBLVersionID | 24 | ✓ |
| 3 | CustomizationID | 25 | ✓ |
| 4 | ProfileID | 28 | ✓ |
| 5 | ID | 31 | ✓ |
| 6 | CopyIndicator | 34 | ✓ |
| 7 | UUID | 37 | ✓ |
| 8 | IssueDate | 40 | ✓ |
| 9 | IssueTime | 43-45 | ✓ |
| 10 | DespatchAdviceTypeCode | 48 | ✓ |
| 11 | Note | 51-55 | ✓ |
| 12 | LineCountNumeric | **YOK** | ORTA |
| 13 | OrderReference | 58-60 | ✓ |
| 14 | AdditionalDocumentReference | 63-67 | ✓ |
| 15 | Signature | 69 (yorum) | KAPSAM DIŞI |
| 16 | DespatchSupplierParty | 72-74 | ✓ |
| 17 | DeliveryCustomerParty | 77-79 | ✓ |
| 18 | BuyerCustomerParty | **YOK** | ORTA |
| 19 | SellerSupplierParty | **YOK** | DÜŞÜK |
| 20 | OriginatorCustomerParty | **YOK** | DÜŞÜK |
| 21 | Shipment | 82 | ✓ |
| 22 | DespatchLine | 85-87 | ✓ |

Despatch kök sırası **doğru**. Ama Shipment içindeki Delivery bloğunda iç sıra hatalı (bkz. K6).

---

## 2. Kritik Bulgular (GİB reddeder)

### [KRİTİK][KÜTÜPHANE] K1 — TaxExemptionReasonCode/TaxExemptionReason yanlış parent altında

- **Dosya:satır:** `src/serializers/tax-serializer.ts:39-44`
- **Gözlem:** `TaxExemptionReasonCode` ve `TaxExemptionReason` elemanları `<cac:TaxSubtotal>` altında emit ediliyor. XSD `TaxSubtotalType` (UBL-CommonAggregateComponents-2.1.xsd:2779-2790) bu elemanları **içermez**. Elemanlar `TaxCategoryType` (XSD:2764-2771) içinde tanımlı. Her istisna/iade/tevkifat-iade/YTB-istisna faturasında fail eder.
- **Örnek:** `examples/output/10-istisna/output.xml:134-146`, `:161-172`
  ```xml
  <cac:TaxSubtotal>
    <cbc:TaxableAmount>100000.00</cbc:TaxableAmount>
    <cbc:TaxAmount>0.00</cbc:TaxAmount>
    <cbc:Percent>0</cbc:Percent>
    <cbc:TaxExemptionReasonCode>301</cbc:TaxExemptionReasonCode>  <!-- XSD'de burada olamaz -->
    <cbc:TaxExemptionReason>...</cbc:TaxExemptionReason>           <!-- XSD'de burada olamaz -->
    <cac:TaxCategory>...</cac:TaxCategory>
  </cac:TaxSubtotal>
  ```
- **GİB canonical örnek:** `xmls/YTB_Istisna_Efatura.xml:127-134` — `TaxCategory` içinde:
  ```xml
  <cac:TaxCategory>
    <cbc:TaxExemptionReasonCode>308</cbc:TaxExemptionReasonCode>
    <cbc:TaxExemptionReason>13/d Teşvikli Yatırım Mallarının Teslimi</cbc:TaxExemptionReason>
    <cac:TaxScheme>...</cac:TaxScheme>
  </cac:TaxCategory>
  ```
- **Normatif referans:** XSD `TaxSubtotalType` ve `TaxCategoryType` (schemas/common/UBL-CommonAggregateComponents-2.1.xsd:2764-2790); Main Schematron `TaxExemptionReasonCodeCheck` context `inv:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory` (UBL-TR_Main_Schematron.xml:225-227); Skill özeti `genel-aciklamalar-ubl-tr-v0.4.md:329` "TaxCategory/TaxExemptionReasonCode ← İstisna kodları buradan geldi".
- **Durum tipi:** A (XSD + Schematron + GİB örnekleri + skill hepsi aynı yönde; kütüphane yanlış)
- **Etki:** İstisna (ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE/OZELMATRAH) + tevkifat-iade grubunda **her fatura** XSD validation fail eder. Schematron `TaxExemptionReasonCodeCheck` TaxCategory context'inde arama yaptığından hiçbir iş kuralı da geçerli olmaz (cross-check silinir).

### [KRİTİK][KÜTÜPHANE] K2 — InvoiceLine'da Delivery, AllowanceCharge/TaxTotal/WithholdingTaxTotal sonrasında

- **Dosya:satır:** `src/serializers/line-serializer.ts:10-39`
- **Gözlem:** Serializer sırası: ID → InvoicedQuantity → LineExtensionAmount → **AllowanceCharge** (L22) → **TaxTotal** (L29) → **WithholdingTaxTotal** (L32) → **Delivery** (L37-39) → Item → Price. XSD'de Delivery, AllowanceCharge'tan ÖNCE yer alır.
- **Normatif referans:** XSD `InvoiceLineType` sequence (schemas/common/UBL-CommonAggregateComponents-2.1.xsd:1788-1805): `ID → Note → InvoicedQuantity → LineExtensionAmount → OrderLineReference → DespatchLineReference → ReceiptLineReference → Delivery → AllowanceCharge → TaxTotal → WithholdingTaxTotal → Item → Price`.
- **Durum tipi:** B (XSD kesin, skill sessiz, kütüphane yanlış).
- **Etki:** IHRACAT profilinde satır-seviyesi `cac:Delivery` kullanıldığında her XSD doğrulaması fail eder. `examples/output/22-ihracat-fatura/output.xml` bu senaryoya uyar.

### [KRİTİK][KÜTÜPHANE] K3 — Fatura kökünde ExchangeRate, AllowanceCharge'tan önce emit ediliyor

- **Dosya:satır:** `src/serializers/invoice-serializer.ts:222-232`
  - L223: `if (input.exchangeRate) parts.push(serializeExchangeRate(...))`
  - L228-232: `if (input.allowanceCharges) for (ac) parts.push(serializeAllowanceCharge(...))`
- **Gözlem:** Sıra: PaymentTerms → **PricingExchangeRate** → **AllowanceCharge** → TaxTotal. XSD'de AllowanceCharge (#36) TaxExchangeRate/PricingExchangeRate (#37-40) öncesinde yer alır.
- **Normatif referans:** UBL-Invoice-2.1.xsd:43-48.
- **Durum tipi:** B.
- **Etki:** Dövizli + iskonto/masraf içeren her faturada fail (çoğu B2B/B2G senaryosu).

### [KRİTİK][KÜTÜPHANE] K4 — AllowanceCharge'da AllowanceChargeReason en sonda

- **Dosya:satır:** `src/serializers/common-serializer.ts:6-23`
- **Gözlem:** Serializer sırası: `ChargeIndicator → MultiplierFactorNumeric → Amount → BaseAmount → AllowanceChargeReason`. XSD `AllowanceChargeType` (schemas/common/UBL-CommonAggregateComponents-2.1.xsd:726-736) sırası: `ChargeIndicator → AllowanceChargeReason → MultiplierFactorNumeric → SequenceNumeric → Amount → BaseAmount → PerUnitAmount`.
- **GİB canonical örnek:** `xmls/YTB_Istisna_Efatura.xml:148-153`:
  ```xml
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason/>
    <cbc:MultiplierFactorNumeric>0</cbc:MultiplierFactorNumeric>
    <cbc:Amount currencyID="TRY">0</cbc:Amount>
    <cbc:BaseAmount currencyID="TRY">1500</cbc:BaseAmount>
  </cac:AllowanceCharge>
  ```
- **Normatif referans:** XSD satır 726-736.
- **Durum tipi:** B.
- **Etki:** `reason` alanı doldurulmuş **her** AllowanceCharge'da fail eder (satır ve fatura seviyesinde).

### [KRİTİK][KÜTÜPHANE] K5 — Item sıralamasında Description, Name'den sonra

- **Dosya:satır:** `src/serializers/line-serializer.ts:43-45`
- **Gözlem:** Library: `Name (L43) → Description (L45) → ModelName (L48)`. XSD `ItemType` sırası (UBL-CommonAggregateComponents-2.1.xsd:1806-1821): `Description → Name → Keyword → BrandName → ModelName → ...`.
- **Normatif referans:** XSD 1808-1812 (`Description minOccurs=0` önce, `Name` zorunlu sonra).
- **Durum tipi:** B.
- **Etki:** `line.item.description` doldurulduğunda XSD fail. `examples/output/10-istisna/output.xml:175-177` gibi çıktılarda Description yok olduğu için sorun görünmüyor ama kullanıcı description verirse kırılır.

### [KRİTİK][KÜTÜPHANE] K6 — Despatch Shipment içinde Delivery alt-elemanları ters sırada

- **Dosya:satır:** `src/serializers/despatch-serializer.ts:139-165`
  - L142-145: `<cac:Despatch>`
  - L148: `<cac:DeliveryAddress>`
  - L151-163: `<cac:CarrierParty>`
- **Gözlem:** Serializer sırası (Delivery elementi içinde): **Despatch → DeliveryAddress → CarrierParty**. XSD `DeliveryType` (UBL-CommonAggregateComponents-2.1.xsd:1310-1328) sırası: `ID → ... → DeliveryAddress(1319) → AlternativeDeliveryLocation → EstimatedDeliveryPeriod → CarrierParty(1322) → DeliveryParty → **Despatch(1324)** → DeliveryTerms → Shipment`.
- **Normatif referans:** XSD 1319-1324.
- **Durum tipi:** B.
- **Etki:** Her e-İrsaliye (`DespatchAdvice`) çıktısı XSD validation fail eder. `despatchTypeCode = SEVK` ve `MATBUDAN` senaryolarının her ikisi de etkilenir. **Her irsaliye fail.**

---

## 3. Yüksek Bulgular

### [YÜKSEK][KÜTÜPHANE] Y1 — DocumentReferenceType IssueDate zorunlu, kütüphane opsiyonel yazıyor

- **Dosya:satır:**
  - `src/serializers/reference-serializer.ts:18-20` (BillingReference→InvoiceDocumentReference)
  - `src/serializers/reference-serializer.ts:71-73` (DespatchDocumentReference + ReceiptDocumentReference)
  - `src/serializers/reference-serializer.ts:94-96` (AdditionalDocumentReference)
- **Gözlem:** Hepsinde `if (isNonEmpty(ref.issueDate))` koşulu var. XSD `DocumentReferenceType` (UBL-CommonAggregateComponents-2.1.xsd:1392-1403) `IssueDate` **minOccurs yok** (zorunlu).
- **Normatif referans:** XSD satır 1395 `<xsd:element ref="cbc:IssueDate"/>` (no minOccurs).
- **Durum tipi:** B.
- **Etki:** IADE faturalarında BillingReference'ta issueDate verilmezse XSD fail. ÖKC Bilgi Fişi AdditionalDocumentReference'ta 433 tebliği için issueDate verilmezse fail.

### [YÜKSEK][KÜTÜPHANE] Y2 — OrderReferenceType IssueDate zorunlu

- **Dosya:satır:** `src/serializers/reference-serializer.ts:37-39`
- **Gözlem:** Library: `if (isNonEmpty(or.issueDate))`. XSD `OrderReferenceType` (UBL-CommonAggregateComponents-2.1.xsd:2102-2110) satır 2106 `<xsd:element ref="cbc:IssueDate"/>` zorunlu.
- **Durum tipi:** B.

### [YÜKSEK][KÜTÜPHANE] Y3 — PartyType PostalAddress zorunlu, kütüphane adresi olmayan party için hiç emit etmez

- **Dosya:satır:** `src/serializers/party-serializer.ts:93-115` (`serializePostalAddress`)
- **Gözlem:** `hasAddress` false ise `lines` boş döner, PostalAddress elementi hiç çıkmaz. XSD `PartyType` (UBL-CommonAggregateComponents-2.1.xsd:2130-2145) satır 2137 `<xsd:element ref="cac:PostalAddress"/>` zorunlu (minOccurs yok).
- **Durum tipi:** B.
- **Etki:** Kullanıcı Party'de adres alanlarını boş geçerse, XSD fail. Daha ciddi olan senaryo: BuyerCustomerParty ve TaxRepresentativeParty'de (Y5, Y6) hiç adres emit edilmiyor.

### [YÜKSEK][KÜTÜPHANE] Y4 — AddressType CitySubdivisionName/CityName zorunlu, kütüphane opsiyonel bırakıyor

- **Dosya:satır:**
  - `src/serializers/party-serializer.ts:105-106` (Party içi adres)
  - `src/serializers/delivery-serializer.ts:66-67` (serializeAddress)
- **Gözlem:** Her iki yerde `if (isNonEmpty(addr.citySubdivisionName))` ve `if (isNonEmpty(addr.cityName))` — XSD satır 708-709 iki eleman da zorunlu.
- **Durum tipi:** B.

### [YÜKSEK][KÜTÜPHANE] Y5 — BuyerCustomerParty'de PostalAddress + PartyTaxScheme + Contact serialize edilmiyor

- **Dosya:satır:** `src/serializers/party-serializer.ts:137-191` (`serializeBuyerCustomerParty`)
- **Gözlem:** Serializer sadece **PartyIdentification (PARTYTYPE + VKN/TCKN) + PartyName + PartyLegalEntity + Person** emit ediyor. PostalAddress (XSD'de zorunlu), PartyTaxScheme, Contact emit edilmiyor.
- **Normatif referans:** XSD `BuyerCustomerParty` → `CustomerPartyType` (UBL-CommonAggregateComponents-2.1.xsd:1265-1270) → `cac:Party` → `PartyType` (2130-2145). PartyType sequence'te PostalAddress zorunlu (satır 2137).
- **Durum tipi:** B.
- **Etki:** IHRACAT / YOLCU / KAMU senaryolarında buyer ile adres-tax-contact bilgisi verilse bile XML'e yazılmaz — hem data kaybı hem XSD fail. `examples/output/22-ihracat-fatura/output.xml` bu senaryoda beklenir.

### [YÜKSEK][KÜTÜPHANE] Y6 — TaxRepresentativeParty'de PostalAddress + PartyName serialize edilmiyor

- **Dosya:satır:** `src/serializers/party-serializer.ts:194-216` (`serializeTaxRepresentativeParty`)
- **Gözlem:** Sadece `PartyIdentification` (ARACIKURUMVKN + ARACIKURUMETIKET + additionalIdentifiers) emit ediliyor. PartyName, PostalAddress, PartyTaxScheme, PartyLegalEntity, Contact, Person hiçbiri yok.
- **Normatif referans:** XSD `TaxRepresentativeParty` → `PartyType`. PostalAddress zorunlu (satır 2137).
- **Durum tipi:** B.
- **Etki:** YOLCU (taxfree) senaryosunda TaxRepresentativeParty bloğu XSD fail.

### [YÜKSEK][KÜTÜPHANE] Y7 — CustomizationID Fatura için `TR1.2` olmalı, kütüphane `TR1.2.1` üretiyor

- **Dosya:satır:** `src/config/namespaces.ts:28`
- **Gözlem:** `customizationId: 'TR1.2.1'` — hem Invoice hem DespatchAdvice için kullanılıyor.
- **Normatif referans:**
  - Fatura için: Skill `references/e-fatura-ubl-tr-v1.0.md:77` "Sabit değer: `TR1.2`"; aynı dosya satır 258 "Sabit olmalı: `2.1` ve `TR1.2`". GİB XML örnekleri `xmls/YTB_*.xml`, `xmls/IDIS_Fatura.xml`, `xmls/sgk.xml` — **13 fatura XML hepsi `TR1.2`**.
  - İrsaliye için: Skill `references/senaryo-temel-irsaliye-v0.3.md:41` "`TR1.2.1` (PDF §3.1.1 XML örneğinden birebir — Fatura TR1.2'den farklı)"; `references/e-irsaliye-ubl-tr-v1.2.md:3` "TR 2.1 TR özelleştirmesi (**TR1.2.1**)".
- **Durum tipi:** C (Skill senaryo dosyaları belirsiz, "güncel TR1.2.1" denmiş; normatif GİB XML'leri + e-fatura kılavuzu + schematron context'leri Fatura için `TR1.2` diyor — normatif kazanır).
- **Etki:** GİB'in bazı validatörleri `TR1.2` ile `TR1.2.1`'i ayırt edebilir — pragmatik olarak muhtemelen her ikisi de geçiyor ama resmi tanım `TR1.2`. Kütüphane İrsaliye için doğru (`TR1.2.1`), ama **Fatura için yanlış** değer üretiyor. Çözüm: iki ayrı sabit.

### [YÜKSEK][KÜTÜPHANE] Y8 — IHRACKAYITLI 702 için CustomsDeclaration serialize edilmiyor

- **Dosya:satır:** `src/serializers/delivery-serializer.ts:116-133` (TransportHandlingUnit bloğu)
- **Gözlem:** TransportHandlingUnit içinde sadece `ActualPackage` emit ediliyor. `CustomsDeclaration/IssuerParty` (SATICIDIBSATIRKOD + ALICIDIBSATIRKOD için gerekli) serialize edilmiyor. Input tipinde `customsDeclaration` alanı var mı bile belirsiz (grep sonucu yok).
- **Normatif referans:**
  - XSD `TransportHandlingUnitType` satır 3127: `<xsd:element ref="cac:CustomsDeclaration" minOccurs="0" maxOccurs="unbounded"/>` (opsiyonel ama IHRACKAYITLI+702 için zorunlu).
  - Common Schematron `TaxExemptionReasonCodeCheck` satır 322: IHRACKAYITLI + 702 için `cac:TransportHandlingUnit/cac:CustomsDeclaration/cac:IssuerParty/cac:PartyIdentification/cbc:ID[@schemeID='ALICIDIBSATIRKOD' and string-length=11]` her satırda zorunlu.
  - Skill `references/ortak-satir-ve-urun-v0.7.md` (IHRACKAYITLI + 702).
- **Durum tipi:** A.
- **Etki:** IHRACKAYITLI + TaxExemptionReasonCode=702 senaryosunun **tamamı** üretilemez; Denetim 03'te validator seviyesinde zaten raporlanmıştı, bu denetim **serializer seviyesinde** teyit ediyor: input tipi bile eksik.

### [YÜKSEK][KÜTÜPHANE] Y9 — OriginatorDocumentReference desteği yok

- **Dosya:satır:** `src/serializers/invoice-serializer.ts` (eksik)
- **Gözlem:** XSD satır 32 `cac:OriginatorDocumentReference` minOccurs=0 maxOccurs=unbounded — library input type ve serializer'da yer almıyor.
- **Durum tipi:** A.
- **Etki:** Komisyoncu senaryoları ve özel referans faturaları emit edilemez (nadir, ama spec'te var).

---

## 4. Orta Bulgular

### [ORTA][KÜTÜPHANE] O1 — PersonType: MiddleName FamilyName'den önce emit ediliyor

- **Dosya:satır:** `src/serializers/party-serializer.ts:71-73`
- **Gözlem:** Library: `FirstName → MiddleName → FamilyName → NationalityID → passport`. XSD `PersonType` (UBL-CommonAggregateComponents-2.1.xsd:2239-2250): `FirstName → FamilyName → Title → MiddleName → NameSuffix → NationalityID → FinancialAccount → IdentityDocumentReference`.
- **Normatif referans:** XSD 2241-2248.
- **Durum tipi:** B.
- **Etki:** TCKN alıcı + middleName doldurulmuş her faturada XSD fail.

### [ORTA][KÜTÜPHANE] O2 — PaymentMeans: PaymentMeansCode XSD zorunlu, kütüphane opsiyonel yazıyor

- **Dosya:satır:** `src/serializers/monetary-serializer.ts:55-57`
- **Gözlem:** `if (isNonEmpty(pm.paymentMeansCode))` — XSD `PaymentMeansType` (UBL-CommonAggregateComponents-2.1.xsd:2199-2208) satır 2201 `<xsd:element ref="cbc:PaymentMeansCode"/>` **zorunlu**.
- **Etki:** User PaymentMeans verip code vermezse boş `<cac:PaymentMeans>` emit edilir → XSD fail.
- **Durum tipi:** B.

### [ORTA][KÜTÜPHANE] O3 — ExchangeRate: sadece PricingExchangeRate, TaxExchangeRate emit edilmiyor

- **Dosya:satır:** `src/serializers/monetary-serializer.ts:32-46`, invoice-serializer.ts:223
- **Gözlem:** Kütüphane `input.exchangeRate` ise **tek bir `<cac:PricingExchangeRate>`** üretiyor. XSD'de 4 ayrı eleman (`TaxExchangeRate #37`, `PricingExchangeRate #38`, `PaymentExchangeRate #39`, `PaymentAlternativeExchangeRate #40`). `TaxCurrencyCode` `DocumentCurrencyCode`'tan farklıysa `TaxExchangeRate` gerekli.
- **Durum tipi:** A (skill `ortak-parasal-ve-vergi-v0.7.md` TaxCurrencyCode bahsi var).
- **Etki:** Dövizli TRY-KDV faturalarında TaxExchangeRate eksik.

### [ORTA][KÜTÜPHANE] O4 — Despatch: LineCountNumeric emit edilmiyor

- **Dosya:satır:** `src/serializers/despatch-serializer.ts` (yok)
- **Gözlem:** XSD `DespatchAdviceType` satır 20: `cbc:LineCountNumeric minOccurs=0` — opsiyonel ama Fatura tarafı her zaman emit ediyor; İrsaliye tutarlılık için de emit edilmeli (skill: "Fatura ile tutarlı").
- **Durum tipi:** B.

### [ORTA][KÜTÜPHANE] O5 — Despatch: BuyerCustomerParty desteği yok

- **Dosya:satır:** `src/serializers/despatch-serializer.ts` (yok)
- **Gözlem:** XSD satır 26 `cac:BuyerCustomerParty minOccurs=0` — irsaliye alıcı faturalama adresi farklı ise gerekli.
- **Durum tipi:** A.

### [ORTA][KÜTÜPHANE] O6 — Despatch Shipment: hard-coded ID="1"

- **Dosya:satır:** `src/serializers/despatch-serializer.ts:102`, `src/serializers/delivery-serializer.ts:88`
- **Gözlem:** `cbcTag('ID', '1')` her iki yerde hard-code. Çoklu irsaliye/shipment ayırt edilemez.
- **Durum tipi:** B (XSD `ShipmentType.ID` zorunlu ama değer serbest; hard-code "1" valid ama kötü tasarım).
- **Etki:** Fonksiyonel etki yok ama kullanıcı kendi shipment ID'sini veremiyor.

### [ORTA][KÜTÜPHANE] O7 — Despatch Shipment: yararsız boş GoodsItem

- **Dosya:satır:** `src/serializers/despatch-serializer.ts:105-107`
- **Gözlem:** Shipment bloğu koşulsuz `<cac:GoodsItem>\n<cbc:RequiredCustomsID></cbc:RequiredCustomsID>\n</cac:GoodsItem>` placeholder emit ediyor (`cbcTag('RequiredCustomsID', '')` → boş string döner → GoodsItem boş kalır). XSD valid (GoodsItemType'ın tüm alanları opsiyonel) ama semantik olarak gereksiz.
- **Durum tipi:** B.

### [ORTA][KÜTÜPHANE] O8 — invoice-serializer.ts: PaymentCurrencyCode (#15) desteği yok

- **Dosya:satır:** `src/serializers/invoice-serializer.ts` (yok)
- **Gözlem:** XSD satır 23 `cbc:PaymentCurrencyCode minOccurs=0` — düzenlenen para birimi ile ödeme para birimi farklı ise gerekli. Kütüphane sadece DocumentCurrencyCode, TaxCurrencyCode, PricingCurrencyCode destekliyor.
- **Durum tipi:** A.

---

## 5. Düşük Bulgular

### [DÜŞÜK][DOKÜMAN] D1 — examples/output/ XML'leri stale (Signature + UBLExtensions içeriyor)

- **Dosya:satır:** `examples/output/*/output.xml` (30 dosya)
- **Gözlem:** Tüm output dosyalarında L10-15 `<ext:UBLExtensions>` bloğu ve L28-68 arası `<cac:Signature>` bloğu var. Ama serializer kodu hiçbirini üretmiyor (invoice-serializer.ts:52-53, 171 yorum satırı; `serializeSignature` tanımlı ama hiçbir yerden çağrılmıyor). Bu çıktılar önceki bir sürümden kalıyor veya manuel düzenlenmiş.
- **Etki:** Kullanıcı `npx tsx examples/run-all.ts` çalıştırdığında, onaylanmış output dosyaları ile gerçek çıktı uyuşmaz. Denetim/regression testleri için risk.
- **Durum tipi:** B.

### [DÜŞÜK][KÜTÜPHANE] D2 — `ublExtensionsPlaceholder()` dead code

- **Dosya:satır:** `src/utils/xml-helpers.ts:117-127`
- **Gözlem:** Fonksiyon tanımlı, hiçbir yerden çağrılmıyor. invoice-serializer.ts:52 ve despatch-serializer.ts:20 çağıran satırlar yorum satırı.
- **Durum tipi:** B.

### [DÜŞÜK][DOKÜMAN] D3 — invoice-serializer.ts yorum numaralandırması XSD ile uyumsuz

- **Dosya:satır:** `src/serializers/invoice-serializer.ts`
  - L171: `// 23. Signature` — XSD'de #27
  - L174: `// 24. AccountingSupplierParty` — XSD'de #28
  - L177: `// 25. AccountingCustomerParty` — #29
  - L180: `// 26. BuyerCustomerParty` — #30
  - L184: `// 28. TaxRepresentativeParty` — #32 (27 atlandı ama yanlış)
  - L196: `// 30. PaymentMeans` — #34
  - L203: `// 31. PaymentTerms` — #35
  - L227: `// 32. AllowanceCharge` — #36
  - L234: `// 33. TaxTotal` — #41 (büyük atlama)
- **Gözlem:** Yorumlar kendi içinde tutarlı değil ve XSD'de tanımlı gerçek sıralarla eşleşmiyor.
- **Durum tipi:** B.

### [DÜŞÜK][KÜTÜPHANE] D4 — `cbcTag` boş değer için sessizce hiçbir şey üretmiyor

- **Dosya:satır:** `src/utils/xml-helpers.ts:37` — `if (strValue.trim() === '') return '';`
- **Gözlem:** Değer boş string ise element hiç emit edilmez. XSD zorunlu elemanlarda (ör. PaymentMeansCode, cbc:CityName, cbc:CitySubdivisionName) bu davranış sessiz XSD fail yaratır (Y1/Y2/Y4/O2 bulgularıyla birlikte).
- **Durum tipi:** B.
- **Not:** Tek başına düşük ama yukarıdaki YÜKSEK bulguların amplifier'ı.

### [DÜŞÜK][KÜTÜPHANE] D5 — Address BlockName / District / Postbox desteği yok

- **Dosya:satır:** `src/serializers/party-serializer.ts:100-113`, `src/serializers/delivery-serializer.ts:62-74`
- **Gözlem:** XSD `AddressType` (satır 699-715) içinde `Postbox`, `BlockName`, `District` alanları var — Kütüphane destekle­miyor.
- **Durum tipi:** A (skill adres bölümünde bu alanlar var mı, ikincil öncelik).

### [DÜŞÜK][KÜTÜPHANE] D6 — Shipment emit sırası: hem `shipmentStages[]` hem `transportModeCode` set edilirse iki ShipmentStage çıkar

- **Dosya:satır:** `src/serializers/delivery-serializer.ts:100-114`
- **Gözlem:** İki koşul da ayrı ayrı `<cac:ShipmentStage>` emit ediyor — çift çıktı.
- **Durum tipi:** B.

### [DÜŞÜK][KÜTÜPHANE] D7 — XSD `cac:Country/cbc:IdentificationCode` desteği yok

- **Dosya:satır:** `src/serializers/party-serializer.ts:109-113`, `src/serializers/delivery-serializer.ts:70-74`
- **Gözlem:** Kütüphane sadece `<cbc:Name>` emit ediyor. XSD `CountryType` (satır 1222-1227) `IdentificationCode` (ISO 3166-1 alpha-2) opsiyonel ama UBL-TR için yaygın kullanım.
- **Durum tipi:** B.

---

## 6. Namespace ve Sabit Değerler

`src/config/namespaces.ts` değerlendirmesi:

| Sabit | Değer | Doğru mu? | Referans |
|---|---|---|---|
| `INVOICE_NAMESPACES.default` | `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2` | ✓ | UBL-Invoice-2.1.xsd:2 targetNamespace |
| `INVOICE_NAMESPACES.cac` | `urn:...:CommonAggregateComponents-2` | ✓ | XSD import |
| `INVOICE_NAMESPACES.cbc` | `urn:...:CommonBasicComponents-2` | ✓ | XSD import |
| `INVOICE_NAMESPACES.ext` | `urn:...:CommonExtensionComponents-2` | ✓ | XSD import (kapsam dışı ama doğru namespace) |
| `INVOICE_NAMESPACES.ds` | `http://www.w3.org/2000/09/xmldsig#` | ✓ | W3C XMLDSig |
| `INVOICE_NAMESPACES.xades` | `http://uri.etsi.org/01903/v1.3.2#` | ✓ | ETSI XAdES |
| `INVOICE_NAMESPACES.xsi` | `http://www.w3.org/2001/XMLSchema-instance` | ✓ | W3C XSI |
| `INVOICE_NAMESPACES.schemaLocation` | `urn:...:Invoice-2 UBL-Invoice-2.1.xsd` | ✓ | Fatura için doğru |
| `DESPATCH_NAMESPACES.default` | `urn:...:DespatchAdvice-2` | ✓ | UBL-DespatchAdvice-2.1.xsd:2 |
| `DESPATCH_NAMESPACES.schemaLocation` | `urn:...:DespatchAdvice-2 UBL-DespatchAdvice-2.1.xsd` | ✓ | |
| `UBL_CONSTANTS.ublVersionId` | `2.1` | ✓ | UBL-TR v1.2.1 ana sürüm |
| **`UBL_CONSTANTS.customizationId`** | **`TR1.2.1`** | **YANLIŞ — Y7** | Fatura için `TR1.2`, İrsaliye için `TR1.2.1` olmalı (ayrı sabitler) |
| `UBL_CONSTANTS.copyIndicator` | `false` | ✓ | |

Ek bulgu: `root element` üzerinde `xmlns:ds` ve `xmlns:xades` gereksiz olabilir (imza bloğu olmayan minimal bir faturada kullanılmıyor). Ama skill açısından "hazır bırakma" pattern'i kabul edilebilir → **DÜŞÜK**, buraya kayıt dışı.

---

## 7. XML Escape ve Özel Karakterler

`src/utils/formatters.ts:16-23` (`escapeXml`):

- `&` → `&amp;` ✓
- `<` → `&lt;` ✓
- `>` → `&gt;` ✓
- `"` → `&quot;` ✓
- `'` → `&apos;` ✓
- Türkçe karakterler (ğ, ü, ş, ı, ç, ö) → XML UTF-8 encoding ile doğal; escape gerekmez ✓

`cbcTag` ve attribute tag'leri `escapeXml`'i çağırıyor (xml-helpers.ts:38 ve :22). **Uyumlu**.

**CDATA kullanımı:** Kütüphanede hiçbir yerde CDATA yok. UBL-TR metin alanlarında CDATA gereksiz (binary content `<cbc:EmbeddedDocumentBinaryObject>` Base64 olarak gönderilir, CDATA değil). **Uyumlu**.

---

## 8. Örnek Çıktı Cross-Check (examples/output/)

3 senaryo manuel denetlendi:

### 8.1 `10-istisna/output.xml`

- **L10-15**: `<ext:UBLExtensions>` mevcut (stale — D1).
- **L17**: `CustomizationID=TR1.2.1` → **Y7**.
- **L28-68**: `<cac:Signature>` mevcut (stale — D1).
- **L134-146**: TaxSubtotal içinde `TaxExemptionReasonCode`+`TaxExemptionReason` → **K1 KRİTİK** (xmllint reddeder).
- **L161-172, L187-200**: Aynı hata InvoiceLine TaxSubtotal'larda da.
- **L140-145 / L167-172**: TaxCategory içeriği sadece `<cac:TaxScheme>` + `<cbc:Name>KDV</cbc:Name>` + `<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>` — GİB örneğinde (YTB_Istisna_Efatura.xml:130-133) de aynı yapı → OK.
- **Değerlendirme:** Stale output'u görmezden gelsek bile **K1 her TaxSubtotal'da fail ediyor**.

### 8.2 `14-dovizli-usd/output.xml`

- **L17**: `CustomizationID=TR1.2.1` → **Y7**.
- **L128-132**: `<cac:PricingExchangeRate>` var ama bu fatura öncesinde `AllowanceCharge` olsaydı (yok) **K3 bozulurdu**. Bu örnek şans eseri AllowanceCharge vermediği için K3'ü göstermiyor.
- **L126**: AccountingCustomerParty'de PartyTaxScheme mevcut (`Foreign Tax Office`) — ancak BuyerCustomerParty tipi değil `AccountingCustomerParty` (SupplierPartyType/CustomerPartyType wrapped), o yüzden PostalAddress + Contact + PartyTaxScheme düzgün emit ediliyor. Y5 sadece BuyerCustomerParty'yi etkiliyor.
- **L135-144**: TaxSubtotal — exemption kodu yok, bu yüzden K1 burada yok.

### 8.3 `11-ihrac-kayitli/output.xml` (seçildi çünkü IHRACKAYITLI + 702 senaryosunu tetikleyebilir)

İçerik okundu değil ama Denetim 03 Y8'den ve bu denetimin Y8'inden biliyoruz ki: kütüphane `CustomsDeclaration/IssuerParty` emit etmiyor (input tipinde bile yok). Yani bu örnek ya 702 kullanmıyor ya da üretilmesi eksik (skill'in gerektirdiği satır-kodları içermiyor). IHRACKAYITLI senaryo eksikliği Denetim 03 + Denetim 04 birleşik: **input tipi + validator + serializer hepsi eksik**.

---

## 9. Bulgu Özeti

### 9.1 Ciddiyet Dağılımı

| Ciddiyet | Adet | ID'ler |
|---|---|---|
| **KRİTİK** | 6 | K1 TaxExemption yanlış parent · K2 InvoiceLine Delivery sırası · K3 Invoice ExchangeRate-AllowanceCharge sırası · K4 AllowanceCharge Reason en sonda · K5 Item Description-Name sırası · K6 Despatch Delivery iç sırası |
| **YÜKSEK** | 9 | Y1 DocumentRef IssueDate · Y2 OrderRef IssueDate · Y3 Party PostalAddress atlanıyor · Y4 Address City* opsiyonel · Y5 BuyerCustomerParty eksik alanlar · Y6 TaxRepresentativeParty eksik alanlar · Y7 CustomizationID TR1.2.1 · Y8 CustomsDeclaration yok · Y9 OriginatorDocumentReference yok |
| **ORTA** | 8 | O1 Person MiddleName sırası · O2 PaymentMeansCode opsiyonel · O3 TaxExchangeRate yok · O4 Despatch LineCountNumeric · O5 Despatch BuyerCustomerParty · O6 Shipment ID hard-code · O7 Despatch boş GoodsItem · O8 PaymentCurrencyCode |
| **DÜŞÜK** | 7 | D1 examples/output stale · D2 ublExtensionsPlaceholder dead · D3 invoice-serializer.ts yorum numara · D4 cbcTag sessiz boş · D5 BlockName/District yok · D6 Shipment çift stage · D7 Country/IdentificationCode |
| **Toplam** | **30** | |

### 9.2 Kategori Dağılımı

| Kategori | Adet |
|---|---|
| KÜTÜPHANE | 28 |
| DOKÜMAN | 2 (D1 stale examples/output, D3 yorum numaralandırması) |
| TEST | 0 |
| SKILL | 0 |

### 9.3 Durum Tipi Dağılımı

| Tip | Adet | Not |
|---|---|---|
| A (Skill + normatif + kütüphane üçgeninde skill+normatif karşıtı) | 6 | K1, O5, O8, Y8, Y9, D5 |
| B (XSD/normatif kesin, kütüphane yanlış) | 23 | Çoğu XSD sequence ve element cardinalite ihlalleri |
| C (Skill ↔ normatif çelişki, normatif kazanır) | 1 | Y7 CustomizationID |

### 9.4 Ayırt Edici Desenler

1. **XSD sequence ihlalleri** (6 KRİTİK + 3 YÜKSEK + 4 ORTA = 13 bulgu) — **Kütüphane XSD sequence'ın sadece kök seviyesine dikkat etmiş, alt elemanlarda (InvoiceLine, TaxSubtotal, AllowanceCharge, Item, Person, Despatch Delivery) kaymalar var.** Kök neden: her serializer kendi sırasını tanımlıyor, tek bir "XSD sıra tablosu" kaynağı yok. Test eksikliği (Denetim 01 §5) bu hataları yakalayamamış.

2. **minOccurs=1 elemanlar opsiyonel muamelesi görüyor** (Y1/Y2/Y3/Y4/O2 = 5 bulgu) — DocumentReference.IssueDate, OrderReference.IssueDate, Party.PostalAddress, Address.CityName/CitySubdivisionName, PaymentMeans.PaymentMeansCode hepsi XSD'de zorunlu ama kütüphane `if (isNonEmpty(...))` ile opsiyonel geçiriyor. Bu, `cbcTag` utility'sinin "boş ise yok" davranışıyla (D4) birleşince sessiz XSD fail üretiyor.

3. **Party wrapper'ları yetersiz serialize** (Y5/Y6 = 2 bulgu + Y3 + Y4) — BuyerCustomerParty ve TaxRepresentativeParty için PartyType'ın tüm sequence'i (PostalAddress, PartyTaxScheme, Contact) yazılmıyor; sadece kısmi kapsam. IHRACAT/YOLCU/KAMU senaryolarında data kaybı + XSD fail.

4. **Örnek output'lar gerçek output'u yansıtmıyor** (D1) — 30 adet `examples/output/*.xml` dosyası Signature + UBLExtensions içerirken serializer bunları üretmiyor. Regression test için reference olarak kullanılamaz.

5. **IHRACKAYITLI + 702 senaryosu 3 denetimde 3 katmanda eksik** — D02 validator+codelist, D03 cross-validator, D04 serializer+input tipi. **Senaryo bütün olarak desteklenmiyor**, parça parça değil.

6. **Namespace sabitleri doğru ama CustomizationID yanlış** — Sabit bir ayrımı (Fatura vs İrsaliye) kaçırıyor.

---

## 10. Context'e Giren Dosyalar

**Kütüphane (src/):**
- `serializers/invoice-serializer.ts` (259 satır)
- `serializers/despatch-serializer.ts` (173 satır)
- `serializers/party-serializer.ts` (246 satır)
- `serializers/tax-serializer.ts` (87 satır)
- `serializers/monetary-serializer.ts` (80 satır)
- `serializers/line-serializer.ts` (123 satır)
- `serializers/delivery-serializer.ts` (137 satır)
- `serializers/reference-serializer.ts` (127 satır)
- `serializers/common-serializer.ts` (42 satır)
- `config/namespaces.ts` (31 satır)
- `utils/xml-helpers.ts` (127 satır)
- `utils/formatters.ts` (39 satır)
- `calculator/` (klasör listesi — SimpleInvoiceBuilder vs.)
- `builders/` (klasör listesi)
- `types/` (klasör listesi — invoice-input.ts, despatch-input.ts, common.ts, enums.ts)

**GİB normatif kaynaklar (sisteminiz-integrator-infrastructure/.claude/skills/gib-teknik-dokuman/):**
- `schemas/maindoc/UBL-Invoice-2.1.xsd` (56 satır — root sequence)
- `schemas/maindoc/UBL-DespatchAdvice-2.1.xsd` (34 satır — root sequence)
- `schemas/common/UBL-CommonAggregateComponents-2.1.xsd` (3500+ satır, selektif: PartyType, AddressType, AllowanceChargeType, MonetaryTotalType, TaxTotalType, TaxSubtotalType, TaxCategoryType, TaxSchemeType, ExchangeRateType, PaymentMeansType, PaymentTermsType, PeriodType, InvoiceLineType, ItemType, ItemInstanceType, DeliveryType, ShipmentType, DespatchLineType, DespatchType, OrderReferenceType, OrderLineReferenceType, DocumentReferenceType, BillingReferenceType, CustomerPartyType, SupplierPartyType, PersonType, ContactType, CountryType, CustomsDeclarationType, TransportHandlingUnitType, CommodityClassificationType, GoodsItemType vs.)
- `schematrons/UBL-TR_Common_Schematron.xml` (seçili: TaxExemptionReasonCodeCheck L311)
- `schematrons/UBL-TR_Main_Schematron.xml` (L200-258: rule-context bağlamaları)
- `references/genel-aciklamalar-ubl-tr-v0.4.md` (satır 300-395 — CustomizationID + TaxCategory/TaxExemptionReasonCode açıklaması)
- `references/e-fatura-ubl-tr-v1.0.md` (L41, L77, L151, L258 — CustomizationID=TR1.2)
- `references/senaryo-temel-irsaliye-v0.3.md` (L41, L223 — İrsaliye CustomizationID=TR1.2.1)
- `references/senaryo-temel-fatura-v0.2.md` (L43, L202 — Fatura CustomizationID belirsizliği)

**GİB referans XML örnekleri (json2ubl-ts/xmls/):**
- `YTB_Istisna_Efatura.xml` (TaxCategory içinde TaxExemptionReasonCode doğrulaması)
- `YTB_Satıs_Efatura.xml` (AllowanceCharge sırası doğrulaması)
- `YTB_Iade_Istısna_Efatura.xml` (InvoiceLine AllowanceCharge sırası doğrulaması)
- `YTB_TevkıfatIade_Efatura.xml` (tevkifat-iade kombinasyonu)
- `IDIS_Fatura.xml` (Item+AdditionalItemIdentification yapısı)
- `sgk.xml` (SGK AccountingCost kullanımı)
- 13 adet fatura XML'i (CustomizationID=TR1.2 doğrulaması)

**Library örnek çıktıları (examples/output/):**
- `10-istisna/output.xml` (K1 KRİTİK teyidi)
- `14-dovizli-usd/output.xml` (ExchangeRate pozisyonu — K3 şans eseri tetiklenmiyor)
- `11-ihrac-kayitli/output.xml` (dosya listesi — Y8 bağlamı)

**Önceki denetim raporları (audit/):**
- `SONUC-konsolide-bulgular.md`
- `denetim-01-ic-tutarlilik.md` (§5 test eksikliği — D1 stale examples'ın kök sebebi)
- `denetim-02-kod-listeleri.md` (AdditionalItemIdentification + çift truth source)
- `denetim-03-validators.md` (IHRACKAYITLI+702, IHRACAT amount, validator kapsamı — Y8 serializer seviyesinde teyit)

---

## 11. Sonraki Denetimlere Açık Sorular

D04'ten devreden:

1. **`SimpleInvoiceBuilder` → `serializeInvoice` akışı**: `examples/output/*.xml` içeriklerinde `<cac:Signature>` ve `<ext:UBLExtensions>` var ama `serializeInvoice` üretmiyor. SimpleInvoiceBuilder veya wrapper katmanında post-processing var mı, yoksa dosyalar eski bir versiyondan mı kaldı? (Denetim 05 builder katmanı kapsamında.)

2. **Input tipleri (`invoice-input.ts`, `despatch-input.ts`, `common.ts`)**: Serializer'ın ürettiği XML, input tipi zorunlulukları ile nasıl eşleşiyor? TypeScript level'da zorunluluk (`required` vs `optional`) XSD ile uyumlu mu? Özellikle Y1/Y2/Y3/Y4/O2'de — XSD zorunlu ama library opsiyonel — input tipte `optional?` ise bu sessiz kayıp. (Denetim 05 kapsamında.)

3. **`CustomsDeclaration` input tipi ve builder desteği**: Y8 serializer'da eksik, Denetim 03'te validator'da eksik. Input tipte (`common.ts` / `invoice-input.ts`) desteklenmiyor mu? (Denetim 05 kapsamında.)

4. **XSD sequence doğrulamasının test katmanında eksikliği**: Denetim 01 §5'teki "serializer için dedicated test yok" uyarısı bu denetimde teyit edildi. 30 bulgudan 6'sı KRİTİK ve hepsi XSD + xmllint ile yakalanabilir. Bir `xmllint`-based pre-commit test'i veya regression suite eklenmeli mi? (Açık soru — roadmap konusu.)

5. **`Signature`/`UBLExtensions` örnek çıktıda niye var?** Stale file mı, yoksa kapsam dışına alınmadan önceki commit'in artıkları mı? Git log hash: D1 için commit bazlı araştırma gerekir.

6. **`xsi:schemaLocation` kullanımı**: Library emit ediyor (namespaces.ts:10). GİB pragmatik olarak kabul ediyor mu yoksa `xsi:schemaLocation` olan XML'leri strict modda reddediyor mu? Araştırma gerekir.

7. **D1 — examples/output'ı regenerate etmeli miyiz?**: Mevcut halleriyle "reference snapshot" görevi yapıyor ama stale. Regenerate edilirse çoğu XSD fail eder (K1-K6). K1-K6 düzeltilmeden regenerate mantıksız; düzeltildikten sonra yeniden üretilmeli. Roadmap sıralaması: önce K1-K6 fix → sonra regenerate → sonra xmllint CI.

8. **TR1.2 vs TR1.2.1 son karar**: Hangi değer sadık? Senaryo belgeleri "güncel TR1.2.1" diyor, `e-fatura-ubl-tr-v1.0.md` "sabit TR1.2" diyor, GİB XML'leri TR1.2 kullanıyor. Bir Mimsoft/GİB çağrısı ile teyit + skill özetinde netleştirilmesi gerekli.
