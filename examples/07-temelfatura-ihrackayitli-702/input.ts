import type { SimpleInvoiceInput } from '../../src';

/**
 * Fixture paralelliği: `__tests__/fixtures/mimsoft-real-invoices/f12-ihrackayitli-702.xml`
 *
 * IHRACKAYITLI + 702 (DİİB ve Geçici Kabul Rejimi Kapsamındaki Satışlar).
 * B-07 kuralı: GTİP (12 haneli Gümrük Tarife İstatistik Pozisyonu) ve AlıcıDİBKod satır
 * seviyesinde zorunlu. Simple-input'ta `delivery.gtipNo` ve `buyerCode` alanlarına eşlenir.
 *
 * Beklenen: Matrah 100 · KDV 0 · Payable 100 TRY.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000007',
  uuid: 'e1a2b3c4-0007-4000-8007-000000000007',
  datetime: '2026-04-23T14:00:00',
  profile: 'TEMELFATURA',
  type: 'IHRACKAYITLI',
  currencyCode: 'TRY',

  kdvExemptionCode: '702',

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
    name: 'İhracat Aracı Kurumu A.Ş.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Caddesi No:456',
    district: 'Kadıköy',
    city: 'İstanbul',
    zipCode: '34710',
  },

  lines: [
    {
      name: 'İhraç Kayıtlı Tekstil Ürünü',
      quantity: 10,
      price: 10,
      unitCode: 'Adet',
      kdvPercent: 0,
      delivery: {
        gtipNo: '620342000010', // 12-hane GTİP (B-07)
        alicidibsatirkod: '12345678901', // 11-hane AlıcıDİBSATIRKOD (B-07 / B-NEW-12)
        deliveryAddress: {
          address: 'İhracat Serbest Bölgesi Gümrük Kapısı',
          district: 'Ambarlı',
          city: 'İstanbul',
          country: 'Türkiye',
        },
      },
    },
  ],
};

export default input;
