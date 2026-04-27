/**
 * Generator regression test (Sprint 8h.1 / AR-10).
 *
 * Generator deterministic olmalı (idempotent), tüm beklenen path entry'leri
 * üretmeli, manuel append (liability) + read-only paths (isExport) doğru
 * yerleştirilmeli.
 */

import { describe, it, expect } from 'vitest';
import { generateSessionPaths } from '../../scripts/generate-session-paths';

describe('generate-session-paths (Sprint 8h.1)', () => {
  it('is deterministic (two consecutive runs produce identical output)', () => {
    const first = generateSessionPaths();
    const second = generateSessionPaths();
    expect(first).toBe(second);
  });

  it('emits @generated header marker', () => {
    const out = generateSessionPaths();
    expect(out).toContain('@generated');
    expect(out).toContain('THIS FILE IS AUTO-GENERATED');
    expect(out).toContain('DO NOT EDIT BY HAND');
  });

  it('exports SessionPaths const with as const assertion', () => {
    const out = generateSessionPaths();
    expect(out).toContain('export const SessionPaths = {');
    expect(out).toContain('} as const;');
  });

  it('exports SessionPathMap interface', () => {
    const out = generateSessionPaths();
    expect(out).toContain('export interface SessionPathMap {');
  });

  it('exports KNOWN_PATH_TEMPLATES ReadonlySet', () => {
    const out = generateSessionPaths();
    expect(out).toContain('export const KNOWN_PATH_TEMPLATES: ReadonlySet<string> = new Set([');
  });

  it('exports READ_ONLY_PATHS ReadonlySet with isExport', () => {
    const out = generateSessionPaths();
    expect(out).toContain('export const READ_ONLY_PATHS: ReadonlySet<string> = new Set([');
    expect(out).toContain("'isExport',");
  });

  it('contains doc-level primitive entries (type, profile, currencyCode)', () => {
    const out = generateSessionPaths();
    expect(out).toContain("type: 'type',");
    expect(out).toContain("profile: 'profile',");
    expect(out).toContain("currencyCode: 'currencyCode',");
  });

  it('contains doc-level array primitive (notes: string[])', () => {
    const out = generateSessionPaths();
    expect(out).toContain("notes: 'notes',");
    expect(out).toContain("'notes': string[] | undefined;");
  });

  it('contains sub-object entries with prefix naming (sender.taxNumber → senderTaxNumber)', () => {
    const out = generateSessionPaths();
    expect(out).toContain("senderTaxNumber: 'sender.taxNumber',");
    expect(out).toContain("senderName: 'sender.name',");
    expect(out).toContain("paymentMeansAccountNumber: 'paymentMeans.accountNumber',");
  });

  it('contains line-level function entries with bracket notation template', () => {
    const out = generateSessionPaths();
    expect(out).toMatch(/lineKdvPercent:\s*\(i:\s*number\)\s*=>\s*`lines\[\$\{i\}\]\.kdvPercent`/);
    expect(out).toMatch(/lineQuantity:\s*\(i:\s*number\)\s*=>\s*`lines\[\$\{i\}\]\.quantity`/);
  });

  it('contains line + sub-object entries (lines[i].delivery.gtipNo → lineDeliveryGtipNo)', () => {
    const out = generateSessionPaths();
    expect(out).toMatch(/lineDeliveryGtipNo:\s*\(i:\s*number\)\s*=>\s*`lines\[\$\{i\}\]\.delivery\.gtipNo`/);
    expect(out).toMatch(/lineDeliveryAlicidibsatirkod:\s*\(i:\s*number\)\s*=>\s*`lines\[\$\{i\}\]\.delivery\.alicidibsatirkod`/);
  });

  it('contains double-indexed function entries (lines[i].taxes[ti].code → lineTaxCode)', () => {
    const out = generateSessionPaths();
    expect(out).toMatch(/lineTaxCode:\s*\(i:\s*number,\s*ti:\s*number\)\s*=>\s*`lines\[\$\{i\}\]\.taxes\[\$\{ti\}\]\.code`/);
    expect(out).toMatch(/lineTaxPercent:\s*\(i:\s*number,\s*ti:\s*number\)\s*=>\s*`lines\[\$\{i\}\]\.taxes\[\$\{ti\}\]\.percent`/);
  });

  it('resolves type aliases (SimpleSgkType → literal union for sgk.type)', () => {
    const out = generateSessionPaths();
    expect(out).toMatch(/'sgk\.type':\s*'SAGLIK_ECZ' \| 'SAGLIK_HAS'/);
    expect(out).toContain("sgkType: 'sgk.type',");
  });

  it('contains additional array entries (despatchReferences, additionalDocuments)', () => {
    const out = generateSessionPaths();
    expect(out).toMatch(/despatchReferenceId:\s*\(i:\s*number\)\s*=>\s*`despatchReferences\[\$\{i\}\]\.id`/);
    expect(out).toMatch(/additionalDocumentId:\s*\(i:\s*number\)\s*=>\s*`additionalDocuments\[\$\{i\}\]\.id`/);
  });

  it('contains manual append entry: liability (D-9, session-level state)', () => {
    const out = generateSessionPaths();
    expect(out).toContain("liability: 'liability',");
    expect(out).toContain("'liability': 'einvoice' | 'earchive' | undefined;");
  });

  it('does NOT contain isExport in SessionPaths (read-only, D-10)', () => {
    const out = generateSessionPaths();
    expect(out).not.toMatch(/^\s+isExport:/m);
    expect(out).not.toContain("'isExport': ");   // SessionPathMap'te de yok
  });

  it('KNOWN_PATH_TEMPLATES uses asterisk normalize for indexed paths', () => {
    const out = generateSessionPaths();
    expect(out).toContain("'lines[*].kdvPercent',");
    expect(out).toContain("'lines[*].taxes[*].code',");
    expect(out).toContain("'despatchReferences[*].id',");
    expect(out).toContain("'liability',");
  });

  it('skips deeply nested sub-objects (lines[i].delivery.deliveryAddress.X SKIP, Faz 1)', () => {
    const out = generateSessionPaths();
    // deliveryAddress field'ları SessionPaths'e gelmemeli
    expect(out).not.toMatch(/lineDeliveryDeliveryAddress/);
    expect(out).not.toContain('deliveryAddress.city');
  });

  it('skips inline object literal arrays (sender.identifications, attachment, SKIP Faz 1)', () => {
    const out = generateSessionPaths();
    expect(out).not.toMatch(/senderIdentificationSchemeId/);
    expect(out).not.toContain('attachment.filename');
  });

  it('preserves JSDoc from source interface fields', () => {
    const out = generateSessionPaths();
    // SimpleInvoiceInput.lines JSDoc fragmanı kontrol
    expect(out).toMatch(/Vergi kimlik numarası/);     // sender.taxNumber JSDoc
    expect(out).toMatch(/KDV oranı/);                  // line.kdvPercent JSDoc
  });

  it('emits Expected type annotation in JSDoc for every entry', () => {
    const out = generateSessionPaths();
    const expectedTypeCount = (out.match(/Expected type:/g) ?? []).length;
    // ~125 entry, her birinde "Expected type:" satırı olmalı
    expect(expectedTypeCount).toBeGreaterThan(100);
  });

  it('total generated file size: 800-1200 lines (target ~960)', () => {
    const out = generateSessionPaths();
    const lineCount = out.split('\n').length;
    expect(lineCount).toBeGreaterThan(800);
    expect(lineCount).toBeLessThan(1200);
  });

  it('SessionPathMap value types include primitives + literal unions + undefined for optionals', () => {
    const out = generateSessionPaths();
    expect(out).toContain("'sender.taxNumber': string;");                    // zorunlu
    expect(out).toContain("'sender.taxOffice': string | undefined;");        // opsiyonel
    expect(out).toContain("'lines[${number}].kdvPercent': number;");         // zorunlu number
    expect(out).toContain("'lines[${number}].allowancePercent': number | undefined;");  // opsiyonel number
    expect(out).toContain("'eArchiveInfo.sendType': \"ELEKTRONIK\" | \"KAGIT\";");  // inline literal union
  });
});
