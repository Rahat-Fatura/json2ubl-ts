---
denetim: 06 — Despatch / e-İrsaliye
tarih: 2026-04-21
skill_versiyon: gib-teknik-dokuman (SKILL.md 14:42, e-irsaliye-ubl-tr-v1.2.md 13:21, senaryo-temel-irsaliye-v0.3.md 14:41)
kutuphane_versiyon: json2ubl-ts v1.4.2-dev (working tree diff dahil — package.json 24 Mar 15:10, despatch-serializer.ts uncommitted)
kapsam: DespatchProfileId/DespatchTypeCode enum, DespatchBuilder kontrat, despatch-serializer (XSD sequence + Shipment blok), DespatchLine semantiği, despatch-validators (Main Schematron desp:DespatchAdvice context + 10 abstract kural), Fatura↔İrsaliye ortak kod kullanımı, __tests__/builders/despatch-builder.test.ts (172 satır), examples/output irsaliye kapsamı.
---

# Denetim 06 — Despatch / e-İrsaliye

Bu denetim, json2ubl-ts'nin **e-İrsaliye (DespatchAdvice)** belgesini üretme zincirini (types → builder → serializer → validator → test → örnek XML) normatif kaynaklara (UBL-TR v1.2.1 kılavuzu v1.2, UBL-DespatchAdvice-2.1.xsd, UBL-TR Main/Common Schematron, UBL-TR Codelist, canonical XML örnekleri) göre değerlendirir. Tüm 6 denetimin kapanış maddesidir.

---

## 1. Skill Kaynak Envanteri (İrsaliye Odaklı)

`.claude/skills/gib-teknik-dokuman/` altındaki irsaliyeye dair kaynaklar:

| Tip | Dosya | İçerik |
|---|---|---|
| **references/** | `e-irsaliye-ubl-tr-v1.2.md` | UBL-TR v1.2.1 Sevk İrsaliyesi 22 XSD elemanı — zorunlu/seçimli, SEVK/MATBUDAN, Shipment yapısı, Fatura↔İrsaliye kritik 19 fark, Teslim Eden §5.4 v0.4 değişikliği |
| **references/** | `senaryo-temel-irsaliye-v0.3.md` | TEMELIRSALIYE iş akışı + ReceiptAdvice çift yön + 3 e-İrsaliye varyantı + 4 yanıt varyantı + §6.1 `schemeID="VKN_TCKN"` kullanımı |
| **references/** | `ortak-tasima-ve-teslim-v0.7.md` | `Shipment`, `ShipmentStage`, `Delivery`, `Despatch`, `TransportMeans`, `RoadTransport`, `TransportEquipment` ortak tanımları (referanslı, kendim okumadım — cross-check gerektiğinde) |
| **references/** | `ortak-satir-ve-urun-v0.7.md` | `DespatchLine`, `Item`, `GoodsItem` (referanslı) |
| **schemas/maindoc/** | `UBL-DespatchAdvice-2.1.xsd` | 22 element, sequence bağlayıcı — bkz. §4 |
| **schemas/common/** | `UBL-CommonAggregateComponents-2.1.xsd` | `DespatchLineType:1362-1375`, `ShipmentType:2619-2644`, `DeliveryType:1310-1328`, `SupplierPartyType:2758-2763`, `PersonType:2239-2250` |
| **schematrons/** | `UBL-TR_Main_Schematron.xml:472-527` | desp:DespatchAdvice için 9 rule (13 abstract kurala genişletir) + 10 cross-PartyIdentification kuralı |
| **schematrons/** | `UBL-TR_Common_Schematron.xml:701-763` | 10 abstract kural: `DespatchAdviceTypeCodeCheck`, `DeliveredQuantityCheck`, `ItemNameCheck`, `DespatchLineIdCheck`, `DespatchIdisEtiketNoCheck`, `DespatchIdisSevkiyatNoCheck`, `DespatchDateCheck`, `DespatchTimeCheck`, `DespatchAddressCheck`, `DespatchCarrierDriverCheck`, `DespatchAdviceHKSKunyeCheck`, `ProfileIDTypeDespatchAdvice`, `LicensePlateIDSchemeIDCheck` |
| **schematrons/** | `UBL-TR_Codelist.xml:7,11,33,35` | `ProfileIDTypeDespatchAdvice=',TEMELIRSALIYE,HKSIRSALIYE,IDISIRSALIYE,'`, `DespatchAdviceTypeCodeList=',SEVK,MATBUDAN,'`, `LicensePlateIDSchemeIDType=',DORSE,PLAKA,'`, `PartyIdentificationIDType` içinde `SEVKIYATNO` + `PLAKA` |
| **xmls/** | `Irsaliye-Ornek1.xml` (temel) | TEMELIRSALIYE/SEVK canonical — **Shipment yapısı referans noktası** (bkz. §5) |
| **xmls/** | `Irsaliye-Ornek2.xml` (kısmi) | Kısmi gönderim, `DespatchLine/OutstandingQuantity` + `OutstandingReason` |
| **xmls/** | `Irsaliye-Ornek3.xml` (farklı taraflar) | DespatchSupplier ≠ SellerSupplier ≠ Buyer ≠ Originator — **4 party tipi** |
| **xmls/** | `Irsaliye-Matbudan.xml` | MATBUDAN/DocumentType=MATBU canonical |
| **xmls/** | `IDIS_Irsaliye.xml` (140KB) | IDISIRSALIYE canonical — SEVKIYATNO + ETIKETNO |
| **xmls/** | `IrsaliyeYaniti-Ornek*.xml` | ReceiptAdvice (kapsam dışı — lib üretmiyor) |

**Özet: İrsaliye özel skill kaynağı yeterli.** Zorunluluk → `e-irsaliye-ubl-tr-v1.2.md`, semantiği anlama → `senaryo-temel-irsaliye-v0.3.md`, normatif kesinlik → Schematron + XSD, canonical örnek → `Irsaliye-Ornek1.xml`. Hiçbir kaynak eksik değil; kütüphane karşılaştırması tam yapılabilir.

**Not:** HKSIRSALIYE + IDISIRSALIYE özel kuralları `e-irsaliye-ubl-tr-v1.2.md §12 TODO`'da "ayrı senaryo kılavuzu olmalı" işaretlenmiş — Schematron kuralları (`DespatchAdviceHKSKunyeCheck`, `DespatchIdisEtiketNoCheck`, `DespatchIdisSevkiyatNoCheck`) skill özetinde ayrı bir tabloda özetlenmemiş. Denetim yorumum: **[DÜŞÜK][SKILL]** kayıp değil ama ek özet getirilse iyi olur.

---

## 2. Enum ve Kod Uyumu

### 2.1 `DespatchProfileId` (src/types/enums.ts:42-46)

| Enum değeri | Codelist `ProfileIDTypeDespatchAdvice` | Skill §4.2.1 | Uyum |
|---|---|---|---|
| TEMELIRSALIYE | ✅ | ✅ | ✅ |
| HKSIRSALIYE | ✅ | ✅ | ✅ |
| IDISIRSALIYE | ✅ | ✅ | ✅ |

3 profil, 3/3 tam eşleşme. **Kayıp yok, fazla yok**. Fatura tarafındaki gibi geniş tutarsızlık yok (D01 bulgusu İrsaliye tarafında yok).

### 2.2 `DespatchTypeCode` (src/types/enums.ts:49-52)

| Enum değeri | Codelist `DespatchAdviceTypeCodeList` | Skill §6 | Uyum |
|---|---|---|---|
| SEVK | ✅ | ✅ | ✅ |
| MATBUDAN | ✅ | ✅ | ✅ |

2 tip, 2/2 tam eşleşme. **D01/D02'deki InvoiceTypeCode eksiklikleri/tutarsızlıkları İrsaliye'de YOK.**

### 2.3 `LicensePlateInput.schemeId` (src/types/despatch-input.ts:86)

```ts
schemeId: 'PLAKA' | 'DORSE';
```

Codelist `LicensePlateIDSchemeIDType=',DORSE,PLAKA,'` ile eşleşiyor. ✅

**⚠ Skill ↔ Codelist çelişkisi** (Durum C): 
- Skill `e-irsaliye-ubl-tr-v1.2.md §7` ve canonical `Irsaliye-Ornek1.xml:197-200`: dorse `cac:TransportHandlingUnit/cac:TransportEquipment/cbc:ID[schemeID="DORSEPLAKA"]` altında yer alır.
- Codelist ise `DORSE` değerini `LicensePlateID/@schemeID` (yani `TransportMeans/RoadTransport/LicensePlateID`) altında tanımlar.

Yani iki farklı yol var:
1. **Canonical yol:** `ShipmentStage/TransportMeans/RoadTransport/LicensePlateID[@schemeID="PLAKA"]` (çekici) + `Shipment/TransportHandlingUnit/TransportEquipment/ID[@schemeID="DORSEPLAKA"]` (dorse)
2. **Codelist yol:** Hepsi `TransportMeans/RoadTransport/LicensePlateID[@schemeID="PLAKA"|"DORSE"]`

Kütüphane **Codelist yolu**nu kullanıyor (validateDespatch + serializer). Bu normatif olarak geçerli çünkü Schematron `LicensePlateIDSchemeIDCheck` sadece Codelist'e bakar. Canonical örnek farklı bir çözüm tercih ediyor ama bu zorlayıcı değil. **Uyumlu — bulgu değil.**

### 2.4 `AdditionalItemIdInput.schemeId` (despatch bağlamı)

Kütüphane `string` olarak serbest, runtime kısıtlama yok. Codelist `AdditionalItemIdentificationIDType=',KUNYENO,ILAC,TIBBICIHAZ,TELEFON,TABLET_PC,DIGER,'`. **ETIKETNO listede YOK** ama Schematron `DespatchIdisEtiketNoCheck` IDISIRSALIYE için ETIKETNO zorunlu kılıyor. **Bu bir skill iç çelişkisi** (Codelist whitelist eksik ama Schematron zorluyor) — D02'de de not edilmişti.

---

## 3. DespatchBuilder Kontratı

`src/builders/despatch-builder.ts:1-61`

```ts
class DespatchBuilder {
  constructor(options?: BuilderOptions) { ... }
  build(input): string      // validate → throw on error → serialize
  validate(input): ValidationError[]
  buildUnsafe(input): string
}
```

Fatura'daki `InvoiceBuilder` ile **aynı pattern**. Validasyon akışı:
- `validationLevel='none'` → erken dönüş, hata listesi boş
- aksi halde `validateDespatch(input)` çalıştırılır

### 3.1 ValidationLevel — Anlam farkı (D03 paralel)

```ts
validate(input): ValidationError[] {
  if (this.options.validationLevel === 'none') return [];
  return validateDespatch(input);
}
```

`validationLevel` için `'basic' | 'strict' | 'none'` tanımlı ama **Despatch'te sadece 'none' özel muamelesi var**. `basic` ile `strict` arasında fark yok — her ikisi de `validateDespatch`'i çağırıyor.

**D03 §10.3 DÜŞÜK DOKÜMAN bulgusunun teyit noktası**: "DespatchBuilder için validationLevel inefektif". Aynı kod 3 seçenek sunuyor ama 2 tanesi eşdeğer. **→ Bulgu §11.4 (DOKÜMAN)**.

### 3.2 Unsigned Üretim

Serializer içinde:
- Satır 21 (diff sonrası): `// parts.push(indentBlock(ublExtensionsPlaceholder(), ind));` — **UBLExtensions üretilmiyor** (commented out)
- Satır 69: `// 14. Signature — business logic tarafından eklenir, serializer üretmez`

Kütüphane Mimsoft'la uyumlu unsigned UBL üretir. **Kapsam dışı — bulgu değil.**

### 3.3 Working Tree Diff

```diff
- parts.push(indentBlock(ublExtensionsPlaceholder(), ind));
+ // parts.push(indentBlock(ublExtensionsPlaceholder(), ind));
```

`ublExtensionsPlaceholder` import da silinmiş (satır 3). D04 §D2 "ublExtensionsPlaceholder dead code" bulgusunun teyidi. **→ Bulgu §11.5 (DÜŞÜK)**.

`indentBlock` yerel helper'ı komple yoruma alınmış (satır 171-173) — artık kullanılmıyor ama silinmemiş. **→ Bulgu §11.5 (DÜŞÜK)**.

---

## 4. Serializer Doğruluğu — XSD Sequence

`src/serializers/despatch-serializer.ts` v.s. `UBL-DespatchAdvice-2.1.xsd:7-32` + `UBL-CommonAggregateComponents-2.1.xsd:2619-2644 (ShipmentType)` + `1310-1328 (DeliveryType)`.

### 4.1 DespatchAdvice Root Sequence

XSD satır 7-32 tam sequence:

| # | XSD Element | Cardinality | Lib serializer (despatch-serializer.ts) | Uyum |
|---|---|---|---|---|
| 1 | ext:UBLExtensions | 1 (zorunlu) | Satır 21: yorumlu | **SKIP — unsigned karar** |
| 2 | cbc:UBLVersionID | 1 | Satır 24 | ✅ |
| 3 | cbc:CustomizationID | 1 | Satır 25 | ✅ (TR1.2.1) |
| 4 | cbc:ProfileID | 1 | Satır 28 | ✅ |
| 5 | cbc:ID | 1 | Satır 31 | ✅ |
| 6 | cbc:CopyIndicator | 1 | Satır 34 | ✅ |
| 7 | cbc:UUID | 1 | Satır 37 | ✅ |
| 8 | cbc:IssueDate | 1 | Satır 40 | ✅ |
| 9 | **cbc:IssueTime** | **1 (zorunlu)** | Satır 43-45: `if (input.issueTime)` | ❌ **→ §11.1 K1** |
| 10 | cbc:DespatchAdviceTypeCode | 0..1 | Satır 48 | ✅ |
| 11 | cbc:Note | 0..∞ | Satır 51-55 | ✅ |
| 12 | **cbc:LineCountNumeric** | **0..1** | **—** | ❌ **→ §11.3 Y1** |
| 13 | cac:OrderReference | 0..∞ | Satır 58-60: `if (input.orderReference)` — **0..1 destekli, XSD 0..n** | ⚠ **→ §11.3 Y2** |
| 14 | cac:AdditionalDocumentReference | 0..∞ | Satır 63-67 | ✅ |
| 15 | cac:Signature | 1..∞ (zorunlu) | Yok | **SKIP — unsigned karar** |
| 16 | cac:DespatchSupplierParty | 1 | Satır 72-74 | ⚠ (→ §4.3 DespatchContact eksik) |
| 17 | cac:DeliveryCustomerParty | 1 | Satır 77-79 | ✅ |
| 18 | **cac:BuyerCustomerParty** | **0..1** | **—** | ❌ **→ §11.3 Y3** |
| 19 | **cac:SellerSupplierParty** | **0..1** | **—** | ❌ **→ §11.3 Y3** |
| 20 | **cac:OriginatorCustomerParty** | **0..1** | **—** | ❌ **→ §11.3 Y3** |
| 21 | cac:Shipment | 1 | Satır 82 | ⚠ (→ §4.4 yapısal sorun) |
| 22 | cac:DespatchLine | 1..∞ | Satır 85-87 | ✅ |

**Eksik elemanlar:** LineCountNumeric, BuyerCustomerParty, SellerSupplierParty, OriginatorCustomerParty.

**Skill kritik uyarısı:** `e-irsaliye-ubl-tr-v1.2.md §3-4 + §8` Fatura/İrsaliye farklar tablosu — "BuyerCustomerParty 0..1 ve İrsaliye'ye de var aynı anlamda"; "OriginatorCustomerParty İrsaliye'ye özel (malların alınmasını başlatan)". `senaryo-temel-irsaliye-v0.3.md §4.3` "Farklı Tarafların Bulunduğu e-İrsaliye" senaryosu bu dört party'nin tümünü kullanır. Canonical örnek `Irsaliye-Ornek3.xml` bu 4 party'yi emit eder.

### 4.2 IssueTime (XSD satır 17) Zorunlu

```xsd
<xsd:element ref="cbc:IssueTime"/>  <!-- minOccurs yok ⇒ default=1 (zorunlu) -->
```

Skill `e-irsaliye-ubl-tr-v1.2.md §3 #9`: `IssueTime | 1 | zorunlu — Fatura'dan farklı`.

Kütüphane:
- `despatch-input.ts:36`: `issueTime?: string;` (opsiyonel)
- `despatch-serializer.ts:43`: `if (input.issueTime) { push... }`
- `despatch-validators.ts:46`: `if (input.issueTime && !TIME_REGEX.test(input.issueTime))` — yalnız varsa format kontrol, yokluğu hata değil

**→ Bulgu §11.1 K1 (KRİTİK).**

### 4.3 DespatchSupplierParty/DespatchContact/Name "Teslim Eden"

`UBL-CommonAggregateComponents-2.1.xsd:2758-2763`:

```xsd
<xsd:complexType name="SupplierPartyType">
  <xsd:sequence>
    <xsd:element ref="cac:Party"/>
    <xsd:element ref="cac:DespatchContact" minOccurs="0" maxOccurs="1"/>
  </xsd:sequence>
</xsd:complexType>
```

Skill `e-irsaliye-ubl-tr-v1.2.md §5.4` (**v0.4 değişikliği — PDF §2.3.16**):

> "`DespatchSupplierParty/DespatchContact/Name` içine **Teslim Eden kişi adı** yazılır"

Canonical `Irsaliye-Ornek1.xml:111-113`:

```xml
<cac:DespatchContact>
  <cbc:Name>Cemal Temiz</cbc:Name>
</cac:DespatchContact>
```

Kütüphane:
- `despatch-input.ts:13-45`: `DespatchInput` içinde `despatchContactName` veya eşdeğer alan **yok**
- `despatch-serializer.ts:71-74`: 

```ts
parts.push(`${ind}<cac:DespatchSupplierParty>`);
parts.push(serializeParty(input.supplier, ind + '  '));
parts.push(`${ind}</cac:DespatchSupplierParty>`);
```

Sadece `<cac:Party>` emit ediliyor, `<cac:DespatchContact>` YOK. Kullanıcının "Teslim Eden" bilgisini kitaba yazmasının yolu yok.

**→ Bulgu §11.1 K2 (KRİTİK).**

### 4.4 Shipment/Delivery — XSD ↔ Canonical ↔ Lib Karşılaştırması

`DeliveryType` XSD (satır 1310-1328):
```
ID, Quantity, ActualDeliveryDate, ActualDeliveryTime, LatestDeliveryDate, LatestDeliveryTime,
TrackingID, **DeliveryAddress**, AlternativeDeliveryLocation, EstimatedDeliveryPeriod,
**CarrierParty**, DeliveryParty, **Despatch**, DeliveryTerms, Shipment
```

Yani XSD sırası: **DeliveryAddress → CarrierParty → Despatch**.

Canonical `Irsaliye-Ornek1.xml:174-194` Shipment/Delivery içeriği:
```xml
<cac:Delivery>
  <cac:CarrierParty>...</cac:CarrierParty>
  <cac:Despatch>
    <cbc:ActualDespatchDate>...</cbc:ActualDespatchDate>
    <cbc:ActualDespatchTime>...</cbc:ActualDespatchTime>
  </cac:Despatch>
</cac:Delivery>
```
(**DeliveryAddress yok canonical'da!** → §4.5 tartışması)

Kütüphane `despatch-serializer.ts:138-165`:
```ts
lines.push(`${i2}<cac:Delivery>`);
lines.push(`${i3}<cac:Despatch>`);          // 1. önce Despatch
lines.push(`${i4}${cbcTag('ActualDespatchDate', ...)}`);
lines.push(`${i4}${cbcTag('ActualDespatchTime', ...)}`);
lines.push(`${i3}</cac:Despatch>`);
lines.push(serializeAddress(s.deliveryAddress, 'DeliveryAddress', i3));  // 2. sonra DeliveryAddress
if (s.carrierParty) { ...CarrierParty... }   // 3. en son CarrierParty
```

**XSD sequence ihlali:** Lib emit sırası `Despatch → DeliveryAddress → CarrierParty`; XSD istiyor `DeliveryAddress → CarrierParty → Despatch`. Her pozisyon yanlış.

**D04 §K6 bulgusunun devamı** — ama D04 sadece "Despatch DeliveryAddress öncesinde" demişti; gerçekte **3 pozisyon birden yanlış**. xmllint `UBL-DespatchAdvice-2.1.xsd`'ye karşı her irsaliye çıktısını **reddeder**.

**→ Bulgu §11.1 K3 (KRİTİK) — D04 K6'yı güncelleyecek.**

### 4.5 DeliveryAddress — Schematron ↔ Canonical çelişkisi

Schematron `UBL-TR_Common_Schematron.xml:739-744` `DespatchAddressCheck`:
```
<sch:assert test="string-length(normalize-space(string(cac:Shipment/cac:Delivery/cac:DeliveryAddress/cbc:CitySubdivisionName))) != 0">...</sch:assert>
<sch:assert test="...cbc:CityName...">...</sch:assert>
<sch:assert test="...cac:Country/cbc:Name...">...</sch:assert>
<sch:assert test="matches(...cbc:PostalZone, '^...')">...</sch:assert>
```

Yani Schematron **DeliveryAddress'i zorunlu kılar** (4 alt alan + regex).

Canonical `Irsaliye-Ornek1.xml` ise bu alanı **emit etmiyor** (sadece CarrierParty + Despatch).

Bu bir **Normatif iç çelişki** — canonical örnek Schematron'u ihlal ediyor (veya Schematron Main yerine yumuşak kurallarda). 

**Durum C'ye göre Schematron kazanır** — lib Schematron'u izliyor, validator DeliveryAddress zorunlu kılıyor, serializer emit ediyor. **Uyumlu — bulgu değil**. Sadece canonical örnekteki tutarsızlığa skill özetinde bir not düşülmeli **→ §11.5 (SKILL DÜŞÜK)**.

### 4.6 TransportHandlingUnit — Tamamen eksik

`ShipmentType` XSD (2619-2644):
```
ID, ..., **GoodsItem** (0..n), **ShipmentStage** (0..n), **Delivery** (0..1), **TransportHandlingUnit** (0..n), ReturnAddress, FirstArrivalPortLocation, LastExitPortLocation
```

Kütüphane `serializeShipmentBlock` (satır 94-169):
```
Shipment > ID, GoodsItem (placeholder), ShipmentStage, Delivery
```

**TransportHandlingUnit hiç emit edilmiyor.** Skill §7 ve canonical `Irsaliye-Ornek1.xml:195-202`:

```xml
<cac:TransportHandlingUnit>
  <cac:TransportEquipment>
    <cbc:ID schemeID="DORSEPLAKA">06DR4088</cbc:ID>
  </cac:TransportEquipment>
  <cac:TransportEquipment>
    <cbc:ID schemeID="DORSEPLAKA">06DR4099</cbc:ID>
  </cac:TransportEquipment>
</cac:TransportHandlingUnit>
```

Kütüphane dorse plakalarını `TransportMeans/RoadTransport/LicensePlateID[@schemeID="DORSE"]` altında emit ediyor (Codelist'e uygun alternatif yol — bkz. §2.3). XSD ve Schematron açısından **geçerli** ama canonical pattern ile uyumsuz.

**Uyum seviyesi:** İki alternatif yol var; lib birini kullanıyor, canonical diğerini. Kütüphane doğru çıktı üretir ama kullanıcının canonical'a uymak istemesi durumunda seçim yok.

**→ Bulgu §11.3 Y4 (YÜKSEK — kapsam eksikliği).**

### 4.7 Shipment/GoodsItem — Boş placeholder

Kütüphane `despatch-serializer.ts:104-107`:
```ts
lines.push(`${i2}<cac:GoodsItem>`);
lines.push(`${i3}${cbcTag('RequiredCustomsID', '')}`);
lines.push(`${i2}</cac:GoodsItem>`);
```

`cbcTag` boş string durumunda `''` döner (xml-helpers.ts:37). `joinLines` boşları filtreler. Sonuç: **`<cac:GoodsItem></cac:GoodsItem>`** boş açılış/kapanış.

XSD `GoodsItemType` tüm alt alanları `minOccurs="0"` — boş element geçerli. Ama canonical `Irsaliye-Ornek1.xml:152-154`:
```xml
<cac:GoodsItem>
  <cbc:ValueAmount currencyID="TRY">35200</cbc:ValueAmount>
</cac:GoodsItem>
```

Kullanıcıya **toplam mal değeri** yazmak için API yok. `DespatchShipmentInput` içinde `goodsValueAmount` benzeri alan tanımlı değil. Skill §7.1: "`GoodsItem/ValueAmount` — Toplam mal değeri (TRY currencyID ile)".

**→ Bulgu §11.4 O1 (ORTA).**

### 4.8 Shipment/ID

Kütüphane satır 102: `lines.push(\`${i2}${cbcTag('ID', '1')}\`);` — hard-coded "1".

Canonical `Irsaliye-Ornek1.xml:151`: `<cbc:ID/>` — boş.

XSD `ShipmentType.ID` zorunlu. Hem "1" hem `<cbc:ID/>` (boş) muhtemelen geçerli (XSD string restrictionless). D04 §O6 teyit edildi — aynı "1" hard-code fatura delivery-serializer Shipment'ında da var.

**→ Bulgu §11.4 O2 (ORTA — cosmetic + hardcode).**

### 4.9 DriverPerson — Person XSD Sequence

`PersonType` XSD (2239-2250):
```
FirstName, FamilyName, Title, MiddleName, NameSuffix, NationalityID, FinancialAccount, IdentityDocumentReference
```

Kütüphane `despatch-serializer.ts:126-133`:
```ts
lines.push(`${i4}${cbcTag('FirstName', dp.firstName)}`);
lines.push(`${i4}${cbcTag('FamilyName', dp.familyName)}`);
lines.push(`${i4}${cbcTag('NationalityID', dp.nationalityId)}`);  // Title'dan ÖNCE
if (isNonEmpty(dp.title)) {
  lines.push(`${i4}${cbcTag('Title', dp.title)}`);                 // NationalityID'den SONRA
}
```

**XSD sequence ihlali:** Lib `FirstName, FamilyName, NationalityID, Title`; XSD ister `FirstName, FamilyName, Title, MiddleName, NameSuffix, NationalityID`.

Canonical `Irsaliye-Ornek1.xml:161-172` DriverPerson sırası: `FirstName, FamilyName, Title, NationalityID` — XSD ile uyumlu.

xmllint fails. **→ Bulgu §11.1 K4 (KRİTİK) — D04 §O1 Person MiddleName bulgusunun DriverPerson görünümü, KRİTİK'e yükselir çünkü her irsaliye çıktısında DriverPerson varsa tetiklenir.**

**Not:** D04 §O1 party-serializer `Person` bloğu (Fatura TCKN tarafında) için **MiddleName FamilyName öncesinde** diye ORTA olarak işaretlenmişti. Oraya bakınca gerçekte `FirstName, MiddleName, FamilyName, NationalityID` — bu da XSD ihlali (`MiddleName` FamilyName'den sonra olmalı ve Title/NameSuffix ondan önce gelir). D06 burada aynı fonksiyonun **DriverPerson tarafında** da yanlış olduğunu teyit eder. **Ortak kök neden: party-serializer ve despatch-serializer Person sequence'ını çözmüyor.**

---

## 5. DespatchLine — Fatura InvoiceLine'dan Farkı

`DespatchLineType` XSD (1362-1375):
```
ID, Note (0..n), DeliveredQuantity (0..1), OutstandingQuantity (0..1), OutstandingReason (0..n),
OversupplyQuantity (0..1), OrderLineReference (1), DocumentReference (0..n), Item (1), Shipment (0..n)
```

Kütüphane `line-serializer.ts:93-123` `serializeDespatchLine`:
```
DespatchLine > ID, DeliveredQuantity (unitCode), OrderLineReference/LineID, Item/Name + AdditionalItemIdentification
```

### 5.1 Fatura pattern re-use olmamış — ✅

- **InvoiceLine** (line-serializer.ts:10-90): Price, LineExtensionAmount, TaxTotal, WithholdingTaxTotal, Delivery, AllowanceCharge var.
- **DespatchLine** (line-serializer.ts:92-123): yalnızca Item, DeliveredQuantity, OrderLineReference. **NO Price, NO LineExtensionAmount, NO TaxTotal.** ✅

**Uyumlu** — İrsaliye'nin "parasal değil, mal hareketi" semantiği korunmuş (Skill §8 + §9.9 "Vergi/matrah alanları yazılmış" yaygın hata olarak işaretliyor). **Bulgu değil.**

### 5.2 OrderLineReference — Zorunluluğa ek

`DespatchLineType` XSD: `OrderLineReference (1)` zorunlu.

Kütüphane satır 104-106: `<cac:OrderLineReference><cbc:LineID>{line.id}</cbc:LineID></cac:OrderLineReference>` — DespatchLine.ID'yi OrderLine.LineID olarak refere ediyor. Semantik olarak yanlış (OrderLineReference sipariş satırına referanstır, kendine değil), ama XSD sequence doğru ve Schematron OrderLineReference varlığını zorlamaz. Semantik olarak **≠ sipariş satırı**, ama bu sipariş olmaksızın emit edilmek zorunda (XSD zorlaması).

Canonical `Irsaliye-Ornek1.xml:207-209`: `<cac:OrderLineReference><cbc:LineID>1</cbc:LineID></cac:OrderLineReference>` — aynı pattern. **Uyumlu — bulgu değil.**

### 5.3 OutstandingQuantity / OversupplyQuantity — Kapsam Dışı

Skill `senaryo-temel-irsaliye-v0.3.md §4.2` "Kısmi Gönderim" senaryosu → `DespatchLine/OutstandingQuantity + OutstandingReason` ve canonical `Irsaliye-Ornek2.xml` bu alanı emit eder.

Kütüphane `DespatchLineInput` bu alanları desteklemiyor. Kullanıcı "20 tane sipariş, 10'u gönderildi, 10 kaldı" senaryosunu kitapla ifade edemez.

**→ Bulgu §11.3 Y5 (YÜKSEK — senaryo desteği eksik).**

### 5.4 Shipment (satır bazlı 0..n) — Kapsam Dışı

Canonical `Irsaliye-Ornek1.xml:216-231` her DespatchLine içinde satır bazlı `<cac:Shipment><cac:GoodsItem><cac:InvoiceLine>...` emit ediyor (Price + InvoicedQuantity bağlantısı). 

DespatchLineType XSD `Shipment (0..n)` 0'dan başlar ⇒ opsiyonel. Lib emit etmiyor. Schematron zorlamıyor. **Uyumlu (kapsam dışı desen).**

---

## 6. Zorunlu Alanlar — Checklist

| Alan | XSD (DespatchAdvice) | Schematron | Lib Validator (`validateDespatch`) | Lib Serializer | Uyum |
|---|---|---|---|---|---|
| `UBLVersionID` | 1 | — | yok runtime | hard-coded "2.1" | ✅ |
| `CustomizationID` | 1 | CustomizationIDCheck | yok runtime | hard-coded "TR1.2.1" | ✅ |
| `ProfileID` | 1 | ProfileIDTypeDespatchAdvice | isNonEmpty var, **whitelist yok** | emit var | ⚠ §11.4 O3 |
| `ID` | 1 | InvoiceIDCheck | regex var | emit var | ✅ |
| `CopyIndicator` | 1 | — | yok | hard-coded "false" | ✅ |
| `UUID` | 1 | UUIDCheck | regex var | emit var | ✅ |
| `IssueDate` | 1 | — (format DespatchDateCheck Shipment içi) | regex var | emit var | ✅ |
| `IssueTime` | **1** | — | **opsiyonel kabul ediyor** | **opsiyonel emit** | ❌ §11.1 K1 |
| `DespatchAdviceTypeCode` | 0..1 | DespatchAdviceTypeCodeList | isNonEmpty var, **whitelist yok** | hep emit | ⚠ §11.4 O3 |
| `DespatchSupplierParty` | 1 | DespatchSupplierParty/Party/PartyIdentification TCKN/VKN | `validateParty` | emit (DespatchContact hariç) | ⚠ §11.1 K2 |
| `DeliveryCustomerParty` | 1 | DeliveryCustomerParty/Party/PartyIdentification TCKN/VKN | `validateParty` | emit | ✅ |
| `Shipment` | 1 | DespatchDateCheck, TimeCheck, AddressCheck, CarrierDriverCheck | var | emit (TransportHandlingUnit hariç) | ⚠ §11.3 Y4 |
| `DespatchLine` (1..n) | 1..∞ | DeliveredQuantityCheck, ItemNameCheck, DespatchLineIdCheck, IdisEtiketNoCheck | `lines.length > 0`, item.name | emit | ✅ |

### 6.1 Schematron Kural Kapsamı

`UBL-TR_Common_Schematron.xml:701-763` abstract kuralları + `UBL-TR_Main_Schematron.xml:472-527` context'te genişletmeler:

| Abstract Kural | Kapsam | validateDespatch kapsıyor mu? |
|---|---|---|
| DespatchAdviceTypeCodeCheck | Değer whitelist + MATBUDAN → AdditionalDocumentReference(ID+IssueDate) | Kısmen: MATBUDAN check var ama **değer whitelist yok**; `DocumentType='MATBU'` kontrolü yok |
| InvoiceIDCheck | ^[A-Z0-9]{3}20\d{2}\d{9}$ | ✅ `INVOICE_ID_REGEX` |
| CustomizationIDCheck | `TR1.2` (fatura) / `TR1.2.1` (despatch) | Runtime kontrol **yok** (serializer hardcode — risk yok) |
| ProfileIDTypeDespatchAdvice | Whitelist `TEMELIRSALIYE/HKSIRSALIYE/IDISIRSALIYE` | `isNonEmpty` var, whitelist **yok** (enum TS seviyesinde kapsar — `as any` ile kaçak riski) |
| DespatchDateCheck | `ActualDespatchDate` non-empty + YYYY-MM-DD | ✅ |
| DespatchTimeCheck | `ActualDespatchTime` non-empty | ✅ (validator + `!isNonEmpty` → error) |
| DespatchAddressCheck | CitySubdivisionName + CityName + Country/Name + PostalZone regex | ✅ (4 alan için missingField + regex) |
| DespatchCarrierDriverCheck | DriverPerson **veya** CarrierParty (1+) + DriverPerson alt alanları | ✅ (satır 94-109) |
| DespatchAdviceHKSKunyeCheck | HKSIRSALIYE → her satırda KUNYENO 19-char | ✅ (satır 146-157) |
| DespatchIdisEtiketNoCheck | IDISIRSALIYE → her satırda ETIKETNO 2-harf+7-rakam | ✅ (satır 170-179) |
| DespatchIdisSevkiyatNoCheck | IDISIRSALIYE → DespatchSupplierParty/PartyIdentification schemeID='SEVKIYATNO' pattern 'SE-' + 7 rakam | ✅ (satır 161-168) |
| DeliveredQuantityCheck | DeliveredQuantity non-empty + @unitCode dolu | Kısmen: `unitCode` unitCode kontrolü var, **value kontrolü yok** (`deliveredQuantity` number, undefined olabilir — TS seviyesinde kapsar ama 0 geçerli kabul edilir) |
| ItemNameCheck | Item/Name non-empty | ✅ |
| DespatchLineIdCheck | cbc:ID **number olmalı** (`string(number(cbc:ID)) != 'NaN'`) | **Eksik:** yalnız isNonEmpty kontrol ediyor, numeric kontrol YOK |
| LicensePlateIDSchemeIDCheck | schemeID `DORSE`/`PLAKA` | ✅ (LICENSE_PLATE_SCHEME_IDS Set) |
| PartyIdentificationTCKNVKNCheck (cross) | DespatchSupplier/DeliveryCustomer/BuyerCustomer/CarrierParty için VKN(10) veya TCKN(11) | Kısmen: supplier+customer için `validateParty` var, CarrierParty için **yok** (şu an Shipment.carrierParty için hiç whitelist/validator yok) |
| PartyIdentificationPartyNamePersonCheck (cross) | VKN → PartyName zorunlu, TCKN → Person zorunlu | Fatura validator'larında var, İrsaliye'de teyidi — §7 detaylı |
| PartyIdentificationSchemeIDCheck (cross) | schemeID whitelist `PartyIdentificationIDType` | Runtime whitelist **yok** |
| DocumentSenderCheck / DocumentReceiverCheck | Sender/Receiver tekil VKN/TCKN kontrolü | Muhtemelen Schematron kaynaklı, lib kapsamı **net değil** |

**Schematron kapsamı kabaca:** 19 kuraldan ~13 tam, ~4 kısmi, ~2 eksik. **→ Bulgular §11.4 O3/O4/O5/O6.**

---

## 7. Validator Kapsamı — `despatch-validators.ts` (183 satır)

### 7.1 İyi tarafı

- Zorunlu alanlar (id, uuid, profileId, despatchTypeCode, issueDate) tamamı kontrol
- Regex'ler: INVOICE_ID_REGEX, UUID_REGEX, DATE_REGEX, TIME_REGEX, POSTAL_ZONE_REGEX
- Party validasyonu (`validateParty` ortak kullanım)
- Shipment alt alanları (date/time/address/driver/carrier)
- MATBUDAN → AdditionalDocumentReference cross-check
- HKSIRSALIYE → KUNYENO 19-char per satır
- IDISIRSALIYE → SEVKIYATNO + ETIKETNO per satır

### 7.2 Eksiklikler

1. **DespatchTypeCode whitelist**: `isNonEmpty` var ama `SEVK|MATBUDAN` whitelist kontrol yok. TS enum `as any` ile kaçar. **→ §11.4 O3**
2. **DespatchProfileId whitelist**: aynı. **→ §11.4 O3**
3. **MATBUDAN + DocumentType='MATBU' cross-check eksik**: Schematron `DespatchAdviceTypeCodeCheck` yalnız `AdditionalDocumentReference` varlığını ve `ID` + `IssueDate` dolu olmasını kontrol eder; lib de aynı. Skill §6.2 **"`DocumentType = MATBU` sabit değer"** belirtmiş — lib bu kontrolü yapmıyor. Schematron da yapmıyor (sıkı aranırsa kılavuz istisnası). **Uyumluluk seviyesi:** Schematron ile uyumlu, ama skill önerisi açısından eksik. **→ §11.4 O7**
4. **DespatchLineIdCheck Schematron numeric kontrolü**: `string(number(cbc:ID)) != 'NaN'` ister; lib sadece `isNonEmpty` kontrol. "ABC" gibi id verilse geçer. **→ §11.4 O4**
5. **DeliveredQuantity value kontrolü**: lib sadece `line.unitCode` kontrolü, `deliveredQuantity` number type ile kapsanıyor. `0` değeri geçerli kabul ediliyor — Schematron `string-length(normalize-space(string(...))) != 0` der, 0 geçer ama semantik olarak sıfır teslimat mantıksız. Skill normatifleştirmiyor — **B durumu, bulgu değil**.
6. **CarrierParty alt validasyonu**: `s.carrierParty` varsa VKN/TCKN format + PartyIdentification schemeID kontrol yok. Schematron `PartyIdentificationTCKNVKNCheck` + `PartyIdentificationSchemeIDCheck` Carrier üzerinde de çalışır. **→ §11.4 O5**
7. **DriverPerson NationalityID format**: Schematron `DespatchCarrierDriverCheck` sadece non-empty ister. TCKN'se 11-rakam kontrolü skill'de §7.1 istenir. Lib sadece non-empty. **→ §11.5 DÜŞÜK**
8. **IDISIRSALIYE + DespatchTypeCode='MATBUDAN' kombinasyonu**: Skill açıkça çelişki göstermiyor ama IDIS senaryosunda MATBUDAN normalde olmamalı. Validator cross-check yapmaz. **B — bulgu değil**.

---

## 8. Fatura vs İrsaliye Ortak Kod Kullanımı

### 8.1 Ortak Serializer'lar

| Serializer | Invoice kullanıyor | Despatch kullanıyor | Tutarlılık |
|---|---|---|---|
| `serializeParty` | ✅ (Supplier/Customer) | ✅ (Supplier/Customer) | ✅ aynı — ortak PartyType XSD |
| `serializeAddress` | ✅ (Delivery) | ✅ (DeliveryAddress) | ✅ |
| `serializeAdditionalDocument` | ✅ | ✅ | ✅ aynı çıktı |
| `serializeOrderReference` | ✅ | ✅ | ✅ aynı |
| `serializeDespatchLine` vs `serializeInvoiceLine` | — | sadece despatch | ✅ farklı — doğru |
| `cbcTag`, `joinLines`, `xmlDeclaration` | ✅ | ✅ | ✅ |
| `UBL_CONSTANTS.customizationId` | ✅ (TR1.2.1) | ✅ (TR1.2.1) | ❌ **Fatura için yanlış** (skill Fatura TR1.2, İrsaliye TR1.2.1) |

### 8.2 UBL_CONSTANTS Çift Kullanımı — D04 Y7 Teyit

`src/config/namespaces.ts:26-30`:
```ts
export const UBL_CONSTANTS = {
  ublVersionId: '2.1',
  customizationId: 'TR1.2.1',
  copyIndicator: 'false',
} as const;
```

**Despatch için doğru**, **Fatura için yanlış** (D04 §Y7). İki belge tipi aynı sabit'i paylaşıyor; Fatura serializer da aynı sabiti çekiyor (invoice-serializer.ts:58). **Despatch tarafında bulgu değil — Fatura tarafında D04'te sayıldı.** Burada sadece teyit: ortak değer, bir tarafta doğru bir tarafta yanlış.

### 8.3 `serializeParty` İrsaliye'de DespatchContact Emit Etmez

`party-serializer.ts:6-85` fonksiyonu `<cac:Party>...</cac:Party>` üretir. `DespatchSupplierParty/DespatchContact` için **fonksiyon dışı** bir wrapping gerek — `serializeDespatch` satır 72-74'te sadece Party emit ediyor. 

Bu mimari sorun: ortak `serializeParty`'yi koruyarak İrsaliye'ye özel DespatchContact'ı Despatch serializer'ına enjekte etmek gerekli. **§11.1 K2 düzeltme yolu:** `serializeDespatch`'e opsiyonel DespatchContact handling eklenmeli; `serializeParty` değiştirilmemeli.

### 8.4 Tutarsızlık Riski Değerlendirmesi

| Durum | Risk |
|---|---|
| Party+Address paylaşımı | Düşük — tek XSD tanım, tek davranış |
| Reference paylaşımı | Düşük — aynı DocumentReferenceType |
| InvoiceLine ↔ DespatchLine | Yok — ayrı fonksiyonlar |
| UBL_CONSTANTS paylaşımı | Orta — CustomizationID farklı olmalı |
| Person (party-serializer.ts TCKN) ↔ DriverPerson (despatch-serializer.ts inline) | Orta — XSD sequence sorunları iki yerde aynı kök |
| Address (delivery-serializer.ts serializeAddress) ↔ PostalAddress (party-serializer.ts serializePostalAddress) | Düşük — farklı tip (Delivery uses AddressType, Party uses AddressType — aynı tip ama farklı element wrap) |

---

## 9. Test Coverage — `__tests__/builders/despatch-builder.test.ts` (172 satır)

### 9.1 Mevcut testler

| Test grubu | Kapsam |
|---|---|
| `build() — TEMELIRSALIYE SEVK` | Happy path (7 expect blok): UBL sabitleri, ProfileID, TypeCode, tarih+saat, driver, plaka, DespatchLine |
| `validasyon hataları` | 3 senaryo: shipment eksik / driver-carrier ikisi de eksik / MATBUDAN + AdditionalDocumentReference eksik |
| `HKSIRSALIYE profili` | 2 senaryo: KUNYENO yok hata; KUNYENO var OK |
| `buildUnsafe()` | 1 senaryo: validasyon atlama |

### 9.2 Kapsam dışı (eksik testler)

| Senaryo | Neden eksik önemli |
|---|---|
| **IDISIRSALIYE** | Hiç test yok — SEVKIYATNO + ETIKETNO format kontrolleri `despatch-validators.ts:159-180` test-edilmedi |
| **TEMELIRSALIYE MATBUDAN** | Sadece "AdditionalDocumentReference eksik" hatası test edildi, MATBUDAN happy path + DocumentType emit kontrolü yok |
| **CarrierParty-only** (DriverPerson'suz) | `DespatchCarrierDriverCheck` alternative branch test edilmedi |
| **OrderReference** | Hiç test yok — skill §3 #13 seçimli 0..n |
| **IssueTime eksik** | Test `issueTime: '10:30:00'` ile hep dolu — **IssueTime'ın zorunlu olup olmaması test edilmemiş** (§11.1 K1 ile uyumlu: test yanlış beklenti taşımıyor ama eksik kural bulgusu yakalanmıyor) |
| **Çoklu DriverPerson** | Canonical örnek 2 DriverPerson ama lib tek destekler — D06 yeni bulgu mu? `DespatchShipmentInput.driverPerson` tek — çoklu için `driverPersons?: DriverPersonInput[]` gerek. **→ §11.3 Y6** |
| **DORSE plate** | Test sadece PLAKA kullanıyor — DORSE validation code path + §4.6 tartışması test-dışı |
| **Element order (XSD sequence)** | **Hiçbir test element sırasını doğrulamıyor** — §11.1 K1/K2/K3/K4 bulgularının hepsi mevcut test setiyle YAKALANAMIYOR |
| **BuyerCustomer/Seller/Originator party** | Yok (input tipinde yok) — §11.3 Y3 |
| **TransportHandlingUnit/dorse canonical** | Yok — §11.3 Y4 |
| **DespatchContact/Name "Teslim Eden"** | Yok — §11.1 K2 |
| **`buildUnsafe()` → XSD validation** | xmllint-based test yok — sequence hataları CI'da yakalanmıyor (D04 §D4 ile aynı örüntü) |

**D05 §Özel Not "test-kör-alan örüntüsü" devamı:** D06 test suite'i **hiçbir element sırasını kontrol etmiyor** — `toContain` ile tek eleman varlığı teyit ediliyor, sequence validate edilmiyor. §11.1'in 4 KRİTİK XSD sequence bulgusu test suite tarafından **yapısal olarak yakalanamaz**. 

**→ Bulgu §11.5 (TEST DÜŞÜK) + genel sistem bulgusu.**

### 9.3 Test girdisi yanlışlıkları

```ts
driverPerson: {
  firstName: 'Mehmet',
  familyName: 'Kara',
  nationalityId: 'TR',       // ← 11-rakam TCKN yerine 'TR' ISO kodu!
},
```

Skill §7.1 `DriverPerson/NationalityID schemeID="TCKN"` → 11-rakam TCKN. Schematron lib seviyesinde yalnız non-empty kontrol ediyor ama semantik yanlış. Testin değeri format-incorrect ama lib kabul ediyor. **D05 TEST kategorisi örüntüsünün tekrarı: test lib'in yanlış davranışını onaylıyor.**

**→ Bulgu §11.5 (TEST DÜŞÜK).**

---

## 10. Örnek XML'ler — `examples/output/`

`json2ubl-ts/examples/output/` klasörü 30 alt klasör içeriyor (01-30), hepsi **Fatura senaryoları**. İrsaliye için **tek bir örnek çıktı yok**.

`examples/scenarios.ts` içinde `despatch|Despatch|DESPATCH|irsaliye` grep'i 1 dosya eşleşme veriyor — sadece scenarios.ts'te bir referans var; `run-all.ts` despatch demo üretmiyor.

**D04 §D1 "examples/output stale" bulgusu**nun devamı: 
- Fatura örnekleri var ama stale (UBLExtensions + Signature eski dosyalarda)
- **İrsaliye örnekleri hiç yok** — yeni kullanıcı "nasıl kullanırım" sorusuyla karşılaştığında DespatchBuilder için referans çıktı yok

**→ Bulgu §11.4 O8 (ORTA — geliştirici deneyimi).**

---

## 11. Bulgu Özeti

### 11.1 KRİTİK Bulgular

#### [KRİTİK][KÜTÜPHANE] K1 — IssueTime XSD'de zorunlu, lib opsiyonel

- **Dosya:** `src/types/despatch-input.ts:36`, `src/serializers/despatch-serializer.ts:43-45`, `src/validators/despatch-validators.ts:46-48`
- **Gözlem:** `DespatchInput.issueTime?: string` opsiyonel; serializer `if (input.issueTime)` koşuluyla emit ediyor; validator sadece var olduğunda format kontrol ediyor. IssueTime verilmeden builder çalışır ve IssueTime'sız XML üretir.
- **Normatif referans:** `UBL-DespatchAdvice-2.1.xsd:17` — `<xsd:element ref="cbc:IssueTime"/>` (minOccurs yok ⇒ default=1). Skill `e-irsaliye-ubl-tr-v1.2.md §3 #9`: "IssueTime | **1** | zorunlu — Fatura'dan farklı (Fatura'da seçimli 0..1)". Skill §9 #2 yaygın hata: "Fatura'da seçimli olduğu için kopya kod yazıldıysa atlanabilir — İrsaliye'de zorunlu".
- **Durum tipi:** A (Skill + XSD diyor, kütüphane yanlış)

#### [KRİTİK][KÜTÜPHANE] K2 — DespatchSupplierParty/DespatchContact/Name ("Teslim Eden") desteksiz

- **Dosya:** `src/types/despatch-input.ts:26` + `src/serializers/despatch-serializer.ts:71-74`
- **Gözlem:** `DespatchInput.supplier: PartyInput` yalnız `<cac:Party>` üretiyor. `<cac:DespatchContact><cbc:Name>...</cbc:Name></cac:DespatchContact>` için input alanı + serializer emit yolu yok. Kullanıcı "Teslim Eden kişi adı"nı belgeye yazamaz.
- **Normatif referans:** `UBL-CommonAggregateComponents-2.1.xsd:2758-2763` `SupplierPartyType = {Party, DespatchContact(0..1)}`. Skill `e-irsaliye-ubl-tr-v1.2.md §5.4` (**PDF §2.3.16, v0.4 değişikliği**): "DespatchSupplierParty/DespatchContact/Name içine Teslim Eden kişi adı yazılır". Canonical `Irsaliye-Ornek1.xml:111-113`.
- **Durum tipi:** A (Skill açıkça diyor, lib desteksiz)

#### [KRİTİK][KÜTÜPHANE] K3 — Shipment/Delivery çocuk sırası XSD ihlali

- **Dosya:** `src/serializers/despatch-serializer.ts:138-165` (`serializeShipmentBlock` içinde Delivery bloğu)
- **Gözlem:** Lib emit sırası `<cac:Delivery> { Despatch, DeliveryAddress, CarrierParty }`. XSD `DeliveryType` ister: `{ ..., DeliveryAddress, ..., CarrierParty, ..., Despatch, ... }`. 3 elemanın sırası tamamen ters. xmllint `UBL-DespatchAdvice-2.1.xsd` ile her irsaliye çıktısını reddeder.
- **Normatif referans:** `UBL-CommonAggregateComponents-2.1.xsd:1310-1328` `DeliveryType` sequence.
- **Durum tipi:** B (XSD kesin, skill detayı yok — D04 §K6 teyit + genişleme: D04 yalnız "Despatch DeliveryAddress öncesinde" demişti, gerçekte 3 pozisyon ihlali)

#### [KRİTİK][KÜTÜPHANE] K4 — DriverPerson Person XSD sequence ihlali

- **Dosya:** `src/serializers/despatch-serializer.ts:124-134`
- **Gözlem:** Lib `FirstName, FamilyName, NationalityID, Title` sırasıyla emit ediyor. XSD `PersonType` ister: `FirstName, FamilyName, Title, MiddleName, NameSuffix, NationalityID`. Title **NationalityID'den önce** gelmeli.
- **Normatif referans:** `UBL-CommonAggregateComponents-2.1.xsd:2239-2250` `PersonType` sequence. Canonical `Irsaliye-Ornek1.xml:161-166` doğru sırayı gösterir: `FirstName, FamilyName, Title, NationalityID`.
- **Durum tipi:** B (XSD kesin; D04 §O1 party-serializer Person MiddleName bulgusunun DriverPerson paraleli — her irsaliyede DriverPerson var ise tetikler, KRİTİK)

### 11.2 (boş)

### 11.3 YÜKSEK Bulgular

#### [YÜKSEK][KÜTÜPHANE] Y1 — LineCountNumeric XSD'de 0..1, lib hiç emit etmiyor

- **Dosya:** `src/serializers/despatch-serializer.ts:55-60` (Note ile OrderReference arasında olması gerekirdi), `src/types/despatch-input.ts`
- **Gözlem:** XSD `DespatchAdviceType` sequence'inde `cbc:LineCountNumeric` (0..1) var. Lib ne input'ta ne serializer'da destekliyor. Opsiyonel olduğu için XSD reddetmez ama kullanıcı emit etmek istediğinde yolu yok.
- **Normatif referans:** `UBL-DespatchAdvice-2.1.xsd:20`. Skill §4 #12.
- **Durum tipi:** B (XSD tanımlı, skill opsiyonel; lib kapsamı eksik)

#### [YÜKSEK][KÜTÜPHANE] Y2 — OrderReference 0..n, lib 0..1 destekliyor

- **Dosya:** `src/types/despatch-input.ts:40` (`orderReference?: OrderReferenceInput` — tekil), `src/serializers/despatch-serializer.ts:58-60`
- **Gözlem:** XSD `cac:OrderReference` `minOccurs="0" maxOccurs="unbounded"`. Skill `e-irsaliye-ubl-tr-v1.2.md §4 #13`: "Fatura'da 0..1 tek, İrsaliye'de **0..n çoklu**". Senaryo: "İrsaliye birden fazla siparişi karşılayabilir".
- **Normatif referans:** `UBL-DespatchAdvice-2.1.xsd:21`. Skill §4.
- **Durum tipi:** A (Skill net diyor "çoklu"; lib tekil)

#### [YÜKSEK][KÜTÜPHANE] Y3 — BuyerCustomerParty / SellerSupplierParty / OriginatorCustomerParty desteksiz

- **Dosya:** `src/types/despatch-input.ts` (tamamı), `src/serializers/despatch-serializer.ts` (tamamı)
- **Gözlem:** Üç party tipi de XSD'de `0..1` tanımlı; input'ta alan yok, serializer'da emit yok. Skill `senaryo-temel-irsaliye-v0.3.md §4.3` "Farklı Tarafların Bulunduğu e-İrsaliye" senaryosu üçünü de kullanır. Canonical `Irsaliye-Ornek3.xml` 4 party'nin tümünü emit eder. Lib bu senaryoyu üretemez.
- **Normatif referans:** `UBL-DespatchAdvice-2.1.xsd:26-28`. Skill §4 + senaryo §4.3.
- **Durum tipi:** A (Skill + canonical örnek diyor, lib desteksiz)

#### [YÜKSEK][KÜTÜPHANE] Y4 — TransportHandlingUnit emit yolu yok

- **Dosya:** `src/types/despatch-input.ts:48-61` (`DespatchShipmentInput`), `src/serializers/despatch-serializer.ts:101-166`
- **Gözlem:** `ShipmentType` XSD `cac:TransportHandlingUnit (0..n)` destekli ama lib hiçbir durumda emit etmez. Canonical `Irsaliye-Ornek1.xml:195-202` dorse plakalarını burada emit ediyor (`TransportEquipment/ID[schemeID="DORSEPLAKA"]`). Lib bu yapıya alternatif olarak dorse'yi `LicensePlateID[schemeID="DORSE"]` altına koyuyor — Codelist'e uygun ama canonical ile uyumsuz. Kullanıcının canonical yapıyı seçmesi için yol yok.
- **Normatif referans:** `UBL-CommonAggregateComponents-2.1.xsd:2637, 3106-3127` (ShipmentType + TransportHandlingUnitType + TransportEquipmentType). Skill `e-irsaliye-ubl-tr-v1.2.md §7`. Canonical `Irsaliye-Ornek1.xml:195-202`.
- **Durum tipi:** B (XSD + canonical var; lib yalnız alternatif path'i sunuyor — kapsam eksik)

#### [YÜKSEK][KÜTÜPHANE] Y5 — OutstandingQuantity / OutstandingReason / OversupplyQuantity desteksiz

- **Dosya:** `src/types/despatch-input.ts:89-99` (`DespatchLineInput`)
- **Gözlem:** Kısmi gönderim senaryosu (`senaryo-temel-irsaliye-v0.3.md §4.2`) için `DespatchLine/OutstandingQuantity + OutstandingReason` + fazla gönderim için `OversupplyQuantity` kullanılır. `DespatchLineType` XSD bu alanları sıralar (0..1 ve 0..n). Lib input'ta hiç biri yok — kısmi gönderim e-İrsaliyesi üretilemez.
- **Normatif referans:** `UBL-CommonAggregateComponents-2.1.xsd:1367-1369`. Skill senaryo §4.2.
- **Durum tipi:** A (Skill + XSD + canonical örnek; lib kapsam dışı)

#### [YÜKSEK][KÜTÜPHANE] Y6 — Çoklu DriverPerson desteksiz

- **Dosya:** `src/types/despatch-input.ts:56` (`driverPerson?: DriverPersonInput` — tekil), `src/serializers/despatch-serializer.ts:124-134`
- **Gözlem:** Skill §7 + canonical `Irsaliye-Ornek1.xml:161-172` **2 DriverPerson** emit eder. `ShipmentStageType` XSD `DriverPerson maxOccurs="unbounded"`. Lib tek destekliyor.
- **Normatif referans:** Canonical örnek + `UBL-CommonAggregateComponents-2.1.xsd` ShipmentStageType (Grep üzerinden 2645-2660 bölgesi). Skill §7 "Birden fazla şoför olabilir".
- **Durum tipi:** A (Skill + canonical diyor çoklu; lib tekil)

### 11.4 ORTA Bulgular

#### [ORTA][KÜTÜPHANE] O1 — Shipment/GoodsItem/ValueAmount emit yolu yok

- **Dosya:** `src/types/despatch-input.ts:48-61`, `src/serializers/despatch-serializer.ts:104-107`
- **Gözlem:** Lib hard-coded `<cac:GoodsItem><cbc:RequiredCustomsID/></cac:GoodsItem>` emit (boş). Kullanıcı toplam mal değerini (`ValueAmount currencyID="TRY"`) yazacak alan yok. Skill §7.1: "GoodsItem/ValueAmount — Toplam mal değeri (TRY currencyID ile)".
- **Normatif referans:** Skill §7.1. Canonical `Irsaliye-Ornek1.xml:152-154`.
- **Durum tipi:** B (Skill öneri, canonical emit; opsiyonel ama input yolu olmalı)

#### [ORTA][KÜTÜPHANE] O2 — Shipment/ID hard-coded "1"

- **Dosya:** `src/serializers/despatch-serializer.ts:102` (+ `delivery-serializer.ts:88` aynı pattern IHRACAT tarafında)
- **Gözlem:** Lib `<cbc:ID>1</cbc:ID>` hard-code. Canonical `<cbc:ID/>` (boş). XSD'de dize restrictionless; hem "1" hem boş geçer. Ama mimari olarak kullanıcının ID'yi kendi değeri ile override etmesi mümkün değil. D04 §O6 aynı bulgu.
- **Normatif referans:** `UBL-CommonAggregateComponents-2.1.xsd:2621` (`<xsd:element ref="cbc:ID"/>`).
- **Durum tipi:** B (D04 teyit; cosmetic)

#### [ORTA][KÜTÜPHANE] O3 — DespatchProfileId + DespatchTypeCode runtime whitelist yok

- **Dosya:** `src/validators/despatch-validators.ts:32-38`
- **Gözlem:** Validator `isNonEmpty` kontrolü yapar; Codelist whitelist (`,TEMELIRSALIYE,HKSIRSALIYE,IDISIRSALIYE,` ve `,SEVK,MATBUDAN,`) runtime enforce edilmez. TS enum `as any` veya JSON deserialize ile yanlış değer sızabilir. Schematron `ProfileIDTypeDespatchAdvice` + `DespatchAdviceTypeCodeCheck` bu whitelist'i zorlar; lib'in GİB'e göndermeden önce yakalama fırsatı var.
- **Normatif referans:** `UBL-TR_Codelist.xml:7, 11`. D03 Despatch/Invoice/Profile whitelist runtime yok (ORTA) bulgusunun teyidi.
- **Durum tipi:** A (Schematron + Codelist diyor; lib enforce etmiyor)

#### [ORTA][KÜTÜPHANE] O4 — DespatchLineIdCheck numeric kontrolü eksik

- **Dosya:** `src/validators/despatch-validators.ts:124-127`
- **Gözlem:** Schematron `DespatchLineIdCheck`: `cbc:ID` **gerçek sayı** olmalı (`string(number(cbc:ID)) != 'NaN'`). Lib yalnız `isNonEmpty`. "ABC" gibi string id geçer ve GİB tarafında Schematron red eder.
- **Normatif referans:** `UBL-TR_Common_Schematron.xml:717-719`.
- **Durum tipi:** A (Schematron diyor, lib eksik)

#### [ORTA][KÜTÜPHANE] O5 — CarrierParty alt validasyonu eksik

- **Dosya:** `src/validators/despatch-validators.ts` (CarrierParty için spesifik kontrol yok)
- **Gözlem:** Schematron `PartyIdentificationTCKNVKNCheck` + `PartyIdentificationSchemeIDCheck` `Shipment/Delivery/CarrierParty/PartyIdentification` için çalışır. Lib `validateParty` CarrierParty için çağrılmıyor; VKN(10)/TCKN(11) format + schemeID whitelist kontrolü yok.
- **Normatif referans:** `UBL-TR_Main_Schematron.xml:505-509`.
- **Durum tipi:** A (Schematron diyor, lib eksik)

#### [ORTA][KÜTÜPHANE] O6 — PartyIdentificationSchemeIDCheck runtime yok

- **Dosya:** `src/validators/` — genel
- **Gözlem:** Schematron `PartyIdentificationSchemeIDCheck` schemeID değerinin `PartyIdentificationIDType` whitelist'inde olmasını ister. Lib `PARTY_IDENTIFICATION_SCHEME_IDS` set'i export ediyor (index.ts) ama runtime'da `validateParty`/`validateDespatch` bunu kullanmıyor. D02+D03 aynı bulgunun Despatch görünümü. **Çift sayım: D03 §"Party additionalIdentifiers schemeID whitelist kullanılmıyor".**
- **Normatif referans:** `UBL-TR_Codelist.xml:33`. D03 ORTA bulgusunun İrsaliye tarafı.
- **Durum tipi:** A

#### [ORTA][KÜTÜPHANE] O7 — MATBUDAN + AdditionalDocumentReference/DocumentType='MATBU' kontrol yok

- **Dosya:** `src/validators/despatch-validators.ts:137-143`
- **Gözlem:** Lib MATBUDAN'da `additionalDocuments.length > 0` kontrol eder. Ancak Skill §6.2 açıkça "`DocumentType = MATBU` (case-sensitive) sabit" belirtir. Lib bu cross-check yapmaz. Schematron yalnız `ID + IssueDate` dolu olmayı zorlar — `DocumentType` değerini denetlemez. Skill bu detayı zorunlu kılıyor ama Schematron bırakıyor — **Durum C ya da B'nin sınırı**: Schematron kazansa bile, kullanıcı "MATBU" yazmayı atlayıp GİB tarafında manuel red görebilir.
- **Normatif referans:** Skill §6.2; Schematron `DespatchAdviceTypeCodeCheck:702-703`.
- **Durum tipi:** B (Skill sıkı, Schematron gevşek; konservatif olarak lib sıkı tarafta olmalı)

#### [ORTA][KÜTÜPHANE] O8 — examples/output'ta irsaliye çıktısı yok

- **Dosya:** `examples/output/` (30 alt klasör hepsi fatura), `examples/scenarios.ts`
- **Gözlem:** Kullanıcı `DespatchBuilder` kullanmak istediğinde referans output yok. Kütüphane D04 §D1 "stale examples" bulgusuna paralel ama irsaliyede **hiç** yok.
- **Normatif referans:** — (skill bu konuyu kapsamıyor; DX/örnek-odaklı bulgu)
- **Durum tipi:** B (D04 devamı, irsaliye kapsam eksikliği)

### 11.5 DÜŞÜK Bulgular

#### [DÜŞÜK][KÜTÜPHANE] D1 — `ublExtensionsPlaceholder()` import silindi, yorum bırakıldı

- **Dosya:** `src/serializers/despatch-serializer.ts:3,21` (working tree diff)
- **Gözlem:** `// parts.push(indentBlock(ublExtensionsPlaceholder(), ind));` ve `indentBlock` fonksiyonu satır 171-173 yoruma alınmış. D04 §D2 "ublExtensionsPlaceholder dead code" bulgusunun Despatch teyidi. Fonksiyon `xml-helpers.ts:117-127`'de hâlâ export'lu.
- **Normatif referans:** — (kod hijyeni)
- **Durum tipi:** B

#### [DÜŞÜK][KÜTÜPHANE] D2 — DriverPerson NationalityID 11-rakam TCKN kontrolü yok

- **Dosya:** `src/validators/despatch-validators.ts:106-108`
- **Gözlem:** Lib yalnız `isNonEmpty` kontrol eder. Skill §7.1 "Şoför TCKN (NationalityID schemeID="TCKN")" — 11-rakam. Lib'in TCKN regex'i var (`/^\d{11}$/` — grepleyebilirim) ama DriverPerson için kullanılmıyor.
- **Normatif referans:** Skill §7.1; Schematron yalnız non-empty zorlar, TCKN regex zorlamaz — bu lib'de opsiyonel sıkılaştırma.
- **Durum tipi:** B (skill sıkı, Schematron gevşek)

#### [DÜŞÜK][DOKÜMAN] D3 — DespatchBuilder validationLevel 'basic'↔'strict' eşdeğer

- **Dosya:** `src/builders/despatch-builder.ts:48-53`
- **Gözlem:** D03 §10.3 "DespatchBuilder validationLevel inefektif" aynı bulgu. `basic` ve `strict` ikisi de aynı `validateDespatch`'i çağırıyor; ayrım yok. JSDoc güncellemeli veya `strict` seviyesi implement edilmeli.
- **Normatif referans:** — (API tutarlılığı)
- **Durum tipi:** B (D03 teyit)

#### [DÜŞÜK][TEST] D4 — despatch-builder.test nationalityId='TR' ISO kodu

- **Dosya:** `__tests__/builders/despatch-builder.test.ts:41`
- **Gözlem:** Test TCKN yerine 'TR' ISO kodu veriyor. Lib kabul ediyor (non-empty ✓). D05'te keşfedilen "test yanlış beklentiyle lib davranışını onaylıyor" örüntüsü — burada sıkılaştırma olursa test kırılır.
- **Durum tipi:** B (D05 TEST örüntüsünün D06 örneği)

#### [DÜŞÜK][TEST] D5 — XSD sequence test coverage yok

- **Dosya:** `__tests__/builders/despatch-builder.test.ts`
- **Gözlem:** Hiçbir test element sırasını kontrol etmiyor — `toContain` yalnız varlık. §11.1 K1/K3/K4 ve §11.3 Y1 regression olarak yakalanamaz.
- **Durum tipi:** B (D04+D05 "test-kör-alan" devamı)

#### [DÜŞÜK][TEST] D6 — IDISIRSALIYE profili için test yok

- **Dosya:** `__tests__/builders/despatch-builder.test.ts` (TEMELIRSALIYE + HKSIRSALIYE kapsamı var, IDIS yok)
- **Gözlem:** `despatch-validators.ts:159-180` kodu (SEVKIYATNO + ETIKETNO format) test-edilmedi. 
- **Durum tipi:** B

#### [DÜŞÜK][SKILL] D7 — Canonical örnek DeliveryAddress Schematron'la çelişir

- **Dosya:** `Irsaliye-Ornek1.xml` (skill xmls/) 
- **Gözlem:** Canonical örnekte Shipment/Delivery altında DeliveryAddress YOK. Schematron `DespatchAddressCheck` (UBL-TR_Common_Schematron.xml:739-744) DeliveryAddress altındaki 4 alt alanı zorunlu kılıyor. Canonical Schematron'u ihlal ediyor. Skill özetinde bu tutarsızlık notu düşürülmeli; kullanıcıya "canonical'ı birebir kopyalamayın, Schematron'a uyun" uyarısı.
- **Normatif referans:** Schematron kazanır (Durum C kuralı — normatif kaynak kazanır).
- **Durum tipi:** C

#### [DÜŞÜK][SKILL] D8 — HKSIRSALIYE + IDISIRSALIYE detay kılavuzu yok

- **Dosya:** `references/` altında `senaryo-hks-irsaliye` / `senaryo-idis-irsaliye` ayrı özetler YOK
- **Gözlem:** `e-irsaliye-ubl-tr-v1.2.md §12 TODO` #2 ve #3 işaretliyor: "IDIS ayrı senaryo kılavuzu olmalı", "HKSIRSALIYE PDF'te detay yok". Schematron kuralları var ama senaryo bağlamı skill özetinde zayıf. Denetim sırasında doğrudan Schematron + Codelist'e gitmek zorunda kaldım.
- **Durum tipi:** B (D06 öneri)

---

## 12. Bulgu Özet Tablosu

### 12.1 Ciddiyet Dağılımı

| Ciddiyet | Adet | Bulgular (kısa) |
|---|---|---|
| **KRİTİK** | 4 | K1 IssueTime opsiyonel • K2 DespatchContact eksik • K3 Delivery sequence ihlali (D04 K6 genişlemesi) • K4 DriverPerson Person sequence ihlali |
| **YÜKSEK** | 6 | Y1 LineCountNumeric • Y2 OrderReference çoklu • Y3 BuyerCustomer/Seller/Originator • Y4 TransportHandlingUnit • Y5 Kısmi gönderim alanları • Y6 Çoklu DriverPerson |
| **ORTA** | 8 | O1 GoodsItem/ValueAmount • O2 Shipment/ID • O3 enum whitelist runtime • O4 DespatchLineId numeric • O5 CarrierParty validasyonu • O6 PartyIdentificationSchemeID runtime • O7 MATBUDAN DocumentType • O8 örnek çıktı yok |
| **DÜŞÜK** | 8 | D1 dead code • D2 TCKN format • D3 validationLevel DOKÜMAN • D4 test TR ISO • D5 test sequence coverage • D6 IDIS test • D7 SKILL canonical çelişki • D8 SKILL HKS/IDIS detay |
| **Toplam** | **26** | |

### 12.2 Kategori Dağılımı

| Kategori | Adet |
|---|---|
| KÜTÜPHANE | 21 |
| TEST | 3 (D4, D5, D6) |
| DOKÜMAN | 1 (D3) |
| SKILL | 2 (D7, D8) |

### 12.3 Durum Tipi Dağılımı

| Durum Tipi | Adet | Bulgular |
|---|---|---|
| A (Skill + normatif diyor, lib yanlış) | 10 | K1, K2, Y2, Y3, Y5, Y6, O3, O4, O5, O6 |
| B (Skill sessiz veya iç tutarsızlık, XSD/Schematron kesin) | 14 | K3, K4, Y1, Y4, O1, O2, O7, O8, D1-D6, D8 |
| C (Skill ↔ normatif çelişki, normatif kazanır) | 2 | D7 canonical DeliveryAddress vs Schematron + §2.3 DORSE/DORSEPLAKA (skill içi uzlaşmış; C tipinde bulgu değil ama not) |

### 12.4 Çift Sayım / Denetimler Arası Bağlantılar

Denetim 06 bulgularından **4 tanesi öncekilerin Despatch-spesifik görünümü**:

| D06 Bulgu | Önceki Denetim Paralel | Not |
|---|---|---|
| K3 (Delivery sequence) | D04 §K6 | D06 3 pozisyon ihlali (D04 1 pozisyon); K3 **K6 güncellemesi**, çift sayım |
| K4 (DriverPerson Person sequence) | D04 §O1 (party-serializer Person/MiddleName) | K4 aynı kök neden, farklı serializer; ORTA→KRİTİK yükselme (her irsaliye tetikler) |
| O3 (enum whitelist) | D03 "Despatch/Invoice/Profile whitelist runtime yok (ORTA)" | D03 generic, D06 spesifik |
| O6 (PartyIdentificationSchemeID) | D02+D03 teyitli | üçüncü görünüm |
| D1 (dead code) | D04 §D2 | teyit |

**Net D06 = 26 ham – 2 çift sayım (K3, K4 D04 teyidi) – 2 çift sayım (O3, O6 D02/D03 teyidi) – 1 çift sayım (D1 D04 teyidi) = ~21 net.**

---

## 13. Context'e Giren Dosyalar

Bu denetim sırasında okunan/analiz edilen dosyalar:

**Skill (normatif + özet):**
- `.claude/skills/gib-teknik-dokuman/SKILL.md`
- `.claude/skills/gib-teknik-dokuman/references/e-irsaliye-ubl-tr-v1.2.md`
- `.claude/skills/gib-teknik-dokuman/references/senaryo-temel-irsaliye-v0.3.md`
- `.claude/skills/gib-teknik-dokuman/schemas/maindoc/UBL-DespatchAdvice-2.1.xsd`
- `.claude/skills/gib-teknik-dokuman/schemas/common/UBL-CommonAggregateComponents-2.1.xsd` (grep hedefli: DespatchLineType, ShipmentType, DeliveryType, SupplierPartyType, PersonType, TransportEquipmentType, TransportHandlingUnitType)
- `.claude/skills/gib-teknik-dokuman/schematrons/UBL-TR_Main_Schematron.xml:470-550`
- `.claude/skills/gib-teknik-dokuman/schematrons/UBL-TR_Common_Schematron.xml:701-770`
- `.claude/skills/gib-teknik-dokuman/schematrons/UBL-TR_Codelist.xml:1-80`
- `.claude/skills/gib-teknik-dokuman/xmls/Irsaliye-Ornek1.xml` (tam — canonical referans)
- `.claude/skills/gib-teknik-dokuman/xmls/Irsaliye-Matbudan.xml` (ilk 60 satır)

**Kütüphane (json2ubl-ts):**
- `src/types/enums.ts`
- `src/types/despatch-input.ts`
- `src/types/common.ts`
- `src/builders/despatch-builder.ts`
- `src/serializers/despatch-serializer.ts`
- `src/serializers/party-serializer.ts`
- `src/serializers/delivery-serializer.ts`
- `src/serializers/reference-serializer.ts`
- `src/serializers/line-serializer.ts`
- `src/serializers/invoice-serializer.ts` (ilk 80 satır — UBL_CONSTANTS kullanımı için)
- `src/validators/despatch-validators.ts`
- `src/utils/xml-helpers.ts`
- `src/config/namespaces.ts`
- `src/config/constants.ts` (LICENSE_PLATE_SCHEME_IDS bölgesi)
- `src/index.ts`
- `__tests__/builders/despatch-builder.test.ts`
- `examples/` listesi (despatch örneği yok teyidi için)
- Working tree `git diff src/serializers/despatch-serializer.ts`

**Audit önceki:**
- `audit/SONUC-konsolide-bulgular.md`

---

## 14. Sonraki Denetime Aktarılan Açık Sorular

**BU SON DENETİM — açık sorular D05 bitiminde belirtildiği gibi proje roadmap'ına taşınacak.**

### D06'ya özgü açık sorular (Mimsoft/GİB teyidi gerektirir)

1. **DespatchContact/Name zorunluluk düzeyi:** Skill §5.4 "yazılır" diyor ama Schematron'da explicit zorunluluk yok. Mimsoft tarafında Teslim Eden bilgisi olmadan gönderim red ediliyor mu, yoksa optional kabul mü? `DespatchInput` API'ye `despatchContactName?` zorunlu mu opsiyonel mi eklenmeli?

2. **Dorse yerleştirme tercihi:** Lib `LicensePlateID[schemeID="DORSE"]` kullanıyor (Codelist path). Canonical `TransportEquipment[schemeID="DORSEPLAKA"]` (canonical path). Mimsoft/GİB her ikisini de kabul ediyor mu, yoksa canonical path zorunlu mu? Kullanıcıya iki path'i de sunan bir API mı, tek path'e zorlayan mı?

3. **LineCountNumeric İrsaliye'de 0..1 (seçimli):** Emit edilmesi yararlı mı zararlı mı? Kullanıcı isterse `DespatchInput.lineCountNumeric?` alanı mı, serializer otomatik `input.lines.length` mi?

4. **BuyerCustomer/Seller/Originator Party genişletmesi:** Fatura tarafında `InvoiceInput.buyerCustomer` var (v1.4.1 ile genişletildi — commit 8e3fd27). Despatch tarafında paralel genişletme kapsamı: 3 party tipi birden mi, yalnız BuyerCustomer mi?

5. **Kısmi gönderim ve çoklu DriverPerson kapsamı:** `senaryo-temel-irsaliye-v0.3.md §4.2` kısmi gönderim senaryosu kullanım sıklığı nedir (B2B hizmet/nakliye senaryolarında yaygın mı)? Roadmap'ta öncelik.

6. **examples/output irsaliye senaryoları:** 30 fatura senaryosu var; 4-5 irsaliye senaryosu (TEMELIRSALIYE SEVK, MATBUDAN, HKSIRSALIYE, IDISIRSALIYE, Kısmi Gönderim) eklenmesi k1-k4 bulguları fix edildikten sonra xmllint CI'ının kullanışlı çalışması için gerekli.

7. **Mimsoft `unsigned=true` pre-validation İrsaliye kapsamı:** Fatura tarafında ayrıntılı bahsedildi; İrsaliye için aynı pre-validation kuralları çalışıyor mu, yoksa Mimsoft İrsaliye'yi Signature-only validate mi ediyor?

8. **CustomizationID tek sabit yerine iki sabit:** Fatura TR1.2 + Despatch TR1.2.1 farkı (D04 §Y7) `UBL_CONSTANTS.customizationId` ile tek değer kullanıyor. Fix: `INVOICE_CUSTOMIZATION_ID` ve `DESPATCH_CUSTOMIZATION_ID` ayrı sabitler mi? Yoksa her serializer bunu hard-code mu etmeli?

### Tüm 6 denetimden taşınan genel açık sorular

D01-D05'in 35 açık sorusu `SONUC-konsolide-bulgular.md` içinde zaten listelenmiş. D06 yeni 8 açık soru ekledi. Toplam: **43 açık soru proje roadmap'ına hazır.**
