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
    expect(DespatchSessionPaths.type).toBe('type');
    expect(DespatchSessionPaths.profile).toBe('profile');
    // `SimplePartyInput` fatura ile ORTAK → taraf yolları fatura yüzeyiyle simetrik.
    expect(DespatchSessionPaths.senderTaxNumber).toBe('sender.taxNumber');
  });

  it('3. derinlik path\'lerini açar (shipment.deliveryAddress.*)', () => {
    expect(DespatchSessionPaths.shipmentDeliveryAddressCity).toBe('shipment.deliveryAddress.city');
    expect(DespatchSessionPaths.shipmentDeliveryAddressDistrict)
      .toBe('shipment.deliveryAddress.district');
  });

  it('indeksli path\'leri bracket notation üreten fonksiyon olarak açar', () => {
    expect(typeof DespatchSessionPaths.shipmentDriverFirstName).toBe('function');
    expect(DespatchSessionPaths.shipmentDriverFirstName(0)).toBe('shipment.drivers[0].firstName');
    expect(DespatchSessionPaths.shipmentLicensePlateValue(2)).toBe('shipment.licensePlates[2].value');
    expect(DespatchSessionPaths.lineQuantity(1)).toBe('lines[1].quantity');
  });

  it('çift indeksli path\'i açar (kalem künye/etiket kimliği)', () => {
    expect(DespatchSessionPaths.lineAdditionalIdentificationScheme(0, 1))
      .toBe('lines[0].additionalIdentifications[1].scheme');
  });

  it('şablon set\'i ve boş read-only set\'i dışa verilir', () => {
    expect(DESPATCH_KNOWN_PATH_TEMPLATES.has('shipment.drivers[*].firstName')).toBe(true);
    expect(DESPATCH_KNOWN_PATH_TEMPLATES.has('shipment.deliveryAddress.city')).toBe(true);
    expect(DESPATCH_READ_ONLY_PATHS.size).toBe(0);
  });

  it('DespatchSessionPathMap tip daraltmasını korur (compile-time kontrat)', () => {
    const path: keyof DespatchSessionPathMap = DespatchSessionPaths.shipmentDeliveryAddressCity;
    expect(path).toBe('shipment.deliveryAddress.city');
  });

  it('fatura yüzeyi değişmedi — SessionPaths yerinde ve ayrık', () => {
    expect(SessionPaths.senderTaxNumber).toBe('sender.taxNumber');
    expect(SessionPaths).not.toBe(DespatchSessionPaths);
  });
});
