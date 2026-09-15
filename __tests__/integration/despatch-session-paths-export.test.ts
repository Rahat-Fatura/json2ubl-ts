/**
 * DespatchSessionPaths public runtime export testleri.
 *
 * `SessionPaths`'te bir kez yaşanan kusurun (generated dosyada var, paket
 * entry'sinden re-export edilmemiş) irsaliye tarafında tekrarlanmaması için.
 * Fatura yüzeyinin DEĞİŞMEDİĞİ de burada çıpalanır.
 */

import { describe, it, expect } from 'vitest';
import {
  DespatchSessionPaths,
  DESPATCH_KNOWN_PATH_TEMPLATES,
  DESPATCH_READ_ONLY_PATHS,
  SessionPaths,
  type DespatchSessionPathMap,
} from '../../src';

describe('DespatchSessionPaths public export', () => {
  it('paket entry\'sinden runtime sabit olarak import edilebilir', () => {
    expect(DespatchSessionPaths).toBeDefined();
    expect(typeof DespatchSessionPaths).toBe('object');
  });

  it('doc-level path sabitlerini string olarak açar', () => {
    expect(DespatchSessionPaths.id).toBe('id');
    expect(DespatchSessionPaths.uuid).toBe('uuid');
    expect(DespatchSessionPaths.profileId).toBe('profileId');
    expect(DespatchSessionPaths.despatchTypeCode).toBe('despatchTypeCode');
    expect(DespatchSessionPaths.supplierVknTckn).toBe('supplier.vknTckn');
  });

  it('3. derinlik path\'lerini açar (shipment.deliveryAddress.*)', () => {
    expect(DespatchSessionPaths.shipmentDeliveryAddressCityName).toBe('shipment.deliveryAddress.cityName');
    expect(DespatchSessionPaths.shipmentDeliveryAddressCitySubdivisionName)
      .toBe('shipment.deliveryAddress.citySubdivisionName');
  });

  it('indeksli path\'leri bracket notation üreten fonksiyon olarak açar', () => {
    expect(typeof DespatchSessionPaths.shipmentDriverPersonFirstName).toBe('function');
    expect(DespatchSessionPaths.shipmentDriverPersonFirstName(0)).toBe('shipment.driverPersons[0].firstName');
    expect(DespatchSessionPaths.shipmentLicensePlatePlateNumber(2)).toBe('shipment.licensePlates[2].plateNumber');
    expect(DespatchSessionPaths.lineDeliveredQuantity(1)).toBe('lines[1].deliveredQuantity');
  });

  it('çift indeksli 4. derinlik path\'ini açar (kalem künye/etiket kimliği)', () => {
    expect(DespatchSessionPaths.lineItemAdditionalItemIdentificationSchemeId(0, 1))
      .toBe('lines[0].item.additionalItemIdentifications[1].schemeId');
  });

  it('şablon set\'i ve boş read-only set\'i dışa verilir', () => {
    expect(DESPATCH_KNOWN_PATH_TEMPLATES.has('shipment.driverPersons[*].firstName')).toBe(true);
    expect(DESPATCH_KNOWN_PATH_TEMPLATES.has('shipment.deliveryAddress.cityName')).toBe(true);
    expect(DESPATCH_READ_ONLY_PATHS.size).toBe(0);
  });

  it('DespatchSessionPathMap tip daraltmasını korur (compile-time kontrat)', () => {
    const path: keyof DespatchSessionPathMap = DespatchSessionPaths.shipmentDeliveryAddressCityName;
    expect(path).toBe('shipment.deliveryAddress.cityName');
  });

  it('fatura yüzeyi değişmedi — SessionPaths yerinde ve ayrık', () => {
    expect(SessionPaths.senderTaxNumber).toBe('sender.taxNumber');
    expect(SessionPaths).not.toBe(DespatchSessionPaths);
  });
});
