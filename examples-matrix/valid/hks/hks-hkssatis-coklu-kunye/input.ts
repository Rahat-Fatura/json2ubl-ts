import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000984',
  uuid: 'a1000984-0001-4000-8001-000000000984',
  datetime: '2026-04-24T10:00:00',
  profile: 'HKS',
  type: 'HKSSATIS',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix HKS Tedarikçi',
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
      name: 'HKS ürün A',
      quantity: 1,
      price: 500,
      unitCode: 'Adet',
      kdvPercent: 20,
      additionalItemIdentifications: [
        {
          schemeId: 'KUNYENO',
          value: 'HKS2026A0001AAA0001',
        },
      ],
    },
    {
      name: 'HKS ürün B',
      quantity: 1,
      price: 700,
      unitCode: 'Adet',
      kdvPercent: 20,
      additionalItemIdentifications: [
        {
          schemeId: 'KUNYENO',
          value: 'HKS2026B0002BBB0001',
        },
      ],
    },
  ],
};

export default input;
