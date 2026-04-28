---
sprint: 8j
baslik: v2.2.1 Migration Hotfix — SessionPaths runtime export + party identifications path entries + unset(scope) API
tarih_basi: 2026-04-28
plan: audit/sprint-08j-plan.md
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08i-implementation-log.md (v2.2.0 ready)
sonraki_sprint: TBD (Mimsoft monorepo migration başlıyor)
toplam_commit: 7 atomik alt-commit (8j.0 → 8j.6)
test_durumu_basi: 1694 / 1694 yeşil
test_durumu_sonu_hedef: ~1734 yeşil (+40 yeni test)
versiyon: v2.2.0 → v2.2.1 (patch — additive)
mimari_karar: yeni karar yok (mevcut M1-M12, AR-1..AR-10 stabil)
---

## Kapsam

`audit/sprint-08j-plan.md` Berkay onayı ile finalize edildi. Mimsoft monorepo migration (v1.4.2 → v2.2.0) için 3 kritik blocker:

1. **Bulgu 1** — `SessionPaths` runtime export YOK (dist'te bulunmuyor, README ile çelişiyor)
2. **Bulgu 2** — Party `identifications` path entry'leri SessionPathMap'te yok (sender/customer/buyerCustomer/taxRepresentativeParty)
3. **Bulgu 3** — Composite "undefined ile clear" semantiği yok → yeni `unset(scope)` API

**7 atomik commit (8j.0 → 8j.6):**

1. **8j.0** — Plan kopya + log iskelet
2. **8j.1** — `SessionPaths` runtime re-export (Bulgu 1)
3. **8j.2** — Generator party identifications path entries (Bulgu 2)
4. **8j.3** — `InvoiceSession.unset(scope)` API (Bulgu 3)
5. **8j.4** — README §SessionPaths runtime + §unset() bölümleri
6. **8j.5** — CHANGELOG v2.2.1 entry
7. **8j.6** — package.json 2.2.0 → 2.2.1 + log finalize

## İlerleme

### 8j.0 — Plan kopya + log iskelet (devam ediyor)

`audit/sprint-08j-plan.md` yazıldı (Berkay prompt'undan kopya).
`audit/sprint-08j-implementation-log.md` iskelet açıldı (bu dosya).

Mevcut durum: 1694 / 1694 yeşil. v2.2.0 publish ready.
