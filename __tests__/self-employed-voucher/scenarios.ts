/**
 * e-SMM SENARYO MATRİSİ — beş dal, hepsi determinist.
 *
 * Matris ekseni e-SMM'in vergi düzlemidir; fatura tarafındaki profil×tip
 * matrisinin karşılığı YOKTUR (e-SMM'de ikisi de tek değerlidir). Sınanan dallar:
 *
 *   a — stopajsız        : 12/12 PROD belgenin taşıdığı hâl (tek vergi `0015`)
 *   b — stopajlı         : `0003` devrede — 🔴 PROD ÖRNEĞİ OLMAYAN dal
 *   c — KDV tevkifatlı   : `9015` devrede (matrah = hesaplanan KDV)
 *   d — dövizli          : `PricingExchangeRate` + 6 ondalık (`CurrencyCodeCheck`)
 *   e — istisna (KDV=0)  : `TaxExemptionReason` ZORUNLU (`TaxExemptionReasonCheck`)
 *
 * 🔴 FİKSTÜRLER SENTETİKTİR. Elimizdeki 12 gerçek prod e-SMM'in İÇERİĞİ hiçbir
 * yere kopyalanmadı; yalnız YAPISI (eleman sırası, hangi alan var/yok, hangi
 * kodlar kullanılıyor) okundu. Buradaki VKN/TCKN, ad ve adres verilerinin tamamı
 * uydurmadır.
 */

import type { SimpleSelfEmployedVoucherInput } from '../../src/documents/self-employed-voucher';

export interface SelfEmployedVoucherScenario {
  /** Golden dosya adı (`__golden__/<slug>.xml`). */
  slug: string;
  description: string;
  input: SimpleSelfEmployedVoucherInput;
}

/** Serbest meslek erbabı — gerçek kişi (TCKN → `cac:Person`). */
const SUPPLIER: SimpleSelfEmployedVoucherInput['supplier'] = {
  taxNumber: '11111111110',
  name: 'Ayse Yilmaz',
  address: 'Barbaros Mah. 1. Sk. No:2',
  district: 'Atasehir',
  city: 'Istanbul',
  zipCode: '34746',
  taxOffice: 'Kozyatagi',
  phone: '+90 216 000 00 00',
  email: 'ornek@ornek.test',
};

/**
 * Hizmeti alan — TÜZEL kişi (VKN).
 *
 * ⚠️ Tevkifat yükümlülüğü (GVK 94) tüzel kişi alıcıya bağlıdır; 12/12 prod
 * belgenin alıcısı TCKN'li olduğu için stopaj dalı sahada hiç görülmemiştir.
 * Bu fikstür o boşluğu SENTETİK olarak kapatır, prod kanıtın YERİNE GEÇMEZ.
 */
const CUSTOMER: SimpleSelfEmployedVoucherInput['customer'] = {
  taxNumber: '1234567890',
  name: 'Ornek Danismanlik A.S.',
  address: 'Cumhuriyet Mah. 5. Cd. No:8',
  district: 'Sisli',
  city: 'Istanbul',
  zipCode: '34380',
  taxOffice: 'Mecidiyekoy',
};

/** Determinizm: golden dosyalarının değişmemesi için tarih/ETTN SABİT. */
const ISSUED_AT = '2026-09-16T14:30:00';

const base = (
  overrides: Partial<SimpleSelfEmployedVoucherInput>,
): SimpleSelfEmployedVoucherInput => ({
  documentNumber: 'SMM2026000000001',
  uuid: '11111111-2222-4333-8444-555555555555',
  datetime: ISSUED_AT,
  supplier: SUPPLIER,
  customer: CUSTOMER,
  sendMethod: 'ELEKTRONIK',
  lines: [],
  ...overrides,
});

export const SELF_EMPLOYED_VOUCHER_SCENARIOS: readonly SelfEmployedVoucherScenario[] = [
  {
    slug: 'a-stopajsiz-tek-kdv',
    description: 'Stopajsız, tek KDV — 12/12 prod belgenin taşıdığı hâl',
    input: base({
      lines: [{ name: 'Danismanlik hizmeti', quantity: 1, price: 10_000, kdvPercent: 20 }],
    }),
  },
  {
    slug: 'b-stopajli',
    description: 'Gelir vergisi stopajlı (0003 %20) — PROD ÖRNEĞİ OLMAYAN dal',
    input: base({
      documentNumber: 'SMM2026000000002',
      uuid: '22222222-2222-4333-8444-555555555555',
      incomeTaxWithholdingPercent: 20,
      lines: [{ name: 'Danismanlik hizmeti', quantity: 1, price: 10_000, kdvPercent: 20 }],
    }),
  },
  {
    slug: 'c-stopajli-kdv-tevkifatli',
    description: 'Stopaj (0003 %20) + KDV tevkifatı (9015 %50) — matrah hesaplanan KDV',
    input: base({
      documentNumber: 'SMM2026000000003',
      uuid: '33333333-2222-4333-8444-555555555555',
      incomeTaxWithholdingPercent: 20,
      vatWithholdingPercent: 50,
      lines: [{ name: 'Danismanlik hizmeti', quantity: 1, price: 10_000, kdvPercent: 20 }],
    }),
  },
  {
    slug: 'd-dovizli-usd',
    description: 'USD — PricingExchangeRate zorunlu (CurrencyCodeCheck), 6 ondalık',
    input: base({
      documentNumber: 'SMM2026000000004',
      uuid: '44444444-2222-4333-8444-555555555555',
      currencyCode: 'USD',
      exchangeRate: 34.123456,
      incomeTaxWithholdingPercent: 20,
      lines: [{ name: 'Yurt disi danismanlik', quantity: 2, price: 1_500, kdvPercent: 20 }],
    }),
  },
  {
    slug: 'e-istisna-kdv-sifir',
    description: 'KDV 0 — TaxExemptionReason ZORUNLU (kod 351, üretimde kullanılan)',
    input: base({
      documentNumber: 'SMM2026000000005',
      uuid: '55555555-2222-4333-8444-555555555555',
      kdvExemptionCode: '351',
      lines: [
        {
          name: 'KDV istisnali hizmet',
          quantity: 1,
          price: 5_000,
          kdvPercent: 0,
          allowancePercent: 10,
        },
      ],
    }),
  },
];
