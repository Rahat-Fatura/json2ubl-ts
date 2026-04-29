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
import { PARTY_IDENTIFICATION_SCHEME_IDS } from '../../src';
import type {
  SimpleSgkType,
  SimpleSgkInput,
  SimplePartyIdentification,
  Suggestion,
  SuggestionRule,
  SuggestionSeverity,
  PathErrorPayload,
  PathErrorCode,
  LineFieldVisibility,
  PartyIdentificationSchemeId,
} from '../../src';

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

describe('Public type re-exports (Sprint 8l.1 / v2.2.4 — Library Öneri #5)', () => {
  it('Suggestion + SuggestionSeverity importable as named types', () => {
    const sev: SuggestionSeverity = 'recommended';
    const s: Suggestion = {
      ruleId: 'kdv/zero-suggest-351',
      path: 'lines[0].kdvExemptionCode',
      value: '351',
      reason: '351 KDV istisna kodu uygundur.',
      severity: sev,
    };
    expect(s.severity).toBe('recommended');
    expect(s.ruleId).toBe('kdv/zero-suggest-351');
  });

  it('SuggestionSeverity covers both recommended and optional', () => {
    const all: SuggestionSeverity[] = ['recommended', 'optional'];
    expect(all).toHaveLength(2);
  });

  it('SuggestionRule importable (T-6 deklaratif kural tipi)', () => {
    const rule: SuggestionRule = {
      id: 'test/example',
      applies: () => true,
      produce: () => [],
    };
    expect(rule.id).toBe('test/example');
    expect(rule.applies({} as never, {} as never)).toBe(true);
  });

  it('PathErrorPayload + PathErrorCode importable', () => {
    const code: PathErrorCode = 'UNKNOWN_PATH';
    const payload: PathErrorPayload = {
      code,
      path: 'foo.bar',
      reason: 'Unknown',
      requestedValue: 42,
    };
    expect(payload.code).toBe('UNKNOWN_PATH');
  });

  it('PathErrorCode covers all 7 known codes', () => {
    const all: PathErrorCode[] = [
      'INVALID_PATH',
      'READ_ONLY_PATH',
      'UNKNOWN_PATH',
      'INDEX_OUT_OF_BOUNDS',
      'PROFILE_EXPORT_MISMATCH',
      'PROFILE_LIABILITY_MISMATCH',
      'LIABILITY_LOCKED_BY_EXPORT',
    ];
    expect(all).toHaveLength(7);
  });

  it('LineFieldVisibility importable + boolean field shape', () => {
    const lfv: LineFieldVisibility = {
      showKdvExemptionCodeSelector: false,
      showWithholdingTaxSelector: false,
      showWithholdingPercentInput: false,
      showLineDelivery: false,
      showCommodityClassification: false,
      showAlicidibsatirkod: false,
      showAdditionalItemIdentifications: false,
      showItemClassificationCode: false,
      showProductTraceId: false,
      showSerialId: false,
    };
    expect(typeof lfv.showKdvExemptionCodeSelector).toBe('boolean');
    expect(typeof lfv.showWithholdingTaxSelector).toBe('boolean');
  });
});

describe('Public type re-exports (Sprint 8m.1 / v2.2.5 — Library Öneri #7)', () => {
  it('PartyIdentificationSchemeId literal union covers all 27 UBL scheme codes (VKN/TCKN hariç)', () => {
    const all: PartyIdentificationSchemeId[] = [
      'HIZMETNO', 'MUSTERINO', 'TESISATNO', 'TELEFONNO',
      'DISTRIBUTORNO', 'TICARETSICILNO', 'TAPDKNO', 'BAYINO', 'ABONENO',
      'SAYACNO', 'EPDKNO', 'SUBENO', 'PASAPORTNO', 'ARACIKURUMETIKET',
      'ARACIKURUMVKN', 'CIFTCINO', 'IMALATCINO', 'DOSYANO', 'HASTANO',
      'MERSISNO', 'URETICINO', 'GTB_REFNO', 'GTB_GCB_TESCILNO',
      'GTB_FIILI_IHRACAT_TARIHI', 'ARACKIMLIKNO', 'PLAKA', 'SEVKIYATNO',
    ];
    expect(all).toHaveLength(27);
    // Tüm narrow tipler runtime set'te de bulunmalı
    for (const code of all) {
      expect(PARTY_IDENTIFICATION_SCHEME_IDS.has(code)).toBe(true);
    }
  });

  it('Record<PartyIdentificationSchemeId, string> narrow map kullanım örneği (Mimsoft pattern)', () => {
    const labels: Record<PartyIdentificationSchemeId, string> = {
      HIZMETNO: 'Hizmet No',
      MUSTERINO: 'Müşteri No',
      TESISATNO: 'Tesisat No',
      TELEFONNO: 'Telefon No',
      DISTRIBUTORNO: 'Distribütör No',
      TICARETSICILNO: 'Ticaret Sicil No',
      TAPDKNO: 'TAPDK No',
      BAYINO: 'Bayi No',
      ABONENO: 'Abone No',
      SAYACNO: 'Sayaç No',
      EPDKNO: 'EPDK No',
      SUBENO: 'Şube No',
      PASAPORTNO: 'Pasaport No',
      ARACIKURUMETIKET: 'Aracı Kurum Etiket',
      ARACIKURUMVKN: 'Aracı Kurum VKN',
      CIFTCINO: 'Çiftçi No',
      IMALATCINO: 'İmalatçı No',
      DOSYANO: 'Dosya No',
      HASTANO: 'Hasta No',
      MERSISNO: 'MERSİS No',
      URETICINO: 'Üretici No',
      GTB_REFNO: 'GTB Referans No',
      GTB_GCB_TESCILNO: 'GTB GCB Tescil No',
      GTB_FIILI_IHRACAT_TARIHI: 'GTB Fiili İhracat Tarihi',
      ARACKIMLIKNO: 'Araç Kimlik No',
      PLAKA: 'Plaka',
      SEVKIYATNO: 'Sevkiyat No',
    };
    expect(labels.MERSISNO).toBe('MERSİS No');
    expect(Object.keys(labels)).toHaveLength(27);
  });

  it('runtime set VKN/TCKN dahil 29 entry — despatch validator uyumu korunur', () => {
    expect(PARTY_IDENTIFICATION_SCHEME_IDS.has('TCKN')).toBe(true);
    expect(PARTY_IDENTIFICATION_SCHEME_IDS.has('VKN')).toBe(true);
    expect(PARTY_IDENTIFICATION_SCHEME_IDS.size).toBe(29);
  });
});
