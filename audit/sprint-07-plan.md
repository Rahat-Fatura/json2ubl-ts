# Sprint 7 — Test Güncellemeleri

**Tarih:** 2026-04-23
**Tahmini Süre:** 1-2 gün (~8 saat odaklı çalışma)
**Önceki Sprint:** Sprint 6 — Despatch Extensions + Party/Address + Invoice Extensions (commit `3fde82a`, 554/554 yeşil)
**Sonraki Sprint:** Sprint 8a — Devir bulgu temizliği + Mimari kalan (kod sprint'i)

---

## 1. Context

Sprint 7, 8-sprint yol haritasında **saf test sprint**'idir. Kullanıcı Sprint 6 kapanışında Sprint 8'i ikiye böldü:
- **Sprint 8a:** Devir bulgu temizliği + Mimari kalan (O5, O6, B-29..B-31, B-62..B-69, B-78, B-83, B-84..B-86, B-91, B-104, Mimsoft fixture genişletme)
- **Sprint 8b:** Dokümantasyon + CHANGELOG + v2.0.0 release

Sprint 7'nin doğası bu bölünmeyle değişmedi: test-only. Sprint 1-6 süresince 554 test (34 dosya) birikti, ancak FIX-PLANI-v3 §296-315'te listelenen B-T01..B-T10 + B-87 kapsamı **sistematik taranmadı**. Bu sprint bu boşluğu kapatır.

**Problem:** Denetim 03-06'tan çıkan 10 test bulgusu (B-T) + B-87 float edge case bulgusu. Bu bulguların bir kısmı (B-T01/B-T02/B-T03/B-T05) önceki sprintlerde zaten yan-etki olarak kapandı; diğerleri (B-T06/B-T07/B-T09/B-T10) açık. B-T04 ve B-T08 ise kullanıcı kararı + Sprint 8a bağımlılığı nedeniyle ertelenen kategori.

**Amaç:** B-T01..B-T10 + B-87 + Sprint 6 deviri K1/K3/K4 regression guard'ı kapsamını tamamla. Sprint sonunda **577 test yeşil**, tüm B-T bulguları ya kapalı ya Sprint 8a'ya net devredilmiş.

**Sprint 7 disiplini (kod-modifiye-yasak):**
- `src/` değişikliği yapılmaz (tek istisna: yorum ekleme).
- Test yazarken `src/` bug fark edilirse → Sprint 8a'ya ertelenir (TODO yorumu + log).
- `yarn tsc --noEmit` + `yarn test` her alt commit öncesi/sonrası yeşil olmalı.
- N1 placeholder yasak (Sprint 2), xsd-sequence pattern (Sprint 3), structured ValidationError (Sprint 5), alt-commit granülaritesi (Sprint 4-6).
- No-op disiplini: Test zaten varsa EKLENMEZ; sadece grep teyidi + log'a not.

---

## 2. Karar Logu (Plan Modu AskUserQuestion)

| # | Konu | Karar | Gerekçe |
|---|------|-------|---------|
| S1 | B-T04/B-17 stopaj | **İptal + yorum ekle** | Mimsoft teyidi: 1100 davranışı doğru. Test değişmez, üzerine açıklayıcı yorum. |
| S2 | B-T08/B-104 nationalityId | **Sprint 8a'ya devret** | B-104 TCKN validator fix'i Sprint 8a. Test as-is korunur, runtime etkisi yok. |
| S4 | B-T06 profil derinliği | **Her profil 1 minimal** | 7 profil × 1 senaryo = 7 test. Sprint 7 regression guard doğasına uygun. |
| S5 | Cross-cutting consistency | **Sprint 8a'ya ertele** | FIX-PLANI §296-315 Sprint 7 kapsamında yok. Sprint 8a integration test için uygun yer. |
| S3 | Coverage config (sorulmadı) | **Manuel gap analizi** | Vitest coverage config Sprint 8b opsiyonel. Sprint 7 manuel analiz yeterli. |
| S6 | Mimsoft fixture (sorulmadı) | **F10/F11 yeterli** | Yeni fixture (IHRACKAYITLI+702, YATIRIMTESVIK, 351) Sprint 8a'da kullanıcı ekledikten sonra. |

---

## 3. Mevcut Durum

### 3.1 Sprint 6 Kapanış
- Commit: `3fde82a` (Sprint 6.8 B-39/B-71/B-74 Invoice + implementation-log + Sprint 7 devir)
- Test: 503 → 554 (+51), 29 → 34 dosya (+5)
- Devir: B-T01..B-T10, B-87, K1/K3/K4 regression → Sprint 7 | O5, O6, B-29..B-31, B-62..B-69, B-78, B-83, B-84..B-86, B-91, B-104 → Sprint 8a

### 3.2 Test Suite (Sprint 7 Başı, Doğrulandı)
- **Framework:** Vitest (`vitest.config.ts` minimal; coverage config yok)
- **Test sayısı:** 554/554 yeşil, 34 dosya
- **Fixtures:** `__tests__/fixtures/mimsoft-real-invoices/f10-satis-gelir-stopaji.xml`, `f11-satis-kurumlar-stopaji.xml`
- **TypeScript:** strict check temiz

### 3.3 B-T Bulgu Durumu (Commit-Öncesi Grep Teyidi)

| ID | Mevcut Durum | Sprint 7 Eylemi | Tahmin |
|----|--------------|-----------------|--------|
| B-T01 | `grep UBLExtensions __tests__/` boş ✅ (Sprint 1'de silindi) | **No-op** — log'a teyit | 5 dk |
| B-T02 | `grep Signature __tests__/` boş ✅ (Sprint 1'de silindi) | **No-op** — log'a teyit | 5 dk |
| B-T03 | `document-calculator.test.ts:109` `toBe(850)` ✅ (Sprint 4 B-15) | **No-op** — log'a teyit | 5 dk |
| B-T04 | `line-calculator.test.ts:165` `toBe(1100)` — B-17 askıda | **S1 iptal + yorum** | 10 dk |
| B-T05 | `simple-invoice-mapper.test.ts:54-73` ✅ (Sprint 5 B-81) | **No-op** — log'a teyit | 5 dk |
| B-T06 | `document-calculator.test.ts:206-273` 'profil tespiti' yalnız KAMU | **7 yeni test** (YATIRIMTESVIK, ILAC, SGK, ENERJI, IDIS, HKS, OZELFATURA) | 2-3 saat |
| B-T07/B-87 | `toBeCloseTo` genel var, 0.1+0.2 özel edge case yok | **4-6 yeni test** (yeni dosya `float-edge-case.test.ts`) | 1-2 saat |
| B-T08 | 8 lokasyonda `nationalityId: 'TR'` — B-104 bağımlılık | **S2 Sprint 8a'ya devret** | 5 dk (log) |
| B-T09 | `xsd-sequence.test.ts` + `despatch-extensions.test.ts` kısmi; K1/K3/K4 named assert yok | **3-5 yeni test** (despatch-extensions.test.ts'e ekle) | 1-2 saat |
| B-T10 | `grep IDISIRSALIYE __tests__/` boş | **1-2 yeni test** (despatch-builder.test.ts'e ekle) | 1 saat |

### 3.4 Sprint 1-6 Devir Notları
1. **Sprint 3 devri** — Cross-cutting calc-serialize consistency → **S5 Sprint 8a'ya**
2. **Sprint 4 devri** — B-46 kapsama gözden geçirme → Grep teyidi (mevcut toBeCloseTo test'leri kapsar), no-op
3. **Sprint 6 devri** — K1/K3/K4 regression test → **B-T09 içinde uygulanır**

---

## 4. Hedef Durum

| Metrik | Sprint 7 Başı | Sprint 7 Sonu | Delta |
|--------|---------------|---------------|-------|
| Test sayısı | 554 | **~577** | +23 |
| Test dosyası | 34 | **35** | +1 (float-edge-case.test.ts) |
| Kapalı B-T | B-T01/02/03/05 (önceki sprint'lerde) | B-T01..T10 (T04 iptal, T08 Sprint 8a devir) | B-T04, T06, T07, T09, T10 |
| Açık bulgu | B-T06/07/09/10 + K1/K3/K4 regression + B-87 | 0 | — |
| Sprint 8a devir | Mevcut liste | + B-T08 + cross-cutting | +2 madde |

---

## 5. Alt-Commit Planı (4 atomik commit)

### Sprint 7.1 — Plan + No-Op Teyit + B-T04 Yorum (≈45 dk)

**Başlık:** `Sprint 7.1: Plan + B-T01..B-T05 no-op teyit + B-T04/B-T08 karar logu`

**Kapsam:**
- `audit/sprint-07-plan.md` — bu dosyanın kopyası (kullanıcı direktifi, Sprint pattern'i)
- `audit/sprint-07-implementation-log.md` — iskelet (tarih, sprint, toplam_commit: 4, test_durumu)
- **B-T01 no-op:** `grep UBLExtensions __tests__/` → boş ✅ log
- **B-T02 no-op:** `grep Signature __tests__/` → boş ✅ log
- **B-T03 no-op:** `document-calculator.test.ts:109` `toBe(850)` ✅ log
- **B-T05 no-op:** `simple-invoice-mapper.test.ts:54-73` ✅ log
- **B-T04 (S1):** `line-calculator.test.ts:164` üstüne yorum ekle:
  ```ts
  // B-17 + B-T04 iptal (2026-04-23): Mimsoft teyidi — 1100 davranışı doğru.
  ```
- **B-T08 (S2):** No-op, log: "Sprint 8a B-104 TCKN fix'i ile atomik güncellenecek."

**Test sayısı:** 554 → 554 (+0)

**Dosyalar:**
- `audit/sprint-07-plan.md` (yeni)
- `audit/sprint-07-implementation-log.md` (yeni, iskelet)
- `__tests__/calculator/line-calculator.test.ts` (yorum ekleme)

**Validasyon:** `yarn test` → 554/554 yeşil.

---

### Sprint 7.2 — B-T06 Profil Coverage (≈2-3 saat)

**Başlık:** `Sprint 7.2: B-T06 özel profil test coverage (YATIRIMTESVIK/ILAC/SGK/ENERJI/IDIS/HKS/OZELFATURA)`

**Kapsam:**
- `__tests__/calculator/document-calculator.test.ts` 'profil tespiti' describe'ına (satır 206-273) 7 yeni test:
  - `'YATIRIMTESVIK profili tespit edilmeli'`
  - `'ILAC profili tespit edilmeli'`
  - `'SGK profili tespit edilmeli'`
  - `'ENERJI profili tespit edilmeli'`
  - `'IDIS profili tespit edilmeli'`
  - `'HKS profili tespit edilmeli'`
  - `'OZELFATURA profili tespit edilmeli'`

**Her test için minimal SATIS senaryosu:**
- `makeInput({ profile: 'YATIRIMTESVIK' })` (veya profil-uygun tip: OZELFATURA/IHRACAT ISTISNA zorunlu — M2 kuralı)
- `expect(result.profile).toBe('YATIRIMTESVIK')`

**Edge case:**
- **OZELFATURA:** `type: 'ISTISNA'` + exemptionCode='350' override (M2 kuralı).
- **IHRACAT/YOLCU:** Aynı M2 ISTISNA zorunluluk (zaten mevcut test var).

**Test sayısı:** 554 → 561 (+7)

**Dosyalar:**
- `__tests__/calculator/document-calculator.test.ts` (7 yeni test, 'profil tespiti' describe içine)

**Cross-reference:**
- `src/config/constants.ts` PROFILE_TYPE_MATRIX (profil→tip listesi)
- Sprint 1 M2 karar (IHRACAT/YOLCU/OZELFATURA sadece ISTISNA kabul)

**Validasyon:** `yarn test` → 561/561 yeşil.

---

### Sprint 7.3 — Float Edge Case + K1/K3/K4 + B-T09 XSD Sequence (≈2-3 saat)

**Başlık:** `Sprint 7.3: B-T07+B-87 float edge case + K1/K3/K4 regression + B-T09 XSD sequence`

**Kapsam A — Float edge case (yeni dosya):**
- `__tests__/calculator/float-edge-case.test.ts` (4-6 test)
- Senaryolar:
  - `'0.1 + 0.2 çoklu satırda toplam tutar toBeCloseTo ile doğru'`
  - `'33.33 × 0.2 KDV hesabı floating precision'`
  - `'10 × 0.1 multiple addition tam float = 1.0'`
  - `'1/3 × 3 birim fiyatı XML yazımında 2 basamak yuvarlanır (M9)'`
  - `'Σ satır KDV = monetary.taxTotal (floating point hata olmadan)'`

**Kapsam B — K1/K3/K4 Regression Guard:**
- `__tests__/builders/despatch-extensions.test.ts` mevcut dosyaya ekleme (3 test)
- Senaryolar:
  - `'K1 (B-18): IssueTime cbcRequiredTag ile emit edilir'`
  - `'K3 (B-14): Despatch Delivery XSD sequence DeliveryAddress → CarrierParty → DespatchAddress (ordering)'`
  - `'K4 (B-20): PERSON_SEQ DriverPerson FirstName < FamilyName < Title < NationalityID (ordering)'`
- Assertion pattern: `xml.indexOf('<a>') < xml.indexOf('<b>')`

**Kapsam C — B-T09 XSD Sequence:**
- `__tests__/builders/despatch-extensions.test.ts`'e 2 yeni test:
  - `'B-T09: Despatch root sequence CustomizationID < ProfileID < ID < IssueDate'`
  - `'B-T09: Shipment sequence Consignment < GoodsItem < ShipmentStage < Delivery < TransportHandlingUnit'`

**Test sayısı:** 561 → ~575 (+14: 5 float + 3 K1/K3/K4 + 2 XSD + 4 buffer/assertion split)

**Dosyalar:**
- `__tests__/calculator/float-edge-case.test.ts` (yeni)
- `__tests__/builders/despatch-extensions.test.ts` (+5 test ekleme)

**Cross-reference:**
- `src/serializers/xsd-sequence.ts` — XSD_ELEMENTS.DESPATCH_SEQ, PERSON_SEQ, DELIVERY_SEQ
- Sprint 4 M9 (calculator tam float, yuvarlama XML yazım anında)

**Validasyon:** `yarn test` → 575/575 yeşil.

---

### Sprint 7.4 — B-T10 IDISIRSALIYE + Log Finalize + Sprint 8a Devir (≈1-1.5 saat)

**Başlık:** `Sprint 7.4: B-T10 IDISIRSALIYE test + implementation-log + Sprint 8a devir`

**Kapsam A — IDISIRSALIYE (Enum Teyit):**
- Önce `grep IDISIRSALIYE src/` teyidi (Sprint 6.6 O3 runtime whitelist sırasında eklenmiş olmalı).
- Enum yoksa: Sprint 8a'ya ertelet + log (unlikely).
- `__tests__/builders/despatch-builder.test.ts`'e 1-2 yeni test:
  - `'B-T10: IDISIRSALIYE profili + SEVKIYATNO + ETIKETNO emit edilir'`
  - Minimal input: `profileId: DespatchProfileId.IDISIRSALIYE`, `sevkiyatNo`, `etiketNo` (mevcut TEMELIRSALIYE fixture'ını temel al)

**Kapsam B — Log Finalize:**
- `audit/sprint-07-implementation-log.md` bölümleri:
  - **Kapsanan bulgular:** B-T01..B-T10 + B-87 + K1/K3/K4
  - **No-op teyitler:** B-T01, B-T02, B-T03, B-T05 (Sprint 1/4/5 önceki)
  - **Karar logu:** B-T04 S1 iptal, B-T08 S2 Sprint 8a devir
  - **Test artışı:** 554 → 577 (+23), 34 → 35 dosya

**Kapsam C — Sprint 8a Devir Listesi Güncelleme:**
- B-104 TCKN + B-T08 (8 test lokasyonu) atomik
- Cross-cutting calc-serialize consistency test (Sprint 3 + Sprint 7 devri)
- Mimsoft fixture genişletme (IHRACKAYITLI+702, YATIRIMTESVIK, 351) — kullanıcı hazırlığı
- O5 (CarrierParty validateParty), O6 (PartyId schemeID whitelist)
- B-29, B-30, B-31 (Invoice satır validator)
- B-62..B-69 (kontrol yapısı + error mapping)
- B-78 (TEVKIFATIADE), B-83 (KAMU partyType), B-84..B-86 (Tax schema)
- B-91 (satır KDV matematik)

**Sprint 8b Devir:**
- README Sorumluluk Matrisi (M3/M4/M9/M10)
- Skill dokümanları (`kod-listeleri-ubl-tr-v1.42.md §4.9`, `e-fatura-ubl-tr-v1.0.md §77`)
- CHANGELOG.md konsolide (Sprint 1-7 log'ları → v2.0.0 entry)
- package.json 1.4.2 → 2.0.0
- git tag v2.0.0 + push
- B-94 `examples/output/` regenerate (opsiyonel Sprint 8a veya 8b)

**Test sayısı:** 575 → ~577 (+2)

**Dosyalar:**
- `__tests__/builders/despatch-builder.test.ts` (1-2 test ekleme)
- `audit/sprint-07-implementation-log.md` (finalize)

**Validasyon:** `yarn test` → 577/577 yeşil. `yarn tsc --noEmit` temiz.

---

### Commit Özeti

| # | Commit | Tahmin | Test Δ | Toplam |
|---|--------|--------|--------|--------|
| 7.1 | Plan + no-op teyit + B-T04 yorum | 45 dk | 0 | 554 |
| 7.2 | B-T06 profil coverage (7 profil) | 2-3 saat | +7 | 561 |
| 7.3 | B-T07/B-87 float + K1/K3/K4 + B-T09 XSD | 2-3 saat | +14 | 575 |
| 7.4 | B-T10 IDISIRSALIYE + log + devir | 1-1.5 saat | +2 | **577** |
| **TOPLAM** | **4 commit** | **~8 saat** | **+23** | |

---

## 6. Kritik Dosyalar (Okuma + Değiştirme)

**Değiştirilecek (yalnızca `__tests__/` + `audit/`):**
- `__tests__/calculator/document-calculator.test.ts` (B-T06, 7 yeni test)
- `__tests__/calculator/line-calculator.test.ts` (B-T04 yorum, sadece 1 satır)
- `__tests__/builders/despatch-extensions.test.ts` (B-T09 + K1/K3/K4, 5 yeni test)
- `__tests__/builders/despatch-builder.test.ts` (B-T10, 1-2 yeni test)
- `__tests__/calculator/float-edge-case.test.ts` (yeni dosya, B-T07+B-87)
- `audit/sprint-07-plan.md` (yeni, bu dosyanın kopyası)
- `audit/sprint-07-implementation-log.md` (yeni)

**Cross-reference (sadece okuma):**
- `src/config/constants.ts` (PROFILE_TYPE_MATRIX — B-T06 profil-tip mapping)
- `src/config/enums.ts` veya benzeri (DespatchProfileId.IDISIRSALIYE teyit — B-T10)
- `src/serializers/xsd-sequence.ts` (XSD_ELEMENTS sabitleri — B-T09/K3/K4)
- `src/calculator/line-calculator.ts:128-130` (B-T04 yorum bağlamı için referans)

**Kesinlikle DEĞİŞTİRİLMEZ:**
- `src/**/*.ts` (yalnızca 1 yorum satırı istisna: `line-calculator.test.ts` üstü)

---

## 7. Disiplin Notları

- **N1 (Placeholder yasak):** Yeni test isimleri gerçek (`'B-T## — açıklama'`). TODO yalnızca Sprint 8a devir için.
- **M7 Pattern:** Mevcut `makeInput`, fixture helper'ları yeniden kullanılır; yeni helper eklenmez.
- **xsd-sequence.ts Pattern (Sprint 3):** B-T09 ve K3/K4 testleri mevcut `XSD_ELEMENTS.*_SEQ` sabitleriyle çapraz doğrular. Test içinde `xml.indexOf(a) < xml.indexOf(b)` assertion.
- **Structured ValidationError (Sprint 5):** Sprint 7'de yeni validator test yok; mevcut path+code+expected+actual pattern'i değişmez.
- **Alt-commit granülaritesi (Sprint 4-6):** Her commit bağımsız `yarn test` yeşil. Atomik (7.1→7.2→7.3→7.4).
- **No-op disiplini:** B-T01/B-T02/B-T03/B-T05 için grep teyidi yeterli. Test EKLENMEZ.
- **Sprint 7 özel (read-only src/):**
  - Tek istisna: `line-calculator.test.ts` üstüne 1 satır yorum (B-T04 S1).
  - Bug fark edilirse → Sprint 8a'ya TODO + log.
- **Breaking Change:** v3 dev bağlamda endişe yok. Test-only sprint'te zaten public API değişmez.

---

## 8. Risk ve Edge Case

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| B-T06 profillerde runtime validator eksik → test kırmızı | Orta | Orta | Minimal senaryo (profile override + profile assert); validator tetiklemez. |
| B-T06 YATIRIMTESVIK/ILAC/SGK PROFILE_TYPE_MATRIX'te eksik → `calculateDocument` reject | Düşük | Orta | Sprint 7.2 başı `grep profil src/config/constants.ts` teyit; eksik varsa Sprint 8a'ya ertelet + log. |
| Float edge case (B-T07) `toBe` kullanımı → flaky | Düşük | Orta | Tüm float assertion `toBeCloseTo(val, 2)`; `toBe` sadece integer. |
| K1/K3/K4 indexOf assertion Sprint 6 emit sırasına özel — kod değişirse kırılır | Orta | Düşük | XSD_ELEMENTS.*_SEQ sabitleriyle çapraz doğrula (kod + test aynı truth source). |
| IDISIRSALIYE enum değeri `src/config/enums.ts`'te yoksa B-T10 kırılır | Düşük | Düşük | Sprint 7.4 başı grep teyit; eksik varsa Sprint 8a'ya ertelet. |
| Sprint 7 testleri Sprint 8a kod değişikliklerinde kırılabilir | Orta | Düşük | Sprint 8a'nın sorumluluğu; Sprint 7 test güncelliğini korumaya değil kapsamı tamamlamaya bakar. |

### Edge Case Kontrol Listesi
- **B-T06 OZELFATURA:** M2 kuralı gereği `type: 'ISTISNA'` + exemptionCode zorunlu.
- **B-T07 float zero:** `0.0 + 0.0` → `toBe(0)` veya `toBeCloseTo(0, 2)` ikisi de kabul.
- **K1 IssueTime:** `cbcRequiredTag` pattern; happy path test (boş string validator'a düşer, o ayrı test).
- **B-T09 Shipment sequence:** Sprint 6.4 TransportHandlingUnit Delivery sonrası; ShipmentStage zaten Delivery'den önce.
- **B-T10 IDISIRSALIYE:** TEMELIRSALIYE fixture'ı temel alır; sevkiyatNo + etiketNo input alanları mevcut olmalı.

---

## 9. Kapsam Dışı (Sprint 8a / Sprint 8b Devir)

### 9.1 Sprint 8a Kapsamına

- **B-T08 + B-104** — TCKN 11-hane validator + 8 test lokasyonu atomik güncelleme
- **Cross-cutting calc-serialize consistency test** — S5 Sprint 3+7 devri (integration test)
- **Mimsoft fixture genişletme** — IHRACKAYITLI+702, YATIRIMTESVIK, 351 için yeni XML + regresyon testleri
- **O5** — CarrierParty VKN/TCKN validateParty helper refactor
- **O6** — PartyIdentification schemeID whitelist runtime
- **B-29, B-30, B-31** — Invoice satır validator genişlemesi
- **B-62..B-69** — Kontrol yapısı + error mapping refactor
- **B-78** — TEVKIFATIADE custom tip
- **B-83** — KAMU partyType mapping
- **B-84, B-85, B-86** — Tax schema + açık kodlar
- **B-91** — Satır KDV matematik doğrulama

### 9.2 Sprint 8b Kapsamına

- **README Sorumluluk Matrisi** — M4 (555 flag), M3 (650 dinamik), M10 (isExport+liability), M9 (yuvarlama)
- **Skill dokümanları** — kod-listeleri-ubl-tr-v1.42.md §4.9, e-fatura-ubl-tr-v1.0.md §77
- **CHANGELOG.md** — Sprint 1-7 log → v2.0.0 tek entry
- **package.json** — 1.4.2 → 2.0.0
- **git tag v2.0.0** + push
- **Coverage config** (opsiyonel, Sprint 8b'de ele alınabilir)
- **B-94** `examples/output/` regenerate (opsiyonel, Sprint 8a veya 8b)

---

## 10. Verification / Test Stratejisi

### Adım Adım Doğrulama

Her alt commit sonunda:
1. `yarn tsc --noEmit` — TypeScript strict yeşil olmalı.
2. `yarn test` — Tüm testler yeşil, test sayısı beklenen delta ile eşleşmeli.
3. `git diff --stat` — Yalnızca `__tests__/` + `audit/` altında değişiklik (tek istisna: 7.1'de `line-calculator.test.ts` üstü yorum).

### Sprint Sonu Doğrulama

- Test sayısı: **577 yeşil** (±2 fark kabul — assertion split'lerden kaynaklanabilir).
- Test dosyası: **35** (1 yeni: `float-edge-case.test.ts`).
- `grep -rn "skip\|TODO.*Sprint" __tests__/` — Hiçbir `.skip` olmamalı (B-T08 S2 Sprint 8a devir → `.skip` değil, no-op).
- `audit/sprint-07-implementation-log.md` — Kapsanan bulgular, no-op teyitler, karar logları, Sprint 8a/8b devir listesi tam.
- Sprint 8a devir listesi güncel (`sprint-06-implementation-log.md` §223'teki orijinal listeye B-T08 + cross-cutting eklenmeli).

### Sprint 7 Sonrası Kontrol Listesi

- [ ] 554 → 577 test (`yarn test`)
- [ ] 34 → 35 dosya (`ls __tests__/**/*.test.ts | wc -l`)
- [ ] B-T01..B-T07, B-T09, B-T10, B-87, K1/K3/K4 kapalı
- [ ] B-T04 iptal + yorum ile kapalı; B-T08 Sprint 8a devir logu
- [ ] `yarn tsc --noEmit` yeşil
- [ ] `audit/sprint-07-implementation-log.md` finalize
- [ ] Sprint 8a devir listesi güncel
- [ ] 4 commit, her biri bağımsız yeşil (7.1, 7.2, 7.3, 7.4)
- [ ] `git log --oneline -4` Sprint 7.1-7.4 commit başlıkları görünür

---

## 11. Tahmini Süre

| Alt Commit | Tahmin | Açıklama |
|------------|--------|----------|
| 7.1 | 45 dk | Plan kopyala + grep teyit + B-T04 yorum + log iskelet |
| 7.2 | 2-3 saat | 7 profil test (YATIRIMTESVIK, ILAC, SGK, ENERJI, IDIS, HKS, OZELFATURA) |
| 7.3 | 2-3 saat | 4-6 float edge + 3 K1/K3/K4 + 2 B-T09 XSD sequence |
| 7.4 | 1-1.5 saat | 1-2 IDISIRSALIYE + log finalize + Sprint 8a devir |
| **TOPLAM** | **~8 saat** | **1 tam gün + 1 yarım gün buffer = 1-2 gün** |

FIX-PLANI-v3 tahmini 1-2 gün ile uyumlu. Sprint 7 kısa sprint disiplini korunuyor.
