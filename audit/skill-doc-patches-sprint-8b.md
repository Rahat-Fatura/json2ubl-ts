# Skill Doc Patch — Sprint 8b (B-S01..B-S05)

Bu dosya, `sisteminiz-integrator-infrastructure/.claude/skills/gib-teknik-dokuman/references/` altındaki skill dosyalarına eklenecek içeriği kaydeder. **Ayrı repo**; bu patch'ler skill repo'sunda ayrı commit olarak uygulanır (Sprint 8b.12).

---

## Patch 1 — `kod-listeleri-ubl-tr-v1.42.md`

**Konum:** §4.9 "TaxTypeCode" bölümü sonuna (mevcut §4.9.1, §4.9.2 var; §4.9.3-5 eklenir).

### §4.9.3 (B-S01) — 650 Kodu İç Çelişki + json2ubl-ts Yaklaşımı

GİB kod-listeleri v1.23 changelog'unda "3/10 eklendi" diyor fakat ana `TaxTypeCode` tablosunda **650 kodu listelenmiyor**. Aynı değişiklik, Schematron kurallarında `UR-2` kuralıyla şöyle ifade ediliyor:

> `650xx` kombinasyonu — `650` prefix + 2-hanelik kullanıcı-girilen yüzde (00-99).

**json2ubl-ts yaklaşımı:** `withholdingTaxPercent` alanı kullanıcıdan 0-99 arası oran alır; `withholding-config.ts` içinde `650` için `dynamicPercent: true`. Build sırasında XML'e `65000 + percent` combo yazılır (örn. %25 → `65025`). Bu, UR-2 kuralıyla tam uyumlu.

### §4.9.4 (B-S02) — 601-627 Kısmi vs. 801-825 Tam Tevkifat

- **6xx (601-627):** Kısmi KDV tevkifatı. Her kodun sabit oranı vardır (örn. 601 %40, 603 %70, 606 %90). Kullanıcı kodu seçer; oran config'den gelir.
- **8xx (801-825):** Tam KDV tevkifatı (%100). 6xx ile 1-1 eşleşen tam tevkifat varyantları.
- **650:** Dinamik (§4.9.3 yukarıda).

**Formül:** `withholdingAmount = KDV × percent / 100`. Tevkifat, ödenecek tutardan **düşülür** (negatif bir etki değil, ayrı bir `WithholdingTaxTotal` element'inde gösterilir).

### §4.9.5 (B-S03) — 555 Demirbaş KDV İstisnası

GİB Schematron `M4` kuralı 555 kodunu referans eder fakat ana `TaxTypeCode` ve istisna kod listelerinde yok. Uygulamada **KDV oranı normalden düşük** (%1, %10) ya da sıfır demirbaş satışlarında kullanılıyor.

**json2ubl-ts yaklaşımı:** Tüketici `BuilderOptions.allowReducedKdvRate: true` opt-in flag'i ile 555 kodunu kabul eder. Default `false` → `REDUCED_KDV_RATE_NOT_ALLOWED` hatası. Kütüphane 555 için iş mantığı uygulamaz; tüketici farklı KDV oranından kesme hesabından sorumludur.

---

## Patch 2 — `e-fatura-ubl-tr-v1.0.md`

**Konum:** §77 "CustomizationID" sonrası §77.1 eklenir.

### §77.1 (B-S04, B-S05) — CustomizationID Sabit Kuralı

**json2ubl-ts M8 kararı:**

| Belge Tipi | CustomizationID |
|------------|-----------------|
| **Fatura** (e-Fatura / e-Arşiv) | `TR1.2` |
| **e-İrsaliye** | `TR1.2.1` |

Bu değerler kütüphane `src/config/namespaces.ts` içinde sabit tanımlıdır. Tüketici override edemez.

**Gerekçe:**
- GİB dokümanları (v1.0) Fatura için `TR1.2` belirtir (§77).
- e-İrsaliye (v1.2) ayrı bir teknik belgede `TR1.2.1` belirtir.
- Mimsoft gerçek üretim fixture'larında (`f10-f17.xml`) tüm Fatura'lar `TR1.2` kullanıyor; e-İrsaliye ayrı.
- v1.x json2ubl-ts'de tüm belgeler `TR1.2.1` üretiyordu — bu **yanlıştı**. Sprint 1'de (M8) düzeltildi.

**Örnekler:**
- Fatura: [examples/01-temelfatura-satis/output.xml](../../../json2ubl-ts/examples/01-temelfatura-satis/output.xml) — `TR1.2`
- İrsaliye: [examples/33-irsaliye-temel-sevk-tek-sofor/output.xml](../../../json2ubl-ts/examples/33-irsaliye-temel-sevk-tek-sofor/output.xml) — `TR1.2.1`

---

## Uygulama Talimatı

```bash
cd /Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/.claude/skills/gib-teknik-dokuman/references/

# kod-listeleri-ubl-tr-v1.42.md — §4.9 sonuna yukarıdaki §4.9.3/4/5 içeriğini ekle
# e-fatura-ubl-tr-v1.0.md — §77 sonuna §77.1 içeriğini ekle

# Skill repo git:
cd /Users/berkaygokce/CascadeProjects/windsurf-project/sisteminiz-integrator-infrastructure/
git add .claude/skills/gib-teknik-dokuman/references/kod-listeleri-ubl-tr-v1.42.md \
        .claude/skills/gib-teknik-dokuman/references/e-fatura-ubl-tr-v1.0.md
git commit -m "gib-teknik-dokuman: B-S01..B-S05 skill doc updates (json2ubl-ts Sprint 8b.12 referansı)"
```

Ana repo log'da bu patch dosyasına referans verilir (Sprint 8b.12 entry).
