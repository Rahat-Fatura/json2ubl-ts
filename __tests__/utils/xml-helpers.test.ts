import { describe, it, expect } from 'vitest';
import {
  cbcRequiredTag,
  cbcOptionalTag,
  cbcRequiredAmountTag,
  cbcOptionalAmountTag,
  cbcRequiredQuantityTag,
  cbcOptionalQuantityTag,
  cacTag,
} from '../../src/utils/xml-helpers';
import { MissingRequiredFieldError } from '../../src/utils/errors';

describe('AR-1: cbcRequired/Optional split (B-97)', () => {
  describe('cbcRequiredTag', () => {
    it('dolu değer için XML üretir', () => {
      expect(cbcRequiredTag('ID', '123', 'Invoice')).toBe('<cbc:ID>123</cbc:ID>');
    });

    it('boş string için MissingRequiredFieldError fırlatır', () => {
      expect(() => cbcRequiredTag('ID', '', 'Invoice')).toThrow(MissingRequiredFieldError);
    });

    it('undefined için MissingRequiredFieldError fırlatır', () => {
      expect(() => cbcRequiredTag('ID', undefined, 'Invoice')).toThrow(MissingRequiredFieldError);
    });

    it('null için MissingRequiredFieldError fırlatır', () => {
      expect(() => cbcRequiredTag('ID', null, 'Invoice')).toThrow(MissingRequiredFieldError);
    });

    it('sadece whitespace için hata fırlatır', () => {
      expect(() => cbcRequiredTag('ID', '   ', 'Invoice')).toThrow(MissingRequiredFieldError);
    });

    it('hata mesajı field adı ve parent contextini içerir', () => {
      try {
        cbcRequiredTag('IssueDate', '', 'DocumentReference');
      } catch (e) {
        expect(e).toBeInstanceOf(MissingRequiredFieldError);
        expect((e as Error).message).toContain('cbc:IssueDate');
        expect((e as Error).message).toContain('DocumentReference');
      }
    });
  });

  describe('cbcOptionalTag', () => {
    it('dolu değer için XML üretir', () => {
      expect(cbcOptionalTag('Note', 'Test')).toBe('<cbc:Note>Test</cbc:Note>');
    });

    it('boş string için boş string döner (silent skip)', () => {
      expect(cbcOptionalTag('Note', '')).toBe('');
    });

    it('undefined/null için boş string döner', () => {
      expect(cbcOptionalTag('Note', undefined)).toBe('');
      expect(cbcOptionalTag('Note', null)).toBe('');
    });
  });

  describe('cbcRequiredAmountTag / cbcOptionalAmountTag', () => {
    it('required: geçerli miktar için XML üretir (currencyID attr)', () => {
      expect(cbcRequiredAmountTag('TaxAmount', 100, 'TRY', 'TaxTotal'))
        .toMatch(/<cbc:TaxAmount currencyID="TRY">100\.\d+<\/cbc:TaxAmount>/);
    });

    it('required: undefined/NaN için hata fırlatır', () => {
      expect(() => cbcRequiredAmountTag('TaxAmount', undefined, 'TRY')).toThrow(MissingRequiredFieldError);
      expect(() => cbcRequiredAmountTag('TaxAmount', NaN, 'TRY')).toThrow(MissingRequiredFieldError);
    });

    it('optional: undefined için boş döner', () => {
      expect(cbcOptionalAmountTag('TaxAmount', undefined, 'TRY')).toBe('');
    });
  });

  describe('cbcRequiredQuantityTag / cbcOptionalQuantityTag', () => {
    it('required: geçerli miktar için XML üretir (unitCode attr)', () => {
      expect(cbcRequiredQuantityTag('InvoicedQuantity', 10, 'C62', 'InvoiceLine'))
        .toMatch(/<cbc:InvoicedQuantity unitCode="C62">10\.\d+<\/cbc:InvoicedQuantity>/);
    });

    it('required: undefined/NaN için hata fırlatır', () => {
      expect(() => cbcRequiredQuantityTag('InvoicedQuantity', undefined, 'C62')).toThrow(MissingRequiredFieldError);
      expect(() => cbcRequiredQuantityTag('InvoicedQuantity', NaN, 'C62')).toThrow(MissingRequiredFieldError);
    });

    it('optional: undefined için boş döner', () => {
      expect(cbcOptionalQuantityTag('InvoicedQuantity', undefined, 'C62')).toBe('');
    });
  });

  describe('cacTag (skip-on-empty semantik, AR-1 dışı)', () => {
    it('dolu içerik için tam container üretir', () => {
      expect(cacTag('TaxCategory', '<cbc:ID>S</cbc:ID>')).toBe('<cac:TaxCategory><cbc:ID>S</cbc:ID></cac:TaxCategory>');
    });

    it('boş içerik için skip — boş string döner', () => {
      expect(cacTag('TaxCategory', '')).toBe('');
    });

    it('whitespace içerik için skip', () => {
      expect(cacTag('TaxCategory', '   ')).toBe('');
    });
  });
});
