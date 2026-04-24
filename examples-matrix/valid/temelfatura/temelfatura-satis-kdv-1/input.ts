import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000912',
  uuid: 'a1000912-0001-4000-8001-000000000912',
  datetime: '2026-04-24T10:00:00',
  profile: 'TEMELFATURA',
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
      name: 'Ekmek',
      quantity: 100,
      price: 5,
      unitCode: 'Adet',
      kdvPercent: 1,
    },
  ],
};

export default input;
