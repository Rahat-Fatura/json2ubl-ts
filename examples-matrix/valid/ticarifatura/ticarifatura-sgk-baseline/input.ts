import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000025',
  uuid: 'a1000025-0001-4000-8001-000000000025',
  datetime: '2026-04-24T10:00:00',
  profile: 'TICARIFATURA',
  type: 'SGK',
  currencyCode: 'TRY',
  sgk: {
    type: 'SAGLIK_OPT',
    documentNo: 'SGK-OPT-MTX025',
    companyName: 'Matrix Optik',
    companyCode: 'SGK-OPT-MTX',
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
      name: 'Gözlük çerçevesi',
      quantity: 1,
      price: 500,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
