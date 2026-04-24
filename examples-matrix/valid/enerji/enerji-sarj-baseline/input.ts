import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000065',
  uuid: 'a1000065-0001-4000-8001-000000000065',
  datetime: '2026-04-24T10:00:00',
  profile: 'ENERJI',
  type: 'SARJ',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Şarj Operatörü A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '12345678901',
    name: 'Matrix Araç Sürücüsü',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'EV DC Hızlı Şarj 45 kWh',
      quantity: 45,
      price: 8,
      unitCode: 'KWH',
      kdvPercent: 20,
    },
  ],
};

export default input;
