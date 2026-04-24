import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000012',
  uuid: 'a1000012-0001-4000-8001-000000000012',
  datetime: '2026-04-24T10:00:00',
  profile: 'TEMELFATURA',
  type: 'KONAKLAMAVERGISI',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Test Otel A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Test Misafir A.Ş.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Konaklama — 2 gece',
      quantity: 2,
      price: 500,
      unitCode: 'Gece',
      kdvPercent: 20,
    },
  ],
};

export default input;
