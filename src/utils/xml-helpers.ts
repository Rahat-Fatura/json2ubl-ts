import { escapeXml, formatDecimal, isNonEmpty } from './formatters';

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

/** cbc: prefix'li basit element oluşturur */
export function cbcTag(localName: string, value: string | number | undefined | null, attrs?: Record<string, string>): string {
  if (value === undefined || value === null) return '';
  const strValue = typeof value === 'number' ? String(value) : value;
  if (strValue.trim() === '') return '';
  return tag(`cbc:${localName}`, { content: escapeXml(strValue), attrs });
}

/** cbc: prefix'li parasal element oluşturur (currencyID attribute'u ile) */
export function cbcAmountTag(localName: string, amount: number | undefined | null, currencyCode: string): string {
  if (amount === undefined || amount === null) return '';
  return tag(`cbc:${localName}`, {
    content: formatDecimal(amount),
    attrs: { currencyID: currencyCode },
  });
}

/** cbc: prefix'li miktar element oluşturur (unitCode attribute'u ile) */
export function cbcQuantityTag(localName: string, quantity: number | undefined | null, unitCode: string): string {
  if (quantity === undefined || quantity === null) return '';
  return tag(`cbc:${localName}`, {
    content: formatDecimal(quantity),
    attrs: { unitCode },
  });
}

/** cac: prefix'li wrapper element oluşturur */
export function cacTag(localName: string, content: string): string {
  if (!isNonEmpty(content)) return '';
  return tag(`cac:${localName}`, { content });
}

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

/** Boş UBLExtensions placeholder oluşturur */
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
