import type { SimpleInvoiceInput } from '../../src';

/**
 * KAMU + TEVKIFAT — kamu kurumuna KDV tevkifatlı hizmet satışı.
 * Kamu kurumları genelde yapım/hizmet alımında tevkifat kesintisi uygular.
 */
export const input: SimpleInvoiceInput = {
  id: 'EXA2026000000016',
  uuid: 'e1a2b3c4-0016-4000-8016-000000000016',
  datetime: '2026-04-23T11:00:00',
  profile: 'KAMU',
  type: 'TEVKIFAT',
  currencyCode: 'TRY',

  sender: {
    taxNumber: '1234567890',
    name: 'Sınır Tanımaz Müteahhitlik A.Ş.',
    taxOffice: 'Üsküdar',
    address: 'Barbaros Bulvarı No:123 Kat:5',
    district: 'Üsküdar',
    city: 'İstanbul',
    zipCode: '34664',
  },

  customer: {
    taxNumber: '1460415308',
    name: 'T.C. Çevre ve Şehircilik Bakanlığı',
    taxOffice: 'Çankaya',
    address: 'Mustafa Kemal Mah. Dumlupınar Bulvarı No:1',
    district: 'Çankaya',
    city: 'Ankara',
    zipCode: '06800',
  },

  buyerCustomer: {
    name: 'Kamu İhale Kurumu — Aracı',
    taxNumber: '3333333333',
    address: 'Mevlana Bulvarı No:233',
    district: 'Çankaya',
    city: 'Ankara',
    country: 'Türkiye',
    zipCode: '06520',
    identifications: [
      { schemeId: 'MUSTERINO', value: 'KAMU-MUSTERI-2026-000042' },
    ],
  },

  paymentMeans: {
    meansCode: '42',
    accountNumber: 'TR330006100519786457841326',
    dueDate: '2026-05-23',
  },

  lines: [
    {
      name: 'İnşaat Yapım Hizmeti — Binanın Restorasyonu',
      quantity: 1,
      price: 10000,
      unitCode: 'Adet',
      kdvPercent: 20,
      withholdingTaxCode: '601', // Yapım/Mühendislik %40
    },
  ],
};

export default input;
