import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000060',
  uuid: 'a1000060-0001-4000-8001-000000000060',
  datetime: '2026-04-24T10:00:00',
  profile: 'IHRACAT',
  type: 'ISTISNA',
  currencyCode: 'USD',
  exchangeRate: 32.5,
  kdvExemptionCode: '301',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix İhracat A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '2222222222',
    name: 'Global Trade Holdings (Germany)',
    address: 'Bahnhofstraße 123',
    district: 'Munich',
    city: 'Bayern',
  },
  buyerCustomer: {
    name: 'Global Trade Holdings GmbH',
    taxNumber: 'DE123456789',
    address: 'Bahnhofstraße 123',
    district: 'Munich',
    city: 'Bayern',
    country: 'Germany',
  },
  lines: [
    {
      name: 'İhracat — tekstil',
      quantity: 100,
      price: 10,
      unitCode: 'Adet',
      kdvPercent: 0,
      delivery: {
        deliveryTermCode: 'FOB',
        gtipNo: '620342000010',
        deliveryAddress: {
          address: 'Ambarlı Liman',
          district: 'Avcılar',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  ],
};

export default input;
