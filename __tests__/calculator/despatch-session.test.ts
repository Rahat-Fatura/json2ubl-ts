/**
 * DespatchSession — yapı, yol kapıları, satır CRUD, doğrulama ve XML üretimi.
 *
 * Fatura emsali `invoice-session.test.ts` + `invoice-session-update.test.ts`;
 * buradaki iddialar aynı soruları irsaliye için sorar. İrsaliyede KARŞILIĞI
 * OLMAYAN sorular (hesaplama, mükellefiyet, ihracat kilidi, öneri motoru)
 * bilerek YOKTUR.
 */

import { describe, it, expect } from 'vitest';
import { DespatchSession } from '../../src/calculator/despatch-session';
import type { DespatchPathErrorPayload } from '../../src/calculator/despatch-session';
import { DespatchSessionPaths } from '../../src/calculator/despatch-session-paths.generated';
import type { SimpleDespatchInput } from '../../src/calculator/simple-despatch-types';

function completeInput(): SimpleDespatchInput {
  return {
    id: 'IRS2026000000101',
    uuid: 'e1a2b3c4-0101-4000-8101-000000000101',
    datetime: '2026-04-23T10:00:00',
    sender: {
      taxNumber: '1234567890', name: 'Gönderici A.Ş.', address: 'Barbaros Bulvarı No:123',
      district: 'Üsküdar', city: 'İstanbul', zipCode: '34664', taxOffice: 'Üsküdar',
    },
    customer: {
      taxNumber: '9876543210', name: 'Alıcı Ltd. Şti.', address: 'Bağdat Caddesi No:456',
      district: 'Kadıköy', city: 'İstanbul', zipCode: '34710', taxOffice: 'Kadıköy',
    },
    shipment: {
      actualDespatchDatetime: '2026-04-23T14:00:00',
      deliveryAddress: {
        address: 'Bağdat Caddesi No:456', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710',
      },
      drivers: [{ firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' }],
      licensePlates: [{ value: '34ABC123' }],
    },
    lines: [{ name: 'Standart Ürün', quantity: 10, unitCode: 'Adet' }],
  };
}

function capturePathErrors(session: DespatchSession): DespatchPathErrorPayload[] {
  const errors: DespatchPathErrorPayload[] = [];
  session.on('path-error', e => errors.push(e));
  return errors;
}

// ─── Yapıcı ──────────────────────────────────────────────────────────────────

describe('DespatchSession — yapıcı', () => {
  it('boş oturumda zorunlu alanları mount eder ve varsayılan tip/profili kurar', () => {
    const session = new DespatchSession();
    expect(session.input.type).toBe('SEVK');
    expect(session.input.profile).toBe('TEMELIRSALIYE');
    expect(session.input.sender.taxNumber).toBe('');
    expect(session.input.lines).toEqual([]);
  });

  it('🔴 fiili sevk anını UYDURMAZ — boş oturumda boş kalır', () => {
    expect(new DespatchSession().input.shipment.actualDespatchDatetime).toBe('');
  });

  it('yapıcı uiState\'i KURAR — update() yoluyla aynı anlık görüntü elde edilir', () => {
    /* Faturada tam bu asimetri yaşandı: yapıcı `warnings` doldurmuyordu, aynı
     * girdi iki yolda iki farklı uiState üretiyordu (kayıtlı taslak açılınca
     * uyarılar boş). İrsaliyede yapıcı ilk anlık görüntüyü SAF modül
     * fonksiyonlarıyla kurar. */
    const fromConstructor = new DespatchSession({ initialInput: completeInput() });
    expect(fromConstructor.uiState.fields).toBeDefined();
    expect(fromConstructor.warnings).toEqual([]);
  });

  it('yapıcıda OLAY YAYMAZ (dinleyici henüz bağlanmamıştır)', () => {
    // Dinleyici yapıcıdan SONRA bağlanır; yapıcı yayınlasaydı zaten kaçırılırdı.
    // Burada kanıtlanan: kurulum sonrası state hazır ama hiçbir şey tetiklenmemiş.
    const session = new DespatchSession({ initialInput: completeInput() });
    let fired = false;
    session.on('ui-state-changed', () => { fired = true; });
    expect(fired).toBe(false);
  });

  it('initialInput ile gelen tip/profil korunur', () => {
    const session = new DespatchSession({
      initialInput: { type: 'MATBUDAN', profile: 'HKSIRSALIYE' },
    });
    expect(session.input.type).toBe('MATBUDAN');
    expect(session.input.profile).toBe('HKSIRSALIYE');
  });
});

// ─── Yol kapıları ────────────────────────────────────────────────────────────

describe('DespatchSession — update() yol kapıları', () => {
  it('bilinen yolu uygular', () => {
    const session = new DespatchSession();
    session.update(DespatchSessionPaths.senderTaxNumber, '1234567890');
    expect(session.input.sender.taxNumber).toBe('1234567890');
  });

  it('Katman 1 — bozuk sözdizimi INVALID_PATH', () => {
    const session = new DespatchSession();
    const errors = capturePathErrors(session);
    session.update('lines[' as never, 'x' as never);
    expect(errors[0]?.code).toBe('INVALID_PATH');
    expect(errors[0]?.requestedValue).toBe('x');
  });

  it('Katman 3 — haritada olmayan yol UNKNOWN_PATH', () => {
    const session = new DespatchSession();
    const errors = capturePathErrors(session);
    session.update('hayaletAlan' as never, 1 as never);
    expect(errors[0]?.code).toBe('UNKNOWN_PATH');
    expect(errors[0]?.requestedValue).toBe(1);
  });

  it('Katman 4 — taşan indeks INDEX_OUT_OF_BOUNDS ve requestedValue TAŞIMAZ', () => {
    /* 🔴 Asimetri bilinçlidir: 1-3. katmanlar çağıranın değerini taşır, 4. taşımaz
     * — hata değerde değil yolun kendisindedir. Fatura davranışıyla aynı. */
    const session = new DespatchSession({ initialInput: completeInput() });
    const errors = capturePathErrors(session);
    session.update(DespatchSessionPaths.lineQuantity(5), 1);
    expect(errors[0]?.code).toBe('INDEX_OUT_OF_BOUNDS');
    expect(errors[0]).not.toHaveProperty('requestedValue');
  });

  it('salt-okuma kümesi BOŞ — irsaliyede yapıcı kilidi yoktur', () => {
    const session = new DespatchSession();
    const errors = capturePathErrors(session);
    session.update(DespatchSessionPaths.type, 'MATBUDAN');
    expect(errors.filter(e => e.code === 'READ_ONLY_PATH')).toHaveLength(0);
  });

  it('aynı değerle çağrı NO-OP — olay yayılmaz', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    let changed = 0;
    session.on('changed', () => changed++);
    session.update(DespatchSessionPaths.senderTaxNumber, '1234567890');
    expect(changed).toBe(0);
  });

  it('🔑 tip/profil DÜZ STRING — cast gerekmeden atanır', () => {
    const session = new DespatchSession();
    session.update(DespatchSessionPaths.type, 'MATBUDAN');
    session.update(DespatchSessionPaths.profile, 'IDISIRSALIYE');
    expect(session.input.type).toBe('MATBUDAN');
    expect(session.input.profile).toBe('IDISIRSALIYE');
  });

  it('opsiyonel dizi yolu ilk kez indeks 0 ile yazılabilir', () => {
    const session = new DespatchSession();
    session.update(DespatchSessionPaths.shipmentDriverFirstName(0), 'Mehmet');
    expect(session.input.shipment.drivers?.[0].firstName).toBe('Mehmet');
  });
});

// ─── unset ───────────────────────────────────────────────────────────────────

describe('DespatchSession — unset()', () => {
  it('opsiyonel composite alanı tamamen kaldırır', () => {
    const session = new DespatchSession({
      initialInput: { ...completeInput(), despatchContactName: 'Teslim Eden' },
    });
    session.unset('despatchContactName');
    expect(session.input.despatchContactName).toBeUndefined();
    expect('despatchContactName' in session.input).toBe(false);
  });

  it('zaten tanımsız alanda NO-OP', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    let changed = 0;
    session.on('changed', () => changed++);
    session.unset('notes');
    expect(changed).toBe(0);
  });

  it('unset sonrası alt-yol ile yeniden mount edilebilir', () => {
    const session = new DespatchSession({
      initialInput: { ...completeInput(), additionalDocuments: [{ id: 'A', issueDate: '2026-04-20' }] },
    });
    session.unset('additionalDocuments');
    expect(session.input.additionalDocuments).toBeUndefined();
    session.update(DespatchSessionPaths.additionalDocumentId(0), 'B');
    expect(session.input.additionalDocuments?.[0].id).toBe('B');
  });
});

// ─── Satır CRUD ──────────────────────────────────────────────────────────────

describe('DespatchSession — satır CRUD', () => {
  it('addLine / updateLine / removeLine / setLines', () => {
    const session = new DespatchSession();
    session.addLine({ name: 'A', quantity: 1, unitCode: 'C62' });
    session.addLine({ name: 'B', quantity: 2, unitCode: 'C62' });
    expect(session.input.lines).toHaveLength(2);

    session.updateLine(0, { quantity: 5 });
    expect(session.input.lines[0].quantity).toBe(5);

    session.removeLine(0);
    expect(session.input.lines.map(l => l.name)).toEqual(['B']);

    session.setLines([{ name: 'C', quantity: 3, unitCode: 'C62' }]);
    expect(session.input.lines.map(l => l.name)).toEqual(['C']);
  });

  it('sınır dışı indekste updateLine/removeLine NO-OP', () => {
    const session = new DespatchSession();
    session.addLine({ name: 'A', quantity: 1, unitCode: 'C62' });
    session.updateLine(9, { quantity: 99 });
    session.removeLine(-1);
    expect(session.input.lines).toEqual([{ name: 'A', quantity: 1, unitCode: 'C62' }]);
  });

  it('line-added / line-updated / line-removed olaylarını yayar', () => {
    const session = new DespatchSession();
    const seen: string[] = [];
    session.on('line-added', () => seen.push('added'));
    session.on('line-updated', () => seen.push('updated'));
    session.on('line-removed', () => seen.push('removed'));
    session.addLine({ name: 'A', quantity: 1, unitCode: 'C62' });
    session.updateLine(0, { quantity: 2 });
    session.removeLine(0);
    expect(seen).toEqual(['added', 'updated', 'removed']);
  });
});

// ─── Taraf kimlikleri ────────────────────────────────────────────────────────

describe('DespatchSession — taraf kimlikleri', () => {
  it('setIdentifications yazar, removeIdentification son elemanda alanı kaldırır', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    session.setIdentifications('sender', [{ schemeId: 'SEVKIYATNO', value: 'SE-0000001' }]);
    expect(session.input.sender.identifications).toHaveLength(1);
    session.removeIdentification('sender', 0);
    expect(session.input.sender.identifications).toBeUndefined();
  });

  it('boş dizi verildiğinde alan undefined yapılır (boş schemeID yazılmasın)', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    session.setIdentifications('sender', [{ schemeId: 'MUSTERINO', value: '1' }]);
    session.setIdentifications('sender', []);
    expect(session.input.sender.identifications).toBeUndefined();
  });

  it('mount edilmemiş tarafta NO-OP', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    session.setIdentifications('originator', [{ schemeId: 'MERSISNO', value: '1' }]);
    expect(session.input.originator).toBeUndefined();
  });
});

// ─── uiState / görünürlük ────────────────────────────────────────────────────

describe('DespatchSession — uiState ve alan görünürlüğü', () => {
  it('SEVK\'te ek belge zorunlu DEĞİL, MATBUDAN\'da zorunlu', () => {
    const session = new DespatchSession();
    expect(session.fields.requireAdditionalDocuments).toBe(false);
    session.update(DespatchSessionPaths.type, 'MATBUDAN');
    expect(session.fields.requireAdditionalDocuments).toBe(true);
  });

  it('profil değişimi KUNYENO/ETIKETNO zorunluluklarını açar', () => {
    const session = new DespatchSession();
    session.update(DespatchSessionPaths.profile, 'HKSIRSALIYE');
    expect(session.fields.requireItemKunyeNo).toBe(true);
    expect(session.fields.requireItemEtiketNo).toBe(false);

    session.update(DespatchSessionPaths.profile, 'IDISIRSALIYE');
    expect(session.fields.requireItemKunyeNo).toBe(false);
    expect(session.fields.requireItemEtiketNo).toBe(true);
    expect(session.fields.requireSevkiyatNo).toBe(true);
  });

  it('plaka ve şoför/taşıyıcı zorunlulukları HER ZAMAN açıktır', () => {
    const session = new DespatchSession();
    expect(session.fields.requireLicensePlate).toBe(true);
    expect(session.fields.requireDriverOrCarrier).toBe(true);
    session.update(DespatchSessionPaths.profile, 'IDISIRSALIYE');
    expect(session.fields.requireLicensePlate).toBe(true);
  });

  it('geriye dönük sevk yalnız MATBUDAN\'da serbesttir', () => {
    const session = new DespatchSession();
    expect(session.fields.allowBackdatedDespatch).toBe(false);
    session.update(DespatchSessionPaths.type, 'MATBUDAN');
    expect(session.fields.allowBackdatedDespatch).toBe(true);
  });

  it('görünürlük geçişleri field-activated / field-deactivated olarak yayılır', () => {
    const session = new DespatchSession();
    const activated: string[] = [];
    const deactivated: string[] = [];
    session.on('field-activated', p => activated.push(p.path));
    session.on('field-deactivated', p => deactivated.push(p.path));

    session.update(DespatchSessionPaths.profile, 'HKSIRSALIYE');
    expect(activated).toContain('fields.requireItemKunyeNo');

    session.update(DespatchSessionPaths.profile, 'TEMELIRSALIYE');
    expect(deactivated).toContain('fields.requireItemKunyeNo');
  });

  it('uiState uyarıları updateUIState turlarında SİLİNMEZ', () => {
    const session = new DespatchSession();          // eksik zorunlu alanlar → uyarı dolu
    session.validate();
    const before = session.warnings.length;
    expect(before).toBeGreaterThan(0);
    session.update(DespatchSessionPaths.senderName, 'X');
    expect(session.warnings.length).toBeGreaterThan(0);
  });
});

// ─── validate / buildXml ─────────────────────────────────────────────────────

describe('DespatchSession — validate() ve buildXml()', () => {
  it('tam girdide uyarı üretmez', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    expect(session.validate()).toEqual([]);
  });

  it('eksik girdide ValidationError akışını ve köprülenmiş uyarıları yayar', () => {
    const session = new DespatchSession();
    let rawErrors: unknown[] = [];
    let warnings: unknown[] = [];
    session.on('validation-error', e => { rawErrors = e; });
    session.on('warnings', w => { warnings = w; });
    session.validate();
    expect(rawErrors.length).toBeGreaterThan(0);
    expect(warnings).toHaveLength(rawErrors.length);
  });

  it('köprü her ValidationError\'ı severity="error" uyarıya çevirir', () => {
    const session = new DespatchSession();
    const warnings = session.validate();
    expect(warnings.every(w => w.severity === 'error')).toBe(true);
    expect(warnings.every(w => typeof w.code === 'string')).toBe(true);
  });

  it('plaka yoksa reddeder — taşıyıcı firma verilse BİLE (LicensePlateIDCheck)', () => {
    const input = completeInput();
    input.shipment.licensePlates = undefined;
    input.shipment.carrier = {
      taxNumber: '1112223334', name: 'Nakliyeci A.Ş.',
      address: 'Liman Cad. 5', district: 'Konak', city: 'İzmir',
    };
    const session = new DespatchSession({ initialInput: input });
    expect(session.validate().some(w => w.code === 'DESPATCH_LICENSE_PLATE_REQUIRED')).toBe(true);
  });

  it('şoför de taşıyıcı da yoksa reddeder (DespatchCarrierDriverCheck)', () => {
    const input = completeInput();
    input.shipment.drivers = undefined;
    const session = new DespatchSession({ initialInput: input });
    expect(session.validate().some(w => w.field === 'shipment.driverPersons/carrierParty')).toBe(true);
  });

  it('⚠ ŞEMATRON YALNIZ İLK ŞOFÖRÜ DENETLER — biz HEPSİNİ denetleriz', () => {
    /* `DespatchCarrierDriverCheck` `string(node-set)` kullandığı için ikinci
     * şoförün boş alanı GİB kapısından geçer. Kapı bizde. */
    const input = completeInput();
    input.shipment.drivers = [
      { firstName: 'Mehmet', familyName: 'Sürücü', nationalityId: '12345678901' },
      { firstName: '', familyName: '', nationalityId: '' },
    ];
    const session = new DespatchSession({ initialInput: input });
    const warnings = session.validate();
    expect(warnings.some(w => w.field === 'shipment.driverPersons[1].firstName')).toBe(true);
    expect(warnings.some(w => w.field === 'shipment.driverPersons[1].familyName')).toBe(true);
    expect(warnings.some(w => w.field === 'shipment.driverPersons[1].nationalityId')).toBe(true);
  });

  it('MATBUDAN ek belgesiz reddedilir', () => {
    const session = new DespatchSession({ initialInput: { ...completeInput(), type: 'MATBUDAN' } });
    expect(session.validate().some(w => w.field === 'additionalDocuments')).toBe(true);
  });

  it('HKSIRSALIYE\'de KUNYENO 19 karakter olmalıdır', () => {
    const input = { ...completeInput(), profile: 'HKSIRSALIYE' };
    input.lines = [{
      name: 'Ürün', quantity: 1, unitCode: 'C62',
      additionalIdentifications: [{ scheme: 'KUNYENO', value: 'KISA' }],
    }];
    const session = new DespatchSession({ initialInput: input });
    expect(session.validate().some(w => w.message.includes('19 karakter'))).toBe(true);
  });

  it('toDespatchInput() ham girdiyi üretir', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    const raw = session.toDespatchInput();
    expect(raw.id).toBe('IRS2026000000101');
    expect(raw.issueTime).toBe('10:00:00');
    expect(raw.lines[0].deliveredQuantity).toBe(10);
  });

  it('buildXml() strict modda geçerli UBL-TR DespatchAdvice üretir', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    const xml = session.buildXml({ validationLevel: 'strict' });
    expect(xml).toContain('<cbc:ProfileID>TEMELIRSALIYE</cbc:ProfileID>');
    expect(xml).toContain('<cbc:DespatchAdviceTypeCode>SEVK</cbc:DespatchAdviceTypeCode>');
    expect(xml).toContain('<cbc:IssueTime>10:00:00</cbc:IssueTime>');
    expect(xml).toContain('34ABC123');
  });

  it('buildXml() strict modda geçersiz girdide atar', () => {
    const session = new DespatchSession();
    expect(() => session.buildXml({ validationLevel: 'strict' })).toThrow();
  });

  it('buildXml() varsayılanı doğrulamasızdır (fatura oturumuyla aynı)', () => {
    const session = new DespatchSession({ initialInput: completeInput() });
    expect(() => session.buildXml()).not.toThrow();
  });
});

/* ── Belge numarası: OTURUM aşamasında zorunlu DEĞİL ────────────────────────
 *
 * 🔴 Fatura emsali: `InvoiceSession` numara kuralını HİÇ koşmaz — o kural ham
 * `validateCommon`dadır ve yalnız `InvoiceBuilder.build` yolundan geçer. Sebep
 * ürünseldir: numarayı gönderim anında seri/numara motoru (mimkit) verir, form
 * düzenlenirken alan BOŞ OLMALIDIR.
 *
 * İrsaliye oturumu ham doğrulayıcıyı çağırdığı için bu kural sızıyordu ve tamamen
 * doldurulmuş bir irsaliye ekranda "İrsaliye numarası zorunludur" diyordu.
 */
describe('belge numarası — oturum aşaması', () => {
  const numarasiz = (): SimpleDespatchInput => {
    const input = completeInput();
    delete input.id;
    return input;
  };

  it('numarasız TAM irsaliye oturumda HİÇ uyarı üretmez', () => {
    expect(new DespatchSession({ initialInput: numarasiz() }).warnings).toEqual([]);
  });

  it('numarasız irsaliye XML kurulabilir ve cbc:ID DOĞMAZ (seriesPrefix yolu)', () => {
    const xml = new DespatchSession({ initialInput: numarasiz() }).buildXml({
      validationLevel: 'none',
    });
    // Kök `cbc:ID` yalnız ilk `cac:` bloğundan ÖNCE aranır — satır/taraf ID'leri karışmasın.
    expect(/<cbc:ID>/.test(xml.split('<cac:')[0])).toBe(false);
  });

  it('numara VARSA biçimi oturumda da denetlenir — elle yazılan yanlış numara sessiz kalmaz', () => {
    const input = numarasiz();
    input.id = 'BOZUK-NUMARA';
    const uyarilar = new DespatchSession({ initialInput: input }).warnings;
    expect(uyarilar.map((w) => w.field)).toContain('id');
  });

  it('BİTMİŞ belge yolu numarayı hâlâ ZORUNLU tutar (DespatchBuilder değişmedi)', async () => {
    const { DespatchBuilder } = await import('../../src/builders/despatch-builder');
    const { mapSimpleToDespatchInput } = await import('../../src/calculator/simple-despatch-mapper');
    /* Ham `ValidationError` alanı `path`tir (`field` DEĞİL) — oturumun yaydığı
       `ValidationWarning`den farklı şekil; köprü ikisini birbirine çevirir. */
    const hatalar = new DespatchBuilder().validate(mapSimpleToDespatchInput(numarasiz()));
    expect(hatalar.map((e) => e.path)).toContain('id');
  });
});
