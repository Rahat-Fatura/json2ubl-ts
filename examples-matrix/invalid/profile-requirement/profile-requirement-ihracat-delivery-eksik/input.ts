import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000205',
  uuid: 'b1000205-0001-4000-8001-000000000205',
  datetime: '2026-04-24T10:00:00',
  profile: 'IHRACAT',
  type: 'ISTISNA',
  currencyCode: 'USD',
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
      name: 'İhraç ürün',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
  exchangeRate: 32.5,
  kdvExemptionCode: '301',
  buyerCustomer: {
    name: 'Foreign Buyer',
    taxNumber: 'X12345',
    address: 'A',
    district: 'D',
    city: 'C',
    country: 'UK',
  },
};

export default input;
