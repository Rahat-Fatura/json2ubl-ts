import type { SimpleInvoiceInput } from '../../src';
import baseInput from './input';

export interface ExpectedValidationError { code: string; path?: string; messageIncludes?: string; }
export interface InvalidCase {
  description: string;
  input: SimpleInvoiceInput;
  expectedErrors?: ExpectedValidationError[];
  expectedErrorMessage?: string;
  notCaughtYet?: string;
  validationLevel?: 'basic' | 'strict' | 'none';
}

function mutate(m: (i: SimpleInvoiceInput) => void): SimpleInvoiceInput {
  const c = structuredClone(baseInput); m(c); return c;
}

export const invalidCases: InvalidCase[] = [
  {
    description: '(profile requirement) SEVKIYATNO sender identifications\'tan eksik',
    input: mutate((i) => { delete i.sender.identifications; }),
    notCaughtYet: 'IDIS profili sender SEVKIYATNO zorunluluğu simple-input basic modda tetiklenmiyor.',
  },
  {
    description: '(format bozuk) ETIKETNO format regex reject',
    input: mutate((i) => {
      if (i.lines[0].additionalItemIdentifications) {
        i.lines[0].additionalItemIdentifications[0].value = 'INVALID';
      }
    }),
    expectedErrors: [{ code: 'INVALID_FORMAT', messageIncludes: 'ETIKETNO' }],
    validationLevel: 'strict',
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
];

export default invalidCases;
