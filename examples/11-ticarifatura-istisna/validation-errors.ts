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
    description: '(eksik zorunlu) type=ISTISNA ama kdvExemptionCode yok',
    input: mutate((i) => { delete i.kdvExemptionCode; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    description: '(format bozuk) Alıcı VKN 11 haneli değil TCKN sayılır',
    input: mutate((i) => { i.customer.taxNumber = '12345678901'; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'customer.taxOffice' }],
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn' }],
  },
  {
    description: '(not-caught) ISTISNA + kdvPercent>0 (kütüphane tek satırda yakalamıyor)',
    input: mutate((i) => { i.lines[0].kdvPercent = 20; }),
    notCaughtYet: 'ISTISNA tipinde tek satır kdvPercent>0 cross-check tetiklemiyor (B-NEW-04 akrabası).',
  },
];

export default invalidCases;
