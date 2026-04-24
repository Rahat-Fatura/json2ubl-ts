import type { DespatchInput } from '../../../../src';

export const input: DespatchInput = {
  id: 'IRS2026000000090',
  uuid: 'a1000090-0001-4000-8001-000000000090',
  profileId: 'TEMELIRSALIYE',
  despatchTypeCode: 'SEVK',
  issueDate: '2026-04-24',
  issueTime: '10:00:00',
  supplier: {
    vknTckn: '1234567890',
    taxIdType: 'VKN',
    name: 'Matrix Lojistik A.Ş.',
    streetName: 'Barbaros Bulvarı No:123',
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
    streetName: 'Bağdat Caddesi No:456',
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
      streetName: 'Bağdat Caddesi No:456',
      district: 'Kadıköy',
      citySubdivisionName: 'Kadıköy',
      cityName: 'İstanbul',
      postalZone: '34710',
      country: 'Türkiye',
    },
    driverPersons: [
      {
        firstName: 'Mehmet',
        familyName: 'Sürücü',
        nationalityId: '12345678901',
      },
    ],
    licensePlates: [
      {
        plateNumber: '34ABC123',
        schemeId: 'PLAKA',
      },
    ],
  },
  lines: [
    {
      id: '1',
      deliveredQuantity: 10,
      unitCode: 'C62',
      item: {
        name: 'Standart paket',
      },
    },
  ],
};

export default input;
