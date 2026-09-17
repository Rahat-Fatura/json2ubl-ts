/**
 * e-SMM golden + CANLI şematron seti.
 *
 * Üç katman (`__tests__/golden/golden.test.ts` ile aynı disiplin):
 *   1. GOLDEN   — üretilen XML `__golden__/<slug>.xml` ile birebir eşleşir.
 *   2. İDDİA    — e-SMM'e özgü kararlar tek tek kilitlenir.
 *   3. ŞEMATRON — her golden CANLI GİB doğrulayıcısına gönderilir.
 *
 * 🔴 1 ve 2 yalnızca "çıktı dünküyle aynı" der. "GİB kapısında ne oluyor"
 * iddiasını KATMAN 3 taşır; doğrulayıcı yoksa testler SKIPPED olur ve
 * `npm run test:strict` (REQUIRE_VALIDATOR=1) koşumu KIRMIZIYA düşürür.
 *
 * ── 🔴 DOĞRULAYICIYA HANGİ KİMLİKLE GİDİLİYOR ──────────────────────────────
 * `type=earchive` + `profile=unsigned-esmm`.
 *
 * `EARSIVBELGE` ve `SERBESTMESLEKMAKBUZU` `UBL-TR_Codelist.xml`'de YOKTUR — GİB
 * e-SMM GÖVDESİ için kod listesi yayınlamaz. Bu yüzden Main şematron PROFİLSİZ
 * çağrıda belgeyi DAİMA reddeder (`ProfileIDCheck` + `InvoiceTypeCodeCheck`).
 * `unsigned-esmm` profili DEĞERE PİNLİ olarak yalnız bu iki assert'i bastırır.
 *
 * Aşağıdaki "profilsiz koşumda TAM İKİ kural reddeder" testi bu bastırmanın
 * SAHTE YEŞİL olmadığını kanıtlar: profil kaldırılınca belge gerçekten düşer ve
 * düşme sebebi TAM OLARAK o iki kuraldır, başkası değil.
 *
 * Golden yenileme:  UPDATE_GOLDEN=1 npx vitest run __tests__/self-employed-voucher
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleSelfEmployedVoucherBuilder } from '../../src/documents/self-employed-voucher';
import { SELF_EMPLOYED_VOUCHER_SCENARIOS } from './scenarios';
import { probeValidator, validateLive } from '../support/validator';

const GOLDEN_DIR = path.join(__dirname, '__golden__');
const UPDATE = process.env.UPDATE_GOLDEN === '1';

/** Doğrulayıcıya gönderilen düzlem — e-SMM e-Arşiv düzlemindedir. */
const VALIDATE_TYPE = 'earchive';
/** İki assert'i DEĞERE PİNLİ bastıran servis-tarafı profil. */
const SUPPRESSION_PROFILE = 'unsigned-esmm';

/**
 * Kütüphane İMZASIZ belge üretir (imzayı entegratör/imzalayıcı ekler). GİB
 * `UBL-Invoice-2.1.xsd` imzayı ZORUNLU kılar, dolayısıyla imzasız ara-ürün
 * XSD'den geçemez. İmza yokluğundan doğan hatalar ÖLÇÜLDÜ (2026-09-17, :8081,
 * şema paketi `2026-08-05-08-07-52`):
 *
 *   PROFİLSİZ (`type=earchive`)      → İKİ hata
 *     1. "ExtensionContent elementinin içeriği eksik"    → XAdES buraya gelir
 *     2. "AccountingSupplierParty ... bu konumda geçersiz" → `cac:Signature` yok
 *   `profile=unsigned-esmm`          → TEK hata (yalnız 1; profil `cac:Signature`
 *                                      şartını da gevşetir — "unsigned" profilin
 *                                      tanımı budur)
 *
 * Aynı iki hata FATURA golden'larında da BİREBİR görülür (ölçüldü): e-SMM XSD
 * kapısında faturayla AYNI konumdadır, yeni bir açık DEĞİLDİR.
 *
 * Beyaz liste İKİSİNİ de kapsar (profil davranışı değişirse test yalan söylemesin),
 * ama profilli koşumda kalan hatanın TEK ve HANGİSİ olduğu ayrıca çivilenir.
 */
const SIGNATURE_XSD_ERRORS = [/ExtensionContent/, /AccountingSupplierParty/];

function buildXml(index: number): string {
  return new SimpleSelfEmployedVoucherBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
    includeUblExtensions: true,
  }).build(SELF_EMPLOYED_VOUCHER_SCENARIOS[index].input).xml;
}

function readGolden(slug: string): string {
  return fs.readFileSync(path.join(GOLDEN_DIR, `${slug}.xml`), 'utf-8');
}

// ─── 1. GOLDEN karşılaştırma ──────────────────────────────────────────────

describe('e-SMM golden: üretilen XML diskteki golden ile eşleşir', () => {
  beforeAll(() => {
    if (!fs.existsSync(GOLDEN_DIR)) fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  });

  SELF_EMPLOYED_VOUCHER_SCENARIOS.forEach((scenario, i) => {
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

// ─── 2. e-SMM İDDİALARI ───────────────────────────────────────────────────

describe('e-SMM künyesi — profil ve tip TEK DEĞERLİ', () => {
  it('her golden EARSIVBELGE + SERBESTMESLEKMAKBUZU taşır', () => {
    for (const s of SELF_EMPLOYED_VOUCHER_SCENARIOS) {
      const xml = readGolden(s.slug);
      expect(xml).toContain('<cbc:ProfileID>EARSIVBELGE</cbc:ProfileID>');
      expect(xml).toContain('<cbc:InvoiceTypeCode>SERBESTMESLEKMAKBUZU</cbc:InvoiceTypeCode>');
    }
  });

  it('UBL-TR ortak künyesi BEDAVA devralındı (UBLVersionID 2.1 · CustomizationID TR1.2)', () => {
    // 12/12 prod belge bu değerleri kimse zorlamadığı hâlde taşıyor; katmanlı
    // yapı onları e-SMM'e yeniden yazmadan verir.
    for (const s of SELF_EMPLOYED_VOUCHER_SCENARIOS) {
      const xml = readGolden(s.slug);
      expect(xml).toContain('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>');
      expect(xml).toContain('<cbc:CustomizationID>TR1.2</cbc:CustomizationID>');
      expect(xml).toContain('<cbc:CopyIndicator>false</cbc:CopyIndicator>');
    }
  });

  it('cbc:IssueTime HER belgede var — faturadan SAPMA (509 VUK GT IV.4.3-c)', () => {
    for (const s of SELF_EMPLOYED_VOUCHER_SCENARIOS) {
      expect(readGolden(s.slug)).toMatch(/<cbc:IssueTime>\d{2}:\d{2}:\d{2}<\/cbc:IssueTime>/);
    }
  });

  it('gönderim şekli EXT_SEND_METHOD referansıyla taşınır (prod deseni)', () => {
    const xml = readGolden('a-stopajsiz-tek-kdv');
    expect(xml).toContain('<cbc:DocumentTypeCode>EXT_SEND_METHOD</cbc:DocumentTypeCode>');
  });
});

describe('e-SMM vergi düzlemi — üç kod, TEK yer', () => {
  it('WithholdingTaxTotal HİÇBİR golden`da YOK — yapısal olarak kurulamaz', () => {
    for (const s of SELF_EMPLOYED_VOUCHER_SCENARIOS) {
      expect(readGolden(s.slug)).not.toContain('WithholdingTaxTotal');
    }
  });

  it('stopajsız dal yalnız 0015 taşır (prod hâli)', () => {
    const xml = readGolden('a-stopajsiz-tek-kdv');
    expect(xml).toContain('<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>');
    expect(xml).not.toContain('<cbc:TaxTypeCode>0003</cbc:TaxTypeCode>');
    expect(xml).not.toContain('<cbc:TaxTypeCode>9015</cbc:TaxTypeCode>');
  });

  it('9015 matrahı HESAPLANAN KDV — satır tutarı DEĞİL', () => {
    const xml = readGolden('c-stopajli-kdv-tevkifatli');
    // Belge düzeyi 9015 alt toplamı: matrah 2000 (= 10.000 × %20 KDV), tutar 1000.
    const block = /<cac:TaxSubtotal>(?:(?!<\/cac:TaxSubtotal>)[\s\S])*?9015[\s\S]*?<\/cac:TaxSubtotal>/.exec(xml)?.[0] ?? '';
    expect(block).toContain('<cbc:TaxableAmount currencyID="TRY">2000.00</cbc:TaxableAmount>');
    expect(block).toContain('<cbc:TaxAmount currencyID="TRY">1000.00</cbc:TaxAmount>');
    // Satır tutarı matrah alınsaydı 10.000 / 5.000 çıkardı — 5 kat.
    expect(block).not.toContain('<cbc:TaxableAmount currencyID="TRY">10000.00</cbc:TaxableAmount>');
  });

  it('KDV=0 alt toplamında TaxExemptionReason METNİ dolu (TaxExemptionReasonCheck)', () => {
    const xml = readGolden('e-istisna-kdv-sifir');
    expect(xml).toContain('<cbc:TaxExemptionReasonCode>351</cbc:TaxExemptionReasonCode>');
    expect(xml).toMatch(/<cbc:TaxExemptionReason>[^<]+<\/cbc:TaxExemptionReason>/);
  });

  it('dövizli belgede PricingExchangeRate 6 ondalıkla yazılır', () => {
    const xml = readGolden('d-dovizli-usd');
    expect(xml).toContain('<cac:PricingExchangeRate>');
    expect(xml).toContain('<cbc:SourceCurrencyCode>USD</cbc:SourceCurrencyCode>');
    expect(xml).toContain('<cbc:TargetCurrencyCode>TRY</cbc:TargetCurrencyCode>');
    expect(xml).toContain('<cbc:CalculationRate>34.123456</cbc:CalculationRate>');
  });
});

// ─── 3. CANLI ŞEMATRON ────────────────────────────────────────────────────

const validator = await probeValidator();

describe('e-SMM canlı GİB doğrulaması (type=earchive · profile=unsigned-esmm)', () => {
  const liveIt = it.skipIf(!validator.up);

  SELF_EMPLOYED_VOUCHER_SCENARIOS.forEach(scenario => {
    liveIt(
      `${scenario.slug} — Schematron iş kuralları TEMİZ`,
      async () => {
        const result = await validateLive(
          readGolden(scenario.slug),
          VALIDATE_TYPE,
          undefined,
          30_000,
          SUPPRESSION_PROFILE,
        );

        const schErrs = (result.schematronValidationErrors ?? []).map(
          e => `${e.ruleId}: ${e.message.trim()}`,
        );
        expect(schErrs, `Schematron hataları (${scenario.slug})`).toEqual([]);
        expect(result.validSchematron).toBe(true);

        // XSD: yalnız imza kaynaklı bilinen iki hata (faturayla BİREBİR aynı).
        const unexpected = (result.schemaValidationErrors ?? []).filter(
          e => !SIGNATURE_XSD_ERRORS.some(re => re.test(e)),
        );
        expect(unexpected, `Beklenmeyen XSD hataları (${scenario.slug})`).toEqual([]);
      },
      30_000,
    );
  });

  liveIt(
    'BASTIRMA GERÇEK: profilsiz koşumda TAM İKİ kural reddeder — ne eksik ne fazla',
    async () => {
      /* Sahte yeşil kapısı. `unsigned-esmm` yeşili, yalnız bastırdığı kural
       * kümesi kadar anlamlıdır. Profil kaldırıldığında belge DÜŞMELİ ve
       * düşme sebebi TAM OLARAK `ProfileIDCheck` + `InvoiceTypeCodeCheck`
       * olmalıdır — üçüncü bir kural çıkarsa profil onu da gizliyor demektir. */
      const bare = await validateLive(readGolden('c-stopajli-kdv-tevkifatli'), VALIDATE_TYPE);
      const ruleIds = (bare.schematronValidationErrors ?? []).map(e => e.ruleId).sort();
      expect(bare.validSchematron).toBe(false);
      expect(ruleIds).toEqual(['InvoiceTypeCodeCheck', 'ProfileIDCheck']);
    },
    30_000,
  );

  liveIt(
    'profilli koşumda kalan TEK XSD hatası boş ext:ExtensionContent`tir',
    async () => {
      /* `unsigned-esmm` `cac:Signature` XSD şartını da gevşetir; geriye yalnız
       * imzalayıcının dolduracağı boş `ext:ExtensionContent` kalır. Bu sayı
       * çivili ki profil bir gün fazlasını gevşetirse fark edilsin. */
      const result = await validateLive(
        readGolden('b-stopajli'),
        VALIDATE_TYPE,
        undefined,
        30_000,
        SUPPRESSION_PROFILE,
      );
      const xsd = result.schemaValidationErrors ?? [];
      expect(xsd).toHaveLength(1);
      expect(xsd[0]).toMatch(/ExtensionContent/);
    },
    30_000,
  );

  liveIt(
    'bastırma KANITI servis yanıtında görünür (suppressionInfo)',
    async () => {
      const result = await validateLive(
        readGolden('c-stopajli-kdv-tevkifatli'),
        VALIDATE_TYPE,
        undefined,
        30_000,
        SUPPRESSION_PROFILE,
      );
      expect(result.suppressionInfo?.profile).toBe(SUPPRESSION_PROFILE);
      expect(result.suppressionInfo?.suppressedCount).toBe(2);
      expect(
        (result.suppressionInfo?.suppressedErrors ?? []).map(e => e.ruleId).sort(),
      ).toEqual(['InvoiceTypeCodeCheck', 'ProfileIDCheck']);
    },
    30_000,
  );
});
