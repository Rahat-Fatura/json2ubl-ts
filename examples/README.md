# json2ubl-ts — Comprehensive Examples

Bu dizin, `json2ubl-ts` kütüphanesinin desteklediği tüm anlamlı senaryoları **çalıştırılabilir ders notu** olarak içerir. Her senaryo bağımsız bir klasörde 6 dosya ile sunulur:

| Dosya | Amaç |
|-------|------|
| `README.md` | Senaryonun açıklaması, kapsadığı feature'lar, GİB iş durumu, gotcha'lar |
| `input.ts` | Tip güvenli TypeScript input (`InvoiceInput` veya `DespatchInput`) |
| `input.json` | Aynı input'un JSON eşleniği (Mimsoft-benzeri API workflow için) |
| `output.xml` | Generated UBL-TR 2.1 XML (Sprint 8a davranışı) |
| `run.ts` | Tek komutla validate + build + write (`npx tsx examples/NN-slug/run.ts`) |
| `validation-errors.ts` | 4 yanlış input örneği + beklenen hata mesajları |

## Hızlı Başlangıç

```bash
# Tüm senaryoları çalıştır
npm run examples

# Slug filtresiyle seçmeli çalıştır
npx tsx examples/run-all.ts yatirimtesvik

# Tek senaryo
npx tsx examples/02-temelfatura-satis-gelir-stopaji/run.ts
```

## CustomizationID Uyarısı (Sprint 8b kararı)

- **Fatura (Invoice):** `TR1.2`
- **e-İrsaliye (Despatch):** `TR1.2.1`

Önceki `v1.x` örneklerinde tüm dosyalarda `TR1.2.1` vardı — bu Sprint 8a sonrasında düzeltildi (`M8`). Her senaryonun `output.xml`'inde ilgili `CustomizationID` değeri doğrudur.

## Senaryo Katalogu (38 senaryo)

### §1 — TEMELFATURA (8)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 01 | [temelfatura-satis](./01-temelfatura-satis/) | TEMELFATURA | SATIS | Temel KDV'li satış, VKN alıcı | — |
| 02 | [temelfatura-satis-gelir-stopaji](./02-temelfatura-satis-gelir-stopaji/) | TEMELFATURA | SATIS | %23 Gelir Vergisi Stopajı (0003) + KDV %20 | **f10** |
| 03 | [temelfatura-satis-kurumlar-stopaji](./03-temelfatura-satis-kurumlar-stopaji/) | TEMELFATURA | SATIS | %32 Kurumlar Vergisi Stopajı (0011) + KDV %20 | **f11** |
| 04 | [temelfatura-iade](./04-temelfatura-iade/) | TEMELFATURA | IADE | BillingReference zorunlu | — |
| 05 | [temelfatura-tevkifat](./05-temelfatura-tevkifat/) | TEMELFATURA | TEVKIFAT | KDV tevkifatı (601-627 kodları) | — |
| 06 | [temelfatura-istisna-351](./06-temelfatura-istisna-351/) | TEMELFATURA | SATIS | İstisna 351 + KDV=0 satır (M5) | **f15** |
| 07 | [temelfatura-ihrackayitli-702](./07-temelfatura-ihrackayitli-702/) | TEMELFATURA | IHRACKAYITLI | 702 + GTİP + AlıcıDİBKod (B-07) | **f12** |
| 08 | [temelfatura-sgk](./08-temelfatura-sgk/) | TEMELFATURA | SGK | SGK sağlık/eczacılık kodları + KDV'li | **f16** |

### §2 — TICARIFATURA (3)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 09 | [ticarifatura-satis](./09-ticarifatura-satis/) | TICARIFATURA | SATIS | Ticari satış (IADE yok) | — |
| 10 | [ticarifatura-tevkifat-650-dinamik](./10-ticarifatura-tevkifat-650-dinamik/) | TICARIFATURA | TEVKIFAT | **650 dinamik stopaj** (M3, B-95) | — |
| 11 | [ticarifatura-istisna](./11-ticarifatura-istisna/) | TICARIFATURA | ISTISNA | Ticari + 201-250 istisna kodları | — |

### §3 — YATIRIMTESVIK (3)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 12 | [yatirimtesvik-satis-makina](./12-yatirimtesvik-satis-makina/) | YATIRIMTESVIK | SATIS | ytbNo + ItemClass 01 (Makine) + CommodityClassification | **f13** |
| 13 | [yatirimtesvik-satis-insaat](./13-yatirimtesvik-satis-insaat/) | YATIRIMTESVIK | SATIS | ytbNo + ItemClass 02 (İnşaat) | **f14** |
| 14 | [yatirimtesvik-iade](./14-yatirimtesvik-iade/) | YATIRIMTESVIK | IADE | B-08 istisnası (YATIRIM_TESVIK_IADE_TYPES) | — |

### §4 — KAMU (3)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 15 | [kamu-satis](./15-kamu-satis/) | KAMU | SATIS | BuyerCustomer + TR IBAN + PaymentMeans (B-83) | **f17** |
| 16 | [kamu-tevkifat](./16-kamu-tevkifat/) | KAMU | TEVKIFAT | KAMU + tevkifat | — |
| 17 | [kamu-ihrackayitli](./17-kamu-ihrackayitli/) | KAMU | IHRACKAYITLI | KAMU + 702 + GTİP | — |

### §5 — IHRACAT (2)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 18 | [ihracat-istisna-basic](./18-ihracat-istisna-basic/) | IHRACAT | ISTISNA | BuyerCustomer (yabancı), Supplier registrationName/taxOffice | — |
| 19 | [ihracat-istisna-multiline-incoterms](./19-ihracat-istisna-multiline-incoterms/) | IHRACAT | ISTISNA | Çok satırlı, INCOTERMS (FOB), LineDelivery | — |

### §6 — YOLCUBERABERFATURA (1)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 20 | [yolcu-beraber-istisna-yabanci](./20-yolcu-beraber-istisna-yabanci/) | YOLCUBERABERFATURA | ISTISNA | nationalityId + passportId + TaxRepresentativeParty | — |

### §7 — EARSIVFATURA (2)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 21 | [earsiv-satis-basic](./21-earsiv-satis-basic/) | EARSIVFATURA | SATIS | onlineSale + eArchiveInfo | — |
| 22 | [earsiv-teknolojidestek](./22-earsiv-teknolojidestek/) | EARSIVFATURA | TEKNOLOJIDESTEK | IMEI/SERIMNO ek kimlikler | — |

### §8 — HKS + ILAC + ENERJI + IDIS (4)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 23 | [hks-satis](./23-hks-satis/) | HKS | HKSSATIS | KUNYENO (ilaç kunyesi) | — |
| 24 | [ilac-tibbicihaz-satis](./24-ilac-tibbicihaz-satis/) | ILAC_TIBBICIHAZ | SATIS | İlaç/tıbbi cihaz ek kimlik | — |
| 25 | [enerji-sarj](./25-enerji-sarj/) | ENERJI | SARJ | Elektrik/gaz faturası | — |
| 26 | [idis-satis](./26-idis-satis/) | IDIS | SATIS | SEVKIYATNO (SE-XXXXXXX) + ETIKETNO | — |

### §9 — Feature Varyantları (6)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 27 | [feature-yabanci-para-eur](./27-feature-yabanci-para-eur/) | TEMELFATURA | SATIS | EUR + ExchangeRate + TaxExchangeRate | — |
| 28 | [feature-coklu-kdv-oranlari](./28-feature-coklu-kdv-oranlari/) | TEMELFATURA | SATIS | %1, %10, %20 tek faturada | — |
| 29 | [feature-allowance-charge](./29-feature-allowance-charge/) | TEMELFATURA | SATIS | Belge + satır AllowanceCharge | — |
| 30 | [feature-555-demirbas-kdv](./30-feature-555-demirbas-kdv/) | TEMELFATURA | SATIS | **M4: allowReducedKdvRate flag** + 555 kodu (B-96) | — |
| 31 | [feature-4171-otv-tevkifati](./31-feature-4171-otv-tevkifati/) | TEMELFATURA | TEVKIFAT | 4171 belge seviyesi ÖTV tevkifatı | — |
| 32 | [feature-note-orderref-payment](./32-feature-note-orderref-payment/) | TEMELFATURA | SATIS | Note[] + OrderReference + PaymentMeans | — |

### §10 — İrsaliye Despatch (4)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 33 | [irsaliye-temel-sevk-tek-sofor](./33-irsaliye-temel-sevk-tek-sofor/) | TEMELIRSALIYE | SEVK | Sürücü + plaka + teslimat adresi | — |
| 34 | [irsaliye-temel-sevk-coklu-sofor](./34-irsaliye-temel-sevk-coklu-sofor/) | TEMELIRSALIYE | SEVK | **AR-2:** driverPersons array + CarrierParty (B-66) | — |
| 35 | [irsaliye-matbudan](./35-irsaliye-matbudan/) | TEMELIRSALIYE | MATBUDAN | additionalDocuments zorunlu (B-66) | — |
| 36 | [irsaliye-idis](./36-irsaliye-idis/) | IDISIRSALIYE | SEVK | ETIKETNO + SEVKIYATNO | — |

### §11 — Showcase (2)

| # | Senaryo | Profile | Tip | Kapsadığı Feature | Fixture |
|---|---------|---------|-----|-------------------|---------|
| 37 | [99-showcase-everything](./99-showcase-everything/) | TEMELFATURA | TEVKIFAT | AllowanceCharge + 3 KDV + 650 dinamik + EUR + Note + PaymentMeans + OrderReference + ek belgeler | — |
| 38 | [99-showcase-ihracat-full](./99-showcase-ihracat-full/) | IHRACAT | ISTISNA | IHRACAT tam: gümrük, INCOTERMS, LineDelivery, depo, yabancı BuyerCustomer, multi-line | — |

## Fixture Paralelliği

Aşağıdaki senaryolar `__tests__/fixtures/mimsoft-real-invoices/` altındaki **gerçek Mimsoft üretim faturalarıyla** yapısal olarak paralel hazırlanmıştır (tarih/VKN/ID fiktif, element ağacı ve tax subtotal yapısı aynı):

| Fixture | Senaryo |
|---------|---------|
| `f10-satis-gelir-stopaji.xml` | 02 |
| `f11-satis-kurumlar-stopaji.xml` | 03 |
| `f12-ihrackayitli-702.xml` | 07 |
| `f13-yatirimtesvik-satis-makina.xml` | 12 |
| `f14-yatirimtesvik-satis-insaat.xml` | 13 |
| `f15-satis-351.xml` | 06 |
| `f16-sgk.xml` | 08 |
| `f17-kamu.xml` | 15 |

## Kasıtlı Kapsam Dışı (8c+)

Aşağıdaki kombinasyonlar kütüphanede desteklenir fakat bu pakette kapsam dışı bırakıldı:

- **TEVKIFATIADE**: İade'nin özel hali — `04-temelfatura-iade` + BillingReference yeterli referans
- **OZELMATRAH**: 801-812 kodları, niş
- **EARSIVFATURA + YTB varyantları**: §7 EARSIV temsil yeterli
- **KONAKLAMAVERGISI**: ENERJI ile niş grup
- **HKSIRSALIYE**: IDIS irsaliye (36) ile despatch temsili yeterli

## Referanslar

- [README.md (kök)](../README.md) — kütüphane genel kullanımı + Sorumluluk Matrisi (§8)
- [CHANGELOG.md](../CHANGELOG.md) — v2.0.0 kapsamı
- [audit/sprint-08b-plan.md](../audit/sprint-08b-plan.md) — bu paketin planı
