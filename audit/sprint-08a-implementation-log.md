---
sprint: 8a
baslik: Devir bulgu temizliği + Mimsoft fixture regresyon + Cross-cutting integration
tarih_basi: 2026-04-23
plan: audit/sprint-08a-plan.md
fix_plani: audit/FIX-PLANI-v3.md §243-246 (Sprint 5 devir listesi) + §805-810 (B-78) + §852-886 (B-83..B-86) + §1043-1047 (B-104)
onceki_sprint: audit/sprint-07-implementation-log.md (commit 566bd89)
sonraki_sprint: Sprint 8b (Dokümantasyon + Release + v2.0.0 tag)
toplam_commit: 0 (devam ediyor)
test_durumu_basi: 573 / 573 yeşil (35 dosya)
test_durumu_sonu: — (sprint devam ediyor)
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
