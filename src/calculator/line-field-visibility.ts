/**
 * Line-level FieldVisibility türetimi (Sprint 8h.5 / AR-10).
 *
 * Mevcut doc-level `deriveFieldVisibility` (`invoice-rules.ts:250`) korunur ve genişletilir:
 * her satır için kendi visibility map'ini taşıyan `LineFieldVisibility` üretilir.
 *
 * Type/profile flag türetimleri ortak (`deriveTypeProfileFlags`) — hem doc-level hem
 * line-level fonksiyonlar aynı kuralları paylaşır, duplikasyon yok.
 *
 * Schematron / FIX-PLANI referansları her boolean üzerinde JSDoc'ta belirtilmiştir.
 */

import type { SimpleLineInput, SimpleInvoiceInput } from './simple-types';
import { WITHHOLDING_ALLOWED_TYPES } from '../ubltr/vocabulary/constants';
import { isYatirimTesvikScope } from '../ubltr/vocabulary/schematron-scopes';
import { configManager } from './config-manager';
import { isIhracKayitli702Invoice } from './ihrackayitli-702-scope';
import type { InvoiceTypeCode } from '../types/enums';

// ─── Type/Profile Flags (extract from deriveFieldVisibility) ─────────────────

export interface TypeProfileFlags {
  isIade: boolean;
  isTevkifat: boolean;
  /**
   * ⚠️ TEVKİFAT İZNİNİ BU BAYRAK BELİRLEMEZ — `canCarryWithholding` belirler.
   * GİB, `TEVKIFATIADE`/`YTBTEVKIFATIADE` tiplerinde `cac:WithholdingTaxTotal`
   * KABUL ETMEZ (bkz. `canCarryWithholding`). Bayrak yalnız "tip adı iade-tevkifat
   * mı" sorusunu yanıtlar; geriye uyum için duruyor.
   */
  isTevkifatIade: boolean;
  /**
   * Satırda tevkifat kodu verilebilir mi? — şematronun izinli tip listesi.
   *
   * Kaynak: `WITHHOLDING_ALLOWED_TYPES` (`GeneralWithholdingTaxTotalCheck`):
   * TEVKIFAT, YTBTEVKIFAT, IADE, YTBIADE, SGK, SARJ, SARJANLIK.
   */
  canCarryWithholding: boolean;
  isIstisna: boolean;
  isIhracKayitli: boolean;
  isOzelMatrah: boolean;
  isSgk: boolean;
  /**
   * Şarj ANLIK faturası (`InvoiceTypeCode=SARJANLIK`).
   *
   * Şematron `EnerjiItemInstanceSerialIDCheck` bu tipte HER KALEMDE
   * `cac:Item/cac:ItemInstance/cbc:SerialID` şart koşar. Bayrak alan görünürlüğü
   * içindir: kural olmadan kullanıcı "seri numarası zorunludur" hatasını görüyor
   * ama dolduracak alanı bulamıyordu (canlı portal testi, 2026-09-07).
   */
  isSarjAnlik: boolean;
  isTeknolojiDestek: boolean;
  isIhracat: boolean;
  isKamu: boolean;
  isEarsiv: boolean;
  /**
   * Yatırım teşvik düzlemi — kalemde harcama tipi + makine bilgileri beklenir.
   *
   * İKİ DÜZLEMİ birden kapsar (4.5.2):
   *   • e-Fatura : `ProfileID=YATIRIMTESVIK`
   *   • e-Arşiv  : `ProfileID=EARSIVFATURA` + tip ∈ `$YatirimTesvikEArsivInvoiceTypeCodeList`
   *     (YTBSATIS, YTBIADE, YTBISTISNA, YTBTEVKIFAT, YTBTEVKIFATIADE)
   *
   * Kapsam yüklemi TEK KAYNAKTAN gelir (`config/schematron-scopes`); doğrulayıcı
   * (`profile-requirement-validator`) da aynı fonksiyonu çağırır. Eskiden burada
   * `profile === 'YATIRIMTESVIK'` yazıyordu ve e-Arşiv YTB belgelerinde
   * doğrulayıcı "zorunlu" derken alanların HİÇBİRİ açılmıyordu.
   */
  isYatirimTesvik: boolean;
  isIlacTibbi: boolean;
  isYolcuBeraber: boolean;
  isIdis: boolean;
  /**
   * HKS düzlemi — kalemde künye/mal sahibi kimlikleri beklenir.
   *
   * İKİ DÜZLEMİ birden kapsar (4.4.0):
   *   • e-Fatura : `ProfileID=HKS`          (şematron `HKSInvioceCheck` burada
   *     19 karakterli KUNYENO'yu ŞART KOŞAR)
   *   • e-Arşiv  : tip `HKSSATIS`/`HKSKOMISYONCU` (`ProfileID=EARSIVFATURA`)
   *
   * ⚠️ Bu bir ALAN GÖRÜNÜRLÜĞÜ bayrağıdır, ZORUNLULUK yüklemi DEĞİL. Zorunluluk
   * kapsamları ayrı yaşar ve daha dardır — `vocabulary/schematron-scopes.ts`:
   *   • `isHksKunyeNoScope`       künye zorunluluğu; bu bayrakla AYNI kümedir
   *     (2026-09-22'de e-Arşiv ikizi de kapsama alındı — öncesinde alan
   *     görünüyordu ama boş bırakılabiliyordu)
   *   • `isHksOwnerRequiredScope` mal sahibi zorunluluğu; YALNIZ satış ikizi
   * Görünürlüğü zorunluluktan geniş tutmak DOĞRUDUR: kullanıcı komisyoncu
   * belgesinde de künyeyi girebilmelidir.
   */
  isHks: boolean;
}

/**
 * Type ve profile string'lerinden boolean flag türetir.
 * Hem `deriveFieldVisibility` (doc-level) hem `deriveLineFieldVisibility` (line-level)
 * aynı kaynaktan çalışır → kural duplikasyonu yok.
 */
export function deriveTypeProfileFlags(type: string, profile: string): TypeProfileFlags {
  /* ⚠️ `TEVKIFATIADE`/`YTBTEVKIFATIADE` bayrakları KORUNDU: ÜRETİMDE SUNULMAZLAR
   * (`PROFILE_TYPE_MATRIX`'ten çıkarıldılar) ama GELEN BELGEDE TANINIRLAR.
   * Bayrakları silmek, o tiplerle gelen bir faturayı görüntülerken iade/tevkifat
   * alanlarını kapatırdı — okuma yolu bozulurdu. */
  return {
    isIade: type === 'IADE' || type === 'YTBIADE' || type === 'TEVKIFATIADE' || type === 'YTBTEVKIFATIADE',
    isTevkifat: type === 'TEVKIFAT' || type === 'YTBTEVKIFAT',
    isTevkifatIade: type === 'TEVKIFATIADE' || type === 'YTBTEVKIFATIADE',
    canCarryWithholding: WITHHOLDING_ALLOWED_TYPES.has(type as InvoiceTypeCode),
    isIstisna: type === 'ISTISNA' || type === 'YTBISTISNA',
    isIhracKayitli: type === 'IHRACKAYITLI',
    isOzelMatrah: type === 'OZELMATRAH',
    isSgk: type === 'SGK',
    isSarjAnlik: type === 'SARJANLIK',
    isTeknolojiDestek: type === 'TEKNOLOJIDESTEK',
    isIhracat: profile === 'IHRACAT',
    isKamu: profile === 'KAMU',
    isEarsiv: profile === 'EARSIVFATURA',
    /* İKİ DÜZLEM: e-Fatura'da profil YATIRIMTESVIK, e-Arşiv'de tip YTB*.
     * Yalnız profile bakılsaydı e-Arşiv YTB belgelerinde harcama tipi, makine
     * adı, makine teçhizat sıra no ve makine ID alanlarının HİÇBİRİ açılmaz;
     * kullanıcı GİB'in "zorunludur" hatasını görüp dolduracak yer bulamazdı
     * (canlı portal bildirimi, 2026-09-08). Aynı kusur sınıfı HKS (4.4.0) ve
     * SARJANLIK (4.5.0) alanlarında da yaşandı — bkz. `schematron-scopes`. */
    isYatirimTesvik: isYatirimTesvikScope(profile, type),
    isIlacTibbi: profile === 'ILAC_TIBBICIHAZ',
    isYolcuBeraber: profile === 'YOLCUBERABERFATURA',
    isIdis: profile === 'IDIS',
    /* İKİ DÜZLEM: e-Fatura'da profil HKS, e-Arşiv'de tip HKSSATIS/HKSKOMISYONCU.
     * Yalnız profile bakılsaydı e-Arşiv düzleminde kalem kimlik alanı HİÇ
     * görünmez, kullanıcı künyeyi girecek yeri bulamazdı. */
    isHks: profile === 'HKS' || type === 'HKSSATIS' || type === 'HKSKOMISYONCU',
  };
}

// ─── Line-level FieldVisibility ──────────────────────────────────────────────

export interface LineFieldVisibility {
  /** Line `kdvPercent === 0` ise true (manuel exemption code dropdown gösterilir, M11/B-NEW-13). */
  showKdvExemptionCodeSelector: boolean;
  /** type=TEVKIFAT|TEVKIFATIADE|YTBTEVKIFAT|YTBTEVKIFATIADE ise true (M2 + BR-OPT-AJ19). */
  showWithholdingTaxSelector: boolean;
  /** withholdingTaxCode === '650' ise dinamik percent input görünür (B-NEW-04). */
  showWithholdingPercentInput: boolean;
  /** Profil IHRACAT veya tip IHRACKAYITLI ise satır delivery dropdown (BR-OPT-DLY13/15). */
  showLineDelivery: boolean;
  /**
   * İHRAÇ KAYITLI 702 etkin kapsamı (`isIhracKayitli702Invoice`) açıksa BÜTÜN
   * satırlarda true — GTİP (12 hane) zorunlu (`TaxExemptionReasonCodeCheck`).
   *
   * 5.2.0: eskiden yalnız satırın KENDİ kodu 702 iken açılıyordu. Karışık belgede
   * (702 + 701) 701 satırının, belge kodu 702 olan belgede kodsuz satırların
   * kutusu kapalı kalıyor; katı kurulum ise o satırlarda da GTİP istiyordu.
   */
  showCommodityClassification: boolean;
  /** `showCommodityClassification` ile aynı kapı — ALICIDIBSATIRKOD (11 hane) zorunlu. */
  showAlicidibsatirkod: boolean;
  /**
   * `showAlicidibsatirkod` ile aynı kapı (SATICIDIBSATIRKOD **izinli**, 4.5.1).
   *
   * Koşul BİLEREK AYNI — ikisi de tek bir şematron bağlamına aittir:
   * `IhracKayitliPartyIdentificationIDTypeCheck` yalnız
   * `InvoiceTypeCode='IHRACKAYITLI'` **ve** belge özetinde `TaxExemptionReasonCode='702'`
   * iken tetiklenir, alanın yazıldığı `cac:CustomsDeclaration` ağacı da bu akış dışında
   * anlamsızdır. Görünürlük ≠ zorunluluk: alan görünür ama boş bırakılabilir;
   * zorunluluğu 702 kuralı yalnız ALICI koduna yükler.
   */
  showSaticidibsatirkod: boolean;
  /** profile=EARSIVFATURA + type ∈ {TEKNOLOJIDESTEK, ILACTIBBI} ise IMEI/seri dropdown (B-NEW-06/07). */
  showAdditionalItemIdentifications: boolean;
  /**
   * Yatırım teşvik kapsamında harcama tipi (01-04) seçici (M3).
   *
   * Kapsam = e-Fatura `YATIRIMTESVIK` **veya** e-Arşiv `EARSIVFATURA`+`YTB*` tipi
   * (`YatirimTesvikCommodityClassificationCheck` / `...ItemClassificationCodeCheck`).
   */
  showItemClassificationCode: boolean;
  /** Yatırım teşvik kapsamı + line.itemClassificationCode='01' (makine bilgisi, B-NEW-09). */
  showProductTraceId: boolean;
  /**
   * Kalem seri numarası (`cac:Item/cac:ItemInstance/cbc:SerialID`) girilebilsin mi?
   *
   * İKİ AYRI kural bu tek alanı ister:
   *  • Yatırım teşvik kapsamı (İKİ DÜZLEM) + `itemClassificationCode='01'` → GİB
   *    dilinde «Makine ID» (`YatirimTesvikItemInstanceCheck`, B-NEW-09) — SATIR
   *    BAZINDA, yalnız 01 kalemde.
   *  • `SARJANLIK` → her kalemde ESU/şarj ünitesi seri numarası
   *    (`EnerjiItemInstanceSerialIDCheck`) — tip bazında, TÜM kalemlerde.
   */
  showSerialId: boolean;
}

/** Satır bayraklarının belge düzeyi girdileri — her satır için yeniden hesaplanmaz. */
export interface LineVisibilityContext {
  flags: TypeProfileFlags;
  /** İHRAÇ KAYITLI 702 etkin kapsamı (`isIhracKayitli702Invoice`). */
  ihracKayitli702: boolean;
}

/**
 * Bütün satırların bayrakları — belge düzeyi kararlar (tip/profil bayrakları,
 * 702 kapsamı) BİR KEZ hesaplanır (5.2.0).
 *
 * 702 kapsamı bütün satırları okur. Her satır için ayrı hesaplansaydı bir
 * yeniden türetme satır sayısının karesiyle büyürdü (3.000 satırda 140 ms /
 * güncelleme, S5 incelemesi). `InvoiceSession` bütün satırları bu fonksiyonla
 * türetir; maliyet satır sayısıyla doğrusal.
 */
export function deriveAllLineFieldVisibility(
  doc: Pick<SimpleInvoiceInput, 'type' | 'profile' | 'lines'>
    & Partial<Pick<SimpleInvoiceInput, 'kdvExemptionCode'>>,
): LineFieldVisibility[] {
  const flags = deriveTypeProfileFlags(doc.type ?? 'SATIS', doc.profile ?? 'TICARIFATURA');
  const context: LineVisibilityContext = {
    flags,
    ihracKayitli702: flags.isIhracKayitli && isIhracKayitli702Invoice(doc),
  };
  return doc.lines.map((line, idx) => deriveLineFieldVisibility(line, doc, idx, context));
}

/**
 * Bir satır için visibility map türetir. `idx` parametresi şu an sadece
 * dokümantasyon için (gelecekte satır-spesifik kuralda kullanılabilir).
 *
 * `doc.lines` + `doc.kdvExemptionCode` (5.2.0): İHRAÇ KAYITLI 702 kapsamı
 * BELGE düzeyinde bir karardır — bir satırın kodu öbür satırların GTİP
 * kutusunu açar. Bayrak bu yüzden bütün satırları ve belge kodunu okur.
 * Verilmezlerse yalnız bu satır ve (varsa) belge kodu okunur.
 */
export function deriveLineFieldVisibility(
  line: SimpleLineInput,
  doc: Pick<SimpleInvoiceInput, 'type' | 'profile'>
    & Partial<Pick<SimpleInvoiceInput, 'kdvExemptionCode' | 'lines'>>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _idx: number,
  /** İç kullanım: belge düzeyi kararlar bir kez hesaplanıp verilir (`deriveAllLineFieldVisibility`). */
  precomputed?: LineVisibilityContext,
): LineFieldVisibility {
  const flags = precomputed?.flags
    ?? deriveTypeProfileFlags(doc.type ?? 'SATIS', doc.profile ?? 'TICARIFATURA');
  const ihracKayitli702 = precomputed?.ihracKayitli702
    ?? (flags.isIhracKayitli && isIhracKayitli702Invoice({
      type: doc.type,
      kdvExemptionCode: doc.kdvExemptionCode,
      lines: doc.lines ?? [line],
    }));

  return {
    showKdvExemptionCodeSelector:
      line.kdvPercent === 0
      && !flags.isYatirimTesvik
      && !flags.isOzelMatrah,

    /* 🔴 4.1.6 — 4.1.5'te ATLANMIŞ İKİNCİ KAPI.
     *
     * Buradaki kural `isTevkifat || isTevkifatIade` idi: doc-level'da düzeltilen
     * aynı yanlış inancın satır seviyesindeki kopyası. Sonucu canlı görüldü:
     * tip IADE'de sütun başlığı geliyor (doc-level izin veriyor) ama HÜCRELER
     * DÜZENLENEMİYORDU (satır seviyesi hâlâ hayır diyordu).
     *
     * Bu dosyanın başlığı "doc-level ve line-level aynı kaynaktan çalışır,
     * duplikasyon yok" diyor — tevkifat kuralında bu DOĞRU DEĞİLDİ. Artık ikisi
     * de `WITHHOLDING_ALLOWED_TYPES`'tan okuyor. */
    showWithholdingTaxSelector: flags.canCarryWithholding,

    /* 4.2.0: '650' dizgisine çakılıydı; o kod kaldırılınca ölü kalırdı. Artık
     * kodun KENDİ `dynamicPercent` niteliğinden okunuyor — bugün hiçbir kodda
     * yok (bayrak daima false), GİB ileride serbest oranlı bir kod tanımlarsa
     * kendiliğinden çalışır. */
    showWithholdingPercentInput:
      flags.canCarryWithholding
      && !!line.withholdingTaxCode
      && configManager.getWithholdingTax(line.withholdingTaxCode)?.dynamicPercent === true,

    showLineDelivery: flags.isIhracat || flags.isIhracKayitli,

    /* 5.2.0 — TEK KAPSAM. Katı kurulum, oturum doğrulaması ve GİB şematronu ile
     * aynı yüklem (`isIhracKayitli702Invoice`): kapsam açıksa BÜTÜN satırlarda. */
    showCommodityClassification: ihracKayitli702,

    showAlicidibsatirkod: ihracKayitli702,

    /* Satıcı DİB satır kodu ALICI koduyla AYNI kapıdan geçer (gerekçe arayüz
     * tanımında). Ayrı bir bayrak tutulur ki portal iki alanı ayrı etiketleyip
     * "zorunlu" rozetini yalnız ALICI'ya koyabilsin. */
    showSaticidibsatirkod: ihracKayitli702,

    /* 🔴 HKS EKLENDİ (A1). Şematron `HKSInvioceCheck` her kalemde 19 karakterli
     * KUNYENO şart koşar, ama bu bayrak HKS'i kapsamadığı için tüketici arayüzü
     * kimlik alanını HİÇ göstermiyordu: kullanıcı "KUNYENO zorunludur" hatasını
     * görüyor, dolduracak alan bulamıyordu (portal alan denetimi, 2026-09-05).
     * 4.4.0: `isHks` HKS'in e-ARŞİV düzlemini de kapsar (tip HKSSATIS/
     * HKSKOMISYONCU) — orada da künye ve mal sahibi kimlikleri kaleme yazılır. */
    showAdditionalItemIdentifications:
      flags.isTeknolojiDestek || flags.isIlacTibbi || flags.isIdis || flags.isHks,

    showItemClassificationCode: flags.isYatirimTesvik,

    showProductTraceId:
      flags.isYatirimTesvik && line.itemClassificationCode === '01',

    /* 🔴 SARJANLIK EKLENDİ (4.5.0). Şematron `EnerjiItemInstanceSerialIDCheck` her
     * kalemde SerialID şart koşuyor ve kütüphane de "Şarj anlık faturalarında her
     * kalemde seri numarası zorunludur" uyarısını veriyordu — ama bu bayrak yalnız
     * YATIRIMTESVIK'i kapsadığı için portalda girilecek alan HİÇ görünmüyordu
     * (kullanıcı çıkmaza giriyordu, canlı test 2026-09-07). Aynı kusur sınıfı HKS'te
     * de yaşanmıştı (bkz. `showAdditionalItemIdentifications`). */
    showSerialId:
      (flags.isYatirimTesvik && line.itemClassificationCode === '01')
      || flags.isSarjAnlik,
  };
}
