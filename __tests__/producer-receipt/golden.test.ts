/**
 * e-MM golden + CANLI şematron seti.
 *
 * Üç katman (`__tests__/golden/golden.test.ts` ile aynı disiplin):
 *   1. GOLDEN   — üretilen XML `__golden__/<slug>.xml` ile birebir eşleşir.
 *   2. İDDİA    — e-MM'e özgü kararlar tek tek kilitlenir.
 *   3. ŞEMATRON — her golden CANLI GİB doğrulayıcısına gönderilir.
 *
 * 🔴 1 ve 2 yalnızca "çıktı dünküyle aynı" der. "GİB kapısında ne oluyor"
 * iddiasını KATMAN 3 taşır; doğrulayıcı yoksa testler SKIPPED olur ve
 * `npm run test:strict` (REQUIRE_VALIDATOR=1) koşumu KIRMIZIYA düşürür.
 *
 * ── 🔴 e-SMM'DEN EN BÜYÜK FARK: BASTIRMA PROFİLİ YOK ───────────────────────
 * e-SMM `type=earchive` + `profile=unsigned-esmm` ile doğrulanıyor ve o profil
 * İKİ assert'i (`ProfileIDCheck` + `InvoiceTypeCodeCheck`) DEĞERE PİNLİ olarak
 * bastırıyor. e-MM'de böyle bir profile GEREK YOKTUR: GİB şematronunun bu iki
 * assert'i `Invoice` bağlamına bağlıdır ve `CreditNote` kökünde HİÇ KOŞMAZ
 * (aşağıdaki "SESSİZLİK ÖLÇÜLDÜ" testleri bunu tek tek kanıtlıyor).
 *
 * BASTIRILAN KURAL SAYISI: **0**. Bu yeşil, bastırma olmadan gelen yeşildir.
 *
 * ── 🔴 AMA "ŞEMATRON YEŞİL" BURADA DAHA AZ ŞEY SÖYLER ──────────────────────
 * Bastırma yok diye kapsam geniş DEĞİL: `CreditNote` kökünde şematron
 * `ProfileID`, `CreditNoteTypeCode` ve `TaxTypeCode` için hiçbir assert
 * koşturmuyor — uydurma değerler sessizce geçiyor. Bu testler o SESSİZLİĞİ de
 * ölçer, çünkü ölçülmemiş sessizlik yarın "şematron zaten bakıyor" sanılır ve
 * kütüphanedeki kapı gereksiz görülüp silinir.
 *
 * Golden yenileme:  UPDATE_GOLDEN=1 npx vitest run __tests__/producer-receipt
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  SimpleProducerReceiptBuilder,
  mapSimpleToProducerReceiptInput,
  validateProducerReceipt,
} from '../../src/documents/producer-receipt';
import { PRODUCER_RECEIPT_SCENARIOS } from './scenarios';
import { probeValidator, validateLive } from '../support/validator';

const GOLDEN_DIR = path.join(__dirname, '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

/** Doğrulayıcıya gönderilen düzlem — e-MM e-Arşiv düzlemindedir. */
const VALIDATE_TYPE = 'earchive';

function buildXml(index: number): string {
  return new SimpleProducerReceiptBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
    // 🔴 İskelet EMİT EDİLMEZ — gerekçe ve ölçüm `shape.ts` JSDoc'undadır.
    includeUblExtensions: false,
  }).build(PRODUCER_RECEIPT_SCENARIOS[index].input).xml;
}

function readGolden(slug: string): string {
  return fs.readFileSync(path.join(GOLDEN_DIR, `${slug}.xml`), 'utf-8');
}

// ─── 1. GOLDEN karşılaştırma ──────────────────────────────────────────────

describe('e-MM golden: üretilen XML diskteki golden ile eşleşir', () => {
  beforeAll(() => {
    if (!fs.existsSync(GOLDEN_DIR)) fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  });

  PRODUCER_RECEIPT_SCENARIOS.forEach((scenario, i) => {
    it(`${scenario.slug} — ${scenario.description}`, () => {
      const actual = buildXml(i);
      const file = path.join(GOLDEN_DIR, `${scenario.slug}.xml`);
      if (UPDATE || !fs.existsSync(file)) {
        fs.writeFileSync(file, actual, 'utf-8');
        return;
      }
      expect(actual).toBe(fs.readFileSync(file, 'utf-8'));
    });
  });
});

// ─── 2. e-MM İDDİALARI ────────────────────────────────────────────────────

describe('e-MM künyesi — CreditNote kökü, profil ve tip TEK DEĞERLİ', () => {
  it('her golden CreditNote KÖKLÜDÜR — Invoice DEĞİL', () => {
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      const xml = readGolden(s.slug);
      expect(xml).toContain('<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"');
      expect(xml).toContain('</CreditNote>');
      expect(xml).not.toContain('<Invoice ');
    }
  });

  it('her golden EARSIVBELGE + MUSTAHSILMAKBUZ taşır', () => {
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      const xml = readGolden(s.slug);
      expect(xml).toContain('<cbc:ProfileID>EARSIVBELGE</cbc:ProfileID>');
      expect(xml).toContain('<cbc:CreditNoteTypeCode>MUSTAHSILMAKBUZ</cbc:CreditNoteTypeCode>');
      // Fatura elemanı SIZMAMIŞ olmalı — kök tipin elemanı farklıdır.
      expect(xml).not.toContain('InvoiceTypeCode');
    }
  });

  it('UBL-TR ortak künyesi BEDAVA devralındı (UBLVersionID 2.1 · CustomizationID TR1.2)', () => {
    // 27/27 prod belge bu değerleri taşıyor; katmanlı yapı onları e-MM'e
    // yeniden yazmadan verir.
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      const xml = readGolden(s.slug);
      expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
      expect(xml).toContain('<cbc:CustomizationID>TR1.2</cbc:CustomizationID>');
      expect(xml).toContain('<cbc:CopyIndicator>false</cbc:CopyIndicator>');
    }
  });

  it('cbc:IssueTime HER belgede var (27/27 prod belge taşır)', () => {
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      expect(readGolden(s.slug)).toMatch(/<cbc:IssueTime>\d{2}:\d{2}:\d{2}<\/cbc:IssueTime>/);
    }
  });

  it('cac:Delivery/cbc:ActualDeliveryDate HER belgede var — e-SMM`de OLMAYAN eleman', () => {
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      expect(readGolden(s.slug)).toMatch(
        /<cac:Delivery>\s*<cbc:ActualDeliveryDate>\d{4}-\d{2}-\d{2}<\/cbc:ActualDeliveryDate>\s*<\/cac:Delivery>/,
      );
    }
  });

  it('teslim tarihi verilmezse DÜZENLEME tarihine düşer, verilirse AYNEN yazılır', () => {
    // a: verilmedi → issueDate (2026-09-16). c: 2026-09-15 verildi.
    expect(readGolden('a-duz-stopaj')).toContain('<cbc:ActualDeliveryDate>2026-09-16<');
    expect(readGolden('c-ek-kesintili')).toContain('<cbc:ActualDeliveryDate>2026-09-15<');
  });

  it('gönderim şekli EXT_SEND_METHOD referansıyla taşınır (prod deseni)', () => {
    expect(readGolden('a-duz-stopaj')).toContain(
      '<cbc:DocumentTypeCode>EXT_SEND_METHOD</cbc:DocumentTypeCode>',
    );
  });
});

describe('e-MM taraf rolleri — TERSİNE, ve XML bunu KANITLAR', () => {
  it('müstahsil (gerçek kişi) Customer tarafında — cac:Person ORADA', () => {
    const xml = readGolden('a-duz-stopaj');
    const customer = /<cac:AccountingCustomerParty>[\s\S]*?<\/cac:AccountingCustomerParty>/.exec(xml)![0];
    const supplier = /<cac:AccountingSupplierParty>[\s\S]*?<\/cac:AccountingSupplierParty>/.exec(xml)![0];

    // Müstahsil TCKN'li gerçek kişi → `cac:Person` + TCKN schemeID.
    expect(customer).toContain('schemeID="TCKN"');
    expect(customer).toContain('<cac:Person>');
    // Düzenleyen tüccar tüzel kişi → VKN + PartyName, Person YOK.
    expect(supplier).toContain('schemeID="VKN"');
    expect(supplier).toContain('<cac:PartyName>');
    expect(supplier).not.toContain('<cac:Person>');
  });

  it('düzenleyenin adı Supplier yuvasında — girdi alanı `issuer` olduğu hâlde', () => {
    const xml = readGolden('a-duz-stopaj');
    const supplier = /<cac:AccountingSupplierParty>[\s\S]*?<\/cac:AccountingSupplierParty>/.exec(xml)![0];
    expect(supplier).toContain('Ornek Sebze Meyve Tic. A.S.');
  });
});

describe('e-MM kesinti düzlemi — hepsi KESİNTİ, KDV YOK', () => {
  it('hiçbir golden KDV (0015) ya da KDV tevkifatı (9015) taşımaz', () => {
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      const xml = readGolden(s.slug);
      expect(xml).not.toContain('<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>');
      expect(xml).not.toContain('<cbc:TaxTypeCode>9015</cbc:TaxTypeCode>');
      expect(xml).not.toContain('WithholdingTaxTotal');
    }
  });

  it('düz dal yalnız 0003 taşır (27 prod belgenin hâli)', () => {
    const xml = readGolden('a-duz-stopaj');
    expect(xml).toContain('<cbc:TaxTypeCode>0003</cbc:TaxTypeCode>');
    expect(xml).not.toContain('<cbc:TaxTypeCode>8001</cbc:TaxTypeCode>');
    expect(xml).not.toContain('SGK_PRIM');
  });

  it('ek kesintili dal ÜÇ kodu da taşır ve sıra 0003 → 8001 → SGK_PRIM', () => {
    const xml = readGolden('c-ek-kesintili');
    const codes = [...xml.matchAll(/<cbc:TaxTypeCode>([^<]+)<\/cbc:TaxTypeCode>/g)].map(m => m[1]);
    // Belge düzeyi + satır düzeyi: her ikisinde de aynı sıra.
    expect(codes).toEqual(['0003', '8001', 'SGK_PRIM', '0003', '8001', 'SGK_PRIM']);
  });

  it('SGK_PRIM etiketi prod`da ölçülen hâliyle yazılır (GİB sözlüğünde YOK)', () => {
    expect(readGolden('c-ek-kesintili')).toContain('<cbc:Name>SGK Prim Kesintisi</cbc:Name>');
  });

  it('kesinti MATRAHI daima satır tutarıdır (27 prod belgede ölçüldü)', () => {
    // c: 400 × 45 = 18.000 brüt; üç kesintinin de matrahı 18.000 olmalı.
    const xml = readGolden('c-ek-kesintili');
    const bases = [...xml.matchAll(/<cbc:TaxableAmount currencyID="TRY">([\d.]+)<\/cbc:TaxableAmount>/g)]
      .map(m => m[1]);
    expect(new Set(bases)).toEqual(new Set(['18000.00']));
  });

  it('sıfır oranlı stopaj SATIRI YAZAR — "kesinti yok" ile aynı şey DEĞİL', () => {
    const xml = readGolden('d-sifir-oranli-stopaj');
    expect(xml).toContain('<cbc:TaxTypeCode>0003</cbc:TaxTypeCode>');
    expect(xml).toContain('<cbc:Percent>0.00</cbc:Percent>');
    // 60 × 30 = 1.800 brüt, kesinti 0 → ödenecek brüte EŞİT.
    expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="TRY">1800.00</cbc:TaxInclusiveAmount>');
    expect(xml).toContain('<cbc:PayableAmount currencyID="TRY">1800.00</cbc:PayableAmount>');
  });

  it('dövizli belgede PricingExchangeRate 6 ondalıkla yazılır', () => {
    const xml = readGolden('e-dovizli-iskontolu');
    expect(xml).toContain('<cac:PricingExchangeRate>');
    expect(xml).toContain('<cbc:SourceCurrencyCode>USD</cbc:SourceCurrencyCode>');
    expect(xml).toContain('<cbc:TargetCurrencyCode>TRY</cbc:TargetCurrencyCode>');
    expect(xml).toContain('<cbc:CalculationRate>34.123456</cbc:CalculationRate>');
  });
});

describe('e-MM satır şekli — CreditNoteLine sekansı', () => {
  it('miktar elemanı cbc:CreditedQuantity — InvoicedQuantity HİÇ geçmez', () => {
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      const xml = readGolden(s.slug);
      expect(xml).toContain('<cbc:CreditedQuantity');
      expect(xml).not.toContain('InvocedQuantity');
      expect(xml).not.toContain('<cbc:InvoicedQuantity');
    }
  });

  it('🔴 cac:TaxTotal, cac:AllowanceCharge`dan ÖNCE gelir — faturada TERSİ', () => {
    /* `CreditNoteLineType` sekansı `InvoiceLineType`tan bu noktada AYRILIR.
     * Elle sıra kursaydık faturadan kopyalanan sıra XSD'yi patlatırdı. */
    const xml = readGolden('e-dovizli-iskontolu');
    const line = /<cac:CreditNoteLine>[\s\S]*?<\/cac:CreditNoteLine>/.exec(xml)![0];
    expect(line).toContain('<cac:AllowanceCharge>');
    expect(line.indexOf('<cac:TaxTotal>')).toBeLessThan(line.indexOf('<cac:AllowanceCharge>'));
  });

  it('birim adı GİB koduna çözülür — "Kilogram" ham hâliyle gitmez', () => {
    const xml = readGolden('a-duz-stopaj');
    expect(xml).toContain('unitCode="KGM"');
    expect(xml).not.toContain('unitCode="Kilogram"');
  });
});

// ─── 3. CANLI ŞEMATRON ────────────────────────────────────────────────────

const validator = await probeValidator();

describe('e-MM canlı GİB doğrulaması (type=earchive · BASTIRMA PROFİLİ YOK)', () => {
  const liveIt = it.skipIf(!validator.up);

  PRODUCER_RECEIPT_SCENARIOS.forEach(scenario => {
    liveIt(
      `${scenario.slug} — XSD + Schematron TERTEMİZ (bastırma SIFIR)`,
      async () => {
        const result = await validateLive(readGolden(scenario.slug), VALIDATE_TYPE);

        const schErrs = (result.schematronValidationErrors ?? []).map(
          e => `${e.ruleId}: ${e.message.trim()}`,
        );
        expect(schErrs, `Schematron hataları (${scenario.slug})`).toEqual([]);
        expect(result.validSchematron).toBe(true);

        /* 🔴 XSD DE TEMİZ — e-SMM'de asla olmayan şey. `CreditNoteType`ta
         * `cac:Signature` 0..n ve `ext:UBLExtensions` 0..1 olduğu için İMZASIZ
         * e-MM şema-GEÇERLİDİR. Beyaz liste YOK: tek bir hata bile kırmızıdır. */
        expect(result.schemaValidationErrors ?? [], `XSD hataları (${scenario.slug})`).toEqual([]);
        expect(result.validSchema).toBe(true);
      },
      30_000,
    );
  });

  liveIt(
    'boş ext:UBLExtensions EMİT EDİLİRSE tek bilinen XSD hatası doğar — bedeli ÖLÇÜLÜ',
    async () => {
      /* `includeUblExtensions: true` imzayı kendi atan tüketici içindir ve
       * bedeli vardır: imzalayıcı doldurana kadar `ext:ExtensionContent` boştur
       * ve XSD onu reddeder. Bu test o bedeli ÇİVİLER — varsayılanın niye
       * `false` olduğu bir yorumdan ibaret kalmasın. */
      const xml = new SimpleProducerReceiptBuilder({
        prettyPrint: true,
        validationLevel: 'strict',
        includeUblExtensions: true,
      }).build(PRODUCER_RECEIPT_SCENARIOS[0].input).xml;

      const result = await validateLive(xml, VALIDATE_TYPE);
      const xsd = result.schemaValidationErrors ?? [];
      expect(xsd).toHaveLength(1);
      expect(xsd[0]).toMatch(/ExtensionContent/);
      // Şematron yine tertemiz: sorun yalnız şema düzlemindedir.
      expect(result.validSchematron).toBe(true);
    },
    30_000,
  );
});

describe('🔴 ŞEMATRONUN SESSİZLİĞİ ÖLÇÜLDÜ — kapı kütüphanede', () => {
  const liveIt = it.skipIf(!validator.up);

  /**
   * Bu blok "neyin YAKALANMADIĞINI" kanıtlar.
   *
   * Sessizlik ölçülmezse yarın biri "şematron zaten ProfileID'ye bakıyor" deyip
   * `bindings.ts`teki `enumValueRule`u siler ve hiçbir test kırmızı olmaz.
   * Testler o silmenin bedelini GÖSTERİR.
   */

  async function schematronRuleIds(mutate: (xml: string) => string): Promise<string[]> {
    const result = await validateLive(mutate(readGolden('a-duz-stopaj')), VALIDATE_TYPE);
    return (result.schematronValidationErrors ?? []).map(e => e.message.trim());
  }

  liveIt('uydurma ProfileID şematrondan GEÇER — e-SMM`de REDDEDİLİRDİ', async () => {
    const errs = await schematronRuleIds(x => x.replace('>EARSIVBELGE<', '>SACMAPROFIL<'));
    expect(errs).toEqual([]);
  }, 30_000);

  liveIt('uydurma CreditNoteTypeCode şematrondan GEÇER', async () => {
    const errs = await schematronRuleIds(x => x.replace('>MUSTAHSILMAKBUZ<', '>SACMATIP<'));
    expect(errs).toEqual([]);
  }, 30_000);

  liveIt('kod listesi dışı TaxTypeCode şematrondan GEÇER', async () => {
    const errs = await schematronRuleIds(x => x.replace(/>0003</g, '>9999<'));
    expect(errs).toEqual([]);
  }, 30_000);

  liveIt('bu üçünü kütüphane YAKALAR — şematronun bırakıp bizim tuttuğumuz yer', () => {
    /* Aynı üç bozulma ham katmanda hataya çevrilir. Canlı doğrulayıcı
     * gerekmez: bu, kütüphanenin KENDİ kapısının ölçümüdür. */
    const raw = mapSimpleToProducerReceiptInput(PRODUCER_RECEIPT_SCENARIOS[0].input);

    /* `as never` KASITLI: bu üç bozulma TİP DÜZEYİNDE zaten imkânsızdır — kapalı
     * enum ve kapalı kod kümesi onları derleme anında engeller. Test tam da
     * TİP DENETİMİ OLMAYAN tüketiciyi (düz JS çağıranı) temsil ediyor. */
    const badProfile = { ...raw, profileId: 'SACMAPROFIL' as never };
    const badType = { ...raw, receiptTypeCode: 'SACMATIP' as never };
    const badTax = {
      ...raw,
      taxTotal: {
        ...raw.taxTotal,
        taxSubtotals: raw.taxTotal.taxSubtotals.map(s => ({ ...s, taxTypeCode: '9999' as never })),
      },
    };

    expect(validateProducerReceipt(badProfile).map(e => e.path)).toContain('profileId');
    expect(validateProducerReceipt(badType).map(e => e.path)).toContain('receiptTypeCode');
    expect(validateProducerReceipt(badTax).map(e => e.path)).toContain(
      'taxTotal.taxSubtotals[0].taxTypeCode',
    );
  });
});

describe('CANLI: şematronun GERÇEKTEN koştuğu kanıtı', () => {
  const liveIt = it.skipIf(!validator.up);

  /**
   * 🔴 SAHTE YEŞİL KAPISI. Yukarıdaki blok "bu kurallar koşmuyor" diyor; bu
   * blok "ama şematronun KENDİSİ koşuyor" diyor. İkisi olmadan "validSchematron:
   * true" sonucu, servisin `CreditNote`u hiç işlememesiyle ayırt edilemezdi.
   */

  liveIt('geçersiz CustomizationID REDDEDİLİR — ve mesaj TR1.2/TR1.2.1 der', async () => {
    const result = await validateLive(
      readGolden('a-duz-stopaj').replace('>TR1.2<', '>SACMA<'),
      VALIDATE_TYPE,
    );
    expect(result.validSchematron).toBe(false);
    const msg = (result.schematronValidationErrors ?? []).map(e => e.message).join(' ');
    expect(msg).toContain('cbc:CustomizationID');
    /* 🔑 `TR1.2` mi `TR1.2.1` mi sorusu BU MESAJLA kapandı: kuralın kendisi
     * İKİSİNİ de kabul ettiğini söylüyor. Yürürlükteki değer `TR1.2` çünkü
     * 27/27 prod belge onu taşıyor — sapmak için sebep yok. */
    expect(msg).toContain('TR1.2');
    expect(msg).toContain('TR1.2.1');
  }, 30_000);

  liveIt('TR1.2.1 DE geçer — ölçüm, tercih değil', async () => {
    const result = await validateLive(
      readGolden('a-duz-stopaj').replace('<cbc:CustomizationID>TR1.2<', '<cbc:CustomizationID>TR1.2.1<'),
      VALIDATE_TYPE,
    );
    expect(result.schematronValidationErrors ?? []).toEqual([]);
    expect(result.validSchematron).toBe(true);
  }, 30_000);

  liveIt('geçersiz belge numarası REDDEDİLİR (documentIdRule ile aynı kural)', async () => {
    const result = await validateLive(
      readGolden('a-duz-stopaj').replace('>MMB2026000000001<', '>bozuk-numara<'),
      VALIDATE_TYPE,
    );
    expect(result.validSchematron).toBe(false);
    expect((result.schematronValidationErrors ?? []).map(e => e.message).join(' ')).toContain('cbc:ID');
  }, 30_000);

  liveIt('çözülmemiş birim adı REDDEDİLİR — resolveUnitCode olmasaydı belge düşerdi', async () => {
    const result = await validateLive(
      readGolden('a-duz-stopaj').replace('unitCode="KGM"', 'unitCode="Kilogram"'),
      VALIDATE_TYPE,
    );
    expect(result.validSchematron).toBe(false);
    expect((result.schematronValidationErrors ?? []).map(e => e.message).join(' ')).toContain('unitCode');
  }, 30_000);

  liveIt('2005 öncesi düzenleme tarihi REDDEDİLİR (B-65 aralığı CreditNote`ta DA koşar)', async () => {
    const result = await validateLive(
      readGolden('a-duz-stopaj').replace(/>2026-09-16</g, '>2001-01-01<'),
      VALIDATE_TYPE,
    );
    expect(result.validSchematron).toBe(false);
    expect((result.schematronValidationErrors ?? []).map(e => e.message).join(' ')).toContain('cbc:IssueDate');
  }, 30_000);

  liveIt('TRY dışı belgede kur SİLİNİRSE reddedilir (CurrencyCodeCheck)', async () => {
    const withoutRate = readGolden('e-dovizli-iskontolu').replace(
      /\s*<cac:PricingExchangeRate>[\s\S]*?<\/cac:PricingExchangeRate>/,
      '',
    );
    const result = await validateLive(withoutRate, VALIDATE_TYPE);
    expect(result.validSchematron).toBe(false);
    expect((result.schematronValidationErrors ?? []).map(e => e.message).join(' ')).toContain('kur');
  }, 30_000);
});
