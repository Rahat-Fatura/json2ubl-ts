# examples-matrix/

Sprint 8e (Publish Öncesi Kapsam Doğrulama) altında üretilen **script-assisted kapsam kataloğu**. Kütüphanenin desteklediği profil+tip kombinasyonları ve validator error code'ları için çalıştırılabilir example'lar.

> **Auto-generated** — `examples-matrix/_lib/meta-indexer.ts` tarafından tüm `meta.json` dosyalarından üretilir. Manuel düzenleme yapılmamalı; yerine `npx tsx examples-matrix/_lib/meta-indexer.ts --write` ile yeniden üretilir.

## Özet

- **Valid senaryo:** 72 (15 profil)
- **Invalid senaryo:** 23 (14 farklı error code)
- **Toplam:** 95

## Kullanım

```bash
# Senaryoları scaffold et (spec → klasör):
npx tsx examples-matrix/scaffold.ts

# Tüm senaryoları çalıştır:
npx tsx examples-matrix/run-all.ts

# Filtreleyerek gezin:
npx tsx examples-matrix/find.ts --profile=TEMELFATURA --type=IHRACKAYITLI
npx tsx examples-matrix/find.ts --error-code=MISSING_FIELD
```

## Valid Senaryolar (profil bazında)

### EARSIVFATURA (12)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [earsivfatura-iade-baseline](valid/earsivfatura/earsivfatura-iade-baseline/) | IADE | baseline | 20 | TRY | billingReference | Baseline — EARSIVFATURA+IADE, billingReference |
| [earsivfatura-ihrackayitli-baseline](valid/earsivfatura/earsivfatura-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod | Baseline — EARSIVFATURA+IHRACKAYITLI |
| [earsivfatura-istisna-baseline](valid/earsivfatura/earsivfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — EARSIVFATURA+ISTISNA, kod 213 |
| [earsivfatura-komisyoncu-baseline](valid/earsivfatura/earsivfatura-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+KOMISYONCU |
| [earsivfatura-konaklamavergisi-baseline](valid/earsivfatura/earsivfatura-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+KONAKLAMAVERGISI |
| [earsivfatura-ozelmatrah-baseline](valid/earsivfatura/earsivfatura-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah | Baseline — EARSIVFATURA+OZELMATRAH |
| [earsivfatura-satis-baseline](valid/earsivfatura/earsivfatura-satis-baseline/) | SATIS | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+SATIS |
| [earsivfatura-sgk-baseline](valid/earsivfatura/earsivfatura-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk | Baseline — EARSIVFATURA+SGK, MAL_HIZMET |
| [earsivfatura-tevkifat-baseline](valid/earsivfatura/earsivfatura-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | — | Baseline — EARSIVFATURA+TEVKIFAT |
| [earsivfatura-ytbistisna-phantom-308-makine](valid/earsivfatura/earsivfatura-ytbistisna-phantom-308-makine/) | YTBISTISNA | phantom-308-makine | 20 | TRY | ytbNo, phantom-kdv | EARSIVFATURA+YTBISTISNA — Phantom KDV (M12): kod 308 + itemClassificationCode 01 |
| [earsivfatura-ytbistisna-phantom-339-insaat](valid/earsivfatura/earsivfatura-ytbistisna-phantom-339-insaat/) | YTBISTISNA | phantom-339-insaat | 20 | TRY | ytbNo, phantom-kdv | EARSIVFATURA+YTBISTISNA — Phantom KDV: kod 339 + itemClassificationCode 02 inşaat |
| [earsivfatura-ytbsatis-baseline](valid/earsivfatura/earsivfatura-ytbsatis-baseline/) | YTBSATIS | baseline | 20 | TRY | ytbNo | Baseline — EARSIVFATURA+YTBSATIS, ytbNo + kod 01 makine |

### ENERJI (2)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [enerji-sarj-baseline](valid/enerji/enerji-sarj-baseline/) | SARJ | baseline | 20 | TRY | — | Baseline — ENERJI+SARJ, araç şarj hizmeti |
| [enerji-sarjanlik-baseline](valid/enerji/enerji-sarjanlik-baseline/) | SARJANLIK | baseline | 20 | TRY | — | Baseline — ENERJI+SARJANLIK, operatörden anlık satış |

### HKS (2)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [hks-hkskomisyoncu-baseline](valid/hks/hks-hkskomisyoncu-baseline/) | HKSKOMISYONCU | baseline | 10 | TRY | kunyeno | Baseline — HKS+HKSKOMISYONCU, komisyoncu satış |
| [hks-hkssatis-baseline](valid/hks/hks-hkssatis-baseline/) | HKSSATIS | baseline | 10 | TRY | kunyeno | Baseline — HKS+HKSSATIS, KUNYENO 19-char per line |

### HKSIRSALIYE (1)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [hksirsaliye-sevk-baseline](valid/hksirsaliye/hksirsaliye-sevk-baseline/) | SEVK | baseline | — | — | — | Baseline — HKSIRSALIYE+SEVK (Hal Kayıt Sistemi irsaliyesi) |

### IDIS (5)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [idis-iade-baseline](valid/idis/idis-iade-baseline/) | IADE | baseline | 20 | TRY | sevkiyatNo, billingReference | Baseline — IDIS+IADE |
| [idis-ihrackayitli-baseline](valid/idis/idis-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | sevkiyatNo, gtip, alicidibkod | Baseline — IDIS+IHRACKAYITLI |
| [idis-istisna-baseline](valid/idis/idis-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | sevkiyatNo | Baseline — IDIS+ISTISNA, kod 213 |
| [idis-satis-baseline](valid/idis/idis-satis-baseline/) | SATIS | baseline | 20 | TRY | sevkiyatNo | Baseline — IDIS+SATIS, SEVKIYATNO (SE-format) satıcı kimliğinde |
| [idis-tevkifat-baseline](valid/idis/idis-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | sevkiyatNo | Baseline — IDIS+TEVKIFAT |

### IDISIRSALIYE (1)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [idisirsaliye-sevk-baseline](valid/idisirsaliye/idisirsaliye-sevk-baseline/) | SEVK | baseline | — | — | sevkiyatNo | Baseline — IDISIRSALIYE+SEVK (İç Dağıtım) |

### IHRACAT (1)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ihracat-istisna-baseline](valid/ihracat/ihracat-istisna-baseline/) | ISTISNA | baseline | 0 | USD | buyerCustomer, gtip, incoterms | Baseline — IHRACAT+ISTISNA, USD döviz + buyerCustomer + delivery(FOB+GTİP) |

### ILAC_TIBBICIHAZ (5)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ilac_tibbicihaz-iade-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-iade-baseline/) | IADE | baseline | 10 | TRY | billingReference, ilac | Baseline — ILAC_TIBBICIHAZ+IADE |
| [ilac_tibbicihaz-ihrackayitli-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod, ilac | Baseline — ILAC_TIBBICIHAZ+IHRACKAYITLI |
| [ilac_tibbicihaz-istisna-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | tibbicihaz | Baseline — ILAC_TIBBICIHAZ+ISTISNA, TIBBICIHAZ + kod 213 |
| [ilac_tibbicihaz-satis-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-satis-baseline/) | SATIS | baseline | 10 | TRY | ilac | Baseline — ILAC_TIBBICIHAZ+SATIS, ILAC scheme ID |
| [ilac_tibbicihaz-tevkifat-baseline](valid/ilac_tibbicihaz/ilac_tibbicihaz-tevkifat-baseline/) | TEVKIFAT | baseline | 10 | TRY | ilac | Baseline — ILAC_TIBBICIHAZ+TEVKIFAT |

### KAMU (8)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [kamu-ihrackayitli-baseline](valid/kamu/kamu-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod, buyerCustomer, iban | Baseline — KAMU+IHRACKAYITLI, kod 702 + GTİP + ALICIDIBKOD |
| [kamu-istisna-baseline](valid/kamu/kamu-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | buyerCustomer, iban | Baseline — KAMU+ISTISNA, kod 213 |
| [kamu-komisyoncu-baseline](valid/kamu/kamu-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+KOMISYONCU |
| [kamu-konaklamavergisi-baseline](valid/kamu/kamu-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+KONAKLAMAVERGISI |
| [kamu-ozelmatrah-baseline](valid/kamu/kamu-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah, buyerCustomer, iban | Baseline — KAMU+OZELMATRAH, kod 801 |
| [kamu-satis-baseline](valid/kamu/kamu-satis-baseline/) | SATIS | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+SATIS, PaymentMeans + IBAN + aracı kurum |
| [kamu-sgk-baseline](valid/kamu/kamu-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk, buyerCustomer, iban | Baseline — KAMU+SGK, SAGLIK_HAS |
| [kamu-tevkifat-baseline](valid/kamu/kamu-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | buyerCustomer, iban | Baseline — KAMU+TEVKIFAT, kod 603 |

### OZELFATURA (1)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ozelfatura-istisna-baseline](valid/ozelfatura/ozelfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — OZELFATURA+ISTISNA (genel istisna profili) |

### TEMELFATURA (17)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [temelfatura-iade-baseline](valid/temelfatura/temelfatura-iade-baseline/) | IADE | baseline | 20 | TRY | billingReference | Baseline — TEMELFATURA+IADE, orijinal faturaya referans (BillingReference zorunlu) |
| [temelfatura-ihrackayitli-baseline](valid/temelfatura/temelfatura-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod | Baseline — TEMELFATURA+IHRACKAYITLI, kod 702 (DİİB) + GTİP 12 hane + ALICIDIBKOD 11 hane |
| [temelfatura-istisna-baseline](valid/temelfatura/temelfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — TEMELFATURA+ISTISNA, kod 213 (deniz/hava taşıtları için yapılan tadil) |
| [temelfatura-istisna-kod-201](valid/temelfatura/temelfatura-istisna-kod-201/) | ISTISNA | kod-201 | 0 | TRY | — | İstisna kodu 201 — diplomatik temsilci/konsolosluk |
| [temelfatura-istisna-kod-301](valid/temelfatura/temelfatura-istisna-kod-301/) | ISTISNA | kod-301 | 0 | TRY | — | İstisna kodu 301 — Türkiye dışında gerçekleşen ifa |
| [temelfatura-komisyoncu-baseline](valid/temelfatura/temelfatura-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | — | Baseline — TEMELFATURA+KOMISYONCU, komisyoncu satış |
| [temelfatura-konaklamavergisi-baseline](valid/temelfatura/temelfatura-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | accommodationTax | Baseline — TEMELFATURA+KONAKLAMAVERGISI, konaklama vergisi |
| [temelfatura-ozelmatrah-baseline](valid/temelfatura/temelfatura-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah | Baseline — TEMELFATURA+OZELMATRAH, kod 801 (kullanılmış binek otomobil KDV) |
| [temelfatura-satis-baseline](valid/temelfatura/temelfatura-satis-baseline/) | SATIS | baseline | 20 | TRY | — | Baseline — TEMELFATURA+SATIS, tek satır %20 KDV, TRY |
| [temelfatura-satis-coklu-kdv](valid/temelfatura/temelfatura-satis-coklu-kdv/) | SATIS | coklu-kdv | 0,10,20 | TRY | — | Çoklu satır — karışık KDV oranları (%0 kodsuz 351, %10, %20) |
| [temelfatura-satis-coklu-satir](valid/temelfatura/temelfatura-satis-coklu-satir/) | SATIS | coklu-satir | 20 | TRY | — | Çoklu satır — 3 satır aynı KDV %20 |
| [temelfatura-satis-eur-doviz](valid/temelfatura/temelfatura-satis-eur-doviz/) | SATIS | eur-doviz | 20 | EUR | — | Yabancı para birimi — EUR + ExchangeRate 35.5 |
| [temelfatura-satis-not-siparis](valid/temelfatura/temelfatura-satis-not-siparis/) | SATIS | not-siparis | 20 | TRY | orderReference, despatchReference | Fatura notları + OrderReference + DespatchReference referansları |
| [temelfatura-satis-usd-doviz](valid/temelfatura/temelfatura-satis-usd-doviz/) | SATIS | usd-doviz | 20 | USD | — | Yabancı para birimi — USD + ExchangeRate 32.1 |
| [temelfatura-sgk-baseline](valid/temelfatura/temelfatura-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk | Baseline — TEMELFATURA+SGK, SAGLIK_ECZ (eczane reçetesi) |
| [temelfatura-tevkifat-baseline](valid/temelfatura/temelfatura-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | — | Baseline — TEMELFATURA+TEVKIFAT, kod 603 (%70 bakım-onarım) |
| [temelfatura-tevkifat-dinamik-650](valid/temelfatura/temelfatura-tevkifat-dinamik-650/) | TEVKIFAT | dinamik-650 | 20 | TRY | — | TEVKIFAT + 650 dinamik kod, kullanıcı belirlediği %50 oran |

### TEMELIRSALIYE (3)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [temelirsaliye-matbudan-baseline](valid/temelirsaliye/temelirsaliye-matbudan-baseline/) | MATBUDAN | baseline | — | — | — | Baseline — TEMELIRSALIYE+MATBUDAN (kağıt belge referansı zorunlu) |
| [temelirsaliye-sevk-baseline](valid/temelirsaliye/temelirsaliye-sevk-baseline/) | SEVK | baseline | — | — | — | Baseline — TEMELIRSALIYE+SEVK, tek sürücü + PLAKA |
| [temelirsaliye-sevk-dorse-plate](valid/temelirsaliye/temelirsaliye-sevk-dorse-plate/) | SEVK | dorse-plate | — | — | — | TEMELIRSALIYE+SEVK DORSE plaka varyantı |

### TICARIFATURA (8)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [ticarifatura-ihrackayitli-baseline](valid/ticarifatura/ticarifatura-ihrackayitli-baseline/) | IHRACKAYITLI | baseline | 0 | TRY | gtip, alicidibkod | Baseline — TICARIFATURA+IHRACKAYITLI, kod 702 + GTİP + ALICIDIBKOD |
| [ticarifatura-istisna-baseline](valid/ticarifatura/ticarifatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | — | Baseline — TICARIFATURA+ISTISNA, kod 213 |
| [ticarifatura-komisyoncu-baseline](valid/ticarifatura/ticarifatura-komisyoncu-baseline/) | KOMISYONCU | baseline | 20 | TRY | — | Baseline — TICARIFATURA+KOMISYONCU |
| [ticarifatura-konaklamavergisi-baseline](valid/ticarifatura/ticarifatura-konaklamavergisi-baseline/) | KONAKLAMAVERGISI | baseline | 20 | TRY | — | Baseline — TICARIFATURA+KONAKLAMAVERGISI |
| [ticarifatura-ozelmatrah-baseline](valid/ticarifatura/ticarifatura-ozelmatrah-baseline/) | OZELMATRAH | baseline | 0 | TRY | ozelMatrah | Baseline — TICARIFATURA+OZELMATRAH, kod 801 |
| [ticarifatura-satis-baseline](valid/ticarifatura/ticarifatura-satis-baseline/) | SATIS | baseline | 20 | TRY | — | Baseline — TICARIFATURA+SATIS, tek satır %20 |
| [ticarifatura-sgk-baseline](valid/ticarifatura/ticarifatura-sgk-baseline/) | SGK | baseline | 20 | TRY | sgk | Baseline — TICARIFATURA+SGK, SAGLIK_OPT (optik) |
| [ticarifatura-tevkifat-baseline](valid/ticarifatura/ticarifatura-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | — | Baseline — TICARIFATURA+TEVKIFAT, kod 620 (%50 tekstil) |

### YATIRIMTESVIK (5)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [yatirimtesvik-iade-baseline](valid/yatirimtesvik/yatirimtesvik-iade-baseline/) | IADE | baseline | 20 | TRY | ytbNo, billingReference | Baseline — YATIRIMTESVIK+IADE (IADE grubunda kdvPercent>0 serbest) |
| [yatirimtesvik-istisna-phantom-308-makine](valid/yatirimtesvik/yatirimtesvik-istisna-phantom-308-makine/) | ISTISNA | phantom-308-makine | 20 | TRY | ytbNo, phantom-kdv | YATIRIMTESVIK+ISTISNA Phantom KDV — 308 + makine (M12) |
| [yatirimtesvik-istisna-phantom-339-insaat](valid/yatirimtesvik/yatirimtesvik-istisna-phantom-339-insaat/) | ISTISNA | phantom-339-insaat | 20 | TRY | ytbNo, phantom-kdv | YATIRIMTESVIK+ISTISNA Phantom KDV — 339 + inşaat (M12) |
| [yatirimtesvik-satis-baseline-makine](valid/yatirimtesvik/yatirimtesvik-satis-baseline-makine/) | SATIS | baseline-makine | 20 | TRY | ytbNo, makine | Baseline — YATIRIMTESVIK+SATIS, itemClassificationCode 01 makine |
| [yatirimtesvik-tevkifat-baseline](valid/yatirimtesvik/yatirimtesvik-tevkifat-baseline/) | TEVKIFAT | baseline | 20 | TRY | ytbNo | Baseline — YATIRIMTESVIK+TEVKIFAT |

### YOLCUBERABERFATURA (1)

| ID | Tip | Slug | KDV | Döviz | Özellikler | Notlar |
|---|---|---|---|---|---|---|
| [yolcuberaberfatura-istisna-baseline](valid/yolcuberaberfatura/yolcuberaberfatura-istisna-baseline/) | ISTISNA | baseline | 0 | TRY | passport, nationalityId, taxRepresentative | Baseline — YOLCUBERABERFATURA+ISTISNA, passport + nationalityId + taxRepresentativeParty |

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

### INVALID_FORMAT (3)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [invalid-format-datetime-yanlis](invalid/invalid-format/invalid-format-datetime-yanlis/) | TEMELFATURA | SATIS | No | datetime ISO format değil |
| [invalid-format-satici-vkn-3hane](invalid/invalid-format/invalid-format-satici-vkn-3hane/) | TEMELFATURA | SATIS | No | Satıcı VKN 3 hane (10 veya 11 hane bekleniyor) |
| [invalid-format-uuid-hatali](invalid/invalid-format/invalid-format-uuid-hatali/) | TEMELFATURA | SATIS | No | UUID format hatalı |

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

### MISSING_FIELD (4)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [missing-field-alici-eksik-ad](invalid/missing-field/missing-field-alici-eksik-ad/) | TEMELFATURA | SATIS | No | Alıcı name boş |
| [missing-field-lines-bos](invalid/missing-field/missing-field-lines-bos/) | TEMELFATURA | SATIS | No | lines dizisi boş (en az 1 satır zorunlu) |
| [missing-field-satici-vkn-bos](invalid/missing-field/missing-field-satici-vkn-bos/) | TEMELFATURA | SATIS | No | Satıcı VKN/TCKN boş |
| [missing-field-saticisehir-bos](invalid/missing-field/missing-field-saticisehir-bos/) | TEMELFATURA | SATIS | No | Satıcı city boş |

### PROFILE_REQUIREMENT (3)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [profile-requirement-ihracat-buyercustomer-eksik](invalid/profile-requirement/profile-requirement-ihracat-buyercustomer-eksik/) | IHRACAT | ISTISNA | Yes | IHRACAT profilinde buyerCustomer eksik |
| [profile-requirement-kamu-paymentmeans-eksik](invalid/profile-requirement/profile-requirement-kamu-paymentmeans-eksik/) | KAMU | SATIS | Yes | KAMU profilinde paymentMeans eksik |
| [profile-requirement-yatirimtesvik-ytbno-eksik](invalid/profile-requirement/profile-requirement-yatirimtesvik-ytbno-eksik/) | YATIRIMTESVIK | SATIS | No | YATIRIMTESVIK profilinde ytbNo eksik → ContractDocumentReference hatası |

### REDUCED_KDV_RATE_NOT_ALLOWED (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [reduced-kdv-rate-not-allowed-555-gate-off](invalid/reduced-kdv-rate-not-allowed/reduced-kdv-rate-not-allowed-555-gate-off/) | TEMELFATURA | SATIS | No | 555 demirbaş KDV kodu + allowReducedKdvRate=false (default) |

### TYPE_REQUIREMENT (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [type-requirement-iade-billingreference-eksik](invalid/type-requirement/type-requirement-iade-billingreference-eksik/) | TEMELFATURA | IADE | No | TEMELFATURA+IADE billingReference eksik |

### TYPE_REQUIRES_SGK (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [type-requires-sgk-sgk-sgk-eksik](invalid/type-requires-sgk/type-requires-sgk-sgk-sgk-eksik/) | TEMELFATURA | SGK | No | TEMELFATURA+SGK tipi ama sgk objesi yok |

### UNKNOWN_EXEMPTION_CODE (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [unknown-exemption-code-kod-bilinmeyen-999](invalid/unknown-exemption-code/unknown-exemption-code-kod-bilinmeyen-999/) | TEMELFATURA | ISTISNA | No | İstisna kodu whitelist dışında (999) |

### YTB_ISTISNA_EXEMPTION_CODE_MISMATCH (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [ytb-istisna-exemption-code-mismatch-phantom-kod-mismatch](invalid/ytb-istisna-exemption-code-mismatch/ytb-istisna-exemption-code-mismatch-phantom-kod-mismatch/) | YATIRIMTESVIK | ISTISNA | Yes | YATIRIMTESVIK+ISTISNA itemClassificationCode=01 ama kod 339 (308 beklenen) |

### YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT (1)

| ID | Profil bağlamı | Tip bağlamı | Multi-error | Açıklama |
|---|---|---|---|---|
| [ytb-istisna-requires-nonzero-kdv-percent-phantom-kdv-yok](invalid/ytb-istisna-requires-nonzero-kdv-percent/ytb-istisna-requires-nonzero-kdv-percent-phantom-kdv-yok/) | YATIRIMTESVIK | ISTISNA | Yes | YATIRIMTESVIK+ISTISNA satırında kdvPercent=0 (phantom için >0 zorunlu) |

## Kapsam Dışı

Sprint 8e boyunca aşağıdaki dizinler **dokunulmaz**:

- `src/**` — Kütüphane kodu. Bulunan bug'lar yalnızca `audit/sprint-08e-implementation-log.md` → "Bulunan Buglar" section'ına loglanır; düzeltme Sprint 8f'te yapılır.
- `examples/**` — Mevcut 38 el-yazımı senaryo.
