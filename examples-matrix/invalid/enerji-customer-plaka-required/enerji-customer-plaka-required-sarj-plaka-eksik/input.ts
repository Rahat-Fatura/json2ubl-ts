import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000323',
  uuid: 'b1000323-0001-4000-8001-000000000323',
  datetime: '2026-04-24T10:00:00',
  profile: 'ENERJI',
  type: 'SARJ',
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
  },
  lines: [
    {
      name: 'DC şarj',
      quantity: 45,
      price: 8,
      unitCode: 'KWH',
      kdvPercent: 20,
    },
  ],
  invoicePeriod: {
    startDate: '2026-04-01',
    startTime: '00:00:00',
    endDate: '2026-04-24',
    endTime: '10:00:00',
  },
  additionalDocuments: [
    {
      id: 'a1b2c3d4-e5f6-4789-8abc-def012345678',
      schemeId: 'ESURaporID',
      issueDate: '2026-04-24',
    },
  ],
};

export default input;
