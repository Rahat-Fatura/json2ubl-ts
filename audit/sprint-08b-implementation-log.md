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

<!-- 8b.1 → 8b.14 alt-commit bölümleri commit sırasında eklenecek -->
