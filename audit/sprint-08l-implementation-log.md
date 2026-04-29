---
sprint: 8l
baslik: v2.2.4 Library Suggestions Patch — Suggestion/PathError/LineFieldVisibility public re-export + update() overload bloğu (TS 5.7+ inference fix)
tarih_basi: 2026-04-29
plan: audit/sprint-08l-plan.md (REVISED 2026-04-29 — Mimsoft yorumları + TS 5.7.3 reproduction sonucu)
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08k-implementation-log.md (v2.2.3 ready)
sonraki_sprint: TBD (Mimsoft greenfield F1 toplu commit — cleanup)
toplam_commit: 7 atomik alt-commit (8l.0 → 8l.6)
test_durumu_basi: 1750 / 1750 yeşil
test_durumu_sonu_hedef: ~1760 yeşil (+10 yeni test)
versiyon: v2.2.3 → v2.2.4 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok (mevcut M1-M12, AR-1..AR-10 stabil)
---

## Kapsam

`audit/sprint-08l-plan.md` Berkay onayı + Mimsoft tüketici ekibi yorumları + TS 5.7.3 reproduction sonucu ile finalize edildi. Mimsoft greenfield F1.C1.x sırasında tespit edilen 2 öneri:

1. **Öneri #5** — `Suggestion`, `SuggestionRule`, `SuggestionSeverity`, `PathErrorPayload`, `PathErrorCode`, `LineFieldVisibility` tipleri public re-export edilmeli
2. **Öneri #6** — TS 5.7+ ortamında fonksiyonel `SessionPaths.X(i)` path'leri `update<P extends keyof SessionPathMap>(...)` generic'iyle TS2345 hatası veriyor; çözüm: 13 spesifik template literal overload eklemek

**7 atomik commit (8l.0 → 8l.6):**

1. **8l.0** — Plan kopya doğrula + log iskelet
2. **8l.1** — Öneri #5: 6 tip public re-export
3. **8l.2** — Öneri #6: `update()` overload bloğu + action helper smoke test + `check:ts57` script
4. **8l.3** — README güncellemesi
5. **8l.4** — CHANGELOG v2.2.4
6. **8l.5** — `package.json` 2.2.3 → 2.2.4 + log finalize
7. **8l.6** — Mimsoft repo'da `99-library-suggestions.md` Status'leri güncelle (cross-repo)

## İlerleme

### 8l.0 — Plan + log iskelet (devam ediyor)

`audit/sprint-08l-plan.md` Berkay tarafından yazıldı, Mimsoft yorumlarıyla revize edildi (REVISED 2026-04-29). Bu log iskelet açıldı.

Mevcut durum: 1750 / 1750 yeşil. v2.2.3 commit'leri local'de bekliyor (henüz `npm publish` edilmedi). v2.2.4 patch hazırlığı.
