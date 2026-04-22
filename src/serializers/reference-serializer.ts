import type {
  BillingReferenceInput, OrderReferenceInput, ContractReferenceInput,
  DocumentReferenceInput, AdditionalDocumentInput,
} from '../types/common';
import { cbcOptionalTag, cbcRequiredTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import {
  DOCUMENT_REFERENCE_SEQ,
  ORDER_REFERENCE_SEQ,
  BILLING_REFERENCE_SEQ,
  emitInOrder,
} from './xsd-sequence';

/**
 * BillingReference → XML fragment.
 * Sequence: BILLING_REFERENCE_SEQ. Inner InvoiceDocumentReference DOCUMENT_REFERENCE_SEQ.
 * B-32 fix: IssueDate required (invoiceDocumentReference).
 */
export function serializeBillingReference(br: BillingReferenceInput, indent: string = ''): string {
  const inner = emitInOrder(BILLING_REFERENCE_SEQ, {
    InvoiceDocumentReference: () =>
      serializeDocumentReferenceBody(br.invoiceDocumentReference, 'InvoiceDocumentReference', indent + '  '),
  });
  const body = joinLines(inner.map(s => (s.startsWith(indent + '  ') ? s : indent + '  ' + s)));
  return [`${indent}<cac:BillingReference>`, body, `${indent}</cac:BillingReference>`].join('\n');
}

/**
 * OrderReference → XML fragment.
 * Sequence: ORDER_REFERENCE_SEQ. B-33 fix: IssueDate required.
 */
export function serializeOrderReference(or: OrderReferenceInput, indent: string = ''): string {
  const inner = emitInOrder(ORDER_REFERENCE_SEQ, {
    ID: () => cbcRequiredTag('ID', or.id, 'OrderReference'),
    IssueDate: () => cbcRequiredTag('IssueDate', or.issueDate, 'OrderReference'),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:OrderReference>`, body, `${indent}</cac:OrderReference>`].join('\n');
}

/**
 * ContractDocumentReference → XML fragment (§3.10 YATIRIMTESVIK).
 * DocumentReference-like; ancak `ContractReferenceInput.issueDate` opsiyonel kaldı
 * (Sprint 3 kapsamında değil; B-32 downstream).
 */
export function serializeContractReference(cr: ContractReferenceInput, indent: string = ''): string {
  const attrs: Record<string, string> = {};
  if (isNonEmpty(cr.schemeId)) {
    attrs.schemeID = cr.schemeId;
  }
  const inner = emitInOrder(DOCUMENT_REFERENCE_SEQ, {
    ID: () => cbcRequiredTag('ID', cr.id, 'ContractDocumentReference', Object.keys(attrs).length > 0 ? attrs : undefined),
    IssueDate: () => cbcOptionalTag('IssueDate', cr.issueDate),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:ContractDocumentReference>`, body, `${indent}</cac:ContractDocumentReference>`].join('\n');
}

/**
 * DocumentReference → XML fragment (DespatchDocumentReference, ReceiptDocumentReference,
 * OriginatorDocumentReference).
 * B-32 fix: IssueDate required.
 */
export function serializeDocumentReference(ref: DocumentReferenceInput, tagName: string, indent: string = ''): string {
  return serializeDocumentReferenceBody(ref, tagName, indent);
}

function serializeDocumentReferenceBody(ref: DocumentReferenceInput, tagName: string, indent: string): string {
  const inner = emitInOrder(DOCUMENT_REFERENCE_SEQ, {
    ID: () => cbcRequiredTag('ID', ref.id, tagName),
    IssueDate: () => cbcRequiredTag('IssueDate', ref.issueDate, tagName),
    DocumentTypeCode: () => cbcOptionalTag('DocumentTypeCode', ref.documentTypeCode),
    DocumentType: () => cbcOptionalTag('DocumentType', ref.documentType),
    DocumentDescription: () => cbcOptionalTag('DocumentDescription', ref.documentDescription),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:${tagName}>`, body, `${indent}</cac:${tagName}>`].join('\n');
}

/**
 * AdditionalDocumentReference → XML fragment.
 * `AdditionalDocumentInput.issueDate` opsiyonel kalır (Sprint 3 kapsamında B-32 downstream sadece).
 */
export function serializeAdditionalDocument(doc: AdditionalDocumentInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';

  const attachmentXml = (): string => {
    if (!doc.attachment) return '';
    const parts: string[] = [`${i2}<cac:Attachment>`];
    if (doc.attachment.embeddedBinaryObject) {
      const ebo = doc.attachment.embeddedBinaryObject;
      const attrs: Record<string, string> = { mimeCode: ebo.mimeCode };
      if (isNonEmpty(ebo.encodingCode)) attrs.encodingCode = ebo.encodingCode!;
      if (isNonEmpty(ebo.characterSetCode)) attrs.characterSetCode = ebo.characterSetCode!;
      if (isNonEmpty(ebo.filename)) attrs.filename = ebo.filename!;
      parts.push(`${i3}${cbcOptionalTag('EmbeddedDocumentBinaryObject', ebo.content, attrs)}`);
    }
    if (doc.attachment.externalReference) {
      parts.push(`${i3}<cac:ExternalReference>`);
      parts.push(`${i4}${cbcOptionalTag('URI', doc.attachment.externalReference.uri)}`);
      parts.push(`${i3}</cac:ExternalReference>`);
    }
    parts.push(`${i2}</cac:Attachment>`);
    return parts.join('\n');
  };

  const inner = emitInOrder(DOCUMENT_REFERENCE_SEQ, {
    ID: () => cbcRequiredTag('ID', doc.id, 'AdditionalDocumentReference'),
    IssueDate: () => cbcOptionalTag('IssueDate', doc.issueDate),
    DocumentTypeCode: () => cbcOptionalTag('DocumentTypeCode', doc.documentTypeCode),
    DocumentType: () => cbcOptionalTag('DocumentType', doc.documentType),
    DocumentDescription: () => cbcOptionalTag('DocumentDescription', doc.documentDescription),
    Attachment: () => attachmentXml(),
  });
  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:AdditionalDocumentReference>`, body, `${indent}</cac:AdditionalDocumentReference>`].join('\n');
}
