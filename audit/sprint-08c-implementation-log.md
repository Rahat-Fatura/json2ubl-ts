---
sprint: 8c
baslik: B-NEW-01..14 Hotfix Dalgası + v2.0.0 Stable Release
tarih_basi: 2026-04-24
tarih_sonu: 2026-04-XX
plan: audit/sprint-08c-plan.md
fix_plani: audit/FIX-PLANI-v3.md §319-388 (Sprint 8c bölümü + M11 + AR-9)
onceki_sprint: audit/sprint-08b-implementation-log.md (commit 076946e)
sonraki_sprint: v2.1.0 (AR-9 Reactive InvoiceSession implementation + skill repo manuel patch)
toplam_commit: 14 atomik alt-commit (8c.0 → 8c.13)
test_durumu_basi: 755 / 755 yeşil
test_durumu_sonu_hedef: ~884 / ~884 yeşil (+129 test)
---

## Kapsam (Sprint 8c Planından)

Sprint 8b tamamlandı (commit `076946e`): 38 senaryo + 114 test + README §8 Sorumluluk Matrisi + CHANGELOG v2.0.0 entry + skill doc patch referansı. 755/755 test yeşil. Kod dev-complete, ama **12 kalıntı bug (B-NEW-01..12)** keşfedildi ve `audit/b-new-audit.md`'ye tam dump edildi. 9 örnek senaryo (05, 07, 10, 16, 17, 20, 26, 31, 99) `validationLevel: 'basic'` workaround'unda.

**Sprint 8c birincil hedefi:** 14 bug (B-NEW-01..12 mevcut + B-NEW-13 YOLCU passport + B-NEW-14 IDIS ETIKETNO sprint 8c'de tanımlanır) hotfix dalgası; 9/9 workaround senaryo strict moda geçer; validator/calculator tam davranış.

**Sprint 8c ikincil hedefi:** M11 Self-exemption types mimari kararı + AR-9 Reactive InvoiceSession isim konulma (tasarım notu, kod yok) + CHANGELOG Sprint 8c alt-section + v2.0.0 release (package.json bump + git tag + npm publish + GitHub release notes).

**Sprint 8c kapsamı dışı:** Reactive InvoiceSession implementation (v2.1.0), UI feedback katmanı, skill repo commit otomasyonu (manuel uygulama).

**Berkay'ın 3 kritik direktifi (plan bel kemiği):**
1. **Manuel 351 politikası** — Calculator 351 otomatik atamaz; self-exemption olmayan tipte KDV=0 kalem için kullanıcıdan manuel zorunlu (validator enforce).
2. **Self-exemption tip listesi (M11)** — ISTISNA, IHRACKAYITLI, OZELMATRAH + IHRACAT, YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK profilleri.
3. **KDV=0 + tevkifat aynı kalemde → validation error.**

14 atomik alt-commit planlandı: 8c.0 → 8c.13.

---

## Sprint 8c.0 — Plan kopyası + log iskelet + FIX-PLANI işaretleme

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8c.0: Plan kopyası + implementation log iskelet + FIX-PLANI M11/AR-9 işaretleme`

### Yapılanlar

1. **`audit/sprint-08c-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/sprint-8c-zazzy-kite.md` kopyalandı (feedback memory: plan kopya pattern'i).
2. **`audit/sprint-08c-implementation-log.md`** — bu dosya, iskelet + 8c.0 bölümü oluşturuldu.
3. **`audit/FIX-PLANI-v3.md` güncellemesi:**
   - **M11** başlığı eklendi (Mimari Kararlar §107-113 sonrası): Self-exemption tipleri config + validator gate.
   - **AR-9** başlığı eklendi (AR-1..AR-8 §49-81 sonrası): Reactive InvoiceSession tasarım notu (v2.1.0'a erteli).
   - **Sprint 8c bölümü** Sprint 8 notu altına eklendi (§319-324): 14 alt-commit + kapsanan bulgular + plan/log referansları.

### Değişiklik İstatistikleri

- `audit/sprint-08c-plan.md` — yeni dosya (plan kopyası, ~440 satır)
- `audit/sprint-08c-implementation-log.md` — yeni dosya (iskelet + 8c.0 bölümü)
- `audit/FIX-PLANI-v3.md` — M11 + AR-9 + Sprint 8c notu eklemesi

### Test Durumu

- Başlangıç: 755/755 yeşil
- Son: 755/755 yeşil (kod değişikliği yok, sadece audit/ dokümanları)

### Disiplin Notları

- **Plan kopya pattern'i** (memory `feedback_sprint_plan_pattern.md`): İlk alt-commit'te plan modu dosyası `audit/sprint-08c-plan.md`'ye kopyalandı.
- **`src/` read-only:** Bu commit'te kod dosyasına dokunulmadı.
- **Mimari karar yeni slot:** M11 ve AR-9 FIX-PLANI-v3.md'de Sprint 8c kapsamında açıldı; AR-9 yalnızca isim + tasarım notu (uygulama v2.1.0).

---
