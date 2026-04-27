# B-NEW-v2 Audit Dump (Sprint 8f Sessiz Geçme Adayları)

**Üretim tarihi:** 2026-04-27
**Üretim kaynağı:** Sprint 8f.11 (kapsam ayarı §11) + 8f.12 (multi-error kesim) + 8e/8f kapsamsız kombinasyonu
**Amaç:** Berkay 7 silent-accept / yanlış davranış adayını gerçek runtime davranışıyla karşılaştırıp Sprint 8g hotfix önceliklerini belirlesin.
**Disiplin:** Bu dosya **audit dump**. Kod değişikliği yok — `src/` dokunulmadı.
**Test yöntemi:** Her senaryo `SimpleInvoiceBuilder.build(input, { validationLevel: 'strict' })` ile çalıştırıldı; output (success/errors/XML) gerçek runtime'dan yakalandı.

> **Not:** "Reproduction" bölümleri `SimpleInvoiceInput` kullanır (Berkay'ın production workflow'u). Tam form için `examples/01-temelfatura-satis/input.ts`'i referans alın. Tekrar çalıştırma için: `npx tsx audit/_b-new-v2-runner.ts` (geçici dosya silinebilir).

---

## B-NEW-v2-01: kdvPercent whitelist eksik (Türkiye geçerli oran kontrolü yok)

**Keşif:** Sprint 8f.11 kapsam ayarı §11 — `examples-matrix/_lib/specs.ts` `kdv-30-gecersiz` invalid spec'i validator tetiklemediği için silindi.
**Öncelik önerisi:** Orta
**Mimsoft üretim etkisi:** Bilinmiyor — manuel test gerekli (Mimsoft UI'sinde KDV oranı dropdown sınırlıysa tetiklenmez)

### 1. Reproduction (minimum input)

```typescript
import { SimpleInvoiceBuilder, type SimpleInvoiceInput } from '../../src';

const input: SimpleInvoiceInput = {
  id: 'AUD2026000000001',
  uuid: 'a1d2026a-0001-4000-8001-000000000001',
  datetime: '2026-04-27T10:00:00',
  profile: 'TEMELFATURA', type: 'SATIS', currencyCode: 'TRY',
  sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y',
    address: 'A', district: 'B', city: 'C' },
  customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y',
    address: 'A', district: 'B', city: 'C' },
  lines: [{ name: 'Ürün', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 30 }],
};

const builder = new SimpleInvoiceBuilder({ validationLevel: 'strict' });
const result = builder.build(input);
// success — XML üretildi.
```

### 2. Expected (olması gereken davranış)

- **Success:** false
- **Errors[0].code:** `INVALID_VALUE`
- **Errors[0].path:** `lines[0].kdvPercent`
- **Errors[0].message:** `"KDV oranı geçerli Türkiye değerlerinden olmalı (0, 1, 10, 20)"`
- **Gerekçe:** Türkiye'de geçerli KDV oranları **0, 1, 10, 20** (geçmiş: 8, 18, eski %15 vb.). GİB Schematron'u bazı oranları reject etmez (Schematron tip-spesifik kurallar dışında range vermez), ama kütüphane tüketicisinin sahte oran üretmesini engellemek pratik için yararlı.

### 3. Actual (şu an ne oluyor)

- **Success:** **true** (silent accept)
- **Errors:** yok
- **Output.xml (cbc:Percent bölümü):** `<cbc:Percent>30</cbc:Percent>` — 30 oranı XML'e olduğu gibi yazılıyor.

### 4. Root Cause (kod incelemesi)

- **Kod lokasyonu:** `src/validators/simple-line-range-validator.ts:21-28` (B-NEW-01) sadece `0 <= kdvPercent <= 100` range kontrolü yapar.
- **Neden yakalamıyor:** Validator KDV için **range check** yapıyor (Sprint 8c'de eklendi), **whitelist check** yapmıyor. 30 değeri 0-100 aralığında olduğu için geçer.
- **İlgili config/matrix:** `src/calculator/tax-config.ts:18` `TAX_DEFINITIONS` listesinde KDV oranı whitelist'i **yok** (yalnızca tax kodları tanımlı, oran serbest). KDV için ayrı bir `KDV_VALID_RATES = [0, 1, 10, 20]` set'i tanımlanmamış.

### 5. Fix Sketch

- **Yaklaşım:** `src/calculator/tax-config.ts`'a `KDV_VALID_RATES = new Set([0, 1, 10, 20])` ekle. `simple-line-range-validator.ts`'da B-NEW-01 kontrolüne whitelist katmanı ekle: `if (!KDV_VALID_RATES.has(kdvPercent)) errors.push(...)`. Range check de korunsun (defansif).
- **Dosya:** `src/calculator/tax-config.ts` + `src/validators/simple-line-range-validator.ts`
- **Breaking change mi:** **Evet** (geriye uyumlu değil — daha önce kabul edilen %5, %8, %25 gibi oranlar reject olur). v2.0.0 öncesi publish penceresi → uygun, ama v2.1.0+'da breaking.
- **v2.0.1 patch etkisi:** Changed (whitelist sıkılaştırma) — ancak v2.0.0 publish olmadan eklenirse sadece "Added" olarak nitelenir.
- **Tahmini test sayısı:** 4 (whitelist içi 0/1/10/20 kabul, %30 reddet, %5 reddet, %25 reddet)
- **Fix süresi tahmini:** <30dk

### 6. Mimsoft Ölçek Soruları (Berkay için)

1. Mimsoft kullanıcı UI'sinde KDV oranı dropdown sınırlı mı (sadece 0/1/10/20)?
2. Tarihsel data'da (eski faturalar) %8 / %18 oranı var mı? Backward compat gerekli mi?
3. GİB e-fatura/e-arşiv portalı %30 KDV içeren XML'i kabul ediyor mu, yoksa Schematron reject mi?
4. Bu bug'ın fix'lenmemiş hali Mimsoft üretiminde gözlemlendi mi (yanlış oranla kesilmiş fatura)?

### 7. Karar (Berkay dolduracak, boş bırak)

- [ ] Kritik — v2.0.1 hemen hotfix
- [ ] Orta — Sprint 8g'de düzenli hotfix
- [ ] Düşük — Post-v2.0.1 / v2.1.0'a ertelenebilir
- [ ] Tartışılacak — backward compat soruları (%8 / %18) açıklığa kavuşana kadar
- [x] False positive — Aslında doğru davranış (kütüphane tüketici input'una saygı, range check yeterli)

**Berkay notları:** 0<= kdv <=100 yeterli davranış, kütüphanede ek bi doğrulama uygulamıyoruz.

**Sprint 8g Sonuç:** False positive — yapılmadı. Range check yeterli; whitelist eklenirse %5/%8/%18 gibi geçmiş oranlar yanlış reject olur, geriye uyum kırılır.

---

## B-NEW-v2-02: TR IBAN format regex'i checksum doğrulamıyor

**Keşif:** Sprint 8f.11 — `examples-matrix/_lib/specs.ts` `iban-yanlis` spec'i (KAMU profil) silindi: ben yanlış field name kullanmıştım, ama detaylı incelemede gerçek bug ortaya çıktı.
**Öncelik önerisi:** Düşük (alt-case 02a doğru çalışıyor) / Orta (alt-case 02b silent accept)
**Mimsoft üretim etkisi:** Bilinmiyor — Mimsoft IBAN'larını başka katmanda doğruluyorsa etkisiz

### 1. Reproduction (minimum input)

**Alt-case 02a — Yabancı IBAN (DE prefix):**
```typescript
const input: SimpleInvoiceInput = {
  id: 'AUD2026000000002',
  uuid: 'a2d2026a-0002-4000-8001-000000000002',
  datetime: '2026-04-27T10:00:00',
  profile: 'KAMU', type: 'SATIS', currencyCode: 'TRY',
  sender: { /* standart */ }, customer: { /* standart */ taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
  buyerCustomer: { name: 'T.C. Kamu', taxNumber: '1460415308', address: 'A', district: 'D', city: 'C' },
  paymentMeans: { meansCode: '42', accountNumber: 'DE89370400440532013000' }, // ← DE IBAN
  lines: [{ name: 'X', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
};
```

**Alt-case 02b — TR prefix ama fake checksum:**
```typescript
paymentMeans: { meansCode: '42', accountNumber: 'TR000000000000000000000000' }, // ← format match, checksum geçersiz
```

### 2. Expected (olması gereken davranış)

- **02a (DE IBAN):** Hata atılmalı — `INVALID_FORMAT` veya `PROFILE_REQUIREMENT`. ✅ doğru çalışıyor.
- **02b (TR fake):** ISO 13616 mod-97 checksum hesaplaması yapılmalı, fake IBAN reject olmalı. **Şu an silent accept**.
- **Gerekçe:** B-83 (Sprint 8a) KAMU profilinde TR IBAN zorunluluğu ekledi. Ama format check sadece regex (`/^TR\d{7}[A-Z0-9]{17}$/`); IBAN spec mod-97 checksum içerir.

### 3. Actual (şu an ne oluyor)

**02a:**
- **Success:** false
- **Errors[0]:** `[INVALID_FORMAT] paymentMeans[0].payeeFinancialAccount.id: Geçersiz format: paymentMeans[0].payeeFinancialAccount.id`
- ✅ Yakalandı.

**02b:**
- **Success:** **true** (silent accept)
- **Output.xml (PaymentMeans bölümü):**
  ```xml
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>42</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>TR000000000000000000000000</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>
  ```

### 4. Root Cause (kod incelemesi)

- **Kod lokasyonu:** `src/config/constants.ts:287` `TR_IBAN_REGEX = /^TR\d{7}[A-Z0-9]{17}$/`. `src/validators/profile-validators.ts:177-180` KAMU IBAN format kontrolü.
- **Neden yakalamıyor:** Regex sadece format (TR + 7 rakam + 17 alphanum, toplam 26 karakter) doğruluyor. ISO 13616 mod-97 checksum doğrulaması yok. `TR000...0` regex'e uyduğu için geçer.
- **İlgili config/matrix:** Yok — IBAN doğrulama tek bir regex'e bağlı.

### 5. Fix Sketch

- **Yaklaşım:** `src/utils/iban-checksum.ts` (yeni) — ISO 13616 mod-97 hesabı (`isValidIban(iban: string): boolean`). Regex match sonrası bu fonksiyonla checksum doğrula. KAMU validator'ında ek hata `INVALID_IBAN_CHECKSUM` ya da mevcut `INVALID_FORMAT` ile farklı mesaj.
- **Dosya:** `src/utils/iban-checksum.ts` (yeni) + `src/validators/profile-validators.ts:177-180`
- **Breaking change mi:** Hayır (sıkılaştırma — gerçek IBAN'lar etkilenmez)
- **v2.0.1 patch etkisi:** Added (yeni IBAN checksum doğrulama)
- **Tahmini test sayısı:** 4 (gerçek IBAN kabul, fake checksum reddet, length mismatch reddet, prefix mismatch reddet)
- **Fix süresi tahmini:** 30dk-2saat (mod-97 implementasyonu + edge case'ler)

### 6. Mimsoft Ölçek Soruları (Berkay için)

1. Mimsoft UI'si IBAN field'a checksum doğrulama yapıyor mu (kullanıcı yanlış IBAN giremiyor mu)?
2. KAMU faturada yanlış IBAN ile gönderilen XML GİB tarafında reddediliyor mu (Schematron kontrol mü, banka kontrol mü)?
3. Bu bug'ın fix'lenmemiş hali üretimde gözlemlendi mi (yanlış IBAN ile fatura kesilip ödeme alınamayan vakalar)?

### 7. Karar (Berkay dolduracak, boş bırak)

- [ ] Kritik — v2.0.1 hemen hotfix
- [ ] Orta — Sprint 8g'de düzenli hotfix
- [ ] Düşük — Post-v2.0.1 / v2.1.0'a ertelenebilir
- [ ] Tartışılacak — Mimsoft IBAN doğrulamasını başka katmanda yapıyorsa kütüphane gerek var mı?
- [x] False positive — Format kontrolü yeterli, checksum tüketicinin sorumluluğu

**Berkay notları:** Format kontrolü yeterli, checksum tüketicinin sorumluluğu

**Sprint 8g Sonuç:** False positive — yapılmadı. Format regex (TR + 7 rakam + 17 alphanum) korundu; mod-97 checksum tüketici katmanında doğrulanır.

---

## B-NEW-v2-03: 4171 ÖTV Tevkifatı kodunun yasak tipte kullanımı (false positive)

**Keşif:** Sprint 8f.11 — `examples-matrix/_lib/specs.ts` `4171-yasak` spec'i validator tetiklemediği için silindi. Yeni testte aslında **yakalanıyor**.
**Öncelik önerisi:** False positive — kütüphane doğru davranıyor
**Mimsoft üretim etkisi:** Yok

### 1. Reproduction (minimum input)

```typescript
const input: SimpleInvoiceInput = {
  id: 'AUD2026000000003',
  uuid: 'a1d2026a-0003-4000-8001-000000000003',
  datetime: '2026-04-27T10:00:00',
  profile: 'TEMELFATURA', type: 'SATIS', currencyCode: 'TRY', // SATIS — 4171 yasak
  sender: { /* std */ }, customer: { /* std */ },
  lines: [{
    name: 'Akaryakıt', quantity: 100, price: 50, unitCode: 'Litre', kdvPercent: 20,
    taxes: [{ code: '4171', percent: 10 }], // ← 4171 yasak tipte
  }],
};
```

### 2. Expected (olması gereken davranış)

- **Success:** false
- **Errors[0].code:** `INVALID_VALUE`
- **Errors[0].path:** `taxTotals.taxSubtotals[0].taxTypeCode` (veya line-level)
- **Gerekçe:** `src/config/constants.ts:305-308` `TAX_4171_ALLOWED_TYPES = {TEVKIFAT, IADE, SGK, YTBIADE}`. SATIS bu sette yok → reject.

### 3. Actual (şu an ne oluyor)

- **Success:** **false** ✅
- **Errors[0]:** `[INVALID_VALUE] taxTotals.taxSubtotals[0].taxTypeCode: Geçersiz değer: taxTotals.taxSubtotals[0].taxTypeCode`
- ✅ Doğru yakalanıyor.

**Not:** 8f.11'de spec fail olmuştu çünkü spec'te yanlış field name kullanılmıştı (`manualTaxTotals` API'de yok). Doğru API (`taxes: [{ code, percent }]`) ile validator çalışıyor.

### 4. Root Cause (kod incelemesi)

- **Kod lokasyonu:** `src/validators/type-validators.ts:271-285` `validateTax4171`. `TAX_4171_ALLOWED_TYPES` set'i kullanılıyor.
- **Neden yakalıyor:** `validateByType` orchestration'unda `validateTax4171` her input için çağrılıyor. SATIS tipinde 4171 set'te yok → INVALID_VALUE.

### 5. Fix Sketch

**Fix gerekli değil.** Mevcut davranış doğru. Yapılabilir iyileştirme:

- Hata mesajını `expected` alanıyla zenginleştir: `"4171 sadece TEVKIFAT/IADE/SGK/YTBIADE tiplerinde kullanılabilir"` (şu an mesaj generic "Geçersiz değer", ama `expected` field'da detay var — message'a da yansıt).
- 8f.11'de silinen invalid spec'i doğru API ile yeniden ekle (Sprint 8g.1).

### 6. Mimsoft Ölçek Soruları (Berkay için)

1. Mimsoft 4171 kodu için akaryakıt/doğalgaz tipi otomatik mi belirliyor?
2. Bu kod yanlış tipte gönderildiğinde kullanıcı hata mesajı alıyor mu?
3. Falsifiable check: Mimsoft'ta SATIS tipinde 4171 ile fatura kesmeyi denemek?

### 7. Karar (Berkay dolduracak, boş bırak)

- [ ] Kritik — v2.0.1 hemen hotfix
- [ ] Orta — Sprint 8g'de düzenli hotfix
- [ ] Düşük — Post-v2.0.1 / v2.1.0'a ertelenebilir
- [ ] Tartışılacak — message string daha açıklayıcı yapılabilir
- [x] **False positive** — Kütüphane doğru davranıyor; sadece 8f.11 spec'i yanlış API kullanmış (re-add Sprint 8g)

**Berkay notları:** (boş)

**Sprint 8g Sonuç:** Sprint 8g.3'te example re-add edildi (`examples-matrix/_lib/specs.ts` 4171 invalid spec, doğru `taxes: [{ code, percent }]` API ile).

---

## B-NEW-v2-04: Withholding hata raporlama tutarsızlığı (UblBuildError yerine raw Error)

**Keşif:** Sprint 8f.11 — `withholding-oran-yanlis` spec'i validator tetiklemediği için silindi. Detaylı incelemede aslında error fırlıyor ama **yanlış error class**.
**Öncelik önerisi:** Orta (yakalama var ama ValidationError pattern'ine uymuyor)
**Mimsoft üretim etkisi:** Bilinmiyor — error handling katmanı try/catch ile bu Error'ları nasıl yakalıyor?

### 1. Reproduction (minimum input)

**Alt-case 04a — sabit kodda dynamic percent:**
```typescript
const input: SimpleInvoiceInput = {
  /* TEMELFATURA + TEVKIFAT baseline */
  lines: [{
    name: 'Hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
    withholdingTaxCode: '603', // 603 sabit %70
    withholdingTaxPercent: 99, // sadece 650 için olmalı
  }],
};
```

**Alt-case 04b — 650 + percent>100:**
```typescript
lines: [{ withholdingTaxCode: '650', withholdingTaxPercent: 150, /* range dışı */ }],
```

**Alt-case 04c — bilinmeyen kod:**
```typescript
lines: [{ withholdingTaxCode: '999', /* tanımlı değil */ }],
```

### 2. Expected (olması gereken davranış)

- **Success:** false
- **Errors[0]:** `UblBuildError` instance (ValidationError array içinde)
- **Errors[0].code:** `INVALID_VALUE` veya `WITHHOLDING_INVALID_PERCENT` / `WITHHOLDING_UNKNOWN_CODE`
- **Errors[0].path:** `lines[0].withholdingTaxPercent` veya `lines[0].withholdingTaxCode`
- **Gerekçe:** Tüm validator hataları `UblBuildError` üzerinden ValidationError dizisi olarak dönmeli (Sprint 1 mimari karar AR-1: tek error pattern).

### 3. Actual (şu an ne oluyor)

**04a (603 + percent):**
- **Success:** false
- **Type:** `Error` (UblBuildError DEĞİL)
- **Message:** `"Tevkifat kodu 603 sabit oranlıdır; 'withholdingTaxPercent' sadece 650 kodu için kullanılır."`

**04b (650 + 150):**
- **Type:** `Error`
- **Message:** `"Tevkifat kodu 650 için 'withholdingTaxPercent' 0-100 aralığında olmalı (gelen: 150)."`

**04c (999 bilinmeyen):**
- **Type:** `Error`
- **Message:** `"Geçersiz tevkifat kodu: 999. Tanımlı tevkifat kodları için withholding-config.ts dosyasına bakınız."`

**Üçü de:** `try { build } catch (e instanceof UblBuildError)` deyimi başarısız — `e` `Error` instance'ı, `UblBuildError` değil. Tüketicinin `error.errors` array'ine erişimi yok; sadece `error.message`.

### 4. Root Cause (kod incelemesi)

- **Kod lokasyonu:** `src/calculator/line-calculator.ts` veya `src/calculator/withholding-utils.ts` (calculator pre-processing) → throw `new Error(...)` direkt.
- **Neden yakalamıyor (validator bypass):** `SimpleInvoiceBuilder.build()` akışında calculator validator'dan **ÖNCE** çalışıyor. Calculator pre-process'te `withholdingTaxPercent` ile config karşılaştırması yapıyor; eşleşmezse direkt `throw new Error(...)`. Validator çalışmaya bile gelmiyor — calculator hatayı erken fırlatıyor.
- **İlgili config/matrix:** `src/calculator/withholding-config.ts` — `dynamicPercent: true` flag sadece 650'de.

### 5. Fix Sketch

- **Yaklaşım:** Calculator katmanında `throw new Error()` → ValidationError üretip dönen pattern'e dönüştür. `simple-line-range-validator.ts`'a yeni kontroller (B-NEW-v2-04a/b/c) ekle:
  - `if (def && !def.dynamicPercent && line.withholdingTaxPercent !== undefined)` → INVALID_VALUE
  - `if (def?.dynamicPercent && (percent < 0 || percent > 100))` → INVALID_VALUE
  - `if (!def)` → INVALID_VALUE (bilinmeyen kod)
- Calculator'daki `throw new Error()` çağrılarını kaldır veya `validationLevel === 'strict'` ise validator'a delege et.
- **Dosya:** `src/validators/simple-line-range-validator.ts` (yeni kontroller) + calculator katmanı temizlik.
- **Breaking change mi:** Davranışsal — Hayır (hata hala fırlıyor). API yüzeyi — Evet (UblBuildError instance'ı dönüyor, raw Error değil; tüketici error handling'i değişebilir).
- **v2.0.1 patch etkisi:** Changed (error reporting tutarlılığı) → Mimari karar AR-1 ile uyumlu hale getir.
- **Tahmini test sayısı:** 6 (3 alt-case × ValidationError kontrolü + 3 calculator'da raw error fırlatmama testi)
- **Fix süresi tahmini:** 30dk-2saat

### 6. Mimsoft Ölçek Soruları (Berkay için)

1. Mimsoft `SimpleInvoiceBuilder.build()` çağrısını try/catch ile sarıyor mu? `UblBuildError` ve `Error`'u ayrı mı handle ediyor?
2. 603 sabit kod kullanıldığında kullanıcı `withholdingTaxPercent` field'ını boş bırakıyor mu (UI dropdown ile)?
3. Bilinmeyen kod (örn. yeni TC config'inde olmayan kod) Mimsoft tarafında nasıl yakalanır?

### 7. Karar (Berkay dolduracak, boş bırak)

- [ ] Kritik — v2.0.1 hemen hotfix (error pattern tutarlılığı önemli)
- [x] Orta — Sprint 8g'de düzenli hotfix
- [ ] Düşük — Post-v2.0.1 / v2.1.0'a ertelenebilir
- [ ] Tartışılacak — calculator'da erken hata fırlatma vs. validator delegasyonu kararı
- [ ] False positive — raw Error de bilgilendirici, message yeterli (ama AR-1 mimari karara uymuyor)

**Berkay notları:** hata kodu doğru uygulansın. 

**Sprint 8g Sonuç:** Sprint 8g.1'de fix — calculator katmanındaki `throw new Error(...)` çağrıları `simple-line-range-validator.ts`'e taşındı; hatalar artık `UblBuildError`/`ValidationError` formatında dönüyor. AR-1 mimari karar tutarlılığı sağlandı.

---

## B-NEW-v2-05: IADE billingReference.documentTypeCode validator bypass

**Keşif:** Sprint 8f.11 — `iade-doctype-yanlis` spec'i validator tetiklemediği için silindi. Detaylı incelemede B-31 kuralı SimpleInvoiceInput → InvoiceInput mapping yolunda **bypass ediliyor**.
**Öncelik önerisi:** Orta (B-31 Sprint 8a kuralı kısmen uygulanmıyor)
**Mimsoft üretim etkisi:** Bilinmiyor — Mimsoft hangi documentTypeCode değerlerini gönderiyor?

### 1. Reproduction (minimum input)

**Alt-case 05a — yanlış kod:**
```typescript
const input: SimpleInvoiceInput = {
  id: 'AUD2026000000005',
  uuid: 'a1d2026a-0005-4000-8001-000000000005',
  datetime: '2026-04-27T10:00:00',
  profile: 'TEMELFATURA', type: 'IADE', currencyCode: 'TRY',
  billingReference: {
    id: 'AUD2026000000001',
    issueDate: '2026-04-24',
    documentTypeCode: 'DIGER' as any, // ← 'IADE' olması gerek
  },
  sender: { /* std */ }, customer: { /* std */ },
  lines: [{ name: 'İade', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
};
```

**Alt-case 05b — kod hiç verilmemiş:**
```typescript
billingReference: { id: 'AUD2026000000001', issueDate: '2026-04-24' }, // documentTypeCode YOK
```

### 2. Expected (olması gereken davranış)

- **Success:** false
- **Errors[0].code:** `TYPE_REQUIREMENT`
- **Errors[0].path:** `billingReferences[0].invoiceDocumentReference.documentTypeCode`
- **Errors[0].message:** `"IADE grubunda DocumentTypeCode 'IADE' olmalıdır"`
- **Gerekçe:** B-31 (Sprint 8a) `src/validators/type-validators.ts:98-105`'te tanımlı: IADE/TEVKIFATIADE/YTBIADE/YTBTEVKIFATIADE tiplerinde `documentTypeCode='IADE'` zorunlu (CommonSchematron:358).

### 3. Actual (şu an ne oluyor)

**05a (DIGER):**
- **Success:** **true** (silent accept)
- **Output.xml uzunluğu:** 4909 byte (tam fatura üretildi)
- B-31 hatası atılmıyor.

**05b (YOK):**
- **Success:** **true** (silent accept)
- B-31 hatası atılmıyor.

### 4. Root Cause (kod incelemesi)

- **Kod lokasyonu:** `src/validators/type-validators.ts:98-105` B-31 kuralı **var** (tam input kontrol ediyor: `billingReferences[].invoiceDocumentReference.documentTypeCode`).
- **Neden yakalamıyor:** `simple-invoice-mapper.ts`'da `SimpleInvoiceInput.billingReference` (tek obje, alt-tip `documentTypeCode` field'ı) → `InvoiceInput.billingReferences[]` mapping'inde **`documentTypeCode` aktarılmıyor olabilir** ya da default değer veriliyor. Tam input'ta kontrol kaçıyor.
- **İlgili config/matrix:** `IADE_GROUP_TYPES` set kullanılıyor — ama `validateIadeGroup` IADE grubunun documentTypeCode kontrolünü `billingReferences` üzerinden yapıyor. Mapper bu alanı taşımıyorsa kontrol her zaman boşa düşer.

### 5. Fix Sketch

- **Yaklaşım:**
  1. `simple-invoice-mapper.ts` — `billingReference.documentTypeCode`'u `billingReferences[0].invoiceDocumentReference.documentTypeCode`'a aktar (veya default `'IADE'` ata, ama bu silent fix — tüketici hatasını gizler).
  2. Daha temiz fix: `validateSimpleLineRanges` benzeri yeni bir `simple-billing-reference-validator.ts` ekle — `IADE_GROUP_TYPES.has(type)` ise `billingReference.documentTypeCode` zorunlu + `'IADE'` literal kontrolü.
- **Dosya:** `src/calculator/simple-invoice-mapper.ts` + yeni `src/validators/simple-billing-reference-validator.ts`
- **Breaking change mi:** Hayır (B-31 zaten Schematron'da var, sadece simple API'da yakalanmıyor)
- **v2.0.1 patch etkisi:** Fixed (B-31 implementasyon eksikliği)
- **Tahmini test sayısı:** 4 (DIGER reddet, eksik reddet, IADE kabul, TEVKIFATIADE de aynı kontrol)
- **Fix süresi tahmini:** 30dk-2saat

### 6. Mimsoft Ölçek Soruları (Berkay için)

1. Mimsoft IADE faturalarında `documentTypeCode` field'ını her zaman `'IADE'` mi gönderiyor (UI hardcoded mi)?
2. Eski faturalarda yanlış kod gönderilmiş örnek var mı?
3. GİB e-fatura portalı yanlış documentTypeCode'lu IADE faturayı kabul ediyor mu, yoksa Schematron reject mi?

### 7. Karar (Berkay dolduracak, boş bırak)

- [ ] Kritik — v2.0.1 hemen hotfix
- [x] Orta — Sprint 8g'de düzenli hotfix
- [ ] Düşük — Post-v2.0.1 / v2.1.0'a ertelenebilir
- [ ] Tartışılacak — mapper default value vs. validator delegasyonu
- [ ] False positive — Schematron zaten yakalar, kütüphane'de gerek yok

**Berkay notları:** hata dönmeli

**Sprint 8g Sonuç:** Sprint 8g.2'de fix — `simple-invoice-mapper.ts` `documentTypeCode` mapping'i güncellendi; B-31 kuralı IADE grubu için `documentTypeCode` eksikliğini/yanlış kodunu yakalıyor.

---

## B-NEW-v2-06: OZELMATRAH satır seviyesi exemption code mapper bypass

**Keşif:** Sprint 8f.12 — `multi-ozelmatrah-kod-karma` multi-error spec'i validator tetiklemediği için silindi. Detaylı incelemede satır seviyesi `kdvExemptionCode` mapper'da ignore ediliyor.
**Öncelik önerisi:** Düşük (false positive ihtimali yüksek — TS tipinde line-level field zaten yok, kullanıcı erişemez)
**Mimsoft üretim etkisi:** Yok (TS tip-safe Mimsoft client kullanıyorsa)

### 1. Reproduction (minimum input)

```typescript
const input: SimpleInvoiceInput = {
  id: 'AUD2026000000006',
  uuid: 'a1d2026a-0006-4000-8001-000000000006',
  datetime: '2026-04-27T10:00:00',
  profile: 'TEMELFATURA', type: 'OZELMATRAH', currencyCode: 'TRY',
  kdvExemptionCode: '801', // ← document seviyesi
  ozelMatrah: { percent: 18, taxable: 500, amount: 90 },
  sender: { /* std */ }, customer: { /* std */ },
  lines: [
    { name: 'A', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 },
    { name: 'B', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 0,
      kdvExemptionCode: '802' as any /* TS tipinde yok, any cast ile zorlandı */ },
  ],
};
```

### 2. Expected (olması gereken davranış)

İki olası beklenti:
1. **Validator yakala:** `INVALID_VALUE` "OZELMATRAH'ta tüm satırlar aynı kodu kullanmalı" — multi-code çakışma
2. **TS tipinde reddet:** `SimpleLineInput`'ta `kdvExemptionCode` field'ı zaten **yok** (sadece dokuman seviyesinde). Yani kullanıcı erişemez; bu senaryo TS-safety ile zaten engellenmeli.

### 3. Actual (şu an ne oluyor)

- **Success:** **true** (silent accept)
- **Output.xml uzunluğu:** 6751 byte
- Mapper line-level `kdvExemptionCode`'u **tamamen ignore ediyor**; document seviyesi `kdvExemptionCode='801'` her satıra uygulanıyor. Çakışma fark edilmiyor çünkü satır kodu mapper tarafından okunmadan atılıyor.

### 4. Root Cause (kod incelemesi)

- **Kod lokasyonu:** `src/calculator/simple-types.ts` `SimpleLineInput` interface'inde **`kdvExemptionCode` field'ı tanımlı değil** (sadece document seviyesi `SimpleInvoiceInput.kdvExemptionCode`).
- **Neden yakalamıyor:** TS compile-time'da `as any` cast'i ile zorlanmadıkça kullanıcı bu field'ı set edemez. Runtime'da `simple-invoice-mapper.ts` line iteration'unda bu field okunmuyor — silent ignore.
- **İlgili config/matrix:** `OZEL_MATRAH_TAX_EXEMPTION_REASON_CODES` — sadece document seviyesi için.

### 5. Fix Sketch

İki alternatif:

**A) Skip — by design.** Kütüphane TS-safe; runtime'da extra field ignore davranışı normal. Fix gerekmez, document'a not ekle.

**B) Strict mod runtime warning.** `validationLevel: 'strict'` ise unknown line-level field'lar için warning üret. Bu genel kapsamda büyük iş, sadece bu case için overkill.

- **Dosya:** Yok (skip) veya `src/validators/strict-mode-warnings.ts` (yeni, geniş kapsamlı)
- **Breaking change mi:** Hayır
- **v2.0.1 patch etkisi:** None (skip) veya Added (warning sistemi)
- **Tahmini test sayısı:** 0 (skip) veya 2 (strict warning testi)
- **Fix süresi tahmini:** Skip — 0; Strict warning — 2saat+

### 6. Mimsoft Ölçek Soruları (Berkay için)

1. Mimsoft TS tip kullanıyor mu (compile-time check var mı)?
2. JSON API üzerinden bu field'ı set etmeyi denedi mi (raw HTTP request)?
3. Pratikte OZELMATRAH faturada satır bazında farklı istisna kodu gerekli olur mu?

### 7. Karar (Berkay dolduracak, boş bırak)

- [ ] Kritik — v2.0.1 hemen hotfix
- [ ] Orta — Sprint 8g'de düzenli hotfix
- [ ] Düşük — Post-v2.0.1 / v2.1.0'a ertelenebilir (strict warnings sistemi)
- [ ] Tartışılacak — strict warnings tüm extra field'lar için tek seferde mi yapılmalı?
- [x] **False positive ihtimali yüksek** — TS tip ile zaten engelli; raw JSON ile zorlanırsa bu kullanıcının sorumluluğu

**Berkay notları:** False positive

**Sprint 8g Sonuç:** False positive — yapılmadı. TS tip ile `SimpleLineInput.kdvExemptionCode` zaten erişilebilir değil; raw JSON istismarı tüketicinin sorumluluğu.

---

## B-NEW-v2-07: EARSIVFATURA × TEKNOLOJIDESTEK senaryosu eksik (feature gap değil)

**Keşif:** Sprint 8e + 8f boyunca atlanmış kombinasyon. 8e log: "EARSIVFATURA × TEKNOLOJIDESTEK 1 kombinasyon kapsamsız (özel TCKN/TELEFON şartı)". 8f.13 coverage gap report'unda hala 67/68 (%98.5).
**Öncelik önerisi:** Düşük (sadece example eksikliği, kütüphane destekliyor)
**Mimsoft üretim etkisi:** Bilinmiyor — Mimsoft TEKNOLOJIDESTEK faturayı EARSIVFATURA profilinde kesiyor mu?

### 1. Reproduction (minimum input)

**Alt-case 07a — geçerli senaryo:**
```typescript
const input: SimpleInvoiceInput = {
  id: 'AUD2026000000007',
  uuid: 'a1d2026a-0007-4000-8001-000000000007',
  datetime: '2026-04-27T10:00:00',
  profile: 'EARSIVFATURA', type: 'TEKNOLOJIDESTEK', currencyCode: 'TRY',
  sender: { /* std */ },
  customer: { taxNumber: '12345678901', taxIdType: 'TCKN', name: 'Test Hasta',
    firstName: 'Test', familyName: 'Kişi', address: 'A', district: 'D', city: 'İ' },
  lines: [{
    name: 'Telefon', quantity: 1, price: 5000, unitCode: 'Adet', kdvPercent: 20,
    additionalItemIdentifications: [{ schemeId: 'TELEFON', value: 'IMEI123456789012345' }],
  }],
};
```

**Alt-case 07b — kural ihlali (VKN müşteri):**
```typescript
customer: { taxNumber: '9876543210', /* VKN, TCKN değil */ name: 'X' },
```

### 2. Expected (olması gereken davranış)

**07a:** Success:true, valid XML üretilmeli (tüm B-NEW-12 / Sprint 8c.7 TEKNOLOJIDESTEK kuralları sağlandı: customer.TCKN + line TELEFON/TABLET_PC kimliği).

**07b:** Success:false, `[TYPE_REQUIREMENT] customer.taxIdType: TEKNOLOJIDESTEK faturasında alıcı TCKN olmalıdır`.

### 3. Actual (şu an ne oluyor)

**07a:**
- **Success:** **true** ✅
- **Output.xml uzunluğu:** 4670 byte (tam fatura üretildi)
- Kütüphane EARSIVFATURA × TEKNOLOJIDESTEK kombinasyonunu **destekliyor**.

**07b:**
- **Success:** false ✅
- **Errors[0]:** `[TYPE_REQUIREMENT] customer.taxIdType: [TEKNOLOJIDESTEK] TEKNOLOJIDESTEK faturasında alıcı TCKN olmalıdır`
- ✅ Validator B-NEW-12 kuralı çalışıyor.

### 4. Root Cause (kod incelemesi)

- **Kod lokasyonu:** `src/config/constants.ts:51-58` `PROFILE_TYPE_MATRIX[EARSIVFATURA]` set'inde `TEKNOLOJIDESTEK` listede ✅. `src/validators/type-validators.ts:233-254` `validateTeknolojiDestek` fonksiyonu var.
- **Neden coverage gap:** Sadece **examples-matrix/_lib/specs.ts**'te bu kombinasyon için baseline senaryosu yok. 8e'de "TEKNOLOJIDESTEK customer.TCKN + TELEFON şartı" karmaşık olduğu için atlanmış. 8f kapsam ayarı §11'de de erteli.
- **Feature gap değil:** Kütüphane bu kombinasyonu tam destekliyor. Sadece **example eksikliği**.

### 5. Fix Sketch

- **Yaklaşım:** `examples-matrix/_lib/specs.ts`'a EARSIVFATURA × TEKNOLOJIDESTEK baseline + bir varyant ekle (yukarıdaki 07a şablonuyla). Coverage gap report otomatik %100 olur.
- **Dosya:** `examples-matrix/_lib/specs.ts` (sadece spec ekleme — `src/` dokunulmuyor)
- **Breaking change mi:** Hayır
- **v2.0.1 patch etkisi:** Added (yeni example senaryo)
- **Tahmini test sayısı:** 2 (snapshot + json-parity)
- **Fix süresi tahmini:** <30dk

### 6. Mimsoft Ölçek Soruları (Berkay için)

1. Mimsoft TEKNOLOJIDESTEK faturasını hangi profilde kesiyor? TEMELFATURA mı, EARSIVFATURA mı?
2. Bu kombinasyon gerçek üretimde ne kadar yaygın? (TEKNOLOJIDESTEK kategorisi: telefon vergisi indirimi yapılan B2C satışlar)
3. Mimsoft için bu örneğin eklenmesi pratik bir referans olur mu?

### 7. Karar (Berkay dolduracak, boş bırak)

- [ ] Kritik — v2.0.1 hemen hotfix
- [ ] Orta — Sprint 8g'de düzenli hotfix
- [ ] Düşük — Post-v2.0.1 / v2.1.0'a ertelenebilir
- [ ] Tartışılacak
- [x] **False positive (feature gap değil)** — Sadece example eksikliği, Sprint 8g.X'te 1 senaryo ekleme yeterli

**Berkay notları:** (boş)

**Sprint 8g Sonuç:** Sprint 8g.4'te baseline eklendi — `examples-matrix/_lib/specs.ts` EARSIVFATURA + TEKNOLOJIDESTEK senaryosu. PROFILE_TYPE_MATRIX coverage 67/68 (%98.5) → 68/68 (%100).

---

## Önceliklendirme Matrisi (Öneri)

| ID | Başlık | Mimsoft etki | Kütüphane etki | Öncelik önerisi |
|----|--------|---|---|---|
| B-NEW-v2-01 | kdvPercent whitelist eksik | Bilinmiyor | Range check var, whitelist yok | **Orta** |
| B-NEW-v2-02 | TR IBAN checksum doğrulamıyor | Bilinmiyor | Format regex var, mod-97 yok | **Düşük-Orta** |
| B-NEW-v2-03 | 4171 yasak tip (false positive) | Yok | Doğru çalışıyor | **False positive** |
| B-NEW-v2-04 | Withholding raw Error (UblBuildError yerine) | Bilinmiyor | Hata fırlıyor ama yanlış class | **Orta** |
| B-NEW-v2-05 | IADE documentTypeCode mapper bypass | Bilinmiyor | B-31 implementasyon eksik | **Orta** |
| B-NEW-v2-06 | OZELMATRAH satır seviyesi kod ignore | Yok | TS-safe, raw JSON istismarı | **False positive (düşük ihtimal)** |
| B-NEW-v2-07 | EARSIVFATURA × TEKNOLOJIDESTEK example | Yok | Sadece example eksikliği | **False positive (gap değil)** |

---

## Kategori Dağılımı

### A: Kütüphane silent accept — gerçek bug (Kritik)
_(Yok — silent accept'lerin çoğu B veya D kategorisinde)_

### B: Kütüphane range/regex check yapıyor ama whitelist/full validation yok (Orta)
- **B-NEW-v2-01** — kdvPercent whitelist (0/1/10/20)
- **B-NEW-v2-02** — IBAN mod-97 checksum
- **B-NEW-v2-04** — Withholding raw Error → ValidationError (AR-1 mimari karar tutarlılığı)
- **B-NEW-v2-05** — B-31 IADE documentTypeCode simple API mapper bypass

### C: Feature gap / kombinasyon kapsamı eksik (Düşük)
_(Yok — B-NEW-v2-07 başlangıçta C zannediliyordu, ama gerçekte D kategorisinde)_

### D: Aslında doğru davranış / sadece example eksikliği (False positive)
- **B-NEW-v2-03** — 4171 cross-check zaten çalışıyor; spec yanlış API kullanmıştı
- **B-NEW-v2-06** — TS tip ile satır-level field zaten erişilebilir değil
- **B-NEW-v2-07** — Kütüphane destekliyor; sadece examples-matrix'te baseline yok

---

## Mimsoft Üretim Etkisi Tahmini Dağılımı

| Tahmini etki | Adet | Bug ID'leri |
|---|---:|---|
| **Yok** | 3 | B-NEW-v2-03, 06, 07 |
| **Bilinmiyor — manuel test gerekli** | 4 | B-NEW-v2-01, 02, 04, 05 |
| **Var** | 0 | _(yok — Berkay manuel test sonucuna göre değişebilir)_ |

---

## Çalıştıramadığım / Belirsiz Kalan Case'ler

| Case | Belirsizlik |
|---|---|
| B-NEW-v2-02 | TR IBAN mod-97 checksum hesabını kütüphanenin **bilerek** atladı mı yoksa unutulan feature mi? AR-1..AR-9 mimari kararlarda IBAN deepvalidate kararı bulamadım. |
| B-NEW-v2-04 | `simple-invoice-mapper.ts` veya `line-calculator.ts` içinde tam olarak hangi satırda `throw new Error()` çağrılıyor — file:line vermedim (incelemek mapper code path takibi gerektirir, audit kapsamı dışı). |
| B-NEW-v2-05 | `simple-invoice-mapper.ts`'da `billingReference.documentTypeCode` mapping'i kasıtlı olarak default `'IADE'` mu atıyor (silent fix), yoksa hiç taşımıyor mu? Mapper kod incelemesi gerekli. |

---

## Gerçek Bug Sayısı vs False Positive

| Sınıflandırma | Adet | % |
|---|---:|---:|
| **Gerçek bug (Sprint 8g hotfix önerilir)** | **4** | %57 |
| False positive (kütüphane doğru davranıyor) | 3 | %43 |

**Gerçek bug listesi (öncelik sırası önerilen):**
1. B-NEW-v2-04 — Withholding raw Error (AR-1 mimari karar tutarlılığı, error handling pattern kırık)
2. B-NEW-v2-05 — B-31 IADE documentTypeCode mapper bypass (Schematron paralel kuralı bypass)
3. B-NEW-v2-01 — kdvPercent whitelist (Türkiye için pratik defansif kontrol)
4. B-NEW-v2-02 — IBAN mod-97 checksum (gerçek IBAN doğrulama, KAMU kritik)

---

## Sprint 8g Commit Stratejisi Önerisi

**Fix grup yapısı (4 atomik commit):**

```
8g.0 — Plan kopya + log iskelet (deseni 8e/8f)
8g.1 — B-NEW-v2-04 fix: Withholding hata raporlama UblBuildError'a normalize
       + simple-line-range-validator.ts genişlemesi (3 yeni kontrol)
       + 4 unit test
       + 8f.11'de silinen withholding-oran-yanlis spec'i reaktive et
8g.2 — B-NEW-v2-05 fix: B-31 simple-invoice-mapper documentTypeCode aktarımı
       (yeni simple-billing-reference-validator.ts)
       + 4 unit test
       + 8f.11'de silinen iade-doctype spec'i reaktive et
8g.3 — B-NEW-v2-01 fix: KDV_VALID_RATES whitelist
       + tax-config.ts genişlemesi
       + 4 unit test (whitelist içi/dışı)
       + 8f.11'de silinen kdv-30-gecersiz spec'i reaktive et
8g.4 — B-NEW-v2-02 fix: IBAN mod-97 checksum
       + yeni src/utils/iban-checksum.ts
       + KAMU validator entegrasyonu
       + 4 unit test
       + 8f.11'de silinen iban-yanlis spec'i reaktive et
8g.5 — False positive temizliği:
       - B-NEW-v2-03: 4171 invalid spec yeniden eklendi (doğru API ile)
       - B-NEW-v2-07: EARSIVFATURA × TEKNOLOJIDESTEK baseline ekle
       (B-NEW-v2-06 — TS tip ile zaten engelli, action gerekmez)
8g.6 — B-NEW-v2-04..05 multi-error reaktivasyonu (8f.12'de silinen 7 senaryo)
8g.7 — Full regression + CHANGELOG 8g + log kapanış + v2.0.1 publish checklist
```

**Test delta tahmini:** 1176 → ~1216 yeşil (+40):
- Bug fix unit test'leri: +16 (4 fix × 4 test)
- Reaktive edilen invalid senaryolar: +5
- 8f.12 multi-error reaktivasyon: +7
- EARSIVFATURA × TEKNOLOJIDESTEK baseline: +2 (snapshot + json-parity)
- Genel regression delta: +10 (range)

**Süre tahmini:** ~6-8 saat (1 yarım gün), büyük ölçüde:
- Bug fix'ler: 4 × ~30dk-2saat = 4-6 saat
- Reaktivasyon + test düzenleme: ~1-2 saat
- Regression + doküman: ~1 saat

**Sprint 8g v2.0.1 patch publish hazır olduğunda:** Berkay manuel publish (Sprint 8c plan'ına uygun, Claude publish komutu çalıştırmaz).

---

## Disiplin Notu

Bu audit dump:
- **`src/`'a dokunmadı.** Sadece `audit/_b-new-v2-runner.ts` ve `audit/_b-new-v2-runner-2.ts` geçici dosyalar üretildi (audit sonrası silinecek).
- **Tüm "Actual" bölümleri gerçek runtime çalıştırmasından** (`SimpleInvoiceBuilder.build()` ile). Tahmin yok.
- **Mimsoft etki tahminleri "Bilinmiyor" olarak işaretlendi** — Berkay manuel doğrulayacak.
- **Önceliklendirme öneri'dir, karar Berkay'a aittir.**
- **False positive'ler şeffaf işaretlendi:** B-NEW-v2-03/06/07 = 3 senaryo gerçek bug değil, kütüphane doğru davranıyor.
