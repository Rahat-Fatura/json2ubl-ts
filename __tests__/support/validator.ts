/**
 * Canlı GİB doğrulama servisi (xslt-service) — ortak yoklama ve çağrı katmanı.
 *
 * ── NİYE AYRI DOSYA ───────────────────────────────────────────────────────
 * Aynı yoklamayı İKİ yer yapar ve ikisi de aynı sözleşmeyi kullanmalıdır:
 *   1. `__tests__/support/global-setup.ts` — koşum kapısı + görünür uyarı.
 *   2. `__tests__/golden/golden.test.ts`   — test bazında ATLA/KOŞ kararı.
 * Sözleşme iki yerde kopyalansaydı biri diğerinden sessizce ayrışabilirdi.
 *
 * ── ÜÇ DURUMLU DAVRANIŞ ───────────────────────────────────────────────────
 *   doğrulayıcı VAR                       → testler GERÇEKTEN koşar
 *   doğrulayıcı YOK + REQUIRE_VALIDATOR=1 → koşum KIRMIZI (CI kipi)
 *   doğrulayıcı YOK + bayrak yok          → testler SKIPPED + göze batan uyarı
 *
 * "passed" üçüncü durumda ASLA doğru cevap değildir: atlanan şematron testi
 * "XML'imiz GİB'e geçer" DEMEZ, yalnızca "bunu ölçmedik" der.
 *
 * ── SERVİSİ AYAĞA KALDIRMA ────────────────────────────────────────────────
 * Servis MimForge tarafında bir docker konteyneridir:
 *   docker ps --filter name=mimforge-xslt-service
 *   (yoksa) cd <mimforge>/deploy && docker compose -f docker-compose.dev.yml up -d mimforge-xslt-service
 * Konteyner 8080 dinler, ana makineye 8081 olarak yayınlanır (8080 = Temporal UI).
 */

import * as fs from 'fs';
import * as path from 'path';

/** Canlı UBL doğrulama servisi (XSD + Schematron). */
export const VALIDATOR_URL = process.env.UBL_VALIDATOR_URL ?? 'http://127.0.0.1:8081/v1/validate';

/**
 * CI kipi. `REQUIRE_VALIDATOR=1` iken doğrulayıcı erişilemezse koşum KIRMIZI olur.
 * `npm run test:strict` bu bayrağı kurar.
 */
export const VALIDATOR_REQUIRED = process.env.REQUIRE_VALIDATOR === '1';

/** Yoklamanın en fazla bekleyeceği süre — erişilemeyen host koşumu ASMASIN. */
const PROBE_TIMEOUT_MS = 15_000;

/** Yoklama için kullanılan golden (diskte hazır, deterministik, şematron-temiz). */
const PROBE_GOLDEN = path.join(__dirname, '..', 'golden', '__golden__', 'a-basit-satis-tek-kdv.xml');

export interface ValidateResult {
  validSchema: boolean;
  validSchematron: boolean;
  schemaValidationErrors: string[] | null;
  schematronValidationErrors: Array<{ ruleId: string; message: string }> | null;
}

/**
 * xslt-service `POST /v1/validate` sözleşmesi (multipart/form-data):
 *   • `source`     — doğrulanacak XML (zorunlu)
 *   • `parameters` — Schematron XSLT parametreleri (JSON dizi); `type` KÜÇÜK HARF
 *                    olmalıdır (`efatura` / `earchive`) — fail-closed, büyük harf
 *                    sessizce yanlış şematron seçtirmez, doğrudan reddedilir.
 * Yanıt zarfı: `{ errorMessage, result: { ... } }`.
 */
export async function validateLive(
  xml: string,
  type: string,
  url: string = VALIDATOR_URL,
  timeoutMs = 30_000,
): Promise<ValidateResult> {
  const form = new FormData();
  form.append('source', new Blob([xml], { type: 'application/xml' }), 'invoice.xml');
  form.append('parameters', JSON.stringify([{ key: 'type', value: type }]));

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Doğrulayıcı HTTP ${res.status}`);
  const json = (await res.json()) as { result: ValidateResult; errorMessage: string | null };
  if (!json.result) throw new Error(`Doğrulayıcı yanıtı boş: ${json.errorMessage}`);
  return json.result;
}

export interface ProbeResult {
  /** Servis erişilebilir VE sözleşmeye uygun cevap verdi mi? */
  up: boolean;
  /** Erişilemediyse sebebi (ağ hatası / HTTP kodu / boş yanıt). Erişildiyse ''. */
  error: string;
  /** Hangi adres yoklandı — hata mesajında görünmesi teşhisi kısaltır. */
  url: string;
}

/**
 * Servisi GERÇEK bir çağrıyla yoklar — "port açık mı" değil, "sözleşme tutuyor mu".
 * TCP-seviyesi yoklama yeterli DEĞİLDİR: port başka bir servise (ör. Temporal UI)
 * ait olabilir ya da yol/gövde şekli değişmiş olabilir; ikisi de sessiz yeşile yol açar.
 */
export async function probeValidator(url: string = VALIDATOR_URL): Promise<ProbeResult> {
  try {
    if (!fs.existsSync(PROBE_GOLDEN)) {
      return { up: false, error: `yoklama golden'ı yok: ${PROBE_GOLDEN}`, url };
    }
    const result = await validateLive(
      fs.readFileSync(PROBE_GOLDEN, 'utf-8'),
      'efatura',
      url,
      PROBE_TIMEOUT_MS,
    );
    // Sözleşme kontrolü: alanlar gerçekten geldi mi (boş/başka-servis yanıtı değil).
    if (typeof result.validSchematron !== 'boolean') {
      return { up: false, error: 'yanıtta validSchematron alanı yok (sözleşme uyuşmuyor)', url };
    }
    return { up: true, error: '', url };
  } catch (e) {
    return { up: false, error: e instanceof Error ? e.message : String(e), url };
  }
}

/** Adres + sebep + çözüm — iki kipin de paylaştığı teşhis gövdesi. */
function diagnosticBody(probe: ProbeResult): string[] {
  return [
    ``,
    `    Adres : ${probe.url}`,
    `    Sebep : ${probe.error}`,
    ``,
    `    Servisi kaldır : docker compose -f <mimforge>/deploy/docker-compose.dev.yml up -d mimforge-xslt-service`,
    `    Başka adres    : UBL_VALIDATOR_URL=http://host:port/v1/validate npx vitest run`,
    `    Zorunlu kıl    : npm run test:strict   (REQUIRE_VALIDATOR=1 → erişilemezse KIRMIZI)`,
  ];
}

/**
 * Yerel kip (bayraksız) uyarısı. Koşum devam eder ama uyumluluk ÖLÇÜLMEMİŞTİR —
 * metin tam olarak bunu söylemelidir, "hata" gibi değil "eksik kanıt" gibi.
 */
export function validatorSkipMessage(probe: ProbeResult, skippedCount: number): string {
  return [
    `⚠️  ${skippedCount} ŞEMATRON TESTİ ATLANDI — canlı GİB doğrulayıcısına erişilemedi.`,
    `    Bu koşum GİB UYUMLULUĞUNU KANITLAMAZ; yalnızca "çıktı dünküyle aynı" der.`,
    ...diagnosticBody(probe),
  ].join('\n');
}

/** Zorunlu kip (CI) hatası. Hiçbir şey ATLANMADI — koşum hiç başlamadı. */
export function validatorRequiredMessage(probe: ProbeResult): string {
  return [
    `🔴 REQUIRE_VALIDATOR=1 — canlı GİB doğrulayıcısı ZORUNLU ama erişilemedi.`,
    `    Güvenlik ağı olmadan koşum YAPILMAZ: golden/snapshot katmanı yanlış XML'i de`,
    `    dondurur, "GİB'e geçer" iddiasını yalnız canlı şematron taşır.`,
    ...diagnosticBody(probe),
  ].join('\n');
}
