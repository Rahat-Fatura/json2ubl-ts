import type { SimpleInvoiceInput } from '../../src';

/**
 * TEMELFATURA + TEVKIFAT senaryosu. KDV tevkifatı (kod 603 — Bakım/Onarım, %70).
 * Beklenen: Matrah 1.000 · KDV 200 · Tevkifat 140 (200 × 0.70) · Payable 1.060 TRY.
 *
 * withholdingTaxCode verildiği anda type otomatik TEVKIFAT'a döner — manuel override
 * ile de tutarlı olduğundan burada açıkça belirttik.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000005',
  uuid: 'e1a2b3c4-0005-4000-8005-000000000005',
  datetime: '2026-04-23T12:00:00',
  profile: 'TEMELFATURA',
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
      name: 'Elektrik Tesisatı Bakım-Onarım Hizmeti',
      quantity: 10,
      price: 100,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode: '603', // Bakım/Onarım — %70 kısmi KDV tevkifatı
    },
  ],
};

export default input;
