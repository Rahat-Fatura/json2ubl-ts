---
denetim: 01 - İç Tutarlılık
tarih: 2026-04-21
skill_versiyon: gib-teknik-dokuman (7 özet .md, 2 Schematron XML, Codelist XML, XSD paketi — common + maindoc)
kutuphane_versiyon: json2ubl-ts v1.4.2 (uncommitted working tree değişiklikleri dahil; son commit 8e3fd27 v1.4.1 @ 2026-03-18)
kapsam: src/config/constants.ts ↔ src/calculator/invoice-rules.ts matris tutarlılığı + 20 InvoiceTypeCode / 12 InvoiceProfileId kod-listesi uyumu + 2 failing test kök sebebi
---

# Denetim 01 — İç Tutarlılık

> **Bu rapor yalnızca bulgu.** Düzeltme, yama veya öncelik sıralaması yoktur.

## 0. Normatif Kaynak Referansları

| Kısa ad | Dosya | Kullanım |
|---|---|---|
| **Codelist** | `schematrons/UBL-TR_Codelist.xml` (skill) | Profil/Tip değer listeleri regex whitelist (sch:let) |
| **CommonSchematron** | `schematrons/UBL-TR_Common_Schematron.xml` (skill) | Profil × Tip cross-reference kuralları (satır 176, 289, 361-371) |
| **InvoiceXSD** | `schemas/maindoc/UBL-Invoice-2.1.xsd` (skill) | Eleman kardinaliteleri |
| **KodListeleri v1.42** | `references/kod-listeleri-ubl-tr-v1.42.md` (skill) | Mart 2026 resmi kod özeti |
| **FaturaV1.0** | `references/e-fatura-ubl-tr-v1.0.md` (skill) | 44 ana eleman kardinalite tablosu |

---

## 1. Matris Farkları: `constants.ts` ↔ `invoice-rules.ts`

**Karşılaştırma:** `src/config/constants.ts:8-66` (`PROFILE_TYPE_MATRIX`) ile `src/calculator/invoice-rules.ts:33-47` (`PROFILE_TYPE_MAP`).

**Değer farkları** — eşitse satır yoktur. Sadece fark içeren profiller aşağıdadır.

| ProfileId | `constants.ts`'de (satır) | `invoice-rules.ts`'de (satır) | Fark | Normatif referans | Ciddiyet |
|---|---|---|---|---|---|
| **TEMELFATURA** | 10 tip: +TEVKIFATIADE | 9 tip: −TEVKIFATIADE | `rules.ts`'de **TEVKIFATIADE eksik** | CommonSchematron:289 (GeneralWithholdingTaxTotalCheck) TEVKIFATIADE'yi kısıtlamaz; Codelist:10 `TEVKIFATIADE` InvoiceTypeCodeList'te var; profil kısıtı yok → **rules.ts yanlış (eksik)**, constants.ts doğru | YÜKSEK |
| **TICARIFATURA** | 9 tip (IADE yok, TEVKIFATIADE var) | 9 tip (IADE var, TEVKIFATIADE yok) | İkisi de farklı eksiklik; **değer kümesi birbirinden farklı** | CommonSchematron:176 `not(InvoiceTypeCode='IADE') or ProfileID='TEMELFATURA' or 'EARSIVFATURA' or 'ILAC_TIBBICIHAZ' or 'YATIRIMTESVIK' or 'IDIS'` → **IADE TICARIFATURA'da YASAK**; TEVKIFATIADE için profil kısıtı yok → **rules.ts IADE eklemesi yanlış (Schematron ihlali), TEVKIFATIADE çıkarması da yanlış**. constants.ts IADE yok ✓, TEVKIFATIADE var ✓ | **KRİTİK** (rules.ts IADE kabul ediyor → Schematron valid olmayan XML üretir) |
| **IHRACAT** | 9 tip (TICARIFATURA kopyası) | 3 tip: SATIS, ISTISNA, IHRACKAYITLI | Tip küme büyüklüğü 9 vs 3 | CommonSchematron'da IHRACAT için tip kısıtı yok (sadece InvoiceTypeCodeList ve IHRACAT profiline özel kurallar 405-428); KodListeleri v1.42:762 `IHRACAT: SATIS + 301/302/338 istisna` yumuşak özet; Schematron IADE yasağı (satır 176) IHRACAT'ı zaten kapsar → **constants.ts IADE içermiyor ✓ ama TEVKIFATIADE içeriyor, TEVKIFATIADE Schematron'da satır 357-358 `InvoiceTypeCode='TEVKIFATIADE'` için profil kısıtı yok, ama satır 176 IADE grubu mantığı değil**. rules.ts ise aşırı dar | ORTA (birbirinden farklı ama ikisi de Schematron'a aykırı değil) |
| **YOLCUBERABERFATURA** | 9 tip (TICARIFATURA kopyası) | 2 tip: SATIS, ISTISNA | 9 vs 2 | CommonSchematron:342-345 YOLCUBERABERFATURA için TaxRepresentativeParty + BuyerCustomerParty kuralları (tip kısıtı yok); KodListeleri v1.42:763 `YOLCUBERABERFATURA: SATIS + aracı kurum` → **yumuşak özet**. Schematron:176 IADE yasağı TICARIFATURA dışındaki profillere de uygulanır → constants.ts'nin TICARIFATURA kopyası burada doğru (IADE yok) | ORTA |
| **OZELFATURA** | 9 tip | 2 tip: SATIS, ISTISNA | 9 vs 2 | CommonSchematron'da OZELFATURA için özel tip kısıtı yok; KodListeleri v1.42:764 `OZELFATURA: SATIS` | ORTA |
| **KAMU** | 9 tip | 6 tip: SATIS, ISTISNA, TEVKIFAT, IHRACKAYITLI, OZELMATRAH, KONAKLAMAVERGISI | constants.ts'de +IADE (KAMU, IADE grubuna Schematron:176 tarafından kapatılmış!) | CommonSchematron:176 KAMU IADE listede **YOK** → **constants.ts KAMU profilinde IADE içermemeli**, ama içerip içermediği? `constants.ts:35-39`'a bakınca → TICARIFATURA kopyası: SATIS, TEVKIFAT, TEVKIFATIADE, ISTISNA, OZELMATRAH, IHRACKAYITLI, SGK, KOMISYONCU, KONAKLAMAVERGISI → **IADE yok ✓**, **TEVKIFATIADE var** (rules.ts'de yok). SGK de eşleşmiyor | YÜKSEK |
| **HKS** | 2 tip: **HKSSATIS, HKSKOMISYONCU** | 2 tip: **SATIS, KOMISYONCU** | **Tamamen farklı tip isimleri** | Codelist:10 InvoiceTypeCodeList `HKSSATIS, HKSKOMISYONCU` geçerli; `SATIS, KOMISYONCU` HKS profilinde kullanımı Schematron:353-355 HKSInvioceCheck KUNYENO ile anlamlı → **rules.ts'deki `SATIS/KOMISYONCU` semantiği KodListeleri v1.42:766 tablosuna yakın ama Schematron InvoiceTypeCode listesinde HKS profilinin karakteristik tipleri `HKSSATIS/HKSKOMISYONCU`** → **rules.ts yanlış** (yerel UI için çalışıyor olabilir ama Schematron XML çıktısında HKS+SATIS kombinasyonu Schematron kurallarıyla uyumsuz) | **KRİTİK** |
| **EARSIVFATURA** | 16 tip: **+SGK, +TEVKIFATIADE**; YOK: HKSSATIS, HKSKOMISYONCU | 16 tip: **−SGK, −TEVKIFATIADE**; VAR: HKSSATIS, HKSKOMISYONCU | 4 öğe farklı | CommonSchematron'da EARSIVFATURA için SGK yasağı yok; TEVKIFATIADE yasağı yok. Schematron:353 HKSInvioceCheck `ProfileID='HKS'` ile başlar → HKSSATIS/HKSKOMISYONCU **HKS profiliyle bağdaşır**, EARSIVFATURA profilinde kullanımı için ek Schematron kuralı yok ama KodListeleri v1.42:761 `EARSIVFATURA: SATIS, IADE, ISTISNA, TEKNOLOJIDESTEK, YTB*` — HKSSATIS EARSIVFATURA listesinde yok | YÜKSEK |

### Matris boyutunda eşit olan profiller (her iki source aynı):
- `ENERJI` (2 tip: SARJ, SARJANLIK) — constants:43 ↔ rules:45. CommonSchematron:177 ile uyumlu ✓
- `ILAC_TIBBICIHAZ` (6 tip) — constants:46 ↔ rules:43. CommonSchematron:361-363 (IlacTibbiCihazInvoiceTypeCodeCheck) ile uyumlu ✓
- `YATIRIMTESVIK` (5 tip) — constants:50 ↔ rules:44. CommonSchematron:365-367 ile uyumlu ✓
- `IDIS` (6 tip) — constants:54 ↔ rules:46. CommonSchematron:369-371 ile uyumlu ✓

### Özet
- **Tutarsız profil sayısı**: 8/12 (TEMELFATURA, TICARIFATURA, IHRACAT, YOLCUBERABERFATURA, OZELFATURA, KAMU, HKS, EARSIVFATURA)
- **Tutarlı profil sayısı**: 4/12 (ENERJI, ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS)

---

## 2. Kod Listesi Uyum Tablosu

### 2.1 InvoiceTypeCode (enum: `src/types/enums.ts:18-39`, 20 değer)

Referans Codelist:10 `InvoiceTypeCodeList`: `SATIS,IADE,TEVKIFAT,TEVKIFATIADE,ISTISNA,OZELMATRAH,IHRACKAYITLI,SGK,KOMISYONCU,HKSSATIS,HKSKOMISYONCU,KONAKLAMAVERGISI,SARJ,SARJANLIK,TEKNOLOJIDESTEK,YTBSATIS,YTBIADE,YTBISTISNA,YTBTEVKIFAT,YTBTEVKIFATIADE` (20 değer).

| Enum değeri | enums.ts:satır | Codelist.xml'de | KodListeleri v1.42'de | Durum |
|---|---|---|---|---|
| SATIS | 19 | ✓ | ✓ (çok yerde) | uyumlu |
| IADE | 20 | ✓ | ✓ (v1.42:760) | uyumlu |
| TEVKIFAT | 21 | ✓ | ✓ | uyumlu |
| TEVKIFATIADE | 22 | ✓ | ✓ (v1.42 örtük; Schematron:358) | uyumlu |
| ISTISNA | 23 | ✓ | ✓ | uyumlu |
| OZELMATRAH | 24 | ✓ | ✓ | uyumlu |
| IHRACKAYITLI | 25 | ✓ | ✓ | uyumlu |
| SGK | 26 | ✓ | ✓ | uyumlu |
| KOMISYONCU | 27 | ✓ | ✓ | uyumlu |
| HKSSATIS | 28 | ✓ | ✓ (v1.42:766) | uyumlu |
| HKSKOMISYONCU | 29 | ✓ | ✓ (v1.42:766) | uyumlu |
| KONAKLAMAVERGISI | 30 | ✓ | ✓ | uyumlu |
| SARJ | 31 | ✓ | ✓ (v1.42:767) | uyumlu |
| SARJANLIK | 32 | ✓ | ✓ (v1.42:767) | uyumlu |
| TEKNOLOJIDESTEK | 33 | ✓ | ✓ (v1.42:754, 761) | uyumlu |
| YTBSATIS | 34 | ✓ | ✓ | uyumlu |
| YTBIADE | 35 | ✓ | ✓ | uyumlu |
| YTBISTISNA | 36 | ✓ | ✓ | uyumlu |
| YTBTEVKIFAT | 37 | ✓ | ✓ | uyumlu |
| YTBTEVKIFATIADE | 38 | ✓ | ✓ | uyumlu |

**Sonuç:** `InvoiceTypeCode` enum'ın 20 değeri **Codelist.xml ile birebir aynı set**. Eksik veya fazla **yok**. Bulgu: **tam uyumlu**. Ciddiyet: yok.

### 2.2 InvoiceProfileId (enum: `src/types/enums.ts:2-15`, 12 değer)

Referans Codelist:5-6 birleşik set:
- `ProfileIDType`: `TICARIFATURA,TEMELFATURA,YOLCUBERABERFATURA,IHRACAT,OZELFATURA,KAMU,HKS,ENERJI,ILAC_TIBBICIHAZ,YATIRIMTESVIK,IDIS` (11 değer, e-fatura)
- `ProfileIDTypeEarchive`: `EARSIVFATURA` (1 değer, e-arşiv)
- **Toplam: 12 değer**

| Enum değeri | enums.ts:satır | Codelist.xml'de | KodListeleri v1.42'de | Durum |
|---|---|---|---|---|
| TEMELFATURA | 3 | ✓ (ProfileIDType) | ✓ (v1.42:690) | uyumlu |
| TICARIFATURA | 4 | ✓ | ✓ (v1.42:691) | uyumlu |
| YOLCUBERABERFATURA | 5 | ✓ | ✓ (v1.42:692) | uyumlu |
| IHRACAT | 6 | ✓ | ✓ (v1.42:694) | uyumlu |
| OZELFATURA | 7 | ✓ | ✓ (v1.42:695) | uyumlu |
| KAMU | 8 | ✓ | ✓ (v1.42:696) | uyumlu |
| HKS | 9 | ✓ | ✓ (v1.42:697) | uyumlu |
| ENERJI | 10 | ✓ | ✓ (v1.42:701) | uyumlu |
| ILAC_TIBBICIHAZ | 11 | ✓ | ✓ (v1.42:702) | uyumlu |
| YATIRIMTESVIK | 12 | ✓ | ✓ (v1.42:703) | uyumlu |
| IDIS | 13 | ✓ | ✓ (v1.42:704) | uyumlu |
| EARSIVFATURA | 14 | ✓ (ProfileIDTypeEarchive) | ✓ (v1.42:693) | uyumlu |

**Sonuç:** `InvoiceProfileId` enum'ın 12 değeri **Codelist.xml ile birebir aynı set**. Eksik veya fazla **yok**. Bulgu: **tam uyumlu**. Ciddiyet: yok.

### 2.3 Beklenen özel kontroller

#### `555` kodu — Mart 2026 yenisi
- **Kapsam:** `TaxExemptionReasonCode` kod listesi (InvoiceTypeCode değil).
- KodListeleri v1.42:377 `555 | KDV Oran Kontrolüne Tabi Olmayan Satışlar`
- CommonSchematron:316 `TaxExemptionReasonCodeCheck` — `not(cbc:TaxExemptionReasonCode != 555 and contains($istisnaTaxExemptionReasonCodeType, ...))` özel çıkarımla kullanılıyor
- CommonSchematron:497-499 `DemirbasKDVTaxExemptionCheck` — TEMELFATURA/TICARIFATURA/EARSIVFATURA + SATIS/TEVKIFAT/... tipinde 555 kabul
- Codelist:21 `TaxExemptionReasonCodeType` listesinde `555` **var**
- Kütüphane'de `src/config/constants.ts:186-200` `ISTISNA_TAX_EXEMPTION_REASON_CODES`: `001,101-108,201-250,301-344,350,501` → **555 YOK**
- Kütüphane'de `src/config/constants.ts:203-205` `OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES`: `801-812` → **555 YOK**
- Kütüphane'de `src/config/constants.ts:208-210` `IHRAC_EXEMPTION_REASON_CODES`: `701-704` → **555 YOK**
- Kütüphane'de 555'i ayrı liste olarak tanımlayan bir sabit **bulunamadı** (grep ile)
- **Bulgu:** 555 kodu Schematron v1.42'de var, kütüphanede **hiçbir yerde yok**. Ciddiyet: **YÜKSEK** (v1.42 normatif kaynak; üretimde bu kod kabul edilmez → validasyon yanlış reddeder)
- **Not:** `TaxExemptionReasonCode` denetim kapsamı olarak Denetim 2'ye bırakılması anlamlı — burada sadece bir işaret.

#### Enum'da olan ama v1.42 tablosunda bulunamayan değer
- **Yok.** 20 InvoiceTypeCode + 12 ProfileId tam uyumlu.

#### v1.42'de / Codelist.xml'de olan ama enum'da olmayan değer
- **Yok** (InvoiceTypeCode + ProfileId enum yüzeyinde).
- <!-- TODO: doğrula → DespatchTypeCode/DespatchProfileId içinde olası eksik kod var mı? Bu denetim fatura odaklı; irsaliye Denetim 2'de. -->

---

## 3. Failing Test Analizi

`yarn test` çıktısı — **2/112 test başarısız**. Test dosyası: `__tests__/builders/invoice-builder.test.ts` (saved output stash'sız çalıştırıldı; working tree değişiklikleri `src/serializers/invoice-serializer.ts` ve `src/serializers/despatch-serializer.ts` üzerinde).

### Test 1: `invoice-builder.test.ts:123` — `UBLExtensions placeholder içerir`

- **Beklenti**: `expect(xml).toContain('<ext:UBLExtensions>')` ve `<ext:ExtensionContent>` (test satır 123-124)
- **Gerçek çıktı** (test run log): `<?xml ...?><Invoice ...><cbc:UBLVersionID>...` — `<ext:UBLExtensions>` elemanı **yok**, doğrudan `UBLVersionID` ile başlıyor
- **Kök sebep**: `src/serializers/invoice-serializer.ts` working tree diff'inde satır "1. UBLExtensions (boş placeholder)" altındaki `parts.push(indent(ublExtensionsPlaceholder(), ind));` çağrısı **yorum satırı** haline getirilmiş (diff: `- parts.push(indent(ublExtensionsPlaceholder(), ind));` → `+ // parts.push(indent(ublExtensionsPlaceholder(), ind));`). Bununla birlikte `indent` helper'ı da tamamen yorum satırına alınmış (diff sonu). `ublExtensionsPlaceholder` import'u da listeden çıkarılmış (diff satır 3-4). Aynı değişiklik `despatch-serializer.ts`'de de yapılmış (diff satır 20: `// parts.push(indentBlock(ublExtensionsPlaceholder(), ind));`)
- **Normatif referans**:
  - UBL-Invoice-2.1.xsd (skill `schemas/maindoc/UBL-Invoice-2.1.xsd`) kök element sequence'ında `UBLExtensions` ilk eleman ve XSD default `minOccurs=1` (satır 35: `<xsd:element ref="cac:Signature" maxOccurs="unbounded"/>` gibi çok satırlı bir blok, UBLExtensions kendisi CommonExtensionComponents'tan) — **XSD zorunlu**
  - FaturaV1.0 (`references/e-fatura-ubl-tr-v1.0.md:75`): `UBLExtensions` kardinalitesi **1..n** (ZORUNLU)
  - CommonSchematron'da `UBLExtensions` için doğrudan zorunluluk kuralı yok (imza içeriği kontrol ediliyor — XadesSignatureCheck satır 93-110), ama tam e-fatura akışında `UBLExtensions/UBLExtension/ExtensionContent/ds:Signature` zorunlu (XAdES SignedInfo içerir)
- **Ciddiyet**: **KRİTİK** — UBLExtensions olmadan üretilen XML, imza eklenmeden GİB'e gönderilmeye uygun değil; XSD'ye göre geçersiz. Üretimde yanlış XML üretir.

### Test 2: `invoice-builder.test.ts:152` — `cac:Signature oluşturur`

- **Beklenti**: `expect(xml).toContain('<cac:Signature>')` ve `expect(xml).toContain('schemeID="VKN_TCKN"')` (test satır 152-153)
- **Gerçek çıktı** (test run log): Üretilen XML'de `<cac:Signature>` **yok**
- **Kök sebep**: `src/serializers/invoice-serializer.ts` HEAD (`git show HEAD:src/serializers/invoice-serializer.ts` eşdeğeri) zaten Signature üretmiyor — working tree diff'inde **ilgili satır zaten yorum satırı olarak var** (yeni diff satır: `    // 23. Signature — business logic tarafından eklenir, serializer üretmez`). Diff HEAD'deki bu davranışı değiştirmiyor → **test muhtemelen HEAD'de de kırıktı** (UBLExtensions testi gibi çalışma zamanında kırılan ayrı bir değişiklik değil; bu yapısal bir boşluk)
- **Normatif referans**:
  - UBL-Invoice-2.1.xsd satır 35: `<xsd:element ref="cac:Signature" maxOccurs="unbounded"/>` — `minOccurs` belirtilmemiş → XSD default `minOccurs=1` → **ZORUNLU (1..n)**
  - FaturaV1.0 `references/e-fatura-ubl-tr-v1.0.md:86`: `Signature | 1..n | Mali Mühür/İmza` — **zorunlu listede** (eleman #27)
  - CommonSchematron:242-247 `SignatureCheck` — `cac:Signature` varsa `cbc:ID/@schemeID='VKN_TCKN'` olmalı ve 10/11 hane olmalı (yani Schematron Signature'ın **varsa** içeriğini zorunlu kılıyor; yokluğunu kısıtlamıyor — normatif kardinalite kaynağı XSD + FaturaV1.0)
  - CommonSchematron:233-235 `SignatureCountCheck`: `count(cac:Signature) <= 1` → üst sınır 1. Ama alt sınır XSD tarafından 1.
- **Ciddiyet**: **KRİTİK** — `InvoiceBuilder.build()` çıktısı XSD'ye göre geçersiz; üretimde ise Signature business logic tarafında (tüketen servis) eklenmesi gerekiyor. Bu bir **API kontrat tasarımı** sorunu: kütüphane "ham iskelet" mi yoksa "imzaya hazır" mı üretiyor? Test serializer'ın Signature üretmesini bekliyor, kod ise "dışarıda eklenecek" diyor (serializer yorumu satır 168 civarı working tree'de: `// 23. Signature — business logic tarafından eklenir, serializer üretmez`).

### Failing Test — Çapraz Analiz

Her iki test de aynı konuya bakıyor: **mali mühür/imza altyapısı**. İki gözlem:

1. `UBLExtensions` working tree diff ile **kaldırıldı** (HEAD'de vardı, şimdi yok — daha önce test geçiyordu).
2. `cac:Signature` serializer **hiçbir zaman üretmiyordu** (HEAD yorumu: "business logic tarafından eklenir"). Test buna rağmen `<cac:Signature>` bekliyor → test ve serializer sözleşmesi arasında **eski bir uyumsuzluk** var. Bu test commit öncesi ya failing'di ya da başka bir builder katmanı Signature ekliyordu (ama koddaki import grafında yok — invoice-builder.ts sadece `serializeInvoice`'ı çağırıyor, başka bir ek katman yok).

---

## 4. Bulgu Özeti

### 4.1 Toplam Bulgu Sayısı

| Ciddiyet | Adet | Bulgular |
|---|---|---|
| **KRİTİK** | 3 | §1: TICARIFATURA rules.ts IADE (Schematron:176 ihlali); §1: HKS rules.ts SATIS/KOMISYONCU (yanlış tip kümesi); §3: Test 1 UBLExtensions ve Test 2 Signature — ikisi de XSD+FaturaV1.0 zorunlu elemanı üretmiyor |
| **YÜKSEK** | 4 | §1: TEMELFATURA TEVKIFATIADE eksik (rules.ts); §1: KAMU 9 vs 6 tip farkı (TEVKIFATIADE, SGK, KOMISYONCU); §1: EARSIVFATURA 4 öğe fark; §2.3: `555` kodu hiçbir yerde yok |
| **ORTA** | 3 | §1: IHRACAT 9 vs 3 (constants aşırı geniş, rules aşırı dar); §1: YOLCUBERABERFATURA 9 vs 2; §1: OZELFATURA 9 vs 2 |
| **DÜŞÜK** | 0 | — |

**Toplam: 10 bulgu**

### 4.2 Ek Gözlemler (Ciddiyet Atanmamış — Denetim Kapsamı Dışı)

- **constants.ts ile rules.ts iki farklı sıra kullanıyor** (constants: SATIS, IADE, TEVKIFAT, TEVKIFATIADE, ISTISNA,...; rules: SATIS, IADE, ISTISNA, IHRACKAYITLI, OZELMATRAH, TEVKIFAT,...). Değer karşılaştırması için önemsiz, ancak görsel diff yanıltıcı.
- `invoice-rules.ts:17` IADE_GROUP dizisi: `['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE']` — `constants.ts:73-76` `IADE_GROUP_TYPES` ile aynı. **Üçüncü truth source başlangıcı** (ama içerik aynı).
- Test output'unda üretilen XML `<Invoice>` kök elemanının bir özelliği: `xmlns` default namespace Invoice-2 olarak tanımlanmış ama kök `<Invoice>` tag'i `cbc:UBLVersionID`, `cbc:ProfileID` ... içeriyor. Bu WORKING — ancak element seçimi/sırası ayrı bir denetim konusu.
- `UBL_CONSTANTS.customizationId = 'TR1.2.1'` (`src/config/namespaces.ts:28`) — CommonSchematron:142 `TR1.2 veya TR1.2.1` kabul ediyor. Uyumlu. <!-- TODO: doğrula → v1.42'nin fiilen beklediği TR1.2.1 mi, TR1.2 mi? -->

### 4.3 Senin Karar Vermen Gerekenler (Denetim 2'ye Geçmeden Önce)

Öncelik değil, **karar** istenenler:

1. **Hangi matris "truth source"?** — `PROFILE_TYPE_MATRIX` (Schematron-cross-reference yönelimli, validator katmanında kullanılıyor) mı yoksa `PROFILE_TYPE_MAP` (UI state/rules yönelimli, frontend tüketen `web` servisinde kullanılıyor) mu tek gerçek olacak? `edocument-service` hangisini görüyor? Her iki tüketiciden birini kırmadan tek source'a geçiş mümkün mü?
2. **IHRACAT/YOLCUBERABERFATURA/OZELFATURA için "serbest" mi "kısıtlı" mı?** — Schematron bu 3 profile özel tip kısıtı KOYMUYOR (CommonSchematron'da özel kural yok), ama KodListeleri v1.42 özetinde tek tip beklentisi var. `constants.ts` "serbest" (TICARIFATURA kopyası), `rules.ts` "kısıtlı" (SATIS/ISTISNA). **Hangi kararı verirsen** bulgu 3 (IHRACAT), 4 (YOLCU), 5 (OZEL) kapanır.
3. **Signature/UBLExtensions kütüphanenin sorumluluğu mu, tüketicinin mi?** — HEAD'de `// Signature — business logic tarafından eklenir, serializer üretmez` yorumu var (invoice-serializer.ts). Ama test Signature bekliyor + XSD+FaturaV1.0 zorunlu. Karar: (a) kütüphane `<cac:Signature>` placeholder üretir, tüketici `ds:Signature` (XAdES) değerini doldurur; (b) kütüphane hiç Signature üretmez, testi kaldır/güncelle ve README'de açıkça belirt; (c) ikisini de yap: placeholder üret + "boş placeholder ile geçerli değildir" uyarı ver. `edocument-service`'te hangisi bekleniyor?
4. **`555` kodu için politika**: Denetim 2'ye mi bırakılacak (istisna kodlarının tam taraması orada) yoksa şimdi mi ele alınacak? (Karar: "Denetim 2'de ele al" demek yeterli.)
5. **Working tree değişikliklerini commit etmek/geri almak için hazır mısın?** — UBLExtensions ve despatch-serializer değişiklikleri 2026-03-18'den sonra yazılmış (son commit tarihinden sonra) ve şu an **2 testi kırıyor**. Rapor bu durumu "olduğu gibi incele" direktifine sadık kalıyor, ama bir sonraki denetime başlamadan önce **karar**: commit et, rollback et, ya da stash'e al. Hangisi? Rollback edilirse Test 1 (UBLExtensions) geçecek, Test 2 (Signature) hâlâ kırık kalacak.

---

## 5. Bu Denetim Sırasında Context'e Giren Dosyalar

**Kütüphane dosyaları** (json2ubl-ts/):
- `package.json`
- `src/index.ts`, `src/types/index.ts`, `src/types/enums.ts`, `src/types/common.ts`, `src/types/invoice-input.ts`, `src/types/despatch-input.ts`, `src/types/builder-options.ts`
- `src/config/constants.ts`, `src/config/namespaces.ts`
- `src/builders/invoice-builder.ts`, `src/builders/despatch-builder.ts`
- `src/calculator/index.ts`, `src/calculator/simple-types.ts`, `src/calculator/simple-invoice-builder.ts`, `src/calculator/invoice-rules.ts` (ilk 180 satır)
- `src/validators/cross-validators.ts`
- `src/errors/ubl-build-error.ts`
- `src/serializers/invoice-serializer.ts` (git diff ile)
- `src/serializers/despatch-serializer.ts` (git diff ile)
- `__tests__/builders/invoice-builder.test.ts` (satır 130-187)
- `vitest.config.ts`, `tsup.config.ts`
- Test run output (`yarn test` → stderr)

**Skill dosyaları** (sisteminiz-integrator-infrastructure/.claude/skills/gib-teknik-dokuman/):
- `schematrons/UBL-TR_Codelist.xml` (tam)
- `schematrons/UBL-TR_Common_Schematron.xml` (1-510 arası; toplam 771 satır)
- `schemas/maindoc/UBL-Invoice-2.1.xsd` (satır 25-55)
- `schemas/common/UBL-CommonAggregateComponents-2.1.xsd` (grep: Signature)
- `references/e-fatura-ubl-tr-v1.0.md` (satır 1-100, grep: Signature/UBLExtensions)
- `references/kod-listeleri-ubl-tr-v1.42.md` (grep: 555/351/151, profil isimleri)

**Toplam**: ~25 kütüphane dosyası + 6 skill dosyası (tam veya grep-slice) incelendi.

**Context durumu**: Kapasite içinde. Sonraki denetim (ör. validator/serializer tutarlılığı, kod listeleri tam taraması) aynı oturumda devam edebilir ama **öneri**: taze oturumda başlamak, bu raporun rahat cross-reference edilebilmesi için daha temiz olur.

