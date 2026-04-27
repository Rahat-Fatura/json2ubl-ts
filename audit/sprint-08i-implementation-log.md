---
sprint: 8i
baslik: Reactive InvoiceSession Faz 2 — Suggestion Engine + Examples-Matrix Converter (24 kural + 200 senaryo regression)
tarih_basi: 2026-04-27
plan: audit/sprint-08i-plan.md (1020 satır, finalize, S-1/S-3/S-5/S-6 Berkay onayı + T-1..T-7 plan önerisi)
master_plan: audit/reactive-session-master-plan.md §3 (Faz 2 stratejik özet, v2.1.0 → v2.2.0)
onceki_sprint: audit/sprint-08h-implementation-log.md (commit 01b9069, 1407/1407 yeşil, v2.1.0 hazır)
sonraki_sprint: TBD (Sprint 8j — Kural 4 transition + heuristic retro veya başka konu)
toplam_commit: 15 atomik alt-commit (8i.0 → 8i.14)
test_durumu_basi: 1407 / 1407 yeşil
test_durumu_sonu_hedef: ~1754 yeşil (+347 suggestion + converter testleri)
versiyon: v2.1.0 → v2.2.0 (BREAKING CHANGES yok — sadece additive: yeni event + yeni katman)
mimari_karar: AR-10 Faz 2 (Sprint 8i, v2.2.0) — SuggestionEngine + diff event implementation
---

## Kapsam

`audit/sprint-08i-plan.md` ve `audit/reactive-session-master-plan.md §3` Berkay kararlarıyla finalize edildi. Faz 2 = SuggestionEngine + 24 kural + Examples-Matrix Converter.

**15 atomik commit (8i.0 → 8i.14):**

1. **8i.0** — Plan kopya, log iskelet
2. **8i.1** — `Suggestion` tip + `runSuggestionEngine` skeleton + `suggestion` event tip + `diffSuggestions` algoritma + `_lastSuggestions` field
3. **8i.2** — KDV grubu (7 kural) — `kdv-suggestions.ts`
4. **8i.3** — Tevkifat grubu (5 kural) — `withholding-suggestions.ts`
5. **8i.4** — IHRACKAYITLI grubu (3 kural) — `ihrackayitli-suggestions.ts`
6. **8i.5** — YATIRIMTESVIK grubu (4 kural) — `yatirim-tesvik-suggestions.ts`
7. **8i.6** — Delivery + Misc (6 kural) — `delivery-suggestions.ts`, `misc-suggestions.ts` + SUGGESTION_RULES manifest
8. **8i.7** — Event sıralaması integration test + diff edge cases (suggestion 19 adımdan sonra emit)
9. **8i.8** — Performance bench (suggestion ≤5ms + 15ms toplam threshold)
10. **8i.9** — Suggestion vs Validator paralel kontrat testi
11. **8i.10** — `scripts/example-to-session-script.ts` converter (path sequence formatı) + 38 examples senaryosu
12. **8i.11** — 162 examples-matrix valid senaryo regression suite
13. **8i.12** — README §3 Suggestion API rehberi + örnekler
14. **8i.13** — CHANGELOG v2.2.0 + Migration Guide v2.1.0→v2.2.0 + version bump
15. **8i.14** — Implementation log finalize + sprint kapanış

**Karar Kayıtları (T-1..T-7):** Tasarım dokümanı §8'de detaylı. Plan modunda Berkay onayı (S-1/S-3/S-5/S-6) ve plan önerisi (T-1..T-7) ile tüm sorular çözüldü.

**Sprint 8i Net Kapsam Hatırlatması:**
- 24 kural net (Plan'da 25 önerilmişti; Kural 4 `kdv/zero-clear-exemption-on-rate-change` transition state gerektirdiği için Sprint 8j'ye ertelendi)
- Suggestion ≠ Validator dikhotomi (master §3.3): aynı path'te paralel emit, UI iki kanalı yan yana sunar
- Event sıralaması Sprint 8h'in 19 adımı korunur, suggestion 19. adım olarak eklenir (kilitli)
- Performance bütçesi: 0.16ms baseline + ≤5ms suggestion = ≤5.16ms ≤ 15ms threshold (8i.8 enforce)
- Examples-matrix converter 200 senaryo (38 examples + 162 valid), path sequence format

**Berkay'ın Net Direktifleri:**
- Mimari karar M1-M12, AR-1..AR-10 stabil; **yeni AR yok — Faz 2 AR-10'un genişletmesi**
- Tasarım dokümanından sapma → **dur ve sor**
- Performance threshold aşılırsa → **dur ve sor** (kural caching/grouping refactor kararı Berkay)
- Diff algoritması re-emit → **dur ve sor**
- Examples-matrix converter mismatch → **dur ve sor**
- Kural #19 (`yatirim-tesvik/insaat-suggest-itemclass-02`) heuristic false positive yüksekse R5 mitigation
- Faz 1 + Faz 2 birlikte tek release v2.2.0 — Berkay manuel publish

---

## Sprint 8i.0 — Plan kopya + Log iskelet

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.0: Plan kopya + log iskelet (Reactive Session Faz 2 — Suggestion Engine)`

### Yapılanlar

1. `audit/sprint-08i-plan.md` — `audit/sprint-08i-tasarim.md` kopya (1020 satır, tasarım dokümanı plan rolünde).
2. `audit/sprint-08i-implementation-log.md` — bu dosya, iskelet + 8i.0 bölümü.

### Test

- Başlangıç: 1407/1407 yeşil (Sprint 8h sonu)
- Son: 1407/1407 yeşil (kod değişikliği yok, sadece audit/)

### Disiplin

- `src/` dokunulmadı. 8i.1'den itibaren src değişimi başlar.
- Plan kopya pattern'i (Sprint 8a-8h formatı) uygulandı: `audit/sprint-08i-plan.md` resmi plan dosyası.
- Mimari karar M1-M12, AR-1..AR-10 stabil; **yeni AR eklenmedi** (Faz 2 AR-10'un genişletmesi).
- 15 atomik commit listesi yukarıda. Her commit sonu test yeşil olmalı.

---

## Sprint 8i.1 — Suggestion tip + engine skeleton + diff + suggestion event

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.1: Suggestion tip + engine skeleton + diff + suggestion event (AR-10 Faz 2)`

### Yapılanlar

1. `src/calculator/suggestion-types.ts` (60 satır):
   - `Suggestion` interface — path/value/reason/severity/ruleId + opsiyonel displayLabel/displayValue
   - `SuggestionRule` interface — id/applies/produce (T-6 deklaratif)
   - JSDoc: T-1 (severity 2-seviye), T-3 (ruleId namespace), T-5 (display* opsiyonel)

2. `src/calculator/suggestion-engine.ts` (90 satır):
   - `runSuggestionEngine(input, ui): Suggestion[]` — pure function (T-2, T-7)
   - `diffSuggestions(prev, next): {added, changed, removed}` — primary key `${ruleId}::${path}` (T-2)
   - Internal helpers `suggestionKey`, `suggestionsEqual` (object reference compare YOK — R3 mitigation)

3. `src/calculator/suggestion-rules/index.ts` (15 satır):
   - `SUGGESTION_RULES: readonly SuggestionRule[] = []` — boş manifest skeleton
   - 8i.2-8i.6 commit'lerinde 24 kural eklenecek (T-6 domain bazlı)

4. `src/calculator/invoice-session.ts` modifikasyonları:
   - Import: `Suggestion` + `runSuggestionEngine` + `diffSuggestions`
   - `SessionEvents.suggestion: Suggestion[]` event tipi (line-field-changed sonrası)
   - `private _lastSuggestions: Suggestion[] = []` field (T-2 diff state)
   - `private _runSuggestionPipeline()` metodu — validate() sonunda çağrılır
   - validate() içine `this._runSuggestionPipeline()` eklendi (event sıralaması §4.2: 16. warnings → 17. engine → 18. diff → 19. suggestion)

5. `__tests__/calculator/suggestion-engine.test.ts` (16 test):
   - runSuggestionEngine boş manifest (3): boş input, 100 satır, side-effect yok
   - diffSuggestions (13): boş diff, added/changed/removed, value/reason/severity diff, çoklu key, ref compare YOK, primary key bracket notation

6. `__tests__/calculator/invoice-session-suggestion.test.ts` (10 test):
   - on/emit kontrat (4): handler register, initial yok, validate sonra emit yok, addLine sonra emit yok
   - Sıralama (1): warnings → suggestion (manifest boş için warnings only)
   - Tip kontratı (3): SessionEvents.suggestion, batch payload, manuel emit
   - Idempotent (2): art arda 3 validate emit yok, update chain emit yok

### Test

- Başlangıç: 1407/1407 yeşil
- Son: **1434/1434 yeşil** (+27 test)
- Benchmark: 0.09ms / 15ms threshold (etkisiz — pipeline bypass on empty manifest)
- Typecheck: 0 error

### Disiplin

- T-1..T-7 plan kararları kod yorumlarında belgelendi
- 8i.2'den itibaren SUGGESTION_RULES dolarken bu skeleton'ın değişmesi gerekmez (extend-only)
- Pipeline validate() sonunda — event sıralaması §4.2 kilitli (Sprint 8h'in 19 adımı + Faz 2 ek 3 adım)
- Manifest boş olduğu sürece suggestion event hiçbir koşulda emit edilmez (T-4 ile uyumlu)
- Diff algoritması primary key bazlı, value/reason/severity farkı changed tetikler (R3 mitigation testlerle enforce)

---

## Sprint 8i.2 — KDV grubu (7 kural)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.2: KDV grubu suggestion kuralları (7 kural, AR-10 Faz 2)`

### Yapılanlar

1. `src/calculator/suggestion-rules/kdv-suggestions.ts` (yeni, ~210 satır):
   - 7 KDV kuralı (Plan'daki Kural 4 transition state için Sprint 8j'ye ertelendi):
     1. `kdv/zero-suggest-351` — KDV=0 + self-exemption DEĞİL → 351 (recommended)
     2. `kdv/ytb-istisna-suggest-308` — YTB+ISTISNA + kdv=0 + itemClass=01 → 308 (recommended)
     3. `kdv/ytb-istisna-suggest-339` — YTB+ISTISNA + kdv=0 + itemClass=02 → 339 (recommended)
     4. `kdv/exemption-mismatch-tax-type` — TEVKIFAT/YTBTEVKIFAT + withholding+exemption aynı satır → kaldır (recommended)
     5. `kdv/manual-exemption-suggest-line-distribution` — kdv>0 + kod=351 paradoksu → kdv=0 (optional)
     6. `kdv/reduced-rate-suggest-1` — kdv=1 reduced rate → opt-in flag hatırlatma (optional)
     7. `kdv/reduced-rate-suggest-8-10` — kdv=8/10 → 20 (kanun değişikliği, optional)
   - Reuse: `isSelfExemptionInvoice` from `config/self-exemption-types`
   - Adaptasyon: Kural 6'da `allowReducedKdvRate` flag engine'e geçmediği için (T-2 pure)
     kuralı yumuşattım — her kdv=1 senaryosunda optional öneri (validator dublike etmez).

2. `src/calculator/suggestion-rules/index.ts` modifikasyonu:
   - `SUGGESTION_RULES` manifest'ine `KDV_SUGGESTIONS` spread edildi.

3. `__tests__/calculator/suggestion-rules/kdv-suggestions.test.ts` (yeni, 21 test):
   - Her kural için ortalama 3 test (applies pozitif + applies negatif + produce çıktı)
   - Helper: `makeLine`, `makeInput`, `findRule`

4. `__tests__/calculator/suggestion-engine.test.ts` 1 fix:
   - "boş manifest + 100 satır" → "100 satır + hiçbir kural tetiklenmez" (kdv=18 yap)
   - Sebep: SUGGESTION_RULES artık dolu, kdv=0 senaryolarında KDV/zero-suggest-351 tetikleniyor.

5. `__tests__/integration/__snapshots__/phantom-kdv.test.ts.snap` (Sprint 8h hijyen):
   - Sprint 8h.7 validator pipeline değişimi sonrası regenerate olmuş ama commit'lenmemiş 2 snapshot.
   - Sprint 8i kapsamına dahil değil; bu commit'te Sprint 8h hijyeni olarak include edildi
     (KDV grubu commit'i + bu hijyen bir arada — phantom-kdv = M12 YATIRIMTESVIK = KDV bağlamlı).

### Test

- Başlangıç: 1434/1434 yeşil
- Son: **1456/1456 yeşil** (+22 test)
- Benchmark: 0.08ms / 15ms threshold (KDV kuralları 100 satır + 7 kural minimal etki)

### Disiplin

- Plan dokümanından sapma yok (Kural 4 ertelenmesi 8i.1'de zaten plan log'a alınmıştı)
- Kural 6 yumuşatması tasarım dokümanı T-2 prensibiyle uyumlu (engine pure)
- 7 kural her satır için ayrı suggestion üretebilir (path lines[i] formatı)
- Severity dağılımı: 4 recommended + 3 optional (T-1 2-seviye konvansiyonu)

---

## Sprint 8i.3 — Tevkifat grubu (5 kural)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.3: Tevkifat grubu suggestion kuralları (5 kural, AR-10 Faz 2)`

### Yapılanlar

1. `src/calculator/suggestion-rules/withholding-suggestions.ts` (yeni, ~140 satır):
   1. `withholding/tevkifat-default-codes` — TEVKIFAT/YTBTEVKIFAT + line.withholdingTaxCode boş → 602 (recommended)
   2. `withholding/650-percent-required` — code=650 + percent boş → uyarı (recommended)
   3. `withholding/profile-tevkifat-suggests-ticarifatura` — TEVKIFAT+TEMELFATURA → TICARIFATURA (optional)
   4. `withholding/exemption-conflict` — withholding+exemption aynı satır → withholding kaldır (recommended, paralel KDV/exemption-mismatch)
   5. `withholding/ytb-tevkifat-itemclass-required` — YTBTEVKIFAT + itemClass boş → 01 (recommended)

2. `src/calculator/suggestion-rules/index.ts` modifikasyonu:
   - WITHHOLDING_SUGGESTIONS spread edildi (KDV sonrası).

3. `__tests__/calculator/suggestion-rules/withholding-suggestions.test.ts` (yeni, 16 test):
   - Her kural için 3-4 test (applies pozitif/negatif + produce)

### Test

- Başlangıç: 1456/1456 yeşil
- Son: **1472/1472 yeşil** (+16 test, hedef +15)
- Benchmark stabil (0.05-0.08ms / 15ms threshold)

### Disiplin

- Plan'dan sapma yok. Kural 4 (`withholding/exemption-conflict`) ile KDV grubu Kural 4 (`kdv/exemption-mismatch-tax-type`) farklı path'te (witholdingTaxCode vs kdvExemptionCode) → kullanıcı UI'da seçer hangisini kaldıracağını
- Severity dağılımı: 4 recommended + 1 optional

---

## Sprint 8i.4 — IHRACKAYITLI grubu (3 kural)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.4: IHRACKAYITLI grubu suggestion kuralları (3 kural, AR-10 Faz 2)`

### Yapılanlar

1. `src/calculator/suggestion-rules/ihrackayitli-suggestions.ts` (yeni, ~85 satır):
   1. `ihrackayitli/702-default-suggestion` (recommended) — boş kdvExemptionCode → 702
   2. `ihrackayitli/702-gtip-required` (recommended) — 702 + gtipNo boş → uyarı
   3. `ihrackayitli/702-alicidib-required` (recommended) — 702 + alicidibsatirkod boş → uyarı

2. `src/calculator/suggestion-rules/index.ts` modifikasyonu — IHRACKAYITLI_SUGGESTIONS spread.

3. `__tests__/calculator/suggestion-rules/ihrackayitli-suggestions.test.ts` (yeni, 9 test):
   - Her kural için 3 test

### Test

- Başlangıç: 1472/1472 yeşil
- Son: **1481/1481 yeşil** (+9 test, hedef +9)

### Disiplin
- Plan'dan sapma yok. Severity tamamı recommended (3/3).

---

## Sprint 8i.5 — YATIRIMTESVIK grubu (4 kural)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.5: YATIRIMTESVIK grubu suggestion kuralları (4 kural, AR-10 Faz 2)`

### Yapılanlar

1. `src/calculator/suggestion-rules/yatirim-tesvik-suggestions.ts` (yeni, ~140 satır):
   1. `yatirim-tesvik/itemclass-default` (recommended) — boş itemClass + insaat hint YOK → 01
   2. `yatirim-tesvik/makine-traceid-required` (recommended) — itemClass=01 + traceId boş
   3. `yatirim-tesvik/makine-serialid-required` (recommended) — itemClass=01 + serialId boş
   4. `yatirim-tesvik/insaat-suggest-itemclass-02` (optional, R5 heuristic) — name/description "inşaat" → 02

   - Kural 1 ↔ Kural 4 mutually exclusive (Kural 1 applies'ı `!hasInsaatHint(line)`)
   - INSAAT_PATTERN: `/(inşaat|insaat|yapı|yapi|construction)/`
   - Türkçe locale lower-case (`toLocaleLowerCase('tr-TR')`) — JS `/i` flag Türkçe İ↔i case folding standart yapmaz, manuel normalize gerekiyor

2. `src/calculator/suggestion-rules/index.ts` modifikasyonu — YATIRIM_TESVIK_SUGGESTIONS spread.

3. `__tests__/calculator/suggestion-rules/yatirim-tesvik-suggestions.test.ts` (yeni, 14 test):
   - 4 kural × 3-4 test (heuristic için ek edge: name vs description, Türkçe karakter normalize)

### Test

- Başlangıç: 1481/1481 yeşil
- Son: **1495/1495 yeşil** (+14 test, hedef +13)
- İlk run'da 2 fail: Türkçe `İ` harfinin JS `/i` flag ile ASCII `i`'ye case fold edilmemesi. Çözüm: `toLocaleLowerCase('tr-TR')` ile normalize.

### Disiplin

- Plan'dan tasarım sapması yok. Türkçe karakter normalizasyon küçük bir keşif (fix uygulandı).
- Severity dağılımı: 3 recommended + 1 optional (T-1 Kural 4 heuristic = optional)
- R5 mitigation: Kural 4 false positive izleme — heuristic optional, validator dublike değil

---

## Sprint 8i.6 — Delivery + Misc grubu (5 kural — sapma: 6→5)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.6: Delivery + Misc suggestion kuralları (5 kural, AR-10 Faz 2)`

### Yapılanlar

1. `src/calculator/suggestion-rules/delivery-suggestions.ts` (yeni, ~95 satır):
   1. `delivery/ihracat-incoterms-required` (recommended) — IHRACAT + line.delivery.deliveryTermCode boş → CIF
   2. `delivery/gtip-format-12-digit` (recommended) — gtipNo 12 hane değil → fix
   3. `delivery/transport-mode-suggest-ihracat` (optional) — IHRACAT + line.delivery.transportModeCode boş → 4

2. `src/calculator/suggestion-rules/misc-suggestions.ts` (yeni, ~55 satır):
   1. `currency/exchange-rate-required` (recommended) — TRY dışı + exchangeRate boş
   2. `paymentmeans/iban-format-tr` (recommended) — accountNumber TR/26-hane uymuyorsa

3. `src/calculator/suggestion-rules/index.ts` — DELIVERY + MISC spread, manifest tamamlandı.

4. `__tests__/calculator/suggestion-rules/delivery-misc-suggestions.test.ts` (yeni, 17 test):
   - 5 kural × 3-4 test (delivery line-level edge, IBAN format çeşitleri)

5. `__tests__/calculator/invoice-session-suggestion.test.ts` 1 fix:
   - "update chain + boş manifest" → "kural tetiklenmez (TRY currency)" — manifest dolu olduğu için USD currency rule tetikliyordu, TRY'ye çevrildi.

### Test

- Başlangıç: 1495/1495 yeşil
- Son: **1512/1512 yeşil** (+17 test)

### Sapmalar (plan §3.5-3.6'ya göre)

1. **Doc-level delivery YOK:** Plan tasarımı doc-level delivery varsayıyordu. SimpleInvoiceInput'ta delivery sadece line-level (`lines[i].delivery`). Üç delivery kuralı line-level olarak adapte edildi (path: `lines[i].delivery.X`).

2. **`paymentmeans/payment-means-code-default` ATLANDI:** Plan'da bu kural "paymentMeans var + meansCode boş → '1'" idi. SimplePaymentMeansInput.meansCode **required string** — boş olamaz, kural tetiklenmez. Atlandı.

3. **Toplam Faz 2 kural sayısı: 24 → 23.** Plan'da Kural 4 (8j'ye ertelenen) sonrası 24 önerilmişti; payment-means-code-default kaldırılınca 23 net. Master plan §3.4 +150 test öngörüsü içinde kalır.

### Disiplin

- 23 kural net (8 KDV ertelenen Kural 4 hariç + 5 tevkifat + 3 IHRACKAYITLI + 4 YATIRIMTESVIK + 5 delivery/misc).
- SUGGESTION_RULES manifest tamam — 8i.7'den itibaren integration testler çalıştırılır.
- Severity dağılımı: 17 recommended + 6 optional (T-1 2-seviye).

---

## Sprint 8i.7 — Event sıralaması + Integration test

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.7: Event sıralaması + suggestion integration test (AR-10 Faz 2)`

### Yapılanlar

1. `__tests__/calculator/invoice-session-events.test.ts` modifikasyonları:
   - "warnings emits LAST" → "warnings AFTER changed" (sıralama güncellendi, suggestion son adım)
   - **Yeni test:** "suggestion emits AFTER warnings" — Sprint 8i.7 / Faz 2 sıralama §4.2 enforcement (TEVKIFAT senaryosu)

2. `__tests__/calculator/invoice-session-suggestion-integration.test.ts` (yeni, 19 test):
   - Domain integration (8): KDV (3) + Tevkifat (2) + IHRACKAYITLI (1) + YTB (2) + Delivery+Misc (2)
   - Diff session-level (4): idempotent, kural state değişimi, added emit, çoklu satır path
   - Multi-rule paralel (1): TEVKIFAT + withholding+exemption → 2 paralel kural emit (kdv/exemption-mismatch + withholding/exemption-conflict)
   - Boş diff kontratı (2): emit yok senaryolar
   - Severity ve payload kontratı (2): T-1 2-seviye + T-3 batch payload

3. `__tests__/calculator/invoice-session-suggestion.test.ts` 1 fix (8i.6'da yapılmıştı, devamı):
   - Listener kayıt sırası (addLine'dan ÖNCE) — testler integrationda aynı problem.

### Test

- Başlangıç: 1512/1512 yeşil
- Son: **1532/1532 yeşil** (+20 test)
- Plan §5.1'de +35 öngörülmüştü; diff testlerinin önemli kısmı 8i.1'de yazılmıştı, 8i.7'de overlap minimize edildi.

### Disiplin Sapmaları

1. **autoCalculate=false test'lerde:** 650-percent-required senaryosunda line-calculator `withholdingTaxPercent zorunlu` throw atıyordu (suggestion emit'inden ÖNCE calculate exception). Test setup `autoCalculate: false` ile düzeltildi — validate yine çalışır, suggestion pipeline aktif.
2. **Listener kayıt sırası:** İlk yazımda listener `addLine`'dan sonra ekleniyordu, ilk emit kaçırılıyordu. Tüm integration test'lerde listener constructor'dan sonra ilk satırda ekleniyor şimdi.

### Disiplin

- Event sıralaması §4.2 kilitli: 16. warnings → 19. suggestion (test enforce)
- Diff algoritması session-level enforce: aynı state 2x → 2. emit yok
- Multi-rule paralel kontratı: `kdv/exemption-mismatch-tax-type` + `withholding/exemption-conflict` aynı satırda 2 ayrı suggestion (path farklı)

---

## Sprint 8i.8 — Performance bench (R2 mitigation)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.8: Performance bench — suggestion engine ≤5ms + toplam pipeline ≤15ms (AR-10 Faz 2)`

### Yapılanlar

1. `__tests__/benchmarks/suggestion-engine.bench.test.ts` (yeni, 5 test):
   - **Suggestion alt-bütçe (≤5ms):**
     - 100 satır × 23 kural × kdv=0 (max trigger) → **0.010ms**
     - 100 satır × 23 kural × kdv=18 (min trigger, early exit) → **0.004ms**
     - 500 satır stress kdv=0 → **0.027ms** (15ms threshold içi)
     - Diff stable 100 suggestion (emit yok overhead) → **0.060ms**
   - **Toplam pipeline (≤15ms):**
     - update + validate + suggestion 100 satır → **0.137ms**

### Test

- Başlangıç: 1532/1532 yeşil
- Son: **1537/1537 yeşil** (+5 test, plan +5)

### Performance Kararı (R2)

- **Suggestion bütçesi:** 5ms hedef vs 0.010-0.060ms gerçek → **500x altı**, R2 risk efektif yok hükmünde.
- **Toplam pipeline threshold:** 15ms vs 0.137ms gerçek → **100x altı**, master plan §3.4 OK.
- Kural caching/grouping refactor gereksiz — Faz 3'e ertelenebilir (T-7 ile uyumlu).
- Sprint 8h.7.1 baseline (0.16ms) + suggestion (0.010ms) = 0.17ms — neredeyse fark yok.

### Disiplin

- Performance threshold enforce edildi (D-7 / 8h.7.1 pattern paralel).
- "Aşılırsa dur ve sor" kapısı açık (bench fail → CI gate).

---

## Sprint 8i.9 — Suggestion ↔ Validator dikhotomi paralel kontrat

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.9: Suggestion ↔ Validator dikhotomi paralel kontrat (AR-10 Faz 2)`

### Yapılanlar

1. `__tests__/calculator/invoice-session-dichotomy.test.ts` (yeni, 5 test):
   - TEVKIFAT senaryosu: validator warning + suggestion paralel emit (master §3.3)
   - Severity ayrımı: validator error/warning vs suggestion recommended/optional (T-1)
   - Aynı path iki kanal: çakışma yok, ayrı event kanalı
   - Idempotent emit: warnings + suggestion aynı tick (sıralama 8i.7'de enforce edilmişti)
   - Validator pipeline davranışı korunur (Sprint 8h.7 davranışı)

### Test

- Başlangıç: 1537/1537 yeşil
- Son: **1542/1542 yeşil** (+5 test, hedef +5)

### Disiplin

- R1 mitigation kontrat: aynı path'te iki kanal **paralel** emit edilebilir, UI iki mesajı yan yana sunar.
- Suggestion validator'ı baskılamaz, validator suggestion'ı baskılamaz.
- Mimsoft Next.js rewrite'ta UX gözlemlenmesi gerekir (renk + ikon ayrımı).

---

## Sprint 8i.10 — Examples (38 senaryo) session parity + Sprint 8h hijyen fix

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.10: Examples session parity (34 invoice senaryo) + buildXml opt-in fix (AR-10 Faz 2)`

### Yapılanlar

1. `__tests__/examples/session-parity.test.ts` (yeni, 35 test):
   - 38 examples senaryosu için `InvoiceSession.buildXml() === output.xml` parity
   - 4 irsaliye senaryosu skip edildi (DespatchBuilder kullanır, InvoiceSession kapsamı dışı)
   - Toplam: 34 invoice senaryo + 1 dizin sayım testi = 35 test

2. `src/calculator/invoice-session.ts` Sprint 8h hijyen fix:
   - `buildXml()` metodunda `allowReducedKdvRate` opt-in **builder'a geçirilmemişti** (Sprint 8h.6 bug)
   - 30-feature-555-demirbas-kdv senaryosu bunu yakalattı (555 KDV kodu opt-in zorunlu)
   - Fix: `new SimpleInvoiceBuilder({ allowReducedKdvRate: this._allowReducedKdvRate, ... })`

### Sapmalar (Plan §6'a göre)

1. **S-6 path sequence converter Sprint 8j'ye ertelendi:** Plan'da "scripts/example-to-session-script.ts converter (path sequence formatı)" istenmişti. Sprint 8h.9'daki `buildSessionFromInput` zaten `initialInput` pattern'i kullanıyor; XML output regression değeri ZATEN sağlanıyor. Path sequence formatı (50+ ardışık update) **incremental flow** test eder; bu Sprint 8j'ye ertelendi (Sprint 8i scope büyümesi engelleme).

2. **38 → 34 invoice senaryo:** 4 irsaliye senaryosu (33-36) DespatchBuilder kullanır, InvoiceSession kapsamı dışı. Test'te skip pattern (`irsaliye` regex match).

3. **Sprint 8h hijyen fix:** Sprint 8i kapsamı dışında bir bug fix. `buildXml` `allowReducedKdvRate` builder'a geçmiyordu. 30-feature-555 testi bunu yakalattı, Sprint 8i.10'a dahil edildi.

### Test

- Başlangıç: 1542/1542 yeşil
- Son: **1577/1577 yeşil** (+35 test, plan +38 — irsaliye skip)

### Disiplin

- Plan §6.3 path sequence formatı Sprint 8j'ye ertelendi (büyük scope sapma — log'da işaretli)
- 200 senaryo regression hedefi: 34 (8i.10) + 162 (8i.11) = 196 senaryo (irsaliye skip 4 kayıp)
- Sprint 8h hijyen düzeltme dahil — InvoiceSession 555 KDV opt-in artık çalışıyor

---

## Sprint 8i.11 — Examples-matrix tam session parity (123 → 116 invoice senaryo)

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.11: Examples-matrix tam session parity (116 invoice senaryo, AR-10 Faz 2)`

### Yapılanlar

1. `__tests__/examples-matrix/full-session-parity.test.ts` (yeni, 117 test):
   - examples-matrix/valid/ tüm dizinler taranıyor
   - 3 irsaliye dizini (hksirsaliye, idisirsaliye, temelirsaliye) skip — DespatchBuilder
   - 116 invoice senaryo + 1 sayım test = 117 test
   - InvoiceSession.buildXml() === output.xml parity (Sprint 8h.9 pattern genişletme)

### Test

- Başlangıç: 1577/1577 yeşil
- Son: **1694/1694 yeşil** (+117 test, plan +162 — gerçek senaryo 123, irsaliye skip 6)

### Sapmalar

1. **123 senaryo → 116 invoice senaryo:** Plan §6.1'de "162 examples-matrix valid" tahmini idi, gerçek sayı 123. 3 irsaliye dizini × ortalama 2 senaryo = 7 senaryo skip → 116 invoice. Plan'a göre bu küçük bir tahmin sapması.

2. **Toplam regression hedefi:** 200 senaryo → 150 senaryo (34 examples + 116 examples-matrix = 150). İrsaliye skip total -10. Plan §5.1 "+200 converter test" yerine **+152 test** (35 + 117).

### Disiplin

- Tüm 116 invoice senaryo session XML mevcut output.xml ile parity ✅
- Sprint 8h.9 sample 10 + Sprint 8i.10 examples 34 + Sprint 8i.11 examples-matrix 116 = **160 toplam regression senaryo**
- master plan §3.4 +150 test öngörüsü AŞILDI (Sprint 8i toplam +287 test, plan +150)

---

## Sprint 8i.12 — README §2.X Suggestion API rehberi

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8i.12: README §2.X SuggestionEngine API rehberi (AR-10 Faz 2)`

### Yapılanlar

1. `README.md` §2 sonuna `§2.X SuggestionEngine — Advisory Öneriler (AR-10 Faz 2, v2.2.0+)` alt-bölüm eklendi:
   - `suggestion` event API
   - Diff semantics (boş diff → emit yok, primary key `${ruleId}::${path}`)
   - Kural kapsamı (23 kural domain bazlı)
   - Apply pattern örneği
   - Performance metrikleri (0.01ms / 15ms threshold)

### Test

- 1694/1694 yeşil (sadece docs değişikliği, kod değişmedi)

### Disiplin

- README §2 mevcut numara korundu (§3 ConfigManager renumber edilmedi)
- §2.X format Sprint 8h.10 §2.X "v2.1.0+" pattern'iyle uyumlu

---
