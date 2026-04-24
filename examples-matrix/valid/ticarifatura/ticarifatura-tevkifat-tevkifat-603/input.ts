import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000923',
  uuid: 'a1000923-0001-4000-8001-000000000923',
  datetime: '2026-04-24T10:00:00',
  profile: 'TICARIFATURA',
  type: 'TEVKIFAT',
  currencyCode: 'TRY',
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
      name: 'Bakım-onarım hizmeti',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode: '603',
    },
  ],
};

export default input;
