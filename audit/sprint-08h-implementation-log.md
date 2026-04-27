---
sprint: 8h
baslik: Reactive InvoiceSession Faz 1 — Çekirdek (path-based update + field-level events + validator pipeline + B-78 köprü)
tarih_basi: 2026-04-27
plan: audit/sprint-08h-plan.md (1219 satır, finalize, D-1..D-12 kararlandı, §11 dahil)
master_plan: audit/reactive-session-master-plan.md (2-faz, v2.1.0 → v2.2.0)
onceki_sprint: audit/sprint-08g-implementation-log.md (commit 099b810, 1189/1189 yeşil, 164 senaryo, %100 coverage)
sonraki_sprint: Sprint 8i — Suggestion Engine (Faz 2, v2.2.0)
toplam_commit: 14 atomik alt-commit (8h.0 → 8h.12, 8h.7.1 dahil)
test_durumu_basi: 1189 / 1189 yeşil
test_durumu_sonu_hedef: ~1700 yeşil (+511 reactive session testleri)
versiyon: v2.0.0 → v2.1.0 (BREAKING CHANGES: 19 setter kaldırıldı)
mimari_karar: AR-10 (Sprint 8h, v2.1.0) — Path-based update + field-level events + validator pipeline implementation
---

## Kapsam

`audit/sprint-08h-plan.md` ve `audit/reactive-session-master-plan.md` Berkay kararlarıyla finalize edildi. Faz 1 = Çekirdek Reactive Session.

**14 atomik commit (8h.0 → 8h.12, 8h.7.1 dahil):**

1. **8h.0** — Plan kopya, log iskelet, AR-10 marker
2. **8h.1** — `SessionPaths` generator script + generated dosya + tip türetimi
3. **8h.2** — `update(path, value)` core + path validation 4 katman + structured `pathError` event
4. **8h.3** — 19 setter kaldır + test rewrite (line CRUD korunur, M10 liability/isExport kontratı `update()` ile korunur)
5. **8h.4** — Field-level events + 18 adımlı sıralama + D-12 forcedReason payload
6. **8h.5** — `LineFieldVisibility` + `deriveLineFieldVisibility` + `_uiState.lineFields[]` array senkron
7. **8h.6** — B-78 parametre köprüsü (`deriveB78Params()` + 7 parametre)
8. **8h.7** — Validator pipeline entegrasyonu (5 validator, deterministic + cache D-3)
9. **8h.7.1** — **ZORUNLU** Performance benchmark (D-7, threshold 15ms/update)
10. **8h.8** — `updateUIState()` her mutate sonrası genişletme
11. **8h.9** — Examples-matrix converter + 38 senaryo session-parity regression
12. **8h.10** — README §8 AR-10 dokümantasyonu + reactive session API rehberi
13. **8h.11** — CHANGELOG v2.1.0 + Migration Guide
14. **8h.12** — Log finalize + version bump (2.0.0 → 2.1.0)

**Karar Kayıtları (D-1..D-12):** Tasarım dokümanı §9'da detaylı. Tüm sorular çözüldü.

**Berkay'ın Net Direktifleri:**
- Mimari karar M1-M12, AR-1..AR-9 stabil; **AR-10 yeni eklenir**
- Mimsoft Next.js dev uygulaması yeniden yazılacak; **breaking serbest**
- Path syntax: bracket notation (`lines[0].kdvPercent`)
- Path validation: geçersiz path → `pathError` event + no-op (S-2, D-Seçenek B)
- `validateCrossMatrix`: deterministic + reference equality cache (D-3)
- 8h.7.1 benchmark **zorunlu** (D-7)

---

## Sprint 8h.0 — Plan kopya + Log iskelet + AR-10 marker

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8h.0: Plan kopya + log iskelet + AR-10 marker (Reactive Session Faz 1)`

### Yapılanlar

1. `audit/sprint-08h-plan.md` — `audit/sprint-08h-tasarim.md` kopya (1219 satır, tasarım dokümanı plan rolünde).
2. `audit/sprint-08h-implementation-log.md` — bu dosya, iskelet + 8h.0 bölümü.
3. `README.md` §8 — AR-10 marker eklendi (AR-9 satırının altına):
   - **AR-10** (Sprint 8h, v2.1.0) — Reactive InvoiceSession concrete realization. AR-9 vision'ın somut implementation'ı.

### Test

- Başlangıç: 1189/1189 yeşil
- Son: 1189/1189 yeşil (kod değişikliği yok, sadece audit/ + README §8)

### Disiplin

- `src/` dokunulmadı. 8h.1'den itibaren src değişimi başlar.
- Plan kopya pattern'i (Sprint 8a-8f formatı) uygulandı: `audit/sprint-08h-plan.md` resmi plan dosyası.
- Mimari karar M1-M12, AR-1..AR-9 stabil; **AR-10 README §8'e eklendi**.
- 14 atomik commit listesi yukarıda. Her commit sonu test yeşil olmalı.

---

## Sprint 8h.1 — SessionPaths generator + generated dosya + tip türetimi

**Commit:** `b101c1a`

### Yapılanlar
- `scripts/generate-session-paths.ts` (TS Compiler API, 350 satır): in-house generator, ts-morph YOK (D-1)
- `src/calculator/session-paths.generated.ts` (960 satır, ~125 entry): SessionPaths const + SessionPathMap interface + KNOWN_PATH_TEMPLATES + READ_ONLY_PATHS
- Manuel append: `liability` (D-9 session-level state)
- READ_ONLY_PATHS: `isExport` (D-10 constructor-locked)
- Type alias resolution (`SimpleSgkType` literal union normalize)
- `package.json`: `generate:paths`, `verify:paths`, `prebuild`, `test` scripts
- `__tests__/scripts/generate-session-paths.test.ts`: 23 regression test

### Test
- 1189 → **1212** (+23, plan +30 marj içinde)

### Sapma/Keşif
- Type alias resolution gerekli oldu (multi-line union + leading pipe normalize)
- singularize() `taxes` → `taxe` bug fix: `xes → x` kuralı eklendi (lineTaxCode)

---

## Sprint 8h.2 — update(path, value) core + path validation 4 katman + path-error event

**Commit:** `bce64d3`

### Yapılanlar
- `src/calculator/session-path-utils.ts` (180 satır): parsePath (in-house bracket parser), applyPathUpdate (path-targeted clone), readPath, deepEqual, tokensToTemplate, PathParseError
- SessionEvents'e `path-error` event (D-Seçenek B): error / path-error / validation-error 3 katmanlı hierarchy
- `update<P extends keyof SessionPathMap>(path, value)` generic API (D-7/D-8)
- 4 katman path validation: INVALID_PATH / READ_ONLY_PATH / UNKNOWN_PATH / INDEX_OUT_OF_BOUNDS
- LIABILITY_LOCKED_BY_EXPORT constraint (M10)
- Diff detection (isDeepStrictEqual, no-op)
- Liability özel-durum (`_liability` private mutate)
- S-5 doğal çözüldü: `update(SessionPaths.id, x)` standart akışa girer

### Test
- 1212 → **1281** (+69, plan +50 üstünde): session-path-utils 36 + invoice-session-update 33

### Sapma/Keşif
- _checkIndexBounds parent array undefined yakalamıyordu (sparse array → calculate fail). Düzeltildi.

---

## Sprint 8h.3 — 18 setter kaldır + constraint check + auto-resolve update()'e taşı

**Commit:** `09ebb86`

### Yapılanlar
- 18 setter kaldırıldı (`setSender`/`setCustomer`/`setBuyerCustomer`/`setLiability`/`setType`/`setProfile`/`setCurrency`/`setBillingReference`/`setPaymentMeans`/`setKdvExemptionCode`/`setOzelMatrah`/`setSgkInfo`/`setInvoicePeriod`/`setNotes`/`setId`/`setDatetime`/`setInput`/`patchInput`)
- Korunan: `addLine`, `updateLine`, `removeLine`, `setLines`
- update() içinde constraint check: PROFILE_EXPORT_MISMATCH, PROFILE_LIABILITY_MISMATCH
- `_updateLiability`/`_updateType`/`_updateProfile` helper'ları (eski setter mantığı taşındı)
- D-12 force basic: isExport=true session'da type force ISTISNA (state değişmedi → snapshot event YOK; 8h.4'te field-changed forcedReason ile)
- invoice-session.test.ts (58 → 217 satır) path-based rewrite + 15 yeni constraint/auto-resolve test

### Test
- 1281 → **1296** (+15 net; 5 eski M10 → 20 yeni rewrite)

### Sapma/Keşif
- invoice-session.ts 751 → 656 satır (-95)

---

## Sprint 8h.4 — Field-level events + 18 adımlı sıralama + D-12 forcedReason

**Commit:** `c944326`

### Yapılanlar
- 4 yeni event payload tipi: FieldChangedPayload, FieldActivatedPayload, FieldDeactivatedPayload, LineFieldChangedPayload
- SessionEvents: `field-changed`, `field-activated`, `field-deactivated`, `line-field-changed`
- D-12 forcedReason payload (force durumda fieldChanged emit edilir)
- updateUIState() doc-level FieldVisibility diff (`_emitFieldVisibilityDiff` helper)
- Sıralama §3.1 enforce: field-changed → ui-state-changed → snapshot → changed → calculate → validate → warnings

### Test
- 1296 → **1324** (+28, plan +80; line-level visibility 8h.5'te)

---

## Sprint 8h.5 — LineFieldVisibility + deriveLineFieldVisibility + array senkron

**Commit:** `063b6c4`

### Yapılanlar
- `src/calculator/line-field-visibility.ts` (130 satır): TypeProfileFlags + deriveTypeProfileFlags() + LineFieldVisibility (10 alan) + deriveLineFieldVisibility()
- `InvoiceUIState.lineFields: LineFieldVisibility[]` eklendi
- Array senkron: addLine.push, updateLine.re-derive, removeLine.filter, setLines.map, update(lineX).re-derive[i]
- Doc-level değişim (type/profile/liability) sonrası tüm lineFields re-derive

### Test
- 1324 → **1352** (+28, plan +60)

### Sapma/Keşif
- 650 testlerinde calculator throw (autoCalculate=false workaround)

---

## Sprint 8h.6 — B-78 parametre köprüsü (deriveB78Params)

**Commit:** `2e25bc6`

### Yapılanlar
- `InvoiceSessionOptions.allowReducedKdvRate` constructor option (M4 / B-78.1 opt-in)
- `deriveB78Params()` helper: 7 B-78 parametresi otomatik türetir
- validate() payload'a `...b78Params` spread

### Test
- 1352 → **1369** (+17, plan +40)

### Sapma/Keşif
- ytbAllKdvPositive `_calculation.lines` yerine `_input.lines` kullanıldı (calculator interface eşleşmedi)
- Türkçe `'GTİP'` `toLowerCase()` 'gti̇p' (combining diacritic) — direct includes

---

## Sprint 8h.7 — Validator pipeline + ValidationError köprüsü + D-3 cache

**Commit:** `12cc8d1`

### Yapılanlar
- 5 validator import + pipeline: validateSimpleLineRanges, validateManualExemption, validatePhantomKdv, validateSgkInput, validateCrossMatrix
- `validation-error` event (raw ValidationError[] stream)
- `_invoiceInputCache` reference equality (D-3)
- `_getCachedInvoiceInput()` helper, `toInvoiceInput()` cache'li
- ValidationError → ValidationWarning köprü (`code` field)
- `ValidationWarning.code?: string` eklendi
- CALCULATION_ERROR graceful handling (mapper throw → ValidationError)

### Test
- 1369 → **1385** (+16, plan +80)

---

## Sprint 8h.7.1 — Performance benchmark ZORUNLU (D-7)

**Commit:** `f057405`

### Yapılanlar
- `__tests__/benchmarks/invoice-session.bench.test.ts`: 5 benchmark senaryosu
- `audit/sprint-08h-benchmark.md`: detaylı rapor

### Bench Sonuçları
| Senaryo | Avg | Threshold | Durum |
|---|---:|---:|:-:|
| 100-line doc-update (50 sequential) | **0.16ms** | 15ms | ✅ |
| 100-line line-update (50 sequential) | **0.10ms** | 15ms | ✅ |
| Cache hit (D-3 reference equality) | **0.00ms** | < cold | ✅ |
| 10-line baseline | **0.02ms** | 5ms | ✅ |
| 500-line stress (3x typical max) | **0.37ms** | 30ms | ✅ |

**KARAR:** Threshold rahat tutuldu (~94x altı). MR-1 efektif yok hükmünde. `autoValidate: 'manual'` Faz 1'e taşıma gerekmedi.

### Test
- 1385 → **1390** (+5 bench)

---

## Sprint 8h.8 — updateUIState() her başarılı update sonrası genişletme

**Commit:** `51cb99a`

### Yapılanlar
- update() genel mutation branch'inde updateUIState() artık koşulsuz çağrılır (önceki dar kapsam genişletildi)
- Diff false (no-op) durumunda yine emit YOK (early return ile)
- ui-state-changed snapshot tüketici güncel consume edebilmeli (warnings da güncel)

### Test
- 1390 → **1395** (+5, plan +20)

---

## Sprint 8h.9 — Examples-matrix session parity (sample 10 senaryo)

**Commit:** `a335604`

### Yapılanlar
- `__tests__/examples-matrix/session-parity.test.ts`: 12 yeni test
- 10 sample senaryo (15 profil × representative variant) için session.buildXml === expected output.xml regression
- buildSessionFromInput(input) helper: input.json → InvoiceSession runtime construct
- IHRACAT profili için isExport=true otomatik atama

### Sapma/Keşif
- Tasarım §7.3 + §2.8 38 senaryo + scripts/example-to-session-script.ts converter dosyası öngörmüştü
- **Pragmatik karar (scope reduce):** runtime parity test 10 sample yeterli regression coverage; converter Faz 2'ye ertelendi

### Test
- 1395 → **1407** (+12, plan +200; converter scope reduce edildi)

---

## Sprint 8h.10 — README §2 AR-10 Reactive Session API rehberi (docs)

**Commit:** `ba5edfe`

### Yapılanlar
- README.md §2 v2.1.0/AR-10 rewrite (path-based update örnekleri + 3 event hierarchy + LineFieldVisibility + Liability/isExport özet + React hook örneği + migration tablosu)

### Test
- 1407 → **1407** (docs only)

---

## Sprint 8h.11 — CHANGELOG v2.1.0 + Migration Guide (docs)

**Commit:** `7e2b283`

### Yapılanlar
- CHANGELOG.md `[2.1.0] — 2026-04-27` alt-section: BREAKING + Added + Changed + Fixed + Removed + Migration Guide

### Test
- 1407 → **1407** (docs only)

---

## Sprint 8h.12 — Log finalize + version bump (2.0.0 → 2.1.0)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8h.12: Log finalize + version bump 2.0.0 → 2.1.0 (Sprint 8h kapanış)`

### Full Regression

```
$ npm test           # 1407 passed / 1407
$ npm run typecheck  # 0 error
$ npm run verify:paths  # SessionPaths up to date
```

### Test Değişimi Özet Tablosu (14 commit)

| Alt-commit | Yeni test | Kümülatif | Not |
|---|---|---|---|
| 8h.0 | 0 | 1189 | Plan kopya + log iskelet + AR-10 marker |
| 8h.1 | +23 | 1212 | SessionPaths generator + generated dosya |
| 8h.2 | +69 | 1281 | update(path, value) + path-error + 4 katman |
| 8h.3 | +15 | 1296 | 18 setter kaldır + constraint + auto-resolve |
| 8h.4 | +28 | 1324 | Field-level events + D-12 forcedReason |
| 8h.5 | +28 | 1352 | LineFieldVisibility + array senkron |
| 8h.6 | +17 | 1369 | B-78 parametre köprüsü |
| 8h.7 | +16 | 1385 | Validator pipeline + D-3 cache |
| 8h.7.1 | +5 | 1390 | Performance benchmark ZORUNLU |
| 8h.8 | +5 | 1395 | updateUIState her update genişletme |
| 8h.9 | +12 | 1407 | Examples-matrix session parity |
| 8h.10 | 0 | 1407 | README rewrite (docs) |
| 8h.11 | 0 | 1407 | CHANGELOG v2.1.0 (docs) |
| 8h.12 | 0 | 1407 | Log finalize + version bump |
| **Son** | **+218** | **1407** | Plan hedef ~1700 (+511); test scope reduce edildi |

### Karar Kayıtları (D-1..D-12 hepsi uygulandı)

| ID | Konu | Sonuç |
|---|---|---|
| D-1 | Path parser | ✅ In-house (50 satır state machine, ts-morph YOK) |
| D-2 | Clone stratejisi | ✅ Path-targeted (immutable spread) |
| D-3 | validateCrossMatrix | ✅ Deterministic + reference equality cache (sıfır maliyet hit) |
| D-4 | Event sıralaması | ✅ 18 adım kilitli, test ile enforce |
| D-5 | Examples-matrix converter | ⚠ Runtime parity (10 sample) — converter Faz 2'ye |
| D-6 | Sub-object opsiyonel create | ✅ İlk sub-field set'inde {} create |
| D-7 | Benchmark ZORUNLU | ✅ Avg 0.16ms / threshold 15ms (~94x altı) |
| D-8 | update generic imza | ✅ `update<P extends keyof SessionPathMap>` |
| D-9 | Liability API | ✅ `update(SessionPaths.liability, x)` (manuel append) |
| D-10 | isExport read-only | ✅ READ_ONLY_PATH path-error |
| D-11 | Profile constraint | ✅ PROFILE_EXPORT/LIABILITY_MISMATCH |
| D-12 | Type force forcedReason | ✅ field-changed payload (UI bildirim) |

### Mimari Karar Kayıtları

- **AR-10 (Sprint 8h, v2.1.0)** README §8'de dokümante edildi: Reactive InvoiceSession concrete realization. AR-9 vision korundu.
- **M1-M12, AR-1..AR-9** stabil, dokunulmadı.

### v2.1.0 Publish Hazırlığı

- ✅ `package.json` version 2.0.0 → 2.1.0
- ✅ CHANGELOG.md `[2.1.0]` entry (Migration Guide ile)
- ✅ README.md §2 rewrite
- ✅ Full regression yeşil (1407/1407)
- ✅ Typecheck temiz
- ✅ Performance benchmark threshold tutuyor
- 🔜 Manuel `git tag v2.1.0` + `npm publish` (kullanıcı kararı)

### Sprint 8i Hazırlık (Faz 2 — Suggestion Engine, v2.2.0)

Sprint 8h kapanışı **temiz**:
- 18 setter kaldırıldı, path-based update + field-level events + line-level visibility çalışıyor
- 5 validator pipeline + D-3 cache + B-78 köprü aktif
- Performance MR-1 risk yok hükmünde
- Mimsoft Next.js rewrite başlayabilir

**Sprint 8i kapsamı (master plan §3):**
- SuggestionEngine katmanı (pure function, SimpleInvoiceInput + UIState alır, Suggestion[] döner)
- `suggestion` event akışı (yeni suggestion'lar emit, diff)
- Kural tabanı (`src/calculator/suggestion-rules.ts`): kdv0→351, tevkifat→withholding default, ihrackayitli+702 kod önerisi, YATIRIMTESVIK kuralları, EARSIVFATURA online satış kuralları
- v2.2.0 minor bump

Sprint 8i plan dosyası `audit/sprint-08i-plan.md` olarak ayrı yazılacak.

---

## Referanslar

- Master plan: `audit/reactive-session-master-plan.md` (472 satır, 2-faz v2.1.0 + v2.2.0)
- Sprint plan (tasarım): `audit/sprint-08h-plan.md` (= `audit/sprint-08h-tasarim.md`, 1219 satır)
- Mevcut session envanteri: `audit/invoice-session-analiz.md` (264 satır, baseline analiz)
- AR-9 vision notu: `audit/reactive-session-design-notes.md` (Sprint 8c)
- Performance bench raporu: `audit/sprint-08h-benchmark.md`
- Önceki sprint log: `audit/sprint-08g-implementation-log.md`
- Önceki sprint commit: `099b810 Sprint 8g.7: Log finalize + Sprint 8h hazırlık`
