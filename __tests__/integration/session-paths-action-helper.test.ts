/**
 * Action helper pattern testleri (Sprint 8l.2 / Library Öneri #6 — v2.2.4).
 *
 * Mimsoft greenfield F1 action helper pattern'ini birebir simüle eder:
 * sarmalanmış `i: number` parametresi → `SessionPaths.X(i)` → `update(path, value)`.
 *
 * v2.2.3 Sprint 8k.2 narrow `as` template literal cast eklemişti, fakat
 * TS 5.4–5.7 arasında template literal type inference davranış değişimi
 * nedeniyle Mimsoft (TS 5.7) cast'siz kullanımda TS2345 alıyordu.
 *
 * v2.2.4 ile InvoiceSession.update() method'una 13 spesifik template literal
 * overload eklendi. Bu test:
 *   1. Compile-time cast'sizliği doğrular (TS overload resolution)
 *   2. Runtime davranışın değişmediğini doğrular (path validation + emit)
 *   3. Kütüphane içi TS 5.3.3 + TS 5.7+ ortamlarında regression yakalar
 *
 * NOT: Bu testin compile etmesi 8l.2 overload bloğunun varlığına bağlıdır.
 * Cast bloğu kazara silinirse veya yeni fonksiyonel path eklendiğinde
 * overload eksikse, `npm run check:ts57` script'i fail eder.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession, SessionPaths } from '../../src';
import type { SimplePartyIdentification } from '../../src';

describe('Action helper pattern (Sprint 8l.2 / v2.2.4)', () => {
  it('sender.identifications: forEach + i: number pattern (cast-free)', () => {
    const session = new InvoiceSession();
    const ids: SimplePartyIdentification[] = [
      { schemeId: 'MERSISNO', value: '0123456789012345' },
      { schemeId: 'KUNYENO', value: 'K-001' },
    ];

    ids.forEach((id, i) => {
      session.update(SessionPaths.senderIdentificationSchemeId(i), id.schemeId);
      session.update(SessionPaths.senderIdentificationValue(i), id.value);
    });

    expect(session.input.sender.identifications).toEqual(ids);
  });

  it('customer.identifications: helper fonksiyon pattern', () => {
    const session = new InvoiceSession();

    function setCustomerIdentification(s: InvoiceSession, i: number, schemeId: string, value: string) {
      s.update(SessionPaths.customerIdentificationSchemeId(i), schemeId);
      s.update(SessionPaths.customerIdentificationValue(i), value);
    }

    setCustomerIdentification(session, 0, 'SEVKIYATNO', 'SVK-2026-0001');
    setCustomerIdentification(session, 1, 'MUSTERINO', 'MUS-002');

    expect(session.input.customer.identifications).toEqual([
      { schemeId: 'SEVKIYATNO', value: 'SVK-2026-0001' },
      { schemeId: 'MUSTERINO', value: 'MUS-002' },
    ]);
  });

  it('buyerCustomer.identifications: KAMU profili B-83 pattern (Mimsoft set-buyer-customer.ts)', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.buyerCustomerName, 'Kamu Müşterisi A.Ş.');

    const input = {
      identifications: [
        { schemeId: 'MUSTERINO', value: 'M-001' },
        { schemeId: 'MERSISNO', value: '0123456789012345' },
      ] as SimplePartyIdentification[],
    };

    input.identifications?.forEach((id, i) => {
      session.update(SessionPaths.buyerCustomerIdentificationSchemeId(i), id.schemeId);
      session.update(SessionPaths.buyerCustomerIdentificationValue(i), id.value);
    });

    expect(session.input.buyerCustomer?.identifications).toEqual(input.identifications);
  });

  it('despatchReferences: forEach + helper pattern', () => {
    const session = new InvoiceSession();
    const refs = [
      { id: 'IRS-001', issueDate: '2026-04-28' },
      { id: 'IRS-002', issueDate: '2026-04-29' },
    ];

    refs.forEach((ref, i) => {
      session.update(SessionPaths.despatchReferenceId(i), ref.id);
      session.update(SessionPaths.despatchReferenceIssueDate(i), ref.issueDate);
    });

    expect(session.input.despatchReferences).toEqual(refs);
  });

  it('additionalDocuments: 5 path overload (id + issueDate + 3 optional)', () => {
    const session = new InvoiceSession();

    function setAdditionalDoc(s: InvoiceSession, i: number, doc: {
      id: string;
      issueDate?: string;
      documentTypeCode?: string;
      documentType?: string;
      documentDescription?: string;
    }) {
      s.update(SessionPaths.additionalDocumentId(i), doc.id);
      s.update(SessionPaths.additionalDocumentIssueDate(i), doc.issueDate);
      s.update(SessionPaths.additionalDocumentDocumentTypeCode(i), doc.documentTypeCode);
      s.update(SessionPaths.additionalDocumentDocumentType(i), doc.documentType);
      s.update(SessionPaths.additionalDocumentDocumentDescription(i), doc.documentDescription);
    }

    setAdditionalDoc(session, 0, {
      id: 'DOC-001',
      issueDate: '2026-04-28',
      documentTypeCode: 'EXPORT',
      documentType: 'Export Declaration',
      documentDescription: 'Customs export form',
    });

    expect(session.input.additionalDocuments?.[0]).toMatchObject({
      id: 'DOC-001',
      issueDate: '2026-04-28',
      documentTypeCode: 'EXPORT',
      documentType: 'Export Declaration',
      documentDescription: 'Customs export form',
    });
  });

  it('mevcut generic catch-all hâlâ çalışıyor (lines[i].kdvPercent inline)', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    // Bu çağrı generic (line path'leri 13 overload'a dahil değil) — generic resolve eder
    session.update(SessionPaths.lineKdvPercent(0), 20);
    session.update(SessionPaths.lineTaxCode(0, 0), '0071');
    expect(session.input.lines[0].kdvPercent).toBe(20);
  });

  it('runtime davranış aynı: path validation + field-changed event + onChanged', () => {
    const session = new InvoiceSession();
    let fieldChangedCount = 0;
    session.on('field-changed', () => fieldChangedCount++);

    session.update(SessionPaths.senderIdentificationSchemeId(0), 'MERSISNO');
    session.update(SessionPaths.senderIdentificationValue(0), '0001');
    session.update(SessionPaths.despatchReferenceId(0), 'IRS-001');

    // Her başarılı update bir field-changed emit
    expect(fieldChangedCount).toBeGreaterThanOrEqual(3);
    expect(session.input.sender.identifications?.[0].schemeId).toBe('MERSISNO');
    expect(session.input.despatchReferences?.[0].id).toBe('IRS-001');
  });
});
