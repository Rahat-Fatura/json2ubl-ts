import type { SimpleInvoiceInput } from '../../src';

/** %1, %10, %20 KDV oranlarının tek faturada karışımı. */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000028',
  uuid: 'e1a2b3c4-0028-4000-8028-000000000028',
  datetime: '2026-04-23T10:00:00',
  profile: 'TEMELFATURA',
  type: 'SATIS',
  currencyCode: 'TRY',

  sender: {
    taxNumber: '1234567890', name: 'Sınır Tanımaz A.Ş.', taxOffice: 'Üsküdar',
    address: 'Barbaros No:1', district: 'Üsküdar', city: 'İstanbul', zipCode: '34664',
  },
  customer: {
    taxNumber: '9876543210', name: 'Yeşil Alıcı Ltd.', taxOffice: 'Kadıköy',
    address: 'Bağdat No:2', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710',
  },

  lines: [
    { name: 'Temel Gıda', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 1 },
    { name: 'İndirimli KDV', quantity: 10, price: 20, unitCode: 'Adet', kdvPercent: 10 },
    { name: 'Standart KDV', quantity: 10, price: 30, unitCode: 'Adet', kdvPercent: 20 },
  ],
};

export default input;
