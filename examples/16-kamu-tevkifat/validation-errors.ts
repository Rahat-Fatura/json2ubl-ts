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
    description: '(pre-check) withholdingTaxCode tanımsız — "777"',
    input: mutate((i) => { i.lines[0].withholdingTaxCode = '777'; }),
    expectedErrorMessage: 'Geçersiz tevkifat kodu: 777',
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn' }],
  },
  {
    description: '(profile requirement) KAMU + buyerCustomer eksik',
    input: mutate((i) => { delete i.buyerCustomer; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', path: 'buyerCustomer' }],
  },
];

export default invalidCases;
