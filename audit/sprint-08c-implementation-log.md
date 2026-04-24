---
sprint: 8c
baslik: B-NEW-01..14 Hotfix Dalgası + v2.0.0 Stable Release
tarih_basi: 2026-04-24
tarih_sonu: 2026-04-XX
plan: audit/sprint-08c-plan.md
fix_plani: audit/FIX-PLANI-v3.md §319-388 (Sprint 8c bölümü + M11 + AR-9)
onceki_sprint: audit/sprint-08b-implementation-log.md (commit 076946e)
sonraki_sprint: v2.1.0 (AR-9 Reactive InvoiceSession implementation + skill repo manuel patch)
toplam_commit: 14 atomik alt-commit (8c.0 → 8c.13)
test_durumu_basi: 755 / 755 yeşil
test_durumu_sonu_hedef: ~884 / ~884 yeşil (+129 test)
---

## Kapsam (Sprint 8c Planından)

Sprint 8b tamamlandı (commit `076946e`): 38 senaryo + 114 test + README §8 Sorumluluk Matrisi + CHANGELOG v2.0.0 entry + skill doc patch referansı. 755/755 test yeşil. Kod dev-complete, ama **12 kalıntı bug (B-NEW-01..12)** keşfedildi ve `audit/b-new-audit.md`'ye tam dump edildi. 9 örnek senaryo (05, 07, 10, 16, 17, 20, 26, 31, 99) `validationLevel: 'basic'` workaround'unda.

**Sprint 8c birincil hedefi:** 14 bug (B-NEW-01..12 mevcut + B-NEW-13 YOLCU passport + B-NEW-14 IDIS ETIKETNO sprint 8c'de tanımlanır) hotfix dalgası; 9/9 workaround senaryo strict moda geçer; validator/calculator tam davranış.

**Sprint 8c ikincil hedefi:** M11 Self-exemption types mimari kararı + AR-9 Reactive InvoiceSession isim konulma (tasarım notu, kod yok) + CHANGELOG Sprint 8c alt-section + v2.0.0 release (package.json bump + git tag + npm publish + GitHub release notes).

**Sprint 8c kapsamı dışı:** Reactive InvoiceSession implementation (v2.1.0), UI feedback katmanı, skill repo commit otomasyonu (manuel uygulama).

**Berkay'ın 3 kritik direktifi (plan bel kemiği):**
1. **Manuel 351 politikası** — Calculator 351 otomatik atamaz; self-exemption olmayan tipte KDV=0 kalem için kullanıcıdan manuel zorunlu (validator enforce).
2. **Self-exemption tip listesi (M11)** — ISTISNA, IHRACKAYITLI, OZELMATRAH + IHRACAT, YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK profilleri.
3. **KDV=0 + tevkifat aynı kalemde → validation error.**

14 atomik alt-commit planlandı: 8c.0 → 8c.13.

---

## Sprint 8c.0 — Plan kopyası + log iskelet + FIX-PLANI işaretleme

**Tarih:** 2026-04-24
**Commit hedef başlığı:** `Sprint 8c.0: Plan kopyası + implementation log iskelet + FIX-PLANI M11/AR-9 işaretleme`

### Yapılanlar

1. **`audit/sprint-08c-plan.md`** — Plan Modu dosyası `/Users/berkaygokce/.claude/plans/sprint-8c-zazzy-kite.md` kopyalandı (feedback memory: plan kopya pattern'i).
2. **`audit/sprint-08c-implementation-log.md`** — bu dosya, iskelet + 8c.0 bölümü oluşturuldu.
3. **`audit/FIX-PLANI-v3.md` güncellemesi:**
   - **M11** başlığı eklendi (Mimari Kararlar §107-113 sonrası): Self-exemption tipleri config + validator gate.
   - **AR-9** başlığı eklendi (AR-1..AR-8 §49-81 sonrası): Reactive InvoiceSession tasarım notu (v2.1.0'a erteli).
   - **Sprint 8c bölümü** Sprint 8 notu altına eklendi (§319-324): 14 alt-commit + kapsanan bulgular + plan/log referansları.

### Değişiklik İstatistikleri

- `audit/sprint-08c-plan.md` — yeni dosya (plan kopyası, ~440 satır)
- `audit/sprint-08c-implementation-log.md` — yeni dosya (iskelet + 8c.0 bölümü)
- `audit/FIX-PLANI-v3.md` — M11 + AR-9 + Sprint 8c notu eklemesi

### Test Durumu

- Başlangıç: 755/755 yeşil
- Son: 755/755 yeşil (kod değişikliği yok, sadece audit/ dokümanları)

### Disiplin Notları

- **Plan kopya pattern'i** (memory `feedback_sprint_plan_pattern.md`): İlk alt-commit'te plan modu dosyası `audit/sprint-08c-plan.md`'ye kopyalandı.
- **`src/` read-only:** Bu commit'te kod dosyasına dokunulmadı.
- **Mimari karar yeni slot:** M11 ve AR-9 FIX-PLANI-v3.md'de Sprint 8c kapsamında açıldı; AR-9 yalnızca isim + tasarım notu (uygulama v2.1.0).

---

## Sprint 8c.1 — B-NEW-11 fix + M11 Self-exemption types + 555 cross-check

**Tarih:** 2026-04-24
**Commit:** `535ecd9`

### Yapılanlar

1. **Calculator 351 otomatik atamayı kaldırıldı (B-NEW-11 kök çözüm):**
   - `src/calculator/document-calculator.ts` — `DEFAULT_EXEMPTIONS.satis='351'` silindi; `resolveExemptionReason` sadeleşti. Self-exemption olmayan tiplerde (SATIS, TEVKIFAT, IADE, SGK, KOMISYONCU, ...) calculator istisna kodu üretmez; kullanıcı `input.kdvExemptionCode` vermediyse `kdv=null` kalır.
   - Self-exemption tiplerinde default fallback korundu (ISTISNA → '350', IHRACKAYITLI → '701').

2. **Mapper B-81 kaldırıldı + shouldAddExemption genişletildi:**
   - `src/calculator/simple-invoice-mapper.ts` — Eski "TEVKIFAT+351 XML'e yaz" özel satırı silindi (gereksizleşti). `shouldAddExemption` sadeleşti.
   - `buildSingleLine` satır bazı `kdvExemptionCode` desteği (belge seviyesi fallback).

3. **M11 mimari karar — self-exemption types:**
   - `src/config/self-exemption-types.ts` (yeni) — `SELF_EXEMPTION_INVOICE_TYPES` (ISTISNA, YTBISTISNA, IHRACKAYITLI, OZELMATRAH) + `SELF_EXEMPTION_INVOICE_PROFILES` (IHRACAT, YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK) + `isSelfExemptionInvoice()` helper.

4. **Yeni validator `manual-exemption-validator.ts`:**
   - `src/validators/manual-exemption-validator.ts` (yeni) — Self-exemption olmayan faturada 3 kural: (R1) KDV=0+tevkifat çakışması → `WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV`; (R2) KDV=0 kalem için kod eksik → `MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV`; (R3) KDV>0 kalem + 351 → `EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV`.
   - `src/calculator/simple-invoice-builder.ts` — `build()` pipeline'ında calculator'dan önce çağrılır, `validationLevel !== 'none'` her iki modda (basic+strict) tetiklenir.

5. **SimpleLineInput genişletme:**
   - `src/calculator/simple-types.ts` — `SimpleLineInput.kdvExemptionCode?: string` opsiyonel alan. Mapper satır kodunu TaxSubtotal'a yazar; verilmezse belge kodu fallback.

6. **555 "KDV Oran Kontrolüne Tabi Olmayan Satışlar" desteği:**
   - `src/calculator/exemption-config.ts` — 555 entry eklendi (name: 'KDV Oran Kontrolüne Tabi Olmayan Satışlar', documentType: 'SATIS').
   - `src/validators/cross-check-matrix.ts` — `CODE_555_ALLOWED_TYPES` (SATIS, TEVKIFAT, KOMISYONCU) + manuel override. `requiresZeroKdvLine` YOK (351'den ayrılan semantik: 555 her KDV oranında geçerli — alıcının yetkisi dışı KDV oranında kesim senaryosu).
   - `mapper.shouldAddExemption` 555 özel branch — KDV oranından bağımsız XML'e yazılır.
   - M4 `allowReducedKdvRate` gate (`reduced-kdv-detector.ts`) dokunulmadı.

7. **Snapshot regenerate (6 senaryo):**
   - 05, 10, 16, 31, 99 (TEVKIFAT varyantları) — output.xml'den `<TaxExemptionReasonCode>351</TaxExemptionReasonCode>` kalktı.
   - 30-feature-555 — önceden calculator input.kdvExemptionCode='555' yok sayıp yanlış 351 yazıyordu; artık doğru 555 yazılıyor (gizli regresyon açığa çıktı ve çözüldü).
   - 06, 07, 17: değişmedi.

8. **Test güncellemeleri (eski davranış → yeni):**
   - `__tests__/calculator/simple-invoice-mapper.test.ts` — B-81 describe → B-NEW-11 tersine doğrulama.
   - `__tests__/calculator/document-calculator.test.ts` — TEVKIFAT default 351 → null; kullanıcı kod verdiğinde pass-through test eklendi.
   - `__tests__/calculator/exemption-config.test.ts` — 555 config'de yok → var; documentType SATIS doğrulama.
   - `__tests__/validators/tax-exemption-matrix.test.ts` — 555 UNKNOWN → SATIS için null (geçerli), ISTISNA için INVALID_EXEMPTION_FOR_TYPE.

### Test Durumu

- Başlangıç: 755/755 yeşil
- Son: **757/757 yeşil** (+2 net — tax-exemption-matrix.test.ts'te 555 INVALID branch eklendi, document-calculator.test.ts'te kullanıcı kod pass-through eklendi)

### Plan Sapması

- **555 keşfi (dur ve sor):** B-NEW-11 fix sırasında 30-feature-555 senaryosunda gizli regresyon açıldı. Önceden calculator `input.kdvExemptionCode='555'`'i yok sayıp yanlış 351 yazıyordu (DEFAULT_EXEMPTIONS.satis branch'ı). Fix ile doğru 555 yazılıyor ama cross-check matris 555'i tanımıyordu. Berkay açıklaması: "555 = KDV Oran Kontrolüne Tabi Olmayan Satışlar, KDV oranından bağımsız, alıcının yetkisi dışı KDV oranında kesim için kullanılır, her KDV oranında verilebilir." Çözüm: 555'i exemption-config.ts + cross-check-matrix.ts'e ekle (Seçenek B onaylandı). Kapsam 8c.1 commit'inde çözüldü.
- **Plan 8c.3 birleşti:** Plan'da 8c.3 "M11 self-exemption types config + test" ayrı commit'ti. Validator 8c.1'de config'e bağımlı olduğundan config ve validator aynı commit'e (8c.1) alındı. 8c.3 artık sadece ek M11/validator test coverage için ayrılır (kısa commit).

---

## Sprint 8c.2 — B-NEW-12 fix: SimpleLineDeliveryInput.alicidibsatirkod + mapper CustomsDeclaration ağacı

**Tarih:** 2026-04-24
**Commit hedefi:** `Sprint 8c.2: B-NEW-12 fix (IHRACKAYITLI+702 AlıcıDİBSATIRKOD)`

### Yapılanlar

1. **`src/calculator/simple-types.ts`** — `SimpleLineDeliveryInput.alicidibsatirkod?: string` opsiyonel alan eklendi (11-hane AlıcıDİBSATIRKOD; IHRACKAYITLI+702 için).
2. **`src/calculator/simple-invoice-mapper.ts` `buildSingleLine()` genişletildi:**
   - `alicidibsatirkod` → `delivery.shipment.transportHandlingUnits[0].customsDeclarations[0].issuerParty.partyIdentifications[{ id, schemeID: 'ALICIDIBSATIRKOD' }]` ağacı.
   - `transportHandlingUnits` tek element — hem `packageTypeCode` (paketleme) hem `alicidibsatirkod` (gümrük beyannamesi) destekler.
   - `shipmentNeeded` koşulu genişletildi (gtipNo || transportModeCode || thuNeeded).
3. **`examples/07-temelfatura-ihrackayitli-702/input.ts`** — Yanlış anlamdaki `buyerCode: 'DIIB-2026-000042'` kaldırıldı; yerine `delivery.alicidibsatirkod: '12345678901'` (11 hane fiktif).
4. **`examples/17-kamu-ihrackayitli/input.ts`** — Aynı güncelleme: `buyerCode` → `delivery.alicidibsatirkod: '99887766554'`.
5. **Snapshot regenerate:** 07 ve 17 output.xml'e `<cac:Shipment>/<cac:TransportHandlingUnit>/<cac:CustomsDeclaration>/<cac:IssuerParty>/<cac:PartyIdentification>/<cbc:ID schemeID="ALICIDIBSATIRKOD">...</cbc:ID>` ağacı eklendi.

### Test Durumu

- Başlangıç: 757/757 yeşil
- Son: 757/757 yeşil (yeni test eklenmedi — strict mod doğrulaması 8c.9'da). Manuel strict mod testi: 07 senaryo strict'te başarılı build, XML'de ALICIDIBSATIRKOD schemeID mevcut.

### Disiplin Notları

- **Breaking disiplini:** `alicidibsatirkod` yeni opsiyonel alan — mevcut kullanıcı input'ları etkilenmez. CHANGELOG'da **Added**, BREAKING değil.
- **Semantik ayrım:** `buyerCode` "alıcı ürün kodu" semantiği korunur; IHRACKAYITLI+702 için ayrı `alicidibsatirkod` alanı kullanılır (semantik belirsizlikten kaçınma).
- **Validator `ihrackayitli-validator.ts` dokunulmadı** — low-level InvoiceInput üzerinde tetikleniyor; mapper sonrası ağaç doğru kurulduğu için otomatik pass.

---

## Sprint 8c.3 — M11 + manual-exemption-validator test coverage

**Tarih:** 2026-04-24
**Commit:** `069e59a`

### Yapılanlar

1. **`__tests__/config/self-exemption-types.test.ts`** (yeni, 10 test):
   - `SELF_EXEMPTION_INVOICE_TYPES` set içerik + içermezlik
   - `SELF_EXEMPTION_INVOICE_PROFILES` set içerik + içermezlik
   - `isSelfExemptionInvoice()`: self-exemption tip → true, profil → true, non-self → false, defensive empty → false

2. **`__tests__/validators/manual-exemption-validator.test.ts`** (yeni, 11 test):
   - Self-exemption tipleri (ISTISNA, IHRACKAYITLI) + profilleri (YOLCU, YATIRIMTESVIK) → validator pas
   - R1 KDV=0 + tevkifat kombinasyonu → `WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV` (SATIS + TEVKIFAT tipinde)
   - R2 KDV=0 + kod eksik → `MANUAL_EXEMPTION_REQUIRED_FOR_ZERO_KDV`; belge seviyesi kod, satır seviyesi kod fallback testleri
   - R3 KDV>0 + satır kodu 351 → `EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV`; 555 her oranda geçerli
   - Normal senaryo doğrulama (hata yok)

### Test Durumu

- Başlangıç: 757/757 yeşil
- Son: **778/778 yeşil** (+21 yeni test — config 10 + validator 11)

### Plan İçi Disiplin

- 8c.1'de fix ile birleşen config/validator için ek test coverage sağlandı. Plan'ın "test sayısı ~884" hedefi doğrultusunda birikmeli.

---

## Sprint 8c.4 — B-NEW-13 YOLCU passport + taxRepresentativeParty

**Tarih:** 2026-04-24
**Commit hedefi:** `Sprint 8c.4: B-NEW-13 YOLCU (nationalityId + passportId + taxRepresentativeParty)`

### Yapılanlar

1. **SimpleBuyerCustomerInput genişletildi** (`simple-types.ts`):
   - `nationalityId?: string` — ISO 3166-1 alpha-2 ülke kodu (ör. 'DE')
   - `passportId?: string` — pasaport numarası

2. **Yeni tip SimpleTaxRepresentativeInput** (`simple-types.ts`):
   - `vknTckn: string` — ARACIKURUMVKN (10 veya 11 hane)
   - `label: string` — ARACIKURUMETIKET
   - `name?: string` — aracı kurum tüzel adı (opsiyonel)

3. **SimpleInvoiceInput.taxRepresentativeParty** eklendi — YOLCUBERABERFATURA profili için aracı kurum bilgisi.

4. **Mapper genişletildi** (`simple-invoice-mapper.ts`):
   - `buildBuyerCustomer` — `bc.nationalityId` → `party.nationalityId`; `bc.passportId` → `party.passportId` eşlemesi.
   - Yeni `buildTaxRepresentative` fonksiyonu — `vknTckn`/`label`/`name` → `TaxRepresentativeInput` (`intermediaryVknTckn` + `intermediaryLabel` + `name`).
   - `buildInvoiceInput` içinde `simple.taxRepresentativeParty` varsa `result.taxRepresentativeParty` atanır.

5. **Senaryo 20 input.ts güncellendi**:
   - `buyerCustomer.taxNumber: '99999999999'` (11 hane dolgu, TCKN olmadığı için)
   - `buyerCustomer.nationalityId: 'DE'` + `passportId: 'N12345678'` eklendi
   - `taxRepresentativeParty: { vknTckn: '9876543210', label: 'MIMSOFT_TAXFREE_INTERMEDIARY', name: 'Mimsoft Turizm KDV İade Aracı' }` eklendi

6. **Snapshot regenerate** (20): XML'e `NationalityID`, `IdentityDocumentReference/ID` (pasaport), `TaxRepresentativeParty` element'leri eklendi.

7. **`audit/b-new-audit.md`'ye B-NEW-13 + B-NEW-14 bölümleri** eklendi (reproduction, expected, actual, root cause, fix, sonuç).

8. **Manuel strict mod doğrulaması** — senaryo 20 strict'te başarılı build; 3 UBL element XML'de mevcut.

### Test Durumu

- Başlangıç: 778/778 yeşil
- Son: 778/778 yeşil (yeni test yok; strict mod per-case 8c.9'da toplu eklenecek)

### Disiplin Notları

- **Kapsam genişlemesi:** Plan 8c.4 sadece nationalityId + passportId diyordu. YOLCU validator `taxRepresentativeParty` zorunluluğunu da zaten kontrol ediyordu (Sprint 5/6'da eklenmişti); strict mod için simple-input katmanında da `taxRepresentativeParty` alanı eklendi. Aynı commit'te birleşti — iki farklı genişleme aynı semantik problemi (YOLCU profili strict mode desteği) çözüyor.
- **Breaking disiplini:** Yeni opsiyonel alanlar — mevcut kullanıcı input'ları etkilenmez. CHANGELOG'da **Added**.
- **20 senaryosu hâlâ `validationLevel: 'basic'` run.ts'te** — `basicModSlugs` set'inden 8c.9'da kaldırılacak (disiplin: 9/9 strict geçiş toplu commit).

---

## Sprint 8c.5 — B-NEW-14 plan hatası + 26 validation-errors test coverage

**Tarih:** 2026-04-24
**Commit hedefi:** `Sprint 8c.5: B-NEW-14 plan hatası düzeltmesi + 26 validation-errors test coverage`

### Plan Varsayımı (Yanlıştı)

Sprint 8c planlaması sırasında senaryo 26-idis-satis'in `validationLevel: 'basic'` workaround'unda olduğu varsayıldı. Gerçek: `snapshot.test.ts:basicModSlugs` set'inde 26 **yoktu** — senaryo zaten strict modda çalışıyordu. `validateIdis` fonksiyonu (`profile-validators.ts:341-369`) eksiksiz: SEVKIYATNO + ETIKETNO zorunluluk + regex format kontrolü mevcut.

### Yapılanlar

1. **`examples/26-idis-satis/validation-errors.ts` zenginleştirildi:**
   - `SEVKIYATNO eksik` case `notCaughtYet` flag'ı kaldırıldı → `expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'SEVKIYATNO' }]` + `validationLevel: 'strict'`
   - **Yeni case:** `SEVKIYATNO "SE-123" format regex reject` (7 hane eksik) → `INVALID_FORMAT`
   - **Yeni case:** `ETIKETNO line'dan eksik` → `PROFILE_REQUIREMENT`
   - Mevcut `ETIKETNO format bozuk` (`INVALID_FORMAT`) ve `Satıcı VKN boş` (`MISSING_FIELD`) case'leri korundu.
2. **`audit/b-new-audit.md` B-NEW-14 bölümü güncellendi** — "KRİTİK: validator eksik" yanlış varsayımı "PLAN HATASI → YOK: validator zaten mevcut" olarak düzeltildi.

### Test Durumu

- Başlangıç: 778/778 yeşil
- Son: 778/778 yeşil (validation-errors.test.ts şu an slug-bazlı smoke — yeni case'ler 38 slug test'inin içinde değerlendirildi; strict per-case 8c.9'da açılacak)

### Plan Sapması

- **Commit sayısı güncelleme:** 14 → 13 atomik commit. 8c.5 "fix" commit'i olmadı, "test coverage + plan hatası düzeltmesi" olarak küçük kaldı (disiplin gereği numaralandırma korundu).
- **`basicModSlugs` set'i** Sprint 8c başlangıcında 8 senaryo içeriyordu (05, 07, 10, 16, 17, 20, 31, 99). 26 zaten strict'teydi; plan "9/9 strict" hedefinde 26 için ek fix gereksizdi — "8/8 basic→strict geçiş" doğru sayım.

---

## Sprint 8c.6 — G3 Cross-check matrix fix (B-NEW-04, 05, 06, 07)

**Tarih:** 2026-04-24
**Commit hedefi:** `Sprint 8c.6: G3 cross-check matrix (B-NEW-04, 05, 06, 07)`

### Yapılanlar

1. **B-NEW-07 — 701-704 requiresZeroKdvLine (`cross-check-matrix.ts`):**
   - `buildMatrix()` sonunda 701-704 kodlarının her biri için `requiresZeroKdvLine: true` override eklendi.
   - IHRACKAYITLI faturada satır bazı KDV>0 → `EXEMPTION_REQUIRES_ZERO_KDV_LINE` hata.

2. **B-NEW-06 — IHRACKAYITLI exemption zorunlu (`type-validators.ts:validateIhracKayitli`):**
   - Mevcut "kod whitelist" kontrolüne ek olarak **"en az bir 701-704 kodu zorunlu"** kontrolü eklendi.
   - Tip IHRACKAYITLI ama hiç exemption kodu yoksa → `TYPE_REQUIREMENT` hata.

3. **B-NEW-05 — `validateCrossMatrix` basic+strict her iki modda (`invoice-builder.ts`):**
   - Önceki davranış: cross-matrix sadece strict'te tetikleniyordu (forbidden profile×type, exemption kod×tip vb.).
   - Yeni: basic+strict her iki modda. `validateByType` ve `validateByProfile` yalnız strict'te kalır (ileri detay kontrolü).
   - Önceden basic'te sessiz geçen `SATIS+702` gibi kombinasyonlar artık FORBIDDEN_EXEMPTION_FOR_TYPE döndürür.

4. **B-NEW-04 — 351 belge seviyesi + tüm satırlar KDV>0 (`manual-exemption-validator.ts:R4`):**
   - Yeni kural: `docExemptionCode === '351' && input.lines.every(l => l.kdvPercent > 0)` → `EXEMPTION_351_REQUIRES_ZERO_KDV_LINE`.
   - Senaryo: kullanıcı belge seviyesi 351 veriyor ama hiçbir kalemde KDV=0 yok — self-contradiction yakalanır.

### Yeni testler

- `__tests__/validators/manual-exemption-validator.test.ts` R4 — 2 test (tek-satır KDV>0 hata + en az bir KDV=0 pas).
- `__tests__/validators/tax-exemption-matrix.test.ts` 701-704 — 1 test (hepsinde `requiresZeroKdvLine: true`).

### Test Durumu

- Başlangıç: 778/778 yeşil
- Son: **781/781 yeşil** (+3)

### Disiplin Notları

- B-NEW-05 `validateCrossMatrix` basic'e taşınması **BREAKING** potansiyeli: önceden basic'te geçen hatalı `type×exemption` input'ları artık reddedilir. CHANGELOG'da BREAKING CHANGES altında belirtilecek.
- B-NEW-04 R4 `manual-exemption-validator`'a eklendi (cross-check değil) — çünkü `validateTaxExemptionMatrix` yalnızca XML'e yazılmış `taxExemptionReasonCode`'ları kontrol ediyor; belge seviyesi `input.kdvExemptionCode` XML'e yazılmadan önce (simple-input seviyesinde) yakalanır.
- B-NEW-06 validator özel niteliği: `input.taxTotals` belge seviyesinde IHRAC kodu aranır (tüm satırlar aynı kodu paylaşır genelde; toplama aggregate edilmiş subtotal).

---

## Sprint 8c.7 — G4 SGK (B-NEW-08, 09, 10)

**Tarih:** 2026-04-24
**Commit hedefi:** `Sprint 8c.7: G4 SGK (B-NEW-08, 09, 10)`

### Yapılanlar

1. **`SimpleSgkType` literal union** (`simple-types.ts`):
   - Yeni tip: `'SAGLIK_ECZ' | 'SAGLIK_HAS' | 'SAGLIK_OPT' | 'SAGLIK_MED' | 'ABONELIK' | 'MAL_HIZMET' | 'DIGER'`.
   - `SimpleSgkInput.type` string → SimpleSgkType (TS compile-time darlatma).

2. **Yeni validator `src/validators/sgk-input-validator.ts`:**
   - **R1 (B-NEW-08):** `type === 'SGK'` ama `sgk` undefined → `TYPE_REQUIRES_SGK`.
   - **R2 (B-NEW-09):** `sgk.type` `SGK_TYPE_WHITELIST` dışı → `INVALID_VALUE` (runtime guard; TS bypass olan input'lar için).
   - **R3 (B-NEW-10):** `sgk.documentNo`, `sgk.companyName`, `sgk.companyCode` boş → `MISSING_FIELD`.

3. **`simple-invoice-builder.ts` pipeline'da register** — `validateSgkInput` `validateManualExemption` ile birlikte `validationLevel !== 'none'` her iki modda tetiklenir.

4. **`__tests__/validators/sgk-input-validator.test.ts` (yeni, 9 test):**
   - B-NEW-08: type=SGK sgk eksik + SATIS+sgk undefined pas
   - B-NEW-09: whitelist geçerli/geçersiz type
   - B-NEW-10: documentNo/companyName/companyCode boş (3 case)
   - Normal: tam geçerli SGK + SATIS+sgk birlikte geçerli

### Test Durumu

- Başlangıç: 781/781 yeşil
- Son: **790/790 yeşil** (+9)

### Disiplin Notları

- **Breaking TS tipi (B-NEW-09):** `SimpleSgkInput.type` string → union. Mevcut bilinen SGK tipi kullanıcıları etkilenmez (7 izinli değer), ama string literal'i farklı yazan kullanıcı TS hatası alır. CHANGELOG BREAKING CHANGES.
- **Validator yerleşim:** SGK için ayrı validator dosyası (SGK kuralları domain-specific; manual-exemption-validator'a karıştırmak sorumluluğu bulanıklaştırır).

---

## Sprint 8c.8 — G5 Runtime hijyen (B-NEW-01, 02, 03)

**Tarih:** 2026-04-24
**Commit hedefi:** `Sprint 8c.8: G5 runtime hijyen (B-NEW-01, 02, 03)`

### Yapılanlar

1. **Yeni validator `src/validators/simple-line-range-validator.ts`:**
   - B-NEW-01: `kdvPercent` ∉ [0, 100] → `INVALID_VALUE`
   - B-NEW-02: `quantity <= 0` → `INVALID_VALUE`
   - B-NEW-03: `taxes[].percent` ∉ [0, 100] → `INVALID_VALUE`

2. **`simple-invoice-builder.ts` pipeline**'da register — diğer simple-input validator'ları ile birlikte.

3. **`__tests__/validators/simple-line-range-validator.test.ts` (yeni, 10 test):**
   - B-NEW-01: negatif + >100 + geçerli (0, 20, 100)
   - B-NEW-02: 0 + negatif + küsürat geçerli
   - B-NEW-03: >100 + negatif + geçerli
   - Normal senaryo — hata yok

### Test Durumu

- Başlangıç: 790/790 yeşil
- Son: **800/800 yeşil** (+10)

---
