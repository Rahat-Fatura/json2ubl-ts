# Sprint 2 İmplementasyon Planı — Kod Listeleri + Config-Data-Source

## Context

**Amaç:** `json2ubl-ts` kütüphanesinde UBL-TR v1.42 Codelist uyumunu artırmak için 17 bulguyu (B-03/04/05, B-24/25/26/27/28, B-57/58/59/60/61, B-88/89/90, B-101) tek sprint'te kapatmak ve config-derived constants pattern'ini (M7) kurmak.

**Neden şimdi:**
- Sprint 1 profil/tip matrisini tek truth source'a indirgedi (AR-4/M1). Sprint 2 aynı pattern'i diğer kod listelerine (tax, withholding, exemption, unit, currency, package, payment) uygular.
- Kritik KRİTİK/YÜKSEK bulgular (10 geçersiz exemption kodu, 650 dinamik oran, 555 gate, TRL para birimi) production'a yaklaşmadan temizlenmeli.
- Sonraki sprint'lerdeki cross-check matrisleri (M5, M6) temiz bir whitelist'e dayanmalı.

**Beklenen sonuç:** Sprint sonu 17 bulgu kapalı, config dosyaları tek data source, `constants.ts` Set'leri türev, yeni `allowReducedKdvRate` flag ile 555 desteği, 650 için dinamik yüzde, test suite yeşil.

**Tahmini süre:** 4 gün (Plan v3'teki 3 gün + M7 exemption genişletme kararı için +1 gün).

---

## 1. Mevcut Durum

### Config Dosyaları

| Dosya | Entry Sayısı | İlgili İçerik |
|---|---|---|
| `src/calculator/tax-config.ts` | 24 | `TAX_DEFINITIONS`, `TAX_MAP`, `KDV_TAX_CODE='0015'` (özel), `isValidTaxCode` (line 56) |
| `src/calculator/withholding-config.ts` | 52 | `WITHHOLDING_TAX_DEFINITIONS` (601–627 + 801–825). 650 yok. 616 mevcut, isim güncel değil |
| `src/calculator/exemption-config.ts` | 73 | `EXEMPTION_DEFINITIONS`. ISTISNA=52, SATIS=1 (351), IHRACKAYITLI=3, OZELMATRAH=12, SGK=7 |
| `src/calculator/unit-config.ts` | 89 | `UNIT_DEFINITIONS`. TWH="Bin Kilowatt Saat" (yanlış). D32, GWH, MWH, SM3 yok |
| `src/calculator/currency-config.ts` | 30 | `CURRENCY_DEFINITIONS`. TRL yok, TRY var |

### `src/config/constants.ts` (özet)

- **Çift source riski:** `TAX_TYPE_CODES` (32 kod), `WITHHOLDING_TAX_TYPE_CODES` (45 kod), `CURRENCY_CODES` (44 kod — TRL dahil) — elle tanımlı.
- **Kritik asimetri:** `ISTISNA_TAX_EXEMPTION_REASON_CODES` 188 kod, ama exemption-config'de 52. (**User kararı: genişlet — 52→188**).
- **Özel setler:** `ADDITIONAL_ITEM_ID_SCHEME_IDS` (8, BILGISAYAR dahil), `PAYMENT_MEANS_CODES` (23, hiç kullanılmıyor).
- **Public export (index.ts):** `TAX_TYPE_CODES`, `WITHHOLDING_TAX_TYPE_CODES`, `CURRENCY_CODES`, `PARTY_IDENTIFICATION_SCHEME_IDS`, grupları (`IADE_GROUP_TYPES` vs.), regex'ler.

### Type Sistemi

- `src/types/builder-options.ts` — 4 alan: `prettyPrint`, `indentSize`, `validationLevel`, `xmlDeclaration`. Flag pattern'i yok.
- `src/types/common.ts:98-110` — `WithholdingTaxSubtotalInput { taxableAmount, taxAmount, percent, taxTypeCode, taxTypeName? }`. `percent` alanı zaten var.
- `src/types/invoice-input.ts:126` — `InvoiceLineInput.withholdingTaxTotal?: WithholdingTaxTotalInput`.
- `src/calculator/simple-types.ts:77` — `SimpleLineInput.withholdingTaxCode?: string`. **percent alanı yok.**

### Validator Mimarisi

- Stateless — `InvoiceInput` dışında param almaz (BuilderOptions yok).
- `ValidationError[]` döner, throw etmez.
- `common-validators.ts:84` → `TAX_TYPE_CODES.has()`
- `common-validators.ts:51` → `CURRENCY_CODES.has()`
- `type-validators.ts:109` → `WITHHOLDING_TAX_TYPE_CODES.has()`

### Calculator (line-calculator.ts:163-178)

```typescript
if (line.withholdingTaxCode) {
  const whDef = configManager.getWithholdingTax(line.withholdingTaxCode);
  if (!whDef) throw new Error(`Geçersiz tevkifat kodu: ${line.withholdingTaxCode}...`);
  const whAmount = kdvSubtotal.amount * (whDef.percent / 100);
  withholdingObject.taxTotal = whAmount;
  withholdingObject.taxSubtotals = [{
    taxable: kdvSubtotal.amount, amount: whAmount,
    percent: whDef.percent, code: whDef.code, name: whDef.name,
  }];
}
```

### Dead / Kullanılmayan

- `isValidTaxCode`, `isValidWithholdingTaxCode`, `isValidExemptionCode`, `isValidUnitCode`, `isValidCurrencyCode` — sadece `ConfigManager` tarafından çağrılıyor (prod validasyon path'i değil). B-61.
- `PAYMENT_MEANS_CODES` — src'de hiç `.has()` çağrısı yok.
- 555, 650, PACKAGING — src'de hiç geçmiyor.

---

## 2. Hedef Durum (Sprint 2 Sonu)

### Config Dosyaları

| Dosya | Hedef Sayı | Değişim |
|---|---|---|
| `tax-config.ts` | **29** | +5 kod (0021, 0022, 4171, 9015, 9944) — B-26 |
| `withholding-config.ts` | **53** | +650 (dinamik, `dynamicPercent: true`) — M3 / B-27. 616 ismi güncellenir — B-101 |
| `exemption-config.ts` | **hedef ~220, min ~140** | SATIS 351 kalır; ISTISNA 52→**188 hedef** (+136 kod) — M7 genişletme; IHRACKAYITLI 701-704 (+704) — B-57; 17 eksik tam istisna kodu dahil (326-344, 151); 10 geçersiz kod çıkarılır (203/210/222/224/233/243-249) — B-03. **N1 kural: her yeni kodun `name` alanı gerçek isim olmak zorunda; placeholder YASAK.** İsmi kaynaklarda bulunamayan kodlar config'e eklenmez, `audit/sprint-02-exemption-todo.md`'ye yazılır. Sprint başarısı için 188'e ulaşmak ZORUNLU değil (~140-160 makul beklenti). |
| `unit-config.ts` | **~93** | TWH etiketi "Terawatt Saat"; D32=TWH eşleme; +GWH, +MWH, +SM3 — B-58/59 |
| `currency-config.ts` | **30** | TRL hiçbir yerde yok (varsa çıkar) — B-28 |
| `package-type-code-config.ts` | **27** (yeni) | v1.42 §4.13 27 kod + Türkçe isim — D1 / B-60 |
| `payment-means-config.ts` | **7** (yeni) | Sık 7 kod + Türkçe isim — D2 / B-90 |

### `constants.ts` Hedef (M7 Türev Pattern)

```typescript
// Türev — config'ten üretilir:
export const TAX_TYPE_CODES = new Set([KDV_TAX_CODE, ...TAX_DEFINITIONS.map(t => t.code)]);
export const WITHHOLDING_TAX_TYPE_CODES = new Set(WITHHOLDING_TAX_DEFINITIONS.map(w => w.code));
export const UNIT_CODES = new Set(UNIT_DEFINITIONS.map(u => u.code));  // YENİ
export const CURRENCY_CODES = new Set(CURRENCY_DEFINITIONS.map(c => c.code));
export const ISTISNA_TAX_EXEMPTION_REASON_CODES = new Set(
  EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'ISTISNA').map(e => e.code)
);
export const OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES = new Set(
  EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'OZELMATRAH').map(e => e.code)
);
export const IHRAC_EXEMPTION_REASON_CODES = new Set(
  EXEMPTION_DEFINITIONS.filter(e => e.documentType === 'IHRACKAYITLI').map(e => e.code)
);
export const PACKAGING_TYPE_CODES = new Set(PACKAGING_TYPE_CODE_DEFINITIONS.map(p => p.code));  // YENİ
export const PAYMENT_MEANS_CODES = new Set(PAYMENT_MEANS_DEFINITIONS.map(p => p.code));  // Dead → türev

// Özel — türev olamaz (kasıtlı ayrı):
export const DEMIRBAS_KDV_EXEMPTION_CODES = new Set(['555']);  // M4 — flag ile kontrol
export const NON_ISTISNA_REASON_CODES = new Set(['351']);  // M5 Sprint 5'e prep

// WithholdingTaxTypeWithPercent:
// 601-627, 801-825 sabit (code × percent) + 650 için 65000-65099 aralığı (kullanıcı dinamik)
export const WITHHOLDING_TAX_TYPE_WITH_PERCENT = deriveWithholdingCombos(WITHHOLDING_TAX_DEFINITIONS);
// — B-04 tamamen regenerate; 60120/60150/60160/60170 gibi geçersizler yok
```

**Çıkarma:** `ADDITIONAL_ITEM_ID_SCHEME_IDS` setinden `BILGISAYAR` çıkar — B-88.

### Type Sistem Hedef

```typescript
// src/types/builder-options.ts
export interface BuilderOptions {
  prettyPrint?: boolean;
  indentSize?: number;
  validationLevel?: ValidationLevel;
  xmlDeclaration?: boolean;
  /** 555 (Demirbaş KDV) kodunu kabul eder. Default: false. */
  allowReducedKdvRate?: boolean;  // YENİ
}

// src/calculator/simple-types.ts
export interface SimpleLineInput {
  ...
  withholdingTaxCode?: string;
  /** 650 (DİĞER) kodu seçildiğinde 0-100 arası zorunlu; diğer kodlarda kullanılmaz. */
  withholdingTaxPercent?: number;  // YENİ
}

// WithholdingTaxSubtotalInput.percent — mevcut; 650 için semantik netleşir.

// withholding-config.ts entry shape genişlemesi (backward-compatible):
export interface WithholdingTaxDefinition {
  code: string;
  name: string;
  percent: number;              // 650 için 0 (placeholder, kullanılmaz)
  dynamicPercent?: boolean;      // YENİ — true sadece 650'de
}
```

### BuilderOptions Flow (M4)

```typescript
// src/calculator/invoice-builder.ts
build(input: InvoiceInput): BuildResult {
  // M4 pre-check — validationLevel'dan bağımsız
  if (!this.options.allowReducedKdvRate) {
    const err = detectReducedKdvRate(input);  // '555' kodu arar
    if (err) throw new UblBuildError([err]);  // mevcut aggregate tip
  }
  if (this.options.validationLevel !== 'none') {
    this.validate(input);
  }
  // ... kalan akış
}
```

**Not (N2):** `src/errors/ubl-build-error.ts`'de zaten `UblBuildError(errors: ValidationError[])` var — `toDetailedString()` desteğiyle aggregate pattern hazır. Yeni tip eklenmez.

---

## 3. Mimari Kararlar — Alt Görevler

### M3 — 650 Dinamik Yüzde

**Data:**
1. `withholding-config.ts`: `WithholdingTaxDefinition` tipine `dynamicPercent?: boolean` ekle.
2. Entry: `{ code: '650', name: 'Diğer', percent: 0, dynamicPercent: true }`.
3. `isValidWithholdingTaxCode` değişmez (Map üzerinden).

**Type:**
4. `SimpleLineInput.withholdingTaxPercent?: number` ekle.
5. `WithholdingTaxSubtotalInput.percent` mevcut — semantik güncelleme yorum satırına.

**Validator:**
6. `type-validators.ts` veya yeni `withholding-rules.ts`:
   - 650 seçili + percent yoksa → error (`WITHHOLDING_DYNAMIC_PERCENT_REQUIRED`)
   - 650 seçili + percent 0-100 dışı → error
   - 650 değil + percent verildi → error (karışıklık)
7. Complex form ve simple form için ortak rule.

**Calculator:**
8. `line-calculator.ts:163-178` — 650 ise `line.withholdingTaxPercent ?? complexForm.percent` kullan; diğer kodlarda `whDef.percent`.
9. `configManager.getWithholdingTax('650').percent` = 0; calculator override eder.

**Codelist whitelist:**
10. `WITHHOLDING_TAX_TYPE_WITH_PERCENT` regenerate — 650 için 65000-65099 range programatik generate.

### M4 — 555 BuilderOptions Flag

**Type:**
1. `BuilderOptions.allowReducedKdvRate?: boolean` ekle (default false).

**Data:**
2. `constants.ts`: `DEMIRBAS_KDV_EXEMPTION_CODES = new Set(['555'])`.

**Builder:**
3. Yeni utility `src/validators/reduced-kdv-detector.ts` (küçük, tek fonksiyon): `detectReducedKdvRate(input: InvoiceInput): ValidationError | null`. Input içindeki tüm `taxExemptionReasonCode` alanlarını tarar.
4. `InvoiceBuilder.build()` ve `DespatchBuilder.build()` — pre-check; `validationLevel='none'` olsa bile çalışır.

**Not:** Builder `build()` içinde herhangi bir tax-exemption validator 555'i whitelist kontrol etmez (555 `ISTISNA_TAX_EXEMPTION_REASON_CODES`'te YOK; flag true olsa bile validator nötr). Builder pre-check gate.

**Out-of-scope:** 555 cross-check matrisi (hangi tip/profil'de kabul) → Sprint 5 (M5).

### M7 — Config-Derived Constants

**Data source'lar (bu sprint):**
1. `tax-config.ts` — 5 kod ekle (B-26).
2. `withholding-config.ts` — 650 ekle (M3), 616 ismi güncelle (B-101).
3. `exemption-config.ts` — 52→188 ISTISNA genişletme, 17 tam istisna kodu (326-344 dahil, 151), 704 IHRACKAYITLI, 10 geçersiz kod çıkar (B-03). **User karar: genişletme yapılacak.**
4. `unit-config.ts` — TWH etiket düzelt, D32=TWH mapping (alias), +GWH/MWH/SM3.
5. `currency-config.ts` — TRL yok teyit (src'de yok zaten; varsa çıkar).
6. `package-type-code-config.ts` (yeni) — 27 kod.
7. `payment-means-config.ts` (yeni) — 7 kod.

**constants.ts Türetme (Set'leri):**
8. Tüm Set'ler config DEFINITIONS üzerinden `new Set(...map(x=>x.code))`.
9. ISTISNA/OZELMATRAH/IHRAC reason codes — `filter(e => e.documentType === '...')` pattern.
10. `UNIT_CODES` yeni (şu an hiç Set yok — UNIT_DEFINITIONS direkt).
11. `PAYMENT_MEANS_CODES` upgrade — dead değil, config türev.

**Özel Set'ler (M7 dışı, kasıtlı):**
12. `DEMIRBAS_KDV_EXEMPTION_CODES = new Set(['555'])` — M4.
13. `NON_ISTISNA_REASON_CODES = new Set(['351'])` — M5 hazırlık.

**Dead Code Temizliği (B-61):**
14. `isValidTaxCode`, `isValidWithholdingTaxCode`, `isValidExemptionCode`, `isValidUnitCode`, `isValidCurrencyCode` —
    - Public API olarak kalmalı mı karar: `calculator/index.ts` export listesi + `ConfigManager` kullanımı nedeniyle **KALSIN**.
    - Ama M7 sonrası validator'lar direkt `TAX_TYPE_CODES.has()` kullanıyor; `isValid*` sadece `ConfigManager` path'i ve public API lookup için.
    - Sprint 2'de dead değil ama dokümantasyon yorumu ekle (neden var).

### D1 — PackagingTypeCode Config (Yeni)

1. `src/calculator/package-type-code-config.ts` — v1.42 §4.13 27 kod (BA/BE/BG/BH/BI/BJ/BK/BX/CB/CH/CI/CK/CN/CR/DK/DR/EC/FC/JR/LV/NE/SA/SU/TN/VG/VL/VO).
2. Entry: `{ code: string; name: string }` — description opsiyonel kalsın (gereksizse yazılmaz).
3. Export: `PACKAGING_TYPE_CODE_DEFINITIONS`, `PACKAGING_TYPE_CODE_MAP`, `isValidPackagingTypeCode`, `getPackagingTypeCodeDefinition`.
4. `constants.ts` `PACKAGING_TYPE_CODES = new Set(...)` türev.
5. Validator: `serializers/delivery-serializer.ts` içinde ya da type-validators'ta whitelist check.
6. `src/types/common.ts` — `PackagingTypeCode` literal union opsiyonel (typo koruması); serbest string kalabilir (whitelist validator zaten kontrol eder).

### D2 — PaymentMeansCode Config (Yeni)

1. `src/calculator/payment-means-config.ts` — 7 sık kod:
   ```
   { code: '1', name: 'Ödeme Tipi Muhtelif' }
   { code: '10', name: 'Nakit' }
   { code: '20', name: 'Çek' }
   { code: '23', name: 'Banka Çeki' }
   { code: '42', name: 'Havale/EFT' }
   { code: '48', name: 'Kredi Kartı/Banka Kartı' }
   { code: 'ZZZ', name: 'Diğer' }
   ```
2. Export: `PAYMENT_MEANS_DEFINITIONS`, `PAYMENT_MEANS_MAP`, `isValidPaymentMeansCode`, `getPaymentMeansDefinition`.
3. `constants.ts` `PAYMENT_MEANS_CODES` — M7 türev (dead değil artık).
4. Validator: yeni `payment-means-validator.ts` veya `common-validators.ts`'e entegre; PaymentMeans serializer input'unda `paymentMeansCode` check.

---

## 4. Adım Adım İmplementasyon

### Adım 1 — Config Data Güncellemesi (Day 1, ~6 saat)

Bağımsız dosyalar — paralel edit:

1. `src/calculator/tax-config.ts` — +5 kod (B-26). Sıralama: Codelist v1.42 §4.2.
2. `src/calculator/withholding-config.ts` — +650 entry (M3), 616 ismi güncelle (B-101), type genişlet (`dynamicPercent?: boolean`).
3. `src/calculator/exemption-config.ts` — **en büyük iş**:
   - 10 geçersiz kod çıkar (203/210/222/224/233/243-249).
   - 151 ekle (ÖTV İstisna Olmayan).
   - 17 tam istisna kodu (326-344).
   - 704 (IHRACKAYITLI).
   - ISTISNA genişletme 52→188 hedef (+136 kod).

   **N1 İsim Arama Prosedürü (ZORUNLU):** Her yeni kod için sırayla ara:
   1. **Primary:** `.claude/skills/gib-teknik-dokuman/references/kod-listeleri-ubl-tr-v1.42.md` — §4.8.1 (Kısmi İstisna 201-250), §4.8.2 (Tam İstisna 301-351).
   2. **Secondary:** `schematrons/UBL-TR_Codelist.xml` — satır 21 civarı `istisnaTaxExemptionReasonCodeType` regex + açıklama yorumları.
   3. **Tertiary:** `.claude/skills/gib-teknik-dokuman/xmls/` — örnek XML'lerdeki yorum/kullanımlar.

   **Bulunamayan kodlar için kural:**
   - Config'e **eklenmez** (geçici kayıt yapılmaz).
   - `audit/sprint-02-exemption-todo.md`'ye satır yazılır:
     ```
     - Kod 2XX: isim bulunamadı; araştırma gerekli. Skill §4.8.1 tabloya yok, Codelist.xml içinde açıklama yok.
     ```
   - **Placeholder YASAK:** `name: 'Kod 2XX (TODO)'`, `name: 'Bilinmiyor'`, `name: ''` vb. **üretilmez**. Ya gerçek isim ya TODO listesine.

   **Beklenti:** ~88-108 kod gerçek isimle eklenir (~%80); kalan ~%20 TODO'da kalır. Sprint bitişinde exemption-config'de ~140-160 ISTISNA kodu hedeflenir. 188'e ulaşamamak kabul — TODO listesi açıkça belgelidir.
4. `src/calculator/unit-config.ts` — **N5 stratejisi:**
   - TWH etiketi düzelt: `{ code: 'TWH', name: 'Terawatt Saat' }` (mevcut yeri korunur).
   - D32 yeni entry **dosyanın sonuna** eklenir: `{ code: 'D32', name: 'Terawatt Saat' }`.
   - Sıralama kritik: `UNIT_BY_NAME` Map son entry'yi tutar, `resolveUnitCode('Terawatt Saat')` → `'D32'` (canonical v1.42).
   - `UNIT_BY_CODE.has('TWH')` true kalır → legacy input backward-compat.
   - +GWH, +MWH, +SM3 (B-59) ayrı entry'ler.
5. `src/calculator/currency-config.ts` — TRL yok teyit (grep ile).
6. `src/calculator/package-type-code-config.ts` — yeni dosya, 27 kod (D1).
7. `src/calculator/payment-means-config.ts` — yeni dosya, 7 kod (D2).
8. `src/calculator/index.ts` — yeni 2 config'i export et (sadece helper'lar ve DEFINITIONS — Set'ler değil, N4).

### Adım 2 — constants.ts M7 Türetme (Day 2 AM, ~3 saat)

Adım 1 bittikten SONRA:

1. `src/config/constants.ts`:
   - `TAX_TYPE_CODES` → türev.
   - `WITHHOLDING_TAX_TYPE_CODES` → türev.
   - `WITHHOLDING_TAX_TYPE_WITH_PERCENT` → helper fonksiyon ile regenerate (B-04).
   - `ISTISNA_TAX_EXEMPTION_REASON_CODES` → türev (filter documentType).
   - `OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES` → türev.
   - `IHRAC_EXEMPTION_REASON_CODES` → türev.
   - `CURRENCY_CODES` → türev; TRL yok teyit.
   - `UNIT_CODES` → **YENİ** export.
   - `PACKAGING_TYPE_CODES` → **YENİ** export.
   - `PAYMENT_MEANS_CODES` → türev (upgrade).
   - `DEMIRBAS_KDV_EXEMPTION_CODES = new Set(['555'])` → **YENİ**.
   - `NON_ISTISNA_REASON_CODES = new Set(['351'])` → **YENİ**.
   - `ADDITIONAL_ITEM_ID_SCHEME_IDS` → BILGISAYAR çıkar (B-88).
2. `src/index.ts` — **N4 karar: yeni Set'ler PRIVATE kalır** (AR-4 pattern tutarlılığı; Sprint 1 `PROFILE_TYPE_MATRIX` precedent). `UNIT_CODES`, `PACKAGING_TYPE_CODES`, `PAYMENT_MEANS_CODES`, `DEMIRBAS_KDV_EXEMPTION_CODES`, `NON_ISTISNA_REASON_CODES` — internal only. Mevcut public Set'ler (`TAX_TYPE_CODES`, `WITHHOLDING_TAX_TYPE_CODES`, `CURRENCY_CODES`) dokunulmaz (breaking olmasın; private'a çekilmesi Sprint 8 aday). Yeni public helper'lar: `isValidPackagingTypeCode`, `getPackagingTypeCodeDefinition`, `PACKAGING_TYPE_CODE_DEFINITIONS`, `isValidPaymentMeansCode`, `getPaymentMeansDefinition`, `PAYMENT_MEANS_DEFINITIONS`.

### Adım 3 — Type Sistem (Day 2 PM, ~3 saat)

1. `src/types/builder-options.ts` — `allowReducedKdvRate?: boolean` ekle.
2. `src/calculator/simple-types.ts` — `SimpleLineInput.withholdingTaxPercent?: number`.
3. `src/types/common.ts` — `WithholdingTaxSubtotalInput.percent` semantik yorum.
4. `src/calculator/withholding-config.ts` — `WithholdingTaxDefinition.dynamicPercent?: boolean`.

### Adım 4 — Builder Pre-check + Calculator (Day 3 AM, ~3 saat)

1. `src/validators/reduced-kdv-detector.ts` — yeni util, `detectReducedKdvRate(input): ValidationError | null`. Input içindeki nested `taxExemptionReasonCode` alanlarını tarar.
2. `src/calculator/invoice-builder.ts` ve `despatch-builder.ts` — `build()` başına M4 pre-check. `validationLevel='none'` path'ine de uygula.
3. `src/calculator/simple-invoice-builder.ts` — `allowReducedKdvRate` default false, opsiyonel constructor param.
4. `src/calculator/line-calculator.ts:163-178` — 650 için dinamik percent:
   ```typescript
   const dynamicPercent = whDef.dynamicPercent ? line.withholdingTaxPercent : whDef.percent;
   if (whDef.dynamicPercent && (dynamicPercent == null || dynamicPercent < 0 || dynamicPercent > 100)) {
     throw new Error(`650 kodu için withholdingTaxPercent (0-100) gerekli`);
   }
   const whAmount = kdvSubtotal.amount * (dynamicPercent / 100);
   ```
5. Complex form destekle: `InvoiceLineInput.withholdingTaxTotal.taxSubtotals[].percent` — validator 650 ile beraber 0-100 check.
6. **N3 — Mapper dokunulmaz:** `src/calculator/simple-invoice-mapper.ts:382-394` `cl.withholdingObject.taxSubtotals.map(ws => ({ percent: ws.percent, ... }))` → logic içermiyor, taşıyıcı. `line-calculator.ts`'deki 4. madde yeterli; mapper değiştirilmez. Test: SimpleInput (650, percent=25) → `mapSimpleToInvoiceInput()` → `invoiceInput.lines[0].withholdingTaxTotal.taxSubtotals[0].percent === 25` assertion.

### Adım 5 — Validator Güncellemesi (Day 3 PM, ~3 saat)

1. `src/validators/type-validators.ts` — 650 dinamik percent rule (hem simple hem complex form).
2. `src/validators/common-validators.ts` — TAX_TYPE_CODES/CURRENCY_CODES update sonrası hiç değişmez (API aynı).
3. Yeni/güncel whitelist validasyonları:
   - `package-type-code` — serializer veya validator'da.
   - `payment-means-code` — serializer veya validator'da.
4. B-88 sonrası `ADDITIONAL_ITEM_ID_SCHEME_IDS` kullanıcıları teyit (grep `BILGISAYAR` — yalnız constants.ts'de var).

### Adım 6 — Testler (Day 4, ~6 saat)

**Test dosyaları (per-config smoke + integration):**

1. `__tests__/calculator/tax-config.test.ts` **(yeni)** — 5 yeni kod var mı, `isValidTaxCode` kontrol, `TAX_TYPE_CODES` türev doğrulama.
2. `__tests__/calculator/withholding-config.test.ts` **(yeni)** — 650 entry, `dynamicPercent: true`, 616 isim, türev Set simetrisi.
3. `__tests__/calculator/exemption-config.test.ts` **(yeni)** — 10 kod çıkarıldı, 17 ekli, 188 ISTISNA, documentType breakdown.
4. `__tests__/calculator/unit-config.test.ts` **(yeni)** — TWH etiket, D32, GWH/MWH/SM3.
5. `__tests__/calculator/currency-config.test.ts` **(yeni)** — TRL yok.
6. `__tests__/calculator/package-type-code-config.test.ts` **(yeni)** — 27 kod, isValid.
7. `__tests__/calculator/payment-means-config.test.ts` **(yeni)** — 7 kod, isValid.
8. `__tests__/calculator/line-calculator.test.ts` **(genişlet)** — `describe('tevkifat 650 dinamik')`:
   - 650 + percent=20 → tutar doğru.
   - 650 + percent yok → throw.
   - 650 + percent=150 → throw.
   - 650 + percent=0 → tutar 0 (geçerli sınır).
9. `__tests__/builders/invoice-builder-555.test.ts` **(yeni)** — M4 flag:
   - flag default (false) + 555 input → throw.
   - flag=true + 555 input → geçer.
   - flag=false + validationLevel='none' → yine throw (pre-check).
10. `__tests__/validators/common-validators.test.ts` **(genişlet)** — türev Set'ler doğru kullanılıyor (TAX_TYPE_CODES .has('0021') gibi yeni kodlar).
11. `__tests__/config/constants-derivation.test.ts` **(yeni)** — M7 simetri:
    - `TAX_TYPE_CODES.size === TAX_DEFINITIONS.length + 1` (KDV özel)
    - `ISTISNA_TAX_EXEMPTION_REASON_CODES.size === filter(ISTISNA).length`
    - Her config kodu Set'te var, Set'teki her kod config'de var.
    - `DEMIRBAS_KDV_EXEMPTION_CODES` ayrı kalıyor teyit.

### Adım 7 — Implementation Log + Commit (Day 4 PM, 1 saat)

1. `audit/sprint-02-implementation-log.md` — değişiklik özeti, metrikler, devreden işler.
2. `yarn test` yeşil — 118+ yeni test passes.
3. `yarn build` yeşil.
4. Commit: `Sprint 2: kod listeleri + config-data-source (M3/M4/M7/D1/D2)`.
5. Sprint kapalı; user onayı → Sprint 3 başlar.

---

## 5. Type Sistem Değişiklik Detayı

### BuilderOptions
```diff
 export interface BuilderOptions {
   prettyPrint?: boolean;
   indentSize?: number;
   validationLevel?: ValidationLevel;
   xmlDeclaration?: boolean;
+  /**
+   * 555 (Demirbaş KDV / Bedelsiz Demirbaş İstisnası) kodunu kabul eder.
+   * Kütüphane 555 için iş mantığı uygulamaz; tüketici farklı KDV oranından
+   * kesme hesabından sorumludur. Default: false.
+   */
+  allowReducedKdvRate?: boolean;
 }
```

### SimpleLineInput
```diff
 export interface SimpleLineInput {
   ...
   withholdingTaxCode?: string;
+  /**
+   * Tevkifat 650 (DİĞER) kodu için dinamik yüzde (0-100).
+   * Diğer tevkifat kodlarında kullanılmaz.
+   */
+  withholdingTaxPercent?: number;
 }
```

### WithholdingTaxDefinition
```diff
 export interface WithholdingTaxDefinition {
   code: string;
   name: string;
   percent: number;
+  /**
+   * true ise percent kullanıcıdan gelir (InvoiceLineInput.withholdingTaxPercent
+   * veya WithholdingTaxSubtotalInput.percent). Sadece 650 için.
+   */
+  dynamicPercent?: boolean;
 }
```

### Breaking Etkisi

- **BuilderOptions.allowReducedKdvRate default false** → mevcut kullanıcı davranışı değişmez (555 zaten reject ediliyordu — aslında destek de yoktu).
- **SimpleLineInput.withholdingTaxPercent optional** → mevcut çağrılar etkilenmez.
- **WithholdingTaxDefinition.dynamicPercent optional** → config tipini genişletir, backward-compat.

### N2/N3/N4 Uygulaması

- **N2 — Error tip (UblBuildError):** Yeni aggregate tip yok; mevcut `UblBuildError(errors: ValidationError[])` kullanılır. M4 pre-check throw path'i: `throw new UblBuildError([detectReducedKdvRate(input)])`. `toDetailedString()` tüketici tarafından zaten destekli.
- **N3 — Mapper cascade:** `simple-invoice-mapper.ts` **dokunulmaz**. M3 değişikliği `line-calculator.ts`'de `cl.withholdingObject.taxSubtotals[0].percent` atamasıyla sınırlı. Mapper `cl` üzerinden taşır (mevcut `percent: ws.percent` satırı yeterli). Sadece test cascade'i doğrular.
- **N4 — Public/Private API ayrımı:**
  - **Private (sadece constants.ts / internal import):** `UNIT_CODES`, `PACKAGING_TYPE_CODES`, `PAYMENT_MEANS_CODES`, `DEMIRBAS_KDV_EXEMPTION_CODES`, `NON_ISTISNA_REASON_CODES`.
  - **Public (yeni):** `isValidPackagingTypeCode`, `getPackagingTypeCodeDefinition`, `PACKAGING_TYPE_CODE_DEFINITIONS`, `isValidPaymentMeansCode`, `getPaymentMeansDefinition`, `PAYMENT_MEANS_DEFINITIONS`.
  - **Public (mevcut — dokunulmaz):** `TAX_TYPE_CODES`, `WITHHOLDING_TAX_TYPE_CODES`, `CURRENCY_CODES` (Sprint 2'de breaking yapılmaz; Sprint 8 aday).
  - AR-4 pattern ile tutarlı: Set iç yapı, helper API yeterli.

---

## 6. Cross-Reference Etkisi

### Etkilenen Dosyalar (config değişikliği sonrası)

| Dosya | Etki |
|---|---|
| `common-validators.ts:51,84` | `CURRENCY_CODES`, `TAX_TYPE_CODES` kullanıcısı — türev olduktan sonra API aynı |
| `type-validators.ts:109` | `WITHHOLDING_TAX_TYPE_CODES` kullanıcısı — 650 eklenince otomatik kapsama girer |
| `document-calculator.ts:68` | `'351'` default `satis exemption` — dokunulmaz, `NON_ISTISNA_REASON_CODES` ile tutarlılık |
| `delivery-serializer.ts:122-123` | PackagingType serbest string → whitelist kontrol eklenecek |
| `invoice-builder.ts` | M4 pre-check + 555 gate |
| `despatch-builder.ts` | M4 pre-check (despatch'te exemption olması ihtimalsiz ama ucunu kapat) |
| `simple-invoice-builder.ts` | `allowReducedKdvRate` default pass-through |
| `configManager` | `isValidTaxCode`, `isValidWithholdingTaxCode` vb. — config genişleme otomatik kapsar; `dynamicPercent` alanı görmezden gelinir |

### Grep Teyitleri (Adım 0'da yapılmış)

- `TRL` — src'de yok, sadece `constants.ts:209` ve `docs/`'ta referans (varsa çıkar).
- `BILGISAYAR` — yalnız `constants.ts:240`.
- `'555'` / `'650'` / `PACKAGING` — src'de hiç yok (yeni ekleniyor).
- `'351'` — `exemption-config.ts:82`, `document-calculator.ts:68`.

### Examples ve Docs

- `examples/` klasörü TRL veya 555 kullanıyor mu? → Adım 1'de grep ile teyit.
- README / docs — yeni config'leri eklendiği bahsi (kısa not).

---

## 7. Test Stratejisi

### Test Dosyası Hiyerarşisi (Yeni)

- **Per-config smoke test** (~7 yeni dosya) — her config'in kodları, `isValid*`'ı, türev Set simetrisi.
- **`constants-derivation.test.ts`** — tek cross-cutting dosya, M7 türetme doğruluğu.
- **`invoice-builder-555.test.ts`** — M4 flag üç senaryosu.
- **`line-calculator.test.ts`** (genişlet) — M3 650 senaryoları 4 adet.

### Test Sayısı Tahmini

- Yeni: ~60 test (8 yeni dosya × ~6-8 test/dosya + genişletmeler).
- Mevcut: 118 test (Sprint 1 sonu) — 0 kırılma bekleniyor.
- Hedef: ~180 test, %100 yeşil.

### Kritik Test Senaryoları

| Alan | Senaryo | Beklenen |
|---|---|---|
| M3 | 650 + percent=25.5 | `taxAmount === kdvAmount × 0.255` |
| M3 | 650 + percent yok | throw `WITHHOLDING_DYNAMIC_PERCENT_REQUIRED` |
| M3 | 601 + percent=50 | validator error (601 sabit, percent verilmemeli) |
| M3 (N3) | SimpleInput(650,25) → mapped Complex | `lines[0].withholdingTaxTotal.taxSubtotals[0].percent === 25` |
| M4 | flag=false + 555 | throw `UblBuildError` ([REDUCED_KDV_RATE_NOT_ALLOWED]) |
| M4 | flag=true + 555 | pass |
| M4 | flag=false + 555 + validationLevel='none' | yine throw (gate pre-validate) |
| M7 | `TAX_TYPE_CODES.has('0021')` | true (yeni kod) |
| M7 | `ISTISNA_TAX_EXEMPTION_REASON_CODES.has('203')` | false (çıkarıldı) |
| M7 | `ISTISNA_TAX_EXEMPTION_REASON_CODES.size` | 188 |
| N5 | `resolveUnitCode('Terawatt Saat')` | `'D32'` (canonical) |
| N5 | `resolveUnitCode('TWH')` | `'TWH'` (legacy code korunur) |
| N5 | `isValidUnitCode('D32')` + `isValidUnitCode('TWH')` | ikisi de true |
| B-28 | `CURRENCY_CODES.has('TRL')` | false |
| B-88 | `ADDITIONAL_ITEM_ID_SCHEME_IDS.has('BILGISAYAR')` | false |
| B-101 | `WITHHOLDING_TAX_MAP.get('616').name` | yeni ad |
| N4 | `import { PACKAGING_TYPE_CODES } from 'json2ubl-ts'` | compile error (private) |
| N4 | `import { isValidPackagingTypeCode } from 'json2ubl-ts'` | resolves (public helper) |
| N1 Placeholder | `EXEMPTION_DEFINITIONS.every(e => !e.name.includes('TODO'))` | true |
| N1 Placeholder | `EXEMPTION_DEFINITIONS.every(e => !/^Kod \d+/.test(e.name))` | true |
| N1 Placeholder | `EXEMPTION_DEFINITIONS.every(e => e.name.trim().length > 0)` | true |
| N1 Placeholder | `EXEMPTION_DEFINITIONS.every(e => e.name !== 'Bilinmiyor' && e.name !== 'Unknown')` | true |

---

## 8. Risk ve Edge Case

1. **M7 exemption 52→188 genişletme:** Codelist v1.42 §4.8.1'deki 136 eksik kodun **isimleri** belirsiz olabilir. User açıkça onayladı "bazı kod isimleri belirsiz kalabilir". Placeholder: `name: 'Kod 2XX (TODO: Codelist v1.42'den doldurulacak)'` + ayrı TODO listesi (`audit/sprint-02-exemption-todo.md`).

2. **650 percent=0 edge case:** Kullanıcı "0 tevkifat" girerse? Matematiksel olarak 0 geçerli (taxAmount=0); validator kabul etmeli. 0-100 sınırları inclusive.

3. **M4 pre-check performans:** Deep input tarama tüm line'lardaki exemption kodlarını gezer; büyük faturada O(n) — fatura büyüklüğü tipik <100 satır, ihmal edilebilir.

4. **555 flag açıkken cross-validation:** `allowReducedKdvRate=true` + 555 kodu + ISTISNA profili → şimdilik kabul (M5 Sprint 5'te cross-check). Plan'da belirt.

5. **TRL production etkisi:** `examples/` içinde TRL kullanımı varsa örnekler bozulur. Day 1'de grep teyit.

6. **Public API genişleme:** `UNIT_CODES`, `PACKAGING_TYPE_CODES` yeni public expose — SemVer minor version (breaking değil). `package.json` version bump kararı user'a bırakılır.

7. **WithholdingTaxTypeWithPercent regenerate riski:** B-04'te 117 kombinasyon listesi yeniden üretiliyor. Helper fonksiyon: her (code, percent) için `code + String(percent).padStart(2,'0')` + 650 için 65000-65099 range. Unit test ile set içeriği doğrulanmalı.

8. **Dead code isValid* (B-61):** User M7 kararından bağımsız — ConfigManager bunları kullandığı için **tutuyoruz**. Dokümantasyon yorumu eklenecek ("kalıcı — ConfigManager runtime path için").

9. **D32=TWH alias (N5):** İki ayrı entry, D32 **canonical**, TWH **legacy**. `UNIT_BY_NAME` Map son entry'i tutar — D32 dosya sonuna eklenir, `resolveUnitCode('Terawatt Saat')` → `'D32'` döner (yeni faturalar). `UNIT_BY_CODE.has('TWH')` true kalır → eski input'lar (code='TWH') etkilenmez. TWH etiketi B-58 ile "Terawatt Saat" olarak düzeltilir (önceki yanlış: "Bin Kilowatt Saat"). Aynı isim iki entry'de olur; Map'te son eklenen kazanır (istenen davranış). Test: `resolveUnitCode('Terawatt Saat') === 'D32'`, `resolveUnitCode('TWH') === 'TWH'`, `isValidUnitCode('D32') === true`, `isValidUnitCode('TWH') === true`.

---

## 9. Kapsam Dışı (TODO / Sonraki Sprint'ler)

| Madde | Bulgu | Sprint |
|---|---|---|
| TaxExemption cross-check matrisi | B-06 | Sprint 5 |
| IHRACKAYITLI+702 özel check | B-07 | Sprint 5 |
| YatirimTesvikKDV check | B-08 | Sprint 5 |
| M5 — 351 non-ISTISNA cross-check (Sprint 2'de sadece set hazırlık) | — | Sprint 5 |
| M6 — Parent-child conditional | — | Sprint 3 |
| B-93 kod artığı | B-93 | Sprint 8 (Sprint 1'den devir) |
| Defensive fix temizlik | — | Sprint 8 (Sprint 1'den devir) |
| package.json + 2 serializer uncommitted | — | Sprint 8 (Sprint 1'den devir) |
| Country code whitelist (ISO 3166) | B-89 | Opsiyonel, Sprint sonrası |
| README "Sorumluluk Matrisi" (555) | — | Sprint 7-8 dokümantasyon |
| **ISTISNA ismi bulunamayan kodlar** (N1 TODO listesi) | B-57 kısmi | Sprint 8 veya ikinci iterasyon. `audit/sprint-02-exemption-todo.md` giriş noktası. |

---

## 10. Çıktı Listesi

### Değişen Dosyalar (Mevcut)

- `src/calculator/tax-config.ts` — +5 kod
- `src/calculator/withholding-config.ts` — +650, 616 isim, type genişleme
- `src/calculator/exemption-config.ts` — 52→188 ISTISNA, +17 tam istisna, -10 geçersiz, +704
- `src/calculator/unit-config.ts` — TWH etiket, D32, GWH/MWH/SM3
- `src/calculator/currency-config.ts` — TRL teyit
- `src/calculator/index.ts` — 2 yeni config export
- `src/calculator/line-calculator.ts` — 650 dinamik percent
- `src/calculator/invoice-builder.ts` — M4 pre-check
- `src/calculator/despatch-builder.ts` — M4 pre-check
- `src/calculator/simple-invoice-builder.ts` — options pass-through
- `src/calculator/simple-types.ts` — `withholdingTaxPercent` alan
- `src/config/constants.ts` — M7 türev, 2 yeni özel Set, BILGISAYAR çıkar, WithholdingTaxTypeWithPercent regenerate
- `src/types/builder-options.ts` — `allowReducedKdvRate`
- `src/types/common.ts` — yorum
- `src/validators/type-validators.ts` — 650 rule
- `src/serializers/delivery-serializer.ts` — packaging whitelist (opsiyonel)
- `src/index.ts` — yeni public (opsiyonel)

### Yeni Dosyalar

- `src/calculator/package-type-code-config.ts` — D1
- `src/calculator/payment-means-config.ts` — D2
- `src/validators/reduced-kdv-detector.ts` — M4 util
- `__tests__/calculator/tax-config.test.ts`
- `__tests__/calculator/withholding-config.test.ts`
- `__tests__/calculator/exemption-config.test.ts`
- `__tests__/calculator/unit-config.test.ts`
- `__tests__/calculator/currency-config.test.ts`
- `__tests__/calculator/package-type-code-config.test.ts`
- `__tests__/calculator/payment-means-config.test.ts`
- `__tests__/builders/invoice-builder-555.test.ts`
- `__tests__/config/constants-derivation.test.ts`
- `audit/sprint-02-plan.md` — bu plan (kopya)
- `audit/sprint-02-implementation-log.md` — implementasyon sonrası
- `audit/sprint-02-exemption-todo.md` — belirsiz kalan kod isimleri listesi

### Değişmeyen (Teyit Edilmiş)

- Test suite yapısı (vitest) — aynı
- `ValidationError` type — aynı
- Sprint 1'deki PROFILE_TYPE_MATRIX, grup Set'leri — dokunulmaz

---

## 11. Doğrulama (End-to-End)

```bash
# 1. Tüm testler yeşil
yarn test

# 2. Build temiz
yarn build

# 3. Type check
yarn tsc --noEmit

# 4. Coverage (Sprint 2 yeni testler)
yarn test --coverage

# 5. Manuel spot-check
node -e "const p = require('./dist'); console.log(p.WITHHOLDING_TAX_TYPE_CODES.has('650'))"
node -e "const p = require('./dist'); console.log(p.CURRENCY_CODES.has('TRL'))"  # false
node -e "const p = require('./dist'); console.log(p.TAX_TYPE_CODES.has('0021'))" # true

# 6. 555 flag manuel test
# examples/example-555-flag.ts yeni dosya — flag true/false ile çalıştır, beklenen throw/pass
```

**Kabul Kriterleri:**
- 17 bulgu kapalı (her biri için en az 1 test).
- `yarn test` — 0 kırılma, ~180 test yeşil.
- `yarn build` — 0 TypeScript error.
- `audit/sprint-02-implementation-log.md` yazılı.
- M7 türev pattern her config için uygulanmış (exemption dahil).
- Kullanıcı gözden geçirip onayladı.

---

## 12. Tahmini Süre

| Adım | Süre |
|---|---|
| Adım 1 — Config data (exemption 52→188 isim arama titizliğiyle) | **1.5 gün** |
| Adım 2 — constants.ts M7 türetme | 0.5 gün |
| Adım 3 — Type sistem | 0.3 gün |
| Adım 4 — Builder pre-check + calculator | 0.4 gün |
| Adım 5 — Validator güncelleme | 0.3 gün |
| Adım 6 — Testler | 1 gün |
| Adım 7 — Log + commit + buffer | 0.5 gün |
| **Toplam** | **~4.5 gün** |

Plan v3'teki 3 gün + M7 exemption genişletme +1 gün + N1 isim arama titizliği +0.5 gün.

**Bağlam sınırı uyarısı:** Adım 1 exemption-config doldurma çok sayıda skill/Codelist araması içerir. Tek oturumda bitmezse: `sprint-02-implementation-log.md`'ye ara nokta yaz (örn: "201-230 eklendi, 231-350 Part 2'de"), yeni oturumla Part 2'ye devam. İki bölüm kabul.
