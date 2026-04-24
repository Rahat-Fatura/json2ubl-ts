import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000915',
  uuid: 'a1000915-0001-4000-8001-000000000915',
  datetime: '2026-04-24T10:00:00',
  profile: 'TEMELFATURA',
  type: 'ISTISNA',
  currencyCode: 'TRY',
  kdvExemptionCode: '213',
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
      name: 'Gemi bakım parçası A',
      quantity: 2,
      price: 500,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
    {
      name: 'Gemi bakım parçası B',
      quantity: 1,
      price: 1200,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
    {
      name: 'Uçak parçası C',
      quantity: 3,
      price: 800,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
};

export default input;
