import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000909',
  uuid: 'a1000909-0001-4000-8001-000000000909',
  datetime: '2026-04-24T10:00:00',
  profile: 'TEMELFATURA',
  type: 'TEVKIFATIADE',
  currencyCode: 'TRY',
  billingReference: {
    id: 'MTX2026000000015',
    issueDate: '2026-04-24',
  },
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Test Satıcı A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Test Alıcı Ltd.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Dinamik tevkifat iade — %50',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode: '650',
      withholdingTaxPercent: 50,
    },
  ],
};

export default input;
