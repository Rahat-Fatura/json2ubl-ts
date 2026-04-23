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
    description: '(format bozuk) Alıcı VKN 8 haneli — 10 hane olmalı',
    input: mutate((i) => {
      i.customer.taxNumber = '12345678';
    }),
    expectedErrors: [
      { code: 'INVALID_FORMAT', path: 'customer.vknTckn', messageIncludes: 'VKN 10 hane' },
    ],
  },
  {
    description: '(cross-check) IssueDate aralık dışı — 2000-01-01 (B-65)',
    input: mutate((i) => {
      i.datetime = '2000-01-01T00:00:00';
    }),
    expectedErrors: [
      { code: 'INVALID_VALUE', path: 'issueDate', messageIncludes: '2005-01-01' },
    ],
  },
  {
    description: '(not-caught) Satır quantity=0 (kütüphane yakalamıyor, 8c hotfix)',
    input: mutate((i) => {
      i.lines[0].quantity = 0;
    }),
    notCaughtYet: 'SimpleLineInput.quantity için alt sınır kontrolü yok. B-NEW-02 (8c).',
  },
  {
    description: '(not-caught) Stopaj oranı %150 (sınır kontrolü yok, 8c)',
    input: mutate((i) => {
      i.lines[0].taxes = [{ code: '0011', percent: 150 }];
    }),
    notCaughtYet: 'SimpleLineTaxInput.percent için üst sınır kontrolü yok. B-NEW-03 (8c).',
  },
];

export default invalidCases;
