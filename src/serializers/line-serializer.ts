import type { InvoiceLineInput } from '../types/invoice-input';
import type { DespatchLineInput } from '../types/despatch-input';
import {
  cbcOptionalTag,
  cbcOptionalAmountTag,
  cbcOptionalQuantityTag,
  cbcRequiredTag,
  joinLines,
} from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { serializeTaxTotal, serializeWithholdingTaxTotal } from './tax-serializer';
import { serializeAllowanceCharge } from './common-serializer';
import { serializeLineDelivery } from './delivery-serializer';
import { INVOICE_LINE_SEQ, ITEM_SEQ, PRICE_SEQ, DESPATCH_LINE_SEQ, emitInOrder } from './xsd-sequence';

/**
 * InvoiceLine → XML fragment.
 * Sequence: INVOICE_LINE_SEQ. B-10 fix: Delivery, AllowanceCharge ÖNCESİ.
 *
 * B-102: `cbc:Note` emit edildi — GİB UBL-TR `InvoiceLineType`'ta `cbc:ID` ile
 * `cbc:InvoicedQuantity` ARASINDA, maxOccurs=unbounded.
 */
export function serializeInvoiceLine(line: InvoiceLineInput, currencyCode: string, indent: string = ''): string {
  const inner = emitInOrder(INVOICE_LINE_SEQ, {
    ID: () => cbcRequiredTag('ID', line.id, 'InvoiceLine'),
    Note: () =>
      line.notes?.length
        ? joinLines(
            line.notes
              .filter(n => isNonEmpty(n))
              .map(n => `${indent}  ${cbcOptionalTag('Note', n)}`),
          )
        : '',
    InvoicedQuantity: () => cbcOptionalQuantityTag('InvoicedQuantity', line.invoicedQuantity, line.unitCode),
    LineExtensionAmount: () => cbcOptionalAmountTag('LineExtensionAmount', line.lineExtensionAmount, currencyCode),
    Delivery: () => (line.delivery ? serializeLineDelivery(line.delivery, indent + '  ') : ''),
    AllowanceCharge: () =>
      line.allowanceCharges
        ? joinLines(line.allowanceCharges.map(ac => serializeAllowanceCharge(ac, currencyCode, indent + '  ')))
        : '',
    TaxTotal: () => serializeTaxTotal(line.taxTotal, currencyCode, indent + '  '),
    WithholdingTaxTotal: () =>
      line.withholdingTaxTotal ? serializeWithholdingTaxTotal(line.withholdingTaxTotal, currencyCode, indent + '  ') : '',
    Item: () => serializeItem(line.item, indent + '  '),
    Price: () => serializePrice(line.price.priceAmount, currencyCode, indent + '  '),
  });

  const body = joinLines(inner.map(s => (s.startsWith(indent) ? s : indent + '  ' + s)));
  return [`${indent}<cac:InvoiceLine>`, body, `${indent}</cac:InvoiceLine>`].join('\n');
}

/**
 * Tekil `cac:*ItemIdentification` bloğu — GİB `ItemIdentificationType` yalnızca
 * `cbc:ID` (minOccurs=1) içerir. Değer boşsa blok hiç emit edilmez (B-102).
 */
function itemIdentificationBlock(tagName: string, value: string | undefined, indent: string): string {
  if (!isNonEmpty(value)) return '';
  return [
    `${indent}<cac:${tagName}>`,
    `${indent}  ${cbcRequiredTag('ID', value, tagName)}`,
    `${indent}</cac:${tagName}>`,
  ].join('\n');
}

/**
 * `cac:OriginCountry` bloğu — GİB `CountryType`: `cbc:IdentificationCode` (0..1)
 * → `cbc:Name` (**1..1**). Name zorunlu olduğu için isim yoksa blok emit edilmez;
 * yalnız kod verilmiş olsa bile şema-geçersiz belge üretilmez (B-102).
 */
function originCountryBlock(code: string | undefined, name: string | undefined, indent: string): string {
  if (!isNonEmpty(name)) return '';
  const inner: string[] = [];
  if (isNonEmpty(code)) inner.push(`${indent}  ${cbcOptionalTag('IdentificationCode', code)}`);
  inner.push(`${indent}  ${cbcRequiredTag('Name', name, 'OriginCountry')}`);
  return [`${indent}<cac:OriginCountry>`, ...inner, `${indent}</cac:OriginCountry>`].join('\n');
}

/**
 * Item → XML fragment. Sequence: ITEM_SEQ.
 * B-13 fix: Description Name ÖNCESİ.
 *
 * B-102: BrandName / Buyers-Sellers-ManufacturersItemIdentification / OriginCountry
 * emit edildi. Slotlar ITEM_SEQ'te zaten vardı, emitter'ları yoktu — bu yüzden
 * `SimpleLineInput.brand/buyerCode/sellerCode/manufacturerCode/origin` alanları
 * uçtan uca sessizce düşüyordu.
 */
function serializeItem(item: InvoiceLineInput['item'], indent: string): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(ITEM_SEQ, {
    Description: () => cbcOptionalTag('Description', item.description),
    Name: () => cbcRequiredTag('Name', item.name, 'Item'),
    BrandName: () => cbcOptionalTag('BrandName', item.brandName),
    ModelName: () => cbcOptionalTag('ModelName', item.modelName),
    BuyersItemIdentification: () =>
      itemIdentificationBlock('BuyersItemIdentification', item.buyersItemIdentification, i2),
    SellersItemIdentification: () =>
      itemIdentificationBlock('SellersItemIdentification', item.sellersItemIdentification, i2),
    ManufacturersItemIdentification: () =>
      itemIdentificationBlock('ManufacturersItemIdentification', item.manufacturersItemIdentification, i2),
    OriginCountry: () => originCountryBlock(item.originCountryCode, item.originCountryName, i2),
    AdditionalItemIdentification: () =>
      item.additionalItemIdentifications
        ? joinLines(
            item.additionalItemIdentifications.map(aid =>
              [
                `${i2}<cac:AdditionalItemIdentification>`,
                `${i2}  ${cbcRequiredTag('ID', aid.value, 'AdditionalItemIdentification', { schemeID: aid.schemeId })}`,
                `${i2}</cac:AdditionalItemIdentification>`,
              ].join('\n'),
            ),
          )
        : '',
    CommodityClassification: () =>
      item.commodityClassification
        ? [
            `${i2}<cac:CommodityClassification>`,
            `${i2}  ${cbcOptionalTag('ItemClassificationCode', item.commodityClassification.itemClassificationCode)}`,
            `${i2}</cac:CommodityClassification>`,
          ].join('\n')
        : '',
    ItemInstance: () =>
      item.itemInstances
        ? joinLines(
            item.itemInstances.map(inst => {
              const il: string[] = [];
              if (isNonEmpty(inst.productTraceId)) il.push(`${i2}  ${cbcOptionalTag('ProductTraceID', inst.productTraceId)}`);
              if (isNonEmpty(inst.serialId)) il.push(`${i2}  ${cbcOptionalTag('SerialID', inst.serialId)}`);
              return [`${i2}<cac:ItemInstance>`, ...il, `${i2}</cac:ItemInstance>`].join('\n');
            }),
          )
        : '',
  });

  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Item>`, body, `${indent}</cac:Item>`].join('\n');
}

function serializePrice(priceAmount: number, currencyCode: string, indent: string): string {
  const inner = emitInOrder(PRICE_SEQ, {
    PriceAmount: () => cbcOptionalAmountTag('PriceAmount', priceAmount, currencyCode),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:Price>`, body, `${indent}</cac:Price>`].join('\n');
}

/** DespatchLine → XML fragment. Sequence: DESPATCH_LINE_SEQ. */
export function serializeDespatchLine(line: DespatchLineInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';

  const orderLineRef = [
    `${i2}<cac:OrderLineReference>`,
    `${i3}${cbcOptionalTag('LineID', line.id)}`,
    `${i2}</cac:OrderLineReference>`,
  ].join('\n');

  const itemInner: string[] = [];
  itemInner.push(`${i3}${cbcRequiredTag('Name', line.item.name, 'Item')}`);
  if (line.item.additionalItemIdentifications) {
    for (const aid of line.item.additionalItemIdentifications) {
      itemInner.push(`${i3}<cac:AdditionalItemIdentification>`);
      itemInner.push(`${i4}${cbcRequiredTag('ID', aid.value, 'AdditionalItemIdentification', { schemeID: aid.schemeId })}`);
      itemInner.push(`${i3}</cac:AdditionalItemIdentification>`);
    }
  }

  const inner = emitInOrder(DESPATCH_LINE_SEQ, {
    ID: () => cbcRequiredTag('ID', line.id, 'DespatchLine'),
    DeliveredQuantity: () => cbcOptionalQuantityTag('DeliveredQuantity', line.deliveredQuantity, line.unitCode),
    OrderLineReference: () => orderLineRef,
    Item: () => [`${i2}<cac:Item>`, ...itemInner, `${i2}</cac:Item>`].join('\n'),
  });

  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:DespatchLine>`, body, `${indent}</cac:DespatchLine>`].join('\n');
}
