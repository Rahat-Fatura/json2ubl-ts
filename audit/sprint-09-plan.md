---
karar: Sprint 9 — GİB 20260701 Schematron + Kod Listeleri v1.43 uyumu
hedef: gib-claude-skills bilgi katmanının 2026-07-27 ve 2026-08-11 CHANGELOG girdilerini koda indir; kütüphaneyi GİB'in 14.09.2026 yürürlüklü paketine uyumlu hale getir
versiyon: v3.0.0 → v4.0.0 (MAJOR — daha önce geçerli sayılan input'lar artık reddediliyor)
durum: PLAN ONAYLANDI — uygulama başladı
tarih: 2026-08-24
referans: gib-claude-skills `.claude/skills/CHANGELOG.md` (2026-07-27, 2026-08-11) + `gib-ubl-belge/CHANGELOG.md`
---

# Sprint 9 — GİB 20260701 paketi uyumu

## Context

`gib-claude-skills` bilgi katmanı 2026-07-27'de GİB duyurusuyla güncellendi:
Schematron paketi **20260312 → 20260701**, UBL-TR Kod Listeleri **v1.42 → v1.43**.
2026-08-11'de e-Arşiv Paketi v1.1_8 geldi. Her ikisinin de **yürürlük tarihi 14.09.2026**.

Bu sprint, o değişikliklerden **kütüphane kapsamına girenleri** koda indirir.

### Kapsam sınırı

Kütüphane yalnız iki belge üretir: `Invoice` (e-Fatura + e-Arşiv Fatura UBL'i) ve
`DespatchAdvice` (e-İrsaliye). Skill CHANGELOG'undaki şu girdiler **bilinçli olarak
kapsam dışıdır**:

| Değişiklik | Kapsam dışı gerekçesi |
|---|---|
| EArsiv.xsd v1.1_8 — `aliciType`/`aliciTypeMin` `xs:choice`, `esuRaporID` 1..n | Kütüphane e-Arşiv **raporu** üretmiyor; yalnız EARSIVFATURA UBL faturası |
| `erreceipt` alias + UserOptionCode 171-174 + AuthorizedWorkScope yasağı | HR-XML kullanıcı hesabı belgesi kütüphanede yok |
| e-Müstahsil SMS doğrulama (zorunluluk 5.11.2026) | e-MM belge tipi kütüphanede yok |
| 509 GT e-Arşiv eşiği (1/1/2026'dan tutar-bağımsız) | Belge **üretim** kuralı değil; "hangi belgeyi keseyim" kararı tüketicide |
| Atıf çapası göçü (2026-08-21) | Salt biçim değişikliği — kod etkisi yok |

Bu tablo README ve CHANGELOG'a da yazılacak (adım 9).

### Alınan kararlar (2026-08-24, kullanıcı onayı)

1. **Yürürlük:** Yeni zorunluluklar **koşulsuz error**. `issueDate` koşullu ikili
   davranış YOK — tek kod yolu. Kütüphane 14.09.2026 sonrası doğru olanı üretir.
2. **308/339 ayrışması:** Kod Listeleri metni ile Schematron ayrışıyor;
   **Schematron esas alınır** (GİB kapıda schematron çalıştırıyor — kütüphane
   reddetmezse zarf reddedilir, hata geç ortaya çıkar).
3. **PeriodInput:** `startTime`/`endTime` **tüm** InvoicePeriod'lara açılır,
   ENERJI'ye özel kısıtlanmaz. `PERIOD_SEQ` zaten slotları içeriyor, XSD izin veriyor.

## Baseline

Sprint başlangıcı: `91 test dosyası / 1917 test` — tamamı geçiyor.
Her adım sonunda bu sayı **artmalı**, hiçbiri kırılmamalı (adım 8'in bilinçli
örnek yenilemesi hariç).

---

## Adım 1 — Schematron paketi takası

**Commit:** `chore(schematron): 20260312 → 20260701 paketi takas edildi + sprint-09 planı`

`schematrons/` altındaki 3 dosya `gib-claude-skills/.claude/skills/gib-ubl-belge/schematrons/`
karşılıklarıyla değiştirilir:

- `UBL-TR_Codelist.xml` (32085 → 32245 byte)
- `UBL-TR_Common_Schematron.xml` (99734 → 104644 byte)
- `UBL-TR_Main_Schematron.xml` (26600 → 26939 byte)

Bu dosyalar runtime'da kullanılmıyor (`.npmignore`'da; kodda yalnız `@see` atıfı var),
ama kaynak doğruluğu ve gelecek denetimler için güncel olmalı.

**Kabul kriteri:** md5'ler skill kopyalarıyla birebir aynı. Test sayısı değişmez (1917).

---

## Adım 2 — Kod Listeleri v1.43

**Commit:** `feat(exemption-config): kod 233 eklendi + kod 229 metni v1.43 ile eşitlendi`

**Dosya:** `src/calculator/exemption-config.ts`

1. **Yeni kod 233** — 232 ile 234 arasına, kod sırasında:
   ```
   { code: '233', name: '2942 Sayılı Kamulaştırma Kanunu Kapsamında Taşınmazların
     Kamulaştırmayı Yapan Devlet ve Kamu Tüzel Kişilerine Devri',
     type: 'KDV', documentType: 'ISTISNA' }
   ```
2. **Kod 229 metni** — v1.43 PDF ile birebir. `17/2-b` öneki kalkıyor,
   "Darülacezeye" ekleniyor:
   ```
   'Gıda Bankacılığı Faaliyetinde Bulunan Darülacezeye, Dernek ve Vakıflara
    Bağışlanan, Gıda, Temizlik, Giyecek ve Yakacak Maddeleri'
   ```

**Ripple (otomatik):** `ISTISNA_EXEMPTION_CODES` (`constants.ts:160`) ve
`cross-check-matrix` matrisi `EXEMPTION_DEFINITIONS`'tan türüyor — elle dokunma yok.

**Test:** `__tests__/calculator/exemption-config.test.ts` — 233'ün varlığı,
ISTISNA grubuna düştüğü, 229 metninin yeni hali.

**Kabul kriteri:** 233 `ISTISNA_EXEMPTION_CODES`'ta; cross-check matrisi 233 için
ISTISNA grubu izinli tiplerini veriyor.

---

## Adım 3 — 308/339 profil kısıtı

**Commit:** `feat(validators): 308/339 istisna kodları yalnız YATIRIMTESVIK/YTB* profilinde (BREAKING)`

Schematron 20260701'de 308 ve 339 genel `$TaxExemptionReasonCodeType` listesinden
**çıkarıldı**, ayrı `$YatirimTesvikTaxExemptionReasonCodeType = ',308,339,'` değişkenine
alındı. `TaxExemptionReasonCodeCheck` artık:

```
contains($TaxExemptionReasonCodeType, code)
  OR (contains($YatirimTesvikTaxExemptionReasonCodeType, code)
      AND (ProfileID = 'YATIRIMTESVIK'
           OR contains($YatirimTesvikEArsivInvoiceTypeCodeList, InvoiceTypeCode)))
```

**Dosyalar:** `src/config/constants.ts`, `src/validators/cross-check-matrix.ts`

1. `constants.ts` — iki yeni sabit:
   - `YATIRIM_TESVIK_ONLY_EXEMPTION_CODES = new Set(['308', '339'])`
   - `YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES` — Schematron'daki **5 tipin tamamı**
     (`YTBSATIS, YTBIADE, YTBISTISNA, YTBTEVKIFAT, YTBTEVKIFATIADE`)

> ⚠️ **Mevcut `YATIRIM_TESVIK_EARSIV_TYPES`'a DOKUNULMAYACAK.** O sabit 3 tip içeriyor
> çünkü `yatirim-tesvik-validator.ts:53` IADE türevlerini ayrı bir erken-return ile
> eliyor (B-08 tasarımı). Genişletmek o validator'ı bozar. Bu kural için **ayrı**
> 5-tipli sabit gerekiyor.

2. `cross-check-matrix.ts` — 308/339 için profil-farkında kontrol. Kod geçerli ama
   profil/tip uygun değilse `error`.

**Test:** yeni `__tests__/validators/yatirim-tesvik-exemption-scope.test.ts`
- 308 + YATIRIMTESVIK → geçer
- 339 + EARSIVFATURA/YTBISTISNA → geçer
- 308 + TEMELFATURA/ISTISNA → **error**
- 339 + TICARIFATURA/SATIS → **error**
- 5 YTB tipinin hepsi EARSIVFATURA'da geçer (Schematron listesiyle tam eşleşme)

**Kabul kriteri:** Mevcut 4 örnek (`yatirimtesvik-istisna-phantom-308/339-*`,
`earsivfatura-ytbistisna-phantom-308/339-*`) kırılmadan geçer — hepsi zaten
uygun profil/tipte.

---

## Adım 4 — İrsaliye plaka kuralları

**Commit:** `feat(despatch): plaka schemeID 2→6, TR/yabancı format regex, LicensePlateID zorunlu (BREAKING)`

Schematron 20260701 üç değişiklik getirdi:

1. `$LicensePlateIDSchemeIDType`: `PLAKA, DORSE` → **6 değer**
   (`+ DORSEPLAKA, YABANCIPLAKA, YABANCIDORSE, YABANCIDORSEPLAKA`)
2. `LicensePlateIDSchemeIDCheck`'e **iki yeni assert**:
   - TR (`PLAKA`/`DORSE`/`DORSEPLAKA`): `^(0[1-9]|[1-7][0-9]|8[01])[A-Z]+[0-9]+$`
   - Yabancı (`YABANCI*`): `^[A-Z0-9_-]+$`
3. Yeni `LicensePlateIDCheck` — context `desp:DespatchAdvice/cac:Shipment`:
   irsaliyede geçerli schemeID'li, boş olmayan **en az 1** `LicensePlateID` **zorunlu**

> Kapsam notu: bu kurallar yalnız `DespatchAdvice/.../RoadTransport/cbc:LicensePlateID`
> context'ine bağlı. `TransportHandlingUnit/TransportEquipment/ID` (B-49 DORSEPLAKA yolu)
> bu kontrollere **girmiyor** — Main Schematron'da o context'e `extends` yok.

**Dosyalar:**
- `src/config/constants.ts` — `LICENSE_PLATE_SCHEME_IDS` 6 değer;
  yeni `TR_LICENSE_PLATE_REGEX`, `FOREIGN_LICENSE_PLATE_REGEX`
- `src/types/despatch-input.ts` — `LicensePlateInput.schemeId` union 6 değere genişler
  (additive — mevcut tüketiciyi kırmaz)
- `src/validators/despatch-validators.ts` — format kontrolü + zorunluluk

**Test:** `__tests__/validators/despatch-license-plate.test.ts`
- 6 schemeID'nin hepsi kabul
- `34ABC123` geçer / `3ABC123`, `82ABC123`, `34abc123`, `ABC34123` reddedilir
- `YABANCIPLAKA` + `DE-AB-1234` geçer, TR regex'e takılmaz
- Plakasız Shipment → **error**

**Kabul kriteri:** Mevcut 7 irsaliye örneğinin tamamı kırılmadan geçer
(hepsinde plaka var; değerler `34ABC123`, `34DRS456` vb. → yeni regex'i geçiyor).

---

## Adım 5 — İDİS sevkiyat numarası SE-/ES-

**Commit:** `fix(validators): İDİS sevkiyat no ES- prefix'ini de kabul ediyor`

`IdisSevkiyatNoCheck` ve `DespatchIdisSevkiyatNoCheck` artık `SE-` **veya** `ES-`
prefix'i kabul ediyor.

**Dosyalar:**
- `src/config/constants.ts` — `SEVKIYAT_NO_REGEX`: `/^SE-\d{7}$/` → `/^(SE|ES)-\d{7}$/`
- `src/validators/profile-validators.ts:354` — hata mesajı güncellenir
- `src/validators/despatch-validators.ts:213` — hata mesajı güncellenir

**Test:** her iki validator için `ES-0000001` kabul, `SE-0000001` hâlâ kabul,
`XX-0000001` red.

**Kabul kriteri:** Geriye dönük uyumlu — gevşetme. Mevcut 10 SEVKIYATNO örneği
(`SE-*`) etkilenmez.

---

## Adım 6 — IADE profil listesine KAMU

**Commit:** `feat(constants): InvoiceTypeCode=IADE artık KAMU profilinde de geçerli`

`IADEInvioceCheck` izinli profil listesi: TEMELFATURA, EARSIVFATURA, ILAC_TIBBICIHAZ,
YATIRIMTESVIK, IDIS **+ KAMU**.

**Dosyalar:**
- `src/config/constants.ts` — `PROFILE_TYPE_MATRIX[KAMU]`'ya `InvoiceTypeCode.IADE`
- `src/calculator/invoice-rules.ts:228-229` ve `src/calculator/document-calculator.ts:340-341`
  — "IADE → otomatik TEMELFATURA" davranışı **korunur** (varsayılan olarak doğru),
  ama kullanıcının açık KAMU seçimini ezmediği doğrulanır

**Test:** KAMU + IADE kombinasyonu `PROFILE_TYPE_MATRIX`'te izinli; açık KAMU profili
IADE tipiyle TEMELFATURA'ya düşürülmüyor.

**Kabul kriteri:** Yeni yetenek — mevcut örnek yok, yeni matris örneği eklenir.

---

## Adım 7 — SARJ altyapısı (tip + serializer)

**Commit:** `feat(types,serializers): InvoicePeriod saat alanları + AdditionalDocumentReference schemeID`

Adım 8'in ön koşulu. İki alan kütüphanede **hiç yok**:

1. **`PeriodInput.startTime` / `endTime`** — `EnerjiInvoicePeriodCheck`
   `StartTime`/`EndTime` zorunlu tutuyor.
   - `src/types/common.ts:423` — iki opsiyonel alan
   - `src/serializers/common-serializer.ts:26` — `serializePeriod`'a iki emit satırı
     (`PERIOD_SEQ` slotları **zaten var**: `xsd-sequence.ts:571,573`)
   - `src/calculator/simple-types.ts` — `SimplePeriodInput` aynı iki alan
   - `src/calculator/simple-invoice-mapper.ts:816` — `buildPeriod` geçişi
   - `npm run generate:paths` — session-paths yeniden üretilir

2. **`AdditionalDocumentInput.schemeId`** — `EnerjiESURaporIDCheck`
   `ID[@schemeID='ESURaporID']` istiyor.
   - `src/types/common.ts:255` — opsiyonel `schemeId`
   - `src/serializers/reference-serializer.ts:111` civarı — `ID`'ye `schemeID` attr

**Test:** serializer round-trip — saatli InvoicePeriod ve schemeID'li
AdditionalDocumentReference doğru sırada/attribute ile çıkıyor.

**Kabul kriteri:** `npm run verify:paths` temiz; tüm mevcut snapshot'lar **değişmeden**
geçer (alanlar opsiyonel, kimse doldurmuyor).

---

## Adım 8 — SARJ/SARJANLIK 4 zorunluluk

**Commit:** `feat(validators): Enerji/Şarj 4 yeni schematron kuralı (BREAKING)`

**Yeni dosya:** `src/validators/enerji-validator.ts`

| Kural | Kapsam | Gereklilik |
|---|---|---|
| `EnerjiInvoicePeriodCheck` | SARJ + SARJANLIK | ≥1 `InvoicePeriod`; `StartDate`, `StartTime`, `EndDate`, `EndTime` dolu; tarihler ≥ `2005-01-01`; saat `HH:mm:ss` |
| `EnerjiESURaporIDCheck` | **yalnız SARJ** | ≥1 `AdditionalDocumentReference` / `ID@schemeID="ESURaporID"` GUID formatında + `IssueDate` `^20\d{2}-\d{2}-\d{2}$` |
| `EnerjiPartyIdentificationPlakaCheck` | SARJ + SARJANLIK | Müşteri Party'de **tam 1** `PartyIdentification/ID@schemeID="PLAKA"`, boş değil, ≤50 karakter, `^[A-Z0-9_-]+$` |
| `EnerjiItemInstanceSerialIDCheck` | **yalnız SARJANLIK** | **Her** satırda ≥1 `Item/ItemInstance/SerialID`, boş değil |

> Context notu: `EnerjiItemInstanceSerialIDCheck` Main Schematron'da
> `inv:Invoice/cac:InvoiceLine` context'ine bağlı → kural **her satır için ayrı**
> çalışıyor, "en az bir satırda" değil.

> Plaka regex farkı: Enerji kuralı `^[A-Z0-9_-]+$` kullanıyor (TR plaka regex'i
> **değil**) — irsaliye kuralından bilinçli olarak farklı, Schematron'a sadık kalınır.

**Ayrıca düzeltilecek:** `src/calculator/invoice-rules.ts:291`
`showInvoicePeriod: isSgk` → SARJ/SARJANLIK'ta da açık olmalı; şu an UI'da gizli
olduğu için zorunlu alan doldurulamıyor.

**Örnek yenileme (bilinçli kırılma):** 3 ENERJI örneğinin hiçbirinde bu alanlar yok:
- `examples-matrix/valid/enerji/enerji-sarj-baseline`
- `examples-matrix/valid/enerji/enerji-sarj-coklu-sarj`
- `examples-matrix/valid/enerji/enerji-sarjanlik-baseline`

Her biri için `input.ts` + `input.json` yeni alanlarla güncellenir, `output.xml`
yeniden üretilir. `invalid/` altına 4 yeni negatif senaryo eklenir.

**Kabul kriteri:** 4 kural için pozitif + negatif test; 3 örnek yeni alanlarla
geçerli; `npm run matrix:run` temiz.

---

## Adım 9 — Sürüm 4.0.0

**Commit:** `chore(release): 4.0.0 — GİB 20260701 paketi uyumu (BREAKING)`

- `package.json` 3.0.0 → **4.0.0**
- `CHANGELOG.md` — BREAKING bölümü: daha önce geçerli sayılıp artık reddedilen
  input'lar tek tek listelenir (plakasız irsaliye, InvoicePeriod'suz SARJ,
  ESURaporID'siz SARJ, PLAKA'sız SARJ müşterisi, SerialID'siz SARJANLIK satırı,
  YATIRIMTESVIK dışı 308/339)
- `README.md` — kapsam dışı tablosu + yürürlük tarihi notu

**Kabul kriteri:** `npm test` + `npm run typecheck` + `npm run build` temiz.

---

## Risk kaydı

| Risk | Adım | Azaltma |
|---|---|---|
| `YATIRIM_TESVIK_EARSIV_TYPES` genişletme cazibesi → `yatirim-tesvik-validator` bozulur | 3 | Ayrı sabit; mevcut olana dokunma. Mevcut YTB testleri regresyon nöbetçisi |
| `generate:paths` çıktısı elle düzenlenirse `verify:paths` kırılır | 7 | Script çalıştır, çıktıyı elle düzenleme |
| Enerji plaka regex'i ile irsaliye plaka regex'i karıştırılır | 8 | İki ayrı sabit, ayrı isim, testte ikisi de açıkça kontrol |
| 3 ENERJI örneğinin yenilenmesi snapshot'ları sessizce bozar | 8 | `matrix:run` sonrası diff gözden geçirilir |
