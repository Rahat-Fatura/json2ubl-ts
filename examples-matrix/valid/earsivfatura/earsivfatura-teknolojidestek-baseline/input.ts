import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000951',
  uuid: 'a1000951-0001-4000-8001-000000000951',
  datetime: '2026-04-27T10:00:00',
  profile: 'EARSIVFATURA',
  type: 'TEKNOLOJIDESTEK',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Teknoloji A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '12345678901',
    taxIdType: 'TCKN',
    name: 'Test Hasta',
    firstName: 'Test',
    familyName: 'Kişi',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Akıllı telefon',
      quantity: 1,
      price: 5000,
      unitCode: 'Adet',
      kdvPercent: 20,
      additionalItemIdentifications: [
        {
          schemeId: 'TELEFON',
          value: 'IMEI123456789012345',
        },
      ],
    },
  ],
};

export default input;
