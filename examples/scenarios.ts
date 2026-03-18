/**
 * Tüm fatura senaryoları — SimpleInvoiceInput formatında.
 * Her senaryo farklı bir fatura tipi/profil/özellik kombinasyonunu gösterir.
 */
import type { SimpleInvoiceInput } from '../src/calculator/simple-types';

// ─── Ortak Taraflar ──────────────────────────────────────────────────────────

const senderVKN = {
  taxNumber: '1234567890',
  name: 'Demo Yazılım AŞ',
  taxOffice: 'Büyük Mükellefler VD',
  address: 'Levent Mah. Teknoloji Cad. No:42',
  district: 'Beşiktaş',
  city: 'İstanbul',
  zipCode: '34340',
  phone: '+902121234567',
  email: 'info@demoyazilim.com',
  website: 'https://demoyazilim.com',
  identifications: [
    { schemeId: 'MERSISNO', value: '0123456789012345' },
    { schemeId: 'TICARETSICILNO', value: '123456' },
  ],
};

const senderTCKN = {
  taxNumber: '12345678901',
  name: 'Ahmet Yılmaz',
  taxOffice: 'Kadıköy VD',
  address: 'Caferağa Mah. Moda Cad. No:15',
  district: 'Kadıköy',
  city: 'İstanbul',
};

const customerVKN = {
  taxNumber: '9876543210',
  name: 'Alıcı Ticaret Ltd. Şti.',
  taxOffice: 'Ankara Ulus VD',
  address: 'Kızılay Mah. Atatürk Bulvarı No:100',
  district: 'Çankaya',
  city: 'Ankara',
  zipCode: '06420',
  phone: '+903121234567',
  email: 'info@alicitic.com',
};

const customerTCKN = {
  taxNumber: '98765432109',
  name: 'Mehmet Demir',
  address: 'Bağdat Cad. No:200',
  district: 'Kadıköy',
  city: 'İstanbul',
};

const foreignCustomer = {
  taxNumber: '9999999999',
  name: 'Global Trade Inc.',
  taxOffice: 'Foreign Tax Office',
  address: '123 Commerce Street',
  district: 'Manhattan',
  city: 'New York',
  country: 'ABD',
  zipCode: '10001',
};

// ─── 1. Temel Satış Faturası ─────────────────────────────────────────────────

export const scenario01_temelSatis: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000001',
  datetime: '2025-02-15T10:30:00',
  notes: ['Bu bir temel satış faturasıdır.'],
  lines: [
    { name: 'Yazılım Lisansı', quantity: 1, price: 10000, kdvPercent: 20 },
    { name: 'Teknik Destek (Yıllık)', quantity: 12, price: 500, unitCode: 'Ay', kdvPercent: 20 },
    { name: 'Eğitim Hizmeti', quantity: 3, price: 2000, unitCode: 'Gün', kdvPercent: 20 },
  ],
};

// ─── 2. Ticari Fatura (override profil) ──────────────────────────────────────

export const scenario02_ticariFatura: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000002',
  profile: 'TICARIFATURA',
  notes: ['Ticari fatura — 30 gün vadeli.'],
  lines: [
    { name: 'Sunucu Donanımı', quantity: 2, price: 25000, kdvPercent: 20 },
    { name: 'Kurulum Hizmeti', quantity: 1, price: 5000, kdvPercent: 20 },
  ],
  orderReference: { id: 'SIP-2025-0042', issueDate: '2025-02-10' },
};

// ─── 3. İskontolu Fatura ────────────────────────────────────────────────────

export const scenario03_iskontoluFatura: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000003',
  notes: ['Tüm ürünlerde %10 kampanya indirimi uygulanmıştır.'],
  lines: [
    { name: 'Laptop', quantity: 5, price: 15000, kdvPercent: 20, allowancePercent: 10 },
    { name: 'Monitör', quantity: 10, price: 5000, kdvPercent: 20, allowancePercent: 15 },
    { name: 'Klavye-Mouse Set', quantity: 20, price: 500, kdvPercent: 20, allowancePercent: 5 },
  ],
};

// ─── 4. Çoklu KDV Oranlı Fatura ─────────────────────────────────────────────

export const scenario04_cokluKdvOranli: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000004',
  lines: [
    { name: 'Kitap', quantity: 10, price: 50, kdvPercent: 10 },
    { name: 'Elektronik Cihaz', quantity: 2, price: 8000, kdvPercent: 20 },
    { name: 'Gıda Ürünü', quantity: 100, price: 25, kdvPercent: 1 },
    { name: 'Temel Gıda', quantity: 50, price: 10, kdvPercent: 0 },
  ],
};

// ─── 5. ÖTV + KDV Fatura ────────────────────────────────────────────────────

export const scenario05_otvKdv: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000005',
  notes: ['ÖTV 1. liste ve KDV dahil fatura.'],
  lines: [
    {
      name: 'Akaryakıt (Benzin 95 Oktan)',
      quantity: 1000,
      price: 5,
      unitCode: 'Litre',
      kdvPercent: 20,
      taxes: [{ code: '0071', percent: 120 }],
    },
  ],
};

// ─── 6. ÖTV 2. Liste (Araç) ─────────────────────────────────────────────────

export const scenario06_otvArac: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000006',
  lines: [
    {
      name: 'Otomobil (1600cc altı)',
      quantity: 1,
      price: 500000,
      kdvPercent: 20,
      taxes: [{ code: '0073', percent: 80 }],
      description: '2025 Model Sedan',
      brand: 'TestOto',
      model: 'Sedan 1.4',
    },
  ],
};

// ─── 7. Damga Vergisi + KDV ─────────────────────────────────────────────────

export const scenario07_damgaVergisi: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000007',
  notes: ['Damga vergisi dahil fatura.'],
  lines: [
    {
      name: 'Danışmanlık Hizmeti',
      quantity: 1,
      price: 100000,
      kdvPercent: 20,
      taxes: [{ code: '1047', percent: 0.948 }],
    },
  ],
};

// ─── 8. Tevkifat Faturası ───────────────────────────────────────────────────

export const scenario08_tevkifat: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000008',
  notes: ['Yapım işleri ile bu işlere ilişkin mühendislik-mimarlık hizmetleri tevkifatı.'],
  lines: [
    {
      name: 'İnşaat Taahhüt İşi',
      quantity: 1,
      price: 200000,
      kdvPercent: 20,
      withholdingTaxCode: '601',
    },
    {
      name: 'Mimarlık Hizmeti',
      quantity: 1,
      price: 50000,
      kdvPercent: 20,
      withholdingTaxCode: '601',
    },
  ],
};

// ─── 9. Farklı Tevkifat Kodlu Çoklu Satır ──────────────────────────────────

export const scenario09_cokluTevkifat: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000009',
  lines: [
    {
      name: 'Temizlik Hizmeti',
      quantity: 1,
      price: 50000,
      kdvPercent: 20,
      withholdingTaxCode: '604',
    },
    {
      name: 'Güvenlik Hizmeti',
      quantity: 1,
      price: 80000,
      kdvPercent: 20,
      withholdingTaxCode: '606',
    },
    {
      name: 'Yemek Servisi',
      quantity: 1,
      price: 30000,
      kdvPercent: 10,
      withholdingTaxCode: '604',
    },
  ],
};

// ─── 10. İstisna Faturası ───────────────────────────────────────────────────

export const scenario10_istisna: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000010',
  kdvExemptionCode: '301',
  notes: ['Mal ihracatı kapsamında KDV istisnalı fatura.'],
  lines: [
    { name: 'İhraç Malı A', quantity: 100, price: 500, kdvPercent: 0 },
    { name: 'İhraç Malı B', quantity: 200, price: 250, kdvPercent: 0 },
  ],
};

// ─── 11. İhraç Kayıtlı Fatura ──────────────────────────────────────────────

export const scenario11_ihracKayitli: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000011',
  kdvExemptionCode: '701',
  notes: ['İhraç kayıtlı satış faturası.'],
  lines: [
    {
      name: 'Tekstil Ürünü (İhraç Kayıtlı)',
      quantity: 500,
      price: 200,
      kdvPercent: 0,
      delivery: {
        deliveryAddress: { address: 'Berlin Warehouse', district: 'Mitte', city: 'Berlin', country: 'Almanya' },
        gtipNo: '620342000000',
      },
    },
  ],
};

// ─── 12. İade Faturası ──────────────────────────────────────────────────────

export const scenario12_iade: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000012',
  type: 'IADE',
  billingReference: {
    id: 'DMY2025000000001',
    issueDate: '2025-01-15',
  },
  notes: ['Yazılım lisansı iade faturasıdır.'],
  lines: [
    { name: 'Yazılım Lisansı (İade)', quantity: 1, price: 10000, kdvPercent: 20 },
  ],
};

// ─── 13. Tevkifat İade Faturası ─────────────────────────────────────────────

export const scenario13_tevkifatIade: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000013',
  type: 'IADE',
  billingReference: {
    id: 'DMY2025000000008',
    issueDate: '2025-02-01',
  },
  notes: ['Tevkifatlı fatura iade.'],
  lines: [
    {
      name: 'İnşaat Taahhüt İşi (İade)',
      quantity: 1,
      price: 200000,
      kdvPercent: 20,
      withholdingTaxCode: '601',
    },
  ],
};

// ─── 14. Dövizli Fatura (USD) ───────────────────────────────────────────────

export const scenario14_dovizliUsd: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: foreignCustomer,
  id: 'DMY2025000000014',
  currencyCode: 'USD',
  exchangeRate: 32.50,
  notes: ['USD cinsinden düzenlenmiştir. Kur: 1 USD = 32.50 TRY'],
  lines: [
    { name: 'Software License (Annual)', quantity: 1, price: 5000, kdvPercent: 20 },
    { name: 'Technical Support', quantity: 12, price: 200, unitCode: 'Ay', kdvPercent: 20 },
  ],
};

// ─── 15. Dövizli Fatura (EUR) ───────────────────────────────────────────────

export const scenario15_dovizliEur: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: foreignCustomer,
  id: 'DMY2025000000015',
  currencyCode: 'EUR',
  exchangeRate: 35.20,
  lines: [
    { name: 'Consulting Service', quantity: 40, price: 150, unitCode: 'Saat', kdvPercent: 20 },
  ],
};

// ─── 16. TCKN Gönderici (Serbest Meslek) ────────────────────────────────────

export const scenario16_tcknGonderici: SimpleInvoiceInput = {
  sender: senderTCKN,
  customer: customerVKN,
  id: 'AHM2025000000001',
  notes: ['Serbest meslek makbuzu yerine geçen fatura.'],
  lines: [
    { name: 'Hukuk Danışmanlık Hizmeti', quantity: 1, price: 15000, kdvPercent: 20 },
  ],
};

// ─── 17. TCKN Alıcı ─────────────────────────────────────────────────────────

export const scenario17_tcknAlici: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerTCKN,
  id: 'DMY2025000000017',
  profile: 'EARSIVFATURA',
  lines: [
    { name: 'Kişisel Bilgisayar', quantity: 1, price: 30000, kdvPercent: 20 },
    { name: 'Yazıcı', quantity: 1, price: 5000, kdvPercent: 20 },
  ],
};

// ─── 18. Kamu Faturası ──────────────────────────────────────────────────────

export const scenario18_kamuFatura: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: {
    taxNumber: '1111111111',
    name: 'TC Sağlık Bakanlığı',
    taxOffice: 'Ankara Kamu VD',
    address: 'Bilkent Yerleşkesi',
    district: 'Çankaya',
    city: 'Ankara',
  },
  id: 'DMY2025000000018',
  profile: 'KAMU',
  paymentMeans: {
    meansCode: '42',
    accountNumber: 'TR760001234567890123456789',
    dueDate: '2025-03-15',
  },
  lines: [
    { name: 'Tıbbi Cihaz', quantity: 10, price: 5000, kdvPercent: 10 },
    { name: 'Ameliyat Seti', quantity: 5, price: 20000, kdvPercent: 10 },
  ],
};

// ─── 19. SGK Faturası ───────────────────────────────────────────────────────

export const scenario19_sgkFatura: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: {
    taxNumber: '7750409379',
    name: 'Sosyal Güvenlik Kurumu',
    taxOffice: 'SGK VD',
    address: 'SGK Merkez',
    district: 'Çankaya',
    city: 'Ankara',
  },
  id: 'DMY2025000000019',
  type: 'SGK',
  sgk: {
    type: 'SAGLIK_HAS',
    documentNo: 'SGK-2025-001',
    companyName: 'Demo Yazılım AŞ',
    companyCode: 'HST-001'
  },
  invoicePeriod: {
    startDate: '2025-01-01',
    endDate: '2025-01-31',
  },
  lines: [
    { name: 'Sağlık Hizmeti', quantity: 100, price: 150, kdvPercent: 10 },
  ],
};

// ─── 20. Özel Matrah Faturası ───────────────────────────────────────────────

export const scenario20_ozelMatrah: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000020',
  type: 'OZELMATRAH',
  kdvExemptionCode: '801',
  ozelMatrah: {
    percent: 20,
    taxable: 50000,
    amount: 10000,
  },
  notes: ['Özel matrah uygulamalı fatura.'],
  lines: [
    { name: 'İkinci El Taşıt Satışı', quantity: 1, price: 250000, kdvPercent: 0 },
  ],
};

// ─── 21. e-Arşiv Fatura ─────────────────────────────────────────────────────

export const scenario21_earsivFatura: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerTCKN,
  id: 'DMY2025000000021',
  profile: 'EARSIVFATURA',
  eArchiveInfo: { sendType: 'ELEKTRONIK' },
  notes: ['e-Arşiv fatura — elektronik gönderim.'],
  lines: [
    { name: 'Yazılım Aboneliği', quantity: 1, price: 1200, kdvPercent: 20 },
  ],
};

// ─── 22. İhracat Faturası ───────────────────────────────────────────────────

export const scenario22_ihracatFatura: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: {
    taxNumber: '0000000001',
    name: 'International Buyer GmbH',
    taxOffice: 'Berlin',
    address: 'Friedrichstrasse 123',
    district: 'Mitte',
    city: 'Berlin',
    country: 'Almanya',
  },
  id: 'DMY2025000000022',
  profile: 'IHRACAT',
  currencyCode: 'EUR',
  exchangeRate: 35.20,
  kdvExemptionCode: '301',
  buyerCustomer: {
    name: 'International Buyer GmbH',
    taxNumber: '0000000001',
    address: 'Friedrichstrasse 123',
    city: 'Berlin',
    district: 'Mitte',
    country: 'Almanya',
  },
  notes: ['İhracat faturası — FOB İstanbul'],
  lines: [
    {
      name: 'Makine Parçası',
      quantity: 50,
      price: 200,
      kdvPercent: 0,
      delivery: {
        deliveryAddress: { address: 'Hamburg Port', district: 'HafenCity', city: 'Hamburg', country: 'Almanya' },
        deliveryTermCode: 'FOB',
        gtipNo: '843149000000',
        transportModeCode: '1',
        packageQuantity: 5,
        packageTypeCode: 'CS',
      },
    },
    {
      name: 'Yedek Parça Seti',
      quantity: 100,
      price: 50,
      kdvPercent: 0,
      delivery: {
        deliveryAddress: { address: 'Hamburg Port', district: 'HafenCity', city: 'Hamburg', country: 'Almanya' },
        deliveryTermCode: 'FOB',
        gtipNo: '843149900000',
        transportModeCode: '1',
      },
    },
  ],
};

// ─── 23. Çok Satırlı Karmaşık Fatura ───────────────────────────────────────

export const scenario23_karmasikFatura: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000023',
  notes: ['Karmaşık fatura — çoklu KDV oranı, iskonto, ÖTV, farklı birimler.'],
  lines: [
    { name: 'Laptop (ÖTV\'li)', quantity: 10, price: 20000, kdvPercent: 20, allowancePercent: 5, taxes: [{ code: '0077', percent: 10 }] },
    { name: 'Ofis Mobilyası', quantity: 20, price: 3000, unitCode: 'Takım', kdvPercent: 20, allowancePercent: 8 },
    { name: 'Teknik Kitap', quantity: 50, price: 100, kdvPercent: 10 },
    { name: 'Temizlik Malzemesi', quantity: 200, price: 25, kdvPercent: 10, allowancePercent: 12 },
    { name: 'Kırtasiye', quantity: 500, price: 5, kdvPercent: 20 },
  ],
  orderReference: { id: 'PO-2025-KARMA', issueDate: '2025-02-01' },
  despatchReferences: [{ id: 'IRS2025000000001', issueDate: '2025-02-12' }],
};

// ─── 24. Sıfır KDV (Tam İstisna) ───────────────────────────────────────────

export const scenario24_sifirKdv: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000024',
  kdvExemptionCode: '325',
  notes: ['Diplomatik istisna kapsamında KDV %0 fatura.'],
  lines: [
    { name: 'Diplomatik Araç Satışı', quantity: 1, price: 500000, kdvPercent: 0 },
  ],
};

// ─── 25. Gelir Vergisi Stopajı + KDV ────────────────────────────────────────

export const scenario25_stopaj: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000025',
  notes: ['Gelir vergisi stopajı dahil fatura.'],
  lines: [
    {
      name: 'Kira Bedeli',
      quantity: 1,
      price: 50000,
      kdvPercent: 20,
      taxes: [{ code: '0003', percent: 20 }],
    },
  ],
};

// ─── 26. Birden Fazla Ek Vergi ──────────────────────────────────────────────

export const scenario26_cokluEkVergi: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000026',
  lines: [
    {
      name: 'İçki (Alkollü)',
      quantity: 100,
      price: 50,
      unitCode: 'Litre',
      kdvPercent: 20,
      taxes: [
        { code: '0071', percent: 200 },
        { code: '1047', percent: 0.948 },
      ],
    },
  ],
};

// ─── 27. Hizmet Faturası (Saat Birimli) ─────────────────────────────────────

export const scenario27_hizmetSaatlik: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000027',
  lines: [
    { name: 'Kıdemli Yazılımcı', quantity: 160, price: 500, unitCode: 'Saat', kdvPercent: 20 },
    { name: 'Junior Yazılımcı', quantity: 160, price: 250, unitCode: 'Saat', kdvPercent: 20 },
    { name: 'QA Mühendisi', quantity: 80, price: 350, unitCode: 'Saat', kdvPercent: 20 },
    { name: 'Proje Yöneticisi', quantity: 40, price: 600, unitCode: 'Saat', kdvPercent: 20 },
  ],
};

// ─── 28. Minimal Fatura (Tek Satır, Varsayılanlar) ──────────────────────────

export const scenario28_minimalFatura: SimpleInvoiceInput = {
  sender: { taxNumber: '1234567890', name: 'Min Firma AŞ', taxOffice: 'VD', address: 'Adres', district: 'İlçe', city: 'İl' },
  customer: { taxNumber: '9876543210', name: 'Min Alıcı AŞ', taxOffice: 'VD', address: 'Adres', district: 'İlçe', city: 'İl' },
  lines: [
    { name: 'Ürün', quantity: 1, price: 100, kdvPercent: 20 },
  ],
};

// ─── 29. Yüksek Tutarlı Fatura ──────────────────────────────────────────────

export const scenario29_yuksekTutarli: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000029',
  lines: [
    { name: 'Endüstriyel Tesis', quantity: 1, price: 50000000, kdvPercent: 20 },
    { name: 'Mühendislik Hizmeti', quantity: 1, price: 5000000, kdvPercent: 20, allowancePercent: 3 },
  ],
};

// ─── 30. Çok Satırlı İskontolu Tevkifat ────────────────────────────────────

export const scenario30_iskontoluTevkifat: SimpleInvoiceInput = {
  sender: senderVKN,
  customer: customerVKN,
  id: 'DMY2025000000030',
  lines: [
    {
      name: 'Yapı Denetim Hizmeti',
      quantity: 1,
      price: 100000,
      kdvPercent: 20,
      allowancePercent: 5,
      withholdingTaxCode: '606',
    },
    {
      name: 'Proje Kontrol Hizmeti',
      quantity: 1,
      price: 75000,
      kdvPercent: 20,
      allowancePercent: 10,
      withholdingTaxCode: '606',
    },
  ],
};

// ─── Tüm Senaryoları Export ──────────────────────────────────────────────────

export const allScenarios: { name: string; input: SimpleInvoiceInput }[] = [
  { name: '01-temel-satis', input: scenario01_temelSatis },
  { name: '02-ticari-fatura', input: scenario02_ticariFatura },
  { name: '03-iskontolu-fatura', input: scenario03_iskontoluFatura },
  { name: '04-coklu-kdv-oranli', input: scenario04_cokluKdvOranli },
  { name: '05-otv-kdv', input: scenario05_otvKdv },
  { name: '06-otv-arac', input: scenario06_otvArac },
  { name: '07-damga-vergisi', input: scenario07_damgaVergisi },
  { name: '08-tevkifat', input: scenario08_tevkifat },
  { name: '09-coklu-tevkifat', input: scenario09_cokluTevkifat },
  { name: '10-istisna', input: scenario10_istisna },
  { name: '11-ihrac-kayitli', input: scenario11_ihracKayitli },
  { name: '12-iade', input: scenario12_iade },
  { name: '13-tevkifat-iade', input: scenario13_tevkifatIade },
  { name: '14-dovizli-usd', input: scenario14_dovizliUsd },
  { name: '15-dovizli-eur', input: scenario15_dovizliEur },
  { name: '16-tckn-gonderici', input: scenario16_tcknGonderici },
  { name: '17-tckn-alici', input: scenario17_tcknAlici },
  { name: '18-kamu-fatura', input: scenario18_kamuFatura },
  { name: '19-sgk-fatura', input: scenario19_sgkFatura },
  { name: '20-ozel-matrah', input: scenario20_ozelMatrah },
  { name: '21-earsiv-fatura', input: scenario21_earsivFatura },
  { name: '22-ihracat-fatura', input: scenario22_ihracatFatura },
  { name: '23-karmasik-fatura', input: scenario23_karmasikFatura },
  { name: '24-sifir-kdv', input: scenario24_sifirKdv },
  { name: '25-stopaj', input: scenario25_stopaj },
  { name: '26-coklu-ek-vergi', input: scenario26_cokluEkVergi },
  { name: '27-hizmet-saatlik', input: scenario27_hizmetSaatlik },
  { name: '28-minimal-fatura', input: scenario28_minimalFatura },
  { name: '29-yuksek-tutarli', input: scenario29_yuksekTutarli },
  { name: '30-iskontolu-tevkifat', input: scenario30_iskontoluTevkifat },
];
