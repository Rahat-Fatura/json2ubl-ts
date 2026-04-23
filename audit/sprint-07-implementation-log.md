---
sprint: 7
baslik: Test Güncellemeleri — B-T bulguları + K1/K3/K4 regression + float edge case
tarih: 2026-04-23
plan: audit/sprint-07-plan.md
fix_plani: audit/FIX-PLANI-v3.md §296-315
onceki_sprint: audit/sprint-06-implementation-log.md (commit 3fde82a)
sonraki_sprint: Sprint 8a (Devir bulgu temizliği + Mimari kalan)
toplam_commit: 4
test_durumu_basi: 554 / 554 yeşil (34 dosya)
test_durumu_sonu: 573 / 573 yeşil (35 dosya) — plan hedef 577, gerçek +19
---

## Kapsanan Bulgular

**B-T01..B-T10 + B-87** (FIX-PLANI-v3 §296-315) + **K1/K3/K4 regression** (Sprint 6 devri).

| ID | Durum | Commit |
|----|-------|--------|
| B-T01 | No-op (Sprint 1'de silindi) | 7.1 teyit |
| B-T02 | No-op (Sprint 1'de silindi) | 7.1 teyit |
| B-T03 | No-op (Sprint 4 B-15 ile çözüldü) | 7.1 teyit |
| B-T04 | İptal + yorum (Mimsoft teyidi) | 7.1 |
| B-T05 | No-op (Sprint 5 B-81 ile çözüldü) | 7.1 teyit |
| B-T06 | 7 profil coverage | 7.2 |
| B-T07 + B-87 | Float edge case | 7.3 |
| B-T08 | Sprint 8a devir (B-104 ile atomik) | 7.1 logu |
| B-T09 | XSD sequence named assert | 7.3 |
| B-T10 | IDISIRSALIYE profili | 7.4 |
| K1/K3/K4 | Regression guard | 7.3 |

---

## Sprint 7.1 — Plan kopyası + No-Op Teyit + B-T04 yorum + B-T08 devir logu

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 7.1: Plan + B-T01..B-T05 no-op teyit + B-T04/B-T08 karar logu`

### Yapılanlar

1. **`audit/sprint-07-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/sprint-7-dreamy-bachman.md` kopyalandı (kullanıcı Sprint pattern direktifi).
2. **`audit/sprint-07-implementation-log.md`** — bu dosya, iskelet oluşturuldu.

### No-Op Teyitler (B-T01/B-T02/B-T03/B-T05)

Grep ile teyit edildi:

```bash
$ grep -rn "UBLExtensions" __tests__/  # B-T01
→ BOŞ ✅ (Sprint 1 implementation-log: "UBLExtensions placeholder içerir" testi silindi)

$ grep -rn "Signature" __tests__/  # B-T02
→ BOŞ ✅ (Sprint 1 implementation-log: "cac:Signature oluşturur" testi silindi)

$ grep -n "toBe(850)" __tests__/calculator/document-calculator.test.ts  # B-T03
→ 109: expect(result.monetary.lineExtensionAmount).toBe(850); ✅
→ 110: expect(result.monetary.taxExclusiveAmount).toBe(850); ✅
  (Sprint 4 B-15 LegalMonetaryTotal iskonto sonrası düzeltmesi)

$ grep -n "351" __tests__/calculator/simple-invoice-mapper.test.ts  # B-T05
→ 54: describe('B-81 — mapper TEVKIFAT+351 istisna kodunu korur') ✅
→ 63: expect(result.xml).toContain('<cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode>') ✅
  (Sprint 5 B-81 commit'i ile eklendi)
```

B-T01, B-T02, B-T03, B-T05 → **zaten çözülmüş, Sprint 7'de yeniden test eklenmedi** (no-op disiplini).

### B-T04 Karar Logu (S1 — İptal + yorum)

- **Karar:** B-17 stopaj aritmetik bulgusu + B-T04 test bulgusu IPTAL EDİLDİ.
- **Gerekçe:** Mimsoft teyidi (kullanıcı Açık Soru #18 cevabı, FIX-PLANI-v3 §418): `line-calculator` mevcut davranışı (`taxInclusiveForMonetary = 1000 + (-100) + 200 = 1100`) doğru.
- **Uygulama:** `__tests__/calculator/line-calculator.test.ts:164` üstüne tek satır açıklayıcı yorum eklendi:
  ```ts
  // B-17 + B-T04 iptal (2026-04-23, Sprint 7.1): Mimsoft teyidi — 1100 davranışı doğru.
  ```
- **Test değişmedi.** `expect(result.taxInclusiveForMonetary).toBe(1100)` korunuyor.

### B-T08 Devir Logu (S2 — Sprint 8a B-104 ile atomik)

- **Karar:** B-T08 (nationalityId='TR' 8 test lokasyonunda) Sprint 7'de DEĞİŞTİRİLMEDİ.
- **Gerekçe:** B-T08 yalnızca B-104 (TCKN 11-hane validator) fix'iyle anlam kazanır. B-104 Sprint 8a devir listesinde (`sprint-06-implementation-log.md §223`). `.skip` yaklaşımı 8 test kaybı demek; Sprint 8a'da atomik güncelleme (validator + test) tercih edildi.
- **Mevcut durum:** 8 lokasyon (4 dosya):
  - `__tests__/builders/despatch-builder.test.ts:43, 188, 189, 216, 218`
  - `__tests__/builders/despatch-extensions.test.ts:42`
  - `__tests__/serializers/sequence.test.ts:180`
  - `__tests__/validators/despatch-validators-o3o4o7.test.ts:42`
- **Sprint 8a aksiyonu:** B-104 validator + 8 lokasyonda `nationalityId: 'TR'` → `nationalityId: '12345678901'` (veya geçerli TCKN) atomik tek commit.

### Test Durumu

- Başlangıç: 554/554 yeşil (34 dosya)
- Son (7.1 kapanışı): 554/554 yeşil (0 regresyon, 0 yeni test — sadece yorum)

### Değişiklik İstatistikleri

- `__tests__/calculator/line-calculator.test.ts` — 1 satır ekleme (yorum, `src/` değişikliği YOK — kural uyumlu)
- `audit/sprint-07-plan.md` — yeni dosya (kopya)
- `audit/sprint-07-implementation-log.md` — yeni dosya (iskelet + 7.1 bölümü)

---

## Sprint 7.2 — B-T06 Profil Coverage

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 7.2: B-T06 özel profil test coverage (YATIRIMTESVIK/ILAC_TIBBICIHAZ/IDIS/HKS/ENERJI/OZELFATURA)`

### Plan Düzeltmesi (SGK profil değil)

Plan (`audit/sprint-07-plan.md` §5.2) 7 profil listeliyordu: YATIRIMTESVIK, ILAC, SGK, ENERJI, IDIS, HKS, OZELFATURA.

**Bulgu:** `src/types/enums.ts` incelendi:
- `InvoiceProfileId` enum'ında **SGK yok** — SGK bir `InvoiceTypeCode` (tip kodu).
- ILAC enum değeri `ILAC_TIBBICIHAZ` (plan'da "ILAC" kısaltması kullanılmış).

**Düzeltme:** Sprint 7.2 kapsamı **6 profil** (SGK hariç):
1. YATIRIMTESVIK (SATIS ok)
2. ILAC_TIBBICIHAZ (SATIS ok)
3. IDIS (SATIS ok)
4. HKS (HKSSATIS zorunlu)
5. ENERJI (SARJ/SARJANLIK zorunlu)
6. OZELFATURA (ISTISNA zorunlu — M2 kuralı)

`PROFILE_TYPE_MATRIX` ön-kontrolü tüm 6 profilin tanımlı olduğunu doğruladı (`src/config/constants.ts:13-58`). Sprint 8a'ya ertelenen profil yok.

### Yapılanlar

`__tests__/calculator/document-calculator.test.ts` 'profil tespiti' describe'ına KAMU testinden sonra 6 yeni test eklendi (satır 275 civarı):

```ts
it('B-T06: YATIRIMTESVIK profili override çalışmalı', ...);
it('B-T06: ILAC_TIBBICIHAZ profili override çalışmalı', ...);
it('B-T06: IDIS profili override çalışmalı', ...);
it('B-T06: HKS profili HKSSATIS tipi ile override çalışmalı', ...);
it('B-T06: ENERJI profili SARJ tipi ile override çalışmalı', ...);
it('B-T06: OZELFATURA profili ISTISNA zorunlu (M2)', ...);
```

**Pattern:** Her test `makeInput({ profile: <PROFIL>, [type: <TIP>] })` → `expect(result.profile).toBe(<PROFIL>)`. Profil-spesifik tip override'ı yalnızca HKS/ENERJI/OZELFATURA için (diğerleri default SATIS kabul).

### Test Durumu

- Başlangıç (7.1 sonu): 554/554 yeşil (34 dosya)
- Son (7.2 kapanışı): **560/560 yeşil** (34 dosya, +6 test)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `__tests__/calculator/document-calculator.test.ts` — 32 satır ekleme (6 yeni it bloğu)

### Kapsam Dışı (Sprint 8a/8b)

- **Profil-spesifik derinlik** (S4 kararı kapsamı dışı): YATIRIMTESVIK belgeReferance, ILAC_TIBBICIHAZ ilaçSicilNo, IDIS SEVKIYATNO vb. alan testleri Sprint 8a Mimsoft fixture sonrası.
- **YOLCUBERABERFATURA profili** (M2 ISTISNA zorunlu): Plan kapsamında yoktu, Sprint 8a'ya ertelet — mevcut IHRACAT M2 kuralı testi zaten pattern'i kapsar.
- **SGK InvoiceTypeCode testi**: `type: 'SGK'` + default TICARIFATURA profili testi Sprint 8a'ya ertelet (plan SGK'yı profil sandığı için bu kapsamda değildi).

---

## Sprint 7.3 — Float Edge Case + K1/K3/K4 + B-T09 XSD Sequence

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 7.3: B-T07+B-87 float edge case + K1/K3/K4 regression + B-T09 XSD sequence`

### Kapsam A — Float Edge Case (B-T07 + B-87)

**Yeni dosya:** `__tests__/calculator/float-edge-case.test.ts` (6 test)

- `0.1 + 0.2 toplamı toBeCloseTo(0.3, 2) ile doğru (IEEE754)` — M9 pattern
- `33.33 × 0.2 KDV floating precision — toBeCloseTo`
- `10 × 0.1 quantity×price = 1.0 (multiple float addition)`
- `1/3 × 3 birim fiyatı XML 2-basamak yuvarlanır (M9)`
- `Σ satır KDV = monetary.taxInclusive − taxExclusive (floating tutarlılık)` — multi-rate (20%, 10%, 1%) edge
- `0.0 toleransı toBeCloseTo(0, 2) kabul — sıfır KDV satırı`

**Pattern:** Tüm float assertion `toBeCloseTo(val, 2)`. `toBe` yalnız integer için (plan disiplini).

**Nüans:** `taxSubtotals` farklı KDV oranları için ayrı subtotal (kod 0015 ama %20, %10, %1). Toplam KDV = Σ filter(code=0015).reduce. İlk çalıştırmada `.find()` kullanıldı, sadece ilk oran döndü (6.30 değil 7.168 bekleniyordu); `.filter().reduce()` ile düzeltildi.

### Kapsam B — K1/K3/K4 Regression Guard (Sprint 6 devri)

**Dosya:** `__tests__/builders/despatch-extensions.test.ts` (+3 test, satır 255+)

- `K1 (B-18): IssueTime cbcRequiredTag ile emit edilir` — DESPATCH_SEQ: IssueDate < IssueTime indexOf
- `K3 (B-14): DELIVERY_SEQ — DeliveryAddress Delivery bloğu içinde doğru konumda` — Delivery start/end indexOf
- `K4 (B-20): PERSON_SEQ — FirstName < FamilyName < NationalityID` — driverPerson emit sırası

**Plan düzeltmesi:** Plan §5.3 K3 "DespatchAddress" yazmış; kullanıcı düzeltmesine göre element adı `<cac:Despatch>`. Gerçek DELIVERY_SEQ kontrolü için `DeliveryAddress`'in Delivery bloğu içinde konumlanması yeterli regression guard — `<cac:Despatch>` alt-elementi input.shipment.delivery desteklemiyor, ayrıca Despatch test kapsamı daralmış oldu (minimal). CarrierParty Delivery SEQ'inde yok — Shipment hiyerarşisinde.

### Kapsam C — B-T09 XSD Sequence Named Regression

**Dosya:** `__tests__/builders/despatch-extensions.test.ts` (+2 test, K1/K3/K4 sonrası)

- `B-T09: DESPATCH_SEQ — CustomizationID < ProfileID < ID < IssueDate`
- `B-T09: SHIPMENT_SEQ — GoodsItem < Delivery < TransportHandlingUnit`

**Truth source:** `src/serializers/xsd-sequence.ts` DESPATCH_SEQ (82-106), SHIPMENT_SEQ (377-410).

### Test Durumu

- Başlangıç (7.2 sonu): 560/560 yeşil (34 dosya)
- Son (7.3 kapanışı): **571/571 yeşil** (35 dosya, +6 float, +5 despatch; toplam +11)
- TypeScript strict: temiz

Plan tahmini 575 (+14). Gerçek 571 (+11). 3 test farkı (plan B-T09 Shipment sequence'ta "Consignment < GoodsItem < ShipmentStage < Delivery < TransportHandlingUnit" demişti; fixture'da Consignment/ShipmentStage yok, minimal GoodsItem + Delivery + THU test'i yeterli).

### Değişiklik İstatistikleri

- `__tests__/calculator/float-edge-case.test.ts` — yeni dosya (85 satır, 6 test)
- `__tests__/builders/despatch-extensions.test.ts` — +68 satır (5 yeni test, 2 describe)

---

## Sprint 7.4 — B-T10 IDISIRSALIYE + Log Finalize + Sprint 8a Devir

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 7.4: B-T10 IDISIRSALIYE test + implementation-log finalize + Sprint 8a devir`

### Ön-Kontrol: IDISIRSALIYE Enum Teyidi

`src/types/enums.ts:45` → `IDISIRSALIYE = 'IDISIRSALIYE'` ✅
`src/validators/despatch-validators.ts:182-203` → IDIS profil validator mevcut (§5.6):
- `supplier.additionalIdentifiers.SEVKIYATNO` zorunlu, regex `SE-0000000`
- Her satır `item.additionalItemIdentifications.ETIKETNO` zorunlu, regex `2 harf + 7 rakam`

Sprint 8a'ya ertelet kararı gerekmedi.

### Kapsam A — IDISIRSALIYE Test

**Dosya:** `__tests__/builders/despatch-builder.test.ts` (+2 test, HKSIRSALIYE describe sonrası)

- `'SEVKIYATNO + ETIKETNO olmadan hata verir'` — validator reject (UblBuildError)
- `'SEVKIYATNO + ETIKETNO ile başarılı emit'` — happy path:
  - `SEVKIYATNO = SE-0000123` (format §289)
  - `ETIKETNO = AB1234567` (format §292, 2 harf + 7 rakam)
  - XML: `<cbc:ProfileID>IDISIRSALIYE</cbc:ProfileID>` + `schemeID="SEVKIYATNO"` + `schemeID="ETIKETNO"`

### Kapsam B — Log Finalize (bu dosya)

Sprint 7.1-7.4 bölümleri doldu, `test_durumu_sonu: 573 / 35 dosya` güncellendi.

### Kapsam C — Sprint 8a Devir Listesi (aşağıda)

### Test Durumu

- Başlangıç (7.3 sonu): 571/571 yeşil (35 dosya)
- Son (7.4 kapanışı): **573/573 yeşil** (35 dosya, +2 test)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `__tests__/builders/despatch-builder.test.ts` — +30 satır (2 yeni test)
- `audit/sprint-07-implementation-log.md` — finalize

---

## Sprint 7 Kapanış Özeti

| Metrik | Başlangıç | Bitiş | Δ |
|--------|-----------|-------|---|
| Test sayısı | 554 | **573** | **+19** |
| Test dosyası | 34 | 35 | +1 (float-edge-case.test.ts) |
| Commit | Sprint 6.8 (3fde82a) | Sprint 7.4 | 4 atomik commit |
| `src/` değişikliği | — | **0** | yalnız 1 yorum `__tests__/calculator/line-calculator.test.ts` (B-T04) |
| TypeScript strict | temiz | temiz | 0 regresyon |

Plan hedefi +23 test idi (577). Gerçek +19 (573).
Fark gerekçeleri:
- B-T06: 7 yerine 6 test (SGK `InvoiceTypeCode`, profil değil — plan düzeltmesi)
- B-T09 Shipment sequence: plan 5 öğeli zincir (Consignment < GoodsItem < ShipmentStage < Delivery < THU) önerirken fixture'da Consignment/ShipmentStage yok; minimal 3 öğeli (GoodsItem < Delivery < THU) yeterli regression guard oldu

### B-T Bulgu Durum Konsolidasyonu

| ID | Durum | Çözüm |
|----|-------|-------|
| B-T01 | ✅ Kapalı | Sprint 1'de test silinmiş |
| B-T02 | ✅ Kapalı | Sprint 1'de test silinmiş |
| B-T03 | ✅ Kapalı | Sprint 4 B-15 ile 1000→850 güncellendi |
| B-T04 | ✅ Kapalı | Sprint 7.1 — B-17 iptal, yorum eklendi (Mimsoft teyidi) |
| B-T05 | ✅ Kapalı | Sprint 5 B-81 ile ReasonCode test eklendi |
| B-T06 | ✅ Kapalı | Sprint 7.2 — 6 profil test (SGK profil değil) |
| B-T07 | ✅ Kapalı | Sprint 7.3 — float-edge-case.test.ts (6 test) |
| B-T08 | ↪ Sprint 8a devir | B-104 TCKN ile atomik (runtime etkisi yok) |
| B-T09 | ✅ Kapalı | Sprint 7.3 — DESPATCH_SEQ + SHIPMENT_SEQ named regression |
| B-T10 | ✅ Kapalı | Sprint 7.4 — IDISIRSALIYE SEVKIYATNO+ETIKETNO (2 test) |
| B-87 | ✅ Kapalı | Sprint 7.3 — B-T07 ile birleşti |
| K1/K3/K4 regression | ✅ Kapalı | Sprint 7.3 — 3 indexOf pattern guard |

**9 B-T bulgusu kapalı + B-87 + K1/K3/K4**; yalnız **B-T08** Sprint 8a'ya devredildi.

---

## Sprint 8a Devir Listesi (Güncel — 2026-04-23)

Sprint 6 log `§223` orijinal Sprint 8 devir listesi + Sprint 7'den eklenenler:

### Kod + Mimari (Sprint 8a kapsamı)

| Bulgu | Kaynak Sprint | Açıklama |
|-------|---------------|----------|
| **B-T08 + B-104** | Sprint 7 devir | TCKN 11-hane validator + 8 test lokasyonda `nationalityId: 'TR'` → geçerli TCKN atomik güncelleme |
| **Cross-cutting calc-serialize consistency test** | Sprint 3 + 7 devir (S5) | Integration test: calculator monetary → XML serialization → round-trip assert |
| **Mimsoft fixture genişletme** | Sprint 7 devir (S6) | Kullanıcı IHRACKAYITLI+702, YATIRIMTESVIK, 351 için yeni XML ekleyecek; regression test yazılacak |
| **O5** | Sprint 6 devir | CarrierParty VKN/TCKN validateParty helper refactor |
| **O6** | Sprint 6 devir | PartyIdentification schemeID whitelist runtime (`validateParty` additionalIdentifiers) |
| **B-29, B-30, B-31** | Sprint 5 devir | Invoice satır validator genişlemesi |
| **B-62..B-69** | Sprint 5 devir | Kontrol yapısı + error mapping refactor |
| **B-78** | Sprint 4 devir | TEVKIFATIADE custom tip |
| **B-83** | Sprint 3 devir | KAMU partyType mapping |
| **B-84, B-85, B-86** | Sprint 3 devir | Tax schema + açık kodlar |
| **B-91** | Sprint 5 devir | Satır KDV matematik doğrulama |

### Sprint 7'de Edge Case Olarak Keşfedilen (Sprint 8a notu)

- **YOLCUBERABERFATURA profili** coverage testi (Sprint 7.2'de kapsamda yoktu — IHRACAT M2 testi pattern'i zaten kapsıyor, opsiyonel 8a)
- **SGK InvoiceTypeCode testi** (`type: 'SGK'` + default TICARIFATURA profili) — plan SGK'yı profil sandığı için Sprint 7.2 kapsamında değildi

### Dokümantasyon + Release (Sprint 8b kapsamı)

- README Sorumluluk Matrisi: M3 (650 dinamik), M4 (555 flag), M9 (yuvarlama), M10 (isExport+liability)
- Skill dokümanları:
  - `kod-listeleri-ubl-tr-v1.42.md §4.9` — 650 iç çelişki + kütüphane yaklaşımı
  - `e-fatura-ubl-tr-v1.0.md §77` — Fatura + İrsaliye TR1.2
- CHANGELOG.md — Sprint 1-7 implementation-log'ları tek v2.0.0 entry'ye konsolide
- `package.json` 1.4.2 → 2.0.0
- Git tag v2.0.0 + push
- (Opsiyonel) Vitest coverage config + threshold
- B-94 `examples/output/` regenerate (Sprint 8a veya 8b)

---

## Sprint 8a Hazırlık (Kullanıcı)

Kullanıcı Sprint 8a öncesi:
1. Mimsoft fixture örnekleri (IHRACKAYITLI+702, YATIRIMTESVIK, 351)
2. edocument-service dev test durumu teyit
3. B-62..B-69 ve B-83..B-86 için ek domain kararları (varsa)

---

## Disiplin Notları

- **N1 placeholder yasak:** Tüm yeni test isimleri B-T## prefix'i + gerçek açıklama.
- **M7 pattern:** Mevcut `makeInput`, fixture helper'ları yeniden kullanıldı.
- **xsd-sequence.ts pattern:** B-T09 + K3/K4 `XSD_ELEMENTS.*_SEQ` sabitleriyle çapraz doğrulandı.
- **Alt-commit granülaritesi:** 4 atomik commit (7.1→7.2→7.3→7.4).
- **Sprint 7 özel (read-only `src/`):** `src/` altında hiçbir değişiklik yapılmadı (tek istisna `__tests__/.../line-calculator.test.ts` 1 satır yorum).
- **No-op disiplini:** B-T01/B-T02/B-T03/B-T05 için grep teyidi yeterli; yeniden test EKLENMEDİ.
