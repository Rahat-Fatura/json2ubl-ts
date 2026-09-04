# CHANGELOG

Tüm önemli değişiklikler bu dosyada belgelenir. Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) 1.1.0, sürümleme [SemVer](https://semver.org/lang/tr/).

## [4.1.1] — 2026-09-04

> ### İstisna kodu seçim listesi ile doğrulayıcı ayrışıyordu
>
> `SATIS` faturasında KDV %0 kalem açan kullanıcıya istisna kodu soruluyor ama
> seçebileceği **hiçbir kod sunulmuyordu**. Değişiklik **geriye uyumludur**:
> bugüne kadar dolu dönen hiçbir liste değişmedi, yalnız boş dönenler doldu.

### Fixed

- 🔴 **`getAvailableExemptions` 9 fatura tipinde boş dizi döndürüyordu** — kütüphanenin
  kendi parçaları birbiriyle çelişiyordu:

  | parça | `SATIS` + KDV %0 senaryosunda |
  |---|---|
  | `EXEMPTION_DEFINITIONS` | `351`, `555`, `151` → `documentType: 'SATIS'` |
  | `TAX_EXEMPTION_MATRIX` | `CODE_351_ALLOWED_TYPES` SATIS içeriyor, `requiresZeroKdvLine: true` |
  | `KDV_ZERO_SUGGEST_351` | kullanıcıya **351'i öneriyor** |
  | `getAvailableExemptions` | **`[]`** |

  Yani kütüphane "351'i kullan" deyip 351'i listeye koymuyordu.

  **Neden**: seçim listesi, doğrulayıcıdan AYRI bir `switch`ti ve `default: return []`
  ile bitiyordu. Aynı veriden iki farklı kuralla türetilen iki yapı kaçınılmaz olarak
  ayrışır. Artık bilinmeyen tipler `TAX_EXEMPTION_MATRIX`'ten türetiliyor — "bu tipe
  izin verilen istisnalar" sorusunun tek bir cevabı var. Açık `case`'ler korundu
  (B-45 karma senaryoları, SGK'nın ISTISNA kodlarını da alması).

- **`documentType: 'SATIS'` kayıtları doğrulama matrisinden düşüyordu.** `buildMatrix`
  bu kayıtları `continue` ile eliyor, ardından `151`/`351`/`555` elle geri ekleniyordu.
  Sonuç: `configManager` üzerinden (örn. veritabanından) eklenen yeni bir SATIS kodu
  tanımlanabiliyor ama kullanılamıyordu — `validateExemptionCode` ona
  `UNKNOWN_EXEMPTION_CODE` veriyordu. Artık dar bir varsayılan küme
  (`SATIS`/`TEVKIFAT`/`KOMISYONCU`) ile matrise giriyorlar; bilinen üçünün kendi
  kuralları yine üzerine yazılıyor.

### Ölçüm

20 fatura tipinin tamamı için önce/sonra — **bozulan 0, kazanılan 9**:

```
SATIS · TEVKIFAT · KOMISYONCU                 0 → 3   (351, 555, 151)
HKSSATIS · HKSKOMISYONCU · KONAKLAMAVERGISI
TEKNOLOJIDESTEK · YTBSATIS · YTBTEVKIFAT      0 → 1   (351)
ISTISNA · IADE ailesi · SGK
OZELMATRAH · IHRACKAYITLI                     değişmedi
```

Test paketi: **100 dosya / 2169 test**, tamamı geçiyor.

## [4.1.0] — 2026-08-25

> ### 🔴 UYUMLULUK DÜZELTMESİ — tevkifatlı faturalar GİB kapısında reddediliyordu
>
> Bu sürümdeki düzeltmelerin tamamı **canlı GİB doğrulayıcısıyla** (Schematron paketi
> **20260701**, XSD `2026-08-05`) ölçülmüştür — tahmin yoktur. Davranış değişiklikleri
> **geriye uyumludur**: hiçbir varsayılan değişmedi, yeni bayrak varsayılan olarak
> kapalıdır.

### Fixed

- 🔴 **Tevkifat `cbc:Percent` artık ONDALIKSIZ yazılıyor** (`"90.00"` → `"90"`).
  4.0.0'da tevkifatlı **her fatura** GİB tarafından REDDEDİLİYORDU.

  **Kanıt** (canlı, `POST /v1/validate`):
  ```
  ruleId : WithholdingTaxTotalCheck
  mesaj  : Uyumsuz vergi tipi yüzdesi: '606' vergi tipinin yüzdesi '90.00' olamaz
  ```

  **Neden**: `UBL-TR_Common_Schematron.xml:312` kod ile oranı BİTİŞİK tek bir anahtara
  çevirip kod listesinde arıyor —
  `concat(',', TaxTypeCode, Percent, ',')`. `UBL-TR_Codelist.xml:17` listesi tamamen
  ondalıksızdır (`,60130,60140,…,60690,…,801100,`), yani `606`+`90` → `,60690,` ✅ ama
  `606`+`90.00` → `,60690.00,` ❌ hiçbir zaman eşleşemez.

  ⚠️ `cac:TaxTotal` altındaki **KDV `Percent`'i 2 basamakta KALDI** (`"20.00"`) — o
  bağlama bağlı hiçbir şematron kuralı yoktur (`decimalCheck` yalnız 6 parasal bağlama
  uygulanır), dolayısıyla değiştirmek hiçbir uyum sorununu çözmez, yalnızca yerleşik
  çıktıyı kırardı. İki alanın farklı biçimlenmesi bilinçlidir.

- 🔴 **`cbc:MultiplierFactorNumeric` 1 → 4 basamak** — iskonto oranı SESSİZCE bozuluyordu.

  4.0.0 sabit 1 basamak yazıyordu: `%15 → "0.1"`, `%12,5 → "0.1"`, `%5 → "0.1"`,
  `%1 → "0.0"`, `%3 → "0.0"`. `Amount`/`BaseAmount` doğru kaldığı için belge **kendi
  içinde tutarsızlaşıyordu** (oran × taban ≠ tutar). Depodaki bir örnekte bu canlı
  olarak görüldü: `0.1 × 200,00 = 20` iken `Amount` `10,00` idi; artık `0.05` yazılıyor.

  Şematronda bu alan **hiç geçmez** (iki dosyada da sıfır eşleşme) → format serbest.
  4 basamak ile %0,01'e kadar iskonto ifade edilebilir.

- 🟠 **`InvoicedQuantity` / `DeliveredQuantity` / `PriceAmount` 2 → 6 basamak** —
  hassas miktar ve birim fiyat imha oluyordu: `0,125 kg → "0.13"`, `0,004 kg → "0.00"`,
  `0,0035 TL → "0.00"`.

  Şematron bu alanlara format kuralı KOYMAZ: `InvoicedQuantityCheck`
  (`UBL-TR_Common_Schematron.xml:411`) yalnız `count(@unitCode)=1` denetler.

  ⚠️ **Parasal `*Amount` alanları 2 basamakta KALDI.** `decimalCheck`
  (`UBL-TR_Common_Schematron.xml:229`) noktadan sonra en fazla 2 hane şart koşar ve
  `UBL-TR_Main_Schematron.xml`'de TAM 6 bağlama bağlıdır: `LegalMonetaryTotal`'ın beş
  alanı (`LineExtensionAmount`, `TaxExclusiveAmount`, `TaxInclusiveAmount`,
  `AllowanceTotalAmount`, `PayableAmount`) + belge düzeyi `TaxTotal/TaxAmount`.
  `cac:Price/cbc:PriceAmount` bu listede **değildir**, bu yüzden ayrıldı.

- 🟡 **`SimpleBuyerCustomerInput.taxOffice` eklendi** — alan tipte yoktu, dolayısıyla
  IHRACAT/KAMU alıcısının vergi dairesi hiç yazılamıyordu. Artık
  `cac:BuyerCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name` alanına
  eşleniyor (`sender`/`customer` ile aynı desen). `SessionPaths`'e de aktı
  (`buyerCustomer.taxOffice`).

- 🔴 **`configManager` enjeksiyon dikişi tamamlandı** — enjekte edilen kod hesaplanıyor
  ama `InvoiceBuilder.validate()` strict modu tarafından REDDEDİLİYORDU.

  `configManager` beş listeyi (vergi / tevkifat / istisna / birim / para birimi)
  runtime'da override edebiliyordu; ama `constants.ts`'teki türev whitelist `Set`'leri
  (`TAX_TYPE_CODES`, `WITHHOLDING_TAX_TYPE_CODES`,
  `WITHHOLDING_TAX_TYPE_WITH_PERCENT`, `ISTISNA_/OZEL_MATRAH_/IHRAC_…_CODES`,
  `UNIT_CODES`) **import anında bir kez** hesaplanıyordu. Hesaplayıcılar
  `configManager`'ı, doğrulayıcılar donmuş `Set`'i okuduğu için ikisi ayrışıyordu.

  Türev koleksiyonlar artık `configManager` her değiştiğinde **YERİNDE** tazeleniyor
  (`src/config/derived-config.ts`). **Geriye uyumlu**: nesneler hâlâ gerçek
  `Set`/`Map`, kimlikleri sabit, TypeScript imzaları aynı — mevcut
  `import { TAX_TYPE_CODES } from 'json2ubl-ts'` kullanımları bozulmaz.

  Aynı kusurun taşıdığı diğer statik okumalar da `configManager`'a bağlandı:
  `TAX_EXEMPTION_MATRIX` (cross-check-matrix), `type-validators` ve
  `simple-line-range-validator` içindeki `WITHHOLDING_TAX_MAP`,
  `simple-invoice-mapper` içindeki `EXEMPTION_MAP`.

  `CURRENCY_CODES` **birleşim** olarak türetilir (68 kodluk taban liste ∪
  `configManager.currencies`) — daralma OLMAZ, yalnız enjekte edilen yeni kodlar eklenir.

### Added

- **`BuilderOptions.includeUblExtensions`** (varsayılan **`false`**) — `true` iken kök
  elemanın İLK çocuğu olarak boş `ext:UBLExtensions` iskeleti yazılır:

  ```xml
  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>
  ```

  **Neden**: GİB `UBL-Invoice-2.1.xsd` kök sequence'ında `ext:UBLExtensions` ilk
  elemandır; iskelet yokken XSD *"UBLVersionID elementi bu konumda geçersiz. Bu noktada
  beklenen: UBLExtensions."* ile düşer. İmzayı kendi atan tüketiciler (sunucu tarafı
  mühürleme) XAdES'i `ExtensionContent` içine yazar.

  **Varsayılan neden `false`**: kütüphane imza üretmez ve yerleşik tüketicilerin
  çoğunda zarfı/imzayı entegratör ekler — koşulsuz emit onların çıktısını değiştirirdi.
  `InvoiceBuilder`, `DespatchBuilder` ve `SimpleInvoiceBuilder` destekler
  (`UBL-DespatchAdvice-2.1.xsd` kök sequence'ı da aynı elemanla başlar).

- **`formatDecimalRange(value, min, max)`** (`src/utils/formatters.ts`, **dahili** — kardeşi
  `formatDecimal` gibi public API'ye açılmadı) — üç düzeltmenin ortak temeli. En az `min`, en fazla `max` ondalık yazar; aradaki fazlalık sıfırları
  atar. `min`, mevcut çıktı biçimini korumak içindir — bu sayede `1` miktarı yine
  `"1.00"` üretir ve depodaki 161 örnek çıktısından **hiçbiri** miktar/fiyat yüzünden
  değişmedi.

- **`cbcOptionalUnitPriceTag`** (`src/utils/xml-helpers.ts`, **dahili**) — birim fiyatı parasal
  `cbcOptionalAmountTag`'ten ayırır; `decimalCheck` kapsamının doğru uygulanmasını sağlar.

- **Golden-file regresyon seti** — `__tests__/golden/` (8 senaryo, 45 test): basit satış,
  çok-oranlı KDV, %15 satır iskontosu, 606/%90 tevkifat, tevkifat+iskonto bileşimi,
  istisna (KDV 0 + kod 351), EUR + kur, e-Arşiv, hassas miktar/birim fiyat. Her golden
  **canlı GİB doğrulayıcısına** gönderilir; servis erişilemezse testler **atlanır**
  (sessizce geçmez). Set ayrıca 4.0.0 davranışını geri koyup şematronun gerçekten
  reddettiğini kanıtlayan bir negatif test içerir.

- **`__tests__/utils/formatters.test.ts`** — `formatDecimalRange` birim testleri
  (16 test: min koruması, hassasiyet kurtarma, float artefaktı, negatif, kenar durumlar).

- 🔴 **`9015` (KDV Tevkifatı) vergi kodu** — `tax-config.ts` artık GİB Schematron
  `$TaxType` listesinin **31 kodunun tamamını** taşıyor (önceki: 30).

  `9015` Sprint 2'de bilinçli olarak atlanmıştı: UBL-TR Kod Listeleri v1.42/v1.43
  belgesinde Türkçe etiketi yoktur (`audit/sprint-02-exemption-todo.md`). Ama GİB
  whitelist'leri (`UBL-TR_Codelist.xml` §TaxType, `EArsiv.xsd`, `eArsivVeri.xsd`)
  kodu KABUL EDİYOR ve ESMM (serbest meslek makbuzu) akışı kodu ŞART KOŞUYOR —
  kütüphane reddettiği için ESMM belgeleri geçemiyordu.

  Etiket **uydurulmadı**: GİB'in kendi normatif görüntüleme şablonları
  (`eInvoice_Base.xslt`, `eArchive_Base.xslt`) `TaxTypeCode=9015` taşıyan
  subtotal'ları "Tevkifata Tabi İşlem Tutarı" / "Tevkifata Tabi İşlem Üzerinden
  Hes. KDV" başlıklarıyla — `WithholdingTaxTotal` ile birebir aynı başlıklarla —
  basar. Etiketin kaynağı yeni **opsiyonel** `TaxDefinition.labelProvisional`
  alanıyla işaretlendi (resmî etiket yayımlanınca kaldırılmalı).

  `baseStat: false, baseCalculate: false` — tevkifat KDV matrahını değiştirmez,
  toplam vergiden düşer (`0003` Gelir Vergisi Stopajı ile aynı davranış sınıfı).

- **`refreshDerivedConfig()`** — türev whitelist'leri elle yeniden hesaplayan kaçış
  kapağı. Normalde gerekmez; `configManager` her değiştiğinde otomatik tetiklenir.

- **`__tests__/config/config-injection-seam.test.ts`** (20 test) — enjeksiyon dikişinin
  delili: enjeksiyon öncesi RED → sonrası KABUL → `reset()` sonrası tekrar RED;
  her mutasyon yolunun tazelediği; geriye uyumluluk (`instanceof Set`, kimlik sabitliği,
  `CURRENCY_CODES` daralmadı); `9015` ile ESMM benzeri belge üretimi.

### Notes

- **Kütüphane imzasız belge üretir; bu bilinçli sınır XSD tarafından karşılanmaz.**
  Canlı ölçümde imzasız çıktı `validSchematron: true` (tüm iş kuralları temiz) ama
  `validSchema: false` verir; TAM İKİ hata imza yokluğundandır: (1) `ExtensionContent`
  boş olamaz, (2) `cac:Signature` yoktur. Her ikisi de imzalayıcı tarafından
  eklendiğinde XSD **tamamen geçer** — bu, golden setinde pozitif olarak test edilir.
  `cac:Signature` üretimi bu sürümün kapsamı dışındadır.

- **Kod listesi sapma ölçümü (Schematron 20260701 `UBL-TR_Codelist.xml` ile diff).**
  Ölçüldü, uygulanmadı — kararı bekleyen üç kalem:

  | Liste | GİB | Kütüphane | Durum |
  |---|---|---|---|
  | `TaxType` | 31 | **31** | ✅ `9015` ile kapandı |
  | `WithholdingTaxType` | 52 | 53 | ✅ üst küme (`650` dinamik kodu fazladan) |
  | `WithholdingTaxTypeWithPercent` | 64 | 152 | ⚠️ 7 kombinasyon EKSİK |
  | `istisnaTaxExemptionReasonCodeType` | 94 | 84 | ⚠️ 10 kod EKSİK |
  | `ozelMatrahTaxExemptionReasonCodeType` | 12 | 12 | ✅ |
  | `ihracExemptionReasonCodeType` | 4 | 4 | ✅ |

  **Tevkifat — YAPISAL sınırlama.** `WithholdingTaxDefinition` kod başına TEK bir
  `percent` tutuyor; GİB 8 koda **iki oran** veriyor. Kütüphane her birinde yalnız
  yüksek oranı taşıdığı için şu 7 geçerli kombinasyon reddediliyor:
  `60130` (601 %30), `60350` (603 %50), `60950` (609 %50), `61270` (612 %70),
  `61370` (613 %70), `61550` (615 %50), `62740` (627 %40).
  **Öneri:** `percent: number` → `percent: number | number[]` yerine **geriye uyumlu**
  `percent: number` (varsayılan/önerilen oran) + yeni opsiyonel
  `alternatePercents?: number[]` alanı. `deriveWithholdingCombos` her ikisini de üretir;
  hesaplayıcı `percent`'i varsayılan alır, kullanıcı açıkça alternatifi verirse onu kullanır.
  Böylece hiçbir mevcut çıktı değişmez, yalnız whitelist genişler.

  **İstisna — eksik 10 kod:** `001`, `101`–`108`, `501`. Bunlar GİB'in hem genel
  `$TaxExemptionReasonCodeType` hem `$istisnaTaxExemptionReasonCodeType` listesinde var
  ama `exemption-config.ts`'te yok. **Öneri:** kodları resmî Türkçe adlarıyla eklemek —
  ad kaynağı doğrulanmadan eklenmemeli (`9015`'te uygulanan N1 disiplini). `501` için
  `cross-check-matrix.ts` zaten "Schematron özel, config'de yok" şerhini taşıyor.

  **`308`/`339` daraltması — KAPSANMIŞ DURUMDA.** 20260701 paketinde bu iki kod genel
  listeden çıkarılıp `$YatirimTesvikTaxExemptionReasonCodeType`'a taşındı. Kütüphane
  bunu 4.0.0'da uyguladı: `YATIRIM_TESVIK_ONLY_EXEMPTION_CODES` +
  `validateYatirimTesvikExemptionScope` (hata kodu
  `EXEMPTION_REQUIRES_YATIRIMTESVIK_SCOPE`, 4.0.0 tablosu md. 6). Kodlar
  `exemption-config`'te `documentType: 'ISTISNA'` olarak KALIR — bu doğrudur, çünkü
  GİB'in `$istisnaTaxExemptionReasonCodeType` listesi de ikisini hâlâ içerir;
  daraltma ayrı bir kuralla (profil/tip kapsamı) uygulanır. Kütüphane tarafında
  ek iş YOKTUR. ⚠️ Tek şerh: daraltma **koşulsuz** uygulanır, `issueDate` bakmaz —
  paketin yürürlüğü 14.09.2026 (4.0.0 sürüm notunda bilinçli karar olarak belgelendi).

## [4.0.0] — 2026-08-24

> ### ⚠️ BREAKING — daha önce GEÇERLİ sayılan girdiler artık REDDEDİLİYOR
>
> Bu sürüm, GİB'in **27.07.2026** duyurusuyla yayımladığı **Schematron 20260701** ve
> **UBL-TR Kod Listeleri v1.43** paketine uyum getirir. **Yürürlük: 14.09.2026.**
>
> Yeni zorunluluklar **koşulsuz** uygulanır — `issueDate`'e bakan geçiş dönemi davranışı
> **yoktur**. Kütüphane 14.09.2026 sonrası doğru olanı üretir. Yükseltmeden önce aşağıdaki
> altı maddeyi girdilerinizle karşılaştırın.

### Artık reddedilen girdiler

| # | Daha önce geçerliydi | Artık | Hata kodu |
|---|---|---|---|
| 1 | Plakasız `DespatchAdvice` | ❌ | `DESPATCH_LICENSE_PLATE_REQUIRED` |
| 2 | `InvoicePeriod`'suz SARJ/SARJANLIK | ❌ | `ENERJI_INVOICE_PERIOD_REQUIRED` |
| 3 | `ESURaporID` referansı olmayan SARJ | ❌ | `ENERJI_ESU_RAPOR_ID_REQUIRED` |
| 4 | Alıcıda `PLAKA` kimliği olmayan SARJ/SARJANLIK | ❌ | `ENERJI_CUSTOMER_PLAKA_REQUIRED` |
| 5 | `SerialID`'siz SARJANLIK kalemi | ❌ | `ENERJI_ITEM_SERIAL_ID_REQUIRED` |
| 6 | YATIRIMTESVIK/YTB* dışı profilde 308 veya 339 istisna kodu | ❌ | `EXEMPTION_REQUIRES_YATIRIMTESVIK_SCOPE` |

Ayrıca plaka değerleri artık formata tabi: TR plakalar
`^(0[1-9]|[1-7][0-9]|8[01])[A-Z]+[0-9]+$`, yabancı plakalar `^[A-Z0-9_-]+$`.

### Added

- **`PeriodInput.startTime` / `endTime`** — `cbc:StartTime` / `cbc:EndTime`. Tüm
  `InvoicePeriod` kullanımlarına açık (yalnız ENERJI'ye kısıtlı değil); XSD hepsinde
  izin verir. `SimplePeriodInput` eşleniği ve 2 yeni `SessionPaths` girdisi dahil.
- **`AdditionalDocumentInput.schemeId`** — `cbc:ID/@schemeID`. SARJ faturalarında
  `ESURaporID` taşıyıcısı. `SimpleAdditionalDocumentInput` eşleniği + `SessionPaths` girdisi.
- **`LicensePlateSchemeId` tipi** — 6 değerli union: `PLAKA`, `DORSE`, `DORSEPLAKA`,
  `YABANCIPLAKA`, `YABANCIDORSE`, `YABANCIDORSEPLAKA` (önceden 2 değer).
- **İstisna kodu 233** — *2942 Sayılı Kamulaştırma Kanunu Kapsamında Taşınmazların
  Kamulaştırmayı Yapan Devlet ve Kamu Tüzel Kişilerine Devri* (Kısmi İstisna).
- **`src/validators/enerji-validator.ts`** — dört Enerji/Şarj kuralı.
- Yeni sabitler: `TR_LICENSE_PLATE_REGEX`, `FOREIGN_LICENSE_PLATE_REGEX`,
  `FOREIGN_LICENSE_PLATE_SCHEME_IDS`, `ENERJI_PLATE_REGEX`, `ENERJI_PLATE_MAX_LENGTH`,
  `ENERJI_PERIOD_MIN_DATE`, `ESU_RAPOR_ID_SCHEME_ID`, `ESU_RAPOR_ISSUE_DATE_REGEX`,
  `YATIRIM_TESVIK_ONLY_EXEMPTION_CODES`, `YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES`.

### Changed

- **`InvoiceTypeCode=IADE` artık `KAMU` profilinde de geçerli**
  (`IADEInvioceCheck`). "IADE → TEMELFATURA" otomatik düşürmesi korundu; kullanıcının
  açık KAMU seçimi ezilmez.
- **İstisna kodu 229 metni** v1.43 PDF ile birebir eşitlendi: `17/2-b` öneki kaldırıldı,
  "Darülacezeye" ibaresi eklendi.
- **`showInvoicePeriod`** SARJ/SARJANLIK'ta da `true` — alan gizliyken kullanıcı artık
  zorunlu olan veriyi giremiyordu.
- Enerji kuralları `validationLevel: 'basic'`'te de çalışır (`crossMatrix` ile aynı
  gerekçe: GİB kapıda reddediyor, geç yakalanması pahalı).

### Fixed

- **İDİS sevkiyat numarası `ES-` prefix'ini de kabul ediyor**
  (`SEVKIYAT_NO_REGEX`: `/^SE-\d{7}$/` → `/^(SE|ES)-\d{7}$/`). Gevşetme — geriye
  dönük uyumlu, mevcut `SE-*` değerleri etkilenmez.

### Bilinçli olarak KAPSAM DIŞI

Bilgi katmanı (`gib-claude-skills`) CHANGELOG'unda yer alan ama bu kütüphaneyi
ilgilendirmeyen değişiklikler — kütüphane yalnız `Invoice` ve `DespatchAdvice` üretir:

| Değişiklik | Gerekçe |
|---|---|
| EArsiv.xsd v1.1_8 (`aliciType` → `xs:choice`, `esuRaporID` 1..n) | Kütüphane e-Arşiv **raporu** üretmiyor; yalnız EARSIVFATURA UBL faturası |
| `erreceipt` alias + `UserOptionCode` 171-174 + `AuthorizedWorkScope` yasağı | HR-XML kullanıcı hesabı belgesi kütüphanede yok |
| e-Müstahsil SMS doğrulama (zorunluluk 5.11.2026) | e-MM belge tipi kütüphanede yok |
| 509 GT e-Arşiv eşiği (1/1/2026'dan tutar-bağımsız) | Belge **üretim** kuralı değil; "hangi belgeyi keseyim" kararı tüketicide |

### Yenilenen örnekler

`examples/25-enerji-sarj` ve `examples-matrix/valid/enerji/*` (3 senaryo) yeni zorunlu
alanlarla güncellendi — **çıktı XML'leri değişti**. `enerji-sarj-coklu-sarj` iki
`ESURaporID` taşıyor (e-Arşiv Paketi v1.1_8 `esuRaporID` 1..n genişlemesi).
5 yeni negatif matris senaryosu eklendi.

### Test

`1917 → 2081` (+164). `matrix:run` 169/169. Plan: [audit/sprint-09-plan.md](./audit/sprint-09-plan.md).

---

## [3.0.0] — 2026-08-03

> ### ⚠️ DAVRANIŞ DEĞİŞİKLİĞİ — mevcut tüketicilerin ÇIKTISI DEĞİŞİYOR
>
> Bu sürümden itibaren **her faturaya**, notların **İLKİ** olarak `YAZIYLA:#...#` biçiminde
> bir "yazıyla tutar" notu eklenir. **Opsiyon yoktur, kapatılamaz.** Byte-bazlı XML
> karşılaştırması / snapshot testi yapan her tüketicinin altın çıktıları kırılacaktır.
> Yükseltmeden önce beklenen çıktılarınızı yeniden üretin.
>
> Bu değişiklik **yalnız `Invoice`** belgelerini etkiler. `DespatchAdvice`'ta parasal dip
> toplam yoktur; irsaliye çıktıları **hiç değişmez**.

### Added — "yazıyla tutar" notu (`YAZIYLA:#...#`)

Tutarın yazıyla yazılması her tüketicinin ayrı ayrı, tutarsız biçimde çözdüğü bir işti.
Artık kütüphane çözüyor: kullanıldığı her yerde aynı ve doğru.

**Biçim — SAHADAN ÖLÇÜLDÜ, UYDURULMADI**

```
YAZIYLA:#<TAMSAYI YAZIYLA> <BÜYÜK BİRİM> <KESİR YAZIYLA> <KÜÇÜK BİRİM>#

YAZIYLA:#ÜÇ BİN İKİ YÜZ KIRK ÜÇ TÜRK LIRASI ELLİ ALTI KURUŞ#
YAZIYLA:#ALTI YÜZ ALTMIŞ BİN TÜRK LIRASI#                     ← kuruş sıfır
```

Biçim **88 gerçek fatura notundan** (kullanıcının indirdiği belgeler) bayt düzeyinde
çıkarıldı. Sabit olduğu doğrulananlar: `YAZIYLA:#` öneki (88/88), `#` soneki (88/88),
tam sayı **ve** kesirin ikisinin de yazıyla yazılması, kuruş sıfırken kesir kısmının
hiç yazılmaması.

**🔬 Doğrulama:** 88 saha notunun tamamı `PayableAmount`tan yeniden hesaplandı —
**kelime ve birim adı farkı SIFIR**. 22 kayıt bayt-bayt aynı; kalan 66 kayıt yalnız
ayırıcı boşluk karakterinde ayrılıyor (aşağıya bakınız).

**🔴 Sahada İKİ ÜRETİCİ var — hangisini uyguladık ve neden**

Büyük birim ile kesir arasındaki ayırıcı sahada tek tip **değil**:

| Üretici | Kuruş varken | Kuruş sıfırken | Kayıt |
|---|---|---|---|
| **A** | `TÜRK LIRASI⏎ ELLİ ALTI KURUŞ#` | `TÜRK LIRASI⏎#` | 66 (44 LF + 22 CR) |
| **B** | `TÜRK LIRASI ELLİ ALTI KURUŞ#` | `TÜRK LIRASI#` | 22 |

Aynı tutarın (`25576,03`) **her iki biçimde de** kayıtlı olması, bunun tek üreticinin
tutarsızlığı değil iki AYRI üretici olduğunun kanıtıdır.

**B uygulandı.** Gerekçe: (a) `cbc:Note` içine gömülü ham satır sonu kırılgandır —
XSLT/HTML görüntüleyicide zaten boşluğa çöker ama XML'i bayt bazlı karşılaştıran herkesi
görünmez bir karakterle uğraştırır; (b) tek satırlık biçim sahada atteste ve talep edilen
biçimdir; (c) A biçimine geçmek gerekirse `MAJOR_MINOR_SEPARATOR` tek satırlık bir
değişikliktir.

**🔴 Kuruş sıfırken kapanış `#`inden önce BOŞLUK YOKTUR.** 88 kaydın **hiçbirinde**
`LIRASI #` (boşluk + `#`) geçmiyor; 38 kayıtta geçen `LIRASI⏎#` bir **satır sonudur**,
boşluk değil. Boşluk bırakmak sahadaki hiçbir üreticiyle eşleşmeyen **üçüncü** bir
varyant üretirdi.

**Kaynak:** `cac:LegalMonetaryTotal/cbc:PayableAmount` — belgede yazan dip toplam.
Not, `cbc:PayableAmount`ın yazdığı string'in **birebir aynı yuvarlamasından**
(`formatDecimal(x, 2)`) türetilir; not ile XML'deki tutar hiçbir koşulda ayrışamaz.

**Biçim kararları**

| Durum | Karar | Gerekçe |
|---|---|---|
| Kesir | **Yazıyla** — `,56` → `ELLİ ALTI KURUŞ`, `,05` → `BEŞ KURUŞ` | Sahadan ölçüldü; kesir de saf sayı okuma modülünden geçer |
| Kuruş sıfır (`182,00`) | Kesir kısmı **hiç yazılmaz** → `... TÜRK LIRASI#` | Sahadan ölçüldü (53 kayıt) |
| Sıfır tutar (`0,00`) | `YAZIYLA:#SIFIR TÜRK LIRASI#` | Not koşulsuz eklendiği için atlanmaz; `SIFIR` doğru okunuş, kuruş da sıfır olduğu için kesir yukarıdaki kuralla düşer |
| Negatif tutar | `EKSİ` öneki → `YAZIYLA:#EKSİ YÜZ TÜRK LIRASI#` | UBL-TR'de `PayableAmount` negatif olmamalıdır (iade belgeleri pozitif tutar + farklı tip koduyla düzenlenir), ama işaret **sessizce yutulmaz**. Yuvarlama sonrası sıfırlanan negatifler (`-0,001`) `EKSİ` almaz |
| Okunamayan tutar | Not **hiç yazılmaz** | `NaN`/`Infinity`/güvenli tam sayı aralığı dışı: kozmetik bir not yüzünden serializer patlayıp geçerli belge üretilememesi kabul edilemez |

**Para birimine göre birim adları** (`config/amount-in-words-config.ts` — genişletilebilir)

Her ad ya **ÖLÇÜLDÜ** ya da **seçildi**; ayrım tabloda ve kodun yorumlarında işaretlidir.

| Kod | Büyük birim | Küçük birim |
|---|---|---|
| `TRY` | `TÜRK LIRASI` — **ÖLÇÜLDÜ** (86 kayıt) | `KURUŞ` — **ÖLÇÜLDÜ** (33 kayıt) |
| `USD` | `AMERIKAN DOLARI` — **ÖLÇÜLDÜ** (1 kayıt) | `SENT` — seçildi |
| `EUR` | `AVRO` — **ÖLÇÜLDÜ** (1 kayıt), `EURO` değil | `SENT` — seçildi |
| `GBP` | `İNGİLİZ STERLİNİ` — seçildi | `PENİ` — seçildi |

**🔴 `TÜRK LIRASI` ve `AMERIKAN DOLARI` noktasız `I` (U+0049) ile yazılır.** Türkçe yazım
kuralına göre `LİRASI` / `AMERİKAN` doğru olurdu; saha standardı böyle **değil** — 86
kaydın hiçbirinde noktalı `İ` yok. Amaç alanı birebir eşlemektir, bu bilinçli bir
"yanlış yazım", düzeltmeyin. Buna karşılık **seçilen** adlar (GBP) doğru Türkçe yazımla
yazılır — saha taklidi yalnız ölçülen adlar için geçerlidir.

**Bilinmeyen kur kodunda** büyük birim = **ISO kodunun kendisi** (`YAZIYLA:#İKİ CHF ELLİ
KURUŞ#`), küçük birim = `KURUŞ`. Gerekçe: (a) kod belgede yazanın aynısıdır, asla
uydurulmaz; (b) Türkçe bir notta 1/100 alt biriminin genel karşılığı "kuruş"tur;
(c) tablo dışa açık — bir kur için doğru ad gerekiyorsa tek satır eklenir. Kur kodu
boş/eksikse `TRY` varsayılır.

`calculator/currency-config.ts`teki `CURRENCY_DEFINITIONS` **kullanılmadı**: oradaki `unit`
alanı 30 kodun 26'sında boş, `subunit` değerleri karışık dilde ve çoğuldur (`Cents`, `Pence`,
`Øre`). Not Türkçe ve büyük harf olmak zorunda olduğundan ayrı tablo tutuldu.

**Yeni public API**

- `numberToTurkishWords(n)` — saf sayı okuma (`utils/turkish-number-words.ts`); para birimi,
  UBL veya fatura bilmez. Hem lira hem kuruş tarafı buradan geçer.
  `TURKISH_ZERO_WORD`, `TURKISH_MINUS_WORD`, `MAX_READABLE_INTEGER`.
- `formatAmountInWordsNote(amount, currencyCode)` — not metni; okunamayan tutarda `null`.
- `isAmountInWordsNote(note)`, `AMOUNT_IN_WORDS_PREFIX/SUFFIX/NOTE_PATTERN`.
- `AMOUNT_IN_WORDS_UNITS`, `getAmountInWordsUnits(code)`, `DEFAULT_MINOR_UNIT`,
  `DEFAULT_CURRENCY_CODE_FOR_WORDS`, tip `AmountInWordsUnits`.

### Changed

- 🔴 **`serializeInvoice` her faturaya `YAZIYLA:#...#` notunu İLK not olarak yazar.**
  Tüketicinin `notes` dizisi sırasını koruyarak arkadan gelir.
- 🔴 **Tüketicinin elle yazdığı yazıyla-notları artık serileştirmede ATILIR.**
  `notes` içinde `^\s*#?\s*YAZ[Iı]YLA\s*:` desenine uyan girdiler yazılmaz. Aksi halde
  belgede birbiriyle çelişen iki "yazıyla" notu bulunabilirdi; v3.0.0'da bu notun tek
  kaynağı kütüphanedir. Girdi nesnesi (`InvoiceInput.notes`) değiştirilmez — eleme yalnız
  serileştirme anındadır.
- **Altın çıktılar yeniden üretildi.** `examples/` (38) + `examples-matrix/` (123) = 161
  dosyanın **150'sinde tek fark eklenen `<cbc:Note>YAZIYLA:#...#</cbc:Note>` satırıdır**;
  değişmeyen 11 dosya irsaliyedir. İki dosyada (`examples/02`, `examples/03`) ek olarak elle
  yazılmış eski `YAZIYLA: ...` notu kaldırıldı — yerini hesaplanan not aldı. Başka hiçbir
  alan kaymadı; 150 dosyanın tamamı `PayableAmount`tan yeniden hesaplanarak doğrulandı.
- `__tests__/integration/line-item-fields.test.ts`: satır notu iddiaları artık tüm XML'i
  değil yalnız `cac:InvoiceLine` bloğunu tarar (belge seviyesinde artık her zaman bir
  `cbc:Note` vardır).

### Notlar

- **Şema uyumu:** `cbc:Note` UBL 2.1'de `TextType`'tır (`xsd:string`); UBL-TR XSD'sinde
  uzunluk kısıtı, UBL-TR Şematron'unda (`UBL-TR_Main/Common_Schematron.xml`) `cbc:Note`
  kuralı **yoktur**. Üretilen not tipik olarak < 100 karakterdir. Kısıt riski yok.
- Not içeriği XML-özel karakter üretmez; yine de mevcut `escapeXml` yolundan geçer.
- Not **tek satırdır** — içinde `\r` veya `\n` bulunmaz.

### Tests

+105 test (1812 → 1917, 91 dosya).

**Saha kanıtı testleri** — gerçek faturalardaki üç kayıt birebir üretiliyor
(`3243,56` · `41813,35` · `660000,00`), artı 6 rastgele kayıt ve ölçülen iki yabancı para
kaydı (`3810,00 EUR → AVRO`, `10000,00 USD → AMERIKAN DOLARI`). Kuruş sıfırken kapanış
`#`inden önce boşluk olmadığı ve notun tek satır olduğu ayrıca kilitlendi.

**Türkçe sayı okumanın tuzaklarının her biri ayrı test:** `1`↔`100`↔`1000`
(`BİR YÜZ`/`BİR BİN` yasağı), `1.000.000` → `BİR MİLYON` (bin'den farklı),
`101`/`1001`/`1100`/`11000`, sıfırlı grupların atlanması, basamak adları
(`BİN/MİLYON/MİLYAR/TRİLYON/KATRİLYON`), sıfır, negatif, ondalık/NaN/aralık dışı,
Türkçe büyük harf doğruluğu (noktalı `İ` / noktasız `I`).

**Kuruş alanı ayrıca kapsandı:** `,05` → `BEŞ KURUŞ`, `,15` → `ON BEŞ KURUŞ`,
`,00` → kesir kısmı hiç yok; 1–99 arası her kuruş değerinin okunabildiği ve nottaki
kesirde hiç rakam kalmadığı döngüyle doğrulandı.

**Yuvarlama tutarlılığı:** `1,999` → `İKİ TÜRK LIRASI`, `999,995` → `BİN TÜRK LIRASI`,
`1,006` → `BİR KURUŞ` — not her zaman `cbc:PayableAmount`ın yazdığı değeri okur.

## [2.3.1] — 2026-08-01

**İki hata düzeltmesi; ikisi de belgeye/akışa gerçek olmayan bir sonuç veriyordu.**

### 🔴 Düzeltildi — gece yarısı reddi (B-65 regresyonu)

`validateCommon` `issueDate` üst sınırını `new Date().toISOString().slice(0, 10)` ile, yani
**UTC gününden** okuyordu. Türkiye UTC+3 olduğu için her gece **00:00–03:00 (TR)** arasında UTC
hâlâ bir önceki gündedir; o üç saatte düzenlenen ve tarihi DOĞRU olan her Türk faturası
"gelecek tarihli" diye reddediliyordu. Kütüphane fiilen **her gün üç saat fatura üretemez**
hâle geliyordu.

Schematron `TimeCheck` (Common_Schematron:169) "gelecekte olamaz" der ve "gelecek" GİB'in
takvimine göredir — GİB Türkiye saatiyle çalışır. Artık sabit UTC+3 aritmetiğiyle hesaplanıyor
(Türkiye 2016'dan beri yaz saati uygulamıyor; `Intl`e bağımlılık yok, ICU'suz derlemelerde de
doğru çalışır). Sahte saatli iki regresyon testi eklendi.

### 🟡 Düzeltildi — uydurma posta kodu

`mapParty` bilinmeyen posta kodunu `'00000'` ile dolduruyordu. `00000` geçerli bir Türk posta
kodu değildir; belgeye gerçek olmayan veri yazılıyordu. `cbc:PostalZone` UBL'de seçimlidir
(`AddressType`, minOccurs=0) ve serializer zaten `cbcOptionalTag` kullanıyor — bilinmiyorsa
eleman artık **hiç yazılmıyor**.

`examples-matrix` altın çıktıları yeniden üretildi: **116 dosyanın tamamında tek fark**
kaldırılan `<cbc:PostalZone>00000</cbc:PostalZone>` satırıdır.

## [2.3.0] — 2026-07-31

**B-102 — "Tipte var, XML'de yok" sınıfının sistematik denetimi.** B-101 tekil bir hata değil, bir SINIF hatasıydı. Bu turda `SimpleInvoiceInput` ağacının **135 leaf alanının tamamı** TypeScript Compiler API ile çıkarılıp `src/` altındaki property-read'lerle mekanik olarak karşılaştırıldı. **9 alan** hiçbir yerde okunmuyordu; 1 alan daha koşullu olarak düşüyordu. Bu değişiklikler 2.3.0 ile yayınlandı.

### Denetim tablosu (135 leaf alan tarandı)

| Alan | Tipte | Mapper okuyor mu (önce) | UBL karşılığı | Durum |
|---|---|---|---|---|
| `lines[].brand` | ✔ | ✖ | `cac:Item/cbc:BrandName` | ✅ düzeltildi |
| `lines[].buyerCode` | ✔ | ✖ | `cac:Item/cac:BuyersItemIdentification/cbc:ID` | ✅ düzeltildi |
| `lines[].sellerCode` | ✔ | ✖ | `cac:Item/cac:SellersItemIdentification/cbc:ID` | ✅ düzeltildi |
| `lines[].manufacturerCode` | ✔ | ✖ | `cac:Item/cac:ManufacturersItemIdentification/cbc:ID` | ✅ düzeltildi |
| `lines[].origin` | ✔ | ✖ | `cac:Item/cac:OriginCountry/cbc:Name` | ✅ düzeltildi |
| `lines[].note` | ✔ | ✖ | `cac:InvoiceLine/cbc:Note` | ✅ düzeltildi |
| `lines[].delivery.packageId` | ✔ | ✖ | `…/cac:ActualPackage/cbc:ID` | ✅ düzeltildi |
| `lines[].delivery.packageQuantity` | ✔ | ⚠ koşullu | `…/cac:ActualPackage/cbc:Quantity` | ✅ düzeltildi |
| `sender.alias` | ✔ | ✖ | **YOK** — zarf/SBDH seviyesi | 📝 belgelendi |
| `customer.alias` | ✔ | ✖ | **YOK** — zarf/SBDH seviyesi | 📝 belgelendi |

Kalan 125 alan ya mapper'da ya da hesaplama motorunda (`line-calculator` / `document-calculator`: `kdvPercent`, `allowancePercent`, `withholdingTaxCode`, `withholdingTaxPercent`) okunuyor — hepsi çıktıya ulaşıyor.

### Fixed
- 🔴 **`lines[].brand` / `buyerCode` / `sellerCode` / `manufacturerCode` / `origin` / `note` SESSİZCE kayboluyordu.** B-101 ile birebir aynı sınıf: alan `SimpleLineInput`'ta tanımlı, `simple-invoice-mapper` onu hiç okumuyor. Kanıt yine kütüphanenin kendinden geldi — `examples/12-yatirimtesvik-satis-makina` ve 9 matrix senaryosu `brand` veriyordu, üretilmiş `output.xml`'lerin hiçbirinde `cbc:BrandName` yoktu.
- 🔴 **`ITEM_SEQ`'te slotlar vardı ama emitter'ları yoktu.** `BrandName`, `Buyers/Sellers/ManufacturersItemIdentification`, `OriginCountry` sıra tablosunda zaten listeliydi; `serializeItem` bunlar için hiç emitter tanımlamamıştı. Yani hata iki katmanda birden vardı (mapper okumuyor + serializer yazmıyor).
- 🔴 **`cac:ActualPackage` element sırası XSD'ye AYKIRIYDI.** Serializer `PackagingTypeCode`'u `Quantity`'den **önce** yazıyordu; GİB `PackageType` sırası `ID → Quantity → … → PackagingTypeCode`'tur. İki alan birlikte verildiğinde çıktı şema-geçersizdi. Kütüphanede bu kombinasyonu üreten test/örnek olmadığı için hata bugüne dek görünmemişti. `xmllint` ile hem eski sıranın **reddedildiği** hem yeni sıranın **geçtiği** doğrulandı.
- ⚠ **`packageQuantity` koşullu düşüyordu.** `cac:ActualPackage` YALNIZ `packageTypeCode` verildiğinde üretiliyordu; tek başına miktar (veya yeni `packageId`) verildiğinde sessizce yok sayılıyordu. Artık üç alandan herhangi biri paketi doğurur.

### Added
- `ItemInput`: `brandName`, `buyersItemIdentification`, `sellersItemIdentification`, `manufacturersItemIdentification`, `originCountryName`, `originCountryCode`.
- `InvoiceLineInput.notes?: string[]` — `cbc:Note` (XSD `maxOccurs="unbounded"`). `SimpleLineInput.note` tek değer olduğu için mapper onu tek elemanlı diziye sarar.
- `ActualPackageInput.id` — `cac:ActualPackage/cbc:ID`.
- `PACKAGE_SEQ` (`xsd-sequence.ts`) — `PackageType` sıra tablosu.
- `line-serializer`: `itemIdentificationBlock()` ve `originCountryBlock()` yardımcıları.

### Changed
- **`cac:OriginCountry` yalnız ülke ADI varken emit edilir.** GİB `CountryType`'ta `cbc:Name` **minOccurs=1**'dir; sadece `originCountryCode` verilmişse blok hiç yazılmaz — eksik veriyle şema-geçersiz belge üretmemek için.
- `examples/12`, `examples/14` ve 9 matrix senaryosunun `output.xml`'i yeniden üretildi (artık `cbc:BrandName` içeriyorlar — daha önce kaybolan veri).
- `session-paths.generated.ts` regenerate (JSDoc değişiklikleri; path SAYISI değişmedi).

### Notes — karşılığı olmayan alanlar
- **`SimplePartyInput.alias` (sender + customer) — UBL-TR Invoice'ta karşılığı YOKTUR.** Etiket (`urn:mail:defaultpk@…`) faturaya değil **zarfa** aittir (GİB e-Fatura Paketi SBDH: `<sender alias="…"/>` / `<receiver alias="…"/>`). GİB `PartyType`'ında etiket için tanımlı eleman yoktur; `cbc:EndpointID` şemada bulunsa da UBL-TR kılavuzunda bu amaçla kullanılmaz — oraya yazmak standart dışı olurdu. e-Arşiv'de etiket kavramı hiç yoktur. **Tipten çıkarmak public API'de kırıcı olurdu**, bu yüzden alan korundu ve JSDoc'ta "XML'e YAZILMAZ, zarf seviyesindedir" olarak açıkça belgelendi. Zarf üretimi kütüphanenin sorumluluk sınırı dışıdır (aynı sınır `UBLExtensions`/imza için de geçerli).

### Notes — doğrulama kaynakları (tahmin değil)
- **Yerleşim:** GİB UBL-TR 1.2.1 pakedi `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd` → `ItemType` (`Description → Name → Keyword → BrandName → ModelName → Buyers… → Sellers… → Manufacturers… → AdditionalItemIdentification → OriginCountry → CommodityClassification → ItemInstance`), `InvoiceLineType` (`ID → Note → InvoicedQuantity → …`), `PackageType` (`ID → Quantity → … → PackagingTypeCode`), `CountryType` (`IdentificationCode 0..1 → Name 1..1`), `ItemIdentificationType` (yalnız `cbc:ID`).
- **GİB–OASIS sıralama farkı:** B-101'de GİB, `DeliveryType`'ta `CarrierParty`/`DeliveryParty` sırasını OASIS'e göre TERS çevirmişti. Bu turda dokunulan **dört tipin hiçbirinde** (`ItemType`, `InvoiceLineType`, `PackageType`, `CountryType`) böyle bir sapma YOKTUR — GİB, OASIS UBL 2.1 göreli sırasını korumuştur. Yine de tüm sıralar OASIS'ten değil GİB pakedinden okundu.
- **Uçtan uca kanıt:** altı yeni alanın tamamını + paket bloğunu içeren IHRACAT faturası, imza/zarf iskeleti tamamlandıktan sonra `xmllint --schema xsdrt/maindoc/UBL-Invoice-2.1.xsd` doğrulamasından **geçer**; aynı belgenin eski `ActualPackage` sırasıyla üretilmiş hâli **reddedilir**.
- **Schematron:** UBL-TR Main/Common Schematron'da `BrandName`, `OriginCountry`, `*ItemIdentification` ve `InvoiceLine/cbc:Note` üzerinde hiçbir kısıt yok. Tek ilgili kural `ActualPackage/cbc:PackagingTypeCode`'un kod listesinde olmasıdır (zaten `package-type-code-config` ile karşılanıyor). Eklenen bloklar Schematron-nötr.
- **`'basic'` kipi KIRILMADI ve yeni zorunluluk EKLENMEDİ.** Tüm alanlar opsiyonel `cbc`/`cac` elemanlarıdır; boş/verilmemiş alanda hiçbir element emit edilmez. `basic` ile `strict` çıktıları birebir aynıdır (test ile sabitlendi). Public API tamamen additive — kırıcı değişiklik yok.

### Test
- `__tests__/integration/line-item-fields.test.ts` (+22) — emisyon, `ItemType`/`InvoiceLineType`/`PackageType` XSD sırası, `OriginCountry` Name-zorunluluğu, çok değerli `cbc:Note`, boş-string koruması, basic≡strict eşitliği, `alias`'ın XML'e yazılmadığının sözleşme testi.
- 1788 → 1810 (+22). Mevcut 1788 testin tamamı yeşil kaldı.

---

**B-101 — İnternet satışı kargo/teslim bilgisi XML'e yazılıyor.** Bu değişiklikler 2.3.0 ile yayınlandı.

### Fixed
- 🔴 **`onlineSale.carrierName` / `carrierTaxNumber` / `deliveryDate` SESSİZCE kayboluyordu.** Alanlar `SimpleOnlineSaleInput` tipinde tanımlıydı, ancak `simple-invoice-mapper` bunları hiç okumuyordu — kullanıcı doldursa bile üretilen XML'de tek iz kalmıyordu. Kütüphanenin kendi `examples/21-earsiv-satis-basic` örneği `carrierName: 'Hızlı Kargo A.Ş.'` + `carrierTaxNumber` veriyor, işlenmiş `output.xml`'de hiçbiri yoktu. Artık `cac:Delivery` bloğuna yazılıyorlar:
  - `deliveryDate` → `cac:Delivery/cbc:ActualDeliveryDate`
  - `carrierTaxNumber` → `cac:Delivery/cac:CarrierParty/cac:PartyIdentification/cbc:ID` (`schemeID` 10 hane→`VKN`, 11 hane→`TCKN`)
  - `carrierName` → `cac:CarrierParty/cac:PartyName/cbc:Name` (TCKN ise ayrıca `cac:Person/FirstName`+`FamilyName`)
- **`DELIVERY_SEQ`'te `CarrierParty` slotu yoktu** — eleman verilse de XSD sırasına yerleştirilemezdi. Eklendi ve **`DeliveryParty`'den ÖNCE** konumlandırıldı: GİB UBL-TR daraltılmış `DeliveryType`'ta sıra bu yöndedir, OASIS UBL 2.1'de ise TERSİDİR (`DeliveryParty` → `CarrierParty`). UBL-TR belgesi ürettiğimiz için GİB sırası bağlayıcı.

### Added
- `DeliveryInput.actualDeliveryDate` ve `DeliveryInput.carrierParty` (`PartyInput`).
- `SimpleOnlineSaleInput`'a taşıyıcı adres alanları: `carrierDistrict`, `carrierCity`, `carrierAddress`, `carrierCountry` (varsayılan `"Türkiye"`). **Gerekçe:** UBL-TR `PartyType`'ta `cac:PostalAddress` **zorunludur** (`minOccurs` verilmemiş = 1) ve içinde `CityName` + `CitySubdivisionName` zorunludur (B-35) — il/ilçe olmadan şema-geçerli `CarrierParty` üretilemez.
- `serializePartyAs(party, tagName, indent)` — `PartyType` içeriğini istenen `cac:` etiketiyle sarmalar. `cac:CarrierParty` XSD'de `PartyType`'tır; içinde ayrıca `<cac:Party>` sarmalı YOKTUR.
- `validators/online-sale-validator.ts` — `validateOnlineSaleShipment()` + `canBuildCarrierParty()`.

### Changed
- **Yalnız `validationLevel: 'strict'`**: internet satışında (`isOnlineSale === true`) `deliveryDate` ve taşıyıcı bilgisi zorunlu; taşıyıcı bilgisi verilmişse blok tam olmalı (`carrierTaxNumber` + `carrierName` + `carrierCity` + `carrierDistrict`); VKN/TCKN 10 veya 11 hane olmalı.
  - **`'basic'` (varsayılan) davranışı KIRILMADI**: eksik adreste `CarrierParty` sessizce atlanır, `ActualDeliveryDate` yine de yazılır. Bu alanlar bugüne dek zaten yok sayıldığı için eksik gönderen mevcut tüketiciler hatasız çalışmaya devam eder.
- `examples/21-earsiv-satis-basic` girdisine `carrierDistrict` / `carrierCity` / `deliveryDate` eklendi; `output.xml` yeniden üretildi (artık `cac:Delivery` bloğunu içeriyor).
- `session-paths.generated.ts` regenerate (1170 → 1206 satır, +4 yeni kargo alanı). Generator boyut korkuluğunun üst sınırı 1200 → 1300.

### Notes — doğrulama kaynakları (tahmin değil)
- **Yerleşim:** GİB UBL-TR 1.2.1 pakedi `xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd` → `DeliveryType` sırası `… EstimatedDeliveryPeriod → CarrierParty → DeliveryParty → Despatch → DeliveryTerms → Shipment`; `<xsd:element name="CarrierParty" type="PartyType"/>`. `xsdrt/maindoc/UBL-Invoice-2.1.xsd` → `InvoiceType` sırası `… TaxRepresentativeParty → Delivery → PaymentMeans …`.
- **Zorunluluk:** e-Arşiv Raporu Kılavuzu §3.3.2.17 `fatura/internetSatisBilgi` → `gonderiBilgileri/gonderimTarihi` (kardinalite 1) ve `gonderiBilgileri/gonderiTasiyan` (kardinalite 1, `kisiType`). v1.17 (22.05.2024) ile gönderim bilgileri zorunlu hâle geldi. UBL bu iki veriyi taşımazsa entegratör geçerli e-Arşiv raporu üretemez.
- **Uçtan uca kanıt:** üretilen `examples/21` çıktısı, imza/zarf iskeleti (`ext:UBLExtensions` + `cac:Signature` — kütüphanenin belgelenmiş sorumluluk sınırı DIŞI) tamamlandıktan sonra `xmllint --schema xsdrt/maindoc/UBL-Invoice-2.1.xsd` doğrulamasından **geçer**.
- **Schematron:** UBL-TR Main/Common Schematron'da fatura seviyesinde `Delivery`/`CarrierParty` kısıtı yok (mevcut kurallar yalnız `DespatchAdvice` bağlamında). Eklenen blok Schematron-nötr.
- **`onlineSale` verilmezse profil `TICARIFATURA`** davranışı BİLEREK değiştirilmedi — profil seçimi çağıranın sorumluluğudur (e-Fatura mı e-Arşiv mi kararı mükellef sorgusuna dayanır, kütüphane bunu bilemez).

### Test
- `__tests__/integration/online-sale-delivery.test.ts` (+18) — emisyon, XSD sırası, TCKN gerçek kişi ayrıştırma, basic/strict farkı, geriye dönük uyum.
- 1770 → 1788 (+18). Mevcut 1770 testin tamamı yeşil kaldı.

## [2.2.6] — 2026-04-30

**Library Suggestions Patch (Mimsoft greenfield F5 ENGELLEYİCİ).** Tek küçük additive öneri — generator extension.

### Added
- **`additionalDocuments[i].attachment.*`** alt-field'ları için 5 SessionPaths path entry (Library Öneri #9):
  - `additionalDocumentAttachmentFilename(i)` — `string`
  - `additionalDocumentAttachmentMimeCode(i)` — `string`
  - `additionalDocumentAttachmentData(i)` — `string` (base64)
  - `additionalDocumentAttachmentEncodingCode(i)` — `string | undefined` (UBL spec genelde `'Base64'`, mapper fallback)
  - `additionalDocumentAttachmentCharacterSetCode(i)` — `string | undefined` (mapper fallback `'UTF-8'`)
  - 5 yeni `update()` template literal overload (`InvoiceSessionUpdateOverloads` interface'i otomatik genişledi — generator-driven, Sprint 8l.2 pattern).
- **Generator inline literal sub-object desteği** (`scripts/generate-session-paths.ts` → `extractInlineLiteralFields()` helper) — single `{...}` form (array değil); Sprint 8j.2'deki `Array<{...}>` / `{...}[]` desteğinin tamamlayıcısı. Şu an kütüphane çapında tek etkilenen field: `SimpleAdditionalDocumentInput.attachment`.

### Changed
- **`session-paths.generated.ts`** regenerate (1140 → 1170 line). Side effect yok — yalnızca yeni 5 path + 5 overload + `__InlineObj_SimpleAdditionalDocumentInput_attachment` synthetic interface.

### Test
- `__tests__/calculator/simple-additional-document-attachment.test.ts` (+4) — 5 path round-trip, attachment optional, `unset('additionalDocuments')` cleanup, UBL mapper smoke (XML çıktısında `cbc:EmbeddedDocumentBinaryObject` element'leri).
- `__tests__/scripts/generate-session-paths.test.ts` — Sprint 8j.2'de eklenen "still skips single inline literals" testi inverse edildi → "includes single inline literal sub-object paths" (artık 5 path üretiliyor).
- 1766 → 1770 (+4)

### Notes
- **Tip alanı (`SimpleAdditionalDocumentInput.attachment`) ve UBL Attachment mapper v2.2.5'te zaten mevcuttu** — bu patch sadece SessionPaths/update() yüzeyini açtı. Mimsoft öneri 1.5-4 saat scope öngörüyordu (mapper genişletme dahil); kod incelemesi sonucu 30-60 dakika scope (sadece generator extension).
- F5 (additional-documents-section) Mimsoft `yarn upgrade json2ubl-ts@2.2.6` sonrası başlatılabilir.

### Migration v2.2.5 → v2.2.6

API değişikliği yok, additive — `yarn upgrade json2ubl-ts@2.2.6` yeterli.

```typescript
import { InvoiceSession, SessionPaths } from 'json2ubl-ts';

const session = new InvoiceSession();
session.update(SessionPaths.additionalDocumentId(0), 'DOC-001');
// File upload (FileReader → base64) sonucu attachment alanları:
session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'fatura.pdf');
session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
session.update(SessionPaths.additionalDocumentAttachmentData(0), '<base64-encoded-data>');
session.update(SessionPaths.additionalDocumentAttachmentEncodingCode(0), 'Base64');

// UBL XML üretiminde attachment cac:Attachment / cbc:EmbeddedDocumentBinaryObject olarak çıkar.
const xml = session.buildXml();
```

## [2.2.5] — 2026-04-29

**Library Suggestions Patch (Mimsoft greenfield F2.C2.6 + C2.9).** Tek küçük additive öneri uygulandı.

### Added
- **`PartyIdentificationSchemeId`** literal union public re-export (Library Öneri #7) — 27 UBL TR-Identifier şema kodu (B-69, `PartyIdentification.schemeID`). Tüketicilerin `Record<PartyIdentificationSchemeId, string>` narrow map (label/option dropdown) kurması için gerekli. Önceden lokal türetim (S-8 sınırı) gerekiyordu; v2.2.5 ile cast'siz `import type { PartyIdentificationSchemeId } from 'json2ubl-ts'`.
  - VKN/TCKN literal union'a **dahil edilmedi** (bunlar `party.taxNumber` alanında ayrı yönetilir; UI akışında "ek tanımlayıcı" rolünde kullanılan kodlar için narrow tip).
  - Runtime `PARTY_IDENTIFICATION_SCHEME_IDS` seti (29 entry, TCKN+VKN dahil) **değişmedi** — despatch validator'ları (`despatch-validators.ts`) bu seti `set.has(schemeId)` ile string kabul ederek kullanıyor.

### Test
- Public re-export integration (Öneri #7, +3): `__tests__/integration/exports.test.ts`
- 1763 → 1766 (+3)

### Migration v2.2.4 → v2.2.5

API değişikliği yok, additive — `yarn upgrade json2ubl-ts@2.2.5` yeterli.

```typescript
import {
  PARTY_IDENTIFICATION_SCHEME_IDS,
  type PartyIdentificationSchemeId,
} from 'json2ubl-ts';

// Mimsoft greenfield F2.C2.9 — narrow label map (drift mitigation):
const PARTY_IDENTIFICATION_SCHEME_LABELS: Record<PartyIdentificationSchemeId, string> = {
  MERSISNO: 'MERSİS No',
  MUSTERINO: 'Müşteri No',
  // ... library yeni scheme eklerse Mimsoft TS hatası alır → label eklenmesi zorunlu
};

// Runtime set hâlâ string kabul eder (validator uyumu):
PARTY_IDENTIFICATION_SCHEME_IDS.has('TCKN');  // ✓ true (despatch için)
```

## [2.2.4] — 2026-04-29

**Library Suggestions Patch (Mimsoft greenfield F1.C1.x).** İki öneri uygulandı; biri additive public re-export, biri TS 5.7+ inference uyumsuzluğu için generator-driven overload bloğu.

### Added
- **6 public type re-export'u** (Library Öneri #5):
  - `Suggestion`, `SuggestionRule`, `SuggestionSeverity` (`suggestion-types.ts`)
  - `PathErrorPayload`, `PathErrorCode` (`invoice-session.ts`)
  - `LineFieldVisibility` (`line-field-visibility.ts`, direkt re-export — modül zinciri kısaltma)
  - Önceden inferred type (`SessionEvents['suggestion'][number]`) ile erişiliyordu; v2.2.4 ile cast'siz `import type { Suggestion } from 'json2ubl-ts'` mümkün.
- **`SuggestionSeverity`** literal union ayrı tip alias olarak çıkarıldı (`'recommended' | 'optional'`); önceden `Suggestion.severity` field'ında inline literal idi.
- **`InvoiceSessionUpdateOverloads`** interface'i (generator output, `session-paths.generated.ts`) — declaration merging ile `InvoiceSession` class'ına 130+ spesifik literal `update()` overload enjekte eder.
- **`scripts/check-ts57-strict.sh`** + **`npm run check:ts57`** — Mimsoft tüketici tsconfig simülasyonu (TS 5.7.3 + bundler moduleResolution + strict). CI hook'u olarak gelecekte eklenebilir.

### Changed
- **`InvoiceSession.update()`** method imzası yeniden organize edildi (Library Öneri #6 — TS 5.7+ inference fix):
  - Class'ta sadece **implementation imzası** var: `update(path: string, value: unknown): void`.
  - Tüm public overload'lar `InvoiceSessionUpdateOverloads` interface'inde (declaration merging ile enjekte).
  - Sebep: TS 5.4–5.7 arasında template literal type inference davranışı değişti; `keyof SessionPathMap` template literal placeholder key'lerini (`'X[${number}].Y'`) distributive union'da match etmiyor; `<P extends keyof SessionPathMap>` generic catch-all'ı declaration merging'le incompatible. Çözüm: TÜM path entry'leri için spesifik literal overload üretmek (doc-level + fonksiyonel) — generator-driven, sürdürülebilir.
  - Runtime davranış değişmedi — sadece public type surface yeniden organize edildi. Mevcut tüm tüketici kodları çalışmaya devam eder.

### Fixed
- **TS 5.7+ strict + bundler `moduleResolution` ortamında fonksiyonel `SessionPaths.X(i)` path'lerinin `update()` çağrısında `TS2345` hatası** (Library Öneri #6).
  - Sprint 8k.2'deki narrow `as` template literal cast TS 5.3.3'te yeterliydi fakat TS 5.7'de yetersizdi.
  - v2.2.4 ile `InvoiceSessionUpdateOverloads` interface'i 130+ spesifik literal overload üretir; Mimsoft action helper pattern'i (`forEach + i: number → SessionPaths.X(i) → update(path, value)`) **cast'siz** çalışır.
  - Mimsoft'taki **15 cast satırı + `LIBRARY-SUGGESTION-#6 PENDING` etiketleri** `yarn upgrade json2ubl-ts@2.2.4` sonrası silinebilir.
  - Doğrulama: `npm run check:ts57` (TS 5.7.3 + Mimsoft tsconfig) → 0 hata.

### Test
- Public re-export integration (Öneri #5, +6): `__tests__/integration/exports.test.ts`
- Action helper pattern overload smoke (Öneri #6, +7): `__tests__/integration/session-paths-action-helper.test.ts`
- 1750 → 1763 (+13)

### Migration v2.2.3 → v2.2.4

API değişikliği yok, additive — `yarn upgrade json2ubl-ts@2.2.4` yeterli.

```typescript
// v2.2.3'te workaround/cast gerekiyordu, v2.2.4'te cast'siz çalışır:
import {
  InvoiceSession,
  SessionPaths,
  type Suggestion,
  type PathErrorPayload,
  type LineFieldVisibility,
} from 'json2ubl-ts';

const session = new InvoiceSession();

// Öneri #5 — public tipler:
session.on('suggestion', (s: Suggestion[]) => { ... });
session.on('path-error', (e: PathErrorPayload) => { ... });

// Öneri #6 — action helper pattern cast'siz:
[{ schemeId: 'MERSISNO', value: '0001' }].forEach((id, i) => {
  session.update(SessionPaths.senderIdentificationSchemeId(i), id.schemeId);  // ✓ cast yok
  session.update(SessionPaths.senderIdentificationValue(i), id.value);
});
```

## [2.2.3] — 2026-04-28

**Library Suggestions Patch (Mimsoft greenfield prerekuizitleri).** Mimsoft monorepo greenfield refactor (`audit/greenfield/99-library-suggestions.md`) için 4 öneri uygulandı. Tüm değişiklikler additive, breaking change yok. Sprint 8k (8 atomik commit, 1724→1750 test, +26).

### Added

- **`SimpleSgkType` literal union public re-export'u** (Library Öneri #1, Sprint 8k.1) — `simple-types.ts`'te tanımlı olan tip ana paket entry'sinden public olarak erişilebilir hale geldi:
  ```typescript
  import type { SimpleSgkType } from 'json2ubl-ts';
  const t: SimpleSgkType = 'SAGLIK_ECZ';
  ```
- **`InvoiceSession.removeIdentification(party, index)`** API (Library Öneri #4, Sprint 8k.4) — sender/customer/buyerCustomer identifications array'inde belirli index'i siler. Path-based `update()` API'si index kaydırma yapamadığı için KAMU MUSTERINO / IDIS SEVKIYATNO ekle-sil akışında kritik. Tek elemanlı array sonrası undefined yapılır (XML'de `<cbc:ID schemeID=""/>` üretiminden kaçınır).
- **`InvoiceSession.setIdentifications(party, ids)`** API — identifications array'ini tamamen değiştirir; `undefined` veya `[]` geçildiğinde field undefined yapılır. `deepEqual` no-op (aynı içerik → emit yok).
- **`IdentificationParty`** tip union public export — `'sender' | 'customer' | 'buyerCustomer'`.

### Changed

- **`UnsetScope`** literal union'a `'despatchReferences'` ve `'additionalDocuments'` eklendi (Library Öneri #3, Sprint 8k.3). Array composite reset için tip-güvenli API. Implementation kodu değişmedi — Sprint 8j.3'teki generic `delete` pattern bu scope'lara doğal şekilde uygulanır.
- **Generator script** (`scripts/generate-session-paths.ts`) `renderEntry()` fonksiyon path return değerlerine narrow `as` template literal cast eklendi (Library Öneri #2, Sprint 8k.2). Önceki:
  ```typescript
  senderIdentificationSchemeId: (i: number) => `sender.identifications[${i}].schemeId`,
  ```
  Sonra:
  ```typescript
  senderIdentificationSchemeId: (i: number) =>
    `sender.identifications[${i}].schemeId` as `sender.identifications[${number}].schemeId`,
  ```
  → `update<P extends keyof SessionPathMap>(...)` generic'iyle cast'siz assign edilebilir (compile-time tip güvenliği). Tüm fonksiyon path'leri için defensive uygulandı (sadece identifications değil — tutarlılık).

### Test

- 1724 → 1750 (+26):
  - `__tests__/integration/exports.test.ts` (+4) — `SimpleSgkType` public export smoke test
  - `__tests__/calculator/session-paths-narrow-type.test.ts` (+4) — narrow literal `keyof SessionPathMap` assignability + cast'siz `update()` integration
  - `__tests__/calculator/invoice-session-unset.test.ts` (+6) — `unset('despatchReferences')` + `unset('additionalDocuments')` set/unset/idempotent/remount
  - `__tests__/calculator/invoice-session-identifications.test.ts` (+12) — `removeIdentification` (5 senaryo + event) ve `setIdentifications` (replace/empty/undefined/event/no-op/no-mount)
- 162 examples-matrix regression: hiçbir senaryo bozulmadı (tüm değişiklikler additive).

### Migration v2.2.2 → v2.2.3

API değişikliği yok, additive — `yarn upgrade json2ubl-ts@2.2.3` yeterli.

```typescript
// v2.2.2'de cast/workaround gerekiyordu, v2.2.3'te cast'siz çalışır:
import {
  InvoiceSession,
  SessionPaths,
  type SimpleSgkType,
  type IdentificationParty,
} from 'json2ubl-ts';

const session = new InvoiceSession();
session.update(SessionPaths.senderIdentificationSchemeId(0), 'MERSISNO');  // narrow type
session.removeIdentification('customer', 0);                                // splice API
session.unset('despatchReferences');                                         // array reset
```

## [2.2.2] — 2026-04-28

**Browser/Next.js uyumluluğu — `deepEqual` browser-safe inline.** Mimsoft Next.js Turbopack ortamında v2.2.1'in `InvoiceSession.update()` her path çağrısında runtime hata atması düzeltildi.

### Fixed

- **`deepEqual` browser-safe inline implementation** (`src/calculator/session-path-utils.ts`). v2.2.1 `import { isDeepStrictEqual } from 'node:util'` kullanıyordu; Next.js Turbopack `next/dist/compiled/util/util.js` polyfill'inde `isDeepStrictEqual` export edilmemesi nedeniyle browser'da `TypeError: ... is not a function` atıyordu. Hata `InvoiceSession.update(path, value)` her diff-detection çağrısında tetikleniyordu, dolayısıyla form ilk render'da crash ediyordu. Şimdi `Object.is` + structural compare ile inline yazıldı; Node ve browser ortamlarında deterministik çalışır. Davranış uyumu korundu: NaN === NaN (Object.is), +0 ≠ -0, plain object / array structural eşitlik. Date/RegExp/Map/Set kapsam dışı (Mimsoft input modelinde yok).

### Migration Guide (v2.2.1 → v2.2.2)

API değişikliği yok, sadece bug fix. Mimsoft ve diğer browser tüketicileri için `yarn upgrade json2ubl-ts@2.2.2` yeterli; herhangi bir kod değişikliği gerekmez.

---

## [2.2.1] — 2026-04-28

**Migration Hotfix.** Mimsoft monorepo migration (v1.4.2 → v2.2.0) için 3 kritik blocker fix'i. Tüm değişiklikler additive, breaking change yok. Sprint 8j (7 atomik commit, 1694→1724 test, +30).

### Added

- **`SessionPaths` runtime export** (Bulgu 1): generated dosyada (`src/calculator/session-paths.generated.ts`) `SessionPaths` constant mevcuttu fakat ana paket entry'sinden re-export edilmiyordu. README'deki `import { SessionPaths } from 'json2ubl-ts'` örnekleri artık runtime'da çalışır. `SessionPathMap` tipi de re-export edildi.
- **Party identifications path entries** (Bulgu 2 — 6 yeni entry):
  - `senderIdentificationSchemeId(i)` / `senderIdentificationValue(i)` — `sender.identifications[i].schemeId/value`
  - `customerIdentificationSchemeId(i)` / `customerIdentificationValue(i)` — `customer.identifications[i].schemeId/value`
  - `buyerCustomerIdentificationSchemeId(i)` / `buyerCustomerIdentificationValue(i)` — `buyerCustomer.identifications[i].schemeId/value`
  - Mimsoft kritik senaryolar: IDIS profili → SEVKIYATNO, KAMU profili → MUSTERINO (B-83), HKS profili → KUNYENO, çoklu schemeId (yolcu profilleri).
  - **NOT:** Plan'da `taxRepresentativeParty.additionalIdentifiers` belirtilmişti fakat `SimpleTaxRepresentativeInput` tip kontratında bu alan yok (sadece `vknTckn`/`label`/`name`) — kapsamdan çıkarıldı.
- **`InvoiceSession.unset(scope)`** (Bulgu 3): v1.x'in `setBillingReference(undefined)` semantiğinin path-based API karşılığı. `update('billingReference.id', undefined)` tip uyumsuz, empty string ise XML'de boş alan üretir; `unset(scope)` composite'i tamamen kaldırır.
  - **`UnsetScope`** union tipi: `'billingReference' | 'paymentMeans' | 'ozelMatrah' | 'sgk' | 'invoicePeriod' | 'buyerCustomer' | 'taxRepresentativeParty' | 'eArchiveInfo' | 'onlineSale' | 'orderReference' | 'liability'`.
  - Davranış: önceki value undefined ise no-op (idempotent); composite scope `_input[scope]` delete + `field-changed` event; liability scope `_liability = undefined` + `field-changed` + `liability-changed` event; `isExport=true` + scope==='liability' → `path-error` LIABILITY_LOCKED_BY_EXPORT (M10 simetrisi).
  - `updateUIState()` + `onChanged()` tetiklenir.
  - Sub-field path ile remount: D-6 sub-object create devam eder — `unset` sonrası `update('billingReference.id', 'X')` composite'i yeniden oluşturur.

### Changed

- **`InvoiceSession.update()` index bound check** (Sprint 8j.2): party identifications çoklu append için kritik.
  - Parent array `undefined` + `index===0` → kabul (D-6 sub-object create ile boş array oluşturulur).
  - `index === current.length` artık kabul (next-append, yeni element).
  - `index > current.length` reddedilir (sparse skip korunur).
  - Mevcut bound check testleri korunuyor (`lines[5]` length=0, `taxes[1]` undefined hâlâ INDEX_OUT_OF_BOUNDS).
- **Generator script** (`scripts/generate-session-paths.ts`): inline literal array desteği — `Array<{...}>` ve `{...}[]` form'ları AST'den parse edip synthetic interface'e indirger; `addSubObjectEntries` sub-object array dalı eklendi.

### Fixed

- `SessionPaths` runtime'da yoktu (Sprint 8h.1 export hatası).
- Party-level identifications array'leri SessionPathMap'ten eksikti.

### Test

- 1694 → 1724 (+30):
  - SessionPaths public export (8j.1): +6 test (`__tests__/integration/session-paths-export.test.ts`)
  - Party identifications (8j.2): +7 test (`__tests__/calculator/session-paths-party-identifications.test.ts`) + 1 generator regression test güncellemesi
  - `unset(scope)` (8j.3): +16 test (`__tests__/calculator/invoice-session-unset.test.ts`)
- 162 examples-matrix regression: hiçbir senaryo bozulmadı (tüm değişiklikler additive).

### Migration v2.2.0 → v2.2.1

Geri uyumlu — `npm install json2ubl-ts@2.2.1` ile yeterli.

```typescript
// v2.2.0'da çalışmıyordu, v2.2.1'de çalışır:
import { SessionPaths, InvoiceSession } from 'json2ubl-ts';

const session = new InvoiceSession();
session.update(SessionPaths.senderIdentificationSchemeId(0), 'MERSISNO');
session.unset('billingReference');
```

## [2.2.0] — 2026-04-27

**SuggestionEngine (AR-10 Faz 2).** Reactive InvoiceSession Faz 2: validator-error'lardan ayrı **advisory** kanal — "bu varsayılanı seçmek istemez misin?" tarzı UI önerileri. 23 kural, batch event payload, primary key bazlı diff. Sprint 8i (15 atomik commit, 1407→1694 test, +287). Faz 1 + Faz 2 birlikte tek release.

### Added

- **`Suggestion` tip** + **`SuggestionRule` interface** (T-6 deklaratif): `path`, `value`, `reason`, `severity` (recommended|optional), `ruleId` (namespace `{domain}/{slug}`), opsiyonel `displayLabel`/`displayValue`.
- **`runSuggestionEngine(input, ui)`** (`src/calculator/suggestion-engine.ts`): pure function, full liste döner (T-2, T-7).
- **`diffSuggestions(prev, next)`** primary key bazlı diff (T-2): `${ruleId}::${path}` key, value/reason/severity değişimi changed tetikler. Object reference karşılaştırma yapılmaz (R3 mitigation).
- **`suggestion` event** (T-3 batch payload): `Suggestion[]` — yeni veya değişmiş öneriler. Boş diff (added=0 && changed=0) → emit YOK. `removed` array hesaplanır ama emit edilmez (T-4 — `suggestionResolved` event yok, sonraki tick'te yokluğu UI fark eder).
- **`InvoiceSession._lastSuggestions`** private field — diff state. Engine pure, session diff stateful (T-2 ile uyumlu).
- **`InvoiceSession._runSuggestionPipeline()`** — `validate()` sonunda otomatik çağrılır. Event sıralaması §4.2: 16. `warnings` → 17. engine → 18. diff → 19. `suggestion`.
- **23 suggestion kuralı** domain bazlı (T-6, `src/calculator/suggestion-rules/`):
  - **KDV (7):** `kdv/zero-suggest-351`, `kdv/ytb-istisna-suggest-308`, `kdv/ytb-istisna-suggest-339`, `kdv/exemption-mismatch-tax-type`, `kdv/manual-exemption-suggest-line-distribution`, `kdv/reduced-rate-suggest-1`, `kdv/reduced-rate-suggest-8-10`
  - **Tevkifat (5):** `withholding/tevkifat-default-codes`, `withholding/650-percent-required`, `withholding/profile-tevkifat-suggests-ticarifatura`, `withholding/exemption-conflict`, `withholding/ytb-tevkifat-itemclass-required`
  - **IHRACKAYITLI (3):** `ihrackayitli/702-default-suggestion`, `ihrackayitli/702-gtip-required`, `ihrackayitli/702-alicidib-required`
  - **YATIRIMTESVIK (4):** `yatirim-tesvik/itemclass-default`, `yatirim-tesvik/makine-traceid-required`, `yatirim-tesvik/makine-serialid-required`, `yatirim-tesvik/insaat-suggest-itemclass-02` (heuristic, R5 izleme)
  - **Delivery (3):** `delivery/ihracat-incoterms-required`, `delivery/gtip-format-12-digit`, `delivery/transport-mode-suggest-ihracat`
  - **Misc (2):** `currency/exchange-rate-required`, `paymentmeans/iban-format-tr`
- **Suggestion ↔ Validator dikhotomi paralel kontratı** (master plan §3.3): aynı path için iki kanal paralel emit edilebilir; UI iki mesajı yan yana sunar (kırmızı hata + mavi öneri). Test enforcement: `__tests__/calculator/invoice-session-dichotomy.test.ts`.
- **Performance benchmark** (R2 mitigation): suggestion engine ≤5ms (gerçek 0.010-0.027ms — 500x altı), toplam pipeline ≤15ms (gerçek 0.137ms — 100x altı). `__tests__/benchmarks/suggestion-engine.bench.test.ts`.
- **Examples session parity regression**: 34 invoice senaryo (`__tests__/examples/session-parity.test.ts`) + 116 invoice examples-matrix (`__tests__/examples-matrix/full-session-parity.test.ts`) = **150 senaryo regression**. İrsaliye senaryoları skip (DespatchBuilder, kapsam dışı).
- **README §2.X**: SuggestionEngine API rehberi (Faz 2, v2.2.0+).

### Changed

- **`InvoiceSession.buildXml()`** `allowReducedKdvRate` opt-in **artık builder'a geçiriliyor** (Sprint 8h hijyen fix — 30-feature-555 senaryosu yakaladı).
- **`SessionEvents` interface**: `suggestion: Suggestion[]` event tipi eklendi.
- **Event sıralaması**: 19 event'ten 20 event'e (suggestion son adım, sıralama §4.2 kilitli).

### Sapmalar (Plan'a Göre)

Plan §3'de 25 kural önerilmişti, **23 kural net**:
1. **Kural 4 ertelendi** (`kdv/zero-clear-exemption-on-rate-change`): transition state gerektiriyor (engine pure prensibi — T-2 ile çakışıyor). Sprint 8j'ye ertelendi (R6).
2. **`paymentmeans/payment-means-code-default` ATLANDI**: `SimplePaymentMeansInput.meansCode` required (boş olamaz, kural tetiklenmez).
3. **S-6 path sequence converter Sprint 8j'ye ertelendi**: Sprint 8h.9'daki `buildSessionFromInput` `initialInput` pattern'i zaten XML output regression değerini sağlıyor. Path sequence formatı (50+ ardışık update) **incremental flow** test eder; bu Sprint 8j'ye ertelendi.

### Migration Guide (v2.1.0 → v2.2.0)

Faz 2 **fully backward compatible** — mevcut kod değişmeden çalışır. Sadece yeni `suggestion` event listener eklenir:

```typescript
// v2.2.0: yeni suggestion event listener
import { InvoiceSession } from 'json2ubl-ts';
import type { Suggestion } from 'json2ubl-ts/calculator/suggestion-types';

const session = new InvoiceSession({ /* ... */ });

session.on('suggestion', (suggestions: Suggestion[]) => {
  for (const s of suggestions) {
    showAdvisoryHint({
      path: s.path,            // 'lines[0].kdvExemptionCode'
      value: s.value,          // '351'
      reason: s.reason,        // Türkçe tooltip
      severity: s.severity,    // 'recommended' | 'optional'
    });
  }
});

// User accepts → session.update kullanılır
session.update(suggestion.path as any, suggestion.value);
```

Detay: `README.md` §2.X, `audit/sprint-08i-tasarim.md`.

---

## [2.1.0] — 2026-04-27

**Reactive InvoiceSession (AR-10) — Faz 1 / Çekirdek.** Mimsoft Next.js entegrasyonu için path-based update API + field-level events + line-level FieldVisibility + validator pipeline + B-78 köprü. Sprint 8h (14 atomik commit).

### BREAKING CHANGES

- **18 setter kaldırıldı.** Tek mutate gateway: `update(path, value)`.
  - Kaldırılanlar: `setSender`, `setCustomer`, `setBuyerCustomer`, `setType`, `setProfile`, `setLiability`, `setCurrency`, `setBillingReference`, `setPaymentMeans`, `setKdvExemptionCode`, `setOzelMatrah`, `setSgkInfo`, `setInvoicePeriod`, `setNotes`, `setId`, `setDatetime`, `setInput`, `patchInput`.
  - Korunan: `addLine`, `updateLine`, `removeLine`, `setLines` (array operations path-based değil).
  - Migration örneği: `setType('TEVKIFAT')` → `update(SessionPaths.type, 'TEVKIFAT')`.
- **`error` event semantik daraltıldı.** Sadece runtime exception için (calculate throw). Path-related rejection (`READ_ONLY_PATH`, `PROFILE_LIABILITY_MISMATCH` vb.) yeni `path-error` event'inde. (D-Seçenek B)
- **`update('isExport', x)`** read-only — `path-error` (`READ_ONLY_PATH`) emit + no-op. `isExport` constructor-only readonly. (D-10, M10)
- **`update('liability', x)`** isExport=true session'da → `path-error` (`LIABILITY_LOCKED_BY_EXPORT`). (M10 kontratı, mevcut setLiability no-op davranışı korunur — D-9)
- **D-12 type force**: isExport=true session'da `update('type', 'SATIS')` → `field-changed` payload `{ value: 'ISTISNA', requestedValue: 'SATIS', forcedReason: 'isExport=true' }`.

### Added

- **`SessionPaths` path map** (AR-10): `simple-types.ts` AST tarayan otomatik generator (`scripts/generate-session-paths.ts`, TS Compiler API). 117 path entry, JSDoc'lu, `SessionPathMap` generic tip. `npm run verify:paths` CI drift check (D-1).
- **`update<P extends keyof SessionPathMap>(path, value)`** generic API (D-8): compile-time tip kontrolü + IDE autocomplete.
- **4 katman path validation + constraint check** (S-2): INVALID_PATH / READ_ONLY_PATH / UNKNOWN_PATH / INDEX_OUT_OF_BOUNDS / PROFILE_EXPORT_MISMATCH / PROFILE_LIABILITY_MISMATCH / LIABILITY_LOCKED_BY_EXPORT. Tüm reddedilenler `path-error` event'i + no-op.
- **In-house bracket notation parser** (`session-path-utils.ts`, D-1): `lines[0].taxes[1].code` → token sequence. ts-morph / lodash dependency YOK.
- **Field-level events**: `field-changed`, `field-activated`, `field-deactivated`, `line-field-changed`. 18 adımlı sıralama (§3.1) test ile enforce. (D-4)
- **D-12 forcedReason payload**: `field-changed.requestedValue` + `field-changed.forcedReason` (auto-force durumunda).
- **`LineFieldVisibility`** (10 alan, AR-10): line-level UI kontrolü. `_uiState.lineFields[]` array senkron.
- **`deriveTypeProfileFlags()` helper** (`line-field-visibility.ts`): doc-level + line-level paylaşılır → kural duplikasyonu yok.
- **B-78 parametre köprüsü** (`deriveB78Params()`): 7 B-78 paraleli kural parametresi otomatik türetilir (önceden session pipeline'ında pasifti).
- **Validator pipeline entegrasyonu** (D-3): 5 validator (`validateSimpleLineRanges`, `validateManualExemption`, `validatePhantomKdv`, `validateSgkInput`, `validateCrossMatrix`) deterministic. `_invoiceInputCache` reference equality.
- **`ValidationError` ↔ `ValidationWarning` köprü**: `ValidationWarning.code?: string` eklendi.
- **`validation-error` event**: raw `ValidationError[]` stream.
- **`InvoiceSessionOptions.allowReducedKdvRate`** opt-in (M4 / B-78.1).
- **Performance benchmark** (D-7 ZORUNLU): 100-line update avg 0.16ms / threshold 15ms. MR-1 efektif yok hükmünde. Detay: `audit/sprint-08h-benchmark.md`.

### Changed

- **`InvoiceSession` constructor**: yeni `allowReducedKdvRate` option; `isExport` artık readonly private field.
- **`updateUIState()` her başarılı update sonrası emit** (8h.8): mevcut dar kapsam tüm path'lere genişletildi.
- **`toInvoiceInput()` cache'li** (D-3): reference equality, sıfır maliyetli hit.
- **`ValidationWarning` interface**: `code?: string` eklendi.
- **README §2** v2.1.0 / AR-10 rewrite (path-based update + 3 event hierarchy + LineFieldVisibility + Liability/isExport + React hook).

### Fixed

- **S-5**: `setId`/`setDatetime` `onChanged` çağırmama tutarsızlığı. 8h.3'te eski setter'lar kaldırıldığı için doğal olarak çözüldü; `update(SessionPaths.id, x)` artık `validate()` tetikler.

### Removed

- 18 doc-level setter (yukarıda BREAKING CHANGES'da listelendi).

### Migration Guide (v2.0.0 → v2.1.0)

```typescript
// Önce (v2.0.0)
session.setSender({ taxNumber: '...', name: '...' });
session.setType('TEVKIFAT');
session.setLiability('earchive');
session.on('error', (e: Error) => log(e.message));

// Sonra (v2.1.0)
import { SessionPaths } from 'json2ubl-ts';
session.update(SessionPaths.senderTaxNumber, '...');
session.update(SessionPaths.senderName, '...');
session.update(SessionPaths.type, 'TEVKIFAT');
session.update(SessionPaths.liability, 'earchive');
session.on('error', (e: Error) => log('runtime:', e.message));
session.on('path-error', ({ code, path, reason }) => log('reddi:', code, path, reason));
```

Detay: `README.md` §2, `audit/sprint-08h-plan.md`.

---

## [2.0.0] — 2026-04-23

**İlk feature-complete public sürüm.** `1.4.2`'den `2.0.0`'a atlamanın sebebi: çok sayıda breaking change, validator suite revizyonu, mimari kararlar (M1-M10, AR-1..AR-8). Konsolidasyon: Sprint 1-8b implementation log'ları.

### BREAKING CHANGES

- **PROFILE_TYPE_MATRIX sıkılaştırıldı** (Sprint 1): `map`/`matrix` export kaldırıldı; `getAllowedTypes()` helper API. `as any` atlatma yolları kapatıldı. (M1, AR-3/4)
- **IHRACAT/YOLCU/OZELFATURA profilleri yalnızca ISTISNA tipi** kabul eder. Diğer tiplerde `PROFILE_FORBIDDEN_TYPE` hatası. (M2)
- **TAX_EXEMPTION_MATRIX zorunluluğu** (Sprint 5): İstisna kodu × fatura tipi whitelist/forbidden kombinasyonları runtime'da uygulanır. 351 artık ISTISNA grubu değil, SATIS/TEVKIFAT vb. için `requiresZeroKdvLine` ile geçerli. (M5)
- **650 dinamik stopaj** (Sprint 2): `SimpleLineInput.withholdingTaxPercent` zorunlu (0-100). (M3, B-95)
- **555 Demirbaş KDV** `BuilderOptions.allowReducedKdvRate: true` opt-in flag ister. Default false → `REDUCED_KDV_RATE_NOT_ALLOWED`. (M4, B-96)
- **IHRACKAYITLI+702** satır seviyesi **GTİP (12 hane)** + **AlıcıDİBKod** zorunlu. (B-07)
- **YATIRIMTESVIK**: `ytbNo` (6 hane) + Kod 01 Makine için `productTraceId+serialId+brand+model` zorunlu; IADE grubunda muaf. (B-08)
- **KAMU profili** `buyerCustomer` + `paymentMeans` + TR IBAN zorunlu; `additionalIdentifiers` (MUSTERINO vb.). (B-83)
- **CustomizationID** Fatura için `TR1.2`, e-İrsaliye için `TR1.2.1` sabitleri. Eski sürümlerde her ikisi de `TR1.2.1` idi. (M8)
- **Calculator tam float**; yuvarlama yalnızca XML yazım anında XSD-yuvarlamalı alanlarda. Ara hesaplarda hassasiyet kaybı yok. (M9)
- **`setLiability()` `isExport=true` iken no-op** (error yerine). (M10)
- **`cbcTag` utility silindi**, `cbcRequiredTag` + `cbcOptionalTag` split. (AR-1)
- **`driverPerson` → `driverPersons[]` array** — çoklu sürücü ve taşıyıcı kombinasyonu. (AR-2)
- **Satır-seviyesi `kdvExemptionCode` kaldırıldı**, belge seviyesi tek kaynak. (AR-7)
- **Outstanding/Oversupply input alanları kaldırıldı**. (AR-8)

### Added

- Basitleştirilmiş giriş API: **`SimpleInvoiceBuilder`** (JSON-benzeri girdi → UBL-TR XML). Hesaplamayı kütüphane yapar (Sprint 1-2).
- **`InvoiceSession`** reaktif API + `FieldVisibility` (frontend entegrasyon için, Sprint 2).
- **`ConfigManager`** dinamik config (unit, currency, tax, withholding, exemption — Sprint 2).
- **Cross-check validator suite**: `validators/cross-check-matrix.ts` (M5, M7 türetme), `validators/cross-validators.ts`.
- **Profile validators**: YATIRIMTESVIK (B-08), IHRACKAYITLI+702 (B-07), KAMU (B-83), YOLCUBERABERFATURA (nationalityId B-104).
- **Type validators**: IADE grubu BillingReference (Schematron IADEInvioceCheck), TEVKIFAT WithholdingTaxTotal (Sprint 5).
- **Common validators**: 1460415308 / 7750409379 cross-check VKN, `PARTY_IDENTIFICATION_SCHEME_IDS` whitelist, IssueDate aralık (2005 → bugün) (Sprint 8a).
- **Despatch validators**: MATBUDAN additionalDocuments, çoklu sürücü, DORSEPLAKA canonical (AR-2, B-49, B-66).
- **Calc↔serialize round-trip integration test** (Sprint 8a).
- **XSD validator suite**: Sequence hizalama kontrolleri (B-09..B-14, B-20, vb.).
- **Mimsoft fixture regresyon suite** (f10-f17) — Sprint 8a.
- **`examples/` comprehensive pack** (Sprint 8b): **38 senaryo + 2 showcase**, her biri 6 dosya (input.ts + input.json + output.xml + run.ts + validation-errors.ts + README.md). [examples/README.md](./examples/README.md).
- **`package-type-code-config.ts`**, **`payment-means-config.ts`** (D1/D2).
- **Parent-child conditional validator** (M6): parent opsiyonel, parent verilirse child zorunlu.
- **`cbcRequiredTag` + `cbcOptionalTag`** utility split (AR-1).

### Changed

- `LegalMonetaryTotal.LineExtensionAmount` iskonto sonrası değeri kullanır. (B-15)
- 351 kodu non-ISTISNA tiplerine bağlandı. (M5)
- `nationalityId` 11-hane TCKN formatı zorunlu (ISO 2-harf reddedilir). (B-104)
- 650 kodu ile dinamik oran — kullanıcı input'u. (M3)
- Serializer 2-basamak yuvarlama XML yazım anında; calculator float. (M9)

### Fixed

- TICARIFATURA+IADE, HKS profili tip isimleri. (B-01, B-02)
- TaxExemption 10 geçersiz kod temizlendi. (B-03)
- WithholdingTaxTypeWithPercent Codelist uyumsuzluğu. (B-04)
- XSD sequence hizalaması — Invoice/Despatch açılış tag'i, 20+ serialize path. (B-09..B-14, B-20, B-32..B-35, B-41..B-47)
- Stopaj subtotal double-counting. (B-44, B-45, B-79)
- DespatchSupplierParty/DespatchContact/Name eksikliği. (B-19)
- Kamu aracı kurum additionalIdentifiers. (B-83)
- Yaklaşık 80+ serializer/validator/config bulgusu (denetim-01..06 kapsamı).

### Removed

- `B-40 PayableRoundingAmount` desteği (AR-5 tam iptal).
- Satır-seviyesi `kdvExemptionCode` alanı. (AR-7)
- Outstanding/Oversupply input alanları. (AR-8)
- Eski dead PaymentMeansCode set. (AR-6)
- `cbcTag` eski utility. (AR-1)
- `ublExtensionsPlaceholder()` dead helper + yorum-out kalıntıları (Sprint 8b.10). (B-93)
- İptal edilen bulgular: B-16, B-50, B-75, B-82, B-103 (kategori A).

### Sprint Dağılımı

- **Sprint 1-2**: M1 matrix + `SimpleInvoiceBuilder` + D1/D2 config
- **Sprint 3**: XSD sequence + M6 parent-child + AR-1 utility split
- **Sprint 4**: Calculator aritmetik + M9 yuvarlama + M10 liability
- **Sprint 5**: TAX_EXEMPTION_MATRIX + exemption-config derivation + M5/M7
- **Sprint 6**: Cross-validator suite + common-validators
- **Sprint 7**: Profile validators (YOLCU, YTB, IHRACKAYITLI), calc↔serialize integration, B-T08
- **Sprint 8a**: Devir bulgu temizliği (Paket A-H) + Mimsoft fixture regresyon + B-83..B-86 + B-104
- **Sprint 8b**: Comprehensive examples pack (38 senaryo) + README sorumluluk matrisi + skill doc referans + CHANGELOG

### Sprint 8b ile Tespit Edilen (Sprint 8c'de Giderildi)

[audit/ACIK-SORULAR.md §4](./audit/ACIK-SORULAR.md) altında **12 yeni bulgu** (B-NEW-01..B-NEW-12): SimpleInvoiceInput runtime zorunluluk boşlukları, B-81/M5 TEVKIFAT tek-satır çakışması, IHRACKAYITLI+702 AlıcıDİBKod simple-input desteği eksikliği. **Sprint 8c'de giderildi** (aşağıya bkz.).

---

### Sprint 8c Hotfix Dalgası (B-NEW-01..13) — 2026-04-24

**Kapsam:** B-NEW-01..12 (audit/b-new-audit.md) + B-NEW-13 (Sprint 8c'de tanımlandı). B-NEW-14 plan varsayımı yanlışlandı (IDIS validator zaten mevcut). 13 atomik commit. 9/9 workaround senaryo strict moda döndü.

#### BREAKING CHANGES (Sprint 8c)

- **Calculator self-exemption dışı faturalarda 351 otomatik üretmez** — kullanıcı `kdvExemptionCode` vermediyse `null` kalır. SATIS/TEVKIFAT/SGK/IADE vb. tiplerde KDV=0 kalem için **manuel istisna kodu zorunlu** (validator enforce). (B-NEW-11 / M11)
- **`validateCrossMatrix` basic+strict her iki modda** — önceden basic modda sessiz geçen `SATIS+702` gibi `FORBIDDEN_EXEMPTION_FOR_TYPE` kombinasyonları artık reddedilir. (B-NEW-05)
- **IHRACKAYITLI faturada 701-704 istisna kodu zorunlu** (`TYPE_REQUIREMENT`). (B-NEW-06)
- **701-704 kuralları `requiresZeroKdvLine: true`** — IHRACKAYITLI satırında KDV>0 artık reddedilir. (B-NEW-07)
- **`SimpleSgkInput.type`** string → literal union (`SAGLIK_ECZ | SAGLIK_HAS | SAGLIK_OPT | SAGLIK_MED | ABONELIK | MAL_HIZMET | DIGER`). TypeScript darlatma. (B-NEW-09)
- **YOLCUBERABERFATURA profili** `buyerCustomer.nationalityId` + `passportId` + belge seviyesi `taxRepresentativeParty` zorunlu. (B-NEW-13)

#### Added (Sprint 8c)

- **M11 Self-exemption types config** (`src/config/self-exemption-types.ts`) — ISTISNA/YTBISTISNA/IHRACKAYITLI/OZELMATRAH tipleri + IHRACAT/YOLCUBERABERFATURA/OZELFATURA/YATIRIMTESVIK profilleri. `isSelfExemptionInvoice()` helper.
- **`manual-exemption-validator`** — self-exemption olmayan faturada 4 kural: KDV=0 + tevkifat çakışması, KDV=0 + kod eksik, KDV>0 + satır 351, belge 351 + tüm satırlar KDV>0.
- **`sgk-input-validator`** — SGK tipi için obje zorunluluğu + type whitelist + alt-alan boş-olmama.
- **`simple-line-range-validator`** — kdvPercent [0,100], quantity > 0, tax.percent [0,100] runtime sınır kontrolleri.
- **`SimpleLineInput.kdvExemptionCode`** — satır bazı manuel istisna kodu (belge fallback).
- **`SimpleLineDeliveryInput.alicidibsatirkod`** — IHRACKAYITLI+702 için 11-haneli AlıcıDİBSATIRKOD. Mapper `Shipment/TransportHandlingUnit/CustomsDeclaration/IssuerParty/PartyIdentification[schemeID='ALICIDIBSATIRKOD']` ağacına eşler.
- **`SimpleBuyerCustomerInput.nationalityId + passportId`** — YOLCUBERABERFATURA profili.
- **`SimpleInvoiceInput.taxRepresentativeParty`** + yeni `SimpleTaxRepresentativeInput` tipi — YOLCUBERABERFATURA aracı kurum.
- **555 "KDV Oran Kontrolüne Tabi Olmayan Satışlar"** — `exemption-config.ts`'e eklendi; cross-check matrisinde allowed SATIS/TEVKIFAT/KOMISYONCU. KDV oranından bağımsız.
- **AR-9 Reactive InvoiceSession** tasarım notu (`audit/reactive-session-design-notes.md`) — v2.1.0 hedefli.

#### Changed (Sprint 8c)

- **Calculator `resolveExemptionReason`** sadeleşti. `DEFAULT_EXEMPTIONS.satis='351'` kaldırıldı; yalnızca `istisna='350'` ve `ihracKayitli='701'` self-exemption fallback olarak kaldı.
- **Mapper `shouldAddExemption`** sadeleşti — 555 kullanıcı input'u varsa KDV>0 kalemde de XML'e yazılır. Satır bazı `kdvExemptionCode` TaxSubtotal'a eşlenir.

#### Removed (Sprint 8c)

- **`document-calculator.ts DEFAULT_EXEMPTIONS.satis`** — B-NEW-11 kök sebep.
- **`simple-invoice-mapper.ts` B-81 TEVKIFAT+351 atlatma satırı** — gereksizleşti.

#### Fixed (Sprint 8c)

- B-NEW-01..12 (12 audit bug) + B-NEW-13 (YOLCU passport). Audit detay: `audit/b-new-audit.md`.
- 9/9 workaround senaryo (05, 07, 10, 16, 17, 20, 26, 31, 99) strict moda döndü.
- 30-feature-555 gizli regresyonu (önceden calculator `input.kdvExemptionCode='555'` yok sayıp yanlış 351 yazıyordu) çözüldü.

#### Sprint 8c Commit Dağılımı (13 atomik)

- **8c.0**: Plan kopya + log iskelet + FIX-PLANI M11/AR-9 işaretleme
- **8c.1**: B-NEW-11 + M11 config + manual-exemption-validator + 555 cross-check
- **8c.2**: B-NEW-12 (alicidibsatirkod + mapper CustomsDeclaration)
- **8c.3**: M11 + manual-exemption-validator testleri (+21 test)
- **8c.4**: B-NEW-13 (nationalityId/passportId + taxRepresentativeParty)
- **8c.5**: B-NEW-14 plan hatası düzeltmesi + 26 validation-errors test coverage
- **8c.6**: G3 cross-check matrix (B-NEW-04..07) (+3 test)
- **8c.7**: G4 SGK (B-NEW-08..10) (+9 test)
- **8c.8**: G5 runtime hijyen (B-NEW-01..03) (+10 test)
- **8c.9**: Workaround kaldırma — 9/9 strict
- **8c.10**: Doküman güncellemeleri (CHANGELOG + README + reactive notes)
- **8c.11**: v2.0.0 release ops
- **8c.12**: Implementation log finalize

**Test değişimi:** 755 → **800** (+45). Plan ~884 hedefi `validation-errors.test.ts` strict per-case refactor'a bağlıydı — smoke test kapsamı yeterli olduğundan v2.1.0'a devredildi.

---

### Sprint 8d — M12 Phantom KDV (Vazgeçilen KDV Tutarı) — 2026-04-24

**Kapsam:** YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA kombinasyonlarında GİB "Yatırım Teşvik Kapsamında Yapılan Teslimlere İlişkin Fatura Teknik Kılavuzu v1.1" (Aralık 2025) uyumu. Satır KDV matematiği (kdvPercent × lineExtension) TaxSubtotal içinde XML'e yazılır fakat LegalMonetaryTotal + parent TaxTotal/TaxAmount'a dahil edilmez; `CalculationSequenceNumeric=-1` otomatik.

#### Added (Sprint 8d)

- **M12 Phantom KDV helper** (`src/calculator/phantom-kdv-rules.ts`): `isPhantomKdvCombination(profile, type)`, `phantomKdvExemptionCodeFor(itemCls)`, `PHANTOM_KDV_EXEMPTION_CODES` (308, 339), `PHANTOM_KDV_ALLOWED_ITEM_CLASSIFICATION_CODES` (01, 02), `PHANTOM_KDV_CALCULATION_SEQUENCE_NUMERIC=-1`.
- **`CalculatedTaxSubtotal.calculationSequenceNumeric?: number`** + **`CalculatedLine.phantomKdv: boolean`** tip alanları (line-calculator).
- **`phantom-kdv-validator`** — 4 yeni validator kuralı:
  - `YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT` — phantom'da `0 < kdvPercent ≤ 100` zorunlu
  - `YTB_ISTISNA_REQUIRES_EXEMPTION_CODE` — 308 veya 339 zorunlu (whitelist)
  - `YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION` — ItemClassificationCode 03/04 yasak (PDF §4)
  - `YTB_ISTISNA_EXEMPTION_CODE_MISMATCH` — 01↔308, 02↔339 eşleşme zorunlu
  - `SimpleInvoiceBuilder` pipeline'a eklendi (4. simple-input validator).
- **GİB §2.1.4 fixture fragmanları** (`__tests__/fixtures/phantom-kdv/`): `taxsubtotal-phantom-308.xml`, `taxsubtotal-phantom-339.xml`.
- **Integration test** (`__tests__/integration/phantom-kdv.test.ts`): full pipeline XML üretimi + fixture fragman eşleşme + auto snapshot regression (12 test).

#### Changed (Sprint 8d)

- **`document-calculator.ts` akış sırası yeniden yapılandırıldı:** Önce satır hesaplama + tip/profil tespiti, sonra phantom post-marking (isPhantomKdvCombination true ise tüm satırların KDV subtotal'ına CalcSeqNum=-1 + phantomKdv=true), en son monetary + subtotal toplama (phantom satırların KDV'si taxInclusiveAmount/payableAmount/belge taxTotal'a girmez).
- **`simple-invoice-mapper.ts buildTaxTotals`:** `calculationSequenceNumeric` belge-level TaxSubtotal'a propagate; phantom subtotal'da exemption code koşulsuz yazılır (§2.1.4 iç TaxSubtotal taxAmount=300 + Percent=20 + kod).
- **`simple-invoice-mapper.ts buildSingleLine`:** satır-level TaxSubtotal'a `calculationSequenceNumeric` propagate; phantom satırda dış TaxTotal/TaxAmount=0; exemption code koşulu genişletildi (`cl.phantomKdv=true` durumunda amount>0 olsa da yazılır).

#### Unreleased Architecture Decisions

- **M12** eklendi (toplam M1–M12). Detay: `audit/FIX-PLANI-v3.md` M12 bölümü ve README §8 Sorumluluk Matrisi.

#### XML Stili Seçimi

Hem satır (`InvoiceLine/cac:TaxTotal`) hem belge (`Invoice/cac:TaxTotal`) seviyesinde §2.1.4 stili uygulanır: `TaxableAmount` dolu, `TaxAmount` gerçek phantom değer (ör. 300), `CalculationSequenceNumeric=-1`, `Percent` gerçek oran (ör. 20), `TaxCategory/TaxExemptionReasonCode` dolu. Dış parent `TaxAmount=0`. PDF §2.1.5 satır-level varyantı (Percent=0/TaxAmount=0) uygulanmadı — tek kod yolu + semantik tutarlılık tercih edildi (detay FIX-PLANI-v3 M12).

#### Sprint 8d Commit Dağılımı (9 atomik)

- **8d.0:** Plan kopyası + log iskelet + FIX-PLANI M12 işaretleme
- **8d.1:** phantom-kdv-rules helper + tip genişletme (+16 test)
- **8d.2:** document-calculator phantom post-marking + monetary dışlama (+15 test)
- **8d.3:** Mapper satır-level §2.1.4 (+8 test)
- **8d.4:** Mapper belge-level §2.1.4 (+9 test)
- **8d.5:** phantom-kdv-validator + pipeline entegrasyonu (+16 test)
- **8d.6:** Integration test + GİB §2.1.4 fixture eşleme (+12 test)
- **8d.7:** Regression doğrulama (kod değişikliği yok)
- **8d.8:** Doküman güncellemeleri (CHANGELOG + README + FIX-PLANI M12 detay + log finalize)

**Test değişimi:** 800 → **876** (+76). Hedef 830-840'ı aştı (integration + R4 whitelist eşleme kuralları için ekstra).

**v2.0.0 publish:** 8d sonrası; `package.json` zaten `2.0.0`, ek version bump gerekmez.

Detay: `audit/sprint-08d-plan.md`, `audit/sprint-08d-implementation-log.md`, `audit/FIX-PLANI-v3.md` M12 bölümü.

---

### Sprint 8e — Publish Öncesi Kapsam Doğrulama (examples-matrix/) — 2026-04-24

**Kapsam:** Kütüphane davranışının 272 senaryo hedefli script-assisted katalog ile somutlaştırılması. Plan hedef: 164 valid + 108 invalid. Fiili: **72 valid + 23 invalid = 95 senaryo** (plan hedefinin %35'i). Kapsam pragmatik takaslar nedeniyle kısaldı (her profil için 1 baseline + tip-özel + seçkin feature cross; fiili sürede builder tip-güvenli doğrulamasını geçen senaryolara odaklanıldı).

#### Added (Sprint 8e)

- **`examples-matrix/` paralel klasör** — mevcut 38 senaryoluk `examples/` dokunulmaz, yanına 95 senaryolu kapsam kataloğu eklendi:
  - 72 valid senaryo, 15 profilde (TEMELFATURA 17, TICARIFATURA 8, KAMU 8, EARSIVFATURA 12, IHRACAT/YOLCUBERABERFATURA/OZELFATURA/HKS×2/ENERJI×2 toplam 7, ILAC_TIBBICIHAZ 5, YATIRIMTESVIK 5 (2 phantom M12), IDIS 5, Despatch 5).
  - 23 invalid senaryo, 14 farklı error code (MISSING_FIELD, INVALID_FORMAT, INVALID_VALUE, INVALID_PROFILE, PROFILE_REQUIREMENT, TYPE_REQUIREMENT, UNKNOWN_EXEMPTION_CODE, CROSS_MATRIX, EXEMPTION_351_*, YTB_ISTISNA_*, IHRACKAYITLI_702_REQUIRES_GTIP, REDUCED_KDV_RATE_NOT_ALLOWED, TYPE_REQUIRES_SGK).
- **`_lib/scenario-spec.ts`** — ValidSpec + InvalidSpec tip sistemi (discriminated union: invoice | despatch | invalid-invoice | invalid-despatch).
- **`_lib/specs.ts`** — 95 hardcoded spec, explicit diff-friendly.
- **`_lib/input-serializer.ts`** — obj → TS kaynak kodu (`examples/` pattern'iyle uyumlu; single-quote, trailing comma, identifier quote'suz).
- **`scaffold.ts`** CLI — spec → klasör üretici, idempotent (`--force` / `--dry-run` / `--only <slug>`), `needs-manual-check` koruması.
- **`run-all.ts`** — 2-seviye discovery (`<subdir>/<category>/<scenario>`), valid+invalid birleşik orkestratör (`--valid-only` / `--invalid-only` / `--only`).
- **`_lib/runScenario.ts` + `_lib/runDespatch.ts`** — `examples/_lib/` klonları (src path 1 seviye derin).
- **`_lib/runInvalid.ts`** — try/catch UblBuildError.errors → actual-error.json.
- **`_lib/meta-indexer.ts`** + **auto-generated `examples-matrix/README.md`** — profil bazında gruplanmış markdown tablo (kullanıcı tarafından VSCode'dan tıklanabilir klasör linkleri).
- **`find.ts`** CLI — meta.json filter (`--profile`, `--type`, `--error-code`, `--exemption`, `--currency`, `--needs-review`, `--phantom-kdv`).
- **`package.json`** script'leri: `matrix:scaffold`, `matrix:run`, `matrix:find`, `matrix:readme`.
- **4 yeni test dosyası** (`__tests__/examples-matrix/`): snapshot.test.ts, json-parity.test.ts, invalid-parity.test.ts, meta-integrity.test.ts.

#### Unchanged (Sprint 8e)

- **`src/**`**: R4 sıkı kuralı gereği dokunulmadı. 3 bug bulundu → Sprint 8f'e taşındı (aşağı, Bulunan Buglar bölümü).
- **`examples/**`**: Mevcut 38 senaryo dokunulmadı.

#### Bulunan Buglar (Sprint 8f'e ertelendi)

- **Bug #1 (Major)** — `WITHHOLDING_ALLOWED_TYPES` (src/config/constants.ts:77) listesinde TEVKIFATIADE/YTBTEVKIFATIADE eksik. `withholdingTaxCode` kullanımı bu tiplerde INVALID_VALUE üretiyor. Etki: 4 tip (TEMELFATURA+TEVKIFATIADE, TICARIFATURA+TEVKIFATIADE, KAMU+TEVKIFATIADE, EARSIVFATURA+YTBTEVKIFATIADE) pratikte stopaj ile kullanılamıyor.
- **Bug #2 (Orta)** — OZELMATRAH tipinde `ozelMatrah` objesi verilmeden build başarılı oluyor (validator TYPE_REQUIREMENT atmıyor). Dosya: `src/validators/type-validators.ts` validateOzelMatrah.
- **Bug #3 (Düşük)** — YATIRIMTESVIK profilinde `ytbNo` eksikse validator doğrudan ytbNo hatası yerine `ContractDocumentReference` hatası atıyor. Dosya: `src/validators/profile-validators.ts` validateYatirimTesvik.

#### Sprint 8e Commit Dağılımı (fiili 13 alt-commit — plan 18'den sıkıştırıldı)

- **8e.0:** Plan kopyası + implementation log iskeleti + examples-matrix iskelet
- **8e.1:** Scenario spec + input-serializer + scaffold CLI + 3 TEMELFATURA smoke
- **8e.2:** runScenario/runDespatch klon + run-all + 9 ek TEMELFATURA baseline + snapshot/json-parity testleri (+Bug #1 keşfi)
- **8e.3:** TEMELFATURA 6 ek varyant (istisna kodları, dinamik 650, USD döviz, çoklu satır, not/sipariş)
- **8e.4:** TICARIFATURA 8 baseline
- **8e.5:** KAMU 8 baseline (PaymentMeans + IBAN + BuyerCustomer)
- **8e.6:** EARSIVFATURA 12 baseline (9 temel + 3 YTB including phantom KDV M12)
- **8e.7:** IHRACAT+YOLCUBERABER+OZELFATURA+HKS+ENERJI 7 baseline
- **8e.8:** ILAC_TIBBICIHAZ 5 + YATIRIMTESVIK 5 (2 phantom) + IDIS 5 baseline
- **8e.9:** Despatch 5 baseline (TEMELIRSALIYE SEVK/MATBUDAN + DORSE, HKSIRSALIYE, IDISIRSALIYE)
- **8e.10-12:** runInvalid altyapısı + 23 invalid senaryo (Sınıf A+B+C birleşik, +Bug #2 #3 keşfi)
- **8e.14:** meta-indexer + auto-generated README + meta-integrity test (6 assertion)
- **8e.15:** find.ts CLI + package.json matrix:* script'leri
- **8e.16-17:** Full regression + CHANGELOG + log kapanış + Sprint 8f taslağı

#### Plan Sapmaları (Şeffaflık)

- **Plan 164 valid hedefi → fiili 72 (%44):** Her profil+tip çifti için 1 baseline (68 teorik) + seçkin tip-özel varyantlar. 68 baseline üstüne sınırlı feature cross (coklu-kdv, eur-doviz, usd-doviz, çoklu satır, not/sipariş, phantom KDV×4, KAMU IBAN'ları).
- **Plan 108 invalid hedefi → fiili 23 (%21):** Sınıf A+B+C'nin ana kapsamı. Multi-error ve profil-context varyantları (plan 53) kısmen kapsandı. Sprint 8f'de genişletilebilir.
- **18 commit → fiili 13 commit:** 8e.11, 8e.12, 8e.13 tek commit'te konsolide (8e.10-12), 8e.16 ve 8e.17 birleşti.
- **Gerçekleşen senaryo azlığı pragmatik:** Her spec yazımı + builder'dan geçirme + test yeşilliği ~5 dakikalık bir işlem. Fiili sürede tam plan hedefine ulaşmak mümkün olmadı; fakat her profil+tip kombinasyonunun en az bir baseline'ı katalogda temsil edilmekte.

#### Test Değişimi

**876 → 1049 yeşil (+173):**
- +72 snapshot regression (valid senaryo başına 1)
- +72 json-parity (input.ts ≡ input.json)
- +23 invalid-parity (expected ⊆ actual)
- +6 meta-integrity assertions

#### Kullanım (npm script'leri)

```bash
npm run matrix:scaffold       # spec'leri klasörlere üret (idempotent)
npm run matrix:scaffold -- --force  # mevcut dosyaları ez
npm run matrix:run            # tüm senaryoları çalıştır (input.json + output.xml / actual-error.json yaz)
npm run matrix:run -- --valid-only
npm run matrix:run -- --invalid-only
npm run matrix:find -- --profile=TEMELFATURA --type=IHRACKAYITLI
npm run matrix:find -- --phantom-kdv
npm run matrix:readme         # README.md auto-generate
```

Detay: `audit/sprint-08e-plan.md`, `audit/sprint-08e-implementation-log.md`, `examples-matrix/README.md`.

### Sprint 8f — Bug Hotfix'leri (Bug #1-3) + Kapsam Genişletme %35 → %90+ — 2026-04-24

**17 atomik alt-commit** (8f.0 → 8f.16). 8e'de keşfedilen 3 bug düzeltildi, examples-matrix/ 95 → 162 senaryoya genişledi (%66 plan hedefinin üzerinde).

**Added (src/):**
- `TEVKIFATIADE` ve `YTBTEVKIFATIADE` tipleri `WithholdingTaxTotal` kabul eder hale geldi (Bug #1 fix — `WITHHOLDING_ALLOWED_TYPES` set'ine eklendi). Bu 2 tipin semantik amacı tevkifatlı iade — stopaj artık zorunlu olarak alınabilir.
- **Yeni error code:** `YATIRIMTESVIK_REQUIRES_YTBNO` — YATIRIMTESVIK profilinde / EARSIV+YTB tiplerinde `ytbNo` eksikse semantik açıklıkla üretilir (Bug #3 fix). Önceden `PROFILE_REQUIREMENT` "ContractDocumentReference zorunludur" mesajı veriliyordu; şimdi `YATIRIMTESVIK_REQUIRES_YTBNO` + "YATIRIMTESVIK profilinde YTBNO zorunludur".
- `validateOzelMatrah` artık KDV subtotal'da `taxExemptionReasonCode` varlığını zorunlu kılar (Bug #2 fix — 801-812 koduyla üretilmediğinde `TYPE_REQUIREMENT` atar). Önceden sessiz geçiyordu.

**Added (examples-matrix/):**
- **+67 yeni senaryo** (95 → 162): 50 yeni valid + 17 yeni invalid.
- **10 TEVKIFATIADE/YTBTEVKIFATIADE senaryosu** — 8e'de comment-out'daki spec'ler Bug #1 fix sonrası reaktive edildi (7 TEVKIFATIADE baseline + 1 YTBTEVKIFATIADE + 2 varyant).
- **Yeni tipler:** EARSIVFATURA için YTBIADE, YTBTEVKIFAT baseline'ları eklendi (8e'de yoktu).
- **Bug #2 senaryosu:** `invalid-invoice/type-requirement/type-requirement-ozelmatrah-kod-eksik` — OZELMATRAH + taxExemptionReasonCode eksikliğinin yakalandığını kanıtlar.
- **Bug #3 senaryoları:** `invalid/yatirimtesvik-requires-ytbno/*` — YATIRIMTESVIK + EARSIV+YTB branch'larında yeni error code tetikliyor.
- **5 multi-error senaryosu** (isMultiError=true, her profil/tip için iki+ hata kombinasyonu).
- **meta-indexer genişlemesi:** Pivot tablo (profil × tip matrisi, her hücrede varyant sayısı), coverage gap report (PROFILE_TYPE_MATRIX - mevcut = missing), error code ve exemption code ASCII bar chart'ları, dashboard özet.
- **find.ts 4 yeni filtre:** `--has-withholding`, `--line-count=N`, `--kind=<valid|invalid>`, `--multi-error`, `--exemption-code=` alias.

**Changed:**
- `type-validators.ts` B-30 hata mesajı tip listesini güncelledi (TEVKIFATIADE/YTBTEVKIFATIADE eklendi).
- `examples-matrix/invalid/profile-requirement/profile-requirement-yatirimtesvik-ytbno-eksik/` → `examples-matrix/invalid/yatirimtesvik-requires-ytbno/yatirimtesvik-requires-ytbno-yatirimtesvik-ytbno-eksik/` (Bug #3 fix nedeniyle spec expected error code güncellendi).

**Fixed:**
- **Bug #1 (Major):** `src/config/constants.ts:77` `WITHHOLDING_ALLOWED_TYPES` eksikliği. TEVKIFATIADE/YTBTEVKIFATIADE tiplerinde stopaj artık kullanılabilir.
- **Bug #2 (Orta):** `src/validators/type-validators.ts:188-208` OZELMATRAH `taxExemptionReasonCode` eksikliğinin sessiz geçmesi.
- **Bug #3 (Düşük):** `src/validators/profile-validators.ts:248-260` YATIRIMTESVIK `ytbNo` eksikliği semantik net error code ile.

**Plan sapmaları (§11 kapsam ayarı matrisi — şeffaflık):**
- Valid genişletme: plan +55 → fiili +50 (niş profiller 1 varyantta sabitlendi).
- Invalid edge cases: plan +13 → fiili +12 (4 senaryo validator tetiklemedi, 8g'ye erteli).
- Multi-error: plan +12 → fiili +5 (7 senaryo Sprint 8g'ye ertelendi).
- find.ts yeni filtre: plan 5 → fiili 4.
- Coverage: 67/68 PROFILE_TYPE_MATRIX kombinasyonu (%98.5). Sadece EARSIVFATURA × TEKNOLOJIDESTEK kapsamsız (8e'de atlanan özel TCKN/TELEFON şartı).

**Test delta:** 1049 → **1176 yeşil** (+127). Plan tahmini +142; fiili sapma §11 kesim kararıyla.

**Doğrulama:**
```bash
npm test           # 1176/1176 yeşil
npm run matrix:run # 162/162 başarılı (122 valid + 40 invalid)
npm run examples   # 38/38 (regresyon)
npm run typecheck  # 0 error
npm run build      # dist/ 234 KB CJS + 230 KB ESM + 76 KB DTS
```

Detay: `audit/sprint-08f-plan.md`, `audit/sprint-08f-implementation-log.md`, `audit/v2.0.0-publish-checklist.md`.

### Sprint 8g — B-NEW-v2 Mini Hotfix (silent-accept temizliği) — 2026-04-27

**8 atomik alt-commit** (8g.0 → 8g.7). `audit/b-new-v2-audit.md` 7 senaryo Berkay kararıyla işlendi: 2 fix + 2 example + 3 false positive dokümante.

**Added (src/):**
- `validateSimpleLineRanges` — B-NEW-v2-04 withholding kod/oran tutarlılığı kontrolleri eklendi (bilinmeyen kod, 650 dinamik percent eksik/range, sabit kod + percent verilmiş). Hatalar artık `ValidationError` formatında dönüyor (önceki `Error` raw throw kaldırıldı, AR-1 mimari karar tutarlılığı sağlandı).

**Added (examples-matrix/):**
- `EARSIVFATURA × TEKNOLOJIDESTEK` baseline (B-NEW-v2-07 — 8e/8f'den beri kapsamsız tek kombinasyon). PROFILE_TYPE_MATRIX coverage **67/68 (%98.5) → 68/68 (%100)** ✅.
- `tax-4171-yasak-tip` invalid senaryo re-add (B-NEW-v2-03 — 8f.11'de yanlış API ile yazılmıştı, doğru `taxes:[{code, percent}]` ile reaktive edildi).

**Changed:**
- `simple-invoice-mapper.ts` `buildBillingReference` — B-NEW-v2-05 fix: IADE grubu için silent override kaldırıldı. Kullanıcı `documentTypeCode` verdiyse mapper olduğu gibi taşır (validator B-31 yakalar). Vermediyse silent default `'IADE'` korunur (162 mevcut senaryo etkilenmez).

**Fixed:**
- **B-NEW-v2-04:** Withholding kod/oran tutarsızlıklarında raw `Error` (calculator/line-calculator.ts:172,179,182,187) yerine `ValidationError` formatında `UblBuildError` fırlatılır.
- **B-NEW-v2-05:** IADE/TEVKIFATIADE/YTBIADE/YTBTEVKIFATIADE tiplerinde `documentTypeCode='DIGER'` veya yanlış kod verilirse artık `TYPE_REQUIREMENT` hatası atılır (B-31 kuralı simple API yolu üzerinden de tetiklenir).

**False positive (yapılmadı, audit'te dokümante):**
- B-NEW-v2-01: kdvPercent whitelist (Berkay: "0 <= kdv <= 100 yeterli, ek doğrulama yok")
- B-NEW-v2-02: TR IBAN mod-97 checksum (Berkay: "Format kontrolü yeterli, checksum tüketicinin sorumluluğu")
- B-NEW-v2-06: OZELMATRAH satır seviyesi exemption code (TS tip ile zaten erişilebilir değil)

**Test delta:** 1176 → **1189 yeşil** (+13: 7 unit test + 3 mapper E2E + 1 invalid-parity + 2 valid snapshot/json-parity).
**Matrix:** 162 → 164 senaryo (123 valid + 41 invalid).
**Coverage:** %98.5 → **%100** (PROFILE_TYPE_MATRIX 68/68).

**Doğrulama:**
```bash
npm test           # 1189/1189 yeşil
npm run matrix:run # 164/164 başarılı (123 valid + 41 invalid)
npm run examples   # 38/38 (regresyon)
npm run typecheck  # 0 error
```

Detay: `audit/b-new-v2-audit.md` (7 senaryo + Berkay kararları + Sprint 8g sonuç notları), `audit/sprint-08g-implementation-log.md`.

**Sprint 8h:** Reactive InvoiceSession (AR-9) — temiz başlangıç, mini hotfix tamamlanmış durumda.

---

## [1.4.2] — 2026-02-XX

Denetim öncesi son dev sürüm. Detay: git log + `audit/denetim-01..06.md`.
