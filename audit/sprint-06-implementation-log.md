---
sprint: 6
baslik: Despatch Extensions + Party/Address Common
tarih: 2026-04-23
plan: audit/sprint-06-plan.md
toplam_commit: 8 (Sprint 6.1 … 6.8)
test_durumu: (devam ediyor)
---

# Sprint 6 İmplementasyon Günlüğü

Sprint 6 planı (`audit/sprint-06-plan.md`) 8 mantıksal alt commit halinde uygulanıyor.
Ana tema: **Despatch Advice (e-İrsaliye) kapsam genişlemesi + Party/Address ortak
refactor + Invoice metadata eksikleri** — 15 bulgu (B-19, B-36..B-39, B-48, B-49,
B-51, B-52, B-53, B-71..B-74, B-98, B-100) + 3 mimari karar (M8 teyit, AR-2 agresif
rename, AR-8 iptal) + denetim 06'dan 3 ek bulgu (O3, O4, O7 Schematron whitelist/regex
validator iyileştirmeleri).

Tüm commit'lerde `yarn test` yeşil; `yarn typecheck` temiz. Sprint 1–5 davranışı
korunuyor.

## Netleştirme Soruları (Sprint 6 başı — AskUserQuestion)

Plan Modu aşamasında 4 soru soruldu; kullanıcı tümünde "Recommended" önerisini seçti:

1. **Kapsam:** Hepsi Sprint 6 (FIX-PLANI-v3 15 bulgu ataması) — Fatura/ortak bulgular da dahil
2. **AR-2 cardinality:** Opsiyonel 0..n (`driverPersons?: DriverPersonInput[]`)
3. **B-49 DORSEPLAKA API:** İki bağımsız opsiyonel alan (licensePlates + transportHandlingUnits)
4. **Denetim 06 O3/O4/O7:** Hepsi Sprint 6'ya dahil (O5/O6 Sprint 8'e ertelendi)

İç teyit gerektiren askıda kalan Mimsoft soruları (#25a-d) kullanıcı tarafından cevaplanmıştı:
- #25a (B-19 DespatchContact): opsiyonel + uyarı
- #25b (B-49 DORSE path): ikisi de (fallback hierarchy)
- #25c (B-52 LineCountNumeric): otomatik emit
- #25d (B-48 3 party): üçü de opsiyonel
- #25e (B-50 Outstanding/Oversupply): yapmıyoruz → AR-8 ile iptal

## Commit Özeti

| # | Commit | Hash | Kapsam |
|---|---|---|---|
| 6.1 | Plan + M8/B-38 teyit + AR-8 temizlik | (bu commit) | `audit/sprint-06-plan.md` (572 satır), bu log iskelet, M8/AR-8 no-op teyit |
| 6.2 | AR-2 driverPersons[] array migration (B-51) | — | (pending) |
| 6.3 | B-48 Despatch 3 party + B-19 DespatchContact | — | (pending) |
| 6.4 | B-49 TransportHandlingUnit + B-72 shipmentId + B-73 ValueAmount | — | (pending) |
| 6.5 | B-52 LineCountNumeric + B-53 OrderReference array | — | (pending) |
| 6.6 | Denetim 06 O3/O4/O7 Despatch validator | — | (pending) |
| 6.7 | B-36/B-37 Party + B-98/B-100 Address | — | (pending) |
| 6.8 | B-39/B-71/B-74 Invoice + log + devir | — | (pending) |

---

## No-Op Teyitleri (Sprint 6.1)

Plan Modu aşamasında Denetim 06'da "açık" olarak raporlanan ancak Sprint 3'te çözülmüş
olduğu tespit edilen bulgular + FIX-PLANI-v3'te "yapılacak" gibi görünen ancak zaten
uygulanmış durumlar:

### M8 / B-38 — CustomizationID `TR1.2` tek sabit ✅ (Zaten uygulanmış)
- `src/config/namespaces.ts:28` → `customizationId: 'TR1.2'` doğru değer
- `src/serializers/despatch-serializer.ts:26` → `UBL_CONSTANTS.customizationId` kullanıyor (İrsaliye)
- `src/serializers/invoice-serializer.ts:58` → `UBL_CONSTANTS.customizationId` kullanıyor (Fatura)
- **Sonuç:** Her iki belge tipi aynı sabitten `TR1.2` emit ediyor. FIX-PLANI-v3 §282'deki
  `UBL_CUSTOMIZATION_ID` top-level rename önerisi uygulanmadı (gereksiz refactor; obj yapısı korunur).
- **Tarih:** Sprint 3-4 civarı uygulanmış (commit tarihi kontrol edilmedi, kod durumu yeterli)

### AR-8 / B-50 — Outstanding/Oversupply/OutstandingReason ✅ (Zaten yok)
- `grep -rn "outstanding\|oversupply\|Outstanding\|Oversupply" src/types/` → hiç bulunmadı
- **Sonuç:** `DespatchLineInput`'ta bu alanlar hiç eklenmemiş. v2'de "ekleme" olarak planlanmıştı;
  v3 AR-8 ile iptal; kod bu duruma doğal uyumlu.
- **Eylem:** Silinecek alan yok, no-op.

### K1 / B-18 — Despatch IssueTime zorunlu ✅ (Sprint 3'te uygulanmış)
- `src/types/despatch-input.ts:26` → `issueTime: string` zorunlu tip
- `src/serializers/despatch-serializer.ts:44` → `cbcRequiredTag('IssueTime', input.issueTime, 'DespatchAdvice')`
- **Sonuç:** Denetim 06 raporu eski kod durumunu yansıtıyor. Sprint 3'te B-18 commit'inde
  çözülmüş. Regression testi Sprint 7'de eklenebilir.

### K3 / B-14 — Despatch Delivery sequence (DeliveryAddress → CarrierParty → Despatch) ✅ (Sprint 3'te uygulanmış)
- `src/serializers/despatch-serializer.ts:137-164` → Doğru sıra emit ediliyor
- `// Delivery — B-14 fix: XSD sequence DeliveryAddress → CarrierParty → Despatch` yorumu mevcut
- **Sonuç:** Sprint 3'te B-14 commit'inde çözülmüş.

### K4 / B-20 — DriverPerson PERSON_SEQ ✅ (Sprint 3'te uygulanmış)
- `src/serializers/despatch-serializer.ts:122-133` → `emitInOrder(PERSON_SEQ, ...)` kullanıyor
- PERSON_SEQ: FirstName → FamilyName → Title → MiddleName → NationalityID (XSD uyumlu)
- **Sonuç:** Sprint 3'te B-20 commit'inde çözülmüş.

---

## Kapsanan Bulgular

### Sprint 6.1 (bu commit)

Bu commit **plan + teyit** niteliğinde; kod değişikliği yok. `audit/sprint-06-plan.md`
(572 satır) ve bu implementation-log iskelet oluşturuldu. M8/AR-8/K1/K3/K4/B-38 no-op
teyit edildi. İlerleyen alt commit'ler gerçek kod değişikliklerini içerecek.

---

*(Diğer alt commit'ler tamamlandıkça buraya eklenecek.)*
