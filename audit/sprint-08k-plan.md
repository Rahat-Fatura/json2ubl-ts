# Sprint 8k — v2.2.3 Library Suggestions Patch

## Context

Mimsoft monorepo greenfield refactor (`audit/greenfield/`) için `json2ubl-ts` kütüphanesinde **4 öneri** tespit edildi (`99-library-suggestions.md`). 3'ü greenfield F1 başlamadan önce uygulanması gereken **prerekuizit** (`SimpleSgkType` export, identifications path narrow type, `UnsetScope` array composite'leri); 4.'sü (identifications splice API) prerekuizit değil ama F4'te ihtiyaç doğacak.

**Mevcut durum:** Sprint 8j ile v2.2.1 publish edildi → v2.2.2 (browser/Next.js Turbopack `deepEqual` fix) → şimdi **v2.2.3** patch'i bu 4 öneriyi kapsayacak. Greenfield refactor'a kütüphane tarafı blocker bırakmamak hedef.

**Niyet:** 4 öneriyi tek atomik patch'te uygula + Mimsoft repo'sundaki audit dosyasını "applied" olarak işaretle. Berkay yayınlar (`npm publish v2.2.3`), greenfield F0'a başlayabilir.

---

## Atomik Commit Planı (json2ubl-ts repo'su)

| Commit | Kapsam | Test Δ |
|---|---|---|
| 8k.0 | Plan kopya + log iskelet (`audit/sprint-08k-plan.md` + `audit/sprint-08k-implementation-log.md`) | 0 |
| 8k.1 | Öneri #1: `SimpleSgkType` export | +1 |
| 8k.2 | Öneri #2: identifications path narrow type (generator + regenerate) | +3 |
| 8k.3 | Öneri #3: `UnsetScope` → `despatchReferences` + `additionalDocuments` | +6 |
| 8k.4 | Öneri #4: `removeIdentification` + `setIdentifications` API | +12 |
| 8k.5 | README §Identifications splice + UnsetScope güncelleme | docs |
| 8k.6 | CHANGELOG v2.2.3 entry | docs |
| 8k.7 | `package.json` 2.2.2 → 2.2.3 + log finalize | docs |

**Cross-repo audit güncellemesi (Mimsoft repo):**
| 8k.8 | `99-library-suggestions.md` Status: pending → applied (4 öneri); `99-implementation-log.md`'ye kayıt | audit |

**Test hedefi:** 1724 → ~1746 (+22).

---

## Detay — Her Commit

### 8k.0 — Plan kopya + log iskelet

- `audit/sprint-08k-plan.md`'a bu plan kopyalanır (Sprint 8h/8i/8j pattern'i)
- `audit/sprint-08k-implementation-log.md` iskelet açılır (her commit özeti dolacak)
- **Commit mesajı format:** Sprint 8j ile aynı (Co-Authored-By trailer)

### 8k.1 — Öneri #1: `SimpleSgkType` export

**Dosya:** `src/calculator/index.ts` (mevcut import bloğu, line ~33)

**Değişiklik:**
```typescript
export type {
    SimpleInvoiceInput,
    SimplePartyInput,
    // ...
    SimpleSgkInput,
    SimpleSgkType,                  // ← eklenir
    SimpleOnlineSaleInput,
    // ...
} from "./simple-types";
```

**Test:** `__tests__/integration/exports.test.ts` (yeni dosya, +1):
```typescript
import type { SimpleSgkType } from '../../src';
const valid: SimpleSgkType = 'SAGLIK_ECZ';
expect(valid).toBe('SAGLIK_ECZ');
```

### 8k.2 — Öneri #2: Identifications path narrow type

**Dosya:** `scripts/generate-session-paths.ts` `renderEntry()` (line ~367)

**Mevcut:**
```typescript
const value = entry.fnParams.length === 0
  ? `'${entry.pathTemplate}'`
  : `(${entry.fnParams.map(p => `${p}: number`).join(', ')}) => \`${entry.pathTemplate.replace(/\[i\]/g, '[${i}]').replace(/\[ti\]/g, '[${ti}]')}\``;
```

**Önerilen:** Fonksiyon path return değerine `as keyof SessionPathMap` narrow cast ekle. Tüm fonksiyon path'leri için defensive uygulanır (sadece identifications değil — tutarlılık).

```typescript
const fnBody = `\`${entry.pathTemplate.replace(/\[i\]/g, '[${i}]').replace(/\[ti\]/g, '[${ti}]')}\``;
const mapKey = entry.pathTemplate.replace(/\[i\]/g, '[${number}]').replace(/\[ti\]/g, '[${ti}]'.replace('ti', 'number'));
const value = entry.fnParams.length === 0
  ? `'${entry.pathTemplate}'`
  : `(${entry.fnParams.map(p => `${p}: number`).join(', ')}) => ${fnBody} as '${mapKey}'`;
```

→ `senderIdentificationSchemeId(0)` artık `'sender.identifications[${number}].schemeId'` literal tipinde döner, cast'siz `update()` generic'ine assign edilebilir.

**Regenerate:** `npm run generate:paths`

**Test:** `__tests__/calculator/session-paths-narrow-type.test.ts` (yeni, +3):
```typescript
import { SessionPaths, type SessionPathMap } from '../../src';

it('identifications path narrow assignable to keyof SessionPathMap', () => {
  const path = SessionPaths.senderIdentificationSchemeId(0);
  const _check: keyof SessionPathMap = path;  // compile-time
  expect(path).toBe('sender.identifications[0].schemeId');
});

it('lineKdvPercent narrow assignable', () => {
  const path = SessionPaths.lineKdvPercent(0);
  const _check: keyof SessionPathMap = path;
  expect(path).toBe('lines[0].kdvPercent');
});

it('double-indexed lineTaxCode narrow assignable', () => {
  const path = SessionPaths.lineTaxCode(0, 1);
  const _check: keyof SessionPathMap = path;
  expect(path).toBe('lines[0].taxes[1].code');
});
```

**Generator regression test güncellemesi:** `__tests__/scripts/generate-session-paths.test.ts` template'leri yeni `as 'literal'` cast satırını eklemeli (regex güncellemesi).

### 8k.3 — Öneri #3: `UnsetScope` array composite'leri

**Dosya:** `src/calculator/invoice-session.ts` (UnsetScope union, line ~207)

**Değişiklik:**
```typescript
export type UnsetScope =
  | 'billingReference' | 'paymentMeans' | 'ozelMatrah' | 'sgk'
  | 'invoicePeriod' | 'buyerCustomer' | 'taxRepresentativeParty'
  | 'eArchiveInfo' | 'onlineSale' | 'orderReference' | 'liability'
  | 'despatchReferences'                                         // ← eklenir
  | 'additionalDocuments';                                       // ← eklenir
```

**Implementation değişikliği YOK** — mevcut `unset()` (line 782) generic `delete (next as Record<string, unknown>)[scope];` pattern kullanıyor; array composite'ler için ek case gerekmez.

**Test:** `__tests__/calculator/invoice-session-unset.test.ts`'e 6 yeni test ekle:

```typescript
it('despatchReferences scope: set → unset clears array', () => {
  const session = makeFilledSession();
  session.update('despatchReferences[0].id', 'IRS-001');
  session.update('despatchReferences[0].issueDate', '2026-04-28');
  expect(session.input.despatchReferences).toHaveLength(1);
  session.unset('despatchReferences');
  expect(session.input.despatchReferences).toBeUndefined();
});

it('despatchReferences: idempotent — second unset emits no event', () => { ... });
it('despatchReferences: remount via update[0] after unset (D-6)', () => { ... });
it('additionalDocuments scope: set → unset', () => { ... });
it('additionalDocuments: idempotent', () => { ... });
it('additionalDocuments: remount via update[0]', () => { ... });
```

### 8k.4 — Öneri #4: `removeIdentification` + `setIdentifications` API

**Dosya:** `src/calculator/invoice-session.ts` — yeni method'lar (`unset` sonrası, "Hesaplama" bölümünden önce)

**Tip:**
```typescript
export type IdentificationParty = 'sender' | 'customer' | 'buyerCustomer';
```

**API:**
```typescript
/**
 * Identifications array'inde belirli index'i siler. Array boşalırsa undefined.
 * field-changed event emit eder.
 */
removeIdentification(party: IdentificationParty, index: number): void {
  const arr = this._input[party]?.identifications;
  if (!arr || index < 0 || index >= arr.length) return;
  const next = arr.length === 1 ? undefined : arr.filter((_, i) => i !== index);
  this._setIdentificationsInternal(party, next);
}

/**
 * Identifications array'ini tamamen değiştirir. undefined veya empty → field silinir.
 */
setIdentifications(party: IdentificationParty, identifications: SimplePartyIdentification[] | undefined): void {
  const next = (!identifications || identifications.length === 0) ? undefined : identifications;
  this._setIdentificationsInternal(party, next);
}

private _setIdentificationsInternal(
  party: IdentificationParty,
  next: SimplePartyIdentification[] | undefined,
): void {
  const partyObj = this._input[party];
  if (!partyObj && next === undefined) return;          // no-op
  if (!partyObj) return;                                 // no party → no-op (buyerCustomer mount için update kullanılır)
  
  const previousValue = partyObj.identifications;
  if (deepEqual(previousValue, next)) return;            // diff no-op
  
  const updatedParty = { ...partyObj };
  if (next === undefined) {
    delete (updatedParty as Record<string, unknown>).identifications;
  } else {
    updatedParty.identifications = next;
  }
  this._input = { ...this._input, [party]: updatedParty };
  
  this.emit('field-changed', {
    path: `${party}.identifications`,
    value: next,
    previousValue,
  });
  this.updateUIState();
  this.onChanged();
}
```

**Tip uyumsuzluğu çözümü:** `SimpleBuyerCustomerInput.identifications: Array<{ schemeId; value }>` ile `SimplePartyIdentification[]` **structural assignable** (her iki yön). API parametresi `SimplePartyIdentification[]` kabul eder; internal atama TypeScript tarafından inline literal alana sorunsuz yapılır.

**Test:** `__tests__/calculator/invoice-session-identifications.test.ts` (yeni, +12):
- `removeIdentification('sender', 0)` ortadaki splice
- `removeIdentification('customer', son)` sonu sil
- `removeIdentification('sender', 0)` array tek elemanlı → undefined
- `removeIdentification('sender', 99)` out of bounds → no-op
- `removeIdentification('buyerCustomer', 0)` inline literal type compat
- `setIdentifications('sender', [...])` tam replace
- `setIdentifications('sender', [])` → undefined
- `setIdentifications('sender', undefined)` → undefined
- `setIdentifications` field-changed event payload doğrulama
- `setIdentifications` deepEqual no-op (aynı array)
- buyerCustomer mount edilmemiş → no-op
- 162 examples-matrix regression (mevcut testler korunur)

### 8k.5 — README §Migration v2.2.2 → v2.2.3 + örnekler

**Dosya:** `README.md`

- §2 InvoiceSession'a `removeIdentification` / `setIdentifications` örneği:
  ```typescript
  session.setIdentifications('sender', [
    { schemeId: 'MERSISNO', value: '0123456789012345' },
    { schemeId: 'KUNYENO', value: 'K-001' },
  ]);
  session.removeIdentification('customer', 0);
  ```
- §UnsetScope tablosuna `despatchReferences` + `additionalDocuments` eklenir
- §Imports kısmına `SimpleSgkType` örneği

### 8k.6 — CHANGELOG v2.2.3

**Dosya:** `CHANGELOG.md` (en üst — v2.2.2'nin üstüne)

```markdown
## [2.2.3] — 2026-04-28

**Library Suggestions Patch (greenfield prerekuizitleri).** Mimsoft monorepo greenfield refactor öncesi 4 öneri uygulandı.

### Added
- `SimpleSgkType` literal union public re-export'u (`src/calculator/index.ts`)
- `removeIdentification(party, index)` API — sender/customer/buyerCustomer identifications array splice
- `setIdentifications(party, ids)` API — tam replace; undefined/empty → array silinir
- `IdentificationParty` tip union public export

### Changed
- `UnsetScope` literal union'a `'despatchReferences'` + `'additionalDocuments'` eklendi (array composite reset)
- Generator script (`scripts/generate-session-paths.ts`) fonksiyon path return değerlerine narrow `as 'literal'` cast eklendi → `SessionPaths.senderIdentificationSchemeId(0)` artık cast'siz `update()` generic'ine assign edilebilir (compile-time tip güvenliği)

### Test
- 1724 → ~1746 (+22)
- Greenfield refactor için 4 prerekuizit blocker çözüldü
```

### 8k.7 — Version bump + log finalize

- `package.json`: `2.2.2` → `2.2.3`
- `audit/sprint-08k-implementation-log.md` finalize (durum: KAPATILDI, v2.2.3 publish hazır)

### 8k.8 — Cross-repo audit güncellemesi (Mimsoft repo)

**Dosya:** `/Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/audit/greenfield/99-library-suggestions.md`

Her 4 öneri için:
- `Status:` `pending` → `applied`
- `Güncel durum` checkbox'larından **uygun olanlar** işaretlenir:
  - [x] Berkay başka session'da library'i güncelledi (Sprint 8k)
  - [x] Yeni sürüm yayınlandı (v2.2.3) — *Berkay manuel `npm publish` sonrası işaretlenecek*
  - [ ] Mimsoft `yarn upgrade json2ubl-ts@2.2.3` yaptı — *Berkay yapacak*
  - [ ] Refactor'da öneri uygulandı — *Greenfield F0+ sırasında*
- "Refactor'da öneri uygulandı (geri dönülen commit hash: ...)" kısmına 8k.X commit hash referansları eklenir
- `Özet tablo` Status sütunları `applied` olarak güncellenir

**Ek dosya:** `audit/greenfield/99-implementation-log.md` (varsa) decision log'a:
> "v2.2.3 prerekuizit uygulandı (Sprint 8k, json2ubl-ts repo: 8k.0..8k.7 + cross-repo audit update 8k.8). 4 öneri applied. Greenfield F0 başlatılabilir."

**Mimsoft repo'da git commit Berkay'ın yetkisiyle:** Sadece dosya güncellemesi yapılır; `git add` + `git commit` Berkay'ın onayıyla.

---

## Kritik Dosya Referansları

### json2ubl-ts repo (kütüphane değişiklikleri)
- `src/calculator/simple-types.ts` (`SimpleSgkType` line 280-287, mevcut export — sadece re-export listesine eklenir)
- `src/calculator/index.ts` (re-export bloğu line ~33)
- `src/calculator/invoice-session.ts`:
  - `UnsetScope` union (line ~207-218) — 2 entry eklenir
  - `unset()` (line ~782) — değişiklik YOK (generic delete pattern)
  - **YENİ method'lar**: `removeIdentification`, `setIdentifications`, private `_setIdentificationsInternal` — `unset()` sonrası, "Hesaplama" başlığı öncesi
- `scripts/generate-session-paths.ts` `renderEntry()` (line ~367-377) — fonksiyon path return narrow cast
- `src/calculator/session-paths.generated.ts` — regenerate (manuel düzenleme yasak)
- `__tests__/scripts/generate-session-paths.test.ts` — narrow cast regex güncellemesi
- `README.md`, `CHANGELOG.md`, `package.json`

### sisteminiz-integrator-infrastructure repo (audit dosyası)
- `audit/greenfield/99-library-suggestions.md` (Status updates + commit hash refs)
- `audit/greenfield/99-implementation-log.md` (decision log entry)

---

## Mevcut Pattern'lerle Uyumluluk

- **Generator regenerate disiplini:** `npm run generate:paths` çıktısı manual düzenleme yasaktır — `verify:paths` script'i CI'de drift kontrolü yapar (Sprint 8j.2'de aynı disiplin uygulandı).
- **`unset()` `delete` pattern:** Sprint 8j.3'te (`session.unset('billingReference')`) tüm composite'ler için generic uygulandı; UnsetScope genişletildiğinde implementation kodu değişmez.
- **`addLine`/`updateLine`/`removeLine` event simetrisi:** `removeIdentification`/`setIdentifications` `field-changed` event emit + `updateUIState` + `onChanged` zinciri aynı flow'u izler.
- **Tip uyumsuzluğu (`SimpleBuyerCustomerInput.identifications` inline literal):** Structural assignable (her iki yönlü) — API parametresi `SimplePartyIdentification[]` kabul eder, internal atama otomatik. Fakat planlamada `simple-types.ts` line 350'deki inline literal'ı `SimplePartyIdentification[]`'a refactor etme **kapsam dışı** (breaking change riski; v3.0.0'a ertelenir).

---

## Verification (Sprint Sonu)

1. **Typecheck temiz:** `bun run typecheck` → sıfır hata.
2. **Test suite yeşil:** `bun run test` → 1746/1746 (+22).
3. **Build başarılı:** `bun run build` → `dist/index.d.ts`'te:
   - `type SimpleSgkType` named export edilmiş
   - `UnsetScope` union'da `'despatchReferences' | 'additionalDocuments'` görünüyor
   - `removeIdentification` + `setIdentifications` method imzaları
   - Fonksiyon path return type'ları narrow literal (`as 'sender.identifications[${number}].schemeId'` vs.)
4. **Generator drift kontrolü:** `npm run verify:paths` → "SessionPaths up to date".
5. **Cross-repo:** Mimsoft `audit/greenfield/99-library-suggestions.md`'da 4 öneri için `Status: applied` ve commit hash'ler.
6. **162 examples-matrix regression:** Hiçbir senaryo bozulmadı (additive değişiklikler).

---

## Audit Dosyası Güncelleme Akışı (her commit sonrası)

Implementation süreci boyunca `99-library-suggestions.md` dosyasının **paralel olarak** doldurulması:

| Sprint commit | Mimsoft audit dosyası güncellemesi |
|---|---|
| 8k.1 (`SimpleSgkType` export commit) | Öneri #1 → 8k.8'de `applied` + commit hash + tarih |
| 8k.2 (path narrow type) | Öneri #2 → 8k.8'de `applied` + commit hash |
| 8k.3 (UnsetScope genişletme) | Öneri #3 → 8k.8'de `applied` + commit hash |
| 8k.4 (identifications splice) | Öneri #4 → 8k.8'de `applied` + commit hash |

**Pratik uygulama:** 8k.0 → 8k.7 sırasında her commit json2ubl-ts repo'sunda yapılır. 8k.8'de **Mimsoft repo'sundaki audit dosyası** tek seferde güncellenir (4 öneri için Status + commit hash + checkbox toplu yazılır). Bu cross-repo iş Berkay'ın `npm publish` ve `yarn upgrade` adımlarından sonra ek bir geçiş yapacak — ama dosya güncellemesi sprint sonunda (publish öncesi) yapılır, "Yeni sürüm yayınlandı" checkbox'ı Berkay manuel publish sonrası işaretlenir.

---

## Risk ve Dur Sinyali

- **Generator regenerate diff incelemesi:** 8k.2'de fonksiyon path'leri `as '...'` cast'iyle değişir — diff'te sadece bu değişiklik olmalı. Anormal entry değişikliği varsa **dur** ve plan'a dön.
- **Tip uyumsuzluğu (Öneri #4):** `setIdentifications` parametre tipi structural compat üzerinden çalışmazsa, fallback olarak parametre tipi `Array<{ schemeId: string; value: string }>` (genel inline form) yapılabilir.
- **162 examples-matrix regression:** En az 1 senaryo bozulursa **dur** — atomic commit tek tek geri alınır, sebep bulunur.
- **Berkay'ın `npm publish` adımı manuel:** Plan tamamlanır, fakat Mimsoft "Yeni sürüm yayınlandı" checkbox'ını Berkay publish sonrası işaretler.
