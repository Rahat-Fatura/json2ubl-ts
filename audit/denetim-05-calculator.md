---
denetim: 05 - Calculator Alt-Modülü
tarih: 2026-04-21
skill_versiyon: gib-teknik-dokuman @ 91044bb (Codelist.xml + v1.42 + Common/Main_Schematron + ortak-parasal-v0.7 + XSD UDT)
kutuphane_versiyon: json2ubl-ts v1.4.2 (uncommitted working tree dahil; son commit 8e3fd27)
kapsam: |
  src/calculator/ altındaki 13 dosya (line-calculator, document-calculator, config-manager,
  invoice-session, invoice-rules, simple-invoice-builder, simple-invoice-mapper, simple-types,
  tax-config, withholding-config, exemption-config, unit-config, currency-config) +
  __tests__/calculator/ 2 test dosyası (580 satır toplam) + calculator output'un
  serializer'a (monetary-serializer, tax-serializer, xml-helpers) gidiş yolu. Özellikle:
  (a) Satır/belge hesaplama algoritması; (b) yuvarlama & LegalMonetaryTotal semantiği;
  (c) ConfigManager reaktif state & singleton izolasyonu; (d) invoice-rules UI derivation
  Schematron uyumu; (e) simple-invoice-mapper'ın hesaplanan değerleri InvoiceInput'a
  doğru aktarması.
  Config dosyalarının içeriği (kod listesi uyumu) Denetim 02'de ayrıntılı incelendi —
  burada sadece calculator'ın bu config'leri **nasıl tükettiği** yeniden görülür
  (§4.3). Kod içeriği bulguları D02 §1–§4'e atıflıdır.
---

# Denetim 05 — Calculator Alt-Modülü

> Bu rapor **yalnızca bulgu**. Düzeltme veya öncelik sıralaması yok.

## 0. Normatif Kaynak Referansları

| Kısa ad | Dosya | Kullanım |
|---|---|---|
| **skill-parasal** | `references/ortak-parasal-ve-vergi-v0.7.md` §5 (MonetaryTotal) | `LineExtensionAmount = Σ(InvoiceLine.LineExtensionAmount)` formülü; `PayableAmount` formülü |
| **CommonSchematron** | `schematrons/UBL-TR_Common_Schematron.xml` satır 229-231 | `decimalCheck` — en fazla **2 ondalık basamak** kuralı |
| **MainSchematron** | `schematrons/UBL-TR_Main_Schematron.xml` satır 260-287 | LegalMonetaryTotal + TaxTotal.TaxAmount'a `decimalCheck` uygulanıyor |
| **XSD-UDT** | `schemas/common/UBL-UnqualifiedDataTypes-2.1.xsd` satır 59-89 + `CCTS_CCT_SchemaModule-2.1.xsd` satır 46-59 | `AmountType` = `xsd:decimal` + `currencyID` zorunlu (fractionDigits yok) |
| **CommonSchematron:311-322** | `TaxExemptionReasonCodeCheck` | 555 hariç, tip↔kod cross-check |
| **CommonSchematron:496-498** | `DemirbasKDVTaxExemptionCheck` | 555 kodu + KDV 0 cross-check |
| **CommonSchematron:468** | `YatirimTesvikKDVCheck` | YATIRIMTESVIK/EARSIVFATURA + YTBISTISNA → `CalculationSequenceNumeric='-1'` zorunlu |
| **v1.42 §4.9.2** | `references/kod-listeleri-ubl-tr-v1.42.md` satır 480-542 | 6xx/8xx tevkifat oranları tablosu |
| **calculator kodu** | `src/calculator/*.ts` (13 dosya) | Hesaplama + mapper + reaktif state |
| **serializer bağlama** | `src/serializers/monetary-serializer.ts`, `src/utils/{xml-helpers,formatters}.ts` | Calculator → XML format köprüsü (`cbcAmountTag` → `formatDecimal(amount, 2)`) |

---

## 1. Hesaplama Doğruluğu

### 1.1 Satır Bazlı Algoritma (`line-calculator.ts`)

Kütüphanenin uyguladığı 6-adımlı hesap (satır 86-210):

```
1. lineExtensionForMonetary = quantity × price                          (gross)
2. allowance = lineExtensionForMonetary × (allowancePercent / 100)
3. lineExtensionAmount = lineExtensionForMonetary - allowance           (matrah başlangıcı)
4. Her ek vergi için:
   taxPrice = lineExtensionAmount × (tax.percent / 100)
   baseStat=true, baseCalculate=true  → matrah += taxPrice    (ÖTV gibi)
   baseStat=true, baseCalculate=false → matrah -= taxPrice    (Damga V. gibi)
   baseStat=false                     → taxForCalculate *= -1 (Stopaj)
5. KDV = (modifiye matrah) × (kdvPercent / 100)
6. Tevkifat = KDV × (withholdingPercent / 100)
```

#### 1.1.1 Skill formülü ile karşılaştırma

Skill (`ortak-parasal-ve-vergi-v0.7.md` §5, satır 129-134):

```
LineExtensionAmount = Σ(InvoiceLine.LineExtensionAmount) — satır toplamı
TaxExclusiveAmount  = LineExtensionAmount − AllowanceTotalAmount + ChargeTotalAmount
TaxInclusiveAmount  = TaxExclusiveAmount + Σ(TaxTotal.TaxAmount)
PayableAmount       = TaxInclusiveAmount + PayableRoundingAmount − Σ(WithholdingTaxTotal.TaxAmount)
```

| Aşama | Skill | Kütüphane | Uyum |
|---|---|---|---|
| Satır LineExtensionAmount | `qty×price − satır iskonto` (matrah) | `lineExtensionAmount` = `qty×price − iskonto` (`line-calculator.ts:102`) | ✓ |
| Satır KDV matrahı | `LineExtensionAmount + matrah-artırıcı − matrah-azaltıcı` | `lineExtensionAmountForCalculation` (`line-calculator.ts:103-127`) | ✓ |
| Satır KDV tutarı | `matrah × oran` | `kdvSubtotal.amount = matrah × kdvPercent/100` (`:146`) | ✓ |
| Satır Tevkifat | `KDV × oran` | `whAmount = kdvSubtotal.amount × (whDef.percent/100)` (`:169`) | ✓ |

Satır algoritması **matematiksel olarak uyumlu** — ÖTV matrah artırıcı, Damga V. matrah azaltıcı, stopaj negatif taxForCalculate. Bu algoritma `calculate-service/invoice.calculate.mixin.js`'ten port edilmiş ve birebir koruyor (JSDoc `line-calculator.ts:3-7` açıklıyor).

#### 1.1.2 Damga Vergisi (1047) + Konaklama V. (0059) baseCalculate=false semantiği

`tax-config.ts:29-30`: Damga V. (1047, 1048) `baseCalculate=false` — KDV matrahından düşüyor.
`tax-config.ts:21`: Konaklama V. (0059) aynı.

Türkiye vergi mevzuatında **Damga Vergisi ve Konaklama Vergisi KDV matrahından düşülmez**; ayrı bir kalem olarak gösterilir ama KDV matrahını etkilemezler. Kütüphanenin `baseCalculate=false` sonucunda:
- Test satır 120-133: "Damga Vergisi (1047) KDV matrahından düşmeli" — beklenti matrah = 950 (1000-50). Bu yanlış. Gerçek mevzuat: matrah **1000** kalır, Damga V. 50 ayrı hesap.

**Kaynak belirsizliği:** Bu davranış `calculate-service` DB Tax tablosundan embed. Skill `ortak-parasal-ve-vergi-v0.7.md`'da Damga Vergisi/KDV matrahı cross-etkisi **hiçbir şekilde açıklanmamış**. Schematron'da da kontrol yok (bu XSD/Schematron kapsamı dışında, **vergi hesabı DB seviyesi** bir şey). Normatif kaynak sessiz → Durum B.

Ancak `calculate-service` bu mantığı kullanıyor ve kütüphane DB-override mekanizması sunuyor (`configManager.updateTaxes()`). Pratikte üretim verisi baseCalculate flag'lerini farklı set edebilir. Kod içinde **varsayılan yanlış olabilir** ama kullanıcı override edebilir. **ORTA** seviyesinde not edildi.

### 1.2 Belge Bazlı Algoritma (`document-calculator.ts`)

`calculateDocument` 7 adım (satır 85-206):
1. `calculateAllLines(input.lines, currencyCode)` — her satırı hesapla
2. Monetary toplamları topla (`:92-113`)
3. Vergi subtotal gruplama (aynı kod+oran → tek subtotal, `:115-134`)
4. Tevkifat subtotal gruplama (`:137-153`)
5. Fatura tipi tespiti (`resolveInvoiceType`, `:214-250`)
6. İstisna kodu eşleştirme (`resolveExemptionReason`, `:255-292`)
7. Profil tespiti (`resolveProfile`, `:298-316`)

#### 1.2.1 **KRİTİK BULGU — LegalMonetaryTotal.LineExtensionAmount yanlış semantik**

`document-calculator.ts:107`:
```ts
lineExtensionAmount += line.lineExtensionForMonetary;  // qty×price, iskonto ÖNCESİ
```

`document-calculator.ts:108`:
```ts
taxExclusiveAmount += line.lineExtensionAmount;  // qty×price − iskonto, iskonto SONRASI
```

Buda `buildMonetaryTotal` (`simple-invoice-mapper.ts:269-277`) tarafından XML'e:
```xml
<cac:LegalMonetaryTotal>
  <cbc:LineExtensionAmount>1000.00</cbc:LineExtensionAmount>    <!-- iskonto ÖNCESİ -->
  <cbc:TaxExclusiveAmount>850.00</cbc:TaxExclusiveAmount>        <!-- iskonto SONRASI -->
  <cbc:AllowanceTotalAmount>150.00</cbc:AllowanceTotalAmount>
  <cbc:PayableAmount>...</cbc:PayableAmount>
</cac:LegalMonetaryTotal>
```

Aynı anda `line-serializer` üzerinden (simple-invoice-mapper:365):
```xml
<cac:InvoiceLine>
  <cbc:LineExtensionAmount>850.00</cbc:LineExtensionAmount>     <!-- iskonto SONRASI -->
</cac:InvoiceLine>
```

**Sonuç:** `Σ InvoiceLine.LineExtensionAmount = 850` ama `LegalMonetaryTotal.LineExtensionAmount = 1000`.

Skill (`ortak-parasal-ve-vergi-v0.7.md` §5, satır 130):
> `LineExtensionAmount = Σ(InvoiceLine.LineExtensionAmount) — satır toplamı`

Bu eşitlik sağlanmıyor → **UBL 2.1 tutarlılık kuralı ihlali**. Mimsoft pre-validation ve GİB bu arithmetic eşitliği kontrol eder.

Test dosyası `document-calculator.test.ts:108-113` bu yanlışlığı aynı yanlış beklentiyle doğruluyor:
```ts
expect(result.monetary.lineExtensionAmount).toBe(1000);    // ← yanlış beklenti
expect(result.monetary.taxExclusiveAmount).toBe(850);
expect(result.monetary.allowanceTotalAmount).toBe(150);
```

### [KRİTİK][KÜTÜPHANE] LegalMonetaryTotal.LineExtensionAmount iskonto öncesi toplamı üretiyor
- **Dosya:satır:** `src/calculator/document-calculator.ts:107` (`lineExtensionAmount += line.lineExtensionForMonetary`)
- **Dosya:satır:** `src/calculator/simple-invoice-mapper.ts:271` (`lineExtensionAmount: calc.monetary.lineExtensionAmount`)
- **Gözlem:** Satır `InvoiceLine/LineExtensionAmount` iskonto sonrası (doğru), belge `LegalMonetaryTotal/LineExtensionAmount` iskonto öncesi (yanlış). Σ(satır) ≠ belge.
- **Normatif referans:** skill `ortak-parasal-ve-vergi-v0.7.md` §5 satır 130 `LineExtensionAmount = Σ(InvoiceLine.LineExtensionAmount)`; UBL 2.1 MonetaryTotal definition.
- **Durum tipi:** A — skill açıkça formülü veriyor, kütüphane farklı semantik kullanıyor.

### [KRİTİK][TEST] Belge LineExtensionAmount testi yanlış beklenti ile
- **Dosya:satır:** `__tests__/calculator/document-calculator.test.ts:108` (`expect(result.monetary.lineExtensionAmount).toBe(1000)`) — iskontolu 1-satır fatura için.
- **Gözlem:** Test kütüphane hatasını aynı yanlış beklentiyle onaylıyor; düzeltilince bu test fail eder. Bu, D01 §5 "test eksikliği" örüntüsünün calculator'da bir örneği.
- **Normatif referans:** skill §5 satır 130; UBL-TR LegalMonetaryTotal XSD dokümantasyonu.
- **Durum tipi:** A — test yanlış beklenti.

#### 1.2.2 TaxExclusiveAmount formülü

Skill formülü: `TaxExclusiveAmount = LineExtensionAmount − AllowanceTotalAmount + ChargeTotalAmount`.

Kütüphane: `taxExclusiveAmount = Σ(line.lineExtensionAmount)` — yani Σ (iskonto sonrası matrah). Sonuç nümerik olarak doğru (tesadüfen), çünkü belge seviyesi iskonto kullanmadığı varsayımında `Σ(satır iskonto sonrası) = belge gross − Σ(satır iskontosu)`.

Ama bu yerel iyilik şarta bağlı: **belge seviyesi allowanceCharges** (AllowanceCharge elemanı Invoice root altında) varsa kütüphane bunu göz önüne almıyor. `mapper:96-101` satır iskontolarını birleştirerek tek bir root AllowanceCharge üretiyor ama `taxExclusiveAmount` formülünü güncellemiyor. Bu senaryoda formül patlayabilir.

Denetim kapsamında spesifik bir input ile test yok — **ORTA** bulgu.

#### 1.2.3 TaxInclusiveAmount + PayableAmount

`document-calculator.ts:109`:
```ts
taxInclusiveAmount += line.taxInclusiveForMonetary;
// line.taxInclusiveForMonetary = lineExtensionAmount + Σ taxForCalculate
```

Yani TaxInclusive = Σ(satır matrah + satır vergi). Bu = `TaxExclusiveAmount + Σ(TaxAmount)` (çünkü Σ(satır vergi) = Σ(TaxAmount), skill formülü geçerli) ✓.

`:111`:
```ts
payableAmount += line.payableAmountForMonetary;
// line.payableAmountForMonetary = taxInclusive − withholdingTotal
```

Yani PayableAmount = Σ(satır taxInclusive − satır withholding) = TaxInclusive − Σ withholding. Skill formülü: `PayableAmount = TaxInclusive + PayableRoundingAmount − Σ withholding`.

**`PayableRoundingAmount` kütüphanede hiç üretilmiyor** — `document-calculator.ts`'in `DocumentMonetary` tipinde alan yok; `simple-invoice-mapper.ts buildMonetaryTotal:269-277` set etmiyor. Sonuç: PayableAmount = TaxInclusive − Σ withholding (rounding=0 varsayımı).

Bu **eksik** ama **kırık değil**: XSD'de 0..1, kullanıcı 0.01 yuvarlama yapmak istediğinde olanak yok (tam maliyet 1019.995 → serializer 1020.00 yazar, matematik tutarsız kalır).

### [YÜKSEK][KÜTÜPHANE] PayableRoundingAmount desteklenmiyor
- **Dosya:satır:** `src/calculator/document-calculator.ts:17-29` `DocumentMonetary` interface — alan yok;`src/calculator/simple-invoice-mapper.ts:269-277` buildMonetaryTotal — set yok.
- **Gözlem:** Skill `PayableAmount = TaxInclusiveAmount + PayableRoundingAmount − Σ Withholding` formülü veriyor. Kütüphane PayableRoundingAmount'ı ne otomatik üretiyor (2-basamaklı XML kuruş yuvarlaması için) ne de SimpleInvoiceInput üzerinden manuel girilmesini sağlıyor. Serializer `monetary-serializer.ts:21-23` alan desteği var ama mapper `undefined` bırakıyor → XML'de eleman yok.
- **Normatif referans:** skill `ortak-parasal-ve-vergi-v0.7.md` §5 satır 122-133; MainSchematron `LegalMonetaryTotal/PayableAmount`'a `decimalCheck` (en fazla 2 ondalık) satır 272-273.
- **Durum tipi:** B — skill formül veriyor (minOccurs=0), kütüphane tamamen görmezden geliyor; çok basamaklı tutarlarda PayableAmount 2-basamaklı yuvarlama ile TaxInclusive-WH farkından ayrı olabilir.

#### 1.2.4 `resolveInvoiceType` tip öncelik mantığı

`document-calculator.ts:214-250`. Öncelik sırası:
1. Satır `TEVKIFAT` varsa → TEVKIFAT (anti-override: kullanıcı SATIS dese bile satır tevkifatı varsa TEVKIFAT)
2. Kullanıcı `input.type` varsa → bu değer
3. `input.kdvExemptionCode` + exemption.documentType'a göre ISTISNA/IHRACKAYITLI/OZELMATRAH
4. Satır tiplerinden fallback (SATIS+ISTISNA → SATIS, yalnız ISTISNA → ISTISNA)
5. Varsayılan SATIS

**Sorun:** `:216` `if (typesArray.includes('TEVKIFAT')) return 'TEVKIFAT';` — kullanıcının `input.type` ayarı (örn `IADE`) göz ardı ediliyor. TEVKIFATIADE senaryosunda kullanıcı `type='TEVKIFATIADE'` dese bile sadece tevkifat satırı olduğu için TEVKIFAT dönüyor. TEVKIFATIADE ayrı tip (Denetim 01'de de işaretlendi, D01 KÜTÜPHANE bulgusu #1).

### [YÜKSEK][KÜTÜPHANE] TEVKIFATIADE + YTBTEVKIFATIADE tip override imkansız
- **Dosya:satır:** `src/calculator/document-calculator.ts:216`
- **Gözlem:** `if (typesArray.includes('TEVKIFAT')) return 'TEVKIFAT'` mutlak öncelik kullanıcı input.type'ını reddediyor. Bir kullanıcı TEVKIFATIADE (iade tevkifatlı fatura) oluşturmak isterse, hesaplayıcı TEVKIFAT döner, IADE grubu DocumentTypeCode='IADE' kuralı (Schematron IADEInvioceCheck) tetiklenmez ve faturanın iade faturası olduğu kaybolur.
- **Normatif referans:** kod-listeleri v1.42 §4.3 `InvoiceTypeCode` listesi: TEVKIFAT ve TEVKIFATIADE **ayrı kodlardır**; CommonSchematron `IADEInvioceCheck` IADE grubu (`IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE`).
- **Durum tipi:** A.

#### 1.2.5 `resolveExemptionReason` istisna varsayılanları

`document-calculator.ts:67-71`:
```ts
const DEFAULT_EXEMPTIONS = {
  satis: '351',       // SATIS tipinde KDV 0 satır için varsayılan kod
  istisna: '350',     // ISTISNA tipinde varsayılan
  ihracKayitli: '701', // IHRACKAYITLI için varsayılan
};
```

Ve mantık (`:262-283`):
- TEVKIFAT → 351 (satış kodu, Schematron geçer)
- IADE+ISTISNA → 351
- ISTISNA → kullanıcı kodu ?? 350
- IHRACKAYITLI → kullanıcı kodu ?? 701
- OZELMATRAH → kullanıcı kodu (varsayılan yok)
- SATIS+ISTISNA → 351

D02 §1.2 bulgusu: `351 constants.ts ISTISNA_TAX_EXEMPTION_REASON_CODES set'inde yok` → kütüphane 351 üretir ama kütüphane validator'ı (`strict` mod) reddeder. **Mapper → Validator truth source çelişkisi.**

Ayrıca: Yok — test 225-233 TEVKIFAT tipinde 351 bekliyor, geçiyor. Ama `validator.validateIstisnaGroup` çağrılırsa strict modda hata verir.

### [YÜKSEK][KÜTÜPHANE] DEFAULT_EXEMPTIONS.satis = '351' — 351 validator whitelist'inde yok (çift truth source)
- **Dosya:satır:** `src/calculator/document-calculator.ts:68` (`DEFAULT_EXEMPTIONS.satis = '351'`)
- **Dosya:satır:** `src/config/constants.ts:186-200` (`ISTISNA_TAX_EXEMPTION_REASON_CODES` 351 içermiyor — D02 bulgusu)
- **Gözlem:** Mapper TEVKIFAT/IADE+ISTISNA/SATIS+ISTISNA tiplerinde varsayılan 351 üretiyor. Kütüphanenin içindeki `validateIstisnaGroup` bu kodu reddeder (strict mod). Kullanıcı "kütüphanenin strict modu fail" verir ama XML'in kendisi Schematron'dan geçer. **Tek fiziki bulgu iki katmanda:** mapper üretiyor, validator reddediyor.
- **Normatif referans:** Codelist `TaxExemptionReasonCodeType`'te 351 var (satır 21) → Schematron 314 geçer. D02 §1.2.
- **Durum tipi:** A — D02 YÜKSEK bulgusunun D05'te calculator seviyesinde teyidi.

#### 1.2.6 `resolveProfile` profil tespit mantığı

`document-calculator.ts:298-316`:
```
input.profile varsa → kullanıcı profili
input.eArchiveInfo || input.onlineSale → EARSIVFATURA
input.buyerCustomer → IHRACAT
type=IADE → TEMELFATURA
type=SGK || input.sgk → TEMELFATURA
default → TICARIFATURA
```

**Sorun:** `buyerCustomer` varlığı tek başına IHRACAT profiline zorlar. Oysa `buyerCustomer` YOLCUBERABERFATURA ve KAMU profillerinde de kullanılıyor (`invoice-rules.ts:274 showBuyerCustomer: isIhracat || isYolcuBeraber || isKamu`).

Test `document-calculator.test.ts:199-211` bu davranışı `buyerCustomer varsa profil IHRACAT olmalı` olarak teyit ediyor. Ama kullanıcı YOLCUBERABERFATURA oluştururken:
- `setBuyerCustomer(...)` çağrılıyor
- `input.buyerCustomer` set ediliyor
- `input.profile` belirlenmediyse `resolveProfile` IHRACAT dönüyor
- Kullanıcı `input.profile='YOLCUBERABERFATURA'` set etmek zorunda — aksi halde IHRACAT üretilir.

Davranış kullanıcı manuel profil set ettiğinde bozulmuyor (`if (input.profile) return input.profile` ilk kuraldır). Ama varsayılan kısmı "buyerCustomer → IHRACAT" yalnız IHRACAT senaryosunu kapsar. **ORTA** bulgu.

### [ORTA][KÜTÜPHANE] resolveProfile buyerCustomer varlığını YOLCUBERABERFATURA/KAMU olmadan IHRACAT'a zorlar
- **Dosya:satır:** `src/calculator/document-calculator.ts:306` (`if (input.buyerCustomer) return 'IHRACAT';`)
- **Gözlem:** `buyerCustomer` YOLCUBERABERFATURA (TAXFREE) ve KAMU profillerinde de kullanılır. Kullanıcı `input.profile` vermediğinde ve `buyerCustomer` verdiğinde tek IHRACAT dönüyor. Daha sağlam yaklaşım: `buyerCustomer.partyType` veya alıcı TCKN uzunluğu kontrolü ile profili seçmek.
- **Normatif referans:** `invoice-rules.ts:274` üç profili listeliyor; `simple-invoice-mapper.ts:562-566 resolveBuyerPartyType` sadece IHRACAT ve YOLCUBERABERFATURA için partyType belirliyor (KAMU için undefined).
- **Durum tipi:** B — skill sessiz; iç tutarsızlık.

### 1.3 Özel Matrah Ek Subtotal

`document-calculator.ts:164-174`:
```ts
if (input.type === 'OZELMATRAH' && input.ozelMatrah) {
  taxSubtotals.unshift({
    code: '0015', name: 'KDV',
    percent: input.ozelMatrah.percent,
    taxable: input.ozelMatrah.taxable,
    amount: input.ozelMatrah.amount,
    taxForCalculate: input.ozelMatrah.amount,
  });
}
```

OZELMATRAH tipinde özel matrah subtotal'ı `unshift` ile ilk sırada eklenir (KDV 0 satır subtotal'ı sonra geliyor). Test `document-calculator.test.ts:277-291` bu davranışı doğruluyor.

**Sorun:** Özel matrah eklendiğinde belge seviyesi `monetary.taxInclusiveAmount` ve `taxTotal` güncellenmiyor. Yani:
- Özel matrah subtotal'daki `amount` = 1000 (KDV)
- `taxTotalAmount` bu değeri içermiyor (`document-calculator.ts:156-162` monetary hesapları özel matrahtan ÖNCE yapılıyor, `:164` sonra)
- `taxes.taxTotal: taxTotalAmount` (`:199`) — OZELMATRAH'sız Σ
- XML'de `TaxTotal/TaxAmount` ile `Σ TaxSubtotal/TaxAmount` çelişiyor (TaxAmount'a OZELMATRAH kalemin vergi tutarı eklenmiyor)

Test bu çelişkiyi kontrol etmiyor (sadece `taxSubtotals[0].amount`'u kontrol ediyor).

### [KRİTİK][KÜTÜPHANE] OZELMATRAH ek subtotal taxTotal ve taxInclusiveAmount'a yansımıyor
- **Dosya:satır:** `src/calculator/document-calculator.ts:156-174`
- **Gözlem:** `taxTotalAmount` ve `taxInclusiveAmount` monetary toplamları satırlardan türetiliyor; OZELMATRAH ek subtotal'ı `taxSubtotals.unshift(...)` ile sonradan eklendiği için belge `TaxTotal.TaxAmount` ve `LegalMonetaryTotal.TaxInclusiveAmount` bu tutarı içermiyor. Üretilen XML'de `Σ TaxSubtotal.TaxAmount ≠ TaxTotal.TaxAmount`.
- **Normatif referans:** skill `ortak-parasal-ve-vergi-v0.7.md` §12 satır 229 `TaxAmount` zorunlu ve subtotal'ların toplamı; §5 satır 132 `TaxInclusiveAmount = TaxExclusiveAmount + Σ(TaxAmount)`.
- **Durum tipi:** B — skill doğrudan OZELMATRAH detayı vermiyor ama TaxTotal semantiği açık; arithmetic tutarlılık ihlali.

### 1.4 Test Kapsamı — line-calculator.test.ts (273 satır)

| Senaryo | Test'te | Eksik |
|---|---|---|
| Basit KDV | ✓ | — |
| İskonto | ✓ | Negatif iskonto (artırım/charge) |
| KDV %0 → ISTISNA | ✓ | — |
| Birim çözümleme: Türkçe isim | ✓ ('Kilogram' → KGM) | **Lowercase input ('kilogram')** — ConfigManager case-sensitive (§3.1) |
| Birim çözümleme: UBL kodu | ✓ ('LTR') | — |
| Varsayılan birim (Adet) | ✓ | — |
| ÖTV matrah artırıcı | ✓ (0071, 0074) | 0075/0076/0077 (alkol, tütün, kolalı gazoz) |
| Damga V. matrah azaltıcı | ✓ (1047) | 1048 (5035 SK), 0059 (Konaklama) ayrı test |
| Stopaj negatif taxForCalculate | ✓ (0003) | 0011 (Kurumlar), 9040 (Mera) |
| Kısmi tevkifat | ✓ (602 %90) | 601 %40, 624 %20, 627 %50, 650 (yok zaten) |
| Tam tevkifat | ✓ (801 %100) | — |
| Kombine (ÖTV + iskonto + tevkifat) | ✓ | Çoklu ek vergi (ÖTV + Damga + Stopaj tek satırda) |
| Geçersiz vergi kodu | ✓ | — |
| Geçersiz tevkifat kodu | ✓ | — |
| calculateAllLines çoklu | ✓ (2 satır) | 100+ satır (performans/float hata birikimi) |
| **Negatif miktar/fiyat** | ✗ | Edge case — NaN/Infinity korunması |
| **Sıfır miktar** | ✗ | Edge case |
| **Yüksek hassasiyet (8+ basamak)** | ✗ | Float artefact (0.1 + 0.2 = 0.30000000000000004) |
| **Multi-ÖTV (ÖTV + Damga + Stopaj)** | ✗ | Kombine testte sadece ÖTV+iskonto+tevkifat var |

### 1.5 Test Kapsamı — document-calculator.test.ts (307 satır)

| Senaryo | Test'te | Eksik |
|---|---|---|
| Tek satır basit | ✓ | — |
| Çoklu satır farklı KDV oranı | ✓ (%20 + %10) | %8, %1 (eski oranlar) |
| Aynı KDV oranlı satır gruplama | ✓ | — |
| Belge iskonto | ✓ (satır iskontosu agregasyonu) | **Belge-seviye AllowanceCharge (root)** |
| TEVKIFAT tip tespiti | ✓ (602) | TEVKIFATIADE override (§1.2.4 bulgu) |
| ISTISNA tip (kdv=0) | ✓ | YTBISTISNA |
| IADE tipi kullanıcı override | ✓ | TEVKIFATIADE, YTBIADE |
| IHRACKAYITLI tip tespiti | ✓ (kdvExemption=701) | 702 + GTİP/ALICIDIBSATIRKOD (Schematron 322 kuralı) |
| SATIS+ISTISNA karışık → SATIS | ✓ | — |
| TICARIFATURA varsayılan | ✓ | — |
| EARSIVFATURA (eArchiveInfo) | ✓ | — |
| EARSIVFATURA (onlineSale) | ✓ | — |
| IHRACAT (buyerCustomer) | ✓ | **YOLCUBERABERFATURA buyerCustomer → profile override testi yok** |
| IADE → TEMELFATURA | ✓ | — |
| Kullanıcı profil override | ✓ (KAMU) | HKS, YATIRIMTESVIK, ILAC_TIBBICIHAZ, ENERJI, IDIS |
| TEVKIFAT → 351 | ✓ | **351 kodu strict validator tarafından reddediliyor — cross-layer test eksik** |
| ISTISNA kullanıcı kodu | ✓ (301) | 555 kodu |
| ISTISNA varsayılan 350 | ✓ | — |
| Döviz kuru | ✓ (USD/32.50) | TRY dışı ama exchangeRate verilmemiş edge case (validator ret) |
| OZELMATRAH subtotal | ✓ (805/1000) | **taxTotal/taxInclusive cross-check (§1.3 bulgusu)** |
| UUID otomatik üretim | ✓ | — |
| UUID kullanıcı override | ✓ | — |
| **YATIRIMTESVIK (ytbNo, itemClassificationCode)** | ✗ | — |
| **ILAC_TIBBICIHAZ (additionalItemIdentifications)** | ✗ | — |
| **SGK (accountingCost + additionalDocuments)** | ✗ | — |
| **ENERJI (SARJ/SARJANLIK)** | ✗ | — |
| **IDIS (SEVKIYATNO)** | ✗ | — |
| **KAMU IBAN validation** | ✗ | — |
| **4171 (ÖTV Tevkifat) tax uyumu** | ✗ | D02'de constants'ta var, tax-config'de yok (çelişki) |

### [ORTA][TEST] document-calculator.test.ts özel profillerde kapsam zayıf
- **Dosya:satır:** `__tests__/calculator/document-calculator.test.ts` (tam dosya)
- **Gözlem:** YATIRIMTESVIK, ILAC_TIBBICIHAZ, SGK, ENERJI, IDIS, HKS, OZELFATURA profilleri için test yok. `invoice-rules.ts` bu profiller için field visibility + tip filtreleme tanımlıyor; document-calculator ise profil tespiti yapıyor. Tespit ve field görünürlük arasındaki cross-check test edilmemiş.
- **Normatif referans:** v1.42 §4.4 InvoiceProfileId 12 profil (Denetim 01 §2); Schematron profil-tip matrisi.
- **Durum tipi:** B.

---

## 2. Yuvarlama Mantığı

### 2.1 XSD + Schematron Kuralı

XSD (`UBL-UnqualifiedDataTypes-2.1.xsd:59-89` + `CCTS_CCT_SchemaModule-2.1.xsd:46-59`):
- `AmountType` = `xsd:decimal` (fractionDigits kısıtı **yok** — sınırsız ondalık basamak teorik olarak kabul)
- `currencyID` zorunlu

Schematron (`UBL-TR_Common_Schematron.xml:229-231`):
```xml
<sch:rule abstract="true" id="decimalCheck">
  <sch:assert test="matches(.,'^(\s)*?[0-9][0-9]{0,16}(,[0-9]{3})*(\.[0-9]{1,2}(\s)*?)?(\s)*?$')">
    Geçersiz ... elemanı değeri. Noktadan önce en fazla 15, noktadan sonra (kuruş) en fazla 2 haneli olmalıdır.
  </sch:assert>
</sch:rule>
```

MainSchematron (`UBL-TR_Main_Schematron.xml:260-287`) bu kuralı şu parasal alanlara uyguluyor:
- `LegalMonetaryTotal/LineExtensionAmount`
- `LegalMonetaryTotal/TaxExclusiveAmount`
- `LegalMonetaryTotal/TaxInclusiveAmount`
- `LegalMonetaryTotal/AllowanceTotalAmount`
- `LegalMonetaryTotal/PayableAmount`
- `TaxTotal/TaxAmount` (iki sch:rule aynı context — satır 278 ve 285)

**Sonuç:** Belge seviyesi parasal değerler **en fazla 2 ondalık basamak** içermelidir. Satır seviyesi (`InvoiceLine/LineExtensionAmount`, `cbc:PriceAmount`, `cbc:TaxAmount`) için Main Schematron'da decimalCheck yok — yani satır seviyesinde teknik olarak 2+ basamak XSD'ce geçer.

### 2.2 Kütüphanenin Yuvarlama Davranışı

#### 2.2.1 Calculator (line-calculator + document-calculator)

`Math.round()`, `Number.toFixed()`, `parseFloat(...toFixed())` **hiçbir yerde yok**. Yani JavaScript double precision (~15-17 basamak) aritmetiği uygulanıyor:
- `1000 * 0.18 = 180` ✓ (float tesadüfen tam sayı)
- `100.5 * 0.18 = 18.09` ✓
- `0.1 + 0.2 = 0.30000000000000004` ← tipik float artefact
- `900 * 0.18 * 0.4 = 64.80000000000001` ← kombine test senaryosu gibi

Calculator `CalculatedDocument.monetary.lineExtensionAmount` tipinde **number** dönüyor, 17-basamak hassasiyet korunuyor.

#### 2.2.2 Serializer (formatters.ts + xml-helpers.ts + monetary-serializer.ts)

`src/utils/formatters.ts:2-4`:
```ts
export function formatDecimal(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}
```

`src/utils/xml-helpers.ts:42-48`:
```ts
export function cbcAmountTag(localName: string, amount: number | ..., currencyCode: string): string {
  if (amount === undefined || amount === null) return '';
  return tag(`cbc:${localName}`, {
    content: formatDecimal(amount),  // default decimals=2
    attrs: { currencyID: currencyCode },
  });
}
```

Yani **serializer seviyesinde her `cbcAmount` çağrısı `toFixed(2)` uyguluyor**. 64.80000000000001 → "64.80". Schematron `decimalCheck` geçer.

`toFixed(2)` JavaScript'te **banker's rounding değil**, round-half-away-from-zero'a yakın (ama aslında round-half-to-even ile karışık, IEEE 754 kaynaklı). Bu normatif kaynak spesifik değil — skill yuvarlama yöntemi vermiyor, XSD vermiyor, Schematron sadece "en fazla 2 basamak" diyor. **Durum B**.

#### 2.2.3 Satır vs Belge Yuvarlama Çelişkisi

Tipik senaryo: 3 satır, her biri 33.33 matrah, %20 KDV.
- Satır KDV: 33.33 × 0.2 = 6.666
- Satır XML: `<TaxAmount>6.67</TaxAmount>` (toFixed(2) = 6.67)
- Belge KDV (calculator): Σ 6.666 = 19.998
- Belge XML: `<TaxAmount>20.00</TaxAmount>` (toFixed(2))
- Σ satır XML: 6.67 × 3 = 20.01
- **Belge TaxAmount 20.00, Σ satır TaxAmount 20.01 → tutarsız** ama her ikisi de Schematron decimalCheck geçerli.

Schematron bu aritmetik çelişkiyi kontrol etmiyor, ama Mimsoft pre-validation ve GİB "arithmetic consistency" kurallarını uygular. Kütüphane bu edge case'i çözmüyor — ne banker's rounding ne de "belge seviyesi = Σ(satır.toFixed(2))" stratejisi kullanıyor.

### [YÜKSEK][KÜTÜPHANE] Satır ve belge seviyesi yuvarlama arası tutarlılık yok
- **Dosya:satır:** `src/calculator/*.ts` (hesaplama — yuvarlama yok), `src/utils/xml-helpers.ts:42-48` + `src/utils/formatters.ts:2-4` (serializer — toFixed(2))
- **Gözlem:** Calculator float aritmetik kullanıyor, serializer her Amount'a `toFixed(2)` uyguluyor. Belge değeri = Σ(satır raw) sonra toFixed, satırlar önce toFixed sonra toplanırsa tutarsız. Örnek: 3 × 6.666 = 19.998 → belge "20.00", Σ XML-satır "20.01". Kütüphane ne banker's rounding ne de "output-first sum" stratejisi uygulamıyor.
- **Normatif referans:** Schematron `decimalCheck` (max 2 basamak) satır 229-231; skill yuvarlama algoritması vermiyor → Durum B; UBL 2.1 "arithmetic consistency" uygulama kılavuzu.
- **Durum tipi:** B — normatif kaynak yöntem spesifikasyonu vermiyor, kütüphane seçim yapmamış.

### [ORTA][TEST] Float edge case'leri için test yok
- **Dosya:satır:** `__tests__/calculator/line-calculator.test.ts` + `document-calculator.test.ts`
- **Gözlem:** `toBeCloseTo(77.76)` kullanımları (satır 231, 234, 236) float toleransı kabul ediyor ama `toBe(200)` tipinde tam eşitlik testleri (çoğu) float tesadüfü örüntüsüne bağlı. 0.1+0.2, 33.33 × 0.2 gibi klasik float artefact testleri yok. Multi-line toplam yuvarlama senaryosu yok.
- **Normatif referans:** —
- **Durum tipi:** B.

### 2.3 PayableRoundingAmount otomatik hesaplama yok

`DocumentMonetary` tipinde alan yok, `simple-invoice-mapper.ts:269-277` set etmiyor. Kullanıcı 2-basamaklı yuvarlama farkını manuel olarak veremiyor. `SimpleInvoiceInput` tipinde alan yok (`simple-types.ts:319-410`).

§1.2.3'te YÜKSEK olarak raporlandı.

### 2.4 Percent formatı

`src/serializers/tax-serializer.ts:36,73`:
```ts
lines.push(`${i2}${cbcTag('Percent', formatDecimal(ts.percent, 0))}`);
```

`formatDecimal(percent, 0)` → 0 ondalık, yani "20" olarak yazılıyor. Schematron'da Percent için özel format kuralı yok (skill `ortak-parasal-ve-vergi-v0.7.md` §268 `TaxSubtotal.Percent` "0-100 arası yüzde"). `18.5` gibi kesirli oran `formatDecimal(18.5, 0)` → **"19"** olarak yuvarlanır (yanlış!).

### [YÜKSEK][KÜTÜPHANE] Percent 0 ondalık basamağa yuvarlanıyor — kesirli oran kaybı
- **Dosya:satır:** `src/serializers/tax-serializer.ts:36,73` (`formatDecimal(ts.percent, 0)`)
- **Gözlem:** Vergi oranı `formatDecimal(percent, 0)` ile 0-basamak'a yuvarlanıyor. `18.5` → "19", `1.5` (örn. ÖTV) → "2". Kesirli KDV oranı (örn. %0.5 konaklama vergisi veya %1 bazı ürünler) kaybolur.
- **Normatif referans:** skill `ortak-parasal-ve-vergi-v0.7.md` §268 "Percent yüzde (0-100 arası, örn. 18.0)"; Schematron Percent için özel regex yok ama XSD `xsd:decimal` kabul ediyor.
- **Durum tipi:** B — skill kesirli orana izin veriyor, Schematron'da yasak yok, kütüphane kendi yuvarlamasıyla bozuyor.

---

## 3. ConfigManager ve InvoiceSession (Reaktif State)

### 3.1 ConfigManager — Tekrar tespit edilen case-sensitivity hatası

`unit-config.ts:96-99`:
```ts
const UNIT_BY_NAME: ReadonlyMap<string, UnitDefinition> = new Map(
  UNIT_DEFINITIONS.map(u => [u.name.toLowerCase(), u]),   // ← lowercase normalizasyon
);

// unit-config.ts:106-111
export function resolveUnitCode(input: string): string {
  if (UNIT_BY_CODE.has(input)) return input;
  const byName = UNIT_BY_NAME.get(input.toLowerCase());  // ← lowercase
  if (byName) return byName.code;
  return input;
}
```

`config-manager.ts:370-374`:
```ts
private buildUnitMaps(units: UnitDefinition[]): { ... } {
  const codeMap = new Map(units.map(u => [u.code, u]));
  const nameMap = new Map(units.map(u => [u.name, u]));  // ← CASE-SENSITIVE (lowercase YOK)
  return { codeMap, nameMap };
}

// config-manager.ts:283-288
resolveUnitCode(input: string): string {
  if (this._unitCodeMap.has(input)) return input;
  const byName = this._unitNameMap.get(input);           // ← CASE-SENSITIVE
  if (byName) return byName.code;
  return input;
}
```

`line-calculator.ts:195`:
```ts
const unitCode = configManager.resolveUnitCode(line.unitCode ?? 'Adet');
```

**Sorun:** Kullanıcı `"kilogram"` (lowercase) girerse:
- `unit-config.ts.resolveUnitCode('kilogram')` → `'kilogram'.toLowerCase()` = `'kilogram'` → `UNIT_BY_NAME.get('kilogram')` → bulur ("Kilogram" lowercase'li map'te) → `'KGM'` döner ✓
- `configManager.resolveUnitCode('kilogram')` → `_unitNameMap.get('kilogram')` → bulamaz (map key'i "Kilogram", case-sensitive) → `'kilogram'` aynen döner (UBL'ce geçersiz birim kodu) ✗

**Etkileyen kullanım:** line-calculator direkt `configManager`'ı çağırıyor, yani **üretim yolu bug'lı**. Bağımsız `unit-config.resolveUnitCode` export edilmiş ve düzgün davranıyor → iki truth source.

### [YÜKSEK][KÜTÜPHANE] ConfigManager.resolveUnitCode case-sensitive — unit-config modül versiyonu ile davranış farkı
- **Dosya:satır:** `src/calculator/config-manager.ts:370-374` (`buildUnitMaps` — lowercase yok), `:283-288` (`resolveUnitCode` — lowercase yok); `src/calculator/unit-config.ts:97-99,106-111` (lowercase normalizasyon var).
- **Gözlem:** line-calculator.ts:195 `configManager.resolveUnitCode(...)` çağrısında kullanıcı "kilogram", "adet", "litre" (Türkçe lowercase) girerse bulunmaz ve UBL'ce geçersiz birim kodu XML'e geçer. Unit-config modül versiyonu doğru davranıyor ama calculator kullanmıyor.
- **Normatif referans:** UN/ECE UnitCode listesi case-sensitive kod bekliyor; Türkçe kullanıcı input'u case-insensitive beklenir (kullanılabilirlik). Schematron `UnitCodeList` regex'i kabulsüz kod reddeder.
- **Durum tipi:** A — iç tutarsızlık, iki truth source farklı davranış.

### 3.2 Singleton ConfigManager — Test İzolasyonu Endişesi

`config-manager.ts:384`:
```ts
export const configManager = new ConfigManager();
```

Global singleton. `calculateLine` (line-calculator:114), `calculateDocument` aracılığıyla **her test bu aynı instance'ı paylaşıyor**. Test'ler bir başka `configManager.updateTaxes(...)` yaparsa, izolasyonsuz — sonraki test'ler farklı config görür.

Line-calculator.test.ts + document-calculator.test.ts **hiçbir `configManager.reset()` veya `updateTaxes` çağırmıyor**, yani mevcut testler etkilemiyor. Ama gelecekte yazılacak "DB override" test'leri için izolasyon sorun olabilir.

Vitest `beforeEach(() => configManager.reset())` patteri yok. DOKÜMAN kategorisi:

### [DÜŞÜK][DOKÜMAN] ConfigManager singleton test izolasyonu rehberi yok
- **Dosya:satır:** `src/calculator/config-manager.ts:384` (`export const configManager = new ConfigManager()`)
- **Gözlem:** Test'lerde DB override yapılsa `reset()` çağırmak gerekiyor, ama JSDoc bu pratiği belgelemiyor. Gelecek test'lerin bu hataya düşmesi risk.
- **Normatif referans:** —
- **Durum tipi:** B (skill sessiz, iyileştirme önerisi).

### 3.3 EventEmitter Race Condition

`config-manager.ts:68` `ConfigManager extends EventEmitter` + Node.js EventEmitter **synchronous** (emit'ler senkron). `configManager.updateTaxes([...])` → `setTaxes` → map rebuild → emit. Bu senkron akışta race condition yok (single-thread JavaScript).

Ancak: **iki farklı fatura session'ı aynı configManager'ı paylaşıyor**. Session A `updateTaxes(new)` yaparsa Session B'nin hesabı değişir. Bu bilinçli bir tasarım kararı (SDK-wide config) ama belgelenmesi gerekiyor.

### [DÜŞÜK][DOKÜMAN] ConfigManager global scope — multi-session impact belgelenmemiş
- **Dosya:satır:** `src/calculator/config-manager.ts:384` + `src/calculator/invoice-session.ts:39` (InvoiceSession config'i global configManager'dan okuyor — bkz. `resolveUnitCode` in `invoice-session:32 import`)
- **Gözlem:** Bir session'ın `updateTaxes` çağrısı diğer tüm session'ları etkiliyor. JSDoc (`config-manager.ts:1-23`) "DB trigger sonrası runtime güncelleme" der ama paralel session etkisini not etmez.
- **Normatif referans:** —
- **Durum tipi:** B.

### 3.4 InvoiceSession — setType/setProfile/setLiability akışı

`invoice-session.ts:186-208` `setLiability`:
- mevcut profile liability ile uyumsuzsa otomatik olarak `resolveProfileForType` ile uyumlu profile geçer
- sonra `resolveTypeForProfile` ile tip de güncellenir

Akış doğru ama iki kez `resolveProfile/Type` çağrısı yapılıyor, edge case: `liability='earchive'` + `type='IADE'` + mevcut profile `TICARIFATURA`.
- `allowedProfiles = getAllowedProfilesForType('IADE', 'earchive', false)` → liability filtre → `EARSIVFATURA` (sadece)
- `TICARIFATURA` uyumsuz → `resolveProfileForType(undefined, 'IADE', 'earchive', false)` → allowed=['EARSIVFATURA'] → IADE özel kuralı `allowed.includes('TEMELFATURA')` yok → `allowed[0]` = `'EARSIVFATURA'` ✓
- Sonra `resolveTypeForProfile('IADE', 'EARSIVFATURA', 'earchive')` → allowed types for EARSIVFATURA includes IADE ✓

OK bu senaryoda doğru. Ama `isExport` senaryosu: `this._isExport = true` sabit. IHRACAT profili kilitli. `setLiability('earchive')` çağırılırsa:
- `allowedProfiles = filterProfilesByLiability(TYPE_PROFILE_MAP[type], 'earchive', true)` → `earchive` filter `(p === 'EARSIVFATURA')` only → `IHRACAT` reddedilir → liste boş
- `TICARIFATURA` gibi currentProfile uyumsuz → `resolveProfileForType(...)` → `allowed[0]` **undefined** → `'TICARIFATURA'` fallback
- Sonuç: **isExport=true ama profil TICARIFATURA olarak güncelleniyor!** (isExport kontrat ihlali)

### [YÜKSEK][KÜTÜPHANE] setLiability('earchive') isExport=true session'ında IHRACAT'ı TICARIFATURA'ya zorluyor
- **Dosya:satır:** `src/calculator/invoice-session.ts:186-208` (`setLiability`), `src/calculator/invoice-rules.ts:76-93` (`filterProfilesByLiability`)
- **Gözlem:** isExport=true + setLiability('earchive') çağrıldığında `getAllowedProfilesForType` filtresi IHRACAT'ı reddediyor (`p === 'EARSIVFATURA'` only). `resolveProfileForType` boş listede fallback olarak 'TICARIFATURA' dönüyor → isExport kontratı (constructor-only, sabit IHRACAT) ihlal ediliyor. `setProfile('IHRACAT')` için runtime'da error var ama setLiability bu korumayı uygulamıyor.
- **Normatif referans:** Skill-level yok; iç kontrat — constructor kontratı değişmemeli.
- **Durum tipi:** B.

---

## 4. Config Tüketim Kontrolü

> Config dosyalarının kendi içeriği D02'de ayrıntılı incelendi. Burada sadece **calculator'ın bu config'leri nasıl tükettiği** incelenir.

### 4.1 tax-config.ts kullanımı

`line-calculator.ts:114`:
```ts
const taxDef = configManager.getTax(tax.code);
if (!taxDef) {
  throw new Error(`Geçersiz vergi kodu: ${tax.code}. ...`);
}
```

Throw davranışı — D02 §2.1'de 5 eksik kod (0021, 0022, 4171, 9015, 9944) ile kullanıcı `tax.code='0021'` verirse hata fırlatılır. Constants.ts'teki `TAX_TYPE_CODES` 31 kodu içeriyor; calculator `tax-config.ts` üzerinden 27 kod (KDV + 26) kabul ediyor. **İki truth source farkı 4+ kodda davranış farkı üretir:**
- Validator `TAX_TYPE_CODES.has('0021')` → true (geçer)
- Calculator `configManager.getTax('0021')` → undefined → **throw**

Kullanıcı validator'dan geçen bir fatura'yı calculator'a verince Exception alır. D02 bulgusu burada **üretim path'inde ikinci kez teyit ediliyor**.

### [ORTA][KÜTÜPHANE] tax-config'ten eksik kodlar calculator'da runtime exception üretiyor (D02 teyit)
- **Dosya:satır:** `src/calculator/line-calculator.ts:114-117`
- **Gözlem:** D02 §2.1 bulgusu: tax-config 0021/0022/4171/9015/9944 içermiyor. constants `TAX_TYPE_CODES.has` bu kodları kabul ediyor. Calculator `getTax(code)` undefined döndürünce throw ediyor. Yani constants-validator doğrular ama calculator **çalışma zamanında patlıyor**. Çift truth source hatası calculator'a taşıyor.
- **Normatif referans:** D02 §2.1 + bu denetim.
- **Durum tipi:** A.

### 4.2 withholding-config.ts kullanımı

`line-calculator.ts:164-167`: `configManager.getWithholdingTax(code)` → undefined ise throw.

Skill §4.9.2 tevkifat oranları ile kütüphane `WITHHOLDING_TAX_DEFINITIONS` karşılaştırması: **27 kod × 27 doğru oran + 25 kod × %100 ✓ toplam 52/52 UYUMLU**.

Tek uyumsuzluk: **616 kodunun adı**:
- Skill: "Diğer Hizmetler [KDVGUT-(I/C-2.1.3.2.13)]"
- Kütüphane: "5018 Sayılı Kanuna Ekli Cetvellerdeki İdare, Kurum ve Kuruluşlara Yapılan Diğer Hizmetler"

Kütüphane'nin kullandığı isim daha önceki bir KDVGUT versiyonu (v1.22 öncesi) — güncel isim değişmiş. `cbc:TaxScheme/cbc:Name` serbest metin (Schematron kısıtı yok), reddedilmez ama **eskimiş terminoloji**.

### [DÜŞÜK][KÜTÜPHANE] Tevkifat 616 kodunun adı eski KDVGUT sürümüyle
- **Dosya:satır:** `src/calculator/withholding-config.ts:31`
- **Gözlem:** Kod 616 adı "5018 Sayılı Kanuna Ekli Cetvellerdeki..." olarak tanımlı; skill v1.42 §4.9.2 "Diğer Hizmetler [KDVGUT-(I/C-2.1.3.2.13)]" diyor. Oran doğru (5/10 = %50), sadece isim eskimiş.
- **Normatif referans:** v1.42 §4.9.2 satır 499.
- **Durum tipi:** A.

### 4.3 exemption-config.ts kullanımı

`document-calculator.ts:235-241`:
```ts
if (input.kdvExemptionCode) {
  const exemption = configManager.getExemption(input.kdvExemptionCode);
  if (exemption) {
    if (exemption.documentType === 'ISTISNA' && typesArray.includes('ISTISNA')) return 'ISTISNA';
    if (exemption.documentType === 'IHRACKAYITLI') return 'IHRACKAYITLI';
    if (exemption.documentType === 'OZELMATRAH') return 'OZELMATRAH';
  }
}
```

`simple-invoice-mapper.ts:510-511`:
```ts
`${EXEMPTION_MAP.get(simple.sgk.type)?.name ?? simple.sgk.type}`  // SGK adı çözümleme
```

SGK hybrid kullanımı: exemption-config hem KDV istisnası hem SGK belge tipi çözümleme için ortak kullanılıyor. `documentType` enum'u `'ISTISNA' | 'SATIS' | 'IHRACKAYITLI' | 'OZELMATRAH' | 'SGK'`. Bu karışık tasarım (vergi istisnası + SGK kurum tipi aynı listede) ama işlevsel.

D02 §1.2 ve §1.3 bulguları tekrar teyit:
- 326-344 arası 17 tam istisna kodu eksik (kullanıcı `kdvExemptionCode='326'` verirse `configManager.getExemption(...)` → undefined → hesap `ISTISNA` döndürmez, fallback devreye girer)
- 555 kodu yok (`getExemption('555')` → undefined → DemirbasKDV senaryosu çalıştırılamaz)
- 351 "SATIS" documentType'ında — ISTISNA tipine fallback olarak dönüyor ama validator reddediyor (§1.2.5)

### [YÜKSEK][KÜTÜPHANE] kdvExemptionCode=326 (tam istisna) IHRACKAYITLI/ISTISNA hesaplamasına girmiyor
- **Dosya:satır:** `src/calculator/document-calculator.ts:236-241`
- **Gözlem:** D02 §1.2'de exemption-config.ts'te 326-344 eksik bulunmuştu. Calculator bu kodları `getExemption` ile aradığında undefined alıyor ve `documentType`-bazlı tip tespiti atlanıyor. Kullanıcı 326 verirse fatura tipi fallback ile ISTISNA (sadece KDV 0 varsa) ya da SATIS olur, kullanıcı kastının **tam istisnası** kaybolur. `taxExemptionReason.kdv` de varsayılan 350'ye düşer.
- **Normatif referans:** D02 §1.2 + v1.42 §4.8.2.
- **Durum tipi:** A — Calculator seviyesinde D02 bulgusunun ikinci görünümü.

### 4.4 `getExemptionsByDocumentType` ve `getAvailableExemptions` mantığı

`config-manager.ts:257-259`:
```ts
getExemptionsByDocumentType(documentType: string): ExemptionDefinition[] {
  return this._exemptions.filter(e => e.documentType === documentType);
}
```

`invoice-rules.ts:293-307`:
```ts
export function getAvailableExemptions(type: string): ExemptionDefinition[] {
  switch (type) {
    case 'ISTISNA':
    case 'YTBISTISNA':
      return configManager.getExemptionsByDocumentType('ISTISNA');
    case 'IHRACKAYITLI':
      return configManager.getExemptionsByDocumentType('IHRACKAYITLI');
    case 'OZELMATRAH':
      return configManager.getExemptionsByDocumentType('OZELMATRAH');
    case 'SGK':
      return configManager.getExemptionsByDocumentType('SGK');
    default:
      return [];
  }
}
```

**Sorun 1 — SGK için ISTISNA eksik:** Schematron 316 `TaxExemptionReasonCodeCheck` SGK tipini ISTISNA istisna kodları listesinde kabul etti (`../../../cbc:InvoiceTypeCode = 'SGK'` `istisnaTaxExemptionReasonCodeType` kontrolünün izinli tipleri arasında). Yani SGK faturası KDV istisnası kullanabilir. UI bu kullanıcıyı ISTISNA dropdown'ıyla desteklemiyor — yalnız SGK kurum tipi kodlarını (7 kod) sunuyor.

**Sorun 2 — IADE tipi için hiç istisna önerisi yok:** Schematron 316/318/320 IADE tipini hem ISTISNA hem OZELMATRAH hem IHRACKAYITLI kodları için kabul listesinde. `getAvailableExemptions('IADE')` ise `default: []` dönüyor. Iade tipinde KDV 0 ve istisna kodu senaryosu UI'da görünmez.

**Sorun 3 — TEVKIFAT/TEVKIFATIADE için hiç istisna yok:** Schematron buna özel bir kural yok (tevkifat için TaxExemptionReasonCode zorunlu değil), ama kütüphane `DEFAULT_EXEMPTIONS.satis = '351'`'i (§1.2.5) TEVKIFAT tipinde otomatik koyuyor. UI `availableExemptions=[]` dönüyor ama calculator 351'i zorluyor — tutarsız.

### [YÜKSEK][KÜTÜPHANE] getAvailableExemptions SGK/IADE/TEVKIFAT için Schematron'un kabul listesini yansıtmıyor
- **Dosya:satır:** `src/calculator/invoice-rules.ts:293-307`
- **Gözlem:** `switch` sadece 4 tipi (ISTISNA/YTBISTISNA/IHRACKAYITLI/OZELMATRAH/SGK) kapsıyor. Schematron 316 ISTISNA kodlarını `ISTISNA, IADE, IHRACKAYITLI, SGK, YTBISTISNA, YTBIADE` tiplerinde kabul ediyor; 318 OZELMATRAH kodlarını `OZELMATRAH, IADE, SGK`; 320 IHRACKAYITLI kodlarını `IHRACKAYITLI, IADE, SGK`. UI bu tip-kod kombinasyonlarını kullanıcıya göstermiyor.
- **Normatif referans:** CommonSchematron `TaxExemptionReasonCodeCheck` satır 311-322; D03 §3 (TaxExemptionReasonCode cross-check eksiği — üç farklı katmanda aynı sorun).
- **Durum tipi:** A.

### 4.5 unit-config.ts kullanımı

`line-calculator.ts:195`:
```ts
const unitCode = configManager.resolveUnitCode(line.unitCode ?? 'Adet');
```

§3.1'de KRİTİK-alt seviye (YÜKSEK) bulgusu — case-sensitive. Aksi halde doğru çalışıyor.

### 4.6 currency-config.ts kullanımı

`document-calculator.ts:86,187`:
```ts
const currencyCode = input.currencyCode ?? DEFAULT_CURRENCY_CODE;  // 'TRY'
// ...
if (currencyCode !== DEFAULT_CURRENCY_CODE) {
  exchangeRate = input.exchangeRate ?? null;
}
```

Calculator sadece `DEFAULT_CURRENCY_CODE` sabitini kullanıyor. `isValidCurrencyCode` hiç çağırmıyor → geçersiz kod (örn. "TRL" — D02 §10.1 bulgusu) passed through. Bu D02 bulgusu mapper'da da **aynı davranışla** tekrar kendini gösteriyor: mapper `calc.currencyCode`'u doğrudan `InvoiceInput.currencyCode`'a yazıyor (`simple-invoice-mapper.ts:73`), validator gerçekleştiği zamanda ret ediyor ama hesaplama aşamasında sessiz geçiyor.

---

## 5. `invoice-rules.ts` — UI Derivation

### 5.1 PROFILE_TYPE_MAP vs TYPE_PROFILE_MAP tutarlılığı

D01 §3 bulgusu: `constants.ts` matrislerindeki (PROFILE_TYPE_MATRIX) + `invoice-rules.ts`'teki iki matrisler arasında farklar.

Ek inceleme: `PROFILE_TYPE_MAP` (satır 33-47) ↔ `TYPE_PROFILE_MAP` (satır 50-63) iç tutarlılığı.

| Profil | PROFILE_TYPE_MAP kabul ettiği tipler | TYPE_PROFILE_MAP'in bu profili listelediği tipler | Uyum |
|---|---|---|---|
| TEMELFATURA | SATIS, IADE, ISTISNA, IHRACKAYITLI, OZELMATRAH, TEVKIFAT, SGK, KOMISYONCU, KONAKLAMAVERGISI (9) | SATIS, IADE, TEVKIFAT, ISTISNA, IHRACKAYITLI, OZELMATRAH, SGK, KOMISYONCU, KONAKLAMAVERGISI (9) | ✓ |
| TICARIFATURA | SATIS, IADE, ISTISNA, IHRACKAYITLI, OZELMATRAH, TEVKIFAT, SGK, KOMISYONCU, KONAKLAMAVERGISI (9) | SATIS, IADE, TEVKIFAT, ISTISNA, IHRACKAYITLI, OZELMATRAH, SGK, KOMISYONCU, KONAKLAMAVERGISI (9) | ✓ |
| EARSIVFATURA | 15 tip (SATIS+IADE+... + YTB grubu) | SATIS, IADE, TEVKIFAT, ISTISNA, IHRACKAYITLI, OZELMATRAH, KOMISYONCU, TEKNOLOJIDESTEK, KONAKLAMAVERGISI = 9 | **YTB grubu (YTBSATIS, YTBIADE, YTBISTISNA, YTBTEVKIFAT, YTBTEVKIFATIADE) TYPE_PROFILE_MAP'te yok** |
| IHRACAT | SATIS, ISTISNA, IHRACKAYITLI | aynı | ✓ |
| YOLCUBERABERFATURA | SATIS, ISTISNA | aynı | ✓ |
| KAMU | SATIS, ISTISNA, TEVKIFAT, IHRACKAYITLI, OZELMATRAH, KONAKLAMAVERGISI (6) | SATIS, TEVKIFAT, ISTISNA, IHRACKAYITLI, OZELMATRAH, KONAKLAMAVERGISI (6) | ✓ |
| OZELFATURA | SATIS, ISTISNA | SATIS, ISTISNA | ✓ |
| HKS | SATIS, KOMISYONCU | SATIS, KOMISYONCU | ✓ |
| ILAC_TIBBICIHAZ | SATIS, ISTISNA, TEVKIFAT, TEVKIFATIADE, IADE, IHRACKAYITLI | aynı + `TEVKIFATIADE` hem var | ✓ |
| YATIRIMTESVIK | SATIS, ISTISNA, IADE, TEVKIFAT, TEVKIFATIADE | aynı | ✓ |
| ENERJI | SARJ, SARJANLIK | SARJ, SARJANLIK | ✓ |
| IDIS | SATIS, ISTISNA, IADE, TEVKIFAT, TEVKIFATIADE, IHRACKAYITLI | aynı | ✓ |

### [ORTA][KÜTÜPHANE] TYPE_PROFILE_MAP YTB tipleri için EARSIVFATURA'yı listelemiyor
- **Dosya:satır:** `src/calculator/invoice-rules.ts:50-63`
- **Gözlem:** `PROFILE_TYPE_MAP.EARSIVFATURA` YTBSATIS/YTBIADE/YTBISTISNA/YTBTEVKIFAT/YTBTEVKIFATIADE'yi destekliyor, ama `TYPE_PROFILE_MAP` bu 5 tipin `profile` dropdown'ında EARSIVFATURA'yı göstermez. `getAllowedProfilesForType('YTBSATIS')` → fallback `['TEMELFATURA', 'TICARIFATURA']`. Kullanıcı YTBSATIS + EARSIVFATURA kombinasyonunu seçemez UI'dan (ancak doğrudan input.profile='EARSIVFATURA' verirse geçer).
- **Normatif referans:** Codelist `YatirimTesvikEArsivInvoiceTypeCodeList` (satır 65); v1.42 §5.5 "YTB e-Arşiv fatura tipleri".
- **Durum tipi:** A.

### 5.2 `resolveProfileForType` — Özel kurallar

`invoice-rules.ts:216-232`:
- type=IADE → allowed.includes('TEMELFATURA') ? 'TEMELFATURA' : allowed[0] ?? 'TICARIFATURA'
- type=SGK → TEMELFATURA benzer
- type=TEKNOLOJIDESTEK → EARSIVFATURA
- type=SARJ/SARJANLIK → 'ENERJI'

**Sorun:** Fallback `allowed[0] ?? 'TICARIFATURA'` — eğer allowed list liability ile filtre sonucu boşsa, TICARIFATURA default. Liability='earchive' + type='IADE' senaryosunda:
- allowed = filterProfilesByLiability([...IADE profiles], 'earchive') = sadece EARSIVFATURA varsa
- IADE → allowed.includes('TEMELFATURA') false → allowed[0] = EARSIVFATURA ✓

Başka senaryo: Liability='earchive' + type='SGK':
- PROFILE_TYPE_MAP'e göre SGK sadece TEMELFATURA ve TICARIFATURA'da olabilir
- filterProfilesByLiability(['TEMELFATURA','TICARIFATURA'], 'earchive') → sadece EARSIVFATURA kabul → **boş liste**
- `resolveProfileForType` fallback `'TICARIFATURA'` dönüyor ama earchive mükellefi → çelişki

### [YÜKSEK][KÜTÜPHANE] resolveProfileForType earchive+SGK'da geçersiz profile dönebilir
- **Dosya:satır:** `src/calculator/invoice-rules.ts:216-232`, `:76-93` (filterProfilesByLiability)
- **Gözlem:** e-Arşiv mükellefi SGK faturası oluşturmaya çalışırsa allowed liste boş olur, fallback `'TICARIFATURA'` dönüyor. Ama liability kısıtı TICARIFATURA'yı da engellemeli. Gerçekte SGK sadece TEMELFATURA/TICARIFATURA profilinde kabul edildiği için **earchive mükellefi SGK faturası kesemez** — kütüphane bu yasağı fırlatmıyor, yanlış profile düşürüyor.
- **Normatif referans:** Schematron SGK tipinin profil kısıtı yok (skill §4.3 profiles listesi + v1.42 §4.4); ancak liability ↔ profil kısıtı (e-Arşiv mükellefi = sadece EARSIVFATURA).
- **Durum tipi:** B — iki kısıtın kesişimi boş, kütüphane fallback'e düşüp error atmıyor; doğru davranış `throw` ya da `undefined` dönüş.

### 5.3 `validateInvoiceState` kapsamı

`invoice-rules.ts:312-392` 10 kural:
1. IADE grubu → billingReference zorunlu
2. TRY dışı + exchangeRate zorunlu
3. KAMU → paymentMeans + meansCode + IBAN + format regex
4. ISTISNA/YTBISTISNA/IHRACKAYITLI/OZELMATRAH → kdvExemptionCode zorunlu
5. IHRACAT → buyerCustomer zorunlu
6. KAMU → buyerCustomer (aracı kurum) zorunlu
7. TEVKIFAT → en az 1 satırda withholdingTaxCode
8. YATIRIMTESVIK → ytbNo zorunlu + 6-hane format
9. IDIS → SEVKIYATNO zorunlu

**Eksik kurallar (Denetim 03 paralelinden + ek):**
- 555 kodu cross-check (Schematron 497-499 DemirbasKDV)
- YATIRIMTESVIK CalculationSequenceNumeric=-1 (Schematron 468)
- IHRACKAYITLI + 702 → GTİP + ALICIDIBSATIRKOD satır bazlı (Schematron 322)
- 4171 ile uyumlu fatura tipi (Schematron 291: TEVKIFAT/IADE/SGK/YTBIADE)
- YOLCUBERABERFATURA → buyerCustomer + partyType=TAXFREE + PartyIdentification passport
- TaxRepresentativeParty (YOLCUBERABERFATURA zorunlu)
- YTBNO issueDate zorunlu mu?
- HKS profili → SATIS tipinde KOMISYONCU özel kuralları
- IHRACAT → PartyTaxScheme/Name zorunlu (Schematron 428)

Bu D03 ile örtüşen bir eksiklik listesi. D03 validator katmanı için raporladı; D05 UI tarafı için tekrar tespit:

### [ORTA][KÜTÜPHANE] validateInvoiceState UI-tarafı Schematron eksikleri — D03 paralel bulgu
- **Dosya:satır:** `src/calculator/invoice-rules.ts:312-392`
- **Gözlem:** UI form-state validator'ı aşağıdaki Schematron kurallarını kapsamıyor: 555+KDV 0 (Schematron 497-499), YATIRIMTESVIK CalculationSequenceNumeric=-1 (468), 702+GTİP/ALICIDIBSATIRKOD (322), 4171+tip kombinasyonu (291), YOLCU TaxRepresentativeParty, IHRACAT PartyTaxScheme/Name (428). D03 §5 validator katmanında aynı eksiklikler raporlandı — UI katmanında da yok; iki katmanda cross-check boşluğu.
- **Normatif referans:** D03 bulguları 1-4 (KRİTİK) + common-Schematron ilgili satırlar.
- **Durum tipi:** A.

### 5.4 `deriveFieldVisibility` — 16 alan

`invoice-rules.ts:251-288`. Her alan için kısa kontrol:
- `showBillingReference = isIade` → IADE grup (✓ §4 — TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE).
- `showWithholdingTaxSelector = isTevkifat || isIade` → TEVKIFAT + IADE grup. **Sorun:** IADE tipi TEVKIFATIADE değilse (sade IADE), tevkifat selector görünüyor — gerekli değil.
- `showBuyerCustomer = isIhracat || isYolcuBeraber || isKamu` → YOLCU ve KAMU için `BuyerCustomerParty` farklı anlamlarda (§1.2.6 bulgusu — resolveProfile ilişkili).
- `showLineDelivery = isIhracat || isIhracKayitli` → IHRACAT + IHRACKAYITLI. **Doğru** (Schematron kuralı: bu iki profilde satır Delivery zorunlu).
- `showPaymentMeans = isKamu` — KAMU'ya özgü. **Ama EARSIVFATURA online satışta da PaymentMeans önerilir.**
- `requireIban = isKamu` → doğru (Schematron 4 numaralı kural).
- `showExchangeRate = currencyCode !== 'TRY'` → doğru.
- `showYatirimTesvikNo = isYatirimTesvik` → doğru.
- `showAdditionalItemIdentifications = isIlacTibbi || isTeknolojiDestek || isIdis` — eksik: **TEKNOLOJIDESTEK bir TIP** değil profil değil (ENUM — EARSIVFATURA içinde tip); `isTeknolojiDestek` satır 263 type=TEKNOLOJIDESTEK'i kontrol ediyor — doğru.
- `showSevkiyatNo = isIdis` → doğru.
- `showTaxRepresentativeParty = isYolcuBeraber` → doğru (YOLCUBERABERFATURA için eşit zorunlu, Schematron TaxFreeInvoiceCheck).

### [ORTA][KÜTÜPHANE] showWithholdingTaxSelector IADE tipinde de görünüyor
- **Dosya:satır:** `src/calculator/invoice-rules.ts:270`
- **Gözlem:** `isIade = IADE || TEVKIFATIADE || YTBIADE || YTBTEVKIFATIADE` (satır 252). `showWithholdingTaxSelector = isTevkifat || isIade` — sade IADE (tevkifatsız iade) tipinde tevkifat selector görünüyor ama gereksiz. Kullanıcıya yanlış ipucu.
- **Normatif referans:** Schematron IADE grubunda `BillingReference` zorunlu, ama `WithholdingTaxTotal` zorunlu değil; TEVKIFATIADE'de zorunlu.
- **Durum tipi:** B.

---

## 6. `simple-invoice-mapper.ts` — Hesaplanan Değer → InvoiceInput

### 6.1 Mapper Akış Özeti

`mapSimpleToInvoiceInput` (satır 44-47):
1. `calculateDocument(simple)` → CalculatedDocument
2. `buildInvoiceInput(simple, calculated)` → InvoiceInput

Yani mapper hesaplanmış değerleri **yeniden hesaplamıyor**, calculator'ın çıktısını kabul ediyor. Fakat `SimpleInvoiceBuilder.build`'de (satır 62-68):
```ts
const calculation = calculateDocument(input);     // 1. kez
const invoiceInput = mapSimpleToInvoiceInput(input); // 2. kez (internal tekrar calculate)
const xml = this.invoiceBuilder.build(invoiceInput);
```

**`calculateDocument` iki kez çalıştırılıyor** — SimpleInvoiceBuilder'ın `build` satırında ve `mapSimpleToInvoiceInput` içinde. Aynı `uuidv4()` iki farklı UUID üretebilir (mapper'ın `calc.uuid`'si ≠ builder'ın `calc.uuid`'si).

### [ORTA][KÜTÜPHANE] SimpleInvoiceBuilder.build calculateDocument'ı iki kez çağırıyor
- **Dosya:satır:** `src/calculator/simple-invoice-builder.ts:62-68`
- **Gözlem:** Önce `calculateDocument(input)` (satır 64), sonra `mapSimpleToInvoiceInput(input)` içinde tekrar `calculateDocument(input)` (simple-invoice-mapper.ts:45). İki ayrı UUID üretimi ve iki kez tüm satır döngüsü. Kullanıcı `uuid` explicit vermezse `calculation.uuid` ile mapper içindeki `calc.uuid` farklı olabilir — `result.calculation` debug bilgisi XML'deki UUID ile **eşleşmeyebilir**.
- **Normatif referans:** —
- **Durum tipi:** B — performans + determinizm sorunu.

### 6.2 mapper'in istisna kodu ekleme mantığı

`simple-invoice-mapper.ts:232-246`:
```ts
function shouldAddExemption(ts, calc, simple): boolean {
  const type = calc.type;
  const exemptTypes = ['IADE', 'YTBIADE', 'IHRACKAYITLI', 'OZELMATRAH', 'SGK', 'KONAKLAMAVERGISI'];
  if (ts.code === '0015' && ts.amount === 0 && !exemptTypes.includes(type)) return true;
  if (type === 'IHRACKAYITLI') return true;
  if (type === 'OZELMATRAH' && simple.ozelMatrah) return true;
  return false;
}
```

Mantığa iki yol: (a) KDV 0 ve tip `exemptTypes` dışı → istisna kodu ekle; (b) IHRACKAYITLI her zaman ekle; (c) OZELMATRAH + özel matrah girişi varsa.

**Çelişkiler:**
- `exemptTypes` IADE'yi içeriyor ama IADE grubu (TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE) yalnız `IADE` ve `YTBIADE`'yi listeliyor; TEVKIFATIADE/YTBTEVKIFATIADE için davranış yok.
- TEVKIFAT tipinde KDV>0 olur (§1.2.5 — varsayılan 351 ekleniyor), ama `shouldAddExemption` `ts.amount === 0` kuralıyla KDV>0 TEVKIFAT'ta istisna kodu eklemiyor — ama `document-calculator` `resolveExemptionReason` TEVKIFAT için `DEFAULT_EXEMPTIONS.satis = '351'` set ediyor. Yani `calc.taxExemptionReason.kdv = '351'` ama mapper ts.amount>0 olduğundan `subtotal.taxExemptionReasonCode`'ya yazmıyor → **351 kaybolur**.

Yani TEVKIFAT senaryosunda: `document-calculator` 351'i hesaplıyor ama mapper XML'e yazmıyor. Kod (constants'taki hata bir yana) XML seviyesinde de kayboluyor.

Test `document-calculator.test.ts:225-233` TEVKIFAT+351'i `result.taxExemptionReason.kdv` alanında kontrol ediyor ama `taxSubtotals[0].taxExemptionReasonCode` veya nihai XML'de kontrol etmiyor → bulgu **test tarafından gizleniyor**.

### [YÜKSEK][KÜTÜPHANE] mapper shouldAddExemption TEVKIFAT tipinde 351'i atlıyor
- **Dosya:satır:** `src/calculator/simple-invoice-mapper.ts:232-246`
- **Gözlem:** `document-calculator.resolveExemptionReason` TEVKIFAT tipinde `DEFAULT_EXEMPTIONS.satis = '351'` set ediyor (`document-calculator.ts:264`). Mapper `shouldAddExemption`'ı kontrol ediyor: `ts.code === '0015' && ts.amount === 0 && !exemptTypes.includes(type)` — TEVKIFAT'ta KDV>0 olduğu için false. Sonuç: TEVKIFAT XML'inde `<TaxExemptionReasonCode>351</TaxExemptionReasonCode>` çıkmıyor. `calc.taxExemptionReason.kdv` değeri mapping'de kayboluyor.
- **Normatif referans:** Schematron TEVKIFAT için `TaxExemptionReasonCode` zorunlu değil (tevkifat + KDV>0 ikisi birden varsa), ama calculator bu kodu üretip sonra mapper siliyorsa **sessiz veri kaybı**. `calc.taxExemptionReason.kdv` debug output'unda var ama XML'de yok.
- **Durum tipi:** B — iç tutarsızlık.

### 6.3 mapper — Satır TaxSubtotal istisna yazılması

`simple-invoice-mapper.ts:316-319`:
```ts
if (ts.amount === 0 && ts.code === '0015' && calc.taxExemptionReason.kdv) {
  subtotal.taxExemptionReasonCode = calc.taxExemptionReason.kdv;
  subtotal.taxExemptionReason = calc.taxExemptionReason.kdvName ?? undefined;
}
```

Satır bazında KDV=0 olan her 0015 subtotal'a belge seviyesi istisna kodu yazılıyor. **Sorun:** Farklı satırların farklı istisna kodları varsa (örn. 2 satır, biri 301 "Mal İhracatı", diğeri 302 "Hizmet İhracatı") kütüphane desteklemiyor. Tek belge-seviye istisna kodu tüm satırlara yansıtılıyor.

`SimpleLineInput` tipi (`simple-types.ts:61-112`) satır bazlı `kdvExemptionCode` alanı içermiyor — yalnız belge seviyesinde var (satır 365). Bu tasarım kararı gibi görünüyor, ama Schematron 316 satır bazlı istisna kodu reddetmiyor, sadece doğrulama yapıyor.

**Pratik:** Karma ihracat (301+302) senaryosunda her iki satır için aynı kod yazılır → GİB reddetmez ama kullanıcı doğru kodu temsil edemez.

### [ORTA][KÜTÜPHANE] Satır bazlı kdvExemptionCode tipi yok — karışık istisnalı fatura yazılamaz
- **Dosya:satır:** `src/calculator/simple-types.ts:61-112` (`SimpleLineInput` tipi — kdvExemptionCode yok), `simple-invoice-mapper.ts:316-319` (belge seviyesi kod her satıra yansıtılıyor)
- **Gözlem:** Çoklu istisna kodlu karışık fatura (örn: 1 satır 301 Mal İhracatı + 1 satır 302 Hizmet İhracatı) SimpleInvoiceInput ile ifade edilemez. Tek `input.kdvExemptionCode` tüm satırlara yayılır.
- **Normatif referans:** Schematron 316 satır seviyesi istisna kodunu kabul ediyor (`../../../cbc:InvoiceTypeCode` kontrolü 3 seviye yukarıda olduğu için her TaxCategory context'inde çalışır).
- **Durum tipi:** B.

### 6.4 mapper — Vergi + Tevkifat birlikte olunca

`simple-invoice-mapper.ts:201-227` (belge seviyesi TaxTotal) + `:250-265` (WithholdingTaxTotal).

**Sorun:** `calc.taxes.taxSubtotals` (`line-calculator` çıktısı) içinde KDV + ÖTV + Damga V. subtotal'ları birleşik haldeyken, mapper'ın birleşik subtotal'ı tek `TaxTotal/TaxSubtotal` dizisine yazması anlamlı. Ama `calc.taxes.taxTotal` = Σ all taxes (**dahil negatif-etkili stopaj amount'u pozitif** olarak) — **NE? `line-calculator.ts:154` `taxTotal = Σ amount` değil, `taxes.taxTotal = Σ amount` kullanılıyor**:

`line-calculator.ts:153-155`:
```ts
taxes.taxSubtotals.push(kdvSubtotal);
taxes.taxTotal = taxes.taxSubtotals.reduce((total, t) => total + t.amount, 0);
taxes.taxForCalculate = taxes.taxSubtotals.reduce((total, t) => total + t.taxForCalculate, 0);
```

Yani `taxTotal = Σ amount` (tüm subtotal amount'ları pozitif toplanıyor), `taxForCalculate = Σ taxForCalculate` (stopaj negatif). TaxAmount XML'e `taxTotal` yazılıyor (`simple-invoice-mapper.ts:224 taxAmount: calc.taxes.taxTotal`). 

**Sorun:** Stopaj (0003, 0011, 9040) negatif etkili olduğunda `taxTotal` stopajı pozitif olarak dahil ediyor — UBL'de `TaxTotal/TaxAmount` bütün vergi subtotal'larının toplamı, stopaj pozitif tutulur ama "net ödeme"ye gidişte `taxForCalculate` kullanılır. Bu OK.

Ama asıl sorun: `line-calculator.ts:181`:
```ts
const taxInclusiveForMonetary = lineExtensionAmount + taxes.taxForCalculate;
```

Burada `taxForCalculate` stopaj negatif olan kalemlerde negatif. `taxInclusiveForMonetary = 1000 + (-100) + 200 = 1100` (test satır 166-168). **UBL'de `TaxInclusiveAmount = TaxExclusive + Σ(TaxTotal.TaxAmount)`** — skill formülü (§1.2.1).

`TaxTotal/TaxAmount = calc.taxes.taxTotal = 300` (stopaj 100 + KDV 200, hepsi pozitif). `TaxExclusive = 1000`. Beklenen TaxInclusive = 1300. Kütüphane 1100 dönüyor (stopaj negatif etkisi ile). **Schematron arithmetic consistency: 1000 + 300 = 1300 ≠ 1100 → fail!**

### [KRİTİK][KÜTÜPHANE] Stopaj (0003, 0011, 9040) TaxInclusiveAmount'ta tutarsız (TaxAmount'a pozitif yazılıyor ama TaxInclusive'dan düşürülüyor)
- **Dosya:satır:** `src/calculator/line-calculator.ts:129,154,181`, `simple-invoice-mapper.ts:224`
- **Gözlem:** Stopaj (baseStat=false) satır 129'da `taxForCalculate *= -1` yapılıp `taxInclusiveForMonetary = lineExtensionAmount + taxForCalculate` (satır 181) ile TaxInclusive'dan düşülüyor (1000 − 100 + 200 = 1100). Ama `taxes.taxTotal = Σ amount` (satır 154) stopajı **pozitif** 100 olarak topluyor → XML'de `TaxTotal/TaxAmount=300`. Skill formülü `TaxInclusive = TaxExclusive + Σ TaxAmount` = 1000+300 = 1300. Kütüphane XML'inde `TaxExclusive=1000, TaxAmount=300, TaxInclusive=1100` → 1300 ≠ 1100 → arithmetic ihlali.
- **Normatif referans:** skill `ortak-parasal-ve-vergi-v0.7.md` §5 satır 132 `TaxInclusiveAmount = TaxExclusiveAmount + Σ(TaxTotal.TaxAmount)`; UBL 2.1 arithmetic consistency.
- **Durum tipi:** A — skill formülü açık; kütüphane stopaj semantiğini UBL uyumsuz şekilde uygulayıp XML'e yazıyor.

Test (line-calculator.test.ts:150-168) "Stopaj negatif taxForCalculate" senaryosunda `taxInclusiveForMonetary = 1100`'i doğrulamış → test de **yanlış beklenti** ile örtüşüyor. Bu senaryo gerçek XML üretirse Schematron/GİB reddeder.

### [KRİTİK][TEST] Stopaj TaxInclusive testi yanlış beklenti ile (aritmetik tutarsızlığı maskeliyor)
- **Dosya:satır:** `__tests__/calculator/line-calculator.test.ts:166-168`
- **Gözlem:** `expect(result.taxInclusiveForMonetary).toBe(1100)` — skill formülüne göre 1300 beklenmeli (1000 matrah + 100 stopaj + 200 KDV, ama `TaxAmount` stopaj dahil). Test kütüphane hatasını onaylıyor.
- **Normatif referans:** skill §5; üstteki KRİTİK bulgu.
- **Durum tipi:** A.

### 6.5 BillingReference IADE override

`simple-invoice-mapper.ts:435-451 buildBillingReference`:
```ts
const isIadeGroup = ['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'].includes(calc.type);
const documentTypeCode = isIadeGroup ? 'IADE' : simple.billingReference!.documentTypeCode;
```

Schematron `IADEInvioceCheck` kuralına uygun. D03 bulgularında da paralel olarak işaret edildi.

### 6.6 BuyerCustomer → partyType map

`simple-invoice-mapper.ts:562-566`:
```ts
function resolveBuyerPartyType(profile: string): 'EXPORT' | 'TAXFREE' | undefined {
  if (profile === 'IHRACAT') return 'EXPORT';
  if (profile === 'YOLCUBERABERFATURA') return 'TAXFREE';
  return undefined;
}
```

KAMU profili için `undefined` dönüyor ama `deriveFieldVisibility` KAMU'da `showBuyerCustomer=true` gösteriyor. Mapper KAMU'da BuyerCustomer partyType atamıyor — Schematron KAMU için aracı kurum bilgisi bekler (KamuFaturaCheck satır 296). KAMU'da aracı kurum `BuyerCustomerParty` olarak serialize edilir ama partyType atanmaz — serializer partyType üzerinden PartyIdentification schemeID ekler (D04 Y5 bulgusu). **KAMU BuyerCustomer eksik kontekst** ile yazılır.

### [ORTA][KÜTÜPHANE] KAMU BuyerCustomer için partyType eşlemesi yok
- **Dosya:satır:** `src/calculator/simple-invoice-mapper.ts:562-566`
- **Gözlem:** KAMU profilinde aracı kurum `BuyerCustomerParty` altında serialize edilmeli (Schematron KamuFaturaCheck). `resolveBuyerPartyType` KAMU'yu tanımıyor → partyType undefined. Mapper `result.buyerCustomer = { party: ..., partyType: undefined }` yazıyor. Serializer (D04 raporunda Y5 olarak işaret edilmiş) BuyerCustomerParty eksik niteliklerle emit ediyor. Calculator seviyesinde de aynı eksiklik.
- **Normatif referans:** CommonSchematron KamuFaturaCheck; D04 Y5.
- **Durum tipi:** A.

---

## 7. Bulgu Özeti

### 7.1 Ciddiyet Breakdown

| Ciddiyet | Adet | Ana Bulgular |
|---|---|---|
| **KRİTİK** | **4** | §1.2.1 LegalMonetaryTotal.LineExtensionAmount iskonto öncesi (Σ satır ≠ belge) • §1.2.1 Test yanlış beklenti ile KRİTİK'i maskeliyor • §1.3 OZELMATRAH ek subtotal taxTotal'a yansımıyor • §6.4 Stopaj TaxInclusive aritmetik tutarsızlığı + test yanlış beklenti |
| **YÜKSEK** | **8** | §1.2.3 PayableRoundingAmount yok • §1.2.4 TEVKIFATIADE tip override imkansız • §1.2.5 DEFAULT_EXEMPTIONS.satis=351 ↔ validator (çift truth source, D02 teyit) • §2.4 Percent 0-basamak yuvarlama • §3.1 ConfigManager.resolveUnitCode case-sensitive • §3.4 setLiability(earchive) isExport kontrat ihlali • §4.3 kdvExemptionCode=326 calculator'dan sessiz düşüyor (D02 teyit) • §4.4 getAvailableExemptions Schematron 316/318/320 kabul tipi listesine eksik • §5.2 resolveProfileForType earchive+SGK geçersiz fallback • §6.2 mapper TEVKIFAT'ta 351'i atlıyor • §2.2.3 satır vs belge yuvarlama tutarlılığı |
| **ORTA** | **10** | §1.1.2 Damga V. baseCalculate semantik şüphesi • §1.2.6 resolveProfile buyerCustomer → IHRACAT varsayımı • §1.4-1.5 Test kapsamı (YATIRIMTESVIK/ILAC/SGK/ENERJI/IDIS/HKS/OZELFATURA/KAMU IBAN yok) • §2.2.3 Float edge case test yok • §4.1 tax-config eksik kod calculator exception (D02 teyit) • §5.1 TYPE_PROFILE_MAP YTB+EARSIVFATURA yok • §5.3 validateInvoiceState eksik 5+ Schematron kuralı (D03 paralel) • §5.4 showWithholdingTaxSelector IADE'de gereksiz • §6.1 calculateDocument iki kez çağrı • §6.3 Satır-bazlı kdvExemptionCode yok • §6.6 KAMU partyType eşleme yok |
| **DÜŞÜK** | **3** | §4.2 Tevkifat 616 adı eski KDVGUT sürümü • §3.2 Test izolasyonu dokümansız (DOKÜMAN) • §3.3 ConfigManager singleton multi-session etkisi (DOKÜMAN) |
| **Toplam** | **25** | |

### 7.2 Kategori Breakdown

| Kategori | Adet |
|---|---|
| KÜTÜPHANE | 20 |
| TEST | 3 (§1.2.1, §6.4, §1.4-1.5 kapsam) |
| DOKÜMAN | 2 (§3.2, §3.3) |
| SKILL | 0 |

### 7.3 Durum Tipi Dağılımı

| Tip | Adet |
|---|---|
| A (Skill/normatif diyor, kütüphane farklı) | 14 |
| B (Skill sessiz, iç tutarsızlık veya ihtiyat) | 11 |
| C (Skill ↔ normatif çelişki) | 0 |

### 7.4 Çakışan Fiziki Bulgular (Çoklu Denetim)

Denetim 05'te teyit edilen ama önceki denetimlerde de sayılmış fiziki bulgular:
- **Çift truth source (351, 326-344, tax-config eksik kodlar):** D02 §1.2, §1.3, §2.1 → D05 §1.2.5, §4.1, §4.3. Tek mimari sorun (constants.ts ↔ calculator/*-config.ts çelişkisi), üç denetimde üç farklı giriş noktası.
- **555 kodu:** D01 → D02 → D03 → D05 (getAvailableExemptions hiç kapsamıyor, validateInvoiceState kural yok). Dördüncü denetimde aynı KRİTİK.
- **UI/Validator Schematron eksiklikleri:** D03 validator-katman → D05 UI-katman. Aynı Schematron kuralları her iki katmanda da yok.
- **TEVKIFATIADE ayrı tip:** D01 KÜTÜPHANE bulgusu 1 → D05 §1.2.4. Kütüphane TEVKIFAT-only bir dünya varsayıyor.

---

## 8. Özel Notlar

### 8.1 Calculator "Yan Ürün" Tezinin Dokunaklı Yönleri

Görev açıklamasında "Calculator'ın yan ürün olduğu iddia ediliyor; InvoiceBuilder ayrı, calculator sonuçlarını InvoiceInput'a maplıyor" denmişti. D05'in kanıtları:

- **Evet, yan ürün:** `SimpleInvoiceBuilder.build` (`simple-invoice-builder.ts:62-78`) iç akışı: calculator → mapper → `InvoiceBuilder`. Mapper tek yönlü; `InvoiceBuilder` calculator'a bağımlı değil (D04 kapsamı). `simple-invoice-mapper.ts` calculator çıktısını `InvoiceInput`'a dönüştürüyor. Kullanıcı direkt `InvoiceBuilder` kullanabilir.

- **Ama sıkı bağımlı:** Calculator üretimi XML üretiminde **hesaplama kararlarını** (tip tespiti, profil tespiti, istisna kodu eşleme, OZELMATRAH ek subtotal) yansıtıyor. Bir hatalı tip tespiti XML'e sızıyor — §1.2.4 TEVKIFATIADE override, §1.2.6 IHRACAT override, §6.2 mapper 351 atlayışı hep bu bağımlılığın sonucu.

- **Yan ürünse, hatalar daha toleranslı mı?** Hayır. §1.2.1 (LineExtensionAmount), §1.3 (OZELMATRAH taxTotal), §6.4 (Stopaj TaxInclusive) — bu üç KRİTİK bulgu **aritmetik tutarsızlık** üretiyor ve GİB reddi yaratacak. Calculator path'i kullanılınca "kütüphane üstlendi, sorumluluk aldı" denir; yanıt doğru olmak zorunda.

### 8.2 Yuvarlama Mimarisinin "Tek Nokta Yok" Sorunu

Calculator float hesap, serializer `toFixed(2)`. İki katman arası yuvarlama politikası uzlaşmamış:
- Satır XML seviyesinde `toFixed(2)` uygulanıyor ama calculator iç toplamları float olarak topluyor.
- Belge seviyesi `toFixed(2)` sonra uygulanıyor ama bu zaten calculator'ın float toplamından geliyor.
- "Σ satır.toFixed(2) = belge.toFixed(2)" eşitliği şansa bağlı.

Bu D04'teki "XSD sequence truth source yok" sorununa **paralel**: yuvarlama için de tek truth source gerekli. Çözüm ya banker's rounding tüm hesaplarda, ya da "önce satır toFixed, sonra topla" stratejisi. Şu an iki yol da yok.

### 8.3 "Tipe-göre-dispatch vs koda-göre-kısıt" Mimari Çelişkisinin D05'te Görünümü

D03'te işaret edildi: validator tipe-göre-dispatch (`validateIstisnaGroup` sadece tip=ISTISNA'da), Schematron koda-göre-kısıt (kod görünce tipi kısıtla). D05'te aynı örüntü:
- `getAvailableExemptions(type)` tipe göre dispatch — SGK tipinde sadece SGK kodları gösteriyor, Schematron SGK için ISTISNA/OZELMATRAH/IHRACKAYITLI kodlarına da izin veriyor (§4.4).
- `DEFAULT_EXEMPTIONS.satis = '351'` tipi TEVKIFAT/IADE+ISTISNA vs için 351 uyguluyor — koda-göre baktığında 351 "SATIS" için; 351 ISTISNA'da kullanılsa validator reddeder.

**Mimari değişiklik önerisi:** Tek bir "kod + tip uyum matrisi" (Map<code, Set<type>>) kullanmak + her iki yönü de zorlamak.

---

## 9. Context'e Giren Dosyalar

**Kütüphane (json2ubl-ts/):**
- `src/calculator/line-calculator.ts` (tam, 220 satır)
- `src/calculator/document-calculator.ts` (tam, 316 satır)
- `src/calculator/config-manager.ts` (tam, 385 satır)
- `src/calculator/invoice-session.ts` (tam, 550 satır)
- `src/calculator/invoice-rules.ts` (tam, 434 satır)
- `src/calculator/simple-invoice-builder.ts` (tam, 119 satır)
- `src/calculator/simple-invoice-mapper.ts` (tam, 609 satır)
- `src/calculator/simple-types.ts` (tam, 411 satır — denetim kapsamında tüm tip şeması)
- `src/calculator/tax-config.ts` (tam, 64 satır — D02'de okunmuştu, yeniden D05 için)
- `src/calculator/withholding-config.ts` (tam, 84 satır — aynı)
- `src/calculator/exemption-config.ts` (tam, 132 satır — aynı)
- `src/calculator/unit-config.ts` (tam, 117 satır — resolveUnitCode mantığı D05 fokusu)
- `src/calculator/currency-config.ts` (tam, 63 satır)
- `__tests__/calculator/line-calculator.test.ts` (tam, 273 satır)
- `__tests__/calculator/document-calculator.test.ts` (tam, 307 satır)
- `src/utils/formatters.ts` (tam, 39 satır — toFixed semantic)
- `src/utils/xml-helpers.ts` satır 40-60 (cbcAmountTag)
- `src/serializers/monetary-serializer.ts` (tam, 80 satır — calculator → XML köprüsü)
- `src/serializers/tax-serializer.ts` satır 30-80 (Percent formatlaması)
- `audit/denetim-01-ic-tutarlilik.md` + `denetim-02-kod-listeleri.md` + `denetim-03-validators.md` + `denetim-04-serializers.md` (bulgu korelasyonu için)
- `audit/SONUC-konsolide-bulgular.md` (tam)

**Skill (gib-teknik-dokuman/):**
- `references/ortak-parasal-ve-vergi-v0.7.md` satır 100-300 (MonetaryTotal, TaxTotal, TaxSubtotal formülleri ve Kritik Kullanım Kuralları)
- `references/kod-listeleri-ubl-tr-v1.42.md` satır 430-545 (§4.9 TaxTypeCode + §4.9.2 Tevkifat Oranları)
- `schematrons/UBL-TR_Common_Schematron.xml` satır 229-231 (decimalCheck), 310-323 (TaxExemptionReasonCodeCheck), 496-498 (DemirbasKDV)
- `schematrons/UBL-TR_Main_Schematron.xml` satır 260-290 (LegalMonetaryTotal + TaxTotal decimalCheck bağlamaları)
- `schemas/common/UBL-UnqualifiedDataTypes-2.1.xsd` satır 55-90 (AmountType)
- `schemas/common/CCTS_CCT_SchemaModule-2.1.xsd` satır 44-60 (AmountType xsd:decimal tabanı)

**Toplam:** 21 kütüphane dosyası + 6 skill dosyası okundu.

---

## 10. Sonraki Denetime Açık Sorular

D05'ten kaynaklanan yeni açık sorular:

25. **LegalMonetaryTotal.LineExtensionAmount semantiği:** Kütüphane "iskonto öncesi" semantiğinden "Σ satır" semantiğine geçerken backwards-compat riski var mı? Mevcut kullanıcılar 1000-yerine-850 görmeye alışkın; breaking change olarak v2 mı yoksa patch sürümünde mi düzeltilmeli?
26. **Stopaj (0003/0011/9040) UBL uyumlu modeli:** Kütüphane stopajı TaxTotal'a "negatif tutar" olarak mı yazmalı (XSD xsd:decimal izin veriyor), yoksa TaxTotal'dan çıkarıp ayrı bir AllowanceCharge olarak mı göstermeli? Skill bu kalemler için özel rehberlik vermiyor. GİB örneklerinde stopaj nasıl?
27. **OZELMATRAH taxTotal birleştirme:** Özel matrah ek subtotal (`document-calculator.ts:164-174`) ayrı bir `TaxTotal` oluşturmalı mı (skill §12 "TaxTotal üç bağlam"), yoksa ana TaxTotal'a dahil edilmeli? Dahil edilecekse `taxTotalAmount`'a eklenmesi gerek.
28. **ConfigManager.resolveUnitCode case-insensitive mi yapılmalı:** `unit-config.resolveUnitCode` lowercase normalize; ConfigManager versiyonu uyumsuz. ConfigManager'a lowercase eklenmeli; ama DB override ile gelen UnitDefinition isimleri ne olacak? Map key normalizasyonu + backwards-compat.
29. **Yuvarlama stratejisi kararı:** Banker's rounding vs round-half-away + "önce satır sonra belge" vs "tek geçiş belge" — normatif kaynak sessiz, Mimsoft tarafında bu kararı nasıl veriyor?
30. **Satır bazlı kdvExemptionCode desteği:** SimpleLineInput.kdvExemptionCode eklemek karışık ihracat faturaları için gerekli mi yoksa kullanıcı InvoiceBuilder direkt yoluna mı yönlendirilmeli?
31. **Calculator çift çağrı:** SimpleInvoiceBuilder.build iki kez calculateDocument çağırıyor — memoize edilsin mi, yoksa mapper refactor ile tek çağrıya düşürülsün mi? UUID determinizmi için zorunlu.
32. **InvoiceSession singleton ConfigManager vs per-session config:** Session-level config override desteklenmeli mi? Şu an global. e-entegratör senaryosunda multi-tenant (her tenant farklı DB) bir risk.
33. **setLiability + isExport kontrat ihlali:** isExport=true iken setLiability('earchive') durumu için hangi davranış doğru — error fırlat, setLiability no-op, yoksa isExport→false?
34. **Test suite: yanlış beklentiler** — D05'te keşfedilen 3 test yanlış beklenti (iskontolu belge LineExtension, Stopaj TaxInclusive, tevkifat TaxExemption mapping gizleme). Kaç test daha aynı örüntüyle yanlış? Tam bir test audit gerekir mi?
