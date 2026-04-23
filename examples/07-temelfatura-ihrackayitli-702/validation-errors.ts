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
    description: '(B-07) GTİP 8 haneli — 12 hane zorunlu',
    input: mutate((i) => {
      if (i.lines[0].delivery) i.lines[0].delivery.gtipNo = '12345678';
    }),
    expectedErrors: [
      { code: 'IHRACKAYITLI_702_REQUIRES_GTIP', messageIncludes: '12 hane' },
      { code: 'IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD' },
    ],
    validationLevel: 'strict',
  },
  {
    description: '(not-caught) 702 + type=SATIS (M5 forbidden ama basic\'te tetiklenmez)',
    input: mutate((i) => {
      i.type = 'SATIS';
    }),
    notCaughtYet: 'simple-input basic modda type=SATIS + 702 kombinasyonunu forbidden cross-check\'e yollamıyor. B-NEW-05 (8c).',
  },
  {
    description: '(not-caught) type=IHRACKAYITLI ama kdvExemptionCode yok',
    input: mutate((i) => {
      delete i.kdvExemptionCode;
    }),
    notCaughtYet: 'IHRACKAYITLI tipi için kdvExemptionCode zorunluluğu simple-input tarafında eksik. B-NEW-06 (8c).',
  },
  {
    description: '(not-caught) 702 satırında KDV>0 (cross-check basic\'te tetiklenmez)',
    input: mutate((i) => {
      i.lines[0].kdvPercent = 20;
    }),
    notCaughtYet: 'IHRACKAYITLI + 702 satırında KDV=0 zorunluluğu basic\'te tetiklenmiyor. B-NEW-07 (8c).',
  },
];

export default invalidCases;
