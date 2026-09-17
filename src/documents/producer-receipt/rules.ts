/**
 * e-MM doğrulama kapıları.
 *
 * ── NE BURADA, NE ORTAK KATMANDA ───────────────────────────────────────────
 * Künye yüklemleri `ubltr/rules/global`ta, taraf kuralları
 * `ubltr/rules/shared/common-validators`ta, para birimi/kur
 * `ubltr/rules/shared/currency-rules`ta, kalem kimliği
 * `ubltr/rules/shared/line-rules`ta yaşar. Bu dosyada yalnız **e-MM'e ÖZGÜ**
 * kurallar durur: kesinti kod kümesi ve kesinti-tutar tutarlılığı.
 *
 * ── 🔴 BU DOSYA e-SMM'DEKİNDEN DAHA ÖNEMLİ ─────────────────────────────────
 * e-SMM'de kütüphane doğrulaması canlı şematronun ÜSTÜNE bir katmandı; e-MM'de
 * çoğu yerde TEK katman. CANLI ÖLÇÜLDÜ (2026-09-17, :8081): `CreditNote`
 * kökünde şematron `ProfileID`, `CreditNoteTypeCode` ve `TaxTypeCode` için
 * HİÇBİR assert koşturmuyor — uydurma değerler sessizce geçiyor. "Şematron
 * yeşil" bu belgede "belge doğru" DEMEZ.
 *
 * ── YANLIŞLIKLA REDDETMEME DİSİPLİNİ ───────────────────────────────────────
 * Aşağıdaki "kurallar" BİLEREK YOKTUR; hepsi ölçülüp dayanaksız bulundu:
 *  • `PaymentMeans` zorunluluğu — 27 prod belgenin **0**'ında var.
 *  • "Müstahsil gerçek kişi olmalı (TCKN)" — 27/27 prod belgede öyle, ama
 *    müstahsil bir ortaklık ya da tüzel kişi de olabilir; ölçüm bir örneklemdir,
 *    kural değil.
 *  • "Teslim tarihi = düzenleme tarihi" — 27/27 prod belgede EŞİT, ama geriye
 *    dönük düzenlenen makbuzda eşit olmaz. Eşitliği dayatmak sahada geçerli
 *    belgeleri reddetmek olurdu.
 *  • "Stopaj oranı %2 olmalı" — prod'da %2 ve %4 ikisi de görüldü; oran GVK 94
 *    ile ürün türüne göre değişir ve Cumhurbaşkanı kararıyla değişebilir.
 *    Kütüphane oran DAYATMAZ.
 */

import type { ValidationError } from '../../errors/ubl-build-error';
import type { ProducerReceiptInput, ProducerReceiptTaxTotalInput } from './input';
import { PRODUCER_RECEIPT_TAX_TYPE_CODES } from './input';
import type { ProducerReceiptValidationStage } from './bindings';
import { producerReceiptHeaderBindings } from './bindings';
import { runFieldBindings } from '../../ubltr/rules/field-rule';
import { validateParty } from '../../ubltr/rules/shared/common-validators';
import { validateDocumentCurrency } from '../../ubltr/rules/shared/currency-rules';
import { validateLineIdentity } from '../../ubltr/rules/shared/line-rules';
import { missingField, invalidValue } from '../../ubltr/rules/validation-result';

export interface ProducerReceiptValidateOptions {
  /** Varsayılan `'document'` — çağrı şekli değişmeyen her çağıran eski davranışı alır. */
  stage?: ProducerReceiptValidationStage;
}

/** e-MM doğrulaması — tüm kapılar. */
export function validateProducerReceipt(
  input: ProducerReceiptInput,
  opts?: ProducerReceiptValidateOptions,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const stage = opts?.stage ?? 'document';

  // §1 Künye — yüklemler ORTAK, bağlama tablosu e-MM'e ait.
  errors.push(...runFieldBindings(producerReceiptHeaderBindings(stage), input));

  /* §2 Taraflar — ortak `validateParty`. Hata YOLLARI rolün GERÇEK adını
   * taşır (`issuer` / `producer`), UBL sarmalayıcısının adını değil: tüketici
   * hatayı kendi girdi şeklinde görmelidir. */
  errors.push(...validateParty(input.issuer, 'issuer'));
  errors.push(...validateParty(input.producer, 'producer'));

  // §3 Para birimi + kur — ORTAK kapı (`CurrencyCodeCheck`).
  errors.push(...validateDocumentCurrency(input));

  // §4 Kesinti düzlemi (belge + satır).
  errors.push(...validateTaxTotal(input.taxTotal, 'taxTotal'));

  // §5 Kalemler.
  if (!input.lines || input.lines.length === 0) {
    errors.push(missingField('lines', 'En az bir makbuz kalemi zorunludur'));
  } else {
    input.lines.forEach((line, i) => {
      const at = `lines[${i}]`;
      errors.push(...validateLineIdentity(line, at, 'Ürün adı'));
      errors.push(...validateTaxTotal(line.taxTotal, `${at}.taxTotal`));
    });
  }

  return errors;
}

/**
 * Kesinti düzlemi kapısı.
 *
 * 1. **Kod kümesi** — `{0003, 8001, SGK_PRIM}`. Tip düzeyinde zaten daraltıldı;
 *    bu kapı JS çağıranı (tip denetimi olmayan tüketici) için VAR — ve canlı
 *    şematron bu alanı hiç denetlemediği için TEK gerçek kapıdır.
 * 2. **Tutar İŞARETİ** — kesintiler `cac:TaxTotal`da POZİTİF yazılır (27/27 prod
 *    belgede öyle). Negatif bir kesinti tutarı toplam zincirini sessizce TERSE
 *    çevirirdi: `PayableAmount` müstahsile ödenecek tutardan BÜYÜK çıkardı.
 * 3. **Toplam tutarlılığı** — `cac:TaxTotal/cbc:TaxAmount` alt toplamların
 *    toplamıdır (UBL'in YAPISAL kuralı, tercih değil). 27/27 prod belgede
 *    tutuyor (ölçüldü).
 *
 * ⚠️ "En az bir `0003` olmalı" kuralı YOKTUR. Stopaj belgenin varlık sebebidir
 * ama oranı sıfıra indirilebilir (GVK 94, Cumhurbaşkanı yetkisi) ve prod'da
 * tutarı sıfır olan kesinti satırları ölçüldü. Var olmayan bir zorunluluğu
 * dayatmak geçerli belgeleri reddetmek olurdu.
 */
function validateTaxTotal(
  taxTotal: ProducerReceiptTaxTotalInput | undefined,
  path: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!taxTotal) {
    errors.push(missingField(path, 'Kesinti toplamı (cac:TaxTotal) zorunludur'));
    return errors;
  }
  if (!taxTotal.taxSubtotals || taxTotal.taxSubtotals.length === 0) {
    errors.push(missingField(`${path}.taxSubtotals`, 'En az bir cac:TaxSubtotal zorunludur'));
    return errors;
  }

  let sum = 0;

  taxTotal.taxSubtotals.forEach((ts, i) => {
    const at = `${path}.taxSubtotals[${i}]`;

    if (!PRODUCER_RECEIPT_TAX_TYPE_CODES.includes(ts.taxTypeCode)) {
      errors.push(
        invalidValue(
          `${at}.taxTypeCode`,
          PRODUCER_RECEIPT_TAX_TYPE_CODES.join('|'),
          String(ts.taxTypeCode),
        ),
      );
      return;
    }

    if (typeof ts.taxAmount !== 'number' || !Number.isFinite(ts.taxAmount)) {
      errors.push(invalidValue(`${at}.taxAmount`, 'sayı', String(ts.taxAmount)));
      return;
    }

    if (ts.taxAmount < 0) {
      errors.push({
        code: 'NEGATIVE_DEDUCTION_AMOUNT',
        message:
          'e-MM kesintileri cac:TaxTotal düzleminde POZİTİF yazılır — işaret toplam '
          + 'zincirinde çözülür (PayableAmount = brüt − Σ kesinti). Negatif tutar '
          + 'zinciri sessizce terse çevirir.',
        path: `${at}.taxAmount`,
        expected: '>= 0',
        actual: String(ts.taxAmount),
      });
      return;
    }

    sum += ts.taxAmount;
  });

  /* Yapısal UBL kuralı — float artefaktına karşı kuruş toleransı. */
  if (Number.isFinite(taxTotal.taxAmount) && Math.abs(taxTotal.taxAmount - sum) > 0.01) {
    errors.push(
      invalidValue(
        `${path}.taxAmount`,
        `alt toplamların toplamı (${sum.toFixed(2)})`,
        String(taxTotal.taxAmount),
      ),
    );
  }

  return errors;
}
