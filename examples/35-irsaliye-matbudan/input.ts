import type { DespatchInput } from '../../src';

/**
 * TEMELIRSALIYE + MATBUDAN — matbu (kağıt) irsaliyenin e-İrsaliye sistemine
 * girilmesi. B-66: `additionalDocuments` zorunlu (matbu belgenin ID + tarihi).
 */
export const input: DespatchInput = {
  id: 'IRS2026000000035',
  uuid: 'e1a2b3c4-0035-4000-8035-000000000035',
  profileId: 'TEMELIRSALIYE' as DespatchInput['profileId'],
  despatchTypeCode: 'MATBUDAN' as DespatchInput['despatchTypeCode'],
  issueDate: '2026-04-23',
  issueTime: '12:00:00',

  supplier: {
    vknTckn: '1234567890', taxIdType: 'VKN', name: 'Sınır Tanımaz Lojistik A.Ş.',
    streetName: 'Barbaros No:1', district: 'Üsküdar',
    citySubdivisionName: 'Üsküdar', cityName: 'İstanbul', postalZone: '34664',
    country: 'Türkiye', taxOffice: 'Üsküdar',
  },
  customer: {
    vknTckn: '9876543210', taxIdType: 'VKN', name: 'Yeşil Alıcı Ltd.',
    streetName: 'Bağdat No:2', district: 'Kadıköy',
    citySubdivisionName: 'Kadıköy', cityName: 'İstanbul', postalZone: '34710',
    country: 'Türkiye', taxOffice: 'Kadıköy',
  },

  // MATBUDAN zorunluluğu (B-66)
  additionalDocuments: [
    {
      id: 'MATBU-2026-042',
      issueDate: '2026-04-20',
      documentType: 'MATBU',
    },
  ],

  shipment: {
    actualDespatchDate: '2026-04-20',
    actualDespatchTime: '09:00:00',
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
    { id: '1', deliveredQuantity: 5, unitCode: 'Adet', item: { name: 'Matbu Belgeden Geçen Ürün' } },
  ],
};

export default input;
