---
karar: Sprint 8j — v2.2.1 Migration Hotfix Plan
hedef: Mimsoft monorepo migration (v1.4.2 → v2.2.0) için 3 kritik blocker'ı çözmek + v2.2.1 patch publish'i hazırlamak
versiyon: v2.2.0 → v2.2.1 (patch — additive, BREAKING CHANGE yok)
durum: Plan — KİLİTLİ
tarih: 2026-04-28
referans: audit/sprint-08i-implementation-log.md (v2.2.0 publish ready), Mimsoft monorepo audit/json2ubl-migration-current-state.md
---

# Sprint 8j — v2.2.1 Migration Hotfix

## Görev

3 kütüphane bug'ını/eksikliğini fix edip **v2.2.1 patch publish'i hazırla**. Bu Mimsoft monorepo migration'ı (v1.4.2 → v2.2.0) için kritik blocker'ları çözüyor — migration başlamadan önce tamamlanmalı.

## Bağlam

v2.2.0 publish edildi (Faz 1 + Faz 2 birlikte). Mimsoft monorepo'da migration için durum tespiti yapıldı (`audit/json2ubl-migration-current-state.md` — kütüphane repo'sunda yok, Mimsoft repo'sunda). 3 kritik bulgu çıktı:

### Bulgu 1 — `SessionPaths` runtime export YOK

`dist/index.mjs` ve `dist/index.d.ts`'te `SessionPaths` adlı runtime export yok. Sadece `SessionPathMap` tip türetimi var. Ama README'de örnekler `SessionPaths.senderTaxNumber` formundadır — dokümantasyon-kod çelişkisi.

Doğrulama:
```bash
grep -nE "^var SessionPaths|^const SessionPaths|export.*SessionPaths" dist/index.mjs
# Şu an çıktı yok — bug
```

Sprint 8h.1'de generator script üretildi ama runtime export listesine `SessionPaths` eklenmemiş. Generated dosya (`src/calculator/session-paths.generated.ts`) `SessionPaths` constant'ını export ediyor olmalı; ana `src/index.ts` veya `src/calculator/index.ts` re-export etmiyor olabilir.

**Yapılacak:** Generated `SessionPaths` constant'ını ana export listesine ekle. `src/index.ts`'te `export { SessionPaths, type SessionPathMap } from './calculator/session-paths.generated'` benzeri.

### Bulgu 2 — Party `identifications` API Gap

`SessionPathMap` içinde party-level identifications path entry'leri yok:
- `sender.identifications[N].schemeId` — YOK
- `sender.identifications[N].value` — YOK
- `customer.identifications[N].schemeId` — YOK
- `customer.identifications[N].value` — YOK
- `buyerCustomer.identifications[N].schemeId` — YOK
- `buyerCustomer.identifications[N].value` — YOK
- `taxRepresentativeParty.additionalIdentifiers[N].schemeId` — YOK
- `taxRepresentativeParty.additionalIdentifiers[N].value` — YOK

Karşılaştırma için **var olan:** `lines[N].additionalItemIdentifications[M].schemeId/value`. Yani generator pattern'i biliyor, sadece party-level'da uygulanmamış.

**Etki:** Mimsoft'ta kritik senaryolar bu path'lere ihtiyaç duyuyor:
- IDIS profili → SEVKIYATNO (`sender.identifications`)
- KAMU profili → MUSTERINO (`buyerCustomer.identifications`, B-83)
- HKS profili → KUNYENO (`sender.identifications`)
- Yolcu profilleri → çoklu schemeId
- Tax representative → additionalIdentifiers

**Yapılacak:** Generator script'inde party identifications path'lerini ekle. Tahmini ~12-16 yeni path entry. Tüm party'lerde tutarlı (sender/customer/buyerCustomer/taxRepresentativeParty).

### Bulgu 3 — Composite "undefined ile clear" semantiği yok

v1.x'te kullanıcı `setBillingReference(undefined)` çağırarak tüm composite'i kaldırabilirdi. v2.x path-based API'de bu yok:
- `update('billingReference.id', undefined)` → tip uyumsuz (path tipi `string`, undefined kabul etmez)
- Empty string ile clear (`update('billingReference.id', '')`) → semantik kayıp (XML'de boş alan vs eksik alan farkı olabilir)
- Constructor remount → ağır

**Karar (Berkay tarafından):** **Seçenek B — `unset(scope)` helper.**

Yeni public API:
```typescript
session.unset('billingReference');
session.unset('paymentMeans');
session.unset('ozelMatrah');
session.unset('sgkInfo');
session.unset('invoicePeriod');
session.unset('buyerCustomer');
session.unset('taxRepresentativeParty');
session.unset('eArchiveInfo');
session.unset('onlineSale');
session.unset('orderReference');
```

Davranış:
- `_input[scope] = undefined` (composite tamamen silinir)
- `fieldChanged` event emit (scope path'i, value: undefined, previousValue: önceki composite)
- `updateUIState()` tetikle
- Mevcut field-level event akışı çalışır (fieldDeactivated, vb.)
- Sub-field path'leri (`billingReference.id` vs.) artık `update()` ile reddedilir → `error` event (`PATH_NOT_AVAILABLE` veya benzer) — composite null olduğu için

**Tip kontratı:**
```typescript
type UnsetScope = 'billingReference' | 'paymentMeans' | 'ozelMatrah' 
                | 'sgkInfo' | 'invoicePeriod' | 'buyerCustomer' 
                | 'taxRepresentativeParty' | 'eArchiveInfo' 
                | 'onlineSale' | 'orderReference';

class InvoiceSession {
  unset(scope: UnsetScope): void;
}
```

`type` ve `profile` gibi zorunlu alanlar `UnsetScope`'a girmez — bunlar nullable değil.
`liability` özel: nullable ama M10 kontratı (isExport=true ise no-op + error). Tasarımda dahil edip edilmeyeceği — Claude karar versin (önerim: dahil et).

---

## Sprint 8j Kapsamı

**3 hotfix + dokümantasyon + version bump.** Toplam ~6-8 atomik commit, 1.5-2 saat.

### Atomik Commit Planı

| Commit | Kapsam | Test Δ |
|---|---|---|
| 8j.0 | Plan kopya + log iskelet (`audit/sprint-08j-implementation-log.md`) | 0 |
| 8j.1 | `SessionPaths` runtime export fix (Bulgu 1) — ana index.ts + dist regenerate | +5 |
| 8j.2 | Generator script party identifications path entries (Bulgu 2) — script güncellenir, generated dosya regenerate | +15 |
| 8j.3 | `unset(scope)` API + `UnsetScope` tip + event entegrasyonu (Bulgu 3) | +20 |
| 8j.4 | README güncelleme (SessionPaths runtime kullanım örneği + unset API) | docs |
| 8j.5 | CHANGELOG v2.2.1 entry | docs |
| 8j.6 | package.json 2.2.0 → 2.2.1 + log finalize | docs |

**Test delta hedefi:** ~40 yeni test (1694 → ~1734).

### Detay — Her Commit

#### 8j.1 — SessionPaths Runtime Export

**İş:**
1. `src/calculator/session-paths.generated.ts` dosyasında `SessionPaths` constant `export const` olarak var olduğunu teyit et
2. Yoksa generator script'i (`scripts/generate-session-paths.ts`) güncelle, `SessionPaths` constant'ı emit et
3. Ana `src/index.ts`'e re-export ekle:
   ```typescript
   export { SessionPaths } from './calculator/session-paths.generated';
   export type { SessionPathMap } from './calculator/session-paths.generated';
   ```
4. Build: `bun run build` (tsup veya benzeri)
5. Doğrula: `dist/index.mjs`'te `SessionPaths` constant'ı çıktı veriyor mu
6. Doğrula: `dist/index.d.ts`'te `SessionPaths` ve `SessionPathMap` export ediliyor mu

**Test:** `__tests__/integration/session-paths-export.test.ts` — `import { SessionPaths } from 'json2ubl-ts'` ile gerçekten import edilebiliyor mu, key'leri doğru mu.

#### 8j.2 — Party Identifications Path Entries

**İş:**
1. Generator script'i (`scripts/generate-session-paths.ts`) tara — party identifications neden atlanmış?
2. SimpleInvoiceInput'taki party tip'lerini incele (SimplePartyInput, vs.) — `identifications: PartyIdentification[]` alanı var
3. `lines[N].additionalItemIdentifications[M]` pattern'ini party'lere uygula:
   ```typescript
   senderIdentificationSchemeId: (n: number) => `sender.identifications[${n}].schemeId`,
   senderIdentificationValue: (n: number) => `sender.identifications[${n}].value`,
   customerIdentificationSchemeId: (n: number) => `customer.identifications[${n}].schemeId`,
   customerIdentificationValue: (n: number) => `customer.identifications[${n}].value`,
   buyerCustomerIdentificationSchemeId: (n: number) => `buyerCustomer.identifications[${n}].schemeId`,
   buyerCustomerIdentificationValue: (n: number) => `buyerCustomer.identifications[${n}].value`,
   taxRepresentativePartyAdditionalIdentifierSchemeId: (n: number) => `taxRepresentativeParty.additionalIdentifiers[${n}].schemeId`,
   taxRepresentativePartyAdditionalIdentifierValue: (n: number) => `taxRepresentativeParty.additionalIdentifiers[${n}].value`,
   ```

   İsimlendirme uzun — Claude daha kısa form bulabilir (örn. `senderIdSchemeId(n)`). Mevcut `SessionPaths` naming convention'ına uy.

4. Generator script regenerate, `session-paths.generated.ts` boyut artar (~125 → ~140 entry)
5. SessionPathMap tipi otomatik genişler

**Test:** Yeni path'lerin SessionPathMap'te olduğu, runtime'da `update(SessionPaths.senderIdentificationSchemeId(0), 'IDIS')` çalıştığı, `_input.sender.identifications[0].schemeId` değerinin doğru set edildiği.

**Beklenmedik durum:** Eğer SimpleInvoiceInput'ta party identifications array'i opsiyonel ise, ilk set'te array oluşturulması gerekir. D-6 kararı (sub-object create + warning) buraya da uygulanır mı? — Claude karar versin.

#### 8j.3 — `unset(scope)` API

**İş:**
1. `UnsetScope` tipi tanımla (yukarıda)
2. `InvoiceSession.unset(scope)` metodu:
   - `_input[scope] = undefined`
   - `fieldChanged` event emit (path: scope, value: undefined, previousValue: önceki value)
   - `updateUIState()` tetikle
   - Sub-field path'leri için `update()` artık reject eder (composite undefined)
3. Path validation güncellenir: `update('billingReference.id', x)` çağrısında `_input.billingReference === undefined` ise → `error` event (`PATH_NOT_AVAILABLE` veya `PARENT_UNDEFINED`)

**Test:**
- `unset('billingReference')` sonrası `_input.billingReference === undefined`
- `fieldChanged` event emit sequence
- Daha önce dolu olan composite'in kaldırılması, sonra tekrar `update('billingReference.id', 'X')` çağrısı sub-object create ile composite'i yeniden oluşturuyor mu (D-6 davranışı)
- `unset('liability')` davranışı (M10 isExport=true → no-op + error)
- 162 examples-matrix regression: hiçbiri bozulmuyor (unset opsiyonel API, eski davranış değişmiyor)

#### 8j.4 — README

`README.md` güncelle:
- `SessionPaths` import örneği netleşsin (raw string fallback değil, runtime const kullanım)
- `unset()` API yeni bölüm:
  ```typescript
  // Composite alanları temizleme
  session.unset('billingReference');
  session.unset('paymentMeans');
  ```
- Migration guide: v1.x'ten gelenler için `setBillingReference(undefined)` → `unset('billingReference')` örneği

#### 8j.5 — CHANGELOG

```markdown
## [2.2.1] - 2026-XX-XX

### Added
- `SessionPaths` runtime export — README'deki örnekler artık çalışır (önceden sadece tip türetimi vardı)
- Party identifications path map entries: `senderIdentification*`, `customerIdentification*`, `buyerCustomerIdentification*`, `taxRepresentativePartyAdditionalIdentifier*` (16 yeni entry)
- `InvoiceSession.unset(scope)` — composite alanları temizleme API'si (10 scope)

### Fixed
- `SessionPaths` runtime'da yoktu (Sprint 8h.1 export hatası)
- Party-level identifications array'leri SessionPathMap'ten eksikti
```

#### 8j.6 — Version Bump

`package.json`: `2.2.0` → `2.2.1`. Implementation log finalize.

---

## Disiplin

- **Mevcut 1694 test bozulmaz.** Tüm değişiklikler additive.
- **Mimari kararlar M1-M12, AR-1..AR-10 stabil.** Yeni karar yok.
- **Generator script regenerate edildiğinde diff dikkatli incelenir** (sırasız change yok, sadece ~16 yeni entry eklenmiş olmalı).
- **Sprint 8j ana backlog'tan farklı.** Önceki Sprint 8j (kdv-zero-clear-exemption, R5 izleme, vb.) backlog kalemler **bu sprintin kapsamı dışı** — bunlar v2.2.x veya v2.3.0'a ileride.
- **8j.0'da plan kopya:** Bu prompt `audit/sprint-08j-plan.md`'ye kopyalanır.

## Test Hedefi

1694 → ~1734 (+40):
- 8j.1: SessionPaths runtime export — 5 test
- 8j.2: 16 yeni path entry × ~1 test (set/get verify) = 15 test
- 8j.3: `unset()` × 10 scope × 2 test (set + clear) = 20 test

## Dur Sinyali

- 8j.1'de generator regenerate ettiğinde generated dosyada SessionPaths constant'ı emit edilmiyorsa
- 8j.2'de party identifications path türetimi mevcut pattern'le uyumsuzsa
- 8j.3'te `unset()` 162 examples-matrix regression'unda en az 1 senaryo bozarsa
- README örnekleri ile gerçek API arasında çelişki kalırsa

## Rapor Formatı

Sprint 8h/8i pattern'i:

Her commit:
```
Sprint 8j.N tamamlandı.
Commit: <hash>
Kapsam: <kısa>
Test: <önceki> → <yeni>
```

Sprint sonu:
- 6-8 commit özet
- Test 1694 → final
- v2.2.1 publish hazırlığı
- Mimsoft monorepo migration için **3 blocker çözüldü** sinyali

## v2.2.1 Publish

Sprint 8j sonu Berkay manuel publish edecek:
```bash
git tag v2.2.1
git push origin main && git push origin v2.2.1
npm publish
gh release create v2.2.1
```

Sonra Mimsoft monorepo'ya geri dön, M1+M2 sprint'leriyle migration başlasın.
