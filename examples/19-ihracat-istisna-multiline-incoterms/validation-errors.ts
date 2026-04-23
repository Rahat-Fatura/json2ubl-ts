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
    description: '(eksik zorunlu) exchangeRate eksik (USD currencyCode için)',
    input: mutate((i) => { delete i.exchangeRate; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'exchangeRate' }],
  },
  {
    description: '(profile requirement) buyerCustomer eksik',
    input: mutate((i) => { delete i.buyerCustomer; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', path: 'buyerCustomer' }],
  },
  {
    description: '(not-caught) Satır delivery eksik (2. satır)',
    input: mutate((i) => { delete i.lines[1].delivery; }),
    notCaughtYet: 'IHRACAT satır delivery zorunluluğu simple-input\'ta her satırda kontrolü eksik.',
  },
  {
    description: '(format bozuk) GTİP 10 haneli — 12 olmalı',
    input: mutate((i) => {
      if (i.lines[0].delivery) i.lines[0].delivery.gtipNo = '6203420000';
    }),
    notCaughtYet: 'IHRACAT GTIP 12-hane kontrolü simple-input delivery path\'inde eksik.',
  },
];

export default invalidCases;
