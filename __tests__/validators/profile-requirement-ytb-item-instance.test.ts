import { describe, it, expect } from 'vitest';
import { validateProfileRequirements } from '../../src/validators/profile-requirement-validator';
import type { SimpleInvoiceInput, SimpleLineInput } from '../../src/calculator/simple-types';

/**
 * `YatirimTesvikItemInstanceCheck` — GİB şematronu
 * (UBL-TR_Common_Schematron.xml:491-493) harcama tipi 01'de ÜÇ alan ister:
 *
 * | Şematron yolu                                | GİB ret metnindeki ad     | simple alan       |
 * |----------------------------------------------|---------------------------|-------------------|
 * | `cac:Item/cbc:ModelName`                     | Makine Adı                | `model`           |
 * | `cac:Item/cac:ItemInstance/cbc:ProductTraceID`| Makine Teçhizat Sıra No  | `productTraceId`  |
 * | `cac:Item/cac:ItemInstance/cbc:SerialID`     | Makine ID                 | `serialId`        |
 *
 * 🔴 `cbc:BrandName` (Marka) kuralda HİÇ GEÇMEZ. Eski uygulama markayı zorunlu
 * sayıyor (yanlış pozitif), sıra no + makine ID'ye ise hiç bakmıyordu (yanlış
 * negatif). Aşağıdaki testler ikisinin de geri gelmemesini bekler.
 */

function makeLine(over: Partial<SimpleLineInput> = {}): SimpleLineInput {
  return {
    name: 'Teşvikli makine',
    quantity: 1,
    price: 1000,
    unitCode: 'Adet',
    kdvPercent: 20,
    itemClassificationCode: '01',
    brand: 'Matrix',
    model: 'MTX-01',
    productTraceId: 'MAKINA-001',
    serialId: 'SN-001',
    ...over,
  } as SimpleLineInput;
}

function makeInput(
  profile: string,
  type: string,
  lines: SimpleLineInput[] = [makeLine()],
): SimpleInvoiceInput {
  return {
    profile,
    type,
    ytbNo: '123456',
    lines,
  } as SimpleInvoiceInput;
}

/** YTB/ItemInstance kuralına ait hataları (yol bazlı) süzer. */
function itemInstanceErrors(input: SimpleInvoiceInput) {
  return validateProfileRequirements(input).filter(e =>
    /^lines\[\d+\]\.(model|productTraceId|serialId|brand)$/.test(e.path ?? ''),
  );
}

describe('YatirimTesvikItemInstanceCheck — harcama tipi 01 zorunlu alanları', () => {
  it('üç alan da doluyken hata vermez', () => {
    expect(itemInstanceErrors(makeInput('YATIRIMTESVIK', 'SATIS'))).toHaveLength(0);
  });

  it('Makine Adı (model) boşsa lines[0].model hatası verir', () => {
    const errs = itemInstanceErrors(makeInput('YATIRIMTESVIK', 'SATIS', [makeLine({ model: undefined })]));
    expect(errs).toHaveLength(1);
    expect(errs[0].path).toBe('lines[0].model');
    expect(errs[0].message).toContain('Makine Adı');
  });

  it('Makine Teçhizat Sıra No (productTraceId) boşsa lines[0].productTraceId hatası verir', () => {
    const errs = itemInstanceErrors(
      makeInput('YATIRIMTESVIK', 'SATIS', [makeLine({ productTraceId: undefined })]),
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].path).toBe('lines[0].productTraceId');
    expect(errs[0].message).toContain('Makine Teçhizat Sıra No');
  });

  it('Makine ID (serialId) boşsa lines[0].serialId hatası verir', () => {
    const errs = itemInstanceErrors(makeInput('YATIRIMTESVIK', 'SATIS', [makeLine({ serialId: undefined })]));
    expect(errs).toHaveLength(1);
    expect(errs[0].path).toBe('lines[0].serialId');
    expect(errs[0].message).toContain('Makine ID');
  });

  it('yalnız boşluk içeren değer de boş sayılır', () => {
    const errs = itemInstanceErrors(
      makeInput('YATIRIMTESVIK', 'SATIS', [makeLine({ model: '   ', serialId: '\t' })]),
    );
    expect(errs.map(e => e.path).sort()).toEqual(['lines[0].model', 'lines[0].serialId']);
  });

  it('üçü birden boşsa üç ayrı hata döner', () => {
    const errs = itemInstanceErrors(
      makeInput('YATIRIMTESVIK', 'SATIS', [
        makeLine({ model: undefined, productTraceId: undefined, serialId: undefined }),
      ]),
    );
    expect(errs.map(e => e.path).sort()).toEqual([
      'lines[0].model',
      'lines[0].productTraceId',
      'lines[0].serialId',
    ]);
  });

  it('hatalar satır indeksini korur (çok satırlı)', () => {
    const errs = itemInstanceErrors(
      makeInput('YATIRIMTESVIK', 'SATIS', [makeLine(), makeLine({ serialId: '' })]),
    );
    expect(errs).toHaveLength(1);
    expect(errs[0].path).toBe('lines[1].serialId');
  });

  // ── REGRESYON: marka (BrandName) kuralda YOK ────────────────────────────────
  it('🔴 marka boşken HATA VERMEZ — BrandName şematron kuralında geçmiyor', () => {
    const errs = validateProfileRequirements(
      makeInput('YATIRIMTESVIK', 'SATIS', [makeLine({ brand: undefined })]),
    );
    expect(errs.filter(e => (e.path ?? '').endsWith('.brand'))).toHaveLength(0);
    expect(errs.some(e => (e.message ?? '').toLowerCase().includes('marka'))).toBe(false);
  });

  // ── Harcama tipi kapsamı ────────────────────────────────────────────────────
  it('harcama tipi 01 DIŞINDA (02) üç alan aranmaz', () => {
    const errs = itemInstanceErrors(
      makeInput('YATIRIMTESVIK', 'SATIS', [
        makeLine({
          itemClassificationCode: '02',
          model: undefined,
          productTraceId: undefined,
          serialId: undefined,
        }),
      ]),
    );
    expect(errs).toHaveLength(0);
  });

  // ── Profil/tip kapsamı — şematronla birebir ─────────────────────────────────
  it.each(['YTBSATIS', 'YTBIADE', 'YTBISTISNA', 'YTBTEVKIFAT', 'YTBTEVKIFATIADE'])(
    'EARSIVFATURA + %s kapsam içindedir',
    type => {
      const errs = itemInstanceErrors(
        makeInput('EARSIVFATURA', type, [makeLine({ productTraceId: undefined })]),
      );
      expect(errs.map(e => e.path)).toEqual(['lines[0].productTraceId']);
    },
  );

  it('EARSIVFATURA + YTB olmayan tip (SATIS) kapsam DIŞIDIR', () => {
    const errs = itemInstanceErrors(
      makeInput('EARSIVFATURA', 'SATIS', [
        makeLine({ model: undefined, productTraceId: undefined, serialId: undefined }),
      ]),
    );
    expect(errs).toHaveLength(0);
  });

  it('TICARIFATURA + SATIS kapsam DIŞIDIR', () => {
    const errs = itemInstanceErrors(
      makeInput('TICARIFATURA', 'SATIS', [
        makeLine({ model: undefined, productTraceId: undefined, serialId: undefined }),
      ]),
    );
    expect(errs).toHaveLength(0);
  });

  /* Profil boş gelen HAM girdi (oturum yolu profili türetir; bu dal yalnız
   * `SimpleInvoiceBuilder`'a doğrudan girdi veren çağıranlar içindir). */
  it('profil boş + YTBSATIS tipi kapsam İÇİDİR', () => {
    const errs = itemInstanceErrors(
      makeInput('', 'YTBSATIS', [makeLine({ serialId: undefined })]),
    );
    expect(errs.map(e => e.path)).toEqual(['lines[0].serialId']);
  });

  /* Eski `tip.startsWith('YTB')` yaklaşımı listede OLMAYAN bir YTB* tipini de
   * kapsıyordu; artık şematron listesi esastır. */
  it('listede olmayan YTB önekli uydurma tip kapsam DIŞIDIR', () => {
    const errs = itemInstanceErrors(
      makeInput('TICARIFATURA', 'YTBUYDURMA', [
        makeLine({ model: undefined, productTraceId: undefined, serialId: undefined }),
      ]),
    );
    expect(errs).toHaveLength(0);
  });
});
