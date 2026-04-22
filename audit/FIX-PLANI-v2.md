---
plan: json2ubl-ts düzeltme yol haritası v2 (cevap-revize)
tarih: 2026-04-22
kaynak: SONUC-konsolide-bulgular.md + ACIK-SORULAR.md cevapları (25/25 cevaplandı)
onceki_plan: FIX-PLANI.md (v1)
toplam_sprint: 8 (sprint sayısı aynı; kapsam revize)
tahmini_sure_gun: 19-23 (mimari revizyonlar +1-2 gün)
hedef_surum: v2.0.0
---

# json2ubl-ts — Fix Planı v2 (Cevap-Revize)

> Açık Sorular (ACIK-SORULAR.md) cevaplarına göre FIX-PLANI.md revize edilmiştir. Bu dosya v1'i değiştirmez, **v1'e ek katman**tır. v2 yürürlükte; v1 tarihî referanstır.

## Değişiklik Özeti (v1 → v2)

| Kategori | Sayı | Açıklama |
|---|---|---|
| **A** İptal edilen bulgu | **4** | Cevap bulguyu geçersiz kıldı |
| **B** Sorgulanan bulgu | **2** | Tekrar analiz — 1 bulgu KORUNUR, 2 bulgu **kullanıcı teyit bekleyen** |
| **C** Mimarisi değişen bulgu grubu | **8 karar, ~18 bulgu** | Çözüm yaklaşımı değişti |
| **D** Tasarımı genişleyen bulgu | **2** | UI/config katmanı genişledi |
| **E** Değişmeyen bulgu | **~85** | Öneri doğrudan onaylandı |

### Kategori A — İptal Edilen Bulgular (4)

| Bulgu ID | Eski ciddiyet | İptal sebebi (Açık Soru) |
|---|---|---|
| **B-16** OZELMATRAH TaxTotal birleştirme | KRİTİK | **#19:** Kütüphane davranışı doğru. GİB kalemde KDV var ancak fatura dip toplamında dahil değil. |
| **B-50** Kısmi gönderim (Outstanding/Oversupply) | YÜKSEK | **#25e:** Eklemeyelim, şu an gerek yok. |
| **B-75** Damga V./Konaklama V. matrah düşümü | ORTA | **#24:** Kütüphane doğru, değişiklik yok. |
| **B-82** Satır-bazlı kdvExemptionCode | ORTA | **#21:** Eklemeyelim, SimpleInvoiceBuilder tek kod desteği devam. |
| **B-103** ConfigManager multi-tenant | DÜŞÜK | **#22:** Tasarım zaten amaçlandığı gibi; hot-reload için overwrite tüm sisteme yansımalı — doküman yeter. |

> **Not:** B-103 dokümantasyon bulgusuydu; iptal = "ek uyarı yazmayacağız, mevcut davranış amaçlı". B-102 (test izolasyonu) ayrı, kalır.

### Kategori B — Sorgulanan Bulgular (Tekrar Analiz)

#### B-15 LegalMonetaryTotal.LineExtensionAmount (Açık Soru #17)

**Kullanıcının yanıtı:** "LegalMonetaryTotal.LineExtensionAmount iskonto yapılmış değer, Line.LineExtensionAmount da iskonto yapılmış değer. Lines toplamı doğal olarak direk eşitliği zaten sağlar. Tekrar analiz gerekli."

**Tekrar analiz — kod-skill karşılaştırması:**

**`src/calculator/line-calculator.ts:55-59,91,102,202-203`:**
- `lineExtensionForMonetary = price × quantity` (iskonto **öncesi**)
- `lineExtensionAmount = lineExtensionForMonetary - allowance.amount` (iskonto **sonrası**)
- `CalculatedLine` iki farklı alan export ediyor

**`src/calculator/document-calculator.ts:107-108`:**
```typescript
lineExtensionAmount += line.lineExtensionForMonetary;   // ← iskonto ÖNCESİ
taxExclusiveAmount += line.lineExtensionAmount;          // ← iskonto SONRASI
```

**`DocumentMonetary.lineExtensionAmount`** → Serializer `LegalMonetaryTotal/cbc:LineExtensionAmount` XML'e yansıtır.
**`CalculatedLine.lineExtensionAmount`** → Serializer `InvoiceLine/cbc:LineExtensionAmount` XML'e yansıtır.

**Sonuç:**
- Kütüphane **şu an**: Belge LineExt = iskonto ÖNCESİ, Satır LineExt = iskonto SONRASI → iskontolu faturalarda **Σ satır ≠ belge** (UBL ihlali).
- Kullanıcının istediği: "ikisi de iskontolu" — bu **zaten denetim bulgusunun fix yönü**.

**Karar:** **B-15 KORUNUR.** Kullanıcı muhtemelen kodun şu anki halinin farkında değil; fix, kullanıcının istediği davranışı gerçekleştiriyor. Sprint 4'te düzeltme:
- `document-calculator.ts:107` → `line.lineExtensionAmount` (iskonto sonrası) kullan
- `lineExtensionForMonetary` alanı kaldırılabilir veya başka amaçla korunur
- **Breaking değil** — kullanıcının istediği davranış, önceki davranış semantik hataydı
- **B-T03 (test beklentisi)** → 1000 yerine 850 güncellensin (v1 planı gibi)

#### B-17 Stopaj TaxInclusive aritmetik (Açık Soru #18)

**Kullanıcının yanıtı:** "Bazı vergiler matrahı arttırmaz düşürür. O yüzden negatif yansır. XMLe pozitif gözükür ancak matrah hesabı kdv hesabı gibi durumları indirimmiş gibi davrandırabilir. O kısımda kütüphanenin calculator ını baz alıyoruz. (...) Bu konuda calculator mutlak doğru."

**Tekrar analiz — mevcut davranış:**

`line-calculator.ts:128-130,181`:
- `baseStat=false` (stopaj) ise `taxForCalculate *= -1` (matrah düşüm etkisi)
- `taxes.taxTotal = Σ amount` (pozitif)
- `taxes.taxForCalculate = Σ taxForCalculate` (negatif dahil)
- `taxInclusiveForMonetary = lineExtensionAmount + taxes.taxForCalculate` (negatif ile)

`document-calculator.ts:112,109`:
- `taxTotalAmount += line.taxes.taxTotal` (pozitif — XML'e pozitif yansır)
- `taxInclusiveAmount += line.taxInclusiveForMonetary` (satırdan — indirim etkisi korunur)

**Mevcut davranış kullanıcı tarifiyle BİREBİR:**
- XML'de TaxTotal pozitif ✓
- TaxInclusive matrah "indirim" etkisiyle düşük ✓
- Calculator mutlak doğru ✓

**Sonuç:** **B-17 SORGULANIYOR (muhtemelen İPTAL).** Denetim "aritmetik tutarsızlık" olarak raporlamıştı; kullanıcı calculator'un tam olarak bu modeli uyguladığını ve doğru olduğunu söylüyor. Denetimde gözlenen "tutarsızlık" aslında **amaçlı davranış** — UBL 2.1 arithmetic constraint (`TaxInclusive = TaxExclusive + Σ TaxAmount`) satır seviyesinde sağlanmıyor gibi görünüyor çünkü stopaj model'de negatif/pozitif ayrımı var.

> **Bu nokta belirsiz, kullanıcıya teyit gerekli:** "XML'de TaxInclusiveAmount ile TaxExclusiveAmount + Σ TaxTotal eşitliği Schematron/GİB tarafından kontrol ediliyor mu? Eğer ediliyorsa stopaj çıktısı nasıl eşleniyor? Prod log kontrolü gerekli."

**Karar:** Sprint 4'te **B-17 pas geç**; Sprint 7'de **B-T04 testini koru veya kullanıcı teyidi sonrası güncelle**. Mimsoft email'inde bu soru var (Madde 6).

### Kategori C — Mimarisi Değişen Bulgular

#### C1 [Açık Soru #2] → B-54, B-55, B-56: IHRACAT/YOLCU/OZELFATURA tek tip ISTISNA

**Önceki yaklaşım (v1 öneri):** Serbest yorum — `constants.ts` 9 tip (TICARIFATURA kopyası) kalacak, `rules.ts` constants ile hizalansın.

**Yeni yaklaşım:** **Kısıtlı — bu 3 profilin TEK TİPİ ISTISNA.** Normatif kaynak (Schematron/Codelist) sessiz, ama kullanıcı kararı açık: "ne dökümanı, ne de normatif kaynağı dinlemiyoruz."

**Uygulama (Sprint 1):**
- `src/config/constants.ts:33-36` `PROFILE_TYPE_MATRIX`:
  - `IHRACAT: ['ISTISNA']`
  - `YOLCUBERABERFATURA: ['ISTISNA']`
  - `OZELFATURA: ['ISTISNA']`
- `rules.ts` otomatik bu değerden türetilir (Açık Soru #1 ile paralel).
- Ters yön `TYPE_PROFILE_MAP`: ISTISNA → IHRACAT/YOLCU/OZELFATURA dahil edilir.

**Breaking:** Evet. TICARIFATURA IHRACAT vb. yaygın olmayan kombinasyonlar reddedilecek; prod log kontrolü gerekmez (kullanıcı yöneticisi bu kararı verdi).

---

#### C2 [Açık Soru #6] → B-04, B-27, B-S01: Tevkifat 650 dinamik mekanizma

**Önceki yaklaşım (v1 öneri):** "Şimdi ekleme, Mimsoft teyit bekle."

**Yeni yaklaşım:** **650 kodu eklenir, dinamik yüzde mekanizmasıyla.** 650XX formatı (XX = kullanıcıdan gelen 0-100 arası yüzde).

**Yapısal Karar:**
- 650 = **DİĞER** etiketli, kullanıcı-tanımlı yüzde destekli özel kategori
- Diğer 6xx kodları (601, 602, ...) sabit Codelist kombinasyonları
- `WithholdingTaxInput`/config tipine yeni ayrım eklenmeli

**Uygulama (Sprint 2):**
- `src/calculator/withholding-config.ts` — 650 için yeni config kaydı:
  ```typescript
  {
    code: '650',
    name: 'Diğer (Kullanıcı Tanımlı)',
    type: 'dynamic_percent',     // ← YENİ kategori
    percent: null,                 // ← kullanıcıdan gelecek
    allowedRange: { min: 0, max: 100 },
  }
  ```
- `src/types/invoice-input.ts` — satır seviyesinde `withholdingTaxPercent?: number` (kod 650 seçilirse zorunlu)
- `src/validators/` — 650 seçildiğinde percent 0-100 arası kontrol; diğer 6xx için percent input'u kabul edilmez
- `src/calculator/line-calculator.ts:163-178` — 650 için `whDef.percent` yerine `line.withholdingTaxPercent`
- `src/config/constants.ts:130-183` `WithholdingTaxTypeWithPercent` Set: 65000-65099 aralığı (kullanıcı tanımlı percent + 650 prefix) + diğer 6xx sabitleri

**Yeni alt görevler:**
- Type sisteminde `DynamicPercentWithholding` ayrı union
- Validator: 650 seçildi ama percent verilmedi → error
- Validator: 650 seçildi, percent 0-100 aralığı dışı → error
- Skill (`kod-listeleri-ubl-tr-v1.42.md §4.9`): 650 iç çelişkisi notu + kütüphane yaklaşımı dokümante

**Breaking:** Hayır (yeni özellik). Mevcut kullanıcılar 650 kullanmıyorsa etkilenmez.

---

#### C3 [Açık Soru #10] → B-05, B-S03: 555 flag mekanizması (kütüphane logic değil, gate)

**Önceki yaklaşım (v1 öneri):** "Ayrı set DEMIRBAS_KDV_EXEMPTION_CODES, cross-check'te özel kategori."

**Yeni yaklaşım:** **555 kütüphane logic YAPMAZ; tüketici (edocument-service/portal) explicit flag ile aktive eder.** 555 kodu "KDV oranı sınırlaması" istenirse aktive olacak — kütüphane bu iş kuralını içermez, sadece gate sağlar.

**Yapısal Karar:**
- Kütüphane "farklı KDV'den kesme" logic'ini uygulamaz
- `BuilderOptions.allowReducedKdvRate?: boolean` flag (varsayılan `false`)
- Flag `true` ise 555 kodu kabul edilir
- Flag `false` (default) ise 555 reddedilir
- 555 kullanımında KDV oranı 0 dışı değer alabilir (tüketici kontrolü)

**Uygulama (Sprint 2 + Sprint 5):**
- `src/types/builder-options.ts` (veya mevcut) — `allowReducedKdvRate?: boolean`
- `src/validators/tax-exemption-validator.ts` — 555 kontrolü flag'a bağlı
- `src/config/constants.ts` — 555 ayrı set içinde ama validator bypass flag ile
- `README.md` — Sorumluluk Matrisi'nde: "555 işlem mantığı kütüphane dışıdır; aktive eden sistem iş kuralını uygular"
- Örnek: `new SimpleInvoiceBuilder({ allowReducedKdvRate: true }).build(...)`

**Breaking:** Hayır. Default davranış = 555 yok; opt-in.

---

#### C4 [Açık Soru #12] → B-25, B-81: 351 kodu non-ISTISNA tiplerinde

**Önceki yaklaşım (v1 öneri):** "351 ISTISNA tipinde, constants + exemption-config senkron."

**Yeni yaklaşım — Kullanıcı 351'in semantiğini TERS yönde açıkladı:**
- 351 = **"İstisna olmayan diğer"** — ISTISNA *olmayan* faturalarda kullanılır
- Kalemde KDV 0 var ama fatura tipi ISTISNA DEĞİLSE → 351 zorunlu
- **SATIS+351 DOĞRU** kombinasyon (hatta kalemde KDV 0 varsa şart)
- ISTISNA tipinde 301-350 kullanılır, 351 kullanılmaz

**Cross-check matrisi (Sprint 5 — B-06 ile birleşik):**
```typescript
TAX_EXEMPTION_MATRIX: {
  '351': {
    allowedTypes: ['SATIS', 'TEVKIFAT', 'KOMISYONCU', 'SGK', 'IHRACKAYITLI', ...], // tüm non-ISTISNA
    forbiddenTypes: ['ISTISNA', 'IADE', 'TEVKIFATIADE'],
    requiresZeroKdvLine: true, // kalemde KDV 0 var ise zorunlu
  },
  // 301-350 için ayrı tanım
}
```

**Uygulama:**
- `src/calculator/exemption-config.ts` — 351 tanımı "diğer istisna olmayan" olarak güncellensin
- `src/config/constants.ts:186-200` `ISTISNA_TAX_EXEMPTION_REASON_CODES` 351 içermemeli; ayrı bir set (ör. `NON_ISTISNA_REASON_CODES = new Set(['351'])`)
- Mapper (`simple-invoice-mapper.ts:232-246`) `shouldAddExemption` → TEVKIFAT+351 kaybolmasın (B-81 düzeltme); hatta kalemde KDV 0 varsa otomatik 351 önersin (opsiyonel)
- Cross-check: SATIS + 351 doğru, ISTISNA + 351 yanlış

> **Not (B-07/B-08):** Kullanıcı "IHRACKAYITLI+702 kontrolü ve YatirimTesvikKDVCheck/YatirimTesvikLineKDVCheck kuralları normatif öyle diyorsa öyle olmalı, direk eklenmeli" dedi. 351 ile ilişkilendirme yanlıştı. B-07 ve B-08 v1 planında Sprint 5'te ayrı, onlar aynen devam.

**Breaking:** Evet (mevcut SATIS+351 fatura üreten kullanıcıya anlamlı hale gelir; önceki davranış reddediyordu).

---

#### C5 [Açık Soru #13] → B-32, B-33, B-34, B-35, B-70: Parent-child conditional zorunluluk

**Önceki yaklaşım (v1 öneri):** "XSD minOccurs=1 → TS `required` zorla."

**Yeni yaklaşım:** **Parent-child conditional:** parent objesi opsiyonel, parent var ise child zorunlu.

**Yapısal Karar:**
- TypeScript tipi: `DocumentReference` alanları required; `documentReferences?: DocumentReference[]` opsiyonel (parent)
- Üst obje yoksa → çocuk zorunluluğu tetiklenmez
- Üst obje var ama çocuk eksik → hata

**Uygulama (Sprint 3):**
- `src/types/invoice-input.ts` — etkilenen tüm tipleri revize:
  - `DocumentReference = { id: string; issueDate: string; /* ... */ }` (tüm alanlar required; obje opsiyonel)
  - `OrderReference = { id: string; issueDate: string }` (aynı pattern)
  - `Party = { ...; postalAddress?: PostalAddress }` — ama `PostalAddress = { cityName: string; citySubdivisionName: string; ... }` (verilirse dolu)
  - `PostalAddress` — `cityName` + `citySubdivisionName` required
  - `PaymentMeans = { paymentMeansCode: string; ... }` (paymentMeans objesi opsiyonel; verilirse code zorunlu)
- Runtime validator — parent var + child eksik kontrol (kabul edilen input)
- cbcTag utility (B-97) — required element için boş → throw

**Breaking:** Evet. Parent kullanan fakat child eksik bırakan kullanıcılar compile-time hata görür. Önceki davranış sessiz XSD fail'di.

---

#### C6 [Açık Soru #16] → B-38: Fatura + İrsaliye ikisi de TR1.2

**Önceki yaklaşım (v1 öneri):** "Fatura TR1.2, İrsaliye TR1.2.1 ayrı sabitler."

**Yeni yaklaşım:** **Her ikisi de TR1.2.** Gönderilmiş belgeler bu şekilde; tek değer.

**Uygulama (Sprint 6 veya erkene alınabilir):**
- `src/config/namespaces.ts:28` — `UBL_CUSTOMIZATION_ID = 'TR1.2'` (mevcut `TR1.2.1` değiştirilsin)
- **Ayrı sabitler gereksiz.** Fatura ve İrsaliye aynı değer kullanır.
- Eğer gelecekte farklılaşırsa ayrıştırılır, şimdi değil.

**Breaking:** Evet (mevcut çıktı değerini TR1.2.1 → TR1.2'ye değiştiriyor). v2.0.0 major bump kapsamında.

---

#### C7 [Açık Soru #20] → B-42, B-46: Yuvarlama sadece serializer'da

**Önceki yaklaşım (v1 öneri):** "Round-half-away, satır önce sonra belge, PayableRoundingAmount ile kuruş farkı çöz."

**Yeni yaklaşım:** **Hiçbir hesapta yuvarlama yok.** Tüm matematik tam açık float. Yuvarlama sadece XML yazım anında, XSD şemasında yuvarlama bekleyen anahtarlarda uygulanır — hesaba yansımaz.

**Yapısal Karar:**
- Calculator: float, yuvarlama yok (mevcut davranış korunur)
- Serializer: her XSD-yuvarlamalı key için `toFixed(2)` (veya ilgili basamak) — ama sadece o key'in yazımı için; iç hesaba dönmez
- B-40 (PayableRoundingAmount) ihtiyacı kalkar — çünkü hesap yuvarlanmıyor, sapma oluşmuyor
- B-42 (Percent 0-basamak) — yine sadece serializer yuvarlama; calculator değişmez (mevcut float %18.5 doğru)
- B-46 (satır/belge yuvarlama) — kalkar; hesap tek yerden float

**Uygulama (Sprint 4):**
- `src/serializers/tax-serializer.ts:36,73` — `formatDecimal(percent, 2)` (kesirli oran için)
- Tüm calculator dosyaları — `toFixed`/`Math.round` varsa sil
- `src/utils/xml-helpers.ts:42-48` — amount formatter `toFixed(2)` sadece burada
- **B-40 (PayableRoundingAmount)** — kullanıcı talep ederse opsiyonel; şu an kalkar

**Breaking:** Evet (hesap çıktısı float olur, XML'e düşerken yuvarlanır — downstream sayı karşılaştırması float-strict yapmamalı).

---

#### C8 [Açık Soru #23] → B-44: setLiability + isExport kontrat

**Önceki yaklaşım (v1 öneri):** "Error fırlat — EARCHIVE_EXPORT_CONFLICT."

**Yeni yaklaşım:** **isExport=true iken liability dikkate alınmaz.** Profil her zaman IHRACAT ve altında şekillenir. `setLiability('earchive')` çağrısı no-op olur (sessizce ignore).

**Uygulama (Sprint 4):**
- `src/calculator/invoice-session.ts:186-208` — `setLiability()` içinde `if (this.isExport) return this;` (veya loglu no-op)
- `src/calculator/invoice-rules.ts:76-93` — `resolveProfile` — isExport=true → IHRACAT zorla, liability ignore
- README — kontrat bölümü: "isExport=true ise liability ignore edilir"
- JSDoc — `setLiability` metoduna "isExport=true iken etkisiz" notu

**Breaking:** Sessiz davranış (error atma yok). Kullanıcı açısından istikrar kazandırır.

---

### Kategori D — Tasarımı Genişleyen Bulgular

#### D1 [Açık Soru #8] → B-60: PackagingTypeCode + TR name config

**Önceki yaklaşım (v1):** "27 kod whitelist + Codelist fallback Set."

**Yeni yaklaşım:** v1 öneri + **yeni config dosyası `src/calculator/package-type-code-config.ts`** kod ve Türkçe name detay listesi ile.

**Uygulama (Sprint 2):**
- `src/config/constants.ts` — `PACKAGING_TYPE_CODES` Set (27 kod + Codelist fallback)
- `src/calculator/package-type-code-config.ts` — yeni:
  ```typescript
  export const PACKAGING_TYPES = [
    { code: 'BX', name: 'Kutu' },
    { code: 'BG', name: 'Torba' },
    // ... 27 kod
  ];
  export const getPackagingType = (code: string) => PACKAGING_TYPES.find(p => p.code === code);
  ```
- Tüketici (portal) dropdown için kullanır
- `src/validators/` — PACKAGING_TYPE_CODES Set kontrolü
- Constants Set ideal olarak config'den türetilir (M7 ile paralel)

---

#### D2 [Açık Soru #9] → B-90: PaymentMeansCode genişletilmiş

**Önceki yaklaşım (v1):** "Sil (dead code)."

**Yeni yaklaşım — Kullanıcı öneriye ZIT karar verdi:** **Tümü Set'te desteklensin + sık kullanılanlar için `calculator/payment-means-config.ts`** name detayı.

**Uygulama (Sprint 2):**
- `src/config/constants.ts` — `PAYMENT_MEANS_CODES` tam UN/EDIFACT listesi (80+ kod) veya en azından GİB'in kabul ettiği seviye
- `src/calculator/payment-means-config.ts` — yeni:
  ```typescript
  export const COMMON_PAYMENT_MEANS = [
    { code: '1', name: 'Ödeme Tipi Muhtelif' },
    { code: '10', name: 'Nakit' },
    { code: '20', name: 'Çek' },
    { code: '23', name: 'Banka Çeki' },
    { code: '42', name: 'Havale/EFT' },
    { code: '48', name: 'Kredi Kartı/Banka Kartı' },
    { code: 'ZZZ', name: 'Diğer' },
  ];
  ```
- Portal sık kullanılanları dropdown'da gösterir; tam liste validator tarafında
- Talep durumunda diğer kodlar da desteklenir (Set üzerinden)
- `src/validators/common-validators.ts` — PAYMENT_MEANS_CODES Set'i bağlansın (dead değil artık)

---

### Kategori E — Değişmeyen Bulgular (Örnek onay cevapları)

| Açık Soru | Onay |
|---|---|
| #1 Matris truth source | Öneri aynen uygulanır (PROFILE_TYPE_MATRIX ana truth) |
| #3 Signature/UBLExtensions | Kütüphane üretmez; testler silinir |
| #4 Çift truth source | `*-config.ts` data source, constants türetilir |
| #5 WithholdingTaxTypeWithPercent | Canlandır + regenerate |
| #7 10 geçersiz kod çıkarma | Direk çıkar |
| #11 TWH/D32 | TWH etiketi düzelt, D32 ekle, GWH/MWH/SM3 ekle |
| #14 CustomsDeclaration | Ekle (Sprint 5) |
| #15 xsi:schemaLocation | Kalsın |
| #25a-d Despatch alt kararlar | Öneriler uygulansın |

---

## Yeni Mimari Kararlar (v2 — M1-M10)

### M1 — PROFILE_TYPE_MATRIX tek truth source
`constants.ts:PROFILE_TYPE_MATRIX` ana kaynak; `rules.ts:PROFILE_TYPE_MAP` ve ters yön `TYPE_PROFILE_MAP` helper ile türetilir. Her yeni profil/tip kodu **tek yerde** güncellenir.

### M2 — IHRACAT/YOLCU/OZELFATURA: ['ISTISNA'] kümesi (Açık Soru #2)
Üç profilin tek tipi ISTISNA. Schematron/Codelist sessiz olsa da kütüphane kısıtlı yoruma oy veriyor. Sprint 1'de matrise yazılır.

### M3 — Tevkifat 650 dinamik mekanizma (Açık Soru #6)
650 "DİĞER" etiketli, kullanıcıdan 0-100 yüzde alır. Config'de `type: 'dynamic_percent'`; Line-calculator'da 650 için `line.withholdingTaxPercent`; validator 0-100 aralığı kontrol eder. Sprint 2.

### M4 — 555 flag mekanizması (Açık Soru #10)
Kütüphane "farklı KDV'den kesme" logic'i uygulamaz. `BuilderOptions.allowReducedKdvRate?: boolean` flag (default false). Flag true → 555 kabul. Kütüphane sadece gate. Sprint 2 (flag) + Sprint 5 (validator bypass).

### M5 — 351 non-ISTISNA tiplerinde (Açık Soru #12)
351 "İstisna olmayan diğer" — SATIS+351 doğru (hatta KDV 0 kalem varsa zorunlu). ISTISNA+351 yanlış. Cross-check matrisi (B-06 — Sprint 5) buna göre 351'i `allowedTypes: non-ISTISNA` olarak işler.

### M6 — Parent-child conditional zorunluluk (Açık Soru #13)
Parent opsiyonel; parent verilirse child zorunlu. TS tiplerinde child required, parent optional. Runtime validator parent-existence kontrol eder. Sprint 3.

### M7 — Config = data source, constants = türetilen (Açık Soru #4)
`calculator/*-config.ts` tek data source; `constants.ts` Set'leri `new Set(CONFIG.map(c => c.code))` ile türetilir. Yeni kod eklendiğinde **tek yer** güncellenir (config), Set otomatik sürer. Sprint 2.

### M8 — CustomizationID = TR1.2 (Açık Soru #16)
Hem Fatura hem İrsaliye tek sabit: TR1.2. Ayrı sabit gereksiz. Gönderilmiş belgeler bu değeri taşıyor. Sprint 6 (veya Sprint 1 erkene alınabilir).

### M9 — Yuvarlama sadece serializer'da (Açık Soru #20)
Calculator tam float; yuvarlama yok. Yuvarlama sadece XML yazım anında, yuvarlama bekleyen key'lerde uygulanır. İç hesaba yansımaz. PayableRoundingAmount (B-40) kalkar. Sprint 4.

### M10 — isExport=true → liability ignore (Açık Soru #23)
`isExport=true` iken `setLiability()` no-op. Profil her zaman IHRACAT. Error atma yok. Sprint 4.

---

## Revize Sprint Yapısı

### Sprint 1 — Matris Tekleştirme (2 gün → 2 gün)

**Kapsam değişikliği (v1 → v2):**
- Ekleme yok
- B-54/B-55/B-56 → **M2 uyarınca** IHRACAT/YOLCU/OZELFATURA tek tip ISTISNA (önceki "serbest" öneri yerine)

**Kapsanan Bulgular (v1 aynı):** B-01, B-02, B-21, B-22, B-23, B-54, B-55, B-56, B-77

**Alt görev değişikliği:**
- `PROFILE_TYPE_MATRIX` güncelleme: IHRACAT/YOLCU/OZELFATURA **sadece ISTISNA** içersin
- `deriveProfileTypeMap` helper (M1 uyarınca)
- `TYPE_PROFILE_MAP` ters yön türeme

**Opsiyonel:** M8 (CustomizationID TR1.2) bu sprint'te çözülebilir (tek sabit değişikliği).

**Release:** v1.5.0-rc1

---

### Sprint 2 — Kod Listeleri + Config-Data-Source (2 gün → 3 gün)

**Kapsam değişikliği (v1 → v2):**
- **M3 yeni:** Tevkifat 650 dinamik mekanizma (v1 "ekleme, bekle" yerine)
- **M4 yeni:** 555 BuilderOptions flag mekanizması
- **M7 uyarınca:** Constants Set'leri config'den türetilsin (ek alt görev)
- **D1 uyarınca:** `package-type-code-config.ts` yeni dosya (B-60 için)
- **D2 uyarınca:** `payment-means-config.ts` yeni dosya (B-90 için — silme yerine)

**Kapsanan Bulgular:**
- Eski: B-03, B-04, B-05, B-24, B-25, B-26, B-27, B-28, B-57, B-58, B-59, B-60, B-61, B-88, B-89, B-90, B-101
- **Çıkarılan: yok**
- **Revize yaklaşım:** B-05 (555 flag), B-25 (351 non-ISTISNA), B-27 (650 dinamik), B-60 (+ TR name config), B-90 (+ tam set + TR name config)

**Yeni alt görevler (v1'den fazla):**
- `BuilderOptions.allowReducedKdvRate` tipi ekle
- `withholding-config.ts` 650 için `type: 'dynamic_percent'` kaydı + `InvoiceLineInput.withholdingTaxPercent` alanı
- `package-type-code-config.ts` yeni dosya (27 kod + TR name)
- `payment-means-config.ts` yeni dosya (en sık kullanılan 7 kod + TR name)
- Constants Set'leri `new Set(CONFIG.map(...))` türevli hale getir
- 351 için `NON_ISTISNA_REASON_CODES` ayrı set

**Release:** v1.5.0

---

### Sprint 3 — XSD Sequence + Parent-Child Conditional Required (4 gün)

**Kapsam değişikliği (v1 → v2):**
- **M6 uyarınca:** B-32/B-33/B-34/B-35/B-70 zorunluluk **parent-child conditional** olarak uygula (düz required değil)
- Geri kalan XSD sequence fix'leri aynen v1

**Kapsanan Bulgular (v1 aynı):** B-09..B-14, B-18, B-20, B-32, B-33, B-34, B-35, B-70, B-94, B-96, B-97, B-99

**Alt görev revizyonu:**
- Input tipi güncelleme — parent opsiyonel, child required pattern
- Runtime validator — parent var + child eksik kontrolü
- TS tip testleri — parent yokken child vermeyi compile-time engelle; parent var + child eksik runtime hata

**Release:** v1.6.0-rc1

---

### Sprint 4 — Calculator Aritmetik + Yuvarlama (3 gün → 3 gün)

**Kapsam değişikliği (v1 → v2):**
- **B-15** → **KORUNUR** (tekrar analiz sonrası): düzeltme kullanıcının istediği yön. Ancak kullanıcı cevabı belirsiz; Sprint 4'te hâlâ dahil, ancak kullanıcıyı bilgilendir.
- **B-16** → **İPTAL** (Kategori A; kütüphane davranışı doğru)
- **B-17** → **SORGULANIYOR** (Kategori B; muhtemelen iptal, Mimsoft/kullanıcı teyit sonrası)
- **B-75** → **İPTAL** (Kategori A; kütüphane doğru)
- **B-82** → **İPTAL** (Kategori A; satır kdvExemptionCode eklenmeyecek)
- **M9 uyarınca:** yuvarlama stratejisi — hesapta yok, sadece serializer. B-42/B-46 bu yaklaşımla çözülür.
- **M10 uyarınca:** B-44 setLiability no-op (error yerine).
- **B-40 PayableRoundingAmount** → **İPTAL** (M9 uyarınca — hesapta yuvarlama yoksa kuruş farkı oluşmaz; kullanıcı talep ederse opsiyonel).
- **B-T03 (test)** — B-15 düzeltmesi ile 1000 → 850 (v1 aynı).
- **B-T04 (test)** — B-17 sorgulanıyor; karar askıda.

**Kapsanan Bulgular (revize):**
- Kalanlar: B-15, B-17(?), B-41, B-42, B-43, B-44, B-45, B-46, B-47, B-76, B-79, B-80, B-81, B-83
- İptal: B-16, B-40, B-75, B-82
- Sorgulanan: B-17, B-T04

**Tahmini süre:** 3 gün (v1 aynı — iptal/sorgulanan çıkarılmış ama M9/M10 yeniden düzenleme dengeler).

**Release:** v1.7.0-rc1

---

### Sprint 5 — Validator Kapsamı + TaxExemption Cross-Check (4 gün)

**Kapsam değişikliği (v1 → v2):**
- **B-06** (TaxExemption cross-check) — **M5 uyarınca** 351 non-ISTISNA dahil edilecek cross-check matrisi
- **B-07, B-08** (IHRACKAYITLI+702, YatirimTesvik) — v1 aynı (kullanıcı: "normatif öyle diyorsa öyle olmalı direk eklensin")
- **B-05** (555) — v1'de ayrı set; v2'de **M4 uyarınca flag ile bypass**. Sprint 5'te validator bypass logic'i.

**Kapsanan Bulgular (v1 aynı):** B-06, B-07, B-08, B-29..B-31, B-62..B-69, B-78, B-84..B-86, B-91, B-104

**Alt görev revizyonu:**
- `TAX_EXEMPTION_MATRIX` 351 için `allowedTypes: non-ISTISNA` + `forbiddenTypes: ['ISTISNA', 'IADE', 'TEVKIFATIADE']`
- 555 için validator flag kontrol: `if (code === '555' && !options.allowReducedKdvRate) reject`

**Release:** v1.8.0-rc1

---

### Sprint 6 — Despatch Extensions (3 gün)

**Kapsam değişikliği (v1 → v2):**
- **B-38** → **M8 uyarınca** tek sabit TR1.2 (Fatura + İrsaliye ayrı sabit değil).
- **B-50** (Kısmi gönderim) → **İPTAL** (Kategori A).
- Diğer despatch bulguları (25a, b, c, d): öneriler aynen uygulanır.

**Kapsanan Bulgular:**
- Kalanlar: B-19, B-36..B-39, B-48, B-49, B-51, B-52, B-53, B-71..B-74, B-98, B-100
- İptal: B-50

**Alt görev revizyonu:**
- B-38: `INVOICE_CUSTOMIZATION_ID`/`DESPATCH_CUSTOMIZATION_ID` ayrı sabit YOK; tek `UBL_CUSTOMIZATION_ID = 'TR1.2'`
- Input tipinden `outstandingQuantity`, `oversupplyQuantity`, `outstandingReason` **çıkar** (B-50 iptal)

**Release:** v1.9.0-rc1

---

### Sprint 7 — Test Güncellemeleri (2 gün)

**Kapsam değişikliği (v1 → v2):**
- **B-T04 (stopaj test)** → kullanıcı teyidi bekleniyor (Kategori B). Değişiklik askıda; mevcut test (1100) doğru olabilir. Teyide kadar test koru.
- Diğer testler v1 aynı.

**Kapsanan Bulgular:** B-T01, B-T02, B-T03, B-T04(?), B-T05..B-T10, B-87

**Release:** v1.9.0

---

### Sprint 8 — Dokümantasyon + Skill + CHANGELOG (2 gün)

**Kapsam değişikliği (v1 → v2):**
- **B-103** → **İPTAL** (Kategori A; mevcut tasarım doğru)
- README — Sorumluluk Matrisi'ne 555 flag (M4), 650 dinamik (M3), isExport+liability (M10) eklensin
- Skill `kod-listeleri-ubl-tr-v1.42.md §4.9` — 650 iç çelişki + kütüphane yaklaşımı (M3)
- Skill `e-fatura-ubl-tr-v1.0.md §77` — **Fatura + İrsaliye ikisi de TR1.2** notu (v1 TR1.2/TR1.2.1 netleştirme yerine)

**Kapsanan Bulgular:**
- Kalanlar: B-92, B-93, B-94, B-95, B-96, B-102, B-S01..B-S05
- İptal: B-103

**Release:** **v2.0.0**

---

## Yeni Toplam Metrikler

| Metrik | v1 | v2 | Fark |
|---|---|---|---|
| Net bulgu | 112 | **108** (112 − 4 iptal) | −4 |
| KRİTİK | 20 | **18** (B-16 iptal, B-17 askıda) | −2 |
| YÜKSEK | 32 | **31** (B-50 iptal) | −1 |
| ORTA | 36 | **34** (B-75, B-82 iptal) | −2 |
| DÜŞÜK | 24 | **23** (B-103 iptal) | −1 |
| Tahmini sprint | 8 | **8** (aynı) | 0 |
| Tahmini gün | 22 | **23** (mimari revizyonlar +1) | +1 |

### Sorgulanan Bulgular (Plan içi; karar askıda)
| Bulgu | Durum | Çözüm yolu |
|---|---|---|
| B-17 Stopaj aritmetik | Muhtemelen iptal | Mimsoft email madde 6 cevabı + prod log kontrolü |
| B-T04 Test beklentisi | Muhtemelen koru | B-17 kararına bağlı |

---

## Mimsoft'a Gönderilecek Soru Sayısı

Açık Sorular'daki email şablonundan cevaplanmış maddeler çıkarıldı (Açık Sorular cevaplarına göre):

| # | Soru | Açık Soru | Durum |
|---|---|---|---|
| ~~1~~ | ~~Tevkifat 650 kodu~~ | #6 | **Kullanıcı karar verdi (M3 dinamik)** — çıkarıldı |
| ~~2~~ | ~~CustomizationID TR1.2 vs TR1.2.1~~ | #16 | **Kullanıcı karar verdi (ikisi de TR1.2)** — çıkarıldı |
| 1 | DespatchContact/Name zorunluluk | #25a | **KALIR** (v1 Mimsoft teyit) |
| 2 | DORSE path (LicensePlateID vs TransportEquipment) | #25b | **KALIR** |
| ~~3~~ | ~~Kısmi gönderim kullanım sıklığı~~ | #25e | **İptal (B-50 iptal)** — çıkarıldı |
| 3 | Stopaj modeli (negatif vs AllowanceCharge) | #18 | **KALIR** (B-17 karar askıda — teyit gerekli) |
| ~~4~~ | ~~Yuvarlama stratejisi~~ | #20 | **Kullanıcı karar verdi (M9 hesapta yok)** — çıkarıldı |
| 4 | xsi:schemaLocation emit | #15 | **KALIR** (kullanıcı "kalsın" dedi ama Mimsoft log teyit iyi olur; opsiyonel) |
| ~~5~~ | ~~Damga V./Konaklama V. matrah düşümü~~ | #24 | **Kullanıcı karar verdi (kütüphane doğru)** — çıkarıldı |

**Sonuç:** v1'de 9 madde → v2'de **3-4 madde** (xsi:schemaLocation opsiyonel). `MIMSOFT-EMAIL.md` dosyası bu filtrelemeyi taşıyor.

---

## Bir Sonraki Adım

**Başlangıç: Sprint 1 (Matris Tekleştirme).**

Nedenleri:
1. v1 ile aynı (en küçük refactor, bağımlılık yok, 9 bulgu kapanır).
2. **M1 (matris tek truth source) + M2 (3 profil tek ISTISNA) + M8 (TR1.2 tek sabit)** birlikte uygulanabilir — kombine sprint.
3. Downstream bağımlılık yok.

**Sprint 1 öncesi karar zorunlu (tümü netleşti):**
- ✅ Açık Soru #1 — PROFILE_TYPE_MATRIX ana truth (**onaylandı**)
- ✅ Açık Soru #2 — IHRACAT/YOLCU/OZELFATURA tek tip ISTISNA (**onaylandı — M2**)

**B-17/B-T04 askıda:**
- Sprint 4 başlarken kullanıcı teyidi sor veya Mimsoft email cevabı bekle.
- Askıda olmak Sprint 1-3'ü engellemez.

**Öneri:** Sprint 1 başlasın; B-17 için Mimsoft email paralel gönderilsin (MIMSOFT-EMAIL.md).

---

> **SONUÇ v2:** 108 net bulgu (4 iptal), 2 sorgulanan (kullanıcı/Mimsoft teyit bekleyen), 8 sprint, 23 iş günü (mimari revizyonlar +1 gün), v2.0.0 hedef. M1-M10 yeni mimari kararları sprint detayında cross-reference ile uygulanır.
