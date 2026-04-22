import { escapeXml, formatDecimal, isNonEmpty } from './formatters';
import { MissingRequiredFieldError } from './errors';

/** XML tag oluşturma seçenekleri */
interface TagOptions {
  /** Attribute'lar: { key: value } */
  attrs?: Record<string, string>;
  /** İçerik (text veya nested XML) */
  content?: string;
  /** Self-closing tag mı */
  selfClose?: boolean;
}

/** Basit XML tag oluşturur: <tag attr="val">content</tag> */
export function tag(name: string, options: TagOptions = {}): string {
  const { attrs, content, selfClose } = options;
  let attrStr = '';
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (isNonEmpty(value)) {
        attrStr += ` ${key}="${escapeXml(value)}"`;
      }
    }
  }
  if (selfClose) {
    return `<${name}${attrStr}/>`;
  }
  if (content === undefined || content === null || content === '') {
    return `<${name}${attrStr}/>`;
  }
  return `<${name}${attrStr}>${content}</${name}>`;
}

// ─── cbc: required/optional split (AR-1) ──────────────────────────────────

function isEmpty(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return true;
  const str = typeof value === 'number' ? String(value) : value;
  return str.trim() === '';
}

/**
 * Zorunlu cbc: elemanı yaz. Boş/eksik değerde `MissingRequiredFieldError` fırlatır.
 * `parentContext` opsiyonel (hata mesajında görünür).
 */
export function cbcRequiredTag(
  localName: string,
  value: string | number | undefined | null,
  parentContext?: string,
  attrs?: Record<string, string>,
): string {
  if (isEmpty(value)) {
    throw new MissingRequiredFieldError(`cbc:${localName}`, parentContext);
  }
  const strValue = typeof value === 'number' ? String(value) : (value as string);
  return tag(`cbc:${localName}`, { content: escapeXml(strValue), attrs });
}

/** Opsiyonel cbc: elemanı yaz. Boş/eksik değerde '' döner. */
export function cbcOptionalTag(
  localName: string,
  value: string | number | undefined | null,
  attrs?: Record<string, string>,
): string {
  if (isEmpty(value)) return '';
  const strValue = typeof value === 'number' ? String(value) : (value as string);
  return tag(`cbc:${localName}`, { content: escapeXml(strValue), attrs });
}

/**
 * Zorunlu cbc: parasal eleman (currencyID attribute'u ile).
 * amount undefined/null/NaN → throw.
 */
export function cbcRequiredAmountTag(
  localName: string,
  amount: number | undefined | null,
  currencyCode: string,
  parentContext?: string,
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) {
    throw new MissingRequiredFieldError(`cbc:${localName}`, parentContext);
  }
  return tag(`cbc:${localName}`, {
    content: formatDecimal(amount),
    attrs: { currencyID: currencyCode },
  });
}

/** Opsiyonel cbc: parasal eleman. amount undefined/null → '' döner. */
export function cbcOptionalAmountTag(
  localName: string,
  amount: number | undefined | null,
  currencyCode: string,
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '';
  return tag(`cbc:${localName}`, {
    content: formatDecimal(amount),
    attrs: { currencyID: currencyCode },
  });
}

/**
 * Zorunlu cbc: miktar elemanı (unitCode attribute'u ile).
 * quantity undefined/null/NaN → throw.
 */
export function cbcRequiredQuantityTag(
  localName: string,
  quantity: number | undefined | null,
  unitCode: string,
  parentContext?: string,
): string {
  if (quantity === undefined || quantity === null || Number.isNaN(quantity)) {
    throw new MissingRequiredFieldError(`cbc:${localName}`, parentContext);
  }
  return tag(`cbc:${localName}`, {
    content: formatDecimal(quantity),
    attrs: { unitCode },
  });
}

/** Opsiyonel cbc: miktar elemanı. quantity undefined/null → '' döner. */
export function cbcOptionalQuantityTag(
  localName: string,
  quantity: number | undefined | null,
  unitCode: string,
): string {
  if (quantity === undefined || quantity === null || Number.isNaN(quantity)) return '';
  return tag(`cbc:${localName}`, {
    content: formatDecimal(quantity),
    attrs: { unitCode },
  });
}

// ─── cac: wrapper (AR-1 dışı) ─────────────────────────────────────────────

/**
 * cac: prefix'li wrapper element. İçerik boş ise '' döner (skip).
 * Required cac container enforce'u runtime validator'da (M6 parent-child).
 */
export function cacTag(localName: string, content: string): string {
  if (!isNonEmpty(content)) return '';
  return tag(`cac:${localName}`, { content });
}

// ─── utility ──────────────────────────────────────────────────────────────

/** Birden fazla satırı birleştirir (boş olanları filtreler) */
export function joinLines(lines: (string | undefined | null)[], indent: string = ''): string {
  return lines
    .filter((line): line is string => isNonEmpty(line))
    .map(line => indent + line)
    .join('\n');
}

/** Nested XML için indent uygular */
export function indentBlock(xml: string, indentStr: string): string {
  if (!isNonEmpty(xml)) return '';
  return xml
    .split('\n')
    .map(line => indentStr + line)
    .join('\n');
}

/** XML declaration oluşturur */
export function xmlDeclaration(): string {
  return '<?xml version="1.0" encoding="UTF-8"?>';
}

/** Invoice root element açılış tag'i oluşturur */
export function invoiceOpenTag(namespaces: Record<string, string>): string {
  const attrs: string[] = [];
  for (const [key, value] of Object.entries(namespaces)) {
    if (key === 'default') {
      attrs.push(`xmlns="${value}"`);
    } else if (key === 'schemaLocation') {
      attrs.push(`xsi:schemaLocation="${value}"`);
    } else {
      attrs.push(`xmlns:${key}="${value}"`);
    }
  }
  return `<Invoice ${attrs.join('\n  ')}>`;
}

/** DespatchAdvice root element açılış tag'i oluşturur */
export function despatchOpenTag(namespaces: Record<string, string>): string {
  const attrs: string[] = [];
  for (const [key, value] of Object.entries(namespaces)) {
    if (key === 'default') {
      attrs.push(`xmlns="${value}"`);
    } else if (key === 'schemaLocation') {
      attrs.push(`xsi:schemaLocation="${value}"`);
    } else {
      attrs.push(`xmlns:${key}="${value}"`);
    }
  }
  return `<DespatchAdvice ${attrs.join('\n  ')}>`;
}

// ─── dead code (Sprint 8'de silinecek — B-95) ──────────────────────────────

/** @deprecated Sprint 8'de silinecek (B-95). ublExtensionsPlaceholder artık kullanılmıyor. */
export function ublExtensionsPlaceholder(): string {
  return [
    '<ext:UBLExtensions>',
    '  <ext:UBLExtension>',
    '    <ext:ExtensionContent>',
    '    </ext:ExtensionContent>',
    '  </ext:UBLExtension>',
    '</ext:UBLExtensions>',
  ].join('\n');
}
