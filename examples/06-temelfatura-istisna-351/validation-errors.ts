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
    description: '(M5 forbidden) 351 + type=ISTISNA (yasak — ISTISNA grubunda 351 olmaz)',
    input: mutate((i) => {
      i.type = 'ISTISNA';
      i.lines[0].kdvPercent = 0;
    }),
    expectedErrors: [
      { code: 'FORBIDDEN_EXEMPTION_FOR_TYPE', messageIncludes: '351' },
      { code: 'FORBIDDEN_EXEMPTION_FOR_TYPE', messageIncludes: 'ISTISNA' },
      { code: 'INVALID_VALUE', messageIncludes: 'istisnaTaxExemptionReasonCodeType' },
    ],
  },
  {
    description: '(M5 forbidden) 351 + type=IADE (yasak, IADE grubunda)',
    input: mutate((i) => {
      i.type = 'IADE';
      i.billingReference = { id: 'EXA2026000000001', issueDate: '2026-04-23' };
    }),
    expectedErrors: [{ code: 'FORBIDDEN_EXEMPTION_FOR_TYPE', messageIncludes: 'IADE' }],
  },
  {
    description: '(eksik zorunlu) Alıcı adı boş',
    input: mutate((i) => {
      i.customer.name = '';
    }),
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'customer.name' }],
  },
  {
    description: '(not-caught) 351 + tüm satırlar KDV>0 (requiresZeroKdvLine bu path\'te tetiklenmiyor, 8c)',
    input: mutate((i) => {
      i.lines[0].kdvPercent = 20;
    }),
    notCaughtYet: 'kdvExemptionCode=351 + kdvPercent>0 için validator tek-satırlı durumda tetiklemiyor. B-NEW-04 (8c).',
  },
];

export default invalidCases;
