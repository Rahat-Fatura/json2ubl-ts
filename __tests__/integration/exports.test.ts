/**
 * Public type re-export sanity testi (Sprint 8k.1 / Library Öneri #1).
 *
 * `SimpleSgkType` literal union `simple-types.ts`'te tanımlıdır fakat
 * v2.2.2'ye kadar ana paket entry'sinden public re-export edilmiyordu.
 * Mimsoft greenfield F4.3 (sgk-info-section) için cast'siz import
 * edilebilmeli. v2.2.3 ile re-export listesine eklendi.
 *
 * Diğer kritik public tipler de burada smoke-tested.
 */

import { describe, it, expect } from 'vitest';
import type { SimpleSgkType, SimpleSgkInput, SimplePartyIdentification } from '../../src';

describe('Public type re-exports (Sprint 8k.1)', () => {
  it('SimpleSgkType literal union is importable from main entry', () => {
    const valid: SimpleSgkType = 'SAGLIK_ECZ';
    expect(valid).toBe('SAGLIK_ECZ');
  });

  it('SimpleSgkType union covers all SGK type values', () => {
    const all: SimpleSgkType[] = [
      'SAGLIK_ECZ', 'SAGLIK_HAS', 'SAGLIK_OPT', 'SAGLIK_MED',
      'ABONELIK', 'MAL_HIZMET', 'DIGER',
    ];
    expect(all).toHaveLength(7);
  });

  it('SimpleSgkType assignable to SimpleSgkInput.type (structural compat)', () => {
    const t: SimpleSgkType = 'MAL_HIZMET';
    const sgk: SimpleSgkInput = {
      type: t,
      documentNo: 'D-001',
      companyName: 'X',
      companyCode: 'C',
    };
    expect(sgk.type).toBe('MAL_HIZMET');
  });

  it('SimplePartyIdentification still re-exported (backwards-compat smoke)', () => {
    const id: SimplePartyIdentification = { schemeId: 'MERSISNO', value: '0123' };
    expect(id.schemeId).toBe('MERSISNO');
  });
});
