import type { SimpleInvoiceInput } from '../../src';

/**
 * IHRACAT profili — yabancı ülkelere mal/hizmet ihracatı. KDV istisnası.
 *
 * IHRACAT profili zorunluları:
 * - `buyerCustomer` — yabancı alıcı bilgisi (taxNumber = VAT ID)
 * - `delivery` — teslim bilgisi (satır veya belge seviyesi)
 * - `kdvExemptionCode` — 301-308 aralığı (ihracat istisna kodları)
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000018',
  uuid: 'e1a2b3c4-0018-4000-8018-000000000018',
  datetime: '2026-04-23T13:00:00',
  profile: 'IHRACAT',
  type: 'ISTISNA',
  currencyCode: 'USD',
  exchangeRate: 32.50,

  kdvExemptionCode: '301',

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz İhracat A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
  },

  customer: {
    taxNumber: '2222222222', // fiktif aracı alıcı
    name: 'Global Trade Holdings (Germany)',
    address: 'Bahnhofstraße 123',
    district: 'Munich',
    city: 'Bayern',
    country: 'Germany',
    zipCode: '80335',
  },

  buyerCustomer: {
    name: 'Global Trade Holdings GmbH',
    taxNumber: 'DE123456789', // Almanya VAT ID
    address: 'Bahnhofstraße 123',
    district: 'Munich',
    city: 'Bayern',
    country: 'Germany',
    zipCode: '80335',
    email: 'import@global-trade.example.de',
  },

  lines: [
    {
      name: 'Premium Tekstil Ürünü — İhracat',
      quantity: 100,
      price: 10,
      unitCode: 'Adet',
      kdvPercent: 0,
      delivery: {
        deliveryTermCode: 'FOB', // INCOTERMS Free On Board
        gtipNo: '620342000010',
        deliveryAddress: {
          address: 'Ambarlı Liman Yüksek Gümrük',
          district: 'Avcılar',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  ],
};

export default input;
