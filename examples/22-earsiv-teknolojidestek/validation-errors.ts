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
    description: '(type requirement) TEKNOLOJIDESTEK + VKN\'li alıcı (TCKN zorunlu)',
    input: mutate((i) => { i.customer.taxNumber = '9876543210'; i.customer.taxOffice = 'Kadıköy'; }),
    expectedErrors: [{ code: 'TYPE_REQUIREMENT', messageIncludes: 'TEKNOLOJIDESTEK' }],
  },
  {
    description: '(eksik zorunlu) IMEI yok',
    input: mutate((i) => {
      if (i.lines[0].additionalItemIdentifications) {
        i.lines[0].additionalItemIdentifications = i.lines[0].additionalItemIdentifications.filter(
          (id) => id.schemeId !== 'TELEFON',
        );
      }
    }),
    notCaughtYet: 'TEKNOLOJIDESTEK satırda IMEI (TELEFON schemeId) zorunluluğu eksik.',
  },
  {
    description: '(eksik zorunlu) eArchiveInfo eksik',
    input: mutate((i) => { delete i.eArchiveInfo; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
];

export default invalidCases;
