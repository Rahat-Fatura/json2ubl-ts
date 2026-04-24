# Sprint 8d — Phantom KDV (Vazgeçilen KDV) / M12

**Tarih:** 2026-04-24
**Kaynak kılavuz:** GİB "Yatırım Teşvik Kapsamında Yapılan Teslimlere İlişkin Fatura Teknik Kılavuzu v1.1" (Aralık 2025)
**PDF referansı:** `skills/gib-teknik-dokuman/references/senaryo-yatirim-tesvik-v1.1.md`
**Kapsam:** YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA için "Vazgeçilen KDV Tutarı" davranışı. Yalnız kod + validator + serializer + unit test. Senaryo (example) üretimi kapsam dışı.

---

## 1. Context — Neden bu sprint?

Sprint 8c tamamlandı (`2afd1a3`, 800/800 yeşil, `package.json=2.0.0`). v2.0.0 yayın için hazır **fakat publish edilmedi**; Aralık 2025'te GİB v1.1 kılavuzu yayımladığı için publish öncesi v2.0.0'a dahil ediliyor.

**İhtiyaç:** YATIRIMTESVIK/ISTISNA ve EARSIVFATURA/YTBISTISNA kombinasyonlarında UBL-TR XML, "vazgeçilen KDV" tutarını bilgi amaçlı TaxSubtotal altında taşır ama bu tutar fatura parasal toplamlarına (LegalMonetaryTotal) ve parent TaxTotal/TaxAmount'a dahil edilmez. Bu mekanizma kütüphanede eksik — calculator tüm KDV'yi topluyor, mapper tüm KDV'yi dip toplamlara iletiyor, satır-level `CalculationSequenceNumeric=-1` hiç set edilmiyor (validator B-67 kontrolü var ama karşılığında üretici kod yok → bu kombinasyon şu an validasyon bile geçemez).

**Çıktı:** 9-10 atomik alt-commit + ~830 test (800 → +30). v2.0.0 publish öncesi merge.

---

## 2. Mevcut Durum Haritası (Sprint 8c sonrası)

### ✅ Zaten hazır altyapı

| Bileşen | Konum | Durum |
|---------|-------|-------|
| `TaxSubtotalInput.calculationSequenceNumeric?: number` | `src/types/common.ts:93` | **Tip alanı mevcut** |
| XSD sequence (TaxableAmount → TaxAmount → CalculationSequenceNumeric → Percent → TaxCategory) | `src/serializers/xsd-sequence.ts:170` (`TAX_SUBTOTAL_SEQ`) | **Sıra doğru** |
| `serializeTaxSubtotal` CalculationSequenceNumeric emit | `src/serializers/tax-serializer.ts:39-42` | **Opsiyonel tag yazılabiliyor** |
| B-67 validator — ISTISNA satırında CalcSeqNum=-1 zorunluluğu | `src/validators/profile-validators.ts:278-286` | **Var; ama üretici kod yok → şu an her YTB ISTISNA input'u fail eder** |
| `isYatirimTesvikScope` helper | `src/validators/yatirim-tesvik-validator.ts:49-59` | **YATIRIMTESVIK / EARSIV+YTB\* tespiti yapılı** |
| Cross-check matrix — 308/339 `ISTISNA_GROUP_ALLOWED_TYPES` | `src/validators/cross-check-matrix.ts:63-66` | **YTBISTISNA/YATIRIMTESVIK+ISTISNA için izinli** |
| M11 self-exemption (ISTISNA/YTBISTISNA) | `src/validators/manual-exemption-validator.ts` | **Değişmeyecek; ortogonal** |

### ❌ Eksik olanlar

| Bileşen | Konum | Eksik olan |
|---------|-------|-----------|
| `CalculatedTaxSubtotal` | `src/calculator/line-calculator.ts:15-22` | `calculationSequenceNumeric?: number` alanı yok |
| `CalculatedLine` | `src/calculator/line-calculator.ts:50-65` | Phantom flag yok (satır bazlı) |
| Satır tipi tespiti | `src/calculator/line-calculator.ts:199-207` | `kdvPercent>0` olsa bile YATIRIMTESVIK+ISTISNA faturada satır "SATIS" çıkıyor — bu yanlış, phantom olmalı |
| Belge hesabı `taxInclusiveAmount` / `payableAmount` / `taxTotal` | `src/calculator/document-calculator.ts:113-119` | Her satırın `taxInclusiveForMonetary`'sini koşulsuz topluyor → phantom dışlama yok |
| `buildTaxTotals` | `src/calculator/simple-invoice-mapper.ts:211-237` | Belge-level TaxTotal/TaxAmount'a phantom KDV karışıyor |
| `buildMonetaryTotal` | `src/calculator/simple-invoice-mapper.ts:293-301` | taxInclusiveAmount & payableAmount'a phantom karışıyor |
| Satır TaxSubtotal mapping | `src/calculator/simple-invoice-mapper.ts:315-357` | `calculationSequenceNumeric` hiç set edilmiyor |
| Phantom-kombinasyon kilit kuralı | — | `kdvPercent===0` yasağı ve istisna kodu (308/339) zorunluluğu yok |

---

## 3. Kritik Tasarım Kararları

### 3.1 XML gösterim varyantı — KARAR: Her yerde §2.1.4 stili

**Seçilen:** Hem satır-level (InvoiceLine/TaxTotal) hem belge-level (Invoice/TaxTotal) için §2.1.4 stili üretilir: `TaxAmount=300`, `Percent=20`, `CalculationSequenceNumeric=-1`, exemption code dolu. Tek kod yolu, tek XML şablonu.

```xml
<cac:TaxSubtotal>
  <cbc:TaxableAmount currencyID="TRY">1500.00</cbc:TaxableAmount>
  <cbc:TaxAmount currencyID="TRY">300.00</cbc:TaxAmount>
  <cbc:CalculationSequenceNumeric>-1</cbc:CalculationSequenceNumeric>
  <cbc:Percent>20</cbc:Percent>
  <cac:TaxCategory>
    <cbc:TaxExemptionReasonCode>308</cbc:TaxExemptionReasonCode>
    <cbc:TaxExemptionReason>13/d Teşvikli Yatırım Mallarının Teslimi</cbc:TaxExemptionReason>
    <cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme>
  </cac:TaxCategory>
</cac:TaxSubtotal>
```

**Parent TaxTotal/TaxAmount (dış):** Her iki seviyede `0` — phantom KDV parasal toplamlara girmez.

**PDF §2.1.5 farkına dair not:** PDF §2.1.5 satır-level TaxSubtotal'da `TaxAmount=0`/`Percent=0` gösteriyor. Bu plan §2.1.4 stilini birleşik şablon olarak uygular — PDF'in iki örnek arasında açık gerekçe vermemesi (kılavuz TODO'su satır 259) ve §2.1.4'ün "Vazgeçilen KDV Tutarı" semantik bütünlüğünü daha net ifade etmesi nedeniyle. B-67 Schematron'u CalcSeqNum=-1'i zaten tanıdığı için §2.1.4 stilinin de geçerli olduğu kabul edilir.

### 3.2 Phantom gösterim — Flag mi, türetme mi?

**Seçilen yaklaşım: Eksplisit flag.**

- `CalculatedTaxSubtotal` tipine `calculationSequenceNumeric?: number` alanı ekle (XSD terimini taşıyor, UBL-TR PDF §2.1.4 birebir)
- `CalculatedLine` tipine `phantomKdv: boolean` alanı ekle — calculator'ın aldığı karar, downstream (mapper) bunu okur
- Document calculator phantom satırları `taxInclusiveAmount`/`payableAmount`/`taxTotal`'a eklemez
- Mapper phantom satırların KDV tutarını belge-level `TaxTotal/TaxAmount`'tan düşer

**Neden:** Sadece `calculationSequenceNumeric === -1`'e dayalı türetme, semantic anlam ile XSD element adını karıştırır. Gelecekte CalcSeqNum'un başka değerleri de semantik kazanabilir (UBL spec'te -1 tek değil). Flag daha temiz.

### 3.3 Phantom kombinasyon tespit kuralı

Tek yerde (`src/calculator/phantom-kdv-rules.ts` — yeni helper) tanımlanacak:

```ts
export function isPhantomKdvCombination(profile: string, type: string): boolean {
  if (profile === 'YATIRIMTESVIK' && type === 'ISTISNA') return true;
  if (profile === 'EARSIVFATURA' && type === 'YTBISTISNA') return true;
  return false;
}
```

**Gerekçe:** Aynı kombinasyonu 4-5 yerde inline kontrol etmek disiplinsiz olur (calculator, mapper, validator). Tek helper, M12 kararının tek referansı.

### 3.4 Satır tipi tespiti (ISTISNA vs SATIS)

`line-calculator.ts:199-207` şu an `kdvPercent===0 || kdvSubtotal.amount===0` → ISTISNA diyor. YATIRIMTESVIK+ISTISNA'da `kdvPercent=20` verileceği için satır tipi SATIS çıkacak. **Bu, satır tipi tespit mantığı için değil — belge tipi override mantığı için konu.**

- Kullanıcı `input.type = 'ISTISNA'` verecek → `resolveInvoiceType` (document-calculator.ts:220-225) override'a saygı duyuyor, belge tipi doğru çıkıyor.
- Satır tipi `'SATIS'` kalıyor → bu sorun değil; satır tipi phantom kararından bağımsız çalışacak.
- **Alternatif:** `CalculatedLine.type`'e `'PHANTOM_ISTISNA'` eklemek. Karmaşıklık katar, gerekçesi zayıf — seçilmedi.

### 3.5 M11 ile ilişki

M11 self-exemption listesinde YATIRIMTESVIK ve (YTB\* tipleriyle) EARSIVFATURA zaten var. M11 şunu diyor: "Bu profil+tipte kütüphane manuel 351 zorunluluğu uygulamaz." Phantom kuralı bunu bozmaz — M11 alt kural olarak çalışmaya devam eder, **M12 ortogonal yeni bir kural**: "Bu 2 kombinasyonda satır KDV matematiğini XML'de taşı ama dip toplamlara dahil etme, CalcSeqNum=-1 otomatik işaretle."

### 3.6 İstisna kodu whitelist

PDF §4 net: `ItemClassificationCode=01` (Makine/Teçhizat) → **308**, `ItemClassificationCode=02` (İnşaat) → **339**. PDF, Arsa/Arazi (03) ve Diğer (04) için ISTISNA tipi yasak ("0 KDV'li düzenleme yasak"). Mevcut `profile-validators.ts:290-310` bu eşlemeyi zaten yapıyor. Sprint 8d **yeni whitelist icat etmez**; var olan kuralları **phantom üretim tetikleyicisi** olarak kullanır.

---

## 4. Kod Değişiklik Haritası

### 4.1 Tip genişlemeleri

**`src/calculator/line-calculator.ts:15-22`** — `CalculatedTaxSubtotal`:
```ts
export interface CalculatedTaxSubtotal {
  code: string;
  name: string;
  percent: number;
  taxable: number;
  amount: number;
  taxForCalculate: number;
  calculationSequenceNumeric?: number;  // YENİ — phantom için -1
}
```

**`src/calculator/line-calculator.ts:50-65`** — `CalculatedLine`:
```ts
export interface CalculatedLine {
  // ... mevcut alanlar ...
  phantomKdv: boolean;  // YENİ — true → taxInclusive/payable/taxTotal dip'e girmez
}
```

### 4.2 Yeni helper

**`src/calculator/phantom-kdv-rules.ts`** (yeni dosya, ~30 satır):
- `isPhantomKdvCombination(profile, type)`
- `PHANTOM_KDV_CODES = new Set(['308', '339'])` — phantom'u zorlayan istisna kodları (referans)
- Dokümantasyon M12 referansı

### 4.3 Calculator değişiklikleri

**`src/calculator/document-calculator.ts:91-212`:**
- Önce tip/profil resolve et (resolveInvoiceType + resolveProfile) **sonra** satır toplamasını yap (şu an tersine: önce toplayıp sonra tip) — bu sıralama değişimi kritik, phantom kararı satır toplamasından önce bilinmeli
- Alternatif: satır toplamayı iki geçişli yap (ilk geçiş: tip tespit için typesArray + input override; ikinci geçiş: phantom bilgisi ile dip toplama)
- **Tercih:** Satır hesabını olduğu gibi bırak, `CalculatedLine.phantomKdv`'yi sonradan set et (resolveInvoiceType sonuç döndükten sonra). `calculatedLines.forEach(l => l.phantomKdv = ...)` ve ardından monetary re-compute.
- Daha temiz yaklaşım: `calculateDocument`'ta iki adımlı flow:
  1. Satırlar hesapla + `typesArray` oluştur
  2. `resolveInvoiceType`/`resolveProfile` çağır
  3. `isPhantomKdvCombination` kontrolü → tüm satırları `phantomKdv=true` olarak işaretle, KDV subtotal'larına `calculationSequenceNumeric=-1` set
  4. Monetary topla (phantom satırları ayrı muamele)
  5. Belge-level taxSubtotals topla (phantom satırların kdv subtotal'ları CalcSeqNum=-1 ile korunur, ama dış taxTotal'a katkısı 0)

### 4.4 Line calculator

**`src/calculator/line-calculator.ts:calculateLine`:**
- Satır hesabında doğrudan phantom logic **yok** — satır kendi başına phantom olduğunu bilemez (belge tipi tespit edildikten sonra belirlenir)
- Sadece `phantomKdv: false` default return'de; document-calculator üstünden mutate edilir
- **Alternatif:** `calculateLine`'a ikinci parametre olarak `isPhantomLine: boolean` ekle. Daha açık ama çağrı sitesini karmaşıklaştırır.
- **Tercih:** Document calculator'da post-mark — line calculator saf kalır.

### 4.5 Mapper değişiklikleri

**`src/calculator/simple-invoice-mapper.ts:211-237` — `buildTaxTotals`:**
- Phantom durumunda dış `TaxTotalInput.taxAmount = 0` (parent TaxAmount)
- TaxSubtotal[] listesi phantom değerleriyle korunur: `taxableAmount`, `taxAmount` (gerçek 300), `percent` (20), `calculationSequenceNumeric=-1`, exemption code
- Non-phantom kombinasyonlarda mevcut davranış değişmez

**`src/calculator/simple-invoice-mapper.ts:293-301` — `buildMonetaryTotal`:**
- Doğrudan `calc.monetary`'yi kullanıyor; `CalculatedDocument.monetary` phantom-aware olacak (§4.3 sonrası)
- Phantom satırların `taxInclusiveForMonetary`'si document-calculator'da zaten dışlandığı için buraya değişiklik gerekmiyor

**`src/calculator/simple-invoice-mapper.ts:315-357` — Satır TaxSubtotal:**
- `subtotal.calculationSequenceNumeric = ts.calculationSequenceNumeric` (phantom satırda `-1`, diğerlerinde undefined)
- Satır-level phantom TaxSubtotal §2.1.4 stili: `TaxAmount=300` (gerçek), `Percent=20` (gerçek), CalcSeqNum=-1, exemption code dolu
- `shouldAddExemption` logic phantom için bypass'lanabilir — `calc.taxExemptionReason.kdv` belge-level kodu, phantom'da satır-level kod ayrıca dikkate alınmalı

### 4.6 Validator değişiklikleri

**`src/validators/phantom-kdv-validator.ts` (yeni dosya, ~80-100 satır):**
- `YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT`: phantom kombinasyonda her satırda `kdvPercent > 0 && kdvPercent <= 100` zorunlu
- `YTB_ISTISNA_REQUIRES_EXEMPTION_CODE`: her satırda `kdvExemptionCode` dolu + 308 veya 339 (ItemClassificationCode ile uyumlu) zorunlu
- Mevcut `profile-validators.ts:278-286` B-67 kontrolü zaten CalcSeqNum=-1 için var → duplicate eklemeyiz

**`src/calculator/simple-invoice-builder.ts`:** phantom-kdv-validator'ı pipeline'a ekle (mevcut validator chain'e ekleme pattern'i var)

### 4.7 Değişmeyenler

- XSD sequence (doğru konumda)
- Serializer `tax-serializer.ts` (opsiyonel tag emit mevcut)
- M11 self-exemption validator
- Mevcut YATIRIMTESVIK+SATIS senaryoları (12, 13, 14) — SATIS/IADE tipi phantom tetiklemez

---

## 5. Alt-Sprint Granülaritesi (Commit Planı)

Sprint 8c 14 alt-commit idi; 8d altyapının çoğu zaten bulunduğu için daha kısa. Öneri 9 commit:

| # | Başlık | Dosyalar | Test etkisi |
|---|--------|----------|-------------|
| 8d.0 | Plan kopyası (`audit/sprint-08d-plan.md`) + implementation log iskelet + FIX-PLANI-v3.md M12 marker + README §8 M12 başlık | audit/, FIX-PLANI-v3.md, README.md | 0 (doc) |
| 8d.1 | Yeni helper: `phantom-kdv-rules.ts` + tip genişletme (`CalculatedTaxSubtotal.calculationSequenceNumeric`, `CalculatedLine.phantomKdv`) | src/calculator/phantom-kdv-rules.ts (yeni), src/calculator/line-calculator.ts | +3-5 helper unit test |
| 8d.2 | Document calculator phantom post-marking + monetary dışlama | src/calculator/document-calculator.ts | +8-10 test |
| 8d.3 | Mapper satır-level — `calculationSequenceNumeric` propagate + satır TaxSubtotal §2.1.4 stili (TaxAmount=300, Percent=20, exemption code, CalcSeqNum=-1) | src/calculator/simple-invoice-mapper.ts (buildLines kısmı) | +6-8 test |
| 8d.4 | Mapper belge-level — parent `TaxTotal/TaxAmount=0`, iç TaxSubtotal §2.1.4 stili phantom değerlerle | src/calculator/simple-invoice-mapper.ts (buildTaxTotals) | +4-6 test |
| 8d.5 | Yeni validator: `phantom-kdv-validator.ts` (kdvPercent>0 + exemption code zorunluluğu) + pipeline entegrasyonu | src/validators/phantom-kdv-validator.ts (yeni), src/calculator/simple-invoice-builder.ts | +8-10 test |
| 8d.6 | Entegrasyon testi — full pipeline snapshot (SimpleInvoiceInput → XML) YATIRIMTESVIK+ISTISNA ve EARSIV+YTBISTISNA | __tests__/integration/phantom-kdv.test.ts (yeni) | +4 integration |
| 8d.7 | Regression — mevcut 12/13/14 YATIRIMTESVIK+SATIS/IADE senaryoları değişmedi (snapshot diff 0) | __tests__/calculator/ | 0 yeni (var olanlar yeşil kalır) |
| 8d.8 | CHANGELOG v2.0.0 Sprint 8d alt-section + README §8 M12 detay + FIX-PLANI-v3.md M12 tamamlama + implementation log finalize | docs | 0 |

**Açıklamalar:**
- 8d.3 ve 8d.4 ayrı — aynı §2.1.4 stili üretilecek olsa da kod yolları farklı (buildLines satır TaxSubtotal vs buildTaxTotals belge-level TaxTotal). Tek commit'te iki farklı mapper fonksiyonunu değiştirmek regressiona açık.
- 8d.7 saf `git log`/`jest` doğrulama commit'i — kod değişikliği yok, var olan snapshot'lar değişmemeli. Ayrı kalması log disiplini için.
- v2.0.0 publish package.json zaten 2.0.0 olduğu için ek commit gerekmez (8d dallarında doğrulama 8d.8'de).

---

## 6. Test Stratejisi

### 6.1 Unit test hedefleri

| Test dosyası | Yeni test adedi | Kapsam |
|--------------|-----------------|--------|
| `__tests__/calculator/phantom-kdv-rules.test.ts` (yeni) | 4-5 | Helper `isPhantomKdvCombination` tüm kombinasyonlar |
| `__tests__/calculator/document-calculator-phantom.test.ts` (yeni) | 8-10 | Phantom satır monetary'ye dahil edilmiyor; belge-level taxTotal=0 |
| `__tests__/calculator/simple-invoice-mapper-phantom.test.ts` (yeni) | 10-12 | Mapper §2.1.4 ve §2.1.5 varyant XML üretimi |
| `__tests__/validators/phantom-kdv-validator.test.ts` (yeni) | 8-10 | kdvPercent=0 yasağı; exemption code zorunluluğu; 308/339 ItemClassificationCode eşlemesi |
| `__tests__/integration/phantom-kdv.test.ts` (yeni) | 4 | Full pipeline input → XML; snapshot |
| Regression | 0 | Mevcut 12/13/14 snapshot değişmemeli |

**Toplam yeni test:** ~34-41

**Hedef:** 800 → 830-840

### 6.2 Fixture (Hem auto hem manuel — S4 kararı)

**Manuel XML fragmanı:**
- `__tests__/fixtures/phantom-kdv/taxsubtotal-phantom-308.xml` — §2.1.4 stili + 308 (Makine/01)
- `__tests__/fixtures/phantom-kdv/taxsubtotal-phantom-339.xml` — §2.1.4 stili + 339 (İnşaat/02)
- `__tests__/fixtures/phantom-kdv/taxtotal-document-phantom.xml` — belge-level (parent TaxAmount=0 + phantom TaxSubtotal)

**Auto Jest snapshot:**
- `__tests__/integration/__snapshots__/phantom-kdv/` — tam pipeline XML çıktısı

**Neden ikisi de:** Auto snapshot regression güvencesi (herhangi bir output değişikliği tespit); manuel fixture GİB kılavuzuyla birebir eşleşme kontrolü (fragman string comparison).

**SimpleInvoiceInput test inputları** inline (küçük, tek satırlı YATIRIMTESVIK+ISTISNA + EARSIV+YTBISTISNA).

### 6.3 Entegrasyon testi

YATIRIMTESVIK+ISTISNA, tek satır, ItemClassificationCode=01, kdvPercent=20, exemption=308:
- Input → calculateDocument → mapSimpleToInvoiceInput → InvoiceBuilder.build()
- Çıktı XML'de:
  - `LegalMonetaryTotal/LineExtensionAmount = PayableAmount = TaxInclusiveAmount = 1500`
  - Belge-level `Invoice/TaxTotal/TaxAmount = 0` (dış parent)
  - Belge-level `TaxSubtotal`: TaxableAmount=1500, **TaxAmount=300, Percent=20** (§2.1.4 stili), CalcSeqNum=-1, TaxExemptionReasonCode=308
  - Satır-level `InvoiceLine/TaxTotal/TaxAmount = 0` (dış parent)
  - Satır-level `TaxSubtotal`: aynı §2.1.4 stili değerleri

EARSIV+YTBISTISNA için benzer, ItemClassificationCode=02 → exemption=339 varyantı ayrı integration test.

---

## 7. Edge Case Matrisi

| Profil | Tip | ItemCls | kdvPercent | Beklenen | Mevcut |
|--------|-----|---------|------------|----------|--------|
| YATIRIMTESVIK | SATIS | 01 | 20 | Normal — phantom yok (senaryo 12) | ✅ Değişmeyecek |
| YATIRIMTESVIK | IADE | - | 20 | Normal — phantom yok (senaryo 14) | ✅ Değişmeyecek |
| YATIRIMTESVIK | **ISTISNA** | 01 | **20** | **Phantom: TaxSubtotal var, dip 0** | ❌ Yeni kural |
| YATIRIMTESVIK | ISTISNA | 02 | 18 | Phantom, kod=339 | ❌ Yeni kural |
| YATIRIMTESVIK | ISTISNA | 03 | 20 | **Validation error — 03 ISTISNA yasak (PDF §4)** | ❌ Yeni kural |
| YATIRIMTESVIK | ISTISNA | 04 | 20 | Validation error — 04 ISTISNA yasak | ❌ Yeni kural |
| YATIRIMTESVIK | ISTISNA | 01 | **0** | **Validation error — YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT** | ❌ Yeni kural |
| YATIRIMTESVIK | ISTISNA | 01 | 20 + **kod yok** | Validation error — exemption code zorunlu | ❌ Yeni kural |
| EARSIVFATURA | YTBSATIS | 01 | 20 | Normal — phantom yok | ✅ Değişmeyecek |
| EARSIVFATURA | YTBIADE | - | 20 | Normal — phantom yok | ✅ Değişmeyecek |
| EARSIVFATURA | **YTBISTISNA** | 01 | **20** | **Phantom** | ❌ Yeni kural |
| EARSIVFATURA | YTBTEVKIFAT | - | 20 | Normal tevkifat — phantom yok | ✅ Değişmeyecek |
| TEMELFATURA/TICARIFATURA | ISTISNA | - | 0 | Mevcut ISTISNA davranışı (kdv=0 normal istisna) | ✅ Değişmeyecek |

**Kritik doğrulama:** "phantom kural sadece 2 kombinasyonda devreye girer" → regression testi (senaryo 12/13/14 + diğer ISTISNA senaryoları snapshot 0 diff).

---

## 8. M11 ile İlişki — Mimari Tutarlılık

**M11:** "ISTISNA/YTBISTISNA/IHRACKAYITLI/OZELMATRAH tipleri ve YATIRIMTESVIK/YOLCUBERABERFATURA/OZELFATURA/IHRACAT profilleri **self-exemption** — manuel 351 kodu zorunluluğu uygulanmaz."

**M12 (yeni):** "YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA'da KDV tutarı 'vazgeçilen' olarak TaxSubtotal'da taşınır ama parasal toplamlara dahil edilmez; CalcSeqNum=-1 otomatik işaretlenir."

**İlişki:** M11 "kütüphane hangi ISTISNA kodunu manuel isteyecek" sorusunun cevabı; M12 "ISTISNA kodu varsa XML nasıl yazılacak + parasal toplama nasıl yansıyacak" sorusunun cevabı. Ortogonal. M11'in YATIRIMTESVIK için self-exemption olduğu gerçeği değişmez; M12 onun üstüne "ama dip toplamlara dahil etme + CalcSeqNum=-1" kuralını ekler.

**FIX-PLANI-v3.md güncellemesi (M12 kaydı, ~30 satır):**
```
### M12 Phantom KDV (Vazgeçilen KDV Tutarı) — Sprint 8d

- **Kapsam:** YATIRIMTESVIK+ISTISNA, EARSIVFATURA+YTBISTISNA
- **Kaynak:** GİB YATIRIMTESVIK Fatura Teknik Kılavuzu v1.1, §2.1.4 + §2.1.5
- **Davranış:** Satır KDV matematiği (kdvPercent × lineExtension) hesaplanır, TaxSubtotal
  XML'de taşınır; fakat LegalMonetaryTotal ve parent TaxTotal/TaxAmount'a dahil edilmez.
  CalculationSequenceNumeric=-1 otomatik. Satır XML varyantı §2.1.5 (Percent=0/TaxAmount=0),
  belge XML varyantı §2.1.4 (Percent=20/TaxAmount=300) — {@TODO §9 S1 sonrası netleşir}
- **Giriş zorunluluğu:** Her satırda 0 < kdvPercent ≤ 100; kdvPercent=0 validation error.
  Her satırda exemption code (308 Makine/01 veya 339 İnşaat/02). 03/04 kategorilerinde ISTISNA yasak.
- **Dosyalar:** src/calculator/phantom-kdv-rules.ts (yeni), src/calculator/document-calculator.ts,
  src/calculator/simple-invoice-mapper.ts, src/validators/phantom-kdv-validator.ts (yeni),
  src/calculator/line-calculator.ts (tip)
- **M11 ile ilişki:** Ortogonal. M11 "manuel 351 muafiyeti", M12 "vazgeçilen KDV gösterim kuralı".
```

---

## 9. Karar Kayıtları (AskUserQuestion sonucu)

| Soru | Karar | Not |
|------|-------|-----|
| **S1 — XML varyant** | **Her yerde §2.1.4** (TaxAmount=300, Percent=20, exemption code). Tek kod yolu. | PDF §2.1.5 ile teknik tutarsızlık; gerekçe FIX-PLANI-v3 M12 kaydında belirtilecek. |
| **S2 — Kural konumu** | **Standalone helper + standalone validator** (`src/calculator/phantom-kdv-rules.ts` + `src/validators/phantom-kdv-validator.ts`). Cross-check matrix dokunulmaz. | Daha izole, daha az regression riski. |
| **S3 — Commit granülarite** | **9 commit** (8d.0 → 8d.8). | 8d.3 satır mapper, 8d.4 belge mapper ayrı. |
| **S4 — Snapshot stratejisi** | **Hem auto hem manuel fixture.** | Jest snapshot regression güvencesi + manuel fixture GİB birebir eşleşme. |

---

## 10. Risk ve Belirsizlikler

| # | Risk | Etki | Azaltma |
|---|------|------|---------|
| R1 | `document-calculator.ts` post-marking yaklaşımı satır hesabını bozabilir (iki geçişli flow) | Yüksek | 8d.2 commit'inde regression testi; mevcut 800 test yeşil kalmalı |
| R2 | §2.1.4 stili seçimi (§9 S1=B) PDF §2.1.5 ile teknik tutarsızlık; v1.2 güncellemesinde GİB satır-level için başka varyant dayatırsa migration gerekir | Orta | FIX-PLANI-v3 M12 kaydında gerekçe + fixture PDF fragmanı ile cross-check |
| R3 | Mapper `shouldAddExemption` (satır 225) mevcut kontrolü phantom'la çakışabilir | Orta | 8d.3 testlerde manuel kontrol; `calc.taxExemptionReason` phantom'da özel davranış |
| R4 | `CalculationSequenceNumeric=-1` satır-level eklenince B-67 validator (mevcut) YTBISTISNA/YATIRIMTESVIK+ISTISNA input'ları kabul etmeye başlar — şu an *her* böyle input fail ediyor | Düşük | Bu zaten beklenen davranış. Mevcut B-67 testleri Sprint 8c'de varsa yeşil kalmalı, değilse 8d.5'te genişletilir |
| R5 | İstisna kodu whitelist (308/339) satır bazlı ItemClassificationCode ile eşleme. ItemClassificationCode=01 + kod=339 verilirse? | Düşük | `profile-validators.ts:290-310` zaten bu kontrolü yapıyor; 8d.5 validator bunu tekrar üretmez |
| R6 | v2.0.0 henüz publish edilmediği için CHANGELOG'da "v2.0.0 (unreleased)" section'a Sprint 8d bilgileri eklenmeli — branching karmaşıklığı | Düşük | CHANGELOG.md zaten unreleased bölümde; 8d.8 bu bölüme append |

---

## 11. Doğrulama / End-to-End Test

Sprint 8d sonunda aşağıdaki komutlar yeşil olmalı:

```bash
cd /Users/berkaygokce/CascadeProjects/windsurf-project/json2ubl-ts
npm test                               # 830+ test yeşil
npm test -- phantom-kdv                # yalnız yeni testler
npm test -- --testNamePattern "12|13|14"  # regression: mevcut YATIRIMTESVIK snapshot'ları değişmemeli
```

Manuel doğrulama (örnek niyet):
- YATIRIMTESVIK+ISTISNA input (1 satır, kdvPercent=20, exemption=308, ItemCls=01, price=100, qty=15) → XML üret → §2.1.4 + §2.1.5 stili birleşimiyle eşleşmeli
- EARSIV+YTBISTISNA aynı girdilerle → aynı format (ProfileID ve TypeCode farkıyla)

---

## 12. Özet

| Ölçüt | Tahmin |
|-------|--------|
| **Commit sayısı** | 9 (8d.0 → 8d.8) |
| **Yeni dosya** | 3: `phantom-kdv-rules.ts`, `phantom-kdv-validator.ts`, `phantom-kdv.test.ts` (+ 3 test dosyası daha) |
| **Değişen dosya** | 5: document-calculator, line-calculator, simple-invoice-mapper, simple-invoice-builder, FIX-PLANI-v3 |
| **Yeni test** | ~34-41 |
| **Hedef test sayısı** | ~830-840 |
| **Süre tahmini** | 1.5-2 tam gün (kod 1 gün, test+doc yarım gün, §9 S1 teyidi lineer değil) |
| **Mimari karar** | M12 — Phantom KDV / Vazgeçilen KDV Tutarı |
| **M11 etkisi** | Yok (ortogonal) |
| **v2.0.0 publish** | 8d merge sonrası, ayrı commit gerekmez (package.json zaten 2.0.0) |

**Teyit edilenler (§9 karar kayıtları):**
- S1 = B (her yerde §2.1.4 stili — tek kod yolu)
- S2 = A (standalone helper + standalone validator)
- S3 = 9 commit (8d.0 → 8d.8)
- S4 = auto snapshot + manuel fixture
