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
    description: '(format bozuk) ytbNo alfabetik — "ABC456"',
    input: mutate((i) => { i.ytbNo = 'ABC456'; }),
    expectedErrors: [{ code: 'INVALID_FORMAT' }],
  },
  {
    description: '(not-caught) itemClassificationCode geçersiz — "99" (whitelist 01-04)',
    input: mutate((i) => { i.lines[0].itemClassificationCode = '99'; }),
    notCaughtYet: 'itemClassificationCode enum whitelist runtime kontrolü yok.',
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn' }],
  },
  {
    description: '(cross-check) issueDate gelecek tarih — B-65',
    input: mutate((i) => { i.datetime = '2099-01-01T00:00:00'; }),
    expectedErrors: [{ code: 'INVALID_VALUE', path: 'issueDate' }],
  },
];

export default invalidCases;
