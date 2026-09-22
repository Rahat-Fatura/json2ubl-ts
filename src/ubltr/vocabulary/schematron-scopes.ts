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
 */

import {
  YATIRIM_TESVIK_IADE_TYPES,
  YATIRIM_TESVIK_SCHEMATRON_EARSIV_TYPES,
} from './constants';
import type { InvoiceTypeCode } from '../../types/enums';

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
