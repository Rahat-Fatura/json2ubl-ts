/**
 * hks-kunyeno-validator — Schematron `HKSInvioceCheck` testleri.
 *
 * GİB'in HKS profili için tek belge kısıtı: her kalemde 19 karakterli KUNYENO.
 * 4.1.2'ye kadar kütüphanede bu kural YALNIZ InvoiceInput katmanında ve YALNIZ
 * `validationLevel='strict'` altında vardı; InvoiceSession/UI akışı
 * KUNYENO'suz HKS faturasını sessizce üretiyordu.
 */

import { describe, it, expect } from 'vitest';
import { validateHksKunyeNo } from '../../src/validators/hks-kunyeno-validator';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

/** 19 karakterlik geçerli künye numarası */
const VALID_KUNYENO = 'KUN-2026-042-DOM001';

function line(overrides: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return { name: 'Domates', quantity: 100, price: 10, unitCode: 'Adet', kdvPercent: 1, ...overrides };
}

function baseInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'TEST',
    uuid: 'e1a2b3c4-0000-4000-8000-000000000001',
    datetime: '2026-04-24T10:00:00',
    profile: 'HKS',
    type: 'HKSSATIS',
    currencyCode: 'TRY',
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: VALID_KUNYENO }] })],
    ...overrides,
  };
}

describe('hks-kunyeno-validator — HKSInvioceCheck', () => {
  describe('KUNYENO varlığı', () => {
    it('HKS + kalemde KUNYENO yok → PROFILE_REQUIREMENT', () => {
      const errs = validateHksKunyeNo(baseInput({ lines: [line()] }));
      expect(errs).toHaveLength(1);
      expect(errs[0].code).toBe('PROFILE_REQUIREMENT');
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications');
      expect(errs[0].message).toContain('KUNYENO');
    });

    it('HKS + KUNYENO boş string → hata (dolu sanılmasın)', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: '   ' }] })],
      }));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications');
    });

    it('HKS + başka schemeId (ETIKETNO) var ama KUNYENO yok → hata', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'ETIKETNO', value: 'AB1234567' }] })],
      }));
      expect(errs).toHaveLength(1);
    });

    it('HKS + 19 karakterli KUNYENO → hata yok', () => {
      expect(validateHksKunyeNo(baseInput())).toHaveLength(0);
    });
  });

  describe('KUNYENO uzunluğu (tam 19)', () => {
    it('18 karakter → hata', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'K'.repeat(18) }] })],
      }));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications.KUNYENO');
      expect(errs[0].message).toContain('19');
    });

    it('20 karakter → hata', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: 'K'.repeat(20) }] })],
      }));
      expect(errs).toHaveLength(1);
      expect(errs[0].path).toBe('lines[0].additionalItemIdentifications.KUNYENO');
    });

    it('baş/son boşluk uzunluğa sayılmaz (normalize-space)', () => {
      const errs = validateHksKunyeNo(baseInput({
        lines: [line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: `  ${VALID_KUNYENO}  ` }] })],
      }));
      expect(errs).toHaveLength(0);
    });
  });

  describe('Kapsam (yalnız HKS profili)', () => {
    it('TEMELFATURA + KUNYENO yok → hata yok', () => {
      const errs = validateHksKunyeNo(baseInput({ profile: 'TEMELFATURA', type: 'SATIS', lines: [line()] }));
      expect(errs).toHaveLength(0);
    });

    it('profil verilmemiş → hata yok', () => {
      const errs = validateHksKunyeNo(baseInput({ profile: undefined, type: undefined, lines: [line()] }));
      expect(errs).toHaveLength(0);
    });

    it('HKSIRSALIYE (irsaliye profili) bu validator kapsamında değil', () => {
      const errs = validateHksKunyeNo(baseInput({ profile: 'HKSIRSALIYE', lines: [line()] }));
      expect(errs).toHaveLength(0);
    });
  });

  describe('Çok kalemli belge — hangi kalem olduğu bildirilmeli', () => {
    it('2. ve 4. kalem eksik → yalnız o iki kalem raporlanır', () => {
      const withKunye = line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: VALID_KUNYENO }] });
      const errs = validateHksKunyeNo(baseInput({
        lines: [withKunye, line({ name: 'Biber' }), withKunye, line({ name: 'Salatalık' })],
      }));
      expect(errs).toHaveLength(2);
      expect(errs.map(e => e.path)).toEqual([
        'lines[1].additionalItemIdentifications',
        'lines[3].additionalItemIdentifications',
      ]);
      // Mesaj kullanıcıya hangi kalem olduğunu söylemeli
      expect(errs[0].message).toContain('Biber');
      expect(errs[1].message).toContain('Salatalık');
    });
  });
});

describe('InvoiceSession köprüsü — HKS KUNYENO validate() pipeline\'ında', () => {
  function hksSession(lines: SimpleLineInput[]): InvoiceSession {
    return new InvoiceSession({ initialInput: baseInput({ lines }) });
  }

  it('KUNYENO eksik → session.validate() error döner (4.1.2\'de SESSİZDİ)', () => {
    const warnings = hksSession([line()]).validate();
    const kunye = warnings.filter(w => w.message.includes('KUNYENO'));
    expect(kunye).toHaveLength(1);
    expect(kunye[0].severity).toBe('error');
    expect(kunye[0].code).toBe('PROFILE_REQUIREMENT');
  });

  it('19 karakterli KUNYENO → KUNYENO uyarısı yok', () => {
    const warnings = hksSession([
      line({ additionalItemIdentifications: [{ schemeId: 'KUNYENO', value: VALID_KUNYENO }] }),
    ]).validate();
    expect(warnings.filter(w => w.message.includes('KUNYENO'))).toHaveLength(0);
  });
});
