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
    description: '(not-caught) ILAC barkodu eksik',
    input: mutate((i) => { delete i.lines[0].additionalItemIdentifications; }),
    notCaughtYet: 'ILAC_TIBBICIHAZ profili satırda ILAC/TIBBICIHAZ barkodu zorunluluğu simple-input\'ta eksik.',
  },
  {
    description: '(format bozuk) KDV oranı negatif',
    input: mutate((i) => { i.lines[0].kdvPercent = -1; }),
    notCaughtYet: 'B-NEW-01: kdvPercent sınır kontrolü yok.',
  },
];

export default invalidCases;
