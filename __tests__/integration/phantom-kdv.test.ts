/**
 * Sprint 8d.6 — M12 Phantom KDV end-to-end integration testleri.
 *
 * SimpleInvoiceInput → SimpleInvoiceBuilder → UBL-TR XML pipeline:
 * YATIRIMTESVIK+ISTISNA ve EARSIVFATURA+YTBISTISNA kombinasyonlarında
 * XML çıktısı GİB §2.1.4 stili phantom KDV kurallarına uyuyor mu?
 *
 * İki varyant:
 *   - Jest auto snapshot (regression)
 *   - Manuel XML fragmanı fixture'ları (__tests__/fixtures/phantom-kdv/*.xml)
 *     ile GİB kılavuzu §2.1.4 birebir eşleşmesi
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { UblBuildError } from '../../src/errors/ubl-build-error';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const sender = {
  taxNumber: '1234567890',
  name: 'Sınır Tanımaz Makine Tic. A.Ş.',
  taxOffice: 'Üsküdar',
  address: 'Barbaros Bulvarı No:123 Kat:5',
  district: 'Üsküdar',
  city: 'İstanbul',
  zipCode: '34664',
};

const customer = {
  taxNumber: '9876543210',
  name: 'Teşvikli Üretici Ltd. Şti.',
  taxOffice: 'Kadıköy',
  address: 'Organize Sanayi Bölgesi No:12',
  district: 'Tuzla',
  city: 'İstanbul',
  zipCode: '34956',
};

function normalizeWhitespace(xml: string): string {
  return xml.replace(/\s+/g, ' ').trim();
}

function loadFixture(name: string): string {
  return readFileSync(
    resolve(__dirname, '..', 'fixtures', 'phantom-kdv', name),
    'utf-8',
  );
}

describe('M12 Phantom KDV — End-to-End Integration', () => {
  describe('YATIRIMTESVIK+ISTISNA + Makine/Teçhizat (01, 308)', () => {
    const input: SimpleInvoiceInput = {
      id: 'EXA2026000000901',
      uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      datetime: '2026-04-24T10:00:00',
      profile: 'YATIRIMTESVIK',
      type: 'ISTISNA',
      currencyCode: 'TRY',
      ytbNo: '123456',
      ytbIssueDate: '2025-01-01',
      kdvExemptionCode: '308',
      sender,
      customer,
      lines: [
        {
          name: 'Sanayi Tipi Kompresör',
          quantity: 15,
          price: 100,
          unitCode: 'Adet',
          kdvPercent: 20,
          kdvExemptionCode: '308',
          itemClassificationCode: '01',
          productTraceId: 'KOMP-2026-0001',
          serialId: 'SN-2026-MAKINA-000001',
          brand: 'DemoMakine',
          model: 'DMK-2000',
        },
      ],
    };

    it('XML üretimi hata vermez', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      expect(xml).toBeTruthy();
      expect(xml).toContain('<Invoice');
    });

    it('XML §2.1.4 stili phantom fragmanını içerir (TaxableAmount=1500, TaxAmount=300, CalcSeqNum=-1, Percent=20, kod=308)', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      const fixture = loadFixture('taxsubtotal-phantom-308.xml');
      const normalizedXml = normalizeWhitespace(xml);
      const normalizedFixture = normalizeWhitespace(fixture);
      expect(normalizedXml).toContain(normalizedFixture);
    });

    it('LegalMonetaryTotal phantom hariç: PayableAmount=1500, TaxInclusiveAmount=1500', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      expect(xml).toMatch(/<cbc:LineExtensionAmount currencyID="TRY">1500\.?0*<\/cbc:LineExtensionAmount>/);
      expect(xml).toMatch(/<cbc:TaxInclusiveAmount currencyID="TRY">1500\.?0*<\/cbc:TaxInclusiveAmount>/);
      expect(xml).toMatch(/<cbc:PayableAmount currencyID="TRY">1500\.?0*<\/cbc:PayableAmount>/);
    });

    it('Belge-level Invoice/TaxTotal parent TaxAmount=0', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      // Invoice altında doğrudan ilk cac:TaxTotal'ın TaxAmount=0
      // cbc:TaxAmount 0 veya 0.00 olabilir
      const documentTaxAmountPattern = /<cac:TaxTotal>\s*<cbc:TaxAmount currencyID="TRY">0\.?0*<\/cbc:TaxAmount>/;
      expect(xml).toMatch(documentTaxAmountPattern);
    });

    it('Snapshot regression', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      expect(xml).toMatchSnapshot();
    });
  });

  describe('EARSIVFATURA+YTBISTISNA + İnşaat (02, 339)', () => {
    const input: SimpleInvoiceInput = {
      id: 'EXA2026000000902',
      uuid: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      datetime: '2026-04-24T10:00:00',
      profile: 'EARSIVFATURA',
      type: 'YTBISTISNA',
      currencyCode: 'TRY',
      ytbNo: '654321',
      ytbIssueDate: '2025-02-01',
      kdvExemptionCode: '339',
      sender,
      customer,
      eArchiveInfo: { sendType: 'ELEKTRONIK' },
      lines: [
        {
          name: 'İnşaat İşçiliği',
          quantity: 1,
          price: 1500,
          unitCode: 'Adet',
          kdvPercent: 18,
          kdvExemptionCode: '339',
          itemClassificationCode: '02',
        },
      ],
    };

    it('XML üretimi hata vermez', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      expect(xml).toBeTruthy();
    });

    it('XML §2.1.4 stili phantom fragmanını içerir (TaxAmount=270, Percent=18, kod=339)', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      const fixture = loadFixture('taxsubtotal-phantom-339.xml');
      const normalizedXml = normalizeWhitespace(xml);
      const normalizedFixture = normalizeWhitespace(fixture);
      expect(normalizedXml).toContain(normalizedFixture);
    });

    it('ProfileID=EARSIVFATURA, InvoiceTypeCode=YTBISTISNA', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      expect(xml).toContain('<cbc:ProfileID>EARSIVFATURA</cbc:ProfileID>');
      expect(xml).toContain('<cbc:InvoiceTypeCode>YTBISTISNA</cbc:InvoiceTypeCode>');
    });

    it('LegalMonetaryTotal phantom hariç (hepsi 1500)', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      expect(xml).toMatch(/<cbc:PayableAmount currencyID="TRY">1500\.?0*<\/cbc:PayableAmount>/);
      expect(xml).toMatch(/<cbc:TaxInclusiveAmount currencyID="TRY">1500\.?0*<\/cbc:TaxInclusiveAmount>/);
    });

    it('Snapshot regression', () => {
      const builder = new SimpleInvoiceBuilder();
      const { xml } = builder.build(input);
      expect(xml).toMatchSnapshot();
    });
  });

  describe('Negative: validator hataları', () => {
    it('YATIRIMTESVIK+ISTISNA + kdvPercent=0 → UblBuildError fırlatır', () => {
      const builder = new SimpleInvoiceBuilder();
      let caught: UblBuildError | null = null;
      try {
        builder.build({
          id: 'EXA2026000000950',
          uuid: 'cccccccc-0000-0000-0000-000000000000',
          datetime: '2026-04-24T10:00:00',
          profile: 'YATIRIMTESVIK',
          type: 'ISTISNA',
          currencyCode: 'TRY',
          ytbNo: '123456',
          ytbIssueDate: '2025-01-01',
          kdvExemptionCode: '308',
          sender,
          customer,
          lines: [
            {
              name: 'X', quantity: 1, price: 1000, unitCode: 'Adet',
              kdvPercent: 0, kdvExemptionCode: '308', itemClassificationCode: '01',
              productTraceId: 'PT', serialId: 'SN', brand: 'B', model: 'M',
            },
          ],
        });
      } catch (err) {
        caught = err as UblBuildError;
      }
      expect(caught).not.toBeNull();
      expect(caught!.errors.some(e => e.code === 'YTB_ISTISNA_REQUIRES_NONZERO_KDV_PERCENT')).toBe(true);
    });

    it('YATIRIMTESVIK+ISTISNA + ItemClassificationCode=03 → UblBuildError fırlatır', () => {
      const builder = new SimpleInvoiceBuilder();
      let caught: UblBuildError | null = null;
      try {
        builder.build({
          id: 'EXA2026000000951',
          uuid: 'dddddddd-0000-0000-0000-000000000000',
          datetime: '2026-04-24T10:00:00',
          profile: 'YATIRIMTESVIK',
          type: 'ISTISNA',
          currencyCode: 'TRY',
          ytbNo: '123456',
          ytbIssueDate: '2025-01-01',
          kdvExemptionCode: '308',
          sender,
          customer,
          lines: [
            {
              name: 'Arsa', quantity: 1, price: 1500, unitCode: 'Adet',
              kdvPercent: 20, kdvExemptionCode: '308', itemClassificationCode: '03',
            },
          ],
        });
      } catch (err) {
        caught = err as UblBuildError;
      }
      expect(caught).not.toBeNull();
      expect(caught!.errors.some(e => e.code === 'YTB_ISTISNA_FORBIDDEN_ITEM_CLASSIFICATION')).toBe(true);
    });
  });
});
