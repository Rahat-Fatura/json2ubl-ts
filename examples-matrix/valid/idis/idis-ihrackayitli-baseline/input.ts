import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000084',
  uuid: 'a1000084-0001-4000-8001-000000000084',
  datetime: '2026-04-24T10:00:00',
  profile: 'IDIS',
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
    identifications: [
      {
        schemeId: 'SEVKIYATNO',
        value: 'SE-0000084',
      },
    ],
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
      name: 'IDIS ihraç',
      quantity: 10,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 0,
      additionalItemIdentifications: [
        {
          schemeId: 'ETIKETNO',
          value: 'ID0000084',
        },
      ],
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
