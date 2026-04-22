# Sprint 1 — Matris Tekleştirme + AR-3/AR-4 (v3)

## Context

`FIX-PLANI-v3.md` yayınlandı (dev-bağlam revizyonu: json2ubl-ts prod'da değil, edocument-service prod'da değil, tek release v2.0.0 Sprint 8 sonu). Bu revizyon Sprint 1'de 5 noktayı etkiliyor:

1. **AR-3** — `PROFILE_TYPE_MAP` public export kaldırılsın
2. **AR-4** — `PROFILE_TYPE_MATRIX` public export kaldırılsın (helper API yeterli)
3. **CHANGELOG.md Sprint 8'e ertelendi** — Sprint 1'de oluşturulmayacak
4. **Release tag yok** — ara release v1.5.0-rc1 kaldırıldı, sadece commit + push
5. **"Breaking change" lafları kaldırıldı** — dev ortamı, tüketici kırılma endişesi yok

Önceki Sprint 1 planı (`/Users/berkaygokce/.claude/plans/g-rev-json2ubl-ts-k-t-phanesi-glowing-pillow.md`) v2 bağlamında yazılmıştı; bu plan onun yerine geçer.

**Amaç:** Matris asimetrisini tek truth source'a indirgeme (M1) + IHRACAT/YOLCU/OZELFATURA tek ISTISNA (M2) + customizationId TR1.2 (M8) + public API yüzeyini daraltma (AR-4).

**Kapanan 9 bulgu:** B-01, B-02, B-21, B-22, B-23, B-54, B-55, B-56, B-77.

**Release:** Yok. Commit + push. Git tag yok.

---

## Mevcut Durum (Keşif Özeti)

| Sembol | Konum | Durum | AR-3/4 |
|---|---|---|---|
| `PROFILE_TYPE_MATRIX` | `src/config/constants.ts:8-66` (def) + `src/index.ts:22` (re-export) | **PUBLIC** | **AR-4: Export kaldır** |
| `PROFILE_TYPE_MAP` | `src/calculator/invoice-rules.ts:33` | **PRIVATE** (const) | AR-3: Aksiyon yok (zaten private) |
| `TYPE_PROFILE_MAP` | `src/calculator/invoice-rules.ts:50` | **PRIVATE** (const) | Aksiyon yok |
| `getAllowedTypesForProfile` | `invoice-rules.ts:204` + `calculator/index.ts:77` (re-export) | **PUBLIC** | Public kalır (helper API) |
| `getAllowedProfilesForType` | `invoice-rules.ts:191` + `calculator/index.ts:76` (re-export) | **PUBLIC** | Public kalır (helper API) |

**Tüketici analizi:**
- `PROFILE_TYPE_MATRIX` iç tüketici: `src/validators/cross-validators.ts:3,12` (doğrudan `../config/constants`'tan import — iç import yolu public `src/index.ts`'e bağımlı değil)
- `PROFILE_TYPE_MAP` iç tüketici: `invoice-rules.ts:108` (`filterTypesByLiability`) + `invoice-rules.ts:208` (`getAllowedTypesForProfile`)
- `TYPE_PROFILE_MAP` iç tüketici: `invoice-rules.ts:196` (`getAllowedProfilesForType`)
- Helper'ların iç tüketicisi: `invoice-session.ts:36,196,482,494`
- `invoice-rules.test.ts` **yok** — yeni dosya olacak

---

## Public API Son Hali (S1/S2/S3 Cevabı)

### S1 — Helper'lar public mi? → **Seçenek A: Public kalsın.**

**Öneri gerekçesi:**
- `getAllowedTypesForProfile`/`getAllowedProfilesForType` edocument-service gibi tüketicilerin UI derivation için tasarlanmış tipik API'si.
- `invoice-session.ts` iç olarak da kullanıyor (4 yer); silmek iç kodda zincirleme refactor gerektirir.
- Helper signature'ları sade (`(code: string) => string[]`); matrix'in iç şekline bağımlı değil — AR-4'ün asıl amacı (iç veri yapısı public olmasın) helper imzasını değiştirmez.
- Public API'yi daraltmak isterken tüketici işlevine müdahale etme.

**Alternatif (Seçenek B — private yap):** Daha aşırı daraltma; ama tüketici iş akışını kırar. Reddedilmiş.

### S2 — Matrix export kaldırmanın gerçek faydası

- Matrix'in **şekli** (`Record<InvoiceProfileId, ReadonlySet<InvoiceTypeCode>>`) public API'nin parçası değil.
- İç değişiklik (ör. Set yerine Array, config'den yüklenme, JSON source) public API'yi kırmaz — helper API stabil.
- Enum'lara (`InvoiceProfileId`, `InvoiceTypeCode`) hâlâ erişim var (enum'lar public kalır); tüketici tip güvenliğinde.
- "Matrix'i dışarıda iterate eden" kod pattern'i engellenir → iyi tüketici tasarımı tek API'den geçer.

### S3 — Public API Son Hali (Sprint 1 sonu)

**`src/index.ts` export listesi (satır 22'den `PROFILE_TYPE_MATRIX` silinir):**

| Sembol | Sprint 1 sonu | Not |
|---|---|---|
| `PROFILE_TYPE_MATRIX` | ❌ **Export kaldırılır** | AR-4 |
| `UBL_CONSTANTS` | ✅ Public (customizationId='TR1.2') | Değişmez |
| `getAllowedTypesForProfile` | ✅ Public | S1: A |
| `getAllowedProfilesForType` | ✅ Public | S1: A |
| `resolveProfileForType` / `resolveTypeForProfile` | ✅ Public | Değişmez |
| Diğer 5 helper (calculator/index.ts) | ✅ Public | Değişmez |
| Enum'lar (`InvoiceProfileId`, `InvoiceTypeCode`, vb.) | ✅ Public | Değişmez |
| `SimpleInvoiceBuilder`, Validator'lar | ✅ Public | Değişmez |

**Private (dışarı sızdırılmaz):**
- `PROFILE_TYPE_MATRIX` (yalnızca iç tüketici `cross-validators.ts` kullanır, direct path)
- `PROFILE_TYPE_MAP`, `TYPE_PROFILE_MAP` (zaten private; v3'te de öyle kalır)
- `deriveProfileTypeMap`, `deriveTypeProfileMap` (yeni helper'lar, module-scope)

---

## Adım Adım İmplementasyon

### Adım 1 — `constants.ts:PROFILE_TYPE_MATRIX` M2 güncellemesi (15 dk)

**Dosya:** `src/config/constants.ts` (PROFILE_TYPE_MATRIX tanımı satır 8-66 aralığında)

IHRACAT / YOLCUBERABERFATURA / OZELFATURA üç Set'ini `new Set([InvoiceTypeCode.ISTISNA])`'ya daralt. Diğer 9 profil **dokunulmaz**.

**Kapanan:** B-54, B-55, B-56 (matris tarafı).

### Adım 2 — `invoice-rules.ts` helper'ları + türetme (30 dk)

**Dosya:** `src/calculator/invoice-rules.ts`

1. Üstte `PROFILE_TYPE_MATRIX`, `InvoiceProfileId`, `InvoiceTypeCode` import ekle (zaten enum import'u varsa sadece matrix ekle).
2. Module-scope, **non-exported** iki helper:
   ```ts
   function deriveProfileTypeMap(
     matrix: Record<InvoiceProfileId, ReadonlySet<InvoiceTypeCode>>,
   ): Record<string, string[]> {
     const out: Record<string, string[]> = {};
     for (const profile of Object.keys(matrix) as InvoiceProfileId[]) {
       out[profile] = Array.from(matrix[profile]);
     }
     return out;
   }

   function deriveTypeProfileMap(
     matrix: Record<InvoiceProfileId, ReadonlySet<InvoiceTypeCode>>,
   ): Record<string, string[]> {
     const out: Record<string, string[]> = {};
     for (const profile of Object.keys(matrix) as InvoiceProfileId[]) {
       for (const type of matrix[profile]) {
         (out[type] ??= []).push(profile);
       }
     }
     return out;
   }
   ```
3. Satır 33-47 `PROFILE_TYPE_MAP` hardcoded bloğu → `const PROFILE_TYPE_MAP = deriveProfileTypeMap(PROFILE_TYPE_MATRIX);`
4. Satır 50-63 `TYPE_PROFILE_MAP` hardcoded bloğu → `const TYPE_PROFILE_MAP = deriveTypeProfileMap(PROFILE_TYPE_MATRIX);`
5. İki const private kalır (export yok).

**Kapanan:** B-01, B-02, B-21, B-22, B-23, B-77 (türetme otomatik kapatır).

**Davranış değişimi (dev ortamı, kırılma endişesi yok):**
- `getAllowedTypesForProfile('TICARIFATURA')` → IADE yok
- `getAllowedTypesForProfile('HKS')` → `['HKSSATIS', 'HKSKOMISYONCU']`
- `getAllowedProfilesForType('YTBSATIS')` → `['EARSIVFATURA']`

### Adım 3 — `namespaces.ts` customizationId TR1.2 (5 dk)

**Dosya:** `src/config/namespaces.ts:28`

`customizationId: 'TR1.2.1'` → `customizationId: 'TR1.2'`.

**Kapanan:** M8. B-38 Sprint 6'daki "ayrı Invoice/Despatch sabitleri gereksiz" kararı pratikte Sprint 1'de kapanır (tek sabit zaten mevcut).

### Adım 4 — **YENI (v3):** `src/index.ts` AR-4 uygulaması (5 dk)

**Dosya:** `src/index.ts:22`

`PROFILE_TYPE_MATRIX` export satırını **kaldır**. İç tüketici (`cross-validators.ts`) doğrudan `../config/constants`'tan import ediyor — bu path iç, public index'e bağımlı değil; değişiklik gerekmez.

**Doğrulama:** `grep -r "PROFILE_TYPE_MATRIX" src/` çıktısı sadece `constants.ts` (def) + `validators/cross-validators.ts` (iç tüketici) olmalı.

**Tüketici durumu:** edocument-service dev aşamasında, paketi güncelleyecek; matrix'i doğrudan kullanıyorsa helper'a geçsin.

### Adım 5 — Test assertion güncellemeleri (15 dk)

**Dosyalar:**
- `__tests__/builders/invoice-builder.test.ts:95` — `TR1.2.1` → `TR1.2`
- `__tests__/builders/despatch-builder.test.ts:72` — `TR1.2.1` → `TR1.2`

Başka literal yok (Explore ajanı teyit etti).

### Adım 6 — `document-calculator.test.ts` IHRACAT testi defensive fix (5 dk)

**Dosya:** `__tests__/calculator/document-calculator.test.ts:199-210`

Test: "buyerCustomer varsa profil IHRACAT olmalı". Input type varsayılan SATIS. `calculateDocument` validator çağırmıyor (sadece profile derivation), teknik olarak test geçer. Ama M2 sonrası IHRACAT+SATIS mantıksal tutarsız — input'a explicit `invoiceTypeCode: 'ISTISNA'` ekle. Expected clause genişlet: `expect(result.type).toBe('ISTISNA')` de eklenebilir (opsiyonel; derivation otomatik tip atıyorsa zaten geçer).

**Not:** Otomatik tip derivation (buyerCustomer → IHRACAT + ISTISNA) M10 kapsamında (Sprint 4). Sprint 1'de input'a manuel tip eklemek yeterli.

### Adım 7 — Yeni test dosyası: `invoice-rules.test.ts` (60 dk)

**Yeni dosya:** `__tests__/calculator/invoice-rules.test.ts`

Test framework: vitest (mevcut). **8 test:**

1. **Matris simetri (profile → type):** Her 12 profil için `getAllowedTypesForProfile(profile)` sorted array === `Array.from(PROFILE_TYPE_MATRIX[profile]).sort()`.
2. **Ters matris simetri (type → profile):** Her `InvoiceTypeCode` için `getAllowedProfilesForType(type)` → her profil matrix'te `has(type)` = true.
3. **M2 — IHRACAT tek ISTISNA:** `getAllowedTypesForProfile('IHRACAT')` === `['ISTISNA']`.
4. **M2 — YOLCUBERABERFATURA tek ISTISNA:** aynı.
5. **M2 — OZELFATURA tek ISTISNA:** aynı.
6. **B-02 HKS:** `getAllowedTypesForProfile('HKS')` `['HKSSATIS', 'HKSKOMISYONCU']` içerir; `SATIS`/`KOMISYONCU` **içermez**.
7. **B-77 YTB:** `getAllowedProfilesForType('YTBSATIS')` `'EARSIVFATURA'` içerir.
8. **M8 customizationId:** `UBL_CONSTANTS.customizationId === 'TR1.2'`.

**Not:** AR-4 (PROFILE_TYPE_MATRIX public export kaldırıldı) için runtime test yazılamaz — bu compile-time export listesi değişimi. Manuel teyit: `grep "PROFILE_TYPE_MATRIX" src/index.ts` çıktısı boş olmalı.

### Adım 8 — `audit/sprint-01-implementation-log.md` (20 dk)

**Yeni dosya.** İçerik:
- Tarih, sprint no, v3 bağlam pointer'ı
- Kapanan 9 bulgu (B-01, B-02, B-21, B-22, B-23, B-54, B-55, B-56, B-77) her biri için: dosya+satır, öncesi/sonrası özet, test referansı
- Uygulanan 4 karar: M1 (matris tekleştirme), M2 (3 profil tek ISTISNA), M8 (TR1.2), AR-4 (public export kaldır)
- Davranış değişimi notu (dev ortamı; kırılma endişesi yok; edocument-service güncelleme sırasında helper'a geçebilir)

**KALDIRILDI (v3):** CHANGELOG.md oluşturma. Sprint 8'de tek v2.0.0 entry olarak yazılacak. `package.json` version bump yok.

### Adım 9 — `yarn test` + typecheck (15 dk)

- `yarn test` — yeşil olmalı (mevcut ~112 test + 8 yeni = 120+)
- `yarn tsc --noEmit` (veya eşdeğer) — hata yok
- AR-4 teyit: `grep "PROFILE_TYPE_MATRIX" src/index.ts` → boş çıktı
- Kırılan test varsa: davranış değişimi mi (test input'u güncelle) yoksa regresyon mu (kod fix) ayırt et

### Adım 10 — Commit + push (5 dk)

- `git add` seçici (hassas dosya yok — src, __tests__, audit, namespaces değişiklikleri)
- Commit mesajı: "Sprint 1: matris tekleştirme (M1/M2/M8) + AR-4 matrix private" benzeri, FIX-PLANI-v3 + sprint implementation-log referanslı
- `git push` — tag yok, release yok

---

## Çıktı Listesi

### Değişen dosyalar

| Dosya | Değişiklik | Satır tahmini |
|---|---|---|
| `src/config/constants.ts` | IHRACAT/YOLCU/OZEL Set'leri tek ISTISNA | −18, +3 |
| `src/calculator/invoice-rules.ts` | Import + 2 helper + PROFILE_TYPE_MAP/TYPE_PROFILE_MAP türevli | −32, +25 |
| `src/config/namespaces.ts` | customizationId `'TR1.2'` | 1 |
| **`src/index.ts`** | **`PROFILE_TYPE_MATRIX` export satırı kaldır (AR-4)** | **−1** |
| `__tests__/builders/invoice-builder.test.ts` | TR1.2.1 → TR1.2 | 1 |
| `__tests__/builders/despatch-builder.test.ts` | TR1.2.1 → TR1.2 | 1 |
| `__tests__/calculator/document-calculator.test.ts` | IHRACAT testine `invoiceTypeCode: 'ISTISNA'` ekle | +1 |

### Yeni dosyalar

| Dosya | İçerik |
|---|---|
| `__tests__/calculator/invoice-rules.test.ts` | 8 test (matris simetri + M2 + HKS + YTB + customizationId) |
| `audit/sprint-01-implementation-log.md` | Bulgu-bulgu uygulama notu (CHANGELOG yok; Sprint 8'e ertelendi) |

### KALDIRILAN (v2'den v3'e)

- `CHANGELOG.md` oluşturulması (Sprint 8'e ertelendi)
- `package.json` version bump (Sprint 8)
- Git tag `v1.5.0-rc1` (release disiplini değişti)

### Dokunulmayan dosyalar

- `src/types/enums.ts`, `src/validators/cross-validators.ts` (matrix direct import, değişmez), `src/serializers/*.ts`, `src/builder/*.ts`, `src/calculator/invoice-session.ts`

---

## Risk Notları (v3 Kategori)

### İş Riski (kütüphane yanlış çalışma olasılığı — test ile yakalanır)

1. **IR-1: `document-calculator.test.ts:199` IHRACAT testi** (düşük)
   `calculateDocument` validator çağırmıyorsa test geçer; çağırıyorsa kırılır. Defensive fix: input'a `invoiceTypeCode: 'ISTISNA'` ekle. Adım 6'da ele alındı.

2. **IR-2: enum ↔ string uyumu** (düşük)
   `InvoiceProfileId.IHRACAT === 'IHRACAT'` (TS enum string value). `Object.keys(PROFILE_TYPE_MATRIX)` string döndürür; cast ile tip güvenliği korunur. Standart TS pattern.

3. **IR-3: `filterTypesByLiability` (invoice-rules.ts:108)** (düşük)
   `PROFILE_TYPE_MAP` türevli olduktan sonra `filterTypesByLiability` hâlâ çalışır (array okuyor). Ama içindeki mantık M2 sonrası IHRACAT için tek tip döndürecek — beklenen.

### Zaman Riski

- Buffer: +1 saat (tahmin ~3.5 saat + 1 saat = 4.5 saat, yaklaşık yarım gün)
- `yarn test` başarısız olursa Adım 9'da fix-up; genelde Adım 6 defensive fix yeterli

---

## Tahmini Süre

| Adım | Süre |
|---|---|
| 1. constants.ts M2 | 15 dk |
| 2. invoice-rules.ts helper + türetme | 30 dk |
| 3. namespaces.ts TR1.2 | 5 dk |
| 4. **AR-4: index.ts export kaldır** | **5 dk** |
| 5. Test TR1.2 güncelleme (2 dosya) | 15 dk |
| 6. IHRACAT test defensive fix | 5 dk |
| 7. Yeni test dosyası (8 test) | 60 dk |
| 8. sprint-01-implementation-log.md | 20 dk |
| 9. yarn test + typecheck + fix-up | 15 dk |
| 10. Commit + push | 5 dk |
| **Toplam net** | **~2 saat 55 dk** |
| Buffer | +1 saat |
| **Tahmin** | **~4 saat** (yarım iş günü) |

v3 FIX-PLANI "Sprint 1: 2 gün" tahmininin tek bir iş gününe bile sığdığını gösterir — buffer zengin.

---

## Verification (End-to-End)

Sprint 1 tamamlandığında:

1. **Test suite:**
   - `yarn test` → yeşil, 120+ test geçer
   - `yarn tsc --noEmit` → hata yok
2. **Manuel doğrulama:**
   ```ts
   import {
     getAllowedTypesForProfile,
     getAllowedProfilesForType,
     UBL_CONSTANTS,
   } from './src';
   console.log(getAllowedTypesForProfile('TICARIFATURA'));  // IADE yok
   console.log(getAllowedTypesForProfile('HKS'));            // ['HKSSATIS', 'HKSKOMISYONCU']
   console.log(getAllowedTypesForProfile('IHRACAT'));        // ['ISTISNA']
   console.log(getAllowedProfilesForType('YTBSATIS'));       // ['EARSIVFATURA']
   console.log(UBL_CONSTANTS.customizationId);               // 'TR1.2'
   ```
3. **AR-4 teyit:**
   - `grep "PROFILE_TYPE_MATRIX" src/index.ts` → boş
   - TS derleme sırasında `import { PROFILE_TYPE_MATRIX } from 'json2ubl-ts'` compile-time hata vermeli (tüketici testinde)
4. **Cross-matrix validator:** Bir örnek `TICARIFATURA + IADE` input'u `validateCrossMatrix` tarafından reddedilmeli (mevcut test zaten bunu beklemekte, `cross-validators.test.ts` yeşil kalır)
5. **Örnek UBL XML:** İsteğe bağlı — manuel üretim testinde `<cbc:CustomizationID>TR1.2</cbc:CustomizationID>` görünmeli

---

## Kapsam Dışı (Sonraki Sprintlere Devir)

- B-03..B-20 kod listeleri (555, 650, vb.) → Sprint 2
- XSD sequence + parent-child conditional (M6) → Sprint 3
- Aritmetik + yuvarlama (M9) + setLiability (M10) → Sprint 4
- Validator cross-check matrisi (M5) + 555 flag (M4) → Sprint 5
- Despatch + AR-2 driverPersons + AR-8 → Sprint 6
- Test güncellemeleri → Sprint 7
- README + Skill + CHANGELOG + v2.0.0 release → Sprint 8

**Kural:** Matrise dokunurken "şunu da düzelteyim" refleksi reddedilsin. Her sprint kendi kapsamında.

---

## Plan Dosyası Hedefi

Plan modundan çıkıldığında kullanıcı bu planı **`audit/sprint-01-plan.md`** olarak audit klasörüne de kaydetmemi istiyor. İlk implementasyon adımı olarak:

1. Bu plan dosyasının tam içeriği `audit/sprint-01-plan.md`'ye kopyalanır
2. Sonra implementasyon Adım 1'den başlar

---

## Beklenen Onay Noktaları

1. **S1 seçimi:** Helper'lar public kalır (Seçenek A) — önerim. Kullanıcı onayı ExitPlanMode ile.
2. **Test framework:** vitest varsayımı doğru mu (keşif teyit etti, mevcut).
3. **`invoiceTypeCode: 'ISTISNA'` eklemesi (Adım 6):** defensive fix yeterli mi yoksa M10'dan otomatik derivation Sprint 1'e çekilsin mi? Önerim: **Sprint 1'de manuel ekle**, otomatik derivation Sprint 4.

Bu üç konu için sorun varsa plan revize edilir; yoksa implementasyon tek promptla başlar.
