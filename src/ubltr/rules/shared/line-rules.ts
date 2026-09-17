/**
 * Kalem KİMLİĞİ kapısı — satır numarası / birim kodu / mal-hizmet adı.
 *
 * ── NİYE ORTAK ─────────────────────────────────────────────────────────────
 * Üç denetim de belge türünden BAĞIMSIZDIR:
 *   • `cbc:ID` numerik olmalı — UBL-TR'de satır numarası sayıdır,
 *   • `unitCode` boş olamaz — şematron `unitCode` kod-listesi assert'i CANLI
 *     ÖLÇÜLDÜ, `CreditNote` kökünde de patlıyor ("Geçersiz unitCode niteliği"),
 *   • `cac:Item/cbc:Name` XSD'de 1..1.
 *
 * e-SMM bu üçlüyü kendi `rules.ts` gövdesinde taşıyordu; e-MM aynı üçlüye
 * ihtiyaç duyunca kopyalanacak yerde buraya indi. Kural gövdesi TEK; belgeye
 * ait olan yalnız hata YOLU (`lines[i]`) ve sözlük.
 *
 * ── NE BURAYA GİRMEZ ───────────────────────────────────────────────────────
 * Vergi düzlemi (hangi kodlar geçerli, istisna metni zorunlu mu) belgeye
 * ÖZGÜDÜR ve çağıranda kalır: e-SMM'de küme `{0003, 0015, 9015}`, e-MM'de
 * kesinti kodları. Ortak katmana yazılsaydı bir belgenin kod kümesi diğerine
 * sızardı.
 */

import type { ValidationError } from '../../../errors/ubl-build-error';
import { missingField, invalidFormat } from '../validation-result';
import { isNonEmpty } from '../../../utils/formatters';

/** Kimliği denetlenecek kalem — belge tipinden bağımsız üç alan. */
export interface LineIdentityBearing {
  /** `cbc:ID` — numerik dizgi. */
  id: string;
  /** Birim kodu (UnitCodeList). */
  unitCode: string;
  /** `cac:Item` — yalnız `name` okunur. */
  item?: { name?: string };
}

/**
 * Tek bir kalemin kimlik alanlarını denetler.
 *
 * @param at Hata yolunun ÖNEKİ (örn. `lines[0]`). Çağıran kendi dizi adını
 *   verir; ortak katman belgenin girdi şeklini bilmez.
 * @param itemLabel Mal/hizmet adının SÖZLÜKTEKİ karşılığı — e-SMM'de "Hizmet
 *   adı", e-MM'de "Ürün adı". Kural aynı, metin belgeye ait (S3 disiplini).
 */
export function validateLineIdentity(
  line: LineIdentityBearing,
  at: string,
  itemLabel: string = 'Mal/hizmet adı',
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isNonEmpty(line.id)) {
    errors.push(missingField(`${at}.id`, 'Satır ID zorunludur'));
  } else if (!/^\d+$/.test(line.id)) {
    errors.push(invalidFormat(`${at}.id`, 'Numerik (örn: 1, 2, 3)', line.id));
  }

  if (!isNonEmpty(line.unitCode)) {
    errors.push(missingField(`${at}.unitCode`, 'Birim kodu zorunludur'));
  }

  if (!line.item || !isNonEmpty(line.item.name)) {
    errors.push(missingField(`${at}.item.name`, `${itemLabel} zorunludur`));
  }

  return errors;
}
