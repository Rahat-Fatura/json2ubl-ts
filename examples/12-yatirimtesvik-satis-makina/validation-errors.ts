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
    description: '(eksik zorunlu) ytbNo eksik',
    input: mutate((i) => { delete i.ytbNo; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    description: '(format bozuk) ytbNo 5 haneli — 6 zorunlu',
    input: mutate((i) => { i.ytbNo = '12345'; }),
    expectedErrors: [{ code: 'INVALID_FORMAT' }],
  },
  {
    description: '(B-08) Kod 01 Makine için productTraceId/serialId eksik',
    input: mutate((i) => {
      delete i.lines[0].productTraceId;
      delete i.lines[0].serialId;
    }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'YATIRIMTESVIK' }],
  },
  {
    description: '(B-08) Kod 01 için brand/model eksik',
    input: mutate((i) => {
      delete i.lines[0].brand;
      delete i.lines[0].model;
    }),
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT' }],
  },
];

export default invalidCases;
