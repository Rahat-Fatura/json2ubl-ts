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
