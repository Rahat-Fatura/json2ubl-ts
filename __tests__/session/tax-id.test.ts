import { describe, it, expect } from 'vitest';
import { resolveTaxIdType } from '../../src/utils/tax-id';

/**
 * 🔴 4.5.5 GERİLEME ÇİVİSİ. Kural `length === 11 → TCKN` idi; Alman KDV numarası
 * "DE123456789" tam 11 karakter olduğu için gerçek kişi sanılıyor, boş `cac:Person`
 * açılıyor ve GİB XSD'si belgeyi reddediyordu. Kural artık UZUNLUK değil İÇERİK.
 *
 * Bu fonksiyon ortak katmandadır: her belge tipinin `Simple*` mapper'ı AYNISINI
 * kullanır — tip başına kopyalanırsa hata tip başına yeniden doğar.
 */
describe('resolveTaxIdType — uzunluk değil içerik', () => {
  it('11 hane RAKAM → TCKN', () => {
    expect(resolveTaxIdType('12345678901')).toBe('TCKN');
  });

  it('🔴 11 KARAKTER ama harf içeriyor → VKN (yabancı vergi no)', () => {
    expect(resolveTaxIdType('DE123456789')).toBe('VKN');
  });

  it('10 hane VKN → VKN', () => {
    expect(resolveTaxIdType('6210841000')).toBe('VKN');
  });

  it('boşluk kırpılır', () => {
    expect(resolveTaxIdType('  12345678901  ')).toBe('TCKN');
  });

  it('boş/null/undefined → VKN (fail-safe: Person açılmaz)', () => {
    expect(resolveTaxIdType('')).toBe('VKN');
    expect(resolveTaxIdType(null)).toBe('VKN');
    expect(resolveTaxIdType(undefined)).toBe('VKN');
  });
});
