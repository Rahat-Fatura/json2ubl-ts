---
sprint: 5
baslik: Validator Kapsamı + TaxExemption Cross-Check Matrisi
tarih: 2026-04-22
plan_kaynagi: /Users/berkaygokce/.claude/plans/breezy-launching-umbrella.md
onay_durumu: 7 netleştirme sorusu cevaplandı, plan revize edildi
alt_commit_sayisi: 7 (Sprint 5.1 … 5.7)
kapsam_disi: B-83 (Sprint 8'e devir), Mimsoft gerçek fixture (Sprint 8'e devir)
---

# Sprint 5 İmplementasyon Planı — Validator Kapsamı + TaxExemption Cross-Check

## Context

`json2ubl-ts` v2 denetim hattının 5. sprinti. Önceki sprintler:

| Sprint | Doğa | Ana Çıktı |
|---|---|---|
| 1 | Yapısal (matris tekleştirme) | `PROFILE_TYPE_MATRIX`, `cross-validators.ts` |
| 2 | Data (config genişletme) | `exemption-config.ts` 99 entry, `NON_ISTISNA_REASON_CODES`, `DEMIRBAS_KDV_EXEMPTION_CODES` |
| 3 | Mimari refactor | `xsd-sequence.ts`, M6 runtime validator'lar |
| 4 | Aritmetik+yuvarlama | AR-5 PayableRounding, B-15 LineExtensionAmount, M10 setLiability, B-76 profile, Sprint 1 defensive temizlik, Mimsoft F10/F11 fixture, B-81 `shouldAddExemption` TEVKIFAT+351 **minimal** fix |

**Sprint 5'in özelliği:** Domain-ağır sprint. Kapsam:
- TaxExemption cross-check matrisi (B-06) — 99 kod × ~20 tip kombinasyonu
- IHRACKAYITLI + 702 özel kontrolü (B-07) + `CustomsDeclaration` input (B-14, Açık Soru #14)
- YatirimTesvikKDVCheck + LineKDVCheck (B-08)
- M5 — 351 kodu full cross-check (Sprint 2 set + Sprint 4 minimal fix üzerine konsolidasyon)
- KamuFaturaCheck (TR IBAN) opsiyonel küçük ek
- **Sprint 5 kapsam DIŞI (Sprint 8'e devredildi):** B-83 KAMU `partyType` (serializer işi, tema uyumsuz); Mimsoft gerçek fatura fixture'ları (üretimde henüz yok)

Normatif kaynak: UBL-TR Common Schematron + Codelist. Rule'lar tam metinleriyle §4'te belgelendi.

---

## Netleştirme Soruları — İşlendi ✅

| Soru | Cevap | Plan'a Yansıma |
|---|---|---|
| 1 — Matris konumu | **(b)** `src/validators/cross-check-matrix.ts` yeni dosya | §5, §7 |
| 2 — 351 semantiği | **allowed** + SGK **izinli**, IHRACKAYITLI **yasak** | §5.1, §10.1 |
| 3 — IHRACKAYITLI+702 | **(b)** 702 geçerli kod, kullanılırsa CustomsDeclaration zorunlu | §5.3 |
| 4 — YatirimTesvikKDV | Belge + satır iki ayrı validator | §5.4 |
| 5 — Hata mesajları | **(a)** Mevcut `ValidationError` korunur | §6 |
| 6 — B-83 | **(b) Sprint 8'e ertele** | §12 (kapsam dışı) |
| 7 — CustomsDeclaration | **(a)** Sprint 5'e dahil (§5.3'te B-14+B-07 bütün) | §5.3 |

**Mimsoft fixture:** Üretimde henüz yok → Sentetik fixture'larla devam. Sprint 8 devir listesine eklendi.

---

## 1. Mevcut Durum (Sprint 5 Öncesi)

### 1.1 Sprint 2 Ön-İşi

`src/config/constants.ts` (Sprint 2):
- **satır 140-142** `ISTISNA_TAX_EXEMPTION_REASON_CODES` — `exemption-config.ts`'den dinamik türetilmiş (`documentType === 'ISTISNA'` filtre). ~54 kod.
- **satır 159** `DEMIRBAS_KDV_EXEMPTION_CODES = new Set(['555'])` — M4 Demirbaş KDV
- **satır 165** `NON_ISTISNA_REASON_CODES = new Set(['351'])` — Sprint 5'te genişletilecek setin başlangıcı

**Kullanım:**
- `ISTISNA_TAX_EXEMPTION_REASON_CODES` → `validateByType` whitelist
- `DEMIRBAS_KDV_EXEMPTION_CODES` → `reduced-kdv-detector.ts` M4 flag
- `NON_ISTISNA_REASON_CODES` → **henüz aktif validator yok**; Sprint 5'te aktif olur

### 1.2 Sprint 4 Ön-İşi (B-81 Minimal Fix)

`src/calculator/simple-invoice-mapper.ts:237-253`:

```typescript
function shouldAddExemption(ts, calc, simple): boolean {
  const type = calc.type;
  const exemptTypes = ['IADE', 'YTBIADE', 'IHRACKAYITLI', 'OZELMATRAH', 'SGK', 'KONAKLAMAVERGISI'];

  if (ts.code === '0015' && ts.amount === 0 && !exemptTypes.includes(type)) return true;
  if (type === 'IHRACKAYITLI') return true;
  if (type === 'OZELMATRAH' && simple.ozelMatrah) return true;

  // B-81 MİNİMAL FİX (Sprint 4):
  if (type === 'TEVKIFAT' && ts.code === '0015' && calc.taxExemptionReason.kdv === '351') return true;

  return false;
}
```

**Sprint 5'te full cross-check'ten farkı:**
- Minimal: TEVKIFAT+351 için mapper satırını iletir
- Full: TÜM non-ISTISNA tipleri için TAX_EXEMPTION_MATRIX kontrolü; validator katmanı (mapper değil); forbidden type hataları; requiresZeroKdvLine kontrolü

### 1.3 `exemption-config.ts` Özet (99 entry)

| `documentType` | Kod sayısı | Örnek |
|---|---|---|
| ISTISNA | 54 | 201-250, 301-344, 350 |
| SATIS | 1 | 351 |
| OZELMATRAH | 12 | 801-812 |
| IHRACKAYITLI | 4 | 701-704 |
| SGK | 7 | SAGLIK_*, ABONELIK, MAL_HIZMET, DIGER |
| OTV | 1 | 151 |

**Sprint 5 gereği:** `exemption-config.ts`'deki `documentType` tek tipe eşlendiği için "351 hem SATIS hem TEVKIFAT'ta geçerli" semantiğini taşıyamıyor. Cross-check matrisi bu sınırlılığı aşmak için ayrı data yapısı olmalı.

### 1.4 Mevcut Validator Yapısı

| Dosya | Satır | Kapsam |
|---|---|---|
| `type-validators.ts` | 257 | §2.1 IADE, §2.2 Tevkifat, §2.3 İstisna whitelist, §2.4 OZELMATRAH, §2.5 IHRACKAYITLI, §2.7 TEKNOLOJIDESTEK |
| `cross-validators.ts` | 28 | Sprint 1 `PROFILE_TYPE_MATRIX` cross-check (ProfileID × InvoiceTypeCode) |
| `common-validators.ts` | 267 | M6 Sprint 3: B-32/33/34/35/70 runtime validator'ları |

**Pattern:** Pure function, `ValidationError[]` döndürür. Builder.ts'de çağrılıyor.

### 1.5 Error Tipleri

`src/errors/ubl-build-error.ts`:
- `UblBuildError extends Error` → `errors: ValidationError[]` + `toDetailedString()`
- `ValidationError` interface → `{ code, message, path?, expected?, actual? }`
- Mesajlar Türkçe
- Yeni error code field'ı mevcut
- `src/validators/validation-result.ts` helper fonksiyonlar: `missingField`, `invalidFormat`, `invalidValue`, `crossMatrixError`, `profileRequirement`, `typeRequirement`

### 1.6 Input Tip Durumu

`src/types/common.ts` + `src/types/enums.ts`:
- `BuyerPartyType`: `'EXPORT' | 'TAXFREE'` — KAMU yok (B-83 Sprint 8'e devir)
- `InvoiceProfileId.KAMU` enum'da **var** (profil destekli)
- `CustomsDeclaration`: **tip yok** (B-14 için Sprint 5'te eklenecek)
- `InvoiceLineInput.requiredCustomsID`: **yok** (B-14 için eklenecek)

### 1.7 YATIRIMTESVIK Durumu

- `YATIRIMTESVIK` ProfileID enum'da var, mapping `PROFILE_TYPE_MATRIX` satır 43-46'da
- `YTBSATIS/YTBIADE/YTBISTISNA/YTBTEVKIFAT/YTBTEVKIFATIADE` InvoiceTypeCode enum'da var
- `YatirimTesvikEArsivInvoiceTypeCodeList` constants'ta YOK — Sprint 5'te eklenecek
- `YTB_ITEM_CLASSIFICATION_CODES = {'01', '02', '03', '04'}` zaten var (satır 206-208)
- `TR_IBAN_REGEX = /^TR\d{7}[A-Z0-9]{17}$/` zaten var (satır 269) — KamuFaturaCheck hazır

---

## 2. Hedef Durum

### B-06 + M5 — Cross-Check Matrisi

Yeni dosya `src/validators/cross-check-matrix.ts`:

```typescript
export interface TaxExemptionRule {
  code: string;
  allowedInvoiceTypes: ReadonlySet<InvoiceTypeCode>;
  forbiddenInvoiceTypes?: ReadonlySet<InvoiceTypeCode>;
  requiresZeroKdvLine?: boolean;       // 351 gibi
}

export const TAX_EXEMPTION_MATRIX: ReadonlyMap<string, TaxExemptionRule> = new Map([
  ['351', {
    code: '351',
    allowedInvoiceTypes: new Set([
      InvoiceTypeCode.SATIS, InvoiceTypeCode.TEVKIFAT, InvoiceTypeCode.KOMISYONCU,
      InvoiceTypeCode.HKSSATIS, InvoiceTypeCode.HKSKOMISYONCU,
      InvoiceTypeCode.KONAKLAMAVERGISI, InvoiceTypeCode.TEKNOLOJIDESTEK,
      InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBTEVKIFAT,
      InvoiceTypeCode.SGK,  // ← Kullanıcı cevabı: SGK+351 İZİNLİ
    ]),
    forbiddenInvoiceTypes: new Set([
      InvoiceTypeCode.ISTISNA, InvoiceTypeCode.IADE,
      InvoiceTypeCode.YTBISTISNA, InvoiceTypeCode.YTBIADE,
      InvoiceTypeCode.TEVKIFATIADE, InvoiceTypeCode.YTBTEVKIFATIADE,
      InvoiceTypeCode.IHRACKAYITLI,  // ← Kullanıcı cevabı: IHRACKAYITLI+351 YASAK (701-704 kullanır)
    ]),
    requiresZeroKdvLine: true,
  }],
  // 201-250, 301-350 → allowedInvoiceTypes: ISTISNA, IADE, IHRACKAYITLI, SGK, YTBISTISNA, YTBIADE
  // 701-704 → allowedInvoiceTypes: IHRACKAYITLI, IADE
  // 801-812 → allowedInvoiceTypes: OZELMATRAH, IADE, SGK
  // 555 → allowedInvoiceTypes: tüm (M4 flag, bypass — matris sadece referans)
  // 501 → allowedInvoiceTypes: tüm (Schematron özel, 501 whitelist'te özel)
  // 151 → OTV (SATIS)
  // SGK sembolik (SAGLIK_*, ABONELIK, MAL_HIZMET, DIGER) → SGK
]);

export function validateExemptionCode(
  code: string,
  type: InvoiceTypeCode,
  kdvSubtotals: ReadonlyArray<{ amount: number }>,
  pathPrefix: string,
): ValidationError | null {
  const rule = TAX_EXEMPTION_MATRIX.get(code);
  if (!rule) {
    return { code: 'UNKNOWN_EXEMPTION_CODE', message: `Bilinmeyen istisna kodu: '${code}'`, path: pathPrefix };
  }
  if (rule.forbiddenInvoiceTypes?.has(type)) {
    return { code: 'FORBIDDEN_EXEMPTION_FOR_TYPE', message: `'${code}' kodu '${type}' fatura tipinde yasaktır`, path: pathPrefix, expected: '(tip izinli)', actual: type };
  }
  if (!rule.allowedInvoiceTypes.has(type)) {
    return { code: 'INVALID_EXEMPTION_FOR_TYPE', message: `'${code}' kodu '${type}' fatura tipinde kullanılamaz`, path: pathPrefix, expected: 'izinli tip', actual: type };
  }
  if (rule.requiresZeroKdvLine && !kdvSubtotals.some(s => s.amount === 0)) {
    return { code: 'EXEMPTION_REQUIRES_ZERO_KDV_LINE', message: `'${code}' kodu için en az bir satırda KDV tutarı=0 olmalı`, path: pathPrefix };
  }
  return null;
}
```

### B-07 + B-14 — IHRACKAYITLI + 702 + CustomsDeclaration

Yeni input tipleri (`src/types/common.ts`):

```typescript
export interface PartyIdentificationInput {
  id: string;
  schemeID: string;
}

export interface CustomsDeclarationIssuerPartyInput {
  partyIdentifications?: PartyIdentificationInput[];
}

export interface CustomsDeclarationInput {
  id?: string;
  issuerParty?: CustomsDeclarationIssuerPartyInput;
}
```

`src/types/invoice-input.ts` `InvoiceLineInput` genişletmesi:

```typescript
export interface InvoiceLineInput {
  // ... mevcut field'lar
  /** GTİP 12 hane — IHRACKAYITLI + 702 için zorunlu */
  requiredCustomsID?: string;
  /** Gümrük beyannameleri — IHRACKAYITLI + 702 için zorunlu */
  customsDeclarations?: CustomsDeclarationInput[];
}
```

Yeni validator `src/validators/ihrackayitli-validator.ts`:

```typescript
export function validateIhrackayitli702(input: InvoiceInput): ValidationError[] {
  if (input.invoiceTypeCode !== InvoiceTypeCode.IHRACKAYITLI) return [];

  // Line-level 702 kodu var mı? (Sprint 5 Schematron satır 322)
  const has702 = input.lines.some(l =>
    l.taxTotal?.taxSubtotals?.some(ts => ts.taxExemptionReasonCode === '702')
  );
  if (!has702) return [];

  const errors: ValidationError[] = [];
  input.lines.forEach((line, idx) => {
    const path = `lines[${idx}]`;

    // RequiredCustomsID (GTİP 12 hane)
    const gtip = line.requiredCustomsID;
    if (!gtip || gtip.length !== 12) {
      errors.push({
        code: 'IHRACKAYITLI_702_REQUIRES_GTIP',
        message: 'IHRACKAYITLI + 702 için satır GTİP (12 hane) zorunlu',
        path: `${path}.requiredCustomsID`,
        expected: '12 hane GTİP',
        actual: gtip ?? 'undefined',
      });
    }

    // CustomsDeclaration/IssuerParty/PartyIdentification[@schemeID='ALICIDIBSATIRKOD'] 11 hane
    const decls = line.customsDeclarations ?? [];
    const hasAlici = decls.some(d =>
      d.issuerParty?.partyIdentifications?.some(pi => pi.schemeID === 'ALICIDIBSATIRKOD' && pi.id?.length === 11)
    );
    if (!hasAlici) {
      errors.push({
        code: 'IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD',
        message: 'IHRACKAYITLI + 702 için ALICIDIBSATIRKOD (11 hane) zorunlu',
        path: `${path}.customsDeclarations`,
        expected: '11 hane ALICIDIBSATIRKOD',
        actual: 'eksik veya yanlış uzunluk',
      });
    }

    // schemeID whitelist (Schematron satır 451)
    decls.forEach((d, dIdx) => {
      d.issuerParty?.partyIdentifications?.forEach((pi, piIdx) => {
        if (!['SATICIDIBSATIRKOD', 'ALICIDIBSATIRKOD'].includes(pi.schemeID)) {
          errors.push({
            code: 'IHRACKAYITLI_INVALID_SCHEME_ID',
            message: 'Geçersiz IHRACKAYITLI schemeID — SATICIDIBSATIRKOD veya ALICIDIBSATIRKOD olmalı',
            path: `${path}.customsDeclarations[${dIdx}].issuerParty.partyIdentifications[${piIdx}].schemeID`,
            expected: 'SATICIDIBSATIRKOD|ALICIDIBSATIRKOD',
            actual: pi.schemeID,
          });
        }
      });
    });
  });

  return errors;
}
```

Serializer (line-serializer veya delivery-serializer): `CustomsDeclaration` XML emisyonu. Sprint 3 `xsd-sequence.ts`'e `CUSTOMS_DECLARATION_SEQ` eklenir. Shipment içinde XSD sequence: `DeliveryAddress → CarrierParty → Despatch → TransportHandlingUnit`.

### B-08 — YatirimTesvikKDV

Yeni validator `src/validators/yatirim-tesvik-validator.ts`:

```typescript
export function isYatirimTesvikScope(profile: InvoiceProfileId, type: InvoiceTypeCode): boolean {
  if (YATIRIM_TESVIK_IADE_TYPES.has(type)) return false;
  if (profile === InvoiceProfileId.YATIRIMTESVIK) return true;
  if (profile === InvoiceProfileId.EARSIVFATURA && YATIRIM_TESVIK_EARSIV_TYPES.has(type)) return true;
  return false;
}

export function validateYatirimTesvikKdvDocument(input): ValidationError[] { /* belge seviyesi */ }
export function validateYatirimTesvikKdvLine(input): ValidationError[] { /* satır + Harcama Tipi 03/04 */ }
```

Yeni constants:

```typescript
export const YATIRIM_TESVIK_IADE_TYPES = new Set([
  InvoiceTypeCode.IADE, InvoiceTypeCode.TEVKIFATIADE,
  InvoiceTypeCode.YTBIADE, InvoiceTypeCode.YTBTEVKIFATIADE,
]);
export const YATIRIM_TESVIK_EARSIV_TYPES = new Set([
  InvoiceTypeCode.YTBSATIS, InvoiceTypeCode.YTBTEVKIFAT, InvoiceTypeCode.YTBISTISNA,
]);
```

---

## 3. Cross-Check Matrisi Tasarımı — Seçim

**Öneri A — Kod Başına Entry** (seçildi). `Map<code, rule>` O(1) lookup; debug için tek görsel tablo. 99 kod için optimum.

---

## 4. Schematron Rule Haritası

| Schematron Rule ID / Satır | Koşul Özeti | Kütüphane Uygulaması | Sprint 5 Durumu |
|---|---|---|---|
| `TaxExemptionReasonCodeCheck` (316, 318, 320) | `istisnaTaxExemptionReasonCodeType` ⊆ {ISTISNA,IADE,IHRACKAYITLI,SGK,YTBISTISNA,YTBIADE} | `TAX_EXEMPTION_MATRIX` allowedInvoiceTypes (kod bazında) | **Sprint 5 yeni** |
| `TaxExemptionReasonCodeCheck` (322) | IHRACKAYITLI+702 → her satır GTİP+ALICIDIBSATIRKOD | `validateIhrackayitli702` | **Sprint 5 yeni (B-07)** |
| `TaxExemptionReasonCodeCheck` (451) | IHRACKAYITLI PartyIdentification schemeID ∈ {SATICIDIBSATIRKOD,ALICIDIBSATIRKOD} | `validateIhrackayitli702` içinde | **Sprint 5 yeni (B-07)** |
| `YatirimTesvikKDVCheck` (483-485) | Belge seviyesi KDV > 0 (İADE hariç) | `validateYatirimTesvikKdvDocument` | **Sprint 5 yeni (B-08)** |
| `YatirimTesvikLineKDVCheck` (487-490) | Satır seviyesi KDV > 0 + Harcama Tipi 03/04 | `validateYatirimTesvikKdvLine` | **Sprint 5 yeni (B-08)** |
| 351 non-ISTISNA (genel rule satır 316 dışında — özel muaf) | Kullanıcı semantiği: ISTISNA/IADE/IHRACKAYITLI dışı + KDV=0 kalem (SGK izinli) | `TAX_EXEMPTION_MATRIX['351']` | **Sprint 5 full (M5)** |
| `KamuFaturaCheck` (519-521) | ProfileID=KAMU → TR IBAN (`^TR\d{7}[A-Z0-9]{17}$`) | common-validators.ts'e ekle | **Sprint 5 ops (5.5)** |
| DemirbasKDVCheck (555) | 555 M4 flag bypass | Sprint 2'de tamam | Mevcut |
| Codelist TaxExemptionReasonCode whitelist | 79 kod | `exemption-config.ts` 99 entry — fark araştırılmalı | **Sprint 5 teyit (5.6)** |

### 4.1 Referans Schematron XML Blokları

**Rule satır 322 (B-07):**
```xml
<sch:assert test="not(../../../cbc:InvoiceTypeCode = 'IHRACKAYITLI' and cbc:TaxExemptionReasonCode = '702') or
  (count(../../../cac:InvoiceLine/cac:Delivery/cac:Shipment[
    cac:GoodsItem/cbc:RequiredCustomsID[string-length(normalize-space(string(text()))) = 12] and
    cac:TransportHandlingUnit/cac:CustomsDeclaration/cac:IssuerParty/cac:PartyIdentification/cbc:ID[
      @schemeID='ALICIDIBSATIRKOD' and string-length(normalize-space(string(text()))) = 11
    ]
  ]) = count(../../../cac:InvoiceLine))">
  IHRACKAYITLI fatura tipinde 702 Muafiyet sebebi için GTİP ve Alıcı Satır Kodu bilgisi girilmelidir
</sch:assert>
```

**Rule satır 483-485 (B-08 Document):**
```xml
<sch:assert test="not(
  (../cbc:ProfileID = 'YATIRIMTESVIK' or
   (../cbc:ProfileID='EARSIVFATURA' and contains($YatirimTesvikEArsivInvoiceTypeCodeList, concat(',',../cbc:InvoiceTypeCode,','))))
  and not(../cbc:InvoiceTypeCode = 'IADE' or ../cbc:InvoiceTypeCode = 'TEVKIFATIADE'
          or ../cbc:InvoiceTypeCode = 'YTBIADE' or ../cbc:InvoiceTypeCode = 'YTBTEVKIFATIADE')
) or (count(cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015' and number(cbc:TaxAmount) > 0 and number(cbc:Percent) > 0]) = count(cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015'])
    and count(cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015' and number(cbc:TaxAmount) > 0 and number(cbc:Percent) > 0]) > 0)">
  Yatırım Teşvik Faturasında KDV Oranı ve Değeri girilmelidir.
</sch:assert>
```

**Rule satır 487-490 (B-08 Line):**
```xml
<sch:assert test="not(
  (../cbc:ProfileID = 'YATIRIMTESVIK' or
   (../cbc:ProfileID='EARSIVFATURA' and contains($YatirimTesvikEArsivInvoiceTypeCodeList, concat(',',../cbc:InvoiceTypeCode,','))))
  and not(../cbc:InvoiceTypeCode = 'IADE' or ../cbc:InvoiceTypeCode = 'TEVKIFATIADE'
          or ../cbc:InvoiceTypeCode = 'YTBIADE' or ../cbc:InvoiceTypeCode = 'YTBTEVKIFATIADE')
) or count(cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015' and number(cbc:TaxAmount) > 0 and number(cbc:Percent) > 0]) > 0">
  Yatırım Teşvik Faturasında Kalem Bazında KDV Oranı ve Değeri girilmelidir.
</sch:assert>
<sch:assert test="not(...) or not(cac:Item/cac:CommodityClassification/cbc:ItemClassificationCode = '03' or cac:Item/cac:CommodityClassification/cbc:ItemClassificationCode = '04') or count(cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015' and number(cbc:TaxAmount) > 0]) > 0">
  Yatırım Teşvik Faturasında Harcama Tipi 03 ve 04 için KDV değeri girilmelidir.
</sch:assert>
```

**Rule satır 519-521 (KamuFaturaCheck):**
```xml
<sch:assert test="not(.='KAMU') or matches(../cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:ID,'^TR\d{7}[A-Z0-9]{17}$')">
  inv:Invoice/cbc:ProfileID elemanının değeri 'KAMU' iken cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:ID alanına geçerli bir Türkiye IBAN numarası yazılmalıdır
</sch:assert>
```

---

## 5. Alt Görevler (Adım Adım)

### 5.1 Sabitler + Matris İskelet
1. `YATIRIM_TESVIK_IADE_TYPES`, `YATIRIM_TESVIK_EARSIV_TYPES` sabitleri → `src/config/constants.ts`
2. `src/validators/cross-check-matrix.ts` dosyası + `TaxExemptionRule` interface + boş `TAX_EXEMPTION_MATRIX` Map iskelet + `validateExemptionCode` skeleton
3. Iskeleti kapsayan 1-2 smoke test

### 5.2 B-06 + M5 — Matris Full
1. `TAX_EXEMPTION_MATRIX` entry'leri (351 full kuralı dahil)
2. `validateExemptionCode` full implementation
3. `cross-validators.ts`'e entegrasyon
4. Representative samples kombinatorik testler (~35)

### 5.3 B-14 + B-07 — CustomsDeclaration + IHRACKAYITLI 702
1. `CustomsDeclarationInput` + `InvoiceLineInput.requiredCustomsID/customsDeclarations`
2. `xsd-sequence.ts` `CUSTOMS_DECLARATION_SEQ` ekleme
3. Serializer XML emisyonu (Shipment içinde)
4. `validateIhrackayitli702`
5. Testler (~8)

### 5.4 B-08 — YatirimTesvikKDV
1. `isYatirimTesvikScope` helper
2. `validateYatirimTesvikKdvDocument`
3. `validateYatirimTesvikKdvLine`
4. `cross-validators.ts` entegrasyonu
5. Testler (~10)

### 5.5 KamuFaturaCheck (TR IBAN)
1. `common-validators.ts` `validateKamuIban`
2. `TR_IBAN_REGEX` zaten var — reuse
3. Testler (~3)

### 5.6 Delege + Fark Analizi
1. `type-validators.ts` dispatch delegasyonu (geri uyumlu)
2. `exemption-config.ts` 99 entry ↔ Codelist 79 kod fark analiz

### 5.7 Implementation-log + Final
1. `audit/sprint-05-implementation-log.md`
2. `audit/SONUC-konsolide-bulgular.md` (B-06/07/08/14 kapandı)
3. `audit/FIX-PLANI-v3.md` Sprint 5 status
4. Sprint 8 devir listesi (B-83 + Mimsoft fixture)
5. Full `yarn test` + `yarn typecheck`

---

## 6. Hata Mesajı Stratejisi

**Karar:** Mevcut `ValidationError` interface korunur. Yeni validator'lar standart code ekler. Mesajlar Türkçe, code'lar İngilizce standart.

| Code | Message şablonu | Path örneği |
|---|---|---|
| `UNKNOWN_EXEMPTION_CODE` | Bilinmeyen istisna kodu: 'X' | `lines[0].taxTotal.taxSubtotals[0].taxExemptionReasonCode` |
| `INVALID_EXEMPTION_FOR_TYPE` | 'X' kodu 'Y' fatura tipinde kullanılamaz | aynı |
| `FORBIDDEN_EXEMPTION_FOR_TYPE` | 'X' kodu 'Y' fatura tipinde yasaktır | aynı |
| `EXEMPTION_REQUIRES_ZERO_KDV_LINE` | 'X' kodu için en az bir satırda KDV tutarı=0 olmalı | `lines` |
| `IHRACKAYITLI_702_REQUIRES_GTIP` | IHRACKAYITLI + 702 için satır GTİP (12 hane) zorunlu | `lines[N].requiredCustomsID` |
| `IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD` | IHRACKAYITLI + 702 için ALICIDIBSATIRKOD (11 hane) zorunlu | `lines[N].customsDeclarations` |
| `IHRACKAYITLI_INVALID_SCHEME_ID` | Geçersiz IHRACKAYITLI schemeID — SATICIDIBSATIRKOD veya ALICIDIBSATIRKOD olmalı | `lines[N].customsDeclarations[M]...schemeID` |
| `YATIRIMTESVIK_KDV_REQUIRED_DOCUMENT` | Yatırım Teşvik Faturasında belge seviyesinde KDV Oranı ve Değeri girilmelidir | `taxTotals` |
| `YATIRIMTESVIK_KDV_REQUIRED_LINE` | Yatırım Teşvik Faturasında kalem bazında KDV Oranı ve Değeri girilmelidir | `lines[N].taxTotal` |
| `YATIRIMTESVIK_HARCAMA_TIPI_KDV_REQUIRED` | Harcama Tipi 03/04 için satır KDV değeri girilmelidir | `lines[N].taxTotal` |
| `KAMU_REQUIRES_TR_IBAN` | KAMU profilinde geçerli TR IBAN zorunlu | `paymentMeans[N].payeeFinancialAccount.id` |

---

## 7. Validator Dosya Yapısı

**Yeni dosyalar:**

| Dosya | Kapsam |
|---|---|
| `src/validators/cross-check-matrix.ts` | `TAX_EXEMPTION_MATRIX` + `validateExemptionCode` |
| `src/validators/ihrackayitli-validator.ts` | B-07 özel (validateIhrackayitli702) |
| `src/validators/yatirim-tesvik-validator.ts` | B-08 özel (Doc + Line) |

**Genişletilecek dosyalar:**

| Dosya | Değişiklik |
|---|---|
| `src/validators/cross-validators.ts` | `validateCrossMatrix`'e `validateTaxExemptionMatrix` + `validateIhrackayitli702` + `validateYatirimTesvikKdv*` ekle |
| `src/validators/type-validators.ts` | Mevcut dispatch delege (geri uyumlu) |
| `src/validators/common-validators.ts` | KamuFaturaCheck (TR IBAN) |
| `src/config/constants.ts` | `YATIRIM_TESVIK_EARSIV_TYPES`, `YATIRIM_TESVIK_IADE_TYPES` |
| `src/types/common.ts` | `CustomsDeclarationInput`, `PartyIdentificationInput` |
| `src/types/invoice-input.ts` | `InvoiceLineInput.requiredCustomsID/customsDeclarations` |
| `src/serializers/line-serializer.ts` (veya delivery-serializer) | CustomsDeclaration XML emisyonu |
| `src/serializers/xsd-sequence.ts` | `CUSTOMS_DECLARATION_SEQ` yeni entry |
| `src/calculator/simple-invoice-mapper.ts` | B-81 minimal fix korunur, değişmez |

---

## 8. Adım Adım İmplementasyon (Alt-Commit)

| Sıra | Alt Commit | Konu | Dependency |
|---|---|---|---|
| 1 | **Sprint 5.1** | `YATIRIM_TESVIK_*` sabitler + `TAX_EXEMPTION_MATRIX` iskelet + smoke test | — |
| 2 | **Sprint 5.2** | B-06 + M5 matris full + 351 entry + validateExemptionCode + entegrasyon + ~35 test | 5.1 |
| 3 | **Sprint 5.3** | B-14 + B-07 — CustomsDeclaration tip + serializer + validateIhrackayitli702 + ~8 test | 5.1 |
| 4 | **Sprint 5.4** | B-08 — validateYatirimTesvikKdv{Document,Line} + ~10 test | 5.1 |
| 5 | **Sprint 5.5** | KamuFaturaCheck (TR IBAN) + ~3 test | — |
| 6 | **Sprint 5.6** | type-validators delegasyon + Codelist fark analizi | 5.2, 5.3, 5.4 |
| 7 | **Sprint 5.7** | Implementation-log + audit güncelleme + Sprint 8 devir + full test | Tümü |

**Toplam:** 7 alt commit.

---

## 9. Cross-Reference Grep Hedefleri

```bash
grep -rn "'351'" src/
grep -rn "NON_ISTISNA_REASON_CODES" src/
grep -rn "taxExemptionReasonCode" src/
grep -rn "validateByType" src/
grep -rn "IHRACKAYITLI" src/
grep -rn "'702'" src/
grep -rn "YATIRIMTESVIK\|YTB" src/
grep -rn "CustomsDeclaration\|RequiredCustomsID\|ALICIDIBSATIRKOD" src/
grep -rn "KAMU" src/
grep -rn "PayeeFinancialAccount" src/
```

---

## 10. Test Stratejisi

### 10.1 Kombinatorik Testler (B-06 + M5) — `__tests__/validators/tax-exemption-matrix.test.ts`

- 351 × 9 allowed types × 2 durum (KDV=0 var/yok) = 18
- 351 × 7 forbidden types = 7
- 201/250/301/350 × 6 allowed × ret cases = 10
- 701-704 × IHRACKAYITLI/IADE accept + 4 forbidden = ~6
- 801-812 × OZELMATRAH/IADE/SGK accept + forbidden = ~6
- **Tahmin:** ~35 test

### 10.2 B-07 + B-14 — `__tests__/validators/ihrackayitli-validator.test.ts` — ~8 test

### 10.3 B-08 — `__tests__/validators/yatirim-tesvik-validator.test.ts` — ~10 test

### 10.4 KamuFaturaCheck — common-validators.test.ts eki — ~3 test

### 10.5 Toplam: ~56 yeni test

### 10.6 Fixture

**Mimsoft gerçek fixture yok** → Sentetik fixture'larla. Sprint 8 devir listesinde.

---

## 11. Risk ve Edge Case

| ID | Risk | Olasılık | Mitigasyon |
|---|---|---|---|
| R1 | Matris eksik kombinasyon — sessiz bug | ORTA | `UNKNOWN_EXEMPTION_CODE` default + kombinatorik test |
| R2 | Schematron-kütüphane uyumsuzluğu | ORTA | Rule XML'leri plan'a + commit yorumlarına gömülü |
| R3 | 351 semantiği kullanıcı beklentisinden farklı | ÇOK DÜŞÜK | ACIK-SORULAR #12 + Soru 2 cevabı net |
| R4 | Codelist 79 kod ↔ config 99 entry fark | DÜŞÜK | Sprint 5.6 analiz |
| R5 | CustomsDeclaration XSD sequence yanlış | DÜŞÜK | xsd-sequence.ts pattern + snapshot test |
| R6 | B-81 minimal fix + yeni validator çift kontrol | DÜŞÜK | Mapper davranışı değişmez; validator ayrı katman |
| R7 | Sentetik fixture Mimsoft formatına yüzde yüz uymayabilir | ORTA | Sprint 8'de Mimsoft fixture ile regresyon |

---

## 12. Kapsam Dışı (Sprint 8 Devir Listesi)

1. **B-83 — KAMU `partyType` + `PartyIdentification`** (Sprint 4+5 ertelendi)
   - `BuyerPartyType` tip genişletmesi (`'KAMU'` ekleme)
   - `simple-invoice-mapper.ts` KAMU branch
   - `party-serializer.ts` KAMU PartyIdentification
2. **Mimsoft gerçek fatura fixture'ları**
   - IHRACKAYITLI + 702, YATIRIMTESVIK profile + YTB tipleri, SATIS + 351 KDV=0 kalem
   - Prod'a yaklaşırken regresyon için
3. **Diğer v3 bulguları** (B-29/30/31, B-62-69, B-78, B-84-86, B-91, B-104) → Sprint 6+
4. **Despatch extensions** (B-19, B-48-B-53, AR-2) → Sprint 6
5. **Test konsolidasyonu** → Sprint 7
6. **README + Skill + CHANGELOG + v2.0.0** → Sprint 8

---

## 13. Çıktı Listesi

**Yeni dosyalar:**
- `src/validators/cross-check-matrix.ts`
- `src/validators/ihrackayitli-validator.ts`
- `src/validators/yatirim-tesvik-validator.ts`
- `__tests__/validators/tax-exemption-matrix.test.ts`
- `__tests__/validators/ihrackayitli-validator.test.ts`
- `__tests__/validators/yatirim-tesvik-validator.test.ts`
- `audit/sprint-05-implementation-log.md`
- `audit/sprint-05-plan.md` (bu dosya)

**Değişen dosyalar:**
- `src/config/constants.ts`
- `src/validators/cross-validators.ts`
- `src/validators/type-validators.ts`
- `src/validators/common-validators.ts`
- `src/types/common.ts`
- `src/types/invoice-input.ts`
- `src/serializers/line-serializer.ts` (veya delivery-serializer.ts)
- `src/serializers/xsd-sequence.ts`
- `audit/SONUC-konsolide-bulgular.md`
- `audit/FIX-PLANI-v3.md`

---

## 14. Tahmini Süre

**Alt-commit bazında:** 7 commit (5.1 → 5.7).
**Süre:** 3-4 gün; tek oturum beklentisi 5-7 saat.
**Tempo:** 5.1/5.5 kısa (0.5-1h); 5.2 ağır (~2-3h); 5.3/5.4 orta; 5.6/5.7 orta.

---

## Verification

```bash
yarn typecheck
yarn test
yarn test __tests__/validators/tax-exemption-matrix.test.ts
yarn test __tests__/validators/ihrackayitli-validator.test.ts
yarn test __tests__/validators/yatirim-tesvik-validator.test.ts
grep -rn "TAX_EXEMPTION_MATRIX\|validateExemptionCode" src/
```
