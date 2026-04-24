import type { SimpleInvoiceInput } from '../../src';

/**
 * 4171 — Petrol/Doğalgaz ÖTV Tevkifatı. TaxTypeCode belge seviyesinde tevkifat.
 * Kütüphane tax-config'te 4171 özel: sadece TEVKIFAT/IADE/SGK/YTBIADE'de izinli.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000031',
  uuid: 'e1a2b3c4-0031-4000-8031-000000000031',
  datetime: '2026-04-23T10:00:00',
  profile: 'TEMELFATURA',
  type: 'TEVKIFAT',
  currencyCode: 'TRY',

  sender: {
    taxNumber: '1234567890', name: 'Sınır Tanımaz Petrol A.Ş.', taxOffice: 'Üsküdar',
    address: 'Barbaros No:1', district: 'Üsküdar', city: 'İstanbul', zipCode: '34664',
  },
  customer: {
    taxNumber: '9876543210', name: 'Yeşil Alıcı Ltd.', taxOffice: 'Kadıköy',
    address: 'Bağdat No:2', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710',
  },

  // 4171 ÖTV Tevkifatı yalnızca TEVKIFAT/IADE/SGK/YTBIADE tiplerinde izinli.
  // TEVKIFAT tipi XSD gereği WithholdingTaxTotal da gerektirir — bu yüzden
  // `withholdingTaxCode` (KDV tevkifatı) ile birlikte `taxes[4171]` (ÖTV tevkifatı)
  // aynı kalemde kullanılır.
  lines: [
    {
      name: 'Motorin 10 L',
      quantity: 10, price: 40, unitCode: 'Adet', kdvPercent: 20,
      withholdingTaxCode: '606', // KDV Tevkifatı (Petrol ürünleri — örnek combo)
      taxes: [{ code: '4171', percent: 50 }], // Petrol ÖTV Tevkifatı
    },
  ],
};

export default input;
