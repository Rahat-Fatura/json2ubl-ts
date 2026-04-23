# 29 — Feature: AllowanceCharge (Satır İskonto)

`SimpleLineInput.allowancePercent: 10` → satır `AllowanceCharge` elementi (ChargeIndicator=false, MultiplierFactor=10%). İskonto matrah'tan düşer, sonra KDV hesaplanır.

**Girdi:** 10 × 100 = 1.000 TRY · -%10 iskonto = 900 TRY · KDV %20 = 180 TRY · **Payable 1.080 TRY**.
