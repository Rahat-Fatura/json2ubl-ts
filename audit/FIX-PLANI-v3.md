---
plan: json2ubl-ts düzeltme yol haritası v3 (dev-bağlam revize)
tarih: 2026-04-22
kaynak: FIX-PLANI-v2.md + kullanıcı dev-bağlam revizyonu
onceki_plan: FIX-PLANI-v2.md (v2 tarihi referans), FIX-PLANI.md (v1 tarihi referans)
toplam_sprint: 8
tahmini_sure_gun: 19 (±1)
hedef_surum: v2.0.0 (ilk feature complete public release)
kutuphane_statusu: dev (prod kullanımı yok)
---

# json2ubl-ts — Fix Planı v3 (Dev-Bağlam Revize)

> v2, paketin production'da kullanıldığı örtük varsayımıyla yazıldı. Bu **yanlıştı**. Gerçek: `json2ubl-ts` ve tek tüketicisi `edocument-service` ikisi de dev aşamasında, prod'da yok. v3 bu bağlama göre v2'yi sadeleştirir: breaking change disiplini, regression koruması ve ara release planı **uygulanmaz**. v2 tarihi referans olarak korunur; yürürlükte olan bu dosyadır.

---

## Kütüphane Statüsü (v3 Revizyon)

- **json2ubl-ts:** Dev aşamasında. Hiçbir production sistemi tüketmiyor.
- **edocument-service:** Dev aşamasında. Prod'da yok. Kimse kullanmıyor.
- **v2.0.0 hedefi:** Feature complete dev versiyon, ilk public release.
- **Uygulanmaz:** "Breaking change" endişesi, regression test koruması, prod log analizi, downstream kullanıcı etkisi, GİB mutabakat verisi, "geçiyordu şimdi geçmiyor" senaryosu.
- **Disiplin:** `yarn test` yeşil, kod review, sprint implementation-log, kullanıcı onayı.
- **Release stratejisi:** Tek sürüm — v2.0.0, Sprint 8 sonunda tag + push. Ara tag/release yok.
- **CHANGELOG:** Dosya Sprint 8'de oluşturulur, v2.0.0 tek entry. Ara sprint'lerde yazılmaz.

---

## Değişiklik Özeti (v2 → v3)

| Alan | v2 | v3 |
|---|---|---|
| **"Breaking change" yaftası** | 8 sprint'te var | Tamamen kaldırıldı |
| **Regression/prod log** | 5+ atıf | Kaldırıldı |
| **Ara release tag'leri** | 7 ara + v2.0.0 | Yok; tek v2.0.0 |
| **CHANGELOG** | Her sprint güncelle | Sprint 8'de doğrudan v2.0.0 |
| **Agresif refactor** | Kısıtlı (BC endişesi) | Açık — aşağıda listelenmiş |
| **Risk kategorisi** | Prod etki odaklı | İş riski + zaman riski |
| **Mimsoft email** | 3 aktif + 1 opsiyonel | İptal (kullanıcı teyidi iç) |
| **Tahmini gün** | 23 | **19** (±1) |

v2'nin bulgu kategorilendirmesi (A/B/C/D/E), **M1–M10 mimari kararları**, sprint kapsamları ve alt görev listeleri v3'te aynen geçerli. v3 yalnızca **disiplin ve strateji** katmanını sadeleştirir.

---

## Agresif Refactor Kararları (v3 Yeni)

Dev bağlamında public API yüzeyi endişesi ve geriye uyumluluk kısıtı **kalkmıştır**. Aşağıdaki v2 "dikkatli" kararları v3'te agresif moda alındı:

### AR-1 `cbcTag` → `cbcRequiredTag` rename (Sprint 3, B-97)
- **v2 yaklaşımı:** İç API değişikliği — dikkatli, not düş.
- **v3 yaklaşımı:** Agresif rename. İç utility, tüketici yok. `cbcTag` signature'ı değişsin; required element için boş değer gelirse throw eden `cbcRequiredTag` ayrı bir utility olarak yazılsın, opsiyonel alan yazımı `cbcOptionalTag` ile netleşsin. Eski `cbcTag` kalkabilir.

### AR-2 `driverPerson` → `driverPersons[]` (Sprint 6, B-51)
- **v2 yaklaşımı:** Geriye uyumluluk için tekil fallback tutulabilir.
- **v3 yaklaşımı:** Fallback yok, direkt array. Tekil alan kaldırılsın. Input tipinde `driverPersons: DriverPerson[]`; tek sürücü varsa tek elemanlı array verilir.

### AR-3 `PROFILE_TYPE_MAP` export statüsü (Sprint 1)
- **v2 yaklaşımı:** Public export korunur (backward compat).
- **v3 yaklaşımı:** Hiç export **edilmesin**. Rules.ts içinde private kalsın. Public API yüzeyi minimize.

### AR-4 `PROFILE_TYPE_MATRIX` export statüsü (Sprint 1, M1)
- **v2 yaklaşımı:** `index.ts` üzerinden public export.
- **v3 yaklaşımı:** Matris **export edilmesin**. Sadece helper fonksiyonları (`getAllowedTypes(profileId)`, `getAllowedProfiles(typeCode)`) public olsun. Tüketici veri yapısına değil API'ye bağlansın.

### AR-5 `B-40 PayableRoundingAmount` (Sprint 4)
- **v2 yaklaşımı:** M9 uyarınca iptal; "kullanıcı talep ederse opsiyonel."
- **v3 yaklaşımı:** **Tam iptal.** Kodda varsa kaldırılsın, gelecekte talep gelirse eklenir. Opsiyonel kalıntı bırakma.

### AR-6 `B-90 PaymentMeansCode` eski "dead" set (Sprint 2)
- **v2 yaklaşımı:** Genişlet + TR name config (D2).
- **v3 yaklaşımı:** Değişiklik yok (v2'deki D2 kararı zaten agresif) — ama: eski dead Set **tamamen silinsin**, yeni config tek source.

### AR-7 `B-82 satır kdvExemptionCode` (Sprint 4, v2'de İPTAL)
- **v3 yaklaşımı:** v2 ile aynı (İPTAL). Ama bu sefer `InvoiceLineInput` tipinde bu alan **hiç var mı** — varsa silinsin, yoksa not. (Kullanıcı: "SimpleInvoiceBuilder tek kod desteği devam.")

### AR-8 `B-50 Outstanding/Oversupply` (Sprint 6, v2'de İPTAL)
- **v3 yaklaşımı:** Input tipinde `outstandingQuantity`, `oversupplyQuantity`, `outstandingReason` alanları **varsa silinsin**. v2'de "ekleme" diyordu; v3'te "varsa kaldır" — public yüzey temizlensin.

### AR-9 Reactive InvoiceSession — kullanıcı girişi akış tabanlı validator feedback (Sprint 8c, isim konulma)
- **Durum:** Sprint 8c'de yalnızca isim konuldu; tasarım notu `audit/reactive-session-design-notes.md` dosyasına yazılacak. **Kod değişikliği v2.1.0 sprintinde** uygulanacak.
- **Motivasyon:** Kullanıcı TEVKIFAT tipi seçtiğinde withholding alanı aktifleşir; KDV=0 kalem girerse exemption code dropdown açılır; 351 default önerilir; tip/profil seçimi alan aktivasyon/zorunluluk kurallarını canlı değiştirir.
- **Kapsam:** Mevcut `src/invoice-session.ts` (M10 state snapshot validator) dokunulmaz; reactive katman yeni modül olacak. Event-driven API (InvoiceSession.on('fieldChanged', fn) + sessionMachine state transitions).

**Toplam agresif refactor kararı:** 9 (AR-1 ... AR-9).

---

## Kategori Özeti (v2'den Aynen Devralındı)

| Kategori | Sayı | Açıklama |
|---|---|---|
| **A** İptal edilen bulgu | 4 | B-16, B-50, B-75, B-82, B-103 |
| **B** Sorgulanan bulgu | 2 | B-15 korunur, B-17/B-T04 iç teyit bekler |
| **C** Mimarisi değişen | 8 karar, ~18 bulgu | C1–C8 |
| **D** Tasarımı genişleyen | 2 | B-60 (paketleme), B-90 (ödeme) |
| **E** Değişmeyen | ~85 | Öneri doğrudan onaylandı |

Detay için **v2 Kategori A–E** bölümü aynen geçerli (bkz. `FIX-PLANI-v2.md` satır 25–355). v3 farkı: hiçbir karar için "breaking change" değerlendirmesi yapılmaz.

### Tüketici Durumu (Her C/D Kararı İçin)

Tek cümle her yerde geçerli:

> **Tüketici durumu:** edocument-service dev aşamasında, paketi yeni versiyonla günceller. Kırılma endişesi yok.

Bu cümle v2'deki "Breaking: Evet/Hayır" satırlarının yerine geçer.

---

## Mimari Kararlar (M1–M10, v2'den Devralındı)

M1–M10 tanımları v2'de (satır 359–388) verildi. v3'te hepsi aynen geçerli. Aşağıdaki tek revizyon:

- **M1 (PROFILE_TYPE_MATRIX tek truth source):** AR-3 ve AR-4 uyarınca hem `PROFILE_TYPE_MAP` hem `PROFILE_TYPE_MATRIX` **export edilmez**. Yalnızca helper API dışa açık.
- **M9 (Yuvarlama):** AR-5 uyarınca `B-40 PayableRoundingAmount` **tam iptal** (opsiyonel kalıntı yok).

### M11 Self-Exemption Types — Manuel 351 Politikası (Sprint 8c)

**Karar:** Kendi istisna kodlarını taşıyan fatura tip/profilleri bir whitelist'te toplanır; dışındaki tüm fatura tiplerinde **KDV=0 kalem için kullanıcıdan manuel istisna kodu (varsayılan 351)** zorunludur. Kütüphane 351'i otomatik atamaz.

- **Self-exemption tipleri:** ISTISNA, YTBISTISNA, IHRACKAYITLI, OZELMATRAH
- **Self-exemption profilleri:** IHRACAT, YOLCUBERABERFATURA, OZELFATURA, YATIRIMTESVIK
- **Dosya:** `src/config/self-exemption-types.ts` (yeni, Sprint 8c.3)
- **Validator:** `src/validators/manual-exemption-validator.ts` (yeni, Sprint 8c.1)
- **Gerekçe:** Önceki davranışta calculator `DEFAULT_EXEMPTIONS.satis = '351'` atıyordu; TEVKIFAT gibi self-exemption olmayan tiplerde `requiresZeroKdvLine: true` kuralıyla false-positive çakışma oluşuyordu (B-NEW-11). Kök çözüm: atama kaldırıldı, kontrol validator'a taşındı.
- **Ek kurallar:** Aynı kalemde `kdvPercent=0` + `withholdingTaxCode` → `WITHHOLDING_INCOMPATIBLE_WITH_ZERO_KDV`; `kdvPercent>0` + kalem kodu `'351'` → `EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV`.

**Toplam mimari karar:** 11 (M1 ... M11).

---

## Revize Sprint Yapısı (v3)

Her sprint için sabit disiplin:

- Sprint bağlamı: kapsam + mimari karar referansları
- Plan modu (önce plan üret, kullanıcı onayı)
- İmplementasyon
- `yarn test` yeşil + sprint implementation-log (`audit/sprint-0X-implementation-log.md`)
- Commit + push
- **Tag yok, release yok** (Sprint 8 hariç)

---

### Sprint 1 — Matris Tekleştirme (2 gün)

**Kapsanan Bulgular:** B-01, B-02, B-21, B-22, B-23, B-54, B-55, B-56, B-77

**Ana kararlar:**
- M1: `PROFILE_TYPE_MATRIX` tek truth; `PROFILE_TYPE_MAP`, `TYPE_PROFILE_MAP` helper türevli
- M2: IHRACAT/YOLCU/OZELFATURA → sadece ISTISNA
- AR-3/AR-4: matrix ve map **public export edilmez**, sadece `getAllowedTypes()/getAllowedProfiles()` helper'ları dışa açık
- Opsiyonel: M8 (CustomizationID TR1.2) bu sprint'te çözülebilir (tek sabit değişikliği)

**Alt görevler:**
- `constants.ts:PROFILE_TYPE_MATRIX` güncelle
- `rules.ts:deriveProfileTypeMap` helper yaz; `PROFILE_TYPE_MAP` artık türevli
- `TYPE_PROFILE_MAP` ters türev
- `index.ts` ve barrel dosyalarından matris/map export'larını kaldır; sadece helper'ları expose et
- Test güncellemesi (B-01, B-02 testleri)

**Çıktılar:** `audit/sprint-01-implementation-log.md`

**Tüketici durumu:** edocument-service dev aşamasında. Paketi yeni versiyonla günceller. Kırılma endişesi yok.

**Release:** **yok.** Commit + push. Sprint sonu review.

**Not (v2'den fark):** v2'de Sprint 1 `CHANGELOG.md` oluşturuyordu — v3'te kaldırıldı. CHANGELOG Sprint 8'de.

---

### Sprint 2 — Kod Listeleri + Config-Data-Source (3 gün)

**Kapsanan Bulgular:** B-03, B-04, B-05, B-24, B-25, B-26, B-27, B-28, B-57, B-58, B-59, B-60, B-61, B-88, B-89, B-90, B-101

**Ana kararlar:**
- M3: Tevkifat 650 dinamik yüzde mekanizması
- M4: 555 `BuilderOptions.allowReducedKdvRate` flag (default false)
- M7: Constants Set'leri config'den türetilsin (`new Set(CONFIG.map(...))`)
- D1: `calculator/package-type-code-config.ts` (27 kod + TR name)
- D2/AR-6: `calculator/payment-means-config.ts` (en sık 7 kod + TR name); eski dead set **tamamen silinsin**

**Alt görevler:**
- `BuilderOptions.allowReducedKdvRate?: boolean` tip ekle
- `withholding-config.ts` 650 için `type: 'dynamic_percent'`
- `InvoiceLineInput.withholdingTaxPercent?: number` (kod 650 ile zorunlu)
- `package-type-code-config.ts` yeni dosya
- `payment-means-config.ts` yeni dosya
- Constants Set türevleri
- `NON_ISTISNA_REASON_CODES = new Set(['351'])` ayrı set

**Tüketici durumu:** edocument-service dev aşamasında. Yeni opsiyonlar eklendiğinde günceller.

**Release:** yok. Commit + push.

---

### Sprint 3 — XSD Sequence + Parent-Child Conditional Required (3 gün)

**Kapsanan Bulgular:** B-09..B-14, B-18, B-20, B-32, B-33, B-34, B-35, B-70, B-94, B-96, B-97, B-99

**Ana kararlar:**
- M6: Parent opsiyonel, parent verilirse child zorunlu
- AR-1: `cbcTag` → `cbcRequiredTag` + `cbcOptionalTag` split (agresif rename)
- XSD sequence hizalamaları (B-09..B-14, B-20, vb.)

**Alt görevler:**
- Input tipi — parent optional, child required pattern
  - `DocumentReference`, `OrderReference`, `Party`, `PostalAddress`, `PaymentMeans`, vb.
- Runtime validator — parent var + child eksik kontrol
- Utility refactor — `cbcRequiredTag` (required + boş → throw), `cbcOptionalTag` (opsiyonel), `cbcTag` kaldır
- TS tip testleri

**Tüketici durumu:** edocument-service dev aşamasında. Input şekli netleşir, compile-time daha strict olur.

**Release:** yok. Commit + push.

**Not:** v2'de 4 gün idi; XSD sequence mekanik iş + agresif rename paralel giderse 3 güne sığar. Tahmin tutmazsa Sprint 4'ten bir gün ödünç alınır.

---

### Sprint 4 — Calculator Aritmetik + Yuvarlama (3 gün)

**Kapsanan Bulgular:** B-15, B-17(askıda), B-41, B-42, B-43, B-44, B-45, B-46, B-47, B-76, B-79, B-80, B-81, B-83
**İptal:** B-16, B-40 (AR-5 tam iptal), B-75, B-82
**Askıda (iç teyit):** B-17, B-T04

**Ana kararlar:**
- M9: Calculator tam float, yuvarlama yok; serializer'da `toFixed(n)` XSD-yuvarlamalı key'lerde
- M10: `setLiability()` `isExport=true` iken no-op (error yerine)
- B-15: `document-calculator.ts:107` → iskonto sonrası değeri kullan; `lineExtensionForMonetary` alanı gözden geçir (silinebilir)
- AR-5: `B-40 PayableRoundingAmount` **tam iptal** — kod ve test kalıntıları temizlensin
- AR-7: `InvoiceLineInput` üzerinde satır-seviyesi `kdvExemptionCode` alanı **varsa silinsin**

**Alt görevler:**
- `tax-serializer.ts` — percent için `formatDecimal(value, 2)`
- `xml-helpers.ts` — tek yerde amount formatter `toFixed(2)`
- Calculator dosyalarında `toFixed`/`Math.round` kullanımını sil
- `document-calculator.ts:107` düzeltmesi (B-15)
- `invoice-session.ts:setLiability` — `if (this.isExport) return this;`
- `invoice-rules.ts:resolveProfile` — `isExport=true` → IHRACAT zorla

**Test stratejisi:**
- Unit/integration test yeterli (dev aşamasında, prod mutabakatı yok)
- Manuel XML üretim testi gereksiz; canonical fatura-diff opsiyonel

**Tüketici durumu:** edocument-service dev aşamasında. Yuvarlama davranışı değişir; tüketici yeni float+yazım anında yuvarlama modeliyle entegre olur.

**Release:** yok. Commit + push.

**B-17 askıda:** Sprint 4 başlarken kullanıcı stopaj aritmetik davranışını iç olarak teyit eder (Mimsoft email iptal; cevap iç). Teyit sonrası B-17 ya iptal edilir (mevcut davranış doğru) ya da ayrı bir mini-fix olarak uygulanır.

---

### Sprint 5 — Validator Kapsamı + TaxExemption Cross-Check (3 gün) — **TAMAMLANDI (2026-04-22)**

**Uygulanan Bulgular:** B-06, B-07, B-08, M5, Açık Soru #14 (CustomsDeclaration).

**Sprint 5'te kapsam dışı bırakılanlar (Sprint 6+'e ertelendi):**
B-29..B-31, B-62..B-69, B-78, B-84..B-86, B-91, B-104 — kullanıcı prompt'u sadece
B-06/07/08 + M5 + Açık Soru #14 vurguladığı için geri kalanı Sprint 6+ kapsamında
ele alınacak.

**Ana kararlar (uygulandı):**
- M5: 351 full cross-check — `TAX_EXEMPTION_MATRIX['351']` allowed (SATIS/TEVKIFAT/
  KOMISYONCU/HKS*/KONAKLAMAVERGISI/TEKNOLOJIDESTEK/YTBSATIS/YTBTEVKIFAT/**SGK**)
  + forbidden (ISTISNA/IADE/YTBISTISNA/YTBIADE/TEVKIFATIADE/YTBTEVKIFATIADE/**IHRACKAYITLI**)
  + `requiresZeroKdvLine: true`. Kullanıcı SGK+351 izinli, IHRACKAYITLI+351 yasak
  dedi (ACIK-SORULAR #12 + Sprint 5 Soru 2 cevabı).
- 555 validator: Sprint 2'de M4 flag ile bypass zaten uygulanmış; matris'te 555
  entry yok (UNKNOWN_EXEMPTION_CODE dönerse M4 bypass'ı ayrı kontrolde).
- B-07: `validateIhrackayitli702` + CustomsDeclaration input/serializer birleşik.
- B-08: `validateYatirimTesvikKdvDocument` + `validateYatirimTesvikKdvLine` + Harcama
  Tipi 03/04 ek kural.
- **B-83 Sprint 8'e ertelendi** (kullanıcı cevabı — serializer tema uyumsuz).

**Commit tablosu:** Sprint 5.1 (2448eb6) → 5.2 (df4e6a0) → 5.3 (fc16d37, B-07+B-14 birleşik) →
5.5 (8c63d6f) → 5.7 (implementation-log). Sprint 5.6 KamuFaturaCheck Sprint 1'de
zaten uygulanmış olduğu için ek commit açılmadı.

**Test artışı:** 375 → 503 (+128 test, 29 dosya).

**Detay:** `audit/sprint-05-implementation-log.md`.

---

### Sprint 6 — Despatch Extensions (3 gün)

**Kapsanan Bulgular:** B-19, B-36..B-39, B-48, B-49, B-51, B-52, B-53, B-71..B-74, B-98, B-100
**İptal:** B-50 (+ AR-8: tipte varsa alanlar silinsin)

**Ana kararlar:**
- M8: `UBL_CUSTOMIZATION_ID = 'TR1.2'` tek sabit (Fatura + İrsaliye)
- AR-2: `driverPerson` → `driverPersons[]` (fallback yok, direkt array)
- AR-8: Input tipinde `outstandingQuantity`/`oversupplyQuantity`/`outstandingReason` varsa **silinsin**

**Alt görevler:**
- `namespaces.ts:28` — `UBL_CUSTOMIZATION_ID = 'TR1.2'`
- `INVOICE_CUSTOMIZATION_ID`/`DESPATCH_CUSTOMIZATION_ID` ayrı sabitler olmasın
- Input tipinde `driverPersons: DriverPerson[]`; serializer array üzerinden yazım
- Outstanding/Oversupply alanları temizle
- B-19 (DespatchContact), B-49 (DORSE path) — kullanıcı iç teyidi sonrası karara bağlanır

**Tüketici durumu:** edocument-service dev aşamasında. Despatch input şekli array-tabanlı olur.

**Release:** yok. Commit + push.

**B-19 ve B-49 askıda:** Sprint 6 başlamadan kullanıcı Mimsoft kodunu incelep DespatchContact zorunluluğunu ve DORSE canonical path'i iç olarak netleştirir. Mimsoft email iptal.

---

### Sprint 7 — Test Güncellemeleri (1-2 gün)

**Kapsanan Bulgular:** B-T01, B-T02, B-T03, B-T04(askıda), B-T05..B-T10, B-87

**Ana kararlar:**
- B-T03 (1000 → 850): B-15 düzeltmesi sonrası güncelle
- B-T04 (stopaj test): B-17 iç teyidine göre güncelle veya koru
- Genel: XSD sequence, tip değişiklikleri, validator genişlemesi sonrası test beklentilerini hizala

**Alt görevler:**
- Her Sprint 1-6 değişikliğinin test beklentisi hizalanması
- Yeni eklenen kurallar için minimum test kapsamı
- Eski testlerde "expect" değerlerinin revize edilmesi
- Kırmızı testleri yeşile al

**Tüketici durumu:** Dev aşamasında. Test suite sağlığı doğrudan geliştirme döngüsünü etkiler.

**Release:** yok. Commit + push.

**Not:** v2'de 2 gün, kapsam dar. "Prod regression suite" ve "GİB mutabakat" atıfları temizlendikten sonra 1-2 gün yeterli.

---

### Sprint 8 — Dokümantasyon + Skill + CHANGELOG + v2.0.0 Release (2 gün)

> **Not (Sprint 8b.0, 2026-04-23):** Orijinal Sprint 8 üç alt-sprinte ayrıldı:
> - **Sprint 8a** (tamamlandı, commit `966a049`): Devir bulgu temizliği + cross-cutting + Mimsoft fixture regresyon. Kapsanan: B-92 ✅, B-94 ✅. 641/641 test yeşil.
> - **Sprint 8b** (tamamlandı, commit `076946e`): Comprehensive Examples Pack + README Sorumluluk Matrisi + CHANGELOG v2.0.0 + skill doc updates + dead code cleanup. Kapsanan: B-93 ✅, B-95 ✅, B-96 ✅, B-102 ✅, B-S01..B-S05 ✅. 755/755 test yeşil. Keşif: B-NEW-01..12 (`audit/b-new-audit.md`).
> - **Sprint 8c** (devam ediyor, 2026-04-24 başladı): B-NEW-01..14 hotfix dalgası + M11 (Manuel 351) + AR-9 (Reactive InvoiceSession isim) + 9/9 workaround senaryo strict mode + `package.json` 1.4.2 → 2.0.0 bump + `git tag v2.0.0` + npm publish + GitHub release notes. 14 atomik alt-commit. Plan: `audit/sprint-08c-plan.md`, Log: `audit/sprint-08c-implementation-log.md`. Hedef: 755 → ~884 test. Yeni B-NEW-13 (YOLCU passport) ve B-NEW-14 (IDIS ETIKETNO) sprint 8c'de tanımlanır + düzeltilir.

**Kapsanan Bulgular:** B-92 ✅, B-93 (→ 8b), B-94 ✅, B-95 (→ 8b), B-96 (→ 8b), B-102 (→ 8b), B-S01..B-S05 (→ 8b)
**İptal:** B-103 (Kategori A)

**Ana kararlar:**
- README — Sorumluluk Matrisi'ne 555 flag (M4), 650 dinamik (M3), isExport+liability (M10), yuvarlama (M9) eklensin
- Skill `kod-listeleri-ubl-tr-v1.42.md §4.9` — 650 iç çelişki + kütüphane yaklaşımı
- Skill `e-fatura-ubl-tr-v1.0.md §77` — Fatura + İrsaliye ikisi de TR1.2
- **CHANGELOG.md oluştur** — bu sprint'te ilk kez yazılır
- **package.json** 1.4.2 → 2.0.0 bump
- **git tag v2.0.0** + push

**Alt görevler:**
- README revize
- Skill dokümanları güncelle
- Sprint 1–7 implementation-log dosyalarını tek bir v2.0.0 CHANGELOG entry'sine konsolide et
  - Format: `## [2.0.0] - 2026-XX-XX` (Sprint 8 kapanış tarihi)
  - Kategoriler: Added / Changed / Removed / Fixed
  - "Unreleased" başlığı yok; doğrudan v2.0.0
- `package.json` version bump
- Git tag atma, remote push

**CHANGELOG İçeriği (Önizleme):**
```markdown
## [2.0.0] - 2026-XX-XX

İlk feature complete public release.

### Added
- 650 dinamik yüzde tevkifat mekanizması (M3)
- `BuilderOptions.allowReducedKdvRate` flag (M4, 555 kodu için)
- `package-type-code-config.ts` ve `payment-means-config.ts` (D1/D2)
- Parent-child conditional runtime validator (M6)
- `cbcRequiredTag`/`cbcOptionalTag` utility split (AR-1)
- IHRACKAYITLI+702, YatirimTesvikKDVCheck/LineKDVCheck validator'ları (B-07, B-08)

### Changed
- `PROFILE_TYPE_MATRIX` artık tek truth source (M1); matrix ve map export edilmez, helper API kullanılır (AR-3/AR-4)
- IHRACAT/YOLCU/OZELFATURA profilleri yalnızca ISTISNA tipi kabul eder (M2)
- CustomizationID hem Fatura hem İrsaliye için TR1.2 tek sabit (M8)
- Calculator tam float; yuvarlama yalnızca XML yazım anında (M9)
- `setLiability()` `isExport=true` iken no-op (M10)
- `LegalMonetaryTotal.LineExtensionAmount` artık iskonto sonrası (B-15)
- 351 kodu non-ISTISNA tiplerine bağlandı; SATIS+351 doğru kombinasyon (M5)
- `driverPerson` → `driverPersons[]` array (AR-2)

### Removed
- `B-40 PayableRoundingAmount` desteği (AR-5, M9 sonucu gereksiz)
- Outstanding/Oversupply input alanları (AR-8)
- Satır-seviyesi `kdvExemptionCode` alanı varsa (AR-7)
- Eski dead PaymentMeansCode set (AR-6)
- `cbcTag` eski utility (AR-1)

### Fixed
- TICARIFATURA+IADE, HKS profili tip isimleri (B-01, B-02)
- TaxExemption 10 geçersiz kod (B-03)
- WithholdingTaxTypeWithPercent Codelist uyumsuzluğu (B-04)
- Diğer XSD sequence, validator, serializer bulguları (60+ item)
```

**Tüketici durumu:** edocument-service yeni sürüme `yarn add json2ubl-ts@2.0.0` ile geçer. Dev iterasyonu devam eder.

**Release:** **v2.0.0** (feature complete, ilk public sürüm). Git tag + push + npm publish (opsiyonel, kullanıcı kararı).

---

## Yeni Toplam Metrikler (v3)

| Metrik | v1 | v2 | v3 | Fark (v2→v3) |
|---|---|---|---|---|
| Net bulgu | 112 | 108 | 108 | 0 |
| Tahmini sprint | 8 | 8 | 8 | 0 |
| Tahmini gün | 22 | 23 | **19** | **−4** |
| Ara release tag | 7 | 7 | **0** | **−7** |
| Mimsoft email maddesi | 9 | 3 (+1) | **0** | **−3** |
| Agresif refactor kararı | — | — | **8** | yeni |
| CHANGELOG yazım anı | her sprint | her sprint | **Sprint 8** | ertelendi |

### Gün Dağılımı (Sprint Bazlı, v3)

| Sprint | v2 | v3 | Fark | Neden |
|---|---|---|---|---|
| 1 | 2 | 2 | 0 | — |
| 2 | 3 | 3 | 0 | — |
| 3 | 4 | 3 | −1 | Agresif rename paralel, BC endişesi yok |
| 4 | 3 | 3 | 0 | B-17 iç teyide bağlı |
| 5 | 4 | 3 | −1 | Prod regression atıfı kalktı |
| 6 | 3 | 3 | 0 | — |
| 7 | 2 | 1-2 | −0.5 | Kapsam dar |
| 8 | 2 | 2 | 0 | CHANGELOG konsolide + release |
| **Toplam** | **23** | **19** | **−4** | |

---

## Sorgulanan Bulgular (İç Teyit Bekleyen, Mimsoft Email İptal)

| Bulgu | Durum | Çözüm yolu |
|---|---|---|
| B-17 Stopaj aritmetik | Muhtemelen iptal (calculator doğru) | Sprint 4 başlarken kullanıcı iç teyit |
| B-T04 Test beklentisi | B-17 kararına bağlı | Sprint 4–7 arasında |
| B-19 DespatchContact | Muhtemelen opsiyonel | Sprint 6 başlarken kullanıcı iç teyit |
| B-49 DORSE canonical path | Muhtemelen ikisi de kabul | Sprint 6 başlarken kullanıcı iç teyit |

**Mimsoft email:** İptal. Kullanıcı Mimsoft kodunun kendisi. Cevaplar iç inceleme ile gelecek.

---

## Risk Notları (v3)

Prod etki kategorisi yoktur. İki kategori:

### İş Riski (kütüphane yanlış çalışma olasılığı — dev'de test ile yakalanır)

| Sprint | Risk | Mitigasyon |
|---|---|---|
| 3 | XSD sequence hataları (parent-child conditional; cbcTag refactor) | Unit test kapsamı zorunlu; TS type-check strict |
| 4 | Aritmetik/yuvarlama mantığı değişiyor | Integration test kapsamı zorunlu; 0/1/2 basamak edge case |
| 5 | Validator matrisi genişliyor (351, 555, IHRACKAYITLI+702) | Cross-check test matrix; yeni matris her kural için test |

Mitigasyon tek cümle: **`yarn test` yeşil + sprint-bazlı test case eklenmesi**. Manuel üretim testi gereksiz.

### Zaman Riski (sprint tahmininin tutmama olasılığı)

| Sprint | Risk | Mitigasyon |
|---|---|---|
| 2 | Config-data-source türevi + dinamik 650 + flag mekanizması aynı sprint'te çakışıyor | 3 güne sığmazsa Sprint 3'ten gün ödünç |
| 3 | Agresif cbcTag rename + parent-child conditional paralel — tip sisteminde zincir hatası | İlk gün type-check yeşil olana kadar diğer işler beklesin |
| 4 | B-17 iç teyit Sprint 4 ortasında gelirse süreç uzar | Teyit Sprint 4 başlamadan önce istenir |
| 5 | Validator genişlemesi 3 güne sığmazsa | Sprint 7'den gün ödünç |

Toplam zaman riski: ±2 gün (19 ± 2 = 17–21 gün).

---

## Bir Sonraki Adım

**Başlangıç: Sprint 1 (Matris Tekleştirme).**

Nedenleri:
1. En küçük refactor, bağımlılık yok, 9 bulgu kapanır.
2. M1 + M2 + AR-3 + AR-4 + opsiyonel M8 birlikte uygulanabilir.
3. Downstream bağımlılık yok.

**Sprint 1 öncesi karar zorunlu (tümü netleşti):**
- Açık Soru #1 — PROFILE_TYPE_MATRIX ana truth (**onaylandı**)
- Açık Soru #2 — IHRACAT/YOLCU/OZELFATURA tek tip ISTISNA (**onaylandı — M2**)
- v3 — matrix ve map **export edilmez**, sadece helper API (**onaylandı — AR-3/AR-4**)

**Askıdaki teyitler Sprint 1'i engellemez.**

---

> **SONUÇ v3:** 108 net bulgu, 8 sprint, **19 iş günü**, **tek release: v2.0.0** (Sprint 8 sonu, feature complete, ilk public sürüm). Ara release ve breaking-change disiplini kaldırıldı. 8 agresif refactor kararı açıldı (AR-1..AR-8). Mimsoft email iptal; 4 askıdaki bulgu iç teyit ile çözülecek. CHANGELOG Sprint 8'de v2.0.0 tek entry olarak yazılır.
