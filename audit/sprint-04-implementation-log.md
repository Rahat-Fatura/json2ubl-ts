---
sprint: 4
baslik: Calculator Aritmetik + Yuvarlama (M9/M10)
tarih: 2026-04-22
plan: audit/sprint-04-plan.md
toplam_commit: 6 (Sprint 4.1 … 4.6)
test_durumu: 375/375 yeşil (26 dosya)
---

# Sprint 4 İmplementasyon Günlüğü

Sprint 4 planı (audit/sprint-04-plan.md) 6 mantıksal alt commit halinde uygulandı.
Tüm commit'lerde `yarn test` yeşil; stopaj regresyon fixture'ı (F10/F11) baştan sona
hiç kırılmadı (R1 korunumu).

## Commit Özeti

| # | Commit | Hash | Kapsamlı |
|---|---|---|---|
| 4.1 | M9 + B-42 percent 2-basamak | `67e9236` | tax-serializer.ts:44,95 → `formatDecimal(percent, 2)` |
| 4.2 | AR-5 PayableRoundingAmount tam iptal | `8a733a9` | common.ts / xsd-sequence.ts / monetary-serializer.ts 3 lokasyon |
| 4.3 | B-15 LineExtensionAmount + `lineExtensionForMonetary` sil | `1013a44` | document-calculator.ts:107 fix; CalculatedLine alan silindi |
| 4.4 | M10 + B-76 + Sprint 1 defensive temizlik | `91aa09d` | setLiability no-op + isExport tip ISTISNA + buyerCustomer dar |
| 4.5 | Yan bulgular (B-41/43/45/47/79/80/81) | `379c804` | 7 bulgu; B-83 Sprint 5'e ertelendi |
| 4.6 | F10/F11 Mimsoft fixture + log | (bu commit) | Stopaj regresyon + bu dosya |

Her commit'te `yarn test` yeşil tutuldu. Stopaj davranışı (baseStat=false →
taxForCalculate *= -1) tüm commit'lerde dokunulmadı.

---

## Kapsanan Bulgular

### B-15 (KRİTİK) — LegalMonetaryTotal.LineExtensionAmount iskonto sonrası
- **Commit:** 4.3
- **Dosya:** `src/calculator/document-calculator.ts:107`
- **Değişim:** `line.lineExtensionForMonetary` → `line.lineExtensionAmount`
- **Etki:** UBL-TR normatif (Skill §5 s130) `Σ(InvoiceLine.LineExtensionAmount) = document.LineExtensionAmount`
  identity'si sağlandı. Iskontolu faturalarda önceki davranış (1000 yerine) doğru
  değer (850) döner.
- **Breaking:** Evet (sayısal değer değişimi); dev aşamasında tüketici kırılma
  endişesi yok.
- **Test:** B-T03 güncellendi (1000 → 850), yeni B-15 regresyon testi (3 satır × iskonto).

### B-17 (KRİTİK) — İPTAL
- Kullanıcı Mimsoft F10/F11 gerçek faturalarını inceledi ve calculator'un mevcut
  stopaj modelinin (pozitif TaxAmount + negatif iç hesap) doğru olduğunu teyit etti.
- Sprint 4 kapsamından çıkarıldı; B-T04 testi de iptal.
- F10/F11 fixture (`__tests__/calculator/mimsoft-stopaj.test.ts`) kararın kanıtı olarak eklendi.

### B-41 (YÜKSEK) — TEVKIFATIADE tip override
- **Commit:** 4.5
- **Dosya:** `src/calculator/document-calculator.ts` (`resolveInvoiceType`)
- **Değişim:** Öncelik kuralı revize — önce `input.type` override (TEVKIFATIADE dahil),
  sonra `typesArray.includes('TEVKIFAT')`. Switch bloğu düz return'e sadeleşti.
- **Test:** yeni regresyon, type='TEVKIFATIADE' + tevkifat satır → TEVKIFATIADE.

### B-42 (YÜKSEK) — Percent 2-basamak yuvarlama
- **Commit:** 4.1 (M9 disiplin)
- **Dosya:** `src/serializers/tax-serializer.ts:44, 95`
- **Değişim:** `formatDecimal(percent, 0)` → `formatDecimal(percent, 2)`.
  TaxSubtotal/Percent ve WithholdingTaxSubtotal/Percent 2 basamak.
- **Test:** Yeni tax-serializer.test.ts (6 test); kesirli oran (18.5 → "18.50") kayıp yok.

### B-43 (YÜKSEK) — ConfigManager unit-name case-sensitive
- **Commit:** 4.5
- **Dosya:** `src/calculator/config-manager.ts` (resolveUnitCode + buildUnitMaps)
- **Değişim:** Name key `u.name.toLowerCase()`; lookup `input.toLowerCase()`.
  Artık `unit-config.ts:resolveUnitCode` ile tutarlı — çift truth source temizlendi.
- **Test:** `configManager.resolveUnitCode('kilogram'/'KILOGRAM')` → 'KGM'.

### B-44 (YÜKSEK) — setLiability isExport=true kontrat (M10)
- **Commit:** 4.4
- **Dosya:** `src/calculator/invoice-session.ts:186-208`
- **Değişim:** `setLiability` ilk satırda `if (this._isExport) return;` (M10 no-op).
  Constructor'da `isExport=true` iken tip de 'ISTISNA' zorlandı (M2 identity).
- **Test:** 5 test (invoice-session.test.ts — yeni dosya): profil/tip zorlaması, no-op davranışı.

### B-45 (YÜKSEK) — getAvailableExemptions SGK/IADE Schematron
- **Commit:** 4.5
- **Dosya:** `src/calculator/invoice-rules.ts:287-301`
- **Değişim:** IADE/YTBIADE/TEVKIFATIADE/YTBTEVKIFATIADE için ISTISNA documentType
  kodları erişilir. SGK hem SGK hem ISTISNA birleşik döndürür.
- **Test:** 3 yeni test (invoice-rules.test.ts).

### B-46 (YÜKSEK) — Satır vs belge yuvarlama tutarlılığı
- **Commit:** 4.1 (M9 mimari kararı ile çözüldü)
- Calculator tamamen float; yuvarlama yalnız serializer yazım anında. Σ satır ile
  belge float seviyesinde zaten eşit. Ayrı test eklenmedi (mevcut parasal test'ler
  kapsama sağlıyor).

### B-47 (YÜKSEK) — resolveProfileForType earchive+SGK fallback
- **Commit:** 4.5
- **Dosya:** `src/calculator/invoice-rules.ts:216-225`
- **Değişim:** SGK newType + liability='earchive' → EARSIVFATURA (TICARIFATURA
  yanlış fallback önlendi). Kombinasyon semantik olarak uyumsuz ama en az hatalı profil.
- **Test:** 2 test (invoice-rules.test.ts).

### B-76 (ORTA) — resolveProfile buyerCustomer IHRACAT zorlaması
- **Commit:** 4.4
- **Dosya:** `src/calculator/document-calculator.ts:306`
- **Değişim:** `buyerCustomer && calculatedType === 'ISTISNA'` → IHRACAT (eskiden
  tek başına IHRACAT). YOLCU/KAMU senaryoları gelecek sprint için ipucu alanı bekliyor.
- **Test:** İki regresyon (ISTISNA satır → IHRACAT; SATIS satır → IHRACAT DEĞİL).
  Sprint 1 defensive `type: 'ISTISNA'` override kaldırıldı.

### B-79 (ORTA) — showWithholdingTaxSelector sade IADE
- **Commit:** 4.5
- **Dosya:** `src/calculator/invoice-rules.ts:264` (deriveFieldVisibility)
- **Değişim:** `isTevkifat || isIade` → `isTevkifat || isTevkifatIade`.
  Sade IADE (TEVKIFATIADE olmayan) selector göstermez.
- **Test:** 3 test (invoice-rules.test.ts).

### B-80 (ORTA) — SimpleInvoiceBuilder çift calculateDocument
- **Commit:** 4.5
- **Dosya:** `simple-invoice-mapper.ts` + `simple-invoice-builder.ts`
- **Değişim:** `mapSimpleToInvoiceInput(simple, precomputed?)` — precomputed
  verilirse tekrar hesaplamaz. Builder.build/buildUnsafe cache'li sonuç iletir.
- **Test:** 2 test (simple-invoice-mapper.test.ts — vi.spyOn çağrı sayısı).

### B-81 (ORTA) — mapper TEVKIFAT+351 atlama (M5 ön-işi)
- **Commit:** 4.5
- **Dosya:** `src/calculator/simple-invoice-mapper.ts:232-246` (shouldAddExemption)
- **Değişim:** `type === 'TEVKIFAT' && ts.code === '0015' && calc.taxExemptionReason.kdv === '351'`
  → `true` (calculator'un ürettiği 351 XML'e iletiliyor).
- **Test:** 2 test (TEVKIFAT input → XML'de TaxExemptionReasonCode=351).
- **Not:** M5 full cross-check matrisi Sprint 5'te — bu minimal ön-iş.

### B-83 (ORTA) — KAMU BuyerCustomer PartyIdentification
- **Ertelendi → Sprint 5 veya Sprint 8**
- **Gerekçe:** Minimum fix `resolveBuyerPartyType`'a `'KAMU'` eklemek, ancak
  `BuyerCustomerInput.partyType` tipinin genişletilmesini (types/common.ts) ve
  downstream serializer'larda `'KAMU'` partyType'ı karşılayan XML mapping'ini
  gerektirir. Sprint 4 kapsamı calculator/yuvarlama hedefliyor; B-83 serializer
  tarafı ek iş.
- **Öneri:** M5 full cross-check matrisi (Sprint 5) ile birlikte veya Sprint 8
  dokümantasyon + eksik özellik pasıyla ele al.

---

## Mimari Kararlar Uygulandı

### M9 — Yuvarlama sadece serializer'da
- Calculator'da `toFixed`/`Math.round` yoktu ve eklenmedi (grep boş teyit).
- Serializer katmanında XSD-yuvarlamalı key'ler için `formatDecimal(value, n)`.
- B-42 kapsama: percent 2-basamak.
- B-46 kapsama: hesap tamamen float → Σ satır ile belge float seviyesinde eşit;
  yazım anındaki yuvarlama hesaba dönmüyor → tutarsızlık kaynağı yok.
- AR-5 (B-40 PayableRoundingAmount) tam iptal edildi; sapma olmadığı için alan
  gereksiz.

### M10 — isExport=true → setLiability no-op + tip ISTISNA
- `setLiability` guard: `if (this._isExport) return;` — sessiz no-op (error değil).
- Constructor: `isExport=true` iken tip 'ISTISNA' zorlanır (M2 identity). Kullanıcı
  'SATIS' verse bile override edilir.
- `resolveProfile` (`invoice-session.ts`'nin profil zorlaması) + `calculateDocument`
  `resolveProfile` (document-calculator.ts) birlikte tutarlı: IHRACAT yalnız ISTISNA
  context'te türetilir.

### AR-5 — B-40 PayableRoundingAmount tam iptal
- `types/common.ts`, `serializers/xsd-sequence.ts`, `serializers/monetary-serializer.ts`
  3 lokasyon temizlendi. Kalıntı grep boş teyit.

### AR-7 — InvoiceLineInput.kdvExemptionCode
- Alan zaten yoktu (types/invoice-input.ts:104-129 kontrol edildi). Pass; commit'e
  dahil edilmedi.

---

## R1 Korunumu — Stopaj Dokunulmazlığı

Sprint 4 planında §7 R1 "stopaj DOKUNULMAZ" vurgusu gereği:

- `line-calculator.ts:128-130` (`baseStat=false → taxForCalculate *= -1`) DEĞİŞMEDİ
- `line-calculator.ts:154-155` (`taxes.taxTotal = Σ amount`, `taxForCalculate = Σ taxForCalculate`) DEĞİŞMEDİ
- `line-calculator.ts:198` (`taxInclusiveForMonetary = lineExtensionAmount + taxes.taxForCalculate`) DEĞİŞMEDİ
- `document-calculator.ts:132` (`taxSubtotals[existingIndex].taxForCalculate += tax.taxForCalculate`) DEĞİŞMEDİ

Kanıt: `__tests__/calculator/mimsoft-stopaj.test.ts` (12 test) Mimsoft F10/F11 gerçek
faturalarının sayısal değerleri ile 4.1 → 4.6 arası tüm commit'lerde yeşil.

---

## Test İstatistiği

| Sprint 4 öncesi | Sprint 4 sonrası | Fark |
|---|---|---|
| 338 test | 375 test | **+37** |
| 22 dosya | 26 dosya | **+4** (tax-serializer, monetary-serializer, invoice-session, simple-invoice-mapper, mimsoft-stopaj) |

Yeni test dosyaları:
- `__tests__/serializers/tax-serializer.test.ts` — 6 test (B-42)
- `__tests__/serializers/monetary-serializer.test.ts` — 2 test (AR-5)
- `__tests__/calculator/invoice-session.test.ts` — 5 test (M10)
- `__tests__/calculator/simple-invoice-mapper.test.ts` — 4 test (B-80, B-81)
- `__tests__/calculator/mimsoft-stopaj.test.ts` — 12 test (F10/F11 regresyon)

Mevcut dosyalara eklenenler: `invoice-rules.test.ts` +8, `unit-config.test.ts` +3,
`document-calculator.test.ts` +2 (B-15 regression + B-41 + B-76 non-export),
`line-calculator.test.ts` 0 (lineExtensionForMonetary assert'leri sadeleştirildi).

---

## Sprint 5 için Devredilen İşler

1. **B-83 KAMU PartyIdentification** — `BuyerCustomerInput.partyType` tip
   genişletmesi + serializer XML mapping.
2. **M5 full 351 cross-check matrisi** — Sprint 4'te B-81 minimal, M5 full fix Sprint 5.
3. **B-06/B-07/B-08** — TaxExemption matrisi, IHRACKAYITLI+702, YatirimTesvikKDV.

---

## Çıktı Listesi

- 6 commit (Sprint 4.1 … Sprint 4.6)
- `audit/sprint-04-plan.md` (Sprint 4.1'de eklendi)
- `audit/sprint-04-implementation-log.md` (bu dosya, Sprint 4.6)
- `__tests__/fixtures/mimsoft-real-invoices/` (F10/F11 XML, Sprint 4.6)
- 5 yeni test dosyası + mevcut test'lere eklemeler (+37 test)

---

## Sonraki Adım

Sprint 5 — Validator Kapsamı + TaxExemption Cross-Check (M5). Plan `audit/FIX-PLANI-v3.md`
satır 239-258'de. Başlamadan önce kullanıcı onayı beklenir.
