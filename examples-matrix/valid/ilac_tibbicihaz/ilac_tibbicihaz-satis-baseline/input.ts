import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000070',
  uuid: 'a1000070-0001-4000-8001-000000000070',
  datetime: '2026-04-24T10:00:00',
  profile: 'ILAC_TIBBICIHAZ',
  type: 'SATIS',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix İlaç Tedarik A.Ş.',
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
      name: 'Reçeteli ilaç',
      quantity: 10,
      price: 50,
      unitCode: 'Adet',
      kdvPercent: 10,
      additionalItemIdentifications: [
        {
          schemeId: 'ILAC',
          value: 'ILAC-MTX-070-001',
        },
      ],
    },
  ],
};

export default input;
