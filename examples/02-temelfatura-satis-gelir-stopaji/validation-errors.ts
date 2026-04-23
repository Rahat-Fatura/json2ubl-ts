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
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => {
      i.sender.taxNumber = '';
    }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn' }],
  },
  {
    description: '(business rule) Satırlar boş',
    input: mutate((i) => {
      i.lines = [];
    }),
    expectedErrors: [
      { code: 'MISSING_FIELD', path: 'taxTotals[0].taxSubtotals' },
      { code: 'MISSING_FIELD', path: 'lines' },
    ],
  },
  {
    description: '(pre-check) Stopaj kodu tax-config dışı — "ABC"',
    input: mutate((i) => {
      i.lines[0].taxes = [{ code: 'ABC', percent: 23 }];
    }),
    expectedErrorMessage: 'Geçersiz vergi kodu: ABC',
  },
  {
    description: '(not-caught) Satır KDV oranı negatif — -10 (kütüphane yakalamıyor, 8c hotfix)',
    input: mutate((i) => {
      i.lines[0].kdvPercent = -10;
    }),
    notCaughtYet: 'SimpleLineInput.kdvPercent için alt sınır runtime kontrolü yok. B-NEW-01 (8c).',
  },
];

export default invalidCases;
