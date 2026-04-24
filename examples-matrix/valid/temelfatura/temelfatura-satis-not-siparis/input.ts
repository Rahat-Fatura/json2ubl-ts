import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000018',
  uuid: 'a1000018-0001-4000-8001-000000000018',
  datetime: '2026-04-24T10:00:00',
  profile: 'TEMELFATURA',
  type: 'SATIS',
  currencyCode: 'TRY',
  notes: [
    'Sözleşme no: SOZ-2026-0042',
    'Ödeme: 30 gün vadeli',
  ],
  orderReference: {
    id: 'ORD-2026-0042',
    issueDate: '2026-04-20',
  },
  despatchReferences: [
    {
      id: 'IRS-2026-001',
      issueDate: '2026-04-22',
    },
  ],
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
      name: 'Sözleşme kapsamı hizmet',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
