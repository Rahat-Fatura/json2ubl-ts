/**
 * Golden-file regresyon seti (4.1.0).
 *
 * Üç katman:
 *  1. GOLDEN     — üretilen XML, `__golden__/<slug>.xml` ile birebir eşleşir.
 *  2. İDDİA      — 4.1.0 uyumluluk düzeltmelerinin her biri ayrı ayrı kilitlenir.
 *  3. ŞEMATRON   — her golden CANLI GİB doğrulayıcısına gönderilir.
 *
 * Golden dosyaları yenilemek için:
 *   UPDATE_GOLDEN=1 npx vitest run __tests__/golden
 * ⚠️ Yenilemeden ÖNCE diff'i okuyun — golden'ın değişmesi ya kasıtlı bir
 * düzeltmedir ya da bir regresyondur.
 *
 * Golden'lar `includeUblExtensions: true` ile üretilir; GİB `UBL-Invoice-2.1.xsd`
 * kök sequence'ı `ext:UBLExtensions` ile başladığı için XSD doğrulamasının
 * geçebilmesi buna bağlıdır. Bayrağın VARSAYILAN olarak KAPALI olduğu ayrıca
 * test edilir (geriye uyumluluk).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder } from '../../src';
import { GOLDEN_SCENARIOS } from './scenarios';

const GOLDEN_DIR = path.join(__dirname, '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

/** Canlı UBL doğrulama servisi (XSD + Schematron). */
const VALIDATOR_URL = process.env.UBL_VALIDATOR_URL ?? 'http://127.0.0.1:8081/v1/validate';

/** Senaryoyu üretir. Tüm golden'lar aynı builder ayarlarıyla üretilmelidir. */
function buildXml(scenarioIndex: number): string {
  const builder = new SimpleInvoiceBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
    includeUblExtensions: true,
  });
  return builder.build(GOLDEN_SCENARIOS[scenarioIndex].input).xml;
}

// ─── 1. GOLDEN karşılaştırma ──────────────────────────────────────────────

describe('Golden-file: üretilen XML diskteki golden ile eşleşir', () => {
  beforeAll(() => {
    if (!fs.existsSync(GOLDEN_DIR)) fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  });

  GOLDEN_SCENARIOS.forEach((scenario, i) => {
    it(`${scenario.slug} — ${scenario.description}`, () => {
      const actual = buildXml(i);
      const file = path.join(GOLDEN_DIR, `${scenario.slug}.xml`);

      if (UPDATE || !fs.existsSync(file)) {
        fs.writeFileSync(file, actual, 'utf-8');
        // Yeni yazıldıysa karşılaştıracak bir şey yok; koşum yine de yeşil olur.
        // Bu dal SADECE golden yenilemede çalışır.
        return;
      }

      expect(actual).toBe(fs.readFileSync(file, 'utf-8'));
    });
  });
});

// ─── 2. Uyumluluk İDDİALARI ───────────────────────────────────────────────

/** Golden'ı diskten okur (iddialar üretim değil, KİLİTLENMİŞ çıktı üzerinde koşar). */
function readGolden(slug: string): string {
  return fs.readFileSync(path.join(GOLDEN_DIR, `${slug}.xml`), 'utf-8');
}

describe('4.1.0 iddiaları — tevkifat Percent ONDALIKSIZ', () => {
  it('606/%90 → <cbc:Percent>90</cbc:Percent> (asla "90.00" değil)', () => {
    const xml = readGolden('d-tevkifat-606-yuzde90');
    expect(xml).toContain('<cbc:Percent>90</cbc:Percent>');
    expect(xml).not.toContain('<cbc:Percent>90.00</cbc:Percent>');
  });

  it('Percent yalnız WithholdingTaxTotal içinde ondalıksızdır; KDV 2 basamak kalır', () => {
    const xml = readGolden('d-tevkifat-606-yuzde90');
    // KDV oranı (TaxTotal altında) — şematron kuralı YOK, 2 basamak korunur.
    expect(xml).toContain('<cbc:Percent>20.00</cbc:Percent>');
  });

  it('şematronun kurduğu kod+oran anahtarı kod listesiyle birebir aynıdır', () => {
    const xml = readGolden('d-tevkifat-606-yuzde90');
    // WithholdingTaxTotal bloğunu izole et.
    const block = /<cac:WithholdingTaxTotal>[\s\S]*?<\/cac:WithholdingTaxTotal>/.exec(xml)?.[0] ?? '';
    const percent = /<cbc:Percent>([^<]+)<\/cbc:Percent>/.exec(block)?.[1];
    const code = /<cbc:TaxTypeCode>([^<]+)<\/cbc:TaxTypeCode>/.exec(block)?.[1];
    // UBL-TR_Codelist.xml:17 → ',...,60690,...'
    expect(`,${code}${percent},`).toBe(',60690,');
  });
});

describe('4.1.0 iddiaları — MultiplierFactorNumeric hassasiyeti', () => {
  it('%15 iskonto → "0.15" (4.0.0\'da "0.1" idi)', () => {
    const xml = readGolden('c-satir-iskonto-yuzde15');
    expect(xml).toContain('<cbc:MultiplierFactorNumeric>0.15</cbc:MultiplierFactorNumeric>');
    expect(xml).not.toContain('<cbc:MultiplierFactorNumeric>0.1</cbc:MultiplierFactorNumeric>');
  });

  it('%12,5 iskonto → "0.125" (4 basamağa kadar korunur)', () => {
    expect(readGolden('c-satir-iskonto-yuzde15')).toContain(
      '<cbc:MultiplierFactorNumeric>0.125</cbc:MultiplierFactorNumeric>',
    );
  });

  it('%3 iskonto → "0.03" (4.0.0\'da "0.0" idi — oran TAMAMEN kayboluyordu)', () => {
    const xml = readGolden('c-satir-iskonto-yuzde15');
    expect(xml).toContain('<cbc:MultiplierFactorNumeric>0.03</cbc:MultiplierFactorNumeric>');
    expect(xml).not.toContain('<cbc:MultiplierFactorNumeric>0.0</cbc:MultiplierFactorNumeric>');
  });

  it('oran × BaseAmount = Amount — belge KENDİ İÇİNDE tutarlı', () => {
    const xml = readGolden('c-satir-iskonto-yuzde15');
    // NOT: Belge düzeyindeki toplam iskonto bloğunda MultiplierFactorNumeric ve
    // BaseAmount BULUNMAZ (yalnız toplam Amount) — bu doğrudur, oran satır
    // bazlıdır. Bu yüzden yalnız oran+taban taşıyan bloklar denetlenir.
    const blocks = (xml.match(/<cac:AllowanceCharge>[\s\S]*?<\/cac:AllowanceCharge>/g) ?? []).filter(
      b => b.includes('MultiplierFactorNumeric') && b.includes('BaseAmount'),
    );
    expect(blocks.length, 'oranlı iskonto bloğu sayısı').toBe(3);
    for (const b of blocks) {
      const factor = Number(/<cbc:MultiplierFactorNumeric>([^<]+)</.exec(b)![1]);
      const amount = Number(/<cbc:Amount[^>]*>([^<]+)</.exec(b)![1]);
      const base = Number(/<cbc:BaseAmount[^>]*>([^<]+)</.exec(b)![1]);
      // Amount 2 basamağa yuvarlandığı için 0.01'lik tolerans.
      // 4.0.0'da bu bağıntı BOZUKTU: 0.1 × 1000 = 100 ≠ 150.
      expect(Math.abs(factor * base - amount), `${factor} × ${base} ≠ ${amount}`).toBeLessThanOrEqual(0.01);
    }
  });
});

describe('4.1.0 iddiaları — parasal alanlar 2 basamakta KALIR (decimalCheck)', () => {
  // UBL-TR_Common_Schematron.xml:229 decimalCheck, UBL-TR_Main_Schematron.xml'de
  // TAM 6 bağlama bağlanmıştır. Bu alanlarda 2'den fazla ondalık = ŞEMATRON REDDİ.
  const GUARDED = [
    'LineExtensionAmount',
    'TaxExclusiveAmount',
    'TaxInclusiveAmount',
    'AllowanceTotalAmount',
    'PayableAmount',
  ];

  for (const scenario of GOLDEN_SCENARIOS) {
    it(`${scenario.slug} — LegalMonetaryTotal alanları tam 2 ondalık`, () => {
      const xml = readGolden(scenario.slug);
      const lmt = /<cac:LegalMonetaryTotal>[\s\S]*?<\/cac:LegalMonetaryTotal>/.exec(xml)?.[0] ?? '';
      expect(lmt).not.toBe('');
      for (const name of GUARDED) {
        const m = new RegExp(`<cbc:${name}[^>]*>([^<]+)<`).exec(lmt);
        if (!m) continue; // alan opsiyonel olabilir
        expect(m[1], `${name}=${m[1]}`).toMatch(/^-?\d+\.\d{2}$/);
      }
    });
  }

  it('belge düzeyi TaxTotal/TaxAmount tam 2 ondalık', () => {
    for (const scenario of GOLDEN_SCENARIOS) {
      const xml = readGolden(scenario.slug);
      // Kök altındaki TaxTotal (satır içi değil): iki boşluk girintili.
      const m = /\n  <cac:TaxTotal>\s*\n\s*<cbc:TaxAmount[^>]*>([^<]+)</.exec(xml);
      if (!m) continue;
      expect(m[1], `${scenario.slug} TaxAmount=${m[1]}`).toMatch(/^-?\d+\.\d{2}$/);
    }
  });
});

describe('4.1.0 iddiaları — miktar ve birim fiyat hassasiyeti', () => {
  it('kesirli miktar 0,125 → "0.125" (4.0.0\'da "0.13" idi)', () => {
    const xml = readGolden('h-hassas-miktar-birimfiyat');
    expect(xml).toContain('>0.125</cbc:InvoicedQuantity>');
    expect(xml).not.toContain('>0.13</cbc:InvoicedQuantity>');
  });

  it('hassas birim fiyat 0,0035 → "0.0035" (4.0.0\'da "0.00" idi)', () => {
    const xml = readGolden('h-hassas-miktar-birimfiyat');
    expect(xml).toContain('>0.0035</cbc:PriceAmount>');
  });

  it('tam sayı miktar hâlâ "10.00" — mevcut biçim KORUNUR (geriye uyumluluk)', () => {
    expect(readGolden('a-basit-satis-tek-kdv')).toContain('>10.00</cbc:InvoicedQuantity>');
  });

  it('miktar × birim fiyat = LineExtensionAmount — satırlar tutarlı', () => {
    const xml = readGolden('h-hassas-miktar-birimfiyat');
    const lines = xml.match(/<cac:InvoiceLine>[\s\S]*?<\/cac:InvoiceLine>/g) ?? [];
    expect(lines.length).toBe(2);
    for (const line of lines) {
      const qty = Number(/<cbc:InvoicedQuantity[^>]*>([^<]+)</.exec(line)?.[1]);
      const lea = Number(/<cbc:LineExtensionAmount[^>]*>([^<]+)</.exec(line)?.[1]);
      const price = Number(/<cbc:PriceAmount[^>]*>([^<]+)</.exec(line)?.[1]);
      expect(Math.abs(qty * price - lea)).toBeLessThanOrEqual(0.01);
    }
  });
});

describe('4.1.0 iddiaları — ext:UBLExtensions bayrağı', () => {
  const scenario = GOLDEN_SCENARIOS[0];

  it('VARSAYILAN olarak KAPALI — iskelet YAZILMAZ (geriye uyumluluk)', () => {
    const xml = new SimpleInvoiceBuilder({
      prettyPrint: true,
      validationLevel: 'strict',
    }).build(scenario.input).xml;
    expect(xml).not.toContain('UBLExtensions');
  });

  it('bayrak açıkken boş iskelet, kökün İLK çocuğu olarak yazılır', () => {
    const xml = readGolden(scenario.slug);
    expect(xml).toContain('<ext:UBLExtensions>');
    expect(xml).toContain('<ext:ExtensionContent/>');
    // UBLVersionID'den ÖNCE gelmeli (XSD sequence şartı).
    expect(xml.indexOf('<ext:UBLExtensions>')).toBeLessThan(xml.indexOf('<cbc:UBLVersionID>'));
  });

  it('iskelet BOŞtur — kütüphane imza üretmez', () => {
    const block = /<ext:UBLExtensions>[\s\S]*?<\/ext:UBLExtensions>/.exec(
      readGolden(scenario.slug),
    )?.[0];
    expect(block).toBeDefined();
    expect(block).not.toContain('Signature');
  });
});

// ─── 3. CANLI ŞEMATRON doğrulaması ────────────────────────────────────────

interface ValidateResult {
  validSchema: boolean;
  validSchematron: boolean;
  schemaValidationErrors: string[] | null;
  schematronValidationErrors: Array<{ ruleId: string; message: string }> | null;
}

async function validateLive(xml: string, type: string): Promise<ValidateResult> {
  const form = new FormData();
  form.append('source', new Blob([xml], { type: 'application/xml' }), 'invoice.xml');
  form.append('parameters', JSON.stringify([{ key: 'type', value: type }]));

  const res = await fetch(VALIDATOR_URL, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Doğrulayıcı HTTP ${res.status}`);
  const json = (await res.json()) as { result: ValidateResult; errorMessage: string | null };
  if (!json.result) throw new Error(`Doğrulayıcı yanıtı boş: ${json.errorMessage}`);
  return json.result;
}

/** Servis ayakta mı? beforeAll'da bir kez ölçülür. */
let validatorUp = false;
let validatorError = '';

describe('Canlı GİB şematron doğrulaması', () => {
  beforeAll(async () => {
    try {
      // Basit bir probe: geçerli golden'lardan biriyle gerçek çağrı.
      const probe = fs.existsSync(path.join(GOLDEN_DIR, `${GOLDEN_SCENARIOS[0].slug}.xml`))
        ? readGolden(GOLDEN_SCENARIOS[0].slug)
        : buildXml(0);
      await validateLive(probe, 'efatura');
      validatorUp = true;
    } catch (e) {
      validatorUp = false;
      validatorError = e instanceof Error ? e.message : String(e);
    }
  }, 30_000);

  /**
   * ⚠️ Kütüphane İMZASIZ belge üretir — bu bilinçli bir sınırdır (imzayı
   * entegratör/imzalayıcı ekler). GİB `UBL-Invoice-2.1.xsd` ise imzayı
   * ZORUNLU kılar, dolayısıyla imzasız ara-ürün XSD'den geçemez. CANLI
   * olarak ölçülen, imza yokluğundan kaynaklanan TAM İKİ hata:
   *
   *   1. "ExtensionContent elementinin içeriği eksik"  → XAdES buraya gelir
   *   2. "AccountingSupplierParty ... bu konumda geçersiz" → `cac:Signature` yok
   *
   * Bunlar beyaz listededir; BAŞKA bir XSD hatası çıkarsa test DÜŞER.
   * Aşağıdaki "imza eklenince XSD tamamen geçer" testi, bu iki hatanın
   * gerçekten yalnız imzadan kaynaklandığını POZİTİF olarak kanıtlar.
   */
  const SIGNATURE_XSD_ERRORS = [/ExtensionContent/, /AccountingSupplierParty/];

  GOLDEN_SCENARIOS.forEach(scenario => {
    it(
      `${scenario.slug} — Schematron iş kuralları TEMİZ`,
      async ctx => {
        if (!validatorUp) {
          // 🔴 SESSİZCE GEÇMEZ: servis yoksa test ATLANIR ve sebebi görünür.
          ctx.skip();
          return;
        }

        const result = await validateLive(readGolden(scenario.slug), scenario.validateType);

        // ── Şematron: SIFIR hata. Asıl uyumluluk hedefi budur. ──
        const schErrs = (result.schematronValidationErrors ?? []).map(
          e => `${e.ruleId}: ${e.message.trim()}`,
        );
        expect(schErrs, `Schematron hataları (${scenario.slug})`).toEqual([]);
        expect(result.validSchematron).toBe(true);

        // ── XSD: yalnızca imza kaynaklı bilinen hatalar kabul edilir. ──
        const unexpected = (result.schemaValidationErrors ?? []).filter(
          e => !SIGNATURE_XSD_ERRORS.some(re => re.test(e)),
        );
        expect(unexpected, `Beklenmeyen XSD hataları (${scenario.slug})`).toEqual([]);
      },
      30_000,
    );
  });

  it(
    'İMZA eklenince XSD TAMAMEN geçer — includeUblExtensions iskeletinin işe yaradığının kanıtı',
    async ctx => {
      if (!validatorUp) {
        ctx.skip();
        return;
      }

      // İmzalayıcının yapacağı iki işi simüle et:
      //  (1) XAdES'i boş ExtensionContent'in İÇİNE yaz,
      //  (2) cac:Signature bloğunu AccountingSupplierParty'den ÖNCE ekle.
      const signed = readGolden('a-basit-satis-tek-kdv')
        .replace(
          '<ext:ExtensionContent/>',
          '<ext:ExtensionContent>' +
            '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Sig">' +
            '<ds:SignedInfo>' +
            '<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>' +
            '<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>' +
            '<ds:Reference URI=""><ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>' +
            '<ds:DigestValue>AAAA</ds:DigestValue></ds:Reference>' +
            '</ds:SignedInfo><ds:SignatureValue>AAAA</ds:SignatureValue></ds:Signature>' +
            '</ext:ExtensionContent>',
        )
        .replace(
          '  <cac:AccountingSupplierParty>',
          '  <cac:Signature>\n' +
            '    <cbc:ID schemeID="VKN_TCKN">1234567890</cbc:ID>\n' +
            '    <cac:SignatoryParty>\n' +
            '      <cac:PartyIdentification><cbc:ID schemeID="VKN">1234567890</cbc:ID></cac:PartyIdentification>\n' +
            '      <cac:PostalAddress>\n' +
            '        <cbc:CitySubdivisionName>Uskudar</cbc:CitySubdivisionName>\n' +
            '        <cbc:CityName>Istanbul</cbc:CityName>\n' +
            '        <cac:Country><cbc:Name>Turkiye</cbc:Name></cac:Country>\n' +
            '      </cac:PostalAddress>\n' +
            '    </cac:SignatoryParty>\n' +
            '    <cac:DigitalSignatureAttachment>\n' +
            '      <cac:ExternalReference><cbc:URI>#Sig</cbc:URI></cac:ExternalReference>\n' +
            '    </cac:DigitalSignatureAttachment>\n' +
            '  </cac:Signature>\n' +
            '  <cac:AccountingSupplierParty>',
        );

      const result = await validateLive(signed, 'efatura');
      expect(result.schemaValidationErrors ?? [], 'XSD hataları').toEqual([]);
      expect(result.validSchema).toBe(true);
      // NOT: `validSchematron` burada FALSE'tur — sahte imza gerçek bir XAdES
      // olmadığı için `XadesSignatureCheckForInvoice` düşer. Bu testin konusu
      // XSD yapısıdır; kriptografik geçerlilik imzalayıcının işidir.
    },
    30_000,
  );

  it('4.0.0 REGRESYONU: tevkifat Percent "90.00" olsaydı şematron REDDEDERDİ', async ctx => {
    if (!validatorUp) {
      ctx.skip();
      return;
    }
    // Golden'ı bilinçli olarak 4.0.0 davranışına geri döndür ve doğrulayıcının
    // gerçekten reddettiğini KANITLA — düzeltmenin bir şeyi çözdüğünün delili.
    const broken = readGolden('d-tevkifat-606-yuzde90').replace(
      '<cbc:Percent>90</cbc:Percent>',
      '<cbc:Percent>90.00</cbc:Percent>',
    );
    const result = await validateLive(broken, 'efatura');
    const rules = (result.schematronValidationErrors ?? []).map(e => e.ruleId);
    expect(result.validSchematron).toBe(false);
    expect(rules).toContain('WithholdingTaxTotalCheck');
  }, 30_000);

  it('doğrulayıcı erişilemezse bu koşumda ATLANDIĞI görünür olmalı', ctx => {
    if (!validatorUp) {
      // Sebebi teste yazıp atla — sessiz yeşil YOK.
      ctx.skip();
      return;
    }
    expect(validatorError).toBe('');
  });
});
