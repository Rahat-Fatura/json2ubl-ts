import { describe, it, expect } from 'vitest';
import { serializeTaxSubtotal, serializeWithholdingTaxTotal } from '../../src/serializers/tax-serializer';
import type { TaxSubtotalInput, WithholdingTaxTotalInput } from '../../src/types/common';

/**
 * Sprint 4 / B-42 — Percent 2-basamak yuvarlama (M9 gereği).
 * Calculator tam float, serializer yazım anında 2 basamak. Kesirli oran korunur.
 */

describe('B-42 — TaxSubtotal Percent 2-basamak', () => {
  it('integer oran (18) → "18.00"', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 180,
      percent: 18,
      taxTypeCode: '0015',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).toContain('<cbc:Percent>18.00</cbc:Percent>');
  });

  it('kesirli oran (18.5) → "18.50" (kayıp yok)', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 185,
      percent: 18.5,
      taxTypeCode: '0015',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).toContain('<cbc:Percent>18.50</cbc:Percent>');
  });

  it('düşük kesirli oran (0.5) → "0.50"', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 5,
      percent: 0.5,
      taxTypeCode: '0059',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).toContain('<cbc:Percent>0.50</cbc:Percent>');
  });

  it('percent undefined → Percent etiketi yazılmaz', () => {
    const ts: TaxSubtotalInput = {
      taxableAmount: 1000,
      taxAmount: 0,
      taxTypeCode: '0015',
    };
    const xml = serializeTaxSubtotal(ts, 'TRY');
    expect(xml).not.toContain('<cbc:Percent>');
  });
});

/**
 * 4.1.0 — B-42'nin tevkifat yarısı GERİ ALINDI.
 *
 * B-42 `WithholdingTaxSubtotal/cbc:Percent`'i de 2 basamağa sabitlemişti
 * ("90.00"). Bu, GİB şematronunda belgeyi REDDETTİRİYORDU — canlı kanıt
 * (paket 20260701, POST /v1/validate):
 *   ruleId : WithholdingTaxTotalCheck
 *   mesaj  : "Uyumsuz vergi tipi yüzdesi: '606' vergi tipinin yüzdesi
 *             '90.00' olamaz"
 *
 * Kural (`UBL-TR_Common_Schematron.xml:312`) kod ile oranı BİTİŞİK bir
 * anahtara çevirip kod listesinde arar:
 *   concat(',', TaxTypeCode, Percent, ',')
 * `UBL-TR_Codelist.xml:17` listesi tamamen ondalıksızdır (`,60690,` …),
 * dolayısıyla "90.00" hiçbir zaman eşleşemez.
 *
 * ⚠️ `cac:TaxTotal` altındaki KDV Percent'i 2 basamakta KALIR (üstteki
 * describe) — oraya bağlı hiçbir şematron kuralı yoktur.
 *
 * ⚠️ Eski testler burada stopaj kodu `0003` kullanıyordu; `0003`
 * `$WithholdingTaxType` listesinde YOKTUR (liste yalnız 601-627 ve
 * 801-825) ve gerçek üretim akışında stopaj `cac:WithholdingTaxTotal`'a
 * DEĞİL, `cac:TaxTotal` altına yazılır. Bu yüzden örnekler gerçek
 * tevkifat kodlarıyla değiştirildi.
 */
describe('4.1.0 — WithholdingTaxSubtotal Percent ONDALIKSIZ (şematron şartı)', () => {
  const wtt = (percent: number, taxTypeCode: string): WithholdingTaxTotalInput => ({
    taxAmount: 100,
    taxSubtotals: [
      {
        taxableAmount: 1000,
        taxAmount: 100,
        percent,
        taxTypeCode,
        taxTypeName: 'Tevkifat',
      },
    ],
  });

  it('606 tevkifatı %90 → "90" (eskiden "90.00" idi — belge reddediliyordu)', () => {
    const xml = serializeWithholdingTaxTotal(wtt(90, '606'), 'TRY');
    expect(xml).toContain('<cbc:Percent>90</cbc:Percent>');
    expect(xml).not.toContain('<cbc:Percent>90.00</cbc:Percent>');
  });

  it('kod+oran anahtarı kod listesindeki biçimle birebir eşleşir (,60690,)', () => {
    const xml = serializeWithholdingTaxTotal(wtt(90, '606'), 'TRY');
    const percent = /<cbc:Percent>([^<]+)<\/cbc:Percent>/.exec(xml)?.[1];
    const code = /<cbc:TaxTypeCode>([^<]+)<\/cbc:TaxTypeCode>/.exec(xml)?.[1];
    // Şematronun kurduğu anahtarın aynısı:
    expect(`,${code}${percent},`).toBe(',60690,');
  });

  it('620 tevkifatı %70 → "70"', () => {
    expect(serializeWithholdingTaxTotal(wtt(70, '620'), 'TRY')).toContain(
      '<cbc:Percent>70</cbc:Percent>',
    );
  });

  it('801 tevkifatı %100 → "100"', () => {
    expect(serializeWithholdingTaxTotal(wtt(100, '801'), 'TRY')).toContain(
      '<cbc:Percent>100</cbc:Percent>',
    );
  });

  it('float artefaktı temizlenir (90.0000000001 → "90")', () => {
    expect(serializeWithholdingTaxTotal(wtt(90.0000000001, '606'), 'TRY')).toContain(
      '<cbc:Percent>90</cbc:Percent>',
    );
  });

  it('gerçekten kesirli bir oran verilirse KIRPILMAZ (veri uydurulmaz)', () => {
    // Kod listesinde kesirli oran yoktur; böyle bir değer şematronda
    // düşmelidir. Serializer sessizce tam sayıya yuvarlayıp GEÇERLİ
    // görünen ama YANLIŞ bir belge üretmemelidir.
    expect(serializeWithholdingTaxTotal(wtt(9.9, '606'), 'TRY')).toContain(
      '<cbc:Percent>9.9</cbc:Percent>',
    );
  });
});
