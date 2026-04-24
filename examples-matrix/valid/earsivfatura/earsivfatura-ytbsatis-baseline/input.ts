import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000049',
  uuid: 'a1000049-0001-4000-8001-000000000049',
  datetime: '2026-04-24T10:00:00',
  profile: 'EARSIVFATURA',
  type: 'YTBSATIS',
  currencyCode: 'TRY',
  ytbNo: '123456',
  ytbIssueDate: '2026-01-15',
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
      productTraceId: 'MAKINA-MTX-049',
      serialId: 'SN-MTX-049',
      brand: 'Matrix',
      model: 'MTX-01',
    },
  ],
};

export default input;
