import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000941',
  uuid: 'a1000941-0001-4000-8001-000000000941',
  datetime: '2026-04-24T10:00:00',
  profile: 'EARSIVFATURA',
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
      name: 'Gıda',
      quantity: 5,
      price: 50,
      unitCode: 'Kg',
      kdvPercent: 10,
    },
    {
      name: 'Elektronik',
      quantity: 1,
      price: 2000,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
