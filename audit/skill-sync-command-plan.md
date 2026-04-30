---
plan: Skill Sync Slash Command — uçtan uca skill lifecycle yönetimi
durum: PLAN — Berkay onayı bekliyor
tarih: 2026-04-29
hedef: `.claude/commands/sync-skill.md` slash komutu + sürdürülebilir skill yapısı
---

# Skill Sync Slash Command — Plan

## Context

`json2ubl-ts` kütüphanesi geniş bir public API yüzeyine sahip (`SessionPaths`, `InvoiceSession`, `unset()`, `removeIdentification`/`setIdentifications`, `update()` generic kontratı, vb.) ve özel disiplinleri var (cast yasağı, `LIBRARY-SUGGESTION-#N PENDING` etiketi, generator regenerate disiplini). Mimsoft greenfield F1-F12 boyunca her section/action bu pattern'leri tekrar tekrar uygulayacak.

**Niyet:** kütüphane repo'sunda canonical bir Claude Code skill tutmak + bu skill'i versiyon bump'larıyla **otomatik senkronize** edecek bir slash komut yazmak. Skill drift'siz olmalı: kütüphane v2.2.3 → v2.3.0 → v3.0.0 evrimleştikçe skill kendini güncellesin, breaking change'leri geçmiş kullanım örneklerine yansıtsın, master kümülatif bilgi (changelog summary, anti-pattern'ler, migration guide) güncel kalsın.

## Hedef

**Tek slash komutu — `/sync-skill` — şu yetkinliklere sahip:**

1. **İlk çalıştırma (skill yoksa):** Kütüphane repo'sunu uçtan uca tarayıp tam kapsamda skill üretsin (CHANGELOG + README + dist/index.d.ts + audit/sprint logları + examples + simple-types + invoice-session API).
2. **Versiyon bump (skill var):** `package.json` versiyonu vs skill metadata'daki `synced_from_lib_version` farkını tespit edip **sadece delta'yı** analiz etsin (git log, CHANGELOG entry diff, kod diff).
3. **Breaking change yönetimi:** Major bump'larda kaldırılan API'leri skill içindeki eski örneklerden temizlesin, migration-guide.md'a "vX.Y → vX'.Y'" eşleme yazsın, anti-patterns.md'a "removed since" işareti koysun.
4. **Master kümülatif bilgi:** Sürüm-bağımsız kalıcı bilgi blokları (`api-reference.md`, `changelog-summary.md`, `migration-guide.md`) güncel halinde tutulsun — geçmiş silinmez, eklemeli/değiştirmeli evrim.
5. **Drift detection:** Komut her çalıştığında ilk iş `currentVer === syncedVer` kontrolü; eşitse `--force` olmadan early exit.
6. **Sürdürülebilirlik:** Skill kendi versiyonunu ve sync date'i frontmatter'da takip etsin; CI veya manuel publish flow'una entegre edilebilir.

## Skill Yapısı (Üretilecek dosyalar)

`.claude/skills/json2ubl-ts/` (kütüphane repo'su içinde canonical):

```
.claude/skills/json2ubl-ts/
├── SKILL.md                              # Entry point (frontmatter + ana özet)
├── references/
│   ├── api-reference.md                  # Public API kümülatif (mevcut sürümün ground truth'u)
│   ├── usage-patterns.md                 # Canonical kullanım örnekleri (path-based update, unset, identifications splice, build flow)
│   ├── anti-patterns.md                  # Yasaklar (cast'ler, deprecated API'ler, LIBRARY-SUGGESTION etiketi disiplini)
│   ├── migration-guide.md                # Cross-version migration (v1.x → v2.x → v2.2.x → v3.x)
│   └── changelog-summary.md              # User-facing CHANGELOG özeti (sürüm bazlı, kümülatif)
└── _meta/
    └── sync-history.json                 # Geçmiş sync'lerin log'u (versiyon, tarih, agent commit hash)
```

### `SKILL.md` frontmatter

```yaml
---
name: json2ubl-ts
description: UBL-TR 2.1 JSON → XML kütüphanesi (`json2ubl-ts`) için path-based InvoiceSession API kontratı, kanonik kullanım pattern'leri, anti-pattern'ler ve migration rehberi. **Kullanım sinyalleri:** `import ... from 'json2ubl-ts'`, `InvoiceSession`, `SessionPaths`, `simpleInvoiceBuilder`, UBL-TR profil/tip seçimi, e-Fatura/e-Arşiv XML üretimi.
version: 1.0.0                            # Skill'in kendi versiyonu (skill yapısı evrimleştikçe bump)
synced_from_lib_version: 2.2.3            # Kütüphane referans sürümü
last_sync: 2026-04-29
---
```

### Master kümülatif bilgi prensipleri

- **`api-reference.md`** = mevcut sürümün ground truth'u. Eski API'ler (kaldırılmışlar) burada yok; `migration-guide.md`'da yer alır.
- **`changelog-summary.md`** = sürüm bazlı kümülatif arşiv. Her yeni sürüm header'ı altında Added/Changed/Removed/Fixed entry'leri append edilir. Geçmiş entry'ler silinmez.
- **`migration-guide.md`** = sürümler arası eşleme tablosu. Breaking change'lerde "v2.0.0 setSender(party) → SessionPaths.senderTaxNumber + diğer alanlar" formatında.
- **`anti-patterns.md`** = sürekli geçerli yasaklar (cast yasağı, generator regenerate disiplini) + "deprecated since vX.Y" işaretli geçmiş hataların archive'ı.
- **`usage-patterns.md`** = canonical kod örnekleri (en güncel API ile). Eski örnekler migration-guide'a taşınır.

## Slash Command Spec

**Konum:** `.claude/commands/sync-skill.md`

**Frontmatter:**
```yaml
---
description: json2ubl-ts skill'ini kütüphane sürümüyle senkronize eder (ilk üretim veya version bump)
allowed-tools: ["Bash", "Read", "Write", "Edit", "Glob", "Grep", "Agent"]
argument-hint: "[--force] [--target-version <ver>]"
---
```

**Body (prompt template):**
1. **Pre-flight checks:**
   - `package.json` `version` field oku → `currentLibVer`
   - `.claude/skills/json2ubl-ts/SKILL.md` var mı kontrol et
     - Yoksa → "fresh generation" mode
     - Varsa → frontmatter `synced_from_lib_version` oku → `syncedVer`
   - `currentLibVer === syncedVer` ve `--force` argument yoksa → "Skill v${syncedVer}'e güncel, sync gerekmiyor" mesajı, exit
2. **Sub-agent çağrısı** (`general-purpose` agent):
   - Mode: `fresh` veya `update`
   - Prompt template (aşağıdaki §"Agent Prompt Template" bölümünden)
   - Agent dosyaları okur, analiz eder, skill dosyalarını yazar/günceller
3. **Post-validation:**
   - Frontmatter `synced_from_lib_version` mevcut `currentLibVer`'e bump edildi mi?
   - `_meta/sync-history.json` yeni entry içeriyor mu?
   - SKILL.md sintaks: frontmatter geçerli YAML, body 100-500 satır arası
4. **Özet rapor:**
   - "Skill v<old> → v<new> sync edildi"
   - "X yeni API entry eklendi, Y breaking change tespit edildi, Z migration eşlemesi yazıldı"

## Agent Prompt Template

### Fresh Generation (skill yoksa)

Agent şunları okumalı (sıra önemli):
1. `package.json` (version, name, description)
2. `CHANGELOG.md` (tüm sürümler — kümülatif arşiv için)
3. `README.md` (kullanım örnekleri ana kaynağı)
4. `src/index.ts` (top-level export'lar)
5. `src/calculator/index.ts` (calculator alt-modül export'ları)
6. `src/calculator/simple-types.ts` (input tipleri)
7. `src/calculator/invoice-session.ts` (Reactive Session API — head 100 satır + UnsetScope/IdentificationParty/method imzaları)
8. `src/calculator/session-paths.generated.ts` (path map — sadece head + map yapısı, full file gereksiz)
9. `dist/index.d.ts` (build çıktısı public surface — varsa)
10. `examples/` ve `examples-matrix/` (canonical örnek pattern'leri için 2-3 sample)
11. `audit/sprint-08*-implementation-log.md` (mimari kararları çıkarma — M1-M12, AR-1..AR-10, B-XX bulgu listeleri)

Üretilecek 5 dosya + 1 meta:
- `SKILL.md`: 80-120 satır, frontmatter + üst düzey özet + "ne zaman invoke et" + "ana kavramlar" + reference'lara link
- `references/api-reference.md`: 200-400 satır, public class/type/function listesi + kısa açıklamalar
- `references/usage-patterns.md`: 150-300 satır, 5-8 canonical kullanım senaryosu (basit fatura, KAMU, IDIS, IHRACAT-yok, identifications splice, unset)
- `references/anti-patterns.md`: 80-150 satır, 6-10 yasak (cast'ler, manuel generator edit, removed API'lere geri dönüş, vb.)
- `references/migration-guide.md`: 100-200 satır, v1.x→v2.0→v2.1→v2.2→v2.2.1→v2.2.2→v2.2.3 eşleme tabloları
- `references/changelog-summary.md`: 50-200 satır, sürüm bazlı kümülatif Added/Changed/Removed/Fixed
- `_meta/sync-history.json`: tek entry `[{ "version": "2.2.3", "date": "2026-04-29", "mode": "fresh", "files": ["SKILL.md", ...] }]`

### Update Mode (skill var, version bump)

Agent şunları yapar:
1. **Delta range tespiti:** `git log v${syncedVer}..HEAD --oneline -- src/ scripts/ CHANGELOG.md README.md package.json`
2. **CHANGELOG diff:** `CHANGELOG.md`'da `## [${syncedVer}]` ve `## [${currentLibVer}]` arasındaki tüm sürüm bloklarını oku
3. **Kategorize et:** Added / Changed / Removed / Fixed (CHANGELOG zaten Keep a Changelog formatı)
4. **Breaking change tespiti:**
   - Major bump (X.0.0) → bütün Removed/Changed entry'leri breaking
   - Minor/patch (X.Y.0 / X.Y.Z) → sadece açıkça `BREAKING:` etiketli olanlar
5. **Update strategy:**
   - **`api-reference.md`**:
     - Added entry'ler için yeni satır ekle
     - Removed entry'ler için ilgili satırı sil + `migration-guide.md`'a "removed in v${currentLibVer}" entry yaz
     - Changed entry'ler için davranış güncelle, eski form'u migration-guide'a kaydet
   - **`usage-patterns.md`**:
     - Removed API kullanan örnek varsa **yeni API ile değiştir** (geçmişe yansıtma)
     - Yeni API için yeni canonical pattern ekle (eğer önemliyse)
   - **`anti-patterns.md`**:
     - Removed API'leri "kullanma — vX.Y'de kaldırıldı" olarak ekle
     - Yeni anti-pattern'ler (örn. v2.2.1'de eklenen `update('billingReference.id', undefined)` tip uyumsuzluğu → `unset('billingReference')` kullan) ekle
   - **`migration-guide.md`**:
     - `## v${syncedVer} → v${currentLibVer}` başlığı altında yeni eşleme tablosu
     - Önceki migration entry'leri **silinmez** (cross-version okuma için)
   - **`changelog-summary.md`**:
     - `## [${currentLibVer}]` başlığı altında özetlenmiş Added/Changed/Removed/Fixed
     - Önceki sürümler dokunulmaz
6. **SKILL.md frontmatter güncelle:**
   - `synced_from_lib_version: ${currentLibVer}`
   - `last_sync: ${today}`
   - Skill kendi `version`'ı: skill yapısı değişmediyse aynı kalır (1.0.0); yeni reference dosya eklendiyse bump
7. **`_meta/sync-history.json`'a entry ekle:**
   ```json
   {
     "version": "${currentLibVer}",
     "previous_version": "${syncedVer}",
     "date": "${today}",
     "mode": "update",
     "delta": {
       "added": ["..."],
       "changed": ["..."],
       "removed": ["..."],
       "breaking": false
     }
   }
   ```

## Drift Önleme & Sürdürülebilirlik

- **Frontmatter version takibi:** `synced_from_lib_version` skill'in tek kaynağı. Komut her çalıştığında bunu `package.json` ile karşılaştırır.
- **Sync history:** `_meta/sync-history.json` geçmiş tüm sync'leri tutar — drift retrospect'i için.
- **Pre-publish hook (opsiyonel, gelecekteki iş):** `package.json` `scripts.prepublishOnly` içinde `tsx scripts/check-skill-sync.ts` — skill version package.json'la eşit değilse `npm publish`'i durdurur.
- **CI guard (opsiyonel):** GitHub Action — `package.json` versiyonu değişti ama skill SKILL.md'si değişmedi → PR'da uyarı.

**Şu an kapsamda olmayan ama gelecekte:** Pre-publish hook ve CI guard ileri vade. Bu sprint sadece komut + ilk skill üretim.

## Mimsoft / Tüketici Tarafı Dağıtım

**Karar:** Skill kütüphane repo'sunda **canonical** tutulur. Mimsoft `.claude/skills/json2ubl-ts/` olarak **manuel kopyalanır**. Sebep: Claude Code skill discovery `node_modules/` taramaz; npm package'ına dahil etmenin ROI'si yok.

**Öneri (gelecek):** Mimsoft repo'sunda küçük bir helper script: `scripts/sync-lib-skill.sh` — kütüphane repo'sundaki skill'i `cp -r` ile Mimsoft'a kopyalar. `yarn upgrade json2ubl-ts@<ver>` sonrası manuel çalıştırılır.

**Bu sprint kapsamı dışı:** Mimsoft tarafına sync mekanizması bu plan'da değil. Sadece kütüphane içi kanonik üretim + version bump yönetimi.

## Atomik Commit Planı (Sprint 8l)

| Commit | Kapsam | Test/Doğrulama |
|---|---|---|
| 8l.0 | Plan kopya + log iskelet (audit/sprint-08l-plan.md + audit/sprint-08l-implementation-log.md) | – |
| 8l.1 | `.claude/commands/sync-skill.md` slash command (frontmatter + body + agent prompt template) | komut Claude Code'da görünüyor mu manuel test |
| 8l.2 | İlk `/sync-skill` çalıştırma → 5 reference dosyası + SKILL.md + sync-history.json üret | manuel review (skill içeriği doğru mu) |
| 8l.3 | Skill içerik doğrulaması — agent'a "skill ile API kullanan örnek kod yaz" testi (smoke) | smoke test geçer |
| 8l.4 | README'ye §Skill kullanımı bölümü ekle (kısa) | – |
| 8l.5 | CHANGELOG note (opsiyonel — skill bir "developer experience" eklemesi) | – |
| 8l.6 | Implementation log finalize | sprint kapanışı |

**Test delta hedefi:** 0 (skill üretimi unit test gerektirmez; smoke test 8l.3'te manuel).

## Açık Sorular (Berkay'ın cevaplaması bekleniyor)

1. **Skill konumu:** `.claude/skills/json2ubl-ts/` (proje level) önerisi onaylanır mı? Alternatif `~/.claude/skills/json2ubl-ts/` (global, tüm makinede). Pratik fark: project-level kütüphane repo'sunda commit edilir + Mimsoft'a kopyalanır; global tek geliştirici (Berkay) makinesinde yaşar, paylaşılmaz.

2. **Skill name:** `json2ubl-ts` mi, `ubl-tr` mi, `rahat-fatura-ubl` mi? Auto-invocation için description trigger'ları (UBL-TR XML, e-Fatura, InvoiceSession, SessionPaths) yeterli olabilir; isim daha çok komut belirteci.

3. **Trigger keywords (skill description'da):** Önerilen şu şekilde — onaylanır mı, eklenecek/çıkarılacak var mı?
   ```
   UBL-TR 2.1 JSON → XML kütüphanesi (json2ubl-ts) için
   path-based InvoiceSession API kontratı, kanonik kullanım pattern'leri,
   anti-pattern'ler ve migration rehberi.
   Kullanım sinyalleri: import ... from 'json2ubl-ts',
   InvoiceSession, SessionPaths, SimpleInvoiceBuilder, UBL-TR profil/tip seçimi,
   e-Fatura/e-Arşiv XML üretimi.
   ```

4. **v2.2.3 ile başlama:** v2.2.3 henüz `npm publish` edilmedi (commit'ler local'de). Skill'in ilk sync'i:
   - **Seçenek A:** v2.2.3 publish bekleyip sonra üret (skill ilk hayatına v2.2.3 olarak başlar)
   - **Seçenek B:** Şimdi v2.2.3 olarak üret (publish öncesi local skill mevcut, publish sonrası audit log'unda not düşülür)
   - Önerim: **B** — sprint'i tamamlayalım, Berkay publish ettiğinde drift olmaz.

5. **Master CHANGELOG'un kümülatif tutulması:** `references/changelog-summary.md` v0.x'ten itibaren tüm sürümleri özetlemeli mi, yoksa sadece **v2.0.0+** (mevcut "modern" API)? Önerim: **v2.0.0+** (öncesi `migration-guide.md` v1.x→v2.0 entry'sinde özetlenir).

6. **Breaking change geçmişe yansıtma derinliği:** Major bump'ta `usage-patterns.md`'daki örneklerin yeni API ile **otomatik** güncellenmesi mi (agent karar verir), yoksa sadece **migration-guide.md**'a yeni eşleme yazılıp `usage-patterns.md` el değmemiş kalsın mı? Önerim: **agent otomatik günceller** çünkü `usage-patterns.md` "current state of art" prensibinde tutulmalı (skill kanonu).

7. **Sub-agent tipi:** `general-purpose` agent (geniş izinli) mi yoksa özel bir skill-generator agent (custom subagent yaratılır mı)? Önerim: **general-purpose** — özel agent yazmak ekstra iş, generic agent prompt template ile yeterli.

8. **`--force` flag davranışı:** Versiyonlar eşit olsa bile re-generate çalışsın mı? Önerim: **evet** — drift fark edilirse manuel düzeltme yolu olarak kullanılır; default davranış değişmez (eşitse early exit).

9. **Audit log entegrasyonu:** Skill sync'i `audit/sprint-08l-implementation-log.md` veya benzer bir log'da takip edilsin mi, yoksa sadece `_meta/sync-history.json` yeterli mi? Önerim: **her ikisi** — sprint log (insan okur) + sync-history.json (agent okur).

## Verification

Plan onaylanırsa:
1. `.claude/commands/sync-skill.md` yazılır
2. Manuel `/sync-skill` (ilk kez) çalıştırılır
3. Üretilen 5 reference dosyası + SKILL.md gözden geçirilir
4. Smoke test: ayrı bir Claude oturumunda "InvoiceSession ile KAMU profili fatura oluştur" gibi bir prompt verip skill'in invoke edilip edilmediği + örnek kodun doğruluğu kontrol edilir
5. README'ye §Skill kullanımı bölümü eklenir
6. v2.2.3 publish öncesi skill içeriği "v2.2.3" olarak işaretlenir; publish sonrası drift kontrolüne gerek kalmaz

## Risk ve Sınırlar

- **Skill content patlaması:** Reference dosyaları çok detaylı olursa context maliyeti artar. Hedef: SKILL.md ≤120 satır, her reference ≤300 satır, toplam skill yaklaşık 800-1200 satır.
- **Agent halüsinasyon riski:** Update mode'da CHANGELOG entry'lerini yanlış kategorize etme. Mitigation: agent prompt'unda "Keep a Changelog format" beklentisi açık + update sonrası `_meta/sync-history.json` review.
- **Geriye yansıtma fazla agresif olabilir:** Major bump'ta `usage-patterns.md` agresif update edilirse Berkay'ın özel kayıtları silinebilir. Mitigation: skill dosyaları **kütüphane repo'sunda commit edilir** — git history korur, gerektiğinde manuel düzeltme yapılır.
