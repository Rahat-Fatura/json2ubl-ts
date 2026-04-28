---
sprint: 8k
baslik: v2.2.3 Library Suggestions Patch — SimpleSgkType export + identifications path narrow type + UnsetScope array composite + removeIdentification/setIdentifications API
tarih_basi: 2026-04-28
tarih_sonu: 2026-04-28
plan: audit/sprint-08k-plan.md
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08j-implementation-log.md (v2.2.1) + v2.2.2 deepEqual browser fix
sonraki_sprint: TBD (Mimsoft greenfield refactor F0+)
toplam_commit: 8 atomik alt-commit (8k.0 → 8k.7) + 1 cross-repo audit (8k.8)
test_durumu_basi: 1724 / 1724 yeşil
test_durumu_sonu: 1750 / 1750 yeşil (+26 yeni test)
versiyon: v2.2.2 → v2.2.3 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok (mevcut M1-M12, AR-1..AR-10 stabil)
durum: KAPATILDI — v2.2.3 publish hazır
---

## Kapsam

`audit/sprint-08k-plan.md` Berkay onayı ile finalize edildi. Mimsoft monorepo greenfield refactor (`audit/greenfield/99-library-suggestions.md`) için 4 öneri uygulandı:

1. **Öneri #1** — `SimpleSgkType` literal union public re-export
2. **Öneri #2** — Identifications path-fonksiyonları narrow literal tipi (cast'siz `update()` generic uyumu)
3. **Öneri #3** — `UnsetScope`'a `despatchReferences` + `additionalDocuments` array composite scope'ları
4. **Öneri #4** — `removeIdentification(party, index)` + `setIdentifications(party, ids)` API (splice + replace)

**8 atomik commit + 1 cross-repo (8k.0 → 8k.8):**

1. **8k.0** — Plan kopya + log iskelet
2. **8k.1** — Öneri #1: `SimpleSgkType` re-export
3. **8k.2** — Öneri #2: Generator `renderEntry` narrow cast + regenerate
4. **8k.3** — Öneri #3: `UnsetScope` genişletme
5. **8k.4** — Öneri #4: `removeIdentification` + `setIdentifications` API
6. **8k.5** — README güncellemesi
7. **8k.6** — CHANGELOG v2.2.3
8. **8k.7** — `package.json` 2.2.2 → 2.2.3 + log finalize
9. **8k.8** — Mimsoft repo'da `99-library-suggestions.md` Status'leri güncelle (cross-repo)

## Atomik Commit Özeti

### 8k.0 — Plan kopya + log iskelet
**Commit:** `a521d71`
**Kapsam:** `audit/sprint-08k-plan.md` (plan kopyası) + bu log iskelet açıldı.
**Test:** 1724 → 1724 (no-op).

### 8k.1 — Öneri #1: `SimpleSgkType` Public Re-export
**Commit:** `b682104`
**Kapsam:** `src/calculator/index.ts` re-export listesine `SimpleSgkType` eklendi (SimpleSgkInput'tan hemen sonra).

Build doğrulandı:
- `dist/index.d.ts` line 970: `type SimpleSgkType = 'SAGLIK_ECZ' | ...`
- Named export listesi: `type SimpleSgkType` görünüyor

**Yeni test:** `__tests__/integration/exports.test.ts` (+4) — public import smoke test, 7 union üyesi, structural compat with `SimpleSgkInput.type`, backwards-compat smoke for `SimplePartyIdentification`.

**Test:** 1724 → 1728.

### 8k.2 — Öneri #2: Path Narrow Literal Type
**Commit:** `8c2e914`
**Kapsam:** `scripts/generate-session-paths.ts` `renderEntry()` — fonksiyon path return değerine SessionPathMap key'iyle aynı template literal form'unda `as` cast eklendi.

```typescript
// Önceki:
senderIdentificationSchemeId: (i: number) => `sender.identifications[${i}].schemeId`,
// Sonra:
senderIdentificationSchemeId: (i: number) =>
  `sender.identifications[${i}].schemeId` as `sender.identifications[${number}].schemeId`,
```

Tüm fonksiyon path'leri için defensive uygulandı. Generator regenerate edildi (998 → 1002 line). Mevcut generator regression testleri (prefix match'li regex) etkilenmedi.

**Yeni test:** `__tests__/calculator/session-paths-narrow-type.test.ts` (+4) — `keyof SessionPathMap` assignability (compile-time + runtime) + cast'siz `update()` integration.

**Test:** 1728 → 1732.

### 8k.3 — Öneri #3: `UnsetScope` Array Composite
**Commit:** `005b836`
**Kapsam:** `src/calculator/invoice-session.ts` UnsetScope union'a `'despatchReferences' | 'additionalDocuments'` eklendi.

**Implementation değişikliği YOK** — Sprint 8j.3'teki generic `delete (next as Record<string, unknown>)[scope]` pattern'i bu scope'lara doğal şekilde uygulandı.

**Yeni test:** `__tests__/calculator/invoice-session-unset.test.ts`'a 6 yeni test eklendi (her array composite için: set/unset clear + idempotent + remount via `update[0]`).

**Test:** 1732 → 1738.

### 8k.4 — Öneri #4: Identifications Splice/Replace API
**Commit:** `50a4fb4`
**Kapsam:** Yeni public API (`src/calculator/invoice-session.ts`):

```typescript
export type IdentificationParty = 'sender' | 'customer' | 'buyerCustomer';

class InvoiceSession {
  removeIdentification(party: IdentificationParty, index: number): void;
  setIdentifications(party: IdentificationParty,
                     identifications: SimplePartyIdentification[] | undefined): void;
}
```

**Davranış:**
- `removeIdentification`: party objesi yok / out-of-bounds → no-op; tek elemanlı + son eleman silinirse → undefined; aksi halde filtered array + `field-changed` event.
- `setIdentifications`: undefined / empty → undefined; aksi halde replace; deepEqual no-op (aynı içerik → emit yok); party mount edilmemişse no-op.
- Tip uyumsuzluğu (buyerCustomer inline literal): structural assignable üzerinden çözüldü; API parametresi `SimplePartyIdentification[]`.

**`IdentificationParty`** tip union public re-export (`src/calculator/index.ts`).

**Yeni test:** `__tests__/calculator/invoice-session-identifications.test.ts` (+12) — `removeIdentification` (middle splice + shift, last index, single→undefined, out-of-bounds, buyerCustomer inline literal compat, event payload) + `setIdentifications` (replace, empty→undefined, undefined→undefined, event, deepEqual no-op, no-mount).

**Test:** 1738 → 1750.

### 8k.5 — README Güncelleme
**Commit:** `864fbb9`
**Kapsam:**
- §2 InvoiceSession path-based update örneklerine identifications splice/replace API eklendi
- `unset()` örneklerine `despatchReferences` + `additionalDocuments` scope'ları
- API Referansı: `removeIdentification` + `setIdentifications` imzaları + `IdentificationParty` union + `UnsetScope` yeni iki entry
- Migration tablosu: v1.x setX → v2.2.3 unset/setIdentifications/removeIdentification eşlemeleri

**Test:** 1750 → 1750.

### 8k.6 — CHANGELOG v2.2.3
**Commit:** `2153223`
**Kapsam:** Keep a Changelog formatında v2.2.3 girdisi (Added/Changed/Test/Migration). 4 öneri detayları + +26 yeni test breakdown + cast'siz integration örneği.

**Test:** 1750 → 1750.

### 8k.7 — Version Bump + Log Finalize
**Commit:** (bu commit)
**Kapsam:**
- `package.json`: `2.2.2` → `2.2.3`
- Bu implementation log finalize edildi (durum: KAPATILDI).

**Test:** 1750 → 1750.

## Final Test Durumu

| Önceki | 8k.0 | 8k.1 | 8k.2 | 8k.3 | 8k.4 | 8k.5 | 8k.6 | 8k.7 (final) |
|---|---|---|---|---|---|---|---|---|
| 1724 | 1724 | 1728 | 1732 | 1738 | 1750 | 1750 | 1750 | **1750** |

**Test delta hedefi:** Plan ~+22, gerçekleşen +26 (Öneri #4 testleri 12 (plan) → 12 (gerçek), Öneri #1 testleri 1 (plan) → 4 (gerçek; smoke testleri eklendi)).

## Mimsoft Greenfield İçin Sinyal

**4 öneri çözüldü, F1 prerekuiziti tamamlandı:**

1. ✅ **Öneri #1 — `SimpleSgkType` public export.** F4.3 sgk-info-section'da cast'siz import:
   ```typescript
   import type { SimpleSgkType } from '@rahat-fatura/json2ubl-ts';
   ```

2. ✅ **Öneri #2 — Identifications path narrow type.** F1+ form akışlarında cast'siz:
   ```typescript
   session.update(SessionPaths.senderIdentificationSchemeId(0), 'MERSISNO');  // ✓ no `as any`
   ```

3. ✅ **Öneri #3 — UnsetScope array composite.** F5 despatch-reference / additional-documents section'larında:
   ```typescript
   session.unset('despatchReferences');
   session.unset('additionalDocuments');
   ```

4. ✅ **Öneri #4 — Identifications splice API.** F4 / F6 ekle-sil akışında:
   ```typescript
   session.removeIdentification('customer', 0);
   session.setIdentifications('sender', [{ schemeId: 'MERSISNO', value: '...' }]);
   ```

## Disiplin Doğrulamaları

- ✅ **1724 mevcut test bozulmadı** — tüm değişiklikler additive.
- ✅ **Mimari kararlar M1-M12, AR-1..AR-10 stabil** — yeni karar yok.
- ✅ **Generator regenerate diff temiz** — sadece narrow `as` cast eklenmesi (998 → 1002 line); KNOWN_PATH_TEMPLATES + SessionPathMap içerik değişmedi (sadece SessionPaths object literal'ı).
- ✅ **`bun run typecheck` temiz** — fonksiyon path narrow cast'leri compile geçer; identifications API tip uyumu çalışıyor.
- ✅ **162 examples-matrix regression yeşil** — 4 öneri additive, eski davranış değişmiyor.

## Cross-repo Audit Güncellemesi (8k.8)

`/Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/audit/greenfield/99-library-suggestions.md`'da:
- 4 öneri için `Status:` `pending` → `applied`
- `Güncel durum` checkbox'larından library güncellemesi işaretlendi
- Refactor'da uygulanma kısmı: 8k.X commit hash'leri eklendi
- Özet tablo Status sütunları güncellendi

**Mimsoft repo'da git commit Berkay'ın yetkisiyle bırakıldı** — sadece dosya güncellemesi yapıldı.

## v2.2.3 Publish

Berkay manuel publish edecek:
```bash
git push origin main
git tag v2.2.3
git push origin v2.2.3
npm publish
gh release create v2.2.3 --title "v2.2.3 — Library Suggestions Patch" --notes-file CHANGELOG.md
```

Sonra Mimsoft monorepo'da:
```bash
yarn upgrade @rahat-fatura/json2ubl-ts@2.2.3
# audit/greenfield/99-library-suggestions.md "Yeni sürüm yayınlandı" + "yarn upgrade yaptı" checkbox'ları işaretle
# audit/greenfield/99-implementation-log.md decision log: "v2.2.3 prerekuizit uygulandı"
```

Greenfield F0 başlatılabilir — kütüphane tarafı blocker yok.
