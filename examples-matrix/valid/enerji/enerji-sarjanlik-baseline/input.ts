import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000066',
  uuid: 'a1000066-0001-4000-8001-000000000066',
  datetime: '2026-04-24T10:00:00',
  profile: 'ENERJI',
  type: 'SARJANLIK',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Şarj Operatörü A.Ş.',
    taxOffice: 'Beşiktaş',
    address: 'Levent Mah. No:42',
    district: 'Beşiktaş',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Test Alıcı Ltd.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
    // Sprint 9 — EnerjiPartyIdentificationPlakaCheck: TAM 1 adet PLAKA zorunlu
    identifications: [{ schemeId: 'PLAKA', value: '06ANK042' }],
  },
  // Sprint 9 — EnerjiInvoicePeriodCheck
  invoicePeriod: {
    startDate: '2026-04-01',
    startTime: '00:00:00',
    endDate: '2026-04-24',
    endTime: '18:30:00',
  },
  // NOT: EnerjiESURaporIDCheck yalnız SARJ tipine uygulanır — SARJANLIK'ta
  // ESURaporID referansı ZORUNLU DEĞİLDİR (bilinçli olarak eklenmedi).
  lines: [
    {
      name: 'EV AC şarj anlık',
      quantity: 20,
      price: 5,
      unitCode: 'KWH',
      kdvPercent: 20,
      // Sprint 9 — EnerjiItemInstanceSerialIDCheck: SARJANLIK'ta HER satırda
      // Item/ItemInstance/SerialID dolu olmalı.
      serialId: 'ESU-SN-000420',
    },
  ],
};

export default input;
