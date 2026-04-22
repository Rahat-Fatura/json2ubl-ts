---
sprint: 01
tarih: 2026-04-22
v3_baglam: audit/FIX-PLANI-v3.md
plan: audit/sprint-01-plan.md
---

# Sprint 1 İmplementasyon Logu — Matris Tekleştirme + AR-4

## Kapanan Bulgular (9)

| Bulgu | Dosya:satır | Öncesi | Sonrası | Test |
|---|---|---|---|---|
| **B-01** TICARIFATURA+IADE | `src/calculator/invoice-rules.ts:33` (eski map) | Hardcoded PROFILE_TYPE_MAP.TICARIFATURA IADE içermiyordu (aslında OK), ama tutarsızlık vardı | Türetme — TICARIFATURA matrix'te IADE yok, helper da döndürmüyor | `cross-validators.test.ts` TICARIFATURA+IADE reject (zaten vardı) |
| **B-02** HKS profili SATIS/KOMISYONCU → HKSSATIS/HKSKOMISYONCU | `src/calculator/invoice-rules.ts:42` (eski map) | `HKS: ['SATIS', 'KOMISYONCU']` | Türetme — HKS matrix'te HKSSATIS/HKSKOMISYONCU | `invoice-rules.test.ts` "B-02 HKS" |
| **B-21** TEMELFATURA+TEVKIFATIADE eksik | `src/calculator/invoice-rules.ts:34` (eski map) | TEVKIFATIADE listelenmemişti | Türetme matrix'ten (var) | Matris simetri testi |
| **B-22** KAMU asimetri | `src/calculator/invoice-rules.ts:40` (eski map) | TEVKIFATIADE/SGK/KOMISYONCU eksik | Türetme — matrix'te hepsi var (KAMU 9 tip) | Matris simetri testi |
| **B-23** EARSIVFATURA asimetri | `src/calculator/invoice-rules.ts:36` (eski map) | TEVKIFATIADE/SGK eksik; HKSSATIS/HKSKOMISYONCU fazla | Türetme — matrix'te 16 tip (TEVKIFATIADE/SGK dahil, HKS tipleri yok) | Matris simetri testi |
| **B-54** IHRACAT profili asimetri | `src/config/constants.ts:20` + `invoice-rules.ts` | Matris 9 tip; map 3 tip | **M2:** Matris tek `ISTISNA`; map türevli | `invoice-rules.test.ts` "M2 — IHRACAT" |
| **B-55** YOLCUBERABERFATURA asimetri | `src/config/constants.ts:25` | Matris 9 tip; map 2 tip | **M2:** Matris tek `ISTISNA`; map türevli | `invoice-rules.test.ts` "M2 — YOLCU" |
| **B-56** OZELFATURA asimetri | `src/config/constants.ts:30` | Matris 9 tip; map 2 tip | **M2:** Matris tek `ISTISNA`; map türevli | `invoice-rules.test.ts` "M2 — OZELFATURA" |
| **B-77** YTB tipleri TYPE_PROFILE_MAP eksik | `src/calculator/invoice-rules.ts:50` (eski map) | YTBSATIS/YTBIADE/YTBISTISNA/YTBTEVKIFAT/YTBTEVKIFATIADE yoktu | Türetme — her tip otomatik profil listesinde (EARSIVFATURA) | `invoice-rules.test.ts` "B-77 YTB" |

## Uygulanan Mimari Kararlar

- **M1** — `PROFILE_TYPE_MATRIX` tek truth source. `PROFILE_TYPE_MAP` ve `TYPE_PROFILE_MAP` artık `deriveProfileTypeMap()` / `deriveTypeProfileMap()` helper'ları üzerinden matrix'ten otomatik türetilir (`invoice-rules.ts:36-57`). Asimetri kaynağı (hardcoded iki map) kaldırıldı.
- **M2** — IHRACAT / YOLCUBERABERFATURA / OZELFATURA profilleri yalnızca `ISTISNA` tipini kabul eder (`constants.ts:20,21,22`). Kullanıcı kararı (ACIK-SORULAR #2).
- **M8** — CustomizationID `TR1.2.1` → `TR1.2` (`namespaces.ts:28`). Hem Fatura hem İrsaliye tek sabit; ayrıştırma yok. B-38 bu sprint'te pratikte kapandı.
- **AR-4** — `PROFILE_TYPE_MATRIX` artık public export edilmez (`src/index.ts`'ten satır kaldırıldı). İç tüketiciler (`cross-validators.ts`, `invoice-rules.ts`) `config/constants`'tan doğrudan import ediyor. Helper API (`getAllowedTypesForProfile`, `getAllowedProfilesForType`) public kalıyor.
- **AR-3** — Uygulanmıyor (PROFILE_TYPE_MAP / TYPE_PROFILE_MAP zaten private idi, aksiyon gerekmedi).

## Adım 6 Sonucu

**Sonuç: ön-check'te test GEÇTİ.** `__tests__/calculator/document-calculator.test.ts:199` "buyerCustomer varsa profil IHRACAT olmalı" testi değişiklik öncesinde de geçiyordu. Sebep: `calculateDocument` validator çağırmıyor, sadece profile derivation yapıyor; input type SATIS + buyerCustomer → profile IHRACAT, tip IHRACAT matrix'te olup olmadığı kontrol edilmiyor.

**Plan disiplini gereği defensive fix yine de uygulandı:** Input'a `type: 'ISTISNA'` eklendi. Gerekçe: Sprint 4'te otomatik tip derivation (M10) gelinceye kadar regresyon koruması. Tek satır, maliyetsiz.

## Sprint Dışı Ek Temizlik

Sprint 1 değişiklikleri öncesinde `invoice-serializer.ts` kullanıcı tarafından refactor edilmiş; `ublExtensionsPlaceholder` üretimi kaldırılmış. Bu, iki adet eski testi kırıyordu:

- `__tests__/builders/invoice-builder.test.ts` — "UBLExtensions placeholder içerir"
- `__tests__/builders/invoice-builder.test.ts` — "cac:Signature oluşturur"

Açık Soru #3 cevabı gereği (Signature/UBLExtensions kütüphane üretmez; testler silinir) bu iki test silindi. Bulgu B-93 (`ublExtensionsPlaceholder dead`) Sprint 8'de kodda kalan artıkları temizleyecek; bu adım şimdilik sadece test tarafı temizliği.

## Test Durumu

- **Öncesi (HEAD):** 112 test (1 kırık — "cac:Signature oluşturur", önceden de kırık)
- **Sonrası (Sprint 1):** **118 test, 0 kırık**
- Net fark: +8 yeni (`invoice-rules.test.ts`) − 2 silindi (UBLExtensions + Signature) = +6 test
- `yarn test`: ✓ 7 dosya, 118 geçti
- `yarn typecheck`: ✓ hata yok
- **AR-4 teyit:** `grep "PROFILE_TYPE_MATRIX" src/index.ts` → boş çıktı ✓
- **İç tüketici teyit:** `PROFILE_TYPE_MATRIX` `constants.ts` (def), `cross-validators.ts:3` (iç), `invoice-rules.ts:15` (yeni iç — türev için). Dış tüketici yok.

## Yeni/Değişen Dosyalar

### Değişen
- `src/config/constants.ts` — IHRACAT/YOLCU/OZEL setleri tek ISTISNA'ya daraltıldı (−18, +3 satır)
- `src/calculator/invoice-rules.ts` — 2 import + 2 helper + türevli const'lar; eski hardcoded map'ler silindi (−32, +25)
- `src/config/namespaces.ts` — `customizationId: 'TR1.2'` (1 satır)
- `src/index.ts` — `PROFILE_TYPE_MATRIX` export satırı kaldırıldı (AR-4, −1)
- `__tests__/builders/invoice-builder.test.ts` — TR1.2 assertion + UBLExtensions/Signature testleri silindi
- `__tests__/builders/despatch-builder.test.ts` — TR1.2 assertion (1 satır)
- `__tests__/calculator/document-calculator.test.ts` — IHRACAT testine `type: 'ISTISNA'` defensive (+1 satır)

### Yeni
- `__tests__/calculator/invoice-rules.test.ts` — 8 test (matris simetri + ters simetri + M2 x3 + B-02 + B-77 + M8)
- `audit/sprint-01-implementation-log.md` — bu dosya
- `audit/sprint-01-plan.md` — onaylanan plan kopyası

### Dokunulmayan
- `src/validators/cross-validators.ts` — PROFILE_TYPE_MATRIX direkt import ediyor, zaten iç path'ten alıyor; dokunma gerekmedi
- `src/calculator/invoice-session.ts` — helper imzaları değişmedi
- Diğer serializer/builder dosyaları

## v3 Disiplin — Yapılmayanlar

- ❌ `CHANGELOG.md` oluşturulmadı → Sprint 8'e ertelendi (v3 kararı)
- ❌ `package.json` version bump yok (1.4.2 kalır; Sprint 8'de 2.0.0)
- ❌ Git tag yok → sadece commit + push

## Commit

(Commit hash commit sonrası eklenir.)

## Sonraki Sprint

Sprint 2 — Kod Listeleri + Config-Data-Source. Kapsam: M3 (650 dinamik), M4 (555 flag), M7 (config türev), D1/D2 (package-type-code + payment-means config). Yeni oturum + yeni plan modu.
