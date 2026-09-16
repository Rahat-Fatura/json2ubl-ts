/**
 * Vitest globalSetup — canlı GİB doğrulayıcısının KOŞUM KAPISI.
 *
 * Buradaki tek iş "güvenlik ağı var mı?" sorusunu koşumun EN BAŞINDA, tek bir
 * yerde cevaplamak ve cevabı görünür kılmaktır:
 *
 *   • doğrulayıcı VAR                       → sessiz (normal akış)
 *   • doğrulayıcı YOK + REQUIRE_VALIDATOR=1 → setup FIRLATIR → tüm koşum KIRMIZI
 *   • doğrulayıcı YOK + bayrak yok          → başta ve sonda göze batan uyarı
 *
 * globalSetup, test dosyası worker'larının DIŞINDA (Vitest ana sürecinde) koşar;
 * bu yüzden buradan basılan uyarı worker çıktı-tamponuna takılmaz ve özet
 * satırlarının hemen yanında görünür. Test dosyası içindeki `console.warn`
 * "stderr | dosya > test" önekiyle test bloğunun içine gömülürdü — yani tam da
 * gözden kaçan yere.
 *
 * Bu dosya `*.test.ts` DEĞİLDİR; vitest `include` deseni onu test olarak toplamaz.
 */

import { GOLDEN_SCENARIOS } from '../golden/scenarios';
import {
  probeValidator,
  validatorRequiredMessage,
  validatorSkipMessage,
  VALIDATOR_REQUIRED,
} from './validator';

/**
 * Doğrulayıcıya bağlı test sayısı: her golden senaryosu + "imza eklenince XSD
 * geçer" + "4.0.0 regresyonu şematronca reddedilir".
 */
const LIVE_TEST_COUNT = GOLDEN_SCENARIOS.length + 2;

/** Uyarı sonda bir kez daha basılsın diye setup→teardown arası taşınan durum. */
let downMessage = '';

function banner(body: string): string {
  const line = '─'.repeat(78);
  return `\n\x1b[33m┌${line}┐\x1b[0m\n${body}\n\x1b[33m└${line}┘\x1b[0m\n`;
}

export async function setup(): Promise<void> {
  const probe = await probeValidator();
  if (probe.up) return;

  // CI kipi: güvenlik ağı olmadan koşum YAPILMAZ. Fırlatmak tüm koşumu kırmızıya
  // düşürür (tek bir dosyayı değil) — "yeşil ama ölçülmemiş" durumu imkânsızlaşır.
  if (VALIDATOR_REQUIRED) throw new Error(`\n${validatorRequiredMessage(probe)}\n`);

  downMessage = validatorSkipMessage(probe, LIVE_TEST_COUNT);
  console.error(banner(downMessage));
}

export async function teardown(): Promise<void> {
  // Özet satırlarının ardından bir kez daha: koşum "passed" dese bile uyarı son sözdür.
  if (downMessage) console.error(banner(downMessage));
}
