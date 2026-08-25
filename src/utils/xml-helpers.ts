import { escapeXml, formatDecimal, formatDecimalRange, isNonEmpty } from './formatters';
import { MissingRequiredFieldError } from './errors';

/**
 * MİKTAR ve BİRİM FİYAT ondalık aralığı (4.1.0).
 *
 * Şematron bu alanlara format kuralı KOYMAZ: `InvoicedQuantityCheck`
 * (`UBL-TR_Common_Schematron.xml:411`) yalnız `count(@unitCode)=1` denetler,
 * `decimalCheck` ise bu bağlamlara hiç uygulanmaz. Eskiden sabit 2 basamak
 * yazılıyordu ve gerçek veriyi imha ediyordu:
 *   0,125 kg → "0.13"  ·  0,004 kg → "0.00"  ·  0,0035 TL → "0.00"
 *
 * min=2 mevcut çıktıyı korur (1 → "1.00"); max=6 hassas miktar/fiyatı
 * kurtarır. ⚠️ PARASAL `*Amount` alanları BU ARALIĞA GİRMEZ — `decimalCheck`
 * yüzünden 2 basamakta kalırlar (bkz. `cbcOptionalAmountTag`).
 */
const QUANTITY_MIN_DECIMALS = 2;
const QUANTITY_MAX_DECIMALS = 6;

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

/**
 * Opsiyonel cbc: parasal eleman. amount undefined/null → '' döner.
 * ⚠️ SABİT 2 ondalık — `decimalCheck` gereği. Birim FİYAT için bunu
 * kullanmayın; `cbcOptionalUnitPriceTag` var.
 */
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
 * Opsiyonel cbc: BİRİM FİYAT elemanı (`cac:Price/cbc:PriceAmount`) — 4.1.0.
 *
 * Parasal görünse de `decimalCheck` KAPSAMINDA DEĞİLDİR (kural yalnız
 * `LegalMonetaryTotal`'ın 5 alanı + `Invoice/TaxTotal/TaxAmount` bağlamlarına
 * bağlıdır), bu yüzden ondalık aralığı miktarla aynıdır. Sabit 2 basamak
 * `0,0035 TL` gibi hassas birim fiyatları imha ediyordu.
 */
export function cbcOptionalUnitPriceTag(
  localName: string,
  amount: number | undefined | null,
  currencyCode: string,
): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '';
  return tag(`cbc:${localName}`, {
    content: formatDecimalRange(amount, QUANTITY_MIN_DECIMALS, QUANTITY_MAX_DECIMALS),
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
    content: formatDecimalRange(quantity, QUANTITY_MIN_DECIMALS, QUANTITY_MAX_DECIMALS),
    attrs: { unitCode },
  });
}

/**
 * Opsiyonel cbc: miktar elemanı. quantity undefined/null → '' döner.
 * 4.1.0: ondalık aralığı 2..6 (bkz. QUANTITY_MIN/MAX_DECIMALS).
 */
export function cbcOptionalQuantityTag(
  localName: string,
  quantity: number | undefined | null,
  unitCode: string,
): string {
  if (quantity === undefined || quantity === null || Number.isNaN(quantity)) return '';
  return tag(`cbc:${localName}`, {
    content: formatDecimalRange(quantity, QUANTITY_MIN_DECIMALS, QUANTITY_MAX_DECIMALS),
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

/**
 * BOŞ `ext:UBLExtensions` iskeleti (4.1.0) — imzalayıcının XAdES yazacağı yer.
 *
 * Neden var: GİB `UBL-Invoice-2.1.xsd` kök sequence'ında `ext:UBLExtensions`
 * İLK elemandır ve şema onu bekler; iskelet yokken doğrulayıcı
 *   "UBLVersionID elementi bu konumda geçersiz. Bu noktada beklenen: UBLExtensions."
 * hatası verir (canlı kanıt, paket 20260701).
 *
 * Neden VARSAYILAN DEĞİL: kütüphane imza üretmez (bkz. B-101 sınırı) ve
 * yerleşik tüketicilerin çoğunda zarfı/imzayı ENTEGRATÖR ekler — iskeleti
 * koşulsuz yazmak onların çıktısını değiştirirdi. Bu yüzden yalnız
 * `BuilderOptions.includeUblExtensions === true` iken emit edilir; imzayı
 * kendi atan tüketiciler (ör. sunucu tarafı mühürleme) bayrağı açar.
 *
 * `ext` namespace bildirimi kök tag'de zaten mevcuttur
 * (`INVOICE_NAMESPACES` / `DESPATCH_NAMESPACES`).
 */
export function ublExtensionsSkeleton(indent: string = ''): string {
  return [
    `${indent}<ext:UBLExtensions>`,
    `${indent}  <ext:UBLExtension>`,
    `${indent}    <ext:ExtensionContent/>`,
    `${indent}  </ext:UBLExtension>`,
    `${indent}</ext:UBLExtensions>`,
  ].join('\n');
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

