---
sprint: 8d
baslik: M12 Phantom KDV (Vazgeçilen KDV Tutarı) — YATIRIMTESVIK/EARSIV+YTBISTISNA
tarih_basi: 2026-04-24
tarih_sonu: 2026-04-XX
plan: audit/sprint-08d-plan.md
fix_plani: audit/FIX-PLANI-v3.md — M12 + Sprint 8d bölümü
onceki_sprint: audit/sprint-08c-implementation-log.md (commit 2afd1a3, 800/800 yeşil, package.json=2.0.0 unreleased)
sonraki_sprint: Sprint 8e (senaryo/example üretimi — tüm profil×tip kombinasyonları)
toplam_commit: 9 atomik alt-commit (8d.0 → 8d.8)
test_durumu_basi: 800 / 800 yeşil
test_durumu_sonu_hedef: ~830-840 yeşil (+30-40 test)
---

## Kapsam (Sprint 8d Planından)

Sprint 8c tamamlandı (commit `2afd1a3`): 800/800 test yeşil, `package.json=2.0.0`. v2.0.0 publish için hazır **fakat publish edilmedi** — Aralık 2025'te GİB "Yatırım Teşvik Kapsamında Yapılan Teslimlere İlişkin Fatura Teknik Kılavuzu v1.1" yayımladığı için publish öncesi v2.0.0'a dahil ediliyor.

**Sprint 8d birincil hedefi:** YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA kombinasyonlarında "Vazgeçilen KDV Tutarı" (phantom KDV) davranışı. Satır KDV matematiği (kdvPercent × lineExtension) TaxSubtotal'da XML'e yazılır fakat LegalMonetaryTotal + parent TaxTotal/TaxAmount'a dahil edilmez; `CalculationSequenceNumeric=-1` otomatik.

**Sprint 8d kapsamı dışı:** Yeni senaryo (example) üretimi — Sprint 8e'ye erteli. Mevcut 12/13/14 YATIRIMTESVIK+SATIS/IADE senaryoları değişmez.

**Berkay'ın kritik direktifleri (plan bel kemiği):**
1. Her satırda `0 < kdvPercent ≤ 100` zorunlu; `kdvPercent=0` validation error.
2. Her satırda istisna kodu zorunlu (308 Makine/01 veya 339 İnşaat/02; cross-check matrix zaten whitelist tutuyor).
3. CalculationSequenceNumeric kullanıcıdan alınmaz — kütüphane otomatik `-1` set eder (SimpleInvoiceInput sözleşmesi: matematik kütüphanede, metadata kullanıcıda).
4. Kapsam: yalnız YATIRIMTESVIK+ISTISNA ve EARSIV+YTBISTISNA. Diğer kombinasyonlar değişmez.

**AskUserQuestion karar kayıtları (§9):**
- **S1 = B:** Her yerde §2.1.4 stili (TaxAmount=300, Percent=20, exemption code, CalcSeqNum=-1). Tek kod yolu. PDF §2.1.5 stili (Percent=0/TaxAmount=0) uygulanmaz.
- **S2 = A:** Standalone helper (`src/calculator/phantom-kdv-rules.ts`) + standalone validator (`src/validators/phantom-kdv-validator.ts`). Cross-check matrix dokunulmaz.
- **S3 = 9 commit** (8d.0 → 8d.8). 8d.3 satır mapper, 8d.4 belge mapper ayrı.
- **S4 = Hem auto hem fixture:** Jest snapshot + manuel XML fixture (§2.1.4 fragmanları).

9 atomik alt-commit planlandı: 8d.0 → 8d.8.

---

## Sprint 8d.0 — Plan kopyası + log iskelet + FIX-PLANI M12 işaretleme

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8d.0: Plan kopyası + implementation log iskelet + FIX-PLANI M12 işaretleme`

### Yapılanlar

1. **`audit/sprint-08d-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/sprint-8d-federated-treasure.md` kopyalandı (feedback memory: plan kopya pattern'i).
2. **`audit/sprint-08d-implementation-log.md`** — bu dosya, iskelet + 8d.0 bölümü oluşturuldu.
3. **`audit/FIX-PLANI-v3.md` güncellemesi:**
   - **M12** başlığı eklendi (Mimari Kararlar §119-130 sonrası): Phantom KDV / Vazgeçilen KDV Tutarı (placeholder; 8d.8'de final detay doldurulacak).
   - **Sprint 8d bölümü** eklendi (Sprint 2.0.0 release notu öncesi): 9 alt-commit + kapsanan bulgular + plan/log referansları (placeholder).
   - Toplam mimari karar sayısı: 11 → **12**.
4. **`README.md` §8 Sorumluluk Matrisi:** M12 satırı eklendi (M11 sonrası) — placeholder; 8d.8'de final detay doldurulacak.
5. **`CHANGELOG.md` [2.0.0] section:** Sprint 8d alt-section başlığı placeholder eklendi — 8d.8'de final detay doldurulacak.

### Değişiklik İstatistikleri

- `audit/sprint-08d-plan.md` — yeni dosya (plan kopyası, 381 satır)
- `audit/sprint-08d-implementation-log.md` — yeni dosya (iskelet + 8d.0 bölümü)
- `audit/FIX-PLANI-v3.md` — M12 + Sprint 8d notu eklemesi
- `README.md` — §8 matris M12 satırı
- `CHANGELOG.md` — [2.0.0] Sprint 8d placeholder

### Test Durumu

- Başlangıç: 800/800 yeşil
- Son: 800/800 yeşil (kod değişikliği yok, sadece audit/ + dokümantasyon)

### Disiplin Notları

- **Plan kopya pattern'i** (memory `feedback_sprint_plan_pattern.md`): İlk alt-commit'te plan modu dosyası `audit/sprint-08d-plan.md`'ye kopyalandı.
- **`src/` read-only:** Bu commit'te kod dosyasına dokunulmadı.
- **Mimari karar yeni slot:** M12 FIX-PLANI-v3.md'de Sprint 8d kapsamında açıldı.
- **v2.0.0 publish:** package.json zaten `2.0.0`; 8d tamamlanınca git tag yeniden atma veya ayrı version bump gerekmez (aynı unreleased tag'e Sprint 8d entry'si eklenir).

---

## Sprint 8d.1 — phantom-kdv-rules helper + tip genişletme

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8d.1: phantom-kdv-rules helper + CalculatedTaxSubtotal/CalculatedLine tip genişletme`

### Yapılanlar

1. **`src/calculator/phantom-kdv-rules.ts`** (yeni, ~45 satır) — M12 kombinasyon kuralı tek noktada:
   - `isPhantomKdvCombination(profile, type)` — YATIRIMTESVIK+ISTISNA veya EARSIVFATURA+YTBISTISNA
   - `phantomKdvExemptionCodeFor(itemClassificationCode)` — 01 → 308, 02 → 339, diğer → null
   - `PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC = -1` sabit
   - `PHANTOM_KDV_EXEMPTION_CODES = Set {'308', '339'}`
   - `PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES = Set {'01', '02'}`
2. **`src/calculator/line-calculator.ts` tip genişletmeleri:**
   - `CalculatedTaxSubtotal.calculationSequenceNumeric?: number` eklendi (XSD element adını birebir taşıyor)
   - `CalculatedLine.phantomKdv: boolean` eklendi; `calculateLine` return'unda default `false`
   - Phantom logic line-calculator'da *yok* — belge tipi tespit edildikten sonra document-calculator post-mark eder (planda §4.4)
3. **`__tests__/calculator/phantom-kdv-rules.test.ts`** (yeni, 16 test):
   - 8 `isPhantomKdvCombination` edge case (YATIRIMTESVIK+ISTISNA/SATIS/IADE, EARSIV+YTBISTISNA/YTBSATIS/YTBIADE, TEMELFATURA/TICARIFATURA+ISTISNA)
   - 5 `phantomKdvExemptionCodeFor` mapping
   - 3 sabit kontrol

### Değişiklik İstatistikleri

- `src/calculator/phantom-kdv-rules.ts` — yeni (45 satır)
- `src/calculator/line-calculator.ts` — `CalculatedTaxSubtotal` + `CalculatedLine` tip genişletme + return default (+5 satır net)
- `__tests__/calculator/phantom-kdv-rules.test.ts` — yeni (90 satır, 16 test)

### Test Durumu

- Başlangıç: 800/800 yeşil
- Son: **816/816 yeşil** (+16 phantom-kdv-rules)
- Typecheck: temiz

### Disiplin Notları

- **Tek kural kaynağı:** Phantom kombinasyon tespiti yalnız `phantom-kdv-rules.ts`'de. Document-calculator, mapper, validator bu helper'ı kullanacak; inline kontrol yasak.
- **Line-calculator saf:** Satır hesabı phantom bilgisini bilmez (belge tipi tespit edilmeden bilinemez); post-marking dokümente edilmiş tasarım kararı.

---

## Sprint 8d.2 — document-calculator phantom post-marking + monetary dışlama

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8d.2: document-calculator phantom post-marking + monetary dışlama (M12)`

### Yapılanlar

1. **`src/calculator/document-calculator.ts` flow yeniden yapılandırıldı:**
   - **Ön geçiş:** satırlar hesaplanır, `typesArray` oluşturulur (sadece tip tespiti için)
   - **Tip + profil tespiti:** `resolveInvoiceType` + `resolveProfile` monetary toplamadan ÖNCE çağrılır
   - **Phantom post-mark:** `isPhantomKdvCombination(profile, type)` true ise her satırın `phantomKdv=true` + KDV subtotal'larının `calculationSequenceNumeric=-1` işaretlenir
   - **Ana döngü:** satırların `phantomKdv` flag'ine göre monetary (`taxInclusive`, `payable`) ve belge `taxTotal` phantom satırları dışlar; fakat `taxSubtotals[]` listesi phantom değerleri (amount=300, percent=20, CalcSeqNum=-1) korur — mapper §2.1.4 stili XML için bunları kullanacak.
   - **İstisna kodu eşleştirme:** tip+profil sabit kaldıktan sonra `resolveExemptionReason` çağrılır.
   - Docstring güncellendi.

2. **Yeni test dosyası:** `__tests__/calculator/document-calculator-phantom.test.ts` (15 test)
   - YATIRIMTESVIK+ISTISNA: 7 test (phantom flag, CalcSeqNum=-1, monetary dışlama, belge taxSubtotal değerleri)
   - EARSIVFATURA+YTBISTISNA: 4 test (aynı özellikler, 339 kod varyantı)
   - **Regression:** YATIRIMTESVIK+SATIS, YATIRIMTESVIK+IADE, EARSIV+YTBSATIS, TEMELFATURA+ISTISNA → phantom yok, normal davranış korunur.

### Kritik kural: phantom satırın monetary davranışı

```ts
if (line.phantomKdv) {
  taxInclusiveAmount += line.lineExtensionAmount;          // KDV hariç
  payableAmount += line.lineExtensionAmount - withholding;  // KDV hariç
  // taxTotalAmount dip'e eklenmez
} else {
  taxInclusiveAmount += line.taxInclusiveForMonetary;      // KDV dahil
  payableAmount += line.payableAmountForMonetary;
  taxTotalAmount += line.taxes.taxTotal;
}
```

`taxSubtotals[]` listesi phantom satırları da içerir (§2.1.4 XML için gerekli) — ama her biri `calculationSequenceNumeric=-1` taşıyor ve dış `taxTotalAmount`'a katkı vermiyor.

### Değişiklik İstatistikleri

- `src/calculator/document-calculator.ts` — phantom post-mark + koşullu monetary toplama (~40 satır net artış)
- `__tests__/calculator/document-calculator-phantom.test.ts` — yeni (~250 satır, 15 test)

### Test Durumu

- Başlangıç: 816/816 yeşil
- Son: **831/831 yeşil** (+15 document-calculator-phantom)
- Regression: 38 snapshot test değişmeden geçti (mevcut YATIRIMTESVIK+SATIS senaryo 12, 13, 14 ve tüm diğer ISTISNA senaryoları etkilenmedi)
- Typecheck: temiz

### Disiplin Notları

- **Flow sırası kritik:** Fatura tipi + profil tespiti phantom kararı için GEREKLİ; önceki flow'da monetary önce toplanıyordu, bu yüzden iki adıma bölündü (ön geçiş tip, sonra ana toplama).
- **M11 bozulmadı:** `resolveExemptionReason` mantığı değişmedi, YATIRIMTESVIK+ISTISNA için self-exemption fallback hâlâ çalışıyor.

---

## Sprint 8d.3 — Mapper satır-level §2.1.4 phantom KDV

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8d.3: Mapper satır-level §2.1.4 phantom KDV (M12)`

### Yapılanlar

1. **`src/calculator/simple-invoice-mapper.ts` `buildSingleLine` güncellemesi:**
   - `CalculatedTaxSubtotal.calculationSequenceNumeric` → `TaxSubtotalInput.calculationSequenceNumeric` propagate edilir
   - Satır `taxTotal.taxAmount`: `cl.phantomKdv ? 0 : cl.taxes.taxTotal` — phantom satırda dış parent TaxAmount=0 (§2.1.4 "Vazgeçilen KDV dip'e girmez")
   - Exemption code yazım koşulu genişletildi: klasik `amount===0` durumuna ek olarak `cl.phantomKdv === true` durumunda da satır TaxSubtotal.TaxExemptionReasonCode/Reason doldurulur

2. **Yeni test dosyası:** `__tests__/calculator/simple-invoice-mapper-phantom-line.test.ts` (8 test)
   - YATIRIMTESVIK+ISTISNA: satır TaxTotal.TaxAmount=0, TaxSubtotal TaxAmount=300, Percent=20, CalcSeqNum=-1, exemption=308 (5 test)
   - EARSIVFATURA+YTBISTISNA + İnşaat (339, kdvPercent=18, taxAmount=270) — aynı §2.1.4 stili (1 test)
   - **Regression:** YATIRIMTESVIK+SATIS (CalcSeqNum undefined, TaxAmount=200) ve TEMELFATURA+ISTISNA (kdvPercent=0, exemption 350 korunur) (2 test)

### Config notu (out-of-scope bulgu)

`src/calculator/exemption-config.ts:62` 308 kodunu "13/e Limanlara Bağlantı..." olarak tanımlıyor. GİB YATIRIMTESVIK PDF §4 ise 308'i "13/d Teşvikli Yatırım Malları" olarak tanımlıyor. Bu discrepancy kodlar listesi v1.42 ile YTB teknik kılavuzu v1.1 arasında — Sprint 8d kapsamı dışı. Phantom davranışı kod tanımından bağımsız çalışır; gerekirse ayrı bir B-NEW bug raporu.

### Değişiklik İstatistikleri

- `src/calculator/simple-invoice-mapper.ts` — `buildSingleLine` phantom-aware (~10 satır net)
- `__tests__/calculator/simple-invoice-mapper-phantom-line.test.ts` — yeni (~200 satır, 8 test)

### Test Durumu

- Başlangıç: 831/831 yeşil
- Son: **839/839 yeşil** (+8 mapper phantom line)
- Regression: 38 snapshot test değişmeden geçti
- Typecheck: temiz

### Disiplin Notları

- Mapper phantom kontrolü tek noktada: `cl.phantomKdv` flag'i. `isPhantomKdvCombination` mapper'da çağrılmaz — document-calculator'ın kararı taşınır.
- Satır-level TaxSubtotal §2.1.4 stili birleşik şablon (§9 S1=B kararı); §2.1.5 varyantı uygulanmaz.

---

## Sprint 8d.4 — Mapper belge-level §2.1.4 phantom KDV

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8d.4: Mapper belge-level §2.1.4 phantom KDV (M12)`

### Yapılanlar

1. **`src/calculator/simple-invoice-mapper.ts` `buildTaxTotals` güncellemesi:**
   - `CalculatedTaxSubtotal.calculationSequenceNumeric` → belge-level `TaxSubtotalInput.calculationSequenceNumeric` propagate
   - Phantom TaxSubtotal'da (CalcSeqNum=-1 taşıyanlar) exemption code zorunlu olarak yazılır — `shouldAddExemption` false dönse bile (phantom durumunda amount>0 ve mevcut koşul `amount===0`'a bağlı olduğu için bypass gerekiyor)
   - Dış parent TaxAmount değişmedi: `calc.taxes.taxTotal` zaten 8d.2'de phantom hariç toplam tutuyor (phantom kombinasyonda 0)

2. **Yeni test dosyası:** `__tests__/calculator/simple-invoice-mapper-phantom-document.test.ts` (9 test)
   - Belge-level Invoice/TaxTotal TaxAmount=0 (parent) (1 test)
   - Belge-level TaxSubtotal phantom değerleri (TaxableAmount, TaxAmount, Percent, CalcSeqNum, exemption) (5 test)
   - LegalMonetaryTotal phantom hariç (lineExt=taxExclusive=taxInclusive=payable=1500) (1 test)
   - EARSIV+YTBISTISNA İnşaat (339) end-to-end belge-level (1 test)
   - Regression: YATIRIMTESVIK+SATIS belge-level TaxTotal phantom yok (taxAmount=200, CalcSeqNum undefined) (1 test)

### Değişiklik İstatistikleri

- `src/calculator/simple-invoice-mapper.ts` — `buildTaxTotals` phantom-aware (~10 satır net)
- `__tests__/calculator/simple-invoice-mapper-phantom-document.test.ts` — yeni (~185 satır, 9 test)

### Test Durumu

- Başlangıç: 839/839 yeşil
- Son: **848/848 yeşil** (+9 mapper phantom document)
- Regression: 38 snapshot test değişmeden geçti
- Typecheck: temiz

### Disiplin Notları

- Phantom exemption code davranışı tek kural: `ts.calculationSequenceNumeric === -1` → exemption code koşulsuz yaz. Bu sadece belge-level buildTaxTotals için geçerli; satır-level buildSingleLine 8d.3'te kendi phantom koşullu (`cl.phantomKdv`) kurmuştu.
- §9 S1=B kararı (her yerde §2.1.4) korunuyor — satır ve belge phantom TaxSubtotal aynı şekle sahip.

---

## Sprint 8d.5 — phantom-kdv-validator

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8d.5: phantom-kdv-validator + pipeline entegrasyonu (M12)`

### Yapılanlar

1. **`src/validators/phantom-kdv-validator.ts`** (yeni, ~95 satır) — 4 kural:
   - **R1 — `YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT`:** phantom kombinasyonda `0 < kdvPercent ≤ 100` zorunlu. `kdvPercent=0` veya aralık dışı değer hata.
   - **R2 — `YTB_ISTISNA_REQUIRES_EXEMPTION_CODE`:** exemption code zorunlu (satır bazlı veya belge fallback) ve 308 veya 339 whitelist'inde olmalı.
   - **R3 — `YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION`:** PDF §4 gereği 03 (Arsa/Arazi) ve 04 (Diğer) phantom'da yasak.
   - **R4 — `YTB_ISTISNA_EXEMPTION_CODE_MISMATCH`:** ItemClassificationCode ↔ exemption code eşleşmesi (01↔308, 02↔339).
   - Pipeline: `isPhantomKdvCombination(profile, type)` false ise erken return — non-phantom kombinasyonları etkilemez.

2. **`src/calculator/simple-invoice-builder.ts`:** `validatePhantomKdv` pipeline'a eklendi (`validationLevel ≠ 'none'` koşulunda; diğer 3 simple-input validator'dan sonra).

3. **Yeni test dosyası:** `__tests__/validators/phantom-kdv-validator.test.ts` (16 test)
   - Non-phantom kombinasyonlarda pas: YATIRIMTESVIK+SATIS, TEMELFATURA+ISTISNA, EARSIV+YTBSATIS (3 test)
   - YATIRIMTESVIK+ISTISNA: geçerli + R1 (kdvPercent=0, >100) + R2 (code eksik, 351 whitelist dışı, belge fallback) + R3 (cls=03, 04) + R4 (01+339, 02+308) (10 test)
   - EARSIV+YTBISTISNA: geçerli İnşaat + kdvPercent=0 (2 test)
   - Çoklu hata aynı satırda yakalanır (1 test)

### Değişiklik İstatistikleri

- `src/validators/phantom-kdv-validator.ts` — yeni (~95 satır)
- `src/calculator/simple-invoice-builder.ts` — import + pipeline entegrasyonu (2 satır)
- `__tests__/validators/phantom-kdv-validator.test.ts` — yeni (~205 satır, 16 test)

### Test Durumu

- Başlangıç: 848/848 yeşil
- Son: **864/864 yeşil** (+16 phantom-kdv-validator)
- Regression: 38 snapshot test değişmedi
- Typecheck: temiz

### Disiplin Notları

- **Validator kapsamı:** Yalnız simple-input seviyesinde çalışır. InvoiceInput tabanlı `InvoiceBuilder` doğrudan kullanılırsa validator tetiklenmez (expert mod — mevcut pattern korundu).
- **R4 whitelist eşlemesi:** `phantomKdvExemptionCodeFor(itemCls)` helper'ını kullanır — M11 self-exemption kurallarıyla çakışmaz.
- **Pipeline sırası:** `validateSimpleLineRanges` → `validateManualExemption` → `validateSgkInput` → `validatePhantomKdv`. Phantom kuralı en spesifik olduğu için en sonda.

---
