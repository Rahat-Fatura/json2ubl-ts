import { describe, it, expect } from 'vitest';
import { validateProfileRequirements } from '../../src/validators/profile-requirement-validator';
import { INVOICE_ID_REGEX } from '../../src/config/constants';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

/**
 * MADDE 4 — IADE ailesinde referans fatura numarası deseni.
 *
 * Şematron `IADEInvioceCheck` yalnız UZUNLUĞA bakar (`string-length(...) = 16`), bu
 * yüzden "abc-2026-00000002" gibi desensiz bir değer oturumdan geçip GİB kapısında
 * reddoluyordu. Desen kontrolü artık bizde: 3 hane alfanümerik seri + 4 hane yıl +
 * 9 hane sıra (ör. `ABC2026000000002`).
 *
 * Kaynak TEK: `INVOICE_ID_REGEX` — ikinci bir desen YAZILMADI.
 */

function makeInput(tip: string, referansNo?: string): SimpleInvoiceInput {
  return {
    profile: 'TEMELFATURA',
    type: tip,
    billingReference: referansNo === undefined
      ? undefined
      : { id: referansNo, issueDate: '2026-03-01', documentTypeCode: 'IADE' },
    lines: [{ name: 'İade edilen mal', quantity: 1, price: 100, unitCode: 'Adet', kdvPercent: 20 }],
  } as SimpleInvoiceInput;
}

function referansHatalari(input: SimpleInvoiceInput) {
  return validateProfileRequirements(input).filter(e => e.path === 'billingReference.id');
}

describe('MADDE 4 — iade referans numarası deseni', () => {
  it('desen kaynağı INVOICE_ID_REGEX ile aynıdır', () => {
    expect(INVOICE_ID_REGEX.test('ABC2026000000002')).toBe(true);
  });

  it('geçerli numara → hata yok', () => {
    expect(referansHatalari(makeInput('IADE', 'ABC2026000000002'))).toHaveLength(0);
  });

  it.each([
    ['abc-2026-00000002', 'küçük harf + tire'],
    ['ABC202600000000', '15 karakter (kısa)'],
    ['ABC20260000000021', '17 karakter (uzun)'],
    ['AB2026000000002X', 'seri 2 hane'],
    ['ABC1999000000002', 'yıl 20XX değil'],
  ])('%s reddedilir (%s)', referansNo => {
    const hatalar = referansHatalari(makeInput('IADE', referansNo));
    expect(hatalar).toHaveLength(1);
    expect(hatalar[0].code).toBe('INVALID_FORMAT');
  });

  it('mesaj Türkçe ve ÖRNEK içerir', () => {
    const [hata] = referansHatalari(makeInput('IADE', 'abc-2026-00000002'));
    expect(hata.message).toContain('ABC2026000000002');
    expect(hata.message).toMatch(/16 karakter/);
  });

  it.each(['IADE', 'TEVKIFATIADE', 'YTBIADE', 'YTBTEVKIFATIADE'])(
    '%s tipi kapsam içindedir',
    tip => {
      expect(referansHatalari(makeInput(tip, 'BOZUKNUMARA123456'))).toHaveLength(1);
    },
  );

  it('IADE olmayan tipte desen aranmaz (şematron da aramıyor)', () => {
    expect(referansHatalari(makeInput('SATIS', 'serbest-referans'))).toHaveLength(0);
  });

  /* Taslak aşamasında referans henüz seçilmemiş olabilir; "zorunludur" uyarısı
   * `invoice-rules.validateInvoiceState` tarafında verilir, burada değil. */
  it('BOŞ referans burada hata üretmez', () => {
    expect(referansHatalari(makeInput('IADE', ''))).toHaveLength(0);
    expect(referansHatalari(makeInput('IADE', undefined))).toHaveLength(0);
  });
});
