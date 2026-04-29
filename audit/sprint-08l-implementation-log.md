---
sprint: 8l
baslik: v2.2.4 Library Suggestions Patch — 6 public type re-export + InvoiceSessionUpdateOverloads (TS 5.7+ inference fix)
tarih_basi: 2026-04-29
tarih_sonu: 2026-04-29
plan: audit/sprint-08l-plan.md (REVISED 2026-04-29 — Mimsoft yorumları + TS 5.7.3 reproduction sonucu)
master_plan: audit/reactive-session-master-plan.md
onceki_sprint: audit/sprint-08k-implementation-log.md (v2.2.3 ready)
sonraki_sprint: TBD (Mimsoft greenfield F1 toplu commit — cleanup)
toplam_commit: 7 atomik alt-commit (8l.0 → 8l.6)
test_durumu_basi: 1750 / 1750 yeşil
test_durumu_sonu: 1763 / 1763 yeşil (+13 yeni test)
versiyon: v2.2.3 → v2.2.4 (patch — additive, BREAKING CHANGE yok)
mimari_karar: yeni karar yok (mevcut M1-M12, AR-1..AR-10 stabil)
durum: KAPATILDI — v2.2.4 publish hazır
---

## Kapsam

`audit/sprint-08l-plan.md` Berkay onayı + Mimsoft yorumları + TS 5.7.3 reproduction sonucu ile finalize edildi. Mimsoft greenfield F1.C1.x sırasında 2 öneri:

1. **Öneri #5** — `Suggestion`, `SuggestionRule`, `SuggestionSeverity`, `PathErrorPayload`, `PathErrorCode`, `LineFieldVisibility` public re-export
2. **Öneri #6** — TS 5.7+ ortamında fonksiyonel `SessionPaths.X(i)` → `update()` generic'iyle TS2345 inference uyumsuzluğu

**7 atomik commit (8l.0 → 8l.6) + cross-repo audit**

## Atomik Commit Özeti

### 8l.0 — Plan + log iskelet
**Commit:** `c6746f4`
**Kapsam:** `audit/sprint-08l-plan.md` (Mimsoft yorumlarıyla revize) + bu log iskelet açıldı.
**Test:** 1750 → 1750.

### 8l.1 — Öneri #5: 6 public type re-export
**Commit:** `87b02f2`
**Kapsam:**
- `src/calculator/suggestion-types.ts`: `SuggestionSeverity` literal union ayrı tip alias olarak çıkarıldı (önceden inline `Suggestion.severity` field'ında).
- `src/calculator/index.ts` re-export listesi genişletildi:
  - InvoiceSession bloğuna: `PathErrorPayload`, `PathErrorCode`
  - Yeni bölüm: `LineFieldVisibility` direkt re-export (Mimsoft önerisi: `line-field-visibility.ts`'ten zincir kısaltma)
  - SuggestionEngine bölümü: `runSuggestionEngine`, `diffSuggestions`, `Suggestion`, `SuggestionRule`, `SuggestionSeverity`

**Build doğrulandı:** `dist/index.d.ts` named export listesinde 6/6 yeni tip görünür.

**Test:** `__tests__/integration/exports.test.ts` (+6) — Suggestion + SuggestionSeverity + SuggestionRule + PathErrorPayload + PathErrorCode (7 code) + LineFieldVisibility (10 boolean field) public import smoke.

**Test:** 1750 → 1756.

### 8l.2 — Öneri #6: `update()` overload bloğu (TS 5.7+ fix)
**Commit:** `6c82b33`
**Kapsam:**

**Sorun (TS 5.7.3 + Mimsoft tsconfig simülasyonu):**
- `keyof SessionPathMap` template literal placeholder key'lerini (`'X[${number}].Y'`) distributive union'da match etmiyor
- `<I extends number>` generic constraint da `${number}` placeholder'ıyla match etmiyor
- Sadece **non-generic literal pattern** (`update(path: \`X[${number}].Y\`, value: T): void`) match ediyor

**Çözüm:** Generator-driven overload bloğu (interface'te declaration merging).

**Mimari değişiklikler:**
- `scripts/generate-session-paths.ts`: `renderUpdateOverloads(entries)` fonksiyonu eklendi — TÜM path entry'leri (doc-level + fonksiyonel) için literal overload üretir.
- `src/calculator/session-paths.generated.ts`: 130 overload satırı emit ediliyor (regenerate, 1061 → 1140 line).
- `src/calculator/invoice-session.ts`:
  - `interface InvoiceSession extends InvoiceSessionUpdateOverloads {}` declaration merging.
  - Class'tan `update<P extends keyof SessionPathMap>(...)` generic overload **kaldırıldı** (TS 5.7+ declaration merging "incorrectly extends" hatası verir).
  - Class sadece implementation imzası: `update(path: string, value: unknown): void`.
- `scripts/check-ts57-strict.sh` + `package.json` `check:ts57` script entry.

**Doğrulama:**
- `bun run typecheck` (TS 5.3.3) ✅
- `npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) ✅

**Test:** `__tests__/integration/session-paths-action-helper.test.ts` (+7) — Mimsoft action helper pattern'ini birebir simüle eder (forEach + i: number, helper fonksiyon, KAMU B-83, despatchReferences, additionalDocuments 5 path, generic catch-all line path inline, runtime davranış).

**Test:** 1756 → 1763.

### 8l.3 — README §2 InvoiceSession import + event listener
**Commit:** `b4d32cb`
**Kapsam:**
- §2 path-based update örneklerinde v2.2.4+ import örneği genişletildi (6 yeni public tip).
- Event listener bölümüne `Suggestion[]` + `PathErrorPayload` cast'siz tipli callback örnekleri.

**Test:** 1763 → 1763.

### 8l.4 — CHANGELOG v2.2.4
**Commit:** `528d301`
**Kapsam:** Keep a Changelog formatında v2.2.4 girdisi:
- Added: 6 re-export + `InvoiceSessionUpdateOverloads` interface + `check:ts57` script
- Changed: `update()` method imzası reorganize (class implementation + interface overloads, runtime aynı)
- Fixed: TS 5.7+ TS2345 (130+ literal overload)
- Migration v2.2.3 → v2.2.4 örneği

**Test:** 1763 → 1763.

### 8l.5 — Version Bump + Log Finalize
**Commit:** (bu commit)
**Kapsam:** `package.json` `2.2.3` → `2.2.4`. Bu log finalize edildi (durum: KAPATILDI).

**Test:** 1763 → 1763.

## Final Test Durumu

| Önceki | 8l.0 | 8l.1 | 8l.2 | 8l.3 | 8l.4 | 8l.5 (final) |
|---|---|---|---|---|---|---|
| 1750 | 1750 | 1756 | 1763 | 1763 | 1763 | **1763** |

**Test delta:** Plan +10, gerçekleşen **+13** (Öneri #5 testleri: planda +4, gerçekte +6 — SuggestionSeverity ek tip alias için ek test; Öneri #6 testleri: +7, plan kapsamında).

## Mimsoft Greenfield İçin Sinyal

**2 öneri çözüldü:**

1. ✅ **Öneri #5 — Public type re-export.** Mimsoft `state/invoice-session-store.ts`'te inferred type tanımları (3 adet) silinebilir; direkt import:
   ```typescript
   import type { Suggestion, PathErrorPayload, LineFieldVisibility } from 'json2ubl-ts';
   ```

2. ✅ **Öneri #6 — TS 5.7+ inference fix.** Mimsoft `actions/` altındaki **15 cast satırı + `LIBRARY-SUGGESTION-#6 PENDING` etiketleri** `yarn upgrade json2ubl-ts@2.2.4` sonrası silinebilir. `tsc --noEmit` 0 hata bekleniyor (kütüphane içi `npm run check:ts57` simülasyonu doğruladı).

## Disiplin Doğrulamaları

- ✅ **1750 mevcut test bozulmadı** — tüm değişiklikler additive.
- ✅ **Mimari kararlar M1-M12, AR-1..AR-10 stabil** — yeni karar yok.
- ✅ **`bun run typecheck` (TS 5.3.3) temiz.**
- ✅ **`npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) temiz.**
- ✅ **162 examples-matrix regression yeşil.**
- ✅ **Generator regenerate diff temiz** (sadece `renderUpdateOverloads` blok eklemesi, mevcut SessionPaths/SessionPathMap/KNOWN_PATH_TEMPLATES içerikleri değişmedi).

## Cross-repo Audit Güncellemesi (8l.6)

`/Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/audit/greenfield/99-library-suggestions.md`'da:
- Öneri #5 + #6 `Status: pending → applied`
- Sprint 8l commit hash referansları + uygulama detayları
- Decision #10 entry (Mimsoft revizesi cümle): "v2.2.4 patch'i Öneri #5 (public re-export) + Öneri #6 fix (update() method'una 13 spesifik template literal overload eklenmesi — TS 5.7+ inference uyumsuzluğu çözümü) içerir."
- Özet tablo + greenfield prerekuizit tablosu güncellenir.

**Mimsoft repo'da git commit Berkay'ın yetkisiyle bırakıldı** — sadece dosya güncellemesi yapıldı.

## v2.2.4 Publish

Berkay manuel publish edecek:
```bash
git push origin main
git tag v2.2.4
git push origin v2.2.4
npm publish
gh release create v2.2.4 --title "v2.2.4 — Library Suggestions Patch (TS 5.7+ inference fix)" --notes-file CHANGELOG.md
```

Sonra Mimsoft monorepo'da:
```bash
yarn upgrade json2ubl-ts@2.2.4
# Mimsoft F1 toplu commit zincirinde:
#   - 15 cast satırı + LIBRARY-SUGGESTION-#6 PENDING etiketleri silinir
#   - 3 inferred type tanımı + LIBRARY-SUGGESTION-#5 PENDING silinir
#   - tsc --noEmit + yarn test → 0 hata
#   - 99-library-suggestions.md "Yeni sürüm yayınlandı" + "yarn upgrade" + "Refactor'da uygulandı" checkbox'ları
#   - 99-implementation-log.md decision log: Decision #10 commit hash güncellemesi
```

Greenfield F1+ devam edebilir — kütüphane tarafı blocker yok.
