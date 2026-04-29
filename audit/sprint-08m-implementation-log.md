---
sprint: 8m
baslik: v2.2.5 Library Suggestions Patch — `PartyIdentificationSchemeId` literal union public export (Öneri #7)
tarih_basi: 2026-04-29
tarih_sonu: 2026-04-29
plan: yok (öneri Mimsoft `audit/greenfield/99-library-suggestions.md` Öneri #7'de dökümante edilmiş, basit/küçük scope — direkt uygulama)
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08l-implementation-log.md (v2.2.4 ready)
sonraki_sprint: TBD
toplam_commit: 5 atomik alt-commit (8m.0 → 8m.4)
test_durumu_basi: 1763 / 1763 yeşil
test_durumu_sonu: 1766 / 1766 yeşil (+3 yeni test)
versiyon: v2.2.4 → v2.2.5 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok
durum: KAPATILDI — v2.2.5 publish hazır
---

## Kapsam

Mimsoft greenfield F2.C2.6 + C2.9 sırasında tespit edilen **Öneri #7** — `PartyIdentificationSchemeId` literal union public re-export. UI tarafında `Record<PartyIdentificationSchemeId, string>` narrow map (party identification labels/options) için gerekliydi.

**Karar:** 27 entry literal union (VKN/TCKN hariç — `party.taxNumber` alanında ayrı yönetilir). Set'in runtime davranışı değiştirilmedi (mevcut 29 entry — TCKN, VKN, 27 UBL scheme code; despatch validator'ları kullanıyor).

## Atomik Commit Özeti

### 8m.0 — Log iskelet
**Commit:** `2f57ce6`
**Kapsam:** Bu log iskelet açıldı.
**Test:** 1763 → 1763.

### 8m.1 — `PartyIdentificationSchemeId` literal union
**Commit:** `56d1939`
**Kapsam:**
- `src/config/constants.ts`:
  - `PartyIdentificationSchemeId` literal union 27 entry tanımlandı (JSDoc ile VKN/TCKN hariç tutulma sebebi açıklandı)
  - `PARTY_IDENTIFICATION_SCHEME_IDS` set tipi explicit `new Set<string>([...])` (runtime davranış değişmedi)
- `src/index.ts`: `PartyIdentificationSchemeId` type re-export

**Doğrulama:**
- `bun run typecheck` (TS 5.3.3) ✅
- `npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) ✅

**Test:** `__tests__/integration/exports.test.ts` (+3) — 27 literal union entry sayım + runtime set membership; `Record<PartyIdentificationSchemeId, string>` narrow map kullanım örneği (Mimsoft pattern, 27 label entry); runtime set VKN/TCKN dahil 29 entry doğrulaması.

**Test:** 1763 → 1766.

### 8m.2 — README + CHANGELOG v2.2.5
**Commit:** `e184ac2`
**Kapsam:**
- README §2 InvoiceSession import örneğine v2.2.5+ `PartyIdentificationSchemeId` + `PARTY_IDENTIFICATION_SCHEME_IDS` eklendi.
- CHANGELOG.md v2.2.5 entry (Added + Test + Migration örneği).

**Test:** 1766 → 1766.

### 8m.3 — Version Bump + Log Finalize
**Commit:** (bu commit)
**Kapsam:**
- `package.json`: `2.2.4` → `2.2.5`
- Bu log finalize edildi (durum: KAPATILDI).

**Test:** 1766 → 1766.

## Final Test Durumu

| Önceki | 8m.0 | 8m.1 | 8m.2 | 8m.3 (final) |
|---|---|---|---|---|
| 1763 | 1763 | 1766 | 1766 | **1766** |

**Test delta:** +3 (Öneri #7 için 3 yeni test).

## Mimsoft Greenfield İçin Sinyal

**Öneri #7 çözüldü:** Mimsoft `definitions/labels.ts`'te lokal türetim yerine `import type { PartyIdentificationSchemeId } from '@rahat-fatura/json2ubl-ts'` kullanılır:

```typescript
// definitions/labels.ts
import type { PartyIdentificationSchemeId } from '@rahat-fatura/json2ubl-ts';

export const PARTY_IDENTIFICATION_SCHEME_LABELS: Record<PartyIdentificationSchemeId, string> = {
  MERSISNO: 'MERSİS No',
  // ... 27 entry
};
```

Library yeni scheme eklerse Mimsoft TS hatası alır (drift mitigation).

## Disiplin Doğrulamaları

- ✅ **1763 mevcut test bozulmadı** — additive.
- ✅ **Mimari kararlar M1-M12, AR-1..AR-10 stabil.**
- ✅ **`bun run typecheck` (TS 5.3.3) temiz.**
- ✅ **`npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) temiz.**
- ✅ **162 examples-matrix regression yeşil.**

## Cross-repo Audit Güncellemesi (8m.4)

`/Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/audit/greenfield/99-library-suggestions.md`'da:
- Öneri #7 `Status: pending → applied`
- Sprint 8m commit hash referansı + uygulama detayları
- Özet tablo güncellenir.

**Mimsoft repo'da git commit Berkay'ın yetkisinde** — sadece dosya güncellemesi yapılır.

## v2.2.5 Publish

Berkay manuel publish edecek:
```bash
git push origin main
git tag v2.2.5
git push origin v2.2.5
npm publish
```
