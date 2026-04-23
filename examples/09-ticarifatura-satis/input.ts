import type { SimpleInvoiceInput } from '../../src';

/**
 * TICARIFATURA + SATIS. TEMELFATURA'dan farkı:
 * - Ticari fatura, alıcı-satıcı arasında onay süreci içerir
 * - IADE tipi desteklenmiyor (M1 PROFILE_TYPE_MATRIX); iade için TEMELFATURA kullanılır
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000009',
  uuid: 'e1a2b3c4-0009-4000-8009-000000000009',
  datetime: '2026-04-23T16:00:00',
  profile: 'TICARIFATURA',
  type: 'SATIS',
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
      name: 'Endüstriyel Malzeme — Ticari Satış',
      quantity: 10,
      price: 200,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
