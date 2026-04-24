---
karar: AR-9 Reactive InvoiceSession — kullanıcı girişi akış tabanlı validator feedback
tarih: 2026-04-24
sprint: 8c (isim konuldu; uygulama v2.1.0)
durum: Tasarım notu
---

# AR-9 — Reactive InvoiceSession (v2.1.0 Tasarım Notu)

## Motivasyon

Kullanıcı fatura hazırlarken (Mimsoft UI gibi form-tabanlı arayüz):

1. Fatura tipi seçildiğinde profil-özel alanlar aktifleşir (ör. TEVKIFAT → withholding zorunlu)
2. Kalemde KDV=0 girildiğinde exemption kodu alanı aktifleşir ve 351 default önerisi görünür
3. IHRACKAYITLI+702 seçildiğinde satır seviyesi GTİP + AlıcıDİBKod alanları zorunlu hale gelir
4. Self-exemption tipleri seçildiğinde 351 kodu beklenmez (M11 kararı)

Bu davranış **reaktif bir session state machine** gerektirir. Mevcut `src/invoice-session.ts` sadece **state snapshot validator** — state değişikliklerini event olarak yaymıyor.

## Mevcut Durum (Sprint 8c sonrası)

- `src/invoice-session.ts` — snapshot validator rolü (M10 `setLiability()` kapsamı). **Dokunulmaz.**
- Tüm validator'lar (manual-exemption, sgk-input, simple-line-range, cross-check, type, profile) **post-hoc** — kullanıcı tam input verdikten sonra build() çağrıldığında tetiklenir.

## v2.1.0 Hedefi

### Yeni modül: `src/reactive-session.ts`

```typescript
import { EventEmitter } from 'events';
import type { SimpleInvoiceInput } from './calculator/simple-types';

export type SessionEvent =
  | { kind: 'fieldChanged'; path: string; value: unknown }
  | { kind: 'fieldActivated'; path: string }
  | { kind: 'fieldDeactivated'; path: string }
  | { kind: 'suggestion'; path: string; value: unknown; reason: string }
  | { kind: 'validationError'; errors: ValidationError[] };

export class ReactiveInvoiceSession extends EventEmitter {
  private state: Partial<SimpleInvoiceInput>;

  update(path: string, value: unknown): void {
    // Immutable update + event yay
    // Self-exemption tipi değişince 351 öneri kaldırılır; non-self ise 351 önerilir
    // Kalem kdvPercent 0'a düşerse lineExemptionCode alanı aktifleşir
  }

  getState(): Partial<SimpleInvoiceInput> { return this.state; }

  validateIncremental(): ValidationError[] {
    // Mevcut validator'ları state üzerinde çalıştırır
  }
}
```

### State Machine (high-level)

```
[type=SATIS] ──kdvPercent=0──> [requiresExemptionCode] ──user→'351'──> [valid]
                                    │
                                    ├──no code──> [error MANUAL_EXEMPTION_REQUIRED]
                                    │
                                    └──withholding──> [error WITHHOLDING_INCOMPATIBLE]

[type=ISTISNA | profile=IHRACAT] ──> [self-exemption] (M11 bypass)

[type=IHRACKAYITLI] ──user→code='702'──> [requires line.alicidibsatirkod, line.gtipNo]
```

### API Örneği

```typescript
const session = new ReactiveInvoiceSession();

session.on('fieldActivated', (e) => {
  if (e.path === 'lines[0].kdvExemptionCode') {
    ui.showExemptionDropdown();
  }
});

session.on('suggestion', (e) => {
  ui.showSuggestion(e.path, e.value, e.reason);
});

session.on('validationError', (e) => {
  ui.showErrors(e.errors);
});

session.update('type', 'TEVKIFAT'); // → withholdingTaxTotal aktifleşir
session.update('lines[0].kdvPercent', 0); // → exemption code aktifleşir, 351 öneri
```

## Kapsam Dışı (v2.1.0'da ele alınmayacak)

- Tam UI componenti (sadece core session state + events)
- Frontend framework entegrasyonu (React/Vue adapter'ları ayrı paket)
- Kalıcılık / multi-user collaboration

## Teknik Notlar

- Event emitter Node.js built-in (ek dependency yok)
- State immutable (Object.freeze sonrası spread update pattern)
- Validator'lar mevcut SimpleInvoiceInput üzerinde çalıştıkları için yeniden kullanılabilir (incremental partial input için null-safe genişletme gerekebilir)

## Test Stratejisi

- Event emission: type değişiminde beklenen field aktivasyon/deaktivasyon
- Suggestion akışı: kdvPercent=0 → 351 önerisi yayılır
- Incremental validation: partial input ile hata tetikleme + düzeltilme akışı
- State machine transitions: self-exemption/non-self geçişi

## v2.1.0 Roadmap Girişi

- [ ] `src/reactive-session.ts` iskelet + event types
- [ ] State update + immutability
- [ ] Validator adaptörleri (partial input destek)
- [ ] Field visibility helpers (getFieldState(path))
- [ ] Integration test suite
- [ ] Örnek consumer (React adapter ayrı paket)

---

**Durum:** Sprint 8c'de yalnızca isim konuldu (AR-9). Kod değişikliği YOK. v2.1.0 sprint başında bu doküman referans alınıp detaylı plan yazılacak.
