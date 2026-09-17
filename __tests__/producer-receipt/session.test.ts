/**
 * `ProducerReceiptSession` — oturum sözleşmesi.
 *
 * Sınanan: yol kapıları (4 ORTAK katman), olay SIRASI, satır CRUD, `unset`,
 * taraf kimlikleri ve "oturumda numara zorunlu değil" ayrımı.
 *
 * 🔴 BU DOSYA AYNI ZAMANDA ORTAKLAŞTIRMANIN KANITIDIR. Gövde
 * `session/document-session.ts`te TEK kopyadır; e-SMM oturumu da onu kullanır.
 * Buradaki her davranış `__tests__/self-employed-voucher/session.test.ts`teki
 * muadiliyle BİREBİR aynı olmalıdır — ayrışırsa ortak gövde bozulmuş demektir.
 *
 * Ek olarak e-MM'e ÖZGÜ tek fark ölçülür: taraf seçicisi ROL adıdır
 * (`issuer`/`producer`), UBL yuvasının adı (`supplier`/`customer`) DEĞİL.
 */

import { describe, it, expect } from 'vitest';
import {
  ProducerReceiptSession,
  ProducerReceiptSessionPaths,
  PRODUCER_RECEIPT_READ_ONLY_PATHS,
} from '../../src/documents/producer-receipt';
import type { ProducerReceiptPathErrorPayload } from '../../src/documents/producer-receipt';
import { PRODUCER_RECEIPT_SCENARIOS } from './scenarios';

const seed = () => structuredClone(PRODUCER_RECEIPT_SCENARIOS[0].input);

describe('ProducerReceiptSession — yol kapıları', () => {
  it('bilinmeyen yol `UNKNOWN_PATH` ile reddedilir, durum DEĞİŞMEZ', () => {
    const session = new ProducerReceiptSession();
    const errors: ProducerReceiptPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));

    session.update('yokBoyleBirAlan' as never, 'x' as never);

    expect(errors.map(e => e.code)).toEqual(['UNKNOWN_PATH']);
    expect((session.input as Record<string, unknown>).yokBoyleBirAlan).toBeUndefined();
  });

  it('🔴 UBL yuva adları YOL DEĞİLDİR — `supplier.name` bilinmeyen yoldur', () => {
    /* e-MM girdisi rol adlarını taşır. Biri faturadan alışkanlıkla
     * `supplier.name` yazarsa SESSİZCE yutulmamalı, açıkça reddedilmelidir. */
    const session = new ProducerReceiptSession({ initialInput: seed() });
    const errors: ProducerReceiptPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));

    session.update('supplier.name' as never, 'X' as never);
    session.update('customer.name' as never, 'Y' as never);

    expect(errors.map(e => e.code)).toEqual(['UNKNOWN_PATH', 'UNKNOWN_PATH']);
    // Rol adlarıyla aynı güncelleme ÇALIŞIR.
    session.update(ProducerReceiptSessionPaths.issuerName, 'Yeni Tuccar');
    expect(session.input.issuer.name).toBe('Yeni Tuccar');
  });

  it('bozuk sözdizimi `INVALID_PATH` ile reddedilir', () => {
    const session = new ProducerReceiptSession();
    const errors: ProducerReceiptPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));
    session.update('lines[' as never, 1 as never);
    expect(errors.map(e => e.code)).toEqual(['INVALID_PATH']);
  });

  it('dizi sınırı aşılınca `INDEX_OUT_OF_BOUNDS`', () => {
    const session = new ProducerReceiptSession();
    const errors: ProducerReceiptPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));
    session.update(ProducerReceiptSessionPaths.lineName(5), 'X');
    expect(errors.map(e => e.code)).toEqual(['INDEX_OUT_OF_BOUNDS']);
  });

  it('salt-okunur yol kümesi BOŞ — e-MM`de kilitlenecek eksen yok', () => {
    expect(PRODUCER_RECEIPT_READ_ONLY_PATHS.size).toBe(0);
  });

  it('`sendMethod` yolu ÜRETİLDİ — takma-ad zinciri çözülmeseydi düşecekti', () => {
    /* `ProducerReceiptSendMethod → EArchiveSendMethod → 'ELEKTRONIK' | 'KAGIT'`
     * zinciri üreteçte GEÇİŞLİ çözülüyor. Tek hop kalsaydı alan yol yüzeyinden
     * sessizce düşer ve bu güncelleme `UNKNOWN_PATH` alırdı. */
    const session = new ProducerReceiptSession({ initialInput: seed() });
    const errors: ProducerReceiptPathErrorPayload[] = [];
    session.on('path-error', e => errors.push(e));
    session.update(ProducerReceiptSessionPaths.sendMethod, 'KAGIT');
    expect(errors).toEqual([]);
    expect(session.input.sendMethod).toBe('KAGIT');
  });
});

describe('ProducerReceiptSession — olaylar (ORTAK gövdenin sözleşmesi)', () => {
  it('olay SIRASI sözleşmedir: field-changed → changed → calculated → validation-error → warnings', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    const order: string[] = [];
    for (const name of ['field-changed', 'changed', 'calculated', 'validation-error', 'warnings']) {
      session.on(name, () => order.push(name));
    }
    session.update(ProducerReceiptSessionPaths.issuerName, 'Yeni Ad');
    expect(order).toEqual(['field-changed', 'changed', 'calculated', 'validation-error', 'warnings']);
  });

  it('`lines[i].X` yolunda AYRICA `line-field-changed` yayılır', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    const seen: Array<{ lineIndex: number; field: string }> = [];
    session.on('line-field-changed', p => seen.push({ lineIndex: p.lineIndex, field: p.field }));
    session.update(ProducerReceiptSessionPaths.lineIncomeTaxWithholdingPercent(0), 4);
    expect(seen).toEqual([{ lineIndex: 0, field: 'incomeTaxWithholdingPercent' }]);
  });

  it('aynı değerle güncelleme NO-OP — hiçbir olay yayılmaz', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    let events = 0;
    session.on('changed', () => { events += 1; });
    session.update(ProducerReceiptSessionPaths.issuerName, seed().issuer.name);
    expect(events).toBe(0);
  });
});

describe('ProducerReceiptSession — satır ve alan yönetimi', () => {
  it('satır ekle/güncelle/sil', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    session.addLine({ name: 'Elma', quantity: 200, price: 18, unitCode: 'Kilogram' });
    expect(session.input.lines).toHaveLength(2);

    session.updateLine(1, { price: 21 });
    expect(session.input.lines[1].price).toBe(21);

    session.removeLine(0);
    expect(session.input.lines).toHaveLength(1);
    expect(session.input.lines[0].name).toBe('Elma');
  });

  it('`unset` opsiyonel alanı TÜMÜYLE kaldırır (boş string bırakmaz)', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    expect(session.input.sendMethod).toBe('ELEKTRONIK');
    session.unset('sendMethod');
    expect('sendMethod' in session.input).toBe(false);
    expect(session.buildXml()).not.toContain('EXT_SEND_METHOD');
  });

  it('taraf kimlikleri ROL adıyla yönetilir — son kimlik silinince alan `undefined`', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    session.setIdentifications('issuer', [{ schemeId: 'MERSISNO', value: '0123456789012345' }]);
    expect(session.input.issuer.identifications).toHaveLength(1);
    session.removeIdentification('issuer', 0);
    expect(session.input.issuer.identifications).toBeUndefined();
  });

  it('müstahsil tarafının kimlikleri de `producer` adıyla yönetilir', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    session.setIdentifications('producer', [{ schemeId: 'CIFTCIKAYITNO', value: 'CKS-42' }]);
    expect(session.input.producer.identifications).toHaveLength(1);
    session.setIdentifications('producer', []);
    expect(session.input.producer.identifications).toBeUndefined();
  });
});

describe('ProducerReceiptSession — hesap ve üretim', () => {
  it('`calculate()` toplam zincirini verir — ÇIKARMA yönünde', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    const totals = session.calculate().totals;
    expect(totals.lineExtensionAmount).toBe(10_000);
    expect(totals.taxTotalAmount).toBe(200);
    expect(totals.taxInclusiveAmount).toBe(9_800);
    expect(totals.payableAmount).toBe(9_800);
  });

  it('OTURUMDA numara BOŞ olabilir — uyarı üretmez', () => {
    const session = new ProducerReceiptSession({
      initialInput: { ...seed(), documentNumber: undefined },
    });
    expect(session.validate().map(w => w.field)).not.toContain('id');
  });

  it('boş oturum uyarı ÜRETİR ve ÇÖKMEZ', () => {
    const session = new ProducerReceiptSession();
    expect(session.warnings.length).toBeGreaterThan(0);
    expect(session.warnings.map(w => w.field)).toContain('lines');
  });

  it('BOŞ yapıcı zorunlu alanları mount eder — ilk `update` PATLAMAZ', () => {
    const session = new ProducerReceiptSession();
    session.update(ProducerReceiptSessionPaths.producerName, 'Ahmet Ciftci');
    expect(session.input.producer.name).toBe('Ahmet Ciftci');
  });

  it('`buildXml()` varsayılan olarak doğrulamasız üretir (form önizlemesi)', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    const xml = session.buildXml();
    expect(xml).toContain('<cbc:CreditNoteTypeCode>MUSTAHSILMAKBUZ</cbc:CreditNoteTypeCode>');
  });

  it('`toReceiptInput()` rol adlarını UBL yuvalarına çevirir', () => {
    const session = new ProducerReceiptSession({ initialInput: seed() });
    const raw = session.toReceiptInput();
    // Ham katmanda hâlâ rol adları (`issuer`/`producer`) durur; UBL yuvasına
    // çeviri SERİLEŞTİRİCİDE olur — ham girdi de tüketicinin dilini konuşur.
    expect(raw.issuer.vknTckn).toBe('1234567890');
    expect(raw.producer.vknTckn).toBe('11111111110');
  });
});
