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
    description: '(profile requirement) KAMU + buyerCustomer eksik',
    input: mutate((i) => { delete i.buyerCustomer; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', path: 'buyerCustomer', messageIncludes: 'KAMU' }],
  },
  {
    description: '(profile requirement) KAMU + paymentMeans eksik',
    input: mutate((i) => { delete i.paymentMeans; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT' }],
  },
  {
    description: '(format bozuk) IBAN TR ile başlamıyor',
    input: mutate((i) => {
      if (i.paymentMeans) i.paymentMeans.accountNumber = 'DE33000610051978645784';
    }),
    expectedErrors: [{ code: 'INVALID_FORMAT' }],
  },
  {
    description: '(format bozuk) IBAN uzunluk yanlış — 20 karakter',
    input: mutate((i) => {
      if (i.paymentMeans) i.paymentMeans.accountNumber = 'TR33000610051978645';
    }),
    expectedErrors: [{ code: 'INVALID_FORMAT' }],
  },
];

export default invalidCases;
