---
sprint: 8g
baslik: B-NEW-v2 Mini Hotfix — 2 bug fix (B-NEW-v2-04, 05) + 2 example (B-NEW-v2-03, 07) + 3 false positive dokümante
tarih_basi: 2026-04-27
plan: audit/b-new-v2-audit.md (Berkay kararlarıyla)
onceki_sprint: audit/sprint-08f-implementation-log.md (commit a5ab947, 1176/1176 yeşil, 162 senaryo)
sonraki_sprint: Sprint 8h — Reactive InvoiceSession (AR-9)
toplam_commit: 8 atomik alt-commit (8g.0 → 8g.7)
test_durumu_basi: 1176 / 1176 yeşil
test_durumu_sonu_hedef: ~1190 yeşil (+14: 2 bug fix × ~5 test + 2 example × 2 test)
---

## Kapsam

`audit/b-new-v2-audit.md` 7 senaryo Berkay kararıyla işlendi:

**Gerçek bug (fix gerekli) — 2:**
- **B-NEW-v2-04 (Orta):** Withholding raw `Error` → `ValidationError` (AR-1 mimari karar tutarlılığı). Berkay: "hata kodu doğru uygulansın."
- **B-NEW-v2-05 (Orta):** IADE `documentTypeCode` mapper bypass. Berkay: "hata dönmeli."

**Example eksikliği (spec ekle) — 2:**
- **B-NEW-v2-03:** 4171 yasak tip — kütüphane doğru davranıyor; 8f.11'deki spec yanlış API kullanmıştı. Doğru API ile re-add.
- **B-NEW-v2-07:** EARSIVFATURA × TEKNOLOJIDESTEK kapsamsız tek kombinasyon (%98.5 → %100).

**False positive (yapılmaz) — 3:**
- B-NEW-v2-01: kdvPercent whitelist. Berkay: "0 <= kdv <= 100 yeterli davranış."
- B-NEW-v2-02: IBAN mod-97. Berkay: "Format kontrolü yeterli, checksum tüketicinin sorumluluğu."
- B-NEW-v2-06: OZELMATRAH satır kod. Berkay: "False positive."

**Sprint 8g kapsamı dışı:**
- v2.0.0 publish (henüz `package.json=2.0.0` ama publish olmadı; 8g.6'da CHANGELOG v2.0.0 unreleased alt-section).
- Reactive InvoiceSession (AR-9) — Sprint 8h.
- `examples/` 38 senaryoya dokunulmaz.

8 atomik alt-commit planlandı: 8g.0 → 8g.7.

---

## Sprint 8g.0 — Log iskelet + audit dosyasına sonuç notları

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8g.0: Log iskelet + b-new-v2-audit Sonuç notları`

### Yapılanlar

1. `audit/sprint-08g-implementation-log.md` — bu dosya, iskelet + 8g.0 bölümü.
2. `audit/b-new-v2-audit.md` — her bug bölümüne **Sprint 8g Sonuç** tek satırlık not eklendi (her madde için "Sprint 8g.N'de fix" veya "False positive — yapılmadı, gerekçe").

### Test

- Başlangıç: 1176/1176 yeşil
- Son: 1176/1176 yeşil (kod değişikliği yok, sadece audit/)

### Disiplin

- `src/` dokunulmadı. 8g.1 ve 8g.2'de bug fix için minimal değişiklik olacak.
- Plan kopya pattern'i Sprint 8g'de **yok** çünkü mini sprint, plan dosyası ayrı yazılmadı (audit/b-new-v2-audit.md plan rolünde).
- Mimari karar M1-M12, AR-1..AR-9 stabil.

---

## Sprint 8g.1 — B-NEW-v2-04 fix (Withholding ValidationError)

**Commit:** `510cece`

### Yapılanlar

- `src/validators/simple-line-range-validator.ts` — 4 yeni B-NEW-v2-04 kontrolü (bilinmeyen kod, 650 dinamik percent eksik/range, sabit kod + percent verilmiş). Hatalar `ValidationError` formatında.
- `__tests__/validators/simple-line-range-validator.test.ts` — 7 yeni test (4 kontrol + 2 pozitif regresyon + 1 E2E UblBuildError instance check).
- `calculator/line-calculator.ts` raw `throw new Error()` çağrıları korundu (validationLevel='none' fallback) — validationLevel='basic'/'strict'da validator önce yakalar.

### Test

- 1176 → **1183** yeşil (+7)
- AR-1 mimari karar tutarlılığı: tüm validator hataları artık `UblBuildError` üzerinden `ValidationError` array'i olarak dönüyor.

---

## Sprint 8g.2 — B-NEW-v2-05 fix (IADE documentTypeCode mapper passthrough)

**Commit:** `0fee208`

### Yapılanlar

- `src/calculator/simple-invoice-mapper.ts:501-518` — `buildBillingReference` güncellendi:
  - **Önceki davranış:** IADE grubu için `documentTypeCode` zorla `'IADE'` literal'ına override (silent override).
  - **Yeni davranış:** Kullanıcı verdiyse mapper olduğu gibi taşır (validator B-31 yakalar). Vermediyse `'IADE'` default (162 mevcut senaryo etkilenmez).
- `__tests__/validators/type-profile-b29-b30-b31.test.ts` — 3 yeni E2E test (DIGER → TYPE_REQUIREMENT, IADE → pas, undefined → silent default).

### Test

- 1183 → **1186** yeşil (+3)
- B-31 kuralı simple API yolu üzerinden de tetikleniyor.

---

## Sprint 8g.3 — 4171 invalid spec re-add (B-NEW-v2-03)

**Commit:** `88e23f2`

### Yapılanlar

- `examples-matrix/_lib/specs.ts` — `tax-4171-yasak-tip` invalid spec re-add (8f.11'de `manualTaxTotals` yanlış field name ile silindi; doğru `taxes:[{code, percent}]` API ile reaktive).
- `examples-matrix/invalid/invalid-value/invalid-value-tax-4171-yasak-tip/` scaffold tamamlandı.

### Test

- 1186 → **1187** yeşil (+1 invalid-parity)
- Matrix: 162 → 163 (122 valid + 41 invalid)

---

## Sprint 8g.4 — EARSIVFATURA × TEKNOLOJIDESTEK baseline (B-NEW-v2-07)

**Commit:** `52dd424`

### Yapılanlar

- `examples-matrix/_lib/specs.ts` — yeni baseline `EARSIVFATURA + TEKNOLOJIDESTEK`:
  * `customer.taxIdType: 'TCKN'` + 11-hane TCKN
  * `line.additionalItemIdentifications: [{ schemeId: 'TELEFON', value: 'IMEI...' }]`
- 8e + 8f boyunca atlanmış tek kapsamsız kombinasyon kapatıldı.

### Coverage

- PROFILE_TYPE_MATRIX: **67/68 (%98.5) → 68/68 (%100)** ✅

### Test

- 1187 → **1189** yeşil (+2: snapshot + json-parity)
- Matrix: 163 → 164 (123 valid + 41 invalid)

---

## Sprint 8g.5 — examples-matrix/README.md regenerate

**Commit:** `ca5b732`

### Yapılanlar

- `npm run matrix:readme` ile auto-regen.
- README dashboard güncel: 15 profil × 20 tip — 68 kombinasyon, 123 valid + 41 invalid = 164 senaryo, coverage %100.
- Coverage Gap Report: ✅ "Tüm PROFILE_TYPE_MATRIX kombinasyonları kapsamlı."

### Test

- 1189/1189 yeşil (auto-gen, kod etkilemedi)

---

## Sprint 8g.6 — CHANGELOG v2.0.0 alt-section

**Commit:** `0f6891b`

### Yapılanlar

- `CHANGELOG.md` — `[2.0.0]` alt-section "Sprint 8g — B-NEW-v2 Mini Hotfix" eklendi.
- v2.0.0 henüz publish olmadığı için v2.0.0'a alt-section (v2.0.1 yerine).
- Added/Changed/Fixed + False positive dokümante.

### Test

- 1189/1189 yeşil (CHANGELOG değişikliği)

---

## Sprint 8g.7 — Log finalize + Sprint 8h hazırlık

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8g.7: Log finalize + Sprint 8h hazırlık (Reactive InvoiceSession AR-9)`

### Full Regression

```
$ npm test            # 1189 passed / 1189
$ npm run matrix:run  # 164/164 başarılı (123 valid + 41 invalid)
$ npm run examples    # 38/38 başarılı (mevcut examples/ regresyon)
$ npm run typecheck   # 0 error
```

### Test Değişimi Özet Tablosu

| Alt-commit | Yeni test | Kümülatif | Not |
|---|---|---|---|
| 8g.0 | 0 | 1176 | Log iskelet + audit Sonuç notları |
| 8g.1 | +7 | 1183 | B-NEW-v2-04 withholding ValidationError |
| 8g.2 | +3 | 1186 | B-NEW-v2-05 IADE doctype mapper |
| 8g.3 | +1 | 1187 | 4171 invalid spec re-add |
| 8g.4 | +2 | 1189 | EARSIVFATURA × TEKNOLOJIDESTEK baseline |
| 8g.5 | 0 | 1189 | README auto-regen |
| 8g.6 | 0 | 1189 | CHANGELOG entry |
| 8g.7 | 0 | 1189 | Log finalize |
| **Son** | **+13** | **1189** | Plan hedefi +14 ±1 marj |

### Kapsam Özeti

| Berkay kararı | Adet | Bug ID'leri | Durum |
|---|---:|---|---|
| **Gerçek bug fix** | 2 | B-NEW-v2-04, 05 | ✅ Sprint 8g.1 + 8g.2 |
| **Example eksikliği** | 2 | B-NEW-v2-03, 07 | ✅ Sprint 8g.3 + 8g.4 |
| **False positive (yapılmaz)** | 3 | B-NEW-v2-01, 02, 06 | ✅ Audit'te dokümante |

### Coverage Kazanımı

- PROFILE_TYPE_MATRIX: 67/68 (%98.5) → **68/68 (%100)** ✅
- Test: 1176 → **1189** yeşil (+13, plan tahmini +14 ±1)
- Matrix: 162 → **164** senaryo

### Dosya/Klasör İstatistiği Özeti (Kapanış)

```
src/ (2 değişiklik):
├── validators/simple-line-range-validator.ts  # B-NEW-v2-04 kontrolleri (4 yeni)
└── calculator/simple-invoice-mapper.ts        # B-NEW-v2-05 IADE doctype passthrough

__tests__/validators/ (2 dosya genişledi):
├── simple-line-range-validator.test.ts        # +7 test
└── type-profile-b29-b30-b31.test.ts           # +3 test (E2E mapper)

examples-matrix/_lib/specs.ts (2 yeni spec):
├── tax-4171-yasak-tip (invalid)
└── earsivfatura-teknolojidestek-baseline (valid)

examples-matrix/README.md — auto-regen, coverage %100
CHANGELOG.md — [2.0.0] altında Sprint 8g entry
audit/b-new-v2-audit.md — her bug için Sprint 8g Sonuç notu
audit/sprint-08g-implementation-log.md — bu dosya
```

### Disiplin Notları

- **`src/` 2 dosya değiştirildi (sadece bug fix kapsamında):** simple-line-range-validator.ts (B-NEW-v2-04) + simple-invoice-mapper.ts (B-NEW-v2-05). Yeni feature / refactor yok.
- **Mimari karar M1-M12, AR-1..AR-9 stabil** — yeni M slot yok.
- **162 mevcut senaryo dokunulmadı** (sadece +2 yeni: 4171 invalid + TEKNOLOJIDESTEK valid).
- **Mevcut `examples/` 38 senaryo dokunulmadı** — regresyon 38/38 yeşil.
- **Plan kopya pattern'i Sprint 8g'de yok** — mini sprint, plan rolünde `audit/b-new-v2-audit.md`.

### Sprint 8h Hazırlık (Reactive InvoiceSession AR-9)

Sprint 8g kapanışı **temiz**:
- Tüm B-NEW-v2 kararları işlendi (2 fix + 2 example + 3 false positive).
- Coverage %100 (68/68 PROFILE_TYPE_MATRIX kombinasyon).
- 1189/1189 test yeşil, 0 typecheck error, build temiz.

**Sprint 8h kapsamı (öneri):**
- AR-9 Reactive InvoiceSession — `src/calculator/invoice-session.ts` mevcut (siyon temel), `FieldVisibility` ve event-based reactive hooks geliştirilecek.
- Frontend integration için `subscribeToFields()`, `getNextRequiredField()` API'leri.
- Yeni mimari karar AR-10 / M13 olabilir.

Sprint 8h plan dosyası `audit/sprint-08h-plan.md` olarak ayrı yazılacak (Berkay onay verirse Plan modu).

### Bulunan Buglar (Sprint 8g sonu)

Sprint 8g'de **yeni bug bulunmadı**. 4 silent-accept adayı işlendi:
- 2 gerçek bug ✅ fix
- 2 false positive (kütüphane doğru) — example/spec düzeltmesi ile kapatıldı
- 3 false positive (Berkay onayıyla skip)

---

## Referanslar

- Audit dosyası: `audit/b-new-v2-audit.md` (697+ satır, 7 senaryo + Berkay kararları + Sprint 8g sonuç notları)
- Önceki sprint log: `audit/sprint-08f-implementation-log.md`
- Önceki sprint commit: `a5ab947 Sprint 8f.16: v2.0.0 publish checklist`
- Sprint 8h hazırlık (sıradaki): Reactive InvoiceSession (AR-9)

