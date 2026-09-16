/**
 * S3 — yüklem ⟂ bağlama ayrımının BEKÇİSİ.
 *
 * Bu dosyanın tek işi şudur: GİB'in ORTAK bir kuralı bir belgeye bağlanıp
 * diğerine bağlanmadan kalırsa koşum KIRMIZI olsun.
 *
 * Neden gerekli (ölçülmüş): `issueDateRangeRule` (`Common_Schematron:169-170`)
 * S3 öncesinde `common-validators.ts` gövdesinde gömülüydü ve `grep ISSUE_DATE_MIN
 * src/` TEK isabet veriyordu — e-İrsaliye bu ortak kuralı HİÇ ALMIYORDU. Kural
 * artık tabloda olduğu için eksiklik GÖRÜLEBİLİR; bu test onu ÖLÇER.
 */

import { describe, it, expect } from 'vitest';
import {
  INVOICE_HEADER_BINDINGS,
  despatchHeaderBindings,
} from '../../src/validators/rules/header-bindings';
import {
  documentIdRule,
  uuidRule,
  dateFormatRule,
  timeFormatRule,
  issueDateRangeRule,
  turkeyToday,
  ISSUE_DATE_MIN,
} from '../../src/validators/rules/common-field-rules';
import { validateDespatch } from '../../src/validators/despatch-validators';
import { validateCommon } from '../../src/validators/common-validators';
import type { FieldBinding } from '../../src/validators/rules/field-rule';
import type { DespatchInput } from '../../src/types/despatch-input';
import type { InvoiceInput } from '../../src/types/invoice-input';
import { DespatchProfileId, DespatchTypeCode, InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';

/** Tablodan tek satır çeker — bağlama eksikse `undefined` döner (testin konusu). */
function bindingFor<S>(table: readonly FieldBinding<S>[], path: string): FieldBinding<S> | undefined {
  return table.find(b => b.path === path);
}

/**
 * Her belgede AYNI yüklem demetini taşıması gereken ORTAK künye alanları.
 * Yeni bir belge türü (e-SMM, e-MM) eklendiğinde tablosu buraya yazılır.
 */
const DOCUMENT_TABLES: ReadonlyArray<{ name: string; table: readonly FieldBinding<never>[] }> = [
  { name: 'e-Fatura', table: INVOICE_HEADER_BINDINGS as readonly FieldBinding<never>[] },
  { name: 'e-İrsaliye', table: despatchHeaderBindings('document') as readonly FieldBinding<never>[] },
];

describe('S3 · ortak kural bağlama bekçisi', () => {
  for (const { name, table } of DOCUMENT_TABLES) {
    describe(name, () => {
      it('belge numarası ORTAK `documentIdRule`a bağlı', () => {
        expect(bindingFor(table, 'id')?.rules).toContain(documentIdRule);
      });

      it('UUID ORTAK `uuidRule`a bağlı', () => {
        expect(bindingFor(table, 'uuid')?.rules).toContain(uuidRule);
      });

      it('🔴 düzenleme tarihi ORTAK `issueDateRangeRule`a bağlı (S3 kapalı deliği)', () => {
        const issueDate = bindingFor(table, 'issueDate');
        expect(issueDate?.rules).toContain(dateFormatRule);
        expect(issueDate?.rules).toContain(issueDateRangeRule);
      });

      it('biçim yüklemi aralık yükleminden ÖNCE gelir (zincir sırası)', () => {
        const rules = bindingFor(table, 'issueDate')?.rules ?? [];
        expect(rules.indexOf(dateFormatRule)).toBeLessThan(rules.indexOf(issueDateRangeRule));
      });

      it('düzenleme saati ORTAK `timeFormatRule`a bağlı', () => {
        expect(bindingFor(table, 'issueTime')?.rules).toContain(timeFormatRule);
      });
    });
  }

  it('numara bağlaması AŞAMAya göre zorunluluk değiştirir, yüklem DEĞİŞTİRMEZ', () => {
    const doc = bindingFor(despatchHeaderBindings('document'), 'id');
    const session = bindingFor(despatchHeaderBindings('session'), 'id');
    expect(doc?.presence).toBe('required');
    expect(session?.presence).toBe('optional');
    // Biçim kuralı her iki aşamada da koşar — elle yazılmış yanlış numara sessiz kalmamalı.
    expect(session?.rules).toContain(documentIdRule);
  });
});

/* ── Yüklemin GERÇEKTEN koştuğunun kanıtı ─────────────────────────────────
 * Tabloda bağlı görünmek yeterli değildir; doğrulayıcı çıktısında da görülmeli. */

function validDespatch(overrides: Partial<DespatchInput> = {}): DespatchInput {
  return {
    id: 'TST2026000000001',
    uuid: '11111111-2222-4333-8444-555555555555',
    profileId: DespatchProfileId.TEMELIRSALIYE,
    despatchTypeCode: DespatchTypeCode.SEVK,
    issueDate: '2026-04-23',
    issueTime: '10:00:00',
    supplier: {
      vknTckn: '1234567890', taxIdType: 'VKN', name: 'Satıcı A.Ş.',
      cityName: 'İstanbul', citySubdivisionName: 'Kadıköy',
    },
    customer: {
      vknTckn: '9876543210', taxIdType: 'VKN', name: 'Alıcı A.Ş.',
      cityName: 'İstanbul', citySubdivisionName: 'Beşiktaş',
    },
    shipment: {
      actualDespatchDate: '2026-04-23',
      actualDespatchTime: '12:00:00',
      deliveryAddress: {
        citySubdivisionName: 'Beşiktaş', cityName: 'İstanbul',
        country: 'Türkiye', postalZone: '34000',
      },
      driverPersons: [{ firstName: 'Ali', familyName: 'Veli', nationalityId: '12345678901' }],
      licensePlates: [{ plateNumber: '34ABC123', schemeId: 'PLAKA' }],
    },
    lines: [{ id: '1', quantity: 1, unitCode: 'C62', item: { name: 'Ürün' } }],
    ...overrides,
  } as DespatchInput;
}

describe('S3 · irsaliye ARTIK ortak tarih aralığı kuralını alıyor', () => {
  it('🔴 2005 öncesi irsaliye tarihi REDDEDİLİR (S3 öncesi sessizce geçiyordu)', () => {
    const errors = validateDespatch(validDespatch({ issueDate: '1999-12-31' }));
    expect(errors.some(e => e.code === 'INVALID_VALUE' && e.path === 'issueDate')).toBe(true);
  });

  it('🔴 gelecek tarihli irsaliye REDDEDİLİR', () => {
    const errors = validateDespatch(validDespatch({
      issueDate: '2099-01-01',
      shipment: { ...validDespatch().shipment!, actualDespatchDate: '2099-01-01' },
    }));
    expect(errors.some(e => e.code === 'INVALID_VALUE' && e.path === 'issueDate')).toBe(true);
  });

  it('alt sınır (2005-01-01) KABUL edilir', () => {
    const errors = validateDespatch(validDespatch({
      issueDate: '2005-01-01',
      shipment: { ...validDespatch().shipment!, actualDespatchDate: '2005-01-01' },
    }));
    expect(errors.filter(e => e.path === 'issueDate')).toHaveLength(0);
  });

  it('biçimi bozuk tarihte aralık hatası EKLENMEZ (zincir ilk ihlalde durur)', () => {
    const errors = validateDespatch(validDespatch({ issueDate: '23-04-2026' }));
    const issueDateErrors = errors.filter(e => e.path === 'issueDate');
    expect(issueDateErrors).toHaveLength(1);
    expect(issueDateErrors[0].code).toBe('INVALID_FORMAT');
  });

  it('aralık hatasının `expected` metni iki belgede de AYNI sözlükten gelir', () => {
    const despatchError = validateDespatch(validDespatch({ issueDate: '1999-12-31' }))
      .find(e => e.path === 'issueDate');
    const invoiceError = validateCommon({
      id: 'TST2026000000001',
      uuid: '11111111-2222-4333-8444-555555555555',
      profileId: InvoiceProfileId.TEMELFATURA,
      invoiceTypeCode: InvoiceTypeCode.SATIS,
      issueDate: '1999-12-31',
      currencyCode: 'TRY',
    } as InvoiceInput).find(e => e.path === 'issueDate');

    expect(despatchError?.expected).toBe(`${ISSUE_DATE_MIN} ≤ tarih ≤ ${turkeyToday()}`);
    expect(invoiceError?.expected).toBe(despatchError?.expected);
  });
});
