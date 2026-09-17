/**
 * Doğrulamanın koştuğu AŞAMA — belge türünden bağımsız TEK sözleşme.
 *
 * ── NİYE ORTAK ─────────────────────────────────────────────────────────────
 * Aynı iki-değerli birlik bugün ÜÇ yerde ayrı ayrı tanımlıydı
 * (`DespatchValidationStage`, `SelfEmployedVoucherValidationStage` ve e-MM ile
 * dördüncüsü gelecekti). Üçünün de gövdesi `'document' | 'session'`, üçünün de
 * gerekçesi AYNI. Kopyaların bir zararı daha vardı: `ubltr/rules/shared/
 * header-bindings.ts` aşama tipini almak için `documents/despatch-advice`e
 * YUKARI import ediyordu — katman bekçisinin `KNOWN_DEBT` listesindeki tek
 * yukarı-import buydu ve üstelik DÖNGÜSELDİ.
 *
 * Tip buraya inince o borç kapandı: ortak katman artık belge katmanını görmüyor.
 * Belge türleri kendi adlarını bu tipe TAKMA AD olarak bağlar (ad yüzeyi
 * daralmasın diye) — anlamları birebir aynıdır.
 *
 * ── ANLAM ──────────────────────────────────────────────────────────────────
 *  • `'document'` (VARSAYILAN) — bitmiş belge; numara ZORUNLU.
 *  • `'session'` — düzenlenmekte olan form; numaranın YOKLUĞU hata değildir,
 *    ama VARSA biçimi yine denetlenir (elle yazılmış yanlış numara sessiz
 *    kalmamalı).
 *
 * Belge numarası (`cbc:ID`) belgenin kendisinden gelmez; gönderim anında
 * seri/numara motoru verir. Form düzenlenirken numara BOŞ olmalıdır — aşama
 * ayrımının varlık sebebi budur.
 */
export type ValidationStage = 'document' | 'session';
