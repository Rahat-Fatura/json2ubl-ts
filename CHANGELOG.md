# CHANGELOG

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) 1.1.0, sürümleme [SemVer](https://semver.org/lang/tr/).

## [2.2.2] — 2026-04-28

**Browser/Next.js uyumluluğu — `deepEqual` browser-safe inline.** Mimsoft Next.js Turbopack ortamında v2.2.1'in `InvoiceSession.update()` her path çağrısında runtime hata atması düzeltildi.

### Fixed

- **`deepEqual` browser-safe inline implementation** (`src/calculator/session-path-utils.ts`). v2.2.1 `import { isDeepStrictEqual } from 'node:util'` kullanıyordu; Next.js Turbopack `next/dist/compiled/util/util.js` polyfill'inde `isDeepStrictEqual` export edilmemesi nedeniyle browser'da `TypeError: ... is not a function` atıyordu. Hata `InvoiceSession.update(path, value)` her diff-detection çağrısında tetikleniyordu, dolayısıyla form ilk render'da crash ediyordu. Şimdi `Object.is` + structural compare ile inline yazıldı; Node ve browser ortamlarında deterministik çalışır. Davranış uyumu korundu: NaN === NaN (Object.is), +0 ≠ -0, plain object / array structural eşitlik. Date/RegExp/Map/Set kapsam dışı (Mimsoft input modelinde yok).

### Migration Guide (v2.2.1 → v2.2.2)

API değişikliği yok, sadece bug fix. Mimsoft ve diğer browser tüketicileri için `yarn upgrade json2ubl-ts@2.2.2` yeterli; herhangi bir kod değişikliği gerekmez.

---

## [2.2.1] — 2026-04-28

**Migration Hotfix.** Mimsoft monorepo migration (v1.4.2 → v2.2.0) için 3 kritik blocker fix'i. Tüm değişiklikler additive, breaking change yok. Sprint 8j (7 atomik commit, 1694→1724 test, +30).

### Added

- **`SessionPaths` runtime export** (Bulgu 1): generated dosyada (`src/calculator/session-paths.generated.ts`) `SessionPaths` constant mevcuttu fakat ana paket entry'sinden re-export edilmiyordu. README'deki `import { SessionPaths } from '@rahat-fatura/json2ubl-ts'` örnekleri artık runtime'da çalışır. `SessionPathMap` tipi de re-export edildi.
- **Party identifications path entries** (Bulgu 2 — 6 yeni entry):
  - `senderIdentificationSchemeId(i)` / `senderIdentificationValue(i)` — `sender.identifications[i].schemeId/value`
  - `customerIdentificationSchemeId(i)` / `customerIdentificationValue(i)` — `customer.identifications[i].schemeId/value`
  - `buyerCustomerIdentificationSchemeId(i)` / `buyerCustomerIdentificationValue(i)` — `buyerCustomer.identifications[i].schemeId/value`
  - Mimsoft kritik senaryolar: IDIS profili → SEVKIYATNO, KAMU profili → MUSTERINO (B-83), HKS profili → KUNYENO, çoklu schemeId (yolcu profilleri).
  - **NOT:** Plan'da `taxRepresentativeParty.additionalIdentifiers` belirtilmişti fakat `SimpleTaxRepresentativeInput` tip kontratında bu alan yok (sadece `vknTckn`/`label`/`name`) — kapsamdan çıkarıldı.
- **`InvoiceSession.unset(scope)`** (Bulgu 3): v1.x'in `setBillingReference(undefined)` semantiğinin path-based API karşılığı. `update('billingReference.id', undefined)` tip uyumsuz, empty string ise XML'de boş alan üretir; `unset(scope)` composite'i tamamen kaldırır.
  - **`UnsetScope`** union tipi: `'billingReference' | 'paymentMeans' | 'ozelMatrah' | 'sgk' | 'invoicePeriod' | 'buyerCustomer' | 'taxRepresentativeParty' | 'eArchiveInfo' | 'onlineSale' | 'orderReference' | 'liability'`.
  - Davranış: önceki value undefined ise no-op (idempotent); composite scope `_input[scope]` delete + `field-changed` event; liability scope `_liability = undefined` + `field-changed` + `liability-changed` event; `isExport=true` + scope==='liability' → `path-error` LIABILITY_LOCKED_BY_EXPORT (M10 simetrisi).
  - `updateUIState()` + `onChanged()` tetiklenir.
  - Sub-field path ile remount: D-6 sub-object create devam eder — `unset` sonrası `update('billingReference.id', 'X')` composite'i yeniden oluşturur.

### Changed

- **`InvoiceSession.update()` index bound check** (Sprint 8j.2): party identifications çoklu append için kritik.
  - Parent array `undefined` + `index===0` → kabul (D-6 sub-object create ile boş array oluşturulur).
  - `index === current.length` artık kabul (next-append, yeni element).
  - `index > current.length` reddedilir (sparse skip korunur).
  - Mevcut bound check testleri korunuyor (`lines[5]` length=0, `taxes[1]` undefined hâlâ INDEX_OUT_OF_BOUNDS).
- **Generator script** (`scripts/generate-session-paths.ts`): inline literal array desteği — `Array<{...}>` ve `{...}[]` form'ları AST'den parse edip synthetic interface'e indirger; `addSubObjectEntries` sub-object array dalı eklendi.

### Fixed

- `SessionPaths` runtime'da yoktu (Sprint 8h.1 export hatası).
- Party-level identifications array'leri SessionPathMap'ten eksikti.

### Test

- 1694 → 1724 (+30):
  - SessionPaths public export (8j.1): +6 test (`__tests__/integration/session-paths-export.test.ts`)
  - Party identifications (8j.2): +7 test (`__tests__/calculator/session-paths-party-identifications.test.ts`) + 1 generator regression test güncellemesi
  - `unset(scope)` (8j.3): +16 test (`__tests__/calculator/invoice-session-unset.test.ts`)
- 162 examples-matrix regression: hiçbir senaryo bozulmadı (tüm değişiklikler additive).

### Migration v2.2.0 → v2.2.1

Geri uyumlu — `npm install @rahat-fatura/json2ubl-ts@2.2.1` ile yeterli.

```typescript
// v2.2.0'da çalışmıyordu, v2.2.1'de çalışır:
import { SessionPaths, InvoiceSession } from '@rahat-fatura/json2ubl-ts';

const session = new InvoiceSession();
session.update(SessionPaths.senderIdentificationSchemeId(0), 'MERSISNO');
session.unset('billingReference');
```

## [2.2.0] — 2026-04-27

**SuggestionEngine (AR-10 Faz 2).** Reactive InvoiceSession Faz 2: validator-error'lardan ayrı **advisory** kanal — "bu varsayılanı seçmek istemez misin?" tarzı UI önerileri. 23 kural, batch event payload, primary key bazlı diff. Sprint 8i (15 atomik commit, 1407→1694 test, +287). Faz 1 + Faz 2 birlikte tek release.

### Added

- **`Suggestion` tip** + **`SuggestionRule` interface** (T-6 deklaratif): `path`, `value`, `reason`, `severity` (recommended|optional), `ruleId` (namespace `{domain}/{slug}`), opsiyonel `displayLabel`/`displayValue`.
- **`runSuggestionEngine(input, ui)`** (`src/calculator/suggestion-engine.ts`): pure function, full liste döner (T-2, T-7).
- **`diffSuggestions(prev, next)`** primary key bazlı diff (T-2): `${ruleId}::${path}` key, value/reason/severity değişimi changed tetikler. Object reference karşılaştırma yapılmaz (R3 mitigation).
- **`suggestion` event** (T-3 batch payload): `Suggestion[]` — yeni veya değişmiş öneriler. Boş diff (added=0 && changed=0) → emit YOK. `removed` array hesaplanır ama emit edilmez (T-4 — `suggestionResolved` event yok, sonraki tick'te yokluğu UI fark eder).
- **`InvoiceSession._lastSuggestions`** private field — diff state. Engine pure, session diff stateful (T-2 ile uyumlu).
- **`InvoiceSession._runSuggestionPipeline()`** — `validate()` sonunda otomatik çağrılır. Event sıralaması §4.2: 16. `warnings` → 17. engine → 18. diff → 19. `suggestion`.
- **23 suggestion kuralı** domain bazlı (T-6, `src/calculator/suggestion-rules/`):
  - **KDV (7):** `kdv/zero-suggest-351`, `kdv/ytb-istisna-suggest-308`, `kdv/ytb-istisna-suggest-339`, `kdv/exemption-mismatch-tax-type`, `kdv/manual-exemption-suggest-line-distribution`, `kdv/reduced-rate-suggest-1`, `kdv/reduced-rate-suggest-8-10`
  - **Tevkifat (5):** `withholding/tevkifat-default-codes`, `withholding/650-percent-required`, `withholding/profile-tevkifat-suggests-ticarifatura`, `withholding/exemption-conflict`, `withholding/ytb-tevkifat-itemclass-required`
  - **IHRACKAYITLI (3):** `ihrackayitli/702-default-suggestion`, `ihrackayitli/702-gtip-required`, `ihrackayitli/702-alicidib-required`
  - **YATIRIMTESVIK (4):** `yatirim-tesvik/itemclass-default`, `yatirim-tesvik/makine-traceid-required`, `yatirim-tesvik/makine-serialid-required`, `yatirim-tesvik/insaat-suggest-itemclass-02` (heuristic, R5 izleme)
  - **Delivery (3):** `delivery/ihracat-incoterms-required`, `delivery/gtip-format-12-digit`, `delivery/transport-mode-suggest-ihracat`
  - **Misc (2):** `currency/exchange-rate-required`, `paymentmeans/iban-format-tr`
- **Suggestion ↔ Validator dikhotomi paralel kontratı** (master plan §3.3): aynı path için iki kanal paralel emit edilebilir; UI iki mesajı yan yana sunar (kırmızı hata + mavi öneri). Test enforcement: `__tests__/calculator/invoice-session-dichotomy.test.ts`.
- **Performance benchmark** (R2 mitigation): suggestion engine ≤5ms (gerçek 0.010-0.027ms — 500x altı), toplam pipeline ≤15ms (gerçek 0.137ms — 100x altı). `__tests__/benchmarks/suggestion-engine.bench.test.ts`.
- **Examples session parity regression**: 34 invoice senaryo (`__tests__/examples/session-parity.test.ts`) + 116 invoice examples-matrix (`__tests__/examples-matrix/full-session-parity.test.ts`) = **150 senaryo regression**. İrsaliye senaryoları skip (DespatchBuilder, kapsam dışı).
- **README §2.X**: SuggestionEngine API rehberi (Faz 2, v2.2.0+).

### Changed

- **`InvoiceSession.buildXml()`** `allowReducedKdvRate` opt-in **artık builder'a geçiriliyor** (Sprint 8h hijyen fix — 30-feature-555 senaryosu yakaladı).
- **`SessionEvents` interface**: `suggestion: Suggestion[]` event tipi eklendi.
- **Event sıralaması**: 19 event'ten 20 event'e (suggestion son adım, sıralama §4.2 kilitli).

### Sapmalar (Plan'a Göre)

Plan §3'de 25 kural önerilmişti, **23 kural net**:
1. **Kural 4 ertelendi** (`kdv/zero-clear-exemption-on-rate-change`): transition state gerektiriyor (engine pure prensibi — T-2 ile çakışıyor). Sprint 8j'ye ertelendi (R6).
2. **`paymentmeans/payment-means-code-default` ATLANDI**: `SimplePaymentMeansInput.meansCode` required (boş olamaz, kural tetiklenmez).
3. **S-6 path sequence converter Sprint 8j'ye ertelendi**: Sprint 8h.9'daki `buildSessionFromInput` `initialInput` pattern'i zaten XML output regression değerini sağlıyor. Path sequence formatı (50+ ardışık update) **incremental flow** test eder; bu Sprint 8j'ye ertelendi.

### Migration Guide (v2.1.0 → v2.2.0)

Faz 2 **fully backward compatible** — mevcut kod değişmeden çalışır. Sadece yeni `suggestion` event listener eklenir:

```typescript
// v2.2.0: yeni suggestion event listener
import { InvoiceSession } from 'json2ubl-ts';
import type { Suggestion } from 'json2ubl-ts/calculator/suggestion-types';

const session = new InvoiceSession({ /* ... */ });

session.on('suggestion', (suggestions: Suggestion[]) => {
  for (const s of suggestions) {
    showAdvisoryHint({
      path: s.path,            // 'lines[0].kdvExemptionCode'
      value: s.value,          // '351'
      reason: s.reason,        // Türkçe tooltip
      severity: s.severity,    // 'recommended' | 'optional'
    });
  }
});

// User accepts → session.update kullanılır
session.update(suggestion.path as any, suggestion.value);
```

Detay: `README.md` §2.X, `audit/sprint-08i-tasarim.md`.

---

## [2.1.0] — 2026-04-27

**Reactive InvoiceSession (AR-10) — Faz 1 / Çekirdek.** Mimsoft Next.js entegrasyonu için path-based update API + field-level events + line-level FieldVisibility + validator pipeline + B-78 köprü. Sprint 8h (14 atomik commit).

### BREAKING CHANGES

- **18 setter kaldırıldı.** Tek mutate gateway: `update(path, value)`.
  - Kaldırılanlar: `setSender`, `setCustomer`, `setBuyerCustomer`, `setType`, `setProfile`, `setLiability`, `setCurrency`, `setBillingReference`, `setPaymentMeans`, `setKdvExemptionCode`, `setOzelMatrah`, `setSgkInfo`, `setInvoicePeriod`, `setNotes`, `setId`, `setDatetime`, `setInput`, `patchInput`.
  - Korunan: `addLine`, `updateLine`, `removeLine`, `setLines` (array operations path-based değil).
  - Migration örneği: `setType('TEVKIFAT')` → `update(SessionPaths.type, 'TEVKIFAT')`.
- **`error` event semantik daraltıldı.** Sadece runtime exception için (calculate throw). Path-related rejection (`READ_ONLY_PATH`, `PROFILE_LIABILITY_MISMATCH` vb.) yeni `path-error` event'inde. (D-Seçenek B)
- **`update('isExport', x)`** read-only — `path-error` (`READ_ONLY_PATH`) emit + no-op. `isExport` constructor-only readonly. (D-10, M10)
- **`update('liability', x)`** isExport=true session'da → `path-error` (`LIABILITY_LOCKED_BY_EXPORT`). (M10 kontratı, mevcut setLiability no-op davranışı korunur — D-9)
- **D-12 type force**: isExport=true session'da `update('type', 'SATIS')` → `field-changed` payload `{ value: 'ISTISNA', requestedValue: 'SATIS', forcedReason: 'isExport=true' }`.

### Added

- **`SessionPaths` path map** (AR-10): `simple-types.ts` AST tarayan otomatik generator (`scripts/generate-session-paths.ts`, TS Compiler API). 117 path entry, JSDoc'lu, `SessionPathMap` generic tip. `npm run verify:paths` CI drift check (D-1).
- **`update<P extends keyof SessionPathMap>(path, value)`** generic API (D-8): compile-time tip kontrolü + IDE autocomplete.
- **4 katman path validation + constraint check** (S-2): INVALID_PATH / READ_ONLY_PATH / UNKNOWN_PATH / INDEX_OUT_OF_BOUNDS / PROFILE_EXPORT_MISMATCH / PROFILE_LIABILITY_MISMATCH / LIABILITY_LOCKED_BY_EXPORT. Tüm reddedilenler `path-error` event'i + no-op.
- **In-house bracket notation parser** (`session-path-utils.ts`, D-1): `lines[0].taxes[1].code` → token sequence. ts-morph / lodash dependency YOK.
- **Field-level events**: `field-changed`, `field-activated`, `field-deactivated`, `line-field-changed`. 18 adımlı sıralama (§3.1) test ile enforce. (D-4)
- **D-12 forcedReason payload**: `field-changed.requestedValue` + `field-changed.forcedReason` (auto-force durumunda).
- **`LineFieldVisibility`** (10 alan, AR-10): line-level UI kontrolü. `_uiState.lineFields[]` array senkron.
- **`deriveTypeProfileFlags()` helper** (`line-field-visibility.ts`): doc-level + line-level paylaşılır → kural duplikasyonu yok.
- **B-78 parametre köprüsü** (`deriveB78Params()`): 7 B-78 paraleli kural parametresi otomatik türetilir (önceden session pipeline'ında pasifti).
- **Validator pipeline entegrasyonu** (D-3): 5 validator (`validateSimpleLineRanges`, `validateManualExemption`, `validatePhantomKdv`, `validateSgkInput`, `validateCrossMatrix`) deterministic. `_invoiceInputCache` reference equality.
- **`ValidationError` ↔ `ValidationWarning` köprü**: `ValidationWarning.code?: string` eklendi.
- **`validation-error` event**: raw `ValidationError[]` stream.
- **`InvoiceSessionOptions.allowReducedKdvRate`** opt-in (M4 / B-78.1).
- **Performance benchmark** (D-7 ZORUNLU): 100-line update avg 0.16ms / threshold 15ms. MR-1 efektif yok hükmünde. Detay: `audit/sprint-08h-benchmark.md`.

### Changed

- **`InvoiceSession` constructor**: yeni `allowReducedKdvRate` option; `isExport` artık readonly private field.
- **`updateUIState()` her başarılı update sonrası emit** (8h.8): mevcut dar kapsam tüm path'lere genişletildi.
- **`toInvoiceInput()` cache'li** (D-3): reference equality, sıfır maliyetli hit.
- **`ValidationWarning` interface**: `code?: string` eklendi.
- **README §2** v2.1.0 / AR-10 rewrite (path-based update + 3 event hierarchy + LineFieldVisibility + Liability/isExport + React hook).

### Fixed

- **S-5**: `setId`/`setDatetime` `onChanged` çağırmama tutarsızlığı. 8h.3'te eski setter'lar kaldırıldığı için doğal olarak çözüldü; `update(SessionPaths.id, x)` artık `validate()` tetikler.

### Removed

- 18 doc-level setter (yukarıda BREAKING CHANGES'da listelendi).

### Migration Guide (v2.0.0 → v2.1.0)

```typescript
// Önce (v2.0.0)
session.setSender({ taxNumber: '...', name: '...' });
session.setType('TEVKIFAT');
session.setLiability('earchive');
session.on('error', (e: Error) => log(e.message));

// Sonra (v2.1.0)
import { SessionPaths } from 'json2ubl-ts';
session.update(SessionPaths.senderTaxNumber, '...');
session.update(SessionPaths.senderName, '...');
session.update(SessionPaths.type, 'TEVKIFAT');
session.update(SessionPaths.liability, 'earchive');
session.on('error', (e: Error) => log('runtime:', e.message));
session.on('path-error', ({ code, path, reason }) => log('reddi:', code, path, reason));
```

Detay: `README.md` §2, `audit/sprint-08h-plan.md`.

---

## [2.0.0] — 2026-04-23

**İlk feature-complete public sürüm.** `1.4.2`'den `2.0.0`'a atlamanın sebebi: çok sayıda breaking change, validator suite revizyonu, mimari kararlar (M1-M10, AR-1..AR-8). Konsolidasyon: Sprint 1-8b implementation log'ları.

### BREAKING CHANGES

- **PROFILE_TYPE_MATRIX sıkılaştırıldı** (Sprint 1): `map`/`matrix` export kaldırıldı; `getAllowedTypes()` helper API. `as any` atlatma yolları kapatıldı. (M1, AR-3/4)
- **IHRACAT/YOLCU/OZELFATURA profilleri yalnızca ISTISNA tipi** kabul eder. Diğer tiplerde `PROFILE_FORBIDDEN_TYPE` hatası. (M2)
- **TAX_EXEMPTION_MATRIX zorunluluğu** (Sprint 5): İstisna kodu × fatura tipi whitelist/forbidden kombinasyonları runtime'da uygulanır. 351 artık ISTISNA grubu değil, SATIS/TEVKIFAT vb. için `requiresZeroKdvLine` ile geçerli. (M5)
- **650 dinamik stopaj** (Sprint 2): `SimpleLineInput.withholdingTaxPercent` zorunlu (0-100). (M3, B-95)
- **555 Demirbaş KDV** `BuilderOptions.allowReducedKdvRate: true` opt-in flag ister. Default false → `REDUCED_KDV_RATE_NOT_ALLOWED`. (M4, B-96)
- **IHRACKAYITLI+702** satır seviyesi **GTİP (12 hane)** + **AlıcıDİBKod** zorunlu. (B-07)
- **YATIRIMTESVIK**: `ytbNo` (6 hane) + Kod 01 Makine için `productTraceId+serialId+brand+model` zorunlu; IADE grubunda muaf. (B-08)
- **KAMU profili** `buyerCustomer` + `paymentMeans` + TR IBAN zorunlu; `additionalIdentifiers` (MUSTERINO vb.). (B-83)
- **CustomizationID** Fatura için `TR1.2`, e-İrsaliye için `TR1.2.1` sabitleri. Eski sürümlerde her ikisi de `TR1.2.1` idi. (M8)
- **Calculator tam float**; yuvarlama yalnızca XML yazım anında XSD-yuvarlamalı alanlarda. Ara hesaplarda hassasiyet kaybı yok. (M9)
- **`setLiability()` `isExport=true` iken no-op** (error yerine). (M10)
- **`cbcTag` utility silindi**, `cbcRequiredTag` + `cbcOptionalTag` split. (AR-1)
- **`driverPerson` → `driverPersons[]` array** — çoklu sürücü ve taşıyıcı kombinasyonu. (AR-2)
- **Satır-seviyesi `kdvExemptionCode` kaldırıldı**, belge seviyesi tek kaynak. (AR-7)
- **Outstanding/Oversupply input alanları kaldırıldı**. (AR-8)

### Added

- Basitleştirilmiş giriş API: **`SimpleInvoiceBuilder`** (JSON-benzeri girdi → UBL-TR XML). Hesaplamayı kütüphane yapar (Sprint 1-2).
- **`InvoiceSession`** reaktif API + `FieldVisibility` (frontend entegrasyon için, Sprint 2).
- **`ConfigManager`** dinamik config (unit, currency, tax, withholding, exemption — Sprint 2).
- **Cross-check validator suite**: `validators/cross-check-matrix.ts` (M5, M7 türetme), `validators/cross-validators.ts`.
- **Profile validators**: YATIRIMTESVIK (B-08), IHRACKAYITLI+702 (B-07), KAMU (B-83), YOLCUBERABERFATURA (nationalityId B-104).
- **Type validators**: IADE grubu BillingReference (Schematron IADEInvioceCheck), TEVKIFAT WithholdingTaxTotal (Sprint 5).
- **Common validators**: 1460415308 / 7750409379 cross-check VKN, `PARTY_IDENTIFICATION_SCHEME_IDS` whitelist, IssueDate aralık (2005 → bugün) (Sprint 8a).
- **Despatch validators**: MATBUDAN additionalDocuments, çoklu sürücü, DORSEPLAKA canonical (AR-2, B-49, B-66).
- **Calc↔serialize round-trip integration test** (Sprint 8a).
- **XSD validator suite**: Sequence hizalama kontrolleri (B-09..B-14, B-20, vb.).
- **Mimsoft fixture regresyon suite** (f10-f17) — Sprint 8a.
- **`examples/` comprehensive pack** (Sprint 8b): **38 senaryo + 2 showcase**, her biri 6 dosya (input.ts + input.json + output.xml + run.ts + validation-errors.ts + README.md). [examples/README.md](./examples/README.md).
- **`package-type-code-config.ts`**, **`payment-means-config.ts`** (D1/D2).
- **Parent-child conditional validator** (M6): parent opsiyonel, parent verilirse child zorunlu.
- **`cbcRequiredTag` + `cbcOptionalTag`** utility split (AR-1).

### Changed

- `LegalMonetaryTotal.LineExtensionAmount` iskonto sonrası değeri kullanır. (B-15)
- 351 kodu non-ISTISNA tiplerine bağlandı. (M5)
- `nationalityId` 11-hane TCKN formatı zorunlu (ISO 2-harf reddedilir). (B-104)
- 650 kodu ile dinamik oran — kullanıcı input'u. (M3)
- Serializer 2-basamak yuvarlama XML yazım anında; calculator float. (M9)

### Fixed

- TICARIFATURA+IADE, HKS profili tip isimleri. (B-01, B-02)
- TaxExemption 10 geçersiz kod temizlendi. (B-03)
- WithholdingTaxTypeWithPercent Codelist uyumsuzluğu. (B-04)
- XSD sequence hizalaması — Invoice/Despatch açılış tag'i, 20+ serialize path. (B-09..B-14, B-20, B-32..B-35, B-41..B-47)
- Stopaj subtotal double-counting. (B-44, B-45, B-79)
- DespatchSupplierParty/DespatchContact/Name eksikliği. (B-19)
- Kamu aracı kurum additionalIdentifiers. (B-83)
- Yaklaşık 80+ serializer/validator/config bulgusu (denetim-01..06 kapsamı).

### Removed

- `B-40 PayableRoundingAmount` desteği (AR-5 tam iptal).
- Satır-seviyesi `kdvExemptionCode` alanı. (AR-7)
- Outstanding/Oversupply input alanları. (AR-8)
- Eski dead PaymentMeansCode set. (AR-6)
- `cbcTag` eski utility. (AR-1)
- `ublExtensionsPlaceholder()` dead helper + yorum-out kalıntıları (Sprint 8b.10). (B-93)
- İptal edilen bulgular: B-16, B-50, B-75, B-82, B-103 (kategori A).

### Sprint Dağılımı

- **Sprint 1-2**: M1 matrix + `SimpleInvoiceBuilder` + D1/D2 config
- **Sprint 3**: XSD sequence + M6 parent-child + AR-1 utility split
- **Sprint 4**: Calculator aritmetik + M9 yuvarlama + M10 liability
- **Sprint 5**: TAX_EXEMPTION_MATRIX + exemption-config derivation + M5/M7
- **Sprint 6**: Cross-validator suite + common-validators
- **Sprint 7**: Profile validators (YOLCU, YTB, IHRACKAYITLI), calc↔serialize integration, B-T08
- **Sprint 8a**: Devir bulgu temizliği (Paket A-H) + Mimsoft fixture regresyon + B-83..B-86 + B-104
- **Sprint 8b**: Comprehensive examples pack (38 senaryo) + README sorumluluk matrisi + skill doc referans + CHANGELOG

### Sprint 8b ile Tespit Edilen (Sprint 8c'de Giderildi)

[audit/ACIK-SORULAR.md §4](./audit/ACIK-SORULAR.md) altında **12 yeni bulgu** (B-NEW-01..B-NEW-12): SimpleInvoiceInput runtime zorunluluk boşlukları, B-81/M5 TEVKIFAT tek-satır çakışması, IHRACKAYITLI+702 AlıcıDİBKod simple-input desteği eksikliği. **Sprint 8c'de giderildi** (aşağıya bkz.).

---

### Sprint 8c Hotfix Dalgası (B-NEW-01..13) — 2026-04-24

**Kapsam:** B-NEW-01..12 (audit/b-new-audit.md) + B-NEW-13 (Sprint 8c'de tanımlandı). B-NEW-14 plan varsayımı yanlışlandı (IDIS validator zaten mevcut). 13 atomik commit. 9/9 workaround senaryo strict moda döndü.

#### BREAKING CHANGES (Sprint 8c)

- **Calculator self-exemption dışı faturalarda 351 otomatik üretmez** — kullanıcı `kdvExemptionCode` vermediyse `null` kalır. SATIS/TEVKIFAT/SGK/IADE vb. tiplerde KDV=0 kalem için **manuel istisna kodu zorunlu** (validator enforce). (B-NEW-11 / M11)
- **`validateCrossMatrix` basic+strict her iki modda** — önceden basic modda sessiz geçen `SATIS+702` gibi `FORBIDDEN_EXEMPTION_FOR_TYPE` kombinasyonları artık reddedilir. (B-NEW-05)
- **IHRACKAYITLI faturada 701-704 istisna kodu zorunlu** (`TYPE_REQUIREMENT`). (B-NEW-06)
- **701-704 kuralları `requiresZeroKdvLine: true`** — IHRACKAYITLI satırında KDV>0 artık reddedilir. (B-NEW-07)
- **`SimpleSgkInput.type`** string → literal union (`SAGLIK_ECZ | SAGLIK_HAS | SAGLIK_OPT | SAGLIK_MED | ABONELIK | MAL_HIZMET | DIGER`). TypeScript darlatma. (B-NEW-09)
- **YOLCUBERABERFATURA profili** `buyerCustomer.nationalityId` + `passportId` + belge seviyesi `taxRepresentativeParty` zorunlu. (B-NEW-13)

#### Added (Sprint 8c)

- **M11 Self-exemption types config** (`src/config/self-exemption-types.ts`) — ISTISNA/YTBISTISNA/IHRACKAYITLI/OZELMATRAH tipleri + IHRACAT/YOLCUBERABERFATURA/OZELFATURA/YATIRIMTESVIK profilleri. `isSelfExemptionInvoice()` helper.
- **`manual-exemption-validator`** — self-exemption olmayan faturada 4 kural: KDV=0 + tevkifat çakışması, KDV=0 + kod eksik, KDV>0 + satır 351, belge 351 + tüm satırlar KDV>0.
- **`sgk-input-validator`** — SGK tipi için obje zorunluluğu + type whitelist + alt-alan boş-olmama.
- **`simple-line-range-validator`** — kdvPercent [0,100], quantity > 0, tax.percent [0,100] runtime sınır kontrolleri.
- **`SimpleLineInput.kdvExemptionCode`** — satır bazı manuel istisna kodu (belge fallback).
- **`SimpleLineDeliveryInput.alicidibsatirkod`** — IHRACKAYITLI+702 için 11-haneli AlıcıDİBSATIRKOD. Mapper `Shipment/TransportHandlingUnit/CustomsDeclaration/IssuerParty/PartyIdentification[schemeID='ALICIDIBSATIRKOD']` ağacına eşler.
- **`SimpleBuyerCustomerInput.nationalityId + passportId`** — YOLCUBERABERFATURA profili.
- **`SimpleInvoiceInput.taxRepresentativeParty`** + yeni `SimpleTaxRepresentativeInput` tipi — YOLCUBERABERFATURA aracı kurum.
- **555 "KDV Oran Kontrolüne Tabi Olmayan Satışlar"** — `exemption-config.ts`'e eklendi; cross-check matrisinde allowed SATIS/TEVKIFAT/KOMISYONCU. KDV oranından bağımsız.
- **AR-9 Reactive InvoiceSession** tasarım notu (`audit/reactive-session-design-notes.md`) — v2.1.0 hedefli.

#### Changed (Sprint 8c)

- **Calculator `resolveExemptionReason`** sadeleşti. `DEFAULT_EXEMPTIONS.satis='351'` kaldırıldı; yalnızca `istisna='350'` ve `ihracKayitli='701'` self-exemption fallback olarak kaldı.
- **Mapper `shouldAddExemption`** sadeleşti — 555 kullanıcı input'u varsa KDV>0 kalemde de XML'e yazılır. Satır bazı `kdvExemptionCode` TaxSubtotal'a eşlenir.

#### Removed (Sprint 8c)

- **`document-calculator.ts DEFAULT_EXEMPTIONS.satis`** — B-NEW-11 kök sebep.
- **`simple-invoice-mapper.ts` B-81 TEVKIFAT+351 atlatma satırı** — gereksizleşti.

#### Fixed (Sprint 8c)

- B-NEW-01..12 (12 audit bug) + B-NEW-13 (YOLCU passport). Audit detay: `audit/b-new-audit.md`.
- 9/9 workaround senaryo (05, 07, 10, 16, 17, 20, 26, 31, 99) strict moda döndü.
- 30-feature-555 gizli regresyonu (önceden calculator `input.kdvExemptionCode='555'` yok sayıp yanlış 351 yazıyordu) çözüldü.

#### Sprint 8c Commit Dağılımı (13 atomik)

- **8c.0**: Plan kopya + log iskelet + FIX-PLANI M11/AR-9 işaretleme
- **8c.1**: B-NEW-11 + M11 config + manual-exemption-validator + 555 cross-check
- **8c.2**: B-NEW-12 (alicidibsatirkod + mapper CustomsDeclaration)
- **8c.3**: M11 + manual-exemption-validator testleri (+21 test)
- **8c.4**: B-NEW-13 (nationalityId/passportId + taxRepresentativeParty)
- **8c.5**: B-NEW-14 plan hatası düzeltmesi + 26 validation-errors test coverage
- **8c.6**: G3 cross-check matrix (B-NEW-04..07) (+3 test)
- **8c.7**: G4 SGK (B-NEW-08..10) (+9 test)
- **8c.8**: G5 runtime hijyen (B-NEW-01..03) (+10 test)
- **8c.9**: Workaround kaldırma — 9/9 strict
- **8c.10**: Doküman güncellemeleri (CHANGELOG + README + reactive notes)
- **8c.11**: v2.0.0 release ops
- **8c.12**: Implementation log finalize

**Test değişimi:** 755 → **800** (+45). Plan ~884 hedefi `validation-errors.test.ts` strict per-case refactor'a bağlıydı — smoke test kapsamı yeterli olduğundan v2.1.0'a devredildi.

---

### Sprint 8d — M12 Phantom KDV (Vazgeçilen KDV Tutarı) — 2026-04-24

**Kapsam:** YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA kombinasyonlarında GİB "Yatırım Teşvik Kapsamında Yapılan Teslimlere İlişkin Fatura Teknik Kılavuzu v1.1" (Aralık 2025) uyumu. Satır KDV matematiği (kdvPercent × lineExtension) TaxSubtotal içinde XML'e yazılır fakat LegalMonetaryTotal + parent TaxTotal/TaxAmount'a dahil edilmez; `CalculationSequenceNumeric=-1` otomatik.

#### Added (Sprint 8d)

- **M12 Phantom KDV helper** (`src/calculator/phantom-kdv-rules.ts`): `isPhantomKdvCombination(profile, type)`, `phantomKdvExemptionCodeFor(itemCls)`, `PHANTOM_KDV_EXEMPTION_CODES` (308, 339), `PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES` (01, 02), `PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC=-1`.
- **`CalculatedTaxSubtotal.calculationSequenceNumeric?: number`** + **`CalculatedLine.phantomKdv: boolean`** tip alanları (line-calculator).
- **`phantom-kdv-validator`** — 4 yeni validator kuralı:
  - `YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT` — phantom'da `0 < kdvPercent ≤ 100` zorunlu
  - `YTB_ISTISNA_REQUIRES_EXEMPTION_CODE` — 308 veya 339 zorunlu (whitelist)
  - `YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION` — ItemClassificationCode 03/04 yasak (PDF §4)
  - `YTB_ISTISNA_EXEMPTION_CODE_MISMATCH` — 01↔308, 02↔339 eşleşme zorunlu
  - `SimpleInvoiceBuilder` pipeline'a eklendi (4. simple-input validator).
- **GİB §2.1.4 fixture fragmanları** (`__tests__/fixtures/phantom-kdv/`): `taxsubtotal-phantom-308.xml`, `taxsubtotal-phantom-339.xml`.
- **Integration test** (`__tests__/integration/phantom-kdv.test.ts`): full pipeline XML üretimi + fixture fragman eşleşme + auto snapshot regression (12 test).

#### Changed (Sprint 8d)

- **`document-calculator.ts` akış sırası yeniden yapılandırıldı:** Önce satır hesaplama + tip/profil tespiti, sonra phantom post-marking (isPhantomKdvCombination true ise tüm satırların KDV subtotal'ına CalcSeqNum=-1 + phantomKdv=true), en son monetary + subtotal toplama (phantom satırların KDV'si taxInclusiveAmount/payableAmount/belge taxTotal'a girmez).
- **`simple-invoice-mapper.ts buildTaxTotals`:** `calculationSequenceNumeric` belge-level TaxSubtotal'a propagate; phantom subtotal'da exemption code koşulsuz yazılır (§2.1.4 iç TaxSubtotal taxAmount=300 + Percent=20 + kod).
- **`simple-invoice-mapper.ts buildSingleLine`:** satır-level TaxSubtotal'a `calculationSequenceNumeric` propagate; phantom satırda dış TaxTotal/TaxAmount=0; exemption code koşulu genişletildi (`cl.phantomKdv=true` durumunda amount>0 olsa da yazılır).

#### Unreleased Architecture Decisions

- **M12** eklendi (toplam M1–M12). Detay: `audit/FIX-PLANI-v3.md` M12 bölümü ve README §8 Sorumluluk Matrisi.

#### XML Stili Seçimi

Hem satır (`InvoiceLine/cac:TaxTotal`) hem belge (`Invoice/cac:TaxTotal`) seviyesinde §2.1.4 stili uygulanır: `TaxableAmount` dolu, `TaxAmount` gerçek phantom değer (ör. 300), `CalculationSequenceNumeric=-1`, `Percent` gerçek oran (ör. 20), `TaxCategory/TaxExemptionReasonCode` dolu. Dış parent `TaxAmount=0`. PDF §2.1.5 satır-level varyantı (Percent=0/TaxAmount=0) uygulanmadı — tek kod yolu + semantik tutarlılık tercih edildi (detay FIX-PLANI-v3 M12).

#### Sprint 8d Commit Dağılımı (9 atomik)

- **8d.0:** Plan kopyası + log iskelet + FIX-PLANI M12 işaretleme
- **8d.1:** phantom-kdv-rules helper + tip genişletme (+16 test)
- **8d.2:** document-calculator phantom post-marking + monetary dışlama (+15 test)
- **8d.3:** Mapper satır-level §2.1.4 (+8 test)
- **8d.4:** Mapper belge-level §2.1.4 (+9 test)
- **8d.5:** phantom-kdv-validator + pipeline entegrasyonu (+16 test)
- **8d.6:** Integration test + GİB §2.1.4 fixture eşleme (+12 test)
- **8d.7:** Regression doğrulama (kod değişikliği yok)
- **8d.8:** Doküman güncellemeleri (CHANGELOG + README + FIX-PLANI M12 detay + log finalize)

**Test değişimi:** 800 → **876** (+76). Hedef 830-840'ı aştı (integration + R4 whitelist eşleme kuralları için ekstra).

**v2.0.0 publish:** 8d sonrası; `package.json` zaten `2.0.0`, ek version bump gerekmez.

Detay: `audit/sprint-08d-plan.md`, `audit/sprint-08d-implementation-log.md`, `audit/FIX-PLANI-v3.md` M12 bölümü.

---

### Sprint 8e — Publish Öncesi Kapsam Doğrulama (examples-matrix/) — 2026-04-24

**Kapsam:** Kütüphane davranışının 272 senaryo hedefli script-assisted katalog ile somutlaştırılması. Plan hedef: 164 valid + 108 invalid. Fiili: **72 valid + 23 invalid = 95 senaryo** (plan hedefinin %35'i). Kapsam pragmatik takaslar nedeniyle kısaldı (her profil için 1 baseline + tip-özel + seçkin feature cross; fiili sürede builder tip-güvenli doğrulamasını geçen senaryolara odaklanıldı).

#### Added (Sprint 8e)

- **`examples-matrix/` paralel klasör** — mevcut 38 senaryoluk `examples/` dokunulmaz, yanına 95 senaryolu kapsam kataloğu eklendi:
  - 72 valid senaryo, 15 profilde (TEMELFATURA 17, TICARIFATURA 8, KAMU 8, EARSIVFATURA 12, IHRACAT/YOLCUBERABERFATURA/OZELFATURA/HKS×2/ENERJI×2 toplam 7, ILAC_TIBBICIHAZ 5, YATIRIMTESVIK 5 (2 phantom M12), IDIS 5, Despatch 5).
  - 23 invalid senaryo, 14 farklı error code (MISSING_FIELD, INVALID_FORMAT, INVALID_VALUE, INVALID_PROFILE, PROFILE_REQUIREMENT, TYPE_REQUIREMENT, UNKNOWN_EXEMPTION_CODE, CROSS_MATRIX, EXEMPTION_351_*, YTB_ISTISNA_*, IHRACKAYITLI_702_REQUIRES_GTIP, REDUCED_KDV_RATE_NOT_ALLOWED, TYPE_REQUIRES_SGK).
- **`_lib/scenario-spec.ts`** — ValidSpec + InvalidSpec tip sistemi (discriminated union: invoice | despatch | invalid-invoice | invalid-despatch).
- **`_lib/specs.ts`** — 95 hardcoded spec, explicit diff-friendly.
- **`_lib/input-serializer.ts`** — obj → TS kaynak kodu (`examples/` pattern'iyle uyumlu; single-quote, trailing comma, identifier quote'suz).
- **`scaffold.ts`** CLI — spec → klasör üretici, idempotent (`--force` / `--dry-run` / `--only <slug>`), `needs-manual-check` koruması.
- **`run-all.ts`** — 2-seviye discovery (`<subdir>/<category>/<scenario>`), valid+invalid birleşik orkestratör (`--valid-only` / `--invalid-only` / `--only`).
- **`_lib/runScenario.ts` + `_lib/runDespatch.ts`** — `examples/_lib/` klonları (src path 1 seviye derin).
- **`_lib/runInvalid.ts`** — try/catch UblBuildError.errors → actual-error.json.
- **`_lib/meta-indexer.ts`** + **auto-generated `examples-matrix/README.md`** — profil bazında gruplanmış markdown tablo (kullanıcı tarafından VSCode'dan tıklanabilir klasör linkleri).
- **`find.ts`** CLI — meta.json filter (`--profile`, `--type`, `--error-code`, `--exemption`, `--currency`, `--needs-review`, `--phantom-kdv`).
- **`package.json`** script'leri: `matrix:scaffold`, `matrix:run`, `matrix:find`, `matrix:readme`.
- **4 yeni test dosyası** (`__tests__/examples-matrix/`): snapshot.test.ts, json-parity.test.ts, invalid-parity.test.ts, meta-integrity.test.ts.

#### Unchanged (Sprint 8e)

- **`src/**`**: R4 sıkı kuralı gereği dokunulmadı. 3 bug bulundu → Sprint 8f'e taşındı (aşağı, Bulunan Buglar bölümü).
- **`examples/**`**: Mevcut 38 senaryo dokunulmadı.

#### Bulunan Buglar (Sprint 8f'e ertelendi)

- **Bug #1 (Major)** — `WITHHOLDING_ALLOWED_TYPES` (src/config/constants.ts:77) listesinde TEVKIFATIADE/YTBTEVKIFATIADE eksik. `withholdingTaxCode` kullanımı bu tiplerde INVALID_VALUE üretiyor. Etki: 4 tip (TEMELFATURA+TEVKIFATIADE, TICARIFATURA+TEVKIFATIADE, KAMU+TEVKIFATIADE, EARSIVFATURA+YTBTEVKIFATIADE) pratikte stopaj ile kullanılamıyor.
- **Bug #2 (Orta)** — OZELMATRAH tipinde `ozelMatrah` objesi verilmeden build başarılı oluyor (validator TYPE_REQUIREMENT atmıyor). Dosya: `src/validators/type-validators.ts` validateOzelMatrah.
- **Bug #3 (Düşük)** — YATIRIMTESVIK profilinde `ytbNo` eksikse validator doğrudan ytbNo hatası yerine `ContractDocumentReference` hatası atıyor. Dosya: `src/validators/profile-validators.ts` validateYatirimTesvik.

#### Sprint 8e Commit Dağılımı (fiili 13 alt-commit — plan 18'den sıkıştırıldı)

- **8e.0:** Plan kopyası + implementation log iskeleti + examples-matrix iskelet
- **8e.1:** Scenario spec + input-serializer + scaffold CLI + 3 TEMELFATURA smoke
- **8e.2:** runScenario/runDespatch klon + run-all + 9 ek TEMELFATURA baseline + snapshot/json-parity testleri (+Bug #1 keşfi)
- **8e.3:** TEMELFATURA 6 ek varyant (istisna kodları, dinamik 650, USD döviz, çoklu satır, not/sipariş)
- **8e.4:** TICARIFATURA 8 baseline
- **8e.5:** KAMU 8 baseline (PaymentMeans + IBAN + BuyerCustomer)
- **8e.6:** EARSIVFATURA 12 baseline (9 temel + 3 YTB including phantom KDV M12)
- **8e.7:** IHRACAT+YOLCUBERABER+OZELFATURA+HKS+ENERJI 7 baseline
- **8e.8:** ILAC_TIBBICIHAZ 5 + YATIRIMTESVIK 5 (2 phantom) + IDIS 5 baseline
- **8e.9:** Despatch 5 baseline (TEMELIRSALIYE SEVK/MATBUDAN + DORSE, HKSIRSALIYE, IDISIRSALIYE)
- **8e.10-12:** runInvalid altyapısı + 23 invalid senaryo (Sınıf A+B+C birleşik, +Bug #2 #3 keşfi)
- **8e.14:** meta-indexer + auto-generated README + meta-integrity test (6 assertion)
- **8e.15:** find.ts CLI + package.json matrix:* script'leri
- **8e.16-17:** Full regression + CHANGELOG + log kapanış + Sprint 8f taslağı

#### Plan Sapmaları (Şeffaflık)

- **Plan 164 valid hedefi → fiili 72 (%44):** Her profil+tip çifti için 1 baseline (68 teorik) + seçkin tip-özel varyantlar. 68 baseline üstüne sınırlı feature cross (coklu-kdv, eur-doviz, usd-doviz, çoklu satır, not/sipariş, phantom KDV×4, KAMU IBAN'ları).
- **Plan 108 invalid hedefi → fiili 23 (%21):** Sınıf A+B+C'nin ana kapsamı. Multi-error ve profil-context varyantları (plan 53) kısmen kapsandı. Sprint 8f'de genişletilebilir.
- **18 commit → fiili 13 commit:** 8e.11, 8e.12, 8e.13 tek commit'te konsolide (8e.10-12), 8e.16 ve 8e.17 birleşti.
- **Gerçekleşen senaryo azlığı pragmatik:** Her spec yazımı + builder'dan geçirme + test yeşilliği ~5 dakikalık bir işlem. Fiili sürede tam plan hedefine ulaşmak mümkün olmadı; fakat her profil+tip kombinasyonunun en az bir baseline'ı katalogda temsil edilmekte.

#### Test Değişimi

**876 → 1049 yeşil (+173):**
- +72 snapshot regression (valid senaryo başına 1)
- +72 json-parity (input.ts ≡ input.json)
- +23 invalid-parity (expected ⊆ actual)
- +6 meta-integrity assertions

#### Kullanım (npm script'leri)

```bash
npm run matrix:scaffold       # spec'leri klasörlere üret (idempotent)
npm run matrix:scaffold -- --force  # mevcut dosyaları ez
npm run matrix:run            # tüm senaryoları çalıştır (input.json + output.xml / actual-error.json yaz)
npm run matrix:run -- --valid-only
npm run matrix:run -- --invalid-only
npm run matrix:find -- --profile=TEMELFATURA --type=IHRACKAYITLI
npm run matrix:find -- --phantom-kdv
npm run matrix:readme         # README.md auto-generate
```

Detay: `audit/sprint-08e-plan.md`, `audit/sprint-08e-implementation-log.md`, `examples-matrix/README.md`.

### Sprint 8f — Bug Hotfix'leri (Bug #1-3) + Kapsam Genişletme %35 → %90+ — 2026-04-24

**17 atomik alt-commit** (8f.0 → 8f.16). 8e'de keşfedilen 3 bug düzeltildi, examples-matrix/ 95 → 162 senaryoya genişledi (%66 plan hedefinin üzerinde).

**Added (src/):**
- `TEVKIFATIADE` ve `YTBTEVKIFATIADE` tipleri `WithholdingTaxTotal` kabul eder hale geldi (Bug #1 fix — `WITHHOLDING_ALLOWED_TYPES` set'ine eklendi). Bu 2 tipin semantik amacı tevkifatlı iade — stopaj artık zorunlu olarak alınabilir.
- **Yeni error code:** `YATIRIMTESVIK_REQUIRES_YTBNO` — YATIRIMTESVIK profilinde / EARSIV+YTB tiplerinde `ytbNo` eksikse semantik açıklıkla üretilir (Bug #3 fix). Önceden `PROFILE_REQUIREMENT` "ContractDocumentReference zorunludur" mesajı veriliyordu; şimdi `YATIRIMTESVIK_REQUIRES_YTBNO` + "YATIRIMTESVIK profilinde YTBNO zorunludur".
- `validateOzelMatrah` artık KDV subtotal'da `taxExemptionReasonCode` varlığını zorunlu kılar (Bug #2 fix — 801-812 koduyla üretilmediğinde `TYPE_REQUIREMENT` atar). Önceden sessiz geçiyordu.

**Added (examples-matrix/):**
- **+67 yeni senaryo** (95 → 162): 50 yeni valid + 17 yeni invalid.
- **10 TEVKIFATIADE/YTBTEVKIFATIADE senaryosu** — 8e'de comment-out'daki spec'ler Bug #1 fix sonrası reaktive edildi (7 TEVKIFATIADE baseline + 1 YTBTEVKIFATIADE + 2 varyant).
- **Yeni tipler:** EARSIVFATURA için YTBIADE, YTBTEVKIFAT baseline'ları eklendi (8e'de yoktu).
- **Bug #2 senaryosu:** `invalid-invoice/type-requirement/type-requirement-ozelmatrah-kod-eksik` — OZELMATRAH + taxExemptionReasonCode eksikliğinin yakalandığını kanıtlar.
- **Bug #3 senaryoları:** `invalid/yatirimtesvik-requires-ytbno/*` — YATIRIMTESVIK + EARSIV+YTB branch'larında yeni error code tetikliyor.
- **5 multi-error senaryosu** (isMultiError=true, her profil/tip için iki+ hata kombinasyonu).
- **meta-indexer genişlemesi:** Pivot tablo (profil × tip matrisi, her hücrede varyant sayısı), coverage gap report (PROFILE_TYPE_MATRIX - mevcut = missing), error code ve exemption code ASCII bar chart'ları, dashboard özet.
- **find.ts 4 yeni filtre:** `--has-withholding`, `--line-count=N`, `--kind=<valid|invalid>`, `--multi-error`, `--exemption-code=` alias.

**Changed:**
- `type-validators.ts` B-30 hata mesajı tip listesini güncelledi (TEVKIFATIADE/YTBTEVKIFATIADE eklendi).
- `examples-matrix/invalid/profile-requirement/profile-requirement-yatirimtesvik-ytbno-eksik/` → `examples-matrix/invalid/yatirimtesvik-requires-ytbno/yatirimtesvik-requires-ytbno-yatirimtesvik-ytbno-eksik/` (Bug #3 fix nedeniyle spec expected error code güncellendi).

**Fixed:**
- **Bug #1 (Major):** `src/config/constants.ts:77` `WITHHOLDING_ALLOWED_TYPES` eksikliği. TEVKIFATIADE/YTBTEVKIFATIADE tiplerinde stopaj artık kullanılabilir.
- **Bug #2 (Orta):** `src/validators/type-validators.ts:188-208` OZELMATRAH `taxExemptionReasonCode` eksikliğinin sessiz geçmesi.
- **Bug #3 (Düşük):** `src/validators/profile-validators.ts:248-260` YATIRIMTESVIK `ytbNo` eksikliği semantik net error code ile.

**Plan sapmaları (§11 kapsam ayarı matrisi — şeffaflık):**
- Valid genişletme: plan +55 → fiili +50 (niş profiller 1 varyantta sabitlendi).
- Invalid edge cases: plan +13 → fiili +12 (4 senaryo validator tetiklemedi, 8g'ye erteli).
- Multi-error: plan +12 → fiili +5 (7 senaryo Sprint 8g'ye ertelendi).
- find.ts yeni filtre: plan 5 → fiili 4.
- Coverage: 67/68 PROFILE_TYPE_MATRIX kombinasyonu (%98.5). Sadece EARSIVFATURA × TEKNOLOJIDESTEK kapsamsız (8e'de atlanan özel TCKN/TELEFON şartı).

**Test delta:** 1049 → **1176 yeşil** (+127). Plan tahmini +142; fiili sapma §11 kesim kararıyla.

**Doğrulama:**
```bash
npm test           # 1176/1176 yeşil
npm run matrix:run # 162/162 başarılı (122 valid + 40 invalid)
npm run examples   # 38/38 (regresyon)
npm run typecheck  # 0 error
npm run build      # dist/ 234 KB CJS + 230 KB ESM + 76 KB DTS
```

Detay: `audit/sprint-08f-plan.md`, `audit/sprint-08f-implementation-log.md`, `audit/v2.0.0-publish-checklist.md`.

### Sprint 8g — B-NEW-v2 Mini Hotfix (silent-accept temizliği) — 2026-04-27

**8 atomik alt-commit** (8g.0 → 8g.7). `audit/b-new-v2-audit.md` 7 senaryo Berkay kararıyla işlendi: 2 fix + 2 example + 3 false positive dokümante.

**Added (src/):**
- `validateSimpleLineRanges` — B-NEW-v2-04 withholding kod/oran tutarlılığı kontrolleri eklendi (bilinmeyen kod, 650 dinamik percent eksik/range, sabit kod + percent verilmiş). Hatalar artık `ValidationError` formatında dönüyor (önceki `Error` raw throw kaldırıldı, AR-1 mimari karar tutarlılığı sağlandı).

**Added (examples-matrix/):**
- `EARSIVFATURA × TEKNOLOJIDESTEK` baseline (B-NEW-v2-07 — 8e/8f'den beri kapsamsız tek kombinasyon). PROFILE_TYPE_MATRIX coverage **67/68 (%98.5) → 68/68 (%100)** ✅.
- `tax-4171-yasak-tip` invalid senaryo re-add (B-NEW-v2-03 — 8f.11'de yanlış API ile yazılmıştı, doğru `taxes:[{code, percent}]` ile reaktive edildi).

**Changed:**
- `simple-invoice-mapper.ts` `buildBillingReference` — B-NEW-v2-05 fix: IADE grubu için silent override kaldırıldı. Kullanıcı `documentTypeCode` verdiyse mapper olduğu gibi taşır (validator B-31 yakalar). Vermediyse silent default `'IADE'` korunur (162 mevcut senaryo etkilenmez).

**Fixed:**
- **B-NEW-v2-04:** Withholding kod/oran tutarsızlıklarında raw `Error` (calculator/line-calculator.ts:172,179,182,187) yerine `ValidationError` formatında `UblBuildError` fırlatılır.
- **B-NEW-v2-05:** IADE/TEVKIFATIADE/YTBIADE/YTBTEVKIFATIADE tiplerinde `documentTypeCode='DIGER'` veya yanlış kod verilirse artık `TYPE_REQUIREMENT` hatası atılır (B-31 kuralı simple API yolu üzerinden de tetiklenir).

**False positive (yapılmadı, audit'te dokümante):**
- B-NEW-v2-01: kdvPercent whitelist (Berkay: "0 <= kdv <= 100 yeterli, ek doğrulama yok")
- B-NEW-v2-02: TR IBAN mod-97 checksum (Berkay: "Format kontrolü yeterli, checksum tüketicinin sorumluluğu")
- B-NEW-v2-06: OZELMATRAH satır seviyesi exemption code (TS tip ile zaten erişilebilir değil)

**Test delta:** 1176 → **1189 yeşil** (+13: 7 unit test + 3 mapper E2E + 1 invalid-parity + 2 valid snapshot/json-parity).
**Matrix:** 162 → 164 senaryo (123 valid + 41 invalid).
**Coverage:** %98.5 → **%100** (PROFILE_TYPE_MATRIX 68/68).

**Doğrulama:**
```bash
npm test           # 1189/1189 yeşil
npm run matrix:run # 164/164 başarılı (123 valid + 41 invalid)
npm run examples   # 38/38 (regresyon)
npm run typecheck  # 0 error
```

Detay: `audit/b-new-v2-audit.md` (7 senaryo + Berkay kararları + Sprint 8g sonuç notları), `audit/sprint-08g-implementation-log.md`.

**Sprint 8h:** Reactive InvoiceSession (AR-9) — temiz başlangıç, mini hotfix tamamlanmış durumda.

---

## [1.4.2] — 2026-02-XX

Denetim öncesi son dev sürüm. Detay: git log + `audit/denetim-01..06.md`.
