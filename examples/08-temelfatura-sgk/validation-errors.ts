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
    description: '(not-caught) type=SGK ama sgk obje eksik',
    input: mutate((i) => {
      delete i.sgk;
    }),
    notCaughtYet: 'simple-input type=SGK için sgk objesi zorunluluğunu doğrulamıyor. B-NEW-08 (8c).',
  },
  {
    description: '(not-caught) sgk.type geçersiz — "FOOBAR"',
    input: mutate((i) => {
      if (i.sgk) i.sgk.type = 'FOOBAR';
    }),
    notCaughtYet: 'sgk.type whitelist runtime kontrolü eksik. B-NEW-09 (8c).',
  },
  {
    description: '(not-caught) sgk.documentNo boş',
    input: mutate((i) => {
      if (i.sgk) i.sgk.documentNo = '';
    }),
    notCaughtYet: 'sgk.documentNo boş kontrolü eksik. B-NEW-10 (8c).',
  },
  {
    description: '(eksik zorunlu) Satıcı adı boş — SGK de genel validator\'dan geçer',
    input: mutate((i) => {
      i.sender.name = '';
    }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.name' }],
  },
];

export default invalidCases;
