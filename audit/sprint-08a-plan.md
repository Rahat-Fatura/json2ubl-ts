# Sprint 8a — Plan

**Plan tarihi:** 2026-04-23
**Hedef sürüm:** v2.0.0 (kod kilitlemeden önceki son kod sprint'i)
**Bir sonraki sprint:** Sprint 8b (dokümantasyon + release + tag)
**Test durumu (giriş):** 573 yeşil / 35 dosya / TypeScript strict clean
**Plan hedefi (çıkış):** ~630-645 yeşil / ~38-40 dosya

---

## Context

Sprint 1-7 tamamlandı, FIX-PLANI-v3'teki **108 net bulgudan 103'ü kapatıldı, 5'i iptal edildi**. Sprint 5 kullanıcı direktifi ile dar kapsam tutuldu; **B-29..B-31, B-62..B-69, B-78, B-84..B-86, B-91, B-104** Sprint 6+'e ertelenmiş, Sprint 6 ve 7 bu listeyi almadı. Sprint 7 sadece **B-T08**'i ekledi ve 2 cross-cutting iş daha (Mimsoft fixture genişletme, calc↔serialize integration test) devretti. Sprint 8a bu birikmiş 18 + 3 = **21 iş paketini** kapatacak; sonrasında Sprint 8b saf release operasyonu (CHANGELOG, package.json bump, git tag) olur.

Kullanıcı ayrıca **6 yeni Mimsoft üretim fixture'ı** (f12-f17) ekledi; bunlar Sprint 8a validator'ları için **regresyon kaynağı** olarak kullanılacak.

Mimari düzeyde **M1-M10 ve AR-1..AR-8 kararlarının tamamı alınmış ve uygulanmıştır** — Sprint 8a **yeni mimari karar gerektirmez**, yalnızca mevcut kararların kapsadığı validator/serializer/tip genişletmelerini tamamlar.

---

## 1. Devir Bulguları Özeti

### Sprint 5'ten devreden (kullanıcı prompt'u ile dar kapsam, FIX-PLANI-v3 §243-246)
| ID | Özet | Dosya | Severity |
|----|------|-------|----------|
| **B-29** | IHRACAT satır PriceAmount/LineExtensionAmount zorunluluğu kontrolü yok | `src/validators/profile-validators.ts:50-108` | YÜKSEK |
| **B-30** | SATIS'ta WithholdingTaxTotal varsa tip→stopaj ters yön kontrolü yok | `src/validators/type-validators.ts:27-29,93-130` | YÜKSEK |
| **B-31** | IADE grubu için DocumentTypeCode='IADE' zorunluluğu yok (sadece ID 16-hane) | `src/validators/type-validators.ts:63-90` | YÜKSEK |
| **B-62** | 1460415308 VKN cross-check (YOLCU/IHRACAT/OZELFATURA/KAMU zorunlu) yok | `src/validators/common-validators.ts:119-154` | ORTA |
| **B-63** | 7750409379 VKN cross-check (SGK/TEVKIFAT zorunlu) yok | `src/validators/common-validators.ts` | ORTA |
| **B-64** | EXCHANGE_RATE_REGEX tanımlı ama kullanılmıyor (dead) | `src/validators/common-validators.ts:55-57` | ORTA |
| **B-65** | IssueDate aralık kontrolü (2005 ↔ bugün) yok | `src/validators/common-validators.ts:38-42` | ORTA |
| **B-66** | MATBUDAN AdditionalDocumentReference ID+IssueDate dolu kontrolü yok | `src/validators/despatch-validators.ts:138-142` | ORTA |
| **B-67** | YTB ISTISNA satır CalculationSequenceNumeric=-1 zorunluluğu yok | `src/validators/profile-validators.ts:227-318` | ORTA |
| **B-68** | Invoice + Despatch ProfileID whitelist runtime kontrolü yok (`as any` atlatılabilir) | `src/validators/common-validators.ts:30-32`, `src/validators/despatch-validators.ts:32-38` | ORTA |
| **B-69** | `PARTY_IDENTIFICATION_SCHEME_IDS` constants tanımlı ama validator'da çağrılmıyor (3 denetim teyidi) | `src/validators/common-validators.ts:119-154` | ORTA |
| **B-78** | `validateInvoiceState` 5+ Schematron kuralı eksik (555, YATIRIMTESVIK KDV, 702 satır, 4171, YOLCU/IHRACAT party detay) | `src/calculator/invoice-rules.ts:312-392` | ORTA |

### Sprint 3-5'ten devreden
| ID | Özet | Dosya | Severity |
|----|------|-------|----------|
| **B-83** | KAMU BuyerCustomerParty aracı kurum PartyIdentification serializer eşlemesi eksik (Sprint 3'te "serializer tema uyumsuz" gerekçesiyle ertelendi) | `src/calculator/simple-invoice-mapper.ts:562-566` | ORTA |
| **B-84** | `DespatchLineId` numeric kontrolü yok (CommonSchematron:717-719) | `src/validators/despatch-validators.ts:124-127` | ORTA |
| **B-85** | CarrierParty PartyIdentification alt validasyonu yok (VKN/TCKN format + schemeID whitelist) | `src/validators/despatch-validators.ts` | ORTA |
| **B-86** | MATBUDAN + DocumentType='MATBU' cross-check eksik (skill sıkı, Schematron gevşek) | `src/validators/despatch-validators.ts:137-143` | ORTA |
| **B-91** | UBLVersion/CustomizationID/CopyIndicator runtime kontrolü yok (serializer hardcode → **etki yok**) | `src/validators/common-validators.ts` | **DÜŞÜK** |

### Sprint 7'den devreden
| ID | Özet | Dosya |
|----|------|-------|
| **B-T08 + B-104 (atomik)** | DriverPerson `nationalityId` 11-hane TCKN validator + 8 test lokasyonda `nationalityId: 'TR'` → geçerli TCKN | `src/validators/despatch-validators.ts:106-108` + 4 test dosyası |
| **Cross-cutting calc-serialize consistency test** | Integration: calculator monetary → XML serialize → XML parse round-trip assert | `__tests__/integration/` (yeni) |
| **Mimsoft fixture regresyon** | f12-f17 6 yeni üretim fatura XML'i için snapshot/validator/calculator testleri | `__tests__/calculator/mimsoft-*.test.ts` + `__tests__/validators/` |

**Oportunistik (Sprint 7.2'de kapsam dışı bırakılan):**
- SGK `InvoiceTypeCode` + default TICARIFATURA profili testi (opsiyonel)
- YOLCUBERABERFATURA profili ISTISNA zorunlu M2 coverage (opsiyonel)

### Ek hijyen işi
- **F12 dosya adı düzeltmesi:** `f12_ihrachkayitli-702.xml.xml` (çift `.xml` + tire yerine alt çizgi + `ihrach` yazım hatası) → `f12-ihrackayitli-702.xml` (git mv). Dosya henüz tracked değil, ilk commit'te temiz adla eklenir.

---

## 2. Sprint 8a Kapsamı — Gruplanmış İş Paketleri

### Paket A — Common Validators runtime katmanı (B-62, B-63, B-64, B-65, B-68, B-69)
**Dosya:** `src/validators/common-validators.ts`
**İş:**
- B-64: Mevcut `EXCHANGE_RATE_REGEX` aktif edilip `validateExchangeRate` helper çağrılır.
- B-65: `DATE_REGEX` sonrası aralık assertion (`2005-01-01 ≤ d ≤ today`).
- B-68: Invoice `profileId` için runtime whitelist (PROFILE_TYPE_MATRIX anahtar kümesi).
- B-62 + B-63: `validateSpecialVKN` helper — 1460415308 & 7750409379 VKN'leri için profil/tip cross-check (config-derived, M7 pattern).
- B-69: Mevcut `PARTY_IDENTIFICATION_SCHEME_IDS` sabiti `validateParty` içinden çağrılır (tüm `additionalIdentifiers.schemeID` için whitelist).

### Paket B — Type/Profile validators (B-29, B-30, B-31, B-67, B-78)
**Dosyalar:** `src/validators/profile-validators.ts`, `src/validators/type-validators.ts`, `src/calculator/invoice-rules.ts`
**İş:**
- B-29: IHRACAT profilinde her satır `priceAmount > 0` AND `lineExtensionAmount > 0` zorunlu.
- B-30: `type-validators` ters yön — SATIS/TICARIFATURA (ve TEVKIFAT/IADE/SGK/SARJ/SARJANLIK dışı tipler) için `withholdingTaxTotal` verilemez.
- B-31: IADE grubu `billingReferenceId` varsa `documentTypeCode === 'IADE'` zorunlu.
- B-67: YATIRIMTESVIK + ISTISNA satır için `calculationSequenceNumeric === -1` zorunlu.
- B-78: `validateInvoiceState` içinde 5 eksik Schematron paraleli kural — 555 KDV, YATIRIMTESVIK KDV belge/satır, 702 satır GTİP+AlıcıDİB, 4171 tip sınırlaması (TEVKIFAT/IADE/SGK/YTBIADE), YOLCU+IHRACAT party zorunlulukları.

### Paket C — Despatch validators (B-66, B-84, B-85, B-86, B-104)
**Dosyalar:** `src/validators/despatch-validators.ts`
**İş:**
- B-66: MATBUDAN liste boş-değilliğine ek olarak her item için `id` + `issueDate` non-empty.
- B-84: `despatchLineId` için `Number.isFinite(Number(id))` kontrolü.
- B-85: CarrierParty için `validateParty` çağrısı (B-69 sonrası zaten schemeID whitelist içerir).
- B-86: MATBUDAN entry için `documentType === 'MATBU'` sabit check (skill §6.2).
- B-104: `driverPerson.nationalityId` için 11-hane TCKN kontrolü (TR ISO reddi).

### Paket D — KAMU serializer düzeltmesi (B-83)
**Dosya:** `src/calculator/simple-invoice-mapper.ts:562-566`
**İş:** KAMU BuyerCustomer `partyIdentification` çıktısı; yapı `InvoiceInput.buyerCustomer.party.additionalIdentifiers` taşınır, serializer mevcut `additionalIdentifiers` yolunu kullanır (yeni tema gerekmez — Sprint 3'teki "serializer tema uyumsuz" notu AR-1 (`cbcRequired/cbcOptional`) sonrası çözülmüş durumdadır; yapı sadece mapper'da kullanılmıyor).

### Paket E — B-T08 + B-104 atomik test güncellemesi
**Dosyalar:**
- `__tests__/builders/despatch-builder.test.ts:43, 217, 218, 245, 247` (5 lokasyon)
- `__tests__/builders/despatch-extensions.test.ts:42`
- `__tests__/serializers/sequence.test.ts:180`
- `__tests__/validators/despatch-validators-o3o4o7.test.ts:42`

**İş:** B-104 validator eklendikten sonra aynı commit'te 8 lokasyonda `nationalityId: 'TR'` → `nationalityId: '12345678901'`. Ek 2 yeni test:
- `B-104: nationalityId='TR' validator reddediyor (UblBuildError)`
- `B-104: nationalityId=geçerli TCKN kabul ediliyor`

### Paket F — Cross-cutting calc↔serialize integration test
**Dosya:** `__tests__/integration/calc-serialize-roundtrip.test.ts` (yeni)
**İş:** 3 senaryo için `calculateDocument(input) → serialize(result) → parseXML(xml) → extract totals → assert monetary eşitliği`:
- SATIS + KDV
- SATIS + stopaj (f10 pattern)
- YATIRIMTESVIK (f13 pattern)

### Paket G — Mimsoft fixture regresyon suite
**Dosyalar:**
- `__tests__/calculator/mimsoft-stopaj.test.ts` (mevcut — f10/f11 genişletmek)
- `__tests__/calculator/mimsoft-f12-f17.test.ts` (yeni)
- `__tests__/validators/mimsoft-validators.test.ts` (yeni)

**İş:** Fixture kullanım planı §4'te detaylandırılmıştır.

### Paket H — Oportunistik (opsiyonel, kapasiteye göre)
- SGK `InvoiceTypeCode` testi → `__tests__/calculator/document-calculator.test.ts` (+1 test)
- YOLCUBERABERFATURA M2 ISTISNA coverage → `__tests__/validators/profile-validators.test.ts` (+1 test)

### Paket I — Hijyen
- `git mv __tests__/fixtures/mimsoft-real-invoices/f12_ihrachkayitli-702.xml.xml __tests__/fixtures/mimsoft-real-invoices/f12-ihrackayitli-702.xml` (henüz untracked — ilk commit'te temiz adla eklenir)
- B-91 Sprint 8a'dan **çıkarılır** — FIX-PLANI-v3 §925-930 "serializer hardcode → Etki: —" netliğiyle post-v2.0.0'a ertelenir (risk yok).

---

## 3. Kapsam Dışı Bırakılanlar

### Sprint 8b'ye (doküman + release)
- **B-92** — `examples/output/*.xml` regenerate (Sprint 1-7 tüm src değişimleri sonrası)
- **B-93** — `ublExtensionsPlaceholder` dead code + test cleanup
- **B-94** — `examples/README.md` + workflow doc
- **B-95, B-96, B-102** — README Sorumluluk Matrisi (M3 650 dinamik, M4 555 flag, M9 yuvarlama, M10 isExport+liability)
- **B-S01..B-S05** — Skill doc: `kod-listeleri-ubl-tr-v1.42.md §4.9` (650 iç çelişki) + `e-fatura-ubl-tr-v1.0.md §77` (Fatura/İrsaliye TR1.2)
- **CHANGELOG.md** — Sprint 1-7 log'larını tek v2.0.0 entry'sine konsolide
- **package.json** 1.4.2 → 2.0.0 bump
- **git tag v2.0.0** + origin push
- (Opsiyonel) Vitest coverage config + threshold

### Post-v2.0.0'a ertelenen
- **B-91** — UBLVersion/CustomizationID/CopyIndicator runtime (risk yok, hardcode serializer)
- **9015 vergi kodu** — Skill'de tanımlanmamış, kullanıcı iç teyidi sonrası `tax-config.ts`'e eklenebilir
- **ÖTV İstisna 101-108 kodları** — documentType mimarisi revize gerek
- **001 Konaklama Diplomatik İstisna** — KONAKLAMAVERGISI tipi genişletme
- **219, 307, 318 İsim güncellemeleri** — semantik değişim
- **Currency M7 full** — +38 kod extension
- **Payment Means M7 full** — UN/EDIFACT genişletme

---

## 4. Fixture Kullanım Planı (f10-f17)

| Fixture | Profil | Tip | Özel senaryo | Sprint 8a paketi | Test seviyeleri |
|---------|--------|-----|--------------|------------------|-----------------|
| **f10** | TICARIFATURA | SATIS | Gelir V. stopajı (0003 %23), TaxInclusive=14550 | Paket F (round-trip), mevcut B-17 regression korunur | Snapshot + Calculator |
| **f11** | TICARIFATURA | SATIS | Kurumlar V. stopajı (0011 %32), TaxInclusive=13200 | Paket B (B-30 SATIS stopaj ters yön **negatif case**), mevcut | Snapshot + Calculator + Validator |
| **f12** | TEMELFATURA | IHRACKAYITLI | 702 muafiyet + GTİP 12 hane + AlıcıDİBKOD 11 hane | Paket B (B-78 702 satır kuralı) + mevcut `validateIhrackayitli702` regression | Snapshot + Validator + Cross-check |
| **f13** | YATIRIMTESVIK | SATIS | Makina (ItemClass=01) + 2 KDV oranı (20%, 10%) + YTBNO | Paket B (B-67 + B-78 YATIRIMTESVIK KDV), Paket F (round-trip) | Snapshot + Validator + Calculator |
| **f14** | YATIRIMTESVIK | SATIS | İnşaat (ItemClass=02) + boş SerialID/ProductTraceID | Paket B (B-78 YATIRIMTESVIK KDV), varyasyon testi | Snapshot + Validator |
| **f15** | TEMELFATURA | SATIS | 351 istisna + KDV=0 | Mevcut M5 `TAX_EXEMPTION_MATRIX` cross-check regression | Snapshot + Cross-check |
| **f16** | TEMELFATURA | SGK | AccountingCost=SAGLIK_ECZ + AdditionalDocumentReference (MUKELLEF_KODU/ADI/DOSYA_NO) + InvoicePeriod | Paket H (SGK type testi), Paket B (B-78 4171 varyasyonu) | Snapshot + Calculator |
| **f17** | KAMU | SATIS | TR IBAN + BuyerCustomer kurum VKN + 3 satır XM34 | Paket D (B-83 KAMU serializer), mevcut `validateKamu` regression | Snapshot + Validator |

**Test sayısı (fixture başına ~2-3):** f10 (1, mevcut), f11 (2), f12 (3), f13 (3), f14 (2), f15 (2), f16 (2), f17 (2) = **17 yeni fixture testi**

Fixture'lar hem **üretim snapshot'ı** (JSON input → XML output match) hem **validator input** (XML'deki eksik alanlar runtime reddedilir) olarak kullanılır.

---

## 5. Mimari Karar Etkisi

**Sprint 8a yeni M/AR kararı gerektirmez.** Mevcut 16 karar:

| Karar | Sprint 8a'daki ilgili paket | Etki |
|-------|----------------------------|------|
| M1 (PROFILE_TYPE_MATRIX truth) | B-68 whitelist — aynı matris | Karar değişmez |
| M2 (IHRACAT/YOLCU/OZELFATURA ISTISNA zorunlu) | B-29 amount kontrolü | Karar değişmez |
| M3 (650 dinamik) | — | — |
| M4 (555 flag) | B-78 555 KDV kuralı | Mevcut flag'ı kullanır |
| M5 (TAX_EXEMPTION_MATRIX) | f15 regresyon | Karar değişmez |
| M6 (parent-child conditional) | B-30 conditional required | Mevcut pattern |
| M7 (config-derived) | B-62/B-63 VKN sabitleri config'e gider | Mevcut pattern |
| M8 (TR1.2 sabit) | — | — |
| M9 (yuvarlama) | Paket F round-trip doğrular | Karar değişmez |
| M10 (isExport → liability ignore) | — | — |
| AR-1 (cbcRequired/cbcOptional) | B-83 çözümünde rol alır | Sprint 3'teki ertelenme sebebi AR-1 sonrası ortadan kalktı |
| AR-2..AR-8 | — | — |

**Sonuç:** Sprint 8a saf uygulama sprintidir — **B-83 dışında** hiçbir karar açılıp yeniden müzakereye gerek yok. B-83 için de yeni tema **gerekmez**, AR-1 sonrası mevcut `additionalIdentifiers` yolu yeterli.

---

## 6. Risk ve Belirsizlikler

### R1 — B-83 "serializer tema uyumsuz" ertelenme gerekçesi
**Durum:** Sprint 5'te ertelendi. FIX-PLANI-v3 §852-857 yalnız "KAMU aracı kurum PartyIdentification atanmıyor" diyor; spesifik tema çatışması metninde yok. AR-1 (cbcRequiredTag split) sonrası mapper→serializer yolu temiz. **Öneri:** Sprint 8a'da açılıp mapper değişikliği denenir; yeni bir uyumsuzluk çıkarsa kullanıcıdan teyit alınır.

### R2 — F12 fixture dosya adı
**Durum:** Filesystem adı `f12_ihrachkayitli-702.xml.xml` (çift uzantı + alt çizgi + `ihrach` yazım hatası). Prompt'taki referans `f12-ihrackayitli-702.xml`. **Öneri:** Git add öncesi `git mv` ile temiz ada taşınır; ilk commit temiz adla yapılır. Kullanıcı onayı gerekir (rename kullanıcının istediği isme göre).

### R3 — Sprint 8a prompt'undaki fixture isimleri ile filesystem isimleri uyuşmazlığı
**Durum:** Prompt'ta `f15-satis-351-kdv0.xml`, `f16-sgk-kdvli.xml`, filesystem'de `f15-satis-351.xml`, `f16-sgk.xml`. **Öneri:** Filesystem isimleri kullanılır (f12 hariç — bkz. R2). Kullanıcıdan ek onay gerekmez ama planda not olarak belirtildi.

### R4 — B-78 5+ kural kapsamı
**Durum:** `validateInvoiceState` için FIX-PLANI-v3 §805-810 "555, YATIRIMTESVIK KDV, 702 satır, 4171, YOLCU/IHRACAT party detay" diyor ama 5 kuralın her birinin **tam sınır koşulları** D03 denetim raporlarından çıkarılmalı. Paket B implementation'ı sırasında denetim raporlarına (`audit/denetim-03-*.md`) çapraz referansla doğrulanır.

### R5 — B-62 / B-63 VKN sabitleri
**Durum:** `1460415308` ve `7750409379` Schematron'dan canonical değerler. **Öneri:** `src/config/special-vkn-config.ts` yeni dosyası ile config-derived (M7) tanımlanır; magic number yerine const.

### R6 — Paket kapsamı büyüklüğü
**Durum:** 18 bulgu + 3 cross-cutting = Sprint 8a'nın büyüklüğü Sprint 4 (14 bulgu) + Sprint 6 (16 bulgu) karışımı civarı. **Tahmini 5-7 iş günü** (alt-commit granülaritesi 8-10 commit). Risk: Paket B (B-78 5 kural) ayrı alt-sprint (8a.N) gerektirebilir.

### R7 — ACIK-SORULAR dış teyit bağlı 7 soru
**Durum:** #3 (Signature/UBLExtensions), #6 (650 teyit), #15 (xsi:schemaLocation), #16 (TR1.2 vs TR1.2.1), #18 (stopaj modeli), #20 (yuvarlama), #24 (damga/konaklama düşüm). **Hiçbiri Sprint 8a'yı bloke etmiyor** — tümü status quo davranışla uyumlu. Sprint 8b release öncesi kullanıcı teyit alırsa post-v2.0.0'a yazılır.

---

## 7. Test Sayısı Tahmini

| Paket | Yeni test | Koşul |
|-------|-----------|-------|
| A (common validators) | +10-12 | B-62(2), B-63(2), B-64(2), B-65(2), B-68(2), B-69(2-3) |
| B (type/profile validators) | +13-17 | B-29(2), B-30(2), B-31(2), B-67(2), B-78(5-7) |
| C (despatch validators) | +10-12 | B-66(2), B-84(2), B-85(3), B-86(2), B-104(2) |
| D (KAMU serializer) | +2-3 | B-83 snapshot + additionalIdentifiers pattern |
| E (B-T08 test update) | +2 | Mevcut 8 satır değişir (test sayısı artmaz), +2 TCKN positive/negative |
| F (calc↔serialize round-trip) | +3 | SATIS, stopaj, YATIRIMTESVIK |
| G (Mimsoft fixture) | +17 | f10(0 mevcut korunur), f11(2), f12(3), f13(3), f14(2), f15(2), f16(2), f17(3) |
| H (opsiyonel) | +2 | SGK type, YOLCUBERABERFATURA |
| **Toplam** | **+59..+68** | |

**Hedef aralık:** 573 → **~632-641** (35 → ~38-40 dosya)

Minimum (Paket H atlanırsa, B-78 dar yorumlanırsa): 573 → ~620
Maksimum (tüm kapsam + ek fixture test'leri): 573 → ~645

---

## Alt-Sprint (Commit) Granülaritesi — Tahmin

| Alt-sprint | Paket | Tahmini test Δ | Tahmini süre |
|------------|-------|----------------|---------------|
| 8a.1 | Plan kopyası + Paket I (f12 rename) + B-T08+B-104 atomik | +2 | 0.5 gün |
| 8a.2 | Paket A — common validators (B-62/63/64/65/68/69) | +10-12 | 1 gün |
| 8a.3 | Paket B.1 — B-29/B-30/B-31 (profile + type validators) | +6 | 0.5 gün |
| 8a.4 | Paket B.2 — B-67 + B-78 (invoice-rules 5 kural) | +7-9 | 1-1.5 gün |
| 8a.5 | Paket C — despatch validators (B-66/84/85/86) | +9-11 | 1 gün |
| 8a.6 | Paket D — B-83 KAMU serializer + regression | +2-3 | 0.5 gün |
| 8a.7 | Paket F — calc↔serialize integration test | +3 | 0.5 gün |
| 8a.8 | Paket G — Mimsoft f12-f17 regresyon | +15-17 | 1 gün |
| 8a.9 | Paket H — opsiyonel + implementation-log finalize + Sprint 8b devir | +2 | 0.5 gün |

**Toplam tahmini süre:** 6-7 iş günü
**Toplam tahmini commit:** 9 atomik alt-commit
**`src/` değişim dosyaları:** ~8-10 (validator 4, calculator 2, config 1-2, serializer 1)

---

## Disiplin Notları

- **Plan kopya pattern'i (feedback memory):** Sprint 8a başlangıcı `audit/sprint-08a-plan.md` olarak bu dosyanın kopyası ilk alt-commit'te oluşturulur.
- **`src/` read-only değil:** Sprint 7 kilidi kaldırıldı; Sprint 8a src/ yazar. Test dosyalarında sadece yeni bulgular için yeni test eklenir (Sprint 7 test suite korunur).
- **N1 placeholder yasak:** Yeni test isimleri `B-XX: <açıklama>` formatında.
- **M7 config-derived:** B-62/B-63 magic VKN'leri `src/config/` altında sabit.
- **XSD vs runtime (feedback memory):** B-91 "XSD opsiyonel alanlara keyfi runtime zorunluluk eklenmez" disiplinine göre post-v2.0.0'a ertelendi.
- **Mimari kilit:** Sprint 8a sırasında M1-M10 / AR-1..AR-8 kararları **değiştirilmez**; yeni karar çıkarsa ACIK-SORULAR.md'ye eklenir, sprint bloke olur.

---

## Verification (end of sprint)

- `bun test` → tüm testler yeşil, ~630 test
- `bun run typecheck` (veya `tsc --noEmit`) → strict clean
- `__tests__/integration/calc-serialize-roundtrip.test.ts` → round-trip assertion'lar geçer
- f12-f17 snapshot testleri → fixture XML ↔ builder output eşleşir
- `audit/sprint-08a-implementation-log.md` → her paket için kapanış tablosu
- Sprint 8b devir notu: sadece doküman + release

---

## Onay Sonrası

Bu plan onaylandıktan sonra ayrı bir implementasyon prompt'u ile Sprint 8a.1'e başlanır. Implementation sırasında **her alt-sprint ayrı atomik commit**; her commit sonrası `audit/sprint-08a-implementation-log.md`'a bölüm eklenir.
