import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000063',
  uuid: 'a1000063-0001-4000-8001-000000000063',
  datetime: '2026-04-24T10:00:00',
  profile: 'HKS',
  type: 'HKSSATIS',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Sebze Meyve Tic.',
    taxOffice: 'Beşiktaş',
    address: 'Hal Kompleksi Blok 5',
    district: 'Bayrampaşa',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Market Zinciri Ltd.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Domates — Standart',
      quantity: 500,
      price: 20,
      unitCode: 'KGM',
      kdvPercent: 10,
      additionalItemIdentifications: [
        {
          schemeId: 'KUNYENO',
          value: 'KUN-2026-MTX63-DOM1',
        },
      ],
    },
  ],
};

export default input;
