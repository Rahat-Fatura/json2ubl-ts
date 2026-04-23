import type { SimpleInvoiceInput } from '../../src';

/**
 * TICARIFATURA + TEVKIFAT + 650 dinamik oran (M3, B-95).
 *
 * 650 kodu tevkifat-config'te dinamik: kullanıcı 0-99 arası oran girer; UR-2
 * kuralı ile 65000+percent combo üretilir (örn. %25 → 65025). Diğer tevkifat
 * kodlarında oran config'den gelir, 650'de kullanıcıdan.
 *
 * Beklenen: Matrah 1.000 · KDV 200 · Tevkifat %25 = 50 · Payable 1.150 TRY.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000010',
  uuid: 'e1a2b3c4-0010-4000-8010-000000000010',
  datetime: '2026-04-23T17:00:00',
  profile: 'TICARIFATURA',
  type: 'TEVKIFAT',
  currencyCode: 'TRY',

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Ticaret A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
  },

  customer: {
    taxNumber: '9876543210',
    name: 'Yeşil Alıcı Ltd. Şti.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Caddesi No:456',
    district: 'Kadıköy',
    city: 'İstanbul',
    zipCode: '34710',
  },

  lines: [
    {
      name: 'Diğer Tevkifatlı Hizmet',
      quantity: 10,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode: '650', // dinamik
      withholdingTaxPercent: 25, // M3 — kullanıcı input'u
    },
  ],
};

export default input;
