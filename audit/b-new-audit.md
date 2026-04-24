# B-NEW Audit Dump (Sprint 8b Keşifleri)

**Üretim tarihi:** 2026-04-23
**Üretim kaynağı:** Sprint 8b implementation + `audit/ACIK-SORULAR.md §4` + `examples/*/validation-errors.ts` `notCaughtYet` case'leri + gerçek `_dev-capture-errors.ts` çıktıları
**Amaç:** Berkay bu 12 bulguyu elle test edebilsin, Mimsoft üretim verisiyle karşılaştırıp önceliklerini netleştirsin.
**Disiplin:** Bu dosya **audit dump**. Kod değişikliği yok — Sprint 8c hotfix.

> **Not:** "Reproduction" bölümleri `SimpleInvoiceInput` kullanır (kullanıcının production workflow'u). Baseline olarak her bölümün sadece bug'ı tetikleyen alanlarını gösterir — `sender`/`customer`/`lines` baseline varsayılır. Tam form için `examples/01-temelfatura-satis/input.ts`'i referans alın.

---

## B-NEW-01: SimpleLineInput.kdvPercent alt sınır kontrolü yok

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/02-temelfatura-satis-gelir-stopaji/validation-errors.ts` (case 4)
**Öncelik önerisi:** Düşük
**Mimsoft üretim etkisi:** Yok (Mimsoft negatif KDV göndermez)
**Workaround mevcut:** Yok (tüketici kendi input'unu kontrol eder)

### 1. Reproduction (minimum input)

```typescript
import type { SimpleInvoiceInput } from '../../src';

const input: SimpleInvoiceInput = {
  id: 'EXA2026000000001',
  uuid: 'e1a2b3c4-0001-4000-8001-000000000001',
  datetime: '2026-04-23T10:00:00',
  profile: 'TEMELFATURA',
  type: 'SATIS',
  currencyCode: 'TRY',
  sender: { /* standart VKN party */ taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
  customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
  lines: [
    { name: 'Demo', quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: -10 }, // ← NEGATİF
  ],
};
```

```typescript
import { SimpleInvoiceBuilder } from '../../src';
const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
const { xml } = builder.build(input); // başarılı — hata yok
```

### 2. Expected (olması gereken davranış)

- **Success:** false
- **Errors[0].code:** `INVALID_VALUE`
- **Errors[0].path:** `lines[0].kdvPercent`
- **Errors[0].message:** `"KDV oranı 0-100 aralığında olmalı"` (beklenen format)
- **Gerekçe:** GİB `TaxCategoryScheme` XSD'de `cbc:Percent` NonNegativeInteger-like sınırlı (0..100 uygulamada). Schematron bazı kurallar %20'nin üstü/negatif reject eder.

### 3. Actual (şu an ne oluyor)

- **Success:** true (silent accept)
- **Errors:** yok
- **Output.xml:** `<cbc:Percent>-10.00</cbc:Percent>` — negatif yüzde XML'e yazılıyor. XSD tarafında reject edilecektir ama kütüphane runtime'da yakalamıyor.

### 4. Root Cause (tahmin)

- **Kod lokasyonu:** `src/calculator/line-calculator.ts:144-146` hesaplama yapıyor ama sınır kontrolü yok.
- **Neden yakalamıyor:** `SimpleLineInput.kdvPercent` tipinde sayısal üst/alt sınır kontrolü hiçbir validator'da yok. `common-validators.ts` genel seviyedeki alan kontrollerini yapar ama satır seviyesi nümerik aralık kontrolü eklenmemiş.
- **İlgili matrix/config:** Doğrudan ilgili yok — genel runtime hijyen eksikliği.

### 5. Fix Sketch

- **Yaklaşım:** `simple-types.ts → SimpleInvoiceInput` validator'ına (veya mevcut `common-validators.ts`'e yeni satır seviyesi kontrol) `for each line: assert 0 <= kdvPercent <= 100`.
- **Dosya:** `src/validators/common-validators.ts` veya yeni `simple-validators.ts`
- **Breaking change mi:** Hayır (geriye dönük uyumlu — sadece yeni zorunluluk)
- **v2.0.0 etkisi:** Added bölümü
- **Tahmini test sayısı:** 2 (negatif + >100)
- **Fix süresi:** <30dk

### 6. Manuel Test Checklist (Berkay için)

1. [ ] Mimsoft'ta bilerek %-10 KDV oranı verilen bir fatura kes (eğer Mimsoft izin veriyorsa)
2. [ ] Mimsoft'un response'u: reject mi, XML'de -10 mu çıkıyor?
3. [ ] GİB test ortamında negatif %Percent içeren XML gönder: 200 OK mi, XSD error mu?
4. [ ] Sor: Mimsoft API %-10 input'unu ön-validasyonla mı yakalıyor, XML'e mi bırakıyor?

### 7. Karar (Berkay dolduracak)

- [ ] Kritik — Sprint 8c'de ilk hotfix
- [ ] Orta — Sprint 8c'de sıradan hotfix
- [ ] Düşük — Post-v2.0.0'a ertelenebilir
- [ ] Tartışılacak — ACIK-SORULAR'a yeni soru ekle

**Berkay notları:** (boş)

---

## B-NEW-02: SimpleLineInput.quantity alt sınır kontrolü yok

**Keşif:** Sprint 8b.3 commit `e0d9934` — `examples/03-temelfatura-satis-kurumlar-stopaji/validation-errors.ts` (case 2)
**Öncelik önerisi:** Düşük
**Mimsoft üretim etkisi:** Yok (Mimsoft `quantity=0` göndermez)
**Workaround mevcut:** Yok

### 1. Reproduction (minimum input)

```typescript
lines: [
  { name: 'Demo', quantity: 0, price: 100, unitCode: 'Adet', kdvPercent: 20 }, // ← SIFIR
]
```

`SimpleInvoiceBuilder.build(input)` → başarılı, `TaxInclusiveAmount=0`.

### 2. Expected

- **Success:** false
- **Errors[0].code:** `INVALID_VALUE`
- **Errors[0].path:** `lines[0].quantity`
- **Errors[0].message:** `"Miktar 0'dan büyük olmalı"`
- **Gerekçe:** UBL `InvoicedQuantity` pozitif olmalı. Ayrıca `lineExtensionAmount = price * quantity` → 0 matrah `TaxSubtotal.TaxableAmount=0` XSD'de mantıksız (bazı Schematron kurallarında reject).

### 3. Actual

- **Success:** true (silent accept)
- **Output.xml:** `<cbc:InvoicedQuantity unitCode="C62">0.00</cbc:InvoicedQuantity>` + `<cbc:LineExtensionAmount>0.00</cbc:LineExtensionAmount>` — sıfır satır.

### 4. Root Cause

- **Kod lokasyonu:** `src/calculator/line-calculator.ts:89` `const grossAmount = line.price * line.quantity;` — sınır kontrolü öncesinde kullanılıyor.
- **Neden yakalamıyor:** `quantity > 0` runtime assertion'ı yok.
- **İlgili config:** Yok.

### 5. Fix Sketch

- **Yaklaşım:** `for each line: assert quantity > 0 AND price >= 0`
- **Dosya:** `src/validators/common-validators.ts` (line-level loop)
- **Breaking change mi:** Hayır
- **v2.0.0 etkisi:** Added
- **Tahmini test sayısı:** 2 (quantity=0, quantity<0)
- **Fix süresi:** <30dk

### 6. Manuel Test Checklist

1. [ ] Mimsoft'ta `quantity=0` olan bir satır oluşturulabiliyor mu (UI izin veriyor mu)?
2. [ ] Mimsoft XML'i üretiyor mu yoksa UI blocking mi?

### 7. Karar (Berkay dolduracak)

- [ ] Kritik / Orta / Düşük / Tartışılacak
**Berkay notları:** (boş)

---

## B-NEW-03: SimpleLineTaxInput.percent üst sınır kontrolü yok

**Keşif:** Sprint 8b.3 commit `e0d9934` — `examples/03/validation-errors.ts` (case 3)
**Öncelik önerisi:** Düşük
**Mimsoft üretim etkisi:** Yok (Mimsoft mantıklı oranlar)
**Workaround mevcut:** Yok

### 1. Reproduction

```typescript
lines: [
  {
    name: 'Demo', quantity: 10, price: 1500, unitCode: 'Adet', kdvPercent: 20,
    taxes: [{ code: '0011', percent: 150 }], // ← %150, KURUMLAR STOPAJI
  },
]
```

### 2. Expected

- **Errors[0].code:** `INVALID_VALUE`
- **Errors[0].path:** `lines[0].taxes[0].percent`
- **Errors[0].message:** `"Vergi oranı 0-100 aralığında olmalı"`
- **Gerekçe:** Stopaj/ek vergi yüzdeleri praktikte 0-100. Daha yüksek oran `TaxAmount > TaxableAmount` olur, absurd.

### 3. Actual

- **Success:** true (silent accept)
- **Output.xml:** `<cbc:Percent>150.00</cbc:Percent>` ve `<cbc:TaxAmount>22500.00</cbc:TaxAmount>` (matrah 15000 × 1.5) — anlamsız tutar.

### 4. Root Cause

- **Kod lokasyonu:** `line-calculator.ts` additional taxes loop — sadece `percent * baseAmount / 100` hesaplar, aralık kontrolü yok.
- **İlgili config:** `tax-config.ts` kod whitelist var ama yüzde aralık yok.

### 5. Fix Sketch

- **Yaklaşım:** Satır seviyesi taxes içinde `0 <= percent <= 100` kontrolü.
- **Dosya:** `src/validators/common-validators.ts` veya `line-calculator.ts` içinde assertion
- **Breaking change mi:** Hayır
- **v2.0.0 etkisi:** Added
- **Tahmini test sayısı:** 2
- **Fix süresi:** <30dk

### 6. Manuel Test Checklist

1. [ ] Mimsoft %100+ oran kabul ediyor mu?
2. [ ] GİB test response'u %150'de ne?

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-04: 351 kodu tek-satır KDV>0 kombinasyonu yakalanmıyor

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/06-temelfatura-istisna-351/validation-errors.ts` (case 4)
**Öncelik önerisi:** Orta
**Mimsoft üretim etkisi:** Bilinmiyor (f15 fixture'da tek satır + KDV=0 ile doğru kullanım var; hatalı kullanım prod'da olur mu?)
**Workaround mevcut:** Yok — kullanıcı input'u doğru yazmalı

### 1. Reproduction

```typescript
{
  // ... TEMELFATURA + SATIS
  kdvExemptionCode: '351',
  lines: [
    { name: 'Demo', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 20 }, // ← KDV>0 ama 351 verilmiş
  ],
}
```

### 2. Expected

- **Success:** false
- **Errors[0].code:** `EXEMPTION_REQUIRES_ZERO_KDV_LINE`
- **Errors[0].path:** `taxTotals[0].taxSubtotals[0].taxExemptionReasonCode`
- **Errors[0].message:** `"'351' kodu için en az bir satırda KDV tutarı=0 olmalı"`
- **Gerekçe:** M5 `TAX_EXEMPTION_MATRIX` satır 172 `{ code: '351', requiresZeroKdvLine: true, ... }`. Kural: en az 1 satırda KDV=0 olmalı.

### 3. Actual

- **Success:** true (silent accept)
- **Output.xml:** `<cbc:TaxAmount>20.00</cbc:TaxAmount>` + `<cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode>` — hem KDV var hem istisna kodu; self-contradiction. GİB tarafından reddedilir.

### 4. Root Cause

- **Kod lokasyonu:** `src/validators/cross-check-matrix.ts:241-243`
  ```ts
  if (rule.requiresZeroKdvLine && !kdvSubtotals.some(s => s.amount === 0)) { ... }
  ```
- **Neden yakalamıyor:** `kdvSubtotals` argümanı belge + satır KDV subtotal'larını içerir. **Belge seviyesinde** 351 `taxExemptionReasonCode` atanmışsa, `some(s => s.amount === 0)` kontrolü — eğer belge toplam KDV'si sıfırdan farklıysa ve tek satır varsa → false dönmeli, hata tetiklenmeli. Ancak bazı path'lerde `kdvSubtotals` parametresi yanlış geliyor (örn. sadece satır subtotal'ları). Ayrıca kdvExemptionCode belge-seviyede atanmışsa ama hiçbir satırda 0 KDV yok → mantık tetiklemiyor olabilir.
- **İlgili config:** `cross-check-matrix.ts:172` `{ code: '351', requiresZeroKdvLine: true }` kural var.

### 5. Fix Sketch

- **Yaklaşım:** `cross-validators.ts` içinden `checkTaxExemptionMatrix`'e `kdvSubtotals` argümanını düzgün pasla — belge+satır subtotal'larının union'u. Veya tek-satır durumunda explicit kontrol ekle.
- **Dosya:** `src/validators/cross-validators.ts:58-70`
- **Breaking change mi:** Hayır (sadece yeni hata mesajı — input zaten hatalıydı)
- **v2.0.0 etkisi:** Fixed (bug fix)
- **Tahmini test sayısı:** 3 (tek satır KDV>0 / çok satır hepsi KDV>0 / çok satır bir KDV=0 — pozitif)
- **Fix süresi:** 30dk-2saat (debug gerektirir)

### 6. Manuel Test Checklist

1. [ ] Mimsoft'ta `kdvExemptionCode=351` + tek satır %20 KDV'li fatura kes — UI blocking mi?
2. [ ] XML üretiliyorsa GİB kabul ediyor mu?
3. [ ] 351 kodunu tek-satır vs çok-satırlı faturada Mimsoft nasıl kullanıyor? (Örnek XML ara)

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-05: type=SATIS + kdvExemptionCode=702 basic modda cross-check geçiyor

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/07-temelfatura-ihrackayitli-702/validation-errors.ts` (case 2)
**Öncelik önerisi:** Orta
**Mimsoft üretim etkisi:** Bilinmiyor (Mimsoft yanlış type+kod kombinasyonunu önden bloke ediyor olabilir)
**Workaround mevcut:** `validationLevel: 'strict'` strict modda yakalanıyor — ama 07 senaryo B-NEW-12 sebebiyle zaten basic modda

### 1. Reproduction

```typescript
{
  profile: 'TEMELFATURA',
  type: 'SATIS',              // ← type SATIS ama
  kdvExemptionCode: '702',    // ← 702 IHRACKAYITLI'ya özgü
  lines: [
    { name: 'Demo', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 0 },
  ],
}
```

`SimpleInvoiceBuilder({ validationLevel: 'basic' }).build(input)` → başarılı.
`SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input)` → hata (expected çalışıyor).

### 2. Expected

- **Success:** false (her iki modda)
- **Errors[0].code:** `FORBIDDEN_EXEMPTION_FOR_TYPE`
- **Errors[0].message:** `"'702' istisna kodu 'SATIS' fatura tipinde yasaktır"`
- **Gerekçe:** M5 matrix 702 → `allowedInvoiceTypes: ['IHRACKAYITLI', 'IADE']`. SATIS forbidden.

### 3. Actual

- **validationLevel: 'basic':** Success true (silent accept) — M5 cross-check basic'te tetiklenmiyor
- **validationLevel: 'strict':** Success false — `FORBIDDEN_EXEMPTION_FOR_TYPE` doğru yakalanıyor

### 4. Root Cause

- **Kod lokasyonu:** `src/builders/invoice-builder.ts:67-88`
  ```ts
  if (level === 'basic') {
    errors.push(...validateCommon(input));   // cross-matrix ÇALIŞMIYOR
  }
  if (level === 'strict') {
    errors.push(...validateCrossMatrix(input));  // cross-matrix sadece strict'te
  }
  ```
- **Neden yakalamıyor:** M5 cross-check basic level'de çalıştırılmıyor. Bu design karar olabilir (strict opt-in), ama temel tip×kod whitelist kontrolü basic'e taşınmalı çünkü "silent accept" üretimde zararlı.
- **İlgili config:** `cross-check-matrix.ts` — `forbiddenInvoiceTypes` kuralı doğru tanımlı.

### 5. Fix Sketch

- **Yaklaşım:** `validateCrossMatrix` çağrısı basic'e de taşı (forbidden-type kontrolü her zaman açık). Advanced kurallar (requiresZeroKdvLine vs) strict'te kalsın.
- **Dosya:** `src/builders/invoice-builder.ts:73`
- **Breaking change mi:** Evet (basic modda önce geçen input'lar artık reject edilir). v2.0.0'a girer — BREAKING CHANGES.
- **v2.0.0 etkisi:** Changed/BREAKING
- **Tahmini test sayısı:** 4 (forbidden combo × 2 mod)
- **Fix süresi:** 30dk

### 6. Manuel Test Checklist

1. [ ] Mimsoft UI'da `type=SATIS + 702` kombinasyonu girilebilir mi? Blocking var mı?
2. [ ] Eğer Mimsoft önden blokluyorsa → kütüphane de basic'te blokmalı (öğrenme: Mimsoft sıkı)
3. [ ] Basic mod'da "kolay tüketici" hedefi varsa, M5 forbidden-type kontrolü gerekli mi?

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-06: type=IHRACKAYITLI ama kdvExemptionCode yok yakalanmıyor

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/07/validation-errors.ts` (case 2, farklı path)
**Öncelik önerisi:** Orta
**Mimsoft üretim etkisi:** Bilinmiyor
**Workaround mevcut:** Yok

### 1. Reproduction

```typescript
{
  profile: 'TEMELFATURA',
  type: 'IHRACKAYITLI',
  // kdvExemptionCode yok! (beklenen: 701, 702, 703, 704)
  lines: [
    { name: 'Demo', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 0 },
  ],
}
```

### 2. Expected

- **Success:** false
- **Errors[0].code:** `MISSING_FIELD` veya yeni `TYPE_REQUIRES_EXEMPTION_CODE`
- **Errors[0].path:** `kdvExemptionCode`
- **Errors[0].message:** `"IHRACKAYITLI tipinde kdvExemptionCode zorunlu (701/702/703/704)"`
- **Gerekçe:** IHRACKAYITLI profili iş mantığında istisna kodu olmadan anlamsız.

### 3. Actual

- **Success:** true (silent accept)
- **Output.xml:** `<cbc:InvoiceTypeCode>IHRACKAYITLI</cbc:InvoiceTypeCode>` ama `TaxExemptionReasonCode` yok. GİB Schematron ve prod'da reddedilir.

### 4. Root Cause

- **Kod lokasyonu:** `src/validators/type-validators.ts` — IHRACKAYITLI tip için exemption kodu zorunluluğu kural yok.
- **Neden yakalamıyor:** Tip × exemption-required haritası mevcut değil. Mevcut kurallar exemption kod whitelist + tip uyumu yapıyor ama "tipin exemption zorunluluğu" yok.
- **İlgili config:** `cross-check-matrix.ts` — inverse map eksik (code → allowedTypes var, type → requiredCodes yok).

### 5. Fix Sketch

- **Yaklaşım:** Yeni `TYPE_REQUIRES_EXEMPTION_CODES` map: `IHRACKAYITLI: ['701','702','703','704']`, `OZELMATRAH: ['801..812']`, `ISTISNA: ['201..250','301..350']`.
- **Dosya:** `src/validators/type-validators.ts` veya yeni
- **Breaking change mi:** Evet (eksik kod gönderen input'lar reject edilir)
- **v2.0.0 etkisi:** BREAKING CHANGES
- **Tahmini test sayısı:** 5 (IHRACKAYITLI, OZELMATRAH, ISTISNA × eksik + geçerli)
- **Fix süresi:** 30dk-2saat

### 6. Manuel Test Checklist

1. [ ] Mimsoft IHRACKAYITLI tipinde exemption kodu zorunlu tutuyor mu UI'da?
2. [ ] Mimsoft prod'da IHRACKAYITLI + kdvExemptionCode eksik fatura var mı?

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-07: IHRACKAYITLI 702 satırında KDV>0 basic modda kaçıyor

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/07/validation-errors.ts` (case 4)
**Öncelik önerisi:** Orta
**Mimsoft üretim etkisi:** Var (f12 fixture paralelliği — IHRACKAYITLI Mimsoft prod'da)
**Workaround mevcut:** strict mod (ama 07 senaryosu B-NEW-12 sebebiyle basic'te)

### 1. Reproduction

```typescript
{
  type: 'IHRACKAYITLI',
  kdvExemptionCode: '702',
  lines: [
    { name: 'Demo', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 20 }, // ← IHRACKAYITLI'da KDV=0 olmalı
  ],
}
```

`SimpleInvoiceBuilder({ validationLevel: 'basic' }).build(input)` → başarılı (hatalı).
`SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input)` → başarılı (aynı, basic'le aynı sonuç — GARİP)

### 2. Expected

- **Success:** false (her iki modda)
- **Errors[0].code:** `EXEMPTION_REQUIRES_ZERO_KDV_LINE` veya yeni `IHRACKAYITLI_REQUIRES_ZERO_KDV`
- **Errors[0].message:** `"IHRACKAYITLI tipinde satır KDV tutarı=0 zorunlu (702 kapsamında erteletilmiş KDV)"`

### 3. Actual

- **Success:** true (hem basic hem strict)
- **Output.xml:** `<cbc:TaxAmount>20.00</cbc:TaxAmount>` + `<cbc:TaxExemptionReasonCode>702</cbc:TaxExemptionReasonCode>` — GİB tarafından reddedilir.

### 4. Root Cause

- **Kod lokasyonu:** `cross-check-matrix.ts:166-172` 702 için `requiresZeroKdvLine` bayrağı **tanımlı DEĞİL** (sadece 351 için var).
- **Neden yakalamıyor:** Matrix'te 702 kuralı yalnızca `allowedInvoiceTypes` belirtiyor, KDV=0 zorunluluğu eklenmemiş.
- **İlgili config:** `cross-check-matrix.ts` 702 entry.

### 5. Fix Sketch

- **Yaklaşım:** 702 matrix entry'e `requiresZeroKdvLine: true` bayrağı ekle (ve 701, 703, 704 için de — IHRACKAYITLI grubu).
- **Dosya:** `src/validators/cross-check-matrix.ts:170ish`
- **Breaking change mi:** Hayır (sadece hatalı input yakalama sıkılaştı — doğru input etkilenmez)
- **v2.0.0 etkisi:** Fixed
- **Tahmini test sayısı:** 4 (701-704 her biri için)
- **Fix süresi:** <30dk

### 6. Manuel Test Checklist

1. [ ] Mimsoft IHRACKAYITLI faturasında satır KDV>0 girebiliyor musun?
2. [ ] f12 fixture'daki tüm satırlar KDV=0 mı? (hızlı doğrulama)

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-08: type=SGK ama sgk obje eksik yakalanmıyor

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/08-temelfatura-sgk/validation-errors.ts` (case 1)
**Öncelik önerisi:** Orta
**Mimsoft üretim etkisi:** Var (f16 fixture — SGK Mimsoft prod'da)
**Workaround mevcut:** Yok

### 1. Reproduction

```typescript
{
  profile: 'TEMELFATURA',
  type: 'SGK',
  // sgk: { ... } YOK
  lines: [
    { name: 'İlaç', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 20 },
  ],
}
```

### 2. Expected

- **Success:** false
- **Errors[0].code:** `MISSING_FIELD` veya `TYPE_REQUIRES_SGK`
- **Errors[0].path:** `sgk`
- **Errors[0].message:** `"SGK tipinde belge seviyesi sgk bilgisi zorunlu"`
- **Gerekçe:** SGK faturası GİB schema'sında `AdditionalDocumentReference` altında SGK meta bloğu zorunlu. Kütüphane bunu `input.sgk`'dan mapler — yoksa XML eksik.

### 3. Actual

- **Success:** true (silent accept)
- **Output.xml:** `<cbc:InvoiceTypeCode>SGK</cbc:InvoiceTypeCode>` var ama `AdditionalDocumentReference` yok — GİB reddedecek.

### 4. Root Cause

- **Kod lokasyonu:** `src/validators/type-validators.ts` — SGK tipi için sgk obje kontrolü yok.
- **Neden yakalamıyor:** `type === 'SGK'` runtime kontrolü eksik.
- **İlgili config:** Yok (type × required field haritası yok).

### 5. Fix Sketch

- **Yaklaşım:** `validateByType` içinde SGK branch: `if (type === 'SGK' && !input.sgk) push({ code: 'TYPE_REQUIRES_SGK', ... })`
- **Dosya:** `src/validators/type-validators.ts`
- **Breaking change mi:** Hayır (hatalı input yakalar, doğru input etkilenmez)
- **v2.0.0 etkisi:** Fixed
- **Tahmini test sayısı:** 2 (sgk eksik, sgk boş obje)
- **Fix süresi:** <30dk

### 6. Manuel Test Checklist

1. [ ] Mimsoft UI'da SGK tipi seçtiğinde sgk alanları zorunlu mu?
2. [ ] f16 XML'inde `AdditionalDocumentReference[IssuerParty]` yapısı nasıl, ne bilgi taşıyor?

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-09: sgk.type whitelist kontrolü yok

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/08/validation-errors.ts` (case 2)
**Öncelik önerisi:** Orta
**Mimsoft üretim etkisi:** Var (f16 fixture — SGK prod)
**Workaround mevcut:** Yok

### 1. Reproduction

```typescript
{
  type: 'SGK',
  sgk: {
    type: 'FOOBAR', // ← whitelist DIŞI (izinli: SAGLIK_ECZ, SAGLIK_HAS, SAGLIK_OPT, SAGLIK_MED, ABONELIK, MAL_HIZMET, DIGER)
    documentNo: 'SGK-2026-042',
    companyName: 'X', companyCode: 'Y',
  },
  lines: [ /* ... */ ],
}
```

### 2. Expected

- **Success:** false
- **Errors[0].code:** `INVALID_VALUE`
- **Errors[0].path:** `sgk.type`
- **Errors[0].message:** `"sgk.type geçersiz. İzinli: SAGLIK_ECZ|SAGLIK_HAS|SAGLIK_OPT|SAGLIK_MED|ABONELIK|MAL_HIZMET|DIGER"`

### 3. Actual

- **Success:** true
- **Output.xml:** `<cbc:DocumentType>FOOBAR</cbc:DocumentType>` (veya benzeri) — GİB reddedecek.

### 4. Root Cause

- **Kod lokasyonu:** `src/calculator/simple-invoice-mapper.ts` SGK mapping — enum kontrolü yok.
- **İlgili config:** `simple-types.ts:257` `SimpleSgkInput.type` tipi `string` olarak tanımlı (TypeScript union değil) — runtime whitelist yok.

### 5. Fix Sketch

- **Yaklaşım:** `SimpleSgkInput.type`'ı TS literal union yap: `'SAGLIK_ECZ' | 'SAGLIK_HAS' | ...` + runtime check.
- **Dosya:** `src/calculator/simple-types.ts:257` + `src/validators/type-validators.ts`
- **Breaking change mi:** Evet (TypeScript tip daraltma; mevcut string kabul eden kod artık enum gerektirir)
- **v2.0.0 etkisi:** BREAKING CHANGES (TS tipi)
- **Tahmini test sayısı:** 2 (whitelist, out-of-whitelist)
- **Fix süresi:** <30dk

### 6. Manuel Test Checklist

1. [ ] Mimsoft 7 SGK alt-tipini nasıl kullanıyor? (Kullanım sıklığı)
2. [ ] GİB kod-listeleri dokümanında SGK alt-tip listesi var mı?

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-10: sgk.documentNo boş yakalanmıyor

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/08/validation-errors.ts` (case 3)
**Öncelik önerisi:** Düşük
**Mimsoft üretim etkisi:** Var (f16 prod)
**Workaround mevcut:** Yok

### 1. Reproduction

```typescript
sgk: {
  type: 'SAGLIK_ECZ',
  documentNo: '', // ← BOŞ
  companyName: 'X', companyCode: 'Y',
}
```

### 2. Expected

- **Errors[0].code:** `MISSING_FIELD`
- **Errors[0].path:** `sgk.documentNo`
- **Errors[0].message:** `"SGK belge numarası boş olamaz"`

### 3. Actual

- **Success:** true (silent accept)
- **Output.xml:** `<cbc:ID></cbc:ID>` boş tag — XSD minOccurs="1" ihlali muhtemelen.

### 4. Root Cause

- **Kod lokasyonu:** `src/calculator/simple-invoice-mapper.ts` SGK mapper → `AdditionalDocumentReference.id`
- **Neden yakalamıyor:** `sgk.documentNo`'nun boş-olmama kontrolü yok. TypeScript tipi `string` — boş string de string.

### 5. Fix Sketch

- **Yaklaşım:** B-NEW-08 ile birleştirilmiş: SGK obje + alt-alan zorunlu içerik kontrolü. Tek commit.
- **Dosya:** `src/validators/type-validators.ts` (SGK branch)
- **Breaking change mi:** Hayır
- **v2.0.0 etkisi:** Fixed
- **Tahmini test sayısı:** 3 (documentNo boş, companyName boş, companyCode boş)
- **Fix süresi:** <30dk

### 6. Manuel Test Checklist

1. [ ] f16 fixture'da documentNo hangi format? (SGK-XXX-YYY mi başka mı)
2. [ ] Mimsoft auto-generate ediyor mu, kullanıcıdan alıyor mu?

### 7. Karar (Berkay dolduracak)

**Berkay notları:** (boş)

---

## B-NEW-11 (ÖNEMLİ): TEVKIFAT + tek satır strict'te B-81/M5 false-positive çakışması

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/05-temelfatura-tevkifat` baseline build fail
**Öncelik önerisi:** **KRİTİK**
**Mimsoft üretim etkisi:** **Var** (tevkifat faturaları yaygın — f10/f11 Mimsoft fixture'larında stopaj var; TEVKIFAT InvoiceTypeCode ayrı olsa da aynı çakışma türevi)
**Workaround mevcut:** `validationLevel: 'basic'` — şu an 05, 10, 16, 31, 99-showcase-everything senaryolarında aktif

### 1. Reproduction (minimum input)

```typescript
import type { SimpleInvoiceInput } from '../../src';
import { SimpleInvoiceBuilder } from '../../src';

const input: SimpleInvoiceInput = {
  id: 'EXA2026000000005',
  uuid: 'e1a2b3c4-0005-4000-8005-000000000005',
  datetime: '2026-04-23T12:00:00',
  profile: 'TEMELFATURA',
  type: 'TEVKIFAT',
  currencyCode: 'TRY',
  sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
  customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
  lines: [
    {
      name: 'Bakım Hizmet',
      quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: 20,
      withholdingTaxCode: '603',  // Bakım/Onarım %70
    },
  ],
};

const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
try {
  const { xml } = builder.build(input);
  console.log('success');
} catch (err) {
  console.log('errors:', (err as any).errors);
}
```

### 2. Expected

- **Success:** true
- **Errors:** yok
- **Output.xml:** Normal TEVKIFAT faturası — `TaxExemptionReasonCode` **üretilmemeli** (KDV>0 normal).
- **Gerekçe:** TEVKIFAT tipinde KDV hesaplanır ve tevkifat KDV üzerinden düşer. İstisna kodu yok, bu normal satış + tevkifat. 351 atanması yanlış.

### 3. Actual

- **Success:** false
- **Errors:**
  ```
  [EXEMPTION_REQUIRES_ZERO_KDV_LINE]
  path=taxTotals[0].taxSubtotals[0].taxExemptionReasonCode
  message='351' kodu için en az bir satırda KDV tutarı=0 olmalı
  ```
- **Gerekçe:** Calculator otomatik olarak `taxExemptionReason.kdv = '351'` atıyor (TEVKIFAT bile), mapper bunu XML'e taşıyor, M5 cross-check `requiresZeroKdvLine: true` kuralı tetikleniyor — KDV>0 olduğu için hata. **False positive.**

### 4. Root Cause (kritik detay)

**İki kaynaklı çakışma:**

1. **`src/calculator/document-calculator.ts:67-68`**
   ```ts
   const DEFAULT_EXEMPTIONS = {
     satis: '351',      // ← HER SATIŞ-BENZERİ TİPTE DEFAULT 351
     istisna: '350',
     ihracKayitli: '701',
   } as const;
   ```
   TEVKIFAT tipinde de `satis` branch'inden 351 atanıyor olabilir.

2. **`src/calculator/simple-invoice-mapper.ts:249-251`**
   ```ts
   // B-81 minimal fix: TEVKIFAT tipinde calculator 351 üretir, mapper atlamamalı
   if (type === 'TEVKIFAT' && ts.code === '0015' && calc.taxExemptionReason.kdv === '351') return true;
   ```
   Mapper 351'i `shouldKeepTaxExemptionReason`'dan true döndürüp XML'e yazıyor.

3. **`src/validators/cross-check-matrix.ts:166-172`** (hatırlatma)
   ```ts
   { code: '351', requiresZeroKdvLine: true, allowedInvoiceTypes: [..., 'TEVKIFAT', ...] }
   ```

4. **`cross-check-matrix.ts:241-243`**
   ```ts
   if (rule.requiresZeroKdvLine && !kdvSubtotals.some(s => s.amount === 0)) {
     errors.push({ code: 'EXEMPTION_REQUIRES_ZERO_KDV_LINE', ... });
   }
   ```

**Sonuç:** Calculator atar → mapper taşır → validator reject eder. Kendi içinde çelişki.

### 5. Fix Sketch (tercihli yaklaşımlar)

**Opsiyon A (önerilen, minimal):** `simple-invoice-mapper.ts:251` satır kaldırılır — TEVKIFAT'ta 351 XML'e yazılmaz (mapper atlar). B-81 "fix"i aslında soruna yol açmış.

**Opsiyon B:** `document-calculator.ts:67` TEVKIFAT'ta `satis` default'u atanmasın — calculator'da tip-aware default.

**Opsiyon C:** `cross-check-matrix.ts:172` 351 kuralına `excludedInvoiceTypes: ['TEVKIFAT', 'TEVKIFATIADE']` ekle — M5 muafiyet.

- **Önerilen:** A + B kombinasyonu. Calculator TEVKIFAT'ta 351 üretmesin, mapper'ın B-81 özel case'ine gerek kalmaz.
- **Dosya:** `src/calculator/document-calculator.ts:67-68` + `src/calculator/simple-invoice-mapper.ts:249-251`
- **Breaking change mi:** Potansiyel — eski davranış 351'i TEVKIFAT XML'ine yazıyordu; bazı Mimsoft/GİB workflow'ları bunu bekliyor olabilir. Mimsoft XML'lerinde TEVKIFAT + 351 kombinasyonu VAR MI? (Manuel teyit şart.)
- **v2.0.0 etkisi:** BREAKING CHANGES (TEVKIFAT XML yapısı değişir, 351 element'i çıkar)
- **Tahmini test sayısı:** 6 (TEVKIFAT tek-satır, TEVKIFAT çok-satır, TEVKIFATIADE, snapshot regression × 9 basic-mod senaryo)
- **Fix süresi:** 30dk-2saat (test suite geniş etkilenecek)

### 6. Manuel Test Checklist (EN KRİTİK)

1. [ ] **Mimsoft fixture f10/f11 (stopajlı satış) XML'inde `TaxExemptionReasonCode=351` var mı?** — grep yapılabilir
2. [ ] Mimsoft'ta gerçek bir KDV tevkifatlı fatura (örn. 603 Bakım/Onarım) kes
3. [ ] Mimsoft'un ürettiği XML'de `TaxExemptionReasonCode` var mı? (351 yazılıyor mu?)
4. [ ] Eğer Mimsoft 351 yazıyorsa → kütüphane aynı davranışı korumalı, M5 kuralı TEVKIFAT için muaf tutulmalı (Opsiyon C)
5. [ ] Eğer Mimsoft 351 yazmıyorsa → calculator'da atama kaldırılmalı (Opsiyon A+B)
6. [ ] GİB testnet'e her iki XML varyasyonunu gönder, cevabı karşılaştır
7. [ ] B-81'in orijinal bulgu kaynağını incele — neden "mapper atlamamalı" deniyor? (`audit/FIX-PLANI-v3.md` B-81 history)

### 7. Karar (Berkay dolduracak)

- [ ] Kritik — Sprint 8c'de ilk hotfix
- [ ] Orta
- [ ] Düşük
- [ ] Tartışılacak — Mimsoft davranışı netleşmeden karar verilmemeli

**Berkay notları:** (boş)

---

## B-NEW-12 (ÖNEMLİ): IHRACKAYITLI+702 için SimpleLineInput AlıcıDİBKod ağacını desteklemiyor

**Keşif:** Sprint 8b.2 commit `aac9340` — `examples/07-temelfatura-ihrackayitli-702` strict build fail
**Öncelik önerisi:** **KRİTİK**
**Mimsoft üretim etkisi:** **Var** (f12 Mimsoft fixture — IHRACKAYITLI prod kullanımda)
**Workaround mevcut:** `validationLevel: 'basic'` — 07 ve 17 senaryolarında aktif

### 1. Reproduction

```typescript
import type { SimpleInvoiceInput } from '../../src';
import { SimpleInvoiceBuilder } from '../../src';

const input: SimpleInvoiceInput = {
  profile: 'TEMELFATURA', type: 'IHRACKAYITLI', kdvExemptionCode: '702',
  id: 'EXA2026000000007', uuid: 'e1a2b3c4-0007-4000-8007-000000000007',
  datetime: '2026-04-23T10:00:00', currencyCode: 'TRY',
  sender: { /* ... */ }, customer: { /* ... */ },
  lines: [
    {
      name: 'Tekstil', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 0,
      buyerCode: 'DIIB-2026-000042', // 12 karakter
      delivery: {
        gtipNo: '620342000010',      // 12 hane GTIP
        deliveryAddress: { /* ... */ },
      },
    },
  ],
};

new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input);
```

### 2. Expected

- **Success:** true (strict modda)
- **Output.xml:** `<cac:Shipment>/<cac:TransportHandlingUnit>/<cac:TransportEquipment>/<cac:CustomsDeclaration>/<cac:IssuerParty>/<cac:PartyIdentification>/<cbc:ID schemeID="ALICIDIBSATIRKOD">DIIB-2026-000042</cbc:ID>` yapısı
- **Gerekçe:** B-07 kuralı: IHRACKAYITLI + 702 satır seviyesi **AlıcıDİBKod 11 haneli** zorunlu. Low-level `InvoiceInput` bu yapıyı destekler; simple-input `SimpleLineInput.buyerCode` bu ağaca eşleşmiyor.

### 3. Actual

- **Success:** false (strict modda)
- **Errors:**
  ```
  [IHRACKAYITLI_702_REQUIRES_GTIP] lines[0].delivery.shipment.goodsItems[].requiredCustomsId: GTİP 12 hane değil
  [IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD] lines[0].delivery.shipment.transportHandlingUnits[].customsDeclarations[].issuerParty.partyIdentifications[]: 11 haneli ALICIDIBSATIRKOD zorunlu
  ```
- **Output.xml (basic modda):** Top-level `<cbc:TaxExemptionReasonCode>702` var ama Shipment ağacı **yok** — satır seviyesi AlıcıDİBKod XML'de hiç üretilmiyor.
- **Farklı observation:** GTIP error "12 hane değil" diyor ama input 12 hane. Path `shipment.goodsItems` gösteriyor — yani validator yanlış yerde arıyor çünkü `SimpleLineInput.delivery.gtipNo` bu ağaca map edilmiyor.

### 4. Root Cause

- **Kod lokasyonu:** `src/types/common.ts LineDeliveryInput` ve `src/types/invoice-input.ts InvoiceLineInput` — shipment/transportHandlingUnits/customsDeclarations/issuerParty/partyIdentifications path'i var (low-level), **simple-types.ts `SimpleLineDeliveryInput`** bu ağaca erişim sağlamıyor.
- **`simple-types.ts:119-135`**
  ```ts
  export interface SimpleLineDeliveryInput {
    deliveryAddress: SimpleAddressInput;
    deliveryTermCode?: string;
    gtipNo?: string;
    transportModeCode?: string;
    packageId?: string;
    packageQuantity?: number;
    packageTypeCode?: string;
  }
  ```
  `buyerTaxCode`, `alicidibsatirkod` veya benzeri alan **yok**.
- **`simple-invoice-mapper.ts`** — `buyerCode` alanını item.buyerCode'a map ediyor (ürün kodu), değil shipment/customs/issuerParty/partyIdentifications'a. B-07 validator'ının beklediği yapıya erişim yok.
- **`src/validators/profile-validators.ts:356-361`** — validator IHRACKAYITLI+702 için `lines[i].delivery.shipment.transportHandlingUnits[j].customsDeclarations[k].issuerParty.partyIdentifications[l]` path'inde `schemeId='ALICIDIBSATIRKOD'` arıyor.

### 5. Fix Sketch

**Opsiyon A (minimal):** `SimpleLineDeliveryInput`'a yeni alan:
```ts
export interface SimpleLineDeliveryInput {
  // ... mevcut
  /** IHRACKAYITLI+702 için 11-haneli alıcı DİB satır kodu (B-07) */
  alicidibsatirkod?: string;
}
```
Mapper bunu `TransportHandlingUnit[CustomsDeclaration[IssuerParty[PartyIdentification[ID schemeID='ALICIDIBSATIRKOD']]]]` ağacına eşler.

**Opsiyon B:** `SimpleLineInput.buyerCode`'un semantikleri belirsiz — şu an "Alıcı ürün kodu" olarak dokümante ama IHRACKAYITLI'da farklı anlam taşıyor. Ayrı alan gerekli (opsiyon A).

- **Dosya:** `src/calculator/simple-types.ts` (interface genişlet) + `src/calculator/simple-invoice-mapper.ts` (map)
- **Breaking change mi:** Evet (yeni opsiyonel alan ama B-07 validator artık simple-input'tan tetiklenecek; eski input'larda 702 kullananlar artık alan eksikliği hatası alır)
- **v2.0.0 etkisi:** Added + BREAKING (validator side)
- **Tahmini test sayısı:** 4 (alan var ok, alan eksik hata, format bozuk, paralel GTIP)
- **Fix süresi:** 2saat+ (low-level InvoiceInput ağacına doğru mapping gerektirir, `simple-invoice-mapper.ts`'de derin değişiklik)

### 6. Manuel Test Checklist (EN KRİTİK)

1. [ ] **Mimsoft f12 fixture XML'inde `ALICIDIBSATIRKOD` schemeID'li element var mı?** — grep yapılabilir
2. [ ] Eğer varsa: path'i nedir? `cac:Shipment/.../PartyIdentification/@schemeID="ALICIDIBSATIRKOD"` formatı mı?
3. [ ] Mimsoft UI'da IHRACKAYITLI + 702 satırında hangi alan ALICIDIBSATIRKOD'u taşıyor?
4. [ ] Mimsoft ALICIDIBSATIRKOD'u API'de nasıl kabul ediyor? (simple-input benzeri düz alan mı, nested mi?)
5. [ ] Sprint 8c hotfix'te `alicidibsatirkod` alan adı Mimsoft API ile uyumlu olmalı — isimlendirme kararı Berkay'a
6. [ ] GİB testnet'te Shipment ağacı OLMAYAN IHRACKAYITLI + 702 XML'i reject ediliyor mu? (kesin testten kalkmalı)

### 7. Karar (Berkay dolduracak)

- [ ] Kritik — Sprint 8c'de ilk hotfix (B-NEW-11 ile birlikte)
- [ ] Orta
- [ ] Düşük
- [ ] Tartışılacak

**Berkay notları:** (boş)

---

# Önceliklendirme Matrisi (Öneri)

| ID | Başlık | Mimsoft etki | Öncelik önerisi |
|----|--------|--------------|------------------|
| B-NEW-01 | kdvPercent alt sınır | Yok | Düşük |
| B-NEW-02 | quantity=0 | Yok | Düşük |
| B-NEW-03 | tax.percent üst sınır | Yok | Düşük |
| B-NEW-04 | 351 tek-satır KDV>0 | Bilinmiyor | Orta |
| B-NEW-05 | SATIS+702 basic geçiyor | Bilinmiyor | Orta |
| B-NEW-06 | IHRACKAYITLI exemption eksik | Bilinmiyor | Orta |
| B-NEW-07 | IHRACKAYITLI satır KDV>0 | Var (f12) | Orta |
| B-NEW-08 | SGK obje eksik | Var (f16) | Orta |
| B-NEW-09 | sgk.type whitelist | Var (f16) | Orta |
| B-NEW-10 | sgk.documentNo boş | Var (f16) | Düşük |
| **B-NEW-11** | **TEVKIFAT+351 false-positive** | **Var (f10/f11)** | **Kritik** |
| **B-NEW-12** | **IHRACKAYITLI AlıcıDİBKod ağacı** | **Var (f12)** | **Kritik** |

**Dağılım:**
- **Kritik (2):** B-NEW-11, B-NEW-12 — Mimsoft üretiminde doğrudan etkili
- **Orta (6):** B-NEW-04, 05, 06, 07, 08, 09 — cross-check matrix eksikleri / type-required haritası
- **Düşük (4):** B-NEW-01, 02, 03, 10 — sınır kontrolü hijyen

---

# Kritik Bug Grupları

## Grup A: Mimsoft üretimde gerçek kullanım (Kritik)

**Sprint 8c'de İLK hotfix'ler:**

- **B-NEW-11 (TEVKIFAT+351 çakışması):** `document-calculator.ts:67-68` DEFAULT_EXEMPTIONS + `simple-invoice-mapper.ts:249-251` B-81 fix + `cross-check-matrix.ts:172` kural üçlüsü çakışıyor. Mimsoft f10/f11 davranışı teyit edilmeden çözülemez.
- **B-NEW-12 (AlıcıDİBKod ağacı):** `SimpleLineDeliveryInput`'a yeni alan + `simple-invoice-mapper.ts` mapping genişletmesi. Mimsoft f12'de ALICIDIBSATIRKOD path'i teyit edilmeli.

Bu iki bug düzeltilmeden 05/07/10/16/17/31/99-showcase-everything senaryoları strict moda dönemez.

## Grup B: Cross-check matrix eksikleri (Orta)

Sprint 8c'de TEK commit'te toplanabilir:

- **B-NEW-04:** 351 `requiresZeroKdvLine` `kdvSubtotals` argümanı düzeltme
- **B-NEW-05:** `validateCrossMatrix` basic'e taşı (forbidden-type kontrolü her zaman açık)
- **B-NEW-06:** `TYPE_REQUIRES_EXEMPTION_CODES` map ekle
- **B-NEW-07:** `cross-check-matrix.ts` 701-704 kurallarına `requiresZeroKdvLine: true` ekle

## Grup C: SGK tip × zorunlu alan haritası (Orta)

Sprint 8c'de tek commit:

- **B-NEW-08:** type=SGK sgk obje zorunlu
- **B-NEW-09:** sgk.type whitelist (TS union + runtime)
- **B-NEW-10:** sgk.documentNo boş olmama

## Grup D: Sınır kontrolü hijyen (Düşük)

Sprint 8c'de tek commit:

- **B-NEW-01:** kdvPercent 0-100
- **B-NEW-02:** quantity > 0
- **B-NEW-03:** tax.percent 0-100

Post-v2.0.0'a da ertelenebilir.

---

# Sprint 8c Commit Stratejisi Önerisi

Plan boyutu: ~7-10 commit.

1. **8c.0** — Plan kopya + log iskelet (Sprint 8a/8b pattern'i)
2. **8c.1** — B-NEW-11 (kritik, breaking) — ayrı commit, snapshot test regresyon geniş
3. **8c.2** — B-NEW-12 (kritik, breaking) — ayrı commit, 07/17 senaryoları strict'e dönebilir
4. **8c.3** — Grup B (B-NEW-04/05/06/07 — cross-check matrix)
5. **8c.4** — Grup C (B-NEW-08/09/10 — SGK)
6. **8c.5** — Grup D (B-NEW-01/02/03 — sınır hijyen) — opsiyonel, post-v2.0.0'a alınabilir
7. **8c.6** — `__tests__/examples/validation-errors.test.ts` lenient → strict per-case assert (test hedefi 869)
8. **8c.7** — `examples/` basic mod senaryolarını strict'e geri çek (05, 07, 10, 16, 17, 20, 26, 31, 99-showcase-everything) + snapshot regenerate
9. **8c.8** — `package.json` 1.4.2 → 2.0.0 + `git tag v2.0.0`
10. **8c.9** — `npm publish --dry-run` smoke → `npm publish` + GitHub release notes
11. **8c.10** — Skill repo commit (`audit/skill-doc-patches-sprint-8b.md`)
12. **8c.11** — Sprint 8c implementation log finalize

---

# Test Suite Etkisi

- **Şu an:** 755 test (Sprint 8b çıkışı)
- **Plan hedefi:** ~869 test (strict per-case × 38 senaryo × 4 case = ~152 yeni, şu an 38 slug-level var)
- **Fark:** +114 test (Sprint 8c.6)

**Hotfix etkisi:**
- **B-NEW-11, 12 fix edildiğinde** 05, 07, 10, 16, 17, 20, 26, 31, 99-showcase-everything senaryolarının output.xml'leri değişir (TEVKIFAT'tan 351 kalkar veya Shipment ağacı eklenir). Snapshot test regenerate gerekli.
- **B-NEW-04..07 fix edildiğinde** validation-errors.ts'lerde `notCaughtYet` case'leri `expectedErrors`'a dönüşür.

---

# Çalıştıramadığım / Belirsiz Kalan Case'ler

Bu audit dump üretilirken aşağıdaki noktalar **manuel teyit bekliyor**:

1. **Mimsoft f10/f11 XML'inde TaxExemptionReasonCode=351 VAR MI?** (B-NEW-11 fix yönü bu soruya bağlı — grep yapılabilir ama ben fixture çözümlemedim)
2. **Mimsoft f12 XML'inde ALICIDIBSATIRKOD VAR MI ve hangi XML path'inde?** (B-NEW-12 fix yapısı bu soruya bağlı)
3. **GİB testnet'te TaxExemptionReasonCode=351 içeren TEVKIFAT XML kabul ediyor mu?** (Opsiyon A vs C arası karar)
4. **B-81 orijinal bulgu kaynağı:** `audit/FIX-PLANI-v3.md` B-81 context — mapper neden 351'i atlamalı demişti? History incelenmedi.
5. **Mimsoft SGK API yapısı:** sgk.type whitelist'i Mimsoft'ta zaten sıkı mı, gevşek mi? (B-NEW-09 tip daraltma Mimsoft ile uyumlu mu)

Bu 5 soru Sprint 8c'de hotfix'lere başlamadan önce Berkay tarafından netleştirilmeli (Mimsoft fixture inspection + prod log kontrol).

---

**Audit dump tamamlandı.** Berkay bu dosyayı Mimsoft üretim verisi yanında tutarak her B-NEW için 7. bölümü (Karar) doldurur, Sprint 8c hotfix commit stratejisini netleştirir.

---

## B-NEW-13 (KRİTİK): YOLCUBERABERFATURA simple-input nationalityId + passportId + taxRepresentativeParty eksik

**Keşif:** Sprint 8c Plan Modu — senaryo 20 (YOLCUBERABERFATURA+ISTISNA 322) basic mode workaround.
**Öncelik:** Kritik (v2.0.0 release kapsamında 9/9 strict hedefi).
**Mimsoft üretim etkisi:** Var (bavul ticareti üretimde).
**Çözüm:** Sprint 8c.4 (commit aşağıda).

### 1. Reproduction (mevcut ve eksik)

```typescript
// Önceki (basic mod workaround)
buyerCustomer: {
  name: 'Michael Schneider (Tourist)',
  taxNumber: 'N12345678', // ← pasaport no taxNumber alanında (semantik yanlış)
  // nationalityId YOK
  // passportId YOK
  ...
}
// taxRepresentativeParty yok — profil-validator tarafından reject
```

### 2. Expected (YOLCUBERABERFATURA strict mod GİB uyumlu)

- `buyerCustomer.nationalityId` (ISO 3166-1 alpha-2 ülke kodu) **zorunlu**
- `buyerCustomer.passportId` **zorunlu**
- `taxRepresentativeParty` ayrı alan (ARACIKURUMVKN + ARACIKURUMETIKET) **zorunlu**

### 3. Actual (Sprint 8c.4 öncesi)

- `SimpleBuyerCustomerInput`'ta `nationalityId` ve `passportId` alanları yok
- `SimpleInvoiceInput`'ta `taxRepresentativeParty` alanı yok
- Senaryo 20 strict mod'da `profile-validators.ts` 3 hata: NationalityID, Pasaport no, TaxRepresentativeParty eksik.

### 4. Root Cause

- `src/calculator/simple-types.ts`:
  - `SimpleBuyerCustomerInput` — B-104 skill §7.1 kapsamında `nationalityId` + `passportId` field'ları eksik
  - `SimpleInvoiceInput` — `taxRepresentativeParty` field'ı eksik
- `src/calculator/simple-invoice-mapper.ts`:
  - `buildBuyerCustomer` — nationalityId/passportId eşlemesi yok
  - `buildTaxRepresentative` — fonksiyon yok
- `profile-validators.ts` validator zaten mevcut (Sprint 5/Sprint 6'da eklenmiş), eksik olan yalnız simple-input katmanı.

### 5. Fix (Sprint 8c.4)

- `simple-types.ts` genişletildi: `SimpleBuyerCustomerInput.nationalityId?: string` + `passportId?: string`; yeni `SimpleTaxRepresentativeInput { vknTckn, label, name? }` + `SimpleInvoiceInput.taxRepresentativeParty?: SimpleTaxRepresentativeInput`.
- `simple-invoice-mapper.ts`:
  - `buildBuyerCustomer` `party.nationalityId` ve `party.passportId` eşler.
  - Yeni `buildTaxRepresentative` fonksiyonu `intermediaryVknTckn` + `intermediaryLabel` + `name` eşler.
  - `buildInvoiceInput` `result.taxRepresentativeParty` atanır.
- `examples/20-yolcu-beraber-istisna-yabanci/input.ts`:
  - `buyerCustomer.taxNumber` '11 hane fiktif' olarak düzeltildi
  - `nationalityId: 'DE'` + `passportId: 'N12345678'` eklendi
  - `taxRepresentativeParty: { vknTckn, label, name }` eklendi

### 6. Sonuç

- Senaryo 20 strict modda başarılı build (manuel smoke).
- XML: `NationalityID`, `IdentityDocumentReference/ID` (pasaport), `TaxRepresentativeParty` element'leri doğru yerde.
- `basicModSlugs` kaldırma + snapshot regen 8c.9/8c.10'da.

---

## B-NEW-14 (KRİTİK): IDIS profili SEVKIYATNO + ETIKETNO schematron validator eksik

**Keşif:** Sprint 8c Plan Modu — senaryo 26 (IDIS+SATIS) basic mode workaround.
**Öncelik:** Kritik (v2.0.0 release kapsamında 9/9 strict hedefi).
**Mimsoft üretim etkisi:** Var (IDIS izlenebilirlik üretimde).
**Çözüm:** Sprint 8c.5 (commit aşağıda).

### 1. Reproduction

```typescript
// Input geçerli format verir — validator kontrol ETMIYOR
sender: {
  identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-2026042' }],
  // ...
}
lines: [
  {
    additionalItemIdentifications: [
      { schemeId: 'ETIKETNO', value: 'ET0000001' },
    ],
    // ...
  },
]
```

### 2. Expected

- Sender'da `SEVKIYATNO` schemeID'li identification **zorunlu**, format `/^SE-\d{7}$/`
- Her line'da `ETIKETNO` schemeID'li additional identification **zorunlu**, format `/^[A-Z]{2}\d{7}$/`

### 3. Actual (Sprint 8c.5 öncesi)

- Validator kontrol eksik — format bozuk input'lar kabul ediliyor, eksik input'lar kabul ediliyor.

### 4. Root Cause

- `src/validators/profile-validators.ts` — IDIS branch yok (schematron kuralı eksik).

### 5. Fix (Sprint 8c.5)

- `profile-validators.ts` IDIS branch eklendi:
  - `sender.additionalIdentifiers[SEVKIYATNO]` zorunlu + format regex
  - Her `lines[].item.additionalItemIdentifications[ETIKETNO]` zorunlu + format regex
- Yeni error code'lar: `IDIS_SEVKIYATNO_REQUIRED`, `IDIS_SEVKIYATNO_INVALID_FORMAT`, `IDIS_ETIKETNO_REQUIRED`, `IDIS_ETIKETNO_INVALID_FORMAT`.

### 6. Sonuç

- Senaryo 26 input'u zaten geçerli format sağlıyordu → snapshot değişmez.
- Validator eksik input/format bozuk input'ları reject eder (yeni test case'ler 26'nın validation-errors.ts dosyasında).

---
