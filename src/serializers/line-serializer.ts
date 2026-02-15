import type { InvoiceLineInput } from '../types/invoice-input';
import type { DespatchLineInput } from '../types/despatch-input';
import { cbcTag, cbcAmountTag, cbcQuantityTag, joinLines } from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { serializeTaxTotal, serializeWithholdingTaxTotal } from './tax-serializer';
import { serializeAllowanceCharge } from './common-serializer';
import { serializeLineDelivery } from './delivery-serializer';

/** InvoiceLine → XML fragment */
export function serializeInvoiceLine(line: InvoiceLineInput, currencyCode: string, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:InvoiceLine>`);
  lines.push(`${i2}${cbcTag('ID', line.id)}`);
  lines.push(`${i2}${cbcQuantityTag('InvoicedQuantity', line.invoicedQuantity, line.unitCode)}`);
  lines.push(`${i2}${cbcAmountTag('LineExtensionAmount', line.lineExtensionAmount, currencyCode)}`);

  // AllowanceCharges
  if (line.allowanceCharges) {
    for (const ac of line.allowanceCharges) {
      lines.push(serializeAllowanceCharge(ac, currencyCode, i2));
    }
  }

  // TaxTotal
  lines.push(serializeTaxTotal(line.taxTotal, currencyCode, i2));

  // WithholdingTaxTotal
  if (line.withholdingTaxTotal) {
    lines.push(serializeWithholdingTaxTotal(line.withholdingTaxTotal, currencyCode, i2));
  }

  // Delivery (§3.3 IHRACAT satır seviyesi)
  if (line.delivery) {
    lines.push(serializeLineDelivery(line.delivery, i2));
  }

  // Item
  lines.push(`${i2}<cac:Item>`);
  lines.push(`${i3}${cbcTag('Name', line.item.name)}`);
  if (isNonEmpty(line.item.description)) {
    lines.push(`${i3}${cbcTag('Description', line.item.description)}`);
  }
  if (isNonEmpty(line.item.modelName)) {
    lines.push(`${i3}${cbcTag('ModelName', line.item.modelName)}`);
  }

  // AdditionalItemIdentification (HKS, ILAC, TEKNOLOJI, IDIS)
  if (line.item.additionalItemIdentifications) {
    for (const aid of line.item.additionalItemIdentifications) {
      lines.push(`${i3}<cac:AdditionalItemIdentification>`);
      lines.push(`${i4}${cbcTag('ID', aid.value, { schemeID: aid.schemeId })}`);
      lines.push(`${i3}</cac:AdditionalItemIdentification>`);
    }
  }

  // CommodityClassification (§3.10 YATIRIMTESVIK)
  if (line.item.commodityClassification) {
    lines.push(`${i3}<cac:CommodityClassification>`);
    lines.push(`${i4}${cbcTag('ItemClassificationCode', line.item.commodityClassification.itemClassificationCode)}`);
    lines.push(`${i3}</cac:CommodityClassification>`);
  }

  // ItemInstance (§3.10 YATIRIMTESVIK Kod 01)
  if (line.item.itemInstances) {
    for (const inst of line.item.itemInstances) {
      lines.push(`${i3}<cac:ItemInstance>`);
      if (isNonEmpty(inst.productTraceId)) {
        lines.push(`${i4}${cbcTag('ProductTraceID', inst.productTraceId)}`);
      }
      if (isNonEmpty(inst.serialId)) {
        lines.push(`${i4}${cbcTag('SerialID', inst.serialId)}`);
      }
      lines.push(`${i3}</cac:ItemInstance>`);
    }
  }

  lines.push(`${i2}</cac:Item>`);

  // Price
  lines.push(`${i2}<cac:Price>`);
  lines.push(`${i3}${cbcAmountTag('PriceAmount', line.price.priceAmount, currencyCode)}`);
  lines.push(`${i2}</cac:Price>`);

  lines.push(`${indent}</cac:InvoiceLine>`);
  return joinLines(lines);
}

/** DespatchLine → XML fragment */
export function serializeDespatchLine(line: DespatchLineInput, indent: string = ''): string {
  const i2 = indent + '  ';
  const i3 = indent + '    ';
  const i4 = indent + '      ';
  const lines: string[] = [];

  lines.push(`${indent}<cac:DespatchLine>`);
  lines.push(`${i2}${cbcTag('ID', line.id)}`);
  lines.push(`${i2}${cbcQuantityTag('DeliveredQuantity', line.deliveredQuantity, line.unitCode)}`);

  // OrderLineReference (zorunlu element)
  lines.push(`${i2}<cac:OrderLineReference>`);
  lines.push(`${i3}${cbcTag('LineID', line.id)}`);
  lines.push(`${i2}</cac:OrderLineReference>`);

  // Item
  lines.push(`${i2}<cac:Item>`);
  lines.push(`${i3}${cbcTag('Name', line.item.name)}`);

  if (line.item.additionalItemIdentifications) {
    for (const aid of line.item.additionalItemIdentifications) {
      lines.push(`${i3}<cac:AdditionalItemIdentification>`);
      lines.push(`${i4}${cbcTag('ID', aid.value, { schemeID: aid.schemeId })}`);
      lines.push(`${i3}</cac:AdditionalItemIdentification>`);
    }
  }

  lines.push(`${i2}</cac:Item>`);
  lines.push(`${indent}</cac:DespatchLine>`);
  return joinLines(lines);
}
