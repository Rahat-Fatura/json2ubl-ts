---
karar: Sprint 8i (Faz 2) — Suggestion Engine + Examples-Matrix Converter Tasarım Dokümanı (FINALIZED)
hedef: Reactive InvoiceSession Faz 2 implementasyonu için taktik tasarım
versiyon: v2.1.0 → v2.2.0
durum: Tasarım — KİLİTLİ (S-1/S-3/S-5/S-6 Berkay onayı + T-1..T-7 plan önerileri entegre)
tarih: 2026-04-27
referans: audit/reactive-session-master-plan.md §3, audit/sprint-08h-tasarim.md, /Users/berkaygokce/.claude/plans/sprint-8i-faz-proud-lake.md
---

# Sprint 8i — Faz 2 Tasarım Dokümanı (Finalized)

Bu doküman, master plan §3'teki Faz 2 kapsamını (`SuggestionEngine` + `suggestion` event + 25 kural + 200 senaryo converter) **uygulanabilir** hale getiren taktik tasarımdır. Master plan stratejik vizyonu, bu doküman uygulama detaylarını içerir. Tüm tasarım kararları (S-1/S-3/S-5/S-6 Berkay onayı + T-1..T-7 plan önerisi) kilitli; implementation prompt'u sıradaki adım.

**Kapsam (master plan §3.1):** `SuggestionEngine` katmanı (pure function) + `suggestion` event akışı (batch payload) + deklaratif kural tabanı (25 kural, 6 domain dosyası) + Sprint 8h.9'dan ertelenen examples-matrix converter (200 senaryo, path sequence formatı) + Suggestion vs Validator dikhotomi enforce'u (§3.3 master plan).

**Faz 1 (Sprint 8h, v2.1.0) state özeti:**
- ✅ Path-based `update<P>(path, value)` API + 4-katman validation (D-1..D-2)
- ✅ 19 event + sıralı emission (D-12 forcedReason)
- ✅ Field-level granülarity: `field-changed`, `field-activated/deactivated`, `line-field-changed`
- ✅ `LineFieldVisibility` array senkron (`_uiState.lineFields[i]`)
- ✅ Validator pipeline (5 validator → ValidationError raw + ValidationWarning köprü, B-NEW-11/M11/M12)
- ✅ B-78 parametre köprüsü (`deriveB78Params()` 7 parametre)
- ✅ Performance benchmark zorunlu: 0.16ms / 15ms threshold (D-7, MR-1 mitigation)
- ✅ 1407/1407 test yeşil

**Faz 2 (bu sprint) eklenir:**
- 🔜 `Suggestion` tip + `runSuggestionEngine()` pure function (T-2)
- 🔜 `suggestion: Suggestion[]` batch event (S-3)
- 🔜 25 kural — 6 domain dosyası (T-6 kural organizasyonu)
- 🔜 Diff algoritması (`_lastSuggestions` session field, primary key `ruleId+path`)
- 🔜 Event sıralaması: 19 → 21 (suggestion 21. adım)
- 🔜 `scripts/example-to-session-script.ts` converter (8h.9 borç) — 200 senaryo
- 🔜 Performance bütçesi: suggestion ≤ 5ms (toplam 15ms threshold içi)

---

## 1. SuggestionEngine API

### 1.1 Çekirdek Tipler

**Karar (T-1):** Severity 2-seviyeli. Granüler ayrım (`recommended-strong | recommended-weak`) UX'te confusion yaratır — kullanıcı 4 farklı tonu mavi ikonla ayırt edemez. `recommended` = sistem güçlü hatırlatma, `optional` = ipucu/heuristic.

**Karar (T-3):** RuleId namespace formatı `{domain}/{slug}`. Plain id (`kdv0-suggest-351`) reddedildi — namespace dosya hierarchy'siyle 1:1 maps, future-proof. RuleId aynı zamanda diff primary key'in parçası (T-2 ile birlikte).

**Karar (T-5):** `displayLabel`, `displayValue` opsiyonel. Çekirdek üç alan (path/value/reason) yeterli — UI rendering hint'leri kural yazarının takdirine bırakılır. Mimsoft Next.js rewrite'ta hangilerinin kullanıldığı 8j retro'sunda gözden geçirilir.

```typescript
/**
 * Faz 2 Suggestion — kullanıcıya verilen advisory öneri.
 *
 * Validator vs Suggestion dikhotomi (master plan §3.3):
 * - Validator: blocking, severity error/warning, ValidationError emit
 * - Suggestion: advisory, severity recommended/optional, Suggestion emit
 *
 * Aynı path için ikisi paralel emit edilebilir; UI iki kanalı yan yana sunar.
 */
export interface Suggestion {
  /** SessionPaths.X formatında path. Örn: 'lines[0].kdvExemptionCode'. */
  path: string;

  /** Önerilen değer. Path'in beklediği tipte (SessionPathMap[path]). */
  value: unknown;

  /** UI tooltip için Türkçe açıklama. Örn: '351 KDV istisna kodu uygundur.'. */
  reason: string;

  /** Severity: recommended (sistem hatırlatma) | optional (ipucu/heuristic). */
  severity: 'recommended' | 'optional';

  /** Namespace'li ruleId. Format: '{domain}/{slug}'. Örn: 'kdv/zero-suggest-351'. */
  ruleId: string;

  /** UI rendering için label opsiyonel. Örn: '351 — KDV İstisna'. */
  displayLabel?: string;

  /** UI rendering için human-readable value. Örn: '351'. */
  displayValue?: string;
}

/**
 * Suggestion kuralı — deklaratif tanım.
 *
 * applies(): kuralın bu input + ui state için aktif olup olmadığı (boolean)
 * produce(): kuralın suggestion(lar) üretmesi (0..N suggestion array)
 *
 * Bir kural birden fazla suggestion üretebilir (örn. tüm satırlarda kdv=0
 * ise her satır için ayrı suggestion). Boş array = kural pas.
 */
export interface SuggestionRule {
  /** Namespace'li ruleId. Örn: 'kdv/zero-suggest-351'. */
  id: string;

  /** Kural bu state için aktif mi? Hızlı pre-filter (pure, side-effect yok). */
  applies: (input: SimpleInvoiceInput, ui: InvoiceUIState) => boolean;

  /** Suggestion(lar) üret. applies()=true ise çağrılır. */
  produce: (input: SimpleInvoiceInput, ui: InvoiceUIState) => Suggestion[];
}
```

### 1.2 Engine — Pure Function

**Karar (T-2):** Engine tamamen pure (state yok, side-effect yok). Diff session içinde yapılır (`_lastSuggestions` private field). Master plan §3.1'in "pure function" iması korunur, ama **diff state gerektirir** (önceki tick'i bilmek lazım) — çözüm: engine her çağrıda full liste döner, session diff hesaplar.

**Karar (T-7):** Engine her çağrıda full eval (incremental yok). Baseline 0.16ms (mevcut pipeline) + 5ms suggestion bütçesi = 5.16ms ≤ 15ms threshold rahat. Incremental optimization (örn. değişen path'e bağlı kuralları cherry-pick) Faz 3'e ertelenir — premature optimization riski.

```typescript
/**
 * SuggestionEngine giriş noktası — pure function.
 *
 * @param input  Mevcut invoice input (SimpleInvoiceInput).
 * @param ui     Mevcut UI state (InvoiceUIState — visibility flag'leri).
 * @returns Tüm aktif suggestion'lar (full liste, sıralanmış).
 *
 * Sıralama: KDV → Tevkifat → IHRACKAYITLI → YATIRIMTESVIK → Delivery → Misc.
 * Domain bazlı sıralama UI'da deterministic gösterim için (T-6 ile uyumlu).
 *
 * Performance: 25 kural × 100 satır ≈ 2500 evaluation. Hedef ≤5ms.
 */
export function runSuggestionEngine(
  input: SimpleInvoiceInput,
  ui: InvoiceUIState,
): Suggestion[] {
  const all: Suggestion[] = [];
  for (const rule of SUGGESTION_RULES) {
    if (!rule.applies(input, ui)) continue;
    all.push(...rule.produce(input, ui));
  }
  return all;
}
```

**Konum:** `src/calculator/suggestion-engine.ts` (~30-50 satır — sadece giriş noktası + ortak utility).

### 1.3 SUGGESTION_RULES Manifest

**Karar (T-6):** Domain bazlı bölme (validator pattern'iyle simetrik). 25 kural tek dosyada okunmaz; mevcut `src/validators/` organizasyonu zaten domain bazlı (`manual-exemption-validator`, `phantom-kdv-validator`, `yatirim-tesvik-validator`). Suggestion-rules paralel yapı:

```typescript
// src/calculator/suggestion-rules/index.ts
import { KDV_SUGGESTIONS } from './kdv-suggestions';
import { WITHHOLDING_SUGGESTIONS } from './withholding-suggestions';
import { IHRACKAYITLI_SUGGESTIONS } from './ihrackayitli-suggestions';
import { YATIRIM_TESVIK_SUGGESTIONS } from './yatirim-tesvik-suggestions';
import { DELIVERY_SUGGESTIONS } from './delivery-suggestions';
import { MISC_SUGGESTIONS } from './misc-suggestions';

/** Faz 2 — 25 kural. Sıralama: KDV → Tevkifat → IHRACKAYITLI → YTB → Delivery → Misc. */
export const SUGGESTION_RULES: readonly SuggestionRule[] = [
  ...KDV_SUGGESTIONS,           // 8 kural
  ...WITHHOLDING_SUGGESTIONS,   // 5 kural
  ...IHRACKAYITLI_SUGGESTIONS,  // 3 kural
  ...YATIRIM_TESVIK_SUGGESTIONS, // 4 kural
  ...DELIVERY_SUGGESTIONS,      // 3 kural (delivery 2 + format 1)
  ...MISC_SUGGESTIONS,          // 2 kural (currency 1 + paymentMeans 2 → 3 toplam, manifest'te yeniden sayılacak)
];
```

**Toplam = 25 kural.** Her domain dosyası kendi `SuggestionRule[]` array'ini export eder; manifest birleştirir.

---

## 2. Kural Organizasyonu

### 2.1 Dosya Hierarşisi

```
src/calculator/
├── suggestion-engine.ts                    — runSuggestionEngine() (~50 satır)
└── suggestion-rules/
    ├── index.ts                            — SUGGESTION_RULES manifest (~30 satır)
    ├── kdv-suggestions.ts                  — 8 kural (~250 satır)
    ├── withholding-suggestions.ts          — 5 kural (~180 satır)
    ├── ihrackayitli-suggestions.ts         — 3 kural (~120 satır)
    ├── yatirim-tesvik-suggestions.ts       — 4 kural (~150 satır)
    ├── delivery-suggestions.ts             — 3 kural (~110 satır)
    └── misc-suggestions.ts                 — 2 kural (~80 satır)
```

**Toplam üretilen kod:** ~970 satır src/ + ~1500-2000 satır test (kural × 4 test ortalaması).

### 2.2 Kural Dosyası Şablonu

Sprint 8h validator pattern'iyle uyumlu — `validateManualExemption` template'i:

```typescript
// src/calculator/suggestion-rules/kdv-suggestions.ts
import type { SuggestionRule, Suggestion } from '../suggestion-types';
import type { SimpleInvoiceInput } from '../simple-types';
import type { InvoiceUIState } from '../invoice-rules';
import { isSelfExemptionInvoice } from '../invoice-rules'; // mevcut helper, reuse

/**
 * KDV-related suggestion kuralları (Faz 2).
 *
 * Kural numaralandırma master plan §3.1 + sprint plan §3'e referans.
 * Her kural: applies (pre-filter) + produce (suggestion array).
 */

const KDV_ZERO_SUGGEST_351: SuggestionRule = {
  id: 'kdv/zero-suggest-351',
  applies: (input, _ui) => {
    if (isSelfExemptionInvoice(input.type, input.profile)) return false;
    return input.lines.some(line => line.kdvPercent === 0 && !line.kdvExemptionCode);
  },
  produce: (input, _ui) => {
    const out: Suggestion[] = [];
    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      if (line.kdvPercent === 0 && !line.kdvExemptionCode) {
        out.push({
          path: `lines[${i}].kdvExemptionCode`,
          value: '351',
          reason: 'KDV=0 satır için 351 KDV istisna kodu yaygın bir varsayılandır.',
          severity: 'recommended',
          ruleId: 'kdv/zero-suggest-351',
          displayLabel: '351 — KDV İstisna',
          displayValue: '351',
        });
      }
    }
    return out;
  },
};

// ... diğer 7 KDV kuralı aynı şablonda

export const KDV_SUGGESTIONS: SuggestionRule[] = [
  KDV_ZERO_SUGGEST_351,
  KDV_YTB_ISTISNA_SUGGEST_308,
  KDV_YTB_ISTISNA_SUGGEST_339,
  KDV_ZERO_CLEAR_EXEMPTION_ON_RATE_CHANGE,
  KDV_EXEMPTION_MISMATCH_TAX_TYPE,
  KDV_MANUAL_EXEMPTION_SUGGEST_LINE_DISTRIBUTION,
  KDV_REDUCED_RATE_SUGGEST_1,
  KDV_REDUCED_RATE_SUGGEST_8_10,
];
```

### 2.3 Tip Dosyası

```typescript
// src/calculator/suggestion-types.ts
export interface Suggestion { /* §1.1 */ }
export interface SuggestionRule { /* §1.1 */ }
```

**Konum:** `src/calculator/suggestion-types.ts` (ayrı dosya — mevcut `simple-types.ts` benzeri pattern; `invoice-session.ts` ve kural dosyaları sirkülasyon olmadan import eder).

### 2.4 Helper Reuse

**Mevcut yapıdan reuse edilecek helper'lar:**
- `isSelfExemptionInvoice(type, profile)` — `invoice-rules.ts` (var, KDV kurallarında pre-filter)
- `deriveTypeProfileFlags(type, profile)` — `line-field-visibility.ts` (var, IHRACKAYITLI/YTB pre-filter)
- `PHANTOM_KDV_EXEMPTION_CODES` — `phantom-kdv-rules.ts` (var, kdv/exemption-mismatch-tax-type için)
- `WITHHOLDING_TAX_DEFINITIONS` — `withholding-config.ts` (var, withholding/tevkifat-default-codes için)

**Yeni helper YAZILMAZ.** Kural pure logic — mevcut config sabitleri ve helper'lar yeterli.

---

## 3. Faz 2 Kural Listesi (25 Kural)

Bu bölüm her kuralın `applies()` koşulunu, `produce()` çıktısını, severity gerekçesini ve test senaryosunu detaylandırır. Plan dosyasındaki numaralandırma korunur.

### 3.1 KDV Grubu (8 kural)

#### Kural 1: `kdv/zero-suggest-351`
- **applies:** `!isSelfExemptionInvoice(type, profile) && lines[i].kdvPercent===0 && !lines[i].kdvExemptionCode`
- **produce:** Her uygun satır için `{ path: 'lines[i].kdvExemptionCode', value: '351', severity: 'recommended' }`
- **severity:** `recommended` — KDV=0 için 351 standart varsayılan, kullanıcının kasıtlı boş bırakması nadir
- **Hariç tutulan tipler:** ISTISNA, IHRACAT, YATIRIMTESVIK (self-exemption listesi — `isSelfExemptionInvoice` mevcut)
- **Test (4):** (a) TEMELFATURA + 1 satır kdv=0 → 351 öner | (b) ISTISNA + kdv=0 → öneri yok | (c) Kdv=0 + kod=351 → öneri yok | (d) 3 satır 2 boş → 2 öneri

#### Kural 2: `kdv/ytb-istisna-suggest-308`
- **applies:** `profile==='YATIRIMTESVIK' && type==='ISTISNA' && lines[i].kdvPercent===0 && lines[i].itemClassificationCode==='01' && !lines[i].kdvExemptionCode`
- **produce:** `{ path: 'lines[i].kdvExemptionCode', value: '308', reason: 'YTB Makine + KDV=0 için 308.', severity: 'recommended' }`
- **severity:** `recommended` — M12 phantom-kdv-validator kuralının suggestion karşılığı
- **Test (3):** (a) YTB+ISTISNA+itemClass=01+kdv=0 → 308 öner | (b) itemClass=02 → öner değil (Kural 3) | (c) Profile≠YTB → öner değil

#### Kural 3: `kdv/ytb-istisna-suggest-339`
- **applies:** Kural 2 ile aynı + `itemClassificationCode==='02'`
- **produce:** `value: '339', reason: 'YTB İnşaat + KDV=0 için 339.'`
- **severity:** `recommended`
- **Test (3):** Kural 2 mirror

#### Kural 4: `kdv/zero-clear-exemption-on-rate-change`
- **applies:** Bu kural **session diff state'ine bağımlı** — engine pure çağrılarken bu transition tespit edilemez. ÇÖZÜM: Suggestion engine bu kuralı çağırmaz; transition `lineFieldChanged` event listener'da pseudo-suggestion oluşturulur (T-2 istisnası). Tasarımı netleştirilemediği için Faz 2'den **çıkarılır** ve Sprint 8j'ye ertelenir.
- **STATÜ:** ❌ Sprint 8i kapsam dışı (R5 ile ilişkili)

> Kural 4 çıkarıldığı için KDV grubu 7 kurala düşer. Toplam 25 → 24 kural. Aşağıda yeni numaralandırma kullanılır.

#### Kural 4 (eski 5): `kdv/exemption-mismatch-tax-type`
- **applies:** `lines[i].kdvExemptionCode && type==='TEVKIFAT' && lines[i].kdvExemptionCode !== ALLOWED_FOR_TEVKIFAT[i]` (EXEMPTION_TYPE_MATRIX referansı)
- **produce:** `{ path: 'lines[i].kdvExemptionCode', value: undefined, reason: 'Kod tevkifat tipiyle uyumlu değil — silmeyi düşünün.', severity: 'recommended' }`
- **severity:** `recommended` — validator zaten error veriyor olabilir (B-NEW-11), suggestion ek olarak fix path önerir
- **Test (3):** Matrix'ten örnek uyumsuz kod, matrix'ten uyumlu kod, type SATIS → fix önerisi yok

#### Kural 5 (eski 6): `kdv/manual-exemption-suggest-line-distribution`
- **applies:** Belge seviyesi 351 + `lines.some(l => l.kdvPercent > 0 && l.kdvExemptionCode === '351')` (paradoksal durum)
- **produce:** `{ path: 'lines[i].kdvPercent', value: 0, reason: '351 kodu KDV=0 için. Satırın KDV oranını 0 yapmayı düşünün.', severity: 'optional' }`
- **severity:** `optional` — kullanıcı kasıtlı paradoks oluşturmuş olabilir
- **Test (3):** Paradoks → öneri | Tutarlı → öneri yok | Karma satırlar → sadece çelişen

#### Kural 6 (eski 7): `kdv/reduced-rate-suggest-1`
- **applies:** `allowReducedKdvRate=false` + `lines[i].kdvPercent===1` (M4 / B-78.1 — opt-in olmadan kullanılmamalı)
- **produce:** `{ path: 'lines[i].kdvPercent', value: 8, reason: '%1 KDV için allowReducedKdvRate opt-in gerekiyor. %8 yaygın alternatif.', severity: 'recommended' }`
- **severity:** `recommended` — M4 kontratı, ekonomik etkisi yüksek
- **Test (3):** kdv=1 + opt-in false → öneri | kdv=1 + opt-in true → öneri yok | kdv=0/8/18 → öneri yok

#### Kural 7 (eski 8): `kdv/reduced-rate-suggest-8-10`
- **applies:** `lines[i].kdvPercent===8 || lines[i].kdvPercent===10` (kanun değişikliği rehberi — 2024 sonrası 20'ye çıkışta)
- **produce:** `{ path: 'lines[i].kdvPercent', value: 20, reason: 'Genel KDV oranı %20. Eski %8/%10 oranlarını kontrol edin.', severity: 'optional' }`
- **severity:** `optional` — kanun değişikliği bilgilendirici, kullanıcı bilerek eski oran kullanabilir
- **Test (3):** kdv=8 → öneri | kdv=20 → öneri yok | kdv=10 → öneri (8 ile aynı reason)

**KDV grubu test alt-toplam:** ~22 test (7 kural × 3-4 test).

### 3.2 Tevkifat Grubu (5 kural)

#### Kural 8: `withholding/tevkifat-default-codes`
- **applies:** `(type==='TEVKIFAT' || type==='YTBTEVKIFAT') && lines[i].withholdingTaxCode===undefined`
- **produce:** `{ path: 'lines[i].withholdingTaxCode', value: '602', reason: 'TEVKIFAT için 602 (4/10) yaygın kod.', severity: 'recommended', displayValue: '602 — 4/10' }`
- **severity:** `recommended` — TEVKIFAT için kod zorunlu, fakat seçim subjektif
- **Not:** İlk yaygın 3 kodu öneriler (602, 621, 650) — Faz 2'de sadece 602 tek-kod öneri. Çoklu öneri Faz 3'e ertelenir
- **Test (4):** TEVKIFAT + boş → 602 öner | TEVKIFAT + dolu → öneri yok | SATIS + boş → öneri yok | YTBTEVKIFAT + boş → 602 öner

#### Kural 9: `withholding/650-percent-required`
- **applies:** `lines[i].withholdingTaxCode==='650' && (lines[i].withholdingPercent===undefined || lines[i].withholdingPercent === null)`
- **produce:** `{ path: 'lines[i].withholdingPercent', value: undefined, reason: '650 dinamik tevkifat — yüzde girilmeli.', severity: 'recommended' }`
- **severity:** `recommended` — 650 olmadan XML üretiminde hata, value=undefined kullanıcının girmesi için işaret
- **Test (3):** code=650 + percent boş → öneri | code=650 + percent dolu → öneri yok | code=602 → öneri yok

#### Kural 10: `withholding/profile-tevkifat-suggests-ticarifatura`
- **applies:** `type==='TEVKIFAT' && profile==='TEMELFATURA'`
- **produce:** `{ path: 'profile', value: 'TICARIFATURA', reason: 'TEVKIFAT genelde TİCARİFATURA profiliyle kullanılır. Kontrol ediniz.', severity: 'optional' }`
- **severity:** `optional` — geçerli kombinasyon (cross-check'ten geçer), sadece domain bilgisi
- **Test (2):** TEVKIFAT+TEMELFATURA → öneri | TEVKIFAT+TICARIFATURA → öneri yok

#### Kural 11: `withholding/exemption-conflict`
- **applies:** `lines[i].withholdingTaxCode && lines[i].kdvExemptionCode` (aynı satırda)
- **produce:** `{ path: 'lines[i].kdvExemptionCode', value: undefined, reason: 'Tevkifat + istisna aynı satırda. Birini kaldırınız.', severity: 'recommended' }`
- **severity:** `recommended` — manual-exemption-validator R1 (B-NEW-11) suggestion karşılığı
- **Test (3):** Çakışma → öneri | Sadece tevkifat → öneri yok | Sadece istisna → öneri yok

#### Kural 12: `withholding/ytb-tevkifat-itemclass-required`
- **applies:** `type==='YTBTEVKIFAT' && !lines[i].itemClassificationCode`
- **produce:** `{ path: 'lines[i].itemClassificationCode', value: '01', reason: 'YTBTEVKIFAT için Makine (01) varsayılanı.', severity: 'recommended' }`
- **severity:** `recommended`
- **Test (3):** YTBTEVKIFAT + boş → öneri | YTBTEVKIFAT + 01 → öneri yok | TEVKIFAT + boş → öneri yok

**Tevkifat grubu test alt-toplam:** ~15 test.

### 3.3 IHRACKAYITLI Grubu (3 kural)

#### Kural 13: `ihrackayitli/702-default-suggestion`
- **applies:** `type==='IHRACKAYITLI' && !lines[i].kdvExemptionCode`
- **produce:** `{ path: 'lines[i].kdvExemptionCode', value: '702', reason: 'IHRACKAYITLI için 702 standart kod.', severity: 'recommended' }`
- **severity:** `recommended`
- **Test (3):** IHRACKAYITLI + boş → 702 öner | IHRACKAYITLI + 702 → öneri yok | SATIS + boş → öneri yok

#### Kural 14: `ihrackayitli/702-gtip-required`
- **applies:** `type==='IHRACKAYITLI' && lines[i].kdvExemptionCode==='702' && !lines[i].delivery?.gtipNo`
- **produce:** `{ path: 'lines[i].delivery.gtipNo', value: undefined, reason: '702 kodu için GTİP No zorunlu (12 hane).', severity: 'recommended' }`
- **severity:** `recommended` — ihrackayitli-validator B-NEW-XX paralel
- **Test (3):** 702 + boş GTİP → öneri | 702 + dolu GTİP → öneri yok | 702 olmayan → öneri yok

#### Kural 15: `ihrackayitli/702-alicidib-required`
- **applies:** Kural 14 ile aynı + `!lines[i].delivery?.alicidibsatirkod`
- **produce:** `{ path: 'lines[i].delivery.alicidibsatirkod', value: undefined, reason: '702 kodu için Alıcı DİB satır kodu gereklidir.', severity: 'recommended' }`
- **severity:** `recommended`
- **Test (3):** 702 + boş alicidib → öneri | dolu → öneri yok | 702 olmayan → öneri yok

**IHRACKAYITLI grubu test alt-toplam:** ~9 test.

### 3.4 YATIRIMTESVIK Grubu (4 kural)

#### Kural 16: `yatirim-tesvik/itemclass-default`
- **applies:** `profile==='YATIRIMTESVIK' && !lines[i].itemClassificationCode`
- **produce:** `{ path: 'lines[i].itemClassificationCode', value: '01', reason: 'YATIRIMTESVIK için Makine (01) yaygın varsayılan.', severity: 'recommended', displayLabel: '01 — Makine Teçhizat' }`
- **severity:** `recommended`
- **Test (3):** YTB + boş → 01 öner | YTB + 01 → öneri yok | YTB + 02 → öneri yok

#### Kural 17: `yatirim-tesvik/makine-traceid-required`
- **applies:** `profile==='YATIRIMTESVIK' && lines[i].itemClassificationCode==='01' && !lines[i].productTraceId`
- **produce:** `{ path: 'lines[i].productTraceId', value: undefined, reason: 'YTB Makine için Ürün Takip ID gereklidir.', severity: 'recommended' }`
- **severity:** `recommended`
- **Test (3):** itemClass=01 + boş → öneri | dolu → öneri yok | itemClass=02 → öneri yok

#### Kural 18: `yatirim-tesvik/makine-serialid-required`
- **applies:** Kural 17 ile aynı + `!lines[i].serialId`
- **produce:** `{ path: 'lines[i].serialId', value: undefined, reason: 'YTB Makine için Seri No gereklidir.', severity: 'recommended' }`
- **severity:** `recommended`
- **Test (3):** itemClass=01 + boş → öneri | dolu → öneri yok | itemClass=02 → öneri yok

#### Kural 19: `yatirim-tesvik/insaat-suggest-itemclass-02`
- **applies:** `profile==='YATIRIMTESVIK' && !lines[i].itemClassificationCode && /(inşaat|insaat|yapı|yapi|construction)/i.test(lines[i].itemDescription || '')`
- **produce:** `{ path: 'lines[i].itemClassificationCode', value: '02', reason: 'Açıklamada inşaat geçiyor — İnşaat (02) öneriliyor.', severity: 'optional' }`
- **severity:** `optional` — heuristic, false positive riski (R5)
- **Not:** Kural 16 ile çakışma — Kural 19 öncelikli (specific over general). SUGGESTION_RULES sırası: 19 önce, 16 sonra. Aynı path için Kural 19 üretirse Kural 16 boş döner (applies false: kdvExemptionCode dolu olur — hayır, itemClass dolu olur). Engine implicit dedup yok; kurallarda explicit `applies` net olmalı.
- **DÜZELTME:** Kural 16'nın `applies`'ı şöyle olur: `profile==='YATIRIMTESVIK' && !lines[i].itemClassificationCode && !DESC_HAS_INSAAT(lines[i])`. Mutually exclusive.
- **Test (4):** "İnşaat malzemesi" + boş → 02 öner | "Makine" + boş → 02 öner değil (Kural 16 → 01) | itemClass dolu → öner yok | "Yapı kimyasalları" + boş → 02 öner

**YATIRIMTESVIK grubu test alt-toplam:** ~13 test.

### 3.5 Delivery Grubu (3 kural)

#### Kural 20: `delivery/ihracat-incoterms-required`
- **applies:** `profile==='IHRACAT' && (!input.delivery?.incotermsCode || input.delivery.incotermsCode === '')`
- **produce:** `{ path: 'delivery.incotermsCode', value: 'CIF', reason: 'İhracat için INCOTERMS kodu zorunlu (CIF, FOB, EXW vb.).', severity: 'recommended', displayLabel: 'CIF — Cost Insurance Freight' }`
- **severity:** `recommended` — IHRACAT XML için kontratlı alan
- **Test (3):** IHRACAT + boş → CIF öner | IHRACAT + 'FOB' → öneri yok | TEMELFATURA + boş → öneri yok

#### Kural 21: `delivery/gtip-format-12-digit`
- **applies:** `lines[i].delivery?.gtipNo && lines[i].delivery.gtipNo.replace(/\D/g, '').length !== 12`
- **produce:** `{ path: 'lines[i].delivery.gtipNo', value: undefined, reason: 'GTİP 12 hane olmalı (girilen: ${len} hane). Düzeltiniz.', severity: 'recommended' }`
- **severity:** `recommended` — XML invalid olur
- **Test (4):** 12 hane → öneri yok | 10 hane → öneri | 14 hane → öneri | boş → öneri yok

#### Kural 22: `delivery/transport-mode-suggest-ihracat`
- **applies:** `profile==='IHRACAT' && !input.delivery?.transportModeCode`
- **produce:** `{ path: 'delivery.transportModeCode', value: '40', reason: 'İhracat için ulaşım modu gereklidir (40=Hava, 30=Karayolu, 10=Deniz).', severity: 'optional' }`
- **severity:** `optional` — INCOTERMS'ten türetilebilir, mutlaka set edilmesi gerekmez
- **Test (3):** IHRACAT + boş → öneri | IHRACAT + dolu → öneri yok | TEMELFATURA → öneri yok

**Delivery grubu test alt-toplam:** ~10 test.

### 3.6 Misc Grubu (3 kural)

#### Kural 23: `currency/exchange-rate-required`
- **applies:** `input.currencyCode && input.currencyCode !== 'TRY' && (!input.exchangeRate || input.exchangeRate <= 0)`
- **produce:** `{ path: 'exchangeRate', value: undefined, reason: 'Yabancı para için kur (TRY karşılığı) girilmeli.', severity: 'recommended' }`
- **severity:** `recommended` — XML hesabı yanlış olur
- **Test (3):** USD + boş → öneri | USD + 30 → öneri yok | TRY → öneri yok

#### Kural 24: `paymentmeans/iban-format-tr`
- **applies:** `input.paymentMeans?.iban && !/^TR\d{24}$/.test(input.paymentMeans.iban.replace(/\s/g, ''))`
- **produce:** `{ path: 'paymentMeans.iban', value: undefined, reason: 'IBAN TR ile başlamalı ve 26 hane olmalı.', severity: 'recommended' }`
- **severity:** `recommended` — KAMU profili özellikle hassas, ama herhangi bir profilde geçerli
- **Test (3):** Geçerli TR IBAN → öneri yok | Bozuk TR → öneri | DE IBAN → öneri (TR bekleniyor)

#### Kural 25: `paymentmeans/payment-means-code-default`
- **applies:** `input.paymentMeans && !input.paymentMeans.code`
- **produce:** `{ path: 'paymentMeans.code', value: '1', reason: 'Ödeme yöntemi kodu boş — 1 (Kasa) varsayılanı.', severity: 'optional' }`
- **severity:** `optional` — banka transferi (10), kredi kartı (48) gibi alternatifler yaygın
- **Test (2):** paymentMeans.code boş → öneri | dolu → öneri yok

**Misc grubu test alt-toplam:** ~8 test.

### 3.7 Toplam Kural ve Test Özeti

| Grup | Kural Sayısı | Test Sayısı |
|---|---|---|
| KDV (Kural 4 çıkarıldı) | 7 | 22 |
| Tevkifat | 5 | 15 |
| IHRACKAYITLI | 3 | 9 |
| YATIRIMTESVIK | 4 | 13 |
| Delivery | 3 | 10 |
| Misc | 3 | 8 |
| **Toplam** | **25 → 24** | **~77 kural birim test** |

> **Not:** Plan dosyasında 25 kural önerilmişti; tasarımda Kural 4 (`kdv/zero-clear-exemption-on-rate-change`) **transition state gerektirdiği için Sprint 8j'ye ertelendi**. Faz 2 net kapsam: **24 kural**. Test sayısı master plan'a yakın korundu (kural başına 3-4 test ortalaması).

---

## 4. Event Akışı Entegrasyonu

### 4.1 Sprint 8h Event Sıralaması (mevcut, kilitli)

Sprint 8h.4'te kilitlenen event sıralaması (D-12 forcedReason payload pattern dahil):

| # | Event | Tetiklenme | Payload |
|---|---|---|---|
| 1 | `path-error` | Path validation reddi (4 katman) | `PathErrorPayload` |
| 2 | `field-changed` | Path setter sonrası değer farkı | `FieldChangedPayload` |
| 3 | `ui-state-changed` | Doc-level visibility diff | `InvoiceUIState` |
| 4 | `field-activated` | visibility false→true | `FieldActivatedPayload` |
| 5 | `field-deactivated` | visibility true→false | `FieldDeactivatedPayload` |
| 6 | `line-field-changed` | Line path setter sonrası | `LineFieldChangedPayload` |
| 7 | `type-changed` | type değişti (snapshot event) | `{ from, to }` |
| 8 | `profile-changed` | profile değişti | `{ from, to }` |
| 9 | `liability-changed` | liability değişti (D-9) | `{ from, to }` |
| 10 | `line-added/updated/removed` | Satır CRUD | `{ index, line }` |
| 11 | `changed` | Genel değişim debounce trigger | `SimpleInvoiceInput` |
| 12 | `calculate()` | Otomatik (autoCalculate=true) | (call) |
| 13 | `calculated` | Hesaplama sonucu | `CalculatedDocument` |
| 14 | `validate()` | Otomatik (autoCalculate=true) | (call) |
| 15 | `validation-error` | Validator pipeline raw | `ValidationError[]` |
| 16 | `warnings` | Birleşik (rules + validator köprü) | `ValidationWarning[]` |

### 4.2 Sprint 8i Event Sıralaması (yeni, ekleme)

Sprint 8h sıralamasının **devamına** eklenir (16. event'ten sonra):

| # | Event | Tetiklenme | Payload | Sprint |
|---|---|---|---|---|
| 17 | `runSuggestionEngine()` çağrılır | (internal call, event değil) | — | 8i.1 |
| 18 | Suggestion diff hesabı | (internal, `_lastSuggestions` update) | — | 8i.7 |
| 19 | `suggestion` event emit | Yeni veya değişmiş suggestion'lar | `Suggestion[]` (batch) | 8i.1 |

**Event sıralaması kilitli — test enforcement (8h.4 pattern'i devam):**
- `__tests__/calculator/invoice-session-events.test.ts` — `expectEventSequence(...)` helper kullanılır
- Sprint 8h'in 28 event sequence testi + 8i'de 15 ek test

### 4.3 SessionEvents Tip Genişletmesi

```typescript
// src/calculator/invoice-session.ts (mevcut tip, satır 114-177)
export interface SessionEvents {
  // ... mevcut 19 event (Sprint 8h.4'te kilitli) ...

  // Faz 2 (Sprint 8i) — YENİ
  /**
   * Suggestion event — kullanıcıya advisory öneriler.
   *
   * Payload: yeni veya değişmiş suggestion'ların batch listesi.
   * Boş array EMIT EDİLMEZ — sadece değişiklik varsa emit.
   *
   * Diff primary key: `${ruleId}::${path}`. Aynı kural+path için
   * value/reason değişimi de emit'i tetikler.
   *
   * Suggestion vs Validator: validator-error blocking, suggestion advisory.
   * Aynı path için ikisi paralel emit edilebilir; UI iki kanalı yan yana sunar.
   *
   * Karar: T-3 (batch payload), T-4 (suggestionResolved event yok).
   */
  suggestion: Suggestion[];
}
```

### 4.4 Diff Algoritması (T-2)

**Session field:**
```typescript
// src/calculator/invoice-session.ts içinde private field
private _lastSuggestions: Suggestion[] = [];
```

**Diff helper (engine'de pure utility):**
```typescript
// src/calculator/suggestion-engine.ts
function suggestionKey(s: Suggestion): string {
  return `${s.ruleId}::${s.path}`;
}

function suggestionsEqual(a: Suggestion, b: Suggestion): boolean {
  // Primary key zaten eşit varsayılır; value ve reason farkı diff'e dahil
  return a.value === b.value && a.reason === b.reason && a.severity === b.severity;
}

export function diffSuggestions(
  prev: Suggestion[],
  next: Suggestion[],
): { added: Suggestion[]; changed: Suggestion[]; removed: Suggestion[] } {
  const prevByKey = new Map(prev.map(s => [suggestionKey(s), s]));
  const nextByKey = new Map(next.map(s => [suggestionKey(s), s]));

  const added: Suggestion[] = [];
  const changed: Suggestion[] = [];
  const removed: Suggestion[] = [];

  for (const [key, s] of nextByKey) {
    const old = prevByKey.get(key);
    if (!old) added.push(s);
    else if (!suggestionsEqual(old, s)) changed.push(s);
  }

  for (const [key, s] of prevByKey) {
    if (!nextByKey.has(key)) removed.push(s);
  }

  return { added, changed, removed };
}
```

**Session emit logic (sözde-kod):**
```typescript
// invoice-session.ts içinde update() sonrası
private _runSuggestionPipeline(): void {
  const next = runSuggestionEngine(this._input, this._uiState);
  const { added, changed, removed: _ } = diffSuggestions(this._lastSuggestions, next);
  this._lastSuggestions = next;
  if (added.length || changed.length) {
    this.emit('suggestion', [...added, ...changed]);
  }
  // T-4: removed array kullanılmaz (suggestionResolved event yok)
}
```

**Karar (T-4 detay):** `removed` array'i hesaplanır ama emit edilmez. Gelecekte `suggestionResolved` opsiyonel eklenirse helper hazır. Bu Faz 2'de **API yüzeyi değil**, sadece internal state.

### 4.5 Suggestion vs Validator Dikhotomi (Master §3.3)

| | Validator | Suggestion |
|---|---|---|
| **Çıktı** | `ValidationError` (severity error/warning) | `Suggestion` (severity recommended/optional) |
| **Anlam** | "Bu olmadan XML üretilmez" | "Bu varsayılanı seçmek istemez misin?" |
| **Tetikleyici** | Pipeline (build sırasında zorunlu) | UX akışı (kullanıcı yardımı) |
| **Event kanalı** | `validation-error` (raw) + `warnings` (köprü) | `suggestion` |
| **UI rengi** | Kırmızı (error), Sarı (warning) | Mavi (recommended), Gri (optional) |
| **Aksiyon** | Manuel düzeltme zorunlu | Tek-tık apply (UI sorumluluğu) |

**Kontrat:** Aynı path için validator + suggestion **paralel** emit edilebilir. UI iki kanalı yan yana gösterir. Suggestion validator'ı baskılamaz. Test enforcement: Sprint 8i.9 commit'i "aynı path → iki paralel mesaj" kontrat testini içerir.

---

## 5. Test Stratejisi

### 5.1 Test Grupları

| Grup | Açıklama | Test Δ | Konum |
|---|---|---|---|
| Kural birim testi | 24 kural × ~3 test ortalaması | ~77 | `__tests__/calculator/suggestion-rules/<domain>.test.ts` (6 dosya) |
| Engine testi | runSuggestionEngine — boş, çoklu, sıralama | 15 | `__tests__/calculator/suggestion-engine.test.ts` |
| Diff algoritması | added/changed/removed, primary key equality | 20 | `__tests__/calculator/suggestion-diff.test.ts` |
| Event sıralaması | suggestion 19. adımdan sonra (sequence kontrat) | 15 | `__tests__/calculator/invoice-session-events.test.ts` (genişletme) |
| Sample integration | 10 reactive senaryo end-to-end | 30 | `__tests__/calculator/invoice-session-suggestion.test.ts` |
| Suggestion vs Validator paralel | Aynı alanda iki mesaj çakışmaması | 5 | `__tests__/calculator/invoice-session-dichotomy.test.ts` |
| Performance bench | runSuggestionEngine + pipeline ≤15ms (suggestion ≤5ms alt-bütçe) | 5 | `__tests__/benchmarks/suggestion-engine.bench.test.ts` |
| Examples-matrix converter | 200 senaryo regression | 200 | `__tests__/scripts/example-to-session-script.test.ts` (ana) + per-scenario otomatik |
| **Toplam** | | **~367** | |

**Test delta:** 1407 → ~1774 (master plan §3.4'te 1700→1850 öngörüsü; 24 kural ile 1774 hedef ulaşılır).

### 5.2 Kural Birim Test Şablonu

Sprint 8h `manual-exemption-validator.test.ts` template'i:

```typescript
import { describe, it, expect } from 'vitest';
import { KDV_SUGGESTIONS } from '../../src/calculator/suggestion-rules/kdv-suggestions';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';
import { deriveUIState } from '../../src/calculator/invoice-rules';

const KDV_ZERO_SUGGEST_351 = KDV_SUGGESTIONS.find(r => r.id === 'kdv/zero-suggest-351')!;

describe('Suggestion: kdv/zero-suggest-351', () => {
  describe('applies()', () => {
    it('TEMELFATURA + 1 satır kdv=0 + kod boş → applies=true', () => {
      const input: SimpleInvoiceInput = makeInput({ type: 'SATIS', profile: 'TEMELFATURA', lines: [{ kdvPercent: 0 }] });
      const ui = deriveUIState(input.type, input.profile);
      expect(KDV_ZERO_SUGGEST_351.applies(input, ui)).toBe(true);
    });

    it('ISTISNA tipi → applies=false (self-exemption)', () => {
      const input = makeInput({ type: 'ISTISNA', profile: 'TEMELFATURA', lines: [{ kdvPercent: 0 }] });
      const ui = deriveUIState(input.type, input.profile);
      expect(KDV_ZERO_SUGGEST_351.applies(input, ui)).toBe(false);
    });
  });

  describe('produce()', () => {
    it('Her uygun satır için 351 öner', () => {
      const input = makeInput({ lines: [{ kdvPercent: 0 }, { kdvPercent: 18 }, { kdvPercent: 0 }] });
      const ui = deriveUIState(input.type, input.profile);
      const result = KDV_ZERO_SUGGEST_351.produce(input, ui);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ path: 'lines[0].kdvExemptionCode', value: '351', severity: 'recommended' });
      expect(result[1].path).toBe('lines[2].kdvExemptionCode');
    });
  });
});
```

### 5.3 Event Sequence Test Genişletmesi

Sprint 8h.4'te tanımlanan `expectEventSequence` helper'ı reuse:

```typescript
// __tests__/calculator/invoice-session-events.test.ts (mevcut, genişletme)
it('Sprint 8i — suggestion event 16. event\'ten sonra emit edilir', async () => {
  const session = new InvoiceSession({ initialInput: ... });
  const events: string[] = [];
  ['field-changed', 'ui-state-changed', 'changed', 'calculated', 'validation-error', 'warnings', 'suggestion'].forEach(evt =>
    session.on(evt as any, () => events.push(evt)),
  );

  session.update(SessionPaths.lineKdvPercent(0), 0);
  await Promise.resolve(); // microtask flush

  const suggestionIdx = events.indexOf('suggestion');
  const warningsIdx = events.indexOf('warnings');
  expect(suggestionIdx).toBeGreaterThan(warningsIdx);
});
```

### 5.4 Suggestion vs Validator Paralel Test

```typescript
// __tests__/calculator/invoice-session-dichotomy.test.ts (yeni)
it('TEVKIFAT + boş withholding → validator warning + suggestion paralel', async () => {
  const session = new InvoiceSession({
    initialInput: makeInput({ type: 'TEVKIFAT', lines: [{ /* withholding boş */ }] })
  });

  let validationErrors: ValidationError[] = [];
  let warnings: ValidationWarning[] = [];
  let suggestions: Suggestion[] = [];
  session.on('validation-error', e => { validationErrors = e; });
  session.on('warnings', w => { warnings = w; });
  session.on('suggestion', s => { suggestions = s; });

  await session.calculate();

  // Hem validator (warning) hem suggestion paralel mevcut
  expect(warnings.some(w => w.field === 'lines[0].withholdingTaxCode')).toBe(true);
  expect(suggestions.some(s => s.ruleId === 'withholding/tevkifat-default-codes')).toBe(true);
  expect(suggestions.find(s => s.ruleId === 'withholding/tevkifat-default-codes')?.value).toBe('602');
});
```

### 5.5 Performance Benchmark

Sprint 8h.7.1 `invoice-session.bench.test.ts` pattern'iyle uyumlu:

```typescript
// __tests__/benchmarks/suggestion-engine.bench.test.ts
it('100-line input + 24 kural → suggestion engine ≤5ms', () => {
  const input = makeInput({ lines: Array.from({ length: 100 }, () => ({ kdvPercent: 0 })) });
  const ui = deriveUIState(input.type, input.profile);

  const iterations = 100;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    runSuggestionEngine(input, ui);
  }
  const avgMs = (performance.now() - start) / iterations;

  expect(avgMs).toBeLessThan(5); // suggestion alt-bütçe
});

it('100-line input + suggestion + validator pipeline ≤15ms (toplam threshold)', () => {
  const session = new InvoiceSession({ initialInput: makeInput({ lines: 100lines }) });
  const start = performance.now();
  session.update(SessionPaths.lineKdvPercent(0), 0);
  const ms = performance.now() - start;
  expect(ms).toBeLessThan(15); // toplam threshold
});
```

---

## 6. Examples-Matrix Converter (8h.9 Borç)

### 6.1 Kapsam (Berkay onayı: S-5)

**Tam 200 senaryo:** 38 examples + 162 examples-matrix valid senaryo. Her senaryo için otomatik `session-script.ts` üretilir; çıktı path-based update sequence (S-6).

### 6.2 Algoritma

```typescript
// scripts/example-to-session-script.ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SimpleInvoiceInput } from '../src/calculator/simple-types';

interface ConverterOptions {
  inputPath: string;          // örn. 'examples-matrix/valid/temelfatura-satis/input.ts'
  outputPath: string;         // örn. '.../session-script.ts'
}

async function convert({ inputPath, outputPath }: ConverterOptions) {
  const { input } = await import(inputPath) as { input: SimpleInvoiceInput };
  const updates = flattenToUpdates(input);
  const code = generateSessionScript(updates);
  writeFileSync(outputPath, code);
}

/**
 * SimpleInvoiceInput'u path-based update sequence'ına çevirir.
 *
 * Her primitif alan için: update(SessionPaths.X, value)
 * Her satır için: addLine(...) sonrası line.X update'leri
 *
 * Sıralama:
 * 1. type, profile, currencyCode (zorunlu — visibility derivation tetikler)
 * 2. sender.* (sender bilgileri)
 * 3. customer.* (customer bilgileri)
 * 4. delivery.*, paymentMeans.*
 * 5. addLine() × N (satır eklemeleri)
 * 6. lines[i].* (satır alanları, addLine'dan sonra)
 */
function flattenToUpdates(input: SimpleInvoiceInput): Update[] {
  const updates: Update[] = [];
  // ... type/profile önce (M-X visibility derivation)
  updates.push({ kind: 'update', path: 'type', value: input.type });
  updates.push({ kind: 'update', path: 'profile', value: input.profile });
  // ... primitif alanlar recursive walk
  // ... addLine + line.X
  return updates;
}

function generateSessionScript(updates: Update[]): string {
  const lines = [
    `// Otomatik üretilmiştir — examples-matrix/{senaryo}/session-script.ts`,
    `import { InvoiceSession, SessionPaths } from '../../../src';`,
    `import { input } from './input';`,
    ``,
    `export function buildSession(): InvoiceSession {`,
    `  const session = new InvoiceSession();`,
  ];
  for (const u of updates) {
    if (u.kind === 'addLine') {
      lines.push(`  session.addLine(${JSON.stringify(u.line)});`);
    } else {
      lines.push(`  session.update(${pathExpr(u.path)}, ${JSON.stringify(u.value)});`);
    }
  }
  lines.push(`  return session;`);
  lines.push(`}`);
  return lines.join('\n');
}
```

### 6.3 Çıktı Formatı (Berkay onayı: S-6)

**Path sequence (50+ ardışık update çağrısı):**

```typescript
// examples-matrix/valid/temelfatura-satis/session-script.ts (otomatik)
import { InvoiceSession, SessionPaths } from '../../../src';
import { input } from './input';

export function buildSession(): InvoiceSession {
  const session = new InvoiceSession();

  // 1. Type/profile/currency (visibility derivation tetikleyici)
  session.update(SessionPaths.type, 'SATIS');
  session.update(SessionPaths.profile, 'TEMELFATURA');
  session.update(SessionPaths.currencyCode, 'TRY');

  // 2. Sender
  session.update(SessionPaths.senderTaxNumber, '1234567890');
  session.update(SessionPaths.senderName, 'Mimsoft A.Ş.');
  session.update(SessionPaths.senderTaxOffice, 'Beşiktaş');
  session.update(SessionPaths.senderAddress, 'Levent Mahallesi...');
  // ... 15+ sender alanı

  // 3. Customer
  session.update(SessionPaths.customerTaxNumber, '11111111111');
  // ... 10+ customer alanı

  // 4. Lines (addLine + alanları)
  session.addLine({});
  session.update(SessionPaths.lineItemDescription(0), 'Yazılım hizmeti');
  session.update(SessionPaths.lineQuantity(0), 1);
  session.update(SessionPaths.linePrice(0), 1000);
  session.update(SessionPaths.lineKdvPercent(0), 18);
  // ... satır × N

  return session;
}
```

**Gerekçe (S-6):** 50+ update sequence kullanıcının session'ı **incremental** kurması test edilmiş olur. Reactive flow gerçek senaryoyu simüle eder. `initialInput` short form (2 satır) reactive event chain'i atlar — daha az değer.

### 6.4 Regression Suite

```typescript
// __tests__/scripts/example-to-session-script.test.ts
import { describe, it, expect } from 'vitest';
import { buildXml as buildXmlFromInput } from '../../src';
import * as glob from 'fast-glob'; // veya node fs walk
import { buildSession } from /* dynamic import per scenario */;

describe('Examples-matrix converter — 200 senaryo regression', () => {
  const scenarios = glob.sync('examples-matrix/valid/**/input.ts');

  it.each(scenarios)('%s: session-script XML === input XML', async (inputPath) => {
    const { input } = await import(inputPath);
    const xmlFromInput = buildXmlFromInput(input);

    const sessionScriptPath = inputPath.replace('input.ts', 'session-script.ts');
    const { buildSession } = await import(sessionScriptPath);
    const session = buildSession();
    const xmlFromSession = session.buildXml();

    expect(xmlFromSession).toBe(xmlFromInput);
  });
});
```

**Test delta:** 200 senaryo × 1 test = 200 test. CI süresi etkilenir (R4) — paralelleştirme veya watch-mode'da skip default.

### 6.5 Otomatik Üretim CI'da

Her commit'te converter çalıştırılır, drift detection:

```bash
# scripts/regenerate-session-scripts.sh
npx tsx scripts/example-to-session-script.ts --all
git diff --exit-code examples-matrix/**/session-script.ts || {
  echo "session-script.ts files out of sync. Run: npm run regen:session-scripts"
  exit 1
}
```

---

## 7. Atomik Commit Planı

12-14 commit, tam kapsam (S-1) sebebiyle master plan'ın 9 commit tahmininin üzerinde:

| Commit | Kapsam | Test Δ | Tahmini Süre |
|---|---|---|---|
| 8i.0 | Plan kopya (`audit/sprint-08i-tasarim.md` ← bu doküman) + log iskelet (`audit/sprint-08i-implementation-log.md`) | 0 | 0.5h |
| 8i.1 | `Suggestion` tip + `runSuggestionEngine` skeleton + `suggestion` event tip + `diffSuggestions` algoritma + private `_lastSuggestions` field | +25 | 1g |
| 8i.2 | KDV grubu (7 kural) — `kdv-suggestions.ts` + birim testler | +22 | 1.5g |
| 8i.3 | Tevkifat grubu (5 kural) — `withholding-suggestions.ts` | +15 | 1g |
| 8i.4 | IHRACKAYITLI grubu (3 kural) — `ihrackayitli-suggestions.ts` | +9 | 0.5g |
| 8i.5 | YATIRIMTESVIK grubu (4 kural) — `yatirim-tesvik-suggestions.ts` | +13 | 1g |
| 8i.6 | Delivery + Misc (3+3=6 kural) — `delivery-suggestions.ts`, `misc-suggestions.ts` | +18 | 1g |
| 8i.7 | Event sıralaması integration test + diff edge cases (yeni 19. adım enforce) | +35 | 1g |
| 8i.8 | Performance bench + 15ms threshold + suggestion ≤5ms alt-bütçe | +5 | 0.5g |
| 8i.9 | Suggestion vs Validator paralel test (UX dikhotomi enforce) | +5 | 0.5g |
| 8i.10 | `scripts/example-to-session-script.ts` converter (path sequence formatı) + 38 examples senaryosu | +38 | 1.5g |
| 8i.11 | 162 examples-matrix valid senaryo regression suite | +162 | 1g |
| 8i.12 | README §3 Suggestion API + reactive örnekler (Sprint 8h README §2'ye paralel) | docs | 0.5g |
| 8i.13 | CHANGELOG v2.2.0 + Migration Guide v2.1.0→v2.2.0 + version bump | docs | 0.5g |
| 8i.14 | Implementation log finalize + sprint kapanış | 0 | 0.5h |
| **Toplam** | **15 commit** | **+347 test** | **~12 g (8-12 g aralığı)** |

**Test delta:** 1407 → ~1754 (master plan §3.4 1700→1850 öngörüsü içinde).

---

## 8. Çözülmüş Tasarım Kararları (T-1..T-7)

**T-1 — Severity 2-seviyeli (`recommended` | `optional`):**
> Granüler ayrım (`recommended-strong/weak`) reddedildi. UX'te 4 seviye mavi ton ayırt edilemez. `recommended` = sistem güçlü hatırlatma (XML invalid olabilir), `optional` = ipucu/heuristic. Suggestion'ın validator'dan farkı zaten net (kırmızı vs mavi); severity granülerlik UI complexity ekler, değer azaltır.

**T-2 — Engine pure, diff session-stateful:**
> `runSuggestionEngine()` pure (state yok, side-effect yok). Diff session içinde (`_lastSuggestions: Suggestion[]` private field). Master plan §3.1 "pure function" iması korunur — ama diff state gerektirir, çözüm: engine her çağrıda full liste döner, session diff hesaplar. Equality primary key `${ruleId}::${path}`.

**T-3 — RuleId namespace formatı `{domain}/{slug}`:**
> Plain id (`kdv0-suggest-351`) reddedildi. `kdv/zero-suggest-351` formatı dosya hierarchy'siyle 1:1 maps. Future-proof (yeni domain açıldığında çakışma riski yok). Diff primary key'in parçası — kararlı string.

**T-4 — `suggestionResolved` event YOK:**
> Sonraki tick'te yokluğu UI'da fark edilir (UI subscriber `suggestion` event'inde gelmeyen ruleId+path için artık öneri yok diye yorumlar). Extra event = extra subscriber yükü + state karmaşıklığı + iki event arası race. Master plan'da yok, eklemiyoruz. `removed` array internal hesaplanır, public emit YOK. Faz 3+'da gerekli görülürse eklenir (geri uyumlu).

**T-5 — Suggestion payload `displayLabel`, `displayValue` opsiyonel:**
> Çekirdek üç alan (path/value/reason) yeterli. UI rendering hint'leri kural yazarının takdirine bırakılır. Mimsoft Next.js rewrite'ta hangilerinin kullanıldığı 8j retro'sunda gözden geçirilir.

**T-6 — Domain bazlı dosya organizasyonu:**
> Tek dosya 24 kural okunmaz (~970 satır). Mevcut `src/validators/` organizasyonu paralel — `manual-exemption-validator`, `phantom-kdv-validator`, `yatirim-tesvik-validator` gibi domain bazlı dosyalama. RuleId namespace'i (T-3) zaten dosya hierarchy'sini yansıtıyor.

**T-7 — Engine her çağrıda full eval (incremental yok):**
> Performance baseline 0.16ms (mevcut pipeline) + 5ms suggestion bütçesi = 5.16ms ≤ 15ms threshold rahat. Incremental optimization (örn. değişen path'e bağlı kuralları cherry-pick) Faz 3'e ertelenir — premature optimization riski, kural eklendikçe complex'leşir.

**Plan dosyasında Berkay tarafından onaylanan kararlar (S-1/S-3/S-5/S-6):**
- ✅ S-1 Tam kapsam (~25 kural — tasarımda 24'e düştü, Kural 4 ertelendi)
- ✅ S-3 Batch payload (`Suggestion[]`)
- ✅ S-5 Tam 200 senaryo converter
- ✅ S-6 Path sequence format

---

## 9. Risk ve Belirsizlikler

**R1 (Master MR-4) — Suggestion ↔ Validator overlap UX:**
- Aynı alanda hem kırmızı hata hem mavi öneri kafa karıştırır mı?
- **Mitigation:** Suggestion sadece "öneri" dilini konuşur (`reason` Türkçe + soru/öneri tonu), validator "zorunluluk" dilini. UI renk + ikon ayrımı (kırmızı ünlem vs mavi lamba). Mimsoft Next.js rewrite'ta gözlemlenmeli — A/B test gerekebilir.
- **Test enforcement:** Sprint 8i.9 "paralel emit kontratı" testi.

**R2 (Master MR-1) — Performance:**
- 24 kural × 100 satır ≈ 2400 evaluation/update. Bütçe ≤5ms.
- **Mitigation:** Sprint 8i.8 benchmark 5ms ve 15ms toplam threshold enforce. Aşılırsa kural gruplaması (örn. KDV-related kuralları tek pre-filter ile atla) veya `applies()` early-exit refactor.
- **Sinyal:** 100-line + 24 kural senaryosu 5ms üstü → optimize gerekir.

**R3 — Diff algoritması equality bug:**
- Aynı suggestion farklı reference'la üretilirse re-emit. Primary key (`ruleId+path`) net olmalı.
- **Mitigation:** `suggestionsEqual` fonksiyonu deep equal değil, primitif alan eşitliği (value/reason/severity). Object reference karşılaştırma YAPILMAZ. Test: aynı input 2× → 2. emit boş array değil, hayır emit.

**R4 — Examples-matrix converter Sprint 8i kapasitesini doldurabilir:**
- 200 senaryo × 50+ update = 10K+ generated line. CI süresi etkilenir.
- **Mitigation:** Regression vitest paralelleştirme (vitest default). CI'da watch-mode skip; full suite `npm run test:full` ile manuel. Drift detection: `git diff --exit-code` her commit'te.

**R5 — Heuristic kural false positive (#19 yatirim-tesvik insaat):**
- "İnşaat" string match → "İnşaat malzemesi yapımcısı" gibi unrelated context'te yanlış öneri.
- **Mitigation:** İlk 30 günlük usage telemetry (Mimsoft'ta) → false positive oranı >%10 ise kural devre dışı. Sprint 8j retro'sunda gözden geçir.

**R6 — Kural 4 (transition state) Sprint 8j'ye ertelendi:**
- `kdv/zero-clear-exemption-on-rate-change` engine'in pure olmasıyla çakıştı.
- **Mitigation:** Sprint 8j'de event listener pattern'iyle çözülür (suggestion engine dışı, ayrı katman). Plan dosyasında belgelendi.

---

## 10. Açık Sorular

**Berkay tarafından bu plan modunda kapatıldı:**
- ✅ S-1: Tam kapsam (~25 kural — Kural 4 ertelenmesiyle 24'e düştü)
- ✅ S-3: Batch payload (`Suggestion[]`)
- ✅ S-5: Tam 200 senaryo converter
- ✅ S-6: Path sequence format

**Tasarım dokümanında öneri ile kapatıldı:**
- ✅ S-2 (suggestionResolved event) → T-4 reddedildi
- ✅ S-4 (severity granülerlik) → T-1 2-seviye yeterli
- ✅ S-7 (kural organizasyonu) → T-6 domain bazlı

**Açık kalan: 0** (tüm tasarım finalized — Sprint 8h pattern'ine uyumlu).

---

## Tasarım Kapsam Özeti

| Metrik | Hedef | Faz 1 (8h) | Faz 2 (8i) | Toplam (v2.2.0) |
|---|---|---|---|---|
| **Versiyon** | v2.2.0 | v2.0.0→v2.1.0 | v2.1.0→v2.2.0 | v2.2.0 |
| **Commit** | ~15 | 13 | 15 | 28 |
| **Test** | ~1750 | 1407 | +347 | ~1754 |
| **Süre** | 8-12g | 12g | 8-12g | — |
| **Kural** | 24 | 5 validator | +24 suggestion | — |
| **Performance threshold** | 15ms | 0.16ms | ≤5ms suggestion + 0.16ms = ≤5.16ms | ≤15ms |
| **Event sayısı** | 22 | 19 | +1 (suggestion) | 20 (path-error iç) |
| **Doküman boyut** | ~1100 satır | 1219 | ~1100 | — |

**Sprint 8h Faz 1 (kilitli) + Sprint 8i Faz 2 (bu doküman) = Reactive InvoiceSession v2.2.0 tam kapsamı.**

Bu doküman onaylandıktan sonra Sprint 8i implementation prompt'u yazılır. Implementation 8i.0 commit'iyle başlar (bu dokümanın `audit/sprint-08i-tasarim.md` olarak kopyalanması + `audit/sprint-08i-implementation-log.md` iskeleti).
