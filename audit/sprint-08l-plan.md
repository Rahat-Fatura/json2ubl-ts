---
karar: Sprint 8l — v2.2.4 Library Suggestions Patch (Öneri #5 + #6)
hedef: Mimsoft greenfield F1.C1.x sırasında tespit edilen 2 öneriyi v2.2.4 patch'inde uygulamak
versiyon: v2.2.3 → v2.2.4 (patch — additive, BREAKING CHANGE yok)
durum: PLAN REVISED (2026-04-29) — Berkay onayı bekliyor
tarih: 2026-04-29
referans: Mimsoft `audit/greenfield/99-library-suggestions.md` Öneri #5 + #6
---

# Sprint 8l — v2.2.4 Library Suggestions Patch

## ⚠️ Plan Revizyon Özeti (2026-04-29)

Berkay ilk planı Mimsoft tüketici ekibine inceletip yorumları aldı; ardından implementation öncesi son fizibilite analizinde **TS 5.7.3 simülasyonu** yapıldı. Bu simülasyon sayesinde **plan'ın temel varsayımı yanlış çıktı** ve revize edildi:

**Değişen ana karar:**
- ~~"Öneri #6 v2.2.3'te zaten çözüldü; v2.2.4 sadece regression test ekler"~~ ❌
- ✅ **"Öneri #6 TS 5.7+ ortamında hâlâ patlıyor (kütüphane içi reproduction 6 TS2345 üretti); v2.2.4'te `update()` method'una 13 spesifik template literal overload eklenir."**

**Etki:**
- 8l.2 commit kapsamı: smoke test → **gerçek fix (overload bloğu) + smoke test + TS 5.7 simülasyon script**
- Test delta: +8 → **+10**
- CHANGELOG: "Fixed (zaten çözüldü)" → **gerçek "Fixed: TS 5.7+ inference uyumsuzluğu, 13 overload eklendi"**
- Yeni script: `npm run check:ts57` (Mimsoft tsconfig simülasyonu, sprint sonu doğrulama)

**Diğer Mimsoft yorumları kabul edildi:**
- `LineFieldVisibility` direkt re-export (zincir kısaltma)
- `SuggestionRule` + `SuggestionSeverity` re-export
- Publish Seçenek C (v2.2.3 + v2.2.4 ardışık)
- Verification §7 Mimsoft tüketici doğrulaması zorunlu

**Açık soruların hepsi yanıtlandı.** Plan implementation'a hazır.

## Context

Mimsoft greenfield refactor F1.C1.x (state + actions foundation) sırasında 2 yeni library önerisi tespit edildi:

- **Öneri #5** — `Suggestion`, `PathErrorPayload`, `PathErrorCode`, `LineFieldVisibility` tipleri kütüphanede tanımlı fakat ana paket entry'sinden public re-export edilmiyor. Mimsoft store snapshot tipinde inferred type (`SessionEvents['suggestion'][number]`) kullanılıyor — workaround değil ama drift riski (event shape değişirse store sessizce kayar).
- **Öneri #6** — Fonksiyonel `SessionPaths.X(i)` return type'ı `update<P extends keyof SessionPathMap>(...)` generic'iyle inference patlıyordu (Mimsoft v2.2.2 zamanında raporladığı `TS2345`). 5 helper × 1-5 path = 15 cast satırı `// LIBRARY-SUGGESTION-#6 PENDING` etiketli.

İkisi de **engelleyici değil** — Mimsoft inferred type / cast workaround'larıyla F1'i sürdürebiliyor. Ama greenfield başka faza geçmeden kütüphane tarafında temizlenmesi tercih edilir (S-8 sınırında olan cast'ler skill kanonu için kötü örnek).

## Fizibilite Analizi (kod incelemesi sonucu)

### Öneri #5 — public re-export gap doğrulandı

| Tip | Tanım dosyası + satır | `dist/index.d.ts` named export listesinde? |
|---|---|---|
| `Suggestion` | `src/calculator/suggestion-types.ts:17` | ❌ yok |
| `PathErrorPayload` | `src/calculator/invoice-session.ts:72` | ❌ yok |
| `PathErrorCode` | `src/calculator/invoice-session.ts:63` | ❌ yok |
| `LineFieldVisibility` | `src/calculator/line-field-visibility.ts:62` | ❌ yok |

`tail -2 dist/index.d.ts | grep ...` sonucu doğruladı: hiçbiri public export'ta değil. Çözüm Sprint 8k.1 (`SimpleSgkType`) pattern'i — sadece `src/calculator/index.ts` re-export listesi genişletilir. Risk: yok (additive, breaking değil).

### Öneri #6 — TS versiyon farkı kritik: 8k.2 narrow cast TS 5.7+ için yetersiz (REVIZE 2026-04-29)

**İlk varsayım yanlış çıktı.** v2.2.3 Sprint 8k.2 commit `8c2e914` generator'a `as` template literal cast eklemişti — bu **TS 5.3.3 (kütüphane local)** için yeterliydi, fakat **TS 5.7+ (Mimsoft)** için yetersiz.

**Reproduction sonucu (2026-04-29):** Mimsoft'un birebir action helper pattern'i kütüphane içinde TS 5.7.3 + Mimsoft tsconfig (target ES2022, module esnext, moduleResolution bundler, strict) simülasyonuyla typecheck edildi. **6 TS2345 hatası** alındı:

```
error TS2345: Argument of type '`buyerCustomer.identifications[${number}].schemeId`' is not assignable to parameter of type 'keyof SessionPathMap'.
error TS2345: Argument of type '`buyerCustomer.identifications[${number}].value`' is not assignable to parameter of type 'keyof SessionPathMap'.
error TS2345: Argument of type '`sender.identifications[${number}].schemeId`' is not assignable to parameter of type 'keyof SessionPathMap'.
error TS2345: Argument of type '`sender.identifications[${number}].value`' is not assignable to parameter of type 'keyof SessionPathMap'.
error TS2345: Argument of type '`despatchReferences[${number}].id`' is not assignable to parameter of type 'keyof SessionPathMap'.
error TS2345: Argument of type '`despatchReferences[${number}].issueDate`' is not assignable to parameter of type 'keyof SessionPathMap'.
```

**Sebep:** TypeScript 5.4–5.7 arasında template literal type inference davranışı değişmiş; `${number}` placeholder'lı template literal type'ı `keyof X` distributive union'ında bulamıyor (TS 5.3 buluyordu). Mimsoft repo'sundaki cast yorumu da `(TS5.7)` etiketi taşıyor (`set-buyer-customer.ts:69`).

**Çözüm (doğrulandı):** `InvoiceSession.update()` method'una **fonksiyonel path'ler için template literal overload bloğu** eklenir. Prototip TS 5.7.3 simülasyonunda 6 TS2345'in **hepsi temizlendi**:

```typescript
class InvoiceSession {
  // En spesifik overload'lar üstte (TS resolution sırası)
  update<I extends number>(path: `sender.identifications[${I}].schemeId`, value: string): void;
  update<I extends number>(path: `sender.identifications[${I}].value`, value: string): void;
  // ... customer × 2, buyerCustomer × 2, despatchReferences × 2, additionalDocuments × 5
  // Mevcut generic en altta (catch-all, line path'leri ve doc-level için zaten yeterli)
  update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P]): void;
  // Implementation imzası genişler
  update(path: string, value: unknown): void { /* mevcut implementation */ }
}
```

**Karar:** v2.2.4 **gerçek bir fix** içerir — sadece regression test değil, ~13 overload satırı ekleme. Mimsoft `yarn upgrade @2.2.4` sonrası 15 cast satırını silebilir.

### Verifikasyon — Mimsoft tsconfig simülasyonu (Sprint 8l ön doğrulama)

Plan onayı sonrası implement edilirken kütüphane içinde **TS 5.7.3 simülasyon script'i** çalıştırılır:

```bash
npx -p typescript@5.7.3 tsc --project /tmp/tsconfig-mimsoft-sim.json
```

Bu script CI'a eklenmez (sprint kapsamı dışı, gelecek iş) ama implementation sırasında manuel kontrol için kullanılır. Mimsoft `yarn upgrade` öncesinde bu script ile **ön doğrulama** yapılır.

## Sprint 8l Kapsamı

**6 atomik commit + 1 cross-repo (8l.0 → 8l.6).** Tahmini ~45 dakika.

### Atomik Commit Planı

| Commit | Kapsam | Test Δ |
|---|---|---|
| 8l.0 | Plan kopya + log iskelet (`audit/sprint-08l-plan.md` + `audit/sprint-08l-implementation-log.md`) | 0 |
| 8l.1 | Öneri #5: 4 tip public re-export (`src/calculator/index.ts`) + integration test | +4 |
| 8l.2 | Öneri #6: `update()` overload bloğu (~13 overload) + action helper smoke test + TS 5.7 simülasyon script | +6 |
| 8l.3 | README güncelleme (yeni public tipler import örnekleri) | docs |
| 8l.4 | CHANGELOG v2.2.4 entry | docs |
| 8l.5 | `package.json` 2.2.3 → 2.2.4 + log finalize | docs |
| 8l.6 | Cross-repo: Mimsoft `99-library-suggestions.md` Status updates | audit |

**Test delta hedefi:** 1750 → ~1760 (+10).

### Detay — Her Commit

#### 8l.1 — Öneri #5: 4 tip public re-export

**Dosya:** `src/calculator/index.ts`

**Değişiklikler:**

1. `Suggestion` re-export'u (yeni bölüm) — `suggestion-engine` import'u zaten var:
   ```typescript
   // SuggestionEngine ve advisory öneriler (AR-10 Faz 2)
   export { runSuggestionEngine, diffSuggestions } from "./suggestion-engine";
   export type { Suggestion, SuggestionRule, SuggestionSeverity } from "./suggestion-types";
   ```
   *Not:* `SuggestionRule` ve `SuggestionSeverity` zaten `suggestion-types.ts`'te export'lu — birlikte ekleyelim.

2. `PathErrorPayload` + `PathErrorCode` — InvoiceSession re-export bloğunu genişlet:
   ```typescript
   export type {
       SessionEvents,
       SessionEventName,
       InvoiceSessionOptions,
       UnsetScope,
       IdentificationParty,
       PathErrorPayload,            // ← eklenir
       PathErrorCode,               // ← eklenir
   } from "./invoice-session";
   ```

3. `LineFieldVisibility` — `invoice-rules` re-export bloğuna eklenir (mevcut bölümde `FieldVisibility` zaten var):
   ```typescript
   export type {
       FieldVisibility,
       ValidationWarning,
       InvoiceUIState,
       CustomerLiability,
       LineFieldVisibility,         // ← line-field-visibility.ts'ten gelir, calculator/index.ts'e eklenir
   } from "./invoice-rules";
   ```
   *Risk noktası:* `LineFieldVisibility` `line-field-visibility.ts`'te tanımlı, `invoice-rules.ts`'te değil. Doğru şekilde ayrı bir export bloğu açmak gerekir veya `invoice-rules.ts` ondan re-export ediyor mu kontrol edelim.

**Test:** `__tests__/integration/exports.test.ts`'e ekle (mevcut Sprint 8k.1 dosyası, +4):
```typescript
it('Suggestion type importable from main entry', () => {
  const s: Suggestion = {
    ruleId: 'test/rule',
    path: 'sender.taxNumber',
    value: '1234567890',
    reason: 'Test',
    severity: 'recommended',
  };
  expect(s.severity).toBe('recommended');
});
it('PathErrorPayload + PathErrorCode importable', () => {
  const p: PathErrorPayload = { code: 'INVALID_PATH', path: '', reason: 'x' };
  const c: PathErrorCode = 'UNKNOWN_PATH';
  expect(p.code).toBe('INVALID_PATH');
  expect(c).toBe('UNKNOWN_PATH');
});
it('LineFieldVisibility importable', () => {
  const lfv: LineFieldVisibility = { /* mevcut shape */ };
  expect(typeof lfv.showKdvExemptionCodeSelector).toBe('boolean');
});
```
+ smoke import test (4 tipin hepsi tek dosyadan import edilebiliyor mu).

#### 8l.2 — Öneri #6: `update()` overload bloğu + action helper smoke test (REVIZE)

**Dosya 1:** `src/calculator/invoice-session.ts` — `update()` method'una overload bloğu

**Eklenecek overload satırları (~13 overload, en spesifik üstte; mevcut generic en altta kalır):**

```typescript
class InvoiceSession {
  // ...

  // Sprint 8l.2 / Library Öneri #6: TS 5.7+ template literal inference fix.
  // `${number}` placeholder'lı path'ler keyof SessionPathMap distributive union'ında
  // TS 5.7+'da match etmiyor → her fonksiyonel path için spesifik overload.
  update<I extends number>(path: `sender.identifications[${I}].schemeId`, value: string): void;
  update<I extends number>(path: `sender.identifications[${I}].value`, value: string): void;
  update<I extends number>(path: `customer.identifications[${I}].schemeId`, value: string): void;
  update<I extends number>(path: `customer.identifications[${I}].value`, value: string): void;
  update<I extends number>(path: `buyerCustomer.identifications[${I}].schemeId`, value: string): void;
  update<I extends number>(path: `buyerCustomer.identifications[${I}].value`, value: string): void;
  update<I extends number>(path: `despatchReferences[${I}].id`, value: string): void;
  update<I extends number>(path: `despatchReferences[${I}].issueDate`, value: string): void;
  update<I extends number>(path: `additionalDocuments[${I}].id`, value: string): void;
  update<I extends number>(path: `additionalDocuments[${I}].issueDate`, value: string | undefined): void;
  update<I extends number>(path: `additionalDocuments[${I}].documentTypeCode`, value: string | undefined): void;
  update<I extends number>(path: `additionalDocuments[${I}].documentType`, value: string | undefined): void;
  update<I extends number>(path: `additionalDocuments[${I}].documentDescription`, value: string | undefined): void;

  // Mevcut generic catch-all (line path'leri inline çağrıda hâlâ buradan yakalanır)
  update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P]): void;

  // Implementation imzası genişler — runtime davranış değişmez
  update(path: string, value: unknown): void {
    // ... mevcut implementation, hiçbir runtime değişiklik yok
  }
}
```

**Önemli:** Implementation gövdesi (path validation 4 katman + diff detection + emit zinciri) **hiç değişmiyor**. Sadece method signature'ı genişliyor — TS overload resolution sırası: spesifik literal overload önce match → generic en sonra. Runtime'da tek `update(path: string, value: unknown)` implementation çağrılıyor.

**Niçin generator değil manuel:** Generator output'u (`session-paths.generated.ts`) `SessionPaths` const + `SessionPathMap` tipi üretiyor. `update()` method'u `invoice-session.ts`'te. Overload'ları generator'a taşımak için ek dosya/merge declaration karmaşası getirir; şimdilik manuel tutmak daha temiz. Generator regenerate disipliniyle uyum için `invoice-session.ts`'e şu yorum eklenir:
```
// SessionPaths fonksiyonel path entry'leri eklendiğinde bu overload bloğu
// manuel güncellenmelidir (npm run verify:paths drift'i CI'a yakalar, ama
// overload eksikliği TS 5.7+ tüketicilerde TS2345 olarak görünür).
```

**Dosya 2:** `__tests__/integration/session-paths-action-helper.test.ts` (yeni, +5-6 test)

Mimsoft action helper pattern'ini birebir simüle eder + overload resolution doğruluğunu kontrol eder:

```typescript
describe('SessionPaths action helper overload pattern (Öneri #6 — Sprint 8l.2)', () => {
  it('sender identifications helper (forEach + i: number) cast-free', () => { ... });
  it('buyerCustomer identifications helper cast-free', () => { ... });
  it('despatchReferences helper (id + issueDate) cast-free', () => { ... });
  it('additionalDocuments helper (5 path'ler) cast-free', () => { ... });
  it('mevcut generic catch-all hâlâ çalışıyor (lines[i].kdvPercent inline)', () => { ... });
  it('runtime davranış aynı (path validation + emit zinciri korundu)', () => { ... });
});
```

**Dosya 3:** `scripts/check-ts57-strict.sh` (yeni, manuel doğrulama script)

```bash
#!/bin/bash
# Mimsoft TS 5.7+ tsconfig simülasyonu — sprint sonrası elle çalıştırılır.
# CI'a eklenmesi gelecek iş; v2.2.4 publish öncesi son kontrol.
cat > /tmp/tsc57-sim.json <<JSON
{
  "compilerOptions": {
    "target": "ES2022", "module": "esnext", "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"], "strict": true, "esModuleInterop": true,
    "skipLibCheck": true, "noEmit": true, "types": ["node"]
  },
  "include": ["__tests__/integration/session-paths-action-helper.test.ts", "src/**/*.ts"]
}
JSON
npx -p typescript@5.7.3 tsc --project /tmp/tsc57-sim.json
```

Bu script Sprint 8l.2 commit'inde eklenir, **package.json `scripts`'ine `check:ts57` olarak da kaydedilir** (gelecekte CI hook'u kolaylaştırır).

#### 8l.3 — README

`README.md` güncellemesi:

- §2 InvoiceSession bölümüne yeni public tipler için import örnekleri:
  ```typescript
  import {
    InvoiceSession,
    SessionPaths,
    type Suggestion,           // v2.2.4+
    type PathErrorPayload,     // v2.2.4+
    type PathErrorCode,        // v2.2.4+
    type LineFieldVisibility,  // v2.2.4+
  } from '@rahat-fatura/json2ubl-ts';
  ```
- Event listener tip referans örneği güncellemesi:
  ```typescript
  session.on('path-error', (err: PathErrorPayload) => { ... });
  session.on('suggestion', (suggestions: Suggestion[]) => { ... });
  ```

#### 8l.4 — CHANGELOG v2.2.4

```markdown
## [2.2.4] — 2026-04-29

**Library Suggestions Patch (Mimsoft greenfield F1.C1.x).** İki öneri uygulandı; biri additive re-export, biri TS 5.7+ inference fix.

### Added
- **Public type re-export'ları** (Library Öneri #5):
  - `Suggestion`, `SuggestionRule`, `SuggestionSeverity` (`suggestion-types.ts`)
  - `PathErrorPayload`, `PathErrorCode` (`invoice-session.ts`)
  - `LineFieldVisibility` (`line-field-visibility.ts`)
  - Önceden inferred type (`SessionEvents['suggestion'][number]`) ile erişiliyordu; v2.2.4 ile cast'siz `import type { Suggestion } from '@rahat-fatura/json2ubl-ts'` mümkün.
- **TS 5.7 simülasyon script'i** (`scripts/check-ts57-strict.sh` + `npm run check:ts57`) — Mimsoft tsconfig'iyle yapay typecheck doğrulaması.

### Fixed
- **TS 5.7+ strict + bundler `moduleResolution` ortamında fonksiyonel `SessionPaths.X(i)` path'lerinin `update<P extends keyof SessionPathMap>(...)` generic'iyle inference uyumsuzluğu** (Library Öneri #6).
  - Sprint 8k.2'deki narrow `as` template literal cast TS 5.3.3'te yeterliydi fakat TS 5.4–5.7 arasında template literal type inference davranışı değişimi nedeniyle Mimsoft (TS 5.7) `TS2345` alıyordu.
  - Çözüm: `InvoiceSession.update()` method'una **13 spesifik template literal overload** eklendi (sender × 2, customer × 2, buyerCustomer × 2, despatchReferences × 2, additionalDocuments × 5).
  - Mevcut generic `update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P])` catch-all olarak korundu (line path'leri inline çağrılarda hâlâ generic'ten yakalanır).
  - Runtime davranış değişmedi — sadece method signature genişledi, implementation gövdesi aynı.
  - Mimsoft'taki **15 cast satırı + `LIBRARY-SUGGESTION-#6 PENDING` etiketleri** `yarn upgrade @rahat-fatura/json2ubl-ts@2.2.4` sonrası silinebilir.

### Test
- `update()` overload bloğu + action helper smoke (Öneri #6, +5-6)
- Public re-export integration (Öneri #5, +4)
- 1750 → ~1760 (+10)
```

#### 8l.5 — Version Bump + Log Finalize

- `package.json`: `2.2.3` → `2.2.4`
- `audit/sprint-08l-implementation-log.md` finalize (durum: KAPATILDI, v2.2.4 publish hazır)

#### 8l.6 — Cross-repo Audit Güncellemesi

**Dosya:** `/Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/audit/greenfield/99-library-suggestions.md`

Öneri #5:
- Status: `pending` → `applied`
- Güncel durum: library güncellemesi check + commit hash referansı
- Uygulama detayı bölümü: 8l.1 commit hash + dosya değişiklikleri

Öneri #6:
- Status: `pending` → `applied`
- **Önemli düzeltme (2026-04-29):** "Sprint 8k.2 commit `8c2e914` cast'i TS 5.3.3'te yeterliydi fakat TS 5.7+ Mimsoft ortamında yetersiz kaldı (kütüphane içi reproduction TS 5.7.3 simülasyonuyla 6 TS2345 üretti). v2.2.4 (Sprint 8l.2) `update()` method'una 13 spesifik template literal overload ekleyerek fix'ledi. Mimsoft `yarn upgrade @rahat-fatura/json2ubl-ts@2.2.4` sonrası 15 cast satırı + `LIBRARY-SUGGESTION-#6 PENDING` etiketleri silinebilir, `tsc --noEmit` 0 hata vermeli."
- Refactor uygulama bölümünde: ne yapılacağı net (cast satırları silinir, import type SessionPathMap kullanımı sadece cast amaçlıysa silinir)

Özet tablo Status sütunları + Sprint commit kolonu güncellenir.

`99-implementation-log.md` decision log'a entry: "Decision #10 — v2.2.4 patch'i Öneri #5 (public re-export) + Öneri #6 fix (`update()` method'una 13 spesifik template literal overload eklenmesi — TS 5.7+ inference uyumsuzluğu çözümü) içerir."

**Mimsoft repo'da git commit Berkay'ın yetkisiyle bırakılır** — sadece dosya güncellemesi yapılır.

## Disiplin

- **1750 mevcut test bozulmaz.** Tüm değişiklikler additive.
- **Mimari kararlar M1-M12, AR-1..AR-10 stabil.** Yeni karar yok.
- **`bun run typecheck` temiz olmalı.**
- **162 examples-matrix regression yeşil kalmalı.**

## Verification

1. `bun run typecheck` → sıfır hata (kütüphane local TS 5.3.3)
2. `bun run test` → 1760/1760 yeşil
3. `bun run build` → `dist/index.d.ts`'te:
   - **Öneri #5 public type'lar:** `type Suggestion`, `type SuggestionRule`, `type SuggestionSeverity`, `type PathErrorPayload`, `type PathErrorCode`, `type LineFieldVisibility` named export listesinde
   - **Öneri #6 update overload bloğu:** `class InvoiceSession`'da 13 spesifik overload + mevcut generic + implementation imzası görünüyor
4. Action helper smoke test geçer (Öneri #6 overload davranışı + runtime correctness)
5. **`npm run check:ts57` (yeni script) → 0 hata** — TS 5.7.3 simülasyonu kütüphane içinde Mimsoft tsconfig'iyle çalıştırılır, action helper pattern hatasız compile etmeli
6. Cross-repo: Mimsoft `99-library-suggestions.md`'da Öneri #5 + #6 `Status: applied`
7. **Mimsoft tüketici tarafı doğrulaması (Öneri #6 kapanış kriteri)** — Sprint 8l publish + Mimsoft `yarn upgrade @rahat-fatura/json2ubl-ts@2.2.4` sonrası:
   - Mimsoft `packages/web/src/components/document-create/v2/actions/` altındaki **15 cast satırı** + `// LIBRARY-SUGGESTION-#6 PENDING` etiketleri (5 helper × 1-5 path: `set-sender`, `set-customer`, `set-buyer-customer`, `set-despatch-references`, `set-additional-documents`) **silinir**
   - `yarn workspace @sisteminiz/web exec tsc --noEmit` → **0 hata** (TypeScript 5.x, Mimsoft tsconfig)
   - **Eğer hâlâ TS2345 alınırsa Sprint 8l yetersizdir** → ek overload'lar (yeni fonksiyonel path eklendiyse) veya `SessionPathMap` mapped type alternatifi içeren v2.2.5 patch'i hazırlanır
   - Bu doğrulama **Mimsoft commit'i** olduğu için Sprint 8l atomik commit kapsamı dışı; Mimsoft F1 toplu commit zincirinde yapılır
   - **Pre-condition:** Sprint 8l.2'deki `npm run check:ts57` script'i kütüphane içinde geçtiyse (§5), Mimsoft doğrulaması da yüksek güvenle geçecek (config birebir aynı)

## Risk ve Dur Sinyali

- **`LineFieldVisibility` re-export konumu (Mimsoft önerisi: direkt re-export, Berkay kararı):** `invoice-rules.ts` `LineFieldVisibility`'yi re-export ediyor mu önce kontrol et — etmiyorsa **`line-field-visibility.ts`'ten direkt** re-export et (Mimsoft tercihi: zincir kısaltma, modül sınırı net).
- **`Suggestion` import çakışması:** `suggestion-types.ts` zaten `SuggestionRule` ve `SuggestionSeverity`'yi export ediyor mu doğrula — eğer hayırsa `src/calculator/suggestion-types.ts`'e ek export gerekir (sprint kapsamına dahil).
- **`update()` overload sırası:** TS overload resolution **soldan sağa, üstten alta**. Spesifik literal overload'lar generic'in **üstüne** yazılmalı; aksi halde generic önce match eder ve TS2345 sürer. Plan'da sıralama doğru.
- **Implementation imzası genişlemesi:** `update(path: string, value: unknown)` runtime davranışını değiştirmez — path validation 4 katman zaten içeriden çalışıyor. Mevcut 1750 test bozulmamalı.
- **TS 5.7 simülasyon script `noUnusedLocals`:** Test dosyasındaki bazı argümanlar local scope'ta unused olabilir — script tsconfig'inde `noUnusedLocals: false` olmalı (kütüphane main tsconfig'i etkilenmesin).
- **162 examples-matrix regression:** En az 1 senaryo bozulursa **dur** — atomic commit tek tek geri alınır.
- **Berkay'ın `npm publish` adımı manuel:** Plan tamamlanır, fakat Mimsoft `yarn upgrade @rahat-fatura/json2ubl-ts@2.2.4` sonrası Öneri #6 cast'lerini silmek için ek bir Mimsoft commit gerekir (bu sprint kapsamı dışı, Mimsoft F1 toplu commit'inde).
- **Yeni fonksiyonel path eklendiğinde drift:** Generator'da yeni `(i: number) => template literal` path eklenirse, `invoice-session.ts`'teki overload bloğu **manuel** güncellenmeli. `npm run verify:paths` drift'i CI'da yakalar (mevcut), ama overload eksikliği ancak TS 5.7+ tüketicide TS2345 olarak görünür. Mitigation: `verify:paths` script'ine ek bir kontrol — yeni fonksiyonel path eklendiyse `invoice-session.ts`'te ilgili overload var mı diye scan eder. (Sprint kapsamı dışı, gelecek iş.)

## Açık Sorular (Resolved 2026-04-29)

1. **Öneri #6 yaklaşım onayı:** ~~v2.2.4 sadece regression smoke test yeterli mi?~~ → **HAYIR yetersiz.** TS 5.7.3 reproduction'ı 6 TS2345 üretti; gerçek fix gerekiyor. Plan revize edildi: **`update()` method'una 13 spesifik template literal overload eklenir** (Sprint 8l.2). Mimsoft "şartlı evet" şartı bu fix'le sağlanır.

2. **`SuggestionRule` ve `SuggestionSeverity` re-export'u:** **Evet** (Mimsoft kabul). `Suggestion`'la birlikte re-export edilir, tutarlı + advisory rule yazmak isteyen tüketiciye açık.

3. **v2.2.4 vs v2.2.3 publish sırası:** **Seçenek C** (Mimsoft kabul). v2.2.3 audit kanonu zaten yazıldı, tag'lenir; v2.2.4 hemen ardından publish edilir; Mimsoft tek `yarn upgrade @rahat-fatura/json2ubl-ts@2.2.4` ile geçer.

---

## Mimsoft Tüketici Tarafı Geri Bildirimi (2026-04-29)

Plan, Mimsoft greenfield F1 ekibi tarafından okundu. Aşağıdaki cevaplar/müdahaleler eklendi:

### Açık Soru cevapları

**Soru #1 — Öneri #6 yaklaşım onayı:** **Şartlı evet → şart sağlanmadığı için plan revize edildi (2026-04-29).**

İlk plan "regression test + Status: applied yeterli" diyordu. Berkay onay sonrası implement öncesi yapılan **TS 5.7.3 simülasyonu (kütüphane içinde Mimsoft tsconfig kopyası)** Mimsoft pattern'ini reproduce etti:

```
error TS2345: Argument of type '`buyerCustomer.identifications[${number}].schemeId`'
              is not assignable to parameter of type 'keyof SessionPathMap'.
```
6 TS2345 hatası. Sebep: TS 5.4–5.7 arasında template literal type inference davranış değişimi (TS 5.3.3'te 8k.2 cast yeterliydi, TS 5.7'de değil). Mimsoft repo'sundaki cast yorumu da `(TS5.7)` etiketi taşıyor (`set-buyer-customer.ts:69`).

**Çelişki çözüldü:** ilk reproduction kütüphane local TS 5.3.3 kullandığı için temiz görünüyordu. TS 5.7 simülasyonu Mimsoft'un raporladığı sorunu birebir gösterdi.

**Çözüm doğrulandı:** Aynı simülasyonda `update()` method'una eklenen 13 template literal overload prototip'i 6 TS2345'in **hepsini temizledi**. Plan §"Öneri #6" + §8l.2 detay bu doğrulamaya göre revize edildi.

**Sprint 8l.2 yeni kapsam:**
- `update()` overload bloğu eklenir (13 satır)
- `npm run check:ts57` script'i (Mimsoft tsconfig simülasyonu) — sprint sonu doğrulama + gelecek CI hook hazırlığı
- Action helper smoke testleri (overload + runtime correctness)

Verification §5 (`check:ts57` 0 hata) + §7 (Mimsoft tüketici doğrulaması) ikili koruma sağlar.

**Soru #2 — `SuggestionRule` + `SuggestionSeverity` re-export:** **Evet, kabul.** Mimsoft F8 (Reactive features — suggestion panel) sırasında işine yarayacak; ek maliyet yok, ileriye dönük temiz tutar.

**Soru #3 — Publish sırası:** **Seçenek C onaylandı.** v2.2.3 audit kanonu zaten yazıldı (Sprint 8k commit'leri, decision log, library-suggestions.md tablosu); tag'lenmemesi tarihsel kayıt kaybı. Mimsoft tek `yarn upgrade @2.2.4` ile geçer — pratik, semver disipliniyle uyumlu.

### Risk nokta #1 — `LineFieldVisibility` re-export konumu

Mimsoft önerisi: **`line-field-visibility.ts`'ten direkt re-export** daha temiz (`invoice-rules.ts`'ten `import type` zincirini kısaltır, modül sınırı net kalır). **Kabul edildi (2026-04-29):** Sprint 8l.1'de `src/calculator/index.ts` içinde `LineFieldVisibility` doğrudan `./line-field-visibility`'den re-export edilir.

### Mimsoft tarafında bekleyen iş (Sprint 8l kapsamı dışı, Mimsoft F1 toplu commit'ine dahil)

Sprint 8l v2.2.4 publish + Mimsoft yarn upgrade sonrası Mimsoft F1 toplu commit zincirine **dahil edilecek değişiklikler**:

1. **Library Öneri #6 cast temizliği** — 5 helper'da toplam 15 cast satırı + `// LIBRARY-SUGGESTION-#6 PENDING` etiketleri silinir:
   - `actions/set-sender.ts` (2 cast)
   - `actions/set-customer.ts` (2 cast)
   - `actions/set-buyer-customer.ts` (2 cast)
   - `actions/set-despatch-references.ts` (2 cast)
   - `actions/set-additional-documents.ts` (5 cast)
   - + 2 `import type { SessionPathMap }` import'u (helper içinde sadece cast için; cast silinince import gereksiz)

2. **Library Öneri #5 inferred type temizliği** — `state/invoice-session-store.ts`:
   - 3 inferred type tanımı (`Suggestion`, `PathErrorPayload`, `LineFieldVisibility`) silinir
   - `import type { Suggestion, PathErrorPayload, LineFieldVisibility } from 'json2ubl-ts'` direct import'a geçilir
   - `// LIBRARY-SUGGESTION-#5 PENDING` etiketi silinir
   - `import type { SessionEvents }` artık gereksizse silinir

3. **Adım dökümanı revizyonları** — `audit/greenfield/faz01/`:
   - `01-store-skeleton.md` — Library Öneri #5 bölümünü "applied (v2.2.4)" olarak revize et
   - `06-action-buyer-customer.md` — Library Öneri #6 bölümünü "applied (v2.2.4)" olarak revize et
   - `07-actions-sender-customer.md`, `10-actions-array-composites.md` — Library Öneri #6 referanslarını applied'e çevir

4. **`99-library-suggestions.md` Status güncellemesi** — Öneri #5 + #6 `Status: pending → applied`, "Güncel durum" checkbox'ları + commit hash referansları eklenir.

5. **`tsc --noEmit` + `yarn test`** — 0 hata + 40/40 test, regression yok.

Bu beş madde Mimsoft F1 toplu commit zincirinde **yeni bir atomik commit** olarak (örn. `chore(web): F1 — json2ubl-ts@2.2.4 cleanup (Library Öneri #5 + #6 applied)`) atılır. Commit zinciri sırası: P6 → C1.4 → ... → C1.12 → cleanup → finalize (toplam 12 atomik commit).
