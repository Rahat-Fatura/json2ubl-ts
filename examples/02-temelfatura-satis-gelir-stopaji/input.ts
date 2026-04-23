import type { SimpleInvoiceInput } from '../../src';

/**
 * Fixture paralelliği: `__tests__/fixtures/mimsoft-real-invoices/f10-satis-gelir-stopaji.xml`
 * Matrah ve stopaj yapısı aynı; profil TEMELFATURA'ya adapte (f10 TICARIFATURA).
 * Beklenen: Matrah 15.000 · KDV 3.000 · Gelir Stopajı 3.450 · Payable 14.550 TRY.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000002',
  uuid: 'e1a2b3c4-0002-4000-8002-000000000002',
  datetime: '2026-04-23T10:00:00',
  profile: 'TEMELFATURA',
  type: 'SATIS',
  currencyCode: 'TRY',

  notes: ['YAZIYLA: ON DÖRT BİN BEŞ YÜZ ELLİ TÜRK LİRASI'],

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Ticaret A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
    phone: '+902161234567',
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
    email: 'satinalma@yesil-alici.example.tr',
  },

  lines: [
    {
      name: 'Danışmanlık Hizmeti',
      quantity: 10,
      price: 1500,
      unitCode: 'Adet',
      kdvPercent: 20,
      taxes: [
        { code: '0003', percent: 23 }, // Gelir Vergisi Stopajı
      ],
    },
  ],
};

export default input;
