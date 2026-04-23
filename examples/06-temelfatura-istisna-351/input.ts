import type { SimpleInvoiceInput } from '../../src';

/**
 * Fixture paralelliği: `__tests__/fixtures/mimsoft-real-invoices/f15-satis-351.xml`
 *
 * 351 — "KDV İstisna Olmayan Diğer" (catch-all). Kütüphane M5 matrisine göre:
 * - `type` SATIS olabilir (ISTISNA DEĞİL!)
 * - `kdvPercent` 0 zorunlu (M5 requiresZeroKdvLine)
 *
 * Beklenen: Matrah 100 · KDV 0 · Payable 100 TRY.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000006',
  uuid: 'e1a2b3c4-0006-4000-8006-000000000006',
  datetime: '2026-04-23T13:00:00',
  profile: 'TEMELFATURA',
  type: 'SATIS',
  currencyCode: 'TRY',

  kdvExemptionCode: '351',

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
      name: 'İstisna Olmayan Diğer Mal',
      quantity: 10,
      price: 10,
      unitCode: 'Adet',
      kdvPercent: 0, // M5: 351 kodu + SATIS → KDV=0 zorunlu (requiresZeroKdvLine)
    },
  ],
};

export default input;
