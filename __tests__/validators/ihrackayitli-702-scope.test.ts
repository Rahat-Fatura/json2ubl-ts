/**
 * İHRAÇ KAYITLI 702 — TEK KAPSAM (5.2.0, karar K-10).
 *
 * 5.1.0'a kadar "702 var mı, hangi satırlar GTİP ister" sorusunu dört yer dört
 * ayrı biçimde cevaplıyordu:
 *   • satır bayrakları (`deriveLineFieldVisibility`) — satırın KENDİ kodu;
 *   • katı kurulum (`validateIhrackayitli702`)       — satır alt toplamları;
 *   • oturum doğrulaması (`validateInvoiceState`)    — belge kodu;
 *   • GİB şematronu (`TaxExemptionReasonCodeCheck`)  — belge vergi ÖZETİ.
 * Bu dosya altı durumda dördünün AYNI hükmü verdiğini tablo halinde kilitler.
 * Şematron sütunu CANLI doğrulayıcıdan gelir (`npm run test:strict`).
 *
 * Altı durum kusur notundan (`json2ubl-kusur-702.md`) birebir alındı. 5.1.0'daki
 * hükümler her satırın yorumunda.
 */

import { describe, it, expect } from 'vitest';
import { SimpleInvoiceBuilder } from '../../src/calculator/simple-invoice-builder';
import { InvoiceSession } from '../../src/calculator/invoice-session';
import { SessionPaths } from '../../src/calculator/session-paths.generated';
import { deriveLineFieldVisibility } from '../../src/calculator/line-field-visibility';
import { validateInvoiceState } from '../../src/calculator/invoice-rules';
import { isIhracKayitli702Invoice, ihracKayitli702SummaryCodes } from '../../src/calculator/ihrackayitli-702-scope';
import {
  isIhracKayitli702Scope,
  resolveSummaryExemptionCode,
} from '../../src/ubltr/vocabulary/schematron-scopes';
import { validateIhrackayitli702 } from '../../src/documents/invoice/validators/ihrackayitli-validator';
import { mapSimpleToInvoiceInput } from '../../src/calculator/simple-invoice-mapper';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';
import { probeValidator, validateLive } from '../support/validator';

const GTIP = '620342000010';
const ALICI = '12345678901';

type Fill = 'full' | 'none' | 'aliciOnly';

function line(name: string, code: string | undefined, fill: Fill, kdvPercent = 0): SimpleLineInput {
  const delivery: NonNullable<SimpleLineInput['delivery']> = {
    deliveryAddress: { address: 'Gümrük Kapısı', district: 'Ambarlı', city: 'İstanbul', country: 'Türkiye' },
  };
  if (fill === 'full') { delivery.gtipNo = GTIP; delivery.alicidibsatirkod = ALICI; }
  if (fill === 'aliciOnly') delivery.alicidibsatirkod = ALICI;
  const l: SimpleLineInput = { name, quantity: 10, price: 10, unitCode: 'Adet', kdvPercent, delivery };
  if (code) l.kdvExemptionCode = code;
  return l;
}

function invoice(docCode: string | undefined, lines: SimpleLineInput[]): SimpleInvoiceInput {
  const input: SimpleInvoiceInput = {
    id: 'TST2026000000702',
    uuid: 'a1b2c3d4-0702-4000-8702-000000000702',
    datetime: '2026-04-23T14:00:00',
    profile: 'TEMELFATURA',
    type: 'IHRACKAYITLI',
    currencyCode: 'TRY',
    sender: {
      taxNumber: '1234567890', name: 'Sınır Tanımaz Ticaret A.Ş.', taxOffice: 'Üsküdar',
      address: 'Barbaros Bulvarı No:123', district: 'Üsküdar', city: 'İstanbul', zipCode: '34664',
    },
    customer: {
      taxNumber: '9876543210', name: 'İhracat Aracı Kurumu A.Ş.', taxOffice: 'Kadıköy',
      address: 'Bağdat Caddesi No:456', district: 'Kadıköy', city: 'İstanbul', zipCode: '34710',
    },
    lines,
  };
  if (docCode) input.kdvExemptionCode = docCode;
  return input;
}

interface Case {
  id: string;
  label: string;
  input: SimpleInvoiceInput;
  /** Dört yerin ortak hükmü: belge bu hâliyle kesilebilir mi? */
  passes: boolean;
  /** 702 kapsamı (bayraklar bütün satırlarda bu değeri taşır). */
  scope: boolean;
  /** Belge vergi özetinin istisna kodları, XML sırasıyla. */
  summary: string[];
}

const CASES: Case[] = [
  {
    // 5.1.0: katı 2 hata · bayrak yalnız 702 satırında · şematron GEÇERLİ (özet 701)
    id: 'D1', label: 'satırlar 702 + 701, yalnız 702 satırında GTİP/ALICI',
    input: invoice(undefined, [line('A', '702', 'full'), line('B', '701', 'none')]),
    passes: false, scope: true, summary: ['702', '701'],
  },
  {
    // 5.1.0: katı OK · bayrak yalnız 702 satırında · şematron geçerli ama özet 701 (yanlış)
    id: 'D2', label: 'satırlar 702 + 701, iki satırda GTİP/ALICI',
    input: invoice(undefined, [line('A', '702', 'full'), line('B', '701', 'full')]),
    passes: true, scope: true, summary: ['702', '701'],
  },
  {
    // 5.1.0: katı OK · bayraklar HİÇBİR satırda açık değil · şematron geçerli
    id: 'D3', label: 'belge 702, satırlar kodsuz, iki satırda GTİP/ALICI',
    input: invoice('702', [line('A', undefined, 'full'), line('B', undefined, 'full')]),
    passes: true, scope: true, summary: ['702'],
  },
  {
    // 5.1.0: katı 2 hata · bayrak yalnız 702 satırında · şematron GEÇERSİZ
    id: 'D4', label: 'belge 702, satırlar 702 + 701, yalnız 702 satırında GTİP/ALICI',
    input: invoice('702', [line('A', '702', 'full'), line('B', '701', 'none')]),
    passes: false, scope: true, summary: ['702', '701'],
  },
  {
    // 5.1.0: katı OK · bayrak yalnız 702 satırında · şematron geçerli ama özet 701 (yanlış)
    id: 'D5', label: 'belge 701, satırlar 702 + 701, iki satırda GTİP/ALICI',
    input: invoice('701', [line('A', '702', 'full'), line('B', '701', 'full')]),
    passes: true, scope: true, summary: ['702', '701'],
  },
  {
    // 5.1.0: katı OK · oturum HATA · şematron GEÇERSİZ (özet 702) — katı kurulum
    // GİB'in reddettiği belgeyi geçiriyordu. 5.2.0: belge kodu 702 hiçbir satıra
    // uygulanmaz, özet 701 yazılır, GİB'in 702 kuralı çalışmaz → dördü de "geçer".
    id: 'D6', label: 'belge 702, iki 701 satırı, birinde GTİP yok',
    input: invoice('702', [line('A', '701', 'full'), line('B', '701', 'aliciOnly')]),
    passes: true, scope: false, summary: ['701'],
  },
];

function strictVerdict(input: SimpleInvoiceInput): { ok: boolean; codes: string[] } {
  try {
    new SimpleInvoiceBuilder({ validationLevel: 'strict' }).build(input);
    return { ok: true, codes: [] };
  } catch (e) {
    const errors = (e as { errors?: Array<{ code: string }> }).errors ?? [];
    return { ok: false, codes: errors.map(x => x.code) };
  }
}

function xmlOf(input: SimpleInvoiceInput): string {
  return new SimpleInvoiceBuilder({ validationLevel: 'none', prettyPrint: true }).build(input).xml;
}

/** Belge düzeyi vergi özetinin istisna kodları (satırlar hariç). */
function summaryCodes(xml: string): string[] {
  const head = xml.split('<cac:InvoiceLine>')[0];
  const taxTotal = head.slice(head.lastIndexOf('<cac:TaxTotal>'));
  return [...taxTotal.matchAll(/<cbc:TaxExemptionReasonCode>([^<]+)</g)].map(m => m[1]);
}

const GTIP_FIELD = 'lines.delivery.goodsItems.requiredCustomsId';

const validator = await probeValidator();
const liveIt = it.skipIf(!validator.up);

describe('İHRAÇ KAYITLI 702 — altı durumda dört yer aynı hükmü verir (tablo)', () => {
  describe.each(CASES)('$id — $label', (c) => {
    it(`katı kurulum: ${c.passes ? 'geçer' : 'GTİP/ALICI hatası'}`, () => {
      const v = strictVerdict(c.input);
      expect(v.ok).toBe(c.passes);
      if (!c.passes) {
        expect(v.codes).toContain('IHRACKAYITLI_702_REQUIRES_GTIP');
        expect(v.codes).toContain('IHRACKAYITLI_702_REQUIRES_ALICIDIBSATIRKOD');
      }
    });

    it(`satır bayrakları: GTİP/ALICI/SATICI kutuları bütün satırlarda ${c.scope ? 'AÇIK' : 'kapalı'}`, () => {
      const session = new InvoiceSession({ initialInput: c.input });
      expect(session.uiState.lineFields).toHaveLength(c.input.lines.length);
      for (const f of session.uiState.lineFields) {
        expect(f.showCommodityClassification).toBe(c.scope);
        expect(f.showAlicidibsatirkod).toBe(c.scope);
        expect(f.showSaticidibsatirkod).toBe(c.scope);
      }
    });

    it(`oturum doğrulaması: ${c.passes ? '702 hatası yok' : 'GTİP hatası'}`, () => {
      const warnings = new InvoiceSession({ initialInput: c.input }).validate();
      const b78 = warnings.filter(w => w.field === GTIP_FIELD);
      const strict = warnings.filter(w => w.code === 'IHRACKAYITLI_702_REQUIRES_GTIP');
      expect(b78.length > 0).toBe(!c.passes);
      expect(strict.length > 0).toBe(!c.passes);
    });

    it(`vergi özeti: ${c.summary.join(' + ')} — satır kodlarıyla tutarlı`, () => {
      const xml = xmlOf(c.input);
      expect(summaryCodes(xml)).toEqual(c.summary);
      // tek kapsam, özet kurulmadan önce aynı kodları öngörür
      expect([...new Set(ihracKayitli702SummaryCodes(c.input))]).toEqual(c.summary);
      expect(isIhracKayitli702Invoice(c.input)).toBe(c.scope);
    });

    liveIt(`GİB şematronu: ${c.passes ? 'geçerli' : 'TaxExemptionReasonCodeCheck reddi'}`, async () => {
      const result = await validateLive(xmlOf(c.input), 'efatura');
      const rules = (result.schematronValidationErrors ?? []).map(e => e.ruleId);
      expect(result.validSchematron).toBe(c.passes);
      if (c.passes) expect(rules).toEqual([]);
      else expect(rules).toEqual(['TaxExemptionReasonCodeCheck']);
    }, 30_000);
  });
});

describe('tek kapsam yüklemi — `isIhracKayitli702Scope`', () => {
  it('tip İHRAÇ KAYITLI değilse her zaman kapalı', () => {
    expect(isIhracKayitli702Scope('SATIS', ['702'])).toBe(false);
    expect(isIhracKayitli702Scope(undefined, ['702'])).toBe(false);
  });

  it('özette 702 → açık; özet 701 ve istisna satırı 702 → açık (elle kurulmuş çelişkili belge)', () => {
    expect(isIhracKayitli702Scope('IHRACKAYITLI', ['701', '702'])).toBe(true);
    expect(isIhracKayitli702Scope('IHRACKAYITLI', ['701'], ['702'])).toBe(true);
    expect(isIhracKayitli702Scope('IHRACKAYITLI', ['701'], ['701', undefined])).toBe(false);
  });
});

describe('kalemin özete taşıdığı kod — `resolveSummaryExemptionCode`', () => {
  it('KDV\'den istisna kalem kendi kodunu, kodu yoksa belge kodunu taşır', () => {
    expect(resolveSummaryExemptionCode({ kdvPercent: 0, kdvExemptionCode: '702' }, '701')).toBe('702');
    expect(resolveSummaryExemptionCode({ kdvPercent: 0 }, '702')).toBe('702');
    expect(resolveSummaryExemptionCode({ kdvPercent: 0, kdvExemptionCode: '  ' }, '702')).toBe('702');
  });

  it('KDV\'li kalem belge kodunu taşır — kendi kodu XML\'e yazılmaz, özete de sızmaz', () => {
    expect(resolveSummaryExemptionCode({ kdvPercent: 20, kdvExemptionCode: '702' }, '701')).toBe('701');
    expect(resolveSummaryExemptionCode({ kdvPercent: 20, kdvExemptionCode: '702' }, undefined)).toBeUndefined();
  });

  it('vazgeçilen KDV (phantom) kalemi KDV oranı taşısa da kendi kodunu taşır', () => {
    expect(resolveSummaryExemptionCode({ kdvPercent: 20, kdvExemptionCode: '339' }, '308', { phantomKdv: true })).toBe('339');
  });
});

describe('İHRAÇ KAYITLI 702 — kenar durumlar', () => {
  it('KDV\'li satırın kendi 702 kodu: XML\'de 702 yok → kutu kapalı, katı kurulum geçer', () => {
    const input = invoice(undefined, [line('A', '701', 'full'), line('B', '702', 'none', 20)]);
    expect(isIhracKayitli702Invoice(input)).toBe(false);
    expect(summaryCodes(xmlOf(input))).toEqual(['701', '701']);
    expect(strictVerdict(input).ok).toBe(true);
    const session = new InvoiceSession({ initialInput: input });
    expect(session.uiState.lineFields.map(f => f.showCommodityClassification)).toEqual([false, false]);
  });

  it('belge kodu 702 + KDV\'li kodsuz satır: özet 702 taşır → kapsam açık, katı kurulum her satırda ister', () => {
    const input = invoice('702', [line('A', undefined, 'full'), line('B', undefined, 'none', 20)]);
    expect(isIhracKayitli702Invoice(input)).toBe(true);
    expect(summaryCodes(xmlOf(input))).toEqual(['702', '702']);
    const v = strictVerdict(input);
    expect(v.ok).toBe(false);
    expect(v.codes).toContain('IHRACKAYITLI_702_REQUIRES_GTIP');
  });

  it('satırsız belge: kapsam kapalı, oturum GTİP istemez', () => {
    const input = invoice('702', []);
    expect(isIhracKayitli702Invoice(input)).toBe(false);
    const warnings = new InvoiceSession({ initialInput: input }).validate();
    expect(warnings.some(w => w.field === GTIP_FIELD)).toBe(false);
  });

  it('elle kurulmuş InvoiceInput: özet 702, satırlar 701 → katı kurulum reddeder (şematronun tetiği)', () => {
    const doc = invoice('702', [line('A', '701', 'full'), line('B', '701', 'aliciOnly')]);
    const mapped = mapSimpleToInvoiceInput(doc);
    // 5.1.0'ın ürettiği şekil: özet belge kodunu (702) taşıyor
    mapped.taxTotals[0].taxSubtotals.forEach(ts => { ts.taxExemptionReasonCode = '702'; });
    const codes = validateIhrackayitli702(mapped).map(e => e.code);
    expect(codes).toEqual(['IHRACKAYITLI_702_REQUIRES_GTIP']);
  });
});

describe('oturum — kapsam belge düzeyinde, bütün satırlar birlikte türetilir', () => {
  it('bir satıra 702 yazılınca ÖBÜR satırın kutusu da açılır; kod geri alınınca kapanır', () => {
    const session = new InvoiceSession({
      initialInput: invoice(undefined, [line('A', '701', 'none'), line('B', '701', 'none')]),
    });
    expect(session.uiState.lineFields.map(f => f.showCommodityClassification)).toEqual([false, false]);

    session.update(SessionPaths.lineKdvExemptionCode(0), '702');
    expect(session.uiState.lineFields.map(f => f.showCommodityClassification)).toEqual([true, true]);

    session.update(SessionPaths.lineKdvExemptionCode(0), '701');
    expect(session.uiState.lineFields.map(f => f.showCommodityClassification)).toEqual([false, false]);
  });

  it('dizi makinesi: 702 satırı eklenince/silinince bütün satırlar yeniden türetilir', () => {
    const session = new InvoiceSession({ initialInput: invoice(undefined, [line('A', '701', 'none')]) });
    expect(session.uiState.lineFields[0].showAlicidibsatirkod).toBe(false);

    session.addLine(line('B', '702', 'none'));
    expect(session.uiState.lineFields.map(f => f.showAlicidibsatirkod)).toEqual([true, true]);

    session.updateLine(1, { kdvExemptionCode: '703' });
    expect(session.uiState.lineFields.map(f => f.showAlicidibsatirkod)).toEqual([false, false]);

    session.updateLine(1, { kdvExemptionCode: '702' });
    session.removeLine(1);
    expect(session.uiState.lineFields.map(f => f.showAlicidibsatirkod)).toEqual([false]);
  });

  it('belge kodu 702 seçilince kodsuz satırların kutusu açılır', () => {
    const session = new InvoiceSession({ initialInput: invoice('701', [line('A', undefined, 'none')]) });
    expect(session.uiState.lineFields[0].showCommodityClassification).toBe(false);
    session.update(SessionPaths.kdvExemptionCode, '702');
    expect(session.uiState.lineFields[0].showCommodityClassification).toBe(true);
  });
});

describe('`deriveLineFieldVisibility` — belge girdisiz çağrı geriye uyumlu', () => {
  it('yalnız tip/profil verilirse satırın kendi kodu okunur (eski imza)', () => {
    const v = deriveLineFieldVisibility(line('A', '702', 'none'), { type: 'IHRACKAYITLI', profile: 'TEMELFATURA' }, 0);
    expect(v.showCommodityClassification).toBe(true);
    const w = deriveLineFieldVisibility(line('A', '701', 'none'), { type: 'IHRACKAYITLI', profile: 'TEMELFATURA' }, 0);
    expect(w.showCommodityClassification).toBe(false);
  });

  it('`lines` verilirse öbür satırın 702 kodu bu satırı da açar', () => {
    const lines = [line('A', '701', 'none'), line('B', '702', 'none')];
    const v = deriveLineFieldVisibility(lines[0], { type: 'IHRACKAYITLI', profile: 'TEMELFATURA', lines }, 0);
    expect(v.showCommodityClassification).toBe(true);
  });
});

describe('`validateInvoiceState` B-78.3 — kapsam parametresi', () => {
  const base = { type: 'IHRACKAYITLI', profile: 'TEMELFATURA', kdvExemptionCode: '701', hasGtip: false, hasAliciDibKod: false };

  it('`ihracKayitli702Scope: true` → belge kodu 701 olsa da GTİP + ALICI hatası', () => {
    const fields = validateInvoiceState({ ...base, ihracKayitli702Scope: true }).map(w => w.field);
    expect(fields).toContain(GTIP_FIELD);
    expect(fields).toContain('lines.delivery.transportHandlingUnit.customsDeclaration');
  });

  it('`ihracKayitli702Scope: false` → belge kodu 702 olsa da sessiz', () => {
    const fields = validateInvoiceState({ ...base, kdvExemptionCode: '702', ihracKayitli702Scope: false }).map(w => w.field);
    expect(fields).not.toContain(GTIP_FIELD);
  });

  it('parametre verilmezse belge kodu okunur (satırları bilmeyen çağıran — eski davranış)', () => {
    expect(validateInvoiceState({ ...base, kdvExemptionCode: '702' }).map(w => w.field)).toContain(GTIP_FIELD);
    expect(validateInvoiceState({ ...base }).map(w => w.field)).not.toContain(GTIP_FIELD);
  });
});

// ─── S5 düzeltme turu 1 ──────────────────────────────────────────────────────

/** Satır düzeyi KDV istisna kodları, satır sırasıyla. */
function lineCodesOf(xml: string): Array<string | undefined> {
  return xml.split('<cac:InvoiceLine>').slice(1).map(seg => /<cbc:TaxExemptionReasonCode>([^<]+)</.exec(seg)?.[1]);
}

/*
 * ÖNEMLİ-1 — İHRAÇ KAYITLI'da %0 kalemin kendi kodu 701–704 DIŞINDAYSA (301, 350 …).
 * GİB kalemde istisna listesine bu tipte izin verir (Common:320); kütüphanenin özet
 * kuralı 701–704 ister (`validateIhracKayitli`). 5.1.0 bu girdiyi kabul ediyor, özete
 * belge kodunu (yoksa 701) yazıyor ve belge GİB'den geçiyordu. 5.2.0 aynısını yapar:
 * kalem kodu kalemde kalır, özete taşınmaz.
 */
const NON_IHRAC_CODES = ['301', '350', '201', '213', '322'];
const NON_IHRAC_CASES = NON_IHRAC_CODES.flatMap(code => [
  { code, docCode: undefined, summary: ['701'], scope: false },
  { code, docCode: '704', summary: ['704'], scope: false },
  { code, docCode: '702', summary: ['702'], scope: true },
]);

describe('ÖNEMLİ-1 — İHRAÇ KAYITLI\'da 701–704 dışı kalem kodu 5.1.0\'daki gibi kabul edilir', () => {
  describe.each(NON_IHRAC_CASES)('kalem $code, belge $docCode', (c) => {
    const input = invoice(c.docCode, [line('A', c.code, 'full'), line('B', undefined, 'full')]);

    it(`katı kurulum geçer; özet ${c.summary.join(' + ')}, kalem kendi kodunu korur`, () => {
      expect(strictVerdict(input)).toEqual({ ok: true, codes: [] });
      const xml = xmlOf(input);
      expect(summaryCodes(xml)).toEqual(c.summary);
      expect(lineCodesOf(xml)).toEqual([c.code, c.docCode ?? '701']);
    });

    it(`702 kapsamı ${c.scope ? 'açık (belge kodu 702 bu kalemden de uygulanır)' : 'kapalı'}`, () => {
      expect(isIhracKayitli702Invoice(input)).toBe(c.scope);
      const flags = new InvoiceSession({ initialInput: input }).uiState.lineFields;
      expect(flags.map(f => f.showCommodityClassification)).toEqual([c.scope, c.scope]);
    });

    liveIt('GİB şematronu geçerli', async () => {
      const result = await validateLive(xmlOf(input), 'efatura');
      expect((result.schematronValidationErrors ?? []).map(e => e.ruleId)).toEqual([]);
    }, 30_000);
  });

  it('inceleme durumları E2/E3/E4: hata yok, özet 701–704 dışı kod taşımaz', () => {
    const e2 = invoice('702', [line('A', '701', 'full'), line('B', '350', 'full')]);
    const e3 = invoice(undefined, [line('A', '301', 'full')]);
    const e4 = invoice('704', [line('A', '301', 'full'), line('B', undefined, 'full')]);
    expect([e2, e3, e4].map(strictVerdict)).toEqual([{ ok: true, codes: [] }, { ok: true, codes: [] }, { ok: true, codes: [] }]);
    expect(summaryCodes(xmlOf(e2))).toEqual(['701', '702']);
    expect(summaryCodes(xmlOf(e3))).toEqual(['701']);
    expect(summaryCodes(xmlOf(e4))).toEqual(['704']);
  });

  it('belge 702, BÜTÜN kalemler 701–704 dışı kodlu: özet 702 (5.1.0 gibi), dört yer kapsamı açık sayar', () => {
    const filled = invoice('702', [line('A', '301', 'full'), line('B', '350', 'full')]);
    expect(summaryCodes(xmlOf(filled))).toEqual(['702']);
    expect(isIhracKayitli702Invoice(filled)).toBe(true);
    expect(new InvoiceSession({ initialInput: filled }).uiState.lineFields.map(f => f.showCommodityClassification))
      .toEqual([true, true]);
    expect(strictVerdict(filled).ok).toBe(true);

    const missing = invoice('702', [line('A', '301', 'full'), line('B', '350', 'none')]);
    expect(strictVerdict(missing).codes).toContain('IHRACKAYITLI_702_REQUIRES_GTIP');
    const warnings = new InvoiceSession({ initialInput: missing }).validate();
    expect(warnings.some(w => w.field === GTIP_FIELD)).toBe(true);
  });

  it('karışık: 702 kalemi kendi kodunu taşır, 301 kalemi belge koduna (701) katılır', () => {
    const input = invoice(undefined, [line('A', '702', 'full'), line('B', '301', 'full')]);
    expect(summaryCodes(xmlOf(input))).toEqual(['702', '701']);
    expect(isIhracKayitli702Invoice(input)).toBe(true);
    expect(strictVerdict(input).ok).toBe(true);
  });

  it('`resolveSummaryExemptionCode`: İHRAÇ KAYITLI\'da 701–704 dışı kod belge koduna düşer, başka tipte düşmez', () => {
    expect(resolveSummaryExemptionCode({ kdvPercent: 0, kdvExemptionCode: '301' }, '702', { invoiceType: 'IHRACKAYITLI' })).toBe('702');
    expect(resolveSummaryExemptionCode({ kdvPercent: 0, kdvExemptionCode: '301' }, undefined, { invoiceType: 'IHRACKAYITLI' })).toBeUndefined();
    expect(resolveSummaryExemptionCode({ kdvPercent: 0, kdvExemptionCode: '703' }, '701', { invoiceType: 'IHRACKAYITLI' })).toBe('703');
    expect(resolveSummaryExemptionCode({ kdvPercent: 0, kdvExemptionCode: '301' }, '350', { invoiceType: 'ISTISNA' })).toBe('301');
  });
});

/*
 * KÜÇÜK-2 — KDV'li ama KDV tutarı 0 olan kalem (%100 iskonto / bedelsiz). Kalem
 * istisna DEĞİLDİR: kalem XML'i de, özet de, 702 kapsamı da kendi kodunu yok sayar.
 * Eskiden kalem XML'i "tutar 0" diye bakıp kendi 702'sini yazıyor, özet 701 yazıyordu.
 */
describe('KÜÇÜK-2 — KDV\'li, tutarı 0 kalem: kalem XML\'i ile özet aynı yüklemi okur', () => {
  const freeLine = (code: string | undefined): SimpleLineInput => {
    const l = line('A', code, 'none', 20);
    l.allowancePercent = 100;
    return l;
  };

  it('%100 iskontolu %20 kalemin kendi 702 kodu: kalem XML\'inde de özette de yok, kapsam kapalı', () => {
    const input = invoice(undefined, [freeLine('702'), line('B', '701', 'none')]);
    const xml = xmlOf(input);
    expect(lineCodesOf(xml)).toEqual([undefined, '701']);
    expect(summaryCodes(xml)).toEqual(['701', '701']);
    expect(isIhracKayitli702Invoice(input)).toBe(false);
    expect(strictVerdict(input).ok).toBe(true);
  });

  it('bedelsiz (fiyat 0) %20 kalem de istisna sayılmaz', () => {
    const l = line('A', '702', 'none', 20);
    l.price = 0;
    const xml = xmlOf(invoice(undefined, [l, line('B', '701', 'none')]));
    expect(lineCodesOf(xml)[0]).toBeUndefined();
    expect(summaryCodes(xml)).not.toContain('702');
  });

  it('elle kurulmuş InvoiceInput: %20 satır alt toplamındaki 702 kapsamı açmaz (istisna satırı değil)', () => {
    const mapped = mapSimpleToInvoiceInput(invoice(undefined, [line('A', '701', 'none'), line('B', undefined, 'none', 20)]));
    const kdv = mapped.lines[1].taxTotal.taxSubtotals.find(ts => ts.taxTypeCode === '0015')!;
    kdv.taxExemptionReasonCode = '702';
    kdv.taxAmount = 0;
    expect(validateIhrackayitli702(mapped)).toEqual([]);
    // aynı kod %0 satırda olsaydı kapsam açılırdı
    mapped.lines[0].taxTotal.taxSubtotals[0].taxExemptionReasonCode = '702';
    expect(validateIhrackayitli702(mapped).map(e => e.code)).toContain('IHRACKAYITLI_702_REQUIRES_GTIP');
  });
});

/*
 * NOT-1 — belge istisna kodu XML'den düştüğünde ENGELLEMEYEN uyarı.
 */
describe('NOT-1 — belge kodu hiçbir kaleme uygulanmıyorsa uyarı (engellemez)', () => {
  const unused = (input: SimpleInvoiceInput) =>
    new InvoiceSession({ initialInput: input }).validate().filter(w => w.code === 'DOCUMENT_EXEMPTION_CODE_UNUSED');

  it('belge 702, bütün kalemler kendi koduyla 701 → tek uyarı, severity "warning"', () => {
    const w = unused(invoice('702', [line('A', '701', 'full'), line('B', '701', 'full')]));
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ field: 'kdvExemptionCode', severity: 'warning' });
    expect(w[0].message).toContain('702');
  });

  it('kodsuz kalem, KDV\'li kalem ya da belge koduna katılan kalem varsa uyarı yok', () => {
    expect(unused(invoice('702', [line('A', '701', 'full'), line('B', undefined, 'full')]))).toEqual([]);
    expect(unused(invoice('702', [line('A', '701', 'full'), line('B', undefined, 'full', 20)]))).toEqual([]);
    expect(unused(invoice('702', [line('A', '301', 'full')]))).toEqual([]);
    expect(unused(invoice(undefined, [line('A', '701', 'full')]))).toEqual([]);
  });

  it('uyarı katı kurulumu durdurmaz', () => {
    expect(strictVerdict(invoice('702', [line('A', '701', 'full'), line('B', '701', 'full')])).ok).toBe(true);
  });
});
