import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000061',
  uuid: 'a1000061-0001-4000-8001-000000000061',
  datetime: '2026-04-24T10:00:00',
  profile: 'YOLCUBERABERFATURA',
  type: 'ISTISNA',
  currencyCode: 'TRY',
  kdvExemptionCode: '322',
  sender: {
    taxNumber: '1460415308',
    name: 'Matrix Bavul Ticaret A.Ş.',
    taxOffice: 'Beyoğlu',
    address: 'İstiklal Cad. No:321',
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
    name: 'Michael Schneider (Tourist)',
    taxNumber: '99999999999',
    address: 'Hauptstrasse 15',
    district: 'Berlin',
    city: 'Berlin',
    country: 'Germany',
    nationalityId: 'DE',
    passportId: 'N12345678',
  },
  taxRepresentativeParty: {
    vknTckn: '9876543210',
    label: 'MATRIX_TAXFREE',
    name: 'Matrix KDV İade Aracı',
  },
  lines: [
    {
      name: 'El yapımı seramik',
      quantity: 1,
      price: 800,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
};

export default input;
