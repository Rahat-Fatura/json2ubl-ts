---
karar: Reactive InvoiceSession 2-Faz Master Plan (Sprint 8h, 8i)
hedef: Enterprise session management — path-based update, field-level events, suggestion engine
versiyon-akışı: v2.0.0 → v2.1.0 (Faz 1) → v2.2.0 (Faz 2)
durum: Plan (kod değişikliği yok) — revize edilmiş (S-1..S-7 kararları entegre)
tarih: 2026-04-27 (revize: 2026-04-27)
referans: audit/invoice-session-analiz.md, audit/reactive-session-design-notes.md
---

# Reactive InvoiceSession — 2-Faz Master Plan

## 0. Context

Mevcut `InvoiceSession` (~%45 reactive) iskelet sahibi: 11 event, auto-calculate zinciri, tip↔profil otomatik çözümleme, doc-level `FieldVisibility` (19 boolean). Üretim pipeline'ı (builder/calculator/validator/mapper) session'a bağlı değil — tek tüketici 58 satırlık test. Eksik olan **yüzey granülerliği**: path-based update, field-level events (line-level dahil), suggestion akışı, `validateInvoiceState` B-78 parametre köprüsü, validator pipeline (manual-exemption, phantom-kdv, line-range, sgk-input, cross) entegrasyonu.

Hedef vizyon (Berkay): **"Enterprise session management ve builder. Tüm ihtimalleri destekleyen, tüm validasyonları doğru yönlendirme eventleriyle kapsayan, ön yüze çok az iş bırakan bir kütüphane."** Kullanıcı bir alan değiştirir → kütüphane "şu görünür / zorunlu / izinli" event'i emit eder → frontend form'u event'lere göre render eder → hesap tamamen kütüphanede.

Mimsoft Next.js dev uygulaması (30+ setter çağrısı) yeniden yazılacak; **kütüphane breaking serbest**, v2.x minor bump zinciri uygulanır.

---

## 0.1 Karar Kayıtları (S-1..S-7)

Master plan v1'deki açık soruların Berkay tarafından verilen cevapları:

| ID | Konu | Karar | Gerekçe |
|---|---|---|---|
| **S-1** | AR-9 vs AR-10 isimlendirme | **(a)** AR-9 vision/intent olarak kalır (mevcut tasarım notu); **AR-10** concrete realization olarak eklenir. README §8'de iki ayrı satır. | AR-9 zaten Sprint 8c'de isim konuldu — vision korunur; AR-10 onun implementation'ı. |
| **S-2** | Path validation davranışı | **(b)** Geçersiz path → `error` event emit + no-op. Throw yok, console warn yok. | Reactive akışta exception yutulmaz; error event tipiyle tutarlı. |
| **S-3** | Suggestion ↔ Validator overlap | Mevcut "warning" davranışı korunur; "error" yapılmaz. Faz 2'de suggestion ek katman olarak gelir, validator warning ile **paralel** çalışır. UI'da iki ayrı mesaj yan yana. | Kullanıcı manuel teknik bilgi seçmek isteyebilir; warning + suggestion farklı kanallar. |
| **S-4** | Faz 3 kapsam | **KAPSAM DIŞI.** Master plan 2 faz (Faz 1 + Faz 2). v2.3.0 yok. | Kütüphane framework-agnostic; dirty/touched React tarafında form library'siyle çözülür. |
| **S-5** | `setId`/`setDatetime` `onChanged` | Standart akışa girer. `update('id', x)` ve `update('datetime', x)` `validate()` tetikler. | Eski setter kaldırıldığı için tutarsızlık doğal olarak çözülür. |
| **S-6** | Examples-matrix recreation | Otomatik converter (`scripts/example-to-session-script.ts`). 164 senaryo manuel değil. | 1 günlük yatırım vs 1-2 gün manuel + hata riski; converter aynı zamanda regression aracı. |
| **S-7** | `update()` tip güvenliği | **(b)** Generic tip türetimi. `update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P])`. | Mimsoft DX kritik; SessionPaths `as const`, generic tip türetilebilir. |

---

## 1. Vizyon ve Final API

### 1.1 Final API Kontratı (Faz 2 sonu)

```ts
// Kullanıcı yüzeyi
const session = new InvoiceSession({ initialInput?, isExport?, autoCalculate? });

// Tek mutate noktası
session.update(SessionPaths.type, 'TEVKIFAT');
session.update(SessionPaths.lineKdvPercent(0), 18);
session.update(SessionPaths.lineWithholdingCode(2), '650');

// Line CRUD (path dışı, array operations)
session.addLine(line); session.updateLine(idx, patch); session.removeLine(idx); session.setLines(lines);

// Aksiyon API'si (mevcut korunur)
session.calculate(); session.validate(); session.toInvoiceInput(); session.buildXml({ validationLevel? });

// Helper'lar (mevcut korunur)
session.getAllowedProfiles(type?); session.getAllowedTypes(profile?);
session.getAvailableExemptions(); session.getAvailableBillingDocumentTypeCodes();

// Reactive akış
session.on('fieldChanged', ({ path, value, previousValue }) => …);
session.on('fieldActivated', ({ path, reason }) => ui.show(path));
session.on('fieldDeactivated', ({ path }) => ui.hide(path));
session.on('lineFieldChanged', ({ lineIndex, path, value }) => …);
session.on('suggestion', ({ path, value, reason, severity }) => ui.suggest(...));   // Faz 2
session.on('validationError', (errors: ValidationError[]) => …);                    // birleşik
session.on('uiStateChanged', (uiState) => …);                                       // mevcut korunur

// Mevcut snapshot event'leri (korunur ama field-level event'ler onları tamamlar)
session.on('typeChanged' | 'profileChanged' | 'liabilityChanged' | 'lineAdded' | 'lineUpdated' | 'lineRemoved' | 'calculated' | 'changed' | 'warnings' | 'error', …);
```

### 1.2 SessionPaths Path Map (otomatik türetilmiş)

```ts
export const SessionPaths = {
  // Doc-level string sabitler
  type: 'type',
  profile: 'profile',
  id: 'id',
  datetime: 'datetime',
  currencyCode: 'currencyCode',
  exchangeRate: 'exchangeRate',
  kdvExemptionCode: 'kdvExemptionCode',
  ytbNo: 'ytbNo',
  ytbIssueDate: 'ytbIssueDate',
  notes: 'notes',
  xsltTemplate: 'xsltTemplate',

  // Sub-object string sabitler
  senderTaxNumber: 'sender.taxNumber',
  senderName: 'sender.name',
  senderTaxOffice: 'sender.taxOffice',
  // … (sender, customer, buyerCustomer, taxRepresentativeParty, paymentMeans, billingReference,
  //    invoicePeriod, sgk, onlineSale, eArchiveInfo, ozelMatrah, orderReference altında ~60 entry)

  // Line-level fonksiyonlar (lineIndex parametreli)
  lineName: (i: number) => `lines[${i}].name`,
  lineQuantity: (i: number) => `lines[${i}].quantity`,
  linePrice: (i: number) => `lines[${i}].price`,
  lineKdvPercent: (i: number) => `lines[${i}].kdvPercent`,
  lineKdvExemptionCode: (i: number) => `lines[${i}].kdvExemptionCode`,
  lineWithholdingCode: (i: number) => `lines[${i}].withholdingTaxCode`,
  lineWithholdingPercent: (i: number) => `lines[${i}].withholdingTaxPercent`,
  lineGtipNo: (i: number) => `lines[${i}].delivery.gtipNo`,
  lineAliciDibKod: (i: number) => `lines[${i}].delivery.alicidibsatirkod`,
  lineItemClassificationCode: (i: number) => `lines[${i}].itemClassificationCode`,
  lineProductTraceId: (i: number) => `lines[${i}].productTraceId`,
  lineSerialId: (i: number) => `lines[${i}].serialId`,
  // … (lines altında ~25 fonksiyon)

  // Çift-indeksli (line.taxes[ti], line.additionalItemIdentifications[ti])
  lineTaxCode: (i: number, ti: number) => `lines[${i}].taxes[${ti}].code`,
  lineTaxPercent: (i: number, ti: number) => `lines[${i}].taxes[${ti}].percent`,
  lineAdditionalIdScheme: (i: number, ti: number) => `lines[${i}].additionalItemIdentifications[${ti}].schemeId`,
  lineAdditionalIdValue: (i: number, ti: number) => `lines[${i}].additionalItemIdentifications[${ti}].value`,
} as const;
```

**Path syntax kararı: bracket notation `lines[0].kdvPercent`.** Gerekçe: kütüphanedeki tüm validator'lar zaten bu formatta `ValidationError.path` üretiyor (`manual-exemption-validator.ts:44`, `phantom-kdv-validator.ts:49`, `simple-line-range-validator.ts:29`, `ihrackayitli-validator.ts:54`). Reactive session yeni bir convention koymuyor, mevcut convention'u tüketim yüzeyine taşıyor.

JSDoc her entry üzerinde — kütüphanenin formal field referansı.

**Generic tip güvenliği (S-7 kararı):** `SessionPaths` `as const` ile tutulur ve generic `SessionPathMap` tipine türetilir; `update<P extends keyof SessionPathMap>(path: P, value: SessionPathMap[P]): void` imzasıyla compile-time tip kontrolü sağlar. Mimsoft IDE'de `update(SessionPaths.type, 'TEVKIFAT')` autocomplete + value type-check görür.

**AR-10 isim:** "Path-based update + field-level events + suggestion engine implementation". AR-9 (vision/intent, Sprint 8c'de tasarım notu olarak konuldu) korunur, AR-10 onun concrete realization'ı olarak README §8'de ayrı satır eklenir.

### 1.3 Mimsoft Next.js Rewrite Akışı

Faz 1 sonrası Mimsoft UI mimarisi:

```ts
// 5-10 satırlık Mimsoft hook'u (kütüphanede değil)
function useInvoiceSession(initialInput?) {
  const session = useMemo(() => new InvoiceSession({ initialInput }), []);
  const [uiState, setUIState] = useState(session.uiState);
  useEffect(() => {
    session.on('uiStateChanged', setUIState);
    return () => session.off('uiStateChanged', setUIState);
  }, [session]);
  return { session, uiState };
}

// Form bileşeni
const { session, uiState } = useInvoiceSession();
session.update(SessionPaths.type, value);                    // tek API
{uiState.fields.showWithholdingTaxSelector && <WithholdingDropdown />}
{uiState.lineFields[0]?.showKdvExemptionCode && <ExemptionDropdown />}  // Faz 1 line-level
session.on('suggestion', ui.toast);                          // Faz 2
```

Faz 1 yeterli: form render path-based update + line-level visibility ile çalışır. Faz 2 ekler "kullanıcıyı yönlendiren" akışı (suggestion). Dirty/touched gibi UX state Mimsoft tarafında React form library'sine bırakılır.

---

## 2. Faz 1 (Sprint 8h, v2.1.0) — Çekirdek Reactive Session

### 2.1 Kapsam

1. **Eski setter ailesini kaldır** (breaking, kütüphane internal):
   - `setSender` (216-219), `setCustomer` (222-225), `setBuyerCustomer` (228-231), `setTaxRepresentativeParty`
   - `setType` (240-260), `setProfile` (266-305), `setLiability` (186-211)
   - `setCurrency` (347-351), `setBillingReference` (356-359), `setPaymentMeans` (362-365)
   - `setKdvExemptionCode` (370-373), `setOzelMatrah` (376-379), `setSgkInfo` (382-385)
   - `setInvoicePeriod` (388-391), `setNotes` (394-397), `setId` (400-402), `setDatetime` (405-407)
   - `setInput` (415-419), `patchInput` (424-430)
   - **Korunan:** `addLine` (310-315), `updateLine` (318-326), `removeLine` (329-336), `setLines` (339-342) — array operations için path-based mantıklı değil.

2. **`update(path, value)` API'si** — tek mutate gateway, generic tip türetimi (S-7).

3. **`SessionPaths` path map** — `simple-types.ts` SimpleInvoiceInput taranarak otomatik üretim (script + JSDoc).

4. **Field-level event'ler:** `fieldChanged`, `fieldActivated`, `fieldDeactivated`, `lineFieldChanged`.

5. **Line-level FieldVisibility** — her satır kendi visibility map'ini taşır.

6. **B-78 parametre köprüsü** — `validate()` artık tüm 7 parametreyi otomatik türetip geçirir.

7. **Validator pipeline entegrasyonu** — `manual-exemption-validator`, `phantom-kdv-validator`, `simple-line-range-validator`, `sgk-input-validator`, `cross-validators` her `update()` sonrası çalışır; sonuçlar `ValidationWarning[]` formatına köprülenip `validationError` event'inde yayılır.

8. **`updateUIState()` her mutate sonrası çalışır** — mevcut dar kapsam (sadece type/profile/currency/liability/setInput/patchInput) genişler.

9. **`setId`/`setDatetime` tutarsızlığı doğal olarak çözülür** (S-5) — eski setter'lar kaldırıldığı için `update('id', x)` / `update('datetime', x)` standart akışa girer ve `validate()` tetikler. Ayrı commit gerekmez, 8h.3 içinde dahil.

10. **Test rewrite** — 58 satır → ~600 satır (event sequence pattern).

### 2.2 SessionPaths Tasarım Detayı

**Türetim stratejisi:** `simple-types.ts` SimpleInvoiceInput'unu AST tarayan bir generator script (`scripts/generate-session-paths.ts`). Her field için:

- Doc-level (top-level primitive ya da `string | number | boolean`): string sabit (`'type'`, `'currencyCode'`).
- Sub-object (top-level alt-nesne, sender/customer/paymentMeans vb.): string sabit composite (`'sender.taxNumber'`, `'paymentMeans.iban'`).
- Array element (`lines[]`, `taxes[]`): fonksiyon (`(i: number) => 'lines[i].field'`).
- Çift-indeksli (`lines[i].taxes[ti]`): iki parametreli fonksiyon.

**Path validation (S-2 kararı):** `update(path, value)` çağrısında runtime check **etkin**. Geçersiz path (`SessionPaths` map'inde olmayan) → **`error` event emit + no-op**. Throw yok, console warn yok. Validator hiç çalıştırılmaz; event consumer hatayı işler. Gerekçe: reactive akışta exception yutulmaz, error event tipiyle tutarlı.

**Tip güvenliği (S-7):** Yukarıda §1.2 detaylı.

**Tahmini boyut:**
- ~30 doc-level string sabit
- ~25 line-level fonksiyon
- ~5 çift-indeksli fonksiyon
- Sub-object alanları: `sender` (12), `customer` (12), `buyerCustomer` (10), `taxRepresentativeParty` (3), `paymentMeans` (5), `billingReference` (3), `invoicePeriod` (2), `sgk` (4), `onlineSale` (8), `eArchiveInfo` (1), `ozelMatrah` (3), `orderReference` (2) ≈ 65 entry
- **Toplam ~125 entry**, JSDoc'lu, ~600 satır generated dosya.

### 2.3 Field-Level Event Tasarımı

```ts
type FieldChangedEvent = { path: string; value: unknown; previousValue: unknown };
type FieldActivatedEvent = { path: string; reason: string };
type FieldDeactivatedEvent = { path: string; reason: string };
type LineFieldChangedEvent = { lineIndex: number; path: string; field: string; value: unknown; previousValue: unknown };
```

| Event | Tetiklenme | Örnek |
|---|---|---|
| `fieldChanged` | Her `update()` çağrısında, value gerçekten değiştiyse | `update('type', 'TEVKIFAT')` → `{ path: 'type', value: 'TEVKIFAT', previousValue: 'SATIS' }` |
| `fieldActivated` | UI state diff'inde `false → true` geçişi olan her `showX` veya `requireX` alanı | `update('type', 'TEVKIFAT')` → `{ path: 'lines.*.withholdingTaxCode', reason: 'tevkifat selected' }` |
| `fieldDeactivated` | `true → false` geçişi | `update('profile', 'TEMELFATURA')` → `{ path: 'eArchiveInfo', reason: 'profile != EARSIVFATURA' }` |
| `lineFieldChanged` | `update(SessionPaths.lineKdvPercent(2), 0)` veya `updateLine` patch | `{ lineIndex: 2, path: 'lines[2].kdvPercent', field: 'kdvPercent', value: 0, previousValue: 18 }` |

**Mevcut 11 event ile çakışma:**
- `changed` (snapshot, `SimpleInvoiceInput`) korunur — geriye uyumlu coarse event.
- `fieldChanged` her mutate'ta ek olarak emit. `changed` üst seviye, `fieldChanged` granüler. `update('type', x)` her ikisini de fırlatır.
- `lineUpdated` (snapshot) korunur — yeni `lineFieldChanged` granüler tamamlayıcı.
- `typeChanged`/`profileChanged`/`liabilityChanged` korunur — alan-spesifik snapshot, mevcut tüketici (test) kırılmaz.

### 2.4 Line-Level FieldVisibility Tasarımı

Yeni tip:

```ts
interface LineFieldVisibility {
  showKdvExemptionCodeSelector: boolean;     // line.kdvPercent === 0 ise true
  showWithholdingTaxSelector: boolean;       // type=TEVKIFAT|TEVKIFATIADE
  showWithholdingPercentInput: boolean;      // withholdingTaxCode === '650' (dinamik)
  showLineDelivery: boolean;                 // IHRACAT, TEVKIFAT (sevkiyat) profil
  showCommodityClassification: boolean;      // IHRACKAYITLI+702 → GTİP zorunlu
  showAlicidibsatirkod: boolean;             // IHRACKAYITLI+702
  showAdditionalItemIdentifications: boolean;// EARSIVFATURA online satış (telefon/tablet)
  showItemClassificationCode: boolean;       // YATIRIMTESVIK
  showProductTraceId: boolean;               // YATIRIMTESVIK + itemClassificationCode='01'
  showSerialId: boolean;                     // YATIRIMTESVIK + itemClassificationCode='01'
}

interface InvoiceUIState {
  // mevcut alanlar (allowedProfiles, allowedTypes, fields, availableExemptions, …)
  fields: FieldVisibility;                   // doc-level (mevcut, korunur)
  lineFields: LineFieldVisibility[];         // YENİ — her satır için
  warnings: ValidationWarning[];
  // ek: visibility diff (Faz 1 internal)
}
```

**Doc-level vs line-level karar matrisi:**

| Alan | Doc-level | Line-level | Gerekçe |
|---|:-:|:-:|---|
| `showWithholdingTaxSelector` | ✅ (mevcut) | ✅ | Doc-level "varlık" + line-level "bu satırda görünür mü" |
| `showExemptionCodeSelector` | ✅ (mevcut, doc fallback) | ✅ | Line `kdvPercent===0` ise line-level true |
| `showLineDelivery` | ✅ (mevcut) | ✅ | Tip izin verir + satır exemption durumu |
| `showCommodityClassification` | ✅ (mevcut) | ✅ | IHRACKAYITLI tip + satır 702 kod uyumu |
| `showAdditionalItemIdentifications` | ✅ (mevcut) | ✅ | Profil EARSIVFATURA + line-level satış tipi |
| `requireIban` | ✅ (mevcut) | — | Doc-level (paymentMeans tek nesne) |
| `showOzelMatrah`, `showSgkInfo`, `showBuyerCustomer`, `showInvoicePeriod` | ✅ (mevcut) | — | Doc-level only |

**`deriveLineFieldVisibility(line, doc, idx)`:** her line için ayrı türetim fonksiyonu. `deriveFieldVisibility` (doc-level, mevcut) korunur; yeni fonksiyon onun yanında çalışır. `_uiState.lineFields` her line için bir entry tutar; `addLine`/`removeLine` array senkronu yapar.

### 2.5 Validator Pipeline Entegrasyonu

Mevcut: sadece `validateInvoiceState` (rules-based, B-78 paraleli) çağrılıyor; üstelik B-78 parametreleri geçirilmiyor.

Hedef: `validate()` sırası (her mutate sonrası çalışır):

```ts
private validate(): ValidationWarning[] {
  // 1) B-78 parametrelerini hesapla (mevcut input + calculation üzerinden)
  const b78Params = this.deriveB78Params();    // YENİ helper

  // 2) Tüm validator'ları paralel çalıştır, hepsini topla
  const errors: ValidationError[] = [
    ...validateSimpleLineRanges(this._input),
    ...validateManualExemption(this._input),
    ...validatePhantomKdv(this._input),
    ...validateSgkInput(this._input),
    ...validateCrossMatrix(this.toInvoiceInput()),    // tip köprü gerekir
  ];

  // 3) Rules-based check (mevcut, B-78 parametreleri ile)
  const warnings = validateInvoiceState({ ...currentState, ...b78Params });

  // 4) ValidationError[] → ValidationWarning[] köprü
  const bridged = errors.map(e => ({
    field: e.path ?? 'unknown',
    message: e.message,
    severity: 'error' as const,
    code: e.code,
  }));

  const all = [...warnings, ...bridged];
  this._uiState.warnings = all;
  this.emit('warnings', all);
  this.emit('validationError', errors);     // raw ValidationError stream (path+code)
  return all;
}
```

**Karar:** validator çağrı sırası önemli **değil** (tümü pure function, `SimpleInvoiceInput` üzerinde okuma); ilk hatada durmaz, **hepsi toplanır** (multi-error UI desteği için). `deriveB78Params()` helper'ı `_input` + `_calculation` üzerinden 7 boolean türetir:

```ts
private deriveB78Params() {
  return {
    allowReducedKdvRate: !!this._input.lines.some(l =>
      l.kdvExemptionCode === '555' && /* M4 self-exemption matrix kontrolü */),
    ytbAllKdvPositive: this._input.profile === 'YATIRIMTESVIK' &&
      this._calculation?.lines.every(l => l.kdvAmount > 0) ?? false,
    hasGtip: this._input.lines.every(l => !!l.delivery?.gtipNo),
    hasAliciDibKod: this._input.lines.every(l => !!l.delivery?.alicidibsatirkod),
    has4171Code: this._input.lines.some(l => l.taxes?.some(t => t.code === '4171')),
    ihracatPartyComplete: !!this._input.sender?.name && !!this._input.sender?.taxOffice,
    yolcuBuyerComplete: !!this._input.buyerCustomer?.nationalityId &&
      !!this._input.buyerCustomer?.passportId,
  };
}
```

**`validateCrossMatrix(InvoiceInput)` tip köprüsü:** `toInvoiceInput()` zaten mapper üzerinden çevirim yapıyor — burada sadece çağrılır. Performance için `_calculation` cache'lenmiş olmalı (zaten `calculate()` `_calculation` günceller).

**Path validation entegrasyonu (S-2):** `update(path, value)` çağrısında path geçersizse `error` event emit + no-op; validator pipeline hiç çalıştırılmaz. Geçerli path'te yukarıdaki sıra uygulanır.

### 2.6 Migration Stratejisi

**Internal:** Test dosyası 58 satır → ~600 satır (event sequence pattern). Production pipeline (builder/calculator/validator/mapper) session'a dokunmuyor — kırılmaz.

**External:** Mimsoft UI breaking — Berkay zaten yeniden yazmaya hazır. CHANGELOG v2.1.0 BREAKING CHANGES bölümü detaylı her setter için migration örneği (`setType('TEVKIFAT')` → `update(SessionPaths.type, 'TEVKIFAT')`).

**Helper'lar dokunulmaz:** `getAllowedProfiles`, `getAllowedTypes`, `getAvailableExemptions`, `getAvailableBillingDocumentTypeCodes` — Mimsoft form dropdown'ları için kritik, API aynı kalır.

### 2.7 Test Stratejisi

Test dosyası rewrite — yeni pattern:

```ts
describe('InvoiceSession reactive', () => {
  it('update(type, TEVKIFAT) emits typed event sequence', () => {
    const session = new InvoiceSession();
    const events = recordEvents(session);
    session.update(SessionPaths.type, 'TEVKIFAT');
    expect(events).toEqual([
      { kind: 'fieldChanged', path: 'type', value: 'TEVKIFAT', previousValue: 'SATIS' },
      { kind: 'typeChanged', payload: { type: 'TEVKIFAT', previousType: 'SATIS', ... } },
      { kind: 'fieldActivated', path: 'lines.*.withholdingTaxCode', reason: 'tevkifat' },
      { kind: 'fieldChanged', path: 'profile', value: 'TICARIFATURA', previousValue: 'TICARIFATURA' },
      { kind: 'uiStateChanged', payload: ... },
      { kind: 'changed', payload: ... },
      { kind: 'warnings', payload: [{ field: 'lines.0.withholdingTaxCode', severity: 'warning', ... }] },
    ]);
  });
});
```

Test grupları (~500 yeni test):
- Path validation (geçerli/geçersiz path → `error` event + no-op) — 30 test
- Doc-level update event sequence — 80 test (her SessionPaths entry için)
- Line-level update event sequence — 100 test
- B-78 parameter derivation — 40 test (her parametrenin tetiklenme matrisi)
- Validator pipeline entegrasyonu — 80 test (her validator'ın session'da aktif çalıştığını ispat)
- LineFieldVisibility türetimi — 60 test
- fieldActivated/fieldDeactivated diff doğruluğu — 50 test
- Snapshot regression (mevcut M10 isExport kontratı dahil) — 30 test
- Examples-matrix regression — 38 senaryo session üzerinden çalıştırılır (path-based update sequence)

**Toplam: 1189 → ~1700 (+511) test.**

### 2.8 Atomik Commit Listesi

| Commit | Kapsam | Tahmini delta |
|---|---|---|
| 8h.0 | Plan kopya (`audit/sprint-08h-plan.md`) + implementation log iskelet + AR-10 marker (README §8) | docs only |
| 8h.1 | `scripts/generate-session-paths.ts` generator + `SessionPaths` map (~600 satır generated) + generic `SessionPathMap` tip | +600 src, +30 test |
| 8h.2 | `update(path, value)` core + path validation (geçersiz → `error` event + no-op) + generic tip overload | +200 src, +50 test |
| 8h.3 | Eski 19 setter'ı kaldır + test rewrite (path-based) — line CRUD'lar korunur. **`setId`/`setDatetime` tutarsızlığı bu commit içinde doğal olarak çözülür** (S-5) | −300 src, +200 test |
| 8h.4 | Field-level events (`fieldChanged`, `fieldActivated`, `fieldDeactivated`, `lineFieldChanged`) — `SessionEvents` interface genişletme | +100 src, +80 test |
| 8h.5 | `LineFieldVisibility` + `deriveLineFieldVisibility` + `_uiState.lineFields[]` | +150 src, +60 test |
| 8h.6 | B-78 parametre köprüsü (`deriveB78Params()` + `validate()` payload genişletme) | +80 src, +40 test |
| 8h.7 | Validator pipeline entegrasyonu (5 validator + ValidationError↔ValidationWarning köprü + `validationError` event) | +150 src, +80 test |
| 8h.8 | `updateUIState()` `update()` her çağrısında otomatik — kapsam genişletme | +20 src, +20 test |
| 8h.9 | `scripts/example-to-session-script.ts` converter (S-6) + examples-matrix 164 senaryo session üzerinden regression | +200 test |
| 8h.10 | README §8 AR-10 dokümantasyonu + reactive session API rehberi | docs |
| 8h.11 | CHANGELOG v2.1.0 entry — BREAKING CHANGES + Added + Migration Guide | docs |
| 8h.12 | Implementation log finalize + version bump (2.0.0 → 2.1.0) | docs |

**Toplam: 13 atomik commit.** Her biri kendi başına yeşil test + lint geçer; bağımlılık zinciri 8h.1 → 8h.2 → 8h.3 → 8h.4..8h.7 (paralel olabilir) → 8h.8 → 8h.9 → 8h.10..8h.12.

### 2.9 Süre, Test ve Versiyon

- **Süre:** 8-10 gün (1.5 hafta).
- **Test delta:** 1189 → ~1700 (+511).
- **Versiyon:** v2.0.0 → **v2.1.0** (minor bump, BREAKING CHANGES içerikli).

### 2.10 Faz 1 Risk ve Belirsizlikler

- **R1 — Performance:** `update()` her çağrısında 5 validator + B-78 türetim + UI state diff + 4 event tipi emit. 100 line'lık fatura için her field değişimi ~5-15ms hedef. Profiling 8h.7 sonrası şart; gerekirse `autoValidate: 'manual'` opsiyonu Faz 1'e taşınır (eager varsayılan, manual opt-out).
- **R2 — Path map sync:** `simple-types.ts` değişirse `SessionPaths` outdated kalır. Çözüm: `npm run prebuild` script'i `generate-session-paths.ts` çağırır + diff varsa CI fail. (8h.1 iş kapsamına dahil.)
- **R3 — `validateCrossMatrix(InvoiceInput)` her `update()` çağrısında `toInvoiceInput()` yapacak — mapper maliyeti.** Çözüm: `_calculation` snapshot'tan türetilebilirse mapper atlanır; yoksa lazy çağrı (sadece error stream istendiğinde).
- **R4 — Examples-matrix 164 senaryo recreate (S-6 converter ile):** otomatik converter (`scripts/example-to-session-script.ts`) her TS source'u path-based `update()` çağrı dizisine çevirir. 1 günlük yatırım, regression aracı olarak kalıcı.
- **R5 — `lines.length === 0` durumu** `calculate()` null döner, `validate()` tüm validator'lara boş array gönderir. Validator'lar boş array safe mi? — manual-exemption ve phantom-kdv `lines.forEach` ile no-op, line-range no-op, sgk-input doc-level çalışır, cross-matrix `[]` üzerinden temel kuralları çalıştırır. Risk: phantom-kdv `lines.length === 0 && profile === 'YATIRIMTESVIK'` durumunda yanıltıcı warning üretebilir — test ile kanıtlanmalı.
- **R6 — `update('lines', newLines)` mi, yoksa sadece `addLine`/`updateLine` mi?** Karar: array-tipi path'ler `update()` ile değil array CRUD ile yönetilir (path map'te `lines` doc-level entry yok, sadece `lineX(i)` fonksiyonları var). Bu kısıtı path validation içinde enforce et — `update('lines', x)` → `error` event.

---

## 3. Faz 2 (Sprint 8i, v2.2.0) — Suggestion Engine

### 3.1 Kapsam

1. **`SuggestionEngine` katmanı** — pure function, `SimpleInvoiceInput` + `_uiState` alır, `Suggestion[]` döner.
2. **`suggestion` event akışı** — her `update()` sonrası çağrılır; sadece **yeni** suggestion'lar emit edilir (önceki tick'te aynısı varsa tekrar fırlatılmaz).
3. **Kural tabanı** — `src/calculator/suggestion-rules.ts` veya benzeri, deklaratif kural tanımları.

### 3.2 Tasarım

```ts
type Suggestion = {
  path: string;                                    // Hangi alan için
  value: unknown;                                  // Önerilen değer
  reason: string;                                  // Neden (UI tooltip)
  severity: 'recommended' | 'optional';            // Ne kadar güçlü
  ruleId: string;                                  // Hangi kural ürettiyse (debug)
};

interface SuggestionRule {
  id: string;
  applies: (input: SimpleInvoiceInput, ui: InvoiceUIState) => boolean;
  produce: (input: SimpleInvoiceInput) => Suggestion[];
}

// Örnek kurallar
const RULES: SuggestionRule[] = [
  {
    id: 'kdv0-suggest-351',
    applies: (input) => input.lines.some(l => l.kdvPercent === 0 && !l.kdvExemptionCode)
                        && input.profile !== 'YATIRIMTESVIK',
    produce: (input) => input.lines
      .map((l, i) => l.kdvPercent === 0 && !l.kdvExemptionCode
        ? { path: SessionPaths.lineKdvExemptionCode(i), value: '351', reason: 'KDV=0 için varsayılan istisna kodu', severity: 'recommended', ruleId: 'kdv0-suggest-351' }
        : null)
      .filter(Boolean),
  },
  {
    id: 'tevkifat-default-withholding',
    applies: (input) => input.type === 'TEVKIFAT' && input.lines.some(l => !l.withholdingTaxCode),
    produce: (input) => /* … */,
  },
  // … YATIRIMTESVIK ItemClassificationCode önerisi, IHRACKAYITLI 702 kodu önerisi vb.
];
```

### 3.3 Suggestion vs Validator Ayrımı (S-3 kararı)

| | Validator | Suggestion |
|---|---|---|
| **Çıktı** | `ValidationError` (severity: error/warning) | `Suggestion` (severity: recommended/optional) |
| **Anlam** | "Bu olmadan XML üretilmez" / "Eksik alan uyarısı" | "Bu varsayılanı seçmek istemez misin?" |
| **Tetikleyici** | Pipeline (build sırasında zorunlu) | UX akışı (kullanıcı yardımı) |
| **Örnek** | "KDV=0 line'da exemption code zorunlu" (manual-exemption-validator → error) | "KDV=0 için 351 kodu öneriyorum" (suggestion → recommended) |

**S-3 kararı netleştirme:** Mevcut "warning" davranışı (örn. `validateInvoiceState` `invoice-rules.ts:401` — TEVKIFAT seçilince withholding kodu yokluğu **warning**) korunur, "error" yapılmaz. Faz 2'de aynı senaryoda **suggestion** ek katman olarak gelir; validator warning ile **paralel** çalışır. UI'da kullanıcı yan yana iki mesaj görür:
- **Validator warning:** "TEVKIFAT seçildi, en az bir satıra tevkifat kodu eklemelisiniz." (sarı uyarı)
- **Suggestion (Faz 2):** "Satır 0 için 602 kodunu önerebilirim. Kabul ediyor musunuz?" (mavi öneri + onay butonu)

İki kanal birbirini baskılamaz. Validator zorunluluk dilini, suggestion yardım dilini konuşur.

### 3.4 Atomik Commit Listesi

| Commit | Kapsam |
|---|---|
| 8i.0 | Plan kopya + implementation log iskelet |
| 8i.1 | `Suggestion` tip + `SuggestionEngine` skeleton + `suggestion` event |
| 8i.2 | İlk 3 kural: kdv0→351, tevkifat→withholding default, ihrackayitli+702 kod önerisi |
| 8i.3 | YATIRIMTESVIK kuralları (itemClassificationCode varsayılan, productTraceId hatırlatması) |
| 8i.4 | EARSIVFATURA online satış kuralları (additionalIdentifications IMEI önerisi) |
| 8i.5 | Suggestion diff (önceki tick'te aynısı varsa emit etme) |
| 8i.6 | Test suite (~150 yeni test) |
| 8i.7 | README + CHANGELOG v2.2.0 + version bump |
| 8i.8 | Implementation log finalize |

**Toplam: 9 atomik commit, 4-6 gün, +150 test (1700 → ~1850).**

---

## 4. Master Plan Risk Matrisi

| ID | Risk | Etkilediği Faz | Mitigation |
|---|---|---|---|
| MR-1 | `update()` performance (her çağrıda 5 validator + B-78 + UI diff + 4 event) | Faz 1 (zorunlu profil) | 8h.7 sonrası benchmark; gerekirse `autoValidate: 'manual'` Faz 1'e taşınır |
| MR-2 | `SessionPaths` ↔ `simple-types.ts` sync | Faz 1+ | Generator script + CI diff check |
| MR-3 | `validateCrossMatrix` `InvoiceInput` mapper maliyeti | Faz 1 | Lazy (sadece error stream istendiğinde) veya `_calculation` snapshot türetimi |
| MR-4 | Suggestion ↔ validator overlap karmaşası | Faz 2 | S-3 kararı netleştirildi: paralel çalışırlar, UI iki ayrı mesaj gösterir |
| MR-5 | Examples-matrix 164 senaryo recreate (path-based) yorucu | Faz 1 (8h.9) | Otomatik `example-to-session-script.ts` converter (S-6) |

**Sıra zorunluluğu:**
- 8h.1 (SessionPaths) → 8h.2 (`update()`) zorunlu sıra.
- 8h.3 (eski setter kaldırma) sadece 8h.2 sonrası.
- 8h.4..8h.7 (event'ler, line-level visibility, B-78, validator pipeline) **paralel olabilir**.
- 8h.8 (auto-uiState) en sonda olmalı (diğerleri her event akışını sabitledikten sonra).
- Faz 2 Faz 1'e bağımlı (SessionPaths + path-based update + `_uiState.lineFields` üzerine kurulur).

**Geri alınamaz kararlar (Faz 1 sonrası kilitli):**
- Path syntax (bracket vs dot) — bracket seçilmiş.
- `update()` runtime path validation davranışı — `error` event + no-op (S-2).
- `ValidationError` ↔ `ValidationWarning` köprü stratejisi.
- Line CRUD vs `update('lines', ...)` ayrımı.

---

## 5. Kümülatif Değer

| Sonra ulaşılan değer | Sonuç |
|---|---|
| **Faz 1 (v2.1.0)** | Mimsoft Next.js rewrite başlayabilir: path-based update + field-level events + line-level visibility yeterli. UI form render ve hesaplama akışı çalışır. |
| **Faz 1 + Faz 2 (v2.2.0)** | Form kullanıcısı kılavuzlanır: KDV=0 → 351 önerisi, TEVKIFAT → withholding default, IHRACKAYITLI+702 → GTİP hatırlatma. UX kalitesi yüksek; production-ready enterprise session. |

**Erken çıkış kararı:** Faz 1 yalnız başına Mimsoft rewrite için yeterli; Faz 2 UX kalitesini yükseltir ama kritik path engellenmiş değildir. Faz 1 release sonrası Mimsoft'tan geri besleme alınabilir, sonra Faz 2 başlar.

Dirty/touched tracking ve `autoValidate: 'debounced'/'on-blur'` kontrolü gibi UX state yönetimi master plan kapsamı dışı (S-4); Mimsoft React form library'si (formik / react-hook-form) tarafında çözülür. Gerçek ihtiyaç ortaya çıkarsa v2.x ileri aşamada eklenir.

---

## 6. Çözülmüş Karar Kayıtları (Özet)

| ID | Konu | Karar |
|---|---|---|
| S-1 | AR-9 vs AR-10 | (a) AR-9 vision korunur, AR-10 concrete realization eklenir |
| S-2 | Path validation davranışı | (b) Geçersiz path → `error` event + no-op |
| S-3 | Suggestion ↔ Validator | Mevcut warning korunur; suggestion paralel ek katman (Faz 2) |
| S-4 | Faz 3 kapsam | KAPSAM DIŞI — master plan 2 faz |
| S-5 | `setId`/`setDatetime` | Standart akışa girer (8h.3 içinde doğal çözülür) |
| S-6 | Examples-matrix recreation | Otomatik converter (`scripts/example-to-session-script.ts`) |
| S-7 | `update()` tip güvenliği | (b) Generic tip türetimi (`SessionPathMap` + overload) |

Detaylı gerekçeler §0.1'de.

---

## 7. Rapor

- **Toplam faz sayısı:** 2
- **Toplam atomik commit:** Faz 1: 13 + Faz 2: 9 = **22 commit**
- **Toplam süre:** Faz 1: 8-10 gün + Faz 2: 4-6 gün = **12-16 gün** (~2-2.5 hafta)
- **Toplam test delta:** 1189 → ~1850 (**+661**)
- **Açık soru sayısı:** **0** (S-1..S-7 hepsi çözüldü)
- **En kritik 3 risk:**
  1. **MR-1** — `update()` performance (5 validator + B-78 + UI diff her çağrıda)
  2. **MR-4** — Suggestion ↔ validator overlap karmaşası (S-3 ile netleştirildi: paralel çalışır)
  3. **MR-2** — `SessionPaths` ↔ `simple-types.ts` sync (CI diff check şart, aksi halde silently outdated kalır)

**Sonraki adım:** Bu master plan onaylandıktan sonra **Sprint 8h (Faz 1) detaylı plan promptu** ayrıca yazılacak. Master plan sadece 2 fazın yol haritası — bireysel sprint plan'ları her faz başında ayrı belge olur.
