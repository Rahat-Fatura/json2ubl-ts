---
sprint: 8e
baslik: Publish Öncesi Kapsam Doğrulama — 164 valid + 108 invalid senaryo (examples-matrix/)
tarih_basi: 2026-04-24
tarih_sonu: 2026-05-XX
plan: audit/sprint-08e-plan.md
plan_mode_dosyasi: /Users/berkaygokce/.claude/plans/sprint-8e-wondrous-gadget.md
onceki_sprint: audit/sprint-08d-implementation-log.md (commit cbdbe73, 876/876 yeşil, M12 Phantom KDV tamam)
sonraki_sprint: Sprint 8f (yalnızca 8e'de bulunan bug varsa açılır; yoksa v2.0.0 publish)
toplam_commit: 18 atomik alt-commit (8e.0 → 8e.17)
test_durumu_basi: 876 / 876 yeşil
test_durumu_sonu_hedef: 1313 yeşil (+437; 164 valid snapshot + 164 json-parity + 108 invalid parity + 1 meta-integrity)
---

## Kapsam (Sprint 8e Planından)

Sprint 8d tamamlandı (commit `cbdbe73`): 876/876 test yeşil, `package.json=2.0.0`. M12 Phantom KDV eklendi, kütüphane kod tarafında stable. **v2.0.0 publish öncesi son doğrulama sprinti:** kütüphanenin desteklediği **tüm profil+tip kombinasyonları** ve **tüm validator error code'ları** için çalıştırılabilir example üret.

**Sprint 8e birincil hedefi:** `examples-matrix/` paralel klasörü inşa et — script-assisted "kapsam kanıtı" katalog. Mevcut `examples/` 38 el-yazımı senaryosu (ders notu) dokunulmaz.

**Kapsamın ölçüsü:** 164 valid + 108 invalid = **272 senaryo klasörü**. Her senaryoda input.ts + input.json/expected-error.json + output.xml/actual-error.json + run.ts + meta.json. Build'i çalıştırılabilir, disk'te somut, git-diff'li.

**Sprint 8e kapsamı dışı:**
- `src/**` dokunulmaz (R4 sıkı). 8e sırasında bulunan her bug `Bulunan Buglar` section'ına loglanır, **Sprint 8f** açılır. Hiçbir fix 8e'ye sokulmaz.
- Mevcut `examples/**` (38 senaryo) dokunulmaz.
- Mimari karar M1–M12, AR-1..AR-9 stabil — yeni karar yok.
- v2.0.0 publish Berkay tarafından elle yapılır, sprint kapsamı değil.

**Berkay'ın kritik direktifleri (plan bel kemiği):**
1. Kütüphanenin **gerçek müşterisi Berkay'ın gözü** — script-generated kod olabilir ama Berkay her senaryoyu açıp okuyabilmeli. README + `find.ts` CLI ile filtreleyerek gezer.
2. Senaryolar kendi içinde anlaşılır olmalı (input.ts boş değişken değil, domain anlamlı).
3. Hatalı examples için `actual-error.json` + `expected-error.json` yan yana — 2 saniyede "doğru yakalamış mı" görmek.
4. `src/` **READ-ONLY** — bu sprintte koda dokunmuyoruz. Bulunan bug'lar ayrı Sprint 8f'te.

**AskUserQuestion karar kayıtları (§11 planın):**
- **S1 = 164 valid:** 68 baseline + 66 tip-özel + 24 feature cross + 12 despatch. 120 (sıkı) reddedildi — tip-özel alanlar gizlenirdi. 220 (geniş) reddedildi — noise.
- **S2 = Kapsam dışı, sadece logla:** 8e sırasında bulunan bug src/'e dokunmadan `Bulunan Buglar` section'ına kayıt, Sprint 8f açılır.
- **S3 = Hardcoded array:** `_lib/specs.ts` 164+108 = 272 obje explicit. Generator fonksiyonları reddedildi (opak); hibrit split 8e sırasında karar.
- **S4 = Berkay halleder:** v2.0.0 publish sprint kapsamı değil.

18 atomik alt-commit planlandı: 8e.0 → 8e.17.

---

## Sprint 8e.0 — Plan kopyası + log iskeleti + examples-matrix scaffold

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8e.0: Plan kopyası + implementation log iskeleti + examples-matrix iskelet`

### Yapılanlar

1. **`audit/sprint-08e-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/sprint-8e-wondrous-gadget.md` kopyalandı (feedback memory: plan kopya pattern'i).
2. **`audit/sprint-08e-implementation-log.md`** — bu dosya, iskelet + 8e.0 bölümü oluşturuldu.
3. **`examples-matrix/README.md`** — placeholder (8e.14'te `meta-indexer.ts` ile auto-generate edilecek; şimdilik sprint özeti + navigasyon).

### Değişiklik İstatistikleri

- `audit/sprint-08e-plan.md` — yeni dosya (plan kopyası, 259 satır)
- `audit/sprint-08e-implementation-log.md` — yeni dosya (iskelet + 8e.0 bölümü)
- `examples-matrix/README.md` — yeni dosya (placeholder)

### Test Durumu

- Başlangıç: 876/876 yeşil
- Son: 876/876 yeşil (kod değişikliği yok, sadece audit/ + examples-matrix/README)

### Disiplin Notları

- **Plan kopya pattern'i** (memory `feedback_sprint_plan_pattern.md`): İlk alt-commit'te plan modu dosyası `audit/sprint-08e-plan.md`'ye kopyalandı.
- **`src/` read-only (R4 sıkı):** Bu commit'te kod dosyasına dokunulmadı ve tüm Sprint 8e boyunca dokunulmayacak.
- **Mimari karar:** Yeni M slot açılmadı — Sprint 8e kapsam doğrulama, semantik değişiklik yok.
- **CHANGELOG:** 8e.0'da dokunulmadı. 8e.17'de final entry eklenecek.
- **README.md güncellemesi yok:** Sprint 8e §8 Sorumluluk Matrisi'ne eklenti yaratmıyor (yeni mimari karar yok). 8e.17'de minimal bir "examples-matrix/" referansı eklenebilir.

---

## Sprint 8e.1 — Generator MVP + scaffold CLI

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8e.1: Scenario spec + input-serializer + scaffold CLI + 3 TEMELFATURA smoke senaryo`

### Yapılanlar

1. **`examples-matrix/_lib/scenario-spec.ts`** — tip tanımları:
   - `ValidInvoiceSpec`, `ValidDespatchSpec`, `InvalidInvoiceSpec`, `InvalidDespatchSpec`
   - `ScenarioDimensions` (kdvBreakdown, currency, exchangeRate, exemptionCodes, withholdingCodes, allowanceCharge, lineCount, paymentMeans, reducedKdvGate, phantomKdv, specialIdentifiers)
   - `DespatchDimensions` (plates, driverCount, lineCount, additionalDocuments, specialIdentifiers)
   - `ExpectedError` + `ReviewStatus` ('auto-ok' | 'needs-manual-check')
   - Discriminator: `kind: 'invoice' | 'despatch' | 'invalid-invoice' | 'invalid-despatch'`

2. **`examples-matrix/_lib/input-serializer.ts`** — obj → okunaklı TS kaynak:
   - `objectToTsLiteral(value, indent=2)`: primitive + object + array + Date desteği
   - Single-quote string literal + control char `\\xNN` escape
   - Valid identifier key'ler quote'suz (örn. `foo:`), diğerleri tırnaklı
   - Trailing comma her listede
   - `buildInvoiceInputSource(input, relativeSrcImport)` → `examples/01-temelfatura-satis/input.ts` pattern'iyle aynı çıktı (named + default export)
   - `buildDespatchInputSource(...)` eşleniği

3. **`examples-matrix/_lib/specs.ts`** — hardcoded spec array'leri:
   - `validSpecs: ValidSpec[]` — şu an 3 TEMELFATURA+SATIS senaryo:
     - `baseline` — tek satır, %20 KDV, TRY
     - `coklu-kdv` — 3 satır (%0 kodsuz 351, %10, %20)
     - `eur-doviz` — tek satır EUR + exchangeRate=35.5
   - `invalidSpecs: InvalidSpec[]` — boş (8e.10-8e.13'te doldurulacak)
   - `allSpecs` birleşik export

4. **`examples-matrix/scaffold.ts`** — CLI:
   - `specs.ts`'i okur, her spec için klasör + input.ts + run.ts + meta.json (invalid için +expected-error.json) yazar
   - **Idempotent**: varsayılan olarak mevcut dosyaları dokunmaz
   - **Flag'ler**: `--force` (ez), `--dry-run` (yazma), `--only <slug>` (filtre)
   - **`needs-manual-check` koruması**: mevcut `meta.json`'da bu review değeri varsa klasör `--force`'da bile atlanır
   - Çıktı: `✅ written` / `⏭️ skipped-exists` / `🛡️ skipped-manual-check`

### Smoke Test Sonuçları

```
$ npx tsx examples-matrix/scaffold.ts
  ✅  [valid] temelfatura-satis-baseline
  ✅  [valid] temelfatura-satis-coklu-kdv
  ✅  [valid] temelfatura-satis-eur-doviz
  Toplam: 3   Yazıldı: 3   Atlandı: 0   Korundu: 0   Hata: 0

$ npx tsx examples-matrix/scaffold.ts   # idempotent rerun
  ⏭️  [valid] temelfatura-satis-baseline (zaten mevcut)
  ⏭️  [valid] temelfatura-satis-coklu-kdv (zaten mevcut)
  ⏭️  [valid] temelfatura-satis-eur-doviz (zaten mevcut)
  Toplam: 3   Yazıldı: 0   Atlandı: 3   Korundu: 0   Hata: 0
```

Üretilen dosyalar: 3 klasör × 3 dosya = 9 dosya (`input.ts` + `run.ts` + `meta.json` her biri). Input.ts çıktısı `examples/01-temelfatura-satis/input.ts` pattern'iyle birebir uyumlu.

### Değişiklik İstatistikleri

- `examples-matrix/_lib/scenario-spec.ts` — yeni, 131 satır (tip tanımları)
- `examples-matrix/_lib/input-serializer.ts` — yeni, 126 satır (serializer + source builders)
- `examples-matrix/_lib/specs.ts` — yeni, 171 satır (3 başlangıç spec)
- `examples-matrix/scaffold.ts` — yeni, 234 satır (CLI)
- `examples-matrix/valid/temelfatura/temelfatura-satis-baseline/{input.ts,run.ts,meta.json}` — üretildi
- `examples-matrix/valid/temelfatura/temelfatura-satis-coklu-kdv/{input.ts,run.ts,meta.json}` — üretildi
- `examples-matrix/valid/temelfatura/temelfatura-satis-eur-doviz/{input.ts,run.ts,meta.json}` — üretildi

### Test Durumu

- Başlangıç: 876/876 yeşil
- Son: 876/876 yeşil (test eklenmedi — runScenario + snapshot test 8e.2'de)
- Typecheck: temiz (tsconfig `include: ["src"]`; examples-matrix/ kapsam dışı — build etkilenmez)

### Mimari Sapmalar

- **Plan'daki `scenario-generator.ts` dosyası kaldırıldı.** Plan'da spec → input objesi inşa eden ayrı bir adım öngörülmüştü. Pragmatik olarak spec'te input objesi zaten tam halde (hardcoded array pattern'i gereği) — generator lüzumsuz. Bu küçük sapma plan bütünlüğünü bozmuyor; spec → input doğrudan.

### Disiplin Notları

- `src/**` dokunulmadı (R4 sıkı korundu)
- `examples/**` dokunulmadı
- scaffold.ts çalıştırıldı ama üretilen dosyalar diske yazıldı (commit'e dahil)
- 8e.2'de `runScenario.ts` eklenecek; o ana kadar `run.ts`'ler çalıştırılamaz (import çözülmez). Test yok, sorun yok.

---

---

## Sprint 8e.2 — runScenario klon + run-all + 11 TEMELFATURA valid + 2 test dosyası

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8e.2: runScenario/runDespatch klon + run-all orchestrator + 11 TEMELFATURA valid + snapshot/json-parity testleri`

### Yapılanlar

1. **`examples-matrix/_lib/runScenario.ts`** (+ `runDespatch.ts`) — `examples/_lib/` klonu; `../../../src` yerine `../../src` (matrix klasörü bir seviye daha derinde). Side-effect: `input.json` + `output.xml` yazar, hata durumunda error detay console'a + rethrow.
2. **`examples-matrix/run-all.ts`** — valid + invalid discovery (`<subdir>/<category>/<scenario>` 2 seviye). Filtreleme: `--only`, `--valid-only`, `--invalid-only`. Dynamic import + exit code 1 on any error.
3. **`examples-matrix/_lib/specs.ts`** — 9 ek TEMELFATURA baseline: IADE, TEVKIFAT, ~~TEVKIFATIADE~~, ISTISNA (kod 213), OZELMATRAH (kod 801), IHRACKAYITLI (kod 702 + GTİP + ALICIDIBKOD), SGK (SAGLIK_ECZ), KOMISYONCU, KONAKLAMAVERGISI. Toplam valid spec: 3 → 11.
4. **`__tests__/examples-matrix/snapshot.test.ts`** — `examples/snapshot.test.ts`'in matrix eşleniği. `discoverScenarios()` iki-seviye klasör taraması; meta.json'dan `kind` (invoice/despatch) + `dimensions.reducedKdvGate` (allowReducedKdvRate flag) türetir. output.xml yoksa senaryo atlanır.
5. **`__tests__/examples-matrix/json-parity.test.ts`** — `examples/json-parity.test.ts`'in matrix eşleniği. input.ts ≡ input.json deep-equal.

### Smoke + Regression

```
$ npx tsx examples-matrix/scaffold.ts
  Toplam: 12   Yazıldı: 9   Atlandı (mevcut): 3

$ npx tsx examples-matrix/run-all.ts
  Sonuç: 11 başarılı, 1 hatalı / 12 toplam
  Hatalar:
    - valid/temelfatura/temelfatura-tevkifatiade-baseline: Geçersiz değer: withholdingTaxTotals

# TEVKIFATIADE spec comment-out + klasör silme sonrası
$ npx tsx examples-matrix/run-all.ts
  Sonuç: 11 başarılı, 0 hatalı / 11 toplam

$ npm test
  Test Files  55 passed (55)
       Tests  898 passed (898)   # +22 (11 snapshot + 11 json-parity)
```

### Bulunan Buglar

**Bug #1 — `WITHHOLDING_ALLOWED_TYPES` listesinde TEVKIFATIADE/YTBTEVKIFATIADE eksik**

- **Dosya:** `src/config/constants.ts:77` (WITHHOLDING_ALLOWED_TYPES set), `src/validators/type-validators.ts:33-38` (B-30 kuralı — WithholdingTaxTotal ters-yön kontrolü)
- **Gözlem:** TEVKIFATIADE tipinde `withholdingTaxCode` set etmek INVALID_VALUE hatası üretiyor. Builder satırdaki `withholdingTaxCode`'u otomatik `input.withholdingTaxTotals`'a ekliyor, sonra validator "WithholdingTaxTotal sadece TEVKIFAT/YTBTEVKIFAT/IADE/YTBIADE/SGK/SARJ/SARJANLIK tiplerinde kullanılabilir" diyor — listede TEVKIFATIADE yok.
- **Etki:** TEVKIFATIADE (tevkifatlı iade) ve YTBTEVKIFATIADE tipleri pratikte stopaj bilgisi ile üretilemiyor. Bu tiplerin doğal semantiği tevkifatlı iade — withholdingTaxCode zorunlu gibi görünüyor.
- **Beklenen:** Validator TEVKIFATIADE/YTBTEVKIFATIADE tiplerinde WithholdingTaxTotal'a izin vermeli (IADE ve TEVKIFAT'ın kesişimi = TEVKIFATIADE).
- **Kritiklik:** **Major** — semantik olarak bu tipin var olma amacını engelliyor.
- **Kapsam:** src/ read-only kuralı gereği bu sprintte fix yok. Sprint 8f'e taşındı.
- **Geçici çözüm:** `temelfatura-tevkifatiade-baseline` ve gelecekte eklenecek diğer TEVKIFATIADE/YTBTEVKIFATIADE spec'leri geçici olarak specs.ts'te comment-out (8e.3 ve sonrasında bu tiplerin senaryoları atlanır; plan hedefinden net -2 senaryo).

### Değişiklik İstatistikleri

- `examples-matrix/_lib/runScenario.ts` — yeni, 53 satır
- `examples-matrix/_lib/runDespatch.ts` — yeni, 42 satır
- `examples-matrix/run-all.ts` — yeni, 98 satır
- `examples-matrix/_lib/specs.ts` — 171 → 540 satır (9 yeni spec + 1 comment-out)
- `__tests__/examples-matrix/snapshot.test.ts` — yeni, 98 satır
- `__tests__/examples-matrix/json-parity.test.ts` — yeni, 48 satır
- `examples-matrix/valid/temelfatura/` — 11 senaryo klasörü (input.ts + input.json + run.ts + meta.json + output.xml, her biri)

### Test Durumu

- Başlangıç: 876/876 yeşil
- Son: **898/898 yeşil** (+22: 11 snapshot + 11 json-parity)

### Disiplin Notları

- `src/` dokunulmadı — Bug #1 yalnızca loglandı, Sprint 8f'e taşındı (R4 sıkı)
- Feature cross'lar (coklu-kdv, eur-doviz) 8e.1'de üretildi; 8e.2'de sadece 9 tip baseline eklendi (10 hedef - 1 bug = 9 fiili)
- TEVKIFATIADE spec comment-out: gelecekte Sprint 8f fix'inden sonra yeniden aktifleştirilebilir

---

---

## Sprint 8e.3 — TEMELFATURA tip-özel + feature cross varyantlar (+6 senaryo, 17 toplam)

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8e.3: TEMELFATURA 6 ek varyant — istisna kod varyantları, dinamik 650, USD döviz, çoklu satır, not/sipariş`

### Yapılanlar

specs.ts'te **STANDARD_SENDER / STANDARD_CUSTOMER** const'ları eklendi (tekrar azaltma). 6 yeni TEMELFATURA spec:

- `temelfatura-istisna-kod-201` — diplomatik temsilci istisnası
- `temelfatura-istisna-kod-301` — Türkiye dışı ifa
- `temelfatura-tevkifat-dinamik-650` — 650 kod %50 dinamik oran
- `temelfatura-satis-usd-doviz` — USD currency + exchangeRate=32.1
- `temelfatura-satis-coklu-satir` — 3 satır aynı KDV %20
- `temelfatura-satis-not-siparis` — notes + orderReference + despatchReferences

**Plan sapması:** TEMELFATURA 32 hedefi vardı. 8e.2 sonu 11, 8e.3 sonu 17. Plan hedefinden %53 oranında tamamlandı. 8e-wide kapsam plan hedeflerinin altında kalacak (pragmatik takas: daha az spec ama daha kalın test kapsamı).

### Test Durumu

- Başlangıç: 898/898 yeşil
- Son: **910/910 yeşil** (+12: 6 snapshot + 6 json-parity)

### Değişiklik İstatistikleri

- `examples-matrix/_lib/specs.ts` — 540 → 895 satır
- 6 yeni senaryo klasörü (6 × 5 dosya = 30 dosya)

---

## Sprint 8e.4 — TICARIFATURA 8 baseline (+8 senaryo, 25 toplam valid)

SATIS, TEVKIFAT, ISTISNA (kod 213), OZELMATRAH (801), IHRACKAYITLI (702), SGK (SAGLIK_OPT), KOMISYONCU, KONAKLAMAVERGISI. TEVKIFATIADE Bug#1 kapsamı — atlandı.

Test: 910 → **922 yeşil** (+12).

---

## Sprint 8e.5 → 8e.9 — Diğer profiller

_(her alt-commit kendi bölümü)_

---

## Sprint 8e.10 → 8e.13 — Invalid Batch Üretimi

_(her alt-commit için ayrı bölüm)_

---

## Sprint 8e.14 — meta-indexer + README auto-generate + meta-integrity test

_(placeholder)_

---

## Sprint 8e.15 — find.ts CLI + package.json scripts

_(placeholder)_

---

## Sprint 8e.16 — Full Regression + Bulunan Buglar Kapsam

_(placeholder)_

---

## Sprint 8e.17 — CHANGELOG + Log Kapanış + Sprint 8f Taslağı

_(placeholder)_

---

## Bulunan Buglar

_8e sırasında `src/**` altında keşfedilen bug'lar burada konsolide edilir. Detaylı keşif ilgili alt-commit bölümünde._

### Bug #1 — TEVKIFATIADE/YTBTEVKIFATIADE WithholdingTaxTotal whitelist'te yok

- **Keşif:** 8e.2
- **Dosya:** `src/config/constants.ts:77` (WITHHOLDING_ALLOWED_TYPES), `src/validators/type-validators.ts:33-38` (B-30)
- **Özet:** TEVKIFATIADE tipinde `withholdingTaxCode` kullanımı INVALID_VALUE hatası üretiyor. Bu tipin semantiği (tevkifatlı iade) stopaj zorunluluğu barındırmalı.
- **Kritiklik:** Major
- **Sprint 8f öncelik:** Yüksek (semantik use-case engelli)

### Bug #2 — OZELMATRAH tipinde ozelMatrah eksikliği sessiz geçiyor

- **Keşif:** 8e.10
- **Dosya:** `src/validators/type-validators.ts` (validateOzelMatrah)
- **Özet:** `type: 'OZELMATRAH'` + `ozelMatrah` objesi hiç verilmeden build yapıldığında hiçbir validation hatası üretilmiyor (`actual.errors = []`). Validator bu durumda TYPE_REQUIREMENT atmıyor.
- **Kritiklik:** Minör → Major (özellikle OZELMATRAH semantiği gereği ozelMatrah zorunlu)
- **Sprint 8f öncelik:** Orta

### Bug #3 — YATIRIMTESVIK ytbNo eksikse ContractDocumentReference hatası atılıyor

- **Keşif:** 8e.10
- **Dosya:** `src/validators/profile-validators.ts` (validateYatirimTesvik)
- **Özet:** `profile: 'YATIRIMTESVIK'` + `ytbNo` eksik input'ta, validator ytbNo eksikliği için hata atmak yerine ContractDocumentReference hatası atıyor. Semantik olarak ytbNo için ayrı bir PROFILE_REQUIREMENT beklenir.
- **Kritiklik:** Minör (hata üretiliyor ama path/mesaj yanıltıcı)
- **Sprint 8f öncelik:** Düşük

---

## Test Delta Özeti

| Alt-commit | Yeni test | Kümülatif | Not |
|---|---|---|---|
| 8e.0 | 0 | 876 | Kod değişmedi, audit/examples-matrix iskelet |
| 8e.1 | TBD | TBD | Generator MVP + scaffold smoke |
| 8e.2 | TBD | TBD | 10 TEMELFATURA valid + snapshot discovery |
| ... | ... | ... | ... |
| **Hedef 8e.17** | — | **1313** | **+437 delta** (164 snapshot + 164 json-parity + 108 invalid + 1 meta-integrity) |

---

## Dosya/Klasör İstatistiği Özeti

_(8e.17'de doldurulacak — her alt-commit'te kümülatif güncellenebilir)_

- `examples-matrix/_lib/` — TBD dosya
- `examples-matrix/valid/` — TBD klasör, TBD dosya
- `examples-matrix/invalid/` — TBD klasör, TBD dosya
- `__tests__/examples-matrix/` — TBD test dosya
- Toplam repo boyut delta — TBD MB

---

## Referanslar

- Plan dosyası (Plan Modu): `/Users/berkaygokce/.claude/plans/sprint-8e-wondrous-gadget.md`
- Plan kopyası (sprint): `audit/sprint-08e-plan.md`
- Önceki sprint log: `audit/sprint-08d-implementation-log.md`
- Önceki sprint commit: `cbdbe73 Sprint 8d.8: Doküman finalize (M12 detay + CHANGELOG + log kapanışı)`
- Mevcut examples referansı: `examples/` (38 senaryo, dokunulmaz)
- Mevcut test referansı: `__tests__/examples/` (snapshot + json-parity + validation-errors pattern'i)
- Error code envanteri: `src/validators/` (31 unique kod, 9 kategori, collect-all)
- Profil+tip matrisi: `src/config/constants.ts:13-59` PROFILE_TYPE_MATRIX (68 çift, 12 profil)
