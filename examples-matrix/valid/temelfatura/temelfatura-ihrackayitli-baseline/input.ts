import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000009',
  uuid: 'a1000009-0001-4000-8001-000000000009',
  datetime: '2026-04-24T10:00:00',
  profile: 'TEMELFATURA',
  type: 'IHRACKAYITLI',
  currencyCode: 'TRY',
  kdvExemptionCode: '702',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Test İhracatçı A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Test Aracı İhracat A.Ş.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'İhraç kayıtlı tekstil ürünü',
      quantity: 10,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 0,
      delivery: {
        gtipNo: '620342000010',
        alicidibsatirkod: '12345678901',
        deliveryAddress: {
          address: 'İhracat Serbest Bölgesi',
          district: 'Ambarlı',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  ],
};

export default input;
