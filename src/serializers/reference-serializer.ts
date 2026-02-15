import type {
  BillingReferenceInput, OrderReferenceInput, ContractReferenceInput,
  DocumentReferenceInput, AdditionalDocumentInput,
} from '../types/common';
import { cbcTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';

/** BillingReference → XML fragment */
export function serializeBillingReference(br: BillingReferenceInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const ref = br.invoiceDocumentReference;
  const lines: string[] = [];

  lines.push(`${indent}<cac:BillingReference>`);
  lines.push(`${i2}<cac:InvoiceDocumentReference>`);
  lines.push(`${i3}${cbcTag('ID', ref.id)}`);
  if (isNonEmpty(ref.issueDate)) {
    lines.push(`${i3}${cbcTag('IssueDate', ref.issueDate)}`);
  }
  if (isNonEmpty(ref.documentTypeCode)) {
    lines.push(`${i3}${cbcTag('DocumentTypeCode', ref.documentTypeCode)}`);
  }
  lines.push(`${i2}</cac:InvoiceDocumentReference>`);
  lines.push(`${indent}</cac:BillingReference>`);

  return joinLines(lines);
}

/** OrderReference → XML fragment */
export function serializeOrderReference(or: OrderReferenceInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:OrderReference>`);
  lines.push(`${i2}${cbcTag('ID', or.id)}`);
  if (isNonEmpty(or.issueDate)) {
    lines.push(`${i2}${cbcTag('IssueDate', or.issueDate)}`);
  }
  lines.push(`${indent}</cac:OrderReference>`);

  return joinLines(lines);
}

/** ContractDocumentReference → XML fragment (§3.10 YATIRIMTESVIK) */
export function serializeContractReference(cr: ContractReferenceInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:ContractDocumentReference>`);
  const attrs: Record<string, string> = {};
  if (isNonEmpty(cr.schemeId)) {
    attrs.schemeID = cr.schemeId;
  }
  lines.push(`${i2}${cbcTag('ID', cr.id, Object.keys(attrs).length > 0 ? attrs : undefined)}`);
  if (isNonEmpty(cr.issueDate)) {
    lines.push(`${i2}${cbcTag('IssueDate', cr.issueDate)}`);
  }
  lines.push(`${indent}</cac:ContractDocumentReference>`);

  return joinLines(lines);
}

/** DocumentReference → XML fragment (DespatchDocumentReference, ReceiptDocumentReference) */
export function serializeDocumentReference(ref: DocumentReferenceInput, tagName: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:${tagName}>`);
  lines.push(`${i2}${cbcTag('ID', ref.id)}`);
  if (isNonEmpty(ref.issueDate)) {
    lines.push(`${i2}${cbcTag('IssueDate', ref.issueDate)}`);
  }
  if (isNonEmpty(ref.documentTypeCode)) {
    lines.push(`${i2}${cbcTag('DocumentTypeCode', ref.documentTypeCode)}`);
  }
  if (isNonEmpty(ref.documentType)) {
    lines.push(`${i2}${cbcTag('DocumentType', ref.documentType)}`);
  }
  lines.push(`${indent}</cac:${tagName}>`);

  return joinLines(lines);
}

/** AdditionalDocumentReference → XML fragment */
export function serializeAdditionalDocument(doc: AdditionalDocumentInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:AdditionalDocumentReference>`);
  lines.push(`${i2}${cbcTag('ID', doc.id)}`);
  if (isNonEmpty(doc.issueDate)) {
    lines.push(`${i2}${cbcTag('IssueDate', doc.issueDate)}`);
  }
  if (isNonEmpty(doc.documentTypeCode)) {
    lines.push(`${i2}${cbcTag('DocumentTypeCode', doc.documentTypeCode)}`);
  }
  if (isNonEmpty(doc.documentType)) {
    lines.push(`${i2}${cbcTag('DocumentType', doc.documentType)}`);
  }

  if (doc.attachment) {
    lines.push(`${i2}<cac:Attachment>`);
    if (doc.attachment.embeddedBinaryObject) {
      const ebo = doc.attachment.embeddedBinaryObject;
      const attrs: Record<string, string> = { mimeCode: ebo.mimeCode };
      if (isNonEmpty(ebo.encodingCode)) attrs.encodingCode = ebo.encodingCode!;
      if (isNonEmpty(ebo.characterSetCode)) attrs.characterSetCode = ebo.characterSetCode!;
      if (isNonEmpty(ebo.filename)) attrs.filename = ebo.filename!;
      lines.push(`${i3}${cbcTag('EmbeddedDocumentBinaryObject', ebo.content, attrs)}`);
    }
    if (doc.attachment.externalReference) {
      lines.push(`${i3}<cac:ExternalReference>`);
      lines.push(`${i4}${cbcTag('URI', doc.attachment.externalReference.uri)}`);
      lines.push(`${i3}</cac:ExternalReference>`);
    }
    lines.push(`${i2}</cac:Attachment>`);
  }

  lines.push(`${indent}</cac:AdditionalDocumentReference>`);
  return joinLines(lines);
}
