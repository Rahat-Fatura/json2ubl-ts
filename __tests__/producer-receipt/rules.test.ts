/**
 * e-MM doğrulama kapıları — POZİTİF ve NEGATİF.
 *
 * Üç soruyu ayrı ayrı sorar:
 *   • Devraldığımız ORTAK kurallar gerçekten koşuyor mu? (bedava devralma iddiası)
 *   • e-MM'e ÖZGÜ kapılar doğru şeyi reddediyor mu?
 *   • "Yanlışlıkla REDDETMEME" disiplini tutuyor mu?
 *
 * 🔴 Bu kapılar e-SMM'dekinden DAHA KRİTİK: canlı şematron `CreditNote` kökünde
 * profil/tip/vergi-kodu için hiçbir assert koşturmuyor (ölçüldü). Bu dosyadaki
 * testler silinirse o üç alan HİÇBİR YERDE denetlenmez.
 */

import { describe, it, expect } from 'vitest';
import {
  ProducerReceiptBuilder,
  SimpleProducerReceiptBuilder,
  validateProducerReceipt,
  mapSimpleToProducerReceiptInput,
  PRODUCER_RECEIPT_TAX_TYPE_CODES,
} from '../../src/documents/producer-receipt';
import type {
  ProducerReceiptInput,
  SimpleProducerReceiptInput,
} from '../../src/documents/producer-receipt';
import { PRODUCER_RECEIPT_SCENARIOS } from './scenarios';

const simple = (
  overrides: Partial<SimpleProducerReceiptInput> = {},
): SimpleProducerReceiptInput => ({
  ...structuredClone(PRODUCER_RECEIPT_SCENARIOS[0].input),
  ...overrides,
});

const raw = (overrides: Partial<SimpleProducerReceiptInput> = {}): ProducerReceiptInput =>
  mapSimpleToProducerReceiptInput(simple(overrides));

const codesOf = (errors: { code: string }[]) => errors.map(e => e.code);
const pathsOf = (errors: { path?: string }[]) => errors.map(e => e.path ?? '');

describe('e-MM — ORTAK kurallar BEDAVA devralınıyor', () => {
  it('belge numarası biçimi ortak `documentIdRule`dan gelir', () => {
    const errors = validateProducerReceipt({ ...raw(), id: 'YANLIS-NUMARA' });
    expect(pathsOf(errors)).toContain('id');
    expect(codesOf(errors)).toContain('INVALID_FORMAT');
  });

  it('ETTN biçimi ortak `uuidRule`dan gelir', () => {
    expect(pathsOf(validateProducerReceipt({ ...raw(), uuid: 'not-a-uuid' }))).toContain('uuid');
  });

  it('düzenleme tarihi ARALIĞI ortak `issueDateRangeRule`dan gelir (B-65)', () => {
    const errors = validateProducerReceipt({ ...raw(), issueDate: '1999-01-01' });
    expect(pathsOf(errors)).toContain('issueDate');
    expect(codesOf(errors)).toContain('INVALID_VALUE');
  });

  it('düzenleme saati ZORUNLU ve biçimi denetlenir', () => {
    expect(pathsOf(validateProducerReceipt({ ...raw(), issueTime: '' }))).toContain('issueTime');
    expect(pathsOf(validateProducerReceipt({ ...raw(), issueTime: '25:99' }))).toContain('issueTime');
  });

  it('para birimi + kur kapısı ORTAK `validateDocumentCurrency`dan gelir', () => {
    // TRY dışı belgede kur ZORUNLU.
    const noRate = { ...raw(), currencyCode: 'USD' };
    delete (noRate as { exchangeRate?: unknown }).exchangeRate;
    expect(pathsOf(validateProducerReceipt(noRate))).toContain('exchangeRate.calculationRate');

    // 6 ondalıktan fazla kur reddedilir.
    const tooPrecise = validateProducerReceipt({
      ...raw(),
      currencyCode: 'USD',
      exchangeRate: { sourceCurrencyCode: 'USD', targetCurrencyCode: 'TRY', calculationRate: 1.23456789 },
    });
    expect(pathsOf(tooPrecise)).toContain('exchangeRate.calculationRate');
  });

  it('kalem kimliği kapısı ORTAK `validateLineIdentity`den gelir', () => {
    const input = raw();
    const broken: ProducerReceiptInput = {
      ...input,
      lines: [{ ...input.lines[0], id: 'bir', unitCode: '', item: { name: '' } }],
    };
    const paths = pathsOf(validateProducerReceipt(broken));
    expect(paths).toContain('lines[0].id');
    expect(paths).toContain('lines[0].unitCode');
    expect(paths).toContain('lines[0].item.name');
  });

  it('kalem adı sözlüğü BELGEYE ait — e-MM`de "Ürün adı"', () => {
    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      lines: [{ ...input.lines[0], item: { name: '' } }],
    });
    expect(errors.find(e => e.path === 'lines[0].item.name')?.message).toContain('Ürün adı');
  });

  it('taraf kuralları ortak `validateParty`dan gelir — ve YOL rolün adını taşır', () => {
    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      producer: { ...input.producer, vknTckn: '123' },
    });
    // `customer` DEĞİL `producer`: tüketici hatayı KENDİ girdi şeklinde görür.
    expect(pathsOf(errors).some(p => p.startsWith('producer'))).toBe(true);
    expect(pathsOf(errors).some(p => p.startsWith('customer'))).toBe(false);
  });

  it('düzenleyen tarafın hata yolu `issuer` — `supplier` DEĞİL', () => {
    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      issuer: { ...input.issuer, vknTckn: '' },
    });
    expect(pathsOf(errors).some(p => p.startsWith('issuer'))).toBe(true);
    expect(pathsOf(errors).some(p => p.startsWith('supplier'))).toBe(false);
  });
});

describe('e-MM — ÖZGÜ kapılar (şematronun BIRAKTIĞI yer)', () => {
  it('kod kümesi KAPALI — {0003, 8001, SGK_PRIM} dışı reddedilir', () => {
    expect([...PRODUCER_RECEIPT_TAX_TYPE_CODES]).toEqual(['0003', '8001', 'SGK_PRIM']);

    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      taxTotal: {
        ...input.taxTotal,
        taxSubtotals: [{ ...input.taxTotal.taxSubtotals[0], taxTypeCode: '0015' as never }],
      },
    });
    expect(pathsOf(errors)).toContain('taxTotal.taxSubtotals[0].taxTypeCode');
  });

  it('NEGATİF kesinti tutarı reddedilir — zinciri sessizce terse çevirirdi', () => {
    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      taxTotal: {
        taxAmount: -200,
        taxSubtotals: [{ ...input.taxTotal.taxSubtotals[0], taxAmount: -200 }],
      },
    });
    expect(codesOf(errors)).toContain('NEGATIVE_DEDUCTION_AMOUNT');
  });

  it('TaxTotal/TaxAmount alt toplamların toplamı DEĞİLSE reddedilir', () => {
    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      taxTotal: { ...input.taxTotal, taxAmount: 999 },
    });
    expect(pathsOf(errors)).toContain('taxTotal.taxAmount');
    expect(errors.find(e => e.path === 'taxTotal.taxAmount')?.expected).toContain('200.00');
  });

  it('kuruş altı fark TOLERE edilir — float artefaktı hata sayılmaz', () => {
    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      taxTotal: { ...input.taxTotal, taxAmount: 200.004 },
    });
    expect(pathsOf(errors)).not.toContain('taxTotal.taxAmount');
  });

  it('boş TaxSubtotal listesi reddedilir', () => {
    const input = raw();
    const errors = validateProducerReceipt({
      ...input,
      taxTotal: { taxAmount: 0, taxSubtotals: [] },
    });
    expect(pathsOf(errors)).toContain('taxTotal.taxSubtotals');
  });

  it('kalemsiz belge reddedilir', () => {
    expect(pathsOf(validateProducerReceipt({ ...raw(), lines: [] }))).toContain('lines');
  });
});

describe('e-MM — YANLIŞLIKLA REDDETMEME disiplini', () => {
  it('geçerli senaryoların HİÇBİRİ hata üretmez', () => {
    for (const s of PRODUCER_RECEIPT_SCENARIOS) {
      const errors = validateProducerReceipt(mapSimpleToProducerReceiptInput(s.input));
      expect(errors, `${s.slug} hata üretmemeli`).toEqual([]);
    }
  });

  it('teslim tarihi ≠ düzenleme tarihi HATA DEĞİLDİR (geriye dönük makbuz)', () => {
    const errors = validateProducerReceipt(raw({ deliveryDate: '2026-09-10' }));
    expect(errors).toEqual([]);
  });

  it('teslim tarihi HİÇ olmayan ham girdi de geçerlidir (alan opsiyonel)', () => {
    const input = raw();
    delete (input as { actualDeliveryDate?: string }).actualDeliveryDate;
    expect(validateProducerReceipt(input)).toEqual([]);
  });

  it('müstahsil TÜZEL kişi olabilir — TCKN`e KİLİTLENMEZ', () => {
    // Adi/kollektif ortaklık ya da tüzel kişi müstahsil meşrudur.
    const errors = validateProducerReceipt(
      raw({
        producer: {
          taxNumber: '9876543210',
          name: 'Koy Tarim Kooperatifi',
          address: 'Merkez Mah.',
          district: 'Melikgazi',
          city: 'Kayseri',
          taxOffice: 'Melikgazi',
        },
      }),
    );
    expect(errors).toEqual([]);
  });

  it('%4 stopaj oranı da meşrudur — oran DAYATILMAZ', () => {
    expect(validateProducerReceipt(raw({ incomeTaxWithholdingPercent: 4 }))).toEqual([]);
  });

  it('PaymentMeans yokluğu hata DEĞİLDİR (27 prod belgenin 0`ında var)', () => {
    const { xml } = new SimpleProducerReceiptBuilder({ validationLevel: 'strict' }).build(simple());
    expect(xml).not.toContain('PaymentMeans');
  });
});

describe('e-MM — AŞAMA (`stage`) sözleşmesi', () => {
  it('`document` (varsayılan) aşamada numara ZORUNLU', () => {
    const noNumber = { ...raw(), id: '' };
    expect(pathsOf(validateProducerReceipt(noNumber))).toContain('id');
  });

  it('`session` aşamasında numaranın YOKLUĞU hata değildir', () => {
    const noNumber = { ...raw(), id: '' };
    expect(pathsOf(validateProducerReceipt(noNumber, { stage: 'session' }))).not.toContain('id');
  });

  it('`session` aşamasında da YANLIŞ numara reddedilir', () => {
    const badNumber = { ...raw(), id: 'YANLIS' };
    expect(pathsOf(validateProducerReceipt(badNumber, { stage: 'session' }))).toContain('id');
  });
});

describe('e-MM builder — ortak gövdenin davranışı', () => {
  it('`validationLevel: none` doğrulamayı ATLAR', () => {
    const builder = new ProducerReceiptBuilder({ validationLevel: 'none' });
    expect(builder.validate({ ...raw(), id: 'YANLIS' })).toEqual([]);
    expect(() => builder.build({ ...raw(), id: 'YANLIS' })).not.toThrow();
  });

  it('`build` doğrulama hatasında UblBuildError FIRLATIR', () => {
    expect(() => new ProducerReceiptBuilder().build({ ...raw(), id: 'YANLIS' })).toThrow();
  });

  it('`buildUnsafe` doğrulamadan üretir', () => {
    const xml = new ProducerReceiptBuilder().buildUnsafe({ ...raw(), id: 'YANLIS' });
    expect(xml).toContain('<cbc:ID>YANLIS</cbc:ID>');
  });
});
