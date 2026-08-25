/**
 * `configManager` ↔ türev whitelist'ler arasındaki **CANLI BAĞ** (4.1.0).
 *
 * ## Çözülen kusur
 *
 * `configManager` beş listeyi (vergi / tevkifat / istisna / birim / para birimi)
 * runtime'da override edebiliyordu, ama `constants.ts`'teki türev `Set`'ler ve
 * `cross-check-matrix.ts`'teki `TAX_EXEMPTION_MATRIX` **import anında bir kez**
 * hesaplanıyordu. Sonuç: hesaplayıcılar (`configManager`'ı okur) enjekte edilen
 * kodu hesaplıyor, doğrulayıcılar (statik `Set`'i okur) aynı kodu REDDEDİYORDU.
 * Yani `configManager.updateTaxes()` ile eklenen bir vergi kodu
 * `InvoiceBuilder.validate()` strict modundan geçemiyordu.
 *
 * ## Seçilen yaklaşım: kimliği sabit koleksiyon + olay tetikli yeniden hesap
 *
 * Türev koleksiyonlar **gerçek `Set` / `Map` nesneleri olarak kalır**; yalnız
 * içerikleri `configManager` her değiştiğinde YERİNDE (`clear()` + yeniden
 * doldur) tazelenir. Nesne kimliği hiç değişmez.
 *
 * Neden bu yol, alternatifleri değil:
 *
 * | Yaklaşım | `instanceof Set` | Tip `Set<string>` kalır | Okuma maliyeti | Kırıcı mı |
 * |---|---|---|---|---|
 * | `Set` → fonksiyon (`taxTypeCodes()`) | — | ✗ | yok | **EVET** |
 * | `Set` → `ReadonlySet` sarmalayıcı sınıf | ✗ | ✗ (`size` getter'ı TS2611) | düşük | **EVET** |
 * | `Proxy` + sürüm kontrollü tembel türetme | ✓ | ✓ | her erişimde trap + `bind` | hayır |
 * | **kimliği sabit `Set` + olay tetikli tazeleme** | ✓ | ✓ | **sıfır** | **hayır** |
 *
 * `import { TAX_TYPE_CODES } from 'json2ubl-ts'` yazan dış tüketiciler için
 * hiçbir şey değişmez: nesne hâlâ gerçek bir `Set<string>`'tir, `has/size/
 * forEach/spread/instanceof` aynen çalışır, TypeScript imzası aynıdır. Sıcak
 * doğrulama döngülerinde `Set.prototype.has` doğrudan çağrılır — `Proxy`
 * çözümünün her `.has()` erişiminde ödediği trap + bound-function maliyeti yoktur.
 *
 * **Tazelemenin eksiksizliği:** `ConfigManager`'ın TÜM mutasyon yolları
 * (`initialize`, `updateTaxes`, `updateWithholdingTaxes`, `updateExemptions`,
 * `updateUnits`, `updateCurrencies`, `updateAll`, `reset`) `config:all-updated`
 * yayar. Tek dinleyici bu yüzden yeterlidir ve `EventEmitter` varsayılan 10
 * dinleyici sınırına yaklaşılmaz. `__tests__/config/config-injection-seam.test.ts`
 * her mutasyon yolunun gerçekten tazelediğini ayrı ayrı kilitler.
 *
 * **Kaçış kapağı:** `refreshDerivedConfig()` elle çağrılabilir — `configManager`
 * dışında bir kaynak listeleri değiştirirse (ya da gelecekte bir mutasyon yolu
 * olay yaymayı unutursa) senkronizasyon zorlanabilir.
 */

import { configManager } from '../calculator/config-manager';

/** Kayıtlı tazeleyiciler — her `derivedSet`/`derivedMap` bir tane ekler. */
const refreshers: Array<() => void> = [];

/**
 * `configManager`'ın güncel durumundan türeyen, **kimliği sabit** `Set`.
 *
 * @param derive Her tazelemede çağrılır; güncel `configManager` durumunu okumalıdır.
 */
export function derivedSet<T>(derive: () => Iterable<T>): Set<T> {
  const set = new Set<T>();
  const refresh = (): void => {
    set.clear();
    for (const value of derive()) set.add(value);
  };
  refresh();
  refreshers.push(refresh);
  return set;
}

/**
 * `configManager`'ın güncel durumundan türeyen, **kimliği sabit** `Map`.
 *
 * @param derive Her tazelemede çağrılır; güncel `configManager` durumunu okumalıdır.
 */
export function derivedMap<K, V>(derive: () => Iterable<readonly [K, V]>): Map<K, V> {
  const map = new Map<K, V>();
  const refresh = (): void => {
    map.clear();
    for (const [key, value] of derive()) map.set(key, value);
  };
  refresh();
  refreshers.push(refresh);
  return map;
}

/**
 * Tüm türev koleksiyonları `configManager`'ın GÜNCEL durumundan yeniden hesaplar.
 *
 * Normalde otomatik çalışır (`config:all-updated`); bu fonksiyon yalnız kaçış
 * kapağıdır. Koleksiyon KİMLİKLERİ korunur.
 */
export function refreshDerivedConfig(): void {
  for (const refresh of refreshers) refresh();
}

configManager.on('config:all-updated', refreshDerivedConfig);
