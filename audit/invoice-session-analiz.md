---
karar: Mevcut invoice-session yapısının dürüst envanteri
tarih: 2026-04-27
durum: Analiz (kod değişikliği yok)
kapsam: src/calculator/invoice-session.ts + invoice-rules.ts + ilişkili tipler/test'ler
---

# Mevcut InvoiceSession — Yapısal Analiz

Reactive session tasarımına geçmeden önce kütüphanedeki mevcut session iskeletinin dürüst envanteri. "Olduğu gibi" anlatım, öneri yok.

İncelenen dosyalar:

| Dosya | Satır | Rol |
|---|---|---|
| `src/calculator/invoice-session.ts` | 553 | Ana session sınıfı |
| `src/calculator/invoice-rules.ts` | 506 | Tip/profil/UI kuralları, validation |
| `src/calculator/simple-types.ts` (sadece `SimpleInvoiceInput`) | 484 (388-484) | Input tipi |
| `src/calculator/index.ts` | 148 | Public re-export |
| `src/config/constants.ts` (`PROFILE_TYPE_MATRIX`) | 309 (13-) | Tip/profil matrisi |
| `__tests__/calculator/invoice-session.test.ts` | 58 | Tek session test'i (M10) |
| `__tests__/calculator/invoice-rules.test.ts` | 124 | Rules helper test'leri |
| `__tests__/validators/b67-b78-invoice-rules.test.ts` | 138 | `validateInvoiceState` test'leri |
| `audit/reactive-session-design-notes.md` | 126 | AR-9 vizyon notu (referans) |

---

## 1. Genel Tanım

`invoice-session.ts` kullanıcı bir formda fatura hazırlarken adım adım veri girişi yapmasını destekleyen, `SimpleInvoiceInput` üzerinde mutasyon yöneten ve her değişimde otomatik hesaplama+validasyon tetikleyen Node `EventEmitter` türevi bir sınıftır.

Public API (`src/calculator/index.ts:67-72`):

- `class InvoiceSession`
- `interface InvoiceSessionOptions`
- `interface SessionEvents` (event tip haritası)
- `type SessionEventName`

Hacim: 1 sınıf, ~30 public method, 11 event türü, 3 export tip.

## 2. Veri Modeli

Private state (`invoice-session.ts:94-99`):

| Alan | Tip | Amaç |
|---|---|---|
| `_input` | `SimpleInvoiceInput` | Mevcut fatura girdisi |
| `_calculation` | `CalculatedDocument \| null` | Son hesaplama snapshot'ı |
| `_uiState` | `InvoiceUIState` | Türetilmiş UI bilgisi |
| `_autoCalculate` | `boolean` | Her değişimde `calculate()` çağrılsın mı |
| `_liability` | `'einvoice' \| 'earchive' \| undefined` | Alıcının e-belge mükellefiyeti |
| `_isExport` | `readonly boolean` | İhracat session'ı (constructor'da kilitlenir) |

Mutasyon stili: nominal olarak immutable spread (`this._input = { ...this._input, lines }`), ama sınıf alanı kendisi yeniden atanıyor — yani referans değişiyor, derin yapı paylaşımlı. `Readonly<>` getter sadece dış tüketici için.

Constructor (`invoice-session.ts:101-140`):

- `options.initialInput` boşsa `sender`/`customer` boş string'lerle, `lines` boş array ile doldurulur.
- `isExport=true` ise profil `IHRACAT`, tip `ISTISNA` zorlanır (M2 identity, M10 kontrat).
- `isExport=false` ise: profil `liability==='earchive' ? 'EARSIVFATURA' : 'TICARIFATURA'`; tip varsayılan `SATIS`.
- `_uiState` constructor'da `deriveUIState(...)` ile bir kez hesaplanır.

State'in **bildiği** alanlar (`SimpleInvoiceInput` üzerinden, `simple-types.ts:388-484`):

- `sender`, `customer`, `buyerCustomer`, `taxRepresentativeParty`
- `lines[]` (her satırda `kdvPercent`, `withholdingTaxCode`, `taxes`, `delivery`, `additionalIdentifications` vb.)
- `id`, `uuid`, `datetime`
- `type`, `profile`
- `currencyCode`, `exchangeRate`
- `kdvExemptionCode` (doc-level fallback)
- `ozelMatrah`, `sgk`, `onlineSale`, `eArchiveInfo`, `invoicePeriod`
- `billingReference`, `despatchReferences`, `additionalDocuments`, `orderReference`
- `paymentMeans`
- `notes`
- `ytbNo`, `ytbIssueDate`
- `xsltTemplate`

State'in **bilmediği** / doğrudan saklamadığı alanlar:

- Line-level `kdvExemptionCode` ayrı setter'ı yok (`updateLine` üzerinden patch ile geçer).
- "Hangi alan kullanıcıya gösterildi mi" gibi UI presence flag'i yok — sadece `FieldVisibility` türetilmiş.
- Field-level "kullanıcı dokundu mu" / "dirty" izi yok.
- Suggestion (önerilen değer) state'i yok.

## 3. Davranış — Şu An Ne Yapıyor?

Snapshot vs incremental: **incremental**. Constructor'da `initialInput` opsiyonel, sonra setter'larla doldurulur.

Public method'lar (kısa):

| Method | Davranış |
|---|---|
| `setSender(party)` / `setCustomer(party)` / `setBuyerCustomer(buyer?)` | Tarafları yazar, `onChanged()` |
| `setType(type)` | Tip değişimi, profil uyumsuzsa `resolveProfileForType` ile otomatik geçiş, `updateUIState()`, `type-changed` emit |
| `setProfile(profile)` | Profil değişimi; `isExport`/liability ihlalinde `error` emit ve no-op; tip uyumsuzsa otomatik geçiş |
| `setLiability(liability?)` | `isExport=true` ise no-op; profil uyumsuzsa otomatik geçiş; `liability-changed` emit |
| `addLine` / `updateLine` / `removeLine` / `setLines` | Satır CRUD; sırasıyla `line-added`/`line-updated`/`line-removed` emit |
| `setCurrency(code, rate?)` | Para birimi yazar; `updateUIState()` (çünkü `showExchangeRate` tetiklenir) |
| `setBillingReference` / `setPaymentMeans` / `setKdvExemptionCode` / `setOzelMatrah` / `setSgkInfo` / `setInvoicePeriod` / `setNotes` / `setId` / `setDatetime` | Tek alan setter'ları; `setId`/`setDatetime` `onChanged` çağırmaz, diğerleri çağırır |
| `setInput(full)` | Toplu yazma; `updateUIState()` |
| `patchInput(partial)` | Kısmi yazma; sadece `type/profile/currencyCode` patch'lerinde `updateUIState()` |
| `calculate()` | `calculateDocument()` çalıştırır, `_calculation` günceller, `calculated` emit; lines boşsa null |
| `validate()` | `validateInvoiceState({...state})` çağırır, `_uiState.warnings` patch'ler, `warnings` emit |
| `toInvoiceInput()` | Mapper üzerinden tam `InvoiceInput` döner |
| `buildXml({validationLevel?})` | `SimpleInvoiceBuilder` üzerinden XML üretir |
| `getAllowedProfiles(type?)` / `getAllowedTypes(profile?)` / `getAvailableExemptions()` | Dropdown doldurma yardımcıları |

`onChanged` (`invoice-session.ts:544-552`) merkezi noktadır: `changed` emit → `_autoCalculate && lines.length > 0` ise `calculate()` → her durumda `validate()`.

`validateInvoiceState` ile ilişki: Session, validator'ı **çağırır**; validator session'ı tanımaz. Session, bilmediği bazı state alanlarını (`allowReducedKdvRate`, `ytbAllKdvPositive`, `hasGtip`, `hasAliciDibKod`, `has4171Code`, `ihracatPartyComplete`, `yolcuBuyerComplete`) `validate()`'e geçirmez — yani bu Schematron paraleli uyarılar session pipeline'ında **etkin değil**, sadece test'ten doğrudan çağrılırsa çalışır (`b67-b78-invoice-rules.test.ts`).

Validator-session ilişkisi: `src/validators/*` dosyalarından **hiçbiri** session'ı import etmez. Build pipeline tarafı (`SimpleInvoiceBuilder`) doğrudan `SimpleInvoiceInput` üzerinde çalışır.

Kurallar (M1-M12) konumu: `invoice-rules.ts` (matris türetme, filtreleme, `deriveFieldVisibility`, `validateInvoiceState`). Session bunları named import ile referans eder, kuralları içermez. Matrix kaynağı: `src/config/constants.ts:13` (`PROFILE_TYPE_MATRIX`).

## 4. Çıktı (Output)

Session "tek output dönen" bir API değil, çok seviyeli bilgi sağlar:

- Getter: `input`, `calculation`, `uiState`, `fields`, `warnings`, `liability`, `isExport`.
- Method dönüşleri: `calculate() → CalculatedDocument | null`; `validate() → ValidationWarning[]`; `toInvoiceInput() → InvoiceInput`; `buildXml() → string`; `getAllowed* → string[]`; `getAvailableExemptions() → ExemptionDefinition[]`.
- Event yayını (asenkron observer): aşağıda §5'te.

`FieldVisibility` (`invoice-rules.ts:113-150`) **doc-level** 19 boolean alan içerir: `showBillingReference`, `showWithholdingTaxSelector`, `showExemptionCodeSelector`, `showOzelMatrah`, `showSgkInfo`, `showBuyerCustomer`, `showLineDelivery`, `showPaymentMeans`, `requireIban`, `showExchangeRate`, `showEArchiveInfo`, `showOnlineSale`, `showInvoicePeriod`, `showYatirimTesvikNo`, `showAdditionalItemIdentifications`, `showCommodityClassification`, `showTaxRepresentativeParty`, `showSevkiyatNo`. Hepsi tip+profil+currency+liability bazlı tek noktadan türetilir; **line-level granularity yok**.

Teorik output örneği (input: yeni session, `setType('IADE')`):

```
type-changed: { type:'IADE', profile:'TEMELFATURA', previousType:'SATIS', previousProfile:'TICARIFATURA' }
ui-state-changed: {
  allowedProfiles: ['TEMELFATURA','TICARIFATURA',...],
  allowedTypes: PROFILE_TYPE_MATRIX['TEMELFATURA'] dizisi,
  fields: { showBillingReference:true, showExemptionCodeSelector:false, ... },
  availableExemptions: ISTISNA kod listesi,
  availableBillingDocumentTypeCodes: [{code:'IADE',label:'İade Faturası',forced:true}],
  warnings: []
}
changed: { ...input, type:'IADE', profile:'TEMELFATURA' }
warnings: [{ field:'billingReference', message:'İade faturalarında ... zorunludur', severity:'error' }]
```

## 5. Event/Callback/Reactive Altyapı

Session `EventEmitter` (`node:events`) üzerinden 11 event yayar (`invoice-session.ts:43-66`):

| Event | Payload | Tetikleyici |
|---|---|---|
| `calculated` | `CalculatedDocument` | `calculate()` başarılı |
| `ui-state-changed` | `InvoiceUIState` | `updateUIState()` |
| `type-changed` | `{type, profile, previousType, previousProfile}` | `setType` |
| `profile-changed` | `{profile, type, previousProfile, previousType}` | `setProfile` |
| `liability-changed` | `{liability, previousLiability}` | `setLiability` |
| `line-added` | `{index, line}` | `addLine` |
| `line-updated` | `{index, line}` | `updateLine` |
| `line-removed` | `{index}` | `removeLine` |
| `warnings` | `ValidationWarning[]` | `validate()` |
| `changed` | `SimpleInvoiceInput` | `onChanged()` (her mutate sonrası) |
| `error` | `Error` | `setProfile` ihlal, `calculate()` exception |

Derivation/dependency tracking:

- Tip↔profil: `resolveProfileForType` / `resolveTypeForProfile` üzerinden uyumsuzluk durumunda otomatik geçiş **var** (`setType`, `setProfile`, `setLiability`).
- Tip→FieldVisibility: tek seferlik `deriveFieldVisibility` ile **var**, ama `updateUIState()` sadece `setType`/`setProfile`/`setLiability`/`setCurrency`/`setInput`/`patchInput` (tip-profil-currency içeriyorsa) kollarında çağrılır. Diğer setter'lar (örn. `setKdvExemptionCode`, `addLine`, `updateLine`) UI state'i tazelemez.
- Field-level "şu alan değişirse şu alan görünür" tracking'i **yok**. Örneğin `lines[0].kdvPercent=0` güncellemesi `line-updated` emit eder ama field activation event'i yaymaz, suggestion (varsayılan istisna kodu önerisi) yaymaz.
- Path-based update API yok (`session.update('lines[0].kdvPercent', 0)` gibi). Setter ailesi sabit ve coarse.

Reactive Vision (AR-9, `audit/reactive-session-design-notes.md`) ek olarak `fieldChanged` / `fieldActivated` / `fieldDeactivated` / `suggestion` / `validationError` event'leri ve path-based `update(path, value)` öneriyor — bunlar **mevcut yapıda yok**.

## 6. Mevcut Kullanım — Kim Tüketiyor?

`grep -rn "invoice-session\|InvoiceSession" --include='*.ts'` sonucu:

| Dosya | Rol |
|---|---|
| `src/calculator/invoice-session.ts` | Tanım |
| `src/calculator/index.ts` (67-72) | Re-export |
| `__tests__/calculator/invoice-session.test.ts` | Tek tüketici test'i (58 satır, 5 case, M10 isExport kontratı) |

Production kodda hiçbir tüketici yok: `SimpleInvoiceBuilder`, `document-calculator`, validator'lar, mapper — hiçbiri session'ı kullanmaz; doğrudan `SimpleInvoiceInput` ile çalışır. Session **tamamen public API yönelimli external surface**, internal pipeline'da rol almaz.

Test pattern: instanstiate → setter → getter assertion. Event-based test (`session.on('liability-changed', …)`) sadece M10'un no-op kontrolünde var (`invoice-session.test.ts:42-48`). Snapshot/regression test yok.

## 7. Reactive Session İçin Hazır Olan / Eksik Olan

Hedef (Berkay): Kullanıcı bir alan değiştirir → kütüphane "şu component görünür, şu zorunlu, şu izinli" diye event emit eder; frontend form'u event'lere göre render eder; hesaplama otomatik kütüphanede.

### ✅ Hazır olanlar

- EventEmitter iskeleti, tip-güvenli `SessionEvents` haritası (`invoice-session.ts:43-66`).
- Otomatik hesap zinciri: `onChanged → calculate + validate` (`invoice-session.ts:544-552`).
- Tip ↔ profil uyum çözümlemesi: `resolveProfileForType`, `resolveTypeForProfile`, liability/isExport branş kararları (`invoice-rules.ts:185-245`).
- Doc-level FieldVisibility türetimi (19 alan, `invoice-rules.ts:250-289`).
- Schematron paraleli `validateInvoiceState` (KAMU/IADE/TEVKIFAT/IHRACAT/YOLCU/IDIS/YATIRIMTESVIK/B-78 alt kuralları, `invoice-rules.ts:323-464`).
- `getAvailableExemptions` (tip bazlı kod havuzu, `invoice-rules.ts:294-318`).
- `getAvailableBillingDocumentTypeCodes` (IADE forced behaviour, `invoice-rules.ts:475-484`).
- Tüm tip/profil bilgisi tek matristen türetiliyor (`PROFILE_TYPE_MATRIX`, `src/config/constants.ts:13`) — kaynak gerçeği tek noktada.
- Liability + `isExport` constructor kilidi + setLiability no-op kontratı (M10 test'le sabitlenmiş).

### ⚠️ Kısmen var olanlar

- `validate()`: çalışıyor ama `validateInvoiceState`'in beklediği `allowReducedKdvRate`, `ytbAllKdvPositive`, `hasGtip`, `hasAliciDibKod`, `has4171Code`, `ihracatPartyComplete`, `yolcuBuyerComplete` parametreleri session pipeline'ında geçirilmiyor (`invoice-session.ts:514-528`) — B-78 kuralları sessionland'da pasif.
- `updateUIState` çağrı kapsamı dar: sadece tip/profil/currency/liability/setInput/patchInput kollarında çalışır. Doc-level `setKdvExemptionCode`, satır mutasyonları, `setBuyerCustomer` vb. değişimde UI state tazelenmez. `validate()` her zaman çalışır ama `fields` tazelenmez.
- Line-level emit: `line-added/updated/removed` var ama payload field-level değil — "satırın hangi alanı değişti", "bu alan değişikliği başka bir alanı zorunlu kıldı mı" bilgisi yok.
- Otomatik tip tespiti: `calculate()` sonrası `_calculation.type` ile `_input.type` kıyaslayan kod var (`invoice-session.ts:449`) ama koşul `!this._input.type && this._calculation.type !== ...` mantıksal olarak `false` (sol-taraf undefined ise sağ kıyas zaten farklı tutulur ama kullanım belirsiz). Pratikte tip otomatik öneri akışı reaktif değil.
- `error` event: tek bir kanal — kategorisi yok, kod yok, sadece `Error.message`.

### ❌ Eksik olanlar

- Path-based update API (`session.update('lines[0].kdvPercent', 0)`).
- Field-level event'ler (`fieldActivated`, `fieldDeactivated`, `fieldChanged`).
- Suggestion event'i (`suggestion: {path, value, reason}`) — örn. KDV=0 girişinde 351 önerisi.
- Line-level `FieldVisibility` (her satır için kendi alan görünürlük seti).
- Dirty/touched izi (kullanıcı bir alana dokundu mu, hangi alanlar henüz boş ama görünür).
- Incremental/partial validation altyapısı: validator'lar `SimpleInvoiceInput` üzerinde tam input bekler, partial state'te null-safe değil.
- Validator entegrasyonu: `manual-exemption-validator`, `phantom-kdv-validator`, `simple-line-range-validator`, `cross-validators` session pipeline'ına bağlı değil; sadece `validateInvoiceState` (rules-tabanlı) çalışıyor.
- Persist/serialize akışı (session snapshot ↔ external store).
- `onChanged` debounce/throttle altyapısı (her mikro mutasyonda calculate çağrılır).

## 8. Mimari Pürüzler

- Session "snapshot validator" mı, "live state machine" mi belirsiz: tasarım notu (`reactive-session-design-notes.md:23`) dokunulmaz snapshot validator olarak konumlandırıyor, ama mevcut sınıf 11 event yayan ve auto-calculate yapan tam reaktif sınıf gibi davranıyor. İsim ve kapsam birbirinden ayrı evrilmiş.
- Sınıf sorumluluğu geniş: 30+ method state mutasyonu + tip/profil çözümü + hesap tetikleme + validator çağrısı + XML build + dropdown verisi sağlama hepsi tek sınıfta.
- `validate()` `validateInvoiceState`'in beklediği gelişmiş alanları (B-78 grup) doldurmuyor — kural eklenmiş ama session adapte edilmemiş (`invoice-session.ts:514-528` vs `invoice-rules.ts:323-352`).
- `setId` / `setDatetime` `onChanged` çağırmıyor (`invoice-session.ts:400-407`); diğer setter'ların hepsi çağırıyor — sessiz tutarsızlık.
- `calculate()` lines boşsa `_calculation = null` ve **`calculated` event emit etmez**, ama caller geri null alır. UI bu null durumunu nasıl tüketmeli belirsiz.
- `setCurrency` `updateUIState` çağırırken `setKdvExemptionCode` çağırmıyor — istisna kodu UI state'e doğrudan yansımıyor (gerek de yok aslında: `availableExemptions` tip değişiminde tazeleniyor).
- Validator ekosistemi (`src/validators/*`) ile session arasında köprü yok; phantom KDV / manuel exemption gibi mantık session'da görünmez.
- `_input` "immutable spread" iddiası ama getter `Readonly<SimpleInvoiceInput>` döner — runtime garantisi yok (`Object.freeze` kullanılmamış), iç içe nesneler `lines[0].taxes` gibi paylaşımlı.
- `InvoiceUIState.warnings` constructor'da hep boş `[]`; ilk `validate()` çağrısına kadar `session.warnings` yanlış şekilde "uyarı yok" gösterir. Constructor `validate()` çağırmıyor.

Reactive session eklenirse bozulan/dokunulmaz alanlar:

- **Bozulur (refactor gerekir):** sınıf yüzeyi (path-based update + field-level event API eklenirse 30+ setter küçülür/kaldırılır), `validate()` payload genişletme, `onChanged` debounce, `updateUIState` çağrı kapsamı.
- **Dokunulmaz (tek noktadan türetildiği için sağlam):** `invoice-rules.ts` kural seti, `PROFILE_TYPE_MATRIX`, `resolve*` aileleri, `deriveFieldVisibility`, `validateInvoiceState`, `getAvailableExemptions`, `getAvailableBillingDocumentTypeCodes`, `calculateDocument`, mapper, builder.

## 9. Disiplin Notları

- Mevcut session "snapshot validator" tanımı ile tasarım notunda kategorize edilmiş (AR-9 öncesi konum) ama gerçekte zaten reaktif iskelete sahip — tasarım notu ile kod eşleşmiyor.
- Kütüphanenin reactive session için altyapısı (kurallar, matrix, validator) dolu; eksik olan **session yüzeyinin granülerliği**, kuralların eksikliği değil.
- Test yatırımı zayıf: tek test dosyası 58 satır ve sadece M10 isExport kontratını koruyor; event akışı, auto-calculate, dependency tracking için regression yok.
- Session production pipeline'ında kullanılmıyor — yalnız external API olarak duruyor; bu, refactor riskini azaltır (internal kullanım kırılmaz).

## 10. Berkay'ın Karar Verebilmesi İçin

1. **Mevcut session tek-bağımsız kullanıcısı = test dosyası.** Production kodun (builder/calculator/validator/mapper) hiçbiri session'a bağlı değil; refactor/değiştirme riski tüketici tarafında dar — sadece public API contract.
2. **Kurallar ve hesap motoru sağlam, eksik olan yüzey.** `invoice-rules.ts` + `PROFILE_TYPE_MATRIX` + `validateInvoiceState` + `calculateDocument` reactive vizyonun ihtiyacı olan derivasyonu zaten karşılıyor; reactive layer **bunları yeniden yazmak zorunda değil**, üstüne path-based + field-level event akışı koymak yeterli.
3. **Session, vizyondaki "field activation / suggestion / path-based update" üçlüsüne sahip değil.** Mevcut event'ler doc-level (tip/profil/liability/lines bütünü); satır içi alan derivasyonu ve öneri akışı sıfırdan eklenmeli.
4. **`validate()` zaten mevcut ama yarım besliyor.** B-78 paraleli kurallar var, parametreler geçirilmiyor; reactive session başlamadan önce bu eksik tek başına kapatılsa session tüketicisine ek değer üretir.
5. **"Mevcut yapıyı koru ve genişlet" vs. "yeni reactive layer yaz" kararını şuna göre ver:** korumak istersen `setX → onChanged` zinciri yerine `update(path, value)` middleware'ı eklemek gerekir; yeni yazmak istersen `invoice-rules.ts` aynen kalır, sadece state machine + field state map'i sıfırdan kurulur. Risk her iki yolda da mevcut tüketici (test dosyası) ile sınırlı.

---

**Rapor**

- Toplam analize giren dosya: 9 (kaynak: 4, test: 3, config: 1, tasarım notu: 1)
- Mevcut yapının "reactive session" hedefine ulaşma yüzdesi (sezgisel): **~%45**. İskelet (events, derivation, validation tetiklemesi) hazır; field-level granülerlik, suggestion akışı, path-based update API ve incremental validation eksik.
- En kritik 3 eksiklik:
  1. Field-level / path-based update API yok — coarse setter ailesi mevcut.
  2. `FieldVisibility` doc-level; satır içi field activation/deactivation event'i yok.
  3. Suggestion event yok (KDV=0 → 351 önerisi gibi reactive vizyonun çekirdek davranışı).
- En kritik 3 hazır altyapı:
  1. `PROFILE_TYPE_MATRIX` + `resolve*` aileleri (tip/profil tutarlılığı tek noktadan).
  2. `validateInvoiceState` (Schematron paraleli kural seti, B-78 alt kurallar dahil).
  3. EventEmitter iskeleti + `SessionEvents` tip haritası + `onChanged` merkezi mutate-after-hook.
