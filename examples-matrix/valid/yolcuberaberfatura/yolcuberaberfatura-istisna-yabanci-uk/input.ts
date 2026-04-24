import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000983',
  uuid: 'a1000983-0001-4000-8001-000000000983',
  datetime: '2026-04-24T10:00:00',
  profile: 'YOLCUBERABERFATURA',
  type: 'ISTISNA',
  currencyCode: 'TRY',
  kdvExemptionCode: '322',
  sender: {
    taxNumber: '1460415308',
    name: 'Matrix Tax-Free Shop',
    taxOffice: 'Beyoğlu',
    address: 'İstiklal Cad. No:100',
    district: 'Beyoğlu',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Turizm Aracı A.Ş.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  buyerCustomer: {
    name: 'John Smith',
    taxNumber: '88888888888',
    address: '221B Baker St',
    district: 'Marylebone',
    city: 'London',
    country: 'United Kingdom',
    nationalityId: 'GB',
    passportId: 'GB9876543',
  },
  taxRepresentativeParty: {
    vknTckn: '9876543210',
    label: 'MATRIX_TAXFREE',
    name: 'Matrix KDV İade Aracı',
  },
  lines: [
    {
      name: 'Halı (hediyelik)',
      quantity: 1,
      price: 2500,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
};

export default input;
