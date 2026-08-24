import { describe, it, expect } from 'vitest';
import { serializePeriod } from '../../src/serializers/common-serializer';
import { serializeAdditionalDocument } from '../../src/serializers/reference-serializer';
import { PERIOD_SEQ } from '../../src/serializers/xsd-sequence';

/**
 * Sprint 9 adım 7 — SARJ kurallarının ön koşulu olan iki alan.
 *
 * - `PeriodInput.startTime` / `endTime` → `EnerjiInvoicePeriodCheck`
 * - `AdditionalDocumentInput.schemeId` → `EnerjiESURaporIDCheck` (ESURaporID)
 *
 * Her ikisi de OPSİYONEL: doldurulmadığında çıktı v3.0.0 ile birebir aynı kalır.
 */

describe('Sprint 9 — InvoicePeriod saat alanları', () => {
  it('PERIOD_SEQ StartDate < StartTime < EndDate < EndTime sırasını taşıyor', () => {
    const idx = (t: string) => PERIOD_SEQ.indexOf(t as never);
    expect(idx('StartDate')).toBeLessThan(idx('StartTime'));
    expect(idx('StartTime')).toBeLessThan(idx('EndDate'));
    expect(idx('EndDate')).toBeLessThan(idx('EndTime'));
  });

  it('dört alan da XSD sırasında emit ediliyor', () => {
    const xml = serializePeriod({
      startDate: '2026-04-01',
      startTime: '00:00:00',
      endDate: '2026-04-30',
      endTime: '23:59:59',
    });
    expect(xml).toContain('<cbc:StartDate>2026-04-01</cbc:StartDate>');
    expect(xml).toContain('<cbc:StartTime>00:00:00</cbc:StartTime>');
    expect(xml).toContain('<cbc:EndDate>2026-04-30</cbc:EndDate>');
    expect(xml).toContain('<cbc:EndTime>23:59:59</cbc:EndTime>');

    const order = ['StartDate', 'StartTime', 'EndDate', 'EndTime'].map(t => xml.indexOf(`<cbc:${t}>`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('saat verilmezse çıktı değişmiyor (geriye dönük uyum)', () => {
    const xml = serializePeriod({ startDate: '2026-04-01', endDate: '2026-04-30' });
    expect(xml).not.toContain('StartTime');
    expect(xml).not.toContain('EndTime');
  });

  it('yalnız saat verilirse de emit ediliyor', () => {
    const xml = serializePeriod({ startTime: '08:00:00' });
    expect(xml).toContain('<cbc:StartTime>08:00:00</cbc:StartTime>');
  });
});

describe('Sprint 9 — AdditionalDocumentReference schemeID', () => {
  it('schemeId verilirse ID üzerinde schemeID attribute çıkıyor', () => {
    const xml = serializeAdditionalDocument({
      id: 'a1b2c3d4-e5f6-4789-8abc-def012345678',
      schemeId: 'ESURaporID',
      issueDate: '2026-04-30',
    });
    expect(xml).toContain(
      '<cbc:ID schemeID="ESURaporID">a1b2c3d4-e5f6-4789-8abc-def012345678</cbc:ID>',
    );
    expect(xml).toContain('<cbc:IssueDate>2026-04-30</cbc:IssueDate>');
  });

  it('schemeId verilmezse attribute yok (geriye dönük uyum)', () => {
    const xml = serializeAdditionalDocument({ id: 'DOC-1', issueDate: '2026-01-01' });
    expect(xml).toContain('<cbc:ID>DOC-1</cbc:ID>');
    expect(xml).not.toContain('schemeID');
  });

  it('boş string schemeId attribute üretmiyor', () => {
    const xml = serializeAdditionalDocument({ id: 'DOC-1', schemeId: '' });
    expect(xml).not.toContain('schemeID');
  });
});
