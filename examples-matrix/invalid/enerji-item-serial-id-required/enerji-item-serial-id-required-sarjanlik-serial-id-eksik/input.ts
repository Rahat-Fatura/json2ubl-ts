import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000324',
  uuid: 'b1000324-0001-4000-8001-000000000324',
  datetime: '2026-04-24T10:00:00',
  profile: 'ENERJI',
  type: 'SARJANLIK',
  currencyCode: 'TRY',
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
    identifications: [
      {
        schemeId: 'PLAKA',
        value: '06ANK042',
      },
    ],
  },
  lines: [
    {
      name: 'AC şarj anlık',
      quantity: 20,
      price: 5,
      unitCode: 'KWH',
      kdvPercent: 20,
    },
  ],
  invoicePeriod: {
    startDate: '2026-04-01',
    startTime: '00:00:00',
    endDate: '2026-04-24',
    endTime: '18:30:00',
  },
};

export default input;
