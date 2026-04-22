# Sprint 4 İmplementasyon Planı — Calculator Aritmetik + Yuvarlama (M9/M10)

**Paket:** `json2ubl-ts` (dev aşamasında, prod tüketicisi yok)
**Kaynak:** `audit/FIX-PLANI-v3.md` Sprint 4 + `audit/SONUC-konsolide-bulgular.md`
**Tahmini süre:** 3 gün
**Önkoşul:** Sprint 1 (matris tekleştirme), Sprint 2 (kod listeleri), Sprint 3 (XSD sequence) tamamlandı; ana branch yeşil

---

## Context

Sprint 1-3'te kütüphanenin matris/profil/tip çatısı, kod listesi config kaynakları ve XSD sequence'leri düzeltildi. Bu sprint **calculator aritmetiği ve yuvarlama modelini** hedef alıyor. Kritik hedefler:

- **B-15**: Iskontolu çoğul satırlı faturalarda belge-seviyesi `LineExtensionAmount` satır toplamı ile uzlaşmıyor (kod iskonto öncesi değer topluyor). Mimsoft pre-validation reddeder.
- **M9**: Tüm aritmetik calculator'da tam float yürütülecek; yuvarlama yalnızca XML yazım anında ve yalnızca XSD-yuvarlamalı key'in kendi çıktısında yapılacak. Hesaba geri dönmeyecek. Böylece B-42 (Percent kesirli oran kaybı) ve B-46 (satır vs belge tutarsızlığı) kendiliğinden çözülür; AR-5 (PayableRoundingAmount) tam iptal olur.
- **M10**: `isExport=true` iken `setLiability()` çağrısı sessizce görmezden gelinir (error yerine). Profil her zaman IHRACAT kalır.
- **AR-5/AR-7**: PayableRoundingAmount ve satır-seviyesi `kdvExemptionCode` (varsa) tamamen kaldırılır; opsiyonel kalıntı bırakılmaz.
- Yan bulgular: B-41 (TEVKIFATIADE override), B-43 (unit code case-sensitive), B-45 (Schematron 316/318/320 exemption listesi), B-47 (earchive+SGK fallback), B-76 (buyerCustomer→IHRACAT zorlama), B-79 (withholding selector IADE'de), B-80 (SimpleInvoiceBuilder çift calculateDocument çağrısı), B-81 (mapper TEVKIFAT+351 kaybı — M5 ön-işi), B-83 (KAMU BuyerCustomer partyType eşleme).

---

## Önemli — B-17 İptal Kararı (Mimsoft Kanıtı)

**B-17 Sprint 4 kapsamından ÇIKARILDI.** Kullanıcı Mimsoft'un ürettiği 2 gerçek faturayı inceledi ve calculator'ın mevcut stopaj aritmetiğinin doğru olduğunu teyit etti.

**Kanıt özeti:**
- Fatura 1 (TICARIFATURA+SATIS, Gelir Vergisi Stopajı 0003 %23): `TaxInclusive = 15.000 + 3.000 (KDV) − 3.450 (stopaj) = 14.550`
- Fatura 2 (TICARIFATURA+SATIS, Kurumlar Stopajı 0011 %32): `TaxInclusive = 15.000 + 3.000 − 4.800 = 13.200`
- UBL-TR (Türkiye) stopajı özel modelle ele alır: `TaxAmount` pozitif rapor edilir ama `TaxInclusive` hesabında matrahtan düşülür. GİB ve Schematron bu modele göre çalışır.

**Sonuç:**
- Calculator'un stopaj davranışı (`line-calculator.ts:128-130,181` `baseStat=false ? taxForCalculate *= -1`, `taxes.taxTotal` pozitif, `taxes.taxForCalculate` negatif dahil, `taxInclusiveForMonetary = lineExtensionAmount + taxes.taxForCalculate`) **KASITLI ve DOĞRU**. Sprint 4'te **DOKUNULMAYACAK**.
- B-T04 testi de iptal (B-17 bağımlısı).

---

## 1. Mevcut Durum

### 1.1 B-15 Merkezi — `document-calculator.ts`

Interface (`DocumentMonetary`, satır 18-29) açıkça belirtiyor:
```typescript
/** Σ line.lineExtensionForMonetary (indirim ÖNCESİ toplam) */
lineExtensionAmount: number;
/** Σ line.lineExtensionAmount (indirim SONRASI toplam) */
taxExclusiveAmount: number;
```

Hesaplama döngüsü (satır 107-109):
```typescript
lineExtensionAmount += line.lineExtensionForMonetary;  // iskonto ÖNCESİ → YANLIŞ
taxExclusiveAmount += line.lineExtensionAmount;         // iskonto SONRASI
taxInclusiveAmount += line.taxInclusiveForMonetary;
```

UBL-TR normatif (Skill `ortak-parasal-ve-vergi-v0.7.md §5 satır 130`): `LegalMonetaryTotal.LineExtensionAmount = Σ(InvoiceLine.LineExtensionAmount)` ve her iki seviyede iskonto sonrası.

`CalculatedLine.lineExtensionForMonetary` (iskonto öncesi, line-calculator.ts:57, 91) — B-15 sonrası belge-seviyede kullanılmayacak. Line-level'da da tüketicisi yok (ajan grep: `line-calculator.ts:57,91,96,98,219`, `document-calculator.ts:19,107` — tamamı iç referans).

### 1.2 M9 Yuvarlama Dağılımı — Mevcut Durum

**Calculator:** `grep -rn "toFixed|Math.round" src/calculator/` → **0 sonuç**. Zaten tamamen float.

**Serializer/utils:** `formatDecimal(value, decimals=2)` merkezi helper `src/utils/formatters.ts:1-4`:
```typescript
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
```

Kullanım yerleri:
- `tax-serializer.ts:44` — `Percent: formatDecimal(ts.percent, 0)` (TaxSubtotal/Percent — B-42 HEDEF)
- `tax-serializer.ts:95` — `Percent: formatDecimal(ts.percent, 0)` (WithholdingTaxSubtotal/Percent — B-42 HEDEF)
- `monetary-serializer.ts:38` — `CalculationRate: formatDecimal(er.calculationRate, 6)` (döviz — 6 basamak, dokunma)
- `common-serializer.ts:16` — `MultiplierFactorNumeric: formatDecimal(ac.multiplierFactorNumeric, 1)` (iskonto oranı — 1 basamak, dokunma)
- `xml-helpers.ts:84,97,116,129` — Amount/Quantity tag'ler `formatDecimal(amount)` → default 2 basamak (tutar formatı, dokunma)

**Sonuç:** M9 için Calculator'dan silinecek kod yok; merkezi helper hazır; sadece B-42'yi fix etmek ve yeni yuvarlama girişine izin vermemek için disiplin gerekli.

### 1.3 AR-5 — PayableRoundingAmount Kalıntıları

- `src/types/common.ts:127` — `payableRoundingAmount?: number` optional field
- `src/serializers/monetary-serializer.ts:23-26` — emit bloğu (`mt.payableRoundingAmount !== undefined` ise yaz)
- `src/serializers/xsd-sequence.ts:487` — `LEGAL_MONETARY_TOTAL_SEQ` listesinde
- `src/calculator/`: referans YOK (ajan grep teyit)
- Test: grep gerekli

### 1.4 M10 — `invoice-session.ts` setLiability (satır 186-208)

```typescript
setLiability(liability: CustomerLiability | undefined): void {
  const previousLiability = this._liability;
  this._liability = liability;
  if (previousLiability === liability) return;
  const currentProfile = this._input.profile ?? 'TICARIFATURA';
  const currentType = this._input.type ?? 'SATIS';
  const allowedProfiles = getAllowedProfilesForType(currentType, liability, this._isExport);
  if (!allowedProfiles.includes(currentProfile)) {
    const newProfile = resolveProfileForType(undefined, currentType, liability, this._isExport);
    const newType = resolveTypeForProfile(currentType, newProfile, liability);
    this._input = { ...this._input, profile: newProfile, type: newType };
  }
  this.updateUIState();
  this.emit('liability-changed', { liability, previousLiability });
  this.onChanged();
}
```

`isExport=true` iken bile `_liability` değişiyor; `getAllowedProfilesForType(..., isExport=true)` muhtemelen IHRACAT dönüp profil korunur, ama emit ve state değişimi yaşanıyor. M10 kontratı: `isExport=true` iken **hiçbir state değişimi olmasın, liability değişmesin, event fırlatılmasın** — tamamen no-op.

`setProfile` (satır 263-272) zaten `isExport=true` iken error yayıyor. M10 `setLiability` için error değil **sessiz no-op** istiyor (tutarlı olmayan API ama kullanıcı kararı, FIX-PLANI-v3 satır 214).

### 1.5 B-76 — `resolveProfile` buyerCustomer varlığı

`document-calculator.ts:306`:
```typescript
if (input.buyerCustomer) return 'IHRACAT';
```

Sadece IHRACAT'a zorluyor. YOLCU (YOLCUBERABERFATURA) ve KAMU profilleri de `buyerCustomer` ile birlikte gelir. Doğrusu: buyerCustomer + `profile` override yoksa, `calculatedType` veya ek ipucu ile karar.

### 1.6 B-81 — Mapper shouldAddExemption (`simple-invoice-mapper.ts:232-246`)

```typescript
function shouldAddExemption(ts, calc, simple): boolean {
  const exemptTypes = ['IADE', 'YTBIADE', 'IHRACKAYITLI', 'OZELMATRAH', 'SGK', 'KONAKLAMAVERGISI'];
  if (ts.code === '0015' && ts.amount === 0 && !exemptTypes.includes(type)) return true;
  if (type === 'IHRACKAYITLI') return true;
  if (type === 'OZELMATRAH' && simple.ozelMatrah) return true;
  return false;
}
```

TEVKIFAT tipinde `calc.taxExemptionReason.kdv = '351'` üretiliyor (`document-calculator.ts:264`), ama mapper `shouldAddExemption` TEVKIFAT için `false` döndüğünden XML'e yansımıyor. M5 (Sprint 5) 351 cross-check matrisi full çözümü getirecek; **Sprint 4 ön-iş:** TEVKIFAT+351 kombinasyonunun kaybolmasını önleyen minimal kontrol ekle.

### 1.7 Sprint 1 Defensive Fix — `__tests__/calculator/document-calculator.test.ts:199-212`

```typescript
it('buyerCustomer varsa profil IHRACAT olmalı', () => {
  const result = calculateDocument(makeInput({
    type: 'ISTISNA',   // ← Sprint 1 defensive — M2 öncesi zorunluydu
    buyerCustomer: { name: 'Foreign Co', ... },
  }));
  expect(result.profile).toBe('IHRACAT');
});
```

Sprint 1 log'u: M2 sonrası IHRACAT = sadece ISTISNA zaten, tip otomatik türetilmeli. Sprint 4'te derivation netleşince **bu manuel `type: 'ISTISNA'` satırı kaldırılacak**; test yine yeşil kalmalı. (B-76 fix'i sonrası `buyerCustomer` tek başına IHRACAT'a zorlamayabilir — dikkat: test beklentisi ya güncellenir ya da input senaryosuna `kdvExemptionCode` gibi ek ipucu eklenir. İmplementasyonda karar verilecek, plana not.)

### 1.8 Diğer Sprint 4 Bulguları (Yerleri)

| Bulgu | Dosya | Mevcut Davranış |
|---|---|---|
| B-41 | `document-calculator.ts:216` | `typesArray.includes('TEVKIFAT')` mutlak öncelik — TEVKIFATIADE override edilemez |
| B-43 | `config-manager.ts:370-374,283-288` + `unit-config.ts:97-99,106-111` | `unit-config` lowercase normalize, ConfigManager değil — çift truth source |
| B-45 | `invoice-rules.ts:293-307` | `getAvailableExemptions` SGK/IADE için ISTISNA kodlarını listeye eklemiyor |
| B-47 | `invoice-rules.ts:216-232` | `resolveProfileForType` earchive+SGK kesişimi boş → sessiz yanlış TICARIFATURA fallback |
| B-79 | `invoice-rules.ts:270` | `showWithholdingTaxSelector` sade IADE'de `true` (TEVKIFATIADE değilse UI kirliliği) |
| B-80 | `simple-invoice-builder.ts:62-68` | `build()` `calculateDocument`'ı iki kez çağırıyor (UUID determinizmi + perf) |
| B-83 | `simple-invoice-mapper.ts:562-566` | KAMU `buyerCustomer` için `PartyIdentification` atanmıyor |

---

## 2. Hedef Durum

### 2.1 `document-calculator.ts` (B-15)

```typescript
// Satır 18-22 interface comment revize:
/** Σ line.lineExtensionAmount (indirim SONRASI toplam; UBL-TR normatif) */
lineExtensionAmount: number;
/** Σ line.lineExtensionAmount (alias; geriye kalanlar `lineExtensionAmount`'u kullanır) */
taxExclusiveAmount: number;

// Satır 107-108:
lineExtensionAmount += line.lineExtensionAmount;   // B-15: iskonto SONRASI
taxExclusiveAmount += line.lineExtensionAmount;    // aynı kaynak → zaten eşit
```

Not: B-15 sonrası `lineExtensionAmount === taxExclusiveAmount` identity'sine düşüyor; bu UBL spec'e uygun. `CalculatedLine.lineExtensionForMonetary` artık belge-seviyede kullanılmıyor — iç referansı kalıp kalmadığı gözden geçirilecek (aşağıda Soru #1).

### 2.2 M9 Yuvarlama

- Calculator: mevcut float akış **aynen korunur**. Yeni `toFixed`/`Math.round` eklenmez.
- Serializer:
  - `tax-serializer.ts:44` `Percent: formatDecimal(ts.percent, 2)` (0 → 2, B-42)
  - `tax-serializer.ts:95` `Percent: formatDecimal(ts.percent, 2)` (0 → 2, B-42 withholding)
  - Diğer yuvarlamalar değişmiyor.
- `formatDecimal` helper'ı disiplin olarak **yeni giriş noktaları için zorunlu** — herhangi bir serializer'da tutar/oran yazımı bu helper üzerinden geçecek (mevcut durum zaten uyumlu).

### 2.3 M10 setLiability

```typescript
setLiability(liability: CustomerLiability | undefined): void {
  if (this._isExport) return;  // M10: silent no-op
  const previousLiability = this._liability;
  this._liability = liability;
  if (previousLiability === liability) return;
  // ...kalan mevcut mantık aynen
}
```

Ek: `resolveProfile` / `setBuyerCustomer` içinde `isExport=true` iken profil IHRACAT, tip ISTISNA otomatik türetimi teyit edilir; eksikse tamamlanır.

### 2.4 AR-5 PayableRoundingAmount Tam İptal

- `src/types/common.ts:127` — `payableRoundingAmount` field tanımını sil
- `src/serializers/monetary-serializer.ts:23-26` — emit bloğunu sil
- `src/serializers/xsd-sequence.ts:487` — `LEGAL_MONETARY_TOTAL_SEQ` listesinden `PayableRoundingAmount` girdisini sil
- Testler: `grep -rn "payableRoundingAmount\|PayableRoundingAmount" __tests__/` → varsa testleri güncelle/sil

### 2.5 AR-7 Satır-seviyesi kdvExemptionCode

- `src/types/invoice-input.ts` içinde `InvoiceLineInput.kdvExemptionCode` **varsa silinir**, yoksa not düşülüp pas geçilir
- `SimpleInvoiceLine` (simple-types.ts) zaten tek kod destekli, değişiklik gerekmez

### 2.6 B-41/B-43/B-45/B-47/B-76/B-79/B-80/B-81/B-83 (Hedef)

| Bulgu | Fix Özeti |
|---|---|
| B-41 | `resolveInvoiceType` öncelik kuralı: önce `input.type` override (TEVKIFATIADE dahil), sonra `typesArray` |
| B-43 | `ConfigManager.resolveUnitCode` de lowercase normalize; `unit-config.resolveUnitCode` ile aynı behavior |
| B-45 | `getAvailableExemptions` matrisine Schematron 316/318/320 (SGK/IADE ISTISNA) tipleri eklenir |
| B-47 | `resolveProfileForType` earchive+SGK için: allowed boşsa `TICARIFATURA` fallback **yerine** `EARSIVFATURA` (liability=earchive iken tek meşru profil) |
| B-76 | `resolveProfile` buyerCustomer tek başına IHRACAT'a zorlamasın — `calculatedType === 'ISTISNA'` ya da kullanıcı profil override'sı olduğunda karar (M2 IHRACAT=ISTISNA identity'si ile uyumlu) |
| B-79 | `showWithholdingTaxSelector` yalnız TEVKIFATIADE'de `true`, sade IADE'de `false` |
| B-80 | `SimpleInvoiceBuilder.build` tek `calculateDocument` çağrısı; sonucu cache'le |
| B-81 | `shouldAddExemption` minimal ek: TEVKIFAT tipinde `calc.taxExemptionReason.kdv === '351'` ise `true` |
| B-83 | KAMU `buyerCustomer` için `PartyIdentification/@schemeID` ve `ID` mapping eklenir (aracı kurum tax number) |

---

## 3. Mimari Kararlar — Alt Görevler

### 3.1 M9 — Yuvarlama Sadece Serializer'da

**Yaklaşım:** Kod uzun zamandır zaten "calculator float, serializer toFixed" şeklinde. Sprint 4 bunu **yazılı disiplin** olarak sabitler ve B-42'yi düzeltir.

**Alt görevler:**
1. `tax-serializer.ts:44, 95` — `formatDecimal(ts.percent, 0)` → `formatDecimal(ts.percent, 2)` (2 basamak)
2. `src/utils/formatters.ts` — `formatDecimal` dokunma (zaten merkezi); isteğe bağlı mini JSDoc ekle: "M9: yuvarlama sadece serializer'da."
3. Regresyon: `grep -rn "toFixed\|Math.round" src/calculator/` sonucu boş kalmalı (kontrol)
4. Yeni test: `tax-serializer.test.ts` — `percent: 18.5` input → `<cbc:Percent>18.50</cbc:Percent>` çıktı (B-42 regression guard)

### 3.2 M10 — isExport Otomatik Derivation + setLiability No-op

**Alt görevler:**
1. `invoice-session.ts:setLiability` — ilk satıra `if (this._isExport) return;` ekle
2. `invoice-session.ts` constructor/setBuyerCustomer — `isExport=true` iken tip de ISTISNA'ya türet (M2 identity): profil zaten IHRACAT zorlanıyor, tip eksikse ISTISNA'ya zorla (Sprint 1 defensive fix kaldırılınca bu güvenilir çalışmalı)
3. `invoice-rules.ts:resolveProfile` — `isExport=true` girdisi için IHRACAT zorlaması (mevcut session seviyesinde var, helper seviyesinde de teyit)
4. Test: `invoice-session.test.ts` — `new InvoiceSession({isExport: true}).setLiability('earchive')` → liability değişmez, profil IHRACAT kalır, `liability-changed` event fırlatılmaz
5. Test: `document-calculator.test.ts` Sprint 1 defensive satır 201 `type: 'ISTISNA'` **kaldır**; test hâlâ yeşil kalmalı

### 3.3 B-15 — LegalMonetaryTotal.LineExtensionAmount

**Alt görevler:**
1. `document-calculator.ts:107` — `line.lineExtensionForMonetary` → `line.lineExtensionAmount`
2. `document-calculator.ts:19` interface comment düzelt (iskonto SONRASI)
3. `line-calculator.ts` — `CalculatedLine.lineExtensionForMonetary` alanını gözden geçir:
   - Tek tüketici: document-calculator.ts:107 (artık kullanılmıyor)
   - Karar (Soru #1): sil vs aliased olarak koru. Öneri: **sil** (AR-5 disipline uygun, opsiyonel kalıntı bırakma); calculator içindeki kullanımları (satır 96, 98) yerel değişkene dönüştür
4. Test: `document-calculator.test.ts` B-T03 (varsa) — iskontolu scenario beklenti güncelle (1000 → iskonto sonrası gerçek değer)
5. Yeni test: B-15 regresyon — 2 satır × iskonto → `result.monetary.lineExtensionAmount === Σ line.lineExtensionAmount`

### 3.4 AR-5 — B-40 PayableRoundingAmount Tam Temizlik

**Alt görevler:**
1. `types/common.ts:127` field sil (interface'den çıkar)
2. `serializers/monetary-serializer.ts:23-26` emit bloğunu sil
3. `serializers/xsd-sequence.ts:487` `LEGAL_MONETARY_TOTAL_SEQ` girdisini sil
4. `grep -rn "payableRoundingAmount\|PayableRoundingAmount" src/ __tests__/` → kalıntı kalmamalı
5. Yeni test (regression guard): `monetary-serializer.test.ts` — çıktıda `PayableRoundingAmount` etiketi **yok** assertion

### 3.5 AR-7 — InvoiceLineInput.kdvExemptionCode Temizlik

**Alt görevler:**
1. `types/invoice-input.ts` — `InvoiceLineInput.kdvExemptionCode` alanı var mı kontrol; varsa sil
2. Yoksa: plan satırı "pass" olarak işaretlenir, commit mesajına not düşülür

### 3.6 B-81 — Mapper TEVKIFAT+351 Minimal Fix

**Alt görevler:**
1. `simple-invoice-mapper.ts:242` — `shouldAddExemption` koşuluna ek:
   ```typescript
   if (type === 'TEVKIFAT' && ts.code === '0015' && calc.taxExemptionReason.kdv === '351') return true;
   ```
2. Test: `simple-invoice-mapper.test.ts` — TEVKIFAT input → XML'de `TaxExemptionReasonCode=351` ve `TaxExemptionReason` mevcut
3. Not: M5 full cross-check matrisi Sprint 5'e — bu fix **minimal**, kapsam taşma yok

### 3.7 Diğer Bulgular (B-41/B-43/B-45/B-47/B-76/B-79/B-80/B-83)

Her biri lokalize küçük fix; detay §1.8 ve §2.6'da verildi. Test etkisi mutedil (mevcut test'ler güncellenecek, kritik yeni test B-41 TEVKIFATIADE override + B-76 buyerCustomer non-export senaryosu).

---

## 4. Adım Adım İmplementasyon Sırası

Bağımlılık sırası:

1. **M9 disiplin kontrolü (temiz ortam)** — `grep -rn "toFixed\|Math.round" src/calculator/` boş teyit; yeni `toFixed`/`Math.round` calculator'a girmemesi prensibini yaz (kod yorumu ekleme yok; sadece PR disiplini)
2. **B-42 fix (M9 küçük dokunuş)** — `tax-serializer.ts:44,95` percent basamak 0 → 2
3. **AR-5 tam temizlik** — `common.ts`, `monetary-serializer.ts`, `xsd-sequence.ts` kaldır; regresyon testi
4. **B-15 fix** — `document-calculator.ts:107` + interface comment; `lineExtensionForMonetary` alanını sil (soru #1 cevabına göre)
5. **M10 setLiability no-op** — `invoice-session.ts:setLiability` guard + `isExport=true` tip ISTISNA türetimi
6. **B-76 resolveProfile düzeltme** — buyerCustomer tek başına IHRACAT zorlamasın (bu davranış değişimi defensive temizlikten ÖNCE yapılır — aksi halde Adım 7 defensive test'i B-76 öncesi zincire yaslanıp, B-76 sonrası kırılabilirdi)
7. **Sprint 1 defensive temizlik** — `document-calculator.test.ts:201` `type: 'ISTISNA'` kaldır; test yeşil doğrula. B-76 sonrası `buyerCustomer` tek başına IHRACAT'a zorlamıyorsa input'a ek ipucu eklenir: `kdvExemptionCode: '350'` veya profil override (`profile: 'IHRACAT'`). Kararı adımda ver; gerekçeyi implementation-log'a düş
8. **AR-7 InvoiceLineInput.kdvExemptionCode** — varsa sil, yoksa pass
9. **B-81 mapper minimal fix** — `shouldAddExemption` TEVKIFAT+351 korunur
10. **B-41 TEVKIFATIADE override** — `resolveInvoiceType` öncelik kuralı
11. **B-43 unit-code case-sensitive** — `ConfigManager.resolveUnitCode` lowercase normalize
12. **B-45 getAvailableExemptions SGK/IADE** — matrise ekleme
13. **B-47 earchive+SGK fallback** — `resolveProfileForType` EARSIVFATURA
14. **B-79 showWithholdingTaxSelector IADE** — TEVKIFATIADE'ye daralt
15. **B-80 SimpleInvoiceBuilder çift çağrı** — tek `calculateDocument` + cache
16. **B-83 KAMU PartyIdentification** — mapper eşleme
17. **Test güncelleme + yeni testler** — Her değişiklik için ilgili test'i hizala; yeni testleri ekle (M9 regression, M10 no-op, B-15 regression, AR-5 regression, B-41 override, B-76 non-export, B-81 TEVKIFAT+351)
18. **F10/F11 stopaj regresyon fixture (opsiyonel)** — Mimsoft gerçek faturalarından türetilmiş sayısal değerler ile regresyon test'i; stopaj davranışının "dokunulmamış" olduğunu kanıtlar
19. **`yarn test` yeşil + `yarn build` clean**
20. **`audit/sprint-04-implementation-log.md` yaz** — kararlar, sırası, soru cevapları
21. **Commit + push** — Sprint 4 tek commit veya mantıksal mini-commit'ler; release/tag **yok** (FIX-PLANI-v3 disiplin)

---

## 5. Cross-Reference Kontrolü

Implementasyon sırasında/sonrasında:

| Komut | Beklenen |
|---|---|
| `grep -rn "toFixed\|Math.round" src/calculator/` | **Boş** (M9 disiplin) |
| `grep -rn "lineExtensionForMonetary" src/ __tests__/` | **Boş** (B-15 + alan silindikten sonra) |
| `grep -rn "payableRoundingAmount\|PayableRoundingAmount" src/ __tests__/` | **Boş** (AR-5) |
| `grep -rn "setLiability" src/` | Sadece `invoice-session.ts` + testler; ilk satırda `isExport` guard var |
| `grep -rn "isExport" src/calculator/invoice-session.ts` | Hem constructor hem setLiability hem setBuyerCustomer'da tutarlı |
| `grep -rn "kdvExemptionCode" src/types/` | Sadece `SimpleInvoiceInput` ve `TaxSubtotalInput` (document-level); line-level yok |

---

## 6. Test Stratejisi

### 6.1 Mevcut Test Güncellemeleri

- `__tests__/calculator/document-calculator.test.ts`
  - Satır 201 `type: 'ISTISNA'` **kaldır** (Sprint 1 defensive temizlik); B-76 fix sonrası test yeşil kalacak mı kontrol (eğer buyerCustomer tek başına IHRACAT döndürmezse input'a `kdvExemptionCode` veya başka ipucu ekle)
  - B-T03 (varsa iskontolu scenario) — beklenen `lineExtensionAmount` iskonto sonrası değere güncelle
- `__tests__/calculator/line-calculator.test.ts` — Stopaj test'leri **değişmez** (B-17 korunur)
- `__tests__/serializers/monetary-serializer.test.ts` — PayableRoundingAmount ile ilgili test'ler varsa **sil/güncelle**
- `__tests__/serializers/tax-serializer.test.ts` — Percent 2-basamak beklentisi (18.5 → "18.50")
- `__tests__/builders/invoice-builder.test.ts` — setLiability + isExport testleri güncellenir

### 6.2 Yeni Test'ler

| Test | Konu |
|---|---|
| M9 B-42 regression | `percent: 18.5` input → XML'de `18.50` (kesirli oran korunur) |
| M10 setLiability no-op | `InvoiceSession({isExport:true}).setLiability('earchive')` → `_liability` değişmez, profil IHRACAT, event yok |
| B-15 regression | 2 satır × iskonto → `monetary.lineExtensionAmount === Σ line.lineExtensionAmount` (iskonto sonrası identity) |
| AR-5 regression | Monetary XML çıktısında `PayableRoundingAmount` etiketi **yok** |
| B-41 override | `input.type='TEVKIFATIADE'` + `typesArray=['TEVKIFAT']` → `calculatedType === 'TEVKIFATIADE'` |
| B-76 buyerCustomer non-export | `buyerCustomer` var + `kdvExemptionCode='350'` → profil **override edilmedikçe IHRACAT'a zorlanmaz** (yerine `calculatedType` bazlı karar) |
| B-81 TEVKIFAT+351 | TEVKIFAT input → XML'de `TaxExemptionReasonCode=351` ve açıklama |

### 6.3 Stopaj Regresyon Fixture'ı (Opsiyonel)

Mimsoft F10/F11 değerleri ile fixture (`__tests__/calculator/fixtures/mimsoft-stopaj.json` veya inline):

```typescript
// F10: 0003 Gelir Vergisi Stopajı
it('Mimsoft F10: 0003 %23 stopaj TaxInclusive=14.550', () => {
  const result = calculateDocument({
    lines: [{ name: 'Hizmet', quantity: 1, price: 15000, kdvPercent: 20, incomeWithholdingTaxCode: '0003', incomeWithholdingTaxPercent: 23 }],
  });
  expect(result.monetary.taxInclusiveAmount).toBeCloseTo(14550, 2);
});

// F11: 0011 Kurumlar Stopajı
it('Mimsoft F11: 0011 %32 stopaj TaxInclusive=13.200', () => {
  ...
  expect(result.monetary.taxInclusiveAmount).toBeCloseTo(13200, 2);
});
```

Bu test'ler Sprint 4 boyunca **hiç bozulmamalı** — stopaj davranışının dokunulmazlığının kanıtı.

### 6.4 Kırmızı Olursa

`yarn test` sonrası kırmızı test varsa:
- **M9 kaynaklı (0 → 2 basamak):** beklenen davranış değişimi, test güncelle
- **B-15 kaynaklı (Σ eşitliği):** beklenen davranış değişimi, test güncelle
- **M10 kaynaklı (state korunumu):** beklenen davranış değişimi, test güncelle
- **Stopaj regresyonu:** **KOD REGRESYONU** — stopaja dokunulmuş, geri al
- **Diğer:** Vaka vaka analiz

---

## 7. Risk ve Edge Case

- **R1 (KRİTİK — stopaj):** `line-calculator.ts:128-130,181` `baseStat=false ? taxForCalculate *= -1`, `taxes.taxTotal = Σ amount`, `taxes.taxForCalculate = Σ taxForCalculate`, `taxInclusiveForMonetary = lineExtensionAmount + taxes.taxForCalculate` — **DOKUNMA**. Mimsoft F10/F11 kanıtıyla UBL-TR uyumlu. Bu bölgeye yakın değişiklik yapıldığında stopaj regresyon testi (F10/F11) yeşil kalmalı.
- **R2 (M9):** Mevcut kodda `toFixed`/`Math.round` calculator'da yok, dolayısıyla "temizlik" nominal. Risk: yeni kod eklenirken disiplin bozulabilir — PR review ve grep assertion ile koru.
- **R3 (B-15):** `lineExtensionForMonetary` alanı silinince etkilenen her tüketici (yerel değişken dönüşümü, test dosyası) audit'li şekilde güncellenmeli. Silme yerine alan korumayı seçersek (Soru #1) kod kirliliği artar.
- **R4 (M10):** `isExport=true` iken `setLiability` no-op — sessiz başarısızlık kullanıcıyı şaşırtabilir. Dokümanda ve (opsiyonel) debug log'da belirtilir.
- **R5 (B-76):** `buyerCustomer` artık tek başına IHRACAT demek değil — KAMU/YOLCU senaryolarına dokunuluyor. Mevcut test'ler kırılabilir; dikkatli güncelleme.
- **R6 (Sprint 1 defensive — sıra kritik):** Sırada **M10 → B-76 → defensive temizlik** sabit. Gerekçe: M10 `isExport`/IHRACAT derivation yerleşir; B-76 `buyerCustomer`-tek-başına-IHRACAT zorlamasını kaldırır; ancak ardından defensive `type: 'ISTISNA'` kaldırılır. Böylece test B-76 sonrası davranışla yüzleşir. B-76 sonrası `buyerCustomer` tek başına IHRACAT profili üretmiyorsa, test input'una ek ipucu (`kdvExemptionCode: '350'` veya `profile: 'IHRACAT'` override) eklenir — kararı Adım 7'de ver.
- **R7 (AR-7):** `InvoiceLineInput.kdvExemptionCode` silinirse, `SimpleInvoiceBuilder` seviyesinde tek kod desteği devam (public API etkisi yok). Bu alanı referans veren test/örnek varsa temizlenir.
- **R8 (JS float):** `0.1 + 0.2 = 0.30000000000000004` — calculator float akışı yazım anına kadar gelip `toFixed(2)` "0.30" olarak çıkar. Calculator içi karşılaştırmalarda epsilon gerekmez (mevcut kod `===` kullanmıyor).

---

## 8. Kapsam Dışı (TODO — Sonraki Sprint'ler)

| Madde | Sprint | Not |
|---|---|---|
| B-06 TaxExemption cross-check matrisi | Sprint 5 (M5) | Esas iş |
| B-07 IHRACKAYITLI+702 | Sprint 5 | |
| B-08 YatirimTesvikKDV / LineKDV validator | Sprint 5 | |
| M5 full 351 cross-check | Sprint 5 | Sprint 4'te B-81 minimal ön-iş |
| Despatch extensions (B-19, B-48-B-53, AR-2) | Sprint 6 | |
| Test konsolidasyonu + B-T01..B-T10 hizalama | Sprint 7 | B-T04 iptal (B-17 bağımlısı) |
| README + Skill + CHANGELOG + v2.0.0 release | Sprint 8 | Sprint 1-7 implementation-log'ları konsolide |

---

## 9. Çıktı Listesi

- `audit/sprint-04-plan.md` — kullanıcı onayından sonra bu plandan konsolide edilir (opsiyonel; bu plan dosyası doğrudan kaynak kabul edilebilir)
- `audit/sprint-04-implementation-log.md` — implementasyon sonu
- (Opsiyonel) `__tests__/calculator/fixtures/mimsoft-stopaj.json` veya inline — F10/F11 stopaj regresyon fixture'ı
- Kod değişiklikleri: §3'teki 7 alt görev ve §4'teki 21 adımlı sıra

---

## 10. Netleştirme Cevapları (Kullanıcı Onayı Alındı)

- **Karar #1 — `lineExtensionForMonetary` tamamen silinir.** AR-5 disipline paralel, opsiyonel kalıntı bırakılmaz. `line-calculator.ts` satır 57 (interface), 91 (hesaplama), 96/98 (iç kullanım), 219 (return) tümü güncellenir — iç hesaplamalarda yerel değişkene dönüştürülür. `document-calculator.ts:19` interface comment güncellenir. Alan `CalculatedLine` export'undan çıkar.

- **Karar #2 — Mimsoft F10/F11 stopaj regresyon fixture'ı eklenir.**
  - `__tests__/calculator/fixtures/mimsoft-stopaj.test.ts` veya `document-calculator.test.ts` içinde inline iki test:
    - F10: `incomeWithholdingTaxCode='0003'`, `percent=23` → `taxInclusiveAmount ≈ 14550`
    - F11: `incomeWithholdingTaxCode='0011'` veya ilgili kurumlar stopaj kodu, `percent=32` → `taxInclusiveAmount ≈ 13200`
  - Stopaj davranışına Sprint 4 boyunca dokunulmamış olması garantisi. Kırmızı olursa R1 ihlali — kodu geri al.

- **Karar #3 — Mantıksal alt commit'ler (5-6 commit).** Planlanan sıra:
  1. `Sprint 4: M9 + B-42 — percent 2-basamak yuvarlama`
  2. `Sprint 4: AR-5 — PayableRoundingAmount tam iptal`
  3. `Sprint 4: B-15 + lineExtensionForMonetary silindi`
  4. `Sprint 4: M10 — setLiability no-op + isExport derivation + defensive temizlik`
  5. `Sprint 4: yan bulgular — B-41/B-43/B-45/B-47/B-76/B-79/B-80/B-81/B-83`
  6. `Sprint 4: test güncellemeleri + F10/F11 fixture + implementation-log`
  - Her commit'te `yarn test` yeşil tutulur; bisect kolaylığı. Tek release yok (Sprint 8'de v2.0.0).

---

## 11. Tahmini Süre

**3 gün** (FIX-PLANI-v3 uyumlu).

| Gün | Kapsam |
|---|---|
| Gün 1 | M9 (B-42), AR-5 (PayableRoundingAmount), B-15 (document-calculator + lineExtensionForMonetary) + ilgili testler |
| Gün 2 | M10 (setLiability + isExport derivation), Sprint 1 defensive temizlik, B-76, AR-7, B-81 + testler |
| Gün 3 | B-41, B-43, B-45, B-47, B-79, B-80, B-83 + tüm test hizalama + `yarn test` yeşil + implementation-log |

Risk: B-76 test güncellemeleri zaman alabilir (KAMU/YOLCU senaryoları). Tahmin tutmazsa Sprint 5'ten değil, Sprint 4 içinde scope disiplin — minimum kapsam: M9, M10, B-15, AR-5, AR-7, B-81 (ana mimari). Yan bulgular (B-41/B-43/B-45/B-47/B-76/B-79/B-80/B-83) zorunda kalırsa Sprint 5'e taşınır.
