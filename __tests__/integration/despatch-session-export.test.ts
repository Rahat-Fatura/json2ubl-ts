/**
 * `DespatchSession` ve basitleştirilmiş irsaliye tiplerinin PAKET YÜZEYİ testi.
 *
 * `SessionPaths`'te bir kez yaşanan kusurun (modülde var, paket entry'sinden
 * re-export edilmemiş) oturum sınıfında tekrarlanmaması için. Fatura yüzeyinin
 * DEĞİŞMEDİĞİ de burada çıpalanır.
 */

import { describe, it, expect } from 'vitest';
import {
  DespatchSession,
  DespatchSessionPaths,
  mapSimpleToDespatchInput,
  deriveDespatchFieldVisibility,
  deriveDespatchUIState,
  DEFAULT_DESPATCH_TYPE,
  DEFAULT_DESPATCH_PROFILE,
  InvoiceSession,
  SessionPaths,
  mapSimpleToInvoiceInput,
  type SimpleDespatchInput,
  type SimpleDespatchLineInput,
  type SimpleShipmentInput,
  type SimpleDeliveryAddressInput,
  type SimpleDriverInput,
  type SimpleLicensePlateInput,
  type SimpleLicensePlateScheme,
  type SimpleItemIdentificationInput,
  type SimpleDespatchOrderReferenceInput,
  type SimpleDespatchAdditionalDocumentInput,
  type SimplePartyInput,
  type DespatchUIState,
  type DespatchFieldVisibility,
  type DespatchUnsetScope,
  type DespatchPathErrorCode,
} from '../../src';

describe('e-İrsaliye oturum katmanı — paket yüzeyi', () => {
  it('DespatchSession paket entry\'sinden örneklenebilir', () => {
    const session = new DespatchSession();
    expect(session).toBeInstanceOf(DespatchSession);
    expect(typeof session.update).toBe('function');
    expect(typeof session.unset).toBe('function');
    expect(typeof session.addLine).toBe('function');
    expect(typeof session.validate).toBe('function');
    expect(typeof session.buildXml).toBe('function');
    expect(typeof session.toDespatchInput).toBe('function');
  });

  it('eşleyici ve kurallar motoru dışa verilir', () => {
    expect(typeof mapSimpleToDespatchInput).toBe('function');
    expect(typeof deriveDespatchFieldVisibility).toBe('function');
    expect(typeof deriveDespatchUIState).toBe('function');
    expect(DEFAULT_DESPATCH_TYPE).toBe('SEVK');
    expect(DEFAULT_DESPATCH_PROFILE).toBe('TEMELIRSALIYE');
  });

  it('🔴 irsaliyede OLMAYAN fatura yüzeyi TAŞINMAZ', () => {
    const session = new DespatchSession();
    // calculate / liability / isExport / getAvailableExemptions muadili YOK.
    expect('calculate' in session).toBe(false);
    expect('liability' in session).toBe(false);
    expect('isExport' in session).toBe(false);
    expect('getAvailableExemptions' in session).toBe(false);
    expect('getAllowedProfiles' in session).toBe(false);
  });

  it('fatura yüzeyi DEĞİŞMEDİ — iki oturum yan yana ve ayrık durur', () => {
    expect(typeof InvoiceSession).toBe('function');
    expect(typeof mapSimpleToInvoiceInput).toBe('function');
    expect(SessionPaths.senderTaxNumber).toBe('sender.taxNumber');
    expect(DespatchSessionPaths.senderTaxNumber).toBe('sender.taxNumber');
    expect(SessionPaths).not.toBe(DespatchSessionPaths);
    expect(InvoiceSession).not.toBe(DespatchSession);
  });

  it('tip yüzeyi derlenebilir (compile-time kontrat)', () => {
    /* `SimplePartyInput` fatura ile ORTAKTIR: irsaliye kendi taraf tipini
     * tanımlamaz, aynı tipi kullanır. Aşağıdaki atama bunun kanıtıdır. */
    const party: SimplePartyInput = {
      taxNumber: '1234567890', name: 'X A.Ş.', address: 'Adres',
      district: 'İlçe', city: 'İl',
    };
    const driver: SimpleDriverInput = {
      firstName: 'Ad', familyName: 'Soyad', nationalityId: '12345678901',
    };
    const scheme: SimpleLicensePlateScheme = 'DORSEPLAKA';
    const plate: SimpleLicensePlateInput = { value: '34ABC123', scheme };
    const address: SimpleDeliveryAddressInput = {
      address: 'Adres', district: 'İlçe', city: 'İl', zipCode: '34710',
    };
    const shipment: SimpleShipmentInput = {
      actualDespatchDatetime: '2026-04-23T14:00:00',
      deliveryAddress: address,
      drivers: [driver],
      licensePlates: [plate],
      carrier: party,
    };
    const itemId: SimpleItemIdentificationInput = { scheme: 'KUNYENO', value: 'X'.repeat(19) };
    const line: SimpleDespatchLineInput = {
      name: 'Ürün', quantity: 1, unitCode: 'C62', additionalIdentifications: [itemId],
    };
    const orderRef: SimpleDespatchOrderReferenceInput = { id: 'SIP-1' };
    const doc: SimpleDespatchAdditionalDocumentInput = { id: 'A-1', issueDate: '2026-04-20' };
    const input: SimpleDespatchInput = {
      sender: party, customer: party, shipment, lines: [line],
      orderReferences: [orderRef], additionalDocuments: [doc],
    };

    const scope: DespatchUnsetScope = 'orderReferences';
    const code: DespatchPathErrorCode = 'UNKNOWN_PATH';
    const fields: DespatchFieldVisibility = deriveDespatchFieldVisibility('SEVK', 'TEMELIRSALIYE');
    const state: DespatchUIState = deriveDespatchUIState('SEVK', 'TEMELIRSALIYE');

    expect(input.lines).toHaveLength(1);
    expect(scope).toBe('orderReferences');
    expect(code).toBe('UNKNOWN_PATH');
    expect(fields.requireLicensePlate).toBe(true);
    expect(state.warnings).toEqual([]);
  });
});
