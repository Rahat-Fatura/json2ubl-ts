---
denetim_seti: json2ubl-ts tam denetimi
tarih: 2026-04-21
denetim_sayisi: 6
durum: finalize (revize 2026-04-22)
---

# json2ubl-ts — Konsolide Denetim Sonuçları

> **v3 GÜNCELLEMESİ (2026-04-22):** Bu dosyadaki "Etkilenen tüketici", "Breaking change"
> ve "Downstream prod etki" atıfları v3 bağlamında **geçersiz**. `json2ubl-ts` ve
> `edocument-service` ikisi de dev aşamasında — prod kullanımı yok. Tüm fix'ler
> feature complete v2.0.0 hedefine yönelik. Yürürlükteki yol haritası:
> **`audit/FIX-PLANI-v3.md`**. v2 ve v1 tarihi referans olarak korunur.

> **REVİZYON NOTU (2026-04-22):** `audit/ACIK-SORULAR.md` dosyasındaki 25 sorunun cevapları sonrası **4 bulgu iptal** (B-16, B-50, B-75, B-82, B-103), **2 bulgu sorgulanıyor** (B-15 tekrar analiz sonrası korunur, B-17/B-T04 kullanıcı teyit bekliyor), **~18 bulgu mimarisi değişti** (M1-M10 kararları), **2 bulgu genişledi** (B-60, B-90). Revize yol haritası için **`audit/FIX-PLANI-v2.md`** (v3 için FIX-PLANI-v3.md) dosyasına bakınız. Net bulgu sayısı: **108** (v1: 112).

> 6 denetim tamamlandı (D01–D06). 132 ham bulgu, çift sayımlar düşüldükten sonra **112 net bulgu** (B-01 … B-112). Bu dosya FIX-PLANI.md (v1) + FIX-PLANI-v2.md için tek referans.

## Özet

| Metrik | Değer |
|---|---|
| Toplam bulgu (net) | **112** |
| KRİTİK | **20** |
| YÜKSEK | **32** |
| ORTA | **36** |
| DÜŞÜK | **24** |

### Kategori Dağılımı

| Kategori | Adet | Not |
|---|---|---|
| KÜTÜPHANE | **91** | Kodda sorun — direkt fix gerekli |
| TEST | **10** | Yanlış bekleyen test veya eksik kapsam |
| DOKÜMAN | **6** | README/JSDoc/yorum eksikliği |
| SKILL | **5** | `gib-teknik-dokuman` skill'inde eksik veya hatalı bilgi |

### Denetim Başına Ham Dağılım (dedupe öncesi)

| Denetim | KRİTİK | YÜKSEK | ORTA | DÜŞÜK | Ham |
|---|---|---|---|---|---|
| D01 İç Tutarlılık | 4 | 4 | 3 | — | 11 |
| D02 Kod Listeleri | 3 | 5 | 6 | 3 | 17 |
| D03 Validator | 4 | 4 | 8 | 2 | 18 |
| D04 Serializer | 6 | 9 | 8 | 7 | 30 |
| D05 Calculator | 5 | 9 | 11 | 5 | 30 |
| D06 Despatch | 4 | 6 | 8 | 8 | 26 |
| **Toplam** | **26** | **37** | **44** | **25** | **132** |

### Çift Sayım İndirimi (20 adet)

| Tekil sorun | Katmanlar | ID |
|---|---|---|
| 555 kodu eksikliği | D01-Y4 + D02-K2 + D03-K1 | **B-05** |
| IHRACKAYITLI+702 zinciri | D03-K3 + D03-Y4 + D04-Y8 | **B-07** |
| Person MiddleName sequence | D04-O1 + D06-K4 | **B-20** |
| Shipment/Delivery çocuk sırası | D04-K6 + D06-K3 | **B-14** |
| Shipment ID hard-coded | D04-O6 + D06-O2 | **B-71** |
| LineCountNumeric emit yok | D04-O4 + D06-Y1 | **B-52** |
| BuyerCustomer Party (Despatch) | D04-O5 + D06-Y3 | **B-48** |
| Despatch GoodsItem yapısı | D04-O7 + D06-O1 | **B-72** |
| ProfileID whitelist runtime yok | D03-O7 + D06-O3 | **B-67** |
| PartyIdentification schemeID | D03-O8 + D06-O6 | **B-68** |
| ublExtensionsPlaceholder dead | D04-D2 + D06-D1 | **B-93** |
| DespatchBuilder level inefektif | D03-D2 + D06-D3 | **B-91** |
| examples/output stale+eksik | D04-D1 + D06-O8 | **B-92** |
| 351 kodu çift truth source | D02-Y2 + D05-Y3 | **B-25** |
| tax-config eksik kodlar | D02-Y3 + D05-O3 | **B-26** |
| exemption-config eksik kodlar | D02-O1 + D05-Y7 | **B-56** |
| validateInvoiceState eksiklikleri | D05-O6 ≈ D03 toplamı | **B-78** (referans) |

---

## Bulgular (ID sırasıyla)

### B-01 [KRİTİK][KÜTÜPHANE] TICARIFATURA profili IADE tip ihlali
- **Kaynak:** Denetim 01 §1 (K1)
- **Dosya:** `src/calculator/invoice-rules.ts:37`
- **Normatif:** CommonSchematron:176 (IADE grubu yalnız TEMELFATURA/EARSIVFATURA/ILAC/YATIRIMTESVIK/IDIS)
- **Gözlem:** `PROFILE_TYPE_MAP.TICARIFATURA` IADE'yi listeliyor — Schematron:176 TICARIFATURA+IADE reddediyor.
- **Etki:** edocument-service send handler `InvoiceBuilder.validate()` çağrısı TICARIFATURA+IADE'yi geçiriyor, GİB reddediyor.
- **Breaking change:** Hayır (sıkılaştırma; eski çıktı zaten GİB red alıyordu)
- **Downstream:** B-22, B-23, B-53, B-54, B-55'le aynı kök (rules.ts matrix ↔ constants.ts asimetrisi)

### B-02 [KRİTİK][KÜTÜPHANE] HKS profili SATIS/KOMISYONCU tip isimleri yanlış
- **Kaynak:** Denetim 01 §2 (K2)
- **Dosya:** `src/calculator/invoice-rules.ts:45`
- **Normatif:** CommonSchematron:353 (HKSInvoiceCheck); `constants.ts:PROFILE_TYPE_MATRIX` HKS → {HKSSATIS, HKSKOMISYONCU}
- **Gözlem:** `rules.ts` HKS için SATIS/KOMISYONCU (Ticari tip isimleri) listeliyor; HKS'de HKSSATIS/HKSKOMISYONCU zorunlu.
- **Etki:** HKS profili fatura üretiminde yanlış InvoiceTypeCode'u HKS Schematron reject'ine sebep.
- **Breaking change:** Hayır
- **Downstream:** B-22 (KAMU matris benzer kök)

### B-03 [KRİTİK][KÜTÜPHANE] TaxExemption kısmi istisna kümesi 10 geçersiz kod kabul ediyor
- **Kaynak:** Denetim 02 §1.1 (K1)
- **Dosya:** `src/config/constants.ts:186-200`
- **Normatif:** Codelist satır 21 `istisnaTaxExemptionReasonCodeType` regex (203/210/222/224/233/243-249 atlamış); v1.42 §4.8.1
- **Gözlem:** `ISTISNA_TAX_EXEMPTION_REASON_CODES` 201-250 tam aralığı kabul ediyor → 10 geçersiz kod whitelist'te.
- **Etki:** Validator 222 gibi kodu kabul ediyor, GİB/Mimsoft reddediyor.
- **Breaking change:** Hayır (sıkılaştırma)
- **Downstream:** —

### B-04 [KRİTİK][KÜTÜPHANE] WithholdingTaxTypeWithPercent set Codelist ile uyumsuz (~100 yanlış kombinasyon)
- **Kaynak:** Denetim 02 §2 (K3)
- **Dosya:** `src/config/constants.ts:130-183`
- **Normatif:** Codelist satır 17 `WithholdingTaxTypeWithPercent` (65 kombinasyon); CommonSchematron:308
- **Gözlem:** Kütüphane her 6xx kodu için 50/70/90 varsayılan ekliyor; 60120/60150/60160/60170 Codelist'te yok.
- **Etki:** WithholdingTaxTotal+tip kombinasyonunda validator geçiriyor, Schematron reddediyor.
- **Breaking change:** Evet (yanlış kombinasyonlar kaldırılıyor — var olan kullanıcılar etkilenebilir)
- **Downstream:** B-27 (Tevkifat 650 eksikliği aynı set'le ilgili)
- **[MİMARİ REVİZE — Açık Soru #6 cevabı — M3]** 650 kodu "DİĞER" etiketli, dinamik yüzde mekanizması ile desteklenecek (650XX formatı). 65000-65099 aralığı kullanıcı tanımlı percent. Detay FIX-PLANI-v2.md M3.

### B-05 [KRİTİK][KÜTÜPHANE] 555 kodu (Bedelsiz Demirbaş KDV İstisnası) tamamen desteksiz
- **Kaynak:** Denetim 01 §1 (Y4) + Denetim 02 §1.2 (K2) + Denetim 03 §1 (K1) — **üç denetim, tek fiziki sorun**
- **Dosya:** `src/config/constants.ts:186-210`, `src/validators/type-validators.ts:17-60`
- **Normatif:** Codelist satır 21 (555 tanımlı); CommonSchematron:316,497-499 (DemirbasKDVTaxExemptionCheck)
- **Gözlem:** Üç katmanda eksik — whitelist'te yok, validator'da kural yok, runtime kontrol yok. v1.42 Mart 2026 üretim kodu.
- **Etki:** 555 kodu ile fatura üretilemez; üretilse Schematron reddeder.
- **Breaking change:** Hayır (eksik özellik ekleniyor)
- **Downstream:** B-06 (TaxExemption cross-check mimarisi çözünce 555 de çözülür)
- **[MİMARİ REVİZE — Açık Soru #10 cevabı — M4]** Kütüphane 555 için iş mantığı uygulamaz (farklı KDV'den kesme logic'i tüketicinindir). `BuilderOptions.allowReducedKdvRate?: boolean` flag (default `false`). True ise 555 kabul, default reddeder. Kütüphane sadece gate. Detay FIX-PLANI-v2.md M4.

### B-06 [KRİTİK][KÜTÜPHANE] TaxExemptionReasonCode cross-check (kod↔tip) mimarisi yok
- **Kaynak:** Denetim 03 §2 (K2)
- **Dosya:** `src/validators/type-validators.ts:133-190`
- **Normatif:** CommonSchematron:316,318,320 (TaxExemptionReasonCodeCheck)
- **Gözlem:** Validator tipe-göre-dispatch ediyor (`validateIstisnaGroup`); Schematron kod↔tip iki yönlü kısıtlıyor. SATIS+308 gibi kombinasyon kütüphaneden geçer, Schematron reddeder.
- **Etki:** Yanlış tip+kod kombinasyonları lib'den geçer, GİB reddeder.
- **Breaking change:** Evet (yeni cross-check önceden geçen kombinasyonları reddedecek)
- **Downstream:** B-05, B-45 (getAvailableExemptions), B-81 (mapper shouldAddExemption)

### B-07 [KRİTİK][KÜTÜPHANE] IHRACKAYITLI+702 senaryosu üç katmanda eksik
- **Kaynak:** Denetim 03 §3 (K3) + §Y4 + Denetim 04 §Y8 — validator+input+serializer zinciri
- **Dosya:** `src/validators/type-validators.ts:176-190`, `src/serializers/delivery-serializer.ts:116-133`, `src/types/invoice-input.ts` (CustomsDeclaration eksik)
- **Normatif:** CommonSchematron:322 (satır kuralı: 12-hane GTİP + 11-hane ALICIDIBSATIRKOD), :450-452 (schemeID whitelist); XSD TransportHandlingUnitType:3127
- **Gözlem:** IHRACKAYITLI profili + 702 TypeCode kombinasyonu için satır-seviyesi zorunluluklar hiçbir katmanda yok.
- **Etki:** IHRACKAYITLI+702 senaryosu üretilemez.
- **Breaking change:** Hayır (eksik özellik ekleniyor)
- **Downstream:** —

### B-08 [KRİTİK][KÜTÜPHANE] YatirimTesvikKDVCheck/YatirimTesvikLineKDVCheck kuralları yok
- **Kaynak:** Denetim 03 §4 (K4)
- **Dosya:** `src/validators/profile-validators.ts:227-318`
- **Normatif:** CommonSchematron:483-490 (fatura+satır seviyesi KDV zorunluluğu)
- **Gözlem:** YATIRIMTESVIK profili için fatura ve satır seviyesi KDV-varlık kontrolleri yok.
- **Etki:** YATIRIMTESVIK fatura boş KDV'yle geçer, Schematron reddeder.
- **Breaking change:** Evet (yeni kural önceden geçen faturaları reddedecek)
- **Downstream:** B-78

### B-09 [KRİTİK][KÜTÜPHANE] TaxExemptionReasonCode/Reason yanlış parent (TaxSubtotal→TaxCategory)
- **Kaynak:** Denetim 04 §K1
- **Dosya:** `src/serializers/tax-serializer.ts:39-44`
- **Normatif:** UBL-CommonAggregateComponents-2.1.xsd TaxSubtotalType:2779-2790 (alan yok) vs TaxCategoryType:2764-2771 (alan var); CommonSchematron L225-227 context `TaxCategory`
- **Gözlem:** Kütüphane `cbc:TaxExemptionReasonCode/Reason`'u `cac:TaxSubtotal` altına yazıyor — XSD'de `cac:TaxSubtotal/cac:TaxCategory` altına yazılmalı.
- **Etki:** Her istisna/iade faturasında xmllint fail. `examples/output/*.xml`'in büyük kısmı XSD-invalid.
- **Breaking change:** Evet (XML yapısı değişiyor — downstream parser'ları etkileyebilir)
- **Downstream:** B-06 (validator cross-check ancak doğru parent'a yazıldıktan sonra anlamlı)

### B-10 [KRİTİK][KÜTÜPHANE] InvoiceLine Delivery AllowanceCharge'tan SONRA (XSD sequence ihlali)
- **Kaynak:** Denetim 04 §K2
- **Dosya:** `src/serializers/line-serializer.ts:10-39`
- **Normatif:** XSD InvoiceLineType sequence (Delivery AllowanceCharge'tan ÖNCE)
- **Gözlem:** IHRACAT senaryosunda satır Delivery'li her çıktı XSD-invalid.
- **Etki:** IHRACAT fatura xmllint fail.
- **Breaking change:** Evet (XML sırası değişiyor)
- **Downstream:** B-14, B-20 (aynı sequence-truth-source eksikliği)

### B-11 [KRİTİK][KÜTÜPHANE] Invoice kökünde ExchangeRate AllowanceCharge'tan ÖNCE (XSD sequence ihlali)
- **Kaynak:** Denetim 04 §K3
- **Dosya:** `src/serializers/invoice-serializer.ts:222-232`
- **Normatif:** UBL-Invoice-2.1.xsd:43-48 (AllowanceCharge #36, ExchangeRate #37-40)
- **Gözlem:** Dövizli + iskonto kombinasyonunda kök seviyesinde ExchangeRate AllowanceCharge'tan önce yazılıyor.
- **Etki:** Dövizli iskontolu faturalar xmllint fail.
- **Breaking change:** Evet
- **Downstream:** B-70 (TaxExchangeRate emit eksikliği de aynı bölge)

### B-12 [KRİTİK][KÜTÜPHANE] AllowanceCharge Reason en sonda (XSD sequence ihlali)
- **Kaynak:** Denetim 04 §K4
- **Dosya:** `src/serializers/common-serializer.ts:6-23`
- **Normatif:** XSD AllowanceChargeType:726-736 (Reason ChargeIndicator'dan hemen sonra)
- **Gözlem:** `reason` field'ı en sona yazılıyor — ChargeIndicator'dan sonra olmalı.
- **Etki:** `reason` doldurulmuş her iskonto/masraf satırı veya belge-seviyesi AllowanceCharge xmllint fail.
- **Breaking change:** Evet
- **Downstream:** —

### B-13 [KRİTİK][KÜTÜPHANE] Item Description Name'den SONRA (XSD sequence ihlali)
- **Kaynak:** Denetim 04 §K5
- **Dosya:** `src/serializers/line-serializer.ts:43-45`
- **Normatif:** XSD ItemType:1808-1812 (Description→Name)
- **Gözlem:** Description sağlandığında Name'den sonra yazılıyor — XSD'ye göre önce olmalı.
- **Etki:** Description verilen her satır xmllint fail.
- **Breaking change:** Evet
- **Downstream:** —

### B-14 [KRİTİK][KÜTÜPHANE] Despatch Shipment/Delivery çocuk sırası XSD ihlali
- **Kaynak:** Denetim 04 §K6 + Denetim 06 §K3 — aynı sequence sorunu D06'da 3 pozisyona genişledi
- **Dosya:** `src/serializers/despatch-serializer.ts:138-165`
- **Normatif:** XSD DeliveryType:1310-1328 (DeliveryAddress → CarrierParty → Despatch)
- **Gözlem:** Lib Despatch→DeliveryAddress→CarrierParty yazıyor; XSD DeliveryAddress→CarrierParty→Despatch bekliyor.
- **Etki:** Her irsaliye çıktısı xmllint fail.
- **Breaking change:** Evet
- **Downstream:** B-18, B-20 (Despatch XSD sequence sistemik sorunu)

### B-15 [KRİTİK][KÜTÜPHANE] LegalMonetaryTotal.LineExtensionAmount iskonto öncesi (Σ satır ≠ belge)
- **Kaynak:** Denetim 05 §1.2.1 (K1)
- **Dosya:** `src/calculator/document-calculator.ts:107`, `src/calculator/simple-invoice-mapper.ts:271`
- **Normatif:** Skill `ortak-parasal-ve-vergi-v0.7.md` §5 satır 130 `LineExtensionAmount = Σ(InvoiceLine.LineExtensionAmount)`
- **Gözlem:** Satır LineExtensionAmount iskonto sonrası, belge LineExtensionAmount iskonto öncesi; iki hesap uzlaşmıyor.
- **Etki:** İskonto içeren her çoğul-satır fatura UBL arithmetic constraint ihlali. Mimsoft pre-validation reddeder.
- **Breaking change:** Evet (hesap davranışı değişiyor — var olan kullanıcılar 1000 yerine 850 görmeye başlar)
- **Downstream:** B-T03 (test yanlış beklenti), B-82 (mapper çift çağrı)
- **[SORGULANDI — KORUNUR — Açık Soru #17 cevabı, detay FIX-PLANI-v2.md]** Kullanıcı "ikisi de iskontolu değer olmalı" dedi; kod analizi gösterdi ki şu anki kütüphane belge-seviyede iskonto ÖNCESİ (`lineExtensionForMonetary`) kullanıyor. Fix = kullanıcının istediği davranış. Bulgu KORUNUR, Sprint 4'te uygulanır.

### B-16 [KRİTİK][KÜTÜPHANE] OZELMATRAH ek subtotal TaxTotal/TaxInclusive'a yansımıyor
- **Kaynak:** Denetim 05 §1.3 (K3)
- **Dosya:** `src/calculator/document-calculator.ts:156-174`
- **Normatif:** Skill §5 satır 132 `TaxInclusiveAmount = TaxExclusiveAmount + Σ(TaxAmount)`
- **Gözlem:** OZELMATRAH ek subtotal oluşturuluyor ama `taxTotalAmount` ve `taxInclusiveAmount` güncellenmiyor.
- **Etki:** Her OZELMATRAH fatura arithmetic constraint ihlali.
- **Breaking change:** Evet
- **Downstream:** —
- **[İPTAL — Açık Soru #19 cevabı]** Kütüphane davranışı doğru. OZELMATRAH türü kalemde belirtilir ama dip toplama yansımaz; GİB bu şekilde istiyor (kalemde KDV var ancak fatura dip toplamında bu tutar dahil edilmiyor). Fix planında çıkarıldı.

### B-17 [KRİTİK][KÜTÜPHANE] Stopaj TaxInclusive aritmetik tutarsızlığı
- **Kaynak:** Denetim 05 §6.4 (K4)
- **Dosya:** `src/calculator/line-calculator.ts:129,154,181`, `src/calculator/simple-invoice-mapper.ts:224`
- **Normatif:** Skill §5 satır 132 `TaxInclusive = TaxExclusive + Σ TaxAmount`
- **Gözlem:** Stopaj (0003/0011/9040) taxForCalculate negatif ama taxTotal pozitif hesaplanıyor; TaxInclusive yanlış.
- **Etki:** Her stopajlı fatura arithmetic constraint ihlali.
- **Breaking change:** Evet (TaxInclusive hesabı değişiyor)
- **Downstream:** B-T04 (test yanlış beklenti)
- **[SORGULANDI — KARAR ASKIDA — Açık Soru #18 cevabı]** Kullanıcı "calculator mutlak doğru, bazı vergiler matrahı düşürür, XML'de pozitif ama iç hesapta negatif gibi davranabilir" dedi. Mevcut kod tam olarak bu davranışı uyguluyor. Muhtemelen bulgu iptal edilecek; ancak kullanıcı yorumu denetim bulgusunu net çürütmüyor (UBL `TaxInclusive = TaxExclusive + Σ TaxAmount` eşitliği hala sorgulanabilir). **Mimsoft email madde 3 + kullanıcı teyidi sonrası karar verilecek.** Detay: FIX-PLANI-v2.md "Kategori B — B-17".

### B-18 [KRİTİK][KÜTÜPHANE] Despatch IssueTime XSD zorunlu, lib opsiyonel
- **Kaynak:** Denetim 06 §K1
- **Dosya:** `src/types/despatch-input.ts:36`, `src/serializers/despatch-serializer.ts:43-45`, `src/validators/despatch-validators.ts:46-48`
- **Normatif:** UBL-DespatchAdvice-2.1.xsd:17 (zorunlu); skill `e-irsaliye-ubl-tr-v1.2.md` §3 #9
- **Gözlem:** `DespatchInput.issueTime?` opsiyonel tip; serializer emit'i `if (input.issueTime)` ile atlatılabiliyor.
- **Etki:** IssueTime atlanan her irsaliye xmllint fail.
- **Breaking change:** Evet (tip opsiyonel→zorunlu)
- **Downstream:** —

### B-19 [KRİTİK][KÜTÜPHANE] DespatchSupplierParty/DespatchContact/Name ("Teslim Eden") desteksiz
- **Kaynak:** Denetim 06 §K2
- **Dosya:** `src/types/despatch-input.ts:26`, `src/serializers/despatch-serializer.ts:71-74`
- **Normatif:** UBL-CommonAggregateComponents-2.1.xsd:2758-2763 (SupplierPartyType); skill §5.4
- **Gözlem:** DespatchInput tip yok, serializer emit yolu yok — "Teslim Eden" isim alanı üretilemiyor.
- **Etki:** Mimsoft pre-validation reddeder (skill "yazılır" diyor).
- **Breaking change:** Hayır (eksik özellik)
- **Downstream:** —

### B-20 [KRİTİK][KÜTÜPHANE] Person XSD sequence ihlali (MiddleName, Title yanlış yerde)
- **Kaynak:** Denetim 04 §O1 + Denetim 06 §K4 — aynı kök, Despatch'te KRİTİK'e yükseldi çünkü her DriverPerson'da tetiklenir
- **Dosya:** `src/serializers/party-serializer.ts:71-73`, `src/serializers/despatch-serializer.ts:124-134`
- **Normatif:** XSD PersonType:2239-2250 (FirstName, FamilyName, Title, MiddleName, NameSuffix, NationalityID)
- **Gözlem:** Lib MiddleName FamilyName'den sonra yazıyor; Despatch'te Title NationalityID'den sonra yazıyor.
- **Etki:** Her irsaliye çıktısı (DriverPerson) xmllint fail; Invoice'da TCKN alıcı + middleName fail.
- **Breaking change:** Evet
- **Downstream:** —

### B-21 [YÜKSEK][KÜTÜPHANE] TEMELFATURA TEVKIFATIADE tip kümesinden eksik
- **Kaynak:** Denetim 01 §Y1
- **Dosya:** `src/calculator/invoice-rules.ts:37`
- **Normatif:** `constants.ts:PROFILE_TYPE_MATRIX.TEMELFATURA` TEVKIFATIADE içeriyor
- **Gözlem:** rules.ts TEMELFATURA'da TEVKIFATIADE'yi çıkarıyor — tip kümesi eksik.
- **Etki:** Kullanıcı TEMELFATURA + TEVKIFATIADE yazarken UI derivation engelleniyor.
- **Breaking change:** Hayır
- **Downstream:** B-01, B-22, B-23 (matrix asimetri)

### B-22 [YÜKSEK][KÜTÜPHANE] KAMU profili matris asimetrisi (constants 9, rules 6 tip)
- **Kaynak:** Denetim 01 §Y2
- **Dosya:** `src/config/constants.ts:35`, `src/calculator/invoice-rules.ts:40`
- **Normatif:** CommonSchematron:176 IADE yasağı
- **Gözlem:** constants TICARIFATURA kopyası (9 tip), rules kısıtlı (6 tip). Tek truth source gerekli.
- **Etki:** UI derivation ↔ validator tutarsızlığı.
- **Breaking change:** Hayır
- **Downstream:** B-01, B-21, B-23

### B-23 [YÜKSEK][KÜTÜPHANE] EARSIVFATURA matris farkı (SGK/TEVKIFATIADE/HKSSATIS/HKSKOMISYONCU)
- **Kaynak:** Denetim 01 §Y3
- **Dosya:** `src/config/constants.ts:59`, `src/calculator/invoice-rules.ts:62`
- **Normatif:** CommonSchematron özel tip kısıtı yok
- **Gözlem:** İki matriste 4 öğe farkı.
- **Etki:** UI ↔ validator tutarsızlık.
- **Breaking change:** Hayır
- **Downstream:** —

### B-24 [YÜKSEK][KÜTÜPHANE] 151 (ÖTV "İstisna Olmayan Diğer") kodu eksik
- **Kaynak:** Denetim 02 §1.3 (Y1)
- **Dosya:** `src/config/constants.ts:186-200`
- **Normatif:** Codelist satır 21 (151 tanımlı); v1.42 §4.8.4
- **Gözlem:** ISTISNA kümesi 101-108 içeriyor; 151 atlanmış.
- **Etki:** ÖTV istisnası içeren fatura üretilemez.
- **Breaking change:** Hayır (eklemek)
- **Downstream:** —

### B-25 [YÜKSEK][KÜTÜPHANE] 351 kodu çift truth source (constants'ta yok, exemption-config'de var)
- **Kaynak:** Denetim 02 §1.4 (Y2) + Denetim 05 §1.2.5 (Y3)
- **Dosya:** `src/config/constants.ts:186-200`, `src/calculator/exemption-config.ts:82`, `src/calculator/document-calculator.ts:68`
- **Normatif:** Codelist satır 21 (351 tanımlı)
- **Gözlem:** `DEFAULT_EXEMPTIONS.satis='351'` mapper üretir, `ISTISNA_TAX_EXEMPTION_REASON_CODES` validator reddeder.
- **Etki:** Mapper üretir, validator kendi kodunu reddeder — döngü.
- **Breaking change:** Hayır
- **Downstream:** B-81 (mapper shouldAddExemption)
- **[MİMARİ REVİZE — Açık Soru #12 cevabı — M5]** 351 "İstisna olmayan diğer" — **non-ISTISNA tiplerinde** kullanılır. SATIS+351 doğru (hatta kalemde KDV 0 varsa zorunlu). ISTISNA+351 yanlış. Ayrı set `NON_ISTISNA_REASON_CODES`. Cross-check matrisinde `allowedTypes: non-ISTISNA`. Detay FIX-PLANI-v2.md M5.

### B-26 [YÜKSEK][KÜTÜPHANE] tax-config 5 kod eksik (0021/0022/4171/9015/9944) — runtime exception
- **Kaynak:** Denetim 02 §2.1 (Y3) + Denetim 05 §4.1 (O3)
- **Dosya:** `src/calculator/tax-config.ts:18-44`
- **Normatif:** Codelist satır 15 (31 kod); `constants.ts:TAX_TYPE_CODES` 31 kod tam
- **Gözlem:** `isValidTaxCode('0021')` → false; `getTax('0021')` → throw. İki tarafta uyumsuz.
- **Etki:** Kullanıcı 0021 girse calculator exception atar.
- **Breaking change:** Hayır (eklemek)
- **Downstream:** B-60 (isValid* dead functions)

### B-27 [YÜKSEK][KÜTÜPHANE] Tevkifat 650 kodu desteksiz (Codelist iç çelişki + lib karar)
- **Kaynak:** Denetim 02 §2.2 (Y4)
- **Dosya:** `src/config/constants.ts:120-127`, `src/calculator/withholding-config.ts:15-68`
- **Normatif:** Codelist satır 17 WithholdingTaxTypeWithPercent'te 65020-65090 var; ana satır 16 `WithholdingTaxType`'da 650 yok
- **Gözlem:** Codelist kendi içinde çelişki; kütüphane 650 yok tarafını seçmiş. Mimsoft/GİB mutabakat gerekli.
- **Etki:** Kullanıcı 650 yazamaz.
- **Breaking change:** Hayır (eklenirse)
- **Downstream:** B-04
- **[MİMARİ REVİZE — Açık Soru #6 cevabı — M3]** 650 eklenir, dinamik yüzde mekanizması ile. `type: 'dynamic_percent'`, kullanıcıdan 0-100 arası `withholdingTaxPercent` alır. Detay FIX-PLANI-v2.md M3.

### B-28 [YÜKSEK][KÜTÜPHANE] TRL (eski Türk Lirası) ISO 4217 dışı kabul ediliyor
- **Kaynak:** Denetim 02 §3 (Y5)
- **Dosya:** `src/config/constants.ts:221`
- **Normatif:** Codelist satır 46 CurrencyCodeList TRL yok; TRL 2005'te geçersiz
- **Gözlem:** `CURRENCY_CODES` TRL içeriyor.
- **Etki:** TRL'li fatura üretilebilir, Schematron reddeder.
- **Breaking change:** Evet (TRL çıkarılıyor — gerçekte kimse kullanmıyor ama API yüzeyi değişir)
- **Downstream:** —

### B-29 [YÜKSEK][KÜTÜPHANE] IHRACAT satır PriceAmount/LineExtensionAmount zorunluluğu kontrol yok
- **Kaynak:** Denetim 03 §Y1
- **Dosya:** `src/validators/profile-validators.ts:50-108`
- **Normatif:** CommonSchematron:404-406
- **Gözlem:** IHRACAT satırlarında amount alanları zorunlu ama kontrol yok.
- **Etki:** Boş amount'lu IHRACAT fatura lib'den geçer, Schematron reddeder.
- **Breaking change:** Evet (yeni kural)
- **Downstream:** —

### B-30 [YÜKSEK][KÜTÜPHANE] WithholdingTaxTotal ters-yön kontrolü yok (SATIS'ta geçiyor)
- **Kaynak:** Denetim 03 §Y2
- **Dosya:** `src/validators/type-validators.ts:27-29,93-130`
- **Normatif:** CommonSchematron:289 (WithholdingTaxTotal varsa tip TEVKIFAT/IADE/SGK/SARJ/SARJANLIK)
- **Gözlem:** SATIS'ta WithholdingTaxTotal verilirse lib geçirir, Schematron reddeder.
- **Etki:** Yanlış tip+stopaj kombinasyonları lib'den geçer.
- **Breaking change:** Evet
- **Downstream:** —

### B-31 [YÜKSEK][KÜTÜPHANE] IADE grubu DocumentTypeCode='IADE' kontrol yok
- **Kaynak:** Denetim 03 §Y3
- **Dosya:** `src/validators/type-validators.ts:63-90`
- **Normatif:** CommonSchematron:358
- **Gözlem:** Yalnız ID 16-hane kontrolü; DocumentTypeCode='IADE' zorunluluğu yok.
- **Etki:** IADE grubu referansı eksik DocumentTypeCode ile geçer.
- **Breaking change:** Evet
- **Downstream:** —

### B-32 [YÜKSEK][KÜTÜPHANE] DocumentReferenceType IssueDate zorunlu, lib opsiyonel
- **Kaynak:** Denetim 04 §Y1
- **Dosya:** `src/serializers/reference-serializer.ts:18-20,71-73,94-96`
- **Normatif:** XSD DocumentReferenceType:1392-1403 (IssueDate zorunlu)
- **Gözlem:** `if (isNonEmpty(ref.issueDate))` ile atlanıyor; XSD minOccurs=1.
- **Etki:** IADE/OriginatorDocumentReference içeren her fatura xmllint fail.
- **Breaking change:** Evet (tip opsiyonel→zorunlu)
- **Downstream:** B-39
- **[MİMARİ REVİZE — Açık Soru #13 cevabı — M6]** Parent-child conditional: `documentReferences?: DocumentReference[]` opsiyonel (parent); ama `DocumentReference = { id: string; issueDate: string; ... }` — verilirse tüm alanlar zorunlu. Detay FIX-PLANI-v2.md M6.

### B-33 [YÜKSEK][KÜTÜPHANE] OrderReferenceType IssueDate zorunlu, lib opsiyonel
- **Kaynak:** Denetim 04 §Y2
- **Dosya:** `src/serializers/reference-serializer.ts:37-39`
- **Normatif:** XSD OrderReferenceType:2102-2110
- **Gözlem:** B-32 paraleli.
- **Etki:** OrderReference içeren her fatura xmllint fail.
- **Breaking change:** Evet
- **Downstream:** B-47
- **[MİMARİ REVİZE — Açık Soru #13 cevabı — M6]** Parent-child conditional: orderReference opsiyonel (parent); verilirse `id` + `issueDate` zorunlu. Detay FIX-PLANI-v2.md M6.

### B-34 [YÜKSEK][KÜTÜPHANE] PartyType PostalAddress XSD zorunlu, lib emit etmez
- **Kaynak:** Denetim 04 §Y3
- **Dosya:** `src/serializers/party-serializer.ts:93-115`
- **Normatif:** XSD PartyType:2130-2145 (PostalAddress zorunlu)
- **Gözlem:** `hasAddress=false` ise atlanıyor.
- **Etki:** Adres eksik Party her fatura xmllint fail.
- **Breaking change:** Evet
- **Downstream:** B-35, B-36, B-37
- **[MİMARİ REVİZE — Açık Soru #13 cevabı — M6]** Parent-child conditional: Party opsiyonel (parent seviye — supplierParty/customerParty), ancak Party verilirse PostalAddress zorunlu. Detay FIX-PLANI-v2.md M6.

### B-35 [YÜKSEK][KÜTÜPHANE] Address CityName/CitySubdivisionName XSD zorunlu, lib opsiyonel
- **Kaynak:** Denetim 04 §Y4
- **Dosya:** `src/serializers/party-serializer.ts:105-106`, `src/serializers/delivery-serializer.ts:66-67`
- **Normatif:** XSD satır 708-709
- **Gözlem:** Adres verilse bile opsiyonel.
- **Etki:** Eksik şehir/ilçe her adres xmllint fail.
- **Breaking change:** Evet
- **Downstream:** —
- **[MİMARİ REVİZE — Açık Soru #13 cevabı — M6]** Parent-child conditional: Address opsiyonel; Address verilirse `cityName` + `citySubdivisionName` zorunlu. Detay FIX-PLANI-v2.md M6.

### B-36 [YÜKSEK][KÜTÜPHANE] BuyerCustomerParty PostalAddress+PartyTaxScheme+Contact yok
- **Kaynak:** Denetim 04 §Y5
- **Dosya:** `src/serializers/party-serializer.ts:137-191`
- **Normatif:** XSD PartyType PostalAddress zorunlu
- **Gözlem:** BuyerCustomerParty alt Party'de eksik alanlar.
- **Etki:** IHRACAT/YOLCU/KAMU senaryoları xmllint fail.
- **Breaking change:** Evet
- **Downstream:** B-48

### B-37 [YÜKSEK][KÜTÜPHANE] TaxRepresentativeParty PostalAddress+PartyName yok
- **Kaynak:** Denetim 04 §Y6
- **Dosya:** `src/serializers/party-serializer.ts:194-216`
- **Normatif:** XSD PartyType
- **Gözlem:** YOLCUBERABERFATURA için gerekli Party alt alanları yok.
- **Etki:** YOLCU senaryosu xmllint fail.
- **Breaking change:** Evet
- **Downstream:** —

### B-38 [YÜKSEK][KÜTÜPHANE] CustomizationID Fatura için TR1.2 (lib TR1.2.1 veriyor)
- **Kaynak:** Denetim 04 §Y7 + Denetim 06 §8.2 (İrsaliye tarafı TR1.2.1 doğru)
- **Dosya:** `src/config/namespaces.ts:28`
- **Normatif:** Skill `e-fatura-ubl-tr-v1.0.md:77` "Sabit: TR1.2"; GİB XML'leri TR1.2; İrsaliye TR1.2.1
- **Gözlem:** Tek sabit iki belge için kullanılıyor; farklı olmalı. Mimsoft/GİB teyit gerekli (Açık Soru #23).
- **Etki:** Fatura çıktısında yanlış CustomizationID.
- **Breaking change:** Evet (çıktı değeri değişiyor)
- **Downstream:** —
- **[MİMARİ REVİZE — Açık Soru #16 cevabı — M8]** Hem Fatura hem İrsaliye **TR1.2**. Ayrı sabit gereksiz. Tek `UBL_CUSTOMIZATION_ID = 'TR1.2'` yeter. Detay FIX-PLANI-v2.md M8.

### B-39 [YÜKSEK][KÜTÜPHANE] OriginatorDocumentReference desteği yok
- **Kaynak:** Denetim 04 §Y9
- **Dosya:** `src/serializers/invoice-serializer.ts` (eksik)
- **Normatif:** XSD UBL-Invoice-2.1.xsd:32
- **Gözlem:** Komisyoncu/özel referans senaryoları üretilemiyor.
- **Etki:** Eksik özellik — kullanıcı elde edemez.
- **Breaking change:** Hayır (eklemek)
- **Downstream:** B-32

### B-40 [YÜKSEK][KÜTÜPHANE] PayableRoundingAmount desteklenmiyor
- **Kaynak:** Denetim 05 §1.2.3 (Y1)
- **Dosya:** `src/calculator/document-calculator.ts:17-29`, `src/calculator/simple-invoice-mapper.ts:269-277`
- **Normatif:** Skill `ortak-parasal-ve-vergi-v0.7.md` §5
- **Gözlem:** Yuvarlama farkı `PayableRoundingAmount` alanına gitmiyor.
- **Etki:** Kuruş farkı oluşan faturalarda PayableAmount tutmayabilir.
- **Breaking change:** Hayır (eksik özellik)
- **Downstream:** B-46
- **[İPTAL — Açık Soru #20 cevabı — M9]** Yuvarlama sadece serializer'da, hesapta yok. Hesap tam float olduğu için kuruş farkı oluşmaz. PayableRoundingAmount ihtiyacı kalkar. (Kullanıcı talep ederse opsiyonel ek özellik olarak değerlendirilebilir.)

### B-41 [YÜKSEK][KÜTÜPHANE] TEVKIFATIADE tip override imkansız (TEVKIFAT mutlak öncelik)
- **Kaynak:** Denetim 05 §1.2.4 (Y2)
- **Dosya:** `src/calculator/document-calculator.ts:216`
- **Normatif:** kod-listeleri v1.42 TEVKIFAT ve TEVKIFATIADE ayrı kodlar
- **Gözlem:** `typesArray.includes('TEVKIFAT')` mutlak öncelik — TEVKIFATIADE override edilemez.
- **Etki:** TEVKIFATIADE tipi üretilemez.
- **Breaking change:** Evet (öncelik kuralı değişir)
- **Downstream:** B-21

### B-42 [YÜKSEK][KÜTÜPHANE] Percent 0-basamak yuvarlama (18.5→19 kayıp)
- **Kaynak:** Denetim 05 §2.4 (Y4)
- **Dosya:** `src/serializers/tax-serializer.ts:36,73`
- **Normatif:** Skill `ortak-parasal-ve-vergi-v0.7.md` §268 (kesirli oran kabul)
- **Gözlem:** `formatDecimal(percent, 0)` kesirli oranı kaybediyor.
- **Etki:** Kesirli KDV/stopaj oranları yanlış çıkıyor.
- **Breaking change:** Evet (çıktı değeri değişir)
- **Downstream:** —
- **[MİMARİ REVİZE — Açık Soru #20 cevabı — M9]** Yuvarlama sadece serializer'da. `formatDecimal(percent, 2)` (kesirli oran korunur). Calculator'da float; XML yazımında 2 basamak. Detay FIX-PLANI-v2.md M9.

### B-43 [YÜKSEK][KÜTÜPHANE] ConfigManager.resolveUnitCode case-sensitive (çift truth source)
- **Kaynak:** Denetim 05 §3.1 (Y6)
- **Dosya:** `src/calculator/config-manager.ts:370-374,283-288`, `src/calculator/unit-config.ts:97-99,106-111`
- **Normatif:** —
- **Gözlem:** `unit-config.resolveUnitCode` lowercase normalize, ConfigManager etmiyor. "kilogram" lowercase girdisi ConfigManager'da bulunmaz.
- **Etki:** Davranış farkı — DB override'lı ve yalın kullanım farklı sonuç verir.
- **Breaking change:** Hayır
- **Downstream:** —

### B-44 [YÜKSEK][KÜTÜPHANE] setLiability('earchive') isExport=true session'ında kontrat ihlali
- **Kaynak:** Denetim 05 §3.4 (Y7)
- **Dosya:** `src/calculator/invoice-session.ts:186-208`, `src/calculator/invoice-rules.ts:76-93`
- **Normatif:** Constructor kontratı (isExport=true iken profil IHRACAT kalmalı)
- **Gözlem:** `setLiability('earchive')` isExport=true iken profil IHRACAT→TICARIFATURA'ya düşüyor.
- **Etki:** Kullanıcı export + e-arşiv kombine etmeye çalışırken beklenmedik profil değişimi.
- **Breaking change:** Evet (davranış değişiyor) — karar gerekli (Açık Soru #33)
- **Downstream:** —
- **[MİMARİ REVİZE — Açık Soru #23 cevabı — M10]** isExport=true iken `setLiability()` çağrısı dikkate alınmaz (no-op, error değil). Profil her zaman IHRACAT. Detay FIX-PLANI-v2.md M10.

### B-45 [YÜKSEK][KÜTÜPHANE] getAvailableExemptions Schematron 316/318/320 kabul tipi listesi eksik
- **Kaynak:** Denetim 05 §4.4 (Y9)
- **Dosya:** `src/calculator/invoice-rules.ts:293-307`
- **Normatif:** CommonSchematron:316,318,320
- **Gözlem:** SGK/IADE ISTISNA kodları listede yok.
- **Etki:** UI derivation SGK/IADE tipinde istisna kodu önermiyor.
- **Breaking change:** Hayır (eklemek)
- **Downstream:** B-06

### B-46 [YÜKSEK][KÜTÜPHANE] Satır vs belge yuvarlama tutarlılığı yok
- **Kaynak:** Denetim 05 §2.2.3 (Y5)
- **Dosya:** `src/calculator/*.ts`, `src/utils/xml-helpers.ts:42-48`
- **Normatif:** Schematron `decimalCheck`:229-231 (max 2 basamak)
- **Gözlem:** Calculator float, serializer `toFixed(2)`. Σ satır.toFixed(2) ≠ belge.toFixed(2) senaryoları mümkün.
- **Etki:** Multi-satır faturalarda 1 kuruş tutarsızlık.
- **Breaking change:** Evet (yuvarlama stratejisi karar gerekli — Açık Soru #29)
- **Downstream:** B-40, B-15
- **[MİMARİ REVİZE — Açık Soru #20 cevabı — M9]** Yuvarlama sadece serializer'da, calculator tamamen float. Σ satır ile belge float seviyesinde zaten eşit; XML yazımında ilgili key'ler XSD'ye göre yuvarlanır ama iç hesaba yansımaz. Tutarsızlık kaynak problemi kalkar. Detay FIX-PLANI-v2.md M9.

### B-47 [YÜKSEK][KÜTÜPHANE] resolveProfileForType earchive+SGK geçersiz fallback
- **Kaynak:** Denetim 05 §5.2 (Y10)
- **Dosya:** `src/calculator/invoice-rules.ts:216-232`
- **Normatif:** —
- **Gözlem:** SGK yalnız TEMELFATURA/TICARIFATURA'da; allowed boşsa TICARIFATURA fallback ediyor (ama liability=earchive ile kesişim boş).
- **Etki:** earchive+SGK kombinasyonu sessiz yanlış profil ile üretiliyor.
- **Breaking change:** Evet
- **Downstream:** —

### B-48 [YÜKSEK][KÜTÜPHANE] Despatch BuyerCustomer/Seller/Originator Party desteksiz
- **Kaynak:** Denetim 04 §O5 + Denetim 06 §Y3
- **Dosya:** `src/types/despatch-input.ts`, `src/serializers/despatch-serializer.ts`
- **Normatif:** UBL-DespatchAdvice-2.1.xsd satır 26-28; skill `senaryo-temel-irsaliye-v0.3.md §4.3`; canonical `Irsaliye-Ornek3.xml`
- **Gözlem:** Üç party tipi de despatch-input'ta yok.
- **Etki:** Farklı tarafların bulunduğu (üretici≠satıcı≠alıcı) irsaliye üretilemiyor.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —

### B-49 [YÜKSEK][KÜTÜPHANE] TransportHandlingUnit/DORSEPLAKA canonical path desteksiz
- **Kaynak:** Denetim 06 §Y4
- **Dosya:** `src/types/despatch-input.ts:48-61`, `src/serializers/despatch-serializer.ts:101-166`
- **Normatif:** XSD ShipmentType:2637 (TransportHandlingUnit 0..n); skill §7; canonical `Irsaliye-Ornek1.xml:195-202`
- **Gözlem:** Lib `LicensePlateID[schemeID="DORSE"]` (Codelist yolu); canonical `TransportEquipment[schemeID="DORSEPLAKA"]` (TransportHandlingUnit içinde). Kullanıcı canonical yolu seçemiyor.
- **Etki:** Mimsoft/GİB canonical path bekliyorsa eksik.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** Açık Soru #37

### B-50 [YÜKSEK][KÜTÜPHANE] Kısmi gönderim (OutstandingQuantity/OversupplyQuantity) desteksiz
- **Kaynak:** Denetim 06 §Y5
- **Dosya:** `src/types/despatch-input.ts:89-99`
- **Normatif:** XSD DespatchLineType:1367-1369; skill senaryo §4.2
- **Gözlem:** İnput tipte alanlar yok.
- **Etki:** Kısmi gönderim irsaliyesi üretilemiyor.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —
- **[İPTAL — Açık Soru #25e cevabı]** Eklemeye gerek yok; kullanım yok. Fix planından çıkarıldı.

### B-51 [YÜKSEK][KÜTÜPHANE] Çoklu DriverPerson desteksiz
- **Kaynak:** Denetim 06 §Y6
- **Dosya:** `src/types/despatch-input.ts:56`, `src/serializers/despatch-serializer.ts:124-134`
- **Normatif:** Canonical `Irsaliye-Ornek1.xml` 2 DriverPerson; XSD ShipmentStageType maxOccurs="unbounded"
- **Gözlem:** Tekil `driverPerson`.
- **Etki:** İki şoförlü irsaliye üretilemiyor.
- **Breaking change:** Hayır (tipe array desteği eklenir, tekil de geriye uyumlu)
- **Downstream:** —

### B-52 [YÜKSEK][KÜTÜPHANE] Despatch LineCountNumeric emit yolu yok
- **Kaynak:** Denetim 04 §O4 + Denetim 06 §Y1
- **Dosya:** `src/serializers/despatch-serializer.ts` (eksik)
- **Normatif:** UBL-DespatchAdvice-2.1.xsd:20; skill §4 #12
- **Gözlem:** Opsiyonel (0..1) ama emit yolu yok.
- **Etki:** Sipariş ile karşılaştırma alanı üretilemiyor.
- **Breaking change:** Hayır
- **Downstream:** —

### B-53 [YÜKSEK][KÜTÜPHANE] Despatch OrderReference XSD 0..n, lib 0..1
- **Kaynak:** Denetim 06 §Y2
- **Dosya:** `src/types/despatch-input.ts:40`, `src/serializers/despatch-serializer.ts:58-60`
- **Normatif:** XSD `cac:OrderReference` maxOccurs="unbounded"; skill §4 #13
- **Gözlem:** Tekil `orderReference`.
- **Etki:** Birden fazla sipariş referansı irsaliye üretilemiyor.
- **Breaking change:** Hayır
- **Downstream:** —

### B-54 [ORTA][KÜTÜPHANE] IHRACAT matris asimetri (constants 9 tip, rules 3 tip)
- **Kaynak:** Denetim 01 §O1
- **Dosya:** `src/config/constants.ts:33`, `src/calculator/invoice-rules.ts:43`
- **Normatif:** CommonSchematron IHRACAT tip kısıtı yok; KodListeleri v1.42:762 yumuşak özet
- **Gözlem:** constants aşırı geniş, rules aşırı dar.
- **Etki:** UI ↔ validator tutarsız.
- **Breaking change:** Hayır
- **Downstream:** B-01, B-22, B-23
- **[MİMARİ REVİZE — Açık Soru #2 cevabı — M2]** IHRACAT için tek tip: **ISTISNA**. Matriste `IHRACAT: ['ISTISNA']`. Detay FIX-PLANI-v2.md M2.

### B-55 [ORTA][KÜTÜPHANE] YOLCUBERABERFATURA matris asimetri (9 vs 2)
- **Kaynak:** Denetim 01 §O2
- **Dosya:** `src/config/constants.ts:35`, `src/calculator/invoice-rules.ts:42`
- **Normatif:** CommonSchematron:342-345
- **Gözlem:** Matrix asimetri.
- **Etki:** Aynı B-54.
- **Breaking change:** Hayır
- **Downstream:** —
- **[MİMARİ REVİZE — Açık Soru #2 cevabı — M2]** YOLCUBERABERFATURA için tek tip: **ISTISNA**. Matriste `YOLCUBERABERFATURA: ['ISTISNA']`. Detay FIX-PLANI-v2.md M2.

### B-56 [ORTA][KÜTÜPHANE] OZELFATURA matris asimetri (9 vs 2)
- **Kaynak:** Denetim 01 §O3
- **Dosya:** `src/config/constants.ts:36`, `src/calculator/invoice-rules.ts:42`
- **Normatif:** CommonSchematron özel tip kısıtı yok
- **Gözlem:** Matrix asimetri.
- **Etki:** Aynı B-54.
- **Breaking change:** Hayır
- **Downstream:** —
- **[MİMARİ REVİZE — Açık Soru #2 cevabı — M2]** OZELFATURA için tek tip: **ISTISNA**. Matriste `OZELFATURA: ['ISTISNA']`. Detay FIX-PLANI-v2.md M2.

### B-57 [ORTA][KÜTÜPHANE] exemption-config 17 tam istisna kodu eksik (326-344, 704) + 326 fatura sessiz düşüyor
- **Kaynak:** Denetim 02 §1.5 (O1) + Denetim 05 §4.3 (Y7 — KDV 326 sessiz düşme)
- **Dosya:** `src/calculator/exemption-config.ts:15-111`, `src/calculator/document-calculator.ts:236-241`
- **Normatif:** v1.42 §4.8.2; `constants.ts` whitelist'lerde var
- **Gözlem:** Consumer UI'da eksik kodlar dropdown'da gözükmüyor; kullanıcı 326 girse `getExemption` undefined döner.
- **Etki:** Tam istisnalı faturalarda UI/mapper davranışı tutarsız.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —

### B-58 [ORTA][KÜTÜPHANE] Unit kodu D32/TWH semantik çelişki (Terawatt Saat vs Bin Kilowatt)
- **Kaynak:** Denetim 02 §4.1 (O2)
- **Dosya:** `src/calculator/unit-config.ts:48`
- **Normatif:** v1.42 §4.5 `D32=TERAWATT SAAT`
- **Gözlem:** TWH adı "Bin Kilowatt Saat" — yanlış.
- **Etki:** Enerji sektörü faturaları yanlış birim raporlayabilir.
- **Breaking change:** Evet (unit tanım değişimi)
- **Downstream:** —

### B-59 [ORTA][KÜTÜPHANE] GWH/MWH/SM3 enerji birimleri eksik
- **Kaynak:** Denetim 02 §4.2 (O3)
- **Dosya:** `src/calculator/unit-config.ts:13-89`
- **Normatif:** v1.42 §4.5
- **Gözlem:** Türkçe input için eksik.
- **Etki:** Enerji sektörü eksik birim tanımı.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —

### B-60 [ORTA][KÜTÜPHANE] PackagingTypeCode whitelist yok
- **Kaynak:** Denetim 02 §5 (O4)
- **Dosya:** `src/types/common.ts:287`, `src/serializers/delivery-serializer.ts:122-123`
- **Normatif:** v1.42 §4.13 (27 kod); Codelist satır 44
- **Gözlem:** Serbest string — geçersiz kod girilebiliyor.
- **Etki:** Geçersiz ambalaj kodu üretilebilir.
- **Breaking change:** Evet (kısıtlama)
- **Downstream:** —
- **[KAPSAM GENİŞLEDİ — Açık Soru #8 cevabı — D1]** Whitelist Set'e ek olarak `src/calculator/package-type-code-config.ts` yeni dosya: her kod için Türkçe name detayı (UI dropdown için). Detay FIX-PLANI-v2.md D1.

### B-61 [ORTA][KÜTÜPHANE] 5 `isValid*` fonksiyonu hiçbir validator'da çağrılmıyor (dead code)
- **Kaynak:** Denetim 02 §10.3 (O5)
- **Dosya:** `src/calculator/tax-config.ts:56`, `withholding-config.ts:76`, `exemption-config.ts:124`, `unit-config.ts:114`, `currency-config.ts:55`
- **Normatif:** —
- **Gözlem:** Çift truth source kanıtı.
- **Etki:** Karışıklık, bakım yükü.
- **Breaking change:** Hayır (silmek)
- **Downstream:** B-26, B-57

### B-62 [ORTA][KÜTÜPHANE] 1460415308 VKN cross-check yok (TaxFreeInvoice)
- **Kaynak:** Denetim 03 §O1
- **Dosya:** `src/validators/common-validators.ts:119-154`
- **Normatif:** CommonSchematron:275-277
- **Gözlem:** 1460415308 VKN varsa profil YOLCU/IHRACAT/OZELFATURA/KAMU zorunlu — kontrol yok.
- **Etki:** Yanlış profil lib'den geçer.
- **Breaking change:** Evet (yeni kural)
- **Downstream:** —

### B-63 [ORTA][KÜTÜPHANE] 7750409379 SGK VKN cross-check yok
- **Kaynak:** Denetim 03 §O2
- **Dosya:** `src/validators/common-validators.ts`
- **Normatif:** CommonSchematron:508-510
- **Gözlem:** 7750409379 VKN varsa tip SGK/TEVKIFAT zorunlu — kontrol yok.
- **Etki:** Yanlış tip SGK faturası lib'den geçer.
- **Breaking change:** Evet (yeni kural)
- **Downstream:** —

### B-64 [ORTA][KÜTÜPHANE] ExchangeRate format kontrolü yok (regex tanımlı ama kullanılmıyor)
- **Kaynak:** Denetim 03 §O3
- **Dosya:** `src/validators/common-validators.ts:55-57`
- **Normatif:** CommonSchematron:190 (15 basamak, nokta sonrası 1-6)
- **Gözlem:** `EXCHANGE_RATE_REGEX` dead.
- **Etki:** Hatalı format lib'den geçer.
- **Breaking change:** Evet
- **Downstream:** —

### B-65 [ORTA][KÜTÜPHANE] IssueDate aralık kontrolü yok (bugün/2005 sınırı)
- **Kaynak:** Denetim 03 §O4
- **Dosya:** `src/validators/common-validators.ts:38-42`
- **Normatif:** CommonSchematron:169-170
- **Gözlem:** Yalnız DATE_REGEX format kontrolü.
- **Etki:** 1999 tarihi fatura lib'den geçer.
- **Breaking change:** Evet (yeni kural)
- **Downstream:** —

### B-66 [ORTA][KÜTÜPHANE] MATBUDAN AdditionalDocumentReference alan kontrolü kısmi
- **Kaynak:** Denetim 03 §O5
- **Dosya:** `src/validators/despatch-validators.ts:138-142`
- **Normatif:** CommonSchematron:703
- **Gözlem:** ID+IssueDate dolu kontrolü yok; yalnız liste boş-değil.
- **Etki:** Eksik MATBUDAN referansı lib'den geçer.
- **Breaking change:** Evet (yeni kural)
- **Downstream:** B-86

### B-67 [ORTA][KÜTÜPHANE] YatirimTesvik CalculationSequenceNumeric=-1 zorunluluğu kontrol yok
- **Kaynak:** Denetim 03 §O6
- **Dosya:** `src/validators/profile-validators.ts:227-318`
- **Normatif:** CommonSchematron:467-469
- **Gözlem:** YTB ISTISNA satır CalculationSequenceNumeric -1 zorunlu — kontrol yok.
- **Etki:** YTB ISTISNA satırı yanlış değer lib'den geçer.
- **Breaking change:** Evet
- **Downstream:** —

### B-68 [ORTA][KÜTÜPHANE] Despatch/Invoice ProfileID whitelist runtime kontrol yok
- **Kaynak:** Denetim 03 §O7 + Denetim 06 §O3
- **Dosya:** `src/validators/common-validators.ts:30-32`, `src/validators/despatch-validators.ts:32-38`
- **Normatif:** CommonSchematron:147, :702, :758
- **Gözlem:** TS enum build-time güvence, JSON input runtime atlatılabilir (`as any`).
- **Etki:** Geçersiz profil lib'den geçer.
- **Breaking change:** Evet
- **Downstream:** —

### B-69 [ORTA][KÜTÜPHANE] PartyIdentification schemeID whitelist kullanılmıyor (3 denetim teyidi)
- **Kaynak:** Denetim 02 (dead set) + Denetim 03 §O8 + Denetim 06 §O6
- **Dosya:** `src/validators/common-validators.ts:119-154`
- **Normatif:** CommonSchematron:250-251
- **Gözlem:** `PARTY_IDENTIFICATION_SCHEME_IDS` constants tanımlı ama çağrılmıyor — 3 denetim aynı bulguyu işaretledi.
- **Etki:** Yanlış schemeID'li identity lib'den geçer.
- **Breaking change:** Evet
- **Downstream:** —

### B-70 [ORTA][KÜTÜPHANE] PaymentMeans PaymentMeansCode XSD zorunlu, lib opsiyonel
- **Kaynak:** Denetim 04 §O2
- **Dosya:** `src/serializers/monetary-serializer.ts:55-57`
- **Normatif:** XSD PaymentMeansType:2199-2208
- **Gözlem:** Code verilmezse fail.
- **Etki:** Ödeme metodu içeren faturalar xmllint fail.
- **Breaking change:** Evet
- **Downstream:** —
- **[MİMARİ REVİZE — Açık Soru #13 cevabı — M6]** Parent-child conditional: paymentMeans opsiyonel; paymentMeans verilirse `paymentMeansCode` zorunlu. Detay FIX-PLANI-v2.md M6.

### B-71 [ORTA][KÜTÜPHANE] TaxExchangeRate emit yolu yok
- **Kaynak:** Denetim 04 §O3
- **Dosya:** `src/serializers/monetary-serializer.ts:32-46`, `src/serializers/invoice-serializer.ts:223`
- **Normatif:** XSD satır 37-40 (4 ayrı ExchangeRate); skill `ortak-parasal-ve-vergi-v0.7.md`
- **Gözlem:** Yalnız PricingExchangeRate. TaxCurrencyCode farklıysa TaxExchangeRate gerekli.
- **Etki:** Dövizli TRY-KDV faturalarında eksik.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** B-11

### B-72 [ORTA][KÜTÜPHANE] Despatch Shipment ID hard-coded "1"
- **Kaynak:** Denetim 04 §O6 + Denetim 06 §O2
- **Dosya:** `src/serializers/despatch-serializer.ts:102`, `src/serializers/delivery-serializer.ts:88`
- **Normatif:** XSD ShipmentType.ID zorunlu (değer serbest)
- **Gözlem:** Değer sabit; kullanıcı override edemiyor.
- **Etki:** Birden fazla Shipment ayırt edilemiyor.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —

### B-73 [ORTA][KÜTÜPHANE] Despatch Shipment boş placeholder GoodsItem + ValueAmount yok
- **Kaynak:** Denetim 04 §O7 + Denetim 06 §O1
- **Dosya:** `src/serializers/despatch-serializer.ts:104-107`, `src/types/despatch-input.ts:48-61`
- **Normatif:** XSD GoodsItemType; skill §7.1 (ValueAmount)
- **Gözlem:** Kütüphane boş GoodsItem placeholder yazıyor; input'ta ValueAmount alanı yok.
- **Etki:** Toplam mal değeri yazılamıyor + boş XML placeholder.
- **Breaking change:** Hayır (ekleme + placeholder temizlik)
- **Downstream:** —

### B-74 [ORTA][KÜTÜPHANE] Invoice PaymentCurrencyCode desteksiz
- **Kaynak:** Denetim 04 §O8
- **Dosya:** `src/serializers/invoice-serializer.ts` (yok)
- **Normatif:** XSD satır 23
- **Gözlem:** Ödeme para birimi farklı olsa dahi emit edilemiyor.
- **Etki:** Dövizli fatura + TRY ödeme senaryoları üretilemiyor.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —

### B-75 [ORTA][KÜTÜPHANE] Damga V./Konaklama V. baseCalculate=false semantik şüphesi
- **Kaynak:** Denetim 05 §1.1.2 (O1)
- **Dosya:** `src/calculator/line-calculator.ts:29-30`
- **Normatif:** —
- **Gözlem:** Damga V./Konaklama V. KDV matrahından düşüyor; calculate-service DB bu flag'ı embed ediyor. Türkiye vergi mevzuatında Damga V. normalde matrahtan düşmez (Açık Soru #35).
- **Etki:** Yanlış KDV matrahı riski.
- **Breaking change:** Evet (davranış değişimi)
- **Downstream:** —
- **[İPTAL — Açık Soru #24 cevabı]** Kütüphane doğru. Vergi matrahı düşülen vergiler var; bu konuda değişiklik yok. Fix planından çıkarıldı.

### B-76 [ORTA][KÜTÜPHANE] resolveProfile buyerCustomer varlığını IHRACAT'a zorluyor
- **Kaynak:** Denetim 05 §1.2.6 (O2)
- **Dosya:** `src/calculator/document-calculator.ts:306`
- **Normatif:** —
- **Gözlem:** YOLCU/KAMU'da da buyerCustomer var; sadece IHRACAT çıkarımı yanlış.
- **Etki:** Profil yanlış çıkarılıyor.
- **Breaking change:** Evet
- **Downstream:** —

### B-77 [ORTA][KÜTÜPHANE] TYPE_PROFILE_MAP YTB tipleri için EARSIVFATURA eksik
- **Kaynak:** Denetim 05 §5.1 (O4)
- **Dosya:** `src/calculator/invoice-rules.ts:50-63`
- **Normatif:** PROFILE_TYPE_MAP EARSIV YTB'leri destekliyor
- **Gözlem:** Çift yön eşleşme eksik.
- **Etki:** UI YTB + EARSIV kombinasyonunu göstermiyor.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —

### B-78 [ORTA][KÜTÜPHANE] validateInvoiceState 5+ Schematron kuralı eksik (D03 paraleli)
- **Kaynak:** Denetim 05 §5.3 (O6) — D03 KRİTİK/YÜKSEK'lerle paralel
- **Dosya:** `src/calculator/invoice-rules.ts:312-392`
- **Normatif:** D03 §1-§4, §Y1-Y4
- **Gözlem:** UI'de 555, YATIRIMTESVIK KDV, 702 satır, 4171, YOLCU/IHRACAT party detayları eksik.
- **Etki:** Hesaplama/öneri katmanı validator'la uyumsuz.
- **Breaking change:** Hayır
- **Downstream:** B-05, B-07, B-08, B-36, B-37 (hepsi validator + UI paraleli)

### B-79 [ORTA][KÜTÜPHANE] showWithholdingTaxSelector IADE'de gereksiz gösterim
- **Kaynak:** Denetim 05 §5.4 (O7)
- **Dosya:** `src/calculator/invoice-rules.ts:270`
- **Normatif:** —
- **Gözlem:** Sade IADE (TEVKIFATIADE değil) için selector görünüyor.
- **Etki:** UI UX kirliliği.
- **Breaking change:** Hayır
- **Downstream:** —

### B-80 [ORTA][KÜTÜPHANE] SimpleInvoiceBuilder.build calculateDocument'ı iki kez çağırıyor
- **Kaynak:** Denetim 05 §6.1 (O8)
- **Dosya:** `src/calculator/simple-invoice-builder.ts:62-68`
- **Normatif:** —
- **Gözlem:** Çift çağrı — UUID determinizmi ve performans.
- **Etki:** UUID belirsizliği + gereksiz iş.
- **Breaking change:** Hayır
- **Downstream:** —

### B-81 [ORTA][KÜTÜPHANE] mapper shouldAddExemption TEVKIFAT'ta 351'i atlıyor
- **Kaynak:** Denetim 05 §6.2 (O9)
- **Dosya:** `src/calculator/simple-invoice-mapper.ts:232-246`
- **Normatif:** —
- **Gözlem:** Calculator 351 üretiyor, mapper XML'den siliyor.
- **Etki:** TEVKIFAT+351 senaryosu XML'e yansımıyor.
- **Breaking change:** Evet (davranış değişimi)
- **Downstream:** B-25
- **[MİMARİ REVİZE — Açık Soru #12 cevabı — M5]** 351 non-ISTISNA tiplerinde (SATIS/TEVKIFAT dahil) doğru. Mapper 351'i silmemelidir. Kalemde KDV 0 varsa 351 zorunlu. Detay FIX-PLANI-v2.md M5.

### B-82 [ORTA][KÜTÜPHANE] Satır-bazlı kdvExemptionCode tipi yok
- **Kaynak:** Denetim 05 §6.3 (O10)
- **Dosya:** `src/calculator/simple-types.ts:61-112`, `src/calculator/simple-invoice-mapper.ts:316-319`
- **Normatif:** —
- **Gözlem:** Karma istisnalı fatura (301+302 aynı fatura) yazılamıyor.
- **Etki:** Karma istisna senaryosu lib'den desteklenmiyor (Açık Soru #30).
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —
- **[İPTAL — Açık Soru #21 cevabı]** Eklemeyelim. SimpleInvoiceBuilder tek kod desteği devam. Fix planından çıkarıldı.

### B-83 [ORTA][KÜTÜPHANE] KAMU BuyerCustomer partyType eşleme yok
- **Kaynak:** Denetim 05 §6.6 (O11)
- **Dosya:** `src/calculator/simple-invoice-mapper.ts:562-566`
- **Normatif:** —
- **Gözlem:** KAMU aracı kurum PartyIdentification atanmıyor.
- **Etki:** KAMU senaryosu eksik çıktı.
- **Breaking change:** Hayır
- **Downstream:** —

### B-84 [ORTA][KÜTÜPHANE] DespatchLineId numeric kontrolü yok
- **Kaynak:** Denetim 06 §O4
- **Dosya:** `src/validators/despatch-validators.ts:124-127`
- **Normatif:** CommonSchematron:717-719 (`number(cbc:ID) != 'NaN'`)
- **Gözlem:** String ID "ABC" geçiyor.
- **Etki:** Geçersiz ID lib'den geçiyor.
- **Breaking change:** Evet (yeni kural)
- **Downstream:** —

### B-85 [ORTA][KÜTÜPHANE] CarrierParty PartyIdentification alt validasyonu yok
- **Kaynak:** Denetim 06 §O5
- **Dosya:** `src/validators/despatch-validators.ts`
- **Normatif:** CommonSchematron:505-509
- **Gözlem:** VKN(10)/TCKN(11) format + schemeID whitelist yok.
- **Etki:** Geçersiz taşıyıcı ID'si lib'den geçer.
- **Breaking change:** Evet
- **Downstream:** B-69

### B-86 [ORTA][KÜTÜPHANE] MATBUDAN+DocumentType='MATBU' cross-check yok (skill sıkı, Schematron gevşek)
- **Kaynak:** Denetim 06 §O7
- **Dosya:** `src/validators/despatch-validators.ts:137-143`
- **Normatif:** Skill §6.2 "DocumentType = MATBU sabit"
- **Gözlem:** Schematron yalnız ID+IssueDate kontrol ediyor; skill bilgisi enforce edilmiyor.
- **Etki:** Skill ↔ kütüphane gevşeklik.
- **Breaking change:** Evet
- **Downstream:** B-66

### B-87 [ORTA][KÜTÜPHANE] Float edge case (0.1+0.2, 33.33×0.2) testi yok — TEST
- **Kaynak:** Denetim 05 §D4
- **Dosya:** `__tests__/calculator/line-calculator.test.ts`, `document-calculator.test.ts`
- **Normatif:** —
- **Gözlem:** Yuvarlama sınırlarını zorlayan test yok.
- **Etki:** Regression riski.
- **Breaking change:** —
- **Downstream:** B-46

### B-88 [DÜŞÜK][KÜTÜPHANE] ADDITIONAL_ITEM_ID_SCHEME_IDS'de BILGISAYAR fazla
- **Kaynak:** Denetim 02 §6 (D1)
- **Dosya:** `src/config/constants.ts:252`
- **Normatif:** Codelist satır 62 AdditionalItemIdentificationIDType; v1.42 §5.3
- **Gözlem:** Eski varsayım.
- **Etki:** —
- **Breaking change:** Evet (silmek)
- **Downstream:** —

### B-89 [DÜŞÜK][KÜTÜPHANE] Country code whitelist yok
- **Kaynak:** Denetim 02 §7 (D2)
- **Dosya:** `src/types/common.ts:257`
- **Normatif:** Codelist satır 48 (240+ ISO 3166)
- **Gözlem:** Serbest string.
- **Etki:** Geçersiz ülke kodu girilebilir.
- **Breaking change:** Evet
- **Downstream:** —

### B-90 [DÜŞÜK][KÜTÜPHANE] PAYMENT_MEANS_CODES dead whitelist
- **Kaynak:** Denetim 02 §9 (D3)
- **Dosya:** `src/config/constants.ts:257-259`
- **Normatif:** Codelist satır 56 (80+ kod)
- **Gözlem:** 19 kod tanımlı ama çağrılmıyor.
- **Etki:** Dead code.
- **Breaking change:** Hayır (silmek veya bağlamak)
- **Downstream:** —
- **[KAPSAM GENİŞLEDİ — Açık Soru #9 cevabı — D2]** Sil değil, **tümü Set üzerinde desteklensin** (talep durumunda). Sık kullanılanlar (1/10/20/23/42/48/ZZZ) için `src/calculator/payment-means-config.ts` yeni dosya, TR name detayı. Portal dropdown için kullanılır. Detay FIX-PLANI-v2.md D2.

### B-91 [DÜŞÜK][KÜTÜPHANE] UBLVersion/CustomizationID/CopyIndicator runtime kontrolü yok (serializer hardcode — risk yok)
- **Kaynak:** Denetim 03 §D1
- **Dosya:** `src/validators/common-validators.ts`
- **Normatif:** —
- **Gözlem:** Serializer hardcode veriyor; runtime kontrole gerek yok.
- **Etki:** —
- **Breaking change:** Hayır
- **Downstream:** —

### B-92 [DÜŞÜK][DOKÜMAN] ValidationLevel 'basic' kapsamı belgelenmedi
- **Kaynak:** Denetim 03 §D2
- **Dosya:** `src/builders/invoice-builder.ts:54-78`
- **Normatif:** —
- **Gözlem:** 'basic' mode'da cross/type/profile atlanıyor; kullanıcı bilmiyor.
- **Etki:** UX belirsizlik.
- **Breaking change:** Hayır
- **Downstream:** —

### B-93 [DÜŞÜK][DOKÜMAN] DespatchBuilder validationLevel inefektif (basic≡strict)
- **Kaynak:** Denetim 03 §D3 + Denetim 06 §D3
- **Dosya:** `src/builders/despatch-builder.ts:48-53`
- **Normatif:** —
- **Gözlem:** Seviyeler eşdeğer.
- **Etki:** API yüzeyi yanıltıcı.
- **Breaking change:** Hayır (belgeleme veya kaldırma)
- **Downstream:** —

### B-94 [DÜŞÜK][DOKÜMAN] examples/output stale (Signature+UBLExtensions içeriyor) + irsaliye yok
- **Kaynak:** Denetim 04 §D1 + Denetim 06 §O8
- **Dosya:** `examples/output/*/output.xml`
- **Normatif:** —
- **Gözlem:** Serializer Signature/UBLExtensions üretmiyor ama örneklerde var; 30 fatura, 0 irsaliye.
- **Etki:** Kullanıcıya yanıltıcı referans.
- **Breaking change:** Hayır (regenerate — fix sonra)
- **Downstream:** B-09, B-10 … B-20 (fix öncesi regenerate anlamsız)

### B-95 [DÜŞÜK][KÜTÜPHANE] ublExtensionsPlaceholder() dead code
- **Kaynak:** Denetim 04 §D2 + Denetim 06 §D1
- **Dosya:** `src/utils/xml-helpers.ts:117-127`, `src/serializers/despatch-serializer.ts:3,21`
- **Normatif:** —
- **Gözlem:** Tanımlı ama çağrılmıyor.
- **Etki:** —
- **Breaking change:** Hayır (silmek)
- **Downstream:** —

### B-96 [DÜŞÜK][DOKÜMAN] invoice-serializer.ts yorum numaralandırması XSD ile uyumsuz
- **Kaynak:** Denetim 04 §D3
- **Dosya:** `src/serializers/invoice-serializer.ts`
- **Normatif:** —
- **Gözlem:** Yorum numaraları XSD sırasıyla tutarsız.
- **Etki:** Okuma güçlüğü.
- **Breaking change:** Hayır
- **Downstream:** —

### B-97 [DÜŞÜK][KÜTÜPHANE] cbcTag boş değer için sessizce hiçbir şey üretmiyor
- **Kaynak:** Denetim 04 §D4
- **Dosya:** `src/utils/xml-helpers.ts:37`
- **Normatif:** —
- **Gözlem:** XSD zorunlu elemanlar için sessiz-fail amplifikasyonu — B-32/33/34/35 kök nedenine ilave.
- **Etki:** Hata maskelemesi.
- **Breaking change:** Hayır
- **Downstream:** B-32, B-33, B-34, B-35

### B-98 [DÜŞÜK][KÜTÜPHANE] Address BlockName/District/Postbox desteği yok
- **Kaynak:** Denetim 04 §D5
- **Dosya:** `src/serializers/party-serializer.ts:100-113`, `src/serializers/delivery-serializer.ts:62-74`
- **Normatif:** XSD AddressType:699-715
- **Gözlem:** Opsiyonel alanlar eksik.
- **Etki:** Adres detayı verilemiyor.
- **Breaking change:** Hayır
- **Downstream:** —

### B-99 [DÜŞÜK][KÜTÜPHANE] Shipment emit sırası çift ShipmentStage riski
- **Kaynak:** Denetim 04 §D6
- **Dosya:** `src/serializers/delivery-serializer.ts:100-114`
- **Normatif:** —
- **Gözlem:** Çift çıktı riski.
- **Etki:** Geçersiz XML.
- **Breaking change:** Hayır
- **Downstream:** B-14

### B-100 [DÜŞÜK][KÜTÜPHANE] XSD cac:Country/cbc:IdentificationCode desteği yok
- **Kaynak:** Denetim 04 §D7
- **Dosya:** `src/serializers/party-serializer.ts:109-113`, `src/serializers/delivery-serializer.ts:70-74`
- **Normatif:** XSD CountryType:1222-1227
- **Gözlem:** ISO 3166-1 alpha-2 yalnız Name emit ediliyor.
- **Etki:** Uluslararası parser'lar kod bulamıyor.
- **Breaking change:** Hayır (ekleme)
- **Downstream:** —

### B-101 [DÜŞÜK][KÜTÜPHANE] Tevkifat 616 adı eski KDVGUT sürümü
- **Kaynak:** Denetim 05 §4.2 (D1)
- **Dosya:** `src/calculator/withholding-config.ts:31`
- **Normatif:** v1.42 §4.9.2
- **Gözlem:** Oran doğru, ad eski.
- **Etki:** UI'de eski ad gözükür.
- **Breaking change:** Hayır
- **Downstream:** —

### B-102 [DÜŞÜK][DOKÜMAN] ConfigManager test izolasyonu rehberi yok
- **Kaynak:** Denetim 05 §3.2 (D2)
- **Dosya:** `src/calculator/config-manager.ts:384`
- **Normatif:** —
- **Gözlem:** Test'ler reset() çağırmalı — belgelenmedi.
- **Etki:** Test bağımlılıkları sızabilir.
- **Breaking change:** Hayır
- **Downstream:** —

### B-103 [DÜŞÜK][DOKÜMAN] ConfigManager singleton multi-session etkisi belgelenmedi
- **Kaynak:** Denetim 05 §3.3 (D3)
- **Dosya:** `src/calculator/config-manager.ts:384`, `src/calculator/invoice-session.ts:39`
- **Normatif:** —
- **Gözlem:** Paralel session A updateTaxes session B'yi etkiliyor — çok-tenant ortamda sorun (Açık Soru #32).
- **Etki:** Multi-tenant tutarsızlık riski.
- **Breaking change:** Hayır (belgeleme)
- **Downstream:** —
- **[İPTAL — Açık Soru #22 cevabı]** ConfigManager tenant-based değil, hot-reload amaçlı. Overwrite tüm sisteme yansımalı — bu amaçlı davranış. Ek uyarı yazılmayacak. Fix planından çıkarıldı.

### B-104 [DÜŞÜK][KÜTÜPHANE] DriverPerson NationalityID 11-hane TCKN format kontrolü yok
- **Kaynak:** Denetim 06 §D2
- **Dosya:** `src/validators/despatch-validators.ts:106-108`
- **Normatif:** Skill §7.1 "TCKN"
- **Gözlem:** 'TR' ISO kodu geçiyor.
- **Etki:** Yanlış kimlik değeri lib'den geçer.
- **Breaking change:** Evet (yeni kural)
- **Downstream:** B-T08

---

## TEST Kategorisi (B-T##)

### B-T01 [KRİTİK][TEST] Test UBLExtensions yanlış beklenti (Sorumluluk Matrisi: Mimsoft emit)
- **Kaynak:** Denetim 01 §K3 (Test 1)
- **Dosya:** `__tests__/builders/invoice-builder.test.ts`
- **Normatif:** Skill Sorumluluk Matrisi (Mimsoft Signature/UBLExtensions'ı üretir)
- **Gözlem:** Test UBLExtensions bekliyor — library doğru şekilde üretmiyor, test yanlış.
- **Etki:** CI'da yanlış sinyal (fail olması gerekirken geçiriyor veya fail düşürüp commenting).
- **Çözüm:** Testi kaldırmak + README'ye Sorumluluk Matrisi bölümü eklemek.

### B-T02 [KRİTİK][TEST] Test Signature yanlış beklenti (Sorumluluk Matrisi: Mimsoft emit)
- **Kaynak:** Denetim 01 §K4 (Test 2)
- **Dosya:** `__tests__/builders/invoice-builder.test.ts`
- **Normatif:** Skill Sorumluluk Matrisi
- **Gözlem:** B-T01 paraleli (Signature).
- **Etki:** CI yanlış sinyal.
- **Çözüm:** Testi kaldırmak.

### B-T03 [KRİTİK][TEST] document-calculator.test.ts:108 iskontolu LineExtension yanlış beklenti (1000 yerine 850)
- **Kaynak:** Denetim 05 §1.2.1 (K2)
- **Dosya:** `__tests__/calculator/document-calculator.test.ts:108`
- **Normatif:** Skill formülü `Σ satır = belge`
- **Gözlem:** `expect(monetary.lineExtensionAmount).toBe(1000)` — iskontolu fatura için 850 olmalı.
- **Etki:** B-15 KRİTİK bulgu test tarafından maskeleniyor.
- **Çözüm:** B-15 fix sonrası test beklentisi 850 olacak.

### B-T04 [KRİTİK][TEST] line-calculator.test.ts:166-168 stopaj TaxInclusive yanlış beklenti (1100 yerine 1300)
- **Kaynak:** Denetim 05 §6.4 (K5)
- **Dosya:** `__tests__/calculator/line-calculator.test.ts:166-168`
- **Normatif:** Skill formülü `TaxInclusive = TaxExclusive + Σ TaxAmount`
- **Gözlem:** `expect(taxInclusiveForMonetary).toBe(1100)` — 1300 olmalı.
- **Etki:** B-17 KRİTİK bulgu test tarafından maskeleniyor.
- **Çözüm:** B-17 fix sonrası test beklentisi 1300 olacak.
- **[SORGULANDI — KARAR ASKIDA — Açık Soru #18 cevabı]** B-17 sorgulanıyor (muhtemelen iptal). Kullanıcı "calculator mutlak doğru" dedi ve mevcut davranış kullanıcının tariyfini uyguluyor — o zaman test `toBe(1100)` zaten doğru olabilir. B-17 kararından sonra güncellenir/korunur. Detay FIX-PLANI-v2.md B-17.

### B-T05 [YÜKSEK][TEST] TEVKIFAT'ta calculator'ın 351 kodunun XML'e yansıması doğrulanmıyor
- **Kaynak:** Denetim 05 §6.2
- **Dosya:** `__tests__/calculator/` (eksik test)
- **Normatif:** —
- **Gözlem:** Test suite mapper'ın kaybı yakalayamıyor.
- **Etki:** B-81 mapper bulgu test tarafından gizleniyor.
- **Çözüm:** Yeni test: TEVKIFAT+351 senaryosu için output XML'de ReasonCode doğrulaması.

### B-T06 [ORTA][TEST] document-calculator test özel profil kapsamı zayıf
- **Kaynak:** Denetim 05 §D5
- **Dosya:** `__tests__/calculator/document-calculator.test.ts`
- **Normatif:** —
- **Gözlem:** YATIRIMTESVIK/ILAC/SGK/ENERJI/IDIS/HKS/OZELFATURA/KAMU test yok.
- **Etki:** Profil regression'ları yakalanamıyor.
- **Çözüm:** Her profil için minimum 1 senaryo test.

### B-T07 [DÜŞÜK][TEST] Float edge case testi yok
- **Kaynak:** Denetim 05 §D4 (B-87'nin test görünümü)
- **Dosya:** `__tests__/calculator/*.test.ts`
- **Normatif:** —
- **Gözlem:** 0.1+0.2, 33.33×0.2 gibi scenario yok.
- **Etki:** B-46 yuvarlama tutarlılığı regression'ı yakalanamıyor.
- **Çözüm:** Edge case testleri ekle.

### B-T08 [DÜŞÜK][TEST] despatch-builder.test.ts nationalityId='TR' ISO kodu (test yanlış beklenti)
- **Kaynak:** Denetim 06 §D4
- **Dosya:** `__tests__/builders/despatch-builder.test.ts:41`
- **Normatif:** Skill §7.1 (TCKN)
- **Gözlem:** Test library'nin yanlış davranışını (TR geçiyor) onaylıyor. B-104 fix sonrası test güncellenecek.
- **Etki:** B-104 bulgusu test tarafından maskeleniyor.
- **Çözüm:** nationalityId bir TCKN olacak şekilde test değiştirilmeli.

### B-T09 [DÜŞÜK][TEST] Despatch test element sırası coverage yok
- **Kaynak:** Denetim 06 §D5
- **Dosya:** `__tests__/builders/despatch-builder.test.ts`
- **Normatif:** —
- **Gözlem:** B-18/B-20/B-14 regression'ı yakalanamıyor.
- **Etki:** XSD sequence bulguları test-blind.
- **Çözüm:** xmllint CI + element sırası assertion'ları.

### B-T10 [DÜŞÜK][TEST] IDISIRSALIYE profili test yok
- **Kaynak:** Denetim 06 §D6
- **Dosya:** `__tests__/builders/despatch-builder.test.ts`
- **Normatif:** —
- **Gözlem:** TEMELIRSALIYE + HKSIRSALIYE test var, IDIS yok.
- **Etki:** SEVKIYATNO+ETIKETNO kapsamı denetimsiz.
- **Çözüm:** IDIS test ekle.

---

## SKILL Kategorisi (B-S##)

### B-S01 [ORTA][SKILL] Codelist iç çelişki: 650 kodu (satır 16 vs 17)
- **Kaynak:** Denetim 02 §2.2
- **Dosya:** `gib-teknik-dokuman/references/kod-listeleri-ubl-tr-v1.42.md §4.9` (veya canonical `Codelist.xml`)
- **Normatif:** Codelist satır 16 WithholdingTaxType 650 yok; satır 17 WithholdingTaxTypeWithPercent 650xx var
- **Gözlem:** Canonical kaynak kendi içinde çelişki.
- **Etki:** Implementasyon kararı gerekli (Açık Soru #7).
- **Çözüm:** Skill notuna çelişki eklenmeli + Mimsoft/GİB teyidi.

### B-S02 [ORTA][SKILL] ETIKETNO regex Codelist dışında Schematron'da hard-coded
- **Kaynak:** Denetim 02 (İdentify cross-reference)
- **Dosya:** `gib-teknik-dokuman/references/` + CommonSchematron
- **Normatif:** Schematron hard-code regex
- **Gözlem:** Canonical dokümanda regex bulunmuyor ama Schematron kuralı var.
- **Etki:** Skill referansı eksik.
- **Çözüm:** Skill notuna Schematron regex eklenmeli.

### B-S03 [ORTA][SKILL] TaxFreeInvoiceCheck mesaj metni double-negative
- **Kaynak:** Denetim 03 §O1
- **Dosya:** Skill özet (Durum C tipinde)
- **Normatif:** CommonSchematron:275-277
- **Gözlem:** Skill mesaj metni YOLCU/IHRACAT derken Schematron OZELFATURA/KAMU de ekliyor — çelişki.
- **Etki:** Kullanıcı yanıltılıyor.
- **Çözüm:** Skill özet güncellenmeli (normatif referansa göre).

### B-S04 [DÜŞÜK][SKILL] Canonical DeliveryAddress Schematron DespatchAddressCheck ile çelişir
- **Kaynak:** Denetim 06 §D7
- **Dosya:** `gib-teknik-dokuman/xmls/Irsaliye-Ornek1.xml`
- **Normatif:** CommonSchematron:739-744
- **Gözlem:** Canonical example Schematron kuralını ihlal ediyor.
- **Etki:** Kullanıcı canonical'i taklit ederse reddedilir.
- **Çözüm:** Canonical örnek düzeltilmeli veya not eklenmeli.

### B-S05 [DÜŞÜK][SKILL] HKSIRSALIYE/IDISIRSALIYE detay senaryo kılavuzu yok
- **Kaynak:** Denetim 06 §D8
- **Dosya:** Skill `references/senaryo-hks-irsaliye` + `senaryo-idis-irsaliye` eksik
- **Normatif:** `e-irsaliye-ubl-tr-v1.2.md §12 TODO`
- **Gözlem:** Schematron kuralları var ama senaryo detayı zayıf.
- **Etki:** Lib geliştirme rehbersiz.
- **Çözüm:** İki senaryo dosyası oluşturulmalı.

---

## SKILL Mimsoft Sorumluluk Matrisi — Denetim Sırasında Keşfedilen Gereklilik

Denetimler boyunca tekrar tekrar "Mimsoft → kütüphane sorumluluk sınırı" sorusu gündeme geldi. Skill bu matrisi netleştirmiyor:

| Bileşen | Sorumluluk | Not |
|---|---|---|
| `cac:Signature` | Mimsoft | Lib üretmez (B-T02) |
| `ext:UBLExtensions` | Mimsoft | Lib üretmez (B-T01) |
| Schematron validation | Kütüphane + Mimsoft | Lib 'strict' modu ~%80 kapsam |
| XSD validation | Kütüphane (xmllint CI) | D04+D06'nın iddia ettiği **kütüphane çıktısı xmllint-invalid** |
| Mimsoft pre-validation | Mimsoft | `unsigned=true` senaryosunda ek kontroller |

**Skill'e eklenmesi gereken dosya:** `mimsoft-sdk-gib-gonderim/SORUMLULUK-MATRISI.md` (Fix Planı Sprint 8'de).

---

## Etki Özeti — edocument-service ↔ json2ubl-ts

Çoğu bulgu kütüphane tarafında izole fix ile kapanır (public API değişmez). Aşağıdaki bulgular edocument-service'i doğrudan etkiler:

### Invoice Path
- **B-15/B-16/B-17** — `InvoiceBuilder.build()` çıktısında LegalMonetaryTotal değerleri değişiyor. edocument-service'in fatura gönderim akışı aynı senaryoda farklı sonuç dönebilir. Regression test gerekli.
- **B-09..B-14** — Serializer sırası düzeltmesi — edocument-service'in invoice XML'ini gören herhangi bir downstream parser (örn. log-viewer, invoice-preview) parse-sensitive olmamalı.
- **B-38** — CustomizationID değeri değişiyor (TR1.2.1 → TR1.2). edocument-service'in GİB gönderim loglarında XML içeriği değişir.

### Despatch Path
- **B-18/B-19/B-20** — DespatchInput tipi değişiyor (issueTime zorunlu, despatchContactName eklendi, Person XSD-safe). edocument-service'in despatch handler'ı tip geçişini yapmalı.

### Kod Listesi Path
- **B-03/B-04/B-05/B-24/B-28** — Validator daha sıkı — edocument-service'in test senaryolarında eskiden geçen faturalar fail edebilir. "geçiyordu şimdi geçmiyor" senaryosu.

### Config Path
- **B-43** — ConfigManager.resolveUnitCode behavior değişiyor. edocument-service DB override akışı etkilenir.
- **B-44** — setLiability kontratı. edocument-service'in e-arşiv/export ayrımı için kritik.

---

## Açık Sorular (çözülmemiş — Fix Planı öncesi karar gerekli)

Bu sorular önceki denetimlerde toplandı; Fix Planı başlamadan önce cevaplanması gerekiyor. Sayı: **25 soru.** Tam liste için bu dosyanın önceki sürümündeki `## Açık Sorular` bölümüne bakın; kısa özet:

- **Matris:** Tek truth source PROFILE_TYPE_MATRIX mı? (D03 netleştirdi → evet) → B-01..B-23 birincil kök
- **TaxExemption mimarisi:** Tipe-göre-dispatch → koda-göre-kısıt (iki yönlü)? → B-06 çözümü buna bağlı
- **555/650 roadmap:** Hangi set'e, hangi sürümde? → B-05/B-27
- **Yuvarlama stratejisi:** Banker's mı round-half-away mı; satır önce mi belge önce mi? → B-46
- **CustomizationID TR1.2 vs TR1.2.1:** Mimsoft/GİB teyit → B-38
- **Sorumluluk Matrisi:** Signature/UBLExtensions'ın Mimsoft tarafında olduğu resmi onay → B-T01/B-T02
- **Karma istisna:** Satır-bazlı kdvExemptionCode gerekli mi? → B-82
- **setLiability+isExport:** Error mu no-op mu? → B-44
- **Multi-tenant:** Session-level config override? → B-103

---

## Denetim Başına Ham Detay (appendix — historik referans)

Bu bölüm önceki incremental SONUC dosyasının her denetim için kısa özetini koruyor. Fix Planı'nın planlamasında yardımcı değil ama denetim çalışmasının izini tutmak için.

*(Not: Önceki SONUC'un full content'i her denetim için `audit/denetim-##-*.md` dosyasında tam olarak mevcut. Buradaki özetler için eski sürümün denetim-başına bölümlerine bakılabilir.)*

| Denetim | Rapor dosyası | Özet |
|---|---|---|
| D01 İç Tutarlılık | `denetim-01-ic-tutarlilik.md` | rules.ts ↔ constants.ts matris asimetrisi + 2 test yanlış beklenti |
| D02 Kod Listeleri | `denetim-02-kod-listeleri.md` | 10 kod listesi, 17 bulgu — TaxExemption/WithholdingTaxTypeWithPercent kök sorun |
| D03 Validator | `denetim-03-validators.md` | 5 validator + 10 öncelikli Schematron kuralı; 'strict' %80 kapsam |
| D04 Serializer | `denetim-04-serializers.md` | 13 XSD sequence bulgu + 5 minOccurs=1 opsiyonel — xmllint %80 output reddeder |
| D05 Calculator | `denetim-05-calculator.md` | 4 KRİTİK aritmetik tutarsızlık + 3 test yanlış beklenti ilk TEST bulguları |
| D06 Despatch | `denetim-06-despatch.md` | 4 KRİTİK despatch XSD sequence + enum'da 0 bulgu (Fatura'ya göre temiz) |

---

## Sonraki Adım

**FIX-PLANI.md** (bu klasörde) her B-ID'nin hangi sprint'te çözüleceğini, breaking change risklerini, skill güncelleme listesini belgelemektedir.
