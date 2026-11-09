/**
 * Vazgeçilen KDV (fantom) kaleminde KDV DIŞI vergiler (KN-092, GİB düzeltme planı Dalga 7).
 *
 * YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA kaleminde GİB yalnız
 * vazgeçilen KDV'yi (CalculationSequenceNumeric=-1) fatura tutarı hesabının
 * dışında bırakır (Yatırım Teşvik kılavuzu V1.1 §2.1.4). 5.2.0'a kadar
 * `calculateDocument` fantom kalemin BÜTÜN vergilerini toplamdan düşürüyor,
 * satır `TaxTotal/TaxAmount`ı da koşulsuz 0 yazılıyordu: %10 ÖTV'li ya da %10
 * stopajlı 1.000,00 TL'lik kukla kalemde ödenecek tutar 1.000,00 çıkıyordu.
 *
 * Doğru kural (hesap motoru ve XML eşleyicisi aynı yüklemi okur):
 *   • toplam dışı: KDV (0015) ve matrahı hesaplanan KDV olan vergiler (9015);
 *   • toplama giren: öbür bütün vergiler, fantomsuz yoldaki işaretleriyle
 *     (ÖTV ekler, stopaj düşer).
 *
 * Beklenen değerler (fiyat 1.000, miktar 1, KDV %20):
 *   ÖTV 0071 %10  → ÖTV 100, KDV matrahı 1.100, KDV 220 (toplam dışı)
 *                   TaxInclusive = Payable = 1.100,00; TaxAmount 100,00
 *   stopaj 0003 %10 → stopaj 100, KDV 200 (toplam dışı)
 *                   TaxInclusive = Payable = 900,00; TaxAmount 100,00
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { calculateDocument } from '../../src/calculator/document-calculator';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { SimpleInvoiceInput, SimpleLineTaxInput } from '../../src/calculator/simple-types';
import { probeValidator, validateLive } from '../support/validator';

const MATRIX = resolve(__dirname, '../../examples-matrix/valid');

function fixture(rel: string): SimpleInvoiceInput {
  return JSON.parse(readFileSync(resolve(MATRIX, rel, 'input.json'), 'utf8')) as SimpleInvoiceInput;
}

const FIXTURES = {
  efatura: 'yatirimtesvik/yatirimtesvik-istisna-phantom-308-makine',
  earsiv: 'earsivfatura/earsivfatura-ytbistisna-phantom-308-makine',
} as const;

function withTaxes(rel: string, taxes: SimpleLineTaxInput[]): SimpleInvoiceInput {
  const input = fixture(rel);
  input.lines[0].taxes = taxes;
  return input;
}

/** XML parçasında deseni arar; yoksa fırlatır. */
function pick(xml: string, re: RegExp): string {
  const m = re.exec(xml);
  if (!m) throw new Error(`XML'de bulunamadı: ${re}`);
  return m[1];
}

const TAX_TOTAL_AMOUNT = /<cac:TaxTotal>\s*<cbc:TaxAmount currencyID="TRY">([\d.]+)</;

/** XML'den belge ve (tek) satır toplamlarını okur. */
function totals(xml: string) {
  const lineStart = xml.indexOf('<cac:InvoiceLine>');
  const head = xml.slice(0, lineStart);
  const line = xml.slice(lineStart);
  return {
    docTaxAmount: pick(head, TAX_TOTAL_AMOUNT),
    taxInclusive: pick(head, /<cbc:TaxInclusiveAmount currencyID="TRY">([\d.]+)</),
    payable: pick(head, /<cbc:PayableAmount currencyID="TRY">([\d.]+)</),
    lineTaxAmount: pick(line, TAX_TOTAL_AMOUNT),
  };
}

const CASES = [
  { label: 'ÖTV 0071 %10', taxes: [{ code: '0071', percent: 10 }], payable: 1100, taxTotal: 100, xml: { total: '1100.00', tax: '100.00' } },
  { label: 'stopaj 0003 %10', taxes: [{ code: '0003', percent: 10 }], payable: 900, taxTotal: 100, xml: { total: '900.00', tax: '100.00' } },
] as const;

describe('KN-092 — fantom kalemde yalnız vazgeçilen KDV toplam dışı', () => {
  for (const [kind, rel] of Object.entries(FIXTURES)) {
    describe(`${kind} (${rel.split('/')[1]})`, () => {
      for (const c of CASES) {
        it(`${c.label}: calculateDocument toplamları KDV dışı vergiyi taşır`, () => {
          const calc = calculateDocument(withTaxes(rel, [...c.taxes]));
          expect(calc.calculatedLines[0].phantomKdv).toBe(true);
          expect(calc.monetary.lineExtensionAmount).toBeCloseTo(1000, 9);
          expect(calc.monetary.taxInclusiveAmount).toBeCloseTo(c.payable, 9);
          expect(calc.monetary.payableAmount).toBeCloseTo(c.payable, 9);
          expect(calc.taxes.taxTotal).toBeCloseTo(c.taxTotal, 9);
          // KDV alt toplamı -1 işaretini ve vazgeçilen tutarı korur.
          const kdv = calc.taxes.taxSubtotals.find(t => t.code === '0015');
          expect(kdv?.calculationSequenceNumeric).toBe(-1);
        });

        it(`${c.label}: katı kurulum ve oturum XML'i aynı toplamları yazar`, () => {
          const builderXml = new SimpleInvoiceBuilder({ validationLevel: 'strict' })
            .build(withTaxes(rel, [...c.taxes])).xml;
          const sessionXml = new InvoiceSession({ initialInput: withTaxes(rel, [...c.taxes]), autoCalculate: true })
            .buildXml({ validationLevel: 'strict' });
          for (const xml of [builderXml, sessionXml]) {
            const t = totals(xml);
            expect(t.taxInclusive).toBe(c.xml.total);
            expect(t.payable).toBe(c.xml.total);
            expect(t.docTaxAmount).toBe(c.xml.tax);
            expect(t.lineTaxAmount).toBe(c.xml.tax);
          }
          expect(sessionXml).toBe(builderXml);
        });
      }

      it('kontrol: yalnız KDV\'li fantom kalem değişmez (1000,00 / vergi 0,00)', () => {
        const calc = calculateDocument(fixture(rel));
        expect(calc.monetary.taxInclusiveAmount).toBe(1000);
        expect(calc.monetary.payableAmount).toBe(1000);
        expect(calc.taxes.taxTotal).toBe(0);
      });

      it('9015 (matrahı hesaplanan KDV) vazgeçilen KDV ile birlikte toplam dışı kalır', () => {
        const calc = calculateDocument(withTaxes(rel, [{ code: '9015', percent: 50 }]));
        expect(calc.calculatedLines[0].taxes.taxSubtotals.some(t => t.code === '9015')).toBe(true);
        expect(calc.monetary.taxInclusiveAmount).toBe(1000);
        expect(calc.monetary.payableAmount).toBe(1000);
        expect(calc.taxes.taxTotal).toBe(0);
      });
    });
  }
});

const validator = await probeValidator();
const liveIt = it.skipIf(!validator.up);

describe('KN-092 — düzeltilmiş XML canlı GİB şematronundan geçer', () => {
  for (const [kind, rel] of Object.entries(FIXTURES)) {
    for (const c of CASES) {
      liveIt(`${kind} ${c.label}`, async () => {
        const xml = new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(withTaxes(rel, [...c.taxes])).xml;
        const result = await validateLive(xml, kind === 'earsiv' ? 'earchive' : 'efatura');
        expect(result.schematronValidationErrors ?? []).toEqual([]);
        expect(result.validSchematron).toBe(true);
      });
    }
  }
});
