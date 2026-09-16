/**
 * S3 — `cac:RoadTransport/cbc:LicensePlateID` **1..1** kardinalite kapısı.
 *
 * ## Neden bu test var
 *
 * Kural ŞEMATRONDA YOKTUR; kaynağı GİB XSD'sidir
 * (`UBL-CommonAggregateComponents-2.1.xsd:2576-2580` — `maxOccurs` verilmemiş,
 * yani varsayılan 1). `delivery-serializer.serializeTransportMeans` N plakayı
 * TEK `cac:RoadTransport` içine basıyor ve hiçbir uyarı vermiyordu.
 *
 * Canlı doğrulayıcı ölçümü (paket 2026-08-05, `examples-matrix/valid/temelirsaliye/
 * temelirsaliye-sevk-dorse-plate/output.xml`):
 *
 * ```
 * Satır 78, Sütun 48: cvc-complex-type.2.4.d: Invalid content was found
 * starting with element 'cbc:LicensePlateID'. No child element is expected at
 * this point.
 * ```
 *
 * Yani belge sessizce XSD-geçersiz üretiliyordu. Kapı artık BİZDE.
 */

import { describe, it, expect } from 'vitest';
import { validateDespatch } from '../../src/validators/despatch-validators';
import { licensePlateCardinalityRule } from '../../src/validators/rules/xsd-cardinality-rules';
import { DespatchProfileId, DespatchTypeCode } from '../../src/types/enums';
import type { DespatchInput, LicensePlateInput } from '../../src/types/despatch-input';

function createInput(plates: LicensePlateInput[]): DespatchInput {
  return {
    id: 'ABC2024000000001',
    uuid: '12345678-1234-1234-1234-123456789012',
    profileId: DespatchProfileId.TEMELIRSALIYE,
    despatchTypeCode: DespatchTypeCode.SEVK,
    issueDate: '2024-01-15',
    issueTime: '10:30:00',
    supplier: {
      vknTckn: '1234567890', taxIdType: 'VKN', name: 'Sender',
      cityName: 'İstanbul', citySubdivisionName: 'Kadıköy', country: 'Türkiye',
    },
    customer: {
      vknTckn: '0987654321', taxIdType: 'VKN', name: 'Receiver',
      cityName: 'Ankara', citySubdivisionName: 'Çankaya', country: 'Türkiye',
    },
    shipment: {
      actualDespatchDate: '2024-01-15',
      actualDespatchTime: '14:00:00',
      deliveryAddress: {
        citySubdivisionName: 'Çankaya', cityName: 'Ankara',
        postalZone: '06100', country: 'Türkiye',
      },
      driverPersons: [{ firstName: 'M', familyName: 'K', nationalityId: '12345678901' }],
      licensePlates: plates,
    },
    lines: [{ id: '1', deliveredQuantity: 10, unitCode: 'C62', item: { name: 'X' } }],
  };
}

const cardinalityErrors = (input: DespatchInput) =>
  validateDespatch(input).filter(e => e.code === 'XSD_CARDINALITY');

describe('S3 · çoklu plaka artık SESSİZ geçmiyor', () => {
  it('tek plaka geçerlidir', () => {
    expect(cardinalityErrors(createInput([{ plateNumber: '34ABC123', schemeId: 'PLAKA' }]))).toHaveLength(0);
  });

  it('🔴 çekici + dorse aynı dizide ise REDDEDİLİR', () => {
    const errors = cardinalityErrors(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '34DRS456', schemeId: 'DORSE' },
    ]));
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe('shipment.licensePlates');
    expect(errors[0].actual).toBe('2 plaka');
  });

  it('hata mesajı KANONİK YERİ gösterir (kullanıcı nereye yazacağını bilmeli)', () => {
    const [error] = cardinalityErrors(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '34DRS456', schemeId: 'DORSE' },
    ]));
    expect(error.message).toContain('transportHandlingUnits');
    expect(error.message).toContain('trailerPlates');
    // Fazlalık plaka ADIYLA söylenir — kullanıcı hangisini taşıyacağını görmeli.
    expect(error.message).toContain('34DRS456');
    expect(error.message).not.toContain('34ABC123');
  });

  it('üç plaka da REDDEDİLİR (kural 1..1, "2 tane" değil)', () => {
    const errors = cardinalityErrors(createInput([
      { plateNumber: '34ABC123', schemeId: 'PLAKA' },
      { plateNumber: '34DRS456', schemeId: 'DORSE' },
      { plateNumber: '34DRS789', schemeId: 'DORSEPLAKA' },
    ]));
    expect(errors[0].actual).toBe('3 plaka');
  });
});

describe('S3 · yüklem saftır — belge türü bilmez', () => {
  it('boş dizi ve tek eleman ihlal DEĞİLDİR', () => {
    expect(licensePlateCardinalityRule(undefined, 'p')).toHaveLength(0);
    expect(licensePlateCardinalityRule([], 'p')).toHaveLength(0);
    expect(licensePlateCardinalityRule([{ plateNumber: '34A1' }], 'p')).toHaveLength(0);
  });

  it('BOŞ plaka numarası sayılmaz — XML\'e yazılmayan düğüm kardinaliteyi doldurmaz', () => {
    expect(licensePlateCardinalityRule(
      [{ plateNumber: '34ABC123' }, { plateNumber: '   ' }, { plateNumber: '' }],
      'p',
    )).toHaveLength(0);
  });

  it('yol dışarıdan gelir — yüklem alan adı bilmez', () => {
    const [error] = licensePlateCardinalityRule(
      [{ plateNumber: 'A' }, { plateNumber: 'B' }],
      'baska.yol',
    );
    expect(error.path).toBe('baska.yol');
  });
});
