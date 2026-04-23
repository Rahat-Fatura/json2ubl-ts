import type { SimpleInvoiceInput } from '../../src';

/** notes + orderReference + paymentMeans üçlüsü. */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000032',
  uuid: 'e1a2b3c4-0032-4000-8032-000000000032',
  datetime: '2026-04-23T10:00:00',
  profile: 'TEMELFATURA',
  type: 'SATIS',
  currencyCode: 'TRY',

  notes: [
    'İşbu fatura karşı tarafın kabul ettiği ticari faturadır.',
    'Teslimat koşulu: Fabrikadan işaret çıkış.',
  ],

  orderReference: {
    id: 'PO-2026-04-000099',
    issueDate: '2026-04-15',
  },

  sender: {
    taxNumber: '1234567890', name: 'Sınır Tanımaz A.Ş.', taxOffice: 'Üsküdar',
    address: 'Barbaros No:1', district: 'Üsküdar', city: 'İstanbul', zipCode: '34664',
  },
  customer: {
    taxNumber: '9876543210', name: 'Yeşil Alıcı Ltd.', taxOffice: 'Kadıköy',
    address: 'Bağdat No:2', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710',
  },

  paymentMeans: {
    meansCode: '42',
    accountNumber: 'TR330006100519786457841326',
    dueDate: '2026-05-23',
    paymentNote: '30 gün vadeli',
  },

  lines: [
    { name: 'Sipariş Kalem A', quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: 20 },
  ],
};

export default input;
