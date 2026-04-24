import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000064',
  uuid: 'a1000064-0001-4000-8001-000000000064',
  datetime: '2026-04-24T10:00:00',
  profile: 'HKS',
  type: 'HKSKOMISYONCU',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Komisyoncu Hal',
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
      name: 'Biber — Komisyon satış',
      quantity: 200,
      price: 15,
      unitCode: 'KGM',
      kdvPercent: 10,
      additionalItemIdentifications: [
        {
          schemeId: 'KUNYENO',
          value: 'KUN-2026-MTX64-BIB1',
        },
      ],
    },
  ],
};

export default input;
