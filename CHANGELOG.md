# CHANGELOG

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) 1.1.0, sürümleme [SemVer](https://semver.org/lang/tr/).

## [2.0.0] — 2026-04-23

**İlk feature-complete public sürüm.** `1.4.2`'den `2.0.0`'a atlamanın sebebi: çok sayıda breaking change, validator suite revizyonu, mimari kararlar (M1-M10, AR-1..AR-8). Konsolidasyon: Sprint 1-8b implementation log'ları.

### BREAKING CHANGES

- **PROFILE_TYPE_MATRIX sıkılaştırıldı** (Sprint 1): `map`/`matrix` export kaldırıldı; `getAllowedTypes()` helper API. `as any` atlatma yolları kapatıldı. (M1, AR-3/4)
- **IHRACAT/YOLCU/OZELFATURA profilleri yalnızca ISTISNA tipi** kabul eder. Diğer tiplerde `PROFILE_FORBIDDEN_TYPE` hatası. (M2)
- **TAX_EXEMPTION_MATRIX zorunluluğu** (Sprint 5): İstisna kodu × fatura tipi whitelist/forbidden kombinasyonları runtime'da uygulanır. 351 artık ISTISNA grubu değil, SATIS/TEVKIFAT vb. için `requiresZeroKdvLine` ile geçerli. (M5)
- **650 dinamik stopaj** (Sprint 2): `SimpleLineInput.withholdingTaxPercent` zorunlu (0-100). (M3, B-95)
- **555 Demirbaş KDV** `BuilderOptions.allowReducedKdvRate: true` opt-in flag ister. Default false → `REDUCED_KDV_RATE_NOT_ALLOWED`. (M4, B-96)
- **IHRACKAYITLI+702** satır seviyesi **GTİP (12 hane)** + **AlıcıDİBKod** zorunlu. (B-07)
- **YATIRIMTESVIK**: `ytbNo` (6 hane) + Kod 01 Makine için `productTraceId+serialId+brand+model` zorunlu; IADE grubunda muaf. (B-08)
- **KAMU profili** `buyerCustomer` + `paymentMeans` + TR IBAN zorunlu; `additionalIdentifiers` (MUSTERINO vb.). (B-83)
- **CustomizationID** Fatura için `TR1.2`, e-İrsaliye için `TR1.2.1` sabitleri. Eski sürümlerde her ikisi de `TR1.2.1` idi. (M8)
- **Calculator tam float**; yuvarlama yalnızca XML yazım anında XSD-yuvarlamalı alanlarda. Ara hesaplarda hassasiyet kaybı yok. (M9)
- **`setLiability()` `isExport=true` iken no-op** (error yerine). (M10)
- **`cbcTag` utility silindi**, `cbcRequiredTag` + `cbcOptionalTag` split. (AR-1)
- **`driverPerson` → `driverPersons[]` array** — çoklu sürücü ve taşıyıcı kombinasyonu. (AR-2)
- **Satır-seviyesi `kdvExemptionCode` kaldırıldı**, belge seviyesi tek kaynak. (AR-7)
- **Outstanding/Oversupply input alanları kaldırıldı**. (AR-8)

### Added

- Basitleştirilmiş giriş API: **`SimpleInvoiceBuilder`** (JSON-benzeri girdi → UBL-TR XML). Hesaplamayı kütüphane yapar (Sprint 1-2).
- **`InvoiceSession`** reaktif API + `FieldVisibility` (frontend entegrasyon için, Sprint 2).
- **`ConfigManager`** dinamik config (unit, currency, tax, withholding, exemption — Sprint 2).
- **Cross-check validator suite**: `validators/cross-check-matrix.ts` (M5, M7 türetme), `validators/cross-validators.ts`.
- **Profile validators**: YATIRIMTESVIK (B-08), IHRACKAYITLI+702 (B-07), KAMU (B-83), YOLCUBERABERFATURA (nationalityId B-104).
- **Type validators**: IADE grubu BillingReference (Schematron IADEInvioceCheck), TEVKIFAT WithholdingTaxTotal (Sprint 5).
- **Common validators**: 1460415308 / 7750409379 cross-check VKN, `PARTY_IDENTIFICATION_SCHEME_IDS` whitelist, IssueDate aralık (2005 → bugün) (Sprint 8a).
- **Despatch validators**: MATBUDAN additionalDocuments, çoklu sürücü, DORSEPLAKA canonical (AR-2, B-49, B-66).
- **Calc↔serialize round-trip integration test** (Sprint 8a).
- **XSD validator suite**: Sequence hizalama kontrolleri (B-09..B-14, B-20, vb.).
- **Mimsoft fixture regresyon suite** (f10-f17) — Sprint 8a.
- **`examples/` comprehensive pack** (Sprint 8b): **38 senaryo + 2 showcase**, her biri 6 dosya (input.ts + input.json + output.xml + run.ts + validation-errors.ts + README.md). [examples/README.md](./examples/README.md).
- **`package-type-code-config.ts`**, **`payment-means-config.ts`** (D1/D2).
- **Parent-child conditional validator** (M6): parent opsiyonel, parent verilirse child zorunlu.
- **`cbcRequiredTag` + `cbcOptionalTag`** utility split (AR-1).

### Changed

- `LegalMonetaryTotal.LineExtensionAmount` iskonto sonrası değeri kullanır. (B-15)
- 351 kodu non-ISTISNA tiplerine bağlandı. (M5)
- `nationalityId` 11-hane TCKN formatı zorunlu (ISO 2-harf reddedilir). (B-104)
- 650 kodu ile dinamik oran — kullanıcı input'u. (M3)
- Serializer 2-basamak yuvarlama XML yazım anında; calculator float. (M9)

### Fixed

- TICARIFATURA+IADE, HKS profili tip isimleri. (B-01, B-02)
- TaxExemption 10 geçersiz kod temizlendi. (B-03)
- WithholdingTaxTypeWithPercent Codelist uyumsuzluğu. (B-04)
- XSD sequence hizalaması — Invoice/Despatch açılış tag'i, 20+ serialize path. (B-09..B-14, B-20, B-32..B-35, B-41..B-47)
- Stopaj subtotal double-counting. (B-44, B-45, B-79)
- DespatchSupplierParty/DespatchContact/Name eksikliği. (B-19)
- Kamu aracı kurum additionalIdentifiers. (B-83)
- Yaklaşık 80+ serializer/validator/config bulgusu (denetim-01..06 kapsamı).

### Removed

- `B-40 PayableRoundingAmount` desteği (AR-5 tam iptal).
- Satır-seviyesi `kdvExemptionCode` alanı. (AR-7)
- Outstanding/Oversupply input alanları. (AR-8)
- Eski dead PaymentMeansCode set. (AR-6)
- `cbcTag` eski utility. (AR-1)
- `ublExtensionsPlaceholder()` dead helper + yorum-out kalıntıları (Sprint 8b.10). (B-93)
- İptal edilen bulgular: B-16, B-50, B-75, B-82, B-103 (kategori A).

### Sprint Dağılımı

- **Sprint 1-2**: M1 matrix + `SimpleInvoiceBuilder` + D1/D2 config
- **Sprint 3**: XSD sequence + M6 parent-child + AR-1 utility split
- **Sprint 4**: Calculator aritmetik + M9 yuvarlama + M10 liability
- **Sprint 5**: TAX_EXEMPTION_MATRIX + exemption-config derivation + M5/M7
- **Sprint 6**: Cross-validator suite + common-validators
- **Sprint 7**: Profile validators (YOLCU, YTB, IHRACKAYITLI), calc↔serialize integration, B-T08
- **Sprint 8a**: Devir bulgu temizliği (Paket A-H) + Mimsoft fixture regresyon + B-83..B-86 + B-104
- **Sprint 8b**: Comprehensive examples pack (38 senaryo) + README sorumluluk matrisi + skill doc referans + CHANGELOG

### Sprint 8b ile Tespit Edilen (Sprint 8c'de Giderildi)

[audit/ACIK-SORULAR.md §4](./audit/ACIK-SORULAR.md) altında **12 yeni bulgu** (B-NEW-01..B-NEW-12): SimpleInvoiceInput runtime zorunluluk boşlukları, B-81/M5 TEVKIFAT tek-satır çakışması, IHRACKAYITLI+702 AlıcıDİBKod simple-input desteği eksikliği. **Sprint 8c'de giderildi** (aşağıya bkz.).

---

### Sprint 8c Hotfix Dalgası (B-NEW-01..13) — 2026-04-24

**Kapsam:** B-NEW-01..12 (audit/b-new-audit.md) + B-NEW-13 (Sprint 8c'de tanımlandı). B-NEW-14 plan varsayımı yanlışlandı (IDIS validator zaten mevcut). 13 atomik commit. 9/9 workaround senaryo strict moda döndü.

#### BREAKING CHANGES (Sprint 8c)

- **Calculator self-exemption dışı faturalarda 351 otomatik üretmez** — kullanıcı `kdvExemptionCode` vermediyse `null` kalır. SATIS/TEVKIFAT/SGK/IADE vb. tiplerde KDV=0 kalem için **manuel istisna kodu zorunlu** (validator enforce). (B-NEW-11 / M11)
- **`validateCrossMatrix` basic+strict her iki modda** — önceden basic modda sessiz geçen `SATIS+702` gibi `FORBIDDEN_EXEMPTION_FOR_TYPE` kombinasyonları artık reddedilir. (B-NEW-05)
- **IHRACKAYITLI faturada 701-704 istisna kodu zorunlu** (`TYPE_REQUIREMENT`). (B-NEW-06)
- **701-704 kuralları `requiresZeroKdvLine: true`** — IHRACKAYITLI satırında KDV>0 artık reddedilir. (B-NEW-07)
- **`SimpleSgkInput.type`** string → literal union (`SAGLIK_ECZ | SAGLIK_HAS | SAGLIK_OPT | SAGLIK_MED | ABONELIK | MAL_HIZMET | DIGER`). TypeScript darlatma. (B-NEW-09)
- **YOLCUBERABERFATURA profili** `buyerCustomer.nationalityId` + `passportId` + belge seviyesi `taxRepresentativeParty` zorunlu. (B-NEW-13)

#### Added (Sprint 8c)

- **M11 Self-exemption types config** (`src/config/self-exemption-types.ts`) — ISTISNA/YTBISTISNA/IHRACKAYITLI/OZELMATRAH tipleri + IHRACAT/YOLCUBERABERFATURA/OZELFATURA/YATIRIMTESVIK profilleri. `isSelfExemptionInvoice()` helper.
- **`manual-exemption-validator`** — self-exemption olmayan faturada 4 kural: KDV=0 + tevkifat çakışması, KDV=0 + kod eksik, KDV>0 + satır 351, belge 351 + tüm satırlar KDV>0.
- **`sgk-input-validator`** — SGK tipi için obje zorunluluğu + type whitelist + alt-alan boş-olmama.
- **`simple-line-range-validator`** — kdvPercent [0,100], quantity > 0, tax.percent [0,100] runtime sınır kontrolleri.
- **`SimpleLineInput.kdvExemptionCode`** — satır bazı manuel istisna kodu (belge fallback).
- **`SimpleLineDeliveryInput.alicidibsatirkod`** — IHRACKAYITLI+702 için 11-haneli AlıcıDİBSATIRKOD. Mapper `Shipment/TransportHandlingUnit/CustomsDeclaration/IssuerParty/PartyIdentification[schemeID='ALICIDIBSATIRKOD']` ağacına eşler.
- **`SimpleBuyerCustomerInput.nationalityId + passportId`** — YOLCUBERABERFATURA profili.
- **`SimpleInvoiceInput.taxRepresentativeParty`** + yeni `SimpleTaxRepresentativeInput` tipi — YOLCUBERABERFATURA aracı kurum.
- **555 "KDV Oran Kontrolüne Tabi Olmayan Satışlar"** — `exemption-config.ts`'e eklendi; cross-check matrisinde allowed SATIS/TEVKIFAT/KOMISYONCU. KDV oranından bağımsız.
- **AR-9 Reactive InvoiceSession** tasarım notu (`audit/reactive-session-design-notes.md`) — v2.1.0 hedefli.

#### Changed (Sprint 8c)

- **Calculator `resolveExemptionReason`** sadeleşti. `DEFAULT_EXEMPTIONS.satis='351'` kaldırıldı; yalnızca `istisna='350'` ve `ihracKayitli='701'` self-exemption fallback olarak kaldı.
- **Mapper `shouldAddExemption`** sadeleşti — 555 kullanıcı input'u varsa KDV>0 kalemde de XML'e yazılır. Satır bazı `kdvExemptionCode` TaxSubtotal'a eşlenir.

#### Removed (Sprint 8c)

- **`document-calculator.ts DEFAULT_EXEMPTIONS.satis`** — B-NEW-11 kök sebep.
- **`simple-invoice-mapper.ts` B-81 TEVKIFAT+351 atlatma satırı** — gereksizleşti.

#### Fixed (Sprint 8c)

- B-NEW-01..12 (12 audit bug) + B-NEW-13 (YOLCU passport). Audit detay: `audit/b-new-audit.md`.
- 9/9 workaround senaryo (05, 07, 10, 16, 17, 20, 26, 31, 99) strict moda döndü.
- 30-feature-555 gizli regresyonu (önceden calculator `input.kdvExemptionCode='555'` yok sayıp yanlış 351 yazıyordu) çözüldü.

#### Sprint 8c Commit Dağılımı (13 atomik)

- **8c.0**: Plan kopya + log iskelet + FIX-PLANI M11/AR-9 işaretleme
- **8c.1**: B-NEW-11 + M11 config + manual-exemption-validator + 555 cross-check
- **8c.2**: B-NEW-12 (alicidibsatirkod + mapper CustomsDeclaration)
- **8c.3**: M11 + manual-exemption-validator testleri (+21 test)
- **8c.4**: B-NEW-13 (nationalityId/passportId + taxRepresentativeParty)
- **8c.5**: B-NEW-14 plan hatası düzeltmesi + 26 validation-errors test coverage
- **8c.6**: G3 cross-check matrix (B-NEW-04..07) (+3 test)
- **8c.7**: G4 SGK (B-NEW-08..10) (+9 test)
- **8c.8**: G5 runtime hijyen (B-NEW-01..03) (+10 test)
- **8c.9**: Workaround kaldırma — 9/9 strict
- **8c.10**: Doküman güncellemeleri (CHANGELOG + README + reactive notes)
- **8c.11**: v2.0.0 release ops
- **8c.12**: Implementation log finalize

**Test değişimi:** 755 → **800** (+45). Plan ~884 hedefi `validation-errors.test.ts` strict per-case refactor'a bağlıydı — smoke test kapsamı yeterli olduğundan v2.1.0'a devredildi.

---

### Sprint 8d — M12 Phantom KDV (Vazgeçilen KDV Tutarı) — 2026-04-24

> **Not:** Bu alt-section Sprint 8d ilerledikçe doldurulacak (8d.8 finalize commit'inde). Şu an placeholder.

**Kapsam:** YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA için GİB "Yatırım Teşvik Kapsamında Yapılan Teslimlere İlişkin Fatura Teknik Kılavuzu v1.1" (Aralık 2025) uyumu. 9 atomik alt-commit (8d.0 → 8d.8). v2.0.0 publish 8d sonrası.

Detay: `audit/sprint-08d-plan.md`, `audit/sprint-08d-implementation-log.md`.

---

## [1.4.2] — 2026-02-XX

Denetim öncesi son dev sürüm. Detay: git log + `audit/denetim-01..06.md`.
