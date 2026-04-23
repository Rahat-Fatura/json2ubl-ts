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
    description: '(profile requirement) IHRACAT + buyerCustomer eksik',
    input: mutate((i) => { delete i.buyerCustomer; }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', path: 'buyerCustomer' }],
  },
  {
    description: '(eksik zorunlu) USD + exchangeRate yok',
    input: mutate((i) => { delete i.exchangeRate; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'exchangeRate' }],
  },
  {
    description: '(business rule) IHRACAT + KDV>0',
    input: mutate((i) => { i.lines[0].kdvPercent = 20; }),
    notCaughtYet: 'IHRACAT profili satır KDV=0 zorunluluğu simple-input\'ta eksik (B-NEW-13 akrabası).',
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn' }],
  },
];

export default invalidCases;
