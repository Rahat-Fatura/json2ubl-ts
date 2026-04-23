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
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn' }],
  },
  {
    description: '(format bozuk) Satıcı VKN 12 haneli — 10/11 olmalı',
    input: mutate((i) => { i.sender.taxNumber = '123456789012'; }),
    expectedErrors: [{ code: 'INVALID_FORMAT', path: 'supplier.vknTckn' }],
  },
  {
    description: '(business rule) Satırlar boş',
    input: mutate((i) => { i.lines = []; }),
    expectedErrors: [
      { code: 'MISSING_FIELD', path: 'taxTotals[0].taxSubtotals' },
      { code: 'MISSING_FIELD', path: 'lines' },
    ],
  },
  {
    description: '(not-caught) TICARIFATURA + IADE kombinasyonu (M1 forbidden, ama simple-input basic\'te tetiklemiyor)',
    input: mutate((i) => { i.type = 'IADE'; i.billingReference = { id: 'EXA2026000000001', issueDate: '2026-04-23' }; }),
    notCaughtYet: 'TICARIFATURA profile + IADE tipi M1 matrisinde yasak; simple-input validator tetiklemiyor (B-NEW-05 akrabası).',
  },
];

export default invalidCases;
