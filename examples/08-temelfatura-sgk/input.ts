import type { SimpleInvoiceInput } from '../../src';

/**
 * Fixture paralelliği: `__tests__/fixtures/mimsoft-real-invoices/f16-sgk.xml`
 *
 * TEMELFATURA + SGK. SGK faturası "sağlık/eczacılık/optik/medikal/genel" alt tiplerinde
 * çalışır. Zorunlu `sgk` objesi:
 * - `type`: SAGLIK_ECZ / SAGLIK_HAS / SAGLIK_OPT / SAGLIK_MED / ABONELIK / MAL_HIZMET / DIGER
 * - `documentNo`, `companyName`, `companyCode` doldurulur
 *
 * Beklenen: Matrah 100 · KDV %20 = 20 · Payable 120 TRY.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000008',
  uuid: 'e1a2b3c4-0008-4000-8008-000000000008',
  datetime: '2026-04-23T15:00:00',
  profile: 'TEMELFATURA',
  type: 'SGK',
  currencyCode: 'TRY',

  sgk: {
    type: 'SAGLIK_ECZ',
    documentNo: 'SGK-ECZ-2026-000042',
    companyName: 'Yeşil Eczane Zincir Ticaret A.Ş.',
    companyCode: 'SGK-COMP-0042',
  },

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Medikal A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
  },

  customer: {
    taxNumber: '9876543210',
    name: 'Sosyal Güvenlik Kurumu',
    taxOffice: 'Kadıköy',
    address: 'SGK Bölge Müdürlüğü Bağdat Caddesi No:101',
    district: 'Kadıköy',
    city: 'İstanbul',
    zipCode: '34710',
  },

  lines: [
    {
      name: 'Reçeteli İlaç — Paketin Karışık',
      quantity: 10,
      price: 10,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
