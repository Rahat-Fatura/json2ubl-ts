import type { SimpleInvoiceInput } from '../../src';

export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000001',
  uuid: 'e1a2b3c4-0001-4000-8001-000000000001',
  datetime: '2026-04-23T10:00:00',
  profile: 'TEMELFATURA',
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
      name: 'Demo Ürün — Genel KDV satışı',
      quantity: 10,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
