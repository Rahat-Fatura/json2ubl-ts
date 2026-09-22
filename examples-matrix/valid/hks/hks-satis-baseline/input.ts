import type { SimpleInvoiceInput } from '../../../../src';

export const input: SimpleInvoiceInput = {
  id: 'MTX2026000000063',
  uuid: 'a1000063-0001-4000-8001-000000000063',
  datetime: '2026-04-24T10:00:00',
  profile: 'HKS',
  type: 'SATIS',
  currencyCode: 'TRY',
  sender: {
    taxNumber: '1234567890',
    name: 'Matrix Sebze Meyve Tic.',
    taxOffice: 'Beşiktaş',
    address: 'Hal Kompleksi Blok 5',
    district: 'Bayrampaşa',
    city: 'İstanbul',
  },
  customer: {
    taxNumber: '9876543210',
    name: 'Matrix Market Zinciri Ltd.',
    taxOffice: 'Kadıköy',
    address: 'Bağdat Cad. No:100',
    district: 'Kadıköy',
    city: 'İstanbul',
  },
  lines: [
    {
      name: 'Domates — Standart',
      quantity: 500,
      price: 20,
      unitCode: 'KGM',
      kdvPercent: 10,
      additionalItemIdentifications: [
        {
          schemeId: 'KUNYENO',
          value: 'KUN-2026-MTX63-DOM1',
        },
        // Mal sahibi ikilisi HKS+SATIS'te ZORUNLU (K9) — GİB'in kendi
        // HKS-Ornek1.xml'i de üç kimliği birden taşır.
        {
          schemeId: 'MALSAHIBIADSOYADUNVAN',
          value: 'Hasan Çiftçi',
        },
        {
          schemeId: 'MALSAHIBIVKNTCKN',
          value: '11223344556',
        },
      ],
    },
  ],
};

export default input;
