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

_TBD — 7.2 commit sonrası doldurulacak._

---

## Sprint 7.3 — Float Edge Case + K1/K3/K4 + B-T09 XSD Sequence

_TBD — 7.3 commit sonrası doldurulacak._

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
