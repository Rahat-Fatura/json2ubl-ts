---
denetim: 02 - Kod Listeleri (Content Listeleri)
tarih: 2026-04-21
skill_versiyon: gib-teknik-dokuman @ 91044bb (Codelist.xml + v1.42 + Common_Schematron)
kutuphane_versiyon: json2ubl-ts v1.4.2 (uncommitted working tree dahil; son commit 8e3fd27)
kapsam: 10 kod listesi — TaxExemptionReasonCode, TaxTypeCode (normal+tevkifat), UnitCode, PackagingTypeCode, INCOTERMS, PartyIdentification, AdditionalItemIdentification, IhracKayitli/YatirimTesvik özel şemaları, dış listeler (Currency/Country/Payment/Response/Channel), runtime validator'lar
---

# Denetim 02 — Kod Listeleri (Content / ROLE Bazlı)

> Bu rapor **yalnızca bulgu**. Düzeltme veya öncelik sıralaması yok.

## 0. Normatif Kaynak Referansları

| Kısa ad | Dosya | Kullanım |
|---|---|---|
| **Codelist** | `schematrons/UBL-TR_Codelist.xml` (skill, 70 satır) | Tüm regex whitelist'leri (`sch:let`) |
| **CommonSchematron** | `schematrons/UBL-TR_Common_Schematron.xml` (skill, 771 satır) | Çapraz kurallar (satır 306-322 TaxExemption, 308 WithholdingPercent, 497-499 555/DemirbasKDV) |
| **KodListeleri v1.42** | `references/kod-listeleri-ubl-tr-v1.42.md` (skill, 857 satır, Mart 2026) | Resmi kod özeti (PDF'ten türetilmiş özet) |
| **tax-config** | `src/calculator/tax-config.ts` (kütüphane) | 26 TaxDefinition (normal vergi) |
| **withholding-config** | `src/calculator/withholding-config.ts` (kütüphane) | 52 WithholdingTaxDefinition (6xx+8xx) |
| **exemption-config** | `src/calculator/exemption-config.ts` (kütüphane) | 79 ExemptionDefinition (KDV+SGK) |
| **unit-config** | `src/calculator/unit-config.ts` (kütüphane) | 76 UnitDefinition |
| **currency-config** | `src/calculator/currency-config.ts` (kütüphane) | 30 CurrencyDefinition |
| **constants.ts** | `src/config/constants.ts` (kütüphane) | 10 kod listesi Set'i |

---

## 1. TaxExemptionReasonCode — Tam Uyum Tablosu

### 1.0 Kaynak Eşleme

Kütüphane tarafında 3 runtime whitelist (validator'da kullanılıyor):
- `ISTISNA_TAX_EXEMPTION_REASON_CODES` — `constants.ts:186-200` (109 kod: 001, 101-108, 201-250 tüm ardışık, 301-344, 350, 501)
- `OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES` — `constants.ts:203-205` (12 kod: 801-812)
- `IHRAC_EXEMPTION_REASON_CODES` — `constants.ts:208-210` (4 kod: 701-704)

Ayrıca `exemption-config.ts` içinde 79 `ExemptionDefinition` (data — UI listesi için). `isValidExemptionCode()` export edilmiş ama **hiçbir validator'da çağrılmıyor** (→ §10.3).

Codelist regex'leri (satır 21-27):
- `TaxExemptionReasonCodeType` — ana set (≈126 kod)
- `istisnaTaxExemptionReasonCodeType` — satır 23 (ISTISNA tipine özel, 103 kod)
- `ozelMatrahTaxExemptionReasonCodeType` — satır 25 (801-812, 12 kod)
- `ihracExemptionReasonCodeType` — satır 27 (701-704, 4 kod)

Schematron kontrolü — `TaxExemptionReasonCodeCheck` (satır 311-323):
- Genel: kod `TaxExemptionReasonCodeType` içinde olmalı (satır 314)
- ISTISNA kuralı: kod `istisnaTaxExemptionReasonCodeType`'a düşüyorsa fatura tipi ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE olmalı **— 555 hariç** (satır 316)
- OZELMATRAH kuralı: satır 318 (OZELMATRAH/IADE/SGK)
- IHRACKAYITLI kuralı: satır 320 (IHRACKAYITLI/IADE/SGK)
- 702 + kalem kimlik: satır 322 (GTİP + ALICIDIBSATIRKOD zorunlu)

### 1.1 Kısmi İstisna (201-250)

| Kod | v1.42'de | Codelist'te | Kütüphanede (ISTISNA_TAX_EXEMPTION_REASON_CODES) | exemption-config.ts'de | Durum |
|---|---|---|---|---|---|
| 201-202 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **203** | ✗ | ✗ | ✓ (yanlış kabul) | ✗ | **KÜTÜPHANE YANLIŞ** |
| 204-209 | ✓ | ✓ | ✓ | ✓ (204-209 var) | uyumlu |
| **210** | ✗ | ✗ | ✓ (yanlış kabul) | ✗ | **KÜTÜPHANE YANLIŞ** |
| 211-217 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 218 | ✗ v1.42'de açık "KDV 17/4-o" listede | ✓ | ✓ | ✗ (exemption-config'de yok) | uyumlu (Codelist) |
| 219-221 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **222** | ✗ | ✗ | ✓ (yanlış kabul) | ✗ | **KÜTÜPHANE YANLIŞ** |
| 223 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **224** | ✗ | ✗ | ✓ (yanlış kabul) | ✗ | **KÜTÜPHANE YANLIŞ** |
| 225-232 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **233** | ✗ | ✗ | ✓ (yanlış kabul) | ✗ | **KÜTÜPHANE YANLIŞ** |
| 234-242 | ✓ | ✓ | ✓ | ✓ (240'a kadar) | uyumlu |
| **243-249** | ✗ | ✗ | ✓ (7 kod yanlış kabul) | ✗ | **KÜTÜPHANE YANLIŞ** |
| 250 | ✓ | ✓ | ✓ | ✗ (exemption-config'de yok) | uyumlu |

**Not — v1.42 §4.8.1:** "203, 210, 222, 224, 233, 243-249 kodları PDF'te yok; bilinçli boşluk kabul edildi." Yani bu 10 kod v1.42'de **sıra atlanan boşluk**, `TaxExemptionReasonCodeType` regex'inde de bulunmuyor. Kütüphane `201-250` aralığını tam olarak kabul ediyor → **10 fazla kod**. Schematron reddeder.

### 1.2 Tam İstisna (301-351)

| Kod | v1.42'de | Codelist'te | Kütüphanede (constants.ts) | exemption-config.ts'de | Durum |
|---|---|---|---|---|---|
| 301-325 | ✓ | ✓ | ✓ (tümü) | ✓ (tümü) | uyumlu |
| **326-331** | ✓ (326,327,328,329,330,331) | ✓ (tümü) | ✓ (tümü) | ✗ (6 kod eksik) | **exemption-config eksik** |
| 332 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **333-334** | ✓ | ✓ | ✓ | ✗ (2 kod eksik) | **exemption-config eksik** |
| 335 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **336-338** | ✓ | ✓ | ✓ | ✗ (3 kod eksik) | **exemption-config eksik** |
| 339 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **340-344** | ✓ | ✓ | ✓ | ✗ (5 kod eksik) | **exemption-config eksik** |
| 350 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **351** | ✓ (§4.8.2 "İstisna Olmayan Diğer", KDV 0) | ✓ (sadece TaxExemptionReasonCodeType, istisnaTaxExemptionReasonCodeType değil) | **✗** (yok) | ✓ (documentType: `SATIS`) | **KÜTÜPHANE YANLIŞ** |

**Ek gözlem:** `ISTISNA_TAX_EXEMPTION_REASON_CODES` (validator'ın kullandığı set) 351 içermiyor → kullanıcı 351 girerse validator reddeder. Oysa Codelist regex'te 351 ana listedeyse (`TaxExemptionReasonCodeType`) `istisnaTaxExemptionReasonCodeType`'a dahil değil → Schematron, 351 kodlu SATIS tipinde kabul eder ama ISTISNA tipinde reddeder. Kütüphane tarafı hiç kabul etmiyor.

### 1.3 Diğer İşlem Türü (555) — v1.42 Mart 2026 yenisi

| Kod | v1.42'de | Codelist'te | Kütüphanede | Durum |
|---|---|---|---|---|
| **555** | ✓ (§4.8.3, v1.42 ile eklendi) | ✓ (satır 21) | **✗** (hiçbir yerde yok — ne ISTISNA, ne OZEL_MATRAH, ne IHRAC set'inde) | **KÜTÜPHANE YANLIŞ** |

**Schematron bağlamı (satır 497-499):** 555 kodu `TEMELFATURA/TICARIFATURA/EARSIVFATURA` profillerinde **ISTISNA/IHRACKAYITLI olmayan** tiplerde (SATIS, TEVKIFAT, vb.) + KDV 0 olmayan durumda kabul. Kütüphane 555'i hiçbir whitelist'e koymadığı için **validator 555'i reddeder**, ama bu kod kullanım senaryosu Mart 2026 sonrası üretimde gerekli (faaliyet koduna uygun KDV oranı bulunmayan satışlar — mükellefin aktifine kayıtlı demirbaş satışı gibi).

### 1.4 Özel Matrah (801-812)

| Kod | v1.42'de | Codelist'te | Kütüphanede (OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES) | exemption-config.ts'de | Durum |
|---|---|---|---|---|---|
| 801-812 | ✓ (hepsi) | ✓ (hepsi) | ✓ (hepsi) | ✓ (hepsi — documentType: `OZELMATRAH`) | uyumlu |

### 1.5 İhraç Kayıtlı (701-704)

| Kod | v1.42'de | Codelist'te | Kütüphanede (IHRAC_EXEMPTION_REASON_CODES) | exemption-config.ts'de | Durum |
|---|---|---|---|---|---|
| 701-703 | ✓ | ✓ | ✓ | ✓ (documentType: `IHRACKAYITLI`) | uyumlu |
| **704** | ✓ (v1.42 §4.8.7 — "KDV 11/1-c + ÖTV 8/2 birlikte") | ✓ (Codelist'te var) | ✓ (constants'ta var) | **✗** (exemption-config'de yok) | **exemption-config eksik** |

### 1.6 ÖTV İstisna (101-108, 151)

| Kod | v1.42'de | Codelist'te | Kütüphanede | Durum |
|---|---|---|---|---|
| 101-108 | ✓ (§4.8.4) | ✓ (TaxExemptionReasonCodeType + istisnaTaxExemptionReasonCodeType) | ✓ (ISTISNA_TAX_EXEMPTION_REASON_CODES) | uyumlu |
| **151** | ✓ (§4.8.4 "ÖTV İstisna Olmayan Diğer", 0 ÖTV fatura) | ✓ (sadece TaxExemptionReasonCodeType, istisnaTaxExemptionReasonCodeType'da YOK) | **✗** (hiçbir set'te yok) | **KÜTÜPHANE YANLIŞ** |

**Not:** 151 kodu 351'le aynı rol (istisna olmayan ama sıfır ÖTV/KDV fatura). Kütüphane her iki kodu da whitelisting yapamaz durumda.

### 1.7 Konaklama Vergisi İstisna (001)

| Kod | v1.42'de | Codelist'te | Kütüphanede | Durum |
|---|---|---|---|---|
| 001 | ✓ (§4.8.5, "Diplomatik İstisna") | ✓ | ✓ (ISTISNA_TAX_EXEMPTION_REASON_CODES ilk elemanı) | uyumlu |

### 1.8 İstisna Toplam Bulgu

| # | Kod grubu | Tip | Etki |
|---|---|---|---|
| 1 | 203, 210, 222, 224, 233, 243-249 (10 kod) | Yanlış kabul | Validator geçer ama Schematron reddeder |
| 2 | 151, 351, 555 (3 kod) | Yanlış ret | Kullanıcı v1.42 üretimi yapamaz |
| 3 | 326-331, 333-334, 336-338, 340-344, 704 (17 kod) | `exemption-config.ts` data eksik | Consumer UI listesinde eksik (constants.ts'deki validator geçiyor) |

---

## 2. TaxTypeCode — Normal Vergi Kodları

### 2.1 Karşılaştırma

Codelist `TaxType` (satır 15): 31 kod — `0003, 0015, 0061, 0071, 0073, 0074, 0075, 0076, 0077, 1047, 1048, 4080, 4081, 9015, 9021, 9077, 8001, 8002, 8004, 8005, 8006, 8007, 8008, 9040, 0011, 4071, 4171, 0021, 0022, 9944, 0059`

v1.42 §4.9.1: 29 kod. Aradaki fark:
- Codelist'te VAR, v1.42'de YOK: `9015`, `0059`
- v1.42'de VAR, Codelist'te YOK: yok (Codelist v1.42'yi kapsar)

Kütüphane `TAX_TYPE_CODES` (constants.ts:112-117, validator'da kullanılıyor): 31 kod → **Codelist ile birebir** ✓

Kütüphane `TAX_DEFINITIONS` (tax-config.ts, `isValidTaxCode()` için): KDV_TAX_CODE '0015' ayrı + 26 tanım → toplam 27 kod.

| Kod | v1.42'de | Codelist'te | constants.ts (TAX_TYPE_CODES)'de | tax-config.ts (TAX_DEFINITIONS)'de | Durum |
|---|---|---|---|---|---|
| 0003 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 0011 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 0015 | ✓ | ✓ | ✓ | ✓ (KDV_TAX_CODE) | uyumlu |
| **0021** | ✓ (BMV) | ✓ | ✓ | **✗** | **tax-config eksik** |
| **0022** | ✓ (SMV) | ✓ | ✓ | **✗** | **tax-config eksik** |
| 0059 | ✗ (v1.42'de yok) | ✓ | ✓ | ✓ | uyumlu (Codelist) |
| 0061-0077 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 1047-1048 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 4071 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 4080-4081 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **4171** | ✓ (ÖTV Tevkifat) | ✓ | ✓ | **✗** | **tax-config eksik** |
| 8001-8008 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **9015** | ✗ (v1.42'de yok) | ✓ | ✓ | **✗** | çift eksik — Codelist kabul ediyor, v1.42 ve tax-config etmiyor |
| 9021 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 9040 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| 9077 | ✓ | ✓ | ✓ | ✓ | uyumlu |
| **9944** | ✓ (Belediye Hal Rüsumu) | ✓ | ✓ | **✗** | **tax-config eksik** |

**Sonuç:**
- `constants.ts.TAX_TYPE_CODES` ↔ Codelist: **tam uyumlu** (31↔31).
- `tax-config.ts.TAX_DEFINITIONS` ↔ Codelist: `0021, 0022, 4171, 9015, 9944` **eksik** (5 kod).
- İki kütüphane iç source'u **birbiriyle tutarsız**. `isValidTaxCode('0021')` → **false** döner, ama Schematron geçerli sayar.

---

## 3. Tevkifat TaxTypeCode (WithholdingTaxTotal altı)

### 3.1 6xx + 8xx Ana Listesi

Codelist `WithholdingTaxType` (satır 16): 52 kod (601-627 + 801-825).
v1.42 §4.9.2: 52 kod (601-627 + 801-825).
Kütüphane `WITHHOLDING_TAX_TYPE_CODES` (constants.ts:120-127): 52 kod.
Kütüphane `WITHHOLDING_TAX_DEFINITIONS` (withholding-config.ts:15-68): 52 tanım.

| Kod aralığı | v1.42'de | Codelist'te | constants.ts'de | withholding-config.ts'de | Durum |
|---|---|---|---|---|---|
| 601-627 (27 kod) | ✓ (oranlarla) | ✓ | ✓ | ✓ (oranlarla) | uyumlu |
| 801-825 (25 kod) | ✓ (10/10) | ✓ | ✓ | ✓ (%100) | uyumlu |
| **650** | ✗ (v1.42 ana tablosunda yok) | ✓ (WithholdingTaxType'da YOK, ama WithholdingTaxTypeWithPercent'te `65020, 65030, 65050, 65070, 65090` var → alt-kombinasyon destek) | **✗** (hiçbir yerde) | **✗** | **KÜTÜPHANE ↔ Codelist tutarsız** |

**650 bulgusu:** Codelist ana `WithholdingTaxType` regex'inde 650 yok, ama `WithholdingTaxTypeWithPercent` regex'inde 650+oran kombinasyonları (5 adet) **var**. Yani Schematron satır 306 (`WithholdingTaxType` kontrolü) 650'yi reddeder, ama satır 308 (`WithholdingTaxTypeWithPercent`) 650'yi 20/30/50/70/90 oranlarla geçerli kabul eder. **Codelist'in kendi içinde çelişki.** Kütüphane bu belirsiz durumda 650'yi hiç desteklemiyor — normalde `WithholdingTaxType` ana listesine dahil olmalı.

### 3.2 WithholdingTaxTypeWithPercent — Kod+Oran Kombinasyonları

**Schematron kritik kuralı (satır 308):** `contains($WithholdingTaxTypeWithPercent, concat(',', TaxTypeCode, Percent, ','))` — XML'deki her tevkifat altkalemi bu regex'te olmalı.

Codelist `WithholdingTaxTypeWithPercent` (satır 17): 65 kombinasyon — `60130, 60140, 60290, 60350, 60370, 60450, 60550, 60690, 60790, 60890, 60950, 60970, 61090, 61190, 61270, 61290, 61370, 61390, 61450, 61550, 61570, 61650, 61770, 61870, 61970, 62070, 62190, 62290, 62350, 62420, 62530, 62620, 65090, 65050, 65070, 65020, 65030, 62740, 62750, 801100-825100 (25 adet)`

Kütüphane `WITHHOLDING_TAX_TYPE_WITH_PERCENT` (constants.ts:130-183): **~110 kombinasyon** — `60120, 60130, 60140, 60150, 60160, 60170, 60190` ile başlıyor, her 6xx kod için `50/70/90` üçlüsünü default olarak ekliyor.

**Karşılaştırma (yalnızca ilk 10 kod üzerinden):**

| TaxTypeCode | v1.42'deki oran | Codelist'teki oranlar | Kütüphanedeki oranlar | Fark |
|---|---|---|---|---|
| 601 | 40 | 30, 40 (2) | 20, 30, 40, 50, 60, 70, 90 (7) | **+5 yanlış kombinasyon: 60120, 60150, 60160, 60170, 60190** |
| 602 | 90 | 90 (1) | 30, 50, 90 (3) | **+2 yanlış: 60230, 60250** |
| 603 | 70 | 50, 70 (2) | 50, 70, 90 (3) | **+1 yanlış: 60390** |
| 604 | 50 | 50 (1) | 50, 70, 90 (3) | **+2 yanlış: 60470, 60490** |
| 605 | 50 | 50 (1) | 50, 70, 90 (3) | **+2 yanlış: 60570, 60590** |
| 606 | 90 | 90 (1) | 50, 90 (2) | **+1 yanlış: 60650**, Codelist'te olan 60690 kütüphanede var ✓ |
| 607 | 90 | 90 (1) | 30, 50, 90 (3) | **+2 yanlış: 60730, 60750** |
| 608 | 90 | 90 (1) | 50, 70, 90 (3) | **+2 yanlış: 60850, 60870** |
| 609 | 70 | 50, 70 (2) | 50, 70, 90 (3) | **+1 yanlış: 60990** |
| 610 | 90 | 50, 70 (2) | 50, 70, 90 (3) | Codelist'te 610 için 50, 70 var; kütüphane 90 da ekliyor — 61090 **Codelist'te yok ama yanlış ekleme** |

**Örnek Codelist'te var ama kütüphanede yok:**
- `60130` (Codelist) — kütüphanede var ✓
- `60290` (Codelist 602/90) — kütüphanede var ✓
- `65020, 65030, 65050, 65070, 65090` (Codelist 650/*) — kütüphanede **yok** (650 kodu hiç yok)
- `62740, 62750` (Codelist 627/40 ve 627/50) — kütüphanede `62750, 62770, 62790` (50/70/90) var. 62740 **yok**, 62770/62790 **Codelist'te yok** (yani hem eksik hem fazla)

**Özet:** Kütüphane `WITHHOLDING_TAX_TYPE_WITH_PERCENT` set'i **her 6xx kod için 50/70/90 üçlüsünü default olarak ekliyor** ama Codelist her kod için spesifik (1 veya 2) oran kabul ediyor. Bu yaklaşımla **Schematron satır 308 %60-70 durumda reddeder**. Kütüphane bu set'i validation için kullanıyor mu? Grep: `WITHHOLDING_TAX_TYPE_WITH_PERCENT` constants.ts dışında **hiçbir yerde geçmiyor** → set tanımlı ama **kullanılmıyor**. Buna rağmen yanlış içerik tutuluyor (code smell).

### 3.3 Tevkifat Bulgu Özeti

| # | Kod / Kombinasyon | Tip | Etki |
|---|---|---|---|
| 1 | 650 kodu | `WITHHOLDING_TAX_TYPE_CODES` + `WITHHOLDING_TAX_DEFINITIONS`'te yok | Codelist yarım destek (ana regex'te yok, withPercent'te var) — belirsiz |
| 2 | `WITHHOLDING_TAX_TYPE_WITH_PERCENT` | Codelist ile %60+ uyumsuz | Set kullanılmıyor (dead code), ama tutarsız (ops. kullanan sistem için tehlike) |

---

## 4. UnitCode (Ölçü Birim Kodları)

### 4.1 Karşılaştırma

v1.42 §4.5: 39 kod (B32, C62, CCT, PR, D30, D40, GFI, GRM, GT, CEN, KPO, MND, 3I, KFO, KGM, KHY, KMA, KNI, KPH, KSD, KSH, KUR, D32, GWH, MWH, KWH, KWT, LPA, LTR, MTK, DMK, MTQ, MTR, NCL, CTM, SM3, R9, SET, T3).

Codelist `UnitCodeList` (satır 54): ≈1500+ UN/ECE kodu (süper set, UBL-TR v1.42 alt kümedir).

Kütüphane `UNIT_DEFINITIONS` (unit-config.ts:13-89): 76 kod (Türkçe isimlerle).

**v1.42'de olan ama kütüphane UNIT_DEFINITIONS'ta eksik:**

| Kod | v1.42 anlamı | Kütüphanede alternatif | Durum |
|---|---|---|---|
| **CEN** | Yüz Adet | `H62` (kütüphane'de "Yüz Adet" olarak) | Kod farklı — v1.42 CEN ister, kütüphane H62 üretir |
| **KPO** | Kilogram Potasyum Oksit | `K20` (kütüphane) | Kod farklı |
| **MND** | Kurutulmuş Net Ağırlıklı Kilogram | `K58` (kütüphane — "%90 Kuru Net Ağırlık Kilogramı" olarak tanımlı) | Kod farklı |
| **3I** | Kilogram-Adet | `K62` (kütüphane) | Kod farklı |
| **KHY** | Hidrojen Peroksit Kilogramı | `KHO` (kütüphane) | Kod farklı |
| **D32** | Terawatt Saat | `TWH` (kütüphane — "Bin Kilowatt Saat" olarak!) | Kod + anlam farklı |
| **GWH** | Gigawatt Saat | yok | **Kütüphanede eksik** |
| **MWH** | Megawatt Saat | yok | **Kütüphanede eksik** |
| **SM3** | Standart Metreküp | yok | **Kütüphanede eksik** |

**v1.42'de olmayan ama kütüphanede var (UN/ECE'de olabilir):**
- DPC (Düzine), K20, K62, KH6, KPR, KOH, H62, K58, KHO, TWH, CPR, AFF, HUR, AYR, AKQ, GMS, OMV, OTB, BAS, DAY, MON, ANN, D61, D62, PA, BX, MGM, 26, NT, MMT, CMT, CMQ, CLT, KJO, MMQ, CMK, MLT, KTM, RO, BJ, YRD, TN, DR, GRO, EV (≈45 kod)

**Durum B analizi:** v1.42 §4.5 notu: "Listede olmayan birimler için UN/ECE Unit Codes kullanılmalıdır." Codelist `UnitCodeList` UN/ECE üst kümesini kabul ediyor → kütüphanenin 45 UN/ECE kodu Schematron için geçerli. Kütüphane whitelist'e sahip (`isValidUnitCode()`) ama validator'da çağrılmıyor (§10.3).

**Özel fark — D32:**
- v1.42 §4.5: `D32 = Terawatt Saat` (10^12 Wh)
- kütüphane `TWH` → "Bin Kilowatt Saat" (yani 1 TWh = 10^9 Wh → **Gigawatt Saat** karşılığı!)
- Kütüphanenin `TWH` tanımı v1.42'deki `D32`'nin anlamıyla uyumsuz. TWH UN/ECE'de "megawatt-hour" karşılığıdır (standardın dışı karışıklık).
- Kullanıcı "Terawatt Saat" için kod istediğinde kütüphane `TWH` üretir, ama UBL-TR normatif D32 olmalı.

### 4.2 Unit Bulgu Özeti

| # | Kod | Tip | Etki |
|---|---|---|---|
| 1 | GWH, MWH, SM3 | v1.42 listesinde, kütüphanede yok | Kullanıcı Gigawatt/Megawatt Saat için kod üretemez — enerji faturalarında eksik |
| 2 | CEN, KPO, MND, 3I, KHY, D32 | v1.42 kodu kütüphanede farklı bir kodla (H62/K20/K58/K62/KHO/TWH) | Üretilen XML v1.42 PDF özetinden farklı kod üretir — Codelist UN/ECE üst kümesi yumuşattığı için Schematron'dan geçebilir ama gerçek alıcı (ör. özel GİB mutabakatı) reddedebilir |
| 3 | TWH ↔ D32 | Anlam farkı (kütüphanede "Bin Kilowatt Saat", v1.42'de "Terawatt Saat") | Semantik hata — miktar yanlış faturaya geçer |

---

## 5. PackagingTypeCode (Paket/Kap)

### 5.1 Karşılaştırma

v1.42 §4.13: 27 kod (BA, BE, BG, BH, BI, BJ, BK, BX, CB, CH, CI, CK, CN, CR, DK, DR, EC, FC, JR, LV, NE, SA, SU, TN, VG, VL, VO).

Codelist `PackageTypeCodeList` (satır 44): **≈340+ UN/ECE kodu** (üst küme).

**Kütüphane:** `PACKAGING_TYPE_CODES` sabitini içermez. Grep: `constants.ts` içinde böyle bir set **yok**.

`src/types/common.ts:287`: `packagingTypeCode?: string` — **serbest string**, whitelist yok. `src/serializers/delivery-serializer.ts:122-123` kullanıcının değerini doğrudan XML'e yazıyor.

Validator: Grep ile `PackagingTypeCode` hiçbir yerde validate edilmiyor.

### 5.2 Packaging Bulgu

| # | Konu | Tip | Etki |
|---|---|---|---|
| 1 | PackagingTypeCode whitelist yok | Runtime doğrulama eksik | Kullanıcı rastgele string girebilir, Schematron satır — (PackageTypeCode için özel regex yok, PackageTypeCodeList tanımlı ama kullanan `sch:rule` yok) → Schematron SSV geçirebilir ama UN/ECE list dışı reddedilir |

---

## 6. INCOTERMS (DeliveryTerms)

### 6.1 Karşılaştırma

v1.42 §4.14: 15 kod (CFR, CIF, CIP, CPT, DAF, DAP, DPU, DDP, DDU, DEQ, DES, EXW, FAS, FCA, FOB).

Codelist `DeliveryTermCodeList` (satır 29): 15 kod — **birebir aynı set**.

Kütüphane `DELIVERY_TERM_CODES` (constants.ts:225-228): 15 kod — **birebir aynı set**. ✓

`src/validators/profile-validators.ts:86`: `DELIVERY_TERM_CODES.has(del.deliveryTerms.id)` kontrolü yapıyor. ✓

### 6.2 INCOTERMS 2020 Notu

v1.42 PDF `DES, DEQ, DAF, DDU` dört kodunu da koruyor (INCOTERMS 2020'de kaldırılmış olsa bile). Kütüphane de bu 4 kodu tutuyor. **Durum C** (Skill ile uluslararası kural çakışıyor) — normatif kaynak (v1.42 + Codelist) kazanır. Kütüphane normatife uyuyor → **uyumlu**.

### 6.3 INCOTERMS Bulgu

**Bulgu yok.** Tam uyumlu.

---

## 7. PartyIdentification/schemeID

### 7.1 Karşılaştırma

Codelist `PartyIdentificationIDType` (satır 33): 29 değer.

v1.42 §5.1: 29 değer (tek fark adlandırma: v1.42 `GCB_TESCILNO`, Codelist `GTB_GCB_TESCILNO` — Codelist doğru).

Kütüphane `PARTY_IDENTIFICATION_SCHEME_IDS` (constants.ts:241-248): 29 değer.

**Karşılaştırma:**

| schemeID | v1.42'de | Codelist'te | Kütüphanede | Durum |
|---|---|---|---|---|
| TCKN, VKN | ✓ | ✓ | ✓ | uyumlu |
| HIZMETNO, MUSTERINO, TESISATNO, TELEFONNO | ✓ | ✓ | ✓ | uyumlu |
| DISTRIBUTORNO, TICARETSICILNO, TAPDKNO, BAYINO | ✓ | ✓ | ✓ | uyumlu |
| ABONENO, SAYACNO, EPDKNO, SUBENO, PASAPORTNO | ✓ | ✓ | ✓ | uyumlu |
| URETICINO, CIFTCINO, IMALATCINO, DOSYANO, HASTANO | ✓ | ✓ | ✓ | uyumlu |
| MERSISNO | ✓ | ✓ | ✓ | uyumlu |
| ARACIKURUMVKN, ARACIKURUMETIKET | ✓ | ✓ | ✓ | uyumlu |
| GTB_REFNO, GTB_GCB_TESCILNO, GTB_FIILI_IHRACAT_TARIHI | ✓ | ✓ | ✓ | uyumlu |
| ARACKIMLIKNO, PLAKA, SEVKIYATNO | ✓ | ✓ | ✓ | uyumlu |

**Sonuç:** 29/29 **tam uyumlu**. Validator: Grep `PARTY_IDENTIFICATION_SCHEME_IDS` → `src/index.ts:32` export ediliyor ama **hiçbir validator'da `.has()` çağrısı yok** → whitelist dead code. Schematron satır referansı (Common_Schematron'da `PartyIdentificationIDType` geçmiyor, ama `ARPartyIdentificationGTBCheck` satır 502 gibi özel şemalar Schematron'da kontrol ediliyor).

### 7.2 LicensePlate schemeID

Codelist `LicensePlateIDSchemeIDType` (satır 35): `DORSE, PLAKA` (2 değer).
Kütüphane `LICENSE_PLATE_SCHEME_IDS` (constants.ts:262): `PLAKA, DORSE` (2 değer). ✓ uyumlu.

---

## 8. AdditionalItemIdentification/schemeID

### 8.1 Karşılaştırma

Codelist `AdditionalItemIdentificationIDType` (satır 62): 6 değer — `KUNYENO, ILAC, TIBBICIHAZ, TELEFON, TABLET_PC, DIGER`.

v1.42 §5.3: 6 değer (Codelist ile aynı).

Kütüphane `ADDITIONAL_ITEM_ID_SCHEME_IDS` (constants.ts:251-254): 8 değer — `TELEFON, TABLET_PC, BILGISAYAR, KUNYENO, ILAC, TIBBICIHAZ, DIGER, ETIKETNO`.

| schemeID | v1.42'de | Codelist'te | Kütüphanede | Durum |
|---|---|---|---|---|
| KUNYENO, ILAC, TIBBICIHAZ, TELEFON, TABLET_PC, DIGER | ✓ | ✓ | ✓ | uyumlu |
| **BILGISAYAR** | ✗ | ✗ | ✓ | **KÜTÜPHANE FAZLA** (kaynak yok) |
| **ETIKETNO** | ✗ (v1.42 §5.3 listesinde yok) | ✗ (regex'te yok) | ✓ | Durum B — Schematron satır 493 `@schemeID='ETIKETNO'` kontrolü yapıyor (IDIS profili için), yani fiilen Schematron'da kullanılıyor ama Codelist `AdditionalItemIdentificationIDType` regex'inde yok → **Codelist kendi içinde tutarsız** |

### 8.2 AdditionalItemIdentification Bulgu

| # | schemeID | Tip | Etki |
|---|---|---|---|
| 1 | BILGISAYAR | Kütüphanede, v1.42'de ve Codelist'te yok | Belirsiz — `TABLET_PC` v1.42'de "tablet" için standardlaştırılmış. BILGISAYAR muhtemelen eski/iptal edilmiş varsayım. Schematron regex'te olmadığından BILGISAYAR üretirse reddedilir |
| 2 | ETIKETNO | IDIS için Schematron'da hard-coded (satır 493) ama Codelist regex'inde yok | Normatif ama dağınık kaynak. Kütüphane doğru davranıyor (Schematron kuralına uyuyor) |

---

## 9. IhracKayitli ve YatirimTesvik Özel Şemaları

### 9.1 IhracKayitliPartyIdentification

Codelist `IhracKayitliPartyIdentificationIDType` (satır 64): `SATICIDIBSATIRKOD, ALICIDIBSATIRKOD` (2 değer).

v1.42 §5.4: 2 değer — "IHRACKAYITLI + 702 kodu için kalem seviyesinde zorunlu".

Schematron satır 322 `TaxExemptionReasonCodeCheck` → 702 kodunda kalem seviyesinde GTİP + ALICIDIBSATIRKOD zorunluluğunu test ediyor.

Kütüphane tarafı:
- `src/validators/type-validators.ts:176 validateIhracKayitli(input)` — validator var
- Kütüphanede `SATICIDIBSATIRKOD` veya `ALICIDIBSATIRKOD` literal olarak constants.ts'te whitelist yok (AdditionalItemIdentification ve PartyIdentification schema ID'leri dışında)
- `type-validators.ts` kontrolünü kısa bir grep ile görmek gerekli; ancak 702 kodu + schemeID + string-length=11 kuralı (Schematron) ayrıntılı mı?

### 9.2 YatirimTesvikItemClassificationCodeList

Codelist `YatirimTesvikItemClassificationCodeList` (satır 66): `01, 02, 03, 04` (4 değer).

v1.42 §5.5: 4 değer (birebir).

Kütüphane `YTB_ITEM_CLASSIFICATION_CODES` (constants.ts:236-238): `01, 02, 03, 04`. ✓ Tam uyumlu.

`src/validators/profile-validators.ts:254` `YTB_ITEM_CLASSIFICATION_CODES.has(code)` kontrolü yapıyor. Schematron satır 468 ek kontrol: ISTISNA tipinde ItemClassificationCode 01/02 olmalı, 03/04 olamaz. Bu profile-validators.ts:260-261'de de uygulanmış (Schematron `YatirimTesvikItemClassificationCodeIstisnaCheck` atıf ile).

### 9.3 YatirimTesvik e-Arşiv InvoiceTypeCode

Codelist `YatirimTesvikEArsivInvoiceTypeCodeList` (satır 65): `YTBSATIS, YTBIADE, YTBISTISNA, YTBTEVKIFAT, YTBTEVKIFATIADE`.

Kütüphane `YTB_GROUP_TYPES` (constants.ts:102-105): aynı 5 kod. ✓ Tam uyumlu.

---

## 10. Dış Listeler ve Runtime Validator'lar

### 10.1 Currency

Codelist `CurrencyCodeList` (satır 46): **180+ ISO 4217 kodu** (güncel liste).
v1.42 §4.1: ISO 4217'ye atıfta bulunur, listeyi içermez.
Kütüphane `CURRENCY_CODES` (constants.ts:213-222): **69 kod** (ISO 4217 alt kümesi).
Kütüphane `currency-config.ts` `CURRENCY_DEFINITIONS`: **30 kod** (unit/subunit isimleriyle).

**Çift truth source:** `CURRENCY_CODES` (validator) ≠ `CURRENCY_DEFINITIONS` (data). `common-validators.ts:51` `CURRENCY_CODES.has` kullanıyor → `USD, JPY, INR` geçer ama `currency-config.ts` Türkçe isimlerini tutmayabilir (ör: `AMD`, `BAM`, `MKD` currency-config'de yok ama CURRENCY_CODES'te var).

**Önemli bulgu — TRL:** `CURRENCY_CODES:221` → `'TRL'`. ISO 4217 aktif listede TRL **yok** (2005'te geçerliliğini yitirmiş, TRY'ye dönüşmüş). Codelist `CurrencyCodeList`'te de yok. Kütüphane TRL kabul ediyor → **üretimde TRL ile fatura oluşturulursa Schematron reddeder**.

### 10.2 Country

Codelist `CountryCodeList` (satır 48): 240+ ISO 3166-1 alpha-2 kodu.
v1.42 §4.2: ISO 3166-1 atıfta bulunur.
Kütüphane: **Whitelist YOK**. `src/types/common.ts:257` `country?: string` serbest. Validator'da kontrol yok.

### 10.3 Runtime Validator Kullanımı — Dead Function Tespiti

| Fonksiyon | Tanımlı | Export edildi | Validator'da çağrılıyor mu? |
|---|---|---|---|
| `isValidTaxCode()` | `tax-config.ts:56` | `index.ts:101` | **✗** (validator'lar `TAX_TYPE_CODES.has()` kullanıyor, ayrı set) |
| `isValidWithholdingTaxCode()` | `withholding-config.ts:76` | `index.ts:108` | **✗** |
| `isValidExemptionCode()` | `exemption-config.ts:124` | `index.ts:116` | **✗** (validator'lar `ISTISNA_TAX_EXEMPTION_REASON_CODES.has()` kullanıyor) |
| `isValidUnitCode()` | `unit-config.ts:114` | `index.ts:123` | **✗** |
| `isValidCurrencyCode()` | `currency-config.ts:55` | `index.ts:130` | **✗** (validator `CURRENCY_CODES.has()` kullanıyor) |

Ayrıca `config-manager.ts:217-304` aynı fonksiyonları wrap ediyor (muhtemelen consumer için API) ama iç validator'lar farklı source'u (constants.ts) kullanıyor. **Çift truth source** sorunu.

### 10.4 PaymentMeansCode

Codelist `PaymentMeansCodeTypeList` (satır 56): 1-97 + ZZZ (≈80 kod — UN/EDIFACT 4461).
Kütüphane `PAYMENT_MEANS_CODES` (constants.ts:257-259): 19 kod (`1,2,3,4,5,10,20,30,31,42,48,49,50,51,60,61,62,97,ZZZ`).
Validator: Grep `PAYMENT_MEANS_CODES.has` → **hiçbir yerde çağrılmıyor**. Dead whitelist.

### 10.5 ResponseCode

Codelist `ResponseCodeType` (satır 39): `KABUL, RED, IADE, S_APR, GUMRUKONAY` (5 değer).
v1.42 §4.7: `KABUL, RED, IADE` (3 değer).
Kütüphane: grep `ResponseCode` → tür tanımı var ama whitelist yok. Validator yok.

### 10.6 ChannelCode, MimeCode

Kütüphane: Whitelist yok. Dış liste (UN/EDIFACT / MIME) — validator tarafı açık.

---

## 11. Bulgu Özeti

### 11.1 Ciddiyet Breakdown

| Ciddiyet | Adet | Ana Bulgular |
|---|---|---|
| **KRİTİK** | **3** | §1.1 TaxExemption fazla (10 kod) • §1.3 555 eksik • §3.2 WithholdingTaxTypeWithPercent uyumsuz |
| **YÜKSEK** | **5** | §1.2 351 eksik • §1.6 151 eksik • §2.1 tax-config'te 0021/0022/4171/9944 eksik • §3.1 650 desteklenmiyor • §10.1 TRL ISO dışı |
| **ORTA** | **6** | §1.2 exemption-config 326-344 eksik (17 kod) • §1.5 704 exemption-config'te yok • §4.1 Unit kodu çelişki (D32/TWH) • §4.1 GWH/MWH/SM3 eksik • §5.2 Packaging whitelist yok • §10.3 5 isValid* fonksiyonu dead code |
| **DÜŞÜK** | **3** | §8.1 BILGISAYAR fazla • §10.2 Country whitelist yok • §10.4 PAYMENT_MEANS_CODES dead whitelist |

**Toplam: 17 bulgu**

### 11.2 Kategori Breakdown

| Kategori | Adet |
|---|---|
| `KÜTÜPHANE` | 15 |
| `DOKÜMAN` | 0 |
| `SKILL` | 2 (§3.2 Codelist kendi içinde 650 çelişki; §8.1 ETIKETNO Codelist regex'te yok ama Schematron'da hard-coded) |
| `TEST` | 0 |

### 11.3 Her Bulgu — Kısa Liste

#### KRİTİK

##### [KRİTİK][KÜTÜPHANE] TaxExemptionReasonCode kısmi istisna fazla kabul
- **Dosya:satır:** `src/config/constants.ts:186-200`
- **Gözlem:** `ISTISNA_TAX_EXEMPTION_REASON_CODES` set'i `201-250` aralığını tam olarak içeriyor; Codelist regex'i ve v1.42 §4.8.1 şu 10 kodu (203, 210, 222, 224, 233, 243, 244, 245, 246, 247, 248, 249) **dahil etmiyor**.
- **Normatif referans:** Codelist satır 21 `TaxExemptionReasonCodeType` + satır 23 `istisnaTaxExemptionReasonCodeType`; v1.42 §4.8.1 "PDF'te atlanmış kodlar bilinçli boşluk".
- **Durum tipi:** A (Skill diyor, kütüphane farklı)

##### [KRİTİK][KÜTÜPHANE] 555 kodu hiçbir whitelist'te yok
- **Dosya:satır:** `src/config/constants.ts:186-210`
- **Gözlem:** 555 (v1.42 §4.8.3, Mart 2026 yenisi, "KDV Oran Kontrolüne Tabi Olmayan Satışlar") ne ISTISNA ne OZEL_MATRAH ne de IHRAC exemption setine dahil. `isValidExemptionCode('555')` → `exemption-config.ts`'te de yok → false.
- **Normatif referans:** Codelist satır 21 `TaxExemptionReasonCodeType` içinde 555 var; CommonSchematron satır 316 555 özel istisna; satır 497 `DemirbasKDVTaxExemptionCheck` (TEMELFATURA/TICARIFATURA/EARSIVFATURA + SATIS/TEVKIFAT tiplerinde).
- **Durum tipi:** A

##### [KRİTİK][KÜTÜPHANE] WithholdingTaxTypeWithPercent set yanlış/tutarsız
- **Dosya:satır:** `src/config/constants.ts:130-183`
- **Gözlem:** Kütüphane her 6xx kod için `50/70/90` default eklemiş (≈110 kombinasyon); Codelist spesifik oran kabul ediyor (65 kombinasyon). Örnek: 60120, 60150, 60160, 60170 kütüphanede var, Codelist'te yok → Schematron satır 308 reddeder. Ek olarak set hiçbir validator'da çağrılmıyor — dead code ama yanlış içerik.
- **Normatif referans:** Codelist satır 17 `WithholdingTaxTypeWithPercent`; CommonSchematron satır 308 `contains($WithholdingTaxTypeWithPercent, concat(',', code, percent, ','))`.
- **Durum tipi:** A

#### YÜKSEK

##### [YÜKSEK][KÜTÜPHANE] 151 kodu (ÖTV "İstisna Olmayan Diğer") yok
- **Dosya:satır:** `src/config/constants.ts:186-200`
- **Gözlem:** `ISTISNA_TAX_EXEMPTION_REASON_CODES` 101-108 içeriyor ama 151'i içermiyor.
- **Normatif referans:** Codelist satır 21 (`TaxExemptionReasonCodeType` içinde 151 var); v1.42 §4.8.4 "ÖTV İstisna Olmayan Diğer, 0 ÖTV fatura".
- **Durum tipi:** A

##### [YÜKSEK][KÜTÜPHANE] 351 kodu (KDV "İstisna Olmayan Diğer") constants.ts'te yok
- **Dosya:satır:** `src/config/constants.ts:186-200`
- **Gözlem:** 351 kodu `exemption-config.ts:82` içinde `documentType: 'SATIS'` olarak tanımlı ama `ISTISNA_TAX_EXEMPTION_REASON_CODES` set'inde yok → validator reddeder. İki truth source arasında çelişki.
- **Normatif referans:** Codelist satır 21 + v1.42 §4.8.2 "351* İstisna Olmayan Diğer, 0 KDV fatura".
- **Durum tipi:** A

##### [YÜKSEK][KÜTÜPHANE] tax-config.ts TAX_DEFINITIONS eksik 5 kod
- **Dosya:satır:** `src/calculator/tax-config.ts:18-44`
- **Gözlem:** `0021` (BMV), `0022` (SMV), `4171` (ÖTV Tevkifat), `9015`, `9944` (Belediye Hal Rüsumu) tanımsız. `isValidTaxCode('0021')` → false. constants.ts'teki `TAX_TYPE_CODES` bu 5 kodu içeriyor (validator onlarda geçer). İki kütüphane iç source çelişkili.
- **Normatif referans:** Codelist satır 15 `TaxType`; v1.42 §4.9.1.
- **Durum tipi:** A

##### [YÜKSEK][KÜTÜPHANE] Tevkifat 650 kodu desteklenmiyor
- **Dosya:satır:** `src/config/constants.ts:120-127`, `src/calculator/withholding-config.ts:15-68`
- **Gözlem:** 650 ana tabloda (`WITHHOLDING_TAX_TYPE_CODES`) ve `WITHHOLDING_TAX_DEFINITIONS`'te yok. Codelist ise `WithholdingTaxTypeWithPercent` regex'inde `65020, 65030, 65050, 65070, 65090` olarak 650+5 oran kombinasyonu destekliyor.
- **Normatif referans:** Codelist satır 16 (`WithholdingTaxType`'da 650 **yok**) vs satır 17 (`WithholdingTaxTypeWithPercent`'te var). v1.42 §4.9.2 ana tabloda yok ama v1.23 changelog'da "650'ye 3/10 eklendi".
- **Durum tipi:** C (Codelist kendi içinde çelişki — ana regex'te olmayan bir kod alt regex'te var; v1.42 özetinde de belirsiz). Kütüphane "yok" tarafına düşmüş ama gerçek alıcıya sormadan karar verilmeli.

##### [YÜKSEK][KÜTÜPHANE] TRL para birimi ISO 4217 aktif listede yok
- **Dosya:satır:** `src/config/constants.ts:221`
- **Gözlem:** `CURRENCY_CODES` set'inde `'TRL'` var. TRL 2005'te geçerliliğini yitirdi (TRY'ye dönüştü). Codelist `CurrencyCodeList` (satır 46) TRL içermiyor.
- **Normatif referans:** Codelist satır 46; ISO 4217 tarihçesi.
- **Durum tipi:** A

#### ORTA

##### [ORTA][KÜTÜPHANE] exemption-config.ts eksik tam istisna kodları
- **Dosya:satır:** `src/calculator/exemption-config.ts:15-111`
- **Gözlem:** v1.42 §4.8.2'de 326, 327, 328, 329, 330, 331, 333, 334, 336, 337, 338, 340, 341, 342, 343, 344, 704 — toplam 17 kod `exemption-config.ts`'te yok. constants.ts'teki runtime whitelist'lerde ise var → iki kütüphane iç source çelişkili. Consumer UI listesi eksik kod gösterir.
- **Normatif referans:** Codelist satır 21; v1.42 §4.8.2 ve §4.8.7 (704).
- **Durum tipi:** A

##### [ORTA][KÜTÜPHANE] Unit kodu çelişkisi — TWH ↔ D32 (Terawatt Saat)
- **Dosya:satır:** `src/calculator/unit-config.ts:48` (`{ code: 'TWH', name: 'Bin Kilowatt Saat' }`)
- **Gözlem:** TWH UN/ECE'de "megawatt-hour" karşılığı; v1.42 §4.5 Terawatt Saat için `D32` kodu kullanıyor. Kütüphane TWH üretiyor ama Türkçe adı "Bin Kilowatt Saat" (yani Gigawatt Saat eşdeğeri) → semantik bozukluk.
- **Normatif referans:** Codelist satır 54 `UnitCodeList` (hem TWH hem D32 var, üst küme); v1.42 §4.5 `D32 = TERAWATT SAAT`.
- **Durum tipi:** A

##### [ORTA][KÜTÜPHANE] Unit kodlarında GWH, MWH, SM3 eksik
- **Dosya:satır:** `src/calculator/unit-config.ts:13-89`
- **Gözlem:** v1.42 §4.5'te 3 enerji/hacim birimi var ama kütüphane UNIT_DEFINITIONS'ta yok: `GWH` (Gigawatt Saat), `MWH` (Megawatt Saat), `SM3` (Standart Metreküp). Codelist regex'i UN/ECE üst kümesinden geldiği için bu kodlar SCHEMATRON seviyesinde geçerli ama kütüphane kullanıcıya "Gigawatt Saat" olarak Türkçe input verirse karşılığı yok.
- **Normatif referans:** v1.42 §4.5 listesi.
- **Durum tipi:** A

##### [ORTA][KÜTÜPHANE] PackagingTypeCode whitelist yok
- **Dosya:satır:** `src/types/common.ts:287`, `src/serializers/delivery-serializer.ts:122-123`
- **Gözlem:** `packagingTypeCode?: string` serbest string. Ne constants.ts'te whitelist ne de validator. Codelist `PackageTypeCodeList` (satır 44) 340+ UN/ECE kodu kabul ediyor (alt regex yok) ama kütüphane rastgele bir değeri XML'e yazar.
- **Normatif referans:** v1.42 §4.13 + Codelist satır 44.
- **Durum tipi:** A

##### [ORTA][KÜTÜPHANE] isValid* fonksiyonları hiçbir validator'da kullanılmıyor
- **Dosya:satır:** `src/calculator/tax-config.ts:56`, `withholding-config.ts:76`, `exemption-config.ts:124`, `unit-config.ts:114`, `currency-config.ts:55`
- **Gözlem:** 5 runtime whitelist fonksiyonu export ediliyor (ve `index.ts:101-130` üzerinden API'ye açılıyor) ama iç validator'lar (common-validators, type-validators, profile-validators) `constants.ts` Set'lerini kullanıyor. İki truth source sonucu: (a) `isValidTaxCode('0021')` → false (tax-config), (b) `validateTaxTotals` → geçer (constants.TAX_TYPE_CODES'te var). Çağrı yolu bağımlı davranış.
- **Normatif referans:** —
- **Durum tipi:** B (skill susuyor; kütüphane iç tutarsızlık)

#### DÜŞÜK

##### [DÜŞÜK][KÜTÜPHANE] ADDITIONAL_ITEM_ID_SCHEME_IDS'de BILGISAYAR fazla
- **Dosya:satır:** `src/config/constants.ts:252`
- **Gözlem:** BILGISAYAR kodu ne Codelist regex'inde (`AdditionalItemIdentificationIDType`) ne de v1.42 §5.3'te var. Muhtemelen eski bir varsayım (TEKNOLOJIDESTEK için "telefon, bilgisayar/tablet" metinsel olarak geçiyor ama şema değeri `TABLET_PC` olarak standardlaştırılmış).
- **Normatif referans:** Codelist satır 62; v1.42 §5.3.
- **Durum tipi:** A

##### [DÜŞÜK][KÜTÜPHANE] Country code whitelist yok
- **Dosya:satır:** `src/types/common.ts:257`
- **Gözlem:** `country?: string` serbest string. Codelist `CountryCodeList` (satır 48) tam ISO 3166-1 alpha-2 listesi kabul ediyor. Kütüphanede whitelist veya validator yok.
- **Normatif referans:** Codelist satır 48; v1.42 §4.2.
- **Durum tipi:** B

##### [DÜŞÜK][KÜTÜPHANE] PAYMENT_MEANS_CODES dead whitelist
- **Dosya:satır:** `src/config/constants.ts:257-259`
- **Gözlem:** 19 ödeme kodu tanımlı, `PAYMENT_MEANS_CODES.has` hiçbir yerde çağrılmıyor. Validator yok. Codelist `PaymentMeansCodeTypeList` (satır 56) 80+ kod kabul; kütüphane rastgele değer geçirebilir.
- **Normatif referans:** Codelist satır 56; v1.42 §4.6.
- **Durum tipi:** B

#### SKILL bulgular (denetim dışında; skill güncellemesi için not)

##### [ORTA][SKILL] Codelist kendi içinde tutarsız — 650 kodu
- **Dosya:** `schematrons/UBL-TR_Codelist.xml:16,17`
- **Gözlem:** Ana `WithholdingTaxType` regex'i (satır 16) 650'yi içermiyor ama `WithholdingTaxTypeWithPercent` regex'i (satır 17) 650+5 oran kombinasyonu destekliyor. Schematron satır 306 (ana kontrol) 650'yi reddeder, satır 308 (oran kontrolü) 650 oranlarını geçerli sayar — çelişki.
- **Durum tipi:** Normatif kaynak içinde iç çelişki (Codelist XML → GİB/Mimsoft'a ait).

##### [ORTA][SKILL] ETIKETNO Codelist AdditionalItemIdentificationIDType regex'inde yok
- **Dosya:** `schematrons/UBL-TR_Codelist.xml:62` + `Common_Schematron.xml:493`
- **Gözlem:** ETIKETNO değeri Codelist `AdditionalItemIdentificationIDType` regex'inde bulunmuyor ama Common_Schematron satır 493'te IDIS profili için hard-coded kontrol ediliyor. Kütüphane ETIKETNO'yu destekliyor (doğru davranış) — bu bulgu normatif kaynağın dağınık kullanımı.
- **Durum tipi:** Dağınık normatif referans (GİB'in kendi uyumu).

---

## 12. Senin Bir Sonraki Denetime Açık Soruların

1. **Çift truth source sorunu:** `constants.ts` (validator Set'leri) ↔ `calculator/*-config.ts` (isValid* fonksiyonları + data) hangi taraf "gerçek" olacak? `edocument-service` hangisini tüketiyor? Consumer UI hangi listeyi görüyor? (Ör: UI 5 eksik tax kodu için dropdown göstermiyor ama backend validator geçiriyor → beyaz/gri liste cooldown'u.)
2. **WithholdingTaxTypeWithPercent strateji:** Kütüphanenin fazla içerikli dead set'i silinsin mi yoksa Codelist v1.42'ye göre düzeltilsin mi? Set çağrılmadığına göre belki sadece silmek yeterli.
3. **650 kodu:** Codelist iç çelişki. Kütüphane "yok" tarafına oyluyor. GİB entegratör mutabakatına göre 650 fiilen kullanılıyor mu? Prod pilotta ne gördün?
4. **TaxExemption 203/210/222/224/233/243-249 kabul:** Kütüphane bu 10 kodu kabul ediyor. Bu bir "ileri uyum" (v1.43'te eklenebilir) güvencesi mi yoksa saf hata mı? v1.23-v1.42 changelog bu kodların "eklenip çıkarıldığını" göstermiyor → saf hata olma ihtimali daha yüksek.
5. **PackagingTypeCode için whitelist eklenmeli mi?** v1.42 §4.13 27 kod veriyor ama Codelist 340+ UN/ECE kodu kabul ediyor. Pratik tercih: 27 kodu whitelist yap + `|| codelist.packagingTypeCodeList.has(code)` fallback? Ya da hiç validator koyma?
6. **PaymentMeansCode whitelist faydalı mı?** Şu anda `PAYMENT_MEANS_CODES` tanımlı ama çağrılmıyor. 80+ UN/EDIFACT kodu arasında kütüphanenin 19 kodu en sık kullanılanlar. Güçlü/zayıf validasyon kararı.
7. **555 için yaklaşım:** Yeni bir `DIGER_ISLEM_TAX_EXEMPTION_REASON_CODES = new Set(['555'])` set'i mi eklenir, yoksa `ISTISNA_TAX_EXEMPTION_REASON_CODES`'e 555 eklenir mi? Schematron 555'i ISTISNA/IADE/IHRACKAYITLI dışında da kabul ediyor (satır 316) — ayrı set daha temiz.
8. **Unit config TWH ↔ D32 karışıklığı:** TWH yeniden adlandırılmalı mı (ör: "Bin Kilowatt Saat" → "Megawatt Saat") + D32 eklemek ("Terawatt Saat")? Geri uyumluluk?

---

## 13. Context'e Giren Dosyalar

**Kütüphane (json2ubl-ts/):**
- `src/config/constants.ts` (tam, 309 satır)
- `src/calculator/exemption-config.ts` (tam, 132 satır)
- `src/calculator/tax-config.ts` (tam, 64 satır)
- `src/calculator/withholding-config.ts` (tam, 84 satır)
- `src/calculator/unit-config.ts` (tam, 117 satır)
- `src/calculator/currency-config.ts` (tam, 63 satır)
- `src/types/common.ts` (satır 140-310, grep PackagingTypeCode)
- `src/validators/` grep (TAX_TYPE_CODES, WITHHOLDING_TAX_TYPE_CODES, ISTISNA_TAX_EXEMPTION, PAYMENT_MEANS_CODES kullanımı)
- `src/validators/profile-validators.ts` (satır 86, 194-260 grep)
- `audit/denetim-01-ic-tutarlilik.md` (tam)

**Skill (gib-teknik-dokuman/):**
- `schematrons/UBL-TR_Codelist.xml` (tam, 70 satır — 30+ regex tanımı)
- `schematrons/UBL-TR_Common_Schematron.xml` (satır 291-338, 493-510 — TaxExemptionReasonCodeCheck, DemirbasKDVTaxExemptionCheck, TaxTypeCheck kuralları)
- `references/kod-listeleri-ubl-tr-v1.42.md` (tam 857 satır — 2 partite okundu)

**Toplam:** 7 kütüphane + 3 skill kaynağı incelendi.

**Context durumu:** Oturum doldu, bir sonraki denetim (ör. Schematron cross-rule tam taraması, veya serializer seviyesinde karar doğrulama) için taze oturum önerilir.
