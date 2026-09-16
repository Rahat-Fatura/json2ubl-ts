import type { InvoiceLineInput } from '../types/invoice-input';
import type { DespatchLineInput } from '../types/despatch-input';
import type { ItemInput } from '../types/common';
import {
  cbcOptionalTag,
  cbcOptionalAmountTag,
  cbcOptionalQuantityTag,
  cbcOptionalUnitPriceTag,
  cbcRequiredTag,
  joinLines,
} from '../utils/xml-helpers';
import { isNonEmpty } from '../utils/formatters';
import { serializeTaxTotal, serializeWithholdingTaxTotal } from './tax-serializer';
import { serializeAllowanceCharge } from './common-serializer';
import { serializeCountry, serializeLineDelivery } from './delivery-serializer';
import {
  INVOICE_LINE_SEQ,
  ITEM_SEQ,
  ITEM_IDENTIFICATION_SEQ,
  COMMODITY_CLASSIFICATION_SEQ,
  ITEM_INSTANCE_SEQ,
  ORDER_LINE_REFERENCE_SEQ,
  PRICE_SEQ,
  DESPATCH_LINE_SEQ,
  emitInOrder,
} from './xsd-sequence';
import { configManager } from '../calculator/config-manager';

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
 *
 * Beş eleman aynı tiptedir (`ITEM_IDENTIFICATION_SEQ`): Buyers / Sellers /
 * Manufacturers / Additional / ItemIdentification — tek üretici hepsini basar.
 */
function itemIdentificationBlock(
  tagName: string,
  value: string | undefined,
  indent: string,
  attrs?: Record<string, string>,
): string {
  if (!isNonEmpty(value)) return '';
  const inner = emitInOrder(ITEM_IDENTIFICATION_SEQ, {
    ID: () => cbcRequiredTag('ID', value, tagName, attrs),
  });
  return joinLines([
    `${indent}<cac:${tagName}>`,
    ...inner.map(s => `${indent}  ${s}`),
    `${indent}</cac:${tagName}>`,
  ]);
}

/**
 * Item → XML fragment. Sequence: ITEM_SEQ.
 * B-13 fix: Description Name ÖNCESİ.
 *
 * B-102: BrandName / Buyers-Sellers-ManufacturersItemIdentification / OriginCountry
 * emit edildi. Slotlar ITEM_SEQ'te zaten vardı, emitter'ları yoktu — bu yüzden
 * `SimpleLineInput.brand/buyerCode/sellerCode/manufacturerCode/origin` alanları
 * uçtan uca sessizce düşüyordu.
 *
 * 🔴 S2b: fatura ve irsaliyenin TEK `cac:Item` üreticisi budur. İrsaliye tarafı
 * `serializeDespatchLine` içinde `itemInner` dizisini ELLE kuruyor ve yalnız
 * 3 alanı (Description / Name / AdditionalItemIdentification) tanıyordu. Bu
 * ikilik canlıda ÖLÇÜLMÜŞ bir kusur üretmişti: `resolveUnitCode` fatura yolunda
 * hesaplayıcıda koşuyor, irsaliyede hesaplayıcı olmadığı için hiç koşmuyordu →
 * `unitCode="Adet"` ham hâliyle GİB'e gidip `GeneralUnitCodeCheck`'i patlatıyordu.
 * "İki tip, iki kod yolu" deseni kalktı: `DespatchItemInput` artık `ItemInput`tır.
 */
export function serializeItem(item: ItemInput, indent: string): string {
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
    /* `cac:OriginCountry` da `CountryType`'tır — adresteki `cac:Country` ile
     * AYNI üreticiden geçer. GİB'de `cbc:Name` 1..1'dir; isim yoksa blok hiç
     * yazılmaz (bkz. `serializeCountry`). */
    OriginCountry: () =>
      serializeCountry(item.originCountryCode, item.originCountryName, i2, 'OriginCountry'),
    AdditionalItemIdentification: () =>
      joinLines(
        (item.additionalItemIdentifications ?? []).map(aid =>
          itemIdentificationBlock('AdditionalItemIdentification', aid.value, i2, { schemeID: aid.schemeId }),
        ),
      ),
    CommodityClassification: () => {
      if (!item.commodityClassification) return '';
      const ccInner = emitInOrder(COMMODITY_CLASSIFICATION_SEQ, {
        ItemClassificationCode: () =>
          cbcOptionalTag('ItemClassificationCode', item.commodityClassification!.itemClassificationCode),
      });
      return joinLines([
        `${i2}<cac:CommodityClassification>`,
        ...ccInner.map(s => `${i2}  ${s}`),
        `${i2}</cac:CommodityClassification>`,
      ]);
    },
    ItemInstance: () =>
      joinLines(
        (item.itemInstances ?? []).map(inst => {
          const instInner = emitInOrder(ITEM_INSTANCE_SEQ, {
            ProductTraceID: () => cbcOptionalTag('ProductTraceID', inst.productTraceId),
            SerialID: () => cbcOptionalTag('SerialID', inst.serialId),
          });
          return joinLines([
            `${i2}<cac:ItemInstance>`,
            ...instInner.map(s => `${i2}  ${s}`),
            `${i2}</cac:ItemInstance>`,
          ]);
        }),
      ),
  });

  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:Item>`, body, `${indent}</cac:Item>`].join('\n');
}

/**
 * Price → XML fragment.
 *
 * 4.1.0: `cbc:PriceAmount` artık `cbcOptionalUnitPriceTag` ile 2..6 ondalık
 * aralığında yazılır (eskiden sabit 2). BİRİM FİYAT parasal görünse de
 * `decimalCheck` KAPSAMINDA DEĞİLDİR — kural yalnız `LegalMonetaryTotal`'ın
 * 5 alanına + `Invoice/TaxTotal/TaxAmount`'a bağlıdır. Sabit 2 basamak
 * `0,0035 TL` gibi hassas birim fiyatları "0.00"a indiriyordu.
 */
function serializePrice(priceAmount: number, currencyCode: string, indent: string): string {
  const inner = emitInOrder(PRICE_SEQ, {
    PriceAmount: () => cbcOptionalUnitPriceTag('PriceAmount', priceAmount, currencyCode),
  });
  const body = joinLines(inner.map(s => indent + '  ' + s));
  return [`${indent}<cac:Price>`, body, `${indent}</cac:Price>`].join('\n');
}

/** DespatchLine → XML fragment. Sequence: DESPATCH_LINE_SEQ. */
export function serializeDespatchLine(line: DespatchLineInput, indent: string = ''): string {
  const i2 = indent + '  ';

  const orderLineRefInner = emitInOrder(ORDER_LINE_REFERENCE_SEQ, {
    LineID: () => cbcOptionalTag('LineID', line.id),
  });
  const orderLineRef = joinLines([
    `${i2}<cac:OrderLineReference>`,
    ...orderLineRefInner.map(s => `${i2}  ${s}`),
    `${i2}</cac:OrderLineReference>`,
  ]);

  const inner = emitInOrder(DESPATCH_LINE_SEQ, {
    ID: () => cbcRequiredTag('ID', line.id, 'DespatchLine'),
    Note: () => cbcOptionalTag('Note', line.note),
    /* 🔴 BİRİM ADI → GİB KODU, EMİSYON ANINDA. Fatura bu çözümlemeyi hesaplayıcıda
     * yapıyor (`line-calculator.ts:232`); irsaliyede hesaplayıcı YOK, bu yüzden
     * çağrı hiçbir yerde koşmuyor ve `unitCode="Adet"` ham hâliyle XML'e düşüyordu.
     * Canlı GİB kapısında ölçüldü: `GeneralUnitCodeCheck` bunun için patlıyor.
     *
     * Yeri BİLEREK serileştiricidir, eşleyici değil: ham `DespatchInput` ile gelen
     * çağıran eşleyiciye HİÇ UĞRAMAZ (`DespatchBuilder.build` doğrudan serileştirir),
     * dolayısıyla eşleyiciye konsaydı iki yoldan yalnız biri düzelirdi.
     * Çözümleme tanımadığı değeri AYNEN döndürür → zaten kod veren etkilenmez. */
    DeliveredQuantity: () =>
      cbcOptionalQuantityTag('DeliveredQuantity', line.deliveredQuantity, configManager.resolveUnitCode(line.unitCode)),
    OrderLineReference: () => orderLineRef,
    // S2b: fatura ile AYNI üretici. Eskiden burada 3 alanlık elle kurulmuş bir kopya vardı.
    Item: () => serializeItem(line.item, i2),
  });

  const body = joinLines(inner.map(s => (s.startsWith(i2) ? s : i2 + s)));
  return [`${indent}<cac:DespatchLine>`, body, `${indent}</cac:DespatchLine>`].join('\n');
}
