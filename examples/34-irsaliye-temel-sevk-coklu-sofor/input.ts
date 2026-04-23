import type { DespatchInput } from '../../src';

/**
 * TEMELIRSALIYE + SEVK — AR-2: `driverPersons` çoklu sürücü + `carrierParty`
 * taşıyıcı firma kombinasyonu + B-49 DORSEPLAKA TransportHandlingUnit.
 */
export const input: DespatchInput = {
  id: 'IRS2026000000034',
  uuid: 'e1a2b3c4-0034-4000-8034-000000000034',
  profileId: 'TEMELIRSALIYE' as DespatchInput['profileId'],
  despatchTypeCode: 'SEVK' as DespatchInput['despatchTypeCode'],
  issueDate: '2026-04-23',
  issueTime: '11:00:00',

  supplier: {
    vknTckn: '1234567890', taxIdType: 'VKN', name: 'Sınır Tanımaz Lojistik A.Ş.',
    streetName: 'Barbaros Bulvarı No:123', district: 'Üsküdar',
    citySubdivisionName: 'Üsküdar', cityName: 'İstanbul', postalZone: '34664',
    country: 'Türkiye', taxOffice: 'Üsküdar',
  },
  customer: {
    vknTckn: '9876543210', taxIdType: 'VKN', name: 'Yeşil Alıcı Ltd. Şti.',
    streetName: 'Bağdat Caddesi No:456', district: 'Kadıköy',
    citySubdivisionName: 'Kadıköy', cityName: 'İstanbul', postalZone: '34710',
    country: 'Türkiye', taxOffice: 'Kadıköy',
  },

  shipment: {
    actualDespatchDate: '2026-04-23',
    actualDespatchTime: '15:00:00',
    deliveryAddress: {
      streetName: 'Bağdat Caddesi No:456', district: 'Kadıköy',
      citySubdivisionName: 'Kadıköy', cityName: 'İstanbul', postalZone: '34710',
      country: 'Türkiye',
    },
    driverPersons: [
      { firstName: 'Mehmet', familyName: 'Birinci Sürücü', nationalityId: '12345678901' },
      { firstName: 'Ali', familyName: 'İkinci Sürücü', nationalityId: '23456789012' },
    ],
    carrierParty: {
      vknTckn: '5555555555',
      taxIdType: 'VKN',
      name: 'Hızlı Taşımacılık A.Ş.',
    },
    licensePlates: [
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '34DEF456', schemeId: 'DORSE' },
    ],
    transportHandlingUnits: [
      { transportEquipmentId: '34DEF456', schemeId: 'DORSEPLAKA' },
    ],
  },

  lines: [
    {
      id: '1',
      deliveredQuantity: 100,
      unitCode: 'Adet',
      item: { name: 'Büyük Hacim Ürün — Çok Şoförlü Sevkiyat' },
    },
  ],
};

export default input;
