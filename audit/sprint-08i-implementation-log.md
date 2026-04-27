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
