import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000921',
  uuid: 'a1000921-0001-4000-8001-000000000921',
  datetime: '2026-04-24T10:00:00',
  profile: 'TICARIFATURA',
  type: 'SATIS',
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
      name: 'Gıda ürünü',
      quantity: 10,
      price: 100,
      unitCode: 'Kg',
      kdvPercent: 10,
    },
  ],
};

export default input;
