# Sprint 2 — Implementation Log

**Tamamlandı:** 2026-04-22
**Süre:** Tek oturumda tamamlandı (plan tahmini 4.5 gün; N1 disiplini + realistic scope sayesinde hızlı).
**Önceki test sayısı:** 118 → **Sonrası:** 278 (+160 yeni test). Tümü yeşil.

## Kapatılan Bulgular (17/17)

| Bulgu | Uygulama |
|---|---|
| **B-03** KRİTİK | 10 geçersiz exemption kodu (203, 210, 222, 224, 233, 243-249) `exemption-config.ts`'de ZATEN yoktu; M7 türetmesi ile `ISTISNA_TAX_EXEMPTION_REASON_CODES` constants Set'i artık türev — geçersiz kodlar otomatik düştü. Test: `__tests__/calculator/exemption-config.test.ts:B-03`. |
| **B-04** KRİTİK | `WITHHOLDING_TAX_TYPE_WITH_PERCENT` Codelist-uyumsuz 117 kombinasyon yerine `deriveWithholdingCombos()` helper ile config'den regenerate. 650 dinamik için 65000-65099 full range. Test: `__tests__/calculator/withholding-config.test.ts:B-04`. |
| **B-05** KRİTİK | M4 — `BuilderOptions.allowReducedKdvRate` flag (default false); `src/validators/reduced-kdv-detector.ts` util; `InvoiceBuilder.build()` pre-check `validationLevel`'dan bağımsız gate. Test: `__tests__/builders/invoice-builder-555.test.ts` (4 senaryo). |
| **B-24** YÜKSEK | 151 (ÖTV İstisna Olmayan) `exemption-config.ts`'e eklendi (`type: 'OTV'`, `documentType: 'SATIS'`). `ExemptionDefinition.type` literal genişletildi (`'KDV' | 'SGK' | 'OTV'`). |
| **B-25** YÜKSEK | 351 için `NON_ISTISNA_REASON_CODES = new Set(['351'])` constants'ta ayrı set. M5 (Sprint 5) cross-check hazırlığı. |
| **B-26** YÜKSEK | tax-config 4 yeni kod: 0021 (BMV), 0022 (SMV), 4171 (ÖTV Tevkifat), 9944 (Hal Rüsumu). **9015 atlandı** — skill v1.42'de adı yok; N1 disiplini gereği TODO'ya yazıldı (`sprint-02-exemption-todo.md`). |
| **B-27** YÜKSEK | M3 — 650 dinamik tevkifat: `WithholdingTaxDefinition.dynamicPercent?: boolean` alanı, `SimpleLineInput.withholdingTaxPercent?: number` alanı, `line-calculator.ts` 0-100 validasyonu, validator `WithholdingTaxSubtotalInput.percent` için combo-skip + aralık check. |
| **B-28** YÜKSEK | TRL `constants.ts:CURRENCY_CODES` Set'inden çıkarıldı. `currency-config.ts`'de zaten yoktu. |
| **B-57** ORTA | `exemption-config.ts`'e 20 yeni ISTISNA kodu eklendi (218, 241, 242, 250 + 326-331, 333-334, 336-338, 340-344); 704 IHRACKAYITLI. Skill `gib-teknik-dokuman §4.8.1, §4.8.2, §4.8.7` kaynak. |
| **B-58** ORTA | TWH ismi düzeltildi ("Terawatt Saat", eski yanlış "Bin Kilowatt Saat"). |
| **B-59** ORTA | GWH, MWH, SM3 `unit-config.ts`'e eklendi. |
| **B-60** ORTA | D1 — `src/calculator/package-type-code-config.ts` (27 sık kod + Türkçe isim, skill §4.13). |
| **B-61** ORTA | `isValid*` fonksiyonları `calculator/index.ts`'den export edildi ve `ConfigManager` kullanıyor — plan gereği silinmediler (runtime config path'i için gerekli). |
| **B-88** DÜŞÜK | `ADDITIONAL_ITEM_ID_SCHEME_IDS` Set'inden `BILGISAYAR` çıkarıldı. |
| **B-89** DÜŞÜK | Kapsam dışı bırakıldı (plan §9, Sprint sonrası opsiyonel). |
| **B-90** DÜŞÜK | D2 — `src/calculator/payment-means-config.ts` (7 sık kod + Türkçe isim). |
| **B-101** DÜŞÜK | Tevkifat 616 ismi güncel v1.42 adıyla: "Diğer Hizmetler [KDVGUT-(I/C-2.1.3.2.13)]" (eski "5018 Sayılı..." yerine). |

## Mimari Kararlar

### M3 — 650 Dinamik Tevkifat ✅
- `WithholdingTaxDefinition.dynamicPercent?: boolean` (type genişleme, backward-compat).
- 650 entry: `{ code: '650', name: 'Diğer', percent: 0, dynamicPercent: true }`.
- `SimpleLineInput.withholdingTaxPercent?: number` (0-100 zorunlu 650 ile).
- `line-calculator.ts:163-195` güncellendi: 650 için `line.withholdingTaxPercent` kullanılır, yokluk/aralık dışı durumda descriptive throw.
- Validator (`type-validators.ts:114-134`) 650 için combo whitelist skip + aralık check; diğer kodlar için combo padding düzeltildi (`padStart(2,'0')`).

### M4 — 555 BuilderOptions Flag ✅
- `BuilderOptions.allowReducedKdvRate?: boolean` (default false).
- `src/validators/reduced-kdv-detector.ts` — nested taxExemptionReasonCode tarayıcı util.
- `InvoiceBuilder.build()` başında pre-check (validationLevel='none' olsa dahi gate).
- `DespatchBuilder` — DEFAULT_OPTIONS güncellendi ama pre-check EKLENMEDİ (despatch'te taxExemptionReasonCode alanı yok).
- `DEMIRBAS_KDV_EXEMPTION_CODES = new Set(['555'])` constants ayrı set.

### M7 — Config-Derived Constants ✅ (pragmatik mixed)

| Set | M7 uygulandı mı? | Not |
|---|---|---|
| `TAX_TYPE_CODES` | ✅ | `new Set([KDV_TAX_CODE, ...TAX_DEFINITIONS.map(t => t.code)])`. 9015 düştü (config'de yok; `sprint-02-exemption-todo.md` not). |
| `WITHHOLDING_TAX_TYPE_CODES` | ✅ | Config türev, 53 kod (650 dahil). |
| `WITHHOLDING_TAX_TYPE_WITH_PERCENT` | ✅ | `deriveWithholdingCombos()` helper — B-04 regenerate. |
| `ISTISNA_TAX_EXEMPTION_REASON_CODES` | ✅ | `filter(documentType === 'ISTISNA')`. 188→config'deki kadar (80 civarı). |
| `OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES` | ✅ | `filter(documentType === 'OZELMATRAH')`. |
| `IHRAC_EXEMPTION_REASON_CODES` | ✅ | `filter(documentType === 'IHRACKAYITLI')`. |
| `UNIT_CODES` (yeni) | ✅ | Config türev. |
| `PACKAGING_TYPE_CODES` (yeni) | ✅ | Config türev. |
| `CURRENCY_CODES` | ❌ | M7 UYGULANMADI. Config 30 kod, constants 68 kod (TRL çıkarıldı). Sprint 8 aday — ya config genişlet (+38) ya constants küçült (breaking). |
| `PAYMENT_MEANS_CODES` | ❌ | M7 UYGULANMADI. Config 7 kod (UI dropdown), constants 20 kod (geniş UN/EDIFACT; kullanıcı talebi #9). |

### D1 — PackagingTypeCode Config ✅
- `src/calculator/package-type-code-config.ts` yeni dosya, 27 kod (skill §4.13 Türkçe isimli).
- `PACKAGING_TYPE_CODES` constants türev.
- Public API: `isValidPackagingTypeCode`, `getPackagingTypeCodeDefinition`, `PACKAGING_TYPE_CODE_DEFINITIONS`.
- AR-4 pattern: `PACKAGING_TYPE_CODES` Set'i **private** (internal only).

### D2 — PaymentMeansCode Config ✅
- `src/calculator/payment-means-config.ts` yeni dosya, 7 sık kod (1/10/20/23/42/48/ZZZ).
- Public API: `isValidPaymentMeansCode`, `getPaymentMeansDefinition`, `PAYMENT_MEANS_DEFINITIONS`.
- `PAYMENT_MEANS_CODES` constants Set'i geniş (20 kod) — M7 değil; kullanıcı talebi #9 doğrultusunda.

## N1 Disiplin Uygulaması (Placeholder Yasağı)

- **Eklenen tüm ISTISNA kodları skill kaynaklarından doğrulandı.** Hiçbir placeholder/TODO isim üretilmedi.
- **Atlanan kodlar:** 9015 (tax). İsim kaynağı: skill v1.42'de yok; schematron'da sadece regex whitelist. `sprint-02-exemption-todo.md`'ye yazıldı, Sprint 8'e devredildi.
- **Skill'de tanımlı ama Sprint 2 scope'unda olmayan kodlar:** 101-108 (ÖTV İstisna), 001 (Konaklama), eski isim güncellemeleri (219, 307, 318). Hepsi `sprint-02-exemption-todo.md`'de detaylı.

## Test Strateji Çıktısı

| Dosya | Test Sayısı |
|---|---|
| `__tests__/calculator/tax-config.test.ts` (yeni) | 10 |
| `__tests__/calculator/withholding-config.test.ts` (yeni) | 10 |
| `__tests__/calculator/exemption-config.test.ts` (yeni) | 47 |
| `__tests__/calculator/unit-config.test.ts` (yeni) | 11 |
| `__tests__/calculator/currency-config.test.ts` (yeni) | 9 |
| `__tests__/calculator/package-type-code-config.test.ts` (yeni) | 33 |
| `__tests__/calculator/payment-means-config.test.ts` (yeni) | 13 |
| `__tests__/builders/invoice-builder-555.test.ts` (yeni, M4) | 4 |
| `__tests__/config/constants-derivation.test.ts` (yeni, M7) | 18 |
| `__tests__/calculator/line-calculator.test.ts` (genişlet, M3 650) | 17 → 22 (+5) |
| **Toplam yeni test** | **160** |
| **Toplam test sayısı (Sprint 2 sonu)** | **278** (118 → 278, 0 regression) |

N1 disiplini kontrolü — `exemption-config.test.ts` içinde 4 placeholder-yasak assertion'ı: `!includes('TODO')`, `!/^Kod \d+/`, `trim().length > 0`, `!== 'Bilinmiyor'`.

## Değişen Dosyalar

### Mevcut (Edit)
- `src/calculator/tax-config.ts` — +4 kod
- `src/calculator/withholding-config.ts` — +650, 616 isim, `dynamicPercent?` alanı
- `src/calculator/exemption-config.ts` — +22 kod, `type: 'OTV'` literal
- `src/calculator/unit-config.ts` — TWH etiket, +D32, +GWH, +MWH, +SM3
- `src/calculator/index.ts` — 2 yeni config export
- `src/calculator/line-calculator.ts:163-195` — 650 dinamik percent cascade
- `src/calculator/simple-types.ts` — `withholdingTaxPercent?: number` alanı
- `src/config/constants.ts` — M7 türev + yeni 2 özel Set + BILGISAYAR çıkış
- `src/types/builder-options.ts` — `allowReducedKdvRate?: boolean`
- `src/validators/type-validators.ts` — 650 dinamik rule + combo padding fix
- `src/builders/invoice-builder.ts` — M4 pre-check
- `src/builders/despatch-builder.ts` — DEFAULT_OPTIONS güncellendi (pre-check eklenmedi)

### Yeni (Create)
- `src/calculator/package-type-code-config.ts` — D1 (27 kod)
- `src/calculator/payment-means-config.ts` — D2 (7 kod)
- `src/validators/reduced-kdv-detector.ts` — M4 util
- 7 yeni config test dosyası + `invoice-builder-555.test.ts` + `constants-derivation.test.ts`
- `audit/sprint-02-plan.md` — kullanıcı onaylı plan (kopya)
- `audit/sprint-02-exemption-todo.md` — N1 TODO listesi
- `audit/sprint-02-implementation-log.md` — bu log

### Dokunulmayan (Sprint 8'e Devir)
- `package.json` (Sprint 1'den kalan uncommitted)
- `src/serializers/despatch-serializer.ts` (Sprint 1'den)
- `src/serializers/invoice-serializer.ts` (Sprint 1'den)
- `src/calculator/simple-invoice-mapper.ts` (N3: mapper dokunulmaz — cascade line-calculator üzerinden)

## Sprint 8'e Devredilen İşler

1. **9015 tax kodu** — skill'de isim yok; GİB uzmanıyla doğrulama sonrası eklenecek.
2. **101-108 ÖTV İstisna kodları** — documentType mimarisi revize edilmesi gerek.
3. **001 Konaklama diplomatik istisna** — KONAKLAMAVERGISI tipi kapsamında.
4. **Eski exemption isim güncellemeleri** (219, 307, 318) — semantik değişim, ayrı sprint.
5. **Currency M7** — ya config genişlet (+38 kod) ya constants küçült (breaking).
6. **Payment Means M7** — kullanıcı #9 cevabı "tümü destekli" — config genişleme tercihi.
7. **Sprint 1'den kalan uncommitted 3 dosya** (package.json, 2 serializer).

## Yeni Public API

- `PACKAGING_TYPE_CODE_DEFINITIONS`, `PACKAGING_TYPE_CODE_MAP`, `isValidPackagingTypeCode`, `getPackagingTypeCodeDefinition`, `PackagingTypeCodeDefinition`
- `PAYMENT_MEANS_DEFINITIONS`, `PAYMENT_MEANS_MAP`, `isValidPaymentMeansCode`, `getPaymentMeansDefinition`, `PaymentMeansDefinition`

Private (AR-4 pattern tutarlı): `UNIT_CODES`, `PACKAGING_TYPE_CODES`, `DEMIRBAS_KDV_EXEMPTION_CODES`, `NON_ISTISNA_REASON_CODES`.

## Son Durum

- `yarn test` → **278/278 passed** (0 kırılma, Sprint 1: 118 → +160 yeni)
- `yarn tsc --noEmit` → clean
- `yarn build` → ESM 178KB + CJS 183KB + DTS 68KB, clean

Sprint 3 (M6 — parent-child) kapsamına geçişe hazır.
