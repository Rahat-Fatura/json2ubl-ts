/**
 * TYPE_ALIASES sızıntı testi — ALIAS'I TANIMLAMAYAN kaynak.
 *
 * `LeakProbeAlias` burada tanımlı DEĞİL; yalnızca donor dosyadan gelir ve bu
 * hedefin `dependencyFiles` listesinde donor YOKTUR. Dolayısıyla üreteç `probe`
 * alanını çözememeli ve atlamalıdır. Alias tablosu modül düzeyinde global
 * kalırsa donor'dan sonra üretildiğinde `probe` sessizce çözümlenir — testin
 * yakaladığı kusur tam olarak budur.
 */

import type { LeakProbeAlias } from './alias-donor';

export interface LeakConsumerInput {
  /** Alias'ı BAŞKA dosyada tanımlı olan alan */
  probe: LeakProbeAlias;
  /** Kontrol alanı */
  consumerOwnField: string;
}
