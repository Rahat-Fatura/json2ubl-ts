---
sprint: 8g
baslik: B-NEW-v2 Mini Hotfix — 2 bug fix (B-NEW-v2-04, 05) + 2 example (B-NEW-v2-03, 07) + 3 false positive dokümante
tarih_basi: 2026-04-27
plan: audit/b-new-v2-audit.md (Berkay kararlarıyla)
onceki_sprint: audit/sprint-08f-implementation-log.md (commit a5ab947, 1176/1176 yeşil, 162 senaryo)
sonraki_sprint: Sprint 8h — Reactive InvoiceSession (AR-9)
toplam_commit: 8 atomik alt-commit (8g.0 → 8g.7)
test_durumu_basi: 1176 / 1176 yeşil
test_durumu_sonu_hedef: ~1190 yeşil (+14: 2 bug fix × ~5 test + 2 example × 2 test)
---

## Kapsam

`audit/b-new-v2-audit.md` 7 senaryo Berkay kararıyla işlendi:

**Gerçek bug (fix gerekli) — 2:**
- **B-NEW-v2-04 (Orta):** Withholding raw `Error` → `ValidationError` (AR-1 mimari karar tutarlılığı). Berkay: "hata kodu doğru uygulansın."
- **B-NEW-v2-05 (Orta):** IADE `documentTypeCode` mapper bypass. Berkay: "hata dönmeli."

**Example eksikliği (spec ekle) — 2:**
- **B-NEW-v2-03:** 4171 yasak tip — kütüphane doğru davranıyor; 8f.11'deki spec yanlış API kullanmıştı. Doğru API ile re-add.
- **B-NEW-v2-07:** EARSIVFATURA × TEKNOLOJIDESTEK kapsamsız tek kombinasyon (%98.5 → %100).

**False positive (yapılmaz) — 3:**
- B-NEW-v2-01: kdvPercent whitelist. Berkay: "0 <= kdv <= 100 yeterli davranış."
- B-NEW-v2-02: IBAN mod-97. Berkay: "Format kontrolü yeterli, checksum tüketicinin sorumluluğu."
- B-NEW-v2-06: OZELMATRAH satır kod. Berkay: "False positive."

**Sprint 8g kapsamı dışı:**
- v2.0.0 publish (henüz `package.json=2.0.0` ama publish olmadı; 8g.6'da CHANGELOG v2.0.0 unreleased alt-section).
- Reactive InvoiceSession (AR-9) — Sprint 8h.
- `examples/` 38 senaryoya dokunulmaz.

8 atomik alt-commit planlandı: 8g.0 → 8g.7.

---

## Sprint 8g.0 — Log iskelet + audit dosyasına sonuç notları

**Tarih:** 2026-04-27
**Commit hedef başlığı:** `Sprint 8g.0: Log iskelet + b-new-v2-audit Sonuç notları`

### Yapılanlar

1. `audit/sprint-08g-implementation-log.md` — bu dosya, iskelet + 8g.0 bölümü.
2. `audit/b-new-v2-audit.md` — her bug bölümüne **Sprint 8g Sonuç** tek satırlık not eklendi (her madde için "Sprint 8g.N'de fix" veya "False positive — yapılmadı, gerekçe").

### Test

- Başlangıç: 1176/1176 yeşil
- Son: 1176/1176 yeşil (kod değişikliği yok, sadece audit/)

### Disiplin

- `src/` dokunulmadı. 8g.1 ve 8g.2'de bug fix için minimal değişiklik olacak.
- Plan kopya pattern'i Sprint 8g'de **yok** çünkü mini sprint, plan dosyası ayrı yazılmadı (audit/b-new-v2-audit.md plan rolünde).
- Mimari karar M1-M12, AR-1..AR-9 stabil.

---

## Sprint 8g.1 → 8g.7

_(Her alt-commit kendi bölümü — ilerleyişle doldurulacak)_
