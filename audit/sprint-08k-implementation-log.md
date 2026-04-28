---
sprint: 8k
baslik: v2.2.3 Library Suggestions Patch — SimpleSgkType export + identifications path narrow type + UnsetScope array composite + removeIdentification/setIdentifications API
tarih_basi: 2026-04-28
plan: audit/sprint-08k-plan.md
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08j-implementation-log.md (v2.2.1) + v2.2.2 deepEqual browser fix
sonraki_sprint: TBD (Mimsoft greenfield refactor F0+)
toplam_commit: 8 atomik alt-commit (8k.0 → 8k.7) + 1 cross-repo audit (8k.8)
test_durumu_basi: 1724 / 1724 yeşil
test_durumu_sonu_hedef: ~1746 yeşil (+22 yeni test)
versiyon: v2.2.2 → v2.2.3 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok (mevcut M1-M12, AR-1..AR-10 stabil)
---

## Kapsam

`audit/sprint-08k-plan.md` Berkay onayı ile finalize edildi. Mimsoft monorepo greenfield refactor (`audit/greenfield/99-library-suggestions.md`) için 4 öneri:

1. **Öneri #1** — `SimpleSgkType` export edilmeli (re-export listesinde yok)
2. **Öneri #2** — Identifications path-fonksiyonları narrow literal tipi döndürmeli (cast'siz `update()` generic uyumu)
3. **Öneri #3** — `UnsetScope`'a `despatchReferences` + `additionalDocuments` eklenmeli
4. **Öneri #4** — `removeIdentification(party, index)` + `setIdentifications(party, ids)` API (splice + replace)

**8 atomik commit + 1 cross-repo (8k.0 → 8k.8):**

1. **8k.0** — Plan kopya + log iskelet
2. **8k.1** — Öneri #1: `SimpleSgkType` re-export
3. **8k.2** — Öneri #2: Generator `renderEntry` narrow cast + regenerate
4. **8k.3** — Öneri #3: `UnsetScope` genişletme
5. **8k.4** — Öneri #4: `removeIdentification` + `setIdentifications` API
6. **8k.5** — README güncellemesi
7. **8k.6** — CHANGELOG v2.2.3
8. **8k.7** — `package.json` bump + log finalize
9. **8k.8** — Mimsoft repo'da `99-library-suggestions.md` Status'leri güncelle

## İlerleme

### 8k.0 — Plan kopya + log iskelet (devam ediyor)

`audit/sprint-08k-plan.md` yazıldı (plan kopyası).
`audit/sprint-08k-implementation-log.md` iskelet açıldı.

Mevcut durum: 1724 / 1724 yeşil. v2.2.2 publish edilmiş (deepEqual browser fix). v2.2.3 patch hazırlığı.
