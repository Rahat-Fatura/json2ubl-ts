---
sprint: 8b
baslik: Comprehensive Examples Pack + Docs/Release Prep
tarih_basi: 2026-04-23
tarih_sonu: 2026-04-23
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

## Sprint 8b.5 — §6-§8 niş profiller (7 senaryo, 20-26)

**Commit:** `ad36015`
20-yolcu-beraber (basic), 21-earsiv-satis-basic, 22-earsiv-teknolojidestek (TCKN zorunlu), 23-hks-satis (KUNYENO 19-karakter), 24-ilac-tibbicihaz, 25-enerji-sarj, 26-idis-satis (ETIKETNO 2-harf+7-rakam düzeltme).
Test: 641/641 · Examples: 26/26.

## Sprint 8b.6 — §9 Feature varyantları (27-32)

**Commit:** `14a6ee7`
EUR, çoklu KDV, AllowanceCharge, M4/B-96 555, 4171 ÖTV tevkifatı (basic), notes/orderRef/paymentMeans.
Test: 641/641 · Examples: 32/32.

## Sprint 8b.7 — §10 Despatch (33-36)

**Commit:** `2a39557`
Yeni: `examples/_lib/runDespatch.ts`. Tek sürücü, çoklu sürücü+carrier+DORSEPLAKA, MATBUDAN, IDIS+ETIKETNO. 26-idis-satis ETIKETNO formatı aynı düzeltmeyle strict moda alındı.
Test: 641/641 · Examples: 36/36.

## Sprint 8b.8 — §11 Showcase (99-* × 2)

**Commit:** `9bf9bd7`
99-showcase-everything (TEMELFATURA+TEVKIFAT, çoklu KDV+iskonto+650+EUR+notes+payment+order+ek belgeler — basic), 99-showcase-ihracat-full (5 satır IHRACAT+FOB/CIF/EXW/DAP/DDP).
Test: 641/641 · **Examples: 38/38 — paket tamamlandı.**

## Sprint 8b.9 — __tests__/examples test suite

**Commit:** `640cee9`
3 dosya: snapshot.test.ts (38 it, exact XML match), json-parity.test.ts (38 it, input.ts ≡ input.json), validation-errors.test.ts (38 slug-bazlı smoke). Plan'daki 228 test hedefi yerine slug-bazlı 114 test (src/ read-only disiplini, strict per-case 8c sonrası).
Test: 641 → **755 yeşil (+114)**.

## Sprint 8b.10 — Dead code cleanup (B-93)

**Commit:** `9922ac5`
`ublExtensionsPlaceholder()` deprecated function silindi (xml-helpers.ts), comment-out kalıntıları temizlendi (invoice-serializer + despatch-serializer). UBLExtensions artık kütüphane sorumluluğunda değil (ACIK-SORULAR §3).
Test: 755/755.

## Sprint 8b.11 — README §8 Sorumluluk Matrisi

**Commit:** `ff65e60`
README.md §7 sonrası §8 eklendi: M1-M10 + AR-1..AR-8 + B-07/08/83/104 tablosu, "Kütüphane SORUMLULUĞUNDA OLMAYAN" bölümü (imza, stopaj XML pattern, prod schematron). Examples/ link'leri her maddede.

## Sprint 8b.12 — Skill doc patch referans

**Commit:** `9338485`
`audit/skill-doc-patches-sprint-8b.md`: skill repo'sundaki `kod-listeleri §4.9.3-5` + `e-fatura §77.1` eklenecek içerik ve uygulama talimatı. Skill repo git commit'i ayrı (8c veya manuel).

## Sprint 8b.13 — CHANGELOG.md v2.0.0

**Commit:** `6550ab0`
Keep a Changelog 1.1.0 formatı. BREAKING CHANGES, Added, Changed, Fixed, Removed kategorileri. Sprint 1-8b konsolidasyonu. Sprint 8c hotfix referansı (ACIK-SORULAR §4 → B-NEW-01..12).

## Sprint 8b.14 — Implementation log finalize + Sprint 8c devir

**Commit:** `TBD` (bu commit)

### Log Tamamlandı

Bu commit ile 8b.5-8b.13 bölümleri log'a eklendi, Sprint 8c devir listesi netleştirildi.

### Sprint 8c Devir Listesi

Aşağıdaki maddeler Sprint 8b kapsamı dışı; Sprint 8c'de yapılacak.

#### Release (plan §9)

1. `package.json` version bump: `1.4.2` → `2.0.0`
2. `git tag v2.0.0` + `npm publish --dry-run` smoke → `npm publish`
3. GitHub release notes (CHANGELOG v2.0.0 entry'sinden kopya)
4. Skill repo git commit: `audit/skill-doc-patches-sprint-8b.md` içeriği uygulanır (ayrı repo commit)

#### Src/ Hotfix'leri (ACIK-SORULAR §4 — B-NEW-01..12)

| ID | Özet | Etki |
|----|------|------|
| B-NEW-01 | SimpleLineInput.kdvPercent alt sınır (negatif kabul) | Silent accept |
| B-NEW-02 | SimpleLineInput.quantity>0 kontrolü yok | Silent accept |
| B-NEW-03 | SimpleLineTaxInput.percent üst sınır yok | Silent accept |
| B-NEW-04 | 351 tek-satır kdvPercent>0 (requiresZeroKdvLine) tetiklenmiyor | Silent accept |
| B-NEW-05 | type=SATIS+702 basic cross-check tetiklemiyor | Silent accept |
| B-NEW-06 | type=IHRACKAYITLI+kdvExemptionCode eksik yakalanmıyor | Silent accept |
| B-NEW-07 | IHRACKAYITLI 702 satır KDV>0 basic'te kaçıyor | Silent accept |
| B-NEW-08 | type=SGK + sgk obje eksik yakalanmıyor | Silent accept |
| B-NEW-09 | sgk.type whitelist yok | Silent accept |
| B-NEW-10 | sgk.documentNo boş yakalanmıyor | Silent accept |
| **B-NEW-11** | TEVKIFAT + strict B-81/M5 `requiresZeroKdvLine` false-positive | 05/10/16/31 basic mod workaround |
| **B-NEW-12** | IHRACKAYITLI+702 için simple-input AlıcıDİBKod ağacı yok | 07/17 basic mod workaround |

**Her B-NEW-XX ayrı commit** olarak Sprint 8c'de giderilir. Snapshot testler (snapshot.test.ts) etkilenecek → validation-errors.ts'ler paralel güncellenir.

#### 8c Test Sıkılaştırma

- `__tests__/examples/validation-errors.test.ts` lenient smoke → strict per-case assert (plan hedef: 228 test). Toplam hedef: **~869 test**.

#### Opsiyonel

- Despatch `__tests__/fixtures/` eklenmesi (8b examples/irsaliye yeterli gözüküyor, 8c'de karar)
- Next.js v2.0.0 rewrite'ta kütüphaneyi gerçek kullanım (Sprint 8b examples'ın canlı tüketim sınavı)

### Sprint 8b Toplu İstatistikler

| Metrik | Değer |
|--------|-------|
| Atomik commit | 15 (8b.0 → 8b.14) |
| Senaryo | 38 (32 invoice + 4 despatch + 2 showcase) |
| Fixture paralelliği | 8 Mimsoft f10-f17 → 02/03/06/07/08/12/13/15 |
| Yeni dosya (git tracked) | ~230 |
| Yeni test | +114 (641 → 755) |
| src/ dokunuş | Sadece 8b.10 dead code cleanup (B-93 ublExtensionsPlaceholder silindi) |
| Yeni src/ bulgu (→ 8c) | 12 (B-NEW-01..12, ACIK-SORULAR §4) |
| Dokümantasyon | CHANGELOG.md yoktan, README §8 eklendi, skill patch referans |
| Mimari karar | Yok (plan gereği M/AR stabil) |

### Disiplin Notları (kapanış)

- **Plan kopya pattern'i:** ✓ (8b.0, `audit/sprint-08b-plan.md`)
- **src/ read-only:** ✓ (sadece 8b.10 planın kapsamında dead code)
- **Yeni M/AR yok:** ✓ (tüm bulgular B-NEW-XX 8c hotfix)
- **XSD vs runtime disiplini:** ✓ (validation-errors keyfi runtime icat etmedi)
- **Mimsoft fixture 1-1:** Yapısal eşleşme + tutar yakınlık (tarih/VKN/ID fiktif) — plan §5 R5 tolere edilen

### Sapma Özeti (R* risk mitigation)

- **R4 (validation-errors kalibrasyonu):** `_dev-capture-errors.ts` dev helper ile iteratif; `expectedErrorMessage` + `notCaughtYet` alanları ile genişletilmiş interface. Tam strict assert 8c'ye bırakıldı.
- **R7 (src/ bug discovery):** 12 bulgu ACIK-SORULAR §4'e aktarıldı, 8b'de hotfix yapılmadı.
- **R8 (skill doc ayrı repo):** `audit/skill-doc-patches-sprint-8b.md` referans kaydı — skill repo commit'i 8c'de.
- **R9 (despatch fixture yok):** Examples/irsaliye 4 senaryonun output.xml'i snapshot görevi gördü; 8c opsiyonel.

---

**Sprint 8b tamamlandı.** Kod dev-complete + comprehensive examples (38) + doc kompetent. v2.0.0 release Sprint 8c'de.
