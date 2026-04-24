/**
 * M11 — Self-exemption types config testi.
 * Sprint 8c.3.
 */

import { describe, it, expect } from 'vitest';
import {
  SELF_EXEMPTION_INVOICE_TYPES,
  SELF_EXEMPTION_INVOICE_PROFILES,
  isSelfExemptionInvoice,
} from '../../src/config/self-exemption-types';

describe('M11 Self-Exemption Types', () => {
  describe('SELF_EXEMPTION_INVOICE_TYPES', () => {
    it('self-exemption tipleri içerir', () => {
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('ISTISNA')).toBe(true);
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('YTBISTISNA')).toBe(true);
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('IHRACKAYITLI')).toBe(true);
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('OZELMATRAH')).toBe(true);
    });

    it('non-self-exemption tiplerini içermez', () => {
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('SATIS')).toBe(false);
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('TEVKIFAT')).toBe(false);
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('IADE')).toBe(false);
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('SGK')).toBe(false);
      expect(SELF_EXEMPTION_INVOICE_TYPES.has('KOMISYONCU')).toBe(false);
    });
  });

  describe('SELF_EXEMPTION_INVOICE_PROFILES', () => {
    it('self-exemption profilleri içerir', () => {
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('IHRACAT')).toBe(true);
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('YOLCUBERABERFATURA')).toBe(true);
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('OZELFATURA')).toBe(true);
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('YATIRIMTESVIK')).toBe(true);
    });

    it('non-self-exemption profilleri içermez', () => {
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('TEMELFATURA')).toBe(false);
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('TICARIFATURA')).toBe(false);
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('KAMU')).toBe(false);
      expect(SELF_EXEMPTION_INVOICE_PROFILES.has('EARSIVFATURA')).toBe(false);
    });
  });

  describe('isSelfExemptionInvoice()', () => {
    it('self-exemption tip → true', () => {
      expect(isSelfExemptionInvoice('ISTISNA', 'TEMELFATURA')).toBe(true);
      expect(isSelfExemptionInvoice('IHRACKAYITLI', 'TICARIFATURA')).toBe(true);
      expect(isSelfExemptionInvoice('OZELMATRAH', 'KAMU')).toBe(true);
    });

    it('self-exemption profil → true', () => {
      expect(isSelfExemptionInvoice('ISTISNA', 'IHRACAT')).toBe(true);
      expect(isSelfExemptionInvoice('ISTISNA', 'YOLCUBERABERFATURA')).toBe(true);
      expect(isSelfExemptionInvoice('SATIS', 'YATIRIMTESVIK')).toBe(true);
    });

    it('non-self-exemption tip + profil → false (manuel 351 zorunlu)', () => {
      expect(isSelfExemptionInvoice('SATIS', 'TEMELFATURA')).toBe(false);
      expect(isSelfExemptionInvoice('TEVKIFAT', 'TICARIFATURA')).toBe(false);
      expect(isSelfExemptionInvoice('SGK', 'TEMELFATURA')).toBe(false);
      expect(isSelfExemptionInvoice('KOMISYONCU', 'EARSIVFATURA')).toBe(false);
    });

    it('boş string input → false (defensive)', () => {
      expect(isSelfExemptionInvoice('', '')).toBe(false);
      expect(isSelfExemptionInvoice('UNKNOWN_TYPE', 'UNKNOWN_PROFILE')).toBe(false);
    });
  });
});
