import type { DespatchInput } from '../../../../src';

export const input: DespatchInput = {
  id: 'IRS2026000000092',
  uuid: 'a1000092-0001-4000-8001-000000000092',
  profileId: 'TEMELIRSALIYE',
  despatchTypeCode: 'MATBUDAN',
  issueDate: '2026-04-24',
  issueTime: '10:00:00',
  supplier: {
    vknTckn: '1234567890',
    taxIdType: 'VKN',
    name: 'Matrix Lojistik A.Ş.',
    streetName: 'Barbaros No:123',
    district: 'Üsküdar',
    citySubdivisionName: 'Üsküdar',
    cityName: 'İstanbul',
    postalZone: '34664',
    country: 'Türkiye',
    taxOffice: 'Üsküdar',
  },
  customer: {
    vknTckn: '9876543210',
    taxIdType: 'VKN',
    name: 'Matrix Alıcı Ltd.',
    streetName: 'Bağdat Cad. No:456',
    district: 'Kadıköy',
    citySubdivisionName: 'Kadıköy',
    cityName: 'İstanbul',
    postalZone: '34710',
    country: 'Türkiye',
    taxOffice: 'Kadıköy',
  },
  shipment: {
    actualDespatchDate: '2026-04-24',
    actualDespatchTime: '14:00:00',
    deliveryAddress: {
      streetName: 'Bağdat No:456',
      district: 'Kadıköy',
      citySubdivisionName: 'Kadıköy',
      cityName: 'İstanbul',
      postalZone: '34710',
      country: 'Türkiye',
    },
    driverPersons: [
      {
        firstName: 'Hasan',
        familyName: 'Matbu',
        nationalityId: '12345678901',
      },
    ],
    licensePlates: [
      {
        plateNumber: '34MTB789',
        schemeId: 'PLAKA',
      },
    ],
  },
  additionalDocuments: [
    {
      documentType: 'MATBU',
      id: 'KAGIT-IRS-2026-0001',
      issueDate: '2026-04-23',
    },
  ],
  lines: [
    {
      id: '1',
      deliveredQuantity: 5,
      unitCode: 'C62',
      item: {
        name: 'Kağıt arka dönem',
      },
    },
  ],
};

export default input;
