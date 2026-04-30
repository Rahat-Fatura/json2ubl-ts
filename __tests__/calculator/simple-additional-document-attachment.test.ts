/**
 * `additionalDocuments[i].attachment` SessionPaths smoke testleri (Sprint 8n.1 /
 * v2.2.6 — Library Öneri #9).
 *
 * Mimsoft greenfield F5.C5.3 (additional-documents-section file upload) action
 * helper pattern'ini birebir simüle eder. Tip + UBL Attachment mapper v2.2.5'te
 * mevcuttu; v2.2.6 sadece SessionPaths path entry'lerini açtı (generator inline
 * literal sub-object desteği).
 *
 * 5 path:
 *   - filename, mimeCode, data (zorunlu — string)
 *   - encodingCode (opsiyonel — UBL spec genelde 'Base64')
 *   - characterSetCode (opsiyonel — Mimsoft set etmiyor, mapper 'UTF-8' fallback)
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession, SessionPaths } from '../../src';

describe('SimpleAdditionalDocumentInput.attachment paths (Sprint 8n.1 / v2.2.6)', () => {
  it('5 attachment path round-trip — Mimsoft helper pattern', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-001');
    session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'fatura.pdf');
    session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
    session.update(SessionPaths.additionalDocumentAttachmentData(0), 'JVBERi0xLjQK');
    session.update(SessionPaths.additionalDocumentAttachmentEncodingCode(0), 'Base64');
    session.update(SessionPaths.additionalDocumentAttachmentCharacterSetCode(0), 'UTF-8');

    expect(session.input.additionalDocuments?.[0]?.attachment).toEqual({
      filename: 'fatura.pdf',
      mimeCode: 'application/pdf',
      data: 'JVBERi0xLjQK',
      encodingCode: 'Base64',
      characterSetCode: 'UTF-8',
    });
  });

  it('attachment optional — id only without attachment', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-002');
    session.update(SessionPaths.additionalDocumentIssueDate(0), '2026-04-30');

    expect(session.input.additionalDocuments?.[0]?.attachment).toBeUndefined();
    expect(session.input.additionalDocuments?.[0]?.id).toBe('DOC-002');
  });

  it('unset additionalDocuments clears attachment too', () => {
    const session = new InvoiceSession();
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-003');
    session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'x.pdf');
    session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
    session.update(SessionPaths.additionalDocumentAttachmentData(0), 'eHh4');
    expect(session.input.additionalDocuments?.[0]?.attachment).toBeDefined();

    session.unset('additionalDocuments');
    expect(session.input.additionalDocuments).toBeUndefined();
  });

  it('UBL mapper attachment çıktısı (smoke — mevcut mapper davranışı korundu)', () => {
    const session = new InvoiceSession();
    session.update('sender.taxNumber', '1234567890');
    session.update('sender.name', 'Sender A.Ş.');
    session.update('sender.address', 'Adres');
    session.update('sender.district', 'Kadıköy');
    session.update('sender.city', 'İstanbul');
    session.update('customer.taxNumber', '0987654321');
    session.update('customer.name', 'Customer Ltd.');
    session.update('customer.address', 'Cust Adres');
    session.update('customer.district', 'Beyoğlu');
    session.update('customer.city', 'İstanbul');
    session.addLine({ name: 'L1', quantity: 1, price: 100, kdvPercent: 18 });
    session.update(SessionPaths.additionalDocumentId(0), 'DOC-004');
    session.update(SessionPaths.additionalDocumentAttachmentFilename(0), 'beyanname.pdf');
    session.update(SessionPaths.additionalDocumentAttachmentMimeCode(0), 'application/pdf');
    session.update(SessionPaths.additionalDocumentAttachmentData(0), 'JVBERi0xLjQK');
    session.update(SessionPaths.additionalDocumentAttachmentEncodingCode(0), 'Base64');

    const xml = session.buildXml();
    // Mapper attachment'ı UBL cbc:EmbeddedDocumentBinaryObject'e map etmeli
    expect(xml).toContain('beyanname.pdf');
    expect(xml).toContain('application/pdf');
    expect(xml).toContain('JVBERi0xLjQK');
    expect(xml).toContain('encodingCode="Base64"');
  });
});
