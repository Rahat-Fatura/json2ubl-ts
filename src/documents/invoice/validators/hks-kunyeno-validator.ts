/**
 * HKS KUNYENO kontrolü — simple-input katmanı ADAPTÖRÜ.
 *
 * Kuralın GÖVDESİ burada DEĞİL: `ubltr/rules/shared/hks-item-identification-rules`
 * içindedir ve `InvoiceInput` katmanı (`profile-validators.ts`) AYNI gövdeyi
 * çağırır. Bu dosyanın işi yalnız kapsamı sormak ve bulguyu bu katmanın alan
 * yoluna çevirmektir.
 *
 * ── 🔴 KAPSAM ARTIK `ProfileID='HKS'` DEĞİL
 * Eskiden kapı `input.profile !== HKS` idi; e-Arşiv ikizi (`EARSIVFATURA` +
 * `HKSSATIS`/`HKSKOMISYONCU`) kuralı HİÇ görmüyordu — künye boş ya da 5 haneli
 * geçebiliyordu. Şematron da orada susuyor (`Common:358` yalnız `ProfileID='HKS'`
 * der; 23 e-Fatura paketinin hepsinde birebir aynı), yani belge iki kapıdan da
 * sessizce geçiyordu.
 *
 * Kapsam artık TEK KAYNAKTAN okunur: `isHksKunyeNoScope` — GİB'in kendi
 * görüntüleme XSLT'sindeki künye kolonunun kapısı (`general.xslt:960`, `:2901`,
 * `:3092`). Yüklem `isHksChargePlane` DEĞİLDİR; o yalnız komisyoncu ikizini
 * açar ve burada kullanılsaydı `HKS+SATIS` belgesinde künye zorunluluğunu
 * sessizce kaldırırdı.
 *
 * ── Katman ayrımı
 * Bu kuralın `InvoiceInput` katmanı eşleniği `profile-validators.ts`
 * (`validateHksKunyeNoRules`) içindedir; o YALNIZ `validationLevel='strict'`
 * altında çalışır. InvoiceSession/UI akışı kuralı 4.1.2'ye kadar hiç görmüyordu
 * — KUNYENO'suz HKS faturası sessizce üretilip GİB'de reddediliyordu.
 */

import type { SimpleInvoiceInput } from '../../../calculator/simple-types';
import type { ValidationError } from '../../../errors/ubl-build-error';
import { profileRequirement } from '../../../ubltr/rules/validation-result';
import { isHksKunyeNoScope } from '../../../ubltr/vocabulary/schematron-scopes';
import {
  checkHksKunyeNo,
  type HksLineIdentityView,
} from '../../../ubltr/rules/shared/hks-item-identification-rules';

/**
 * Hata etiketinde görünen kapsam adı.
 *
 * e-Fatura düzleminde profil zaten ayırıcıdır (`[HKS]`); e-Arşiv düzleminde
 * profil tek başına anlamsızdır (`EARSIVFATURA` her e-Arşiv belgesidir) ve
 * ayırıcı TİPTİR. Aynı gösterim yatırım teşvikte de kullanılıyor
 * (`EARSIV+${type}`), kopya bir biçim icat edilmedi.
 */
export function hksScopeLabel(profile: string, type: string): string {
  return profile === 'HKS' ? 'HKS' : `EARSIV+${type}`;
}

/** Simple katmanının satırlarını çekirdeğin gördüğü şekle çevirir. */
export function toSimpleIdentityViews(
  input: SimpleInvoiceInput,
): HksLineIdentityView[] {
  return input.lines.map(line => ({
    name: line.name ?? '',
    identifications: line.additionalItemIdentifications ?? [],
  }));
}

/** Simple katmanının kimlik düğümü yolu. */
export function simpleIdentityPath(lineIndex: number, leaf: string | null): string {
  const base = `lines[${lineIndex}].additionalItemIdentifications`;
  return leaf === null ? base : `${base}.${leaf}`;
}

export function validateHksKunyeNo(input: SimpleInvoiceInput): ValidationError[] {
  const profile = input.profile ?? '';
  const type = input.type ?? '';

  if (!isHksKunyeNoScope(profile, type)) return [];

  const label = hksScopeLabel(profile, type);

  return checkHksKunyeNo(toSimpleIdentityViews(input)).map(f =>
    profileRequirement(label, simpleIdentityPath(f.lineIndex, f.leaf), f.message),
  );
}
