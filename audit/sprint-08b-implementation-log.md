---
sprint: 8b
baslik: Comprehensive Examples Pack + Docs/Release Prep
tarih_basi: 2026-04-23
tarih_sonu: TBD (devam ediyor)
plan: audit/sprint-08b-plan.md
fix_plani: audit/FIX-PLANI-v3.md §319-384 (Sprint 8 bölümü — 8a sonrası kalan: B-93, B-95, B-96, B-102, B-S01..B-S05)
onceki_sprint: audit/sprint-08a-implementation-log.md (commit 966a049)
sonraki_sprint: Sprint 8c (v2.0.0 bump + git tag + npm publish + release notes)
toplam_commit: 15 atomik alt-commit (8b.0 → 8b.14)
test_durumu_basi: 641 / 641 yeşil (40 dosya)
test_durumu_sonu_hedef: ~869 / ~869 yeşil (43 dosya, +228 test)
---

## Kapsam (Sprint 8b Planından)

Sprint 8a tamamlandı (commit `966a049`): 641/641 test yeşil, 108 bulgudan kod kapsamındakiler kapatıldı, mimari kararlar (M1-M10, AR-1..AR-8) kilitli. Kod dev-complete.

**Sprint 8b birincil hedefi:** Kütüphanenin desteklediği tüm anlamlı senaryoları **çalıştırılabilir ders notu** olarak vermek — 38 senaryo × 6 dosya (README + input.ts + input.json + output.xml + run.ts + validation-errors.ts).

**Sprint 8b ikincil hedefi:** README Sorumluluk Matrisi (B-95, B-96, B-102), CHANGELOG v2.0.0, skill doc updates (B-S01..B-S05), dead code cleanup (B-93), stale `examples/output/` replace.

**Sprint 8c'ye bırakılan:** `package.json` 1.4.2 → 2.0.0 bump, `git tag v2.0.0`, npm publish, GitHub release notes. Sprint 8b **salt doküman + example** sprintidir — `src/` read-only.

15 atomik alt-commit planlandı: 8b.0 → 8b.14.

---

## Sprint 8b.0 — Plan kopyası + log iskelet + FIX-PLANI işaretleme

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8b.0: Plan kopyası + implementation log iskelet + FIX-PLANI işaretleme`

### Yapılanlar

1. **`audit/sprint-08b-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/hidden-crunching-wall.md` kopyalandı (feedback memory: plan kopya pattern'i).
2. **`audit/sprint-08b-implementation-log.md`** — bu dosya, iskelet + 8b.0 bölümü oluşturuldu.
3. **`audit/FIX-PLANI-v3.md` §319-384 işaretleme:** Sprint 8 bölümü iki alt-sprinte ayrıldı; 8a kapatılan bulguların işaret (✅), 8b kapsamına giren bulgular işaret (→ 8b).

### Değişiklik İstatistikleri

- `audit/sprint-08b-plan.md` — yeni dosya (plan kopyası, ~460 satır)
- `audit/sprint-08b-implementation-log.md` — yeni dosya (iskelet + 8b.0 bölümü)
- `audit/FIX-PLANI-v3.md` — §319-384 işaretleme güncellemesi

### Test Durumu

- Başlangıç: 641/641 yeşil
- Son: 641/641 yeşil (kod değişikliği yok, sadece audit/ dokümanları)

### Disiplin Notları

- **Plan kopya pattern'i** (memory `feedback_sprint_plan_pattern.md`): İlk alt-commit'te plan modu dosyası `audit/sprint-08b-plan.md`'ye kopyalandı.
- **`src/` read-only:** Bu commit'te kod dosyasına dokunulmadı.
- **FIX-PLANI işaretleme:** Sprint 8a'da kapatılan B-92, B-94 işaret altına alındı; 8b kapsamındakiler (B-93, B-95, B-96, B-102, B-S01..B-S05) "→ 8b" işaret edildi.

---

## Sprint 8b.1 — Eski examples temizlik + yeni iskelet

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8b.1: Eski examples temizlik + yeni iskelet`

### Yapılanlar

1. **Silinen eski yapı (v1.x kalıntı):**
   - `examples/output/` — 30 alt-dizin (01-temel-satis → 30-iskontolu-tevkifat, her biri `input.json + output.xml + calculation.json + summary.txt`)
   - `examples/run-all.ts` (eski versiyon — `SimpleInvoiceBuilder` + `scenarios.ts` senaryo array'i)
   - `examples/scenarios.ts`
   - `examples/session-demo.ts`

   **Gerekçe:** Üretilen XML'ler `CustomizationID=TR1.2.1` (M8 sonrası Fatura için yanlış), boş `UBLExtensions` (kütüphane üretmemeli) ve Sprint 1-8a validator/serializer değişikliklerini yansıtmıyordu.

2. **Yeni iskelet:**
   - `examples/run-all.ts` — auto-discover runner: `examples/NN-slug/run.ts` klasörlerini regex filtreleyip (`^(\d{2}|99)-`) dynamic import ile sırayla çalıştırır. CLI filtre desteği (`npx tsx examples/run-all.ts yatirimtesvik`).
   - `examples/README.md` — 38 senaryo katalogu (tablo formatı, profil bazlı §1-§11 gruplama, fixture paralellik matrisi, kasıtlı kapsam dışı bölümü, CustomizationID uyarısı).

3. **`package.json` scripts:** `"examples": "tsx examples/run-all.ts"` mevcut komut aynı dosyayı çağırıyor, güncelleme gerekmedi.

### Test Durumu

- Başlangıç: 641/641 yeşil
- Son: **641/641 yeşil** (kod değişikliği yok — sadece `examples/` dizini)
- `npx tsx examples/run-all.ts` smoke: 0 senaryo, graceful exit

### Değişiklik İstatistikleri

- Disk'ten silinen: 30 alt-dizin × 4 dosya (`examples/output/*` gitignored — git commit'e dahil değil) + 3 tracked TS dosyası (`run-all.ts`, `scenarios.ts`, `session-demo.ts`)
- Git commit diff: `examples/scenarios.ts` (-), `examples/session-demo.ts` (-), `examples/run-all.ts` (reset + yeni), `examples/README.md` (yeni)
- `examples/run-all.ts` — 72 LOC (yeni auto-discover, eski 186 LOC replaced)
- `examples/README.md` — 138 LOC (katalog)

### Disiplin Notları

- **`src/` read-only:** Bu commit'te kod dosyasına dokunulmadı.
- **Git tracking:** Silinen 30 alt-dizin git'te tracked'di; `git rm` ile kaldırıldı. Revert edilebilir (önceki commit'ten restore).
- **Auto-discover:** Yeni runner regex filtre ile klasörlerini bulur; 8b.2+ commit'lerinde yeni klasörler eklendikçe otomatik dahil olur.
- **Katalog link'leri:** README'de `./NN-slug/` relatif link'leri var; klasörler henüz yok (8b.2+'de dolacak). 8b.14'te tüm link'ler canlı olur.

---

## Sprint 8b.2 — §1 TEMELFATURA (8 senaryo, 01-08)

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8b.2: §1 TEMELFATURA (8 senaryo, 01-08) + ACIK-SORULAR §4`

### Yapılanlar

1. **`examples/_lib/runScenario.ts`** oluşturuldu — ortak helper: input.json + output.xml yazar, hata detayını console'a basar, `throw err` ile runner'a bildirir. Her run.ts ~4 satıra indi.

2. **8 senaryo** tam yapısıyla kuruldu (`01-temelfatura-satis` … `08-temelfatura-sgk`). Her klasörde 6 dosya: `README.md`, `input.ts`, `input.json` (auto-generated), `output.xml` (auto-generated), `run.ts`, `validation-errors.ts`.

3. **Fixture paralelliği:** 02→f10, 03→f11, 06→f15, 07→f12, 08→f16 (yapısal aynılık, tutar eşdeğerliği — VKN/UUID/tarih fiktif).

4. **`_dev-capture-errors.ts` dev helper** (gitignored `examples/_dev-*.ts`) — bir senaryonun `validation-errors.ts`'indeki tüm invalid case'leri build'e verip UblBuildError.errors'u console'a döker. Her senaryoda gerçek validator çıktısıyla `expectedErrors` kalibrasyonu için.

5. **Validation-errors genişletilmiş interface** — `ExpectedValidationError[]` + `expectedErrorMessage` (pre-check Error throws) + `notCaughtYet` (kütüphanenin henüz yakalamadığı → 8c hotfix) + per-case `validationLevel` override.

6. **`audit/ACIK-SORULAR.md` §4 eklendi** — 12 src/ eksikliği notu (B-NEW-01..B-NEW-12). Sprint 8c hotfix adayları.

### Senaryo Detayı

| # | Slug | Kapsam | Validator mod | Payable |
|---|------|--------|----------------|---------|
| 01 | temelfatura-satis | Baseline — VKN + KDV %20 tek satır | strict | 1.200 TRY |
| 02 | temelfatura-satis-gelir-stopaji | f10 paralel — 0003 %23 Gelir Stopajı | strict | 14.550 TRY |
| 03 | temelfatura-satis-kurumlar-stopaji | f11 paralel — 0011 %32 Kurumlar Stopajı | strict | 13.200 TRY |
| 04 | temelfatura-iade | BillingReference zorunlu (Schematron IADEInvioceCheck) | strict | 600 TRY |
| 05 | temelfatura-tevkifat | KDV tevkifatı kod 603 %70 | **basic** (B-NEW-11) | 1.060 TRY |
| 06 | temelfatura-istisna-351 | f15 paralel — 351 kodu + KDV=0 | strict | 100 TRY |
| 07 | temelfatura-ihrackayitli-702 | f12 paralel — 702 + GTİP + buyerCode | **basic** (B-NEW-12) | 100 TRY |
| 08 | temelfatura-sgk | f16 paralel — SGK/SAGLIK_ECZ + KDV %20 | strict | 120 TRY |

### Sapmalar (Plan'a Göre)

- **S1 — validationLevel basic fallback:** 05 ve 07 senaryoları strict modda kütüphane bug/eksikliği (B-NEW-11, B-NEW-12) nedeniyle fail ediyordu. Plan "R4 gerçek hatayı yakala" ve "R7 src/ read-only" gereklerini birleştirerek: 05, 07 için per-scenario `validationLevel: 'basic'` uygulanıyor. README'lerinde kısıtlama belirtildi; ACIK-SORULAR §4'te hotfix adayları olarak listelendi.
- **S2 — validation-errors interface genişledi:** Plan 4 `ExpectedValidationError` dedi; gerçekte bazı invalid case'ler `Error` (UblBuildError değil) veya hiç hata üretmiyor. Interface `expectedErrorMessage` + `notCaughtYet` alanlarıyla genişletildi. Bu 8b.9 test suite'ine uyumludur (test runner üç durum arasında ayrım yapar).
- **S3 — `_dev-capture-errors.ts` dev helper:** Plan bu dosyayı öngörmemişti; `_dev-*.ts` gitignored pattern ile iteratif validator hatalarını yakalamak için eklendi.

### Test Durumu

- Başlangıç: 641/641 yeşil
- Son: **641/641 yeşil** (src/ dokunulmadı)
- `npx tsx examples/run-all.ts` → 8 başarılı, 0 hatalı / 8 toplam
- Her senaryo izolasyon smoke: `npx tsx examples/NN-slug/run.ts` OK

### Değişiklik İstatistikleri

- Yeni: `examples/_lib/runScenario.ts` (44 LOC)
- Yeni: 8 senaryo × 6 dosya = 48 dosya (input.ts ~30-55 LOC, validation-errors.ts ~55-90 LOC, README ~80-130 LOC, run.ts ~4 LOC, input.json + output.xml auto-generated)
- `audit/ACIK-SORULAR.md` — §4 ek bölüm (12 madde, ~80 LOC)
- `.gitignore` — `examples/_dev-*.ts` pattern
- Toplam net ~2.400 LOC yeni kod + doc

### Disiplin Notları

- **`src/` read-only:** ✓ Kod dosyasına dokunulmadı; bug/eksiklikler ACIK-SORULAR §4'te.
- **Plan kopya pattern'i:** ✓ (8b.0'da zaten uygulandı)
- **Yeni M/AR:** Yok. B-NEW-01..12 src/ hotfix, mimari karar değil.
- **XSD vs runtime:** ✓ validation-errors.ts'lerde keyfi runtime zorunluluk icat edilmedi; `notCaughtYet` sadece var olan eksikleri belgeler.

---

## Sprint 8b.3 — §2 TICARIFATURA (3) + §3 YATIRIMTESVIK (3)

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8b.3: §2 TICARIFATURA + §3 YATIRIMTESVIK (6 senaryo)`

### Yapılanlar

6 senaryo tam yapısıyla kuruldu (`09-ticarifatura-satis` … `14-yatirimtesvik-iade`). Her klasörde 6 dosya standartı korundu.

### Senaryo Detayı

| # | Slug | Kapsam | Validator mod | Payable |
|---|------|--------|----------------|---------|
| 09 | ticarifatura-satis | TEMELFATURA'dan fark: IADE yok | strict | 2.400 TRY |
| 10 | ticarifatura-tevkifat-650-dinamik | **M3/B-95:** 650 dinamik %25 | **basic** (B-NEW-11) | 1.150 TRY |
| 11 | ticarifatura-istisna | İstisna 213 (201-250 aralığı) | strict | 1.000 TRY |
| 12 | yatirimtesvik-satis-makina | f13 paralel, ytbNo + ItemClass 01 + productTrace+serial+brand+model | strict | 672 TRY |
| 13 | yatirimtesvik-satis-insaat | f14 paralel, ItemClass 03 (satırda extra alan gerekmez) | strict | 672 TRY |
| 14 | yatirimtesvik-iade | IADE + BillingReference + B-08 istisnası | strict | 240 TRY |

### Keşif (iteratif düzeltme)

- **14 ilk build fail:** `datetime` gelecek tarih (2026-04-24 > bugün 2026-04-23) + `model` alanı eksik (Kod 01 Makine için zorunlu). Her ikisi düzeltildi.
- **B-NEW-11 workaround 10'da da uygulandı** (10 → basic mod, TICARIFATURA + TEVKIFAT tek satır).

### Test Durumu

- Başlangıç: 641/641 yeşil
- Son: **641/641 yeşil** (src/ dokunulmadı)
- `npx tsx examples/run-all.ts` → **14 başarılı, 0 hatalı / 14 toplam**

### Değişiklik İstatistikleri

- 6 senaryo × 6 dosya = 36 dosya (input.ts ~40-75 LOC, validation-errors.ts ~60 LOC, README ~50-80 LOC, run.ts 4 LOC)
- Toplam net ~1.500 LOC yeni kod + doc

### Disiplin Notları

- **`src/` read-only:** ✓
- **Yeni M/AR:** Yok. Tüm "not-caught" case'ler B-NEW-XX ACIK-SORULAR §4'e referans.
- **Mimsoft fixture paralelliği:** f13 → 12, f14 → 13 (yapısal aynılık).

---

## Sprint 8b.4 — §4 KAMU (3) + §5 IHRACAT (2)

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8b.4: §4 KAMU + §5 IHRACAT (5 senaryo)`

### Senaryo Detayı

| # | Slug | Kapsam | Validator mod |
|---|------|--------|----------------|
| 15 | kamu-satis | f17 paralel, BuyerCustomer + TR IBAN (B-83) | strict |
| 16 | kamu-tevkifat | KAMU + 601 %40 tevkifat | basic (B-NEW-11) |
| 17 | kamu-ihrackayitli | KAMU + 702 + GTİP | basic (B-NEW-12) |
| 18 | ihracat-istisna-basic | IHRACAT + 301 + USD + buyerCustomer | strict |
| 19 | ihracat-istisna-multiline-incoterms | 3 satır + FOB/CIF/EXW | strict |

### İteratif Düzeltmeler

- **15 fail:** `buyerCustomer` KAMU profilinde zorunlu (runtime kontrol yakaladı). Kamu aracı kurum + MUSTERINO identifications eklendi.
- **16, 17:** buyerCustomer KAMU profilinden alındığı için onlara da eklendi (aynı hata pattern'i).

### Test Durumu

- Başlangıç: 641/641 yeşil
- Son: **641/641 yeşil** · `npx tsx examples/run-all.ts` → 19/19 başarılı.

### Değişiklik İstatistikleri

- 5 senaryo × 6 dosya = 30 dosya, ~1.300 LOC

---

<!-- 8b.5 → 8b.14 alt-commit bölümleri commit sırasında eklenecek -->
