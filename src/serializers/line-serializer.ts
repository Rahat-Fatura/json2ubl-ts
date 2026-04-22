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
 */
export function serializeInvoiceLine(line: InvoiceLineInput, currencyCode: string, indent: string = ''): string {
  const inner = emitInOrder(INVOICE_LINE_SEQ, {
    ID: () => cbcRequiredTag('ID', line.id, 'InvoiceLine'),
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
 * Item → XML fragment. Sequence: ITEM_SEQ.
 * B-13 fix: Description Name ÖNCESİ.
 */
function serializeItem(item: InvoiceLineInput['item'], indent: string): string {
  const i2 = indent + '  ';
  const inner = emitInOrder(ITEM_SEQ, {
    Description: () => cbcOptionalTag('Description', item.description),
    Name: () => cbcRequiredTag('Name', item.name, 'Item'),
    ModelName: () => cbcOptionalTag('ModelName', item.modelName),
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
