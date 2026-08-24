import type { SimpleInvoiceInput } from '../../src';

/**
 * ENERJI profili — elektrik/gaz şarj operatörlerinin kesilen fatura profili.
 * `SARJ` tipi: son kullanıcıya doğrudan şarj hizmeti (araç şarj istasyonu vb.).
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000025',
  uuid: 'e1a2b3c4-0025-4000-8025-000000000025',
  datetime: '2026-04-23T15:00:00',
  profile: 'ENERJI',
  type: 'SARJ',
  currencyCode: 'TRY',

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Şarj Operatörü A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
  },

  customer: {
    taxNumber: '12345678901', // TCKN
    name: 'Mustafa Kaya',
    address: 'Çamlıca Mah. No:15',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34676',
    // Sprint 9 — EnerjiPartyIdentificationPlakaCheck: SARJ/SARJANLIK'ta alıcıda
    // schemeID="PLAKA" olan TAM 1 adet kimlik zorunlu.
    identifications: [{ schemeId: 'PLAKA', value: '34ABC123' }],
  },

  // Sprint 9 — EnerjiInvoicePeriodCheck: dört alan da dolu olmalı, tarih >= 2005-01-01.
  invoicePeriod: {
    startDate: '2026-04-01',
    startTime: '00:00:00',
    endDate: '2026-04-23',
    endTime: '15:00:00',
  },

  // Sprint 9 — EnerjiESURaporIDCheck (yalnız SARJ): schemeID="ESURaporID" olan,
  // GUID formatında ID ve YYYY-MM-DD IssueDate taşıyan en az 1 referans.
  additionalDocuments: [{
    id: 'd4e5f6a7-b8c9-4012-8345-6789abcdef01',
    schemeId: 'ESURaporID',
    issueDate: '2026-04-23',
  }],

  lines: [
    {
      name: 'Elektrikli Araç DC Hızlı Şarj — 45 kWh',
      quantity: 45,
      price: 8,
      unitCode: 'Adet', // kWh için Adet proxy
      kdvPercent: 20,
    },
  ],
};

export default input;
