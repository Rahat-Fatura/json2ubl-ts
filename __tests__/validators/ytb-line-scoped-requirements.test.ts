import { describe, it, expect } from 'vitest';
import { validateProfileRequirements } from '../../src/validators/profile-requirement-validator';
import { deriveLineFieldVisibility } from '../../src/calculator/line-field-visibility';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

/**
 * MADDE 5 — YTB harcama tipi 01 zorunlulukları SATIR BAZINDA olmalı.
 *
 * Kullanıcı bildirimi: «iki kalem ekleyip biri makine biri yazılım yaptığımızda,
 * yazılımda ek bilgi istememesi gerekirken bir kalemde makine var diye TÜM
 * kalemlerde makine adı istiyor.»
 *
 * Bu dosya kütüphane tarafının ZATEN satır bazlı olduğunu KİLİTLER (regresyon
 * kalkanı): `validateProfileRequirements` de `deriveLineFieldVisibility` de
 * `line.itemClassificationCode === '01'` koşulunu kalem kalem uygular. Kusur
 * portal tarafındadır — kütüphane kuralı belge geneline yaymaz.
 */

function makine(over: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return {
    name: 'Teşvikli makine',
    quantity: 1,
    price: 1000,
    unitCode: 'Adet',
    kdvPercent: 20,
    itemClassificationCode: '01',
    model: 'MTX-01',
    productTraceId: 'MAKINA-001',
    serialId: 'SN-001',
    ...over,
  } as SimpleLineInput;
}

function yazilim(over: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return {
    name: 'Lisanslı yazılım',
    quantity: 1,
    price: 500,
    unitCode: 'Adet',
    kdvPercent: 20,
    itemClassificationCode: '02', // 02 = Yazılım → makine alanları BEKLENMEZ
    ...over,
  } as SimpleLineInput;
}

function makeInput(lines: SimpleLineInput[]): SimpleInvoiceInput {
  return {
    profile: 'YATIRIMTESVIK',
    type: 'SATIS',
    ytbNo: '123456',
    lines,
  } as SimpleInvoiceInput;
}

/** Makine üçlüsüne (model/productTraceId/serialId) ait hataları süzer. */
function makineHatalari(input: SimpleInvoiceInput) {
  return validateProfileRequirements(input).filter(e =>
    /^lines\[\d+\]\.(model|productTraceId|serialId)$/.test(e.path ?? ''),
  );
}

describe('MADDE 5 — YTB zorunlulukları kalem kalem uygulanır', () => {
  it('kullanıcının senaryosu: 1 makine (dolu) + 1 yazılım (boş) → HİÇ hata yok', () => {
    expect(makineHatalari(makeInput([makine(), yazilim()]))).toHaveLength(0);
  });

  it('makine kalemi eksikse hata YALNIZ o satıra düşer', () => {
    const hatalar = makineHatalari(makeInput([
      yazilim(),
      makine({ model: undefined, productTraceId: undefined, serialId: undefined }),
    ]));
    expect(hatalar.map(e => e.path).sort()).toEqual([
      'lines[1].model', 'lines[1].productTraceId', 'lines[1].serialId',
    ]);
  });

  it('yazılım kalemine makine alanı yazılsa bile şikâyet edilmez (serbest)', () => {
    expect(makineHatalari(makeInput([
      makine(),
      yazilim({ model: 'X', productTraceId: 'Y', serialId: 'Z' }),
    ]))).toHaveLength(0);
  });

  it('görünürlük bayrakları da satır bazlıdır', () => {
    const doc = { type: 'SATIS', profile: 'YATIRIMTESVIK' };
    expect(deriveLineFieldVisibility(makine(), doc, 0).showProductTraceId).toBe(true);
    expect(deriveLineFieldVisibility(yazilim(), doc, 1).showProductTraceId).toBe(false);
    expect(deriveLineFieldVisibility(yazilim(), doc, 1).showSerialId).toBe(false);
  });

  it('üç 02 kalemli belgede makine alanları HİÇ aranmaz', () => {
    expect(makineHatalari(makeInput([yazilim(), yazilim(), yazilim()]))).toHaveLength(0);
  });
});
