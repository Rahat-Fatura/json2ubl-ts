import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000071',
  uuid: 'a1000071-0001-4000-8001-000000000071',
  datetime: '2026-04-24T10:00:00',
  profile: 'ILAC_TIBBICIHAZ',
  type: 'ISTISNA',
  currencyCode: 'TRY',
  kdvExemptionCode: '213',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Test Satıcı A.Ş.',
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
  },
  lines: [
    {
      name: 'Tıbbi cihaz',
      quantity: 1,
      price: 1000,
      unitCode: 'Adet',
      kdvPercent: 0,
      additionalItemIdentifications: [
        {
          schemeId: 'TIBBICIHAZ',
          value: 'MED-MTX-071-001',
        },
      ],
    },
  ],
};

export default input;
