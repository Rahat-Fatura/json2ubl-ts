/**
 * `SelfEmployedVoucherSession` — oturum sözleşmesi.
 *
 * Sınanan: yol kapıları (4 ORTAK katman), olay SIRASI, satır CRUD, `unset`,
 * taraf kimlikleri ve "oturumda numara zorunlu değil" ayrımı. Hepsi
 * `InvoiceSession`/`DespatchSession` ile AYNI davranıştır — biri tanınınca
 * diğeri de tanınmalı.
 */

import { describe, it, expect } from 'vitest';
import {
  SelfEmployedVoucherSession,
  SelfEmployedVoucherSessionPaths,
  SELF_EMPLOYED_VOUCHER_READ_ONLY_PATHS,
} from '../../src/documents/self-employed-voucher';
import type { SelfEmployedVoucherPathErrorPayload } from '../../src/documents/self-employed-voucher';
import { SELF_EMPLOYED_VOUCHER_SCENARIOS } from './scenarios';

const seed = () => structuredClone(SELF_EMPLOYED_VOUCHER_SCENARIOS[0].input);

describe('SelfEmployedVoucherSession — yol kapıları', () => {
  it('bilinmeyen yol `UNKNOWN_PATH` ile reddedilir, durum DEĞİŞMEZ', () => {
    const session = new SelfEmployedVoucherSession();
    const errors: SelfEmployedVoucherPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));

    session.update('yokBoyleBirAlan' as never, 'x' as never);

    expect(errors.map(e => e.code)).toEqual(['UNKNOWN_PATH']);
    expect((session.input as Record<string, unknown>).yokBoyleBirAlan).toBeUndefined();
  });

  it('bozuk sözdizimi `INVALID_PATH` ile reddedilir', () => {
    const session = new SelfEmployedVoucherSession();
    const errors: SelfEmployedVoucherPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));
    session.update('lines[' as never, 1 as never);
    expect(errors.map(e => e.code)).toEqual(['INVALID_PATH']);
  });

  it('dizi sınırı aşılınca `INDEX_OUT_OF_BOUNDS`', () => {
    const session = new SelfEmployedVoucherSession();
    const errors: SelfEmployedVoucherPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));
    session.update(SelfEmployedVoucherSessionPaths.lineName(5), 'X');
    expect(errors.map(e => e.code)).toEqual(['INDEX_OUT_OF_BOUNDS']);
  });

  it('salt-okunur yol kümesi BOŞ — e-SMM`de kilitlenecek eksen yok', () => {
    expect(SELF_EMPLOYED_VOUCHER_READ_ONLY_PATHS.size).toBe(0);
  });
});

describe('SelfEmployedVoucherSession — olaylar', () => {
  it('olay SIRASI sözleşmedir: field-changed → changed → calculated → validation-error → warnings', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    const order: string[] = [];
    for (const name of ['field-changed', 'changed', 'calculated', 'validation-error', 'warnings']) {
      session.on(name, () => order.push(name));
    }
    session.update(SelfEmployedVoucherSessionPaths.supplierName, 'Yeni Ad');
    expect(order).toEqual(['field-changed', 'changed', 'calculated', 'validation-error', 'warnings']);
  });

  it('`lines[i].X` yolunda AYRICA `line-field-changed` yayılır', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    const seen: Array<{ lineIndex: number; field: string }> = [];
    session.on('line-field-changed', p => seen.push({ lineIndex: p.lineIndex, field: p.field }));
    session.update(SelfEmployedVoucherSessionPaths.lineKdvPercent(0), 10);
    expect(seen).toEqual([{ lineIndex: 0, field: 'kdvPercent' }]);
  });

  it('aynı değerle güncelleme NO-OP — hiçbir olay yayılmaz', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    let events = 0;
    session.on('changed', () => { events += 1; });
    session.update(SelfEmployedVoucherSessionPaths.supplierName, seed().supplier.name);
    expect(events).toBe(0);
  });
});

describe('SelfEmployedVoucherSession — satır ve alan yönetimi', () => {
  it('satır ekle/güncelle/sil', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    session.addLine({ name: 'Ek hizmet', quantity: 2, price: 500, kdvPercent: 20 });
    expect(session.input.lines).toHaveLength(2);

    session.updateLine(1, { price: 750 });
    expect(session.input.lines[1].price).toBe(750);

    session.removeLine(0);
    expect(session.input.lines).toHaveLength(1);
    expect(session.input.lines[0].name).toBe('Ek hizmet');
  });

  it('`unset` opsiyonel alanı TÜMÜYLE kaldırır (boş string bırakmaz)', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    expect(session.input.sendMethod).toBe('ELEKTRONIK');
    session.unset('sendMethod');
    expect('sendMethod' in session.input).toBe(false);
    expect(session.buildXml()).not.toContain('EXT_SEND_METHOD');
  });

  it('son taraf kimliği silinince alan `undefined` olur', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    session.setIdentifications('supplier', [{ schemeId: 'MERSISNO', value: '0123456789012345' }]);
    expect(session.input.supplier.identifications).toHaveLength(1);
    session.removeIdentification('supplier', 0);
    expect(session.input.supplier.identifications).toBeUndefined();
  });
});

describe('SelfEmployedVoucherSession — hesap ve üretim', () => {
  it('`calculate()` toplam zincirini verir', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    session.update(SelfEmployedVoucherSessionPaths.incomeTaxWithholdingPercent, 20);
    const totals = session.calculate().totals;
    expect(totals.lineExtensionAmount).toBe(10_000);
    expect(totals.netFee).toBe(8_000);
    expect(totals.taxInclusiveAmount).toBe(12_000);
    expect(totals.payableAmount).toBe(10_000);
  });

  it('OTURUMDA numara BOŞ olabilir — uyarı üretmez', () => {
    const session = new SelfEmployedVoucherSession({
      initialInput: { ...seed(), documentNumber: undefined },
    });
    const warnings = session.validate();
    expect(warnings.map(w => w.field)).not.toContain('id');
  });

  it('boş oturum uyarı ÜRETİR ve ÇÖKMEZ', () => {
    const session = new SelfEmployedVoucherSession();
    expect(session.warnings.length).toBeGreaterThan(0);
    expect(session.warnings.map(w => w.field)).toContain('lines');
  });

  it('`buildXml()` varsayılan olarak doğrulamasız üretir (form önizlemesi)', () => {
    const session = new SelfEmployedVoucherSession({ initialInput: seed() });
    const xml = session.buildXml();
    expect(xml).toContain('<cbc:InvoiceTypeCode>SERBESTMESLEKMAKBUZU</cbc:InvoiceTypeCode>');
  });
});
