---
karar: Sprint 8h (Faz 1) — Çekirdek Reactive Session Tasarım Dokümanı (FINALIZED)
hedef: Reactive InvoiceSession Faz 1 implementasyonu için taktik tasarım
versiyon: v2.0.0 → v2.1.0
durum: Tasarım — KİLİTLİ (D-1..D-12 kararları entegre)
tarih: 2026-04-27 (revize: 2026-04-27, finalized)
referans: audit/reactive-session-master-plan.md, audit/invoice-session-analiz.md
---

# Sprint 8h — Faz 1 Tasarım Dokümanı (Finalized)

Bu doküman, master plan §2'deki 9 maddelik Faz 1 kapsamını **uygulanabilir** hale getiren taktik tasarımdır. Master plan stratejik vizyonu, bu doküman uygulama detaylarını içerir. Tüm tasarım kararları (D-1..D-12) Berkay tarafından onaylandı; tasarım kilitli, implementation prompt'u sıradaki adım.

**Kapsam (master plan §2.1):** 19 setter kaldırma + `update(path, value)` + `SessionPaths` + field-level events + line-level FieldVisibility + B-78 köprü + validator pipeline + `updateUIState()` genişletme + test rewrite + **liability/isExport davranışı (§11)**.

---

## 1. `update(path, value)` Implementasyon Detayı

### 1.1 Path Parsing

**Karar (D-1):** Minimal in-house parser. Gerekçe: `package.json` `devDependencies`'inde `ts-morph` veya `lodash` yok — kütüphane minimalist disiplinde (`typescript ^5.3.3`, `tsx ^4.21.0`, `vitest ^1.2.0`, `tsup ^8.0.1` + tip dosyaları). Yeni dependency açmak Sprint 8h disiplinine uymaz.

**Bracket notation grammar:**

```
path        ::= segment ('.' segment | '[' index ']')*
segment     ::= identifier
identifier  ::= [a-zA-Z_][a-zA-Z0-9_]*
index       ::= [0-9]+
```

**Token tipi:**

```ts
type PathToken =
  | { kind: 'key'; value: string }      // 'sender', 'taxNumber', 'kdvPercent'
  | { kind: 'index'; value: number };   // 0, 1, 2 (bracket içinde)
```

**Parser fonksiyonu:**

```ts
function parsePath(path: string): PathToken[] {
  // Algoritma:
  // 1) Boş string → throw ParseError
  // 2) Karakter karakter tara:
  //    - identifier: '.' veya '[' karşılaşana kadar topla → key token
  //    - '[': sayısal index oku, ']' bekle → index token
  //    - '.': separator, skip
  // 3) Geçersiz karakter / bitmemiş bracket → throw ParseError
}
```

**Boyut tahmini:** ~50 satır TS kodu (state machine), ~30 satır test (her edge case için).

**Edge case'ler:**
- `''` (boş) → `ParseError('empty path')`
- `'lines[]'` (index yok) → `ParseError('expected index')`
- `'lines[abc]'` (sayısal değil) → `ParseError('invalid index')`
- `'lines[0]['` (kapanmamış) → `ParseError('unterminated bracket')`
- `'lines[0]extra'` (bracket sonrası direkt key) → `ParseError('expected . or [')`
- `'lines[-1]'` (negatif) → `ParseError('negative index')`
- `'.lines'` (lider nokta) → `ParseError('leading dot')`
- `'lines..kdvPercent'` (çift nokta) → `ParseError('empty segment')`
- `'lines[0].taxes[1].code'` (nested array) → `[key:'lines', index:0, key:'taxes', index:1, key:'code']` ✅
- `'sender.address.city'` (deep nested) → `[key:'sender', key:'address', key:'city']` ✅

**Parser hataları `update()` içinde yakalanır → `pathError` event emit + no-op** (S-2 kararı, throw değil; D-için Seçenek B `pathError` event).

### 1.2 Value Setter

**Karar (D-2):** Path-targeted clone. Tüm root deep-clone değil; sadece path üzerindeki node'lar yeni referans alır.

**Mevcut pattern korunur:** `invoice-session.ts:215+` zaten `this._input = { ...this._input, sender }` spread kullanıyor (nominal immutable). Path-targeted clone bu pattern'in genelleştirilmiş hali.

**Algoritma:**

```ts
function applyPathUpdate(input: SimpleInvoiceInput, tokens: PathToken[], value: unknown): SimpleInvoiceInput {
  // 1) Tek seviye (tokens.length === 1, key): { ...input, [token.value]: value }
  // 2) Çok seviye:
  //    - Recursive: top-level key alınır, alt-path için recursive call
  //    - Array index karşılaşılırsa: [...arr.slice(0, i), recursiveResult, ...arr.slice(i+1)]
  //    - Object key karşılaşılırsa: { ...obj, [key]: recursiveResult }
  // 3) Path üzerindeki node'lar yeni referans, paralel kardeşler aynı referans
}
```

**Performance hedefi:** 100 satır + tipik nested input için tek `update()` < 1ms (parser + value setter; validator pipeline hariç). Ölçüm 8h.7.1 (zorunlu benchmark commit).

**Edge case'ler:**
- `update('sender.taxNumber', '...')` ama `sender` undefined → koşulsuz `sender = {}` create mi, yoksa `pathError` mi? **Karar (D-6):** Sub-object path'lerinde otomatik nesne oluştur (sender boş olamaz constructor'da zaten doldurulur). `paymentMeans`, `buyerCustomer` gibi opsiyonel sub-object'ler için: ilk sub-field set'inde nesne create. Validator partial paymentMeans için warning verir (`meansCode` zorunlu).
- `update('lines[0].kdvPercent', 0)` ama `lines.length === 0` → `pathError` event (line index out of bounds, §1.4'te detay).
- `value === undefined` → field silinir mi, yoksa setter no-op mu? **Karar:** Opsiyonel field için undefined silme anlamına gelir (`{ ...obj, [key]: undefined }` JSON serialize'da kaybolur). Zorunlu field için (`type`, `profile` gibi) `pathError` event.

### 1.3 Diff Detection

**Algoritma:**

```ts
const previousValue = readPath(this._input, tokens);
const newInput = applyPathUpdate(this._input, tokens, value);
const newValue = readPath(newInput, tokens);

if (deepEqual(previousValue, newValue)) {
  // No-op: hiç event emit etme, validator çalıştırma
  return;
}

this._input = newInput;
// Cache invalidation otomatik — _input reference değişti (§6.4 reference equality)
this.emit('fieldChanged', { path, value: newValue, previousValue });
// ... event sırası §3.1'de
```

**`deepEqual` kararı:**
- **Primitive (string/number/boolean):** `===` kontrolü
- **Object value (örn. `update('paymentMeans', newObj)`):** Shallow equal yetersiz; deep equal gerekli (Mimsoft yeni nesne yaratır ama içerik aynıysa event istemez).
- **Implementation:** `node:util` modülünden `isDeepStrictEqual` (zero dep). Mevcut `package.json`'da `node` engine kısıtı yoksa tüm Node 16+ destekler.

**Tetiklenmeme koşulu açık:** `previousValue === newValue` (deep) ise **hiçbir event** emit edilmez. Validator pipeline ve UI state diff de çalıştırılmaz. Performance + signal-to-noise için kritik.

### 1.4 Path Validation Algoritması

**4 katmanlı kontrol** (D-2, D-9, D-10, D-11 ile finalized):

**Katman 1 — Path syntax:** §1.1 parser hata fırlatırsa → `pathError` event:
```ts
{ code: 'INVALID_PATH', path, reason: <ParseError.message> }
```

**Katman 2 — Read-only path (D-10):** `update('isExport', x)` (constructor-locked) → `pathError`:
```ts
{ code: 'READ_ONLY_PATH', path: 'isExport', reason: 'isExport is constructor-only and immutable' }
```
Mevcut read-only path listesi: `['isExport']` (Faz 1 için tek entry). İleride genişletilebilir.

**Katman 3 — Path SessionPaths map'inde mi:** parsed token sequence → string normalize → `KNOWN_PATH_TEMPLATES: Set<string>` ile karşılaştır. Eşleşme yoksa:
```ts
{ code: 'UNKNOWN_PATH', path, reason: 'path not in SessionPaths map' }
```

**Implementation notu:** Map'te `lines[${i}].kdvPercent` template var → çağrı zamanında `i` somut değer. Validation için: parsed token sequence'i şablon haline çevir (`lines[*].kdvPercent`) ve map'in şablon set'inde ara. Compile-time'da şablonlar üretilir (generator script `KNOWN_PATH_TEMPLATES: Set<string>` da export eder).

**Katman 4 — Index bounds:** Parser sayısal index'i token olarak çıkarır (`{ kind: 'index', value: 5 }`). `lines[5]` ama `_input.lines.length === 3` → :
```ts
{ code: 'INDEX_OUT_OF_BOUNDS', path, reason: 'lines[5] but length=3' }
```

Çift indeks: `lines[0].taxes[2]` ama `lines[0].taxes.length === 1` → aynı kod.

**Constraint check (özel — value-level):** `update('profile', invalidValue)` ihlal kontrolleri (§11.3 + D-11) Katman 4 sonrası, value setter öncesi çalışır:

- **`update('profile', x)`:** Eğer `x` `getAllowedProfiles(currentType)` içinde değilse:
  - `isExport=true` ile çakışma → `{ code: 'PROFILE_EXPORT_MISMATCH', path: 'profile', reason: 'isExport=true requires profile=IHRACAT' }`
  - `liability` ile çakışma → `{ code: 'PROFILE_LIABILITY_MISMATCH', path: 'profile', reason: 'liability=earchive requires profile=EARSIVFATURA' }`
- **`update('liability', x)`:** Eğer `isExport=true` → `{ code: 'LIABILITY_LOCKED_BY_EXPORT', path: 'liability', reason: 'isExport=true session ignores liability changes' }` (M10 kontratı, mevcut `setLiability` no-op davranışı korunur).

**Tüm 4 katmanda + constraint check:** `pathError` event emit + **hiçbir mutation, hiçbir validator çalıştırma, hiçbir field event**. Sessiz no-op disiplinine uyar (S-2). Ayrıca exception throw YOK — `pathError` event consumer tarafından işlenir.

**Hata kodları konsolide listesi (Faz 1):**

| Kod | Tetikleyici | Katman |
|---|---|---|
| `INVALID_PATH` | Parser syntax error | 1 |
| `READ_ONLY_PATH` | `update('isExport', ...)` | 2 |
| `UNKNOWN_PATH` | `SessionPaths` map'te yok | 3 |
| `INDEX_OUT_OF_BOUNDS` | `lines[i]`, `lines[i].taxes[ti]` array bound | 4 |
| `PROFILE_EXPORT_MISMATCH` | Profile + isExport çakışması | constraint |
| `PROFILE_LIABILITY_MISMATCH` | Profile + liability çakışması | constraint |
| `LIABILITY_LOCKED_BY_EXPORT` | isExport=true ise liability değiştirme | constraint |

---

## 2. SessionPaths Generator Script

### 2.1 Algoritma

**Tool:** TypeScript Compiler API (`typescript ^5.3.3`, dev dep'te zaten var). `ts-morph` gerekmez — direkt `ts.createProgram` + `ts.TypeChecker` yeterli.

**Aşamalar:**

1. **Program oluştur:** `ts.createProgram(['src/calculator/simple-types.ts'], compilerOptions)`.
2. **`SimpleInvoiceInput` interface'ini bul:** `sourceFile.statements.find(s => ts.isInterfaceDeclaration(s) && s.name.text === 'SimpleInvoiceInput')`.
3. **Interface üyelerini gez:** Her `PropertySignature` için:
   - `name.getText()` → field adı
   - `type.getText()` → tip string'i
   - JSDoc varsa al (`ts.getJSDocCommentsAndTags(node)`).
4. **Tip ayrımı (recursive):**
   - **Primitive (`string | number | boolean | string[]`):** doc-level string sabit entry üret.
   - **Object reference (`SimplePartyInput`, `SimplePaymentMeansInput` vb.):** Referansı çöz, sub-fields için `parent.subField` formatında string sabit entry üret.
   - **Array of object (`SimpleLineInput[]`):** Her sub-field için fonksiyon entry üret: `(i: number) => 'lines[i].subField'`.
   - **Çift-indeksli array (`lines[i].taxes`, `lines[i].additionalItemIdentifications`):** İki parametreli fonksiyon entry: `(i: number, ti: number) => 'lines[i].taxes[ti].subField'`.
5. **JSDoc türetme:** `simple-types.ts`'de mevcut JSDoc varsa kopyala, yoksa default şablon üret:
   ```
   /**
    * Set the {fieldName} field of {parentPath}.
    * Expected type: {tsType}
    */
   ```
6. **Tip türetimi (`SessionPathMap`):**
   ```ts
   export type SessionPathMap = {
     'type': string;
     'profile': string;
     'liability': 'einvoice' | 'earchive' | undefined;     // Manuel append
     'lines[i].kdvPercent': number;
     // ... her path için value tipi
   };
   ```
   Her entry value tipi `simple-types.ts`'den çıkarılan TS tip string'idir.
7. **`KNOWN_PATH_TEMPLATES: Set<string>`** export et (path validation için, §1.4 Katman 3).

### 2.2 Manuel Append Listesi (D-9)

Generator otomatik tarayamayan **session-level state** alanlarını manuel append eder. Bunlar `SimpleInvoiceInput` parçası değil, ama path-based update API'sine dahil edilmesi gerekir:

| Path | Tip | Açıklama | Sebep |
|---|---|---|---|
| `liability` | `'einvoice' \| 'earchive' \| undefined` | Alıcı mükellefiyeti | Session-level state, `_liability` private field, `SimpleInvoiceInput` dışı |

**Implementation:** Generator'ın sonunda hard-coded entry append:

```ts
// scripts/generate-session-paths.ts içinde:
const MANUAL_ENTRIES: Array<{ key: string; pathTemplate: string; valueType: string; jsdoc: string }> = [
  {
    key: 'liability',
    pathTemplate: 'liability',
    valueType: "'einvoice' | 'earchive' | undefined",
    jsdoc: '/**\n * Set the customer liability (e-invoice / e-archive enrolment).\n * Note: ignored when session was created with isExport=true (M10 contract).\n * Expected type: \'einvoice\' | \'earchive\' | undefined\n */',
  },
  // İleride: yeni session-level state eklenirse buraya entry
];

generated.push(...MANUAL_ENTRIES.map(generateEntryCode));
```

**Read-only path listesi (constructor-only, asla `update()` ile değişmez):**

```ts
export const READ_ONLY_PATHS: Set<string> = new Set([
  'isExport',
]);
```

`update()` Katman 2 validation bu set'i kullanır.

### 2.3 Çıktı Dosyası

**Dosya yolu:** `src/calculator/session-paths.generated.ts`

**Header (yasak edit annotation):**

```ts
// =====================================================================
// @generated
// THIS FILE IS AUTO-GENERATED by scripts/generate-session-paths.ts
// DO NOT EDIT BY HAND. Edits will be lost on next regeneration.
// Generator input: src/calculator/simple-types.ts (SimpleInvoiceInput)
// Manual entries: liability (session-level state, see scripts/generate-session-paths.ts MANUAL_ENTRIES)
// Last generated: <ISO timestamp>
// =====================================================================
```

**Boyut tahmini:** ~125 entry × ortalama 4 satır (JSDoc + entry) + manuel append + KNOWN_PATH_TEMPLATES + READ_ONLY_PATHS = **~550-650 satır**.

### 2.4 CI Sync (Drift Önleme)

**`package.json` `scripts`:**

```json
"scripts": {
  "generate:paths": "tsx scripts/generate-session-paths.ts",
  "verify:paths": "tsx scripts/generate-session-paths.ts --check",
  "prebuild": "npm run verify:paths",
  "test": "npm run verify:paths && vitest run"
}
```

**`--check` modu:** Generator yeni içerik üretir, mevcut `session-paths.generated.ts` ile diff alır. Diff varsa exit code 1 + diff'i stderr'e yazar. Hem CI hem `npm test` öncesi çalıştırılır → drift tespit edilir.

**Generator script ana flow:**

```ts
async function main() {
  const generated = generateSessionPaths();
  const checkMode = process.argv.includes('--check');

  if (checkMode) {
    const existing = readFileSync(OUTPUT_PATH, 'utf-8');
    if (normalizeLineEndings(generated) !== normalizeLineEndings(existing)) {
      console.error('SessionPaths drift detected. Run `npm run generate:paths` to fix.');
      console.error(diffLines(existing, generated));
      process.exit(1);
    }
  } else {
    writeFileSync(OUTPUT_PATH, generated);
    console.log(`Generated ${OUTPUT_PATH}`);
  }
}
```

### 2.5 Mevcut Generator Pattern Uyumu

`examples-matrix/scaffold.ts` mevcut spec-driven generator pattern'idir (klasör + meta.json + input.ts şablonu üretir). Sprint 8h `scripts/generate-session-paths.ts` aynı disipline uyar:
- Ayrı klasör: `scripts/` (kök seviyesinde, yeni klasör 8h.1 commit'inde oluşturulur)
- `tsx` runner ile çalıştırılır
- Pure script, side effect sadece dosya yazımı
- Test edilebilir (`scripts/__tests__/generate-session-paths.test.ts` opsiyonel — generator output stable mı, regression check)

---

## 3. Field-Level Event Tasarımı

### 3.1 Event Sıralaması (Kilitli Tasarım — D-4)

`update(path, value)` çağrısı tetiklediği event sırası **kesin** ve **test ile enforce edilir**:

| # | Aşama | Olay | Açıklama |
|---|---|---|---|
| 1 | Parsing | (internal) | `parsePath()` çalışır |
| 2 | Path validation (4 katman + constraint) | `pathError` (eğer geçersiz) | §1.4 — validator pipeline'a girilmez, return |
| 3 | Diff check | (internal) | `previousValue === newValue` ise return |
| 4 | Auto-resolve (§11.3) | (internal) | type/profile/liability uyumsuzluk → otomatik geçiş; D-12 isExport force |
| 5 | Value setter | (internal) | `_input` mutate (immutable spread); `_invoiceInputCache` invalidate (reference değişti) |
| 6 | **`fieldChanged`** emit | event | İlk granüler sinyal; auto-resolve durumunda `requestedValue` + `forcedReason` doldurulur (D-12) |
| 7 | UI state diff hesabı | (internal) | `deriveFieldVisibility` + `deriveLineFieldVisibility` çağrılır |
| 8 | **`fieldDeactivated`** emit (her `true→false` için) | event | Ayrı emit per path |
| 9 | **`fieldActivated`** emit (her `false→true` için) | event | Ayrı emit per path |
| 10 | **`lineFieldChanged`** emit (eğer line path ise) | event | Sadece `lines[i].X` path'lerinde |
| 11 | **`typeChanged`** / **`profileChanged`** / **`liabilityChanged`** emit | event | Sadece o üç field path'inde (snapshot, mevcut korunur) |
| 12 | **`uiStateChanged`** emit | event | Yeni `_uiState` snapshot'ı |
| 13 | **`changed`** emit | event | Snapshot, `SimpleInvoiceInput` |
| 14 | `calculate()` çağrısı (autoCalculate ise) | (internal) | Pipeline |
| 15 | **`calculated`** emit (eğer lines.length > 0) | event | `_calculation` güncellendi |
| 16 | `validate()` çağrısı | (internal) | Pipeline §6 |
| 17 | **`validationError`** emit | event | Raw `ValidationError[]` (path + code) |
| 18 | **`warnings`** emit | event | Birleşik `ValidationWarning[]` |

**Sıralama gerekçesi:**
- 6 (`fieldChanged`) ilk granüler: tüketici hangi field değiştiğini en hızlı bilmeli
- 8-9 (`fieldDeactivated`/`fieldActivated`): UI'ın görünümü güncellemesi gerekiyor
- 10 (`lineFieldChanged`): line-spesifik tüketici (örn. line component) için
- 11 (snapshot): mevcut M10 test kontratını koru
- 12 (`uiStateChanged`): tek nokta UI snapshot, React state setter için
- 13 (`changed`): geriye uyumlu coarse event
- 15 (`calculated`): pipeline tamam
- 17-18 (validation): UX feedback için en sona

**Test ile enforce:** §7.1 `recordEvents()` helper her event'i sırayla kaydeder; test assertion sırayla event geleneğini doğrular. Bu sıra Faz 1 sonrası kilitli (geri-alınamaz karar — D-4).

### 3.2 Event Payload Tipi

```ts
// src/calculator/invoice-session.ts içine eklenir, SessionEvents interface genişletilir
export interface SessionEvents {
  // Mevcut (korunur):
  calculated: CalculatedDocument;
  uiStateChanged: InvoiceUIState;
  typeChanged: { type: string; profile: string; previousType: string; previousProfile: string };
  profileChanged: { profile: string; type: string; previousProfile: string; previousType: string };
  liabilityChanged: { liability: CustomerLiability | undefined; previousLiability: CustomerLiability | undefined };
  lineAdded: { index: number; line: SimpleLineInput };
  lineUpdated: { index: number; line: SimpleLineInput };
  lineRemoved: { index: number };
  warnings: ValidationWarning[];
  changed: SimpleInvoiceInput;

  // Mevcut (semantik daraltıldı): Sadece runtime exception.
  // Path-related rejection (READ_ONLY_PATH, INVALID_PATH, vb.) → 'pathError' event.
  error: Error;

  // YENİ (Faz 1):
  fieldChanged: {
    path: string;
    value: unknown;              // Applied value (auto-resolve sonrası gerçek değer)
    previousValue: unknown;
    requestedValue?: unknown;    // YENİ (D-12): Kullanıcının istediği değer (auto-force durumunda farklı)
    forcedReason?: string;       // YENİ (D-12): Auto-force sebebi (örn. 'isExport=true')
  };
  fieldActivated: { path: string; reason: string };
  fieldDeactivated: { path: string; reason: string };
  lineFieldChanged: {
    lineIndex: number;
    path: string;
    field: string;
    value: unknown;
    previousValue: unknown;
  };
  validationError: ValidationError[];   // Raw stream (path + code)

  // YENİ (D-Seçenek B): Path-based update reddi için ayrı event
  pathError: {
    code: 'INVALID_PATH' | 'READ_ONLY_PATH' | 'UNKNOWN_PATH' | 'INDEX_OUT_OF_BOUNDS'
        | 'PROFILE_EXPORT_MISMATCH' | 'PROFILE_LIABILITY_MISMATCH' | 'LIABILITY_LOCKED_BY_EXPORT';
    path: string;
    reason: string;
    requestedValue?: unknown;    // İhlal eden value (constraint check'te dolar)
  };
}
```

**`error` vs `pathError` vs `validationError` ayrımı (3 katmanlı hata hierarchy):**

| Event | Anlam | Tetikleyici | Örnek |
|---|---|---|---|
| `error` | Unexpected runtime exception | `calculate()` throw, validator throw | `calculateDocument()` zero division |
| `pathError` | `update()` çağrısı reddedildi | Path validation 4 katman + constraint check | `update('isExport', x)` → `READ_ONLY_PATH` |
| `validationError` | Business validation hatası | `validate()` validator pipeline raw stream | `manual-exemption-validator` KDV=0 hatası |

**Geri uyumluluk:** Mevcut `error` tüketicileri (M10 test'leri `setProfile` ihlal `error` dinliyor) 8h.3'te rewrite edilecek; 19 setter kaldırıldığı için zaten test rewrite kapsamında. Yeni testler `pathError` dinler. Production tüketici yok.

### 3.3 Tetiklenme/Tetiklenmeme Matrisi

| Event | Tetiklenir | Tetiklenmez |
|---|---|---|
| `fieldChanged` | Her başarılı `update()` (path + value validation geçti) ve diff != 0 | Path geçersiz, diff == 0, `addLine`/`removeLine` |
| `fieldChanged` `forcedReason` | Auto-force durumunda (D-12 isExport tip force) | Normal value setter |
| `fieldActivated` | UI state diff'inde `false→true` her geçiş | Diff yok, ilk constructor (henüz event listener yok) |
| `fieldDeactivated` | UI state diff'inde `true→false` her geçiş | Aynı |
| `lineFieldChanged` | `update(SessionPaths.lineX(i), …)` veya `updateLine(i, patch)` | `addLine` (yeni satır, `lineAdded` zaten emit), `update('type', …)` |
| `typeChanged` | `update('type', x)` ve diff != 0 (auto-resolve sonrası applied değer) | Diff == 0 |
| `liabilityChanged` | `update('liability', x)` ve diff != 0 + isExport=false | isExport=true (LIABILITY_LOCKED_BY_EXPORT pathError emit) |
| `lineAdded` | `addLine(line)` | `update()` yoluyla satır eklenmez |
| `changed` | Her başarılı mutation (update / addLine / updateLine / removeLine / setLines) | Path geçersiz, diff == 0 |
| `calculated` | `calculate()` başarılı + lines.length > 0 | lines.length == 0, exception |
| `validationError` | Her `validate()` (autoValidate veya manuel) | (her zaman emit, errors boş bile olsa) |
| `warnings` | Aynı | Aynı |
| `pathError` | Path validation 4 katmanından biri reddederse | Geçerli `update()` |
| `error` | `calculate()` exception, validator throw | `update()` reddi (pathError) |

### 3.4 Mevcut Event'lerle Çakışma

**`changed` vs `fieldChanged`:** 
- `changed` snapshot (tüm `SimpleInvoiceInput`), tek event/update.
- `fieldChanged` granüler (sadece değişen path), tek event/update (multiple update sequence'inde her biri için bir tane).
- `update('type', 'TEVKIFAT')` her ikisini de emit eder, sıra: `fieldChanged` (6) → `changed` (13).

**`lineUpdated` vs `lineFieldChanged`:**
- `lineUpdated` mevcut snapshot (`{ index, line }`), `updateLine(i, patch)` çağrısında emit.
- `lineFieldChanged` granüler (`{ lineIndex, path, field, value, previousValue }`), her line-level update'te emit.
- **Davranış kuralı:** `update(SessionPaths.lineKdvPercent(0), 18)` → `lineFieldChanged` emit, `lineUpdated` **emit edilmez** (bu API line CRUD değil, field update). `updateLine(0, { kdvPercent: 18 })` → `lineUpdated` emit, `lineFieldChanged` de emit (her field için ayrı).

Bu davranış tasarımda **kilitli**, geliştirici neyin ne zaman tetiklendiğini bilmeli.

---

## 4. Line-Level FieldVisibility Detayı

### 4.1 LineFieldVisibility Tipi

```ts
export interface LineFieldVisibility {
  /** Line `kdvPercent === 0` ise true (manuel exemption code dropdown gösterilir) */
  showKdvExemptionCodeSelector: boolean;
  /** type=TEVKIFAT|TEVKIFATIADE|YTBTEVKIFAT|YTBTEVKIFATIADE ise true */
  showWithholdingTaxSelector: boolean;
  /** withholdingTaxCode === '650' ise dinamik percent input görünür */
  showWithholdingPercentInput: boolean;
  /** Profil IHRACAT veya tip IHRACKAYITLI ise satır delivery dropdown */
  showLineDelivery: boolean;
  /** type=IHRACKAYITLI + line.kdvExemptionCode='702' (GTİP zorunlu) */
  showCommodityClassification: boolean;
  /** type=IHRACKAYITLI + line.kdvExemptionCode='702' (ALICIDIBSATIRKOD zorunlu) */
  showAlicidibsatirkod: boolean;
  /** profile=EARSIVFATURA + type ∈ {TEKNOLOJIDESTEK, ILACTIBBI} ise IMEI/seri dropdown */
  showAdditionalItemIdentifications: boolean;
  /** profile=YATIRIMTESVIK ise harcama tipi (01-04) dropdown */
  showItemClassificationCode: boolean;
  /** profile=YATIRIMTESVIK + line.itemClassificationCode='01' (makine bilgisi) */
  showProductTraceId: boolean;
  /** profile=YATIRIMTESVIK + line.itemClassificationCode='01' (makine bilgisi) */
  showSerialId: boolean;
}
```

**Schematron / FIX-PLANI referansları (her kural):**
- `showKdvExemptionCodeSelector`: M11 self-exemption + B-NEW-13 (manual exemption matrix)
- `showWithholdingTaxSelector`: M2 + Schematron BR-OPT-AJ19
- `showWithholdingPercentInput`: B-NEW-04 (650 dinamik tevkifat)
- `showLineDelivery`: BR-OPT-DLY13, BR-OPT-DLY15
- `showCommodityClassification` + `showAlicidibsatirkod`: B-78.3 (IHRACKAYITLI+702 GTİP+ALICIDIBSATIRKOD)
- `showAdditionalItemIdentifications`: B-NEW-06 (TEKNOLOJIDESTEK IMEI), B-NEW-07 (ILACTIBBI seri)
- `showItemClassificationCode`: M3 (YATIRIMTESVIK harcama tipi)
- `showProductTraceId` / `showSerialId`: B-NEW-09 (YATIRIMTESVIK makine bilgisi `itemClassificationCode === '01'`)

### 4.2 `deriveLineFieldVisibility(line, doc, idx)` Algoritması

```ts
export function deriveLineFieldVisibility(
  line: SimpleLineInput,
  doc: Pick<SimpleInvoiceInput, 'type' | 'profile' | 'currencyCode'>,
  idx: number,
): LineFieldVisibility {
  // Mevcut deriveFieldVisibility'deki is* hesabı reuse:
  const flags = deriveTypeProfileFlags(doc.type, doc.profile);    // YENİ helper (extract from deriveFieldVisibility)

  return {
    showKdvExemptionCodeSelector:
      line.kdvPercent === 0
      && !flags.isYatirimTesvik   // YATIRIMTESVIK doc-level kdvExemptionCode fallback kullanır
      && !flags.isOzelMatrah,

    showWithholdingTaxSelector: flags.isTevkifat || flags.isTevkifatIade,

    showWithholdingPercentInput:
      (flags.isTevkifat || flags.isTevkifatIade)
      && line.withholdingTaxCode === '650',

    showLineDelivery: flags.isIhracat || flags.isIhracKayitli,

    showCommodityClassification:
      flags.isIhracKayitli && line.kdvExemptionCode === '702',

    showAlicidibsatirkod:
      flags.isIhracKayitli && line.kdvExemptionCode === '702',

    showAdditionalItemIdentifications:
      flags.isTeknolojiDestek || flags.isIlacTibbi || flags.isIdis,

    showItemClassificationCode: flags.isYatirimTesvik,

    showProductTraceId:
      flags.isYatirimTesvik && line.itemClassificationCode === '01',

    showSerialId:
      flags.isYatirimTesvik && line.itemClassificationCode === '01',
  };
}
```

**`deriveTypeProfileFlags` extract:** Mevcut `deriveFieldVisibility` (`invoice-rules.ts:250-289`) içindeki `isTevkifat`, `isIhracat`, `isYatirimTesvik` vb. boolean türetmeleri ayrı bir helper'a çıkarılır (`src/calculator/type-profile-flags.ts`). Hem `deriveFieldVisibility` hem `deriveLineFieldVisibility` aynı helper'ı kullanır → kural duplikasyonu yok.

### 4.3 `_uiState.lineFields` Array Senkronu

**Constructor'da:**
```ts
this._uiState.lineFields = this._input.lines.map((line, idx) =>
  deriveLineFieldVisibility(line, this._input, idx)
);
```

**`addLine(line)` sonrası:**
```ts
this._uiState.lineFields.push(deriveLineFieldVisibility(line, this._input, this._input.lines.length - 1));
```

**`removeLine(idx)` sonrası:**
```ts
this._uiState.lineFields.splice(idx, 1);
// Index kayar — array order korunur, kalan satırlar için re-derive gerekli mi?
// Cevap: HAYIR — line content değişmedi, sadece array index değişti.
// Ama doc-level değişen state varsa (örn. type değişimi) hepsi re-derive olur (aşağıda).
```

**`setLines(lines)` sonrası:**
```ts
this._uiState.lineFields = lines.map((line, idx) =>
  deriveLineFieldVisibility(line, this._input, idx)
);
```

**`update(SessionPaths.lineX(i), value)` sonrası:**
```ts
this._uiState.lineFields[i] = deriveLineFieldVisibility(this._input.lines[i], this._input, i);
```

**Doc-level değişim (`update('type', ...)` veya `update('profile', ...)` veya `update('liability', ...)`):**
```ts
// Tüm lineFields re-derive
this._uiState.lineFields = this._input.lines.map((line, idx) =>
  deriveLineFieldVisibility(line, this._input, idx)
);
```

**Diff hesabı (`fieldActivated`/`fieldDeactivated` için):** Eski `lineFields[i]` ile yeni `lineFields[i]` karşılaştırılır, her bool alanın geçişi event olarak emit edilir:

```ts
// Path örneği: 'lines[2].showKdvExemptionCodeSelector' (visibility path, value path değil)
this.emit('fieldActivated', {
  path: `lines[${idx}].showKdvExemptionCodeSelector`,
  reason: 'kdvPercent set to 0',
});
```

**Visibility path namespace:** Visibility event'lerinin path'i value path'lerinden ayrılır (`SessionPaths` map'inde olmayan, bu yüzden path validation skip edilir → bunlar sadece event payload'ı).

---

## 5. B-78 Parametre Köprüsü

### 5.1 `deriveB78Params()` Helper

**Konum:** `src/calculator/invoice-session.ts` içinde private method.

**İmza:**
```ts
private deriveB78Params(): {
  allowReducedKdvRate: boolean;
  ytbAllKdvPositive: boolean;
  hasGtip: boolean;
  hasAliciDibKod: boolean;
  has4171Code: boolean;
  ihracatPartyComplete: boolean;
  yolcuBuyerComplete: boolean;
}
```

### 5.2 Her Parametrenin Türetim Algoritması

**1. `allowReducedKdvRate: boolean` (B-78.1)**

`BuilderOptions.allowReducedKdvRate` (`src/types/builder-options.ts:16`) zaten mevcut. Session bu option'ı constructor'da alır:

```ts
constructor(options: InvoiceSessionOptions = {}) {
  this._allowReducedKdvRate = options.allowReducedKdvRate ?? false;  // Mimsoft tarafından opt-in
  // ...
}
```

`deriveB78Params()` içinde:
```ts
allowReducedKdvRate: this._allowReducedKdvRate
```

**Not:** Bu parametre türetilmez, **kullanıcı tarafından opt-in**. M4 self-exemption matrix kontrolü `validateInvoiceState` içinde zaten yapılıyor (`invoice-rules.ts:413-416`); session sadece flag'i geçirir. `reduced-kdv-detector.ts:18-57` farklı bir konuda (otomatik tespit), Faz 1 kapsamında kullanılmaz.

**2. `ytbAllKdvPositive: boolean` (B-78.2)**

YATIRIMTESVIK profili + tüm satırlarda hesaplanmış KDV > 0:

```ts
ytbAllKdvPositive: this._input.profile === 'YATIRIMTESVIK'
  ? (this._calculation?.lines?.every(l => (l.kdvAmount ?? 0) > 0) ?? false)
  : true   // Diğer profillerde irrelevant, true gönder ki rule trigger olmasın
```

**`_calculation` null durumu:** `lines.length === 0` veya `calculate()` çağrılmadıysa `_calculation` null. Bu durumda parametre `false` döner → validate rule trigger olur ama kullanıcı zaten lines eklemediği için diğer error'lar (line zorunluluğu) maskeleyecek. Edge case, test ile pin'lenir.

**3. `hasGtip: boolean` (B-78.3)**

```ts
hasGtip: this._input.lines.length > 0
  && this._input.lines.every(l => !!l.delivery?.gtipNo)
```

**Edge:** `lines.length === 0` durumunda `every` true döner — manuel false döndürmek gerekir (yukarıdaki guard).

**4. `hasAliciDibKod: boolean` (B-78.3)**

```ts
hasAliciDibKod: this._input.lines.length > 0
  && this._input.lines.every(l => !!l.delivery?.alicidibsatirkod)
```

**5. `has4171Code: boolean` (B-78.4)**

```ts
has4171Code: this._input.lines.some(l =>
  l.taxes?.some(t => t.code === '4171') ?? false
)
```

**6. `ihracatPartyComplete: boolean` (B-78.5)**

`validateInvoiceState` `invoice-rules.ts:447-450` kontrolünden ters okuma:

```ts
ihracatPartyComplete: !!this._input.sender?.name?.trim()
  && !!this._input.sender?.taxOffice?.trim()
```

**7. `yolcuBuyerComplete: boolean` (B-78.5)**

`invoice-rules.ts:452-455`:

```ts
yolcuBuyerComplete: !!this._input.buyerCustomer?.nationalityId?.trim()
  && !!this._input.buyerCustomer?.passportId?.trim()
```

### 5.3 Cache Stratejisi

**Karar:** Cache YOK (Faz 1). Her `validate()` çağrısında tam re-compute.

**Gerekçe:** Helper toplam ~7 boolean check, hepsi O(lines.length) max. 100 satırlık input için ~1ms üst sınır. Akıllı invalidation (sadece `lines` değiştiyse `hasGtip` re-compute) over-engineering. Performance baseline 8h.7.1 (zorunlu benchmark commit) sonrası ölçülür; threshold aşılırsa Faz 2/3'te eklenir.

---

## 6. Validator Pipeline Entegrasyonu

### 6.1 Validator Çağrı Sırası ve Pipeline (D-3 Düzeltmesi)

**D-3 Düzeltmesi:** Listener-aware lazy strategy **kaldırıldı (anti-pattern)**. Yeni strateji: **deterministic execution + `toInvoiceInput()` cache**. `validateCrossMatrix` her `validate()` çağrısında **koşulsuz** çalışır; mapper sonucu cache'lenerek tekrarlanan `_input` üzerinde mapper maliyeti elimine edilir.

```ts
private validate(): ValidationWarning[] {
  const b78Params = this.deriveB78Params();

  // 1) Tüm validator'ları paralel çalıştır (pure, sıra bağımsız)
  const errors: ValidationError[] = [];

  errors.push(...validateSimpleLineRanges(this._input));
  errors.push(...validateManualExemption(this._input));
  errors.push(...validatePhantomKdv(this._input));
  errors.push(...validateSgkInput(this._input));

  // 2) validateCrossMatrix — DETERMINISTIC (her zaman çalışır), mapper sonucu CACHE'lenir (§6.4)
  const invoiceInput = this.getCachedInvoiceInput();
  errors.push(...validateCrossMatrix(invoiceInput));

  // 3) Rules-based check (mevcut, B-78 parametreleri ile)
  const warnings = validateInvoiceState({
    type: this._input.type ?? '',
    profile: this._input.profile ?? '',
    currencyCode: this._input.currencyCode,
    exchangeRate: this._input.exchangeRate,
    billingReferenceId: this._input.billingReference?.id,
    hasPaymentMeans: !!this._input.paymentMeans,
    paymentMeansCode: this._input.paymentMeans?.meansCode,
    paymentAccountNumber: this._input.paymentMeans?.accountNumber,
    kdvExemptionCode: this._input.kdvExemptionCode,
    hasWithholdingLines: this._input.lines.some(l => !!l.withholdingTaxCode),
    hasBuyerCustomer: !!this._input.buyerCustomer,
    ytbNo: this._input.ytbNo,
    hasSevkiyatNo: !!this._input.sender?.identifications?.some(id => id.schemeId === 'SEVKIYATNO'),
    ...b78Params,    // YENİ: 7 B-78 parametre
  });

  // 4) ValidationError[] → ValidationWarning[] köprü (Faz 1)
  const bridged: ValidationWarning[] = errors.map(e => ({
    field: e.path ?? 'unknown',
    message: e.message,
    severity: 'error' as const,
    code: e.code,
  }));

  const all = [...warnings, ...bridged];
  this._uiState.warnings = all;

  // Event emit sırası §3.1 son satırları:
  this.emit('validationError', errors);
  this.emit('warnings', all);

  return all;
}
```

### 6.2 ValidationError ↔ ValidationWarning Köprü Detayı

**İki tip karşılaştırması:**

| Alan | `ValidationError` (validators) | `ValidationWarning` (invoice-rules) |
|---|---|---|
| Ana konum | `src/errors/ubl-build-error.ts:2-13` | `src/calculator/invoice-rules.ts:154-158` |
| `path` | `string?` | yok |
| `field` | yok | `string` |
| `message` | `string` | `string` |
| `severity` | yok (implicit error) | `'error' \| 'warning' \| 'info'` |
| `code` | `string` | yok (eklenir) |
| `expected` / `actual` | `string?` | yok |

**Köprü yönü:** `ValidationError` → `ValidationWarning`:
- `path` → `field` (1:1 map, path string olduğu gibi geçer)
- `severity: 'error'` (validator'lar hep error üretir, warning yok)
- `code` ek alan olarak `ValidationWarning`'e eklenir (geri uyumlu, mevcut tüketici kullanmaz)

**`ValidationWarning` interface güncellemesi:**
```ts
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;     // YENİ — bridged validator hatalarında dolar
}
```

### 6.3 Performance Riski (MR-1)

**Tahmin (per `update()` çağrısı, 100 satır input, autoValidate=true):**

| Aşama | Tahmini süre |
|---|---|
| Path parse + value setter | < 1ms |
| UI state diff (deriveFieldVisibility + 100×deriveLineFieldVisibility) | 1-3ms |
| `validateSimpleLineRanges` | 1-2ms |
| `validateManualExemption` | < 1ms |
| `validatePhantomKdv` | 1-2ms |
| `validateSgkInput` | < 1ms |
| `validateCrossMatrix` (cache hit, mapper atlanır) | 2-3ms |
| `validateCrossMatrix` (cache miss, mapper çalışır) | 5-10ms |
| `validateInvoiceState` | < 1ms |
| `deriveB78Params` | < 1ms |
| Event emit (10-15 event, JSON serialize yok) | < 1ms |
| **Toplam (cache hit, sequential update sonrası):** | **5-10ms** |
| **Toplam (cache miss, ilk update veya value değişikliği sonrası):** | **10-20ms** |

**Threshold:** Tek `update()` için **< 15ms** kabul (60fps form input için 16.67ms'lik frame budget'in altında).

**Benchmark commit (8h.7.1 ZORUNLU — D-7):** 8h.7 sonrası `__tests__/benchmarks/invoice-session.bench.ts` (vitest bench mode) eklenir. 100 satırlık input + 50 sequential `update()` çağrısı senaryosu. Threshold aşılırsa:
- `autoValidate: 'manual'` opsiyonu Faz 1'e taşınır (Mimsoft eager veya manual seçer)

### 6.4 `toInvoiceInput()` Cache Stratejisi (D-3)

**Strateji:** `validateCrossMatrix` her `validate()` çağrısında deterministik çalışır; mapper sonucu **reference equality cache** ile tekrarlanan dönüşümleri elimine eder.

**Implementation:**

```ts
private _invoiceInputCache?: { input: SimpleInvoiceInput; result: InvoiceInput };

private getCachedInvoiceInput(): InvoiceInput {
  // Reference equality: _input her başarılı update sonrası yeni reference
  // (immutable spread pattern garantisi — §1.2)
  if (this._invoiceInputCache?.input === this._input) {
    return this._invoiceInputCache.result;
  }

  const result = mapSimpleInvoiceInputToInvoiceInput(this._input);
  this._invoiceInputCache = { input: this._input, result };
  return result;
}

// Public toInvoiceInput() de aynı cache'i kullanır:
public toInvoiceInput(): InvoiceInput {
  return this.getCachedInvoiceInput();
}
```

**Cache invalidation:** Otomatik. `_input` her başarılı `update()` sonrası yeni reference alır (immutable spread, §1.2 path-targeted clone garantisi). Diff check (§1.3) `previousValue === newValue` ise mutation yapılmaz, cache de invalide olmaz — gereksiz mapper çağrısı yok.

**Hash compare YOK:** Reference equality basit + zero-cost. Karmaşık hash hesabı, collision riski, deep compare maliyeti yok.

**Cache hit oranı tahmini:** Sequential `update()` çağrılarında ardışık `validate()` çağrıları arasında `_input` değişmiyorsa cache hit. Tipik form akışı (kullanıcı bir field değiştirir → autoValidate çalışır) cache miss; ama `session.toInvoiceInput()` ve `session.validate()` ardışık çağrılırsa hit. Mimsoft `buildXml()` çağrısında ek hit (`buildXml` içinde `toInvoiceInput()` çağrılır).

**Faz 1 disiplini:** Cache TTL yok, max-size yok, weak reference yok. Tek-slot cache (en son `_input`). Memory footprint sabit (1 SimpleInvoiceInput + 1 InvoiceInput).

---

## 7. Test Stratejisi Detayı

### 7.1 Event Sequence Pattern Helper

**Dosya:** `__tests__/calculator/_helpers/record-events.ts`

```ts
import { InvoiceSession, SessionEvents } from '../../../src';

type EventRecord = { kind: keyof SessionEvents; payload: unknown };

const ALL_EVENT_NAMES: (keyof SessionEvents)[] = [
  'fieldChanged', 'fieldActivated', 'fieldDeactivated', 'lineFieldChanged',
  'typeChanged', 'profileChanged', 'liabilityChanged',
  'lineAdded', 'lineUpdated', 'lineRemoved',
  'uiStateChanged', 'changed',
  'calculated', 'warnings', 'validationError',
  'pathError', 'error',
];

export function recordEvents(session: InvoiceSession): EventRecord[] {
  const events: EventRecord[] = [];
  for (const eventName of ALL_EVENT_NAMES) {
    session.on(eventName, (payload: unknown) => {
      events.push({ kind: eventName, payload });
    });
  }
  return events;
}

export function expectEventSequence(
  events: EventRecord[],
  expected: Array<{ kind: keyof SessionEvents; matcher?: (payload: any) => boolean }>,
): void {
  expect(events).toHaveLength(expected.length);
  expected.forEach((exp, i) => {
    expect(events[i].kind).toBe(exp.kind);
    if (exp.matcher) expect(exp.matcher(events[i].payload)).toBe(true);
  });
}
```

### 7.2 Test Grupları (Detay, ~520 test)

| Grup | Test sayısı | Pattern |
|---|---|---|
| Path validation (geçerli/geçersiz path → `pathError` event + no-op) | 30 | parse error / unknown path / index out of bounds / read-only path |
| Doc-level update event sequence | 80 | her `SessionPaths` doc-level entry için update + event sırası |
| Line-level update event sequence | 100 | her `SessionPaths` line-level fonksiyon için update + event sırası |
| B-78 parameter derivation | 40 | `deriveB78Params` matrisi (her parametre için true/false case'leri) |
| Validator pipeline entegrasyonu | 80 | her 5 validator için session'da aktif çalıştığını ispat (pozitif + negatif) |
| LineFieldVisibility türetimi | 60 | her 10 alan × 6 senaryo (tip+profil kombinasyonları) |
| `fieldActivated`/`fieldDeactivated` diff | 50 | UI state geçişlerinde doğru emit (line + doc visibility) |
| Snapshot regression (M10 isExport) | 30 | mevcut isExport kontratı + yeni event sequence kontratı |
| **Liability + isExport davranışı (§11)** | **12** | D-9..D-12 testleri (READ_ONLY_PATH, LIABILITY_LOCKED_BY_EXPORT, forcedReason payload, auto-resolve) |
| Examples-matrix regression | 38 | seçilmiş 38 valid senaryo (baseline + key variant'lar) session üzerinden |
| **Toplam** | **520** | (D-9..D-12 testleri ile +12) |

### 7.3 Examples-matrix Converter Script (`scripts/example-to-session-script.ts`)

**Strateji (D-5):** **Dinamik import + object traversal** (AST parse değil).

**Gerekçe:** `tsx` runtime'da `input.ts` dosyasını dinamik import edip `SimpleInvoiceInput` nesnesi yüklemek tek satır. AST parse karmaşıklığı (TypeScript Compiler API runtime traversal) gereksiz — input'lar zaten typed object literal'ları.

**Algoritma:**

```ts
// scripts/example-to-session-script.ts
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { SessionPaths } from '../src/calculator/session-paths.generated';

async function convert(scenarioDir: string): Promise<string> {
  const inputModule = await import(pathToFileURL(`${scenarioDir}/input.ts`).href);
  const input = inputModule.default ?? inputModule.input;

  const lines: string[] = [
    `import { InvoiceSession, SessionPaths } from '../../../src';`,
    `import type { SimpleInvoiceInput } from '../../../src';`,
    ``,
    `export function buildViaSession(): InvoiceSession {`,
    `  const session = new InvoiceSession();`,
  ];

  // Doc-level field'lar (sıra: input'taki object literal sırası)
  for (const [key, value] of Object.entries(input)) {
    if (key === 'lines') continue;     // lines için addLine ayrı
    if (isPrimitive(value)) {
      lines.push(`  session.update(SessionPaths.${camelKey(key)}, ${literal(value)});`);
    } else {
      // Sub-object: her sub-field için ayrı update
      for (const [subKey, subValue] of Object.entries(value)) {
        const pathKey = `${camelKey(key)}${capitalize(subKey)}`;   // senderTaxNumber
        if (subValue !== undefined) {
          lines.push(`  session.update(SessionPaths.${pathKey}, ${literal(subValue)});`);
        }
      }
    }
  }

  // Lines: her satır için addLine + line-level update'ler
  for (const [idx, line] of (input.lines ?? []).entries()) {
    lines.push(`  session.addLine(${literal(line)});`);
  }

  lines.push(`  return session;`);
  lines.push(`}`);

  return lines.join('\n');
}
```

**Çıktı dosyası:** `examples-matrix/<senaryo>/session-script.ts` (her senaryo için bir tane).

**Test entegrasyonu:** `__tests__/examples-matrix/session-parity.test.ts` (yeni dosya):

```ts
describe('examples-matrix session parity', () => {
  for (const scenario of SELECTED_38_SCENARIOS) {
    it(`${scenario.id} via session produces same XML as direct builder`, async () => {
      const sessionMod = await import(`../../examples-matrix/${scenario.path}/session-script.ts`);
      const session = sessionMod.buildViaSession();
      const sessionXml = session.buildXml();

      const expectedXml = readFileSync(`examples-matrix/${scenario.path}/output.xml`, 'utf-8');
      expect(normalize(sessionXml)).toBe(normalize(expectedXml));
    });
  }
});
```

**SELECTED_38_SCENARIOS:** Master plan §2.7 38 senaryo seçimi:
- Her profilden baseline (15 profil → 15 senaryo)
- Key variant'lar: coklu-kdv, coklu-satir, doviz, exemption-code (5 senaryo)
- IHRACKAYITLI+702 (3 senaryo)
- YATIRIMTESVIK (3 senaryo)
- TEVKIFAT 650 dinamik (3 senaryo)
- IADE/TEVKIFATIADE (3 senaryo)
- KAMU IBAN/payment (3 senaryo)
- YOLCUBERABERFATURA (3 senaryo)

**Toplam:** ~38 senaryo, 8h.9 commit'inde converter ile otomatik script üretimi + parity test.

---

## 8. Atomik Commit Detay Planı

| Commit | Önkoşul | Çıktı | Test Δ | Süre |
|---|---|---|---|---|
| **8h.0** | — | Plan kopya (`audit/sprint-08h-plan.md` ← bu doküman), implementation log iskelet (`audit/sprint-08h-implementation-log.md`), AR-10 marker (`README.md` §8 başlık ekleme) | 0 | 0.5 gün |
| **8h.1** | 8h.0 | `scripts/generate-session-paths.ts` generator + `src/calculator/session-paths.generated.ts` (~600 satır) + `SessionPathMap` tip + `KNOWN_PATH_TEMPLATES` set + `READ_ONLY_PATHS` set + manuel `liability` entry + `scripts/__tests__/generate-session-paths.test.ts` (regression check) + `package.json` `prebuild`/`verify:paths` script'leri | +30 | 1.5 gün |
| **8h.2** | 8h.1 | `update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P]): void` core + `parsePath()` + `applyPathUpdate()` + path validation 4 katman + constraint check (PROFILE_*, LIABILITY_LOCKED_BY_EXPORT) + structured `pathError` event + `error` event semantic narrowing (sadece runtime exception) + diff detection (`isDeepStrictEqual`) | +50 | 1 gün |
| **8h.3** | 8h.2 | 19 setter kaldır (`setSender`, `setCustomer`, `setBuyerCustomer`, `setTaxRepresentativeParty`, `setType`, `setProfile`, `setLiability`, `setCurrency`, `setBillingReference`, `setPaymentMeans`, `setKdvExemptionCode`, `setOzelMatrah`, `setSgkInfo`, `setInvoicePeriod`, `setNotes`, `setId`, `setDatetime`, `setInput`, `patchInput`) + mevcut test rewrite (path-based pattern). Line CRUD korunur. **`setId`/`setDatetime` `onChanged` tutarsızlığı bu commit'te doğal çözülür** (S-5). M10 `setLiability` no-op davranışı `update('liability', x)` ile korunur (LIABILITY_LOCKED_BY_EXPORT pathError) | +200 | 1.5 gün |
| **8h.4** | 8h.3 | Field-level events (`fieldChanged`, `fieldActivated`, `fieldDeactivated`, `lineFieldChanged`) + event sıralaması (§3.1) + `recordEvents()` test helper + sıralama enforcement test + D-12 `requestedValue`/`forcedReason` payload entegrasyonu (auto-force isExport durumu) | +80 | 1 gün |
| **8h.5** | 8h.4 | `LineFieldVisibility` interface + `deriveLineFieldVisibility()` + `deriveTypeProfileFlags()` extract (mevcut `deriveFieldVisibility`'den) + `_uiState.lineFields[]` array senkron (constructor + `addLine`/`removeLine`/`setLines`/`update`) | +60 | 1 gün |
| **8h.6** | 8h.5 | `deriveB78Params()` private method + 7 parametre türetim algoritması + `validateInvoiceState` payload genişletme + `BuilderOptions.allowReducedKdvRate` constructor option | +40 | 0.5 gün |
| **8h.7** | 8h.6 | Validator pipeline entegrasyonu (5 validator: `validateSimpleLineRanges`, `validateManualExemption`, `validatePhantomKdv`, `validateSgkInput`, `validateCrossMatrix` deterministic) + `getCachedInvoiceInput()` reference equality cache + `ValidationError`↔`ValidationWarning` köprü (`ValidationWarning.code` opt) + `validationError` event (raw stream) | +80 | 1 gün |
| **8h.7.1** | 8h.7 | **ZORUNLU (D-7) — Performance benchmark.** `__tests__/benchmarks/invoice-session.bench.ts` — 100 line, 50 update sequence benchmark. Threshold 15ms/update. Cache hit/miss ayrımı. Threshold aşılırsa `autoValidate: 'manual'` opsiyonu eklenir (8h.8 öncesi). Bench raporu `audit/sprint-08h-benchmark.md` | +5 (bench) | 0.5 gün |
| **8h.8** | 8h.7.1 | `updateUIState()` `update()` her başarılı çağrısında otomatik tetikleme (mevcut dar kapsam genişler). Doc-level vs line-level visibility re-derive scope optimizasyonu. Liability path → tüm lineFields re-derive. | +20 | 0.5 gün |
| **8h.9** | 8h.8 | `scripts/example-to-session-script.ts` converter + `examples-matrix/<scenario>/session-script.ts` 38 senaryo otomatik üretim + `__tests__/examples-matrix/session-parity.test.ts` regression | +200 | 1 gün |
| **8h.10** | 8h.9 | `README.md` §8 AR-10 dokümantasyonu + `README.md` reactive session API rehberi (yeni alt-bölüm) + JSDoc örnekleri + Liability/isExport davranışı dokümantasyonu (§11 referansı) | docs | 0.5 gün |
| **8h.11** | 8h.10 | `CHANGELOG.md` v2.1.0 entry — BREAKING CHANGES (19 setter listesi + migration örneği + `error` event semantic değişiklik notu) + Added (path-based update, field-level events, line-level visibility, validator pipeline, B-78 köprü, `pathError` event) + Migration Guide alt-bölüm | docs | 0.5 gün |
| **8h.12** | 8h.11 | `audit/sprint-08h-implementation-log.md` finalize + `package.json` version bump (2.0.0 → 2.1.0) + git tag `v2.1.0` (commit'te değil, manuel adım) | docs | 0.5 gün |

**Toplam: 14 atomik commit** (D-7 zorunlulaştırması ile 8h.7.1 dahil).

**Süre tahmini:** 11 gün (1.5 hafta + 0.5 buffer). Master plan §2.9'daki 8-10 gün tahminini aşıyor; 8h.7.1 zorunlu olduğu için daralmaz.

**Paralelleştirme:** 8h.4 → 8h.5 → 8h.6 → 8h.7 mantıksal sıralı ama 8h.5 ve 8h.6 paralel commit'lenebilir (farklı dosyalar, çakışma yok). 8h.10 → 8h.11 → 8h.12 docs zinciri sıralı.

---

## 9. Çözülmüş Tasarım Kararları (D-1..D-12)

Tüm tasarım soruları Berkay tarafından çözüldü; tasarım kilitli, açık soru kalmadı.

| ID | Soru | Berkay Kararı | Etki |
|---|---|---|---|
| **D-1** | Path parser kütüphanesi vs in-house? | **In-house** — 50 satırlık state machine | `package.json` minimalist disiplini korunur, yeni dependency yok |
| **D-2** | Deep clone vs path-targeted clone? | **Path-targeted** | Mevcut spread pattern korunur, performance + cache reference equality için kritik |
| **D-3** | `validateCrossMatrix` çağrı stratejisi | **Deterministic + cache** (listener-aware DEĞİL) | Her `validate()`'te koşulsuz çalışır; `getCachedInvoiceInput()` reference equality ile mapper maliyeti elimine edilir |
| **D-4** | Event sıralaması tasarımda kilitlenir mi? | **Evet, kilitli** | §3.1 18 adımlı sıra geri-alınamaz; test ile enforce |
| **D-5** | Examples-matrix converter parser | **Dinamik import + object traversal** | AST parse over-engineering; `tsx` runtime'da `input.ts` direkt yüklenir |
| **D-6** | Sub-object opsiyonel field create timing | **İlk sub-field set'inde nesne create** | Validator partial paymentMeans için warning verir (`meansCode` zorunlu) |
| **D-7** | Benchmark commit zorunlu mu opsiyonel mi? | **ZORUNLU** | 8h.7.1 commit listesinde; threshold 15ms/update; aşılırsa `autoValidate: 'manual'` Faz 1'e taşınır |
| **D-8** | `update()` overload — tek imza vs çift imza? | **Tek generic imza** | `update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P])` |
| **D-9** | Liability API: `update()` mi, `setLiability()` mi? | **`update(SessionPaths.liability, x)`** | `SessionPaths.liability` manuel entry; `setLiability()` setter kaldırılır (8h.3); M10 LIABILITY_LOCKED_BY_EXPORT |
| **D-10** | isExport read-only? | **Evet, read-only** | `update('isExport', x)` → `pathError` (`READ_ONLY_PATH`); constructor option-only |
| **D-11** | Profile-liability mismatch davranışı | **Mevcut `setProfile` davranışı korunur** | `pathError` (`PROFILE_LIABILITY_MISMATCH` / `PROFILE_EXPORT_MISMATCH`) + no-op |
| **D-12** | Type auto-force on isExport | **Auto-force korunur + structured event** | `fieldChanged.requestedValue` + `fieldChanged.forcedReason` payload (M10 davranışı + UX bilgi) |

**Ek karar (Claude): `error` event tip stratejisi.**

**Karar: Seçenek B — Ayrı `pathError` event.**

`error` event semantik olarak daraltıldı (sadece runtime exception). Path-related rejection için yeni `pathError` event açıldı. 3 katmanlı net hierarchy: `error` (exception) / `pathError` (update reddi) / `validationError` (business validation).

**Gerekçe:**
1. **Tip güvenliği:** Discriminated union (`Error | { code, ... }`) TypeScript'te runtime check'e zorlar (`'code' in payload`); IDE autocomplete bozulur. Ayrı event ile her handler tek tip alır.
2. **Semantik temizlik:** `error` = beklenmeyen exception, `pathError` = reactive akışın kendi reddedilen-update kanalı. Karışıklık yok.
3. **3 katmanlı hierarchy:** `error` / `pathError` / `validationError` ayrımı tutarlı; her hata kategorisi kendi event'inde.
4. **Geri uyumluluk:** Mevcut `error` tüketicileri (M10 test'leri `setProfile` ihlal `error` dinliyor) 8h.3'te rewrite edilecek; 19 setter kaldırıldığı için zaten test rewrite kapsamında. Production tüketici yok.
5. **Karar geri-alınamaz disiplin:** Faz 1 sonrası kilitlenecek bir karar olduğu için en temiz seçenek tercih edildi.

---

## 10. Risk ve Belirsizlikler (Faz 1)

Master plan §2.10'daki R1-R6 + Faz 1'e özel yeni riskler:

### Master plan'dan devam eden riskler

| ID | Risk | Mitigation (Faz 1 detayı) |
|---|---|---|
| **R1** | `update()` performance | 8h.7.1 ZORUNLU benchmark commit (D-7); threshold 15ms/update; aşılırsa `autoValidate: 'manual'` Faz 1'e taşınır |
| **R2** | `SessionPaths` ↔ `simple-types.ts` sync | `npm run verify:paths` `prebuild`'de + CI'da çalışır; drift CI fail (8h.1 commit kapsamı) |
| **R3** | `validateCrossMatrix` mapper maliyeti | D-3 deterministic + reference equality cache (§6.4); cache hit'te mapper atlanır; cache miss'te ~5-10ms |
| **R4** | Examples-matrix converter dinamik import güvenilirliği | 8h.9'da `tsx` runtime parity test 38 senaryo üzerinde; mismatch tek bir senaryoda bile fail |
| **R5** | `lines.length === 0` validator davranışı | Her validator için `lines.length === 0` test case (8h.7) — phantom-kdv yanıltıcı warning üretirse fix |
| **R6** | `update('lines', x)` yasaklı path | Path validation Katman 3'te (`KNOWN_PATH_TEMPLATES` map'te `lines` doc-level entry yok) reject |

### Faz 1'e özel yeni riskler

| ID | Risk | Mitigation |
|---|---|---|
| **R7** | Generator script TypeScript Compiler API kullanımı karmaşık olabilir (interface referans çözümü, JSDoc traverse) | 8h.1'de regression test: generator output stable (deterministic), iki kez çalıştırınca aynı output. Snapshot test. |
| **R8** | `deriveTypeProfileFlags` extract mevcut `deriveFieldVisibility` davranışını değiştirebilir (refactor regression) | 8h.5 öncesi mevcut `invoice-rules.test.ts` (124 satır) + `b67-b78-invoice-rules.test.ts` (138 satır) yeşil olmalı. Ekstrakt sonrası aynı test'ler çalışır. |
| **R9** | `_uiState.lineFields` array senkronu doc-level + line-level değişimde tutarsız kalabilir (örn. `update('type', x)` sonrası lineFields re-derive edilmezse stale visibility) | 8h.5 + 8h.8'de explicit re-derive: doc-level path (type/profile/liability) → tüm lineFields re-derive, line-level path → sadece `lineFields[i]` |
| **R10** | ~~`error` event union tip~~ | **Çözüldü (Seçenek B):** Ayrı `pathError` event ile tip güvenliği temiz. Riski azaldı. |
| **R11** | `update('id', x)` ve `update('datetime', x)` artık `validate()` tetikler — mevcut snapshot test'lerinde bu davranış değişikliği regression olabilir | 8h.3'te test rewrite kapsamında her id/datetime update sonrası warnings emit kontrol edilir; validator zaten id/datetime için kural üretmiyor (sadece input geçer). |
| **R12** | `getCachedInvoiceInput()` cache invalidation sessizce başarısız olursa stale `InvoiceInput` ile validateCrossMatrix yanlış sonuç verebilir | Cache invalidation tek koşul: `_input` reference değişimi. Immutable spread pattern (§1.2) bu garantiyi sağlar. Test: `update()` sonrası `toInvoiceInput()` her zaman taze sonuç (regression test 8h.7). |
| **R13** | D-12 `requestedValue` / `forcedReason` payload Mimsoft tarafında tutulmazsa kullanıcı "neden seçimim engellendi" anlayamaz | 8h.10 README API rehberinde örnek UI flow + 8h.4 test'lerinde forcedReason payload doğrulaması zorunlu |

---

## 11. Liability ve isExport Davranışı (D-9..D-12)

Bu bölüm session-level state olan `liability` ve `isExport` parametrelerinin yeni reactive API'ye nasıl entegre olduğunu detaylar. Bu davranış M10 test kontratını korur (mevcut isExport readonly + setLiability no-op semantiği).

### 11.1 isExport (Constructor-locked, readonly)

**Karar (D-10):** Constructor-only, readonly. `update()` ile değiştirilemez.

**Constructor:**
```ts
constructor(options: InvoiceSessionOptions = {}) {
  this._isExport = options.isExport ?? false;     // readonly, atama tek nokta
  // ...
}
```

**Update reddi:** `update('isExport', x)` çağrısı path validation Katman 2'de reddedilir:
```ts
{ code: 'READ_ONLY_PATH', path: 'isExport', reason: 'isExport is constructor-only and immutable' }
```

`SessionPaths` map'te `isExport` entry **yok**. `READ_ONLY_PATHS: Set<string>` set'inde `'isExport'` var (generator output, §2.2).

**M2 identity (IHRACAT/ISTISNA):**
- `isExport=true` → constructor'da profil `IHRACAT`, tip `ISTISNA` zorlanır (mevcut `invoice-session.ts:117-130` davranışı korunur).
- `isExport=true` ile `update('profile', 'TICARIFATURA')` → `pathError` (`PROFILE_EXPORT_MISMATCH`) + no-op.
- `isExport=true` ile `update('type', 'SATIS')` → otomatik `'ISTISNA'`'ya force; `fieldChanged.requestedValue='SATIS'`, `fieldChanged.value='ISTISNA'`, `fieldChanged.forcedReason='isExport=true'` (D-12).

**M10 kontratı:** `isExport=true` session'da `update('liability', x)` no-op + `pathError` (`LIABILITY_LOCKED_BY_EXPORT`).

### 11.2 liability (Path-managed, runtime)

**Karar (D-9):** `update(SessionPaths.liability, value)` ile yönetilir.

**SessionPaths entry (manuel append, §2.2):**
```ts
/**
 * Set the customer liability (e-invoice / e-archive enrolment).
 * Note: ignored when session was created with isExport=true (M10 contract).
 * Expected type: 'einvoice' | 'earchive' | undefined
 */
liability: 'liability',
```

**Geçerli değerler:** `'einvoice' | 'earchive' | undefined` (`SessionPathMap['liability']` tipi `CustomerLiability | undefined`).

**Update davranışı:**

```ts
session.update(SessionPaths.liability, 'earchive');
// 1. Path validation: 'liability' KNOWN_PATH_TEMPLATES'de var, geçerli
// 2. Constraint check: isExport=true ise → pathError (LIABILITY_LOCKED_BY_EXPORT) + no-op
// 3. isExport=false ise: _liability mutate
// 4. Auto-resolve: profil 'TICARIFATURA' ise → 'EARSIVFATURA'a otomatik geçiş
//    (mevcut setLiability auto-resolve davranışı, invoice-session.ts:200-207)
// 5. Event emit:
//    - fieldChanged: { path: 'liability', value: 'earchive', previousValue: 'einvoice' }
//    - profileChanged (eğer auto-resolve tetiklendi): { profile: 'EARSIVFATURA', previousProfile: 'TICARIFATURA', ... }
//    - liabilityChanged: { liability: 'earchive', previousLiability: 'einvoice' }
//    - uiStateChanged, changed, calculated, validationError, warnings (sırası §3.1)
```

**`setLiability()` setter kaldırılır:** 8h.3 commit kapsamında. Mevcut tüketici (M10 test) `update(SessionPaths.liability, x)` ile rewrite edilir.

### 11.3 Auto-Resolve Davranışı

Mevcut session'daki tip↔profil↔liability uyumsuzluk otomatik çözümü korunur. `update()` çağrısında auto-resolve şu sırayla işler (event sıralaması §3.1 adım 4):

| Tetikleyici update | Auto-resolve | Mevcut kaynak |
|---|---|---|
| `update('type', x)` | Profil uyumsuzsa `resolveProfileForType` ile otomatik geçiş | `invoice-session.ts:240-260` |
| `update('profile', x)` | Tip uyumsuzsa `resolveTypeForProfile` ile otomatik geçiş | `invoice-session.ts:266-305` |
| `update(SessionPaths.liability, x)` | Profil uyumsuzsa `resolveProfileForLiability` ile otomatik geçiş | `invoice-session.ts:200-207` |
| `update('type', x)` `isExport=true` | Tip otomatik `'ISTISNA'`'ya force (M10) | `invoice-session.ts:117-130` |
| `update('profile', x)` `isExport=true` ile çakışırsa | `pathError` (PROFILE_EXPORT_MISMATCH) + no-op (auto-resolve değil) | Mevcut `setProfile` davranışı |

**D-12 detayı (`update('type', 'SATIS')` `isExport=true` durumu):**

```ts
// Auto-force tetiklenir (M10 kontratı: isExport=true → tip ISTISNA)
session.update('type', 'SATIS');

// Event payload:
{
  path: 'type',
  value: 'ISTISNA',              // Applied (force sonrası gerçek değer)
  previousValue: 'ISTISNA',      // Önceki değer (zaten ISTISNA idi)
  requestedValue: 'SATIS',       // Kullanıcı ne istedi (force öncesi input)
  forcedReason: 'isExport=true', // Neden zorlandı
}

// Diff: value === previousValue ise NORMAL diff check no-op döndürür
// AMA D-12'de force durumu ayrıdır: requestedValue !== applied value ise
// fieldChanged emit edilir (kullanıcıya force bilgilendirmesi için).
// Bu özel davranış 8h.4'te implement edilir.
```

**Implementation notu:** Diff check (§1.3) genel kuralı `previousValue === newValue` ise no-op; ancak D-12 force durumunda kullanıcı seçimi engellendi bilgisi için `fieldChanged` yine emit edilir (force edilmiş value zaten previousValue ile eşit olsa bile). Bu, diff check'in özel kollu hali.

**Auto-resolve sonrası event akışı:**
- Birden fazla `fieldChanged` emit edilir: hem tetikleyici field (`type`) hem auto-resolve sonucu field (`profile`).
- `requestedValue` sadece tetikleyici field'da dolar (auto-resolve sonucu fieldChanged'larda dolmaz).
- Snapshot event'leri (`typeChanged`, `profileChanged`, `liabilityChanged`) auto-resolve sonrası applied değerlerle emit edilir.

### 11.4 Test Kontratı (12 yeni test)

**Mevcut test (M10 isExport readonly, korunur):**
- Constructor `isExport=true` → profil IHRACAT, tip ISTISNA assertion (mevcut)
- `setLiability()` `isExport=true` ise no-op (mevcut, **8h.3'te `update()` ile rewrite**)

**Yeni testler (8h.3 + 8h.4 commit'lerinde):**

| # | Test | Beklenen davranış |
|---|---|---|
| 1 | `update('isExport', true)` | `pathError` (`READ_ONLY_PATH`) + state değişmez |
| 2 | `update('isExport', false)` `isExport=true` session'da | `pathError` (`READ_ONLY_PATH`) + state değişmez |
| 3 | `update(SessionPaths.liability, 'earchive')` `isExport=true` session'da | `pathError` (`LIABILITY_LOCKED_BY_EXPORT`) + state değişmez |
| 4 | `update(SessionPaths.liability, 'einvoice')` `isExport=false` session'da | `liabilityChanged` emit, profil otomatik resolve |
| 5 | `update(SessionPaths.liability, 'earchive')` profil `TICARIFATURA` ise | Profil `EARSIVFATURA`'a auto-resolve, `profileChanged` emit |
| 6 | `update('profile', 'TEMELFATURA')` `isExport=true` session'da | `pathError` (`PROFILE_EXPORT_MISMATCH`) + state değişmez |
| 7 | `update('profile', 'TICARIFATURA')` `liability='earchive'` ise | `pathError` (`PROFILE_LIABILITY_MISMATCH`) + state değişmez |
| 8 | `update('type', 'SATIS')` `isExport=true` session'da | `fieldChanged` emit, `value='ISTISNA'`, `requestedValue='SATIS'`, `forcedReason='isExport=true'` |
| 9 | `update('type', 'IADE')` `isExport=true` session'da | Aynı (force ISTISNA) |
| 10 | `update('type', 'TEVKIFAT')` `isExport=false` session'da | `fieldChanged` emit, `value='TEVKIFAT'`, `requestedValue` yok (force değil) |
| 11 | Auto-resolve sırası: `update('type', 'IADE')` `profile=TICARIFATURA` ise | `fieldChanged: type=IADE` → `fieldChanged: profile=TEMELFATURA` (auto-resolve) → `typeChanged` → `profileChanged` |
| 12 | Event sıralaması: `update(SessionPaths.liability, 'earchive')` ardından `fieldChanged` → `profileChanged` (auto-resolve) → `liabilityChanged` → `uiStateChanged` → `changed` → `validationError` → `warnings` | §3.1 sıra enforcement |

---

## Rapor

- **Tasarım kilitli:** ✅ D-1..D-12 12/12 çözüldü, açık soru kalmadı.
- **Eklenen bölüm:** §11 Liability ve isExport Davranışı (~165 satır). Önceki tasarımda eksikti.
- **Güncellenen bölümler:** §1.4 (4 katman + constraint check + hata kodları listesi), §2.1+§2.2 (manuel append liability + READ_ONLY_PATHS), §3.1 (event sıralaması 17 → 18 adım, auto-resolve dahil), §3.2 (event payload `pathError` + `requestedValue`/`forcedReason`), §3.3 (tetiklenme matrisi pathError + forcedReason), §6.1 + §6.4 (D-3 düzeltmesi: deterministic + reference equality cache, listener-aware kaldırıldı), §7.1 (recordEvents pathError eklendi), §7.2 (test grupları +12 D-9..D-12 testi), §8 (14 commit, 8h.7.1 zorunlu D-7), §9 (Açık Sorular → Çözülmüş Tasarım Kararları, 12 sorunun tablosu + Claude'un Seçenek B kararı), §10 (R10 azaltıldı, R12-R13 yeni eklendi), Rapor.
- **Açık soru:** **0** (12/12 çözüldü).
- **Commit listesi:** **14 commit** (8h.7.1 ZORUNLU dahil).
- **Test sayısı:** 508 → **520** (D-9..D-12 12 test eklendi).
- **`error` event kararı:** **Seçenek B (ayrı `pathError` event).** Gerekçe §9'da detaylı (5 madde): tip güvenliği, semantik temizlik, 3 katmanlı hierarchy, geri uyumluluk, geri-alınamaz disiplin.
- **Yeni risk:** R12 (cache invalidation regression — düşük risk, immutable spread pattern garantisi), R13 (D-12 forcedReason Mimsoft tarafında kullanılması gerekli — UX riski, dokümantasyon mitigasyonu).
- **R10 azaldı:** Seçenek B kararı ile `error` event union tip karmaşası giderildi.

**Sonraki adım:** Bu finalize tasarım onaylandıktan sonra **Sprint 8h Implementation Promptu** yazılır. Implementation prompt'u 14 atomik commit'i adım adım kod seviyesinde uygulamaya yönlendirir. Master plan kopya disiplini: 8h.0 commit'inde bu doküman `audit/sprint-08h-plan.md` adresine kopyalanır (sprint plan kalıbı, kullanıcı memory'sinde sabitli pattern).
