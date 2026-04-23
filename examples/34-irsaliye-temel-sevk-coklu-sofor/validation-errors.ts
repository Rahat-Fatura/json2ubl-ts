import type { DespatchInput } from '../../src';
import baseInput from './input';

export interface ExpectedValidationError { code: string; path?: string; messageIncludes?: string; }
export interface InvalidCase {
  description: string;
  input: DespatchInput;
  expectedErrors?: ExpectedValidationError[];
  expectedErrorMessage?: string;
  notCaughtYet?: string;
  validationLevel?: 'basic' | 'strict' | 'none';
}

function mutate(m: (i: DespatchInput) => void): DespatchInput {
  const c = structuredClone(baseInput); m(c); return c;
}

export const invalidCases: InvalidCase[] = [
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.supplier.vknTckn = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    description: '(business rule) Satırlar boş',
    input: mutate((i) => { i.lines = []; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
];

export default invalidCases;
