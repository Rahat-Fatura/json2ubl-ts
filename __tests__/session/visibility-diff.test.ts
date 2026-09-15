import { describe, it, expect } from 'vitest';
import { diffVisibility } from '../../src/session';

/** ORTAK görünürlük farkı — `InvoiceSession`'dan çıkarıldı, burada çivilendi. */
describe('diffVisibility', () => {
  it('gizliden görünüre → activated', () => {
    expect(diffVisibility({ a: false }, { a: true })).toEqual([{ key: 'a', activated: true }]);
  });

  it('görünürden gizliye → deactivated', () => {
    expect(diffVisibility({ a: true }, { a: false })).toEqual([{ key: 'a', activated: false }]);
  });

  it('değişmeyen alan geçiş ÜRETMEZ', () => {
    expect(diffVisibility({ a: true, b: false }, { a: true, b: false })).toEqual([]);
  });

  /* Canlı davranış: önceki haritada OLMAYAN anahtar, yenisinde true ise
     "aktifleşti" sayılır (undefined → falsy). */
  it('önceki haritada olmayan anahtar true ise activated', () => {
    expect(diffVisibility({}, { yeni: true })).toEqual([{ key: 'yeni', activated: true }]);
  });

  /* 🔴 Tarama tabanı `next` — `prev`de olup `next`te olmayan anahtar SAYILMAZ.
     "Türetilmiş olan otoritedir" kuralının kodda görünür hâli. */
  it('yalnız `next`in anahtarları taranır', () => {
    expect(diffVisibility({ kalinti: true }, {})).toEqual([]);
  });

  it('çoklu geçiş `next` anahtar sırasını korur', () => {
    const t = diffVisibility({ a: false, b: true, c: false }, { a: true, b: false, c: false });
    expect(t).toEqual([
      { key: 'a', activated: true },
      { key: 'b', activated: false },
    ]);
  });
});
