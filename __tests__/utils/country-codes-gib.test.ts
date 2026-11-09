/**
 * Ülke kodları ↔ GİB `$CountryCodeList` (T-KOD-8, GİB düzeltme planı Dalga 7).
 *
 * Denetim, kütüphanenin "ülke adı → ISO 3166-1 alpha-2" eşlemesini GİB listesiyle
 * karşılaştırmak istedi. Kütüphanede böyle bir eşleme YOKTUR (5.1.0 dist ve bugünkü
 * kaynak): ülke kodu hiçbir yerde addan türetilmez. `cbc:IdentificationCode` yalnız
 * çağıran `countryCode` / `originCountryCode` verdiğinde ve olduğu gibi yazılır;
 * basit girdi (`SimpleInvoiceInput`) ülke kodu alanı taşımaz, yalnız ülke ADI.
 *
 * Bu test o sözleşmeyi GİB'in bütün listesi üzerinde kilitler:
 *   • listedeki her kod, üretilen XML'e harfi harfine geçer (eşleme = birim eşleme);
 *   • basit girdiyle kurulan belgede ülke adından kod üretilmez.
 * Böylece kütüphanenin GİB listesinden ayrışabilecek bir tablosu yoktur; koda
 * çağıran karar verir. Liste teste kopyalanmaz, paketteki XML'den OKUNUR.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { serializeCountry } from '../../src/ubl/components/address';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

function gibCountryCodes(): string[] {
  const xml = readFileSync(resolve(__dirname, '../../schematrons/UBL-TR_Codelist.xml'), 'utf8');
  const match = /name="CountryCodeList"\s+value\s*=\s*"'([^']*)'"/.exec(xml);
  if (!match) throw new Error('$CountryCodeList şematron kod listesinde bulunamadı');
  return match[1].split(',').filter(Boolean);
}

const CODES = gibCountryCodes();

describe('ülke kodları ↔ GİB $CountryCodeList (T-KOD-8)', () => {
  it('liste okunur; tekrar yok', () => {
    expect(CODES.length).toBeGreaterThan(200);
    expect(new Set(CODES).size).toBe(CODES.length);
    // GİB listesi ISO 3166-1 alpha-2 dışında üç harfli 'CTR' değerini de taşır;
    // kütüphane onu da (aşağıda) değiştirmeden yazar.
    for (const code of CODES) expect(code).toMatch(/^[A-Z]{2,3}$/);
  });

  it('listedeki HER kod cac:Country ve cac:OriginCountry altına değişmeden yazılır', () => {
    const mismatched: string[] = [];
    for (const code of CODES) {
      for (const tag of ['Country', 'OriginCountry'] as const) {
        const xml = serializeCountry(code, 'Ad', '', tag);
        const written = /<cbc:IdentificationCode>([^<]*)<\/cbc:IdentificationCode>/.exec(xml)?.[1];
        if (written !== code) mismatched.push(`${tag}:${code}→${written}`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('basit girdide ülke adından kod TÜRETİLMEZ — belgede cbc:IdentificationCode yok', () => {
    const input: SimpleInvoiceInput = {
      id: 'TST2026000000008',
      uuid: 'a1b2c3d4-0008-4000-8008-000000000008',
      datetime: '2026-04-23T14:00:00',
      profile: 'TEMELFATURA',
      type: 'SATIS',
      currencyCode: 'TRY',
      sender: {
        taxNumber: '1234567890', name: 'Sınır Tanımaz Ticaret A.Ş.', taxOffice: 'Üsküdar',
        address: 'Barbaros Bulvarı No:123', district: 'Üsküdar', city: 'İstanbul', country: 'Türkiye',
      },
      customer: {
        taxNumber: '9876543210', name: 'Yeşil Alıcı Ltd. Şti.', taxOffice: 'Kadıköy',
        address: 'Bağdat Caddesi No:456', district: 'Kadıköy', city: 'İstanbul', country: 'Almanya',
      },
      lines: [{ name: 'Kalem', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20, origin: 'Fransa' }],
    };
    const xml = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input).xml;
    expect(xml).toContain('<cbc:Name>Almanya</cbc:Name>');
    expect(xml).toContain('<cbc:Name>Fransa</cbc:Name>');
    expect(xml).not.toContain('<cbc:IdentificationCode>');
  });
});
