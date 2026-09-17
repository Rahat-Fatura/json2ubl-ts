import type { SimpleInvoiceInput } from '../../src';
import baseInput from './input';

export interface ExpectedValidationError {
  code: string;
  path?: string;
  messageIncludes?: string;
}

export interface InvalidCase {
  description: string;
  input: SimpleInvoiceInput;
  expectedErrors?: ExpectedValidationError[];
  expectedErrorMessage?: string;
  notCaughtYet?: string;
  validationLevel?: 'basic' | 'strict' | 'none';
}

function mutate(mutator: (input: SimpleInvoiceInput) => void): SimpleInvoiceInput {
  const clone = structuredClone(baseInput);
  mutator(clone);
  return clone;
}

export const invalidCases: InvalidCase[] = [
  {
    description: '(profile requirement) buyerCustomer eksik',
    input: mutate((i) => { delete i.buyerCustomer; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT' }],
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  /* ── XSD kardinalite kapıları (S3 yüklemleri + genişletilmiş girdi yüzeyi) ──
   * Üçü de ŞEMATRONDAN GEÇER; yalnız XSD reddeder. Girdi yüzeyi eklenmeden
   * önce bu alanlar VERİLEMİYORDU, dolayısıyla kural kapatılamıyordu. */
  {
    description: '(XSD 1..1) turistin soyadı silinince `cac:Person` geçersiz kalır',
    input: mutate((i) => { if (i.buyerCustomer) delete i.buyerCustomer.familyName; }),
    expectedErrors: [{ code: 'XSD_CARDINALITY', path: 'buyerCustomer.party' }],
  },
  {
    description: '(XSD 1..1) pasaport tarihi silinince `IdentityDocumentReference` geçersiz kalır',
    input: mutate((i) => { if (i.buyerCustomer) delete i.buyerCustomer.passportIssueDate; }),
    expectedErrors: [{ code: 'XSD_CARDINALITY', path: 'buyerCustomer.party.passportId' }],
  },
  {
    description: '(XSD 1..1) aracı kurumun ili silinince `TaxRepresentativeParty` adressiz kalır',
    input: mutate((i) => { if (i.taxRepresentativeParty) delete i.taxRepresentativeParty.city; }),
    expectedErrors: [{ code: 'XSD_CARDINALITY', path: 'taxRepresentativeParty.postalAddress' }],
  },
];

export default invalidCases;
