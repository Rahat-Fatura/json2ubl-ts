import { describe, it, expect } from 'vitest';
import { PROFILE_TYPE_MATRIX } from '../../src/config/constants';
import {
  getAllowedProfilesForType,
  resolveProfileForType,
} from '../../src/calculator/invoice-rules';
import { validateCrossMatrix } from '../../src/validators/cross-validators';
import { InvoiceProfileId, InvoiceTypeCode } from '../../src/types/enums';
import type { InvoiceInput } from '../../src/types/invoice-input';

/**
 * Sprint 9 — IADEInvioceCheck (Schematron 20260701, History.txt md.17).
 *
 * İzinli profil listesine KAMU eklendi:
 * "Fatura tipi IADE iken fatura profili sadece TEMELFATURA, EARSIVFATURA,
 *  ILAC_TIBBICIHAZ, YATIRIMTESVIK, IDIS veya KAMU olabilir"
 */

/** Schematron IADEInvioceCheck'in izinli profil listesi (20260701) */
const SCHEMATRON_IADE_PROFILES = [
  InvoiceProfileId.TEMELFATURA,
  InvoiceProfileId.EARSIVFATURA,
  InvoiceProfileId.ILAC_TIBBICIHAZ,
  InvoiceProfileId.YATIRIMTESVIK,
  InvoiceProfileId.IDIS,
  InvoiceProfileId.KAMU,
];

describe('Sprint 9 — IADE izinli profil listesi Schematron ile birebir', () => {
  it('KAMU profili IADE tipini kabul ediyor', () => {
    expect(PROFILE_TYPE_MATRIX[InvoiceProfileId.KAMU].has(InvoiceTypeCode.IADE)).toBe(true);
  });

  for (const profile of SCHEMATRON_IADE_PROFILES) {
    it(`${profile} IADE'ye izinli`, () => {
      expect(PROFILE_TYPE_MATRIX[profile].has(InvoiceTypeCode.IADE)).toBe(true);
    });
  }

  it('matris IADE izinli profil kümesi Schematron listesinden fazlasını içermiyor', () => {
    const actual = Object.entries(PROFILE_TYPE_MATRIX)
      .filter(([, types]) => types.has(InvoiceTypeCode.IADE))
      .map(([profile]) => profile)
      .sort();
    expect(actual).toEqual([...SCHEMATRON_IADE_PROFILES].sort());
  });
});

describe('Sprint 9 — IADE profil türetmeleri', () => {
  it('getAllowedProfilesForType(IADE) KAMU içeriyor', () => {
    expect(getAllowedProfilesForType('IADE')).toContain('KAMU');
  });

  it('kullanıcı KAMU seçtiyse IADE tipinde KAMU korunur (override ezilmiyor)', () => {
    expect(resolveProfileForType('KAMU', 'IADE')).toBe('KAMU');
  });

  it('profil seçilmemişse IADE varsayılanı TEMELFATURA kalıyor', () => {
    expect(resolveProfileForType(undefined, 'IADE')).toBe('TEMELFATURA');
  });

  it('kullanıcı TICARIFATURA seçtiyse IADE tipinde TEMELFATURA fallback (izinli değil)', () => {
    expect(resolveProfileForType('TICARIFATURA', 'IADE')).toBe('TEMELFATURA');
  });
});

describe('Sprint 9 — KAMU + IADE cross-matrix', () => {
  function makeInput(profile: InvoiceProfileId, type: InvoiceTypeCode): InvoiceInput {
    return {
      id: 'ABC202600000001',
      uuid: '11111111-2222-3333-4444-555555555555',
      profileId: profile,
      invoiceTypeCode: type,
      issueDate: '2026-01-01',
      currencyCode: 'TRY',
      supplier: {} as any,
      customer: {} as any,
      taxTotals: [],
      lines: [],
    } as any;
  }

  it('KAMU + IADE → PROFILE_TYPE_MISMATCH yok', () => {
    const errors = validateCrossMatrix(makeInput(InvoiceProfileId.KAMU, InvoiceTypeCode.IADE));
    expect(errors.filter(e => e.path === 'invoiceTypeCode' || e.path === 'profileId')).toEqual([]);
  });

  it('TICARIFATURA + IADE → hâlâ reddediliyor (Schematron listesinde yok)', () => {
    const errors = validateCrossMatrix(
      makeInput(InvoiceProfileId.TICARIFATURA, InvoiceTypeCode.IADE),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
