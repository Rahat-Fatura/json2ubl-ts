---
sprint: 5
baslik: Validator Kapsamı + TaxExemption Cross-Check Matrisi
tarih: 2026-04-22
plan: audit/sprint-05-plan.md
toplam_commit: 6 (Sprint 5.1 … 5.7; 5.4 ve 5.6 diğer commit'lere dahil edildi)
test_durumu: 503/503 yeşil (29 dosya)
---

# Sprint 5 İmplementasyon Günlüğü

Sprint 5 planı (`audit/sprint-05-plan.md`) 6 mantıksal alt commit halinde uygulandı.
Ana tema: **domain-ağır validator genişlemesi** — TaxExemption cross-check matrisi (B-06),
IHRACKAYITLI + 702 + CustomsDeclaration (B-07 + Açık Soru #14), Yatırım Teşvik KDV
kuralları (B-08) ve 351 kodu full cross-check (M5).

Tüm commit'lerde `yarn test` yeşil; `yarn typecheck` temiz. Sprint 1–4 davranışı
değişmedi (mevcut 375 test korunmuş, 128 yeni test eklenmiş).

## Commit Özeti

| # | Commit | Hash | Kapsam |
|---|---|---|---|
| 5.1 | Plan + YATIRIM_TESVIK sabitler + TAX_EXEMPTION_MATRIX iskelet | `2448eb6` | `audit/sprint-05-plan.md`, `constants.ts` (2 sabit), `cross-check-matrix.ts` iskelet + 10 smoke test |
| 5.2 | B-06 + M5 matris full + cross-validator entegrasyon | `df4e6a0` | matris full (M7 türetme) + `validateTaxExemptionMatrix` entegrasyonu + 84 test |
| 5.3 | B-14 CustomsDeclaration tipi + serializer + B-07 validateIhrackayitli702 | `fc16d37` | `common.ts` 4 tip, `xsd-sequence.ts` 2 SEQ, `delivery-serializer.ts` CustomsDeclaration emit, `ihrackayitli-validator.ts` + 11 test |
| 5.4 | B-07 validateIhrackayitli702 | — | **Sprint 5.3 ile birleştirildi** (B-07 B-14 input/serializer'a bağımlı) |
| 5.5 | B-08 validateYatirimTesvikKdv{Document,Line} | `8c63d6f` | `yatirim-tesvik-validator.ts` + cross-validators entegrasyonu + 23 test |
| 5.6 | KamuFaturaCheck TR IBAN | — | **Mevcut kod zaten uyguluyor** (`profile-validators.ts:152-186` `validateKamu`, Sprint 1). Ek iş gerekmedi. |
| 5.7 | Implementation-log + audit güncellemesi + Sprint 8 devir | (bu commit) | Bu dosya + SONUC-konsolide/FIX-PLANI-v3 güncellemeleri |

Her alt commit öncesi `yarn test` yeşil tutuldu. Kümülatif test sayısı:
375 → 385 (5.1) → 469 (5.2) → 480 (5.3) → 503 (5.5) = **+128 test**.

---

## Kapsanan Bulgular

### B-06 (KRİTİK) — TaxExemption cross-check (kod↔tip) mimarisi

- **Commit:** 5.1 + 5.2
- **Dosyalar:**
  - `src/validators/cross-check-matrix.ts` (yeni, 175 satır)
  - `src/validators/cross-validators.ts` (`validateTaxExemptionMatrix` + `validateCrossMatrix` §2)
- **Mimari:** Seçenek A (Öneri Kod Başına Entry) — `Map<string, TaxExemptionRule>` O(1) lookup.
  M7 türetme pattern'i: `EXEMPTION_DEFINITIONS.documentType` → `allowedInvoiceTypes` mapping
  otomatik, 151/351 özel kurallar manuel override.
- **Normatif kaynak:** UBL-TR Common Schematron `TaxExemptionReasonCodeCheck` (satır 316,
  318, 320, 322, 451).
- **Gruplar:**
  - `ISTISNA` grubu (201-250, 301-350, 54 kod): ISTISNA/IADE/IHRACKAYITLI/SGK/YTBISTISNA/YTBIADE
  - `IHRACKAYITLI` grubu (701-704): IHRACKAYITLI/IADE
  - `OZELMATRAH` grubu (801-812): OZELMATRAH/IADE/SGK
  - `SGK` grubu (SAGLIK_*, ABONELIK, MAL_HIZMET, DIGER): SGK
  - `151` (OTV SATIS): SATIS/TEVKIFAT/KOMISYONCU
  - `351` (M5 özel): aşağıda
- **Matris dışı (bilinçli):**
  - `555` M4 flag bypass (matris'te yok, `reduced-kdv-detector.ts` ayrı gate)
  - `501` exemption-config'de yok — UNKNOWN_EXEMPTION_CODE döner
- **Breaking change:** Evet. Önceden tipe-göre-dispatch olan `validateByType` şimdi
  matris üzerinden ikinci bir geçişle kontrol ediliyor (cross-validators'a delege).
  Örn: SATIS+308 artık `INVALID_EXEMPTION_FOR_TYPE` döner (Schematron ile uyumlu).

### B-07 (KRİTİK) — IHRACKAYITLI + 702 validator + CustomsDeclaration input/serializer

- **Commit:** 5.3
- **Dosyalar:**
  - `src/validators/ihrackayitli-validator.ts` (yeni, 105 satır)
  - `src/types/common.ts` (`TransportHandlingUnitInput.customsDeclarations`,
    `CustomsDeclarationInput`, `CustomsDeclarationIssuerPartyInput`, `PartyIdentificationInput`)
  - `src/serializers/xsd-sequence.ts` (`TRANSPORT_HANDLING_UNIT_SEQ`, `CUSTOMS_DECLARATION_SEQ`)
  - `src/serializers/delivery-serializer.ts` (CustomsDeclaration + PartyIdentification emit)
- **Normatif kaynak:** Schematron satır 322 (GTİP 12 + ALICIDIBSATIRKOD 11) + satır 451
  (`IhracKayitliPartyIdentificationIDType` whitelist = SATICIDIBSATIRKOD | ALICIDIBSATIRKOD).
- **Davranış:** Tetikleyici `invoiceTypeCode=IHRACKAYITLI AND` bir satır taxSubtotal'da
  `taxExemptionReasonCode=702`. Her satır için:
  1. `delivery.shipment.goodsItems[].requiredCustomsId.length === 12`
  2. `transportHandlingUnits[].customsDeclarations[].issuerParty.partyIdentifications[]`
     içinde en az bir `schemeID='ALICIDIBSATIRKOD' AND id.length===11`
  3. Tüm CustomsDeclaration schemeID'leri whitelist'te
- **Yeni error code'ları:** `IHRACKAYITLI_702_REQUIRES_GTIP`,
  `IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD`, `IHRACKAYITLI_INVALID_SCHEME_ID`.

### B-08 (KRİTİK) — YatirimTesvikKDVCheck + LineKDVCheck

- **Commit:** 5.5
- **Dosya:** `src/validators/yatirim-tesvik-validator.ts` (yeni, 139 satır)
- **Normatif kaynak:** Schematron satır 483-490 (Doc + Line + Harcama Tipi 03/04).
- **Kapsam:** `ProfileID=YATIRIMTESVIK` veya `ProfileID=EARSIVFATURA AND InvoiceTypeCode ∈
  YATIRIM_TESVIK_EARSIV_TYPES`; `YATIRIM_TESVIK_IADE_TYPES` hariç.
- **Kurallar:**
  - Doc: `input.taxTotals[].taxSubtotals[]` içindeki tüm KDV (0015) subtotal'lar
    `taxAmount>0 AND percent>0` + en az bir tane olmalı.
  - Line: Her satırda en az bir KDV subtotal `taxAmount>0 AND percent>0`.
  - Line Harcama Tipi 03/04: KDV `taxAmount>0` yeterli (percent muafiyeti).
- **Yeni error code'ları:** `YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT`,
  `YATIRIMTESVIK_KDV_REQUIRED_LINE`, `YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED`.

### M5 — 351 kodu full cross-check

- **Commit:** 5.1 + 5.2
- **Karar kaynağı:** `ACIK-SORULAR.md #12` + kullanıcı cevabı (Soru 2 — Sprint 5 plan).
- **Semantik:** 351 "KDV İstisna Olmayan Diğer" kodu:
  - **Allowed:** SATIS, TEVKIFAT, KOMISYONCU, HKSSATIS, HKSKOMISYONCU, KONAKLAMAVERGISI,
    TEKNOLOJIDESTEK, YTBSATIS, YTBTEVKIFAT, **SGK** (kullanıcı SGK+351 izinli dedi).
  - **Forbidden:** ISTISNA, IADE, YTBISTISNA, YTBIADE, TEVKIFATIADE, YTBTEVKIFATIADE,
    **IHRACKAYITLI** (kullanıcı 701-704 kullanır dedi).
  - **`requiresZeroKdvLine: true`** — kullanıcı "kalemde KDV 0 varsa şart" dedi.
- **Sprint 4 B-81 minimal fix ilişkisi:** `simple-invoice-mapper.ts:237-253`
  `shouldAddExemption` TEVKIFAT+351 minimal fix **değişmedi** (mapper ileti davranışı
  korunur); M5 validator katmanı ayrı gate olarak devreye girer.

### Açık Soru #14 — CustomsDeclaration desteği

- **Commit:** 5.3 (B-07 ile birlikte)
- **Kapsam:** `CustomsDeclarationInput` + `PartyIdentificationInput` tipleri, XSD sequence
  eklemeleri, serializer XML emit.
- **NOT — SONUC-konsolide B-14 ile karıştırma:** `SONUC-konsolide-bulgular.md:196` B-14
  "Despatch Shipment/Delivery çocuk sırası XSD ihlali" (irsaliye serializer sorunu —
  Sprint 6 kapsamında). Sprint 5'te kapsanan "CustomsDeclaration" özelliği **Açık Soru #14**
  (IHRACKAYITLI + 702 için gerekli tip + serializer).

### KamuFaturaCheck (TR IBAN) — Sprint 1'de zaten uygulandı

- **Commit:** — (yeni iş gerekmedi)
- **Mevcut kod:** `src/validators/profile-validators.ts:152-186` `validateKamu` fonksiyonu
  Sprint 1 döneminde eklenmiş. TR_IBAN_REGEX kontrolü + PaymentMeans zorunluluğu.
- **Schematron:** satır 519-521 KamuFaturaCheck birebir uygulanıyor.
- **Sonuç:** Sprint 5.6 planlı iş mevcut kod tarafından sağlandığı teyit edildi;
  ek validator eklenmedi. Planı sadeleştirmek için ayrı commit açılmadı.

---

## Yeni Error Code Tablosu

Sprint 5'te eklenen error code'ları (TR mesaj, EN code):

| Code | Kaynak |
|---|---|
| `UNKNOWN_EXEMPTION_CODE` | cross-check-matrix |
| `INVALID_EXEMPTION_FOR_TYPE` | cross-check-matrix |
| `FORBIDDEN_EXEMPTION_FOR_TYPE` | cross-check-matrix (351 yasağı) |
| `EXEMPTION_REQUIRES_ZERO_KDV_LINE` | cross-check-matrix (351 ZeroKdv) |
| `IHRACKAYITLI_702_REQUIRES_GTIP` | ihrackayitli-validator |
| `IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD` | ihrackayitli-validator |
| `IHRACKAYITLI_INVALID_SCHEME_ID` | ihrackayitli-validator |
| `YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT` | yatirim-tesvik-validator |
| `YATIRIMTESVIK_KDV_REQUIRED_LINE` | yatirim-tesvik-validator |
| `YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED` | yatirim-tesvik-validator |

**Toplam:** 10 yeni error code. Mevcut `ValidationError` interface
(`{ code, message, path?, expected?, actual? }`) korundu; `args` field'ı eklenmedi (YAGNI).

---

## Yeni Dosyalar

- `src/validators/cross-check-matrix.ts` (175 satır)
- `src/validators/ihrackayitli-validator.ts` (105 satır)
- `src/validators/yatirim-tesvik-validator.ts` (139 satır)
- `__tests__/validators/tax-exemption-matrix.test.ts` (340 satır, 94 test)
- `__tests__/validators/ihrackayitli-validator.test.ts` (242 satır, 11 test)
- `__tests__/validators/yatirim-tesvik-validator.test.ts` (263 satır, 23 test)
- `audit/sprint-05-plan.md` (yeni, plan dosyasının kopyası — Sprint 5.1 disiplin adımı)
- `audit/sprint-05-implementation-log.md` (bu dosya)

## Değişen Dosyalar

- `src/config/constants.ts` (+18 satır — YATIRIM_TESVIK_IADE_TYPES, YATIRIM_TESVIK_EARSIV_TYPES)
- `src/validators/cross-validators.ts` (28 → ~100 satır — tax-exemption + 702 + yatirimtesvik
  entegrasyonları)
- `src/types/common.ts` (+28 satır — CustomsDeclaration tipler, TransportHandlingUnitInput genişletme)
- `src/serializers/xsd-sequence.ts` (+41 satır — TRANSPORT_HANDLING_UNIT_SEQ, CUSTOMS_DECLARATION_SEQ)
- `src/serializers/delivery-serializer.ts` (+23 satır — CustomsDeclaration XML emit)
- `__tests__/validators/cross-validators.test.ts` (`createMinimalInput` fixture 0 → 18 KDV
  güncelle — B-08 scope uyumu)

## Kapsam Dışı (Sprint 8'e Devir)

1. **B-83 — KAMU `BuyerCustomerInput.partyType`** (Sprint 4+5 ertelendi).
   - `BuyerPartyType` tip genişletmesi (`'KAMU'` ekleme)
   - `simple-invoice-mapper.ts` KAMU branch
   - `party-serializer.ts` KAMU PartyIdentification mapping
   - Test fixture'ları
2. **Mimsoft gerçek fatura fixture'ları** (kullanıcı cevabı: üretimde henüz yok).
   - IHRACKAYITLI + 702, YATIRIMTESVIK + YTB tipleri, SATIS + 351 KDV=0 kalem
   - Prod'a yaklaşırken regresyon testi için Sprint 8'de eklenecek.
3. **Diğer FIX-PLANI-v3 Sprint 5 bulguları** (B-29/30/31, B-62..B-69, B-78, B-84..B-86,
   B-91, B-104). Kullanıcı prompt'unda sadece B-06/07/08 + M5 + Açık Soru #14 + B-83
   vurgulandığı için diğerleri Sprint 6+'e ertelendi. v3'ü güncellemek Sprint 5.7 kapsamında.

## Riskler — Gözlem Sonuçları

| ID | Risk | Durum |
|---|---|---|
| R1 | Matris eksik kombinasyon | Düşük — UNKNOWN_EXEMPTION_CODE default + 94 kombinatorik test |
| R2 | Schematron-kütüphane uyumsuzluğu | Düşük — rule XML'leri validator JSDoc'larına yorum olarak gömülü |
| R3 | 351 semantiği kullanıcı beklentisinden farklı | Çözümlendi — ACIK-SORULAR #12 + Soru 2 cevabı onaylandı |
| R4 | Codelist 79 kod ↔ config 99 entry fark | Analiz Sprint 6+'e ertelendi (Sprint 5 kapsam dışı) |
| R5 | CustomsDeclaration XSD sequence | Düşük — Sprint 3 `xsd-sequence.ts` pattern + snapshot test |
| R6 | B-81 mapper minimal fix çakışması | Çözümlendi — mapper davranışı değişmez, validator ayrı katman |
| R7 | Sentetik fixture Mimsoft formatına uymaması | Kabul edildi — Sprint 8'de Mimsoft fixture ile regresyon |

---

## Sonuç

Sprint 5 tamamlandı. Validator kapsamı TaxExemption kod↔tip matrisi, IHRACKAYITLI + 702,
Yatırım Teşvik KDV kuralları ve 351 kodu full cross-check ile genişletildi. Schematron
rule'larla birebir uyum sağlandı; 10 yeni error code eklendi.

**Sonraki sprint:** Sprint 6 — Despatch extensions (B-14 Despatch sequence, B-19,
B-48-B-53, AR-2).
