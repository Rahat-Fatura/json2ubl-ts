import type { DespatchInput } from '../../src';

/**
 * TEMELIRSALIYE + SEVK — tek sürücü, plaka, teslimat adresi.
 * CustomizationID otomatik TR1.2.1 (M8).
 */
export const input: DespatchInput = {
  id: 'IRS2026000000033',
  uuid: 'e1a2b3c4-0033-4000-8033-000000000033',
  profileId: 'TEMELIRSALIYE' as DespatchInput['profileId'],
  despatchTypeCode: 'SEVK' as DespatchInput['despatchTypeCode'],
  issueDate: '2026-04-23',
  issueTime: '10:00:00',

  supplier: {
    vknTckn: '1234567890',
    taxIdType: 'VKN',
    name: 'Sınır Tanımaz Lojistik A.Ş.',
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
    name: 'Yeşil Alıcı Ltd. Şti.',
    streetName: 'Bağdat Caddesi No:456',
    district: 'Kadıköy',
    citySubdivisionName: 'Kadıköy',
    cityName: 'İstanbul',
    postalZone: '34710',
    country: 'Türkiye',
    taxOffice: 'Kadıköy',
  },

  shipment: {
    actualDespatchDate: '2026-04-23',
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
      { firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' },
    ],
    licensePlates: [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }],
  },

  lines: [
    {
      id: '1',
      deliveredQuantity: 10,
      unitCode: 'Adet',
      item: { name: 'Standart Paketlenmiş Ürün' },
    },
  ],
};

export default input;
