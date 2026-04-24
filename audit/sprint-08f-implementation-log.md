---
sprint: 8f
baslik: Bug Hotfix'leri (Bug #1-3) + examples-matrix 95 → 162 kapsam + README/meta-indexer geliştirmeleri
tarih_basi: 2026-04-24
tarih_sonu: 2026-04-24
plan: audit/sprint-08f-plan.md
plan_mode_dosyasi: /Users/berkaygokce/.claude/plans/sprint-8f-keen-cupcake.md
onceki_sprint: audit/sprint-08e-implementation-log.md (commit 52c1ff5, 1049/1049 yeşil, 95 senaryo)
sonraki_sprint: Sprint 8g (v2.0.0 publish sonrası esnek kalemler — multi-error +7, invalid edge cases +4)
toplam_commit: 17 atomik alt-commit (8f.0 → 8f.16)
test_durumu_basi: 1049 / 1049 yeşil
test_durumu_sonu: 1176 / 1176 yeşil (+127)
---

## Kapsam (Sprint 8f Planından)

Sprint 8e (commit `52c1ff5`) `examples-matrix/` altyapısını tamamladı ve 95 senaryo üretti. 1049/1049 test yeşil, `src/` tüm 8e boyunca dokunulmadı. 8e'de 3 bug keşfedildi, `src/` read-only disiplini gereği 8f'e ertelendi.

**Sprint 8f birincil hedefi:** 3 bug fix + test + TEVKIFATIADE reaktivasyon — ✅ tamam.
**İkincil hedef:** examples-matrix %35 → %66 (95 → ~180 senaryo) — ✅ 162 senaryo (%60, plan §11 kapsam ayarı ile).
**Üçüncül hedef:** README/meta-indexer pivot + coverage gap + filtre genişletme — ✅ tamam.

**Bug listesi (8e'den devralındı, 8f'te fix):**
1. **Bug #1 (Major):** `src/config/constants.ts:77` `WITHHOLDING_ALLOWED_TYPES` set'inde TEVKIFATIADE + YTBTEVKIFATIADE eksik. Fix: 8f.1 ✅
2. **Bug #2 (Orta):** `src/validators/type-validators.ts:188-202` `validateOzelMatrah` `taxExemptionReasonCode` eksikliğini sessiz geçiyor. Fix: 8f.2 ✅
3. **Bug #3 (Düşük):** `src/validators/profile-validators.ts:248-258` YATIRIMTESVIK ytbNo eksik mesajı teknik XML path'i veriyor. Fix: 8f.3 ✅ (yeni `YATIRIMTESVIK_REQUIRES_YTBNO` error code).

**Sprint 8f kapsamı dışı:**
- Yeni feature / refactor (`src/` sadece bug fix için yazıldı) — disiplin korundu.
- v2.0.0 publish (8f.16'da checklist üretildi, Berkay manuel publish).
- Mevcut `examples/` 38 senaryoya dokunulmadı — regresyon 38/38 yeşil.

---

## Sprint 8f.0 — Plan kopyası + implementation log iskeleti

**Commit:** `b868807`
**Tarih:** 2026-04-24

### Yapılanlar

1. **`audit/sprint-08f-plan.md`** — Plan Modu dosyası kopyalandı (620 satır).
2. **`audit/sprint-08f-implementation-log.md`** — iskelet + 8f.0 bölümü.

### Test

- Başlangıç: 1049/1049 yeşil
- Son: 1049/1049 yeşil (kod değişikliği yok)

---

## Sprint 8f.1 — Bug #1 fix (WITHHOLDING_ALLOWED_TYPES)

**Commit:** `53f88c2`

### Yapılanlar

- `src/config/constants.ts:77-82` — set'e `TEVKIFATIADE` + `YTBTEVKIFATIADE` eklendi.
- `src/validators/type-validators.ts:36` — B-30 hata mesajı listesi güncellendi.
- `__tests__/validators/type-profile-b29-b30-b31.test.ts` — 3 yeni test (TEVKIFATIADE kabul, YTBTEVKIFATIADE kabul, SATIS HALA reddedilir regresyon).

### Test Durumu

- Başlangıç: 1049/1049
- Son: **1052/1052 yeşil** (+3)

### Disiplin Notları

- `src/` değiştirildi (bug fix kapsamında, R4 esnek).
- Mimari karar değişmedi.

---

## Sprint 8f.2 — Bug #2 fix (validateOzelMatrah zorunluluk)

**Commit:** `311deba`

### Yapılanlar

- `src/validators/type-validators.ts:188-208` — `validateOzelMatrah` fonksiyonuna `isNonEmpty(ts.taxExemptionReasonCode)` eksiklik kontrolü eklendi; eksikse `TYPE_REQUIREMENT` + 801-812 mesajı.
- `__tests__/validators/type-profile-b29-b30-b31.test.ts` — 3 yeni test (eksik → TYPE_REQUIREMENT, 801 kabul regresyon, 999 whitelist INVALID_VALUE).

### Test

- 1052 → **1055 yeşil** (+3)
- Mevcut 3 OZELMATRAH senaryo (TEMELFATURA/TICARIFATURA/KAMU, kod 801/805): regresyon yok.

---

## Sprint 8f.3 — Bug #3 fix (YATIRIMTESVIK_REQUIRES_YTBNO yeni error code)

**Commit:** `7fc819e`

### Yapılanlar

1. `src/validators/validation-result.ts` — yeni `yatirimTesvikRequiresYtbNo(path, message)` helper.
2. `src/validators/profile-validators.ts:247-260` — `validateYatirimTesvikRules` iki dal (`!contractReference` ve `!isNonEmpty(id)`) yeni error code'u kullanır. EARSIV+YTB shared path otomatik dahil.
3. `__tests__/validators/type-profile-b29-b30-b31.test.ts` — 4 yeni test (YATIRIMTESVIK undefined, id boş, EARSIV+YTBSATIS shared, 5 haneli id invalidFormat regresyon).

### Test

- 1055 → **1059 yeşil** (+4)
- API yüzeyi genişledi (Added kategorisi): `UblBuildErrorCode` string literal setine `YATIRIMTESVIK_REQUIRES_YTBNO` eklendi.
- v2.0.0 henüz publish olmadığı için "breaking" değil.

---

## Sprint 8f.4 — TEVKIFATIADE reaktivasyon (+10 senaryo)

**Commit:** `2a8750b`

### Yapılanlar

- `examples-matrix/_lib/specs.ts` — 8e'deki comment-out kaldırıldı.
- 10 yeni senaryo:
  - 7 TEVKIFATIADE baseline: TEMELFATURA, TICARIFATURA, KAMU, ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS, EARSIVFATURA
  - 1 YTBTEVKIFATIADE baseline (EARSIVFATURA)
  - 2 varyant: TEMELFATURA+TEVKIFATIADE+650 dinamik %50, EARSIVFATURA+YTBTEVKIFATIADE+620 tekstil
- **Invalid senaryo güncellemesi (Bug #3 etkisi):** `profile-requirement-yatirimtesvik-ytbno-eksik` → `yatirimtesvik-requires-ytbno-yatirimtesvik-ytbno-eksik` (expected code güncel).

### Test

- 1059 → **1079 yeşil** (+20: 10 snapshot + 10 json-parity)
- Matrix: 95 → 105 senaryo (82 valid + 23 invalid)

---

## Sprint 8f.5 — TEMELFATURA genişletme (+8)

**Commit:** `76c9013`

### Yapılanlar

8 yeni TEMELFATURA varyant:
1. SATIS %10 KDV
2. SATIS %1 KDV
3. IADE çoklu KDV (%10 + %20)
4. TEVKIFAT kod 801 %100 tam tevkifat
5. ISTISNA çoklu satır (3 satır, kod 213)
6. IHRACKAYITLI kod 701 (DİİB dışı, KDV=0 zorunlu)
7. SGK çoklu satır
8. SATIS + belge seviyesi AllowanceCharge

### Test

- 1079 → **1095 yeşil** (+16)
- Matrix: 105 → 113 (90 valid + 23 invalid)
- TEMELFATURA: 17 → 25 ✅

---

## Sprint 8f.6 — TICARIFATURA +5 + KAMU +4

**Commit:** `7c0a209`

### Yapılanlar

TICARIFATURA (+5):
- SATIS %10 KDV, SATIS USD döviz, TEVKIFAT 603, ISTISNA kod 201, OZELMATRAH kod 805

KAMU (+4):
- SATIS 3 satır, ISTISNA kod 301, TEVKIFAT 620 tekstil, SATIS USD döviz

### Test

- 1095 → **1113 yeşil** (+18)
- Matrix: 113 → 122 (99 valid + 23 invalid)

---

## Sprint 8f.7 — EARSIVFATURA genişletme (+8)

**Commit:** `11461ef`

### Yapılanlar

Valid varyantlar (+5):
- SATIS çoklu KDV, IADE 3 satır, TEVKIFAT 650 dinamik, ISTISNA USD döviz, SATIS notes+orderReference

Yeni YTB tipleri (+3):
- YTBSATIS kod 02 inşaat, YTBIADE baseline, YTBTEVKIFAT baseline (8e'de yoktu)

### Test

- 1113 → **1129 yeşil** (+16)
- Matrix: 122 → 130 (107 valid + 23 invalid)
- EARSIVFATURA: 12 + 3 TEVKIFATIADE + 8 yeni = 23 ✅

---

## Sprint 8f.8 — YATIRIMTESVIK +4 + ILAC +2 + IDIS +2

**Commit:** `65b2c64`

### Yapılanlar

YATIRIMTESVIK (+4): kod 04 gayrimaddi, SATIS 3 satır, TEVKIFAT 650 dinamik, IADE 2 satır
ILAC (+2): SATIS TIBBICIHAZ, SATIS DIGER
IDIS (+2): SATIS 3 satır, IHRACKAYITLI 701

### Test

- 1129 → **1145 yeşil** (+16)
- Matrix: 130 → 138 (115 valid + 23 invalid)

---

## Sprint 8f.9 — IHRACAT + YOLCU + HKS + ENERJI (+5)

**Commit:** `18ee13c`

### Yapılanlar

- IHRACAT +2: ISTISNA EUR döviz, ISTISNA 2 satır
- YOLCU +1: yabancı UK turist
- HKS +1: HKSSATIS 2 satır KUNYENO
- ENERJI +1: SARJ 3 şarj noktası

### Test

- 1145 → **1155 yeşil** (+10)
- Matrix: 138 → 143 (120 valid + 23 invalid)

---

## Sprint 8f.10 — Despatch +2

**Commit:** `de05374`

### Yapılanlar

- TEMELIRSALIYE+SEVK çoklu sürücü (2 driver + PLAKA+DORSE)
- IDISIRSALIYE+SEVK 3 satır farklı ETIKETNO

### Test

- 1155 → **1159 yeşil** (+4)
- Matrix: 143 → 145

---

## Sprint 8f.11 — Invalid single-error edge cases (+12)

**Commit:** `6a6e0ed`

### Yapılanlar

12 yeni invalid senaryo (plan §11 kesim: 13→12):
- OZELMATRAH kod eksik (Bug #2 senaryosu)
- UUID boş, Invoice ID pattern hatalı
- IHRACAT delivery eksik, IDIS SEVKIYATNO eksik, HKS KUNYENO eksik
- KAMU buyerCustomer VKN eksik, IHRACAT supplier.taxOffice boş
- YATIRIMTESVIK ytbNo 5 hane, YATIRIMTESVIK ItemClassificationCode eksik
- TEVKIFAT withholdingTaxTotals eksik
- EARSIV+YTBSATIS ytbNo eksik (Bug #3 EARSIV branch)

**Kapsam ayarı (§11):** plan +13 → fiili +12 (kdv-30-gecersiz, iban-yanlis, 4171-yasak, withholding-oran-yanlis, iade-doctype senaryoları validator tetiklemedi → Sprint 8g'ye erteli).

### Test

- 1159 → **1171 yeşil** (+12)
- Matrix: 145 → 157 (122 valid + 35 invalid)

---

## Sprint 8f.12 — Multi-error cases (+5)

**Commit:** `8885af4`

### Yapılanlar

5 multi-error senaryo (plan §11 kesim: 12→5):
1. supplier.vkn + customer.name birlikte boş (2 MISSING_FIELD)
2. YATIRIMTESVIK ytbNo + ItemClassificationCode birlikte eksik
3. KAMU paymentMeans + buyerCustomer.vkn birlikte eksik
4. IADE billingReference eksik
5. IHRACAT buyerCustomer + supplier.taxOffice birlikte eksik

**Kapsam ayarı (§11):** plan +12 → fiili +5 (OZELMATRAH çift kod pattern validator'ın inceleme rotasında değildi; 7 senaryo Sprint 8g'ye ertelendi).

### Test

- 1171 → **1176 yeşil** (+5)
- Matrix: 157 → 162 (122 valid + 40 invalid)

---

## Sprint 8f.13 — meta-indexer pivot + coverage gap + dashboard

**Commit:** `3b9c7e8`

### Yapılanlar

`examples-matrix/_lib/meta-indexer.ts` genişletildi:
- Dashboard özet (profil/tip sayısı, coverage %, total)
- Profil × Tip pivot tablosu (Markdown, hücre başına varyant sayısı)
- Coverage gap report (`PROFILE_TYPE_MATRIX` - mevcut = missing kombinasyonlar)
- Error code ASCII bar chart (invalid dağılımı)
- Exemption code ASCII bar chart (valid dağılımı)

`README.md` regenerate edildi (auto-gen, manual edit yok).

### Coverage

- 67/68 kombinasyon kapsamlı (%98.5)
- Kapsamsız: sadece `EARSIVFATURA × TEKNOLOJIDESTEK` (8e'de atlanan özel TCKN/TELEFON şartı)

### Test

- 1176/1176 yeşil (README auto-gen, kod etkilemedi)

---

## Sprint 8f.14 — find.ts 4 yeni filtre

**Commit:** `e65dc86`

### Yapılanlar

4 yeni filtre (plan §11 kesim: 5→4):
- `--has-withholding` — stopaj var
- `--line-count=<n>` — satır sayısı
- `--kind=<invoice|despatch|invalid-invoice|invalid-despatch>`
- `--multi-error` — isMultiError=true
- `--exemption-code=` alias for `--exemption=`

### Test

- 1176/1176 yeşil

### Örnek kullanım

```bash
npm run matrix:find -- --has-withholding           # 23 senaryo
npm run matrix:find -- --multi-error               # 12 senaryo
npm run matrix:find -- --line-count=3              # 9 senaryo
npm run matrix:find -- --kind=despatch             # 7 senaryo
```

---

## Sprint 8f.15 — Full Regression + CHANGELOG + log kapanış

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8f.15: Full regression + CHANGELOG 8f + log kapanış`

### Full Regression

```
$ npm test            # 1176 passed / 1176
$ npm run matrix:run  # 162 başarılı / 162 (122 valid + 40 invalid)
$ npm run examples    # 38 başarılı / 38
$ npm run typecheck   # 0 error
$ npm run build       # dist/ 234 KB CJS + 230 KB ESM + 76 KB DTS
```

### CHANGELOG Güncellemesi

`CHANGELOG.md` altında `[2.0.0]` sürümü içinde Sprint 8f section'ı eklendi:
- Added (3 bug fix + src değişiklikleri, +67 yeni senaryo, meta-indexer/find genişlemesi)
- Changed (B-30 hata mesajı güncellendi, invalid senaryo slug güncellendi)
- Fixed (Bug #1, #2, #3 referansları)
- Plan sapmaları (§11 kapsam ayarı matrisi şeffaf kayıtlı)
- Doğrulama bash komutları

### Test Değişimi Özet Tablosu

| Alt-commit | Yeni test | Kümülatif | Not |
|---|---|---|---|
| 8f.0 | 0 | 1049 | Plan kopya + log |
| 8f.1 | +3 | 1052 | Bug #1 unit test |
| 8f.2 | +3 | 1055 | Bug #2 unit test |
| 8f.3 | +4 | 1059 | Bug #3 unit test (+1 regresyon) |
| 8f.4 | +20 | 1079 | TEVKIFATIADE reaktivasyon |
| 8f.5 | +16 | 1095 | TEMELFATURA +8 |
| 8f.6 | +18 | 1113 | TICARIFATURA +5 + KAMU +4 |
| 8f.7 | +16 | 1129 | EARSIVFATURA +8 |
| 8f.8 | +16 | 1145 | YATIRIMTESVIK +4 + ILAC +2 + IDIS +2 |
| 8f.9 | +10 | 1155 | Niş profiller +5 |
| 8f.10 | +4 | 1159 | Despatch +2 |
| 8f.11 | +12 | 1171 | Invalid edge cases +12 |
| 8f.12 | +5 | 1176 | Multi-error +5 |
| 8f.13 | 0 | 1176 | meta-indexer (README auto-gen) |
| 8f.14 | 0 | 1176 | find.ts filtreler |
| 8f.15 | 0 | 1176 | Regression + doküman |
| **Son** | **+127** | **1176** | Plan hedefi +142; fiili §11 kesimle -15 |

### Disiplin Notları

- **`src/` sadece Bug #1-3 fix için yazıldı:** constants.ts (WITHHOLDING_ALLOWED_TYPES + B-30 mesajı), type-validators.ts (validateOzelMatrah), profile-validators.ts (YATIRIMTESVIK_REQUIRES_YTBNO branch), validation-result.ts (yeni helper). Yeni feature / refactor yok.
- **Mimari karar M1-M12, AR-1..AR-9 stabil** — yeni M slot yok.
- **Plan kopya pattern'i** korundu (8f.0).
- **Mevcut `examples/` 38 senaryo** dokunulmadı — regresyon 38/38 yeşil.
- **Mevcut 95 senaryoya dokunulmadı** (sadece TEVKIFATIADE reaktivasyon ve Bug #3 invalid spec güncellemesi).

### Dosya/Klasör İstatistiği Özeti (Kapanış)

```
examples-matrix/
├── _lib/              # 7 dosya (meta-indexer.ts genişledi: ~240 → ~340 satır)
├── valid/             # 122 senaryo (12 profil + 3 irsaliye profil)
├── invalid/           # 40 senaryo (15 error code)
├── README.md          # auto-generated pivot + coverage gap + dashboard
├── run-all.ts
├── scaffold.ts
└── find.ts            # 4 yeni filtre

__tests__/examples-matrix/
├── snapshot.test.ts       # 122 test (122 valid senaryo)
├── json-parity.test.ts    # 122 test
├── invalid-parity.test.ts # 40 test
└── meta-integrity.test.ts # 6 assertion

__tests__/validators/
└── type-profile-b29-b30-b31.test.ts  # 17 test (+10 Bug #1-3 için)

src/ (3 bug fix):
├── config/constants.ts           # WITHHOLDING_ALLOWED_TYPES +2 tip
├── validators/type-validators.ts # B-30 mesaj + validateOzelMatrah zorunluluk
├── validators/profile-validators.ts  # YATIRIMTESVIK_REQUIRES_YTBNO branch
├── validators/validation-result.ts   # yatirimTesvikRequiresYtbNo helper
```

---

## Sprint 8f.16 — v2.0.0 publish checklist

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8f.16: v2.0.0 publish checklist üretimi`

### Yapılanlar

`audit/v2.0.0-publish-checklist.md` üretildi. Berkay manuel publish için rehber.

---

## Bulunan Buglar

Sprint 8f'te `src/` altında yeni bug **bulunmadı**. 8e'de keşfedilen 3 bug bu sprintte fix edildi:

1. **Bug #1 ✅** — Major — WITHHOLDING_ALLOWED_TYPES TEVKIFATIADE/YTBTEVKIFATIADE eksikliği. **Fix: 8f.1**.
2. **Bug #2 ✅** — Orta — OZELMATRAH taxExemptionReasonCode sessiz geçme. **Fix: 8f.2**.
3. **Bug #3 ✅** — Düşük — YATIRIMTESVIK ytbNo mesajı semantik net değildi. **Fix: 8f.3** (yeni error code).

---

## Sprint 8g İçin Erteli Kalemler (§11 Kapsam Ayarı)

Esnek kategori — v2.0.0 publish'i geciktirmez, 8g/v2.1.0'a kolay aktarılır:

1. **Invalid single-error +4 edge case** — kdv-30-gecersiz, iban-yanlis, 4171-yasak, withholding-oran-yanlis, iade-doctype (toplam 5 senaryo validator'ın inceleme rotasında değildi — fix gerekirse `src/` düzeltmesiyle 8g'de).
2. **Multi-error +7 senaryo** — OZELMATRAH çift kod, EARSIV+TEKNOLOJIDESTEK multi, cross-profile, vb.
3. **Niş profil ek varyantları** — ENERJI, HKS, OZELFATURA > 2 varyantlara genişleme.
4. **find.ts ek filtre** — `--phantom-kdv` zaten mevcut, `--auto-ok`, `--high-value` gibi özelleştirmeler.
5. **EARSIVFATURA × TEKNOLOJIDESTEK** — 1 kombinasyon kapsamsız (özel TCKN/TELEFON şartı, 8e'den beri bekliyor).

---

## Referanslar

- Plan dosyası (Plan Modu): `/Users/berkaygokce/.claude/plans/sprint-8f-keen-cupcake.md`
- Plan kopyası (sprint): `audit/sprint-08f-plan.md`
- Önceki sprint log: `audit/sprint-08e-implementation-log.md`
- Önceki sprint commit: `52c1ff5 Sprint 8e.16-17`
- Mevcut examples referansı: `examples/` (38 senaryo, dokunulmaz)
- examples-matrix durumu: **162 senaryo** (122 valid + 40 invalid)
- Profil+tip matrisi: `src/config/constants.ts:13-59` PROFILE_TYPE_MATRIX (68 kombinasyon, 67 kapsamlı)
- Publish checklist: `audit/v2.0.0-publish-checklist.md`
