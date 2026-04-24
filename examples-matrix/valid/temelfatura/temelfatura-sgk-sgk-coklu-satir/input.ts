import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000917',
  uuid: 'a1000917-0001-4000-8001-000000000917',
  datetime: '2026-04-24T10:00:00',
  profile: 'TEMELFATURA',
  type: 'SGK',
  currencyCode: 'TRY',
  sgk: {
    type: 'SAGLIK_HAS',
    documentNo: 'SGK-HAS-2026-MTX917',
    companyName: 'Matrix Test Hastane A.Ş.',
    companyCode: 'SGK-HAS-MTX917',
  },
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
    name: 'Sosyal Güvenlik Kurumu',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Medikal muayene',
      quantity: 1,
      price: 500,
      unitCode: 'Adet',
      kdvPercent: 10,
    },
    {
      name: 'Medikal tetkik',
      quantity: 2,
      price: 300,
      unitCode: 'Adet',
      kdvPercent: 10,
    },
  ],
};

export default input;
