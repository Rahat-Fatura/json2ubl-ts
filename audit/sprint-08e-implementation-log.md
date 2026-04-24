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

_(placeholder — 8e.1 commit'inde doldurulacak)_

---

## Sprint 8e.2 — runScenario klon + ilk 10 TEMELFATURA valid

_(placeholder)_

---

## Sprint 8e.3 → 8e.9 — Valid Batch Üretimi

_(her alt-commit için ayrı bölüm; senaryo sayıları + test delta + keşif notları)_

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

_8e sırasında `src/**` altında keşfedilen bug'lar burada loglanır. Her bug için:_
- _Keşif sprint'i (8e.X)_
- _Etkilenen dosya + satır_
- _Beklenen davranış / gerçekleşen davranış_
- _Kritiklik (kritik / major / minör)_
- _Sprint 8f'de öncelik tahmini_

_Şu an: **boş (Sprint 8e henüz başladı).**_

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
