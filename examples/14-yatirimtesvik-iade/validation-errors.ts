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
    description: '(type requirement) IADE için billingReference yok',
    input: mutate((i) => { delete i.billingReference; }),
    expectedErrors: [{ code: 'TYPE_REQUIREMENT', messageIncludes: 'BillingReference' }],
  },
  {
    description: '(type requirement) billingReference.id 10 karakter — 16 zorunlu',
    input: mutate((i) => { i.billingReference = { id: 'ABC1234567', issueDate: '2026-04-23' }; }),
    expectedErrors: [{ code: 'TYPE_REQUIREMENT' }],
  },
  {
    description: '(eksik zorunlu) ytbNo eksik (YTB profili gereği)',
    input: mutate((i) => { delete i.ytbNo; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    description: '(B-08 istisnası test) IADE grubunda kdvPercent=0 (normalde YTB reddeder, IADE muaf)',
    input: mutate((i) => { i.lines[0].kdvPercent = 0; }),
    notCaughtYet: 'Bu case hata vermemeli — B-08 istisnası test edilir. Build başarılı olmalı (regression guard).',
  },
];

export default invalidCases;
