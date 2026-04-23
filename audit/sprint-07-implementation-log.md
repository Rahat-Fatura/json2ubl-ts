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
test_durumu_sonu: TBD / 577 hedef (35 dosya hedef)
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

_TBD — 7.4 commit sonrası doldurulacak._

---

## Sprint 8a Devir Listesi (7.4 sonunda güncellenecek)

_TBD — Sprint 7 kapanışında tüm devir listesi konsolide edilecek._

---

## Disiplin Notları

- **N1 placeholder yasak:** Tüm yeni test isimleri B-T## prefix'i + gerçek açıklama.
- **M7 pattern:** Mevcut `makeInput`, fixture helper'ları yeniden kullanıldı.
- **xsd-sequence.ts pattern:** B-T09 + K3/K4 `XSD_ELEMENTS.*_SEQ` sabitleriyle çapraz doğrulandı.
- **Alt-commit granülaritesi:** 4 atomik commit (7.1→7.2→7.3→7.4).
- **Sprint 7 özel (read-only `src/`):** `src/` altında hiçbir değişiklik yapılmadı (tek istisna `__tests__/.../line-calculator.test.ts` 1 satır yorum).
- **No-op disiplini:** B-T01/B-T02/B-T03/B-T05 için grep teyidi yeterli; yeniden test EKLENMEDİ.
