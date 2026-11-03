/**
 * Şematron KAPSAM yüklemleri — **TEK KAYNAK** (4.5.2).
 *
 * ## Çözülen kusur sınıfı
 *
 * GİB şematronundaki bir kural iki düzlemde birden yaşadığında (e-Fatura'da
 * PROFİLE, e-Arşiv'de TİPE bakarak), kütüphanenin farklı katmanları kapsamı
 * ayrı ayrı yazıyordu. Sonuç hep aynıydı: **doğrulayıcı "zorunlu" diyor,
 * görünürlük alanı hiç açmıyor** — kullanıcı hatayı görüyor ama dolduracak yeri
 * bulamıyordu. Aynı kusur ÜÇ KEZ üretimi vurdu:
 *
 *   1. HKS mal sahibi/künye alanları (e-Arşiv `HKSSATIS`/`HKSKOMISYONCU`) — 4.4.0
 *   2. `SARJANLIK` kalem seri numarası — 4.5.0
 *   3. Yatırım teşvik alanlarının TAMAMI (e-Arşiv `YTB*` tipleri) — 4.5.2
 *
 * Kök sebep her seferinde aynı: kapsam kuralının TEK YERDE yaşamaması. Bu modül
 * o yeri kurar. Yeni bir iki-düzlemli kural eklendiğinde yüklem BURAYA yazılır;
 * doğrulayıcı da görünürlük de buradan okur, kopya ÇIKARILMAZ.
 *
 * ## Sözleşme
 *
 * Yüklemler SAF ve BAĞIMSIZDIR: yalnız `profile` + `type` dizgilerini alır,
 * `configManager`'a veya girdiye bakmaz. Bu yüzden hem `InvoiceInput` (enum'lu)
 * hem `SimpleInvoiceInput` (dizgili) katmanı aynı fonksiyonu çağırabilir —
 * `InvoiceProfileId`/`InvoiceTypeCode` dizgi enum'ları olduğu için atanabilir.
 *
 * Tek ayrık: İHRAÇ KAYITLI 702 kapsamı (`isIhracKayitli702Scope`, 5.2.0).
 * Şematronun o kuralı tipe ek olarak istisna KODUNA bakar; yüklem bu yüzden
 * kodları da alır. Yine saftır: kodları çağıran verir, yüklem girdiye uzanmaz.
 */

import {
  YATIRIM_TESVIK_IADE_TYPES,
  YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES,
} from './constants';
import type { InvoiceTypeCode } from '../../types/enums';
import { isNonEmpty } from '../../utils/formatters';

/* Şematron `$YatirimTesvikEArsivInvoiceTypeCodeList` (UBL-TR_Codelist.xml:67) —
 * BEŞ tipin tamamı: YTBSATIS, YTBIADE, YTBISTISNA, YTBTEVKIFAT, YTBTEVKIFATIADE.
 *
 * ⚠️ `YTBTEVKIFATIADE` portalın ÜRETİM seçim listesinden çıkarıldı ama okuma
 * (ingest) yolunda hâlâ gelebilir; şematron onu kapsadığı için burada da
 * kapsanmak ZORUNDA — aksi halde o tiple gelen belgeyi açarken alanları
 * göstermez, eksiği de sessizce geçirirdik. */
const YTB_EARSIV_TYPES: ReadonlySet<string> = YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES;

/** Şematronun `YatirimTesvik*KDVCheck` kurallarında HARİÇ tuttuğu iade ailesi. */
const YTB_IADE_TYPES: ReadonlySet<string> = YATIRIM_TESVIK_IADE_TYPES;

/**
 * Yatırım teşvik TEMEL kapsamı — şematronun BEŞ kuralının paylaştığı koşul:
 *
 * ```
 * ProfileID = 'YATIRIMTESVIK'  VEYA
 * (ProfileID = 'EARSIVFATURA' VE InvoiceTypeCode ∈ $YatirimTesvikEArsivInvoiceTypeCodeList)
 * ```
 *
 * Bu koşulu BİREBİR taşıyan kurallar (UBL-TR_Common_Schematron.xml):
 *   • `YatirimTesvikContractDocumentReferenceIDCheck` (377-379) — belge · 6 haneli YTBNO
 *   • `YatirimTesvikCommodityClassificationCheck`     (467-469) — kalem · harcama tipi VAR
 *   • `YatirimTesvikItemClassificationCodeCheck`      (471-473) — kalem · harcama tipi 01-04
 *   • `YatirimTesvikItemInstanceCheck`                (491-493) — kalem · 01'de makine üçlüsü
 *   • `YatirimTesvikKDVCheck` / `YatirimTesvikLineKDVCheck` (495-501) — İADE elemesiyle,
 *     bkz. `isYatirimTesvikKdvScope`
 *
 * ⚠️ KAPSAM DIŞI KALANLAR (körü körüne genelleme YAPMA):
 *   • `YatirimTesvikInvoiceTypeCodeCheck` (369-371) — YALNIZ `ProfileID='YATIRIMTESVIK'`.
 *     e-Arşiv düzlemini HİÇ kapsamaz; oradaki tip kısıtı zaten kod listesinden gelir.
 *   • ISTISNA dörtlüsü (475-489) — dar EŞLEŞME ister, bkz. `isYatirimTesvikIstisnaScope`.
 *
 * Profil BOŞ geldiğinde tipten türetiriz: `YTB*` tipleri GİB'de yalnız
 * `EARSIVFATURA` altında yaşar, dolayısıyla profilsiz gelen bir `YTBSATIS` da bu
 * kapsamdadır. (Oturum yolu `resolveProfileForType` ile profili zaten doldurur;
 * bu dal `SimpleInvoiceBuilder`'a HAM girdi veren çağıranlar için emniyet ağıdır.)
 */
export function isYatirimTesvikScope(profile: string, type: string): boolean {
  if (profile === 'YATIRIMTESVIK') return true;
  if (!YTB_EARSIV_TYPES.has(type as InvoiceTypeCode)) return false;
  return profile === 'EARSIVFATURA' || profile === '';
}

/**
 * `YatirimTesvikKDVCheck` (495-497) + `YatirimTesvikLineKDVCheck` ilk assert'i
 * (499-500) — temel kapsam **EKSİ** iade ailesi:
 *
 * ```
 * <temel kapsam> VE NOT(InvoiceTypeCode ∈ {IADE, TEVKIFATIADE, YTBIADE, YTBTEVKIFATIADE})
 * ```
 *
 * İade belgelerinde KDV'nin pozitif olması BEKLENMEZ; bu yüzden "tüm KDV
 * alt-toplamları > 0" zorunluluğu onlara UYGULANMAZ.
 */
export function isYatirimTesvikKdvScope(profile: string, type: string): boolean {
  if (YTB_IADE_TYPES.has(type as InvoiceTypeCode)) return false;
  return isYatirimTesvikScope(profile, type);
}

/**
 * Yatırım teşvik ISTİSNA dar kapsamı — DÖRT kuralın paylaştığı EŞLEŞME koşulu:
 *
 * ```
 * (ProfileID = 'YATIRIMTESVIK' VE InvoiceTypeCode = 'ISTISNA')  VEYA
 * (ProfileID = 'EARSIVFATURA'  VE InvoiceTypeCode = 'YTBISTISNA')
 * ```
 *
 * Kurallar: `YatirimTesvikItemClassificationCodeIstisnaCheck` (475-477),
 * `...IstisnaCalculationSequenceNumericCheck` (479-481),
 * `YatirimTesvikTaxExemptionReasonCode308Check` (483-485),
 * `...339Check` (487-489).
 *
 * ⚠️ Bu, temel kapsamın DAR alt kümesi DEĞİL, AYRI bir koşuldur: temel kapsam
 * `EARSIVFATURA + YTBSATIS`'ı da alır, bu almaz; `YATIRIMTESVIK + ISTISNA`
 * ikisinde de vardır. Aynı koşul phantom-KDV (vazgeçilen KDV) davranışının da
 * tetikleyicisidir — `isPhantomKdvCombination` bunu ÇAĞIRIR, kopyalamaz.
 */
export function isYatirimTesvikIstisnaScope(profile: string, type: string): boolean {
  if (profile === 'YATIRIMTESVIK' && type === 'ISTISNA') return true;
  if (profile === 'EARSIVFATURA' && type === 'YTBISTISNA') return true;
  return false;
}

/* ══════════════════════ HKS — Hal Kayıt Sistemi ══════════════════════ */

/**
 * HKS'e ÖZGÜ e-Arşiv tipleri — `EARSIVFATURA` altında yaşayan iki tip.
 *
 * e-Fatura düzleminde ayrım PROFİLDEN (`ProfileID='HKS'`), e-Arşiv düzleminde
 * TİPTEN gelir; bu modülün var oluş sebebi olan asimetrinin ta kendisi.
 */
const HKS_EARSIV_TYPES: ReadonlySet<string> = new Set(['HKSSATIS', 'HKSKOMISYONCU']);

/**
 * `KUNYENO` kapsamı — GİB `general.xslt` KÜNYE NUMARASI kolonunun kapısı.
 *
 * ```
 * ProfileID = 'HKS'  VEYA
 * (ProfileID = 'EARSIVFATURA' VE InvoiceTypeCode ∈ {HKSSATIS, HKSKOMISYONCU})
 * ```
 *
 * Kapı ÜÇ yerde birebir aynıdır — başlık hücresi (`general.xslt:960`), satır
 * hücresi (`:2901`) ve ikinci satır tablosu (`:3092`). Dokuz paket kopyasında
 * (üç farklı XSLT özeti) aynen ölçüldü.
 *
 * 🔴 `isHksChargePlane` BU DEĞİLDİR — o YALNIZ komisyoncu ikizini açar
 * (`HKS+KOMISYONCU`, `EARSIVFATURA+HKSKOMISYONCU`). Künye kümesi ondan
 * GENİŞTİR: `HKS`in TÜM tiplerini ve e-Arşiv düzleminde satış ikizini de
 * kapsar. Masraf yüklemini burada kullanmak, `HKS+SATIS` belgesinde künye
 * zorunluluğunu SESSİZCE kaldırırdı.
 *
 * ── Şematron ile ilişki
 * Şematron (`UBL-TR_Common_Schematron.xml:358`, 23 e-Fatura paketinin
 * hepsinde birebir aynı) YALNIZ `ProfileID='HKS'` der; e-Arşiv düzlemi için
 * TEK BİR assert yoktur. Yani bu yüklem şematrondan GENİŞTİR ve bu bilinçlidir:
 * GİB'in kendi görüntüsü e-Arşiv ikizinde de künye kolonunu açar, künyesiz
 * belge orada boş bir kolon üretir. Şematronu geçen belgelerin ALT kümesini
 * üretmek GİB'e ters düşmez; tersi (gevşek olmak) GİB'in kolonunu boş bırakır.
 */
export function isHksKunyeNoScope(profile: string, type: string): boolean {
  if (profile === 'HKS') return true;
  if (!HKS_EARSIV_TYPES.has(type)) return false;
  return profile === 'EARSIVFATURA' || profile === '';
}

/**
 * Mal sahibi alanlarının ZORUNLU olduğu kapsam — GİB `general.xslt` MAL SAHİBİ
 * kolonlarının kapısı ve K9 kararının birebir karşılığı.
 *
 * ```
 * (ProfileID = 'HKS'          VE InvoiceTypeCode = 'SATIS')  VEYA
 * (ProfileID = 'EARSIVFATURA' VE InvoiceTypeCode = 'HKSSATIS')
 * ```
 *
 * Kapı İKİ yerde birebir aynıdır — başlık hücreleri (`general.xslt:968`) ve
 * satır hücreleri (`:2912`, `:3098`).
 *
 * 🔴 `isHksKunyeNoScope`tan DAR: künye HKS'in her tipinde istenir, mal sahibi
 * YALNIZ satış ikizinde. GİB'in kendi örnekleri bunu doğruluyor —
 * `HKS-Ornek1.xml` (HKS+SATIS) üç kimliği de taşır, `HKS-Ornek2.xml`
 * (HKS+KOMISYONCU) YALNIZ künyeyi taşır.
 *
 * ⚠️ Şematronda `MALSAHIBI*` geçen TEK BİR assert YOKTUR (üç şematron
 * dosyasında 0 isabet). Kural GİB'in görüntüleme kapısından ve iki belgeli hal
 * akışından (K9) gelir: komisyoncu malı KENDİ adına değil mal sahibi adına
 * satar; satış faturasında alıcının kimin malını aldığını görmesi hal kaydının
 * çalışma biçiminin parçasıdır.
 */
export function isHksOwnerRequiredScope(profile: string, type: string): boolean {
  if (profile === 'HKS') return type === 'SATIS';
  if (type !== 'HKSSATIS') return false;
  return profile === 'EARSIVFATURA' || profile === '';
}

/**
 * Mal sahibi alanlarının ANLAMLI olduğu geniş kapsam — tutarlılık UYARISI için.
 *
 * Zorunluluk kapsamının (`isHksOwnerRequiredScope`) üst kümesidir: komisyoncu
 * ikizi HARİÇ tüm HKS tipleri. Komisyoncuda mal sahibi ilişkisi faturanın KENDİ
 * taraflarıyla kurulur, kalem kimliğiyle değil (GİB `HKS-Ornek2.xml` ölçümü).
 *
 * 🔴 Zorunluluk kapsamı bu kümenin İÇİNDEDİR ve orada kural HATA seviyesinde
 * koşar; uyarı katmanı o satırları TEKRAR raporlamaz (çift mesaj olurdu).
 * Geriye kalan tipler (`HKS+ISTISNA`, `HKS+TEVKIFAT`, `HKS+IADE` …) alanları
 * zorunlu KILMAZ ama girildiyse yarım/bozuk bırakılmasını uyarır.
 */
export function isHksOwnerFieldScope(profile: string, type: string): boolean {
  if (profile === 'HKS') return type !== 'KOMISYONCU';
  if (type !== 'HKSSATIS') return false;
  return profile === 'EARSIVFATURA' || profile === '';
}

/* ═════════════════ İHRAÇ KAYITLI 702 — DİİB / geçici kabul ═════════════════ */

/** DİİB ve Geçici Kabul Rejimi Kapsamındaki Satışlar istisna kodu. */
const IHRACKAYITLI_702_CODE = '702';

/**
 * Kod çözümü: satırın kendi kodu, yoksa belge kodu.
 *
 * Boş ya da yalnız boşluk olan kod "yok" sayılır. Tip varsayılanını
 * (İHRAÇ KAYITLI'da 701, İSTİSNA'da 350) BU fonksiyon eklemez: varsayılanı hesap
 * motoru belge koduna zaten yazar (`calc.taxExemptionReason.kdv`).
 */
export function resolveEffectiveExemptionCode(
  lineCode: string | null | undefined,
  documentCode: string | null | undefined,
): string | undefined {
  if (isNonEmpty(lineCode)) return lineCode;
  if (isNonEmpty(documentCode)) return documentCode;
  return undefined;
}

/**
 * Bir kalemin BELGE VERGİ ÖZETİNE taşıdığı KDV istisna kodu (5.2.0).
 *
 *   • KDV'den istisna kalem (oran 0 ya da vazgeçilen KDV, `phantomKdv`) kendi
 *     kodunu taşır; kodu yoksa belge kodunu.
 *   • KDV'li kalem belge kodunu taşır. Kalem düzeyinde de istisna kodu yazılmaz
 *     (`buildSingleLine`); kalemin kendi kodu belge özetine sızmaz. 555 gibi
 *     belge düzeyi kodlar böyle çalışır: kodu belge seçer, KDV'li kalemler onu
 *     taşır.
 *
 * İki katman bu fonksiyonu çağırır ve ikisi de AYNI cevabı almak zorundadır:
 *   • eşleyicinin vergi özeti gruplaması (`buildTaxTotals`) — alt toplamlar
 *     (vergi kodu, oran, bu kod) üçlüsüyle gruplanır;
 *   • 702 kapsamı (`isIhracKayitli702Invoice`) — özetin 702 taşıyıp
 *     taşımayacağını XML kurulmadan önce bilir.
 * İkisi ayrı yazılsaydı "özet 701, satır 702" ayrışması yeniden mümkün olurdu.
 */
export function resolveSummaryExemptionCode(
  line: { kdvExemptionCode?: string | null; kdvPercent: number },
  documentCode: string | null | undefined,
  phantomKdv = false,
): string | undefined {
  const exemptLine = phantomKdv || line.kdvPercent === 0;
  return resolveEffectiveExemptionCode(exemptLine ? line.kdvExemptionCode : undefined, documentCode);
}

/**
 * İHRAÇ KAYITLI 702 ETKİN KAPSAMI — **TEK TANIM** (5.2.0, karar K-10).
 *
 * ```
 * InvoiceTypeCode = 'IHRACKAYITLI'  VE
 * (belge vergi özetinde 702  VEYA  KDV'den istisna bir satırın kodu 702)
 * ```
 *
 * Kapsam açıkken GİB `TaxExemptionReasonCodeCheck` (UBL-TR_Common_Schematron.xml:326)
 * **her** satırda 12 haneli `RequiredCustomsID` (GTİP) ve 11 haneli
 * `ALICIDIBSATIRKOD` ister. `IhracKayitliPartyIdentificationIDTypeCheck` (:462)
 * aynı koşulda kimlik türlerini `SATICIDIBSATIRKOD | ALICIDIBSATIRKOD` ile
 * sınırlar; satıcı kodu İZİNLİ, zorunlu DEĞİL.
 *
 * Girdiler:
 *   • `summaryCodes` — belge vergi özetinin istisna kodları. `InvoiceInput`
 *     katmanında (katı kurulum) `taxTotals[].taxSubtotals[]`; şematronun tetiği
 *     budur. `SimpleInvoiceInput` katmanında (bayraklar, oturum) özet henüz
 *     yoktur: `isIhracKayitli702Invoice` her kalemin özete taşıyacağı kodu
 *     (`resolveSummaryExemptionCode`) hesaplayıp buraya verir.
 *   • `exemptLineCodes` — KDV'den istisna satırların (oran 0 ya da vazgeçilen
 *     KDV) kendi alt toplam kodları; yalnız `InvoiceInput` katmanı verir.
 *     Kütüphanenin kurduğu belgede bu ayak özetten bir şey eklemez: istisna
 *     satırının kodu özete de yazılır. Elle kurulmuş, özeti satırlarıyla çelişen
 *     bir `InvoiceInput`ta (satır 702, özet 701) kapsamı yine açar — böyle bir
 *     belge GİB'den geçse bile yanlıştır.
 *
 * ## Belge kodu tek başına kapsamı AÇMAZ
 * Belge kodu, kendi kodu olmayan satırların ve KDV'li satırların kodudur;
 * kapsama bu yoldan girer. Bütün satırlar kendi koduyla 702 dışını seçmişse
 * belge kodu 702 hiçbir satıra uygulanmaz, vergi özetine de yazılmaz. O
 * belgede GİB'in 702 kuralı çalışmaz; kapsamı açmak katı kurulumu GİB'den katı
 * yapardı ve şematronun kabul ettiği belgeyi reddederdi.
 *
 * ## Çözülen kusur
 * 5.1.0'a kadar aynı soruyu dört yer dört ayrı biçimde cevaplıyordu:
 *   • satır bayrakları — satırın KENDİ kodu 702 mi; kutular yalnız o satırda;
 *   • katı kurulum — bir satır alt toplamında 702 var mı; bütün satırlar;
 *   • oturum doğrulaması — BELGE kodu 702 mi;
 *   • GİB şematronu — belge vergi ÖZETİNDE 702 var mı.
 * Karışık belgede (702 + 701) katı kurulum her satırda GTİP isterken bayraklar
 * 701 satırının kutusunu kapalı tutuyordu: belge kesilemiyordu. Belge kodu 702
 * ve iki 701 satırlı belgede katı kurulum, GİB'in reddettiği belgeyi
 * geçiriyordu. Dördü artık aynı cevabı verir.
 *
 * Saf yüklem: `configManager`a bakmaz, girdiyi değiştirmez.
 */
export function isIhracKayitli702Scope(
  type: string | null | undefined,
  summaryCodes: ReadonlyArray<string | null | undefined>,
  exemptLineCodes: ReadonlyArray<string | null | undefined> = [],
): boolean {
  if (type !== 'IHRACKAYITLI') return false;
  return summaryCodes.some(code => code === IHRACKAYITLI_702_CODE)
    || exemptLineCodes.some(code => code === IHRACKAYITLI_702_CODE);
}
