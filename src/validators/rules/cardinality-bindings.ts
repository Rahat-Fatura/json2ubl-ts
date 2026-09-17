/**
 * S3 — BAĞLAMA katmanı · XSD kardinalite kuralları.
 *
 * `header-bindings.ts` ile aynı doktrin: yüklem
 * (`xsd-cardinality-rules.ts`) belge türü BİLMEZ, hangi düğüme bağlandığını
 * BURADAKİ tablo söyler. Fark yalnız konudur — künye alanları yerine iç içe
 * düğümlerin zorunlu çocukları.
 *
 * 🔴 NEDEN `profile-validators`e DEĞİL DE BURAYA
 * Bu kurallar PROFİL kuralı değildir: `cac:Person`ın `cbc:FirstName` istemesi
 * YOLCUBERABERFATURA'ya özgü bir şart değil, UBL'in kendi tip tanımıdır. Düğüm
 * hangi profilde yazılırsa orada geçerlidir. Ayrıca `validateByProfile` yalnız
 * `validationLevel: 'strict'`te koşar; "üreteceğim XML geçersiz olacak" bilgisi
 * `basic` seviyede de doğrudur ve saklanmamalıdır.
 */

import type { ValidationError } from '../../errors/ubl-build-error';
import type { InvoiceInput } from '../../types/invoice-input';
import {
  personNameCardinalityRule,
  documentReferenceCardinalityRule,
  partyPostalAddressCardinalityRule,
} from './xsd-cardinality-rules';

/** Bağlama satırı — "şu yüklem, şu belgenin şu düğümüne bağlıdır". */
export interface CardinalityBinding<S> {
  /** Hatanın yazılacağı girdi yolu — tabloyu okurken kapsamı GÖRÜNÜR kılar. */
  readonly path: string;
  readonly run: (subject: S) => ValidationError[];
}

/** Seçici + yüklem çiftini tek satıra bağlar; `path` tek yerde yazılır. */
function bind<S, T>(
  path: string,
  select: (subject: S) => T | undefined,
  rule: (value: T | undefined, path: string) => ValidationError[],
): CardinalityBinding<S> {
  return { path, run: subject => rule(select(subject), path) };
}

/**
 * e-Fatura XSD kardinalite bağlamaları.
 *
 * ── Bilerek BAĞLANMAYANLAR (kapsam kararı, unutma değil)
 *   • `supplier` / `customer` → `cac:Person`: o dalda Person yalnız
 *     `taxIdType='TCKN'` iken yazılır ve `validateParty` ad+soyadı ZATEN zorunlu
 *     kılar. İkinci kural çift hata üretirdi.
 *   • `supplier` / `customer` → `cac:PostalAddress`: adres KOŞULSUZ yazılır,
 *     eksik il/ilçeyi `validatePartyAddressFields` (B-34) söyler.
 *   • `orderReference` / `despatchReferences` / `billingReferences` →
 *     `cbc:IssueDate`: `validateDocumentReference` (M6/B-32) ZATEN uyguluyor.
 *   • `buyerCustomer` → `cac:PostalAddress`: serileştirici adresi yalnız
 *     il+ilçe doluyken yazar (B-36), yani ADRESSİZ `cac:Party` üretilebilir ve
 *     bu da XSD-geçersizdir. Örnek korpusunda ÖLÇÜLMEDİ (158 örnek XML'in
 *     hiçbirinde çıkmadı) ve düzeltmesi B-36 politikasını değiştirmek demektir
 *     — S3 kapsamı dışında, AÇIK bırakıldı.
 */
export const INVOICE_CARDINALITY_BINDINGS: readonly CardinalityBinding<InvoiceInput>[] = [
  bind(
    'buyerCustomer.party',
    i => i.buyerCustomer?.party,
    (party, path) => personNameCardinalityRule(party, path),
  ),
  bind(
    'buyerCustomer.party.passportId',
    i => {
      const party = i.buyerCustomer?.party;
      if (!party) return undefined;
      /* S3'te bu alan `undefined` SABİTLENMİŞTİ: `PartyInput`te pasaport
       * düzenlenme tarihi SLOTU YOKTU, yani kural doğruydu ama KAPATILAMIYORDU.
       * Girdi yüzeyi genişletildi (`PartyInput.passportIssueDate` ←
       * `SimpleBuyerCustomerInput.passportIssueDate`); yüklem artık GERÇEK
       * değeri görür — tarihi veren belge temiz geçer, vermeyen hâlâ durur. */
      return { id: party.passportId, issueDate: party.passportIssueDate };
    },
    (ref, path) => documentReferenceCardinalityRule(ref, path, 'IdentityDocumentReference'),
  ),
  bind(
    'taxRepresentativeParty.postalAddress',
    i => (i.taxRepresentativeParty ? { address: i.taxRepresentativeParty.postalAddress } : undefined),
    (wrapper, path) =>
      wrapper === undefined
        ? [] // `cac:TaxRepresentativeParty` hiç yazılmıyorsa kardinalite sorusu doğmaz.
        : partyPostalAddressCardinalityRule(wrapper.address, path, 'TaxRepresentativeParty'),
  ),
];

/** Tabloyu koşar — `validateCommon`ın §1.9 bloğu. */
export function runCardinalityBindings<S>(
  bindings: readonly CardinalityBinding<S>[],
  subject: S,
): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const binding of bindings) errors.push(...binding.run(subject));
  return errors;
}
