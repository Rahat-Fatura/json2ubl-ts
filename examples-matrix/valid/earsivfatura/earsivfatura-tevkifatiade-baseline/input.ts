import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000904',
  uuid: 'a1000904-0001-4000-8001-000000000904',
  datetime: '2026-04-24T10:00:00',
  profile: 'EARSIVFATURA',
  type: 'TEVKIFATIADE',
  currencyCode: 'TRY',
  billingReference: {
    id: 'MTX2026000000042',
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
      name: 'E-arşiv iade — tevkifatlı',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode: '603',
    },
  ],
};

export default input;
