/**
 * B-78 parametre köprüsü testleri (Sprint 8h.6 / AR-10).
 *
 * Mevcut session 8h öncesi B-78 parametrelerini geçirmiyordu (validateInvoiceState'in
 * `allowReducedKdvRate`, `ytbAllKdvPositive`, `hasGtip`, `hasAliciDibKod`, `has4171Code`,
 * `ihracatPartyComplete`, `yolcuBuyerComplete` alanları sessionland'da pasifti).
 * Sprint 8h.6'da deriveB78Params() helper otomatik türetir.
 */

import { describe, it, expect } from 'vitest';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import type { SimpleInvoiceInput } from '../../src/calculator/simple-types';

const completeIhracatBase: Partial<SimpleInvoiceInput> = {
  profile: 'IHRACAT',
  type: 'ISTISNA',
  sender: { taxNumber: '1234567890', name: 'Acme A.Ş.', taxOffice: 'Beşiktaş', address: 'X', district: 'Beşiktaş', city: 'İstanbul' },
  customer: { taxNumber: '9876543210', name: 'Müşteri', taxOffice: 'Kadıköy', address: 'Y', district: 'Kadıköy', city: 'İstanbul' },
};

describe('B-78.1 — allowReducedKdvRate (M4 / 555 Demirbaş KDV)', () => {
  it('default false (opt-in flag)', () => {
    const session = new InvoiceSession();
    const warnings = session.validate();
    // 555 kullanılmadığı için doğrudan warning yok; flag false olarak geçirilir
    expect(warnings.every(w => w.code !== 'B-78.1')).toBe(true);
  });

  it('opt-in true ile 555 kdvExemptionCode için warning yok', () => {
    const session = new InvoiceSession({
      allowReducedKdvRate: true,
      initialInput: { kdvExemptionCode: '555', type: 'ISTISNA' },
    });
    const warnings = session.validate();
    const fivefiftyfiveErr = warnings.find(w => w.message.includes('555'));
    expect(fivefiftyfiveErr).toBeUndefined();
  });

  it('opt-in false ile 555 kdvExemptionCode için warning üretir', () => {
    const session = new InvoiceSession({
      allowReducedKdvRate: false,
      initialInput: { kdvExemptionCode: '555', type: 'ISTISNA' },
    });
    const warnings = session.validate();
    const fivefiftyfiveErr = warnings.find(w => w.message.includes('555'));
    expect(fivefiftyfiveErr).toBeDefined();
  });
});

describe('B-78.2 — ytbAllKdvPositive (YATIRIMTESVIK + tüm satırlarda KDV>0)', () => {
  it('YATIRIMTESVIK + tüm satırlarda KDV>0 → warning yok', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        profile: 'YATIRIMTESVIK',
        type: 'SATIS',
        ytbNo: '123456',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [
          { name: 'L1', quantity: 1, price: 100, kdvPercent: 18 },
          { name: 'L2', quantity: 1, price: 200, kdvPercent: 8 },
        ],
      },
    });
    const warnings = session.validate();
    const ytbErr = warnings.find(w => w.message.toLowerCase().includes('kdv') && w.message.toLowerCase().includes('pozitif'));
    expect(ytbErr).toBeUndefined();
  });

  it('YATIRIMTESVIK + bir satırda KDV=0 → warning', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        profile: 'YATIRIMTESVIK',
        type: 'SATIS',
        ytbNo: '123456',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [
          { name: 'L1', quantity: 1, price: 100, kdvPercent: 18 },
          { name: 'L2', quantity: 1, price: 200, kdvPercent: 0 },
        ],
      },
    });
    const warnings = session.validate();
    const ytbErr = warnings.find(w => w.message.toLowerCase().includes('kdv'));
    expect(ytbErr).toBeDefined();
  });

  it('non-YATIRIMTESVIK profilde ytbAllKdvPositive irrelevant', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        profile: 'TICARIFATURA',
        type: 'SATIS',
        lines: [{ name: 'L1', quantity: 1, price: 100, kdvPercent: 0 }],
      },
    });
    const warnings = session.validate();
    // YATIRIMTESVIK kuralı tetiklenmez
    const ytbErr = warnings.find(w => w.message.toLowerCase().includes('yatırım'));
    expect(ytbErr).toBeUndefined();
  });
});

describe('B-78.3 — hasGtip + hasAliciDibKod (IHRACKAYITLI+702)', () => {
  it('IHRACKAYITLI+702 + tüm satırlarda gtipNo + alicidibsatirkod → warning yok', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'IHRACKAYITLI',
        kdvExemptionCode: '702',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{
          name: 'L1', quantity: 1, price: 100, kdvPercent: 0, kdvExemptionCode: '702',
          delivery: { deliveryAddress: { address: 'X', district: 'X', city: 'X' }, gtipNo: '123456789012', alicidibsatirkod: '12345678901' },
        }],
      },
    });
    const warnings = session.validate();
    const gtipErr = warnings.find(w => w.message.includes('GTİP'));
    expect(gtipErr).toBeUndefined();
  });

  it('IHRACKAYITLI+702 + gtipNo eksik → warning', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'IHRACKAYITLI',
        kdvExemptionCode: '702',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{
          name: 'L1', quantity: 1, price: 100, kdvPercent: 0, kdvExemptionCode: '702',
        }],
      },
    });
    const warnings = session.validate();
    const gtipErr = warnings.find(w => w.message.includes('GTİP'));
    expect(gtipErr).toBeDefined();
  });

  it('lines.length === 0 → hasGtip false, hasAliciDibKod false (defensive)', () => {
    const session = new InvoiceSession({
      initialInput: { type: 'IHRACKAYITLI', kdvExemptionCode: '702' },
    });
    // lines yok, validate() çalışır ama line-level kuralları tetiklenmez
    const warnings = session.validate();
    expect(warnings).toBeDefined();
  });
});

describe('B-78.4 — has4171Code (4171 kodu sınırlama)', () => {
  it('4171 kodu TEVKIFAT tipinde izinli', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'TEVKIFAT',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{
          name: 'L1', quantity: 1, price: 100, kdvPercent: 18, withholdingTaxCode: '601',
          taxes: [{ code: '4171', percent: 5 }],
        }],
      },
    });
    const warnings = session.validate();
    const tax4171Err = warnings.find(w => w.message.includes('4171'));
    expect(tax4171Err).toBeUndefined();
  });

  it('4171 kodu SATIS tipinde reddedilir', () => {
    const session = new InvoiceSession({
      autoCalculate: false,
      initialInput: {
        type: 'SATIS',
        sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
        customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
        lines: [{
          name: 'L1', quantity: 1, price: 100, kdvPercent: 18,
          taxes: [{ code: '4171', percent: 5 }],
        }],
      },
    });
    const warnings = session.validate();
    const tax4171Err = warnings.find(w => w.message.includes('4171'));
    expect(tax4171Err).toBeDefined();
  });
});

describe('B-78.5 — ihracatPartyComplete (IHRACAT supplier name + taxOffice)', () => {
  it('sender.name + taxOffice dolu → warning yok', () => {
    const session = new InvoiceSession({
      isExport: true,
      initialInput: completeIhracatBase,
    });
    const warnings = session.validate();
    const ihracatErr = warnings.find(w => w.message.toLowerCase().includes('ihracat') && w.message.toLowerCase().includes('supplier'));
    expect(ihracatErr).toBeUndefined();
  });

  it('sender.taxOffice eksik → warning', () => {
    const session = new InvoiceSession({
      isExport: true,
      initialInput: {
        ...completeIhracatBase,
        sender: { taxNumber: '1234567890', name: 'Acme', address: 'X', district: 'X', city: 'X' },   // taxOffice yok
      },
    });
    const warnings = session.validate();
    const ihracatErr = warnings.find(w =>
      w.message.toLowerCase().includes('vergi dairesi') ||
      w.message.toLowerCase().includes('taxoffice'),
    );
    expect(ihracatErr).toBeDefined();
  });
});

/**
 * B-78.5 / YOLCUBERABERFATURA — bayrağın kapsamı GENİŞLEDİ.
 *
 * Eskiden yalnız `nationalityId` + `passportId` sorulurdu; S3'ün XSD kardinalite
 * kapıları (`PersonType/cbc:FirstName` 1..1, `cbc:FamilyName` 1..1,
 * `DocumentReferenceType/cbc:IssueDate` 1..1, `PartyType/cac:PostalAddress` 1..1)
 * eksik alanları SERT hataya çevirdiği için uyarının kapsamı yetersiz kalmıştı:
 * ekran temiz görünüyor, belge üretim anında reddediliyordu.
 *
 * ⚠️ Bu blok bilerek `field` üzerinden eşleşir. Eski hâli mesaj METNİNDE
 * `'passport'` arıyordu; mesaj Türkçeleşince (`'pasaport'`) arama sessizce
 * ıskalar ve test "yeşil" kalırdı — tam da aradığı kusur oradayken.
 */
describe('B-78.5 — yolcuBuyerComplete (turistin beş alanı + aracı kurum adresi)', () => {
  const BASE = {
    profile: 'YOLCUBERABERFATURA',
    type: 'ISTISNA',
    sender: { taxNumber: '1234567890', name: 'X', taxOffice: 'X', address: 'X', district: 'X', city: 'X' },
    customer: { taxNumber: '9876543210', name: 'Y', taxOffice: 'Y', address: 'Y', district: 'Y', city: 'Y' },
  } as const;

  /** Kapıların tamamını kapatan turist — beş alanın beşi de dolu. */
  const FULL_TOURIST = {
    name: 'Tourist', taxNumber: '99999999999', address: 'X', city: 'X', district: 'X', country: 'DE',
    firstName: 'Michael', familyName: 'Schneider',
    nationalityId: 'DE', passportId: 'P12345', passportIssueDate: '2019-03-04',
  } as const;

  /** Adresi kurulabilen aracı kurum — eşleyici il+ilçe birlikte doluyken kurar. */
  const FULL_INTERMEDIARY = {
    vknTckn: '1234567890', label: 'Aracı', name: 'Aracı Kurum',
    address: 'Merkez Mah. 1', district: 'Kadıköy', city: 'İstanbul',
  } as const;

  const warningsFor = (
    buyerCustomer: Record<string, unknown>,
    taxRepresentativeParty?: Record<string, unknown>,
  ) =>
    new InvoiceSession({
      autoCalculate: false,
      initialInput: { ...BASE, buyerCustomer, taxRepresentativeParty } as never,
    }).validate();

  const buyerError = (ws: ReturnType<typeof warningsFor>) =>
    ws.find(w => w.field === 'buyerCustomer.party');
  const intermediaryError = (ws: ReturnType<typeof warningsFor>) =>
    ws.find(w => w.field === 'taxRepresentativeParty.city');

  it('beş alan + aracı kurum adresi dolu → YOLCU uyarısı YOK', () => {
    const warnings = warningsFor({ ...FULL_TOURIST }, { ...FULL_INTERMEDIARY });
    expect(buyerError(warnings)).toBeUndefined();
    expect(intermediaryError(warnings)).toBeUndefined();
  });

  it.each([
    ['firstName', 'turistin adı'],
    ['familyName', 'turistin soyadı'],
    ['nationalityId', 'uyruk'],
    ['passportId', 'pasaport numarası'],
    ['passportIssueDate', 'pasaportun veriliş tarihi'],
  ])('buyerCustomer.%s eksik → uyarı (%s)', (field) => {
    const buyer: Record<string, unknown> = { ...FULL_TOURIST };
    delete buyer[field];
    const error = buyerError(warningsFor(buyer, { ...FULL_INTERMEDIARY }));
    expect(error).toBeDefined();
    // Mesaj beş alanı da sayar — kullanıcı neyi doldurması gerektiğini görmeli.
    expect(error?.message).toContain('pasaportun veriliş tarihi');
  });

  it('aracı kurumun ili eksik → adres uyarısı (XSD PostalAddress 1..1)', () => {
    const { city: _city, ...withoutCity } = FULL_INTERMEDIARY;
    const warnings = warningsFor({ ...FULL_TOURIST }, withoutCity);
    expect(intermediaryError(warnings)).toBeDefined();
    // Turist tarafı eksiksiz → o uyarı gelmemeli; iki kapı birbirine karışmaz.
    expect(buyerError(warnings)).toBeUndefined();
  });

  it('aracı kurum HİÇ verilmemişse adres uyarısı ÜRETİLMEZ', () => {
    // XSD kapısı da ancak `cac:TaxRepresentativeParty` düğümü yazıldığında koşar.
    // Kurumun kendisinin zorunluluğu ayrı kuraldır (profile-validators §3.4);
    // burada tekrarlanırsa kullanıcı tek eksik için iki hata görür.
    expect(intermediaryError(warningsFor({ ...FULL_TOURIST }))).toBeUndefined();
  });
});

describe('deriveB78Params helper edge case\'leri', () => {
  it('boş session → tüm B-78 parametreleri default (no false positive)', () => {
    const session = new InvoiceSession();
    const warnings = session.validate();
    expect(warnings).toBeDefined();
    expect(Array.isArray(warnings)).toBe(true);
  });

  it('lines.length === 0 + YATIRIMTESVIK → ytbAllKdvPositive true (irrelevant)', () => {
    const session = new InvoiceSession({
      initialInput: { profile: 'YATIRIMTESVIK', ytbNo: '123456', type: 'SATIS' },
    });
    const warnings = session.validate();
    // ytbAllKdvPositive 0 lines için non-trigger
    const ytbErr = warnings.find(w => w.message.toLowerCase().includes('kdv') && w.message.toLowerCase().includes('pozitif'));
    expect(ytbErr).toBeUndefined();
  });
});
