/**
 * XSD sekans üreteci (S2a).
 *
 * `src/ubl/sequences/xsd-sequence.generated.ts` dosyasını **GİB UBL-TR XSD'sinden**
 * üretir. Daha önce tablolar stok OASIS şemasından ELLE kopyalanmıştı; GİB'in
 * daralttığı slotlar tabloda kalmış, bir alan adı da (`CorporationStockAmount`)
 * yanlış yazılmıştı. Tablolar `emitInOrder` ile **taşıyıcı** hâle geldiğinden
 * (S1) yanlış tablo yarın yanlış emit sırası demektir — bu yüzden tek doğruluk
 * kaynağı artık XSD'nin kendisidir.
 *
 * Modlar:
 *   - `tsx scripts/generate-sequences.ts`          → dosyayı yaz
 *   - `tsx scripts/generate-sequences.ts --check`  → diff varsa exit 1 (CI drift)
 *
 * Kaynak XSD'ler repoya taşınmıştır (`schemas/ubl-tr/`, bkz. oradaki README):
 * drift denetiminin makineye bağlı mutlak bir yola muhtaç olmaması için.
 * Başka bir kökten okumak için `--source=<yol>` verin (kökün altında `common/`
 * ve `maindoc/` beklenir) — bu kip tazeleme öncesi karşılaştırma içindir.
 *
 * Kararlar:
 *   - In-house regex tarayıcı, XML kütüphanesi yok: GİB'in daraltılmış şeması
 *     düz `xsd:sequence` + `xsd:element ref` kullanır; `xsd:choice`, `xsd:group`,
 *     `xsd:complexContent` ve `xsd:extension` HİÇ geçmez (üreteç bunu doğrular
 *     ve geçerse patlar — sessiz yanlış tablo üretmez).
 *   - Tablo → complexType eşlemesi ELLE tutulur (`TABLES`): hangi UBL tipini
 *     serileştirdiğimiz bir tasarım kararıdır, XSD'den türetilemez.
 *   - Üretilen dosya ayrıca `ELEMENT_COMPLEX_TYPE` haritasını taşır: XML eleman
 *     adı → complexType. Bekçi testi (`sequence-order-guard`) üretilen XML'deki
 *     her elemanı bununla tablosuna bağlar.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname shim (ESM/CJS arası uyumlu) — generate-session-paths.ts ile aynı desen.
const SCRIPT_DIR = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(SCRIPT_DIR, '..');

/** Repo köküne göreli POSIX yolunu mutlak dosya yoluna çevirir. */
function absPath(repoRelative: string): string {
  return join(REPO_ROOT, ...repoRelative.split('/'));
}

/** Üretilen dosya — repo köküne göreli POSIX yolu. */
const OUTPUT_FILE = 'src/ubl/sequences/xsd-sequence.generated.ts';

/** Repoya taşınmış GİB XSD kökü — repo köküne göreli POSIX yolu. */
const DEFAULT_SOURCE_ROOT = 'schemas/ubl-tr';

/**
 * Okunacak XSD dosyaları — kök klasöre göreli POSIX yolları.
 *
 * Yeni bir belge tipi üretilmeye başlandığında (CreditNote, ReceiptAdvice, …)
 * ilgili maindoc dosyası buraya, kök tablosu da `TABLES`'a eklenir.
 */
const SOURCES = [
  'common/UBL-CommonAggregateComponents-2.1.xsd',
  'maindoc/UBL-Invoice-2.1.xsd',
  'maindoc/UBL-DespatchAdvice-2.1.xsd',
] as const;

interface TableSpec {
  /** Üretilecek sabit adı (örn. `PARTY_SEQ`). */
  constName: string;
  /** Kaynak XSD complexType adı (örn. `PartyType`). */
  complexType: string;
  /** JSDoc'a düşen serbest not — tabloya dair bilinmesi gereken. */
  notes?: readonly string[];
}

/**
 * Serileştirdiğimiz UBL tipleri. Sıra = üretilen dosyadaki sıra (okunabilirlik
 * ve diff istikrarı için elle gruplanmıştır).
 *
 * `notes` alanındaki uyarılar tablo davranışına dairdir ve üretimden ÖNCE de
 * geçerliydi; kaybolmasınlar diye üreteçte yaşarlar.
 */
const TABLES: readonly TableSpec[] = [
  // ─── Kökler ──────────────────────────────────────────────────────────────
  {
    constName: 'INVOICE_SEQ',
    complexType: 'InvoiceType',
    notes: [
      'GİB, stok OASIS `InvoiceType`\'ından `AccountingCostCode`, `ProjectReference`,',
      '`PayeeParty`, `DeliveryTerms` ve `PrepaidPayment` slotlarını ATMIŞTIR; elle',
      'kopyalanan eski tabloda bu beş slot duruyordu (emit edilmedikleri için',
      'çıktıya yansımamıştı).',
    ],
  },
  {
    constName: 'DESPATCH_SEQ',
    complexType: 'DespatchAdviceType',
    notes: ['GİB `DocumentStatusCode` slotunu atmıştır (eski elle kopyada vardı).'],
  },

  // ─── Satırlar ────────────────────────────────────────────────────────────
  {
    constName: 'INVOICE_LINE_SEQ',
    complexType: 'InvoiceLineType',
    notes: ['B-10: `Delivery`, `AllowanceCharge` ÖNCESİNDEDİR — GİB sırası da böyledir.'],
  },
  { constName: 'DESPATCH_LINE_SEQ', complexType: 'DespatchLineType' },

  // ─── Vergi ───────────────────────────────────────────────────────────────
  { constName: 'TAX_TOTAL_SEQ', complexType: 'TaxTotalType' },
  { constName: 'TAX_SUBTOTAL_SEQ', complexType: 'TaxSubtotalType' },
  {
    constName: 'TAX_CATEGORY_SEQ',
    complexType: 'TaxCategoryType',
    notes: [
      'B-09: `TaxExemptionReasonCode` / `TaxExemptionReason` `TaxCategory` ALTINDADIR,',
      '`TaxSubtotal` altında değil. GİB bu tipi dört elemana daraltmıştır: `ID`,',
      '`Percent`, `BaseUnitMeasure`, `PerUnitAmount`, `TierRange`, `TierRatePercent`',
      'UBL-TR\'de YOKTUR.',
    ],
  },
  { constName: 'TAX_SCHEME_SEQ', complexType: 'TaxSchemeType' },

  // ─── Tutar / iskonto ─────────────────────────────────────────────────────
  {
    constName: 'ALLOWANCE_CHARGE_SEQ',
    complexType: 'AllowanceChargeType',
    notes: ['B-12: `AllowanceChargeReason` (= girdi tarafındaki `reason`) `ChargeIndicator` hemen sonrasındadır.'],
  },
  {
    constName: 'LEGAL_MONETARY_TOTAL_SEQ',
    complexType: 'MonetaryTotalType',
    notes: [
      'Eski elle kopyada `PrepaidAmount` + `PayableAlternativeAmount` vardı, GİB\'de',
      'YOK; buna karşılık GİB\'in `PayableRoundingAmount` slotu tabloda EKSİKTİ.',
      'Üçü de emit edilmiyor, o yüzden çıktı etkilenmedi.',
    ],
  },
  { constName: 'EXCHANGE_RATE_SEQ', complexType: 'ExchangeRateType' },
  { constName: 'PAYMENT_MEANS_SEQ', complexType: 'PaymentMeansType' },

  // ─── Kalem ───────────────────────────────────────────────────────────────
  {
    constName: 'ITEM_SEQ',
    complexType: 'ItemType',
    notes: ['B-13: `Description`, `Name`\'den ÖNCE gelir — GİB sırası da böyledir.'],
  },
  {
    constName: 'PRICE_SEQ',
    complexType: 'PriceType',
    notes: [
      'GİB `PriceType`\'ı TEK elemana (`PriceAmount`) daraltmıştır. Eski elle kopyada',
      '13 slot vardı ve `PricingExchangeRate` İKİ KEZ yazılmıştı.',
    ],
  },
  {
    constName: 'ITEM_IDENTIFICATION_SEQ',
    complexType: 'ItemIdentificationType',
    notes: [
      'Beş eleman aynı tiptedir: `BuyersItemIdentification`, `SellersItemIdentification`,',
      '`ManufacturersItemIdentification`, `AdditionalItemIdentification`, `ItemIdentification`.',
      'GİB tipi TEK elemana (`cbc:ID`, 1..1) daraltmıştır — değersiz blok şema-geçersizdir.',
    ],
  },
  { constName: 'COMMODITY_CLASSIFICATION_SEQ', complexType: 'CommodityClassificationType' },
  { constName: 'ITEM_INSTANCE_SEQ', complexType: 'ItemInstanceType' },
  { constName: 'ORDER_LINE_REFERENCE_SEQ', complexType: 'OrderLineReferenceType' },
  { constName: 'FINANCIAL_ACCOUNT_SEQ', complexType: 'FinancialAccountType' },

  // ─── Taraf ───────────────────────────────────────────────────────────────
  {
    constName: 'PARTY_SEQ',
    complexType: 'PartyType',
    notes: ['B-34: `PostalAddress` Party verildiğinde her zaman emit edilir (XSD\'de de 1..1\'dir).'],
  },
  {
    constName: 'SUPPLIER_PARTY_SEQ',
    complexType: 'SupplierPartyType',
    notes: [
      '🔴 UBL\'de KALITIM YOKTUR: `SupplierPartyType` `PartyType`\'tan TÜREMEZ, içinde bir',
      '`cac:Party` TAŞIR. `AccountingSupplierParty` / `DespatchSupplierParty` /',
      '`SellerSupplierParty` bu tiptedir — sarmalayıcı bileşen buna göre kurulur.',
    ],
  },
  {
    constName: 'CUSTOMER_PARTY_SEQ',
    complexType: 'CustomerPartyType',
    notes: [
      'Sarmalayıcı ikizi: `AccountingCustomerParty` / `DeliveryCustomerParty` /',
      '`BuyerCustomerParty` / `OriginatorCustomerParty`. İkinci slot `DeliveryContact`\'tır',
      '(tedarikçi tarafındaki `DespatchContact`\'ın karşılığı).',
    ],
  },
  { constName: 'PARTY_NAME_SEQ', complexType: 'PartyNameType' },
  { constName: 'PARTY_IDENTIFICATION_SEQ', complexType: 'PartyIdentificationType' },
  {
    constName: 'SIGNATURE_SEQ',
    complexType: 'SignatureType',
    notes: [
      '`cac:SignatoryParty` de bir `PartyType`\'tır — ortak taraf gövdesinden geçer.',
      'Kütüphane imza ÜRETMEZ; bu tablo `serializeSignature`\'ın sırasını bağlar.',
    ],
  },
  {
    constName: 'PERSON_SEQ',
    complexType: 'PersonType',
    notes: [
      'B-20: `Title`, `MiddleName` ÖNCESİNDEDİR. Eski elle kopyada `ResidenceAddress`',
      'İKİ KEZ yazılıydı; GİB `PersonType`\'ında bu slot hiç yoktur.',
    ],
  },
  { constName: 'CONTACT_SEQ', complexType: 'ContactType' },
  { constName: 'PARTY_TAX_SCHEME_SEQ', complexType: 'PartyTaxSchemeType' },
  {
    constName: 'PARTY_LEGAL_ENTITY_SEQ',
    complexType: 'PartyLegalEntityType',
    notes: [
      'Eski elle kopyada alan adı `CorporationStockAmount` yazılıydı; UBL\'deki doğru ad',
      '`CorporateStockAmount`. Emit edilmediği için hata görünmüyordu.',
    ],
  },
  {
    constName: 'ADDRESS_SEQ',
    complexType: 'AddressType',
    notes: ['B-35: `CitySubdivisionName` + `CityName` GİB\'de zorunludur ve bu sırayla yazılır.'],
  },
  {
    constName: 'COUNTRY_SEQ',
    complexType: 'CountryType',
    notes: [
      'B-100: `IdentificationCode` → `Name`. GİB `Name`\'i 1..1\'e daraltmıştır; yalnız kod',
      'verilen `cac:Country` şema-geçersizdir (bkz. `originCountryBlock`).',
    ],
  },

  // ─── Teslimat / sevkiyat ─────────────────────────────────────────────────
  {
    constName: 'DELIVERY_SEQ',
    complexType: 'DeliveryType',
    notes: [
      'B-14 / B-101: `DeliveryAddress` → `CarrierParty` → `Despatch`.',
      'DİKKAT: stok OASIS UBL 2.1\'de sıra `DeliveryParty` → `CarrierParty`\'dir; GİB bu',
      'ikisini TERS çevirmiştir. UBL-TR belgesi ürettiğimiz için GİB sırası bağlayıcıdır.',
    ],
  },
  {
    constName: 'DELIVERY_DESPATCH_SEQ',
    complexType: 'DespatchType',
    notes: [
      '⚠️ Bu `cac:Delivery/cac:Despatch` (sevk olayı) tablosudur — belge KÖKÜ olan',
      '`DespatchAdviceType` (`DESPATCH_SEQ`) ile karıştırılmamalıdır. İrsaliyede',
      '`ActualDespatchDate` + `ActualDespatchTime` buradan yazılır.',
    ],
  },
  { constName: 'DELIVERY_TERMS_SEQ', complexType: 'DeliveryTermsType' },
  { constName: 'SHIPMENT_SEQ', complexType: 'ShipmentType' },
  { constName: 'GOODS_ITEM_SEQ', complexType: 'GoodsItemType' },
  {
    constName: 'SHIPMENT_STAGE_SEQ',
    complexType: 'ShipmentStageType',
    notes: [
      'İrsaliye plaka + sürücü yolu: `TransportMeans` (→ `RoadTransport/LicensePlateID`)',
      'ÖNCE, `DriverPerson` SONRA. Fatura tarafı aynı tipte `TransportModeCode`',
      'kullanır (İHRACAT) — iki belge tipi tek tabloyu paylaşır.',
    ],
  },
  { constName: 'TRANSPORT_MEANS_SEQ', complexType: 'TransportMeansType' },
  { constName: 'ROAD_TRANSPORT_SEQ', complexType: 'RoadTransportType' },
  { constName: 'TRANSPORT_EQUIPMENT_SEQ', complexType: 'TransportEquipmentType' },
  {
    constName: 'TRANSPORT_HANDLING_UNIT_SEQ',
    complexType: 'TransportHandlingUnitType',
    notes: [
      'GİB `CustomsDeclaration`\'ı tipin SONUNA almıştır; eski elle kopyada 21. sıradaydı',
      've `ShipmentDocumentReference`\'tan ÖNCE geliyordu. Aradaki hiçbir slot emit',
      'edilmediği için taşınma çıktıyı değiştirmedi (B-07 / IHRACKAYITLI + 702 yolu).',
    ],
  },
  {
    constName: 'PACKAGE_SEQ',
    complexType: 'PackageType',
    notes: [
      'B-102: sıra `ID` → `Quantity` → … → `PackagingTypeCode`\'dur. Eski serializer',
      '`PackagingTypeCode`\'u `Quantity`\'den ÖNCE yazıyordu; iki alan birlikte',
      'verildiğinde çıktı şema-geçersizdi.',
    ],
  },
  { constName: 'CUSTOMS_DECLARATION_SEQ', complexType: 'CustomsDeclarationType' },

  // ─── Referanslar / dönem ─────────────────────────────────────────────────
  {
    constName: 'DOCUMENT_REFERENCE_SEQ',
    complexType: 'DocumentReferenceType',
    notes: [
      '🔴 «DocumentTypeCode bu konumda geçersiz, beklenen: IssueDate» hatası bu tablodan',
      'GELMEZ. Sıra XSD\'ye birebir uygundur; GİB\'in mesajı gerçekte EKSİK ELEMAN demektir:',
      'UBL-TR `cbc:IssueDate`\'i 1..1\'e daraltmıştır, tarih atlanınca doğrulayıcı bir sonraki',
      'elemanı "yanlış konumda" sayar. Düzeltme `reference-serializer.ts`tedir.',
    ],
  },
  { constName: 'ORDER_REFERENCE_SEQ', complexType: 'OrderReferenceType' },
  { constName: 'BILLING_REFERENCE_SEQ', complexType: 'BillingReferenceType' },
  { constName: 'PERIOD_SEQ', complexType: 'PeriodType' },
];

// ─── XSD tarayıcı ─────────────────────────────────────────────────────────────

interface ParsedSchema {
  /** complexType adı → `xsd:sequence` içindeki eleman yerel adları (sırayla). */
  types: Map<string, { elements: string[]; sourceFile: string }>;
  /** Genel eleman adı → complexType adı. */
  elementTypes: Map<string, string>;
}

/**
 * Üretecin varsaydığı şema biçimi: düz `xsd:sequence` + `xsd:element ref`.
 *
 * GİB'in daraltılmış paketi bugün bunların HİÇBİRİNİ kullanmaz. Kullanmaya
 * başlarsa regex tarayıcı sessizce eksik/yanlış tablo üretirdi — o yüzden
 * varsayım burada açıkça denetlenir.
 */
const UNSUPPORTED_CONSTRUCTS = ['<xsd:choice', '<xsd:group', '<xsd:complexContent', '<xsd:extension', '<xsd:any'];

function parseSchema(sourceRoot: string, relativeFiles: readonly string[]): ParsedSchema {
  const types = new Map<string, { elements: string[]; sourceFile: string }>();
  const elementTypes = new Map<string, string>();

  for (const relative of relativeFiles) {
    const file = join(sourceRoot, ...relative.split('/'));
    if (!existsSync(file)) {
      throw new Error(`XSD kaynağı bulunamadı: ${file}`);
    }
    const src = readFileSync(file, 'utf-8');

    for (const construct of UNSUPPORTED_CONSTRUCTS) {
      if (src.includes(construct)) {
        throw new Error(
          `${relative}: desteklenmeyen XSD yapısı ${construct}. ` +
            'Regex tarayıcı yalnız düz xsd:sequence + xsd:element ref tanır; ' +
            'şema değiştiyse üreteç GERÇEK bir XML çözümleyicisine taşınmalıdır.',
        );
      }
    }

    // <xsd:element name="X" type="[ns:]Y"/> — genel eleman bildirimi.
    for (const m of src.matchAll(/<xsd:element\s+name="([A-Za-z0-9_]+)"\s+type="(?:[A-Za-z0-9_]+:)?([A-Za-z0-9_]+)"\s*\/>/g)) {
      const [, name, type] = m;
      const previous = elementTypes.get(name);
      if (previous && previous !== type) {
        throw new Error(`Çelişkili eleman bildirimi: ${name} → ${previous} ile ${type} (${relative})`);
      }
      elementTypes.set(name, type);
    }

    // <xsd:complexType name="XType"> … <xsd:element ref="[ns:]Child"/> …
    for (const m of src.matchAll(/<xsd:complexType\s+name="([A-Za-z0-9_]+)"\s*>([\s\S]*?)<\/xsd:complexType>/g)) {
      const [, name, body] = m;
      const elements = [...body.matchAll(/<xsd:element\s+ref="(?:[A-Za-z0-9_]+:)?([A-Za-z0-9_]+)"/g)].map(x => x[1]);
      const previous = types.get(name);
      if (previous) {
        if (previous.elements.join('|') !== elements.join('|')) {
          throw new Error(
            `Aynı complexType iki kaynakta FARKLI tanımlı: ${name} ` +
              `(${previous.sourceFile} ↔ ${relative}). Hangisinin bağlayıcı olduğu belirsiz.`,
          );
        }
        continue;
      }
      types.set(name, { elements, sourceFile: relative });
    }
  }

  return { types, elementTypes };
}

// ─── Çıktı üretimi ────────────────────────────────────────────────────────────

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function renderNotes(notes: readonly string[] | undefined): string {
  if (!notes || notes.length === 0) return '';
  return notes.map(line => ` * ${line}`).join('\n');
}

function renderTable(spec: TableSpec, parsed: ParsedSchema): string {
  const entry = parsed.types.get(spec.complexType);
  if (!entry) {
    throw new Error(`${spec.constName}: complexType "${spec.complexType}" XSD kaynaklarında YOK.`);
  }
  if (entry.elements.length === 0) {
    throw new Error(`${spec.constName}: complexType "${spec.complexType}" boş sekans döndürdü.`);
  }
  const duplicates = entry.elements.filter((x, i) => entry.elements.indexOf(x) !== i);
  if (duplicates.length > 0) {
    throw new Error(`${spec.constName}: XSD sekansında tekrar eden eleman(lar): ${duplicates.join(', ')}`);
  }

  const doc: string[] = [
    '/**',
    ` * \`${spec.complexType}\` — ${entry.sourceFile}`,
  ];
  if (spec.notes && spec.notes.length > 0) {
    doc.push(' *');
    doc.push(renderNotes(spec.notes));
  }
  doc.push(' */');

  const body = entry.elements.map(e => `  '${e}',`).join('\n');
  return `${doc.join('\n')}\nexport const ${spec.constName} = [\n${body}\n] as const;`;
}

/**
 * XML eleman adı → complexType haritası — YALNIZ tablosu olan tipler için.
 *
 * Bekçi testi üretilen XML'de gördüğü her elemanı buradan tablosuna bağlar;
 * `cac:AccountingSupplierParty` gibi tablosuz sarmalayıcılar haritada yoktur ve
 * testçe atlanır (çocuklarına yine inilir).
 */
function renderElementMap(parsed: ParsedSchema): string {
  const tabledTypes = new Map(TABLES.map(t => [t.complexType, t.constName]));
  const rows: string[] = [];
  for (const [element, type] of [...parsed.elementTypes].sort(([a], [b]) => a.localeCompare(b))) {
    if (!tabledTypes.has(type)) continue;
    rows.push(`  ${element}: '${type}',`);
  }
  return [
    '/**',
    ' * XML eleman yerel adı → XSD complexType adı (yalnız sekans tablosu OLAN tipler).',
    ' *',
    ' * Aynı tip birden çok eleman adıyla görünür: `cac:PostalAddress` ve',
    ' * `cac:DeliveryAddress` ikisi de `AddressType`\'tır. Bekçi testi bu haritayla',
    ' * çıktıdaki her elemanı doğru tabloya bağlar.',
    ' */',
    'export const ELEMENT_COMPLEX_TYPE: Readonly<Record<string, string>> = {',
    ...rows,
    '};',
  ].join('\n');
}

/** complexType adı → sekans tablosu. Bekçi testi eşlemeyi buradan okur. */
function renderTypeSequenceMap(): string {
  const rows = TABLES.map(t => `  ${t.complexType}: ${t.constName},`);
  return [
    '/**',
    ' * complexType adı → sekans tablosu.',
    ' *',
    ' * `ELEMENT_COMPLEX_TYPE` ile birlikte "şu eleman şu sırayı izlemeli" zincirini',
    ' * tamamlar. Yeni bir tablo eklendiğinde buraya da ELİNLE değil, üreteçle gelir.',
    ' */',
    'export const SEQUENCE_BY_COMPLEX_TYPE: Readonly<Record<string, readonly string[]>> = {',
    ...rows,
    '};',
  ].join('\n');
}

function generate(sourceRoot: string): string {
  const parsed = parseSchema(sourceRoot, SOURCES);

  const provenance = SOURCES.map(relative => {
    const file = join(sourceRoot, ...relative.split('/'));
    return `//   ${relative}  sha256:${sha256(file)}`;
  });

  const header = [
    '// =====================================================================',
    '// @generated',
    '// THIS FILE IS AUTO-GENERATED by scripts/generate-sequences.ts',
    '// DO NOT EDIT BY HAND. Edits will be lost on next regeneration.',
    `// Generator input: ${DEFAULT_SOURCE_ROOT}/ (GİB UBL-TR daraltılmış XSD)`,
    ...provenance,
    '// =====================================================================',
    '//',
    '// UBL element yazım sırası tabloları — her tip için XSD `xsd:sequence` sırası.',
    '//',
    '// Tablolar TAŞIYICIDIR: `emitInOrder(SEQ, emitters)` emit sırasını doğrudan',
    '// buradan alır (bkz. `xsd-sequence.ts`). Zorunlu/opsiyonel ayrımı tabloda DEĞİL,',
    '// emitter tarafındadır (`cbcRequiredTag` / `cbcOptionalTag`); tablo yalnız',
    '// POZİSYON belirler.',
    '//',
    '// GİB paketi stok OASIS UBL 2.1\'i DARALTIR: burada görünmeyen bir slot UBL-TR\'de',
    '// yoktur, emit edilemez. Sıra da yer yer OASIS\'ten AYRILIR (bkz. `DELIVERY_SEQ`,',
    '// `TRANSPORT_HANDLING_UNIT_SEQ` notları).',
  ].join('\n');

  const blocks = [
    header,
    ...TABLES.map(spec => renderTable(spec, parsed)),
    renderElementMap(parsed),
    renderTypeSequenceMap(),
    '',
  ];

  return blocks.join('\n\n');
}

// ─── Ana akış ─────────────────────────────────────────────────────────────────

function normalizeLineEndings(s: string): string {
  return s.replace(/\r\n/g, '\n');
}

function parseSourceFlag(argv: readonly string[]): string {
  const flag = argv.find(a => a.startsWith('--source='));
  if (!flag) return absPath(DEFAULT_SOURCE_ROOT);
  const value = flag.slice('--source='.length);
  return value.startsWith('/') ? value : join(process.cwd(), value);
}

function main(): void {
  const checkMode = process.argv.includes('--check');
  const sourceRoot = parseSourceFlag(process.argv);
  const generated = generate(sourceRoot);
  const outputPath = absPath(OUTPUT_FILE);

  if (!checkMode) {
    writeFileSync(outputPath, generated, 'utf-8');
    console.log(`Generated ${outputPath} (${generated.split('\n').length} lines, ${TABLES.length} tables)`);
    return;
  }

  if (!existsSync(outputPath)) {
    console.error(`Sequence drift: ${outputPath} does not exist. Run \`npm run generate:sequences\` to create.`);
    process.exit(1);
  }

  const existing = readFileSync(outputPath, 'utf-8');
  if (normalizeLineEndings(generated) !== normalizeLineEndings(existing)) {
    console.error(`Sequence drift detected in ${OUTPUT_FILE}. Run \`npm run generate:sequences\` to regenerate.`);
    console.error(`  Expected: ${generated.length} chars`);
    console.error(`  Found:    ${existing.length} chars`);
    process.exit(1);
  }

  console.log(`${OUTPUT_FILE} up to date (${TABLES.length} tables).`);
}

export { generate, parseSchema, TABLES, SOURCES, DEFAULT_SOURCE_ROOT, OUTPUT_FILE };

// Direct execution kontrolü (tsx ile çalıştırıldığında)
const isMain = (() => {
  try {
    const url = import.meta.url;
    const argv1 = process.argv[1];
    return url && argv1 && url.endsWith(argv1.replace(/\\/g, '/').split('/').pop() ?? '');
  } catch {
    return require.main === module;
  }
})();

if (isMain) {
  main();
}
