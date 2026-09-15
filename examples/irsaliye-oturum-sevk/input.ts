import type { SimpleDespatchInput } from '../../src';

/**
 * TEMELIRSALIYE + SEVK — basitleştirilmiş (`SimpleDespatchInput`) girdi.
 *
 * Mevcut `33..36-irsaliye-*` senaryolarıyla AYNI belgeyi üretir ama girdi
 * katmanı FARKLIDIR: orada ham `DespatchInput` (VKN/TCKN ayrımı, tarih/saat
 * bölünmesi, satır numaraları elle yazılır), burada geliştirici yalnız temel
 * veriyi verir ve SDK gerisini yapar:
 *   · `taxNumber` tek alan → VKN/TCKN çıkarımı + ad yerleşimi SDK'da
 *   · `datetime` tek alan → `IssueDate` + `IssueTime` (B-18) SDK'da bölünür
 *   · `actualDespatchDatetime` tek alan → fiili sevk tarihi + saati
 *   · satır numaraları indeksten türetilir (`DespatchLineIdCheck`)
 *   · plaka şeması verilmezse `PLAKA`, ülke verilmezse `Türkiye`
 *
 * `type` / `profile` DÜZ STRING'dir — enum import etmek GEREKMEZ.
 */
export const input: SimpleDespatchInput = {
  id: 'IRS2026000000101',
  uuid: 'e1a2b3c4-0101-4000-8101-000000000101',
  datetime: '2026-04-23T10:00:00',
  type: 'SEVK',
  profile: 'TEMELIRSALIYE',

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Lojistik A.Ş.',
    address: 'Barbaros Bulvarı No:123',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
    taxOffice: 'Üsküdar',
  },

  customer: {
    taxNumber: '9876543210',
    name: 'Yeşil Alıcı Ltd. Şti.',
    address: 'Bağdat Caddesi No:456',
    district: 'Kadıköy',
    city: 'İstanbul',
    zipCode: '34710',
    taxOffice: 'Kadıköy',
  },

  shipment: {
    // Fiili sevk, düzenleme anından SONRA — Uygulama Kılavuzu §10.
    actualDespatchDatetime: '2026-04-23T14:00:00',
    deliveryAddress: {
      address: 'Bağdat Caddesi No:456',
      district: 'Kadıköy',
      city: 'İstanbul',
      zipCode: '34710',
    },
    // Şoför VEYA taşıyıcıdan en az biri (DespatchCarrierDriverCheck);
    // plaka ise HER ZAMAN zorunlu (LicensePlateIDCheck).
    drivers: [
      { firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' },
    ],
    licensePlates: [{ value: '34ABC123' }],
    goodsValue: 12500,
  },

  lines: [
    {
      name: 'Standart Paketlenmiş Ürün',
      quantity: 10,
      unitCode: 'Adet',
      description: 'Kırılacak eşya',
      note: 'Üst üste konmasın',
    },
    {
      name: 'Yedek Parça Kutusu',
      quantity: 4,
      unitCode: 'Adet',
    },
  ],

  despatchContactName: 'Teslim Eden Kişi',
  orderReferences: [{ id: 'SIP-2026-0042', issueDate: '2026-04-20' }],
};

export default input;
