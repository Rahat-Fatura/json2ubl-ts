import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000971',
  uuid: 'a1000971-0001-4000-8001-000000000971',
  datetime: '2026-04-24T10:00:00',
  profile: 'IDIS',
  type: 'SATIS',
  currencyCode: 'TRY',
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
        value: 'SE-0000971',
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
      name: 'Ürün A',
      quantity: 1,
      price: 500,
      unitCode: 'Adet',
      kdvPercent: 20,
      additionalItemIdentifications: [
        {
          schemeId: 'ETIKETNO',
          value: 'AA0000971',
        },
      ],
    },
    {
      name: 'Ürün B',
      quantity: 2,
      price: 300,
      unitCode: 'Adet',
      kdvPercent: 20,
      additionalItemIdentifications: [
        {
          schemeId: 'ETIKETNO',
          value: 'BB0000971',
        },
      ],
    },
    {
      name: 'Ürün C',
      quantity: 5,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 20,
      additionalItemIdentifications: [
        {
          schemeId: 'ETIKETNO',
          value: 'CC0000971',
        },
      ],
    },
  ],
};

export default input;
