---
sprint: 8f
baslik: Bug Hotfix'leri (Bug #1-3) + examples-matrix %35 → %66 kapsam + README/meta-indexer geliştirmeleri
tarih_basi: 2026-04-24
plan_dosyasi: /Users/berkaygokce/.claude/plans/sprint-8f-keen-cupcake.md
kopya_hedef: audit/sprint-08f-plan.md (8f.0 commit'inde kopyalanacak)
onceki_sprint: audit/sprint-08e-implementation-log.md (commit 52c1ff5, 1049/1049 yeşil, 95 senaryo)
sonraki_sprint: Sprint 8g (v2.0.0 publish + esnek kaydırılan kalemler)
hedef_commit_sayisi: 17 atomik alt-commit (8f.0 → 8f.16)
test_durumu_basi: 1049 / 1049 yeşil
test_durumu_sonu_tahmin: 1191 yeşil (+142: bug fix test'leri + 85 yeni senaryo × ~1.6 test + infra test'leri)
---

## 1. Bağlam

Sprint 8e (commit `52c1ff5`) `examples-matrix/` altyapısını ve 95 senaryoyu bitirdi: `scaffold.ts` + `run-all.ts` + `find.ts` + `meta-indexer.ts` + 2 yeni test suite (snapshot + json-parity + invalid-parity + meta-integrity). `npm test` 1049/1049 yeşil. `src/` Sprint 8e boyunca dokunulmadı.

Sprint 8e'nin fiili çıktısı **kapsam değil kalite**: plan hedefi 272 senaryoydu, %35'inde (95) durduk. Durmamızın nedeni senaryo üretim hızı değil, `src/` altında 3 bug bulunmasıydı:

1. **Bug #1 (Major):** `src/config/constants.ts:77` `WITHHOLDING_ALLOWED_TYPES` set'inde `TEVKIFATIADE` ve `YTBTEVKIFATIADE` eksik. Bu iki tip pratikte stopaj bilgisiyle üretilemez — oysa **tiplerin semantik amacı "tevkifatlı iade" = tevkifat zorunlu**. Etki: 4 profil × 2 tip × 2 baseline varyant = 16 senaryo atlandı (TEVKIFATIADE spec'i `examples-matrix/_lib/specs.ts:363-368`'te comment-out).
2. **Bug #2 (Orta):** `src/validators/type-validators.ts:188-202` `validateOzelMatrah` fonksiyonu sadece `taxExemptionReasonCode` whitelist kontrolü yapıyor — kod **hiç verilmezse** sessiz geçiyor (`actual.errors = []`). OZELMATRAH semantiği gereği 801-812 kod set'inden biri zorunlu.
3. **Bug #3 (Düşük):** `src/validators/profile-validators.ts:248-258` YATIRIMTESVIK profilinde `contractReference` eksikse `profileRequirement` üretiyor ama mesaj "ContractDocumentReference zorunludur" — kullanıcı "ytbNo" demek istiyordu, path teknik XML yapısı. Semantik olarak ayrı bir error code bekleniyor.

Sprint 8f birincil hedefi: **3 bug fix + test + TEVKIFATIADE reaktivasyon**. İkincil hedef: **%35 → %66 kapsam** (180 toplam senaryo). Üçüncül hedef: **README/meta-indexer pivot + coverage gap + filtre genişletme**.

`src/` Sprint 8f'te **YAZILIR** (yalnızca 3 bug fix için) — bunun dışında read-only. Yeni feature / refactor yok.

---

## 2. Bug Hotfix Planı

### 2.1 Bug #1 Fix — `WITHHOLDING_ALLOWED_TYPES` genişletme

**Dosyalar:**

- `src/config/constants.ts:77-81` — set'e `TEVKIFATIADE` + `YTBTEVKIFATIADE` ekle.
- `src/validators/type-validators.ts:32-39` — B-30 hata mesajı listesini güncelle.

**Mevcut (constants.ts:77-81):**
```ts
export const WITHHOLDING_ALLOWED_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.YTBTEVKIFAT,
  InvoiceTypeCode.IADE, InvoiceTypeCode.YTBIADE,
  InvoiceTypeCode.SGK, InvoiceTypeCode.SARJ, InvoiceTypeCode.SARJANLIK,
]);
```

**Yeni:**
```ts
export const WITHHOLDING_ALLOWED_TYPES = new Set<InvoiceTypeCode>([
  InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.TEVKIFATIADE,
  InvoiceTypeCode.YTBTEVKIFAT, InvoiceTypeCode.YTBTEVKIFATIADE,
  InvoiceTypeCode.IADE, InvoiceTypeCode.YTBIADE,
  InvoiceTypeCode.SGK, InvoiceTypeCode.SARJ, InvoiceTypeCode.SARJANLIK,
]);
```

**type-validators.ts:36 mesaj güncelleme:**
```ts
'WithholdingTaxTotal sadece TEVKIFAT/TEVKIFATIADE/YTBTEVKIFAT/YTBTEVKIFATIADE/IADE/YTBIADE/SGK/SARJ/SARJANLIK tiplerinde kullanılabilir'
```

**PROFILE_TYPE_MATRIX doğrulaması (constants.ts:13-59):**

`TEVKIFATIADE` ve `YTBTEVKIFATIADE` matrix'te izinli profil listesi (sadece bu 2 tip Bug #1 kapsamında):
- TEVKIFATIADE: TEMELFATURA, TICARIFATURA, KAMU, ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS, EARSIVFATURA (7 profil)
- YTBTEVKIFATIADE: EARSIVFATURA (1 profil)

Başka "gözden kaçmış" tip yok — `TEVKIFAT_GROUP_TYPES` (72-74) iki tip içerirken `WITHHOLDING_ALLOWED_TYPES` onların IADE eşleniklerini de içermeli. Schematron B-30 kuralı bu mantığı destekler.

**Testler (~3 adet, `__tests__/config-constants.test.ts` — yeni dosya veya mevcut yerleşik):**

- `TEVKIFATIADE tipinde withholdingTaxTotals kabul edilir` — builder `build(input)` başarılı, XML'de WithholdingTaxTotal bloğu olur.
- `YTBTEVKIFATIADE tipinde withholdingTaxTotals kabul edilir`
- `SATIS tipinde withholdingTaxTotals HALA INVALID_VALUE atar` (regresyon guard)

### 2.2 Bug #2 Fix — `validateOzelMatrah` zorunluluk kontrolü

**Dosya:** `src/validators/type-validators.ts:188-202`

**Karar:** `ozelMatrah` alanı tam `InvoiceInput` şemasında yok (simple-types katmanında `SimpleOzelMatrahInput`). Full InvoiceInput'ta OZELMATRAH semantiği KDV subtotal'da `taxExemptionReasonCode` (801-812) varlığı ile ifade edilir. Fix burada olmalı.

**Mevcut (188-202):**
```ts
function validateOzelMatrah(input: InvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const allSubtotals = input.taxTotals?.flatMap(tt => tt.taxSubtotals || []) || [];
  const kdvSubtotals = allSubtotals.filter(ts => ts.taxTypeCode === '0015');

  kdvSubtotals.forEach((ts, i) => {
    if (isNonEmpty(ts.taxExemptionReasonCode) &&
        !OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES.has(ts.taxExemptionReasonCode)) {
      errors.push(invalidValue(`taxTotals.taxSubtotals[${i}].taxExemptionReasonCode`,
        'ozelMatrahTaxExemptionReasonCodeType listesinden (801-812)', ts.taxExemptionReasonCode));
    }
  });

  return errors;
}
```

**Yeni — eklenen zorunluluk kontrolü (ISTISNA grubu pattern'i ile tutarlı, 170-172):**
```ts
kdvSubtotals.forEach((ts, i) => {
  // Yeni: varlık kontrolü (Bug #2)
  if (!isNonEmpty(ts.taxExemptionReasonCode)) {
    errors.push(typeRequirement(InvoiceTypeCode.OZELMATRAH,
      `taxTotals.taxSubtotals[${i}].taxExemptionReasonCode`,
      'OZELMATRAH faturalarında TaxExemptionReasonCode zorunludur (801-812 aralığı)'));
    return; // bu subtotal için whitelist kontrolünü atla
  }
  // Mevcut: whitelist
  if (!OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES.has(ts.taxExemptionReasonCode)) {
    errors.push(invalidValue(...));
  }
});
```

**KDV subtotal hiç yoksa:** `kdvSubtotals.length === 0` durumunda loop çalışmaz, hata üretilmez. Bu "OZELMATRAH tipinde KDV subtotal hiç yok" edge case'i ayrı — `validateCommon` zaten taxTotals zorunluluğunu kovalıyor. **Bu fix kapsamı dışı** (B-30 edge case zaten covered).

**Testler (~3 adet):**
- `OZELMATRAH tipinde taxExemptionReasonCode eksikse TYPE_REQUIREMENT atar`
- `OZELMATRAH tipinde 805 kodu geçerli (mevcut baseline korunur)` — regresyon guard
- `OZELMATRAH tipinde 999 kodu INVALID_VALUE atar (whitelist mevcut davranış)` — regresyon guard

**Mevcut OZELMATRAH senaryolarına etki (R2):** Explore raporunda 3 OZELMATRAH senaryo var (TEMELFATURA + TICARIFATURA + KAMU, her biri kod 801/805 kullanıyor). Hiçbiri fail etmez — whitelist kontrolü bozulmadan önce yeni zorunluluk dalı atlanır.

### 2.3 Bug #3 Fix — `YATIRIMTESVIK_REQUIRES_YTBNO` yeni error code

**Karar (Berkay onayı):** Yeni error code eklenir. API yüzeyi genişleme var — v2.0.0 öncesi son pencere, Added kategorisi.

**Dosyalar:**

1. `src/errors/ubl-build-error.ts` — `UblBuildErrorCode` enum'una `YATIRIMTESVIK_REQUIRES_YTBNO` ekle.
2. `src/validators/validation-result.ts` — yeni helper `yatirimTesvikRequiresYtbNo(path, message)`:
   ```ts
   export function yatirimTesvikRequiresYtbNo(path: string, message: string): ValidationError {
     return { code: UblBuildErrorCode.YATIRIMTESVIK_REQUIRES_YTBNO, path, message };
   }
   ```
3. `src/validators/profile-validators.ts:247-258` `validateYatirimTesvikRules` fonksiyonu:

**Mevcut:**
```ts
if (!input.contractReference) {
  errors.push(profileRequirement(source, 'contractReference',
    'Yatırım Teşvik profilinde ContractDocumentReference zorunludur'));
} else {
  const id = input.contractReference.id;
  if (!isNonEmpty(id)) {
    errors.push(missingField('contractReference.id', 'YTBNO zorunludur'));
  } else if (!hasLength(id, 6) || !isNumeric(id)) {
    errors.push(invalidFormat('contractReference.id', '6 haneli numerik YTBNO', id));
  }
}
```

**Yeni:**
```ts
if (!input.contractReference) {
  errors.push(yatirimTesvikRequiresYtbNo('contractReference',
    'YATIRIMTESVIK profilinde YTBNO (6 haneli numerik) zorunludur'));
} else {
  const id = input.contractReference.id;
  if (!isNonEmpty(id)) {
    errors.push(yatirimTesvikRequiresYtbNo('contractReference.id',
      'YATIRIMTESVIK profilinde YTBNO zorunludur'));
  } else if (!hasLength(id, 6) || !isNumeric(id)) {
    errors.push(invalidFormat('contractReference.id', '6 haneli numerik YTBNO', id));
  }
}
```

**Kapsam:** Hem `validateYatirimTesvik` (YATIRIMTESVIK profili) hem `validateEarsiv` (EARSIV+YTB tipleri) bu shared fonksiyonu çağırır. `source` parametresi zaten branching — source string'i mesaja yansımaz (error code + path yeterli). Yeni error code her iki branch'ta tetiklenir.

**Testler (~3 adet):**
- `YATIRIMTESVIK + contractReference undefined → YATIRIMTESVIK_REQUIRES_YTBNO error atılır`
- `YATIRIMTESVIK + contractReference.id = '' → YATIRIMTESVIK_REQUIRES_YTBNO`
- `EARSIV + YTBSATIS + contractReference undefined → YATIRIMTESVIK_REQUIRES_YTBNO` (shared path)

**Breaking change analizi:** Yeni error code — `UblBuildErrorCode` enum'una eklendiği için tipsel olarak genişler ama eski kod'ları etkilemez. Mevcut 95 senaryoda YATIRIMTESVIK + ytbNo-eksik case'i **yok** (invalid senaryolar incelenmeli — `expectedErrors` PROFILE_REQUIREMENT ile kurulmuş olabilir; reaktivasyon: varsa YATIRIMTESVIK_REQUIRES_YTBNO'ya güncelle). CHANGELOG'da **Added: YATIRIMTESVIK_REQUIRES_YTBNO error code**.

### 2.4 TEVKIFATIADE Reaktivasyonu

**Dosya:** `examples-matrix/_lib/specs.ts:363-368` (comment-out block)

Bug #1 fix sonrası comment-out kaldırılır. 4 profil × 2 baseline varyant = 8 senaryo (TEVKIFATIADE + YTBTEVKIFATIADE):

- **TEVKIFATIADE (7 profil):** TEMELFATURA, TICARIFATURA, KAMU, ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS, EARSIVFATURA için her biri 1 baseline + 1 varyant (stopaj %80 tam tevkifat + %50 dinamik 650) = 14 senaryo. Fakat üst hedef darboğaza sokmamak için **7 baseline + 1 varyant** = **8 senaryo**.
- **YTBTEVKIFATIADE (sadece EARSIVFATURA):** 1 baseline + 1 varyant = 2 senaryo.

**Reaktivasyon commit'i (8f.4):** 10 senaryo reaktive edilir + scaffold çalıştırılır.

### 2.5 Breaking Change — CHANGELOG Added/Changed ayrımı

v2.0.0 henüz publish olmadığı için "breaking" kavramı semantik değil işlevsel. CHANGELOG 8f bölümünde:

**Added:**
- `TEVKIFATIADE` ve `YTBTEVKIFATIADE` tipleri `WithholdingTaxTotal` kabul eder hale geldi (Bug #1 fix).
- `YATIRIMTESVIK_REQUIRES_YTBNO` yeni error code — YATIRIMTESVIK profili / EARSIV+YTB tiplerinde YTBNO eksikse semantik açıklıkla üretilir (Bug #3 fix).
- `validateOzelMatrah` artık KDV subtotal'da `taxExemptionReasonCode` varlığını zorunlu kılar (Bug #2 fix).
- +85 yeni örnek senaryo (`examples-matrix/` genişletme, 95 → 180).
- Pivot tablo + coverage gap report + error/exemption kod dağılımı (`examples-matrix/README.md` genişleme).
- `find.ts` 5 yeni filtre (`--has-withholding`, `--currency`, `--error-code`, `--line-count`, `--exemption-code`).

**Changed:**
- `type-validators.ts` B-30 hata mesajı tip listesini günceller (TEVKIFATIADE/YTBTEVKIFATIADE dahil edildi).

**Fixed:**
- Bug #1, #2, #3 referansları.

---

## 3. Kapsam Hedefi Revizesi — 180 senaryo (~%66)

**Karar (Berkay onayı):** 272 yerine **~180 senaryo** hedefi. Plan hedefinin %66'sı, `~2-3 tam gün` süreli. Gerekçe: Sprint 8e'de kalite odağı ödüllendi (3 bug ortaya çıktı). Sprint 8f'te aynı odak sürer — her profil+tip için **minimum 1 baseline + 2-3 anlamlı varyant** + bug fix kapsamı + multi-error cases. Ni̇ş varyantlar (her profile USD/EUR, her profile 5-satır) Sprint 8g'ye ertelenebilir.

**Delta Dağılımı (95 → ~180):**

| Kategori | Mevcut (8e sonu) | Delta | Hedef (8f sonu) | Commit |
|---|---:|---:|---:|---|
| TEVKIFATIADE reaktivasyon | 0 | +10 | 10 | 8f.4 |
| TEMELFATURA varyantları | 17 | +8 | 25 | 8f.5 |
| TICARIFATURA varyantları | 8 | +5 | 13 | 8f.6 |
| KAMU varyantları | 8 | +4 | 12 | 8f.6 |
| EARSIVFATURA varyantları | 12 | +10 | 22 | 8f.7 |
| YATIRIMTESVIK varyantları | 5 | +5 | 10 | 8f.8 |
| ILAC_TIBBICIHAZ varyantları | 5 | +3 | 8 | 8f.8 |
| IDIS varyantları | 5 | +3 | 8 | 8f.8 |
| IHRACAT + YOLCU + OZELFATURA | 3 | +3 | 6 | 8f.9 |
| HKS + ENERJI | 4 | +2 | 6 | 8f.9 |
| İrsaliye profilleri (3 profil) | 5 | +2 | 7 | 8f.10 |
| **Valid toplamı** | **72** | **+55** | **127** | |
| Invalid single-error edge cases | 23 | +13 | 36 | 8f.11 |
| Invalid multi-error cases | 7 (mevcut) | +12 | 19 | 8f.12 |
| **Invalid toplamı** | **23** | **+25** | **48** | |
| **TOPLAM** | **95** | **+80** | **~175-180** | |

**"Anlamlı varyant" tanımı (Claude'un judgment call yaptığı bölüm):**
- KDV oranları (1/10/20 — geçerli tipte)
- Stopaj (yok / tek / çoklu / 650 dinamik)
- Çoklu satır (1 baseline + seçilmiş profillerde 3-satır)
- Yabancı para (USD+exchange / EUR+exchange) — öncelikli profillerde (IHRACAT, TEMELFATURA, TICARIFATURA, EARSIVFATURA)
- AllowanceCharge (satır / belge / ikisi)
- Özel kimlik alanları (GTİP, ALICIDIBKOD, passport, SGK detay, IDIS SEVKIYATNO+ETIKETNO)
- Ödeme bilgileri (IBAN+PaymentMeans) — KAMU dışı profillerde opsiyonel

**Kartezyen çarpım hayır:** Her profil+tip için 3-8 anlamlı varyant. `examples-matrix/_lib/specs.ts`'te her spec açık hardcoded.

---

## 4. Profil Öncelik Sırası

Berkay'ın Next.js rewrite (sisteminiz-integrator-frontend) kullanım yüzeyi referans:

**Birinci öncelik (zorunlu kapsanacak — 8f'te):**
1. TEMELFATURA — 25 senaryo (en yaygın kullanılan)
2. EARSIVFATURA — 22 senaryo (B2C yaygın + YTB tipleri)
3. TICARIFATURA — 13 senaryo
4. KAMU — 12 senaryo
5. YATIRIMTESVIK — 10 senaryo

**İkinci öncelik (genişletilecek — 8f'te):**
6. ILAC_TIBBICIHAZ — 8 senaryo
7. IDIS — 8 senaryo
8. IHRACAT — 3-4 senaryo

**Üçüncü öncelik (minimum 1-2 — 8f'te):**
9. YOLCUBERABERFATURA — 1-2 senaryo
10. OZELFATURA — 1-2 senaryo
11. HKS — 3 senaryo
12. ENERJI — 3 senaryo

**İrsaliye profilleri (minimum korunur):**
13. TEMELIRSALIYE — 4 (3 → 4)
14. HKSIRSALIYE — 2
15. IDISIRSALIYE — 1-2

---

## 5. Multi-error Stratejisi

**Format:** Mevcut array pattern korunur (`expectedErrors: [{code, path?, messageIncludes?}, ...]`). Multi-error spec'lerde `isMultiError: true` flag mevcut (explore raporu: 7 senaryo).

**Match mantığı:** Mevcut **`expected ⊆ actual`** (superset tolerant) pattern korunur. Validator her beklenen error'u üretmek zorunda; extra error üretirse test geçer (permisif). Alternatif (exact-match) reddedildi — mevcut 7 senaryo refaktör gerektirir, stabilite riski.

**Yeni multi-error cases (+12) — tipik kombinasyonlar:**

1. **TEMELFATURA + SATIS** — currencyCode='XYZ' + exchangeRate eksik (mevcut pattern örneği + 2 benzer edge case)
2. **TEMELFATURA + IADE** — billingReferences eksik + taxExemptionReason eksik (iki farklı validator dalı tetikler)
3. **TICARIFATURA + TEVKIFAT** — withholdingTaxCode geçersiz + percent out-of-range
4. **KAMU + SATIS** — paymentMeans eksik + buyerCustomer.vknTckn eksik (iki farklı profil kuralı)
5. **EARSIVFATURA + YTBSATIS** — contractReference eksik + ItemClassificationCode eksik (YATIRIMTESVIK_REQUIRES_YTBNO + profileRequirement)
6. **YATIRIMTESVIK + ISTISNA + kod 01** — ytbNo eksik + TaxExemptionReasonCode 308 eksik + ModelName eksik (3 error, üç farklı B kuralı)
7. **IDIS + SATIS** — SEVKIYATNO eksik + ETIKETNO eksik (supplier + line kombinasyonu)
8. **ILAC_TIBBICIHAZ + SATIS** — ItemIdentification eksik + customer.taxIdType invalid
9. **IHRACAT** — DeliveryTerms eksik + GTİP eksik + TransportModeCode invalid
10. **OZELMATRAH** — taxExemptionReasonCode eksik + KDV subtotal count mismatch (Bug #2 fix sonrası)
11. **TEKNOLOJIDESTEK** — customer TCKN değil + TELEFON/TABLET_PC kimliği eksik
12. **Cross-error** — Profile + Type overlap (EARSIV + OZELMATRAH kombinasyonu)

**Testler:** Her multi-error senaryo 1 invalid-parity testi (toplam +12 test). `meta.json` `dimensions.errorCount > 1` olarak etiketlenir, meta-integrity suite bu dimensions'ı doğrular.

---

## 6. README / meta-indexer Geliştirmeleri

**Dosya:** `examples-matrix/_lib/meta-indexer.ts` (mevcut ~240 satır) genişletilecek.

### 6.1 Pivot Tablo (Markdown)

Profil × Tip matrisi. Her hücre senaryo sayısı. Boş hücreler `-` ile işaretlenir:

```
| Profil \ Tip | SATIS | IADE | TEVKIFAT | TEVKIFATIADE | ISTISNA | OZELMATRAH | ... |
|---|---:|---:|---:|---:|---:|---:|
| TEMELFATURA | 5 | 2 | 3 | 2 | 4 | 2 | ... |
| TICARIFATURA | 3 | - | 2 | 2 | 2 | 1 | ... |
| ...
```

### 6.2 Coverage Gap Report

Algoritma:
1. `PROFILE_TYPE_MATRIX`'ten (src/config/constants.ts:13-59) tüm [profil, tip] çiftlerini oku — toplam 56 kombinasyon.
2. `examples-matrix/valid/*/meta.json`'ları tara, her senaryonun `dimensions.profile` + `dimensions.invoiceTypeCode`'unu birleştir.
3. Matrix'te var, senaryo meta'da yok = ⚠️ missing. Report satırı:

```
### ⚠️ Coverage Gap (7 kombinasyon kapsamsız)
- EARSIVFATURA × TEKNOLOJIDESTEK — 0 senaryo
- ILAC_TIBBICIHAZ × IADE — 0 senaryo
- ...
```

### 6.3 Error Code Dağılım Grafiği

Her error code için invalid senaryolarda kullanım sayısı — ASCII bar chart:

```
### Error Code Dağılımı
INVALID_VALUE         ████████████ 12
MISSING_FIELD         ████████ 8
TYPE_REQUIREMENT      ██████ 6
PROFILE_REQUIREMENT   ████ 4
YATIRIMTESVIK_REQUIRES_YTBNO  ███ 3  (Sprint 8f)
...
```

### 6.4 Exemption Code Dağılımı

308, 339, 351, 213, 201, 301, 701-704, 801-812 için her biri kaç valid senaryoda kullanılıyor. Aynı bar chart formatı.

### 6.5 Sayısal Özet Dashboard (README üstü)

```
## Özet (Sprint 8f kapanışı)
- **13 profil** × **18 tip** = 56 geçerli kombinasyon (matrix)
- **127 valid senaryo** (dağılım: pivot tablo altında)
- **48 invalid senaryo** (14 error code × 2-4 edge case + 12 multi-error)
- **Coverage:** 49/56 (%87.5) — 7 kombinasyon kapsamsız (bkz. Coverage Gap)
- **Disk:** ~4.5 MB (plan 5 MB eşik altında)
```

---

## 7. `find.ts` Yeni Filtreler

**Dosya:** `examples-matrix/find.ts` (veya `scripts/examples-matrix/find.ts` — explore'da yol konfirmasyonu: `examples-matrix/find.ts`)

**Mevcut flag'ler:** `--profile=X`, `--type=Y`, `--error-code=Z`, `--needs-review`

**Yeni flag'ler (8f.14):**
- `--has-withholding` — `dimensions.withholdingCodes.length > 0` filtresi
- `--currency=<code>` — `dimensions.currency === code` (TRY|USD|EUR)
- `--line-count=<n>` — `dimensions.lineCount === n`
- `--exemption-code=<code>` — `dimensions.exemptionCodes.includes(code)`
- `--kind=<valid|invalid|multi-error>` — üst düzey filtre

Kombinasyon (AND semantiği): `npm run matrix:find -- --profile=TEMELFATURA --has-withholding --currency=USD`

---

## 8. Alt-Sprint Granülaritesi

**Toplam 17 atomik alt-commit** (Berkay'ın prompt öneriyle hafif revizyon):

| Commit | Başlık | Delta (senaryo/test) |
|---|---|---|
| **8f.0** | Plan kopya (`audit/sprint-08f-plan.md`) + implementation log iskeleti | 0 / 0 |
| **8f.1** | Bug #1 fix (WITHHOLDING_ALLOWED_TYPES + B-30 mesajı) + unit test | 0 / +3 |
| **8f.2** | Bug #2 fix (validateOzelMatrah zorunluluk) + unit test | 0 / +3 |
| **8f.3** | Bug #3 fix (YATIRIMTESVIK_REQUIRES_YTBNO error code + helper + branch) + unit test | 0 / +3 |
| **8f.4** | TEVKIFATIADE reaktivasyon (specs.ts + scaffold + 10 senaryo) | +10 / +20 |
| **8f.5** | TEMELFATURA genişletme (+8 varyant) | +8 / +16 |
| **8f.6** | TICARIFATURA +5 + KAMU +4 | +9 / +18 |
| **8f.7** | EARSIVFATURA genişletme (+10 varyant, normal + YTB tipleri) | +10 / +20 |
| **8f.8** | YATIRIMTESVIK +5 + ILAC_TIBBICIHAZ +3 + IDIS +3 | +11 / +22 |
| **8f.9** | IHRACAT + YOLCU + OZELFATURA + HKS + ENERJI (+5 varyant toplam) | +5 / +10 |
| **8f.10** | İrsaliye profilleri genişletme (+2) | +2 / +4 |
| **8f.11** | Invalid single-error edge cases (+13) | +13 / +13 |
| **8f.12** | Multi-error cases (+12) | +12 / +12 |
| **8f.13** | meta-indexer pivot + coverage gap + error/exemption dağılım + dashboard | 0 / +3 (meta-integrity) |
| **8f.14** | find.ts 5 yeni filtre + package.json script güncellemesi | 0 / 0 |
| **8f.15** | Full regression + CHANGELOG 8f + log kapanış | 0 / 0 |
| **8f.16** | v2.0.0 publish checklist üretimi (Berkay manuel publish için rehber) | 0 / 0 |
| **Toplam** | | **+80 / +142** |

**Test delta:** 1049 → **~1191** yeşil.

**"Sapma toleransı" (8e deneyiminden ders):** Alt-commit'ler sırası katı. 8f.1-8f.4 **hiçbir koşulda atlanmaz** (bug fix + reaktivasyon). 8f.5-8f.10 profil genişletme — senaryo sayısı aşırıya çıkarsa her commit'te ~%75'i kapsanabilir. 8f.11-8f.12 invalid genişletme — 8g'ye ertelenebilir (risk R4 tolerans aralığı).

---

## 9. Test Delta Tahmini

| Kategori | Delta |
|---|---:|
| Bug #1 fix unit test | +3 |
| Bug #2 fix unit test | +3 |
| Bug #3 fix unit test | +3 |
| TEVKIFATIADE reaktivasyon (10 × 2 suite) | +20 |
| Valid genişletme (55 × ~1.9 suite: snapshot + json-parity) | +105 |
| Invalid single-error (13 × 1 invalid-parity) | +13 |
| Multi-error (12 × 1 invalid-parity) | +12 |
| meta-integrity (pivot + coverage gap + filter integrity) | +3 |
| **Toplam** | **+162** |

**Başlangıç:** 1049 → **Tahmin sonuç:** 1191-1211 yeşil (marj ±20).

**Not:** Valid genişletmede bazı senaryoları json-parity + snapshot'ın tümü çalıştırıyor (~1.9 test/senaryo); mevcut ortalama 95 senaryo × 22 = ~2 test/senaryo örtüşüyor.

---

## 10. Süre Tahmini

| Aşama | Saat |
|---|---:|
| Bug #1 + #2 + #3 fix'leri + unit test'leri + code review döngüsü | 4-5 |
| TEVKIFATIADE reaktivasyon + specs.ts edit + scaffold çalıştırma | 1 |
| Valid genişletme (55 senaryo × ~5 dk) | 4-5 |
| Invalid + multi-error genişletme (25 senaryo × ~8 dk — daha karmaşık input/expected) | 3-4 |
| meta-indexer geliştirmeleri (pivot + coverage gap + dashboard + bar chart) | 2-3 |
| find.ts yeni filtreler | 1 |
| Full regression + CHANGELOG + log kapanış + publish checklist | 2 |
| **Toplam** | **~17-21 saat** |

**Gerçekçi tahmin:** 2-3 tam gün. 2. günün sonunda "esnek kalemler" (kapsam ayarı matrisi, §11) pragmatik kesim kararı için tetik noktası.

---

## 11. Kapsam Ayarı Matrisi (Süre Aşılırsa Sprint 8g'ye Kaydırılır)

**Asla kaydırılmaz (zorunlu):**
- Bug #1, #2, #3 fix'leri + unit testleri (8f.1-3)
- TEVKIFATIADE reaktivasyon (8f.4) — Bug #1 payoff
- CHANGELOG + log kapanış (8f.15)
- v2.0.0 publish checklist (8f.16)

**Güçlü öncelik (kaydırılmamalı):**
- Her profil+tip için en az 1 baseline (8f.5-8f.10 minimum paketi)
- meta.json `dimensions` tutarlılığı (mevcut test suite yeşil)

**Orta öncelik (esnek):**
- Multi-error cases 12 → 8'e kısıtlanabilir (8f.12)
- Invalid single-error 13 → 8'e kısıtlanabilir (8f.11)
- Pivot tablo + coverage gap (8f.13 yazılır ama bar chart dashboard 8g'ye)

**Esnek (Sprint 8g'ye rahatça kayabilir):**
- Niş profil varyantları (ENERJI, HKS, OZELFATURA >1 varyant, 8f.9)
- `find.ts` 5 filtre → 3 filtre (8f.14)
- EARSIVFATURA 22 → 18 (8f.7)
- Yabancı para USD+EUR ikiz varyantları her profile yerine 5 profile

**Kesim kararı:** 2. günün sonunda kalan senaryo > 40 ise orta + esnek kesilir. Kesilen kalemler `audit/sprint-08g-plan.md` çağrı listesine eklenir.

---

## 12. v2.0.0 Publish İlişkisi

**Karar (Sprint 8c plan'ına uygun):** Berkay manuel publish. Sprint 8f.16'da yalnızca **publish checklist** üretilir (`audit/v2.0.0-publish-checklist.md`), Claude publish çalıştırmaz.

**Checklist içeriği:**
- [ ] `npm test` 1191/1191 yeşil
- [ ] `npm run matrix:run` 180/180 yeşil
- [ ] `npm run examples` 38/38 yeşil
- [ ] `npm run typecheck` 0 error
- [ ] `npm run lint` 0 error
- [ ] `npm run build` dist/ üretildi
- [ ] `package.json` version `2.0.0`
- [ ] `CHANGELOG.md` 2.0.0 bölümü kapandı (8e + 8f entry'leri)
- [ ] `npm pack --dry-run` dist/ + ozellikle *.d.ts + README uygun
- [ ] Berkay: `npm publish` (elle, sprint dışı)

---

## 13. Risk ve Belirsizlikler

**R1. Bug #1 fix mevcut senaryoları bozabilir.** 
Düşük risk. TEVKIFATIADE/YTBTEVKIFATIADE baseline'ları 8e'de comment-out idi — mevcut 95'ten hiçbiri bu iki tipe dayanmıyor. Regresyon: SATIS tipinde withholdingTaxTotals HALA INVALID_VALUE atar mı? Unit test bunu kovalar.

**R2. Bug #2 fix mevcut OZELMATRAH senaryolarını fail edebilir.** 
Düşük risk. Mevcut 3 OZELMATRAH senaryo (TEMELFATURA/TICARIFATURA/KAMU) kod 801 veya 805 kullanıyor (explore raporu). Yeni zorunluluk dalı `!isNonEmpty(ts.taxExemptionReasonCode)` olduğunda tetiklenir — mevcut senaryolarda kod dolu, dal çalışmaz. Yine de `npm run matrix:run` Bug #2 fix sonrası 8f.2'de çalıştırılmalı.

**R3. Bug #3 fix v2.0.0 API yüzeyi genişletiyor.** 
Orta risk. Yeni error code mevcut `UblBuildErrorCode` union type'ını genişletir. TypeScript user code: `switch(err.code)` exhaustive check varsa derleme uyarısı. v2.0.0 **henüz publish olmadığı için** downstream kullanıcı yok — risk teorik. CHANGELOG'da "Added" kategorisi ile transparent kayıt.

**R4. 180 hedefine ulaşamamak (8e'de %35 sapma paterni).** 
Orta risk. Kapsam ayarı matrisi (§11) süre aşılırsa kesim kararı için tetik noktası. Kesim: multi-error 12 → 8, invalid single-error 13 → 8, EARSIVFATURA 22 → 18, ni̇ş profil varyantları 1-2'ye sabitlenir. 150 senaryo tabanına her halükarda ulaşılır.

**R5. Multi-error validator davranışı non-deterministik.** 
Düşük risk. Validator error array sırası: `validateCommon → validateByType → validateByProfile → validateCross` sabit. İçindeki `forEach` loop'lar deterministik. Mevcut "expected ⊆ actual" pattern sırayı umursamıyor. Multi-error testi sıralama kontrol etmez, sadece her beklenen error'un `actual` içinde bulunmasını kontrol eder.

**R6. `PROFILE_TYPE_MATRIX` dışında kalan niş tipler.** 
Düşük risk. Matrix kapsamlı — HKSSATIS, HKSKOMISYONCU, SARJ, SARJANLIK, YTBSATIS vb. tümü mevcut. 8e'de eksik tip olmadığı zaten doğrulandı. 8f kapsamı matrix'e sadık kalır.

**R7. Scaffold performans 85 yeni senaryoda.** 
Düşük risk. 8e'de 95 senaryo scaffold <3 dk. 85 ek senaryo benzer sürede tamamlanır. Idempotent re-run <30 saniye.

**R8. meta-indexer pivot tablo + coverage gap bar chart'ta side-effect.** 
Düşük risk. README.md auto-generated, mevcut `meta-integrity.test.ts` schema doğrular. Yeni section'lar markdown render için tam güvenli (terminal Markdown görüntü önerileri bar chart'ı bozmaz).

**R9. Sprint 8f süre aşarsa 8g'ye olan kalemler v2.0.0 publish'i geciktirebilir.** 
Düşük risk. Berkay manuel publish 8f.16 checklist ile tetikler — publish 8g'yi beklemek zorunda değil. "Esnek kalemler" v2.0.0 publish'ten sonra v2.1.0'a akıtılabilir. Publish decision Berkay'a bırakılır.

---

## 14. Doğrulama (Verification)

**Sprint 8f.15'te (full regression):**

```bash
npm test           # → 1191/1191 yeşil (hedef ±20)
npm run matrix:run # → ~180/180 başarılı (127 valid + ~48 invalid)
npm run examples   # → 38/38 başarılı (mevcut examples/ regresyon)
npm run typecheck  # → 0 error
npm run lint       # → 0 error
npm run build      # → dist/ (CJS + ESM + DTS)
```

**Manuel spot-check (Bug fix'ler için):**
- TEVKIFATIADE baseline senaryosu XML output'unda `<cac:WithholdingTaxTotal>` bloğu mevcut.
- YATIRIMTESVIK + ytbNo eksik → `actual-error.json` içinde `code: "YATIRIMTESVIK_REQUIRES_YTBNO"` görünür.
- OZELMATRAH + taxExemptionReasonCode eksik → `actual-error.json` içinde `code: "TYPE_REQUIREMENT"` + path `taxTotals.taxSubtotals[0].taxExemptionReasonCode`.

**meta-indexer doğrulama:**
```bash
npm run matrix:readme  # README.md regenerate
git diff examples-matrix/README.md  # pivot + coverage gap + dashboard görünür
```

**find.ts yeni filtreler:**
```bash
npm run matrix:find -- --has-withholding               # 25+ senaryo (TEVKIFAT* ve stopajlı IADE'ler)
npm run matrix:find -- --currency=USD                  # ~8-10 senaryo
npm run matrix:find -- --error-code=YATIRIMTESVIK_REQUIRES_YTBNO  # 3 senaryo
npm run matrix:find -- --exemption-code=308            # 3-4 senaryo
```

---

## 15. Kritik Dosyalar (Sprint 8f'te Düzenlenecek)

**`src/` değişiklik alanı (3 bug fix):**
- `src/config/constants.ts:77-81` — WITHHOLDING_ALLOWED_TYPES set genişletme
- `src/validators/type-validators.ts:36` (B-30 mesaj) + `:188-202` (validateOzelMatrah zorunluluk)
- `src/validators/profile-validators.ts:248-258` (YATIRIMTESVIK_REQUIRES_YTBNO branch)
- `src/errors/ubl-build-error.ts` — UblBuildErrorCode enum'a YATIRIMTESVIK_REQUIRES_YTBNO
- `src/validators/validation-result.ts` — yatirimTesvikRequiresYtbNo helper

**`examples-matrix/` genişletme alanı:**
- `examples-matrix/_lib/specs.ts` — 2750 → ~4500 satır (85 yeni spec + TEVKIFATIADE reaktivasyon)
- `examples-matrix/_lib/meta-indexer.ts` — ~240 → ~400 satır (pivot + coverage gap + dashboard)
- `examples-matrix/find.ts` — 5 yeni filtre
- `examples-matrix/valid/*/` — 55 yeni senaryo klasörü
- `examples-matrix/invalid/*/` — 25 yeni senaryo klasörü

**`__tests__/` genişletme alanı:**
- `__tests__/unit/` — Bug fix testleri (config-constants.test.ts? validators.test.ts? mevcut yapıyı takip et)

**`audit/` alanı:**
- `audit/sprint-08f-plan.md` — plan kopyası (8f.0)
- `audit/sprint-08f-implementation-log.md` — her commit'te güncellenir
- `audit/v2.0.0-publish-checklist.md` — 8f.16'da üretilir

**`CHANGELOG.md`** — 2.0.0 bölümü içinde Sprint 8f section'ı 8f.15'te eklenir.

---

## 16. Yeniden Kullanılacak Mevcut Altyapı

- `examples-matrix/scaffold.ts` — idempotent; `--force`, `--dry-run`, `--only` flag'leri. 85 yeni senaryo için zero-change kullanılır.
- `examples-matrix/_lib/input-serializer.ts` — TS kaynak üretim (single-quote, trailing comma). Zero-change.
- `examples-matrix/_lib/runScenario.ts` + `runDespatch.ts` + `runInvalid.ts` — runner. Zero-change.
- `examples-matrix/_lib/scenario-spec.ts` — type tanımları. `expectedErrors` array zaten multi-error destekler.
- `__tests__/examples-matrix/*.test.ts` — dinamik discovery (klasör tarama); 85 yeni senaryo otomatik algılanır.
- `PROFILE_TYPE_MATRIX` (constants.ts:13-59) — coverage gap algoritması için authoritative kaynak.

**Yeniden yazılmayacak:** Scaffold, input-serializer, runner, test suite'lar. Sadece `specs.ts` (spec data) + `meta-indexer.ts` (README genişletme) + `find.ts` (filtre genişletme) + `src/` (3 bug fix).

---

## Disiplin Notları

- **`src/` SADECE Bug #1-3 fix için yazılır.** Yeni feature yok. Refactor yok.
- **Mimari kararlar M1-M12, AR-1..AR-9 stabil.** Yeni M slot yok.
- **Plan kopya pattern'i (feedback memory):** 8f.0 alt-commit'te bu plan dosyası `audit/sprint-08f-plan.md`'ye kopyalanır.
- **Mevcut 95 senaryoya dokunulmaz** (sadece TEVKIFATIADE reaktivasyon — 8e'de comment-out edildiği için).
- **Mevcut `examples/` 38 senaryo dokunulmaz.**
- **Multi-error pattern mevcut `expected ⊆ actual` korunur.**
- **Every alt-commit kendi bölümüyle `audit/sprint-08f-implementation-log.md`'ye yazılır** (8e deseni).

## Açık Soru / Kaldırılan Belirsizlik

Hiçbiri. Berkay'ın prompt'unda ve AskUserQuestion cevaplarında tüm kritik kararlar netleşti:
- ✅ Bug #3 → yeni `YATIRIMTESVIK_REQUIRES_YTBNO` error code
- ✅ Kapsam → 180 senaryo (%66)
- ✅ Multi-error → superset pattern korunur
- ✅ v2.0.0 publish → Berkay manuel (8f.16 checklist üretir)
- ✅ Sprint 8g → esnek kalemler taşma için bekleme odası
