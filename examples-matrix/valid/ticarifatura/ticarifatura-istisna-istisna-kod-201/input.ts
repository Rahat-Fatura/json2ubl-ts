import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000924',
  uuid: 'a1000924-0001-4000-8001-000000000924',
  datetime: '2026-04-24T10:00:00',
  profile: 'TICARIFATURA',
  type: 'ISTISNA',
  currencyCode: 'TRY',
  kdvExemptionCode: '201',
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
      name: 'Diplomatik hizmet',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
};

export default input;
