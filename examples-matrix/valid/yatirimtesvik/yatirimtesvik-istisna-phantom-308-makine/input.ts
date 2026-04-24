import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000076',
  uuid: 'a1000076-0001-4000-8001-000000000076',
  datetime: '2026-04-24T10:00:00',
  profile: 'YATIRIMTESVIK',
  type: 'ISTISNA',
  currencyCode: 'TRY',
  ytbNo: '123456',
  ytbIssueDate: '2026-01-15',
  kdvExemptionCode: '308',
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
      name: 'Teşvikli makine',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 20,
      itemClassificationCode: '01',
      kdvExemptionCode: '308',
      productTraceId: 'MAKINA-MTX-076',
      serialId: 'SN-MTX-076',
      brand: 'Matrix',
      model: 'MTX-03',
    },
  ],
};

export default input;
