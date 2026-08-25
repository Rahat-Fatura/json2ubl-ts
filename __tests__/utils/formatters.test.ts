import { describe, it, expect } from 'vitest';
import { formatDecimal, formatDecimalRange } from '../../src/utils/formatters';

/**
 * 4.1.0 — `formatDecimalRange` birim testleri.
 *
 * Bu fonksiyon üç uyumluluk düzeltmesinin ortak temelidir:
 *  - tevkifat `cbc:Percent`            → (0, 6)
 *  - `cbc:MultiplierFactorNumeric`     → (1, 4)
 *  - miktar / `cbc:PriceAmount`        → (2, 6)
 */

describe('formatDecimal — PARASAL alanlar (değişmedi)', () => {
  it('sabit 2 basamak yazar', () => {
    expect(formatDecimal(1000)).toBe('1000.00');
    expect(formatDecimal(0.5)).toBe('0.50');
  });

  it('decimals parametresine uyar', () => {
    expect(formatDecimal(18, 2)).toBe('18.00');
  });
});

describe('formatDecimalRange — min basamak KORUNUR (geriye uyumluluk)', () => {
  it('tam sayı miktar min=2 ile "1.00" kalır', () => {
    expect(formatDecimalRange(1, 2, 6)).toBe('1.00');
    expect(formatDecimalRange(10, 2, 6)).toBe('10.00');
  });

  it('iskonto oranı min=1 ile "0.1" kalır', () => {
    expect(formatDecimalRange(0.1, 1, 4)).toBe('0.1');
  });
});

describe('formatDecimalRange — max basamağa kadar hassasiyet KURTARILIR', () => {
  it('miktar 0,125 → "0.125" (eskiden "0.13")', () => {
    expect(formatDecimalRange(0.125, 2, 6)).toBe('0.125');
  });

  it('miktar 0,004 → "0.004" (eskiden "0.00")', () => {
    expect(formatDecimalRange(0.004, 2, 6)).toBe('0.004');
  });

  it('birim fiyat 0,0035 → "0.0035" (eskiden "0.00")', () => {
    expect(formatDecimalRange(0.0035, 2, 6)).toBe('0.0035');
  });

  it('iskonto %15 / %12,5 / %3 / %0,01', () => {
    expect(formatDecimalRange(0.15, 1, 4)).toBe('0.15');
    expect(formatDecimalRange(0.125, 1, 4)).toBe('0.125');
    expect(formatDecimalRange(0.03, 1, 4)).toBe('0.03');
    expect(formatDecimalRange(0.0001, 1, 4)).toBe('0.0001');
  });
});

describe('formatDecimalRange — min=0 tamamen ondalıksız yazar (tevkifat)', () => {
  it('90 → "90" (şematron kod listesi eşleşmesi için ŞART)', () => {
    expect(formatDecimalRange(90, 0, 6)).toBe('90');
  });

  it('100 → "100"', () => {
    expect(formatDecimalRange(100, 0, 6)).toBe('100');
  });

  it('float artefaktı temizlenir', () => {
    expect(formatDecimalRange(90.0000000001, 0, 6)).toBe('90');
    expect(formatDecimalRange(0.1 + 0.2, 0, 6)).toBe('0.3');
  });

  it('gerçek kesir KIRPILMAZ — veri uydurulmaz', () => {
    expect(formatDecimalRange(9.9, 0, 6)).toBe('9.9');
  });
});

describe('formatDecimalRange — kenar durumlar', () => {
  it('sıfır', () => {
    expect(formatDecimalRange(0, 2, 6)).toBe('0.00');
    expect(formatDecimalRange(0, 0, 6)).toBe('0');
  });

  it('negatif değerde işaret korunur', () => {
    expect(formatDecimalRange(-0.15, 1, 4)).toBe('-0.15');
    expect(formatDecimalRange(-1, 2, 6)).toBe('-1.00');
  });

  it('max basamağın ötesi yuvarlanır (sessiz taşma yok)', () => {
    expect(formatDecimalRange(0.12345678, 2, 6)).toBe('0.123457');
  });

  it('min > max verilirse max yükseltilir (çelişkide veri kaybı olmaz)', () => {
    expect(formatDecimalRange(1.5, 4, 2)).toBe('1.5000');
  });
});
