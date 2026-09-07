import type { SimpleInvoiceInput } from '../../src';
import baseInput from './input';

export interface ExpectedValidationError { code: string; path?: string; messageIncludes?: string; }
export interface InvalidCase {
  description: string;
  input: SimpleInvoiceInput;
  expectedErrors?: ExpectedValidationError[];
  expectedErrorMessage?: string;
  notCaughtYet?: string;
  validationLevel?: 'basic' | 'strict' | 'none';
}

function mutate(m: (i: SimpleInvoiceInput) => void): SimpleInvoiceInput {
  const c = structuredClone(baseInput); m(c); return c;
}

export const invalidCases: InvalidCase[] = [
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    // Şematron `IlacTibbiCihazAdditionalItemIdentificationCheck`; canlı ölçümde
    // (xslt-service :8081, type=efatura) kimliksiz belge TAM 1 ihlal veriyor.
    // strict katmanı bunu zaten yakalıyordu; kural artık InvoiceSession
    // (portal/UI) akışında da görünür — bkz. ilac-tibbicihaz-validator.
    description: '(profile requirement) ILAC_TIBBICIHAZ + kalem kimliği eksik',
    input: mutate((i) => { delete i.lines[0].additionalItemIdentifications; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT' }],
  },
  {
    description: '(format bozuk) KDV oranı negatif',
    input: mutate((i) => { i.lines[0].kdvPercent = -1; }),
    notCaughtYet: 'B-NEW-01: kdvPercent sınır kontrolü yok.',
  },
];

export default invalidCases;
