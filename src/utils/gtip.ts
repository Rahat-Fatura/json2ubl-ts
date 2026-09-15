/**
 * GTİP (Gümrük Tarife İstatistik Pozisyonu) — TEK normalizasyon/doğrulama kaynağı.
 *
 * ## Normatif dayanak
 *
 * 1. **GİB, 17.01.2017 «İHRACAT entegratör test duyurusu»** — *"GTİP **noktasız
 *    12 hane**"*.
 *    Kaynak: `https://ebelge.gib.gov.tr/dosyalar/IHRACAT_entegrator_guncel_TEST_DUYURUSU.pdf`
 *
 * 2. **`UBL-TR_Common_Schematron.xml:326`** (`IHRACKAYITLI` + `702`):
 *    ```
 *    cac:GoodsItem/cbc:RequiredCustomsID[string-length(normalize-space(string(text()))) = 12]
 *    ```
 *    🔴 Dikkat: şematron **KARAKTER** sayar, rakam DEĞİL. `normalize-space` yalnız
 *    boşluğu kırpar/daraltır — noktayı ELEMEZ. Yani `8471.30.0000.00` (15 karakter)
 *    şematrondan REDDEDİLİR. Normalizasyonun XML yazımına kadar inmesinin sebebi
 *    tam olarak budur.
 *
 * 3. **`UBL-TR_Common_Schematron.xml:436`** (`IHRACAT` profili): yalnız
 *    `string-length(...) != 0` — yani şematron İHRACAT'ta hane sayısını
 *    DENETLEMEZ. 12 hane şartının dayanağı (1)'deki duyurudur; yanlış biçim
 *    şematrondan sessizce geçip GTB tarafında `1230` reddi olarak patlar.
 *
 * ## Sözleşme: normalizasyon TOLERE EDİCİ, doğrulama KATI
 *
 * - `normalizeGtip` yalnız **biçim ayraçlarını** (boşluk `.` `-` `_` `/`) siler.
 *   DEĞER ÜRETMEZ, rakam uydurmaz, kırpmaz, sıfır doldurmaz.
 * - `isValidGtip` normalize edilmiş hâlin **tam 12 rakam** olmasını şart koşar.
 *
 * Bu ayrım bilinçlidir: harf temizlenMEZ. `replace(/\D/g, '')` gibi bir "her
 * rakam-olmayanı at" yaklaşımı `847A30000000` girdisini sessizce 11 haneye
 * indirip kullanıcıya YANLIŞ bir hane sayısı raporlardı; burada böyle bir değer
 * normalize edilmeden geçer ve doğrulamada "rakam olmalı" diye reddedilir.
 */

/** GİB'in şart koştuğu hane sayısı — «noktasız 12 hane». */
export const GTIP_DIGIT_COUNT = 12;

/**
 * Yalnız BİÇİM ayraçları. Harf/rakam ve diğer hiçbir karakter silinmez.
 * `\s` JS'te ` ` (kırılmaz boşluk) dâhil tüm Unicode boşluklarını kapsar —
 * PDF/Excel'den kopyalanan GTİP'te en sık görülen kirlilik budur.
 */
const GTIP_SEPARATORS = /[\s.\-_/]+/g;

/** Normalize edilmiş GTİP kabul kalıbı. */
const GTIP_NORMALIZED = /^\d{12}$/;

/**
 * GTİP'i tel biçimine indirger: biçim ayraçlarını siler.
 *
 * - `'8471.30.0000.00'` → `'847130000000'`
 * - `'8471 30 0000 00'` → `'847130000000'`
 * - `'847130000000'`    → `'847130000000'` (değişmez)
 * - `'8471.30'`         → `'847130'` (KISA — normalize eder, KABUL ETMEZ; kararı `isValidGtip` verir)
 * - `''` / `'   '` / `'...'` / `undefined` / `null` → `undefined`
 *
 * @returns Ayraçsız değer; girdi boş ya da tamamen ayraçtan ibaretse `undefined`.
 */
export function normalizeGtip(raw: string | undefined | null): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const stripped = raw.replace(GTIP_SEPARATORS, '');
  return stripped.length > 0 ? stripped : undefined;
}

/**
 * GTİP geçerli mi — normalize edildikten sonra TAM 12 rakam mı?
 *
 * - `'847130000000'`     → `true`
 * - `'8471.30.0000.00'`  → `true`  (normalize → 12 rakam)
 * - `'8471.30'`          → `false` (6 hane)
 * - `'84713000000A'`     → `false` (12 karakter ama rakam değil)
 * - `undefined` / `''`   → `false`
 */
export function isValidGtip(raw: string | undefined | null): boolean {
  const normalized = normalizeGtip(raw);
  return normalized !== undefined && GTIP_NORMALIZED.test(normalized);
}

/**
 * Geçersizlik sebebini Türkçe anlatır — hata/öneri mesajlarının TEK kaynağı.
 *
 * Üç katman (profil doğrulayıcı, IHRACKAYITLI+702 doğrulayıcı, öneri kuralı)
 * eskiden hane sayısını üç ayrı şekilde sayıp üç ayrı cümle kuruyordu; artık
 * cümleyi de burası kurar.
 *
 * @returns Geçerliyse `undefined`, değilse kullanıcıya gösterilecek açıklama.
 */
export function describeGtipDefect(raw: string | undefined | null): string | undefined {
  const normalized = normalizeGtip(raw);
  if (normalized === undefined) {
    return `GTİP No boş olamaz — noktasız ${GTIP_DIGIT_COUNT} hane olmalıdır.`;
  }
  if (!/^\d+$/.test(normalized)) {
    return 'GTİP No yalnız rakamlardan oluşmalıdır (nokta ve boşluk serbest, harf değil).';
  }
  if (normalized.length !== GTIP_DIGIT_COUNT) {
    return `GTİP No ${GTIP_DIGIT_COUNT} hane olmalı (girilen: ${normalized.length} hane).`;
  }
  return undefined;
}
