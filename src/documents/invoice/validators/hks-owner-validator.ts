/**
 * HKS mal sahibi (`MALSAHIBI*`) alanları — simple-input katmanı ADAPTÖRÜ.
 *
 * Hal faturasında kalem, künyenin yanında malın SAHİBİNİ de taşır:
 *   cac:Item/cac:AdditionalItemIdentification/cbc:ID[@schemeID='MALSAHIBIADSOYADUNVAN']
 *   cac:Item/cac:AdditionalItemIdentification/cbc:ID[@schemeID='MALSAHIBIVKNTCKN']
 * Komisyoncu, malı kendi adına değil mal sahibi adına satar; alıcının belgede
 * kimin malını aldığını görmesi hal kaydının çalışma biçiminin parçasıdır.
 *
 * ── 🔴 İKİ ŞİDDET, İKİ KAPSAM (K9 kararı, 2026-09-22)
 *
 *   • ZORUNLULUK — HATA. Kapsam `isHksOwnerRequiredScope`:
 *       (HKS + SATIS)  |  (EARSIVFATURA + HKSSATIS)
 *     Kapsam GİB'in kendi görüntüleme XSLT'sinden ÖLÇÜLDÜ: mal sahibi kolonları
 *     YALNIZ bu iki çiftte açılır (`general.xslt:968`, `:2912`, `:3098`) ve
 *     GİB'in kendi örneği `HKS-Ornek1.xml` (HKS+SATIS) üç kimliği de taşır.
 *     K9 ("SATIS tarafında mal sahibi kimlikleri zorunlu") tam olarak bu kümedir.
 *
 *   • TUTARLILIK — UYARI. Kapsam `isHksOwnerFieldScope` EKSİ zorunluluk kapsamı:
 *     komisyoncu dışındaki diğer HKS tipleri (`ISTISNA`, `TEVKIFAT`, `IADE` …).
 *     Orada alanlar zorunlu değildir ama yarım bırakılmaları anlamsızdır.
 *
 * ── Neden bir zamanlar SADECE uyarıydı ve neden artık hata
 * Şematronda `MALSAHIBI*` geçen TEK BİR assert yoktur (üç şematron dosyasında 0
 * isabet); `PartyIdentification` uzunluk kuralları `AdditionalItemIdentification`'a
 * hiç uğramaz. Yani kural HATA yapıldığında **GİB'in kabul edeceği bir belgeyi
 * biz reddederiz**. Bu bedel BİLEREK kabul edildi (K9):
 *   1. MimForge canlıda DEĞİL — kıracağı geçmiş belge akışı yok.
 *   2. Kural YALNIZ bizim KURDUĞUMUZ belgede koşar; alınan (INBOUND) belge bu
 *      kütüphaneden hiç geçmez (ingest yolu `@mimforge/ubl-parse` kullanır ve
 *      "alınan belge olduğu gibi kabul edilir" kuralı orada geçerlidir).
 * Sonuç: şematronu geçen belgelerin ALT kümesini üretiriz — hal akışının iki
 * belgeli doğasını (GİB forum 83514) belgede GÖRÜNÜR kılan alt kümesini.
 *
 * ── KOMISYONCU neden KAPSAM DIŞI (değişmedi)
 * Orada mal sahibi ilişkisi faturanın KENDİ taraflarıyla kurulur, kalem
 * kimliğiyle değil. İki bağımsız ölçüm: GİB'in `HKS-Ornek2.xml`i (HKS+KOMISYONCU)
 * YALNIZ künye taşır, mal sahibi kimliği HİÇ yoktur; ve XSLT mal sahibi
 * kolonlarını komisyoncuda açmaz.
 *
 * ── Mekanizma NOTU
 * `validateHksOwnerFields` `ValidationWarning` üretir ve `InvoiceSession.validate()`
 * içinde kural-tabanlı uyarı dizisine katılır. `validateHksOwnerRequired` ise
 * `ValidationError` üretir ve hata boru hattına (validator → köprü →
 * severity:'error') BAĞLIDIR — belge kurulumunu bilerek kırar.
 */

import type { SimpleInvoiceInput } from '../../../calculator/simple-types';
import type { ValidationWarning } from '../../../calculator/invoice-rules';
import type { ValidationError } from '../../../errors/ubl-build-error';
import { profileRequirement } from '../../../ubltr/rules/validation-result';
import {
  isHksOwnerFieldScope,
  isHksOwnerRequiredScope,
} from '../../../ubltr/vocabulary/schematron-scopes';
import {
  checkHksOwnerConsistency,
  checkHksOwnerRequired,
} from '../../../ubltr/rules/shared/hks-item-identification-rules';
import {
  hksScopeLabel,
  simpleIdentityPath,
  toSimpleIdentityViews,
} from './hks-kunyeno-validator';

/**
 * Mal sahibi ikilisi ZORUNLU — HATA seviyesi (K9).
 *
 * Kapsam dışında BOŞ döner; tutarlılık uyarısı ayrı fonksiyondadır.
 */
export function validateHksOwnerRequired(input: SimpleInvoiceInput): ValidationError[] {
  const profile = input.profile ?? '';
  const type = input.type ?? '';

  if (!isHksOwnerRequiredScope(profile, type)) return [];

  const label = hksScopeLabel(profile, type);

  return checkHksOwnerRequired(toSimpleIdentityViews(input)).map(f =>
    profileRequirement(label, simpleIdentityPath(f.lineIndex, f.leaf), f.message),
  );
}

/**
 * Mal sahibi ikilisi TUTARLI — UYARI seviyesi.
 *
 * 🔑 Zorunluluk kapsamında SUSAR: orada aynı ihlal zaten HATA olarak
 * raporlanıyor; ikinci kez uyarı basmak kullanıcıya aynı şeyi iki dille
 * söylemek olurdu.
 */
export function validateHksOwnerFields(input: SimpleInvoiceInput): ValidationWarning[] {
  const profile = input.profile ?? '';
  const type = input.type ?? '';

  if (!isHksOwnerFieldScope(profile, type)) return [];
  if (isHksOwnerRequiredScope(profile, type)) return [];

  return checkHksOwnerConsistency(toSimpleIdentityViews(input)).map(f => ({
    field: simpleIdentityPath(f.lineIndex, f.leaf),
    message: f.message,
    severity: 'warning' as const,
  }));
}
