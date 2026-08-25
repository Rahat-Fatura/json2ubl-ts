/**
 * Golden-file senaryoları (4.1.0).
 *
 * Bu senaryolar UBL-TR uyumluluk düzeltmelerinin REGRESYON ÇIPASIDIR. Her biri
 * hem diskteki golden XML ile birebir karşılaştırılır (`golden.test.ts`) hem de
 * CANLI GİB şematronuna gönderilir.
 *
 * ⚠️ Girdiler DETERMİNİSTİK olmalıdır — `uuid`/`datetime` sabittir, rastgele
 * değer veya `new Date()` KULLANILMAZ; aksi halde golden karşılaştırma her
 * koşumda düşer.
 */

import type { SimpleInvoiceInput } from '../../src';

/** Tüm senaryolarda ortak satıcı (VKN — tüzel kişi). */
const SENDER = {
  taxNumber: '1234567890',
  name: 'Sınır Tanımaz Ticaret A.Ş.',
  taxOffice: 'Üsküdar',
  address: 'Barbaros Bulvarı No:123 Kat:5',
  district: 'Üsküdar',
  city: 'İstanbul',
  zipCode: '34664',
} as const;

/** Ortak alıcı (VKN — tüzel kişi). */
const CUSTOMER = {
  taxNumber: '9876543210',
  name: 'Yeşil Alıcı Ltd. Şti.',
  taxOffice: 'Kadıköy',
  address: 'Bağdat Caddesi No:456',
  district: 'Kadıköy',
  city: 'İstanbul',
  zipCode: '34710',
} as const;

export interface GoldenScenario {
  /** Golden dosya adı (uzantısız) ve test başlığı. */
  slug: string;
  /** Ne test ettiği — rapor/okunabilirlik için. */
  description: string;
  input: SimpleInvoiceInput;
  /**
   * Doğrulama servisine gönderilecek belge tipi parametresi.
   * e-Arşiv de UBL Invoice'tır; ayrı bir tip gerekirse burada verilir.
   */
  validateType: string;
}

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  // ─── (a) Basit satış, tek KDV ───────────────────────────────────────────
  {
    slug: 'a-basit-satis-tek-kdv',
    description: 'Tek satır, tek KDV oranı (%20) — temel akış',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000001',
      uuid: 'a0000000-0001-4000-8001-000000000001',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        { name: 'Ofis Sandalyesi', quantity: 10, price: 1500, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },

  // ─── (b) Çok-oranlı KDV ─────────────────────────────────────────────────
  {
    slug: 'b-coklu-kdv-oranlari',
    description: 'Üç ayrı KDV oranı (%1 / %10 / %20) — TaxSubtotal ayrışması',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000002',
      uuid: 'a0000000-0002-4000-8002-000000000002',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        { name: 'Temel Gıda', quantity: 10, price: 10, unitCode: 'Adet', kdvPercent: 1 },
        { name: 'İndirimli KDV Ürünü', quantity: 10, price: 20, unitCode: 'Adet', kdvPercent: 10 },
        { name: 'Standart KDV Ürünü', quantity: 10, price: 30, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },

  // ─── (c) Satır iskontolu — %15 REGRESYON ÇIPASI ─────────────────────────
  {
    slug: 'c-satir-iskonto-yuzde15',
    description:
      '🔴 ÇIPA: %15 satır iskontosu — MultiplierFactorNumeric 4.0.0\'da "0.1"e ' +
      'bozuluyordu (sabit 1 basamak). "0.15" olmalı.',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000003',
      uuid: 'a0000000-0003-4000-8003-000000000003',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        {
          name: '%15 İskontolu Ürün',
          quantity: 10,
          price: 100,
          unitCode: 'Adet',
          kdvPercent: 20,
          allowancePercent: 15,
        },
        {
          // %12,5 — 4.0.0'da yine "0.1"e düşüyordu; tek basamağın yetmediğini gösterir.
          name: '%12,5 İskontolu Ürün',
          quantity: 4,
          price: 250,
          unitCode: 'Adet',
          kdvPercent: 20,
          allowancePercent: 12.5,
        },
        {
          // %3 — 4.0.0'da "0.0"a düşüyordu, yani iskonto oranı TAMAMEN kayboluyordu.
          name: '%3 İskontolu Ürün',
          quantity: 20,
          price: 50,
          unitCode: 'Adet',
          kdvPercent: 20,
          allowancePercent: 3,
        },
      ],
    },
  },

  // ─── (d) Tevkifatlı — 606 %90 REGRESYON ÇIPASI ──────────────────────────
  {
    slug: 'd-tevkifat-606-yuzde90',
    description:
      '🔴 ÇIPA: 606 (İşgücü Temin) %90 tevkifat — 4.0.0 "90.00" yazıyordu ve GİB ' +
      'şematronu belgeyi REDDEDİYORDU (WithholdingTaxTotalCheck). "90" olmalı.',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000004',
      uuid: 'a0000000-0004-4000-8004-000000000004',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'TEVKIFAT',
      currencyCode: 'TRY',
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        {
          name: 'İşgücü Temin Hizmeti',
          quantity: 10,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
          withholdingTaxCode: '606', // %90 kısmi KDV tevkifatı
        },
      ],
    },
  },

  // ─── (d2) Tevkifat + iskonto — iki çıpanın BİRLİKTE olduğu hâl ──────────
  {
    slug: 'd2-tevkifat-606-arti-iskonto15',
    description:
      '🔴 ÇIPA: Kullanıcının canlı hatayı yakaladığı bileşim — tevkifatlı (606/%90) ' +
      'VE %15 iskontolu fatura. 4.0.0\'da hem şematron reddi hem oran kaybı vardı.',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000005',
      uuid: 'a0000000-0005-4000-8005-000000000005',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'TEVKIFAT',
      currencyCode: 'TRY',
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        {
          name: 'İşgücü Temin Hizmeti (iskontolu)',
          quantity: 10,
          price: 1000,
          unitCode: 'Adet',
          kdvPercent: 20,
          allowancePercent: 15,
          withholdingTaxCode: '606',
        },
      ],
    },
  },

  // ─── (e) İstisna — KDV 0 + kod ──────────────────────────────────────────
  {
    slug: 'e-istisna-kdv0-kod351',
    description: 'KDV istisnası: oran 0 + TaxExemptionReasonCode 351',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000006',
      uuid: 'a0000000-0006-4000-8006-000000000006',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      kdvExemptionCode: '351',
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        { name: 'İstisna Kapsamındaki Mal', quantity: 10, price: 250, unitCode: 'Adet', kdvPercent: 0 },
      ],
    },
  },

  // ─── (f) Döviz kurlu ────────────────────────────────────────────────────
  {
    slug: 'f-doviz-eur-kurlu',
    description: 'EUR fatura + ExchangeRate — currencyID ve kur alanları',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000007',
      uuid: 'a0000000-0007-4000-8007-000000000007',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'EUR',
      exchangeRate: 36.75,
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        { name: 'İthal Ürün', quantity: 5, price: 100, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },

  // ─── (g) e-Arşiv profili ────────────────────────────────────────────────
  {
    slug: 'g-earsiv-satis',
    description: 'EARSIVFATURA profili — TCKN alıcı + e-Arşiv gönderim bilgisi',
    // ⚠️ Doğrulayıcının kabul ettiği değer 'earchive'tır; 'EARSIVFATURA' bir
    // cbc:ProfileID değeridir, `type` parametresi değil (servis 400 döner).
    validateType: 'earchive',
    input: {
      id: 'GLD2026000000008',
      uuid: 'a0000000-0008-4000-8008-000000000008',
      datetime: '2026-04-23T10:00:00',
      profile: 'EARSIVFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      eArchiveInfo: { sendType: 'ELEKTRONIK' },
      sender: { ...SENDER },
      customer: {
        taxNumber: '12345678901', // TCKN — gerçek kişi
        name: 'Ayşe Yılmaz',
        address: 'Şakir Kesebir Caddesi No:77',
        district: 'Beşiktaş',
        city: 'İstanbul',
        zipCode: '34353',
      },
      lines: [
        { name: 'Perakende Ürün', quantity: 2, price: 349.9, unitCode: 'Adet', kdvPercent: 20 },
      ],
    },
  },

  // ─── (h) Hassas miktar / birim fiyat ────────────────────────────────────
  {
    slug: 'h-hassas-miktar-birimfiyat',
    description:
      '🔴 ÇIPA: Kesirli miktar (0,125) ve hassas birim fiyat (0,0035) — 4.0.0 ' +
      'sabit 2 basamakla bunları "0.13" ve "0.00"a indiriyordu.',
    validateType: 'efatura',
    input: {
      id: 'GLD2026000000009',
      uuid: 'a0000000-0009-4000-8009-000000000009',
      datetime: '2026-04-23T10:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      sender: { ...SENDER },
      customer: { ...CUSTOMER },
      lines: [
        {
          // 0,125 × 12.000 = 1.500 — miktar 4.0.0'da "0.13"e yuvarlanıyordu.
          name: 'Değerli Metal (kesirli miktar)',
          quantity: 0.125,
          price: 12000,
          unitCode: 'Kilogram',
          kdvPercent: 20,
        },
        {
          // 100.000 × 0,0035 = 350 — birim fiyat 4.0.0'da "0.00"a iniyordu.
          name: 'Vida (hassas birim fiyat)',
          quantity: 100000,
          price: 0.0035,
          unitCode: 'Adet',
          kdvPercent: 20,
        },
      ],
    },
  },
];
