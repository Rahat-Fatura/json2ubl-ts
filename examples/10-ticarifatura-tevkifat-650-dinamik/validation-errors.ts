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
    description: '(pre-check) Kod 650 için withholdingTaxPercent eksik',
    input: mutate((i) => { delete i.lines[0].withholdingTaxPercent; }),
    expectedErrorMessage: "Tevkifat kodu 650 için 'withholdingTaxPercent' zorunlu",
  },
  {
    description: '(pre-check) withholdingTaxCode tanımsız — "999"',
    input: mutate((i) => { i.lines[0].withholdingTaxCode = '999'; }),
    expectedErrorMessage: 'Geçersiz tevkifat kodu: 999',
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn' }],
  },
  {
    description: '(not-caught) 650 + percent=150 (sınır dışı, kütüphane yakalamıyor)',
    input: mutate((i) => { i.lines[0].withholdingTaxPercent = 150; }),
    notCaughtYet: 'withholdingTaxPercent 0-100 aralık kontrolü yok (B-NEW-03 akrabası).',
  },
];

export default invalidCases;
