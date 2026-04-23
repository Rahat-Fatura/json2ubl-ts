import type { SimpleInvoiceInput } from '../../src';

/**
 * TEMELFATURA + IADE senaryosu. Schematron IADEInvioceCheck:
 * - `billingReference.id` 16 karakter (orijinal fatura ID)
 * - `documentTypeCode` otomatik 'IADE' atanır (simple-mapper sabit)
 * - Satır tutarları POZİTİF (negatif değil); tip=IADE bunu "tersine çalışan" fatura yapar.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000004',
  uuid: 'e1a2b3c4-0004-4000-8004-000000000004',
  datetime: '2026-04-23T11:00:00',
  profile: 'TEMELFATURA',
  type: 'IADE',
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

  // Orijinal faturaya referans — IADE grubu için zorunlu (Schematron IADEInvioceCheck)
  billingReference: {
    id: 'EXA2026000000001', // 01-temelfatura-satis'in ID'si
    issueDate: '2026-04-23',
  },

  lines: [
    {
      name: 'Demo Ürün — İade (10 adet geri döndü)',
      quantity: 10,
      price: 50,
      unitCode: 'Adet',
      kdvPercent: 20,
    },
  ],
};

export default input;
