/**
 * HKS kalem kimlikleri (`cac:Item/cac:AdditionalItemIdentification`) — KURAL
 * ÇEKİRDEĞİ, katmandan bağımsız.
 *
 * ## Neden ayrı bir çekirdek
 *
 * Aynı kural kütüphanede İKİ katmanda birden koşar:
 *   • `SimpleInvoiceInput`  → `validators/hks-kunyeno-validator.ts`,
 *                             `validators/hks-owner-validator.ts`
 *   • `InvoiceInput`        → `validators/profile-validators.ts`
 * İki katmanın tek farkı kimlik dizisinin NEREDE durduğudur
 * (`line.additionalItemIdentifications` ↔ `line.item.additionalItemIdentifications`)
 * ve hatanın yazılacağı alan yolu. Kuralın KENDİSİ aynıdır.
 *
 * Kural gövdesi eskiden iki yerde ayrı ayrı yazılıydı ve şimdiden AYRIŞMIŞTI:
 * simple katmanı satırdaki İKİNCİ künyeyi hata sayıyordu, input katmanı
 * saymıyordu. e-Arşiv düzlemi eklenirken üçüncü bir kopya doğacaktı. Bu dosya
 * o kopyaları TEK gövdeye indirir; katmanlar yalnız ADAPTÖR yazar.
 *
 * ## Sözleşme
 *
 * Çekirdek SAF ve BAĞIMSIZDIR: `ValidationError`/`ValidationWarning` üretmez,
 * alan yolu KURMAZ, profil/tip BİLMEZ. Kapsam kararı çağıranındır ve TEK
 * KAYNAKTAN okunur (`vocabulary/schematron-scopes.ts`).
 *
 * @see UBL-TR_Common_Schematron.xml — `HKSInvioceCheck` (KUNYENO sayım eşitliği)
 * @see general.xslt — künye ve mal sahibi kolonlarının kapıları
 */

/** Katmandan bağımsız kimlik çifti — iki katmanın da taşıdığı en dar şekil. */
export interface HksIdentification {
  readonly schemeId: string;
  readonly value?: string;
}

/** Bir satırın kimlik kümesinin katmandan bağımsız görünüşü. */
export interface HksLineIdentityView {
  /** Kalem adı — mesajda satırı insana tanıtır; yoksa boş dizge. */
  readonly name: string;
  readonly identifications: ReadonlyArray<HksIdentification>;
}

/**
 * Çekirdeğin ürettiği bulgu — alan YOLU DEĞİL, yolun parçaları.
 *
 * `leaf` doluysa hata `…additionalItemIdentifications.<leaf>` yoluna,
 * boşsa düğümün kendisine yazılır. Yolu KURMAK adaptörün işidir: iki katmanın
 * kök yolu farklıdır.
 */
export interface HksIdentityFinding {
  readonly lineIndex: number;
  readonly leaf: string | null;
  readonly message: string;
}

/** Şematron `string-length(...) = 19` — uzunluk şartı kimliğin kendisi kadar bağlayıcı. */
export const KUNYENO_LENGTH = 19;

/** `schemeID` değeri — UBL-TR kod listesi `AdditionalItemIdentificationIDType`. */
export const KUNYENO_SCHEME_ID = 'KUNYENO';

/** `schemeID` — mal sahibi ad/soyad/unvan (kod listesinde YOK, şematron da bakmıyor). */
export const OWNER_NAME_SCHEME_ID = 'MALSAHIBIADSOYADUNVAN';

/** `schemeID` — mal sahibi VKN (10) veya TCKN (11). */
export const OWNER_TAX_ID_SCHEME_ID = 'MALSAHIBIVKNTCKN';

/** VKN 10, TCKN 11 hane — ikisi de yalnız rakam. */
const OWNER_TAX_ID_PATTERN = /^(\d{10}|\d{11})$/;

/** Satırı insana tanıtan ek — kalem adsızsa gürültü üretmez. */
function lineTag(index: number, name: string): string {
  const trimmed = name.trim();
  return trimmed === '' ? `satır ${index + 1}` : `satır ${index + 1}: ${trimmed}`;
}

/**
 * Şematron `normalize-space` ile ölçer: yalnız boşluktan ibaret bir değer
 * SAYILMAZ. `trim()` bunu birebir taklit eder.
 */
function valuesOf(line: HksLineIdentityView, schemeId: string): string[] {
  return line.identifications
    .filter(id => id.schemeId === schemeId)
    .map(id => (id.value ?? '').trim())
    .filter(v => v !== '');
}

/**
 * KUNYENO kuralı — **şematrondan KATI**, bilerek.
 *
 * ── 🔴 ŞEMATRON SATIR-BAZLI DEĞİL, SAYIM-BAZLI
 * Kuralın asıl testi şudur:
 *   count(… cbc:ID[@schemeID='KUNYENO' and string-length(…)=19]) = count(cac:InvoiceLine)
 * Yani belge GENELİNDEKİ geçerli künye SAYISI ile SATIR SAYISI eşitse geçer.
 * Bu bir sayım deliğidir: 1. satırda İKİ künye + 2. satırda HİÇ künye olan belge
 * 2 = 2 verir ve şematrondan GEÇER — oysa 2. satır künyesizdir. Canlı sonda
 * doğrulandı (xslt-service :8081, paket 20260701): böyle bir belge 0 ihlalle
 * yeşil döndü.
 *
 * Bu çekirdek deliği KAPATIR: SATIR BAŞINA TAM BİR künye arar.
 *   0 künye  → hata (şematron da yakalar)
 *   2+ künye → hata (şematron YAKALAMAZ; hal kaydında bir kalem = bir künye)
 * Katı olmak GİB'e ters düşmez — şematronu geçen her belge kümesinin ALT
 * kümesini üretiriz; tersi (gevşek olmak) GİB'de reddedilecek belge üretirdi.
 */
export function checkHksKunyeNo(
  lines: ReadonlyArray<HksLineIdentityView>,
): HksIdentityFinding[] {
  const findings: HksIdentityFinding[] = [];

  lines.forEach((line, i) => {
    /* `find` DEĞİL `filter`: sayım deliğini kapatmak için satırdaki TÜM
     * künyeleri görmek gerekir (bkz. yukarıdaki not). */
    const kunyeNos = valuesOf(line, KUNYENO_SCHEME_ID);

    if (kunyeNos.length === 0) {
      findings.push({
        lineIndex: i,
        leaf: null,
        message: `HKS belgelerinde her satırda KUNYENO zorunludur (${lineTag(i, line.name)})`,
      });
      return;
    }

    if (kunyeNos.length > 1) {
      /* Hal kaydında bir kalem = bir künye. Birden fazlası şematronun SAYIM
       * eşitliğini başka bir satırın eksiğiyle "dengeleyebilir" ve belge yeşil
       * görünürken künyesiz satır taşır. */
      findings.push({
        lineIndex: i,
        leaf: null,
        message:
          `HKS belgelerinde her satırda YALNIZ BİR KUNYENO bulunmalıdır `
          + `(${lineTag(i, line.name)} — gelen: ${kunyeNos.length} adet)`,
      });
      return;
    }

    if (kunyeNos[0].length !== KUNYENO_LENGTH) {
      findings.push({
        lineIndex: i,
        leaf: KUNYENO_SCHEME_ID,
        message:
          `KUNYENO ${KUNYENO_LENGTH} karakter olmalıdır `
          + `(${lineTag(i, line.name)} — gelen: ${kunyeNos[0].length})`,
      });
    }
  });

  return findings;
}

/**
 * Mal sahibi ikilisinin ZORUNLULUĞU — K9 kararı, HATA seviyesi.
 *
 * Kapsam çağıranındır (`isHksOwnerRequiredScope`). Kapsamda her satır İKİ
 * kimliği de taşımak zorundadır; VKN/TCKN ayrıca 10 (VKN) veya 11 (TCKN) haneli
 * ve yalnız rakam olmalıdır.
 *
 * ⚠️ İkisi de boşken SESSİZ KALMAK bu katmanda YANLIŞTIR: "zorunlu" demek tam
 * olarak "ikisi de boşsa hatadır" demektir. Tutarlılık uyarısının sessiz kaldığı
 * durum (`checkHksOwnerConsistency`) zorunluluk kapsamı DIŞINDA anlamlıdır.
 */
export function checkHksOwnerRequired(
  lines: ReadonlyArray<HksLineIdentityView>,
): HksIdentityFinding[] {
  const findings: HksIdentityFinding[] = [];

  lines.forEach((line, i) => {
    const name = valuesOf(line, OWNER_NAME_SCHEME_ID)[0] ?? '';
    const taxId = valuesOf(line, OWNER_TAX_ID_SCHEME_ID)[0] ?? '';

    if (name === '') {
      findings.push({
        lineIndex: i,
        leaf: OWNER_NAME_SCHEME_ID,
        message:
          `Satır ${i + 1}: mal sahibi adı (${OWNER_NAME_SCHEME_ID}) zorunludur — `
          + 'komisyoncu malı mal sahibi adına satar, alıcı kimin malını aldığını görmelidir.',
      });
    }

    if (taxId === '') {
      findings.push({
        lineIndex: i,
        leaf: OWNER_TAX_ID_SCHEME_ID,
        message:
          `Satır ${i + 1}: mal sahibi VKN/TCKN (${OWNER_TAX_ID_SCHEME_ID}) zorunludur — `
          + 'komisyoncu malı mal sahibi adına satar, alıcı kimin malını aldığını görmelidir.',
      });
    } else if (!OWNER_TAX_ID_PATTERN.test(taxId)) {
      findings.push({
        lineIndex: i,
        leaf: OWNER_TAX_ID_SCHEME_ID,
        message:
          `Satır ${i + 1}: mal sahibi VKN/TCKN 10 (VKN) veya 11 (TCKN) haneli sayısal `
          + `olmalıdır (gelen: "${taxId}").`,
      });
    }
  });

  return findings;
}

/**
 * Mal sahibi ikilisinin TUTARLILIĞI — UYARI seviyesi.
 *
 * Zorunluluk kapsamı DIŞINDA kalan HKS tipleri içindir: alanlar zorunlu
 * değildir ama BİRLİKTE anlamlıdırlar. İkisi de boşsa sessiz kalır.
 */
export function checkHksOwnerConsistency(
  lines: ReadonlyArray<HksLineIdentityView>,
): HksIdentityFinding[] {
  const findings: HksIdentityFinding[] = [];

  lines.forEach((line, i) => {
    const name = valuesOf(line, OWNER_NAME_SCHEME_ID)[0] ?? '';
    const taxId = valuesOf(line, OWNER_TAX_ID_SCHEME_ID)[0] ?? '';

    // İkisi de yoksa sessiz: alanlar zorunlu değil, yalnız BİRLİKTE anlamlılar.
    if (name === '' && taxId === '') return;

    if (name !== '' && taxId === '') {
      findings.push({
        lineIndex: i,
        leaf: null,
        message:
          `Satır ${i + 1}: mal sahibi adı girilmiş ama ${OWNER_TAX_ID_SCHEME_ID} yok — `
          + 'mal sahibi bilgisi ad ve VKN/TCKN ile birlikte verilmelidir.',
      });
    } else if (name === '' && taxId !== '') {
      findings.push({
        lineIndex: i,
        leaf: null,
        message:
          `Satır ${i + 1}: mal sahibi VKN/TCKN girilmiş ama ${OWNER_NAME_SCHEME_ID} yok — `
          + 'mal sahibi bilgisi ad ve VKN/TCKN ile birlikte verilmelidir.',
      });
    }

    if (taxId !== '' && !OWNER_TAX_ID_PATTERN.test(taxId)) {
      findings.push({
        lineIndex: i,
        leaf: OWNER_TAX_ID_SCHEME_ID,
        message:
          `Satır ${i + 1}: mal sahibi VKN/TCKN 10 (VKN) veya 11 (TCKN) haneli sayısal `
          + `olmalıdır (gelen: "${taxId}").`,
      });
    }
  });

  return findings;
}
