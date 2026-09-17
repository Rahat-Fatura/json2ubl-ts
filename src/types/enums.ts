/** e-Fatura profil türleri */
export enum InvoiceProfileId {
  TEMELFATURA = 'TEMELFATURA',
  TICARIFATURA = 'TICARIFATURA',
  YOLCUBERABERFATURA = 'YOLCUBERABERFATURA',
  IHRACAT = 'IHRACAT',
  OZELFATURA = 'OZELFATURA',
  KAMU = 'KAMU',
  HKS = 'HKS',
  ENERJI = 'ENERJI',
  ILAC_TIBBICIHAZ = 'ILAC_TIBBICIHAZ',
  YATIRIMTESVIK = 'YATIRIMTESVIK',
  IDIS = 'IDIS',
  EARSIVFATURA = 'EARSIVFATURA',
}

/** Fatura tip kodları */
export enum InvoiceTypeCode {
  SATIS = 'SATIS',
  IADE = 'IADE',
  TEVKIFAT = 'TEVKIFAT',
  TEVKIFATIADE = 'TEVKIFATIADE',
  ISTISNA = 'ISTISNA',
  OZELMATRAH = 'OZELMATRAH',
  IHRACKAYITLI = 'IHRACKAYITLI',
  SGK = 'SGK',
  KOMISYONCU = 'KOMISYONCU',
  HKSSATIS = 'HKSSATIS',
  HKSKOMISYONCU = 'HKSKOMISYONCU',
  KONAKLAMAVERGISI = 'KONAKLAMAVERGISI',
  SARJ = 'SARJ',
  SARJANLIK = 'SARJANLIK',
  TEKNOLOJIDESTEK = 'TEKNOLOJIDESTEK',
  YTBSATIS = 'YTBSATIS',
  YTBIADE = 'YTBIADE',
  YTBISTISNA = 'YTBISTISNA',
  YTBTEVKIFAT = 'YTBTEVKIFAT',
  YTBTEVKIFATIADE = 'YTBTEVKIFATIADE',
}

/**
 * e-SMM (Serbest Meslek Makbuzu) profil türleri — **KENDİ EKSENİ**.
 *
 * 🔴 `InvoiceProfileId`e EKLENMEZ. Gerekçe GİB'in kendi ayrımıdır: `ProfileIDType*`
 * ailesi şemada belge başına AYRI tanımlıdır. Tek enuma toplamak, fatura
 * seçicilerine (profil×tip matrisi, `resolveProfileForType`, görünürlük türetimi)
 * ait olmayan bir değeri sızdırırdı.
 *
 * ⚠️ `EARSIVBELGE` **`UBL-TR_Codelist.xml`'de YOKTUR** — GİB e-SMM belge GÖVDESİ
 * için yayınlanmış format/XSD/şematron TANIMLAMAZ; normatif olan yalnız e-Arşiv
 * RAPOR katmanıdır. Gövdedeki bu kullanım BİZİM sözleşmemizdir ve Main şematron
 * `ProfileIDCheck` ile REDDEDER (doğrulama tarafında bastırma profili gerekir).
 */
export enum SelfEmployedVoucherProfileId {
  EARSIVBELGE = 'EARSIVBELGE',
}

/**
 * e-SMM belge tip kodları — **KENDİ EKSENİ** (bkz. `SelfEmployedVoucherProfileId`).
 *
 * ⚠️ `SERBESTMESLEKMAKBUZU` da `UBL-TR_Codelist.xml`'de yoktur; Main şematron
 * `InvoiceTypeCodeCheck` ile reddeder.
 */
export enum SelfEmployedVoucherTypeCode {
  SERBESTMESLEKMAKBUZU = 'SERBESTMESLEKMAKBUZU',
}

/**
 * e-MM (Müstahsil Makbuzu) profil türleri — **KENDİ EKSENİ**.
 *
 * 🔴 `SelfEmployedVoucherProfileId` ile DEĞERİ aynıdır (`EARSIVBELGE`) ama enum
 * AYRIDIR. Gerekçe kök farkıdır: e-SMM `Invoice`, e-MM `CreditNote` köklüdür ve
 * iki belge tipi aynı ekseni PAYLAŞMAZ. Tek enuma toplamak, bir belgenin profil
 * kümesini diğerine sızdırır — `SelfEmployedVoucherProfileId`in faturadan ayrı
 * tutulmasının gerekçesiyle birebir aynı.
 *
 * ⚠️ `EARSIVBELGE` `UBL-TR_Codelist.xml`'de YOKTUR. e-SMM'den FARKLI olarak bu
 * burada bir SORUN DEĞİLDİR: CANLI ÖLÇÜLDÜ (2026-09-17, :8081) — GİB şematronu
 * `CreditNote` kökünde `ProfileID` üzerinde HİÇBİR assert koşturmaz
 * (`ProfileIDCheck` `Invoice`a bağlıdır). e-SMM'in ihtiyaç duyduğu bastırma
 * profili e-MM'de GEREKMEZ.
 */
export enum ProducerReceiptProfileId {
  EARSIVBELGE = 'EARSIVBELGE',
}

/**
 * e-MM belge tip kodları — **KENDİ EKSENİ** (bkz. `ProducerReceiptProfileId`).
 *
 * `MUSTAHSILMAKBUZ` 27/27 gerçek prod belgede ölçülen değerdir. Yazımı
 * KISALTILMIŞTIR (`MUSTAHSILMAKBUZU` DEĞİL) — bu bir tercih değil, sahadaki
 * değerin kendisidir; "u" eklemek belgeyi eski sistemle uyumsuz kılardı.
 *
 * CANLI ÖLÇÜLDÜ: `CreditNoteTypeCode` üzerinde de assert YOKTUR — uydurma bir
 * tip kodu bile şematrondan geçer. Kapalı küme bu yüzden TİP DÜZEYİNDE
 * korunuyor: doğrulayıcı tutmuyorsa tutacak olan biziz.
 */
export enum ProducerReceiptTypeCode {
  MUSTAHSILMAKBUZ = 'MUSTAHSILMAKBUZ',
}

/** e-İrsaliye profil türleri */
export enum DespatchProfileId {
  TEMELIRSALIYE = 'TEMELIRSALIYE',
  HKSIRSALIYE = 'HKSIRSALIYE',
  IDISIRSALIYE = 'IDISIRSALIYE',
}

/** İrsaliye tip kodları */
export enum DespatchTypeCode {
  SEVK = 'SEVK',
  MATBUDAN = 'MATBUDAN',
}

/** Vergi kimlik tipi */
export type TaxIdType = 'VKN' | 'TCKN';

/** BuyerCustomer parti tipi */
export type BuyerPartyType = 'EXPORT' | 'TAXFREE';
