# examples-matrix/

Sprint 8e (Publish Öncesi Kapsam Doğrulama) altında oluşturulan **script-assisted kapsam kataloğu**. Kütüphanenin desteklediği tüm profil+tip kombinasyonları ve tüm validator error code'ları için çalıştırılabilir example'lar.

> Bu dosya **placeholder** — Sprint 8e.14'te `_lib/meta-indexer.ts` tarafından `meta.json` dosyalarından auto-generate edilecek. O ana kadar yapı açıklaması ve sprint durumu burada tutulur.

## Fark — `examples/` vs `examples-matrix/`

| | `examples/` | `examples-matrix/` |
|---|---|---|
| Sayı | 38 senaryo + 2 showcase | 272 senaryo (164 valid + 108 invalid) |
| Yazım tarzı | El yazımı, "ders notu" | Script-assisted, "kapsam kanıtı" |
| Kapsam | Temel use-case'ler | 68 profil+tip × boyut kesişimleri + 31 error code varyantları |
| Oluşturulma | Sprint 8b (manuel) | Sprint 8e (spec-driven scaffold) |
| Hedef okuyucu | Kütüphane öğrenen geliştirici | Kütüphane davranışını görmek isteyen Berkay + ileri kullanıcı |

**Mevcut `examples/` dokunulmaz.** Bu dizin onun paralel katmanı, yerine geçmez.

## Yapı (Sprint 8e tamamlandığında)

```
examples-matrix/
├── README.md                    # bu dosya (auto-generate 8e.14 sonrası)
├── run-all.ts                   # valid + invalid orchestrator (8e.2'de)
├── scaffold.ts                  # spec → klasör üretici CLI (8e.1'de)
├── find.ts                      # meta.json filter CLI (8e.15'te)
├── _lib/
│   ├── scenario-spec.ts         # ScenarioSpec + InvalidSpec tip tanımları
│   ├── specs.ts                 # 164 + 108 hardcoded array
│   ├── scenario-generator.ts    # spec → input objesi
│   ├── input-serializer.ts      # input obj → input.ts kaynak kodu
│   ├── meta-indexer.ts          # meta.json → README.md
│   ├── runScenario.ts           # valid senaryo runner
│   └── runInvalid.ts            # invalid senaryo runner
├── valid/
│   └── <profile>/<profile>-<type>-<variant-slug>/
│       ├── input.ts             # tip güvenli girdi (named + default export)
│       ├── input.json           # JSON eşleniği
│       ├── output.xml           # UBL-TR XML çıktısı
│       ├── run.ts               # runScenario çağrısı
│       └── meta.json            # boyut özeti
└── invalid/
    └── <error-code-slug>/<error-code-slug>-<variant-slug>/
        ├── input.ts             # hatayı tetikleyen girdi
        ├── expected-error.json  # beklenen hata listesi (spec'ten)
        ├── actual-error.json    # gerçekleşen hata (build çalıştırınca yazılır)
        ├── run.ts
        └── meta.json
```

## Sprint 8e Durumu

- **Plan:** `audit/sprint-08e-plan.md`
- **Log:** `audit/sprint-08e-implementation-log.md`
- **Hedef senaryo:** 164 valid + 108 invalid = 272
- **Hedef test delta:** 876 → 1313 (+437)
- **Toplam alt-commit:** 18 (8e.0 → 8e.17)
- **Şu an:** **8e.0** — iskelet + plan kopyası (bu commit)

## Kullanım (Sprint 8e tamamlandığında)

```bash
# Senaryoları scaffold et (spec → klasör):
npm run matrix:scaffold

# Tüm senaryoları çalıştır (build + output.xml / actual-error.json yaz):
npm run matrix:run

# Filtreleyerek gezin:
npm run matrix:find -- --profile=TEMELFATURA --type=IHRACKAYITLI
npm run matrix:find -- --error-code=MISSING_FIELD
npm run matrix:find -- --exemption=308
```

## Dokunulmayan Dosyalar

Sprint 8e boyunca aşağıdaki dizinler **dokunulmaz**:

- `src/**` — Kütüphane kodu. Bulunan bug'lar yalnızca `audit/sprint-08e-implementation-log.md` → "Bulunan Buglar" section'ına loglanır; düzeltme Sprint 8f'te yapılır.
- `examples/**` — Mevcut 38 el-yazımı senaryo.
