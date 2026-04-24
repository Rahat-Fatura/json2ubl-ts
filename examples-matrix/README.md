# examples-matrix/

Sprint 8e (Publish Öncesi Kapsam Doğrulama) + Sprint 8f (Bug hotfix + kapsam genişletme) altında üretilen **script-assisted kapsam kataloğu**. Kütüphanenin desteklediği profil+tip kombinasyonları ve validator error code'ları için çalıştırılabilir example'lar.

> **Auto-generated** — `examples-matrix/_lib/meta-indexer.ts` tarafından tüm `meta.json` dosyalarından üretilir. Manuel düzenleme yapılmamalı; yerine `npx tsx examples-matrix/_lib/meta-indexer.ts --write` ile yeniden üretilir.

## 📊 Özet (Dashboard)

- **15 profil** × **19 tip** — PROFILE_TYPE_MATRIX'te **68 kombinasyon** tanımlı
- **122 valid senaryo** (115 invoice + 7 despatch)
- **40 invalid senaryo** — 15 farklı error code kapsıyor
- **Coverage:** 67/68 kombinasyon (%98.5)
- **Toplam:** 162 senaryo

## Kullanım

```bash
# Senaryoları scaffold et (spec → klasör):
npx tsx examples-matrix/scaffold.ts

# Tüm senaryoları çalıştır:
npx tsx examples-matrix/run-all.ts

# Filtreleyerek gezin:
npx tsx examples-matrix/find.ts --profile=TEMELFATURA --type=IHRACKAYITLI
npx tsx examples-matrix/find.ts --error-code=MISSING_FIELD
npx tsx examples-matrix/find.ts --has-withholding --currency=USD
```

## Profil × Tip Pivot Tablosu

| Profil \ Tip | HKSKOMISYONCU | HKSSATIS | IADE | IHRACKAYITLI | ISTISNA | KOMISYONCU | KONAKLAMAVERGISI | OZELMATRAH | SARJ | SARJANLIK | SATIS | SGK | TEVKIFAT | TEVKIFATIADE | YTBIADE | YTBISTISNA | YTBSATIS | YTBTEVKIFAT | YTBTEVKIFATIADE | **Toplam** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| EARSIVFATURA | — | — | 2 | 1 | 2 | 1 | 1 | 1 | — | — | 3 | 1 | 2 | 1 | 1 | 2 | 2 | 1 | 2 | **23** |
| ENERJI | — | — | — | — | — | — | — | — | 2 | 1 | — | — | — | — | — | — | — | — | — | **3** |
| HKS | 1 | 2 | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | **3** |
| IDIS | — | — | 1 | 2 | 1 | — | — | — | — | — | 2 | — | 1 | 1 | — | — | — | — | — | **8** |
| IHRACAT | — | — | — | — | 3 | — | — | — | — | — | — | — | — | — | — | — | — | — | — | **3** |
| ILAC_TIBBICIHAZ | — | — | 1 | 1 | 1 | — | — | — | — | — | 3 | — | 1 | 1 | — | — | — | — | — | **8** |
| KAMU | — | — | — | 1 | 2 | 1 | 1 | 1 | — | — | 3 | 1 | 2 | 1 | — | — | — | — | — | **13** |
| OZELFATURA | — | — | — | — | 1 | — | — | — | — | — | — | — | — | — | — | — | — | — | — | **1** |
| TEMELFATURA | — | — | 2 | 2 | 4 | 1 | 1 | 1 | — | — | 9 | 2 | 3 | 2 | — | — | — | — | — | **27** |
| TICARIFATURA | — | — | — | 1 | 2 | 1 | 1 | 2 | — | — | 3 | 1 | 2 | 1 | — | — | — | — | — | **14** |
| YATIRIMTESVIK | — | — | 2 | — | 2 | — | — | — | — | — | 3 | — | 2 | 1 | — | — | — | — | — | **10** |
| YOLCUBERABERFATURA | — | — | — | — | 2 | — | — | — | — | — | — | — | — | — | — | — | — | — | — | **2** |

## Coverage Gap Report

⚠️ **1 kombinasyon kapsamsız** (PROFILE_TYPE_MATRIX'te izinli ama senaryo yok):

- EARSIVFATURA × TEKNOLOJIDESTEK

## Kod Dağılımları

### Error Code Dağılımı (invalid senaryolarda)

```
PROFILE_REQUIREMENT                       ████████████████████████ 9
MISSING_FIELD                             ███████████████████ 7
INVALID_FORMAT                            █████████████ 5
TYPE_REQUIREMENT                          ███████████ 4
INVALID_VALUE                             ████████ 3
YATIRIMTESVIK_REQUIRES_YTBNO              ████████ 3
CROSS_MATRIX                              ███ 1
EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV   ███ 1
IHRACKAYITLI_702_REQUIRES_GTIP            ███ 1
INVALID_PROFILE                           ███ 1
REDUCED_KDV_RATE_NOT_ALLOWED              ███ 1
TYPE_REQUIRES_SGK                         ███ 1
UNKNOWN_EXEMPTION_CODE                    ███ 1
YTB_ISTISNA_EXEMPTION_CODE_MISMATCH       ███ 1
YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT  ███ 1
```

### Exemption Code Dağılımı (valid senaryolarda)

```
213  ████████████████████████ 8
702  ██████████████████ 6
301  ███████████████ 5
801  ████████████ 4
322  █████████ 3
308  ██████ 2
339  ██████ 2
701  ██████ 2
201  ██████ 2
351  ███ 1
805  ███ 1
```

## Valid Senaryolar (profil bazında)

### EARSIVFATURA (23)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [earsivfatura-iade-baseline](valid/earsivfatura/earsivfatura-iade-baseline/) | IADE | baseline | 20 | TRY | billingReference | Baseline — EARSIVFATURA+IADE, billingReference |
| [earsivfatura-iade-coklu-satir](valid/earsivfatura/earsivfatura-iade-coklu-satir/) | IADE | coklu-satir | 20 | TRY | — | EARSIVFATURA+IADE 3 satır |
| [earsivfatura-ihrackayitli-baseline](valid/earsivfatura/earsivfatura-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod | Baseline — EARSIVFATURA+IHRACKAYITLI |
| [earsivfatura-istisna-baseline](valid/earsivfatura/earsivfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — EARSIVFATURA+ISTISNA, kod 213 |
| [earsivfatura-istisna-usd-doviz](valid/earsivfatura/earsivfatura-istisna-usd-doviz/) | ISTISNA | usd-doviz | 0 | USD | — | EARSIVFATURA+ISTISNA USD döviz + kod 213 |
| [earsivfatura-komisyoncu-baseline](valid/earsivfatura/earsivfatura-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+KOMISYONCU |
| [earsivfatura-konaklamavergisi-baseline](valid/earsivfatura/earsivfatura-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+KONAKLAMAVERGISI |
| [earsivfatura-ozelmatrah-baseline](valid/earsivfatura/earsivfatura-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah | Baseline — EARSIVFATURA+OZELMATRAH |
| [earsivfatura-satis-baseline](valid/earsivfatura/earsivfatura-satis-baseline/) | SATIS | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+SATIS |
| [earsivfatura-satis-coklu-kdv](valid/earsivfatura/earsivfatura-satis-coklu-kdv/) | SATIS | coklu-kdv | 10,20 | TRY | — | EARSIVFATURA+SATIS çoklu KDV (10 + 20) |
| [earsivfatura-satis-not-siparis](valid/earsivfatura/earsivfatura-satis-not-siparis/) | SATIS | not-siparis | 20 | TRY | orderReference | EARSIVFATURA+SATIS notes + orderReference |
| [earsivfatura-sgk-baseline](valid/earsivfatura/earsivfatura-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk | Baseline — EARSIVFATURA+SGK, MAL_HIZMET |
| [earsivfatura-tevkifat-baseline](valid/earsivfatura/earsivfatura-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+TEVKIFAT |
| [earsivfatura-tevkifat-dinamik-650](valid/earsivfatura/earsivfatura-tevkifat-dinamik-650/) | TEVKIFAT | dinamik-650 | 20 | TRY | — | EARSIVFATURA+TEVKIFAT 650 dinamik %30 |
| [earsivfatura-tevkifatiade-baseline](valid/earsivfatura/earsivfatura-tevkifatiade-baseline/) | TEVKIFATIADE | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+TEVKIFATIADE, kod 603 %70 |
| [earsivfatura-ytbiade-baseline](valid/earsivfatura/earsivfatura-ytbiade-baseline/) | YTBIADE | baseline | 20 | TRY | ytbNo | EARSIVFATURA+YTBIADE baseline (ytbNo + billingReference + kod 03) |
| [earsivfatura-ytbistisna-phantom-308-makine](valid/earsivfatura/earsivfatura-ytbistisna-phantom-308-makine/) | YTBISTISNA | phantom-308-makine | 20 | TRY | ytbNo, phantom-kdv | EARSIVFATURA+YTBISTISNA — Phantom KDV (M12): kod 308 + itemClassificationCode 01 |
| [earsivfatura-ytbistisna-phantom-339-insaat](valid/earsivfatura/earsivfatura-ytbistisna-phantom-339-insaat/) | YTBISTISNA | phantom-339-insaat | 20 | TRY | ytbNo, phantom-kdv | EARSIVFATURA+YTBISTISNA — Phantom KDV: kod 339 + itemClassificationCode 02 inşaat |
| [earsivfatura-ytbsatis-baseline](valid/earsivfatura/earsivfatura-ytbsatis-baseline/) | YTBSATIS | baseline | 20 | TRY | ytbNo | Baseline — EARSIVFATURA+YTBSATIS, ytbNo + kod 01 makine |
| [earsivfatura-ytbsatis-kod-02-insaat](valid/earsivfatura/earsivfatura-ytbsatis-kod-02-insaat/) | YTBSATIS | kod-02-insaat | 20 | TRY | ytbNo | EARSIVFATURA+YTBSATIS kod 02 (inşaat harcama tipi) |
| [earsivfatura-ytbtevkifat-baseline](valid/earsivfatura/earsivfatura-ytbtevkifat-baseline/) | YTBTEVKIFAT | baseline | 20 | TRY | ytbNo | EARSIVFATURA+YTBTEVKIFAT baseline (ytbNo + withholdingCode 603 + kod 03) |
| [earsivfatura-ytbtevkifatiade-baseline](valid/earsivfatura/earsivfatura-ytbtevkifatiade-baseline/) | YTBTEVKIFATIADE | baseline | 20 | TRY | ytbNo | Baseline — EARSIVFATURA+YTBTEVKIFATIADE, ytbNo + kod 603 + itemClassificationCode 03 |
| [earsivfatura-ytbtevkifatiade-kod-620-tekstil](valid/earsivfatura/earsivfatura-ytbtevkifatiade-kod-620-tekstil/) | YTBTEVKIFATIADE | kod-620-tekstil | 20 | TRY | ytbNo | Varyant — EARSIVFATURA+YTBTEVKIFATIADE, kod 620 %50 tekstil |

### ENERJI (3)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [enerji-sarj-baseline](valid/enerji/enerji-sarj-baseline/) | SARJ | baseline | 20 | TRY | — | Baseline — ENERJI+SARJ, araç şarj hizmeti |
| [enerji-sarj-coklu-sarj](valid/enerji/enerji-sarj-coklu-sarj/) | SARJ | coklu-sarj | 20 | TRY | — | ENERJI+SARJ 3 şarj noktası tek faturada |
| [enerji-sarjanlik-baseline](valid/enerji/enerji-sarjanlik-baseline/) | SARJANLIK | baseline | 20 | TRY | — | Baseline — ENERJI+SARJANLIK, operatörden anlık satış |

### HKS (3)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [hks-hkskomisyoncu-baseline](valid/hks/hks-hkskomisyoncu-baseline/) | HKSKOMISYONCU | baseline | 10 | TRY | kunyeno | Baseline — HKS+HKSKOMISYONCU, komisyoncu satış |
| [hks-hkssatis-baseline](valid/hks/hks-hkssatis-baseline/) | HKSSATIS | baseline | 10 | TRY | kunyeno | Baseline — HKS+HKSSATIS, KUNYENO 19-char per line |
| [hks-hkssatis-coklu-kunye](valid/hks/hks-hkssatis-coklu-kunye/) | HKSSATIS | coklu-kunye | 20 | TRY | kunyeNo | HKS — 2 satır farklı KUNYENO |

### HKSIRSALIYE (1)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [hksirsaliye-sevk-baseline](valid/hksirsaliye/hksirsaliye-sevk-baseline/) | SEVK | baseline | — | — | — | Baseline — HKSIRSALIYE+SEVK (Hal Kayıt Sistemi irsaliyesi) |

### IDIS (8)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [idis-iade-baseline](valid/idis/idis-iade-baseline/) | IADE | baseline | 20 | TRY | sevkiyatNo, billingReference | Baseline — IDIS+IADE |
| [idis-ihrackayitli-baseline](valid/idis/idis-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | sevkiyatNo, gtip, alicidibkod | Baseline — IDIS+IHRACKAYITLI |
| [idis-ihrackayitli-ihrac-701](valid/idis/idis-ihrackayitli-ihrac-701/) | IHRACKAYITLI | ihrac-701 | 0 | TRY | sevkiyatNo, gtip | IDIS+IHRACKAYITLI kod 701 (DİİB dışı) |
| [idis-istisna-baseline](valid/idis/idis-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | sevkiyatNo | Baseline — IDIS+ISTISNA, kod 213 |
| [idis-satis-baseline](valid/idis/idis-satis-baseline/) | SATIS | baseline | 20 | TRY | sevkiyatNo | Baseline — IDIS+SATIS, SEVKIYATNO (SE-format) satıcı kimliğinde |
| [idis-satis-coklu-satir](valid/idis/idis-satis-coklu-satir/) | SATIS | coklu-satir | 20 | TRY | sevkiyatNo | IDIS+SATIS 3 satır (her satır ETIKETNO) |
| [idis-tevkifat-baseline](valid/idis/idis-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | sevkiyatNo | Baseline — IDIS+TEVKIFAT |
| [idis-tevkifatiade-baseline](valid/idis/idis-tevkifatiade-baseline/) | TEVKIFATIADE | baseline | 20 | TRY | sevkiyatNo | Baseline — IDIS+TEVKIFATIADE |

### IDISIRSALIYE (2)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [idisirsaliye-sevk-baseline](valid/idisirsaliye/idisirsaliye-sevk-baseline/) | SEVK | baseline | — | — | sevkiyatNo | Baseline — IDISIRSALIYE+SEVK (İç Dağıtım) |
| [idisirsaliye-sevk-coklu-satir](valid/idisirsaliye/idisirsaliye-sevk-coklu-satir/) | SEVK | coklu-satir | — | — | sevkiyatNo | IDISIRSALIYE+SEVK 3 satır farklı ETIKETNO |

### IHRACAT (3)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ihracat-istisna-baseline](valid/ihracat/ihracat-istisna-baseline/) | ISTISNA | baseline | 0 | USD | buyerCustomer, gtip, incoterms | Baseline — IHRACAT+ISTISNA, USD döviz + buyerCustomer + delivery(FOB+GTİP) |
| [ihracat-istisna-coklu-satir](valid/ihracat/ihracat-istisna-coklu-satir/) | ISTISNA | coklu-satir | 0 | USD | buyerCustomer, gtip, incoterms | IHRACAT+ISTISNA 2 satır (farklı GTİP, USD) |
| [ihracat-istisna-eur-doviz](valid/ihracat/ihracat-istisna-eur-doviz/) | ISTISNA | eur-doviz | 0 | EUR | buyerCustomer, gtip, incoterms | IHRACAT+ISTISNA EUR döviz + Avrupa alıcısı |

### ILAC_TIBBICIHAZ (8)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ilac_tibbicihaz-iade-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-iade-baseline/) | IADE | baseline | 10 | TRY | billingReference, ilac | Baseline — ILAC_TIBBICIHAZ+IADE |
| [ilac_tibbicihaz-ihrackayitli-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod, ilac | Baseline — ILAC_TIBBICIHAZ+IHRACKAYITLI |
| [ilac_tibbicihaz-istisna-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | tibbicihaz | Baseline — ILAC_TIBBICIHAZ+ISTISNA, TIBBICIHAZ + kod 213 |
| [ilac_tibbicihaz-satis-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-satis-baseline/) | SATIS | baseline | 10 | TRY | ilac | Baseline — ILAC_TIBBICIHAZ+SATIS, ILAC scheme ID |
| [ilac_tibbicihaz-satis-diger-scheme](valid/ilac_tibbicihaz/ilac_tibbicihaz-satis-diger-scheme/) | SATIS | diger-scheme | 20 | TRY | diger | ILAC_TIBBICIHAZ+SATIS DIGER schemeId (istisnai ürün) |
| [ilac_tibbicihaz-satis-tibbicihaz](valid/ilac_tibbicihaz/ilac_tibbicihaz-satis-tibbicihaz/) | SATIS | tibbicihaz | 10 | TRY | tibbicihaz | ILAC_TIBBICIHAZ+SATIS TIBBICIHAZ schemeId (ilaç yerine tıbbi cihaz) |
| [ilac_tibbicihaz-tevkifat-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-tevkifat-baseline/) | TEVKIFAT | baseline | 10 | TRY | ilac | Baseline — ILAC_TIBBICIHAZ+TEVKIFAT |
| [ilac_tibbicihaz-tevkifatiade-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-tevkifatiade-baseline/) | TEVKIFATIADE | baseline | 10 | TRY | ilac | Baseline — ILAC_TIBBICIHAZ+TEVKIFATIADE, kod 603 |

### KAMU (13)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [kamu-ihrackayitli-baseline](valid/kamu/kamu-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod, buyerCustomer, iban | Baseline — KAMU+IHRACKAYITLI, kod 702 + GTİP + ALICIDIBKOD |
| [kamu-istisna-baseline](valid/kamu/kamu-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | buyerCustomer, iban | Baseline — KAMU+ISTISNA, kod 213 |
| [kamu-istisna-istisna-kod-301](valid/kamu/kamu-istisna-istisna-kod-301/) | ISTISNA | istisna-kod-301 | 0 | TRY | buyerCustomer, iban | KAMU+ISTISNA kod 301 (Türkiye dışı ifa) |
| [kamu-komisyoncu-baseline](valid/kamu/kamu-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+KOMISYONCU |
| [kamu-konaklamavergisi-baseline](valid/kamu/kamu-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+KONAKLAMAVERGISI |
| [kamu-ozelmatrah-baseline](valid/kamu/kamu-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah, buyerCustomer, iban | Baseline — KAMU+OZELMATRAH, kod 801 |
| [kamu-satis-baseline](valid/kamu/kamu-satis-baseline/) | SATIS | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+SATIS, PaymentMeans + IBAN + aracı kurum |
| [kamu-satis-coklu-satir](valid/kamu/kamu-satis-coklu-satir/) | SATIS | coklu-satir | 20 | TRY | buyerCustomer, iban | KAMU+SATIS 3 satır farklı ürünler |
| [kamu-satis-usd-doviz](valid/kamu/kamu-satis-usd-doviz/) | SATIS | usd-doviz | 20 | USD | buyerCustomer, iban | KAMU+SATIS USD döviz (kurumsal ithal) |
| [kamu-sgk-baseline](valid/kamu/kamu-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk, buyerCustomer, iban | Baseline — KAMU+SGK, SAGLIK_HAS |
| [kamu-tevkifat-baseline](valid/kamu/kamu-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+TEVKIFAT, kod 603 |
| [kamu-tevkifat-tevkifat-620](valid/kamu/kamu-tevkifat-tevkifat-620/) | TEVKIFAT | tevkifat-620 | 20 | TRY | buyerCustomer, iban | KAMU+TEVKIFAT kod 620 %50 tekstil |
| [kamu-tevkifatiade-baseline](valid/kamu/kamu-tevkifatiade-baseline/) | TEVKIFATIADE | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+TEVKIFATIADE, kod 603 %70 (kamu iade+tevkifat) |

### OZELFATURA (1)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ozelfatura-istisna-baseline](valid/ozelfatura/ozelfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — OZELFATURA+ISTISNA (genel istisna profili) |

### TEMELFATURA (27)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [temelfatura-iade-baseline](valid/temelfatura/temelfatura-iade-baseline/) | IADE | baseline | 20 | TRY | billingReference | Baseline — TEMELFATURA+IADE, orijinal faturaya referans (BillingReference zorunlu) |
| [temelfatura-iade-coklu-kdv](valid/temelfatura/temelfatura-iade-coklu-kdv/) | IADE | coklu-kdv | 10,20 | TRY | — | IADE çoklu KDV (%10 + %20) — satır bazında farklı oran |
| [temelfatura-ihrackayitli-baseline](valid/temelfatura/temelfatura-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod | Baseline — TEMELFATURA+IHRACKAYITLI, kod 702 (DİİB) + GTİP 12 hane + ALICIDIBKOD 11 hane |
| [temelfatura-ihrackayitli-ihrac-701](valid/temelfatura/temelfatura-ihrackayitli-ihrac-701/) | IHRACKAYITLI | ihrac-701 | 0 | TRY | gtip, alicidibkod | IHRACKAYITLI — kod 701 (DİİB dışı) + GTİP, KDV=0 (701 kodu KDV 0 zorunlu) |
| [temelfatura-istisna-baseline](valid/temelfatura/temelfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — TEMELFATURA+ISTISNA, kod 213 (deniz/hava taşıtları için yapılan tadil) |
| [temelfatura-istisna-istisna-coklu-satir](valid/temelfatura/temelfatura-istisna-istisna-coklu-satir/) | ISTISNA | istisna-coklu-satir | 0 | TRY | — | ISTISNA — 3 satır, aynı exemption kod 213 (deniz/hava tadil) |
| [temelfatura-istisna-kod-201](valid/temelfatura/temelfatura-istisna-kod-201/) | ISTISNA | kod-201 | 0 | TRY | — | İstisna kodu 201 — diplomatik temsilci/konsolosluk |
| [temelfatura-istisna-kod-301](valid/temelfatura/temelfatura-istisna-kod-301/) | ISTISNA | kod-301 | 0 | TRY | — | İstisna kodu 301 — Türkiye dışında gerçekleşen ifa |
| [temelfatura-komisyoncu-baseline](valid/temelfatura/temelfatura-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | — | Baseline — TEMELFATURA+KOMISYONCU, komisyoncu satış |
| [temelfatura-konaklamavergisi-baseline](valid/temelfatura/temelfatura-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | accommodationTax | Baseline — TEMELFATURA+KONAKLAMAVERGISI, konaklama vergisi |
| [temelfatura-ozelmatrah-baseline](valid/temelfatura/temelfatura-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah | Baseline — TEMELFATURA+OZELMATRAH, kod 801 (kullanılmış binek otomobil KDV) |
| [temelfatura-satis-baseline](valid/temelfatura/temelfatura-satis-baseline/) | SATIS | baseline | 20 | TRY | — | Baseline — TEMELFATURA+SATIS, tek satır %20 KDV, TRY |
| [temelfatura-satis-coklu-kdv](valid/temelfatura/temelfatura-satis-coklu-kdv/) | SATIS | coklu-kdv | 0,10,20 | TRY | — | Çoklu satır — karışık KDV oranları (%0 kodsuz 351, %10, %20) |
| [temelfatura-satis-coklu-satir](valid/temelfatura/temelfatura-satis-coklu-satir/) | SATIS | coklu-satir | 20 | TRY | — | Çoklu satır — 3 satır aynı KDV %20 |
| [temelfatura-satis-document-indirim](valid/temelfatura/temelfatura-satis-document-indirim/) | SATIS | document-indirim | 20 | TRY | allowanceCharge | Belge seviyesi AllowanceCharge — %10 global indirim |
| [temelfatura-satis-eur-doviz](valid/temelfatura/temelfatura-satis-eur-doviz/) | SATIS | eur-doviz | 20 | EUR | — | Yabancı para birimi — EUR + ExchangeRate 35.5 |
| [temelfatura-satis-kdv-1](valid/temelfatura/temelfatura-satis-kdv-1/) | SATIS | kdv-1 | 1 | TRY | — | TEMELFATURA+SATIS %1 KDV (ekmek, süt gibi düşük kategori) |
| [temelfatura-satis-kdv-10](valid/temelfatura/temelfatura-satis-kdv-10/) | SATIS | kdv-10 | 10 | TRY | — | TEMELFATURA+SATIS %10 KDV (gıda / temel ihtiyaç kategorisi) |
| [temelfatura-satis-not-siparis](valid/temelfatura/temelfatura-satis-not-siparis/) | SATIS | not-siparis | 20 | TRY | orderReference, despatchReference | Fatura notları + OrderReference + DespatchReference referansları |
| [temelfatura-satis-usd-doviz](valid/temelfatura/temelfatura-satis-usd-doviz/) | SATIS | usd-doviz | 20 | USD | — | Yabancı para birimi — USD + ExchangeRate 32.1 |
| [temelfatura-sgk-baseline](valid/temelfatura/temelfatura-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk | Baseline — TEMELFATURA+SGK, SAGLIK_ECZ (eczane reçetesi) |
| [temelfatura-sgk-sgk-coklu-satir](valid/temelfatura/temelfatura-sgk-sgk-coklu-satir/) | SGK | sgk-coklu-satir | 10 | TRY | sgk | SGK — 2 satır (farklı medikal hizmet kodları) |
| [temelfatura-tevkifat-baseline](valid/temelfatura/temelfatura-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | — | Baseline — TEMELFATURA+TEVKIFAT, kod 603 (%70 bakım-onarım) |
| [temelfatura-tevkifat-dinamik-650](valid/temelfatura/temelfatura-tevkifat-dinamik-650/) | TEVKIFAT | dinamik-650 | 20 | TRY | — | TEVKIFAT + 650 dinamik kod, kullanıcı belirlediği %50 oran |
| [temelfatura-tevkifat-tam-tevkifat-801](valid/temelfatura/temelfatura-tevkifat-tam-tevkifat-801/) | TEVKIFAT | tam-tevkifat-801 | 20 | TRY | — | Tam tevkifat — kod 801 %100 (örn. yolcu taşıma, özel sektör→kamu) |
| [temelfatura-tevkifatiade-baseline](valid/temelfatura/temelfatura-tevkifatiade-baseline/) | TEVKIFATIADE | baseline | 20 | TRY | — | Baseline — TEMELFATURA+TEVKIFATIADE, kod 603 %70 (iade+tevkifat kombinasyonu) |
| [temelfatura-tevkifatiade-dinamik-650](valid/temelfatura/temelfatura-tevkifatiade-dinamik-650/) | TEVKIFATIADE | dinamik-650 | 20 | TRY | — | TEVKIFATIADE + 650 dinamik kod %50 — iade+tevkifat kombinasyonunda dinamik yüzde |

### TEMELIRSALIYE (4)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [temelirsaliye-matbudan-baseline](valid/temelirsaliye/temelirsaliye-matbudan-baseline/) | MATBUDAN | baseline | — | — | — | Baseline — TEMELIRSALIYE+MATBUDAN (kağıt belge referansı zorunlu) |
| [temelirsaliye-sevk-baseline](valid/temelirsaliye/temelirsaliye-sevk-baseline/) | SEVK | baseline | — | — | — | Baseline — TEMELIRSALIYE+SEVK, tek sürücü + PLAKA |
| [temelirsaliye-sevk-coklu-surucu](valid/temelirsaliye/temelirsaliye-sevk-coklu-surucu/) | SEVK | coklu-surucu | — | — | — | TEMELIRSALIYE+SEVK 2 sürücü + 2 plaka (çekici + dorse) |
| [temelirsaliye-sevk-dorse-plate](valid/temelirsaliye/temelirsaliye-sevk-dorse-plate/) | SEVK | dorse-plate | — | — | — | TEMELIRSALIYE+SEVK DORSE plaka varyantı |

### TICARIFATURA (14)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ticarifatura-ihrackayitli-baseline](valid/ticarifatura/ticarifatura-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod | Baseline — TICARIFATURA+IHRACKAYITLI, kod 702 + GTİP + ALICIDIBKOD |
| [ticarifatura-istisna-baseline](valid/ticarifatura/ticarifatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — TICARIFATURA+ISTISNA, kod 213 |
| [ticarifatura-istisna-istisna-kod-201](valid/ticarifatura/ticarifatura-istisna-istisna-kod-201/) | ISTISNA | istisna-kod-201 | 0 | TRY | — | TICARIFATURA+ISTISNA kod 201 (diplomatik temsilci) |
| [ticarifatura-komisyoncu-baseline](valid/ticarifatura/ticarifatura-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | — | Baseline — TICARIFATURA+KOMISYONCU |
| [ticarifatura-konaklamavergisi-baseline](valid/ticarifatura/ticarifatura-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | — | Baseline — TICARIFATURA+KONAKLAMAVERGISI |
| [ticarifatura-ozelmatrah-baseline](valid/ticarifatura/ticarifatura-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah | Baseline — TICARIFATURA+OZELMATRAH, kod 801 |
| [ticarifatura-ozelmatrah-ozelmatrah-805](valid/ticarifatura/ticarifatura-ozelmatrah-ozelmatrah-805/) | OZELMATRAH | ozelmatrah-805 | 0 | TRY | ozelMatrah | TICARIFATURA+OZELMATRAH kod 805 (ikinci el emtia) |
| [ticarifatura-satis-baseline](valid/ticarifatura/ticarifatura-satis-baseline/) | SATIS | baseline | 20 | TRY | — | Baseline — TICARIFATURA+SATIS, tek satır %20 |
| [ticarifatura-satis-kdv-10](valid/ticarifatura/ticarifatura-satis-kdv-10/) | SATIS | kdv-10 | 10 | TRY | — | TICARIFATURA+SATIS %10 KDV |
| [ticarifatura-satis-usd-doviz](valid/ticarifatura/ticarifatura-satis-usd-doviz/) | SATIS | usd-doviz | 20 | USD | — | TICARIFATURA+SATIS USD döviz + exchangeRate |
| [ticarifatura-sgk-baseline](valid/ticarifatura/ticarifatura-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk | Baseline — TICARIFATURA+SGK, SAGLIK_OPT (optik) |
| [ticarifatura-tevkifat-baseline](valid/ticarifatura/ticarifatura-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | — | Baseline — TICARIFATURA+TEVKIFAT, kod 620 (%50 tekstil) |
| [ticarifatura-tevkifat-tevkifat-603](valid/ticarifatura/ticarifatura-tevkifat-tevkifat-603/) | TEVKIFAT | tevkifat-603 | 20 | TRY | — | TICARIFATURA+TEVKIFAT kod 603 %70 (bakım-onarım) |
| [ticarifatura-tevkifatiade-baseline](valid/ticarifatura/ticarifatura-tevkifatiade-baseline/) | TEVKIFATIADE | baseline | 20 | TRY | — | Baseline — TICARIFATURA+TEVKIFATIADE, kod 620 %50 (tekstil iade+tevkifat) |

### YATIRIMTESVIK (10)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [yatirimtesvik-iade-baseline](valid/yatirimtesvik/yatirimtesvik-iade-baseline/) | IADE | baseline | 20 | TRY | ytbNo, billingReference | Baseline — YATIRIMTESVIK+IADE (IADE grubunda kdvPercent>0 serbest) |
| [yatirimtesvik-iade-coklu-iade](valid/yatirimtesvik/yatirimtesvik-iade-coklu-iade/) | IADE | coklu-iade | 20 | TRY | ytbNo | YATIRIMTESVIK+IADE 2 satır makine iadesi |
| [yatirimtesvik-istisna-phantom-308-makine](valid/yatirimtesvik/yatirimtesvik-istisna-phantom-308-makine/) | ISTISNA | phantom-308-makine | 20 | TRY | ytbNo, phantom-kdv | YATIRIMTESVIK+ISTISNA Phantom KDV — 308 + makine (M12) |
| [yatirimtesvik-istisna-phantom-339-insaat](valid/yatirimtesvik/yatirimtesvik-istisna-phantom-339-insaat/) | ISTISNA | phantom-339-insaat | 20 | TRY | ytbNo, phantom-kdv | YATIRIMTESVIK+ISTISNA Phantom KDV — 339 + inşaat (M12) |
| [yatirimtesvik-satis-baseline-makine](valid/yatirimtesvik/yatirimtesvik-satis-baseline-makine/) | SATIS | baseline-makine | 20 | TRY | ytbNo, makine | Baseline — YATIRIMTESVIK+SATIS, itemClassificationCode 01 makine |
| [yatirimtesvik-satis-coklu-satir](valid/yatirimtesvik/yatirimtesvik-satis-coklu-satir/) | SATIS | coklu-satir | 20 | TRY | ytbNo | YATIRIMTESVIK+SATIS 3 satır makine parçaları |
| [yatirimtesvik-satis-kod-04-gayrimaddi](valid/yatirimtesvik/yatirimtesvik-satis-kod-04-gayrimaddi/) | SATIS | kod-04-gayrimaddi | 20 | TRY | ytbNo | YATIRIMTESVIK+SATIS, harcama tipi 04 (gayrimaddi hak) |
| [yatirimtesvik-tevkifat-baseline](valid/yatirimtesvik/yatirimtesvik-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | ytbNo | Baseline — YATIRIMTESVIK+TEVKIFAT |
| [yatirimtesvik-tevkifat-dinamik-650](valid/yatirimtesvik/yatirimtesvik-tevkifat-dinamik-650/) | TEVKIFAT | dinamik-650 | 20 | TRY | ytbNo | YATIRIMTESVIK+TEVKIFAT 650 dinamik %40 |
| [yatirimtesvik-tevkifatiade-baseline](valid/yatirimtesvik/yatirimtesvik-tevkifatiade-baseline/) | TEVKIFATIADE | baseline | 20 | TRY | ytbNo | Baseline — YATIRIMTESVIK+TEVKIFATIADE, kod 603, ytbNo + kod 01 |

### YOLCUBERABERFATURA (2)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [yolcuberaberfatura-istisna-baseline](valid/yolcuberaberfatura/yolcuberaberfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | passport, nationalityId, taxRepresentative | Baseline — YOLCUBERABERFATURA+ISTISNA, passport + nationalityId + taxRepresentativeParty |
| [yolcuberaberfatura-istisna-yabanci-uk](valid/yolcuberaberfatura/yolcuberaberfatura-istisna-yabanci-uk/) | ISTISNA | yabanci-uk | 0 | TRY | passport, nationalityId, taxRepresentative | YOLCU — İngiliz turist (UK), farklı hediyelik ürün |

## Invalid Senaryolar (error code bazında)

### CROSS_MATRIX (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [cross-matrix-cross-matrix-ihracat-satis](invalid/cross-matrix/cross-matrix-cross-matrix-ihracat-satis/) | IHRACAT | SATIS | Yes | IHRACAT profili + SATIS tipi (sadece ISTISNA izinli) |

### EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [exemption-351-forbidden-for-nonzero-kdv-351-nonzero-kdv](invalid/exemption-351-forbidden-for-nonzero-kdv/exemption-351-forbidden-for-nonzero-kdv-351-nonzero-kdv/) | TEMELFATURA | SATIS | No | kdvExemptionCode=351 ama kdvPercent>0 |

### IHRACKAYITLI_702_REQUIRES_GTIP (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [ihrackayitli-702-requires-gtip-ihrackayitli-702-gtip-eksik](invalid/ihrackayitli-702-requires-gtip/ihrackayitli-702-requires-gtip-ihrackayitli-702-gtip-eksik/) | TEMELFATURA | IHRACKAYITLI | Yes | IHRACKAYITLI+702 satırında GTİP eksik (12 hane zorunlu) |

### INVALID_FORMAT (5)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [invalid-format-datetime-yanlis](invalid/invalid-format/invalid-format-datetime-yanlis/) | TEMELFATURA | SATIS | No | datetime ISO format değil |
| [invalid-format-invoice-id-pattern](invalid/invalid-format/invalid-format-invoice-id-pattern/) | TEMELFATURA | SATIS | No | Invoice ID pattern dışı (format 3 harf/rakam + 20XX + 9 rakam olmalı) |
| [invalid-format-satici-vkn-3hane](invalid/invalid-format/invalid-format-satici-vkn-3hane/) | TEMELFATURA | SATIS | No | Satıcı VKN 3 hane (10 veya 11 hane bekleniyor) |
| [invalid-format-uuid-hatali](invalid/invalid-format/invalid-format-uuid-hatali/) | TEMELFATURA | SATIS | No | UUID format hatalı |
| [invalid-format-ytbno-5-hane](invalid/invalid-format/invalid-format-ytbno-5-hane/) | YATIRIMTESVIK | SATIS | No | YATIRIMTESVIK ytbNo 6 hane değil (5 haneli) |

### INVALID_PROFILE (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [invalid-profile-profile-bilinmeyen](invalid/invalid-profile/invalid-profile-profile-bilinmeyen/) | ? | SATIS | No | profile whitelist dışında (BILINMEYEN) |

### INVALID_VALUE (3)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [invalid-value-currency-gecersiz](invalid/invalid-value/invalid-value-currency-gecersiz/) | TEMELFATURA | SATIS | Yes | currencyCode whitelist dışında ("XYZ") |
| [invalid-value-kdv-negatif](invalid/invalid-value/invalid-value-kdv-negatif/) | TEMELFATURA | SATIS | No | kdvPercent negatif (-5) |
| [invalid-value-quantity-sifir](invalid/invalid-value/invalid-value-quantity-sifir/) | TEMELFATURA | SATIS | No | quantity 0 |

### MISSING_FIELD (7)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [missing-field-alici-eksik-ad](invalid/missing-field/missing-field-alici-eksik-ad/) | TEMELFATURA | SATIS | No | Alıcı name boş |
| [missing-field-lines-bos](invalid/missing-field/missing-field-lines-bos/) | TEMELFATURA | SATIS | No | lines dizisi boş (en az 1 satır zorunlu) |
| [missing-field-multi-supplier-customer-bos](invalid/missing-field/missing-field-multi-supplier-customer-bos/) | TEMELFATURA | SATIS | Yes | Multi-error: supplier.vkn + customer.name birlikte boş |
| [missing-field-satici-vkn-bos](invalid/missing-field/missing-field-satici-vkn-bos/) | TEMELFATURA | SATIS | No | Satıcı VKN/TCKN boş |
| [missing-field-saticisehir-bos](invalid/missing-field/missing-field-saticisehir-bos/) | TEMELFATURA | SATIS | No | Satıcı city boş |
| [missing-field-supplier-taxoffice-bos](invalid/missing-field/missing-field-supplier-taxoffice-bos/) | IHRACAT | ISTISNA | No | IHRACAT profilinde supplier.taxOffice boş (profil için zorunlu) |
| [missing-field-uuid-bos](invalid/missing-field/missing-field-uuid-bos/) | TEMELFATURA | SATIS | No | UUID boş string |

### PROFILE_REQUIREMENT (9)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [profile-requirement-hks-kunyeno-eksik](invalid/profile-requirement/profile-requirement-hks-kunyeno-eksik/) | HKS | HKSSATIS | No | HKS satırında KUNYENO kimliği eksik |
| [profile-requirement-idis-sevkiyatno-eksik](invalid/profile-requirement/profile-requirement-idis-sevkiyatno-eksik/) | IDIS | SATIS | No | IDIS profilinde supplier SEVKIYATNO kimliği eksik |
| [profile-requirement-ihracat-buyercustomer-eksik](invalid/profile-requirement/profile-requirement-ihracat-buyercustomer-eksik/) | IHRACAT | ISTISNA | Yes | IHRACAT profilinde buyerCustomer eksik |
| [profile-requirement-ihracat-delivery-eksik](invalid/profile-requirement/profile-requirement-ihracat-delivery-eksik/) | IHRACAT | ISTISNA | No | IHRACAT satırında delivery (GTİP + INCOTERMS) eksik |
| [profile-requirement-kamu-buyervkn-eksik](invalid/profile-requirement/profile-requirement-kamu-buyervkn-eksik/) | KAMU | SATIS | No | KAMU profilinde buyerCustomer.taxNumber (VKN) eksik |
| [profile-requirement-kamu-paymentmeans-eksik](invalid/profile-requirement/profile-requirement-kamu-paymentmeans-eksik/) | KAMU | SATIS | Yes | KAMU profilinde paymentMeans eksik |
| [profile-requirement-multi-ihracat-iki-hata](invalid/profile-requirement/profile-requirement-multi-ihracat-iki-hata/) | IHRACAT | ISTISNA | Yes | Multi-error: IHRACAT buyerCustomer + supplier.taxOffice birlikte eksik |
| [profile-requirement-multi-kamu-iki-hata](invalid/profile-requirement/profile-requirement-multi-kamu-iki-hata/) | KAMU | SATIS | Yes | Multi-error: KAMU paymentMeans + buyerCustomer.vkn eksik |
| [profile-requirement-ytb-classcode-eksik](invalid/profile-requirement/profile-requirement-ytb-classcode-eksik/) | YATIRIMTESVIK | SATIS | No | YATIRIMTESVIK satırda itemClassificationCode eksik |

### REDUCED_KDV_RATE_NOT_ALLOWED (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [reduced-kdv-rate-not-allowed-555-gate-off](invalid/reduced-kdv-rate-not-allowed/reduced-kdv-rate-not-allowed-555-gate-off/) | TEMELFATURA | SATIS | No | 555 demirbaş KDV kodu + allowReducedKdvRate=false (default) |

### TYPE_REQUIREMENT (4)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [type-requirement-iade-billingreference-eksik](invalid/type-requirement/type-requirement-iade-billingreference-eksik/) | TEMELFATURA | IADE | No | TEMELFATURA+IADE billingReference eksik |
| [type-requirement-multi-iade-iki-hata](invalid/type-requirement/type-requirement-multi-iade-iki-hata/) | TEMELFATURA | IADE | Yes | Multi-error: IADE billingReference eksik + KDV 0 TaxExemptionReason eksik |
| [type-requirement-ozelmatrah-kod-eksik](invalid/type-requirement/type-requirement-ozelmatrah-kod-eksik/) | TEMELFATURA | OZELMATRAH | No | OZELMATRAH + taxExemptionReasonCode eksik (Bug #2 fix sonrası) |
| [type-requirement-tevkifat-withholding-eksik](invalid/type-requirement/type-requirement-tevkifat-withholding-eksik/) | TEMELFATURA | TEVKIFAT | No | TEVKIFAT tipinde withholdingTaxTotals eksik |

### TYPE_REQUIRES_SGK (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [type-requires-sgk-sgk-sgk-eksik](invalid/type-requires-sgk/type-requires-sgk-sgk-sgk-eksik/) | TEMELFATURA | SGK | No | TEMELFATURA+SGK tipi ama sgk objesi yok |

### UNKNOWN_EXEMPTION_CODE (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [unknown-exemption-code-kod-bilinmeyen-999](invalid/unknown-exemption-code/unknown-exemption-code-kod-bilinmeyen-999/) | TEMELFATURA | ISTISNA | No | İstisna kodu whitelist dışında (999) |

### YATIRIMTESVIK_REQUIRES_YTBNO (3)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [yatirimtesvik-requires-ytbno-earsiv-ytbsatis-ytbno-eksik](invalid/yatirimtesvik-requires-ytbno/yatirimtesvik-requires-ytbno-earsiv-ytbsatis-ytbno-eksik/) | EARSIVFATURA | YTBSATIS | No | EARSIV+YTBSATIS tipinde ytbNo eksik (Bug #3 EARSIV branch) |
| [yatirimtesvik-requires-ytbno-multi-ytb-iki-hata](invalid/yatirimtesvik-requires-ytbno/yatirimtesvik-requires-ytbno-multi-ytb-iki-hata/) | YATIRIMTESVIK | SATIS | Yes | Multi-error: YATIRIMTESVIK ytbNo eksik + ItemClassificationCode eksik |
| [yatirimtesvik-requires-ytbno-yatirimtesvik-ytbno-eksik](invalid/yatirimtesvik-requires-ytbno/yatirimtesvik-requires-ytbno-yatirimtesvik-ytbno-eksik/) | YATIRIMTESVIK | SATIS | No | YATIRIMTESVIK profilinde ytbNo eksik → YATIRIMTESVIK_REQUIRES_YTBNO |

### YTB_ISTISNA_EXEMPTION_CODE_MISMATCH (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [ytb-istisna-exemption-code-mismatch-phantom-kod-mismatch](invalid/ytb-istisna-exemption-code-mismatch/ytb-istisna-exemption-code-mismatch-phantom-kod-mismatch/) | YATIRIMTESVIK | ISTISNA | Yes | YATIRIMTESVIK+ISTISNA itemClassificationCode=01 ama kod 339 (308 beklenen) |

### YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [ytb-istisna-requires-nonzero-kdv-percent-phantom-kdv-yok](invalid/ytb-istisna-requires-nonzero-kdv-percent/ytb-istisna-requires-nonzero-kdv-percent-phantom-kdv-yok/) | YATIRIMTESVIK | ISTISNA | Yes | YATIRIMTESVIK+ISTISNA satırında kdvPercent=0 (phantom için >0 zorunlu) |

## Kapsam Dışı

Sprint 8e (dokunulmaz) + Sprint 8f (sadece bug fix için src/ dokunuldu):

- `src/**` — Sprint 8e boyunca tamamen dokunulmadı; 8f'te sadece Bug #1-3 fix'leri için minimal değişiklik (WITHHOLDING_ALLOWED_TYPES, validateOzelMatrah, YATIRIMTESVIK_REQUIRES_YTBNO). Yeni feature yok.
- `examples/**` — Mevcut 38 el-yazımı senaryo (dokunulmaz).
