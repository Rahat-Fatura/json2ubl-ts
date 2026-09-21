/**
 * DİZİ ALANI MAKİNESİ — makinenin kendi sözleşmesi + `lines` SIFIR-FARK kanıtı.
 *
 * ## Niye bu dosya var
 *
 * `lines` dörtlüsü üç ayrı gövdeden (`DocumentSession`, `InvoiceSession`,
 * `DespatchSession`) tek bir makineye taşındı. Taşıma "yeşil test" ile
 * kanıtlanamaz: mevcut testler dörtlünün SONUCUNU ölçüyor, olay ADLARINI,
 * yük ŞEKLİNİ ve adım SIRASINI değil. Tüketici (portal store köprüsü)
 * `line-added` dinliyor ve yükten `line`ı okuyor — bu üçü değişirse kütüphane
 * yeşil kalır, tüketici sessizce kırılır.
 *
 * Bu yüzden burada ölçülen şey davranışın KENDİSİdir: ad, yük, sıra, no-op.
 *
 * ## Ölçüm düzeltmesi (kayda geçsin)
 *
 * `InvoiceSession` ve `DespatchSession` `DocumentSession`'dan TÜREMEZ — ikisi
 * de doğrudan `EventEmitter`'ı genişletir. Makine bu yüzden `protected` bir
 * taban metodu değil, modül düzeyinde durumsuz bir fabrikadır.
 */

import { describe, it, expect, vi } from 'vitest';
import { createArrayField, type ArrayFieldChange } from '../../src/session/array-field';
import { InvoiceSession } from '../../src';
import { DespatchSession } from '../../src/calculator/despatch-session';
import { SelfEmployedVoucherSession } from '../../src/documents/self-employed-voucher/session';
import { ProducerReceiptSession } from '../../src/documents/producer-receipt/session';

interface Item {
  name: string;
  qty?: number;
}

/** Makineyi bağımsız bir kaba bağlar; her adımı sırayla kaydeder. */
function harness(initial?: Item[] | undefined) {
  const log: string[] = [];
  let items: Item[] | undefined = initial;
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const changes: ArrayFieldChange<Item>[] = [];

  const ops = createArrayField<Item>({
    read: () => items,
    write: next => {
      items = next;
      log.push('write');
    },
    events: { added: 'thing-added', updated: 'thing-updated', removed: 'thing-removed' },
    itemKey: 'thing',
    emit: (event, payload) => {
      emitted.push({ event, payload });
      log.push(`emit:${event}`);
    },
    afterWrite: change => {
      changes.push(change);
      log.push(`afterWrite:${change.kind}`);
    },
    afterChange: () => {
      log.push('afterChange');
    },
  });

  return { ops, log, emitted, changes, read: () => items };
}

describe('Makine sözleşmesi — adım SIRASI', () => {
  it('ekleme: yaz → afterWrite → olay → afterChange', () => {
    const h = harness([]);
    h.ops.add({ name: 'a' });
    expect(h.log).toEqual(['write', 'afterWrite:add', 'emit:thing-added', 'afterChange']);
  });

  it('güncelleme: yaz → afterWrite → olay → afterChange', () => {
    const h = harness([{ name: 'a' }]);
    h.ops.update(0, { qty: 2 });
    expect(h.log).toEqual(['write', 'afterWrite:update', 'emit:thing-updated', 'afterChange']);
  });

  it('silme: yaz → afterWrite → olay → afterChange', () => {
    const h = harness([{ name: 'a' }]);
    h.ops.remove(0);
    expect(h.log).toEqual(['write', 'afterWrite:remove', 'emit:thing-removed', 'afterChange']);
  });

  it('🔴 topluca-kur OLAY YAYMAZ (`setLines` davranışı)', () => {
    const h = harness([{ name: 'a' }]);
    h.ops.replaceAll([{ name: 'b' }]);
    expect(h.log).toEqual(['write', 'afterWrite:replace', 'afterChange']);
    expect(h.emitted).toEqual([]);
  });

  it('`afterWrite` YAZIMDAN SONRA koşar — kanca güncel diziyi görür', () => {
    const h = harness([]);
    h.ops.add({ name: 'a' });
    expect(h.changes[0]).toEqual({
      kind: 'add',
      index: 0,
      item: { name: 'a' },
      items: [{ name: 'a' }],
    });
  });
});

describe('Makine sözleşmesi — yük şekli', () => {
  it('ekleme/güncelleme yükü `{ index, <itemKey> }`', () => {
    const h = harness([]);
    h.ops.add({ name: 'a' });
    h.ops.update(0, { qty: 5 });
    expect(h.emitted[0]).toEqual({ event: 'thing-added', payload: { index: 0, thing: { name: 'a' } } });
    expect(h.emitted[1]).toEqual({
      event: 'thing-updated',
      payload: { index: 0, thing: { name: 'a', qty: 5 } },
    });
  });

  it('silme yükü YALNIZ `{ index }` taşır', () => {
    const h = harness([{ name: 'a' }]);
    h.ops.remove(0);
    expect(h.emitted[0]).toEqual({ event: 'thing-removed', payload: { index: 0 } });
  });
});

describe('Makine sözleşmesi — sınır dışı indeks SESSİZ no-op', () => {
  it.each([-1, 1, 99])('güncelleme indeks %s → hiçbir adım koşmaz', idx => {
    const h = harness([{ name: 'a' }]);
    h.ops.update(idx, { qty: 1 });
    expect(h.log).toEqual([]);
    expect(h.read()).toEqual([{ name: 'a' }]);
  });

  it.each([-1, 1, 99])('silme indeks %s → hiçbir adım koşmaz', idx => {
    const h = harness([{ name: 'a' }]);
    h.ops.remove(idx);
    expect(h.log).toEqual([]);
    expect(h.read()).toEqual([{ name: 'a' }]);
  });
});

describe('Makine sözleşmesi — kurulmamış alan', () => {
  it('`read()` `undefined` dönerse dizi BOŞ sayılır ve ekleme çalışır', () => {
    const h = harness(undefined);
    expect(h.ops.current()).toEqual([]);
    h.ops.add({ name: 'ilk' });
    expect(h.read()).toEqual([{ name: 'ilk' }]);
  });

  it('kurulmamış alanda güncelleme/silme no-op', () => {
    const h = harness(undefined);
    h.ops.update(0, { qty: 1 });
    h.ops.remove(0);
    expect(h.log).toEqual([]);
    expect(h.read()).toBeUndefined();
  });
});

describe('Makine sözleşmesi — SIRA korunur', () => {
  it('silme kaydırır, yeniden sıralamaz', () => {
    const h = harness([{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }]);
    h.ops.remove(1);
    expect(h.read()?.map(i => i.name)).toEqual(['a', 'c', 'd']);
  });

  it('ekleme her zaman SONA yazar', () => {
    const h = harness([{ name: 'a' }]);
    h.ops.add({ name: 'b' });
    h.ops.add({ name: 'c' });
    expect(h.read()?.map(i => i.name)).toEqual(['a', 'b', 'c']);
  });

  it('güncelleme yerinde kalır — komşuları kımıldatmaz', () => {
    const h = harness([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    h.ops.update(1, { name: 'B' });
    expect(h.read()?.map(i => i.name)).toEqual(['a', 'B', 'c']);
  });

  it('girdi dizisi MUTATE EDİLMEZ — her işlem yeni dizi yazar', () => {
    const original: Item[] = [{ name: 'a' }];
    const h = harness(original);
    h.ops.add({ name: 'b' });
    expect(original).toEqual([{ name: 'a' }]);
  });
});

// ─── `lines` SIFIR-FARK kanıtı — dört oturumun dördünde de ──────────────────

const LINE_SESSIONS = [
  {
    name: 'InvoiceSession',
    make: () => new InvoiceSession(),
    line: { name: 'Ürün', quantity: 2, price: 100, kdvPercent: 20 },
    patch: { quantity: 5 },
  },
  {
    name: 'DespatchSession',
    make: () => new DespatchSession(),
    line: { name: 'Ürün', quantity: 2, unitCode: 'C62' },
    patch: { quantity: 5 },
  },
  {
    name: 'SelfEmployedVoucherSession',
    make: () => new SelfEmployedVoucherSession(),
    line: { name: 'Hizmet', quantity: 1, price: 1000 },
    patch: { price: 2000 },
  },
  {
    name: 'ProducerReceiptSession',
    make: () => new ProducerReceiptSession(),
    line: { name: 'Ürün', quantity: 1, price: 1000 },
    patch: { price: 2000 },
  },
] as const;

describe('🔴 `lines` SIFIR FARK — olay adları ve yük şekli DEĞİŞMEDİ', () => {
  for (const s of LINE_SESSIONS) {
    describe(s.name, () => {
      it('`line-added` yükü `{ index, line }`', () => {
        const session = s.make() as never as {
          on(e: string, fn: (p: unknown) => void): void;
          addLine(l: unknown): void;
        };
        const seen: unknown[] = [];
        session.on('line-added', p => seen.push(p));
        session.addLine({ ...s.line });
        expect(seen).toEqual([{ index: 0, line: { ...s.line } }]);
      });

      it('`line-updated` yükü BİRLEŞTİRİLMİŞ satırı taşır', () => {
        const session = s.make() as never as {
          on(e: string, fn: (p: unknown) => void): void;
          addLine(l: unknown): void;
          updateLine(i: number, u: unknown): void;
        };
        const seen: unknown[] = [];
        session.addLine({ ...s.line });
        session.on('line-updated', p => seen.push(p));
        session.updateLine(0, { ...s.patch });
        expect(seen).toEqual([{ index: 0, line: { ...s.line, ...s.patch } }]);
      });

      it('`line-removed` yükü YALNIZ `{ index }`', () => {
        const session = s.make() as never as {
          on(e: string, fn: (p: unknown) => void): void;
          addLine(l: unknown): void;
          removeLine(i: number): void;
          input: { lines: unknown[] };
        };
        const seen: unknown[] = [];
        session.addLine({ ...s.line });
        session.on('line-removed', p => seen.push(p));
        session.removeLine(0);
        expect(seen).toEqual([{ index: 0 }]);
        expect(session.input.lines).toEqual([]);
      });

      it('`setLines` OLAY YAYMAZ ama `changed` tetikler', () => {
        const session = s.make() as never as {
          on(e: string, fn: (p: unknown) => void): void;
          setLines(l: unknown[]): void;
        };
        const lineEvents: string[] = [];
        let changed = 0;
        for (const e of ['line-added', 'line-updated', 'line-removed']) {
          session.on(e, () => lineEvents.push(e));
        }
        session.on('changed', () => { changed += 1; });
        session.setLines([{ ...s.line }]);
        expect(lineEvents).toEqual([]);
        expect(changed).toBe(1);
      });

      it('sınır dışı `updateLine`/`removeLine` SESSİZ no-op — `changed` bile yaymaz', () => {
        const session = s.make() as never as {
          on(e: string, fn: (p: unknown) => void): void;
          addLine(l: unknown): void;
          updateLine(i: number, u: unknown): void;
          removeLine(i: number): void;
          input: { lines: unknown[] };
        };
        session.addLine({ ...s.line });
        const spy = vi.fn();
        session.on('changed', spy);
        session.updateLine(9, { ...s.patch });
        session.updateLine(-1, { ...s.patch });
        session.removeLine(9);
        session.removeLine(-1);
        expect(spy).not.toHaveBeenCalled();
        expect(session.input.lines).toEqual([{ ...s.line }]);
      });

      it('silme SIRAYI korur', () => {
        const session = s.make() as never as {
          setLines(l: unknown[]): void;
          removeLine(i: number): void;
          input: { lines: Array<{ name: string }> };
        };
        session.setLines([
          { ...s.line, name: 'A' },
          { ...s.line, name: 'B' },
          { ...s.line, name: 'C' },
        ]);
        session.removeLine(1);
        expect(session.input.lines.map(l => l.name)).toEqual(['A', 'C']);
      });
    });
  }
});

describe('🔴 `lines` SIFIR FARK — faturanın `lineFields` senkronu', () => {
  /** Türetilmiş görünürlük haritası olay YAYILMADAN ÖNCE güncel olmalı. */
  it('`line-added` dinleyicisi TAM `lineFields` görür', () => {
    const session = new InvoiceSession();
    let lengthAtEmit = -1;
    session.on('line-added', () => {
      lengthAtEmit = session.uiState.lineFields.length;
    });
    session.addLine({ name: 'Ürün', quantity: 1, price: 10, kdvPercent: 20 });
    expect(lengthAtEmit).toBe(1);
  });

  it('`line-removed` dinleyicisi KISALMIŞ `lineFields` görür', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'A', quantity: 1, price: 10, kdvPercent: 20 });
    session.addLine({ name: 'B', quantity: 1, price: 10, kdvPercent: 20 });
    let lengthAtEmit = -1;
    session.on('line-removed', () => {
      lengthAtEmit = session.uiState.lineFields.length;
    });
    session.removeLine(0);
    expect(lengthAtEmit).toBe(1);
  });

  it('`setLines` `lineFields`i baştan türetir', () => {
    const session = new InvoiceSession();
    session.setLines([
      { name: 'A', quantity: 1, price: 10, kdvPercent: 20 },
      { name: 'B', quantity: 1, price: 10, kdvPercent: 20 },
      { name: 'C', quantity: 1, price: 10, kdvPercent: 20 },
    ]);
    expect(session.uiState.lineFields).toHaveLength(3);
  });

  it('sınır dışı `updateLine` `lineFields`e DOKUNMAZ', () => {
    const session = new InvoiceSession();
    session.addLine({ name: 'A', quantity: 1, price: 10, kdvPercent: 20 });
    const before = session.uiState.lineFields;
    session.updateLine(7, { quantity: 9 });
    expect(session.uiState.lineFields).toBe(before);
  });
});
