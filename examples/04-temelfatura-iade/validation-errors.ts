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
    description: '(type requirement) IADE grubu için billingReference yok',
    input: mutate((i) => {
      delete i.billingReference;
    }),
    expectedErrors: [
      {
        code: 'TYPE_REQUIREMENT',
        path: 'billingReferences',
        messageIncludes: 'BillingReference',
      },
    ],
  },
  {
    description: '(type requirement) billingReference.id 10 karakter — Schematron 16 zorunlu',
    input: mutate((i) => {
      i.billingReference = { id: 'ABC1234567', issueDate: '2026-04-23' };
    }),
    expectedErrors: [
      {
        code: 'TYPE_REQUIREMENT',
        path: 'billingReferences[0].invoiceDocumentReference.id',
        messageIncludes: '16 karakter',
      },
    ],
  },
  {
    description: '(format bozuk) billingReference.issueDate formatı yanlış — "23/04/2026"',
    input: mutate((i) => {
      i.billingReference = { id: 'EXA2026000000001', issueDate: '23/04/2026' };
    }),
    expectedErrors: [
      {
        code: 'INVALID_FORMAT',
        path: 'billingReferences[0].invoiceDocumentReference.issueDate',
        messageIncludes: 'YYYY-MM-DD',
      },
    ],
  },
  {
    description: '(eksik zorunlu) Satıcı adı boş',
    input: mutate((i) => {
      i.sender.name = '';
    }),
    expectedErrors: [
      { code: 'MISSING_FIELD', path: 'supplier.name', messageIncludes: 'PartyName zorunludur' },
    ],
  },
];

export default invalidCases;
