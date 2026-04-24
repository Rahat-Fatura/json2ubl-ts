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
];

export const invalidSpecs: InvalidSpec[] = [
  // (Sprint 8e.10-8e.13'te doldurulacak)
];

export const allSpecs: Array<ValidSpec | InvalidSpec> = [
  ...validSpecs,
  ...invalidSpecs,
];
