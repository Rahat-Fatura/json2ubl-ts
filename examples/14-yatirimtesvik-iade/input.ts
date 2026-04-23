import type { SimpleInvoiceInput } from '../../src';

/**
 * YATIRIMTESVIK + IADE — daha önce kesilmiş YTB satış faturasının iadesi.
 *
 * B-08 istisnası: YATIRIM_TESVIK_IADE_TYPES (IADE, TEVKIFATIADE, YTBIADE,
 * YTBTEVKIFATIADE) gruplarında, YTB profili normalde şart koştuğu
 * `TaxAmount > 0 AND Percent > 0` tüm kontrolleri **muaf tutulur**. İade
 * işlemi para akışı değil, orijinal fatura tersinyeti.
 *
 * `billingReference` Schematron IADEInvioceCheck gereği zorunlu.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000014',
  uuid: 'e1a2b3c4-0014-4000-8014-000000000014',
  datetime: '2026-04-23T21:00:00',
  profile: 'YATIRIMTESVIK',
  type: 'IADE',
  currencyCode: 'TRY',

  ytbNo: '123456',

  billingReference: {
    id: 'EXA2026000000012', // 12-yatirimtesvik-satis-makina iadesi
    issueDate: '2026-04-23',
  },

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Makine Tic. A.Ş.',
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
      name: 'Sanayi Tipi Kompresör — İade',
      quantity: 1,
      price: 200,
      unitCode: 'Adet',
      kdvPercent: 20,
      itemClassificationCode: '01',
      productTraceId: 'KOMP-2026-0001',
      serialId: 'SN-2026-MAKINA-000001',
      brand: 'DemoMakine',
      model: 'DMK-2000',
    },
  ],
};

export default input;
