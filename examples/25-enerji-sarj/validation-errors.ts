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
    description: '(business rule) SARJ tipi + KDV=0 (normalde KDV olmalı)',
    input: mutate((i) => { i.lines[0].kdvPercent = 0; }),
    notCaughtYet: 'SARJ tipinde KDV>0 zorunluluğu simple-input\'ta eksik.',
  },
  {
    description: '(business rule) Quantity 0',
    input: mutate((i) => { i.lines[0].quantity = 0; }),
    notCaughtYet: 'B-NEW-02: quantity>0 kontrolü yok.',
  },
];

export default invalidCases;
