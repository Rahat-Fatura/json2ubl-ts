import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000083',
  uuid: 'a1000083-0001-4000-8001-000000000083',
  datetime: '2026-04-24T10:00:00',
  profile: 'IDIS',
  type: 'TEVKIFAT',
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
        value: 'SE-0000083',
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
      name: 'IDIS tevkifat',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode: '603',
      additionalItemIdentifications: [
        {
          schemeId: 'ETIKETNO',
          value: 'ID0000083',
        },
      ],
    },
  ],
};

export default input;
