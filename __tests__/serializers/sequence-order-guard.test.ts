import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SimpleInvoiceBuilder, DespatchBuilder } from '../../src';
import type { SimpleInvoiceInput, DespatchInput } from '../../src';
import {
  ELEMENT_COMPLEX_TYPE,
  SEQUENCE_BY_COMPLEX_TYPE,
} from '../../src/serializers/xsd-sequence';
import { serializeDelivery } from '../../src/serializers/delivery-serializer';
import type { DeliveryInput } from '../../src/types/common';
import { GOLDEN_SCENARIOS } from '../golden/scenarios';

/**
 * SEKANS BEKÇİSİ — "tablolar gerçekten taşıyıcı mı?" sorusunun tek kanıtı.
 *
 * ── NİYE VAR ──────────────────────────────────────────────────────────────
 * Sekans tabloları GİB XSD'sinden üretiliyor (`scripts/generate-sequences.ts`)
 * ve `emitInOrder` emit sırasını onlardan alıyor. Zincirin zayıf halkası
 * SERİALİZER tarafıdır: biri yarın `emitInOrder` yerine elle `parts.push()`
 * yazarsa tablo yine "doğru" kalır ama çıktı ondan KOPAR.
 *
 * Snapshot testleri bunu yakalamaz — onlar "eskisiyle aynı mı?" diye sorar ve
 * snapshot'lar birlikte güncellenince yanlış sıra sessizce kalıcılaşır. Bu test
 * "XSD'nin dediği sıra mı?" diye sorar ve çıktıyı DİSKTEN OKUMAZ, koşum anında
 * ÜRETİR: kırılan serializer snapshot'larıyla birlikte tazelense bile yakalanır.
 *
 * ── NE DOĞRULAR ───────────────────────────────────────────────────────────
 * Üretilen her XML'de, sekans tablosu OLAN her eleman için:
 *   1. her çocuk eleman o tablonun ÜYESİDİR (UBL-TR'de olmayan eleman yazılmaz);
 *   2. çocukların sırası tablonun ALT-DİZİSİDİR (tekrarlı eleman serbest,
 *      geriye dönüş yasak).
 *
 * Eleman → tip eşlemesi üretilen `ELEMENT_COMPLEX_TYPE` haritasından gelir:
 * `cac:PostalAddress` ile `cac:DeliveryAddress` aynı `AddressType` tablosuna,
 * `cac:DriverPerson` ile `cac:Person` aynı `PersonType` tablosuna bağlanır.
 * Eşleme elle yazılmaz — XSD'den üretilir, yeni eleman kendiliğinden kapsanır.
 *
 * ── KAPSAM ────────────────────────────────────────────────────────────────
 * Korpus = `examples/` + `examples-matrix/valid/` + golden senaryolar (hepsi
 * canlı üretilir) + `PACKAGE_SEQ` için sentetik bir parça (bu tabloyu tetikleyen
 * işlenmiş örnek yok). Son test her tablonun EN AZ BİR KEZ sınandığını
 * doğrular: kapsamadığını "yeşil" diye raporlayan bekçi, bekçi değildir.
 */

const REPO_ROOT = path.join(__dirname, '..', '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const MATRIX_DIR = path.join(REPO_ROOT, 'examples-matrix', 'valid');

// ─── Minik XML tarayıcı ───────────────────────────────────────────────────
// Sadece eleman AĞACI çıkarır (metin/öznitelik umursanmaz). Bağımlılık eklemek
// yerine ~40 satır: kütüphanenin dış bağımlılığı `uuid` ile sınırlı kalsın.

interface ElementNode {
  name: string;
  children: ElementNode[];
}

function parseElementTree(xml: string): ElementNode {
  const root: ElementNode = { name: '#document', children: [] };
  const stack: ElementNode[] = [root];
  let i = 0;

  while (i < xml.length) {
    const lt = xml.indexOf('<', i);
    if (lt < 0) break;

    if (xml.startsWith('<!--', lt)) { i = xml.indexOf('-->', lt) + 3; continue; }
    if (xml.startsWith('<![CDATA[', lt)) { i = xml.indexOf(']]>', lt) + 3; continue; }
    if (xml.startsWith('<?', lt)) { i = xml.indexOf('?>', lt) + 2; continue; }
    if (xml.startsWith('<!', lt)) { i = xml.indexOf('>', lt) + 1; continue; }

    // Etiket sonunu tırnak içindeki '>' karakterlerine takılmadan bul.
    let j = lt + 1;
    let quote = '';
    while (j < xml.length) {
      const ch = xml[j];
      if (quote) {
        if (ch === quote) quote = '';
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '>') {
        break;
      }
      j++;
    }

    const raw = xml.slice(lt + 1, j);
    i = j + 1;

    if (raw.startsWith('/')) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const name = raw.split(/[\s/>]/)[0];
    const node: ElementNode = { name, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!raw.endsWith('/')) stack.push(node);
  }

  return root;
}

function localName(qname: string): string {
  const colon = qname.indexOf(':');
  return colon < 0 ? qname : qname.slice(colon + 1);
}

// ─── Denetim ──────────────────────────────────────────────────────────────

/** Bir koşumda gerçekten sınanan complexType'lar — kapsam testi bunu okur. */
const exercisedTypes = new Set<string>();

/**
 * Ağacı gezip sekans ihlallerini toplar.
 *
 * `ext:UBLExtensions` alt ağacına İNİLMEZ: imza (XAdES) içeriği UBL-TR sekans
 * tablolarına tabi değildir ve oradaki `ds:*` / `xades:*` yerel adları tesadüfen
 * `cac:` adlarıyla çakışabilir.
 */
function collectViolations(node: ElementNode, ancestry: string): string[] {
  const out: string[] = [];
  const here = localName(node.name);
  if (here === 'UBLExtensions') return out;

  const complexType = ELEMENT_COMPLEX_TYPE[here];
  const seq = complexType ? SEQUENCE_BY_COMPLEX_TYPE[complexType] : undefined;
  const pathHere = ancestry ? `${ancestry} > ${node.name}` : node.name;

  if (seq) {
    exercisedTypes.add(complexType);
    let cursor = -1;
    let previous = '';
    for (const child of node.children) {
      const childLocal = localName(child.name);
      const index = seq.indexOf(childLocal);
      if (index < 0) {
        out.push(`${pathHere}: <${child.name}> ${complexType} sekansında YOK (tablo: ${seq.join(', ')})`);
        continue;
      }
      if (index < cursor) {
        out.push(
          `${pathHere}: <${child.name}> sıra dışı — ${complexType} tablosunda ` +
            `${childLocal} (#${index + 1}), ${previous} (#${cursor + 1}) ÖNCESİNDE olmalı`,
        );
        continue;
      }
      cursor = index;
      previous = childLocal;
    }
  }

  for (const child of node.children) {
    out.push(...collectViolations(child, pathHere));
  }
  return out;
}

function violationsIn(xml: string, label: string): string[] {
  return collectViolations(parseElementTree(xml), '').map(v => `${label} :: ${v}`);
}

// ─── Canlı korpus ─────────────────────────────────────────────────────────

type DocumentKind = 'invoice' | 'despatch';

/**
 * Senaryo XML'ini KOŞUM ANINDA üretir.
 *
 * `allowReducedKdvRate` her senaryoda açıktır: bu bayrak bir DOĞRULAMA kapısıdır,
 * XML şeklini değiştirmez; açık bırakmak bekçiyi senaryo başına doğrulama
 * politikasını bilmekten kurtarır.
 */
function buildXml(kind: DocumentKind, input: SimpleInvoiceInput | DespatchInput): string {
  if (kind === 'despatch') {
    return new DespatchBuilder({ prettyPrint: true, validationLevel: 'strict' }).build(input as DespatchInput);
  }
  return new SimpleInvoiceBuilder({
    prettyPrint: true,
    validationLevel: 'strict',
    allowReducedKdvRate: true,
  }).build(input as SimpleInvoiceInput).xml;
}

interface ScenarioRef {
  label: string;
  /** `import()` için repo köküne göreli modül yolu (uzantısız). */
  module: string;
  kind: DocumentKind;
}

/**
 * `examples/NN-slug` senaryoları.
 *
 * Belge tipi `run.ts`ten okunur (`runDespatch` → irsaliye). Klasör adı önekine
 * bakan tahmin yerine çalıştırıcının kendisi: yeni bir irsaliye örneği hangi
 * numarayla eklenirse eklensin kendiliğinden doğru tarafa düşer.
 */
function discoverExampleScenarios(): ScenarioRef[] {
  return fs
    .readdirSync(EXAMPLES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^(\d{2}|99)-/.test(d.name))
    .map(d => d.name)
    .sort()
    .map(slug => {
      const runSource = fs.readFileSync(path.join(EXAMPLES_DIR, slug, 'run.ts'), 'utf-8');
      return {
        label: `examples/${slug}`,
        module: `../../examples/${slug}/input`,
        kind: runSource.includes('runDespatch') ? ('despatch' as const) : ('invoice' as const),
      };
    });
}

/** `examples-matrix/valid/<profil>/<slug>` senaryoları; belge tipi `meta.json`dan. */
function discoverMatrixScenarios(): ScenarioRef[] {
  if (!fs.existsSync(MATRIX_DIR)) return [];
  const out: ScenarioRef[] = [];

  for (const profileDir of fs.readdirSync(MATRIX_DIR, { withFileTypes: true })) {
    if (!profileDir.isDirectory()) continue;
    const profilePath = path.join(MATRIX_DIR, profileDir.name);

    for (const slugDir of fs.readdirSync(profilePath, { withFileTypes: true })) {
      if (!slugDir.isDirectory()) continue;
      const scenarioDir = path.join(profilePath, slugDir.name);
      if (!fs.existsSync(path.join(scenarioDir, 'input.ts'))) continue;

      let kind: DocumentKind = 'invoice';
      const metaPath = path.join(scenarioDir, 'meta.json');
      if (fs.existsSync(metaPath)) {
        try {
          if (JSON.parse(fs.readFileSync(metaPath, 'utf-8')).kind === 'despatch') kind = 'despatch';
        } catch {
          // meta okunamazsa fatura varsayılır — snapshot testiyle aynı davranış.
        }
      }

      const relPath = `${profileDir.name}/${slugDir.name}`;
      out.push({ label: `matrix/${relPath}`, module: `../../examples-matrix/valid/${relPath}/input`, kind });
    }
  }

  return out.sort((a, b) => a.label.localeCompare(b.label));
}

const SCENARIOS = [...discoverExampleScenarios(), ...discoverMatrixScenarios()];

/**
 * `PACKAGE_SEQ`'i tetikleyen sentetik parça.
 *
 * `cac:ActualPackage` üreten işlenmiş örnek YOKTUR (B-102 kusuru bu yüzden
 * bugüne dek görünmemişti). Tablo taşıyıcı olduğuna göre bekçi onu da
 * kapsamalıdır — korpusa elle eklenir.
 */
function syntheticPackageXml(): string {
  const delivery: DeliveryInput = {
    deliveryAddress: { cityName: 'İstanbul', citySubdivisionName: 'Kadıköy' },
    shipment: {
      transportHandlingUnits: [
        {
          actualPackages: [{ id: 'PKT-1', quantity: 3, packagingTypeCode: 'PX' }],
          customsDeclarations: [
            {
              id: 'GB-1',
              issuerParty: { partyIdentifications: [{ id: '12345678901', schemeID: 'ALICIDIBSATIRKOD' }] },
            },
          ],
        },
      ],
    },
  };
  return `<Root>\n${serializeDelivery(delivery)}\n</Root>`;
}

// ─── Testler ──────────────────────────────────────────────────────────────

describe('sekans bekçisi — canlı üretilen XML sırası tabloların alt-dizisidir', () => {
  it('korpus boş değil (klasör yolu değişirse test sessizce yeşil kalmasın)', () => {
    expect(SCENARIOS.length).toBeGreaterThan(150);
  });

  it.each(SCENARIOS.map(s => [s.label, s] as const))('%s', async (_label, scenario) => {
    const mod = await import(scenario.module);
    const input = (mod.default ?? mod.input) as SimpleInvoiceInput | DespatchInput;
    expect(violationsIn(buildXml(scenario.kind, input), scenario.label)).toEqual([]);
  });

  it.each(GOLDEN_SCENARIOS.map(s => [s.slug, s.input] as const))('golden/%s', (slug, input) => {
    expect(violationsIn(buildXml('invoice', input), `golden/${slug}`)).toEqual([]);
  });

  it('sentetik ActualPackage parçası (PACKAGE_SEQ + CUSTOMS_DECLARATION_SEQ)', () => {
    const xml = syntheticPackageXml();
    expect(xml).toContain('<cac:ActualPackage>');
    expect(violationsIn(xml, 'synthetic:ActualPackage')).toEqual([]);
  });
});

describe('sekans bekçisi — kendi kendini sınar (negatif kontrol)', () => {
  /**
   * Bekçinin ÇALIŞTIĞININ kanıtı testin içinde durur: mekanizmanın gerçekten
   * ihlal yakaladığını görmek için serializer'ı elle bozmak gerekmesin.
   */
  it('kardeş elemanlar yer değiştirince ihlal yakalar', () => {
    const xml = [
      '<Root>',
      '  <cac:Party>',
      '    <cac:PartyLegalEntity><cbc:RegistrationName>A</cbc:RegistrationName></cac:PartyLegalEntity>',
      '    <cac:PartyName><cbc:Name>A</cbc:Name></cac:PartyName>',
      '  </cac:Party>',
      '</Root>',
    ].join('\n');
    const violations = violationsIn(xml, 'negatif');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('sıra dışı');
    expect(violations[0]).toContain('PartyName');
  });

  it('tabloda olmayan eleman yazılırsa ihlal yakalar', () => {
    const xml = '<Root><cac:Price><cbc:BaseQuantity>1</cbc:BaseQuantity></cac:Price></Root>';
    const violations = violationsIn(xml, 'negatif');
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('sekansında YOK');
  });

  it('tekrarlı eleman ihlal DEĞİLDİR', () => {
    const xml = [
      '<Root>',
      '  <cac:TaxTotal>',
      '    <cbc:TaxAmount>1</cbc:TaxAmount>',
      '    <cac:TaxSubtotal><cbc:TaxAmount>1</cbc:TaxAmount></cac:TaxSubtotal>',
      '    <cac:TaxSubtotal><cbc:TaxAmount>0</cbc:TaxAmount></cac:TaxSubtotal>',
      '  </cac:TaxTotal>',
      '</Root>',
    ].join('\n');
    expect(violationsIn(xml, 'tekrar')).toEqual([]);
  });

  it('imza alt ağacı (ext:UBLExtensions) denetim dışıdır', () => {
    const xml = [
      '<Root>',
      '  <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent>',
      '    <cac:Price><cbc:BaseQuantity>1</cbc:BaseQuantity></cac:Price>',
      '  </ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>',
      '</Root>',
    ].join('\n');
    expect(violationsIn(xml, 'imza')).toEqual([]);
  });
});

describe('sekans bekçisi — kapsam', () => {
  it('her sekans tablosu en az bir kez gerçekten sınandı', () => {
    // Bu test korpus testlerinden SONRA koşar (vitest dosya içi sırayı korur),
    // `exercisedTypes` o koşumlarda dolar.
    const all = Object.keys(SEQUENCE_BY_COMPLEX_TYPE).sort();
    expect(all.length).toBe(29);
    expect(all.filter(t => !exercisedTypes.has(t))).toEqual([]);
  });
});
