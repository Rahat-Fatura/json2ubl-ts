/**
 * HKS komisyoncu MASRAF BLOĞU doğrulayıcısı — simple-input katmanı.
 *
 * ## 🔴 Neden bu doğrulayıcı olmadan bu dikey ÇALIŞTIRILAMAZ
 *
 * Bu düzlemde "yeşil şematron" doğruluk kanıtı DEĞİLDİR. Üç paket sürümünde
 * `AllowanceCharge` ve `ChargeTotalAmount` için SIFIR kural ölçüldü; kütüphanenin
 * `ubltr/` kural katmanı da bu ekseni tanımıyor. Zincir yanlış kurulursa hiçbir
 * otomatik kapı uyarmaz — belge GİB'e gider, KABUL EDİLİR, hata ancak mal
 * sahibine yanlış tutar ödendiğinde görünür. O yüzden kapı BURADA kurulur.
 *
 * ## Beş kural (hepsi fail-closed)
 *
 * 0. **🔴 5.1.0 — genel belge iskontosu/artırımı YOK.** Masraf düzlemi DIŞINDA
 *    `documentAllowanceCharges` kalemi verilemez
 *    (`DOCUMENT_ALLOWANCE_CHARGE_UNSUPPORTED`). 5.0.0 bu kalemleri matrahtan
 *    düşüp KDV'yi yeniden hesaplamıyordu: 100 TL + %20 + %10 belge iskontosu →
 *    matrah 90,00, KDV 20,00. İskonto kalemlere dağıtılıp satır iskontosu
 *    olarak verilmelidir. Aynı kapı XML üretiminde de vardır
 *    (`mapSimpleToInvoiceInput`), yani `validationLevel: 'none'` bile bu
 *    kalemleri SESSİZCE düşürmez.
 *
 * 1. **Kapalı küme.** Masraf düzleminde her kalemin `reason` değeri
 *    `HKS_CHARGE_CODES` içinden olmalıdır. Liste dışı dizge şematrondan geçer
 *    ama GİB'in resmî görüntüsünde HİÇ GÖRÜNMEZ → sessiz veri kaybı.
 *
 * 2. **Kaçak kod yasağı (ters yön).** Masraf düzlemi DIŞINDA `HKS*` masraf
 *    kodu kullanılamaz. `HKS`+`SATIS` dahil: GİB'in XSLT kapısı yalnız
 *    `KOMISYONCU`/`HKSKOMISYONCU` için açılır, başka yerde kalem çizilmez ve
 *    toplam zinciri de ters işareti uygulamaz — yani hem görünmez hem yanlış
 *    yönde toplanır.
 *
 * 3. **`ChargeIndicator` sabittir.** GİB'in kendi örneğinde blokların tamamı
 *    `false`tur ve toplam yine de ödenecekten DÜŞÜLÜR. Motor bu düzlemde
 *    bayrağa bakmadan düştüğü için `true` yazan bir çağıran "artırım"
 *    sandığı kalemin düşüldüğünü göremezdi — sessiz işaret hatası.
 *
 * 4. **🔴 ÇİFT SAYIM YAPISAL OLARAK İMKÂNSIZ.** Hal rüsumu ve borsa tescili
 *    UBL-TR'de İKİ DÜZLEMDE birden yaşar (`TaxTypeCode 9944`/`8001` ↔
 *    `HKSRUSUM`/`HKSTICBORSASI`). Karar (K6+K7) masraf düzlemidir; bu yüzden
 *    o iki VERGİ KODU bu profilde satır vergisi olarak KULLANILAMAZ. İki
 *    düzlemin aynı anda dolması artık belgeleme meselesi değil, üretilemez
 *    bir hâldir.
 *
 * ## Kapsam dışı bırakılanlar (bilerek)
 *
 * • **Aynı kodun iki kez geçmesi** hata sayılmaz: GİB'in `for-each`i iki satırı
 *   da çizer, yani kayıp yoktur ve yasaklandığına dair bir kanıt yoktur.
 * • **Oran ↔ tutar tutarlılığı** denetlenmez: GİB'in kendi örneğinde oran (5) ile
 *   tutar (10) zaten tutarsızdır — `MultiplierFactorNumeric` gösterimdir,
 *   `Amount` otoritedir (K3).
 * • **Oran varsayılanı** yoktur (K8): rüsum/fon/borsa tarifeleri GİB
 *   kaynaklarında YOK, Ticaret Bakanlığı / hal yönetmeliği alanındadır.
 *   Kaynağı olmayan sayı koda girmez.
 *
 * @see src/ubltr/vocabulary/hks-charge-codes.ts — küme, etiketler, düzlem kapısı
 */

import type { SimpleInvoiceInput } from '../../../calculator/simple-types';
import type { ValidationError } from '../../../errors/ubl-build-error';
import {
  HKS_CHARGE_CODES,
  HKS_CHARGE_CODE_SET,
  HKS_CHARGE_PLANE_FORBIDDEN_TAX_CODES,
  isHksChargePlane,
} from '../../../ubltr/vocabulary/hks-charge-codes';
import {
  documentAllowanceChargeUnsupported,
  invalidValue,
  missingField,
} from '../../../ubltr/rules/validation-result';

/** Kullanıcı mesajlarında kümeyi tek satırda göstermek için. */
const CODE_LIST_TEXT = HKS_CHARGE_CODES.join(', ');

export function validateHksCharges(input: SimpleInvoiceInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const profile = input.profile ?? '';
  const type = input.type ?? '';
  const items = input.documentAllowanceCharges ?? [];
  const chargePlane = isHksChargePlane(profile, type);

  if (!chargePlane) {
    errors.push(...genericDocumentAllowanceChargeErrors(items));
    return errors;
  }

  // Kural 1 + 3 — kapalı küme ve sabit işaret.
  items.forEach((item, i) => {
    const path = `documentAllowanceCharges[${i}]`;
    const reason = item.reason?.trim() ?? '';

    if (reason === '') {
      errors.push(missingField(
        `${path}.reason`,
        'HKS komisyoncu masraf kalemi sebep kodu taşımalıdır. '
        + `Geçerli kodlar: ${CODE_LIST_TEXT}`,
      ));
    } else if (!HKS_CHARGE_CODE_SET.has(reason)) {
      errors.push(invalidValue(
        `${path}.reason`,
        `HKS masraf kodu (18 kodluk kapalı küme): ${CODE_LIST_TEXT}`,
        reason,
      ));
    }

    if (item.chargeIndicator) {
      errors.push(invalidValue(
        `${path}.chargeIndicator`,
        'false — HKS komisyoncu masrafları ödenecek tutardan DÜŞÜLÜR; '
        + 'GİB örneğinde blokların tamamı ChargeIndicator=false taşır',
        'true',
      ));
    }

    if (item.amount !== undefined && item.amount < 0) {
      errors.push(invalidValue(
        `${path}.amount`,
        'Negatif olmayan tutar — masraf zaten ödenecek tutardan düşülür, '
        + 'eksi işaret toplamı ters çevirir',
        String(item.amount),
      ));
    }

    if (item.percent !== undefined && item.percent < 0) {
      errors.push(invalidValue(
        `${path}.percent`,
        'Negatif olmayan oran (%)',
        String(item.percent),
      ));
    }
  });

  // Kural 4 — çift sayım kapısı.
  input.lines.forEach((line, i) => {
    (line.taxes ?? []).forEach((tax, ti) => {
      const twin = HKS_CHARGE_PLANE_FORBIDDEN_TAX_CODES[tax.code];
      if (!twin) return;
      errors.push(invalidValue(
        `lines[${i}].taxes[${ti}].code`,
        `HKS komisyoncu faturasında bu kalem VERGİ düzleminde değil MASRAF `
        + `düzleminde beyan edilir: documentAllowanceCharges → ${twin}. `
        + 'İkisine birden yazmak sessiz ÇİFT SAYIM üretir.',
        tax.code,
      ));
    });
  });

  return errors;
}

/**
 * Masraf düzlemi DIŞINDAKİ belge düzeyi kalemlerin hataları (kural 0 + 2).
 *
 * HKS masraf kodu taşıyan kalem "yanlış profil" hatasını alır (kural 2 —
 * kullanıcı büyük olasılıkla profili yanlış seçmiştir); geri kalan her kalem
 * genel belge iskontosu/artırımıdır ve 5.1.0'da desteklenmez (kural 0).
 *
 * `mapSimpleToInvoiceInput` da bu fonksiyonu çağırır: kapı doğrulama seviyesine
 * bağlı DEĞİLDİR.
 */
export function genericDocumentAllowanceChargeErrors(
  items: ReadonlyArray<{ reason?: string; chargeIndicator?: boolean }>,
): ValidationError[] {
  return items.map((item, i) => {
    const reason = item.reason?.trim() ?? '';
    if (reason !== '' && HKS_CHARGE_CODE_SET.has(reason)) {
      return invalidValue(
        `documentAllowanceCharges[${i}].reason`,
        'HKS masraf kodu YALNIZ ProfileID=HKS + InvoiceTypeCode=KOMISYONCU '
        + '(veya EARSIVFATURA + HKSKOMISYONCU) belgesinde kullanılabilir',
        reason,
      );
    }
    return documentAllowanceChargeUnsupported(
      `documentAllowanceCharges[${i}]`,
      item.chargeIndicator ? 'belge düzeyi artırım' : 'belge düzeyi iskonto',
    );
  });
}
