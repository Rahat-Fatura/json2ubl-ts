import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000066',
  uuid: 'a1000066-0001-4000-8001-000000000066',
  datetime: '2026-04-24T10:00:00',
  profile: 'EARSIVFATURA',
  type: 'HKSSATIS',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Hal e-Arşiv A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Hal Kompleksi Blok 9',
    district: 'Bayrampaşa',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Nihai Tüketici',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Kabak — 1. sınıf',
      quantity: 100,
      price: 22,
      unitCode: 'KGM',
      kdvPercent: 10,
      additionalItemIdentifications: [
        {
          schemeId: 'KUNYENO',
          value: 'KUN-2026-MTX66-KAB1',
        },
        {
          schemeId: 'MALSAHIBIADSOYADUNVAN',
          value: 'Mehmet Demir',
        },
        {
          schemeId: 'MALSAHIBIVKNTCKN',
          value: '98765432101',
        },
      ],
    },
  ],
};

export default input;
