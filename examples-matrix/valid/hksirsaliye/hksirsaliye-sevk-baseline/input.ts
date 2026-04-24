import type { DespatchInput } from '../../../../src';

export const input: DespatchInput = {
  id: 'IRS2026000000093',
  uuid: 'a1000093-0001-4000-8001-000000000093',
  profileId: 'HKSIRSALIYE',
  despatchTypeCode: 'SEVK',
  issueDate: '2026-04-24',
  issueTime: '10:00:00',
  supplier: {
    vknTckn: '1234567890',
    taxIdType: 'VKN',
    name: 'Matrix Hal Lojistik',
    streetName: 'Hal Kompleksi Blok 5',
    district: 'Bayrampaşa',
    citySubdivisionName: 'Bayrampaşa',
    cityName: 'İstanbul',
    postalZone: '34055',
    country: 'Türkiye',
    taxOffice: 'Fatih',
  },
  customer: {
    vknTckn: '9876543210',
    taxIdType: 'VKN',
    name: 'Matrix Market Zincir',
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
        firstName: 'Veli',
        familyName: 'Halci',
        nationalityId: '12345678901',
      },
    ],
    licensePlates: [
      {
        plateNumber: '34HKS001',
        schemeId: 'PLAKA',
      },
    ],
  },
  lines: [
    {
      id: '1',
      deliveredQuantity: 500,
      unitCode: 'KGM',
      item: {
        name: 'Domates',
        additionalItemIdentifications: [
          {
            schemeId: 'KUNYENO',
            value: 'KUN-2026-MTX93-DOM1',
          },
        ],
      },
    },
  ],
};

export default input;
