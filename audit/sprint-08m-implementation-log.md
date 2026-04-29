---
sprint: 8m
baslik: v2.2.5 Library Suggestions Patch — `PartyIdentificationSchemeId` literal union public export (Öneri #7)
tarih_basi: 2026-04-29
plan: yok (öneri Mimsoft `audit/greenfield/99-library-suggestions.md` Öneri #7'de dökümante edilmiş, basit/küçük scope — direkt uygulama)
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08l-implementation-log.md (v2.2.4 ready)
sonraki_sprint: TBD
toplam_commit: 5 atomik alt-commit (8m.0 → 8m.4)
test_durumu_basi: 1763 / 1763 yeşil
test_durumu_sonu_hedef: ~1764 yeşil (+1 yeni test)
versiyon: v2.2.4 → v2.2.5 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok
---

## Kapsam

Mimsoft greenfield F2.C2.6 + C2.9 sırasında tespit edilen **Öneri #7** — `PartyIdentificationSchemeId` literal union public re-export edilmeli. UI tarafında `Record<PartyIdentificationSchemeId, string>` narrow map (party identification labels/options) için gerekli; lokal türetim S-8 sınırında (library evrimleşirse drift riski).

**Karar:** Set'in runtime davranışı değiştirilmiyor (mevcut 29 entry — TCKN, VKN, 27 UBL scheme code; despatch validator'ları kullanıyor). Sadece **literal union 27 entry** (Mimsoft öneri: VKN/TCKN hariç, çünkü ayrı `party.taxNumber` alanında yönetilir) public re-export edilir. Set tipi `Set<string>` olarak kalır (runtime'la senkron).

**5 atomik commit:**

1. **8m.0** — Log iskelet
2. **8m.1** — `PartyIdentificationSchemeId` literal union + re-export + test
3. **8m.2** — README + CHANGELOG v2.2.5
4. **8m.3** — `package.json` 2.2.4 → 2.2.5 + log finalize
5. **8m.4** — Mimsoft repo cross-repo audit güncellemesi

## İlerleme

### 8m.0 — Log iskelet (devam ediyor)

`audit/sprint-08m-implementation-log.md` iskelet açıldı. Mevcut durum: 1763/1763 yeşil.
