import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000030',
  uuid: 'a1000030-0001-4000-8001-000000000030',
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
    name: 'T.C. Kamu Alıcı Kurumu',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  buyerCustomer: {
    name: 'Matrix Kamu Aracı Kurumu',
    taxNumber: '3333333333',
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
  paymentMeans: {
    meansCode: '42',
    accountNumber: 'TR330006100519786457841326',
    dueDate: '2026-05-24',
  },
  lines: [
    {
      name: 'Kamu tedarik',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
