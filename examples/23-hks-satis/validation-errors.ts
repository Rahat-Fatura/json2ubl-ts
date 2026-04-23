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
    description: '(profile requirement) HKS + KUNYENO eksik',
    input: mutate((i) => { delete i.lines[0].additionalItemIdentifications; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'KUNYENO' }],
  },
  {
    description: '(format bozuk) KUNYENO 10 karakter — 19 olmalı',
    input: mutate((i) => {
      if (i.lines[0].additionalItemIdentifications) {
        i.lines[0].additionalItemIdentifications[0].value = 'SHORT-KUN';
      }
    }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: '19' }],
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
];

export default invalidCases;
