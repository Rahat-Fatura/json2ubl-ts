---
plan: json2ubl-ts 6-denetim düzeltme yol haritası
tarih: 2026-04-21
kaynak: SONUC-konsolide-bulgular.md (B-01 … B-112)
toplam_sprint: 8
tahmini_sure_gun: 18-22
hedef_surum: v2.0.0
---

# json2ubl-ts — Fix Planı

> 6 denetim sonucu 112 net bulguyu kapatmak için sprint-bazlı düzeltme planı. Sprint öncelikleri: **ciddiyet > downstream bağımlılığı > fix maliyeti**. Her sprint sonu bir release veya pre-release.

## Önceliklendirme Kararı

| Faktör | Ağırlık | Uygulama |
|---|---|---|
| Ciddiyet | 1. | KRİTİK önce, DÜŞÜK sona |
| Downstream bağımlılık | 2. | B-06 (cross-check mimarisi) B-05'i çözer → önce B-06 |
| Fix maliyeti | 3. | Küçük refactor önce, mimari değişiklik grupla |

**Mimari refactor'lar tek sprint'te gruplandı:** XSD_SEQUENCE_TABLE (Sprint 3), Amount truth source (Sprint 4), TaxExemption cross-check (Sprint 5) — parçalı fix yerine tek noktadan çözüm.

---

## Sprint 1 — Matris Tekleştirme (tahmini 2 gün)

**Hedef:** `constants.ts:PROFILE_TYPE_MATRIX` tek truth source, `invoice-rules.ts:PROFILE_TYPE_MAP` dead code veya derive helper.

### Kapsanan Bulgular
- **B-01** [KRİTİK] TICARIFATURA IADE eksik
- **B-02** [KRİTİK] HKS SATIS/KOMISYONCU yanlış
- **B-21** [YÜKSEK] TEMELFATURA TEVKIFATIADE eksik
- **B-22** [YÜKSEK] KAMU matris asimetri
- **B-23** [YÜKSEK] EARSIVFATURA matris farkı
- **B-54** [ORTA] IHRACAT matris asimetri
- **B-55** [ORTA] YOLCUBERABERFATURA matris asimetri
- **B-56** [ORTA] OZELFATURA matris asimetri
- **B-77** [ORTA] TYPE_PROFILE_MAP YTB tipleri için EARSIVFATURA eksik

### Alt Görevler
- `src/calculator/invoice-rules.ts:37-62` `PROFILE_TYPE_MAP` sabit olarak yazılmış — `deriveProfileTypeMap(PROFILE_TYPE_MATRIX)` helper ile çevir.
- `constants.ts:PROFILE_TYPE_MATRIX` ana truth source; TICARIFATURA IADE kaldırılsın, HKS'de HKSSATIS/HKSKOMISYONCU netleşsin.
- Ters yön `TYPE_PROFILE_MAP` da aynı matrix'ten derive — B-77 kapanır.

### Breaking Change
- **Evet.** `PROFILE_TYPE_MAP` yapısı mantıksal olarak aynı kalacak ama davranış değişiyor:
  - TICARIFATURA kullanıcısı IADE tipini UI'dan seçemeyecek
  - HKS kullanıcısı HKSSATIS/HKSKOMISYONCU üretecek (canonical ama test kırabilir)
- Var olan faturalar etkilenmez (sadece yeni input flow).

### Test Etkisi
- `__tests__/calculator/*.test.ts` içindeki profile-type cross-checks güncellenecek.
- Yeni test: Matrix simetri (matris ↔ rules.ts aynı sonucu vermeli).

### Release Hedefi
v1.5.0-rc1 (pre-release, internal test)

---

## Sprint 2 — Kritik Kod Listesi Güncellemeleri (tahmini 2 gün)

**Hedef:** KRİTİK+YÜKSEK whitelist sorunları çöz. 555 kodu tüm katmanlara ekle. WithholdingTaxTypeWithPercent düzelt.

### Kapsanan Bulgular
- **B-03** [KRİTİK] TaxExemption 10 geçersiz kod çıkar
- **B-04** [KRİTİK] WithholdingTaxTypeWithPercent Codelist'e göre düzelt
- **B-05** [KRİTİK] 555 kodu 3 katmanda ekle (whitelist + validator + runtime)
- **B-24** [YÜKSEK] 151 kodu ekle
- **B-25** [YÜKSEK] 351 kodu constants'ta ekle (çift truth source kapanır)
- **B-26** [YÜKSEK] tax-config 5 eksik kod ekle (0021/0022/4171/9015/9944)
- **B-27** [YÜKSEK] Tevkifat 650 kodu (Mimsoft/GİB teyit sonrası) ekle
- **B-28** [YÜKSEK] TRL para birimi kaldır
- **B-57** [ORTA] exemption-config 17 tam istisna kodu (326-344, 704) + 326 sessiz düşüyor
- **B-58** [ORTA] Unit D32/TWH semantik — TWH adını düzelt, D32 ekle
- **B-59** [ORTA] GWH/MWH/SM3 ekle
- **B-60** [ORTA] PackagingTypeCode whitelist ekle
- **B-61** [ORTA] 5 isValid* dead function — bağla veya sil
- **B-88** [DÜŞÜK] ADDITIONAL_ITEM_ID BILGISAYAR çıkar
- **B-89** [DÜŞÜK] Country code whitelist ekle
- **B-90** [DÜŞÜK] PAYMENT_MEANS_CODES bağla veya sil
- **B-101** [DÜŞÜK] Tevkifat 616 adı güncelle

### Alt Görevler
- `src/config/constants.ts:186-210` ISTISNA set regenerate (Codelist satır 21 base).
- `src/config/constants.ts:130-183` WithholdingTaxTypeWithPercent Codelist satır 17 ile regenerate — 60120/60150/60160/60170 çıkar, 65020-65090 ekle (B-27 ile koordineli).
- `src/config/constants.ts:186-210` 555 eklemesi ayrı set (ISTISNA alt-set "DEMIRBAS_KDV" gibi) veya ISTISNA'ya eklenerek cross-check ile izole — mimari karar.
- `src/calculator/tax-config.ts:18-44` 5 kod eklenmeli.
- `src/calculator/exemption-config.ts:15-111` 17 kod eklenmeli + 326 sessiz düşmemesi için lookup error pathway.
- `src/calculator/unit-config.ts:48` D32=TERAWATT SAAT düzelt.
- `src/types/common.ts:287` PackagingTypeCode whitelist type — ya enum ya Set.

### Breaking Change
- **Evet.**
  - B-03: Eski whitelist'te olan 10 kod artık reddediliyor — var olan kullanıcılar etkilenir.
  - B-04: WithholdingTaxType 6xx default kombinasyonları reddediliyor.
  - B-28: TRL kullanıcı yok muhtemelen (2005'ten beri), risk düşük.

### Test Etkisi
- `__tests__/validators/` istisna kodu testleri güncellenmeli.
- Yeni test: 555 senaryosu (Schematron:497-499 paraleli).

### Açık Soru Etkisi
- #7 (650 kodu), #8 (203/210/222/224/233/243-249 kabul), #9 (Packaging whitelist), #10 (555 ayrı set mi ISTISNA mi), #11 (D32/TWH yeniden adlandırma) — sprint başlamadan karar gerekli.

### Release Hedefi
v1.5.0 (internal test)

---

## Sprint 3 — XSD Sequence + minOccurs Sistemik Refactor (tahmini 4 gün)

**Hedef:** Her serializer kendi sırasını hard-code yerine tek bir `XSD_SEQUENCE_TABLE` referans alsın. xmllint CI kur. examples/output regenerate.

### Kapsanan Bulgular
- **B-09** [KRİTİK] TaxExemptionReasonCode yanlış parent
- **B-10** [KRİTİK] InvoiceLine Delivery sequence
- **B-11** [KRİTİK] Invoice ExchangeRate sequence
- **B-12** [KRİTİK] AllowanceCharge Reason sequence
- **B-13** [KRİTİK] Item Description/Name sequence
- **B-14** [KRİTİK] Despatch Shipment/Delivery çocuk sırası
- **B-18** [KRİTİK] IssueTime XSD zorunlu opsiyonel
- **B-20** [KRİTİK] Person MiddleName + DriverPerson sequence
- **B-32** [YÜKSEK] DocumentReference IssueDate zorunlu
- **B-33** [YÜKSEK] OrderReference IssueDate zorunlu
- **B-34** [YÜKSEK] Party PostalAddress zorunlu
- **B-35** [YÜKSEK] Address CityName/CitySubdivisionName zorunlu
- **B-70** [ORTA] PaymentMeansCode zorunlu
- **B-97** [DÜŞÜK] cbcTag sessiz boş davranış — amplifier fix
- **B-99** [DÜŞÜK] Shipment çift ShipmentStage emit riski
- **B-94** [DÜŞÜK] examples/output stale + irsaliye eksik (regenerate)
- **B-96** [DÜŞÜK] invoice-serializer.ts yorum numaralandırması

### Alt Görevler
- **Mimari:** `src/serializers/xsd-sequence.ts` yeni dosya — her UBL tipi için sıra tablosu (`InvoiceLineType`, `PartyType`, `AddressType`, `AllowanceChargeType`, `ItemType`, `PersonType`, `DeliveryType`, `DespatchAdviceType` vb.).
- `cbcTag` utility — zorunlu eleman için boş değer → throw (B-97). `cbcRequiredTag(...)` ve `cbcOptionalTag(...)` ayrımı.
- Her serializer'ı bu tabloyu referans alacak şekilde güncelle (büyük refactor — her serializer 20-50 satır değişim).
- CI'a `xmllint --schema UBL-Invoice-2.1.xsd` hook ekle — 30 `examples/output/*.xml` dosyası geçmeli.
- `examples/output/` regenerate: önce tüm KRİTİK fix, sonra yeniden üret.

### Breaking Change
- **Evet — büyük.** Kütüphane çıktısının XML yapısı değişiyor. Downstream parser'lar (log-viewer, invoice-preview) parse-sensitive olmamalı — diff review gerekli.
- `cbcTag` → `cbcRequiredTag` API değişikliği internal.

### Test Etkisi
- Yeni CI step: xmllint validation. 30 dosya önce fail edecek, fix sonra geçecek.
- `__tests__/serializers/` sequence assertion testleri (DOM sıralama doğrulaması).

### Downstream Etki
- edocument-service'in fatura send handler'ı aynı JSON girdisi için farklı XML çıktısı üretecek — **integration test** regression suite gerekli.

### Release Hedefi
v1.6.0-rc1 — xmllint CI yeşil, 30 output dosyası valid.

---

## Sprint 4 — Calculator Aritmetik Tutarlılık + Config Düzeltmeleri (tahmini 3 gün)

**Hedef:** UBL arithmetic constraint'lerini (Σ satır = belge, TaxExclusive+Σ TaxAmount = TaxInclusive) tek `amount truth source` ile kristalleştir. Yuvarlama stratejisi kararı uygula.

### Kapsanan Bulgular
- **B-15** [KRİTİK] LegalMonetaryTotal.LineExtensionAmount iskonto öncesi
- **B-16** [KRİTİK] OZELMATRAH ek subtotal taxTotal'a yansımıyor
- **B-17** [KRİTİK] Stopaj TaxInclusive aritmetik
- **B-40** [YÜKSEK] PayableRoundingAmount desteği
- **B-41** [YÜKSEK] TEVKIFATIADE tip override
- **B-42** [YÜKSEK] Percent 0-basamak yuvarlama
- **B-43** [YÜKSEK] ConfigManager.resolveUnitCode case-insensitive
- **B-44** [YÜKSEK] setLiability+isExport kontrat kararı
- **B-45** [YÜKSEK] getAvailableExemptions Schematron 316/318/320 listesi güncelle
- **B-46** [YÜKSEK] Satır vs belge yuvarlama stratejisi
- **B-47** [YÜKSEK] resolveProfileForType earchive+SGK fallback düzelt
- **B-75** [ORTA] Damga V./Konaklama V. baseCalculate semantik karar
- **B-76** [ORTA] resolveProfile buyerCustomer IHRACAT zorlaması düzelt
- **B-79** [ORTA] showWithholdingTaxSelector IADE'de gizle
- **B-80** [ORTA] SimpleInvoiceBuilder çift calculateDocument tek çağrıya düşür
- **B-81** [ORTA] mapper shouldAddExemption TEVKIFAT+351 (B-25 ile senkron)
- **B-82** [ORTA] Satır-bazlı kdvExemptionCode (Açık Soru #30 karar)
- **B-83** [ORTA] KAMU BuyerCustomer partyType eşleme

### Alt Görevler
- `src/calculator/document-calculator.ts:107` LineExtensionAmount hesabı Σ satır olacak şekilde değiştir.
- `src/calculator/document-calculator.ts:156-174` OZELMATRAH subtotal taxTotalAmount + taxInclusiveAmount güncellemeyi çağırsın.
- `src/calculator/line-calculator.ts:129,154,181` Stopaj sign treatment konsolide — taxForCalculate ↔ taxTotalAmount ↔ taxInclusiveAmount aynı formül.
- `src/serializers/tax-serializer.ts:36,73` `formatDecimal(percent, 2)` (0 → 2).
- `src/calculator/config-manager.ts:370-374,283-288` lowercase normalize ekle.
- `src/calculator/invoice-session.ts:186-208` setLiability kontrat — Açık Soru #33 kararına göre error/no-op.
- `src/calculator/simple-invoice-builder.ts:62-68` ikinci calculateDocument çağrısını memoize et.

### Breaking Change
- **Evet — en kritik hesap değişiklikleri.**
  - B-15: 1000 → 850 (iskontolu fatura). edocument-service regression test zorunlu.
  - B-16/B-17: TaxInclusive değerleri değişiyor.
  - B-44: setLiability davranışı karar bağımlı.

### Test Etkisi
- B-T03, B-T04 yanlış beklentiler Sprint 7'de düzeltiliyor — bu sprint'te test henüz fail ediyor, izin verilir (Sprint 7'ye koordine).

### Açık Soru Etkisi
- #25 (LineExtension semantiği — major mu patch mi), #26 (Stopaj UBL modeli — AllowanceCharge mı negatif TaxAmount mı), #27 (OZELMATRAH TaxTotal birleştirme), #29 (yuvarlama stratejisi), #30 (satır-bazlı kdvExemptionCode), #33 (setLiability+isExport), #35 (Damga V. baseCalculate) — sprint öncesi karar.

### Release Hedefi
v1.7.0-rc1 — aritmetik tutarlılık kristalleştirildi.

---

## Sprint 5 — Validator Kapsamı Genişletme (tahmini 4 gün)

**Hedef:** TaxExemptionReasonCode cross-check mimarisini kod↔tip iki-yönlü olacak şekilde yeniden yaz. 13 eksik Schematron kuralını ekle.

### Kapsanan Bulgular
- **B-06** [KRİTİK] TaxExemptionReasonCode cross-check mimarisi
- **B-07** [KRİTİK] IHRACKAYITLI+702 üç katman (validator+input+serializer)
- **B-08** [KRİTİK] YatirimTesvikKDV kuralları
- **B-29** [YÜKSEK] IHRACAT satır amount kontrol
- **B-30** [YÜKSEK] WithholdingTaxTotal ters-yön
- **B-31** [YÜKSEK] IADE DocumentTypeCode kontrol
- **B-62** [ORTA] 1460415308 VKN cross-check
- **B-63** [ORTA] 7750409379 SGK VKN cross-check
- **B-64** [ORTA] ExchangeRate format regex bağla
- **B-65** [ORTA] IssueDate aralık kontrol
- **B-66** [ORTA] MATBUDAN ADR alan kontrol
- **B-67** [ORTA] YTB CalculationSequenceNumeric kontrol
- **B-68** [ORTA] ProfileID whitelist runtime
- **B-69** [ORTA] PartyIdentification schemeID whitelist bağla
- **B-78** [ORTA] validateInvoiceState (UI derivation) Schematron paraleli güncelle
- **B-84** [ORTA] DespatchLineId numeric kontrol
- **B-85** [ORTA] CarrierParty alt validasyon
- **B-86** [ORTA] MATBUDAN DocumentType='MATBU' kontrol
- **B-91** [DÜŞÜK] UBLVersion/CustomizationID/CopyIndicator runtime (karar: gereksiz, kapat)
- **B-104** [DÜŞÜK] DriverPerson TCKN format

### Alt Görevler
- **Mimari refactor — B-06:** `src/validators/tax-exemption-validator.ts` yeni modül. Code↔Type matrisi tek nokta. Tipe-göre-dispatch + koda-göre-kısıt iki yönlü enforce.
- `src/validators/type-validators.ts:176-190` IHRACKAYITLI+702 satır kuralı (GTİP 12, ALICIDIBSATIRKOD 11).
- `src/types/invoice-input.ts` CustomsDeclaration tipi ekle (B-07 input tarafı).
- `src/serializers/delivery-serializer.ts:116-133` CustomsDeclaration emit yolu (B-07 serializer tarafı).
- `src/validators/profile-validators.ts:227-318` YatirimTesvikKDV fatura+satır kuralı.
- `src/validators/common-validators.ts:30-32` ProfileID runtime whitelist.
- `src/validators/common-validators.ts:119-154` PartyIdentification schemeID whitelist (zaten tanımlı set'i bağla).
- `src/validators/common-validators.ts:55-57` EXCHANGE_RATE_REGEX bağla.

### Breaking Change
- **Evet.** Yeni kurallar önceden geçen JSON girdilerini reddedebilir. "geçiyordu şimdi geçmiyor" senaryosu.

### Test Etkisi
- Her yeni kural için test. B-06 için matris (5+ tip × 20+ kod) kapsam testi.
- `__tests__/validators/` kapsam genişletme.

### Açık Soru Etkisi
- #16 (TaxExemption mimarisi — kod-to-tip mi eş zamanlı iki yönlü mü), #11 (555 ayrı set mi) — B-06 mimari kararına bağlı.

### Release Hedefi
v1.8.0-rc1 — Mimsoft `unsigned=true` pre-validation %95 kapsam.

---

## Sprint 6 — Despatch Extensions + Fatura Paraleli (tahmini 3 gün)

**Hedef:** Despatch tarafında eksik özellikleri tamamla (Teslim Eden, kısmi gönderim, çoklu şoför, 3 party). Fatura tarafında kalan YÜKSEK eksikleri.

### Kapsanan Bulgular
- **B-19** [KRİTİK] DespatchContact/Name "Teslim Eden"
- **B-36** [YÜKSEK] BuyerCustomerParty PostalAddress+PartyTaxScheme+Contact
- **B-37** [YÜKSEK] TaxRepresentativeParty PostalAddress+PartyName
- **B-38** [YÜKSEK] CustomizationID TR1.2 vs TR1.2.1 ayrı sabitler
- **B-39** [YÜKSEK] OriginatorDocumentReference ekle
- **B-48** [YÜKSEK] Despatch BuyerCustomer/Seller/Originator Party
- **B-49** [YÜKSEK] TransportHandlingUnit/DORSEPLAKA canonical path
- **B-50** [YÜKSEK] Kısmi gönderim (Outstanding/Oversupply)
- **B-51** [YÜKSEK] Çoklu DriverPerson
- **B-52** [YÜKSEK] Despatch LineCountNumeric
- **B-53** [YÜKSEK] Despatch OrderReference 0..n
- **B-71** [ORTA] TaxExchangeRate emit
- **B-72** [ORTA] Despatch Shipment ID override
- **B-73** [ORTA] Despatch Shipment GoodsItem/ValueAmount (+ boş placeholder temizle)
- **B-74** [ORTA] Invoice PaymentCurrencyCode
- **B-98** [DÜŞÜK] Address BlockName/District/Postbox
- **B-100** [DÜŞÜK] cac:Country/cbc:IdentificationCode

### Alt Görevler
- `src/config/namespaces.ts:28` `INVOICE_CUSTOMIZATION_ID = "TR1.2"` + `DESPATCH_CUSTOMIZATION_ID = "TR1.2.1"` ayrı sabitler.
- `src/types/despatch-input.ts:26,40,48-99` genişletme: despatchContactName, orderReference: [], buyerCustomerParty, sellerSupplierParty, originatorCustomerParty, transportHandlingUnit[], outstandingQuantity, outstandingReason, oversupplyQuantity, driverPerson → driverPersons[].
- `src/serializers/despatch-serializer.ts` yeni emit yolları.
- `src/serializers/party-serializer.ts:137-216` BuyerCustomerParty+TaxRepresentativeParty tam alt-Party serialize.
- `src/serializers/monetary-serializer.ts:32-46` TaxExchangeRate + PaymentCurrencyCode.

### Breaking Change
- **Hayır çoğunluğu.** Yeni input alanları opsiyonel; var olan kullanıcılar etkilenmez.
- B-38 (CustomizationID değeri Fatura'da TR1.2.1 → TR1.2) etkilenir.
- B-51 (driverPerson → driverPersons[]) — geriye uyumluluk için tekil fallback tutulabilir.

### Test Etkisi
- Her yeni özellik için senaryo test (4-5 test).
- `examples/output/` — kısmi gönderim, çoklu şoför, 3 party senaryoları ekle.

### Açık Soru Etkisi
- #23 (TR1.2 teyidi), #36 (DespatchContact/Name zorunluluk), #37 (DORSEPLAKA path), #38 (LineCountNumeric semantiği), #39 (İrsaliye 3 party strategy), #40 (Kısmi gönderim kullanım sıklığı) — sprint öncesi karar.

### Release Hedefi
v1.9.0-rc1 — irsaliye tam kapsam.

---

## Sprint 7 — Test Güncellemeleri (tahmini 2 gün)

**Hedef:** Yanlış beklentili testleri düzelt. Eksik test kapsamını doldur. xmllint + Mimsoft pre-validation tabanlı regression suite.

### Kapsanan Bulgular
- **B-T01** [KRİTİK] invoice-builder.test UBLExtensions testi KALDIR
- **B-T02** [KRİTİK] invoice-builder.test Signature testi KALDIR
- **B-T03** [KRİTİK] document-calculator.test.ts:108 LineExtension beklentisi güncelle (1000 → 850)
- **B-T04** [KRİTİK] line-calculator.test.ts:166-168 TaxInclusive beklentisi güncelle (1100 → 1300)
- **B-T05** [YÜKSEK] TEVKIFAT+351 XML emit doğrulaması yeni test
- **B-T06** [ORTA] Özel profil kapsamı genişletme (YATIRIMTESVIK/ILAC/SGK/ENERJI/IDIS/HKS/OZELFATURA/KAMU)
- **B-T07** [DÜŞÜK] Float edge case testleri (0.1+0.2, 33.33×0.2)
- **B-T08** [DÜŞÜK] Despatch nationalityId TCKN'e değiştir
- **B-T09** [DÜŞÜK] Despatch element sırası test (xmllint DOM assert)
- **B-T10** [DÜŞÜK] IDISIRSALIYE senaryo test
- **B-87** [ORTA] Float edge case test kapsamı (B-T07 dahil)

### Alt Görevler
- `__tests__/builders/invoice-builder.test.ts` — 2 test sil (Signature, UBLExtensions) + README Sorumluluk Matrisi referansı ekle.
- `__tests__/calculator/document-calculator.test.ts:108` + `line-calculator.test.ts:166-168` beklenti düzelt.
- Yeni test: `__tests__/e2e/mimsoft-pre-validation.test.ts` — Mimsoft pre-validation simülasyonu (xmllint + strict validator).
- `__tests__/builders/despatch-builder.test.ts` — nationalityId TCKN + element sırası + IDISIRSALIYE.

### Breaking Change
- Hayır (testler).

### Release Hedefi
v1.9.0 (final) — Test yeşil. Regression suite hazır.

---

## Sprint 8 — Dokümantasyon + Skill Güncellemeleri + CHANGELOG (tahmini 2 gün)

**Hedef:** Kullanıcı dokümanları güncelle. Skill'deki eksikleri düzelt. CHANGELOG disiplini başlat. v2.0.0 release.

### Kapsanan Bulgular
- **B-92** [DÜŞÜK] ValidationLevel 'basic' kapsamı belgele
- **B-93** [DÜŞÜK] DespatchBuilder validationLevel kaldır veya anlamlı yap
- **B-94** [DÜŞÜK] examples/output regenerate + irsaliye örnekleri
- **B-95** [DÜŞÜK] ublExtensionsPlaceholder() sil (dead)
- **B-96** [DÜŞÜK] invoice-serializer yorum numaralandırması XSD uyumlu
- **B-102** [DÜŞÜK] ConfigManager test izolasyonu README
- **B-103** [DÜŞÜK] ConfigManager singleton multi-session README (+ Açık Soru #32 karar)
- **B-S01** [ORTA][SKILL] Codelist 650 iç çelişki notu
- **B-S02** [ORTA][SKILL] ETIKETNO Schematron regex referansı
- **B-S03** [ORTA][SKILL] TaxFreeInvoiceCheck mesaj güncelleme
- **B-S04** [DÜŞÜK][SKILL] Canonical DeliveryAddress ↔ Schematron çelişki notu
- **B-S05** [DÜŞÜK][SKILL] HKSIRSALIYE/IDISIRSALIYE senaryo kılavuzları

### Alt Görevler
- **README.md** — Yeni "Kütüphane Sözleşmesi" bölümü:
  - Unsigned output (Signature/UBLExtensions Mimsoft'ta)
  - `strict` mode kapsam (%95 Mimsoft pre-validation)
  - xmllint XSD validation garantisi
  - ValidationLevel 'basic' vs 'strict' karşılaştırması
  - ConfigManager singleton uyarıları + multi-tenant rehberi
- **InvoiceBuilder / DespatchBuilder JSDoc** — her public method için
- **CHANGELOG.md** — v1.0.0'dan v2.0.0'a tam commit history (yeni disiplin başlatılıyor)
- **Skill güncellemesi — `gib-teknik-dokuman/`:**
  - `references/senaryo-hks-irsaliye-v0.1.md` oluştur
  - `references/senaryo-idis-irsaliye-v0.1.md` oluştur
  - `references/kod-listeleri-ubl-tr-v1.42.md` — 650 iç çelişki notu
  - `references/e-fatura-ubl-tr-v1.0.md` §77 TR1.2 vs İrsaliye TR1.2.1 netleştirme
  - TaxFreeInvoiceCheck mesaj metni güncelle
  - Canonical Irsaliye-Ornek1.xml DeliveryAddress uyarısı
- **Skill güncellemesi — `mimsoft-sdk-gib-gonderim/`:**
  - Yeni `SORUMLULUK-MATRISI.md` oluştur (Signature/UBLExtensions/Schematron/XSD sorumluluk haritası)
  - Mimsoft `unsigned=true` kapsam detayı

### Breaking Change
- Hayır (doküman).

### Release Hedefi
**v2.0.0** — Tüm 112 bulgu çözülmüş. CHANGELOG dolu. Skill güncellenmiş. Major bump.

---

## Toplam Tahmini Süre

| Sprint | Süre (gün) | Kapsanan | Release |
|---|---|---|---|
| S1 Matris Tekleştirme | 2 | 9 bulgu | v1.5.0-rc1 |
| S2 Kod Listeleri KRİTİK | 2 | 17 bulgu | v1.5.0 |
| S3 XSD Sequence + minOccurs | 4 | 18 bulgu | v1.6.0-rc1 |
| S4 Aritmetik + Calculator | 3 | 18 bulgu | v1.7.0-rc1 |
| S5 Validator Kapsamı | 4 | 20 bulgu | v1.8.0-rc1 |
| S6 Despatch Extensions | 3 | 17 bulgu | v1.9.0-rc1 |
| S7 Test Güncellemeleri | 2 | 11 bulgu | v1.9.0 |
| S8 Doküman + Skill | 2 | 12 bulgu | **v2.0.0** |
| **Toplam** | **22** | **122** (çift listelenenler dahil) | |

Net fix = 112 bulgu; bazı bulgular birden fazla sprint'te görünüyor (B-07 S5'te validator+input+serializer; B-25 S2+S4).

---

## Major Version Kararı — v2.0.0

**v2.0.0 gerekçesi (semver uyumlu):**

1. **API yüzeyi değişiyor:**
   - `PROFILE_TYPE_MAP` yapısı (B-01..B-23)
   - `DespatchInput` genişletme (B-18/B-19/B-48..B-53)
   - `CustomizationID` ayrı sabitler (B-38)
   - `cbcTag` → `cbcRequiredTag` ayrımı (B-97)

2. **Hesap davranışı değişiyor (breaking):**
   - `LegalMonetaryTotal.LineExtensionAmount` artık Σ satır (B-15)
   - `TaxInclusiveAmount` stopaj düzeltmesi (B-17)
   - `OZELMATRAH` subtotal taxTotal güncelleme (B-16)
   - Percent 2-basamak yuvarlama (B-42)

3. **Validator daha sıkı (breaking via reject):**
   - 10 TaxExemption kodu reddedilecek (B-03)
   - ~100 WithholdingTaxTypeWithPercent kombinasyonu reddedilecek (B-04)
   - Yeni 13+ Schematron kuralı "geçiyordu şimdi geçmiyor" (S5)

4. **Serializer çıktısı XML yapısı değişiyor:**
   - XSD sequence fix (Sprint 3) — 10+ KRİTİK bulgu
   - Zorunlu alanlar her zaman emit edilecek (B-32/33/34/35)

5. **Sorumluluk Matrisi kristalleşiyor:**
   - Signature/UBLExtensions'ın Mimsoft'ta olduğu dokümante (B-T01/B-T02)
   - `unsigned=true` pre-validation kapsam %95+ garantisi

**v1.5.0..v1.9.0 pre-release neden?** Her sprint sonu internal test için bir release. edocument-service ile entegrasyon testi her sprint sonunda yapılabilir. v2.0.0 tek atışta yayınlanmak yerine artımlı riske-dağıtılmış.

---

## Risk Notları

### Yüksek Risk — edocument-service'i doğrudan etkiler

- **S3 (XSD sequence):** Kütüphane çıktısının XML yapısı büyük değişim. edocument-service fatura/irsaliye gönderimi aynı JSON input için farklı XML üretecek. → **Integration test zorunlu** edocument-service tarafında.
- **S4 (Aritmetik):** B-15/B-16/B-17 davranış değişiyor. edocument-service'in prodüksiyon fatura değerlerinde `LegalMonetaryTotal.LineExtensionAmount` farklı çıkacak. → Regression test + GİB mutabakat verisiyle karşılaştırma.
- **S2 (WithholdingTaxTypeWithPercent):** Var olan kullanıcı 60120/60150 gibi kombinasyonlar kullanıyorsa sprint sonrası reject alır. → Production log analizi ile kullanım sıklığı ölç.

### Orta Risk — edocument-service'i dolaylı etkiler

- **S1 (Matris):** TICARIFATURA kullanıcısı IADE tipini UI'dan seçemeyecek — ama bu zaten yanlıştı, GİB zaten reddediyordu. Düşük kullanıcı etkisi.
- **S5 (Validator kapsamı):** Yeni kurallar önceden geçen yanlış faturaları reddedecek — "geçiyordu şimdi geçmiyor". GİB zaten reddediyordu, ama kütüphane kullanıcısı bunu daha erken görecek.
- **B-44 (setLiability+isExport):** Açık Soru #33 kararına bağlı. "Error fırlat" seçilirse breaking; "no-op" seçilirse sessiz.

### Düşük Risk — lokal fix

- S6 (Despatch extensions): çoğu yeni opsiyonel alan, var olan kullanıcı etkilenmez.
- S7 (Test): CI'da fix.
- S8 (Doküman): yazılı iş.

### "Dikkat Et" Durumları

- **B-05 (555 kodu):** Ayrı set mi ISTISNA ekleme mi kararı (Açık Soru #10) — B-03 (TaxExemption 10 kod çıkar) ile koordineli olmalı. **Önce mimari karar, sonra implement.**
- **B-06 (TaxExemption cross-check):** Validator mimarisi değişiyor — tipe-göre-dispatch yerine koda-göre-kısıt iki yönlü. Bu en büyük validator refactor. Test matrisi geniş.
- **B-14 + B-20 (Despatch sequence):** `despatch-serializer.ts` 174 satırın önemli kısmı değişecek. Refactor zaman alır (xmllint CI ile sürekli doğrulama gerekli).
- **B-38 (CustomizationID):** Açık Soru #23 — GİB/Mimsoft teyit olmadan değiştirmemek daha iyi. Production'da yanlış değer gönderiyor olabilir; ama değiştirmek "eskiden geçen" faturaları kırabilir.

---

## Skill Güncelleme Listesi

### Sprint 8'de yapılacak:

#### `gib-teknik-dokuman/` skill'i

- **YENİ:** `references/senaryo-hks-irsaliye-v0.1.md` — HKS irsaliye senaryo kılavuzu (B-S05)
- **YENİ:** `references/senaryo-idis-irsaliye-v0.1.md` — IDIS irsaliye senaryo kılavuzu (B-S05)
- **GÜNCELLE:** `references/kod-listeleri-ubl-tr-v1.42.md`
  - §4.9 Tevkifat — 650 iç çelişki notu (B-S01)
  - ETIKETNO Schematron regex referansı (B-S02)
  - 555 kodu mimari not (ayrı set vs ISTISNA ekleme) (B-05, B-S03)
- **GÜNCELLE:** `references/e-fatura-ubl-tr-v1.0.md`
  - §77 CustomizationID: Fatura TR1.2, İrsaliye TR1.2.1 netleştirme (B-38)
  - TaxFreeInvoiceCheck mesaj metni double-negative düzeltme (B-S03)
- **GÜNCELLE:** Canonical `xmls/Irsaliye-Ornek1.xml` — DeliveryAddress Schematron çelişki uyarısı (B-S04)
- **GÜNCELLE:** Skill SKILL.md — yeni referans dosyalarını listeye ekle
- **GÜNCELLE:** Skill CHANGELOG

#### `mimsoft-sdk-gib-gonderim/` skill'i

- **YENİ:** `SORUMLULUK-MATRISI.md` — Sorumluluk haritası (B-T01/B-T02)
  - `cac:Signature` → Mimsoft
  - `ext:UBLExtensions` → Mimsoft
  - Schematron validation → Kütüphane (strict mode %95) + Mimsoft
  - XSD validation → Kütüphane (xmllint CI garanti)
  - `unsigned=true` pre-validation kapsam
- **GÜNCELLE:** Skill SKILL.md
- **GÜNCELLE:** Skill CHANGELOG

#### Denetim sırasında keşfedilen skill eksikleri özet

| ID | Tip | Nerede | Ne ekle/düzelt |
|---|---|---|---|
| B-S01 | Orta | kod-listeleri v1.42 §4.9 | 650 iç çelişki notu |
| B-S02 | Orta | kod-listeleri v1.42 §5.x | ETIKETNO Schematron regex |
| B-S03 | Orta | e-fatura-ubl-tr §TaxFreeInvoiceCheck | Mesaj metni revize |
| B-S04 | Düşük | xmls/Irsaliye-Ornek1.xml | DeliveryAddress uyarısı |
| B-S05 | Düşük | references/ | 2 yeni senaryo dosyası |
| (yeni) | Orta | mimsoft-sdk-gib-gonderim | Sorumluluk Matrisi |
| (yeni) | Orta | e-fatura-ubl-tr §77 | TR1.2/TR1.2.1 netleştirme |

---

## Release Planı

| Sürüm | İçerik | Hedef zaman (sprint sonu) |
|---|---|---|
| **v1.4.1** (mevcut) | Baseline | — |
| **v1.5.0-rc1** | S1 Matris | +2 gün |
| **v1.5.0** | S1 + S2 Kod listeleri | +4 gün |
| **v1.6.0-rc1** | S3 XSD sequence + xmllint CI | +8 gün |
| **v1.7.0-rc1** | S4 Aritmetik | +11 gün |
| **v1.8.0-rc1** | S5 Validator | +15 gün |
| **v1.9.0-rc1** | S6 Despatch | +18 gün |
| **v1.9.0** | S7 Test | +20 gün |
| **v2.0.0** | S8 Doküman + final | +22 gün |

Her rc sürümü edocument-service internal entegrasyon testi için; her minor sürüm (v1.5/6/7/8/9) production-ready snapshot; v2.0.0 resmi major.

---

## Bir Sonraki Adım

**Başlangıç: Sprint 1 (Matris Tekleştirme).**

Nedeni:
1. En küçük refactor (2 gün) — hızlı momentum
2. Bağımlılığı yok (diğer sprint'ler tetiklemez)
3. 9 bulgu kapanıyor (3 KRİTİK + 3 YÜKSEK + 3 ORTA) — yüksek verim
4. Test etkisi sınırlı (invoice-builder test suite)
5. Breaking change riski düşük (eskiden zaten GİB reddediyordu)

**Sprint 1 öncesi karar gerekli (~1 saat):**
- Açık Soru #1: Matris truth source = `PROFILE_TYPE_MATRIX` (D03 netleştirdi ama resmi onay gerekli)
- Açık Soru #2: IHRACAT/YOLCU/OZELFATURA serbest mi kısıtlı mı (rules.ts dar mı constants geniş mi?)

Karar sonrası Sprint 1 başlatılabilir.

---

> **SONUÇ:** 112 net bulgu, 22 iş günü, 8 sprint, 9 release (8 rc + v2.0.0). Başlangıç: Sprint 1 Matris Tekleştirme.
