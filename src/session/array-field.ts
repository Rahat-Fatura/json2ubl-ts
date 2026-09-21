/**
 * DİZİ ALANI MAKİNESİ — bir oturum dizisinin ekle/güncelle/sil/topluca-kur
 * dörtlüsünü TEK yerden yürütür.
 *
 * ── NİYE VAR ───────────────────────────────────────────────────────────────
 * `lines` dörtlüsü ÜÇ ayrı gövdede elle yazılmıştı (`session/document-session`,
 * `calculator/invoice-session`, `calculator/despatch-session`) ve üçü de aynı
 * dört kararı tekrar veriyordu: sınır denetimi, klon semantiği, olay yükünün
 * şekli, `onChanged` çağrısının YERİ. Dördüncü bir dizi (HKS belge düzeyi
 * masraf bloğu) eklenince bu sayı sekize çıkacaktı.
 *
 * ── 🔴 NİÇİN METOT DEĞİL MAKİNE PAYLAŞILIR ─────────────────────────────────
 * Dörtlüyü ortak bir TABANA `addDocumentAllowanceCharge` diye koymak,
 * e-İrsaliye/e-SMM/e-MM oturumlarına taşımadıkları bir kavram için metot
 * verirdi. Belge düzeyi masraf YALNIZ faturaya (gerçekte yalnız HKS masraf
 * düzlemine) aittir. Bu yüzden burada duran şey MEKANİZMADIR; adlar ve olaylar
 * çağıran oturumda kalır.
 *
 * ── 🔴 NİÇİN `DocumentSession` ÜZERİNDE `protected` DEĞİL ──────────────────
 * Ölçüldü: `InvoiceSession` ve `DespatchSession` `DocumentSession`'dan TÜREMEZ
 * — ikisi de doğrudan `EventEmitter`'ı genişletir. `DocumentSession` yalnız
 * e-SMM ve e-MM'in tabanıdır. Makine `protected` bir taban metodu olsaydı
 * faturadan ERİŞİLEMEZDİ. Bu yüzden modül düzeyinde, durumsuz bir fabrikadır:
 * dört oturumun dördü de ona ulaşır.
 *
 * ── SÖZLEŞME ───────────────────────────────────────────────────────────────
 * Her işlemin adım sırası DEĞİŞMEZDİR (mevcut `lines` davranışının birebir
 * kopyası):
 *
 *   ekle/güncelle/sil : yaz → `afterWrite` → olay → `afterChange`
 *   topluca-kur       : yaz → `afterWrite` → `afterChange`      (olay YOK)
 *
 * `afterWrite` türev durumu (faturanın `uiState.lineFields`'ı) olay YAYILMADAN
 * ÖNCE senkronlamak içindir: dinleyici olayı aldığında oturum tutarlı olmalıdır.
 *
 * Sınır dışı indeks SESSİZCE yok sayılır — ne olay, ne `afterChange`, ne hata.
 * Bu `updateLine`/`removeLine`'ın bugünkü davranışıdır ve portal formu buna
 * dayanır (silinen satırın geç gelen olayı oturumu bozmaz).
 */

/**
 * Bir işlemin olay adları.
 *
 * Adlar çağırandan GELİR: makine `line-added` ile
 * `document-allowance-charge-added` arasındaki farkı bilmez ve bilmemelidir.
 */
export interface ArrayFieldEventNames {
  /** Ekleme olayı — yük: `{ index, <itemKey> }`. */
  added: string;
  /** Güncelleme olayı — yük: `{ index, <itemKey> }`. */
  updated: string;
  /** Silme olayı — yük: `{ index }`. */
  removed: string;
}

/**
 * Diziye uygulanan değişikliğin tam tarifi — `afterWrite` kancasına gider.
 *
 * `items` her zaman YAZILMIŞ yeni dizidir; kanca çalıştığında oturumun girdisi
 * çoktan güncellenmiştir.
 */
export type ArrayFieldChange<TItem> =
  | { kind: 'add'; index: number; item: TItem; items: readonly TItem[] }
  | { kind: 'update'; index: number; item: TItem; items: readonly TItem[] }
  | { kind: 'remove'; index: number; items: readonly TItem[] }
  | { kind: 'replace'; items: readonly TItem[] };

/**
 * Makinenin oturumdan istediği TEK arayüz.
 *
 * Girdiyi nasıl tuttuğu (hangi alan, nasıl klonlandığı) oturumun işidir;
 * makine yalnız `read`/`write` üzerinden konuşur. Böylece alan adı için hiçbir
 * `as` dönüşümü ve hiçbir `Record<string, unknown>` kaçamağı gerekmez.
 */
export interface ArrayFieldConfig<TItem> {
  /** Dizinin GÜNCEL hâli — alan hiç kurulmamışsa `undefined` olabilir. */
  read(): readonly TItem[] | undefined;
  /** Yeni diziyi girdiye yazar (girdi klonlaması çağıranın işidir). */
  write(items: TItem[]): void;
  /** Olay adları. */
  events: ArrayFieldEventNames;
  /** Olay yükünde elemanı taşıyan anahtar — `lines` için `'line'`. */
  itemKey: string;
  /** Olayı yayar. */
  emit(event: string, payload: unknown): void;
  /** Yazımdan SONRA, olay yayılmadan ÖNCE koşar (türev durum senkronu). */
  afterWrite?(change: ArrayFieldChange<TItem>): void;
  /** Olay yayıldıktan sonra koşar — oturumun `onChanged()`i. */
  afterChange(): void;
}

/** Makinenin dışa verdiği dörtlü. */
export interface ArrayFieldOps<TItem> {
  /** Sona eleman ekler. */
  add(item: TItem): void;
  /** Var olan elemanı kısmi güncelleme ile değiştirir; sınır dışı indeks no-op. */
  update(index: number, updates: Partial<TItem>): void;
  /**
   * Bir indeksi siler. Kalan elemanların SIRASI korunur — sıra HKS masraf
   * düzleminde anlamlıdır (GİB'in XSLT'si `for-each` ile belge sırasını izler).
   */
  remove(index: number): void;
  /** Diziyi tümüyle değiştirir — olay YAYMAZ (`setLines` davranışı). */
  replaceAll(items: TItem[]): void;
  /** Mevcut dizi (alan kurulmamışsa boş). */
  current(): readonly TItem[];
}

/**
 * Dizi alanı makinesini kurar.
 *
 * Durumsuzdur: tüm durum `config.read`/`config.write` üzerinden oturumda kalır.
 * Bu yüzden YAPICIDAN çağrılması güvenlidir — dönen kapanışlar tembeldir,
 * hiçbiri kurulum anında oturum alanı okumaz (türev sınıfların kurulmamış
 * alanları üstünde koşma tuzağı; bkz. `document-session.ts` başı).
 */
export function createArrayField<TItem>(config: ArrayFieldConfig<TItem>): ArrayFieldOps<TItem> {
  const current = (): readonly TItem[] => config.read() ?? [];

  /* Tam sayı denetimi BİLEREK yoktur: bugünkü `updateLine`/`removeLine` de
   * yalnız `index < 0 || index >= length` bakar. Makine davranışı OLDUĞU GİBİ
   * taşır; kesirli indeks bir çağıran kusurudur ve burada sessizce
   * anlamlandırılmaz. */
  const inBounds = (index: number, length: number): boolean => index >= 0 && index < length;

  const commit = (items: TItem[], change: ArrayFieldChange<TItem>, event?: [string, unknown]): void => {
    config.write(items);
    config.afterWrite?.(change);
    if (event) config.emit(event[0], event[1]);
    config.afterChange();
  };

  return {
    current,

    add(item: TItem): void {
      const items = [...current(), item];
      const index = items.length - 1;
      commit(items, { kind: 'add', index, item, items }, [
        config.events.added,
        { index, [config.itemKey]: item },
      ]);
    },

    update(index: number, updates: Partial<TItem>): void {
      const existing = current();
      if (!inBounds(index, existing.length)) return;

      const items = [...existing];
      items[index] = { ...items[index], ...updates };
      const item = items[index];
      commit(items, { kind: 'update', index, item, items }, [
        config.events.updated,
        { index, [config.itemKey]: item },
      ]);
    },

    remove(index: number): void {
      const existing = current();
      if (!inBounds(index, existing.length)) return;

      /* `filter` KAYDIRIR: silinenden sonraki her eleman bir aşağı iner ve
       * göreli SIRA korunur. Bu, masraf düzleminde bir gereklilik — GİB'in
       * görüntüsü blok sırasını izler ve "Masraflar:" başlığı listenin ilk
       * kaleminin dalına gömülüdür. */
      const items = existing.filter((_, i) => i !== index);
      commit(items, { kind: 'remove', index, items }, [config.events.removed, { index }]);
    },

    replaceAll(items: TItem[]): void {
      commit(items, { kind: 'replace', items });
    },
  };
}
