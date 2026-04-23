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
    description: '(profile requirement) KAMU + paymentMeans eksik',
    input: mutate((i) => { delete i.paymentMeans; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT' }],
  },
  {
    description: '(eksik zorunlu) kdvExemptionCode 702 eksik (IHRACKAYITLI gereği)',
    input: mutate((i) => { delete i.kdvExemptionCode; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    description: '(profile requirement) buyerCustomer eksik',
    input: mutate((i) => { delete i.buyerCustomer; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', path: 'buyerCustomer' }],
  },
  {
    description: '(not-caught) 702 satırında KDV>0 (basic modda tetiklenmiyor)',
    input: mutate((i) => { i.lines[0].kdvPercent = 20; }),
    notCaughtYet: 'IHRACKAYITLI 702 satır KDV>0 basic mod\'da tetiklenmiyor (B-NEW-07).',
  },
];

export default invalidCases;
