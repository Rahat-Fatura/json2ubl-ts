import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000303',
  uuid: 'b1000303-0001-4000-8001-000000000303',
  datetime: '2026-04-24T10:00:00',
  profile: 'KAMU',
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
    taxNumber: '1460415308',
    name: 'T.C. Kamu Kurumu',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Test satır',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
  buyerCustomer: {
    name: 'Matrix Kamu Aracı Kurumu',
    taxNumber: '',
    address: 'Mevlana Bulvarı No:233',
    district: 'Çankaya',
    city: 'Ankara',
    country: 'Türkiye',
    identifications: [
      {
        schemeId: 'MUSTERINO',
        value: 'KAMU-MUSTERI-2026-MTX',
      },
    ],
  },
};

export default input;
