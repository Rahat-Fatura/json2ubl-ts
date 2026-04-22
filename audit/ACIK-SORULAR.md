---
belge: json2ubl-ts açık sorular — karar matrisi
tarih: 2026-04-21
kaynak: audit/SONUC-konsolide-bulgular.md + audit/FIX-PLANI.md + denetim-01..06 §son bölümler
toplam_soru: 25 (konsolide)
amac: FIX-PLANI sprint'leri başlamadan önce cevaplanacak karar listesi
---

# Açık Sorular — Karar Matrisi

> 25 soru 6 denetimin sonundan toplandı ve tekrar edenler birleştirildi. Her soru için: **özü → etkilenen bulgular → karar kaynağı → öneri → yanlış karar riski**.

## Özet Tablosu

| # | Başlık | Karar Kaynağı | Sprint | Etkilenen bulgu sayısı |
|---|---|---|---|---|
| 1 | Matris truth source | Senin | S1 | 9 |
| 2 | IHRACAT/YOLCU/OZELFATURA: serbest mi kısıtlı mı | Senin | S1 | 3 |
| 3 | Signature/UBLExtensions sorumluluğu | Dış teyit (Mimsoft) | S7–S8 | 2 |
| 4 | Çift truth source (constants vs *-config) | Senin | S2 | 3 |
| 5 | WithholdingTaxTypeWithPercent stratejisi | Senin | S2 | 1 |
| 6 | Tevkifat 650 kodu | Dış teyit (Mimsoft/GİB) | S2 | 2 |
| 7 | TaxExemption 10 geçersiz kod (203/210/222/…) | Senin | S2 | 1 |
| 8 | PackagingTypeCode whitelist politikası | Senin | S2 | 1 |
| 9 | PaymentMeansCode whitelist fayda | Senin | S2 | 1 |
| 10 | 555 kodu ayrı set mi ISTISNA mı | Senin (mimari) | S2/S5 | 2 |
| 11 | Unit TWH ↔ D32 yeniden adlandırma | Senin | S2 | 2 |
| 12 | TaxExemption cross-check mimarisi | Senin (mimari) | S5 | 1 |
| 13 | InvoiceInput zorunlu alanları XSD'ye hizala | Senin | S3 | 5 |
| 14 | CustomsDeclaration input tipi | Senin | S5 | 1 |
| 15 | xsi:schemaLocation emit | Dış teyit (Mimsoft/GİB) | S3 | 0 (cevap) |
| 16 | TR1.2 vs TR1.2.1 son karar | Dış teyit (Mimsoft/GİB) | S6 | 1 |
| 17 | LineExtensionAmount semver bump | Senin | S4 | 1 |
| 18 | Stopaj UBL modeli (negatif mi AllowanceCharge mı) | Dış teyit (GİB örnekleri) | S4 | 1 |
| 19 | OZELMATRAH TaxTotal birleştirme | Senin | S4 | 1 |
| 20 | Yuvarlama stratejisi | Dış teyit (Mimsoft) | S4 | 2 |
| 21 | Satır bazlı kdvExemptionCode | Senin | S4 | 1 |
| 22 | Multi-tenant config override | Senin | S4/S8 | 1 |
| 23 | setLiability + isExport kontrat | Senin | S4 | 1 |
| 24 | Damga V. / Konaklama V. matrah düşümü | Dış teyit (mevzuat + DB) | S4 | 1 |
| 25 | Despatch 5 alt karar (Contact/DORSE/Line/Party/Kısmi) | Karışık | S6 | 5 |

---

## 1 — Matris Truth Source

**Özü:** `constants.ts:PROFILE_TYPE_MATRIX` mı `invoice-rules.ts:PROFILE_TYPE_MAP` mı tek "gerçek" olacak? İki yapı şu an divergent (8/12 profil farklı).

**Etkilenen bulgular:** B-01, B-02, B-21, B-22, B-23, B-54, B-55, B-56, B-77 (9 bulgu).

**Karar kaynağı:** **Senin** — mimari karar. D03 netleştirdi: Schematron-aligned `PROFILE_TYPE_MATRIX`.

**Öneri:** `PROFILE_TYPE_MATRIX` ana truth. `PROFILE_TYPE_MAP` → `deriveProfileTypeMap(PROFILE_TYPE_MATRIX)` helper ile türet. Kod çoğaltma yok, tek noktadan güncelleme. Ters yön `TYPE_PROFILE_MAP` de aynı matrix'ten türet (B-77 aynı anda kapanır).

**Yanlış karar riski:** Her iki source da kalırsa divergence sürer, her yeni kod eklendiğinde ikiye güncellenir, "geçiyordu şimdi geçmiyor" sürprizleri üretir. `PROFILE_TYPE_MAP`'ı seçersen Schematron uyumsuzluğu devam eder (rules.ts 8 profil yanlış).

**Yanıt:** Normatif kaynağımız ne söylüyorsa doğru matris odur. ana truth olarak belirlenen PROFILE_TYPE_MATRIX doğru ise normatif kaynağa göre, direk ana truth oluşturulup, önerindeki gibi gerekli yerler türetilsin. Bu çerçevede önerin uygulanabilir.

---

## 2 — IHRACAT/YOLCU/OZELFATURA: Serbest mi Kısıtlı mı

**Özü:** CommonSchematron bu 3 profile özel tip kısıtı KOYMUYOR. KodListeleri v1.42 "SATIS + seçmeli ISTISNA" diyor (yumuşak özet). Kütüphanede `constants.ts` serbest (TICARIFATURA kopyası), `rules.ts` kısıtlı (2-3 tip).

**Etkilenen bulgular:** B-54 (IHRACAT), B-55 (YOLCU), B-56 (OZEL).

**Karar kaynağı:** **Senin** — normatif sessiz, iki yoruma da alan var.

**Öneri:** **Serbest yorum** (constants.ts tarafı). Schematron sessizliği "her şey serbest" demek; kısıt koyarsan Schematron ihlali değil, kullanıcı alanı gereksiz daralır. IHRACAT için satır-bazlı istisna (`B-29 IHRACAT amount`) zaten ayrı validator katmanında zorlanıyor.

**Yanlış karar riski:** Kısıt koyarsan rare ama legal senaryoları (YOLCU+TEVKIFAT gibi) reddedersin; serbest bırakırsan kullanıcı yanlışlıkla KONAKLAMAVERGISI gibi yanlış tip seçebilir — ama bunu Schematron zaten başka bir kuralla yakalar (profil+tip kombinasyonu değil, içerik tabanlı).

**Yanıt:** IHRACAT/YOLCU/OZELFATURA bu üç profil için de tip sadece ISTISNA olabilir şekilde güncelleyelim. ne dökümanı, ne de normatif kaynağı dinlemiyoruz. Bu üç profilin tek tipi ISTISNA olacak.

---

## 3 — Signature/UBLExtensions Sorumluluğu

**Özü:** Kütüphane `<cac:Signature>` + `<ext:UBLExtensions>` üretmeli mi? Testler bekliyor, XSD zorunlu, `examples/output/*.xml` içeriyor — ama `invoice-serializer.ts` yorumu "business logic tarafından" diyor.

**Etkilenen bulgular:** B-T01, B-T02 (testler); dolaylı: `strict` mode kapsamı.

**Karar kaynağı:** **Dış teyit** — `edocument-service` + Mimsoft davranışı.

**Öneri:** **Kütüphane üretmez.** Mimsoft SDK `unsigned=true` flag'ı ile çağrıldığında Signature+UBLExtensions Mimsoft tarafında ekleniyor. Kütüphane sözleşmesi = "unsigned UBL"; testi kaldır, README'de **Sorumluluk Matrisi** bölümü ekle (S8).

**Yanlış karar riski:** Kütüphane placeholder üretirse Mimsoft'un kendi XAdES imzasıyla çatışır (double signature); üretmezse Mimsoft henüz unsigned=false flow'unda (GİB doğrudan) kütüphane output'u kullanan biri çöker. Risk "edocument-service her zaman Mimsoft üstünden gönderiyor mu?" cevabına bağlı.

**Yanıt:** Bu kütüphanede hiçbir şekilde `<cac:Signature>` ve `<ext:UBLExtensions>` kullanmıyor ve koymuyoruz. Testlerdeki bu kontrolü komple silelim.  Mimsoft bunları zaten ekliyor.

---

## 4 — Çift Truth Source: constants.ts Set'leri ↔ calculator/*-config

**Özü:** `constants.ts`'de validator Set'leri, `calculator/*-config.ts`'de `isValid*()` fonksiyonları + definition data. İkisi divergent: constants'ta 351 eksik, config'de var; config'de 5 tax kodu eksik, constants'ta var.

**Etkilenen bulgular:** B-25, B-26, B-61.

**Karar kaynağı:** **Senin** — hangisi "veri", hangisi "türetme"?

**Öneri:** `calculator/*-config.ts` **data source** (tek satırda hem kod hem anlam var: `{ code: '351', description: 'DEMIRBAS', ... }`). `constants.ts` Set'leri bu config'den **türetilsin** (`new Set(TAX_CONFIG.map(c => c.code))`). Config'te B-26'nın 5 eksik kodu eklendiğinde Set otomatik güncel olur.

**Yanlış karar riski:** Ters yön seçersen (constants data, config türetilmiş) description metadata kaybolur. Mevcut ikili yapıyı korursan her ekleme iki dosya değişikliği gerektirir → B-26 tipi bulgu tekrarlar.

**Yanıt:** Önerin uygulanabilir. data source *-config.ts, constants bruadan türetilsin.

---

## 5 — WithholdingTaxTypeWithPercent Dead Set Stratejisi

**Özü:** `constants.ts:130-183` WithholdingTaxTypeWithPercent Set'i tanımlı ama hiçbir validator çağırmıyor. İçeriği Codelist v1.42:17 ile uyumsuz (60120/60150/60160/60170 zaten çıkmış, 65020-65090 yok).

**Etkilenen bulgular:** B-04.

**Karar kaynağı:** **Senin.**

**Öneri:** **Canlandır + regenerate.** Codelist v1.42:17'ye göre yeniden üret, `withholding-validator`'a bağla. Dead olarak sil → B-27 (650 kodu) eklendiğinde yeniden yazmak zorunda kalırsın. WithholdingTax validasyonunun güçlendirilmesi `strict` mode kapsamını genişletir.

**Yanlış karar riski:** Sessiz silersen kullanıcı canon olmayan kombinasyon (ör. 60120 + %7) kullanır, GİB reddi gelene kadar görmez. Yanlış regenerate (Codelist yanlış okursan) legal kombinasyonları reddedersin.

**Yanıt:** Önerin uygulanabilir.

---

## 6 — Tevkifat 650 Kodu

**Özü:** Codelist v1.42 **kendi içinde çelişki**: Tevkifat §4.9 `WithholdingTaxType` satır 16'da 650 yok; satır 17 `WithholdingTaxTypeWithPercent` 650xx prefix var. Kütüphane şu an "yok" tarafında oy veriyor.

**Etkilenen bulgular:** B-27, B-S01.

**Karar kaynağı:** **Dış teyit** — Mimsoft prod log + GİB yazılı cevap.

**Öneri:** **Şu an ekleme**, Sprint 8'de skill'e çelişki notu ekle (B-S01). Paralel olarak Mimsoft'a sor: "production'da 650 ile gelen fatura var mı, varsa kaç tane, GİB'de geçiyor mu?". Cevap "evet, geçiyor" ise v2.1 patch olarak ekle.

**Yanlış karar riski:** Şimdi eklersen ve Mimsoft/GİB pratiği "650 artık yasak" ise yeni kullanıcılar production'a yanlış kod gönderir; eklemezsen ve 650 yaygınsa v1.9.0 kullanıcıları 650 kullanamadığı için başka kütüphaneye geçer.

**Yanıt:** 650 kodu sistemde var ve DİĞER etiketine sahip. Oran dinamik. Yani kullanıcı 650 seçtiğinde 0-100 arasında istediği oranı verebilmeli tevkifat için. 650XX serbest alan destekli yani aslında, oradaki xx yüzde kullanıcıdan gelecek şeklinde çalışıyor. Desteklemeli kütüphanemiz.

---

## 7 — TaxExemption 10 Geçersiz Kod (203/210/222/224/233/243-249)

**Özü:** Kütüphane whitelist'inde var olan 10 istisna kodu Codelist v1.42'de yok; changelog v1.23-v1.42 arası bu kodların "eklenip çıkarıldığına" dair iz yok → **saf hata** olma ihtimali yüksek.

**Etkilenen bulgular:** B-03.

**Karar kaynağı:** **Senin** — Codelist normatif kaynaktır, 10 kod orada yok.

**Öneri:** **Çıkar.** v2.0.0 major bump bu breaking için yer açıyor. Production'da bu kodlarla üretilmiş fatura olması (edocument-service log'undan bak) **GİB tarafında zaten reject** aldıysa breaking değil, düzeltmedir.

**Yanlış karar riski:** Bırakırsan "kütüphanede var, GİB'de yok" durumu sürer; yanlışlıkla legal bir kodu silersen → prod log analizi şart.

**Yanıt:** Önerin uygulanabilir. Direk çıkartalım.

---

## 8 — PackagingTypeCode Whitelist Politikası

**Özü:** v1.42 §4.13 Türkiye için 27 kod özetliyor; Codelist 340+ UN/ECE kodu kabul ediyor. Kütüphanede şu an validator yok (`src/types/common.ts:287` tip olarak açık).

**Etkilenen bulgular:** B-60.

**Karar kaynağı:** **Senin.**

**Öneri:** **27 kod whitelist + Codelist fallback.** `PackagingTypeCode` Set'ine 27 sık kullanılanı koy; lookup sırasında Set'te yoksa `codelist.packagingTypeCodeList.has(code)` fallback (lazy yüklü). Kullanıcıya hem güçlü default hem geniş codelist var.

**Yanlış karar riski:** Dar whitelist → nadir paket tiplerini (ör. D99 Diğer) reddedersin; hiç validator koymazsan tipo hatalarını yakalayamazsın (kullanıcı "BX1" yerine "B1X" yazarsa GİB'e gider).

**Yanıt:** Önerin uygulanabilir. Ancak kodların bir de türkçe isimlerine ihtiyaç var. yani set olarak tanımlansın ancak calculator/package-type-code-config.ts ile de code ve name olarak da detay liste verilsin. bunlar seçim aşamasında kullanıcıya gösterileceği için diğer kurgular gibi bu da ona dahil edilsin.

---

## 9 — PaymentMeansCode Whitelist Fayda

**Özü:** `PAYMENT_MEANS_CODES` tanımlı (19 sık UN/EDIFACT) ama çağrılmıyor. UN/EDIFACT 80+ kod.

**Etkilenen bulgular:** B-90.

**Karar kaynağı:** **Senin.**

**Öneri:** **Sil** (dead code). PaymentMeansCode validation faydası düşük — GİB bu alanı runtime'da zorlamıyor. `Set` + bağlama maliyeti, 19 koda sıkışma değeri doğuracak. Eğer Mimsoft pre-validation bu alanı kontrol ediyor gelirse v2.1'de geri ekle.

**Yanlış karar riski:** Bağlarsan ve kullanıcı 19 dışı kod kullanıyorsa (ör. "42" = Payment to bank account) "geçiyordu şimdi geçmiyor" breaking.

**Yanıt:** Tümü Set üzerinde desteklensin ancak aynı PackagingTypeCode kısmında analattığım gibi bununda açıklamaları lazım. Ancak açıklamalı olan sadece en sık kullanılanları, portal için kullanımda desteklenecek. Ancak tam destekte talep durumunda olmalı. Listede 1- Ödeme Tipi Muhtelif, 10- Nakit, 20-Çek, 23- Banka Çeki, 42-Havale/EFT, 48- Kredi Kartı/Banka Kartı, ZZZ- Diğer şeklinde. bunlar invoice sessionda listeye yansıtılacak datalar olacak.

---

## 10 — 555 Kodu Ayrı Set mi ISTISNA mı

**Özü:** 555 (Demirbaş KDV) Schematron:316-318 `ISTISNA/IADE/IHRACKAYITLI` tipi dışında da kabul ediliyor (satır 497-499 DemirbasKDVTaxExemptionCheck kuralı ayrı). `ISTISNA_TAX_EXEMPTION_REASON_CODES`'a eklersen cross-check (tipe-göre-kısıt) yanlış çalışır.

**Etkilenen bulgular:** B-05, B-S03.

**Karar kaynağı:** **Senin** — mimari karar.

**Öneri:** **Ayrı set:** `DEMIRBAS_KDV_EXEMPTION_CODES = new Set(['555'])`. `validateTaxExemptionReasonCode` iki set'in birleşimine bakar; cross-check matrisi (B-06) 555'i özel kategori olarak işler.

**Yanlış karar riski:** ISTISNA'ya eklersen TEVKIFAT+555 gibi legal kombinasyon cross-check'te reject alır. Hiç eklemezsen 555 kullanıcısı reject alır.

**Yanıt:** 555 ayrı kod, aslında tam istisna kodu da değil, bir gün gelir idaresi KDV oranı sınırlaması getirecek firmalar özelinde. Bir sebepten farklı KDVden kesmesi gerekirse firmanın, 555 kodu ile mesela %10 kdv kesebilecek. 555 kodundaki mantık bu. bi kdv 0 istisna kodu değil aslında ama GIB bunu TaxExemption içerisinde istiyor. Sadece KDV oranı farklı ise alacak. Bu logic bu pakedi kullanan sistemin işi bu arada kütüphaneye bu farklı kdvden kesme ile ilgili bir işlem uygulanmayacak ancak bir true false parametresi ile, yani işte mesela farklı kdvden kesecek gibi bir key ile 555 kullanılabilir kılınabilir.

---

## 11 — Unit TWH ↔ D32 Yeniden Adlandırma

**Özü:** `unit-config.ts:48` TWH = "Terawatt Saat" olarak adlandırılmış ama Codelist'te D32 = TWH semantiği. GWH/MWH/SM3 eksik.

**Etkilenen bulgular:** B-58, B-59.

**Karar kaynağı:** **Senin** — backward compat hassas.

**Öneri:** **TWH etiketini düzelt** (semantik hatalıydı) + **D32 ekle** olarak "Terawatt Saat" + **GWH/MWH/SM3 ekle**. Backward compat: TWH kodunu kaldırma, sadece etiketini düzelt (etiket string, API identity olan `code` değişmiyor).

**Yanlış karar riski:** TWH kodunu kaldırırsan var olan faturalar undefined birim yazarsa XSD fail. Etiket değişikliği UI'da "bin kilowatt saat" göstermiyorsa kullanıcı için görünmez.

**Yanıt:** Önerin uygulanabilir.

---

## 12 — TaxExemption Cross-Check Mimarisi

**Özü:** Şu an tipe-göre-dispatch (ISTISNA tipinde ISTISNA kodu beklenir). İhtiyaç: **iki yönlü** (kodu verince tip de kısıtlanmalı: 351 gelirse tip TEVKIFAT olmalı). B-06'nın çözümü bu mimariye bağlı.

**Etkilenen bulgular:** B-06 (ana), dolaylı: B-07, B-08.

**Karar kaynağı:** **Senin** — validator mimari kararı.

**Öneri:** **İki yönlü matris.** `src/validators/tax-exemption-validator.ts` yeni modül. `TAX_EXEMPTION_MATRIX`: `{ code: '351', allowedTypes: ['TEVKIFAT'], profileConstraints: [...] }`. Hem `validateByType(type, code)` hem `validateByCode(code, type)` aynı matrix'i kullanır.

**Yanlış karar riski:** Tek yönlü kalırsa "TEVKIFAT + 326" gibi legal kombine düşer ama "SATIS + 351" (yanlış) geçer. İki yönlü yaparsan matris bakım maliyeti yüksek (her yeni kod için iki tarafta test).

**Yanıt:** 351 kodu tamamen yanlış anlaşılmış. normalde faturada kalemler 0 kdvli ise ISTISNA olmalı türü ve 350ye kadar olan kodlar seçilir. 351 kodunun açıklaması "İstisna olmayan diğer". yani tipi ISTISNA olmayan herhangi bir faturada KDVsı 0 olan bir kalem var ise 351 kodu ile gönderilmeli. Yani SATIS+351 doğru. hatta kalemde kdv 0 varsa şart. Ancak ilişkilendirdiğin B-07 ve B-08 ile 351in bi alakaası yok. Oradaki IHRACKAYITLI+702 kontrolü ve desteği, YatirimTesvikKDVCheck/YatirimTesvikLineKDVCheck kuralları yok kontörlü eklenmeli direk. normatif öyle diyorsa öyle olmalı yani. 351 ile ilgili konu da anlattığım gibi işte.

---

## 13 — InvoiceInput Zorunlu Alanları XSD'ye Hizala

**Özü:** XSD'de minOccurs=1 olan elemanlar (DocumentReference.IssueDate, OrderReference.IssueDate, Party.PostalAddress, Address.CityName/CitySubdivisionName, PaymentMeans.PaymentMeansCode) TypeScript input tipinde `optional?`.

**Etkilenen bulgular:** B-32, B-33, B-34, B-35, B-70.

**Karar kaynağı:** **Senin.**

**Öneri:** **Required yap** (TS compile-time zorla). Her XSD zorunlu alan → input tipte required. Breaking change kabul edilir (v2.0.0 kapsamı). Eksik alanla gelen kullanıcı compile time'da anında görür — runtime silent fail yerine.

**Yanlış karar riski:** Optional bırakırsan cbcTag sessiz düşmeye devam eder, XSD fail'i kullanıcı prod'da görür. Required yaparsan var olan kullanıcının TS build kırılır; ama kırılması gereken şey zaten kırılıyor.

**Yanıt:** XSD zorunlu kılıyorsa biz de zorunlu kılacağız ancak çok önemli bir nokta var. Mesela DocumentReference.IssueDate evet zorunlu ancak sadece ve sadece DocumentReference var ise zorunlu. Burada bahsettiğin tüm zorunlulukların bir üst objeleri var ve onlar opsiyonel. Dolayısıyla parent obje var ancak içeriğinde eksiklik var ise şart koşulmalı. Ancak mesela, durup duruken ortada hiç DocumentReference yok iken gidip DocumentReference.IssueDate zorunlu denmemeli. bu kısım çok önemli. bu parent ilişkisi dahilinde zorunluluklar eklenecek ve yönetilebilecekse zaten direk eklensin zorunluluklar.

---

## 14 — CustomsDeclaration Input Tipi

**Özü:** Y8 serializer'da (`delivery-serializer.ts:116-133`), D03 validator'da, D04 input tipte eksik. IHRACKAYITLI + 702 senaryosu için GTİP 12 hane + ALICIDIBSATIRKOD 11 hane zorunlu.

**Etkilenen bulgular:** B-07.

**Karar kaynağı:** **Senin.**

**Öneri:** **Ekle.** `CustomsDeclaration` tipi → `InvoiceLineInput.customsDeclarations?: CustomsDeclaration[]`. Validator + serializer + input tipi 3 katmanda birlikte (Sprint 5).

**Yanlış karar riski:** Eklemezsen IHRACKAYITLI profili kütüphaneden desteklenmez (dış dünya rapor ediyor), kullanıcı başka çözüme geçer.

**Yanıt:** Öneri uygulansın.

---

## 15 — xsi:schemaLocation Emit

**Özü:** Library emit ediyor (`namespaces.ts:10`). GİB strict modda reddediyor mu?

**Etkilenen bulgular:** — (cevap belirlerse: namespace emit davranışı).

**Karar kaynağı:** **Dış teyit** — Mimsoft/GİB production davranışı.

**Öneri:** **Kaldırma, şimdilik.** Son 30+ örnekte xmllint validation geçiyor; GİB prod log'u problem göstermiyor. Mimsoft'a "xsi:schemaLocation'lı XML ile reject aldığın var mı?" sor; cevap evet ise v2.1'de kaldır.

**Yanlış karar riski:** Kaldırırsan ve GİB bunu bekliyorsa sessiz fail; kaldırmazsan ve GİB strict reject veriyorsa production error. Mevcut pratik "sorun yok" → status quo düşük risk.

**Yanıt:** Bununla alakalı hiçbir sorun yaşanmadı. Kaldırıldığında yaşanabilir o yüzden kalsın olduğu gibi.

---

## 16 — TR1.2 vs TR1.2.1 Son Karar

**Özü:** `UBL_CONSTANTS.customizationId = 'TR1.2.1'` iki belgede de kullanılıyor. Senaryo belgeleri "İrsaliye TR1.2.1" diyor, `e-fatura-ubl-tr-v1.0.md:77` "Fatura TR1.2 sabit" diyor, GİB XML örnekleri Fatura TR1.2.

**Etkilenen bulgular:** B-38.

**Karar kaynağı:** **Dış teyit** — Mimsoft + GİB örnekleri.

**Öneri:** **Fatura TR1.2, İrsaliye TR1.2.1** ayrı sabitler (`INVOICE_CUSTOMIZATION_ID` + `DESPATCH_CUSTOMIZATION_ID`). Mimsoft production log analizi ile teyit: son 100 başarılı faturada CustomizationID değeri ne? Kaybeden fatura var mı?

**Yanlış karar riski:** Yanlış değer → "eskiden geçen faturalar" reddedilir. TR1.2.1 zorla bırakırsan Fatura'da GİB'e göre geçersiz. TR1.2'ye geçersen var olan TR1.2.1 ile valid olmuş faturalar yeniden gönderimde reject alabilir.

**Yanıt:** Fatura: TR1.2, İrsaliye: TR1.2 ikisi de aynı yani. Gönderilmiş belgeler bu şekilde güncel.

---

## 17 — LineExtensionAmount Semver Bump

**Özü:** B-15: `LegalMonetaryTotal.LineExtensionAmount` iskonto öncesi → Σ satır (UBL standart). Mevcut kullanıcı iskontolu fatura için 1000 görüyor, yeni davranışta 850. Breaking.

**Etkilenen bulgular:** B-15.

**Karar kaynağı:** **Senin** — semver politikası.

**Öneri:** **v2.0.0 major bump** (FIX-PLANI gaten bu yolda). Patch sürümünde gizlice düzeltmek semver ihlali — downstream edocument-service integration test'i olmadan fark edilmeyen muhasebe tutarsızlığı üretir.

**Yanlış karar riski:** Patch bırakırsan downstream sessiz fail; v2.0.0 bump yapmazsan ve "eskiden 1000 şimdi 850" kullanıcı muhasebe sisteminde uyumsuzluk gösterir.

**Yanıt:** Yorum yanlış olabilir. LegalMonetaryTotal.LineExtensionAmount iskonto yapılmış değer, Line.LineExtensionAmount da ikonto yapılmış değer. lines toplamı doğal olarak direk eşitliği zaten sağlar. Tekrar analiz gerekli.

---

## 18 — Stopaj UBL Modeli: Negatif TaxAmount mı AllowanceCharge mı

**Özü:** Stopaj (0003/0011/9040) şu an `line-calculator.ts` karmaşık sign treatment yapıyor. XSD `xsd:decimal` negatife izin veriyor; GİB canonical pattern belirsiz.

**Etkilenen bulgular:** B-17.

**Karar kaynağı:** **Dış teyit** — GİB mevcut fatura örnekleri.

**Öneri:** **Negatif TaxAmount** (canonical UBL pattern; TaxSubtotal içinde). GİB örnekleri (skill `xmls/Fatura-Ornek*.xml`) inceleyip mutabakat. AllowanceCharge modeli semantik olarak yanlış — stopaj indirim değil, vergi.

**Yanlış karar riski:** AllowanceCharge seçersen GİB reddi (anlamsal uyumsuzluk); negatif TaxAmount seçersen edocument-service muhasebe hesaplaması "vergi toplamı" satırında negatif görür — sistem tarafında özel işlem gerekebilir.

**Yanıt:** Bazı vergiler matrahı arttırmaz düşürür. O yüzden negatif yansır. XMLe pozitif gözükür ancak matrah hesabı kdv hesabı gibi durumları indirimmiş gibi davrandırabilir. O kısımda kütüphanenin calculator ını baz alıyoruz. Bununla alakalı skills içerisinde hangi vergi kodı tutarı küçültür hangisi büyütür datası yok. Bu konuda calculator mutlak doğru.

---

## 19 — OZELMATRAH TaxTotal Birleştirme

**Özü:** `document-calculator.ts:156-174` OZELMATRAH ek subtotal üretiyor ama `taxTotalAmount`'a yansımıyor. Skill §12 "TaxTotal üç bağlam" diyor (belge, satır, monetary) — OZELMATRAH monetary context'te birleşmeli.

**Etkilenen bulgular:** B-16.

**Karar kaynağı:** **Senin.**

**Öneri:** **Ana TaxTotal'a dahil et.** `document-calculator` OZELMATRAH subtotal'ını `taxTotalAmount` ve `taxInclusiveAmount` güncellemesine çağırsın. Belge-seviyesi TaxTotal tek satır.

**Yanlış karar riski:** Ayrı TaxTotal yaparsan Σ tutarsızlık — XSD valid ama Schematron `LegalMonetaryTotal = TaxExclusive + Σ TaxTotal` kuralı fail.

**Yanıt:** Kütüphane davranışı doğru. OZELMATRAH türü kalemde belirilir ancak dip toplama yansımaz. GİB bu şekilde istiyor. Yani kalemde KDV var ancak fatura dip toplamında bu tutar dahil edilmiyor. Kütüphane doğru.

---

## 20 — Yuvarlama Stratejisi

**Özü:** Calculator float, serializer `toFixed(2)`. `Σ satır.toFixed(2) ≠ belge.toFixed(2)` senaryosu var. Banker's rounding mu round-half-away mı; satır önce mi belge önce mi?

**Etkilenen bulgular:** B-42, B-46.

**Karar kaynağı:** **Dış teyit** — Mimsoft stratejisi + GİB prod örnekleri.

**Öneri:** **Round-half-away from zero + satır önce sonra belge.** GİB örneklerinde `ROUND(x, 2)` (round-half-away) çoğunlukta. "Önce satır sonra belge": her satır 2 basamağa yuvarlanır, belge Σ yuvarlanmışların toplamı. Farklı senaryolar için `PayableRoundingAmount` ekle (B-40).

**Yanlış karar riski:** Banker's seçersen .5 durumlarda Mimsoft ile 1 kuruş fark → tutarsız pre-validation. "Tek geçiş belge" stratejisi satır Σ'sı ile belge arasında kuruş farkı.

**Yanıt:** Burası kritik. Tüm matematik hiçbir yerde hiç bir yuvarlama yapılmadan hesaplanacak. Sadece XMLe çevrilirken xsd şemasına göre direk tutarın kendisi yuvarlanacak. Hesaplamaların hiçbirinde yuvarlama yok. Yani dip toplama gidene kadar tam açık matematik. XMLde ilgili keyi yuvarlak istiyor ise sadece o data yuvarlanacak. Hesaba yansımayacak.

---

## 21 — Satır Bazlı kdvExemptionCode

**Özü:** `SimpleLineInput.kdvExemptionCode` yok. Karışık istisna senaryosu (aynı faturada 301 ve 302 farklı satırlarda) destekleniyor mu?

**Etkilenen bulgular:** B-82.

**Karar kaynağı:** **Senin.**

**Öneri:** **Ekle.** `SimpleLineInput.kdvExemptionCode?: string`. Satır kodu varsa onu kullan; yoksa fatura-seviyesi default. Karışık ihracat senaryosu gerçek kullanım (ör. bir satır 301 ISTISNA + bir satır 302 ISTISNA farklı amaç kodlarıyla).

**Yanlış karar riski:** Eklemezsen karışık senaryoda kullanıcı `InvoiceBuilder` direkt yoluna düşer → `SimpleInvoiceBuilder` kapsamı daralır. Eklersen yeni opsiyonel alan, risk düşük.

**Yanıt:** Eklemeyelim. Aynı şekilde kalsın. SimpleInvoiceBuilder tek kod desteği aynı şekilde devam.

---

## 22 — Multi-Tenant Config Override

**Özü:** `ConfigManager` singleton; paralel session A `updateTaxes()` session B'yi etkiliyor. e-entegratör multi-tenant production'da data leakage riski.

**Etkilenen bulgular:** B-103.

**Karar kaynağı:** **Senin** — production risk değerlendirmesi.

**Öneri:** **Kısa vadede README uyarısı + test izolasyonu kılavuzu (S8).** Uzun vadede (v2.1+) per-session `ConfigManager` parametresi: `InvoiceSession({ configManager?: ConfigManager })`. Global default, ama override mümkün.

**Yanlış karar riski:** Hiçbir şey yapmazsan multi-tenant prod'da "Tenant A'nın tax config'i Tenant B'nin faturasına sızdı" tipi zor debug edilir incident. Singleton'ı hemen kaldırırsan mevcut tekil tenant kullanıcıları config reload pattern'ı değiştirmek zorunda.

**Yanıt:** ConfigManager amacı tenant based bi yapı değil. Tanım kod eklenmesi çıkartılması durumunda kütüphane kodu üzerinden değil, kullanan sistemin overwrite sistemine direk eklendiğinde çalışabilmesi. Amacı hot reload aslında. Dolaysııyla zaten overwrite tüm sisteme yansımalı.

---

## 23 — setLiability + isExport Kontrat İhlali

**Özü:** `isExport=true` iken `setLiability('earchive')` → profil IHRACAT → TICARIFATURA'ya düşüyor. Sessiz davranış.

**Etkilenen bulgular:** B-44.

**Karar kaynağı:** **Senin** — API kontrat kararı.

**Öneri:** **Error fırlat.** `setLiability('earchive')` + `isExport=true` = explicit contract violation → `UblBuildError('EARCHIVE_EXPORT_CONFLICT')`. Kullanıcı ya isExport=false yapar ya başka liability seçer.

**Yanlış karar riski:** No-op seçersen kullanıcı setLiability çağrısının etki etmediğini fark etmez → yanlış profil ile gönderir. "isExport→false" otomatik flip yaparsan sessiz davranış değişimi (kullanıcı isExport'u özellikle true setlemişti).

**Yanıt:** isExport=true iken liability dikkate alınmayacak. isExport=true ise profil her zaman ihracat ve onun altında şekillenecek.

---

## 24 — Damga V. / Konaklama V. Matrah Düşümü

**Özü:** `line-calculator.ts:29-30` Damga V. / Konaklama V. KDV matrahından düşüyor. calculate-service DB `baseCalculate` flag'ı embed ediyor. Türkiye mevzuatında Damga V. normalde matrahtan düşmez.

**Etkilenen bulgular:** B-75.

**Karar kaynağı:** **Dış teyit** — Türkiye vergi mevzuatı + calculate-service DB intent.

**Öneri:** **DB flag respect, default false.** Kütüphane kendi baş vermesin; `baseCalculate` explicit geldiğinde matrahı düş. Default davranış mevzuata uygun olan (matrahtan düşmez). Vergi danışmanından yazılı onay + Mimsoft pre-validation test.

**Yanlış karar riski:** Default true bırakırsan yanlış KDV matrahı → GİB reddi veya vergi cezası (muhasebe riski ciddi). Default false yapıp DB flag'ı ignore edersen calculate-service'in beklediği hesap farklı çıkar.

**Yanıt:** Kütüphane doğru. Vergi matrahı düşülen vergiler var. Bu konuda bi değişiklik yapmıyoruz. Kütüphane devam.

---

## 25 — Despatch 5 Alt Karar (Contact/DORSE/LineCount/Party/Kısmi)

**Özü:** Sprint 6 için 5 despatch kararı tek başlık altında:

**25a. DespatchContact/Name zorunluluk** (B-19): Mimsoft bu olmadan reject ediyor mu? → **Dış teyit**, öneri: opsiyonel + uyarı.

**25b. DORSEPLAKA canonical path** (B-49): TransportEquipment mı LicensePlateID mı? → **Dış teyit**, öneri: ikisi de (yan yana) → fallback hierarchy.

**25c. LineCountNumeric İrsaliye** (B-52): Otomatik emit mi input alanı mı? → **Senin**, öneri: otomatik `input.lines.length`.

**25d. İrsaliye 3 party (Buyer/Seller/Originator)** (B-48): Hangisi? → **Senin**, öneri: üçü de opsiyonel eklenir.

**25e. Kısmi gönderim kullanım sıklığı** (B-50): Sprint 6'da mı sonra mı? → **Dış teyit** (production log), öneri: Sprint 6'da ekle (opsiyonel alan, risk düşük).

**Etkilenen bulgular:** B-19, B-48, B-49, B-50, B-52.

**Karar kaynağı:** Karışık — 2 dış teyit, 3 senin.

**Öneri:** Sprint 6 başlamadan Mimsoft'a 25a+25b+25e için tek email; 25c+25d için sprint içi karar.

**Yanlış karar riski:** 25a zorunlu yaparsan ve Mimsoft kabul ediyorsa gereksiz kısıt; 25b tek path seçersen ve Mimsoft diğerini bekliyorsa production reject. 25c otomatik yaparsan ve kullanıcı override istiyorsa API rigid; 25d sadece Buyer eklersen IHRACAT 3 party senaryosu kapanmaz.

**Yanıt:** 25abcd önerilerini uygula. 25e işlem yapmayalım eklemeye gerek yok şuanda.

---

## Sprint Öncesi Karar Öncelik Sırası

Sprint 1 başlamadan (~1 saat) karar gerekenler:
- **#1** (matris), **#2** (IHRACAT serbest)

Sprint 2 başlamadan (~30 dakika):
- **#4** (çift source), **#5** (Withholding), **#7** (10 kod çıkar), **#8** (Packaging), **#9** (PaymentMeans), **#10** (555 ayrı set), **#11** (TWH/D32)

Mimsoft email (paralel, Sprint 2'den önce başlat):
- **#6** (650), **#16** (TR1.2), **#25a+b+e** (Despatch dış teyit), **#18** (Stopaj), **#20** (Yuvarlama), **#15** (xsi:schemaLocation), **#24** (Damga V.)

Sprint 4 başlamadan:
- **#17** (Semver), **#19** (OZELMATRAH), **#21** (kdvExemptionCode satır), **#23** (setLiability), **#22** (Multi-tenant)

Sprint 5 başlamadan:
- **#12** (TaxExemption mimari), **#14** (CustomsDeclaration)

Sprint 3 başlamadan:
- **#13** (Input zorunlu hizalama)

Sprint 7-8'de karar:
- **#3** (Signature sorumluluk — dokümantasyon)

---

## Dış Teyit İçin Mimsoft'a Tek Email Şablonu

**Konu:** json2ubl-ts v2.0.0 öncesi kararlar — Mimsoft davranış teyidi

Aşağıdakiler için Mimsoft pre-validation ve production log davranışı:

1. **Tevkifat 650 kodu:** production'da 650 ile gelen fatura var mı, kaç tane, GİB'de geçiyor mu?
2. **CustomizationID:** Fatura'da TR1.2 vs TR1.2.1 — Mimsoft hangisini bekliyor, prod'da son 100 başarılı faturanın değeri ne?
3. **DespatchContact/Name:** bu alan olmadan İrsaliye reject ediliyor mu?
4. **DORSE path:** `LicensePlateID[schemeID="DORSE"]` + `TransportEquipment[schemeID="DORSEPLAKA"]` — ikisi de kabul mü, biri zorunlu mu?
5. **Kısmi gönderim:** `OutstandingQuantity`/`OversupplyQuantity` production kullanım sıklığı?
6. **Stopaj modeli:** negatif TaxAmount mu, ayrı AllowanceCharge mi — GİB canonical pattern?
7. **Yuvarlama:** satır seviyesi önce mi belge seviyesi tek geçiş mi? Banker's vs round-half-away?
8. **xsi:schemaLocation:** bu attribute'la gelen XML reject ediliyor mu?
9. **Damga V. / Konaklama V.:** KDV matrahından düşülmeli mi? calculate-service DB `baseCalculate` flag intent?

---

> **SONUÇ:** 25 açık sorudan 15'i "senin kararın" (hemen verilebilir), 10'u "dış teyit" (Mimsoft email + prod log). Sprint 1 başlamadan kararlar ~1 saat; Mimsoft email cevabı 1-3 gün. Paralel yürüt: Sprint 1-2 senin kararlarınla başlat, Mimsoft cevapları Sprint 3-6'ya yetişir.
