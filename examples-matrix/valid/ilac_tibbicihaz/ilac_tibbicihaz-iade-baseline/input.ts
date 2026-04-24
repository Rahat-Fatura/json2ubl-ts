import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000073',
  uuid: 'a1000073-0001-4000-8001-000000000073',
  datetime: '2026-04-24T10:00:00',
  profile: 'ILAC_TIBBICIHAZ',
  type: 'IADE',
  currencyCode: 'TRY',
  billingReference: {
    id: 'MTX2026000000070',
    issueDate: '2026-04-24',
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
      name: 'İade — ilaç',
      quantity: 5,
      price: 50,
      unitCode: 'Adet',
      kdvPercent: 10,
      additionalItemIdentifications: [
        {
          schemeId: 'ILAC',
          value: 'ILAC-MTX-073',
        },
      ],
    },
  ],
};

export default input;
