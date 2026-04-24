---
sprint: 8f
baslik: Bug Hotfix'leri (Bug #1-3) + examples-matrix %35 → %66 kapsam + README/meta-indexer geliştirmeleri
tarih_basi: 2026-04-24
plan: audit/sprint-08f-plan.md
plan_mode_dosyasi: /Users/berkaygokce/.claude/plans/sprint-8f-keen-cupcake.md
onceki_sprint: audit/sprint-08e-implementation-log.md (commit 52c1ff5, 1049/1049 yeşil, 95 senaryo)
sonraki_sprint: Sprint 8g (v2.0.0 publish sonrası esnek kalemler)
toplam_commit: 17 atomik alt-commit (8f.0 → 8f.16)
test_durumu_basi: 1049 / 1049 yeşil
test_durumu_sonu_hedef: ~1191 yeşil (+142)
---

## Kapsam (Sprint 8f Planından)

Sprint 8e (commit `52c1ff5`) `examples-matrix/` altyapısını tamamladı ve 95 senaryo üretti. 1049/1049 test yeşil, `src/` tüm 8e boyunca dokunulmadı. 8e'de 3 bug keşfedildi, `src/` read-only disiplini gereği 8f'e ertelendi.

**Sprint 8f birincil hedefi:** 3 bug fix + test + TEVKIFATIADE reaktivasyon.
**İkincil hedef:** examples-matrix %35 → %66 (95 → ~180 senaryo).
**Üçüncül hedef:** README/meta-indexer pivot + coverage gap + filtre genişletme.

**Bug listesi (8e'den devralındı):**
1. **Bug #1 (Major):** `src/config/constants.ts:77` `WITHHOLDING_ALLOWED_TYPES` set'inde TEVKIFATIADE + YTBTEVKIFATIADE eksik.
2. **Bug #2 (Orta):** `src/validators/type-validators.ts:188-202` `validateOzelMatrah` `taxExemptionReasonCode` eksikliğini sessiz geçiyor.
3. **Bug #3 (Düşük):** `src/validators/profile-validators.ts:248-258` YATIRIMTESVIK ytbNo eksik mesajı teknik XML path'i veriyor — semantik ayrı error code gerekli.

**Sprint 8f kapsamı dışı:**
- Yeni feature / refactor (`src/` sadece bug fix için yazılır).
- v2.0.0 publish (8f.16'da yalnızca checklist üretilir; Berkay manuel publish).
- Mevcut `examples/` 38 senaryoya dokunulmaz.
- Mimari karar M1-M12, AR-1..AR-9 stabil — yeni slot yok.

17 atomik alt-commit planlandı: 8f.0 → 8f.16.

---

## Sprint 8f.0 — Plan kopyası + implementation log iskeleti

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8f.0: Plan kopyası + implementation log iskeleti`

### Yapılanlar

1. **`audit/sprint-08f-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/sprint-8f-keen-cupcake.md` kopyalandı (plan kopya pattern'i, feedback memory).
2. **`audit/sprint-08f-implementation-log.md`** — bu dosya, iskelet + 8f.0 bölümü oluşturuldu.

### Değişiklik İstatistikleri

- `audit/sprint-08f-plan.md` — yeni dosya (plan kopyası, 620 satır)
- `audit/sprint-08f-implementation-log.md` — yeni dosya (iskelet + 8f.0 bölümü)

### Test Durumu

- Başlangıç: 1049/1049 yeşil
- Son: 1049/1049 yeşil (kod değişikliği yok, sadece audit/)

### Disiplin Notları

- **Plan kopya pattern'i** (memory `feedback_sprint_plan_pattern.md`): İlk alt-commit'te plan modu dosyası `audit/sprint-08f-plan.md`'ye kopyalandı.
- **`src/` read-only:** Bu commit'te kod dosyasına dokunulmadı.
- **Mimari karar:** Yeni M slot açılmadı — Sprint 8f bug hotfix + kapsam genişletme.
- **CHANGELOG:** 8f.0'da dokunulmadı. 8f.15'te final entry eklenecek.

---

## Sprint 8f.1 → 8f.16

_(Her alt-commit kendi bölümü — ilerleyişle doldurulacak)_

---

## Bulunan Buglar

_8f sırasında `src/**` altında keşfedilen yeni bug'lar burada konsolide edilir. Şu an beklenen bug yok — 8e'deki 3 bug 8f'te fix ediliyor._

---

## Test Delta Özeti

| Alt-commit | Yeni test | Kümülatif | Not |
|---|---|---|---|
| 8f.0 | 0 | 1049 | Plan kopya + log iskeleti |

_(diğer satırlar commit'lerde eklenecek)_

---

## Dosya/Klasör İstatistiği Özeti

_(8f.15'te kapanışta doldurulacak)_

---

## Referanslar

- Plan dosyası (Plan Modu): `/Users/berkaygokce/.claude/plans/sprint-8f-keen-cupcake.md`
- Plan kopyası (sprint): `audit/sprint-08f-plan.md`
- Önceki sprint log: `audit/sprint-08e-implementation-log.md`
- Önceki sprint commit: `52c1ff5 Sprint 8e.16-17: Full regression + CHANGELOG 8e + log kapanış + Sprint 8f taslağı`
- Mevcut examples referansı: `examples/` (38 senaryo, dokunulmaz)
- examples-matrix durumu: 95 senaryo (72 valid + 23 invalid)
- Profil+tip matrisi: `src/config/constants.ts:13-59` PROFILE_TYPE_MATRIX
