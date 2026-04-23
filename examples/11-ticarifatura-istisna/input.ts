import type { SimpleInvoiceInput } from '../../src';

/**
 * TICARIFATURA + ISTISNA + İstisna kodu 213 (11. madde istisna örneği).
 *
 * M5 matrisine göre:
 * - 201-250 kodları ISTISNA grubu için geçerli
 * - Her satırda KDV=0 zorunlu (ISTISNA tipinde default)
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000011',
  uuid: 'e1a2b3c4-0011-4000-8011-000000000011',
  datetime: '2026-04-23T18:00:00',
  profile: 'TICARIFATURA',
  type: 'ISTISNA',
  currencyCode: 'TRY',

  kdvExemptionCode: '213',

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
      name: 'KDV İstisnalı Hizmet (11/1-t)',
      quantity: 10,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 0,
    },
  ],
};

export default input;
