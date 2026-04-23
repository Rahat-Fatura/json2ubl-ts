import type { SimpleInvoiceInput } from '../../src';

/**
 * Fixture paralelliği: `__tests__/fixtures/mimsoft-real-invoices/f11-satis-kurumlar-stopaji.xml`
 * Gelir stopajının (02) aksine Kurumlar Vergisi Stopajı (0011) %32 oranıyla.
 * Beklenen: Matrah 15.000 · KDV 3.000 · Kurumlar Stopajı 4.800 · Payable 13.200 TRY.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000003',
  uuid: 'e1a2b3c4-0003-4000-8003-000000000003',
  datetime: '2026-04-23T10:00:00',
  profile: 'TEMELFATURA',
  type: 'SATIS',
  currencyCode: 'TRY',

  notes: ['YAZIYLA: ON ÜÇ BİN İKİ YÜZ TÜRK LİRASI'],

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Ticaret A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
    email: 'info@sinir-tanimaz.example.tr',
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
      name: 'Muhasebe Danışmanlık Hizmeti',
      quantity: 10,
      price: 1500,
      unitCode: 'Adet',
      kdvPercent: 20,
      taxes: [
        { code: '0011', percent: 32 }, // Kurumlar Vergisi Stopajı
      ],
    },
  ],
};

export default input;
