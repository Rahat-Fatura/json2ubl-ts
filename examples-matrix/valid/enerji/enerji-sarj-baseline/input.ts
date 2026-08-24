import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000065',
  uuid: 'a1000065-0001-4000-8001-000000000065',
  datetime: '2026-04-24T10:00:00',
  profile: 'ENERJI',
  type: 'SARJ',
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
    taxNumber: '12345678901',
    name: 'Matrix Araç Sürücüsü',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
    // Sprint 9 — EnerjiPartyIdentificationPlakaCheck: TAM 1 adet PLAKA zorunlu
    identifications: [{ schemeId: 'PLAKA', value: '34ABC123' }],
  },
  // Sprint 9 — EnerjiInvoicePeriodCheck: 4 alan dolu, tarih >= 2005-01-01
  invoicePeriod: {
    startDate: '2026-04-01',
    startTime: '00:00:00',
    endDate: '2026-04-24',
    endTime: '10:00:00',
  },
  // Sprint 9 — EnerjiESURaporIDCheck (yalnız SARJ)
  additionalDocuments: [{
    id: 'a1b2c3d4-e5f6-4789-8abc-def012345678',
    schemeId: 'ESURaporID',
    issueDate: '2026-04-24',
  }],
  lines: [
    {
      name: 'EV DC Hızlı Şarj 45 kWh',
      quantity: 45,
      price: 8,
      unitCode: 'KWH',
      kdvPercent: 20,
    },
  ],
};

export default input;
