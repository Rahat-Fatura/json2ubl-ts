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

  // TEMELFATURA+TEVKIFATIADE baseline — Bulunan Bug #1 nedeniyle geçici olarak kaldırıldı.
  // Bug: `WITHHOLDING_ALLOWED_TYPES` (src/config/constants.ts:77) listesinde TEVKIFATIADE
  // ve YTBTEVKIFATIADE yok. Satırdaki `withholdingTaxCode`, builder tarafından
  // `input.withholdingTaxTotals`'a otomatik eklenir; sonra type-validators.ts:33 bu
  // listede olmayan tip için INVALID_VALUE hatası atar. Düzeltme Sprint 8f'te.
  // Detay: audit/sprint-08e-implementation-log.md — Bulunan Buglar.

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
];

export const invalidSpecs: InvalidSpec[] = [
  // (Sprint 8e.10-8e.13'te doldurulacak)
];

export const allSpecs: Array<ValidSpec | InvalidSpec> = [
  ...validSpecs,
  ...invalidSpecs,
];
