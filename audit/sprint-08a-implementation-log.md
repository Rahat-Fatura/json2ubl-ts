---
sprint: 8a
baslik: Devir bulgu temizliği + Mimsoft fixture regresyon + Cross-cutting integration
tarih_basi: 2026-04-23
tarih_sonu: 2026-04-23
plan: audit/sprint-08a-plan.md
fix_plani: audit/FIX-PLANI-v3.md §243-246 (Sprint 5 devir listesi) + §805-810 (B-78) + §852-886 (B-83..B-86) + §1043-1047 (B-104)
onceki_sprint: audit/sprint-07-implementation-log.md (commit 566bd89)
sonraki_sprint: Sprint 8b (Dokümantasyon + Release + v2.0.0 tag)
toplam_commit: 9 atomik alt-commit (8a.1 → 8a.9)
test_durumu_basi: 573 / 573 yeşil (35 dosya)
test_durumu_sonu: 641 / 641 yeşil (40 dosya) — +68 test, plan hedef aralığında
---

## Kapsam (Sprint 8a Planından)

Sprint 5'te kullanıcı prompt'uyla dar tutulmuş **B-29..B-31, B-62..B-69, B-78, B-84..B-86, B-104** + Sprint 3-5'ten devreden **B-83** + Sprint 7 devir **B-T08** + **cross-cutting calc↔serialize** + **Mimsoft fixture regresyon**.

9 atomik alt-commit planlandı: 8a.1 → 8a.9.

---

## Sprint 8a.1 — Plan kopyası + f12 rename + B-T08/B-104 atomik

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.1: Plan + f12 rename + B-T08/B-104 nationalityId TCKN validator`

### Yapılanlar

1. **`audit/sprint-08a-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/eager-discovering-teacup.md` kopyalandı (feedback memory: plan kopya pattern'i).
2. **`audit/sprint-08a-implementation-log.md`** — bu dosya, iskelet oluşturuldu.
3. **F12 fixture rename:** `f12_ihrachkayitli-702.xml.xml` → `f12-ihrackayitli-702.xml` (çift `.xml` uzantısı + alt çizgi + `ihrach` yazım hatası düzeltildi). Dosya henüz git tracked değildi, `mv` ile taşındı.

### B-T08 + B-104 Atomik Güncelleme

**Bulgu kaynağı:** FIX-PLANI-v3 §1043-1047 (B-104) + §1115-1118 (B-T08 test'in yanlış davranışı onaylaması).

**Kararlar:**
- B-104: Skill §7.1 "NationalityID = TCKN" gereği `DriverPerson.nationalityId` 11-hane numeric format kontrolü eklendi.
- B-T08: 8 test lokasyonunda `nationalityId: 'TR'` (2 karakter ISO kodu) → `nationalityId: '12345678901'` (11-hane TCKN).

**Kod değişiklikleri:**

1. **`src/config/constants.ts`** — `TCKN_REGEX = /^\d{11}$/` ve `VKN_REGEX = /^\d{10}$/` sabitleri eklendi (M7 config-derived pattern; sonraki Sprint 8a paketlerinde (Paket A — B-62/B-63/B-69) tekrar kullanılacak).

2. **`src/validators/despatch-validators.ts:9`** — import satırına `TCKN_REGEX` eklendi.

3. **`src/validators/despatch-validators.ts:118-124`** — `dp.nationalityId` kontrolü genişletildi:
   ```ts
   if (!isNonEmpty(dp.nationalityId)) {
     errors.push(missingField(..., 'Sürücü TCKN (nationalityId) zorunludur'));
   } else if (!TCKN_REGEX.test(dp.nationalityId)) {
     // B-104: Skill §7.1 — NationalityID = TCKN (11-hane numeric), 'TR' ISO kodu reddedilir
     errors.push(invalidFormat(..., '11-hane TCKN', dp.nationalityId));
   }
   ```

4. **Test fixture güncellemeleri (8 lokasyon, 4 dosya):**
   - `__tests__/builders/despatch-builder.test.ts` — 5 satır (43, 217, 218, 245, 247)
   - `__tests__/builders/despatch-extensions.test.ts` — 1 satır (42)
   - `__tests__/serializers/sequence.test.ts` — 1 satır (180)
   - `__tests__/validators/despatch-validators-o3o4o7.test.ts` — 1 satır (42) — helper `createValidDespatchInput`

5. **Yeni testler (`despatch-validators-o3o4o7.test.ts` sonuna):**
   - `B-104: geçerli 11-hane TCKN kabul eder` (positive)
   - `B-104: nationalityId="TR" (ISO kodu) reddedilir` (negative — `INVALID_FORMAT` kodu)

### Test Durumu

- Başlangıç: 573/573 yeşil (35 dosya)
- Son: **575/575 yeşil** (35 dosya, +2 test)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `src/config/constants.ts` — +6 satır (TCKN_REGEX + VKN_REGEX)
- `src/validators/despatch-validators.ts` — +4 satır (import genişletme + format check)
- 4 test dosyası — 8 satır değişti (TR → 12345678901)
- `__tests__/validators/despatch-validators-o3o4o7.test.ts` — +26 satır (1 describe + 2 it)
- `audit/sprint-08a-plan.md` — yeni dosya (plan kopyası)
- `audit/sprint-08a-implementation-log.md` — yeni dosya (iskelet + 8a.1 bölümü)
- `__tests__/fixtures/mimsoft-real-invoices/f12-ihrackayitli-702.xml` — rename (`f12_ihrachkayitli-702.xml.xml` → `f12-ihrackayitli-702.xml`)

### Disiplin Notları

- **M7 config-derived:** TCKN_REGEX ve VKN_REGEX constants'a eklendi — sonraki paketlerde tekrar kullanılacak.
- **Atomik güncelleme:** validator + 8 test lokasyonu + 2 yeni test tek commit'te.
- **F12 rename:** Dosya henüz git'te tracked değildi, `mv` ile temiz ada taşındı (git mv değil). İlk commit bu sprintte.
- **f13-f17 untracked:** Bu commit'te eklenmiyor — Paket G (Sprint 8a.8) Mimsoft fixture regresyon suite'inde eklenecekler.

---

## Sprint 8a.2 — Paket A: Common Validators (B-62/63/64/65/68/69)

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.2: Paket A common validators (B-62/63/64/65/68/69)`

### Kapsam

| Bulgu | Kapsamı | Schematron ref |
|-------|---------|----------------|
| **B-62** | 1460415308 VKN (TaxFreeInvoice) profil cross-check | CommonSchematron:275-277 |
| **B-63** | 7750409379 VKN (SGK) tip cross-check | CommonSchematron:508-510 |
| **B-64** | ExchangeRate.calculationRate format aktif | CommonSchematron:190 |
| **B-65** | IssueDate aralık (2005 ↔ bugün) | CommonSchematron:169-170 |
| **B-68** | ProfileID runtime whitelist (InvoiceProfileId enum) | CommonSchematron:147 |
| **B-69** | additionalIdentifiers schemeID whitelist (`validateParty` içinde) | CommonSchematron:250-251 |

### Kod Değişiklikleri

1. **`src/config/special-vkn-config.ts`** — yeni dosya (M7 config-derived pattern):
   - `TAXFREE_SPECIAL_VKN = '1460415308'` + `TAXFREE_ALLOWED_PROFILES` (YOLCU/IHRACAT/OZELFATURA/KAMU)
   - `SGK_SPECIAL_VKN = '7750409379'` + `SGK_ALLOWED_TYPES` (SGK/TEVKIFAT)

2. **`src/validators/common-validators.ts`** değişiklikleri:
   - Import genişletmesi: `EXCHANGE_RATE_REGEX`, `PARTY_IDENTIFICATION_SCHEME_IDS`, `special-vkn-config.ts`, `InvoiceProfileId`, `InvoiceTypeCode`
   - Modül sabiti: `ISSUE_DATE_MIN = '2005-01-01'`
   - **B-68:** ProfileID whitelist — `Object.values(InvoiceProfileId).includes(...)` runtime check
   - **B-65:** DATE_REGEX sonrası ISO string range kontrolü (bugün `new Date().toISOString().slice(0,10)`)
   - **B-64:** ExchangeRate varsa `calculationRate` sayı + pozitif + finite + `EXCHANGE_RATE_REGEX.test(String(rate))`
   - **B-62+B-63:** `validateSpecialVKN(input)` helper `validateParty` çağrılarından sonra
   - **B-69:** `validateParty` içinde `additionalIdentifiers?.forEach` → schemeID whitelist

### Test Değişiklikleri

`__tests__/validators/common-validators.test.ts` sonuna 6 yeni describe bloğu (+14 test):
- **B-65 IssueDate aralık** — 2004-12-31 reddet, 2099-01-01 reddet, 2005-01-01 kabul (3)
- **B-68 ProfileID whitelist** — INVALIDPROFILE reddet, TICARIFATURA kabul (2)
- **B-64 ExchangeRate format** — 7 ondalık reddet, negatif reddet, 6 ondalık kabul (3)
- **B-62 TaxFreeInvoice VKN** — 1460415308+TEMELFATURA reddet, 1460415308+YOLCU kabul (2)
- **B-63 SGK VKN** — 7750409379+SATIS reddet, 7750409379+SGK kabul (2)
- **B-69 schemeID whitelist** — INVALIDSCHEME reddet, MUSTERINO kabul (2)

### Test Durumu

- Başlangıç (8a.1 sonu): 575 / 575 yeşil (35 dosya)
- Son (8a.2 kapanışı): **589 / 589 yeşil** (35 dosya, +14)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `src/config/special-vkn-config.ts` — yeni dosya (26 satır)
- `src/validators/common-validators.ts` — +45 satır (B-68 whitelist, B-65 aralık, B-64 format, B-62/63 helper, B-69 schemeID)
- `__tests__/validators/common-validators.test.ts` — +127 satır (6 describe, 14 test)

### Disiplin Notları

- **M7 config-derived:** Özel VKN'ler magic number değil; `special-vkn-config.ts` sabitleri.
- **B-65 tarih karşılaştırması:** ISO format string karşılaştırması yeterli (`'2005-01-01' <= input.issueDate <= today`); `new Date()` parse → timezone riski yerine string compare tercih edildi.
- **B-64 Exchange rate:** Sayı türünde geldiği için `String(rate)` ile regex. 7+ ondalık IEEE754 float'ta kaybolabilir; regex temel koruma.
- **Validator çağrı sırası:** `validateSpecialVKN` party validasyonlarından SONRA çağrıldı — VKN format geçersizse önce B-62/B-63 yerine `validateParty` hatasını al.

**Not (plan sapması):** `git add __tests__/` kullanımı nedeniyle f13-f17 Mimsoft fixture'ları da bu commit'te git'e eklendi (plan'da Paket G — Sprint 8a.8 içindi). İçerik değişmedi, sadece tracking zamanı kaydı; Paket G yalnızca regresyon testleri yazacak, fixture rename/ekleme adımı artık gereksiz.

---

## Sprint 8a.3 — Paket B.1: Type + Profile validators (B-29/30/31)

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.3: Paket B.1 type/profile validators (B-29/30/31)`

### Kapsam

| Bulgu | Kapsamı | Schematron ref |
|-------|---------|----------------|
| **B-29** | IHRACAT satır PriceAmount + LineExtensionAmount > 0 zorunlu | CommonSchematron:404-406 |
| **B-30** | WithholdingTaxTotal ters yön — izinli tipler dışında yasak | CommonSchematron:289 |
| **B-31** | IADE grubu InvoiceDocumentReference.documentTypeCode='IADE' zorunlu | CommonSchematron:358 |

### Kod Değişiklikleri

1. **`src/validators/type-validators.ts`**:
   - Import: `WITHHOLDING_ALLOWED_TYPES` eklendi
   - **B-30:** `validateByType` içinde `withholdingTaxTotals` varsa `WITHHOLDING_ALLOWED_TYPES.has(typeCode)` kontrolü
   - **B-31:** `validateIadeGroup` içinde `ref.documentTypeCode` zorunlu + değer `'IADE'` kontrolü

2. **`src/validators/profile-validators.ts`**:
   - **B-29:** `validateIhracat` satır loop'una `priceAmount > 0` ve `lineExtensionAmount > 0` kontrolü

### Test Değişiklikleri

1. **`__tests__/builders/invoice-builder.test.ts:217`** — IADE test fixture'ına `documentTypeCode: 'IADE'` eklendi (B-31 regresyon uyumu).

2. **`__tests__/validators/type-profile-b29-b30-b31.test.ts`** — yeni dosya (+7 test):
   - B-30 (2): SATIS+withholding reddet, SGK+withholding kabul
   - B-31 (3): documentTypeCode yok reddet, 'DIGER' reddet, 'IADE' kabul
   - B-29 (2): priceAmount=0 reddet, lineExtensionAmount=0 reddet

### Test Durumu

- Başlangıç (8a.2 sonu): 589 / 589 yeşil (35 dosya)
- Son (8a.3 kapanışı): **596 / 596 yeşil** (36 dosya, +7)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `src/validators/type-validators.ts` — +15 satır (B-30 ters yön, B-31 documentTypeCode)
- `src/validators/profile-validators.ts` — +12 satır (B-29 amount kontrolü)
- `__tests__/builders/invoice-builder.test.ts` — 1 satır (documentTypeCode fixture güncelleme)
- `__tests__/validators/type-profile-b29-b30-b31.test.ts` — yeni dosya (140 satır)

### Disiplin Notları

- **`WITHHOLDING_ALLOWED_TYPES` yeniden kullanım:** Bu sabit constants.ts'de zaten vardı (77-81); B-30 yeni bir set oluşturmadı, mevcut M7 config'i kullandı.
- **B-31 mevcut kod regresyonu:** `simple-invoice-mapper.ts:442-455` `buildBillingReference` zaten `documentTypeCode` üretir (isIadeGroup bazlı otomatik); manuel builder path'inde test fixture güncelleme gerekti.
- **B-29 kapsam sınırı:** Sadece IHRACAT profili için uygulandı. YOLCUBERABERFATURA/OZELFATURA için Schematron ayrı kural önermedi; B-T78'de genel satır amount kontrolü Paket B.2'de ele alınacak.

---

## Sprint 8a.4 — Paket B.2: B-67 + B-78 (YTB CalcSeqNum + validateInvoiceState)

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.4: Paket B.2 YTB CalcSeq + invoice-rules Schematron paraleli`

### Kapsam

| Bulgu | Kapsamı | Schematron ref |
|-------|---------|----------------|
| **B-67** | YTB ISTISNA satır KDV subtotal `calculationSequenceNumeric=-1` zorunlu | CommonSchematron:467-469 |
| **B-78** | `validateInvoiceState` 5 Schematron paraleli UI uyarısı eksik | FIX-PLANI-v3 §805-810 |

### Kod Değişiklikleri

1. **`src/validators/profile-validators.ts` — `validateYatirimTesvikRules`:**
   - ISTISNA satır loop'unda `line.taxTotal?.taxSubtotals?.find(ts => ts.taxTypeCode === '0015')` bulup `calculationSequenceNumeric === -1` kontrolü.
   - `undefined` veya `0` gibi değerler reddedilir.

2. **`src/calculator/invoice-rules.ts` — `validateInvoiceState`:**
   - State input tipine 7 yeni opsiyonel flag eklendi (`allowReducedKdvRate`, `ytbAllKdvPositive`, `hasGtip`, `hasAliciDibKod`, `has4171Code`, `ihracatPartyComplete`, `yolcuBuyerComplete`).
   - 5 yeni warning:
     - **B-78.1:** 555 kodu + `allowReducedKdvRate=false` → hata (M4 bypass gerekli)
     - **B-78.2:** YATIRIMTESVIK + `ytbAllKdvPositive=false` → hata (B-08 paraleli)
     - **B-78.3:** IHRACKAYITLI+702 + `hasGtip=false` veya `hasAliciDibKod=false` → hata (B-07 paraleli, 2 uyarı)
     - **B-78.4:** `has4171Code=true` + tip ∉ {TEVKIFAT, IADE, SGK, YTBIADE} → hata
     - **B-78.5:** IHRACAT+`ihracatPartyComplete=false` veya YOLCU+`yolcuBuyerComplete=false` → hata (2 uyarı)

**Not:** `invoice-session.ts` caller bu yeni flag'ları opsiyonel olarak kullanabilir; mevcut çağrım bozulmaz (tüm flag'lar undefined kalabilir, yalnızca açıkça `false` verilirse warning üretir — `=== false` strict karşılaştırma).

### Test Değişiklikleri

**`__tests__/validators/b67-b78-invoice-rules.test.ts`** — yeni dosya (+12 test):
- **B-67 (3):** calcSeq yok/0 reddet, -1 kabul
- **B-78.1 (2):** 555+false reddet, 555+true kabul
- **B-78.2 (1):** YATIRIMTESVIK + ytbAllKdvPositive=false reddet
- **B-78.3 (2):** GTİP eksik reddet, ALICIDIBSATIRKOD eksik reddet
- **B-78.4 (2):** 4171+SATIS reddet, 4171+TEVKIFAT kabul
- **B-78.5 (2):** IHRACAT+ihracatPartyComplete=false reddet, YOLCU+yolcuBuyerComplete=false reddet

### Test Durumu

- Başlangıç (8a.3 sonu): 596 / 596 yeşil (36 dosya)
- Son (8a.4 kapanışı): **608 / 608 yeşil** (37 dosya, +12)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `src/validators/profile-validators.ts` — +10 satır (B-67 calcSeq kontrolü)
- `src/calculator/invoice-rules.ts` — +50 satır (B-78 state genişletme + 5 warning bloğu)
- `__tests__/validators/b67-b78-invoice-rules.test.ts` — yeni dosya (137 satır)

### Disiplin Notları

- **B-78 strict-false pattern:** Flag'lar `=== false` ile karşılaştırılır, `undefined`/`null` değerler warning üretmez. Mevcut `invoice-session.ts` caller bu flag'ları göndermediği için regresyon olmaz; UI kademeli olarak flag'ları eklediğinde warning'ler aktif olur.
- **B-67 tekil subtotal:** YTB ISTISNA satırında birden fazla KDV subtotal olabilir mi? Schematron tek `cac:TaxSubtotal` bekliyor; `find` tek match yeterli. Multi-subtotal senaryoları Sprint 8a kapsamında değil.
- **validateInvoiceState caller uyumu:** `invoice-session.ts:514-528` caller değiştirilmedi — yeni flag'lar opsiyonel ve UI katmanı (edocument-service vb.) gönder/gönderme özgürlüğüne sahip.

---

## Sprint 8a.5 — Paket C: Despatch validators (B-66 + B-85)

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.5: Paket C despatch B-66 MATBUDAN + B-85 CarrierParty`

### Kapsam Bulgusu

Sprint 7 devir listesinde Paket C'ye giriş: **B-66, B-84, B-85, B-86**. İnceleme sırasında tespit edildi:

| Bulgu | Durum | Neden |
|-------|-------|-------|
| **B-84** DespatchLineId numeric | ✅ Zaten yapılmış (Sprint 6) | `despatch-validators.ts:144` `/^\d+$/.test(line.id)` mevcut |
| **B-86** MATBUDAN + DocumentType='MATBU' | ✅ Zaten yapılmış (Sprint 6) | `despatch-validators.ts:162-168` `hasMatbu` kontrolü mevcut |
| **B-66** MATBUDAN ID+IssueDate dolu | ⏳ Bu sprint'te | Sadece liste boş-değilliği vardı |
| **B-85** CarrierParty VKN/TCKN + schemeID | ⏳ Bu sprint'te | CarrierParty için hiçbir validator yoktu |

Sprint 7 devir listesi B-84/B-86'yı tekrar işaretlemiş görünüyor ama kod zaten Sprint 6'daki O4/O7 commit'lerinde kapatılmış. Bu durum `sprint-06-implementation-log.md` ile paraleldir.

### Kod Değişiklikleri

1. **`src/validators/despatch-validators.ts`**:
   - Import: `CarrierPartyInput`, `VKN_REGEX`, `PARTY_IDENTIFICATION_SCHEME_IDS`, `invalidValue` eklendi
   - **B-66:** MATBUDAN additionalDocuments loop'una her item için `id` + `issueDate` non-empty + `DATE_REGEX.test(issueDate)` kontrolü
   - **B-85:** `shipment.carrierParty` varsa `validateCarrierParty(cp, path)` çağrısı (driver kontrolünden sonra)
   - Yeni export: `validateCarrierParty()` helper — VKN/TCKN format + `additionalIdentifiers.schemeID` whitelist (B-69 ile aynı set).

### Test Değişiklikleri

**`__tests__/validators/despatch-b66-b85.test.ts`** — yeni dosya (+9 test):
- **B-66 (4):** id boş reddet, issueDate boş reddet, issueDate invalid format reddet, geçerli MATBUDAN kabul
- **B-85 (5):** VKN 9-hane reddet, TCKN 10-hane reddet, invalid schemeID reddet, geçerli carrierParty kabul, `validateDespatch` üzerinden regression

### Test Durumu

- Başlangıç (8a.4 sonu): 608 / 608 yeşil (37 dosya)
- Son (8a.5 kapanışı): **617 / 617 yeşil** (38 dosya, +9)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `src/validators/despatch-validators.ts` — +38 satır (B-66 loop + B-85 validateCarrierParty helper + call)
- `__tests__/validators/despatch-b66-b85.test.ts` — yeni dosya (109 satır)

### Disiplin Notları

- **B-85 helper ayrı:** `CarrierPartyInput` `PartyInput`'tan farklı (adres alanları yok), bu yüzden `validateParty` yerine ayrı `validateCarrierParty` helper. Aynı PARTY_IDENTIFICATION_SCHEME_IDS seti kullanılır (B-69 ile paralel).
- **B-84/B-86 devir keşfi:** Sprint 7 devir listesi bu iki bulguyu tekrar işaretlemiş ama Sprint 6'da zaten kapatılmışlar. Log'da net belirtildi; kod değişikliği gereksiz.
- **M7 uyum:** TCKN_REGEX / VKN_REGEX constants'da (Sprint 8a.1'de eklenmişti), PARTY_IDENTIFICATION_SCHEME_IDS constants'da (Sprint 2'de eklenmişti). Yeni magic değer/set oluşturulmadı.

---

## Sprint 8a.6 — Paket D: B-83 KAMU BuyerCustomer PartyIdentification

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.6: Paket D B-83 KAMU BuyerCustomer additionalIdentifiers serializer`

### Kapsam

| Bulgu | Schematron ref |
|-------|----------------|
| **B-83** (FIX-PLANI-v3 §852-857) | Denetim 05 §6.6 (O11) — KAMU aracı kurum PartyIdentification atanmıyor |

Bulgu Sprint 5'te "serializer tema uyumsuz" gerekçesiyle ertelenmişti. AR-1 (`cbcRequiredTag`/`cbcOptionalTag` split, Sprint 3) sonrası serializer yolları temizlendi — bu sprint'te mapping + serializer emit açıkça yapıldı, yeni tema gerekmedi (plan R1 notu teyit).

### Kod Değişiklikleri

1. **`src/calculator/simple-types.ts`**:
   - `SimpleBuyerCustomerInput` arayüzüne yeni opsiyonel alan: `identifications?: Array<{ schemeId: string; value: string; }>`.
   - JSDoc: KAMU aracı kurum MUSTERINO/MERSISNO, IHRACAT ek tanımlayıcı vb. schemeId PARTY_IDENTIFICATION_SCHEME_IDS ile kontrol edilir (B-69 downstream).

2. **`src/calculator/simple-invoice-mapper.ts` — `buildBuyerCustomer`:**
   - `bc.identifications` dolu ise `result.party.additionalIdentifiers` olarak eşlendi (schemeId + value copy).

3. **`src/serializers/party-serializer.ts` — `serializeBuyerCustomerParty`:**
   - VKN/TCKN PartyIdentification emit'inden SONRA `party.additionalIdentifiers` loop'u eklendi (normal `serializePartyBlock` patterni ile birebir).
   - Output: her ek tanımlayıcı için ayrı `<cac:PartyIdentification><cbc:ID schemeID="X">Y</cbc:ID></cac:PartyIdentification>` bloğu.

### Test Değişiklikleri

**`__tests__/calculator/simple-invoice-mapper.test.ts`** — B-83 describe bloğu eklendi (+3 test):
- **identifications yok → additionalIdentifiers undefined** (default davranış korundu)
- **KAMU + 2 identification → mapper 2 ek tanımlayıcı dolduruyor** (MUSTERINO + MERSISNO)
- **E2E XML çıktı kontrolü** — `schemeID="MUSTERINO"` ve değer XML'de görünüyor

### Test Durumu

- Başlangıç (8a.5 sonu): 617 / 617 yeşil (38 dosya)
- Son (8a.6 kapanışı): **620 / 620 yeşil** (38 dosya, +3)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `src/calculator/simple-types.ts` — +7 satır (yeni opsiyonel alan + JSDoc)
- `src/calculator/simple-invoice-mapper.ts` — +7 satır (identifications → additionalIdentifiers map)
- `src/serializers/party-serializer.ts` — +9 satır (additionalIdentifiers emit loop)
- `__tests__/calculator/simple-invoice-mapper.test.ts` — +42 satır (B-83 describe + 3 test)

### Disiplin Notları

- **Serializer pattern tutarlılığı:** `serializePartyBlock` (normal party) zaten Sprint 2'den beri `additionalIdentifiers` emit ediyordu (line 26-32); `serializeBuyerCustomerParty` bu kod patterni ile birebir aynı yapıldı. İki yol artık `additionalIdentifiers` emit konusunda senkronize.
- **Sprint 5 ertelenme gerekçesi ("serializer tema uyumsuz") çözüldü:** AR-1 sonrası `cbcOptionalTag({ schemeID })` çağrısı mevcut pattern'e oturdu; yeni tema açılmadı.
- **Ad karşılığı (`identifications` vs `additionalIdentifiers`):** SimpleInvoiceInput DTO tarafında kullanıcı dostu "identifications" ismi; InvoiceInput core tipinde UBL-TR resmi ismi "additionalIdentifiers" korundu. Mapper isim çevirisi yapar.

---

## Sprint 8a.7 — Paket F: calc↔serialize round-trip integration

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.7: Paket F calc↔serialize round-trip integration`

### Kapsam

Plan'daki cross-cutting integration test: `calculateDocument() → mapSimpleToInvoiceInput() → serialize()` zincirinde monetary tutarların XML çıktısıyla eşitliğini doğrular (M9 yuvarlama disiplini).

### Kod Değişiklikleri

**Hiç.** Yalnızca yeni test dosyası.

### Test Değişiklikleri

**`__tests__/integration/calc-serialize-roundtrip.test.ts`** — yeni dosya (+3 test, yeni klasör):
- **Senaryo 1:** SATIS + KDV (2 satır, %20 + %10) — `LineExtensionAmount/TaxInclusive/Payable` XML ↔ calc eşitlik.
- **Senaryo 2:** SATIS + stopaj %23 (f10 pattern) — `PayableAmount=14550` (15000+3000-3450).
- **Senaryo 3:** Çoklu KDV oranı (f13 YTB pattern) — `TaxInclusive=560` (500+20+40).

**Extract helper'ları:**
- `extractAmount(xml, tag)`: regex `<cbc:${tag}[^>]*>([-\d.]+)</cbc:${tag}>` ile ilk match
- `extractAllAmounts(xml, tag)`: tüm match'ler array

**Assertion patterni:** `toBeCloseTo(calc.monetary.X, 2)` — float disiplini (Sprint 7.3 B-T07 patterni).

**Not:** SimpleInvoiceBuilder `returnCalculation: true` opsiyonuyla çağrıldı — `result.calculation.monetary` erişimi bu flag olmadan undefined.

### Test Durumu

- Başlangıç (8a.6 sonu): 620 / 620 yeşil (38 dosya)
- Son (8a.7 kapanışı): **623 / 623 yeşil** (39 dosya, +3)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `__tests__/integration/calc-serialize-roundtrip.test.ts` — yeni dosya (108 satır)
- Yeni klasör: `__tests__/integration/`

### Disiplin Notları

- **Regex-tabanlı XML extract:** Harici parser (fast-xml-parser vb.) dep eklenmedi; regex'le monetary extract yeterli. Sprint 7 B-T07 `toBeCloseTo(val, 2)` patterni korundu.
- **Mimsoft fixture kullanımı:** Senaryo 2/3 f10/f13 sayısal pattern'lerini kullanır; gerçek XML fixture'larıyla tam round-trip Paket G'de (Sprint 8a.8) yapılacak.
- **returnCalculation flag'i:** `SimpleInvoiceBuilder` default `false`; test'lerde `true` geçildi. Production kullanımı bu flag'i opsiyonel bırakır (minimal XML-only output).

---

## Sprint 8a.8 — Paket G: Mimsoft fixture regresyon suite

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.8: Paket G Mimsoft f12-f17 structural+monetary regresyon`

### Kapsam

6 yeni Mimsoft üretim fixture'ı (f12-f17) için yapısal + monetary invariant testleri. Fixture'lar üretim snapshot'ı olarak korunur; testler bu snapshot'ların beklenen alanlarını içerdiğini doğrular (ileride fixture güncellemesi bu assertion'ların aktif failure vermesini sağlar).

### Fixture Kullanım Özeti

| Fixture | Profil | Tip | Ana invariant |
|---------|--------|-----|---------------|
| **f12** | TEMELFATURA | IHRACKAYITLI | 702 + GTİP 12-hane + ALICIDIBSATIRKOD 11-hane + PayableAmount=100 |
| **f13** | YATIRIMTESVIK | SATIS | ItemClass=01, YTBNO=123123, PayableAmount=560 |
| **f14** | YATIRIMTESVIK | SATIS | ItemClass=02, PayableAmount=560 |
| **f15** | TEMELFATURA | SATIS | ReasonCode=351, PayableAmount=100 (KDV=0) |
| **f16** | TEMELFATURA | SGK | AccountingCost=SAGLIK_ECZ, 3 AddDocRef (MUKELLEF_*), PayableAmount=120 |
| **f17** | KAMU | SATIS | TR IBAN, VKN=5230531548, PayableAmount=17220.00 |

### Test Değişiklikleri

**`__tests__/calculator/mimsoft-f12-f17.test.ts`** — yeni dosya (+16 test):
- Her fixture için 2-3 describe blok içinde: ProfileID/TypeCode/kritik alan + monetary + senaryo-spesifik detay

**Helper:**
- `loadFixture(name)`: `__tests__/fixtures/mimsoft-real-invoices/`'ten okuma
- `extract(xml, tag)`: tek regex match
- `extractAll(xml, tag)`: tüm match'ler

**F10/F11 regresyon:** Mevcut `mimsoft-stopaj.test.ts` korunur (f10/f11 calculator-level).

### Test Durumu

- Başlangıç (8a.7 sonu): 623 / 623 yeşil (39 dosya)
- Son (8a.8 kapanışı): **639 / 639 yeşil** (40 dosya, +16)
- TypeScript strict: temiz

### Değişiklik İstatistikleri

- `__tests__/calculator/mimsoft-f12-f17.test.ts` — yeni dosya (145 satır, 16 test)

### Disiplin Notları

- **Snapshot yaklaşımı:** Fixture'lar bizim builder'ın ürettiği değil, Mimsoft üretim çıktısı. Test'ler fixture'da beklenen değerleri kontrol eder — eğer fixture gelecekte değişirse bu test'ler uyarır.
- **Builder round-trip kapsam dışı:** Fixture'ların birebir builder karşılığını oluşturmak Sprint 8a kapsamını aşar; Paket F (calc↔serialize round-trip) sayısal patterni kullandı. Tam builder → XML karşılaştırması post-v2.0.0'a ertelendi.
- **F12 rename eşleşmesi:** Sprint 8a.1'de `f12_ihrachkayitli-702.xml.xml` → `f12-ihrackayitli-702.xml` rename'i bu test'lerde doğru ismin kullanılmasını sağladı.
- **F10/F11 duplikasyon yok:** Mevcut `mimsoft-stopaj.test.ts` calculator-level, `f12-f17.test.ts` structural — farklı katmanlar.

---

## Sprint 8a.9 — Paket H: Oportunistik + log finalize + Sprint 8b devir

**Tarih:** 2026-04-23
**Commit hedef başlığı:** `Sprint 8a.9: Paket H SGK/YOLCU coverage + log finalize + Sprint 8b devir`

### Kapsam

Plan Paket H opsiyoneldi. Sprint 7.2'de kapsam dışı bırakılan iki durum için minimum coverage:
- SGK `InvoiceTypeCode` + default profil tespiti
- YOLCUBERABERFATURA profili ISTISNA tipi override

### Test Değişiklikleri

**`__tests__/calculator/document-calculator.test.ts`** — `profil tespiti` describe'ına 2 yeni test:
- `Paket H: SGK tipi + default profil TEMELFATURA` — SGK sadece TEMELFATURA'da izinli
- `Paket H: YOLCUBERABERFATURA profili ISTISNA tipi ile override (M2)` — M2 kuralı coverage

**Plan sapması:** Plan "default profil TICARIFATURA" demişti; gerçek `PROFILE_TYPE_MATRIX`'e göre SGK sadece TEMELFATURA'da izinli (f16 fixture'ı da TEMELFATURA). Test expectation düzeltildi.

### Test Durumu

- Başlangıç (8a.8 sonu): 639 / 639 yeşil (40 dosya)
- Son (8a.9 kapanışı): **641 / 641 yeşil** (40 dosya, +2)
- TypeScript strict: temiz

---

## Sprint 8a Kapanış Özeti

### Test Büyümesi

| Sprint | Test Δ | Toplam | Açıklama |
|--------|--------|--------|----------|
| 8a.1 | +2 | 575 | Plan kopyası + f12 rename + B-T08/B-104 atomik |
| 8a.2 | +14 | 589 | Paket A — common validators (B-62/63/64/65/68/69) |
| 8a.3 | +7 | 596 | Paket B.1 — type/profile (B-29/30/31) |
| 8a.4 | +12 | 608 | Paket B.2 — YTB CalcSeq (B-67) + invoice-rules (B-78) |
| 8a.5 | +9 | 617 | Paket C — despatch (B-66/B-85, B-84/86 zaten kapalı) |
| 8a.6 | +3 | 620 | Paket D — KAMU BuyerCustomer additionalIdentifiers (B-83) |
| 8a.7 | +3 | 623 | Paket F — calc↔serialize round-trip integration |
| 8a.8 | +16 | 639 | Paket G — Mimsoft f12-f17 structural+monetary |
| 8a.9 | +2 | **641** | Paket H — SGK/YOLCU coverage + log finalize |
| **Toplam** | **+68** | — | Plan hedef +59..+68 aralığında, maksimumda |

### Kapatılan Bulgular (16 total)

| ID | Açıklama | Paket |
|----|----------|-------|
| **B-T08** | 8 test lokasyonunda nationalityId: 'TR' → '12345678901' | 8a.1 |
| **B-104** | DriverPerson.nationalityId 11-hane TCKN validator | 8a.1 |
| **B-62** | 1460415308 VKN (TaxFreeInvoice) profil cross-check | 8a.2 |
| **B-63** | 7750409379 VKN (SGK) tip cross-check | 8a.2 |
| **B-64** | ExchangeRate.calculationRate format aktif | 8a.2 |
| **B-65** | IssueDate aralık kontrolü (2005 ↔ bugün) | 8a.2 |
| **B-68** | ProfileID runtime whitelist (InvoiceProfileId) | 8a.2 |
| **B-69** | additionalIdentifiers schemeID whitelist | 8a.2 |
| **B-29** | IHRACAT satır PriceAmount/LineExtensionAmount > 0 | 8a.3 |
| **B-30** | WithholdingTaxTotal ters yön (izinli tipler dışı yasak) | 8a.3 |
| **B-31** | IADE grubu DocumentTypeCode='IADE' zorunlu | 8a.3 |
| **B-67** | YTB ISTISNA satır calculationSequenceNumeric=-1 | 8a.4 |
| **B-78** | validateInvoiceState 5 Schematron paraleli uyarı | 8a.4 |
| **B-66** | MATBUDAN AdditionalDocument ID+IssueDate dolu | 8a.5 |
| **B-85** | CarrierParty VKN/TCKN format + schemeID whitelist | 8a.5 |
| **B-83** | KAMU BuyerCustomer additionalIdentifiers emit | 8a.6 |

### Keşifler / Plan Sapmaları

1. **B-84 ve B-86 zaten kapatılmış (Sprint 6):** Sprint 7 devir listesi yanlışlıkla bu ikisini tekrar işaretlemiş; Sprint 8a.5'te keşfedildi, kod değişikliği gerekmedi.
2. **B-91 post-v2.0.0'a ertelendi:** FIX-PLANI-v3 §925-930 "serializer hardcode → risk yok" gerekçesi netliğiyle plan'dan çıkarıldı.
3. **f13-f17 fixture tracking:** `git add __tests__/` kullanımı nedeniyle Sprint 8a.2'de erken eklendiler (plan'da 8a.8 içindi). İçerik değişmedi, log'a not düşüldü.
4. **Sprint 8a.9 SGK default profil:** Plan "TICARIFATURA" demişti; gerçek matris SGK'yı sadece TEMELFATURA'da izinli gösterdi (f16 fixture ile paralel). Test düzeltildi.

### Mimari Karar Etkisi

**Sprint 8a yeni M/AR kararı gerektirmedi.** M1-M10 + AR-1..AR-8 hepsi stabil kaldı:
- AR-1 (`cbcRequired/cbcOptional` split) — B-83 çözümünde rol aldı; mapper/serializer yolu temiz.
- M7 (config-derived) — B-62/B-63 özel VKN'ler `special-vkn-config.ts`'de; TCKN_REGEX/VKN_REGEX `constants.ts`'de.
- M4 (555 flag) — B-78.1 uyarısı mevcut flag'i kullandı.
- B-83 Sprint 5'teki "serializer tema uyumsuz" gerekçesi AR-1 sonrası ortadan kalkmış bulundu; yeni tema açılmadı.

### `src/` Değişiklikleri Özeti

| Dosya | Sprint | Değişiklik |
|-------|--------|------------|
| `src/config/constants.ts` | 8a.1 | TCKN_REGEX + VKN_REGEX eklendi |
| `src/config/special-vkn-config.ts` | 8a.2 | Yeni dosya — TAXFREE/SGK özel VKN matrisleri |
| `src/calculator/simple-types.ts` | 8a.6 | SimpleBuyerCustomerInput.identifications alanı |
| `src/calculator/simple-invoice-mapper.ts` | 8a.6 | identifications → party.additionalIdentifiers eşleme |
| `src/calculator/invoice-rules.ts` | 8a.4 | validateInvoiceState 7 yeni flag + 5 warning |
| `src/serializers/party-serializer.ts` | 8a.6 | serializeBuyerCustomerParty additionalIdentifiers emit |
| `src/validators/common-validators.ts` | 8a.2 | B-62/63/64/65/68/69 kuralları |
| `src/validators/despatch-validators.ts` | 8a.1, 8a.5 | B-104 + B-66 + B-85 (validateCarrierParty export) |
| `src/validators/profile-validators.ts` | 8a.3, 8a.4 | B-29 IHRACAT amount + B-67 YTB CalcSeq |
| `src/validators/type-validators.ts` | 8a.3 | B-30 ters yön + B-31 documentTypeCode |

---

## Sprint 8b Devir Listesi (Dokümantasyon + Release)

Sprint 8a kod değişikliklerini kilitledi. Sprint 8b yalnızca doküman + release operasyonu:

### Dokümantasyon
- **B-92** — `examples/output/*.xml` regenerate (Sprint 1-8a tüm src değişikleri sonrası)
- **B-93** — `ublExtensionsPlaceholder` dead code + test cleanup (varsa)
- **B-94** — `examples/README.md` + workflow doc
- **B-95, B-96, B-102** — README Sorumluluk Matrisi güncelleme:
  - M3 (650 dinamik yüzde)
  - M4 (555 flag `allowReducedKdvRate`)
  - M9 (float calc + XML 2-basamak yuvarlama)
  - M10 (isExport=true → liability ignore)
- **B-S01..B-S05** — Skill doc güncellemeleri:
  - `kod-listeleri-ubl-tr-v1.42.md §4.9` — 650 iç çelişki + kütüphane yaklaşımı
  - `e-fatura-ubl-tr-v1.0.md §77` — Fatura + İrsaliye TR1.2

### Release
- **CHANGELOG.md** — Sprint 1-8a implementation-log'larını tek v2.0.0 entry'sine konsolide (Added/Changed/Removed/Fixed kategorileri)
- **package.json** — 1.4.2 → 2.0.0 bump
- **git tag v2.0.0** + origin/main push
- (Opsiyonel) Vitest coverage config + threshold

### Post-v2.0.0 Ertelenen

- **B-91** — UBLVersion/CustomizationID/CopyIndicator runtime (serializer hardcode → risk yok)
- **9015 vergi kodu** — kullanıcı iç teyit sonrası `tax-config.ts`'e
- **ÖTV İstisna 101-108** — documentType mimarisi revize
- **001 Konaklama Diplomatik İstisna** — KONAKLAMAVERGISI tipi
- **219, 307, 318 İsim güncellemeleri** — semantik değişim
- **Currency M7 full** — +38 kod
- **Payment Means M7 full** — UN/EDIFACT

### ACIK-SORULAR Durumu

Plan'da R7 olarak belirtilen 7 dış-teyit-bağlı soru (ACIK-SORULAR #3/#6/#15/#16/#18/#20/#24) Sprint 8a'yı bloke etmedi. Sprint 8b release öncesi kullanıcı bu sorular için Mimsoft/GİB teyidi alırsa, yanıtlar CHANGELOG notlarına veya post-v2.0.0 işlemlerine dönüşür.

---

## Sprint 8a Disiplin Notları (Geneltoplam)

- **Plan kopya pattern'i (feedback memory):** `audit/sprint-08a-plan.md` 8a.1 ilk commit'te oluşturuldu.
- **M7 config-derived:** Sprint 8a'da eklenen tüm sabitler `constants.ts` veya dedicated config dosyalarında; magic number yok.
- **Atomik alt-commit:** 9 atomik commit (8a.1 → 8a.9), her commit ayrı test bloku + log güncellemesi.
- **`src/` yazıldı:** Sprint 7 read-only kuralı Sprint 8a'da kaldırıldı; toplam 10 src dosyası değişti.
- **Test konsolidasyonu:** 5 yeni test dosyası + 3 mevcut test dosyası genişletildi. Sprint 7 testleri (35 dosya, 573 test) hepsi korundu.
- **N1 placeholder yasağı:** Tüm yeni test isimleri `B-XX:` veya `Paket N:` prefix'li açıklayıcı.
- **XSD vs runtime (feedback memory):** B-91 "XSD opsiyonel alanlara runtime zorunluluk yok" disiplinine uyarak ertelendi.
- **Mimari kilit:** M1-M10 + AR-1..AR-8 hepsi stabil — sprint sırasında hiçbir karar yeniden açılmadı.
