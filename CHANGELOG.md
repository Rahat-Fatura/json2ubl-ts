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

### Sprint 8b ile Tespit Edilen (Sprint 8c Hotfix Adayları)

[audit/ACIK-SORULAR.md §4](./audit/ACIK-SORULAR.md) altında **12 yeni bulgu** (B-NEW-01..B-NEW-12): SimpleInvoiceInput runtime zorunluluk boşlukları, B-81/M5 TEVKIFAT tek-satır çakışması, IHRACKAYITLI+702 AlıcıDİBKod simple-input desteği eksikliği. Sprint 8c öncesi giderilecek.

---

## [1.4.2] — 2026-02-XX

Denetim öncesi son dev sürüm. Detay: git log + `audit/denetim-01..06.md`.
