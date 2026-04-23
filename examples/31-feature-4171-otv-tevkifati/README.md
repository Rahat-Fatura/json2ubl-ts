# 31 — Feature: 4171 ÖTV Tevkifatı

**TaxTypeCode 4171** — Petrol/Doğalgaz ÖTV Tevkifatı (belge seviyesi). tax-config.ts'te özel kısıtlı: sadece TEVKIFAT/IADE/SGK/YTBIADE tiplerinde izinli.

**Girdi:** 10 × 40 TRY (Motorin) · `taxes: [{ code: '4171', percent: 50 }]` · KDV %20 · **Payable ~408 TRY**.

**Validasyon Modu:** `basic` — B-NEW-11 + 4171/strict WithholdingTaxTotal çakışması.
