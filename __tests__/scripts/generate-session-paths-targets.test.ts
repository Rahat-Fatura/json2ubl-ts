/**
 * Tip-parametrik üreteç testleri (Sprint 10).
 *
 * Üreteç artık faturaya sabitlenmiş değil; `GeneratorTarget` tablosu üzerinden
 * birden çok belge tipi üretir. Bu dosya üç şeyi korur:
 *
 *   1. Fatura çıktısının BYTE-İDENTİK kalması (hedef tablosu birebir taşıdı mı?)
 *   2. Alias tablosunun hedefe YEREL olması (eski global `TYPE_ALIASES` sızıntısı)
 *   3. e-İrsaliye hedefinin `DespatchSession` için gereken derinliği üretmesi
 *
 * Mevcut `generate-session-paths.test.ts` dosyası DEĞİŞMEDEN geçer: `generateSessionPaths()`
 * sıfır argümanla çağrıldığında hâlâ fatura hedefini üretir.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateSessionPaths,
  INVOICE_TARGET,
  DESPATCH_TARGET,
  TARGETS,
  type GeneratorTarget,
} from '../../scripts/generate-session-paths';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Sızıntı probu: alias'ı KENDİ dosyasında tanımlı olan hedef. */
const LEAK_DONOR_TARGET: GeneratorTarget = {
  sourceFile: '__tests__/fixtures/generator/alias-donor.ts',
  rootInterface: 'LeakDonorInput',
  outputFile: 'src/calculator/__leak-donor.generated.ts',   // hiç yazılmaz
  constName: 'LeakDonorPaths',
  mapTypeName: 'LeakDonorPathMap',
  overloadsName: 'LeakDonorSessionUpdateOverloads',
  templatesName: 'LEAK_DONOR_KNOWN_PATH_TEMPLATES',
  readOnlyName: 'LEAK_DONOR_READ_ONLY_PATHS',
  manualEntries: [],
  readOnlyPaths: [],
  maxDepth: 3,
  exampleIndexedPath: 'items[0].id',
};

/** Sızıntı probu: AYNI alias adını kullanan ama TANIMLAMAYAN hedef. */
const LEAK_CONSUMER_TARGET: GeneratorTarget = {
  ...LEAK_DONOR_TARGET,
  sourceFile: '__tests__/fixtures/generator/alias-consumer.ts',
  rootInterface: 'LeakConsumerInput',
  outputFile: 'src/calculator/__leak-consumer.generated.ts',
  constName: 'LeakConsumerPaths',
  mapTypeName: 'LeakConsumerPathMap',
  overloadsName: 'LeakConsumerSessionUpdateOverloads',
  templatesName: 'LEAK_CONSUMER_KNOWN_PATH_TEMPLATES',
  readOnlyName: 'LEAK_CONSUMER_READ_ONLY_PATHS',
};

describe('tip-parametrik üreteç — hedef yalıtımı', () => {
  it('alias tablosu hedefe yereldir: donor üretimi consumer çıktısına SIZMAZ', () => {
    // Sıralama kritik: consumer ÖNCE (temiz süreç), sonra donor, sonra consumer YİNE.
    // Alias tablosu modül düzeyinde global olsaydı donor'un `LeakProbeAlias` tanımı
    // ikinci consumer üretiminde kullanılır ve iki çıktı ayrışırdı.
    const consumerBefore = generateSessionPaths(LEAK_CONSUMER_TARGET);
    generateSessionPaths(LEAK_DONOR_TARGET);
    const consumerAfter = generateSessionPaths(LEAK_CONSUMER_TARGET);

    expect(consumerAfter).toBe(consumerBefore);
  });

  it('consumer çıktısı donor alias değerlerini HİÇ taşımaz', () => {
    generateSessionPaths(LEAK_DONOR_TARGET);
    const consumer = generateSessionPaths(LEAK_CONSUMER_TARGET);

    expect(consumer).not.toContain('DONOR_ALIAS_A');
    expect(consumer).not.toContain('DONOR_ALIAS_B');
    // Kendi alanı yerinde — fixture gerçekten okunuyor.
    expect(consumer).toContain("consumerOwnField: 'consumerOwnField',");
  });

  it('donor KENDİ alias\'ını çözer (fixture kurgusunun kanıtı)', () => {
    const donor = generateSessionPaths(LEAK_DONOR_TARGET);
    expect(donor).toContain("'DONOR_ALIAS_A' | 'DONOR_ALIAS_B'");
  });
});

describe('tip-parametrik üreteç — fatura hedefi geriye uyumu', () => {
  it('sıfır argümanlı çağrı fatura hedefini üretir', () => {
    expect(generateSessionPaths()).toBe(generateSessionPaths(INVOICE_TARGET));
  });

  it('fatura çıktısı diskteki session-paths.generated.ts ile BYTE-İDENTİK', () => {
    const onDisk = readFileSync(join(REPO_ROOT, 'src', 'calculator', 'session-paths.generated.ts'), 'utf-8');
    expect(generateSessionPaths(INVOICE_TARGET)).toBe(onDisk);
  });

  it('fatura derinliği 3\'te kalır — deliveryAddress alt kırılımı üretilmez', () => {
    const out = generateSessionPaths(INVOICE_TARGET);
    expect(out).not.toMatch(/lineDeliveryDeliveryAddress/);
    expect(out).not.toContain('deliveryAddress.city');
  });

  it('fatura hedefi manuel girdi ve read-only path\'i taşımayı sürdürür', () => {
    expect(INVOICE_TARGET.manualEntries.map(e => e.key)).toEqual(['liability']);
    expect(INVOICE_TARGET.readOnlyPaths).toEqual(['isExport']);
    expect(INVOICE_TARGET.maxDepth).toBe(3);
  });
});

describe('tip-parametrik üreteç — e-İrsaliye hedefi', () => {
  const out = generateSessionPaths(DESPATCH_TARGET);

  it('deterministiktir (aynı kaynaktan iki üretim birebir aynı)', () => {
    expect(generateSessionPaths(DESPATCH_TARGET)).toBe(out);
  });

  it('kendi sembol adlarını kullanır, fatura adlarını kullanmaz', () => {
    expect(out).toContain('export const DespatchSessionPaths = {');
    expect(out).toContain('export interface DespatchSessionPathMap {');
    expect(out).toContain('export interface DespatchSessionUpdateOverloads {');
    expect(out).toContain('export const DESPATCH_KNOWN_PATH_TEMPLATES: ReadonlySet<string> = new Set([');
    expect(out).toContain('export const DESPATCH_READ_ONLY_PATHS: ReadonlySet<string> = new Set([]);');
    expect(out).not.toContain('export const SessionPaths = {');
    expect(out).not.toContain('export interface SessionPathMap {');
  });

  it('manuel girdi ve read-only path YOKTUR (irsaliyede muadili yok)', () => {
    expect(DESPATCH_TARGET.manualEntries).toHaveLength(0);
    expect(DESPATCH_TARGET.readOnlyPaths).toHaveLength(0);
    expect(out).toContain('// Manual entries: (none)');
    expect(out).toContain('// Read-only paths: (none)');
    expect(out).not.toContain("liability: 'liability',");
  });

  it('kök alanları üretir (id, uuid, datetime, despatchContactName)', () => {
    expect(out).toContain("id: 'id',");
    expect(out).toContain("uuid: 'uuid',");
    // `Simple*` katmanı tarih/saati TEK alanda konuşur; ham `issueDate` + `issueTime`
    // ikilisine mapper böler (fatura ile aynı sözleşme).
    expect(out).toContain("datetime: 'datetime',");
    expect(out).toContain("despatchContactName: 'despatchContactName',");
  });

  it('🔴 tip/profil DÜZ STRING\'dir — nominal enum yol yüzeyine SIZMAZ', () => {
    /* Ham hedefte bu iki alan `DespatchTypeCode` / `DespatchProfileId` enum'larıydı
     * ve TS string enum'u NOMİNAL olduğu için `update('type', 'SEVK')` çağrısı
     * derlenmiyordu. `SimpleDespatchInput` düz string konuştuğu için sorun kökten
     * düşer — faturada `SimpleInvoiceInput.profile` de düz `string`'tir. */
    expect(out).toContain("type: 'type',");
    expect(out).toContain("profile: 'profile',");
    expect(out).toContain("'type': string | undefined;");
    expect(out).toContain("'profile': string | undefined;");
    expect(out).not.toContain("'TEMELIRSALIYE' | 'HKSIRSALIYE' | 'IDISIRSALIYE'");
    expect(out).not.toContain("'SEVK' | 'MATBUDAN'");
  });

  it('bağımlılık dosyasından gelen ORTAK taraf tipini çözer (simple-types.ts)', () => {
    // `SimplePartyInput` fatura ile ORTAKTIR → irsaliye yüzeyi de `sender.taxNumber` der.
    expect(out).toContain("senderTaxNumber: 'sender.taxNumber',");
    expect(out).toContain("customerTaxNumber: 'customer.taxNumber',");
    expect(DESPATCH_TARGET.dependencyFiles).toEqual(['src/calculator/simple-types.ts']);
  });

  it('3. derinlik açıktır — DespatchSession\'ın istediği üç aile de üretilir', () => {
    // shipment.deliveryAddress.*
    expect(out).toMatch(/shipmentDeliveryAddressCity:\s*'shipment\.deliveryAddress\.city'/);
    expect(out).toMatch(/shipmentDeliveryAddressDistrict:\s*'shipment\.deliveryAddress\.district'/);
    // shipment.drivers[i].*
    expect(out).toMatch(/shipmentDriverFirstName:\s*\(i:\s*number\)\s*=>\s*`shipment\.drivers\[\$\{i\}\]\.firstName`/);
    expect(out).toMatch(/shipmentDriverNationalityId:\s*\(i:\s*number\)\s*=>\s*`shipment\.drivers\[\$\{i\}\]\.nationalityId`/);
    // shipment.licensePlates[i].*
    expect(out).toMatch(/shipmentLicensePlateValue:\s*\(i:\s*number\)\s*=>\s*`shipment\.licensePlates\[\$\{i\}\]\.value`/);
    expect(out).toMatch(/shipmentLicensePlateScheme:\s*\(i:\s*number\)\s*=>\s*`shipment\.licensePlates\[\$\{i\}\]\.scheme`/);
  });

  it('4. derinliğe kadar iner — taşıyıcı tarafın ek kimlikleri (shipment.carrier.identifications)', () => {
    expect(out).toMatch(
      /shipmentCarrierIdentificationSchemeId:\s*\(i:\s*number\)\s*=>\s*`shipment\.carrier\.identifications\[\$\{i\}\]\.schemeId`/,
    );
    expect(DESPATCH_TARGET.maxDepth).toBe(4);
  });

  it('kalem ek kimlikleri ÇİFT indeksli üretilir (KUNYENO / ETIKETNO)', () => {
    expect(out).toMatch(
      /lineAdditionalIdentificationScheme:\s*\(i:\s*number,\s*ti:\s*number\)\s*=>\s*`lines\[\$\{i\}\]\.additionalIdentifications\[\$\{ti\}\]\.scheme`/,
    );
  });

  it('🔑 düzleştirilmiş beyan değeri yol üretir (eski iç-içe biçimde ÜRETİLEMİYORDU)', () => {
    /* Ham katmanda `shipment.goodsItem.valueAmount.{value,currencyId}` inline nesne
     * literaliydi ve parser literali yalnız BİR kat açtığı için bu yollar hiç
     * doğmuyordu. `SimpleShipmentInput` alanı düzleştirdiği için boşluk kapandı. */
    expect(out).toContain("shipmentGoodsValue: 'shipment.goodsValue',");
    expect(out).toContain("shipmentGoodsValueCurrency: 'shipment.goodsValueCurrency',");
  });

  it('KNOWN_PATH_TEMPLATES yıldızla normalize edilir', () => {
    expect(out).toContain("'shipment.drivers[*].firstName',");
    expect(out).toContain("'shipment.deliveryAddress.city',");
    expect(out).toContain("'lines[*].additionalIdentifications[*].scheme',");
    expect(out).toContain("'shipment.carrier.identifications[*].schemeId',");
  });

  it('overload başlığı hedefin session sınıfına işaret eder', () => {
    expect(out).toContain('`despatch-session.ts` declaration merging ile `DespatchSession` class\'ına enjekte eder');
    expect(out).toContain('export interface DespatchSession extends DespatchSessionUpdateOverloads {}');
  });

  it('diskteki despatch-session-paths.generated.ts ile BYTE-İDENTİK (drift kapısı)', () => {
    const onDisk = readFileSync(join(REPO_ROOT, 'src', 'calculator', 'despatch-session-paths.generated.ts'), 'utf-8');
    expect(out).toBe(onDisk);
  });
});

describe('tip-parametrik üreteç — hedef tablosu', () => {
  it('iki hedef kayıtlı ve her biri AYRI dosyaya üretiyor', () => {
    expect(TARGETS).toHaveLength(2);
    const outputs = TARGETS.map(t => t.outputFile);
    expect(new Set(outputs).size).toBe(outputs.length);
  });

  it('hedeflerin export adları çakışmaz (tek dosyada birleştirilemez olmalarının nedeni)', () => {
    const names = TARGETS.flatMap(t => [t.constName, t.mapTypeName, t.overloadsName, t.templatesName, t.readOnlyName]);
    expect(new Set(names).size).toBe(names.length);
  });
});
