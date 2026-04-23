import type { SimpleInvoiceInput } from '../../src';

/**
 * HKS (Hal Kayıt Sistemi) profili — yaş sebze meyve halinde yapılan
 * alım-satım için özel profil. Ticari Aracıların/Komisyoncuların
 * TaxTypeCode `9944` (Hal Rüsumu) + ürün izlenebilirliği.
 *
 * `HKSSATIS` tipi — hal içinde doğrudan satış (komisyoncu değil).
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000023',
  uuid: 'e1a2b3c4-0023-4000-8023-000000000023',
  datetime: '2026-04-23T13:00:00',
  profile: 'HKS',
  type: 'HKSSATIS',
  currencyCode: 'TRY',

  sender: {
    taxNumber: '1234567890',
    name: 'Doğa Sebze Meyve Tic. A.Ş.',
    taxOffice: 'Fatih',
    address: 'Anadolu Hal Kompleksi Blok 5',
    district: 'Bayrampaşa',
    city: 'İstanbul',
    zipCode: '34055',
  },

  customer: {
    taxNumber: '9876543210',
    name: 'Yeşil Market Zinciri Ltd. Şti.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Caddesi No:456',
    district: 'Kadıköy',
    city: 'İstanbul',
    zipCode: '34710',
  },

  lines: [
    {
      name: 'Domates — Standart Kalite',
      quantity: 500,
      price: 20,
      unitCode: 'KG', // Kilogram
      kdvPercent: 10,
      additionalItemIdentifications: [
        { schemeId: 'KUNYENO', value: 'KUN-2026-042-DOM001' },
      ],
    },
  ],
};

export default input;
