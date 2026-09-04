/**
 * B-30 paraleli (session/UI katmanı) — `cac:WithholdingTaxTotal` × fatura tipi.
 *
 * Schematron `GeneralWithholdingTaxTotalCheck`: WithholdingTaxTotal varken
 * fatura tipi TEVKIFAT, YTBTEVKIFAT, IADE, YTBIADE, SGK, SARJ, SARJANLIK
 * olabilir. Satırda `withholdingTaxCode` verilmesi bu elemanı ÜRETİR.
 *
 * 4.1.2'ye kadar aynı kural yalnız `type-validators.ts` (B-30) içinde ve yalnız
 * `validationLevel='strict'` altında vardı; InvoiceSession/UI akışı
 * SATIS + tevkifat kodunu SIFIR uyarıyla geçiriyor, belgeyi
 * WithholdingTaxTotal ile üretiyordu — GİB kapıda reddediyordu.
 */

import { describe, it, expect } from 'vitest';
import { validateInvoiceState } from '../../src/calculator/invoice-rules';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { calculateDocument } from '../../src/calculator/document-calculator';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

/** Şematron metnindeki izinli tipler — kural bu yedisinde SUSMALI */
const ALLOWED_TYPES = ['TEVKIFAT', 'YTBTEVKIFAT', 'IADE', 'YTBIADE', 'SGK', 'SARJ', 'SARJANLIK'];

/** Şematronun reddettiği örnek tipler — kural bunlarda KONUŞMALI */
const REJECTED_TYPES = ['SATIS', 'ISTISNA', 'OZELMATRAH', 'IHRACKAYITLI', 'KOMISYONCU', 'HKSSATIS'];

function withholdingWarnings(state: Parameters<typeof validateInvoiceState>[0]) {
  return validateInvoiceState(state).filter(w => w.field === 'lines.withholdingTaxCode');
}

describe('validateInvoiceState — tevkifat kodu × fatura tipi (B-30 paraleli)', () => {
  it.each(REJECTED_TYPES)('%s + tevkifatlı satır → error', (type) => {
    const warnings = withholdingWarnings({ type, profile: 'TICARIFATURA', hasWithholdingLines: true });
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe('error');
  });

  it.each(ALLOWED_TYPES)('%s + tevkifatlı satır → uyarı yok', (type) => {
    expect(withholdingWarnings({ type, profile: 'TICARIFATURA', hasWithholdingLines: true })).toHaveLength(0);
  });

  it('tevkifatlı satır yokken tip ne olursa olsun susar', () => {
    expect(withholdingWarnings({ type: 'SATIS', profile: 'TICARIFATURA', hasWithholdingLines: false })).toHaveLength(0);
    expect(withholdingWarnings({ type: 'SATIS', profile: 'TICARIFATURA' })).toHaveLength(0);
  });

  it('mesaj kullanıcıya ne yapacağını söyler (tipi TEVKIFAT yap)', () => {
    const [warning] = withholdingWarnings({ type: 'SATIS', profile: 'TICARIFATURA', hasWithholdingLines: true });
    expect(warning.message).toContain('SATIS');
    expect(warning.message).toContain('TEVKIFAT');
    // İzinli küme mesajda listelenir — kullanıcı alternatifleri görsün
    for (const allowed of ALLOWED_TYPES) {
      expect(warning.message).toContain(allowed);
    }
  });

  it('TEVKIFAT ileri-yön kuralı (tevkifat kodsuz TEVKIFAT) bozulmadı', () => {
    const warnings = validateInvoiceState({ type: 'TEVKIFAT', profile: 'TICARIFATURA', hasWithholdingLines: false });
    const forward = warnings.filter(w => w.field === 'lines');
    expect(forward).toHaveLength(1);
    expect(forward[0].severity).toBe('warning');
  });
});

describe('InvoiceSession köprüsü — SATIS + withholdingTaxCode', () => {
  function session(type: string, lines: SimpleLineInput[]): InvoiceSession {
    const input: Partial<SimpleInvoiceInput> = {
      profile: 'TICARIFATURA',
      type,
      sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
      customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
      lines,
    };
    return new InvoiceSession({ initialInput: input });
  }

  const withholdingLine: SimpleLineInput = {
    name: 'Danışmanlık', quantity: 1, price: 1000, unitCode: 'Adet', kdvPercent: 20, withholdingTaxCode: '624',
  };

  it('SATIS + 624 tevkifat kodu → session.validate() error döner (4.1.2\'de 0 uyarıydı)', () => {
    const warnings = session('SATIS', [withholdingLine]).validate();
    const mismatch = warnings.filter(w => w.field === 'lines.withholdingTaxCode');
    expect(mismatch).toHaveLength(1);
    expect(mismatch[0].severity).toBe('error');
  });

  it('TEVKIFAT + 624 tevkifat kodu → uyarı yok', () => {
    const warnings = session('TEVKIFAT', [withholdingLine]).validate();
    expect(warnings.filter(w => w.field === 'lines.withholdingTaxCode')).toHaveLength(0);
  });

  it('session tip verilmese de SATIS materyalize eder → kural yine konuşur', () => {
    // ÖLÇÜM: InvoiceSession constructor'ı `type`'ı EAGER olarak 'SATIS' yazıyor
    // (invoice-session.ts — `const effectiveType = this._input.type ?? 'SATIS'`).
    // Bu yüzden session akışında `resolveInvoiceType`'ın "tevkifat satırı varsa
    // TEVKIFAT" otomatik tespiti HİÇ tetiklenmez: B-41 gereği açık tip kazanır.
    // Sonuç, tip'e hiç dokunmayan bir session kullanıcısının SATIS +
    // WithholdingTaxTotal belgesi üretmesidir — kuralın yakaladığı tam da bu.
    const s = new InvoiceSession({
      initialInput: {
        profile: 'TICARIFATURA',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
        customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
        lines: [withholdingLine],
      },
    });
    expect(s.toInvoiceInput().invoiceTypeCode).toBe('SATIS');
    expect(s.validate().filter(w => w.field === 'lines.withholdingTaxCode')).toHaveLength(1);
  });

  it('session DIŞI (JSON/builder) akışta tip verilmezse TEVKIFAT tespit edilir', () => {
    // Kural yalnız validateInvoiceState'te yaşadığı için bu akışta zaten
    // tetiklenmez; yine de otomatik tespitin bozulmadığını çivileriz.
    const calculation = calculateDocument({
      profile: 'TICARIFATURA',
      sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
      customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
      lines: [withholdingLine],
    } as SimpleInvoiceInput);
    expect(calculation.type).toBe('TEVKIFAT');
  });

  it('tip OTOMATİK ZORLANMAZ: SATIS seçimi korunur, yalnız hata bildirilir (B-41)', () => {
    const s = session('SATIS', [withholdingLine]);
    s.validate();
    expect(s.toInvoiceInput().invoiceTypeCode).toBe('SATIS');
  });
});
