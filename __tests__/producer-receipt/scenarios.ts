/**
 * e-MM SENARYO MATRİSİ — beş dal, hepsi determinist.
 *
 * Matris ekseni e-MM'in KESİNTİ düzlemidir. Fatura tarafındaki profil×tip
 * matrisinin karşılığı YOKTUR (e-MM'de ikisi de tek değerlidir), e-SMM'deki
 * istisna/KDV dalları da yoktur (müstahsil KDV mükellefi değildir). Sınanan
 * dallar:
 *
 *   a — düz stopajlı       : `0003` tek başına — 27 prod belgenin taşıdığı hâl
 *   b — çok kalemli        : farklı ürün/birim + KALEM BAZINDA farklı stopaj oranı
 *   c — ek kesintili       : `0003` + `8001` + `SGK_PRIM` üçü birden
 *   d — sıfır oranlı stopaj: `0003` %0 → kesinti satırı VAR, tutarı 0
 *   e — dövizli + iskontolu: `PricingExchangeRate` + satır indirimi
 *
 * 🔴 FİKSTÜRLER SENTETİKTİR. Elimizdeki 27 gerçek prod e-MM'in İÇERİĞİ hiçbir
 * yere kopyalanmadı; yalnız YAPISI (eleman sırası, hangi alan var/yok, hangi
 * kodlar kullanılıyor, tutarlar arasındaki EŞİTLİKLER) okundu. Buradaki
 * VKN/TCKN, ad, adres ve tutarların tamamı uydurmadır.
 */

import type { SimpleProducerReceiptInput } from '../../src/documents/producer-receipt';

export interface ProducerReceiptScenario {
  /** Golden dosya adı (`__golden__/<slug>.xml`). */
  slug: string;
  description: string;
  input: SimpleProducerReceiptInput;
}

/**
 * Belgeyi DÜZENLEYEN — tüccar/alıcı (tüzel kişi, VKN).
 *
 * ⚠️ UBL'de `cac:AccountingSupplierParty` yuvasına gider. Ekonomik sezgi
 * tersini söyler (malı SATAN müstahsildir) — prod'da 27/27 belge böyle ölçüldü.
 */
const ISSUER: SimpleProducerReceiptInput['issuer'] = {
  taxNumber: '1234567890',
  name: 'Ornek Sebze Meyve Tic. A.S.',
  address: 'Hal Cd. No:1',
  district: 'Kocasinan',
  city: 'Kayseri',
  zipCode: '38100',
  taxOffice: 'Kocasinan',
  phone: '+90 352 000 00 00',
  email: 'ornek@ornek.test',
};

/** MÜSTAHSİL — malı satan çiftçi (gerçek kişi, TCKN → `cac:Person`). */
const PRODUCER: SimpleProducerReceiptInput['producer'] = {
  taxNumber: '11111111110',
  name: 'Ahmet Ciftci',
  address: 'Koy Mah. 3. Sk. No:5',
  district: 'Melikgazi',
  city: 'Kayseri',
  zipCode: '38200',
};

/** Determinizm: golden dosyalarının değişmemesi için tarih/ETTN SABİT. */
const ISSUED_AT = '2026-09-16T14:30:00';

const base = (
  overrides: Partial<SimpleProducerReceiptInput>,
): SimpleProducerReceiptInput => ({
  documentNumber: 'MMB2026000000001',
  uuid: '11111111-2222-4333-8444-555555555555',
  datetime: ISSUED_AT,
  issuer: ISSUER,
  producer: PRODUCER,
  sendMethod: 'ELEKTRONIK',
  lines: [],
  ...overrides,
});

export const PRODUCER_RECEIPT_SCENARIOS: readonly ProducerReceiptScenario[] = [
  {
    slug: 'a-duz-stopaj',
    description: 'Tek kalem, yalnız gelir vergisi stopajı (0003 %2) — prod belgelerin düz hâli',
    input: base({
      incomeTaxWithholdingPercent: 2,
      lines: [{ name: 'Domates', quantity: 1000, price: 10, unitCode: 'Kilogram' }],
    }),
  },
  {
    slug: 'b-cok-kalemli',
    description: 'Üç kalem, KALEM BAZINDA farklı stopaj oranı (%2 / %4) — belge oranı ezilir',
    input: base({
      documentNumber: 'MMB2026000000002',
      uuid: '22222222-2222-4333-8444-555555555555',
      incomeTaxWithholdingPercent: 2,
      lines: [
        { name: 'Marul', quantity: 500, price: 8, unitCode: 'Kilogram' },
        // Borsada tescil edilmemiş ürün → GVK 94/11 uyarınca oran farklı.
        { name: 'Kivi', quantity: 250, price: 24.5, unitCode: 'Kilogram', incomeTaxWithholdingPercent: 4 },
        { name: 'Karnabahar', quantity: 120, price: 12, unitCode: 'Adet' },
      ],
    }),
  },
  {
    slug: 'c-ek-kesintili',
    description: 'Stopaj + borsa tescil (8001) + SGK primi (SGK_PRIM) — üç kesinti birden',
    input: base({
      documentNumber: 'MMB2026000000003',
      uuid: '33333333-2222-4333-8444-555555555555',
      incomeTaxWithholdingPercent: 2,
      exchangeRegistrationFeePercent: 0.2,
      socialSecurityPremiumPercent: 1,
      deliveryDate: '2026-09-15',
      lines: [{ name: 'Cilek', quantity: 400, price: 45, unitCode: 'Kilogram' }],
    }),
  },
  {
    slug: 'd-sifir-oranli-stopaj',
    description: 'Stopaj oranı %0 — kesinti SATIRI var, tutarı 0 (prod deseni)',
    input: base({
      documentNumber: 'MMB2026000000004',
      uuid: '44444444-2222-4333-8444-555555555555',
      // GVK 94: Cumhurbaşkanı oranı sıfıra kadar indirebilir. "Kesinti yok"
      // ile "oran sıfır" farklı beyanlardır; ikincisi satırı YAZAR.
      incomeTaxWithholdingPercent: 0,
      lines: [{ name: 'Kozalak', quantity: 60, price: 30, unitCode: 'Kilogram' }],
    }),
  },
  {
    slug: 'e-dovizli-iskontolu',
    description: 'USD + kur (CurrencyCodeCheck) + satır indirimi — AllowanceCharge TaxTotal SONRASI',
    input: base({
      documentNumber: 'MMB2026000000005',
      uuid: '55555555-2222-4333-8444-555555555555',
      currencyCode: 'USD',
      exchangeRate: 34.123456,
      incomeTaxWithholdingPercent: 2,
      sendMethod: 'KAGIT',
      lines: [
        { name: 'Kuru incir', quantity: 200, price: 6, unitCode: 'Kilogram', allowancePercent: 10 },
      ],
    }),
  },
  {
    slug: 'f-mera-fonu',
    description: 'Stopaj (0003 %4) + Mera Fonu (9040 %1) — brüt 10.000 → ödenecek 9.500',
    /* 🔴 BU SENARYO PROD ÖLÇÜMÜ DEĞİL. Korpusun 27 belgesinin HİÇBİRİNDE `9040`
     * geçmiyor; dayanak Karekod Standardı Kılavuzu V1.2 §2.5'in `merafonu`
     * satırı (Kasım 2023) ve GİB kod listesindeki "Mera Fonu" kaydıdır.
     * Senaryonun işi, dördüncü eksenin matrahının da BRÜT BEDEL olduğunu ve
     * toplam zincirinden (`TIA = TEA − Σ kesinti`) ayrı düşmediğini ÜRETİLEN
     * XML üzerinden kilitlemektir. */
    input: base({
      documentNumber: 'MMB2026000000006',
      uuid: '66666666-2222-4333-8444-555555555555',
      incomeTaxWithholdingPercent: 4,
      pastureFundPercent: 1,
      lines: [{ name: 'Bugday', quantity: 1000, price: 10, unitCode: 'Kilogram' }],
    }),
  },
];
