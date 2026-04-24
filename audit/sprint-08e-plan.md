# Sprint 8e — Publish Öncesi Kapsam Doğrulama

## Context

json2ubl-ts v2.0.0'a hazır (876/876 test yeşil, 39 el-yazımı `examples/` senaryosu). Sprint 8e, **publish öncesi son kapsam doğrulama sprinti**: kütüphanenin desteklediği tüm profil+tip kombinasyonları ve tüm validator error code'ları için **çalıştırılabilir, diskte somut** example üretilmesi. Next.js rewrite öncesi Berkay'ın kütüphanenin davranışını tek tek görmesi birincil amaç.

Mevcut `examples/` 38 senaryoluk "ders notu" katalog — Sprint 8e paralel bir `examples-matrix/` klasörü inşa eder: script-assisted, "kapsam kanıtı" katalog. Mevcut examples/ dokunulmaz.

**Kaynak envanter (ön keşif):**
- `src/config/constants.ts:13-59` PROFILE_TYPE_MATRIX → 68 geçerli profil+tip çifti (12 profil × 19 tip, EARSIVFATURA 16 tip ile en geniş).
- `src/validators/` → 31 unique error code, 9 kategori, collect-all stratejisi (multi-error destekli, silent/warning yok).
- `examples/_lib/runScenario.ts` + `runDespatch.ts` helper'ları mevcut — yeniden kullanılacak.
- `__tests__/examples/` altında 3 dinamik test (snapshot + json-parity + validation-errors) — paralel `__tests__/examples-matrix/` klonlanacak.

## Berkay Kararları (Plan Öncesi)

- **Valid ölçek:** 164 senaryo.
- **Invalid ölçek:** 108 senaryo. Toplam: 272.
- **Bug politikası (R4 sıkı):** `src/` **READ-ONLY**. 8e sırasında bulunan her bug `audit/sprint-08e-implementation-log.md` altında "Bulunan Buglar" section'ına loglanır, kapsam dışı, ayrı **Sprint 8f** açılır. Hiçbir fix 8e'ye sokulmaz.
- **scenario-spec.ts:** Hardcoded array (explicit, diff-friendly). Tek dosyada başla, ~1200 satır aşarsa profil başına split düşünülür (Sprint içinde karar).
- **v2.0.0 publish:** Kapsam dışı — Berkay elle halleder. Plan publish'ten bahsetmez.

## Recommended Approach

### 1. Valid Kombinasyon Matrisi (164 senaryo)

Boyutlar üç kategoriye ayrıldı:

**Core (her 68 profil+tip için baseline, 74 senaryo):** Tek satır, TRY, KDV %20, minimal alıcı/satıcı (veya tip-semantiğinin zorladığı KDV %0 + istisna kodu). Despatch'te (3 profil × 2 tip) 6 baseline.

**Targeted — tip-semantiği zorunlu alanları (66 senaryo):**
- ISTISNA tiplerinde istisna kod varyantı (201/202/213/215/301/302/308/325/339/351/702 seçimli) — 28
- TEVKIFAT tiplerinde stopaj kodu (601/603/620/650-dinamik) — 10
- IHRACKAYITLI (702 + GTİP + ALICIDIBKOD) — 6
- SGK / OZELMATRAH / KOMISYONCU / KONAKLAMAVERGISI profil çaprazı — 16
- Özel kimlik alanları (YATIRIMTESVIK ytbNo, IHRACAT GTİP+Incoterms, YOLCU passport, HKS NotaryNumber, IDIS SEVKIYATNO, ILAC IMEI/KUNYENO/ETIKETNO) — her profilde 1 zenginleştirilmiş, 6

**Feature cross (profil bağımsız özellik çaprazı, 24 senaryo):**
- Çoklu satır + karışık KDV (%0/%10/%20) — 3
- Döviz EUR/USD + ExchangeRate — 3
- AllowanceCharge satır/belge/her ikisi — 5
- 555 gate (reduced KDV allow) — 1
- PaymentMeans + IBAN — 2
- Note + OrderReference + DespatchReference — 2
- Phantom KDV M12 (YATIRIMTESVIK+ISTISNA 308/339, EARSIVFATURA+YTBISTISNA 308/339) — 4
- Kritik edge case (KAMU+OZELMATRAH+stopaj, TICARIFATURA+TEVKIFATIADE+BillingRef, EARSIVFATURA+YTBTEVKIFAT, IADE/YTBIADE/TEVKIFATIADE) — 4

**Despatch ek varyantlar (Plaka/Dorse, çoklu şoför, MATBUDAN+AdditionalDocuments, IDIS SEVKIYATNO, HKS NotaryNumber):** 6

**Profil bazlı dağılım:**

| Profil | Baseline | Tip-özel | Feature | Toplam |
|---|---|---|---|---|
| TEMELFATURA | 10 | 12 | 10 | 32 |
| TICARIFATURA | 9 | 10 | 4 | 23 |
| KAMU | 9 | 10 | 2 | 21 |
| EARSIVFATURA | 16 | 14 | 6 | 36 |
| IHRACAT | 1 | 2 | 1 | 4 |
| YOLCUBERABERFATURA | 1 | 1 | 0 | 2 |
| OZELFATURA | 1 | 0 | 0 | 1 |
| HKS | 2 | 1 | 0 | 3 |
| ENERJI | 2 | 1 | 0 | 3 |
| ILAC_TIBBICIHAZ | 6 | 3 | 0 | 9 |
| YATIRIMTESVIK | 5 | 4 | 0 | 9 |
| IDIS | 6 | 2 | 1 | 9 |
| Despatch (3 profil) | 6 | 6 | 0 | 12 |
| **Toplam** | **74** | **66** | **24** | **164** |

### 2. Invalid Kombinasyon Kataloğu (108 senaryo)

31 error code × varyant dağılımı:

- **Sınıf A — Common errors (MISSING_FIELD, INVALID_FORMAT, INVALID_VALUE, INVALID_PROFILE, PROFILE_REQUIREMENT, TYPE_REQUIREMENT):** 19 varyant (yüksek sıklık 6 kod × 3-4 path)
- **Sınıf B — Cross-check / exemption (UNKNOWN/INVALID/FORBIDDEN_EXEMPTION_FOR_TYPE, EXEMPTION_REQUIRES_ZERO_KDV_LINE, 351 gate'leri, CROSS_MATRIX):** 16 varyant
- **Sınıf C — Specialized (phantom KDV 4 kod, YATIRIMTESVIK 3 kod, IHRACKAYITLI 702 3 kod, MANUAL_EXEMPTION, WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV, TYPE_REQUIRES_SGK, REDUCED_KDV_RATE_NOT_ALLOWED):** 20 varyant
- **Sınıf D — Despatch (MISSING_FIELD, INVALID_FORMAT, PROFILE_REQUIREMENT):** 6 varyant
- **Multi-error case'ler (aynı input 2-3 hata):** 17 varyant (IHRACKAYITLI+GTİP+ALICIDIBKOD eksik; YATIRIMTESVIK+ISTISNA phantom eksik+kdv=0)
- **Profil-context varyantları (aynı hata farklı profil):** 30 varyant

Toplam: 19 + 16 + 20 + 6 + 17 + 30 = **108**.

### 3. Klasör Yapısı

```
examples-matrix/
├── README.md                    # meta-indexer auto-generated
├── run-all.ts                   # valid + invalid birleşik orchestrator
├── scaffold.ts                  # spec → klasör üretici CLI
├── find.ts                      # meta.json filter CLI
├── _lib/
│   ├── scenario-spec.ts         # ScenarioSpec + InvalidSpec tip tanımları
│   ├── specs.ts                 # 164 valid + 108 invalid hardcoded array
│   ├── scenario-generator.ts    # spec → input objesi inşa
│   ├── input-serializer.ts      # input obj → input.ts kaynak (template string)
│   ├── meta-indexer.ts          # meta.json → README.md
│   ├── runScenario.ts           # examples/_lib/runScenario.ts klon + meta write
│   └── runInvalid.ts            # build try/catch, actual-error.json yaz
├── valid/
│   └── <profile>/<profile>-<type>-<variant-slug>/
│       ├── input.ts
│       ├── input.json
│       ├── output.xml
│       ├── run.ts
│       └── meta.json
└── invalid/
    └── <error-code-slug>/<error-code-slug>-<variant-slug>/
        ├── input.ts
        ├── expected-error.json
        ├── actual-error.json
        ├── run.ts
        └── meta.json
```

**Naming:** Feature-based slug (`temelfatura-satis-baseline`, `temelfatura-satis-coklu-kdv`, `missing-field-sender-vkn-empty`). Monotonic v001 değil.

**meta.json şeması:**
- Valid: `{id, kind, profile, type, variantSlug, dimensions: {kdvBreakdown, currency, exchangeRate, exemptionCodes, withholdingCodes, allowanceCharge, lineCount, paymentMeans, reducedKdvGate, phantomKdv, specialIdentifiers}, generatedAt, generatedBy, review, notes}`.
- Invalid: `{id, errorCodes, primaryCode, description, profileContext, typeContext, expectedErrors: [{code, path, messageIncludes}], validationLevel, isMultiError, generatedAt, review}`.

**expected-error vs actual-error** çift dosya: expected spec'ten üretilir, actual run.ts çalışınca yazılır. İkisi eşit olmalı — eşit değilse `invalid-parity.test.ts` failure verir (validator drift veya spec eski).

### 4. Üretim Stratejisi (Hibrit — Spec-Driven Scaffold)

1. `_lib/specs.ts`'te 164 valid + 108 invalid spec hardcoded array olarak yazılır (explicit, diff-friendly).
2. `scaffold.ts` CLI: spec okur → her spec için klasör + `input.ts` (template string serializer, prettier-benzeri ES object literal) + `run.ts` + `meta.json` yazar. Idempotent (`--regenerate` flag yok → mevcut dosya ezilmez; `meta.json.review: "needs-manual-check"` flag'lı klasörler her durumda atlanır).
3. `run-all.ts`: her senaryonun `run.ts`'ini dynamic import → builder çalıştır → `output.xml` veya `actual-error.json` yaz.
4. Valid spec → `runScenario` (mevcut `examples/_lib/runScenario.ts` pattern'i). Invalid spec → `runInvalid` (try/catch + UblBuildError.errors serialize).
5. Scaffold ve run ayrı komutlar — scaffold dokunmadan run tekrar çalıştırılabilir (snapshot regenerate için).

**input-serializer.ts:** `JSON.stringify` değil, custom template string (single-quote literal, trailing comma, import statement + named+default export, mevcut `examples/01-temelfatura-satis/input.ts` pattern'ine bire bir uyumlu). 40-50 satır custom, prettier dev-dep gereksiz.

### 5. Test Stratejisi

`__tests__/examples-matrix/` altında 4 dinamik test dosyası:

- `snapshot.test.ts` — 164 valid snapshot (disk output.xml exact match)
- `json-parity.test.ts` — 164 input.ts ≡ input.json deep-equal
- `invalid-parity.test.ts` — 108 expected-error ≡ actual-error (code set + path + messageSubstring)
- `meta-integrity.test.ts` — 272 meta.json schema doğrulama (tek test, 272 assertion)

**Test delta:** 876 → **1313** (+437).

### 6. Review Aracı (Minimum Viable)

- **README.md:** `meta-indexer.ts` profil bazında gruplanmış markdown tablo üretir. Her satır klasör linki (VSCode'dan tıklanır).
- **`find.ts` CLI:** `npx tsx examples-matrix/find.ts --profile=X --type=Y --error-code=Z --exemption=308 --needs-review`. meta.json tarar, eşleşen path listeler. ~80 satır.

Başka tool yok. Diff view için `git diff` + VSCode folder compare yeterli.

### 7. Commit Granülaritesi (18 alt-commit)

- **8e.0** — Plan kopyala `audit/sprint-08e-plan.md` + log iskelet + `examples-matrix/` iskelet + boş README
- **8e.1** — `_lib/scenario-spec.ts` + `_lib/scenario-generator.ts` + `_lib/input-serializer.ts` + `scaffold.ts` MVP. Smoke: 3 TEMELFATURA spec → dosya üretimi
- **8e.2** — `_lib/runScenario.ts` klon + `run-all.ts` + ilk 10 TEMELFATURA valid (baseline + 9 varyant) + snapshot.test.ts discovery
- **8e.3** — TEMELFATURA kalan 22 senaryo
- **8e.4** — TICARIFATURA 23
- **8e.5** — KAMU 21
- **8e.6** — EARSIVFATURA 36 (YTBISTISNA phantom dahil)
- **8e.7** — IHRACAT + YOLCUBERABER + OZELFATURA + HKS + ENERJI (13)
- **8e.8** — ILAC_TIBBICIHAZ + YATIRIMTESVIK + IDIS (27, phantom senaryoları dahil)
- **8e.9** — Despatch 12 senaryo + despatch snapshot entegrasyon
- **8e.10** — `_lib/runInvalid.ts` + invalid-parity.test.ts + Sınıf A invalid (19)
- **8e.11** — Sınıf B invalid (16)
- **8e.12** — Sınıf C invalid (20)
- **8e.13** — Sınıf D (6) + multi-error (17) + profil-context (30) — 53
- **8e.14** — meta-indexer.ts + README.md auto-generate + meta-integrity.test.ts
- **8e.15** — find.ts CLI + package.json script'leri (`matrix:scaffold`, `matrix:run`, `matrix:find`)
- **8e.16** — Full regression: `npm test` + `npm run examples` + `npm run matrix:run` yeşil + log Bulunan Buglar kapsam
- **8e.17** — CHANGELOG + log kapanış + Sprint 8f taslağı açma (bulunan buglar varsa)

Her commit test yeşil + atomik. Hiçbir commit `src/` dokunmaz.

### 8. Kaynak Dosya Referansları (Reuse)

- `examples/_lib/runScenario.ts` → `examples-matrix/_lib/runScenario.ts` (klon + meta write)
- `examples/_lib/runDespatch.ts` → despatch senaryolarında kullan
- `examples/01-temelfatura-satis/input.ts` → input-serializer template referansı
- `__tests__/examples/snapshot.test.ts` → `__tests__/examples-matrix/snapshot.test.ts` klonu
- `__tests__/examples/json-parity.test.ts` → klon
- `__tests__/examples/validation-errors.test.ts` → `invalid-parity.test.ts` şablonu
- `src/config/constants.ts:13-59` PROFILE_TYPE_MATRIX → specs.ts inşa referansı
- `src/calculator/invoice-rules.ts:250-485` → KDV/exemption/withholding kural doğrulama referansı
- `src/validators/*.ts` 31 error code → invalid specs.ts inşa referansı
- `src/calculator/phantom-kdv-rules.ts` + `src/validators/phantom-kdv-validator.ts` → phantom varyantları
- `examples/run-all.ts` → `examples-matrix/run-all.ts` pattern referansı

### 9. Süre + Disk Tahmini

- 8e.0 (iskelet): 0.3 gün
- 8e.1 (generator MVP): 0.7 gün
- 8e.2-8e.9 (valid batch 164 senaryo): 4 gün (~40/gün scaffold+override hızı)
- 8e.10-8e.13 (invalid 108 senaryo): 3 gün (~35/gün)
- 8e.14-8e.15 (review araçları): 0.5 gün
- 8e.16-8e.17 (regression + log): 0.8 gün

**Toplam: ~9.3 gün efektif → 2 takvim haftası.**

**Disk:** Valid ~8 KB/senaryo × 164 + invalid ~4 KB × 108 + _lib/tests = **~2 MB total** (5 MB eşiğin altında).

### 10. Riskler

- **R1 — Snapshot drift:** validator değişirse 164 output.xml + 108 actual-error.json kırılır. Mitigation: `scaffold --regenerate-outputs` ve `run-all.ts --write` komutları. Sprint 8e'de validator dokunulmaz (R4 sıkı kuralı) → drift riski bu sprintte yok.
- **R2 — Script-generated kod tekrarı:** meta.json/dimensions her varyantın boyutunu explicit kayıtlar. README tablosu boyutları kolondan gösterir. Berkay "üç aynı şey" diye şikayet ederse meta.json spec'i exercise etmiyor demektir → spec revize.
- **R3 — Berkay inceleme yükü:** 272 × 10 sn göz gezdirme = 45 dk. Profil filtreleyerek 30-40'lık grup okunur → toplam 2-3 saat. Fizibil.
- **R4 — src/ dokunma baskısı:** Berkay kararı kesin kapsam dışı. 8e sırasında bulunan her bug `audit/sprint-08e-implementation-log.md` "Bulunan Buglar" section'ına kay'olur, **Sprint 8f açılır**. 8e'de fix yok.
- **R5 — meta.json şema kararsızlığı:** İlk 10 senaryoda schema final; sonra meta-integrity.test.ts hard kural. Her yeni spec aynı schema.
- **R6 — input-serializer prettier düzeyinde çıktı veremez:** Custom 40-50 satır template string baseline yeterli. Fallback: prettier dev-dep eklemek (ama baseline yeterli olmalı).

## Verification

Sprint 8e sonunda doğrulama:

1. **Unit + integration testler:** `npm test` → 876 → **1313** test yeşil (+437).
2. **Mevcut examples:** `npm run examples` → 39 senaryo regenerate, diff yok (mevcut examples/ dokunulmamış).
3. **Matrix scaffold:** `npm run matrix:scaffold` → idempotent rerun, dosya değişimi yok.
4. **Matrix run:** `npm run matrix:run` → 164 valid output.xml + 108 actual-error.json regenerate, git diff yok.
5. **Review CLI:** `npx tsx examples-matrix/find.ts --profile=TEMELFATURA --type=IHRACKAYITLI` → eşleşen klasör path listesi.
6. **README.md:** profil bazında markdown tablo, her satır çalışan klasör linki.
7. **meta-integrity:** Tüm 272 meta.json schema'ya uyumlu.
8. **Build:** `npm run build` → `dist/` temiz.
9. **Lint + typecheck:** `npm run lint` + `npm run typecheck` → 0 error.
10. **Bulunan Buglar logu:** `audit/sprint-08e-implementation-log.md` altında Section "Bulunan Buglar" — her bulunan bug için entry, Sprint 8f açma kararı.

## Kritik Dosyalar (Değiştirilecek / Oluşturulacak)

**Oluşturulacak (examples-matrix/):**
- `examples-matrix/README.md` (auto-generate)
- `examples-matrix/run-all.ts`
- `examples-matrix/scaffold.ts`
- `examples-matrix/find.ts`
- `examples-matrix/_lib/scenario-spec.ts`
- `examples-matrix/_lib/specs.ts` (~1200+ satır hardcoded, split gerekirse ayrı)
- `examples-matrix/_lib/scenario-generator.ts`
- `examples-matrix/_lib/input-serializer.ts`
- `examples-matrix/_lib/meta-indexer.ts`
- `examples-matrix/_lib/runScenario.ts`
- `examples-matrix/_lib/runInvalid.ts`
- 164 valid + 108 invalid klasörü (input.ts + input.json/expected-error.json + output.xml/actual-error.json + run.ts + meta.json)
- `__tests__/examples-matrix/snapshot.test.ts`
- `__tests__/examples-matrix/json-parity.test.ts`
- `__tests__/examples-matrix/invalid-parity.test.ts`
- `__tests__/examples-matrix/meta-integrity.test.ts`

**Güncellenecek:**
- `package.json` — yeni script'ler (`matrix:scaffold`, `matrix:run`, `matrix:find`)
- `audit/sprint-08e-plan.md` — bu planın kopyası (8e.0'da)
- `audit/sprint-08e-implementation-log.md` — batch-bazlı rapor
- `CHANGELOG.md` — 8e girişi

**Dokunulmayacak:**
- `src/**` (R4 sıkı)
- `examples/**` (mevcut 38 senaryo)
- Mimari kararlar M1-M12, AR-1..AR-9

## Açık Sorular (Sprint İçinde Karar)

- **specs.ts tek dosya mı profil-bazlı split mi?** ~1200 satır sınırı aşınca karar. Önce tek dosya dene, 1500+ satır olursa `specs/temelfatura.ts`, `specs/ticarifatura.ts` vb. split.
- **Bulunan bug eşiği nedir?** Tüm buglar Sprint 8f'e — ama log'da "kritik/minör" etiketlenir, 8f öncelik sırasını Berkay belirler.
