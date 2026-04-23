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
    description: '(eksik zorunlu) eArchiveInfo eksik',
    input: mutate((i) => { delete i.eArchiveInfo; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    description: '(not-caught) eArchiveInfo.sendType geçersiz — "DIGITAL"',
    input: mutate((i) => { if (i.eArchiveInfo) (i.eArchiveInfo.sendType as unknown as string) = 'DIGITAL'; }),
    notCaughtYet: 'sendType enum whitelist kontrolü eksik.',
  },
  {
    description: '(eksik zorunlu) Satıcı VKN boş',
    input: mutate((i) => { i.sender.taxNumber = ''; }),
    expectedErrors: [{ code: 'MISSING_FIELD' }],
  },
  {
    description: '(format bozuk) Customer TCKN 10 haneli',
    input: mutate((i) => { i.customer.taxNumber = '1234567890'; }),
    notCaughtYet: '10 hane VKN olarak kabul edilir, EARSIVFATURA için TCKN zorunluluğu yok (gerçek kişi/şirket ayrımı yapılmıyor).',
  },
];

export default invalidCases;
