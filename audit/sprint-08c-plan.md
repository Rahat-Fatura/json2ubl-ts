# Sprint 8c — v2.0.0 Stable Release Planı

**Branch:** main
**Tarih:** 2026-04-24
**Plan kopya hedefi:** `audit/sprint-08c-plan.md` (8c.0 commit'inde plan kopya pattern'i)
**Hedef:** json2ubl-ts v2.0.0 stable — input/output doğru + validator/calculator tam davranış + 9/9 workaround senaryo strict mode + npm publish.
**Kapsam dışı:** Reactive InvoiceSession (isim koyma + tasarım notu hariç), UI feedback katmanı, yeni feature eklentisi.

---

## Context

Sprint 8b tamamlandı (commit `076946e`): 38 senaryo + 114 test + README §8 + CHANGELOG v2.0.0 entry + skill doc patch referansı. **755/755 test yeşil** ama kod dev-complete değil: Sprint 8b sırasında **12 kalıntı bug (B-NEW-01..12)** keşfedildi ve `audit/b-new-audit.md`'ye tam dump edildi. Bu bug'lar ve 9 workaround senaryonun **tümü** üretilmeden v2.0.0 release'i yapılamaz (Berkay kararı: 9/9 strict'e geçer, 20 ve 26 senaryolarının root cause'ları için B-NEW-13 ve B-NEW-14 sprint 8c'de tanımlanır + düzeltilir).

**Sprint 8c kapsamındaki 14 bug:**

- **2 kritik (B-NEW-11, B-NEW-12)** — Mimsoft üretiminde doğrudan etki. Senaryo 05, 07, 10, 16, 17, 31, 99 workaround'u.
- **2 yeni (B-NEW-13, B-NEW-14)** — Senaryo 20 (YOLCU passport ayrıştırma) ve 26 (IDIS ETIKETNO validator). Sprint 8c'de tanımlanır + düzeltilir.
- **4 orta (B-NEW-04..07)** — cross-check matrisi eksiklikleri.
- **3 SGK orta (B-NEW-08, 09, 10)** — SGK tip × zorunlu alan haritası.
- **3 düşük (B-NEW-01, 02, 03)** — runtime sınır hijyeni.

**Berkay'ın 3 kritik direktifi (planın bel kemiği):**
1. **Manuel 351 politikası** — Kütüphane 351'i otomatik ekleme işini bırakır. Self-exemption tipi olmayan fatura + kalemde `kdvPercent=0` → 351 kullanıcıdan zorunlu (validator enforce).
2. **Self-exemption tip listesi (M11)** — Kendi istisna kodları olan tipler: ISTISNA, IHRACKAYITLI, OZELMATRAH + IHRACAT, YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK profilleri + EARSIV profilinin YTB varyantları (YTBISTISNA, YTBIHRACKAYITLI vb).
3. **KDV=0 + tevkifat aynı kalemde → validation error.**

**SimpleInvoiceInput sözleşmesi (B-NEW-12 bağlamında):** Matematik kütüphanede, metadata kullanıcıda. Hesaplanmış alanlar (lineExtensionAmount, taxAmount, payableAmount, withholdingAmount) simple-input'ta **ASLA** olmaz. Kullanıcının elle bilmek zorunda olduğu pure metadata (GTİP, AlıcıDİBKod, pasaport bilgileri, referans ID'leri) full-input'ta varsa simple-input'ta da olur; mapper 1-1 hesaplamasız eşler.

---

## 1. Bug Analizi ve Gruplama

### 1.1 Bug öncelik dağılımı

| Grup | Bug'lar | Öncelik | Ortak dosya |
|------|---------|---------|-------------|
| **G1 — Mimsoft Kritik** | B-NEW-11, B-NEW-12 | Kritik | calculator + mapper + types + yeni validator |
| **G2 — YOLCU/IDIS Strict** | B-NEW-13, B-NEW-14 | Kritik | types + mapper + profile-validators |
| **G3 — Cross-check Matrix** | B-NEW-04, 05, 06, 07 | Orta | `cross-check-matrix.ts`, `cross-validators.ts`, `invoice-builder.ts`, `type-validators.ts` |
| **G4 — SGK Tip Zorunlu** | B-NEW-08, 09, 10 | Orta | `type-validators.ts`, `simple-types.ts`, mapper |
| **G5 — Runtime Hijyen** | B-NEW-01, 02, 03 | Düşük | `common-validators.ts` |

### 1.2 B-NEW-01..10 — Audit Fix Sketch'leri Direkt Uygulanabilir

Bu 10 bug için `audit/b-new-audit.md`'deki fix sketch'leri yeterli. Referanslar (fix detayı audit'te, burada tekrar yok):

- B-NEW-01 (kdvPercent [0..100]) → `common-validators.ts` satır loop
- B-NEW-02 (quantity > 0) → aynı loop
- B-NEW-03 (tax.percent [0..100]) → aynı loop
- B-NEW-04 (351 tek-satır KDV>0) → `cross-validators.ts` `kdvSubtotals` arg düzeltme
- B-NEW-05 (SATIS+702 basic'te geçiyor) → `invoice-builder.ts` `validateCrossMatrix` basic'e taşı
- B-NEW-06 (IHRACKAYITLI exemption zorunlu) → `type-validators.ts` `TYPE_REQUIRES_EXEMPTION_CODES` map
- B-NEW-07 (701-704 requiresZeroKdvLine) → `cross-check-matrix.ts` 701-704 entry'lerine flag ekle
- B-NEW-08 (SGK obje zorunlu) → `type-validators.ts` SGK branch
- B-NEW-09 (sgk.type whitelist) → `simple-types.ts` TS literal union + validator
- B-NEW-10 (sgk.documentNo boş) → B-NEW-08 ile aynı commit

### 1.3 B-NEW-11 — Gerçek Fix (Yeniden Tasarlandı)

Audit önerisi "mapper'da 251 satırını kaldır" semptom kapatma; Berkay'ın kuralı **kütüphaneden 351 otomatik atanmasını tamamen kaldırır, validator'a kullanıcıdan 351 zorunluluğunu dayatır:**

**Değişiklikler:**
1. **`src/calculator/document-calculator.ts:67-71`** — `DEFAULT_EXEMPTIONS.satis = '351'` satırı kaldırılır. Calculator artık `type === 'SATIS'` branch'inde `calc.taxExemptionReason.kdv = '351'` otomatik atamayı yapmaz. TEVKIFAT, SGK, KOMISYONCU, KONAKLAMAVERGISI, TEKNOLOJIDESTEK, SARJHIZMETI, HKS varyantları — hepsi aynı davranır.
2. **`src/calculator/simple-invoice-mapper.ts:249-251`** — B-81 "TEVKIFAT'ta 351 XML'e yaz" satırı kaldırılır.
3. **Yeni validator: `src/validators/manual-exemption-validator.ts`**
   - Fatura self-exemption tipinden/profilinden DEĞİL ise (M11 listesi — §2):
     - Her satır için:
       - `kdvPercent === 0` VE satır/belge `kdvExemptionCode` boş/eksik → `MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV` ("KDV=0 kalem için istisna sebep kodu (örn. 351) manuel verilmeli")
       - `kdvPercent === 0` VE `withholdingTaxCode` dolu → `WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV` ("Aynı kalemde KDV=0 ile tevkifat kodu birlikte kullanılamaz")
       - `kdvPercent > 0` VE kalem `kdvExemptionCode === '351'` → `EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV` ("351 kodu KDV>0 kalemde kullanılamaz")
   - Self-exemption tipli/profilli faturalarda validator pas.
4. **Validator register:** `src/builders/invoice-builder.ts` — `validateManual351Rule` hem basic hem strict modda çağrılır.
5. **SimpleLineInput genişletme:** `SimpleLineInput.kdvExemptionCode?: string` alanı eklenir (satır bazı kod; belge seviyesi fallback korunur).
6. **Cross-check matrisi aynen kalır** — 351 `requiresZeroKdvLine: true` + allowed/forbidden types; calculator 351 yazmadığı için tetiklenmez; kullanıcı verdiğinde doğru tipte olmalı.

**Etkilenen senaryolar:** 05, 10, 16, 31, 99 (TEVKIFAT varyantları) — output XML'den `<TaxExemptionReasonCode>351</TaxExemptionReasonCode>` kalkar. 06 (SATIS+351) manuel input zaten veriyor — snapshot değişmemeli.

### 1.4 B-NEW-12 — Gerçek Fix (Pure Metadata Genişlemesi)

**Semantik temel:** `SimpleLineInput.buyerCode` "alıcı ürün kodu" anlamında; IHRACKAYITLI+702'nin gerektirdiği 11-haneli AlıcıDİBSATIRKOD farklı kavram.

**Değişiklikler:**
1. **`src/calculator/simple-types.ts` — SimpleLineDeliveryInput genişlet:**
   ```typescript
   interface SimpleLineDeliveryInput {
     // ... mevcut
     alicidibsatirkod?: string;  // YENİ — 11 hane, IHRACKAYITLI+702 için
   }
   ```
2. **`src/calculator/simple-invoice-mapper.ts` `buildSingleLine()`:** `line.delivery.alicidibsatirkod` → `delivery.shipment.transportHandlingUnits[0].customsDeclarations[0].issuerParty.partyIdentifications[{ id, schemeID: 'ALICIDIBSATIRKOD' }]`.
3. **Validator (`ihrackayitli-validator.ts`) dokunulmaz** — low-level InvoiceInput üzerinde tetiklenir.
4. **Senaryo 07/17 input.ts güncelle:** `buyerCode: 'DIIB-2026-000042'` kaldır; `delivery.alicidibsatirkod: '12345678901'` (11 hane fiktif).

**Etkilenen senaryolar:** 07, 17 — Shipment ağacı XML'de doğar. Snapshot regenerate.

**Breaking disiplini:** Yeni opsiyonel alan — mevcut kullanıcı input'ları etkilenmez. **Added**, BREAKING değil.

### 1.5 B-NEW-13 — YOLCU Passport Ayrıştırma (Yeni Bug, Sprint 8c'de Tanımlı + Fix)

**Semantik temel:** Senaryo 20 (YOLCUBERABERFATURA+ISTISNA 322) şu an `buyerCustomer.taxNumber: 'N12345678'` (pasaport no) veriyor; gerçek GİB XML'inde `nationalityId` (ISO ülke kodu — DE, US vs.) + `passportId` (pasaport no) **ayrı alanlar** (B-104 skill §7.1).

**Değişiklikler:**
1. **`src/calculator/simple-types.ts` — SimpleBuyerCustomerInput genişlet:**
   ```typescript
   interface SimpleBuyerCustomerInput {
     // ... mevcut
     nationalityId?: string;  // YENİ — ISO ülke kodu (2 veya 3 hane, ör. 'DE', 'USA')
     passportId?: string;      // YENİ — pasaport numarası
   }
   ```
2. **`src/calculator/simple-invoice-mapper.ts` `buildBuyerCustomer()`:**
   - YOLCUBERABERFATURA profilinde `nationalityId` → `buyerCustomerParty.partyIdentifications[{ schemeID: 'NATIONALITYID', id: ... }]`
   - `passportId` → `buyerCustomerParty.partyIdentifications[{ schemeID: 'PASSPORTID', id: ... }]`
3. **Yeni validator veya `profile-validators.ts` genişlet:**
   - YOLCUBERABERFATURA profilinde `buyerCustomer.nationalityId` **zorunlu** (format: ISO alpha-2 veya alpha-3)
   - `buyerCustomer.passportId` **zorunlu** (format: alfanumerik)
   - `buyerCustomer.taxNumber` opsiyonel (aracı kurum/firma TCKN/VKN — hâlâ destek; ama passport alanlarıyla birlikte olması sorun değil)
4. **Senaryo 20 input.ts güncelle:** `buyerCustomer.taxNumber: 'N12345678'` kaldır; `nationalityId: 'DE'` + `passportId: 'N12345678'` ekle.
5. **`audit/b-new-audit.md`'ye B-NEW-13 bölümü eklenir** (aynı dump formatında — reproduction, expected, actual, root cause, fix sketch).

**Etkilenen senaryo:** 20 — `validationLevel: 'basic'` kaldırılır, strict'e geçer. Snapshot regenerate (XML'de NATIONALITYID/PASSPORTID schemeID'li PartyIdentification'lar eklenir).

**Breaking disiplini:** Yeni opsiyonel alan. YOLCUBERABERFATURA profili kullanıcıları artık bu alanları vermek zorunda (zorunluluk gerekçeli — GİB kabulü için zaten gerekli). **Added + BREAKING (validator side — profil-spesifik zorunluluk artı).**

### 1.6 B-NEW-14 — IDIS ETIKETNO Validator (Yeni Bug, Sprint 8c'de Tanımlı + Fix)

**Semantik temel:** Senaryo 26 (IDIS+SATIS) `sender.identifications[{schemeId:'SEVKIYATNO', value:'SE-2026042'}]` + `lines[].additionalItemIdentifications[{schemeId:'ETIKETNO', value:'ET0000001'}]` veriyor. Simple-input kabul ediyor ama validator kontrol etmiyor (schematron kuralı eksik).

**Değişiklikler:**
1. **`src/validators/profile-validators.ts` — IDIS branch genişlet:**
   - `sender.identifications` array'inde `schemeId === 'SEVKIYATNO'` entry zorunlu; değer formatı `/^SE-\d{7}$/` regex (SE-0000000 … SE-9999999).
   - Her `lines[].additionalItemIdentifications` array'inde `schemeId === 'ETIKETNO'` entry zorunlu; değer formatı `/^[A-Z]{2}\d{7}$/` regex (2 büyük harf + 7 rakam, ör. ET0000001).
   - Eksik veya format uyumsuz → `IDIS_SEVKIYATNO_REQUIRED` / `IDIS_SEVKIYATNO_INVALID_FORMAT` / `IDIS_ETIKETNO_REQUIRED` / `IDIS_ETIKETNO_INVALID_FORMAT` hataları.
2. **Senaryo 26 input.ts** — mevcut hâli doğru (SE-2026042 + ET0000001), test için format-breaking invalidCase'ler eklenir.
3. **`audit/b-new-audit.md`'ye B-NEW-14 bölümü eklenir** (aynı dump formatı).

**Etkilenen senaryo:** 26 — `validationLevel: 'basic'` kaldırılır, strict'e geçer. Output snapshot değişmez (input zaten doğru format; sadece validator artık kontrol ediyor).

**Breaking disiplini:** IDIS profili validator sıkılaştı — mevcut geçersiz input'lar artık reddedilir. **Changed + BREAKING (validator side).**

---

## 2. M11 — Self-Exemption Types Mimari Kararı

### 2.1 Karar

**Yeni dosya:** `src/config/self-exemption-types.ts`

```typescript
/**
 * M11 — Kendi istisna kodlarını taşıyan fatura tip/profilleri.
 *
 * Bu tiplerde/profillerde kütüphane 351 atamaz, validator 351 zorunluluğu uygulamaz.
 * Dışındaki tüm tipler (SATIS, SGK, TEVKIFAT, IADE, KOMISYONCU, TEKNOLOJIDESTEK,
 * KONAKLAMAVERGISI, SARJHIZMETI, HKS varyantları, YTBSATIS/YTBTEVKIFAT vb.)
 * KDV=0 kalem için manuel istisna kodu (varsayılan 351) gerektirir.
 */
export const SELF_EXEMPTION_INVOICE_TYPES: ReadonlySet<string> = new Set([
  'ISTISNA',
  'YTBISTISNA',
  'IHRACKAYITLI',
  'OZELMATRAH',
]);

export const SELF_EXEMPTION_INVOICE_PROFILES: ReadonlySet<string> = new Set([
  'IHRACAT',
  'YOLCUBERABERFATURA',
  'OZELFATURA',
  'YATIRIMTESVIK',
]);

export function isSelfExemptionInvoice(type: string, profile: string): boolean {
  return SELF_EXEMPTION_INVOICE_TYPES.has(type) || SELF_EXEMPTION_INVOICE_PROFILES.has(profile);
}
```

### 2.2 Kullanım noktaları

- `manual-exemption-validator.ts` → `isSelfExemptionInvoice()` gate olarak kullanılır.
- Test edilmesi: `__tests__/config/self-exemption-types.test.ts` — her tip/profil için davranış.

### 2.3 README §8 güncellemesi

```markdown
| M11 | Self-exemption tipleri (ISTISNA, IHRACKAYITLI, OZELMATRAH) ve profilleri (IHRACAT, YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK) kendi istisna kodlarını taşır; dışındaki tiplerde KDV=0 kalem için kullanıcıdan 351 manuel zorunlu. | `src/config/self-exemption-types.ts` · `src/validators/manual-exemption-validator.ts` |
```

---

## 3. Reactive Session — AR-9 İsim Konulma

### 3.1 Karar

- **Karar adı:** **AR-9: Reactive InvoiceSession — kullanıcı girişi akış tabanlı validator feedback**
- **Mevcut `src/invoice-session.ts`** dokunulmaz — state snapshot validator rolü korunur (M10 setLiability).
- **Tasarım notu dosyası:** `audit/reactive-session-design-notes.md` (yeni). İçerik:
  1. Motivasyon (TEVKIFAT tipi seçildiğinde withholding aktifleşir; KDV=0 kalemde exemption dropdown açılır; 351 default önerilir)
  2. Planlanan API taslağı (InvoiceSession event emitter, sessionMachine state transitions)
  3. v2.1.0 scope öngörüsü
  4. **Bu dosya dokümantasyon; kod değişikliği Sprint 8c'de yok.**

### 3.2 README §8 ve FIX-PLANI-v3.md

- README §8: `| AR-9 | Reactive InvoiceSession tasarım notu (v2.1.0) | audit/reactive-session-design-notes.md |`
- FIX-PLANI-v3.md: AR-9 başlığı + 2-3 cümle özet.

---

## 4. Alt-Sprint Granülaritesi (Commit Listesi)

Sprint 8c: **14 atomik commit.**

| # | Commit | İçerik | Etki |
|---|--------|--------|------|
| **8c.0** | Sprint 8c plan kopya | Bu plan → `audit/sprint-08c-plan.md` + `audit/sprint-08c-implementation-log.md` iskelet | Dokümantasyon |
| **8c.1** | B-NEW-11 fix (kritik) | `document-calculator.ts` 351 otomatik atamayı kaldır + `simple-invoice-mapper.ts` B-81 satır kaldır + yeni `manual-exemption-validator.ts` + `SimpleLineInput.kdvExemptionCode` + `invoice-builder.ts` validator register | 05/10/16/31/99 snapshot regen; ~9 yeni test |
| **8c.2** | B-NEW-12 fix (kritik) | `simple-types.ts` SimpleLineDeliveryInput.alicidibsatirkod + `simple-invoice-mapper.ts` CustomsDeclaration ağacı + 07/17 input.ts güncelle | 07/17 snapshot regen; ~4 yeni test |
| **8c.3** | M11 self-exemption types config | `src/config/self-exemption-types.ts` + config test + `manual-exemption-validator.ts` bağlama | ~6 yeni test |
| **8c.4** | B-NEW-13 fix (YOLCU passport) | `simple-types.ts` SimpleBuyerCustomerInput.nationalityId/passportId + mapper `buildBuyerCustomer()` + `profile-validators.ts` YOLCU branch + 20 input.ts güncelle + `audit/b-new-audit.md` B-NEW-13 bölümü | 20 snapshot regen; ~5 yeni test |
| **8c.5** | B-NEW-14 fix (IDIS validator) | `profile-validators.ts` IDIS branch (SEVKIYATNO/ETIKETNO regex) + 26 validation-errors.ts format-breaking cases + `audit/b-new-audit.md` B-NEW-14 bölümü | 26 snapshot değişmez; ~5 yeni test |
| **8c.6** | G3 cross-check matrix (B-NEW-04, 05, 06, 07) | `cross-check-matrix.ts` + `cross-validators.ts` + `type-validators.ts` + `invoice-builder.ts` | ~12 yeni test |
| **8c.7** | G4 SGK (B-NEW-08, 09, 10) | `type-validators.ts` SGK branch + `simple-types.ts` TS union + mapper guard | ~6 yeni test |
| **8c.8** | G5 runtime hijyen (B-NEW-01, 02, 03) | `common-validators.ts` satır loop (kdvPercent, quantity, tax.percent) | ~6 yeni test |
| **8c.9** | validation-errors.test.ts strict per-case + workaround geri alma | Slug-smoke → strict per-case; `basicModSlugs` set **tamamen boş** (9/9 senaryo strict); notCaughtYet flag temizliği | ~114 smoke → ~228 strict (net +80-ish) |
| **8c.10** | Snapshot regenerate (9 senaryo) | `bun run build:examples` — 05, 07, 10, 16, 17, 20, 26, 31, 99 output.xml regen | Snapshot delta review |
| **8c.11** | Reactive notes + doküman güncellemeleri | `audit/reactive-session-design-notes.md` AR-9 + CHANGELOG Sprint 8c alt-section + README §8 M11/AR-9 + FIX-PLANI-v3.md M11/AR-9 başlıkları | Dokümantasyon |
| **8c.12** | v2.0.0 release ops | `package.json` 1.4.2 → 2.0.0, `git tag v2.0.0`, `npm publish --dry-run` smoke, `npm publish`, GitHub release notes | Release (skill repo commit YOK — manuel uygulama bekler) |
| **8c.13** | Sprint 8c implementation log finalize | `audit/sprint-08c-implementation-log.md` tam dolduruş + v2.1.0 roadmap devir (AR-9 implementation + ileride bulunacak bug'lar) | Dokümantasyon |

### 4.1 Commit stratejisi gerekçeleri

- **8c.1 ve 8c.2 ayrı** — her ikisi breaking/behavior-change; ayrı snapshot etkisi, ayrı review.
- **8c.3 ayrı** — M11 config + test self-contained.
- **8c.4 ve 8c.5 ayrı** — iki farklı profil bug'ı, farklı dosyalar.
- **8c.6 tek commit** — 4 cross-check bug'ı aynı matrix sistemi, atomik.
- **8c.7 tek commit** — SGK tip zinciri.
- **8c.8 tek commit** — 3 sınır kontrolü aynı loop.
- **8c.9 ayrı** — test sıkılaştırma + workaround kaldırma; fix commit'lerinin validasyonu.
- **8c.10 ayrı** — snapshot delta review edilebilir.
- **8c.11 ayrı** — dokümantasyon temiz kalır.
- **8c.12 release commit** — version + tag + publish + release notes tek atomik adım.
- **8c.13 final log** — Sprint 8b pattern'iyle uyumlu.

---

## 5. Workaround Geri Alma Planı

### 5.1 9 senaryonun Sprint 8c sonrası durumu (9/9 strict'e)

| Senaryo | Şu an | Sprint 8c sonrası | Fix kaynağı | Snapshot değişir mi |
|---------|-------|-------------------|-------------|---------------------|
| 05-temelfatura-tevkifat | basic | **strict** | B-NEW-11 | Evet (351 kalkar) |
| 07-temelfatura-ihrackayitli-702 | basic | **strict** | B-NEW-12 | Evet (Shipment ağacı doğar) |
| 10-ticarifatura-tevkifat-650-dinamik | basic | **strict** | B-NEW-11 | Evet (351 kalkar) |
| 16-kamu-tevkifat | basic | **strict** | B-NEW-11 | Evet (351 kalkar) |
| 17-kamu-ihrackayitli | basic | **strict** | B-NEW-12 | Evet (Shipment ağacı doğar) |
| 20-yolcu-beraber-istisna-yabanci | basic | **strict** | B-NEW-13 | Evet (NATIONALITYID/PASSPORTID schemeID eklenir) |
| 26-idis-satis | basic | **strict** | B-NEW-14 | Değişmez (input zaten doğru format) |
| 31-feature-4171-otv-tevkifati | basic | **strict** | B-NEW-11 | Evet (351 kalkar) |
| 99-showcase-everything | basic | **strict** | B-NEW-11 | Evet (351 kalkar) |

**Toplam:** 9/9 strict'e geçer. `basicModSlugs` set'i Sprint 8c sonunda **boş**.

### 5.2 Senaryo 06 teyit

`examples/06-temelfatura-istisna-351/input.ts` zaten doğru — `type: 'SATIS' + kdvExemptionCode: '351' + kdvPercent: 0`; `validationLevel: 'strict'` (default). B-NEW-04 ve B-NEW-11 fix sonrası:
- `kdvPercent: 0` + belge `kdvExemptionCode: '351'` → validator pass (manuel kod verildi)
- Snapshot teorik olarak değişmez (belge seviyesi 351 kodu zaten XML'de vardı)
- Doğrulanacak: Snapshot mismatch çıkarsa elle inceleme

### 5.3 Snapshot regenerate süreci (8c.10 commit'i)

1. `bun run build:examples` — 9 senaryo regenerate
2. Git diff review per-scenario:
   - **05, 10, 16, 31, 99:** `<cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode>` kalkmalı
   - **07, 17:** `<cac:Shipment>/<cac:TransportHandlingUnit>/.../PartyIdentification[@schemeID='ALICIDIBSATIRKOD']` eklenmeli
   - **20:** `<cac:PartyIdentification>/<cbc:ID schemeID='NATIONALITYID'>DE</cbc:ID>` + `<cbc:ID schemeID='PASSPORTID'>N12345678</cbc:ID>`
   - **26:** Değişmez
3. Snapshot değişiklikleri 8c.10 commit'inde işaretlenir.

### 5.4 Mimsoft fixture regresyonu

- **f10, f11 (TEVKIFAT):** Şu an `TaxExemptionReasonCode=351` içermiyorsa (Mimsoft gerçek TEVKIFAT'ta 351 yazmıyor) → B-NEW-11 fix'i fixture ile uyumlu. Ön-kontrol: `grep "351" __tests__/fixtures/mimsoft-real-invoices/f10*.xml f11*.xml`.
- **f12 (IHRACKAYITLI+702):** Fixture'da ALICIDIBSATIRKOD schemeID'li PartyIdentification var; B-NEW-12 fix'i aynı XML'i üretir.
- **f15 (SATIS+351):** Manuel 351 kullanımı; B-NEW-11 fix'i etkilemez.
- Fixture testleri (`__tests__/calculator/mimsoft-f12-f17.test.ts`) yeşil kalır.

---

## 6. Test Sıkılaştırma Planı

### 6.1 Test sayısı tahmini

- Mevcut: 755 test
- Yeni (Sprint 8c commits):
  - 8c.1 (B-NEW-11): ~9
  - 8c.2 (B-NEW-12): ~4
  - 8c.3 (M11): ~6
  - 8c.4 (B-NEW-13): ~5
  - 8c.5 (B-NEW-14): ~5
  - 8c.6 (G3 cross-check): ~12
  - 8c.7 (G4 SGK): ~6
  - 8c.8 (G5 hijyen): ~6
  - 8c.9 (strict per-case): ~80 net (38 slug smoke → 38 senaryo × ~3 case = ~114 strict; net +76)
- **Tahmini toplam: 755 + 9 + 4 + 6 + 5 + 5 + 12 + 6 + 6 + 76 ≈ 884**

### 6.2 `validation-errors.test.ts` strict per-case yapısı (8c.9)

```typescript
for (const scenario of scenarios) {
  for (const c of scenario.invalidCases) {
    it(`${scenario.id} — ${c.description}`, () => {
      const level = c.validationLevel ?? 'strict';
      const builder = new SimpleInvoiceBuilder({ validationLevel: level });
      if (c.expectedErrorMessage) {
        expect(() => builder.build(c.input)).toThrow(c.expectedErrorMessage);
      } else if (c.expectedErrors) {
        try {
          builder.build(c.input);
          throw new Error('Expected validation error, got success');
        } catch (err) {
          const errors = (err as UblBuildError).errors;
          for (const expected of c.expectedErrors) {
            expect(errors.some(e =>
              e.code === expected.code &&
              (!expected.messageIncludes || e.message.includes(expected.messageIncludes))
            )).toBe(true);
          }
        }
      }
    });
  }
}
```

### 6.3 notCaughtYet flag temizliği (8c.9 içinde)

Sprint 8c fix'lerinden sonra bu flag'lar kaldırılır ve `expectedErrors` içeriğine promote edilir:

- 06 (B-NEW-04) → `EXEMPTION_REQUIRES_ZERO_KDV_LINE`
- 07 (B-NEW-05, 06, 07, 12) → ilgili error kodları
- 02, 03 (B-NEW-01, 02, 03) → `INVALID_VALUE`
- 08 (B-NEW-08, 09, 10) → ilgili error kodları
- 05 (B-NEW-11) → `MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV` veya `WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV`
- 20 (B-NEW-13) → `YOLCU_NATIONALITYID_REQUIRED` / `YOLCU_PASSPORTID_REQUIRED`
- 26 (B-NEW-14) → `IDIS_SEVKIYATNO_REQUIRED` / `IDIS_ETIKETNO_REQUIRED` (format varyantları)

---

## 7. Release Operasyonu

### 7.1 Publish öncesi verification checklist (8c.12 commit öncesi)

1. **`bun test` — ~884 test yeşil**
2. **`bun run build` — TypeScript derleme hatasız**
3. **`bun run lint` (varsa) — lint hatasız**
4. **`bun run build:examples` — 38 senaryo regenerate, git diff clean (8c.10 sonrası)**
5. **38 senaryo XSD validation** — mevcut `validate:xsd` aracı veya 4-5 senaryo spot check GİB teknik kılavuzuyla
6. **`npm publish --dry-run`** — paket içeriği görsel kontrol (dist/, package.json metadata, README.md, CHANGELOG.md)
7. **Manuel smoke: örnek consumer** — `bun add file:./json2ubl-ts-2.0.0.tgz` + senaryo 01 build
8. **README rendering kontrolü** — GitHub'da tablo/kod block'ları düzgün

### 7.2 Release komutları (8c.12)

```bash
npm version 2.0.0 --no-git-tag-version
git add package.json
git commit -m "Sprint 8c.12: v2.0.0 release"
git tag -a v2.0.0 -m "json2ubl-ts v2.0.0 — Sprint 8a+8b+8c stable"
git push origin main
git push origin v2.0.0
npm publish --dry-run
npm publish  # 2FA prompt
gh release create v2.0.0 --title "v2.0.0 — UBL-TR stable" --notes-file <(extract CHANGELOG v2.0.0 section) --target main
```

### 7.3 Skill repo commit (manuel uygulama bekler)

- `audit/skill-doc-patches-sprint-8b.md` Sprint 8b'de hazır; Sprint 8c otomatik commit atmaz.
- Berkay elle uygular (path belirsiz). 8c.12 ve sonrası otomatik iş yok.
- Sprint 8c implementation log'una not eklenir ("skill repo patch manuel uygulama devri").

---

## 8. CHANGELOG + Dokümantasyon Güncellemeleri

### 8.1 CHANGELOG.md — Sprint 8c alt-section

Sprint 8b'de yazılan v2.0.0 entry'si korunur. Sprint 8c hotfix'leri **aynı v2.0.0 entry içinde alt-section**:

```markdown
## [2.0.0] — 2026-04-XX

### Sprint 8c Hotfix Dalgası (B-NEW-01..14)

#### Added
- **M11 Self-exemption types config** (`src/config/self-exemption-types.ts`) — ISTISNA, IHRACKAYITLI, OZELMATRAH tipleri + IHRACAT/YOLCUBERABERFATURA/OZELFATURA/YATIRIMTESVIK profilleri.
- **manual-exemption-validator.ts** — KDV=0 kalem için manuel istisna kodu zorunluluğu; KDV=0 + tevkifat reddi; 351 + KDV>0 reddi.
- **SimpleLineInput.kdvExemptionCode** — satır bazı istisna kodu.
- **SimpleLineDeliveryInput.alicidibsatirkod** — IHRACKAYITLI+702 için 11-haneli AlıcıDİBKod.
- **SimpleBuyerCustomerInput.nationalityId + passportId** — YOLCUBERABERFATURA pasaport ayrıştırma.
- **IDIS profili schematron kontrolü** — SEVKIYATNO (SE-\d{7}) + ETIKETNO ([A-Z]{2}\d{7}).
- **Type × Required exemption codes map** (`TYPE_REQUIRES_EXEMPTION_CODES`) — IHRACKAYITLI için 701-704.
- **common-validators.ts runtime hijyen:** kdvPercent [0,100], quantity > 0, tax.percent [0,100].
- **SGK tip zorunlu alan kontrolleri:** sgk obje, sgk.type whitelist, sgk.documentNo boş-olmama.
- **AR-9 Reactive InvoiceSession tasarım notu** (`audit/reactive-session-design-notes.md`).

#### Changed
- **Calculator artık 351 otomatik atamaz** — Self-exemption dışı fatura tipinde KDV=0 kalem → 351 manuel zorunlu.
- **validateCrossMatrix basic modda da çalışır** — forbidden-type kontrolü her zaman açık (B-NEW-05).
- **701-704 kuralları `requiresZeroKdvLine: true`** bayrağı (B-NEW-07).
- **IDIS profili validator sıkılaştı** — SEVKIYATNO/ETIKETNO format zorunluluğu.

#### Removed
- **document-calculator.ts DEFAULT_EXEMPTIONS.satis** (B-NEW-11).
- **simple-invoice-mapper.ts B-81 TEVKIFAT+351 atlatma satırı** (B-NEW-11).

#### Fixed
- B-NEW-01..14 (14 bug — ilk 12 audit/b-new-audit.md'de, 13-14 Sprint 8c'de eklendi).
- 9/9 workaround senaryo strict moda döndü; `basicModSlugs` set'i boş.

#### BREAKING CHANGES (Sprint 8c eklemeleri)
- Calculator self-exemption dışı faturalarda KDV=0 kalem için 351 otomatik üretmez — manuel zorunlu.
- `validationLevel: 'basic'` artık cross-matrix forbidden-type kontrolünü çalıştırır; önceden basic'te geçen hatalı type×exemption kombinasyonları reddedilir.
- YOLCUBERABERFATURA profilinde `buyerCustomer.nationalityId` + `passportId` zorunlu.
- IDIS profilinde `sender.identifications[SEVKIYATNO]` + `lines[].additionalItemIdentifications[ETIKETNO]` format zorunlu.
```

### 8.2 README.md §8 Sorumluluk Matrisi

- M11 satırı (yukarıda §2.3)
- AR-9 satırı: `| AR-9 | Reactive InvoiceSession tasarım notu (v2.1.0) | audit/reactive-session-design-notes.md |`

### 8.3 FIX-PLANI-v3.md

- M11 başlığı + 3 cümle özet (self-exemption tip/profil listesi + validator gate)
- AR-9 başlığı + 3 cümle özet (reactive session tasarım notu, uygulama v2.1.0)

### 8.4 `audit/b-new-audit.md`

- Her mevcut B-NEW-XX bölümüne Sprint 8c sonrası **Sonuç** notu eklenir (fix commit hash + davranış değişimi özeti)
- **Yeni B-NEW-13 ve B-NEW-14 bölümleri** — aynı dump formatında (reproduction, expected, actual, root cause, fix sketch, manuel test checklist, karar — sprint 8c'de çözüldü marker'ı)

### 8.5 Skill repo patch

- Sprint 8c otomasyon atmaz. Berkay manuel uygular.

---

## 9. Risk ve Belirsizlikler

| R# | Risk | Etki | Azaltma |
|----|------|------|---------|
| **R1** | B-NEW-11 fix'i Mimsoft f10/f11 fixture'ıyla uyumsuz olur (f10/f11 beklenmedik şekilde 351 içeriyorsa) | Orta | Fix öncesi `grep "351" __tests__/fixtures/mimsoft-real-invoices/f10*.xml f11*.xml`. Bulunursa fix yönü tekrar değerlendirilir. |
| **R2** | Senaryo 06 snapshot B-NEW-11 fix sonrası değişir | Düşük | Calculator 351 atamaz; belge seviyesi kod input'tan geçer. Snapshot regenerate clean olmalı. |
| **R3** | `SimpleLineInput.kdvExemptionCode` yeni alan mevcut kullanıcı kodunu breaks | Düşük | Opsiyonel alan — geriye uyumlu; belge seviyesi fallback. |
| **R4** | `SimpleLineDeliveryInput.alicidibsatirkod` mapper CustomsDeclaration ağacı yanlış kurarsa B-07 validator yanlış tetiklenir | Orta | 07/17 senaryosu strict mod test + Mimsoft f12 XML karşılaştırma. |
| **R5** | B-NEW-13 YOLCU NATIONALITYID/PASSPORTID schemeID'leri GİB XSD'siyle uyumsuz olur | Orta | B-104 skill §7.1 dokümanını doğrulama + f20 fixture yoksa GİB teknik kılavuz kontrol. |
| **R6** | B-NEW-14 IDIS ETIKETNO regex çok sıkı (valid input'ları reddeder) | Orta | Regex `^[A-Z]{2}\d{7}$` — GİB teknik kılavuz + mevcut input (ET0000001) ile uyumlu. Test case: valid 5 varyant + invalid 3 varyant. |
| **R7** | Strict per-case test sıkılaştırması beklenmedik regresyon açar (755 → 884 arası kırılma) | Orta | 8c.9 commit izole; CI'da yeşil ise merge. |
| **R8** | `notCaughtYet` flag'lı case'lerin strict'e promotion'unda expected error code yanlışı (test bug'ı saklar) | Orta | 8c.9'dan önce actual error kodları loglanır, expected ile karşılaştırılır. |
| **R9** | `validateManual351Rule` self-exemption bypass'ı YTB varyantlarını eksik bırakırsa false-positive | Orta | M11 config test edilir (her kombinasyon); YTB* tipleri + YATIRIMTESVIK profili açık. |
| **R10** | npm publish 2FA fail / registry timeout | Düşük | Dry-run smoke + retry; GitHub release ayrı adım. |
| **R11** | Skill repo commit manuel — Sprint 8c otomasyon atmaz, Berkay unutursa skill doc güncel olmaz | Düşük | Sprint 8c implementation log'una TODO + v2.1.0 roadmap'e kaydedilir. |

---

## 10. Süre ve Test Tahmini

- **Süre:** 3-4 iş günü (14 commit, çoğu ~1-2 saat; snapshot inspection yarım gün; release ops yarım gün).
- **Test sayısı hedefi:** 755 → **~884** (Δ +129).
- **Kritik yol:** 8c.0 → 8c.1 → 8c.2 → 8c.3 → 8c.4 → 8c.5 → 8c.6 → 8c.7 → 8c.8 → 8c.9 → 8c.10 → 8c.11 → 8c.12 → 8c.13.
- **Paralel yürüyemeyen:** 8c.10 (snapshot regen) öncesi tüm fix commit'leri bitmiş olmalı. 8c.12 (release) öncesi 8c.9 + 8c.10 + 8c.11 bitmeli.

---

## 11. Verification — Sprint 8c "Bitti" Tanımı

Aşağıdaki 11 kontrol yeşil olmalı:

1. `bun test` → **~884 yeşil / 0 kırmızı**
2. `bun run build` → TypeScript hatasız
3. `git status` temiz (uncommitted yok)
4. `git log --oneline HEAD~14..HEAD` → 8c.0..8c.13 okunaklı
5. 9 senaryo (05, 07, 10, 16, 17, 20, 26, 31, 99) `validationLevel` default strict (veya atanmamış)
6. `basicModSlugs` set'i boş (snapshot.test.ts'te)
7. validation-errors.ts'lerde `notCaughtYet` flag kalmamış (veya sadece B-NEW dışı bilinen case'ler için)
8. `package.json` version `2.0.0`, `git tag v2.0.0` mevcut
9. `npm view json2ubl-ts@2.0.0 version` → `2.0.0`
10. GitHub release v2.0.0 notes CHANGELOG ile eşleşiyor
11. `audit/sprint-08c-implementation-log.md` 14 commit için dolu; v2.1.0 roadmap (AR-9 implementation + skill repo manuel uygulama) net

---

## 12. Açık Kalan Nokta — YOK

Berkay'ın 3 sorusu netleşti:
- Senaryo 20/26 → Sprint 8c'de çözülür (B-NEW-13, B-NEW-14).
- M11 config → yeni dosya `src/config/self-exemption-types.ts`.
- Skill repo → manuel uygulama bekler.

Plan onaylandıktan sonra implementation prompt'u ayrı gelecek.
