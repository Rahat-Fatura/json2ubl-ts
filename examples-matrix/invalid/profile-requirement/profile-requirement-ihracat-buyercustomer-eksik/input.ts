import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000111',
  uuid: 'b1000111-0001-4000-8001-000000000111',
  datetime: '2026-04-24T10:00:00',
  profile: 'IHRACAT',
  type: 'ISTISNA',
  currencyCode: 'USD',
  exchangeRate: 32.5,
  kdvExemptionCode: '301',
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
      name: 'İhracat',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
};

export default input;
