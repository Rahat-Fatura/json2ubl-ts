/**
 * HKS (Hal Kayıt Sistemi) komisyoncu faturası MASRAF SÖZLÜĞÜ — TEK KAYNAK.
 *
 * ## Küme nereden geliyor
 *
 * 18 dizge bir satıcı derlemesi DEĞİLDİR: GİB'in resmî görüntüleme dönüşümü
 * `general.xslt` tam olarak bu `cbc:AllowanceChargeReason` değerlerini tanır ve
 * etiketler. Buradaki sıra XSLT'deki dal sırasıdır ve GİB'in kendi örnek
 * belgesindeki (`HKS-Ornek2.xml`) sıra ile birebir aynıdır.
 *
 * ⚠️ Küme KAPALIDIR. Liste dışı bir dizge şematrondan geçer
 * (`AllowanceChargeReason` için ÜÇ paket sürümünde de SIFIR kural var) ama GİB'in
 * resmî görüntüsünde **hiç görünmez** — sessiz veri kaybı. Kullanıcıya
 * görünmeyen bir kalem yazdırmak, yazmamaktan kötüdür.
 *
 * ## 🔴 KOD TÜRETME YASAK
 *
 * Adlar düzensizdir; `reason + 'KDV'` kuralı üç yerde birden çöker:
 *   • `HKSMILLISAVUNMAFON` → ikizi `HKSMILLISAVUNMAFONKDV` DEĞİL, `HKSMSFONKDV`
 *   • `HKSDIGERMASRAFLAR`  → ikizi `HKSDIGERMASRAFLARKDV` DEĞİL, `HKSDIGERKDV`
 *   • `HKSGVTEVKIFAT` / `HKSBAGKURTEVKIFAT` → KDV ikizi HİÇ YOK (kesinti, masraf değil)
 * Bu yüzden tablo ELLE yazılmıştır ve elle bakılır.
 *
 * ## Düzlem kapısı
 *
 * `general.xslt:1324` (masraf tablosu) ve `:2138` (toplam satırı) BİREBİR aynı
 * XPath'i kullanır:
 *
 *     (ProfileID='HKS'          and InvoiceTypeCode='KOMISYONCU')
 *  or (ProfileID='EARSIVFATURA' and InvoiceTypeCode='HKSKOMISYONCU')
 *
 * `isHksChargePlane` o kapının kod karşılığıdır. Başka HİÇBİR profil×tip
 * çiftinde masraf düzlemi açılmaz — `HKS`+`SATIS` dahil (orada masraf bloğu
 * yoktur; GİB'in `HKS-Ornek1.xml`'inde `ChargeTotalAmount` hiç geçmez).
 *
 * @see .claude/skills/gib-ubl-belge/xmls/general.xslt
 * @see .claude/skills/gib-ubl-belge/xmls/HKS-Ornek2.xml
 */

/**
 * 18 masraf kodu — **GİB `general.xslt` dal sırasında**.
 *
 * ⚠️ SIRA ANLAMLIDIR. XSLT `for-each` ile BELGE SIRASINI izler; ayrıca
 * "Masraflar:" başlığı `HKSKOMISYON` dalının içine gömülüdür
 * (`general.xslt:1329-1336`) — komisyon kalemi yoksa GİB'in görüntüsünde masraf
 * tablosunun başlığı hiç çıkmaz.
 */
export const HKS_CHARGE_CODES = [
  'HKSKOMISYON',
  'HKSKOMISYONKDV',
  'HKSNAVLUN',
  'HKSNAVLUNKDV',
  'HKSHAMMALIYE',
  'HKSHAMMALIYEKDV',
  'HKSNAKLIYE',
  'HKSNAKLIYEKDV',
  'HKSGVTEVKIFAT',
  'HKSBAGKURTEVKIFAT',
  'HKSRUSUM',
  'HKSRUSUMKDV',
  'HKSTICBORSASI',
  'HKSTICBORSASIKDV',
  'HKSMILLISAVUNMAFON',
  'HKSMSFONKDV',
  'HKSDIGERMASRAFLAR',
  'HKSDIGERKDV',
] as const;

/** Kapalı kümenin tip düzeyindeki karşılığı. */
export type HksChargeCode = (typeof HKS_CHARGE_CODES)[number];

/** Üyelik sorgusu için O(1) küme — doğrulayıcı ve sıralayıcı bunu okur. */
export const HKS_CHARGE_CODE_SET: ReadonlySet<string> = new Set<string>(HKS_CHARGE_CODES);

/**
 * GİB'in `general.xslt`'sinde bastığı etiketler.
 *
 * Değerler BELGE METNİDİR (Türkçe) ve bilerek çevrilmemiştir — GİB'in kendi
 * görüntüsüyle birebir aynı sözcükler kullanılsın diye. Alan/anahtar adları
 * İngilizcedir.
 */
export const HKS_CHARGE_LABELS: Readonly<Record<HksChargeCode, string>> = {
  HKSKOMISYON: 'Komisyon',
  HKSKOMISYONKDV: 'Komisyon KDV',
  HKSNAVLUN: 'Navlun',
  HKSNAVLUNKDV: 'Navlun KDV',
  HKSHAMMALIYE: 'Hammaliye',
  HKSHAMMALIYEKDV: 'Hammaliye KDV',
  HKSNAKLIYE: 'Nakliye',
  HKSNAKLIYEKDV: 'Nakliye KDV',
  HKSGVTEVKIFAT: 'G.V. Tevkifat',
  HKSBAGKURTEVKIFAT: 'Bağkur Tevkifat',
  HKSRUSUM: 'Rüsum',
  HKSRUSUMKDV: 'Rüsum KDV',
  HKSTICBORSASI: 'Ticaret Borsası',
  HKSTICBORSASIKDV: 'Ticaret Borsası KDV',
  HKSMILLISAVUNMAFON: 'Milli Savunma Fon',
  HKSMSFONKDV: 'Milli Savunma Fon KDV',
  HKSDIGERMASRAFLAR: 'Diğer Masraflar',
  HKSDIGERKDV: 'Diğer KDV',
};

/**
 * Ana kalem → KDV ikizi. **Elle yazıldı; türetim yok** (dosya başlığı).
 *
 * İkizi olmayan üç kod burada HİÇ geçmez: `HKSGVTEVKIFAT`,
 * `HKSBAGKURTEVKIFAT` (kesinti — KDV'si olmaz) ve KDV kalemlerinin kendisi.
 */
export const HKS_CHARGE_VAT_TWIN: Readonly<Partial<Record<HksChargeCode, HksChargeCode>>> = {
  HKSKOMISYON: 'HKSKOMISYONKDV',
  HKSNAVLUN: 'HKSNAVLUNKDV',
  HKSHAMMALIYE: 'HKSHAMMALIYEKDV',
  HKSNAKLIYE: 'HKSNAKLIYEKDV',
  HKSRUSUM: 'HKSRUSUMKDV',
  HKSTICBORSASI: 'HKSTICBORSASIKDV',
  HKSMILLISAVUNMAFON: 'HKSMSFONKDV',
  HKSDIGERMASRAFLAR: 'HKSDIGERKDV',
};

/**
 * 🔴 ÇİFT SAYIM KAPISI — masraf düzleminde YASAK vergi kodları (K6 + K7).
 *
 * İki kalem UBL-TR'de İKİ DÜZLEMDE birden yaşar:
 *   • Hal rüsumu    → `TaxTypeCode 9944` **veya** `AllowanceChargeReason HKSRUSUM`
 *   • Borsa tescili → `TaxTypeCode 8001` **veya** `AllowanceChargeReason HKSTICBORSASI`
 *
 * GİB'in kendi HKS örneği ikisini de `AllowanceCharge` yazar. İkisine BİRDEN
 * yazmak sessiz çift sayımdır ve HİÇBİR kapı uyarmaz: şematronda
 * `AllowanceChargeReason` için sıfır kural vardır, toplam eşitliği de
 * denetlenmez. Belge GİB'e gider, kabul edilir, hata ancak mal sahibine YANLIŞ
 * TUTAR ödendiğinde görünür.
 *
 * Bu yüzden karar BELGELENMEKLE KALMAZ, YAPIYA GÖMÜLÜR: masraf düzleminde bu
 * iki vergi kodu satır vergisi olarak KULLANILAMAZ (`hks-charge-validator`
 * fail-closed reddeder). Böylece iki düzlemin aynı anda dolması mümkün değildir.
 *
 * 🔴 Ölçülen bedel: Karekod Standardı Kılavuzu V1.2 `borsatescilucreti` alanını
 * `TaxTotal/TaxSubTotal/TaxAmount`tan besler — HKS komisyoncu faturasında o
 * karekod alanı BOŞ KALIR. Bilinen ve kabul edilmiş sınırdır.
 */
export const HKS_CHARGE_PLANE_FORBIDDEN_TAX_CODES: Readonly<Record<string, HksChargeCode>> = {
  '9944': 'HKSRUSUM',
  '8001': 'HKSTICBORSASI',
};

/**
 * Masraf düzlemi kapısı — GİB `general.xslt:1324` / `:2138` XPath'inin karşılığı.
 *
 * Profil BOŞ geldiğinde tipten türetilir: `HKSKOMISYONCU` tipi GİB'de yalnız
 * `EARSIVFATURA` altında yaşar (aynı emniyet ağı `isYatirimTesvikScope`te de
 * var — `SimpleInvoiceBuilder`'a HAM girdi veren çağıranlar için).
 */
export function isHksChargePlane(profile: string, type: string): boolean {
  if (profile === 'HKS') return type === 'KOMISYONCU';
  if (type !== 'HKSKOMISYONCU') return false;
  return profile === 'EARSIVFATURA' || profile === '';
}
