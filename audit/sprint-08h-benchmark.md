---
karar: Sprint 8h.7.1 Performance Benchmark Raporu (D-7 ZORUNLU)
hedef: MR-1 mitigation — update() per call < 15ms (60fps form için frame budget altı)
durum: ✅ Threshold rahat tutuldu, autoValidate: 'manual' Faz 1'e taşıma gerekmedi
tarih: 2026-04-27
referans: audit/sprint-08h-tasarim.md §6.3, §10 (R1)
---

# Sprint 8h.7.1 — Performance Benchmark

## Sonuçlar

| Senaryo | Ortalama | p95 | Max | Threshold | Durum |
|---|---:|---:|---:|---:|:-:|
| 100-line doc-update (50 sequential) | 0.16ms | 0.40ms | 0.54ms | 15ms | ✅ |
| 100-line line-update (50 sequential) | 0.10ms | 0.20ms | 0.41ms | 15ms | ✅ |
| toInvoiceInput cache (cold vs hot) | cold 0.06ms / hot 0.00ms | — | — | hot < cold | ✅ |
| 10-line baseline doc-update | 0.02ms | — | — | 5ms | ✅ |
| 500-line stress (3x typical max) | 0.37ms | — | — | 30ms tolerated | ✅ |

**Threshold:** 15ms/update (60fps form input frame budget'in altı).
**Gerçek:** 0.16ms avg (~94x altı). MR-1 risk efektif olarak yok.

## Yorum

D-3 cache (reference equality) hit'te sıfır maliyetli (`hot = 0.00ms`).
Mapper cache'i 100-line input için ~0.06ms maliyetinde, sequential update'lerde diff
no-op'larda invalide olmadığı için tekrar tekrar hit veriyor.

5 validator pipeline + B-78 türetim + UI state diff + 4 event tipi emit toplam
< 0.5ms — tasarım §6.3 tahmininin (5-15ms) çok altında.

500-line stress (gerçek hayat dışı boyut) bile 0.37ms avg ile threshold'un altında.
Bu gerçekten büyük faturalarda bile reactive update akışı sorunsuz.

## Karar

- **`autoValidate: 'manual'` Faz 1'e taşımaya GEREK YOK.** D-7 mitigation'ın eager
  varsayılan + opt-in manual fallback'i master plan'a göre Faz 2/3'te değerlendirilebilir,
  ama performance bazında zorunluluk yok.
- Cache stratejisi (D-3) yeterli — listener-aware lazy gerekmedi.
- Mimsoft rewrite öncesi performance baseline net: tipik form input akışında session
  hiçbir gözlenebilir gecikme üretmez.

## Ölçüm Detayları

- **Test runner:** vitest 1.6.1 (standart `npm test` modu)
- **Timing:** `performance.now()` (Node.js perf_hooks)
- **Warm-up:** Her benchmark'ta 3-5 iterasyon JIT/cache hazırlığı için
- **Sample size:** 50 iterasyon (doc + line); 30 iterasyon (10-line); 20 iterasyon (500-line stress)
- **Process:** Single-thread Node, sıcak cache, GC pauses dahil

## Sonraki Adım

Sprint 8h.8 (`updateUIState()` her mutate sonrası genişletme) bench tekrarı **gerekmiyor**:
performance margin (~94x altı) bunu absorbe eder. Faz 2 sonunda yeniden ölçüm önerilir.
