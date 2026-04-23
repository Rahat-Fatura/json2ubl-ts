/**
 * 4 yanlış input örneği + beklenen validator davranışı.
 *
 * `expectedErrors` → UblBuildError.errors (çoğu case)
 * `expectedErrorMessage` → non-UblBuildError (pre-check, örn. withholding-config)
 * `notCaughtYet` → kütüphanenin şu an yakalamadığı durum (Sprint 8c hotfix); build başarılı olur
 */

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
  /** Bazı case'ler strict dışı valid level gerektirir */
  validationLevel?: 'basic' | 'strict' | 'none';
}

function mutate(mutator: (input: SimpleInvoiceInput) => void): SimpleInvoiceInput {
  const clone = structuredClone(baseInput);
  mutator(clone);
  return clone;
}

export const invalidCases: InvalidCase[] = [
  {
    description: '(eksik zorunlu) Satıcı VKN/TCKN boş',
    input: mutate((i) => {
      i.sender.taxNumber = '';
    }),
    expectedErrors: [
      { code: 'MISSING_FIELD', path: 'supplier.vknTckn', messageIncludes: 'VKN veya TCKN zorunludur' },
    ],
  },
  {
    description: '(format bozuk) Satıcı VKN 10 haneli değil — 3 haneli girilmiş',
    input: mutate((i) => {
      i.sender.taxNumber = '123';
    }),
    expectedErrors: [
      { code: 'INVALID_FORMAT', path: 'supplier.vknTckn', messageIncludes: 'Geçersiz format' },
    ],
  },
  {
    description: '(business rule) Fatura en az 1 satır içermeli — lines boş',
    input: mutate((i) => {
      i.lines = [];
    }),
    expectedErrors: [
      { code: 'MISSING_FIELD', path: 'taxTotals[0].taxSubtotals' },
      { code: 'MISSING_FIELD', path: 'lines' },
    ],
  },
  {
    description: '(cross-check) Geçersiz currencyCode — "XYZ"',
    input: mutate((i) => {
      i.currencyCode = 'XYZ';
    }),
    expectedErrors: [
      { code: 'INVALID_VALUE', path: 'currencyCode' },
      { code: 'MISSING_FIELD', path: 'exchangeRate' },
    ],
  },
];

export default invalidCases;
