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
