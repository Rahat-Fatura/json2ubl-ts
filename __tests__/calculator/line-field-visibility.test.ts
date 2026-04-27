/**
 * LineFieldVisibility testleri (Sprint 8h.5 / AR-10).
 *
 * deriveLineFieldVisibility kuralları + InvoiceSession array senkron davranışı.
 */

import { describe, it, expect } from 'vitest';
import {
  deriveLineFieldVisibility,
  deriveTypeProfileFlags,
  type LineFieldVisibility,
} from '../../src/calculator/line-field-visibility';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import type { SimpleLineInput } from '../../src/calculator/simple-types';

const baseLine: SimpleLineInput = {
  name: 'Demo',
  quantity: 1,
  price: 100,
  kdvPercent: 18,
};

describe('deriveTypeProfileFlags (Sprint 8h.5)', () => {
  it('TEVKIFAT type detection', () => {
    const flags = deriveTypeProfileFlags('TEVKIFAT', 'TICARIFATURA');
    expect(flags.isTevkifat).toBe(true);
    expect(flags.isIstisna).toBe(false);
  });

  it('IADE family detection (IADE, YTBIADE, TEVKIFATIADE)', () => {
    expect(deriveTypeProfileFlags('IADE', 'TICARIFATURA').isIade).toBe(true);
    expect(deriveTypeProfileFlags('YTBIADE', 'YATIRIMTESVIK').isIade).toBe(true);
    expect(deriveTypeProfileFlags('TEVKIFATIADE', 'TICARIFATURA').isIade).toBe(true);
  });

  it('IHRACAT profile detection', () => {
    const flags = deriveTypeProfileFlags('ISTISNA', 'IHRACAT');
    expect(flags.isIhracat).toBe(true);
    expect(flags.isIstisna).toBe(true);
  });

  it('YATIRIMTESVIK profile detection', () => {
    expect(deriveTypeProfileFlags('SATIS', 'YATIRIMTESVIK').isYatirimTesvik).toBe(true);
    expect(deriveTypeProfileFlags('SATIS', 'TICARIFATURA').isYatirimTesvik).toBe(false);
  });
});

describe('deriveLineFieldVisibility kuralları', () => {
  it('showKdvExemptionCodeSelector: line.kdvPercent === 0 + non-self-exemption profile', () => {
    const v = deriveLineFieldVisibility({ ...baseLine, kdvPercent: 0 }, { type: 'SATIS', profile: 'TICARIFATURA' }, 0);
    expect(v.showKdvExemptionCodeSelector).toBe(true);
  });

  it('showKdvExemptionCodeSelector: false when YATIRIMTESVIK profile (doc-level fallback)', () => {
    const v = deriveLineFieldVisibility(
      { ...baseLine, kdvPercent: 0 },
      { type: 'YTBISTISNA', profile: 'YATIRIMTESVIK' },
      0,
    );
    expect(v.showKdvExemptionCodeSelector).toBe(false);
  });

  it('showKdvExemptionCodeSelector: false when kdvPercent > 0', () => {
    const v = deriveLineFieldVisibility({ ...baseLine, kdvPercent: 18 }, { type: 'SATIS', profile: 'TICARIFATURA' }, 0);
    expect(v.showKdvExemptionCodeSelector).toBe(false);
  });

  it('showWithholdingTaxSelector: type=TEVKIFAT', () => {
    const v = deriveLineFieldVisibility(baseLine, { type: 'TEVKIFAT', profile: 'TICARIFATURA' }, 0);
    expect(v.showWithholdingTaxSelector).toBe(true);
  });

  it('showWithholdingPercentInput: 650 dinamik kod ile birlikte', () => {
    const v = deriveLineFieldVisibility(
      { ...baseLine, withholdingTaxCode: '650' },
      { type: 'TEVKIFAT', profile: 'TICARIFATURA' },
      0,
    );
    expect(v.showWithholdingPercentInput).toBe(true);
  });

  it('showWithholdingPercentInput: false for sabit kod (601 vs 650)', () => {
    const v = deriveLineFieldVisibility(
      { ...baseLine, withholdingTaxCode: '601' },
      { type: 'TEVKIFAT', profile: 'TICARIFATURA' },
      0,
    );
    expect(v.showWithholdingPercentInput).toBe(false);
  });

  it('showCommodityClassification + showAlicidibsatirkod: IHRACKAYITLI + 702', () => {
    const v = deriveLineFieldVisibility(
      { ...baseLine, kdvExemptionCode: '702' },
      { type: 'IHRACKAYITLI', profile: 'TICARIFATURA' },
      0,
    );
    expect(v.showCommodityClassification).toBe(true);
    expect(v.showAlicidibsatirkod).toBe(true);
  });

  it('showCommodityClassification: false for IHRACKAYITLI without 702', () => {
    const v = deriveLineFieldVisibility(
      { ...baseLine, kdvExemptionCode: '701' },
      { type: 'IHRACKAYITLI', profile: 'TICARIFATURA' },
      0,
    );
    expect(v.showCommodityClassification).toBe(false);
  });

  it('showLineDelivery: IHRACAT profile', () => {
    const v = deriveLineFieldVisibility(baseLine, { type: 'ISTISNA', profile: 'IHRACAT' }, 0);
    expect(v.showLineDelivery).toBe(true);
  });

  it('showItemClassificationCode: YATIRIMTESVIK profile', () => {
    const v = deriveLineFieldVisibility(baseLine, { type: 'SATIS', profile: 'YATIRIMTESVIK' }, 0);
    expect(v.showItemClassificationCode).toBe(true);
  });

  it('showProductTraceId + showSerialId: YATIRIMTESVIK + itemClassificationCode=01', () => {
    const v = deriveLineFieldVisibility(
      { ...baseLine, itemClassificationCode: '01' },
      { type: 'SATIS', profile: 'YATIRIMTESVIK' },
      0,
    );
    expect(v.showProductTraceId).toBe(true);
    expect(v.showSerialId).toBe(true);
  });

  it('showProductTraceId: false for itemClassificationCode=02 (yazılım)', () => {
    const v = deriveLineFieldVisibility(
      { ...baseLine, itemClassificationCode: '02' },
      { type: 'SATIS', profile: 'YATIRIMTESVIK' },
      0,
    );
    expect(v.showProductTraceId).toBe(false);
  });

  it('showAdditionalItemIdentifications: TEKNOLOJIDESTEK type', () => {
    const v = deriveLineFieldVisibility(baseLine, { type: 'TEKNOLOJIDESTEK', profile: 'EARSIVFATURA' }, 0);
    expect(v.showAdditionalItemIdentifications).toBe(true);
  });
});

describe('InvoiceSession lineFields array senkron (Sprint 8h.5)', () => {
  it('constructor başlangıçta lineFields boş array (lines yok)', () => {
    const session = new InvoiceSession();
    expect(session.uiState.lineFields).toEqual([]);
  });

  it('addLine sonrası lineFields uzar', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT' } });
    session.addLine({ ...baseLine, withholdingTaxCode: '650', withholdingTaxPercent: 10 });
    expect(session.uiState.lineFields).toHaveLength(1);
    expect(session.uiState.lineFields[0].showWithholdingPercentInput).toBe(true);
  });

  it('removeLine sonrası lineFields kısalır', () => {
    const session = new InvoiceSession();
    session.addLine(baseLine);
    session.addLine(baseLine);
    expect(session.uiState.lineFields).toHaveLength(2);
    session.removeLine(0);
    expect(session.uiState.lineFields).toHaveLength(1);
  });

  it('updateLine sonrası lineFields[i] re-derive', () => {
    const session = new InvoiceSession({ initialInput: { type: 'TEVKIFAT' }, autoCalculate: false });
    session.addLine({ ...baseLine, withholdingTaxCode: '601' });
    expect(session.uiState.lineFields[0].showWithholdingPercentInput).toBe(false);
    session.updateLine(0, { withholdingTaxCode: '650' });
    // autoCalculate=false → calculate çağrılmaz, lineFields visibility kuralı yine de değişir
    expect(session.uiState.lineFields[0].showWithholdingPercentInput).toBe(true);
  });

  it('setLines sonrası lineFields tamamen yeniden derive', () => {
    const session = new InvoiceSession({ initialInput: { type: 'IHRACKAYITLI' } });
    session.setLines([
      { ...baseLine, kdvExemptionCode: '702' },
      { ...baseLine, kdvExemptionCode: '701' },
    ]);
    expect(session.uiState.lineFields).toHaveLength(2);
    expect(session.uiState.lineFields[0].showCommodityClassification).toBe(true);
    expect(session.uiState.lineFields[1].showCommodityClassification).toBe(false);
  });

  it('update(SessionPaths.lineKdvPercent(0), 0) → lineFields[0] re-derive (kdvExemptionCode dropdown aktif)', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS', profile: 'TICARIFATURA' } });
    session.addLine({ ...baseLine, kdvPercent: 18 });
    expect(session.uiState.lineFields[0].showKdvExemptionCodeSelector).toBe(false);
    session.update(SessionPaths.lineKdvPercent(0), 0);
    expect(session.uiState.lineFields[0].showKdvExemptionCodeSelector).toBe(true);
  });

  it('update(SessionPaths.lineKdvExemptionCode(0), 702) IHRACKAYITLI → showCommodityClassification true', () => {
    const session = new InvoiceSession({ initialInput: { type: 'IHRACKAYITLI' } });
    session.addLine({ ...baseLine, kdvExemptionCode: '701' });
    expect(session.uiState.lineFields[0].showCommodityClassification).toBe(false);
    session.update(SessionPaths.lineKdvExemptionCode(0), '702');
    expect(session.uiState.lineFields[0].showCommodityClassification).toBe(true);
  });

  it('doc-level type değişimi → tüm lineFields re-derive', () => {
    const session = new InvoiceSession({ initialInput: { type: 'SATIS' } });
    session.addLine(baseLine);
    session.addLine(baseLine);
    expect(session.uiState.lineFields[0].showWithholdingTaxSelector).toBe(false);

    session.update(SessionPaths.type, 'TEVKIFAT');

    expect(session.uiState.lineFields).toHaveLength(2);
    expect(session.uiState.lineFields[0].showWithholdingTaxSelector).toBe(true);
    expect(session.uiState.lineFields[1].showWithholdingTaxSelector).toBe(true);
  });

  it('doc-level liability değişimi → tüm lineFields re-derive (auto-resolve sonrası)', () => {
    const session = new InvoiceSession({
      initialInput: { profile: 'TICARIFATURA', type: 'SATIS' },
    });
    session.addLine({ ...baseLine, kdvPercent: 0 });
    expect(session.uiState.lineFields[0].showKdvExemptionCodeSelector).toBe(true);
    session.update(SessionPaths.liability, 'earchive');     // → profile EARSIVFATURA auto-resolve
    expect(session.uiState.lineFields).toHaveLength(1);
    // EARSIVFATURA self-exemption profili değil → showKdvExemptionCodeSelector hâlâ true
    expect(session.uiState.lineFields[0].showKdvExemptionCodeSelector).toBe(true);
  });
});

describe('LineFieldVisibility doc-level vs line-level kombinasyon', () => {
  it('aynı line + farklı type kombinasyonları farklı visibility', () => {
    const line: SimpleLineInput = { ...baseLine, kdvPercent: 0 };

    const v1 = deriveLineFieldVisibility(line, { type: 'SATIS', profile: 'TICARIFATURA' }, 0);
    const v2 = deriveLineFieldVisibility(line, { type: 'OZELMATRAH', profile: 'TICARIFATURA' }, 0);
    const v3 = deriveLineFieldVisibility(line, { type: 'YTBISTISNA', profile: 'YATIRIMTESVIK' }, 0);

    expect(v1.showKdvExemptionCodeSelector).toBe(true);
    expect(v2.showKdvExemptionCodeSelector).toBe(false);    // OZELMATRAH self-exemption
    expect(v3.showKdvExemptionCodeSelector).toBe(false);    // YATIRIMTESVIK doc fallback
  });

  it('LineFieldVisibility tipi 10 alan içerir', () => {
    const v = deriveLineFieldVisibility(baseLine, { type: 'SATIS', profile: 'TICARIFATURA' }, 0);
    const keys = Object.keys(v) as (keyof LineFieldVisibility)[];
    expect(keys).toHaveLength(10);
    expect(keys).toContain('showKdvExemptionCodeSelector');
    expect(keys).toContain('showWithholdingTaxSelector');
    expect(keys).toContain('showProductTraceId');
  });
});
