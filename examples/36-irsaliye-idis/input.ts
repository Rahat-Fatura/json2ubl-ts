import type { DespatchInput } from '../../src';

/**
 * IDISIRSALIYE + SEVK — IDIS profili irsaliyesi. Sender'da SEVKIYATNO,
 * satırda ETIKETNO gibi ek tanımlayıcılar kullanılır.
 */
export const input: DespatchInput = {
  id: 'IRS2026000000036',
  uuid: 'e1a2b3c4-0036-4000-8036-000000000036',
  profileId: 'IDISIRSALIYE' as DespatchInput['profileId'],
  despatchTypeCode: 'SEVK' as DespatchInput['despatchTypeCode'],
  issueDate: '2026-04-23',
  issueTime: '13:00:00',

  supplier: {
    vknTckn: '1234567890', taxIdType: 'VKN', name: 'Sınır Tanımaz Distribütör A.Ş.',
    streetName: 'Barbaros No:1', district: 'Üsküdar',
    citySubdivisionName: 'Üsküdar', cityName: 'İstanbul', postalZone: '34664',
    country: 'Türkiye', taxOffice: 'Üsküdar',
    additionalIdentifiers: [{ schemeId: 'SEVKIYATNO', value: 'SE-2026042' }],
  },
  customer: {
    vknTckn: '9876543210', taxIdType: 'VKN', name: 'Yerel Bayi Ltd.',
    streetName: 'Bağdat No:2', district: 'Kadıköy',
    citySubdivisionName: 'Kadıköy', cityName: 'İstanbul', postalZone: '34710',
    country: 'Türkiye', taxOffice: 'Kadıköy',
  },

  shipment: {
    actualDespatchDate: '2026-04-23',
    actualDespatchTime: '16:00:00',
    deliveryAddress: {
      streetName: 'Bağdat No:2', district: 'Kadıköy',
      citySubdivisionName: 'Kadıköy', cityName: 'İstanbul', postalZone: '34710',
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
      deliveredQuantity: 100,
      unitCode: 'Adet',
      item: {
        name: 'IDIS İzlenebilir Ürün',
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ET0000001' }],
      },
    },
  ],
};

export default input;
