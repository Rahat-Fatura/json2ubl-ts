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
    description: '(pre-check) withholdingTaxCode withholding-config dışı — "999"',
    input: mutate((i) => {
      i.lines[0].withholdingTaxCode = '999';
    }),
    expectedErrorMessage: 'Geçersiz tevkifat kodu: 999',
    validationLevel: 'basic',
  },
  {
    description: '(pre-check) Kod 650 dinamik oran için withholdingTaxPercent eksik',
    input: mutate((i) => {
      i.lines[0].withholdingTaxCode = '650';
      delete i.lines[0].withholdingTaxPercent;
    }),
    expectedErrorMessage: "Tevkifat kodu 650 için 'withholdingTaxPercent' zorunlu",
    validationLevel: 'basic',
  },
  {
    description: '(eksik zorunlu) Satır adı boş + B-81 yan-etki',
    input: mutate((i) => {
      i.lines[0].name = '';
    }),
    expectedErrors: [
      { code: 'MISSING_FIELD', path: 'lines[0].item.name' },
      { code: 'EXEMPTION_REQUIRES_ZERO_KDV_LINE' },
    ],
  },
  {
    description: '(format bozuk) Satıcı VKN 12 haneli — 10 olmalı + B-81 yan-etki',
    input: mutate((i) => {
      i.sender.taxNumber = '123456789012';
    }),
    expectedErrors: [
      { code: 'INVALID_FORMAT', path: 'supplier.vknTckn' },
      { code: 'EXEMPTION_REQUIRES_ZERO_KDV_LINE' },
    ],
  },
];

export default invalidCases;
