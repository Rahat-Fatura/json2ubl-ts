/**
 * hks-owner-validator — HKS mal sahibi (MALSAHIBI*) alanları, UYARI seviyesi.
 *
 * 🔴 Bu kuralın GİB'de yazılı karşılığı YOK — gözlemdir. Şematronda MALSAHIBI*
 * geçen tek bir assert bulunmuyor; VKN/TCKN uzunluk kuralları yalnız
 * `PartyIdentification`'a bakar. Bu yüzden testler ÜRETİMİ ENGELLEMEDİĞİNİ de
 * ölçer: severity 'warning' olmalı ve belge kurulabilmelidir.
 */

import { describe, it, expect } from 'vitest';
import { validateHksOwnerFields } from '../../src/validators/hks-owner-validator';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

const VALID_KUNYENO = 'KUN-2026-042-DOM001';

function line(ids: Array<{ schemeId: string; value: string }>): SimpleLineInput {
  return {
    name: 'Domates', quantity: 100, price: 10, unitCode: 'KGM', kdvPercent: 10,
    additionalItemIdentifications: ids,
  };
}

/** Künye HER ZAMAN dolu — burada ölçülen mal sahibi alanları, künye değil. */
function ownerLine(owner: Array<{ schemeId: string; value: string }>): SimpleLineInput {
  return line([{ schemeId: 'KUNYENO', value: VALID_KUNYENO }, ...owner]);
}

function baseInput(overrides: Partial<SimpleInvoiceInput> = {}): SimpleInvoiceInput {
  return {
    id: 'MTX2026000000063',
    uuid: 'e1a2b3c4-0000-4000-8000-000000000001',
    datetime: '2026-04-24T10:00:00',
    profile: 'HKS',
    type: 'SATIS',
    currencyCode: 'TRY',
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    customer: { taxNumber: '9876543210', name: 'X', taxOffice: 'Y', address: 'A', district: 'B', city: 'C' },
    lines: [ownerLine([
      { schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Ahmet Yılmaz' },
      { schemeId: 'MALSAHIBIVKNTCKN', value: '12345678901' },
    ])],
    ...overrides,
  };
}

describe('hks-owner-validator — MALSAHIBI* alan tutarlılığı', () => {
  describe('Birlikte bulunma şartı', () => {
    it('ad + VKN/TCKN birlikte → uyarı yok', () => {
      expect(validateHksOwnerFields(baseInput())).toHaveLength(0);
    });

    it('ikisi de yok → uyarı yok (alanlar zorunlu değil)', () => {
      const warns = validateHksOwnerFields(baseInput({ lines: [ownerLine([])] }));
      expect(warns).toHaveLength(0);
    });

    it('yalnız ad var → UYARI', () => {
      const warns = validateHksOwnerFields(baseInput({
        lines: [ownerLine([{ schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Ahmet Yılmaz' }])],
      }));
      expect(warns).toHaveLength(1);
      expect(warns[0].severity).toBe('warning');
      expect(warns[0].message).toContain('MALSAHIBIVKNTCKN');
      expect(warns[0].field).toBe('lines[0].additionalItemIdentifications');
    });

    it('yalnız VKN/TCKN var → UYARI', () => {
      const warns = validateHksOwnerFields(baseInput({
        lines: [ownerLine([{ schemeId: 'MALSAHIBIVKNTCKN', value: '12345678901' }])],
      }));
      expect(warns).toHaveLength(1);
      expect(warns[0].severity).toBe('warning');
      expect(warns[0].message).toContain('MALSAHIBIADSOYADUNVAN');
    });
  });

  describe('VKN/TCKN hane kontrolü (10 veya 11, yalnız rakam)', () => {
    function withTaxId(value: string) {
      return validateHksOwnerFields(baseInput({
        lines: [ownerLine([
          { schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Yılmaz Tarım Ltd.' },
          { schemeId: 'MALSAHIBIVKNTCKN', value },
        ])],
      }));
    }

    it('10 hane (VKN) → uyarı yok', () => {
      expect(withTaxId('1234567890')).toHaveLength(0);
    });

    it('11 hane (TCKN) → uyarı yok', () => {
      expect(withTaxId('12345678901')).toHaveLength(0);
    });

    it('9 hane → UYARI', () => {
      const warns = withTaxId('123456789');
      expect(warns).toHaveLength(1);
      expect(warns[0].severity).toBe('warning');
      expect(warns[0].field).toBe('lines[0].additionalItemIdentifications.MALSAHIBIVKNTCKN');
    });

    it('12 hane → UYARI', () => {
      expect(withTaxId('123456789012')).toHaveLength(1);
    });

    it('harf içeren → UYARI', () => {
      expect(withTaxId('1234567A90')).toHaveLength(1);
    });
  });

  /**
   * KAPSAM — iki düzlem, komisyoncu HARİÇ.
   * Komisyoncuda mal sahibi ilişkisi faturanın TARAFLARIYLA kurulur, kalem
   * kimliğiyle değil; orada kural koşarsa yanlış uyarı üretir.
   */
  describe('Kapsam', () => {
    const orphanOwner = [ownerLine([{ schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Ahmet Yılmaz' }])];

    it('HKS + SATIS → kapsamda', () => {
      expect(validateHksOwnerFields(baseInput({ lines: orphanOwner }))).toHaveLength(1);
    });

    it('HKS + TEVKIFAT → kapsamda', () => {
      expect(validateHksOwnerFields(baseInput({ type: 'TEVKIFAT', lines: orphanOwner }))).toHaveLength(1);
    });

    it('HKS + KOMISYONCU → KAPSAM DIŞI', () => {
      expect(validateHksOwnerFields(baseInput({ type: 'KOMISYONCU', lines: orphanOwner }))).toHaveLength(0);
    });

    it('EARSIVFATURA + HKSSATIS → kapsamda (e-Arşiv düzlemi)', () => {
      const input = baseInput({ profile: 'EARSIVFATURA', type: 'HKSSATIS', lines: orphanOwner });
      expect(validateHksOwnerFields(input)).toHaveLength(1);
    });

    it('EARSIVFATURA + HKSKOMISYONCU → KAPSAM DIŞI', () => {
      const input = baseInput({ profile: 'EARSIVFATURA', type: 'HKSKOMISYONCU', lines: orphanOwner });
      expect(validateHksOwnerFields(input)).toHaveLength(0);
    });

    it('EARSIVFATURA + SATIS (HKS değil) → KAPSAM DIŞI', () => {
      const input = baseInput({ profile: 'EARSIVFATURA', type: 'SATIS', lines: orphanOwner });
      expect(validateHksOwnerFields(input)).toHaveLength(0);
    });

    it('TEMELFATURA + SATIS → KAPSAM DIŞI', () => {
      const input = baseInput({ profile: 'TEMELFATURA', type: 'SATIS', lines: orphanOwner });
      expect(validateHksOwnerFields(input)).toHaveLength(0);
    });
  });

  describe('Çok kalemli belge', () => {
    it('yalnız kusurlu satır raporlanır ve satır numarası verilir', () => {
      const warns = validateHksOwnerFields(baseInput({
        lines: [
          ownerLine([
            { schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Ahmet Yılmaz' },
            { schemeId: 'MALSAHIBIVKNTCKN', value: '12345678901' },
          ]),
          ownerLine([{ schemeId: 'MALSAHIBIVKNTCKN', value: '123' }]),
        ],
      }));
      // 2. satır: hem "ad yok" hem "hane hatalı"
      expect(warns).toHaveLength(2);
      expect(warns.every(w => w.field.startsWith('lines[1]'))).toBe(true);
      expect(warns[0].message).toContain('Satır 2');
    });
  });
});

describe('InvoiceSession köprüsü — mal sahibi uyarıları UYARI kalır', () => {
  it('session.validate() uyarıyı yayar ama severity error DEĞİL', () => {
    const session = new InvoiceSession({
      initialInput: baseInput({
        lines: [ownerLine([{ schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Ahmet Yılmaz' }])],
      }),
    });
    const all = session.validate();
    const owner = all.filter(w => w.message.includes('mal sahibi'));
    expect(owner).toHaveLength(1);
    expect(owner[0].severity).toBe('warning');
  });

  /* 🔴 EN ÖNEMLİ ÖLÇÜM: uyarı belgeyi BLOKE ETMEZ. Kural yazılı GİB kuralı
   * olmadığı için hata yapılsaydı, GİB'in kabul ettiği belgeler üretilemezdi. */
  it('eksik mal sahibi bilgisi belge kurulumunu ENGELLEMEZ', () => {
    const session = new InvoiceSession({
      initialInput: baseInput({
        lines: [ownerLine([{ schemeId: 'MALSAHIBIADSOYADUNVAN', value: 'Ahmet Yılmaz' }])],
      }),
    });
    expect(() => session.buildXml()).not.toThrow();
  });

  it('tam mal sahibi üçlüsü → mal sahibi uyarısı yok', () => {
    const session = new InvoiceSession({ initialInput: baseInput() });
    expect(session.validate().filter(w => w.message.includes('mal sahibi'))).toHaveLength(0);
  });
});
