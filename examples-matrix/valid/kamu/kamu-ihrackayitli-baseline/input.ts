import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000034',
  uuid: 'a1000034-0001-4000-8001-000000000034',
  datetime: '2026-04-24T10:00:00',
  profile: 'KAMU',
  type: 'IHRACKAYITLI',
  currencyCode: 'TRY',
  kdvExemptionCode: '702',
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
      name: 'İhraç kayıtlı kamu tedarik',
      quantity: 10,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 0,
      delivery: {
        gtipNo: '620342000010',
        alicidibsatirkod: '12345678901',
        deliveryAddress: {
          address: 'Liman',
          district: 'Ambarlı',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  ],
};

export default input;
