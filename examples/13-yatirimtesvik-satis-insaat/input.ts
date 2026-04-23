import type { SimpleInvoiceInput } from '../../src';

/**
 * YATIRIMTESVIK + SATIS + Bina İnşaat (itemClassificationCode=03).
 * Fixture paralelliği: `__tests__/fixtures/mimsoft-real-invoices/f14-yatirimtesvik-satis-insaat.xml`
 *
 * `simple-types` kod haritası:
 * - 01: Makine/Teçhizat (12-makina senaryosu)
 * - 02: Yazılım
 * - 03: Bina İnşaat (bu senaryo)
 * - 04: Diğer
 *
 * Makine (01) gibi productTraceId/serialId **gerekli değil** — Bina inşaat için
 * sadece itemClassificationCode yeterli.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000013',
  uuid: 'e1a2b3c4-0013-4000-8013-000000000013',
  datetime: '2026-04-23T20:00:00',
  profile: 'YATIRIMTESVIK',
  type: 'SATIS',
  currencyCode: 'TRY',

  ytbNo: '123456',
  ytbIssueDate: '2026-01-15',

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz İnşaat A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
  },

  customer: {
    taxNumber: '9876543210',
    name: 'Teşvikli Üretici Ltd. Şti.',
    taxOffice: 'Kadıköy',
    address: 'Organize Sanayi Bölgesi No:12',
    district: 'Tuzla',
    city: 'İstanbul',
    zipCode: '34956',
  },

  lines: [
    {
      name: 'Fabrika İmalat Binası Temel İnşaat',
      quantity: 1,
      price: 200,
      unitCode: 'Adet',
      kdvPercent: 20,
      itemClassificationCode: '03', // Bina İnşaat
    },
    {
      name: 'İdari Bina İnce İşler',
      quantity: 1,
      price: 360,
      unitCode: 'Adet',
      kdvPercent: 20,
      itemClassificationCode: '03',
    },
  ],
};

export default input;
