# 30 — Feature: 555 Demirbaş KDV (M4, B-96)

**Kod 555** — Demirbaş/Kullanılmış Mal KDV İstisnası. Schematron'da var, ana matriste yok; kütüphane **opt-in flag** ile kabul eder.

```ts
runScenario(__dirname, input, { allowReducedKdvRate: true });
```

`allowReducedKdvRate: true` olmadan → `REDUCED_KDV_RATE_NOT_ALLOWED` hatası (M4 gate).

**Girdi:** 1 × 5.000 TRY KDV %0 · `kdvExemptionCode: '555'` · **Payable 5.000 TRY**.
