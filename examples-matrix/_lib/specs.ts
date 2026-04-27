/**
 * Sprint 8e — Hardcoded scenario spec array'leri.
 *
 * Hedef: 164 valid + 108 invalid = 272 spec.
 *
 * Sprint disiplini: spec'ler explicit yazılır (generator fonksiyonları değil).
 * Diff-friendly, Berkay tek tek okuyabilir. Dosya ~1500+ satıra ulaşırsa
 * `specs/<profile>.ts` parçalara bölünür (Sprint 8e içi karar).
 *
 * Slug kuralı:
 *   - Valid invoice: `<profile-lowercase>-<type-lowercase>-<variantSlug>`
 *     Klasör: `valid/<profile-lowercase>/<slug>/`
 *   - Valid despatch: `<profile-lowercase>-<type-lowercase>-<variantSlug>`
 *     Klasör: `valid/<profile-lowercase>/<slug>/`
 *   - Invalid: `<error-code-slug>-<variantSlug>`
 *     Klasör: `invalid/<error-code-slug>/<slug>/`
 *     (`<error-code-slug>` = primaryCode lowercase'ed, `_` → `-`)
 */

import type { ValidSpec, InvalidSpec } from './scenario-spec';
import type { SimplePartyInput } from '../../src/calculator/simple-types';

/**
 * Tekrarı azaltmak için standart sender/customer template'leri.
 * Spec içinde `sender: STANDARD_SENDER` gibi kullanılır, override gereken
 * field'lar spread sonrası eklenir.
 */
const STANDARD_SENDER: SimplePartyInput = {
  taxNumber: '1234567890',
  name: 'Matrix Test Satıcı A.Ş.',
  taxOffice: 'Beşiktaş',
  address: 'Levent Mah. No:42',
  district: 'Beşiktaş',
  city: 'İstanbul',
};

const STANDARD_CUSTOMER: SimplePartyInput = {
  taxNumber: '9876543210',
  name: 'Matrix Test Alıcı Ltd.',
  taxOffice: 'Kadıköy',
  address: 'Bağdat Cad. No:100',
  district: 'Kadıköy',
  city: 'İstanbul',
};

/** KAMU profili için aracı kurum template'i (BuyerCustomerParty). */
const KAMU_BUYER_CUSTOMER = {
  name: 'Matrix Kamu Aracı Kurumu',
  taxNumber: '3333333333',
  address: 'Mevlana Bulvarı No:233',
  district: 'Çankaya',
  city: 'Ankara',
  country: 'Türkiye',
  identifications: [
    { schemeId: 'MUSTERINO', value: 'KAMU-MUSTERI-2026-MTX' },
  ],
};

/** KAMU profili için PaymentMeans template'i (TR IBAN). */
const KAMU_PAYMENT_MEANS = {
  meansCode: '42',
  accountNumber: 'TR330006100519786457841326',
  dueDate: '2026-05-24',
};

export const validSpecs: ValidSpec[] = [
  // ───────────────────────────────────────────────────────────────────────
  // TEMELFATURA — 32 senaryo (10 baseline + 12 tip-özel + 10 feature cross)
  // ───────────────────────────────────────────────────────────────────────

  // TEMELFATURA+SATIS — baseline + feature varyantları
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    notes: 'Baseline — TEMELFATURA+SATIS, tek satır %20 KDV, TRY',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000001',
      uuid: 'a1000001-0001-4000-8001-000000000001',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
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
          name: 'Demo hizmet — %20 KDV',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'coklu-kdv',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    notes: 'Çoklu satır — karışık KDV oranları (%0 kodsuz 351, %10, %20)',
    dimensions: {
      kdvBreakdown: [0, 10, 20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: ['351'],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 3,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000002',
      uuid: 'a1000002-0001-4000-8001-000000000002',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      kdvExemptionCode: '351',
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
          name: 'İstisnalı hizmet — %0 (351)',
          quantity: 1,
          price: 500,
          unitCode: 'Adet',
          kdvPercent: 0,
        },
        {
          name: 'İndirimli ürün — %10',
          quantity: 2,
          price: 250,
          unitCode: 'Adet',
          kdvPercent: 10,
        },
        {
          name: 'Genel hizmet — %20',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'eur-doviz',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    notes: 'Yabancı para birimi — EUR + ExchangeRate 35.5',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'EUR',
      exchangeRate: true,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000003',
      uuid: 'a1000003-0001-4000-8001-000000000003',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'EUR',
      exchangeRate: 35.5,
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
          name: 'Yazılım lisansı — EUR ödeme',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },

  // TEMELFATURA+IADE baseline — BillingReference zorunlu
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'IADE',
    notes: 'Baseline — TEMELFATURA+IADE, orijinal faturaya referans (BillingReference zorunlu)',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: ['billingReference'],
    },
    input: {
      id: 'MTX2026000000004',
      uuid: 'a1000004-0001-4000-8001-000000000004',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'IADE',
      currencyCode: 'TRY',
      billingReference: {
        id: 'MTX2026000000001',
        issueDate: '2026-04-24',
      },
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
          name: 'İade edilen hizmet',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },

  // TEMELFATURA+TEVKIFAT baseline — withholdingTaxCode zorunlu
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'TEVKIFAT',
    notes: 'Baseline — TEMELFATURA+TEVKIFAT, kod 603 (%70 bakım-onarım)',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: ['603'],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000005',
      uuid: 'a1000005-0001-4000-8001-000000000005',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'TEVKIFAT',
      currencyCode: 'TRY',
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
          name: 'Bakım-onarım hizmeti — %70 tevkifat',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
          withholdingTaxCode: '603',
        },
      ],
    },
  },

  // TEMELFATURA+TEVKIFATIADE baseline — Sprint 8f.1'de Bug #1 fix sonrası reaktive edildi.
  // BillingReference (iade semantiği) + withholdingTaxCode (tevkifat semantiği) birlikte.
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'TEVKIFATIADE',
    notes: 'Baseline — TEMELFATURA+TEVKIFATIADE, kod 603 %70 (iade+tevkifat kombinasyonu)',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: ['603'],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000901',
      uuid: 'a1000901-0001-4000-8001-000000000901',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'TEVKIFATIADE',
      currencyCode: 'TRY',
      billingReference: {
        id: 'MTX2026000000005',
        issueDate: '2026-04-24',
      },
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
          name: 'Bakım-onarım iade — %70 tevkifat',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
          withholdingTaxCode: '603',
        },
      ],
    },
  },

  // TEMELFATURA+ISTISNA baseline — 213 (gemi/uçak yakıt/bakım istisnası)
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'ISTISNA',
    notes: 'Baseline — TEMELFATURA+ISTISNA, kod 213 (deniz/hava taşıtları için yapılan tadil)',
    dimensions: {
      kdvBreakdown: [0],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: ['213'],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000007',
      uuid: 'a1000007-0001-4000-8001-000000000007',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
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
          name: 'Deniz taşıtı tadil hizmeti',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 0,
        },
      ],
    },
  },

  // TEMELFATURA+OZELMATRAH baseline — 801 (kullanılmış binek otomobil)
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'OZELMATRAH',
    notes: 'Baseline — TEMELFATURA+OZELMATRAH, kod 801 (kullanılmış binek otomobil KDV)',
    dimensions: {
      kdvBreakdown: [0],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: ['801'],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: ['ozelMatrah'],
    },
    input: {
      id: 'MTX2026000000008',
      uuid: 'a1000008-0001-4000-8001-000000000008',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'OZELMATRAH',
      currencyCode: 'TRY',
      kdvExemptionCode: '801',
      ozelMatrah: {
        percent: 18,
        taxable: 500,
        amount: 90,
      },
      sender: {
        taxNumber: '1234567890',
        name: 'Matrix Test Oto A.Ş.',
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
          name: '2019 Model İkinci El Binek Otomobil',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 0,
        },
      ],
    },
  },

  // TEMELFATURA+IHRACKAYITLI baseline — 702 (DİİB) + GTİP + ALICIDIBKOD
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'IHRACKAYITLI',
    notes: 'Baseline — TEMELFATURA+IHRACKAYITLI, kod 702 (DİİB) + GTİP 12 hane + ALICIDIBKOD 11 hane',
    dimensions: {
      kdvBreakdown: [0],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: ['702'],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: ['gtip', 'alicidibkod'],
    },
    input: {
      id: 'MTX2026000000009',
      uuid: 'a1000009-0001-4000-8001-000000000009',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'IHRACKAYITLI',
      currencyCode: 'TRY',
      kdvExemptionCode: '702',
      sender: {
        taxNumber: '1234567890',
        name: 'Matrix Test İhracatçı A.Ş.',
        taxOffice: 'Beşiktaş',
        address: 'Levent Mah. No:42',
        district: 'Beşiktaş',
        city: 'İstanbul',
      },
      customer: {
        taxNumber: '9876543210',
        name: 'Matrix Test Aracı İhracat A.Ş.',
        taxOffice: 'Kadıköy',
        address: 'Bağdat Cad. No:100',
        district: 'Kadıköy',
        city: 'İstanbul',
      },
      lines: [
        {
          name: 'İhraç kayıtlı tekstil ürünü',
          quantity: 10,
          price: 100,
          unitCode: 'Adet',
          kdvPercent: 0,
          delivery: {
            gtipNo: '620342000010',
            alicidibsatirkod: '12345678901',
            deliveryAddress: {
              address: 'İhracat Serbest Bölgesi',
              district: 'Ambarlı',
              city: 'İstanbul',
              country: 'Türkiye',
            },
          },
        },
      ],
    },
  },

  // TEMELFATURA+SGK baseline — sgk objesi zorunlu
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'SGK',
    notes: 'Baseline — TEMELFATURA+SGK, SAGLIK_ECZ (eczane reçetesi)',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: ['sgk'],
    },
    input: {
      id: 'MTX2026000000010',
      uuid: 'a1000010-0001-4000-8001-000000000010',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SGK',
      currencyCode: 'TRY',
      sgk: {
        type: 'SAGLIK_ECZ',
        documentNo: 'SGK-ECZ-2026-MTX001',
        companyName: 'Matrix Test Eczane Ltd.',
        companyCode: 'SGK-COMP-MTX',
      },
      sender: {
        taxNumber: '1234567890',
        name: 'Matrix Test Eczane Ltd.',
        taxOffice: 'Beşiktaş',
        address: 'Levent Mah. No:42',
        district: 'Beşiktaş',
        city: 'İstanbul',
      },
      customer: {
        taxNumber: '9876543210',
        name: 'Sosyal Güvenlik Kurumu',
        taxOffice: 'Kadıköy',
        address: 'SGK Bölge Müdürlüğü',
        district: 'Kadıköy',
        city: 'İstanbul',
      },
      lines: [
        {
          name: 'Reçeteli ilaç',
          quantity: 10,
          price: 100,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },

  // TEMELFATURA+KOMISYONCU baseline
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'KOMISYONCU',
    notes: 'Baseline — TEMELFATURA+KOMISYONCU, komisyoncu satış',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000011',
      uuid: 'a1000011-0001-4000-8001-000000000011',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'KOMISYONCU',
      currencyCode: 'TRY',
      sender: {
        taxNumber: '1234567890',
        name: 'Matrix Test Komisyoncu A.Ş.',
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
          name: 'Komisyoncu hizmet bedeli',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },

  // TEMELFATURA+KONAKLAMAVERGISI baseline
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TEMELFATURA',
    type: 'KONAKLAMAVERGISI',
    notes: 'Baseline — TEMELFATURA+KONAKLAMAVERGISI, konaklama vergisi',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: ['accommodationTax'],
    },
    input: {
      id: 'MTX2026000000012',
      uuid: 'a1000012-0001-4000-8001-000000000012',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'KONAKLAMAVERGISI',
      currencyCode: 'TRY',
      sender: {
        taxNumber: '1234567890',
        name: 'Matrix Test Otel A.Ş.',
        taxOffice: 'Beşiktaş',
        address: 'Levent Mah. No:42',
        district: 'Beşiktaş',
        city: 'İstanbul',
      },
      customer: {
        taxNumber: '9876543210',
        name: 'Matrix Test Misafir A.Ş.',
        taxOffice: 'Kadıköy',
        address: 'Bağdat Cad. No:100',
        district: 'Kadıköy',
        city: 'İstanbul',
      },
      lines: [
        {
          name: 'Konaklama — 2 gece',
          quantity: 2,
          price: 500,
          unitCode: 'Gece',
          kdvPercent: 20,
        },
      ],
    },
  },

  // ─── TEMELFATURA Tip-özel varyantlar + feature cross (8e.3) ───
  // TEMELFATURA+ISTISNA kod 201 — diplomatik istisna
  {
    kind: 'invoice',
    variantSlug: 'kod-201',
    profile: 'TEMELFATURA',
    type: 'ISTISNA',
    notes: 'İstisna kodu 201 — diplomatik temsilci/konsolosluk',
    dimensions: {
      kdvBreakdown: [0],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: ['201'],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000013',
      uuid: 'a1000013-0001-4000-8001-000000000013',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'ISTISNA',
      currencyCode: 'TRY',
      kdvExemptionCode: '201',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, name: 'Matrix Diplomatik Temsilci' },
      lines: [
        {
          name: 'Diplomatik hizmet',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 0,
        },
      ],
    },
  },

  // TEMELFATURA+ISTISNA kod 301 — Türkiye dışı teslim
  {
    kind: 'invoice',
    variantSlug: 'kod-301',
    profile: 'TEMELFATURA',
    type: 'ISTISNA',
    notes: 'İstisna kodu 301 — Türkiye dışında gerçekleşen ifa',
    dimensions: {
      kdvBreakdown: [0],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: ['301'],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000014',
      uuid: 'a1000014-0001-4000-8001-000000000014',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'ISTISNA',
      currencyCode: 'TRY',
      kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        {
          name: 'Yurt dışı danışmanlık',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 0,
        },
      ],
    },
  },

  // TEMELFATURA+TEVKIFAT 650 dinamik stopaj %50
  {
    kind: 'invoice',
    variantSlug: 'dinamik-650',
    profile: 'TEMELFATURA',
    type: 'TEVKIFAT',
    notes: 'TEVKIFAT + 650 dinamik kod, kullanıcı belirlediği %50 oran',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: ['650'],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000015',
      uuid: 'a1000015-0001-4000-8001-000000000015',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'TEVKIFAT',
      currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        {
          name: 'Dinamik tevkifatlı hizmet',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
          withholdingTaxCode: '650',
          withholdingTaxPercent: 50,
        },
      ],
    },
  },

  // TEMELFATURA+TEVKIFATIADE 650 dinamik varyantı — Sprint 8f.4
  {
    kind: 'invoice',
    variantSlug: 'dinamik-650',
    profile: 'TEMELFATURA',
    type: 'TEVKIFATIADE',
    notes: 'TEVKIFATIADE + 650 dinamik kod %50 — iade+tevkifat kombinasyonunda dinamik yüzde',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['650'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000909',
      uuid: 'a1000909-0001-4000-8001-000000000909',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'TEVKIFATIADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000015', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        {
          name: 'Dinamik tevkifat iade — %50',
          quantity: 1, price: 1000, unitCode: 'Adet',
          kdvPercent: 20, withholdingTaxCode: '650', withholdingTaxPercent: 50,
        },
      ],
    },
  },

  // TEMELFATURA+SATIS USD döviz
  {
    kind: 'invoice',
    variantSlug: 'usd-doviz',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    notes: 'Yabancı para birimi — USD + ExchangeRate 32.1',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'USD',
      exchangeRate: true,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000016',
      uuid: 'a1000016-0001-4000-8001-000000000016',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'USD',
      exchangeRate: 32.1,
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        {
          name: 'USD ödeme — yazılım hizmeti',
          quantity: 1,
          price: 500,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },

  // TEMELFATURA+SATIS çoklu satır tek KDV
  {
    kind: 'invoice',
    variantSlug: 'coklu-satir',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    notes: 'Çoklu satır — 3 satır aynı KDV %20',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 3,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000017',
      uuid: 'a1000017-0001-4000-8001-000000000017',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'Ürün A', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20 },
        { name: 'Ürün B', quantity: 2, price: 200, unitCode: 'Adet', kdvPercent: 20 },
        { name: 'Ürün C', quantity: 5, price: 50, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },

  // TEMELFATURA+SATIS Note + OrderReference
  {
    kind: 'invoice',
    variantSlug: 'not-siparis',
    profile: 'TEMELFATURA',
    type: 'SATIS',
    notes: 'Fatura notları + OrderReference + DespatchReference referansları',
    dimensions: {
      kdvBreakdown: [20],
      currency: 'TRY',
      exchangeRate: false,
      exemptionCodes: [],
      withholdingCodes: [],
      allowanceCharge: { line: false, document: false },
      lineCount: 1,
      paymentMeans: false,
      reducedKdvGate: false,
      phantomKdv: false,
      specialIdentifiers: ['orderReference', 'despatchReference'],
    },
    input: {
      id: 'MTX2026000000018',
      uuid: 'a1000018-0001-4000-8001-000000000018',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      notes: [
        'Sözleşme no: SOZ-2026-0042',
        'Ödeme: 30 gün vadeli',
      ],
      orderReference: {
        id: 'ORD-2026-0042',
        issueDate: '2026-04-20',
      },
      despatchReferences: [
        { id: 'IRS-2026-001', issueDate: '2026-04-22' },
      ],
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        {
          name: 'Sözleşme kapsamı hizmet',
          quantity: 1,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },

  // ─── Sprint 8f.5: TEMELFATURA genişletme (+8) ───
  // 1. TEMELFATURA+SATIS %10 KDV
  {
    kind: 'invoice', variantSlug: 'kdv-10', profile: 'TEMELFATURA', type: 'SATIS',
    notes: 'TEMELFATURA+SATIS %10 KDV (gıda / temel ihtiyaç kategorisi)',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000911',
      uuid: 'a1000911-0001-4000-8001-000000000911',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Temel gıda ürünü', quantity: 10, price: 100, unitCode: 'Kg', kdvPercent: 10 }],
    },
  },
  // 2. TEMELFATURA+SATIS %1 KDV
  {
    kind: 'invoice', variantSlug: 'kdv-1', profile: 'TEMELFATURA', type: 'SATIS',
    notes: 'TEMELFATURA+SATIS %1 KDV (ekmek, süt gibi düşük kategori)',
    dimensions: {
      kdvBreakdown: [1], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000912',
      uuid: 'a1000912-0001-4000-8001-000000000912',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Ekmek', quantity: 100, price: 5, unitCode: 'Adet', kdvPercent: 1 }],
    },
  },
  // 3. TEMELFATURA+IADE çoklu KDV
  {
    kind: 'invoice', variantSlug: 'coklu-kdv', profile: 'TEMELFATURA', type: 'IADE',
    notes: 'IADE çoklu KDV (%10 + %20) — satır bazında farklı oran',
    dimensions: {
      kdvBreakdown: [10, 20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 2, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000913',
      uuid: 'a1000913-0001-4000-8001-000000000913',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'IADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000001', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'İade gıda', quantity: 5, price: 50, unitCode: 'Kg', kdvPercent: 10 },
        { name: 'İade hizmet', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },
  // 4. TEMELFATURA+TEVKIFAT kod 801 %100 tam tevkifat
  {
    kind: 'invoice', variantSlug: 'tam-tevkifat-801', profile: 'TEMELFATURA', type: 'TEVKIFAT',
    notes: 'Tam tevkifat — kod 801 %100 (örn. yolcu taşıma, özel sektör→kamu)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['801'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000914',
      uuid: 'a1000914-0001-4000-8001-000000000914',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Yolcu taşıma hizmeti', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '801' }],
    },
  },
  // 5. TEMELFATURA+ISTISNA çoklu satır
  {
    kind: 'invoice', variantSlug: 'istisna-coklu-satir', profile: 'TEMELFATURA', type: 'ISTISNA',
    notes: 'ISTISNA — 3 satır, aynı exemption kod 213 (deniz/hava tadil)',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['213'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 3, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000915',
      uuid: 'a1000915-0001-4000-8001-000000000915',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '213',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'Gemi bakım parçası A', quantity: 2, price: 500, unitCode: 'Adet', kdvPercent: 0 },
        { name: 'Gemi bakım parçası B', quantity: 1, price: 1200, unitCode: 'Adet', kdvPercent: 0 },
        { name: 'Uçak parçası C', quantity: 3, price: 800, unitCode: 'Adet', kdvPercent: 0 },
      ],
    },
  },
  // 6. TEMELFATURA+IHRACKAYITLI kod 701 (KDV 0 — 701 kodu tüm satır KDV=0 gerekli)
  {
    kind: 'invoice', variantSlug: 'ihrac-701', profile: 'TEMELFATURA', type: 'IHRACKAYITLI',
    notes: 'IHRACKAYITLI — kod 701 (DİİB dışı) + GTİP, KDV=0 (701 kodu KDV 0 zorunlu)',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['701'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['gtip', 'alicidibkod'],
    },
    input: {
      id: 'MTX2026000000916',
      uuid: 'a1000916-0001-4000-8001-000000000916',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '701',
      sender: { ...STANDARD_SENDER },
      customer: {
        ...STANDARD_CUSTOMER,
        identifications: [{ schemeId: 'ARACIKURUMVKN', value: 'DIB20260001' }],
      },
      lines: [{
        name: 'İhraç kayıtlı ürün',
        quantity: 100, price: 50, unitCode: 'Adet', kdvPercent: 0,
        kdvExemptionCode: '701',
        gtip: '8471300000',
      }],
    },
  },
  // 7. TEMELFATURA+SGK çoklu satır
  {
    kind: 'invoice', variantSlug: 'sgk-coklu-satir', profile: 'TEMELFATURA', type: 'SGK',
    notes: 'SGK — 2 satır (farklı medikal hizmet kodları)',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 2, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sgk'],
    },
    input: {
      id: 'MTX2026000000917',
      uuid: 'a1000917-0001-4000-8001-000000000917',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'SGK', currencyCode: 'TRY',
      sgk: {
        type: 'SAGLIK_HAS',
        documentNo: 'SGK-HAS-2026-MTX917',
        companyName: 'Matrix Test Hastane A.Ş.',
        companyCode: 'SGK-HAS-MTX917',
      },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '9876543210', name: 'Sosyal Güvenlik Kurumu' },
      lines: [
        { name: 'Medikal muayene', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 10 },
        { name: 'Medikal tetkik', quantity: 2, price: 300, unitCode: 'Adet', kdvPercent: 10 },
      ],
    },
  },
  // 8. TEMELFATURA+SATIS + belge seviyesi AllowanceCharge
  {
    kind: 'invoice', variantSlug: 'document-indirim', profile: 'TEMELFATURA', type: 'SATIS',
    notes: 'Belge seviyesi AllowanceCharge — %10 global indirim',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: true },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['allowanceCharge'],
    },
    input: {
      id: 'MTX2026000000918',
      uuid: 'a1000918-0001-4000-8001-000000000918',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'SATIS', currencyCode: 'TRY',
      documentAllowances: [{ reason: 'Toptan indirim', chargeIndicator: false, amount: 100, kdvPercent: 20 }],
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'İndirimli ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // TICARIFATURA — 8 baseline (SATIS/TEVKIFAT/~TEVKIFATIADE~/ISTISNA/
  // OZELMATRAH/IHRACKAYITLI/SGK/KOMISYONCU/KONAKLAMAVERGISI)
  // NOTE: Plan 23 hedefinden %35 (TEVKIFATIADE Bug#1 nedeniyle hariç)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'SATIS',
    notes: 'Baseline — TICARIFATURA+SATIS, tek satır %20',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000020',
      uuid: 'a1000020-0001-4000-8001-000000000020',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Ticari satış', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'TEVKIFAT',
    notes: 'Baseline — TICARIFATURA+TEVKIFAT, kod 620 (%50 tekstil)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['620'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000021',
      uuid: 'a1000021-0001-4000-8001-000000000021',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Tekstil ürünü', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '620' }],
    },
  },
  // TICARIFATURA+TEVKIFATIADE — Sprint 8f.4 (Bug #1 fix sonrası)
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'TEVKIFATIADE',
    notes: 'Baseline — TICARIFATURA+TEVKIFATIADE, kod 620 %50 (tekstil iade+tevkifat)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['620'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000902',
      uuid: 'a1000902-0001-4000-8001-000000000902',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'TEVKIFATIADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000021', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Tekstil iade — %50 tevkifat', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '620' }],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'ISTISNA',
    notes: 'Baseline — TICARIFATURA+ISTISNA, kod 213',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['213'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000022',
      uuid: 'a1000022-0001-4000-8001-000000000022',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '213',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Deniz taşıtı hizmeti', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'OZELMATRAH',
    notes: 'Baseline — TICARIFATURA+OZELMATRAH, kod 801',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['801'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ozelMatrah'],
    },
    input: {
      id: 'MTX2026000000023',
      uuid: 'a1000023-0001-4000-8001-000000000023',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'OZELMATRAH', currencyCode: 'TRY',
      kdvExemptionCode: '801',
      ozelMatrah: { percent: 18, taxable: 500, amount: 90 },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'İkinci el oto', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'IHRACKAYITLI',
    notes: 'Baseline — TICARIFATURA+IHRACKAYITLI, kod 702 + GTİP + ALICIDIBKOD',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['702'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['gtip', 'alicidibkod'],
    },
    input: {
      id: 'MTX2026000000024',
      uuid: 'a1000024-0001-4000-8001-000000000024',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '702',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'İhraç kayıtlı ürün', quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: 0,
        delivery: {
          gtipNo: '620342000010', alicidibsatirkod: '12345678901',
          deliveryAddress: { address: 'Liman', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'SGK',
    notes: 'Baseline — TICARIFATURA+SGK, SAGLIK_OPT (optik)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sgk'],
    },
    input: {
      id: 'MTX2026000000025',
      uuid: 'a1000025-0001-4000-8001-000000000025',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'SGK', currencyCode: 'TRY',
      sgk: { type: 'SAGLIK_OPT', documentNo: 'SGK-OPT-MTX025', companyName: 'Matrix Optik', companyCode: 'SGK-OPT-MTX' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Gözlük çerçevesi', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'KOMISYONCU',
    notes: 'Baseline — TICARIFATURA+KOMISYONCU',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000026',
      uuid: 'a1000026-0001-4000-8001-000000000026',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'KOMISYONCU', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Komisyon hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice',
    variantSlug: 'baseline',
    profile: 'TICARIFATURA',
    type: 'KONAKLAMAVERGISI',
    notes: 'Baseline — TICARIFATURA+KONAKLAMAVERGISI',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000027',
      uuid: 'a1000027-0001-4000-8001-000000000027',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'KONAKLAMAVERGISI', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Konaklama — 3 gece', quantity: 3, price: 500, unitCode: 'Gece', kdvPercent: 20 }],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // KAMU — 8 baseline (PaymentMeans + IBAN + BuyerCustomer zorunlu)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'SATIS',
    notes: 'Baseline — KAMU+SATIS, PaymentMeans + IBAN + aracı kurum',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000030',
      uuid: 'a1000030-0001-4000-8001-000000000030',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Alıcı Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Kamu tedarik', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'TEVKIFAT',
    notes: 'Baseline — KAMU+TEVKIFAT, kod 603',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000031',
      uuid: 'a1000031-0001-4000-8001-000000000031',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Tevkifatlı kamu hizmeti', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603' }],
    },
  },
  // KAMU+TEVKIFATIADE — Sprint 8f.4 (Bug #1 fix sonrası)
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'TEVKIFATIADE',
    notes: 'Baseline — KAMU+TEVKIFATIADE, kod 603 %70 (kamu iade+tevkifat)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000903',
      uuid: 'a1000903-0001-4000-8001-000000000903',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'TEVKIFATIADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000031', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Kamu hizmet iade — tevkifatlı', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603' }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'ISTISNA',
    notes: 'Baseline — KAMU+ISTISNA, kod 213',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['213'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000032',
      uuid: 'a1000032-0001-4000-8001-000000000032',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '213',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'İstisnalı kamu hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'OZELMATRAH',
    notes: 'Baseline — KAMU+OZELMATRAH, kod 801',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['801'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ozelMatrah', 'buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000033',
      uuid: 'a1000033-0001-4000-8001-000000000033',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'OZELMATRAH', currencyCode: 'TRY',
      kdvExemptionCode: '801',
      ozelMatrah: { percent: 18, taxable: 500, amount: 90 },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Özel matrah', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'IHRACKAYITLI',
    notes: 'Baseline — KAMU+IHRACKAYITLI, kod 702 + GTİP + ALICIDIBKOD',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['702'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['gtip', 'alicidibkod', 'buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000034',
      uuid: 'a1000034-0001-4000-8001-000000000034',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '702',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{
        name: 'İhraç kayıtlı kamu tedarik', quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: 0,
        delivery: {
          gtipNo: '620342000010', alicidibsatirkod: '12345678901',
          deliveryAddress: { address: 'Liman', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'SGK',
    notes: 'Baseline — KAMU+SGK, SAGLIK_HAS',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sgk', 'buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000035',
      uuid: 'a1000035-0001-4000-8001-000000000035',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'SGK', currencyCode: 'TRY',
      sgk: { type: 'SAGLIK_HAS', documentNo: 'SGK-HAS-MTX035', companyName: 'Matrix Hastane', companyCode: 'SGK-HAS-MTX' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'Sosyal Güvenlik Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Hastane tedavi', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'KOMISYONCU',
    notes: 'Baseline — KAMU+KOMISYONCU',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000036',
      uuid: 'a1000036-0001-4000-8001-000000000036',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'KOMISYONCU', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Komisyon kamu', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'KAMU', type: 'KONAKLAMAVERGISI',
    notes: 'Baseline — KAMU+KONAKLAMAVERGISI',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000037',
      uuid: 'a1000037-0001-4000-8001-000000000037',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'KONAKLAMAVERGISI', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Konaklama — kamu görevlisi', quantity: 2, price: 500, unitCode: 'Gece', kdvPercent: 20 }],
    },
  },

  // ─── Sprint 8f.6 — TICARIFATURA genişletme (+5) ───
  {
    kind: 'invoice', variantSlug: 'kdv-10', profile: 'TICARIFATURA', type: 'SATIS',
    notes: 'TICARIFATURA+SATIS %10 KDV',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000921',
      uuid: 'a1000921-0001-4000-8001-000000000921',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Gıda ürünü', quantity: 10, price: 100, unitCode: 'Kg', kdvPercent: 10 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'usd-doviz', profile: 'TICARIFATURA', type: 'SATIS',
    notes: 'TICARIFATURA+SATIS USD döviz + exchangeRate',
    dimensions: {
      kdvBreakdown: [20], currency: 'USD', exchangeRate: true, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000922',
      uuid: 'a1000922-0001-4000-8001-000000000922',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'SATIS', currencyCode: 'USD', exchangeRate: 32.5,
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'İthal ürün', quantity: 1, price: 200, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'tevkifat-603', profile: 'TICARIFATURA', type: 'TEVKIFAT',
    notes: 'TICARIFATURA+TEVKIFAT kod 603 %70 (bakım-onarım)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000923',
      uuid: 'a1000923-0001-4000-8001-000000000923',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Bakım-onarım hizmeti', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603' }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'istisna-kod-201', profile: 'TICARIFATURA', type: 'ISTISNA',
    notes: 'TICARIFATURA+ISTISNA kod 201 (diplomatik temsilci)',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['201'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000924',
      uuid: 'a1000924-0001-4000-8001-000000000924',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '201',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Diplomatik hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'ozelmatrah-805', profile: 'TICARIFATURA', type: 'OZELMATRAH',
    notes: 'TICARIFATURA+OZELMATRAH kod 805 (ikinci el emtia)',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['805'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ozelMatrah'],
    },
    input: {
      id: 'MTX2026000000925',
      uuid: 'a1000925-0001-4000-8001-000000000925',
      datetime: '2026-04-24T10:00:00',
      profile: 'TICARIFATURA', type: 'OZELMATRAH', currencyCode: 'TRY',
      kdvExemptionCode: '805',
      ozelMatrah: { percent: 18, taxable: 300, amount: 54 },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'İkinci el emtia', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },

  // ─── Sprint 8f.6 — KAMU genişletme (+4) ───
  {
    kind: 'invoice', variantSlug: 'coklu-satir', profile: 'KAMU', type: 'SATIS',
    notes: 'KAMU+SATIS 3 satır farklı ürünler',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 3, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000931',
      uuid: 'a1000931-0001-4000-8001-000000000931',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [
        { name: 'Ofis malzemesi', quantity: 10, price: 50, unitCode: 'Adet', kdvPercent: 20 },
        { name: 'Temizlik ürünü', quantity: 5, price: 30, unitCode: 'Adet', kdvPercent: 20 },
        { name: 'Kırtasiye', quantity: 20, price: 10, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },
  {
    kind: 'invoice', variantSlug: 'istisna-kod-301', profile: 'KAMU', type: 'ISTISNA',
    notes: 'KAMU+ISTISNA kod 301 (Türkiye dışı ifa)',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['301'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000932',
      uuid: 'a1000932-0001-4000-8001-000000000932',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Yurtdışı ifa hizmeti', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'tevkifat-620', profile: 'KAMU', type: 'TEVKIFAT',
    notes: 'KAMU+TEVKIFAT kod 620 %50 tekstil',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['620'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000933',
      uuid: 'a1000933-0001-4000-8001-000000000933',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Üniforma tekstil', quantity: 10, price: 500, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '620' }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'usd-doviz', profile: 'KAMU', type: 'SATIS',
    notes: 'KAMU+SATIS USD döviz (kurumsal ithal)',
    dimensions: {
      kdvBreakdown: [20], currency: 'USD', exchangeRate: true, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: true, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'iban'],
    },
    input: {
      id: 'MTX2026000000934',
      uuid: 'a1000934-0001-4000-8001-000000000934',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'SATIS', currencyCode: 'USD', exchangeRate: 32.5,
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'İthal teçhizat', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // EARSIVFATURA — 12 baseline (9 temel + 3 YTB)
  // Bug#1 nedeniyle TEVKIFATIADE / YTBTEVKIFATIADE atlandı
  // TEKNOLOJIDESTEK ayrıca atlandı (customer.TCKN + satırda TELEFON/TABLET_PC şartı)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'SATIS',
    notes: 'Baseline — EARSIVFATURA+SATIS',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000040',
      uuid: 'a1000040-0001-4000-8001-000000000040',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-arşiv satış', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'IADE',
    notes: 'Baseline — EARSIVFATURA+IADE, billingReference',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['billingReference'],
    },
    input: {
      id: 'MTX2026000000041',
      uuid: 'a1000041-0001-4000-8001-000000000041',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'IADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000040', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-arşiv iade', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'TEVKIFAT',
    notes: 'Baseline — EARSIVFATURA+TEVKIFAT',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000042',
      uuid: 'a1000042-0001-4000-8001-000000000042',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-arşiv tevkifat', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603' }],
    },
  },
  // EARSIVFATURA+TEVKIFATIADE — Sprint 8f.4 (Bug #1 fix sonrası)
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'TEVKIFATIADE',
    notes: 'Baseline — EARSIVFATURA+TEVKIFATIADE, kod 603 %70',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000904',
      uuid: 'a1000904-0001-4000-8001-000000000904',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'TEVKIFATIADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000042', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-arşiv iade — tevkifatlı', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603' }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'ISTISNA',
    notes: 'Baseline — EARSIVFATURA+ISTISNA, kod 213',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['213'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000043',
      uuid: 'a1000043-0001-4000-8001-000000000043',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '213',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-arşiv istisna', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'OZELMATRAH',
    notes: 'Baseline — EARSIVFATURA+OZELMATRAH',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['801'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ozelMatrah'],
    },
    input: {
      id: 'MTX2026000000044',
      uuid: 'a1000044-0001-4000-8001-000000000044',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'OZELMATRAH', currencyCode: 'TRY',
      kdvExemptionCode: '801',
      ozelMatrah: { percent: 18, taxable: 500, amount: 90 },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-arşiv özel matrah', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'IHRACKAYITLI',
    notes: 'Baseline — EARSIVFATURA+IHRACKAYITLI',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['702'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['gtip', 'alicidibkod'],
    },
    input: {
      id: 'MTX2026000000045',
      uuid: 'a1000045-0001-4000-8001-000000000045',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '702',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'E-arşiv ihraç kayıtlı', quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: 0,
        delivery: {
          gtipNo: '620342000010', alicidibsatirkod: '12345678901',
          deliveryAddress: { address: 'Liman', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'SGK',
    notes: 'Baseline — EARSIVFATURA+SGK, MAL_HIZMET',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sgk'],
    },
    input: {
      id: 'MTX2026000000046',
      uuid: 'a1000046-0001-4000-8001-000000000046',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'SGK', currencyCode: 'TRY',
      sgk: { type: 'MAL_HIZMET', documentNo: 'SGK-MAL-MTX046', companyName: 'Matrix Medikal Tedarik', companyCode: 'SGK-MAL-MTX' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Medikal tedarik', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'KOMISYONCU',
    notes: 'Baseline — EARSIVFATURA+KOMISYONCU',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000047',
      uuid: 'a1000047-0001-4000-8001-000000000047',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'KOMISYONCU', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-arşiv komisyon', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'KONAKLAMAVERGISI',
    notes: 'Baseline — EARSIVFATURA+KONAKLAMAVERGISI',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000048',
      uuid: 'a1000048-0001-4000-8001-000000000048',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'KONAKLAMAVERGISI', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Konaklama — e-arşiv', quantity: 2, price: 500, unitCode: 'Gece', kdvPercent: 20 }],
    },
  },
  // Sprint 8g.4 — EARSIVFATURA × TEKNOLOJIDESTEK baseline (B-NEW-v2-07)
  // Coverage gap kapatıldı: 67/68 (%98.5) → 68/68 (%100)
  // Şart: customer TCKN + her satırda TELEFON veya TABLET_PC AdditionalItemIdentification
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'TEKNOLOJIDESTEK',
    notes: 'EARSIVFATURA+TEKNOLOJIDESTEK baseline — TCKN müşteri + IMEI (TELEFON scheme)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['tckn', 'telefon-imei'],
    },
    input: {
      id: 'MTX2026000000951',
      uuid: 'a1000951-0001-4000-8001-000000000951',
      datetime: '2026-04-27T10:00:00',
      profile: 'EARSIVFATURA', type: 'TEKNOLOJIDESTEK', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix Teknoloji A.Ş.' },
      customer: {
        taxNumber: '12345678901', taxIdType: 'TCKN', name: 'Test Hasta',
        firstName: 'Test', familyName: 'Kişi',
        address: 'Bağdat Cad. No:100',
        district: 'Kadıköy', city: 'İstanbul',
      },
      lines: [{
        name: 'Akıllı telefon', quantity: 1, price: 5000, unitCode: 'Adet', kdvPercent: 20,
        additionalItemIdentifications: [{ schemeId: 'TELEFON', value: 'IMEI123456789012345' }],
      }],
    },
  },

  // ─── Sprint 8f.7: EARSIVFATURA genişletme (+7, reaktivasyonla birleşerek 22) ───
  {
    kind: 'invoice', variantSlug: 'coklu-kdv', profile: 'EARSIVFATURA', type: 'SATIS',
    notes: 'EARSIVFATURA+SATIS çoklu KDV (10 + 20)',
    dimensions: {
      kdvBreakdown: [10, 20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 2, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000941',
      uuid: 'a1000941-0001-4000-8001-000000000941',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'Gıda', quantity: 5, price: 50, unitCode: 'Kg', kdvPercent: 10 },
        { name: 'Elektronik', quantity: 1, price: 2000, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },
  {
    kind: 'invoice', variantSlug: 'coklu-satir', profile: 'EARSIVFATURA', type: 'IADE',
    notes: 'EARSIVFATURA+IADE 3 satır',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 3, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000942',
      uuid: 'a1000942-0001-4000-8001-000000000942',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'IADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000041', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'İade ürün A', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 20 },
        { name: 'İade ürün B', quantity: 2, price: 300, unitCode: 'Adet', kdvPercent: 20 },
        { name: 'İade ürün C', quantity: 3, price: 100, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },
  {
    kind: 'invoice', variantSlug: 'dinamik-650', profile: 'EARSIVFATURA', type: 'TEVKIFAT',
    notes: 'EARSIVFATURA+TEVKIFAT 650 dinamik %30',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['650'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000943',
      uuid: 'a1000943-0001-4000-8001-000000000943',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Dinamik tevkifat', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '650', withholdingTaxPercent: 30 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'usd-doviz', profile: 'EARSIVFATURA', type: 'ISTISNA',
    notes: 'EARSIVFATURA+ISTISNA USD döviz + kod 213',
    dimensions: {
      kdvBreakdown: [0], currency: 'USD', exchangeRate: true, exemptionCodes: ['213'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000944',
      uuid: 'a1000944-0001-4000-8001-000000000944',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'ISTISNA', currencyCode: 'USD', exchangeRate: 32.5,
      kdvExemptionCode: '213',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Deniz taşıt tadil (ihr)', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'not-siparis', profile: 'EARSIVFATURA', type: 'SATIS',
    notes: 'EARSIVFATURA+SATIS notes + orderReference',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['orderReference'],
    },
    input: {
      id: 'MTX2026000000945',
      uuid: 'a1000945-0001-4000-8001-000000000945',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'SATIS', currencyCode: 'TRY',
      notes: ['E-arşiv not', 'Ödeme: havale'],
      orderReference: { id: 'ORD-EARSIV-2026-001', issueDate: '2026-04-23' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'E-ticaret ürünü', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // YTB tipleri (YATIRIMTESVIK kuralları geçerli) — ytbNo + itemClassificationCode zorunlu
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'YTBSATIS',
    notes: 'Baseline — EARSIVFATURA+YTBSATIS, ytbNo + kod 01 makine',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000049',
      uuid: 'a1000049-0001-4000-8001-000000000049',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBSATIS', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Teşvikli makine', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01', productTraceId: 'MAKINA-MTX-049',
        serialId: 'SN-MTX-049', brand: 'Matrix', model: 'MTX-01',
      }],
    },
  },
  // Sprint 8f.7: YTBSATIS kod 02 inşaat
  {
    kind: 'invoice', variantSlug: 'kod-02-insaat', profile: 'EARSIVFATURA', type: 'YTBSATIS',
    notes: 'EARSIVFATURA+YTBSATIS kod 02 (inşaat harcama tipi)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000946',
      uuid: 'a1000946-0001-4000-8001-000000000946',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBSATIS', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'İnşaat hizmeti (teşvikli)', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '02',
      }],
    },
  },
  // Sprint 8f.7: YTBIADE baseline (yeni tip — 8e'de yoktu)
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'YTBIADE',
    notes: 'EARSIVFATURA+YTBIADE baseline (ytbNo + billingReference + kod 03)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000947',
      uuid: 'a1000947-0001-4000-8001-000000000947',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBIADE', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      billingReference: { id: 'MTX2026000000049', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'YTB iade (hizmet)', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '03',
      }],
    },
  },
  // Sprint 8f.7: YTBTEVKIFAT baseline (yeni tip)
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'YTBTEVKIFAT',
    notes: 'EARSIVFATURA+YTBTEVKIFAT baseline (ytbNo + withholdingCode 603 + kod 03)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000948',
      uuid: 'a1000948-0001-4000-8001-000000000948',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBTEVKIFAT', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'YTB tevkifatlı hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603',
        itemClassificationCode: '03',
      }],
    },
  },
  // EARSIVFATURA+YTBISTISNA — Phantom KDV (M12)! 308 (makine) veya 339 (inşaat)
  {
    kind: 'invoice', variantSlug: 'phantom-308-makine', profile: 'EARSIVFATURA', type: 'YTBISTISNA',
    notes: 'EARSIVFATURA+YTBISTISNA — Phantom KDV (M12): kod 308 + itemClassificationCode 01',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: ['308'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: true,
      specialIdentifiers: ['ytbNo', 'phantom-kdv'],
    },
    input: {
      id: 'MTX2026000000050',
      uuid: 'a1000050-0001-4000-8001-000000000050',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBISTISNA', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      kdvExemptionCode: '308',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Teşvikli makine — phantom KDV', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01', kdvExemptionCode: '308',
        productTraceId: 'MAKINA-MTX-050', serialId: 'SN-MTX-050', brand: 'Matrix', model: 'MTX-02',
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'phantom-339-insaat', profile: 'EARSIVFATURA', type: 'YTBISTISNA',
    notes: 'EARSIVFATURA+YTBISTISNA — Phantom KDV: kod 339 + itemClassificationCode 02 inşaat',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: ['339'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: true,
      specialIdentifiers: ['ytbNo', 'phantom-kdv'],
    },
    input: {
      id: 'MTX2026000000051',
      uuid: 'a1000051-0001-4000-8001-000000000051',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBISTISNA', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      kdvExemptionCode: '339',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Teşvikli inşaat hizmeti', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '02', kdvExemptionCode: '339',
      }],
    },
  },
  // EARSIVFATURA+YTBTEVKIFATIADE — Sprint 8f.4 (Bug #1 fix sonrası)
  // YTB tipleri → YATIRIMTESVIK kuralları (ytbNo + itemClassificationCode) zorunlu
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'EARSIVFATURA', type: 'YTBTEVKIFATIADE',
    notes: 'Baseline — EARSIVFATURA+YTBTEVKIFATIADE, ytbNo + kod 603 + itemClassificationCode 03',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000908',
      uuid: 'a1000908-0001-4000-8001-000000000908',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBTEVKIFATIADE', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      billingReference: { id: 'MTX2026000000049', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'YTB iade — tevkifatlı (hizmet)', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603',
        itemClassificationCode: '03',
      }],
    },
  },
  // Varyant: EARSIVFATURA+YTBTEVKIFATIADE+620 %50 tekstil (farklı kod)
  {
    kind: 'invoice', variantSlug: 'kod-620-tekstil', profile: 'EARSIVFATURA', type: 'YTBTEVKIFATIADE',
    notes: 'Varyant — EARSIVFATURA+YTBTEVKIFATIADE, kod 620 %50 tekstil',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['620'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000910',
      uuid: 'a1000910-0001-4000-8001-000000000910',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA', type: 'YTBTEVKIFATIADE', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      billingReference: { id: 'MTX2026000000049', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'YTB tekstil iade — %50 tevkifat', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '620',
        itemClassificationCode: '03',
      }],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // IHRACAT + YOLCUBERABERFATURA + OZELFATURA + HKS + ENERJI (8 baseline)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'IHRACAT', type: 'ISTISNA',
    notes: 'Baseline — IHRACAT+ISTISNA, USD döviz + buyerCustomer + delivery(FOB+GTİP)',
    dimensions: {
      kdvBreakdown: [0], currency: 'USD', exchangeRate: true, exemptionCodes: ['301'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'gtip', 'incoterms'],
    },
    input: {
      id: 'MTX2026000000060',
      uuid: 'a1000060-0001-4000-8001-000000000060',
      datetime: '2026-04-24T10:00:00',
      profile: 'IHRACAT', type: 'ISTISNA', currencyCode: 'USD', exchangeRate: 32.5,
      kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER, name: 'Matrix İhracat A.Ş.' },
      customer: {
        taxNumber: '2222222222',
        name: 'Global Trade Holdings (Germany)',
        address: 'Bahnhofstraße 123',
        district: 'Munich', city: 'Bayern',
      },
      buyerCustomer: {
        name: 'Global Trade Holdings GmbH',
        taxNumber: 'DE123456789',
        address: 'Bahnhofstraße 123', district: 'Munich', city: 'Bayern', country: 'Germany',
      },
      lines: [{
        name: 'İhracat — tekstil', quantity: 100, price: 10, unitCode: 'Adet', kdvPercent: 0,
        delivery: {
          deliveryTermCode: 'FOB', gtipNo: '620342000010',
          deliveryAddress: { address: 'Ambarlı Liman', district: 'Avcılar', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'YOLCUBERABERFATURA', type: 'ISTISNA',
    notes: 'Baseline — YOLCUBERABERFATURA+ISTISNA, passport + nationalityId + taxRepresentativeParty',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['322'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['passport', 'nationalityId', 'taxRepresentative'],
    },
    input: {
      id: 'MTX2026000000061',
      uuid: 'a1000061-0001-4000-8001-000000000061',
      datetime: '2026-04-24T10:00:00',
      profile: 'YOLCUBERABERFATURA', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '322',
      sender: {
        taxNumber: '1460415308',
        name: 'Matrix Bavul Ticaret A.Ş.',
        taxOffice: 'Beyoğlu', address: 'İstiklal Cad. No:321',
        district: 'Beyoğlu', city: 'İstanbul',
      },
      customer: { ...STANDARD_CUSTOMER, name: 'Matrix Turizm Aracı A.Ş.' },
      buyerCustomer: {
        name: 'Michael Schneider (Tourist)',
        taxNumber: '99999999999',
        address: 'Hauptstrasse 15', district: 'Berlin', city: 'Berlin', country: 'Germany',
        nationalityId: 'DE', passportId: 'N12345678',
      },
      taxRepresentativeParty: {
        vknTckn: '9876543210',
        label: 'MATRIX_TAXFREE',
        name: 'Matrix KDV İade Aracı',
      },
      lines: [{ name: 'El yapımı seramik', quantity: 1, price: 800, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'OZELFATURA', type: 'ISTISNA',
    notes: 'Baseline — OZELFATURA+ISTISNA (genel istisna profili)',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['322'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000062',
      uuid: 'a1000062-0001-4000-8001-000000000062',
      datetime: '2026-04-24T10:00:00',
      profile: 'OZELFATURA', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '322',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'Özel fatura satır', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'HKS', type: 'HKSSATIS',
    notes: 'Baseline — HKS+HKSSATIS, KUNYENO 19-char per line',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['kunyeno'],
    },
    input: {
      id: 'MTX2026000000063',
      uuid: 'a1000063-0001-4000-8001-000000000063',
      datetime: '2026-04-24T10:00:00',
      profile: 'HKS', type: 'HKSSATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix Sebze Meyve Tic.', address: 'Hal Kompleksi Blok 5', district: 'Bayrampaşa' },
      customer: { ...STANDARD_CUSTOMER, name: 'Matrix Market Zinciri Ltd.' },
      lines: [{
        name: 'Domates — Standart', quantity: 500, price: 20, unitCode: 'KGM', kdvPercent: 10,
        additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'KUN-2026-MTX63-DOM1' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'HKS', type: 'HKSKOMISYONCU',
    notes: 'Baseline — HKS+HKSKOMISYONCU, komisyoncu satış',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['kunyeno'],
    },
    input: {
      id: 'MTX2026000000064',
      uuid: 'a1000064-0001-4000-8001-000000000064',
      datetime: '2026-04-24T10:00:00',
      profile: 'HKS', type: 'HKSKOMISYONCU', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix Komisyoncu Hal' },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Biber — Komisyon satış', quantity: 200, price: 15, unitCode: 'KGM', kdvPercent: 10,
        additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'KUN-2026-MTX64-BIB1' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ENERJI', type: 'SARJ',
    notes: 'Baseline — ENERJI+SARJ, araç şarj hizmeti',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000065',
      uuid: 'a1000065-0001-4000-8001-000000000065',
      datetime: '2026-04-24T10:00:00',
      profile: 'ENERJI', type: 'SARJ', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix Şarj Operatörü A.Ş.' },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '12345678901', name: 'Matrix Araç Sürücüsü' },
      lines: [{ name: 'EV DC Hızlı Şarj 45 kWh', quantity: 45, price: 8, unitCode: 'KWH', kdvPercent: 20 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ENERJI', type: 'SARJANLIK',
    notes: 'Baseline — ENERJI+SARJANLIK, operatörden anlık satış',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000066',
      uuid: 'a1000066-0001-4000-8001-000000000066',
      datetime: '2026-04-24T10:00:00',
      profile: 'ENERJI', type: 'SARJANLIK', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix Şarj Operatörü A.Ş.' },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'EV AC şarj anlık', quantity: 20, price: 5, unitCode: 'KWH', kdvPercent: 20 }],
    },
  },

  // ─── Sprint 8f.9: Niş profiller genişletme (+5) ───
  {
    kind: 'invoice', variantSlug: 'eur-doviz', profile: 'IHRACAT', type: 'ISTISNA',
    notes: 'IHRACAT+ISTISNA EUR döviz + Avrupa alıcısı',
    dimensions: {
      kdvBreakdown: [0], currency: 'EUR', exchangeRate: true, exemptionCodes: ['301'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'gtip', 'incoterms'],
    },
    input: {
      id: 'MTX2026000000981',
      uuid: 'a1000981-0001-4000-8001-000000000981',
      datetime: '2026-04-24T10:00:00',
      profile: 'IHRACAT', type: 'ISTISNA', currencyCode: 'EUR', exchangeRate: 35.8,
      kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER, name: 'Matrix İhracat A.Ş.' },
      customer: {
        taxNumber: '3333333333',
        name: 'Euro Partners SARL (France)',
        address: 'Rue de Rivoli 50',
        district: 'Paris', city: 'Île-de-France',
      },
      buyerCustomer: {
        name: 'Euro Partners SARL',
        taxNumber: 'FR12345678901',
        address: 'Rue de Rivoli 50', district: 'Paris', city: 'Île-de-France', country: 'France',
      },
      lines: [{
        name: 'İhraç makine parçası', quantity: 1, price: 1500, unitCode: 'Adet', kdvPercent: 0,
        delivery: {
          deliveryTermCode: 'FOB', gtipNo: '847330000001',
          deliveryAddress: { address: 'Ambarlı Liman', district: 'Avcılar', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'coklu-satir', profile: 'IHRACAT', type: 'ISTISNA',
    notes: 'IHRACAT+ISTISNA 2 satır (farklı GTİP, USD)',
    dimensions: {
      kdvBreakdown: [0], currency: 'USD', exchangeRate: true, exemptionCodes: ['301'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 2, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['buyerCustomer', 'gtip', 'incoterms'],
    },
    input: {
      id: 'MTX2026000000982',
      uuid: 'a1000982-0001-4000-8001-000000000982',
      datetime: '2026-04-24T10:00:00',
      profile: 'IHRACAT', type: 'ISTISNA', currencyCode: 'USD', exchangeRate: 32.5,
      kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER, name: 'Matrix İhracat A.Ş.' },
      customer: {
        taxNumber: '4444444444',
        name: 'Eastern Trade LLC (USA)',
        address: '5th Avenue 100',
        district: 'Manhattan', city: 'New York',
      },
      buyerCustomer: {
        name: 'Eastern Trade LLC',
        taxNumber: 'US99887766',
        address: '5th Avenue 100', district: 'Manhattan', city: 'New York', country: 'USA',
      },
      lines: [
        { name: 'İhraç makine A', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
          delivery: {
            deliveryTermCode: 'FOB', gtipNo: '847330000001',
            deliveryAddress: { address: 'Ambarlı Liman', district: 'Avcılar', city: 'İstanbul', country: 'Türkiye' },
          } },
        { name: 'İhraç makine B', quantity: 2, price: 500, unitCode: 'Adet', kdvPercent: 0,
          delivery: {
            deliveryTermCode: 'FOB', gtipNo: '847330000002',
            deliveryAddress: { address: 'Ambarlı Liman', district: 'Avcılar', city: 'İstanbul', country: 'Türkiye' },
          } },
      ],
    },
  },
  {
    kind: 'invoice', variantSlug: 'yabanci-uk', profile: 'YOLCUBERABERFATURA', type: 'ISTISNA',
    notes: 'YOLCU — İngiliz turist (UK), farklı hediyelik ürün',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['322'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['passport', 'nationalityId', 'taxRepresentative'],
    },
    input: {
      id: 'MTX2026000000983',
      uuid: 'a1000983-0001-4000-8001-000000000983',
      datetime: '2026-04-24T10:00:00',
      profile: 'YOLCUBERABERFATURA', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '322',
      sender: {
        taxNumber: '1460415308', name: 'Matrix Tax-Free Shop',
        taxOffice: 'Beyoğlu', address: 'İstiklal Cad. No:100',
        district: 'Beyoğlu', city: 'İstanbul',
      },
      customer: { ...STANDARD_CUSTOMER, name: 'Matrix Turizm Aracı A.Ş.' },
      buyerCustomer: {
        name: 'John Smith',
        taxNumber: '88888888888',
        address: '221B Baker St', district: 'Marylebone', city: 'London', country: 'United Kingdom',
        nationalityId: 'GB', passportId: 'GB9876543',
      },
      taxRepresentativeParty: {
        vknTckn: '9876543210',
        label: 'MATRIX_TAXFREE',
        name: 'Matrix KDV İade Aracı',
      },
      lines: [{ name: 'Halı (hediyelik)', quantity: 1, price: 2500, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'coklu-kunye', profile: 'HKS', type: 'HKSSATIS',
    notes: 'HKS — 2 satır farklı KUNYENO',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 2, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['kunyeNo'],
    },
    input: {
      id: 'MTX2026000000984',
      uuid: 'a1000984-0001-4000-8001-000000000984',
      datetime: '2026-04-24T10:00:00',
      profile: 'HKS', type: 'HKSSATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix HKS Tedarikçi' },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'HKS ürün A', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 20,
          additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'HKS2026A0001AAA0001' }] },
        { name: 'HKS ürün B', quantity: 1, price: 700, unitCode: 'Adet', kdvPercent: 20,
          additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'HKS2026B0002BBB0001' }] },
      ],
    },
  },
  {
    kind: 'invoice', variantSlug: 'coklu-sarj', profile: 'ENERJI', type: 'SARJ',
    notes: 'ENERJI+SARJ 3 şarj noktası tek faturada',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 3, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: [],
    },
    input: {
      id: 'MTX2026000000985',
      uuid: 'a1000985-0001-4000-8001-000000000985',
      datetime: '2026-04-24T10:00:00',
      profile: 'ENERJI', type: 'SARJ', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix Şarj Ağı A.Ş.' },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'İstanbul İSG-001 DC şarj', quantity: 35, price: 6, unitCode: 'KWH', kdvPercent: 20 },
        { name: 'Ankara ANK-012 DC şarj', quantity: 40, price: 6, unitCode: 'KWH', kdvPercent: 20 },
        { name: 'İzmir IZM-005 AC şarj', quantity: 25, price: 4.5, unitCode: 'KWH', kdvPercent: 20 },
      ],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // ILAC_TIBBICIHAZ — 5 baseline (her satırda ILAC/TIBBICIHAZ/DIGER zorunlu)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ILAC_TIBBICIHAZ', type: 'SATIS',
    notes: 'Baseline — ILAC_TIBBICIHAZ+SATIS, ILAC scheme ID',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ilac'],
    },
    input: {
      id: 'MTX2026000000070',
      uuid: 'a1000070-0001-4000-8001-000000000070',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER, name: 'Matrix İlaç Tedarik A.Ş.' },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Reçeteli ilaç', quantity: 10, price: 50, unitCode: 'Adet', kdvPercent: 10,
        additionalItemIdentifications: [{ schemeId: 'ILAC', value: 'ILAC-MTX-070-001' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ILAC_TIBBICIHAZ', type: 'ISTISNA',
    notes: 'Baseline — ILAC_TIBBICIHAZ+ISTISNA, TIBBICIHAZ + kod 213',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['213'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['tibbicihaz'],
    },
    input: {
      id: 'MTX2026000000071',
      uuid: 'a1000071-0001-4000-8001-000000000071',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '213',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Tıbbi cihaz', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
        additionalItemIdentifications: [{ schemeId: 'TIBBICIHAZ', value: 'MED-MTX-071-001' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ILAC_TIBBICIHAZ', type: 'TEVKIFAT',
    notes: 'Baseline — ILAC_TIBBICIHAZ+TEVKIFAT',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ilac'],
    },
    input: {
      id: 'MTX2026000000072',
      uuid: 'a1000072-0001-4000-8001-000000000072',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Tevkifatlı ilaç', quantity: 10, price: 50, unitCode: 'Adet', kdvPercent: 10, withholdingTaxCode: '603',
        additionalItemIdentifications: [{ schemeId: 'ILAC', value: 'ILAC-MTX-072' }],
      }],
    },
  },
  // ILAC_TIBBICIHAZ+TEVKIFATIADE — Sprint 8f.4
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ILAC_TIBBICIHAZ', type: 'TEVKIFATIADE',
    notes: 'Baseline — ILAC_TIBBICIHAZ+TEVKIFATIADE, kod 603',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ilac'],
    },
    input: {
      id: 'MTX2026000000905',
      uuid: 'a1000905-0001-4000-8001-000000000905',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'TEVKIFATIADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000072', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'İlaç iade — tevkifatlı', quantity: 10, price: 50, unitCode: 'Adet', kdvPercent: 10, withholdingTaxCode: '603',
        additionalItemIdentifications: [{ schemeId: 'ILAC', value: 'ILAC-MTX-905' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ILAC_TIBBICIHAZ', type: 'IADE',
    notes: 'Baseline — ILAC_TIBBICIHAZ+IADE',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['billingReference', 'ilac'],
    },
    input: {
      id: 'MTX2026000000073',
      uuid: 'a1000073-0001-4000-8001-000000000073',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'IADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000070', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'İade — ilaç', quantity: 5, price: 50, unitCode: 'Adet', kdvPercent: 10,
        additionalItemIdentifications: [{ schemeId: 'ILAC', value: 'ILAC-MTX-073' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'ILAC_TIBBICIHAZ', type: 'IHRACKAYITLI',
    notes: 'Baseline — ILAC_TIBBICIHAZ+IHRACKAYITLI',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['702'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['gtip', 'alicidibkod', 'ilac'],
    },
    input: {
      id: 'MTX2026000000074',
      uuid: 'a1000074-0001-4000-8001-000000000074',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '702',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'İhraç ilaç', quantity: 10, price: 50, unitCode: 'Adet', kdvPercent: 0,
        additionalItemIdentifications: [{ schemeId: 'ILAC', value: 'ILAC-MTX-074' }],
        delivery: {
          gtipNo: '300490000011', alicidibsatirkod: '12345678901',
          deliveryAddress: { address: 'Liman', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },

  // ─── Sprint 8f.8: ILAC_TIBBICIHAZ genişletme (+2) ───
  {
    kind: 'invoice', variantSlug: 'tibbicihaz', profile: 'ILAC_TIBBICIHAZ', type: 'SATIS',
    notes: 'ILAC_TIBBICIHAZ+SATIS TIBBICIHAZ schemeId (ilaç yerine tıbbi cihaz)',
    dimensions: {
      kdvBreakdown: [10], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['tibbicihaz'],
    },
    input: {
      id: 'MTX2026000000961',
      uuid: 'a1000961-0001-4000-8001-000000000961',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'MR cihazı', quantity: 1, price: 500000, unitCode: 'Adet', kdvPercent: 10,
        additionalItemIdentifications: [{ schemeId: 'TIBBICIHAZ', value: 'TC-MTX-961' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'diger-scheme', profile: 'ILAC_TIBBICIHAZ', type: 'SATIS',
    notes: 'ILAC_TIBBICIHAZ+SATIS DIGER schemeId (istisnai ürün)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['diger'],
    },
    input: {
      id: 'MTX2026000000962',
      uuid: 'a1000962-0001-4000-8001-000000000962',
      datetime: '2026-04-24T10:00:00',
      profile: 'ILAC_TIBBICIHAZ', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Yardımcı medikal sarf', quantity: 100, price: 20, unitCode: 'Adet', kdvPercent: 20,
        additionalItemIdentifications: [{ schemeId: 'DIGER', value: 'DG-MTX-962' }],
      }],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // YATIRIMTESVIK — 4 baseline + 2 phantom (SATIS/ISTISNA/IADE/TEVKIFAT)
  // Bug#1 gereği TEVKIFATIADE atlandı
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invoice', variantSlug: 'baseline-makine', profile: 'YATIRIMTESVIK', type: 'SATIS',
    notes: 'Baseline — YATIRIMTESVIK+SATIS, itemClassificationCode 01 makine',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo', 'makine'],
    },
    input: {
      id: 'MTX2026000000075',
      uuid: 'a1000075-0001-4000-8001-000000000075',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'SATIS', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER, name: 'Matrix Makine Tic.' },
      customer: { ...STANDARD_CUSTOMER, name: 'Matrix Teşvikli Üretici' },
      lines: [{
        name: 'Sanayi kompresör', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01',
        productTraceId: 'KOMP-MTX-075', serialId: 'SN-MTX-075', brand: 'Matrix', model: 'MTX-MAK-01',
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'phantom-308-makine', profile: 'YATIRIMTESVIK', type: 'ISTISNA',
    notes: 'YATIRIMTESVIK+ISTISNA Phantom KDV — 308 + makine (M12)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: ['308'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: true,
      specialIdentifiers: ['ytbNo', 'phantom-kdv'],
    },
    input: {
      id: 'MTX2026000000076',
      uuid: 'a1000076-0001-4000-8001-000000000076',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'ISTISNA', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      kdvExemptionCode: '308',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Teşvikli makine', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01', kdvExemptionCode: '308',
        productTraceId: 'MAKINA-MTX-076', serialId: 'SN-MTX-076', brand: 'Matrix', model: 'MTX-03',
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'phantom-339-insaat', profile: 'YATIRIMTESVIK', type: 'ISTISNA',
    notes: 'YATIRIMTESVIK+ISTISNA Phantom KDV — 339 + inşaat (M12)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: ['339'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: true,
      specialIdentifiers: ['ytbNo', 'phantom-kdv'],
    },
    input: {
      id: 'MTX2026000000077',
      uuid: 'a1000077-0001-4000-8001-000000000077',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'ISTISNA', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      kdvExemptionCode: '339',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Teşvikli inşaat', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '02', kdvExemptionCode: '339',
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'YATIRIMTESVIK', type: 'IADE',
    notes: 'Baseline — YATIRIMTESVIK+IADE (IADE grubunda kdvPercent>0 serbest)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo', 'billingReference'],
    },
    input: {
      id: 'MTX2026000000078',
      uuid: 'a1000078-0001-4000-8001-000000000078',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'IADE', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      billingReference: { id: 'MTX2026000000075', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Teşvikli iade', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01',
        productTraceId: 'IADE-MTX-078', serialId: 'SN-IADE-MTX', brand: 'Matrix', model: 'MTX-IADE',
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'YATIRIMTESVIK', type: 'TEVKIFAT',
    notes: 'Baseline — YATIRIMTESVIK+TEVKIFAT',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000079',
      uuid: 'a1000079-0001-4000-8001-000000000079',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'TEVKIFAT', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Tevkifatlı teşvikli hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603',
        itemClassificationCode: '01',
        productTraceId: 'TEV-MTX-079', serialId: 'SN-TEV-MTX', brand: 'Matrix', model: 'MTX-TEV',
      }],
    },
  },
  // YATIRIMTESVIK+TEVKIFATIADE — Sprint 8f.4
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'YATIRIMTESVIK', type: 'TEVKIFATIADE',
    notes: 'Baseline — YATIRIMTESVIK+TEVKIFATIADE, kod 603, ytbNo + kod 01',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000906',
      uuid: 'a1000906-0001-4000-8001-000000000906',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'TEVKIFATIADE', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      billingReference: { id: 'MTX2026000000079', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Teşvikli iade — tevkifatlı', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603',
        itemClassificationCode: '01',
        productTraceId: 'IADE-MTX-906', serialId: 'SN-IADE-906', brand: 'Matrix', model: 'MTX-IADE',
      }],
    },
  },

  // ─── Sprint 8f.8: YATIRIMTESVIK genişletme (+4) ───
  {
    kind: 'invoice', variantSlug: 'kod-04-gayrimaddi', profile: 'YATIRIMTESVIK', type: 'SATIS',
    notes: 'YATIRIMTESVIK+SATIS, harcama tipi 04 (gayrimaddi hak)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000951',
      uuid: 'a1000951-0001-4000-8001-000000000951',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'SATIS', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Yazılım lisansı (gayrimaddi)', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '04',
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'coklu-satir', profile: 'YATIRIMTESVIK', type: 'SATIS',
    notes: 'YATIRIMTESVIK+SATIS 3 satır makine parçaları',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 3, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000952',
      uuid: 'a1000952-0001-4000-8001-000000000952',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'SATIS', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'Makine parçası A', quantity: 2, price: 500, unitCode: 'Adet', kdvPercent: 20,
          itemClassificationCode: '01', productTraceId: 'PT-A-952', serialId: 'SN-A-952', brand: 'Matrix', model: 'PT-A' },
        { name: 'Makine parçası B', quantity: 1, price: 1200, unitCode: 'Adet', kdvPercent: 20,
          itemClassificationCode: '01', productTraceId: 'PT-B-952', serialId: 'SN-B-952', brand: 'Matrix', model: 'PT-B' },
        { name: 'Yazılım destek', quantity: 1, price: 800, unitCode: 'Adet', kdvPercent: 20,
          itemClassificationCode: '04' },
      ],
    },
  },
  {
    kind: 'invoice', variantSlug: 'dinamik-650', profile: 'YATIRIMTESVIK', type: 'TEVKIFAT',
    notes: 'YATIRIMTESVIK+TEVKIFAT 650 dinamik %40',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['650'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000953',
      uuid: 'a1000953-0001-4000-8001-000000000953',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'TEVKIFAT', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Dinamik tevkifatlı hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        withholdingTaxCode: '650', withholdingTaxPercent: 40,
        itemClassificationCode: '03',
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'coklu-iade', profile: 'YATIRIMTESVIK', type: 'IADE',
    notes: 'YATIRIMTESVIK+IADE 2 satır makine iadesi',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 2, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['ytbNo'],
    },
    input: {
      id: 'MTX2026000000954',
      uuid: 'a1000954-0001-4000-8001-000000000954',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'IADE', currencyCode: 'TRY',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      billingReference: { id: 'MTX2026000000076', issueDate: '2026-04-24' },
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'İade makine A', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
          itemClassificationCode: '01', productTraceId: 'IADE-A-954', serialId: 'SN-A-954', brand: 'Matrix', model: 'IADE-A' },
        { name: 'İade makine B', quantity: 1, price: 2000, unitCode: 'Adet', kdvPercent: 20,
          itemClassificationCode: '01', productTraceId: 'IADE-B-954', serialId: 'SN-B-954', brand: 'Matrix', model: 'IADE-B' },
      ],
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // IDIS — 5 baseline (sender.identifications SEVKIYATNO zorunlu)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'IDIS', type: 'SATIS',
    notes: 'Baseline — IDIS+SATIS, SEVKIYATNO (SE-format) satıcı kimliğinde',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo'],
    },
    input: {
      id: 'MTX2026000000080',
      uuid: 'a1000080-0001-4000-8001-000000000080',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'SATIS', currencyCode: 'TRY',
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000080' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'İç dağıtım satış', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000080' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'IDIS', type: 'ISTISNA',
    notes: 'Baseline — IDIS+ISTISNA, kod 213',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['213'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo'],
    },
    input: {
      id: 'MTX2026000000081',
      uuid: 'a1000081-0001-4000-8001-000000000081',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'ISTISNA', currencyCode: 'TRY',
      kdvExemptionCode: '213',
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000081' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'IDIS istisna', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000081' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'IDIS', type: 'IADE',
    notes: 'Baseline — IDIS+IADE',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo', 'billingReference'],
    },
    input: {
      id: 'MTX2026000000082',
      uuid: 'a1000082-0001-4000-8001-000000000082',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'IADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000080', issueDate: '2026-04-24' },
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000082' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'IDIS iade', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000082' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'IDIS', type: 'TEVKIFAT',
    notes: 'Baseline — IDIS+TEVKIFAT',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo'],
    },
    input: {
      id: 'MTX2026000000083',
      uuid: 'a1000083-0001-4000-8001-000000000083',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'TEVKIFAT', currencyCode: 'TRY',
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000083' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'IDIS tevkifat', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603',
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000083' }],
      }],
    },
  },
  // IDIS+TEVKIFATIADE — Sprint 8f.4
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'IDIS', type: 'TEVKIFATIADE',
    notes: 'Baseline — IDIS+TEVKIFATIADE',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: ['603'], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo'],
    },
    input: {
      id: 'MTX2026000000907',
      uuid: 'a1000907-0001-4000-8001-000000000907',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'TEVKIFATIADE', currencyCode: 'TRY',
      billingReference: { id: 'MTX2026000000083', issueDate: '2026-04-24' },
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000907' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'IDIS iade — tevkifatlı', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '603',
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000907' }],
      }],
    },
  },
  {
    kind: 'invoice', variantSlug: 'baseline', profile: 'IDIS', type: 'IHRACKAYITLI',
    notes: 'Baseline — IDIS+IHRACKAYITLI',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['702'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo', 'gtip', 'alicidibkod'],
    },
    input: {
      id: 'MTX2026000000084',
      uuid: 'a1000084-0001-4000-8001-000000000084',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '702',
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000084' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'IDIS ihraç', quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: 0,
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000084' }],
        delivery: {
          gtipNo: '620342000010', alicidibsatirkod: '12345678901',
          deliveryAddress: { address: 'Liman', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },

  // ─── Sprint 8f.8: IDIS genişletme (+2) ───
  {
    kind: 'invoice', variantSlug: 'coklu-satir', profile: 'IDIS', type: 'SATIS',
    notes: 'IDIS+SATIS 3 satır (her satır ETIKETNO)',
    dimensions: {
      kdvBreakdown: [20], currency: 'TRY', exchangeRate: false, exemptionCodes: [],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 3, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo'],
    },
    input: {
      id: 'MTX2026000000971',
      uuid: 'a1000971-0001-4000-8001-000000000971',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'SATIS', currencyCode: 'TRY',
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000971' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [
        { name: 'Ürün A', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 20,
          additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'AA0000971' }] },
        { name: 'Ürün B', quantity: 2, price: 300, unitCode: 'Adet', kdvPercent: 20,
          additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'BB0000971' }] },
        { name: 'Ürün C', quantity: 5, price: 100, unitCode: 'Adet', kdvPercent: 20,
          additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'CC0000971' }] },
      ],
    },
  },
  {
    kind: 'invoice', variantSlug: 'ihrac-701', profile: 'IDIS', type: 'IHRACKAYITLI',
    notes: 'IDIS+IHRACKAYITLI kod 701 (DİİB dışı)',
    dimensions: {
      kdvBreakdown: [0], currency: 'TRY', exchangeRate: false, exemptionCodes: ['701'],
      withholdingCodes: [], allowanceCharge: { line: false, document: false },
      lineCount: 1, paymentMeans: false, reducedKdvGate: false, phantomKdv: false,
      specialIdentifiers: ['sevkiyatNo', 'gtip'],
    },
    input: {
      id: 'MTX2026000000972',
      uuid: 'a1000972-0001-4000-8001-000000000972',
      datetime: '2026-04-24T10:00:00',
      profile: 'IDIS', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '701',
      sender: {
        ...STANDARD_SENDER,
        identifications: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000972' }],
      },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'IDIS ihraç 701', quantity: 10, price: 100, unitCode: 'Adet', kdvPercent: 0,
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000972' }],
        delivery: {
          gtipNo: '620342000010', alicidibsatirkod: '12345678901',
          deliveryAddress: { address: 'Liman', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
        },
      }],
    },
  },
  // yukarı: ETIKETNO regex ^[A-Z]{2}\d{7}$; "ID0000972" = 2 harf + 7 rakam (7 karakter değil) — 9 karakter doğru.

  // ═════════════════════════════════════════════════════════════════════
  // Despatch (e-İrsaliye) — 6 baseline (3 profil × 2 tip)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'despatch', variantSlug: 'baseline', profile: 'TEMELIRSALIYE', type: 'SEVK',
    notes: 'Baseline — TEMELIRSALIYE+SEVK, tek sürücü + PLAKA',
    dimensions: {
      plates: ['PLAKA'], driverCount: 1, lineCount: 1,
      additionalDocuments: false, specialIdentifiers: [],
    },
    input: {
      id: 'IRS2026000000090',
      uuid: 'a1000090-0001-4000-8001-000000000090',
      profileId: 'TEMELIRSALIYE' as const,
      despatchTypeCode: 'SEVK' as const,
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN',
        name: 'Matrix Lojistik A.Ş.',
        streetName: 'Barbaros Bulvarı No:123',
        district: 'Üsküdar', citySubdivisionName: 'Üsküdar', cityName: 'İstanbul',
        postalZone: '34664', country: 'Türkiye', taxOffice: 'Üsküdar',
      },
      customer: {
        vknTckn: '9876543210', taxIdType: 'VKN',
        name: 'Matrix Alıcı Ltd.',
        streetName: 'Bağdat Caddesi No:456',
        district: 'Kadıköy', citySubdivisionName: 'Kadıköy', cityName: 'İstanbul',
        postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDate: '2026-04-24', actualDespatchTime: '14:00:00',
        deliveryAddress: {
          streetName: 'Bağdat Caddesi No:456', district: 'Kadıköy',
          citySubdivisionName: 'Kadıköy', cityName: 'İstanbul',
          postalZone: '34710', country: 'Türkiye',
        },
        driverPersons: [{ firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' }],
        licensePlates: [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }],
      },
      lines: [{ id: '1', deliveredQuantity: 10, unitCode: 'C62', item: { name: 'Standart paket' } }],
    },
  },

  // Plate = DORSE varyantı
  {
    kind: 'despatch', variantSlug: 'dorse-plate', profile: 'TEMELIRSALIYE', type: 'SEVK',
    notes: 'TEMELIRSALIYE+SEVK DORSE plaka varyantı',
    dimensions: {
      plates: ['PLAKA', 'DORSE'], driverCount: 1, lineCount: 1,
      additionalDocuments: false, specialIdentifiers: [],
    },
    input: {
      id: 'IRS2026000000091',
      uuid: 'a1000091-0001-4000-8001-000000000091',
      profileId: 'TEMELIRSALIYE' as const,
      despatchTypeCode: 'SEVK' as const,
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Matrix Lojistik A.Ş.',
        streetName: 'Barbaros No:123', district: 'Üsküdar', citySubdivisionName: 'Üsküdar',
        cityName: 'İstanbul', postalZone: '34664', country: 'Türkiye', taxOffice: 'Üsküdar',
      },
      customer: {
        vknTckn: '9876543210', taxIdType: 'VKN', name: 'Matrix Alıcı Ltd.',
        streetName: 'Bağdat Cad. No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDate: '2026-04-24', actualDespatchTime: '14:00:00',
        deliveryAddress: {
          streetName: 'Bağdat No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
          cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye',
        },
        driverPersons: [{ firstName: 'Ali', familyName: 'Dorseci', nationalityId: '12345678901' }],
        licensePlates: [
          { plateNumber: '34ABC123', schemeId: 'PLAKA' },
          { plateNumber: '34DRS456', schemeId: 'DORSE' },
        ],
      },
      lines: [{ id: '1', deliveredQuantity: 20, unitCode: 'C62', item: { name: 'Tır yükü' } }],
    },
  },

  {
    kind: 'despatch', variantSlug: 'baseline', profile: 'TEMELIRSALIYE', type: 'MATBUDAN',
    notes: 'Baseline — TEMELIRSALIYE+MATBUDAN (kağıt belge referansı zorunlu)',
    dimensions: {
      plates: ['PLAKA'], driverCount: 1, lineCount: 1,
      additionalDocuments: true, specialIdentifiers: [],
    },
    input: {
      id: 'IRS2026000000092',
      uuid: 'a1000092-0001-4000-8001-000000000092',
      profileId: 'TEMELIRSALIYE' as const,
      despatchTypeCode: 'MATBUDAN' as const,
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Matrix Lojistik A.Ş.',
        streetName: 'Barbaros No:123', district: 'Üsküdar', citySubdivisionName: 'Üsküdar',
        cityName: 'İstanbul', postalZone: '34664', country: 'Türkiye', taxOffice: 'Üsküdar',
      },
      customer: {
        vknTckn: '9876543210', taxIdType: 'VKN', name: 'Matrix Alıcı Ltd.',
        streetName: 'Bağdat Cad. No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDate: '2026-04-24', actualDespatchTime: '14:00:00',
        deliveryAddress: {
          streetName: 'Bağdat No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
          cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye',
        },
        driverPersons: [{ firstName: 'Hasan', familyName: 'Matbu', nationalityId: '12345678901' }],
        licensePlates: [{ plateNumber: '34MTB789', schemeId: 'PLAKA' }],
      },
      additionalDocuments: [{ documentType: 'MATBU', id: 'KAGIT-IRS-2026-0001', issueDate: '2026-04-23' }],
      lines: [{ id: '1', deliveredQuantity: 5, unitCode: 'C62', item: { name: 'Kağıt arka dönem' } }],
    },
  },

  {
    kind: 'despatch', variantSlug: 'baseline', profile: 'HKSIRSALIYE', type: 'SEVK',
    notes: 'Baseline — HKSIRSALIYE+SEVK (Hal Kayıt Sistemi irsaliyesi)',
    dimensions: {
      plates: ['PLAKA'], driverCount: 1, lineCount: 1,
      additionalDocuments: false, specialIdentifiers: [],
    },
    input: {
      id: 'IRS2026000000093',
      uuid: 'a1000093-0001-4000-8001-000000000093',
      profileId: 'HKSIRSALIYE' as const,
      despatchTypeCode: 'SEVK' as const,
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Matrix Hal Lojistik',
        streetName: 'Hal Kompleksi Blok 5', district: 'Bayrampaşa', citySubdivisionName: 'Bayrampaşa',
        cityName: 'İstanbul', postalZone: '34055', country: 'Türkiye', taxOffice: 'Fatih',
      },
      customer: {
        vknTckn: '9876543210', taxIdType: 'VKN', name: 'Matrix Market Zincir',
        streetName: 'Bağdat Cad. No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDate: '2026-04-24', actualDespatchTime: '14:00:00',
        deliveryAddress: {
          streetName: 'Bağdat No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
          cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye',
        },
        driverPersons: [{ firstName: 'Veli', familyName: 'Halci', nationalityId: '12345678901' }],
        licensePlates: [{ plateNumber: '34HKS001', schemeId: 'PLAKA' }],
      },
      lines: [{
        id: '1', deliveredQuantity: 500, unitCode: 'KGM',
        item: {
          name: 'Domates',
          additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'KUN-2026-MTX93-DOM1' }],
        },
      }],
    },
  },

  {
    kind: 'despatch', variantSlug: 'baseline', profile: 'IDISIRSALIYE', type: 'SEVK',
    notes: 'Baseline — IDISIRSALIYE+SEVK (İç Dağıtım)',
    dimensions: {
      plates: ['PLAKA'], driverCount: 1, lineCount: 1,
      additionalDocuments: false, specialIdentifiers: ['sevkiyatNo'],
    },
    input: {
      id: 'IRS2026000000094',
      uuid: 'a1000094-0001-4000-8001-000000000094',
      profileId: 'IDISIRSALIYE' as const,
      despatchTypeCode: 'SEVK' as const,
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Matrix İç Dağıtım A.Ş.',
        streetName: 'Barbaros No:123', district: 'Üsküdar', citySubdivisionName: 'Üsküdar',
        cityName: 'İstanbul', postalZone: '34664', country: 'Türkiye', taxOffice: 'Üsküdar',
        additionalIdentifiers: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000094' }],
      },
      customer: {
        vknTckn: '9876543210', taxIdType: 'VKN', name: 'Matrix Bayii Ltd.',
        streetName: 'Bağdat Cad. No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDate: '2026-04-24', actualDespatchTime: '14:00:00',
        deliveryAddress: {
          streetName: 'Bağdat No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
          cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye',
        },
        driverPersons: [{ firstName: 'Osman', familyName: 'Dağıtım', nationalityId: '12345678901' }],
        licensePlates: [{ plateNumber: '34IDS001', schemeId: 'PLAKA' }],
      },
      lines: [{
        id: '1', deliveredQuantity: 15, unitCode: 'C62',
        item: {
          name: 'İç dağıtım ürün',
          additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000094' }],
        },
      }],
    },
  },

  // ─── Sprint 8f.10: Despatch genişletme (+2) ───
  {
    kind: 'despatch', variantSlug: 'coklu-surucu', profile: 'TEMELIRSALIYE', type: 'SEVK',
    notes: 'TEMELIRSALIYE+SEVK 2 sürücü + 2 plaka (çekici + dorse)',
    dimensions: {
      plates: ['PLAKA', 'DORSE'], driverCount: 2, lineCount: 1,
      additionalDocuments: false, specialIdentifiers: [],
    },
    input: {
      id: 'IRS2026000000991',
      uuid: 'a1000991-0001-4000-8001-000000000991',
      profileId: 'TEMELIRSALIYE' as const,
      despatchTypeCode: 'SEVK' as const,
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Matrix Lojistik A.Ş.',
        streetName: 'Barbaros No:123', district: 'Üsküdar', citySubdivisionName: 'Üsküdar',
        cityName: 'İstanbul', postalZone: '34664', country: 'Türkiye', taxOffice: 'Üsküdar',
      },
      customer: {
        vknTckn: '9876543210', taxIdType: 'VKN', name: 'Matrix Alıcı Ltd.',
        streetName: 'Bağdat Cad. No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDate: '2026-04-24', actualDespatchTime: '14:00:00',
        deliveryAddress: {
          streetName: 'Bağdat No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
          cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye',
        },
        driverPersons: [
          { firstName: 'Ahmet', familyName: 'Yılmaz', nationalityId: '12345678901' },
          { firstName: 'Mehmet', familyName: 'Kaya', nationalityId: '98765432109' },
        ],
        licensePlates: [
          { plateNumber: '34ABC991', schemeId: 'PLAKA' },
          { plateNumber: '34XYZ991', schemeId: 'DORSE' },
        ],
      },
      lines: [{ id: '1', deliveredQuantity: 10, unitCode: 'C62', item: { name: 'Büyük sevkiyat' } }],
    },
  },
  {
    kind: 'despatch', variantSlug: 'coklu-satir', profile: 'IDISIRSALIYE', type: 'SEVK',
    notes: 'IDISIRSALIYE+SEVK 3 satır farklı ETIKETNO',
    dimensions: {
      plates: ['PLAKA'], driverCount: 1, lineCount: 3,
      additionalDocuments: false, specialIdentifiers: ['sevkiyatNo'],
    },
    input: {
      id: 'IRS2026000000992',
      uuid: 'a1000992-0001-4000-8001-000000000992',
      profileId: 'IDISIRSALIYE' as const,
      despatchTypeCode: 'SEVK' as const,
      issueDate: '2026-04-24',
      issueTime: '10:00:00',
      supplier: {
        vknTckn: '1234567890', taxIdType: 'VKN', name: 'Matrix İç Dağıtım A.Ş.',
        streetName: 'Barbaros No:123', district: 'Üsküdar', citySubdivisionName: 'Üsküdar',
        cityName: 'İstanbul', postalZone: '34664', country: 'Türkiye', taxOffice: 'Üsküdar',
        additionalIdentifiers: [{ schemeId: 'SEVKIYATNO', value: 'SE-0000992' }],
      },
      customer: {
        vknTckn: '9876543210', taxIdType: 'VKN', name: 'Matrix Bayii Ltd.',
        streetName: 'Bağdat Cad. No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
        cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye', taxOffice: 'Kadıköy',
      },
      shipment: {
        actualDespatchDate: '2026-04-24', actualDespatchTime: '14:00:00',
        deliveryAddress: {
          streetName: 'Bağdat No:456', district: 'Kadıköy', citySubdivisionName: 'Kadıköy',
          cityName: 'İstanbul', postalZone: '34710', country: 'Türkiye',
        },
        driverPersons: [{ firstName: 'Osman', familyName: 'Dağıtım', nationalityId: '12345678901' }],
        licensePlates: [{ plateNumber: '34IDS001', schemeId: 'PLAKA' }],
      },
      lines: [
        { id: '1', deliveredQuantity: 5, unitCode: 'C62', item: {
          name: 'Ürün A', additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'AA0000992' }],
        } },
        { id: '2', deliveredQuantity: 3, unitCode: 'C62', item: {
          name: 'Ürün B', additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'BB0000992' }],
        } },
        { id: '3', deliveredQuantity: 7, unitCode: 'C62', item: {
          name: 'Ürün C', additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'CC0000992' }],
        } },
      ],
    },
  },
];

/**
 * Base invoice template — invalid senaryolarda default olarak kullanılır,
 * ilgili hata için gereken field override'lar spec'e özel yapılır.
 */
import type { SimpleInvoiceInput } from '../../src';

function baseInvoiceInput(id: string, uuid: string): SimpleInvoiceInput {
  return {
    id, uuid, datetime: '2026-04-24T10:00:00',
    profile: 'TEMELFATURA', type: 'SATIS', currencyCode: 'TRY',
    sender: { ...STANDARD_SENDER },
    customer: { ...STANDARD_CUSTOMER },
    lines: [{ name: 'Test satır', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
  };
}

export const invalidSpecs: InvalidSpec[] = [
  // ═════════════════════════════════════════════════════════════════════
  // Sınıf A — Common errors (MISSING_FIELD / INVALID_FORMAT / INVALID_VALUE
  //                          / INVALID_PROFILE / PROFILE_REQUIREMENT / TYPE_REQUIREMENT)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invalid-invoice', variantSlug: 'satici-vkn-bos',
    primaryCode: 'MISSING_FIELD',
    description: 'Satıcı VKN/TCKN boş',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.vknTckn', messageIncludes: 'VKN veya TCKN zorunludur' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000100', 'b1000100-0001-4000-8001-000000000100'),
      sender: { ...STANDARD_SENDER, taxNumber: '' } },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'lines-bos',
    primaryCode: 'MISSING_FIELD',
    description: 'lines dizisi boş (en az 1 satır zorunlu)',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'lines' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000101', 'b1000101-0001-4000-8001-000000000101'), lines: [] },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'saticisehir-bos',
    primaryCode: 'MISSING_FIELD',
    description: 'Satıcı city boş',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'supplier.cityName' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000102', 'b1000102-0001-4000-8001-000000000102'),
      sender: { ...STANDARD_SENDER, city: '' } },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'alici-eksik-ad',
    primaryCode: 'MISSING_FIELD',
    description: 'Alıcı name boş',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'customer.name' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000103', 'b1000103-0001-4000-8001-000000000103'),
      customer: { ...STANDARD_CUSTOMER, name: '' } },
  },

  {
    kind: 'invalid-invoice', variantSlug: 'satici-vkn-3hane',
    primaryCode: 'INVALID_FORMAT',
    description: 'Satıcı VKN 3 hane (10 veya 11 hane bekleniyor)',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_FORMAT', path: 'supplier.vknTckn', messageIncludes: 'Geçersiz format' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000104', 'b1000104-0001-4000-8001-000000000104'),
      sender: { ...STANDARD_SENDER, taxNumber: '123' } },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'datetime-yanlis',
    primaryCode: 'INVALID_FORMAT',
    description: 'datetime ISO format değil',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_FORMAT', messageIncludes: 'Geçersiz format' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000105', 'b1000105-0001-4000-8001-000000000105'),
      datetime: '24/04/2026 10:00' },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'uuid-hatali',
    primaryCode: 'INVALID_FORMAT',
    description: 'UUID format hatalı',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_FORMAT', path: 'uuid' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000106', 'not-a-uuid') },
  },

  {
    kind: 'invalid-invoice', variantSlug: 'currency-gecersiz',
    primaryCode: 'INVALID_VALUE',
    description: 'currencyCode whitelist dışında ("XYZ")',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_VALUE', path: 'currencyCode' }],
    validationLevel: 'strict', isMultiError: true,  // + MISSING_FIELD exchangeRate
    input: { ...baseInvoiceInput('MTX2026000000107', 'b1000107-0001-4000-8001-000000000107'),
      currencyCode: 'XYZ' },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'kdv-negatif',
    primaryCode: 'INVALID_VALUE',
    description: 'kdvPercent negatif (-5)',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_VALUE' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000108', 'b1000108-0001-4000-8001-000000000108'),
      lines: [{ name: 'Test', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: -5 }] },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'quantity-sifir',
    primaryCode: 'INVALID_VALUE',
    description: 'quantity 0',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_VALUE' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000109', 'b1000109-0001-4000-8001-000000000109'),
      lines: [{ name: 'Test', quantity: 0, price: 1000, unitCode: 'Adet', kdvPercent: 20 }] },
  },

  {
    kind: 'invalid-invoice', variantSlug: 'profile-bilinmeyen',
    primaryCode: 'INVALID_PROFILE',
    description: 'profile whitelist dışında (BILINMEYEN)',
    profileContext: '?', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_PROFILE' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000110', 'b1000110-0001-4000-8001-000000000110'),
      profile: 'BILINMEYEN' },
  },

  // PROFILE_REQUIREMENT — IHRACAT'ta buyerCustomer eksik
  {
    kind: 'invalid-invoice', variantSlug: 'ihracat-buyercustomer-eksik',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'IHRACAT profilinde buyerCustomer eksik',
    profileContext: 'IHRACAT', typeContext: 'ISTISNA',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'BuyerCustomerParty' }],
    validationLevel: 'strict', isMultiError: true,
    input: {
      id: 'MTX2026000000111', uuid: 'b1000111-0001-4000-8001-000000000111',
      datetime: '2026-04-24T10:00:00',
      profile: 'IHRACAT', type: 'ISTISNA', currencyCode: 'USD', exchangeRate: 32.5,
      kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'İhracat', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  // PROFILE_REQUIREMENT — KAMU paymentMeans eksik
  {
    kind: 'invalid-invoice', variantSlug: 'kamu-paymentmeans-eksik',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'KAMU profilinde paymentMeans eksik',
    profileContext: 'KAMU', typeContext: 'SATIS',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'PaymentMeans' }],
    validationLevel: 'strict', isMultiError: true,
    input: {
      id: 'MTX2026000000112', uuid: 'b1000112-0001-4000-8001-000000000112',
      datetime: '2026-04-24T10:00:00',
      profile: 'KAMU', type: 'SATIS', currencyCode: 'TRY',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER },
      // paymentMeans EKSİK
      lines: [{ name: 'Kamu satış', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  // YATIRIMTESVIK_REQUIRES_YTBNO — YATIRIMTESVIK ytbNo eksik
  // Sprint 8f.3 (Bug #3 fix): expected error code PROFILE_REQUIREMENT → YATIRIMTESVIK_REQUIRES_YTBNO
  // semantik net hata için yeni code.
  {
    kind: 'invalid-invoice', variantSlug: 'yatirimtesvik-ytbno-eksik',
    primaryCode: 'YATIRIMTESVIK_REQUIRES_YTBNO',
    description: 'YATIRIMTESVIK profilinde ytbNo eksik → YATIRIMTESVIK_REQUIRES_YTBNO',
    profileContext: 'YATIRIMTESVIK', typeContext: 'SATIS',
    expectedErrors: [{ code: 'YATIRIMTESVIK_REQUIRES_YTBNO', messageIncludes: 'YTBNO' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      id: 'MTX2026000000113', uuid: 'b1000113-0001-4000-8001-000000000113',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'SATIS', currencyCode: 'TRY',
      // ytbNo EKSİK
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Makine', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01',
        productTraceId: 'X', serialId: 'Y', brand: 'B', model: 'M',
      }],
    },
  },

  // TYPE_REQUIREMENT — IADE + billingReference eksik
  {
    kind: 'invalid-invoice', variantSlug: 'iade-billingreference-eksik',
    primaryCode: 'TYPE_REQUIREMENT',
    description: 'TEMELFATURA+IADE billingReference eksik',
    profileContext: 'TEMELFATURA', typeContext: 'IADE',
    expectedErrors: [{ code: 'TYPE_REQUIREMENT', messageIncludes: 'BillingReference' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      id: 'MTX2026000000114', uuid: 'b1000114-0001-4000-8001-000000000114',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'IADE', currencyCode: 'TRY',
      // billingReference EKSİK
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'İade', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  // TYPE_REQUIREMENT — SGK + sgk objesi eksik
  {
    kind: 'invalid-invoice', variantSlug: 'sgk-sgk-eksik',
    primaryCode: 'TYPE_REQUIRES_SGK',
    description: 'TEMELFATURA+SGK tipi ama sgk objesi yok',
    profileContext: 'TEMELFATURA', typeContext: 'SGK',
    expectedErrors: [{ code: 'TYPE_REQUIRES_SGK' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      id: 'MTX2026000000115', uuid: 'b1000115-0001-4000-8001-000000000115',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'SGK', currencyCode: 'TRY',
      // sgk EKSİK
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{ name: 'SGK satış', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },
  // TYPE_REQUIREMENT — OZELMATRAH + ozelMatrah eksik
  // Not: Bug #2 nedeniyle kaldırıldı. Validator OZELMATRAH tipinde ozelMatrah
  // objesi eksik olmasına rağmen hata üretmiyor (actual.errors = []).
  // Sprint 8f'ye taşındı — Bulunan Buglar §Bug #2.

  // ═════════════════════════════════════════════════════════════════════
  // Sınıf B — Cross-check / exemption errors
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invalid-invoice', variantSlug: 'kod-bilinmeyen-999',
    primaryCode: 'UNKNOWN_EXEMPTION_CODE',
    description: 'İstisna kodu whitelist dışında (999)',
    profileContext: 'TEMELFATURA', typeContext: 'ISTISNA',
    expectedErrors: [{ code: 'UNKNOWN_EXEMPTION_CODE' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000120', 'b1000120-0001-4000-8001-000000000120'),
      type: 'ISTISNA', kdvExemptionCode: '999',
      lines: [{ name: 'Test', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'cross-matrix-ihracat-satis',
    primaryCode: 'CROSS_MATRIX',
    description: 'IHRACAT profili + SATIS tipi (sadece ISTISNA izinli)',
    profileContext: 'IHRACAT', typeContext: 'SATIS',
    expectedErrors: [{ code: 'CROSS_MATRIX' }],
    validationLevel: 'strict', isMultiError: true,
    input: {
      ...baseInvoiceInput('MTX2026000000121', 'b1000121-0001-4000-8001-000000000121'),
      profile: 'IHRACAT', type: 'SATIS',
    },
  },
  {
    kind: 'invalid-invoice', variantSlug: '351-nonzero-kdv',
    primaryCode: 'EXEMPTION_351_FORBIDDEN_FOR_NONZERO_KDV',
    description: 'kdvExemptionCode=351 ama kdvPercent>0',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'EXEMPTION_351_REQUIRES_ZERO_KDV_LINE' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000122', 'b1000122-0001-4000-8001-000000000122'),
      kdvExemptionCode: '351',
    },
  },

  // ═════════════════════════════════════════════════════════════════════
  // Sınıf C — Specialized validators (Phantom / 702 / Manual / 555)
  // ═════════════════════════════════════════════════════════════════════

  {
    kind: 'invalid-invoice', variantSlug: 'phantom-kdv-yok',
    primaryCode: 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT',
    description: 'YATIRIMTESVIK+ISTISNA satırında kdvPercent=0 (phantom için >0 zorunlu)',
    profileContext: 'YATIRIMTESVIK', typeContext: 'ISTISNA',
    expectedErrors: [{ code: 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT' }],
    validationLevel: 'strict', isMultiError: true,
    input: {
      id: 'MTX2026000000130', uuid: 'b1000130-0001-4000-8001-000000000130',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'ISTISNA', currencyCode: 'TRY',
      ytbNo: '123456', kdvExemptionCode: '308',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Makine kdv=0', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
        itemClassificationCode: '01', kdvExemptionCode: '308',
        productTraceId: 'X', serialId: 'Y', brand: 'B', model: 'M',
      }],
    },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'phantom-kod-mismatch',
    primaryCode: 'YTB_ISTISNA_EXEMPTION_CODE_MISMATCH',
    description: 'YATIRIMTESVIK+ISTISNA itemClassificationCode=01 ama kod 339 (308 beklenen)',
    profileContext: 'YATIRIMTESVIK', typeContext: 'ISTISNA',
    expectedErrors: [{ code: 'YTB_ISTISNA_EXEMPTION_CODE_MISMATCH' }],
    validationLevel: 'strict', isMultiError: true,
    input: {
      id: 'MTX2026000000131', uuid: 'b1000131-0001-4000-8001-000000000131',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK', type: 'ISTISNA', currencyCode: 'TRY',
      ytbNo: '123456', kdvExemptionCode: '339',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Makine', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01', kdvExemptionCode: '339',  // 01 → 308 olmalı
        productTraceId: 'X', serialId: 'Y', brand: 'B', model: 'M',
      }],
    },
  },
  {
    kind: 'invalid-invoice', variantSlug: 'ihrackayitli-702-gtip-eksik',
    primaryCode: 'IHRACKAYITLI_702_REQUIRES_GTIP',
    description: 'IHRACKAYITLI+702 satırında GTİP eksik (12 hane zorunlu)',
    profileContext: 'TEMELFATURA', typeContext: 'IHRACKAYITLI',
    expectedErrors: [{ code: 'IHRACKAYITLI_702_REQUIRES_GTIP' }],
    validationLevel: 'strict', isMultiError: true,
    input: {
      id: 'MTX2026000000132', uuid: 'b1000132-0001-4000-8001-000000000132',
      datetime: '2026-04-24T10:00:00',
      profile: 'TEMELFATURA', type: 'IHRACKAYITLI', currencyCode: 'TRY',
      kdvExemptionCode: '702',
      sender: { ...STANDARD_SENDER },
      customer: { ...STANDARD_CUSTOMER },
      lines: [{
        name: 'Ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
        // delivery.gtipNo EKSİK
        delivery: {
          alicidibsatirkod: '12345678901',
          deliveryAddress: { address: 'L', district: 'A', city: 'İ', country: 'Türkiye' },
        },
      }],
    },
  },
  {
    kind: 'invalid-invoice', variantSlug: '555-gate-off',
    primaryCode: 'REDUCED_KDV_RATE_NOT_ALLOWED',
    description: '555 demirbaş KDV kodu + allowReducedKdvRate=false (default)',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'REDUCED_KDV_RATE_NOT_ALLOWED' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000133', 'b1000133-0001-4000-8001-000000000133'),
      kdvExemptionCode: '555',
      lines: [{
        name: 'Demirbaş', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
        kdvExemptionCode: '555',
      }],
    },
  },

  // ─── Sprint 8f.11 — Invalid single-error edge cases (+13) ───

  // Sprint 8f.2 (Bug #2) — OZELMATRAH + taxExemptionReasonCode eksik (yeni)
  {
    kind: 'invalid-invoice', variantSlug: 'ozelmatrah-kod-eksik',
    primaryCode: 'TYPE_REQUIREMENT',
    description: 'OZELMATRAH + taxExemptionReasonCode eksik (Bug #2 fix sonrası)',
    profileContext: 'TEMELFATURA', typeContext: 'OZELMATRAH',
    expectedErrors: [{ code: 'TYPE_REQUIREMENT', messageIncludes: '801-812' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000201', 'b1000201-0001-4000-8001-000000000201'),
      type: 'OZELMATRAH',
      ozelMatrah: { percent: 18, taxable: 500, amount: 90 },
      lines: [{ name: 'Özel matrah ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },

  // MISSING_FIELD — supplier city boş (farklı alan)
  {
    kind: 'invalid-invoice', variantSlug: 'supplier-taxoffice-bos',
    primaryCode: 'MISSING_FIELD',
    description: 'IHRACAT profilinde supplier.taxOffice boş (profil için zorunlu)',
    profileContext: 'IHRACAT', typeContext: 'ISTISNA',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'vergi dairesi' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000202', 'b1000202-0001-4000-8001-000000000202'),
      profile: 'IHRACAT', type: 'ISTISNA',
      currencyCode: 'USD', exchangeRate: 32.5, kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER, taxOffice: '' },
      buyerCustomer: { name: 'FB', taxNumber: 'X1', address: 'A', district: 'D', city: 'C', country: 'UK' },
      lines: [{ name: 'İhr', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
        delivery: { deliveryTermCode: 'FOB', gtipNo: '847330000001',
          deliveryAddress: { address: 'L', district: 'A', city: 'İ', country: 'Türkiye' } } }],
    },
  },

  // MISSING_FIELD — UUID boş
  {
    kind: 'invalid-invoice', variantSlug: 'uuid-bos',
    primaryCode: 'MISSING_FIELD',
    description: 'UUID boş string',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'MISSING_FIELD', path: 'uuid' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('MTX2026000000203', 'b1000203-0001-4000-8001-000000000203'), uuid: '' },
  },

  // INVALID_FORMAT — Invoice ID pattern hatalı
  {
    kind: 'invalid-invoice', variantSlug: 'invoice-id-pattern',
    primaryCode: 'INVALID_FORMAT',
    description: 'Invoice ID pattern dışı (format 3 harf/rakam + 20XX + 9 rakam olmalı)',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_FORMAT', path: 'id' }],
    validationLevel: 'strict', isMultiError: false,
    input: { ...baseInvoiceInput('invalid-id', 'b1000204-0001-4000-8001-000000000204') },
  },

  // PROFILE_REQUIREMENT — IHRACAT delivery eksik
  {
    kind: 'invalid-invoice', variantSlug: 'ihracat-delivery-eksik',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'IHRACAT satırında delivery (GTİP + INCOTERMS) eksik',
    profileContext: 'IHRACAT', typeContext: 'ISTISNA',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'Delivery' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000205', 'b1000205-0001-4000-8001-000000000205'),
      profile: 'IHRACAT', type: 'ISTISNA',
      currencyCode: 'USD', exchangeRate: 32.5, kdvExemptionCode: '301',
      buyerCustomer: { name: 'Foreign Buyer', taxNumber: 'X12345', address: 'A', district: 'D', city: 'C', country: 'UK' },
      lines: [{ name: 'İhraç ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0 }],
    },
  },

  // PROFILE_REQUIREMENT — IDIS SEVKIYATNO eksik
  {
    kind: 'invalid-invoice', variantSlug: 'idis-sevkiyatno-eksik',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'IDIS profilinde supplier SEVKIYATNO kimliği eksik',
    profileContext: 'IDIS', typeContext: 'SATIS',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'SEVKIYATNO' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000206', 'b1000206-0001-4000-8001-000000000206'),
      profile: 'IDIS',
      lines: [{
        name: 'IDIS ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'ID0000206' }],
      }],
    },
  },

  // PROFILE_REQUIREMENT — HKS KUNYENO eksik
  {
    kind: 'invalid-invoice', variantSlug: 'hks-kunyeno-eksik',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'HKS satırında KUNYENO kimliği eksik',
    profileContext: 'HKS', typeContext: 'HKSSATIS',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'KUNYENO' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000207', 'b1000207-0001-4000-8001-000000000207'),
      profile: 'HKS', type: 'HKSSATIS',
      lines: [{ name: 'HKS ürün', quantity: 1, price: 500, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // PROFILE_REQUIREMENT — KAMU buyerCustomer VKN eksik
  {
    kind: 'invalid-invoice', variantSlug: 'kamu-buyervkn-eksik',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'KAMU profilinde buyerCustomer.taxNumber (VKN) eksik',
    profileContext: 'KAMU', typeContext: 'SATIS',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'VKN' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000208', 'b1000208-0001-4000-8001-000000000208'),
      profile: 'KAMU',
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER, taxNumber: '' },
      paymentMeans: { ...KAMU_PAYMENT_MEANS },
      lines: [{ name: 'Kamu ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // INVALID_FORMAT — YATIRIMTESVIK ytbNo 5 haneli
  {
    kind: 'invalid-invoice', variantSlug: 'ytbno-5-hane',
    primaryCode: 'INVALID_FORMAT',
    description: 'YATIRIMTESVIK ytbNo 6 hane değil (5 haneli)',
    profileContext: 'YATIRIMTESVIK', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_FORMAT', path: 'contractReference.id' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000209', 'b1000209-0001-4000-8001-000000000209'),
      profile: 'YATIRIMTESVIK',
      ytbNo: '12345', ytbIssueDate: '2026-01-15',
      lines: [{
        name: 'Makine', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01',
        productTraceId: 'PT', serialId: 'SN', brand: 'B', model: 'M',
      }],
    },
  },

  // PROFILE_REQUIREMENT — YATIRIMTESVIK satırda itemClassificationCode eksik
  {
    kind: 'invalid-invoice', variantSlug: 'ytb-classcode-eksik',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'YATIRIMTESVIK satırda itemClassificationCode eksik',
    profileContext: 'YATIRIMTESVIK', typeContext: 'SATIS',
    expectedErrors: [{ code: 'PROFILE_REQUIREMENT', messageIncludes: 'ItemClassificationCode' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000210', 'b1000210-0001-4000-8001-000000000210'),
      profile: 'YATIRIMTESVIK',
      ytbNo: '123456', ytbIssueDate: '2026-01-15',
      lines: [{ name: 'Teşvikli mal', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // TYPE_REQUIREMENT — TEVKIFAT tipinde withholdingTaxCode eksik
  {
    kind: 'invalid-invoice', variantSlug: 'tevkifat-withholding-eksik',
    primaryCode: 'TYPE_REQUIREMENT',
    description: 'TEVKIFAT tipinde withholdingTaxTotals eksik',
    profileContext: 'TEMELFATURA', typeContext: 'TEVKIFAT',
    expectedErrors: [{ code: 'TYPE_REQUIREMENT', messageIncludes: 'WithholdingTaxTotal' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000211', 'b1000211-0001-4000-8001-000000000211'),
      type: 'TEVKIFAT',
      lines: [{ name: 'Tevkifat hizmet', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // PROFILE_REQUIREMENT — EARSIV+YTB tipinde ytbNo eksik (Bug #3)
  {
    kind: 'invalid-invoice', variantSlug: 'earsiv-ytbsatis-ytbno-eksik',
    primaryCode: 'YATIRIMTESVIK_REQUIRES_YTBNO',
    description: 'EARSIV+YTBSATIS tipinde ytbNo eksik (Bug #3 EARSIV branch)',
    profileContext: 'EARSIVFATURA', typeContext: 'YTBSATIS',
    expectedErrors: [{ code: 'YATIRIMTESVIK_REQUIRES_YTBNO' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000213', 'b1000213-0001-4000-8001-000000000213'),
      profile: 'EARSIVFATURA', type: 'YTBSATIS',
      lines: [{ name: 'YTB mal', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20,
        itemClassificationCode: '01',
        productTraceId: 'PT', serialId: 'SN', brand: 'B', model: 'M' }],
    },
  },

  // ─── Sprint 8f.12 — Multi-error cases (+6, plan §11 kesim: 12→6) ───

  // Multi-error 1: supplier.vkn + customer.name birlikte boş
  {
    kind: 'invalid-invoice', variantSlug: 'multi-supplier-customer-bos',
    primaryCode: 'MISSING_FIELD',
    description: 'Multi-error: supplier.vkn + customer.name birlikte boş',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [
      { code: 'MISSING_FIELD', path: 'supplier.vknTckn' },
      { code: 'MISSING_FIELD', path: 'customer.name' },
    ],
    validationLevel: 'strict', isMultiError: true,
    input: {
      ...baseInvoiceInput('MTX2026000000301', 'b1000301-0001-4000-8001-000000000301'),
      sender: { ...STANDARD_SENDER, taxNumber: '' },
      customer: { ...STANDARD_CUSTOMER, name: '' },
    },
  },

  // Multi-error 2: YATIRIMTESVIK ytbNo eksik + ItemClassificationCode eksik
  {
    kind: 'invalid-invoice', variantSlug: 'multi-ytb-iki-hata',
    primaryCode: 'YATIRIMTESVIK_REQUIRES_YTBNO',
    description: 'Multi-error: YATIRIMTESVIK ytbNo eksik + ItemClassificationCode eksik',
    profileContext: 'YATIRIMTESVIK', typeContext: 'SATIS',
    expectedErrors: [
      { code: 'YATIRIMTESVIK_REQUIRES_YTBNO' },
      { code: 'PROFILE_REQUIREMENT', messageIncludes: 'ItemClassificationCode' },
    ],
    validationLevel: 'strict', isMultiError: true,
    input: {
      ...baseInvoiceInput('MTX2026000000302', 'b1000302-0001-4000-8001-000000000302'),
      profile: 'YATIRIMTESVIK',
      lines: [{ name: 'Mal', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // Multi-error 3: KAMU paymentMeans eksik + buyerCustomer vkn eksik
  {
    kind: 'invalid-invoice', variantSlug: 'multi-kamu-iki-hata',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'Multi-error: KAMU paymentMeans + buyerCustomer.vkn eksik',
    profileContext: 'KAMU', typeContext: 'SATIS',
    expectedErrors: [
      { code: 'PROFILE_REQUIREMENT', messageIncludes: 'PaymentMeans' },
      { code: 'PROFILE_REQUIREMENT', messageIncludes: 'VKN' },
    ],
    validationLevel: 'strict', isMultiError: true,
    input: {
      ...baseInvoiceInput('MTX2026000000303', 'b1000303-0001-4000-8001-000000000303'),
      profile: 'KAMU',
      customer: { ...STANDARD_CUSTOMER, taxNumber: '1460415308', name: 'T.C. Kamu Kurumu' },
      buyerCustomer: { ...KAMU_BUYER_CUSTOMER, taxNumber: '' },
    },
  },

  // Multi-error 4: IADE billingReference eksik + TaxExemptionReason boş (KDV 0 kuralı)
  {
    kind: 'invalid-invoice', variantSlug: 'multi-iade-iki-hata',
    primaryCode: 'TYPE_REQUIREMENT',
    description: 'Multi-error: IADE billingReference eksik + KDV 0 TaxExemptionReason eksik',
    profileContext: 'TEMELFATURA', typeContext: 'IADE',
    expectedErrors: [
      { code: 'TYPE_REQUIREMENT', messageIncludes: 'BillingReference' },
    ],
    validationLevel: 'strict', isMultiError: true,
    input: {
      ...baseInvoiceInput('MTX2026000000304', 'b1000304-0001-4000-8001-000000000304'),
      type: 'IADE',
      lines: [{ name: 'İade ürün', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20 }],
    },
  },

  // Multi-error 5 (silindi — OZELMATRAH çift kod pattern validator'ın inceleme rotasında değildi,
  // INVALID_VALUE yerine sadece TYPE_REQUIREMENT üretiyor. Sprint 8g'ye ertelendi).

  // Multi-error 5: IHRACAT buyerCustomer yok + supplier.taxOffice yok
  {
    kind: 'invalid-invoice', variantSlug: 'multi-ihracat-iki-hata',
    primaryCode: 'PROFILE_REQUIREMENT',
    description: 'Multi-error: IHRACAT buyerCustomer + supplier.taxOffice birlikte eksik',
    profileContext: 'IHRACAT', typeContext: 'ISTISNA',
    expectedErrors: [
      { code: 'PROFILE_REQUIREMENT', messageIncludes: 'BuyerCustomer' },
      { code: 'PROFILE_REQUIREMENT', messageIncludes: 'vergi dairesi' },
    ],
    validationLevel: 'strict', isMultiError: true,
    input: {
      ...baseInvoiceInput('MTX2026000000306', 'b1000306-0001-4000-8001-000000000306'),
      profile: 'IHRACAT', type: 'ISTISNA',
      currencyCode: 'USD', exchangeRate: 32.5, kdvExemptionCode: '301',
      sender: { ...STANDARD_SENDER, taxOffice: '' },
      lines: [{ name: 'İhr mal', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 0,
        delivery: { deliveryTermCode: 'FOB', gtipNo: '847330000001',
          deliveryAddress: { address: 'L', district: 'A', city: 'İ', country: 'Türkiye' } } }],
    },
  },

  // ─── Sprint 8g.3 — 4171 invalid spec re-add (B-NEW-v2-03 doğru API ile) ───
  // 8f.11'de `manualTaxTotals` (yanlış field name) ile yazılmıştı, validator
  // tetiklemedi → silindi. Doğru API: `taxes: [{ code, percent }]`.
  {
    kind: 'invalid-invoice', variantSlug: 'tax-4171-yasak-tip',
    primaryCode: 'INVALID_VALUE',
    description: '4171 ÖTV Tevkifatı kodu SATIS tipinde kullanılamaz (sadece TEVKIFAT/IADE/SGK/YTBIADE)',
    profileContext: 'TEMELFATURA', typeContext: 'SATIS',
    expectedErrors: [{ code: 'INVALID_VALUE', path: 'taxTotals.taxSubtotals[0].taxTypeCode' }],
    validationLevel: 'strict', isMultiError: false,
    input: {
      ...baseInvoiceInput('MTX2026000000311', 'b1000311-0001-4000-8001-000000000311'),
      lines: [{
        name: 'Akaryakıt', quantity: 100, price: 50, unitCode: 'Litre', kdvPercent: 20,
        taxes: [{ code: '4171', percent: 10 }],
      }],
    },
  },
];

export const allSpecs: Array<ValidSpec | InvalidSpec> = [
  ...validSpecs,
  ...invalidSpecs,
];
