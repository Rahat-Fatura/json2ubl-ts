# Sprint 8b Planı — Comprehensive Examples Pack + Docs/Release Prep

## Context

Sprint 8a tamamlandı (commit `966a049`): **641/641 test yeşil**, 108 denetim bulgusundan kod kapsamındakiler kapatıldı, mimari kararlar (M1-M10, AR-1..AR-8) kilitli. Kod **dev-complete**.

**Sorun:** Berkay (kullanıcı) 3 gündür planlama/denetim/implementation log'larıyla uğraşıyor; kütüphanenin *somut* yetenekleri kafada soyut kaldı. "SATIS+stopaj için input ne, XML ne?" sorusunun runnable karşılığı yok. Next.js v2.0.0 yeniden yazımının bloke edicisi bu.

**Sprint 8b'nin birincil hedefi:** Kütüphanenin desteklediği TÜM anlamlı senaryoları **çalıştırılabilir ders notu** olarak vermek (input.ts + input.json + output.xml + run.ts + validation-errors.ts + README per senaryo).

**İkincil:** README Sorumluluk Matrisi, CHANGELOG v2.0.0 konsolidasyonu, skill doc updates (B-S01..B-S05), dead code cleanup (B-93), stale `examples/output/` replace.

**Sprint 8c'ye bırakılan:** `package.json` 1.4.2 → 2.0.0 bump, `git tag v2.0.0`, npm publish, GitHub release notes. 8b **salt doküman + example** sprintidir — `src/` read-only.

---

## 1. Examples Pack Kapsamı

### 1.1 Mevcut `examples/` durumu (keşif sonucu)

- `examples/` altında zaten **30 senaryo** var (`output/01-temel-satis` → `output/30-iskontolu-tevkifat`).
- Dosyalar **stale**: `CustomizationID=TR1.2.1` (Fatura için yanlış — TR1.2 olmalı), boş `UBLExtensions` (kütüphane üretmemeli). Sprint 1-8a değişiklikleri yansımıyor.
- `examples/README.md` **yok**. Docümantasyon yok.
- Kaynak scriptler: `examples/run-all.ts`, `examples/scenarios.ts`, `examples/session-demo.ts` + `SimpleInvoiceBuilder` kullanıyor.

**Karar:** Mevcut `examples/*` **tamamen silinir**, yeni katalog yapısı sıfırdan kurulur. Gerekçe: (a) stale XML'ler uyumsuz, (b) yeni yapı (6-dosya-per-senaryo + input.ts) mevcut yapıdan kapsamlı, (c) felsefe farklı ("çalıştırılabilir ders notu" vs. "builder demo").

### 1.2 Yeni dizin yapısı

```
examples/
├── README.md                          # katalog (tablo formatı: NN | Profile | Tip | Feature | fixture eşleşmesi)
├── run-all.ts                         # tüm senaryoları çalıştırır, output.xml üretir
├── 01-temelfatura-satis/
│   ├── README.md                      # senaryo açıklama + feature + gotcha
│   ├── input.ts                       # tip güvenli TS input
│   ├── input.json                     # API workflow JSON
│   ├── output.xml                     # generated UBL-TR
│   ├── run.ts                         # validate + build + write (bun run)
│   └── validation-errors.ts           # 4 invalid input örneği + hata mesajı
├── 02-temelfatura-iade/
...
└── 99-showcase-*/
```

### 1.3 Senaryo listesi — **38 senaryo** (gruplama: profil bazlı)

| # | Slug | Profile | Tip | Ana Feature | Fixture Paralelliği |
|---|------|---------|-----|-------------|---------------------|
| **§1: TEMELFATURA (8)** | | | | | |
| 01 | `temelfatura-satis` | TEMELFATURA | SATIS | Temel KDV'li satış, VKN alıcı | — |
| 02 | `temelfatura-satis-gelir-stopaji` | TEMELFATURA | SATIS | %23 Gelir Vergisi Stopajı (0003) + KDV | **f10** |
| 03 | `temelfatura-satis-kurumlar-stopaji` | TEMELFATURA | SATIS | %32 Kurumlar Vergisi Stopajı (0011) + KDV | **f11** |
| 04 | `temelfatura-iade` | TEMELFATURA | IADE | BillingReference zorunlu | — |
| 05 | `temelfatura-tevkifat` | TEMELFATURA | TEVKIFAT | KDV tevkifatı (601-627) | — |
| 06 | `temelfatura-istisna-351` | TEMELFATURA | SATIS | İstisna 351 + KDV=0 (M5 requiresZeroKdvLine) | **f15** |
| 07 | `temelfatura-ihrackayitli-702` | TEMELFATURA | IHRACKAYITLI | 702 + GTİP + AlıcıDİBKod (B-07) | **f12** |
| 08 | `temelfatura-sgk` | TEMELFATURA | SGK | SGK sağlık/eczacılık kodları + KDV'li | **f16** |
| **§2: TICARIFATURA (3)** | | | | | |
| 09 | `ticarifatura-satis` | TICARIFATURA | SATIS | Ticari satış (IADE yok) | — |
| 10 | `ticarifatura-tevkifat-650-dinamik` | TICARIFATURA | TEVKIFAT | **650 dinamik stopaj** (M3, B-95) | — |
| 11 | `ticarifatura-istisna` | TICARIFATURA | ISTISNA | Ticari + 201-250 kodları | — |
| **§3: YATIRIMTESVIK (3)** | | | | | |
| 12 | `yatirimtesvik-satis-makina` | YATIRIMTESVIK | SATIS | ytbNo + ItemClass 01 (Makine) + CommodityClassification | **f13** |
| 13 | `yatirimtesvik-satis-insaat` | YATIRIMTESVIK | SATIS | ytbNo + ItemClass 02 (İnşaat) | **f14** |
| 14 | `yatirimtesvik-iade` | YATIRIMTESVIK | IADE | B-08 istisnası (YATIRIM_TESVIK_IADE_TYPES) | — |
| **§4: KAMU (3)** | | | | | |
| 15 | `kamu-satis` | KAMU | SATIS | BuyerCustomer + TR IBAN + PaymentMeans (B-83) | **f17** |
| 16 | `kamu-tevkifat` | KAMU | TEVKIFAT | KAMU + tevkifat | — |
| 17 | `kamu-ihrackayitli` | KAMU | IHRACKAYITLI | KAMU + 702 + GTİP | — |
| **§5: IHRACAT (2)** | | | | | |
| 18 | `ihracat-istisna-basic` | IHRACAT | ISTISNA | BuyerCustomer (yabancı), Supplier registrationName/taxOffice | — |
| 19 | `ihracat-istisna-multiline-incoterms` | IHRACAT | ISTISNA | Çok satırlı, INCOTERMS (FOB), LineDelivery | — |
| **§6: YOLCUBERABERFATURA (1)** | | | | | |
| 20 | `yolcu-beraber-istisna-yabanci` | YOLCUBERABERFATURA | ISTISNA | BuyerCustomer.nationalityId + passportId + TaxRepresentativeParty | — |
| **§7: EARSIVFATURA (2)** | | | | | |
| 21 | `earsiv-satis-basic` | EARSIVFATURA | SATIS | onlineSale + eArchiveInfo | — |
| 22 | `earsiv-teknolojidestek` | EARSIVFATURA | TEKNOLOJIDESTEK | IMEI/SERIMNO ek kimlikler | — |
| **§8: HKS + ILAC + ENERJI + IDIS (4)** | | | | | |
| 23 | `hks-satis` | HKS | HKSSATIS | KUNYENO (ilaç kunyesi) | — |
| 24 | `ilac-tibbicihaz-satis` | ILAC_TIBBICIHAZ | SATIS | İlaç/tıbbi cihaz ek kimlik | — |
| 25 | `enerji-sarj` | ENERJI | SARJ | Elektrik/gaz faturası | — |
| 26 | `idis-satis` | IDIS | SATIS | SEVKIYATNO (SE-XXXXXXX) + ETIKETNO | — |
| **§9: Feature Varyantları (6)** | | | | | |
| 27 | `feature-yabanci-para-eur` | TEMELFATURA | SATIS | EUR + ExchangeRate (6 ondalık) + TaxExchangeRate + paymentCurrencyCode | — |
| 28 | `feature-coklu-kdv-oranlari` | TEMELFATURA | SATIS | %1, %10, %20 tek faturada | — |
| 29 | `feature-allowance-charge` | TEMELFATURA | SATIS | Belge + satır AllowanceCharge (indirim + artırım, reason code) | — |
| 30 | `feature-555-demirbas-kdv` | TEMELFATURA | SATIS | **M4: allowReducedKdvRate flag** + 555 kodu (B-96) | — |
| 31 | `feature-4171-otv-tevkifati` | TEMELFATURA | TEVKIFAT | 4171 belge seviyesi ÖTV tevkifatı | — |
| 32 | `feature-note-orderref-payment` | TEMELFATURA | SATIS | Note[] + OrderReference + PaymentMeans + PayeeFinancialAccount | — |
| **§10: İrsaliye — Despatch (2)** | | | | | |
| 33 | `irsaliye-temel-sevk-tek-sofor` | TEMELIRSALIYE | SEVK | Sürücü + plaka + teslimat adresi | — |
| 34 | `irsaliye-temel-sevk-coklu-sofor` | TEMELIRSALIYE | SEVK | AR-2: driverPersons array + CarrierParty (B-66) | — |
| 35 | `irsaliye-matbudan` | TEMELIRSALIYE | MATBUDAN | additionalDocuments zorunlu (B-66) | — |
| 36 | `irsaliye-idis` | IDISIRSALIYE | SEVK | ETIKETNO + SEVKIYATNO | — |
| **§11: Showcase (2)** | | | | | |
| 37 | `99-showcase-everything` | TEMELFATURA | TEVKIFAT | AllowanceCharge + 3 KDV oranı + 650 dinamik + EUR + note + PaymentMeans + OrderReference + ek belgeler | — |
| 38 | `99-showcase-ihracat-full` | IHRACAT | ISTISNA | IHRACAT tam: gümrük, INCOTERMS, LineDelivery, depo adresi, yabancı BuyerCustomer, multi-line | — |

**Toplam: 38 senaryo** (32 invoice + 4 irsaliye + 2 showcase).

**Fixture paralelliği:** f10→02, f11→03, f12→07, f13→12, f14→13, f15→06, f16→08, f17→15 (8 fixture kapsandı). Kalan 30 senaryo niş/gelişmiş durumlar.

**Kapsanmayan kombinasyonlar (kasıtlı atlanan, 8c+ için):**
- TEVKIFATIADE (İade'nin özel hali — 04 + BillingReference yeterli)
- OZELMATRAH (801-812 kodları; niş, showcase'de değil ayrı sprint'te)
- EARSIVFATURA+YTB varyantları (21 ile EARSIV temsil edildi)
- KONAKLAMAVERGISI (ENERJI/HKS ile niş grup, 8c'de)
- HKSIRSALIYE (IDIS irsaliye ile despatch temsili yeterli)

### 1.4 Her senaryo klasörü içeriği (6 dosya standardı)

1. **`README.md`** — 100-200 kelime: ne yapıyor, hangi profile+tip, hangi feature'ları kapsıyor, GİB iş durumu, gotcha (örn. YTB numarası formatı).
2. **`input.ts`** — `import type { InvoiceInput } from '../../src'` + tip güvenli tam input.
3. **`input.json`** — aynı input'un JSON versiyonu (API workflow benzetimi).
4. **`output.xml`** — generated UBL-TR XML (Sprint 8a yapısıyla).
5. **`run.ts`** — `bun examples/NN-slug/run.ts` ile validate + build + write, hata durumunda console.error.
6. **`validation-errors.ts`** — **4 yanlış input örneği**:
   - 1× eksik zorunlu alan (örn. YTB'de ytbNo yok)
   - 1× tip/format bozukluğu (örn. VKN 10 hane değil)
   - 1× cross-check matrix ihlali (örn. IHRACKAYITLI'da 702 kodu ama GTİP yok)
   - 1× business rule (örn. 650 kodu ama dynamicPercent flag yok)

   Her biri `{ description, input, expectedErrors: [{ code, path, message }] }` şeklinde.

### 1.5 Showcase detayı

**Showcase 37 — `99-showcase-everything`:**
- TEMELFATURA + TEVKIFAT
- 3 satır: %1 KDV, %10 KDV, %20 KDV
- Belge AllowanceCharge (−%5 indirim) + satır AllowanceCharge (+%3 artırım)
- 650 dinamik stopaj (%25 örnek kullanıcı input)
- EUR cinsinden (ExchangeRate 32.50, TaxExchangeRate)
- Note[] 3 madde
- PaymentMeans + PayeeFinancialAccount (IBAN)
- OrderReference + BillingReference (ön avans)
- additionalDocuments (3 ek belge referansı)

**Showcase 38 — `99-showcase-ihracat-full`:**
- IHRACAT + ISTISNA
- 5 satır (çeşitli HS kodları)
- BuyerCustomer yabancı (Germany, VAT ID)
- Supplier registrationName + taxOffice
- Depo adresi (DeliveryLocation)
- INCOTERMS: FOB İzmir
- LineDelivery her satırda
- TaşıyıcıFirma
- 301/302 istisna kodları (İhracat teslimi)
- USD + ExchangeRate

---

## 2. Test Stratejisi

### 2.1 Yeni test dosyaları (3 dosya)

- **`__tests__/examples/snapshot.test.ts`** — her senaryo için: `input.ts` → build → actual XML ≡ diskteki `output.xml`. **38 test**.
- **`__tests__/examples/validation-errors.test.ts`** — her senaryonun `validation-errors.ts` içindeki 4 invalid case → validator expectedErrors karşılık vermeli. **38 × 4 = 152 test**.
- **`__tests__/examples/json-parity.test.ts`** — `input.ts` default export ≡ `JSON.parse(input.json)` (TS-JSON tutarlılığı). **38 test**.

### 2.2 Snapshot format kararı
Exact XML string match (whitespace sensitive). Mevcut fixture test suite bu yaklaşımı kullanıyor. Normalize etmez; `output.xml` diskte canonical reference.

### 2.3 Test sayısı tahmini
- **Mevcut:** 641 test yeşil (Sprint 8a çıkışı)
- **+Sprint 8b:** +228 test (38 snapshot + 152 validation-errors + 38 json-parity)
- **Sprint 8b çıkışı:** **~869 test yeşil**

---

## 3. Diğer İşler

### 3.1 Dead code cleanup (B-93)
- Grep: `ublExtensionsPlaceholder`, denetim log'unda işaretli diğer hayalet kalıntılar.
- Bulunursa sil; test suite yeşilse commit.

### 3.2 README Sorumluluk Matrisi — yeni bölüm 8
- Mevcut README'de **yok** (11 bölüm var, yeni §8 ekle).
- Yer: §7 "Hesaplama Motoru" sonrası.
- İçerik tablosu:
  | Karar | Kapsam | Referans |
  |-------|--------|----------|
  | M1 | PROFILE_TYPE_MATRIX — geçerli profil+tip | `src/calculator/invoice-rules.ts` |
  | M3 (**B-95**) | 650 dinamik stopaj — kullanıcı %0-99 girer | `src/calculator/withholding-config.ts` |
  | M4 (**B-96**) | 555 demirbaş KDV — `allowReducedKdvRate` flag | `src/builder/invoice-builder.ts` options |
  | M5 | TAX_EXEMPTION_MATRIX — istisna×tip whitelist | `src/validators/cross-check-matrix.ts` |
  | M7 | Exemption → cross-check türetme | `src/calculator/exemption-config.ts` |
  | M9 (**B-102**) | Float calc + XML 2-basamak yuvarlama | `src/serializer/*.ts` |
  | M10 (**B-102**) | isExport=true → liability ignore | `src/calculator/invoice-rules.ts` |
  | AR-1..AR-8 | Architectural refactor kararları | `audit/FIX-PLANI-v3.md` |

### 3.3 CHANGELOG.md — sıfırdan v2.0.0 entry
- Dosya **yok**, kök dizinde oluştur.
- Keep a Changelog formatı.
- Tek entry: `## [2.0.0] - 2026-04-XX`
- Alt bölümler:
  - **BREAKING CHANGES** (PROFILE_TYPE_MATRIX sıkılaştırma, TAX_EXEMPTION_MATRIX zorunluluk, 650 dinamik input zorunlu, 555 `allowReducedKdvRate` flag, IHRACKAYITLI GTİP zorunlu, YATIRIMTESVIK ytbNo format)
  - **Added** (yeni validator'lar, cross-check matrix, exemption-config derivation, calc↔serialize round-trip tests, XSD suite)
  - **Changed** (davranış değişiklikleri: 2-basamak yuvarlama, liability logic, KAMU IBAN zorunlu)
  - **Fixed** (~80 madde, bulgu ID'leriyle — Sprint 1-8a log'larından konsolide)
  - **Removed** (dead code: ublExtensionsPlaceholder, legacy serializers, iptal edilen B-16/B-50/B-75/B-82/B-103)
- Kaynak: `audit/sprint-0[1-8a]-implementation-log.md` × 8 dosya ~2100 satır → ~80-120 madde.
- Versiyon gerekçesi: CHANGELOG'un başında "1.4.2 → 2.0.0: çok sayıda breaking change, yeni validator suite, stabilize edilmiş API" notu.

### 3.4 Skill doc updates (B-S01..B-S05)
**Dosya 1:** `.claude/skills/gib-teknik-dokuman/references/kod-listeleri-ubl-tr-v1.42.md` — §4.9 (Tevkifat) sonrasına 3 alt-bölüm:
- **§4.9.3 (B-S01):** 650 Kodu İç Çelişki — GİB v1.23 changelog "3/10 eklendi" diyor, ana tabloda yok. Kütüphane yaklaşımı: dinamik oran, `dynamicPercent: true` + `userInputPercent: 0-99`.
- **§4.9.4 (B-S02):** 601-627 partial vs. 801-825 tam tevkifat ayrımı + kütüphane hesap formülü.
- **§4.9.5 (B-S03):** 555 demirbaş KDV — schematron'da var, ana matriste yok. Kütüphanede opt-in flag.

**Dosya 2:** `.claude/skills/gib-teknik-dokuman/references/e-fatura-ubl-tr-v1.0.md` — §77 sonrasına:
- **§77.1 (B-S04, B-S05):** CustomizationID sabit kuralı — Fatura: `TR1.2`, e-İrsaliye: `TR1.2.1`. Kütüphane bunu builder'da sabitler.

---

## 4. Alt-Sprint Granülaritesi (atomik commit planı)

**Plan kopya disiplini:** 8b.0'da bu plan dosyası (`~/.claude/plans/hidden-crunching-wall.md`) → `audit/sprint-08b-plan.md` olarak kaydedilir.

| Commit | Kapsam | Beklenen diff boyutu |
|--------|--------|----------------------|
| **8b.0** | Plan kopyası: `audit/sprint-08b-plan.md` + `FIX-PLANI-v3.md` 8b işaretleme | ~200 LOC yeni |
| **8b.1** | Eski `examples/*` SİL; yeni iskelet: `examples/README.md` (boş katalog), `examples/run-all.ts` (yeni versiyon — her alt klasörün `run.ts`'ini import+exec), `package.json` script güncelleme | ~500 LOC net (eski silindi, yeni iskelet) |
| **8b.2** | §1 TEMELFATURA — 8 senaryo (01-08), fixture f10/f11/f12/f15/f16 paralellikleri | ~2000 LOC (senaryo başı ~250) |
| **8b.3** | §2 TICARIFATURA (3) + §3 YATIRIMTESVIK (3) — fixture f13/f14 | ~1500 LOC |
| **8b.4** | §4 KAMU (3) + §5 IHRACAT (2) — fixture f17 | ~1250 LOC |
| **8b.5** | §6 YOLCU (1) + §7 EARSIV (2) + §8 HKS/ILAC/ENERJI/IDIS (4) | ~1750 LOC |
| **8b.6** | §9 Feature Varyantları (6) — yabancı para, çoklu KDV, AllowanceCharge, 650, 555, 4171 | ~1500 LOC |
| **8b.7** | §10 İrsaliye Despatch (4) — tek/çok şoför + MATBUDAN + IDIS | ~1000 LOC |
| **8b.8** | §11 Showcase (2) — 99-showcase-everything + 99-showcase-ihracat-full | ~1000 LOC |
| **8b.9** | `__tests__/examples/` — snapshot + validation-errors + json-parity 3 dosyası | ~500 LOC test |
| **8b.10** | Dead code cleanup (B-93 ublExtensionsPlaceholder + diğer kalıntılar) | ~50 LOC net |
| **8b.11** | README.md §8 "Sorumluluk Matrisi" + §7 M3/M4 yerleşim notları | ~150 LOC |
| **8b.12** | Skill doc updates: `kod-listeleri §4.9.3-5` + `e-fatura §77.1` | ~100 LOC |
| **8b.13** | CHANGELOG.md v2.0.0 entry (sıfırdan oluşturulur) | ~300 LOC |
| **8b.14** | `audit/sprint-08b-implementation-log.md` + Sprint 8c devir listesi | ~250 LOC |

**Toplam:** 15 atomik commit (8b.0 dahil).

Her commit: test yeşil bırakır; `bun test` + `bun run examples` (8b.1 sonrasında) lokal doğrulama.

---

## 5. Risk ve Belirsizlikler

- **R1 — Examples build süresi:** 38 senaryo × (validate + build + write) CI'da yavaş olabilir. **Mitigation:** vitest `testTimeout: 30000` + parallel workers; `examples:build` script'i test-independent çalışabilsin.

- **R2 — CustomizationID kafa karışıklığı:** Mevcut 30 örneğin XML'i `TR1.2.1`. Yeni Fatura XML'leri `TR1.2`, İrsaliye `TR1.2.1`. **Mitigation:** `examples/README.md`'de açıkça belirt; her irsaliye senaryo README'sinde uyarı.

- **R3 — YATIRIMTESVIK ytbNo fiktif değer:** Mimsoft fixture'ından aynı numarayı kullan (6 haneli, format kontrolü sadece). GİB testnet geçerliliği Sprint 8c smoke'una bırakılır.

- **R4 — 650 dinamik stopaj error mesajı belirsizliği:** `validation-errors.ts`'de beklenen hata mesajları validator'ın gerçek çıktısıyla 1-1 eşleşmeli. **Mitigation:** 8b.2-8b.8 yazım sırasında her invalid case'i gerçekten çalıştır, actual error'ı `expectedErrors`'a yaz.

- **R5 — Mimsoft fixture 1-1 eşleşme yapısal:** Tarih/ID/vergi dairesi farklı olacak (fiktif değerler). **Hedef:** Yapı aynı (aynı element ağacı, aynı tax subtotal'lar), tutarlar yakın. README'de belirt.

- **R6 — Snapshot test formatı:** Exact XML match. Format farkı (attribute sıralama, indent) fail'e sebep olur. **Mitigation:** Serializer deterministik (Sprint 7'de stabilize). Eğer CI'da cross-platform newline sorunu çıkarsa normalize utility eklenir (8b.9'da karar).

- **R7 — src/ read-only disiplin:** Örnek yazarken bug keşfedilirse `audit/ACIK-SORULAR.md`'a yaz, 8b kapsamına alma. **Post-8b hotfix** (8c öncesi).

- **R8 — Skill doc lokasyonu:** Skill dosyaları farklı repo'da (`sisteminiz-integrator-infrastructure/.claude/skills/`). **Mitigation:** 8b.12 commit'i ana repo'da değil skill repo'sunda yapılır; ana repo log'u bu dış commit'e referans verir.

- **R9 — Despatch test fixture'ı yok:** `__tests__/fixtures/` altında despatch örneği yok. **Mitigation:** 8b.7'de irsaliye senaryolarının output.xml'i snapshot olarak rol üstlenir. Sprint 8c opsiyonel fixture ekleme.

---

## 6. Disiplin

- **Mimari karar:** Yeni M/AR çıkmaz. Örnek yazarken çıkan sorular `audit/ACIK-SORULAR.md`'a eklenir (yeni §4 "Sprint 8b sırasında çıkan sorular"); Sprint 8c'de cevaplanır.
- **`src/` read-only:** Bug bulunursa log'a; 8b hotfix değil.
- **Plan kopya pattern'i:** 8b.0'da bu plan `audit/sprint-08b-plan.md`'ye kopyalanır (memory `feedback_sprint_plan_pattern.md` gereği).
- **XSD vs. runtime:** `validation-errors.ts`'deki invalid case'ler sadece runtime validator ihlalleridir (XSD zaten kapar). Keyfi runtime zorunluluk icat edilmez (memory `feedback_runtime_vs_xsd_rules.md`).

---

## 7. Test Sayısı Tahmini

- Sprint 8a: **641 test yeşil**
- Sprint 8b eklemeler: **+228 test**
  - 38 snapshot (XML eşleşme)
  - 152 validation-errors (38 × 4)
  - 38 json-parity (TS ≡ JSON)
- **Sprint 8b çıkışı: ~869 test yeşil**

---

## 8. Tahmini Süre

| Faz | Süre |
|-----|------|
| 8b.0-8b.1 (iskelet + yapı) | 1 gün |
| 8b.2-8b.8 (38 senaryo yazımı ~1h/senaryo + fixture karşılaştırma) | 4 gün |
| 8b.9 (test suite) | 1 gün |
| 8b.10-8b.14 (cleanup + doc finalize + log) | 2 gün |
| **Toplam** | **~7-8 gün** |

---

## 9. Sprint 8c'ye Devir Listesi

- `package.json` version bump: 1.4.2 → 2.0.0
- `git tag v2.0.0` + `npm publish --dry-run` (smoke) → `npm publish`
- GitHub release notes (CHANGELOG v2.0.0 entry'sinden kopya)
- 8b'de `audit/ACIK-SORULAR.md` yeni §4'e eklenmiş soruların cevaplanması
- 8b'de `src/` bug keşfi hotfix'leri (varsa)
- Despatch `__tests__/fixtures/` eklenmesi (opsiyonel, 8b examples/irsaliye yeterli olmuyorsa)
- Next.js v2.0.0 yeniden yazımında kütüphaneyi gerçek kullanım (Sprint 8b examples canlı tüketim — acceptance signal)

---

## 10. Kritik Dosya Referansları

**Okunacak (kaynak):**
- `src/calculator/invoice-rules.ts` — PROFILE_TYPE_MATRIX (M1)
- `src/calculator/tax-config.ts`, `withholding-config.ts`, `exemption-config.ts`
- `src/validators/cross-check-matrix.ts` — TAX_EXEMPTION_MATRIX (M5)
- `src/types/invoice-input.ts`, `src/types/despatch-input.ts`
- `__tests__/fixtures/mimsoft-real-invoices/f10-f17.xml` — altın standart
- `audit/FIX-PLANI-v3.md`, `audit/SONUC-konsolide-bulgular.md`, `audit/ACIK-SORULAR.md`
- 8 × `audit/sprint-0X-implementation-log.md` (CHANGELOG konsolidasyon kaynağı)

**Oluşturulacak:**
- `examples/` (tam rebuild — 38 senaryo × 6 dosya + README + run-all)
- `__tests__/examples/{snapshot,validation-errors,json-parity}.test.ts`
- `CHANGELOG.md` (yoktan)
- `audit/sprint-08b-plan.md` (bu planın kopyası)
- `audit/sprint-08b-implementation-log.md`

**Modifiye edilecek:**
- `README.md` — §8 "Sorumluluk Matrisi" ekleme
- `package.json` — `examples` script yenileme (versiyon bump 8c'de)
- `.claude/skills/gib-teknik-dokuman/references/kod-listeleri-ubl-tr-v1.42.md` (§4.9.3-5)
- `.claude/skills/gib-teknik-dokuman/references/e-fatura-ubl-tr-v1.0.md` (§77.1)

**Silinecek (8b.1'de):**
- `examples/output/*` (30 alt-dizin)
- `examples/run-all.ts` (eski versiyon — yeni versiyonla replace)
- `examples/scenarios.ts`, `examples/session-demo.ts`

---

## 11. Verification

- `bun test` — tümü yeşil (**~869 test**)
- `bun run examples` — tüm 38 senaryo çalışır, her birinde `output.xml` üretilir, hatasız tamamlanır
- `bun run examples/NN-slug/run.ts` — tek senaryo izolasyon çalışması
- XSD validation (Sprint 8a suite) — 38 output.xml hepsi geçer
- **Manuel smoke (acceptance):** Berkay rastgele 5 senaryoyu aç, input.ts + output.xml + README okur, "evet kütüphanem bunu böyle çözüyor" diyebilmeli
- README.md §8 + CHANGELOG.md manuel okuma, format (Keep a Changelog) kontrolü
- Skill doc updates — skill repo'sunda ayrı commit, referans ana repo log'unda

---

## 12. Açık Karar Özeti (kullanıcı prompt'undaki 18 soruya tek kelime özet)

| # | Soru | Karar |
|---|------|-------|
| 1 | Toplam senaryo sayısı | **38** |
| 2 | Numaralandırma | Profil bazlı gruplama, 01-36 + 99-showcase × 2 |
| 3 | Showcase sayısı | **2** (everything + ihracat-full) |
| 4 | Eski `examples/output/` | **Tamamen silinir, replace** |
| 5 | Snapshot test sayısı | 38 snapshot + 152 validation + 38 json-parity = **228** |
| 6 | validation-errors per senaryo | **4 yanlış örnek** (eksik/format/cross-check/business rule) |
| 7 | examples/README format | **Markdown tablo** (NN, profile, tip, feature, fixture eşleşme) |
| 8 | Stale XML regenerate | Eski `examples/output/` silinir, yeni yapıda her senaryo kendi output'unu üretir |
| 9 | README sorumluluk matrisi | **Yeni §8** ekle (yok, 11 bölümden 12'ye çıkıyor) |
| 10 | Skill doc lokasyon | `kod-listeleri §4.9.3-5` + `e-fatura §77.1` |
| 11 | CHANGELOG hacmi | ~**80-120 madde** (8 sprint log konsolide) |
| 12 | Atomik commit sayısı | **15** (8b.0 → 8b.14) |
| 13 | Süre | **7-8 gün** |
| 14 | Test sayısı | 641 → **~869** |
| 15 | Risk listesi | **R1-R9** (§5) |
| 16 | Yeni M/AR | **Yok**, çıkarsa ACIK-SORULAR §4 |
| 17 | `src/` dokunma | **Read-only**, bug → 8c hotfix |
| 18 | Plan kopya | 8b.0'da `audit/sprint-08b-plan.md` |
