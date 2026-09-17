/**
 * e-SMM doğrulama kapıları — POZİTİF ve NEGATİF.
 *
 * İki soruyu ayrı ayrı sorar:
 *   • Devraldığımız ORTAK kurallar gerçekten koşuyor mu? (bedava devralma iddiası)
 *   • e-SMM'e ÖZGÜ kapılar doğru şeyi reddediyor mu?
 *
 * Ayrıca "yanlışlıkla REDDETMEME" disiplini de test edilir: `PaymentMeans`
 * yokluğu, stopajsızlık ve satır düzeyi stopaj HATA DEĞİLDİR.
 */

import { describe, it, expect } from 'vitest';
import {
  SelfEmployedVoucherBuilder,
  SimpleSelfEmployedVoucherBuilder,
  validateSelfEmployedVoucher,
  mapSimpleToSelfEmployedVoucherInput,
  SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES,
} from '../../src/documents/self-employed-voucher';
import type {
  SelfEmployedVoucherInput,
  SimpleSelfEmployedVoucherInput,
} from '../../src/documents/self-employed-voucher';
import { SELF_EMPLOYED_VOUCHER_SCENARIOS } from './scenarios';

const simple = (
  overrides: Partial<SimpleSelfEmployedVoucherInput> = {},
): SimpleSelfEmployedVoucherInput => ({
  ...structuredClone(SELF_EMPLOYED_VOUCHER_SCENARIOS[0].input),
  ...overrides,
});

const raw = (overrides: Partial<SimpleSelfEmployedVoucherInput> = {}): SelfEmployedVoucherInput =>
  mapSimpleToSelfEmployedVoucherInput(simple(overrides));

const codesOf = (errors: { code: string }[]) => errors.map(e => e.code);
const pathsOf = (errors: { path?: string }[]) => errors.map(e => e.path ?? '');

describe('e-SMM — ORTAK kurallar BEDAVA devralınıyor', () => {
  it('belge numarası biçimi ortak `documentIdRule`dan gelir', () => {
    const errors = validateSelfEmployedVoucher({ ...raw(), id: 'YANLIS-NUMARA' });
    expect(pathsOf(errors)).toContain('id');
    expect(codesOf(errors)).toContain('INVALID_FORMAT');
  });

  it('ETTN biçimi ortak `uuidRule`dan gelir', () => {
    const errors = validateSelfEmployedVoucher({ ...raw(), uuid: 'not-a-uuid' });
    expect(pathsOf(errors)).toContain('uuid');
  });

  it('düzenleme tarihi ARALIĞI ortak `issueDateRangeRule`dan gelir (B-65)', () => {
    // Bu kural GİB'in ORTAK kuralıdır ve irsaliyeyi yıllarca atlamıştı.
    const errors = validateSelfEmployedVoucher({ ...raw(), issueDate: '1999-01-01' });
    expect(pathsOf(errors)).toContain('issueDate');
    expect(codesOf(errors)).toContain('INVALID_VALUE');
  });

  it('taraf kuralları ortak `validateParty`dan gelir (TCKN → Person adı zorunlu)', () => {
    const input = raw();
    const errors = validateSelfEmployedVoucher({
      ...input,
      supplier: { ...input.supplier, firstName: undefined, familyName: undefined },
    });
    expect(pathsOf(errors)).toContain('supplier.firstName');
    expect(pathsOf(errors)).toContain('supplier.familyName');
  });
});

describe('e-SMM — künye SAPMALARI', () => {
  it('cbc:IssueTime ZORUNLUDUR (faturada opsiyonel)', () => {
    const errors = validateSelfEmployedVoucher({ ...raw(), issueTime: '' });
    expect(pathsOf(errors)).toContain('issueTime');
    expect(codesOf(errors)).toContain('MISSING_FIELD');
  });

  it("aşama 'session' iken numara YOKLUĞU hata değil, YANLIŞ numara hata", () => {
    const missing = validateSelfEmployedVoucher({ ...raw(), id: '' }, { stage: 'session' });
    expect(pathsOf(missing)).not.toContain('id');

    const malformed = validateSelfEmployedVoucher({ ...raw(), id: 'XX' }, { stage: 'session' });
    expect(pathsOf(malformed)).toContain('id');
  });

  it("aşama 'document' (varsayılan) iken numara ZORUNLU", () => {
    expect(pathsOf(validateSelfEmployedVoucher({ ...raw(), id: '' }))).toContain('id');
  });
});

describe('e-SMM — vergi düzlemi kapıları', () => {
  it('vergi kümesi TİP düzeyinde üçe kapalı', () => {
    expect([...SELF_EMPLOYED_VOUCHER_TAX_TYPE_CODES]).toEqual(['0003', '0015', '9015']);
  });

  it('küme dışı kod ÇALIŞMA ZAMANINDA da reddedilir (tip denetimsiz çağıran için)', () => {
    const input = raw();
    const tampered = structuredClone(input);
    // Tip denetimini atlayan bir JS çağıranını taklit et.
    (tampered.taxTotal.taxSubtotals[0] as { taxTypeCode: string }).taxTypeCode = '0071';
    const errors = validateSelfEmployedVoucher(tampered);
    expect(pathsOf(errors)).toContain('taxTotal.taxSubtotals[0].taxTypeCode');
  });

  it('KDV=0 + istisna METNİ YOK → reddedilir (TaxExemptionReasonCheck)', () => {
    // İstisna KODU verilip METİN çözülemezse belge GİB kapısında düşer.
    const input = mapSimpleToSelfEmployedVoucherInput(
      simple({
        kdvExemptionCode: undefined,
        kdvExemptionReason: undefined,
        lines: [{ name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 0 }],
      }),
    );
    const errors = validateSelfEmployedVoucher(input);
    expect(codesOf(errors)).toContain('TAX_EXEMPTION_REASON_REQUIRED');
  });

  it('KDV=0 + istisna metni VAR → geçer', () => {
    const errors = validateSelfEmployedVoucher(
      mapSimpleToSelfEmployedVoucherInput(
        simple({
          kdvExemptionCode: '351',
          lines: [{ name: 'Hizmet', quantity: 1, price: 1000, kdvPercent: 0 }],
        }),
      ),
    );
    expect(errors).toEqual([]);
  });

  it('9015 varken 0015 yoksa reddedilir — tevkifatın matrahı KDV`dir', () => {
    const input = raw();
    const tampered = structuredClone(input);
    tampered.taxTotal.taxSubtotals = [
      { taxableAmount: 100, taxAmount: 50, percent: 50, taxTypeCode: '9015' },
    ];
    expect(pathsOf(validateSelfEmployedVoucher(tampered))).toContain('taxTotal.taxSubtotals');
  });
});

describe('e-SMM — döviz kapısı (CurrencyCodeCheck)', () => {
  it('TRY dışı belgede kur ZORUNLU', () => {
    const errors = validateSelfEmployedVoucher({
      ...raw({ currencyCode: 'USD' }),
      exchangeRate: undefined,
    });
    expect(pathsOf(errors)).toContain('exchangeRate.calculationRate');
  });

  it('kur 6 ondalıktan fazlasını taşıyamaz', () => {
    const errors = validateSelfEmployedVoucher(
      raw({ currencyCode: 'USD', exchangeRate: 34.1234567 }),
    );
    expect(pathsOf(errors)).toContain('exchangeRate.calculationRate');
  });

  it('TRY belgede kur GEREKMEZ', () => {
    expect(validateSelfEmployedVoucher(raw())).toEqual([]);
  });

  it('kod listesi dışı para birimi reddedilir', () => {
    expect(pathsOf(validateSelfEmployedVoucher(raw({ currencyCode: 'XXX' })))).toContain(
      'currencyCode',
    );
  });
});

describe('e-SMM — YANLIŞLIKLA REDDETMEME disiplini', () => {
  it('`PaymentMeans` YOKLUĞU hata DEĞİL — 12/12 prod belgede zaten yok', () => {
    const xml = new SimpleSelfEmployedVoucherBuilder({ validationLevel: 'strict' }).build(simple()).xml;
    expect(xml).not.toContain('PaymentMeans');
  });

  it('stopajsız belge geçerlidir — stopaj ZORUNLU değil', () => {
    expect(validateSelfEmployedVoucher(raw())).toEqual([]);
  });

  it('stopaj SATIR düzeyinde verilebilir — "yalnız belge düzeyi" kuralı YOK', () => {
    const { xml } = new SimpleSelfEmployedVoucherBuilder({ validationLevel: 'strict' }).build(
      simple({
        lines: [
          { name: 'A', quantity: 1, price: 1000, kdvPercent: 20, incomeTaxWithholdingPercent: 20 },
          { name: 'B', quantity: 1, price: 1000, kdvPercent: 20 },
        ],
      }),
    );
    expect(xml).toContain('<cbc:TaxTypeCode>0003</cbc:TaxTypeCode>');
  });

  it('satıcı VKN`li olabilir — `cac:Person`a KİLİTLİ DEĞİL (noter, adi ortaklık)', () => {
    const { xml } = new SimpleSelfEmployedVoucherBuilder({ validationLevel: 'strict' }).build(
      simple({
        supplier: {
          taxNumber: '9876543210',
          name: 'Ornek Noterligi',
          address: 'Merkez Mah. 1. Sk.',
          district: 'Kadikoy',
          city: 'Istanbul',
        },
      }),
    );
    expect(xml).toContain('<cbc:ID schemeID="VKN">9876543210</cbc:ID>');
    expect(xml).toContain('<cbc:Name>Ornek Noterligi</cbc:Name>');
  });
});

describe('e-SMM builder — hata yolu', () => {
  it('geçersiz belge `UblBuildError` fırlatır', () => {
    expect(() => new SelfEmployedVoucherBuilder().build({ ...raw(), id: '' })).toThrow();
  });

  it("validationLevel 'none' iken doğrulama HİÇ koşmaz", () => {
    const builder = new SelfEmployedVoucherBuilder({ validationLevel: 'none' });
    expect(builder.validate({ ...raw(), id: '' })).toEqual([]);
    expect(builder.build({ ...raw(), id: '' })).toContain('<cbc:ProfileID>EARSIVBELGE</cbc:ProfileID>');
  });
});
