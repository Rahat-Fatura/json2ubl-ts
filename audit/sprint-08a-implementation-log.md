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
