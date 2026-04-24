import type { DespatchInput } from '../../../../src';

export const input: DespatchInput = {
  id: 'IRS2026000000992',
  uuid: 'a1000992-0001-4000-8001-000000000992',
  profileId: 'IDISIRSALIYE',
  despatchTypeCode: 'SEVK',
  issueDate: '2026-04-24',
  issueTime: '10:00:00',
  supplier: {
    vknTckn: '1234567890',
    taxIdType: 'VKN',
    name: 'Matrix İç Dağıtım A.Ş.',
    streetName: 'Barbaros No:123',
    district: 'Üsküdar',
    citySubdivisionName: 'Üsküdar',
    cityName: 'İstanbul',
    postalZone: '34664',
    country: 'Türkiye',
    taxOffice: 'Üsküdar',
    additionalIdentifiers: [
      {
        schemeId: 'SEVKIYATNO',
        value: 'SE-0000992',
      },
    ],
  },
  customer: {
    vknTckn: '9876543210',
    taxIdType: 'VKN',
    name: 'Matrix Bayii Ltd.',
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
        firstName: 'Osman',
        familyName: 'Dağıtım',
        nationalityId: '12345678901',
      },
    ],
    licensePlates: [
      {
        plateNumber: '34IDS001',
        schemeId: 'PLAKA',
      },
    ],
  },
  lines: [
    {
      id: '1',
      deliveredQuantity: 5,
      unitCode: 'C62',
      item: {
        name: 'Ürün A',
        additionalItemIdentifications: [
          {
            schemeId: 'ETIKETNO',
            value: 'AA0000992',
          },
        ],
      },
    },
    {
      id: '2',
      deliveredQuantity: 3,
      unitCode: 'C62',
      item: {
        name: 'Ürün B',
        additionalItemIdentifications: [
          {
            schemeId: 'ETIKETNO',
            value: 'BB0000992',
          },
        ],
      },
    },
    {
      id: '3',
      deliveredQuantity: 7,
      unitCode: 'C62',
      item: {
        name: 'Ürün C',
        additionalItemIdentifications: [
          {
            schemeId: 'ETIKETNO',
            value: 'CC0000992',
          },
        ],
      },
    },
  ],
};

export default input;
